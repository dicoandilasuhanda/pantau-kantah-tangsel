import { describe, it, expect, vi } from 'vitest';
import {
  isStandaloneApp,
  supportsWebInstallApi,
  shouldRegisterServiceWorker,
  triggerAppInstall,
} from './pwa';

describe('PWA install & service worker utilities', () => {
  it('detects standalone display mode across standard matchMedia and iOS navigator.standalone', () => {
    expect(isStandaloneApp(null, null)).toBe(false);
    expect(
      isStandaloneApp(
        { matchMedia: () => ({ matches: true }) },
        { standalone: false }
      )
    ).toBe(true);
    expect(
      isStandaloneApp(
        { matchMedia: () => ({ matches: false }) },
        { standalone: true }
      )
    ).toBe(true);
    expect(
      isStandaloneApp(
        { matchMedia: () => ({ matches: false }) },
        { standalone: false }
      )
    ).toBe(false);
  });

  it('detects native navigator.install support cleanly', () => {
    expect(supportsWebInstallApi(null)).toBe(false);
    expect(supportsWebInstallApi({})).toBe(false);
    expect(supportsWebInstallApi({ install: () => Promise.resolve() })).toBe(true);
  });

  it('allows service worker registration only on secure or localhost origins', () => {
    const navWithSw = { serviceWorker: {} };
    expect(shouldRegisterServiceWorker({}, { protocol: 'https:', hostname: 'pantau.id' })).toBe(false);
    expect(
      shouldRegisterServiceWorker(navWithSw, { protocol: 'http:', hostname: '10.2.0.122' })
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker(navWithSw, { protocol: 'http:', hostname: 'localhost' })
    ).toBe(true);
    expect(
      shouldRegisterServiceWorker(navWithSw, { protocol: 'http:', hostname: '127.0.0.1' })
    ).toBe(true);
    expect(
      shouldRegisterServiceWorker(navWithSw, {
        protocol: 'https:',
        hostname: 'pantaukantahtangsel.web.id',
      })
    ).toBe(true);
  });

  it('prefers native install API and gracefully handles AbortError', async () => {
    const installFn = vi.fn().mockResolvedValue(undefined);
    await expect(
      triggerAppInstall({ supportsWebInstall: true, installFn })
    ).resolves.toEqual({ outcome: 'installed', consumedPrompt: false });
    expect(installFn).toHaveBeenCalledTimes(1);

    const abortErr = Object.assign(new Error('User cancelled'), { name: 'AbortError' });
    await expect(
      triggerAppInstall({
        supportsWebInstall: true,
        installFn: vi.fn().mockRejectedValue(abortErr),
      })
    ).resolves.toEqual({ outcome: 'aborted', consumedPrompt: false });
  });

  it('consumes single-use beforeinstallprompt fallback properly', async () => {
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const result = await triggerAppInstall({
      supportsWebInstall: false,
      deferredPrompt: {
        prompt: promptSpy,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      },
    });
    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ outcome: 'accepted', consumedPrompt: true });

    await expect(triggerAppInstall({})).resolves.toEqual({
      outcome: 'unavailable',
      consumedPrompt: false,
    });
  });
});
