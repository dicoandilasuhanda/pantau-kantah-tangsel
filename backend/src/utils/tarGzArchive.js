const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BLOCK_SIZE = 512;

function writeOctal(buf, offset, length, value) {
  const oct = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0');
  buf.write(oct.slice(-(length - 1)) + '\0', offset, length, 'ascii');
}

function splitTarPath(posixPath) {
  const bytes = Buffer.byteLength(posixPath, 'utf8');
  if (bytes <= 100) {
    return { name: posixPath, prefix: '' };
  }

  let splitIdx = posixPath.lastIndexOf('/');
  while (splitIdx > 0) {
    const prefix = posixPath.slice(0, splitIdx);
    const name = posixPath.slice(splitIdx + 1);
    if (Buffer.byteLength(prefix, 'utf8') <= 155 && Buffer.byteLength(name, 'utf8') <= 100) {
      return { name, prefix };
    }
    splitIdx = posixPath.lastIndexOf('/', splitIdx - 1);
  }

  throw new Error(`Path arsip terlalu panjang untuk format USTAR: ${posixPath}`);
}

function buildUstarHeader({ relPath, isDirectory, size, mtimeMs }) {
  const header = Buffer.alloc(BLOCK_SIZE, 0);
  const { name, prefix } = splitTarPath(relPath);

  header.write(name, 0, Math.min(100, Buffer.byteLength(name, 'utf8')), 'utf8');
  header.write(isDirectory ? '0000755\0' : '0000644\0', 100, 8, 'ascii');
  header.write('0000000\0', 108, 8, 'ascii');
  header.write('0000000\0', 116, 8, 'ascii');
  writeOctal(header, 124, 12, isDirectory ? 0 : size);
  writeOctal(header, 136, 12, Math.floor((mtimeMs || Date.now()) / 1000));

  // Isi checksum sementara dengan 8 spasi sesuai spesifikasi POSIX.1-1988
  header.fill(0x20, 148, 156);
  header.write(isDirectory ? '5' : '0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  if (prefix) {
    header.write(prefix, 345, Math.min(155, Buffer.byteLength(prefix, 'utf8')), 'utf8');
  }

  let sum = 0;
  for (let i = 0; i < BLOCK_SIZE; i += 1) {
    sum += header[i];
  }
  const chksumOct = sum.toString(8).padStart(6, '0');
  header.write(`${chksumOct}\0 `, 148, 8, 'ascii');

  return header;
}

function collectDirectoryEntries(rootDir, currentDir = rootDir, list = []) {
  if (!fs.existsSync(currentDir)) return list;
  const entries = fs
    .readdirSync(currentDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    // Abaikan berkas tersembunyi/sementara agar snapshot bersih
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      const stat = fs.statSync(fullPath);
      list.push({
        relPath: `${relPath}/`,
        fullPath,
        isDirectory: true,
        size: 0,
        mtimeMs: stat.mtimeMs,
      });
      collectDirectoryEntries(rootDir, fullPath, list);
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      list.push({
        relPath,
        fullPath,
        isDirectory: false,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
  }

  return list;
}

function writeChunkWithBackpressure(stream, chunk) {
  return new Promise((resolve, reject) => {
    const ok = stream.write(chunk, (err) => {
      if (err) reject(err);
    });
    if (ok) {
      resolve();
    } else {
      stream.once('drain', resolve);
    }
  });
}

function streamFileIntoTar(targetStream, filePath, expectedSize) {
  return new Promise((resolve, reject) => {
    let written = 0;
    const rs = fs.createReadStream(filePath);
    rs.on('error', reject);
    rs.on('data', (chunk) => {
      written += chunk.length;
      if (!targetStream.write(chunk)) {
        rs.pause();
        targetStream.once('drain', () => rs.resume());
      }
    });
    rs.on('end', () => {
      if (written !== expectedSize) {
        return reject(new Error(`Ukuran file berubah saat pengarsipan: ${filePath}`));
      }
      resolve();
    });
  });
}

/**
 * Mengarsipkan direktori secara streaming ke format POSIX USTAR `.tar.gz` lintas platform
 * tanpa bergantung pada binary CLI `tar` sistem operasi.
 */
async function createTarGzFromDirectory(sourceDir, targetPath) {
  const entries = collectDirectoryEntries(sourceDir);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const gzip = zlib.createGzip({ level: 6 });
  const out = fs.createWriteStream(targetPath);

  const completion = new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
    gzip.on('error', reject);
  });

  gzip.pipe(out);

  let fileCount = 0;
  let dirCount = 0;
  let totalRawBytes = 0;

  try {
    for (const item of entries) {
      const header = buildUstarHeader(item);
      await writeChunkWithBackpressure(gzip, header);

      if (item.isDirectory) {
        dirCount += 1;
        continue;
      }

      fileCount += 1;
      totalRawBytes += item.size;

      if (item.size > 0) {
        await streamFileIntoTar(gzip, item.fullPath, item.size);
        const remainder = item.size % BLOCK_SIZE;
        if (remainder !== 0) {
          await writeChunkWithBackpressure(gzip, Buffer.alloc(BLOCK_SIZE - remainder, 0));
        }
      }
    }

    // Penanda akhir arsip TAR POSIX (dua blok 512-byte bernilai nol)
    await writeChunkWithBackpressure(gzip, Buffer.alloc(BLOCK_SIZE * 2, 0));
    gzip.end();
    await completion;

    return {
      fileCount,
      dirCount,
      totalRawBytes,
    };
  } catch (err) {
    gzip.destroy();
    out.destroy();
    fs.rmSync(targetPath, { force: true });
    throw err;
  }
}

