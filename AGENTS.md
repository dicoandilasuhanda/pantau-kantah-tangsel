# Aturan Kerja Otomatis & Tim Subagent (PC Kantor & Mac Pribadi)

Setiap kali bekerja pada proyek **Pantau SP Tangsel (`file-tracker`)**, Agent **WAJIB** langsung menjalankan langkah-langkah berikut secara otomatis tanpa menunggu perintah dari pengguna:

0. **Tarik Perubahan Terbaru di Awal Sesi (`git pull`)**:
   - Sebelum mulai mengedit kode di awal sesi (baik di **Mac Pribadi** maupun di **PC Kantor**), jalankan `git pull origin main` terlebih dahulu pada workspace lokal agar perubahan dari perangkat lain langsung tersinkronisasi.

1. **Uji Build Lokal (Sesuai Perangkat yang Sedang Digunakan)**:
   - **Di Windows (PC Kantor)**: Jalankan `npm.cmd run build` di dalam folder `frontend`.
   - **Di macOS (Mac Pribadi)**: Jalankan `npm run build` di dalam folder `frontend`.

2. **Sinkronisasi ke Server QNAP (Jika Terhubung ke Jaringan Kantor)**:
   - **Di Windows (PC Kantor)**: Salin file kode yang berubah ke `\\10.2.0.122\Pantau SP Tangsel\file-tracker\...` dan selaraskan index Git dengan `git -C "//10.2.0.122/Pantau SP Tangsel/file-tracker" fetch origin` lalu `git reset --mixed origin/main`.
   - **Di macOS (Mac Pribadi)**: Jika folder network share QNAP sedang ter-*mount* (`/Volumes/Pantau SP Tangsel/file-tracker`), salin file yang berubah ke sana.
   - **ATURAN KEAMANAN MUTLAK**: **JANGAN PERNAH** menimpa atau menghapus `backend/database.sqlite`, `backend/uploads/`, maupun file sertifikat `.pem` di server QNAP. Jangan pernah menjalankan `git reset --hard` atau `git clean` di folder QNAP.

3. **Commit & Push Otomatis ke GitHub**:
   - Setelah *build* sukses, langsung lakukan `git add`, `git commit`, dan `git push origin main` ke repository `https://github.com/dicoandilasuhanda/pantau-kantah-tangsel.git` tanpa perlu menunggu instruksi `push ke github`.

---

## Tim Subagent Khusus Pantau SP Tangsel

Untuk tugas kompleks atau pengerjaan paralel, Agent Utama dapat mendefinisikan (`define_subagent`) dan mengerahkan (`invoke_subagent`) 3 subagent spesialis berikut:

1. **`frontend-sp` (Frontend UI & UX Specialist)**
   - **Fokus**: Komponen React + Vite (`frontend/src/`), desain *Dark Glassmorphism*, tabel interaktif, filter laporan, pemindaian QR, export Excel/PDF (`xlsx`), serta sinkronisasi perhitungan SLA di `frontend/src/utils/dateUtils.js`.
2. **`backend-sp` (Backend API & SQLite Specialist)**
   - **Fokus**: Endpoint REST API di `backend/server.js`, alur tahapan berkas (`FLOWS.K1` & `FLOWS.K2`), perhitungan hari kerja & hari libur nasional (`INDONESIAN_HOLIDAYS`), validasi role pengguna, serta migrasi skema SQLite yang 100% aman bagi data produksi (`database.sqlite`).
3. **`devops-sync-sp` (Build, QNAP Sync & GitHub Release Specialist)**
   - **Fokus**: Menjalankan uji *build* lokal (`npm.cmd run build` / `npm run build`), menyinkronkan file kode ke server QNAP (`\\10.2.0.122\Pantau SP Tangsel\file-tracker`) tanpa menyentuh `database.sqlite`/`uploads`, dan melakukan *auto-commit* & *push* ke GitHub (`origin/main`).
