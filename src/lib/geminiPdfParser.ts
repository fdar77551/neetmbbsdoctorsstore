import { MockQuestion, MockSubject, MockTest, MockTestType } from '../types';
import { cropRegionFromCanvas, extractColumnAwareTextFromPdfPage, renderPdfPageToCanvas } from './pdfFigureExtractor';
import { saveStoredMockQuestions, saveStoredMockTests, getStoredMockTests, formatScientificMathAndPowers, cleanLeadingOptionMarker } from './mockTestData';

// Global quota tracker to immediately skip repeated 429 delays once daily quota is exhausted
let globalDailyQuotaExhausted = false;
export function setDailyQuotaExhausted(val: boolean) { globalDailyQuotaExhausted = val; }
export function isDailyQuotaExhausted() { return globalDailyQuotaExhausted; }

export interface ParsedGeminiOption {
  label: string;
  text: string;
}

export interface ParsedGeminiQuestion {
  questionNumber: number;
  subject?: string;
  chapter?: string;
  hasFigure?: boolean;
  figureDescription?: string;
  figureBoundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  matchTable?: {
    column1Header: string;
    column2Header: string;
    rows: Array<{
      leftKey: string;
      leftText: string;
      rightKey: string;
      rightText: string;
    }>;
  };
  english: {
    questionText: string;
    options: ParsedGeminiOption[];
  };
  hindi?: {
    questionText: string;
    options?: ParsedGeminiOption[];
  };
  optionsWithFigures?: Array<{
    label: string;
    boundingBox: [number, number, number, number];
  }>;
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export type GeminiParseStatus =
  | 'idle'
  | 'uploading_pdf'
  | 'analyzing_pdf'
  | 'extracting_questions'
  | 'detecting_figures'
  | 'cropping_figures'
  | 'structuring_tables'
  | 'finalizing_test'
  | 'completed'
  | 'error';

export interface GeminiParseProgress {
  currentPage: number;
  totalPages: number;
  questionsFound: number;
  figuresCropped: number;
  status: GeminiParseStatus;
  statusMessage: string;
  currentStageIndex?: number;
  accuracyFlagsCount?: number;
}

/**
 * Cleans up corrupted font encoding, mojibake, and mathematical artifacts commonly
 * found in scanned and vector-extracted NEET PDF papers. Converts programmer ASCII
 * formulas into clean scientific Unicode (μ₀, π, ε₀, ω, etc.).
 */
export function sanitizeExamText(text: string): string {
  if (!text) return '';
  return text
    // Replace encoding mojibake with authentic scientific symbols
    .replace(/âˆ’|â€“|â€”/g, '−')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€ /g, '"')
    .replace(/Ã—/g, '×')
    .replace(/Ã·/g, '÷')
    .replace(/âˆš/g, '√')
    .replace(/âˆћ|âˆž/g, '∞')
    .replace(/â‰ˆ/g, '≈')
    .replace(/â‰ /g, '≠')
    .replace(/â‰¤/g, '≤')
    .replace(/â‰¥/g, '≥')
    .replace(/â„¦|â„©/g, 'Ω')
    .replace(/Î¼/g, 'μ')
    .replace(/Î±/g, 'α')
    .replace(/Î²/g, 'β')
    .replace(/Î³/g, 'γ')
    .replace(/Î¸/g, 'θ')
    .replace(/Î»/g, 'λ')
    .replace(/Ï€/g, 'π')
    .replace(/â†’/g, '→')
    .replace(/â‡Œ/g, '⇌')
    .replace(/Â°C/g, '°C')
    .replace(/Â°/g, '°')
    .replace(/âˆ†/g, 'Δ')
    .replace(/â„«/g, 'Å')
    .replace(/Â±/g, '±')
    .replace(/Âµ/g, 'µ')
    .replace(/Ã¥/g, 'å')
    // Fix common ligature breakages
    .replace(/ï¬\x81|ﬁ/g, 'fi')
    .replace(/ï¬\x82|ﬂ/g, 'fl')
    .replace(/ï¬\x80|ﬀ/g, 'ff')
    // Scientific symbols & programmer ASCII replacement (e.g. mu_0 -> μ₀, pi -> π)
    .replace(/\\?mu[_\s]?0\b/gi, 'μ₀')
    .replace(/\\?epsilon[_\s]?0\b/gi, 'ε₀')
    .replace(/\\?pi\b/gi, 'π')
    .replace(/\\?omega\b/gi, 'ω')
    .replace(/\\?theta\b/gi, 'θ')
    .replace(/\\?lambda\b/gi, 'λ')
    .replace(/\\?alpha\b/gi, 'α')
    .replace(/\\?beta\b/gi, 'β')
    .replace(/\\?gamma\b/gi, 'γ')
    .replace(/\\?Delta\b/g, 'Δ')
    .replace(/\\?sqrt\b/gi, '√')
    .replace(/\\?rightarrow\b/gi, '→')
    .replace(/\s*\*\s*/g, ' · ')
    // Strip orphan markdown table delimiter lines (e.g. |||, |:---|:---|)
    .replace(/^\|?[\s|:\-]+(?:\|[\s|:\-]+)*\|?$/gm, '')
    .replace(/\|{2,}/g, '')
    .replace(/\|\s*:\s*-+[\s\-:|]*/g, '')
    // Remove isolated unprintable control characters
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    // Strip redundant leading numbering e.g. "44. " or "Q.44 " or "(44) "
    // CRITICAL: (?!\d)\s+ lookahead ensures we NEVER strip '2.' from '2.0 × 10 m wide'!
    .replace(/^(?:Q(?:uestion)?\.?\s*\d{1,3}\s*[:.\-)]\s*|\d{1,3}\s*[\.:](?!\d)\s+|\d{1,3}\)\s*)/i, '')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Repairs fragmented Devanagari Hindi text commonly caused by PDF font encoding issues,
 * such as separated matras (क ो -> को, म ें -> में) and phantom spaces between syllables.
 */
export function repairDevanagariText(text: string): string {
  if (!text) return '';
  let repaired = text;

  // 1. Join isolated vowel signs (matras: ा, ि, ी, ु, ू, ृ, े, ै, ो, ौ, ं, ः, ँ, ्) with preceding base consonant
  repaired = repaired
    .replace(/([क-हक़-य़])\s+([ािीुूृेैोौंःँ्])/gu, '$1$2')
    // Second pass for double diacritics e.g. ो + ं
    .replace(/([ािीुूृेैोौ्])\s+([ंःँ])/gu, '$1$2')
    // Remove phantom space in common conjuncts e.g. प ् त -> प्त
    .replace(/([क-हक़-य़])\s*्\s+([क-हक़-य़])/gu, '$1्$2');

  // 2. Remove isolated single latin letters appearing in Hindi text (e.g. "संयोजी ऊतक d. मोटी")
  repaired = repaired.replace(/\s+[a-zA-Z]\.\s+/g, ' ');

  // 3. Normalize whitespace
  return repaired.replace(/[ \t]+/g, ' ').trim();
}

/**
 * Strips duplicated table column content and markdown table syntax from questionText when a matchTable is present,
 * preventing questions like Q44 and Q92 from repeating column lists both above and inside the table.
 * Supports both English (List-I / Column-I) and Hindi (सूची-I / कॉलम-I).
 */
