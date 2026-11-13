import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FolderArchive,
  Bell,
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

function deriveArchiveKind(item) {
  if (item?.kind === 'uploads' || item?.filename?.endsWith('.tar.gz')) return 'uploads';
  return 'sqlite';
}

export default function AdminBackupTab() {
  const [archives, setArchives] = useState([]);
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [includeUploads, setIncludeUploads] = useState(true);
  const [meta, setMeta] = useState({
    engine: 'SQLite VACUUM INTO + PRAGMA integrity_check + Tar-Gzip Uploads',
    retentionDays: 30,
    minRetainedBackups: 3,
    recentLogLines: [],
  });
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [verifyingFilename, setVerifyingFilename] = useState(null);
  const [downloadingFilename, setDownloadingFilename] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [uploadsVerification, setUploadsVerification] = useState(null);
  const [telegramSummary, setTelegramSummary] = useState(null);

  const fetchBackups = useCallback(async (showErrorToast = false) => {
    try {
      const res = await api.get('/admin/backups');
      const combined = Array.isArray(res.data?.allArchives)
        ? res.data.allArchives
        : [...(res.data?.backups || []), ...(res.data?.uploadsBackups || [])];
      setArchives(
        combined.map((item) => ({
          ...item,
          kind: deriveArchiveKind(item),
        }))
      );
      setMeta({
        engine:
          res.data?.engine || 'SQLite VACUUM INTO + PRAGMA integrity_check + Tar-Gzip Uploads',
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
      const res = await api.post('/admin/backups/run', { includeUploads });
      setVerificationResult(res.data?.verification || null);
      setUploadsVerification(res.data?.uploadsVerification || null);
      setTelegramSummary(res.data?.telegramNotification || null);
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
      const verified = res.data?.verification || null;
      if (verified?.kind === 'uploads' || filename.endsWith('.tar.gz')) {
        setUploadsVerification(verified);
        setVerificationResult(verified);
      } else {
        setVerificationResult(verified);
        setUploadsVerification(null);
      }
      setTelegramSummary(null);
      toast.success(res.data?.message || `Uji integritas ${filename} lulus`);
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

  const counts = useMemo(() => {
    let sqlite = 0;
    let uploads = 0;
    let totalSizeBytes = 0;
    archives.forEach((item) => {
      totalSizeBytes += item.sizeBytes || 0;
      if (deriveArchiveKind(item) === 'uploads') uploads += 1;
      else sqlite += 1;
    });
    return { all: archives.length, sqlite, uploads, totalSizeBytes };
  }, [archives]);

  const filteredArchives = useMemo(() => {
    if (archiveFilter === 'all') return archives;
    return archives.filter((item) => deriveArchiveKind(item) === archiveFilter);
  }, [archives, archiveFilter]);

  const isUploadVerifyResult =
    verificationResult && deriveArchiveKind(verificationResult) === 'uploads';

  return (
    <section className="backup-panel" aria-label="Manajemen Backup dan Verifikasi Restore SQLite">
      <div className="backup-header-card">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} aria-hidden="true" /> Backup Zero-Downtime &amp; Uji Restore
          </h2>
          <div className="backup-meta-row">
            <span>Mesin: <strong>{meta.engine}</strong></span>
            <span>
              Total Arsip:{' '}
              <strong className="backup-mono">
                {counts.sqlite} DB + {counts.uploads} Uploads
              </strong>{' '}
              ({formatBytes(counts.totalSizeBytes)})
            </span>
            <span>Retensi: <strong>{meta.retentionDays} hari</strong> (min. {meta.minRetainedBackups} terbaru/jenis)</span>
          </div>
          <div className="backup-automation-strip">
            <Bell size={14} aria-hidden="true" />
            <span>
              Cron QNAP <strong>02:30 WIB</strong> (<code className="backup-mono">./auto_backup.sh</code>) &amp;
              alert status dikirim ke Telegram Admin tertaut (<strong className="backup-mono">@pantaukantahtangsel_bot</strong>).
            </span>
          </div>
        </div>

        <div className="backup-actions-col">
          <label className="backup-checkbox-label" htmlFor="include-uploads-checkbox">
            <input
              id="include-uploads-checkbox"
              type="checkbox"
              checked={includeUploads}
              onChange={(e) => setIncludeUploads(e.target.checked)}
            />
            <span>Sertakan arsip uploads (PDF/DWG/Avatar)</span>
          </label>

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
                  ? isUploadVerifyResult
                    ? `Uji Integritas Arsip Uploads Lulus: ${verificationResult.filename}`
                    : `Uji Restore Terisolasi Lulus: ${verificationResult.filename}`
                  : `Uji Integritas Gagal: ${verificationResult.filename}`}
              </span>
            </div>
            <span className="backup-mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isUploadVerifyResult ? (
                <>
                  Checksums Tar-Gzip: <strong>{verificationResult.integrityCheck}</strong> •{' '}
                  {verificationResult.fileCount} file ({formatBytes(verificationResult.totalRawBytes || 0)}) •{' '}
                  {verificationResult.durationMs} ms
                </>
              ) : (
                <>
                  PRAGMA integrity_check: <strong>{verificationResult.integrityCheck}</strong> •{' '}
                  {verificationResult.durationMs} ms • {verificationResult.totalRows} total baris
                </>
              )}
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

          {!isUploadVerifyResult &&
            verificationResult.tableCounts &&
            Object.keys(verificationResult.tableCounts).length > 0 && (
              <div className="backup-table-grid">
                {Object.entries(verificationResult.tableCounts).map(([tableName, rowCount]) => (
                  <div key={tableName} className="backup-table-chip">
                    <span className="backup-mono">{tableName}</span>
                    <strong className="backup-mono">{rowCount === null ? 'Hilang' : rowCount}</strong>
                  </div>
                ))}
              </div>
            )}

          {!isUploadVerifyResult && uploadsVerification && (
            <div className="backup-uploads-summary">
              <FolderArchive size={16} aria-hidden="true" />
              <div>
                <strong>Arsip Uploads Terverifikasi:</strong>{' '}
                <span className="backup-mono">{uploadsVerification.filename}</span> ({formatBytes(uploadsVerification.sizeBytes)},{' '}
                {uploadsVerification.fileCount} file / {uploadsVerification.dirCount} folder • SHA-256:{' '}
                <span className="backup-mono">{uploadsVerification.sha256?.slice(0, 12)}...</span>)
              </div>
            </div>
          )}

          {telegramSummary && (
            <div className="backup-tg-summary">
              Notifikasi Telegram Admin:{' '}
              {telegramSummary.targetAdmins > 0 ? (
                <strong>
                  terkirim ke {telegramSummary.sentCount}/{telegramSummary.targetAdmins} admin tertaut
                </strong>
              ) : (
                <span>belum ada Admin menautkan akun Telegram</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="backup-filter-bar" role="group" aria-label="Filter jenis arsip backup">
        <button
          type="button"
          className={`backup-filter-pill ${archiveFilter === 'all' ? 'is-active' : ''}`}
          aria-pressed={archiveFilter === 'all'}
          onClick={() => setArchiveFilter('all')}
        >
          Semua ({counts.all})
        </button>
        <button
          type="button"
          className={`backup-filter-pill ${archiveFilter === 'sqlite' ? 'is-active' : ''}`}
          aria-pressed={archiveFilter === 'sqlite'}
          onClick={() => setArchiveFilter('sqlite')}
        >
          Database SQLite ({counts.sqlite})
        </button>
        <button
          type="button"
          className={`backup-filter-pill ${archiveFilter === 'uploads' ? 'is-active' : ''}`}
          aria-pressed={archiveFilter === 'uploads'}
          onClick={() => setArchiveFilter('uploads')}
        >
          Uploads .tar.gz ({counts.uploads})
        </button>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="backup-archive-caption"
        className="backup-table-wrapper"
      >
        <table className="backup-table">
          <caption id="backup-archive-caption">
            Daftar Arsip Backup Database &amp; Uploads ({filteredArchives.length})
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
            ) : filteredArchives.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Belum ada file backup pada filter ini. Klik <strong>Buat Backup Sekarang</strong> untuk membuat snapshot &amp; arsip baru.
                </td>
              </tr>
            ) : (
              filteredArchives.map((item) => {
                const kind = deriveArchiveKind(item);
                const isVerifyingThis = verifyingFilename === item.filename;
                const isDownloadingThis = downloadingFilename === item.filename;
                return (
                  <tr key={item.filename}>
                    <th scope="row" className="backup-mono">
                      <div className="backup-filename-cell">
                        <span className={`backup-kind-pill ${kind === 'uploads' ? 'is-uploads' : 'is-sqlite'}`}>
                          {kind === 'uploads' ? 'UPLOADS' : 'SQLITE'}
                        </span>
                        <span>{item.filename}</span>
                      </div>
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
                          <span>
                            {isVerifyingThis
                              ? 'Menguji...'
                              : kind === 'uploads'
                                ? 'Cek Arsip'
                                : 'Uji Restore'}
                          </span>
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
          <summary>Log Terakhir Cron QNAP (backups/backup.log)</summary>
          <pre className="backup-log-pre backup-mono">{meta.recentLogLines.join('\n')}</pre>
        </details>
      )}
    </section>
  );
}

