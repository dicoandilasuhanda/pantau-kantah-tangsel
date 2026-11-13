const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_RETAINED_BACKUPS,
  isValidBackupFilename,
  listBackups,
  readBackupLogTail,
  verifyBackupFile,
  createOnlineBackup,
} = require('../services/backupService');

/**
 * Router Admin untuk manajemen backup SQLite zero-downtime (`VACUUM INTO`),
 * simulasi verifikasi restore terisolasi, serta unduhan snapshot `.sqlite`.
 */
function createBackupsRouter({
  db,
  backupsDir,
  authenticateJWT,
  requireAdmin,
  validateBody,
  schemas,
}) {
  const router = express.Router();
  let backupInProgress = false;

  router.get('/', authenticateJWT, requireAdmin, (req, res) => {
    try {
      const backups = listBackups(backupsDir);
      const recentLogLines = readBackupLogTail(backupsDir, 25);
      res.json({
        engine: 'SQLite VACUUM INTO + PRAGMA integrity_check',
        retentionDays: DEFAULT_RETENTION_DAYS,
        minRetainedBackups: DEFAULT_MIN_RETAINED_BACKUPS,
        backups,
        recentLogLines,
      });
    } catch (err) {
      res.status(500).json({ error: 'Gagal membaca daftar backup: ' + err.message });
    }
  });

  router.post('/run', authenticateJWT, requireAdmin, async (req, res) => {
    if (backupInProgress) {
      return res.status(409).json({ error: 'Proses backup lain sedang berjalan. Silakan tunggu sebentar.' });
    }

    backupInProgress = true;
    try {
      const result = await createOnlineBackup(db, { backupsDir });
      res.status(201).json({
        message: 'Backup database berhasil dibuat dan lolos uji integritas restore.',
        ...result,
      });
    } catch (err) {
      res.status(500).json({ error: 'Gagal membuat backup database: ' + err.message });
    } finally {
      backupInProgress = false;
    }
  });

  router.post(
    '/verify',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.verifyBackupSchema),
    async (req, res) => {
      const { filename } = req.body;
      if (!isValidBackupFilename(filename)) {
        return res.status(400).json({ error: 'Nama berkas backup tidak valid.' });
      }

      const targetPath = path.join(backupsDir, filename);
      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ error: 'Berkas backup tidak ditemukan.' });
      }

      try {
        const verification = await verifyBackupFile(targetPath);
        if (!verification.ok) {
          return res.status(422).json({
            ok: false,
            error: verification.error || 'Uji integritas restore gagal.',
            verification,
          });
        }
        res.json({
          ok: true,
          message: 'Simulasi restore berhasil dan integritas 9 tabel SQLite terverifikasi.',
          verification,
        });
      } catch (err) {
        res.status(500).json({ error: 'Gagal memverifikasi backup: ' + err.message });
      }
    }
  );

  router.get('/:filename/download', authenticateJWT, requireAdmin, (req, res) => {
    const { filename } = req.params;
    if (!isValidBackupFilename(filename)) {
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

