const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');

try {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
} catch {
  // Abaikan bila dijalankan di lingkungan minimal tanpa .env lokal (misal container Docker)
}

const { createTelegramService } = require('../src/services/telegramService');
const { recordAuditLog } = require('../src/services/auditService');
const {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  getBackupKind,
  openSqliteDb,
  closeSqliteDb,
  createOnlineBackup,
  createUploadsBackup,
  verifyBackupFile,
  verifyUploadsBackupFile,
  listBackups,
  notifyAdminsBackupStatus,
} = require('../src/services/backupService');

function parseArgs(argv) {
  const args = {
    verifyOnly: false,
    skipUploads: false,
    noNotify: false,
    targetFile: null,
    triggerLabel: 'Cron QNAP / CLI',
    retentionDays: DEFAULT_RETENTION_DAYS,
    minRetained: DEFAULT_MIN_RETAINED_BACKUPS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--verify-only') {
      args.verifyOnly = true;
    } else if (token === '--skip-uploads') {
      args.skipUploads = true;
    } else if (token === '--no-notify') {
      args.noNotify = true;
    } else if (token === '--trigger' && argv[i + 1]) {
      args.triggerLabel = argv[i + 1];
      i += 1;
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

async function runVerifyOnly(args, backupsDir) {
  if (args.targetFile) {
    const basename = path.basename(args.targetFile);
    const kind = getBackupKind(basename);
    if (!kind) {
      throw new Error(`Nama file backup tidak valid: ${args.targetFile}`);
    }
    const targetPath = path.isAbsolute(args.targetFile)
      ? args.targetFile
      : path.join(backupsDir, args.targetFile);

    console.log(`[Restore Check] Menguji integritas salinan terisolasi (${kind}): ${path.basename(targetPath)}`);
    const report =
      kind === 'uploads'
        ? await verifyUploadsBackupFile(targetPath)
        : await verifyBackupFile(targetPath);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const sqliteBackups = listBackups(backupsDir, 'sqlite');
  if (sqliteBackups.length === 0) {
    throw new Error(`Tidak ada snapshot database di ${backupsDir}`);
  }

  const latestSqlitePath = path.join(backupsDir, sqliteBackups[0].filename);
  console.log(`[Restore Check] Menguji integritas database: ${sqliteBackups[0].filename}`);
  const dbReport = await verifyBackupFile(latestSqlitePath);
  const reports = { database: dbReport };

  const uploadsBackups = listBackups(backupsDir, 'uploads');
  if (uploadsBackups.length > 0) {
    const latestUploadsPath = path.join(backupsDir, uploadsBackups[0].filename);
    console.log(`[Restore Check] Menguji integritas arsip uploads: ${uploadsBackups[0].filename}`);
    reports.uploads = await verifyUploadsBackupFile(latestUploadsPath);
  }

  console.log(JSON.stringify(reports, null, 2));
  if (!dbReport.ok || (reports.uploads && !reports.uploads.ok)) {
    process.exitCode = 1;
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const backendDir = path.resolve(__dirname, '..');
  const projectRoot = path.resolve(backendDir, '..');
  const dbPath = path.resolve(process.env.DB_PATH || path.join(backendDir, 'database.sqlite'));
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(backendDir, 'uploads'));
  const backupsDir = path.resolve(process.env.BACKUPS_DIR || path.join(projectRoot, 'backups'));

  if (args.verifyOnly) {
    await runVerifyOnly(args, backupsDir);
    return;
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database aktif tidak ditemukan pada ${dbPath}`);
  }

  let liveDb = null;
  let dbResult = null;
  let uploadsResult = null;
  let telegramService = null;

  try {
    liveDb = await openSqliteDb(dbPath);
    liveDb.configure('busyTimeout', 5000);
    telegramService = createTelegramService({ db: liveDb, bcrypt });

    console.log(`[Backup] Membuat snapshot online via SQLite VACUUM INTO dari ${dbPath}...`);
    dbResult = await createOnlineBackup(liveDb, {
      backupsDir,
      retentionDays: args.retentionDays,
      minRetainedBackups: args.minRetained,
    });

    console.log(
      `[Backup] Sukses: ${dbResult.backup.filename} (${dbResult.backup.sizeBytes} bytes, SHA-256: ${dbResult.backup.sha256.slice(0, 12)}...)`
    );
    console.log(
      `[Restore Check] Lulus PRAGMA integrity_check='${dbResult.verification.integrityCheck}' (${dbResult.verification.totalRows} baris terverifikasi dalam ${dbResult.verification.durationMs}ms)`
    );
    if (dbResult.retention.deletedCount > 0) {
      console.log(
        `[Retensi DB] Membersihkan ${dbResult.retention.deletedCount} snapshot > ${args.retentionDays} hari: ${dbResult.retention.deletedFiles.join(', ')}`
      );
    } else {
      console.log(
        `[Retensi DB] Tidak ada snapshot kedaluwarsa (tersimpan: ${dbResult.retention.remainingCount} snapshot).`
      );
    }

    if (!args.skipUploads) {
      const timestampLabel = dbResult.backup.filename
        .replace(/^database_backup_/, '')
        .replace(/\.sqlite$/, '');
      console.log(`[Backup Uploads] Mengarsipkan direktori ${uploadsDir} ke .tar.gz...`);
      uploadsResult = await createUploadsBackup({
        uploadsDir,
        backupsDir,
        retentionDays: args.retentionDays,
        minRetainedBackups: args.minRetained,
        timestampLabel,
      });
      console.log(
        `[Backup Uploads] Sukses: ${uploadsResult.backup.filename} (${uploadsResult.backup.sizeBytes} bytes, ${uploadsResult.verification.fileCount} file terverifikasi dalam ${uploadsResult.verification.durationMs}ms)`
      );
      if (uploadsResult.retention.deletedCount > 0) {
        console.log(
          `[Retensi Uploads] Membersihkan ${uploadsResult.retention.deletedCount} arsip > ${args.retentionDays} hari: ${uploadsResult.retention.deletedFiles.join(', ')}`
        );
      }
    }

    if (!args.noNotify && telegramService) {
      const notifySummary = await notifyAdminsBackupStatus(liveDb, telegramService.sendTelegramMessage, {
        ok: true,
        triggerLabel: args.triggerLabel,
        dbResult,
        uploadsResult,
      });
      console.log(
        `[Telegram] Laporan backup dikirim ke ${notifySummary.sentCount}/${notifySummary.targetAdmins} admin terhubung.`
      );
    }

    await recordAuditLog(liveDb, {
      category: 'BACKUP',
      action: 'BACKUP_RUN_CLI',
      severity: 'info',
      actorUsername: 'system-cron',
      actorRole: 'Automation',
      targetType: 'backup',
      targetId: dbResult.backup.filename,
      summary: `Backup otomatis (${args.triggerLabel}) sukses: ${dbResult.backup.filename}${uploadsResult ? ` + ${uploadsResult.backup.filename}` : ''}`,
    });
  } catch (err) {
    if (liveDb) {
      await recordAuditLog(liveDb, {
        category: 'BACKUP',
        action: 'BACKUP_RUN_CLI_FAILED',
        severity: 'critical',
        actorUsername: 'system-cron',
        actorRole: 'Automation',
        targetType: 'backup',
        summary: `Backup otomatis (${args.triggerLabel}) GAGAL: ${err?.message || 'Error'}`,
      });
    }
    if (liveDb && !args.noNotify && telegramService) {
      await notifyAdminsBackupStatus(liveDb, telegramService.sendTelegramMessage, {
        ok: false,
        triggerLabel: args.triggerLabel,
        dbResult,
        uploadsResult,
        errorMessage: err?.message,
      }).catch(() => {});
    }
    throw err;
  } finally {
    await closeSqliteDb(liveDb);
  }
}

run().catch((err) => {
  console.error('[Backup Error]', err?.message || err);
  process.exit(1);
});

