const express = require('express');

/**
 * Router untuk Notifikasi Transit Aktif & Integrasi Bot Telegram (/api/notifications/*).
 */
function createNotificationsRouter({
  db,
  authenticateJWT,
  telegramBotUsername,
  sendTelegramMessage,
}) {
  const router = express.Router();

  // Get active transit notifications for the logged-in user (berkas & surat)
  router.get('/transit', authenticateJWT, (req, res) => {
    const username = req.user.username;
    const query = `
      SELECT * FROM (
        SELECT f.id, 
               'file' as item_type,
               f.qr_code, 
               f.nomor_berkas, 
               f.tahun_berkas, 
               f.nama_kegiatan, 
               f.nama_pemohon,
               NULL as nomor_agenda,
               NULL as asal_surat,
               NULL as nomor_surat,
               NULL as perihal,
               f.current_location, 
               f.is_transit, 
               f.transit_to_username, 
               f.transit_by_username, 
               f.transit_at,
               u_by.full_name as transit_by_fullname,
               u_by.role as transit_by_role
        FROM files f
        LEFT JOIN users u_by ON f.transit_by_username = u_by.username
        WHERE f.is_transit = 1
          AND f.transit_to_username = ?
          AND f.current_location NOT IN ('Selesai', 'Ditutup')
        
        UNION ALL

        SELECT s.id, 
               'surat' as item_type,
               s.qr_code, 
               NULL as nomor_berkas, 
               NULL as tahun_berkas, 
               NULL as nama_kegiatan, 
               NULL as nama_pemohon,
               s.nomor_agenda,
               s.asal_surat,
               s.nomor_surat,
               s.perihal,
               s.current_location, 
               s.is_transit, 
               s.transit_to_username, 
               s.transit_by_username, 
               s.transit_at,
               u_by.full_name as transit_by_fullname,
               u_by.role as transit_by_role
        FROM surat s
        LEFT JOIN users u_by ON s.transit_by_username = u_by.username
        WHERE s.is_transit = 1
          AND s.transit_to_username = ?
          AND s.current_location NOT IN ('Selesai', 'Ditutup')
      )
      ORDER BY transit_at DESC, id DESC
    `;
    db.all(query, [username, username], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // Cek status koneksi Telegram untuk user yang sedang login
  router.get('/telegram-status', authenticateJWT, (req, res) => {
    db.get(
      'SELECT username, full_name, telegram_chat_id FROM users WHERE id = ?',
      [req.user.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          connected: Boolean(row && row.telegram_chat_id),
          telegram_chat_id: row ? row.telegram_chat_id : null,
          bot_username: telegramBotUsername,
          username: row ? row.username : req.user.username,
        });
      }
    );
  });

  // Kirim pesan tes ke Telegram user yang sedang login
  router.post('/telegram-test', authenticateJWT, (req, res) => {
    db.get(
      'SELECT username, full_name, telegram_chat_id FROM users WHERE id = ?',
      [req.user.id],
      async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.telegram_chat_id) {
          return res
            .status(400)
            .json({ error: 'Akun Anda belum terhubung dengan Bot Telegram.' });
        }
        const chatStr = String(row.telegram_chat_id).trim();
        if (chatStr.startsWith('08') || chatStr.startsWith('+62') || chatStr.startsWith('628')) {
          return res.status(400).json({
            error: `Telegram tidak menggunakan Nomor HP (${chatStr}). Silakan buka @pantaukantahtangsel_bot di aplikasi Telegram lalu ketik: /daftar ${row.username}`,
          });
        }
        const result = await sendTelegramMessage(
          chatStr,
          `<b>Tes Notifikasi Pantau.Kantah Tangsel</b>\n\nHalo <b>${row.full_name}</b>, koneksi notifikasi Telegram Anda sudah aktif dan berjalan normal!`
        );
        if (!result.ok) {
          return res.status(500).json({
            error: `Gagal mengirim ke Chat ID (${chatStr}). Pastikan Anda sudah membuka @pantaukantahtangsel_bot di aplikasi Telegram dan mengetik /daftar ${row.username}`,
          });
        }
        res.json({ message: 'Pesan tes berhasil dikirim ke Telegram Anda!' });
      }
    );
  });

  // Putuskan / reset koneksi Telegram user yang sedang login
  router.post('/telegram-unlink', authenticateJWT, (req, res) => {
    db.run(
      'UPDATE users SET telegram_chat_id = NULL WHERE id = ?',
      [req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          message:
            'Koneksi Telegram berhasil direset. Silakan hubungkan ulang melalui @pantaukantahtangsel_bot.',
        });
      }
    );
  });

  return router;
}

module.exports = {
  createNotificationsRouter,
};
