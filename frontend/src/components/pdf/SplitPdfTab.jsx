import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckSquare, Square, Loader2, Maximize2, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBytes, parsePageRange, indicesToRangeString, downloadPdf } from '../../utils/pdfUtils';
import { loadPdfPageCount, renderPdfThumbnailsProgressive, extractPdfPages } from '../../utils/pdfOperations';

export default function SplitPdfTab({ isActive, processing, setProcessing, onZoomPreview }) {
  const [splitFile, setSplitFile] = useState(null);
  const [splitTotalPages, setSplitTotalPages] = useState(0);
  const [splitThumbnails, setSplitThumbnails] = useState([]);
  const [splitSelectedPages, setSplitSelectedPages] = useState(new Set());
  const [splitRange, setSplitRange] = useState('');
  const [splitOutputName, setSplitOutputName] = useState('');
  const [_loadingSplitPreviews, setLoadingSplitPreviews] = useState(false);
  const splitInputRef = useRef(null);

  const handleSplitFileSelected = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setSplitFile(file);
    setSplitThumbnails([]);
    setSplitSelectedPages(new Set());
    setSplitRange('');
    setSplitOutputName(`${file.name.replace(/\.pdf$/i, '')}-bagian.pdf`);
    setLoadingSplitPreviews(true);

    try {
      const buffer = await file.arrayBuffer();
      const pagesCount = await loadPdfPageCount(buffer);
      setSplitTotalPages(pagesCount);

      const initialSelected = new Set([0]);
      setSplitSelectedPages(initialSelected);
      setSplitRange(indicesToRangeString(Array.from(initialSelected)));

      await renderPdfThumbnailsProgressive(buffer, pagesCount, setSplitThumbnails, 240);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca PDF: ' + (err.message || 'File mungkin terenkripsi password'));
    } finally {
      setLoadingSplitPreviews(false);
    }
    if (splitInputRef.current) splitInputRef.current.value = '';
  };

  const togglePageSelection = (pageIndex) => {
    const updated = new Set(splitSelectedPages);
    if (updated.has(pageIndex)) {
      updated.delete(pageIndex);
    } else {
      updated.add(pageIndex);
    }
    setSplitSelectedPages(updated);
    setSplitRange(indicesToRangeString(Array.from(updated)));
  };

  const handleRangeInputChange = (val) => {
    setSplitRange(val);
    if (!splitTotalPages) return;
    const indices = parsePageRange(val, splitTotalPages);
    setSplitSelectedPages(new Set(indices));
  };

  const applySelectionFilter = (predicate) => {
    const selected = new Set();
    for (let i = 0; i < splitTotalPages; i++) {
      if (predicate(i)) selected.add(i);
    }
    setSplitSelectedPages(selected);
    setSplitRange(indicesToRangeString(Array.from(selected)));
  };

  const deselectAllPages = () => {
    setSplitSelectedPages(new Set());
    setSplitRange('');
  };

  const executeSplit = async () => {
    if (!splitFile || splitTotalPages === 0) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    const targetIndices = Array.from(splitSelectedPages).sort((a, b) => a - b);
    if (targetIndices.length === 0) {
      toast.error('Pilih minimal satu halaman yang ingin diambil');
      return;
    }
    setProcessing(true);
    try {
      const pdfBytes = await extractPdfPages(splitFile, targetIndices);
      downloadPdf(pdfBytes, splitOutputName || 'dokumen-terpisah.pdf');
      toast.success(`Berhasil memisahkan ${targetIndices.length} halaman PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memisahkan PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: isActive ? 'block' : 'none' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Pisahkan Halaman PDF (Split)</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
          Klik langsung pada pratinjau halaman yang ingin diambil, atau ketik rentang halaman secara manual.
        </p>
      </div>

      <input
        ref={splitInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleSplitFileSelected}
      />

      {!splitFile ? (
        <div
          onClick={() => splitInputRef.current?.click()}
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
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih File PDF yang Ingin Dipisahkan</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Pratinjau visual seluruh halaman dokumen akan dimuat secara interaktif.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={24} color="var(--primary-color)" />
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main)' }}>{splitFile.name}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Ukuran: {formatBytes(splitFile.size)} &bull; Total Halaman: <strong>{splitTotalPages} Halaman</strong> &bull; Terpilih: <strong style={{ color: '#1D4ED8' }}>{splitSelectedPages.size} Halaman</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => splitInputRef.current?.click()}
              style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            >
              Ganti File
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Pilih Halaman dari Pratinjau di Bawah:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" className="secondary" onClick={() => applySelectionFilter(() => true)} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                Pilih Semua
              </button>
              <button type="button" className="secondary" onClick={deselectAllPages} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                Batalkan Semua
              </button>
              <button type="button" className="secondary" onClick={() => applySelectionFilter((i) => i % 2 === 0)} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                Hanya Ganjil
              </button>
              <button type="button" className="secondary" onClick={() => applySelectionFilter((i) => i % 2 === 1)} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                Hanya Genap
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem',
              maxHeight: '480px',
              overflowY: 'auto',
              padding: '1rem',
              background: 'var(--surface-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
            }}
          >
            {Array.from({ length: splitTotalPages }).map((_, idx) => {
              const isSelected = splitSelectedPages.has(idx);
              const thumb = splitThumbnails[idx];
              return (
                <div
                  key={idx}
                  onClick={() => togglePageSelection(idx)}
                  style={{
                    position: 'relative',
                    background: 'var(--surface-card)',
                    border: isSelected ? '2px solid #1D4ED8' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 2px rgba(29, 78, 216, 0.25)' : 'none',
                  }}
                >
                  <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2 }}>
                    {isSelected ? (
                      <div style={{ background: '#1D4ED8', color: '#fff', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckSquare size={14} />
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Square size={14} />
                      </div>
                    )}
                  </div>

                  <div style={{ width: '100%', height: '170px', background: '#1E293B', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', position: 'relative' }}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={`Halaman ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Loader2 size={18} className="spin" color="#94A3B8" />
                    )}

                    {thumb && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomPreview(thumb, `Halaman ${idx + 1} - ${splitFile.name}`);
                        }}
                        style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px', width: 'auto' }}
                        title="Perbesar Halaman"
                      >
                        <Maximize2 size={12} />
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? '#1D4ED8' : 'var(--text-main)' }}>
                    Halaman {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Rentang Halaman Terpilih:
              </label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => handleRangeInputChange(e.target.value)}
                placeholder="Contoh: 1-3, 5, 8"
                style={{ marginBottom: '0.25rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total: {splitSelectedPages.size} halaman terpilih (dari total {splitTotalPages} halaman).
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Nama File Hasil Pemisahan:
              </label>
              <input
                type="text"
                value={splitOutputName}
                onChange={(e) => setSplitOutputName(e.target.value)}
                placeholder="dokumen-bagian.pdf"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={executeSplit}
              disabled={processing || splitSelectedPages.size === 0}
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              {processing ? <Loader2 size={18} className="spin" /> : <Scissors size={18} />}
              {processing ? 'Sedang Memisahkan...' : `Pisahkan ${splitSelectedPages.size} Halaman & Unduh PDF`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
