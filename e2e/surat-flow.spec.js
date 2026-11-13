import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Surat Masuk Entry, Monitoring Table Date Format & Details', () => {
  test('creates a surat masuk, formats tanggal diterima as DD/MM/YYYY, and opens details', async ({ page }) => {
    const suffix = String(Date.now()).slice(-5);
    const nomorSurat = `E2E-${suffix}/ND-100/XI/2026`;
    const asalSurat = `Kantor Pertanahan Uji ${suffix}`;
    const perihal = `Undangan Uji E2E Playwright ${suffix}`;

    await loginAs(page, 'admin', 'admin123');

    await page.goto('/surat/entry');
    await page.getByPlaceholder('Contoh: Kementerian ATR/BPN Pusat').fill(asalSurat);
    await page.getByPlaceholder('Contoh: 123/UM-100/I/2026').fill(nomorSurat);
    await page.locator('input[name="tanggal_diterima"]').fill('2026-11-10');
    await page.locator('textarea[name="perihal"]').fill(perihal);
    await page.getByRole('button', { name: /Simpan Surat/i }).click();

    await expect(page).toHaveURL(/\/surat$/);

    await page
      .getByPlaceholder('Cari berdasarkan Nomor Agenda, Asal Surat, atau Perihal...')
      .fill(asalSurat);

    const row = page.locator('tbody tr').filter({ hasText: nomorSurat }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(asalSurat);
    await expect(row).toContainText('10/11/2026');

    await row.click();
    await expect(page).toHaveURL(/\/surat\/detail\/\d+$/);
    await expect(page.getByRole('heading', { name: /Agenda #\d+/ })).toBeVisible();
    const detailsPanel = page.locator('.screen-only-details');
    await expect(detailsPanel).toContainText(`Asal Surat: ${asalSurat}`);
    await expect(detailsPanel).toContainText(nomorSurat);
  });
});

