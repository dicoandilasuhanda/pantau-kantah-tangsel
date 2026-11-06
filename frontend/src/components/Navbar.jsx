import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Scan, PlusSquare, Key, X, Home, Mail, FileText, Sun, Moon, Menu, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || '';
  const userRoles = role ? role.split(',').map(r => r.trim()) : [];
  const isAdmin = userRoles.includes('Administrator');
  const username = localStorage.getItem('username') || 'Pengguna';

  let fullName = localStorage.getItem('full_name') || localStorage.getItem('fullName') || username;
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (userObj.full_name) fullName = userObj.full_name;
    if (userObj.avatar_url && !localStorage.getItem('avatar_url')) {
      localStorage.setItem('avatar_url', userObj.avatar_url);
    }
  } catch {
    // ignore JSON parse error
  }

  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('avatar_url') || '');
  const [fullNameState, setFullNameState] = useState(fullName);

  useEffect(() => {
    const handleProfileSync = () => {
      setAvatarUrl(localStorage.getItem('avatar_url') || '');
      setFullNameState(localStorage.getItem('full_name') || localStorage.getItem('fullName') || username);
    };
    window.addEventListener('profile-update', handleProfileSync);
    return () => window.removeEventListener('profile-update', handleProfileSync);
  }, [username]);

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
  const isAdminModule = location.pathname.startsWith('/admin');
  const isHubOnlyModule = location.pathname.startsWith('/pdf-tools') || location.pathname.startsWith('/kpi') || location.pathname.startsWith('/profile');

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
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nav-user-pill:hover {
          background: var(--surface-hover);
          border-color: var(--primary-color);
          transform: translateY(-1px);
        }
        [data-theme="dark"] .nav-user-pill:hover {
          border-color: #38BDF8;
        }
        .nav-user-pill:hover .nav-user-name {
          color: var(--primary-color);
        }
        [data-theme="dark"] .nav-user-pill:hover .nav-user-name {
          color: #38BDF8;
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
          white-space: nowrap;
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
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
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
          max-width: 100vw !important;
          height: 56px !important;
          z-index: 1000 !important;
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          flex-wrap: nowrap !important;
          padding: 0 1.25rem 0 1rem !important;
          gap: 0.65rem !important;
          overflow: hidden !important;
        }
        .navbar-spacer {
          height: 56px;
          width: 100%;
          flex-shrink: 0;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 1;
          min-width: 0;
        }
        .nav-links a {
          white-space: nowrap;
          padding: 0.4rem 0.65rem !important;
          font-size: 0.84rem !important;
        }
        .nav-right-actions {
          margin-left: auto !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          flex-shrink: 0 !important;
        }
        .nav-mobile-actions-group {
          display: none;
        }
        .nav-sandi-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          font-size: 0.85rem;
          border-radius: 8px;
          white-space: nowrap;
          flex-shrink: 0 !important;
        }
        .nav-logout-btn {
          flex-shrink: 0 !important;
        }
        @media (max-width: 1440px) {
          .navbar-title-full { display: none !important; }
          .navbar-title-short { display: inline !important; }
        }
        @media (max-width: 1260px) {
          .nav-user-pill { display: none !important; }
        }
        @media (max-width: 1080px) {
          .nav-btn-text { display: none !important; }
          .nav-sandi-btn, .nav-logout-btn { padding: 0.45rem 0.65rem !important; }
          .nav-links a { padding: 0.38rem 0.5rem !important; font-size: 0.82rem !important; gap: 0.25rem !important; }
        }
        @media (min-width: 861px) {
          .nav-mobile-right-actions,
          .nav-mobile-user-card,
          .nav-mobile-actions-group {
            display: none !important;
          }
        }
        @media (max-width: 860px) {
          .navbar {
            height: auto !important;
            padding: 0.55rem 0.85rem !important;
            flex-wrap: wrap !important;
            justify-content: space-between !important;
          }
          .navbar-spacer {
            height: 48px;
          }
          .navbar-brand {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .nav-user-pill {
            display: none !important;
          }
          .nav-right-actions {
            display: none !important;
          }
          .nav-mobile-right-actions {
            display: flex !important;
            align-items: center;
            gap: 0.45rem;
          }
          .nav-mobile-toggle {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
          }
          .nav-links {
            display: none !important;
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
            padding-top: 0.75rem !important;
            border-top: 1px solid var(--border-color) !important;
            margin-top: 0.5rem !important;
          }
          .nav-links.mobile-open {
            display: flex !important;
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
            cursor: pointer;
          }
          .nav-mobile-actions-group {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            margin-top: 0.25rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border-color);
            width: 100%;
          }
          .nav-mobile-actions-group button,
          .nav-mobile-actions-group .theme-switch-segmented {
            flex: 1;
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
          <div 
            className="nav-user-pill"
            onClick={() => navigate('/profile')}
            title="Buka Profil & Berkas DWG"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1.5px solid var(--border-color)'
                }}
              />
            ) : (
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
            )}
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span className="nav-user-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2, transition: 'color 0.2s ease' }}>
                {fullNameState}
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
          <div 
            className="nav-mobile-user-card"
            onClick={() => { setMobileMenuOpen(false); navigate('/profile'); }}
            title="Buka Profil & Berkas DWG"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1.5px solid var(--border-color)'
                }}
              />
            ) : (
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
            )}
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {fullNameState}
              </strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {role || 'Petugas'} &bull; <span style={{ color: 'var(--primary-color)' }}>Buka Profil &rarr;</span>
              </span>
            </div>
          </div>

          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Home size={18} /> Hub
          </Link>

          {!isHubOnlyModule && (
            isAdminModule ? (
              isAdmin && (
                <>
                  <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
                    <Shield size={18} /> Admin Panel
                  </Link>
                  <Link to="/admin/users" className={location.pathname === '/admin/users' ? 'active' : ''}>
                    <Users size={18} /> Kelola Akun
                  </Link>
                </>
              )
            ) : isSuratModule ? (
              <>
                <Link to="/surat" className={location.pathname === '/surat' ? 'active' : ''}>
                  <Mail size={18} /> Surat
                </Link>
                <Link to="/surat/scan" className={location.pathname === '/surat/scan' ? 'active' : ''}>
                  <Scan size={18} /> Scan QR Surat
                </Link>
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
            )
          )}

          {/* Mobile Drawer Actions (Hanya muncul di dalam drawer menu pada mobile) */}
          <div className="nav-mobile-actions-group">
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

        {/* Desktop Top-Right Actions: Tetap di atas rapat ke kanan */}
        <div className="nav-right-actions">
          <NotificationBell />

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
            <Key size={15} /> <span className="nav-btn-text">Sandi</span>
          </button>
          
          <button type="button" className="nav-logout-btn" onClick={handleLogout} title="Keluar dari Aplikasi">
            <LogOut size={15} /> <span className="nav-btn-text">Keluar</span>
          </button>
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