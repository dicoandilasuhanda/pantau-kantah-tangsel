import { useNavigate } from 'react-router-dom';
import { FolderKanban, Mail, Users, LogOut, ArrowRight, Shield, LayoutDashboard } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function HomeHub() {
  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);

  let fullName = localStorage.getItem('full_name') || localStorage.getItem('username') || 'Pengguna';
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (userObj.full_name) fullName = userObj.full_name;
  } catch (e) {
    // ignore JSON parse error
  }

  const isAdmin = userRoles.includes('Administrator');
  const canAccessSurat = isAdmin || userRoles.includes('Petugas Entry Surat');

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
          justify-content: space-between;
          padding: 6.5rem 1.5rem 5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .hub-bg-grid {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(circle at 50% 45%, black 35%, transparent 85%);
          -webkit-mask-image: radial-gradient(circle at 50% 45%, black 35%, transparent 85%);
          pointer-events: none;
          z-index: 0;
        }

        .hub-glow-1 {
          position: fixed;
          top: -10%;
          left: 15%;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }

        .hub-glow-2 {
          position: fixed;
          bottom: 5%;
          right: 12%;
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.13) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }

        .hub-container {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hub-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(6, 9, 19, 0.78);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.85rem 1.5rem;
        }

        .hub-topbar-inner {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .hub-user-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .hub-user-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .hub-logout-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.15rem;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 999px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(12px);
        }

        .hub-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.45);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
        }

        .hub-hero {
          text-align: center;
          margin-bottom: 3rem;
        }

        .hub-title {
          font-size: clamp(1.85rem, 3.5vw, 2.65rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #f8fafc;
          margin-bottom: 0.65rem;
          line-height: 1.2;
        }

        .hub-title-accent {
          background: linear-gradient(135deg, #60a5fa 0%, #38bdf8 55%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hub-subtitle {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 560px;
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
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 2rem 1.75rem;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .hub-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--card-accent, #3b82f6);
          opacity: 0.75;
          transition: height 0.3s ease, opacity 0.3s ease;
        }

        .hub-card:hover {
          transform: translateY(-6px);
          border-color: var(--card-border-hover, rgba(59, 130, 246, 0.45));
          box-shadow: 0 20px 40px -15px var(--card-shadow, rgba(59, 130, 246, 0.25));
          background: rgba(15, 23, 42, 0.82);
        }

        .hub-card:hover::before {
          height: 4px;
          opacity: 1;
        }

        .hub-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--icon-bg, rgba(59, 130, 246, 0.12));
          border: 1px solid var(--icon-border, rgba(59, 130, 246, 0.25));
          color: var(--card-accent, #60a5fa);
          margin-bottom: 1.35rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hub-card:hover .hub-icon-box {
          transform: scale(1.06);
          box-shadow: 0 8px 20px -4px var(--card-shadow, rgba(59, 130, 246, 0.35));
        }

        .hub-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          background: var(--icon-bg, rgba(59, 130, 246, 0.12));
          color: var(--card-accent, #60a5fa);
          border: 1px solid var(--icon-border, rgba(59, 130, 246, 0.25));
          margin-bottom: 0.75rem;
          width: fit-content;
        }

        .hub-card-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 0.55rem;
          letter-spacing: -0.01em;
        }

        .hub-card-desc {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        .hub-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--card-accent, #60a5fa);
        }

        .hub-card-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--icon-bg, rgba(59, 130, 246, 0.12));
          transition: transform 0.25s ease;
        }

        .hub-card:hover .hub-card-arrow {
          transform: translateX(4px);
        }

        .hub-admin-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hub-admin-btn {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.28);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .hub-admin-btn:hover {
          background: rgba(245, 158, 11, 0.24);
          border-color: rgba(245, 158, 11, 0.5);
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .hub-topbar {
            padding: 0.65rem 0.9rem;
          }
          .hub-topbar-inner {
            flex-wrap: nowrap;
            gap: 0.5rem;
          }
          .hub-user-badge {
            flex: 1;
            min-width: 0;
            padding: 0.45rem 0.75rem;
          }
          .hub-logout-btn {
            padding: 0.5rem 0.85rem;
            font-size: 0.8rem;
          }
        }
      `}</style>

      <div className="hub-bg-grid" />
      <div className="hub-glow-1" />
      <div className="hub-glow-2" />

      {/* Top Navigation Bar */}
      <header className="hub-topbar">
        <div className="hub-topbar-inner">
          <div className="hub-user-badge">
            <span className="hub-user-dot" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fullName}
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {roleStr || 'Petugas'}
              </span>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
            <NotificationBell />
            <button onClick={handleLogout} className="hub-logout-btn">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

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
            style={{
              '--card-accent': '#60a5fa',
              '--card-border-hover': 'rgba(59, 130, 246, 0.45)',
              '--card-shadow': 'rgba(59, 130, 246, 0.25)',
              '--icon-bg': 'rgba(59, 130, 246, 0.12)',
              '--icon-border': 'rgba(59, 130, 246, 0.28)'
            }}
          >
            <div>
              <div className="hub-icon-box">
                <FolderKanban size={28} />
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
                <ArrowRight size={16} />
              </span>
            </div>
          </div>

          {/* Card 2: Monitoring Surat */}
          {canAccessSurat && (
            <div
              className="hub-card"
              onClick={() => navigate('/surat')}
              style={{
                '--card-accent': '#34d399',
                '--card-border-hover': 'rgba(16, 185, 129, 0.45)',
                '--card-shadow': 'rgba(16, 185, 129, 0.25)',
                '--icon-bg': 'rgba(16, 185, 129, 0.12)',
                '--icon-border': 'rgba(16, 185, 129, 0.28)'
              }}
            >
              <div>
                <div className="hub-icon-box">
                  <Mail size={28} />
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
                  <ArrowRight size={16} />
                </span>
              </div>
            </div>
          )}

          {/* Card 3: Admin Panel & Pengguna (Gabungan) */}
          {isAdmin && (
            <div
              className="hub-card"
              onClick={() => navigate('/admin')}
              style={{
                '--card-accent': '#fbbf24',
                '--card-border-hover': 'rgba(245, 158, 11, 0.45)',
                '--card-shadow': 'rgba(245, 158, 11, 0.25)',
                '--icon-bg': 'rgba(245, 158, 11, 0.12)',
                '--icon-border': 'rgba(245, 158, 11, 0.28)'
              }}
            >
              <div>
                <div className="hub-icon-box">
                  <Shield size={28} />
                </div>
                <div className="hub-card-badge">
                  <Shield size={12} /> Khusus Administrator
                </div>
                <h2 className="hub-card-title">Admin Panel & Pengguna</h2>
                <p className="hub-card-desc">
                  Kelola seluruh berkas sistem, ekspor laporan Excel, penutupan berkas, serta manajemen akun dan hak akses petugas secara terpusat.
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