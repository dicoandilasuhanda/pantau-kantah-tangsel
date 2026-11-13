const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeFilesKpi, computeSuratKpi } = require('./kpiService');

describe('kpiService calculations', () => {
  it('computeFilesKpi menghitung rata-rata jam kerja efektif antar tahapan berkas dan melewati akhir pekan', () => {
    const now = new Date('2026-11-10T10:00:00Z'); // Sel 10 Nov
    const historyRows = [
      // Berkas #1: Loket pegang Jum 6 Nov 10:00 -> Sen 9 Nov 10:00 (24 jam efektif setelah potong Sab-Min)
      {
        file_id: 1,
        scanned_by_username: 'entry1',
        scanned_by_role: 'Petugas Entry Berkas',
        user_full_name: 'Andi Entry',
        scanned_at: '2026-11-06 10:00:00',
        nama_kegiatan: 'Pemecahan Bidang',
        location: 'Loket Pendaftaran (Entry)',
        is_transit: 0,
        transit_at: null,
      },
      // Berkas #1: Ukur pegang Sen 9 Nov 10:00 -> Sel 10 Nov 10:00 (sekarang = 24 jam)
      {
        file_id: 1,
        scanned_by_username: 'ukur1',
        scanned_by_role: 'Andi Ukur (Petugas Ukur)',
        user_full_name: 'Andi Ukur',
        scanned_at: '2026-11-09 10:00:00',
        nama_kegiatan: 'Pemecahan Bidang',
        location: 'Petugas Ukur',
        is_transit: 0,
        transit_at: null,
      },
    ];

    const result = computeFilesKpi(historyRows, now);
    const entry = result.find((r) => r.username === 'entry1');
    const ukur = result.find((r) => r.username === 'ukur1');

    assert.ok(entry);
    assert.equal(entry.roleHint, 'Andi Entry (Petugas Entry Berkas)');
    assert.equal(entry.rataRataTotalJam, 24);
    assert.equal(entry.jumlahInteraksi, 1);
    assert.deepEqual(entry.breakdown, [
      { jenisBerkas: 'Pemecahan Bidang', rataRataJam: 24, jumlahInteraksi: 1 },
    ]);

    assert.ok(ukur);
    assert.equal(ukur.rataRataTotalJam, 24);
  });

  it('computeFilesKpi menghentikan timer saat berkas berstatus transit dan mengabaikan langkah terakhir Selesai/Ditutup', () => {
    const now = new Date('2026-11-12T10:00:00Z');
    const historyRows = [
      // Sedang transit sejak 4 jam setelah diterima (bukan sampai now 48 jam)
      {
        file_id: 10,
        scanned_by_username: 'pemetaan1',
        scanned_by_role: 'Pemetaan User (Petugas Pemetaan)',
        user_full_name: 'Pemetaan User',
        scanned_at: '2026-11-10 08:00:00',
        nama_kegiatan: 'Penataan Batas',
        location: 'Petugas Pemetaan',
        is_transit: 1,
        transit_at: '2026-11-10 12:00:00',
      },
      // Berkas sudah selesai: langkah Selesai tidak dihitung sebagai waktu tunggu berjalan
      {
        file_id: 11,
        scanned_by_username: 'php1',
        scanned_by_role: 'Petugas Seksi PHP',
        user_full_name: 'Petugas PHP',
        scanned_at: '2026-11-10 08:00:00',
        nama_kegiatan: 'Permohonan SK',
        location: 'Selesai',
        is_transit: 0,
        transit_at: null,
      },
    ];

    const result = computeFilesKpi(historyRows, now);
    assert.equal(result.length, 1);
    assert.equal(result[0].username, 'pemetaan1');
    assert.equal(result[0].rataRataTotalJam, 4);
  });

  it('computeSuratKpi menghitung ringkasan status surat, jam efektif, dan jumlah penyelesaian surat', () => {
    const now = new Date('2026-11-10T14:00:00Z');
    const suratRows = [
      { id: 1, current_location: 'Selesai' },
      { id: 2, current_location: 'Ditutup' },
      { id: 3, current_location: 'Kepala Seksi Survei dan Pemetaan' },
    ];
    const historyRows = [
      {
        surat_id: 1,
        scanned_by_username: 'surat1',
        scanned_by_role: 'Petugas Entry Surat',
        user_full_name: 'Siti Surat',
        scanned_at: '2026-11-10 08:00:00',
        location: 'Petugas Entry Surat',
        asal_surat: 'Kanwil ATR/BPN',
        surat_status: 'Selesai',
      },
      {
        surat_id: 1,
        scanned_by_username: 'kasi1',
        scanned_by_role: 'Pak Kasi (Kepala Seksi Survei dan Pemetaan)',
        user_full_name: 'Pak Kasi',
        scanned_at: '2026-11-10 11:00:00',
        location: 'Selesai (Surat Diarsipkan)',
        asal_surat: 'Kanwil ATR/BPN',
        surat_status: 'Selesai',
      },
      {
        surat_id: 3,
        scanned_by_username: 'surat1',
        scanned_by_role: 'Petugas Entry Surat',
        user_full_name: 'Siti Surat',
        scanned_at: '2026-11-10 09:00:00',
        location: 'Petugas Entry Surat',
        asal_surat: 'Pemkot Tangsel',
        surat_status: 'Kepala Seksi Survei dan Pemetaan',
      },
    ];

    const kpi = computeSuratKpi(suratRows, historyRows, now);

    assert.deepEqual(kpi.summary, {
      totalSurat: 3,
      activeSurat: 1,
      completedSurat: 1,
      closedSurat: 1,
    });

    const suratOfficer = kpi.officers.find((o) => o.username === 'surat1');
    const kasiOfficer = kpi.officers.find((o) => o.username === 'kasi1');

    assert.ok(suratOfficer);
    // Surat #1: 3 jam (08:00->11:00), Surat #3: 5 jam (09:00->14:00) => rata-rata 4 jam
    assert.equal(suratOfficer.roleHint, 'Siti Surat (Petugas Entry Surat)');
    assert.equal(suratOfficer.rataRataTotalJam, 4);
    assert.equal(suratOfficer.jumlahInteraksi, 2);
    assert.equal(suratOfficer.selesaiCount, 0);

    assert.ok(kasiOfficer);
    assert.equal(kasiOfficer.rataRataTotalJam, 0);
    assert.equal(kasiOfficer.selesaiCount, 1);
  });
});
