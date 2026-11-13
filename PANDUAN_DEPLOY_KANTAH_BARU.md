# Panduan Instalasi & Replikasi (Serah Terima) Pantau.Kantah untuk Kantor Pertanahan Baru

Dokumen ini berisi panduan teknis langkah demi langkah untuk menduplikasi atau menginstalasi proyek **Pantau.Kantah (Sistem Terpadu Monitoring Berkas, Persuratan, Analitik KPI, Ruang Kerja DWG, & PDF Tools)** agar dapat digunakan oleh Kantor Pertanahan (Kantah) lain, baik di dalam server NAS (QNAP/Synology) yang sama maupun pada server baru yang terpisah.

---

## Tahap 1: Menduplikasi atau Mengkloning Direktori Proyek

### Opsi A — Kloning Langsung dari GitHub (Server Baru)
```bash
git clone https://github.com/dicoandilasuhanda/pantau-kantah-tangsel.git "/share/Pantau Kantah Baru/file-tracker"
cd "/share/Pantau Kantah Baru/file-tracker"
```

### Opsi B — Menyalin Folder dari Server NAS yang Sama
Gunakan *File Station* di NAS atau terminal (SSH) untuk menyalin folder sistem ke direktori baru:
```bash
cd "/share/Pantau SP Tangsel"
cp -r "file-tracker" "/share/Pantau Kantah Baru/file-tracker"
```

---

## Tahap 2: Reset Database & Direktori Unggahan (Wajib Jika Menyalin Folder)

Jika Anda menyalin folder dari aplikasi yang sedang berjalan (Opsi B), berkas database (`database.sqlite`) dan arsip unggahan (`uploads/`) milik Kantah Tangerang Selatan akan ikut tersalin. **Wajib bersihkan berkas tersebut agar sistem Kantah baru dimulai dari kondisi kosong (*fresh*):**

```bash
cd "/share/Pantau Kantah Baru/file-tracker/backend"

# 1. Hapus database lama (sistem akan otomatis membuat database.sqlite baru & akun default saat dinyalakan)
rm -f database.sqlite

# 2. Bersihkan isi folder uploads (PDF surat, file AutoCAD .dwg, dan foto profil) namun pertahankan foldernya
rm -rf uploads/surat/* uploads/dwg/* uploads/avatars/*
mkdir -p uploads/surat uploads/dwg uploads/avatars
mkdir -p ../backups
```

> [!NOTE]
> Saat kontainer backend pertama kali dijalankan tanpa `database.sqlite`, sistem secara otomatis membuat 10 tabel lengkap (`users`, `files`, `file_history`, `disposisi`, `surat`, `surat_history`, `surat_disposisi`, `user_dwg_files`, `suggestions`, `audit_logs`) beserta akun awal (termasuk Administrator `admin` / `admin123`).

---

## Tahap 3: Konfigurasi `.env` & `docker-compose.yml` (Mencegah Bentrok Port & Container)

1. Salin template `.env.example` menjadi `.env` di root direktori proyek, lalu isi `JWT_SECRET` (acak minimal 32 karakter, misal `openssl rand -hex 32`), `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` (kosongkan bila belum memakai Bot Telegram), dan `CLOUDFLARE_TUNNEL_TOKEN` (jika menggunakan Cloudflare Tunnel):
   ```bash
   cp .env.example .env
   ```

2. Buka berkas `docker-compose.yml` dan sesuaikan nama *service*, `container_name`, serta mapping *port*:

