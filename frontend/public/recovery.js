(function () {
  // Polyfill kompatibilitas WebKit (iOS Safari & iOS Chrome) untuk API ES2024/ES2025 yang digunakan oleh pdfjs-dist v6+
  try {
    if (typeof Promise !== 'undefined' && !Promise.withResolvers) {
      Promise.withResolvers = function () {
        var resolve, reject;
        var promise = new Promise(function (res, rej) {
          resolve = res;
          reject = rej;
        });
        return { promise: promise, resolve: resolve, reject: reject };
      };
    }
    if (typeof Map !== 'undefined') {
      if (!Map.prototype.getOrInsertComputed) {
        Map.prototype.getOrInsertComputed = function (key, callbackfn) {
          if (this.has(key)) return this.get(key);
          var val = callbackfn(key);
          this.set(key, val);
          return val;
        };
      }
      if (!Map.prototype.getOrInsert) {
        Map.prototype.getOrInsert = function (key, defaultValue) {
          if (this.has(key)) return this.get(key);
          this.set(key, defaultValue);
          return defaultValue;
        };
      }
    }
    if (typeof WeakMap !== 'undefined') {
      if (!WeakMap.prototype.getOrInsertComputed) {
        WeakMap.prototype.getOrInsertComputed = function (key, callbackfn) {
          if (this.has(key)) return this.get(key);
          var val = callbackfn(key);
          this.set(key, val);
          return val;
        };
      }
      if (!WeakMap.prototype.getOrInsert) {
        WeakMap.prototype.getOrInsert = function (key, defaultValue) {
          if (this.has(key)) return this.get(key);
          this.set(key, defaultValue);
          return defaultValue;
        };
      }
    }
    if (typeof Uint8Array !== 'undefined' && !Uint8Array.fromBase64) {
      Uint8Array.fromBase64 = function (base64String) {
        var binString = atob(String(base64String).replace(/[\r\n\s]+/g, ''));
        var len = binString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        return bytes;
      };
    }
    if (!Object.hasOwn) {
      Object.hasOwn = function (obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      };
    }
  } catch {
    // Abaikan jika gagal memasang polyfill
  }

  try {
    var savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  } catch {
    // Abaikan jika akses localStorage dibatasi
  }

  // Mencegah gesture zoom in/out (pinch & double-tap) di mobile browser (iOS & Android)
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gestureend', function (e) {
    e.preventDefault();
  }, { passive: false });

  // Global Flag Pemantau React Mount
  window.__APP_MOUNTED__ = false;
  var __lastCapturedError = null;

  // Fungsi Pemulihan Mandiri / Bersihkan Cache
  window.__appSelfRepair = async function () {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (reg) { return reg.unregister(); }));
      }
      if ('caches' in window) {
        var cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(function (name) { return caches.delete(name); }));
      }
      var theme = localStorage.getItem('theme');
      localStorage.clear();
      sessionStorage.clear();
      if (theme) localStorage.setItem('theme', theme);
      var targetUrl = window.location.origin + window.location.pathname + '?repair=' + Date.now();
      window.location.replace(targetUrl);
    } catch {
      window.location.reload();
    }
  };

  // Deteksi kegagalan unduh berkas chunk (biasa terjadi setelah update deploy)
  function isChunkLoadError(msg) {
    if (!msg) return false;
    var s = String(msg).toLowerCase();
    return (
      s.includes('failed to fetch dynamically imported module') ||
      s.includes('loading chunk') ||
      s.includes('chunkloaderror') ||
      s.includes('importing a module script failed') ||
      s.includes('error loading dynamically imported module')
    );
  }

  function renderRecoveryUI(reason) {
    if (window.__APP_MOUNTED__) return;
    var root = document.getElementById('root');
    if (!root) return;

    // Jangan timpa jika halaman aplikasi sudah berhasil di-render oleh React
    if (root.children.length > 0 && !root.querySelector('.app-initial-loader')) {
      return;
    }

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var bg = isDark ? '#07182D' : '#F8FAFC';
    var cardBg = isDark ? '#0B2545' : '#FFFFFF';
    var textMain = isDark ? '#F8FAFC' : '#0F172A';
    var textMuted = isDark ? '#94A3B8' : '#64748B';
    var border = isDark ? '#1E3A8A' : '#E2E8F0';
    var primary = isDark ? '#3B82F6' : '#1D4ED8';

    var cleanReason = (reason || __lastCapturedError || 'Sistem tidak merespons')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    root.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:' + bg + ';font-family:\'Plus Jakarta Sans\',-apple-system,sans-serif;color:' + textMain + ';box-sizing:border-box;">' +
        '<div style="max-width:520px;width:100%;background:' + cardBg + ';border:1px solid ' + border + ';border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.1);padding:2rem;text-align:center;box-sizing:border-box;">' +
          '<div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem auto;">' +
            '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="12" cy="12" r="10"></circle>' +
              '<line x1="12" y1="8" x2="12" y2="12"></line>' +
              '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
            '</svg>' +
          '</div>' +
          '<h2 style="font-size:1.25rem;font-weight:700;margin:0 0 0.5rem 0;color:' + textMain + ';">Pembaruan Versi atau Kendala Memuat</h2>' +
          '<p style="font-size:0.9rem;line-height:1.5;color:' + textMuted + ';margin:0 0 1.5rem 0;">' +
            'Sistem mendeteksi adanya pembaruan aplikasi atau data cache peramban yang perlu disegarkan agar tampilan tidak terkendala.' +
          '</p>' +
          '<div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem;">' +
            '<button id="btn-recovery-repair" type="button" style="width:100%;padding:0.75rem 1rem;background:' + primary + ';color:#FFFFFF;border:none;border-radius:10px;font-weight:600;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>' +
                '<path d="M21 3v5h-5"></path>' +
                '<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>' +
                '<path d="M8 16H3v5"></path>' +
              '</svg>' +
              'Bersihkan Cache &amp; Pulihkan Otomatis' +
            '</button>' +
            '<button id="btn-recovery-reload" type="button" style="width:100%;padding:0.65rem 1rem;background:transparent;color:' + textMain + ';border:1px solid ' + border + ';border-radius:10px;font-weight:500;font-size:0.85rem;cursor:pointer;">' +
              'Muat Ulang Halaman' +
            '</button>' +
          '</div>' +
          '<details open style="text-align:left;font-size:0.75rem;color:' + textMuted + ';margin-top:1rem;border-top:1px solid ' + border + ';padding-top:0.75rem;">' +
            '<summary style="cursor:pointer;user-select:none;">Informasi Teknis Kendala</summary>' +
            '<pre style="margin-top:0.5rem;padding:0.5rem;background:rgba(0,0,0,0.06);border-radius:6px;overflow-x:auto;color:#EF4444;white-space:pre-wrap;">' + cleanReason + '</pre>' +
          '</details>' +
        '</div>' +
      '</div>';

    var repairBtn = document.getElementById('btn-recovery-repair');
    if (repairBtn) {
      repairBtn.addEventListener('click', function () {
        window.__appSelfRepair();
      });
    }
    var reloadBtn = document.getElementById('btn-recovery-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  window.addEventListener('error', function (event) {
    // Hanya tangkap error yang benar-benar berasal dari bundel utama aplikasi (/assets/)
    // Abaikan seluruh error dari WKUserScript iOS (webkit-masked-url://, __gCrWeb Chrome iOS, WhatsApp WebView, Cloudflare beacon, ekstensi)
    if (!event.filename || event.filename.indexOf('/assets/') === -1) {
      return;
    }

    var msg = event.message || (event.error && event.error.message) || '';
    if (!msg) return;

    var lowerMsg = String(msg).toLowerCase();
    if (lowerMsg.indexOf('resizeobserver') !== -1) {
      return;
    }

    __lastCapturedError = msg + ' (' + event.filename + ':' + (event.lineno || 0) + ':' + (event.colno || 0) + ')';

    if (isChunkLoadError(msg)) {
      var retryKey = '__chunk_auto_retry_flag__';
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        window.location.replace(window.location.origin + window.location.pathname + '?reload=' + Date.now());
        return;
      }
    }

    // Berikan jeda waktu 10 detik untuk memastikan bukan error sementara dan beri kesempatan bundle selesai di-parse
    if (!window.__APP_MOUNTED__) {
      setTimeout(function () {
        if (!window.__APP_MOUNTED__) {
          var root = document.getElementById('root');
          if (root && (root.children.length === 0 || root.querySelector('.app-initial-loader'))) {
            renderRecoveryUI(__lastCapturedError || msg);
          }
        }
      }, 10000);
    }
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason ? (event.reason.message || String(event.reason)) : '';
    if (!reason) return;
    __lastCapturedError = reason;
    if (isChunkLoadError(reason)) {
      var retryKey = '__chunk_auto_retry_flag__';
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        window.location.replace(window.location.origin + window.location.pathname + '?reload=' + Date.now());
        return;
      }
    }
  });

  // Watchdog Pengaman Layar Putih (20 detik untuk mengakomodasi jaringan mobile & bundle ukuran besar)
  setTimeout(function () {
    if (!window.__APP_MOUNTED__) {
      var root = document.getElementById('root');
      if (root && (root.children.length === 0 || root.querySelector('.app-initial-loader'))) {
        var statusInfo = window.__BUNDLE_EXECUTING__ ? 'Bundel dieksekusi namun mount belum selesai' : 'Bundel belum tereksekusi';
        renderRecoveryUI((__lastCapturedError ? __lastCapturedError + ' | ' : '') + statusInfo + ' (' + navigator.userAgent + ')');
      }
    }
  }, 20000);
})();
