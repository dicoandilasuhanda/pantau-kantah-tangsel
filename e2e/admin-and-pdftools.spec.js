import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { getAuthToken, loginAs } from './helpers.js';

test.describe('PDF Tools Tabs & Admin Dashboard Workflows', () => {
  test('switches cleanly across all five client-side PDF Tools tabs', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');

    await page.goto('/pdf-tools');
    await expect(page.getByText(/Jaminan Keamanan Dokumen Dinas/i)).toBeVisible();

    const tabs = [
      { button: 'Gabung PDF', heading: 'Gabung Dokumen PDF (Merge)' },
      { button: 'Pisah PDF', heading: 'Pisahkan Halaman PDF (Split)' },
      { button: 'Kompres PDF', heading: 'Kompres Dokumen PDF (Optimize)' },
      { button: 'Gambar ke PDF', heading: 'Konversi Gambar ke PDF (JPG/PNG)' },
      { button: 'Putar PDF', heading: 'Putar Orientasi Halaman PDF (Rotate)' },
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.button, exact: true }).click();
      await expect(page.getByRole('heading', { name: tab.heading })).toBeVisible();
    }
  });

  test('manages berkas & surat records in admin panel, closes file via modal, and exports Excel reports', async ({ page }, testInfo) => {
    await loginAs(page, 'admin', 'admin123');
    const token = await getAuthToken(page);
    expect(token).toBeTruthy();

    const nomorBerkas = String(Math.floor(10000 + Math.random() * 59000));
    const currentYear = String(new Date().getFullYear());
    const namaPemohon = 'ADMIN E2E PEMOHON';
    const nomorSurat = `ADM-${nomorBerkas}/SURAT/2026`;

    const fileRes = await page.request.post('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        nomor_berkas: nomorBerkas,
        tahun_berkas: currentYear,
        nama_kegiatan: 'Pemecahan Bidang',
        nama_pemohon: namaPemohon,
      },
    });
    expect(fileRes.ok()).toBe(true);

    const suratRes = await page.request.post('/api/surat', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        asal_surat: `Dinas Tata Ruang ${nomorBerkas}`,
        nomor_surat: nomorSurat,
        tanggal_diterima: '2026-11-12',
        perihal: `Permohonan Data Admin E2E ${nomorBerkas}`,
      },
    });
    expect(suratRes.ok()).toBe(true);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

    await page.getByPlaceholder('Cari No. Berkas, Pemohon, Posisi...').fill(nomorBerkas);
    const berkasRow = page.locator('tbody tr').filter({ hasText: `${nomorBerkas}/${currentYear}` }).first();
    await expect(berkasRow).toBeVisible();

    const downloadBerkasPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Unduh Laporan Berkas/i }).click();
    const berkasDownload = await downloadBerkasPromise;
    expect(berkasDownload.suggestedFilename()).toMatch(/\.xlsx$/i);
    const berkasSavedPath = testInfo.outputPath(berkasDownload.suggestedFilename());
    await berkasDownload.saveAs(berkasSavedPath);
    expect(fs.statSync(berkasSavedPath).size).toBeGreaterThan(0);

    await berkasRow.getByRole('button', { name: /^Tutup$/i }).click();
    await expect(page.getByRole('heading', { name: 'Tutup Berkas' })).toBeVisible();
    await page
      .getByPlaceholder('Contoh: Pemohon membatalkan pengajuan, berkas ditarik...')
      .fill('Berkas ditutup otomatis dalam uji Playwright');
    await page.getByRole('button', { name: /Konfirmasi Tutup/i }).click();
    await expect(berkasRow).toContainText('Ditutup');

    await page.getByRole('button', { name: /Kelola Persuratan/i }).click();
    await page.getByPlaceholder('Cari No. Agenda, Nomor Surat, Asal, Perihal...').fill(nomorBerkas);
    const suratRow = page.locator('tbody tr').filter({ hasText: nomorSurat }).first();
    await expect(suratRow).toBeVisible();

    const downloadSuratPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Unduh Laporan Persuratan/i }).click();
    const suratDownload = await downloadSuratPromise;
    expect(suratDownload.suggestedFilename()).toMatch(/\.xlsx$/i);
    const suratSavedPath = testInfo.outputPath(suratDownload.suggestedFilename());
    await suratDownload.saveAs(suratSavedPath);
    expect(fs.statSync(suratSavedPath).size).toBeGreaterThan(0);

    // Verifikasi Audit Keamanan merekam penutupan berkas & mendukung form filter
    await page.getByRole('button', { name: /Audit Keamanan/i }).click();
    await expect(
      page.getByRole('heading', { name: /Jejak Audit Keamanan & Aktivitas Admin/i })
    ).toBeVisible();

    await page.getByLabel(/Cari Pelaku, Target, IP, atau Ringkasan/i).fill(`${nomorBerkas}/${currentYear}`);
    await page.getByRole('button', { name: /^Terapkan$/i }).click();

    const auditRegion = page.getByRole('region', { name: /Jejak Audit Keamanan/i }).last();
    const auditRow = auditRegion.locator('tbody tr').filter({ hasText: 'FILE_CLOSED' }).first();
    await expect(auditRow).toBeVisible();
    await expect(auditRow).toContainText(/Berkas ditutup otomatis dalam uji Playwright/i);
  });
});

