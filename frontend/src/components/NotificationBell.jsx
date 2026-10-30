import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, VolumeX, Scan, ExternalLink, Send, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { parseSQLiteDate } from '../utils/dateUtils';

// Fungsi Web Audio API untuk membunyikan nada lonceng notifikasi lembut (tanpa butuh file mp3 eksternal)
export function playNotificationChime() {
  try {
    const isMuted = localStorage.getItem('notif_sound_muted') === 'true';
    if (isMuted) return false;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Nada 1 (Ding - E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.46);

    // Nada 2 (Dong tinggi - B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.16);
    gain2.gain.setValueAtTime(0.001, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.86);

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 1000);
    return true;
  } catch (e) {
    return false;
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [transitFiles, setTransitFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notif_sound_muted') === 'true');
  const [isRinging, setIsRinging] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pendingSoundRef = useRef(false);

  const triggerRingAnimation = () => {
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 1800);
  };

  const fetchNotifications = useCallback(async (isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (isManual) setLoading(true);
    try {
      const res = await api.get('/notifications/transit');
      const items = Array.isArray(res.data) ? res.data : [];
      setTransitFiles(items);

      // Cek apakah ada berkas kiriman baru yang belum pernah diberi notifikasi suara di sesi login ini
      let notifiedMap = {};
      try {
        notifiedMap = JSON.parse(sessionStorage.getItem('notified_transit_map') || '{}');
      } catch (e) {
        notifiedMap = {};
      }

      const isInitialSessionCheck = sessionStorage.getItem('notif_initial_checked') !== 'true';
      const newItems = items.filter(item => {
        const key = `${item.id}_${item.transit_at || ''}`;
        return !notifiedMap[key];
      });

      if (newItems.length > 0) {
        newItems.forEach(item => {
          const key = `${item.id}_${item.transit_at || ''}`;
          notifiedMap[key] = true;
        });
        sessionStorage.setItem('notified_transit_map', JSON.stringify(notifiedMap));
        sessionStorage.setItem('notif_initial_checked', 'true');

        triggerRingAnimation();
        const played = playNotificationChime();
        if (!played && localStorage.getItem('notif_sound_muted') !== 'true') {
          pendingSoundRef.current = true;
        }

        if (isInitialSessionCheck && newItems.length > 1) {
          toast(`ðŸ”” Anda memiliki ${items.length} berkas kiriman (Transit) yang menunggu di-scan terima!`, {
            duration: 6000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#f8fafc',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              fontWeight: 500
            }
          });
        } else {
          const latest = newItems[0];
          const sender = latest.transit_by_fullname || latest.transit_by_username || 'Petugas';
          toast(`ðŸ“¦ Berkas Kiriman Masuk: ${latest.nomor_berkas}/${latest.tahun_berkas} dari ${sender}`, {
            duration: 6000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#f8fafc',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              fontWeight: 500
            }
          });
        }
      } else if (isInitialSessionCheck) {
        sessionStorage.setItem('notif_initial_checked', 'true');
      }
    } catch (err) {
      // Abaikan error jaringan latar belakang
    } finally {
      if (isManual) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 20000);

    const handleFocus = () => fetchNotifications(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  // Jika browser sempat menahan autoplay audio saat halaman baru dibuka, bunyikan saat klik pertama
  useEffect(() => {
    const unlockAudio = () => {
      if (pendingSoundRef.current) {
        pendingSoundRef.current = false;
        playNotificationChime();
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleMute = (e) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('notif_sound_muted', String(nextMuted));
    if (!nextMuted) {
      playNotificationChime();
      toast.success('Suara notifikasi diaktifkan');
    } else {
      toast('Suara notifikasi dibisukan', { icon: 'ðŸ”‡' });
    }
  };

  const formatTransitTime = (dateStr) => {
    if (!dateStr) return 'Baru saja';
    const d = parseSQLiteDate(dateStr);
    if (!d || isNaN(d.getTime())) return 'Baru saja';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const count = transitFiles.length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <style>{`
        @keyframes bellSwing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(16deg); }
          30% { transform: rotate(-14deg); }
          45% { transform: rotate(12deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(6deg); }
        }
        .notif-bell-btn {
          width: auto !important;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.55rem 0.9rem;
          background: rgba(15, 23, 42, 0.72) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 999px !important;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .notif-bell-btn:hover {
          background: rgba(30, 41, 59, 0.9) !important;
          border-color: rgba(59, 130, 246, 0.45) !important;
          transform: translateY(-1px);
        }
        .notif-bell-btn.has-unread {
          border-color: rgba(245, 158, 11, 0.45) !important;
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.18);
        }
        .notif-bell-icon-ring {
          animation: bellSwing 0.9s ease-in-out infinite;
          transform-origin: top center;
        }
        .notif-badge-count {
          background: #ef4444;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
        }
      `}</style>

      <button
        type="button"
        className={`notif-bell-btn ${count > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        title={count > 0 ? `${count} Berkas Kiriman Menunggu Diterima` : 'Notifikasi Kiriman Berkas'}
      >
        <Bell
          size={17}
          color={count > 0 ? '#fbbf24' : '#cbd5e1'}
          className={isRinging ? 'notif-bell-icon-ring' : ''}
        />
        {count > 0 && <span className="notif-badge-count">{count}</span>}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '360px',
            maxWidth: '92vw',
            background: 'rgba(15, 23, 42, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 2000,
            overflow: 'hidden',
            textAlign: 'left'
          }}
        >
          {/* Header Dropdown */}
          <div
            style={{
              padding: '0.9rem 1.1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={15} color="#60a5fa" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                Kiriman Berkas ({count})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                title="Perbarui Notifikasi"
                style={{
                  width: 'auto',
                  padding: '0.3rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
              </button>

              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Aktifkan Suara Notifikasi' : 'Bisukan Suara Notifikasi'}
                style={{
                  width: 'auto',
                  padding: '0.3rem 0.6rem',
                  background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                  borderRadius: '8px',
                  color: isMuted ? '#f87171' : '#34d399',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {isMuted ? 'Bisu' : 'Suara Aktif'}
              </button>
            </div>
          </div>

          {/* Daftar Berkas Kiriman */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.6rem' }}>
            {count === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                <Bell size={28} color="#475569" style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
                <p style={{ margin: 0, fontWeight: 500, color: '#cbd5e1' }}>Tidak ada kiriman berkas</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Berkas yang dikirim (Transit) ke meja Anda akan muncul di sini beserta peringatan suara.
                </p>
              </div>
            ) : (
              transitFiles.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem',
                    marginBottom: '0.5rem',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.65)',
                    border: '1px solid rgba(59, 130, 246, 0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#60a5fa' }}>
                      No. {item.nomor_berkas}/{item.tahun_berkas}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={11} /> {formatTransitTime(item.transit_at)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 500, lineHeight: 1.35 }}>
                    {item.nama_kegiatan}
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                    Pemohon: <strong style={{ color: '#cbd5e1' }}>{item.nama_pemohon}</strong>
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    Dikirim oleh: <strong>{item.transit_by_fullname || item.transit_by_username || 'Petugas'}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/file/${encodeURIComponent(item.qr_code)}`);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.42rem 0.6rem',
                        fontSize: '0.76rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <ExternalLink size={13} /> Detail Berkas
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/scan');
                      }}
                      style={{
                        flex: 1,
                        padding: '0.42rem 0.6rem',
                        fontSize: '0.76rem',
                        background: 'var(--primary-color)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Scan size={13} /> Scan Terima
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
