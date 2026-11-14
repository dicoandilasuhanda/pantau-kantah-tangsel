import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, AlertTriangle, BarChart2, CheckCircle2, RotateCcw, Send, CheckSquare, Square, X, QrCode, PlusSquare } from 'lucide-react';
import { getWorkingDays, calculateTotalElapsedDays, SOP_DAYS } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import BatchTransitModal from '../components/BatchTransitModal';
import DashboardFileCard from '../components/DashboardFileCard';
import './Dashboard.css';

const VISIBLE_STEP = 50;

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
  const [activeFiles, setActiveFiles] = useState([]);
  const [doneFiles, setDoneFiles] = useState([]);
  const [doneLoaded, setDoneLoaded] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Tugas Saya');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('role') || '');
  const navigate = useNavigate();
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const doneInFlightRef = useRef(false);
  const doneLoadedRef = useRef(false);

  // Batch Handover State
  const [selectedQrCodes, setSelectedQrCodes] = useState([]);
  const [showBatchTransitModal, setShowBatchTransitModal] = useState(false);
  const [batchTransitTarget, setBatchTransitTarget] = useState('');
  const [batchTransitSearch, setBatchTransitSearch] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      if (doneLoadedRef.current) {
        const [activeRes, doneRes] = await Promise.all([
          api.get('/files?scope=active'),
          api.get('/files?scope=done'),
        ]);
        setActiveFiles(Array.isArray(activeRes.data) ? activeRes.data : []);
        setDoneFiles(Array.isArray(doneRes.data) ? doneRes.data : []);
      } else {
        const activeRes = await api.get('/files?scope=active');
        setActiveFiles(Array.isArray(activeRes.data) ? activeRes.data : []);
      }
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureDoneFilesLoaded = useCallback(async () => {
    if (doneLoadedRef.current || doneInFlightRef.current) return;
    doneInFlightRef.current = true;
    setLoadingDone(true);
    try {
      const doneRes = await api.get('/files?scope=done');
      setDoneFiles(Array.isArray(doneRes.data) ? doneRes.data : []);
      doneLoadedRef.current = true;
      setDoneLoaded(true);
    } catch (err) {
      console.error("Failed to load completed files", err);
      toast.error('Gagal memuat daftar berkas selesai');
    } finally {
      doneInFlightRef.current = false;
      setLoadingDone(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (filterType === 'Semua' || filterType === 'Selesai') {
      ensureDoneFilesLoaded();
    }
  }, [filterType, ensureDoneFilesLoaded]);

  useEffect(() => {
    setVisibleCount(VISIBLE_STEP);
  }, [filterType, searchQuery]);

  const roleStr = userRole;
  const username = localStorage.getItem('username') || '';
  const userRoles = useMemo(() => roleStr.split(',').map(r => r.trim()).filter(Boolean), [roleStr]);
  const isAdmin = userRoles.includes('Administrator');

  const files = useMemo(() => {
    if (!doneLoaded) return activeFiles;
    const byId = new Map();
    activeFiles.forEach((f) => byId.set(f.id, f));
    doneFiles.forEach((f) => {
      if (!byId.has(f.id)) byId.set(f.id, f);
    });
    return Array.from(byId.values()).sort((a, b) => {
      const cmp = String(b.created_at || '').localeCompare(String(a.created_at || ''));
      return cmp !== 0 ? cmp : b.id - a.id;
    });
  }, [activeFiles, doneFiles, doneLoaded]);

  const transitFiles = useMemo(() => {
    return activeFiles.filter((f) => f.is_transit === 1 && f.transit_to_username === username);
  }, [activeFiles, username]);

  const isMyLocation = useCallback((file) => {
    return (file.latest_scanned_by_username === username && file.is_transit !== 1) || (file.is_transit == 1 && file.transit_to_username === username);
  }, [username]);

  const canSendFile = useCallback((file) => {
    const isFinished = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
    if (isFinished || file.is_transit === 1) return false;
    return (
      file.latest_scanned_by_username === username ||
      userRoles.some(r => r === 'Petugas Entry Berkas' ? file.current_location === 'Loket Pendaftaran (Entry)' : file.current_location === r) ||
      isAdmin
    );
  }, [username, userRoles, isAdmin]);

  const canCancelTransitFile = useCallback((file) => {
    const isFinished = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
    if (isFinished || file.is_transit !== 1) return false;
    return file.transit_by_username === username || isAdmin;
  }, [username, isAdmin]);

  const isFileSelectable = useCallback((file) => {
    return canSendFile(file) || canCancelTransitFile(file);
  }, [canSendFile, canCancelTransitFile]);

  const dashboardData = useMemo(() => {
    const active = activeFiles.filter(f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    
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
  }, [activeFiles, isMyLocation]);

  const stalledFiles = useMemo(() => {
    if (!roleStr || roleStr.includes('Administrator')) return [];
    
    const active = activeFiles.filter(f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    const myFiles = active.filter(f => isMyLocation(f));
    
    return myFiles.filter(f => {
      if (f.current_location === 'Loket Pendaftaran (Entry)' && (f.loket_entry_count || 1) < 2) {
        return false;
      }
      
      const updatedAt = f.updated_at ? f.updated_at : f.created_at;
      const days = getWorkingDays(updatedAt);
      return days >= 3;
    });
  }, [activeFiles, roleStr, isMyLocation]);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (filterType === 'Tugas Saya') {
      result = activeFiles.filter(f => (isMyLocation(f) || (f.is_transit == 1 && f.transit_to_username === username)) && f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    } else if (filterType === 'Terlambat') {
      result = activeFiles.filter(f => {
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
      result = activeFiles.filter(f => f.is_transit === 1 && f.current_location !== 'Selesai' && f.current_location !== 'Ditutup');
    } else if (filterType === 'Selesai') {
      result = result.filter(f => f.current_location === 'Selesai' || f.current_location === 'Ditutup');
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
  }, [files, activeFiles, searchQuery, filterType, isMyLocation, username]);

  const visibleFiles = useMemo(
    () => filteredFiles.slice(0, visibleCount),
    [filteredFiles, visibleCount]
  );

  const selectedSet = useMemo(() => new Set(selectedQrCodes), [selectedQrCodes]);

  const selectableFilteredFiles = useMemo(() => {
    return filteredFiles.filter(f => isFileSelectable(f));
  }, [filteredFiles, isFileSelectable]);

  const selectedFilesObjects = useMemo(() => {
    return files.filter(f => selectedSet.has(f.qr_code));
  }, [files, selectedSet]);

  const sendableSelected = useMemo(() => selectedFilesObjects.filter(f => canSendFile(f)), [selectedFilesObjects, canSendFile]);
  const cancelableSelected = useMemo(() => selectedFilesObjects.filter(f => canCancelTransitFile(f)), [selectedFilesObjects, canCancelTransitFile]);

  const handleOpenFile = useCallback((qrCode) => {
    navigate(`/file/${qrCode}`);
  }, [navigate]);

  const toggleSelectFile = useCallback((e, qrCode) => {
    e.stopPropagation();
    setSelectedQrCodes(prev => prev.includes(qrCode) ? prev.filter(q => q !== qrCode) : [...prev, qrCode]);
  }, []);

  const handleOpenBatchTransitModal = useCallback(async () => {
    setBatchTransitSearch('');
    setBatchTransitTarget('');
    setShowBatchTransitModal(true);
    if (usersList.length === 0 && !usersLoading) {
      setUsersLoading(true);
      try {
        const res = await api.get('/users/list');
        setUsersList(res.data || []);
      } catch {
        // ignore
      } finally {
        setUsersLoading(false);
      }
    }
  }, [usersList.length, usersLoading]);

  const toggleSelectAllFiltered = () => {
    const allSelectableQrs = selectableFilteredFiles.map(f => f.qr_code);
    const allSelected = allSelectableQrs.length > 0 && allSelectableQrs.every(qr => selectedQrCodes.includes(qr));
    if (allSelected) {
      setSelectedQrCodes(prev => prev.filter(qr => !allSelectableQrs.includes(qr)));
    } else {
      setSelectedQrCodes(prev => Array.from(new Set([...prev, ...allSelectableQrs])));
    }
  };

  // 1. Batch Send (Transit)
  const handleBatchTransitSubmit = async () => {
    if (!batchTransitTarget) {
      toast.error('Pilih petugas tujuan terlebih dahulu');
      return;
    }
    if (sendableSelected.length === 0) {
      toast.error('Tidak ada berkas yang dapat dikirim dari pilihan Anda');
      return;
    }
    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const f of sendableSelected) {
      try {
        await api.post(`/files/${f.qr_code}/transit`, { target_username: batchTransitTarget });
        successCount++;
      } catch (err) {
        failCount++;
        lastError = err.response?.data?.error || 'Gagal mengirim berkas';
      }
    }

    setBatchProcessing(false);
    setShowBatchTransitModal(false);
    setBatchTransitTarget('');
    setSelectedQrCodes([]);
    await fetchAllData();

    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} berkas berhasil dikirim (Transit)!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${successCount} berkas terkirim, ${failCount} gagal (${lastError})`);
    } else {
      toast.error(`Gagal mengirim berkas: ${lastError}`);
    }
  };

  // 2. Batch Cancel Transit (Batal Kirim)
  const handleBatchCancelTransit = async () => {
    if (cancelableSelected.length === 0) return;
    if (!window.confirm(`Batalkan pengiriman untuk ${cancelableSelected.length} berkas yang dipilih?`)) return;

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const f of cancelableSelected) {
      try {
        await api.post(`/files/${f.qr_code}/cancel-transit`);
        successCount++;
      } catch (err) {
        failCount++;
        lastError = err.response?.data?.error || 'Gagal membatalkan kiriman';
      }
    }

    setBatchProcessing(false);
    setSelectedQrCodes([]);
    await fetchAllData();

    if (successCount > 0 && failCount === 0) {
      toast.success(`Pengiriman ${successCount} berkas berhasil dibatalkan.`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${successCount} dibatalkan, ${failCount} gagal (${lastError})`);
    } else {
      toast.error(`Gagal membatalkan kiriman: ${lastError}`);
    }
  };

  const metrics = dashboardData;

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
      {/* Inject Global Grid Background & Dashboard Styles */}

      {/* Main Content Container */}
      <div className="container animate-fade-in dashboard-container" style={{ position: 'relative', zIndex: 5, paddingBottom: '3rem' }}>
        
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
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Monitoring Berkas
              </h1>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Pelacakan alur fisik berkas permohonan dan target SOP
              </p>
            </div>
          </div>
          {userRoles.some(r => ['administrator', 'petugas entry berkas', 'petugas entry berkas php'].includes(r.toLowerCase())) && (
            <button
              onClick={() => navigate('/entry')}
              style={{ width: 'auto', fontSize: '0.82rem', padding: '0.5rem 1rem', height: '38px', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <PlusSquare size={16} /> Entri Berkas Baru
            </button>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="dash-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Total Berkas Aktif', value: metrics.activeFiles, accent: '#1D4ED8', valueColor: 'var(--text-main)' },
            { label: 'Melewati SOP (Terlambat)', value: metrics.overdueFiles, accent: '#ef4444', valueColor: '#ef4444' },
            { label: 'Menunggu di Meja Saya', value: metrics.myFiles, accent: '#10b981', valueColor: 'var(--text-main)' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: 'var(--surface-card)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${card.accent}`,
                borderRadius: '12px',
                padding: '0.85rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                boxShadow: '0 4px 12px -3px var(--card-shadow)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>{card.label}</span>
              <strong style={{ fontSize: '1.65rem', color: card.valueColor, lineHeight: 1.1 }}>{card.value}</strong>
            </div>
          ))}
        </div>

        {/* Filter Pills & Search Bar (Compact Toolbar) */}
        <div className="dash-toolbar">
          {/* Search Input on Left */}
          <div className="dash-search-box">
            <div className="dash-search-icon">
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
          <div className="dash-filter-tabs">
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
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <AlertTriangle size={24} color="#34d399" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ color: '#34d399', margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>Pemberitahuan: Berkas Dikirim ke Anda</h4>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0 }}>
                  Ada <strong>{transitFiles.length} berkas</strong> sedang menuju meja Anda. Pindai fisik QR berkas untuk menerima.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/scan')}
                style={{
                  width: 'auto',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.1rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  margin: 0
                }}
              >
                <QrCode size={16} /> Buka Scanner QR Beruntun
              </button>
            </div>
          </div>
        )}

        {/* Batch Selection Action Bar */}
        {!loading && selectableFilteredFiles.length > 0 && (
          <div style={{
            background: selectedQrCodes.length > 0 ? 'rgba(29, 78, 216, 0.08)' : 'var(--surface-card)',
            backdropFilter: 'blur(12px)',
            border: selectedQrCodes.length > 0 ? '1px solid rgba(29, 78, 216, 0.4)' : '1px solid var(--border-color)',
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            marginBottom: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                style={{
                  width: 'auto',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.2rem 0.35rem',
                  margin: 0,
                  color: 'var(--text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'none'
                }}
              >
                {selectableFilteredFiles.length > 0 && selectableFilteredFiles.every(f => selectedQrCodes.includes(f.qr_code)) ? (
                  <CheckSquare size={18} color="#1D4ED8" />
                ) : (
                  <Square size={18} color="var(--text-muted)" />
                )}
                <span>Pilih Semua ({selectableFilteredFiles.length} berkas)</span>
              </button>
              {selectedQrCodes.length > 0 && (
                <span style={{
                  fontSize: '0.78rem',
                  padding: '0.18rem 0.6rem',
                  borderRadius: '999px',
                  background: '#1D4ED8',
                  color: '#fff',
                  fontWeight: 600
                }}>
                  {selectedQrCodes.length} dipilih
                </span>
              )}
            </div>

            {selectedQrCodes.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {sendableSelected.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenBatchTransitModal}
                    disabled={batchProcessing}
                    style={{
                      width: 'auto',
                      background: '#1D4ED8',
                      color: '#fff',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '9px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      margin: 0
                    }}
                  >
                    <Send size={14} /> Kirim Batch ({sendableSelected.length})
                  </button>
                )}

                {cancelableSelected.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchCancelTransit}
                    disabled={batchProcessing}
                    style={{
                      width: 'auto',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '9px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      margin: 0
                    }}
                  >
                    <RotateCcw size={14} /> Batal Kirim ({cancelableSelected.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedQrCodes([])}
                  className="secondary"
                  style={{
                    width: 'auto',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    margin: 0
                  }}
                >
                  <X size={14} /> Reset Pilihan
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Centang berkas untuk Kirim (Transit) atau Batal Kirim secara batch
              </span>
            )}
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
        {loading || ((filterType === 'Semua' || filterType === 'Selesai') && !doneLoaded && loadingDone) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[1, 2, 3, 4].map(n => (
              <div 
                key={n} 
                className="dash-file-card"
                style={{
                  background: 'var(--surface-card)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.15rem'
                }}
              >
                <div className="dash-col-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="skeleton-box" style={{ width: '160px', height: '20px' }}></div>
                  <div className="skeleton-box" style={{ width: '220px', height: '14px' }}></div>
                  <div className="skeleton-box" style={{ width: '130px', height: '12px' }}></div>
                </div>
                <div className="dash-col-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="skeleton-box" style={{ width: '120px', height: '14px' }}></div>
                  <div className="skeleton-box" style={{ width: '100px', height: '14px' }}></div>
                </div>
                <div className="dash-col-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <div className="skeleton-box" style={{ width: '110px', height: '24px', borderRadius: '999px' }}></div>
                  <div className="skeleton-box" style={{ width: '90px', height: '12px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          filterType === 'Tugas Saya' && !searchQuery ? (
            <div className="empty-state-card">
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Semua Berkas Beres! 🎉</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                Tidak ada berkas yang sedang menunggu tindakan di meja Anda saat ini.
              </p>
            </div>
          ) : files.length === 0 && doneLoaded ? (
            <div className="empty-state-card">
              <FileText size={48} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Belum ada berkas yang terdaftar</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Berkas baru akan muncul di sini setelah dientri oleh Petugas Entry.</p>
            </div>
          ) : (
            <div className="empty-state-card">
              <Search size={48} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Berkas tidak ditemukan</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {searchQuery ? `Tidak ada berkas yang cocok dengan pencarian "${searchQuery}".` : `Tidak ada berkas pada kategori "${filterType}".`}
              </p>
              {(searchQuery || filterType !== 'Semua') && (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {searchQuery && filterType !== 'Semua' && filterType !== 'Selesai' && (
                    <button
                      onClick={() => setFilterType('Semua')}
                      style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem', margin: 0 }}
                    >
                      <Search size={14} /> Cari di Semua Status
                    </button>
                  )}
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterType('Semua'); }}
                    className="secondary"
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem', margin: 0 }}
                  >
                    <RotateCcw size={14} /> Reset Filter & Pencarian
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {visibleFiles.map((file) => (
              <DashboardFileCard
                key={file.id}
                file={file}
                isSelected={selectedSet.has(file.qr_code)}
                selectable={isFileSelectable(file)}
                enteredDateText={formatShortDate(file.created_at)}
                onOpen={handleOpenFile}
                onToggleSelect={toggleSelectFile}
              />
            ))}
            {filteredFiles.length > visibleFiles.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
                  style={{ width: 'auto', padding: '0.55rem 1.25rem', fontSize: '0.84rem', margin: 0 }}
                >
                  Tampilkan {Math.min(VISIBLE_STEP, filteredFiles.length - visibleFiles.length)} lagi ({visibleFiles.length} dari {filteredFiles.length} berkas)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <BatchTransitModal
        isOpen={showBatchTransitModal}
        sendableSelected={sendableSelected}
        usersList={usersList}
        usersLoading={usersLoading}
        batchTransitTarget={batchTransitTarget}
        onSelectTarget={setBatchTransitTarget}
        batchTransitSearch={batchTransitSearch}
        onSearchChange={setBatchTransitSearch}
        batchProcessing={batchProcessing}
        onClose={() => setShowBatchTransitModal(false)}
        onSubmit={handleBatchTransitSubmit}
      />
    </div>
  );
}