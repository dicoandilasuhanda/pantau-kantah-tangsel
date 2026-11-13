/* eslint-env serviceworker */
const STATIC_CACHE = 'pantau-kantah-static-v1';
const STATIC_ASSETS = [
  '/logo-atr-bpn.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

const OFFLINE_HTML =
  '<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Pantau.Kantah Tangsel - Luring</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:#F8FAFC;color:#0F172A;font-family:system-ui,-apple-system,sans-serif;}' +
  '.card{max-width:420px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:1.75rem;text-align:center;box-shadow:0 8px 24px rgba(15,23,42,.08);}' +
  'h1{font-size:1.15rem;margin:0 0 .5rem;color:#0F172A;}p{font-size:.9rem;line-height:1.5;color:#475569;margin:0 0 1.25rem;}' +
  'button{background:#1D4ED8;color:#FFFFFF;border:none;border-radius:10px;padding:.7rem 1.2rem;font-weight:600;font-size:.9rem;cursor:pointer;}</style></head>' +
  '<body><div class="card"><h1>Koneksi Terputus</h1><p>Perangkat tidak terhubung ke jaringan kantor atau internet. Pastikan koneksi aktif lalu muat ulang halaman.</p>' +
  '<button type="button" onclick="window.location.reload()">Muat Ulang</button></div></body></html>';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== STATIC_CACHE).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep API calls, hashed bundles, index.html, and recovery.js strictly network-backed to avoid stale chunks
  if (url.pathname.startsWith('/api/') || url.pathname === '/recovery.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
      )
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

