import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Authentication, Home Hub, Theme Toggle & Responsive Navbar', () => {
  test('redirects unauthenticated root visit to login and rejects invalid credentials', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Masuk ke Akun' })).toBeVisible();

    await page.getByPlaceholder('Masukkan username').fill('admin');
    await page.getByPlaceholder('Masukkan kata sandi').fill('salah-password');
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page.locator('.bpn-alert-box')).toBeVisible();
    await expect(page.locator('.bpn-alert-box')).toContainText(/gagal|salah/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in as admin, displays hub modules, and persists theme across reloads', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');

    await expect(page.getByText('Monitoring Berkas').first()).toBeVisible();
    await expect(page.getByText('Monitoring Surat').first()).toBeVisible();
    await expect(page.getByText('Dashboard Kinerja').first()).toBeVisible();
    await expect(page.getByText('PDF Tools Kantah').first()).toBeVisible();
    await expect(page.getByText('Admin Panel & Pengguna').first()).toBeVisible();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    const viewport = page.viewportSize();
    if (viewport && viewport.width <= 860) {
      await page.locator('.nav-mobile-toggle').click();
      await expect(page.locator('.nav-links.mobile-open')).toBeVisible();
    }

    await page.locator('button[title="Pilih Mode Gelap"]:visible').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    if (viewport && viewport.width <= 860) {
      await page.locator('.nav-mobile-toggle').click();
      await expect(page.locator('.nav-links.mobile-open')).toBeVisible();
    }

    await page.locator('button[title="Pilih Mode Terang"]:visible').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('renders navbar branding logo cleanly with zero horizontal overflow', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');

    const logoLoaded = await page.locator('img[src="/logo-atr-bpn.png"]').first().evaluate((img) => {
      return img.complete && img.naturalWidth > 0;
    });
    expect(logoLoaded).toBe(true);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    const viewport = page.viewportSize();
    if (viewport && viewport.width <= 860) {
      const toggleBtn = page.locator('.nav-mobile-toggle');
      await expect(toggleBtn).toBeVisible();
      await toggleBtn.click();
      await expect(page.locator('.nav-links.mobile-open')).toBeVisible();
      await toggleBtn.click();
      await expect(page.locator('.nav-links.mobile-open')).toHaveCount(0);
    }
  });
});

