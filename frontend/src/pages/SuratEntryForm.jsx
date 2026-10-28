import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Save, ArrowLeft, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuratEntryForm() {
  const [formData, setFormData] = useState({
    asal_surat: '',
    nomor_surat: '',
    tanggal_diterima: '',
    perihal: ''
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Hanya file PDF yang diperbolehkan');
        e.target.value = null;
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    submitData.append('asal_surat', formData.asal_surat);
    submitData.append('nomor_surat', formData.nomor_surat);
    submitData.append('tanggal_diterima', formData.tanggal_diterima);
    submitData.append('perihal', formData.perihal);
    if (pdfFile) {
      submitData.append('pdf_file', pdfFile);
    }

    try {
      const response = await api.post('/surat', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`Surat berhasil disimpan. Nomor Agenda: ${response.data.nomor_agenda}`);
      navigate('/surat');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menyimpan surat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="secondary" onClick={() => navigate('/surat')} style={{ width: 'auto', padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ marginBottom: 0 }}>Entry Surat Baru</h1>
          <p>Nomor Agenda akan dibuat otomatis (5 digit angka)</p>
        </div>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Asal Surat <span style={{ color: 'var(--error-color)' }}>*</span></label>
            <input 
              type="text" 
              name="asal_surat" 
              value={formData.asal_surat} 
              onChange={handleInputChange} 
              placeholder="Contoh: Kementerian ATR/BPN Pusat"
              required 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nomor Surat <span style={{ color: 'var(--error-color)' }}>*</span></label>
            <input 
              type="text" 
              name="nomor_surat" 
              value={formData.nomor_surat} 
              onChange={handleInputChange} 
              placeholder="Contoh: 123/UM-100/I/2026"
              required 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tanggal Diterima <span style={{ color: 'var(--error-color)' }}>*</span></label>
            <input 
              type="date" 
              name="tanggal_diterima" 
              value={formData.tanggal_diterima} 
              onChange={handleInputChange} 
              required 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Perihal <span style={{ color: 'var(--error-color)' }}>*</span></label>
            <textarea 
              name="perihal" 
              value={formData.perihal} 
              onChange={handleInputChange} 
              placeholder="Contoh: Undangan Rapat Koordinasi..."
              rows="4"
              required 
            ></textarea>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Upload File PDF Surat</label>
            <div style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '8px', 
              padding: '2rem', 
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: 'block', margin: '0 auto' }}
              />
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Format PDF maksimal 10MB</p>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            <Save size={18} />
            {loading ? 'Menyimpan...' : 'Simpan Surat'}
          </button>
        </form>
      </div>
    </div>
  );
}
