const sqlite3 = require('sqlite3').verbose();

/**
 * Inisialisasi koneksi SQLite, pembuatan tabel, migrasi kolom aman (idempotent),
 * pembuatan indeks performa, backfill histori lama, serta seeding pengguna awal.
 */
function initDatabase({ dbPath, jwt, jwtSecret, bcrypt }) {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
      return;
    }

    console.log('Connected to the SQLite database.');

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        full_name TEXT
      )`);

      // Try to alter table for existing databases (ignore error if column already exists)
      db.run(`ALTER TABLE users ADD COLUMN full_name TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN session_id TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN last_active_at DATETIME`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN last_ip TEXT`, () => {});

      db.run(`CREATE TABLE IF NOT EXISTS user_dwg_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        sender_id INTEGER,
        recipient_id INTEGER,
        original_name TEXT,
        file_name TEXT,
        file_size INTEGER,
        notes TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.run(`ALTER TABLE user_dwg_files ADD COLUMN sender_id INTEGER`, () => {});
      db.run(`ALTER TABLE user_dwg_files ADD COLUMN recipient_id INTEGER`, () => {});
      db.run(`ALTER TABLE user_dwg_files ADD COLUMN notes TEXT`, () => {});

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
      db.run(`ALTER TABLE file_history ADD COLUMN scanned_by_username TEXT`, () => {});

      // Alter files to add catatan dan pause SOP
      db.run(`ALTER TABLE files ADD COLUMN catatan TEXT`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN is_paused INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN paused_at DATETIME`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN total_paused_days INTEGER DEFAULT 0`, () => {});

      // Alter files for transit feature
      db.run(`ALTER TABLE files ADD COLUMN is_transit INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_to_username TEXT`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_by_username TEXT`, () => {});
      db.run(`ALTER TABLE files ADD COLUMN transit_at DATETIME`, () => {});

      // Alter users for Telegram Bot notification feature
      db.run(`ALTER TABLE users ADD COLUMN telegram_chat_id TEXT`, () => {});

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
        current_location TEXT DEFAULT 'Petugas Entry Surat',
        catatan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`ALTER TABLE surat ADD COLUMN current_location TEXT DEFAULT 'Petugas Entry Surat'`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN catatan TEXT`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN is_transit INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN transit_to_username TEXT`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN transit_by_username TEXT`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN transit_at DATETIME`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN client_ip TEXT`, () => {});
      db.run(`ALTER TABLE surat ADD COLUMN qr_code TEXT`, () => {});
      db.run(
        `UPDATE surat SET current_location = 'Petugas Entry Surat' WHERE current_location IS NULL OR current_location = ''`,
        () => {}
      );

      // Backfill token kriptografis QR Code untuk surat lama
      db.all(
        "SELECT id, nomor_agenda FROM surat WHERE qr_code IS NULL OR qr_code = ''",
        (qErr, rows) => {
          if (!qErr && rows && rows.length > 0) {
            rows.forEach((r) => {
              const suratIdentifier = `SURAT-${r.nomor_agenda}-${Date.now()}`;
              const token = jwt.sign(
                { suratIdentifier, nomor_agenda: r.nomor_agenda },
                jwtSecret
              );
              db.run('UPDATE surat SET qr_code = ? WHERE id = ?', [token, r.id]);
            });
          }
        }
      );

      db.run(`CREATE TABLE IF NOT EXISTS surat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        surat_id INTEGER,
        scanned_by_role TEXT,
        scanned_by_username TEXT,
        location TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scanned_ip TEXT,
        FOREIGN KEY(surat_id) REFERENCES surat(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS surat_disposisi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        surat_id INTEGER,
        isi_disposisi TEXT,
        dibuat_oleh TEXT,
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Menunggu Tindak Lanjut',
        dilaksanakan_oleh TEXT,
        dilaksanakan_pada DATETIME,
        FOREIGN KEY(surat_id) REFERENCES surat(id)
      )`);

      // Backfill surat_history untuk surat lama yang belum memiliki histori awal
      db.run(
        `
        INSERT INTO surat_history (surat_id, scanned_by_role, scanned_by_username, location, scanned_at)
        SELECT s.id, 'Petugas Entry Surat', 'admin', COALESCE(s.current_location, 'Petugas Entry Surat'), COALESCE(s.created_at, CURRENT_TIMESTAMP)
        FROM surat s
        WHERE NOT EXISTS (SELECT 1 FROM surat_history sh WHERE sh.surat_id = s.id)
      `,
        () => {}
      );

      // Index performa query SQLite
      db.run(`CREATE INDEX IF NOT EXISTS idx_file_history_file_id ON file_history(file_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_file_history_scanned_at ON file_history(scanned_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_surat_history_surat_id ON surat_history(surat_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_surat_history_scanned_at ON surat_history(scanned_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_files_nomor_tahun ON files(nomor_berkas, tahun_berkas)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_files_transit ON files(is_transit, transit_to_username)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_chat_id)`);

      // Tabel Saran & Ide Fitur Pengguna
      db.run(`CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        full_name TEXT,
        role TEXT,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Fitur Baru',
        description TEXT NOT NULL,
        status TEXT DEFAULT 'Menunggu Review',
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at)`);

      db.run(`PRAGMA foreign_keys = ON`);

      // One-time patch for Syahrul's orphaned history (flexible matching)
      db.run(
        `UPDATE file_history SET scanned_by_username = 'syahrul' WHERE scanned_by_username LIKE '%yahrul%' AND scanned_by_username != 'syahrul'`,
        () => {}
      );

      // Auto-repair file_history records where full_name was missing (only role was saved)
      db.run(
        `
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
      `,
        () => {}
      );

      // Seed Users ONLY if table is empty
      db.get('SELECT COUNT(*) AS count FROM users', (countErr, row) => {
        if (!countErr && row && row.count === 0) {
          const users = [
            ['admin', 'admin123', 'Administrator', 'Sistem Administrator'],
            ['entry', 'entry123', 'Petugas Entry Berkas', 'Petugas Loket Pendaftaran'],
            ['ukur', 'ukur123', 'Petugas Ukur', 'Budi Pengukur'],
            ['pemetaan', 'pemetaan123', 'Petugas Pemetaan', 'Andi Pemetaan'],
            [
              'koordinator',
              'koor123',
              'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
              'Bapak Koordinator',
            ],
            ['asisten_surveyor', 'asisten123', 'Asisten Surveyor Kadastral', 'Asisten Surveyor'],
            ['kasi', 'kasi123', 'Kepala Seksi Survei dan Pemetaan', 'Bapak Kepala Seksi'],
            ['penyelesaian', 'selesai123', 'Petugas Penyelesaian Berkas', 'Petugas Finalisasi'],
            ['entry_php', 'entryphp123', 'Petugas Entry Berkas PHP', 'Petugas Loket PHP'],
            ['alih_media', 'alih123', 'Petugas Alih Media', 'Petugas Digitalisasi'],
            ['penyerahan', 'serah123', 'Petugas Loket Penyerahan Produk', 'Petugas Loket Penyerahan'],
          ];

          const insertUser = db.prepare(
            `INSERT OR IGNORE INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)`
          );
          users.forEach((u) => {
            const hashedPassword = bcrypt.hashSync(u[1], 10);
            insertUser.run([u[0], hashedPassword, u[2], u[3]]);
          });
          insertUser.finalize();
        }
      });
    });
  });

  return db;
}

module.exports = {
  initDatabase,
};
