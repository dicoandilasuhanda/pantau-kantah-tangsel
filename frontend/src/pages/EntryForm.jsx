import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../utils/api';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EntryForm() {
  const [nomor_berkas, setNomorBerkas] = useState('');
  const [tahun_berkas, setTahunBerkas] = useState(new Date().getFullYear().toString());
  const [nama_kegiatan, setNamaKegiatan] = useState('');
  const [nama_pemohon, setNamaPemohon] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setShowReview(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const fullName = localStorage.getItem('fullName') || localStorage.getItem('full_name');
      const response = await api.post('/files', { 
        nomor_berkas, 
        tahun_berkas, 
        nama_kegiatan, 
        nama_pemohon,
        fullName 
      });
      setSuccessData(response.data);
      setShowReview(false);
      setNomorBerkas('');
      setTahunBerkas(new Date().getFullYear().toString());
      setNamaKegiatan('');
      setNamaPemohon('');
      toast.success('Berkas berhasil didaftarkan dan QR Code telah dibuat!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Gagal mendaftarkan berkas';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in print-container">
      <h1 className="no-print">Entri Berkas Baru</h1>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-panel no-print" style={{ flex: '1 1 400px' }}>
          <h2>Data Berkas</h2>
          
          {error && <div className="alert">{error}</div>}

          {!showReview ? (
            <form onSubmit={handleInitialSubmit}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nomor Berkas (Maks. 6 digit angka)</label>
                  <input 
                    type="text" 
                    value={nomor_berkas} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 6) setNomorBerkas(val);
                    }}
                    placeholder="Contoh: 12345"
                    required
                    minLength="1"
                    maxLength="6"
                    pattern="\d{1,6}"
                    title="Harus berupa angka 1 hingga 6 digit"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tahun</label>
                  <input 
                    type="number" 
                    value={tahun_berkas} 
                    readOnly
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    title="Tahun berkas dikunci ke tahun saat ini"
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nama Kegiatan</label>
                <select value={nama_kegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} required>
                  <option value="" disabled>Pilih Jenis Kegiatan</option>
                  {(userRoles.includes('Petugas Entry Berkas') || userRoles.includes('Administrator')) && (
                    <>
                      <option value="Pengukuran dan Pemetaan Kadastral">Pengukuran dan Pemetaan Kadastral</option>
                      <option value="Pemecahan Bidang">Pemecahan Bidang</option>
                      <option value="Penggabungan Bidang">Penggabungan Bidang</option>
                      <option value="Pemisahan Bidang">Pemisahan Bidang</option>
                      <option value="Penataan Batas">Penataan Batas</option>
                    </>
                  )}
                  {(userRoles.includes('Petugas Entry Berkas PHP') || userRoles.includes('Administrator')) && (
                    <>
                      <option value="Pelepasan Sebagian Hak">Pelepasan Sebagian Hak</option>
                      <option value="Wakaf dari Tanah Yang Sudah Bersertipikat">Wakaf dari Tanah Yang Sudah Bersertipikat</option>
                      <option value="Pendaftaran Tanah Pertama Kali Pemberian Hak">Pendaftaran Tanah Pertama Kali Pemberian Hak</option>
                      <option value="Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak">Pendaftaran Tanah Pertama Kali Pengakuan/Penegasan Hak</option>
                      <option value="Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)">Pendaftaran Tanah Pertama Kali Pemberian Hak (BMN)</option>
                      <option value="Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf">Pendaftaran Tanah Pertama Kali Penegasan Tanah Wakaf</option>
                      <option value="Sertipikat Pengganti Karena Hilang/Lelang Eksekusi">Sertipikat Pengganti Karena Hilang/Lelang Eksekusi</option>
                      <option value="Sertipikat Pengganti Karena Rusak/Lama">Sertipikat Pengganti Karena Rusak/Lama</option>
                      <option value="Permohonan SK">Permohonan SK</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nama Pemohon</label>
                <input 
                  type="text"
                  value={nama_pemohon} 
                  onChange={(e) => setNamaPemohon(e.target.value.toUpperCase())}
                  placeholder="NAMA PEMOHON..."
                  required
                />
              </div>

              <button type="submit">
                Daftarkan & Generate QR Code
              </button>
            </form>
          ) : (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Konfirmasi Pendaftaran</h3>
              <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Mohon periksa kembali data berkas yang akan didaftarkan:</p>
              
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, color: 'var(--text-muted)' }}>Nomor Berkas</div>
                  <div style={{ flex: 2, fontWeight: 'bold' }}>{nomor_berkas} / {tahun_berkas}</div>
                </div>
                <div style={{ display: 'flex', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, color: 'var(--text-muted)' }}>Nama Kegiatan</div>
                  <div style={{ flex: 2, fontWeight: 'bold' }}>{nama_kegiatan}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, color: 'var(--text-muted)' }}>Nama Pemohon</div>
                  <div style={{ flex: 2, fontWeight: 'bold' }}>{nama_pemohon}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={confirmSubmit} disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Memproses...' : 'Setuju'}
                </button>
                <button type="button" className="secondary" onClick={() => setShowReview(false)} disabled={loading} style={{ flex: 1 }}>
                  Tidak, Kembali
                </button>
              </div>
            </div>
          )}
        </div>

        {successData && (
          <div className="glass-panel animate-fade-in qr-result-panel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="no-print" style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>
              <CheckCircle size={48} />
            </div>
            <h3 className="no-print" style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Berhasil Didaftarkan!</h3>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #ccc' }}>
              <QRCodeSVG value={successData.qr_code} size={200} />
            </div>
            
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{successData.nomor_berkas} / {successData.tahun_berkas}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{successData.nama_kegiatan}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>Pemohon: {successData.nama_pemohon}</p>
            
            <button className="secondary no-print" style={{ marginTop: '1.5rem' }} onClick={() => window.print()}>
              Cetak QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
