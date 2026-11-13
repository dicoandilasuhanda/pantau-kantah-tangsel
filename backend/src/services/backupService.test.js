const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { initDatabase } = require('../db/initDatabase');
const {
  EXPECTED_TABLES,
  isValidBackupFilename,
  formatJakartaTimestamp,
  createOnlineBackup,
  verifyBackupFile,
  listBackups,
  pruneOldBackups,
  closeSqliteDb,
} = require('./backupService');

function waitForSeededAdmin(db, timeoutMs = 4000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (!err && row && row.count >= 11) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(new Error('Timeout waiting for seeded SQLite schema'));
        }
        setTimeout(check, 20);
      });
    };
    check();
  });
}

test('backupService filename validation & Jakarta timestamp formatting', () => {
  assert.equal(isValidBackupFilename('database_backup_2026-11-13_02-30.sqlite'), true);
  assert.equal(isValidBackupFilename('database_backup_2026-11-13_19-45-01-2.sqlite'), true);
  assert.equal(isValidBackupFilename('../database_backup_2026-11-13.sqlite'), false);
  assert.equal(isValidBackupFilename('folder/database_backup_2026-11-13.sqlite'), false);
  assert.equal(isValidBackupFilename('evil.sqlite'), false);
  assert.equal(isValidBackupFilename('database_backup_test.sql'), false);

  const formatted = formatJakartaTimestamp(new Date('2026-11-13T12:30:45.000Z'));
  assert.equal(formatted, '2026-11-13_19-30-45');
});

test('backupService creates atomic VACUUM INTO snapshot and passes isolated restore verification', async (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-backup-test-'));
  const dbPath = path.join(tmpRoot, 'live.sqlite');
  const backupsDir = path.join(tmpRoot, 'backups');

  const db = initDatabase({ dbPath, jwt, jwtSecret: 'test-secret', bcrypt });
  await waitForSeededAdmin(db);

  t.after(async () => {
    await closeSqliteDb(db);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  // Insert sample domain record to assert row counts carry cleanly into restored snapshot
  await new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location) VALUES (?, ?, ?, ?, ?, ?)",
      ['QR-BACKUP-TEST-1', '9001', '2026', 'Pengukuran', 'Pemohon Uji', 'Petugas Entry Berkas'],
      (err) => (err ? reject(err) : resolve())
    );
  });

  const result = await createOnlineBackup(db, {
    backupsDir,
    timestampLabel: '2026-11-13_19-45-00',
  });

  assert.equal(result.backup.filename, 'database_backup_2026-11-13_19-45-00.sqlite');
  assert.ok(result.backup.sizeBytes > 4096);
  assert.match(result.backup.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.verification.ok, true);
  assert.equal(result.verification.integrityCheck, 'ok');
  assert.deepEqual(result.verification.missingTables, []);
  assert.equal(result.verification.tableCounts.files, 1);
  assert.ok(result.verification.tableCounts.users >= 11);

  for (const table of EXPECTED_TABLES) {
    assert.equal(typeof result.verification.tableCounts[table], 'number');
  }

  // Triggering again with identical timestamp must create suffixed snapshot rather than colliding
  const resultSecond = await createOnlineBackup(db, {
    backupsDir,
    timestampLabel: '2026-11-13_19-45-00',
  });
  assert.equal(resultSecond.backup.filename, 'database_backup_2026-11-13_19-45-00-2.sqlite');

  const listed = listBackups(backupsDir);
  assert.equal(listed.length, 2);
});

test('backupService detects corrupted sqlite backup and missing schema tables safely', async (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-corrupt-test-'));
  const corruptPath = path.join(tmpRoot, 'database_backup_2026-11-13_bad.sqlite');
  const emptyPath = path.join(tmpRoot, 'database_backup_2026-11-13_empty.sqlite');

  t.after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  fs.writeFileSync(corruptPath, 'NOT-A-VALID-SQLITE-DATABASE-HEADER');
  fs.writeFileSync(emptyPath, '');

  const corruptReport = await verifyBackupFile(corruptPath);
  assert.equal(corruptReport.ok, false);
  assert.ok(corruptReport.error);

  const emptyReport = await verifyBackupFile(emptyPath);
  assert.equal(emptyReport.ok, false);
  assert.equal(emptyReport.integrityCheck, 'empty-file');
});

test('backupService prunes expired backups >30 days while keeping minimum newest archives', (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-prune-test-'));
  const backupsDir = path.join(tmpRoot, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  t.after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  const nowMs = new Date('2026-11-13T12:00:00Z').getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Create 5 backups: 2 recent, 3 older than 30 days. With minRetainedBackups=3,
  // the 2 recent + 1 newest-of-old MUST remain, leaving 3 total and deleting 2 oldest.
  const fixtures = [
    { name: 'database_backup_2026-11-13_02-30.sqlite', ageDays: 1 },
    { name: 'database_backup_2026-11-10_02-30.sqlite', ageDays: 3 },
    { name: 'database_backup_2026-10-01_02-30.sqlite', ageDays: 43 },
    { name: 'database_backup_2026-09-20_02-30.sqlite', ageDays: 54 },
    { name: 'database_backup_2026-09-01_02-30.sqlite', ageDays: 73 },
  ];

  fixtures.forEach((f) => {
    const filePath = path.join(backupsDir, f.name);
    fs.writeFileSync(filePath, 'dummy-sqlite-bytes');
    const ts = new Date(nowMs - f.ageDays * oneDayMs);
    fs.utimesSync(filePath, ts, ts);
  });

  const retention = pruneOldBackups(backupsDir, {
    retentionDays: 30,
    minRetainedBackups: 3,
    nowMs,
  });

  assert.equal(retention.deletedCount, 2);
  assert.equal(retention.remainingCount, 3);
  assert.deepEqual(
    listBackups(backupsDir).map((b) => b.filename),
    [
      'database_backup_2026-11-13_02-30.sqlite',
      'database_backup_2026-11-10_02-30.sqlite',
      'database_backup_2026-10-01_02-30.sqlite',
    ]
  );
});
