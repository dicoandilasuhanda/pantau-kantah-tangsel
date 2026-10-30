require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev'; 
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "upgrade-insecure-requests": null,
    },
  },
}));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Setup multer for surat upload
const uploadDir = path.join(__dirname, 'uploads', 'surat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database Setup ---
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        full_name TEXT
      )`);

      // Try to alter table for existing databases (ignore error if column already exists)
      db.run(`ALTER TABLE users ADD COLUMN full_name TEXT`, (err) => {});
      db.run(`ALTER TABLE users ADD COLUMN session_id TEXT`, (err) => {});

      db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_code TEXT UNIQUE,
        nomor_berkas TEXT,
        tahun_berkas TEXT,
        nama_kegiatan TEXT,
        nama_pemohon TEXT,
        current_location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS file_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        scanned_by_role TEXT,
        scanned_by_username TEXT,
        location TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scanned_ip TEXT,
        FOREIGN KEY(file_id) REFERENCES files(id)
      )`);

      // Alter file_history
      db.run(`ALTER TABLE file_history ADD COLUMN scanned_by_username TEXT`, (err) => {});
      
      // Alter files to add catatan dan pause SOP
      db.run(`ALTER TABLE files ADD COLUMN catatan TEXT`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN is_paused INTEGER DEFAULT 0`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN paused_at DATETIME`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN total_paused_days INTEGER DEFAULT 0`, (err) => {});
      
      // Alter files for transit feature
      db.run(`ALTER TABLE files ADD COLUMN is_transit INTEGER DEFAULT 0`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_to_username TEXT`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_by_username TEXT`, (err) => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_at DATETIME`, (err) => {});

      // Tabel Disposisi Pimpinan
      db.run(`CREATE TABLE IF NOT EXISTS disposisi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        isi_disposisi TEXT,
        dibuat_oleh TEXT,
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Menunggu Tindak Lanjut',
        dilaksanakan_oleh TEXT,
        dilaksanakan_pada DATETIME,
        FOREIGN KEY(file_id) REFERENCES files(id)
      )`);

      // Tabel Surat
      db.run(`CREATE TABLE IF NOT EXISTS surat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomor_agenda TEXT UNIQUE,
        asal_surat TEXT,
        nomor_surat TEXT,
        tanggal_diterima TEXT,
        perihal TEXT,
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // One-time patch for Syahrul's orphaned history (flexible matching)
      db.run(`UPDATE file_history SET scanned_by_username = 'syahrul' WHERE scanned_by_username LIKE '%yahrul%' AND scanned_by_username != 'syahrul'`, (err) => {});

      // Auto-repair file_history records where full_name was missing (only role was saved)
      db.run(`
        UPDATE file_history
        SET scanned_by_role = (
          SELECT u.full_name || ' (' || file_history.scanned_by_role || ')'
          FROM users u
          WHERE u.username = file_history.scanned_by_username
            AND u.full_name IS NOT NULL
            AND u.full_name != ''
        )
        WHERE scanned_by_role NOT LIKE '%(%'
          AND scanned_by_username IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.username = file_history.scanned_by_username
              AND u.full_name IS NOT NULL
              AND u.full_name != ''
          )
      `, (err) => {});

      // Seed Users ONLY if table is empty
      db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (!err && row.count === 0) {
          const users = [
            ['admin', 'admin123', 'Administrator', 'Sistem Administrator'],
            ['entry', 'entry123', 'Petugas Entry Berkas', 'Petugas Loket Pendaftaran'],
            ['ukur', 'ukur123', 'Petugas Ukur', 'Budi Pengukur'],
            ['pemetaan', 'pemetaan123', 'Petugas Pemetaan', 'Andi Pemetaan'],
            ['koordinator', 'koor123', 'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral', 'Bapak Koordinator'],
            ['asisten_surveyor', 'asisten123', 'Asisten Surveyor Kadastral', 'Asisten Surveyor'],
            ['kasi', 'kasi123', 'Kepala Seksi Survei dan Pemetaan', 'Bapak Kepala Seksi'],
            ['penyelesaian', 'selesai123', 'Petugas Penyelesaian Berkas', 'Petugas Finalisasi'],
            ['entry_php', 'entryphp123', 'Petugas Entry Berkas PHP', 'Petugas Loket PHP'],
            ['alih_media', 'alih123', 'Petugas Alih Media', 'Petugas Digitalisasi'],
            ['penyerahan', 'serah123', 'Petugas Loket Penyerahan Produk', 'Petugas Loket Penyerahan']
          ];
          
          const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)`);
          users.forEach(u => {
            const hashedPassword = bcrypt.hashSync(u[1], 10);
            insertUser.run([u[0], hashedPassword, u[2], u[3]]);
          });
          insertUser.finalize();
        }
      });
    });
  }
});

// --- Rate Limiter for Login ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Terlalu banyak percobaan login dari IP ini, silakan coba lagi setelah 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- API Routes ---

