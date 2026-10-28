import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Clock, AlertTriangle } from 'lucide-react';

export default function Top50Berkas() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/files');
        setFiles(response.data);
      } catch (err) {
        console.error("Failed to load files", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const calculateDurationInHours = (file) => {
    const start = new Date(file.created_at);
    const end = new Date();
    
    let diffMs = end - start;

    const pausedDays = file.total_paused_days || 0;
    diffMs -= (pausedDays * 24 * 60 * 60 * 1000);

    if (file.is_paused === 1 && file.paused_at) {
       const pauseStart = new Date(file.paused_at.replace(' ', 'T') + 'Z');
       diffMs -= (end - pauseStart);
    }

    // Kurangi waktu yang jatuh pada hari Sabtu & Minggu
    let loopDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let weekendMs = 0;
    
    while (loopDate <= endDate) {
      const day = loopDate.getDay();
      if (day === 0 || day === 6) {
        let dayStart = new Date(loopDate);
        let dayEnd = new Date(loopDate);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        let overlapStart = start > dayStart ? start : dayStart;
        let overlapEnd = end < dayEnd ? end : dayEnd;
        
        if (overlapStart < overlapEnd) {
          weekendMs += (overlapEnd - overlapStart);
        }
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }
    
    diffMs -= weekendMs;

    const diffHrs = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHrs);
  };

  const formatJam = (jam) => {
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

  const processFiles = () => {
    // Hanya ambil berkas yang statusnya masih proses (bukan Selesai / Ditutup)
    const filtered = files.filter(
      f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup'
    );

    const withDuration = filtered.map(f => ({
      ...f,
      durationHrs: calculateDurationInHours(f)
    }));

    withDuration.sort((a, b) => b.durationHrs - a.durationHrs);
    return withDuration.slice(0, 50);
  };

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }}></div>;

  const top50 = processFiles();

  return (
    <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <AlertTriangle size={20} color="var(--error-color)" /> Top 50 Berkas Terlama (Masih Proses)
        </h3>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>No</th>
              <th style={{ width: '20%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Nomor Berkas</th>
              <th style={{ width: '25%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Jenis Kegiatan</th>
              <th style={{ width: '15%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Pemohon</th>
              <th style={{ width: '15%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Status Saat Ini</th>
              <th style={{ width: '20%', textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>Waktu Pemrosesan</th>
            </tr>
          </thead>
          <tbody>
            {top50.map((file, index) => (
              <tr key={file.id}>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>{index + 1}</td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  <strong>{file.nomor_berkas}/{file.tahun_berkas}</strong>
                </td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>{file.nama_kegiatan}</td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>{file.nama_pemohon}</td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  <span className="badge badge-warning" style={file.is_transit === 1 ? { color: '#000' } : {}}>
                    {file.is_transit === 1 ? `Sedang Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
                  </span>
                </td>
                <td style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--error-color)', fontWeight: 'bold' }}>
                    <Clock size={16} /> {formatJam(file.durationHrs)}
                  </div>
                </td>
              </tr>
            ))}
            {top50.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Tidak ada berkas yang sedang dalam proses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}