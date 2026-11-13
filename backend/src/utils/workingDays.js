/**
 * Utilitas kalender hari kerja Indonesia & perhitungan jam kerja efektif (SLA & KPI).
 * Mengabaikan akhir pekan (Sabtu/Minggu) serta hari libur nasional & cuti bersama.
 */

const INDONESIAN_HOLIDAYS = [
  '2026-01-01',
  '2026-01-16',
  '2026-02-17',
  '2026-03-19',
  '2026-03-20',
  '2026-03-23',
  '2026-03-24',
  '2026-04-03',
  '2026-05-01',
  '2026-05-14',
  '2026-05-27',
  '2026-06-01',
  '2026-06-16',
  '2026-08-17',
  '2026-08-25',
  '2026-12-25',
];

const INDONESIAN_HOLIDAYS_SET = new Set(INDONESIAN_HOLIDAYS);

function formatLocalYmd(dateObj) {
  return (
    dateObj.getFullYear() +
    '-' +
    String(dateObj.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(dateObj.getDate()).padStart(2, '0')
  );
}

function isHolidayDate(dateObj) {
  return INDONESIAN_HOLIDAYS_SET.has(formatLocalYmd(dateObj));
}

function isOffDayDate(dateObj) {
  const day = dateObj.getDay();
  return day === 0 || day === 6 || isHolidayDate(dateObj);
}

/**
 * Mengurai timestamp SQLite UTC ("YYYY-MM-DD HH:mm:ss"), string ISO, atau objek Date.
 */
function parseUtcDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return new Date(dateStr);
  const str = String(dateStr);
  if (str.includes('T')) return new Date(str);
  return new Date(str.replace(' ', 'T') + 'Z');
}

/**
 * Menghitung jumlah hari kerja di antara startDateStr dan endDateStr.
 */
function getWorkingDays(startDateStr, endDateStr) {
  const start = parseUtcDate(startDateStr);
  const end = endDateStr ? parseUtcDate(endDateStr) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start > end) return 0;

  let days = 0;
  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (!isOffDayDate(current)) days++;
  }
  return days;
}

/**
 * Menghitung selisih jam kerja efektif antara startInput dan endInput
 * dengan memotong irisan waktu yang jatuh pada Sabtu, Minggu, atau libur nasional.
 */
function calculateEffectiveWorkingHours(startInput, endInput) {
  const startTime = parseUtcDate(startInput);
  const endTime = parseUtcDate(endInput);
  let diffMs = Math.max(0, endTime - startTime);

  if (diffMs > 0) {
    const loopDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
    const endDateObj = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
    let holidayMs = 0;

    while (loopDate <= endDateObj) {
      if (isOffDayDate(loopDate)) {
        const dayStart = new Date(loopDate);
        const dayEnd = new Date(loopDate);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const overlapStart = startTime > dayStart ? startTime : dayStart;
        const overlapEnd = endTime < dayEnd ? endTime : dayEnd;

        if (overlapStart < overlapEnd) {
          holidayMs += overlapEnd - overlapStart;
        }
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }

    diffMs -= holidayMs;
  }

  return Math.max(0, diffMs / (1000 * 60 * 60));
}

module.exports = {
  INDONESIAN_HOLIDAYS,
  INDONESIAN_HOLIDAYS_SET,
  isHolidayDate,
  isOffDayDate,
  parseUtcDate,
  getWorkingDays,
  calculateEffectiveWorkingHours,
};
