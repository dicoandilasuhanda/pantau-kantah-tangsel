const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { initDatabase } = require('../db/initDatabase');
const { closeSqliteDb } = require('./backupService');
const { recordAuditLog, listAuditLogs } = require('./auditService');

function waitForSchema(db, timeoutMs = 4000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (!err && row && row.count >= 11) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('Schema init timeout'));
        setTimeout(tick, 20);
      });
    };
    tick();
  });
}

test('auditService records sanitized audit events and supports filtered queries & summary counts', async (t) => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-audit-test-'));
  const dbPath = path.join(tmpRoot, 'audit.sqlite');
  const db = initDatabase({ dbPath, jwt, jwtSecret: 'audit-secret', bcrypt });
  await waitForSchema(db);

  t.after(async () => {
    await closeSqliteDb(db);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  const first = await recordAuditLog(db, {
    category: 'AUTH',
    action: 'LOGIN_FAILED',
    severity: 'warning',
    actorUsername: 'intruders',
    targetType: 'auth',
    targetId: 'intruders',
    summary: 'Percobaan login gagal untuk akun intruders',
    metadata: { reason: 'bad_password', password: 'must-be-stripped', token: 'must-be-stripped' },
    ipAddress: '10.2.0.99',
  });
  assert.equal(first.ok, true);

  await recordAuditLog(db, {
    category: 'BERKAS',
    action: 'FILE_DELETED',
    severity: 'critical',
    actorId: 1,
    actorUsername: 'admin',
    actorRole: 'Administrator',
    targetType: 'file',
    targetId: '4040/2026',
    summary: 'Admin menghapus berkas 4040/2026 secara permanen',
    ipAddress: '127.0.0.1',
  });

  const allRes = await listAuditLogs(db);
  assert.equal(allRes.total, 2);
  assert.equal(allRes.logs[0].action, 'FILE_DELETED');
  assert.equal(allRes.summary.totalEvents, 2);
  assert.equal(allRes.summary.failedLogins24h, 1);
  assert.equal(allRes.summary.criticalCount, 1);

  const authOnly = await listAuditLogs(db, { category: 'AUTH', search: '10.2.0.99' });
  assert.equal(authOnly.total, 1);
  assert.equal(authOnly.logs[0].metadata.reason, 'bad_password');
  assert.equal(authOnly.logs[0].metadata.password, undefined);
  assert.equal(authOnly.logs[0].metadata.token, undefined);
});
