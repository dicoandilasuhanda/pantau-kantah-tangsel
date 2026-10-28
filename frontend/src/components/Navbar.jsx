import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Scan, PlusSquare, Key, X, BarChart2, Home, Mail, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || '';
  const userRoles = role ? role.split(',').map(r => r.trim()) : [];
  const username = localStorage.getItem('username') || 'Pengguna';

  let fullName = localStorage.getItem('full_name') || localStorage.getItem('fullName') || username;
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (userObj.full_name) fullName = userObj.full_name;
  } catch (e) {
    // ignore JSON parse error
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('full_name');
    localStorage.removeItem('fullName');
    sessionStorage.removeItem('session_active');
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error('Semua kolom harus diisi.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Konfirmasi kata sandi tidak cocok.');
    }

    setSavingPassword(true);
    try {
      await api.put('/users/change-password', { oldPassword, newPassword });
      toast.success('Kata sandi berhasil diubah! Silakan login kembali.');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Otomatis logout
      setTimeout(() => {
        handleLogout();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengubah kata sandi');
    } finally {
      setSavingPassword(false);
    }
  };

  const isSuratModule = location.pathname.startsWith('/surat');

  return (
    <>
      <style>{`
        .nav-logout-btn {
          width: auto !important;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.15rem;
          background: rgba(239, 68, 68, 0.1) !important;
          color: #f87171 !important;
          border: 1px solid rgba(239, 68, 68, 0.25) !important;
          border-radius: 999px !important;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .nav-logout-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          border-color: rgba(239, 68, 68, 0.45) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
        }
      `}</style>

      <nav className="navbar">
        <div className="navbar-brand">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: 'default',
              userSelect: 'none'
            }}
          >
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                {fullName}
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                {role || 'Petugas'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Home size={20} /> Hub
          </Link>

          {isSuratModule ? (
            <>
              <Link to="/surat" className={location.pathname === '/surat' ? 'active' : ''}>
                <Mail size={20} /> Surat
              </Link>
              {userRoles.includes('Petugas Entry Surat') && (
                <Link to="/surat/entry" className={location.pathname === '/surat/entry' ? 'active' : ''}>
                  <PlusSquare size={20} /> Entri Surat Baru
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/berkas" className={location.pathname === '/berkas' ? 'active' : ''}>
                <FileText size={20} /> Berkas
              </Link>
              
              {(userRoles.includes('Petugas Entry Berkas') || userRoles.includes('Petugas Entry Berkas PHP')) && (
                <Link to="/entry" className={location.pathname === '/entry' ? 'active' : ''}>
                  <PlusSquare size={20} /> Entri Berkas Baru
                </Link>
              )}

              <Link to="/scan" className={location.pathname === '/scan' ? 'active' : ''}>
                <Scan size={20} /> Scanner QR
              </Link>
            </>
          )}

          {(userRoles.includes('Administrator') || userRoles.some(r => r.includes('Koordinator')) || userRoles.some(r => r.includes('Kepala Seksi'))) && (
            <Link to="/kpi" className={location.pathname === '/kpi' ? 'active' : ''}>
              <BarChart2 size={20} /> Dashboard
            </Link>
          )}

          <button className="secondary" onClick={() => setShowPasswordModal(true)} style={{ padding: '0.5rem 1rem', width: 'auto' }} title="Ubah Kata Sandi">
            <Key size={16} /> Ubah Sandi
          </button>
          
          <button className="nav-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="var(--primary-color)" /> Ubah Kata Sandi
              </h3>
              <button className="secondary" onClick={() => setShowPasswordModal(false)} style={{ width: 'auto', padding: '0.25rem' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Kata Sandi Lama</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', marginBottom: 0 }}
                />
              </div>
            </div>
            
            <button onClick={handleChangePassword} disabled={savingPassword} style={{ width: '100%' }}>
              {savingPassword ? 'Menyimpan...' : 'Simpan Sandi Baru'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}