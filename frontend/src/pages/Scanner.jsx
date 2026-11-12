import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, AlertCircle, Upload, Layers, QrCode, Check, RotateCcw, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { playScanSuccessSound, playScanBeepSound, playScanErrorSound } from '../utils/audioUtils';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [scannedFileDetails, setScannedFileDetails] = useState(null);
  const [status, setStatus] = useState(''); // 'scanning', 'success', 'error', 'confirming_accept', 'confirming_finish', 'smart_confirming', 'role_selection'
  const [message, setMessage] = useState('');
  const [smartData, setSmartData] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Batch Continuous Scan Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchRole, setBatchRole] = useState(() => {
    const r = localStorage.getItem('role') || '';
    const arr = r.split(',').map(x => x.trim()).filter(Boolean);
    return arr[0] || '';
  });
  const [batchHistory, setBatchHistory] = useState([]); // [{ id, qr_code, nomor_berkas, nama_pemohon, status: 'success'|'error', msg, time }]

  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);
  const scannerRef = useRef(null);
  const isBatchModeRef = useRef(isBatchMode);
  const batchRoleRef = useRef(batchRole);
  const lastScannedRef = useRef({ qr: '', time: 0 });
  const isProcessingBatchRef = useRef(false);

  useEffect(() => {
    isBatchModeRef.current = isBatchMode;
  }, [isBatchMode]);

  useEffect(() => {
    batchRoleRef.current = batchRole;
  }, [batchRole]);

  const handleBatchScan = async (qrCode) => {
    const now = Date.now();
    // Hindari scan duplikat beruntun pada QR yang sama dalam 3.5 detik
    if (lastScannedRef.current.qr === qrCode && now - lastScannedRef.current.time < 3500) {
      return;
    }
    if (isProcessingBatchRef.current) return;

    lastScannedRef.current = { qr: qrCode, time: now };
    isProcessingBatchRef.current = true;

    try {
      const fileRes = await api.get(`/files/${qrCode}`);
      const fileData = fileRes.data;
      const fullName = localStorage.getItem('fullName') || localStorage.getItem('full_name');
      const roleToUse = userRoles.length > 1 ? (batchRoleRef.current || userRoles[0]) : userRoles[0];

      const scanRes = await api.post('/files/scan', {
        qr_code: qrCode,
        fullName,
        isFinishing: false,
        selected_role: roleToUse
      });

      const successItem = {
        id: Date.now() + Math.random(),
        qr_code: qrCode,
        nomor_berkas: `${fileData.nomor_berkas}/${fileData.tahun_berkas}`,
        nama_pemohon: fileData.nama_pemohon,
        nama_kegiatan: fileData.nama_kegiatan,
        status: 'success',
        msg: scanRes.data.message || 'Berhasil diterima',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setBatchHistory(prev => [successItem, ...prev]);
      playScanSuccessSound();
      toast.success(`Diterima: Berkas ${fileData.nomor_berkas}/${fileData.tahun_berkas}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Gagal memproses QR Code';
      playScanErrorSound();
      let nomorLabel = 'QR Tidak Dikenal';
      let pemohonLabel = '-';
      try {
        const checkRes = await api.get(`/files/${qrCode}`);
        if (checkRes.data) {
          nomorLabel = `${checkRes.data.nomor_berkas}/${checkRes.data.tahun_berkas}`;
          pemohonLabel = checkRes.data.nama_pemohon;
        }
      } catch {}

      const errItem = {
        id: Date.now() + Math.random(),
        qr_code: qrCode,
        nomor_berkas: nomorLabel,
        nama_pemohon: pemohonLabel,
        status: 'error',
        msg: errMsg,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setBatchHistory(prev => [errItem, ...prev]);
      toast.error(`${nomorLabel}: ${errMsg}`);
    } finally {
      setTimeout(() => {
        isProcessingBatchRef.current = false;
      }, 700);
    }
  };

  const handleScanSuccess = async (result) => {
    if (isBatchModeRef.current) {
      await handleBatchScan(result);
      return;
    }

    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setScanResult(result);
    setStatus('processing');
    
    try {
      const response = await api.get(`/files/${result}`);
      setScannedFileDetails(response.data);

      if (response.data.current_location === 'Selesai' || response.data.current_location === 'Ditutup') {
        setStatus('error');
        playScanErrorSound();
        const msg = `Berkas ini sudah berstatus ${response.data.current_location} dan tidak dapat diproses lagi.`;
        setMessage(msg);
        toast.error(msg);
      } else if (userRoles.length > 1) {
        processScan(result);
      } else {
        playScanBeepSound();
        setStatus('confirming_accept');
      }
    } catch (err) {
      setStatus('error');
      playScanErrorSound();
      const errorMsg = err.response?.data?.error || 'Gagal memeriksa status berkas.';
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('reader');
    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    scannerRef.current.start({ facingMode: "environment" }, config, handleScanSuccess, () => {})
      .then(() => setIsCameraReady(true))
      .catch((_err) => {
        setStatus('error');
        setMessage('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.');
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(_e => console.log('Failed to stop scanner', _e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArr = Array.from(event.target.files);
      if (isBatchMode && filesArr.length > 1) {
        for (const f of filesArr) {
          try {
            const result = await scannerRef.current.scanFile(f, false);
            await handleBatchScan(result);
          } catch {
            playScanErrorSound();
            toast.error(`Gagal membaca QR dari gambar ${f.name}`);
          }
        }
      } else {
        const file = filesArr[0];
        try {
          const result = await scannerRef.current.scanFile(file, false);
          handleScanSuccess(result);
        } catch {
          playScanErrorSound();
          toast.error('Gambar tidak terbaca atau bukan QR Code yang valid.');
        }
      }
      event.target.value = ''; // reset input
    }
  };

  const processScan = async (qr_code, selected_role = null) => {
    setStatus('processing');
    try {
      const fullName = localStorage.getItem('fullName') || localStorage.getItem('full_name');
      const response = await api.post('/files/scan', { qr_code, fullName, isFinishing: false, selected_role });
      setStatus('success');
      setMessage(response.data.message);
      playScanSuccessSound();
      toast.success(`Berhasil! ${response.data.message}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires_smart_confirmation) {
        setStatus('smart_confirming');
        setSmartData(data);
      } else if (data?.requires_role_selection) {
        setStatus('role_selection');
        setSmartData(data);
      } else {
        setStatus('error');
        playScanErrorSound();
        const errorMsg = data?.error || 'Gagal memperbarui lokasi berkas.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    }
  };

  const successBatchCount = batchHistory.filter(item => item.status === 'success').length;

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.4rem' }}>Scanner QR Code</h1>
      <p style={{ textAlign: 'center', marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
        Pindai QR Code pada berkas untuk mencatat penerimaan oleh: <strong style={{ color: 'var(--primary-color)' }}>{roleStr}</strong>
      </p>

      {/* Mode Selector: Satuan vs Batch Beruntun */}
      <div style={{
        display: 'inline-flex',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '0.3rem',
        gap: '0.35rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 8px var(--card-shadow)'
      }}>
        <button
          type="button"
          onClick={() => setIsBatchMode(false)}
          style={{
            width: 'auto',
            margin: 0,
            padding: '0.45rem 1rem',
            borderRadius: '9px',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: !isBatchMode ? '#1D4ED8' : 'transparent',
            color: !isBatchMode ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <QrCode size={16} /> Mode Scan Satuan
        </button>
        <button
          type="button"
          onClick={() => {
            setIsBatchMode(true);
            if (status !== '') {
              window.location.reload();
            }
          }}
          style={{
            width: 'auto',
            margin: 0,
            padding: '0.45rem 1rem',
            borderRadius: '9px',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isBatchMode ? '#10b981' : 'transparent',
            color: isBatchMode ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <Layers size={16} /> Mode Scan Batch (Beruntun)
        </button>
      </div>

      {/* Audio Feedback Indicator & Test Button */}
      <div 
        onClick={() => {
          playScanSuccessSound();
          toast('🔊 Tes Nada Notifikasi Scan Berhasil!', { icon: '🔔' });
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginBottom: '1.25rem',
          padding: '0.3rem 0.75rem',
          background: 'var(--surface-subtle)',
          borderRadius: '999px',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease'
        }}
        title="Klik untuk menguji nada suara notifikasi scan"
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
        <Volume2 size={13} style={{ color: 'var(--primary-color)' }} />
        <span>Suara Notifikasi Scan Aktif</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 600 }}>• Tes Suara</span>
      </div>

      {/* Role Selector untuk User Multi-Jabatan saat Mode Batch */}
      {isBatchMode && userRoles.length > 1 && (
        <div style={{
          width: '100%',
          maxWidth: '500px',
          marginBottom: '1rem',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Terima Sebagai Jabatan:
          </span>
          <select
            value={batchRole}
            onChange={(e) => setBatchRole(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              margin: 0,
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-main)',
              fontSize: '0.84rem'
            }}
          >
            {userRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem' }}>
        {status === 'success' && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={64} color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--accent-color)' }}>Berhasil!</h2>
            <p>{message}</p>
            {scannedFileDetails && (
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                <strong>Berkas:</strong> {scannedFileDetails.nomor_berkas}/{scannedFileDetails.tahun_berkas} <br/>
                <strong>Pemohon:</strong> {scannedFileDetails.nama_pemohon}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/berkas')} style={{ width: 'auto' }}>Ke Monitoring Berkas</button>
              <button className="secondary" onClick={() => window.location.reload()} style={{ width: 'auto' }}>Scan Lagi</button>
            </div>
          </div>
        ) : status === 'error' && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={64} color="var(--error-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--error-color)' }}>Gagal</h2>
            <p>{message}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/berkas')} style={{ width: 'auto' }}>Ke Monitoring Berkas</button>
              <button className="secondary" onClick={() => window.location.reload()} style={{ width: 'auto' }}>Coba Lagi</button>
            </div>
          </div>
        ) : status === 'smart_confirming' && smartData && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={64} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--primary-color)' }}>Konfirmasi Lanjutan</h2>
            <p>Anda sudah pernah men-scan berkas ini sebagai <strong>{smartData.last_used_role}</strong>.</p>
            <p style={{ marginTop: '0.5rem' }}>Apakah Anda ingin melanjutkan berkas ini ke posisi Anda sebagai <strong style={{ color: 'var(--accent-color)' }}>{smartData.suggested_role}</strong>?</p>
            {scannedFileDetails && (
              <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                ({scannedFileDetails.nomor_berkas}/{scannedFileDetails.tahun_berkas})
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => processScan(scanResult, smartData.suggested_role)} style={{ background: 'var(--primary-color)', width: 'auto' }}>Ya, Lanjutkan</button>
              <button className="secondary" onClick={() => setStatus('role_selection')} style={{ width: 'auto' }}>Tidak, Ubah Manual</button>
            </div>
          </div>
        ) : status === 'role_selection' && smartData && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={64} color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--accent-color)' }}>Pilih Posisi Berkas</h2>
            <p>Pilih jabatan Anda untuk memproses berkas ini:</p>
            {scannedFileDetails && (
              <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                ({scannedFileDetails.nomor_berkas}/{scannedFileDetails.tahun_berkas})
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              {smartData.available_roles.map(r => (
                <button key={r} onClick={() => processScan(scanResult, r)} style={{ background: 'var(--surface-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', padding: '0.75rem', width: '100%', textAlign: 'left' }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button className="secondary" onClick={() => navigate('/berkas')} style={{ width: 'auto' }}>Batal</button>
            </div>
          </div>
        ) : status === 'confirming_accept' && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={64} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--primary-color)' }}>Konfirmasi Penerimaan</h2>
            <p>Anda yakin akan menerima berkas ini?</p>
            {scannedFileDetails && (
              <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                ({scannedFileDetails.nomor_berkas}/{scannedFileDetails.tahun_berkas}, Pemohon: {scannedFileDetails.nama_pemohon})
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => processScan(scanResult)} style={{ background: 'var(--primary-color)', width: 'auto' }}>Ya, Terima</button>
              <button className="secondary" onClick={() => navigate('/berkas')} style={{ width: 'auto' }}>Tidak</button>
            </div>
          </div>
        ) : status === 'processing' && !isBatchMode ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p>Memproses QR Code...</p>
          </div>
        ) : (
          <div style={{ position: 'relative', minHeight: '300px' }}>
            {isBatchMode && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '0.85rem',
                textAlign: 'center'
              }}>
                Mode Batch Aktif — Arahkan kamera ke beberapa QR berkas secara beruntun tanpa perlu menutup kamera.
              </div>
            )}

            {!isCameraReady && (
              <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-color)', zIndex: 10, borderRadius: '12px'
              }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Menyiapkan Kamera...</p>
              </div>
            )}
            <div id="reader"></div>
            
            {/* Upload Button */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {isBatchMode ? 'Atau pilih beberapa gambar QR sekaligus dari galeri/folder:' : 'Atau unggah gambar QR dari galeri/folder:'}
              </p>
              <label className="button secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto', cursor: 'pointer', margin: '0 auto' }}>
                <Upload size={18} /> {isBatchMode ? 'Pilih Gambar QR (Bisa Banyak)' : 'Pilih Gambar QR'}
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple={isBatchMode}
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Daftar Riwayat Hasil Scan Batch */}
      {isBatchMode && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '1.25rem 1.5rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#10b981" />
              Hasil Scan Batch ({successBatchCount} diterima)
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {batchHistory.length > 0 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setBatchHistory([])}
                  style={{ width: 'auto', padding: '0.35rem 0.7rem', fontSize: '0.78rem', margin: 0 }}
                >
                  <RotateCcw size={13} /> Bersihkan
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/berkas')}
                style={{ width: 'auto', padding: '0.35rem 0.85rem', fontSize: '0.78rem', margin: 0, background: '#1D4ED8', color: '#fff', border: 'none' }}
              >
                <Check size={14} /> Selesai ({successBatchCount})
              </button>
            </div>
          </div>

          {batchHistory.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              Belum ada berkas yang di-scan pada sesi batch ini.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
              {batchHistory.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: item.status === 'success' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
                    background: item.status === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {item.status === 'success' ? (
                        <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0 }} />
                      ) : (
                        <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                      )}
                      <span>Berkas {item.nomor_berkas}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.nama_pemohon !== '-' ? `Pemohon: ${item.nama_pemohon} • ` : ''}{item.msg}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
