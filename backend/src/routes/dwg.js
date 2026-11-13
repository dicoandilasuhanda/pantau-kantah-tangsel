const express = require('express');
const fs = require('fs');
const path = require('path');

function cleanupUploadedDwg(dwgDir, fileName) {
  if (!fileName) return;
  const uploadedPath = path.join(dwgDir, fileName);
  if (fs.existsSync(uploadedPath)) {
    try {
      fs.unlinkSync(uploadedPath);
    } catch (_) {}
  }
}

function sendDwgTransferRecords({
  db,
  req,
  recipient,
  fileMeta,
  notes,
  sendTelegramMessage,
  successMessage,
  res,
}) {
  const now = new Date().toISOString();
  const insertSql =
    'INSERT INTO user_dwg_files (user_id, sender_id, recipient_id, original_name, file_name, file_size, notes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

  // Record 1: Inbox penerima
  db.run(
    insertSql,
    [
      recipient.id,
      req.user.id,
      recipient.id,
      fileMeta.originalName,
      fileMeta.fileName,
      fileMeta.fileSize,
      notes,
      now,
    ],
    function (err1) {
      if (err1) {
        return res.status(500).json({ error: 'Gagal mengirim berkas ke penerima.' });
      }

      // Record 2: Outbox pengirim
      db.run(
        insertSql,
        [
          req.user.id,
          req.user.id,
          recipient.id,
          fileMeta.originalName,
          fileMeta.fileName,
          fileMeta.fileSize,
          notes,
          now,
        ],
        function () {
          if (recipient.telegram_chat_id) {
            const senderName = req.user.full_name || req.user.username;
            const sizeText = (fileMeta.fileSize / (1024 * 1024)).toFixed(2) + ' MB';
            const tgMsg =
              `📥 <b>BERKAS DWG MASUK</b>\n\n` +
              `Halo <b>${recipient.full_name}</b>,\n` +
              `Anda menerima kiriman berkas AutoCAD (.dwg) baru:\n\n` +
              `📁 Berkas: <b>${fileMeta.originalName}</b> (${sizeText})\n` +
              `👤 Pengirim: <b>${senderName}</b> (${req.user.role})\n` +
              (notes ? `📝 Catatan: <i>${notes}</i>\n\n` : `\n`) +
              `<i>Buka menu <b>Profil</b> di web Pantau.Kantah Tangsel untuk mengunduh berkas.</i>`;
            sendTelegramMessage(recipient.telegram_chat_id, tgMsg);
          }

          res.json({
            message: successMessage,
            original_name: fileMeta.originalName,
            recipient_name: recipient.full_name,
          });
        }
      );
    }
  );
}

/**
 * Router untuk Penyimpanan & Pertukaran File DWG AutoCAD (/api/user/dwg/*).
 */
