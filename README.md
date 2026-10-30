# 🏛️ Pantau.Kantah Tangsel
**Portal Aplikasi Pelacakan Berkas & Persuratan Terpadu — Kantor Pertanahan Kota Tangerang Selatan**

![Node.js](https://img.shields.io/badge/Node.js-20_Alpine-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

**Pantau.Kantah Tangsel** *(bertransformasi dari SILACAK TANGSEL &rarr; Pantau.SP Tangsel &rarr; Portal Pantau.Kantah Tangsel)* adalah platform web internal terintegrasi yang dirancang untuk memonitor pergerakan berkas permohonan pelayanan pertanahan secara *real-time* berbasis **QR Code**, mengelola agenda **Surat Masuk & Arsip Digital**, serta menyajikan **Analitik Kinerja (KPI) Petugas & Pemantauan SLA/SOP** secara transparan dan akuntabel.

Dibangun dan dikembangkan oleh **[@dicoandila](https://x.com/dicoandila)**.

---

## ✨ Fitur Utama Sistem

### 1. 🧭 Portal Terpadu (Home Hub)
Antarmuka gerbang utama (*Single Portal Hub*) bergaya *modern dark glassmorphism* dengan *sticky topbar* responsif (Desktop & Mobile) yang memisahkan akses modul berdasarkan peran pengguna:
- **Modul Monitoring Berkas** (Layanan Rutin PNBP — Seksi Survei & Pemetaan dan Seksi PHP).
- **Modul Monitoring Surat** (Administrasi Persuratan & Arsip PDF Digital).
- **Modul Admin Panel & Pengguna Terpadu** (Dilengkapi tombol akses cepat langsung ke **Admin Panel** dan **Kelola Akun** dalam satu kartu khusus Administrator).

### 2. 📱 Pelacakan Berkas *Real-Time* dengan QR Code Berbasis JWT
- **Entri Berkas Tervalidasi:** Pembuatan berkas baru dengan validasi anti-duplikasi (`Nomor Berkas` + `Tahun`), pengelompokan otomatis seluruh **14 jenis kegiatan** (**5 Kegiatan Kelompok 1 / Seksi SP** dan **9 Kegiatan Kelompok 2 / Seksi PHP**), serta *modal* konfirmasi sebelum cetak.
- **QR Code Anti-Palsu:** Setiap QR Code dienkripsi dan ditandatangani menggunakan *JSON Web Token* (`JWT_SECRET`), sehingga QR Code dari luar sistem otomatis ditolak.
- **Pemindaian Fleksibel:** Mendukung pemindaian langsung melalui kamera perangkat (*smartphone*/PC) maupun unggah gambar QR Code dari galeri/dokumen.

### 3. 🔄 Sistem *Strict Transit*, 🔔 Lonceng Notifikasi Suara, & 🤖 Bot Telegram Resmi
- **Pengiriman Terarah (*Transit*):** Petugas tidak dapat memindai berkas secara sembarangan sebelum pemegang berkas sebelumnya menekan tombol **Kirim Berkas (Transit)** dan memilih nama petugas tujuan.
- **Batal Kirim:** Pengirim atau Administrator dapat membatalkan status transit jika terjadi kesalahan pemilihan petugas tujuan.
- **Lonceng Notifikasi & Peringatan Suara Otomatis (`NotificationBell`):**
  - Terpasang di *Topbar HomeHub* dan *Navbar* seluruh halaman (Desktop & Mobile) lengkap dengan *badge* angka merah jumlah berkas kiriman yang menuju meja pengguna aktif.
  - **Nada Panggilan *Web Audio Chime* (~3,2 Detik):** Membunyikan nada *chime* pengumuman 2 putaran yang nyaring dan jernih menggunakan *Web Audio API* bawaan browser (100% berjalan di jaringan lokal tanpa internet maupun file audio eksternal).
  - **Deteksi Saat Login & *Auto-Polling* (Tiap 20 Detik):** Memberikan notifikasi suara dan *popup* otomatis baik saat petugas baru saja login (jika ada berkas kiriman yang menunggu) maupun saat ada petugas lain yang baru mengirimkan berkas secara *real-time*.
  - **Dropdown Kiriman Berkas:** Menampilkan Nomor Berkas, Waktu Kirim, Jenis Kegiatan, Nama Pemohon, dan Nama Pengirim beserta tombol pintas **Detail Berkas** dan **Scan Terima**.
- **Integrasi Bot Telegram Resmi (`@pantaukantahtangsel_bot`):**
  - **Koneksi Mandiri 1-Klik (*Deep-Link*):** Setiap petugas dapat menghubungkan akunnya secara mandiri melalui tombol **Hubungkan Notifikasi Telegram HP** di dalam menu lonceng (otomatis mengarahkan ke `https://t.me/pantaukantahtangsel_bot?start=link_<username>`) atau dengan mengetik `/daftar <username>` langsung di bot `@pantaukantahtangsel_bot`.
  - **Perintah Interaktif Bot:** Mendukung perintah `/start` (panduan & info Chat ID), `/daftar <username>` (menautkan akun), `/cek` atau `/status` (melihat status akun & jumlah berkas transit yang menunggu), serta `/stop` (memutuskan tautan).
  - **Notifikasi *Real-Time* Kirim & Batal Kirim:** Saat berkas dikirim (*Transit*) atau dibatalkan (*Batal Kirim*), server otomatis mengirim pesan rincian berkas langsung ke Telegram HP petugas tujuan meskipun petugas sedang tidak membuka browser/aplikasi web.
  - **Fitur Reset & Pantauan Admin:** Dilengkapi tombol **Reset** di dalam menu lonceng serta indikator status koneksi Telegram (`Terhubung` / `Belum Terhubung`) di halaman **Manajemen Pengguna**.

### 4. ⏱️ Mesin Perhitungan Hari Kerja SOP/SLA & *Pause/Resume*
- **Kalender Hari Kerja Cerdas:** Perhitungan umur berkas dan jatuh tempo SOP secara otomatis **mengabaikan hari Sabtu, Minggu, serta Hari Libur Nasional & Cuti Bersama (SKB 3 Menteri)**.
- **Target SOP Dinamis per Jenis Kegiatan:**
  - *Pengukuran dan Pemetaan Kadastral*: 12 Hari Kerja
  - *Pemecahan / Penggabungan / Pemisahan Bidang*: 15 Hari Kerja
  - *Penataan Batas*: 20 Hari Kerja
  - *Wakaf / Pemberian Hak BMN*: 5 Hari Kerja
  - *Sertipikat Pengganti Rusak/Lama*: 19 Hari Kerja
  - *Pelepasan Sebagian Hak / Pemberian Hak / Permohonan SK*: 38 Hari Kerja
  - *Sertipikat Pengganti Hilang/Lelang Eksekusi*: 40 Hari Kerja
  - *Pengakuan/Penegasan Hak & Penegasan Tanah Wakaf*: 98 Hari Kerja
- **Fitur *Pause* & *Resume* SOP (Khusus Administrator):** Administrator dapat menghentikan sementara (*pause*) perhitungan argometer SOP apabila berkas menunggu pembayaran Surat Perintah Setor (SPS) dan melanjutkannya kembali (*resume*) tanpa merugikan perhitungan SLA.
- **Indikator Warna & Peringatan Stagnasi:** Berkas yang mengendap di satu meja &ge; 2 hari kerja diberi warna kuning, dan &ge; 3 hari kerja diberi peringatan merah (*Stalled Files Alert*).

### 5. 📝 Catatan Berkas & Disposisi Pimpinan
- **Catatan Berjalan (*Running Notes*):** Pemegang berkas saat ini atau Administrator dapat menambahkan catatan kendala/keterangan yang otomatis dilengkapi *timestamp* dan nama petugas.
- **Disposisi Pimpinan:** *Kepala Seksi*, *Koordinator*, atau *Administrator* dapat memberikan instruksi disposisi langsung pada halaman detail berkas, dan petugas terkait dapat menandai disposisi menjadi **"Sudah Dilaksanakan"** lengkap dengan pencatatan waktu dan pelaksana.

### 6. 📊 Mesin Analitik KPI Petugas & Top 50 Berkas Terlama
- **Analitik Kinerja Individu:** Menghitung rata-rata waktu pemrosesan berkas per petugas (mengecualikan jam akhir pekan Sabtu/Minggu dan menghentikan *timer* saat berkas sudah berstatus *Transit*, *Selesai*, atau *Ditutup*).
- **Filter Ganda & Grafik Interaktif:** Visualisasi *Bar Chart* (`Recharts`) dengan filter per nama petugas dan per jenis kegiatan permohonan.
- **Top 50 Berkas Terlama (Khusus Berkas Aktif):** Daftar peringkat 50 berkas yang masih sedang berjalan (*in-progress*) dengan durasi pemrosesan terlama untuk menjadi prioritas penyelesaian pimpinan.

### 7. ✉️ Modul Monitoring Surat Masuk & Arsip PDF
- **Penomoran Agenda Otomatis:** Setiap surat masuk yang dientri oleh *Petugas Entry Surat* otomatis mendapatkan Nomor Agenda 5 digit berurutan (`00001`, `00002`, dst.).
- **Unggah & Pratinjau PDF:** Mendukung pengunggahan dokumen fisik surat dalam format PDF (`Multer`) yang langsung dapat dibuka atau diunduh dari tabel monitoring surat.

### 8. 🛡️ Keamanan, Multi-Role, & Manajemen Sesi
- **Multi-Role & Konfirmasi Pintar (*Smart Role Selection*):** Satu akun pengguna dapat memiliki lebih dari satu jabatan/peran. Saat melakukan *scan*, sistem otomatis mendeteksi riwayat scan dan menyarankan peran berikutnya atau menampilkan pilihan jabatan aktif.
- **Pembatasan Sesi Perangkat (*Max 2 Devices*):** Setiap akun dibatasi maksimal aktif pada 2 perangkat secara bersamaan. Login pada perangkat ke-3 otomatis mengeluarkan sesi perangkat paling lama.
- **Anti-Stale Cache pada Perangkat Mobile:** Dilengkapi pengaturan header HTTP `Cache-Control: no-store, no-cache, must-revalidate` pada `index.html` agar browser smartphone (Safari iOS / Chrome Android) selalu memuat pembaruan antarmuka secara instan.
- **Proteksi API Berlapis:** Menggunakan `helmet` (HTTP Security Headers), `express-rate-limit` (perlindungan *brute-force* pada endpoint login), `bcryptjs` untuk *hashing* kata sandi, dan pencatatan IP Address pada setiap riwayat pemindaian.

### 9. ⚙️ Admin Panel, Filter Multi-Dimensi, & Ekspor Excel 2-Sheet
- **Panel Filter Laporan Lengkap:**
  - Filter berdasarkan **Bulan Masuk** (Januari–Desember) & **Tahun Masuk** (otomatis mendeteksi tahun yang tersedia di database).
  - Filter **Rentang Tanggal Masuk Spesifik** (*Dari Tanggal* – *Sampai Tanggal*).
  - Filter **Jenis Permohonan / Kegiatan**, **Status Berkas** (`Semua`, `Sedang Diproses`, `Dalam Transit`, `Selesai`, `Ditutup`), dan **Status SLA** (`Semua`, `Aman / Tepat Waktu`, `Terlambat / Overdue`) beserta tombol **Reset Semua Filter**.
- **Kartu Metrik Dinamis & Tautan Cepat:** Keempat kartu ringkasan di bagian atas otomatis menyesuaikan angka berdasarkan filter aktif, dan setiap **Nomor Berkas** di tabel dapat diklik langsung menuju halaman riwayat detail berkas.
- **Ekspor Laporan Excel (`.xlsx`) 2 Sheet Otomatis:**
  - **Sheet 1 (`Daftar Berkas`):** Berisi daftar detail berkas sesuai filter yang sedang aktif (termasuk posisi transit, tanggal masuk, jatuh tempo, dan status pause SOP).
  - **Sheet 2 (`Rekap Bulanan Kegiatan`):** Tabel rekapitulasi otomatis per **Jenis Kegiatan** lengkap dengan baris **TOTAL KESELURUHAN** (*Total Masuk, Sedang Diproses, Selesai, Ditutup, Aman SLA, Terlambat/Overdue, dan % Kepatuhan SLA*).
- **Aksi Administratif & Manajemen Pengguna (*CRUD*):** Administrator dapat menyelesaikan berkas manual (*Force Complete*), menutup berkas disertai alasan (*Close File with Reason*), menghapus berkas, serta mengelola akun dan multi-jabatan petugas.

---

## 👥 Daftar Peran (*Roles*) dalam Sistem

Sistem mendukung 14 peran spesifik yang dapat dikombinasikan pada satu akun:
1. `Administrator`
2. `Kepala Seksi Survei dan Pemetaan`
3. `Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral`
4. `Petugas Entry Surat`
5. `Petugas Entry Berkas` *(Kelompok 1)*
6. `Petugas Entry Berkas PHP` *(Kelompok 2)*
7. `Petugas Ukur`
8. `Asisten Surveyor Kadastral`
9. `Petugas Pemetaan`
10. `Petugas Alih Media`
11. `Petugas Penyelesaian Berkas`
12. `Petugas Distribusi Berkas Ke Seksi PHP`
13. `Petugas Seksi PHP`
14. `Petugas Loket Penyerahan Produk`

---

## 🛠️ Arsitektur & Teknologi

### Frontend
- **Framework:** React 19 + Vite 8
- **Routing:** React Router DOM v7
- **UI & Styling:** Custom Modern CSS (*Dark Mode*, *Glassmorphism*, *Responsive Mobile & Desktop*) + Lucide React Icons + React Hot Toast
- **Audio & Notifikasi:** Web Audio API Synthesizer (*Dual-Oscillator Harmonic Chime* + *Dynamics Compressor*)
- **QR Code Engine:** `qrcode.react` (Generator) & `html5-qrcode` (Camera/Image Scanner)
- **Visualisasi & Pelaporan:** `recharts` (Grafik KPI) & `xlsx` (Ekspor Microsoft Excel Multi-Sheet)
- **HTTP Client:** Axios (dengan *interceptor* token JWT otomatis)

### Backend
- **Runtime & Framework:** Node.js + Express.js v5
- **Database:** SQLite3 (`database.sqlite` dengan *auto-migration* skema tabel saat *startup*)
- **Keamanan & Middleware:** `jsonwebtoken` (JWT), `bcryptjs`, `helmet`, `express-rate-limit`, `cors`
- **File Upload:** `multer` (penyimpanan dokumen PDF surat masuk)
- **Protokol Server:** Mendukung HTTP (`Port 3001`) dan HTTPS otomatis (`Port 3002`) jika sertifikat SSL (`key.pem` & `cert.pem`) tersedia untuk kebutuhan akses kamera di jaringan lokal.

### DevOps & Deployment
- **Containerization:** Docker (`node:20-alpine` multi-step build) & Docker Compose
- **Persistent Storage:** *Volume mounting* untuk menjaga keutuhan `database.sqlite` saat *container* diperbarui di server/NAS (QNAP)
- **Automated Backup:** Script `auto_backup.sh` untuk pencadangan berkala dan rotasi otomatis (menghapus *backup* > 30 hari).

---

## 📂 Struktur Direktori Proyek

```text
pantau-kantah-tangsel/
├── backend/                        # Server API Node.js & Express
│   ├── uploads/surat/              # Direktori penyimpanan PDF surat masuk
│   ├── server.js                   # Entry point utama backend, skema DB, & seluruh endpoint API
│   ├── database.sqlite             # File database utama SQLite (diabaikan oleh Git demi keamanan)
│   └── package.json                # Dependensi backend
│
├── frontend/                       # Aplikasi Single Page Application (React + Vite)
│   ├── public/                     # Aset statis publik (Logo Kantah, Favicon)
│   ├── src/
│   │   ├── components/             # Komponen modular:
│   │   │   ├── AdminRoute.jsx      # Guard rute khusus Administrator
│   │   │   ├── CariBerkasPetugas.jsx
│   │   │   ├── KPIDashboard.jsx    # Analitik kinerja petugas & grafik Recharts
│   │   │   ├── Navbar.jsx          # Navigasi adaptif, lonceng notifikasi, & modal ubah sandi
│   │   │   ├── NotificationBell.jsx# Lonceng notifikasi kiriman berkas (Transit) & Web Audio Chime
│   │   │   ├── Top10Petugas.jsx
│   │   │   └── Top50Berkas.jsx     # Tabel 50 berkas aktif terlama
│   │   ├── pages/                  # Halaman aplikasi:
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx  # Dasbor eksekutif, filter periode/kegiatan, & ekspor Excel 2-Sheet
│   │   │   │   └── UserManagement.jsx  # CRUD pengguna & pengaturan multi-role
│   │   │   ├── Dashboard.jsx       # Monitoring berkas utama, kartu metrik, & filter
│   │   │   ├── EntryForm.jsx       # Formulir registrasi berkas & cetak QR Code
│   │   │   ├── FileDetails.jsx     # Detail berkas, transit, pause SOP, catatan, & disposisi
│   │   │   ├── HomeHub.jsx         # Portal utama pemilihan modul layanan
│   │   │   ├── Login.jsx           # Halaman autentikasi pengguna
│   │   │   ├── Scanner.jsx         # Pemindai QR Code kamera & unggah gambar
│   │   │   ├── SuratDashboard.jsx  # Daftar agenda surat masuk & unduh PDF
│   │   │   └── SuratEntryForm.jsx  # Formulir input surat masuk & unggah PDF
│   │   ├── utils/
│   │   │   ├── api.js              # Konfigurasi instance Axios & interceptor JWT
│   │   │   └── dateUtils.js        # Kalkulator hari kerja, kalender libur, & target SOP
│   │   ├── App.jsx                 # Konfigurasi routing utama & Role-based Route Guards
│   │   └── index.css               # Sistem desain global (Dark Glassmorphism)
│   └── package.json                # Dependensi frontend
│
├── AGENTS.md                       # Aturan otomatisasi kerja lintas perangkat (PC & Mac) & Tim Subagent
├── Dockerfile                      # Konfigurasi image Docker (Build Frontend + Run Backend)
├── docker-compose.yml              # Orkestrasi container & persistent volume database
├── auto_backup.sh                  # Script bash backup database otomatis & retensi 30 hari
└── README.md                       # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan Proyek

### Opsi A: Pengembangan Lokal (*Local Development*)

Aplikasi dapat dijalankan secara terpisah antara *Backend* dan *Frontend* untuk kemudahan pengembangan.

#### 1. Jalankan Server Backend
```bash
cd backend
npm install
node server.js
```
> Server HTTP berjalan di `http://localhost:3001` (dan HTTPS di `https://localhost:3002` bila `key.pem` & `cert.pem` tersedia).
> Saat pertama kali dijalankan dengan database kosong, sistem otomatis membuat akun bawaan (seperti `admin` / `admin123`).

#### 2. Jalankan Aplikasi Frontend
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
> Akses aplikasi melalui browser di `http://localhost:5173`.

---

### Opsi B: Deployment Produksi dengan Docker (Server / QNAP NAS)

Proyek ini telah dikonfigurasi agar *Backend* sekaligus menyajikan hasil *build* statis *Frontend* dalam satu kontainer yang ringan.

```bash
# Build dan jalankan container di background
docker compose up -d --build
```
- Aplikasi dapat diakses langsung melalui port `3001` (HTTP) atau `3002` (HTTPS).
- File `backend/database.sqlite` terhubung melalui *volume* Docker sehingga seluruh data berkas, histori, dan pengguna tetap aman meskipun kontainer di-*restart* atau di-*rebuild*.

#### Menjalankan Backup Database Otomatis
```bash
chmod +x auto_backup.sh
./auto_backup.sh
```
Script akan menghentikan sementara kontainer selama beberapa detik, menyalin `database.sqlite` dengan *timestamp* ke dalam direktori `backups/`, menyalakan kembali layanan, dan membersihkan cadangan yang berusia lebih dari 30 hari.

---

## 📜 Riwayat Pengembangan (*Development Changelog*)

Berikut adalah perjalanan pengembangan aplikasi dari awal inisiasi hingga versi terkini:

- **Tahap 1 — Fondasi & Autentikasi JWT:**
  Inisiasi arsitektur *fullstack* menggunakan React (Vite), Express.js, dan SQLite3. Pembuatan autentikasi berbasis JWT, sistem manajemen pengguna, formulir pendaftaran berkas, serta pencetakan QR Code unik yang terenkripsi.
- **Tahap 2 — Pemindai QR Code & UI *Dark Glassmorphism*:**
  Implementasi pemindaian QR Code melalui kamera perangkat dan unggah gambar (`html5-qrcode`), perekaman jejak lokasi berkas (`file_history`), serta perombakan antarmuka menjadi *Dark Mode Glassmorphism* yang responsif.
- **Tahap 3 — Dasbor Eksekutif, Kalkulasi SLA/SOP, & Ekspor Excel:**
  Pembuatan `AdminDashboard` untuk memantau status keseluruhan berkas, penghitungan tanggal jatuh tempo berbasis hari kerja, serta fitur unduh laporan berformat Microsoft Excel (`.xlsx`).
- **Tahap 4 — Mesin Analitik KPI Petugas & Top 50 Berkas:**
  Pengembangan modul `KPIDashboard` dengan visualisasi grafik batang (`Recharts`), filter per individu dan jenis permohonan, kalkulasi jam kerja bersih (mengabaikan hari Sabtu & Minggu), serta tab pemantauan **Top 50 Berkas Terlama**.
- **Tahap 5 — *Rebranding* & Penyesuaian Alur Kerja Nyata (K1 & K2):**
  Transformasi identitas aplikasi menjadi **Pantau.SP Tangsel**, pemisahan hak entri dan alur penyelesaian berkas antara **Kelompok 1 (Seksi Survei & Pemetaan)** dan **Kelompok 2 (Seksi PHP)**, penambahan fitur *Multi-Role* dengan konfirmasi jabatan pintar saat *scan*, serta penambahan fitur **Catatan Berkas** & **Disposisi Pimpinan**.
- **Tahap 6 — Fitur Kontrol SOP (*Pause/Resume*), Penutupan Berkas, & Keamanan Sesi:**
  Penambahan fitur *Pause/Resume* argometer SOP (menunggu pembayaran SPS), fitur **Tutup Berkas Manual** beserta alasan penutupan dan **Selesaikan Berkas Manual** oleh Admin, pembatasan login maksimal 2 perangkat per akun, serta integrasi kalender Hari Libur Nasional & Cuti Bersama 2026.
- **Tahap 7 — Sistem *Strict Transit* (Kirim & Terima Berkas):**
  Penerapan aturan pengiriman berkas antar meja secara ketat (*Strict Transit Rule*) di mana berkas wajib dikirim terlebih dahulu oleh pemegang saat ini ke petugas tujuan sebelum dapat dipindai, dilengkapi fitur pencarian petugas tujuan dan pembatalan transit.
- **Tahap 8 — Ekspansi ke *Portal Aplikasi Pantau.Kantah Tangsel* & Modul Persuratan:**
  Pengembangan halaman gerbang utama **Home Hub (`HomeHub.jsx`)** yang menyatukan seluruh layanan Kantor Pertanahan dalam satu portal. Penambahan modul baru **Monitoring Surat Masuk (`SuratDashboard` & `SuratEntryForm`)** lengkap dengan penomoran agenda 5 digit otomatis, unggah arsip PDF, serta penambahan peran **Petugas Entry Surat**.
- **Tahap 9 — Filter Laporan Multi-Dimensi, Rekap Bulanan Excel 2-Sheet, Lonceng Notifikasi Suara, & Bot Telegram Resmi:**
  - Penambahan panel filter komprehensif di `AdminDashboard` (Bulan & Tahun Masuk, Rentang Tanggal, Jenis Kegiatan, Status Berkas, Status SLA) dengan kartu statistik dinamis dan ekspor Excel 2 Sheet otomatis (`Daftar Berkas` & `Rekap Bulanan Kegiatan`).
  - Pembuatan komponen **Lonceng Notifikasi (`NotificationBell.jsx`)** di *HomeHub* dan *Navbar* (Desktop & Mobile) dengan peringatan suara *Web Audio Chime* 2 putaran (~3,2 detik) serta *auto-polling* kiriman berkas *Transit* setiap 20 detik.
  - Integrasi penuh **Bot Telegram Resmi (`@pantaukantahtangsel_bot`)** untuk pengiriman notifikasi *Transit* dan *Batal Kirim* secara *real-time* ke HP petugas, dilengkapi fitur *1-click deep-linking*, perintah `/daftar` & `/cek`, tombol *Reset*, serta kolom status Telegram pada `UserManagement`.
  - Penyempurnaan tata letak responsif Mobile (*sticky topbar* & anti-cache `index.html`), penyatuan kartu *Admin Panel & Pengguna* di *HomeHub*, pemfokusan *Top 50 Berkas Terlama* khusus berkas aktif, pembatasan hak *Pause/Resume* SOP khusus Administrator, serta sinkronisasi penuh 9 kegiatan Kelompok 2 (PHP) di sisi Backend.

---

## 👨‍💻 Pengembang

Dikembangkan dengan dedikasi untuk mendukung transformasi digital dan transparansi layanan publik di lingkungan Kantor Pertanahan Kota Tangerang Selatan.

- **Author:** [@dicoandila](https://x.com/dicoandila)
- **Tahun:** 2026
