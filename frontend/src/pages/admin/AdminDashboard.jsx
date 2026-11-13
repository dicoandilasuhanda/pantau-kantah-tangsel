import { useEffect, useState, useMemo } from 'react';
import api from '../../utils/api';
import { Download, FolderKanban, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { parseSQLiteDate } from '../../utils/dateUtils';
import {
  calculateFileSLA,
  downloadAdminBerkasExcel,
  downloadAdminSuratExcel,
} from '../../utils/adminExcelExport';
import AdminBerkasTab from '../../components/admin/AdminBerkasTab';
import AdminSuratTab from '../../components/admin/AdminSuratTab';
import CloseReasonModal from '../../components/admin/CloseReasonModal';


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('berkas'); // 'berkas' | 'surat'

  // State Berkas Permohonan
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('Semua');
  const [filterYear, setFilterYear] = useState('Semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterKegiatan, setFilterKegiatan] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterSla, setFilterSla] = useState('Semua');

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedFileToClose, setSelectedFileToClose] = useState(null);
  const [closeReason, setCloseReason] = useState('');

  // State Persuratan (Surat Masuk)
  const [suratList, setSuratList] = useState([]);
  const [suratSearchTerm, setSuratSearchTerm] = useState('');
  const [suratFilterMonth, setSuratFilterMonth] = useState('Semua');
  const [suratFilterYear, setSuratFilterYear] = useState('Semua');
  const [suratStartDate, setSuratStartDate] = useState('');
  const [suratEndDate, setSuratEndDate] = useState('');
  const [suratFilterStatus, setSuratFilterStatus] = useState('Semua');

  const [closeSuratModalOpen, setCloseSuratModalOpen] = useState(false);
  const [selectedSuratToClose, setSelectedSuratToClose] = useState(null);
  const [closeSuratReason, setCloseSuratReason] = useState('');

  const navigate = useNavigate();

  // ================= HANDLER BERKAS PERMOHONAN =================
  const handleDeleteFile = async (id, nomorBerkas) => {
    if (window.confirm(`Yakin ingin menghapus berkas nomor ${nomorBerkas} beserta seluruh histori posisinya secara permanen?`)) {
      try {
        await api.delete(`/files/${id}`);
        toast.success(`Berkas ${nomorBerkas} berhasil dihapus`);
        setFiles(prevFiles => prevFiles.filter(f => f.id !== id));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Gagal menghapus berkas');
      }
    }
  };

  const handleCompleteFile = async (id, nomor_berkas) => {
    if (window.confirm(`Apakah Anda yakin ingin menyelesaikan secara manual berkas ${nomor_berkas}?`)) {
      try {
        await api.put(`/files/${id}/complete`);
        toast.success(`Berkas ${nomor_berkas} berhasil diselesaikan`);
        setFiles(prevFiles => prevFiles.map(f => {
          if (f.id === id) {
            return { 
              ...f, 
              current_location: 'Selesai',
              is_transit: 0,
              transit_to_username: null,
              transit_to_fullname: null
            };
          }
          return f;
        }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Gagal menyelesaikan berkas');
      }
    }
  };

  const handleCloseFileSubmit = async () => {
    if (!closeReason.trim()) {
      toast.error('Alasan penutupan harus diisi');
      return;
    }
    try {
      await api.put(`/files/${selectedFileToClose.id}/close`, { alasan: closeReason });
      toast.success(`Berkas ${selectedFileToClose.nomor_berkas} berhasil ditutup`);
      setFiles(prevFiles => prevFiles.map(f => {
        if (f.id === selectedFileToClose.id) {
          return { 
            ...f, 
            current_location: 'Ditutup',
            is_transit: 0,
            transit_to_username: null,
            transit_to_fullname: null
          };
        }
        return f;
      }));
      setCloseModalOpen(false);
      setCloseReason('');
      setSelectedFileToClose(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menutup berkas');
    }
  };

  // ================= HANDLER PERSURATAN (SURAT MASUK) =================
  const handleDeleteSurat = async (id, nomorAgenda, nomorSurat) => {
    if (window.confirm(`Yakin ingin menghapus surat No. Agenda ${nomorAgenda} (${nomorSurat}) beserta histori perjalanannya secara permanen?`)) {
      try {
        await api.delete(`/surat/${id}`);
        toast.success(`Surat No. Agenda ${nomorAgenda} berhasil dihapus`);
        setSuratList(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Gagal menghapus surat');
      }
    }
  };

  const handleCompleteSurat = async (id, nomorAgenda) => {
    if (window.confirm(`Apakah Anda yakin ingin menandai selesai surat No. Agenda ${nomorAgenda}?`)) {
      try {
        await api.put(`/surat/${id}/complete`);
        toast.success(`Surat No. Agenda ${nomorAgenda} berhasil diselesaikan`);
        setSuratList(prev => prev.map(s => {
          if (s.id === id) {
            return { ...s, current_location: 'Selesai' };
          }
          return s;
        }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Gagal menyelesaikan surat');
      }
    }
  };

  const handleCloseSuratSubmit = async () => {
    if (!closeSuratReason.trim()) {
      toast.error('Alasan penutupan / pengarsipan surat harus diisi');
      return;
    }
    try {
      await api.put(`/surat/${selectedSuratToClose.id}/close`, { alasan: closeSuratReason });
      toast.success(`Surat No. Agenda ${selectedSuratToClose.nomor_agenda} berhasil ditutup`);
      setSuratList(prev => prev.map(s => {
        if (s.id === selectedSuratToClose.id) {
          return { ...s, current_location: 'Ditutup', catatan: closeSuratReason };
        }
        return s;
      }));
      setCloseSuratModalOpen(false);
      setCloseSuratReason('');
      setSelectedSuratToClose(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menutup surat');
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [filesRes, suratRes] = await Promise.all([
          api.get('/reports/files'),
          api.get('/surat').catch(() => ({ data: [] }))
        ]);
        setFiles(filesRes.data || []);
        setSuratList(Array.isArray(suratRes.data) ? suratRes.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const calculateSLA = (createdAt, nama_kegiatan) => calculateFileSLA(createdAt, nama_kegiatan);

  // Daftar Tahun dan Jenis Kegiatan otomatis dari data berkas
  const availableYears = useMemo(() => {
    const yearsSet = new Set([String(new Date().getFullYear())]);
    files.forEach(f => {
      if (f.created_at) {
        const d = parseSQLiteDate(f.created_at);
        if (!isNaN(d)) yearsSet.add(String(d.getFullYear()));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [files]);

  const availableKegiatan = useMemo(() => {
    const kegSet = new Set();
    files.forEach(f => {
      if (f.nama_kegiatan) kegSet.add(f.nama_kegiatan);
    });
    return Array.from(kegSet).sort();
  }, [files]);

  const isAnyFilterActive =
    searchTerm !== '' ||
    filterMonth !== 'Semua' ||
    filterYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    filterKegiatan !== 'Semua' ||
    filterStatus !== 'Semua' ||
    filterSla !== 'Semua';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterMonth('Semua');
    setFilterYear('Semua');
    setStartDate('');
    setEndDate('');
    setFilterKegiatan('Semua');
    setFilterStatus('Semua');
    setFilterSla('Semua');
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const sla = calculateSLA(f.created_at, f.nama_kegiatan);
      const isDone = f.current_location === 'Selesai';
      const isClosed = f.current_location === 'Ditutup';
      const isActive = !isDone && !isClosed;
      const slaStatus = isDone ? 'Aman' : (isClosed ? 'Ditutup' : (sla.isOverdue ? 'Overdue' : 'On-Track'));

      // 1. Filter Tahun
      if (filterYear !== 'Semua') {
        const fileYear = String(sla.masukDateObj.getFullYear());
        if (fileYear !== filterYear) return false;
      }

      // 2. Filter Bulan
      if (filterMonth !== 'Semua') {
        const fileMonth = String(sla.masukDateObj.getMonth() + 1).padStart(2, '0');
        if (fileMonth !== filterMonth) return false;
      }

      // 3. Filter Rentang Tanggal Masuk (Dari - Sampai)
      if (startDate) {
        const startObj = new Date(startDate + 'T00:00:00');
        if (sla.masukDateObj < startObj) return false;
      }
      if (endDate) {
        const endObj = new Date(endDate + 'T23:59:59');
        if (sla.masukDateObj > endObj) return false;
      }

      // 4. Filter Jenis Kegiatan
      if (filterKegiatan !== 'Semua' && f.nama_kegiatan !== filterKegiatan) {
        return false;
      }

      // 5. Filter Status Berkas
      if (filterStatus === 'Proses' && !isActive) return false;
      if (filterStatus === 'Selesai' && !isDone) return false;
      if (filterStatus === 'Ditutup' && !isClosed) return false;
      if (filterStatus === 'Transit' && !(isActive && f.is_transit === 1)) return false;

      // 6. Filter Status SLA
      if (filterSla === 'Aman' && (slaStatus === 'Overdue' || isClosed)) return false;
      if (filterSla === 'Overdue' && (slaStatus !== 'Overdue' || isClosed)) return false;

      // 7. Filter Pencarian Teks
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nomorLengkap = `${f.nomor_berkas}/${f.tahun_berkas}`.toLowerCase();
        const matchText =
          nomorLengkap.includes(searchLower) ||
          (f.nama_pemohon && f.nama_pemohon.toLowerCase().includes(searchLower)) ||
          (f.nama_kegiatan && f.nama_kegiatan.toLowerCase().includes(searchLower)) ||
          sla.tanggalMasuk.toLowerCase().includes(searchLower) ||
          sla.tanggalJatuhTempo.toLowerCase().includes(searchLower) ||
          (f.current_location && f.current_location.toLowerCase().includes(searchLower)) ||
          (f.latest_scan_info && f.latest_scan_info.toLowerCase().includes(searchLower));
        if (!matchText) return false;
      }

      return true;
    });
  }, [files, filterYear, filterMonth, startDate, endDate, filterKegiatan, filterStatus, filterSla, searchTerm]);

  // Statistik dinamis mengikuti hasil filter
  const filteredAnalytics = useMemo(() => {
    let completed = 0;
    let closed = 0;
    let active = 0;

    filteredFiles.forEach(f => {
      if (f.current_location === 'Selesai') completed++;
      else if (f.current_location === 'Ditutup') closed++;
      else active++;
    });

    return {
      totalFiles: filteredFiles.length,
      completedFiles: completed,
      activeFiles: active,
      closedFiles: closed
    };
  }, [filteredFiles]);

  // ================= FILTER & ANALYTICS PERSURATAN =================
  const getSecureFileUrl = (filePath) => {
    if (!filePath) return '#';
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('token') || '';
    const filename = filePath.split('/').pop();
    return `${baseUrl}/surat/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  };

  const parseSuratDate = (s) => {
    const tgl = s.tanggal_diterima || s.tanggalTerima;
    if (tgl) {
      const d = new Date(tgl + 'T00:00:00');
      if (!isNaN(d)) return d;
    }
    return parseSQLiteDate(s.created_at || s.createdAt);
  };

  const availableSuratYears = useMemo(() => {
    const yearsSet = new Set([String(new Date().getFullYear())]);
    suratList.forEach(s => {
      const d = parseSuratDate(s);
      if (d && !isNaN(d)) yearsSet.add(String(d.getFullYear()));
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [suratList]);

  const isAnySuratFilterActive =
    suratSearchTerm !== '' ||
    suratFilterMonth !== 'Semua' ||
    suratFilterYear !== 'Semua' ||
    suratStartDate !== '' ||
    suratEndDate !== '' ||
    suratFilterStatus !== 'Semua';

  const handleResetSuratFilters = () => {
    setSuratSearchTerm('');
    setSuratFilterMonth('Semua');
    setSuratFilterYear('Semua');
    setSuratStartDate('');
    setSuratEndDate('');
    setSuratFilterStatus('Semua');
  };

  const filteredSurat = useMemo(() => {
    return suratList.filter(s => {
      const dObj = parseSuratDate(s);
      const loc = s.current_location || 'Petugas Entry Surat';
      const isDone = loc === 'Selesai';
      const isClosed = loc === 'Ditutup';
      const isActive = !isDone && !isClosed;

      // 1. Filter Tahun
      if (suratFilterYear !== 'Semua' && dObj && !isNaN(dObj)) {
        if (String(dObj.getFullYear()) !== suratFilterYear) return false;
      }

      // 2. Filter Bulan
      if (suratFilterMonth !== 'Semua' && dObj && !isNaN(dObj)) {
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        if (m !== suratFilterMonth) return false;
      }

      // 3. Filter Rentang Tanggal Diterima
      if (suratStartDate && dObj && !isNaN(dObj)) {
        const startObj = new Date(suratStartDate + 'T00:00:00');
        if (dObj < startObj) return false;
      }
      if (suratEndDate && dObj && !isNaN(dObj)) {
        const endObj = new Date(suratEndDate + 'T23:59:59');
        if (dObj > endObj) return false;
      }

      // 4. Filter Status Surat
      if (suratFilterStatus === 'Proses' && !isActive) return false;
      if (suratFilterStatus === 'Selesai' && !isDone) return false;
      if (suratFilterStatus === 'Ditutup' && !isClosed) return false;

      // 5. Filter Pencarian Teks
      if (suratSearchTerm) {
        const q = suratSearchTerm.toLowerCase();
        const noAgenda = s.nomor_agenda || s.nomorAgenda || '';
        const noSurat = s.nomor_surat || s.nomorSurat || '';
        const asal = s.asal_surat || s.asalSurat || '';
        const match =
          noAgenda.toLowerCase().includes(q) ||
          noSurat.toLowerCase().includes(q) ||
          asal.toLowerCase().includes(q) ||
          (s.perihal && s.perihal.toLowerCase().includes(q)) ||
          loc.toLowerCase().includes(q) ||
          (s.latest_scan_info && s.latest_scan_info.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [suratList, suratFilterYear, suratFilterMonth, suratStartDate, suratEndDate, suratFilterStatus, suratSearchTerm]);

  const filteredSuratAnalytics = useMemo(() => {
    let completed = 0;
    let closed = 0;
    let active = 0;
    filteredSurat.forEach(s => {
      const loc = s.current_location || 'Petugas Entry Surat';
      if (loc === 'Selesai') completed++;
      else if (loc === 'Ditutup') closed++;
      else active++;
    });
    return {
      totalSurat: filteredSurat.length,
      completedSurat: completed,
      activeSurat: active,
      closedSurat: closed
    };
  }, [filteredSurat]);

  const handleExport = () => {
    if (filteredFiles.length === 0) {
      toast.error('Tidak ada data berkas pada filter ini untuk diunduh.');
      return;
    }
    downloadAdminBerkasExcel(filteredFiles, filteredAnalytics, {
      month: filterMonth,
      year: filterYear,
      startDate,
      endDate,
    });
    toast.success(`Laporan Excel (${filteredFiles.length} berkas) berhasil diunduh!`);
  };

  const handleExportSurat = () => {
    if (filteredSurat.length === 0) {
      toast.error('Tidak ada data surat pada filter ini untuk diunduh.');
      return;
    }
    downloadAdminSuratExcel(filteredSurat, filteredSuratAnalytics, {
      month: suratFilterMonth,
      year: suratFilterYear,
      startDate: suratStartDate,
      endDate: suratEndDate,
    });
    toast.success(`Laporan Excel Persuratan (${filteredSurat.length} surat) berhasil diunduh!`);
  };

  if (loading) {
    return (
      <div className="container animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="skeleton-box" style={{ width: '280px', height: '40px' }}></div>
          <div className="skeleton-box" style={{ width: '200px', height: '40px' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton-box" style={{ height: '95px' }}></div>
          ))}
        </div>
        <div className="glass-panel">
          <div className="skeleton-box" style={{ height: '42px', marginBottom: '1.5rem' }}></div>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="skeleton-box" style={{ height: '48px', marginBottom: '0.8rem' }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Kelola seluruh berkas permohonan & persuratan sistem, pantau status per periode, dan unduh laporan Excel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          {activeTab === 'berkas' ? (
            <button
              onClick={handleExport}
              style={{ width: 'auto', background: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={18} /> Unduh Laporan Berkas ({filteredFiles.length})
            </button>
          ) : (
            <button
              onClick={handleExportSurat}
              style={{ width: 'auto', background: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={18} /> Unduh Laporan Persuratan ({filteredSurat.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher: Kelola Berkas Permohonan vs Kelola Persuratan */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('berkas')}
          style={{
            width: 'auto',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'berkas' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'berkas' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'berkas' ? 'none' : '1px solid var(--border-color)',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <FolderKanban size={17} /> Kelola Berkas Permohonan ({files.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('surat')}
          style={{
            width: 'auto',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'surat' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'surat' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'surat' ? 'none' : '1px solid var(--border-color)',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <Mail size={17} /> Kelola Persuratan ({suratList.length})
        </button>
      </div>

      {activeTab === 'berkas' && (
        <AdminBerkasTab
          filteredFiles={filteredFiles}
          totalFilesCount={files.length}
          filteredAnalytics={filteredAnalytics}
          isAnyFilterActive={isAnyFilterActive}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterMonth={filterMonth}
          onFilterMonthChange={setFilterMonth}
          filterYear={filterYear}
          onFilterYearChange={setFilterYear}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          filterKegiatan={filterKegiatan}
          onFilterKegiatanChange={setFilterKegiatan}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterSla={filterSla}
          onFilterSlaChange={setFilterSla}
          availableYears={availableYears}
          availableKegiatan={availableKegiatan}
          onResetFilters={handleResetFilters}
          onNavigateFile={(qrCode) => navigate(`/file/${qrCode}`)}
          onCompleteFile={handleCompleteFile}
          onRequestCloseFile={(f) => {
            setSelectedFileToClose(f);
            setCloseModalOpen(true);
          }}
          onDeleteFile={handleDeleteFile}
        />
      )}

      {activeTab === 'surat' && (
        <AdminSuratTab
          filteredSurat={filteredSurat}
          totalSuratCount={suratList.length}
          filteredSuratAnalytics={filteredSuratAnalytics}
          isAnySuratFilterActive={isAnySuratFilterActive}
          suratSearchTerm={suratSearchTerm}
          onSearchChange={setSuratSearchTerm}
          suratFilterMonth={suratFilterMonth}
          onFilterMonthChange={setSuratFilterMonth}
          suratFilterYear={suratFilterYear}
          onFilterYearChange={setSuratFilterYear}
          suratStartDate={suratStartDate}
          onStartDateChange={setSuratStartDate}
          suratEndDate={suratEndDate}
          onEndDateChange={setSuratEndDate}
          suratFilterStatus={suratFilterStatus}
          onFilterStatusChange={setSuratFilterStatus}
          availableSuratYears={availableSuratYears}
          onResetFilters={handleResetSuratFilters}
          getSecureFileUrl={getSecureFileUrl}
          onNavigateSurat={(id) => navigate(`/surat/detail/${id}`)}
          onCompleteSurat={handleCompleteSurat}
          onRequestCloseSurat={(s) => {
            setSelectedSuratToClose(s);
            setCloseSuratModalOpen(true);
          }}
          onDeleteSurat={handleDeleteSurat}
        />
      )}

      <CloseReasonModal
        isOpen={closeModalOpen}
        title="Tutup Berkas"
        description={(
          <>
            Masukkan alasan mengapa berkas <strong>{selectedFileToClose?.nomor_berkas}</strong> ini ditutup secara manual:
          </>
        )}
        reason={closeReason}
        onReasonChange={setCloseReason}
        placeholder="Contoh: Pemohon membatalkan pengajuan, berkas ditarik..."
        onCancel={() => {
          setCloseModalOpen(false);
          setCloseReason('');
          setSelectedFileToClose(null);
        }}
        onConfirm={handleCloseFileSubmit}
      />

      <CloseReasonModal
        isOpen={closeSuratModalOpen}
        title="Tutup / Arsipkan Surat"
        maxWidth="420px"
        description={(
          <>
            Masukkan alasan penutupan atau pengarsipan surat No. Agenda{' '}
            <strong>#{selectedSuratToClose?.nomor_agenda || selectedSuratToClose?.nomorAgenda}</strong>{' '}
            ({selectedSuratToClose?.nomor_surat || selectedSuratToClose?.nomorSurat}):
          </>
        )}
        reason={closeSuratReason}
        onReasonChange={setCloseSuratReason}
        placeholder="Contoh: Surat telah dijawab dengan surat keluar nomor..., atau arsip informasi..."
        onCancel={() => {
          setCloseSuratModalOpen(false);
          setCloseSuratReason('');
          setSelectedSuratToClose(null);
        }}
        onConfirm={handleCloseSuratSubmit}
      />
    </div>
  );
}
