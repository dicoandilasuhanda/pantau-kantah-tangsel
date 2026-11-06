import { useState, useEffect } from 'react';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0284c7", "#ea580c", "#65a30d", "#4f46e5", "#14b8a6", "#f59e0b"];
import { User, Clock, Activity, AlertTriangle, Mail, CheckCircle, FileText, Archive } from 'lucide-react';
import Top50Berkas from './Top50Berkas';

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [suratKpiData, setSuratKpiData] = useState({
    summary: { totalSurat: 0, activeSurat: 0, completedSurat: 0, closedSurat: 0 },
    officers: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedSuratUsername, setSelectedSuratUsername] = useState('');
  const [selectedAsalSurat, setSelectedAsalSurat] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // State untuk Tab Aktif: 'kpi', 'kpi-surat', 'top50'
  const [activeTab, setActiveTab] = useState('kpi');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const [berkasRes, suratRes] = await Promise.all([
          api.get('/reports/kpi'),
          api.get('/reports/kpi-surat').catch(() => ({
            data: { summary: { totalSurat: 0, activeSurat: 0, completedSurat: 0, closedSurat: 0 }, officers: [] }
          }))
        ]);
        setKpiData(berkasRes.data || []);
        if (suratRes?.data) {
          setSuratKpiData(suratRes.data);
        }
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

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem auto' }}>
        <div className="skeleton-box" style={{ height: '44px', width: '320px' }}></div>
        <div className="skeleton-box" style={{ height: '320px', width: '100%' }}></div>
      </div>
    );
  }

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

  // --- Data Kinerja Berkas ---
  const selectedUser = selectedUsername ? kpiData.find(u => u.username === selectedUsername) : null;
  const displayBreakdown = selectedUser 
    ? (selectedFileType ? selectedUser.breakdown.filter(b => b.jenisBerkas === selectedFileType) : selectedUser.breakdown)
    : [];
  const displayCount = selectedFileType 
    ? displayBreakdown.reduce((sum, b) => sum + (b.jumlahInteraksi || 0), 0)
    : (selectedUser?.jumlahInteraksi || 0);
  const displayAvgTime = selectedFileType && displayBreakdown.length > 0
    ? displayBreakdown[0].rataRataJam
    : (selectedUser?.rataRataTotalJam || 0);

  // --- Data Kinerja Persuratan ---
  const suratOfficers = suratKpiData.officers || [];
  const suratSummary = suratKpiData.summary || { totalSurat: 0, activeSurat: 0, completedSurat: 0, closedSurat: 0 };
  const selectedSuratOfficer = selectedSuratUsername ? suratOfficers.find(u => u.username === selectedSuratUsername) : null;
  const displaySuratBreakdown = selectedSuratOfficer
    ? (selectedAsalSurat ? selectedSuratOfficer.breakdown.filter(b => b.asalSurat === selectedAsalSurat) : selectedSuratOfficer.breakdown)
    : [];
  const displaySuratCount = selectedAsalSurat
    ? displaySuratBreakdown.reduce((sum, b) => sum + (b.jumlahInteraksi || 0), 0)
    : (selectedSuratOfficer?.jumlahInteraksi || 0);
  const displaySuratAvgTime = selectedAsalSurat && displaySuratBreakdown.length > 0
    ? displaySuratBreakdown[0].rataRataJam
    : (selectedSuratOfficer?.rataRataTotalJam || 0);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      
      {/* Tab Navigasi */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          type="button"
          onClick={() => setActiveTab('kpi')}
          style={{ 
            flex: '1 1 220px', 
            background: activeTab === 'kpi' ? 'var(--primary-color)' : 'var(--surface-card)', 
            color: activeTab === 'kpi' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'kpi' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.25s', fontWeight: 600
          }}
        >
          <Activity size={20} />
          Kinerja Berkas Permohonan
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('kpi-surat')}
          style={{ 
            flex: '1 1 220px', 
            background: activeTab === 'kpi-surat' ? 'var(--primary-color)' : 'var(--surface-card)', 
            color: activeTab === 'kpi-surat' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'kpi-surat' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.25s', fontWeight: 600
          }}
        >
          <Mail size={20} />
          Kinerja Persuratan
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('top50')}
          style={{ 
            flex: '1 1 220px', 
            background: activeTab === 'top50' ? 'var(--warning-color)' : 'var(--surface-card)', 
            color: activeTab === 'top50' ? '#fff' : 'var(--text-muted)',
            border: activeTab === 'top50' ? '1px solid var(--warning-color)' : '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.25s', fontWeight: 600
          }}
        >
          <AlertTriangle size={20} />
          Top 50 Berkas Terlama
        </button>
      </div>

      {/* TAB 1: KINERJA BERKAS PERMOHONAN */}
      {activeTab === 'kpi' && (
        <div className="glass-panel animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Activity size={24} color="var(--primary-color)" /> Dashboard Kinerja Petugas (Berkas Permohonan)
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
              Silakan pilih petugas dari menu tarik-turun di atas untuk menampilkan analitik kinerja berkas.
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
                <div style={{ width: '100%' }}>
                  <div style={{ width: '100%', height: 300 }}>
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
                        <Bar dataKey="rataRataJam" radius={[4, 4, 0, 0]}>
                          {displayBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "1rem", justifyContent: "center" }}>
                    {displayBreakdown.map((entry, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <div style={{ width: "12px", height: "12px", backgroundColor: COLORS[index % COLORS.length], borderRadius: "2px" }}></div>
                        <span>{entry.jenisBerkas}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 2: KINERJA PERSURATAN */}
      {activeTab === 'kpi-surat' && (
        <div className="animate-fade-in">
          {/* Summary Cards Persuratan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.12)', padding: '0.85rem', borderRadius: '12px', color: 'var(--primary-color)' }}>
                <Mail size={26} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Surat Masuk</p>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>{suratSummary.totalSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '0.85rem', borderRadius: '12px', color: 'var(--warning-color)' }}>
                <Clock size={26} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sedang Diproses</p>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>{suratSummary.activeSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: '12px', color: '#10b981' }}>
                <CheckCircle size={26} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Surat Selesai</p>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>{suratSummary.completedSurat}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '0.85rem', borderRadius: '12px', color: '#ef4444' }}>
                <Archive size={26} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ditutup / Diarsipkan</p>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>{suratSummary.closedSurat}</h2>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Mail size={24} color="var(--primary-color)" /> Kinerja Pegawai Terkait Persuratan
              </h2>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 100%', justifyContent: 'flex-end' }}>
                <div style={{ flex: '1 1 250px', maxWidth: '400px' }}>
                  <select 
                    value={selectedSuratUsername} 
                    onChange={(e) => {
                      setSelectedSuratUsername(e.target.value);
                      setSelectedAsalSurat('');
                    }}
                    style={{ marginBottom: 0, width: '100%' }}
                  >
                    <option value="">-- Ringkasan Seluruh Pegawai Persuratan --</option>
                    {suratOfficers.map(u => (
                      <option key={u.username} value={u.username}>{u.roleHint}</option>
                    ))}
                  </select>
                </div>

                {selectedSuratOfficer && (
                  <div style={{ flex: '1 1 250px', maxWidth: '400px' }}>
                    <select 
                      value={selectedAsalSurat} 
                      onChange={(e) => setSelectedAsalSurat(e.target.value)}
                      style={{ marginBottom: 0, width: '100%' }}
                    >
                      <option value="">Semua Asal Surat</option>
                      {selectedSuratOfficer.breakdown.map(b => (
                        <option key={b.asalSurat} value={b.asalSurat}>{b.asalSurat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {suratOfficers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                Belum ada riwayat aktivitas pemindaian / penanganan surat oleh petugas.
              </div>
            ) : !selectedSuratOfficer ? (
              <div>
                {/* Tabel Ringkasan Seluruh Pegawai Persuratan */}
                <div className="table-responsive-wrapper" style={{ marginBottom: '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Nama & Jabatan Pegawai</th>
                        <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Total Surat Ditangani</th>
                        <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Surat Diselesaikan</th>
                        <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Rata-rata Waktu Proses</th>
                        <th style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suratOfficers.map((off) => (
                        <tr key={off.username} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>{off.roleHint}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className="badge">{off.jumlahInteraksi} Surat</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                              {off.selesaiCount || 0} Selesai
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--warning-color)' }}>
                            {formatJam(off.rataRataTotalJam)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <button 
                              type="button" 
                              className="secondary" 
                              onClick={() => setSelectedSuratUsername(off.username)}
                              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grafik Perbandingan Jumlah Surat Ditangani per Pegawai */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.05rem' }}>Perbandingan Jumlah Penanganan Surat per Pegawai</h3>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={suratOfficers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="roleHint" tick={false} stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                          itemStyle={{ color: 'var(--text-main)' }}
                          formatter={(value) => [`${value} Surat`, "Jumlah Penanganan"]}
                        />
                        <Bar dataKey="jumlahInteraksi" radius={[4, 4, 0, 0]}>
                          {suratOfficers.map((entry, index) => (
                            <Cell key={`cell-s-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "1rem", justifyContent: "center" }}>
                    {suratOfficers.map((entry, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <div style={{ width: "12px", height: "12px", backgroundColor: COLORS[index % COLORS.length], borderRadius: "2px" }}></div>
                        <span>{entry.roleHint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <User size={32} color="var(--primary-color)" />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedSuratOfficer.roleHint}</h3>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Surat Ditangani</p>
                      <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)' }}>{displaySuratCount}</h1>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Surat Diselesaikan</p>
                      <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#10b981' }}>{selectedSuratOfficer.selesaiCount || 0}</h2>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Rata-rata Waktu Pemrosesan Surat</p>
                      <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={28} /> {formatJam(displaySuratAvgTime)}
                      </h1>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Rata-rata Waktu per Asal Surat (Jam)</h3>
                  <div style={{ width: '100%' }}>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={displaySuratBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="asalSurat" tick={false} stroke="var(--text-muted)" />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--text-main)' }}
                            formatter={(value) => [formatJam(value), "Rata-rata Waktu"]}
                          />
                          <Bar dataKey="rataRataJam" radius={[4, 4, 0, 0]}>
                            {displaySuratBreakdown.map((entry, index) => (
                              <Cell key={`cell-sb-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "1rem", justifyContent: "center" }}>
                      {displaySuratBreakdown.map((entry, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          <div style={{ width: "12px", height: "12px", backgroundColor: COLORS[index % COLORS.length], borderRadius: "2px" }}></div>
                          <span>{entry.asalSurat} ({entry.jumlahInteraksi} surat)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TOP 50 BERKAS TERLAMA */}
      {activeTab === 'top50' && <Top50Berkas />}

    </div>
  );
}
