const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Menyuntikkan data dummy untuk KPI...");

db.serialize(() => {
  // Insert File 1
  db.run(`INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location, created_at) 
          VALUES ('dummy_kpi_1', '101', '2026', 'Pendaftaran Hak Milik', 'Ahmad Dani', 'Selesai', datetime('now', '-7 days'))`);
  
  // Insert File 2
  db.run(`INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location, created_at) 
          VALUES ('dummy_kpi_2', '102', '2026', 'Pemecahan Bidang', 'Budi Santoso', 'Petugas Ukur', datetime('now', '-2 days'))`);

  // Insert File 3
  db.run(`INSERT INTO files (qr_code, nomor_berkas, tahun_berkas, nama_kegiatan, nama_pemohon, current_location, created_at) 
          VALUES ('dummy_kpi_3', '103', '2026', 'Pendaftaran Hak Milik', 'Cici Pertiwi', 'Selesai', datetime('now', '-10 days'))`);

  db.all('SELECT id, qr_code FROM files WHERE qr_code IN ("dummy_kpi_1", "dummy_kpi_2", "dummy_kpi_3")', [], (err, rows) => {
    if (err) throw err;
    
    const file1 = rows.find(r => r.qr_code === 'dummy_kpi_1').id;
    const file2 = rows.find(r => r.qr_code === 'dummy_kpi_2').id;
    const file3 = rows.find(r => r.qr_code === 'dummy_kpi_3').id;

    // File 1 History (Jude took 2 days, Mario took 1 day)
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Jude Bellingham (Petugas Ukur)', 'jude', 'Petugas Ukur', datetime('now', '-6 days'))`, [file1]);
    
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Mario Balotelli (Petugas Penyelesaian Berkas)', 'mario', 'Petugas Penyelesaian Berkas', datetime('now', '-4 days'))`, [file1]);
            
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Mario Balotelli (Petugas Penyelesaian Berkas)', 'mario', 'Selesai', datetime('now', '-3 days'))`, [file1]);

    // File 2 History (Jude is still holding it since 1 day ago)
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Jude Bellingham (Petugas Ukur)', 'jude', 'Petugas Ukur', datetime('now', '-1 days'))`, [file2]);

    // File 3 History (Jude took 5 days)
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Jude Bellingham (Petugas Ukur)', 'jude', 'Petugas Ukur', datetime('now', '-9 days'))`, [file3]);
            
    db.run(`INSERT INTO file_history (file_id, scanned_by_role, scanned_by_username, location, scanned_at) 
            VALUES (?, 'Mario Balotelli (Petugas Penyelesaian Berkas)', 'mario', 'Selesai', datetime('now', '-4 days'))`, [file3]);

    console.log("Data dummy KPI berhasil disuntikkan.");
  });
});

setTimeout(() => {
  db.close();
}, 2000);
