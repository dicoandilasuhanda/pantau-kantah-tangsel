/**
 * Mesin aturan bisnis alur kegiatan layanan pertanahan (K1 & K2),
 * validasi hak entri berkas, prasyarat transit scan, & transisi posisi berkas.
 */

const KEGIATAN_K1 = [
  'Pengukuran dan Pemetaan Kadastral',
  'Pemecahan Bidang',
  'Penggabungan Bidang',
  'Pemisahan Bidang',
  'Penataan Batas',
];

const KEGIATAN_KHUSUS_PHP = [
  'Pemecahan Bidang',
  'Penggabungan Bidang',
  'Pemisahan Bidang',
  'Penataan Batas',
];

const KEGIATAN_K2 = [
  'Pelepasan Sebagian Hak',
  'Wakaf dari Tanah Yang Sudah Bersertipikat',
  'Pendaftaran Tanah Pertama Kali Pemberian Hak',
  'Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak',
  'Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)',
  'Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf',
  'Sertipikat Pengganti Karena Hilang/Lelang Eksekusi',
  'Sertipikat Pengganti Karena Rusak/Lama',
  'Permohonan SK',
];

const FLOWS = {
  K1: [
    'Loket Pendaftaran (Entry)',
    'Petugas Ukur',
    'Asisten Surveyor Kadastral',
    'Petugas Pemetaan',
    'Petugas Alih Media',
    'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
    'Kepala Seksi Survei dan Pemetaan',
    'Petugas Penyelesaian Berkas',
    'Selesai',
  ],
  K2: [
    'Petugas Entry Berkas PHP',
    'Petugas Pemetaan',
    'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
    'Kepala Seksi Survei dan Pemetaan',
    'Petugas Penyelesaian Berkas',
    'Selesai',
  ],
};

const KELOMPOK_MAPPING = Object.fromEntries(KEGIATAN_K2.map((name) => [name, 'K2']));

function getKelompokByKegiatan(namaKegiatan) {
  return KEGIATAN_K2.includes(namaKegiatan) ? 'K2' : 'K1';
}

/**
 * Memvalidasi kewenangan peran user saat mendaftarkan berkas baru K1/K2.
 * Mengembalikan { ok: true, isK2, initialLocation } atau { ok: false, status, error }.
 */
function validateFileEntryAccess(userRoleStr = '', namaKegiatan = '') {
  const roles = String(userRoleStr || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const hasEntryK1 = roles.includes('Petugas Entry Berkas');
  const hasEntryK2 = roles.includes('Petugas Entry Berkas PHP');
  const isAdmin = roles.includes('Administrator');

  if (!hasEntryK1 && !hasEntryK2 && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Akses ditolak. Hanya Petugas Entry yang dapat membuat entri.',
    };
  }

  const isK2 = KEGIATAN_K2.includes(namaKegiatan);
  if (isK2 && !hasEntryK2 && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Permohonan Kelompok 2 hanya dapat dientri oleh Petugas Entry Berkas PHP.',
    };
  }

  if (!isK2 && !hasEntryK1 && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Permohonan Kelompok 1 hanya dapat dientri oleh Petugas Entry Berkas.',
    };
  }

  const initialLocation = isK2 ? 'Petugas Entry Berkas PHP' : 'Loket Pendaftaran (Entry)';
  return { ok: true, isK2, initialLocation };
}

/**
 * Memeriksa syarat status berkas (pause, transit ketat, status selesai/ditutup) sebelum scan.
 */
function validateScanPreconditions(file, user) {
  if (file.is_paused) {
    return {
      ok: false,
      status: 400,
      error: 'berkas tidak dapat dipindahkan karena belum membayar Surat Perintah Setor',
    };
  }

  const roleStr = String(user?.role || '');
  const isAdmin = roleStr.includes('Administrator');

  if (file.is_transit !== 1 && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error:
        'Berkas ini belum dikirim (Transit) oleh petugas sebelumnya. Mintalah petugas sebelumnya untuk menekan tombol Kirim Berkas.',
    };
  }

  if (file.is_transit === 1 && user?.username !== file.transit_to_username && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: `Berkas ini sedang dikirim ke meja petugas lain (${file.transit_to_username}). Hanya petugas tersebut yang bisa memindai.`,
    };
  }

  if (file.current_location === 'Selesai') {
    return {
      ok: false,
      status: 400,
      error: 'Berkas ini sudah berstatus Selesai dan tidak dapat diproses lagi.',
    };
  }

  if (file.current_location === 'Ditutup') {
    return {
      ok: false,
      status: 400,
      error: 'Berkas ini sudah ditutup dan tidak dapat diproses lagi.',
    };
  }

  return { ok: true };
}