// Login API
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const sessionId = require('crypto').randomBytes(16).toString('hex');

    // Mengelola sesi login (Maksimal 2 device)
    let activeSessions = user.session_id ? user.session_id.split(',') : [];
    if (activeSessions.length >= 2) {
      activeSessions.shift();
    }
    activeSessions.push(sessionId);
    const newSessionString = activeSessions.join(',');

    db.run('UPDATE users SET session_id = ? WHERE id = ?', [newSessionString, user.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: 'Gagal membuat sesi login' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, full_name: user.full_name, session_id: sessionId },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      res.json({ token, role: user.role, username: user.username, full_name: user.full_name, fullName: user.full_name });
    });
  });
});

// Middleware to verify JWT and Multi-Device Session
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Sesi berakhir atau tidak valid. Silakan login kembali.' });
      }
      
      db.get('SELECT session_id, full_name FROM users WHERE id = ?', [user.id], (dbErr, row) => {
        if (dbErr || !row) return res.sendStatus(403);
        
        const activeSessions = row.session_id ? row.session_id.split(',') : [];
        if (!activeSessions.includes(user.session_id)) {
          return res.status(403).json({ error: 'Sesi Ditolak: Anda telah login di perangkat lain melebihi batas (Maksimal 2). Perangkat ini dikeluarkan.' });
        }
        
        // Pastikan full_name terbaru dari DB selalu tersedia di req.user
        user.full_name = row.full_name || user.full_name;
        req.user = user;
        next();
      });
    });
  } else {
    res.sendStatus(401);
  }
};

// Middleware for Admin only
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role.includes('Administrator')) {
    next();
  } else {
    res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses Administrator.' });
  }
};

// Middleware for Admin, Kepala Seksi, or Koordinator
const requireAdminOrKasi = (req, res, next) => {
  if (req.user && (req.user.role.includes('Administrator') || req.user.role.includes('Kepala Seksi') || req.user.role.includes('Koordinator'))) {
    next();
  } else {
    res.status(403).json({ error: 'Akses ditolak. Memerlukan hak akses pimpinan.' });
  }
};


// ==========================================
// SURAT API
// ==========================================

