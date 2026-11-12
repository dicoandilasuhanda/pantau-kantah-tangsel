let pdfjsLibPromise = null;

async function getPdfJs() {
  if (!pdfjsLibPromise) {
    const pdfModuleUrl = '/pdfjs/pdf.min.mjs';
    pdfjsLibPromise = import(/* @vite-ignore */ pdfModuleUrl).then((lib) => {
      if (lib && lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      }
      return lib;
    });
  }
  return pdfjsLibPromise;
}

/**
 * Render a single page of PDF data to an image data URL
 * @param {ArrayBuffer|Uint8Array} pdfData 
 * @param {number} pageNumber 1-based page number
 * @param {number} maxDimension max width or height for thumbnail
 * @returns {Promise<string>} data URL
 */
export async function renderPdfPageThumbnail(pdfData, pageNumber = 1, maxDimension = 300) {
  try {
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfData,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    if (pageNumber > pdf.numPages) return null;
    
    const page = await pdf.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(maxDimension / unscaledViewport.width, maxDimension / unscaledViewport.height);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('Error rendering PDF thumbnail:', err);
    return null;
  }
}

/**
 * Get total pages of a PDF
 */
export async function getPdfInfo(pdfData) {
  try {
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    return {
      numPages: pdf.numPages
    };
  } catch (err) {
    console.error('Error getting PDF info:', err);
    throw err;
  }
}
