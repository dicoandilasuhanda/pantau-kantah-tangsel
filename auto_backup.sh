#!/bin/bash

# Pastikan PATH menyertakan binary Docker bawaan QNAP Container Station saat dijalankan via cron
export PATH="/share/CACHEDEV1_DATA/.qpkg/container-station/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Arahkan script ke direktori tempat script ini berada (folder file-tracker)
cd "$(dirname "$0")"

# Buat folder 'backups' jika belum ada
mkdir -p backups

# Ambil tanggal dan waktu saat ini (Format: Tahun-Bulan-Tanggal_Jam-Menit)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILENAME="backups/database_backup_$TIMESTAMP.sqlite"

echo "========================================"
echo "Memulai proses backup: $TIMESTAMP"
echo "========================================"

# 1. Gandakan file database secara online dan aman (tanpa mematikan container)
echo "Menyalin database secara online ke $BACKUP_FILENAME..."
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 backend/database.sqlite ".backup '$BACKUP_FILENAME'"
else
  # Fallback jika binary sqlite3 belum ada di host
  docker compose exec -T pantau-sp sqlite3 /app/backend/database.sqlite ".backup '/app/$BACKUP_FILENAME'" 2>/dev/null || cp backend/database.sqlite "$BACKUP_FILENAME"
fi

echo "Backup berhasil!"

# 4. (Opsional & Cerdas) Hapus file backup yang berumur lebih dari 30 hari agar penyimpanan NAS tidak penuh
echo "Membersihkan backup lama (lebih dari 30 hari)..."
find backups/ -name "database_backup_*.sqlite" -type f -mtime +30 -exec rm {} \;

echo "Selesai."
echo "========================================"
