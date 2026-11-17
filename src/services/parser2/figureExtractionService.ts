// NCERTify AI Parser 2.0 - Exact Original Figure Extraction Service
// High-resolution rendering (180-200 DPI), embedded image extraction, and Sharp coordinate cropping
// Strictly preserves original diagrams without AI redrawing or hallucination

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { Parser2CropType, Parser2Figure } from './types';
import { uploadParser2Asset } from './parser2R2Storage';

const execAsync = promisify(exec);

export type CropLayoutMode = 'two_column_bilingual' | 'two_column_english' | 'single_column' | 'manual';

export interface CroppedFigureValidationMetrics {
  valid: boolean;
  likelyTextOnly: boolean;
  width: number;
  height: number;
  darkPixelRatio: number;
  areaRatio: number;
  reason?: string;
}

export interface OptionBoxesValidationResult {
  allValid: boolean;
  validBoxes: Partial<Record<'A' | 'B' | 'C' | 'D', [number, number, number, number]>>;
  rejectedLabels: Array<'A' | 'B' | 'C' | 'D'>;
  reasons: string[];
}

export class FigureExtractionService {
  private pageRenderCacheDir = path.resolve(process.cwd(), '.temp_render', 'cache');

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  /**
   * Render a specific PDF page to high-DPI PNG image using Ghostscript (with disk cache)
   */
  public async renderPdfPageToPng(
    pdfPathOrBuffer: string | Buffer,
    pageNumber: number,
    dpi: number = 200
  ): Promise<Buffer> {
    const tempDir = path.resolve(process.cwd(), '.temp_render');
    this.ensureDir(tempDir);
    this.ensureDir(this.pageRenderCacheDir);

    let pdfHash = '';
    if (typeof pdfPathOrBuffer === 'string' && fs.existsSync(pdfPathOrBuffer)) {
      const stat = fs.statSync(pdfPathOrBuffer);
      pdfHash = crypto.createHash('md5').update(`${pdfPathOrBuffer}:${stat.size}:${stat.mtimeMs}`).digest('hex').slice(0, 12);
    } else if (Buffer.isBuffer(pdfPathOrBuffer)) {
      pdfHash = crypto.createHash('md5').update(pdfPathOrBuffer.subarray(0, Math.min(65536, pdfPathOrBuffer.length))).update(String(pdfPathOrBuffer.length)).digest('hex').slice(0, 12);
    }

    const cachedPngPath = pdfHash ? path.join(this.pageRenderCacheDir, `${pdfHash}_p${pageNumber}_d${dpi}.png`) : '';
    if (cachedPngPath && fs.existsSync(cachedPngPath)) {
      try {
        const cached = fs.readFileSync(cachedPngPath);
        if (cached.length > 500) return cached;
      } catch {}
    }

    let pdfFilePath = '';
    let isTempFile = false;

    if (typeof pdfPathOrBuffer === 'string' && fs.existsSync(pdfPathOrBuffer)) {
      pdfFilePath = pdfPathOrBuffer;
    } else {
      isTempFile = true;
      pdfFilePath = path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.pdf`);
      fs.writeFileSync(pdfFilePath, pdfPathOrBuffer as Buffer);
    }

    const outputPngPath = path.join(tempDir, `page_${pageNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}.png`);

    try {
      // Use Ghostscript for crisp anti-aliased text, vector lines, and mathematical symbols
      const gsCmd = `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r${dpi} -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=${pageNumber} -dLastPage=${pageNumber} -sOutputFile="${outputPngPath}" "${pdfFilePath}"`;
      await execAsync(gsCmd);

      if (fs.existsSync(outputPngPath)) {
        const imageBuffer = fs.readFileSync(outputPngPath);
        if (cachedPngPath) {
          try { fs.writeFileSync(cachedPngPath, imageBuffer); } catch {}
        }
        return imageBuffer;
      }
      throw new Error(`Ghostscript did not produce output at ${outputPngPath}`);
    } catch (gsErr: any) {
      console.warn(`[FigureExtraction] GS render warning on page ${pageNumber}:`, gsErr.message);
      // Fallback: try pdftoppm if available
      try {
        const ppmPrefix = `ppm_${pageNumber}_${Date.now()}`;
        const ppmCmd = `pdftoppm -png -r ${dpi} -f ${pageNumber} -l ${pageNumber} "${pdfFilePath}" "${tempDir}/${ppmPrefix}"`;
        await execAsync(ppmCmd);
        const ppmFiles = fs.readdirSync(tempDir).filter(f => f.startsWith(ppmPrefix));
        if (ppmFiles.length > 0) {
          const ppmPath = path.join(tempDir, ppmFiles[0]);
          const buf = fs.readFileSync(ppmPath);
          fs.unlinkSync(ppmPath);
          if (cachedPngPath) {
            try { fs.writeFileSync(cachedPngPath, buf); } catch {}
          }
          return buf;
        }
      } catch {}
      throw new Error(`Failed to render page ${pageNumber} to image.`);
    } finally {
      if (fs.existsSync(outputPngPath)) {
        try { fs.unlinkSync(outputPngPath); } catch {}
      }
      if (isTempFile && fs.existsSync(pdfFilePath)) {
        try { fs.unlinkSync(pdfFilePath); } catch {}
      }
    }
  }

  /**
   * Crop precise rectangular bounding box [ymin, xmin, ymax, xmax] from a rendered page image
   * Coordinates are normalized 0..1000 scale (or standard pixels if specified).
   * Respects page layout so single-column/manual crops are never truncated mid-diagram.
   */
  public async cropFigureFromPage(
    pageImageBuffer: Buffer,
    boundingBox: [number, number, number, number], // [ymin, xmin, ymax, xmax]
    isNormalized: boolean = true,
    layoutMode: CropLayoutMode = 'two_column_bilingual',
    cropOptions?: { skipTrim?: boolean }
  ): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    pageWidth: number;
    pageHeight: number;
    pixelBox: { x: number; y: number; width: number; height: number };
  }> {
    const metadata = await sharp(pageImageBuffer).metadata();
    const imgWidth = metadata.width || 1000;
    const imgHeight = metadata.height || 1400;

    let [ymin, xmin, ymax, xmax] = boundingBox;
    if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
    if (xmin > xmax) [xmin, xmax] = [xmax, xmin];

    let top: number;
    let left: number;
    let width: number;
    let height: number;

    if (isNormalized) {
      if (layoutMode === 'two_column_bilingual' && xmin < 480 && xmax > 495 && xmax < 750) {
        xmax = 490;
      }

      top = Math.round((Math.max(0, ymin) / 1000) * imgHeight);
      left = Math.round((Math.max(0, xmin) / 1000) * imgWidth);
      width = Math.round(((Math.min(1000, xmax) - Math.max(0, xmin)) / 1000) * imgWidth);
      height = Math.round(((Math.min(1000, ymax) - Math.max(0, ymin)) / 1000) * imgHeight);
    } else {
      top = Math.round(ymin);
      left = Math.round(xmin);
      width = Math.round(xmax - xmin);
      height = Math.round(ymax - ymin);
    }

    // Boundary clamps
    left = Math.max(0, Math.min(left, imgWidth - 10));
    top = Math.max(0, Math.min(top, imgHeight - 10));
    width = Math.min(width, imgWidth - left);
    height = Math.min(height, imgHeight - top);

    if (width < 12 || height < 12) {
      throw new Error(`Crop area too small (${width}x${height})`);
    }

    const pixelBox = { x: left, y: top, width, height };

    // 1. Initial exact pixel crop with white background fill
    const initialCrop = await sharp(pageImageBuffer)
      .extract({ left, top, width, height })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 95 })
      .toBuffer();

    // For manual admin crops (or explicit skipTrim), return the exact pixel region 1:1 with live preview!
    if (layoutMode === 'manual' || cropOptions?.skipTrim) {
      const exactMeta = await sharp(initialCrop).metadata();
      return {
        buffer: initialCrop,
        width: exactMeta.width || width,
        height: exactMeta.height || height,
        pageWidth: imgWidth,
        pageHeight: imgHeight,
        pixelBox
      };
    }

    // 2. Intelligent whitespace auto-trim for AI-detected auto-crops
    try {
      const trimmed = await sharp(initialCrop)
        .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 22 })
        .extend({ top: 10, bottom: 10, left: 10, right: 10, background: { r: 255, g: 255, b: 255 } })
        .png({ quality: 95, compressionLevel: 8 })
        .toBuffer();

      const trimmedMeta = await sharp(trimmed).metadata();
      return {
        buffer: trimmed,
        width: trimmedMeta.width || width,
        height: trimmedMeta.height || height,
        pageWidth: imgWidth,
        pageHeight: imgHeight,
        pixelBox
      };
    } catch {
      const fallbackMeta = await sharp(initialCrop).metadata();
      return {
        buffer: initialCrop,
        width: fallbackMeta.width || width,
        height: fallbackMeta.height || height,
        pageWidth: imgWidth,
        pageHeight: imgHeight,
        pixelBox
      };
    }
  }

  /**
   * Pixel-level validation of a cropped image buffer to block blank crops, tiny noise,
   * half-page captures, or dense printed text blocks accidentally cropped as figures.
   */
  public async validateCroppedFigureMetrics(
    cropBuffer: Buffer,
    pageWidth: number,
    pageHeight: number,
    kind: 'question_figure' | 'option_figure' = 'question_figure'
  ): Promise<CroppedFigureValidationMetrics> {
    const { data, info } = await sharp(cropBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const areaRatio = (w * h) / Math.max(1, pageWidth * pageHeight);

    const minW = kind === 'option_figure' ? 22 : 28;
    const minH = kind === 'option_figure' ? 18 : 24;
    if (w < minW || h < minH) {
      return {
        valid: false,
        likelyTextOnly: false,
        width: w,
        height: h,
        darkPixelRatio: 0,
        areaRatio,
        reason: `Cropped image too small (${w}x${h}px)`
      };
    }

    const maxArea = kind === 'option_figure' ? 0.30 : 0.48;
    if (areaRatio > maxArea) {
      return {
        valid: false,
        likelyTextOnly: false,
        width: w,
        height: h,
        darkPixelRatio: 0,
        areaRatio,
        reason: `Crop covers ${Math.round(areaRatio * 100)}% of page (half-page capture blocked)`
      };
    }

    let darkPixels = 0;
    const rowDarkCounts = new Array<number>(h).fill(0);

    for (let y = 0; y < h; y++) {
      let rowDark = 0;
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        if (data[rowOffset + x] < 215) {
          darkPixels++;
          rowDark++;
        }
      }
      rowDarkCounts[y] = rowDark;
    }

    const darkPixelRatio = darkPixels / Math.max(1, w * h);
    if (darkPixelRatio < 0.003) {
      return {
        valid: false,
        likelyTextOnly: false,
        width: w,
        height: h,
        darkPixelRatio,
        areaRatio,
        reason: 'Cropped region is blank / empty whitespace'
      };
    }

    if (darkPixelRatio > 0.72) {
      return {
        valid: false,
        likelyTextOnly: false,
        width: w,
        height: h,
        darkPixelRatio,
        areaRatio,
        reason: 'Cropped region is solid dark block / scan artifact'
      };
    }

    // Heuristic check for text-line-only paragraphs:
    // Printed text lines have regular thin horizontal dark bands separated by blank white leading rows.
    // Genuine figures (graphs, circuits, rings, rays) tend to have long continuous vertical/diagonal ink strokes
    // or non-periodic row densities without uniform text-line gaps.
    let activeBands = 0;
    let inBand = false;
    let bandStart = 0;
    const bandHeights: number[] = [];

    for (let y = 0; y < h; y++) {
      const hasInk = rowDarkCounts[y] > Math.max(2, w * 0.015);
      if (hasInk && !inBand) {
        inBand = true;
        bandStart = y;
      } else if (!hasInk && inBand) {
        inBand = false;
        activeBands++;
        bandHeights.push(y - bandStart);
      }
    }
    if (inBand) {
      activeBands++;
      bandHeights.push(h - bandStart);
    }

    const avgBandH = bandHeights.length > 0 ? bandHeights.reduce((a, b) => a + b, 0) / bandHeights.length : 0;
    const maxBandH = bandHeights.length > 0 ? Math.max(...bandHeights) : 0;
    // Printed text paragraphs typically have >= 3 thin bands each 8..34px tall with no tall continuous graphics (> 45px)
    const likelyTextOnly = activeBands >= 3 && avgBandH >= 6 && avgBandH <= 36 && maxBandH <= 42;

    return {
      valid: true,
      likelyTextOnly,
      width: w,
      height: h,
      darkPixelRatio,
      areaRatio
    };
  }

  /**
   * Validates option bounding boxes A-D to guarantee non-overlapping, well-sized coordinates.
   * Blocks Screenshot 3 issues where shifted option boxes overlap or capture adjacent lines.
   */
  public validateOptionBoundingBoxes(
    boxes: Partial<Record<'A' | 'B' | 'C' | 'D', [number, number, number, number] | undefined>>,
    layoutMode: CropLayoutMode = 'two_column_bilingual'
  ): OptionBoxesValidationResult {
    const validBoxes: Partial<Record<'A' | 'B' | 'C' | 'D', [number, number, number, number]>> = {};
    const rejectedLabels: Array<'A' | 'B' | 'C' | 'D'> = [];
    const reasons: string[] = [];
    const candidates: Array<{ lbl: 'A' | 'B' | 'C' | 'D'; box: [number, number, number, number] }> = [];

    for (const lbl of ['A', 'B', 'C', 'D'] as const) {
      const raw = boxes[lbl];
      if (!raw || !Array.isArray(raw) || raw.length !== 4) continue;
      let [ymin, xmin, ymax, xmax] = raw.map(Number);
      if ([ymin, xmin, ymax, xmax].some(v => Number.isNaN(v))) {
        rejectedLabels.push(lbl);
        reasons.push(`Option ${lbl} has NaN coordinates`);
        continue;
      }
      if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
      if (xmin > xmax) [xmin, xmax] = [xmax, xmin];

      if (layoutMode === 'two_column_bilingual' && xmin >= 505) {
        rejectedLabels.push(lbl);
        reasons.push(`Option ${lbl} fell in Hindi right column (xmin=${xmin})`);
        continue;
      }

      const h = ymax - ymin;
      const w = xmax - xmin;
      if (h < 15 || w < 15 || h > 340 || w > 520) {
        rejectedLabels.push(lbl);
        reasons.push(`Option ${lbl} dimensions out of bounds (${w}x${h})`);
        continue;
      }

      candidates.push({ lbl, box: [ymin, xmin, ymax, xmax] });
    }

    // Check pairwise overlaps among valid candidates
    const overlapping = new Set<'A' | 'B' | 'C' | 'D'>();
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        const interYmin = Math.max(a.box[0], b.box[0]);
        const interXmin = Math.max(a.box[1], b.box[1]);
        const interYmax = Math.min(a.box[2], b.box[2]);
        const interXmax = Math.min(a.box[3], b.box[3]);

        if (interYmax > interYmin && interXmax > interXmin) {
          const interArea = (interYmax - interYmin) * (interXmax - interXmin);
          const areaA = (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]);
          const areaB = (b.box[2] - b.box[0]) * (b.box[3] - b.box[1]);
          const overlapRatio = interArea / Math.max(1, Math.min(areaA, areaB));

          if (overlapRatio > 0.25) {
            overlapping.add(a.lbl);
            overlapping.add(b.lbl);
            reasons.push(`Options ${a.lbl} and ${b.lbl} bounding boxes overlap by ${Math.round(overlapRatio * 100)}%`);
          }
        }
      }
    }

    for (const c of candidates) {
      if (overlapping.has(c.lbl)) {
        if (!rejectedLabels.includes(c.lbl)) rejectedLabels.push(c.lbl);
      } else {
        validBoxes[c.lbl] = c.box;
      }
    }

    return {
      allValid: rejectedLabels.length === 0 && Object.keys(validBoxes).length > 0,
      validBoxes,
      rejectedLabels,
      reasons
    };
  }

  /**
   * Crop, save to R2, and create a Parser2Figure record
   */
  public async extractAndSaveFigure(
    jobId: string,
    pageNumber: number,
    questionNumber: number,
    pageImageBuffer: Buffer,
    boundingBox: [number, number, number, number],
    figureType: Parser2Figure['figureType'] = 'diagram',
    isManualCrop: boolean = false,
    options?: {
      layoutMode?: CropLayoutMode;
      preCropped?: {
        buffer: Buffer;
        width: number;
        height: number;
        pixelBox?: { x: number; y: number; width: number; height: number };
      };
      suffix?: string;
      questionId?: string;
      sourcePdfId?: string;
      cropType?: Parser2CropType;
      skipTrim?: boolean;
    }
  ): Promise<Parser2Figure> {
    const cropped = options?.preCropped
      ? options.preCropped
      : await this.cropFigureFromPage(
          pageImageBuffer,
          boundingBox,
          true,
          isManualCrop ? 'manual' : (options?.layoutMode || 'two_column_bilingual'),
          { skipTrim: options?.skipTrim ?? isManualCrop }
        );

    const uniqueSuffix = options?.suffix ? `_${options.suffix}` : '';
    const rand = Math.random().toString(36).substring(2, 6);
    const fileName = `q${questionNumber}_p${pageNumber}${uniqueSuffix}_${Date.now()}_${rand}.png`;
    const storageResult = await uploadParser2Asset(jobId, 'figures', fileName, cropped.buffer, 'image/png');

    const resolvedCropType = options?.cropType || (figureType !== 'embedded_image' ? figureType : 'diagram');
    const figure: Parser2Figure = {
      id: `fig-${jobId}-q${questionNumber}${uniqueSuffix}-${Date.now()}-${rand}`,
      jobId,
      questionId: options?.questionId || `q-${jobId}-${questionNumber}`,
      questionNumber,
      pageNumber,
      sourcePdfId: options?.sourcePdfId || 'questions.pdf',
      figureKey: storageResult.storageKey,
      figureUrl: storageResult.publicUrl,
      boundingBox,
      pixelBox: cropped.pixelBox,
      width: cropped.width,
      height: cropped.height,
      naturalWidth: cropped.width,
      naturalHeight: cropped.height,
      figureType,
      cropType: resolvedCropType,
      isManualCrop,
      createdAt: new Date().toISOString()
    };

    return figure;
  }

  /**
   * Fast, reliable local extraction of page text using Ghostscript txtwrite (0 rate limit, 0 cost)
   */
  public async extractPdfPageText(
    pdfPathOrBuffer: string | Buffer,
    pageNumber: number
  ): Promise<string> {
    const tempDir = path.resolve(process.cwd(), '.temp_render');
    this.ensureDir(tempDir);

    let pdfFilePath = '';
    let isTempFile = false;

    if (typeof pdfPathOrBuffer === 'string' && fs.existsSync(pdfPathOrBuffer)) {
      pdfFilePath = pdfPathOrBuffer;
    } else {
      isTempFile = true;
      pdfFilePath = path.join(tempDir, `temp_txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.pdf`);
      fs.writeFileSync(pdfFilePath, pdfPathOrBuffer as Buffer);
    }

    const outputTxtPath = path.join(tempDir, `page_txt_${pageNumber}_${Date.now()}.txt`);

    try {
      const gsCmd = `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=txtwrite -dFirstPage=${pageNumber} -dLastPage=${pageNumber} -sOutputFile="${outputTxtPath}" "${pdfFilePath}"`;
      await execAsync(gsCmd);
      if (fs.existsSync(outputTxtPath)) {
        const text = fs.readFileSync(outputTxtPath, 'utf8');
        return text.trim();
      }
      return '';
    } catch {
      return '';
    } finally {
      if (isTempFile && fs.existsSync(pdfFilePath)) {
        try { fs.unlinkSync(pdfFilePath); } catch {}
      }
      if (fs.existsSync(outputTxtPath)) {
        try { fs.unlinkSync(outputTxtPath); } catch {}
      }
    }
  }
}

export const figureExtractionService = new FigureExtractionService();
