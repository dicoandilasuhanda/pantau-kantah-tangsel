import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, Maximize2, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBytes, parsePageRange, downloadPdf } from '../../utils/pdfUtils';
import { loadPdfPageCount, renderPdfThumbnailsProgressive, rotatePdfPages } from '../../utils/pdfOperations';

export default function RotatePdfTab({ isActive, processing, setProcessing, onZoomPreview }) {
  const [rotateFile, setRotateFile] = useState(null);
  const [rotateTotalPages, setRotateTotalPages] = useState(0);
  const [rotateThumbnails, setRotateThumbnails] = useState([]);
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotateMode, setRotateMode] = useState('all');
  const [rotateCustomRange, setRotateCustomRange] = useState('');
  const [rotateOutputName, setRotateOutputName] = useState('');
  const [_loadingRotatePreviews, setLoadingRotatePreviews] = useState(false);
  const rotateInputRef = useRef(null);

  const handleRotateFileSelected = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setRotateFile(file);
    setRotateThumbnails([]);
    setRotateOutputName(`${file.name.replace(/\.pdf$/i, '')}-diputar.pdf`);
    setLoadingRotatePreviews(true);

    try {
      const buffer = await file.arrayBuffer();
      const pagesCount = await loadPdfPageCount(buffer);
      setRotateTotalPages(pagesCount);
      await renderPdfThumbnailsProgressive(buffer, pagesCount, setRotateThumbnails, 240);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca PDF: ' + err.message);
    } finally {
      setLoadingRotatePreviews(false);
    }
    if (rotateInputRef.current) rotateInputRef.current.value = '';
  };

  const isPageRotated = (pageIndex) => {
    if (rotateMode === 'all') return true;
    if (rotateMode === 'odd') return pageIndex % 2 === 0;
    if (rotateMode === 'even') return pageIndex % 2 === 1;
    if (rotateMode === 'custom') {
      const parsed = parsePageRange(rotateCustomRange, rotateTotalPages);
      return parsed.includes(pageIndex);
    }
    return false;
  };

  const executeRotate = async () => {
    if (!rotateFile || rotateTotalPages === 0) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    setProcessing(true);
    try {
      const { targetCount, bytes } = await rotatePdfPages(rotateFile, isPageRotated, rotateAngle);
      if (targetCount === 0 || !bytes) {
        toast.error('Tidak ada halaman yang dipilih untuk diputar');
        return;
      }
      downloadPdf(bytes, rotateOutputName || 'dokumen-diputar.pdf');
      toast.success(`Berhasil memutar ${targetCount} halaman PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memutar PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: isActive ? 'block' : 'none' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Putar Orientasi Halaman PDF (Rotate)</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
          Perbaiki arah halaman dokumen yang terbalik. Pratinjau visual di bawah akan ikut berputar secara langsung!
        </p>
      </div>

      <input
        ref={rotateInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleRotateFileSelected}
      />

      {!rotateFile ? (
        <div
          onClick={() => rotateInputRef.current?.click()}
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
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih File PDF yang Ingin Diputar</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Pratinjau visual seluruh halaman akan tampil dan berputar secara interaktif.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={24} color="var(--primary-color)" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main)' }}>{rotateFile.name}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Ukuran: {formatBytes(rotateFile.size)} &bull; Total: <strong>{rotateTotalPages} Halaman</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => rotateInputRef.current?.click()}
              style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            >
              Ganti File
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Sudut Perputaran:
              </label>
              <select
                value={rotateAngle}
                onChange={(e) => setRotateAngle(parseInt(e.target.value, 10))}
                style={{ marginBottom: 0 }}
              >
                <option value={90}>Putar 90&deg; Searah Jarum Jam (Kanan)</option>
                <option value={180}>Putar 180&deg; (Terbalik)</option>
                <option value={270}>Putar 90&deg; Berlawanan Jarum Jam (Kiri)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Halaman yang Diputar:
              </label>
              <select
                value={rotateMode}
                onChange={(e) => setRotateMode(e.target.value)}
                style={{ marginBottom: 0 }}
              >
                <option value="all">Semua Halaman (1 s.d. {rotateTotalPages})</option>
                <option value="odd">Hanya Halaman Ganjil (1, 3, 5, ...)</option>
                <option value="even">Hanya Halaman Genap (2, 4, 6, ...)</option>
                <option value="custom">Halaman Tertentu (Kustom)</option>
              </select>
            </div>

            {rotateMode === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Rentang Halaman Kustom:
                </label>
                <input
                  type="text"
                  value={rotateCustomRange}
                  onChange={(e) => setRotateCustomRange(e.target.value)}
                  placeholder="Contoh: 1, 3-5"
                  style={{ marginBottom: 0 }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Nama File Hasil:
              </label>
              <input
                type="text"
                value={rotateOutputName}
                onChange={(e) => setRotateOutputName(e.target.value)}
                placeholder="dokumen-diputar.pdf"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Pratinjau Hasil Perputaran:
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                &bull; Halaman dengan tanda berputar akan diputar {rotateAngle}&deg;
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '1rem',
                maxHeight: '460px',
                overflowY: 'auto',
                padding: '1rem',
                background: 'var(--surface-subtle)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              {Array.from({ length: rotateTotalPages }).map((_, idx) => {
                const willRotate = isPageRotated(idx);
                const thumb = rotateThumbnails[idx];
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface-card)',
                      border: willRotate ? '2px solid #10b981' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {willRotate && (
                      <span style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', zIndex: 2 }}>
                        +{rotateAngle}&deg;
                      </span>
                    )}

                    <div style={{ width: '100%', height: '170px', background: '#1E293B', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', position: 'relative' }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`Halaman ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: willRotate ? `rotate(${rotateAngle}deg)` : 'none',
                            transition: 'transform 0.3s ease',
                          }}
                        />
                      ) : (
                        <Loader2 size={18} className="spin" color="#94A3B8" />
                      )}

                      {thumb && (
                        <button
                          type="button"
                          onClick={() => onZoomPreview(thumb, `Halaman ${idx + 1} - ${rotateFile.name}`)}
                          style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px', width: 'auto' }}
                          title="Perbesar Halaman"
                        >
                          <Maximize2 size={12} />
                        </button>
                      )}
                    </div>

                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: willRotate ? '#10b981' : 'var(--text-main)' }}>
                      Halaman {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={executeRotate}
              disabled={processing}
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              {processing ? <Loader2 size={18} className="spin" /> : <RotateCw size={18} />}
              {processing ? 'Sedang Memutar...' : 'Putar & Unduh PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
