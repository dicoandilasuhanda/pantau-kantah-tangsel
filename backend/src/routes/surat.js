const express = require('express');
const fs = require('fs');
const path = require('path');
const { getClientIp, verifyQRCodeToken } = require('../utils/networkAndQr');
const { recordAuditLog, buildActorFromRequest } = require('../services/auditService');

/**
 * Router untuk pelacakan Surat Masuk (/api/surat/*).
 */
function createSuratRouter({
  db,
  jwt,
  jwtSecret,
  uploadDir,
  authenticateJWT,
  requireAdmin,
  handlePdfUpload,
  validateBody,
  schemas,
  sendTelegramMessage,
}) {
  const router = express.Router();

  // Create new surat
  router.post(
    '/',
    authenticateJWT,
    handlePdfUpload,
    validateBody(schemas.createSuratSchema),
    (req, res) => {
      const { asal_surat, nomor_surat, tanggal_diterima, perihal } = req.body;
      const filePath = req.file ? `/uploads/surat/${req.file.filename}` : null;
      const initialLocation = 'Petugas Entry Surat';
      const fullName = req.user.full_name || req.user.username;
      const roleUsed =
        req.user.role && req.user.role.includes('Petugas Entry Surat')
          ? 'Petugas Entry Surat'
          : req.user.role || 'Petugas Entry Surat';
      const scannedBy = `${fullName} (${roleUsed})`;
      const clientIp = getClientIp(req);

      db.get(
        'SELECT COALESCE(MAX(CAST(nomor_agenda AS INTEGER)), 0) + 1 AS next_agenda FROM surat',
        (err, row) => {
          if (err) return res.status(500).json({ error: 'Gagal mengambil nomor agenda surat.' });
          const nextAgendaNumber = row ? row.next_agenda : 1;
          const nomorAgendaStr = nextAgendaNumber.toString().padStart(5, '0');
          const suratIdentifier = `SURAT-${nomorAgendaStr}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const qr_code = jwt.sign(
            { suratIdentifier, nomor_agenda: nomorAgendaStr },
            jwtSecret
          );

          db.run(
            `INSERT INTO surat (nomor_agenda, asal_surat, nomor_surat, tanggal_diterima, perihal, file_path, current_location, client_ip, qr_code) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              nomorAgendaStr,
              asal_surat,
              nomor_surat,
              tanggal_diterima,
              perihal,
              filePath,
              initialLocation,
              clientIp,
              qr_code,
            ],
            function (err2) {
              if (err2) return res.status(500).json({ error: err2.message });
              const suratId = this.lastID;
              db.run(
                `INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
                [suratId, scannedBy, req.user.username, initialLocation, clientIp],
                () => {
                  res.json({
                    id: suratId,
                    nomor_agenda: nomorAgendaStr,
                    qr_code,
                    current_location: initialLocation,
                    client_ip: clientIp,
                    message: 'Surat berhasil ditambahkan',
                  });
                }
              );
            }
          );
        }
      );
    }
  );

  // Get all surat
  router.get('/', authenticateJWT, (req, res) => {
    const query = `
      SELECT s.*,
             u_to.full_name as transit_to_fullname,
             u_by.full_name as transit_by_fullname,
             COALESCE(s.current_location, 'Petugas Entry Surat') as current_location,
             (SELECT scanned_at FROM surat_history sh WHERE sh.surat_id = s.id ORDER BY scanned_at DESC, id DESC LIMIT 1) as updated_at,
             (SELECT scanned_by_username FROM surat_history sh WHERE sh.surat_id = s.id ORDER BY scanned_at DESC, id DESC LIMIT 1) as latest_scanned_by_username,
             (SELECT scanned_by_role FROM surat_history sh WHERE sh.surat_id = s.id ORDER BY scanned_at DESC, id DESC LIMIT 1) as latest_scan_info,
             COALESCE(s.client_ip, (SELECT scanned_ip FROM surat_history sh WHERE sh.surat_id = s.id AND scanned_ip IS NOT NULL AND scanned_ip != 'Unknown' AND scanned_ip != '' ORDER BY id ASC LIMIT 1)) as client_ip
      FROM surat s
      LEFT JOIN users u_to ON s.transit_to_username = u_to.username
      LEFT JOIN users u_by ON s.transit_by_username = u_by.username
      ORDER BY s.id DESC
    `;
    db.all(query, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Scan / Terima / Selesaikan Surat
  router.post('/scan', authenticateJWT, validateBody(schemas.scanSuratSchema), (req, res) => {
    const { id, nomor_agenda, qr_code, isFinishing, selected_role, catatan } = req.body;
    const fullName = req.user.full_name || req.user.username;
    const userRoles = (req.user.role || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const roleUsed =
      selected_role && userRoles.includes(selected_role)
        ? selected_role
        : userRoles[0] || 'Petugas';
    const scannedBy = `${fullName} (${roleUsed})`;
    const clientIp = getClientIp(req);

    let whereClause = 'id = ?';
    let paramVal = [id];

    if (!id) {
      if (qr_code) {
        let extractedAgenda = null;
        try {
          const verified = verifyQRCodeToken(qr_code, { jwt, jwtSecret });
          if (verified && verified.nomor_agenda) {
            extractedAgenda = verified.nomor_agenda;
          }
        } catch {
          // legacy qr_code or non-jwt
        }
        if (extractedAgenda) {
          whereClause = 'qr_code = ? OR LOWER(nomor_agenda) = LOWER(?)';
          paramVal = [qr_code, extractedAgenda];
        } else {
          whereClause = 'qr_code = ?';
          paramVal = [qr_code];
        }
      } else {
        whereClause = 'LOWER(nomor_agenda) = LOWER(?)';
        paramVal = [String(nomor_agenda || '').trim().padStart(5, '0')];
      }
    }

    db.get(`SELECT * FROM surat WHERE ${whereClause}`, paramVal, (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan dalam sistem.' });

      if (surat.current_location === 'Selesai' || surat.current_location === 'Ditutup') {
        return res.status(400).json({
          error: `Surat ini sudah berstatus ${surat.current_location} dan tidak dapat diproses lagi.`,
        });
      }

      const isAdmin = userRoles.includes('Administrator');
      if (
        surat.is_transit === 1 &&
        surat.transit_to_username &&
        req.user.username !== surat.transit_to_username &&
        !isAdmin
      ) {
        return res.status(403).json({
          error: `Surat ini sedang dikirim ke meja petugas lain (${surat.transit_to_username}). Hanya petugas tersebut yang bisa memindai terima.`,
        });
      }

      const newLocation = isFinishing ? 'Selesai' : roleUsed;
      const historyLocation = isFinishing ? `Selesai (${roleUsed})` : roleUsed;

      let updatedCatatan = surat.catatan || '';
      if (catatan && catatan.trim()) {
        const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const noteLine = `[${ts} - ${fullName}]: ${catatan.trim()}`;
        updatedCatatan = updatedCatatan ? `${updatedCatatan}\n${noteLine}` : noteLine;
      }

      db.run(
        `UPDATE surat SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?`,
        [newLocation, updatedCatatan, surat.id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.run(
            `INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
            [surat.id, scannedBy, req.user.username, historyLocation, clientIp],
            (histErr) => {
              if (histErr) return res.status(500).json({ error: histErr.message });

              db.all(
                `SELECT * FROM surat_history WHERE surat_id = ? ORDER BY scanned_at DESC, id DESC`,
                [surat.id],
                (hErr, historyRows) => {
                  res.json({
                    message: isFinishing
                      ? `Surat Agenda ${surat.nomor_agenda} berhasil diselesaikan!`
                      : `Surat Agenda ${surat.nomor_agenda} diterima oleh ${fullName} (${roleUsed})`,
                    current_location: newLocation,
                    surat: {
                      ...surat,
                      current_location: newLocation,
                      catatan: updatedCatatan,
                      is_transit: 0,
                      transit_to_username: null,
                      transit_by_username: null,
                      transit_at: null,
                      latest_scan_info: scannedBy,
                      history: historyRows || [],
                    },
                  });
                }
              );
            }
          );
        }
      );
    });
  });

  // Endpoint aman untuk streaming/download dokumen surat (hanya untuk pengguna yang login)
  router.get('/file/:filename', (req, res) => {
    const token =
      req.query.token ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) {
      return res
        .status(401)
        .send('Akses Ditolak: Anda harus login untuk mengakses dokumen surat ini.');
    }

    jwt.verify(token, jwtSecret, (err) => {
      if (err) {
        return res
          .status(403)
          .send('Akses Ditolak: Sesi token tidak valid atau telah berakhir.');
      }

      const filename = path.basename(req.params.filename); // sanitasi path traversal
      const safeFilePath = path.join(uploadDir, filename);

      if (!fs.existsSync(safeFilePath)) {
        return res.status(404).send('File dokumen tidak ditemukan.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.sendFile(safeFilePath);
    });
  });

  // Admin: Selesaikan Surat Manual
  router.put('/:id/complete', authenticateJWT, requireAdmin, (req, res) => {
    const suratId = req.params.id;
    const fullName = req.user.full_name || req.user.username;
    const scannedBy = `${fullName} (Administrator)`;
    const clientIp = getClientIp(req);

    db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

      db.run(
        'UPDATE surat SET current_location = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
        ['Selesai', suratId],
        (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          db.run(
            `INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
            [suratId, scannedBy, req.user.username, 'Selesai (Oleh Admin)', clientIp],
            () => {
              recordAuditLog(db, {
                category: 'SURAT',
                action: 'SURAT_COMPLETED',
                severity: 'info',
                ...buildActorFromRequest(req),
                targetType: 'surat',
                targetId: `#${surat.nomor_agenda}`,
                summary: `Menyelesaikan Surat Agenda #${surat.nomor_agenda} (${surat.asal_surat || '-'}) secara manual`,
              });
              res.json({
                message: `Surat Agenda ${surat.nomor_agenda} berhasil diselesaikan.`,
              });
            }
          );
        }
      );
    });
  });

  // Admin: Tutup / Arsipkan Surat dengan Alasan
  router.put('/:id/close', authenticateJWT, requireAdmin, (req, res) => {
    const suratId = req.params.id;
    const { alasan } = req.body;
    if (!alasan || !alasan.trim()) {
      return res.status(400).json({ error: 'Alasan penutupan/pengarsipan surat wajib diisi.' });
    }

    const fullName = req.user.full_name || req.user.username;
    const scannedBy = `${fullName} (Administrator)`;
    const clientIp = getClientIp(req);

    db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const closeNote = `-- Surat ditutup/diarsipkan oleh ${fullName} pada ${timestamp}:\nAlasan: ${alasan.trim()}`;
      const finalCatatan = surat.catatan ? `${surat.catatan}\n\n${closeNote}` : closeNote;

      db.run(
        'UPDATE surat SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
        ['Ditutup', finalCatatan, suratId],
        (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          db.run(
            `INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
            [suratId, scannedBy, req.user.username, 'Ditutup (Oleh Admin)', clientIp],
            () => {
              recordAuditLog(db, {
                category: 'SURAT',
                action: 'SURAT_CLOSED',
                severity: 'warning',
                ...buildActorFromRequest(req),
                targetType: 'surat',
                targetId: `#${surat.nomor_agenda}`,
                summary: `Menutup/mengarsipkan Surat Agenda #${surat.nomor_agenda} (Alasan: ${alasan.trim()})`,
              });
              res.json({
                message: `Surat Agenda ${surat.nomor_agenda} berhasil ditutup/diarsipkan.`,
                catatan: finalCatatan,
              });
            }
          );
        }
      );
    });
  });

  // Admin: Hapus Surat Permanen
  router.delete('/:id', authenticateJWT, requireAdmin, (req, res) => {
    const suratId = req.params.id;
    db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

      db.run('DELETE FROM surat_disposisi WHERE surat_id = ?', [suratId], () => {
        db.run('DELETE FROM surat_history WHERE surat_id = ?', [suratId], (hErr) => {
          if (hErr) return res.status(500).json({ error: hErr.message });
          db.run('DELETE FROM surat WHERE id = ?', [suratId], (dErr) => {
            if (dErr) return res.status(500).json({ error: dErr.message });
            recordAuditLog(db, {
              category: 'SURAT',
              action: 'SURAT_DELETED',
              severity: 'critical',
              ...buildActorFromRequest(req),
              targetType: 'surat',
              targetId: `#${surat.nomor_agenda}`,
              summary: `Menghapus permanen Surat Agenda #${surat.nomor_agenda} (${surat.nomor_surat || '-'})`,
            });
            res.json({ message: `Surat Agenda ${surat.nomor_agenda} berhasil dihapus.` });
          });
        });
      });
    });
  });

  // Get surat detail & history
  router.get('/:id', authenticateJWT, (req, res) => {
    const param = req.params.id;
    const isNumeric = /^\d+$/.test(param);
    const whereClause = isNumeric ? 's.id = ?' : 's.qr_code = ? OR s.nomor_agenda = ?';
    const paramVal = isNumeric ? [param] : [param, param];

    const query = `
      SELECT s.*,
             u_to.full_name as transit_to_fullname,
             u_by.full_name as transit_by_fullname
      FROM surat s
      LEFT JOIN users u_to ON s.transit_to_username = u_to.username
      LEFT JOIN users u_by ON s.transit_by_username = u_by.username
      WHERE ${whereClause}
    `;
    db.get(query, paramVal, (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Surat tidak ditemukan' });
      db.all(
        'SELECT * FROM surat_history WHERE surat_id = ? ORDER BY scanned_at DESC, id DESC',
        [row.id],
        (hErr, history) => {
          res.json({
            ...row,
            current_location: row.current_location || 'Petugas Entry Surat',
            client_ip: getClientIp(req),
            history: history || [],
          });
        }
      );
    });
  });

  // Update catatan surat
  router.put('/:id/note', authenticateJWT, validateBody(schemas.noteSchema), (req, res) => {
    const suratId = req.params.id;
    const { catatan } = req.body;

    db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

      let finalCatatan = catatan;
      if (catatan && catatan !== surat.catatan) {
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const fullName = req.user.full_name || req.user.username;
        const cleanCatatan = catatan.replace(/\n\n-- Terakhir diubah oleh.*?$/s, '');
        finalCatatan =
          cleanCatatan + `\n\n-- Terakhir diubah oleh ${fullName} pada ${timestamp}`;
      }

      db.run('UPDATE surat SET catatan = ? WHERE id = ?', [finalCatatan, suratId], (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ message: 'Catatan surat berhasil disimpan', catatan: finalCatatan });
      });
    });
  });

  // Kirim Surat (Transit)
  router.post(
    '/:id/transit',
    authenticateJWT,
    validateBody(schemas.transitTargetSchema),
    (req, res) => {
      const suratId = req.params.id;
      const { target_username } = req.body;
      if (!target_username)
        return res.status(400).json({ error: 'Pilih petugas tujuan terlebih dahulu.' });

      db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

        db.get(
          'SELECT full_name, telegram_chat_id FROM users WHERE username = ?',
          [target_username],
          (userErr, targetUser) => {
            const targetFullName =
              targetUser && targetUser.full_name ? targetUser.full_name : target_username;
            const senderFullName = req.user.full_name || req.user.username;
            const scannedBy = `${senderFullName} (${req.user.role})`;
            const clientIp = getClientIp(req);
            const transitLocation = `Dikirim (Transit) ke ${targetFullName}`;

            db.run(
              'UPDATE surat SET is_transit = 1, transit_to_username = ?, transit_by_username = ?, transit_at = CURRENT_TIMESTAMP WHERE id = ?',
              [target_username, req.user.username, suratId],
              function (uErr) {
                if (uErr) return res.status(500).json({ error: uErr.message });

                db.run(
                  'INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
                  [suratId, scannedBy, req.user.username, transitLocation, clientIp],
                  function (hErr) {
                    if (hErr) console.error('Error inserting surat transit history:', hErr);

                    if (targetUser && targetUser.telegram_chat_id) {
                      const waktuWib = new Date().toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                      });
                      const tgMsg =
                        `<b>SURAT KIRIMAN MASUK (TRANSIT)</b>\n\n` +
                        `Halo <b>${targetFullName}</b>, ada surat masuk yang sedang dikirim menuju meja Anda:\n\n` +
                        `No. Agenda: <b>${surat.nomor_agenda}</b>\n` +
                        `Asal Surat: <b>${surat.asal_surat || '-'}</b>\n` +
                        `No. Surat: <b>${surat.nomor_surat || '-'}</b>\n` +
                        `Perihal: <b>${surat.perihal || '-'}</b>\n` +
                        `Dikirim Oleh: <b>${senderFullName}</b> (${req.user.role})\n` +
                        `Waktu Kirim: ${waktuWib} WIB\n\n` +
                        `<i>Silakan buka aplikasi Pantau.Kantah Tangsel dan lakukan <b>Scan QR Surat</b> saat surat fisik tiba di meja Anda.</i>`;
                      sendTelegramMessage(targetUser.telegram_chat_id, tgMsg);
                    }

                    res.json({ message: 'Surat berhasil dikirim (Transit).' });
                  }
                );
              }
            );
          }
        );
      });
    }
  );

  // Batal Kirim Surat (Cancel Transit)
  router.post('/:id/cancel-transit', authenticateJWT, (req, res) => {
    const suratId = req.params.id;

    db.get('SELECT * FROM surat WHERE id = ?', [suratId], (err, surat) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!surat) return res.status(404).json({ error: 'Surat tidak ditemukan' });

      const prevTarget = surat.transit_to_username;
      db.get(
        'SELECT full_name, telegram_chat_id FROM users WHERE username = ?',
        [prevTarget],
        (userErr, targetUser) => {
          const senderFullName = req.user.full_name || req.user.username;
          const scannedBy = `${senderFullName} (${req.user.role})`;
          const clientIp = getClientIp(req);
          const cancelLocation = `Pengiriman Dibatalkan oleh ${senderFullName}`;

          db.run(
            'UPDATE surat SET is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
            [suratId],
            function (uErr) {
              if (uErr) return res.status(500).json({ error: uErr.message });

              db.run(
                'INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
                [suratId, scannedBy, req.user.username, cancelLocation, clientIp],
                function (hErr) {
                  if (hErr) console.error('Error inserting cancel transit history:', hErr);

                  if (targetUser && targetUser.telegram_chat_id) {
                    const tgCancelMsg =
                      `<b>PENGIRIMAN SURAT DIBATALKAN</b>\n\n` +
                      `Pengiriman surat No. Agenda <b>${surat.nomor_agenda}</b> (${surat.asal_surat || '-'}) menuju meja Anda telah dibatalkan oleh pengirim (<b>${senderFullName}</b>).`;
                    sendTelegramMessage(targetUser.telegram_chat_id, tgCancelMsg);
                  }

                  res.json({ message: 'Pengiriman surat berhasil dibatalkan.' });
                }
              );
            }
          );
        }
      );
    });
  });

  // GET Disposisi Surat
  router.get('/:id/disposisi', authenticateJWT, (req, res) => {
    db.all(
      'SELECT * FROM surat_disposisi WHERE surat_id = ? ORDER BY dibuat_pada DESC, id DESC',
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Gagal mengambil disposisi surat' });
        res.json(rows || []);
      }
    );
  });

  // POST Disposisi Surat
  router.post(
    '/:id/disposisi',
    authenticateJWT,
    validateBody(schemas.disposisiSchema),
    (req, res) => {
      const isPimpinan =
        req.user.role.includes('Koordinator') ||
        req.user.role.includes('Kepala Seksi') ||
        req.user.role.includes('Administrator');
      if (!isPimpinan) {
        return res
          .status(403)
          .json({ error: 'Akses ditolak. Hanya pimpinan yang dapat membuat disposisi.' });
      }
      const { isi_disposisi } = req.body;
      if (!isi_disposisi || !isi_disposisi.trim()) {
        return res.status(400).json({ error: 'Isi disposisi tidak boleh kosong' });
      }
      const fullName = req.user.full_name || req.user.username;
      db.run(
        `INSERT INTO surat_disposisi (surat_id, isi_disposisi, dibuat_oleh) VALUES (?, ?, ?)`,
        [req.params.id, isi_disposisi.trim(), fullName],
        function (err) {
          if (err) return res.status(500).json({ error: 'Gagal menyimpan disposisi surat' });
          res.json({ message: 'Disposisi surat berhasil ditambahkan', id: this.lastID });
        }
      );
    }
  );

  return router;
}

/**
 * Router untuk menyelesaikan disposisi surat (/api/surat-disposisi/:id/selesai).
 */
function createSuratDisposisiRouter({ db, authenticateJWT }) {
  const router = express.Router();

  router.put('/:id/selesai', authenticateJWT, (req, res) => {
    const fullName = req.user.full_name || req.user.username;
    db.run(
      `UPDATE surat_disposisi SET status = 'Sudah Dilaksanakan', dilaksanakan_oleh = ?, dilaksanakan_pada = CURRENT_TIMESTAMP WHERE id = ?`,
      [fullName, req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Gagal mengupdate disposisi surat' });
        res.json({ message: 'Disposisi surat telah ditandai selesai' });
      }
    );
  });

  return router;
}

module.exports = {
  createSuratRouter,
  createSuratDisposisiRouter,
};

