const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { getClientIp, verifyQRCodeToken } = require('../utils/networkAndQr');
const { canAccessDwg, createAuthMiddleware } = require('./auth');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    sentStatus: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    sendStatus(code) {
      this.sentStatus = code;
      return this;
    },
  };
}

test('getClientIp mengekstrak IP bersih dan menghapus prefix IPv6-mapped', () => {
  assert.equal(
    getClientIp({ headers: { 'cf-connecting-ip': '203.0.113.10, 10.0.0.1' }, socket: {} }),
    '203.0.113.10'
  );
  assert.equal(
    getClientIp({ headers: {}, socket: { remoteAddress: '::ffff:192.168.1.25' } }),
    '192.168.1.25'
  );
  assert.equal(getClientIp({ headers: {}, socket: {} }), '127.0.0.1');
});

test('verifyQRCodeToken mendukung JWT_SECRET aktif maupun fallback legacy secret', () => {
  const activeSecret = 'custom-prod-secret';
  const legacySecret = 'super-secret-key-for-file-tracker';

  const modernToken = jwt.sign({ berkas: 'K1-001' }, activeSecret);
  const legacyToken = jwt.sign({ berkas: 'K1-LEGACY' }, legacySecret);

  assert.equal(verifyQRCodeToken(modernToken, { jwt, jwtSecret: activeSecret }).berkas, 'K1-001');
  assert.equal(verifyQRCodeToken(legacyToken, { jwt, jwtSecret: activeSecret }).berkas, 'K1-LEGACY');
  assert.throws(() => verifyQRCodeToken('invalid.token.value', { jwt, jwtSecret: activeSecret }));
});

test('canAccessDwg hanya mengizinkan role teknis pengukuran, pemetaan, dan admin', () => {
  assert.equal(canAccessDwg('Petugas Ukur'), true);
  assert.equal(canAccessDwg('Petugas Entry Berkas, Asisten Surveyor Kadastral'), true);
  assert.equal(canAccessDwg('Petugas Pemetaan'), true);
  assert.equal(canAccessDwg('Administrator'), true);
  assert.equal(canAccessDwg('Petugas Loket'), false);
  assert.equal(canAccessDwg(''), false);
});

test('requireAdmin, requireAdminOrKasi, dan requireDwgAccess memvalidasi role dengan tepat', () => {
  const { requireAdmin, requireAdminOrKasi, requireDwgAccess } = createAuthMiddleware({
    db: {},
    jwt,
    jwtSecret: 'secret',
  });

  // requireAdmin
  const resAdminFail = createMockRes();
  let nextCalled = false;
  requireAdmin({ user: { role: 'Petugas Ukur' } }, resAdminFail, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(resAdminFail.statusCode, 403);

  const resAdminOk = createMockRes();
  requireAdmin({ user: { role: 'Petugas Ukur, Administrator' } }, resAdminOk, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  // requireAdminOrKasi
  const resKasiOk = createMockRes();
  nextCalled = false;
  requireAdminOrKasi({ user: { role: 'Kepala Seksi Survei' } }, resKasiOk, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  // requireDwgAccess
  const resDwgFail = createMockRes();
  nextCalled = false;
  requireDwgAccess({ user: { role: 'Petugas Arsip' } }, resDwgFail, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(resDwgFail.statusCode, 403);
});

test('authenticateJWT menolak tanpa header, menolak sesi tertimpa, dan menyegarkan full_name pada sesi valid', () => {
  const secret = 'test-jwt-secret';
  const dbUpdates = [];
  const mockDb = {
    get(_sql, params, cb) {
      if (params[0] === 1) {
        cb(null, { session_id: 'sess-a,sess-b', full_name: 'Nama DB Terbaru' });
      } else {
        cb(null, null);
      }
    },
    run(sql, params) {
      dbUpdates.push({ sql, params });
    },
  };

  const { authenticateJWT, userLastActiveMap } = createAuthMiddleware({
    db: mockDb,
    jwt,
    jwtSecret: secret,
  });

  // Tanpa Authorization header -> 401
  const resNoAuth = createMockRes();
  authenticateJWT({ headers: {} }, resNoAuth, () => {});
  assert.equal(resNoAuth.sentStatus, 401);

  // Token valid tetapi session_id tidak lagi aktif -> 403
  const kickedToken = jwt.sign({ id: 1, session_id: 'sess-expired', full_name: 'Lama' }, secret);
  const resKicked = createMockRes();
  authenticateJWT({ headers: { authorization: `Bearer ${kickedToken}` }, socket: {} }, resKicked, () => {});
  assert.equal(resKicked.statusCode, 403);
  assert.match(resKicked.body.error, /Maksimal 2/);

  // Token valid dengan session aktif -> next() dipanggil & full_name diperbarui
  const validToken = jwt.sign({ id: 1, session_id: 'sess-b', role: 'Administrator', full_name: 'Lama' }, secret);
  const reqValid = { headers: { authorization: `Bearer ${validToken}`, 'x-forwarded-for': '10.2.0.50' }, socket: {} };
  const resValid = createMockRes();
  let proceeded = false;
  authenticateJWT(reqValid, resValid, () => { proceeded = true; });

  assert.equal(proceeded, true);
  assert.equal(reqValid.user.full_name, 'Nama DB Terbaru');
  assert.equal(userLastActiveMap.has(1), true);
  assert.equal(dbUpdates.length, 1);
  assert.deepEqual(dbUpdates[0].params, ['10.2.0.50', 1]);
});
