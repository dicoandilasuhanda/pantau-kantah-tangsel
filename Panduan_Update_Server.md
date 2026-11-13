# 📘 Panduan Update Aplikasi di Server QNAP (`Pantau.Kantah Tangsel`)

Dokumen ini adalah panduan operasional langkah demi langkah (*cheatsheet*) untuk memperbarui aplikasi **Pantau.Kantah Tangsel** pada server QNAP (`10.2.0.122`) dengan aman tanpa mengganggu database produksi maupun berkas unggahan pengguna.

---

## 🛡️ Aturan Keamanan Mutlak Data Produksi

> [!CAUTION]
> **JANGAN PERNAH** menimpa, menghapus, atau me-*reset* berkas berikut di server QNAP (`\\10.2.0.122\Pantau SP Tangsel\file-tracker\`):
> 1. `backend/database.sqlite` (Database utama seluruh berkas, surat, histori, dan akun pengguna)
> 2. `backend/uploads/` (Folder penyimpanan PDF surat masuk, file AutoCAD `.dwg`, dan foto profil pengguna)
> 3. `backend/cert.pem` & `backend/key.pem` (Sertifikat SSL HTTPS lokal)
> 4. **Dilarang keras** menjalankan `git reset --hard` atau `git clean` di dalam folder server QNAP.

---

## Metode 1: Update Cepat (Otomatis dari PC Kantor / Mac)

Karena `docker-compose.yml` pada server QNAP telah menggunakan *bind-mount* langsung untuk `./frontend/dist`, `./backend/server.js`, `./backend/validation.js`, `./backend/src`, `./backend/scripts`, dan `./backups`:

### A. Jika Perubahan Hanya pada Tampilan / Frontend (`frontend/src/...`)
1. Di komputer kerja, bangun bundel produksi di folder `frontend`:
   - **Windows (PC Kantor):** `cd frontend; npm.cmd run build`
   - **macOS (Mac Pribadi):** `cd frontend && npm run build`
2. Salin isi folder `frontend/dist/*` (dan file sumber yang berubah) ke `\\10.2.0.122\Pantau SP Tangsel\file-tracker\frontend\dist\`.
3. **Selesai!** Perubahan tampilan langsung aktif seketika di browser (karena bundel dilengkapi *cache-buster* `?v=<timestamp>` otomatis pada setiap *build*) tanpa perlu me-*restart* Docker container.

### B. Jika Perubahan Mencakup Backend (`backend/server.js`, `backend/validation.js`, `backend/src/`, atau `backend/scripts/`)
1. Salin berkas backend yang berubah (`backend/server.js`, `backend/validation.js`, `backend/src/...`, `backend/scripts/...`) ke direktori tujuan yang sama di `\\10.2.0.122\Pantau SP Tangsel\file-tracker\backend\`.
2. Masuk ke server QNAP melalui SSH atau buka **Container Station** di QNAP, lalu *restart* container `pantau-sp-app` agar proses Node.js memuat ulang modul backend terbaru ke memori:
   ```bash
   ssh admin@10.2.0.122
   docker restart pantau-sp-app
   ```

---

## Metode 2: Rebuild Penuh Container Docker (Jika Ada Penambahan Package `npm` Baru)

Apabila terdapat penambahan pustaka baru pada `package.json` (baik di `frontend` maupun `backend`, misalnya `zod`), lakukan *rebuild* image Docker melalui SSH:

### Tahap 1: Masuk ke Server QNAP via SSH
Buka **Windows PowerShell** atau **Terminal**, lalu jalankan:
```bash
ssh admin@10.2.0.122
```
Masukkan kata sandi administrator QNAP Anda.

### Tahap 2: Masuk ke Direktori Proyek & Pastikan `.env` Tersedia
```bash
cd "/share/Pantau SP Tangsel/file-tracker"
```
> [!IMPORTANT]
> Token Cloudflare Tunnel, `JWT_SECRET`, dan `TELEGRAM_BOT_TOKEN` dikelola terpusat di berkas `.env` root (`/share/Pantau SP Tangsel/file-tracker/.env` berdasarkan `.env.example`). Pastikan berkas `.env` tersebut sudah terisi (`JWT_SECRET` acak $\ge 32$ karakter bukan nilai default, `TELEGRAM_BOT_TOKEN`, dan `CLOUDFLARE_TUNNEL_TOKEN`) sebelum menjalankan `docker compose up -d` agar aplikasi dan `cloudflared` dapat menyala dengan benar.

### Tahap 3: Build Ulang dan Jalankan Container Aplikasi
```bash
docker compose up -d --build pantau-sp
```
> [!IMPORTANT]
> Parameter `--build` memastikan Docker menginstal dependensi `package.json` baru dan mengompilasi ulang image. Berkas `database.sqlite` dan `uploads/` tetap 100% aman karena terhubung melalui *volume bind-mount* di luar container.

---

## Tahap Verifikasi Pasca-Update

1. Pastikan container dalam kondisi sehat lewat SSH (`docker compose ps` menunjukkan status `healthy` atau cek `GET /api/health` mengembalikan `{"status":"ok","db":"connected"}`).
2. Buka alamat lokal `https://10.2.0.122:3002` atau domain publik `https://pantaukantahtangsel.web.id` di peramban Desktop maupun Mobile (iPhone Safari/Chrome & Android).
3. Setiap kali `npm run build` dijalankan, plugin `iosWebKitCompatibilityPlugin` di `vite.config.js` secara otomatis menyematkan parameter versi `?v=<timestamp>` baru pada `/recovery.js`, bundel JS, dan CSS sehingga peramban pengguna otomatis mendapatkan versi terbaru tanpa terkendala cache lama.
4. Jika pengguna ingin menyegarkan sesi/cache secara manual, fitur **Bersihkan Cache & Segarkan** juga tersedia langsung di halaman **Profil Saya (`/profile`)**.
5. Jika pembaruan disalin secara manual ke share QNAP, selaraskan index Git di QNAP hanya dengan `git fetch origin` lalu `git reset --mixed origin/main` (**jangan pernah** `git reset --hard`).
