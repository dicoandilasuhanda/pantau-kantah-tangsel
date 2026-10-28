const fs = require('fs');

const data = `
A. Pelayanan Survei, Pengukuran dan Pemetaan :
1. Pengukuran Dan Pemetaan Kadastral (SLA 12 hari kerja)
2. Pengembalian Batas (SLA 25 hari kerja)

B. Pelayanan Pendaftaran Pertama Kali
1. Pendaftaran Tanah Pertama Kali Konversi (SLA 98 hari kerja)
2. Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak (SLA 98 hari kerja)
3. Pendaftaran Hak Milik Atas Satuan Rumah Susun (SLA 30 hari kerja)

C. Pelayanan Surat Keputusan Hak
1. Permohonan SK Pemberian Hak Dengan Konstatasi (SLA 38 hari kerja)
2. Pendaftaran SK Hak (SLA 5 hari kerja) - LAYANAN PRIORITAS
3.Pendaftaran SK Perpanjangan/Pembaruan Hak (SLA 5 hari kerja) - LAYANAN PRIORITAS
4. Pendaftaran SK Perpanjangan/Pembaruan Hak Milik Atas Satuan Rumah Susun (SLA 7 hari kerja) - LAYANAN PRIORITAS
5. Permohonan SK Pemberian Hak Milik Perorangan (SLA 38 hari kerja)
6. Permohonan SK Pemberian Hak Milik Badan Hukum (SLA 38 hari kerja)
7. Permohonan SK Pemberian Hak Guna Bangunan Perorangan (SLA 38 hari kerja)
8. Permohonan SK Pemberian Hak Guna Bangunan Badan Hukum (SLA 38 hari kerja)
9. Permohonan SK Pemberian Hak Guna Bangunan Instansi/Badan Usaha Pemerintah (SLA 38 hari kerja)
10. Permohonan SK Pemberian Hak Pakai Perorangan (SLA 38 hari kerja)
11. Permohonan SK Pemberian Hak Pakai Badan Hukum (SLA 38 hari kerja)
12. Permohonan SK Pemberian Hak Pakai Instansi/Badan Usaha Pemerintah (SLA 38 hari kerja)
13. Permohonan SK Perpanjangan Hak Guna Bangunan Perorangan (SLA 38 hari kerja)
14. Permohonan SK Perpanjangan Hak Guna Bangunan Badan Hukum (SLA 38 hari kerja)
15. Permohonan SK Perpanjangan Hak Guna Bangunan Instansi/Badan Usaha (SLA 38 hari kerja)
16. Permohonan SK Perpanjangan Hak Pakai Perorangan (SLA 38 hari kerja)
17. Permohonan SK Perpanjangan Hak Pakai Badan Hukum (SLA 38 hari kerja)
18. Permohonan SK Pembaruan Hak Guna Bangunan Perorangan (SLA 38 hari kerja)
19. Permohonan SK Pembaruan Hak Guna Bangunan Badan Hukum (SLA 38 hari kerja)
20. Permohonan SK Pembaruan Hak Guna Bangunan Instansi/Badan Usaha Pemerintah (SLA 38 hari kerja)
21. Permohonan SK Pembaruan Hak Pakai Perorangan (SLA 38 hari kerja)
22. Permohonan SK Pembaruan Hak Pakai Badan Hukum (SLA 38 hari kerja)

D. Pelayanan Peralihan Hak
1. Waris dengan Pemecahan (SLA 15 hari kerja)
2. Peralihan Hak - Jual Beli (SLA 5 hari kerja) - LAYANAN PRIORITAS
3. Lelang Dengan Perubahan Hak (SLA 7 hari kerja)
4. Waris Dengan Perubahan Hak (SLA 7 hari kerja)
5. Peralihan Hak - Pewarisan (SLA 5 hari kerja) - LAYANAN PRIORITAS
6. Peralihan Hak - Hibah (SLA 5 hari kerja) - LAYANAN PRIORITAS
7. Peralihan Hak - Tukar Menukar (SLA 5 hari kerja) - LAYANAN PRIORITAS
8. Peralihan Hak - Pemasukan Modal Dalam Perusahaan (SLA 5 hari kerja) - LAYANAN PRIORITAS
9. Peralihan Hak - Reorganisasi atau Restrukturisasi Perseroan (SLA 5 hari kerja) - LAYANAN PRIORITAS
10. Perubahan Data Berdasarkan Penetapan atau Putusan Pengadilan (SLA 5 hari kerja)
11. Peralihan Hak - Lelang (SLA 5 hari kerja) - LAYANAN PRIORITAS
12. Peralihan Hak - Pembagian Hak Bersama (SLA 5 hari kerja) - LAYANAN PRIORITAS

E. Pelayanan Hak Tanggungan
1. Cessie (SLA 7 hari)
2. Pewarisan Hak Tanggungan (SLA 5 hari kerja)
3. Peralihan Hak - Reorganisasi atau Restrukturisasi Perseroan Hak Tanggungan (SLA 5 hari kerja) - LAYANAN PRIORITAS
4. Subrogasi (SLA 7 hari)
5. Roya (SLA 3 hari kerja)
6. Roya Elektronik (SLA 5 hari kerja)
7. Merger Hak Tanggungan (SLA 7 hari)
8. Ganti Nama Pemegang Hak Tanggungan (SLA 7 hari)

F. Pelayanan Pencatatan
1. Sita (SLA 3 hari kerja)
2. Pengangkatan Sita (SLA 3 hari kerja)
3. Blokir (SLA 1 hari kerja)
4. Pencabutan Blokir (SLA 3 hari kerja)

G. Pelayanan Informasi Pertanahan
1. Surat Keterangan Pendaftaran Tanah (SLA 4 hari kerja)

H. Pelayanan Pemecahan, Penggabungan dan Pemisahan Hak
1. Pemecahan Bidang (SLA 15 hari kerja)
2. Pemisahan Bidang (SLA 15 hari kerja)
3. Penggabungan Bidang (SLA 15 hari kerja)
4. Pemecahan Hak Milik Atas Satuan Rumah Susun (SLA 30 hari kerja)
5. Penggabungan Hak Milik Atas Satuan Rumah Susun (SLA 30 hari kerja)

I. Pelayanan Pemeliharaan Data Lainnya
1. Perubahan Hak Atas Tanah (SLA 5 hari kerja) - LAYANAN PRIORITAS
2. Perubahan Hak Atas Tanah Dengan Konstatasi (SLA 30 hari kerja)
3. Ganti Nama (SLA 7 hari kerja)
4. Pelayanan Pencatatan Pembatalan Peralihan Hak (SLA 7 hari kerja)
5. Pelayanan Pemulihan Hak (SLA 7 hari kerja)

K. Pelayanan Pengganti Sertipikat
1. Sertipikat Pengganti Karena Blanko Lama (SLA 19 hari kerja)
2. Sertipikat Pengganti Karena Hilang (SLA 40 hari kerja)
3. Sertipikat Pengganti Karena Rusak (SLA 19 hari kerja)
4. Sertipikat Pengganti Karena Lelang Eksekusi (SLA 40 hari kerja)
5. Sertipikat Pengganti Karena Putusan Pengadilan (SLA 40 hari kerja)
6. Sertipikat Hak Tanggungan Pengganti Karena Hilang (SLA 40 hari kerja)

M. Pelayanan Pembatalan dan Penghapusan Hak
1. Pelayanan Pembatalan Sertipikat Pengganti (SLA 7 hari kerja)
2. Hapusnya Hak (SLA 7 hari kerja)

N. Pelayanan Pendaftaran Tanah Wakaf
1. Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf (SLA 98 hari kerja)
2. Wakaf dari Tanah Yang Sudah Bersertipikat (SLA 5 hari kerja)
3. Ganti Nadzir (SLA 7 hari kerja)

P. PPAT
1. Pelantikan PPAT (SLA 1 hari kerja)
2. Pelantikan PPAT Sementara(SLA 1 hari kerja)
3. Pemberian Cuti/Pemberhentian Sementara (SLA 1 hari kerja)
`;

