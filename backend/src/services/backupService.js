const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const EXPECTED_TABLES = Object.freeze([
  'disposisi',
  'file_history',
  'files',
  'suggestions',
  'surat',
  'surat_disposisi',
  'surat_history',
  'user_dwg_files',
  'users',
]);

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MIN_RETAINED_BACKUPS = 3;
const BACKUP_FILENAME_REGEX = /^database_backup_[0-9A-Za-z._-]+\.sqlite$/;

/**
 * Memvalidasi nama berkas backup agar bebas karakter path traversal maupun ekstensi ilegal.
 */
function isValidBackupFilename(filename) {
  if (typeof filename !== 'string') return false;
  const trimmed = filename.trim();
  if (!trimmed || trimmed !== filename) return false;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) return false;
  if (path.basename(trimmed) !== trimmed) return false;
  return BACKUP_FILENAME_REGEX.test(trimmed);
}

/**
 * Menghasilkan label timestamp konsisten WIB (Asia/Jakarta) format `YYYY-MM-DD_HH-mm-ss`.
 */
function formatJakartaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return `${map.year}-${map.month}-${map.day}_${map.hour}-${map.minute}-${map.second}`;
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this?.changes ?? 0, lastID: this?.lastID ?? 0 });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function openSqliteDb(filePath, mode) {
  return new Promise((resolve, reject) => {
    const db =
      mode === undefined
        ? new sqlite3.Database(filePath, (err) => (err ? reject(err) : resolve(db)))
        : new sqlite3.Database(filePath, mode, (err) => (err ? reject(err) : resolve(db)));
  });
}

function closeSqliteDb(db) {
  if (!db) return Promise.resolve();
  return new Promise((resolve) => {
    db.close(() => resolve());
  });
}

function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Memilih nama file tujuan unik di dalam `backupsDir` tanpa menimpa arsip yang sudah ada.
 */
function resolveUniqueBackupFilename(backupsDir, timestampLabel) {
  const baseLabel = timestampLabel || formatJakartaTimestamp();
  const baseName = `database_backup_${baseLabel}`;
  let candidate = `${baseName}.sqlite`;
  let suffix = 2;

  while (fs.existsSync(path.join(backupsDir, candidate))) {
    candidate = `${baseName}-${suffix}.sqlite`;
    suffix += 1;
  }

  return candidate;
}

/**
 * Menguji kelayakan restore file backup `.sqlite` dengan menyalin ke direktori sementara terisolasi
 * (tanpa menyentuh database produksi), lalu menjalankan `PRAGMA integrity_check` dan audit 9 tabel.
 */
