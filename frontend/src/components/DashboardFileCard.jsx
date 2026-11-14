import { memo } from 'react';
import { FileText, Clock, Calendar, MapPin, CheckSquare, Square } from 'lucide-react';
import { getWorkingDays, calculateTotalElapsedDays, getStatusColor, SOP_DAYS } from '../utils/dateUtils';

function DashboardFileCard({
  file,
  isSelected,
  selectable,
  enteredDateText,
  onOpen,
  onToggleSelect,
}) {
  const isDone = file.current_location === 'Selesai' || file.current_location === 'Ditutup';
  const isTransit = !isDone && file.is_transit === 1;
  const updatedAt = file.updated_at ? file.updated_at : file.created_at;

  let daysText = '';
  let statusColor = '';

  if (isTransit) {
    daysText = 'Menunggu di-scan penerima';
    statusColor = 'var(--warning-color, #f59e0b)';
  } else if (isDone) {
    const totalDaysTaken = calculateTotalElapsedDays(file, updatedAt);
    daysText =
      file.current_location === 'Ditutup'
        ? `Berkas ditutup (${totalDaysTaken} hari kerja)`
        : `Diselesaikan dalam ${totalDaysTaken} hari kerja`;
    statusColor = file.current_location === 'Ditutup' ? '#6b7280' : 'var(--success-color, #10b981)';
  } else {
    const daysAtLocation = getWorkingDays(updatedAt);
    statusColor = getStatusColor(daysAtLocation);
    daysText =
      daysAtLocation === 0
        ? 'Baru masuk di posisi ini'
        : `${daysAtLocation} hari kerja di posisi ini`;
  }

  const sopTarget = SOP_DAYS[file.nama_kegiatan];

  return (
    <div
      onClick={() => onOpen(file.qr_code)}
      className={`dash-file-card dash-file-card-interactive${isSelected ? ' dash-file-card-interactive--selected' : ''}`}
    >
      <div className="dash-col-info" style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {selectable && (
          <div
            onClick={(e) => onToggleSelect(e, file.qr_code)}
            title={isSelected ? 'Batalkan pilihan berkas ini' : 'Pilih berkas ini untuk aksi batch'}
            style={{
              paddingTop: '0.15rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: isSelected ? '#1D4ED8' : 'var(--text-muted)',
            }}
          >
            {isSelected ? <CheckSquare size={20} color="#1D4ED8" /> : <Square size={20} />}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
            <FileText size={17} color="#1D4ED8" style={{ flexShrink: 0 }} /> {file.nomor_berkas} / {file.tahun_berkas}
          </h3>
          <p style={{ fontSize: '0.86rem', margin: '0 0 0.15rem 0', color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.nama_kegiatan}
          </p>
          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Pemohon: {file.nama_pemohon}
          </p>
        </div>
      </div>

      <div className="dash-col-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={13} color="#64748B" />
          <span>Target SOP: <strong style={{ color: 'var(--text-main)' }}>{sopTarget ? `${sopTarget} Hari Kerja` : 'Tidak Diatur'}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={13} color="#64748B" />
          <span>Masuk: <strong style={{ color: 'var(--text-main)' }}>{enteredDateText}</strong></span>
        </div>
      </div>

      <div className="dash-col-status">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={13} color={isTransit ? '#f59e0b' : file.current_location === 'Ditutup' ? '#6b7280' : '#10b981'} />
          <span
            style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: '600',
              background: isTransit
                ? 'rgba(245, 158, 11, 0.15)'
                : file.current_location === 'Ditutup'
                  ? 'rgba(107, 114, 128, 0.15)'
                  : 'rgba(16, 185, 129, 0.12)',
              border: isTransit
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : file.current_location === 'Ditutup'
                  ? '1px solid rgba(107, 114, 128, 0.25)'
                  : '1px solid rgba(16, 185, 129, 0.25)',
              color: isTransit ? '#d97706' : file.current_location === 'Ditutup' ? '#6b7280' : '#059669',
            }}
          >
            {isTransit ? `Transit ke ${file.transit_to_fullname || file.transit_to_username}` : file.current_location}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', marginTop: '0.35rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0 }} />
          <span style={{ color: statusColor, fontWeight: '600' }}>{daysText}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardFileCard);
