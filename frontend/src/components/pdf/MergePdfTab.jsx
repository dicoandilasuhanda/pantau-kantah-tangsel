import { useState, useRef } from 'react';
import { Plus, UploadCloud, Loader2, Eye, FileText, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { renderPdfPageThumbnail } from '../../utils/pdfPreview';
import { formatBytes, downloadPdf, reorderArrayItem } from '../../utils/pdfUtils';
import { mergePdfFiles } from '../../utils/pdfOperations';

export default function MergePdfTab({ isActive, processing, setProcessing, onZoomPreview }) {
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeOutputName, setMergeOutputName] = useState('gabungan-dokumen.pdf');
  const mergeInputRef = useRef(null);

  const handleMergeFilesSelected = async (e) => {
    const selected = Array.from(e.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (selected.length === 0) return;

    const newItems = selected.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      thumbnailUrl: null,
      loadingThumb: true,
    }));

    setMergeFiles((prev) => [...prev, ...newItems]);
    if (mergeInputRef.current) mergeInputRef.current.value = '';

    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        const thumb = await renderPdfPageThumbnail(buffer, 1, 260);
        setMergeFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, thumbnailUrl: thumb, loadingThumb: false } : f))
        );
      } catch {
        setMergeFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, loadingThumb: false } : f))
        );
      }
    }
  };

  const moveMergeFile = (index, direction) => {
    setMergeFiles((prev) => reorderArrayItem(prev, index, direction));
  };

  const removeMergeFile = (index) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      toast.error('Pilih minimal 2 file PDF untuk digabungkan');
      return;
    }
    setProcessing(true);
    try {
      const pdfBytes = await mergePdfFiles(mergeFiles);
      downloadPdf(pdfBytes, mergeOutputName || 'gabungan-dokumen.pdf');
      toast.success('Berhasil menggabungkan dokumen PDF!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menggabungkan PDF: ' + (err.message || 'File mungkin rusak atau terenkripsi'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: isActive ? 'block' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Gabung Dokumen PDF (Merge)</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            Susun dan satukan beberapa dokumen PDF. Pratinjau halaman depan akan tampil untuk memudahkan pengurutan.
          </p>
        </div>
        <input
          ref={mergeInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleMergeFilesSelected}
        />
        <button
          type="button"
          onClick={() => mergeInputRef.current?.click()}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Tambah File PDF
        </button>
      </div>

      {mergeFiles.length === 0 ? (
        <div
          onClick={() => mergeInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--surface-subtle)',
            transition: 'border-color 0.2s',
          }}
        >
          <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih atau Seret Beberapa File PDF ke Sini</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Anda dapat memilih 2 atau lebih file PDF sekaligus. Pratinjau halaman depan akan otomatis dibuat.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {mergeFiles.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '210px',
                    background: '#1E293B',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    marginBottom: '0.65rem',
                    cursor: item.thumbnailUrl ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (item.thumbnailUrl) {
                      onZoomPreview(item.thumbnailUrl, item.file.name);
                    }
                  }}
                  title="Klik untuk perbesar pratinjau"
                >
                  {item.loadingThumb ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                      <Loader2 size={24} className="spin" />
                      <span style={{ fontSize: '0.7rem' }}>Memuat pratinjau...</span>
                    </div>
                  ) : item.thumbnailUrl ? (
                    <>
                      <img
                        src={item.thumbnailUrl}
                        alt={`Preview ${item.file.name}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '4px', padding: '2px 5px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Eye size={11} /> Perbesar
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#94A3B8', textAlign: 'center', padding: '1rem' }}>
                      <FileText size={32} style={{ margin: '0 auto 0.25rem' }} />
                      <span style={{ fontSize: '0.72rem' }}>Pratinjau PDF</span>
                    </div>
                  )}

                  <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'var(--primary-color)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    #{idx + 1}
                  </span>
                </div>

                <div style={{ minWidth: 0, marginBottom: '0.65rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.file.name}>
                    {item.file.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {formatBytes(item.file.size)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={idx === 0}
                      onClick={() => moveMergeFile(idx, -1)}
                      style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.75rem' }}
                      title="Geser ke Depan"
                    >
                      &larr;
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={idx === mergeFiles.length - 1}
                      onClick={() => moveMergeFile(idx, 1)}
                      style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.75rem' }}
                      title="Geser ke Belakang"
                    >
                      &rarr;
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMergeFile(idx)}
                    style={{ padding: '0.3rem 0.5rem', width: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Nama File Hasil Penggabungan:
              </label>
              <input
                type="text"
                value={mergeOutputName}
                onChange={(e) => setMergeOutputName(e.target.value)}
                placeholder="gabungan-dokumen.pdf"
                style={{ marginBottom: 0 }}
              />
            </div>

            <button
              type="button"
              onClick={executeMerge}
              disabled={processing}
              style={{ height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {processing ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
              {processing ? 'Sedang Menggabungkan...' : 'Gabungkan & Unduh PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
