import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { Activity, CheckCircle, Clock, Download, Trash2, Lock, Filter, RotateCcw, Calendar, FolderKanban, Mail, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import { SOP_DAYS, addWorkingDays, parseSQLiteDate } from '../../utils/dateUtils';

const MONTH_NAMES = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

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

  const calculateSLA = (createdAt, nama_kegiatan) => {
    const masuk = parseSQLiteDate(createdAt);
    const sopDaysTarget = SOP_DAYS[nama_kegiatan] || 15;
    const jatuhTempo = addWorkingDays(createdAt, sopDaysTarget);
    
    const hariIni = new Date();
    const isOverdue = hariIni > jatuhTempo;
    const formatDate = (date) => date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return {
      masukDateObj: masuk,
      tanggalMasuk: formatDate(masuk),
      tanggalJatuhTempo: formatDate(jatuhTempo),
      isOverdue
    };
  };

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

  const getPeriodLabel = () => {
    const parts = [];
    if (filterMonth !== 'Semua') {
      const mObj = MONTH_NAMES.find(m => m.value === filterMonth);
      if (mObj) parts.push(mObj.label);
    }
    if (filterYear !== 'Semua') parts.push(filterYear);
    if (startDate || endDate) parts.push(`${startDate || 'Awal'}_sd_${endDate || 'Sekarang'}`);
    return parts.length > 0 ? parts.join('_') : 'Semua_Periode';
  };

  const getSuratPeriodLabel = () => {
    const parts = [];
    if (suratFilterMonth !== 'Semua') {
      const mObj = MONTH_NAMES.find(m => m.value === suratFilterMonth);
      if (mObj) parts.push(mObj.label);
    }
    if (suratFilterYear !== 'Semua') parts.push(suratFilterYear);
    if (suratStartDate || suratEndDate) parts.push(`${suratStartDate || 'Awal'}_sd_${suratEndDate || 'Sekarang'}`);
    return parts.length > 0 ? parts.join('_') : 'Semua_Periode';
  };

  const handleExport = () => {
    if (filteredFiles.length === 0) {
      toast.error('Tidak ada data berkas pada filter ini untuk diunduh.');
      return;
    }

    // Sheet 1: Daftar Detail Berkas (Sesuai Filter)
    const excelData = filteredFiles.map((f, index) => {
      const sla = calculateSLA(f.created_at, f.nama_kegiatan);
      const isDone = f.current_location === 'Selesai';
      const isClosed = f.current_location === 'Ditutup';
      return {
        'No': index + 1,
        'Nomor Berkas': `${f.nomor_berkas}/${f.tahun_berkas}`,
        'Pemohon': f.nama_pemohon,
        'Jenis Permohonan': f.nama_kegiatan,
        'Posisi Terakhir': (isDone || isClosed)
          ? f.current_location 
          : (f.is_transit === 1 ? `Sedang Transit ke ${f.transit_to_fullname || f.transit_to_username}` : f.current_location),
        'Pemegang Terakhir': f.latest_scan_info || '-',
        'Status Berkas': isDone ? 'Selesai' : (isClosed ? 'Ditutup' : 'Sedang Diproses'),
        'Tanggal Masuk': sla.tanggalMasuk,
        'Jatuh Tempo': sla.tanggalJatuhTempo,
        'Status SLA': isDone ? 'Aman (Selesai)' : (isClosed ? 'Ditutup' : (sla.isOverdue ? 'TERLAMBAT (Overdue)' : 'Aman (On-Track)'))
      };
    });

    // Sheet 2: Rekapitulasi per Jenis Kegiatan
    const summaryMap = {};
    filteredFiles.forEach(f => {
      const sla = calculateSLA(f.created_at, f.nama_kegiatan);
      const keg = f.nama_kegiatan || 'Lainnya';
      if (!summaryMap[keg]) {
        summaryMap[keg] = { total: 0, selesai: 0, proses: 0, ditutup: 0, terlambat: 0 };
      }
      summaryMap[keg].total++;
      if (f.current_location === 'Selesai') {
        summaryMap[keg].selesai++;
      } else if (f.current_location === 'Ditutup') {
        summaryMap[keg].ditutup++;
      } else {
        summaryMap[keg].proses++;
        if (sla.isOverdue) summaryMap[keg].terlambat++;
      }
    });

    const summaryData = Object.keys(summaryMap).sort().map((keg, idx) => ({
      'No': idx + 1,
      'Jenis Permohonan / Kegiatan': keg,
      'Total Berkas': summaryMap[keg].total,
      'Selesai': summaryMap[keg].selesai,
      'Masih Proses': summaryMap[keg].proses,
      'Ditutup': summaryMap[keg].ditutup,
      'Terlambat (Overdue)': summaryMap[keg].terlambat
    }));

    summaryData.push({
      'No': '',
      'Jenis Permohonan / Kegiatan': 'TOTAL KESELURUHAN',
      'Total Berkas': filteredAnalytics.totalFiles,
      'Selesai': filteredAnalytics.completedFiles,
      'Masih Proses': filteredAnalytics.activeFiles,
      'Ditutup': filteredAnalytics.closedFiles,
      'Terlambat (Overdue)': Object.values(summaryMap).reduce((acc, cur) => acc + cur.terlambat, 0)
    });

    const workbook = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(excelData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(workbook, wsDetail, "Daftar Berkas");
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Rekap Bulanan Kegiatan");

    const periodLabel = getPeriodLabel();
    XLSX.writeFile(workbook, `Laporan_SLA_Berkas_${periodLabel}.xlsx`);
    toast.success(`Laporan Excel (${filteredFiles.length} berkas) berhasil diunduh!`);
  };

  const handleExportSurat = () => {
    if (filteredSurat.length === 0) {
      toast.error('Tidak ada data surat pada filter ini untuk diunduh.');
      return;
    }

    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d)) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const excelData = filteredSurat.map((s, index) => {
      const loc = s.current_location || 'Petugas Entry Surat';
      const isDone = loc === 'Selesai';
      const isClosed = loc === 'Ditutup';
      return {
        'No': index + 1,
        'Nomor Agenda': s.nomor_agenda || s.nomorAgenda || '-',
        'Asal Surat / Instansi': s.asal_surat || s.asalSurat || '-',
        'Nomor Surat': s.nomor_surat || s.nomorSurat || '-',
        'Tanggal Diterima': formatDateDisplay(s.tanggal_diterima || s.tanggalTerima),
        'Perihal': s.perihal,
        'Posisi Terakhir': loc,
        'Riwayat Scan Terakhir': s.latest_scan_info || '-',
        'Status Surat': isDone ? 'Selesai' : (isClosed ? 'Ditutup / Diarsipkan' : 'Sedang Diproses'),
        'Catatan': s.catatan || '-'
      };
    });

    // Sheet 2: Rekap per Asal Surat / Instansi
    const summaryMap = {};
    filteredSurat.forEach(s => {
      const asal = s.asal_surat || s.asalSurat || 'Lainnya';
      const loc = s.current_location || 'Petugas Entry Surat';
      if (!summaryMap[asal]) {
        summaryMap[asal] = { total: 0, selesai: 0, proses: 0, ditutup: 0 };
      }
      summaryMap[asal].total++;
      if (loc === 'Selesai') summaryMap[asal].selesai++;
      else if (loc === 'Ditutup') summaryMap[asal].ditutup++;
      else summaryMap[asal].proses++;
    });

    const summaryData = Object.keys(summaryMap).sort().map((asal, idx) => ({
      'No': idx + 1,
      'Asal Surat / Instansi Pengirim': asal,
      'Total Surat': summaryMap[asal].total,
      'Selesai': summaryMap[asal].selesai,
      'Masih Proses': summaryMap[asal].proses,
      'Ditutup / Diarsipkan': summaryMap[asal].ditutup
    }));

    summaryData.push({
      'No': '',
      'Asal Surat / Instansi Pengirim': 'TOTAL KESELURUHAN',
      'Total Surat': filteredSuratAnalytics.totalSurat,
      'Selesai': filteredSuratAnalytics.completedSurat,
      'Masih Proses': filteredSuratAnalytics.activeSurat,
      'Ditutup / Diarsipkan': filteredSuratAnalytics.closedSurat
    });

    const workbook = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(excelData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(workbook, wsDetail, "Daftar Surat Masuk");
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Rekap Persuratan");

    const periodLabel = getSuratPeriodLabel();
    XLSX.writeFile(workbook, `Laporan_Persuratan_${periodLabel}.xlsx`);
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
        <>
          {/* Kartu Ringkasan Statistik Berkas (Otomatis Mengikuti Filter) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                <Activity size={32} color="var(--primary-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Total Berkas {isAnyFilterActive ? '(Terfilter)' : ''}</p>
                <h2 style={{ margin: 0 }}>{filteredAnalytics.totalFiles}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                <CheckCircle size={32} color="var(--accent-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Selesai</p>
                <h2 style={{ margin: 0 }}>{filteredAnalytics.completedFiles}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
                <Clock size={32} color="var(--warning-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Aktif (Proses)</p>
                <h2 style={{ margin: 0 }}>{filteredAnalytics.activeFiles}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
                <Lock size={32} color="var(--error-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Ditutup</p>
                <h2 style={{ margin: 0 }}>{filteredAnalytics.closedFiles}</h2>
              </div>
            </div>
          </div>

          {/* Panel Filter Periode, Kegiatan, Status & SLA */}
          <div className="glass-panel" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <Filter size={18} color="var(--primary-color)" />
                <span>Filter Laporan & Rentang Waktu Berkas</span>
              </div>
              {isAnyFilterActive && (
                <button
                  type="button"
                  className="secondary"
                  onClick={handleResetFilters}
                  style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} /> Reset Semua Filter
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              {/* Filter Bulan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Bulan Masuk</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Bulan</option>
                  {MONTH_NAMES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tahun */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tahun Masuk</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Tahun</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Dari Tanggal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>

              {/* Sampai Tanggal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>

              {/* Filter Jenis Kegiatan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Jenis Permohonan</label>
                <select
                  value={filterKegiatan}
                  onChange={(e) => setFilterKegiatan(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Kegiatan</option>
                  {availableKegiatan.map(keg => (
                    <option key={keg} value={keg}>{keg}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status Berkas */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status Berkas</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Proses">Masih Proses</option>
                  <option value="Transit">Sedang Transit</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Ditutup">Ditutup</option>
                </select>
              </div>

              {/* Filter Status SLA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status SLA</label>
                <select
                  value={filterSla}
                  onChange={(e) => setFilterSla(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua SLA</option>
                  <option value="Aman">Aman / On-Track</option>
                  <option value="Overdue">Terlambat (Overdue)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Seluruh Berkas Sistem</h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Menampilkan <strong>{filteredFiles.length}</strong> dari total <strong>{files.length}</strong> berkas
                </span>
              </div>
              <div style={{ width: '100%', maxWidth: '340px' }}>
                <input 
                  type="text" 
                  placeholder="Cari No. Berkas, Pemohon, Posisi..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '0.8rem' }}>
                  <th className="table-sticky-col" style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>No. Berkas</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '120px' }}>Pemohon</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '150px' }}>Jenis Permohonan</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Posisi Terakhir</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Tgl Masuk</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Jatuh Tempo</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>SLA</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '180px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8rem' }}>
                {filteredFiles.map(f => {
                  const sla = calculateSLA(f.created_at, f.nama_kegiatan);
                  const isDone = f.current_location === 'Selesai';
                  const isClosed = f.current_location === 'Ditutup';
                  const slaStatus = isDone ? 'Aman' : (isClosed ? 'Ditutup' : (sla.isOverdue ? 'Overdue' : 'On-Track'));
                  
                  return (
                    <tr key={f.id}>
                      <td
                        className="table-sticky-col"
                        onClick={() => navigate(`/file/${f.qr_code}`)}
                        title="Klik untuk lihat detail berkas"
                        style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary-hover)', fontWeight: 600 }}
                      >
                        {f.nomor_berkas}/{f.tahun_berkas}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>{f.nama_pemohon}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>{f.nama_kegiatan}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        {isDone || isClosed ? f.current_location : (f.is_transit === 1 ? `Sedang Transit ke ${f.transit_to_fullname || f.transit_to_username}` : f.current_location)}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <span className="badge" style={{ 
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : (isClosed ? 'rgba(107, 114, 128, 0.2)' : 'rgba(245, 158, 11, 0.2)'), 
                          color: isDone ? 'var(--success-color)' : (isClosed ? '#9ca3af' : 'var(--warning-color)'),
                          padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                        }}>
                          {isDone ? 'Selesai' : (isClosed ? 'Ditutup' : 'Proses')}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{sla.tanggalMasuk}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{sla.tanggalJatuhTempo}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <span className="badge" style={{ 
                          background: slaStatus === 'Overdue' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : (isClosed ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.2)'), 
                          color: slaStatus === 'Overdue' 
                            ? 'var(--error-color)' 
                            : (isClosed ? '#9ca3af' : 'var(--success-color)'),
                          padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                        }}>
                          {slaStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleCompleteFile(f.id, f.nomor_berkas)}
                            disabled={isDone || isClosed}
                            style={{ 
                              padding: '0.3rem 0.6rem', 
                              fontSize: '0.7rem',
                              background: (isDone || isClosed) ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: (isDone || isClosed) ? 'var(--text-muted)' : 'var(--accent-color)',
                              border: `1px solid ${(isDone || isClosed) ? 'transparent' : 'var(--accent-color)'}`,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: (isDone || isClosed) ? 'not-allowed' : 'pointer',
                              flex: '1 1 auto'
                            }}
                          >
                            <CheckCircle size={12} /> Selesai
                          </button>
                          
                          <button 
                            onClick={() => { setSelectedFileToClose(f); setCloseModalOpen(true); }}
                            disabled={isDone || isClosed}
                            style={{ 
                              padding: '0.3rem 0.6rem', 
                              fontSize: '0.7rem',
                              background: (isDone || isClosed) ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: (isDone || isClosed) ? 'var(--text-muted)' : 'var(--warning-color)',
                              border: `1px solid ${(isDone || isClosed) ? 'transparent' : 'var(--warning-color)'}`,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: (isDone || isClosed) ? 'not-allowed' : 'pointer',
                              flex: '1 1 auto'
                            }}
                          >
                            <Lock size={12} /> Tutup
                          </button>

                          <button 
                            onClick={() => handleDeleteFile(f.id, f.nomor_berkas)}
                            style={{ 
                              padding: '0.3rem 0.6rem', 
                              fontSize: '0.7rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--error-color)',
                              border: '1px solid var(--error-color)',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                              flex: '1 1 auto'
                            }}
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {isAnyFilterActive ? 'Tidak ada berkas yang cocok dengan filter yang dipilih.' : 'Belum ada berkas tercatat.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}

      {activeTab === 'surat' && (
        <>
          {/* Kartu Ringkasan Statistik Persuratan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                <Mail size={32} color="var(--primary-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Total Surat Masuk {isAnySuratFilterActive ? '(Terfilter)' : ''}</p>
                <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.totalSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                <CheckCircle size={32} color="var(--accent-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Surat Selesai</p>
                <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.completedSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
                <Clock size={32} color="var(--warning-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Surat Aktif (Proses)</p>
                <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.activeSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
                <Lock size={32} color="var(--error-color)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Ditutup / Diarsipkan</p>
                <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.closedSurat}</h2>
              </div>
            </div>
          </div>

          {/* Panel Filter Persuratan */}
          <div className="glass-panel" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <Filter size={18} color="var(--primary-color)" />
                <span>Filter Laporan & Rentang Waktu Persuratan</span>
              </div>
              {isAnySuratFilterActive && (
                <button
                  type="button"
                  className="secondary"
                  onClick={handleResetSuratFilters}
                  style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} /> Reset Semua Filter
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              {/* Filter Bulan Diterima */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Bulan Diterima</label>
                <select
                  value={suratFilterMonth}
                  onChange={(e) => setSuratFilterMonth(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Bulan</option>
                  {MONTH_NAMES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tahun Diterima */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tahun Diterima</label>
                <select
                  value={suratFilterYear}
                  onChange={(e) => setSuratFilterYear(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Tahun</option>
                  {availableSuratYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Dari Tanggal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Dari Tanggal Terima
                </label>
                <input
                  type="date"
                  value={suratStartDate}
                  onChange={(e) => setSuratStartDate(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>

              {/* Sampai Tanggal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Sampai Tanggal Terima
                </label>
                <input
                  type="date"
                  value={suratEndDate}
                  onChange={(e) => setSuratEndDate(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>

              {/* Filter Status Surat */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status Surat</label>
                <select
                  value={suratFilterStatus}
                  onChange={(e) => setSuratFilterStatus(e.target.value)}
                  style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Proses">Masih Diproses</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Ditutup">Ditutup / Diarsipkan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Persuratan */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Seluruh Surat Masuk Sistem</h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Menampilkan <strong>{filteredSurat.length}</strong> dari total <strong>{suratList.length}</strong> surat masuk
                </span>
              </div>
              <div style={{ width: '100%', maxWidth: '340px' }}>
                <input 
                  type="text" 
                  placeholder="Cari No. Agenda, Nomor Surat, Asal, Perihal..." 
                  value={suratSearchTerm}
                  onChange={(e) => setSuratSearchTerm(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: '0.8rem' }}>
                    <th className="table-sticky-col" style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>No. Agenda</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', minWidth: '140px' }}>Asal Surat</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '130px' }}>Nomor Surat</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Tgl Diterima</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', minWidth: '180px' }}>Perihal</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '150px' }}>Posisi Terakhir</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Status</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Berkas PDF</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '180px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.8rem' }}>
                  {filteredSurat.map(s => {
                    const loc = s.current_location || 'Petugas Entry Surat';
                    const isDone = loc === 'Selesai';
                    const isClosed = loc === 'Ditutup';
                    const noAgenda = s.nomor_agenda || s.nomorAgenda || '-';
                    const asalSurat = s.asal_surat || s.asalSurat || '-';
                    const noSurat = s.nomor_surat || s.nomorSurat || '-';
                    const rawTglTerima = s.tanggal_diterima || s.tanggalTerima;
                    const tglTerimaDisplay = rawTglTerima
                      ? new Date(rawTglTerima + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '-';
                    const pdfPath = s.file_path || s.fileUrl;

                    return (
                      <tr key={s.id}>
                        <td
                          className="table-sticky-col"
                          onClick={() => navigate(`/surat/detail/${s.id}`)}
                          title="Klik untuk lihat detail & riwayat perjalanan surat"
                          style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary-hover)', fontWeight: 700 }}
                        >
                          #{noAgenda}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                          {asalSurat}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                          {noSurat}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                          {tglTerimaDisplay}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)' }}>
                          {s.perihal}
                          {s.catatan && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Catatan: {s.catatan}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600 }}>{loc}</div>
                          {s.latest_scan_info && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {s.latest_scan_info}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                          <span className="badge" style={{ 
                            background: isDone ? 'rgba(16, 185, 129, 0.2)' : (isClosed ? 'rgba(107, 114, 128, 0.2)' : 'rgba(245, 158, 11, 0.2)'), 
                            color: isDone ? 'var(--success-color)' : (isClosed ? '#9ca3af' : 'var(--warning-color)'),
                            padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                          }}>
                            {isDone ? 'Selesai' : (isClosed ? 'Ditutup' : 'Proses')}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                          {pdfPath ? (
                            <a
                              href={getSecureFileUrl(pdfPath)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}
                            >
                              <FileText size={13} /> Buka PDF <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => handleCompleteSurat(s.id, noAgenda)}
                              disabled={isDone || isClosed}
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.7rem',
                                background: (isDone || isClosed) ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: (isDone || isClosed) ? 'var(--text-muted)' : 'var(--accent-color)',
                                border: `1px solid ${(isDone || isClosed) ? 'transparent' : 'var(--accent-color)'}`,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: (isDone || isClosed) ? 'not-allowed' : 'pointer',
                                flex: '1 1 auto'
                              }}
                            >
                              <CheckCircle size={12} /> Selesai
                            </button>
                            
                            <button 
                              onClick={() => { setSelectedSuratToClose(s); setCloseSuratModalOpen(true); }}
                              disabled={isDone || isClosed}
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.7rem',
                                background: (isDone || isClosed) ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: (isDone || isClosed) ? 'var(--text-muted)' : 'var(--warning-color)',
                                border: `1px solid ${(isDone || isClosed) ? 'transparent' : 'var(--warning-color)'}`,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: (isDone || isClosed) ? 'not-allowed' : 'pointer',
                                flex: '1 1 auto'
                              }}
                            >
                              <Lock size={12} /> Tutup
                            </button>

                            <button 
                              onClick={() => handleDeleteSurat(s.id, noAgenda, noSurat)}
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.7rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--error-color)',
                                border: '1px solid var(--error-color)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                flex: '1 1 auto'
                              }}
                            >
                              <Trash2 size={12} /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSurat.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {isAnySuratFilterActive ? 'Tidak ada surat yang cocok dengan filter yang dipilih.' : 'Belum ada surat masuk tercatat.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Tutup Berkas */}
      {closeModalOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Tutup Berkas</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Masukkan alasan mengapa berkas <strong>{selectedFileToClose?.nomor_berkas}</strong> ini ditutup secara manual:
            </p>
            <textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Contoh: Pemohon membatalkan pengajuan, berkas ditarik..."
              style={{ width: '100%', minHeight: '100px', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary" onClick={() => { setCloseModalOpen(false); setCloseReason(''); setSelectedFileToClose(null); }} style={{ width: 'auto', padding: '0.5rem 1rem' }}>Batal</button>
              <button onClick={handleCloseFileSubmit} style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--warning-color)' }}>Konfirmasi Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Tutup / Arsipkan Surat */}
      {closeSuratModalOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Tutup / Arsipkan Surat</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Masukkan alasan penutupan atau pengarsipan surat No. Agenda <strong>#{selectedSuratToClose?.nomor_agenda || selectedSuratToClose?.nomorAgenda}</strong> ({selectedSuratToClose?.nomor_surat || selectedSuratToClose?.nomorSurat}):
            </p>
            <textarea
              value={closeSuratReason}
              onChange={(e) => setCloseSuratReason(e.target.value)}
              placeholder="Contoh: Surat telah dijawab dengan surat keluar nomor..., atau arsip informasi..."
              style={{ width: '100%', minHeight: '100px', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary" onClick={() => { setCloseSuratModalOpen(false); setCloseSuratReason(''); setSelectedSuratToClose(null); }} style={{ width: 'auto', padding: '0.5rem 1rem' }}>Batal</button>
              <button onClick={handleCloseSuratSubmit} style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--warning-color)' }}>Konfirmasi Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
