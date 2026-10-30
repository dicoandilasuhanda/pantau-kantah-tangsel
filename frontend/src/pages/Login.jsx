import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

// Request Login
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
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true' || getCookie('remember_me') === 'true';
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Matikan scrollbar browser khusus di halaman Login
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
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
        if (userObj.seksi) localStorage.setItem('seksi', userObj.seksi);

        // Pengaturan Ingat Sesi Saya
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
    <div className="login-viewport">
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-bottom-right" />
      <div className="cadastral-grid" />

      <div className="login-container">
        <div className="login-hero">
          <div className="p-status-pill">
            <span className="p-status-dot" />
            <span>Sistem Aktif (Terhubung ke Server QNAP Kantah Tangsel)</span>
          </div>

          <div className="p-brand">
            <div className="p-brand-logo">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="p-brand-title">
              <h1>
                Pantau<span className="p-brand-accent">.Kantah Tangsel</span>
              </h1>
              <p>Sistem Pelacakan & Serah Terima Berkas</p>
            </div>
          </div>

          <div className="p-feature-grid">
            <div className="p-feature-card">
              <div className="p-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="p-feature-info">
                <h4>Pelacakan Posisi Berkas</h4>
                <p>Deteksi berkas seketika di Seksi Penetapan Hak, Pendaftaran, atau Pengukuran.</p>
              </div>
            </div>

            <div className="p-feature-card">
              <div className="p-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="p-feature-info">
                <h4>Serah Terima Digital & QR Code</h4>
                <p>Verifikasi perpindahan fisik dokumen dengan pemindaian barcode & bukti digital.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-card-wrapper">
          <div className="p-card">
            <div className="p-card-header">
              <h2>Masuk ke Akun</h2>
              <p>Akses Terotentikasi Khusus Pegawai Kantah Kota Tangerang Selatan</p>
            </div>

            {error && (
              <div className="p-alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-form">
              <div className="p-field">
                <label htmlFor="username">Username</label>
                <div className="p-input-box">
                  <svg className="p-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="username"
                    type="text"
                    className="p-input-raw"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    required
                    autoFocus={!username}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="p-field">
                <label htmlFor="password">Kata Sandi</label>
                <div className="p-input-box">
                  <svg className="p-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="p-input-raw"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    autoFocus={!!username}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="p-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-options">
                <label className="p-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ingat sesi saya</span>
                </label>
              </div>

              <button type="submit" className="p-btn-submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="p-btn-loader">
                    <span className="p-spinner" /> Memverifikasi...
                  </span>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="p-card-footer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Enkripsi Sesi Aktif</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-viewport {
          position: relative;
          width: 100%;
          height: calc(100vh - 45px);
          max-height: calc(100vh - 45px);
          overflow: hidden;
          background: #090d16;
          color: #f1f5f9;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px;
          box-sizing: border-box;
        }

        .ambient-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(140px);
          pointer-events: none;
          opacity: 0.22;
          z-index: 1;
        }
        .glow-top-left {
          top: -150px;
          left: -150px;
          background: radial-gradient(circle, #0284c7, transparent 70%);
        }
        .glow-bottom-right {
          bottom: -150px;
          right: -150px;
          background: radial-gradient(circle, #38bdf8, transparent 70%);
        }

        .cadastral-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 38px 38px;
          pointer-events: none;
          z-index: 1;
        }

        .login-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1020px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 44px;
          align-items: center;
        }

        .login-hero {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .p-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
          padding: 4px 11px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 500;
        }
        .p-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: pulseDot 2s infinite ease-in-out;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .p-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .p-brand-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .p-brand-title h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #ffffff;
          line-height: 1.15;
        }
        .p-brand-accent {
          color: #38bdf8;
        }
        .p-brand-title p {
          margin: 3px 0 0 0;
          font-size: 0.84rem;
          color: #94a3b8;
          font-weight: 400;
        }

        .p-feature-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 2px;
        }
        .p-feature-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 13px;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          backdrop-filter: blur(8px);
        }
        .p-feature-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .p-feature-info h4 {
          margin: 0 0 2px 0;
          font-size: 0.84rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        .p-feature-info p {
          margin: 0;
          font-size: 0.76rem;
          color: #94a3b8;
          line-height: 1.35;
        }

        .login-card-wrapper {
          display: flex;
          flex-direction: column;
        }

        .p-card {
          position: relative;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(16px);
          overflow: hidden;
        }
        .p-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0284c7, #38bdf8, #818cf8);
        }

        .p-card-header {
          margin-bottom: 16px;
        }
        .p-card-header h2 {
          margin: 0 0 4px 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.015em;
        }
        .p-card-header p {
          margin: 0;
          font-size: 0.81rem;
          color: #94a3b8;
        }

        .p-alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 14px;
        }
        .p-alert-error svg {
          flex-shrink: 0;
          color: #ef4444;
        }

        .p-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .p-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .p-field label {
          font-size: 0.81rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .p-input-box {
          display: flex;
          align-items: center;
          width: 100%;
          height: 42px;
          padding: 0 12px;
          box-sizing: border-box;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .p-input-box:focus-within {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
        }

        .p-input-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          color: #64748b;
          display: block;
        }

        .p-input-raw {
          flex: 1;
          height: 100%;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          color: #f8fafc;
          font-size: 0.9rem;
          padding: 0;
          margin: 0;
          line-height: normal;
          box-shadow: none !important;
        }
        .p-input-raw::placeholder {
          color: #475569;
        }
        .p-input-raw:-webkit-autofill,
        .p-input-raw:-webkit-autofill:hover,
        .p-input-raw:-webkit-autofill:focus,
        .p-input-raw:-webkit-autofill:active {
          -webkit-text-fill-color: #f8fafc !important;
          caret-color: #f8fafc !important;
          -webkit-box-shadow: 0 0 0 1000px #0d1526 inset !important;
          box-shadow: 0 0 0 1000px #0d1526 inset !important;
          transition: background-color 9999s ease-in-out 0s;
          border-radius: 6px;
        }

        .p-eye-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .p-eye-btn:hover {
          color: #38bdf8;
        }
        .p-eye-btn svg {
          width: 18px;
          height: 18px;
          display: block;
          flex-shrink: 0;
        }

        .p-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .p-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.79rem;
          color: #94a3b8;
          cursor: pointer;
          user-select: none;
        }
        .p-checkbox-label input {
          accent-color: #0284c7;
          cursor: pointer;
          width: 14px;
          height: 14px;
          margin: 0;
        }

        .p-btn-submit {
          width: 100%;
          height: 42px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 0 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }
        .p-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
        }
        .p-btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .p-btn-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .p-btn-loader {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .p-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .p-card-footer {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 0.73rem;
          color: #64748b;
          text-align: center;
        }
        .p-card-footer svg {
          color: #0284c7;
          flex-shrink: 0;
        }

        @media (max-width: 860px) {
          .login-viewport {
            height: calc(100vh - 45px);
            max-height: calc(100vh - 45px);
            overflow: hidden;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .login-container {
            grid-template-columns: 1fr;
            gap: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 390px;
          }
          .login-card-wrapper {
            width: 100%;
            order: 1;
          }
          .p-card {
            padding: 20px 18px;
          }
          .login-hero {
            order: 2;
            align-items: center;
            text-align: center;
            width: 100%;
          }
          .p-status-pill {
            margin: 0 auto;
            font-size: 0.72rem;
            padding: 4px 10px;
          }
          .p-brand {
            display: none !important;
          }
          .p-feature-grid {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}