export function cleanQuestionTextForMatchTable(questionText: string, matchTable?: any): string {
  if (!questionText) return '';
  let sanitized = sanitizeExamText(questionText);

  // Strip all markdown table pipes, borders, and empty table syntax
  sanitized = sanitized
    .replace(/^\|?[\s|:\-]+(?:\|[\s|:\-]+)*\|?$/gm, '')
    .replace(/\|{2,}/g, '')
    .replace(/\|\s*:\s*-+[\s\-:|]*/g, '')
    .replace(/^\s*\|\s*$/gm, '');

  if (!matchTable || !matchTable.rows || matchTable.rows.length < 2) {
    return sanitized.replace(/\n{3,}/g, '\n\n').trim();
  }

  let cleaned = sanitized;

  // Pattern A: Match "Match List-I with List-II:" or "Match the corresponding entries of... with..." or "सूची-I को सूची-II से सुमेलित कीजिए:"
  const promptPreambleMatch = cleaned.match(/^([\s\S]*?(?:Match\s+(?:the\s+corresponding\s+entries|the\s+statements|List|Column|entries|items)[\s\S]*?(?:[\.\:\?]|(?=\n\s*(?:\(?[A-Da-d1-4]\)?|[a-zA-Z]+\s*[-–])))|सूची\s*[-–—I1]\s*को\s*सूची[\s\S]*?[:\.]|कॉलम\s*[-–—I1]\s*को\s*कॉलम[\s\S]*?[:\.]))/i);
  const closingInstructionMatch = cleaned.match(/((?:Choose\s+the\s+correct\s+answer|Select\s+the\s+correct\s+option|नीचे\s+दिए\s+गए\s+विकल्पों\s+में\s+से)[\s\S]*)$/i);

  if (promptPreambleMatch && promptPreambleMatch[1] && promptPreambleMatch[1].trim().length > 6) {
    const preamble = promptPreambleMatch[1].trim();
    const ending = closingInstructionMatch ? `\n\n${closingInstructionMatch[1].trim()}` : '';
    return `${preamble}${ending}`.trim();
  }

  // Pattern B: Remove rows matching leftText or rightText from matchTable
  for (const row of matchTable.rows) {
    if (row.leftText && row.leftText.trim().length > 1) {
      const esc = row.leftText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
    }
    if (row.rightText && row.rightText.trim().length > 1) {
      const esc = row.rightText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
    }
  }

  // Remove lines that look like table row keys: "(A) ...", "(B) ...", "(a) ...", "(b) ...", "(1) ...", "(i) ..."
  cleaned = cleaned.replace(/^\s*(?:\(?[A-Da-d1-4I-Vi-v]\)?|[A-Da-d1-4I-Vi-v][\.:])\s+.*$/gm, '');

  // Remove leftover empty column header fragments and orphan row keys
  cleaned = cleaned
    .replace(/(?:Column|List|कॉलम|सूची)\s*[-–—I12]+/gi, '')
    .replace(/^\s*\([a-zA-Z0-9ivx]+\)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || sanitized;
}

/**
 * Crops a normalized bounding box [ymin, xmin, ymax, xmax]
 * Supports both standard 0.0-1.0 Gemini normalized floats and 0-1000 integer scales.
 * Adds optical margin around diagram to capture labels/subscripts, wire extensions, and benzene ring bonds.
 */
export function cropDiagramFromCanvas(
  canvas: HTMLCanvasElement,
  box: [number, number, number, number] | any
): string {
  if (!canvas || !box || !Array.isArray(box) || box.length !== 4) return '';

  let b0 = Number(box[0]);
  let b1 = Number(box[1]);
  let b2 = Number(box[2]);
  let b3 = Number(box[3]);

  if (isNaN(b0) || isNaN(b1) || isNaN(b2) || isNaN(b3)) return '';

  // 1. Detect if coordinates are in 0.0 - 1.0 range (Gemini default normalized coordinate format)
  if (b0 <= 1 && b1 <= 1 && b2 <= 1 && b3 <= 1 && (b2 > 0 || b3 > 0)) {
    b0 = Math.round(b0 * 1000);
    b1 = Math.round(b1 * 1000);
    b2 = Math.round(b2 * 1000);
    b3 = Math.round(b3 * 1000);
  }

  // 2. Safe order resolution (ymin, xmin, ymax, xmax)
  const ymin = Math.max(0, Math.min(1000, Math.min(b0, b2)));
  const ymax = Math.max(0, Math.min(1000, Math.max(b0, b2)));
  const xmin = Math.max(0, Math.min(1000, Math.min(b1, b3)));
  const xmax = Math.max(0, Math.min(1000, Math.max(b1, b3)));

  // Minimum dimensional span check (at least 1.5% of page)
  if (ymax - ymin < 15 || xmax - xmin < 15) return '';

  const y = (ymin / 1000) * canvas.height;
  const x = (xmin / 1000) * canvas.width;
  const h = ((ymax - ymin) / 1000) * canvas.height;
  const w = ((xmax - xmin) / 1000) * canvas.width;

  // Add 45px optical margin around diagram to capture labels, subscripts, wire extensions, and bonds
  const pad = 45;
  const cropX = Math.max(0, Math.round(x - pad));
  const cropY = Math.max(0, Math.round(y - pad));
  const cropW = Math.min(canvas.width - cropX, Math.round(w + pad * 2));
  const cropH = Math.min(canvas.height - cropY, Math.round(h + pad * 2));

  if (cropW <= 20 || cropH <= 20) return '';

  return cropRegionFromCanvas(canvas, {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH
  }, 'image/png');
}

/**
 * Separates mixed bilingual English and Hindi question text, resolving cases
 * where Gemini OCR extracted the Hindi column into the English text or merged both columns.
 */
export function separateBilingualAndCleanQuestion(
  rawEnText: string,
  rawHiText?: string
): { enText: string; hiText?: string } {
  if (!rawEnText && !rawHiText) return { enText: '' };

  // Explicit bilingual delimiter check e.g. "(हिंदी):"
  const bilingualMatch = (rawEnText || '').match(/^([\s\S]*?)(?:\r?\n\s*\(हिंदी\)\s*:\s*|\s*\(हिंदी\)\s*:\s*)([\s\S]+)$/i);
  if (bilingualMatch) {
    const enPart = sanitizeExamText(bilingualMatch[1].trim());
    const hiPart = repairDevanagariText(sanitizeExamText(bilingualMatch[2].trim()));
    return {
      enText: enPart,
      hiText: hiPart
    };
  }

  const devanagariRegex = /[\u0900-\u097F]/g;
  const enDevMatches = (rawEnText || '').match(devanagariRegex) || [];
  const enTotal = (rawEnText || '').replace(/\s+/g, '').length;
  const enDevRatio = enTotal > 0 ? enDevMatches.length / enTotal : 0;

  // If rawEnText has a mix of English and Devanagari lines or blocks
  if (enDevMatches.length > 0) {
    const lines = (rawEnText || '').split(/\r?\n/);
    const enLines: string[] = [];
    const hiLines: string[] = [];

    for (const line of lines) {
      const lineDevCount = (line.match(devanagariRegex) || []).length;
      const lineLen = line.replace(/\s+/g, '').length;
      if (lineLen > 0 && lineDevCount / lineLen > 0.20) {
        hiLines.push(line);
      } else {
        enLines.push(line);
      }
    }

    if (enLines.length > 0 && hiLines.length > 0) {
      const extractedEn = enLines.join(' ').replace(/\s+/g, ' ').trim();
      const extractedHi = hiLines.join(' ').replace(/\s+/g, ' ').trim();
      return {
        enText: sanitizeExamText(extractedEn),
        hiText: repairDevanagariText(sanitizeExamText(rawHiText ? `${rawHiText} ${extractedHi}` : extractedHi))
      };
    }

    // Sentence-boundary split for inline English + Hindi: e.g. "English statement. हिंदी वाक्य।"
    const inlineMatch = (rawEnText || '').match(/^([A-Za-z0-9\s.,!?:;()\-+*/=%<>μπελωθλ°√⇌→]+?)(?:[\.\?\!]\s+|\s{2,})([\u0900-\u097F][\s\S]+)$/);
    if (inlineMatch && inlineMatch[1].trim().length > 10) {
      const extractedEn = inlineMatch[1].trim();
      const extractedHi = inlineMatch[2].trim();
      return {
        enText: sanitizeExamText(extractedEn),
        hiText: repairDevanagariText(sanitizeExamText(rawHiText ? `${rawHiText} ${extractedHi}` : extractedHi))
      };
    }
  }

  // If "english" text is predominantly Devanagari Hindi characters (>40%)
  if (enDevRatio > 0.40) {
    const hiDevMatches = (rawHiText || '').match(devanagariRegex) || [];
    // If rawHiText has English text, swap them!
    if (rawHiText && rawHiText.trim().length > 0 && hiDevMatches.length < enDevMatches.length) {
      return {
        enText: sanitizeExamText(rawHiText),
        hiText: repairDevanagariText(sanitizeExamText(rawEnText))
      };
    } else {
      const repaired = repairDevanagariText(sanitizeExamText(rawEnText));
      return {
        enText: rawHiText && (rawHiText.match(devanagariRegex) || []).length < rawHiText.length * 0.3 ? sanitizeExamText(rawHiText) : '',
        hiText: repaired
      };
    }
  }

  return {
    enText: sanitizeExamText(rawEnText || ''),
    hiText: rawHiText ? repairDevanagariText(sanitizeExamText(rawHiText)) : undefined
  };
}

/**
 * Ensures option texts are properly bilingual-separated, removing Hindi from English options
 * and ensuring all 4 options (A, B, C, D) are cleanly populated with real text and symbols.
 */
export function separateBilingualOptions(
  rawEnOptions: any[] = [],
  rawHiOptions: any[] = []
): { cleanedEnOptions: any[]; cleanedHiOptions: any[] } {
  const devanagariRegex = /[\u0900-\u097F]/g;
  const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

  const cleanedEnOptions = labels.map((lbl, idx) => {
    const optObj = rawEnOptions.find(o => (o.label || '').toUpperCase() === lbl) || rawEnOptions[idx];
    let val = sanitizeExamText(optObj?.text || optObj?.value || '');

    // If option is a match-the-column arrow pair e.g. "A -> c and d; B -> b and d", preserve verbatim!
    if (/^[A-Da-d]\s*(?:->|→|-)\s*/i.test(val.trim())) {
      return {
        label: lbl,
        type: 'text' as const,
        value: formatScientificMathAndPowers(val.trim())
      };
    }

    // Strip leading option numbers/labels while strictly protecting combinations like "(A) and (E) only"
    val = cleanLeadingOptionMarker(val, lbl);

    // Check if this option has Devanagari characters
    const devMatches = (val.match(devanagariRegex) || []).length;
    const totalChars = val.replace(/\s+/g, '').length;
    if (totalChars > 0 && devMatches / totalChars > 0.4) {
      // Look if the corresponding Hindi option has English text to swap with
      const hiOpt = rawHiOptions.find(o => (o.label || '').toUpperCase() === lbl) || rawHiOptions[idx];
      let hiVal = sanitizeExamText(hiOpt?.text || hiOpt?.value || '');
      hiVal = cleanLeadingOptionMarker(hiVal, lbl);
      const hiDevMatches = (hiDevMatchesCount => hiDevMatchesCount)( (hiVal.match(devanagariRegex) || []).length );
      if (hiDevMatches === 0 && hiVal.length > 0) {
        val = hiVal;
      }
    }

    return {
      label: lbl,
      type: 'text' as const,
      value: formatScientificMathAndPowers(val)
    };
  });

  const cleanedHiOptions = labels.map((lbl, idx) => {
    const optObj = rawHiOptions.find(o => (o.label || '').toUpperCase() === lbl) || rawHiOptions[idx];
    let val = optObj ? repairDevanagariText(sanitizeExamText(optObj?.text || optObj?.value || '')) : '';

    if (/^[A-Da-d]\s*(?:->|→|-)\s*/i.test(val.trim())) {
      return {
        label: lbl,
        type: 'text' as const,
        value: formatScientificMathAndPowers(val.trim())
      };
    }

    // Strip leading option numbers/labels while strictly protecting combinations like "(A) and (E) only"
    val = cleanLeadingOptionMarker(val, lbl);

    // If Hindi option is empty, but English option was actually in Hindi, use it
    if (!val) {
      const enRaw = rawEnOptions.find(o => (o.label || '').toUpperCase() === lbl) || rawEnOptions[idx];
      let rawVal = enRaw?.text || enRaw?.value || '';
      rawVal = cleanLeadingOptionMarker(rawVal, lbl);
      if ((rawVal.match(devanagariRegex) || []).length > 2) {
        val = repairDevanagariText(sanitizeExamText(rawVal));
      }
    }

    return {
      label: lbl,
      type: 'text' as const,
      value: formatScientificMathAndPowers(val)
    };
  });

  return { cleanedEnOptions, cleanedHiOptions };
}

/**
 * High-speed canvas pixel scanner: Detects the exact bounding box of dark drawing ink / graphics
 * (benzene rings, circuits, wire bends, square loops, graphs) in a given vertical strip of the PDF page.
 */
export function detectDiagramInkBoundingBoxOnCanvas(
  canvas: HTMLCanvasElement,
  searchYmin: number, // 0-1000 normalized
  searchYmax: number, // 0-1000 normalized
  searchXmin: number = 30,
  searchXmax: number = 970
): [number, number, number, number] | null {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const startY = Math.max(0, Math.floor((searchYmin / 1000) * canvas.height));
    const endY = Math.min(canvas.height, Math.ceil((searchYmax / 1000) * canvas.height));
    const startX = Math.max(0, Math.floor((searchXmin / 1000) * canvas.width));
    const endX = Math.min(canvas.width, Math.ceil((searchXmax / 1000) * canvas.width));

    const regionW = endX - startX;
    const regionH = endY - startY;
    if (regionW <= 10 || regionH <= 10) return null;

    const imgData = ctx.getImageData(startX, startY, regionW, regionH);
    const data = imgData.data;

    let minX = regionW;
    let maxX = 0;
    let minY = regionH;
    let maxY = 0;
    let darkPixelCount = 0;

    // Scan pixels with a step of 2 for high performance (<5ms)
    for (let py = 0; py < regionH; py += 2) {
      for (let px = 0; px < regionW; px += 2) {
        const offset = (py * regionW + px) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];

        // Dark/ink pixel condition (not white/gray background)
        if (a > 100 && (r < 210 || g < 210 || b < 210)) {
          darkPixelCount++;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }

    // A real diagram contains a substantial cluster of ink pixels (at least 60 non-white pixels)
    if (darkPixelCount > 60 && maxX > minX && maxY > minY) {
      const absMinX = startX + minX;
      const absMaxX = startX + maxX;
      const absMinY = startY + minY;
      const absMaxY = startY + maxY;

      // Convert back to 0-1000 normalized coordinates with generous padding
      // so top supports, labels, tension vectors, and substituents are never clipped
      const normYmin = Math.max(0, Math.round((absMinY / canvas.height) * 1000) - 35);
      const normXmin = Math.max(0, Math.round((absMinX / canvas.width) * 1000) - 35);
      const normYmax = Math.min(1000, Math.round((absMaxY / canvas.height) * 1000) + 35);
      const normXmax = Math.min(1000, Math.round((absMaxX / canvas.width) * 1000) + 35);

      if (normYmax - normYmin > 20 && normXmax - normXmin > 20) {
        return [normYmin, normXmin, normYmax, normXmax];
      }
    }
  } catch (e) {
    console.warn('Canvas ink detection note:', e);
  }

  return null;
}

/**
 * Intelligent fallback: Estimates the diagram bounding box [ymin, xmin, ymax, xmax]
 * on a NEET two-column page if Gemini detected that a question references a diagram
 * (e.g. "shown in figure", "circular bend", "square loop", "benzene ring") but omitted the bounding box.
 */
export function estimateDiagramBoundingBox(
  questionIndexOnPage: number,
  totalQuestionsOnPage: number = 4,
  isRightColumn: boolean = false
): [number, number, number, number] {
  const safeTotal = Math.max(1, Math.min(totalQuestionsOnPage, 6));
  const safeIdx = Math.max(0, Math.min(questionIndexOnPage, safeTotal - 1));
  const slotHeight = 900 / safeTotal; // top 50 to 950
  const yStart = 60 + safeIdx * slotHeight;
  
  // Diagram is typically in the middle of the question slot (between question text and options)
  const ymin = Math.round(yStart + slotHeight * 0.25);
  const ymax = Math.round(Math.min(970, yStart + slotHeight * 0.85));

  // If two column layout: Left column = 40 to 490, Right column = 510 to 960
  // If spanning both columns or unknown, cover width generously [40, 960]
  const xmin = isRightColumn ? 510 : 40;
  const xmax = isRightColumn ? 960 : 490;

  return [ymin, xmin, ymax, xmax];
}

/**
 * Scans document page text to detect question paper range.
 * For NEET 200-question papers, all pages (e.g. 1 to 43) are retained by default
 * so questions 174–200 are never prematurely cut off.
 */
export async function detectQuestionPaperPageRange(pdfDoc: any): Promise<{
  questionStartPage: number;
  questionEndPage: number;
  solutionStartPage?: number;
  answerKeyPage?: number;
  detectedSectionNotice?: string;
}> {
  if (!pdfDoc || !pdfDoc.numPages) {
    return { questionStartPage: 1, questionEndPage: 1 };
  }

  const totalPages = pdfDoc.numPages;
  let solutionStartPage: number | undefined;
  let answerKeyPage: number | undefined;

  // On standard NEET papers (35–45 pages), 200 questions typically reach pages 42-43.
  // ONLY mark a cutoff if an explicit dedicated answer grid with at least 15+ tokens is found
  // and the page contains ZERO question option markers (1), (2), (3), (4) or (A), (B), (C), (D).
  const checkFromPage = totalPages >= 40 ? 42 : Math.max(2, totalPages - 2);

  for (let p = checkFromPage; p <= totalPages; p++) {
    try {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      const upper = pageText.toUpperCase();

      // Check for standalone header
      const hasAnswerKeyHeader = /\b(?:ANSWER\s*KEY|ANSWERS?\s*KEY)\b/.test(upper);
      const hasSolutionHeader = /\b(?:HINTS\s*(?:&|AND)\s*SOLUTIONS|DETAILED\s*SOLUTIONS|HINTS\s*TO\s*QUESTIONS|EXPLANATIONS\s*(?:AND|&)\s*SOLUTIONS)\b/.test(upper);

      // Check if page still has questions: (1) ... (2) ... (3) ... (4)
      const optionsCount = (pageText.match(/\([1-4A-D]\)/g) || []).length;
      const hasQuestionNumbered = /\b(?:1[5-9]\d|200)\b/.test(pageText);

      // If page has lots of options or high question numbers, it's still a question page!
      if (!hasQuestionNumbered && optionsCount < 4 && (hasAnswerKeyHeader || hasSolutionHeader)) {
        if (hasSolutionHeader) {
          solutionStartPage = p;
          if (!answerKeyPage) answerKeyPage = p;
          break;
        } else if (hasAnswerKeyHeader) {
          answerKeyPage = p;
        }
      }
    } catch {
      // ignore
    }
  }

  let questionStartPage = 1;
  if (totalPages >= 2) {
    try {
      const page1 = await pdfDoc.getPage(1);
      const text1 = await page1.getTextContent();
      const page1Str = text1.items.map((item: any) => item.str || '').join(' ');
      const upper1 = page1Str.toUpperCase();
      const hasFrontCoverKeywords = /\b(?:IMPORTANT\s+INSTRUCTIONS|GENERAL\s+INSTRUCTIONS|CANDIDATES?\s+ARE\s+REQUIRED|DO\s+NOT\s+OPEN\s+THIS|READ\s+THE\s+FOLLOWING\s+INSTRUCTIONS|महत्वपूर्ण\s*निर्देश)\b/i.test(upper1);
      const options1Count = (page1Str.match(/\([1-4A-D]\)/g) || []).length;
      const hasQ1Explicit = /\b(?:Q(?:uestion)?\.?\s*1\b|1[\.\:\-\)]|\(1\)|\(A\)|1\s+[A-Za-z\u0900-\u097F]{3,})/i.test(page1Str);
      const hasSubjectHeaders = /\b(?:Physics|Chemistry|Biology|Botany|Zoology|Section|भौतिक|रसायन|जीव)\b/i.test(page1Str);
      // Only skip Page 1 if it is an exclusively front-cover instruction sheet (>500 chars) with ZERO questions, options, or subjects
      if (hasFrontCoverKeywords && options1Count === 0 && !hasQ1Explicit && !hasSubjectHeaders && page1Str.length > 500) {
        questionStartPage = 2;
      } else {
        questionStartPage = 1;
      }
    } catch {
      // fallback to 1
    }
  }

  const endCutoff = solutionStartPage || answerKeyPage;
  // If no pure solutions cutoff is found, default to scanning ALL pages so zero questions are lost!
  const questionEndPage = (endCutoff && endCutoff > 3) ? Math.max(questionStartPage, endCutoff - 1) : totalPages;
  const detectedSectionNotice = (endCutoff && endCutoff > 3 && endCutoff <= totalPages)
    ? `Exam Questions detected on Pages ${questionStartPage}–${questionEndPage}. (Dedicated Solutions/Answer Key on Page ${endCutoff})`
    : (questionStartPage > 1)
      ? `Front cover/instructions detected on Page 1. Exam questions start on Page ${questionStartPage} through Page ${questionEndPage}.`
      : `Full Exam Paper: All ${totalPages} pages selected to digitize all 200 NEET questions (Q1–Q200).`;

  return {
    questionStartPage,
    questionEndPage,
    solutionStartPage,
    answerKeyPage,
    detectedSectionNotice
  };
}

