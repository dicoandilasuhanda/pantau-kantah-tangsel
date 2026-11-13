import * as XLSX from 'xlsx';
import { SOP_DAYS, addWorkingDays, parseSQLiteDate } from './dateUtils';

export const MONTH_NAMES = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const ID_DATE_FORMAT = { day: '2-digit', month: '2-digit', year: 'numeric' };

export function calculateFileSLA(createdAt, namaKegiatan, referenceDate = new Date()) {
  const masuk = parseSQLiteDate(createdAt);
  const sopDaysTarget = SOP_DAYS[namaKegiatan] || 15;
  const jatuhTempo = addWorkingDays(createdAt, sopDaysTarget);

  const isOverdue = referenceDate > jatuhTempo;
  const formatDate = (date) => date.toLocaleDateString('id-ID', ID_DATE_FORMAT);

  return {
    masukDateObj: masuk,
    tanggalMasuk: formatDate(masuk),
    tanggalJatuhTempo: formatDate(jatuhTempo),
    isOverdue,
  };
}

export function buildPeriodLabel({ month, year, startDate, endDate }) {
  const parts = [];
  if (month && month !== 'Semua') {
    const mObj = MONTH_NAMES.find((m) => m.value === month);
    if (mObj) parts.push(mObj.label);
  }
  if (year && year !== 'Semua') parts.push(year);
  if (startDate || endDate) parts.push(`${startDate || 'Awal'}_sd_${endDate || 'Sekarang'}`);
  return parts.length > 0 ? parts.join('_') : 'Semua_Periode';
}

export function buildBerkasExcelSheets(filteredFiles, analytics, referenceDate = new Date()) {
  const detailRows = filteredFiles.map((f, index) => {
    const sla = calculateFileSLA(f.created_at, f.nama_kegiatan, referenceDate);
    const isDone = f.current_location === 'Selesai';
    const isClosed = f.current_location === 'Ditutup';
    return {
      'No': index + 1,
      'Nomor Berkas': `${f.nomor_berkas}/${f.tahun_berkas}`,
      'Pemohon': f.nama_pemohon,
      'Jenis Permohonan': f.nama_kegiatan,
      'Posisi Terakhir':
        isDone || isClosed
          ? f.current_location
          : f.is_transit === 1
            ? `Sedang Transit ke ${f.transit_to_fullname || f.transit_to_username}`
            : f.current_location,
      'Pemegang Terakhir': f.latest_scan_info || '-',
      'Status Berkas': isDone ? 'Selesai' : isClosed ? 'Ditutup' : 'Sedang Diproses',
      'Tanggal Masuk': sla.tanggalMasuk,
      'Jatuh Tempo': sla.tanggalJatuhTempo,
      'Status SLA': isDone
        ? 'Aman (Selesai)'
        : isClosed
          ? 'Ditutup'
          : sla.isOverdue
            ? 'TERLAMBAT (Overdue)'
            : 'Aman (On-Track)',
    };
  });

  const summaryMap = {};
  filteredFiles.forEach((f) => {
    const sla = calculateFileSLA(f.created_at, f.nama_kegiatan, referenceDate);
    const keg = f.nama_kegiatan || 'Lainnya';
    if (!summaryMap[keg]) {
      summaryMap[keg] = { total: 0, selesai: 0, proses: 0, ditutup: 0, terlambat: 0 };
    }
    summaryMap[keg].total++;
    if (f.current_location === 'Selesai') {
      summaryMap[keg].selesai++;
    } else if (f.current_location === 'Ditutup') {
      summaryMap[keg].ditutup++;
    } else {
      summaryMap[keg].proses++;
      if (sla.isOverdue) summaryMap[keg].terlambat++;
    }
  });

  const summaryRows = Object.keys(summaryMap)
    .sort()
    .map((keg, idx) => ({
      'No': idx + 1,
      'Jenis Permohonan / Kegiatan': keg,
      'Total Berkas': summaryMap[keg].total,
      'Selesai': summaryMap[keg].selesai,
      'Masih Proses': summaryMap[keg].proses,
      'Ditutup': summaryMap[keg].ditutup,
      'Terlambat (Overdue)': summaryMap[keg].terlambat,
    }));

  summaryRows.push({
    'No': '',
    'Jenis Permohonan / Kegiatan': 'TOTAL KESELURUHAN',
    'Total Berkas': analytics.totalFiles,
    'Selesai': analytics.completedFiles,
    'Masih Proses': analytics.activeFiles,
    'Ditutup': analytics.closedFiles,
    'Terlambat (Overdue)': Object.values(summaryMap).reduce((acc, cur) => acc + cur.terlambat, 0),
  });

  return { detailRows, summaryRows };
}

