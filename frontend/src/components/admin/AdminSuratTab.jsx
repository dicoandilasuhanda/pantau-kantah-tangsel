import { Mail, CheckCircle, Clock, Lock, Filter, RotateCcw, Calendar, FileText, ExternalLink } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/adminExcelExport';
import RecordRowActions from './RecordRowActions';

export default function AdminSuratTab({
  filteredSurat,
  totalSuratCount,
  filteredSuratAnalytics,
  isAnySuratFilterActive,
  suratSearchTerm,
  onSearchChange,
  suratFilterMonth,
  onFilterMonthChange,
  suratFilterYear,
  onFilterYearChange,
  suratStartDate,
  onStartDateChange,
  suratEndDate,
  onEndDateChange,
  suratFilterStatus,
  onFilterStatusChange,
  availableSuratYears,
  onResetFilters,
  getSecureFileUrl,
  onNavigateSurat,
  onCompleteSurat,
  onRequestCloseSurat,
  onDeleteSurat,
}) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
            <Mail size={32} color="var(--primary-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Total Surat Masuk {isAnySuratFilterActive ? '(Terfilter)' : ''}</p>
            <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.totalSurat}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
            <CheckCircle size={32} color="var(--accent-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Surat Selesai</p>
            <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.completedSurat}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
            <Clock size={32} color="var(--warning-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Surat Aktif (Proses)</p>
            <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.activeSurat}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <Lock size={32} color="var(--error-color)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Ditutup / Diarsipkan</p>
            <h2 style={{ margin: 0 }}>{filteredSuratAnalytics.closedSurat}</h2>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
            <Filter size={18} color="var(--primary-color)" />
            <span>Filter Laporan & Rentang Waktu Persuratan</span>
          </div>
          {isAnySuratFilterActive && (
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
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Bulan Diterima</label>
            <select
              value={suratFilterMonth}
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
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tahun Diterima</label>
            <select
              value={suratFilterYear}
              onChange={(e) => onFilterYearChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Tahun</option>
              {availableSuratYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Dari Tanggal Terima
            </label>
            <input
              type="date"
              value={suratStartDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Sampai Tanggal Terima
            </label>
            <input
              type="date"
              value={suratEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Status Surat</label>
            <select
              value={suratFilterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              style={{ marginBottom: 0, padding: '0.6rem 0.75rem', fontSize: '0.88rem' }}
            >
              <option value="Semua">Semua Status</option>
              <option value="Proses">Masih Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditutup">Ditutup / Diarsipkan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Seluruh Surat Masuk Sistem</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Menampilkan <strong>{filteredSurat.length}</strong> dari total <strong>{totalSuratCount}</strong> surat masuk
            </span>
          </div>
          <div style={{ width: '100%', maxWidth: '340px' }}>
            <input
              type="text"
              placeholder="Cari No. Agenda, Nomor Surat, Asal, Perihal..."
              value={suratSearchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.8rem' }}>
                <th className="table-sticky-col" style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>No. Agenda</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', minWidth: '140px' }}>Asal Surat</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '130px' }}>Nomor Surat</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Tgl Diterima</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', minWidth: '180px' }}>Perihal</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '150px' }}>Posisi Terakhir</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>Berkas PDF</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', minWidth: '180px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.8rem' }}>
              {filteredSurat.map((s) => {
                const loc = s.current_location || 'Petugas Entry Surat';
                const isDone = loc === 'Selesai';
                const isClosed = loc === 'Ditutup';
                const noAgenda = s.nomor_agenda || s.nomorAgenda || '-';
                const asalSurat = s.asal_surat || s.asalSurat || '-';
                const noSurat = s.nomor_surat || s.nomorSurat || '-';
                const rawTglTerima = s.tanggal_diterima || s.tanggalTerima;
                const tglTerimaDisplay = rawTglTerima
                  ? new Date(rawTglTerima + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '-';
                const pdfPath = s.file_path || s.fileUrl;

                return (
                  <tr key={s.id}>
                    <td
                      className="table-sticky-col"
                      onClick={() => onNavigateSurat(s.id)}
                      title="Klik untuk lihat detail & riwayat perjalanan surat"
                      style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary-hover)', fontWeight: 700 }}
                    >
                      #{noAgenda}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                      {asalSurat}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      {noSurat}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                      {tglTerimaDisplay}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid var(--border-color)' }}>
                      {s.perihal}
                      {s.catatan && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Catatan: {s.catatan}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 600 }}>{loc}</div>
                      {s.latest_scan_info && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {s.latest_scan_info}
                        </div>
                      )}
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
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      {pdfPath ? (
                        <a
                          href={getSecureFileUrl(pdfPath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          <FileText size={13} /> Buka PDF <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <RecordRowActions
                        isLocked={isDone || isClosed}
                        onComplete={() => onCompleteSurat(s.id, noAgenda)}
                        onClose={() => onRequestCloseSurat(s)}
                        onDelete={() => onDeleteSurat(s.id, noAgenda, noSurat)}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredSurat.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isAnySuratFilterActive ? 'Tidak ada surat yang cocok dengan filter yang dipilih.' : 'Belum ada surat masuk tercatat.'}
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