async function verifyBackupFile(backupFilePath, { workDir } = {}) {
  const startMs = Date.now();
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    throw new Error('Berkas backup tidak ditemukan.');
  }

  const stat = fs.statSync(backupFilePath);
  if (!stat.isFile() || stat.size === 0) {
    return {
      ok: false,
      filename: path.basename(backupFilePath),
      sizeBytes: stat.size || 0,
      sha256: null,
      integrityCheck: 'empty-file',
      missingTables: [...EXPECTED_TABLES],
      tableCounts: {},
      totalRows: 0,
      durationMs: Date.now() - startMs,
      verifiedAt: new Date().toISOString(),
      error: 'Ukuran berkas backup 0 byte atau bukan berkas reguler.',
    };
  }

  const sha256 = await computeFileSha256(backupFilePath);
  const tempDir = fs.mkdtempSync(path.join(workDir || os.tmpdir(), 'pantau-sp-restore-'));
  const restoredCopyPath = path.join(tempDir, 'restore-verify.sqlite');
  let tempDb = null;

  try {
    fs.copyFileSync(backupFilePath, restoredCopyPath);
    tempDb = await openSqliteDb(restoredCopyPath, sqlite3.OPEN_READONLY);

    const integrityRows = await dbAll(tempDb, 'PRAGMA integrity_check');
    const integrityMessages = integrityRows.map((row) => row.integrity_check).filter(Boolean);
    const integrityCheck = integrityMessages.join('; ') || 'unknown';
    const isIntegrityOk = integrityMessages.length === 1 && integrityMessages[0] === 'ok';

    const existingTableRows = await dbAll(
      tempDb,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );
    const existingSet = new Set(existingTableRows.map((row) => row.name));
    const missingTables = EXPECTED_TABLES.filter((tbl) => !existingSet.has(tbl));

    const tableCounts = {};
    let totalRows = 0;

    for (const tableName of EXPECTED_TABLES) {
      if (!existingSet.has(tableName)) {
        tableCounts[tableName] = null;
        continue;
      }
      const row = await dbGet(tempDb, `SELECT COUNT(*) AS count FROM "${tableName}"`);
      const count = Number(row?.count ?? 0);
      tableCounts[tableName] = count;
      totalRows += count;
    }

    const ok = isIntegrityOk && missingTables.length === 0;
    return {
      ok,
      filename: path.basename(backupFilePath),
      sizeBytes: stat.size,
      sha256,
      integrityCheck,
      missingTables,
      tableCounts,
      totalRows,
      durationMs: Date.now() - startMs,
      verifiedAt: new Date().toISOString(),
      error: ok
        ? null
        : !isIntegrityOk
          ? `Pemeriksaan integritas SQLite gagal: ${integrityCheck}`
          : `Tabel wajib tidak lengkap pada snapshot: ${missingTables.join(', ')}`,
    };
  } catch (err) {
    return {
      ok: false,
      filename: path.basename(backupFilePath),
      sizeBytes: stat.size,
      sha256,
      integrityCheck: 'corrupt-or-unreadable',
      missingTables: [...EXPECTED_TABLES],
      tableCounts: {},
      totalRows: 0,
      durationMs: Date.now() - startMs,
      verifiedAt: new Date().toISOString(),
      error: err?.message || 'Gagal membuka berkas backup SQLite.',
    };
  } finally {
    await closeSqliteDb(tempDb);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Mengembalikan daftar file backup `.sqlite` yang valid dari `backupsDir`, diurutkan terbaru dahulu.
 */
function listBackups(backupsDir) {
  if (!backupsDir || !fs.existsSync(backupsDir)) {
    return [];
  }

  return fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isValidBackupFilename(entry.name))
    .map((entry) => {
      const fullPath = path.join(backupsDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        filename: entry.name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.filename.localeCompare(a.filename));
}

/**
 * Membaca potongan akhir `backup.log` secara aman bila ada untuk pemantauan jadwal cron QNAP.
 */
function readBackupLogTail(backupsDir, maxLines = 25) {
  if (!backupsDir) return [];
  const logPath = path.join(backupsDir, 'backup.log');
  if (!fs.existsSync(logPath)) return [];

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

/**
 * Menghapus backup usang melebihi `retentionDays`, sambil selalu menjaga minimal `minRetainedBackups` snapshot terbaru.
 */
function pruneOldBackups(
  backupsDir,
  {
    retentionDays = DEFAULT_RETENTION_DAYS,
    minRetainedBackups = DEFAULT_MIN_RETAINED_BACKUPS,
    nowMs = Date.now(),
  } = {}
) {
  const entries = listBackups(backupsDir);
  const cutoffMs = nowMs - retentionDays * 24 * 60 * 60 * 1000;
  const deleted = [];
  const kept = [];

  entries.forEach((entry, index) => {
    const mustKeepMinimum = index < minRetainedBackups;
    const isExpired = entry.mtimeMs < cutoffMs;
    if (!mustKeepMinimum && isExpired) {
      try {
        fs.rmSync(path.join(backupsDir, entry.filename), { force: true });
        deleted.push(entry.filename);
      } catch {
        kept.push(entry.filename);
      }
    } else {
      kept.push(entry.filename);
    }
  });

  return {
    deletedCount: deleted.length,
    deletedFiles: deleted,
    remainingCount: kept.length,
  };
}

/**
 * Membuat snapshot konsisten tanpa henti via `SQLite VACUUM INTO`, melakukan uji restore otomatis,
 * lalu menerapkan pembersihan retensi. Jika verifikasi gagal, snapshot rusak langsung dihapus.
 */
async function createOnlineBackup(
  db,
  {
    backupsDir,
    retentionDays = DEFAULT_RETENTION_DAYS,
    minRetainedBackups = DEFAULT_MIN_RETAINED_BACKUPS,
    timestampLabel,
    workDir,
    nowMs,
  } = {}
) {
  if (!db) {
    throw new Error('Koneksi database aktif tidak tersedia untuk backup.');
  }
  if (!backupsDir) {
    throw new Error('Direktori tujuan backup wajib ditentukan.');
  }

  fs.mkdirSync(backupsDir, { recursive: true });

  const filename = resolveUniqueBackupFilename(backupsDir, timestampLabel);
  const finalPath = path.join(backupsDir, filename);
  const tmpStagePath = path.join(backupsDir, `.staging-${process.pid}-${Date.now()}-${filename}`);

  try {
    fs.rmSync(tmpStagePath, { force: true });
    await dbRun(db, 'VACUUM INTO ?', [tmpStagePath]);
    fs.renameSync(tmpStagePath, finalPath);
  } catch (err) {
    fs.rmSync(tmpStagePath, { force: true });
    throw err;
  }

  const verification = await verifyBackupFile(finalPath, { workDir });
  if (!verification.ok) {
    fs.rmSync(finalPath, { force: true });
    const err = new Error(verification.error || 'Snapshot backup gagal melewati uji integritas.');
    err.verification = verification;
    throw err;
  }

  const retention = pruneOldBackups(backupsDir, {
    retentionDays,
    minRetainedBackups,
    nowMs,
  });

  return {
    backup: {
      filename,
      sizeBytes: verification.sizeBytes,
      sha256: verification.sha256,
      createdAt: verification.verifiedAt,
    },
    verification,
    retention,
  };
}

module.exports = {
  EXPECTED_TABLES,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  isValidBackupFilename,
  formatJakartaTimestamp,
  openSqliteDb,
  closeSqliteDb,
  verifyBackupFile,
  listBackups,
  readBackupLogTail,
  pruneOldBackups,
  createOnlineBackup,
};
