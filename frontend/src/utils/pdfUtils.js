export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Mengurai string rentang halaman 1-based (mis. "1-3, 5, 8") menjadi array
 * indeks 0-based unik yang terurut dan dibatasi [0, maxPages - 1].
 */
export function parsePageRange(rangeStr, maxPages) {
  const pages = new Set();
  const parts = String(rangeStr || '').split(',');
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

/**
 * Mengonversi daftar indeks halaman 0-based menjadi ringkasan rentang 1-based.
 */
export function indicesToRangeString(indices) {
  if (!indices || indices.length === 0) return '';
  const sorted = Array.from(new Set(indices))
    .map((i) => i + 1)
    .sort((a, b) => a - b);
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

export function downloadPdf(pdfBytes, fileName) {
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

/**
 * Mengonversi file gambar (PNG/WebP/BMP/JPG) melalui canvas menjadi JPEG ArrayBuffer
 * dengan latar putih agar aman disematkan oleh pdf-lib tanpa isu transparansi.
 */
export function imageFileToJpegBuffer(file, quality = 0.88) {
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
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Gagal mengonversi gambar'));
            blob.arrayBuffer().then(resolve).catch(reject);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error(`Gagal membaca file gambar: ${file.name}`));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(`Gagal membuka file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function reorderArrayItem(items, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const updated = [...items];
  const temp = updated[index];
  updated[index] = updated[targetIndex];
  updated[targetIndex] = temp;
  return updated;
}
