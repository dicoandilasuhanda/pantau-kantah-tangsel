import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Scan, PlusSquare, Key, X, BarChart2, Home, Mail, FileText, Sun, Moon, Menu, Files } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || '';
  const userRoles = role ? role.split(',').map(r => r.trim()) : [];
  const username = localStorage.getItem('username') || 'Pengguna';

  let fullName = localStorage.getItem('full_name') || localStorage.getItem('fullName') || username;
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (userObj.full_name) fullName = userObj.full_name;
  } catch {
    // ignore JSON parse error
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const navRef = useRef(null);
  const [navHeight, setNavHeight] = useState(56);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const updateHeight = () => {
      if (!mobileMenuOpen && el.offsetHeight > 0) {
        setNavHeight(el.offsetHeight);
      }
    };
    updateHeight();
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateHeight);
      observer.observe(el);
    }
    window.addEventListener('resize', updateHeight);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [mobileMenuOpen]);

  // Tutup menu mobile ketika navigasi berpindah
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('full_name');
    localStorage.removeItem('fullName');
    sessionStorage.removeItem('session_active');
    sessionStorage.removeItem('notified_transit_map');
    sessionStorage.removeItem('notif_initial_checked');
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error('Semua kolom harus diisi.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Konfirmasi kata sandi tidak cocok.');
    }

    setSavingPassword(true);
    try {
      await api.put('/users/change-password', { oldPassword, newPassword });
      toast.success('Kata sandi berhasil diubah! Silakan login kembali.');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Otomatis logout
      setTimeout(() => {
        handleLogout();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengubah kata sandi');
    } finally {
      setSavingPassword(false);
    }
  };

  const isSuratModule = location.pathname.startsWith('/surat');

  return (
    <>
      <style>{`
        .navbar-brand-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          white-space: nowrap;
          cursor: default;
          user-select: none;
        }
        .navbar-brand-text {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        .navbar-seal-box {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .navbar-seal-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
        }
        .navbar-title-full {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }
        .navbar-title-short {
          display: none;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .navbar-sep {
          color: var(--text-muted);
          opacity: 0.5;
          font-weight: 400;
        }
        .navbar-app-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .navbar-app-sub {
          font-weight: 700;
          color: #1D4ED8;
        }
        [data-theme="dark"] .navbar-app-sub {
          color: #38BDF8;
        }
        .nav-user-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.4rem 0.85rem;
          background: var(--surface-card);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          user-select: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .nav-logout-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.95rem;
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
          border: 1px solid rgba(239, 68, 68, 0.25) !important;
          border-radius: 8px !important;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nav-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: rgba(239, 68, 68, 0.45) !important;
          transform: translateY(-1px);
        }
        .nav-theme-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.75rem;
          background: var(--surface-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 8px !important;
          color: var(--text-main) !important;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nav-theme-btn:hover {
          background: var(--surface-hover) !important;
          border-color: var(--text-muted) !important;
        }
        @media (max-width: 1366px) {
          .navbar-title-full { display: none; }
          .navbar-title-short { display: inline; }
        }
        .nav-mobile-toggle {
          display: none;
          background: transparent !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 8px;
          padding: 0.45rem !important;
          color: var(--text-main) !important;
          width: auto !important;
          cursor: pointer;
        }
        .navbar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          z-index: 1000 !important;
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          box-sizing: border-box !important;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .navbar-spacer {
          height: 56px;
          width: 100%;
          flex-shrink: 0;
        }
        @media (max-width: 860px) {
          .navbar {
            padding: 0.55rem 0.85rem;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            border-bottom: 1px solid var(--border-color);
            max-width: 100vw;
            width: 100% !important;
            box-sizing: border-box;
          }
          .navbar-spacer {
            height: 48px;
          }
          .navbar-brand {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .nav-user-pill {
            display: none !important; /* Di mobile, profil user dipindah ke dalam drawer menu */
          }
          .nav-mobile-right-actions {
            display: flex;
            align-items: center;
            gap: 0.45rem;
          }
          .nav-mobile-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .nav-links {
            display: none;
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color);
            margin-top: 0.5rem;
          }
          .nav-links.mobile-open {
            display: flex;
            animation: fadeIn 0.2s ease forwards;
          }
          .nav-links a {
            justify-content: flex-start;
            padding: 0.6rem 0.85rem;
            font-size: 0.9rem;
            border-radius: 8px;
            background: var(--surface-card);
            border: 1px solid var(--border-color);
          }
          .nav-mobile-user-card {
            display: flex !important;
            align-items: center;
            gap: 0.75rem;
            padding: 0.65rem 0.85rem;
            background: var(--surface-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 0.25rem;
          }
          .nav-actions-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            margin-top: 0.25rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border-color);
            width: 100%;
          }
          .nav-actions-group button,
          .nav-actions-group .theme-switch-segmented {
            flex: 1;
          }
        }
        .nav-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .nav-sandi-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          font-size: 0.85rem;
          border-radius: 8px;
        }
        @media (min-width: 861px) {
          .nav-mobile-user-card, .mobile-only-notif {
            display: none !important;
          }
        }
        @media (max-width: 860px) {
          .desktop-only-notif {
            display: none !important;
          }
        }
      `}</style>

      <nav ref={navRef} className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-info">
            <div className="navbar-seal-box" title="Kementerian ATR/BPN RI">
              <img src="/logo-atr-bpn.png" alt="Logo Kementerian ATR/BPN" className="navbar-seal-img" />
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-title-full">Kantor Pertanahan Kota Tangerang Selatan</span>
              <span className="navbar-title-short">Kantah Tangsel</span>
              <span className="navbar-sep" style={{ margin: '0 0.35rem' }}>|</span>
              <span className="navbar-app-name">Pantau<span className="navbar-app-sub">.Kantah Tangsel</span></span>
            </div>
          </div>

          {/* Desktop User profile pill */}
          <div className="nav-user-pill">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {fullName}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {role || 'Petugas'}
              </span>
            </div>
          </div>

          {/* Mobile Right Action Bar: Bell Notif + Hamburger Button */}
          <div className="nav-mobile-right-actions">
            <div className="mobile-only-notif">
              <NotificationBell />
            </div>
            <button
              type="button"
              className="nav-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        
        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Mobile-only User Identity Card */}
          <div className="nav-mobile-user-card">
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {fullName}
              </strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {role || 'Petugas'}
              </span>
            </div>
          </div>

          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Home size={18} /> Hub
          </Link>

          {isSuratModule ? (
            <>
              <Link to="/surat" className={location.pathname === '/surat' ? 'active' : ''}>
                <Mail size={18} /> Surat
              </Link>
              {userRoles.includes('Petugas Entry Surat') && (
                <Link to="/surat/entry" className={location.pathname === '/surat/entry' ? 'active' : ''}>
                  <PlusSquare size={18} /> Entri Baru
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/berkas" className={location.pathname === '/berkas' ? 'active' : ''}>
                <FileText size={18} /> Berkas
              </Link>
              
              {(userRoles.includes('Petugas Entry Berkas') || userRoles.includes('Petugas Entry Berkas PHP')) && (
                <Link to="/entry" className={location.pathname === '/entry' ? 'active' : ''}>
                  <PlusSquare size={18} /> Entri Baru
                </Link>
              )}

              <Link to="/scan" className={location.pathname === '/scan' ? 'active' : ''}>
                <Scan size={18} /> Scanner QR
              </Link>
            </>
          )}

          {(userRoles.includes('Administrator') || userRoles.some(r => r.includes('Koordinator')) || userRoles.some(r => r.includes('Kepala Seksi'))) && (
            <Link to="/kpi" className={location.pathname === '/kpi' ? 'active' : ''}>
              <BarChart2 size={18} /> Dashboard
            </Link>
          )}

          <Link to="/pdf-tools" className={location.pathname === '/pdf-tools' ? 'active' : ''}>
            <Files size={18} /> PDF Tools
          </Link>

          {/* Desktop Only Bell Notification */}
          <div className="desktop-only-notif">
            <NotificationBell />
          </div>

          <div className="nav-actions-group">
            <div className="theme-switch-segmented" role="group" aria-label="Pilihan Tema">
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

            <button 
              type="button"
              className="secondary nav-sandi-btn" 
              onClick={() => { setMobileMenuOpen(false); setShowPasswordModal(true); }} 
              title="Ubah Kata Sandi"
            >
              <Key size={15} /> Sandi
            </button>
            
            <button type="button" className="nav-logout-btn" onClick={handleLogout} title="Keluar dari Aplikasi">
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>
      </nav>
      <div className="navbar-spacer" style={{ height: `${navHeight}px` }} aria-hidden="true" />

      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="var(--primary-color)" /> Ubah Kata Sandi
              </h3>
              <button className="secondary" onClick={() => setShowPasswordModal(false)} style={{ width: 'auto', padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Kata Sandi Lama</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
            </div>
            
            <button onClick={handleChangePassword} disabled={savingPassword} style={{ width: '100%' }}>
              {savingPassword ? 'Menyimpan...' : 'Simpan Sandi Baru'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}