import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, ShieldAlert, Eye, EyeOff, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVAILABLE_ROLES = [
  'Administrator',
  'Executive Dashboard',
  'Petugas Entry Surat',
  'Petugas Entry Berkas',
  'Petugas Entry Berkas PHP',
  'Petugas Ukur',
  'Petugas Pemetaan',
  'Petugas Alih Media',
  'Koordinator Kelompok Substansi Pengukuran dan Pemetaan Kadastral',
  'Asisten Surveyor Kadastral',
  'Kepala Seksi Survei dan Pemetaan',
  'Petugas Cetak Surat Tugas',
  'Petugas Distribusi Surat Tugas',
  'Petugas Distribusi Berkas Ke Seksi PHP',
  'Petugas Seksi PHP',
  'Petugas Penyelesaian Berkas',
  'Petugas Loket Penyerahan Produk'
];

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#ffe6e6', borderRadius: '8px', margin: '2rem' }}>
          <h2>Something went wrong in UserManagement!</h2>
          <pre style={{ overflowX: 'auto' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ overflowX: 'auto', fontSize: '0.8rem' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function UserManagementWrapper() {
  return (
    <ErrorBoundary>
      <UserManagement />
    </ErrorBoundary>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const [formData, setFormData] = useState({ username: '', full_name: '', password: '', role: 'Petugas Entry Berkas' });
  const [editUserId, setEditUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUserId) {
        // Edit Mode
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // Don't update password if empty
        
        await api.put(`/users/${editUserId}`, payload);
        toast.success('Pengguna berhasil diperbarui!');
        setEditUserId(null);
      } else {
        // Add Mode
        await api.post('/users', formData);
        toast.success('Pengguna berhasil ditambahkan!');
      }
      setFormData({ username: '', full_name: '', password: '', role: 'Petugas Entry Berkas' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan pengguna');
    }
  };

  const handleEditClick = (user) => {
    setEditUserId(user.id);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      password: '', // Kosongkan agar tidak tertimpa kecuali diisi
      role: user.role
    });
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setFormData({ username: '', full_name: '', password: '', role: 'Petugas Entry Berkas' });
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Yakin ingin menghapus pengguna '${username}'?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Pengguna berhasil dihapus');
      fetchUsers();
    } catch (err) {
      toast.error('Gagal menghapus pengguna');
    }
  };

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin')} className="secondary" style={{ width: 'auto' }}>
          &larr; Kembali
        </button>
        <h1 style={{ margin: 0 }}>Manajemen Pengguna</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Form Tambah/Edit User */}
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={24} color={editUserId ? 'var(--warning-color)' : 'var(--primary-color)'} /> 
            {editUserId ? 'Edit Pengguna' : 'Tambah Pengguna'}
          </h2>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nama Lengkap</label>
              <input 
                type="text" 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Password {editUserId && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Kosongkan jika tidak ingin diubah)</span>}
              </label>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editUserId} 
                  style={{ paddingRight: '2.5rem', marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    width: 'auto',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Role / Jabatan (Bisa pilih lebih dari satu)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {AVAILABLE_ROLES.map(roleOption => {
                  const currentRoles = formData.role ? formData.role.split(',').map(r => r.trim()) : [];
                  const isChecked = currentRoles.includes(roleOption);
                  
                  return (
                    <label key={roleOption} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        style={{ marginTop: '0.15rem' }}
                        onChange={(e) => {
                          let newRoles;
                          if (e.target.checked) {
                            newRoles = [...currentRoles, roleOption];
                          } else {
                            newRoles = currentRoles.filter(r => r !== roleOption);
                          }
                          setFormData({ ...formData, role: newRoles.join(', ') });
                        }}
                      />
                      <span style={{ flex: 1 }}>{roleOption}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" style={{ flex: 1, background: editUserId ? 'var(--warning-color)' : 'var(--primary-color)' }}>
                {editUserId ? 'Update Pengguna' : 'Simpan Pengguna'}
              </button>
              {editUserId && (
                <button type="button" className="secondary" onClick={cancelEdit} style={{ flex: 1 }}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabel Daftar User */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ShieldAlert size={24} color="var(--accent-color)" /> Daftar Sistem
            </h2>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Cari nama atau username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', marginBottom: 0, width: '100%' }}
              />
            </div>
          </div>
          {loading ? (
            <div className="spinner" style={{ margin: '2rem auto' }}></div>
          ) : (
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem' }}>Username</th>
                    <th style={{ padding: '1rem' }}>Nama Lengkap</th>
                    <th style={{ padding: '1rem' }}>Role</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Tidak ada pengguna yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}><strong>{u.username}</strong></td>
                      <td style={{ padding: '1rem' }}>{u.full_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {u.role ? u.role.split(',').map(r => r.trim()).map(role => (
                            <span key={role} className="badge" style={{ 
                              background: role === 'Administrator' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: role === 'Administrator' ? 'var(--error-color)' : 'var(--primary-color)'
                            }}>
                              {role}
                            </span>
                          )) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'gray' }}>Tidak ada role</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleEditClick(u)}
                            style={{ 
                              background: 'transparent', 
                              border: '1px solid var(--warning-color)',
                              color: 'var(--warning-color)',
                              width: 'auto',
                              padding: '0.4rem 0.8rem',
                              display: 'inline-flex'
                            }}
                          >
                            Edit
                          </button>
                          {u.username !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--error-color)',
                                color: 'var(--error-color)',
                                width: 'auto',
                                padding: '0.4rem 0.8rem',
                                display: 'inline-flex'
                              }}
                            >
                              <Trash2 size={16} /> Hapus
                            </button>
                          )}
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