export function buildSuratExcelSheets(filteredSurat, analytics) {
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', ID_DATE_FORMAT);
  };

  const detailRows = filteredSurat.map((s, index) => {
    const loc = s.current_location || 'Petugas Entry Surat';
    const isDone = loc === 'Selesai';
    const isClosed = loc === 'Ditutup';
    return {
      'No': index + 1,
      'Nomor Agenda': s.nomor_agenda || s.nomorAgenda || '-',
      'Asal Surat / Instansi': s.asal_surat || s.asalSurat || '-',
      'Nomor Surat': s.nomor_surat || s.nomorSurat || '-',
      'Tanggal Diterima': formatDateDisplay(s.tanggal_diterima || s.tanggalTerima),
      'Perihal': s.perihal,
      'Posisi Terakhir': loc,
      'Riwayat Scan Terakhir': s.latest_scan_info || '-',
      'Status Surat': isDone ? 'Selesai' : isClosed ? 'Ditutup / Diarsipkan' : 'Sedang Diproses',
      'Catatan': s.catatan || '-',
    };
  });

  const summaryMap = {};
  filteredSurat.forEach((s) => {
    const asal = s.asal_surat || s.asalSurat || 'Lainnya';
    const loc = s.current_location || 'Petugas Entry Surat';
    if (!summaryMap[asal]) {
      summaryMap[asal] = { total: 0, selesai: 0, proses: 0, ditutup: 0 };
    }
    summaryMap[asal].total++;
    if (loc === 'Selesai') summaryMap[asal].selesai++;
    else if (loc === 'Ditutup') summaryMap[asal].ditutup++;
    else summaryMap[asal].proses++;
  });

  const summaryRows = Object.keys(summaryMap)
    .sort()
    .map((asal, idx) => ({
      'No': idx + 1,
      'Asal Surat / Instansi Pengirim': asal,
      'Total Surat': summaryMap[asal].total,
      'Selesai': summaryMap[asal].selesai,
      'Masih Proses': summaryMap[asal].proses,
      'Ditutup / Diarsipkan': summaryMap[asal].ditutup,
    }));

  summaryRows.push({
    'No': '',
    'Asal Surat / Instansi Pengirim': 'TOTAL KESELURUHAN',
    'Total Surat': analytics.totalSurat,
    'Selesai': analytics.completedSurat,
    'Masih Proses': analytics.activeSurat,
    'Ditutup / Diarsipkan': analytics.closedSurat,
  });

  return { detailRows, summaryRows };
}

function saveDualSheetWorkbook(sheets, fileName) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, name);
  });
  XLSX.writeFile(workbook, fileName);
}

export function downloadAdminBerkasExcel(filteredFiles, analytics, periodParams) {
  const { detailRows, summaryRows } = buildBerkasExcelSheets(filteredFiles, analytics);
  const periodLabel = buildPeriodLabel(periodParams);
  saveDualSheetWorkbook(
    [
      { name: 'Daftar Berkas', rows: detailRows },
      { name: 'Rekap Bulanan Kegiatan', rows: summaryRows },
    ],
    `Laporan_SLA_Berkas_${periodLabel}.xlsx`
  );
}

export function downloadAdminSuratExcel(filteredSurat, analytics, periodParams) {
  const { detailRows, summaryRows } = buildSuratExcelSheets(filteredSurat, analytics);
  const periodLabel = buildPeriodLabel(periodParams);
  saveDualSheetWorkbook(
    [
      { name: 'Daftar Surat Masuk', rows: detailRows },
      { name: 'Rekap Persuratan', rows: summaryRows },
    ],
    `Laporan_Persuratan_${periodLabel}.xlsx`
  );
}
