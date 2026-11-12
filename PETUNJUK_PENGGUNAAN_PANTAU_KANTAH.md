# 📘 Petunjuk Penggunaan Aplikasi Pantau.Kantah Tangsel

**Sistem Informasi Pelacakan Berkas Permohonan, Persuratan & Ruang Kerja Digital**  
**Kantor Pertanahan Kota Tangerang Selatan**

---

## 📋 Daftar Isi

1. [Halaman Login & Keamanan Sesi](#1-halaman-login--keamanan-sesi)
2. [Portal Utama (Home Hub) & Navigasi Atas](#2-portal-utama-home-hub--navigasi-atas)
3. [Modul Monitoring Berkas Permohonan (`/berkas`)](#3-modul-monitoring-berkas-permohonan-berkas)
4. [Entri Berkas Permohonan Baru & Cetak QR Code (`/entry`)](#4-entri-berkas-permohonan-baru--cetak-qr-code-entry)
5. [Detail Berkas, Kirim Transit, Disposisi & Jeda SOP (`/file/:qrcode`)](#5-detail-berkas-kirim-transit-disposisi--jeda-sop-fileqrcode)
6. [Scan QR Berkas (Kamera & Scanner USB/Wireless) (`/scan`)](#6-scan-qr-berkas-kamera--scanner-usbwireless-scan)
7. [Modul Monitoring Persuratan / Surat Masuk (`/surat`)](#7-modul-monitoring-persuratan--surat-masuk-surat)
8. [Entri Surat Masuk & Unggah Lampiran PDF (`/surat/entry`)](#8-entri-surat-masuk--unggah-lampiran-pdf-suratentry)
9. [Dashboard Kinerja Petugas (KPI) & Top 50 Berkas Terlama (`/kpi`)](#9-dashboard-kinerja-petugas-kpi--top-50-berkas-terlama-kpi)
10. [PDF Tools Kantah (Olah Dokumen Mandiri di Browser) (`/pdf-tools`)](#10-pdf-tools-kantah-olah-dokumen-mandiri-di-browser-pdf-tools)
11. [Profil Pengguna, Integrasi Bot Telegram & Ruang Kerja `.dwg` (`/profile`)](#11-profil-pengguna-integrasi-bot-telegram--ruang-kerja-dwg-profile)
12. [Admin Panel: Kelola Berkas, Surat & Laporan Excel (`/admin`)](#12-admin-panel-kelola-berkas-surat--laporan-excel-admin)
13. [Manajemen Pengguna & Hak Akses Multi-Role (`/admin/users`)](#13-manajemen-pengguna--hak-akses-multi-role-adminusers)
14. [Statistik Pengguna Online & Manajemen Sesi Real-Time (`/admin/stats`)](#14-statistik-pengguna-online--manajemen-sesi-real-time-adminstats)

---

## 1. Halaman Login & Keamanan Sesi

Saat pertama kali membuka alamat aplikasi **`https://pantaukantahtangsel.web.id`** (atau melalui IP jaringan lokal kantor), Anda akan diarahkan ke **Halaman Login**.

![Halaman Login Pantau.Kantah Tangsel](docs/screenshots/01_login.png)

### Langkah-langkah Masuk ke Sistem:
1. **Username**: Masukkan *username* akun pegawai Anda (tidak peka huruf besar/kecil).
2. **Kata Sandi**: Masukkan kata sandi akun Anda. Klik ikon **Mata (`👁️`)** di sisi kanan kolom untuk melihat atau menyembunyikan karakter sandi.
3. **Ingat Sesi Saya**:
   - **Dicentang**: Sesi login Anda tetap tersimpan meskipun browser ditutup.
   - **Tidak Dicentang**: Sesi akan otomatis berakhir ketika jendela browser ditutup demi keamanan pada komputer bersama.
4. **Mode Tampilan (Siang / Malam)**: Gunakan tombol pengalih tema (**☀️ / 🌙**) di pojok kanan atas untuk mengganti tampilan *Light Mode* atau *Dark Mode*.
5. **Lupa Sandi?**: Klik tautan **Lupa sandi?** untuk melihat petunjuk menghubungi Administrator guna melakukan *reset* kata sandi.
6. Klik tombol **Masuk ke Sistem →** untuk melanjutkan ke Portal Utama.

---

## 2. Portal Utama (Home Hub) & Navigasi Atas

Setelah berhasil login, Anda akan disambut oleh halaman **Home Hub (`/`)** yang berfungsi sebagai pusat kendali seluruh modul aplikasi.

![Portal Utama Home Hub](docs/screenshots/02_home_hub.png)

### Penjelasan Komponen Utama:
- **Bilah Navigasi Atas (Navbar)**:
  - **Logo & Identitas Kantah**: Klik logo di kiri atas dari halaman mana saja untuk kembali ke **Home Hub**.
  - **Menu Kontekstual**: Menyesuaikan secara pintar dengan modul yang sedang Anda buka (misalnya menampilkan tombol *Entri Berkas*, *Scan QR*, *KPI*, dan *Admin Panel*).
  - **Tombol Tema (☀️/🌙)**: Mengubah skema warna aplikasi secara instan.
  - **Chip Profil Pengguna**: Menampilkan foto/inisial, nama lengkap, dan jabatan Anda. Klik bagian ini untuk membuka halaman **Profil & Ruang Kerja DWG**.
  - **Tombol Keluar**: Mengakhiri sesi login Anda dengan aman.
- **5 Kartu Modul Utama**:
  1. **Monitoring Berkas**: Pelacakan posisi fisik berkas permohonan Survei & Pemetaan (Alur K1 dan K2), perhitungan hari kerja SLA/SOP, dan serah terima berkas.
  2. **Monitoring Persuratan**: Pelacakan surat masuk, pencetakan QR Agenda, lampiran PDF, dan disposisi persuratan.
  3. **PDF Tools Kantah**: Alat pengolah file PDF mandiri (*Merge, Split, Compress, Rotate, Image to PDF*) tanpa perlu mengunggah dokumen ke internet luar.
  4. **Profil & Ruang Kerja DWG**: Pengaturan foto profil, integrasi notifikasi Bot Telegram, dan pengiriman/penyimpanan file peta kerja AutoCAD (`.dwg`).
  5. **Admin Panel & Pengguna** *(Khusus Administrator)*: Manajemen seluruh data berkas/surat, unduh laporan Excel (`.xlsx`), kelola akun pegawai, dan pantau pengguna online.

---

## 3. Modul Monitoring Berkas Permohonan (`/berkas`)

Halaman **Monitoring Berkas** menyajikan gambaran menyeluruh mengenai posisi berkas permohonan di Seksi Survei dan Pemetaan secara *real-time*.

![Dashboard Monitoring Berkas](docs/screenshots/03_monitoring_berkas.png)

### Fitur-fitur pada Dashboard Monitoring Berkas:
1. **Kartu Ringkasan Cepat (Bagian Atas)**:
   - **Berkas Aktif**: Jumlah seluruh berkas permohonan yang sedang berjalan (belum *Selesai* atau *Ditutup*).
   - **Melewati SOP**: Jumlah berkas aktif yang telah melampaui batas hari kerja SLA sesuai jenis kegiatannya.
   - **Berkas di Lokasi Saya**: Jumlah berkas yang saat ini berada pada tanggung jawab Anda atau sedang dikirim (*transit*) kepada Anda.
2. **Kotak Masuk Kiriman Berkas (Transit)**:
   - Muncul otomatis di bagian atas apabila ada rekan petugas yang mengirimkan berkas kepada Anda. Anda dapat langsung melihat pengirimnya atau memindai QR berkas fisik saat berkas tiba di meja Anda.
3. **Grafik Distribusi Posisi Berkas (Alur K1 & K2)**:
   - Menampilkan diagram batang jumlah berkas pada setiap tahapan:
     - **Alur K1 (7 Tahap)**: Mulai dari *Loket Pendaftaran (Entry)* → *Petugas Ukur* → *Petugas Pemetaan* → *Petugas Alih Media* → *Koordinator K1* → *Kepala Seksi SP* → *Loket Penyerahan*.
     - **Alur K2 / Rutin (11 Tahap)**: Mencakup verifikasi *Asisten Surveyor Kadastral (ASK)* dan tahapan lintas seksi ke *Seksi PHP*.
   - **Interaktif**: Klik salah satu baris tahapan pada grafik untuk langsung menyaring daftar berkas yang sedang berada di tahapan tersebut.
4. **Fitur "Cari Berkas Petugas"**:
   - Memungkinkan Anda mencari dan memantau beban berkas yang sedang dipegang oleh petugas tertentu beserta rincian jenis kegiatannya.
5. **Tabel Daftar Berkas & Kirim Berkas Massal (*Batch Transit*)**:
   - Gunakan tab filter **Tugas Saya**, **Semua Berkas**, **Lewat SOP**, **Selesai**, atau **Ditutup**.
   - Centang beberapa berkas sekaligus pada kolom kotak centang (*checkbox*), lalu klik tombol **Kirim Berkas Terpilih** pada bilah aksi mengambang di bagian bawah untuk melakukan serah terima banyak berkas sekaligus ke satu petugas tujuan.

---

## 4. Entri Berkas Permohonan Baru & Cetak QR Code (`/entry`)

Petugas Loket Pendaftaran atau Administrator dapat mendaftarkan berkas permohonan baru melalui menu **Entri Berkas**.

![Form Entri Berkas Baru](docs/screenshots/04_entry_berkas.png)

### Cara Mendaftarkan Berkas Baru:
1. **Nomor Berkas & Tahun Berkas**: Masukkan nomor berkas permohonan (contoh: `67255`) dan tahun berkas (`2026`). Sistem secara otomatis menerapkan **Kunci Anti-Duplikasi** agar kombinasi Nomor + Tahun yang sama tidak dapat diinput ganda.
2. **Nama Pemohon**: Isi nama lengkap pemohon atau badan hukum.
3. **Jenis Kegiatan**: Pilih salah satu dari **17 jenis layanan Survei & Pemetaan** (seperti *Pemecahan Bidang*, *Pengukuran Dan Pemetaan Kadastral*, *Pengembalian Batas*, *Permohonan SK Konfirmasi*, dll.). Sistem otomatis menetapkan target hari kerja SLA/SOP sesuai kegiatan yang dipilih.
4. **Jenis Hak & Nomor Hak**: Pilih jenis hak (*Hak Milik*, *HGB*, *Hak Pakai*, *Hak Pengelolaan*, *Wakaf*, atau *Belum Terdaftar*) dan masukkan nomor haknya.
5. **Kecamatan & Kelurahan**: Pilih Kecamatan di wilayah Kota Tangerang Selatan; daftar Kelurahan akan menyesuaikan secara otomatis.
6. **Catatan Awal (Opsional)**: Tambahkan informasi tambahan bila diperlukan.
7. Klik **Simpan & Buat QR Code**:
   - Panel di sebelah kanan akan langsung menampilkan **Slip QR Code Berkas** berlogo ATR/BPN.
   - Klik tombol **Cetak QR Code** untuk mencetak slip tempel berkas fisik.

---

## 5. Detail Berkas, Kirim Transit, Disposisi & Jeda SOP (`/file/:qrcode`)

Mengklik salah satu baris berkas pada tabel Monitoring akan membuka halaman **Detail Berkas**.

![Halaman Detail Berkas Permohonan](docs/screenshots/05_detail_berkas.png)

### Fitur-fitur pada Halaman Detail Berkas:
1. **Informasi Lengkap & Indikator SLA/SOP**:
   - Menampilkan Nomor Berkas, Pemohon, Jenis Kegiatan, Lokasi Kecamatan/Kelurahan, Posisi Tahapan Saat Ini, serta jumlah **Hari Kerja Berjalan** dibandingkan batas target SOP (hijau = aman, kuning = mendekati batas, merah = melewati SOP).
2. **Kirim Berkas (Transit Antar Petugas)**:
   - Klik tombol **Kirim Berkas (Transit)**, pilih nama petugas tujuan melalui kolom pencarian, lalu konfirmasi.
   - Petugas tujuan akan langsung menerima **Notifikasi Telegram Otomatis** di ponselnya bahwa berkas sedang dikirim menuju mejanya.
3. **Hentikan Sementara / Lanjutkan SOP (Khusus Koordinator, Kasi SP, & Admin)**:
   - Jika berkas terkendala kelengkapan dokumen dari pemohon atau kendala eksternal lapangan, klik tombol **Hentikan SOP (Pause)**. Selama berkas dijeda, arloji perhitungan hari kerja SLA akan berhenti dan baru dihitung kembali saat tombol **Lanjutkan SOP (Resume)** ditekan.
4. **Catatan Berkas & Lembar Disposisi Digital**:
   - **Catatan Berkas**: Petugas dapat memperbarui catatan teknis berkas; sistem otomatis membubuhkan jejak nama petugas, jabatan, dan waktu perubahan.
   - **Disposisi**: Pejabat/Koordinator/Petugas dapat menambahkan instruksi disposisi beruntun yang tersimpan rapi lengkap dengan stempel waktu.
5. **Riwayat Perjalanan Berkas (Timeline)**:
   - Menampilkan urutan kronologis perpindahan berkas dari meja ke meja, lengkap dengan nama petugas pemindai dan durasi waktu di setiap tahapan.
6. **Slip QR Code & Cetak Ulang**:
   - Tersedia di panel kanan untuk mencetak ulang label QR Code kapan saja.

---

## 6. Scan QR Berkas (Kamera & Scanner USB/Wireless) (`/scan`)

Halaman **Scan QR** digunakan oleh setiap petugas tahapan saat menerima fisik berkas di mejanya agar posisi berkas berpindah secara resmi ke akun dan tahapan petugas tersebut.

![Halaman Scan QR Berkas](docs/screenshots/06_scan_qr_berkas.png)

### 2 Metode Pemindaian yang Didukung:
1. **Mode Scanner Fisik (USB / Wireless 2.4GHz / Bluetooth) — *Direkomendasikan di Meja Kerja***:
   - Pastikan tab **Scanner Fisik / Ketik Manual** aktif dan kursor berada di dalam kotak input.
   - Arahkan alat *barcode/QR scanner* ke stiker QR pada map berkas lalu tekan pelatuknya.
   - Alat scanner akan otomatis mengetikkan kode berkas dan mengirim tombol `Enter` sehingga berkas langsung terverifikasi dalam hitungan milidetik tanpa perlu menekan tombol apa pun di layar.
2. **Mode Kamera Perangkat (HP / Tablet / Webcam Laptop)**:
   - Klik tombol **Buka Kamera QR**, izinkan akses kamera pada browser, lalu arahkan lensa kamera ke QR Code berkas.
3. **Umpan Balik Suara Pintar (*Smart Voice Feedback*) & Beep**:
   - Setiap kali scan berhasil, aplikasi mengeluarkan bunyi *beep* konfirmasi diikuti pengucapan suara Bahasa Indonesia otomatis (contoh: *"Scan berhasil. Berkas nomor enam tujuh dua tiga enam"*).
   - Gunakan tombol **🔊 Uji Suara** untuk memastikan speaker perangkat Anda aktif.

---

## 7. Modul Monitoring Persuratan / Surat Masuk (`/surat`)

Selain berkas permohonan pengukuran, aplikasi menyediakan modul khusus **Monitoring Persuratan** untuk melacak surat masuk (undangan pengadilan, permohonan keterangan teknis kepolisian, surat dinas instansi, dll.).

![Dashboard Monitoring Surat Masuk](docs/screenshots/07_monitoring_surat.png)

### Fitur Utama Monitoring Persuratan:
1. **Pencarian Cepat**: Cari surat berdasarkan **Nomor Agenda**, **Nomor Surat**, **Asal Surat**, atau **Perihal**.
2. **Akses Dokumen PDF Terproteksi**:
   - Jika surat memiliki lampiran hasil scan PDF, klik tombol **Lihat PDF** untuk membuka dokumen digitalnya secara langsung di tab baru (dilindungi autentikasi token sesi).
3. **Cetak QR Agenda Surat**:
   - Klik ikon **QR Code (`🏁`)** pada baris surat untuk menampilkan modal QR Code Agenda Surat dan mencetaknya ke lembar disposisi fisik.
4. **Navigasi ke Detail & Scan QR Surat**:
   - Klik baris surat untuk melihat **Detail Surat (`/surat/detail/:id`)** guna mengirim transit surat, menulis disposisi surat, atau melihat riwayat perjalanan surat.
   - Klik tombol **Scan QR Surat (`/surat/scan`)** di bagian atas untuk memindai penerimaan fisik surat masuk.

---

## 8. Entri Surat Masuk & Unggah Lampiran PDF (`/surat/entry`)

Petugas Entry Surat dan Administrator dapat meregistrasi surat masuk baru melalui halaman **Entri Surat Masuk**.

![Form Entri Surat Masuk](docs/screenshots/08_entry_surat.png)

### Langkah-langkah Entri Surat Masuk:
1. **Nomor Agenda & Nomor Surat**: Masukkan nomor agenda internal dan nomor surat resmi yang tertera pada naskah surat.
2. **Tanggal Surat & Tanggal Terima**: Pilih tanggal surat diterbitkan dan tanggal surat diterima di Kantor Pertanahan.
3. **Asal Surat & Perihal**: Ketik instansi/pihak pengirim surat beserta ringkasan perihal surat.
4. **Unggah File PDF Surat (Opsional, Maks. 10 MB)**:
   - Pilih file hasil pemindaian surat berformat `.pdf`.
   - Sistem akan menampilkan **Pratinjau Halaman Pertama PDF** secara otomatis di layar sebelum Anda menyimpan data.
5. Klik **Simpan & Buat QR Surat** untuk menyimpan data sekaligus menampilkan label QR Code Agenda Surat yang siap dicetak.

---

## 9. Dashboard Kinerja Petugas (KPI) & Top 50 Berkas Terlama (`/kpi`)

Halaman **Analitik & KPI** memberikan transparansi beban kerja dan kecepatan penyelesaian berkas maupun persuratan bagi seluruh jajaran Seksi Survei dan Pemetaan.

![Dashboard Kinerja & Analitik KPI](docs/screenshots/09_kpi_dashboard.png)

### 3 Tab Analitik pada Halaman KPI:
1. **Tab `KPI Berkas Permohonan`**:
   - Menampilkan grafik perbandingan **Jumlah Interaksi Berkas** dan **Rata-rata Waktu Penyelesaian (Jam Kerja)** per petugas.
   - Tersedia filter dropdown **Pilih Nama Petugas** dan **Pilih Jenis Kegiatan** untuk melihat rincian (*breakdown*) performa spesifik masing-masing pegawai.
2. **Tab `KPI Persuratan`**:
   - Menampilkan ringkasan total surat masuk, surat aktif, surat selesai, serta grafik kecepatan tindak lanjut surat per petugas berdasarkan instansi asal surat.
3. **Tab `Top 50 Berkas Aktif Terlama`**:
   - Menampilkan daftar peringkat 50 berkas permohonan aktif yang memiliki durasi hari kerja berjalan paling lama (otomatis mengecualikan hari Sabtu, Minggu, hari libur nasional, dan durasi jeda/*pause*), sehingga pimpinan dan koordinator dapat melakukan percepatan (*debottlenecking*) secara tepat sasaran.

---

## 10. PDF Tools Kantah (Olah Dokumen Mandiri di Browser) (`/pdf-tools`)

Modul **PDF Tools Kantah** memungkinkan pegawai mengolah dokumen PDF secara langsung di dalam browser (*100% Client-Side Processing*) sehingga dokumen negara tetap aman di perangkat lokal dan tidak pernah diunggah ke situs pihak ketiga di internet.

![PDF Tools Kantah](docs/screenshots/10_pdf_tools.png)

### 5 Fitur Pengolahan PDF yang Tersedia:
1. **Gabung PDF (*Merge PDF*)**: Menggabungkan beberapa file PDF (misalnya berkas permohonan, identitas, dan gambar ukur) menjadi satu file PDF utuh. Anda dapat mengatur urutan file sebelum digabungkan.
2. **Pisah PDF (*Split / Extract PDF*)**: Memisahkan halaman tertentu atau rentang halaman (contoh: `1-3, 5`) dari sebuah dokumen PDF besar.
3. **Kompres PDF (*Compress PDF*)**: Memperkecil ukuran file PDF dengan pilihan tingkat kualitas (*Tinggi, Sedang, atau Maksimal*) agar memenuhi batas ukuran unggah aplikasi KKP.
4. **Putar Halaman (*Rotate PDF*)**: Memutar orientasi halaman PDF sebesar 90°, 180°, atau 270° lalu menyimpannya kembali.
5. **Gambar ke PDF (*Image to PDF*)**: Mengonversi kumpulan foto dokumen (`.jpg` / `.png`) menjadi satu dokumen PDF rapi.

---

## 11. Profil Pengguna, Integrasi Bot Telegram & Ruang Kerja `.dwg` (`/profile`)

Klik nama akun Anda di pojok kanan atas Navbar untuk membuka halaman **Profil Pengguna & Ruang Kerja DWG**.

![Halaman Profil, Bot Telegram, dan Ruang Kerja DWG](docs/screenshots/11_profil_dwg_telegram.png)

### Fitur-fitur pada Halaman Profil:
1. **Identitas & Foto Profil**:
   - Klik ikon kamera pada avatar Anda untuk mengunggah atau mengganti foto profil (`.jpg`, `.png`, `.webp`).
   - Menampilkan daftar lengkap jabatan/role yang melekat pada akun Anda.
2. **Integrasi Bot Telegram Notifikasi Instan**:
   - Masukkan **Telegram Chat ID** Anda dan simpan agar setiap kali ada berkas permohonan, surat masuk, atau file AutoCAD `.dwg` yang dikirimkan kepada Anda, Bot Telegram Kantor Pertanahan langsung mengirimkan pesan notifikasi ke ponsel Anda secara *real-time*.
   - Tersedia panduan langkah demi langkah cara mendapatkan *Chat ID* melalui bot Telegram.
3. **Ruang Kerja & Pengiriman File AutoCAD (`.dwg`)** *(Khusus Petugas Ukur, Petugas Pemetaan, ASK, Koordinator, & Admin)*:
   - **Simpan ke Folder Pribadi**: Unggah file gambar ukur / peta kerja berformat `.dwg` (hingga 50 MB per file) sebagai cadangan (*cloud backup* internal kantor) yang dapat diunduh dari komputer mana saja di kantor.
   - **Kirim File `.dwg` ke Rekan Petugas**: Klik tombol **Kirim File DWG**, pilih rekan penerima (misalnya dari Petugas Ukur ke ASK atau Petugas Pemetaan), tambahkan catatan koordinat/GU, dan kirim.
   - **4 Tab Pengelompokan**: Pantau seluruh file melalui tab **Semua File**, **Kotak Masuk (Inbox)**, **Folder Pribadi**, dan **Terkirim (Sent)** lengkap dengan tombol **Unduh (`.dwg`)** dan **Teruskan (Forward)**.

---

## 12. Admin Panel: Kelola Berkas, Surat & Laporan Excel (`/admin`)

Khusus bagi pengguna dengan hak akses **Administrator**, menu **Admin Panel** menyediakan kendali penuh atas seluruh data berkas permohonan dan persuratan.

![Admin Panel Kelola Berkas dan Surat](docs/screenshots/12_admin_panel.png)

### Fitur Utama Admin Panel:
1. **Dua Tab Manajemen Utama**: Beralih dengan mudah antara **Kelola Berkas Permohonan** dan **Kelola Persuratan (Surat Masuk)**.
2. **Filter Multi-Dimensi**:
   - Saring data berdasarkan **Kata Kunci Pencarian**, **Bulan**, **Tahun**, **Rentang Tanggal Mulai–Akhir**, **Jenis Kegiatan**, **Status Berkas** (*Proses, Selesai, Ditutup*), serta **Status SLA** (*Aman / Lewat SOP*).
3. **Unduh Laporan Excel (`.xlsx`)**:
   - Klik tombol **Unduh Laporan Excel** untuk mengekspor seluruh data sesuai filter aktif ke dalam file spreadsheet Microsoft Excel lengkap dengan rincian tanggal masuk, posisi terakhir, status SLA, dan catatan.
4. **Tindakan Administratif pada Berkas/Surat**:
   - **Selesaikan Manual (`✓`)**: Menandai berkas/surat telah *Selesai* secara langsung.
   - **Tutup Berkas (`🔒`)**: Menutup berkas yang dibatalkan/ditolak dengan mencantumkan alasan penutupan resmi.
   - **Hapus Permanen (`🗑️`)**: Menghapus data berkas/surat yang salah input beserta riwayatnya.
   - ** pintasan Cepat**: Di bagian atas terdapat tombol navigasi langsung menuju **Kelola Akun Pengguna** dan **Statistik Pengguna Online**.

---

## 13. Manajemen Pengguna & Hak Akses Multi-Role (`/admin/users`)

Administrator dapat menambah, mengedit, atau menghapus akun pegawai melalui halaman **Manajemen Pengguna (`/admin/users`)**.

![Halaman Manajemen Akun dan Role Pegawai](docs/screenshots/13_kelola_akun.png)

### Cara Mengelola Akun Pegawai:
1. **Tambah Pengguna Baru**:
   - Isi **Username**, **Nama Lengkap & Gelar**, **Password**, serta **Telegram Chat ID** (opsional).
   - **Dukungan Multi-Role (Jabatan Rangkap)**: Centang satu atau beberapa jabatan sekaligus pada daftar **Hak Akses / Role** (misalnya seorang pegawai merangkap sebagai *Petugas Ukur* sekaligus *Asisten Surveyor Kadastral*).
   - Klik **Tambah Pengguna**.
2. **Edit Akun / Reset Password / Perbarui Role**:
   - Klik tombol **Edit** pada baris nama pegawai di tabel sebelah kanan.
   - Formulir di sebelah kiri akan terisi otomatis. Anda dapat memperbarui nama, menambah/mengurangi centang jabatan (*role*), memperbarui *Telegram Chat ID*, atau mengisi kolom password baru jika pegawai lupa kata sandi.
   - Klik **Simpan Perubahan**.

---

## 14. Statistik Pengguna Online & Manajemen Sesi Real-Time (`/admin/stats`)

Halaman **Statistik Web-App (`/admin/stats`)** memungkinkan Administrator memantau aktivitas penggunaan sistem secara langsung (*live monitoring*).

![Statistik Pengguna Online Real-Time](docs/screenshots/14_statistik_online.png)

### Fitur Pemantauan Real-Time:
1. **Kartu Indikator Kehadiran**:
   - Menampilkan **Total Pengguna Terdaftar**, **Pengguna Sedang Online** (aktif dalam 2 menit terakhir), **Total Sesi Login Aktif**, dan **Pengguna Terhubung Telegram**.
2. **Pembaruan Otomatis (*Auto-Refresh* 15 Detik)**:
   - Data diperbarui secara otomatis setiap 15 detik tanpa perlu memuat ulang halaman.
3. **Informasi Teknis Perangkat & Jaringan**:
   - Menampilkan waktu terakhir aktif (*Baru saja*, *1 menit lalu*), alamat **IP Jaringan Lokal**, jenis perangkat/browser yang digunakan, serta status koneksi Telegram masing-masing pegawai.
4. **Putuskan Sesi (*Force Logout / Kick Session*)**:
   - Jika terdapat akun pegawai yang tertinggal login di perangkat lain atau membutuhkan penyegaran hak akses segera, Administrator dapat mengklik tombol **Putuskan Sesi** pada baris pegawai tersebut untuk mengeluarkan sesi loginnya dari jarak jauh secara instan.

---

> **Catatan Bantuan Teknis:**  
> Apabila Anda mengalami kendala akses jaringan lokal, pembaruan tampilan pada perangkat seluler (iOS/Android), atau membutuhkan penyesuaian hak akses jabatan (*role*), silakan menghubungi **Administrator Sistem Seksi Survei dan Pemetaan — Kantor Pertanahan Kota Tangerang Selatan**.
