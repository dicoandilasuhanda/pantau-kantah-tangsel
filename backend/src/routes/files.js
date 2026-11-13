const express = require('express');
const { getClientIp, verifyQRCodeToken } = require('../utils/networkAndQr');
const { recordAuditLog, buildActorFromRequest } = require('../services/auditService');

/**
 * Router untuk Pelacakan Berkas Pertanahan (/api/files/*).
 */
function createFilesRouter({
  db,
  jwt,
  jwtSecret,
  authenticateJWT,
  requireAdmin,
  validateBody,
  schemas,
  getWorkingDays,
  validateFileEntryAccess,
  validateScanPreconditions,
  analyzeMultiRoleSelection,
  resolveScanTransition,
  sendTelegramMessage,
}) {
  const router = express.Router();

  // Create a new file entry (Only Petugas Entry Berkas should do this ideally)
  router.post('/', authenticateJWT, validateBody(schemas.createFileSchema), (req, res) => {
    const { nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, fullName } = req.body;
    const entryAccess = validateFileEntryAccess(req.user.role, nama_kegiatan);
    if (!entryAccess.ok) {
      return res.status(entryAccess.status).json({ error: entryAccess.error });
    }

    db.get(
      'SELECT id FROM files WHERE nomor_berkas = ? AND tahun_berkas = ?',
      [nomor_berkas, tahun_berkas],
      (checkErr, row) => {
        if (checkErr) {
          return res
            .status(500)
            .json({ error: 'Kesalahan database saat memeriksa duplikasi.' });
        }
        if (row) {
          return res.status(400).json({
            error: `Berkas dengan nomor ${nomor_berkas}/${tahun_berkas} sudah pernah didaftarkan!`,
          });
        }

        const fileIdentifier = 'FILE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const qr_code = jwt.sign({ fileIdentifier }, jwtSecret);
        const initial_location = entryAccess.initialLocation;
        const effectiveFullName = fullName || req.user.full_name;
        const scannedBy = effectiveFullName
          ? `${effectiveFullName} (${req.user.role})`
          : req.user.role;
        const clientIp = getClientIp(req);

        db.run(
          'INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location) VALUES (?, ?, ?, ?, ?, ?)',
          [qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, initial_location],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            const fileId = this.lastID;

            db.run(
              'INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
              [fileId, scannedBy, req.user.username, initial_location, clientIp],
              (historyErr) => {
                if (historyErr) console.error(historyErr);
                res.json({
                  id: fileId,
                  qr_code,
                  nomor_berkas,
                  tahun_berkas,
                  nama_kegiatan,
                  nama_pemohon,
                  current_location: initial_location,
                  client_ip: clientIp,
                });
              }
            );
          }
        );
      }
    );
  });

  // Get all files (Dashboard)
  router.get('/', authenticateJWT, (req, res) => {
    const query = `
      SELECT f.*, 
             u_to.full_name as transit_to_fullname,
             u_by.full_name as transit_by_fullname,
             (SELECT scanned_at FROM file_history fh WHERE fh.file_id = f.id ORDER BY scanned_at DESC LIMIT 1) as updated_at,
             (SELECT scanned_by_username FROM file_history fh WHERE fh.file_id = f.id ORDER BY scanned_at DESC LIMIT 1) as latest_scanned_by_username,
             (SELECT scanned_by_role FROM file_history fh WHERE fh.file_id = f.id ORDER BY scanned_at DESC LIMIT 1) as latest_scan_info,
             (SELECT COUNT(*) FROM file_history fh WHERE fh.file_id = f.id AND fh.location = 'Loket Pendaftaran (Entry)') as loket_entry_count
      FROM files f 
      LEFT JOIN users u_to ON f.transit_to_username = u_to.username
      LEFT JOIN users u_by ON f.transit_by_username = u_by.username
      ORDER BY f.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Get files currently transiting to the logged-in user (didaftarkan sebelum /:qr_code)
  router.get('/my-transits', authenticateJWT, (req, res) => {
    db.all(
      'SELECT * FROM files WHERE is_transit = 1 AND transit_to_username = ?',
      [req.user.username],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  });

  // Scan & Update file location
  router.post('/scan', authenticateJWT, validateBody(schemas.scanFileSchema), (req, res) => {
    const { qr_code, fullName, selected_role } = req.body;

    try {
      verifyQRCodeToken(qr_code, { jwt, jwtSecret });
    } catch (err) {
      return res.status(400).json({ error: 'QR Code tidak valid atau palsu.' });
    }

    const userRoles = req.user.role ? req.user.role.split(',').map((r) => r.trim()) : [];

    db.get('SELECT * FROM files WHERE qr_code = ?', [qr_code], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

      const precondition = validateScanPreconditions(file, req.user);
      if (!precondition.ok) {
        return res.status(precondition.status).json({ error: precondition.error });
      }

      if (userRoles.length > 1 && !selected_role) {
        db.all(
          'SELECT scanned_by_role FROM file_history WHERE file_id = ? AND scanned_by_username = ? ORDER BY scanned_at ASC',
          [file.id, req.user.username],
          (historyErr, rows) => {
            if (historyErr) return res.status(500).json({ error: historyErr.message });
            return res.status(400).json(analyzeMultiRoleSelection(userRoles, rows));
          }
        );
        return;
      }

      const activeRole = selected_role || userRoles[0];

      if (!userRoles.includes(activeRole)) {
        return res
          .status(403)
          .json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk jabatan tersebut.' });
      }

      const transition = resolveScanTransition(file, activeRole);
      if (!transition.ok) {
        return res.status(transition.status).json({ error: transition.error });
      }

      const { newLocation: new_location, customMessage: custom_message } = transition;

      function proceedUpdate(roleUsed, locationToSet, successMessage) {
        const effectiveFullName = fullName || req.user.full_name;
        const scannedBy = effectiveFullName ? `${effectiveFullName} (${roleUsed})` : roleUsed;
        const clientIp = getClientIp(req);

        db.run(
          'UPDATE files SET current_location = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
          [locationToSet, file.id],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            db.run(
              'INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
              [file.id, scannedBy, req.user.username, locationToSet, clientIp],
              (historyErr) => {
                if (historyErr) return res.status(500).json({ error: historyErr.message });
                res.json({
                  message: successMessage || 'Lokasi berkas berhasil diperbarui.',
                  current_location: locationToSet,
                });
              }
            );
          }
        );
      }

      if (file.current_location === new_location) {
        db.get(
          'SELECT scanned_by_username, scanned_by_role FROM file_history WHERE file_id = ? ORDER BY scanned_at DESC LIMIT 1',
          [file.id],
          (historyErr, row) => {
            const lastUsername = row ? row.scanned_by_username : null;

            if (lastUsername && lastUsername !== req.user.username) {
              return proceedUpdate(
                activeRole,
                new_location,
                `Berkas dipindahtangankan ke Anda di posisi ${activeRole}.`
              );
            }
            const nama = row ? row.scanned_by_role : file.current_location;
            return res.status(400).json({ error: `Posisi berkas sudah berada di ${nama}` });
          }
        );
        return;
      }

      proceedUpdate(activeRole, new_location, custom_message);
    });
  });

  // Delete a file entry (Admin only)
  router.delete('/:id', authenticateJWT, requireAdmin, (req, res) => {
    const fileId = req.params.id;
    db.get('SELECT nomor_berkas, tahun_berkas, nama_kegiatan FROM files WHERE id = ?', [fileId], (_qErr, targetFile) => {
      db.run('DELETE FROM file_history WHERE file_id = ?', [fileId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run('DELETE FROM files WHERE id = ?', [fileId], function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          if (this.changes > 0) {
            const label = targetFile
              ? `${targetFile.nomor_berkas}/${targetFile.tahun_berkas}`
              : fileId;
            recordAuditLog(db, {
              category: 'BERKAS',
              action: 'FILE_DELETED',
              severity: 'critical',
              ...buildActorFromRequest(req),
              targetType: 'file',
              targetId: label,
              summary: `Menghapus permanen berkas ${label} beserta seluruh histori posisinya`,
              metadata: targetFile ? { kegiatan: targetFile.nama_kegiatan } : null,
            });
          }
          res.json({ message: 'Berkas dan histori berhasil dihapus.' });
        });
      });
    });
  });

  // Force complete a file entry (Admin only)
  router.put('/:id/complete', authenticateJWT, requireAdmin, (req, res) => {
    const fileId = req.params.id;
    const fullName = req.user.full_name || req.user.username;

    db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

      if (file.current_location === 'Selesai') {
        return res.status(400).json({ error: 'Berkas sudah berstatus Selesai.' });
      }
      if (file.current_location === 'Ditutup') {
        return res
          .status(400)
          .json({ error: 'Berkas berstatus Ditutup tidak bisa diselesaikan secara manual.' });
      }

      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const existingCatatan = file.catatan ? file.catatan + '\n\n' : '';
      const closeNote =
        existingCatatan +
        `-- Berkas diselesaikan secara manual oleh ${fullName} (Admin) pada ${timestamp}`;
      const newLocation = 'Selesai';
      const clientIp = getClientIp(req);

      db.run(
        'UPDATE files SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
        [newLocation, closeNote, fileId],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.run(
            'INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
            [
              fileId,
              `${fullName} (Administrator)`,
              req.user.username,
              'Selesai (Oleh Admin)',
              clientIp,
            ],
            function (historyErr) {
              if (historyErr) return res.status(500).json({ error: historyErr.message });
              recordAuditLog(db, {
                category: 'BERKAS',
                action: 'FILE_COMPLETED',
                severity: 'info',
                ...buildActorFromRequest(req),
                targetType: 'file',
                targetId: `${file.nomor_berkas}/${file.tahun_berkas}`,
                summary: `Menyelesaikan berkas ${file.nomor_berkas}/${file.tahun_berkas} secara manual`,
              });
              res.json({ message: 'Berkas berhasil diselesaikan secara manual.' });
            }
          );
        }
      );
    });
  });

  // Close a file entry (Admin only)
  router.put('/:id/close', authenticateJWT, requireAdmin, (req, res) => {
    const fileId = req.params.id;
    const { alasan } = req.body;
    const fullName = req.user.full_name || req.user.username;

    if (!alasan || alasan.trim() === '') {
      return res.status(400).json({ error: 'Alasan penutupan wajib diisi.' });
    }

    db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

      if (file.current_location === 'Selesai') {
        return res
          .status(400)
          .json({ error: 'Berkas berstatus Selesai tidak bisa ditutup.' });
      }
      if (file.current_location === 'Ditutup') {
        return res.status(400).json({ error: 'Berkas ini sudah berstatus Ditutup.' });
      }

      const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const closeNote = `-- Berkas ditutup oleh ${fullName} pada ${timestamp}:\nAlasan: ${alasan}`;
      const finalCatatan = file.catatan ? file.catatan + '\n\n' + closeNote : closeNote;

      const newLocation = 'Ditutup';
      const clientIp = getClientIp(req);
      const roleUsed = req.user.role.includes('Administrator')
        ? 'Administrator'
        : req.user.role;
      const scannedBy = `${fullName} (${roleUsed})`;

      db.run(
        'UPDATE files SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
        [newLocation, finalCatatan, fileId],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.run(
            'INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
            [fileId, scannedBy, req.user.username, 'Ditutup (Oleh Admin)', clientIp],
            (historyErr) => {
              if (historyErr) return res.status(500).json({ error: historyErr.message });
              recordAuditLog(db, {
                category: 'BERKAS',
                action: 'FILE_CLOSED',
                severity: 'warning',
                ...buildActorFromRequest(req),
                targetType: 'file',
                targetId: `${file.nomor_berkas}/${file.tahun_berkas}`,
                summary: `Menutup berkas ${file.nomor_berkas}/${file.tahun_berkas} (Alasan: ${alasan.trim()})`,
              });
              res.json({ message: 'Berkas berhasil ditutup.' });
            }
          );
        }
      );
    });
  });

  // Get specific file and history by QR Code
  router.get('/:qr_code', authenticateJWT, (req, res) => {
    const qr_code = req.params.qr_code;

    try {
      verifyQRCodeToken(qr_code, { jwt, jwtSecret });
    } catch (err) {
      return res.status(400).json({ error: 'QR Code tidak valid atau palsu.' });
    }

    db.get(
      `
      SELECT f.*, 
             u_to.full_name as transit_to_fullname,
             u_by.full_name as transit_by_fullname
      FROM files f
      LEFT JOIN users u_to ON f.transit_to_username = u_to.username
      LEFT JOIN users u_by ON f.transit_by_username = u_by.username
      WHERE f.qr_code = ?
    `,
      [qr_code],
      (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

        db.all(
          `
          SELECT fh.*, u.full_name as user_full_name 
          FROM file_history fh
          LEFT JOIN users u ON fh.scanned_by_username = u.username
          WHERE fh.file_id = ? 
          ORDER BY fh.scanned_at DESC
        `,
          [file.id],
          (err2, history) => {
            if (err2) return res.status(500).json({ error: err2.message });
            file.history = (history || []).map((h) => {
              if (h.user_full_name && h.scanned_by_role && !h.scanned_by_role.includes('(')) {
                return {
                  ...h,
                  scanned_by_role: `${h.user_full_name} (${h.scanned_by_role})`,
                };
              }
              return h;
            });
            file.client_ip = getClientIp(req);
            res.json(file);
          }
        );
      }
    );
  });

  // Update catatan file (Only for current handler or Administrator)
  router.put('/:qr_code/note', authenticateJWT, validateBody(schemas.noteSchema), (req, res) => {
    const qr_code = req.params.qr_code;
    const { catatan } = req.body;

    db.get('SELECT * FROM files WHERE qr_code = ?', [qr_code], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

      const userRoles = req.user.role ? req.user.role.split(',').map((r) => r.trim()) : [];
      if (!userRoles.includes('Administrator') && !userRoles.includes(file.current_location)) {
        return res.status(403).json({
          error:
            'Akses ditolak. Hanya pemegang berkas ini atau Administrator yang dapat mengubah catatan.',
        });
      }

      let finalCatatan = catatan;
      if (catatan && catatan !== file.catatan) {
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const fullName = req.user.full_name || req.user.username;
        const cleanCatatan = catatan.replace(/\n\n-- Terakhir diubah oleh.*?$/s, '');
        finalCatatan =
          cleanCatatan + `\n\n-- Terakhir diubah oleh ${fullName} pada ${timestamp}`;
      }

      db.run(
        'UPDATE files SET catatan = ? WHERE qr_code = ?',
        [finalCatatan, qr_code],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          res.json({ message: 'Catatan berhasil disimpan', catatan: finalCatatan });
        }
      );
    });
  });

  // Send a file to transit (Kirim Berkas)
  router.post(
    '/:qr_code/transit',
    authenticateJWT,
    validateBody(schemas.transitTargetSchema),
    (req, res) => {
      const { qr_code } = req.params;
      const { target_username } = req.body;

      if (!target_username) {
        return res.status(400).json({ error: 'Target pengguna tujuan harus dipilih.' });
      }

      db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

        if (file.current_location === 'Selesai' || file.current_location === 'Ditutup') {
          return res
            .status(400)
            .json({ error: 'Berkas Selesai/Ditutup tidak bisa ditransit.' });
        }

        if (file.is_transit) {
          return res.status(400).json({ error: 'Berkas sudah dalam status transit.' });
        }

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
              `UPDATE files SET is_transit = 1, transit_to_username = ?, transit_by_username = ?, transit_at = CURRENT_TIMESTAMP WHERE qr_code = ?`,
              [target_username, req.user.username, qr_code],
              function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                db.run(
                  `INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
                  [file.id, scannedBy, req.user.username, transitLocation, clientIp],
                  function (historyErr) {
                    if (historyErr) console.error('Error inserting transit history:', historyErr);

                    if (targetUser && targetUser.telegram_chat_id) {
                      const waktuWib = new Date().toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                      });
                      const tgMsg =
                        `<b>BERKAS KIRIMAN MASUK (TRANSIT)</b>\n\n` +
                        `Halo <b>${targetFullName}</b>, ada berkas yang sedang dikirim menuju meja Anda:\n\n` +
                        `No. Berkas: <b>${file.nomor_berkas}/${file.tahun_berkas}</b>\n` +
                        `Kegiatan: <b>${file.nama_kegiatan}</b>\n` +
                        `Pemohon: <b>${file.nama_pemohon}</b>\n` +
                        `Dikirim Oleh: <b>${senderFullName}</b> (${req.user.role})\n` +
                        `Waktu Kirim: ${waktuWib} WIB\n\n` +
                        `<i>Silakan buka aplikasi Pantau.Kantah Tangsel dan lakukan <b>Scan Terima</b> saat berkas fisik tiba di meja Anda.</i>`;
                      sendTelegramMessage(targetUser.telegram_chat_id, tgMsg);
                    }

                    res.json({ message: 'Berkas berhasil dikirim (transit).' });
                  }
                );
              }
            );
          }
        );
      });
    }
  );

  // Cancel transit
  router.post('/:qr_code/cancel-transit', authenticateJWT, (req, res) => {
    const { qr_code } = req.params;

    db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

      if (!file.is_transit) {
        return res.status(400).json({ error: 'Berkas tidak sedang dalam status transit.' });
      }

      const isAdmin = req.user.role && req.user.role.includes('Administrator');
      if (file.transit_by_username !== req.user.username && !isAdmin) {
        return res.status(403).json({
          error: 'Hanya pengirim asli atau Administrator yang bisa membatalkan kiriman.',
        });
      }

      db.get(
        'SELECT full_name, telegram_chat_id FROM users WHERE username = ?',
        [file.transit_to_username],
        (userErr, targetUser) => {
          const targetFullName =
            targetUser && targetUser.full_name
              ? targetUser.full_name
              : file.transit_to_username;
          const cancelerFullName = req.user.full_name || req.user.username;
          const scannedBy = `${cancelerFullName} (${req.user.role})`;
          const clientIp = getClientIp(req);
          const cancelLocation = `Batal Kirim (Transit ke ${targetFullName} dibatalkan)`;

          db.run(
            `UPDATE files SET is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE qr_code = ?`,
            [qr_code],
            function (updateErr) {
              if (updateErr) return res.status(500).json({ error: updateErr.message });

              db.run(
                `INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)`,
                [file.id, scannedBy, req.user.username, cancelLocation, clientIp],
                function (historyErr) {
                  if (historyErr)
                    console.error('Error inserting cancel transit history:', historyErr);

                  if (targetUser && targetUser.telegram_chat_id) {
                    const tgCancelMsg =
                      `<b>PEMBATALAN KIRIMAN BERKAS</b>\n\n` +
                      `Kiriman berkas <b>No. ${file.nomor_berkas}/${file.tahun_berkas}</b> (${file.nama_kegiatan} - Pemohon: ${file.nama_pemohon}) ke meja Anda telah <b>dibatalkan</b> oleh <b>${cancelerFullName}</b>.`;
                    sendTelegramMessage(targetUser.telegram_chat_id, tgCancelMsg);
                  }

                  res.json({ message: 'Kiriman berkas berhasil dibatalkan.' });
                }
              );
            }
          );
        }
      );
    });
  });

  // Pause SOP
  router.post('/:qr_code/pause', authenticateJWT, (req, res) => {
    if (!req.user.role.includes('Administrator')) {
      return res
        .status(403)
        .json({ error: 'Hanya Administrator yang dapat mem-pause berkas.' });
    }

    const { qr_code } = req.params;

    db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });
      if (file.is_paused) {
        return res.status(400).json({ error: 'Berkas sudah dalam status pause.' });
      }

      db.run(
        `UPDATE files SET is_paused = 1, paused_at = CURRENT_TIMESTAMP WHERE qr_code = ?`,
        [qr_code],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          recordAuditLog(db, {
            category: 'BERKAS',
            action: 'FILE_PAUSED',
            severity: 'info',
            ...buildActorFromRequest(req),
            targetType: 'file',
            targetId: `${file.nomor_berkas}/${file.tahun_berkas}`,
            summary: `Menghentikan sementara (pause) SLA berkas ${file.nomor_berkas}/${file.tahun_berkas}`,
          });
          res.json({ message: 'SOP Berkas berhasil di-pause.' });
        }
      );
    });
  });

  // Resume SOP
  router.post('/:qr_code/resume', authenticateJWT, (req, res) => {
    if (!req.user.role.includes('Administrator')) {
      return res
        .status(403)
        .json({ error: 'Hanya Administrator yang dapat melanjutkan berkas.' });
    }

    const { qr_code } = req.params;

    db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });
      if (!file.is_paused) {
        return res.status(400).json({ error: 'Berkas tidak dalam status pause.' });
      }

      const pausedDays = getWorkingDays(file.paused_at, new Date().toISOString());
      const newTotal = (file.total_paused_days || 0) + pausedDays;

      db.run(
        `UPDATE files SET is_paused = 0, paused_at = NULL, total_paused_days = ? WHERE qr_code = ?`,
        [newTotal, qr_code],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          recordAuditLog(db, {
            category: 'BERKAS',
            action: 'FILE_RESUMED',
            severity: 'info',
            ...buildActorFromRequest(req),
            targetType: 'file',
            targetId: `${file.nomor_berkas}/${file.tahun_berkas}`,
            summary: `Melanjutkan kembali (resume) SLA berkas ${file.nomor_berkas}/${file.tahun_berkas} (+${pausedDays} hari jeda)`,
          });
          res.json({ message: 'SOP Berkas berhasil dilanjutkan kembali.' });
        }
      );
    });
  });

  // GET /api/files/:qrcode/disposisi
  router.get('/:qrcode/disposisi', authenticateJWT, (req, res) => {
    const qrCode = req.params.qrcode;
    db.get('SELECT id FROM files WHERE qr_code = ?', [qrCode], (err, file) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

      db.all(
        'SELECT * FROM disposisi WHERE file_id = ? ORDER BY dibuat_pada DESC',
        [file.id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: 'Gagal mengambil disposisi' });
          res.json(rows || []);
        }
      );
    });
  });

  // POST /api/files/:qrcode/disposisi
  router.post(
    '/:qrcode/disposisi',
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
      const qrCode = req.params.qrcode;
      const { isi_disposisi } = req.body;
      if (!isi_disposisi) return res.status(400).json({ error: 'Isi disposisi tidak boleh kosong' });

      db.get('SELECT id FROM files WHERE qr_code = ?', [qrCode], (err, file) => {
        if (err || !file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

        const fullName = req.user.full_name || req.user.username;
        db.run(
          `INSERT INTO disposisi (file_id, isi_disposisi, dibuat_oleh) VALUES (?, ?, ?)`,
          [file.id, isi_disposisi, fullName],
          function (err2) {
            if (err2) return res.status(500).json({ error: 'Gagal menyimpan disposisi' });
            res.json({ message: 'Disposisi berhasil ditambahkan', id: this.lastID });
          }
        );
      });
    }
  );

  return router;
}

/**
 * Router untuk menyelesaikan disposisi berkas (/api/disposisi/:id/selesai).
 */
function createDisposisiRouter({ db, authenticateJWT }) {
  const router = express.Router();

  router.put('/:id/selesai', authenticateJWT, (req, res) => {
    const id = req.params.id;
    const fullName = req.user.full_name || req.user.username;

    db.run(
      `UPDATE disposisi SET status = 'Sudah Dilaksanakan', dilaksanakan_oleh = ?, dilaksanakan_pada = CURRENT_TIMESTAMP WHERE id = ?`,
      [fullName, id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Gagal mengupdate disposisi' });
        res.json({ message: 'Disposisi telah ditandai selesai' });
      }
    );
  });

  return router;
}

module.exports = {
  createFilesRouter,
  createDisposisiRouter,
};

