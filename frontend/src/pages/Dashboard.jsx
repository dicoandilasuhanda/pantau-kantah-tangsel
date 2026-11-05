import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, FileText, AlertTriangle, BarChart2, CheckCircle2, RotateCcw, Clock, Calendar, Send, CheckSquare, Square, X, Check, Loader2, Users } from 'lucide-react';
import { getWorkingDays, calculateTotalElapsedDays, getStatusColor, SOP_DAYS } from '../utils/dateUtils';
import toast from 'react-hot-toast';

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
  const [usersList, setUsersList] = useState([]);

  // Batch Handover State
  const [selectedQrCodes, setSelectedQrCodes] = useState([]);
  const [showBatchTransitModal, setShowBatchTransitModal] = useState(false);
  const [batchTransitTarget, setBatchTransitTarget] = useState('');
  const [batchTransitSearch, setBatchTransitSearch] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchRoleModal, setBatchRoleModal] = useState(null); // { qrCodes: [], availableRoles: [] }

  const fetchAllData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
    fetchAllData();
    api.get('/users/list').then(res => setUsersList(res.data || [])).catch(() => {});
  }, [fetchAllData]);

  const roleStr = userRole;
  const username = localStorage.getItem('username') || '';
  const userRoles = useMemo(() => roleStr.split(',').map(r => r.trim()).filter(Boolean), [roleStr]);
  const isAdmin = userRoles.includes('Administrator');

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

  const canReceiveFile = useCallback((file) => {
    const isFinished = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
    if (isFinished || file.is_transit !== 1) return false;
    return file.transit_to_username === username || isAdmin;
  }, [username, isAdmin]);

  const canCancelTransitFile = useCallback((file) => {
    const isFinished = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
    if (isFinished || file.is_transit !== 1) return false;
    return file.transit_by_username === username || isAdmin;
  }, [username, isAdmin]);

  const isFileSelectable = useCallback((file) => {
    return canSendFile(file) || canReceiveFile(file) || canCancelTransitFile(file);
  }, [canSendFile, canReceiveFile, canCancelTransitFile]);

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
  }, [files, searchQuery, filterType, isMyLocation, username]);

  const selectableFilteredFiles = useMemo(() => {
    return filteredFiles.filter(f => isFileSelectable(f));
  }, [filteredFiles, isFileSelectable]);

  const selectedFilesObjects = useMemo(() => {
    const set = new Set(selectedQrCodes);
    return files.filter(f => set.has(f.qr_code));
  }, [files, selectedQrCodes]);

  const sendableSelected = useMemo(() => selectedFilesObjects.filter(f => canSendFile(f)), [selectedFilesObjects, canSendFile]);
  const receivableSelected = useMemo(() => selectedFilesObjects.filter(f => canReceiveFile(f)), [selectedFilesObjects, canReceiveFile]);
  const cancelableSelected = useMemo(() => selectedFilesObjects.filter(f => canCancelTransitFile(f)), [selectedFilesObjects, canCancelTransitFile]);

  const toggleSelectFile = (e, qrCode) => {
    e.stopPropagation();
    setSelectedQrCodes(prev => prev.includes(qrCode) ? prev.filter(q => q !== qrCode) : [...prev, qrCode]);
  };

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

  // 2. Batch Receive (Terima Berkas Transit)
  const executeBatchReceive = async (qrList, selectedRole = null) => {
    if (!qrList || qrList.length === 0) return;
    if (userRoles.length > 1 && !selectedRole) {
      setBatchRoleModal({ qrCodes: qrList, availableRoles: userRoles });
      return;
    }

    setBatchProcessing(true);
    const fullName = localStorage.getItem('fullName') || localStorage.getItem('full_name');
    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (const qr of qrList) {
      try {
        await api.post('/files/scan', {
          qr_code: qr,
          fullName,
          isFinishing: false,
          selected_role: selectedRole || userRoles[0]
        });
        successCount++;
      } catch (err) {
        const data = err.response?.data;
        if (data?.requires_smart_confirmation && data?.suggested_role) {
          try {
            await api.post('/files/scan', {
              qr_code: qr,
              fullName,
              isFinishing: false,
              selected_role: data.suggested_role
            });
            successCount++;
            continue;
          } catch (retryErr) {
            failCount++;
            lastError = retryErr.response?.data?.error || 'Gagal menerima berkas';
          }
        } else {
          failCount++;
          lastError = data?.error || 'Gagal menerima berkas';
        }
      }
    }

    setBatchProcessing(false);
    setBatchRoleModal(null);
    setSelectedQrCodes([]);
    await fetchAllData();

    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} berkas berhasil diterima di meja Anda!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${successCount} berkas diterima, ${failCount} gagal (${lastError})`);
    } else {
      toast.error(`Gagal menerima berkas: ${lastError}`);
    }
  };

  // 3. Batch Cancel Transit (Batal Kirim)
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
      <style>{`
        body, #root, .app-container {
          background-color: var(--bg-color) !important;
          background-image: var(--bg-pattern) !important;
          background-size: 40px 40px, 40px 40px, 100% 100%, 100% 100% !important;
          background-attachment: fixed !important;
        }
        .dashboard-container {
          max-width: 1100px !important;
          margin: 0 auto !important;
          width: 100% !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }
        .dash-file-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .dash-col-info {
          flex: 0 1 380px;
          min-width: 220px;
        }
        .dash-col-timeline {
          flex: 0 1 240px;
          min-width: 180px;
          padding-left: 1.25rem;
          border-left: 1px solid var(--border-color);
        }
        .dash-col-status {
          flex: 0 0 auto;
          margin-left: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }
        .dash-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .dash-search-box {
          position: relative;
          flex: 1 1 280px;
          max-width: 440px;
        }
        .dash-search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .dash-filter-tabs {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          align-items: center;
        }
        @media (max-width: 860px) {
          .dashboard-container {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
            overflow-x: hidden !important;
          }
          .dash-file-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.45rem !important;
            padding: 0.75rem 0.95rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .dash-col-info {
            flex: none !important;
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .dash-col-timeline {
            flex: none !important;
            width: 100% !important;
            min-width: 0 !important;
            padding-left: 0 !important;
            border-left: none !important;
            padding-top: 0.45rem !important;
            border-top: 1px solid var(--border-color) !important;
            gap: 0.2rem !important;
            box-sizing: border-box !important;
          }
          .dash-col-status {
            flex: none !important;
            width: 100% !important;
            margin-left: 0 !important;
            align-items: flex-start !important;
            text-align: left !important;
            padding-top: 0.45rem !important;
            border-top: 1px solid var(--border-color) !important;
            box-sizing: border-box !important;
          }
          .dash-metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .dash-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.65rem !important;
            margin-bottom: 0.75rem !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .dash-search-box {
            flex: none !important;
            max-width: 100% !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            margin-bottom: 0 !important;
            box-sizing: border-box !important;
          }
          .dash-search-box input {
            margin-bottom: 0 !important;
            height: 38px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .dash-filter-tabs {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 6px;
            box-sizing: border-box !important;
            scrollbar-width: none;
          }
          .dash-filter-tabs::-webkit-scrollbar {
            display: none;
          }
          .dash-filter-tabs button {
            flex-shrink: 0;
            white-space: nowrap;
          }
        }
      `}</style>

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
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Monitoring Berkas
            </h1>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="dash-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
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
                  Ada <strong>{transitFiles.length} berkas</strong> yang sedang dikirim ke meja Anda dan menunggu penerimaan.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => executeBatchReceive(transitFiles.map(f => f.qr_code))}
                disabled={batchProcessing}
                style={{
                  width: 'auto',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: batchProcessing ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                {batchProcessing ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
                Terima Semua ({transitFiles.length})
              </button>
              <button
                onClick={() => navigate('/scan')}
                className="secondary"
                style={{
                  width: 'auto',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                Scan QR Batch
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
                    onClick={() => { setBatchTransitSearch(''); setBatchTransitTarget(''); setShowBatchTransitModal(true); }}
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

                {receivableSelected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => executeBatchReceive(receivableSelected.map(f => f.qr_code))}
                    disabled={batchProcessing}
                    style={{
                      width: 'auto',
                      background: '#10b981',
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
                    <Check size={14} /> Terima Batch ({receivableSelected.length})
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
                Centang berkas untuk serah terima (Kirim / Terima / Batal Transit) secara batch
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
        {loading ? (
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
                daysText = file.current_location === 'Ditutup' 
                  ? `Berkas ditutup (${totalDaysTaken} hari kerja)` 
                  : `Diselesaikan dalam ${totalDaysTaken} hari kerja`;
                statusColor = file.current_location === 'Ditutup' ? '#6b7280' : 'var(--success-color, #10b981)';
              } else {
                const daysAtLocation = getWorkingDays(updatedAt);
                statusColor = getStatusColor(daysAtLocation);
                daysText = daysAtLocation === 0 ? 'Baru masuk di posisi ini' : `${daysAtLocation} hari kerja di posisi ini`;
              }

              const isHovered = hoveredFileId === file.id;
              const sopTarget = SOP_DAYS[file.nama_kegiatan];
              const selectable = isFileSelectable(file);
              const isSelected = selectedQrCodes.includes(file.qr_code);

              return (
                <div
                  key={file.id}
                  onClick={() => navigate(`/file/${file.qr_code}`)}
                  onMouseEnter={() => setHoveredFileId(file.id)}
                  onMouseLeave={() => setHoveredFileId(null)}
                  className="dash-file-card"
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(29, 78, 216, 0.08)' : (isHovered ? 'var(--surface-hover)' : 'var(--surface-card)'),
                    backdropFilter: 'blur(16px)',
                    border: isSelected ? '1.5px solid #1D4ED8' : (isHovered ? '1px solid #1D4ED8' : '1px solid var(--border-color)'),
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    transition: 'all 0.18s ease',
                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 8px 20px -4px var(--card-shadow)' : '0 2px 6px -2px var(--card-shadow)'
                  }}
                >
                  {/* Col 1: Checkbox + Identitas Berkas */}
                  <div className="dash-col-info" style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {selectable && (
                      <div
                        onClick={(e) => toggleSelectFile(e, file.qr_code)}
                        title={isSelected ? 'Batalkan pilihan berkas ini' : 'Pilih berkas ini untuk aksi batch'}
                        style={{
                          paddingTop: '0.15rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: isSelected ? '#1D4ED8' : 'var(--text-muted)'
                        }}
                      >
                        {isSelected ? <CheckSquare size={20} color="#1D4ED8" /> : <Square size={20} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        <FileText size={17} color="#1D4ED8" style={{ flexShrink: 0 }} /> {file.nomor_berkas} / {file.tahun_berkas}
                      </h3>
                      <p style={{ fontSize: '0.86rem', margin: '0 0 0.15rem 0', color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.nama_kegiatan}
                      </p>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Pemohon: {file.nama_pemohon}
                      </p>
                    </div>
                  </div>

                  {/* Col 2 (Bagian Tengah): Timeline & SOP */}
                  <div className="dash-col-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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
                  <div className="dash-col-status">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={13} color={isTransit ? '#f59e0b' : (file.current_location === 'Ditutup' ? '#6b7280' : '#10b981')} />
                      <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.76rem',
                        fontWeight: '600',
                        background: isTransit ? 'rgba(245, 158, 11, 0.15)' : (file.current_location === 'Ditutup' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(16, 185, 129, 0.12)'),
                        border: isTransit ? '1px solid rgba(245, 158, 11, 0.35)' : (file.current_location === 'Ditutup' ? '1px solid rgba(107, 114, 128, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'),
                        color: isTransit ? '#d97706' : (file.current_location === 'Ditutup' ? '#6b7280' : '#059669')
                      }}>
                        {isTransit ? `Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', marginTop: '0.35rem' }}>
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

      {/* Modal 1: Kirim Berkas Batch (Transit) */}
      {showBatchTransitModal && (
        <div
          onClick={() => !batchProcessing && setShowBatchTransitModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={20} color="#1D4ED8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  Kirim Berkas Secara Batch ({sendableSelected.length} Berkas)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchTransitModal(false)}
                disabled={batchProcessing}
                style={{
                  width: 'auto',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.25rem',
                  margin: 0,
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: 'var(--surface-subtle, rgba(29, 78, 216, 0.06))',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.6rem 0.85rem',
              marginBottom: '0.9rem',
              maxHeight: '110px',
              overflowY: 'auto',
              fontSize: '0.8rem',
              color: 'var(--text-main)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Daftar berkas yang akan dikirim:
              </div>
              {sendableSelected.map(f => (
                <div key={f.qr_code} style={{ padding: '0.15rem 0', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>{f.nomor_berkas}/{f.tahun_berkas}</strong>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.nama_pemohon}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ margin: '0 0 0.45rem 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Pilih Petugas Tujuan:
            </p>
            <input
              type="text"
              placeholder="Cari nama atau jabatan petugas..."
              value={batchTransitSearch}
              onChange={(e) => setBatchTransitSearch(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '0.6rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />

            <div style={{
              maxHeight: '210px',
              overflowY: 'auto',
              marginBottom: '1.1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              background: 'var(--bg-color)'
            }}>
              {usersList.filter(u =>
                (u.full_name || u.username).toLowerCase().includes(batchTransitSearch.toLowerCase()) ||
                (u.role || '').toLowerCase().includes(batchTransitSearch.toLowerCase())
              ).map(u => {
                const isChosen = batchTransitTarget === u.username;
                return (
                  <div
                    key={u.username}
                    onClick={() => setBatchTransitTarget(u.username)}
                    style={{
                      padding: '0.7rem 0.9rem',
                      cursor: 'pointer',
                      background: isChosen ? '#1D4ED8' : 'transparent',
                      color: isChosen ? '#ffffff' : 'var(--text-main)',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: isChosen ? 700 : 600 }}>
                      {u.full_name || u.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: isChosen ? 0.92 : 0.7, marginTop: '0.15rem' }}>
                      {u.role}
                    </div>
                  </div>
                );
              })}
              {usersList.filter(u =>
                (u.full_name || u.username).toLowerCase().includes(batchTransitSearch.toLowerCase()) ||
                (u.role || '').toLowerCase().includes(batchTransitSearch.toLowerCase())
              ).length === 0 && (
                <div style={{ padding: '1rem', fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Petugas tidak ditemukan
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowBatchTransitModal(false)}
                disabled={batchProcessing}
                style={{ width: 'auto', padding: '0.55rem 1.1rem', fontSize: '0.85rem', margin: 0 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBatchTransitSubmit}
                disabled={batchProcessing || !batchTransitTarget}
                style={{
                  width: 'auto',
                  background: '#1D4ED8',
                  color: '#fff',
                  border: 'none',
                  padding: '0.55rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  margin: 0
                }}
              >
                {batchProcessing ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                {batchProcessing ? 'Mengirim...' : `Kirim ${sendableSelected.length} Berkas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pilih Jabatan Saat Terima Batch (Untuk User Multi-Role) */}
      {batchRoleModal && (
        <div
          onClick={() => !batchProcessing && setBatchRoleModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--text-main)' }}>
                Pilih Jabatan Penerimaan Batch
              </h3>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Pilih jabatan Anda untuk menerima <strong>{batchRoleModal.qrCodes.length} berkas</strong> sekaligus:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {batchRoleModal.availableRoles.map(r => (
                <button
                  key={r}
                  type="button"
                  disabled={batchProcessing}
                  onClick={() => executeBatchReceive(batchRoleModal.qrCodes, r)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-color)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    margin: 0
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary"
                disabled={batchProcessing}
                onClick={() => setBatchRoleModal(null)}
                style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.84rem', margin: 0 }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}