/**
 * Middleware otentikasi JWT, manajemen sesi aktif, serta guard role pengguna.
 */

function canAccessDwg(userRoles) {
  if (!userRoles) return false;
  const roles = Array.isArray(userRoles)
    ? userRoles
    : String(userRoles).split(',').map((r) => r.trim());
  return (
    roles.includes('Asisten Surveyor Kadastral') ||
    roles.includes('Petugas Pemetaan') ||
    roles.includes('Petugas Ukur') ||
    roles.includes('Administrator')
  );
}

function createAuthMiddleware({ db, jwt, jwtSecret }) {
  // Cache throttle last_active_at update (max 1 update per 30s per user)
  const userLastActiveMap = new Map();

  const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.sendStatus(401);
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Sesi berakhir atau tidak valid. Silakan login kembali.' });
      }

      db.get('SELECT session_id, full_name FROM users WHERE id = ?', [user.id], (dbErr, row) => {
        if (dbErr || !row) return res.sendStatus(403);

        const activeSessions = row.session_id ? row.session_id.split(',') : [];
        if (!activeSessions.includes(user.session_id)) {
          return res.status(403).json({
            error: 'Sesi Ditolak: Anda telah login di perangkat lain melebihi batas (Maksimal 2). Perangkat ini dikeluarkan.',
          });
        }

        // Pastikan full_name terbaru dari DB selalu tersedia di req.user
        user.full_name = row.full_name || user.full_name;
        req.user = user;

        // Throttle pembaruan waktu aktif user
        const now = Date.now();
        const lastUpdated = userLastActiveMap.get(user.id) || 0;
        if (now - lastUpdated > 30000) {
          userLastActiveMap.set(user.id, now);
          const rawClientIp =
            req.headers['cf-connecting-ip'] ||
            req.headers['x-forwarded-for'] ||
            (req.socket && req.socket.remoteAddress) ||
            '';
          const clientIp = String(rawClientIp).split(',')[0].trim();
          db.run(
            'UPDATE users SET last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?',
            [clientIp || null, user.id]
          );
        }

        next();
      });
    });
  };

  const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.includes('Administrator')) {
      next();
    } else {
      res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses Administrator.' });
    }
  };

  const requireAdminOrKasi = (req, res, next) => {
    if (
      req.user &&
      req.user.role &&
      (req.user.role.includes('Administrator') ||
        req.user.role.includes('Kepala Seksi') ||
        req.user.role.includes('Koordinator'))
    ) {
      next();
    } else {
      res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses pimpinan.' });
    }
  };

  const requireDwgAccess = (req, res, next) => {
    if (!canAccessDwg(req.user && req.user.role)) {
      return res.status(403).json({
        error:
          'Akses ditolak. Fitur penyimpanan & pertukaran file DWG hanya untuk Petugas Ukur, Asisten Surveyor Kadastral, dan Petugas Pemetaan.',
      });
    }
    next();
  };

  return {
    userLastActiveMap,
    authenticateJWT,
    requireAdmin,
    requireAdminOrKasi,
    requireDwgAccess,
    canAccessDwg,
  };
}

module.exports = {
  canAccessDwg,
  createAuthMiddleware,
};
