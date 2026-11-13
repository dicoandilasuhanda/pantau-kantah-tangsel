import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Admin SQLite & Uploads Disaster Recovery Verification', () => {
  test('creates online SQLite snapshot and uploads archive, verifies integrity for both, and downloads verified binaries', async ({ page }, testInfo) => {
    await loginAs(page, 'admin', 'admin123');

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: /Backup & Pemulihan/i }).click();
    await expect(
      page.getByRole('heading', { name: /Backup Zero-Downtime & Uji Restore/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Sertakan arsip uploads/i)).toBeChecked();

    await page.locator('#run-backup-btn').click();

    const backupPanel = page.getByRole('region', { name: /Manajemen Backup dan Verifikasi Restore SQLite/i });
    const statusBanner = backupPanel.getByRole('status');
    await expect(statusBanner).toContainText(/Uji Restore Terisolasi Lulus:/i);
    await expect(statusBanner).toContainText(/PRAGMA integrity_check:\s*ok/i);
    await expect(statusBanner).toContainText(/SHA-256:/i);
    await expect(statusBanner.getByText('users', { exact: true })).toBeVisible();
    await expect(statusBanner.getByText('surat', { exact: true })).toBeVisible();
    await expect(statusBanner).toContainText(/Arsip Uploads Terverifikasi:/i);
    await expect(statusBanner).toContainText(/uploads_backup_.*\.tar\.gz/);

    const tableRegion = page.getByRole('region', { name: /Daftar Arsip Backup Database/i });
    const sqliteRow = tableRegion.locator('tbody tr').filter({ hasText: /database_backup_.*\.sqlite/ }).first();
    const uploadsRow = tableRegion.locator('tbody tr').filter({ hasText: /uploads_backup_.*\.tar\.gz/ }).first();
    await expect(sqliteRow).toBeVisible();
    await expect(uploadsRow).toBeVisible();

    // Uji restore SQLite
    await sqliteRow.getByRole('button', { name: /Uji Restore/i }).click();
    await expect(statusBanner).toContainText(/PRAGMA integrity_check:\s*ok/i);

    // Uji integritas Tar-Gzip Uploads
    await uploadsRow.getByRole('button', { name: /Cek Arsip/i }).click();
    await expect(statusBanner).toContainText(/Uji Integritas Arsip Uploads Lulus:/i);
    await expect(statusBanner).toContainText(/Checksums Tar-Gzip:\s*ok/i);

    // Unduh SQLite & cek magic bytes 'SQLite format 3'
    const downloadSqlitePromise = page.waitForEvent('download');
    await sqliteRow.getByRole('button', { name: /Unduh/i }).click();
    const sqliteDownload = await downloadSqlitePromise;
    expect(sqliteDownload.suggestedFilename()).toMatch(/^database_backup_.*\.sqlite$/);
    const sqlitePath = testInfo.outputPath(sqliteDownload.suggestedFilename());
    await sqliteDownload.saveAs(sqlitePath);
    expect(fs.readFileSync(sqlitePath).subarray(0, 15).toString('utf8')).toBe('SQLite format 3');

    // Unduh Tar-Gzip Uploads & cek magic bytes GZIP [0x1f, 0x8b]
    const downloadUploadsPromise = page.waitForEvent('download');
    await uploadsRow.getByRole('button', { name: /Unduh/i }).click();
    const uploadsDownload = await downloadUploadsPromise;
    expect(uploadsDownload.suggestedFilename()).toMatch(/^uploads_backup_.*\.tar\.gz$/);
    const uploadsPath = testInfo.outputPath(uploadsDownload.suggestedFilename());
    await uploadsDownload.saveAs(uploadsPath);
    const gzipMagic = fs.readFileSync(uploadsPath).subarray(0, 2);
    expect(gzipMagic[0]).toBe(0x1f);
    expect(gzipMagic[1]).toBe(0x8b);
  });
});