const lines = data.trim().split('\\n');
const kegiatan_list = [];
let current_group = "";

for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    let matchGroup = line.match(/^([A-P])\.\s*(.+)/);
    if (matchGroup) {
        current_group = 'Kelompok ' + matchGroup[1] + ' - ' + matchGroup[2].replace(' :', '');
        continue;
    }
    
    let matchActivity = line.match(/^\d+\.\s*(.+?)\s*\(SLA (\d+)\s*hari[^)]*\)(?:\s*-\s*(LAYANAN PRIORITAS))?/i);
    if (matchActivity) {
        let nama = matchActivity[1].trim();
        let sla = parseInt(matchActivity[2]);
        let is_prioritas = matchActivity[3] ? 1 : 0;
        
        kegiatan_list.push({
            kelompok: current_group,
            nama_kegiatan: nama,
            sla_hari: sla,
            is_prioritas: is_prioritas
        });
    }
}

let sql = 'CREATE TABLE IF NOT EXISTS master_kegiatan (\n';
sql += '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n';
sql += '  kelompok TEXT,\n';
sql += '  nama_kegiatan TEXT,\n';
sql += '  sla_hari INTEGER,\n';
sql += '  is_prioritas INTEGER DEFAULT 0\n';
sql += ');\n\n';
sql += 'DELETE FROM master_kegiatan;\n';

for (let k of kegiatan_list) {
    sql += "INSERT INTO master_kegiatan (kelompok, nama_kegiatan, sla_hari, is_prioritas) VALUES ('" + k.kelompok + "', '" + k.nama_kegiatan + "', " + k.sla_hari + ", " + k.is_prioritas + ");\n";
}

fs.writeFileSync('seed_kegiatan.sql', sql);
console.log('Generated seed_kegiatan.sql with ' + kegiatan_list.length + ' records.');
