# Aturan Kerja Otomatis (PC Kantor & Mac Pribadi)

Setiap kali melakukan perubahan kode pada proyek **Pantau SP Tangsel (`file-tracker`)**, Agent **WAJIB** langsung menjalankan langkah-langkah berikut secara otomatis tanpa menunggu perintah dari pengguna:

1. **Uji Build Lokal (Sesuai Perangkat yang Sedang Digunakan)**:
   - **Di Windows (PC Kantor)**: Jalankan `npm.cmd run build` di dalam folder `frontend`.
   - **Di macOS (Mac Pribadi)**: Jalankan `npm run build` di dalam folder `frontend`.

2. **Sinkronisasi ke Server QNAP (Jika Terhubung ke Jaringan Kantor)**:
   - **Di Windows (PC Kantor)**: Salin file kode yang berubah ke `\\10.2.0.122\Pantau SP Tangsel\file-tracker\...` dan selaraskan index Git dengan `git -C "//10.2.0.122/Pantau SP Tangsel/file-tracker" fetch origin` lalu `git reset --mixed origin/main`.
   - **Di macOS (Mac Pribadi)**: Jika folder network share QNAP sedang ter-*mount* (`/Volumes/Pantau SP Tangsel/file-tracker`), salin file yang berubah ke sana.
   - **ATURAN KEAMANAN MUTLAK**: **JANGAN PERNAH** menimpa atau menghapus `backend/database.sqlite`, `backend/uploads/`, maupun file sertifikat `.pem` di server QNAP. Jangan pernah menjalankan `git reset --hard` atau `git clean` di folder QNAP.

3. **Commit & Push Otomatis ke GitHub**:
   - Setelah *build* sukses, langsung lakukan `git add`, `git commit`, dan `git push origin main` ke repository `https://github.com/dicoandilasuhanda/pantau-kantah-tangsel.git` tanpa perlu menunggu instruksi `push ke github`.
