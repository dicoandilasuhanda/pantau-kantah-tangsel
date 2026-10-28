import { useState, useEffect } from 'react';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0284c7", "#ea580c", "#65a30d", "#4f46e5", "#14b8a6", "#f59e0b"];
import { User, Clock, Activity, AlertTriangle } from 'lucide-react';
import Top50Berkas from './Top50Berkas';

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // State untuk Tab Aktif: 'kpi', 'top50'
  const [activeTab, setActiveTab] = useState('kpi');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const response = await api.get('/reports/kpi');
        setKpiData(response.data);
      } catch (err) {
        console.error("Failed to load KPI data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKPI();
  }, []);

  if (isMobile) {
    return (
      <div className="container animate-fade-in" style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '400px' }}>
          <AlertTriangle size={48} color="var(--warning-color)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Akses Dibatasi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
            Untuk membuka menu Dashboard silahkan akses dari PC/Mac Anda.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }}></div>;
  if (kpiData.length === 0 && activeTab === 'kpi') return <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data aktivitas untuk dianalisis.</div>;

  const selectedUser = selectedUsername ? kpiData.find(u => u.username === selectedUsername) : null;

  const formatJam = (jamValue) => {
    let jam = typeof jamValue === 'string' ? parseFloat(jamValue.replace(',', '.')) : Number(jamValue);
    if (isNaN(jam) || jam === 0) return '0 Menit';
    
    if (jam >= 24) {
      const hariBulat = Math.floor(jam / 24);
      const sisaJam = Math.round(jam - (hariBulat * 24));
      if (sisaJam > 0) {
        return `${hariBulat} Hari ${sisaJam} Jam`;
      }
      return `${hariBulat} Hari`;
    }
    
    if (jam < 1) {
      return `${Math.round(jam * 60)} Menit`;
    }
    
    const jamBulat = Math.floor(jam);
    const menitSisa = Math.round((jam - jamBulat) * 60);
    
    if (menitSisa > 0) {
      return `${jamBulat} Jam ${menitSisa} Menit`;
    }
    return `${jamBulat} Jam`;
  };

  const displayBreakdown = selectedUser 
    ? (selectedFileType ? selectedUser.breakdown.filter(b => b.jenisBerkas === selectedFileType) : selectedUser.breakdown)
    : [];

  const displayCount = selectedFileType 
    ? displayBreakdown.reduce((sum, b) => sum + (b.jumlahInteraksi || 0), 0)
    : (selectedUser?.jumlahInteraksi || 0);

  const displayAvgTime = selectedFileType && displayBreakdown.length > 0
    ? displayBreakdown[0].rataRataJam
    : (selectedUser?.rataRataTotalJam || 0);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      
      {/* Tab Navigasi */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('kpi')}
          style={{ 
            flex: '1 1 250px', 
            background: activeTab === 'kpi' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', 
            color: activeTab === 'kpi' ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s'
          }}
        >
          <Activity size={20} />
          Dashboard Kinerja Petugas
        </button>

        <button 
          onClick={() => setActiveTab('top50')}
          style={{ 
            flex: '1 1 250px', 
            background: activeTab === 'top50' ? 'var(--warning-color)' : 'rgba(255,255,255,0.05)', 
            color: activeTab === 'top50' ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s'
          }}
        >
          <AlertTriangle size={20} />
          Top 50 Berkas Terlama
        </button>
      </div>

      {/* Konten Tab */}
      {activeTab === 'kpi' && (
        <div className="glass-panel animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Activity size={24} color="var(--primary-color)" /> Dashboard Kinerja Petugas
            </h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 100%', justifyContent: 'flex-end' }}>
              <div style={{ flex: '1 1 250px', maxWidth: '400px' }}>
                <select 
                  value={selectedUsername} 
                  onChange={(e) => {
                    setSelectedUsername(e.target.value);
                    setSelectedFileType('');
                  }}
                  style={{ marginBottom: 0, width: '100%' }}
                >
                  <option value="" disabled>-- Pilih Petugas --</option>
                  {kpiData.map(u => (
                    <option key={u.username} value={u.username}>{u.roleHint}</option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div style={{ flex: '1 1 250px', maxWidth: '400px' }}>
                  <select 
                    value={selectedFileType} 
                    onChange={(e) => setSelectedFileType(e.target.value)}
                    style={{ marginBottom: 0, width: '100%' }}
                  >
                    <option value="">Semua Jenis Permohonan</option>
                    {selectedUser.breakdown.map(b => (
                      <option key={b.jenisBerkas} value={b.jenisBerkas}>{b.jenisBerkas}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {!selectedUser ? (
            <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
              Silakan pilih petugas dari menu tarik-turun di atas untuk menampilkan analitik kinerja.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <User size={32} color="var(--primary-color)" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedUser.roleHint}</h3>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '2rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Berkas Ditangani</p>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)' }}>{displayCount}</h1>
                  </div>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Rata-rata Waktu Pemrosesan Berkas</p>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={28} /> {formatJam(displayAvgTime)}
                    </h1>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Rata-rata Waktu per Jenis Berkas (Jam)</h3>
                <div style={{ width: '100%' }}><div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={displayBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="jenisBerkas" tick={false} stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                        formatter={(value) => [formatJam(value), "Rata-rata Waktu"]}
                      />
                       <Bar dataKey="rataRataJam" radius={[4, 4, 0, 0]}> {displayBreakdown.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))} </Bar>
                    </BarChart>
                  </ResponsiveContainer></div><div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "1rem", justifyContent: "center" }}>{displayBreakdown.map((entry, index) => (<div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)" }}><div style={{ width: "12px", height: "12px", backgroundColor: COLORS[index % COLORS.length], borderRadius: "2px" }}></div><span>{entry.jenisBerkas}</span></div>))}</div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {activeTab === 'top50' && <Top50Berkas />}

    </div>
  );
}