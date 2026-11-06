import { useState, useRef, useEffect } from 'react';
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
  FileText, 
  UploadCloud, 
  Info,
  Loader2,
  FileCheck,
  Maximize2,
  X,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import toast from 'react-hot-toast';
import { renderPdfPageThumbnail } from '../utils/pdfPreview';

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

function indicesToRangeString(indices) {
  if (!indices || indices.length === 0) return '';
  const sorted = Array.from(new Set(indices)).map(i => i + 1).sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = start;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
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

  // Zoom Modal
  const [zoomPreviewUrl, setZoomPreviewUrl] = useState(null);
  const [zoomPreviewTitle, setZoomPreviewTitle] = useState('');

  // Tab 1: Merge State
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeOutputName, setMergeOutputName] = useState('gabungan-dokumen.pdf');
  const mergeInputRef = useRef(null);

  // Tab 2: Split State
  const [splitFile, setSplitFile] = useState(null);
  const [splitTotalPages, setSplitTotalPages] = useState(0);
  const [splitThumbnails, setSplitThumbnails] = useState([]); // array of dataUrls
  const [splitSelectedPages, setSplitSelectedPages] = useState(new Set()); // 0-based indices
  const [splitRange, setSplitRange] = useState('');
  const [splitOutputName, setSplitOutputName] = useState('');
  const [loadingSplitPreviews, setLoadingSplitPreviews] = useState(false);
  const splitInputRef = useRef(null);

  // Tab 3: Compress State
  const [compressFile, setCompressFile] = useState(null);
  const [compressPreviewUrl, setCompressPreviewUrl] = useState(null);
  const [compressResult, setCompressResult] = useState(null);
  const compressInputRef = useRef(null);

  // Tab 4: Image to PDF State
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePageSize, setImagePageSize] = useState('a4');
  const [imageOrientation, setImageOrientation] = useState('auto');
  const [imageOutputName, setImageOutputName] = useState('dokumen-scan.pdf');
  const imageInputRef = useRef(null);

  // Tab 5: Rotate State
  const [rotateFile, setRotateFile] = useState(null);
  const [rotateTotalPages, setRotateTotalPages] = useState(0);
  const [rotateThumbnails, setRotateThumbnails] = useState([]);
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotateMode, setRotateMode] = useState('all');
  const [rotateCustomRange, setRotateCustomRange] = useState('');
  const [rotateOutputName, setRotateOutputName] = useState('');
  const [loadingRotatePreviews, setLoadingRotatePreviews] = useState(false);
  const rotateInputRef = useRef(null);

  // --- Handlers Tab 1: Merge ---
  const handleMergeFilesSelected = async (e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (selected.length === 0) return;
    
    // Create preliminary items
    const newItems = selected.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      thumbnailUrl: null,
      loadingThumb: true
    }));
    
    setMergeFiles(prev => [...prev, ...newItems]);
    if (mergeInputRef.current) mergeInputRef.current.value = '';

    // Asynchronously generate first-page thumbnails for each file
    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        const thumb = await renderPdfPageThumbnail(buffer, 1, 260);
        setMergeFiles(prev => prev.map(f => f.id === item.id ? { ...f, thumbnailUrl: thumb, loadingThumb: false } : f));
      } catch (err) {
        setMergeFiles(prev => prev.map(f => f.id === item.id ? { ...f, loadingThumb: false } : f));
      }
    }
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
    setSplitFile(file);
    setSplitThumbnails([]);
    setSplitSelectedPages(new Set());
    setSplitRange('');
    setSplitOutputName(`${file.name.replace(/\.pdf$/i, '')}-bagian.pdf`);
    setLoadingSplitPreviews(true);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pagesCount = doc.getPageCount();
      setSplitTotalPages(pagesCount);

      // Default select first page
      const initialSelected = new Set([0]);
      setSplitSelectedPages(initialSelected);
      setSplitRange(indicesToRangeString(Array.from(initialSelected)));

      // Render thumbnails for each page
      const thumbs = [];
      for (let p = 1; p <= pagesCount; p++) {
        const thumb = await renderPdfPageThumbnail(buffer, p, 240);
        thumbs.push(thumb);
        // Progressive update every 3 pages
        if (p % 3 === 0 || p === pagesCount) {
          setSplitThumbnails([...thumbs]);
        }
      }
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

  const selectAllPages = () => {
    const all = new Set();
    for (let i = 0; i < splitTotalPages; i++) all.add(i);
    setSplitSelectedPages(all);
    setSplitRange(indicesToRangeString(Array.from(all)));
  };

  const deselectAllPages = () => {
    setSplitSelectedPages(new Set());
    setSplitRange('');
  };

  const selectOddPages = () => {
    const odds = new Set();
    for (let i = 0; i < splitTotalPages; i += 2) odds.add(i);
    setSplitSelectedPages(odds);
    setSplitRange(indicesToRangeString(Array.from(odds)));
  };

  const selectEvenPages = () => {
    const evens = new Set();
    for (let i = 1; i < splitTotalPages; i += 2) evens.add(i);
    setSplitSelectedPages(evens);
    setSplitRange(indicesToRangeString(Array.from(evens)));
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
      const buffer = await splitFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
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
      const buffer = await compressFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
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
    const rawFiles = Array.from(e.target.files || []);
    const files = rawFiles.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|jfif)$/i.test(f.name));
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const previewUrl = ev.target.result;
        setImageFiles(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl
          }
        ]);
      };
      reader.onerror = () => {
        // Fallback to createObjectURL if FileReader fails
        setImageFiles(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file)
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

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
    setRotateFile(file);
    setRotateThumbnails([]);
    setRotateOutputName(`${file.name.replace(/\.pdf$/i, '')}-diputar.pdf`);
    setLoadingRotatePreviews(true);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pagesCount = doc.getPageCount();
      setRotateTotalPages(pagesCount);

      const thumbs = [];
      for (let p = 1; p <= pagesCount; p++) {
        const thumb = await renderPdfPageThumbnail(buffer, p, 240);
        thumbs.push(thumb);
        if (p % 3 === 0 || p === pagesCount) {
          setRotateThumbnails([...thumbs]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca PDF: ' + err.message);
    } finally {
      setLoadingRotatePreviews(false);
    }
    if (rotateInputRef.current) rotateInputRef.current.value = '';
  };

  // Check if a specific page should be rotated based on current mode
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
      const buffer = await rotateFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const targetIndices = [];

      for (let i = 0; i < total; i++) {
        if (isPageRotated(i)) targetIndices.push(i);
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
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>
      {/* Security Privacy Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '2rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
        <Info size={20} color="#1D4ED8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-main)' }}>Jaminan Keamanan Dokumen Dinas:</strong> Pratinjau dan pemrosesan berkas PDF dirender 100% secara lokal di peramban Anda. Dokumen tidak pernah diunggah ke internet atau server luar.
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
                transition: 'border-color 0.2s'
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
              {/* Visual Card Grid of Uploaded PDFs */}
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
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Page 1 Thumbnail */}
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
                        cursor: item.thumbnailUrl ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (item.thumbnailUrl) {
                          setZoomPreviewUrl(item.thumbnailUrl);
                          setZoomPreviewTitle(item.file.name);
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

                      {/* Sequence Badge */}
                      <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'var(--primary-color)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                        #{idx + 1}
                      </span>
                    </div>

                    {/* File Info */}
                    <div style={{ minWidth: 0, marginBottom: '0.65rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.file.name}>
                        {item.file.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {formatBytes(item.file.size)}
                      </div>
                    </div>

                    {/* Action Buttons: Move Up/Down/Delete */}
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

              {/* Bottom Actions */}
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
      )}

      {/* TAB CONTENT 2: PISAH PDF */}
      {activeTab === 'split' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
                background: 'var(--surface-subtle)'
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
              {/* File Info Bar */}
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

              {/* Quick Select Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Pilih Halaman dari Pratinjau di Bawah:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button type="button" className="secondary" onClick={selectAllPages} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Pilih Semua
                  </button>
                  <button type="button" className="secondary" onClick={deselectAllPages} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Batalkan Semua
                  </button>
                  <button type="button" className="secondary" onClick={selectOddPages} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Hanya Ganjil
                  </button>
                  <button type="button" className="secondary" onClick={selectEvenPages} style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Hanya Genap
                  </button>
                </div>
              </div>

              {/* Visual Page Thumbnails Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '1rem', 
                maxHeight: '480px', 
                overflowY: 'auto', 
                padding: '1rem', 
                background: 'var(--surface-subtle)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)', 
                marginBottom: '1.5rem' 
              }}>
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
                        boxShadow: isSelected ? '0 0 0 2px rgba(29, 78, 216, 0.25)' : 'none'
                      }}
                    >
                      {/* Checkbox indicator */}
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

                      {/* Thumbnail Container */}
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

                        {/* Zoom button on hover */}
                        {thumb && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomPreviewUrl(thumb);
                              setZoomPreviewTitle(`Halaman ${idx + 1} - ${splitFile.name}`);
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

              {/* Controls */}
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
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
                {/* Document Thumbnail Preview */}
                <div style={{ width: '160px', height: '220px', background: '#1E293B', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', flexShrink: 0, position: 'relative' }}>
                  {compressPreviewUrl ? (
                    <img 
                      src={compressPreviewUrl} 
                      alt="Pratinjau Dokumen" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => {
                        setZoomPreviewUrl(compressPreviewUrl);
                        setZoomPreviewTitle(compressFile.name);
                      }}
                      title="Klik untuk perbesar"
                    />
                  ) : (
                    <Loader2 size={24} className="spin" color="#94A3B8" />
                  )}
                  <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px' }}>
                    Hal 1
                  </span>
                </div>

                {/* Details */}
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
                    &bull; Pembersihan kamus objek stream dan metadata redundan.<br/>
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
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        if (item.previewUrl) {
                          setZoomPreviewUrl(item.previewUrl);
                          setZoomPreviewTitle(item.file.name);
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
      )}

      {/* TAB CONTENT 5: PUTAR PDF */}
      {activeTab === 'rotate' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
                background: 'var(--surface-subtle)'
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
              {/* File Info Bar */}
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

              {/* Controls */}
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

              {/* Visual Page Thumbnails Grid with Dynamic Rotation */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Pratinjau Hasil Perputaran:
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                    &bull; Halaman dengan tanda berputar akan diputar {rotateAngle}&deg;
                  </span>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                  gap: '1rem', 
                  maxHeight: '460px', 
                  overflowY: 'auto', 
                  padding: '1rem', 
                  background: 'var(--surface-subtle)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)' 
                }}>
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
                          position: 'relative'
                        }}
                      >
                        {willRotate && (
                          <span style={{ position: 'absolute', top: '6px', right: '6px', background: '#10b981', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', zIndex: 2 }}>
                            +{rotateAngle}&deg;
                          </span>
                        )}

                        {/* Thumbnail with CSS Transform Rotation */}
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
                                transition: 'transform 0.3s ease'
                              }}
                            />
                          ) : (
                            <Loader2 size={18} className="spin" color="#94A3B8" />
                          )}

                          {thumb && (
                            <button
                              type="button"
                              onClick={() => {
                                setZoomPreviewUrl(thumb);
                                setZoomPreviewTitle(`Halaman ${idx + 1} - ${rotateFile.name}`);
                              }}
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
      )}

      {/* High-Resolution Zoom Preview Modal */}
      {zoomPreviewUrl && (
        <div 
          onClick={() => setZoomPreviewUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '850px',
              maxHeight: '90vh',
              width: '100%',
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F8FAFC', fontWeight: 600, fontSize: '0.95rem' }}>
                <FileText size={18} color="#38BDF8" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '650px' }}>
                  {zoomPreviewTitle || 'Pratinjau Dokumen'}
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setZoomPreviewUrl(null)}
                style={{ padding: '0.35rem', width: 'auto', background: 'transparent', border: 'none', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30, 41, 59, 0.75)', borderRadius: '8px', padding: '0.75rem' }}>
              <img 
                src={zoomPreviewUrl} 
                alt="Pratinjau Besar" 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
