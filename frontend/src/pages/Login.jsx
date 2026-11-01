import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Shield, Clock, HelpCircle, User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, X, KeyRound, Server } from 'lucide-react';

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
  // Ambil username yang tersimpan jika fitur "Ingat Sesi" aktif
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('saved_username') || getCookie('saved_username') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [seksi, setSeksi] = useState('survei');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true' || getCookie('remember_me') === 'true';
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSsoNotice, setShowSsoNotice] = useState(false);

  const navigate = useNavigate();

  // Pengaturan tema (dark / light)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.dispatchEvent(new Event('theme-change'));
  };

  useEffect(() => {
    const handleThemeSync = () => {
      setTheme(localStorage.getItem('theme') || 'dark');
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

        // Simpan token & sesi
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
        
        // Simpan seksi jika ada
        const finalSeksi = userObj.seksi || seksi;
        if (finalSeksi) localStorage.setItem('seksi', finalSeksi);

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
        setError(data.message || 'Login gagal, periksa kredensial Anda');
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
              <svg className="bpn-seal-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
              </svg>
            </div>
            <div>
              <div className="bpn-ministry-row">
                <span className="bpn-ministry-name">KEMENTERIAN ATR/BPN</span>
                <span className="bpn-active-badge">
                  <span className="bpn-pulse-dot"></span>
                  Sistem Aktif
                </span>
              </div>
              <div className="bpn-kantah-title">
                Kantor Pertanahan Kota Tangerang Selatan
                <span className="bpn-sep">|</span>
                <span className="bpn-app-name">Pantau<span className="bpn-app-sub">.Kantah</span></span>
              </div>
            </div>
          </div>

          {/* Quick Context, SOP & Theme Switcher */}
          <div className="bpn-header-tools">
            <div className="bpn-hours-pill">
              <Clock size={14} className="bpn-pill-icon" />
              <span>WIB (UTC+7) Operasional: <strong>08.00 - 15.00</strong></span>
            </div>

            <button
              type="button"
              className="bpn-header-btn"
              onClick={() => setShowSopModal(true)}
              title="Panduan Alur Layanan SOP Berkas"
            >
              <HelpCircle size={14} />
              <span>Panduan Penggunaan SOP</span>
            </button>

            {/* Tombol Switch Tema Terang/Gelap Proporsional */}
            <button
              type="button"
              onClick={toggleTheme}
              className="bpn-theme-btn"
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Office Slate)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              aria-label="Ganti Tema Tampilan"
            >
              {theme === 'dark' ? <Sun size={14} className="bpn-theme-sun" /> : <Moon size={14} className="bpn-theme-moon" />}
              <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN CONTENT SECTION (Hero Left + Login Card Right)
         ========================================================================= */}
      <main className="bpn-main">
        <div className="bpn-main-container">
          {/* SISI KIRI: Institutional Showcase */}
          <section className="bpn-hero-section">
            <div className="bpn-tag-badge">
              <Shield size={14} className="bpn-tag-icon" />
              <span>Sistem Terpadu ATR/BPN Kota Tangerang Selatan</span>
            </div>

            <div className="bpn-headline-block">
              <h1 className="bpn-main-title">
                Pusat Kendali &amp; Pelacakan Berkas Layanan Pertanahan
              </h1>
              <p className="bpn-main-desc">
                Platform operasional digital internal Kantah Tangsel untuk monitoring perjalanan fisik warkah, permohonan sertipikat, serta tertib administrasi serah terima antar seksi.
              </p>
            </div>

            {/* Kartu Kapabilitas Utama */}
            <div className="bpn-feature-list">
              <div className="bpn-feat-item">
                <div className="bpn-feat-icon bpn-icon-blue">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="bpn-feat-title">Pelacakan Posisi Berkas Seketika (Real-time)</h2>
                  <p className="bpn-feat-desc">Deteksi posisi presisi di Seksi Penetapan Hak, Pendaftaran, atau Pengukuran Kadastral.</p>
                </div>
              </div>

              <div className="bpn-feat-item">
                <div className="bpn-feat-icon bpn-icon-indigo">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="bpn-feat-title">Serah Terima Digital &amp; Pemindaian QR Barcode</h2>
                  <p className="bpn-feat-desc">Pencatatan rantai serah terima fisik dokumen berbasis tanda tangan &amp; log mutasi sah.</p>
                </div>
              </div>
            </div>

            {/* Status Server QNAP */}
            <div className="bpn-server-bar">
              <div className="bpn-server-left">
                <span className="bpn-server-dot"></span>
                <span>Server Terhubung: <strong>QNAP Kantah Tangsel (10.2.0.122)</strong></span>
              </div>
              <div className="bpn-server-right">
                Latensi: <span className="bpn-server-ping">4ms</span> • NTP: WIB
              </div>
            </div>
          </section>

          {/* SISI KANAN: Kartu Autentikasi Institusional */}
          <section className="bpn-card-section">
            <div className="bpn-login-card">
              <div className="bpn-card-header">
                <div className="bpn-mobile-seal">
                  <Shield size={24} color="#D97706" />
                </div>
                <h2 className="bpn-card-title">Masuk ke Akun</h2>
                <p className="bpn-card-subtitle">
                  Akses Portal Terotentikasi Khusus Pegawai &amp; Petugas Kantah Kota Tangerang Selatan
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
                {/* Field 1: Username / NIP */}
                <div className="bpn-form-group">
                  <label htmlFor="username" className="bpn-label">
                    NIP Pegawai / Username Sistem
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
                      placeholder="Masukkan 18 digit NIP atau ID pengguna"
                      required
                      autoComplete="username"
                      autoFocus={!username}
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div className="bpn-form-group">
                  <div className="bpn-label-split">
                    <label htmlFor="password" className="bpn-label">
                      Kata Sandi Operasional
                    </label>
                    <button
                      type="button"
                      className="bpn-forgot-link"
                      onClick={() => setShowForgotModal(true)}
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
                      placeholder="Masukkan kata sandi terdaftar"
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

                {/* Field 3: Seksi Operasional Dropdown */}
                <div className="bpn-form-group">
                  <label htmlFor="seksi" className="bpn-label">
                    Penugasan Seksi Operasional
                  </label>
                  <select
                    id="seksi"
                    name="seksi"
                    className="bpn-select"
                    value={seksi}
                    onChange={(e) => setSeksi(e.target.value)}
                  >
                    <option value="hak">Seksi Penetapan Hak &amp; Pendaftaran (PHP)</option>
                    <option value="survei">Seksi Survei &amp; Pemetaan (Kadastral)</option>
                    <option value="sengketa">Seksi Pengendalian &amp; Penanganan Sengketa</option>
                    <option value="tu">Subbagian Tata Usaha (Loket / Front Office)</option>
                    <option value="admin">Administrator Sistem &amp; Verifikator TI</option>
                  </select>
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
                    <span>Ingat sesi di komputer kantor ini</span>
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
                      Memverifikasi Kredensial...
                    </span>
                  ) : (
                    <>
                      <span>Masuk ke Sistem Pantau</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Divider Alternatif */}
                <div className="bpn-divider-box">
                  <div className="bpn-divider-line"></div>
                  <span className="bpn-divider-text">Otentikasi Alternatif</span>
                </div>

                {/* Tombol SSO KKP / Intranet BPN */}
                <button
                  type="button"
                  className="bpn-sso-btn"
                  onClick={() => setShowSsoNotice(true)}
                >
                  <KeyRound size={15} className="bpn-sso-icon" />
                  <span>Login Terintegrasi SSO KKP / Intranet BPN</span>
                </button>
              </form>

              {/* Footnote Keamanan TLS 1.3 */}
              <div className="bpn-card-footnote">
                <span className="bpn-tls-status">
                  <CheckCircle2 size={13} className="bpn-tls-icon" />
                  TLS 1.3 / Enkripsi 256-bit Aktif
                </span>
                <span className="bpn-build-tag">Build v3.4.1</span>
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
              © 2026 Kantor Pertanahan Kota Tangerang Selatan — Kementerian Agraria dan Tata Ruang / BPN RI.
            </p>
            <p className="bpn-footer-warning">
              Perhatian: Sistem ini hanya diperuntukkan bagi personel berwenang. Akses tidak sah merupakan pelanggaran UU ITE No. 11/2008.
            </p>
          </div>

          <div className="bpn-footer-right">
            <button
              type="button"
              className="bpn-footer-link-btn"
              onClick={() => setShowForgotModal(true)}
            >
              Bantuan Tata Usaha &amp; IT
            </button>
            <span className="bpn-footer-dot">•</span>
            <span className="bpn-footer-node">
              <Server size={12} style={{ display: 'inline', marginRight: 4 }} />
              Node: <strong>SRV-TGS-QNAP01</strong>
            </span>
            <span className="bpn-footer-dot">•</span>
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
          MODALS & INTERACTIVE POPUPS (SOP, Lupa Sandi, SSO)
         ========================================================================= */}
      {/* Modal SOP */}
      {showSopModal && (
        <div className="bpn-modal-overlay" onClick={() => setShowSopModal(false)}>
          <div className="bpn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bpn-modal-header">
              <div className="bpn-modal-title-group">
                <HelpCircle size={20} color="#1D4ED8" />
                <h3>Panduan Singkat SOP Pantau Berkas</h3>
              </div>
              <button
                type="button"
                className="bpn-modal-close"
                onClick={() => setShowSopModal(false)}
                aria-label="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bpn-modal-body">
              <div className="bpn-sop-item">
                <span className="bpn-sop-num">1</span>
                <div>
                  <strong>Alur K1 (Berkas Rutin Pelayanan):</strong>
                  <p>Loket TU (Pendaftaran) &rarr; Pengukuran Kadastral &rarr; Penetapan Hak (PHP) &rarr; Kasubag TU &rarr; Selesai / Arsip Warkah.</p>
                </div>
              </div>
              <div className="bpn-sop-item">
                <span className="bpn-sop-num">2</span>
                <div>
                  <strong>Alur K2 (Berkas Sengketa / Prioritas):</strong>
                  <p>Loket TU &rarr; Seksi Sengketa / Konflik &rarr; Kepala Kantor &rarr; Penyerahan Kembali.</p>
                </div>
              </div>
              <div className="bpn-sop-item">
                <span className="bpn-sop-num">3</span>
                <div>
                  <strong>Wajib Pindai QR Code:</strong>
                  <p>Setiap perpindahan berkas fisik antar meja/seksi wajib dipindai via menu <em>Scan QR</em> untuk validasi rantai serah terima dan SLA waktu kerja.</p>
                </div>
              </div>
            </div>
            <div className="bpn-modal-footer">
              <button
                type="button"
                className="bpn-modal-btn-primary"
                onClick={() => setShowSopModal(false)}
              >
                Mengerti &amp; Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lupa Sandi */}
      {showForgotModal && (
        <div className="bpn-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="bpn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bpn-modal-header">
              <div className="bpn-modal-title-group">
                <KeyRound size={20} color="#D97706" />
                <h3>Pemulihan Kata Sandi Akun</h3>
              </div>
              <button
                type="button"
                className="bpn-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="bpn-modal-body">
              <p>Demi standar kepatuhan keamanan data sertipikat Kantah Kota Tangerang Selatan, reset sandi akun dilakukan terpusat.</p>
              <div className="bpn-help-box">
                <p><strong>Kontak Petugas Helpdesk IT Kantah Tangsel:</strong></p>
                <p>• Ruang Server &amp; Pengolahan Data (Lantai 2)</p>
                <p>• Saluran Telepon Internal: Ext. 214 (Subbag Tata Usaha)</p>
                <p>• Email Resmi: <em>kantah-tangsel@atrbpn.go.id</em></p>
              </div>
            </div>
            <div className="bpn-modal-footer">
              <button
                type="button"
                className="bpn-modal-btn-primary"
                onClick={() => setShowForgotModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal SSO Notice */}
      {showSsoNotice && (
        <div className="bpn-modal-overlay" onClick={() => setShowSsoNotice(false)}>
          <div className="bpn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bpn-modal-header">
              <div className="bpn-modal-title-group">
                <Shield size={20} color="#1D4ED8" />
                <h3>Otentikasi Terpusat SSO KKP BPN</h3>
              </div>
              <button
                type="button"
                className="bpn-modal-close"
                onClick={() => setShowSsoNotice(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="bpn-modal-body">
              <p>Otentikasi terintegrasi SSO KKP RI (Komputerisasi Kantor Pertanahan) hanya dapat diakses melalui:</p>
              <ul className="bpn-modal-list">
                <li>Jaringan kabel LAN resmi Kantor Pertanahan Kota Tangerang Selatan</li>
                <li>Atau VPN Resmi Kementerian ATR/BPN</li>
              </ul>
              <p className="bpn-modal-muted">Jika Anda sedang bertugas di luar intranet kantor, silakan gunakan login kredensial NIP &amp; sandi lokal di form utama.</p>
            </div>
            <div className="bpn-modal-footer">
              <button
                type="button"
                className="bpn-modal-btn-primary"
                onClick={() => setShowSsoNotice(false)}
              >
                Kembali ke Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCOPED STYLES (100% Offline, Pixel-Perfect, Light & Dark Responsive)
         ========================================================================= */}
      <style>{`
        /* Root Wrapper & Pola Latar Belakang (gov-pattern) */
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

        /* Mode Terang (Default Government White / Slate) */
        .bpn-theme-light {
          background-color: #F8FAFC;
          background-image: radial-gradient(#CBD5E1 0.75px, transparent 0.75px), radial-gradient(#E2E8F0 0.75px, #F8FAFC 0.75px);
          background-size: 30px 30px;
          background-position: 0 0, 15px 15px;
          color: #0F172A;
        }

        /* Mode Gelap (BPN Dark / Deep Navy Slate) */
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
          border-radius: 8px;
          background: #0B2545;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .bpn-seal-icon {
          width: 22px;
          height: 22px;
          color: #F59E0B;
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
          font-size: 0.85rem;
          font-weight: 700;
          color: #0F172A;
          letter-spacing: -0.01em;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bpn-theme-dark .bpn-kantah-title {
          color: #F8FAFC;
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

        .bpn-header-tools {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .bpn-hours-pill {
          display: none;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 6px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          color: #475569;
        }
        @media (min-width: 900px) {
          .bpn-hours-pill {
            display: flex;
          }
        }
        .bpn-theme-dark .bpn-hours-pill {
          background: rgba(15, 23, 42, 0.6);
          border-color: rgba(255, 255, 255, 0.12);
          color: #CBD5E1;
        }
        .bpn-pill-icon {
          color: #94A3B8;
        }

        .bpn-header-btn {
          width: auto !important;
          max-width: fit-content !important;
          display: none !important;
          align-items: center !important;
          gap: 5px !important;
          background: transparent !important;
          border: none !important;
          color: #475569 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          padding: 6px 8px !important;
          border-radius: 6px !important;
          transition: color 0.15s, background-color 0.15s !important;
        }
        @media (min-width: 768px) {
          .bpn-header-btn {
            display: inline-flex !important;
          }
        }
        .bpn-theme-dark .bpn-header-btn {
          color: #CBD5E1 !important;
        }
        .bpn-header-btn:hover {
          color: #1D4ED8 !important;
          background: rgba(29, 78, 216, 0.08) !important;
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
          .bpn-main-container {
            grid-template-columns: 1fr;
            gap: 2rem;
            max-width: 480px;
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
          padding: 2rem 2.25rem;
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
            padding: 1.5rem 1.25rem;
          }
        }

        .bpn-card-header {
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 1.15rem;
          margin-bottom: 1.25rem;
        }
        .bpn-theme-dark .bpn-card-header {
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }
        .bpn-mobile-seal {
          display: none;
          margin-bottom: 0.75rem;
        }
        @media (max-width: 960px) {
          .bpn-mobile-seal {
            display: inline-flex;
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
          font-size: 0.78rem;
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
          margin-bottom: 1rem;
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
          gap: 1.05rem;
        }

        .bpn-form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .bpn-label {
          font-size: 0.76rem;
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
          font-size: 0.74rem !important;
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
          left: 12px;
          pointer-events: none;
          color: #94A3B8;
        }

        .bpn-input {
          width: 100%;
          height: 42px;
          padding: 0 12px 0 38px;
          border-radius: 8px;
          font-size: 0.86rem;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }
        .bpn-theme-light .bpn-input {
          background-color: #F8FAFC;
          border: 1px solid #CBD5E1;
          color: #0F172A;
        }
        .bpn-theme-light .bpn-input:focus {
          background-color: #FFFFFF;
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15);
        }
        .bpn-theme-dark .bpn-input {
          background-color: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #F8FAFC;
        }
        .bpn-theme-dark .bpn-input:focus {
          background-color: rgba(15, 23, 42, 0.95);
          border-color: #38BDF8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }
        .bpn-input::placeholder {
          color: #94A3B8;
          opacity: 0.8;
        }

        .bpn-eye-toggle {
          width: auto !important;
          max-width: fit-content !important;
          position: absolute;
          right: 10px;
          background: transparent !important;
          border: none !important;
          color: #94A3B8 !important;
          cursor: pointer !important;
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 4px !important;
        }
        .bpn-eye-toggle:hover {
          color: #1D4ED8 !important;
        }
        .bpn-theme-dark .bpn-eye-toggle:hover {
          color: #38BDF8 !important;
        }

        .bpn-select {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          cursor: pointer;
        }
        .bpn-theme-light .bpn-select {
          background-color: #F8FAFC;
          border: 1px solid #CBD5E1;
          color: #1E293B;
        }
        .bpn-theme-light .bpn-select:focus {
          border-color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15);
        }
        .bpn-theme-dark .bpn-select {
          background-color: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #F8FAFC;
        }
        .bpn-theme-dark .bpn-select:focus {
          border-color: #38BDF8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }
        .bpn-theme-dark .bpn-select option {
          background-color: #0B172D;
          color: #F8FAFC;
        }

        .bpn-remember-row {
          display: flex;
          align-items: center;
          padding: 2px 0;
        }
        .bpn-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.77rem;
          cursor: pointer;
          user-select: none;
        }
        .bpn-theme-light .bpn-checkbox-label {
          color: #475569;
        }
        .bpn-theme-dark .bpn-checkbox-label {
          color: #CBD5E1;
        }
        .bpn-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          accent-color: #0B2545;
          cursor: pointer;
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
          font-size: 0.88rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          transition: transform 0.15s, background-color 0.15s, box-shadow 0.15s !important;
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

        /* Divider Alternatif */
        .bpn-divider-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0.4rem 0;
        }
        .bpn-divider-line {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
        }
        .bpn-divider-line::before {
          content: '';
          width: 100%;
          border-top: 1px solid #E2E8F0;
        }
        .bpn-theme-dark .bpn-divider-line::before {
          border-top-color: rgba(255, 255, 255, 0.1);
        }
        .bpn-divider-text {
          position: relative;
          padding: 0 8px;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .bpn-theme-light .bpn-divider-text {
          background: #FFFFFF;
          color: #94A3B8;
        }
        .bpn-theme-dark .bpn-divider-text {
          background: #0B172D;
          color: #64748B;
        }

        /* Tombol SSO */
        .bpn-sso-btn {
          width: 100% !important;
          height: 40px;
          border-radius: 8px !important;
          font-size: 0.77rem !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          transition: background-color 0.15s, border-color 0.15s !important;
        }
        .bpn-theme-light .bpn-sso-btn {
          background: #FFFFFF !important;
          border: 1px solid #CBD5E1 !important;
          color: #334155 !important;
        }
        .bpn-theme-light .bpn-sso-btn:hover {
          background: #F8FAFC !important;
          border-color: #94A3B8 !important;
        }
        .bpn-theme-dark .bpn-sso-btn {
          background: rgba(15, 23, 42, 0.75) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #E2E8F0 !important;
        }
        .bpn-theme-dark .bpn-sso-btn:hover {
          background: rgba(30, 41, 59, 0.85) !important;
          border-color: #38BDF8 !important;
        }
        .bpn-sso-icon {
          color: #D97706;
        }

        /* Footnote Card */
        .bpn-card-footnote {
          margin-top: 1.15rem;
          padding-top: 0.9rem;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.7rem;
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
        .bpn-build-tag {
          font-family: monospace;
          color: #94A3B8;
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
          font-size: 0.74rem;
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

        .bpn-footer-warning {
          font-size: 0.69rem;
          margin: 0;
        }
        .bpn-theme-light .bpn-footer-warning {
          color: #94A3B8;
        }
        .bpn-theme-dark .bpn-footer-warning {
          color: #64748B;
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
          font-size: 0.73rem !important;
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

        /* ==================== 4. MODALS ==================== */
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
          max-width: 500px;
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
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .bpn-modal-body p {
          margin: 0;
        }
        .bpn-sop-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .bpn-sop-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #EFF6FF;
          color: #1D4ED8;
          font-weight: 700;
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .bpn-theme-dark .bpn-sop-num {
          background: rgba(29, 78, 216, 0.3);
          color: #93C5FD;
        }

        .bpn-help-box {
          padding: 12px;
          border-radius: 8px;
          font-size: 0.8rem;
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

        .bpn-modal-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.8rem;
          line-height: 1.6;
        }
        .bpn-modal-muted {
          font-size: 0.75rem;
          color: #64748B;
        }
        .bpn-theme-dark .bpn-modal-muted {
          color: #94A3B8;
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
          padding: 8px 16px !important;
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
