import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  Scan, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  ArrowLeft, 
  ExternalLink,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuratScanner() {
  const [status, setStatus] = useState('scanning'); // 'scanning', 'processing', 'found', 'not_found', 'error'
  const [message, setMessage] = useState('');
  const [scannedSurat, setScannedSurat] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const navigate = useNavigate();
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
    // Support formats: "SURAT:00001", "00001", "agenda:00001", or JSON string
    let agendaTarget = clean;
    if (clean.toUpperCase().startsWith('SURAT:')) {
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
        s.nomor_agenda.toLowerCase() === agendaTarget.toLowerCase() ||
        s.nomor_agenda.toLowerCase() === agendaTarget.padStart(5, '0').toLowerCase() ||
        s.nomor_surat.toLowerCase() === clean.toLowerCase()
      );

      if (match) {
        setScannedSurat(match);
        setStatus('found');
        toast.success(`Surat Agenda ${match.nomor_agenda} ditemukan!`);
      } else {
        setStatus('not_found');
        setMessage(`Tidak ditemukan surat dengan kode/agenda: "${clean}"`);
        toast.error('Surat tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
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

  const restartScanner = () => {
    setScannedSurat(null);
    setStatus('scanning');
    setMessage('');

    if (scannerRef.current && !scannerRef.current.isScanning) {
      const config = { fps: 5, qrbox: { width: 250, height: 250 } };
      scannerRef.current.start({ facingMode: "environment" }, config, handleScanSuccess, () => {})
        .then(() => setIsCameraReady(true))
        .catch(() => {
          setStatus('error');
          setMessage('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.');
        });
    }
  };

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('surat-reader');
    const config = { fps: 5, qrbox: { width: 250, height: 250 } };

    scannerRef.current.start({ facingMode: "environment" }, config, handleScanSuccess, () => {})
      .then(() => setIsCameraReady(true))
      .catch((_err) => {
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
        toast.error('Gagal membaca QR Code dari gambar yang dipilih.');
      }
    }
  };

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
              Pindai kode QR fisik surat untuk langsung melihat rincian agenda dan berkas digital
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
          <div style={{ textAlign: 'left', padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#10b981' }}>
              <CheckCircle size={32} />
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>Data Surat Ditemukan</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nomor Agenda terdaftar dalam sistem</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nomor Agenda</span>
                <span className="badge" style={{ fontSize: '1rem', padding: '0.35rem 0.85rem' }}>{scannedSurat.nomor_agenda}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
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

              {scannedSurat.file_path && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <a 
                    href={getSecureFileUrl(scannedSurat.file_path)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="button"
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    <FileText size={18} /> Buka / Unduh Berkas PDF Surat <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>

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
