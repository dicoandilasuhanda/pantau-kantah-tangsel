import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Shield, User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, HelpCircle, X, Mail } from 'lucide-react';

// Helper Cookie
function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  } else if (days === -1) {
    expires = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
  document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Request Login ke API Backend
async function loginRequest(username, password) {
  let endpoint = '/api/auth/login';
  let res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 404) {
    endpoint = '/api/login';
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Login gagal, periksa kredensial Anda');
    err.status = res.status;
    err.response = { status: res.status, data };
    throw err;
  }

  return data;
}

export default function Login() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('saved_username') || getCookie('saved_username') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true' || getCookie('remember_me') === 'true';
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const navigate = useNavigate();

  // Pengaturan tema (dark / light)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const setThemeMode = (mode) => {
    setTheme(mode);
    localStorage.setItem('theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    window.dispatchEvent(new Event('theme-change'));
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    const handleThemeSync = () => {
      const current = localStorage.getItem('theme') || 'light';
      setTheme(current);
      document.documentElement.setAttribute('data-theme', current);
    };
    window.addEventListener('theme-change', handleThemeSync);
    return () => window.removeEventListener('theme-change', handleThemeSync);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await loginRequest(username, password);
      const token = data.token || data.accessToken;

      if (token) {
        const userObj = data.user || data || {};
        let userRole = data.role || userObj.role || userObj.roles || '';
        if (Array.isArray(userRole)) userRole = userRole.join(',');

        // Simpan sesi login
        localStorage.setItem('token', token);
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('session_active', 'true');

        localStorage.setItem('user', JSON.stringify(userObj));
        sessionStorage.setItem('user', JSON.stringify(userObj));

        if (userRole) {
          localStorage.setItem('role', userRole);
          sessionStorage.setItem('role', userRole);
        }

        if (userObj.id || userObj.userId || userObj.user_id) {
          const uid = String(userObj.id || userObj.userId || userObj.user_id);
          localStorage.setItem('id', uid);
          localStorage.setItem('userId', uid);
        }

        if (userObj.username) localStorage.setItem('username', userObj.username);
        const fullName = userObj.full_name || userObj.fullName || userObj.name || userObj.nama || userObj.nama_lengkap || userObj.username || '';
        if (fullName) {
          localStorage.setItem('full_name', fullName);
          localStorage.setItem('fullName', fullName);
          localStorage.setItem('name', fullName);
          localStorage.setItem('nama', fullName);
        }
        
        if (userObj.seksi) localStorage.setItem('seksi', userObj.seksi);

        // Pengaturan Ingat Sesi
        if (rememberMe) {
          localStorage.setItem('saved_username', username);
          localStorage.setItem('remember_me', 'true');
          setCookie('saved_username', encodeURIComponent(username), 30);
          setCookie('remember_me', 'true', 30);
        } else {
          localStorage.removeItem('saved_username');
          localStorage.setItem('remember_me', 'false');
          setCookie('saved_username', '', -1);
          setCookie('remember_me', '', -1);
        }

        navigate('/');
      } else {
        setError(data.message || 'Login gagal, periksa username dan kata sandi Anda');
      }
    } catch (err) {
      if (err.status === 429 || (err.response && err.response.status === 429)) {
        setError('Terlalu banyak percobaan login. Silakan tunggu beberapa saat.');
      } else {
        setError(err.response?.data?.message || err.message || 'Gagal terhubung ke server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bpn-login-wrapper ${theme === 'light' ? 'bpn-theme-light' : 'bpn-theme-dark'}`}>
      {/* =========================================================================
          1. TOP GLOBAL HEADER (Institutional Bar)
         ========================================================================= */}
      <header className="bpn-header">
        <div className="bpn-header-container">
          {/* Logo & Branding ATR/BPN */}
          <div className="bpn-brand-group">
            <div className="bpn-seal-box" title="Kementerian ATR/BPN RI">
              <img src="/logo-atr-bpn.png" alt="Logo Kementerian ATR/BPN" className="bpn-seal-img" />
            </div>
            <div>
              <div className="bpn-kantah-title">
                <span className="bpn-title-full">Kantor Pertanahan Kota Tangerang Selatan</span>
                <span className="bpn-title-short">Kantah Tangsel</span>
                <span className="bpn-sep">|</span>
                <span className="bpn-app-name">Pantau<span className="bpn-app-sub">.Kantah Tangsel</span></span>
              </div>
            </div>
          </div>

          {/* Theme Switcher Segmented */}
          <div className="bpn-header-tools">
            <div className="theme-switch-segmented" role="group" aria-label="Pilihan Tema Tampilan">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
                title="Pilih Mode Terang"
              >
                <Sun size={13} color={theme === 'light' ? '#FFFFFF' : '#64748B'} />
                <span>Terang</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
                title="Pilih Mode Gelap"
              >
                <Moon size={13} color={theme === 'dark' ? '#FFFFFF' : '#64748B'} />
                <span>Gelap</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN CONTENT SECTION (Hero Left + Login Card Right)
         ========================================================================= */}
      <main className="bpn-main">
        <div className="bpn-main-container">
          {/* SISI KIRI: Enterprise Context */}
          <section className="bpn-hero-section">
            <div className="bpn-headline-block">
              <h1 className="bpn-main-title">
                Pelacakan Berkas &amp; Monitoring Persuratan
              </h1>
              <p className="bpn-main-desc">
                Sistem pemantauan alur fisik warkah permohonan, pencatatan agenda surat masuk &amp; disposisi, serta tertib administrasi serah terima di Kantor Pertanahan Kota Tangerang Selatan.
              </p>
            </div>

            {/* Kartu Fitur Utama */}
            <div className="bpn-feature-list">
              <div className="bpn-feat-item">
                <div className="bpn-feat-icon bpn-icon-blue">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="bpn-feat-title">Pelacakan Posisi Berkas</h2>
                  <p className="bpn-feat-desc">Pantau posisi berkas seketika di Seksi Penetapan Hak (PHP), Survei &amp; Pemetaan, maupun Sengketa secara real-time.</p>
                </div>
              </div>

              <div className="bpn-feat-item">
                <div className="bpn-feat-icon bpn-icon-indigo">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="bpn-feat-title">Serah Terima &amp; Scan QR Code</h2>
                  <p className="bpn-feat-desc">Validasi perpindahan fisik dokumen antar meja dengan pemindaian barcode digital &amp; pencatatan riwayat sah.</p>
                </div>
              </div>

              <div className="bpn-feat-item">
                <div className="bpn-feat-icon bpn-icon-emerald">
                  <Mail size={18} />
                </div>
                <div>
                  <h2 className="bpn-feat-title">Administrasi &amp; Disposisi Surat</h2>
                  <p className="bpn-feat-desc">Kelola agenda surat masuk, disposisi pimpinan, serta pemantauan tindak lanjut surat seksi secara akuntabel.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SISI KANAN: Kartu Autentikasi */}
          <section className="bpn-card-section">
            <div className="bpn-login-card">
              <div className="bpn-card-header">
                <div className="bpn-mobile-seal">
                  <Shield size={24} color="#D97706" />
                </div>
                <h2 className="bpn-card-title">Masuk ke Akun</h2>
                <p className="bpn-card-subtitle">
                  Akses portal monitoring berkas &amp; persuratan pegawai Kantah Tangsel
                </p>
              </div>

              {/* Alert Error jika autentikasi gagal */}
              {error && (
                <div className="bpn-alert-box">
                  <AlertCircle size={16} className="bpn-alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bpn-form">
                {/* Field 1: Username */}
                <div className="bpn-form-group">
                  <label htmlFor="username" className="bpn-label">
                    Username
                  </label>
                  <div className="bpn-input-wrapper">
                    <User size={16} className="bpn-field-icon" />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      className="bpn-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      required
                      autoComplete="username"
                      autoFocus={!username}
                    />
                  </div>
                </div>

                {/* Field 2: Kata Sandi */}
                <div className="bpn-form-group">
                  <div className="bpn-label-split">
                    <label htmlFor="password" className="bpn-label">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      className="bpn-forgot-link"
                      onClick={() => setShowHelpModal(true)}
                    >
                      Lupa sandi?
                    </button>
                  </div>
                  <div className="bpn-input-wrapper">
                    <Lock size={16} className="bpn-field-icon" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="bpn-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      required
                      autoComplete="current-password"
                      autoFocus={!!username}
                    />
                    <button
                      type="button"
                      className="bpn-eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Checkbox: Ingat Sesi */}
                <div className="bpn-remember-row">
                  <label className="bpn-checkbox-label">
                    <input
                      type="checkbox"
                      className="bpn-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Ingat sesi saya</span>
                  </label>
                </div>

                {/* Tombol Utama Submit */}
                <button
                  type="submit"
                  className="bpn-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="bpn-btn-loading">
                      <span className="bpn-spinner" />
                      Memverifikasi...
                    </span>
                  ) : (
                    <>
                      <span>Masuk ke Sistem</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footnote Keamanan Sesi */}
              <div className="bpn-card-footnote">
                <span className="bpn-tls-status">
                  <CheckCircle2 size={13} className="bpn-tls-icon" />
                  Enkripsi Sesi Aktif
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =========================================================================
          3. BOTTOM INSTITUTIONAL FOOTER
         ========================================================================= */}
      <footer className="bpn-footer">
        <div className="bpn-footer-container">
          <div className="bpn-footer-left">
            <p className="bpn-footer-copy">
              © 2026 Kantor Pertanahan Kota Tangerang Selatan — Kementerian Agraria dan Tata Ruang / BPN RI
            </p>
          </div>

          <div className="bpn-footer-right">
            <a
              href="https://x.com/dicoandila"
              target="_blank"
              rel="noreferrer"
              className="bpn-author-link"
            >
              Build by @dicoandila
            </a>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          MODAL BANTUAN & RESET SANDI
         ========================================================================= */}
      {showHelpModal && (
        <div className="bpn-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="bpn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bpn-modal-header">
              <div className="bpn-modal-title-group">
                <HelpCircle size={20} color="#1D4ED8" />
                <h3>Bantuan &amp; Pemulihan Akun</h3>
              </div>
              <button
                type="button"
                className="bpn-modal-close"
                onClick={() => setShowHelpModal(false)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bpn-modal-body">
              <p>Untuk reset kata sandi atau kendala akses akun Pantau.Kantah Tangsel, silakan hubungi Administrator IT internal Kantah Kota Tangerang Selatan, Admin Dico :</p>
              <div className="bpn-help-box">
                <p>• <strong>Lokasi:</strong> Ruang Server &amp; Pengolahan Data (Lantai 2)</p>
              </div>
            </div>
            <div className="bpn-modal-footer">
              <button
                type="button"
                className="bpn-modal-btn-primary"
                onClick={() => setShowHelpModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCOPED STYLES
         ========================================================================= */}
      <style>{`
        .bpn-login-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
          position: relative;
          transition: background-color 0.25s ease, color 0.25s ease;
        }

        /* Mode Terang (Office Slate & Gov Pattern) */
        .bpn-theme-light {
          background-color: #F8FAFC;
          background-image: radial-gradient(#CBD5E1 0.75px, transparent 0.75px), radial-gradient(#E2E8F0 0.75px, #F8FAFC 0.75px);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
          color: #0F172A;
        }

        /* Mode Gelap (Deep Navy Dark) */
        .bpn-theme-dark {
          background-color: #07182D;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 0.75px, transparent 0.75px), radial-gradient(rgba(255, 255, 255, 0.04) 0.75px, #07182D 0.75px);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
          color: #F8FAFC;
        }

        /* ==================== 1. TOP HEADER ==================== */
        .bpn-header {
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 40;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .bpn-theme-light .bpn-header {
          background-color: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .bpn-theme-dark .bpn-header {
          background-color: rgba(11, 37, 69, 0.92);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .bpn-header-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1.25rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bpn-brand-group {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .bpn-seal-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bpn-seal-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
        }

        .bpn-ministry-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          line-height: 1.1;
        }
        .bpn-ministry-name {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748B;
        }
        .bpn-theme-dark .bpn-ministry-name {
          color: #94A3B8;
        }

        .bpn-active-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
        }
        .bpn-theme-dark .bpn-active-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #34D399;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .bpn-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
          animation: bpnPulse 2s infinite ease-in-out;
        }
        @keyframes bpnPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .bpn-kantah-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.015em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .bpn-theme-dark .bpn-kantah-title {
          color: #F8FAFC;
        }
        .bpn-title-short {
          display: none;
        }
        .bpn-sep {
          color: #CBD5E1;
        }
        .bpn-theme-dark .bpn-sep {
          color: #475569;
        }
        .bpn-app-name {
          color: #0B2545;
          font-weight: 800;
        }
        .bpn-theme-dark .bpn-app-name {
          color: #38BDF8;
        }
        .bpn-app-sub {
          color: #1D4ED8;
        }
        .bpn-theme-dark .bpn-app-sub {
          color: #93C5FD;
        }

        @media (max-width: 680px) {
          .bpn-header-container {
            padding: 0 0.85rem;
          }
          .bpn-title-full {
            display: none !important;
          }
          .bpn-title-short {
            display: inline !important;
          }
        }

        @media (max-width: 480px) {
          .bpn-header-container {
            padding: 0 0.75rem;
            height: 56px;
          }
          .bpn-seal-box {
            width: 34px;
            height: 34px;
          }
          .bpn-kantah-title {
            font-size: 0.82rem;
            gap: 4px;
          }
          .bpn-sep {
            display: none !important;
          }
          .bpn-title-short {
            display: none !important;
          }
          .bpn-theme-btn {
            padding: 6px !important;
            border-radius: 50% !important;
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
          }
          .bpn-theme-btn span {
            display: none !important;
          }
        }

        .bpn-header-tools {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .bpn-header-btn {
          width: auto !important;
          max-width: fit-content !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 5px !important;
          background: transparent !important;
          border: none !important;
          color: #475569 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          transition: color 0.15s, background-color 0.15s !important;
        }
        .bpn-theme-dark .bpn-header-btn {
          color: #CBD5E1 !important;
        }
        .bpn-header-btn:hover {
          color: #1D4ED8 !important;
          background: rgba(29, 78, 216, 0.08) !important;
        }
        .bpn-theme-dark .bpn-header-btn:hover {
          color: #38BDF8 !important;
          background: rgba(56, 189, 248, 0.1) !important;
        }

        /* Tombol Switch Tema Proporsional & Rapi */
        .bpn-theme-btn {
          width: auto !important;
          max-width: fit-content !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          border-radius: 9999px !important;
          cursor: pointer !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
          margin: 0 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
        }
        .bpn-theme-light .bpn-theme-btn {
          background: #FFFFFF !important;
          border: 1px solid #CBD5E1 !important;
          color: #1E293B !important;
        }
        .bpn-theme-light .bpn-theme-btn:hover {
          background: #F1F5F9 !important;
          border-color: #94A3B8 !important;
          transform: translateY(-1px);
        }
        .bpn-theme-dark .bpn-theme-btn {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #F8FAFC !important;
        }
        .bpn-theme-dark .bpn-theme-btn:hover {
          background: rgba(30, 41, 59, 0.9) !important;
          border-color: #38BDF8 !important;
          transform: translateY(-1px);
        }
        .bpn-theme-sun {
          color: #F59E0B;
        }
        .bpn-theme-moon {
          color: #0284C7;
        }

        /* ==================== 2. MAIN SECTION ==================== */
        .bpn-main {
          flex: 1 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem;
        }

        .bpn-main-container {
          width: 100%;
          max-width: 1120px;
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          gap: 3.5rem;
          align-items: center;
        }
        @media (max-width: 960px) {
          .bpn-main {
            padding: 1.25rem 1rem 2.25rem 1rem !important;
          }
          .bpn-main-container {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 440px;
            margin: 0 auto;
          }
          .bpn-card-section {
            order: 1; /* Form login langsung muncul di atas di layar HP */
            width: 100%;
          }
          .bpn-hero-section {
            order: 2; /* Penjelasan fitur & sistem di bawahnya */
            width: 100%;
            gap: 1.15rem;
          }
          .bpn-mobile-seal {
            display: none !important;
          }
        }

        /* Sisi Kiri (Hero) */
        .bpn-hero-section {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }

        .bpn-tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: fit-content;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 700;
        }
        .bpn-theme-light .bpn-tag-badge {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E3A8A;
        }
        .bpn-theme-dark .bpn-tag-badge {
          background: rgba(29, 78, 216, 0.18);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #93C5FD;
        }
        .bpn-tag-icon {
          color: #1D4ED8;
        }
        .bpn-theme-dark .bpn-tag-icon {
          color: #60A5FA;
        }

        .bpn-headline-block {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .bpn-main-title {
          font-size: 2.15rem;
          font-weight: 800;
          line-height: 1.22;
          letter-spacing: -0.025em;
          margin: 0;
        }
        .bpn-theme-light .bpn-main-title {
          color: #0F172A;
        }
        .bpn-theme-dark .bpn-main-title {
          color: #F8FAFC;
        }
        @media (max-width: 640px) {
          .bpn-main-title {
            font-size: 1.7rem;
          }
        }

        .bpn-main-desc {
          font-size: 0.92rem;
          line-height: 1.6;
          margin: 0;
        }
        .bpn-theme-light .bpn-main-desc {
          color: #475569;
        }
        .bpn-theme-dark .bpn-main-desc {
          color: #94A3B8;
        }

        /* Fitur Item Cards */
        .bpn-feature-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .bpn-feat-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          transition: transform 0.15s, border-color 0.15s;
        }
        .bpn-theme-light .bpn-feat-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .bpn-theme-dark .bpn-feat-item {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .bpn-feat-item:hover {
          transform: translateY(-1px);
        }
        .bpn-theme-light .bpn-feat-item:hover {
          border-color: #CBD5E1;
        }
        .bpn-theme-dark .bpn-feat-item:hover {
          border-color: rgba(56, 189, 248, 0.4);
        }

        .bpn-feat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .bpn-icon-blue {
          background: #EFF6FF;
          color: #1D4ED8;
        }
        .bpn-theme-dark .bpn-icon-blue {
          background: rgba(56, 189, 248, 0.15);
          color: #38BDF8;
        }
        .bpn-icon-indigo {
          background: #EEF2FF;
          color: #4338CA;
        }
        .bpn-theme-dark .bpn-icon-indigo {
          background: rgba(99, 102, 241, 0.15);
          color: #818CF8;
        }
        .bpn-icon-emerald {
          background: #ECFDF5;
          color: #059669;
        }
        .bpn-theme-dark .bpn-icon-emerald {
          background: rgba(16, 185, 129, 0.15);
          color: #34D399;
        }

        .bpn-feat-title {
          font-size: 0.86rem;
          font-weight: 700;
          margin: 0 0 3px 0;
        }
        .bpn-theme-light .bpn-feat-title {
          color: #0F172A;
        }
        .bpn-theme-dark .bpn-feat-title {
          color: #F8FAFC;
        }

        .bpn-feat-desc {
          font-size: 0.77rem;
          margin: 0;
          line-height: 1.4;
        }
        .bpn-theme-light .bpn-feat-desc {
          color: #64748B;
        }
        .bpn-theme-dark .bpn-feat-desc {
          color: #94A3B8;
        }

        /* Server Bar Status */
        .bpn-server-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.75rem;
        }
        .bpn-theme-light .bpn-server-bar {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          color: #475569;
        }
        .bpn-theme-dark .bpn-server-bar {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .bpn-server-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bpn-server-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 2px #A7F3D0;
        }
        .bpn-theme-dark .bpn-server-dot {
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }
        .bpn-server-right {
          font-family: monospace;
          font-size: 0.72rem;
        }
        .bpn-server-ping {
          color: #047857;
          font-weight: 700;
        }
        .bpn-theme-dark .bpn-server-ping {
          color: #34D399;
        }

        /* ==================== Sisi Kanan (Login Card) ==================== */
        .bpn-card-section {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .bpn-login-card {
          width: 100%;
          max-width: 440px;
          border-radius: 18px;
          padding: 2.25rem 2.25rem;
          box-sizing: border-box;
          transition: background-color 0.2s, box-shadow 0.2s;
        }
        .bpn-theme-light .bpn-login-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
        }
        .bpn-theme-dark .bpn-login-card {
          background: rgba(11, 23, 45, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        @media (max-width: 640px) {
          .bpn-login-card {
            padding: 1.5rem 1.15rem !important;
            border-radius: 14px !important;
          }
          .bpn-card-title {
            font-size: 1.3rem !important;
          }
          .bpn-card-subtitle {
            font-size: 0.77rem !important;
          }
          .bpn-main-title {
            font-size: 1.45rem !important;
          }
          .bpn-main-desc {
            font-size: 0.84rem !important;
            line-height: 1.5;
          }
          .bpn-input {
            height: 46px !important;
            font-size: 16px !important; /* Mencegah auto zoom-in Safari iOS */
          }
          .bpn-submit-btn {
            height: 46px !important;
            font-size: 0.92rem !important;
          }
          .bpn-feat-item {
            padding: 10px 12px !important;
            border-radius: 10px !important;
          }
          .bpn-feat-title {
            font-size: 0.82rem !important;
          }
          .bpn-feat-desc {
            font-size: 0.74rem !important;
          }
          .bpn-footer-container {
            text-align: center;
            align-items: center;
            gap: 0.5rem;
            padding: 0 1rem;
          }
          .bpn-footer-right {
            justify-content: center;
          }
        }

        .bpn-card-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 6px 0;
        }
        .bpn-theme-light .bpn-card-title {
          color: #0F172A;
        }
        .bpn-theme-dark .bpn-card-title {
          color: #F8FAFC;
        }

        .bpn-card-subtitle {
          font-size: 0.8rem;
          line-height: 1.45;
          margin: 0;
        }
        .bpn-theme-light .bpn-card-subtitle {
          color: #64748B;
        }
        .bpn-theme-dark .bpn-card-subtitle {
          color: #94A3B8;
        }

        /* Alert Error Box */
        .bpn-alert-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          margin-bottom: 1.15rem;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
        }
        .bpn-theme-dark .bpn-alert-box {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.35);
          color: #FCA5A5;
        }
        .bpn-alert-icon {
          flex-shrink: 0;
          color: #DC2626;
        }

        /* Form styling */
        .bpn-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .bpn-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bpn-label {
          font-size: 0.8rem;
          font-weight: 700;
        }
        .bpn-theme-light .bpn-label {
          color: #334155;
        }
        .bpn-theme-dark .bpn-label {
          color: #E2E8F0;
        }

        .bpn-label-split {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bpn-forgot-link {
          width: auto !important;
          max-width: fit-content !important;
          background: transparent !important;
          border: none !important;
          color: #1D4ED8 !important;
          font-size: 0.76rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          padding: 0 !important;
          text-decoration: none !important;
        }
        .bpn-theme-dark .bpn-forgot-link {
          color: #38BDF8 !important;
        }
        .bpn-forgot-link:hover {
          text-decoration: underline !important;
        }

        .bpn-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .bpn-field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          z-index: 2;
        }

        .bpn-input {
          width: 100%;
          height: 44px;
          padding: 0 40px 0 40px !important;
          margin: 0 !important;
          border-radius: 8px;
          font-size: 0.88rem;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }
        .bpn-theme-light .bpn-input {
          background-color: #FFFFFF !important;
          border: 1px solid #CBD5E1 !important;
          color: #0F172A !important;
        }
        .bpn-theme-light .bpn-input:focus {
          background-color: #FFFFFF !important;
          border-color: #1D4ED8 !important;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15) !important;
        }
        .bpn-theme-light .bpn-input:-webkit-autofill,
        .bpn-theme-light .bpn-input:-webkit-autofill:hover,
        .bpn-theme-light .bpn-input:-webkit-autofill:focus,
        .bpn-theme-light .bpn-input:-webkit-autofill:active {
          -webkit-text-fill-color: #0F172A !important;
          caret-color: #0F172A !important;
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }

        .bpn-theme-dark .bpn-input {
          background-color: rgba(15, 23, 42, 0.75) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #F8FAFC !important;
        }
        .bpn-theme-dark .bpn-input:focus {
          background-color: rgba(15, 23, 42, 0.95) !important;
          border-color: #38BDF8 !important;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
        }
        .bpn-theme-dark .bpn-input:-webkit-autofill,
        .bpn-theme-dark .bpn-input:-webkit-autofill:hover,
        .bpn-theme-dark .bpn-input:-webkit-autofill:focus,
        .bpn-theme-dark .bpn-input:-webkit-autofill:active {
          -webkit-text-fill-color: #F8FAFC !important;
          caret-color: #F8FAFC !important;
          -webkit-box-shadow: 0 0 0 1000px #0D1526 inset !important;
          box-shadow: 0 0 0 1000px #0D1526 inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .bpn-input::placeholder {
          color: #94A3B8;
          opacity: 0.8;
        }

        .bpn-eye-toggle {
          width: 24px !important;
          height: 24px !important;
          max-width: fit-content !important;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent !important;
          border: none !important;
          color: #94A3B8 !important;
          cursor: pointer !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 4px !important;
          z-index: 2;
        }
        .bpn-eye-toggle:hover {
          color: #1D4ED8 !important;
        }
        .bpn-theme-dark .bpn-eye-toggle:hover {
          color: #38BDF8 !important;
        }

        .bpn-remember-row {
          display: flex;
          align-items: center;
          padding: 2px 0;
          margin-top: 2px;
        }
        .bpn-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-size: 0.82rem;
          cursor: pointer;
          user-select: none;
          margin: 0 !important;
          line-height: 1;
        }
        .bpn-theme-light .bpn-checkbox-label {
          color: #475569;
        }
        .bpn-theme-dark .bpn-checkbox-label {
          color: #CBD5E1;
        }
        .bpn-checkbox {
          width: 16px !important;
          height: 16px !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 4px;
          accent-color: #0B2545;
          cursor: pointer;
          flex-shrink: 0;
          vertical-align: middle;
        }
        .bpn-theme-dark .bpn-checkbox {
          accent-color: #1D4ED8;
        }

        /* Tombol Submit Utama */
        .bpn-submit-btn {
          width: 100% !important;
          height: 44px;
          border: none !important;
          border-radius: 8px !important;
          font-size: 0.9rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          transition: transform 0.15s, background-color 0.15s, box-shadow 0.15s !important;
          margin-top: 0.35rem;
        }
        .bpn-theme-light .bpn-submit-btn {
          background: #0B2545 !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 12px rgba(11, 37, 69, 0.25) !important;
        }
        .bpn-theme-light .bpn-submit-btn:hover:not(:disabled) {
          background: #134074 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(11, 37, 69, 0.35) !important;
        }
        .bpn-theme-dark .bpn-submit-btn {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%) !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 14px rgba(29, 78, 216, 0.4) !important;
        }
        .bpn-theme-dark .bpn-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(29, 78, 216, 0.5) !important;
        }
        .bpn-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed !important;
        }

        .bpn-btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .bpn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: bpnSpin 0.8s linear infinite;
        }
        @keyframes bpnSpin {
          to { transform: rotate(360deg); }
        }

        /* Footnote Card */
        .bpn-card-footnote {
          margin-top: 1.35rem;
          padding-top: 1rem;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
        }
        .bpn-theme-dark .bpn-card-footnote {
          border-top-color: rgba(255, 255, 255, 0.08);
        }
        .bpn-tls-status {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #059669;
          font-weight: 600;
        }
        .bpn-theme-dark .bpn-tls-status {
          color: #34D399;
        }
        .bpn-tls-icon {
          color: #059669;
        }
        .bpn-theme-dark .bpn-tls-icon {
          color: #34D399;
        }

        /* ==================== 3. FOOTER ==================== */
        .bpn-footer {
          width: 100%;
          margin-top: auto;
          padding: 1.15rem 0;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .bpn-theme-light .bpn-footer {
          background: #FFFFFF;
          border-top: 1px solid #E2E8F0;
        }
        .bpn-theme-dark .bpn-footer {
          background: rgba(7, 24, 45, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .bpn-footer-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          font-size: 0.76rem;
        }
        @media (min-width: 768px) {
          .bpn-footer-container {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .bpn-footer-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .bpn-footer-copy {
          font-weight: 600;
          margin: 0;
        }
        .bpn-theme-light .bpn-footer-copy {
          color: #475569;
        }
        .bpn-theme-dark .bpn-footer-copy {
          color: #CBD5E1;
        }

        .bpn-footer-right {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .bpn-footer-link-btn {
          width: auto !important;
          max-width: fit-content !important;
          background: transparent !important;
          border: none !important;
          color: #64748B !important;
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          padding: 0 !important;
          text-decoration: none !important;
        }
        .bpn-theme-dark .bpn-footer-link-btn {
          color: #94A3B8 !important;
        }
        .bpn-footer-link-btn:hover {
          color: #1D4ED8 !important;
          text-decoration: underline !important;
        }
        .bpn-theme-dark .bpn-footer-link-btn:hover {
          color: #38BDF8 !important;
        }

        .bpn-footer-dot {
          color: #CBD5E1;
        }
        .bpn-theme-dark .bpn-footer-dot {
          color: #475569;
        }

        .bpn-footer-node {
          color: #64748B;
        }
        .bpn-theme-dark .bpn-footer-node {
          color: #94A3B8;
        }

        .bpn-author-link {
          color: #0284C7;
          text-decoration: none;
          font-weight: 600;
        }
        .bpn-theme-dark .bpn-author-link {
          color: #38BDF8;
        }
        .bpn-author-link:hover {
          text-decoration: underline;
        }

        /* ==================== 4. MODAL BANTUAN ==================== */
        .bpn-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .bpn-modal-card {
          width: 100%;
          max-width: 480px;
          border-radius: 14px;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          animation: bpnModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bpnModalPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .bpn-theme-light .bpn-modal-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #0F172A;
        }
        .bpn-theme-dark .bpn-modal-card {
          background: #0B172D;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #F8FAFC;
        }

        .bpn-modal-header {
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
        }
        .bpn-theme-dark .bpn-modal-header {
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }
        .bpn-modal-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bpn-modal-title-group h3 {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 700;
        }
        .bpn-theme-light .bpn-modal-title-group h3 {
          color: #0F172A !important;
        }
        .bpn-theme-dark .bpn-modal-title-group h3 {
          color: #F8FAFC !important;
        }
        .bpn-theme-light .bpn-modal-body {
          color: #334155 !important;
        }
        .bpn-theme-dark .bpn-modal-body {
          color: #E2E8F0 !important;
        }
        .bpn-modal-close {
          width: auto !important;
          max-width: fit-content !important;
          background: transparent !important;
          border: none !important;
          color: #94A3B8 !important;
          cursor: pointer !important;
          padding: 4px !important;
          display: flex !important;
          border-radius: 6px !important;
        }
        .bpn-modal-close:hover {
          color: #EF4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .bpn-modal-body {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.84rem;
          line-height: 1.5;
        }
        .bpn-modal-body p {
          margin: 0;
        }

        .bpn-help-box {
          padding: 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          line-height: 1.6;
        }
        .bpn-theme-light .bpn-help-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
        }
        .bpn-theme-dark .bpn-help-box {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bpn-modal-footer {
          padding: 12px 18px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          justify-content: flex-end;
        }
        .bpn-theme-dark .bpn-modal-footer {
          border-top-color: rgba(255, 255, 255, 0.1);
        }
        .bpn-modal-btn-primary {
          width: auto !important;
          max-width: fit-content !important;
          padding: 8px 18px !important;
          border-radius: 8px !important;
          background: #0B2545 !important;
          color: #FFFFFF !important;
          border: none !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
        }
        .bpn-theme-dark .bpn-modal-btn-primary {
          background: #1D4ED8 !important;
        }
        .bpn-modal-btn-primary:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
