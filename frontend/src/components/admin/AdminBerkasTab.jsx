import { Activity, CheckCircle, Clock, Lock, Filter, RotateCcw, Calendar } from 'lucide-react';
import { calculateFileSLA, MONTH_NAMES } from '../../utils/adminExcelExport';
import RecordRowActions from './RecordRowActions';

export default function AdminBerkasTab({
  filteredFiles,
  totalFilesCount,
  filteredAnalytics,
  isAnyFilterActive,
  searchTerm,
  onSearchChange,
  filterMonth,
  onFilterMonthChange,
  filterYear,
  onFilterYearChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  filterKegiatan,
  onFilterKegiatanChange,
  filterStatus,
  onFilterStatusChange,
  filterSla,
  onFilterSlaChange,
  availableYears,
  availableKegiatan,
  onResetFilters,
  onNavigateFile,
  onCompleteFile,
  onRequestCloseFile,
  onDeleteFile,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
            <Activity size={32} color="var(--primary-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Total Berkas {isAnyFilterActive ? '(Terfilter)' : ''}</p>
            <h2 style={{ margin: 0 }}>{filteredAnalytics.totalFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
            <CheckCircle size={32} color="var(--accent-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Selesai</p>
            <h2 style={{ margin: 0 }}>{filteredAnalytics.completedFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
            <Clock size={32} color="var(--warning-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Aktif (Proses)</p>
            <h2 style={{ margin: 0 }}>{filteredAnalytics.activeFiles}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <Lock size={32} color="var(--error-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Berkas Ditutup</p>
            <h2 style={{ margin: 0 }}>{filteredAnalytics.closedFiles}</h2>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
            <Filter size={18} color="var(--primary-color)" />
            <span>Filter Laporan & Rentang Waktu Berkas</span>
          </div>
          {isAnyFilterActive && (
            <button
              type="button"
              className="secondary"
              onClick={onResetFilters}
              style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCcw size={14} /> Reset Semua Filter
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Bulan Masuk</label>
            <select
              value={filterMonth}
              onChange={(e) => onFilterMonthChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Bulan</option>
              {MONTH_NAMES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tahun Masuk</label>
            <select
              value={filterYear}
              onChange={(e) => onFilterYearChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Jenis Permohonan</label>
            <select
              value={filterKegiatan}
              onChange={(e) => onFilterKegiatanChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Kegiatan</option>
              {availableKegiatan.map((keg) => (
                <option key={keg} value={keg}>{keg}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status Berkas</label>
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Status</option>
              <option value="Proses">Masih Proses</option>
              <option value="Transit">Sedang Transit</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditutup">Ditutup</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status SLA</label>
            <select
              value={filterSla}
              onChange={(e) => onFilterSlaChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua SLA</option>
              <option value="Aman">Aman / On-Track</option>
              <option value="Overdue">Terlambat (Overdue)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Seluruh Berkas Sistem</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Menampilkan <strong>{filteredFiles.length}</strong> dari total <strong>{totalFilesCount}</strong> berkas
            </span>
          </div>
          <div style={{ width: '100%', maxWidth: '340px' }}>
            <input
              type="text"
              placeholder="Cari No. Berkas, Pemohon, Posisi..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.8rem' }}>
                <th className="table-sticky-col" style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>No. Berkas</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '120px' }}>Pemohon</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '150px' }}>Jenis Permohonan</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Posisi Terakhir</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Tgl Masuk</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Jatuh Tempo</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>SLA</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '180px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.8rem' }}>
              {filteredFiles.map((f) => {
                const sla = calculateFileSLA(f.created_at, f.nama_kegiatan);
                const isDone = f.current_location === 'Selesai';
                const isClosed = f.current_location === 'Ditutup';
                const slaStatus = isDone ? 'Aman' : isClosed ? 'Ditutup' : sla.isOverdue ? 'Overdue' : 'On-Track';

                return (
                  <tr key={f.id}>
                    <td
                      className="table-sticky-col"
                      onClick={() => onNavigateFile(f.qr_code)}
                      title="Klik untuk lihat detail berkas"
                      style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary-hover)', fontWeight: 600 }}
                    >
                      {f.nomor_berkas}/{f.tahun_berkas}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>{f.nama_pemohon}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>{f.nama_kegiatan}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      {isDone || isClosed ? f.current_location : f.is_transit === 1 ? `Sedang Transit ke ${f.transit_to_fullname || f.transit_to_username}` : f.current_location}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <span
                        className="badge"
                        style={{
                          background: isDone ? 'rgba(16, 185, 129, 0.2)' : isClosed ? 'rgba(107, 114, 128, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isDone ? 'var(--success-color)' : isClosed ? '#9ca3af' : 'var(--warning-color)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        {isDone ? 'Selesai' : isClosed ? 'Ditutup' : 'Proses'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{sla.tanggalMasuk}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{sla.tanggalJatuhTempo}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <span
                        className="badge"
                        style={{
                          background: slaStatus === 'Overdue' ? 'rgba(239, 68, 68, 0.2)' : isClosed ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: slaStatus === 'Overdue' ? 'var(--error-color)' : isClosed ? '#9ca3af' : 'var(--success-color)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        {slaStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <RecordRowActions
                        isLocked={isDone || isClosed}
                        onComplete={() => onCompleteFile(f.id, f.nomor_berkas)}
                        onClose={() => onRequestCloseFile(f)}
                        onDelete={() => onDeleteFile(f.id, f.nomor_berkas)}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isAnyFilterActive ? 'Tidak ada berkas yang cocok dengan filter yang dipilih.' : 'Belum ada berkas tercatat.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
