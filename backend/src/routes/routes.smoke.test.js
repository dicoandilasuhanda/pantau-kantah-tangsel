const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { initDatabase } = require('../db/initDatabase');
const { createApp } = require('../../server');

function waitForSeededAdmin(db, timeoutMs = 3000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
        if (!err && row) return resolve(row);
        if (Date.now() - start > timeoutMs) {
          return reject(new Error('Timeout waiting for initial SQLite user seed'));
        }
        setTimeout(check, 25);
      });
    };
    check();
  });
}

test('Express app mounts all modular routers cleanly without route shadowing', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-smoke-'));
  const dbPath = path.join(tmpDir, 'test.sqlite');
  const jwtSecret = 'smoke-test-secret';

  const db = initDatabase({ dbPath, jwt, jwtSecret, bcrypt });
  await waitForSeededAdmin(db);

  const busyTimeoutRow = await new Promise((resolve, reject) => {
    db.get('PRAGMA busy_timeout', (err, row) => (err ? reject(err) : resolve(row)));
  });
  assert.equal(busyTimeoutRow.timeout, 5000);

  const sentTelegramMessages = [];
  const mockTelegramService = {
    botUsername: 'pantaukantahtangsel_bot',
    sendTelegramMessage: async (chatId, text) => {
      sentTelegramMessages.push({ chatId, text });
      return { ok: true };
    },
  };

  const uploadsDir = path.join(tmpDir, 'uploads');
  const uploadDir = path.join(uploadsDir, 'surat');
  const avatarDir = path.join(uploadsDir, 'avatars');
  const dwgDir = path.join(uploadsDir, 'dwg');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(avatarDir, { recursive: true });
  fs.mkdirSync(dwgDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, 'contoh-surat.pdf'), '%PDF-1.4 mock-content');

  const backupsDir = path.join(tmpDir, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const app = createApp({
    db,
    jwtSecret,
    uploadDir,
    avatarDir,
    dwgDir,
    uploadsDir,
    backupsDir,
    telegramService: mockTelegramService,
    serveFrontend: false,
  });

  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 1. Health & Public IP endpoints
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.database, 'connected');

  const ipRes = await fetch(`${baseUrl}/api/my-ip`);
  assert.equal(ipRes.status, 200);
  const ipJson = await ipRes.json();
  assert.ok(ipJson.ip);

  // 2. Login Zod validation check
  const badLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '', password: '' }),
  });
  assert.equal(badLoginRes.status, 400);

  // 3. Admin login & authorized endpoints across all routers
  const adminLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert.equal(adminLoginRes.status, 200);
  const adminSession = await adminLoginRes.json();
  assert.ok(adminSession.token);

  const authHeaders = { Authorization: `Bearer ${adminSession.token}` };

  const adminGetPaths = [
    '/api/users',
    '/api/users/list',
    '/api/user/profile',
    '/api/user/dwg/recipients',
    '/api/user/dwg',
    '/api/suggestions',
    '/api/admin/stats',
    '/api/admin/backups',
    '/api/notifications/transit',
    '/api/notifications/telegram-status',
    '/api/files',
    '/api/files/my-transits',
    '/api/surat',
    '/api/reports/dashboard',
    '/api/reports/files',
  ];

  for (const apiPath of adminGetPaths) {
    const res = await fetch(`${baseUrl}${apiPath}`, { headers: authHeaders });
    assert.equal(res.status, 200, `Expected 200 for GET ${apiPath}, got ${res.status}`);
  }

  // Verify /api/files/my-transits returns an array (not captured by /:qr_code)
  const myTransitsRes = await fetch(`${baseUrl}/api/files/my-transits`, { headers: authHeaders });
  assert.deepEqual(await myTransitsRes.json(), []);

  // 4. Entry role creates file & fetches detail via QR
  const entryLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'entry', password: 'entry123' }),
  });
  assert.equal(entryLoginRes.status, 200);
  const entrySession = await entryLoginRes.json();

  const createFileRes = await fetch(`${baseUrl}/api/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${entrySession.token}`,
    },
    body: JSON.stringify({
      nomor_berkas: '12345',
      tahun_berkas: '2026',
      nama_kegiatan: 'Pemecahan Bidang',
      nama_pemohon: 'Budi Pemohon',
    }),
  });
  assert.equal(createFileRes.status, 200);
  const createdFile = await createFileRes.json();
  assert.ok(createdFile.qr_code);

  const detailRes = await fetch(
    `${baseUrl}/api/files/${encodeURIComponent(createdFile.qr_code)}`,
    { headers: { Authorization: `Bearer ${entrySession.token}` } }
  );
  assert.equal(detailRes.status, 200);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.nomor_berkas, '12345');

  // 4b. Backup & Restore verification endpoints enforce Admin access, archive uploads, and notify Telegram
  await new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET telegram_chat_id = ? WHERE role = 'Administrator'",
      ['11223344'],
      (err) => (err ? reject(err) : resolve())
    );
  });

  const forbiddenBackupRes = await fetch(`${baseUrl}/api/admin/backups`, {
    headers: { Authorization: `Bearer ${entrySession.token}` },
  });
  assert.equal(forbiddenBackupRes.status, 403);

  const runBackupRes = await fetch(`${baseUrl}/api/admin/backups/run`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(runBackupRes.status, 201);
  const runBackupJson = await runBackupRes.json();
  assert.ok(runBackupJson.backup?.filename);
  assert.equal(runBackupJson.verification?.ok, true);
  assert.equal(runBackupJson.verification?.integrityCheck, 'ok');
  assert.equal(runBackupJson.verification?.tableCounts?.files, 1);
  assert.match(runBackupJson.uploadsBackup?.filename || '', /^uploads_backup_.*\.tar\.gz$/);
  assert.equal(runBackupJson.uploadsVerification?.ok, true);
  assert.equal(runBackupJson.uploadsVerification?.fileCount, 1);
  assert.equal(runBackupJson.telegramNotification?.sentCount, 1);
  assert.equal(sentTelegramMessages.length, 1);
  assert.equal(sentTelegramMessages[0].chatId, '11223344');

  const listBackupsRes = await fetch(`${baseUrl}/api/admin/backups`, { headers: authHeaders });
  assert.equal(listBackupsRes.status, 200);
  const listBackupsJson = await listBackupsRes.json();
  assert.equal(listBackupsJson.backups.length, 1);
  assert.equal(listBackupsJson.uploadsBackups.length, 1);
  assert.equal(listBackupsJson.allArchives.length, 2);

  const verifyBackupRes = await fetch(`${baseUrl}/api/admin/backups/verify`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: runBackupJson.backup.filename }),
  });
  assert.equal(verifyBackupRes.status, 200);
  const verifyBackupJson = await verifyBackupRes.json();
  assert.equal(verifyBackupJson.ok, true);

  const verifyUploadsRes = await fetch(`${baseUrl}/api/admin/backups/verify`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: runBackupJson.uploadsBackup.filename }),
  });
  assert.equal(verifyUploadsRes.status, 200);
  const verifyUploadsJson = await verifyUploadsRes.json();
  assert.equal(verifyUploadsJson.ok, true);
  assert.equal(verifyUploadsJson.verification?.kind, 'uploads');

  const badVerifyRes = await fetch(`${baseUrl}/api/admin/backups/verify`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: '../evil.sqlite' }),
  });
  assert.equal(badVerifyRes.status, 400);

  const downloadBackupRes = await fetch(
    `${baseUrl}/api/admin/backups/${encodeURIComponent(runBackupJson.backup.filename)}/download`,
    { headers: authHeaders }
  );
  assert.equal(downloadBackupRes.status, 200);
  const sqliteHeader = Buffer.from(await downloadBackupRes.arrayBuffer()).subarray(0, 15).toString('utf8');
  assert.equal(sqliteHeader, 'SQLite format 3');

  const downloadUploadsRes = await fetch(
    `${baseUrl}/api/admin/backups/${encodeURIComponent(runBackupJson.uploadsBackup.filename)}/download`,
    { headers: authHeaders }
  );
  assert.equal(downloadUploadsRes.status, 200);
  const gzipMagic = Buffer.from(await downloadUploadsRes.arrayBuffer()).subarray(0, 2);
  assert.equal(gzipMagic[0], 0x1f);
  assert.equal(gzipMagic[1], 0x8b);

  // 4c. Audit trail records failed login & sensitive admin actions, and enforces Admin access
  const auditBadLoginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrong-password-123' }),
  });
  assert.equal(auditBadLoginRes.status, 401);

  const forbiddenAuditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${entrySession.token}` },
  });
  assert.equal(forbiddenAuditRes.status, 403);

  const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, { headers: authHeaders });
  assert.equal(auditRes.status, 200);
  const auditJson = await auditRes.json();
  assert.ok(auditJson.total >= 5);
  assert.ok(auditJson.summary?.failedLogins24h >= 1);
  const recordedActions = new Set((auditJson.logs || []).map((row) => row.action));
  assert.equal(recordedActions.has('LOGIN_FAILED'), true);
  assert.equal(recordedActions.has('BACKUP_RUN'), true);
  assert.equal(recordedActions.has('BACKUP_VERIFY'), true);
  assert.equal(recordedActions.has('BACKUP_DOWNLOAD'), true);

  // 5. Logout invalidates active session token
  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(logoutRes.status, 200);

  const afterLogoutRes = await fetch(`${baseUrl}/api/user/profile`, { headers: authHeaders });
  assert.equal(afterLogoutRes.status, 403);
});
