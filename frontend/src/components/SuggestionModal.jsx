import { useState, useEffect } from 'react';
import { 
  X, 
  Lightbulb, 
  Send, 
  Clock, 
  Trash2, 
  Sparkles, 
  Tag, 
  User, 
  Shield, 
  Edit3,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const CATEGORIES = [
  'Fitur Baru',
  'Alur Kerja & Efisiensi SOP',
  'Perbaikan Tampilan (UI/UX)',
  'Integrasi & Otomasi',
  'Laporan & Rekapitulasi Data',
  'Lainnya'
];

const STATUS_LIST = [
  'Menunggu Review',
  'Ditinjau',
  'Diterima',
  'Selesai',
  'Ditolak'
];

function getStatusBadge(status) {
  switch (status) {
    case 'Selesai':
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    case 'Diterima':
      return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
    case 'Ditinjau':
      return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
    case 'Ditolak':
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    case 'Menunggu Review':
    default:
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
  }
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

export default function SuggestionModal({ isOpen, onClose }) {
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);
  const isAdmin = userRoles.includes('Administrator');

  const [activeTab, setActiveTab] = useState('write'); // 'write', 'my', 'all'
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Fitur Baru');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // List of suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Admin status update state
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSuggestions = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/suggestions');
      setSuggestions(res.data || []);
    } catch {
      toast.error('Gagal mengambil daftar saran');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    } else {
      setEditingId(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Judul saran harus diisi');
    if (!description.trim()) return toast.error('Rincian saran harus diisi');

    setSubmitting(true);
    try {
      const res = await api.post('/suggestions', {
        title: title.trim(),
        category,
        description: description.trim()
      });
      toast.success(res.data.message || 'Saran berhasil dikirimkan!');
      setTitle('');
      setDescription('');
      setCategory('Fitur Baru');
      fetchSuggestions();
      setActiveTab('my');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengirim saran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, titleStr) => {
    if (!window.confirm(`Yakin ingin menghapus saran "${titleStr}"?`)) return;
    try {
      await api.delete(`/suggestions/${id}`);
      toast.success('Saran berhasil dihapus');
      fetchSuggestions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus saran');
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditStatus(item.status || 'Menunggu Review');
    setEditAdminNotes(item.admin_notes || '');
  };

  const handleSaveStatus = async (id) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/suggestions/${id}/status`, {
        status: editStatus,
        admin_notes: editAdminNotes.trim()
      });
      toast.success('Status saran berhasil diperbarui');
      setEditingId(null);
      fetchSuggestions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isOpen) return null;

  const currentUsername = localStorage.getItem('username');
  const mySuggestions = suggestions.filter(s => s.username === currentUsername);

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)',
          background: 'var(--surface-card)'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--glass-bg)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}
            >
              <Lightbulb size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                Kotak Saran & Ide Fitur <Sparkles size={16} color="#f59e0b" />
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sumbang ide atau masukan untuk pengembangan aplikasi Pantau.Kantah Tangsel
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="secondary"
            style={{ 
              width: '32px', 
              height: '32px', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div 
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem 0',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--surface-card)',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 0.95rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'write' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'write' ? 'var(--primary-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: 0,
              width: 'auto'
            }}
          >
            <Edit3 size={15} /> Tulis Saran
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 0.95rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'my' ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === 'my' ? 'var(--primary-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: 0,
              width: 'auto'
            }}
          >
            <Clock size={15} /> Saran Saya ({mySuggestions.length})
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              style={{
                padding: '0.5rem 0.95rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'all' ? '2px solid #8b5cf6' : '2px solid transparent',
                color: activeTab === 'all' ? '#8b5cf6' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: 0,
                width: 'auto'
              }}
            >
              <Shield size={15} /> Semua Saran Masuk ({suggestions.length})
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: TULIS SARAN */}
          {activeTab === 'write' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Kategori Saran
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', marginBottom: 0 }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Judul Ide / Fitur
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Fitur riwayat perbaikan peta kadastral / ekspor PDF langsung"
                  style={{ width: '100%', marginBottom: 0 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Rincian Ide / Masukan
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan kebutuhan fitur seperti apa yang Anda harapkan, bagaimana alur kerjanya, dan manfaatnya untuk memudahkan pekerjaan..."
                  rows={4}
                  style={{ width: '100%', marginBottom: 0, resize: 'vertical' }}
                  required
                />
              </div>

              <div 
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                <User size={15} color="var(--primary-color)" />
                <span>
                  Saran akan dikirimkan atas nama akun Anda: <strong>{localStorage.getItem('full_name') || currentUsername}</strong> (@{currentUsername})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="secondary"
                  style={{ width: 'auto', padding: '0.6rem 1.25rem' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    width: 'auto', 
                    padding: '0.6rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Send size={15} /> {submitting ? 'Mengirimkan...' : 'Kirim Saran'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SARAN SAYA */}
          {activeTab === 'my' && (
            <div>
              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Memuat riwayat saran...
                </div>
              ) : mySuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💡</div>
                  <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)' }}>Belum Ada Saran Dikirim</h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
                    Punya ide untuk mempermudah pekerjaan sehari-hari? Tuliskan ide Anda sekarang!
                  </p>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('write')}
                    style={{ width: 'auto', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Edit3 size={15} /> Tulis Saran Baru
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {mySuggestions.map(item => {
                    const badge = getStatusBadge(item.status);
                    return (
                      <div 
                        key={item.id}
                        style={{
                          padding: '1rem 1.15rem',
                          borderRadius: '12px',
                          background: 'var(--surface-hover)',
                          border: '1px solid var(--border-color)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                              <span 
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px',
                                  background: 'var(--surface-card)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Tag size={11} /> {item.category}
                              </span>
                              <span 
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '999px',
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`
                                }}
                              >
                                {item.status}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                &bull; {formatDate(item.created_at)}
                              </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.title}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            title="Hapus saran ini"
                            className="secondary"
                            style={{
                              width: '28px',
                              height: '28px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px',
                              color: 'var(--error-color)',
                              flexShrink: 0
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {item.description}
                        </p>

                        {item.admin_notes && (
                          <div 
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              fontSize: '0.8rem',
                              color: 'var(--text-main)'
                            }}
                          >
                            <strong style={{ color: 'var(--primary-color)', display: 'block', marginBottom: '0.2rem' }}>
                              💬 Tanggapan Administrator:
                            </strong>
                            {item.admin_notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEMUA SARAN MASUK (ADMIN ONLY) */}
          {activeTab === 'all' && isAdmin && (
            <div>
              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Memuat semua saran masuk...
                </div>
              ) : suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Layers size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Belum ada saran masuk dari pengguna.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {suggestions.map(item => {
                    const badge = getStatusBadge(item.status);
                    const isEditingThis = editingId === item.id;

                    return (
                      <div 
                        key={item.id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '12px',
                          background: 'var(--surface-hover)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                              <span 
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px',
                                  background: 'var(--surface-card)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-muted)'
                                }}
                              >
                                {item.category}
                              </span>
                              <span 
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '999px',
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`
                                }}
                              >
                                {item.status}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {formatDate(item.created_at)}
                              </span>
                            </div>

                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.title}
                            </h3>

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <User size={13} />
                              <strong>{item.full_name || item.username}</strong> (@{item.username}) &bull; <span style={{ color: 'var(--primary-color)' }}>{item.role || 'Petugas'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="secondary"
                              style={{
                                width: 'auto',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Edit3 size={13} /> Review
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.title)}
                              className="secondary"
                              style={{
                                width: '28px',
                                height: '28px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--error-color)'
                              }}
                              title="Hapus saran"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {item.description}
                        </p>

                        {/* Admin Notes View */}
                        {!isEditingThis && item.admin_notes && (
                          <div 
                            style={{
                              marginTop: '0.35rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              fontSize: '0.82rem',
                              color: 'var(--text-main)'
                            }}
                          >
                            <strong style={{ color: 'var(--primary-color)', display: 'block', marginBottom: '0.2rem' }}>
                              💬 Tanggapan Admin:
                            </strong>
                            {item.admin_notes}
                          </div>
                        )}

                        {/* Admin Review Inline Editor */}
                        {isEditingThis && (
                          <div 
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.85rem 1rem',
                              borderRadius: '8px',
                              background: 'var(--surface-card)',
                              border: '1px solid var(--primary-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.65rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Ubah Status:
                              </label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                style={{ width: 'auto', marginBottom: 0, padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                              >
                                {STATUS_LIST.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                Tanggapan / Catatan Tindak Lanjut:
                              </label>
                              <textarea
                                value={editAdminNotes}
                                onChange={(e) => setEditAdminNotes(e.target.value)}
                                placeholder="Tuliskan tanggapan atau alasan diterimanya/ditundanya usulan fitur ini..."
                                rows={2}
                                style={{ width: '100%', marginBottom: 0, fontSize: '0.82rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="secondary"
                                style={{ width: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={updatingStatus}
                                onClick={() => handleSaveStatus(item.id)}
                                style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.78rem' }}
                              >
                                {updatingStatus ? 'Menyimpan...' : 'Simpan Status'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
