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

  const mockTelegramService = {
    botUsername: 'pantaukantahtangsel_bot',
    sendTelegramMessage: async () => ({ ok: true }),
  };

  const app = createApp({
    db,
    jwtSecret,
    uploadDir: path.join(tmpDir, 'surat'),
    avatarDir: path.join(tmpDir, 'avatars'),
    dwgDir: path.join(tmpDir, 'dwg'),
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

  // 5. Logout invalidates active session token
  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(logoutRes.status, 200);

  const afterLogoutRes = await fetch(`${baseUrl}/api/user/profile`, { headers: authHeaders });
  assert.equal(afterLogoutRes.status, 403);
});
