import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Clock, Users, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Top10Petugas() {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const response = await api.get('/reports/kpi');
        
        // Sort by rataRataTotalJam descending
        const sorted = response.data.sort((a, b) => b.rataRataTotalJam - a.rataRataTotalJam);
        // Take top 10 and format names
        const top10 = sorted.slice(0, 10).map(u => ({
          ...u,
          displayName: u.roleHint.includes(' (') ? u.roleHint.split(' (')[0] : u.roleHint,
          displayRole: u.roleHint.includes(' (') ? `(${u.roleHint.split(' (')[1]}` : ''
        }));
        
        setKpiData(top10);
      } catch (err) {
        console.error("Failed to load KPI data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKPI();
  }, []);

  const formatJam = (jamValue) => {
    let jam = typeof jamValue === 'string' ? parseFloat(jamValue.replace(',', '.')) : Number(jamValue);
    if (isNaN(jam) || jam === 0) return '0 Menit';
    
    if (jam >= 24) {
      const hariBulat = Math.floor(jam / 24);
      const sisaJam = Math.round(jam - (hariBulat * 24));
      if (sisaJam > 0) return `${hariBulat} Hari ${sisaJam} Jam`;
      return `${hariBulat} Hari`;
    }
    
    if (jam < 1) return `${Math.round(jam * 60)} Menit`;
    
    const jamBulat = Math.floor(jam);
    const menitSisa = Math.round((jam - jamBulat) * 60);
    if (menitSisa > 0) return `${jamBulat} Jam ${menitSisa} Menit`;
    return `${jamBulat} Jam`;
  };

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }}></div>;

  return (
    <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Trophy size={24} color="var(--error-color)" /> 
        <h3 style={{ margin: 0 }}>Top 10 Petugas dengan Rata-rata Pemrosesan Terlama</h3>
      </div>

      <div style={{ overflowX: 'auto', width: '100%', marginBottom: '3rem' }}>
        <table className="table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Rank</th>
              <th style={{ width: '45%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Nama / Jabatan Petugas</th>
              <th style={{ width: '20%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Total Berkas Ditangani</th>
              <th style={{ width: '30%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Rata-rata Waktu Pemrosesan</th>
            </tr>
          </thead>
          <tbody>
            {kpiData.map((user, index) => (
              <tr key={user.username}>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem', fontWeight: 'bold' }}>
                  {index + 1}
                </td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  <strong>{user.displayName}</strong>
                  <br />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.displayRole}</span>
                </td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  {user.jumlahInteraksi} Berkas
                </td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--error-color)', fontWeight: 'bold' }}>
                    <Clock size={16} /> {formatJam(user.rataRataTotalJam)}
                  </div>
                </td>
              </tr>
            ))}
            {kpiData.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Belum ada data kinerja petugas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Visualisasi Grafik Batang */}
      {kpiData.length > 0 && (
        <div style={{ width: '100%', height: 350 }}>
          <h4 style={{ marginBottom: '1rem', textAlign: 'center' }}>Grafik Perbandingan Rata-rata Pemrosesan (Jam)</h4>
          <ResponsiveContainer>
            <BarChart data={kpiData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis dataKey="displayName" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-main)' }}
                formatter={(value) => [formatJam(value), "Rata-rata Waktu"]}
              />
              <Bar dataKey="rataRataTotalJam" name="Rata-rata (Jam)" fill="var(--error-color)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
