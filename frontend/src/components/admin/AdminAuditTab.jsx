import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  AlertTriangle,
  Info,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { parseSQLiteDate } from '../../utils/dateUtils';
import './AdminAuditTab.css';

function formatJakartaDateTime(rawDate) {
  if (!rawDate) return '-';
  const parsed = parseSQLiteDate(rawDate);
  if (!parsed || Number.isNaN(parsed.getTime())) return String(rawDate);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed);
}

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Semua Kategori' },
  { value: 'AUTH', label: 'Otentikasi (AUTH)' },
  { value: 'USER', label: 'Manajemen User (USER)' },
  { value: 'SESSION', label: 'Sesi (SESSION)' },
  { value: 'BERKAS', label: 'Berkas (BERKAS)' },
  { value: 'SURAT', label: 'Persuratan (SURAT)' },
  { value: 'BACKUP', label: 'Backup & Restore (BACKUP)' },
];

const SEVERITY_OPTIONS = [
  { value: 'ALL', label: 'Semua Tingkat' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Peringatan (Warning)' },
  { value: 'critical', label: 'Kritis (Critical)' },
];

export default function AdminAuditTab() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    last24h: 0,
    failedLogins24h: 0,
    criticalCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [categoryInput, setCategoryInput] = useState('ALL');
  const [severityInput, setSeverityInput] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    category: 'ALL',
    severity: 'ALL',
    search: '',
  });

  const fetchAuditLogs = useCallback(async (filters, showErrorToast = false) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: {
          category: filters.category,
          severity: filters.severity,
          search: filters.search,
          limit: 100,
        },
      });
      setLogs(res.data?.logs || []);
      setTotal(Number(res.data?.total || 0));
      setSummary({
        totalEvents: Number(res.data?.summary?.totalEvents || 0),
        last24h: Number(res.data?.summary?.last24h || 0),
        failedLogins24h: Number(res.data?.summary?.failedLogins24h || 0),
        criticalCount: Number(res.data?.summary?.criticalCount || 0),
      });
    } catch (err) {
      if (showErrorToast) {
        toast.error(err.response?.data?.error || 'Gagal memuat jejak audit keamanan');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(appliedFilters, true);
  }, [appliedFilters, fetchAuditLogs]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setAppliedFilters({
      category: categoryInput,
      severity: severityInput,
      search: searchInput.trim(),
    });
  };

  const handleResetFilters = () => {
    setCategoryInput('ALL');
    setSeverityInput('ALL');
    setSearchInput('');
    setAppliedFilters({
      category: 'ALL',
      severity: 'ALL',
      search: '',
    });
  };

  return (
    <section className="audit-panel" aria-label="Jejak Audit Keamanan dan Aktivitas Admin">
      <div className="audit-header-card">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} aria-hidden="true" /> Jejak Audit Keamanan &amp; Aktivitas Admin
          </h2>
          <p className="audit-subtitle">
            Merekam percobaan login gagal, pemutusan sesi paksa, perubahan hak akses, penutupan/penghapusan berkas &amp; surat, serta operasi backup.
          </p>
        </div>

        <button
          type="button"
          className="audit-btn-secondary"
          aria-disabled={loading ? 'true' : undefined}
          onClick={() => !loading && fetchAuditLogs(appliedFilters, true)}
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
        </button>
      </div>

      <div className="audit-summary-grid" role="region" aria-label="Ringkasan Metrik Keamanan Audit">
        <div className="audit-metric-card">
          <span className="audit-metric-label">Total Peristiwa Tercatat</span>
          <strong className="audit-metric-value audit-mono">{summary.totalEvents}</strong>
        </div>
        <div className="audit-metric-card">
          <span className="audit-metric-label">Aktivitas 24 Jam Terakhir</span>
          <strong className="audit-metric-value audit-mono">{summary.last24h}</strong>
        </div>
        <div className="audit-metric-card is-warning">
          <span className="audit-metric-label">Login Gagal (24 Jam)</span>
          <strong className="audit-metric-value audit-mono">{summary.failedLogins24h}</strong>
        </div>
        <div className="audit-metric-card is-critical">
          <span className="audit-metric-label">Aksi Kritis / Hapus Permanen</span>
          <strong className="audit-metric-value audit-mono">{summary.criticalCount}</strong>
        </div>
      </div>

      <search>
        <form className="audit-filter-form" onSubmit={handleFilterSubmit} aria-label="Filter jejak audit keamanan">
          <div className="audit-filter-field is-grow">
            <label htmlFor="audit-search-input">Cari Pelaku, Target, IP, atau Ringkasan</label>
            <input
              id="audit-search-input"
              name="search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Contoh: admin, 10.2.0., FILE_DELETED, atau nomor berkas"
            />
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-category-select">Kategori</label>
            <select
              id="audit-category-select"
              name="category"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-severity-select">Tingkat</label>
            <select
              id="audit-severity-select"
              name="severity"
              value={severityInput}
              onChange={(e) => setSeverityInput(e.target.value)}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-actions">
            <button type="submit" className="audit-btn-primary">
              <Search size={15} aria-hidden="true" />
              <span>Terapkan</span>
            </button>
            <button type="button" className="audit-btn-secondary" onClick={handleResetFilters}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </search>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="audit-table-caption"
        className="audit-table-wrapper"
      >
        <table className="audit-table">
          <caption id="audit-table-caption">
            Jejak Audit Keamanan ({logs.length} ditampilkan dari {total} total cocok)
          </caption>
          <thead>
            <tr>
              <th scope="col">Waktu (WIB)</th>
              <th scope="col">Kategori &amp; Tingkat</th>
              <th scope="col">Pelaku &amp; IP</th>
              <th scope="col">Target</th>
              <th scope="col">Ringkasan Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Memuat jejak audit keamanan...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Belum ada catatan audit yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="audit-mono">
                    {formatJakartaDateTime(row.created_at)}
                  </th>
                  <td>
                    <div className="audit-badge-stack">
                      <span className={`audit-severity-pill is-${row.severity || 'info'}`}>
                        {row.severity === 'critical' ? (
                          <AlertTriangle size={12} aria-hidden="true" />
                        ) : row.severity === 'warning' ? (
                          <ShieldCheck size={12} aria-hidden="true" />
                        ) : (
                          <Info size={12} aria-hidden="true" />
                        )}
                        <span>{String(row.severity || 'info').toUpperCase()}</span>
                      </span>
                      <span className="audit-category-tag audit-mono">{row.category}</span>
                    </div>
                  </td>
                  <td>
                    <div className="audit-actor-cell">
                      <strong>{row.actor_username ? `@${row.actor_username}` : 'Sistem'}</strong>
                      <span className="audit-mono">{row.ip_address || '-'}</span>
                    </div>
                  </td>
                  <td className="audit-mono">{row.target_id || '-'}</td>
                  <td>
                    <div className="audit-summary-cell">
                      <span className="audit-action-code audit-mono">{row.action}</span>
                      <span>{row.summary}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
