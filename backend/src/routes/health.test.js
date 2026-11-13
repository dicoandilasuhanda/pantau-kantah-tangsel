const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createHealthRouter } = require('./health');

async function requestHealth(router) {
  const app = express();
  app.use('/api/health', router);

  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await res.json();
    return { status: res.status, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/health mengembalikan 200 ok saat database terhubung', async () => {
  const healthyDb = {
    get(_sql, _params, cb) {
      cb(null, { ok: 1 });
    },
  };

  const { status, body } = await requestHealth(createHealthRouter({ db: healthyDb }));
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'pantau-kantah-tangsel');
  assert.equal(body.database, 'connected');
  assert.equal(typeof body.uptimeSeconds, 'number');
  assert.ok(Date.parse(body.timestamp));
});

test('GET /api/health mengembalikan 503 unhealthy saat query database gagal', async () => {
  const brokenDb = {
    get(_sql, _params, cb) {
      cb(new Error('SQLITE_CANTOPEN'));
    },
  };

  const { status, body } = await requestHealth(createHealthRouter({ db: brokenDb }));
  assert.equal(status, 503);
  assert.equal(body.status, 'unhealthy');
  assert.equal(body.database, 'disconnected');
  assert.ok(Date.parse(body.timestamp));
});
