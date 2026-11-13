let cachedDeferredPrompt = null;
let appInstalled = false;
const availabilityListeners = new Set();
const installStateListeners = new Set();

function notifyAvailabilityListeners() {
  const hasPrompt = Boolean(cachedDeferredPrompt);
  for (const listener of availabilityListeners) {
    listener(hasPrompt);
  }
  const snapshot = { hasDeferredPrompt: hasPrompt, isInstalled: appInstalled };
  for (const listener of installStateListeners) {
    listener(snapshot);
  }
}

/**
 * Mendeteksi apakah aplikasi sedang berjalan dalam mode terpasang (standalone PWA).
 */
export function isStandaloneApp(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!win && !nav) return false;
  const mediaStandalone = Boolean(
    win &&
      typeof win.matchMedia === 'function' &&
      win.matchMedia('(display-mode: standalone)').matches
  );
  const iosStandalone = Boolean(nav && nav.standalone === true);
  return mediaStandalone || iosStandalone;
}

/**
 * Mendeteksi dukungan Web Install API native (`navigator.install`).
 */
export function supportsWebInstallApi(nav = typeof navigator !== 'undefined' ? navigator : null) {
  return Boolean(nav && typeof nav.install === 'function');
}

/**
 * Memastikan Service Worker hanya didaftarkan pada origin aman (HTTPS atau localhost).
 */
export function shouldRegisterServiceWorker(
  nav = typeof navigator !== 'undefined' ? navigator : null,
  loc = typeof window !== 'undefined' ? window.location : null
) {
  if (!nav || !('serviceWorker' in nav) || !loc) return false;
  return (
    loc.protocol === 'https:' ||
    loc.hostname === 'localhost' ||
    loc.hostname === '127.0.0.1'
  );
}

/**
 * Mendaftarkan `/sw.js` setelah event `load` serta menangkap event `beforeinstallprompt`
 * secara global sejak awal muat agar siap saat pengguna membuka Home Hub.
 */
export function registerPwaServiceWorker(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!win) return;

  if (!win.__pwaInstallCaptureAttached) {
    win.__pwaInstallCaptureAttached = true;
    win.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      appInstalled = false;
      cachedDeferredPrompt = event;
      notifyAvailabilityListeners();
    });
    win.addEventListener('appinstalled', () => {
      appInstalled = true;
      cachedDeferredPrompt = null;
      notifyAvailabilityListeners();
    });
  }

  if (!shouldRegisterServiceWorker(nav, win.location)) return;

  const register = () => {
    nav.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Abaikan diam-diam bila browser menolak registrasi SW di mode privat/sandbox
    });
  };

  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    register();
    return;
  }

  win.addEventListener('load', register, { once: true });
}

export function subscribeDeferredInstallPrompt(listener) {
  availabilityListeners.add(listener);
  listener(Boolean(cachedDeferredPrompt));
  return () => availabilityListeners.delete(listener);
}

export function subscribeInstallState(listener) {
  installStateListeners.add(listener);
  listener({ hasDeferredPrompt: Boolean(cachedDeferredPrompt), isInstalled: appInstalled });
  return () => installStateListeners.delete(listener);
}

export function consumeDeferredInstallPrompt() {
  const promptEvent = cachedDeferredPrompt;
  cachedDeferredPrompt = null;
  notifyAvailabilityListeners();
  return promptEvent;
}

/**
 * Menjalankan prompt instalasi aplikasi secara konsisten baik lewat `navigator.install()`
 * maupun event fallback `beforeinstallprompt` yang bersifat sekali pakai.
 */
export async function triggerAppInstall({
  supportsWebInstall = false,
  deferredPrompt = null,
  installFn = null,
} = {}) {
  if (supportsWebInstall && typeof installFn === 'function') {
    try {
      await installFn();
      return { outcome: 'installed', consumedPrompt: false };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        return { outcome: 'aborted', consumedPrompt: false };
      }
      return { outcome: 'error', consumedPrompt: false };
    }
  }

  if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
    try {
      await deferredPrompt.prompt();
      const choice = deferredPrompt.userChoice
        ? await deferredPrompt.userChoice
        : { outcome: 'dismissed' };
      return {
        outcome: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed',
        consumedPrompt: true,
      };
    } catch {
      return { outcome: 'aborted', consumedPrompt: true };
    }
  }

  return { outcome: 'unavailable', consumedPrompt: false };
}
