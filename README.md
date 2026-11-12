# 🏛️ Pantau.Kantah Tangsel
**Portal Aplikasi Pelacakan Berkas & Persuratan Terpadu — Kantor Pertanahan Kota Tangerang Selatan**

![Node.js](https://img.shields.io/badge/Node.js-20_Alpine-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

**Pantau.Kantah Tangsel** *(bertransformasi dari SILACAK TANGSEL &rarr; Pantau.SP Tangsel &rarr; Portal Pantau.Kantah Tangsel)* adalah platform web internal terintegrasi yang dirancang untuk memonitor pergerakan berkas permohonan pelayanan pertanahan secara *real-time* berbasis **QR Code**, mengelola agenda **Surat Masuk & Arsip Digital**, serta menyajikan **Analitik Kinerja (KPI) Petugas & Pemantauan SLA/SOP** secara transparan dan akuntabel.

🌐 **Domain Akses Resmi Publik:** [https://pantaukantahtangsel.web.id](https://pantaukantahtangsel.web.id) (Didukung oleh Cloudflare Tunnel dengan proteksi SSL/TLS otomatis).

Dibangun dan dikembangkan oleh **[@dicoandila](https://x.com/dicoandila)**.

---

## ✨ Fitur Utama Sistem

### 1. 🧭 Portal Terpadu (Home Hub)
Antarmuka gerbang utama (*Single Portal Hub*) bergaya *modern dark glassmorphism* dengan *sticky topbar* responsif (Desktop & Mobile) yang memisahkan akses modul berdasarkan peran pengguna:
- **Modul Monitoring Berkas** (Layanan Rutin PNBP — Seksi Survei & Pemetaan dan Seksi PHP).
- **Modul Monitoring Surat** (Administrasi Persuratan & Arsip PDF Digital).
- **Modul Admin Panel, Pengguna & Stats** (Dilengkapi tombol akses cepat langsung ke **Admin Panel**, **Kelola Akun**, dan pantauan **Stats** dalam satu kartu khusus Administrator).

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
  - **Koneksi Mandiri Terverifikasi Sandi:** Setiap petugas dapat menghubungkan notifikasi Telegram secara aman dengan perintah `/daftar <username> <password>` langsung di bot `@pantaukantahtangsel_bot` atau melalui tautan di menu lonceng. Penautan akun wajib menyertakan verifikasi kata sandi akun web untuk mencegah penyadapan data oleh pihak luar.
  - **Perintah Interaktif Bot:** Mendukung perintah `/start` (panduan & info Chat ID), `/daftar <username> <password>` (verifikasi & menautkan akun), `/cek` atau `/status` (melihat status akun & jumlah berkas transit yang menunggu), serta `/stop` atau `/putus` (memutuskan tautan).
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

### 7. ✉️ Modul Monitoring Persuratan, Detail Perjalanan Surat, & Arsip PDF
- **Penomoran Agenda Otomatis & Cetak Slip QR Berstandar:** Setiap surat masuk yang dientri oleh *Petugas Entry Surat* otomatis mendapatkan Nomor Agenda 5 digit berurutan (`00001`, `00002`, dst.) lengkap dengan QR Code agenda surat yang dapat dicetak bersih dan terstandar (dilengkapi nomor surat, asal, perihal, dan alamat IP petugas di baris terbawah).
- **Unggah & Pratinjau PDF:** Mendukung pengunggahan dokumen fisik surat dalam format PDF (`Multer`) yang langsung dapat dibuka atau diunduh dari tabel monitoring surat maupun panel admin.
- **Detail Perjalanan Surat & Transit Antar Meja (`SuratDetails.jsx`):** Melacak riwayat perjalanan fisik surat secara akuntabel (`surat_history`), mekanisme pengiriman surat antar meja (*Transit Surat*), pembatalan transit, pencatatan catatan dinamis, dan disposisi pimpinan.
- **Analitik Kinerja Persuratan & Pengelolaan Admin:** Integrasi metrik penanganan surat per petugas di `KPIDashboard` serta tab khusus "Kelola Persuratan" di `AdminDashboard` untuk aksi administratif surat (*force complete*, penutupan berkas surat, dan penghapusan).

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
- **Aksi Administratif & Manajemen Pengguna (*CRUD*):** Administrator dapat menyelesaikan berkas manual (*Force Complete*), menutup berkas disertai alasan (*Close File with Reason*), menghapus berkas, serta mengelola akun dan multi-jabatan petugas (dilengkapi paginasi 10 pengguna per halaman).

### 10. 👤 Halaman Profil Pengguna & 📐 Ruang Berkas DWG (AutoCAD) Antar-Petugas Teknis
- **Profil Pengguna Mandiri & Unggah Foto:**
  - Pengguna dapat mengakses halaman profil dengan mengeklik *user pill* identitas di bilah navigasi utama (`Navbar.jsx`).
  - Mendukung unggah, pratinjau, dan hapus foto profil pribadi (`avatar_url`) dengan validasi format gambar (JPG/PNG/WEBP hingga 5 MB).
- **Ruang Berkas DWG Khusus (Petugas Ukur, Asisten Surveyor Kadastral & Petugas Pemetaan):**
  - Akses penyimpanan dan pertukaran berkas gambar format AutoCAD (`.dwg` hingga 100 MB) terbuka bagi pengguna dengan peran **`Petugas Ukur`**, **`Asisten Surveyor Kadastral`**, **`Petugas Pemetaan`**, dan **`Administrator`**. Akun selain keempat role tersebut mendapatkan status terkunci (*restricted*).
  - **Pertukaran File Fleksibel (Multi-Arah):** Petugas Ukur, ASK, dan Petugas Pemetaan dapat saling bertukar dan mengirimkan berkas gambar DWG hasil pengukuran/pemetaan (serta ke Administrator).
  - **Tab Navigasi DWG Terorganisir:** Tab `Semua`, `Berkas Masuk (Inbox)`, `Folder Pribadi`, dan `Terkirim (Outbox)` memudahkan pemilahan arsip.
  - **Fitur Kirim & Teruskan (*Forward*):** Mendukung pengunggahan file baru untuk langsung dikirim ke penerima, maupun meneruskan berkas yang sudah tersimpan di folder pribadi disertai catatan kendala/keterangan (*notes*).
  - **Pemberitahuan Otomatis Bot Telegram:** Pengiriman dan penerusan berkas DWG otomatis memicu notifikasi pesan rincian file dan catatan langsung ke akun Telegram penerima secara *real-time*.
  - **Penyimpanan Berkas Multi-Owner Cerdas:** File fisik `.dwg` di server dilindungi dengan sistem referensi multi-pengguna; file fisik hanya dihapus dari disk jika tidak ada lagi pihak (baik pengirim maupun penerima) yang menyimpannya.

### 11. 💡 Kotak Saran & Ide Fitur Pengguna (Community Feedback Hub)
- **Akses Langsung di Home Hub:** Tombol saran melayang (*floating pill*) interaktif di pojok kanan bawah Home Hub dengan animasi lembut dan status adaptif desktop/mobile.
- **Formulir Pengajuan Terstruktur:** Pengguna dapat mengirimkan usulan ide fitur, peningkatan alur kerja SOP, perbaikan UI/UX, maupun integrasi/otomasi sistem disertai judul dan rincian kebutuhan.
- **Notifikasi Bot Telegram Otomatis ke Administrator:** Setiap saran yang dikirimkan langsung diteruskan ke akun Telegram para Administrator secara *real-time*.
- **Riwayat & Pelacakan Status:** Pengguna dapat memantau status saran mereka (*Menunggu Review*, *Ditinjau*, *Diterima*, *Selesai*, atau *Ditolak*) serta membaca catatan tanggapan dari tim administrator.
- **Panel Manajemen Review (Administrator):** Administrator dapat melihat seluruh saran masuk dari staf/petugas, memperbarui status, memberikan catatan tanggapan, maupun menghapus saran.

### 12. 📈 Web-App Stats & Pemantauan Pengguna Online Real-Time
- **Metrik Kehadiran Langsung:** Menampilkan total pengguna terdaftar, jumlah pengguna yang sedang aktif/online (berdasarkan toleransi aktivitas 5 menit terakhir), jumlah pengguna offline, total sesi aktif, dan akun terhubung ke Telegram.
- **Daftar & Detail Pengguna Online:** Tabel interaktif dengan avatar, nama lengkap, username, peran aktif, waktu aktivitas terakhir (*relative time*), alamat IP terakhir, serta status tautan Telegram.
- **Manajemen Sesi & Disconnect (Kick):** Administrator memiliki wewenang untuk memutuskan (*kick*) sesi aktif pengguna tertentu jika terdeteksi aktivitas mencurigakan atau untuk pemeliharaan sesi.
- **Auto-Refresh Cerdas:** Dilengkapi saklar *Auto-Refresh* berkala (15 detik) dengan indikator denyut hijau (*live pulse*) serta tombol penyegaran manual.
- **Integrasi Terpadu & Desain Responsif Anti-Tumpuk:** Tautan langsung berlabel **Stats** terpasang di bilah navigasi admin (`Navbar.jsx`) dengan perlindungan flex anti-kompresi dan breakpoint judul cerdas (&le; 1550px) agar tidak menimpa lonceng notifikasi.

### 13. 🛡️ Sistem Pemulihan Otomatis Layar Putih & Pembersihan Cache Mandiri (Double-Layer Fallback)
- **Branded Initial Loader & Watchdog Darurat (`index.html` & `public/recovery.js`):** Menampilkan animasi pemuatan logo resmi ATR/BPN sejak milidetik pertama dan mematuhi kebijakan keamanan *Content-Security-Policy (CSP)* ketat (`helmet` `script-src 'self'`).
- **Auto-Reload 1x (*Chunk Mismatch*):** Jika berkas modul JavaScript versi lama di browser menghasilkan 404 pasca pembaruan sistem (*"Failed to fetch dynamically imported module"*), sistem secara otomatis memuat ulang halaman dengan parameter timestamp baru (`?reload=timestamp`) tanpa membingungkan pengguna.
- **Safety Watchdog Timer (4 Detik):** Jika aplikasi React tidak merespons atau terhenti lebih dari 4 detik, antarmuka otomatis memunculkan kartu pemulihan darurat terpadu dengan opsi **"Bersihkan Cache & Pulihkan Otomatis"** (`window.__appSelfRepair()`) dan **"Muat Ulang Halaman"**.
- **Global React Error Boundary (`ErrorBoundary.jsx`):** Melindungi seluruh pohon komponen aplikasi dari *crash* runtime JavaScript sehingga layar putih polos (*White Screen of Death*) dicegah sepenuhnya dan digantikan dialog elegan bertema resmi Kantah Tangsel.
- **Pemeliharaan Cache Mandiri di Halaman Profil (`Profile.jsx`):** Petugas dapat melakukan sinkronisasi dan pembersihan cache browser kapan saja secara mandiri melalui modul *Pemeliharaan Cache & Sesi Peramban*.

### 14. ✨ Transisi Antar-Halaman Seamless & Kontekstual (View Transitions API)
- **Animasi Berarah Cerdas (*Directional Choreography*):** Menggunakan *View Transitions API* (`document.startViewTransition`) yang mendeteksi kedalaman navigasi secara otomatis — animasi *forward* saat membuka detail/sub-halaman, *back* saat kembali ke halaman induk/Hub, dan *lateral* saat berpindah antar-modul sejajar.
- **Top Route Progress Shimmer Bar:** Indikator garis cahaya gradien tipis di bagian paling atas layar yang memberikan umpan balik visual instan saat berpindah halaman.
- **Ramah Aksesibilitas & Performa GPU:** Seluruh transisi berjalan di *compositor thread* (`transform: translate3d` & `opacity`), mengarahkan fokus ke judul halaman baru secara otomatis, serta mematuhi pengaturan `@media (prefers-reduced-motion)`.

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
- **Database:** SQLite3 (`database.sqlite` dengan *auto-migration* skema tabel, indexing performa pada kolom relasi, dan *foreign key enforcement*)
- **Keamanan & Middleware:** `jsonwebtoken` (JWT), `bcryptjs`, `helmet`, `express-rate-limit`, `cors`
- **File Upload:** `multer` (penyimpanan dokumen PDF surat masuk dengan batas 15 MB dan validasi tipe berkas)
- **Protokol Server:** Mendukung HTTP (`Port 3001`) dan HTTPS otomatis (`Port 3002`) jika sertifikat SSL (`key.pem` & `cert.pem`) tersedia untuk kebutuhan akses kamera di jaringan lokal.

### DevOps & Deployment
- **Containerization:** Docker (`node:20-alpine` multi-step build) & Docker Compose
- **Cloudflare Tunnel:** Integrasi `cloudflared` untuk publikasi aman ke domain resmi `https://pantaukantahtangsel.web.id` tanpa membuka port router kantor.
- **Persistent Storage:** *Volume mounting* untuk menjaga keutuhan `database.sqlite` dan arsip berkas fisik `backend/uploads/` saat *container* diperbarui di server/NAS (QNAP).
- **Zero-Downtime Backup:** Script `auto_backup.sh` untuk pencadangan *online* berkala berbasis SQLite backup API (tanpa mematikan container) dan rotasi otomatis cadangan > 30 hari.

---

## 📂 Struktur Direktori Proyek

```text
pantau-kantah-tangsel/
├── backend/                        # Server API Node.js & Express
│   ├── uploads/
│   │   ├── avatars/                # Direktori penyimpanan foto profil pengguna
│   │   ├── dwg/                    # Direktori penyimpanan arsip berkas gambar AutoCAD (.dwg)
│   │   └── surat/                  # Direktori penyimpanan PDF surat masuk
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
│   │   │   ├── ErrorBoundary.jsx   # Global Error Boundary pencegah layar putih & pemulihan otomatis
│   │   │   ├── KPIDashboard.jsx    # Analitik kinerja petugas & grafik Recharts
│   │   │   ├── Navbar.jsx          # Navigasi adaptif, akses profil cepat, lonceng notifikasi, & modal ubah sandi
│   │   │   ├── NotificationBell.jsx# Lonceng notifikasi kiriman berkas (Transit) & Web Audio Chime
│   │   │   ├── SuggestionModal.jsx # Modal kotak saran fitur baru, riwayat pengajuan, & review admin
│   │   │   ├── Top10Petugas.jsx
│   │   │   └── Top50Berkas.jsx     # Tabel 50 berkas aktif terlama
│   │   ├── pages/                  # Halaman aplikasi:
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx  # Dasbor eksekutif, filter periode/kegiatan, & ekspor Excel 2-Sheet
│   │   │   │   └── UserManagement.jsx  # CRUD pengguna, paginasi per 10 baris, & pengaturan multi-role
│   │   │   ├── Dashboard.jsx       # Monitoring berkas utama, kartu metrik, & filter
│   │   │   ├── EntryForm.jsx       # Formulir registrasi berkas & cetak QR Code
│   │   │   ├── FileDetails.jsx     # Detail berkas, transit, pause SOP, catatan, & disposisi
│   │   │   ├── HomeHub.jsx         # Portal utama pemilihan modul layanan
│   │   │   ├── Login.jsx           # Halaman autentikasi pengguna
│   │   │   ├── PdfTools.jsx        # Utilitas manipulasi dokumen PDF in-browser (Gabung, Pisah, Kompres, dsb.)
│   │   │   ├── Profile.jsx         # Profil pengguna, unggah avatar, & ruang pertukaran berkas DWG (Petugas Ukur, ASK, & Pemetaan)
│   │   │   ├── Scanner.jsx         # Pemindai QR Code kamera & unggah gambar berkas
│   │   │   ├── SuratDashboard.jsx  # Daftar agenda surat masuk, unduh PDF, & cetak slip QR
│   │   │   ├── SuratDetails.jsx    # Detail riwayat perjalanan surat, transit, catatan, disposisi, & cetak slip QR
│   │   │   ├── SuratEntryForm.jsx  # Formulir input surat masuk & unggah PDF
│   │   │   └── SuratScanner.jsx    # Pemindai QR agenda surat untuk terima kiriman surat
│   │   ├── utils/
│   │   │   ├── api.js              # Konfigurasi instance Axios & interceptor JWT
│   │   │   ├── audioUtils.js       # Synthesizer Web Audio API nada sukses scan QR, beep, & error
│   │   │   └── dateUtils.js        # Kalkulator hari kerja, kalender libur, & target SOP
│   │   ├── App.jsx                 # Konfigurasi routing utama & Role-based Route Guards
│   │   └── index.css               # Sistem desain global (Dark Glassmorphism)
│   └── package.json                # Dependensi frontend
│
├── AGENTS.md                       # Aturan otomatisasi kerja lintas perangkat (PC & Mac) & Tim Subagent
├── HANDOVER_PANTAU_KANTAH.md       # Cetak biru arsitektur lengkap, alur 14 kegiatan, SLA, & kamus API (SSOT)
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
- Aplikasi dapat diakses melalui domain publik [https://pantaukantahtangsel.web.id](https://pantaukantahtangsel.web.id) atau port lokal `3001` (HTTP) / `3002` (HTTPS).
- File `backend/database.sqlite` dan folder `backend/uploads` terhubung melalui *volume* Docker sehingga seluruh database berkas, histori, pengguna, dan dokumen surat tetap aman meskipun kontainer di-*restart* atau di-*rebuild*.

#### Menjalankan Backup Database Otomatis (Zero-Downtime)
```bash
chmod +x auto_backup.sh
./auto_backup.sh
```
Script memanfaatkan mekanisme *online backup* bawaan SQLite (`.backup`) sehingga proses pencadangan berjalan secara instan di latar belakang **tanpa perlu mematikan container aplikasi**. File cadangan diberi *timestamp*, disimpan di direktori `backups/`, dan secara otomatis merotasi cadangan yang berusia lebih dari 30 hari.

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
- **Tahap 10 — Penguatan Keamanan, Optimasi Performa Database, Domain Resmi, & Zero-Downtime Backup:**
  - **Otentikasi Sandi Bot Telegram:** Pendaftaran bot via `/daftar` kini mewajibkan verifikasi kata sandi akun web (`/daftar <username> <password>`) demi mencegah penyadapan notifikasi oleh pihak luar.
  - **Optimasi Index Relasi SQLite:** Penambahan *index* database pada kolom `file_history.file_id`, `file_history.scanned_at`, `files(nomor_berkas, tahun_berkas)`, dan `files(is_transit, transit_to_username)` untuk mencegah *table scan* dan melipatgandakan kecepatan query riwayat berkas.
  - **Perlindungan Berkas Unggahan (*Multer*):** Penambahan batasan ukuran file PDF maksimal 15 MB dan verifikasi tipe MIME untuk mencegah pengunggahan file berbahaya dan DoS disk.
  - **Mounting Volume Uploads di Docker:** Penambahan bind-mount `./backend/uploads:/app/backend/uploads` pada `docker-compose.yml` agar seluruh dokumen PDF surat masuk tetap aman dan tidak hilang saat container di-*recreate*.
  - **Backup Online Tanpa Downtime:** Pembaruan `auto_backup.sh` menggunakan SQLite Online Backup API (`.backup`) tanpa mematikan container Docker, menjaga ketersediaan layanan 24/7 bagi petugas di lapangan.
  - **Sinkronisasi Hari Libur KPI & Perbaikan Unduh PDF:** Menyelaraskan daftar libur nasional (`INDONESIAN_HOLIDAYS`) dan parsing UTC pada perhitungan KPI backend dengan SLA frontend, serta perbaikan *relative URL* unduhan PDF di domain publik `https://pantaukantahtangsel.web.id`.
- **Tahap 11 — Modernisasi UI/UX, Aksesibilitas WCAG, Skeleton Shimmer, & Mobile Optimization:**
  - **Numpad Mobile Otomatis & Auto-Capitalization Guard:** Kolom nomor berkas pada formulir pendaftaran ditambahkan atribut `inputMode="numeric"` agar langsung menampilkan numpad angka di smartphone. Kolom login ditambahkan proteksi `autoCapitalize="none"` untuk mencegah kesalahan kapitalisasi otomatis di HP.
  - **Peningkatan Kontras Visual (WCAG AA):** Seluruh teks sekunder, label, dan ikon input disesuaikan dari `#64748b` menjadi `#94a3b8` untuk keterbacaan optimal di berbagai kondisi pencahayaan layar.
  - **Kolom Tabel Lengket (*Sticky Column*) pada Mobile:** Kolom `No. Berkas` (Admin Dashboard) dan `No. Agenda` (Surat Dashboard) tetap terkunci di sisi kiri saat tabel digeser secara horizontal di layar ponsel.
  - **Animasi Skeleton Shimmer Loading:** Menggantikan spinner tradisional dengan balok *skeleton shimmer* di seluruh modul utama untuk mengeliminasi *Cumulative Layout Shift (CLS)* dan memberikan pengalaman transisi yang mulus.
  - **Desain *Empty State* Kontekstual:** Menampilkan kartu ucapan positif (*"Semua Berkas Beres! 🎉"*) saat tidak ada berkas yang tertunda di meja petugas, serta tombol pintas reset saat pencarian tidak menemukan hasil.
- **Tahap 12 — Implementasi Tema Ganda (Clean Office Slate & Dark Glassmorphism) & Theme Toggle:**
  - **Dua Tema Visual Terpadu:** Menyediakan opsi tema **Mode Terang (Clean Office Slate)** dengan palet slate netral yang elegan dan nyaman di mata untuk ruangan kantor yang terang benderang, mendampingi tema bawaan **Mode Gelap (Dark Glassmorphism)**.
  - **Tombol Pintas Ganti Tema (*Theme Toggle Button*):** Terpasang di bilah navigasi utama (`Navbar.jsx`) dan portal gerbang utama (`HomeHub.jsx`) dengan ikon Matahari (*Sun*) dan Bulan (*Moon*).
  - **Sinkronisasi Otomatis Antar Tab & Anti-Flicker:** Menggunakan event sinkronisasi `theme-change`, penyimpanan persisten `localStorage`, serta skrip inisialisasi anti-flicker (*zero FOUC*) langsung di `<head>` dokumen HTML.
  - **Desain Bebas Tabrakan Warna (*No White-on-White*):** Seluruh variabel token warna (`--bg-color`, `--surface-card`, `--text-main`, `--text-muted`, `--border-color`, `--card-shadow`, dll.) diintegrasikan ke seluruh dasbor, kartu metrik, modal notifikasi, dan tabel berkas sehingga kontras dan kenyamanan visual tetap tajam dan sempurna di kedua mode.
- **Tahap 13 — Pelacakan Siklus Penuh Persuratan, Kinerja KPI Persuratan, Penyempurnaan Tampilan, & Standarisasi Cetak Slip QR:**
  - **Detail Perjalanan Surat & Transit Antar Meja (`SuratDetails.jsx`):** Pembuatan halaman detail perjalanan surat (`/surat/detail/:id`) yang setara dengan berkas fisik, lengkap dengan garis waktu riwayat pergerakan surat (`surat_history`), pengiriman surat antar meja (*Transit Surat*), pembatalan transit, catatan petugas dinamis, serta instruksi disposisi pimpinan.
  - **Analitik Kinerja Persuratan di KPIDashboard & Pengelolaan Admin Panel:** Penambahan tab **Kinerja Persuratan** pada `KPIDashboard` ditenagai endpoint `GET /api/reports/kpi-surat` untuk mengukur durasi dan volume penanganan surat per petugas, serta penambahan tab **Kelola Persuratan** di `AdminDashboard` untuk aksi administratif surat (*force complete*, tutup surat, hapus surat, dan akses file PDF).
  - **Optimalisasi Antarmuka Login & Mobile Viewport Lock:** Pemusatan posisi kartu login (`Login.jsx`) ke tengah layar (*centered*) tanpa panel hero samping, serta penguncian viewport mobile (`100dvh` dengan `overflow: hidden`) agar halaman login pada smartphone tidak dapat digeser atau di-scroll.
  - **Penyelarasan Desain & Tipografi Monitoring Surat:** Menyamakan lebar kontainer (`max-width: 1100px`), ukuran font judul `h1` (`1.65rem`), kotak ikon header biru muda, tombol aksi, serta dimensi kotak pencarian dengan antarmuka Monitoring Berkas. Memperbaiki warna kolom `No. Agenda` (`.table-sticky-col`) agar harmonis dan menyatu dengan permukaan tabel di desktop.
  - **Penyederhanaan Halaman PDF Tools (`PdfTools.jsx`):** Menghilangkan blok hero header atas agar pengguna dapat langsung mengakses navigasi tab dan utilitas manipulasi berkas PDF tanpa distraksi visual.
  - **Standarisasi Cetak Slip QR Surat & Isolasi Media Cetak:** Menyelaraskan tata letak cetak slip QR surat agar 100% konsisten dengan slip berkas resmi (`No. Agenda`, `No. Surat`, `Asal`, `Perihal`, dan pencatatan alamat `IP` di baris terbawah melalui endpoint internal `/api/my-ip`), serta menerapkan aturan CSS `@media print` khusus (`.print-only-slip`) sehingga browser hanya mencetak slip bersih tanpa latar modal gelap maupun tombol aplikasi.
  - **Akses Universal Dashboard Kinerja & Dukungan Penuh Mobile:** Membuka akses Dashboard Kinerja bagi seluruh profil pengguna (menghapus batasan role di frontend `KpiRoute` dan backend `/api/reports/kpi`), menghilangkan pemblokir layar HP di `KPIDashboard.jsx`, mengoptimalkan tata letak tab navigasi dan kartu metrik secara responsif di ponsel, serta menambahkan menu pintas **Kinerja** pada bilah navigasi utama (Desktop & Mobile drawer menu) dan portal Home Hub.
- **Tahap 14 — Halaman Profil Pengguna, Ruang Berkas DWG Bilateral, Paginasi Pengguna, & Restrukturisasi Navigasi Navbar:**
  - **Halaman Profil Pengguna & Unggah Foto (`Profile.jsx`):** Penyediaan halaman profil pribadi yang dapat diakses langsung dengan mengeklik *user pill* identitas di bilah navigasi (Desktop & Mobile). Pengguna dapat mengunggah dan menghapus foto profil kustom (`avatar_url`), melihat peran/hak akses aktif, serta sinkronisasi visual instan ke navbar dan Home Hub.
  - **Ruang Berkas DWG (AutoCAD) & Pertukaran Bilateral:** Integrasi penyimpanan dan transfer file `.dwg` kadastral yang dibatasi secara ketat khusus untuk **Asisten Surveyor Kadastral** dan **Petugas Pemetaan** (serta Administrator). Dilengkapi tab `Semua`, `Berkas Masuk (Inbox)`, `Folder Pribadi`, dan `Terkirim (Outbox)`, modal kirim langsung atau teruskan (*forward*) berkas dengan catatan, sistem *reference counting* multi-owner agar file fisik di server tidak terhapus sembarangan, serta notifikasi instan bot Telegram penerima.
  - **Restrukturisasi Menu Navigasi Navbar (`Navbar.jsx`):** Menempatkan tombol pintas **Admin Panel** dan **Kelola Akun** langsung di bilah navbar atas bagi akun Administrator, mengalihkan akses menu **Kinerja** agar berfokus diakses melalui portal Home Hub, serta merapikan posisi menu kanan (`Sandi` & `Keluar`) agar tetap rapat kanan tanpa terpotong di layar laptop & desktop.
  - **Paginasi Tabel Manajemen Pengguna (`UserManagement.jsx`):** Mengoptimalkan daftar akun pengguna di panel admin dengan paginasi 10 baris per halaman untuk mempercepat proses render antarmuka dan mempermudah navigasi data staf/petugas.
  - **Kotak Saran & Ide Fitur Pengguna (`SuggestionModal.jsx`):** Penyediaan tombol saran di *Topbar* dan banner interaktif *Hero* portal Home Hub untuk menampung ide dan aspirasi staf demi pengembangan berkelanjutan aplikasi, dilengkapi notifikasi bot Telegram otomatis ke Administrator serta panel review status usulan (*Menunggu Review*, *Ditinjau*, *Diterima*, *Selesai*, *Ditolak*).
- **Tahap 15 — Notifikasi Suara Web Audio API Pemindai QR & Sterilisasi Total Cetak Slip QR:**
  - **Notifikasi Suara Sukses & Feedback Audio Pemindai (`audioUtils.js`):** Implementasi engine suara sintesis *client-side* berbasis browser-native *Web Audio API* untuk memberikan konfirmasi audio instan saat petugas memindai QR Code di `Scanner.jsx` (berkas) maupun `SuratScanner.jsx` (surat masuk).
    - **Nada Berhasil (`playScanSuccessSound`):** Akord harmonik ganda *C6 (1046.5 Hz) -> G6 (1568 Hz)* berdurasi ~0.28 detik yang renyah dan elegan, ditenagai *dynamics compressor* agar suara tidak pecah di speaker smartphone saat pemindaian beruntun (*batch mode*).
    - **Nada Beep Deteksi (`playScanBeepSound`):** Nada *sine wave* cepat 1480 Hz (~0.08 detik) ketika kamera pertama kali mendeteksi QR Code sebelum dikirim ke backend.
    - **Nada Peringatan Error (`playScanErrorSound`):** Nada rendah *sawtooth* 280 Hz -> 180 Hz (~0.20 detik) ketika berkas ditolak, berstatus selesai/tutup, atau QR tidak valid.
    - **Kompatibilitas Penuh Perangkat Bergerak & Tombol Tes:** Dilengkapi pendengar event *touch-unlock* otomatis untuk mengatasi kebijakan *autoplay policy* pada browser mobile (iOS Safari / Android Chrome), serta tombol pil interaktif uji coba suara di layar scanner.
  - **Sterilisasi Total Cetak Slip QR (*Clean Print Isolation*):** Mensterilkan hasil cetak slip kode QR (`/entry`, `/file/:qrcode`, `/surat`, `/surat/detail/:id`) dari seluruh elemen antarmuka aplikasi. Melalui konfigurasi CSS `@media print` terpadu pada `index.css`, `Navbar.jsx`, dan `App.jsx`, elemen bilah navigasi atas (logo ATR/BPN, teks Kantah Tangsel, lonceng notifikasi, menu toggle hamburger), progress bar transisi, tombol navigasi, dan footer disembunyikan secara bersih (`display: none !important; height: 0 !important; margin: 0 !important; border: none !important`), memastikan hanya kartu label QR dan metadata berkas/surat yang dicetak rapi pada kertas/stiker label.
- **Tahap 16 — Resolusi Kompatibilitas iOS WebKit (Safari, Chrome iOS, & WhatsApp Browser di iPhone) & Optimasi Watchdog Pemulihan:**
  - **Target Transpilasi `['es2018', 'safari13', 'ios13']` & Lazy-Load `pdfjs-dist` (`vite.config.js` & `pdfPreview.js`):** Menurunkan target kompilasi bundel ke ES2018/Safari 13 (mengeliminasi 4.400+ *private class fields* `#` dan `static {}` blocks yang memicu kegagalan *parse* di JavaScriptCore iOS) serta memisahkan `pdfjs-dist` (versi *legacy*) ke `/pdfjs/pdf.min.mjs` agar hanya dimuat secara *on-demand* saat membuka fitur *Split PDF* (memangkas ukuran bundel utama sebesar ~500 KB).
  - **Plugin Build `iosWebKitCompatibilityPlugin` (`vite.config.js`):** Membungkus bundel JS utama ke dalam IIFE ketat dan memuatnya melalui `<script defer>` serta `<link rel="stylesheet">` tanpa atribut `type="module"` maupun `crossorigin` (mode `no-cors`), lengkap dengan parameter cache-busting `?v=<timestamp>` otomatis pada `/recovery.js`, JS, dan CSS untuk menembus cache Cloudflare Edge.
  - **Isolasi Error `WKUserScript` iOS (`recovery.js` & `App.jsx`):** Membatasi pendengar `window.onerror` di `recovery.js` agar hanya memproses error yang berasal dari bundel `/assets/` (mengabaikan injeksi skrip internal `webkit-masked-url://`, `__gCrWeb` Chrome iOS, dan WhatsApp WebView bridge), menyertakan polyfill ES2024/ES2025, serta mengamankan `window.scrollTo(0, 0)` dan `transition.finished.catch()` di `App.jsx`.
  - **Penyelarasan CORS & Static File Headers (`server.js`):** Konfigurasi CORS dinamis multi-origin (`pantaukantahtangsel.web.id`, localhost, LAN), header `Access-Control-Allow-Origin: *` pada berkas statis `express.static`, serta whitelisting domain `https://static.cloudflareinsights.com` pada Content Security Policy (`script-src` & `connect-src`).
- **Tahap 17 — Penyatuan Komponen Navigasi Utama Standard (`Navbar.jsx`) & Responsif Mobile:**
  - **Penyatuan Penuh Navbar Home Hub (`HomeHub.jsx` & `App.jsx`):** Menyelaraskan bilah atas Home Hub agar menggunakan komponen `Navbar.jsx` yang sama persis seperti seluruh modul lainnya. Menghapus kode duplikasi bilah atas kustom di `HomeHub.jsx` dan mengaktifkan drawer navigasi mobile (hamburger toggle), lonceng notifikasi audio transit, serta saklar tema secara seragam.
  - **Penyederhanaan Merek Navigasi Mobile (`Navbar.jsx`):** Menyembunyikan teks sekunder pada resolusi `<= 600px` sehingga hanya menampilkan `Pantau.Kantah Tangsel` secara konsisten pada seluruh bilah navigasi modul tanpa risiko teks membungkus baris (*anti-wrapping*).
- **Tahap 18 — Standarisasi Workspace Skills Terpadu Multi-Perangkat (`.agents/skills/`):**
  - Mengintegrasikan seluruh koleksi *Agent Skills* langsung ke dalam repository pada direktori `.agents/skills/` (mencakup suite `antislop`, `antislop-ui`, `antislop-code`, `antislop-copywriting`, `antislop-layoutmobile`, `antislop-human`, `modern-web-guidance`, serta proteksi data dan analisis cloud) sehingga saat pengguna berpindah perangkat antara **PC Kantor** dan **MacBook Pribadi**, seluruh skill langsung tersinkronisasi otomatis via `git pull` tanpa perlu instalasi manual ulang.

---

## 👨‍💻 Pengembang

Dikembangkan dengan dedikasi untuk mendukung transformasi digital dan transparansi layanan publik di lingkungan Kantor Pertanahan Kota Tangerang Selatan.

- **Author:** [@dicoandila](https://x.com/dicoandila)
- **Tahun:** 2026
