import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Scan, ExternalLink, Send, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { parseSQLiteDate } from '../utils/dateUtils';

// Fungsi Web Audio API untuk membunyikan nada lonceng pengumuman kantor yang nyaring, jernih, dan berdurasi ~3.2 detik
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Compressor agar suara nyaring dan tegas di speaker PC/laptop tanpa pecah
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, ctx.currentTime);
    compressor.knee.setValueAtTime(12, ctx.currentTime);
    compressor.ratio.setValueAtTime(4, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, ctx.currentTime);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Fungsi pembentuk 1 ketukan lonceng (gabungan gelombang triangle + harmonik sine agar nyaring)
    const playBellNote = (freq, startOffset, duration, volume = 0.75) => {
      const start = ctx.currentTime + startOffset;
      const stop = start + duration;

      // Osilator utama (Triangle - suara tebal & nyaring)
      const oscMain = ctx.createOscillator();
      const gainMain = ctx.createGain();
      oscMain.type = 'triangle';
      oscMain.frequency.setValueAtTime(freq, start);
      gainMain.gain.setValueAtTime(0.001, start);
      gainMain.gain.linearRampToValueAtTime(volume, start + 0.015);
      gainMain.gain.exponentialRampToValueAtTime(0.0008, stop);
      oscMain.connect(gainMain);
      gainMain.connect(compressor);
      oscMain.start(start);
      oscMain.stop(stop + 0.02);

      // Osilator harmonik (Sine 2x frekuensi - denting lonceng jernih)
      const oscHarm = ctx.createOscillator();
      const gainHarm = ctx.createGain();
      oscHarm.type = 'sine';
      oscHarm.frequency.setValueAtTime(freq * 2, start);
      gainHarm.gain.setValueAtTime(0.001, start);
      gainHarm.gain.linearRampToValueAtTime(volume * 0.45, start + 0.01);
      gainHarm.gain.exponentialRampToValueAtTime(0.0005, start + duration * 0.7);
      oscHarm.connect(gainHarm);
      gainHarm.connect(compressor);
      oscHarm.start(start);
      oscHarm.stop(stop);
    };

    // Putaran 1: Nada Chime Pengumuman 4-Nada Naik (C5 - E5 - G5 - C6)
    playBellNote(523.25, 0.00, 0.45, 0.80); // C5
    playBellNote(659.25, 0.24, 0.45, 0.85); // E5
    playBellNote(783.99, 0.48, 0.45, 0.85); // G5
    playBellNote(1046.50, 0.72, 0.90, 0.95); // C6 (Tahan panjang)

    // Putaran 2 (Jeda 0.45 detik lalu ulangi agar benar-benar terdengar oleh petugas)
    playBellNote(523.25, 1.65, 0.45, 0.80); // C5
    playBellNote(659.25, 1.89, 0.45, 0.85); // E5
    playBellNote(783.99, 2.13, 0.45, 0.85); // G5
    playBellNote(1046.50, 2.37, 1.05, 0.95); // C6 (Penutup panjang)

    setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 3600);
    return true;
  } catch (e) {
    return false;
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [transitFiles, setTransitFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tgStatus, setTgStatus] = useState({
    connected: false,
    bot_username: 'pantaukantahtangsel_bot',
    username: localStorage.getItem('username') || ''
  });
  const dropdownRef = useRef(null);
  const pendingSoundRef = useRef(false);

  const fetchTelegramStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get('/notifications/telegram-status');
      if (res.data) setTgStatus(res.data);
    } catch (e) {
      // ignore
    }
  }, []);

  const handleUnlinkTelegram = async () => {
    try {
      await api.post('/notifications/telegram-unlink');
      setTgStatus(prev => ({ ...prev, connected: false, telegram_chat_id: null }));
      toast.success('Koneksi Telegram direset. Silakan klik Hubungkan Notifikasi Telegram HP.');
    } catch (err) {
      toast.error('Gagal mereset koneksi Telegram');
    }
  };

  const triggerRingAnimation = () => {
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 1800);
  };

  const fetchNotifications = useCallback(async (isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Pastikan tidak ada sisa pengaturan mute lama di browser
    localStorage.removeItem('notif_sound_muted');

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
        if (!played) {
          pendingSoundRef.current = true;
        }

        if (isInitialSessionCheck && newItems.length > 1) {
          toast.success(`Anda memiliki ${items.length} berkas kiriman (Transit) yang menunggu di-scan terima!`, {
            duration: 6000
          });
        } else {
          const latest = newItems[0];
          const sender = latest.transit_by_fullname || latest.transit_by_username || 'Petugas';
          toast.success(`Berkas Kiriman Masuk: ${latest.nomor_berkas}/${latest.tahun_berkas} dari ${sender}`, {
            duration: 6000
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

  // Jika browser sempat menahan autoplay audio saat halaman baru dibuka, bunyikan saat klik/sentuhan pertama
  useEffect(() => {
    const unlockAudio = () => {
      if (pendingSoundRef.current) {
        pendingSoundRef.current = false;
        playNotificationChime();
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Tutup dropdown jika klik/sentuh di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      fetchTelegramStatus();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

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
        .notif-dropdown-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 360px;
          max-width: 92vw;
          background: rgba(15, 23, 42, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 2000;
          overflow: hidden;
          text-align: left;
        }
        @media (max-width: 768px) {
          .notif-dropdown-panel {
            position: fixed;
            top: 72px;
            left: 12px;
            right: 12px;
            width: auto;
            max-width: none;
          }
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
        <div className="notif-dropdown-panel">
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
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                Kiriman Berkas ({count})
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              title="Perbarui Notifikasi"
              style={{
                width: 'auto',
                padding: '0.35rem 0.55rem',
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

          {/* Footer Integrasi Bot Telegram */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            {tgStatus.connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    Telegram Terhubung ({tgStatus.telegram_chat_id})
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    style={{
                      width: 'auto',
                      padding: '0.3rem 0.55rem',
                      fontSize: '0.72rem',
                      background: 'rgba(239, 68, 68, 0.14)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '7px',
                      color: '#f87171',
                      fontWeight: 600
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <>
                <a
                  href={`https://t.me/${tgStatus.bot_username || 'pantaukantahtangsel_bot'}?start=link_${encodeURIComponent(tgStatus.username || localStorage.getItem('username') || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '9px',
                    background: 'rgba(56, 189, 248, 0.14)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Send size={13} /> Hubungkan Notifikasi Telegram HP
                </a>
                <span style={{ fontSize: '0.69rem', color: '#64748b', textAlign: 'center' }}>
                  Atau buka <strong>@pantaukantahtangsel_bot</strong> lalu ketik <code>/daftar {tgStatus.username || localStorage.getItem('username') || 'username'}</code>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