// Create new surat
app.post('/api/surat', authenticateJWT, upload.single('pdf_file'), (req, res) => {
  const { asal_surat, nomor_surat, tanggal_diterima, perihal } = req.body;
  const filePath = req.file ? `/uploads/surat/${req.file.filename}` : null;

  db.get('SELECT nomor_agenda FROM surat ORDER BY id DESC LIMIT 1', (err, row) => {
    let nextAgendaNumber = 1;
    if (row && row.nomor_agenda) {
      nextAgendaNumber = parseInt(row.nomor_agenda, 10) + 1;
    }
    const nomorAgendaStr = nextAgendaNumber.toString().padStart(5, '0');

    db.run(`INSERT INTO surat (nomor_agenda, asal_surat, nomor_surat, tanggal_diterima, perihal, file_path) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      [nomorAgendaStr, asal_surat, nomor_surat, tanggal_diterima, perihal, filePath],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id: this.lastID, nomor_agenda: nomorAgendaStr, message: 'Surat berhasil ditambahkan' });
      }
    );
  });
});

// Get all surat
app.get('/api/surat', authenticateJWT, (req, res) => {
  db.all('SELECT * FROM surat ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get surat detail
app.get('/api/surat/:id', authenticateJWT, (req, res) => {
  db.get('SELECT * FROM surat WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Surat tidak ditemukan' });
    res.json(row);
  });
});

// ==========================================
// USER MANAGEMENT API (Admin Only)
// ==========================================

// Get all users
app.get('/api/users', authenticateJWT, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, full_name FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get simple user list for dropdowns (All logged-in users can access)
app.get('/api/users/list', authenticateJWT, (req, res) => {
  db.all('SELECT username, full_name, role FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new user
app.post('/api/users', authenticateJWT, requireAdmin, (req, res) => {
  const { username, password, role, full_name } = req.body;
  if (!username || !password || !role || !full_name) {
    return res.status(400).json({ error: 'Semua field termasuk Nama Lengkap harus diisi.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)', [username, hashedPassword, role, full_name], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username sudah digunakan.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, username, role, full_name, message: 'User berhasil ditambahkan.' });
  });
});

// Change own password
app.put('/api/users/change-password', authenticateJWT, (req, res) => {
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
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Gagal memperbarui kata sandi' });
      res.json({ message: 'Kata sandi berhasil diubah' });
    });
  });
});

// Update user
app.put('/api/users/:id', authenticateJWT, requireAdmin, (req, res) => {
  const { username, password, role, full_name } = req.body;
  const userId = req.params.id;

  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, oldUser) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!oldUser) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updateCallback = (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (oldUser.username !== username) {
        db.run('UPDATE file_history SET scanned_by_username = ? WHERE scanned_by_username = ?', [username, oldUser.username], (err2) => {
          if (err2) console.error("Error cascading username update to file_history:", err2);
          res.json({ message: 'User dan histori berhasil diperbarui.' });
        });
      } else {
        res.json({ message: 'User berhasil diperbarui.' });
      }
    };

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run('UPDATE users SET username = ?, password = ?, role = ?, full_name = ? WHERE id = ?', [username, hashedPassword, role, full_name, userId], updateCallback);
    } else {
      db.run('UPDATE users SET username = ?, role = ?, full_name = ? WHERE id = ?', [username, role, full_name, userId], updateCallback);
    }
  });
});

// Delete user
app.delete('/api/users/:id', authenticateJWT, requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User berhasil dihapus.' });
  });
});


// ==========================================
// FILE TRACKING API
// ==========================================

// Delete a file entry (Admin only)
app.delete('/api/files/:id', authenticateJWT, requireAdmin, (req, res) => {
  const fileId = req.params.id;
  db.run('DELETE FROM file_history WHERE file_id = ?', [fileId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run('DELETE FROM files WHERE id = ?', [fileId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: 'Berkas dan histori berhasil dihapus.' });
    });
  });
});

// Force complete a file entry (Admin only)
app.put('/api/files/:id/complete', authenticateJWT, requireAdmin, (req, res) => {
  const fileId = req.params.id;
  const fullName = req.user.full_name || req.user.username;

  db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

    if (file.current_location === 'Selesai') {
      return res.status(400).json({ error: 'Berkas sudah berstatus Selesai.' });
    }
    if (file.current_location === 'Ditutup') {
      return res.status(400).json({ error: 'Berkas berstatus Ditutup tidak bisa diselesaikan secara manual.' });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    let existingCatatan = file.catatan ? file.catatan + '\n\n' : '';
    const closeNote = existingCatatan + `-- Berkas diselesaikan secara manual oleh ${fullName} (Admin) pada ${timestamp}`;
    const newLocation = 'Selesai';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';

    db.run(
      'UPDATE files SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
      [newLocation, closeNote, fileId],
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        
        db.run(
          'INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
          [fileId, `${fullName} (Administrator)`, req.user.username, 'Selesai (Oleh Admin)', clientIp],
          function(historyErr) {
            if (historyErr) return res.status(500).json({ error: historyErr.message });
            res.json({ message: 'Berkas berhasil diselesaikan secara manual.' });
          }
        );
      }
    );
  });
});

// Close a file entry (Admin only)
app.put('/api/files/:id/close', authenticateJWT, requireAdmin, (req, res) => {
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
      return res.status(400).json({ error: 'Berkas berstatus Selesai tidak bisa ditutup.' });
    }
    if (file.current_location === 'Ditutup') {
      return res.status(400).json({ error: 'Berkas ini sudah berstatus Ditutup.' });
    }

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const closeNote = `-- Berkas ditutup oleh ${fullName} pada ${timestamp}:\nAlasan: ${alasan}`;
    
    let finalCatatan = file.catatan ? file.catatan + '\n\n' + closeNote : closeNote;

    const newLocation = 'Ditutup';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
    const roleUsed = req.user.role.includes('Administrator') ? 'Administrator' : req.user.role;
    const scannedBy = `${fullName} (${roleUsed})`;

    db.run(
      'UPDATE files SET current_location = ?, catatan = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?',
      [newLocation, finalCatatan, fileId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        db.run('INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
          [fileId, scannedBy, req.user.username, 'Ditutup (Oleh Admin)', clientIp],
          (historyErr) => {
            if (historyErr) return res.status(500).json({ error: historyErr.message });
            res.json({ message: 'Berkas berhasil ditutup.' });
          }
        );
      }
    );
  });
});


// Create a new file entry (Only Petugas Entry Berkas should do this ideally)
app.post('/api/files', authenticateJWT, (req, res) => {
  const { nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, fullName } = req.body;
  if (!req.user.role.includes('Petugas Entry Berkas') && !req.user.role.includes('Petugas Entry Berkas PHP') && !req.user.role.includes('Administrator')) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Petugas Entry yang dapat membuat entri.' });
  }

  const K2_Kegiatan = [
    'Pelepasan Sebagian Hak', 
    'Wakaf dari Tanah Yang Sudah Bersertipikat', 
    'Pendaftaran Tanah Pertama Kali Pemberian Hak', 
    'Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak', 
    'Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)', 
    'Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf',
    'Sertipikat Pengganti Karena Hilang/Lelang Eksekusi',
    'Sertipikat Pengganti Karena Rusak/Lama',
    'Permohonan SK'
  ];
  const isK2 = K2_Kegiatan.includes(nama_kegiatan);

  if (isK2 && !req.user.role.includes('Petugas Entry Berkas PHP') && !req.user.role.includes('Administrator')) {
    return res.status(403).json({ error: 'Permohonan Kelompok 2 hanya dapat dientri oleh Petugas Entry Berkas PHP.' });
  }
  if (!isK2 && !req.user.role.includes('Petugas Entry Berkas') && !req.user.role.includes('Administrator')) {
    return res.status(403).json({ error: 'Permohonan Kelompok 1 hanya dapat dientri oleh Petugas Entry Berkas.' });
  }

  db.get('SELECT id FROM files WHERE nomor_berkas = ? AND tahun_berkas = ?', [nomor_berkas, tahun_berkas], (checkErr, row) => {
    if (checkErr) return res.status(500).json({ error: 'Kesalahan database saat memeriksa duplikasi.' });
    if (row) return res.status(400).json({ error: `Berkas dengan nomor ${nomor_berkas}/${tahun_berkas} sudah pernah didaftarkan!` });

    const fileIdentifier = 'FILE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const qr_code = jwt.sign({ fileIdentifier }, JWT_SECRET);
    const initial_location = (req.user.role.includes('Petugas Entry Berkas PHP')) ? 'Petugas Entry Berkas PHP' : 'Loket Pendaftaran (Entry)';
    const effectiveFullName = fullName || req.user.full_name;
    const scannedBy = effectiveFullName ? `${effectiveFullName} (${req.user.role})` : req.user.role;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';

    db.run(
      'INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location) VALUES (?, ?, ?, ?, ?, ?)',
      [qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, initial_location],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        const fileId = this.lastID;
        
        db.run('INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
          [fileId, scannedBy, req.user.username, initial_location, clientIp],
          (historyErr) => {
            if (historyErr) console.error(historyErr);
            res.json({ id: fileId, qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location: initial_location });
          }
        );
      }
    );
  });
});

// Get all files (Dashboard)
app.get('/api/files', authenticateJWT, (req, res) => {
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

// Get active transit notifications for the logged-in user
app.get('/api/notifications/transit', authenticateJWT, (req, res) => {
  const username = req.user.username;
  const query = `
    SELECT f.id, f.qr_code, f.nomor_berkas, f.tahun_berkas, f.nama_kegiatan, f.nama_pemohon,
           f.current_location, f.is_transit, f.transit_to_username, f.transit_by_username, f.transit_at,
           u_by.full_name as transit_by_fullname,
           u_by.role as transit_by_role
    FROM files f
    LEFT JOIN users u_by ON f.transit_by_username = u_by.username
    WHERE f.is_transit = 1
      AND f.transit_to_username = ?
      AND f.current_location NOT IN ('Selesai', 'Ditutup')
    ORDER BY f.transit_at DESC, f.id DESC
  `;
  db.all(query, [username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get specific file and history by QR Code
app.get('/api/files/:qr_code', authenticateJWT, (req, res) => {
  const qr_code = req.params.qr_code;
  
  try {
    jwt.verify(qr_code, JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'QR Code tidak valid atau palsu.' });
  }
  db.get(`
    SELECT f.*, 
           u_to.full_name as transit_to_fullname,
           u_by.full_name as transit_by_fullname
    FROM files f
    LEFT JOIN users u_to ON f.transit_to_username = u_to.username
    LEFT JOIN users u_by ON f.transit_by_username = u_by.username
    WHERE f.qr_code = ?
  `, [qr_code], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

    db.all(`
      SELECT fh.*, u.full_name as user_full_name 
      FROM file_history fh
      LEFT JOIN users u ON fh.scanned_by_username = u.username
      WHERE fh.file_id = ? 
      ORDER BY fh.scanned_at DESC
    `, [file.id], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      file.history = (history || []).map(h => {
        if (h.user_full_name && h.scanned_by_role && !h.scanned_by_role.includes('(')) {
          return {
            ...h,
            scanned_by_role: `${h.user_full_name} (${h.scanned_by_role})`
          };
        }
        return h;
      });
      res.json(file);
    });
  });
});

// Update catatan file (Only for current handler or Administrator)
app.put('/api/files/:qr_code/note', authenticateJWT, (req, res) => {
  const qr_code = req.params.qr_code;
  const { catatan } = req.body;
  
  db.get('SELECT * FROM files WHERE qr_code = ?', [qr_code], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

    const userRoles = req.user.role ? req.user.role.split(',').map(r => r.trim()) : [];
    if (!userRoles.includes('Administrator') && !userRoles.includes(file.current_location)) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya pemegang berkas ini atau Administrator yang dapat mengubah catatan.' });
    }

    let finalCatatan = catatan;
    if (catatan && catatan !== file.catatan) {
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const fullName = req.user.full_name || req.user.username;
        let cleanCatatan = catatan.replace(/\n\n-- Terakhir diubah oleh.*?$/s, '');
        finalCatatan = cleanCatatan + `\n\n-- Terakhir diubah oleh ${fullName} pada ${timestamp}`;
    }

    db.run('UPDATE files SET catatan = ? WHERE qr_code = ?', [finalCatatan, qr_code], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      res.json({ message: 'Catatan berhasil disimpan', catatan: finalCatatan });
    });
  });
});

const FLOWS = {
  K1: [
    'Loket Pendaftaran (Entry)',
    'Petugas Ukur',
    'Asisten Surveyor Kadastral',
    'Petugas Pemetaan',
    'Petugas Alih Media',
    'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
    'Kepala Seksi Survei dan Pemetaan',
    'Petugas Penyelesaian Berkas',
    'Selesai'
  ],
  K2: [
    'Petugas Entry Berkas PHP',
    'Petugas Pemetaan',
    'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
    'Kepala Seksi Survei dan Pemetaan',
    'Petugas Penyelesaian Berkas',
    'Selesai'
  ]
};

const KELOMPOK_MAPPING = {
  'Pelepasan Sebagian Hak': 'K2',
  'Wakaf dari Tanah Yang Sudah Bersertipikat': 'K2',
  'Pendaftaran Tanah Pertama Kali Pemberian Hak': 'K2',
  'Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak': 'K2',
  'Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)': 'K2',
  'Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf': 'K2',
  'Sertipikat Pengganti Karena Hilang/Lelang Eksekusi': 'K2',
  'Sertipikat Pengganti Karena Rusak/Lama': 'K2',
  'Permohonan SK': 'K2'
};

// Daftar Tanggal Merah & Cuti Bersama (Format: YYYY-MM-DD)
const INDONESIAN_HOLIDAYS = [
  '2026-01-01', '2026-01-16', '2026-02-17', '2026-03-19', '2026-03-20', '2026-03-23', 
  '2026-03-24', '2026-04-03', '2026-05-01', '2026-05-14', '2026-05-27', '2026-06-01', 
  '2026-06-16', '2026-08-17', '2026-08-25', '2026-12-25'
];

function isHoliday(dateObj) {
  const dateStr = dateObj.getFullYear() + '-' + 
                  String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(dateObj.getDate()).padStart(2, '0');
  return INDONESIAN_HOLIDAYS.includes(dateStr);
}

// Helper to get working days
function getWorkingDays(startDateStr, endDateStr) {
  const start = startDateStr ? new Date(startDateStr.replace(' ', 'T') + 'Z') : new Date();
  const end = endDateStr ? new Date(endDateStr.replace(' ', 'T') + 'Z') : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start > end) return 0;
  let days = 0;
  let current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(current)) days++;
  }
  return days;
}

// Get files currently transiting to the logged-in user
app.get('/api/files/my-transits', authenticateJWT, (req, res) => {
  db.all('SELECT * FROM files WHERE is_transit = 1 AND transit_to_username = ?', [req.user.username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Send a file to transit (Kirim Berkas)
app.post('/api/files/:qr_code/transit', authenticateJWT, (req, res) => {
  const { qr_code } = req.params;
  const { target_username } = req.body;

  if (!target_username) {
    return res.status(400).json({ error: 'Target pengguna tujuan harus dipilih.' });
  }

  db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });
    
    if (file.current_location === 'Selesai' || file.current_location === 'Ditutup') {
      return res.status(400).json({ error: 'Berkas Selesai/Ditutup tidak bisa ditransit.' });
    }

    if (file.is_transit) {
      return res.status(400).json({ error: 'Berkas sudah dalam status transit.' });
    }

    db.get('SELECT full_name FROM users WHERE username = ?', [target_username], (userErr, targetUser) => {
      const targetFullName = targetUser && targetUser.full_name ? targetUser.full_name : target_username;
      const senderFullName = req.user.full_name || req.user.username;
      const scannedBy = `${senderFullName} (${req.user.role})`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
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
              if (historyErr) console.error("Error inserting transit history:", historyErr);
              res.json({ message: 'Berkas berhasil dikirim (transit).' });
            }
          );
        }
      );
    });
  });
});

// Cancel transit
app.post('/api/files/:qr_code/cancel-transit', authenticateJWT, (req, res) => {
  const { qr_code } = req.params;

  db.get(`SELECT * FROM files WHERE qr_code = ?`, [qr_code], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

    if (!file.is_transit) {
      return res.status(400).json({ error: 'Berkas tidak sedang dalam status transit.' });
    }

    const isAdmin = req.user.role && req.user.role.includes('Administrator');
    if (file.transit_by_username !== req.user.username && !isAdmin) {
      return res.status(403).json({ error: 'Hanya pengirim asli atau Administrator yang bisa membatalkan kiriman.' });
    }

    db.get('SELECT full_name FROM users WHERE username = ?', [file.transit_to_username], (userErr, targetUser) => {
      const targetFullName = targetUser && targetUser.full_name ? targetUser.full_name : file.transit_to_username;
      const cancelerFullName = req.user.full_name || req.user.username;
      const scannedBy = `${cancelerFullName} (${req.user.role})`;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
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
              if (historyErr) console.error("Error inserting cancel transit history:", historyErr);
              res.json({ message: 'Kiriman berkas berhasil dibatalkan.' });
            }
          );
        }
      );
    });
  });
});

// Pause SOP
app.post('/api/files/:qr_code/pause', authenticateJWT, (req, res) => {
  if (!req.user.role.includes('Administrator')) {
    return res.status(403).json({ error: 'Hanya Administrator yang dapat mem-pause berkas.' });
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
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'SOP Berkas berhasil di-pause.' });
      }
    );
  });
});

// Resume SOP
app.post('/api/files/:qr_code/resume', authenticateJWT, (req, res) => {
  if (!req.user.role.includes('Administrator')) {
    return res.status(403).json({ error: 'Hanya Administrator yang dapat melanjutkan berkas.' });
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
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'SOP Berkas berhasil dilanjutkan kembali.' });
      }
    );
  });
});

// Scan & Update file location
app.post('/api/files/scan', authenticateJWT, (req, res) => {
  const { qr_code, fullName, isFinishing, selected_role } = req.body;
  
  try {
    jwt.verify(qr_code, JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'QR Code tidak valid atau palsu.' });
  }

  const userRoles = req.user.role ? req.user.role.split(',').map(r => r.trim()) : [];

  db.get('SELECT * FROM files WHERE qr_code = ?', [qr_code], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File tidak ditemukan' });

    if (file.is_paused) {
      return res.status(400).json({ error: 'berkas tidak dapat dipindahkan karena belum membayar Surat Perintah Setor' });
    }

    // === STRICT TRANSIT RULE ===
    const isAdmin = req.user.role && req.user.role.includes('Administrator');
    
    if (file.is_transit !== 1 && !isAdmin) {
      return res.status(403).json({ error: 'Berkas ini belum dikirim (Transit) oleh petugas sebelumnya. Mintalah petugas sebelumnya untuk menekan tombol Kirim Berkas.' });
    }

    if (file.is_transit === 1 && req.user.username !== file.transit_to_username && !isAdmin) {
      return res.status(403).json({ error: `Berkas ini sedang dikirim ke meja petugas lain (${file.transit_to_username}). Hanya petugas tersebut yang bisa memindai.` });
    }
    // ===========================

    if (file.current_location === 'Selesai') {
      return res.status(400).json({ error: 'Berkas ini sudah berstatus Selesai dan tidak dapat diproses lagi.' });
    }

    if (file.current_location === 'Ditutup') {
      return res.status(400).json({ error: 'Berkas ini sudah ditutup dan tidak dapat diproses lagi.' });
    }

    if (userRoles.length > 1 && !selected_role) {
      db.all('SELECT scanned_by_role FROM file_history WHERE file_id = ? AND scanned_by_username = ? ORDER BY scanned_at ASC', [file.id, req.user.username], (historyErr, rows) => {
        if (historyErr) return res.status(500).json({ error: historyErr.message });
        
        const usedRoles = rows.map(r => {
          const match = r.scanned_by_role.match(/\((.*?)\)$/);
          return match ? match[1] : r.scanned_by_role;
        });

        const rolesUsedByThisUser = userRoles.filter(r => usedRoles.includes(r));
        const unusedRoles = userRoles.filter(r => !usedRoles.includes(r));

        if (rolesUsedByThisUser.length > 0 && unusedRoles.length > 0) {
          const suggestedRole = unusedRoles[0];
          const lastUsedRole = rolesUsedByThisUser[rolesUsedByThisUser.length - 1];
          return res.status(400).json({ 
            requires_smart_confirmation: true, 
            suggested_role: suggestedRole,
            last_used_role: lastUsedRole,
            available_roles: userRoles
          });
        } else {
          return res.status(400).json({
            requires_role_selection: true,
            available_roles: userRoles
          });
        }
      });
      return;
    }

    let activeRole = selected_role || userRoles[0];

    if (!userRoles.includes(activeRole)) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk jabatan tersebut.' });
    }

    let new_location = activeRole;
    let custom_message = null;
    if (activeRole === 'Petugas Penyelesaian Berkas') {
      const kegiatanKelompok1 = ['Pengukuran dan Pemetaan Kadastral', 'Pemecahan Bidang', 'Penggabungan Bidang', 'Pemisahan Bidang', 'Penataan Batas'];
      const kegiatanK2 = ['Pelepasan Sebagian Hak', 'Wakaf dari Tanah Yang Sudah Bersertipikat', 'Pendaftaran Tanah Pertama Kali Pemberian Hak', 'Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak', 'Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)', 'Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf', 'Sertipikat Pengganti Karena Hilang/Lelang Eksekusi', 'Sertipikat Pengganti Karena Rusak/Lama', 'Permohonan SK'];
      
      if (!kegiatanKelompok1.includes(file.nama_kegiatan) && !kegiatanK2.includes(file.nama_kegiatan)) {
         return res.status(400).json({ error: 'Berkas ini bukan kegiatan Kelompok 1 atau Kelompok 2, Anda tidak dapat memprosesnya sebagai Petugas Penyelesaian.' });
      }

      new_location = 'Petugas Penyelesaian Berkas';
    } else if (activeRole === 'Petugas Loket Penyerahan Produk') {
      if (file.nama_kegiatan === 'Pengukuran dan Pemetaan Kadastral') {
        if (file.current_location !== 'Petugas Penyelesaian Berkas') {
          return res.status(400).json({ error: 'Berkas Pengukuran dan Pemetaan Kadastral harus diserahkan dari Petugas Penyelesaian Berkas.' });
        }
        new_location = 'Selesai';
        custom_message = 'Berkas Telah Diserahkan ke Pemohon (Selesai)';
      } else {
        new_location = 'Petugas Loket Penyerahan Produk';
      }
    } else if (activeRole === 'Petugas Seksi PHP') {
      const kegiatanKhususPHP = ['Pemecahan Bidang', 'Penggabungan Bidang', 'Pemisahan Bidang', 'Penataan Batas'];
      const kegiatanK2 = ['Pelepasan Sebagian Hak', 'Wakaf dari Tanah Yang Sudah Bersertipikat', 'Pendaftaran Tanah Pertama Kali Pemberian Hak', 'Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak', 'Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)', 'Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf', 'Sertipikat Pengganti Karena Hilang/Lelang Eksekusi', 'Sertipikat Pengganti Karena Rusak/Lama', 'Permohonan SK'];
      
      if (file.nama_kegiatan === 'Pengukuran dan Pemetaan Kadastral') {
        return res.status(400).json({ error: 'Mekanisme ini tidak berlaku untuk kegiatan Pengukuran dan Pemetaan Kadastral.' });
      }

      if (kegiatanKhususPHP.includes(file.nama_kegiatan)) {
        if (file.current_location === 'Petugas Penyelesaian Berkas') {
          new_location = 'Selesai';
          custom_message = 'Berkas Telah Selesai di Seksi SP dan diserahkan ke Seksi PHP';
        } else {
          new_location = 'Petugas Seksi PHP';
        }
      } else if (kegiatanK2.includes(file.nama_kegiatan)) {
        if (file.current_location === 'Petugas Penyelesaian Berkas') {
          new_location = 'Selesai';
          custom_message = 'Berkas Telah Selesai di Seksi PHP';
        } else {
          new_location = 'Petugas Seksi PHP';
        }
      } else {
        if (file.current_location === 'Petugas Distribusi Berkas Ke Seksi PHP') {
          new_location = 'Selesai';
          custom_message = 'Berkas Telah Selesai di Seksi SP';
        } else {
          new_location = 'Petugas Seksi PHP';
        }
      }
    } else if (activeRole === 'Petugas Entry Berkas') {
      new_location = 'Loket Pendaftaran (Entry)';
    }

    if (file.current_location === new_location) {
      db.get('SELECT scanned_by_username, scanned_by_role FROM file_history WHERE file_id = ? ORDER BY scanned_at DESC LIMIT 1', [file.id], (historyErr, row) => {
        const lastUsername = row ? row.scanned_by_username : null;
        
        if (lastUsername && lastUsername !== req.user.username) {
          return proceedUpdate(activeRole, new_location, `Berkas dipindahtangankan ke Anda di posisi ${activeRole}.`);
        } else {
          const nama = row ? row.scanned_by_role : file.current_location;
          return res.status(400).json({ error: `Posisi berkas sudah berada di ${nama}` });
        }
      });
      return;
    }

    proceedUpdate(activeRole, new_location, custom_message);

    function proceedUpdate(roleUsed, locationToSet, successMessage) {
      const effectiveFullName = fullName || req.user.full_name;
      const scannedBy = effectiveFullName ? `${effectiveFullName} (${roleUsed})` : roleUsed;
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';

      db.run('UPDATE files SET current_location = ?, is_transit = 0, transit_to_username = NULL, transit_by_username = NULL, transit_at = NULL WHERE id = ?', [locationToSet, file.id], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        db.run('INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_ip) VALUES (?, ?, ?, ?, ?)',
          [file.id, scannedBy, req.user.username, locationToSet, clientIp],
          (historyErr) => {
            if (historyErr) return res.status(500).json({ error: historyErr.message });
            res.json({ message: successMessage || 'Lokasi berkas berhasil diperbarui.', current_location: locationToSet });
          }
        );
      });
    }
  });
});

// ==========================================
// LEADERSHIP REPORTING API
// ==========================================

// Dashboard Analytics
app.get('/api/reports/dashboard', authenticateJWT, requireAdminOrKasi, (req, res) => {
  const analytics = {
    totalFiles: 0,
    completedFiles: 0,
    activeFiles: 0,
    closedFiles: 0,
    averageDays: 0
  };

  db.all('SELECT * FROM files', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    analytics.totalFiles = rows.length;

    rows.forEach(file => {
      if (file.current_location === 'Selesai') {
        analytics.completedFiles++;
      } else if (file.current_location === 'Ditutup') {
        analytics.closedFiles++;
      } else {
        analytics.activeFiles++;
      }
    });

    res.json(analytics);
  });
});

// Detailed Files Report
app.get('/api/reports/files', authenticateJWT, requireAdminOrKasi, (req, res) => {
  const query = `
    SELECT f.*, 
           u_to.full_name as transit_to_fullname,
           (SELECT scanned_by_role FROM file_history fh WHERE fh.file_id = f.id ORDER BY scanned_at DESC LIMIT 1) as latest_scan_info
    FROM files f 
    LEFT JOIN users u_to ON f.transit_to_username = u_to.username
    ORDER BY f.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// KPI Analytics
app.get('/api/reports/kpi', authenticateJWT, requireAdminOrKasi, (req, res) => {
  db.all(`
    SELECT fh.file_id, fh.scanned_by_username, fh.scanned_by_role, fh.scanned_at, f.nama_kegiatan, fh.location, f.is_transit, f.transit_at, u.full_name as user_full_name
    FROM file_history fh
    JOIN files f ON fh.file_id = f.id
    LEFT JOIN users u ON fh.scanned_by_username = u.username
    ORDER BY fh.file_id, fh.scanned_at ASC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const filesHistory = {};
    rows.forEach(r => {
      if (!filesHistory[r.file_id]) filesHistory[r.file_id] = [];
      filesHistory[r.file_id].push(r);
    });

    const kpiData = {};
    const now = new Date();

    Object.values(filesHistory).forEach(history => {
      for (let i = 0; i < history.length; i++) {
        const current = history[i];
        if (!current.scanned_by_username) continue;

        const startTime = new Date(current.scanned_at);
        let endTime = now;
        
        if (i < history.length - 1) {
          endTime = new Date(history[i+1].scanned_at);
        } else {
          if (current.location === 'Selesai' || current.location === 'Ditutup') continue;
          if (current.is_transit === 1 && current.transit_at) {
            endTime = new Date(current.transit_at.replace(' ', 'T') + 'Z');
          }
        }

        let diffMs = endTime - startTime;
        
        let loopDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
        const endDateObj = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
        let weekendMs = 0;
        
        while (loopDate <= endDateObj) {
          const day = loopDate.getDay();
          if (day === 0 || day === 6) {
            let dayStart = new Date(loopDate);
            let dayEnd = new Date(loopDate);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            let overlapStart = startTime > dayStart ? startTime : dayStart;
            let overlapEnd = endTime < dayEnd ? endTime : dayEnd;
            
            if (overlapStart < overlapEnd) {
              weekendMs += (overlapEnd - overlapStart);
            }
          }
          loopDate.setDate(loopDate.getDate() + 1);
        }
        
        diffMs -= weekendMs;
        const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));

        const formattedRoleHint = (current.user_full_name && current.scanned_by_role && !current.scanned_by_role.includes('('))
          ? `${current.user_full_name} (${current.scanned_by_role})`
          : current.scanned_by_role;

        if (!kpiData[current.scanned_by_username]) {
          kpiData[current.scanned_by_username] = { 
            username: current.scanned_by_username,
            role_hint: formattedRoleHint,
            totalHours: 0, 
            count: 0,
            byType: {}
          };
        } else if (formattedRoleHint && formattedRoleHint.includes('(')) {
          kpiData[current.scanned_by_username].role_hint = formattedRoleHint;
        }

        const userKpi = kpiData[current.scanned_by_username];
        userKpi.totalHours += diffHours;
        userKpi.count += 1;

        if (!userKpi.byType[current.nama_kegiatan]) {
          userKpi.byType[current.nama_kegiatan] = { totalHours: 0, count: 0 };
        }
        userKpi.byType[current.nama_kegiatan].totalHours += diffHours;
        userKpi.byType[current.nama_kegiatan].count += 1;
      }
    });

    const result = Object.values(kpiData).map(u => {
      const breakdown = Object.keys(u.byType).map(type => ({
        jenisBerkas: type,
        rataRataJam: Number((u.byType[type].totalHours / u.byType[type].count).toFixed(2)),
        jumlahInteraksi: u.byType[type].count
      }));
      return {
        username: u.username,
        roleHint: u.role_hint,
        rataRataTotalJam: Number((u.totalHours / u.count).toFixed(2)),
        jumlahInteraksi: u.count,
        breakdown
      };
    });

    res.json(result);
  });
});

// --- API DISPOSISI PIMPINAN ---

// GET /api/files/:qrcode/disposisi
app.get('/api/files/:qrcode/disposisi', authenticateJWT, (req, res) => {
  const qrCode = req.params.qrcode;
  db.get('SELECT id FROM files WHERE qr_code = ?', [qrCode], (err, file) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!file) return res.status(404).json({ error: 'Berkas tidak ditemukan' });

    db.all('SELECT * FROM disposisi WHERE file_id = ? ORDER BY dibuat_pada DESC', [file.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Gagal mengambil disposisi' });
      res.json(rows || []);
    });
  });
});

// POST /api/files/:qrcode/disposisi
app.post('/api/files/:qrcode/disposisi', authenticateJWT, (req, res) => {
  const isPimpinan = req.user.role.includes('Koordinator') || req.user.role.includes('Kepala Seksi') || req.user.role.includes('Administrator');
  if (!isPimpinan) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya pimpinan yang dapat membuat disposisi.' });
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
      function (err) {
        if (err) return res.status(500).json({ error: 'Gagal menyimpan disposisi' });
        res.json({ message: 'Disposisi berhasil ditambahkan', id: this.lastID });
      }
    );
  });
});

// PUT /api/disposisi/:id/selesai
app.put('/api/disposisi/:id/selesai', authenticateJWT, (req, res) => {
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

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const http = require('http');
const https = require('https');

app.listen(PORT, () => {
  console.log(`HTTP Backend server is running on http://localhost:${PORT}`);
});

// Start HTTPS server if certificates exist
try {
  const keyPath = path.join(__dirname, 'key.pem');
  const certPath = path.join(__dirname, 'cert.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const privateKey = fs.readFileSync(keyPath, 'utf8');
    const certificate = fs.readFileSync(certPath, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    
    const httpsServer = https.createServer(credentials, app);
    const HTTPS_PORT = PORT + 1;
    
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`HTTPS Backend server is running on https://localhost:${HTTPS_PORT}`);
    });
  }
} catch (err) {
  console.error("Failed to start HTTPS server:", err.message);
}