import { useState, useRef } from 'react';
import { UploadCloud, Loader2, CheckCircle, Download, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { renderPdfPageThumbnail } from '../../utils/pdfPreview';
import { formatBytes, downloadPdf } from '../../utils/pdfUtils';
import { compressPdfFile } from '../../utils/pdfOperations';

export default function CompressPdfTab({ isActive, processing, setProcessing, onZoomPreview }) {
  const [compressFile, setCompressFile] = useState(null);
  const [compressPreviewUrl, setCompressPreviewUrl] = useState(null);
  const [compressResult, setCompressResult] = useState(null);
  const compressInputRef = useRef(null);

  const handleCompressFileSelected = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setCompressFile(file);
    setCompressResult(null);
    setCompressPreviewUrl(null);

    try {
      const buffer = await file.arrayBuffer();
      const thumb = await renderPdfPageThumbnail(buffer, 1, 300);
      setCompressPreviewUrl(thumb);
    } catch (err) {
      console.error(err);
    }

    if (compressInputRef.current) compressInputRef.current.value = '';
  };

  const executeCompress = async () => {
    if (!compressFile) {
      toast.error('Pilih file PDF yang ingin dikompres');
      return;
    }
    setProcessing(true);
    try {
      const result = await compressPdfFile(compressFile);
      setCompressResult(result);
      toast.success('Optimasi PDF selesai!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengompres PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: isActive ? 'block' : 'none' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Kompres Dokumen PDF (Optimize)</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
          Perkecil ukuran file PDF dengan membersihkan objek redundan dan mengompresi stream konten tanpa merusak kejelasan teks.
        </p>
      </div>

      <input
        ref={compressInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleCompressFileSelected}
      />

      {!compressFile ? (
        <div
          onClick={() => compressInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--surface-subtle)',
          }}
        >
          <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih File PDF yang Ingin Dikompres</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            File berukuran besar akan dirampingkan agar lebih mudah dikirim dan diunggah.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '160px', height: '220px', background: '#1E293B', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', flexShrink: 0, position: 'relative' }}>
              {compressPreviewUrl ? (
                <img
                  src={compressPreviewUrl}
                  alt="Pratinjau Dokumen"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                  onClick={() => onZoomPreview(compressPreviewUrl, compressFile.name)}
                  title="Klik untuk perbesar"
                />
              ) : (
                <Loader2 size={24} className="spin" color="#94A3B8" />
              )}
              <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px' }}>
                Hal 1
              </span>
            </div>

            <div style={{ flex: 1, minWidth: '260px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>{compressFile.name}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Ukuran File Saat Ini: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(compressFile.size)}</strong>
              </p>

              <button
                type="button"
                className="secondary"
                onClick={() => compressInputRef.current?.click()}
                style={{ width: 'auto', padding: '0.45rem 0.95rem', fontSize: '0.82rem', marginBottom: '1rem' }}
              >
                Ganti File
              </button>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--surface-subtle)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                &bull; Pembersihan kamus objek stream dan metadata redundan.<br />
                &bull; Kompresi komprehensif tanpa menurunkan kejelasan teks atau tanda tangan digital.
              </div>
            </div>
          </div>

          {compressResult ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, marginBottom: '0.75rem' }}>
                <CheckCircle size={22} /> Kompresi Selesai!
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ukuran Awal</span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>{formatBytes(compressResult.originalSize)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ukuran Hasil</span>
                  <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>{formatBytes(compressResult.newSize)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Penghematan</span>
                  <strong style={{ fontSize: '1.15rem', color: '#10b981' }}>{compressResult.savedPercent}% Lebih Ringan</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadPdf(compressResult.bytes, `${compressFile.name.replace(/\.pdf$/i, '')}-kompres.pdf`)}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.75rem', margin: '0 auto' }}
              >
                <Download size={18} /> Unduh PDF Hasil Kompresi
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={executeCompress}
                disabled={processing}
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
              >
                {processing ? <Loader2 size={18} className="spin" /> : <Minimize2 size={18} />}
                {processing ? 'Sedang Mengompresi...' : 'Mulai Kompresi PDF'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