/**
 * Sends a high-resolution rendered PDF page to the server-side Gemini API
 * with automatic client-side retries, quota cooldown countdowns, and multi-model fallback.
 */
export async function sendPageToGeminiParser(
  pageImageBase64: string,
  pageNumber: number,
  totalPages?: number,
  onRetryNotice?: (message: string) => void,
  parseMode?: 'fast_text_gallery_crop' | 'full_auto'
): Promise<{ questions: ParsedGeminiQuestion[]; modelUsed?: string; isRateLimited?: boolean; isDailyQuota?: boolean }> {
  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 45-second timeout controller so a page never hangs indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const userCustomKey = typeof localStorage !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : null;
      const effectiveMode = parseMode || 'full_auto';
      const shouldAutoCrop = effectiveMode === 'full_auto';

      const response = await fetch('/api/ai/parse-neet-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userCustomKey ? { 'x-gemini-api-key': userCustomKey } : {})
        },
        body: JSON.stringify({
          imageBase64: pageImageBase64,
          pageNumber,
          totalPages,
          parseMode: effectiveMode,
          autoCrop: shouldAutoCrop,
          customApiKey: userCustomKey || undefined
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server error' }));
        const isDemandOrQuota = Boolean(
          response.status === 429 ||
          response.status === 503 ||
          errData.isRateLimited ||
          errData.isDailyQuota ||
          errData.isHighDemand ||
          errData.error?.includes('high demand') ||
          errData.error?.includes('503') ||
          errData.error?.includes('spikes in demand') ||
          errData.error?.includes('quota') ||
          errData.error?.includes('RESOURCE_EXHAUSTED')
        );

        if (isDemandOrQuota && attempt < maxAttempts) {
          onRetryNotice?.(`Demand surge on Page ${pageNumber}. Retrying in 1.5s with fallback model...`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        if (isDemandOrQuota) {
          console.log(`[Gemini Parser] Quota limit or demand surge on page ${pageNumber}. Returning vector text fallback for this page.`);
          return {
            questions: [],
            modelUsed: 'High-Precision 2-Column Vector Text Engine',
            isRateLimited: true,
            isDailyQuota: true
          };
        }
        const rawErrMsg = errData.error || `Failed to parse page ${pageNumber} (HTTP ${response.status})`;
        const err: any = new Error(rawErrMsg);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      if (!data.success && (data.isRateLimited || data.isDailyQuota || data.isHighDemand || data.error?.includes('high demand') || data.error?.includes('503'))) {
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return {
          questions: [],
          modelUsed: 'High-Precision 2-Column Vector Text Engine',
          isRateLimited: true,
          isDailyQuota: true
        };
      }

      return {
        questions: data.questions || [],
        modelUsed: data.modelUsed || 'gemini-3.8-flash'
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuota =
        Boolean(err?.isRateLimited) ||
        err?.status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');
      const isHighDemand =
        Boolean(err?.isHighDemand) ||
        err?.status === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('spikes in demand');

      if ((isQuota || isHighDemand) && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      if (isQuota || isHighDemand || err?.isDailyQuota || errMsg.includes('per day') || errMsg.includes('GenerateRequestsPerDay')) {
        console.warn(`[Gemini Parser] Notice on page ${pageNumber}. Using vector fallback for this page.`);
        return {
          questions: [],
          modelUsed: 'High-Precision 2-Column Vector Text Engine',
          isRateLimited: true,
          isDailyQuota: true
        };
      }

      const isTransient =
        isQuota ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('temporarily') ||
        errMsg.includes('Failed to fetch') ||
        errMsg.includes('aborted') ||
        errMsg.includes('NetworkError');

      if (attempt < maxAttempts && isTransient) {
        if (isQuota) {
          const match = errMsg.match(/retry in ([\d\.]+)s/i) || errMsg.match(/cooldown:\s*(\d+)s/i);
          let waitSec = 18;
          if (match && match[1]) {
            waitSec = Math.ceil(parseFloat(match[1]));
          } else if (err?.retryAfterSeconds) {
            waitSec = err.retryAfterSeconds;
          }
          waitSec = Math.min(Math.max(waitSec, 10), 25);

          for (let s = waitSec; s > 0; s--) {
            const noticeMsg = `⏳ API Quota cooldown: waiting ${s}s before retrying Page ${pageNumber}...`;
            if (onRetryNotice) {
              onRetryNotice(noticeMsg);
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          const delay = attempt * 1200;
          const noticeMsg = `Pacing server connection for Page ${pageNumber}... Retrying in ${delay / 1000}s...`;
          if (onRetryNotice) {
            onRetryNotice(noticeMsg);
          }
          await new Promise(r => setTimeout(r, delay));
        }
      } else {
        break;
      }
    }
  }

  console.log(`[Gemini Parser] Page ${pageNumber} returning vector fallback after retry cycle.`);
  return {
    questions: [],
    modelUsed: 'High-Precision 2-Column Vector Text Engine',
    isRateLimited: true,
    isDailyQuota: true
  };
}

export interface SolutionParseResult {
  success: boolean;
  totalAnswersFound: number;
  totalSolutionsFound: number;
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  solutions: Record<number, string>;
  items: Array<{
    questionNumber: number;
    answer?: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
    rawSnippet?: string;
  }>;
  sourceType: 'pdf' | 'text' | 'ai';
  summaryMessage?: string;
}

/**
 * Extracts Answer Keys and detailed Solutions/Explanations directly from an uploaded PDF.
 * Uses high-precision text layer pattern matching with automatic server-side Gemini fallback.
 */
export async function parseSolutionsAndKeyFromPdf(
  pdfDoc: any,
  onProgress?: (message: string) => void
): Promise<SolutionParseResult> {
  const answers: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
  const solutions: Record<number, string> = {};
  const items: Array<{ questionNumber: number; answer?: 'A' | 'B' | 'C' | 'D'; explanation?: string; rawSnippet?: string }> = [];

  if (!pdfDoc || !pdfDoc.numPages) {
    return {
      success: false,
      totalAnswersFound: 0,
      totalSolutionsFound: 0,
      answers,
      solutions,
      items,
      sourceType: 'pdf',
      summaryMessage: 'Invalid PDF document.'
    };
  }

  const numPages = pdfDoc.numPages;
  let fullDocText = '';

  // 1. Extract text from all pages of the solutions PDF respecting column boundaries
  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(`Reading text layer from Page ${p} of ${numPages}...`);
    try {
      const page = await pdfDoc.getPage(p);
      const pageColText = await extractColumnAwareTextFromPdfPage(page);
      fullDocText += `\n--- PAGE ${p} ---\n` + pageColText;
    } catch (e) {
      console.warn(`Error reading page ${p} text:`, e);
    }
  }

  // 2. High-Precision NEET Chunk-Split Pass (100% match for format: "N. Answer: X Sol: ...")
  const standardChunks = fullDocText.split(/(?=(?:^|\s)\b\d{1,3}\s*\.\s*(?:Answer|Ans|उत्तर)\s*:)/i);
  for (const chunk of standardChunks) {
    const hm = chunk.match(/^\s*(\d{1,3})\s*\.\s*(?:Answer|Ans|उत्तर)\s*:\s*\(?([1-4A-Da-d])\)?(?:\s*(?:Sol|Hints?|Explanation|हल|व्याख्या)\s*:)?([\s\S]*)$/i);
    if (hm) {
      const qNum = parseInt(hm[1], 10);
      const rawVal = hm[2].trim().toUpperCase();
      let opt: 'A' | 'B' | 'C' | 'D' = 'A';
      if (rawVal === '1' || rawVal === 'A') opt = 'A';
      else if (rawVal === '2' || rawVal === 'B') opt = 'B';
      else if (rawVal === '3' || rawVal === 'C') opt = 'C';
      else if (rawVal === '4' || rawVal === 'D') opt = 'D';

      let expl = (hm[3] || '').trim().replace(/--- PAGE \d+ ---/g, '').trim();
      if (qNum >= 1 && qNum <= 300) {
        answers[qNum] = opt;
        if (expl.length > 2) {
          solutions[qNum] = sanitizeExamText(expl);
        }
        items.push({
          questionNumber: qNum,
          answer: opt,
          explanation: solutions[qNum],
          rawSnippet: chunk.slice(0, 100)
        });
      }
    }
  }

  // 2b. Secondary Regex Pass for other coaching styles:
  // Match patterns like: "1. (2)" or "1 - (B)" or "Sol. 1. (3)" or "1. Ans: [3]"
  const solRegex = /(?:(?:(?:Sol(?:ution)?\.?\s*)?Q(?:uestion|ue)?\.?\s*(\d{1,3})|(\d{1,3}))\s*[\.:\-\)]\s*(?:(?:Answer|Ans|Option|उत्तर)\s*[:\-\)]?\s*)?(?:Option\s*)?[\(\[]?([1-4A-Da-d])[\)\]]?)([\s\S]*?)(?=(?:(?:(?:Sol(?:ution)?\.?\s*)?Q(?:uestion|ue)?\.?\s*\d{1,3}|\d{1,3})\s*[\.:\-\)]\s*(?:(?:Answer|Ans|Option|उत्तर)\s*[:\-\)]?\s*)?(?:Option\s*)?[\(\[]?[1-4A-Da-d][\)\]]?)|$)/gi;
  
  let match: RegExpExecArray | null;
  while ((match = solRegex.exec(fullDocText)) !== null) {
    const rawNum = match[1] || match[2];
    const qNum = parseInt(rawNum, 10);
    const rawVal = (match[3] || '').toUpperCase();
    let opt: 'A' | 'B' | 'C' | 'D' = 'A';
    if (rawVal === '1' || rawVal === 'A') opt = 'A';
    else if (rawVal === '2' || rawVal === 'B') opt = 'B';
    else if (rawVal === '3' || rawVal === 'C') opt = 'C';
    else if (rawVal === '4' || rawVal === 'D') opt = 'D';

    let rawExplanation = (match[4] || '').trim();
    // Clean up explanation prefix
    rawExplanation = rawExplanation
      .replace(/^(?:Sol(?:ution)?\.?|Hint(?:s)?\.?|Explanation\.?|हल\.?|व्याख्या\.?)\s*[:.\-]?\s*/i, '')
      .replace(/--- PAGE \d+ ---/g, '')
      .trim();

    if (qNum >= 1 && qNum <= 300) {
      answers[qNum] = opt;
      if (rawExplanation.length > 5) {
        solutions[qNum] = sanitizeExamText(rawExplanation);
      }
      items.push({
        questionNumber: qNum,
        answer: opt,
        explanation: solutions[qNum],
        rawSnippet: match[0].slice(0, 100)
      });
    }
  }

  // Also extract standalone answer key grids if present: "1. (2), 2. (4)..."
  const gridMap = parseAnswerKeyText(fullDocText, 300);
  for (const [qStr, opt] of Object.entries(gridMap)) {
    const qNum = parseInt(qStr, 10);
    if (!answers[qNum]) {
      answers[qNum] = opt;
      items.push({ questionNumber: qNum, answer: opt });
    }
  }

  // 2b. Secondary Line-by-Line Pass for Multi-line Coaching Formats:
  // Handles:
  // Q.46. Ans. (2)
  // Sol. Given F = qE ...
  const lines = fullDocText.split('\n');
  let pendingQNum: number | null = null;
  let pendingAnswer: 'A' | 'B' | 'C' | 'D' | null = null;
  let pendingSolText = '';

  const savePending = () => {
    if (pendingQNum && pendingQNum >= 1 && pendingQNum <= 300) {
      if (pendingAnswer && !answers[pendingQNum]) {
        answers[pendingQNum] = pendingAnswer;
      }
      const cleanSol = pendingSolText
        .replace(/^(?:Sol(?:ution)?\.?|Hint(?:s)?\.?|Explanation\.?|हल\.?|व्याख्या\.?)\s*[:.\-]?\s*/i, '')
        .replace(/--- PAGE \d+ ---/g, '')
        .trim();
      if (cleanSol.length > 5 && !solutions[pendingQNum]) {
        solutions[pendingQNum] = sanitizeExamText(cleanSol);
      }
      const existingItem = items.find(it => it.questionNumber === pendingQNum);
      if (existingItem) {
        if (!existingItem.answer && answers[pendingQNum]) existingItem.answer = answers[pendingQNum];
        if (!existingItem.explanation && solutions[pendingQNum]) existingItem.explanation = solutions[pendingQNum];
      } else if (answers[pendingQNum] || solutions[pendingQNum]) {
        items.push({
          questionNumber: pendingQNum,
          answer: answers[pendingQNum],
          explanation: solutions[pendingQNum]
        });
      }
    }
    pendingQNum = null;
    pendingAnswer = null;
    pendingSolText = '';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--- PAGE')) continue;

    const qHeaderMatch = trimmed.match(/^(?:(?:Sol(?:ution)?\.?\s*)?Q(?:uestion|ue)?\.?\s*(\d{1,3})|(\d{1,3}))\s*[\.:\-\)]\s*(.*)$/i);
    if (qHeaderMatch) {
      savePending();
      const num = parseInt(qHeaderMatch[1] || qHeaderMatch[2], 10);
      pendingQNum = num;
      const rest = qHeaderMatch[3]?.trim() || '';

      const sameLineAnsMatch = rest.match(/^(?:(?:Answer|Ans|Option|उत्तर)\s*[:.\-\)]?\s*)?(?:Option\s*)?[\(\[]?([1-4A-Da-d])[\)\]]?\s*[:.\-]?\s*(.*)$/i);
      if (sameLineAnsMatch && sameLineAnsMatch[1]) {
        const raw = sameLineAnsMatch[1].toUpperCase();
        pendingAnswer = (raw === '1' || raw === 'A') ? 'A' : (raw === '2' || raw === 'B') ? 'B' : (raw === '3' || raw === 'C') ? 'C' : 'D';
        pendingSolText = (sameLineAnsMatch[2] || '').trim();
      } else {
        pendingSolText = rest;
      }
      continue;
    }

    const nextLineAnsMatch = trimmed.match(/^(?:(?:Answer|Ans|Option|उत्तर)\s*[:.\-\)]?\s*)?(?:Option\s*)?[\(\[]?([1-4A-Da-d])[\)\]]?$/i);
    if (nextLineAnsMatch && pendingQNum && !pendingAnswer) {
      const raw = nextLineAnsMatch[1].toUpperCase();
      pendingAnswer = (raw === '1' || raw === 'A') ? 'A' : (raw === '2' || raw === 'B') ? 'B' : (raw === '3' || raw === 'C') ? 'C' : 'D';
      continue;
    }

    if (pendingQNum) {
      pendingSolText += (pendingSolText ? '\n' : '') + trimmed;
    }
  }
  savePending();

  const ansCount = Object.keys(answers).length;
  const solCount = Object.keys(solutions).length;

  // 3. If local extraction got fewer than 10 answers/solutions, invoke Gemini Solutions Engine
  if (ansCount < 10) {
    if (onProgress) onProgress('Invoking Gemini Solutions Engine for multimodal OCR parsing...');
    try {
      const userCustomKey = typeof localStorage !== 'undefined' ? localStorage.getItem('user_gemini_api_key') : null;
      let payload: any = {};
      if (fullDocText.trim().length > 100) {
        payload.rawText = fullDocText.slice(0, 25000);
      } else if (pdfDoc && numPages > 0) {
        // Scanned PDF fallback: render Page 1 to canvas
        const page1 = await pdfDoc.getPage(1);
        const offCanvas = document.createElement('canvas');
        await renderPdfPageToCanvas(pdfDoc, 1, offCanvas, 1.5);
        payload.imageBase64 = offCanvas.toDataURL('image/jpeg', 0.85);
      }

      if (payload.rawText || payload.imageBase64) {
        const res = await fetch('/api/ai/parse-solutions-and-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userCustomKey ? { 'x-gemini-api-key': userCustomKey } : {})
          },
          body: JSON.stringify({ ...payload, customApiKey: userCustomKey || undefined })
        });
        if (res.ok) {
          const aiData = await res.json();
          if (aiData.answers && Array.isArray(aiData.answers)) {
            for (const a of aiData.answers) {
              if (a.questionNumber && a.answer) {
                const opt = a.answer.toUpperCase();
                if (['A', 'B', 'C', 'D'].includes(opt)) {
                  answers[a.questionNumber] = opt as any;
                }
              }
            }
          }
          if (aiData.solutions && Array.isArray(aiData.solutions)) {
            for (const s of aiData.solutions) {
              if (s.questionNumber && s.explanation) {
                solutions[s.questionNumber] = sanitizeExamText(s.explanation);
                if (s.answer) {
                  const opt = s.answer.toUpperCase();
                  if (['A', 'B', 'C', 'D'].includes(opt)) answers[s.questionNumber] = opt as any;
                }
              }
            }
          }
        }
      }
    } catch (aiErr) {
      console.warn('Gemini solutions AI note:', aiErr);
    }
  }

  const finalAnsCount = Object.keys(answers).length;
  const finalSolCount = Object.keys(solutions).length;

  return {
    success: finalAnsCount > 0 || finalSolCount > 0,
    totalAnswersFound: finalAnsCount,
    totalSolutionsFound: finalSolCount,
    answers,
    solutions,
    items,
    sourceType: 'pdf',
    summaryMessage: `Found ${finalAnsCount} Correct Answers and ${finalSolCount} Step-by-Step Solutions.`
  };
}

