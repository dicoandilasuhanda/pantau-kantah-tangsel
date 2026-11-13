const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { getClientIp } = require('../utils/networkAndQr');
const { recordAuditLog } = require('../services/auditService');

/**
 * Router untuk otentikasi, IP client, dan manajemen sesi login (/api/my-ip, /api/login, /api/logout).
 */
function createAuthRouter({
  db,
  bcrypt,
  jwt,
  jwtSecret,
  authenticateJWT,
  userLastActiveMap,
  validateBody,
  schemas,
  loginLimiter: injectedLoginLimiter,
}) {
  const router = express.Router();

  const loginLimiter =
    injectedLoginLimiter ||
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
      message: {
        error: 'Terlalu banyak percobaan login dari IP ini, silakan coba lagi setelah 15 menit.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false },
    });

  // Endpoint to retrieve client IP
  router.get('/my-ip', (req, res) => {
    res.json({ ip: getClientIp(req) });
  });

  // Login API
  router.post('/login', loginLimiter, validateBody(schemas.loginSchema), (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        recordAuditLog(db, {
          category: 'AUTH',
          action: 'LOGIN_FAILED',
          severity: 'warning',
          actorUsername: username,
          targetType: 'auth',
          targetId: username,
          summary: `Login gagal: akun "${username}" tidak ditemukan`,
          metadata: { reason: 'user_not_found' },
          ipAddress: getClientIp(req),
        });
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) {
        recordAuditLog(db, {
          category: 'AUTH',
          action: 'LOGIN_FAILED',
          severity: 'warning',
          actorId: user.id,
          actorUsername: user.username,
          actorRole: user.role,
          targetType: 'auth',
          targetId: user.username,
          summary: `Login gagal: kata sandi salah untuk akun @${user.username}`,
          metadata: { reason: 'invalid_password' },
          ipAddress: getClientIp(req),
        });
        return res.status(401).json({ error: 'Username atau password salah' });
      }

      const sessionId = crypto.randomBytes(16).toString('hex');

      // Mengelola sesi login (Maksimal 2 device)
      let activeSessions = user.session_id ? user.session_id.split(',') : [];
      if (activeSessions.length >= 2) {
        activeSessions.shift();
      }
      activeSessions.push(sessionId);
      const newSessionString = activeSessions.join(',');

      const rawIp =
        req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '';
      const clientIp = String(rawIp).split(',')[0].trim();

      db.run(
        'UPDATE users SET session_id = ?, last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
        [newSessionString, clientIp || null, user.id],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: 'Gagal membuat sesi login' });
          }

          const token = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: user.role,
              full_name: user.full_name,
              session_id: sessionId,
            },
            jwtSecret,
            { expiresIn: '2h' }
          );

          res.json({
            token,
            role: user.role,
            username: user.username,
            full_name: user.full_name,
            fullName: user.full_name,
            avatar_url: user.avatar_url || null,
          });
        }
      );
    });
  });

  // Logout endpoint to immediately mark user offline
  router.post('/logout', authenticateJWT, (req, res) => {
    userLastActiveMap.delete(req.user.id);
    const currentSessions = (req.user.session_id ? req.user.session_id.split(',') : []).filter(
      (s) => s !== req.user.session_id
    );
    db.run(
      "UPDATE users SET session_id = ?, last_active_at = datetime('now', '-10 minutes') WHERE id = ?",
      [currentSessions.join(',') || null, req.user.id],
      () => res.json({ message: 'Berhasil keluar.' })
    );
  });

  return router;
}

module.exports = {
  createAuthRouter,
};

