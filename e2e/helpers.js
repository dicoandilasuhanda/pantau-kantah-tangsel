import { expect } from '@playwright/test';

export async function loginAs(page, username, password) {
  await page.goto('/login');
  await page.getByPlaceholder('Masukkan username').fill(username);
  await page.getByPlaceholder('Masukkan kata sandi').fill(password);
  await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByText('Monitoring Berkas').first()).toBeVisible();
}

export async function getAuthToken(page) {
  return page.evaluate(() => localStorage.getItem('token'));
}

