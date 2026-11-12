import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  ArrowLeft, 
  ExternalLink,
  Mail,
  Check,
  Clock,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playScanSuccessSound, playScanErrorSound } from '../utils/audioUtils';

export default function SuratScanner() {
  const [status, setStatus] = useState('scanning'); // 'scanning', 'processing', 'found', 'not_found', 'error'
  const [message, setMessage] = useState('');
  const [scannedSurat, setScannedSurat] = useState(null);
  const [submittingScan, setSubmittingScan] = useState(false);
  const [catatanInput, setCatatanInput] = useState('');

  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim()).filter(Boolean);
  const [selectedRole, setSelectedRole] = useState(() => userRoles[0] || 'Petugas');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scannerRef = useRef(null);

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || '/api';
  };

  const getSecureFileUrl = (filePath) => {
    if (!filePath) return '#';
    const baseUrl = getApiBaseUrl();
    const token = localStorage.getItem('token') || '';
    const filename = filePath.split('/').pop();
    return `${baseUrl}/surat/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  };

  const findSuratFromCode = async (rawCode) => {
    const clean = rawCode.trim();
    let agendaTarget = clean;
    let scannedToken = null;

    if (clean.startsWith('eyJ')) {
      scannedToken = clean;
      try {
        const parts = clean.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.nomor_agenda) {
            agendaTarget = payload.nomor_agenda;
          }
        }
      } catch (e) {
        console.warn('JWT parse notice:', e);
      }
    } else if (clean.toUpperCase().startsWith('SURAT:')) {
      agendaTarget = clean.substring(6).trim();
    } else if (clean.toUpperCase().startsWith('AGENDA:')) {
      agendaTarget = clean.substring(7).trim();
    } else {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.agenda || parsed.nomor_agenda) {
          agendaTarget = (parsed.agenda || parsed.nomor_agenda).toString().trim();
        }
      } catch {
        // Not a JSON, use clean string
      }
    }

    try {
      const res = await api.get('/surat');
      const allSurat = res.data || [];
      const match = allSurat.find(s => 
        (scannedToken && s.qr_code === scannedToken) ||
        (s.nomor_agenda && s.nomor_agenda.toLowerCase() === agendaTarget.toLowerCase()) ||
        (s.nomor_agenda && s.nomor_agenda.toLowerCase() === agendaTarget.padStart(5, '0').toLowerCase()) ||
        (s.nomor_surat && s.nomor_surat.toLowerCase() === clean.toLowerCase())
      );

      if (match) {
        try {
          const detailRes = await api.get(`/surat/${match.id}`);
          setScannedSurat(detailRes.data);
        } catch {
          setScannedSurat(match);
        }
        setStatus('found');
        playScanSuccessSound();
        toast.success(`Surat Agenda ${match.nomor_agenda} ditemukan!`);
      } else {
        setStatus('not_found');
        playScanErrorSound();
        setMessage(`Tidak ditemukan surat dengan kode/agenda: "${clean}"`);
        toast.error('Surat tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      playScanErrorSound();
      setMessage(err.response?.data?.error || 'Gagal memverifikasi data surat');
      toast.error('Gagal mengambil data surat');
    }
  };

  const handleScanSuccess = async (result) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setStatus('processing');
    await findSuratFromCode(result);
  };

  const handleProcessSurat = async (isFinishing = false) => {
    if (!scannedSurat) return;
    setSubmittingScan(true);
    try {
      const res = await api.post('/surat/scan', {
        id: scannedSurat.id,
        nomor_agenda: scannedSurat.nomor_agenda,
        isFinishing,
        selected_role: selectedRole,
        catatan: catatanInput
      });
      setScannedSurat(res.data.surat);
      setCatatanInput('');
      playScanSuccessSound();
      toast.success(res.data.message);
    } catch (err) {
      playScanErrorSound();
      toast.error(err.response?.data?.error || 'Gagal mencatat pemindaian surat');
    } finally {
      setSubmittingScan(false);
    }
  };

  const restartScanner = () => {
    setScannedSurat(null);
    setStatus('scanning');
    setMessage('');
    setCatatanInput('');

    if (scannerRef.current && !scannerRef.current.isScanning) {
      const config = { fps: 5, qrbox: { width: 250, height: 250 } };
      scannerRef.current.start({ facingMode: "environment" }, config, handleScanSuccess, () => {})
        .catch(() => {
          setStatus('error');
          setMessage('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.');
        });
    }
  };

  useEffect(() => {
    const queryId = searchParams.get('id');
    scannerRef.current = new Html5Qrcode('surat-reader');

    if (queryId) {
      setStatus('processing');
      api.get(`/surat/${queryId}`)
        .then(res => {
          setScannedSurat(res.data);
          setStatus('found');
        })
        .catch(() => {
          setStatus('not_found');
          setMessage('Data surat tidak ditemukan.');
        });
      return;
    }

    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    scannerRef.current.start({ facingMode: "environment" }, config, handleScanSuccess, () => {})
      .catch(() => {
        setStatus('error');
        setMessage('Gagal mengakses kamera. Silakan periksa izin kamera atau gunakan fitur unggah gambar.');
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(_e => console.log('Failed to stop surat scanner', _e));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      try {
        const result = await scannerRef.current.scanFile(file, false);
        handleScanSuccess(result);
      } catch {
        playScanErrorSound();
        toast.error('Gagal membaca QR Code dari gambar yang dipilih.');
      }
    }
  };

  const isCompletedOrClosed = scannedSurat && (scannedSurat.current_location === 'Selesai' || scannedSurat.current_location === 'Ditutup');

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button" 
            className="secondary" 
            onClick={() => navigate('/surat')} 
            style={{ width: 'auto', padding: '0.5rem' }}
            title="Kembali ke Daftar Surat"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Scan QR Surat</h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Pindai kode QR surat untuk menerima posisi surat, menindaklanjuti, atau membuka arsip PDF
            </p>

          </div>
        </div>

        <button 
          type="button" 
          className="secondary" 
          onClick={() => navigate('/surat')}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <Mail size={16} /> Daftar Surat
        </button>
      </div>

      {/* Main Scanner Card */}
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        
        {/* Scanner Active Area */}
        <div style={{ display: (status === 'scanning' || status === 'processing') ? 'block' : 'none' }}>
          <div 
            id="surat-reader" 
            style={{ 
              width: '100%', 
              maxWidth: '450px', 
              margin: '0 auto', 
              overflow: 'hidden', 
              borderRadius: '16px', 
              border: '2px solid var(--border-color)',
              background: '#000'
            }} 
          />

          {status === 'processing' && (
            <div style={{ marginTop: '1.25rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <div className="spin" style={{ width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
              Sedang memverifikasi data surat...
            </div>
          )}

          {/* Action Upload File */}
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label className="button secondary" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
              <Upload size={18} /> Unggah Foto QR
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Status Found Result Card */}
        {status === 'found' && scannedSurat && (
          <div style={{ textAlign: 'left', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
                <CheckCircle size={32} />
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>Surat Agenda #{scannedSurat.nomor_agenda}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Posisi Saat Ini: <strong style={{ color: 'var(--primary-color)' }}>{scannedSurat.current_location || 'Petugas Entry Surat'}</strong>
                  </span>
                </div>
              </div>
              <span 
                className="badge" 
                style={{ 
                  background: scannedSurat.current_location === 'Selesai' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : (scannedSurat.current_location === 'Ditutup' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)'),
                  color: scannedSurat.current_location === 'Selesai' 
                    ? '#10b981' 
                    : (scannedSurat.current_location === 'Ditutup' ? '#ef4444' : 'var(--primary-color)')
                }}
              >
                {scannedSurat.current_location || 'Petugas Entry Surat'}
              </span>
            </div>

            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Asal Surat</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{scannedSurat.asal_surat}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Nomor Surat</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{scannedSurat.nomor_surat}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Tanggal Diterima</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{scannedSurat.tanggal_diterima}</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Perihal</span>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.5 }}>{scannedSurat.perihal}</p>
              </div>

              {scannedSurat.catatan && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Catatan Tindak Lanjut</span>
                  <pre style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.84rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{scannedSurat.catatan}</pre>
                </div>
              )}

              {scannedSurat.file_path && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <a 
                    href={getSecureFileUrl(scannedSurat.file_path)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="button secondary"
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <FileText size={18} /> Buka / Unduh Berkas PDF Surat <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>

            {/* Action Panel: Terima / Selesaikan Surat */}
            {!isCompletedOrClosed ? (
              <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Konfirmasi Penerimaan & Tindak Lanjut Surat
                </h4>

                {userRoles.length > 1 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Terima Sebagai Peran/Jabatan:
                    </label>
                    <select 
                      value={selectedRole} 
                      onChange={(e) => setSelectedRole(e.target.value)}
                      style={{ marginBottom: 0 }}
                    >
                      {userRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Catatan Tindak Lanjut / Disposisi (Opsional):
                  </label>
                  <input 
                    type="text" 
                    placeholder="Tambahkan catatan singkat jika diperlukan..." 
                    value={catatanInput}
                    onChange={(e) => setCatatanInput(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={submittingScan}
                    onClick={() => handleProcessSurat(false)}
                    style={{ flex: '1 1 200px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <MapPin size={17} />
                    {submittingScan ? 'Memproses...' : 'Terima & Proses Surat Ini'}
                  </button>
                  <button
                    type="button"
                    disabled={submittingScan}
                    onClick={() => handleProcessSurat(true)}
                    style={{ flex: '1 1 200px', background: '#059669', borderColor: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Check size={17} />
                    Selesaikan Tindak Lanjut
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Surat ini telah berstatus {scannedSurat.current_location}.
              </div>
            )}

            {/* Riwayat Perjalanan Surat */}
            {scannedSurat.history && scannedSurat.history.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} /> Riwayat Perjalanan & Penanganan Surat
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {scannedSurat.history.map((h, idx) => (
                    <div 
                      key={h.id || idx} 
                      style={{ 
                        padding: '0.75rem 1rem', 
                        background: idx === 0 ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>{h.location}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Oleh: {h.scanned_by_role}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(h.scanned_at.includes('T') ? h.scanned_at : h.scanned_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="secondary" 
                onClick={restartScanner}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RotateCcw size={16} /> Scan Surat Lain
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/surat')}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Mail size={16} /> Lihat di Tabel Surat
              </button>
            </div>
          </div>
        )}

        {/* Status Not Found / Error */}
        {(status === 'not_found' || status === 'error') && (
          <div style={{ padding: '2rem 1rem' }}>
            <AlertCircle size={48} color="var(--error-color)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Surat Tidak Ditemukan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
              {message || 'QR Code yang dipindai tidak terdaftar dalam basis data persuratan.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={restartScanner}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RotateCcw size={16} /> Coba Pindai Ulang
              </button>
              <button 
                type="button" 
                className="secondary"
                onClick={() => navigate('/surat')}
                style={{ width: 'auto' }}
              >
                Kembali ke Daftar Surat
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
