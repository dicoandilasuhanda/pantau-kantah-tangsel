import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { MailPlus, Search, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuratDashboard() {
  const [suratList, setSuratList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurat();
  }, []);

  const fetchSurat = async () => {
    try {
      const response = await api.get('/surat');
      setSuratList(response.data);
    } catch (error) {
      toast.error('Gagal mengambil data surat');
    } finally {
      setLoading(false);
    }
  };

  const filteredSurat = suratList.filter(s => 
    s.nomor_agenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.asal_surat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  };

  // Convert /api to base URL for static files
  const getStaticUrl = (path) => {
    if (!path) return '#';
    const baseUrl = getApiBaseUrl().replace('/api', '');
    return `${baseUrl}${path}`;
  };

  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Monitoring Surat</h1>
          <p>Daftar surat masuk dan arsip digital</p>
        </div>
        {userRoles.includes('Petugas Entry Surat') && (
          <button onClick={() => navigate('/surat/entry')} style={{ width: 'auto' }}>
            <MailPlus size={18} /> Entry Surat Baru
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Nomor Agenda, Asal Surat, atau Perihal..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3rem', marginBottom: 0 }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem' }}>Memuat data surat...</p>
          </div>
        ) : filteredSurat.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Tidak ada data surat yang ditemukan.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>No. Agenda</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Asal Surat</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Nomor Surat</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Tgl Diterima</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Perihal</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Berkas</th>
              </tr>
            </thead>
            <tbody>
              {filteredSurat.map((surat) => (
                <tr key={surat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge">{surat.nomor_agenda}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>{surat.asal_surat}</td>
                  <td style={{ padding: '1rem' }}>{surat.nomor_surat}</td>
                  <td style={{ padding: '1rem' }}>{surat.tanggal_diterima}</td>
                  <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {surat.perihal}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {surat.file_path ? (
                      <a 
                        href={getStaticUrl(surat.file_path)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}
                      >
                        <FileText size={16} /> Buka PDF
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
