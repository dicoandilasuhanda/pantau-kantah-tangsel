#!/bin/bash

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

# 1. Matikan sementara container aplikasi (agar file database tidak sedang ditulis saat dicopy)
echo "Menghentikan layanan sementara..."
docker compose stop pantau-sp

# 2. Gandakan file database ke folder backups
echo "Menyalin database ke $BACKUP_FILENAME..."
cp backend/database.sqlite "$BACKUP_FILENAME"

# 3. Nyalakan kembali container aplikasi
echo "Menyalakan kembali layanan..."
docker compose start pantau-sp

echo "Backup berhasil!"

# 4. (Opsional & Cerdas) Hapus file backup yang berumur lebih dari 30 hari agar penyimpanan NAS tidak penuh
echo "Membersihkan backup lama (lebih dari 30 hari)..."
find backups/ -name "database_backup_*.sqlite" -type f -mtime +30 -exec rm {} \;

echo "Selesai."
echo "========================================"
