#!/bin/bash
set -eu

# Pastikan PATH menyertakan binary Docker bawaan QNAP Container Station saat dijalankan via cron
export PATH="/share/CACHEDEV1_DATA/.qpkg/container-station/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Arahkan script ke direktori tempat script ini berada (folder file-tracker)
cd "$(dirname "$0")"

mkdir -p backups

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

echo "========================================"
echo "Memulai proses backup & verifikasi: $TIMESTAMP"
echo "========================================"

run_verified_backup() {
  # Jalur utama: jalankan via container pantau-sp (memakai sqlite3@6 / VACUUM INTO + uji integritas)
  if command -v docker >/dev/null 2>&1; then
    if docker compose exec -T pantau-sp test -f /app/backend/scripts/backup-db.js >/dev/null 2>&1 &&
       docker compose exec -T pantau-sp node -e "const fs=require('fs'); process.exit(fs.existsSync('/app/backups') ? 0 : 1)" >/dev/null 2>&1; then
      echo "Menjalankan backup online SQLite VACUUM INTO di container pantau-sp..."
      docker compose exec -T pantau-sp node /app/backend/scripts/backup-db.js
      return 0
    fi
  fi

  # Fallback 1: Node.js host jika tersedia beserta dependensi backend/node_modules
  if command -v node >/dev/null 2>&1 && [ -f "backend/scripts/backup-db.js" ] && [ -d "backend/node_modules/sqlite3" ]; then
    echo "Menjalankan backup online SQLite VACUUM INTO via Node.js host..."
    node backend/scripts/backup-db.js
    return 0
  fi

  # Fallback 2: CLI sqlite3 host dengan verifikasi PRAGMA integrity_check eksplisit
  if command -v sqlite3 >/dev/null 2>&1; then
    BACKUP_FILENAME="backups/database_backup_$TIMESTAMP.sqlite"
    TMP_COPY=""
    cleanup_tmp() {
      if [ -n "$TMP_COPY" ] && [ -f "$TMP_COPY" ]; then
        rm -f "$TMP_COPY"
      fi
    }
    trap cleanup_tmp EXIT

    echo "Menyalin database via sqlite3 .backup ke $BACKUP_FILENAME..."
    sqlite3 backend/database.sqlite ".backup '$BACKUP_FILENAME'"

    TMP_COPY=$(mktemp "${TMPDIR:-/tmp}/pantau-sp-restore-XXXXXX.sqlite")
    cp "$BACKUP_FILENAME" "$TMP_COPY"
    INTEGRITY_RESULT=$(sqlite3 "$TMP_COPY" "PRAGMA integrity_check;" | tr -d '\r\n')
    if [ "$INTEGRITY_RESULT" != "ok" ]; then
      echo "[ERROR] Backup gagal uji integritas PRAGMA integrity_check: $INTEGRITY_RESULT" >&2
      rm -f "$BACKUP_FILENAME"
      return 1
    fi
    echo "[Restore Check] Lulus PRAGMA integrity_check=ok"
    find backups/ -name "database_backup_*.sqlite" -type f -mtime +30 -exec rm -f {} \;
    return 0
  fi

  echo "[ERROR] Tidak ditemukan container pantau-sp (/app/backups ter-mount), Node.js, maupun binary sqlite3." >&2
  return 1
}

run_verified_backup

echo "Backup dan uji integritas selesai."
echo "========================================"
