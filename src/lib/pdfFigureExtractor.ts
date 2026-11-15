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

/**
 * Extracts text from a PDF page respecting standard 2-column NEET exam paper layouts.
 * Prevents interleaving of left and right column questions.
 */
export async function extractColumnAwareTextFromPdfPage(page: any): Promise<string> {
  try {
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as any[];
    if (items.length === 0) return '';

    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width || 600;
    const midX = pageWidth / 2;

    // Detect if the page has items in both left and right halves
    let leftCount = 0;
    let rightCount = 0;
    for (const it of items) {
      const x = it.transform?.[4] ?? 0;
      if (x < midX - 25) leftCount++;
      else if (x > midX + 25) rightCount++;
    }

    const isTwoColumn = leftCount >= 10 && rightCount >= 10;

    const processItems = (colItems: any[]): string => {
      if (colItems.length === 0) return '';

      // Filter out completely empty or blank items
      const validItems = colItems
        .map(it => ({
          str: it.str || '',
          x: it.transform?.[4] ?? 0,
          y: it.transform?.[5] ?? 0,
          width: it.width ?? 0,
          height: it.height ?? (it.transform?.[0] ? Math.abs(it.transform[0]) : 9),
          hasEOL: Boolean(it.hasEOL)
        }))
        .filter(it => it.str.length > 0 || it.hasEOL);

      if (validItems.length === 0) return '';

      // 1. Sort items primarily by Y descending (top to bottom)
      validItems.sort((a, b) => b.y - a.y);

      // 2. Cluster items into visual lines using a baseline tolerance
      // In PDF typography, standard line spacing is 11-15pt. Superscripts are elevated by 2-5pt,
      // subscripts are lowered by 2-4pt. A vertical tolerance of ~6.0pt groups superscripts/subscripts
      // with their host line, preventing them from sorting above the line.
      interface TextLine {
        baseY: number;
        items: typeof validItems;
      }
      const lines: TextLine[] = [];

      for (const it of validItems) {
        // Find existing line where item's baseline matches host line
        // Superscripts have slightly higher Y (up to +5.5pt); subscripts have slightly lower Y (down to -4.0pt)
        let matchedLine: TextLine | null = null;
        for (const line of lines) {
          const dy = it.y - line.baseY;
          if (dy >= -4.5 && dy <= 5.8) {
            matchedLine = line;
            break;
          }
        }

        if (matchedLine) {
          matchedLine.items.push(it);
        } else {
          lines.push({
            baseY: it.y,
            items: [it]
          });
        }
      }

      // 3. Sort lines by baseline Y descending (top to bottom)
      lines.sort((a, b) => b.baseY - a.baseY);

      // 4. Within each line, sort items strictly by X ascending (left to right)
      // This guarantees that exponents (at higher X) ALWAYS appear after base text!
      let res = '';
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        line.items.sort((a, b) => a.x - b.x);

        let lineText = '';
        let lastX = 0;
        let lastWidth = 0;
        let lastStr = '';

        for (const it of line.items) {
          const gap = it.x - (lastX + lastWidth);
          const isSuperscript = (it.y > line.baseY + 1.2) && (it.height < 8.5 || /^[+\-]?\d+$/.test(it.str.trim()));

          if (lineText.length > 0 && !lineText.endsWith(' ')) {
            // Do NOT insert space if it's a superscript exponent right next to 10 or a variable
            if (isSuperscript && (lastStr.endsWith('10') || lastStr.endsWith('t') || lastStr.endsWith('x') || lastStr.endsWith('y') || lastStr.endsWith('M') || lastStr.endsWith('L') || lastStr.endsWith('T') || lastStr.endsWith('A') || lastStr.endsWith('tan') || lastStr.endsWith('sin') || lastStr.endsWith('cos'))) {
              // Direct superscript attachment with '^' or direct token
              if (/^[+\-]?\d+$/.test(it.str.trim())) {
                lineText += `^${it.str.trim()}`;
                lastX = it.x;
                lastWidth = it.width;
                lastStr = it.str;
                continue;
              }
            } else if (gap > 2.2 || it.str.startsWith(' ')) {
              lineText += ' ';
            }
          }

          lineText += it.str;
          lastX = it.x;
          lastWidth = it.width;
          lastStr = it.str;
        }

        if (lineText.trim().length > 0) {
          if (res.length > 0) {
            res += '\n';
          }
          res += lineText.trim();
        }
      }

      return res;
    };

    if (isTwoColumn) {
      const leftItems = items.filter(it => (it.transform?.[4] ?? 0) < midX);
      const rightItems = items.filter(it => (it.transform?.[4] ?? 0) >= midX);
      return `${processItems(leftItems)}\n\n${processItems(rightItems)}`;
    } else {
      return processItems([...items]);
    }
  } catch (err) {
    console.warn('Column-aware text extraction error:', err);
    return '';
  }
}
