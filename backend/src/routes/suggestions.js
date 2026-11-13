const express = require('express');

/**
 * Router untuk Kotak Saran & Ide Fitur (/api/suggestions/*).
 */
function createSuggestionsRouter({
  db,
  authenticateJWT,
  requireAdmin,
  validateBody,
  schemas,
  sendTelegramMessage,
}) {
  const router = express.Router();

  router.post('/', authenticateJWT, validateBody(schemas.createSuggestionSchema), (req, res) => {
    const { title, category, description } = req.body;
    const cleanTitle = title.trim();
    const cleanCat = (category || 'Fitur Baru').trim();
    const cleanDesc = description.trim();
    const userId = req.user.id;
    const username = req.user.username;
    const fullName = req.user.full_name || username;
    const role = req.user.role || 'Petugas';

    const insertSql = `INSERT INTO suggestions (user_id, username, full_name, role, title, category, description, status) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu Review')`;

    db.run(insertSql, [userId, username, fullName, role, cleanTitle, cleanCat, cleanDesc], function (err) {
      if (err) return res.status(500).json({ error: 'Gagal menyimpan saran: ' + err.message });

      const newId = this.lastID;

      db.all(
        "SELECT telegram_chat_id FROM users WHERE role LIKE '%Administrator%' AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ''",
        (adminErr, admins) => {
          if (!adminErr && admins && admins.length > 0) {
            const notifMsg =
              `💡 <b>Saran Fitur Baru Masuk!</b>\n\n` +
              `👤 <b>Pengirim:</b> ${fullName} (@${username})\n` +
              `🛡️ <b>Role:</b> ${role}\n` +
              `🏷️ <b>Kategori:</b> ${cleanCat}\n` +
              `📌 <b>Judul:</b> ${cleanTitle}\n\n` +
              `📝 <b>Detail Saran:</b>\n${cleanDesc}\n\n` +
              `📅 <i>${new Date().toLocaleString('id-ID')}</i>`;
            admins.forEach((adm) => {
              sendTelegramMessage(adm.telegram_chat_id, notifMsg);
            });
          }
        }
      );

      res.status(201).json({
        message: 'Saran berhasil dikirimkan. Terima kasih atas masukan Anda!',
        id: newId,
      });
    });
  });

  router.get('/', authenticateJWT, (req, res) => {
    const userRoles = (req.user.role || '').split(',').map((r) => r.trim());
    const isAdmin = userRoles.includes('Administrator');

    let sql = 'SELECT * FROM suggestions ORDER BY created_at DESC';
    let params = [];

    if (!isAdmin) {
      sql = 'SELECT * FROM suggestions WHERE user_id = ? ORDER BY created_at DESC';
      params = [req.user.id];
    }

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Gagal mengambil daftar saran' });
      res.json(rows || []);
    });
  });

  router.put(
    '/:id/status',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.updateSuggestionStatusSchema),
    (req, res) => {
      const { status, admin_notes } = req.body;
      const suggestionId = req.params.id;

      db.run(
        'UPDATE suggestions SET status = ?, admin_notes = ? WHERE id = ?',
        [status, admin_notes || null, suggestionId],
        function (err) {
          if (err) return res.status(500).json({ error: 'Gagal memperbarui status saran' });
          if (this.changes === 0) return res.status(404).json({ error: 'Saran tidak ditemukan' });
          res.json({ message: 'Status saran berhasil diperbarui' });
        }
      );
    }
  );

  router.delete('/:id', authenticateJWT, (req, res) => {
    const suggestionId = req.params.id;
    const userRoles = (req.user.role || '').split(',').map((r) => r.trim());
    const isAdmin = userRoles.includes('Administrator');

    let checkSql = 'SELECT * FROM suggestions WHERE id = ?';
    const checkParams = [suggestionId];

    if (!isAdmin) {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    db.get(checkSql, checkParams, (err, row) => {
      if (err) return res.status(500).json({ error: 'Gagal memeriksa saran' });
      if (!row) return res.status(404).json({ error: 'Saran tidak ditemukan atau Anda tidak memiliki akses' });

      db.run('DELETE FROM suggestions WHERE id = ?', [suggestionId], (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Gagal menghapus saran' });
        res.json({ message: 'Saran berhasil dihapus' });
      });
    });
  });

  return router;
}

module.exports = { createSuggestionsRouter };
