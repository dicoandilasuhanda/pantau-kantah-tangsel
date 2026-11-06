import { useState, useRef } from 'react';
import { 
  Layers, 
  Scissors, 
  Minimize2, 
  Image as ImageIcon, 
  RotateCw, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Download, 
  Plus, 
  CheckCircle, 
  ShieldCheck, 
  FileText, 
  UploadCloud, 
  Info,
  Loader2,
  FileCheck
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import toast from 'react-hot-toast';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function parsePageRange(rangeStr, maxPages) {
  const pages = new Set();
  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let i = min; i <= max; i++) pages.add(i - 1);
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p - 1);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function downloadPdf(pdfBytes, fileName) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convert image File to JPEG ArrayBuffer using Canvas
function imageFileToJpegBuffer(file, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Gagal mengonversi gambar'));
          blob.arrayBuffer().then(resolve).catch(reject);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error(`Gagal membaca file gambar: ${file.name}`));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(`Gagal membuka file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function PdfTools() {
  const [activeTab, setActiveTab] = useState('merge');
  const [processing, setProcessing] = useState(false);

  // Tab 1: Merge State
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeOutputName, setMergeOutputName] = useState('gabungan-dokumen.pdf');
  const mergeInputRef = useRef(null);

  // Tab 2: Split State
  const [splitFile, setSplitFile] = useState(null);
  const [splitTotalPages, setSplitTotalPages] = useState(0);
  const [splitRange, setSplitRange] = useState('');
  const [splitOutputName, setSplitOutputName] = useState('');
  const splitInputRef = useRef(null);

  // Tab 3: Compress State
  const [compressFile, setCompressFile] = useState(null);
  const [compressResult, setCompressResult] = useState(null);
  const compressInputRef = useRef(null);

  // Tab 4: Image to PDF State
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePageSize, setImagePageSize] = useState('a4'); // 'a4' | 'fit'
  const [imageOrientation, setImageOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [imageOutputName, setImageOutputName] = useState('dokumen-scan.pdf');
  const imageInputRef = useRef(null);

  // Tab 5: Rotate State
  const [rotateFile, setRotateFile] = useState(null);
  const [rotateTotalPages, setRotateTotalPages] = useState(0);
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotateMode, setRotateMode] = useState('all'); // 'all' | 'odd' | 'even' | 'custom'
  const [rotateCustomRange, setRotateCustomRange] = useState('');
  const [rotateOutputName, setRotateOutputName] = useState('');
  const rotateInputRef = useRef(null);

  // --- Handlers Tab 1: Merge ---
  const handleMergeFilesSelected = (e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (selected.length === 0) return;
    setMergeFiles(prev => [...prev, ...selected.map(file => ({ id: Math.random().toString(36).substring(7), file }))]);
    if (mergeInputRef.current) mergeInputRef.current.value = '';
  };

  const moveMergeFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mergeFiles.length) return;
    const updated = [...mergeFiles];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setMergeFiles(updated);
  };

  const removeMergeFile = (index) => {
    setMergeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      toast.error('Pilih minimal 2 file PDF untuk digabungkan');
      return;
    }
    setProcessing(true);
    try {
      const mergedDoc = await PDFDocument.create();
      for (let i = 0; i < mergeFiles.length; i++) {
        const fileObj = mergeFiles[i].file;
        const buffer = await fileObj.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => mergedDoc.addPage(p));
      }
      const pdfBytes = await mergedDoc.save();
      downloadPdf(pdfBytes, mergeOutputName || 'gabungan-dokumen.pdf');
      toast.success('Berhasil menggabungkan dokumen PDF!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menggabungkan PDF: ' + (err.message || 'File mungkin rusak atau terenkripsi'));
    } finally {
      setProcessing(false);
    }
  };

  // --- Handlers Tab 2: Split ---
  const handleSplitFileSelected = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pagesCount = doc.getPageCount();
      setSplitFile(file);
      setSplitTotalPages(pagesCount);
      setSplitRange(`1-${Math.min(pagesCount, 2)}`);
      setSplitOutputName(`${file.name.replace(/\.pdf$/i, '')}-bagian.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca PDF: ' + (err.message || 'File mungkin terenkripsi password'));
    }
    if (splitInputRef.current) splitInputRef.current.value = '';
  };

  const executeSplit = async () => {
    if (!splitFile || splitTotalPages === 0) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    if (!splitRange.trim()) {
      toast.error('Tentukan rentang halaman yang ingin dipisahkan');
      return;
    }
    setProcessing(true);
    try {
      const buffer = await splitFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const targetIndices = parsePageRange(splitRange, splitTotalPages);
      if (targetIndices.length === 0) {
        toast.error('Rentang halaman tidak valid');
        setProcessing(false);
        return;
      }
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
      copiedPages.forEach(p => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();
      downloadPdf(pdfBytes, splitOutputName || 'dokumen-terpisah.pdf');
      toast.success(`Berhasil memisahkan ${targetIndices.length} halaman PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memisahkan PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- Handlers Tab 3: Compress ---
  const handleCompressFileSelected = (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setCompressFile(file);
    setCompressResult(null);
    if (compressInputRef.current) compressInputRef.current.value = '';
  };

  const executeCompress = async () => {
    if (!compressFile) {
      toast.error('Pilih file PDF yang ingin dikompres');
      return;
    }
    setProcessing(true);
    try {
      const buffer = await compressFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      // Clean up dictionary & save using object streams
      const compressedBytes = await doc.save({ useObjectStreams: true });
      
      const originalSize = compressFile.size;
      const newSize = compressedBytes.length;
      const savedBytes = originalSize - newSize;
      const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

      setCompressResult({
        bytes: compressedBytes,
        originalSize,
        newSize,
        savedPercent: Math.max(0, savedPercent)
      });
      toast.success('Optimasi PDF selesai!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengompres PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- Handlers Tab 4: Image to PDF ---
  const handleImagesSelected = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const items = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setImageFiles(prev => [...prev, ...items]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const moveImageFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= imageFiles.length) return;
    const updated = [...imageFiles];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImageFiles(updated);
  };

  const removeImageFile = (index) => {
    setImageFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
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
      const doc = await PDFDocument.create();
      for (const item of imageFiles) {
        const jpegBuffer = await imageFileToJpegBuffer(item.file);
        const embedded = await doc.embedJpg(jpegBuffer);

        let pageWidth, pageHeight, drawWidth, drawHeight, x = 0, y = 0;
        if (imagePageSize === 'fit') {
          pageWidth = embedded.width;
          pageHeight = embedded.height;
          drawWidth = embedded.width;
          drawHeight = embedded.height;
        } else {
          // A4 dimensions (Points: 1 pt = 1/72 inch)
          const a4W = 595.28;
          const a4H = 841.89;
          const isLandscape = imageOrientation === 'landscape' || (imageOrientation === 'auto' && embedded.width > embedded.height);
          pageWidth = isLandscape ? a4H : a4W;
          pageHeight = isLandscape ? a4W : a4H;
          const margin = 20;
          const maxW = pageWidth - (margin * 2);
          const maxH = pageHeight - (margin * 2);
          const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
          drawWidth = embedded.width * scale;
          drawHeight = embedded.height * scale;
          x = (pageWidth - drawWidth) / 2;
          y = (pageHeight - drawHeight) / 2;
        }

        const page = doc.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, { x, y, width: drawWidth, height: drawHeight });
      }

      const pdfBytes = await doc.save();
      downloadPdf(pdfBytes, imageOutputName || 'dokumen-scan.pdf');
      toast.success('Berhasil mengubah gambar menjadi dokumen PDF!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- Handlers Tab 5: Rotate ---
  const handleRotateFileSelected = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pagesCount = doc.getPageCount();
      setRotateFile(file);
      setRotateTotalPages(pagesCount);
      setRotateOutputName(`${file.name.replace(/\.pdf$/i, '')}-diputar.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca PDF: ' + err.message);
    }
    if (rotateInputRef.current) rotateInputRef.current.value = '';
  };

  const executeRotate = async () => {
    if (!rotateFile || rotateTotalPages === 0) {
      toast.error('Pilih file PDF terlebih dahulu');
      return;
    }
    setProcessing(true);
    try {
      const buffer = await rotateFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const targetIndices = [];

      if (rotateMode === 'all') {
        for (let i = 0; i < total; i++) targetIndices.push(i);
      } else if (rotateMode === 'odd') {
        for (let i = 0; i < total; i += 2) targetIndices.push(i);
      } else if (rotateMode === 'even') {
        for (let i = 1; i < total; i += 2) targetIndices.push(i);
      } else if (rotateMode === 'custom') {
        targetIndices.push(...parsePageRange(rotateCustomRange, total));
      }

      if (targetIndices.length === 0) {
        toast.error('Tidak ada halaman yang dipilih untuk diputar');
        setProcessing(false);
        return;
      }

      targetIndices.forEach(idx => {
        const page = doc.getPage(idx);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + rotateAngle) % 360));
      });

      const pdfBytes = await doc.save();
      downloadPdf(pdfBytes, rotateOutputName || 'dokumen-diputar.pdf');
      toast.success(`Berhasil memutar ${targetIndices.length} halaman PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memutar PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(29, 78, 216, 0.1)', color: '#1D4ED8', border: '1px solid rgba(29, 78, 216, 0.25)', borderRadius: '999px', padding: '0.35rem 0.95rem', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.85rem' }}>
          <ShieldCheck size={16} />
          Utilitas Dokumen Resmi &bull; 100% In-Browser &amp; Aman
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          PDF Tools <span style={{ color: '#1D4ED8' }}>Pantau.Kantah Tangsel</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto' }}>
          Kelola berkas dokumen pertanahan dan persuratan dengan mudah, cepat, dan tanpa batas. Semua pemrosesan berlangsung aman langsung di peramban komputer Anda.
        </p>
      </div>

      {/* Security Privacy Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '2rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
        <Info size={20} color="#1D4ED8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-main)' }}>Jaminan Keamanan Dokumen Dinas:</strong> File PDF yang Anda olah di sini sama sekali tidak diunggah ke internet maupun server pihak luar. File diproses secara lokal di RAM komputer Anda.
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('merge')}
          className={activeTab === 'merge' ? '' : 'secondary'}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
        >
          <Layers size={17} /> Gabung PDF
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('split')}
          className={activeTab === 'split' ? '' : 'secondary'}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
        >
          <Scissors size={17} /> Pisah PDF
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compress')}
          className={activeTab === 'compress' ? '' : 'secondary'}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
        >
          <Minimize2 size={17} /> Kompres PDF
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('image-to-pdf')}
          className={activeTab === 'image-to-pdf' ? '' : 'secondary'}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
        >
          <ImageIcon size={17} /> Gambar ke PDF
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rotate')}
          className={activeTab === 'rotate' ? '' : 'secondary'}
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
        >
          <RotateCw size={17} /> Putar PDF
        </button>
      </div>

      {/* TAB CONTENT 1: GABUNG PDF */}
      {activeTab === 'merge' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Gabung Dokumen PDF (Merge)</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                Susun dan satukan beberapa dokumen PDF menjadi satu kesatuan berkas sesuai urutan yang Anda inginkan.
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
                transition: 'border-color 0.2s'
              }}
            >
              <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih atau Seret Beberapa File PDF ke Sini</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Anda dapat memilih 2 atau lebih file PDF sekaligus untuk digabungkan menjadi satu file utuh.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                {mergeFiles.map((item, idx) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.85rem 1.15rem', 
                      background: 'var(--surface-card)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '10px',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-color)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <FileText size={20} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.file.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {formatBytes(item.file.size)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={idx === 0}
                        onClick={() => moveMergeFile(idx, -1)}
                        style={{ padding: '0.35rem', width: 'auto' }}
                        title="Pindah ke Atas"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={idx === mergeFiles.length - 1}
                        onClick={() => moveMergeFile(idx, 1)}
                        style={{ padding: '0.35rem', width: 'auto' }}
                        title="Pindah ke Bawah"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMergeFile(idx)}
                        style={{ padding: '0.35rem', width: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                        title="Hapus dari Daftar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
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
      )}

      {/* TAB CONTENT 2: PISAH PDF */}
      {activeTab === 'split' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Pisahkan Halaman PDF (Split)</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Ambil dan pisahkan halaman tertentu dari berkas PDF (misal: halaman 1-3 atau halaman spesifik lainnya).
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
                background: 'var(--surface-subtle)'
              }}
            >
              <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih File PDF yang Ingin Dipisahkan</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Klik untuk memilih satu file PDF dari komputer Anda.
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
                      Ukuran: {formatBytes(splitFile.size)} &bull; Total Halaman: <strong>{splitTotalPages} Halaman</strong>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Rentang Halaman yang Ingin Diambil:
                  </label>
                  <input
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder="Contoh: 1-3, 5, 8"
                    style={{ marginBottom: '0.25rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Format: <code>1-5</code> (rentang), <code>1, 3, 7</code> (spesifik), atau kombinasi <code>1-3, 5</code> (Maks: {splitTotalPages}).
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
                  disabled={processing}
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                >
                  {processing ? <Loader2 size={18} className="spin" /> : <Scissors size={18} />}
                  {processing ? 'Sedang Memisahkan...' : 'Pisahkan & Unduh PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: KOMPRES PDF */}
      {activeTab === 'compress' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
                background: 'var(--surface-subtle)'
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={24} color="var(--primary-color)" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main)' }}>{compressFile.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Ukuran Asli: <strong>{formatBytes(compressFile.size)}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => compressInputRef.current?.click()}
                  style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Ganti File
                </button>
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
      )}

      {/* TAB CONTENT 4: GAMBAR KE PDF */}
      {activeTab === 'image-to-pdf' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
              accept="image/jpeg,image/png,image/webp,image/jpg"
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
                background: 'var(--surface-subtle)'
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
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '140px', background: '#000', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <img 
                        src={item.previewUrl} 
                        alt={item.file.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                      <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                        Hal {idx + 1}
                      </span>
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
      )}

      {/* TAB CONTENT 5: PUTAR PDF */}
      {activeTab === 'rotate' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Putar Orientasi Halaman PDF (Rotate)</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              Perbaiki arah halaman dokumen yang terbalik atau miring (searah atau berlawanan jarum jam).
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
                background: 'var(--surface-subtle)'
              }}
            >
              <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Pilih File PDF yang Ingin Diputar</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Klik untuk memilih berkas dokumen PDF.
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
      )}
    </div>
  );
}
