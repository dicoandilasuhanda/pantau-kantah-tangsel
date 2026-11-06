import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Clock, MapPin, UserCheck, Calendar, AlertTriangle, Edit2, Save, X, MessageSquare, Play, Pause, Send, Loader2 } from 'lucide-react';
import { SOP_DAYS, getWorkingDays, addWorkingDays, formatDate, getStatusColor, parseSQLiteDate, calculateTotalElapsedDays } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export default function FileDetails() {
  const { qrcode } = useParams();
  const [file, setFile] = useState(null);
  const [disposisiList, setDisposisiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [isAddingDisposisi, setIsAddingDisposisi] = useState(false);
  const [newDisposisiContent, setNewDisposisiContent] = useState('');
  const [savingDisposisi, setSavingDisposisi] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [clientIp, setClientIp] = useState('');
  const [showTransitModal, setShowTransitModal] = useState(false);
  const [transitTarget, setTransitTarget] = useState('');
  const [transitSearch, setTransitSearch] = useState('');
  const [sendingTransit, setSendingTransit] = useState(false);
  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const username = localStorage.getItem('username') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  useEffect(() => {
    document.title = 'Pantau.Kantah Tangsel';
    api.get('/my-ip').then(res => {
      if (res.data?.ip) setClientIp(res.data.ip);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchFileAndDisposisi = async () => {
      try {
        const fileRes = await api.get(`/files/${qrcode}`);
        setFile(fileRes.data);
        if (fileRes.data?.client_ip) {
          setClientIp(fileRes.data.client_ip);
        }
        setNoteContent(fileRes.data.catatan || '');
        
        const dispRes = await api.get(`/files/${qrcode}/disposisi`);
        setDisposisiList(dispRes.data);
        
        try {
          const userRes = await api.get('/users/list');
          setUsersList(userRes.data);
        } catch {}
      } catch (err) {
        setError(err.response?.data?.error || 'Gagal memuat detail berkas');
      } finally {
        setLoading(false);
      }
    };
    fetchFileAndDisposisi();
  }, [qrcode]);

  const handleTransit = async () => {
    if (!transitTarget) {
      toast.error('Pilih nama petugas tujuan');
      return;
    }
    setSendingTransit(true);
    try {
      await api.post(`/files/${qrcode}/transit`, { target_username: transitTarget });
      toast.success('Berkas berhasil dikirim (Transit)');
      setShowTransitModal(false);
      const fileRes = await api.get(`/files/${qrcode}`);
      setFile(fileRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim berkas');
    } finally {
      setSendingTransit(false);
    }
  };

  const handleCancelTransit = async () => {
    if (!window.confirm('Batalkan pengiriman berkas ini?')) return;
    setSendingTransit(true);
    try {
      await api.post(`/files/${qrcode}/cancel-transit`);
      toast.success('Kiriman berkas berhasil dibatalkan');
      const fileRes = await api.get(`/files/${qrcode}`);
      setFile(fileRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membatalkan kiriman');
    } finally {
      setSendingTransit(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      if (file.is_paused) {
        await api.post(`/files/${qrcode}/resume`);
        alert('Perhitungan SOP berhasil dilanjutkan.');
      } else {
        await api.post(`/files/${qrcode}/pause`);
        alert('Perhitungan SOP berhasil diberhentikan sementara.');
      }
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status SOP.');
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      let safeOldNote = (file.catatan || '').replace(/-- Terakhir diubah oleh/g, '-- Ditambahkan oleh');
      let payloadCatatan = safeOldNote;
      if (noteContent.trim() !== '') {
         payloadCatatan = safeOldNote ? safeOldNote + '\n\n' + noteContent : noteContent;
      }

      const response = await api.put(`/files/${qrcode}/note`, { catatan: payloadCatatan });
      setFile(prev => ({ ...prev, catatan: response.data.catatan }));
      setIsEditingNote(false);
    } catch (err) {
      alert('Gagal menyimpan catatan: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditNoteClick = () => {
    setIsEditingNote(true);
    setNoteContent('');
  };

  const handleAddDisposisi = async () => {
    if (!newDisposisiContent.trim()) return;
    setSavingDisposisi(true);
    try {
      await api.post(`/files/${qrcode}/disposisi`, { isi_disposisi: newDisposisiContent });
      const dispRes = await api.get(`/files/${qrcode}/disposisi`);
      setDisposisiList(dispRes.data);
      setNewDisposisiContent('');
      setIsAddingDisposisi(false);
    } catch (err) {
      alert('Gagal menambah disposisi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingDisposisi(false);
    }
  };

  const handleSelesaikanDisposisi = async (id) => {
    try {
      await api.put(`/disposisi/${id}/selesai`);
      const dispRes = await api.get(`/files/${qrcode}/disposisi`);
      setDisposisiList(dispRes.data);
    } catch (err) {
      alert('Gagal update disposisi: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div
        className="container"
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          textAlign: 'center'
        }}
      >
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Loader2 size={44} color="#1D4ED8" className="spin" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Memuat detail berkas...
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Mengambil data histori, status meja, dan riwayat disposisi
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="container"
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem'
        }}
      >
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 8px 24px -4px var(--card-shadow)'
          }}
        >
          <div style={{
            background: '#FEE2E2',
            color: '#DC2626',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
            Gagal Memuat Berkas
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {error}
          </p>
          <button
            className="secondary"
            onClick={() => navigate(-1)}
            style={{ marginTop: '0.5rem', width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <ArrowLeft size={15} /> Kembali
          </button>
        </div>
      </div>
    );
  }

  const createdAtStr = file.created_at ? file.created_at : new Date();
  const latestHistoryDate = (file.history && file.history.length > 0) ? file.history[0].scanned_at : file.created_at;
  const updatedAtStr = latestHistoryDate ? latestHistoryDate : new Date();
  
  const isClosed = file.current_location === 'Ditutup';
  const isDone = file.current_location === 'Selesai';
  const isFileCompleted = isDone || isClosed;

  const sopDaysTarget = SOP_DAYS[file.nama_kegiatan] || 15;
  const targetDate = addWorkingDays(createdAtStr, sopDaysTarget);
  const totalDaysElapsed = isFileCompleted ? calculateTotalElapsedDays(file, updatedAtStr) : calculateTotalElapsedDays(file);
  const isOverdueOverall = !isClosed && totalDaysElapsed > sopDaysTarget;

  const daysAtLocation = getWorkingDays(updatedAtStr);
  const locationStatusColor = getStatusColor(daysAtLocation);

  const latestScanner = (file.history && file.history.length > 0) ? file.history[0].scanned_by_username : null;
  const isMyLocation = (latestScanner === username) || userRoles.some(r => {
    if (r === 'Petugas Entry Berkas') return file.current_location === 'Loket Pendaftaran (Entry)';
    return file.current_location === r;
  }) || userRoles.includes('Administrator');

  const handlePrint = () => {
    document.title = 'Pantau.Kantah Tangsel';
    window.print();
  };

  return (
    <div className="container animate-fade-in print-container">
      <button className="secondary no-print" onClick={() => navigate(-1)} style={{ width: 'auto', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Kembali
      </button>

      {/* Tampilan Cetak Khusus QR (100% Identik dengan Hasil Cetak di EntryForm) */}
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
          <QRCodeSVG 
            value={file.qr_code} 
            size={200} 
            level="H"
            imageSettings={{
              src: '/logo-atr-bpn.png',
              height: 40,
              width: 40,
              excavate: true
            }}
          />
        </div>
        
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{file.nomor_berkas} / {file.tahun_berkas}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{file.nama_kegiatan}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>Pemohon: {file.nama_pemohon}</p>
        {(() => {
          const displayIp = clientIp || file.client_ip || (file.history && file.history.find(h => h.scanned_ip && h.scanned_ip !== 'Unknown')?.scanned_ip) || (file.history && file.history[0]?.scanned_ip);
          return displayIp ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.02em', marginTop: '0.25rem' }}>
              IP: {displayIp}
            </p>
          ) : null;
        })()}
      </div>

      <div className="screen-only-details" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: '1 1 300px' }}>
          <h2>{file.nomor_berkas} / {file.tahun_berkas}</h2>
          <p style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: '500' }}>{file.nama_kegiatan}</p>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Pemohon: {file.nama_pemohon}</p>
          
          {file.is_paused === 1 && !isFileCompleted && (
            <div className="no-print" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning-color)', color: 'var(--warning-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <div style={{ fontSize: '0.9rem' }}>
                <strong>SOP Sedang Di-Pause</strong><br/>
                Argometer waktu SOP saat ini berhenti.
              </div>
            </div>
          )}

          {(!isFileCompleted && userRoles.includes('Administrator')) && (
            <button 
              className="no-print"
              onClick={handleTogglePause} 
              style={{ 
                width: 'auto', 
                background: file.is_paused ? 'var(--success-color)' : 'var(--warning-color)', 
                color: file.is_paused ? '#fff' : '#000',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none'
              }}
            >
              {file.is_paused ? <Play size={16} /> : <Pause size={16} />}
              {file.is_paused ? 'Lanjutkan (Resume) SOP' : 'Berhentikan (Pause) SOP'}
            </button>
          )}

          {/* Kotak Transit hanya muncul jika status berkas belum Selesai */}
          {file.is_transit === 1 && !isFileCompleted ? (
            <div className="no-print" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)' }}>
                <Send size={18} />
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>Sedang Transit</strong><br/>
                  Berkas sedang dikirim ke meja <strong>{file.transit_to_fullname || file.transit_to_username}</strong>.
                </div>
              </div>
              {(username === file.transit_by_username || userRoles.includes('Administrator')) && (
                <button 
                  onClick={handleCancelTransit}
                  disabled={sendingTransit}
                  style={{ background: 'var(--error-color)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                >
                  {sendingTransit ? 'Membatalkan...' : 'Batal Kirim'}
                </button>
              )}
            </div>
          ) : (
            isMyLocation && !isFileCompleted && (
              <div className="no-print" style={{ marginBottom: '1.5rem' }}>
                {showTransitModal ? (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Pilih petugas tujuan:</p>
                    <input 
                      type="text" 
                      placeholder="Cari nama atau posisi petugas..." 
                      value={transitSearch}
                      onChange={(e) => setTransitSearch(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem' }}
                    />
                    <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-color)' }}>
                      {usersList.filter(u => 
                        (u.full_name || u.username).toLowerCase().includes(transitSearch.toLowerCase()) || 
                        (u.role || '').toLowerCase().includes(transitSearch.toLowerCase())
                      ).map(u => (
                        <div 
                          key={u.username}
                          onClick={() => setTransitTarget(u.username)}
                          style={{ 
                            padding: '0.75rem', 
                            cursor: 'pointer', 
                            background: transitTarget === u.username ? 'var(--primary-color)' : 'transparent',
                            color: transitTarget === u.username ? '#fff' : 'var(--text-main)',
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ fontSize: '0.9rem', fontWeight: transitTarget === u.username ? 'bold' : 'normal' }}>
                            {u.full_name || u.username}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: transitTarget === u.username ? 1 : 0.7, marginTop: '0.2rem' }}>
                            {u.role}
                          </div>
                        </div>
                      ))}
                      {usersList.filter(u => 
                        (u.full_name || u.username).toLowerCase().includes(transitSearch.toLowerCase()) || 
                        (u.role || '').toLowerCase().includes(transitSearch.toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          Petugas tidak ditemukan
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleTransit} disabled={sendingTransit} style={{ padding: '0.5rem 1rem' }}>
                        {sendingTransit ? 'Mengirim...' : 'Kirim'}
                      </button>
                      <button className="secondary" onClick={() => setShowTransitModal(false)} disabled={sendingTransit} style={{ padding: '0.5rem 1rem' }}>
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowTransitModal(true)}
                    style={{ 
                      width: 'auto', 
                      background: 'var(--accent-color)', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none'
                    }}
                  >
                    <Send size={16} />
                    Kirim Berkas (Transit)
                  </button>
                )}
              </div>
            )
          )}

          <div className="qr-wrapper" style={{ background: 'white', padding: '1rem', borderRadius: '8px', display: 'inline-block', marginBottom: '1.5rem' }}>
            <QRCodeSVG 
              value={file.qr_code} 
              size={150} 
              level="H"
              imageSettings={{
                src: '/logo-atr-bpn.png',
                height: 32,
                width: 32,
                excavate: true
              }}
            />
          </div>

          <div className="no-print" style={{ marginBottom: '1.5rem' }}>
            <button className="secondary" onClick={handlePrint} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Cetak QR Code
            </button>
          </div>
          
          <div className="no-print" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} color="var(--primary-color)" />
              <strong style={{ color: 'var(--text-main)' }}>Target Selesai (SOP {sopDaysTarget} hari):</strong>
            </div>
            <p style={{ 
              marginLeft: '1.75rem', 
              marginBottom: '0.5rem', 
              color: isClosed ? 'var(--text-muted)' : (isOverdueOverall ? 'var(--error-color)' : 'var(--text-main)'), 
              fontWeight: isOverdueOverall ? 'bold' : 'normal' 
            }}>
              {formatDate(targetDate)} {isClosed ? '(Berkas Ditutup)' : (isOverdueOverall && '(Terlambat)')}
            </p>
            <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min((totalDaysElapsed / sopDaysTarget) * 100, 100)}%`, 
                background: isDone 
                  ? 'var(--success-color)' 
                  : (isClosed ? '#6b7280' : (isOverdueOverall ? 'var(--error-color)' : 'var(--primary-color)'))
              }}></div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>
                {isDone ? 'Diselesaikan dalam:' : (isClosed ? 'Ditutup setelah:' : 'Total berjalan:')} <strong>{totalDaysElapsed} hari kerja</strong>
              </span>
              <span style={{ textAlign: 'right' }}>
                {isDone 
                  ? <strong style={{ color: 'var(--success-color)' }}>Berkas Telah Selesai</strong>
                  : (isClosed 
                    ? <strong style={{ color: '#6b7280' }}>Berkas Telah Ditutup</strong>
                    : <>Termasuk <strong>{daysAtLocation} hari</strong> di {file.current_location} <br/> SOP {sopDaysTarget} hari</>)}
              </span>
            </div>
          </div>
          
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--primary-color)" />
            <span style={{ color: 'var(--text-muted)' }}>Posisi Berkas Saat Ini:</span>
            <span className="badge" style={isClosed ? { background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' } : {}}>
              {file.current_location}
            </span>
          </div>
          
          {!isFileCompleted && (
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', marginLeft: '1.75rem', fontSize: '0.85rem' }}>
              {daysAtLocation >= 3 ? (
                <AlertTriangle size={14} color={locationStatusColor} />
              ) : (
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: locationStatusColor, flexShrink: 0 }}></div>
              )}
              <span style={{ color: locationStatusColor, fontWeight: '500' }}>
                Berkas sudah pada posisi {file.history && file.history.length > 0 ? file.history[0].scanned_by_role : file.current_location} sebanyak {daysAtLocation} hari kerja
              </span>
            </div>
          )}
          
          {/* Catatan Section */}
          <div className="no-print" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
                <MessageSquare size={18} color="var(--primary-color)" /> Catatan Petugas
              </h3>
              {(isMyLocation || userRoles.includes('Administrator')) && !isEditingNote && !isFileCompleted && (
                <button className="secondary" onClick={handleEditNoteClick} style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                  <Edit2 size={14} /> Tambah Catatan
                </button>
              )}
            </div>
            
            {isEditingNote ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea 
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Ketik catatan di sini (misal: Berkas fisik ada di Laci A)..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  disabled={savingNote}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="secondary" onClick={() => { setIsEditingNote(false); setNoteContent(file.catatan || ''); }} disabled={savingNote} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                    <X size={16} /> Batal
                  </button>
                  <button onClick={handleSaveNote} disabled={savingNote} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                    <Save size={16} /> {savingNote ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {file.catatan ? (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: '1.5' }}>{file.catatan}</p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada catatan.</p>
                )}
              </div>
            )}
          </div>

          {/* Disposisi Section */}
          <div className="no-print" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem', color: 'var(--warning-color)' }}>
                <AlertTriangle size={18} /> Disposisi Pimpinan
              </h3>
              {(userRoles.includes('Koordinator') || userRoles.includes('Kepala Seksi') || userRoles.includes('Administrator')) && !isAddingDisposisi && !isFileCompleted && (
                <button className="primary" onClick={() => setIsAddingDisposisi(true)} style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--warning-color)', color: '#000' }}>
                  <Edit2 size={14} /> Tambah Disposisi
                </button>
              )}
            </div>
            
            {isAddingDisposisi && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <textarea 
                  value={newDisposisiContent}
                  onChange={(e) => setNewDisposisiContent(e.target.value)}
                  placeholder="Ketik instruksi/disposisi untuk berkas ini..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  disabled={savingDisposisi}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="secondary" onClick={() => setIsAddingDisposisi(false)} disabled={savingDisposisi} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                    <X size={16} /> Batal
                  </button>
                  <button onClick={handleAddDisposisi} disabled={savingDisposisi} style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--warning-color)', color: '#000' }}>
                    <Save size={16} /> {savingDisposisi ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disposisiList.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Belum ada disposisi pimpinan.</p>
              ) : (
                disposisiList.map(disp => {
                  const isDone = disp.status === 'Sudah Dilaksanakan';
                  return (
                    <div key={disp.id} style={{ 
                      background: isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{disp.dibuat_oleh}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {parseSQLiteDate(disp.dibuat_pada).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 1rem 0', whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {disp.isi_disposisi}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isDone ? 'var(--success-color)' : 'var(--warning-color)'
                        }}>
                          {disp.status}
                        </span>
                        
                        {!isDone && !isFileCompleted ? (
                          <button onClick={() => handleSelesaikanDisposisi(disp.id)} style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                            <UserCheck size={14} /> Tandai Sudah Dilaksanakan
                          </button>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', textAlign: 'right' }}>
                            Oleh: {disp.dilaksanakan_oleh}<br/>
                            Pada: {parseSQLiteDate(disp.dilaksanakan_pada).toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel no-print" style={{ flex: '1 1 400px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Clock size={20} /> Riwayat Perjalanan Berkas
          </h3>
          
          <div style={{ marginTop: '1.5rem', position: 'relative', paddingLeft: '2rem' }}>
            <div style={{
              position: 'absolute',
              top: '1.5rem',
              bottom: '1.5rem',
              left: '11px',
              width: '2px',
              background: 'var(--border-color)',
              zIndex: 1
            }}></div>

            {(() => {
              let displayHistory = file.history ? [...file.history] : [];
              if (file.is_transit === 1 && file.transit_at && !isFileCompleted) {
                displayHistory.unshift({
                  id: 'virtual-transit',
                  location: `Sedang Transit ke ${file.transit_to_fullname || file.transit_to_username}`,
                  scanned_at: file.transit_at,
                  scanned_by_role: `(Dikirim oleh ${file.transit_by_fullname || file.transit_by_username})`
                });
              }
              
              return displayHistory.map((hist, index) => {
                const isLatest = index === 0;
                return (
                <div key={hist.id} style={{ 
                  position: 'relative',
                  marginBottom: index === file.history.length - 1 ? '0' : '1.5rem',
                  padding: '1.25rem', 
                  background: isLatest ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${isLatest ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  zIndex: 2
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '-2rem',
                    top: '1.5rem',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: isLatest ? 'var(--accent-color)' : 'var(--surface-color)',
                    border: `3px solid ${isLatest ? 'var(--accent-color)' : 'var(--text-muted)'}`,
                    boxShadow: isLatest ? '0 0 12px var(--accent-color)' : 'none',
                    transform: 'translateX(4px)',
                    zIndex: 3
                  }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isLatest ? 'var(--accent-color)' : 'var(--text-main)', fontSize: '1.05rem' }}>
                      <MapPin size={18} /> {hist.location}
                    </strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--surface-subtle)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                        {hist.id === 'virtual-transit' && hist.scanned_at ? new Date(hist.scanned_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID') : parseSQLiteDate(hist.scanned_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <UserCheck size={16} style={{ marginTop: '0.1rem' }} /> 
                    <span>
                      {hist.id === 'virtual-transit' ? 'Status :' : (hist.scanned_by_role.includes('Petugas Entry Berkas') ? 'Diterima dan dientri oleh:' : 'Diterima oleh:')} <br/>
                      <strong style={{ color: 'var(--text-main)', display: 'inline-block', marginTop: '0.2rem' }}>{hist.scanned_by_role}</strong>
                    </span>
                  </div>
                </div>
              );
            });
            })()}
          </div>
        </div>
      </div>

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