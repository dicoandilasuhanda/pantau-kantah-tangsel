const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { createTarGzFromDirectory, verifyTarGzArchive } = require('./tarGzArchive');

test('tarGzArchive packages nested uploads directories cleanly and verifies integrity', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-targz-'));
  const uploadsDir = path.join(root, 'uploads');
  const targetArchive = path.join(root, 'uploads_backup_test.tar.gz');

  fs.mkdirSync(path.join(uploadsDir, 'surat'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'dwg'), { recursive: true });

  const pdfPayload = Buffer.from('%PDF-1.4\nSample Surat PDF Content\n%%EOF\n');
  const largePayload = Buffer.alloc(15000, 0x41); // spans multiple 512-byte TAR blocks

  fs.writeFileSync(path.join(uploadsDir, 'surat', 'surat-101.pdf'), pdfPayload);
  fs.writeFileSync(path.join(uploadsDir, 'dwg', 'bidang-besar.dwg'), largePayload);
  fs.writeFileSync(path.join(uploadsDir, '.hidden-skip'), 'should not archive');

  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const packed = await createTarGzFromDirectory(uploadsDir, targetArchive);
  assert.equal(packed.fileCount, 2);
  assert.equal(packed.dirCount, 3);
  assert.equal(packed.totalRawBytes, pdfPayload.length + largePayload.length);

  const verification = await verifyTarGzArchive(targetArchive);
  assert.equal(verification.ok, true);
  assert.equal(verification.fileCount, 2);
  assert.equal(verification.totalRawBytes, packed.totalRawBytes);
  assert.deepEqual(
    verification.entries.map((e) => e.path),
    ['dwg/bidang-besar.dwg', 'surat/surat-101.pdf']
  );

  // Verify empty archive also builds valid readable tar.gz cleanly
  const emptyDir = path.join(root, 'empty-uploads');
  fs.mkdirSync(emptyDir, { recursive: true });
  const emptyArchive = path.join(root, 'empty.tar.gz');
  const emptyPacked = await createTarGzFromDirectory(emptyDir, emptyArchive);
  assert.equal(emptyPacked.fileCount, 0);
  const emptyCheck = await verifyTarGzArchive(emptyArchive);
  assert.equal(emptyCheck.ok, true);
});

test('tarGzArchive detects corrupted gzip bytes and invalid TAR headers cleanly', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-targz-corrupt-'));
  const badGzip = path.join(root, 'bad.tar.gz');
  const badHeaderTarGz = path.join(root, 'bad-header.tar.gz');

  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  fs.writeFileSync(badGzip, 'NOT-GZIP-BYTES');
  const badGzipResult = await verifyTarGzArchive(badGzip);
  assert.equal(badGzipResult.ok, false);
  assert.ok(badGzipResult.error);

  // Valid gzip wrapping non-zero garbage 512-byte header without valid USTAR checksum
  const bogusTar = Buffer.alloc(1024, 0x2a);
  fs.writeFileSync(badHeaderTarGz, zlib.gzipSync(bogusTar));
  const badHeaderResult = await verifyTarGzArchive(badHeaderTarGz);
  assert.equal(badHeaderResult.ok, false);
  assert.match(badHeaderResult.error, /Checksum header USTAR/i);
});
