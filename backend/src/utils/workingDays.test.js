const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  INDONESIAN_HOLIDAYS,
  isHolidayDate,
  parseUtcDate,
  getWorkingDays,
  calculateEffectiveWorkingHours,
} = require('./workingDays');

describe('workingDays utilities', () => {
  it('menyimpan daftar hari libur nasional Indonesia tahun 2026', () => {
    assert.equal(INDONESIAN_HOLIDAYS.length, 16);
    assert.equal(isHolidayDate(new Date(2026, 7, 17)), true); // 17 Agustus 2026
    assert.equal(isHolidayDate(new Date(2026, 10, 10)), false); // 10 Nov 2026
  });

  it('mengurai timestamp SQLite UTC dan mempertahankan ISO string', () => {
    assert.equal(parseUtcDate('2026-07-24 07:21:43').toISOString(), '2026-07-24T07:21:43.000Z');
    assert.equal(parseUtcDate('2026-11-10T03:00:00.000Z').toISOString(), '2026-11-10T03:00:00.000Z');
  });

  it('menghitung hari kerja sambil melewati akhir pekan dan libur nasional 2026', () => {
    // 14 Ags (Jum) -> 18 Ags (Sel), melewati 15 Sab, 16 Min, 17 Sen (Proklamasi)
    assert.equal(getWorkingDays('2026-08-14T10:00:00', '2026-08-18T10:00:00'), 1);
    // Cuti bersama Idul Fitri + Nyepi (19-24 Mar 2026): Rab 18 Mar -> Rab 25 Mar = 1 hari kerja
    assert.equal(getWorkingDays('2026-03-18T10:00:00', '2026-03-25T10:00:00'), 1);
    // Start > End = 0
    assert.equal(getWorkingDays('2026-11-12T10:00:00', '2026-11-10T10:00:00'), 0);
  });

  it('menghitung jam kerja efektif pada hari kerja normal', () => {
    const start = new Date(2026, 10, 10, 9, 0, 0); // Sel 10 Nov 09:00
    const end = new Date(2026, 10, 10, 14, 30, 0); // Sel 10 Nov 14:30
    assert.equal(calculateEffectiveWorkingHours(start, end), 5.5);
  });

  it('memotong penuh jam Sabtu dan Minggu pada perhitungan jam kerja efektif', () => {
    // Jum 6 Nov 16:00 -> Sen 9 Nov 09:00: Jum 8 jam (16-24) + Sen 9 jam (00-09) = 17 jam
    const fri = new Date(2026, 10, 6, 16, 0, 0);
    const mon = new Date(2026, 10, 9, 9, 0, 0);
    assert.equal(calculateEffectiveWorkingHours(fri, mon), 17);
  });

  it('memotong hari libur nasional dari rentang waktu yang dimulai di tengah libur', () => {
    // Dimulai saat hari libur 17 Ags 10:00 -> masuk kerja Sel 18 Ags 08:00 => hanya 8 jam di tgl 18
    const holidayStart = new Date(2026, 7, 17, 10, 0, 0);
    const tueMorning = new Date(2026, 7, 18, 8, 0, 0);
    assert.equal(calculateEffectiveWorkingHours(holidayStart, tueMorning), 8);
  });

  it('mengembalikan 0 jam jika rentang seluruhnya berada pada hari libur/akhir pekan atau waktu terbalik', () => {
    const sat = new Date(2026, 10, 7, 10, 0, 0);
    const sun = new Date(2026, 10, 8, 15, 0, 0);
    assert.equal(calculateEffectiveWorkingHours(sat, sun), 0);
    assert.equal(calculateEffectiveWorkingHours(sun, sat), 0);
  });
});
