import { PDFDocument, degrees } from 'pdf-lib';
import { imageFileToJpegBuffer } from './pdfUtils';
import { renderPdfPageThumbnail } from './pdfPreview';

export async function renderPdfThumbnailsProgressive(buffer, totalPages, onProgress, width = 240) {
  const thumbs = [];
  for (let p = 1; p <= totalPages; p++) {
    const thumb = await renderPdfPageThumbnail(buffer, p, width);
    thumbs.push(thumb);
    if (p % 3 === 0 || p === totalPages) {
      onProgress([...thumbs]);
    }
  }
  return thumbs;
}

export async function loadPdfPageCount(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function mergePdfFiles(files) {
  const mergedDoc = await PDFDocument.create();
  for (const item of files) {
    const buffer = await item.file.arrayBuffer();
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => mergedDoc.addPage(p));
  }
  return mergedDoc.save();
}

export async function extractPdfPages(file, targetIndices) {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

export async function compressPdfFile(file) {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const bytes = await doc.save({ useObjectStreams: true });

  const originalSize = file.size;
  const newSize = bytes.length;
  const savedBytes = originalSize - newSize;
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  return {
    bytes,
    originalSize,
    newSize,
    savedPercent: Math.max(0, savedPercent),
  };
}

export async function imagesToPdfBytes(imageFiles, { pageSize = 'a4', orientation = 'auto' }) {
  const doc = await PDFDocument.create();
  for (const item of imageFiles) {
    const jpegBuffer = await imageFileToJpegBuffer(item.file);
    const embedded = await doc.embedJpg(jpegBuffer);

    let pageWidth;
    let pageHeight;
    let drawWidth;
    let drawHeight;
    let x = 0;
    let y = 0;

    if (pageSize === 'fit') {
      pageWidth = embedded.width;
      pageHeight = embedded.height;
      drawWidth = embedded.width;
      drawHeight = embedded.height;
    } else {
      const a4W = 595.28;
      const a4H = 841.89;
      const isLandscape =
        orientation === 'landscape' || (orientation === 'auto' && embedded.width > embedded.height);
      pageWidth = isLandscape ? a4H : a4W;
      pageHeight = isLandscape ? a4W : a4H;
      const margin = 20;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
      drawWidth = embedded.width * scale;
      drawHeight = embedded.height * scale;
      x = (pageWidth - drawWidth) / 2;
      y = (pageHeight - drawHeight) / 2;
    }

    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(embedded, { x, y, width: drawWidth, height: drawHeight });
  }
  return doc.save();
}

export async function rotatePdfPages(file, isPageRotated, rotateAngle) {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const targetIndices = [];

  for (let i = 0; i < total; i++) {
    if (isPageRotated(i)) targetIndices.push(i);
  }

  if (targetIndices.length === 0) {
    return { targetCount: 0, bytes: null };
  }

  targetIndices.forEach((idx) => {
    const page = doc.getPage(idx);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + rotateAngle) % 360));
  });

  const bytes = await doc.save();
  return { targetCount: targetIndices.length, bytes };
}
