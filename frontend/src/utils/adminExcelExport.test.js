import { describe, it, expect } from 'vitest';
import {
  buildPeriodLabel,
  buildBerkasExcelSheets,
  buildSuratExcelSheets,
} from './adminExcelExport';

describe('adminExcelExport helpers', () => {
  it('builds consistent period labels with fallback', () => {
    expect(buildPeriodLabel({ month: 'Semua', year: 'Semua', startDate: '', endDate: '' })).toBe(
      'Semua_Periode'
    );
    expect(
      buildPeriodLabel({ month: '03', year: '2026', startDate: '2026-03-01', endDate: '' })
    ).toBe('Maret_2026_2026-03-01_sd_Sekarang');
  });

  it('builds berkas detail and summary sheets with accurate overdue & status tallies', () => {
    const sampleFiles = [
      {
        nomor_berkas: '101',
        tahun_berkas: 2026,
        nama_pemohon: 'Budi',
        nama_kegiatan: 'Pemecahan Bidang Tanah',
        current_location: 'Petugas Ukur',
        is_transit: 1,
        transit_to_fullname: 'Andi Ukur',
        created_at: '2026-01-02 09:00:00',
        latest_scan_info: 'Petugas Entry',
      },
      {
        nomor_berkas: '102',
        tahun_berkas: 2026,
        nama_pemohon: 'Siti',
        nama_kegiatan: 'Pemecahan Bidang Tanah',
        current_location: 'Selesai',
        is_transit: 0,
        created_at: '2026-01-02 09:00:00',
      },
      {
        nomor_berkas: '103',
        tahun_berkas: 2026,
        nama_pemohon: 'Tono',
        nama_kegiatan: 'Roya',
        current_location: 'Ditutup',
        is_transit: 0,
        created_at: '2026-01-02 09:00:00',
      },
    ];

    const analytics = { totalFiles: 3, completedFiles: 1, activeFiles: 1, closedFiles: 1 };
    const futureRef = new Date('2026-04-01T12:00:00Z');
    const { detailRows, summaryRows } = buildBerkasExcelSheets(sampleFiles, analytics, futureRef);

    expect(detailRows).toHaveLength(3);
    expect(detailRows[0]['Posisi Terakhir']).toBe('Sedang Transit ke Andi Ukur');
    expect(detailRows[0]['Status SLA']).toBe('TERLAMBAT (Overdue)');
    expect(detailRows[1]['Status SLA']).toBe('Aman (Selesai)');
    expect(detailRows[2]['Status SLA']).toBe('Ditutup');

    expect(summaryRows).toHaveLength(3);
    const totalRow = summaryRows[summaryRows.length - 1];
    expect(totalRow['Jenis Permohonan / Kegiatan']).toBe('TOTAL KESELURUHAN');
    expect(totalRow['Total Berkas']).toBe(3);
    expect(totalRow['Terlambat (Overdue)']).toBe(1);
  });

  it('builds surat detail and summary sheets safely', () => {
    const sampleSurat = [
      {
        nomor_agenda: '001',
        asal_surat: 'BPN Pusat',
        nomor_surat: 'SUR/01',
        tanggal_diterima: '2026-02-10',
        perihal: 'Undangan Rapat',
        current_location: 'Kepala Kantor',
      },
      {
        nomor_agenda: '002',
        asal_surat: 'BPN Pusat',
        nomor_surat: 'SUR/02',
        tanggal_diterima: '2026-02-11',
        perihal: 'Arsip',
        current_location: 'Ditutup',
        catatan: 'Selesai diarsipkan',
      },
    ];

    const analytics = { totalSurat: 2, completedSurat: 0, activeSurat: 1, closedSurat: 1 };
    const { detailRows, summaryRows } = buildSuratExcelSheets(sampleSurat, analytics);

    expect(detailRows[0]['Status Surat']).toBe('Sedang Diproses');
    expect(detailRows[1]['Status Surat']).toBe('Ditutup / Diarsipkan');
    expect(summaryRows[0]['Asal Surat / Instansi Pengirim']).toBe('BPN Pusat');
    expect(summaryRows[0]['Total Surat']).toBe(2);
    expect(summaryRows[1]['Masih Proses']).toBe(1);
    expect(summaryRows[1]['Ditutup / Diarsipkan']).toBe(1);
  });
});
