import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Search, MapPin, Clock, FileText, User } from 'lucide-react';
import { getWorkingDays, getStatusColor, SOP_DAYS } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function CariBerkasPetugas() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/files');
        setFiles(response.data.filter(f => f.current_location !== 'Selesai' && f.current_location !== 'Ditutup'));
      } catch (err) {
        console.error("Failed to load files", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const officers = useMemo(() => {
    const names = new Set();
    files.forEach(f => {
      if (f.is_transit === 1) {
        if (f.transit_to_fullname) names.add(f.transit_to_fullname);
        else if (f.transit_to_username) names.add(f.transit_to_username);
      }
      
      let name = f.latest_scan_info || f.latest_scanned_by_username || 'Sistem / Belum Discan';
      names.add(name.split(' (')[0]);
    });
    return [...names].filter(Boolean).sort();
  }, [files]);

  const displayFiles = useMemo(() => {
    if (!selectedOfficer) return [];
    return files.filter(f => {
      if (f.is_transit === 1) {
        return f.transit_to_fullname === selectedOfficer || f.transit_to_username === selectedOfficer;
      }
      let name = f.latest_scan_info || f.latest_scanned_by_username || 'Sistem / Belum Discan';
      return name.split(' (')[0] === selectedOfficer;
    }).sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at) : new Date(a.created_at);
      const dateB = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
      return dateA - dateB;
    });
  }, [files, selectedOfficer]);

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }}></div>;

  return (
    <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Search size={20} color="var(--primary-color)" /> Cari Berkas Aktif di Tangan Petugas
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ flex: '1 1 100%' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nama Petugas</label>
          <select 
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
            style={{ width: '100%', maxWidth: '500px', marginBottom: 0 }}
          >
            <option value="">-- Pilih Petugas --</option>
            {officers.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedOfficer ? (
        displayFiles.length > 0 ? (
          <div>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>
              Ditemukan {displayFiles.length} berkas di tangan {selectedOfficer}
            </h4>
            <div className="file-list">
              {displayFiles.map(file => {
                const updatedAt = file.updated_at ? file.updated_at : file.created_at;
                const daysAtLocation = getWorkingDays(updatedAt);
                const statusColor = getStatusColor(daysAtLocation);

                return (
                  <div key={file.id} className="file-item" onClick={() => navigate('/file/' + file.qr_code)}>
                    <div className="file-item-left">
                      <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <FileText size={18} color="var(--primary-color)" /> {file.nomor_berkas} / {file.tahun_berkas}
                      </h4>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>{file.nama_kegiatan}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pemohon: {file.nama_pemohon}</p>
                      <p style={{ fontSize: '0.8rem', color: file.is_transit === 1 ? 'var(--warning-color)' : 'var(--primary-color)', fontWeight: '500' }}>
                        Posisi: {file.is_transit === 1 ? `Sedang Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
                      </p>
                    </div>
                    <div className="file-item-right">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontSize: '0.8rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }}></div>
                        <span style={{ color: statusColor, fontWeight: '500' }}>
                          {file.is_transit === 1 ? 'Menunggu di-scan penerima' : (daysAtLocation === 0 ? 'Baru masuk di posisi ini' : `${daysAtLocation} hari tertahan di sini`)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Petugas ini tidak memegang berkas apapun saat ini.
          </div>
        )
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
          <User size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
          <p>Silakan pilih Nama Petugas untuk melihat daftar berkas.</p>
        </div>
      )}
    </div>
  );
}
