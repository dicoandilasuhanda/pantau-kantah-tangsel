import { describe, expect, it } from 'vitest';
import {
  SOP_DAYS,
  addWorkingDays,
  calculateTotalElapsedDays,
  formatDate,
  formatDateDDMMYYYY,
  getStatusColor,
  getStatusLabel,
  getWorkingDays,
  parseSQLiteDate,
} from './dateUtils';

describe('SOP_DAYS', () => {
  it('memuat 14 jenis kegiatan layanan dengan target SOP sesuai spesifikasi', () => {
    expect(Object.keys(SOP_DAYS)).toHaveLength(14);
    expect(SOP_DAYS['Pengukuran dan Pemetaan Kadastral']).toBe(12);
    expect(SOP_DAYS['Pemecahan Bidang']).toBe(15);
    expect(SOP_DAYS['Penggabungan Bidang']).toBe(15);
    expect(SOP_DAYS['Pemisahan Bidang']).toBe(15);
    expect(SOP_DAYS['Penataan Batas']).toBe(20);
    expect(SOP_DAYS['Wakaf dari Tanah Yang Sudah Bersertipikat']).toBe(5);
    expect(SOP_DAYS['Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)']).toBe(5);
    expect(SOP_DAYS['Sertipikat Pengganti Karena Rusak/Lama']).toBe(19);
    expect(SOP_DAYS['Pelepasan Sebagian Hak']).toBe(38);
    expect(SOP_DAYS['Pendaftaran Tanah Pertama Kali Pemberian Hak']).toBe(38);
    expect(SOP_DAYS['Permohonan SK']).toBe(38);
    expect(SOP_DAYS['Sertipikat Pengganti Karena Hilang/Lelang Eksekusi']).toBe(40);
    expect(SOP_DAYS['Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak']).toBe(98);
    expect(SOP_DAYS['Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf']).toBe(98);
  });
});

describe('parseSQLiteDate', () => {
  it('mengubah format timestamp SQLite UTC menjadi objek Date UTC', () => {
    const parsed = parseSQLiteDate('2026-07-24 07:21:43');
    expect(parsed.toISOString()).toBe('2026-07-24T07:21:43.000Z');
  });

  it('mempertahankan string ISO yang sudah mengandung T', () => {
    const parsed = parseSQLiteDate('2026-11-10T03:00:00.000Z');
    expect(parsed.toISOString()).toBe('2026-11-10T03:00:00.000Z');
  });

  it('mengkloning objek Date tanpa memutasi instance asli', () => {
    const original = new Date('2026-11-10T00:00:00.000Z');
    const cloned = parseSQLiteDate(original);
    expect(cloned).not.toBe(original);
    expect(cloned.getTime()).toBe(original.getTime());
    cloned.setUTCDate(15);
    expect(original.getUTCDate()).toBe(10);
  });

  it('mengembalikan Date valid ketika input kosong', () => {
    const fallback = parseSQLiteDate(null);
    expect(fallback).toBeInstanceOf(Date);
    expect(Number.isNaN(fallback.getTime())).toBe(false);
  });
});

describe('getWorkingDays', () => {
  it('menghitung hari kerja Senin-Jumat secara akurat', () => {
    // Senin 2 Nov 2026 -> Jumat 6 Nov 2026 (4 hari kerja: Sel, Rab, Kam, Jum)
    expect(getWorkingDays('2026-11-02T00:00:00', '2026-11-06T00:00:00')).toBe(4);
  });

  it('mengabaikan hari Sabtu dan Minggu', () => {
    // Jumat 6 Nov 2026 -> Senin 9 Nov 2026 (1 hari kerja: Senin)
    expect(getWorkingDays('2026-11-06T00:00:00', '2026-11-09T00:00:00')).toBe(1);
    // Sabtu 7 Nov 2026 -> Minggu 8 Nov 2026 (0 hari kerja)
    expect(getWorkingDays('2026-11-07T00:00:00', '2026-11-08T00:00:00')).toBe(0);
  });

  it('mengabaikan hari libur nasional dan cuti bersama 2026', () => {
    // Kamis 19 Mar 2026 (Nyepi) & Jum 20 Mar, Sen 23 Mar, Sel 24 Mar (Cuti Bersama Idul Fitri)
    // Rabu 18 Mar 2026 -> Rabu 25 Mar 2026: hanya 25 Mar yang dihitung (1 hari kerja)
    expect(getWorkingDays('2026-03-18T00:00:00', '2026-03-25T00:00:00')).toBe(1);

    // 17 Agustus 2026 (Senin) libur Proklamasi: Jum 14 Ags -> Sel 18 Ags = 1 hari kerja
    expect(getWorkingDays('2026-08-14T00:00:00', '2026-08-18T00:00:00')).toBe(1);
  });

  it('mengembalikan 0 jika tanggal mulai >= tanggal selesai', () => {
    expect(getWorkingDays('2026-11-10T00:00:00', '2026-11-10T00:00:00')).toBe(0);
    expect(getWorkingDays('2026-11-12T00:00:00', '2026-11-10T00:00:00')).toBe(0);
  });
});

