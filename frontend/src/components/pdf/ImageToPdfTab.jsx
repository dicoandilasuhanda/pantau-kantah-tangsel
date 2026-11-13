import { useState, useRef } from 'react';
import { Plus, UploadCloud, Loader2, Eye, Trash2, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadPdf, reorderArrayItem } from '../../utils/pdfUtils';
import { imagesToPdfBytes } from '../../utils/pdfOperations';

export default function ImageToPdfTab({ isActive, processing, setProcessing, onZoomPreview }) {
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePageSize, setImagePageSize] = useState('a4');
  const [imageOrientation, setImageOrientation] = useState('auto');
  const [imageOutputName, setImageOutputName] = useState('dokumen-scan.pdf');
  const imageInputRef = useRef(null);

  const handleImagesSelected = (e) => {
    const rawFiles = Array.from(e.target.files || []);
    const files = rawFiles.filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|jfif)$/i.test(f.name)
    );
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const previewUrl = ev.target.result;
        setImageFiles((prev) => [
          ...prev,
          { id: Math.random().toString(36).substring(7), file, previewUrl },
        ]);
      };
      reader.onerror = () => {
        setImageFiles((prev) => [
          ...prev,
          { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file) },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const moveImageFile = (index, direction) => {
    setImageFiles((prev) => reorderArrayItem(prev, index, direction));
  };

  const removeImageFile = (index) => {
    setImageFiles((prev) => {
      const item = prev[index];
      if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const executeImageToPdf = async () => {
    if (imageFiles.length === 0) {
      toast.error('Pilih minimal satu file gambar');
      return;
    }
    setProcessing(true);
    try {
      const pdfBytes = await imagesToPdfBytes(imageFiles, {
        pageSize: imagePageSize,
        orientation: imageOrientation,
      });
      downloadPdf(pdfBytes, imageOutputName || 'dokumen-scan.pdf');
      toast.success('Berhasil mengubah gambar menjadi dokumen PDF!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: isActive ? 'block' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Konversi Gambar ke PDF (JPG/PNG)</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            Ubah pindaian berkas, foto sertipikat, atau gambar warkah menjadi dokumen PDF yang rapi dan terstandarisasi.
          </p>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.bmp,.jfif"
          multiple
          style={{ display: 'none' }}
          onChange={handleImagesSelected}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Tambah Gambar
        </button>
      </div>

      {imageFiles.length === 0 ? (
        <div
          onClick={() => imageInputRef.current?.click()}
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
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih atau Seret Foto / Scan Gambar ke Sini</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Mendukung format JPG, JPEG, PNG, dan WebP. Dapat memilih banyak gambar sekaligus.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {imageFiles.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.65rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '160px',
                    background: 'var(--surface-subtle, #F8FAFC)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => {
                    if (item.previewUrl) {
                      onZoomPreview(item.previewUrl, item.file.name);
                    }
                  }}
                  title="Klik untuk perbesar foto"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Loader2 size={20} className="spin" />
                      <span style={{ fontSize: '0.7rem' }}>Memuat foto...</span>
                    </div>
                  )}
                  <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'var(--primary-color, #1D4ED8)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    Hal {idx + 1}
                  </span>
                  <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Eye size={11} /> Perbesar
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.4rem' }}>
                  {item.file.name}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      type="button"
                      className="secondary"
                      disabled={idx === 0}
                      onClick={() => moveImageFile(idx, -1)}
                      style={{ padding: '0.25rem 0.45rem', width: 'auto' }}
                      title="Geser ke Kiri"
                    >
                      &larr;
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={idx === imageFiles.length - 1}
                      onClick={() => moveImageFile(idx, 1)}
                      style={{ padding: '0.25rem 0.45rem', width: 'auto' }}
                      title="Geser ke Kanan"
                    >
                      &rarr;
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImageFile(idx)}
                    style={{ padding: '0.25rem 0.45rem', width: 'auto', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    title="Hapus Gambar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Ukuran Kertas:
              </label>
              <select
                value={imagePageSize}
                onChange={(e) => setImagePageSize(e.target.value)}
                style={{ marginBottom: 0 }}
              >
                <option value="a4">Standar Dokumen (A4)</option>
                <option value="fit">Sesuai Ukuran Asli Gambar (Fit to Image)</option>
              </select>
            </div>

            {imagePageSize === 'a4' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Orientasi Halaman:
                </label>
                <select
                  value={imageOrientation}
                  onChange={(e) => setImageOrientation(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  <option value="auto">Otomatis (Sesuai Tiap Foto)</option>
                  <option value="portrait">Semua Potret (Tegak)</option>
                  <option value="landscape">Semua Lanskap (Memanjang)</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Nama File PDF:
              </label>
              <input
                type="text"
                value={imageOutputName}
                onChange={(e) => setImageOutputName(e.target.value)}
                placeholder="dokumen-scan.pdf"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={executeImageToPdf}
              disabled={processing}
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              {processing ? <Loader2 size={18} className="spin" /> : <FileCheck size={18} />}
              {processing ? 'Sedang Mengonversi...' : 'Konversi & Unduh PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
