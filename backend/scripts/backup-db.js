const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  isValidBackupFilename,
  openSqliteDb,
  closeSqliteDb,
  createOnlineBackup,
  verifyBackupFile,
  listBackups,
} = require('../src/services/backupService');

function parseArgs(argv) {
  const args = {
    verifyOnly: false,
    targetFile: null,
    retentionDays: DEFAULT_RETENTION_DAYS,
    minRetained: DEFAULT_MIN_RETAINED_BACKUPS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--verify-only') {
      args.verifyOnly = true;
    } else if (token === '--file' && argv[i + 1]) {
      args.targetFile = argv[i + 1];
      i += 1;
    } else if (token === '--retention-days' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed >= 1) args.retentionDays = parsed;
      i += 1;
    } else if (token === '--min-retained' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed >= 1) args.minRetained = parsed;
      i += 1;
    }
  }

  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const backendDir = path.resolve(__dirname, '..');
  const projectRoot = path.resolve(backendDir, '..');
  const dbPath = path.resolve(process.env.DB_PATH || path.join(backendDir, 'database.sqlite'));
  const backupsDir = path.resolve(process.env.BACKUPS_DIR || path.join(projectRoot, 'backups'));

  if (args.verifyOnly) {
    let targetPath;
    if (args.targetFile) {
      if (!isValidBackupFilename(path.basename(args.targetFile))) {
        throw new Error(`Nama file backup tidak valid: ${args.targetFile}`);
      }
      targetPath = path.isAbsolute(args.targetFile)
        ? args.targetFile
        : path.join(backupsDir, args.targetFile);
    } else {
      const available = listBackups(backupsDir);
      if (available.length === 0) {
        throw new Error(`Tidak ada arsip backup di ${backupsDir}`);
      }
      targetPath = path.join(backupsDir, available[0].filename);
    }

    console.log(`[Restore Check] Menguji integritas salinan terisolasi: ${path.basename(targetPath)}`);
    const report = await verifyBackupFile(targetPath);
    console.log(JSON.stringify(report, null, 2));

    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database aktif tidak ditemukan pada ${dbPath}`);
  }

  let liveDb = null;
  try {
    liveDb = await openSqliteDb(dbPath);
    liveDb.configure('busyTimeout', 5000);

    console.log(`[Backup] Membuat snapshot online via SQLite VACUUM INTO dari ${dbPath}...`);
    const result = await createOnlineBackup(liveDb, {
      backupsDir,
      retentionDays: args.retentionDays,
      minRetainedBackups: args.minRetained,
    });

    console.log(
      `[Backup] Sukses: ${result.backup.filename} (${result.backup.sizeBytes} bytes, SHA-256: ${result.backup.sha256.slice(0, 12)}...)`
    );
    console.log(
      `[Restore Check] Lulus PRAGMA integrity_check='${result.verification.integrityCheck}' (${result.verification.totalRows} baris terverifikasi dalam ${result.verification.durationMs}ms)`
    );
    if (result.retention.deletedCount > 0) {
      console.log(
        `[Retensi] Membersihkan ${result.retention.deletedCount} backup > ${args.retentionDays} hari: ${result.retention.deletedFiles.join(', ')}`
      );
    } else {
      console.log(
        `[Retensi] Tidak ada arsip kedaluwarsa (tersimpan: ${result.retention.remainingCount} snapshot).`
      );
    }
  } finally {
    await closeSqliteDb(liveDb);
  }
}

run().catch((err) => {
  console.error('[Backup Error]', err?.message || err);
  process.exit(1);
});

