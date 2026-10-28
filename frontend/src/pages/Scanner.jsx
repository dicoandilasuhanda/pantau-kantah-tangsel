import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, AlertCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [scannedFileDetails, setScannedFileDetails] = useState(null);
  const [status, setStatus] = useState(''); // 'scanning', 'success', 'error', 'confirming_accept', 'confirming_finish', 'smart_confirming', 'role_selection'
  const [message, setMessage] = useState('');
  const [smartData, setSmartData] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const navigate = useNavigate();
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());
  const scannerRef = useRef(null);

  const handleScanSuccess = async (result) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setScanResult(result);
    setStatus('processing');
    
    try {
      const response = await api.get(`/files/${result}`);
      setScannedFileDetails(response.data);

      if (response.data.current_location === 'Selesai') {
        setStatus('error');
        const msg = 'Berkas ini sudah berstatus Selesai dan tidak dapat diproses lagi.';
        setMessage(msg);
        toast.error(msg);
      } else if (userRoles.length > 1) {
        processScan(result);
      } else {
        setStatus('confirming_accept');
      }
    } catch (err) {
      setStatus('error');
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
      .catch((err) => {
        setStatus('error');
        setMessage('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.');
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.log('Failed to stop scanner', e));
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
      } catch (err) {
        toast.error('Gambar tidak terbaca atau bukan QR Code yang valid.');
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
        const errorMsg = data?.error || 'Gagal memperbarui lokasi berkas.';
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    }
  };



  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Scanner QR Code</h1>
      <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)' }}>
        Pindai QR Code pada berkas untuk mencatat penerimaan oleh: <strong style={{ color: 'var(--primary-color)' }}>{roleStr}</strong>
      </p>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
        {status === 'success' ? (
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
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <AlertCircle size={64} color="var(--error-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ color: 'var(--error-color)' }}>Gagal</h2>
            <p>{message}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/berkas')} style={{ width: 'auto' }}>Ke Monitoring Berkas</button>
              <button className="secondary" onClick={() => window.location.reload()} style={{ width: 'auto' }}>Coba Lagi</button>
            </div>
          </div>
        ) : status === 'smart_confirming' && smartData ? (
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
        ) : status === 'role_selection' && smartData ? (
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
        ) : status === 'confirming_accept' ? (
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
        ) : status === 'processing' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p>Memproses QR Code...</p>
          </div>
        ) : (
          <div style={{ position: 'relative', minHeight: '300px' }}>
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
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Atau unggah gambar QR dari galeri/folder:</p>
              <label className="button secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto', cursor: 'pointer', margin: '0 auto' }}>
                <Upload size={18} /> Pilih Gambar QR
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