/**
 * Parses diverse Answer Key formats pasted by admin:
 * - "1: A, 2: B, 3: C"
 * - "1-A, 2-B, 3-C"
 * - "1. (2)" or "1. B"
 * - "1 B \n 2 C \n 3 A"
 * - Sequence of letters: "A B C D A B C D"
 */
export function parseAnswerKeyText(rawText: string, totalQuestions: number): Record<number, 'A' | 'B' | 'C' | 'D'> {
  const result: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
  if (!rawText || !rawText.trim()) return result;

  const text = rawText.trim();
  const lines = text.split(/[\r\n]+/);

  // Strategy 1: Look for explicit Question Number -> Option pairs
  // e.g. "1: A", "Q1 - B", "1. (3)", "1\tB", "1 2"
  const pairRegex = /(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[:.\-=\t)\s]+\(?([1-4A-Da-d])\)?/g;
  let match: RegExpExecArray | null;
  let pairCount = 0;

  while ((match = pairRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const rawVal = match[2].toUpperCase();
    let opt: 'A' | 'B' | 'C' | 'D' = 'A';
    if (rawVal === '1' || rawVal === 'A') opt = 'A';
    else if (rawVal === '2' || rawVal === 'B') opt = 'B';
    else if (rawVal === '3' || rawVal === 'C') opt = 'C';
    else if (rawVal === '4' || rawVal === 'D') opt = 'D';

    if (qNum >= 1 && qNum <= 300) {
      result[qNum] = opt;
      pairCount++;
    }
  }

  // Strategy 2: If no or few pairs matched, try line-by-line single letter / number
  if (pairCount < 5) {
    // Check if lines are single options like "A", "B", "C", "2", "3"
    let sequentialNum = 1;
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Match just "A", "B", "(C)", "1", "(2)" on a line
      const singleMatch = cleanLine.match(/^\(?([1-4A-Da-d])\)?$/);
      if (singleMatch) {
        const rawVal = singleMatch[1].toUpperCase();
        let opt: 'A' | 'B' | 'C' | 'D' = 'A';
        if (rawVal === '1' || rawVal === 'A') opt = 'A';
        else if (rawVal === '2' || rawVal === 'B') opt = 'B';
        else if (rawVal === '3' || rawVal === 'C') opt = 'C';
        else if (rawVal === '4' || rawVal === 'D') opt = 'D';

        result[sequentialNum] = opt;
        sequentialNum++;
        if (sequentialNum > totalQuestions) break;
      }
    }
  }

  // Strategy 3: Check space-separated or comma-separated tokens: "A B C D A B C D"
  if (Object.keys(result).length < 5) {
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    const validTokens = tokens.filter(t => /^[1-4A-Da-d]$/i.test(t));
    if (validTokens.length >= 10) {
      validTokens.forEach((t, idx) => {
        const qNum = idx + 1;
        const rawVal = t.toUpperCase();
        let opt: 'A' | 'B' | 'C' | 'D' = 'A';
        if (rawVal === '1' || rawVal === 'A') opt = 'A';
        else if (rawVal === '2' || rawVal === 'B') opt = 'B';
        else if (rawVal === '3' || rawVal === 'C') opt = 'C';
        else if (rawVal === '4' || rawVal === 'D') opt = 'D';
        result[qNum] = opt;
      });
    }
  }

  return result;
}

