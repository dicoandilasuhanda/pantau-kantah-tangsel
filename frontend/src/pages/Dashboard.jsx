import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, FileText, AlertTriangle, BarChart2, CheckCircle2, RotateCcw, Clock, Calendar } from 'lucide-react';
import { getWorkingDays, calculateTotalElapsedDays, getStatusColor, SOP_DAYS } from '../utils/dateUtils';

function formatShortDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(String(dateStr).replace(' ', 'T') + (String(dateStr).includes('Z') || String(dateStr).includes('+') ? '' : 'Z'));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Tugas Saya');
  const [userRole, setUserRole] = useState('');
  const [hoveredFileId, setHoveredFileId] = useState(null);
  const navigate = useNavigate();
  const [transitFiles, setTransitFiles] = useState([]);

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
    
    const fetchFiles = async () => {
      try {
        const response = await api.get('/files');
        setFiles(response.data);
        
        const transitRes = await api.get('/files/my-transits');
        setTransitFiles(transitRes.data);
      } catch (err) {
        console.error("Failed to load files", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const roleStr = userRole;
  const username = localStorage.getItem('username') || '';

  const isMyLocation = useCallback((file) => {
    return (file.latest_scanned_by_username === username && file.is_transit !== 1) || (file.is_transit == 1 && file.transit_to_username === username);
  }, [username]);

  const dashboardData = useMemo(() => {
    const active = files.filter(f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    
    let overdueCount = 0;
    active.forEach(f => {
      const sopDaysTarget = SOP_DAYS[f.nama_kegiatan] || 0;
      if (sopDaysTarget > 0) {
        const totalDaysElapsed = calculateTotalElapsedDays(f);
        if (totalDaysElapsed > sopDaysTarget) {
          overdueCount++;
        }
      }
    });

    const myFiles = active.filter(f => isMyLocation(f));

    return {
      activeFiles: active.length,
      overdueFiles: overdueCount,
      myFiles: myFiles.length,
    };
  }, [files, isMyLocation]);

  const stalledFiles = useMemo(() => {
    if (!roleStr || roleStr.includes('Administrator')) return [];
    
    const active = files.filter(f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    const myFiles = active.filter(f => isMyLocation(f));
    
    return myFiles.filter(f => {
      if (f.current_location === 'Loket Pendaftaran (Entry)' && (f.loket_entry_count || 1) < 2) {
        return false;
      }
      
      const updatedAt = f.updated_at ? f.updated_at : f.created_at;
      const days = getWorkingDays(updatedAt);
      return days >= 3;
    });
  }, [files, roleStr, isMyLocation]);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (filterType === 'Tugas Saya') {
      result = result.filter(f => (isMyLocation(f) || (f.is_transit == 1 && f.transit_to_username === username)) && f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    } else if (filterType === 'Terlambat') {
      result = result.filter(f => {
        const isFinished = f.current_location === 'Selesai' || f.current_location === 'Ditutup';
        if (!isFinished) {
          const sopDaysTarget = SOP_DAYS[f.nama_kegiatan] || 0;
          if (sopDaysTarget > 0) {
            const totalDaysElapsed = calculateTotalElapsedDays(f);
            return totalDaysElapsed > sopDaysTarget;
          }
        }
        return false;
      });
    } else if (filterType === 'Transit') {
      result = result.filter(f => f.is_transit === 1 && f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    } else if (filterType === 'Selesai') {
      result = result.filter(f => f.current_location === 'Selesai');
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(f => 
        (f.nomor_berkas && f.nomor_berkas.toLowerCase().includes(lowerQuery)) ||
        (f.nama_pemohon && f.nama_pemohon.toLowerCase().includes(lowerQuery)) ||
        (f.nama_kegiatan && f.nama_kegiatan.toLowerCase().includes(lowerQuery)) ||
        (f.latest_scan_info && f.latest_scan_info.toLowerCase().includes(lowerQuery))
      );
    }

    return result;
  }, [files, searchQuery, filterType, isMyLocation, username]);

  const metrics = dashboardData;

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
      {/* Inject Global Grid Background & Dashboard Styles */}
      <style>{`
        body, #root, .app-container {
          background-color: var(--bg-color) !important;
          background-image: var(--bg-pattern) !important;
          background-size: 40px 40px, 40px 40px, 100% 100%, 100% 100% !important;
          background-attachment: fixed !important;
        }
        .dash-file-card {
          display: grid;
          grid-template-columns: minmax(220px, 1.4fr) minmax(200px, 1.1fr) minmax(180px, 1fr);
          align-items: center;
          gap: 1.25rem;
        }
        @media (max-width: 860px) {
          .dash-file-card {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .dash-file-card-right {
            align-items: flex-start !important;
            text-align: left !important;
          }
        }
      `}</style>

      {/* Main Content Container */}
      <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 5, paddingBottom: '3rem' }}>
        
        {/* Page Header */}
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
              <BarChart2 size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Monitoring Berkas
            </h1>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {/* Card 1: Total Berkas Aktif */}
          <div style={{
            background: 'var(--surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #1D4ED8',
            borderRadius: '12px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            boxShadow: '0 4px 12px -3px var(--card-shadow)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>Total Berkas Aktif</span>
            <strong style={{ fontSize: '1.65rem', color: 'var(--text-main)', lineHeight: 1.1 }}>{metrics.activeFiles}</strong>
          </div>

          {/* Card 2: Melewati SOP (Terlambat) */}
          <div style={{
            background: 'var(--surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '12px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            boxShadow: '0 4px 12px -3px var(--card-shadow)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>Melewati SOP (Terlambat)</span>
            <strong style={{ fontSize: '1.65rem', color: '#ef4444', lineHeight: 1.1 }}>{metrics.overdueFiles}</strong>
          </div>

          {/* Card 3: Menunggu di Meja Saya */}
          <div style={{
            background: 'var(--surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #10b981',
            borderRadius: '12px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            boxShadow: '0 4px 12px -3px var(--card-shadow)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>Menunggu di Meja Saya</span>
            <strong style={{ fontSize: '1.65rem', color: 'var(--text-main)', lineHeight: 1.1 }}>{metrics.myFiles}</strong>
          </div>
        </div>

        {/* Filter Pills & Search Bar (Compact Toolbar) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap'
        }}>
          {/* Search Input on Left */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '440px' }}>
            <div style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Cari berkas, pemohon, kegiatan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Filter Tabs on Right */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {['Semua', 'Tugas Saya', 'Terlambat', 'Transit', 'Selesai'].map(type => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    width: 'auto',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    border: isActive ? '1px solid rgba(29, 78, 216, 0.6)' : '1px solid var(--border-color)',
                    background: isActive 
                      ? '#1D4ED8' 
                      : 'var(--surface-card)',
                    backdropFilter: 'blur(12px)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    boxShadow: isActive ? '0 2px 8px rgba(29, 78, 216, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    margin: 0,
                    height: '36px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transit Alert Banner */}
        {transitFiles.length > 0 && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '1rem 1.35rem',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <AlertTriangle size={24} color="#34d399" />
            <div>
              <h4 style={{ color: '#34d399', margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>Pemberitahuan: Berkas Dikirim ke Anda</h4>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0 }}>
                Ada <strong>{transitFiles.length} berkas</strong> yang sedang dikirim ke meja Anda dan menunggu untuk di-scan penerimaan.
              </p>
            </div>
          </div>
        )}

        {/* Stalled Files Warning Banner */}
        {stalledFiles.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1rem 1.35rem',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <AlertTriangle size={24} color="#f87171" />
            <div>
              <h4 style={{ color: '#f87171', margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>Peringatan: Berkas Proses Tertahan</h4>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0 }}>
                Anda memiliki <strong>{stalledFiles.length} berkas</strong> yang sudah berada di posisi Anda (<strong>{roleStr}</strong>) selama 3 hari kerja atau lebih. Mohon segera ditindaklanjuti.
              </p>
            </div>
          </div>
        )}

        {/* File List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[1, 2, 3, 4].map(n => (
              <div 
                key={n} 
                style={{
                  background: 'var(--surface-card)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                  <div className="skeleton-box" style={{ width: '180px', height: '22px' }}></div>
                  <div className="skeleton-box" style={{ width: '280px', height: '16px' }}></div>
                  <div className="skeleton-box" style={{ width: '140px', height: '14px' }}></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', width: '140px' }}>
                  <div className="skeleton-box" style={{ width: '100px', height: '26px', borderRadius: '999px' }}></div>
                  <div className="skeleton-box" style={{ width: '80px', height: '14px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state-card">
            <FileText size={48} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Belum ada berkas yang terdaftar</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Berkas baru akan muncul di sini setelah dientri oleh Petugas Entry.</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state-card">
            {filterType === 'Tugas Saya' && !searchQuery ? (
              <>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Semua Berkas Beres! 🎉</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                  Tidak ada berkas yang sedang menunggu tindakan di meja Anda saat ini.
                </p>
              </>
            ) : (
              <>
                <Search size={48} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Berkas tidak ditemukan</h3>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {searchQuery ? `Tidak ada berkas yang cocok dengan pencarian "${searchQuery}".` : `Tidak ada berkas pada kategori "${filterType}".`}
                </p>
                {(searchQuery || filterType !== 'Semua') && (
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterType('Semua'); }}
                    className="secondary"
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
                  >
                    <RotateCcw size={14} /> Reset Filter & Pencarian
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredFiles.map(file => {
              const isDone = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
              const isTransit = !isDone && file.is_transit === 1;
              const updatedAt = file.updated_at ? file.updated_at : file.created_at;
              
              let daysText = '';
              let statusColor = '';

              if (isTransit) {
                daysText = 'Menunggu di-scan penerima';
                statusColor = 'var(--warning-color, #f59e0b)';
              } else if (isDone) {
                const totalDaysTaken = calculateTotalElapsedDays(file, updatedAt);
                daysText = `Diselesaikan dalam ${totalDaysTaken} hari kerja`;
                statusColor = 'var(--success-color, #10b981)';
              } else {
                const daysAtLocation = getWorkingDays(updatedAt);
                statusColor = getStatusColor(daysAtLocation);
                daysText = daysAtLocation === 0 ? 'Baru masuk di posisi ini' : `${daysAtLocation} hari kerja di posisi ini`;
              }

              const isHovered = hoveredFileId === file.id;
              const sopTarget = SOP_DAYS[file.nama_kegiatan];

              return (
                <div
                  key={file.id}
                  onClick={() => navigate(`/file/${file.qr_code}`)}
                  onMouseEnter={() => setHoveredFileId(file.id)}
                  onMouseLeave={() => setHoveredFileId(null)}
                  className="dash-file-card"
                  style={{
                    cursor: 'pointer',
                    background: isHovered ? 'var(--surface-hover)' : 'var(--surface-card)',
                    backdropFilter: 'blur(16px)',
                    border: isHovered ? '1px solid #1D4ED8' : '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    transition: 'all 0.18s ease',
                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 8px 20px -4px var(--card-shadow)' : '0 2px 6px -2px var(--card-shadow)'
                  }}
                >
                  {/* Col 1: Identitas Berkas */}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                      <FileText size={17} color="#1D4ED8" /> {file.nomor_berkas} / {file.tahun_berkas}
                    </h3>
                    <p style={{ fontSize: '0.86rem', margin: '0 0 0.15rem 0', color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.nama_kegiatan}
                    </p>
                    <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Pemohon: {file.nama_pemohon}
                    </p>
                  </div>

                  {/* Col 2 (Bagian Tengah): Timeline & SOP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={13} color="#64748B" />
                      <span>Target SOP: <strong style={{ color: 'var(--text-main)' }}>{sopTarget ? `${sopTarget} Hari Kerja` : 'Tidak Diatur'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={13} color="#64748B" />
                      <span>Masuk: <strong style={{ color: 'var(--text-main)' }}>{formatShortDate(file.created_at)}</strong></span>
                    </div>
                  </div>

                  {/* Col 3: Posisi Meja & Durasi SLA */}
                  <div className="dash-file-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={13} color={isTransit ? '#f59e0b' : '#10b981'} />
                      <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.76rem',
                        fontWeight: '600',
                        background: isTransit ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                        border: isTransit ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(16, 185, 129, 0.25)',
                        color: isTransit ? '#d97706' : '#059669'
                      }}>
                        {isTransit ? `Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0 }} />
                      <span style={{ color: statusColor, fontWeight: '600' }}>
                        {daysText}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}