```yaml
services:
  pantau-kantahbaru:
    build: .
    container_name: pantau-kantahbaru-app
    restart: always
    ports:
      - "3011:3001"   # Port HTTP (Ubah angka KIRI jika berada di server NAS yang sama, misal 3011:3001)
      - "3012:3002"   # Port HTTPS Lokal (Ubah angka KIRI, misal 3012:3002)
    volumes:
      # PENTING: Mapping data persisten, modul backend, backup, & build statis ke host NAS
      - ./backend/database.sqlite:/app/backend/database.sqlite
      - ./backend/uploads:/app/backend/uploads
      - ./backend/server.js:/app/backend/server.js
      - ./backend/validation.js:/app/backend/validation.js
      - ./backend/src:/app/backend/src
      - ./backend/scripts:/app/backend/scripts
      - ./backups:/app/backups
      - ./backend/cert.pem:/app/backend/cert.pem
      - ./backend/key.pem:/app/backend/key.pem
      - ./frontend/dist:/app/frontend/dist
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:-}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

> [!IMPORTANT]
> - Jangan mengubah angka port di sebelah **KANAN** titik dua (`:3001` dan `:3002`) karena merupakan port internal di dalam Docker container. Hanya ubah angka di sebelah **KIRI**.
> - Jika menggunakan **Cloudflare Tunnel (`cloudflared`)**, isi `CLOUDFLARE_TUNNEL_TOKEN` di file `.env` root dengan token tunnel domain milik Kantah baru Anda (karena `docker-compose.yml` membaca `${CLOUDFLARE_TUNNEL_TOKEN:-}`), atau hapus blok service `cloudflared` jika hanya diakses melalui jaringan lokal (LAN).

---

## Tahap 4: Penyesuaian Identitas & Branding Kantor Pertanahan

Untuk menyesuaikan identitas nama kantor (mengubah *"Kantor Pertanahan Kota Tangerang Selatan"* / *"Pantau.Kantah Tangsel"* menjadi nama Kantah baru), perbarui teks pada berkas berikut:

1. **`frontend/index.html` & `frontend/public/manifest.webmanifest`**
   - Ubah `<title>Pantau.Kantah Tangsel</title>`, meta `application-name` / `apple-mobile-web-app-title`, dan teks pemuat awal `Memuat Pantau Kantah Tangsel...` di `frontend/index.html`.
   - Sesuaikan `name`, `short_name`, dan `description` PWA di `frontend/public/manifest.webmanifest`.
2. **`frontend/src/components/Navbar.jsx`**
   - Sesuaikan teks merek navigasi (`Kantor Pertanahan Kota Tangerang Selatan`, `Kantah Tangsel`, dan `Pantau.Kantah Tangsel`).
3. **`frontend/src/pages/HomeHub.jsx`**
   - Sesuaikan judul utama `Portal Aplikasi Pantau.Kantah Tangsel`.
4. **`frontend/src/pages/Login.jsx`, `frontend/src/components/LoginHelpModal.jsx`, & `frontend/src/App.jsx`**
   - Sesuaikan kop/subjudul dan footer di `Login.jsx`, info kontak admin di `LoginHelpModal.jsx`, serta `document.title` dan `<footer>` hak cipta di `App.jsx`.
5. **Slip Cetak QR (`EntryForm.jsx`, `FileDetails.jsx`, `SuratDashboard.jsx`, `SuratDetails.jsx`)**
   - Sesuaikan kop institusi (*Kantor Pertanahan Kota Tangerang Selatan*) dan nama aplikasi pada panel cetak slip QR.
6. **`backend/server.js` & `backend/src/services/telegramService.js`**
   - Sesuaikan daftar `allowedOrigins` (CORS) di `backend/server.js` dengan domain publik Kantah baru Anda.
   - Jika menggunakan Bot Telegram baru, atur `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_BOT_USERNAME` melalui `.env` root (diteruskan oleh `docker-compose.yml`).

Setelah mengubah kode frontend, jalankan kompilasi ulang agar folder bind-mount `frontend/dist` ikut terbarui:
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## Tahap 5: Build & Jalankan Aplikasi (Deployment)

Jalankan perintah berikut di direktori utama `file-tracker`:
```bash
docker compose up -d --build
```

### Verifikasi Pasca-Instalasi:
1. Buka peramban (Chrome / Safari / Edge) dan akses alamat server Anda (contoh: `http://[IP_NAS]:3011` atau `https://[IP_NAS]:3012` atau domain publik Cloudflare).
2. Masuk (*Login*) menggunakan akun Administrator awal:
   - **Username:** `admin`
   - **Password:** `admin123`
3. Segera ubah kata sandi `admin` melalui tombol **Sandi** di bilah navigasi atas, lalu tambahkan akun pegawai melalui menu **Kelola Akun (`/admin/users`)**.
