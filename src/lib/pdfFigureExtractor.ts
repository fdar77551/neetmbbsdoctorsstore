import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // In pdfjs-dist v4+, worker files are modern ES modules (.mjs).
    // cdnjs does not host pdfjs-dist v6+, which caused 404/MIME errors.
    // jsdelivr provides the official CORS-enabled ES module worker for exact pdfjs-dist versions.
    const version = pdfjsLib.version || '6.3.289';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup note:', e);
  }
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
}

export interface ExtractedPdfFigure {
  id: string;
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  associatedQuestionNumber?: number;
  label?: string;
}

/**
 * Loads a PDF file and returns the document proxy and total page count
 */
export async function loadPdfDocument(file: File | ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const version = pdfjsLib.version || '6.3.289';
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

// Track active render tasks per canvas to prevent "Cannot use the same canvas during multiple render() operations"
const activeCanvasRenderTasks = new WeakMap<HTMLCanvasElement, { cancel: () => void; promise: Promise<any> }>();

/**
 * Proactively cancels any active PDF rendering on a given canvas element
 */
export function cancelCanvasRender(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const existing = activeCanvasRenderTasks.get(canvas);
  if (existing) {
    try {
      existing.cancel();
    } catch {
      // Ignore cancellation exceptions
    }
  }
}

/**
 * Renders a specific PDF page to an HTML5 Canvas at crisp high DPI (default 2.0x scale)
 * Automatically cancels and awaits any previous render operation on the target canvas.
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 2.0
): Promise<{ width: number; height: number; text: string }> {
  // 1. Cancel any active render operation on this canvas and wait for it to complete/abort
  const existing = activeCanvasRenderTasks.get(canvas);
  if (existing) {
    try {
      existing.cancel();
      await existing.promise.catch(() => {});
    } catch {
      // Ignore
    }
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not get 2D canvas context');

  // Fill pure white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  const renderTask = page.render(renderContext);

  // Register the new active task for this canvas
  const taskEntry = {
    cancel: () => {
      try {
        renderTask.cancel();
      } catch {
        // Ignore
      }
    },
    promise: renderTask.promise,
  };
  activeCanvasRenderTasks.set(canvas, taskEntry);

  try {
    await renderTask.promise;
  } catch (err: any) {
    // If deliberately cancelled, re-throw with flag so caller can ignore safely
    if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
      const cancelErr = new Error('PDF rendering cancelled');
      cancelErr.name = 'RenderingCancelledException';
      throw cancelErr;
    }
    throw err;
  } finally {
    // Only clean up if this was still the active task
    const current = activeCanvasRenderTasks.get(canvas);
    if (current && current.promise === renderTask.promise) {
      activeCanvasRenderTasks.delete(canvas);
    }
  }

  // Extract text content
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item: any) => item.str || '')
    .join(' ');

  return {
    width: viewport.width,
    height: viewport.height,
    text
  };
}

/**
 * Crops a precise bounding box from a canvas and returns a lossless PNG / WebP DataURL
 */
export function cropRegionFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  cropRect: { x: number; y: number; width: number; height: number },
  format: 'image/png' | 'image/webp' = 'image/png'
): string {
  if (cropRect.width <= 0 || cropRect.height <= 0) return '';

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.round(cropRect.width);
  cropCanvas.height = Math.round(cropRect.height);

  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return '';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  ctx.drawImage(
    sourceCanvas,
    Math.round(cropRect.x),
    Math.round(cropRect.y),
    Math.round(cropRect.width),
    Math.round(cropRect.height),
    0,
    0,
    Math.round(cropRect.width),
    Math.round(cropRect.height)
  );

  return cropCanvas.toDataURL(format, 0.95);
}

/**
 * Extracts raw page text for all pages of a PDF
 */
export async function extractAllPdfText(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<PdfPageInfo[]> {
  const results: PdfPageInfo[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');

    results.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      text
    });
  }

  return results;
}
