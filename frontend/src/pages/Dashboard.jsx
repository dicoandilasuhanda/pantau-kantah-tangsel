import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, FileText, AlertTriangle, BarChart2 } from 'lucide-react';
import { getWorkingDays, calculateTotalElapsedDays, getStatusColor, SOP_DAYS } from '../utils/dateUtils';

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

  const isMyLocation = (file) => {
    return (file.latest_scanned_by_username === username && file.is_transit !== 1) || (file.is_transit == 1 && file.transit_to_username === username);
  };

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
  }, [files, roleStr, username]);

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
  }, [files, roleStr, username]);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (filterType === 'Tugas Saya') {
      result = result.filter(f => (isMyLocation(f) || (f.is_transit == 1 && f.transit_to_username === localStorage.getItem('username'))) && f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
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
  }, [files, searchQuery, filterType, roleStr, username]);

  const metrics = dashboardData;

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
      {/* Inject Global Grid Background seperti di Login.jsx */}
      <style>{`
        body, #root, .app-container {
          background-color: #060913 !important;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.16) 0%, transparent 45%),
            radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 45%) !important;
          background-size: 40px 40px, 40px 40px, 100% 100%, 100% 100% !important;
          background-attachment: fixed !important;
        }
      `}</style>

      {/* Main Content Container */}
      <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 5, paddingBottom: '3.5rem' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.1) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              padding: '0.65rem',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              boxShadow: '0 6px 14px -3px rgba(59, 130, 246, 0.2)'
            }}>
              <BarChart2 size={24} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Monitoring Berkas
            </h1>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Card 1: Total Berkas Aktif */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>Total Berkas Aktif</span>
            <strong style={{ fontSize: '2rem', color: '#ffffff', lineHeight: 1.1 }}>{metrics.activeFiles}</strong>
          </div>

          {/* Card 2: Melewati SOP (Terlambat) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>Melewati SOP (Terlambat)</span>
            <strong style={{ fontSize: '2rem', color: '#ef4444', lineHeight: 1.1 }}>{metrics.overdueFiles}</strong>
          </div>

          {/* Card 3: Menunggu di Meja Saya */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #10b981',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>Menunggu di Meja Saya</span>
            <strong style={{ fontSize: '2rem', color: '#ffffff', lineHeight: 1.1 }}>{metrics.myFiles}</strong>
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            {['Semua', 'Tugas Saya', 'Terlambat', 'Transit', 'Selesai'].map(type => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    width: 'auto',
                    padding: '0.5rem 1.4rem',
                    borderRadius: '9999px',
                    border: isActive ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.09)',
                    background: isActive 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(12px)',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: isActive ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    margin: 0
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
              position: 'absolute',
              left: '1.1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Cari Berkas, Pemohon, Kegiatan, atau Petugas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '2.85rem',
                marginBottom: 0,
                width: '100%',
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '12px',
                color: '#f8fafc',
                height: '46px',
                fontSize: '0.9rem'
              }}
            />
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
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0 }}>
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
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0 }}>
                Anda memiliki <strong>{stalledFiles.length} berkas</strong> yang sudah berada di posisi Anda (<strong>{roleStr}</strong>) selama 3 hari kerja atau lebih. Mohon segera ditindaklanjuti.
              </p>
            </div>
          </div>
        )}

        {/* File List */}
        {loading ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '3rem',
            color: '#94a3b8'
          }}>
            <p style={{ margin: 0 }}>Memuat data berkas...</p>
          </div>
        ) : files.length === 0 ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '3.5rem 2rem'
          }}>
            <FileText size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, color: '#e2e8f0' }}>Belum ada berkas yang terdaftar</h3>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '3.5rem 2rem'
          }}>
            <Search size={48} color="#64748b" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.4rem 0', color: '#e2e8f0' }}>Berkas tidak ditemukan</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Coba gunakan kata kunci pencarian atau tab filter yang lain.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
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

              return (
                <div
                  key={file.id}
                  onClick={() => navigate(`/file/${file.qr_code}`)}
                  onMouseEnter={() => setHoveredFileId(file.id)}
                  onMouseLeave={() => setHoveredFileId(null)}
                  style={{
                    cursor: 'pointer',
                    background: isHovered ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(16px)',
                    border: isHovered ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 12px 28px -6px rgba(0, 0, 0, 0.45)' : '0 6px 20px -4px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Left Side: File Info */}
                  <div>
                    <h3 style={{ margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.1rem', color: '#ffffff' }}>
                      <FileText size={19} color="#3b82f6" /> {file.nomor_berkas} / {file.tahun_berkas}
                    </h3>
                    <p style={{ fontSize: '0.9rem', margin: '0 0 0.25rem 0', color: '#e2e8f0', fontWeight: '500' }}>
                      {file.nama_kegiatan}
                    </p>
                    <p style={{ fontSize: '0.84rem', margin: 0, color: '#94a3b8' }}>
                      Pemohon: {file.nama_pemohon}
                    </p>
                  </div>

                  {/* Right Side: Location & SLA Status */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                      <MapPin size={15} color={isTransit ? '#f59e0b' : '#10b981'} />
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        background: isTransit ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.14)',
                        border: isTransit ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.28)',
                        color: isTransit ? '#fbbf24' : '#34d399'
                      }}>
                        {isTransit ? `Sedang Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontSize: '0.85rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                      <span style={{ color: statusColor, fontWeight: '500' }}>
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