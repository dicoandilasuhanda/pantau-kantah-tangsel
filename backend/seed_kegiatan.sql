CREATE TABLE IF NOT EXISTS master_kegiatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kelompok TEXT,
  nama_kegiatan TEXT,
  sla_hari INTEGER,
  is_prioritas INTEGER DEFAULT 0
);

DELETE FROM master_kegiatan;
