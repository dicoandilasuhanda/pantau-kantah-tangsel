import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Shield, User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import LoginHelpModal from '../components/LoginHelpModal';
import { getCookie, loginRequest, persistAuthSession } from '../utils/authSession';
import './Login.css';


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

        persistAuthSession({ token, data, username, rememberMe });

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
              <img src="/logo-atr-bpn.png" alt="Logo Kementerian ATR/BPN" width="38" height="38" fetchpriority="high" className="bpn-seal-img" />
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
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
                title="Pilih Mode Gelap"
              >
                <Moon size={13} color={theme === 'dark' ? '#FFFFFF' : '#64748B'} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="bpn-header-spacer" aria-hidden="true" />

      {/* =========================================================================
          2. MAIN CONTENT SECTION (Centered Login Card)
         ========================================================================= */}
      <main className="bpn-main">
        <div className="bpn-main-container">
          {/* Kartu Autentikasi (Di Tengah Layar) */}
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
              © 2026 Kantor Pertanahan Kota Tangerang Selatan
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

      <LoginHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

    </div>
  );
}
