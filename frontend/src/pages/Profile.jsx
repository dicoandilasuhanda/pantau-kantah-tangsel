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
  CheckCircle,
  Search,
  HardDrive
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
  const dwgInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // DWG files state
  const [dwgFiles, setDwgFiles] = useState([]);
  const [loadingDwg, setLoadingDwg] = useState(true);
  const [uploadingDwg, setUploadingDwg] = useState(false);
  const [dwgSearch, setDwgSearch] = useState('');

  // Fetch Profile & DWG Files
  const fetchProfile = async () => {
    try {
      const res = await api.get('/user/profile');
      setProfile(res.data);
      setFullName(res.data.full_name || '');
      // Update local storage so navbar/hub stays in sync
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

  const fetchDwgFiles = async () => {
    try {
      const res = await api.get('/user/dwg');
      setDwgFiles(res.data || []);
    } catch {
      toast.error('Gagal mengambil daftar file DWG');
    } finally {
      setLoadingDwg(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchDwgFiles();
  }, []);

  // Update Full Name
  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('Nama lengkap tidak boleh kosong');
    setSavingName(true);
    try {
      const res = await api.put('/user/profile', { full_name: fullName.trim() });
      toast.success(res.data.message || 'Profil berhasil diperbarui');
      localStorage.setItem('full_name', fullName.trim());
      localStorage.setItem('fullName', fullName.trim());
      window.dispatchEvent(new Event('profile-update'));
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan profil');
    } finally {
      setSavingName(false);
    }
  };

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

  // Upload DWG File
  const handleDwgUpload = async (e) => {
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

    setUploadingDwg(true);
    try {
      await api.post('/user/dwg', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Berkas "${file.name}" berhasil diunggah!`);
      fetchDwgFiles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengunggah berkas DWG');
    } finally {
      setUploadingDwg(false);
      if (dwgInputRef.current) dwgInputRef.current.value = '';
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
    if (!window.confirm(`Yakin ingin menghapus berkas "${filename}"?`)) return;
    try {
      await api.delete(`/user/dwg/${id}`);
      toast.success('Berkas DWG berhasil dihapus');
      fetchDwgFiles();
    } catch {
      toast.error('Gagal menghapus berkas DWG');
    }
  };

  const filteredDwg = dwgFiles.filter(f => 
    (f.original_name || '').toLowerCase().includes(dwgSearch.toLowerCase())
  );

  const totalDwgSize = dwgFiles.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
  const rolesList = profile?.role ? profile.role.split(',').map(r => r.trim()).filter(Boolean) : [];

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
              Kelola informasi profil akun dan ruang penyimpanan pribadi berkas gambar AutoCAD (.dwg)
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

          {/* Form Ubah Nama Lengkap */}
          <form onSubmit={handleSaveName} style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Nama Lengkap Petugas
              </label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Masukkan nama lengkap Anda"
                style={{ marginBottom: 0, width: '100%' }}
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={savingName || loadingProfile} 
              style={{ width: 'auto', padding: '0.65rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle size={16} /> {savingName ? 'Menyimpan...' : 'Simpan Nama'}
            </button>
          </form>
        </div>

        {/* Section 2: Ruang Penyimpanan Berkas DWG (AutoCAD) */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.25rem' }}>
                <Folder size={22} color="var(--primary-color)" /> Folder Berkas DWG (AutoCAD)
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ruang penyimpanan arsip file gambar kadastral & pemetaan berformat <strong>.dwg</strong> Anda
              </p>
            </div>

            {/* Upload Button */}
            <div>
              <button
                type="button"
                onClick={() => dwgInputRef.current?.click()}
                disabled={uploadingDwg}
                style={{
                  width: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <Upload size={16} />
                {uploadingDwg ? 'Mengunggah...' : 'Unggah Berkas DWG'}
              </button>
              <input 
                ref={dwgInputRef} 
                type="file" 
                accept=".dwg" 
                style={{ display: 'none' }} 
                onChange={handleDwgUpload} 
              />
            </div>
          </div>

          {/* Search Bar & Storage Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
              <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </div>
              <input 
                type="text" 
                placeholder="Cari nama berkas .dwg..." 
                value={dwgSearch}
                onChange={(e) => setDwgSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', marginBottom: 0, width: '100%', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <HardDrive size={15} />
              <span>Total: <strong>{dwgFiles.length} berkas</strong> ({formatFileSize(totalDwgSize)})</span>
            </div>
          </div>

          {/* Table / List of DWG Files */}
          {loadingDwg ? (
            <div className="spinner" style={{ margin: '2.5rem auto' }} />
          ) : filteredDwg.length === 0 ? (
            <div 
              style={{ 
                padding: '3rem 1.5rem', 
                textAlign: 'center', 
                border: '2px dashed var(--border-color)', 
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.01)',
                marginTop: '0.5rem'
              }}
            >
              <div 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1rem',
                  color: 'var(--primary-color)'
                }}
              >
                <FileCode size={28} />
              </div>
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 600 }}>
                {dwgSearch ? 'Tidak ada berkas yang cocok' : 'Belum Ada Berkas DWG Tersimpan'}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                {dwgSearch 
                  ? `Tidak ditemukan berkas yang mengandung kata "${dwgSearch}".` 
                  : 'Klik tombol "Unggah Berkas DWG" di atas untuk menyimpan gambar peta atau kadastral (.dwg) Anda di server.'}
              </p>
              {!dwgSearch && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => dwgInputRef.current?.click()}
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Upload size={14} /> Pilih File Dari Komputer
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nama Berkas</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ukuran</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Waktu Unggah</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDwg.map((file) => (
                    <tr 
                      key={file.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                    >
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
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatFileSize(file.file_size)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                        {formatDate(file.uploaded_at)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadDwg(file.id, file.original_name)}
                            title="Unduh Berkas DWG"
                            className="secondary"
                            style={{
                              width: 'auto',
                              padding: '0.4rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Download size={14} /> Unduh
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDwg(file.id, file.original_name)}
                            title="Hapus Berkas DWG"
                            style={{
                              width: 'auto',
                              padding: '0.4rem 0.65rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'transparent',
                              border: '1px solid var(--error-color)',
                              color: 'var(--error-color)',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