/**
 * Menentukan respons pemilihan peran (Smart Role Confirmation / Role Selection) untuk user multi-role.
 */
function analyzeMultiRoleSelection(userRoles, historyRows = []) {
  const usedRoles = historyRows.map((r) => {
    const match = String(r.scanned_by_role || '').match(/\((.*?)\)$/);
    return match ? match[1] : r.scanned_by_role;
  });

  const rolesUsedByThisUser = userRoles.filter((r) => usedRoles.includes(r));
  const unusedRoles = userRoles.filter((r) => !usedRoles.includes(r));

  if (rolesUsedByThisUser.length > 0 && unusedRoles.length > 0) {
    return {
      requires_smart_confirmation: true,
      suggested_role: unusedRoles[0],
      last_used_role: rolesUsedByThisUser[rolesUsedByThisUser.length - 1],
      available_roles: userRoles,
    };
  }

  return {
    requires_role_selection: true,
    available_roles: userRoles,
  };
}

/**
 * Menentukan lokasi tujuan berikutnya & pesan khusus saat berkas dipindai oleh activeRole.
 */
function resolveScanTransition(file, activeRole) {
  let newLocation = activeRole;
  let customMessage = null;

  if (activeRole === 'Petugas Penyelesaian Berkas') {
    if (!KEGIATAN_K1.includes(file.nama_kegiatan) && !KEGIATAN_K2.includes(file.nama_kegiatan)) {
      return {
        ok: false,
        status: 400,
        error:
          'Berkas ini bukan kegiatan Kelompok 1 atau Kelompok 2, Anda tidak dapat memprosesnya sebagai Petugas Penyelesaian.',
      };
    }
    newLocation = 'Petugas Penyelesaian Berkas';
  } else if (activeRole === 'Petugas Loket Penyerahan Produk') {
    if (file.nama_kegiatan === 'Pengukuran dan Pemetaan Kadastral') {
      if (file.current_location !== 'Petugas Penyelesaian Berkas') {
        return {
          ok: false,
          status: 400,
          error: 'Berkas Pengukuran dan Pemetaan Kadastral harus diserahkan dari Petugas Penyelesaian Berkas.',
        };
      }
      newLocation = 'Selesai';
      customMessage = 'Berkas Telah Diserahkan ke Pemohon (Selesai)';
    } else {
      newLocation = 'Petugas Loket Penyerahan Produk';
    }
  } else if (activeRole === 'Petugas Seksi PHP') {
    if (file.nama_kegiatan === 'Pengukuran dan Pemetaan Kadastral') {
      return {
        ok: false,
        status: 400,
        error: 'Mekanisme ini tidak berlaku untuk kegiatan Pengukuran dan Pemetaan Kadastral.',
      };
    }

    if (KEGIATAN_KHUSUS_PHP.includes(file.nama_kegiatan)) {
      if (file.current_location === 'Petugas Penyelesaian Berkas') {
        newLocation = 'Selesai';
        customMessage = 'Berkas Telah Selesai di Seksi SP dan diserahkan ke Seksi PHP';
      } else {
        newLocation = 'Petugas Seksi PHP';
      }
    } else if (KEGIATAN_K2.includes(file.nama_kegiatan)) {
      if (file.current_location === 'Petugas Penyelesaian Berkas') {
        newLocation = 'Selesai';
        customMessage = 'Berkas Telah Selesai di Seksi PHP';
      } else {
        newLocation = 'Petugas Seksi PHP';
      }
    } else if (file.current_location === 'Petugas Distribusi Berkas Ke Seksi PHP') {
      newLocation = 'Selesai';
      customMessage = 'Berkas Telah Selesai di Seksi SP';
    } else {
      newLocation = 'Petugas Seksi PHP';
    }
  } else if (activeRole === 'Petugas Entry Berkas') {
    newLocation = 'Loket Pendaftaran (Entry)';
  }

  return { ok: true, newLocation, customMessage };
}

module.exports = {
  KEGIATAN_K1,
  KEGIATAN_KHUSUS_PHP,
  KEGIATAN_K2,
  FLOWS,
  KELOMPOK_MAPPING,
  getKelompokByKegiatan,
  validateFileEntryAccess,
  validateScanPreconditions,
  analyzeMultiRoleSelection,
  resolveScanTransition,
};
