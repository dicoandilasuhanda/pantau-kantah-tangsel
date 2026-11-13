const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  getBackupKind,
  listBackups,
  readBackupLogTail,
  verifyBackupFile,
  verifyUploadsBackupFile,
  createOnlineBackup,
  createUploadsBackup,
  notifyAdminsBackupStatus,
} = require('../services/backupService');

/**
 * Router Admin untuk manajemen backup SQLite zero-downtime (`VACUUM INTO`),
 * pengarsipan berkas `uploads/` (`.tar.gz`), uji integritas, unduhan arsip,
 * serta notifikasi laporan backup ke Telegram Administrator.
 */
function createBackupsRouter({
  db,
  backupsDir,
  uploadsDir,
  authenticateJWT,
  requireAdmin,
  validateBody,
  schemas,
  sendTelegramMessage,
}) {
  const router = express.Router();
  let backupInProgress = false;

  router.get('/', authenticateJWT, requireAdmin, (req, res) => {
    try {
      const backups = listBackups(backupsDir, 'sqlite');
      const uploadsBackups = listBackups(backupsDir, 'uploads');
      const allArchives = listBackups(backupsDir, 'all');
      const recentLogLines = readBackupLogTail(backupsDir, 25);
      res.json({
        engine: 'SQLite VACUUM INTO + PRAGMA integrity_check + Tar-Gzip Uploads',
        retentionDays: DEFAULT_RETENTION_DAYS,
        minRetainedBackups: DEFAULT_MIN_RETAINED_BACKUPS,
        backups,
        uploadsBackups,
        allArchives,
        recentLogLines,
      });
    } catch (err) {
      res.status(500).json({ error: 'Gagal membaca daftar backup: ' + err.message });
    }
  });

  router.post(
    '/run',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.runBackupSchema),
    async (req, res) => {
      if (backupInProgress) {
        return res.status(409).json({ error: 'Proses backup lain sedang berjalan. Silakan tunggu sebentar.' });
      }

      backupInProgress = true;
      const includeUploads = req.body?.includeUploads !== false && Boolean(uploadsDir);
      let dbResult = null;
      let uploadsResult = null;

      try {
        dbResult = await createOnlineBackup(db, { backupsDir });
        if (includeUploads) {
          const timestampLabel = dbResult.backup.filename
            .replace(/^database_backup_/, '')
            .replace(/\.sqlite$/, '');
          uploadsResult = await createUploadsBackup({
            uploadsDir,
            backupsDir,
            timestampLabel,
          });
        }

        const telegramNotification = await notifyAdminsBackupStatus(db, sendTelegramMessage, {
          ok: true,
          triggerLabel: 'Panel Admin',
          actorUsername: req.user?.username || null,
          dbResult,
          uploadsResult,
        });

        res.status(201).json({
          message: uploadsResult
            ? 'Backup database SQLite & arsip uploads berhasil dibuat dan lolos uji integritas.'
            : 'Backup database berhasil dibuat dan lolos uji integritas restore.',
          ...dbResult,
          uploadsBackup: uploadsResult?.backup || null,
          uploadsVerification: uploadsResult?.verification || null,
          uploadsRetention: uploadsResult?.retention || null,
          telegramNotification,
        });
      } catch (err) {
        await notifyAdminsBackupStatus(db, sendTelegramMessage, {
          ok: false,
          triggerLabel: 'Panel Admin',
          actorUsername: req.user?.username || null,
          dbResult,
          uploadsResult,
          errorMessage: err?.message,
        }).catch(() => {});
        res.status(500).json({ error: 'Gagal membuat backup sistem: ' + err.message });
      } finally {
        backupInProgress = false;
      }
    }
  );

  router.post(
    '/verify',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.verifyBackupSchema),
    async (req, res) => {
      const { filename } = req.body;
      const kind = getBackupKind(filename);
      if (!kind) {
        return res.status(400).json({ error: 'Nama berkas backup tidak valid.' });
      }

      const targetPath = path.join(backupsDir, filename);
      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ error: 'Berkas backup tidak ditemukan.' });
      }

      try {
        const verification =
          kind === 'uploads'
            ? await verifyUploadsBackupFile(targetPath)
            : await verifyBackupFile(targetPath);
        if (!verification.ok) {
          return res.status(422).json({
            ok: false,
            error: verification.error || 'Uji integritas arsip gagal.',
            verification,
          });
        }
        res.json({
          ok: true,
          message:
            kind === 'uploads'
              ? `Keutuhan arsip uploads terverifikasi (${verification.fileCount} file).`
              : 'Simulasi restore berhasil dan integritas 9 tabel SQLite terverifikasi.',
          verification,
        });
      } catch (err) {
        res.status(500).json({ error: 'Gagal memverifikasi backup: ' + err.message });
      }
    }
  );

  router.get('/:filename/download', authenticateJWT, requireAdmin, (req, res) => {
    const { filename } = req.params;
    if (!getBackupKind(filename)) {
      return res.status(400).json({ error: 'Nama berkas backup tidak valid.' });
    }

    const targetPath = path.join(backupsDir, filename);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Berkas backup tidak ditemukan.' });
    }

    return res.download(targetPath, filename);
  });

  return router;
}

module.exports = {
  createBackupsRouter,
};

