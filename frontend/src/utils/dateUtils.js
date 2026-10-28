export const SOP_DAYS = {
  "Pengukuran dan Pemetaan Kadastral": 12,
  "Pemecahan Bidang": 15,
  "Penggabungan Bidang": 15,
  "Pemisahan Bidang": 15,
  "Penataan Batas": 20,
  "Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak": 98,
  "Pelepasan Sebagian Hak": 38,
  "Wakaf dari Tanah Yang Sudah Bersertipikat": 5,
  "Pendaftaran Tanah Pertama Kali Pemberian Hak": 38,
  "Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)": 5,
  "Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf": 98,
  "Sertipikat Pengganti Karena Hilang/Lelang Eksekusi": 40,
  "Sertipikat Pengganti Karena Rusak/Lama": 19,
  "Permohonan SK": 38
};

// SQLite mengembalikan UTC tanpa T dan Z (misal "2026-07-24 07:21:43"). 
// Fungsi ini memastikan string tersebut dianggap sebagai UTC.
export function parseSQLiteDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return new Date(dateStr); // Clone Date untuk mencegah mutasi
  if (typeof dateStr === 'string' && dateStr.includes('T')) return new Date(dateStr); // Sudah ISO format
  // Ubah spasi jadi T, dan tambahkan Z di belakang agar JS menganggapnya UTC
  return new Date(String(dateStr).replace(' ', 'T') + 'Z');
}

// Daftar Tanggal Merah & Cuti Bersama (Format: YYYY-MM-DD)
// Diperbarui untuk tahun 2026 berdasarkan SKB 3 Menteri
const INDONESIAN_HOLIDAYS = [
  '2026-01-01', // Tahun Baru 2026 Masehi
  '2026-01-16', // Isra Mikraj Nabi Muhammad SAW
  '2026-02-17', // Tahun Baru Imlek 2577 Kongzili
  '2026-03-19', // Hari Suci Nyepi (Tahun Baru Saka 1948)
  '2026-03-20', // Cuti Bersama Idul Fitri (estimasi)
  '2026-03-23', // Cuti Bersama Idul Fitri (estimasi)
  '2026-03-24', // Cuti Bersama Idul Fitri (estimasi)
  '2026-04-03', // Wafat Yesus Kristus
  '2026-05-01', // Hari Buruh Internasional
  '2026-05-14', // Kenaikan Yesus Kristus
  '2026-05-27', // Hari Raya Idul Adha 1447 H
  '2026-06-01', // Hari Lahir Pancasila
  '2026-06-16', // 1 Muharam 1448 H (Tahun Baru Islam)
  '2026-08-17', // Hari Proklamasi Kemerdekaan
  '2026-08-25', // Maulid Nabi Muhammad SAW
  '2026-12-25', // Kelahiran Yesus Kristus (Natal)
];

function isHoliday(dateObj) {
  const dateStr = dateObj.getFullYear() + '-' + 
                  String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(dateObj.getDate()).padStart(2, '0');
  return INDONESIAN_HOLIDAYS.includes(dateStr);
}

// Menghitung jumlah hari kerja antara startDate dan endDate (mengabaikan sabtu, minggu, & tanggal merah)
export function getWorkingDays(startDateStr, endDateStr) {
  const start = parseSQLiteDate(startDateStr);
  const end = endDateStr ? parseSQLiteDate(endDateStr) : new Date();
  
  // Set to midnight to just compare days
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let days = 0;
  let current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(current)) { // 0 = Sunday, 6 = Saturday
      days++;
    }
  }

  return days;
}

// Menghitung umur SOP dengan mengurangi durasi pause
export function calculateTotalElapsedDays(file, endDateStr) {
  let totalRawDays = getWorkingDays(file.created_at, endDateStr);
  let totalPaused = file.total_paused_days || 0;
  
  if (file.is_paused === 1 && file.paused_at) {
    const currentPauseDays = getWorkingDays(file.paused_at, endDateStr);
    totalPaused += currentPauseDays;
  }
  
  const elapsed = totalRawDays - totalPaused;
  return elapsed < 0 ? 0 : elapsed;
}

// Menghitung target tanggal berdasarkan jumlah hari kerja
export function addWorkingDays(startDateStr, daysToAdd) {
  const date = parseSQLiteDate(startDateStr);
  let daysAdded = 0;

  while (daysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(date)) {
      daysAdded++;
    }
  }

  return date;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}

export function getStatusColor(workingDaysAtDesk) {
  if (workingDaysAtDesk > 2) return 'var(--error-color)'; // Merah (> 2 artinya 3 atau lebih)
  if (workingDaysAtDesk === 2) return 'var(--warning-color)'; // Kuning (tepat 2 hari)
  return 'var(--success-color)'; // Hijau (kurang dari 2, atau <=1)
}

export function getStatusLabel(workingDaysAtDesk) {
  if (workingDaysAtDesk > 2) return 'Peringatan: Lebih dari 3 hari di meja ini';
  if (workingDaysAtDesk === 2) return 'Perhatian: Sudah 2 hari di meja ini';
  return 'Aman: Berkas baru di meja ini';
}
