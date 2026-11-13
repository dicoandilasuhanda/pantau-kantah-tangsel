const express = require('express');
const { recordAuditLog, buildActorFromRequest } = require('../services/auditService');

/**
 * Router untuk Web-App Stats & Kick Session Admin (/api/admin/*).
 */
function createStatsRouter({ db, authenticateJWT, requireAdmin, userLastActiveMap }) {
  const router = express.Router();

  router.get('/stats', authenticateJWT, requireAdmin, (req, res) => {
    const onlineThresholdMinutes = 5;

    db.all(
      `SELECT 
        id, 
        username, 
        full_name, 
        role, 
        avatar_url, 
        last_active_at, 
        last_ip, 
        session_id, 
        telegram_chat_id,
        CASE 
          WHEN last_active_at IS NOT NULL AND last_active_at >= datetime('now', '-${onlineThresholdMinutes} minutes') 
          THEN 1 
          ELSE 0 
        END AS is_online
       FROM users
       ORDER BY is_online DESC, last_active_at DESC, username ASC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Gagal mengambil data statistik: ' + err.message });

        const users = (rows || []).map((u) => {
          const sessionCount = u.session_id ? u.session_id.split(',').filter(Boolean).length : 0;
          return {
            id: u.id,
            username: u.username,
            full_name: u.full_name || u.username,
            role: u.role,
            avatar_url: u.avatar_url,
            last_active_at: u.last_active_at,
            last_ip: u.last_ip,
            session_count: sessionCount,
            telegram_connected: !!(u.telegram_chat_id && u.telegram_chat_id.trim()),
            is_online: Boolean(u.is_online),
          };
        });

        const totalUsers = users.length;
        const onlineUsers = users.filter((u) => u.is_online).length;
        const telegramUsers = users.filter((u) => u.telegram_connected).length;
        const activeSessions = users.reduce((acc, u) => acc + (u.is_online ? u.session_count : 0), 0);

        res.json({
          summary: {
            total_users: totalUsers,
            online_users: onlineUsers,
            offline_users: totalUsers - onlineUsers,
            active_sessions: activeSessions,
            telegram_connected_users: telegramUsers,
            server_time: new Date().toISOString(),
          },
          users,
        });
      }
    );
  });

  router.post('/users/:id/kick', authenticateJWT, requireAdmin, (req, res) => {
    const targetId = req.params.id;
    userLastActiveMap.delete(parseInt(targetId, 10));

    db.get('SELECT username FROM users WHERE id = ?', [targetId], (_qErr, targetUser) => {
      db.run(
        "UPDATE users SET session_id = NULL, last_active_at = datetime('now', '-10 minutes') WHERE id = ?",
        [targetId],
        function (err) {
          if (err) return res.status(500).json({ error: 'Gagal memutuskan sesi: ' + err.message });
          if (this.changes === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
          recordAuditLog(db, {
            category: 'SESSION',
            action: 'SESSION_KICKED',
            severity: 'warning',
            ...buildActorFromRequest(req),
            targetType: 'user',
            targetId: targetUser?.username || targetId,
            summary: `Memutus paksa sesi aktif pengguna @${targetUser?.username || targetId}`,
          });
          res.json({ message: 'Sesi pengguna berhasil diputuskan. Pengguna akan diminta login kembali.' });
        }
      );
    });
  });

  return router;
}

module.exports = { createStatsRouter };

