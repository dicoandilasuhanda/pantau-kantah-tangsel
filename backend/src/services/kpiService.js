const { calculateEffectiveWorkingHours } = require('../utils/workingDays');

function formatRoleHint(row, fallback = undefined) {
  if (row.user_full_name && row.scanned_by_role && !row.scanned_by_role.includes('(')) {
    return `${row.user_full_name} (${row.scanned_by_role})`;
  }
  return row.scanned_by_role || fallback;
}

function groupByKey(rows, keyName) {
  const grouped = {};
  (rows || []).forEach((row) => {
    const key = row[keyName];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });
  return grouped;
}

function recordOfficerMetric(kpiData, current, diffHours, breakdownKey, options = {}) {
  const username = current.scanned_by_username;
  const formattedRoleHint = formatRoleHint(current, options.roleFallback);

  if (!kpiData[username]) {
    kpiData[username] = {
      username,
      role_hint: formattedRoleHint,
      totalHours: 0,
      count: 0,
      selesaiCount: 0,
      breakdownMap: {},
    };
  } else if (formattedRoleHint && formattedRoleHint.includes('(')) {
    kpiData[username].role_hint = formattedRoleHint;
  }

  const userKpi = kpiData[username];
  userKpi.totalHours += diffHours;
  userKpi.count += 1;
  if (options.isCompletedStep) {
    userKpi.selesaiCount += 1;
  }

  if (!userKpi.breakdownMap[breakdownKey]) {
    userKpi.breakdownMap[breakdownKey] = { totalHours: 0, count: 0 };
  }
  userKpi.breakdownMap[breakdownKey].totalHours += diffHours;
  userKpi.breakdownMap[breakdownKey].count += 1;
}

/**
 * Menghitung statistik KPI rata-rata jam kerja efektif pegawai untuk berkas permohonan.
 */
function computeFilesKpi(historyRows, now = new Date()) {
  const filesHistory = groupByKey(historyRows, 'file_id');
  const kpiData = {};

  Object.values(filesHistory).forEach((history) => {
    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      if (!current.scanned_by_username) continue;

      let endTime = now;
      if (i < history.length - 1) {
        endTime = history[i + 1].scanned_at;
      } else {
        if (current.location === 'Selesai' || current.location === 'Ditutup') continue;
        if (current.is_transit === 1 && current.transit_at) {
          endTime = current.transit_at;
        }
      }

      const diffHours = calculateEffectiveWorkingHours(current.scanned_at, endTime);
      recordOfficerMetric(kpiData, current, diffHours, current.nama_kegiatan);
    }
  });

  return Object.values(kpiData).map((u) => ({
    username: u.username,
    roleHint: u.role_hint,
    rataRataTotalJam: Number((u.totalHours / u.count).toFixed(2)),
    jumlahInteraksi: u.count,
    breakdown: Object.keys(u.breakdownMap).map((jenisBerkas) => ({
      jenisBerkas,
      rataRataJam: Number(
        (u.breakdownMap[jenisBerkas].totalHours / u.breakdownMap[jenisBerkas].count).toFixed(2)
      ),
      jumlahInteraksi: u.breakdownMap[jenisBerkas].count,
    })),
  }));
}

/**
 * Menghitung ringkasan status surat & KPI jam kerja efektif pegawai untuk modul Persuratan.
 */
function computeSuratKpi(suratRows, historyRows, now = new Date()) {
  const allSurat = suratRows || [];
  let completedSurat = 0;
  let closedSurat = 0;
  let activeSurat = 0;

  allSurat.forEach((s) => {
    const loc = s.current_location || 'Petugas Entry Surat';
    if (loc === 'Selesai') completedSurat++;
    else if (loc === 'Ditutup') closedSurat++;
    else activeSurat++;
  });

  const suratHistoryMap = groupByKey(historyRows, 'surat_id');
  const kpiData = {};

  Object.values(suratHistoryMap).forEach((history) => {
    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      if (!current.scanned_by_username) continue;

      const locationStr = String(current.location || '');
      const isFinishStep = locationStr.startsWith('Selesai') || locationStr.startsWith('Ditutup');
      let endTime = now;

      if (i < history.length - 1) {
        endTime = history[i + 1].scanned_at;
      } else if (isFinishStep || current.surat_status === 'Selesai' || current.surat_status === 'Ditutup') {
        endTime = current.scanned_at;
      }

      const diffHours = calculateEffectiveWorkingHours(current.scanned_at, endTime);
      recordOfficerMetric(kpiData, current, diffHours, current.asal_surat || 'Lainnya', {
        roleFallback: current.scanned_by_username,
        isCompletedStep: locationStr.startsWith('Selesai'),
      });
    }
  });

  const officers = Object.values(kpiData).map((u) => ({
    username: u.username,
    roleHint: u.role_hint,
    rataRataTotalJam: Number((u.totalHours / u.count).toFixed(2)),
    jumlahInteraksi: u.count,
    selesaiCount: u.selesaiCount,
    breakdown: Object.keys(u.breakdownMap).map((asalSurat) => ({
      asalSurat,
      rataRataJam: Number(
        (u.breakdownMap[asalSurat].totalHours / u.breakdownMap[asalSurat].count).toFixed(2)
      ),
      jumlahInteraksi: u.breakdownMap[asalSurat].count,
    })),
  }));

  return {
    summary: {
      totalSurat: allSurat.length,
      activeSurat,
      completedSurat,
      closedSurat,
    },
    officers,
  };
}

module.exports = {
  formatRoleHint,
  computeFilesKpi,
  computeSuratKpi,
};
