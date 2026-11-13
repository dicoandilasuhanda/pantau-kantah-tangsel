import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Admin SQLite Online Backup & Restore Verification', () => {
  test('creates online VACUUM INTO snapshot, verifies isolated restore integrity, and downloads .sqlite file', async ({ page }, testInfo) => {
    await loginAs(page, 'admin', 'admin123');

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: /Backup & Pemulihan/i }).click();
    await expect(
      page.getByRole('heading', { name: /Backup Zero-Downtime & Uji Restore SQLite/i })
    ).toBeVisible();

    await page.locator('#run-backup-btn').click();

    const backupPanel = page.getByRole('region', { name: /Manajemen Backup dan Verifikasi Restore SQLite/i });
    const statusBanner = backupPanel.getByRole('status');
    await expect(statusBanner).toContainText(/Uji Restore Terisolasi Lulus:/i);
    await expect(statusBanner).toContainText(/PRAGMA integrity_check:\s*ok/i);
    await expect(statusBanner).toContainText(/SHA-256:/i);
    await expect(statusBanner.getByText('users', { exact: true })).toBeVisible();
    await expect(statusBanner.getByText('surat', { exact: true })).toBeVisible();

    const tableRegion = page.getByRole('region', { name: /Daftar Arsip Snapshot SQLite/i });
    const snapshotRow = tableRegion.locator('tbody tr').first();
    await expect(snapshotRow).toContainText(/database_backup_.*\.sqlite/);

    await snapshotRow.getByRole('button', { name: /Uji Restore/i }).click();
    await expect(statusBanner).toContainText(/PRAGMA integrity_check:\s*ok/i);

    const downloadPromise = page.waitForEvent('download');
    await snapshotRow.getByRole('button', { name: /Unduh/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^database_backup_.*\.sqlite$/);

    const downloadedPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(downloadedPath);
    const header = fs.readFileSync(downloadedPath).subarray(0, 15).toString('utf8');
    expect(header).toBe('SQLite format 3');
  });
});

