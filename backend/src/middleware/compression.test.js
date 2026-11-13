const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const zlib = require('node:zlib');
const { createCompressionMiddleware } = require('./compression');

async function startTestApp(staticDir) {
  const app = express();
  app.use(createCompressionMiddleware({ threshold: 1024 }));
  if (staticDir) {
    app.use('/static', express.static(staticDir));
  }

  app.get('/small-json', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/large-json', (_req, res) => {
    res.json({
      items: Array.from({ length: 120 }, (_, i) => ({
        id: i + 1,
        label: `Berkas Permohonan Pengukuran Tanah Kota Tangerang Selatan #${i + 1}`,
      })),
    });
  });

  app.get('/script.js', (_req, res) => {
    res.type('application/javascript').send(`console.log("${'pantau-kantah-'.repeat(160)}");`);
  });

  app.get('/binary-download', (_req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="backup.sqlite"');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.alloc(4096, 0x41));
  });

  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

test('compression middleware compresses large JSON and JS with gzip/brotli while skipping small or attachment responses', async (t) => {
  const staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compression-static-'));
  const largeStaticContent = `window.__TEST__="${'kantah-tangsel-'.repeat(180000)}";`; // ~2.7 MB > 64KB chunk + zlib highWaterMark
  fs.writeFileSync(path.join(staticDir, 'bundle.js'), largeStaticContent, 'utf8');

  const { server, baseUrl } = await startTestApp(staticDir);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(staticDir, { recursive: true, force: true });
  });

  // Note: Node fetch auto-decompresses Content-Encoding transparently unless we inspect raw HTTP,
  // so use node:http to inspect raw compressed wire bytes and Content-Encoding headers directly!
  const http = require('node:http');
  const rawGet = (urlPath, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}${urlPath}`, { headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      });
      req.on('error', reject);
    });

  // 1. Small JSON < 1024 bytes must not be compressed
  const smallRes = await rawGet('/small-json', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(smallRes.status, 200);
  assert.equal(smallRes.headers['content-encoding'], undefined);
  assert.match(String(smallRes.headers.vary || ''), /Accept-Encoding/i);
  assert.deepEqual(JSON.parse(smallRes.body.toString('utf8')), { ok: true });

  // 2. Large JSON with br preferred decompresses identically via Brotli
  const brJsonRes = await rawGet('/large-json', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(brJsonRes.headers['content-encoding'], 'br');
  const parsedBr = JSON.parse(zlib.brotliDecompressSync(brJsonRes.body).toString('utf8'));
  assert.equal(parsedBr.items.length, 120);

  // 3. Large JS with gzip fallback decompresses identically via Gzip
  const gzipJsRes = await rawGet('/script.js', { 'Accept-Encoding': 'gzip' });
  assert.equal(gzipJsRes.headers['content-encoding'], 'gzip');
  const decompressedJs = zlib.gunzipSync(gzipJsRes.body).toString('utf8');
  assert.match(decompressedJs, /pantau-kantah-/);
  assert.ok(gzipJsRes.body.length < decompressedJs.length);

  // 4. Binary attachment must never be compressed
  const binRes = await rawGet('/binary-download', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(binRes.headers['content-encoding'], undefined);
  assert.equal(binRes.body.length, 4096);

  // 5. Range request skips compression even for large JSON
  const rangeRes = await rawGet('/large-json', { 'Accept-Encoding': 'br, gzip', Range: 'bytes=0-100' });
  assert.equal(rangeRes.headers['content-encoding'], undefined);

  // 6. Streamed express.static multi-MB bundle must handle backpressure/drain without hanging
  const staticBrRes = await rawGet('/static/bundle.js', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(staticBrRes.status, 200);
  assert.equal(staticBrRes.headers['content-encoding'], 'br');
  const decompressedStatic = zlib.brotliDecompressSync(staticBrRes.body).toString('utf8');
  assert.equal(decompressedStatic.length, largeStaticContent.length);
  assert.equal(decompressedStatic, largeStaticContent);
});
