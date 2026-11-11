import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Smartphone, 
  Send, 
  RefreshCw, 
  Search, 
  LogOut, 
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Belum pernah aktif';
  try {
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d)) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 45) return 'Baru saja';
    if (diffSec < 90) return '1 menit lalu';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function WebAppStats() {
  const [data, setData] = useState({
    summary: {
      total_users: 0,
      online_users: 0,
      offline_users: 0,
      active_sessions: 0,
      telegram_connected_users: 0,
      server_time: ''
    },
    users: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/admin/stats');
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      if (isManual) toast.error('Gagal mengambil data statistik web-app');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh interval (15 detik)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleKickUser = async (user) => {
    if (!window.confirm(`Yakin ingin memutuskan sesi login untuk ${user.full_name} (@${user.username})? User akan diminta login kembali.`)) {
      return;
    }

    try {
      const res = await api.post(`/admin/users/${user.id}/kick`);
      toast.success(res.data.message || 'Sesi berhasil diputuskan');
      fetchStats(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memutuskan sesi user');
    }
  };

  const filteredUsers = useMemo(() => {
    return (data.users || []).filter(u => {
      if (activeTab === 'online' && !u.is_online) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term)) ||
        (u.last_ip && u.last_ip.toLowerCase().includes(term))
      );
    });
  }, [data.users, activeTab, searchTerm]);

  const onlineList = useMemo(() => {
    return (data.users || []).filter(u => u.is_online);
  }, [data.users]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <style>{`
        .stats-badge-pulse {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .stats-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulseGreen 1.8s infinite;
        }
        @keyframes pulseGreen {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        .stats-offline-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94A3B8;
        }
        .stats-metric-card {
          padding: 1.35rem;
          display: flex;
          align-items: center;
          gap: 1.15rem;
          border-radius: 14px;
          position: relative;
          overflow: hidden;
        }
        .stats-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--surface-card);
        }
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }
        .stats-table th {
          background: var(--surface-hover);
          padding: 0.85rem 1rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .stats-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
          vertical-align: middle;
        }
        .stats-table tr:last-child td {
          border-bottom: none;
        }
        .stats-table tr:hover td {
          background: var(--surface-hover);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Web-app Stats & Pengguna Online</h1>
            <span 
              className="stats-badge-pulse"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <span className="stats-pulse-dot" /> Live Monitoring
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Pantau jumlah dan identitas staf/petugas yang sedang aktif mengakses aplikasi secara *real-time*.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              fontSize: '0.82rem', 
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
              marginBottom: 0
            }}
          >
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ margin: 0 }}
            />
            Auto-refresh (15s)
          </label>

          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="secondary"
            style={{
              width: 'auto',
              padding: '0.45rem 0.95rem',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Memperbarui...' : 'Segarkan Data'}
          </button>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Card 1: Pengguna Online */}
        <div className="glass-panel stats-metric-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
            <Radio size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pengguna Online
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10B981', lineHeight: 1.15, marginTop: '2px' }}>
              {data.summary.online_users}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Aktif dalam 5 menit terakhir
            </div>
          </div>
        </div>

        {/* Card 2: Total Pengguna */}
        <div className="glass-panel stats-metric-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Akun Terdaftar
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {data.summary.total_users}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {data.summary.offline_users} akun sedang offline
            </div>
          </div>
        </div>

        {/* Card 3: Sesi Perangkat Aktif */}
        <div className="glass-panel stats-metric-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', flexShrink: 0 }}>
            <Smartphone size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sesi Perangkat Aktif
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {data.summary.active_sessions}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Perangkat online terhubung
            </div>
          </div>
        </div>

        {/* Card 4: Koneksi Telegram */}
        <div className="glass-panel stats-metric-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9', flexShrink: 0 }}>
            <Send size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bot Telegram Terhubung
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {data.summary.telegram_connected_users}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Menerima notif kiriman berkas
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {/* Controls Bar: Tabs & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.3rem', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('online')}
              style={{
                width: 'auto',
                padding: '0.45rem 1rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: activeTab === 'online' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'online' ? '#10B981' : 'var(--text-muted)',
                boxShadow: activeTab === 'online' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <span className="stats-pulse-dot" /> Sedang Online ({onlineList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                width: 'auto',
                padding: '0.45rem 1rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: activeTab === 'all' ? 'var(--surface-card)' : 'transparent',
                color: activeTab === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Semua Pengguna ({data.users.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama, role, atau IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '2.4rem',
                marginBottom: 0,
                height: '38px',
                fontSize: '0.85rem',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
            Memuat status pengguna online...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {activeTab === 'online' ? '🌙' : '🔍'}
            </div>
            <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-main)' }}>
              {activeTab === 'online' ? 'Tidak Ada Pengguna Online' : 'Pengguna Tidak Ditemukan'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {activeTab === 'online' 
                ? 'Saat ini tidak ada staf yang sedang aktif di sistem dalam 5 menit terakhir.'
                : 'Coba ubah kata kunci pencarian Anda.'}
            </p>
          </div>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th>Status</th>
                  <th>Pengguna</th>
                  <th>Peran / Jabatan</th>
                  <th>Waktu Terakhir Aktif</th>
                  <th>Alamat IP</th>
                  <th>Sesi</th>
                  <th>Telegram</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const roles = (user.role || '').split(',').map(r => r.trim()).filter(Boolean);
                  return (
                    <tr key={user.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {idx + 1}
                      </td>

                      {/* Status */}
                      <td>
                        {user.is_online ? (
                          <span 
                            className="stats-badge-pulse"
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <span className="stats-pulse-dot" /> Online
                          </span>
                        ) : (
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              background: 'rgba(148, 163, 184, 0.1)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <span className="stats-offline-dot" /> Offline
                          </span>
                        )}
                      </td>

                      {/* User Info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt="Avatar"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid var(--border-color)',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: user.is_online ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #64748B, #475569)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}
                            >
                              {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.25 }}>
                              {user.full_name}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '240px' }}>
                          {roles.map(r => (
                            <span
                              key={r}
                              className="badge"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                background: r === 'Administrator' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                color: r === 'Administrator' ? 'var(--error-color)' : 'var(--primary-color)',
                                fontWeight: 600
                              }}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Last Active */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: user.is_online ? '#10B981' : 'var(--text-main)' }}>
                            {formatRelativeTime(user.last_active_at)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} title={formatFullDate(user.last_active_at)}>
                            {formatFullDate(user.last_active_at)}
                          </span>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.78rem', 
                            fontFamily: 'monospace',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {user.last_ip || '-'}
                        </span>
                      </td>

                      {/* Sessions */}
                      <td>
                        <span 
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            background: user.session_count > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                            color: user.session_count > 0 ? 'var(--primary-color)' : 'var(--text-muted)'
                          }}
                        >
                          {user.session_count} {user.session_count === 1 ? 'Perangkat' : 'Perangkat'}
                        </span>
                      </td>

                      {/* Telegram Status */}
                      <td>
                        {user.telegram_connected ? (
                          <span style={{ fontSize: '0.74rem', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Terhubung
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <XCircle size={13} /> Belum
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        {user.session_count > 0 && (
                          <button
                            type="button"
                            onClick={() => handleKickUser(user)}
                            className="secondary"
                            style={{
                              width: 'auto',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.75rem',
                              color: 'var(--error-color)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Putuskan sesi login user ini"
                          >
                            <LogOut size={12} /> Putus Sesi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>
            Menampilkan <strong>{filteredUsers.length}</strong> dari <strong>{data.users.length}</strong> pengguna
          </span>
          {lastUpdated && (
            <span>
              Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