/**
 * Automatically creates and persists the complete MockTest and MockQuestions
 * in the application's existing database format.
 */
export function createAndSaveCompleteNeetTest(
  testParams: {
    testNumber?: string;
    title: string;
    description?: string;
    type?: MockTestType;
    price?: number;
    originalPrice?: number;
    durationMinutes?: number;
    totalQuestions?: number;
    correctMarks?: number;
    negativeMarks?: number;
  },
  parsedQuestions: MockQuestion[]
): { test: MockTest; questions: MockQuestion[] } {
  const existingTests = getStoredMockTests();
  const testId = `cbt-neet-${Date.now()}`;
  const totalCount = parsedQuestions.length;

  // Ensure every question has the proper testId and unique IDs
  const normalizedQuestions: MockQuestion[] = parsedQuestions.map((q, idx) => {
    const qNum = q.questionNumber || idx + 1;
    return {
      ...q,
      id: q.id ? `${q.id}_${idx + 1}` : `q_${testId}_${qNum}_${idx + 1}`,
      testId: testId,
      questionNumber: qNum
    };
  });

  // Sort by question number
  normalizedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    const isFree = (testParams.price ?? 99) === 0;
    const resolvedPrice = isFree ? 0 : (testParams.price ?? 99);
    const newTest: MockTest = {
      id: testId,
      testNumber: testParams.testNumber || `Test 0${existingTests.length + 1}`,
      title: testParams.title || `NEET Question Paper ${new Date().toLocaleDateString()}`,
      description: testParams.description || `Digitized NTA NEET Mock Test with ${totalCount} bilingual questions and original PDF diagrams.`,
      type: testParams.type || 'full_syllabus',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      totalQuestions: totalCount,
      durationMinutes: testParams.durationMinutes || (totalCount >= 180 ? 200 : 180),
      maxMarks: totalCount * (testParams.correctMarks || 4),
      correctMarks: testParams.correctMarks ?? 4,
      negativeMarks: testParams.negativeMarks ?? 1,
      price: resolvedPrice,
      originalPrice: isFree ? 0 : (testParams.originalPrice ?? 299),
      isFree,
      isPaid: !isFree,
      status: 'published',
      isBilingual: parsedQuestions.some(q => Boolean(q?.languages?.hi?.questionText)),
      languages: ['en', 'hi'],
      allowMultipleAttempts: true,
      attemptLimit: 'unlimited',
      showLeaderboard: true,
      createdAt: new Date().toISOString(),
      questionsCount: totalCount
    };

  // Save to IndexedDB & Multi-source persistent storage
  saveStoredMockQuestions(testId, normalizedQuestions);
  const updatedTests = [newTest, ...existingTests];
  saveStoredMockTests(updatedTests);

  // Sync to backend Express server API
  fetch('/api/db/mock-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedTests)
  }).catch(e => console.warn('Mock tests sync error:', e));

  fetch('/api/db/mock-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId, questions: normalizedQuestions })
  }).catch(e => console.warn('Mock questions sync error:', e));

  return { test: newTest, questions: normalizedQuestions };
}

