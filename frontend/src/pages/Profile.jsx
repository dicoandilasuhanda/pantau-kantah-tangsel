import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Trash2, 
  Upload, 
  Download, 
  FileCode, 
  ArrowLeft, 
  Shield, 
  Folder, 
  Search,
  HardDrive,
  Send,
  Inbox,
  SendHorizontal,
  Lock,
  X,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dwgUploadInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [_loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // DWG state
  const [dwgFiles, setDwgFiles] = useState([]);
  const [loadingDwg, setLoadingDwg] = useState(true);
  const [dwgSearch, setDwgSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'inbox', 'personal', 'sent'

  // Send / Forward Modal state
  const [recipients, setRecipients] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [forwardingFile, setForwardingFile] = useState(null); // null if new upload
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [sendFileInput, setSendFileInput] = useState(null);
  const [sendingDwg, setSendingDwg] = useState(false);

  const rolesList = profile?.role ? profile.role.split(',').map(r => r.trim()).filter(Boolean) : [];
  const hasDwgAccess = rolesList.includes('Asisten Surveyor Kadastral') || 
                       rolesList.includes('Petugas Pemetaan') || 
                       rolesList.includes('Petugas Ukur') || 
                       rolesList.includes('Administrator');

  // Fetch Profile
  const fetchProfile = async () => {
    try {
      const res = await api.get('/user/profile');
      setProfile(res.data);
      if (res.data.avatar_url) {
        localStorage.setItem('avatar_url', res.data.avatar_url);
      } else {
        localStorage.removeItem('avatar_url');
      }
      if (res.data.full_name) {
        localStorage.setItem('full_name', res.data.full_name);
        localStorage.setItem('fullName', res.data.full_name);
      }
      window.dispatchEvent(new Event('profile-update'));
    } catch {
      toast.error('Gagal mengambil data profil');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch DWG Files
  const fetchDwgFiles = async () => {
    try {
      const res = await api.get('/user/dwg');
      setDwgFiles(res.data || []);
    } catch {
      // Ignored if user has no DWG access
    } finally {
      setLoadingDwg(false);
    }
  };

  // Fetch Recipients
  const fetchRecipients = async () => {
    try {
      const res = await api.get('/user/dwg/recipients');
      setRecipients(res.data || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (hasDwgAccess) {
      fetchDwgFiles();
      fetchRecipients();
    } else {
      setLoadingDwg(false);
    }
  }, [hasDwgAccess]);

  // Avatar Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan');
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Ukuran foto maksimal 5 MB');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await api.post('/user/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Foto profil berhasil diperbarui!');
      if (res.data.avatar_url) {
        localStorage.setItem('avatar_url', res.data.avatar_url);
      }
      window.dispatchEvent(new Event('profile-update'));
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah foto profil');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Avatar
  const handleDeleteAvatar = async () => {
    if (!window.confirm('Yakin ingin menghapus foto profil?')) return;
    try {
      await api.delete('/user/profile/avatar');
      toast.success('Foto profil berhasil dihapus');
      localStorage.removeItem('avatar_url');
      window.dispatchEvent(new Event('profile-update'));
      fetchProfile();
    } catch {
      toast.error('Gagal menghapus foto profil');
    }
  };

  // Save to Own Folder (Personal Upload)
  const handleUploadPersonalDwg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'dwg') {
      return toast.error('Hanya berkas berformat AutoCAD (.dwg) yang diperbolehkan');
    }

    if (file.size > 100 * 1024 * 1024) {
      return toast.error('Ukuran file DWG maksimal 100 MB');
    }

    const formData = new FormData();
    formData.append('dwg_file', file);

    const toastId = toast.loading(`Mengunggah "${file.name}"...`);
    try {
      await api.post('/user/dwg', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Berkas "${file.name}" tersimpan di folder pribadi!`, { id: toastId });
      fetchDwgFiles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah berkas DWG', { id: toastId });
    } finally {
      if (dwgUploadInputRef.current) dwgUploadInputRef.current.value = '';
    }
  };

  // Open Send Modal for New File
  const handleOpenSendNew = () => {
    setForwardingFile(null);
    setSendFileInput(null);
    setSelectedRecipientId('');
    setSendNotes('');
    setShowSendModal(true);
  };

  // Open Send Modal to Forward Existing File
  const handleOpenForward = (file) => {
    setForwardingFile(file);
    setSendFileInput(null);
    setSelectedRecipientId('');
    setSendNotes(file.notes || '');
    setShowSendModal(true);
  };

  // Submit Send/Forward
  const handleSendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      return toast.error('Pilih rekan petugas penerima berkas.');
    }

    setSendingDwg(true);
    const toastId = toast.loading('Mengirimkan berkas DWG...');

    try {
      if (forwardingFile) {
        // Forward existing file
        const res = await api.post(`/user/dwg/${forwardingFile.id}/forward`, {
          recipient_id: selectedRecipientId,
          notes: sendNotes
        });
        toast.success(res.data.message || 'Berkas DWG berhasil dikirim!', { id: toastId });
      } else {
        // Upload new file and send
        if (!sendFileInput) {
          toast.dismiss(toastId);
          setSendingDwg(false);
          return toast.error('Pilih file .dwg yang ingin dikirim.');
        }

        const ext = sendFileInput.name.split('.').pop().toLowerCase();
        if (ext !== 'dwg') {
          toast.dismiss(toastId);
          setSendingDwg(false);
          return toast.error('Hanya file berformat .dwg yang diperbolehkan.');
        }

        const formData = new FormData();
        formData.append('dwg_file', sendFileInput);
        formData.append('recipient_id', selectedRecipientId);
        if (sendNotes) formData.append('notes', sendNotes);

        const res = await api.post('/user/dwg/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success(res.data.message || 'Berkas DWG berhasil dikirim!', { id: toastId });
      }

      setShowSendModal(false);
      fetchDwgFiles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim berkas DWG', { id: toastId });
    } finally {
      setSendingDwg(false);
    }
  };

  // Download DWG File
  const handleDownloadDwg = async (id, filename) => {
    try {
      const res = await api.get(`/user/dwg/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh berkas DWG');
    }
  };

  // Delete DWG File
  const handleDeleteDwg = async (id, filename) => {
    if (!window.confirm(`Yakin ingin menghapus berkas "${filename}" dari daftar Anda?`)) return;
    try {
      await api.delete(`/user/dwg/${id}`);
      toast.success('Berkas DWG berhasil dihapus');
      fetchDwgFiles();
    } catch {
      toast.error('Gagal menghapus berkas DWG');
    }
  };

  // Filter DWG files based on search & tab
  const filteredDwg = dwgFiles.filter(f => {
    const matchesSearch = (f.original_name || '').toLowerCase().includes(dwgSearch.toLowerCase()) ||
                          (f.sender_name || '').toLowerCase().includes(dwgSearch.toLowerCase()) ||
                          (f.recipient_name || '').toLowerCase().includes(dwgSearch.toLowerCase()) ||
                          (f.notes || '').toLowerCase().includes(dwgSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'inbox') {
      return f.sender_id !== profile?.id;
    }
    if (activeTab === 'personal') {
      return f.sender_id === profile?.id && (!f.recipient_id || f.recipient_id === profile?.id);
    }
    if (activeTab === 'sent') {
      return f.sender_id === profile?.id && f.recipient_id && f.recipient_id !== profile?.id;
    }
    return true;
  });

  const countInbox = dwgFiles.filter(f => f.sender_id !== profile?.id).length;
  const countPersonal = dwgFiles.filter(f => f.sender_id === profile?.id && (!f.recipient_id || f.recipient_id === profile?.id)).length;
  const countSent = dwgFiles.filter(f => f.sender_id === profile?.id && f.recipient_id && f.recipient_id !== profile?.id).length;
  const totalDwgSize = dwgFiles.reduce((acc, curr) => acc + (curr.file_size || 0), 0);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button 
            type="button" 
            className="secondary" 
            onClick={() => navigate(-1)} 
            style={{ width: 'auto', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>Profil & Berkas Kerja</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Kelola informasi akun Anda dan pertukaran berkas gambar kadastral AutoCAD (.dwg)
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.75rem' }}>
        {/* Section 1: Profil & Avatar */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Avatar Circle with Upload Trigger */}
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1D4ED8, #0B2545)',
                  border: '3px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Foto Profil" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: '#FFFFFF', userSelect: 'none' }}>
                    {(profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Button Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Ganti Foto Profil"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-color)',
                  color: '#FFFFFF',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--surface-card)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                }}
              >
                <Camera size={15} />
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                style={{ display: 'none' }} 
                onChange={handleAvatarChange} 
              />
            </div>

            {/* Profile Info Details */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{profile?.full_name || profile?.username || 'Memuat...'}</h2>
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    className="secondary"
                    style={{
                      width: 'auto',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      color: 'var(--error-color)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <Trash2 size={12} /> Hapus Foto
                  </button>
                )}
              </div>
              <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Username: <strong style={{ color: 'var(--text-main)' }}>@{profile?.username}</strong>
              </p>

              {/* Roles Badges */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Shield size={13} /> Hak Akses:
                </span>
                {rolesList.length === 0 ? (
                  <span className="badge">Petugas</span>
                ) : (
                  rolesList.map(r => (
                    <span 
                      key={r} 
                      className="badge" 
                      style={{ 
                        background: r === 'Administrator' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: r === 'Administrator' ? 'var(--error-color)' : 'var(--primary-color)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Pemeliharaan & Cache Browser */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <RefreshCw size={16} color="var(--primary-color)" /> Pemeliharaan Cache & Sesi Peramban
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Jika tampilan aplikasi terasa tidak sinkron, lambat, atau baru saja ada pembaruan sistem di server, Anda dapat membersihkan cache browser secara aman.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (window.confirm('Bersihkan cache dan muat ulang aplikasi dengan data terbaru?')) {
                if (window.__appSelfRepair) {
                  window.__appSelfRepair();
                } else {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }
              }
            }}
            style={{ width: 'auto', padding: '0.5rem 0.95rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} /> Bersihkan Cache & Muat Ulang
          </button>
        </div>

        {/* Section 2: Ruang Penyimpanan & Pertukaran Berkas DWG */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.25rem' }}>
                <Folder size={22} color="var(--primary-color)" /> Ruang Berkas DWG (AutoCAD)
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Arsip & pertukaran file gambar peta kadastral antara <strong>Petugas Ukur</strong>, <strong>Asisten Surveyor Kadastral</strong>, dan <strong>Petugas Pemetaan</strong>
              </p>
            </div>

            {hasDwgAccess && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => dwgUploadInputRef.current?.click()}
                  style={{
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                  title="Simpan file DWG ke folder pribadi saya"
                >
                  <Upload size={15} /> Simpan ke Pribadi
                </button>
                <input 
                  ref={dwgUploadInputRef} 
                  type="file" 
                  accept=".dwg" 
                  style={{ display: 'none' }} 
                  onChange={handleUploadPersonalDwg} 
                />

                <button
                  type="button"
                  onClick={handleOpenSendNew}
                  style={{
                    width: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1.15rem',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                  title="Kirim berkas DWG ke rekan petugas"
                >
                  <Send size={15} /> Kirim Berkas DWG
                </button>
              </div>
            )}
          </div>

          {!hasDwgAccess ? (
            <div 
              style={{ 
                padding: '2.5rem 1.5rem', 
                textAlign: 'center', 
                border: '1px dashed var(--border-color)', 
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.01)'
              }}
            >
              <div 
                style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1rem',
                  color: 'var(--error-color)'
                }}
              >
                <Lock size={24} />
              </div>
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                Akses Berkas DWG Dibatasi
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                Ruang penyimpanan dan pertukaran berkas format <strong>.dwg (AutoCAD)</strong> ini khusus diperuntukkan bagi petugas dengan peran <strong>Petugas Ukur</strong>, <strong>Asisten Surveyor Kadastral</strong>, dan <strong>Petugas Pemetaan</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className={activeTab === 'all' ? '' : 'secondary'}
                  onClick={() => setActiveTab('all')}
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Semua ({dwgFiles.length})
                </button>
                <button
                  type="button"
                  className={activeTab === 'inbox' ? '' : 'secondary'}
                  onClick={() => setActiveTab('inbox')}
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Inbox size={14} /> Berkas Masuk ({countInbox})
                </button>
                <button
                  type="button"
                  className={activeTab === 'personal' ? '' : 'secondary'}
                  onClick={() => setActiveTab('personal')}
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Folder size={14} /> Folder Pribadi ({countPersonal})
                </button>
                <button
                  type="button"
                  className={activeTab === 'sent' ? '' : 'secondary'}
                  onClick={() => setActiveTab('sent')}
                  style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <SendHorizontal size={14} /> Terkirim ({countSent})
                </button>
              </div>

              {/* Search Bar & Storage Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Search size={16} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Cari berkas / pengirim / catatan..." 
                    value={dwgSearch}
                    onChange={(e) => setDwgSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem', marginBottom: 0, width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <HardDrive size={15} />
                  <span>Total Ukuran: <strong>{formatFileSize(totalDwgSize)}</strong></span>
                </div>
              </div>

              {/* Table / List of DWG Files */}
              {loadingDwg ? (
                <div className="spinner" style={{ margin: '2.5rem auto' }} />
              ) : filteredDwg.length === 0 ? (
                <div 
                  style={{ 
                    padding: '2.5rem 1.5rem', 
                    textAlign: 'center', 
                    border: '2px dashed var(--border-color)', 
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.01)',
                    marginTop: '0.5rem'
                  }}
                >
                  <div 
                    style={{ 
                      width: '52px', 
                      height: '52px', 
                      borderRadius: '50%', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 0.75rem',
                      color: 'var(--primary-color)'
                    }}
                  >
                    <FileCode size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                    {dwgSearch ? 'Tidak ada berkas yang cocok' : 'Belum Ada Berkas di Kategori Ini'}
                  </h3>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {dwgSearch 
                      ? `Tidak ditemukan berkas yang cocok dengan pencarian "${dwgSearch}".` 
                      : 'Mulai dengan menyimpan berkas DWG ke folder pribadi atau kirimkan berkas ke rekan petugas.'}
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Nama Berkas</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Alur / Asal</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Catatan</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Ukuran</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Waktu</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDwg.map((file) => {
                        const isReceived = file.sender_id !== profile?.id;
                        const isSent = file.sender_id === profile?.id && file.recipient_id && file.recipient_id !== profile?.id;

                        return (
                          <tr 
                            key={file.id} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)',
                              background: isReceived ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {/* File Name */}
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div 
                                  style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '6px', 
                                    background: 'rgba(239, 68, 68, 0.12)', 
                                    color: '#EF4444', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    flexShrink: 0
                                  }}
                                >
                                  DWG
                                </div>
                                <div>
                                  <strong style={{ color: 'var(--text-main)', display: 'block', wordBreak: 'break-all' }}>
                                    {file.original_name}
                                  </strong>
                                </div>
                              </div>
                            </td>

                            {/* Alur / Status */}
                            <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                              {isReceived ? (
                                <span 
                                  className="badge" 
                                  style={{ 
                                    background: 'rgba(16, 185, 129, 0.15)', 
                                    color: '#10b981', 
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Inbox size={12} /> Dari: {file.sender_name || 'Petugas'} ({file.sender_role || 'Petugas'})
                                </span>
                              ) : isSent ? (
                                <span 
                                  className="badge" 
                                  style={{ 
                                    background: 'rgba(59, 130, 246, 0.15)', 
                                    color: 'var(--primary-color)', 
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <SendHorizontal size={12} /> Kepada: {file.recipient_name || 'Petugas'} ({file.recipient_role || 'Petugas'})
                                </span>
                              ) : (
                                <span 
                                  className="badge" 
                                  style={{ 
                                    background: 'rgba(255, 255, 255, 0.06)', 
                                    color: 'var(--text-muted)', 
                                    fontSize: '0.74rem'
                                  }}
                                >
                                  Folder Pribadi
                                </span>
                              )}
                            </td>

                            {/* Notes */}
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '200px' }}>
                              {file.notes ? (
                                <span style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>&ldquo;{file.notes}&rdquo;</span>
                              ) : (
                                <span style={{ opacity: 0.4 }}>-</span>
                              )}
                            </td>

                            {/* Size */}
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                              {formatFileSize(file.file_size)}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                              {formatDate(file.uploaded_at)}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDwg(file.id, file.original_name)}
                                  title="Unduh Berkas DWG"
                                  className="secondary"
                                  style={{
                                    width: 'auto',
                                    padding: '0.35rem 0.6rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  <Download size={13} /> Unduh
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenForward(file)}
                                  title="Teruskan / Kirim file ini ke rekan petugas"
                                  className="secondary"
                                  style={{
                                    width: 'auto',
                                    padding: '0.35rem 0.6rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.78rem',
                                    color: 'var(--primary-color)'
                                  }}
                                >
                                  <Send size={13} /> Kirim
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteDwg(file.id, file.original_name)}
                                  title="Hapus Berkas DWG"
                                  style={{
                                    width: 'auto',
                                    padding: '0.35rem 0.6rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: 'transparent',
                                    border: '1px solid var(--error-color)',
                                    color: 'var(--error-color)',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  <Trash2 size={13} /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Kirim / Teruskan Berkas DWG */}
      {showSendModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Send size={18} color="var(--primary-color)" />
                {forwardingFile ? 'Kirim Berkas DWG' : 'Unggah & Kirim Berkas DWG'}
              </h3>
              <button 
                type="button" 
                className="secondary" 
                onClick={() => setShowSendModal(false)} 
                style={{ width: 'auto', padding: '0.25rem', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendSubmit}>
              {/* File details info */}
              {forwardingFile ? (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Berkas yang dikirim:</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>{forwardingFile.original_name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                    Ukuran: {formatFileSize(forwardingFile.file_size)}
                  </span>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Pilih File DWG (.dwg) <span style={{ color: 'var(--error-color)' }}>*</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".dwg" 
                    required 
                    onChange={(e) => setSendFileInput(e.target.files?.[0] || null)}
                    style={{ width: '100%', marginBottom: 0, fontSize: '0.85rem' }} 
                  />
                </div>
              )}

              {/* Recipient Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Tujuan Pengiriman (Petugas Penerima) <span style={{ color: 'var(--error-color)' }}>*</span>
                </label>
                {recipients.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.82rem', color: 'var(--error-color)' }}>
                    Tidak ada petugas penerima yang terdaftar di sistem.
                  </div>
                ) : (
                  <select 
                    value={selectedRecipientId} 
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    <option value="">-- Pilih Petugas Penerima --</option>
                    {recipients.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.full_name} ({r.role}) - @{r.username}
                      </option>
                    ))}
                  </select>
                )}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  * Asisten Surveyor Kadastral mengirim ke Petugas Pemetaan, dan sebaliknya.
                </span>
              </div>

              {/* Notes input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Catatan / Keterangan Berkas <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <textarea 
                  rows={2} 
                  value={sendNotes} 
                  onChange={(e) => setSendNotes(e.target.value)} 
                  placeholder="Contoh: Berkas PBT No. 89/2026 Kelurahan Serpong, mohon verifikasi peta bidangnya"
                  style={{ width: '100%', marginBottom: 0, fontSize: '0.85rem' }} 
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="secondary" 
                  onClick={() => setShowSendModal(false)}
                  style={{ width: 'auto' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={sendingDwg || recipients.length === 0}
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} /> {sendingDwg ? 'Mengirim...' : 'Kirim Berkas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
