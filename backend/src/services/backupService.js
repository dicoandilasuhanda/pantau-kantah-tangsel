const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { createTarGzFromDirectory, verifyTarGzArchive } = require('../utils/tarGzArchive');

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

// Tabel opsional (ditambahkan pada Opsi 2) agar snapshot lama 9 tabel tetap valid saat uji restore
const OPTIONAL_TABLES = Object.freeze(['audit_logs']);

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MIN_RETAINED_BACKUPS = 3;

const BACKUP_SPECS = Object.freeze({
  sqlite: {
    prefix: 'database_backup_',
    ext: '.sqlite',
    regex: /^database_backup_[0-9A-Za-z._-]+\.sqlite$/,
  },
  uploads: {
    prefix: 'uploads_backup_',
    ext: '.tar.gz',
    regex: /^uploads_backup_[0-9A-Za-z._-]+\.tar\.gz$/,
  },
});

function hasSafeFilenameShape(filename) {
  if (typeof filename !== 'string') return false;
  const trimmed = filename.trim();
  if (!trimmed || trimmed !== filename) return false;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) return false;
  return path.basename(trimmed) === trimmed;
}

/**
 * Mengidentifikasi jenis arsip backup yang sah (`'sqlite'`, `'uploads'`, atau `null`).
 */
function getBackupKind(filename) {
  if (!hasSafeFilenameShape(filename)) return null;
  if (BACKUP_SPECS.sqlite.regex.test(filename)) return 'sqlite';
  if (BACKUP_SPECS.uploads.regex.test(filename)) return 'uploads';
  return null;
}

/**
 * Memvalidasi nama berkas backup SQLite agar bebas path traversal maupun ekstensi ilegal.
 */
function isValidBackupFilename(filename) {
  return getBackupKind(filename) === 'sqlite';
}

/**
 * Memvalidasi nama berkas arsip `uploads/` `.tar.gz`.
 */
