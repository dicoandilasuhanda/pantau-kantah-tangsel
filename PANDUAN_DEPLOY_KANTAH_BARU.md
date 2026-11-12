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
```

> [!NOTE]
> Saat kontainer backend pertama kali dijalankan tanpa `database.sqlite`, sistem secara otomatis membuat skema tabel lengkap (`users`, `files`, `file_history`, `disposisi`, `surat`, `surat_history`, `surat_disposisi`, `user_dwg_files`, `feature_suggestions`) beserta akun Administrator awal (`admin` / `admin123`).

---

## Tahap 3: Konfigurasi `docker-compose.yml` (Mencegah Bentrok Port & Container)

Buka berkas `docker-compose.yml` dan sesuaikan nama *service*, `container_name`, mapping *port*, serta token *Cloudflare Tunnel* (jika menggunakan domain publik sendiri):

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
      # PENTING: Mapping data persisten & build statis ke host NAS
      - ./backend/database.sqlite:/app/backend/database.sqlite
      - ./backend/uploads:/app/backend/uploads
      - ./backend/server.js:/app/backend/server.js
      - ./backend/cert.pem:/app/backend/cert.pem
      - ./backend/key.pem:/app/backend/key.pem
      - ./frontend/dist:/app/frontend/dist
    environment:
      - NODE_ENV=production
      # Opsional: Token Bot Telegram khusus Kantah baru (atau kosongkan jika belum menggunakan bot)
      - TELEGRAM_BOT_TOKEN=ISI_TOKEN_BOTFATHER_KANTAH_BARU
```

> [!IMPORTANT]
> - Jangan mengubah angka port di sebelah **KANAN** titik dua (`:3001` dan `:3002`) karena merupakan port internal di dalam Docker container. Hanya ubah angka di sebelah **KIRI**.
> - Jika menggunakan **Cloudflare Tunnel (`cloudflared`)**, ganti token pada service `cloudflared` dengan token tunnel domain milik Kantah baru Anda, atau hapus blok service `cloudflared` jika hanya diakses melalui jaringan lokal (LAN).

---

## Tahap 4: Penyesuaian Identitas & Branding Kantor Pertanahan

Untuk menyesuaikan identitas nama kantor (mengubah *"Kantor Pertanahan Kota Tangerang Selatan"* / *"Pantau.Kantah Tangsel"* menjadi nama Kantah baru), perbarui teks pada berkas berikut:

1. **`frontend/index.html`**
   - Ubah `<title>Pantau.Kantah Tangsel</title>` dan teks pemuat awal `Memuat Pantau Kantah Tangsel...`.
2. **`frontend/src/components/Navbar.jsx`**
   - Sesuaikan teks merek navigasi (`Kantor Pertanahan Kota Tangerang Selatan`, `Kantah Tangsel`, dan `Pantau.Kantah Tangsel`).
3. **`frontend/src/pages/HomeHub.jsx`**
   - Sesuaikan judul utama `Portal Aplikasi Pantau.Kantah Tangsel` dan teks hak cipta di bagian bawah halaman.
4. **`frontend/src/pages/Login.jsx` & `frontend/src/components/Footer.jsx`**
   - Sesuaikan subjudul halaman login serta teks hak cipta footer.
5. **`backend/server.js`**
   - Sesuaikan daftar `allowedOrigins` (CORS) dengan domain publik Kantah baru Anda.
   - Jika menggunakan Bot Telegram baru, sesuaikan username bot pada konstanta terkait atau gunakan variabel lingkungan `TELEGRAM_BOT_TOKEN`.

Setelah mengubah kode frontend, jalankan kompilasi ulang:
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
