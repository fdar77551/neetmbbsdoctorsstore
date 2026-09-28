import { MockQuestion, MockSubject, MockTest, MockTestType } from '../types';
import { cropRegionFromCanvas } from './pdfFigureExtractor';
import { saveStoredMockQuestions, saveStoredMockTests, getStoredMockTests } from './mockTestData';

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
 * found in scanned and vector-extracted NEET PDF papers.
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
    // Remove isolated unprintable control characters
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    // Strip redundant leading numbering e.g. "44. " or "Q.44 " or "(44) "
    .replace(/^(?:Q(?:uestion)?\.?\s*\d{1,3}\s*[:.\-)]\s*|\d{1,3}\s*[\.\:\)]\s*)/i, '')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Strips duplicated table column content from questionText when a matchTable is present,
 * preventing questions like Q44 from repeating column lists both above and inside the table.
 * Supports both English (List-I / Column-I) and Hindi (सूची-I / कॉलम-I).
 */
export function cleanQuestionTextForMatchTable(questionText: string, matchTable?: any): string {
  if (!questionText) return '';
  const sanitized = sanitizeExamText(questionText);
  if (!matchTable || !matchTable.rows || matchTable.rows.length === 0) {
    return sanitized;
  }

  let cleaned = sanitized;

  // Pattern A: Match "Match List-I with List-II:" or "सूची-I को सूची-II से सुमेलित कीजिए:"
  const promptPreambleMatch = cleaned.match(/^([\s\S]*?(?:Match\s+(?:List|Column)[\s\S]*?[:\.]|सूची\s*[-–—I1]\s*को\s*सूची[\s\S]*?[:\.]|कॉलम\s*[-–—I1]\s*को\s*कॉलम[\s\S]*?[:\.]))/i);
  const closingInstructionMatch = cleaned.match(/((?:Choose\s+the\s+correct\s+answer|Select\s+the\s+correct\s+option|नीचे\s+दिए\s+गए\s+विकल्पों\s+में\s+से)[\s\S]*)$/i);

  if (promptPreambleMatch && promptPreambleMatch[1] && promptPreambleMatch[1].trim().length > 6) {
    const preamble = promptPreambleMatch[1].trim();
    const ending = closingInstructionMatch ? `\n\n${closingInstructionMatch[1].trim()}` : '';
    return `${preamble}${ending}`.trim();
  }

  // Pattern B: Remove rows matching leftText or rightText from matchTable
  for (const row of matchTable.rows) {
    if (row.leftText && row.leftText.trim().length > 2) {
      const esc = row.leftText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
    }
    if (row.rightText && row.rightText.trim().length > 2) {
      const esc = row.rightText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
    }
  }

  // Remove leftover empty column header fragments and orphan row keys
  cleaned = cleaned
    .replace(/(?:Column|List|कॉलम|सूची)\s*[-–—I12]+/gi, '')
    .replace(/^\s*\([a-zA-Z0-9ivx]+\)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || sanitized;
}

/**
 * Crops a normalized bounding box [ymin, xmin, ymax, xmax] (0-1000 scale)
 * directly from the high-resolution original PDF canvas.
 * Adds a small optical padding to guarantee no diagram edges are clipped.
 */
export function cropDiagramFromCanvas(
  canvas: HTMLCanvasElement,
  box: [number, number, number, number]
): string {
  if (!canvas || !box || box.length !== 4) return '';

  const ymin = Math.max(0, Math.min(1000, box[0]));
  const xmin = Math.max(0, Math.min(1000, box[1]));
  const ymax = Math.max(0, Math.min(1000, box[2]));
  const xmax = Math.max(0, Math.min(1000, box[3]));

  if (ymax <= ymin || xmax <= xmin) return '';

  const y = (ymin / 1000) * canvas.height;
  const x = (xmin / 1000) * canvas.width;
  const h = ((ymax - ymin) / 1000) * canvas.height;
  const w = ((xmax - xmin) / 1000) * canvas.width;

  // Add 16px optical margin around diagram to capture labels/subscripts
  const pad = 16;
  const cropX = Math.max(0, x - pad);
  const cropY = Math.max(0, y - pad);
  const cropW = Math.min(canvas.width - cropX, w + pad * 2);
  const cropH = Math.min(canvas.height - cropY, h + pad * 2);

  return cropRegionFromCanvas(canvas, {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH
  }, 'image/png');
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

  const endCutoff = solutionStartPage || answerKeyPage;
  // If no pure solutions cutoff is found, default to scanning ALL pages so zero questions are lost!
  const questionEndPage = (endCutoff && endCutoff > 3) ? Math.max(1, endCutoff - 1) : totalPages;
  const detectedSectionNotice = (endCutoff && endCutoff > 3 && endCutoff <= totalPages)
    ? `Exam Questions detected on Pages 1–${questionEndPage}. (Dedicated Solutions/Answer Key on Page ${endCutoff})`
    : `Full Exam Paper: All ${totalPages} pages selected to digitize all 200 NEET questions (Q1–Q200).`;

  return {
    questionStartPage: 1,
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
  onRetryNotice?: (message: string) => void
): Promise<{ questions: ParsedGeminiQuestion[]; modelUsed?: string }> {
  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 55-second timeout controller so a page never hangs indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);

      const response = await fetch('/api/ai/parse-neet-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: pageImageBase64,
          pageNumber,
          totalPages
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server error' }));
        const rawErrMsg = errData.error || `Failed to parse page ${pageNumber} (HTTP ${response.status})`;
        const err: any = new Error(rawErrMsg);
        err.status = response.status;
        err.isRateLimited = response.status === 429 || Boolean(errData.isRateLimited);
        err.retryAfterSeconds = errData.retryAfterSeconds || 18;
        throw err;
      }

      const data = await response.json();
      return {
        questions: data.questions || [],
        modelUsed: data.modelUsed || 'gemini-3.1-flash-lite'
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuota =
        Boolean(err?.isRateLimited) ||
        err?.status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');

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

  throw lastError || new Error(`Failed to parse page ${pageNumber}`);
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

  // 1. Extract text from all pages of the solutions PDF with preserved line structure
  for (let p = 1; p <= numPages; p++) {
    if (onProgress) onProgress(`Reading text layer from Page ${p} of ${numPages}...`);
    try {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      let pageText = '';
      let lastY: number | null = null;
      for (const it of (textContent.items || []) as any[]) {
        const itemY = it.transform?.[5];
        if (lastY !== null && itemY !== undefined && Math.abs(itemY - lastY) > 5) {
          pageText += '\n';
        } else if (it.hasEOL) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += it.str || '';
        if (itemY !== undefined) lastY = itemY;
      }
      fullDocText += `\n--- PAGE ${p} ---\n` + pageText;
    } catch (e) {
      console.warn(`Error reading page ${p} text:`, e);
    }
  }

  // 2. High-Precision Regex Extraction:
  // Match patterns like:
  // "1. Answer (2)" or "Q.1 Answer: 2" or "1. (2)" or "1 - (B)" or "Sol. 1. (3)"
  // Followed by "Sol." or "Hints:" or "Explanation:" or formula text
  const solRegex = /(?:(?:(?:Sol(?:ution)?\.?\s*)?Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3}))\s*[\.:\-\)]\s*(?:(?:Answer|Ans|Option)\s*[:\-\)]?\s*)?\(?([1-4A-Da-d])\)?)([\s\S]*?)(?=(?:(?:(?:Sol(?:ution)?\.?\s*)?Q(?:uestion)?\.?\s*\d{1,3}|\d{1,3})\s*[\.:\-\)]\s*(?:(?:Answer|Ans|Option)\s*[:\-\)]?\s*)?\(?[1-4A-Da-d]\)?)|$)/gi;
  
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
      .replace(/^(?:Sol(?:ution)?\.?|Hint(?:s)?\.?|Explanation\.?)\s*[:.\-]?\s*/i, '')
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

  const ansCount = Object.keys(answers).length;
  const solCount = Object.keys(solutions).length;

  // 3. If local extraction got fewer than 10 answers/solutions and text exists, call server Gemini
  if (ansCount < 10 && fullDocText.trim().length > 100) {
    if (onProgress) onProgress('Invoking Gemini Solutions Engine for deep OCR parsing...');
    try {
      const res = await fetch('/api/ai/parse-solutions-and-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: fullDocText.slice(0, 25000) })
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
    price: testParams.price ?? 99,
    originalPrice: testParams.originalPrice ?? 299,
    status: 'published',
    isBilingual: parsedQuestions.some(q => Boolean(q?.languages?.hi?.questionText)),
    languages: ['en', 'hi'],
    allowMultipleAttempts: true,
    attemptLimit: 'unlimited',
    showLeaderboard: true,
    createdAt: new Date().toISOString(),
    questionsCount: totalCount,
    questions: normalizedQuestions
  };

  // Save to client localStorage
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
  flaggedCount: number;
  issues: AccuracyAuditIssue[];
  missingNumbers: number[];
  duplicateNumbers: number[];
  questionsWithoutFiguresWhenExpected: number[];
}

/**
 * Requirement 8: Automated Accuracy Check engine
 * Checks for missing numbers, duplicates, missing options, order, suspicious OCR,
 * missing diagrams, and broken match-the-column structures.
 */
export function auditNeetQuestionsAccuracy(questions: MockQuestion[]): AccuracyAuditResult {
  const issues: AccuracyAuditIssue[] = [];
  const questionNumberMap = new Map<number, number>();
  const duplicateNumbers: number[] = [];
  const questionsWithoutFiguresWhenExpected: number[] = [];

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
  if (numbersPresent.length > 0) {
    const min = numbersPresent[0];
    const max = numbersPresent[numbersPresent.length - 1];
    for (let i = min; i <= max; i++) {
      if (!questionNumberMap.has(i)) {
        missingNumbers.push(i);
        issues.push({
          questionNumber: i,
          reason: `Missing question Q${i} in sequence (gap between Q${min} and Q${max})`,
          severity: 'error'
        });
      }
    }
  }

  // 3. Check question-level integrity
  for (const q of questions) {
    const qNum = q.questionNumber;
    const qText = (q.languages?.en?.questionText || q.questionText || '').trim();

    // Check suspicious OCR / too short
    if (qText.length < 8) {
      issues.push({
        questionNumber: qNum,
        reason: `Suspiciously short question text ("${qText}")`,
        severity: 'warning'
      });
    }

    // Check options count
    const opts = q.options || [];
    if (opts.length < 4) {
      issues.push({
        questionNumber: qNum,
        reason: `Missing options (only ${opts.length} options found instead of 4)`,
        severity: 'error'
      });
    } else {
      const labels = opts.map(o => o.label);
      if (labels[0] !== 'A' || labels[1] !== 'B' || labels[2] !== 'C' || labels[3] !== 'D') {
        issues.push({
          questionNumber: qNum,
          reason: `Incorrect option order: expected [A, B, C, D] but got [${labels.join(', ')}]`,
          severity: 'warning'
        });
      }
    }

    // Check missing diagram: text mentions diagram keywords but no figure is attached
    const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
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
      'structure of b'
    ];
    const lowerText = qText.toLowerCase();
    const referencesVisual = diagramKeywords.some(kw => lowerText.includes(kw));
    if (referencesVisual && !hasFig) {
      questionsWithoutFiguresWhenExpected.push(qNum);
      issues.push({
        questionNumber: qNum,
        reason: `Question text references a diagram, figure, or graph, but no original image is attached`,
        severity: 'warning'
      });
    }

    // Check match-the-column table structure
    if (lowerText.includes('match the column') || lowerText.includes('column i') || lowerText.includes('list-i')) {
      const matchTable = q.matchTable || q.languages?.en?.matchTable;
      if (!matchTable || !matchTable.rows || matchTable.rows.length === 0) {
        issues.push({
          questionNumber: qNum,
          reason: `Match-the-column question detected but structured table rows are missing`,
          severity: 'warning'
        });
      }
    }
  }

  return {
    flaggedCount: issues.length,
    issues,
    missingNumbers,
    duplicateNumbers,
    questionsWithoutFiguresWhenExpected
  };
}