function isValidUploadsBackupFilename(filename) {
  return getBackupKind(filename) === 'uploads';
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
function resolveUniqueBackupFilename(backupsDir, timestampLabel, kind = 'sqlite') {
  const spec = BACKUP_SPECS[kind] || BACKUP_SPECS.sqlite;
  const baseLabel = timestampLabel || formatJakartaTimestamp();
  const baseName = `${spec.prefix}${baseLabel}`;
  let candidate = `${baseName}${spec.ext}`;
  let suffix = 2;

  while (fs.existsSync(path.join(backupsDir, candidate))) {
    candidate = `${baseName}-${suffix}${spec.ext}`;
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
      kind: 'sqlite',
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

    for (const optTable of OPTIONAL_TABLES) {
      if (!existingSet.has(optTable)) continue;
      const row = await dbGet(tempDb, `SELECT COUNT(*) AS count FROM "${optTable}"`);
      const count = Number(row?.count ?? 0);
      tableCounts[optTable] = count;
      totalRows += count;
    }

    const ok = isIntegrityOk && missingTables.length === 0;
    return {
      ok,
      kind: 'sqlite',
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
      kind: 'sqlite',
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
 * Memverifikasi keutuhan arsip berkas `uploads` (`.tar.gz`), checksum header USTAR, dan SHA-256.
 */
async function verifyUploadsBackupFile(tarGzPath) {
  const startMs = Date.now();
  if (!tarGzPath || !fs.existsSync(tarGzPath)) {
    throw new Error('Berkas arsip uploads tidak ditemukan.');
  }

  const stat = fs.statSync(tarGzPath);
  if (!stat.isFile() || stat.size === 0) {
    return {
      ok: false,
      kind: 'uploads',
      filename: path.basename(tarGzPath),
      sizeBytes: stat.size || 0,
      sha256: null,
      integrityCheck: 'empty-file',
      fileCount: 0,
      dirCount: 0,
      totalRawBytes: 0,
      durationMs: Date.now() - startMs,
      verifiedAt: new Date().toISOString(),
      error: 'Ukuran berkas arsip uploads 0 byte atau bukan berkas reguler.',
    };
  }

  const sha256 = await computeFileSha256(tarGzPath);
  const check = await verifyTarGzArchive(tarGzPath);

  return {
    ok: check.ok,
    kind: 'uploads',
    filename: path.basename(tarGzPath),
    sizeBytes: stat.size,
    sha256,
    integrityCheck: check.ok ? 'ok' : 'corrupt-archive',
    fileCount: check.fileCount,
    dirCount: check.dirCount,
    totalRawBytes: check.totalRawBytes,
    durationMs: Date.now() - startMs,
    verifiedAt: new Date().toISOString(),
    error: check.error,
  };
}

/**
 * Mengembalikan daftar file backup dari `backupsDir` berdasarkan jenis (`'sqlite'`, `'uploads'`, atau `'all'`),
 * diurutkan dari yang terbaru dahulu.
 */
function listBackups(backupsDir, kind = 'sqlite') {
  if (!backupsDir || !fs.existsSync(backupsDir)) {
    return [];
  }

  return fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isFile()) return false;
      const detectedKind = getBackupKind(entry.name);
      if (!detectedKind) return false;
      return kind === 'all' ? true : detectedKind === kind;
    })
    .map((entry) => {
      const fullPath = path.join(backupsDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        filename: entry.name,
        kind: getBackupKind(entry.name),
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
 * Menghapus backup usang melebihi `retentionDays` sesuai `kind` (`'sqlite'` / `'uploads'`),
 * sambil selalu menjaga minimal `minRetainedBackups` snapshot terbaru.
 */
function pruneOldBackups(
  backupsDir,
  {
    kind = 'sqlite',
    retentionDays = DEFAULT_RETENTION_DAYS,
    minRetainedBackups = DEFAULT_MIN_RETAINED_BACKUPS,
    nowMs = Date.now(),
  } = {}
) {
  const entries = listBackups(backupsDir, kind);
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

  const filename = resolveUniqueBackupFilename(backupsDir, timestampLabel, 'sqlite');
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
    kind: 'sqlite',
    retentionDays,
    minRetainedBackups,
    nowMs,
  });

  return {
    backup: {
      filename,
      kind: 'sqlite',
      sizeBytes: verification.sizeBytes,
      sha256: verification.sha256,
      createdAt: verification.verifiedAt,
    },
    verification,
    retention,
  };
}

/**
 * Mengarsipkan seluruh berkas fisik `uploads/` (PDF surat, DWG kadastral, foto avatar)
 * secara streaming menjadi `.tar.gz`, memverifikasi keutuhan USTAR + GZIP, lalu merotasi arsip lama.
 */
async function createUploadsBackup({
  uploadsDir,
  backupsDir,
  retentionDays = DEFAULT_RETENTION_DAYS,
  minRetainedBackups = DEFAULT_MIN_RETAINED_BACKUPS,
  timestampLabel,
  nowMs,
} = {}) {
  if (!backupsDir) {
    throw new Error('Direktori tujuan backup wajib ditentukan.');
  }

  fs.mkdirSync(backupsDir, { recursive: true });

  const filename = resolveUniqueBackupFilename(backupsDir, timestampLabel, 'uploads');
  const finalPath = path.join(backupsDir, filename);
  const tmpStagePath = path.join(backupsDir, `.staging-${process.pid}-${Date.now()}-${filename}`);

  try {
    fs.rmSync(tmpStagePath, { force: true });
    await createTarGzFromDirectory(uploadsDir, tmpStagePath);
    fs.renameSync(tmpStagePath, finalPath);
  } catch (err) {
    fs.rmSync(tmpStagePath, { force: true });
    throw err;
  }

  const verification = await verifyUploadsBackupFile(finalPath);
  if (!verification.ok) {
    fs.rmSync(finalPath, { force: true });
    const err = new Error(verification.error || 'Arsip uploads gagal melewati uji integritas.');
    err.verification = verification;
    throw err;
  }

  const retention = pruneOldBackups(backupsDir, {
    kind: 'uploads',
    retentionDays,
    minRetainedBackups,
    nowMs,
  });

  return {
    backup: {
      filename,
      kind: 'uploads',
      sizeBytes: verification.sizeBytes,
      sha256: verification.sha256,
      createdAt: verification.verifiedAt,
    },
    verification,
    retention,
  };
}

function formatSizeMbKb(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Mengirim ringkasan hasil backup/verifikasi ke seluruh Administrator yang telah menautkan Telegram.
 */
async function notifyAdminsBackupStatus(
  db,
  sendTelegramMessage,
  { ok, triggerLabel = 'Cron / CLI', actorUsername = null, dbResult = null, uploadsResult = null, errorMessage = null } = {}
) {
  if (!db || typeof sendTelegramMessage !== 'function') {
    return { targetAdmins: 0, sentCount: 0 };
  }

  const admins = await dbAll(
    db,
    "SELECT username, telegram_chat_id FROM users WHERE role LIKE '%Administrator%' AND telegram_chat_id IS NOT NULL AND TRIM(telegram_chat_id) != ''"
  ).catch(() => []);

  if (!admins || admins.length === 0) {
    return { targetAdmins: 0, sentCount: 0 };
  }

  const triggerText = escapeHtml(actorUsername ? `${triggerLabel} (@${actorUsername})` : triggerLabel);
  let message;

  if (ok) {
    const lines = [
      '✅ <b>Laporan Backup &amp; Uji Restore Pantau.Kantah</b>',
      `⚙️ <b>Pemicu:</b> ${triggerText}`,
    ];

    if (dbResult?.backup && dbResult?.verification) {
      lines.push(
        `🗄️ <b>Database SQLite:</b> <code>${escapeHtml(dbResult.backup.filename)}</code> (${formatSizeMbKb(dbResult.backup.sizeBytes)})`,
        `🛡️ <b>Integritas DB:</b> <code>PRAGMA integrity_check=${escapeHtml(dbResult.verification.integrityCheck)}</code> • ${dbResult.verification.totalRows} baris (${dbResult.verification.durationMs} ms)`
      );
    }

    if (uploadsResult?.backup && uploadsResult?.verification) {
      lines.push(
        `📁 <b>Arsip Uploads:</b> <code>${escapeHtml(uploadsResult.backup.filename)}</code> (${formatSizeMbKb(uploadsResult.backup.sizeBytes)}, ${uploadsResult.verification.fileCount} file)`
      );
    }

    lines.push(`🕒 <i>${formatJakartaTimestamp()} WIB</i>`);
    message = lines.join('\n');
  } else {
    message = [
      '🚨 <b>PERINGATAN: Backup / Uji Integritas Gagal!</b>',
      `⚙️ <b>Pemicu:</b> ${triggerText}`,
      `❌ <b>Rincian:</b> <code>${escapeHtml(String(errorMessage || 'Kesalahan tidak diketahui').slice(0, 350))}</code>`,
      `🕒 <i>${formatJakartaTimestamp()} WIB</i>`,
    ].join('\n');
  }

  const deliveries = await Promise.allSettled(
    admins.map((adm) => sendTelegramMessage(adm.telegram_chat_id, message))
  );
  const sentCount = deliveries.filter(
    (res) => res.status === 'fulfilled' && res.value && res.value.ok
  ).length;

  return { targetAdmins: admins.length, sentCount };
}

module.exports = {
  EXPECTED_TABLES,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  getBackupKind,
  isValidBackupFilename,
  isValidUploadsBackupFilename,
  formatJakartaTimestamp,
  openSqliteDb,
  closeSqliteDb,
  verifyBackupFile,
  verifyUploadsBackupFile,
  listBackups,
  readBackupLogTail,
  pruneOldBackups,
  createOnlineBackup,
  createUploadsBackup,
  notifyAdminsBackupStatus,
};
