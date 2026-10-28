import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { Activity, CheckCircle, Clock, Download, BarChart2, Table, Trash2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import { SOP_DAYS, addWorkingDays } from '../../utils/dateUtils';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState({ totalFiles: 0, completedFiles: 0, activeFiles: 0 });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tabel');
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedFileToClose, setSelectedFileToClose] = useState(null);
  const [closeReason, setCloseReason] = useState('');
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const dashRes = await api.get('/reports/dashboard');
        setAnalytics(dashRes.data);

        const filesRes = await api.get('/reports/files');
        setFiles(filesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const calculateSLA = (createdAt, nama_kegiatan) => {
    const masuk = new Date(createdAt);
    const sopDaysTarget = SOP_DAYS[nama_kegiatan] || 15;
    const jatuhTempo = addWorkingDays(masuk, sopDaysTarget);
    
    const hariIni = new Date();
    const isOverdue = hariIni > jatuhTempo;
    const formatDate = (date) => date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return {
      tanggalMasuk: formatDate(masuk),
      tanggalJatuhTempo: formatDate(jatuhTempo),
      isOverdue
    };
  };

  const handleExport = () => {
    const excelData = files.map((f, index) => {
      const sla = calculateSLA(f.created_at, f.nama_kegiatan);
      return {
        'No': index + 1,
        'Nomor Berkas': `${f.nomor_berkas}/${f.tahun_berkas}`,
        'Pemohon': f.nama_pemohon,
        'Kegiatan': f.nama_kegiatan,
        'Posisi Terakhir': (f.current_location === 'Selesai' || f.current_location === 'Ditutup') 
          ? f.current_location 
          : (f.is_transit === 1 ? `Sedang Transit ke ${f.transit_to_fullname || f.transit_to_username}` : f.current_location),
        'Pemegang Terakhir': f.latest_scan_info || '-',
        'Status Selesai': f.current_location === 'Selesai' ? 'Selesai' : (f.current_location === 'Ditutup' ? 'Ditutup' : 'Sedang Diproses'),
        'Tanggal Masuk': sla.tanggalMasuk,
        'Jatuh Tempo': sla.tanggalJatuhTempo,
        'Status SLA': f.current_location === 'Selesai' ? 'Aman (Selesai)' : (sla.isOverdue ? 'TERLAMBAT (Overdue)' : 'Aman (On-Track)')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Berkas");
    XLSX.writeFile(workbook, `Laporan_SLA_Berkas_${new Date().getTime()}.xlsx`);
  };

  if (loading) return <div className="container"><div className="spinner"></div></div>;

  const filteredFiles = files.filter(f => {
    if (!searchTerm) return true;
    const sla = calculateSLA(f.created_at, f.nama_kegiatan);
    const searchLower = searchTerm.toLowerCase();
    const nomorLengkap = `${f.nomor_berkas}/${f.tahun_berkas}`.toLowerCase();
    return (
      nomorLengkap.includes(searchLower) ||
      f.nama_pemohon.toLowerCase().includes(searchLower) ||
      sla.tanggalMasuk.toLowerCase().includes(searchLower) ||
      sla.tanggalJatuhTempo.toLowerCase().includes(searchLower) ||
      f.current_location.toLowerCase().includes(searchLower) ||
      (f.latest_scan_info && f.latest_scan_info.toLowerCase().includes(searchLower))
    );
  });

  const roleStr = localStorage.getItem('role') || '';
  const isAdmin = roleStr.includes('Administrator');
  const isExecutive = roleStr.includes('Executive');

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>{isAdmin ? 'Admin Dashboard' : 'Executive Dashboard'}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleExport} style={{ width: 'auto', background: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Unduh Laporan
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/admin/users')} style={{ width: 'auto', background: 'var(--accent-color)' }}>
              Manajemen Pengguna
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
            <Activity size={32} color="var(--primary-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Total Berkas</p>
            <h2 style={{ margin: 0 }}>{analytics.totalFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
            <CheckCircle size={32} color="var(--accent-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Selesai</p>
            <h2 style={{ margin: 0 }}>{analytics.completedFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
            <Clock size={32} color="var(--warning-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Aktif (Proses)</p>
            <h2 style={{ margin: 0 }}>{analytics.activeFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <Lock size={32} color="var(--error-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Ditutup</p>
            <h2 style={{ margin: 0 }}>{analytics.closedFiles || 0}</h2>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Seluruh Berkas Sistem</h2>
          <div style={{ width: '300px' }}>
            <input 
              type="text" 
              placeholder="Cari Tgl Masuk, Jatuh Tempo, Pemohon..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ fontSize: '0.8rem' }}>
              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>No. Berkas</th>
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
              const slaStatus = isDone ? 'Aman' : (sla.isOverdue ? 'Overdue' : 'On-Track');
              
              return (
                <tr key={f.id}>
                  <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{f.nomor_berkas}/{f.tahun_berkas}</td>
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
                      background: slaStatus === 'Overdue' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                      color: slaStatus === 'Overdue' ? 'var(--error-color)' : 'var(--success-color)',
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
                  {searchTerm ? 'Tidak ada berkas yang cocok dengan pencarian Anda.' : 'Belum ada berkas tercatat.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
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
              style={{ width: '100%', minHeight: '100px', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary" onClick={() => { setCloseModalOpen(false); setCloseReason(''); setSelectedFileToClose(null); }} style={{ width: 'auto', padding: '0.5rem 1rem' }}>Batal</button>
              <button onClick={handleCloseFileSubmit} style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--warning-color)' }}>Konfirmasi Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}