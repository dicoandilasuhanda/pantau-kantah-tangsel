const express = require('express');
const fs = require('fs');
const path = require('path');

function removeOldAvatar(avatarDir, avatarUrl) {
  if (!avatarUrl) return;
  const oldFilename = path.basename(avatarUrl);
  const oldPath = path.join(avatarDir, oldFilename);
  if (fs.existsSync(oldPath)) {
    try {
      fs.unlinkSync(oldPath);
    } catch (_) {}
  }
}

/**
 * Router untuk Manajemen Pengguna oleh Admin (/api/users/*)
 * dan perubahan kata sandi mandiri (/api/users/change-password).
 */
function createUsersRouter({
  db,
  bcrypt,
  authenticateJWT,
  requireAdmin,
  validateBody,
  schemas,
}) {
  const router = express.Router();

  // Get all users (Admin only)
  router.get('/', authenticateJWT, requireAdmin, (req, res) => {
    db.all('SELECT id, username, role, full_name, telegram_chat_id FROM users', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Get simple user list for dropdowns (All logged-in users can access)
  router.get('/list', authenticateJWT, (req, res) => {
    db.all('SELECT username, full_name, role, telegram_chat_id FROM users', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Create new user
  router.post(
    '/',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.createUserSchema),
    (req, res) => {
      const { username, password, role, full_name, telegram_chat_id } = req.body;
      if (!username || !password || !role || !full_name) {
        return res.status(400).json({ error: 'Semua field termasuk Nama Lengkap harus diisi.' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const cleanChatId = telegram_chat_id ? String(telegram_chat_id).trim() : null;
      db.run(
        'INSERT INTO users (username, password, role, full_name, telegram_chat_id) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, role, full_name, cleanChatId],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Username sudah digunakan.' });
            }
            return res.status(500).json({ error: err.message });
          }
          res.json({
            id: this.lastID,
            username,
            role,
            full_name,
            telegram_chat_id: cleanChatId,
            message: 'User berhasil ditambahkan.',
          });
        }
      );
    }
  );

  // Change own password (wajib sebelum route parameter /:id)
  router.put(
    '/change-password',
    authenticateJWT,
    validateBody(schemas.changePasswordSchema),
    (req, res) => {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Kata sandi lama dan baru wajib diisi.' });
      }

      db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

        const isValid = bcrypt.compareSync(oldPassword, user.password);
        if (!isValid) return res.status(400).json({ error: 'Kata sandi lama salah' });

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedNewPassword, userId],
          function (err2) {
            if (err2) return res.status(500).json({ error: 'Gagal memperbarui kata sandi' });
            res.json({ message: 'Kata sandi berhasil diubah' });
          }
        );
      });
    }
  );

  // Update user
  router.put(
    '/:id',
    authenticateJWT,
    requireAdmin,
    validateBody(schemas.updateUserSchema),
    (req, res) => {
      const { username, password, role, full_name, telegram_chat_id } = req.body;
      const userId = req.params.id;
      const cleanChatId =
        telegram_chat_id !== undefined
          ? telegram_chat_id
            ? String(telegram_chat_id).trim()
            : null
          : undefined;

      db.get('SELECT username, telegram_chat_id FROM users WHERE id = ?', [userId], (err, oldUser) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!oldUser) return res.status(404).json({ error: 'User tidak ditemukan' });

        const finalChatId = cleanChatId !== undefined ? cleanChatId : oldUser.telegram_chat_id;

        const updateCallback = (updateErr) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          if (oldUser.username !== username) {
            db.run(
              'UPDATE file_history SET scanned_by_username = ? WHERE scanned_by_username = ?',
              [username, oldUser.username],
              (err2) => {
                if (err2) console.error('Error cascading username update to file_history:', err2);
                res.json({ message: 'User dan histori berhasil diperbarui.' });
              }
            );
          } else {
            res.json({ message: 'User berhasil diperbarui.' });
          }
        };

        if (password) {
          const hashedPassword = bcrypt.hashSync(password, 10);
          db.run(
            'UPDATE users SET username = ?, password = ?, role = ?, full_name = ?, telegram_chat_id = ? WHERE id = ?',
            [username, hashedPassword, role, full_name, finalChatId, userId],
            updateCallback
          );
        } else {
          db.run(
            'UPDATE users SET username = ?, role = ?, full_name = ?, telegram_chat_id = ? WHERE id = ?',
            [username, role, full_name, finalChatId, userId],
            updateCallback
          );
        }
      });
    }
  );

  // Delete user
  router.delete('/:id', authenticateJWT, requireAdmin, (req, res) => {
    const userId = req.params.id;
    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'User berhasil dihapus.' });
    });
  });

  return router;
}

/**
 * Router untuk Profil Pengguna & Foto Avatar (/api/user/profile*, /api/user/avatar/:filename).
 */
function createUserProfileRouter({
  db,
  avatarDir,
  authenticateJWT,
  handleAvatarUpload,
  validateBody,
  schemas,
}) {
  const router = express.Router();

  // Get Current User Profile
  router.get('/profile', authenticateJWT, (req, res) => {
    db.get(
      'SELECT id, username, role, full_name, telegram_chat_id, avatar_url FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err) return res.status(500).json({ error: 'Gagal mengambil data profil' });
        if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        res.json(user);
      }
    );
  });

  // Update Profile Info (Full Name)
  router.put(
    '/profile',
    authenticateJWT,
    validateBody(schemas.updateProfileSchema),
    (req, res) => {
      const { full_name } = req.body;
      if (!full_name || !full_name.trim()) {
        return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
      }

      db.run(
        'UPDATE users SET full_name = ? WHERE id = ?',
        [full_name.trim(), req.user.id],
        function (err) {
          if (err) return res.status(500).json({ error: 'Gagal memperbarui profil' });
          res.json({ message: 'Profil berhasil diperbarui.', full_name: full_name.trim() });
        }
      );
    }
  );

  // Upload User Profile Avatar
  router.post('/profile/avatar', authenticateJWT, handleAvatarUpload, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'File foto profil tidak ditemukan.' });
    }
    const avatarUrl = `/api/user/avatar/${req.file.filename}`;

    db.get('SELECT avatar_url FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (user && user.avatar_url) {
        removeOldAvatar(avatarDir, user.avatar_url);
      }

      db.run(
        'UPDATE users SET avatar_url = ? WHERE id = ?',
        [avatarUrl, req.user.id],
        (upErr) => {
          if (upErr) return res.status(500).json({ error: 'Gagal menyimpan foto profil ke database.' });
          res.json({ message: 'Foto profil berhasil diperbarui.', avatar_url: avatarUrl });
        }
      );
    });
  });

  // Delete User Profile Avatar
  router.delete('/profile/avatar', authenticateJWT, (req, res) => {
    db.get('SELECT avatar_url FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (user && user.avatar_url) {
        removeOldAvatar(avatarDir, user.avatar_url);
      }

      db.run('UPDATE users SET avatar_url = NULL WHERE id = ?', [req.user.id], (upErr) => {
        if (upErr) return res.status(500).json({ error: 'Gagal menghapus foto profil.' });
        res.json({ message: 'Foto profil berhasil dihapus.' });
      });
    });
  });

  // Serve User Profile Avatar
  router.get('/avatar/:filename', (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(avatarDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Foto profil tidak ditemukan');
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  });

  return router;
}

module.exports = {
  createUsersRouter,
  createUserProfileRouter,
};
