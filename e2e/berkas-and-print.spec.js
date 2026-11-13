import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Berkas Lifecycle, QR Slip, Print CSS Isolation & Transit', () => {
  test('registers a new berkas, verifies print slip isolation, and transits the file', async ({ page }) => {
    const nomorBerkas = String(Math.floor(70000 + Math.random() * 29000));
    const currentYear = String(new Date().getFullYear());
    const namaPemohon = 'PEMOHON PLAYWRIGHT E2E';

    await loginAs(page, 'admin', 'admin123');

    await page.goto('/entry');
    await page.getByPlaceholder('Contoh: 12345').fill(nomorBerkas);
    await page.locator('select').selectOption('Pemecahan Bidang');
    await page.getByPlaceholder('NAMA PEMOHON...').fill(namaPemohon);
    await page.getByRole('button', { name: /Daftarkan & Generate QR Code/i }).click();

    await expect(page.getByText('Konfirmasi Pendaftaran')).toBeVisible();
    await expect(page.getByText(`${nomorBerkas} / ${currentYear}`)).toBeVisible();
    await page.getByRole('button', { name: /^Setuju$/i }).click();

    const qrPanel = page.locator('.qr-result-panel');
    await expect(qrPanel).toBeVisible();
    await expect(qrPanel.locator('svg[role="img"]')).toBeVisible();
    await expect(qrPanel).toContainText(`${nomorBerkas} / ${currentYear}`);
    await expect(qrPanel).toContainText('Pemecahan Bidang');
    await expect(qrPanel).toContainText(`Pemohon: ${namaPemohon}`);

    // Verify @media print hides app chrome/navbar while keeping only the QR slip printable
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('nav.navbar')).toBeHidden();
    await expect(page.locator('footer')).toBeHidden();
    await expect(qrPanel).toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    await page.goto('/berkas');
    await page.getByPlaceholder('Cari berkas, pemohon, kegiatan...').fill(nomorBerkas);

    const card = page.locator('.dash-file-card').filter({ hasText: nomorBerkas }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(namaPemohon);
    await card.click();

    await expect(page).toHaveURL(/\/file\//);
    await expect(page.locator('.screen-only-details')).toContainText(`${nomorBerkas} / ${currentYear}`);
    await expect(page.locator('.print-only-slip')).toBeHidden();

    // Verify FileDetails slip reverses visibility cleanly between screen and print media
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-only-slip')).toBeVisible();
    await expect(page.locator('.screen-only-details')).toBeHidden();
    await expect(page.locator('nav.navbar')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await page.getByRole('button', { name: /Kirim Berkas \(Transit\)/i }).click();
    await page.getByPlaceholder('Cari nama atau posisi petugas...').fill('ukur');
    await page.getByText('Budi Pengukur', { exact: true }).click();
    await page.getByRole('button', { name: /^Kirim$/i }).click();

    await expect(page.getByText('Sedang Transit', { exact: true })).toBeVisible();
    await expect(page.locator('.screen-only-details')).toContainText('Sedang Transit ke Budi Pengukur');
  });
});

