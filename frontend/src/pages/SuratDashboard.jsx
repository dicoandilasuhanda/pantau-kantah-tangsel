import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Mail, MailPlus, Search, FileText, QrCode, Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function SuratDashboard() {
  const [suratList, setSuratList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuratQr, setSelectedSuratQr] = useState(null);
  const [clientIp, setClientIp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurat();
    api.get('/my-ip').then(res => {
      if (res.data?.ip) setClientIp(res.data.ip);
    }).catch(() => {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => { if (data.ip) setClientIp(data.ip); })
        .catch(() => {});
    });
  }, []);

  const fetchSurat = async () => {
    try {
      const response = await api.get('/surat');
      setSuratList(response.data);
    } catch {
      toast.error('Gagal mengambil data surat');
    } finally {
      setLoading(false);
    }
  };

  const filteredSurat = suratList.filter(s => 
    s.nomor_agenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.asal_surat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || '/api';
  };

  // Generate secure URL with token for authenticated PDF access
  const getSecureFileUrl = (filePath) => {
    if (!filePath) return '#';
    const baseUrl = getApiBaseUrl();
    const token = localStorage.getItem('token') || '';
    const filename = filePath.split('/').pop();
    return `${baseUrl}/surat/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  };

  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  return (
    <div className="container animate-fade-in dashboard-container print-container" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box', paddingBottom: '3rem' }}>
      {/* Tampilan Cetak Khusus QR Surat (100% Identik dengan Format Cetak Berkas) */}
      {selectedSuratQr && (
        <div className="print-only-slip qr-result-panel">
          <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
              Kantor Pertanahan Kota Tangerang Selatan
            </p>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              Pantau<span style={{ color: '#1D4ED8' }}>.Kantah Tangsel</span>
            </h4>
          </div>

          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #ccc', display: 'inline-block' }}>
            <QRCodeSVG value={`SURAT:${selectedSuratQr.nomor_agenda}`} size={200} />
          </div>

          <p style={{ fontWeight: 'bold', marginBottom: '0.35rem' }}>No. Agenda: {selectedSuratQr.nomor_agenda}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>No. Surat: {selectedSuratQr.nomor_surat}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Asal: {selectedSuratQr.asal_surat}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Perihal: {selectedSuratQr.perihal}</p>
          {(() => {
            const displayIp = selectedSuratQr.client_ip || clientIp;
            return displayIp ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.02em', marginTop: '0.25rem' }}>
                IP: {displayIp}
              </p>
            ) : null;
          })()}
        </div>
      )}

      <div className="screen-only-details">
        {/* Page Header - Identik dengan Monitoring Berkas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            padding: '0.55rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1D4ED8'
          }}>
            <Mail size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Monitoring Surat
            </h1>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Daftar surat masuk dan arsip digital
            </p>
          </div>
        </div>
        {(userRoles.includes('Administrator') || userRoles.includes('Petugas Entry Surat')) && (
          <button
            onClick={() => navigate('/surat/entry')}
            style={{ width: 'auto', fontSize: '0.82rem', padding: '0.5rem 1rem', height: '38px' }}
          >
            <MailPlus size={16} /> Entry Surat Baru
          </button>
        )}
      </div>

      {/* Search Bar - Identik dengan Monitoring Berkas */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '440px', width: '100%' }}>
          <Search style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} size={16} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Nomor Agenda, Asal Surat, atau Perihal..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '2.5rem',
              paddingRight: '0.85rem',
              marginBottom: 0,
              width: '100%',
              background: 'var(--surface-card)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              height: '38px',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      <div className="glass-panel table-responsive-wrapper" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="skeleton-box" style={{ height: '48px', marginBottom: '0.75rem' }}></div>
            ))}
          </div>
        ) : filteredSurat.length === 0 ? (
          <div className="empty-state-card" style={{ padding: '3.5rem 1rem' }}>
            <FileText size={44} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)', fontSize: '1.05rem' }}>Tidak ada data surat</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {searchTerm ? `Tidak ditemukan surat dengan kata kunci "${searchTerm}".` : 'Belum ada surat masuk yang tercatat di sistem.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <th className="table-sticky-col" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap', fontWeight: 600 }}>No. Agenda</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Asal Surat</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Nomor Surat</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Tgl Diterima</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Perihal</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Posisi / Status</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Berkas</th>
              </tr>
            </thead>
            <tbody>
              {filteredSurat.map((surat) => {
                const pos = surat.current_location || 'Petugas Entry Surat';
                const isDone = pos === 'Selesai';
                const isClosed = pos === 'Ditutup';
                const posLabel = (!isDone && !isClosed && surat.is_transit === 1)
                  ? `Sedang Transit ke ${surat.transit_to_fullname || surat.transit_to_username}`
                  : pos;
                return (
                <tr 
                  key={surat.id} 
                  onClick={() => navigate(`/surat/detail/${surat.id}`)}
                  title="Klik untuk melihat detail & riwayat perjalanan surat"
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.85rem' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="table-sticky-col" style={{ padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="badge" style={{ cursor: 'pointer', fontSize: '0.76rem' }}>{surat.nomor_agenda}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setSelectedSuratQr(surat); }}
                        title="Lihat / Cetak QR Code Surat"
                        style={{ padding: '0.2rem 0.45rem', width: 'auto', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--primary-color)', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <QrCode size={13} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 600, fontSize: '0.86rem' }}>{surat.asal_surat}</td>
                  <td style={{ padding: '0.8rem 1rem', fontSize: '0.84rem' }}>{surat.nomor_surat}</td>
                  <td style={{ padding: '0.8rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{surat.tanggal_diterima}</td>
                  <td style={{ padding: '0.8rem 1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84rem' }}>
                    {surat.perihal}
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }}>
                    <span 
                      className="badge" 
                      style={{ 
                        fontSize: '0.76rem',
                        background: isDone ? 'rgba(16, 185, 129, 0.15)' : (isClosed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.12)'),
                        color: isDone ? '#10b981' : (isClosed ? '#ef4444' : 'var(--primary-color)')
                      }}
                    >
                      {posLabel}
                    </span>
                    {surat.latest_scan_info && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {surat.latest_scan_info}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.8rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                    {surat.file_path ? (
                      <a 
                        href={getSecureFileUrl(surat.file_path)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        <FileText size={15} /> Buka PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>-</span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {/* Modal Cetak & Lihat QR Code Surat */}
      {selectedSuratQr && (
        <div 
          className="no-print"
          onClick={() => setSelectedSuratQr(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-card, #FFFFFF)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                QR Code Agenda Surat
              </span>
              <button 
                type="button" 
                className="secondary" 
                onClick={() => setSelectedSuratQr(null)}
                style={{ padding: '0.25rem', width: 'auto', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Print Slip Layout */}
            <div className="qr-result-panel" style={{ margin: '0 auto 1.5rem', padding: '1rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#0F172A' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px 0' }}>
                  Kantor Pertanahan Kota Tangerang Selatan
                </p>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Pantau<span style={{ color: '#1D4ED8' }}>.Kantah Tangsel</span>
                </h4>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'inline-block', marginBottom: '0.75rem' }}>
                <QRCodeSVG value={`SURAT:${selectedSuratQr.nomor_agenda}`} size={180} />
              </div>

              <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: '0 0 0.35rem 0', color: '#0F172A' }}>
                No. Agenda: {selectedSuratQr.nomor_agenda}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.25rem 0' }}>
                No. Surat: {selectedSuratQr.nomor_surat}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#0F172A', margin: '0 0 0.25rem 0' }}>
                Asal: {selectedSuratQr.asal_surat}
              </p>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 0.35rem 0' }}>
                Perihal: {selectedSuratQr.perihal}
              </p>
              {(() => {
                const displayIp = selectedSuratQr.client_ip || clientIp;
                return displayIp ? (
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.35rem 0 0 0', letterSpacing: '0.02em' }}>
                    IP: {displayIp}
                  </p>
                ) : null;
              })()}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  document.title = 'Pantau.Kantah Tangsel';
                  window.print();
                }}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
              >
                <Printer size={16} /> Cetak Slip QR
              </button>
              <button 
                type="button" 
                className="secondary"
                onClick={() => setSelectedSuratQr(null)}
                style={{ width: 'auto', padding: '0.6rem 1rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Stylesheet Khusus Halaman Ini */}
      <style>{`
        @media screen {
          .print-only-slip {
            display: none !important;
          }
        }

        @media print {
          header, nav, footer, .no-print, .screen-only-details {
            display: none !important;
          }

          @page {
            size: auto;
            margin: 6mm;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }

          .print-only-slip {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            text-align: center !important;
          }

          .print-only-slip p, .print-only-slip span, 
          .print-only-slip h1, .print-only-slip h2, 
          .print-only-slip h3, .print-only-slip h4 {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
