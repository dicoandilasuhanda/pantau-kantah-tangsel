import { useState, useEffect, useMemo } from 'react';
import { Lock } from 'lucide-react';

function detectMobileClient() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  const isNarrowViewport = window.innerWidth <= 768;
  return isMobileUa || isCoarsePointer || isNarrowViewport;
}

function formatWibTimestamp() {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildWatermarkSvgUrl(label) {
  const safeLabel = String(label || 'Pantau.Kantah Tangsel')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">` +
      `<g transform="rotate(-28 160 110)">` +
        `<text x="160" y="95" text-anchor="middle" fill="#64748b" fill-opacity="0.16" font-family="sans-serif" font-size="12" font-weight="700">${safeLabel}</text>` +
        `<text x="160" y="116" text-anchor="middle" fill="#64748b" fill-opacity="0.12" font-family="sans-serif" font-size="10" font-weight="600">DOKUMEN INTERNAL KANTAH TANGSEL</text>` +
      `</g>` +
    `</svg>`;

  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

/**
 * Proteksi lapisan pencegahan khusus perangkat mobile:
 * 1. Dynamic Watermark Overlay identitas petugas + waktu WIB
 * 2. Privacy Blur Shield saat browser masuk mode App Switcher / tab latar belakang
 * 3. Blokir long-press context menu, drag gambar, dan seleksi teks non-input
 */
export default function MobileSecurityGuard({ disabled = false }) {
  const [isMobile, setIsMobile] = useState(detectMobileClient);
  const [isBlurred, setIsBlurred] = useState(false);
  const [timestamp, setTimestamp] = useState(formatWibTimestamp);

  const token = localStorage.getItem('token');
  const fullName = localStorage.getItem('full_name') || localStorage.getItem('username') || 'Petugas';
  const username = localStorage.getItem('username') || '';
  const isActive = !disabled && Boolean(token) && isMobile;

  useEffect(() => {
    const updateMobileState = () => setIsMobile(detectMobileClient());
    window.addEventListener('resize', updateMobileState);
    return () => window.removeEventListener('resize', updateMobileState);
  }, []);

  useEffect(() => {
    if (!isActive) {
      document.documentElement.classList.remove('mobile-guard-active');
      setIsBlurred(false);
      return;
    }

    document.documentElement.classList.add('mobile-guard-active');

    // Perbarui timestamp watermark tiap 60 detik agar waktu tangkapan selalu akurat
    setTimestamp(formatWibTimestamp());
    const timer = setInterval(() => setTimestamp(formatWibTimestamp()), 60000);

    const handleVisibility = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    const handleBlur = () => {
      // Hindari menutupi picker bawaan browser saat input/select aktif
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'SELECT' || activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }
      setIsBlurred(true);
    };
    const handleFocus = () => {
      if (!document.hidden) setIsBlurred(false);
    };

    const handleContextMenu = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };

    const handleDragStart = (e) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      clearInterval(timer);
      document.documentElement.classList.remove('mobile-guard-active');
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isActive]);

  const watermarkBg = useMemo(() => {
    const identity = username ? `${fullName} (@${username})` : fullName;
    return buildWatermarkSvgUrl(`${identity} • ${timestamp} WIB`);
  }, [fullName, username, timestamp]);

  if (!isActive) return null;

  return (
    <>
      {/* Watermark Identitas Transparan (Tidak Menghalangi Sentuhan / Cetak) */}
      <div
        className="no-print"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundImage: watermarkBg,
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Privacy Blur Shield saat App Switcher / Kehilangan Fokus */}
      {isBlurred && (
        <div
          className="no-print"
          onClick={() => setIsBlurred(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: '#f8fafc'
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Lock size={28} color="#60a5fa" />
          </div>
          <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
            Layar Dilindungi
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '300px', lineHeight: 1.5 }}>
            Tampilan disamarkan untuk menjaga kerahasiaan data layanan pertanahan. Ketuk layar untuk melanjutkan.
          </p>
        </div>
      )}
    </>
  );
}
