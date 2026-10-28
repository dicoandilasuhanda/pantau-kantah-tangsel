import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Clock, MapPin, UserCheck, Calendar, AlertTriangle, Edit2, Save, X, MessageSquare, Play, Pause, Send } from 'lucide-react';
import { SOP_DAYS, getWorkingDays, addWorkingDays, formatDate, getStatusColor, getStatusLabel, parseSQLiteDate, calculateTotalElapsedDays } from '../utils/dateUtils';
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
  const [showTransitModal, setShowTransitModal] = useState(false);
  const [transitTarget, setTransitTarget] = useState('');
  const [transitSearch, setTransitSearch] = useState('');
  const [sendingTransit, setSendingTransit] = useState(false);
  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const username = localStorage.getItem('username') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  useEffect(() => {
    const fetchFileAndDisposisi = async () => {
      try {
        const fileRes = await api.get(`/files/${qrcode}`);
        setFile(fileRes.data);
        setNoteContent(fileRes.data.catatan || '');
        
        const dispRes = await api.get(`/files/${qrcode}/disposisi`);
        setDisposisiList(dispRes.data);
        
        try {
          const userRes = await api.get('/users/list');
          setUsersList(userRes.data);
        } catch(e) {}
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

  if (loading) return <div className="container"><p>Memuat detail...</p></div>;
  if (error) return <div className="container"><div className="alert">{error}</div></div>;

  const createdAtStr = file.created_at ? file.created_at : new Date();
  const latestHistoryDate = (file.history && file.history.length > 0) ? file.history[0].scanned_at : file.created_at;
  const updatedAtStr = latestHistoryDate ? latestHistoryDate : new Date();
  
  const sopDaysTarget = SOP_DAYS[file.nama_kegiatan] || 15;
  const targetDate = addWorkingDays(createdAtStr, sopDaysTarget);
  const totalDaysElapsed = file.current_location === 'Selesai' ? calculateTotalElapsedDays(file, updatedAtStr) : calculateTotalElapsedDays(file);
  const isOverdueOverall = totalDaysElapsed > sopDaysTarget;

  const daysAtLocation = getWorkingDays(updatedAtStr);
  const locationStatusColor = getStatusColor(daysAtLocation);

  const latestScanner = (file.history && file.history.length > 0) ? file.history[0].scanned_by_username : null;
  const isMyLocation = (latestScanner === username) || userRoles.some(r => {
    if (r === 'Petugas Entry Berkas') return file.current_location === 'Loket Pendaftaran (Entry)';
    return file.current_location === r;
  }) || userRoles.includes('Administrator');

  const isFileCompleted = file.current_location === 'Selesai' || file.current_location === 'Ditutup';

  return (
    <div className="container animate-fade-in print-container">
      <button className="secondary no-print" onClick={() => navigate(-1)} style={{ width: 'auto', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Kembali
      </button>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-panel print-target" style={{ flex: '1 1 300px' }}>
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

          {(file.current_location === 'Petugas Cetak Surat Tugas' && !isFileCompleted && (userRoles.includes('Petugas Cetak Surat Tugas') || userRoles.includes('Administrator'))) && (
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
            <QRCodeSVG value={file.qr_code} size={150} />
          </div>

          <div className="no-print" style={{ marginBottom: '1.5rem' }}>
            <button className="secondary" onClick={() => window.print()} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Cetak QR Code
            </button>
          </div>
          
          <div className="no-print" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} color="var(--primary-color)" />
              <strong style={{ color: 'var(--text-main)' }}>Target Selesai (SOP {sopDaysTarget} hari):</strong>
            </div>
            <p style={{ marginLeft: '1.75rem', marginBottom: '0.5rem', color: isOverdueOverall ? 'var(--error-color)' : 'var(--text-main)', fontWeight: isOverdueOverall ? 'bold' : 'normal' }}>
              {formatDate(targetDate)} {isOverdueOverall && '(Terlambat)'}
            </p>
            <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min((totalDaysElapsed / sopDaysTarget) * 100, 100)}%`, 
                background: file.current_location === 'Selesai' 
                  ? 'var(--success-color)' 
                  : (isOverdueOverall ? 'var(--error-color)' : 'var(--primary-color)')
              }}></div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>
                {file.current_location === 'Selesai' ? 'Diselesaikan dalam:' : 'Total berjalan:'} <strong>{totalDaysElapsed} hari kerja</strong>
              </span>
              <span style={{ textAlign: 'right' }}>
                {file.current_location === 'Selesai' 
                  ? <strong style={{ color: 'var(--success-color)' }}>Berkas Telah Selesai</strong>
                  : <>Termasuk <strong>{daysAtLocation} hari</strong> di {file.current_location} <br/> SOP {sopDaysTarget} hari</>}
              </span>
            </div>
          </div>
          
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--primary-color)" />
            <span style={{ color: 'var(--text-muted)' }}>Posisi Berkas Saat Ini:</span>
            <span className="badge">{file.current_location}</span>
          </div>
          
          {file.current_location !== 'Selesai' && (
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
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
        @media print {
          header, nav, footer, .no-print {
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

          .print-target {
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px dashed #000000 !important;
            border-radius: 8px !important;
            padding: 16px !important;
            max-width: 330px !important;
            margin: 0 auto !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
          }

          .print-target h2 {
            color: #000000 !important;
            font-size: 1.3rem !important;
            margin: 0 0 6px 0 !important;
          }

          .print-target p {
            color: #222222 !important;
            font-size: 0.85rem !important;
            margin: 0 0 4px 0 !important;
          }

          .print-target .qr-wrapper {
            margin: 12px auto !important;
            padding: 6px !important;
            display: inline-block !important;
            border: 1px solid #ccc !important;
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}