import { test, expect } from '@playwright/test';
import { loginAs } from './helpers.js';

test.describe('Progressive Web App (PWA) Manifest, Icons & Service Worker', () => {
  test('serves valid webmanifest, square PNG icons, apple-touch-icon, and no-store Service Worker', async ({ request }) => {
    const manifestRes = await request.get('/manifest.webmanifest');
    expect(manifestRes.status()).toBe(200);
    expect(manifestRes.headers()['content-type']).toContain('manifest+json');
    expect(manifestRes.headers()['cache-control']).toContain('no-store');

    const manifest = await manifestRes.json();
    expect(manifest.id).toBe('/');
    expect(manifest.name).toBe('Pantau.Kantah Tangsel');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons)).toBe(true);

    const iconPaths = manifest.icons.map((icon) => icon.src);
    expect(iconPaths).toContain('/icons/icon-192x192.png');
    expect(iconPaths).toContain('/icons/icon-512x512.png');
    expect(iconPaths).toContain('/icons/icon-maskable-512x512.png');

    for (const iconPath of [...iconPaths, '/icons/apple-touch-icon.png']) {
      const iconRes = await request.get(iconPath);
      expect(iconRes.status()).toBe(200);
      expect(iconRes.headers()['content-type']).toBe('image/png');
      const buf = await iconRes.body();
      expect(buf.length).toBeGreaterThan(1000);
    }

    const swRes = await request.get('/sw.js');
    expect(swRes.status()).toBe(200);
    expect(swRes.headers()['cache-control']).toContain('no-store');
  });

  test('wires head metadata, activates SW, and handles native Web Install API cleanly', async ({ page }) => {
    await page.addInitScript(() => {
      window.__pwaWebInstallCalled = false;
      window.__pwaPromptCalled = false;

      if (typeof window.Navigator !== 'undefined' && 'install' in window.Navigator.prototype) {
        Object.defineProperty(window.Navigator.prototype, 'install', {
          configurable: true,
          writable: true,
          value: () => {
            window.__pwaWebInstallCalled = true;
            window.dispatchEvent(new Event('appinstalled'));
            return Promise.resolve({ installedId: '/' });
          },
        });
      }

      if (typeof window.BeforeInstallPromptEvent !== 'undefined') {
        Object.defineProperty(window.BeforeInstallPromptEvent.prototype, 'prompt', {
          configurable: true,
          writable: true,
          value: () => {
            window.__pwaPromptCalled = true;
            return Promise.resolve();
          },
        });
        Object.defineProperty(window.BeforeInstallPromptEvent.prototype, 'userChoice', {
          configurable: true,
          get: () => Promise.resolve({ outcome: 'accepted' }),
        });
      }
    });

    await loginAs(page, 'admin', 'admin123');

    await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/apple-touch-icon.png'
    );

    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null;
      const reg = await navigator.serviceWorker.ready;
      return {
        scope: reg.scope,
        activeState: reg.active ? reg.active.state : null,
      };
    });
    expect(swState?.scope).toContain('http://127.0.0.1:3109/');
    expect(['activated', 'activating']).toContain(swState?.activeState);

    const installBtn = page.locator('#pwa-install-btn');
    if (!(await installBtn.isVisible())) {
      await page.evaluate(() => {
        const evt = new Event('beforeinstallprompt', { cancelable: true });
        evt.prompt = () => {
          window.__pwaPromptCalled = true;
          return Promise.resolve();
        };
        evt.userChoice = Promise.resolve({ outcome: 'accepted' });
        window.dispatchEvent(evt);
      });
    }

    await expect(installBtn).toBeVisible();
    await installBtn.click();

    await expect
      .poll(() =>
        page.evaluate(() => window.__pwaWebInstallCalled || window.__pwaPromptCalled)
      )
      .toBe(true);
    await expect(installBtn).toBeHidden();
  });

  test('supports beforeinstallprompt fallback when navigator.install is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      window.__pwaPromptCalled = false;

      if (typeof window.Navigator !== 'undefined' && 'install' in window.Navigator.prototype) {
        delete window.Navigator.prototype.install;
      }

      if (typeof window.BeforeInstallPromptEvent !== 'undefined') {
        Object.defineProperty(window.BeforeInstallPromptEvent.prototype, 'prompt', {
          configurable: true,
          writable: true,
          value: () => {
            window.__pwaPromptCalled = true;
            return Promise.resolve();
          },
        });
        Object.defineProperty(window.BeforeInstallPromptEvent.prototype, 'userChoice', {
          configurable: true,
          get: () => Promise.resolve({ outcome: 'accepted' }),
        });
      }

      window.addEventListener(
        'beforeinstallprompt',
        (event) => {
          if (
            typeof window.BeforeInstallPromptEvent === 'undefined' ||
            !(event instanceof window.BeforeInstallPromptEvent)
          ) {
            Object.defineProperty(event, 'prompt', {
              configurable: true,
              value: () => {
                window.__pwaPromptCalled = true;
                return Promise.resolve();
              },
            });
            Object.defineProperty(event, 'userChoice', {
              configurable: true,
              value: Promise.resolve({ outcome: 'accepted' }),
            });
          }
        },
        true
      );
    });

    await loginAs(page, 'admin', 'admin123');

    const installBtn = page.locator('#pwa-install-btn');
    if (!(await installBtn.isVisible())) {
      await page.evaluate(() => {
        const evt = new Event('beforeinstallprompt', { cancelable: true });
        window.dispatchEvent(evt);
      });
    }

    await expect(installBtn).toBeVisible();
    await installBtn.click();

    await expect.poll(() => page.evaluate(() => window.__pwaPromptCalled)).toBe(true);
    await expect(installBtn).toBeHidden();
  });
});
