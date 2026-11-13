import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatBytes } from '../../utils/pdfUtils';
import './AdminBackupTab.css';

function formatJakartaDateTime(isoString) {
  if (!isoString) return '-';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
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

export default function AdminBackupTab() {
  const [backups, setBackups] = useState([]);
  const [meta, setMeta] = useState({
    engine: 'SQLite VACUUM INTO + PRAGMA integrity_check',
    retentionDays: 30,
    minRetainedBackups: 3,
    recentLogLines: [],
  });
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [verifyingFilename, setVerifyingFilename] = useState(null);
  const [downloadingFilename, setDownloadingFilename] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchBackups = useCallback(async (showErrorToast = false) => {
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data?.backups || []);
      setMeta({
        engine: res.data?.engine || 'SQLite VACUUM INTO + PRAGMA integrity_check',
        retentionDays: res.data?.retentionDays ?? 30,
        minRetainedBackups: res.data?.minRetainedBackups ?? 3,
        recentLogLines: res.data?.recentLogLines || [],
      });
    } catch (err) {
      if (showErrorToast) {
        toast.error(err.response?.data?.error || 'Gagal memuat daftar arsip backup');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups(true);
  }, [fetchBackups]);

  const handleRunBackup = async () => {
    if (runningBackup) return;
    setRunningBackup(true);
    try {
      const res = await api.post('/admin/backups/run');
      setVerificationResult(res.data?.verification || null);
      toast.success(res.data?.message || 'Backup baru berhasil dibuat & terverifikasi');
      await fetchBackups(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menjalankan backup online');
    } finally {
      setRunningBackup(false);
    }
  };

  const handleVerifyBackup = async (filename) => {
    if (verifyingFilename) return;
    setVerifyingFilename(filename);
    try {
      const res = await api.post('/admin/backups/verify', { filename });
      setVerificationResult(res.data?.verification || null);
      toast.success(res.data?.message || `Simulasi restore ${filename} lulus uji integritas`);
    } catch (err) {
      const failedVerification = err.response?.data?.verification;
      if (failedVerification) {
        setVerificationResult(failedVerification);
      }
      toast.error(err.response?.data?.error || `Uji integritas ${filename} gagal`);
    } finally {
      setVerifyingFilename(null);
    }
  };

  const handleDownloadBackup = async (filename) => {
    if (downloadingFilename) return;
    setDownloadingFilename(filename);
    try {
      const res = await api.get(`/admin/backups/${encodeURIComponent(filename)}/download`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success(`Mengunduh ${filename}`);
    } catch {
      toast.error(`Gagal mengunduh arsip ${filename}`);
    } finally {
      setDownloadingFilename(null);
    }
  };

  const totalSizeBytes = backups.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);

  return (
    <section className="backup-panel" aria-label="Manajemen Backup dan Verifikasi Restore SQLite">
      <div className="backup-header-card">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} aria-hidden="true" /> Backup Zero-Downtime & Uji Restore SQLite
          </h2>
          <div className="backup-meta-row">
            <span>Mesin: <strong>{meta.engine}</strong></span>
            <span>Total Arsip: <strong className="backup-mono">{backups.length}</strong> ({formatBytes(totalSizeBytes)})</span>
            <span>Retensi: <strong>{meta.retentionDays} hari</strong> (min. {meta.minRetainedBackups} terbaru)</span>
          </div>
        </div>

        <div className="backup-actions">
          <button
            type="button"
            className="backup-btn-secondary"
            aria-disabled={loading ? 'true' : undefined}
            onClick={() => fetchBackups(true)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Muat Ulang</span>
          </button>

          <button
            id="run-backup-btn"
            type="button"
            className="backup-btn-primary"
            aria-disabled={runningBackup ? 'true' : undefined}
            onClick={handleRunBackup}
          >
            <HardDrive size={16} aria-hidden="true" />
            <span>{runningBackup ? 'Membuat Snapshot...' : 'Buat Backup Sekarang'}</span>
          </button>
        </div>
      </div>

      {verificationResult && (
        <div
          role="status"
          aria-live="polite"
          className={`backup-verification-card ${verificationResult.ok ? 'is-ok' : 'is-error'}`}
        >
          <div className="backup-verify-header">
            <div className={`backup-status-badge ${verificationResult.ok ? 'is-ok' : 'is-error'}`}>
              {verificationResult.ok ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <AlertTriangle size={18} aria-hidden="true" />
              )}
              <span>
                {verificationResult.ok
                  ? `Uji Restore Terisolasi Lulus: ${verificationResult.filename}`
                  : `Uji Integritas Gagal: ${verificationResult.filename}`}
              </span>
            </div>
            <span className="backup-mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              PRAGMA integrity_check: <strong>{verificationResult.integrityCheck}</strong> • {verificationResult.durationMs} ms •{' '}
              {verificationResult.totalRows} total baris
            </span>
          </div>

          {verificationResult.sha256 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              SHA-256: <span className="backup-mono">{verificationResult.sha256}</span>
            </div>
          )}

          {verificationResult.error && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#DC2626' }}>
              {verificationResult.error}
            </p>
          )}

          {verificationResult.tableCounts && Object.keys(verificationResult.tableCounts).length > 0 && (
            <div className="backup-table-grid">
              {Object.entries(verificationResult.tableCounts).map(([tableName, rowCount]) => (
                <div key={tableName} className="backup-table-chip">
                  <span className="backup-mono">{tableName}</span>
                  <strong className="backup-mono">{rowCount === null ? 'Hilang' : rowCount}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="backup-archive-caption"
        className="backup-table-wrapper"
      >
        <table className="backup-table">
          <caption id="backup-archive-caption">
            Daftar Arsip Snapshot SQLite ({backups.length})
          </caption>
          <thead>
            <tr>
              <th scope="col">Nama Berkas Backup</th>
              <th scope="col">Ukuran</th>
              <th scope="col">Waktu Dibuat (WIB)</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Memuat daftar snapshot backup...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Belum ada file backup `.sqlite` di folder `backups/`. Klik <strong>Buat Backup Sekarang</strong> untuk membuat snapshot pertama.
                </td>
              </tr>
            ) : (
              backups.map((item) => {
                const isVerifyingThis = verifyingFilename === item.filename;
                const isDownloadingThis = downloadingFilename === item.filename;
                return (
                  <tr key={item.filename}>
                    <th scope="row" className="backup-mono">
                      {item.filename}
                    </th>
                    <td className="backup-mono">{formatBytes(item.sizeBytes)}</td>
                    <td className="backup-mono">{formatJakartaDateTime(item.modifiedAt)}</td>
                    <td>
                      <div className="backup-row-actions">
                        <button
                          type="button"
                          className="backup-btn-sm"
                          aria-disabled={isVerifyingThis ? 'true' : undefined}
                          onClick={() => handleVerifyBackup(item.filename)}
                        >
                          <ShieldCheck size={14} aria-hidden="true" />
                          <span>{isVerifyingThis ? 'Menguji...' : 'Uji Restore'}</span>
                        </button>
                        <button
                          type="button"
                          className="backup-btn-sm"
                          aria-disabled={isDownloadingThis ? 'true' : undefined}
                          onClick={() => handleDownloadBackup(item.filename)}
                        >
                          <Download size={14} aria-hidden="true" />
                          <span>{isDownloadingThis ? 'Mengunduh...' : 'Unduh'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {meta.recentLogLines.length > 0 && (
        <details className="backup-log-details">
          <summary>Log Terakhir Cron QNAP (`backups/backup.log`)</summary>
          <pre className="backup-log-pre backup-mono">{meta.recentLogLines.join('\n')}</pre>
        </details>
      )}
    </section>
  );
}

