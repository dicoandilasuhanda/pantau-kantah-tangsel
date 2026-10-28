# Pantau.SP Tangsel (Sistem Pelacakan Berkas Terpadu)

**Pantau.SP Tangsel** (sebelumnya dikenal sebagai SILACAK TANGSEL) adalah aplikasi pelacakan berkas berbasis *web* yang dibangun untuk memonitor pergerakan dokumen/sertifikat secara *real-time* menggunakan teknologi pemindaian *QR Code*. Aplikasi ini didesain untuk menjamin transparansi pelayanan publik dan memastikan tidak ada berkas yang melampaui batas waktu Standar Operasional Prosedur (SLA).

Dibangun secara khusus oleh **@dicoandila**.

## 🚀 Fitur Utama

1. **Pelacakan QR Code *Real-Time***
   Setiap meja/loket petugas dapat memindai (*scan*) berkas menggunakan *QR Code* untuk memperbarui posisi berkas secara instan ke dalam sistem pusat.

2. **Sistem Autentikasi & Otorisasi Bertingkat**
   Aplikasi diamankan menggunakan *JSON Web Token* (JWT). Hak akses dibatasi secara ketat berdasarkan peran (*role*), mulai dari *Administrator*, *Petugas Entry*, *Petugas Ukur*, *Petugas Pemetaan*, hingga *Kepala Seksi*. Memiliki antarmuka *Login* berlatar belakang logo instansi resmi.

3. **Dasbor Eksekutif (SLA Monitor)**
   Pimpinan dan Admin memiliki akses ke dasbor khusus yang secara otomatis menghitung umur berkas sejak didaftarkan. Jika sebuah berkas melebihi batas waktu pelayanan (SLA) 20 hari kerja, sistem akan memberikan label merah (**Overdue**).

4. **Mesin Analitik KPI Petugas**
   Sistem secara diam-diam mencatat durasi (waktu tempuh) penanganan sebuah berkas dari satu petugas ke petugas lainnya. Data ini kemudian diolah menjadi bagan statistik (*Bar Chart*) interaktif yang menunjukkan **rata-rata kecepatan/penahanan berkas per individu**. Data ini juga didukung dengan sistem **Filter Ganda** (Berdasarkan Nama Petugas & Spesifik Jenis Permohonan).

5. **Ekspor Data Otomatis**
   Data pelaporan di dalam dasbor dapat ditarik (*download*) hanya dengan satu klik dan akan otomatis terformat menjadi dokumen *Microsoft Excel* (`.xlsx`).

## 🛠️ Teknologi yang Digunakan

- **Frontend:**
  - React (di-*build* menggunakan Vite)
  - CSS Vanilla (desain *Glassmorphism* modern dengan *Dark Mode*)
  - [Lucide-React] untuk tipografi ikon
  - [Recharts] untuk visualisasi data KPI
  - [XLSX] untuk fitur ekspor laporan ke Excel
  
- **Backend:**
  - Node.js & Express.js
  - SQLite3 (Database relasional ringan, tanpa instalasi *server* terpisah)
  - *jsonwebtoken* (JWT) & *bcryptjs* (Keamanan)

## 📂 Struktur Proyek

```text
file-tracker/
├── backend/                  # Server Node.js API
│   ├── server.js             # File utama backend & inisialisasi API
│   └── database.sqlite       # Database aplikasi
│
├── frontend/                 # Aplikasi React Vite
│   ├── public/               # Aset statis (Logo Instansi)
│   ├── src/
│   │   ├── components/       # Komponen modular (KPIDashboard, Auth, Navbar, dll)
│   │   ├── pages/            # Halaman utama (AdminDashboard, Tracker, Scanner, Login)
│   │   ├── utils/            # Script utilitas (API interceptors Axios)
│   │   ├── App.jsx           # Routing aplikasi (React Router Dom)
│   │   └── index.css         # Desain sistem & Styling Global
```

## ⚙️ Cara Menjalankan Proyek di Komputer Lokal

Aplikasi ini dibagi menjadi dua bagian terpisah yang harus dijalankan secara paralel (Frontend dan Backend).

### 1. Menjalankan Backend (Server API & Database)
Buka terminal baru, arahkan ke folder `backend`, lalu jalankan:
```bash
cd backend
npm install
node server.js
```
*Backend akan berjalan di: `http://localhost:3001`*

### 2. Menjalankan Frontend (Antarmuka Pengguna)
Buka terminal baru yang lain, arahkan ke folder `frontend`, lalu jalankan:
```bash
cd frontend
npm install
npm run dev
```
*Frontend akan berjalan di: `http://localhost:5173` (Pantau.SP Tangsel)*

## 📜 Log Pengembangan (History)

Proyek ini telah melalui beberapa iterasi pengembangan fitur bersama @dicoandila:
- **Tahap 1:** *Setup* Vite React & Express SQLite. Pembuatan halaman pelacakan berkas publik dan portal *login* petugas dengan keamanan token (JWT).
- **Tahap 2:** Penerapan fitur pemindaian *QR Code* pintar dan perekaman jejak (riwayat) berkas. Pemolesan desain UI/UX dengan estetika *Dark Mode* & *Glassmorphism*.
- **Tahap 3:** Pembuatan dasbor khusus Administrator dan *Kepala Seksi*. Implementasi perhitungan SLA (*Service Level Agreement*) 20 Hari dan pemasangan modul Ekspor Laporan berformat Excel (`.xlsx`).
- **Tahap 4:** Pembuatan Mesin Analitik KPI dengan penyaringan berdasarkan jenis berkas. Integrasi grafis batang (`Recharts`).
- **Tahap 5 (Branding):** Mengubah identitas (URL, Logo, dan *Footer*) menjadi **Pantau.SP Tangsel** dan menambahkan *background* logo khusus pada layar *login*.
- **Tahap 6 (Maintenance & Fitur Baru):** Perbaikan logika *timer* hari kerja SLA agar berhenti setelah berkas berstatus 'Selesai', dan penambahan fitur **Tutup Berkas Manual** di *Admin Dashboard* (lengkap dengan modal pengisian alasan penutupan yang tersimpan di rekam jejak). Juga penambahan dokumen *Cheatsheet* `Panduan_Update_Server.md` untuk mempermudah proses pembaruan (SSH & Docker).
