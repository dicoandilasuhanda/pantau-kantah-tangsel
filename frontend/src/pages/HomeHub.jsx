import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Mail, Users, LogOut, ArrowRight, Shield, LayoutDashboard, Sun, Moon, Files, BarChart2 } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function HomeHub() {
  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);

  let fullName = localStorage.getItem('full_name') || localStorage.getItem('username') || 'Pengguna';
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (userObj.full_name) fullName = userObj.full_name;
  } catch {
    // ignore JSON parse error
  }

  const isAdmin = userRoles.includes('Administrator');
  const canAccessKpi = isAdmin || userRoles.some(r => r.includes('Koordinator')) || userRoles.some(r => r.includes('Kepala Seksi'));

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const topbarRef = useRef(null);
  const [topbarHeight, setTopbarHeight] = useState(58);

  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const updateHeight = () => {
      if (el.offsetHeight > 0) {
        setTopbarHeight(el.offsetHeight);
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
  }, []);

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

  return (
    <div className="hub-wrapper">
      <style>{`
        .hub-wrapper {
          min-height: 100vh;
          width: 100%;
          background-color: transparent;
          position: relative;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 0 0 5rem 0;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .hub-seal-box {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hub-seal-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
        }

        .hub-container {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 1rem;
          position: relative;
          z-index: 1;
        }

        .hub-topbar {
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
          padding: 0.65rem 1.5rem;
          transition: background-color 0.25s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }

        .hub-topbar-spacer {
          height: 58px;
          width: 100%;
          flex-shrink: 0;
        }

        .hub-topbar-inner {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          box-sizing: border-box;
        }

        .hub-user-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.4rem 0.85rem;
          background: var(--surface-card);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .hub-user-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .hub-logout-btn {
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

        .hub-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: rgba(239, 68, 68, 0.45) !important;
          transform: translateY(-1px);
        }

        .hub-hero {
          text-align: center;
          margin-bottom: 3rem;
        }

        .hub-title {
          font-size: clamp(1.85rem, 3.5vw, 2.65rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--text-main);
          margin-bottom: 0.65rem;
          line-height: 1.2;
        }

        .hub-title-accent {
          color: #1D4ED8;
        }
        [data-theme="dark"] .hub-title-accent {
          color: #38BDF8;
        }

        .hub-subtitle {
          color: var(--text-muted);
          font-size: 0.95rem;
          max-width: 580px;
          margin: 0 auto !important;
          text-align: center;
          line-height: 1.6;
        }

        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          align-items: stretch;
        }

        .hub-card {
          position: relative;
          background: var(--hub-card-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.85rem 1.65rem;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
        }

        .hub-card:hover {
          transform: translateY(-3px);
          border-color: #1D4ED8;
          box-shadow: 0 12px 28px -6px rgba(11, 37, 69, 0.12);
          background: var(--hub-card-hover-bg);
        }
        [data-theme="dark"] .hub-card:hover {
          border-color: #38BDF8;
          box-shadow: 0 14px 32px -8px rgba(0, 0, 0, 0.4);
        }

        .hub-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          color: #1D4ED8;
          margin-bottom: 1.25rem;
          transition: all 0.2s ease;
        }
        [data-theme="dark"] .hub-icon-box {
          background: rgba(29, 78, 216, 0.15);
          border-color: rgba(59, 130, 246, 0.25);
          color: #38BDF8;
        }
        .hub-card:hover .hub-icon-box {
          background: #1D4ED8;
          color: #FFFFFF;
          border-color: #1D4ED8;
        }
        [data-theme="dark"] .hub-card:hover .hub-icon-box {
          background: #1D4ED8;
          color: #FFFFFF;
          border-color: #38BDF8;
        }

        .hub-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 0.22rem 0.65rem;
          border-radius: 6px;
          background: #F1F5F9;
          color: #475569;
          border: 1px solid #E2E8F0;
          margin-bottom: 0.75rem;
          width: fit-content;
        }
        [data-theme="dark"] .hub-card-badge {
          background: rgba(255, 255, 255, 0.06);
          color: #94A3B8;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .hub-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          letter-spacing: -0.015em;
        }

        .hub-card-desc {
          font-size: 0.88rem;
          color: var(--text-muted);
          line-height: 1.55;
          margin-bottom: 1.5rem;
        }

        .hub-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.84rem;
          font-weight: 600;
          color: #1D4ED8;
        }
        [data-theme="dark"] .hub-card-footer {
          color: #38BDF8;
        }

        .hub-card-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #F1F5F9;
          color: #1D4ED8;
          transition: all 0.2s ease;
        }
        [data-theme="dark"] .hub-card-arrow {
          background: rgba(255, 255, 255, 0.08);
          color: #38BDF8;
        }

        .hub-card:hover .hub-card-arrow {
          transform: translateX(3px);
          background: #1D4ED8;
          color: #FFFFFF;
        }
        [data-theme="dark"] .hub-card:hover .hub-card-arrow {
          background: #38BDF8;
          color: #07182D;
        }

        .hub-admin-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .hub-admin-btn {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: #0B2545;
          color: #FFFFFF;
          border: 1px solid #0B2545;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .hub-admin-btn:hover {
          background: #134074;
          border-color: #134074;
          transform: translateY(-1px);
        }
        [data-theme="dark"] .hub-admin-btn {
          background: rgba(29, 78, 216, 0.2);
          color: #93C5FD;
          border-color: rgba(59, 130, 246, 0.35);
        }
        [data-theme="dark"] .hub-admin-btn:hover {
          background: rgba(29, 78, 216, 0.35);
          border-color: #38BDF8;
        }

        .hub-app-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .hub-app-sub {
          font-weight: 700;
          color: #1D4ED8;
        }
        [data-theme="dark"] .hub-app-sub {
          color: #38BDF8;
        }
        .hub-brand-full {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }
        .hub-brand-short {
          display: none;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        @media (max-width: 1024px) {
          .hub-brand-full {
            display: none;
          }
          .hub-brand-short {
            display: inline;
          }
        }

        @media (max-width: 640px) {
          .hub-topbar {
            padding: 0.75rem 1rem;
          }
          .hub-topbar-inner {
            gap: 0.65rem;
          }
          .hub-container {
            padding: 1.75rem 1rem 1.5rem;
          }
          .hub-hero {
            margin-bottom: 2rem;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header ref={topbarRef} className="hub-topbar">
        <div className="hub-topbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="hub-seal-box" title="Kementerian ATR/BPN RI">
              <img src="/logo-atr-bpn.png" alt="Logo Kementerian ATR/BPN" className="hub-seal-img" />
            </div>
            <div>
              <span className="hub-brand-full">
                Kantor Pertanahan Kota Tangerang Selatan
              </span>
              <span className="hub-brand-short">
                Kantah Tangsel
              </span>
              <span style={{ margin: '0 0.35rem', color: 'var(--text-muted)', opacity: 0.5 }}>|</span>
              <span className="hub-app-name">
                Pantau<span className="hub-app-sub">.Kantah Tangsel</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div className="hub-user-badge">
              <span className="hub-user-dot" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fullName}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {roleStr || 'Petugas'}
                </span>
              </div>
            </div>

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

            <NotificationBell />
            <button type="button" onClick={handleLogout} className="hub-logout-btn">
              <LogOut size={15} />
              Keluar
            </button>
          </div>
        </div>
      </header>
      <div className="hub-topbar-spacer" style={{ height: `${topbarHeight}px` }} aria-hidden="true" />

      <div className="hub-container">
        {/* Hero Header */}
        <div className="hub-hero">
          <h1 className="hub-title">
            Portal Aplikasi Pantau<span className="hub-title-accent">.Kantah Tangsel</span>
          </h1>
          <p className="hub-subtitle">
            Silakan pilih modul layanan di bawah ini untuk memulai pemantauan berkas, pengelolaan surat masuk, atau administrasi sistem.
          </p>
        </div>

        {/* Module Grid */}
        <div className="hub-grid">
          {/* Card 1: Monitoring Berkas */}
          <div
            className="hub-card"
            onClick={() => navigate('/berkas')}
          >
            <div>
              <div className="hub-icon-box">
                <FolderKanban size={26} />
              </div>
              <div className="hub-card-badge">Layanan Rutin PNBP</div>
              <h2 className="hub-card-title">Monitoring Berkas</h2>
              <p className="hub-card-desc">
                Pantau posisi berkas permohonan pengukuran, pemetaan, pemecahan, dan riwayat perjalanan berkas secara real-time dengan QR Code.
              </p>
            </div>
            <div className="hub-card-footer">
              <span>Buka Monitoring Berkas</span>
              <span className="hub-card-arrow">
                <ArrowRight size={15} />
              </span>
            </div>
          </div>

          {/* Card 2: Monitoring Surat */}
          <div
            className="hub-card"
            onClick={() => navigate('/surat')}
          >
            <div>
              <div className="hub-icon-box">
                <Mail size={26} />
              </div>
              <div className="hub-card-badge">Administrasi Persuratan</div>
              <h2 className="hub-card-title">Monitoring Surat</h2>
              <p className="hub-card-desc">
                Kelola pencatatan surat masuk, disposisi, agenda pengaduan, serta pemantauan tindak lanjut surat di lingkungan Seksi Survei & Pemetaan.
              </p>
            </div>
            <div className="hub-card-footer">
              <span>Buka Monitoring Surat</span>
              <span className="hub-card-arrow">
                <ArrowRight size={15} />
              </span>
            </div>
          </div>

          {/* Card: Dashboard KPI */}
          {canAccessKpi && (
            <div
              className="hub-card"
              onClick={() => navigate('/kpi')}
            >
              <div>
                <div className="hub-icon-box">
                  <BarChart2 size={26} />
                </div>
                <div className="hub-card-badge">Analitik & KPI</div>
                <h2 className="hub-card-title">Dashboard Kinerja</h2>
                <p className="hub-card-desc">
                  Pantau capaian SLA berkas permohonan, kinerja tindak lanjut persuratan pegawai, tren waktu pemrosesan, serta beban kerja seksi secara menyeluruh.
                </p>
              </div>
              <div className="hub-card-footer">
                <span>Buka Dashboard</span>
                <span className="hub-card-arrow">
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          )}

          {/* Card: PDF Tools (iLovePDF) */}
          <div
            className="hub-card"
            onClick={() => navigate('/pdf-tools')}
          >
            <div>
              <div className="hub-icon-box">
                <Files size={26} />
              </div>
              <div className="hub-card-badge">Utilitas Dokumen</div>
              <h2 className="hub-card-title">PDF Tools Kantah</h2>
              <p className="hub-card-desc">
                Gabungkan berkas PDF, pisahkan halaman, kompresi ukuran, putar orientasi, serta konversi scan gambar ke PDF secara instan dan 100% aman di peramban.
              </p>
            </div>
            <div className="hub-card-footer">
              <span>Buka PDF Tools</span>
              <span className="hub-card-arrow">
                <ArrowRight size={15} />
              </span>
            </div>
          </div>

          {/* Card 3: Admin Panel & Pengguna (Gabungan) */}
          {isAdmin && (
            <div
              className="hub-card"
              onClick={() => navigate('/admin')}
            >
              <div>
                <div className="hub-icon-box">
                  <Shield size={26} />
                </div>
                <div className="hub-card-badge">
                  <Shield size={12} /> Khusus Administrator
                </div>
                <h2 className="hub-card-title">Admin Panel & Pengguna</h2>
                <p className="hub-card-desc">
                  Kelola seluruh berkas permohonan & persuratan sistem, ekspor laporan Excel, penutupan berkas/surat, serta manajemen akun dan hak akses petugas.
                </p>
              </div>
              <div className="hub-admin-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="hub-admin-btn"
                  onClick={() => navigate('/admin')}
                >
                  <LayoutDashboard size={15} />
                  Admin Panel
                </button>
                <button
                  type="button"
                  className="hub-admin-btn"
                  onClick={() => navigate('/admin/users')}
                >
                  <Users size={15} />
                  Kelola Akun
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}