function createDwgRouter({
  db,
  dwgDir,
  authenticateJWT,
  requireDwgAccess,
  canAccessDwg,
  handleDwgUpload,
  sendTelegramMessage,
}) {
  const router = express.Router();

  // Get Eligible DWG Recipients (Petugas Ukur, ASK, Pemetaan, Admin)
  router.get('/recipients', authenticateJWT, requireDwgAccess, (req, res) => {
    const userRoles = String(req.user.role || '')
      .split(',')
      .map((r) => r.trim());
    const isASK = userRoles.includes('Asisten Surveyor Kadastral');
    const isPemetaan = userRoles.includes('Petugas Pemetaan');
    const isUkur = userRoles.includes('Petugas Ukur');
    const isAdmin = userRoles.includes('Administrator');

    let roleFilter = [];
    if (isAdmin) {
      roleFilter = ['%Petugas Pemetaan%', '%Asisten Surveyor Kadastral%', '%Petugas Ukur%'];
    } else {
      const targets = new Set();
      targets.add('%Administrator%');
      if (isUkur) {
        targets.add('%Petugas Pemetaan%');
        targets.add('%Asisten Surveyor Kadastral%');
      }
      if (isASK) {
        targets.add('%Petugas Pemetaan%');
        targets.add('%Petugas Ukur%');
      }
      if (isPemetaan) {
        targets.add('%Asisten Surveyor Kadastral%');
        targets.add('%Petugas Ukur%');
      }
      roleFilter = Array.from(targets);
    }

    const whereClauses = roleFilter.map(() => 'role LIKE ?').join(' OR ');
    const sql = `
      SELECT id, username, full_name, role 
      FROM users 
      WHERE id != ? AND (${whereClauses})
      ORDER BY full_name ASC
    `;

    db.all(sql, [req.user.id, ...roleFilter], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Gagal mengambil daftar penerima.' });
      res.json(rows || []);
    });
  });

  // Get User DWG Files List (Inbox, My Files, Sent)
  router.get('/', authenticateJWT, requireDwgAccess, (req, res) => {
    const sql = `
      SELECT 
        f.id,
        f.user_id,
        f.sender_id,
        f.recipient_id,
        f.original_name,
        f.file_name,
        f.file_size,
        f.notes,
        f.uploaded_at,
        s.full_name AS sender_name,
        s.role AS sender_role,
        s.username AS sender_username,
        r.full_name AS recipient_name,
        r.role AS recipient_role,
        r.username AS recipient_username
      FROM user_dwg_files f
      LEFT JOIN users s ON f.sender_id = s.id
      LEFT JOIN users r ON f.recipient_id = r.id
      WHERE f.user_id = ?
      ORDER BY f.uploaded_at DESC
    `;

    db.all(sql, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Gagal mengambil daftar file DWG' });
      res.json(rows || []);
    });
  });

  // Upload DWG File to Own Storage
  router.post('/', authenticateJWT, requireDwgAccess, handleDwgUpload, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File DWG tidak ditemukan.' });
    }

    const originalName = req.file.originalname;
    const fileName = req.file.filename;
    const fileSize = req.file.size;
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    db.run(
      'INSERT INTO user_dwg_files (user_id, sender_id, recipient_id, original_name, file_name, file_size, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, req.user.id, req.user.id, originalName, fileName, fileSize, notes],
      function (err) {
        if (err) {
          cleanupUploadedDwg(dwgDir, fileName);
          return res.status(500).json({ error: 'Gagal mencatat file DWG ke database.' });
        }

        res.json({
          id: this.lastID,
          original_name: originalName,
          file_name: fileName,
          file_size: fileSize,
          notes,
          uploaded_at: new Date().toISOString(),
          message: 'File DWG berhasil disimpan ke folder pribadi.',
        });
      }
    );
  });

  // Upload and Send DWG File Directly to Recipient
  router.post('/send', authenticateJWT, requireDwgAccess, handleDwgUpload, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File DWG tidak ditemukan.' });
    }

    const recipientId = parseInt(req.body.recipient_id, 10);
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    if (!recipientId || isNaN(recipientId)) {
      cleanupUploadedDwg(dwgDir, req.file.filename);
      return res.status(400).json({ error: 'Penerima berkas DWG wajib dipilih.' });
    }

    db.get(
      'SELECT id, username, full_name, role, telegram_chat_id FROM users WHERE id = ?',
      [recipientId],
      (err, recipient) => {
        if (err || !recipient) {
          cleanupUploadedDwg(dwgDir, req.file.filename);
          return res.status(400).json({ error: 'Penerima tidak ditemukan di sistem.' });
        }

        if (!canAccessDwg(recipient.role)) {
          cleanupUploadedDwg(dwgDir, req.file.filename);
          return res.status(400).json({ error: 'Penerima tidak memiliki hak akses berkas DWG.' });
        }

        sendDwgTransferRecords({
          db,
          req,
          recipient,
          fileMeta: {
            originalName: req.file.originalname,
            fileName: req.file.filename,
            fileSize: req.file.size,
          },
          notes,
          sendTelegramMessage,
          successMessage: `Berkas DWG berhasil dikirim kepada ${recipient.full_name}!`,
          res,
        });
      }
    );
  });

  // Forward/Send Existing DWG File to Recipient
  router.post('/:id/forward', authenticateJWT, requireDwgAccess, (req, res) => {
    const dwgId = req.params.id;
    const recipientId = parseInt(req.body.recipient_id, 10);
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    if (!recipientId || isNaN(recipientId)) {
      return res.status(400).json({ error: 'Penerima berkas DWG wajib dipilih.' });
    }

    db.get(
      'SELECT * FROM user_dwg_files WHERE id = ? AND user_id = ?',
      [dwgId, req.user.id],
      (err, fileRecord) => {
        if (err || !fileRecord) {
          return res
            .status(404)
            .json({ error: 'Berkas DWG tidak ditemukan di ruang penyimpanan Anda.' });
        }

        db.get(
          'SELECT id, username, full_name, role, telegram_chat_id FROM users WHERE id = ?',
          [recipientId],
          (err2, recipient) => {
            if (err2 || !recipient) {
              return res.status(400).json({ error: 'Penerima tidak ditemukan di sistem.' });
            }

            if (!canAccessDwg(recipient.role)) {
              return res
                .status(400)
                .json({ error: 'Penerima tidak memiliki hak akses berkas DWG.' });
            }

            sendDwgTransferRecords({
              db,
              req,
              recipient,
              fileMeta: {
                originalName: fileRecord.original_name,
                fileName: fileRecord.file_name,
                fileSize: fileRecord.file_size,
              },
              notes,
              sendTelegramMessage,
              successMessage: `Berkas DWG berhasil diteruskan kepada ${recipient.full_name}!`,
              res,
            });
          }
        );
      }
    );
  });

  // Download DWG File
  router.get('/:id/download', authenticateJWT, requireDwgAccess, (req, res) => {
    const dwgId = req.params.id;
    db.get(
      'SELECT * FROM user_dwg_files WHERE id = ? AND user_id = ?',
      [dwgId, req.user.id],
      (err, fileRecord) => {
        if (err) return res.status(500).json({ error: 'Gagal mencari file' });
        if (!fileRecord)
          return res.status(404).json({ error: 'File DWG tidak ditemukan atau bukan milik Anda' });

        const filePath = path.join(dwgDir, fileRecord.file_name);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Fisik file di server tidak ditemukan' });
        }

        res.download(filePath, fileRecord.original_name);
      }
    );
  });

  // Delete DWG File
  router.delete('/:id', authenticateJWT, requireDwgAccess, (req, res) => {
    const dwgId = req.params.id;
    db.get(
      'SELECT * FROM user_dwg_files WHERE id = ? AND user_id = ?',
      [dwgId, req.user.id],
      (err, fileRecord) => {
        if (err) return res.status(500).json({ error: 'Gagal mencari file' });
        if (!fileRecord)
          return res.status(404).json({ error: 'File tidak ditemukan atau bukan milik Anda' });

        const fileName = fileRecord.file_name;

        db.run(
          'DELETE FROM user_dwg_files WHERE id = ? AND user_id = ?',
          [dwgId, req.user.id],
          (delErr) => {
            if (delErr) return res.status(500).json({ error: 'Gagal menghapus file dari database' });

            // Periksa apakah masih ada record lain (pengirim atau penerima) yang merujuk file fisik ini
            db.get(
              'SELECT COUNT(*) AS cnt FROM user_dwg_files WHERE file_name = ?',
              [fileName],
              (cntErr, cntRow) => {
                if (!cntErr && cntRow && cntRow.cnt === 0) {
                  cleanupUploadedDwg(dwgDir, fileName);
                }
                res.json({ message: 'File DWG berhasil dihapus.' });
              }
            );
          }
        );
      }
    );
  });

  return router;
}

module.exports = {
  createDwgRouter,
};
