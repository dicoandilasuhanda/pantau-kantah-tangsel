import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Mail, ArrowRight, Shield, Files, BarChart2, Lightbulb } from 'lucide-react';
import SuggestionModal from '../components/SuggestionModal';

export default function HomeHub() {
  const navigate = useNavigate();
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);
  const isAdmin = userRoles.includes('Administrator');

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

        .hub-container {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 1rem;
          position: relative;
          z-index: 1;
        }

        .hub-floating-saran {
          position: fixed !important;
          bottom: calc(44px + 1.25rem) !important;
          right: 1.5rem !important;
          z-index: 10001 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.65rem !important;
          padding: 0.55rem 1.15rem !important;
          background: var(--surface-card) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid var(--border-color) !important;
          border-radius: 999px !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06) !important;
          color: var(--text-main) !important;
          font-size: 0.84rem;
          font-weight: 500;
          line-height: 1.4 !important;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          white-space: nowrap !important;
          box-sizing: border-box !important;
        }

        .hub-floating-saran:hover {
          transform: translateY(-3px);
          border-color: #f59e0b !important;
          box-shadow: 0 10px 28px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          background: var(--surface-hover) !important;
        }

        .hub-floating-saran-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
        }

        .hub-floating-saran strong {
          color: #1D4ED8;
          font-weight: 700;
        }
        [data-theme="dark"] .hub-floating-saran strong {
          color: #38BDF8;
        }

        @media (min-width: 641px) {
          .hub-floating-saran-short {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .hub-floating-saran {
            bottom: calc(44px + 0.75rem) !important;
            right: 0.75rem !important;
            padding: 0.45rem 0.95rem !important;
            font-size: 0.78rem !important;
            gap: 0.45rem !important;
          }
          .hub-floating-saran-long {
            display: none !important;
          }
          .hub-floating-saran-short {
            display: inline !important;
          }
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

        @media (max-width: 640px) {
          .hub-container {
            padding: 1.5rem 1rem 1.5rem !important;
          }
          .hub-hero {
            margin-bottom: 2rem !important;
          }
        }
      `}</style>

      <div className="hub-container animate-fade-in">
        {/* Hero Header */}
        <div className="hub-hero">
          <h1 className="hub-title">
            Portal Aplikasi Pantau<span className="hub-title-accent">.Kantah Tangsel</span>
          </h1>
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

          {/* Card: Dashboard KPI (Dapat diakses seluruh profil) */}
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
              <div className="hub-card-footer">
                <span>Buka Admin Panel & Pengguna</span>
                <span className="hub-card-arrow">
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Suggestion Button di pojok kanan bawah di atas footer */}
      <button
        type="button"
        onClick={() => setShowSuggestionModal(true)}
        className="hub-floating-saran"
        title="Kirim Ide atau Saran Fitur Baru"
      >
        <span className="hub-floating-saran-icon">
          <Lightbulb size={16} color="#f59e0b" />
        </span>
        <span className="hub-floating-saran-text hub-floating-saran-long">
          Punya Ide pengembangan fitur baru ? <strong>Kirim Saran di Sini &rarr;</strong>
        </span>
        <span className="hub-floating-saran-text hub-floating-saran-short">
          Ide Fitur Baru ? <strong>Kirim Saran &rarr;</strong>
        </span>
      </button>

      <SuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
      />
    </div>
  );
}