function readUstarString(buf, start, length) {
  const slice = buf.subarray(start, start + length);
  const zeroIdx = slice.indexOf(0);
  return slice.subarray(0, zeroIdx === -1 ? length : zeroIdx).toString('utf8');
}

/**
 * Memverifikasi keutuhan stream gzip, validitas checksum setiap header USTAR,
 * serta keselarasan seluruh blok payload di dalam arsip `.tar.gz`.
 */
function verifyTarGzArchive(tarGzPath) {
  return new Promise((resolve) => {
    if (!tarGzPath || !fs.existsSync(tarGzPath)) {
      return resolve({
        ok: false,
        fileCount: 0,
        dirCount: 0,
        totalRawBytes: 0,
        entries: [],
        error: 'Berkas arsip .tar.gz tidak ditemukan.',
      });
    }

    const rs = fs.createReadStream(tarGzPath);
    const gunzip = zlib.createGunzip();

    let state = 'HEADER';
    let buffer = Buffer.alloc(0);
    let remainingEntryBytes = 0;
    let zeroBlocksSeen = 0;
    let fileCount = 0;
    let dirCount = 0;
    let totalRawBytes = 0;
    const entries = [];
    let settled = false;

    const fail = (message) => {
      if (settled) return;
      settled = true;
      rs.destroy();
      gunzip.destroy();
      resolve({
        ok: false,
        fileCount,
        dirCount,
        totalRawBytes,
        entries,
        error: message,
      });
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve({
        ok: true,
        fileCount,
        dirCount,
        totalRawBytes,
        entries,
        error: null,
      });
    };

    const processChunks = () => {
      while (!settled) {
        if (state === 'HEADER') {
          if (buffer.length < BLOCK_SIZE) break;
          const header = buffer.subarray(0, BLOCK_SIZE);
          buffer = buffer.subarray(BLOCK_SIZE);

          const isAllZero = header.every((b) => b === 0);
          if (isAllZero) {
            zeroBlocksSeen += 1;
            continue;
          }
          if (zeroBlocksSeen > 0) {
            return fail('Struktur arsip TAR korup (blok setelah penanda EOF).');
          }

          const storedChecksumRaw = header.subarray(148, 156).toString('ascii').replace(/\0.*$/, '').trim();
          const storedChecksum = Number.parseInt(storedChecksumRaw, 8);
          let computedChecksum = 0;
          for (let i = 0; i < BLOCK_SIZE; i += 1) {
            computedChecksum += i >= 148 && i < 156 ? 0x20 : header[i];
          }

          if (!Number.isFinite(storedChecksum) || storedChecksum !== computedChecksum) {
            return fail('Checksum header USTAR tidak cocok.');
          }

          const namePart = readUstarString(header, 0, 100);
          const prefixPart = readUstarString(header, 345, 155);
          const relPath = prefixPart ? `${prefixPart}/${namePart}` : namePart;
          const typeFlag = String.fromCharCode(header[156]);
          const sizeRaw = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
          const size = sizeRaw ? Number.parseInt(sizeRaw, 8) : 0;

          if (!Number.isFinite(size) || size < 0) {
            return fail(`Ukuran entri tidak valid pada header ${relPath}`);
          }

          if (typeFlag === '5') {
            dirCount += 1;
          } else {
            fileCount += 1;
            totalRawBytes += size;
            entries.push({ path: relPath, sizeBytes: size });
          }

          if (size > 0) {
            const paddedSize = Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
            remainingEntryBytes = paddedSize;
            state = 'PAYLOAD';
          }
        } else if (state === 'PAYLOAD') {
          if (buffer.length === 0) break;
          const consume = Math.min(buffer.length, remainingEntryBytes);
          buffer = buffer.subarray(consume);
          remainingEntryBytes -= consume;
          if (remainingEntryBytes === 0) {
            state = 'HEADER';
          }
        }
      }
    };

    gunzip.on('data', (chunk) => {
      if (settled) return;
      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
      processChunks();
    });

    gunzip.on('end', () => {
      if (settled) return;
      processChunks();
      if (state === 'PAYLOAD' || remainingEntryBytes > 0 || buffer.length > 0) {
        return fail('Arsip TAR terpotong sebelum seluruh blok payload selesai dibaca.');
      }
      if (zeroBlocksSeen < 2) {
        return fail('Penanda EOF arsip TAR tidak lengkap.');
      }
      return succeed();
    });

    rs.on('error', (err) => fail(`Gagal membaca arsip: ${err.message}`));
    gunzip.on('error', (err) => fail(`Stream GZIP korup atau terpotong: ${err.message}`));

    rs.pipe(gunzip);
  });
}

module.exports = {
  createTarGzFromDirectory,
  verifyTarGzArchive,
};