export interface AccuracyAuditIssue {
  questionNumber: number;
  reason: string;
  severity: 'error' | 'warning';
}

export interface AccuracyAuditResult {
  totalDetectedInPdf: number;
  totalImported: number;
  flaggedCount: number;
  criticalErrorsCount: number;
  warningsCount: number;
  canPublish: boolean;
  issues: AccuracyAuditIssue[];
  missingNumbers: number[];
  duplicateNumbers: number[];
  questionsWithoutFiguresWhenExpected: number[];
  damagedMathQuestions: number[];
  damagedTableQuestions: number[];
  incompleteQuestions: number[];
  contaminatedOptionQuestions: number[];
}

/**
 * Requirement 7 & 8: Automated Accuracy Audit & Pre-Publish Verification Engine
 * Checks for missing numbers, duplicates, missing options, order, suspicious OCR,
 * missing diagrams, organic chemistry structures, broken match tables, truncated options like "0.",
 * duplicate decimal points (3.2.04), collapsed fractions (T 7 4), bare digit statements (2 4 6),
 * and cross-question option contamination.
 */
export function auditNeetQuestionsAccuracy(questions: MockQuestion[], totalExpectedCount?: number): AccuracyAuditResult {
  const issues: AccuracyAuditIssue[] = [];
  const questionNumberMap = new Map<number, number>();
  const duplicateNumbers: number[] = [];
  const questionsWithoutFiguresWhenExpected: number[] = [];
  const damagedMathQuestions: number[] = [];
  const damagedTableQuestions: number[] = [];
  const incompleteQuestions: number[] = [];
  const contaminatedOptionQuestions: number[] = [];

  // 1. Tally numbers for duplicates
  for (const q of questions) {
    const count = (questionNumberMap.get(q.questionNumber) || 0) + 1;
    questionNumberMap.set(q.questionNumber, count);
    if (count === 2) {
      duplicateNumbers.push(q.questionNumber);
      issues.push({
        questionNumber: q.questionNumber,
        reason: `Duplicate question number Q${q.questionNumber} detected`,
        severity: 'error'
      });
    }
  }

  // 2. Check for missing numbers in continuous sequence
  const numbersPresent = Array.from(questionNumberMap.keys()).sort((a, b) => a - b);
  const missingNumbers: number[] = [];
  const highestPresent = numbersPresent.length > 0 ? numbersPresent[numbersPresent.length - 1] : 0;
  const targetEnd = totalExpectedCount 
    ? totalExpectedCount 
    : (highestPresent > 100 && highestPresent <= 180 ? 180 : highestPresent);

  if (numbersPresent.length > 0) {
    const min = Math.min(1, numbersPresent[0]);
    for (let i = min; i <= targetEnd; i++) {
      if (!questionNumberMap.has(i)) {
        missingNumbers.push(i);
        issues.push({
          questionNumber: i,
          reason: `Missing question Q${i} in sequence (not imported or skipped)`,
          severity: 'error'
        });
      }
    }
  }

  // 3. Check question-level integrity
  for (const q of questions) {
    const qNum = q.questionNumber;
    const qText = (q.languages?.en?.questionText || q.questionText || '').trim();
    const qSpecificIssues: AccuracyAuditIssue[] = [];

    const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0) || q.optionFigures);

    // Check bare numbers/digits without words (e.g. "2 4 6")
    const hasRealWords = /[A-Za-z\u0900-\u097F]{2,}/.test(qText);
    if (!hasRealWords && !hasFig) {
      if (!incompleteQuestions.includes(qNum)) incompleteQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Question statement contains bare numbers/characters ("${qText.slice(0, 30)}") without words`,
        severity: 'error'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    } else if (qText.length < 8 && !hasFig) {
      if (!incompleteQuestions.includes(qNum)) incompleteQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Suspiciously short question text ("${qText}")`,
        severity: 'warning'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check options count and placeholder values
    const opts = q.options || [];
    if (opts.length < 4) {
      if (!incompleteQuestions.includes(qNum)) incompleteQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Missing options (only ${opts.length} options found instead of 4)`,
        severity: 'error'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    } else {
      const labels = opts.map(o => o.label);
      if (labels[0] !== 'A' || labels[1] !== 'B' || labels[2] !== 'C' || labels[3] !== 'D') {
        const issue: AccuracyAuditIssue = {
          questionNumber: qNum,
          reason: `Incorrect option order: expected [A, B, C, D] but got [${labels.join(', ')}]`,
          severity: 'warning'
        };
        issues.push(issue);
        qSpecificIssues.push(issue);
      }

      // Check for placeholder unextracted options
      const allPlaceholders = opts.every(o => /^Option\s*[\(\[]?[A-D][\)\]]?$/i.test((o.value || '').trim()) || /^Option\s*[A-D]$/i.test((o.value || '').trim()));
      if (allPlaceholders && !q.optionFigures && !hasFig) {
        if (!damagedMathQuestions.includes(qNum)) damagedMathQuestions.push(qNum);
        if (!incompleteQuestions.includes(qNum)) incompleteQuestions.push(qNum);
        const issue: AccuracyAuditIssue = {
          questionNumber: qNum,
          reason: `All 4 options contain unextracted placeholder text ("Option (A)...") without values or diagrams`,
          severity: 'error'
        };
        issues.push(issue);
        qSpecificIssues.push(issue);
      }

      // Check for truncated options like "0."
      const hasTruncatedZeroDot = opts.some(o => (o.value || '').trim() === '0.' || (o.value || '').trim() === '0 .');
      if (hasTruncatedZeroDot) {
        if (!damagedMathQuestions.includes(qNum)) damagedMathQuestions.push(qNum);
        const issue: AccuracyAuditIssue = {
          questionNumber: qNum,
          reason: `Option truncated to "0." (decimal coefficient was stripped)`,
          severity: 'error'
        };
        issues.push(issue);
        qSpecificIssues.push(issue);
      }

      // Check for Cross-Question Option Contamination (e.g. Option D contains text from another question)
      const foreignQuestionRegex = /(?:according\s+to\s+the\s+wave-particle|which\s+of\s+the\s+following\s+graph|wave-particle\s+duality|statement\s+[I1]\s*:|assertion\s*:|reason\s*:)/i;
      const contaminatedOpt = opts.find(o => foreignQuestionRegex.test(o.value || '') && (o.value || '').length > 40);
      if (contaminatedOpt) {
        if (!contaminatedOptionQuestions.includes(qNum)) contaminatedOptionQuestions.push(qNum);
        const issue: AccuracyAuditIssue = {
          questionNumber: qNum,
          reason: `Option (${contaminatedOpt.label}) contains text swallowed from an adjacent question: "${contaminatedOpt.value?.slice(0, 50)}..."`,
          severity: 'error'
        };
        issues.push(issue);
        qSpecificIssues.push(issue);
      }
    }

    // Check missing answer key
    if (!q.correctAnswer) {
      if (!incompleteQuestions.includes(qNum)) incompleteQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Missing correct answer key`,
        severity: 'warning'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check for double / duplicate decimal points (e.g. 3.2.04 or 5.2.04)
    const allText = `${qText} ${opts.map(o => o.value || '').join(' ')}`;
    if (/\b\d+\.\d+\.\d+\b/.test(allText)) {
      if (!damagedMathQuestions.includes(qNum)) damagedMathQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Malformed decimal number with duplicate decimal points detected (e.g. 3.2.04)`,
        severity: 'error'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check for collapsed fractions missing forward slash (e.g. "T 7 4" or "T4 3" instead of "7/4 T" or "4/3 T")
    if (/\bT\s*[47]\s*[34]\b|\bT\s*[2-7]\b|\bRT\s*[1-9]\s*[1-9]\b/.test(allText)) {
      if (!damagedMathQuestions.includes(qNum)) damagedMathQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Collapsed fraction detected missing forward slash (e.g. "T 7 4" or "T4 3" instead of "7/4 T" or "4/3 T")`,
        severity: 'error'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check damaged math expressions (04 × 10, 0 × 10, empty tan (), pi leaks, ML-3-248)
    if (/\b04\s*×\s*10\b/i.test(allText) || /\b0\s*×\s*10\b/i.test(allText) || /tan\s*\(\s*\)/i.test(allText) || /π\s*π\s*π/i.test(qText) || /ML[-−–]\d[-−–]\d/i.test(allText)) {
      if (!damagedMathQuestions.includes(qNum)) damagedMathQuestions.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Mangled scientific math or dimensional notation detected`,
        severity: 'warning'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check missing diagram: text mentions diagram keywords or chemical structures but no figure is attached
    const diagramKeywords = [
      'given figure',
      'given diagram',
      'given graph',
      'given curve',
      'potential energy profile',
      'shown below',
      'shown in figure',
      'shown in diagram',
      'following scheme',
      'structure of a',
      'structure of b',
      'iupac name of',
      'benzene ring',
      'following reaction sequence',
      'major product is',
      'acidic strength of following',
      'pulley',
      'tension in the string',
      'bond in solid hf',
      'दिए गए चित्र',
      'चित्र में दर्शाए'
    ];
    const lowerText = qText.toLowerCase();
    const referencesVisual = diagramKeywords.some(kw => lowerText.includes(kw)) || (/iupac\s+name\s+of/i.test(lowerText) && (q.subject === 'Chemistry' || !q.subject));
    if (referencesVisual && !hasFig) {
      questionsWithoutFiguresWhenExpected.push(qNum);
      const issue: AccuracyAuditIssue = {
        questionNumber: qNum,
        reason: `Question references a diagram or chemical structure, but no figure is attached`,
        severity: 'warning'
      };
      issues.push(issue);
      qSpecificIssues.push(issue);
    }

    // Check match-the-column table structure
    if (lowerText.includes('match the column') || lowerText.includes('column i') || lowerText.includes('list-i') || lowerText.includes('सूची-i') || lowerText.includes('column 1')) {
      const matchTable = q.matchTable || q.languages?.en?.matchTable;
      if (!matchTable || !matchTable.rows || matchTable.rows.length === 0) {
        if (!hasFig) {
          damagedTableQuestions.push(qNum);
          const issue: AccuracyAuditIssue = {
            questionNumber: qNum,
            reason: `Match-the-column question detected but structured table rows and table image are missing`,
            severity: 'error'
          };
          issues.push(issue);
          qSpecificIssues.push(issue);
        }
      }
    }

    // Set question-level validation status and issues
    q.validationIssues = qSpecificIssues.map(i => i.reason);
    const hasErr = qSpecificIssues.some(i => i.severity === 'error');
    const hasWarn = qSpecificIssues.some(i => i.severity === 'warning');
    q.validationStatus = hasErr ? 'failed' : hasWarn ? 'needs_review' : 'verified';
  }

  const resolvedTotalDetected = totalExpectedCount || (targetEnd > 0 ? targetEnd : questions.length);
  const criticalErrorsCount = issues.filter(i => i.severity === 'error').length;
  const warningsCount = issues.filter(i => i.severity === 'warning').length;
  const canPublish = criticalErrorsCount === 0 && questions.length > 0 && missingNumbers.length === 0;

  return {
    totalDetectedInPdf: resolvedTotalDetected,
    totalImported: questions.length,
    flaggedCount: issues.length,
    criticalErrorsCount,
    warningsCount,
    canPublish,
    issues,
    missingNumbers,
    duplicateNumbers,
    questionsWithoutFiguresWhenExpected,
    damagedMathQuestions,
    damagedTableQuestions,
    incompleteQuestions,
    contaminatedOptionQuestions
  };
}
