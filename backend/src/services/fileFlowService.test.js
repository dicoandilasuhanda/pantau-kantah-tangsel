const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  KEGIATAN_K1,
  KEGIATAN_K2,
  FLOWS,
  KELOMPOK_MAPPING,
  getKelompokByKegiatan,
  validateFileEntryAccess,
  validateScanPreconditions,
  analyzeMultiRoleSelection,
  resolveScanTransition,
} = require('./fileFlowService');

describe('fileFlowService business rules', () => {
  it('memetakan 5 kegiatan K1 dan 9 kegiatan K2 sesuai FLOWS resmi', () => {
    assert.equal(KEGIATAN_K1.length, 5);
    assert.equal(KEGIATAN_K2.length, 9);
    assert.equal(FLOWS.K1.length, 9);
    assert.equal(FLOWS.K2.length, 6);
    assert.equal(KELOMPOK_MAPPING['Permohonan SK'], 'K2');
    assert.equal(getKelompokByKegiatan('Pengukuran dan Pemetaan Kadastral'), 'K1');
    assert.equal(getKelompokByKegiatan('Pelepasan Sebagian Hak'), 'K2');
  });

  it('validateFileEntryAccess menegakkan pemisahan wewenang entri K1 vs K2', () => {
    const deniedRole = validateFileEntryAccess('Petugas Ukur', 'Pemecahan Bidang');
    assert.equal(deniedRole.ok, false);
    assert.equal(deniedRole.status, 403);

    const k1WrongGroup = validateFileEntryAccess('Petugas Entry Berkas', 'Permohonan SK');
    assert.equal(k1WrongGroup.ok, false);
    assert.equal(k1WrongGroup.status, 403);

    const k2WrongGroup = validateFileEntryAccess('Petugas Entry Berkas PHP', 'Pemecahan Bidang');
    assert.equal(k2WrongGroup.ok, false);
    assert.equal(k2WrongGroup.status, 403);

    const k1Ok = validateFileEntryAccess('Petugas Entry Berkas', 'Pengukuran dan Pemetaan Kadastral');
    assert.deepEqual(k1Ok, {
      ok: true,
      isK2: false,
      initialLocation: 'Loket Pendaftaran (Entry)',
    });

    const k2Ok = validateFileEntryAccess('Petugas Entry Berkas PHP', 'Permohonan SK');
    assert.deepEqual(k2Ok, {
      ok: true,
      isK2: true,
      initialLocation: 'Petugas Entry Berkas PHP',
    });
  });

  it('validateScanPreconditions menerapkan aturan pause, transit ketat, dan status akhir', () => {
    const paused = validateScanPreconditions({ is_paused: 1, is_transit: 1 }, { username: 'a', role: 'Petugas Ukur' });
    assert.equal(paused.ok, false);
    assert.equal(paused.status, 400);

    const notTransit = validateScanPreconditions(
      { is_paused: 0, is_transit: 0, current_location: 'Loket Pendaftaran (Entry)' },
      { username: 'ukur1', role: 'Petugas Ukur' }
    );
    assert.equal(notTransit.ok, false);
    assert.equal(notTransit.status, 403);

    const adminOverride = validateScanPreconditions(
      { is_paused: 0, is_transit: 0, current_location: 'Loket Pendaftaran (Entry)' },
      { username: 'admin', role: 'Administrator' }
    );
    assert.equal(adminOverride.ok, true);

    const wrongTarget = validateScanPreconditions(
      { is_paused: 0, is_transit: 1, transit_to_username: 'ukur2', current_location: 'Loket Pendaftaran (Entry)' },
      { username: 'ukur1', role: 'Petugas Ukur' }
    );
    assert.equal(wrongTarget.ok, false);
    assert.equal(wrongTarget.status, 403);

    const finished = validateScanPreconditions(
      { is_paused: 0, is_transit: 1, transit_to_username: 'ukur1', current_location: 'Selesai' },
      { username: 'ukur1', role: 'Petugas Ukur' }
    );
    assert.equal(finished.ok, false);
    assert.equal(finished.status, 400);
  });

  it('analyzeMultiRoleSelection memberikan smart confirmation jika ada peran yang sudah & belum dipakai', () => {
    const smart = analyzeMultiRoleSelection(
      ['Petugas Ukur', 'Asisten Surveyor Kadastral'],
      [{ scanned_by_role: 'Budi (Petugas Ukur)' }]
    );
    assert.deepEqual(smart, {
      requires_smart_confirmation: true,
      suggested_role: 'Asisten Surveyor Kadastral',
      last_used_role: 'Petugas Ukur',
      available_roles: ['Petugas Ukur', 'Asisten Surveyor Kadastral'],
    });

    const fresh = analyzeMultiRoleSelection(['Petugas Ukur', 'Petugas Pemetaan'], []);
    assert.deepEqual(fresh, {
      requires_role_selection: true,
      available_roles: ['Petugas Ukur', 'Petugas Pemetaan'],
    });
  });

  it('resolveScanTransition menangani aturan khusus Loket Penyerahan Produk, Seksi PHP, dan Entry Berkas', () => {
    // Penyerahan Produk untuk Pengukuran harus dari Penyelesaian Berkas
    const invalidHandover = resolveScanTransition(
      { nama_kegiatan: 'Pengukuran dan Pemetaan Kadastral', current_location: 'Petugas Pemetaan' },
      'Petugas Loket Penyerahan Produk'
    );
    assert.equal(invalidHandover.ok, false);
    assert.equal(invalidHandover.status, 400);

    const completeHandover = resolveScanTransition(
      { nama_kegiatan: 'Pengukuran dan Pemetaan Kadastral', current_location: 'Petugas Penyelesaian Berkas' },
      'Petugas Loket Penyerahan Produk'
    );
    assert.equal(completeHandover.ok, true);
    assert.equal(completeHandover.newLocation, 'Selesai');

    // Seksi PHP menolak Pengukuran & menuntaskan Pemecahan Bidang dari Penyelesaian Berkas
    const phpRejectsPengukuran = resolveScanTransition(
      { nama_kegiatan: 'Pengukuran dan Pemetaan Kadastral', current_location: 'Petugas Penyelesaian Berkas' },
      'Petugas Seksi PHP'
    );
    assert.equal(phpRejectsPengukuran.ok, false);

    const phpCompletesPemecahan = resolveScanTransition(
      { nama_kegiatan: 'Pemecahan Bidang', current_location: 'Petugas Penyelesaian Berkas' },
      'Petugas Seksi PHP'
    );
    assert.equal(phpCompletesPemecahan.ok, true);
    assert.equal(phpCompletesPemecahan.newLocation, 'Selesai');

    const phpCompletesK2 = resolveScanTransition(
      { nama_kegiatan: 'Permohonan SK', current_location: 'Petugas Penyelesaian Berkas' },
      'Petugas Seksi PHP'
    );
    assert.equal(phpCompletesK2.ok, true);
    assert.equal(phpCompletesK2.newLocation, 'Selesai');

    const entryReturn = resolveScanTransition(
      { nama_kegiatan: 'Pemecahan Bidang', current_location: 'Petugas Ukur' },
      'Petugas Entry Berkas'
    );
    assert.equal(entryReturn.ok, true);
    assert.equal(entryReturn.newLocation, 'Loket Pendaftaran (Entry)');
  });
});