describe('calculateTotalElapsedDays', () => {
  it('mengurangi total_paused_days dari umur hari kerja berkas', () => {
    // Sen 2 Nov -> Jum 6 Nov = 4 hari kerja, dikurangi 2 hari pause = 2 hari
    const elapsed = calculateTotalElapsedDays(
      {
        created_at: '2026-11-02T00:00:00',
        total_paused_days: 2,
        is_paused: 0,
      },
      '2026-11-06T00:00:00'
    );
    expect(elapsed).toBe(2);
  });

  it('ikut mengurangi durasi pause yang sedang berlangsung saat is_paused === 1', () => {
    // Sen 2 Nov -> Jum 6 Nov = 4 hari kerja; dipause sejak Rab 4 Nov (2 hari) + history 1 hari = sisa 1 hari
    const elapsed = calculateTotalElapsedDays(
      {
        created_at: '2026-11-02T00:00:00',
        total_paused_days: 1,
        is_paused: 1,
        paused_at: '2026-11-04T00:00:00',
      },
      '2026-11-06T00:00:00'
    );
    expect(elapsed).toBe(1);
  });

  it('tidak mengembalikan nilai negatif ketika total pause melebihi umur berkas', () => {
    const elapsed = calculateTotalElapsedDays(
      {
        created_at: '2026-11-05T00:00:00',
        total_paused_days: 5,
        is_paused: 0,
      },
      '2026-11-06T00:00:00'
    );
    expect(elapsed).toBe(0);
  });
});

describe('addWorkingDays', () => {
  it('menghitung tanggal jatuh tempo dengan melewati akhir pekan dan libur nasional', () => {
    // Mulai Jum 14 Ags 2026, tambah 2 hari kerja: Sen 17 Ags libur -> Sel 18 Ags (1), Rab 19 Ags (2)
    const target = addWorkingDays('2026-08-14T00:00:00', 2);
    expect(formatDate(target)).toBe('19/08/2026');
  });

  it('menghitung target SOP 12 hari kerja dari tanggal mulai normal', () => {
    // Mulai Mon 2 Nov 2026 + 12 hari kerja (tidak ada libur di Nov 2026):
    // Minggu 1: 3,4,5,6 (4) + Minggu 2: 9,10,11,12,13 (5) + Minggu 3: 16,17,18 (3) = 18 Nov 2026
    const target = addWorkingDays('2026-11-02T00:00:00', 12);
    expect(formatDate(target)).toBe('18/11/2026');
  });
});

describe('formatDateDDMMYYYY', () => {
  it('mengonversi format YYYY-MM-DD dan timestamp ISO/SQLite ke DD/MM/YYYY tanpa pergeseran zona waktu', () => {
    expect(formatDateDDMMYYYY('2026-11-06')).toBe('06/11/2026');
    expect(formatDateDDMMYYYY('2026-11-10 00:00:00')).toBe('10/11/2026');
    expect(formatDateDDMMYYYY('2026-01-05T23:50:00.000Z')).toBe('05/01/2026');
  });

  it('mempertahankan string yang sudah berformat DD/MM/YYYY', () => {
    expect(formatDateDDMMYYYY('10/11/2026')).toBe('10/11/2026');
  });

  it('mengembalikan tanda hubung untuk nilai kosong', () => {
    expect(formatDateDDMMYYYY('')).toBe('-');
    expect(formatDateDDMMYYYY(null)).toBe('-');
    expect(formatDateDDMMYYYY(undefined)).toBe('-');
  });
});

describe('getStatusColor & getStatusLabel', () => {
  it('memberikan indikator hijau, kuning, dan merah sesuai ambang hari kerja di meja', () => {
    expect(getStatusColor(0)).toBe('var(--success-color)');
    expect(getStatusColor(1)).toBe('var(--success-color)');
    expect(getStatusColor(2)).toBe('var(--warning-color)');
    expect(getStatusColor(3)).toBe('var(--error-color)');

    expect(getStatusLabel(1)).toBe('Aman: Berkas baru di meja ini');
    expect(getStatusLabel(2)).toBe('Perhatian: Sudah 2 hari di meja ini');
    expect(getStatusLabel(3)).toBe('Peringatan: Lebih dari 3 hari di meja ini');
  });
});
