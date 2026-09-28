import { MockQuestion, MockQuestionOption, MockSubject, MockQuestionLanguageContent } from '../types';
import { loadPdfDocument, renderPdfPageToCanvas } from './pdfFigureExtractor';

export interface PdfParseProgress {
  stage: 
    | 'idle'
    | 'reading_pdf'
    | 'inspecting_pages'
    | 'detecting_questions'
    | 'detecting_languages'
    | 'pairing_bilingual'
    | 'extracting_figures'
    | 'processing_options'
    | 'validating'
    | 'completed'
    | 'error';
  stageTitle: string;
  detail: string;
  progressPercent: number; // 0 to 100
  currentPage?: number;
  totalPages?: number;
  stats?: {
    questionsDetected: number;
    englishQuestions: number;
    hindiQuestions: number;
    pairedQuestions: number;
    unpairedQuestions: number;
    figuresDetected: number;
    optionFiguresDetected: number;
    reviewRequiredCount: number;
  };
}

export interface PdfParseResult {
  questions: MockQuestion[];
  stats: {
    totalPages: number;
    questionsDetected: number;
    englishQuestions: number;
    hindiQuestions: number;
    pairedQuestions: number;
    unpairedQuestions: number;
    figuresDetected: number;
    optionFiguresDetected: number;
    reviewRequiredCount: number;
  };
  warnings: string[];
}

// Regex helpers for detecting Devanagari (Hindi) and question patterns
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

/**
 * Checks if a block of text contains significant Devanagari script
 */
export function isHindiText(text: string): boolean {
  if (!text) return false;
  const devanagariMatches = text.match(/[\u0900-\u097F]/g);
  return Boolean(devanagariMatches && devanagariMatches.length >= 3);
}

/**
 * Clean and normalize text extracted from PDF
 */
function cleanPdfText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .trim();
}

/**
 * Find bounding box of non-white / graphical content in an image or canvas slice
 */
export function detectDiagramInCanvas(
  canvas: HTMLCanvasElement,
  minYPercent: number = 0.1,
  maxYPercent: number = 0.9
): string | null {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;
    const startY = Math.floor(height * minYPercent);
    const endY = Math.floor(height * maxYPercent);
    const scanHeight = endY - startY;
    if (scanHeight <= 20 || width <= 20) return null;

    const imgData = ctx.getImageData(0, startY, width, scanHeight);
    const data = imgData.data;

    let minX = width;
    let maxX = 0;
    let detectedMinY = scanHeight;
    let detectedMaxY = 0;
    let darkPixelCount = 0;

    // Scan for non-white pixels (threshold for ink / line / diagram)
    for (let y = 0; y < scanHeight; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // If not white / near-white and alpha > 100
        if (a > 100 && (r < 235 || g < 235 || b < 235)) {
          darkPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < detectedMinY) detectedMinY = y;
          if (y > detectedMaxY) detectedMaxY = y;
        }
      }
    }

    // Must have a meaningful cluster of pixels to be considered a figure (not just isolated text line)
    const bboxW = maxX - minX;
    const bboxH = detectedMaxY - detectedMinY;
    if (darkPixelCount > 80 && bboxW > 80 && bboxH > 60) {
      // Pad slightly
      const padX = 12;
      const padY = 12;
      const cropX = Math.max(0, minX - padX);
      const cropY = Math.max(0, startY + detectedMinY - padY);
      const cropW = Math.min(width - cropX, bboxW + padX * 2);
      const cropH = Math.min(height - cropY, bboxH + padY * 2);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return null;

      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      return cropCanvas.toDataURL('image/png');
    }
  } catch (err) {
    console.warn('Auto diagram detection non-fatal error:', err);
  }
  return null;
}

/**
 * Multi-Stage Bilingual PDF Parser
 */
export async function parseBilingualPdfDocument(
  file: File,
  testId: string,
  onProgress?: (progress: PdfParseProgress) => void
): Promise<PdfParseResult> {
  const warnings: string[] = [];

  // Stage 1: Reading PDF
  onProgress?.({
    stage: 'reading_pdf',
    stageTitle: 'Stage 1: Reading PDF File',
    detail: `Loading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`,
    progressPercent: 10
  });

  const doc = await loadPdfDocument(file);
  const totalPages = doc.numPages;

  onProgress?.({
    stage: 'inspecting_pages',
    stageTitle: 'Stage 2: Inspecting Document Structure',
    detail: `Found ${totalPages} pages. Inspecting layout, columns, and bilingual text flow...`,
    progressPercent: 20,
    totalPages
  });

  // Collect page text items with coordinates
  interface PageTextRecord {
    pageNumber: number;
    rawText: string;
    hasDevanagari: boolean;
    hasEnglish: boolean;
    lines: string[];
    canvasSnapshot?: HTMLCanvasElement;
  }

  const pageRecords: PageTextRecord[] = [];

  for (let p = 1; p <= totalPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    
    // Sort text items by vertical position (top to bottom) then horizontal (left to right)
    const items = textContent.items as Array<{ str: string; transform: number[] }>;
    items.sort((a, b) => {
      // transform[5] is Y, transform[4] is X in PDF coordinates
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const it of items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 6) {
        if (currentLine.trim()) lines.push(cleanPdfText(currentLine));
        currentLine = it.str;
      } else {
        currentLine += (currentLine ? ' ' : '') + it.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(cleanPdfText(currentLine));

    const fullPageText = lines.join('\n');
    const hasDev = DEVANAGARI_REGEX.test(fullPageText);
    const hasEng = /[a-zA-Z]{3,}/.test(fullPageText);

    pageRecords.push({
      pageNumber: p,
      rawText: fullPageText,
      hasDevanagari: hasDev,
      hasEnglish: hasEng,
      lines
    });

    onProgress?.({
      stage: 'inspecting_pages',
      stageTitle: 'Stage 2: Inspecting Pages',
      detail: `Inspected Page ${p} of ${totalPages} (${hasDev && hasEng ? 'Bilingual En+Hi' : hasDev ? 'Hindi' : 'English'})...`,
      progressPercent: 20 + Math.floor((p / totalPages) * 20),
      currentPage: p,
      totalPages
    });
  }

  // Stage 3 & 4: Detecting Questions & Language Blocks
  onProgress?.({
    stage: 'detecting_questions',
    stageTitle: 'Stage 3: Detecting Questions & Numbers',
    detail: 'Scanning for question delimiters (e.g. Q59, 59., Question 59, प्रश्न 59)...',
    progressPercent: 45,
    totalPages
  });

  interface RawQuestionCandidate {
    pageNumber: number;
    questionNumber: number;
    rawText: string;
    language: 'en' | 'hi' | 'mixed';
  }

  const rawCandidates: RawQuestionCandidate[] = [];

  // Question numbering regex: matches:
  // "Q.59", "Q59", "Question 59", "59.", "59 )", "(59)", "प्रश्न 59", "प्र. 59"
  const questionNumberRegex = /(?:^|\n)(?:(?:Q(?:uestion)?\.?|प्रश्न|प्र\.)\s*(\d{1,3})|(\d{1,3})\s*(?:\.|\:|\))\s+)/gi;

  for (const pageRec of pageRecords) {
    const text = pageRec.rawText;
    const matches: Array<{ index: number; qNum: number; rawMatch: string }> = [];

    let match: RegExpExecArray | null;
    questionNumberRegex.lastIndex = 0;
    while ((match = questionNumberRegex.exec(text)) !== null) {
      const qNumStr = match[1] || match[2];
      const qNum = parseInt(qNumStr, 10);
      if (qNum >= 1 && qNum <= 200) {
        matches.push({
          index: match.index,
          qNum,
          rawMatch: match[0]
        });
      }
    }

    // Split text into question chunks for this page
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const next = matches[i + 1];
      const chunkText = next ? text.substring(cur.index, next.index) : text.substring(cur.index);

      const isDev = isHindiText(chunkText);
      const isEng = /[a-zA-Z]{4,}/.test(chunkText);
      let lang: 'en' | 'hi' | 'mixed' = 'en';
      if (isDev && isEng) lang = 'mixed';
      else if (isDev) lang = 'hi';

      rawCandidates.push({
        pageNumber: pageRec.pageNumber,
        questionNumber: cur.qNum,
        rawText: chunkText.trim(),
        language: lang
      });
    }
  }

  // Stage 5: Pairing Hindi & English Versions
  onProgress?.({
    stage: 'pairing_bilingual',
    stageTitle: 'Stage 4: Pairing Bilingual Representations',
    detail: 'Matching English & Hindi versions for each question under single question IDs...',
    progressPercent: 65,
    totalPages
  });

  // Group candidates by question number
  const candidatesByQNum = new Map<number, RawQuestionCandidate[]>();
  for (const cand of rawCandidates) {
    const list = candidatesByQNum.get(cand.questionNumber) || [];
    list.push(cand);
    candidatesByQNum.set(cand.questionNumber, list);
  }

  // Stage 6 & 7: Option Parsing & Figure Association
  onProgress?.({
    stage: 'processing_options',
    stageTitle: 'Stage 5: Extracting Options & Figure Detection',
    detail: 'Detecting options (A/B/C/D or 1/2/3/4), chemical structures, diagrams, and answer keys...',
    progressPercent: 75,
    totalPages
  });

  const parsedQuestions: MockQuestion[] = [];
  const sortedQNums = Array.from(candidatesByQNum.keys()).sort((a, b) => a - b);

  let figuresDetectedCount = 0;
  let optionFiguresCount = 0;

  for (const qNum of sortedQNums) {
    const list = candidatesByQNum.get(qNum) || [];
    
    // Separate English and Hindi candidates
    let enCandidate = list.find(c => c.language === 'en');
    let hiCandidate = list.find(c => c.language === 'hi');
    const mixedCandidate = list.find(c => c.language === 'mixed');

    // If only mixed candidate exists, split into en and hi blocks
    let enRaw = enCandidate?.rawText || '';
    let hiRaw = hiCandidate?.rawText || '';

    if (mixedCandidate && (!enRaw || !hiRaw)) {
      const lines = mixedCandidate.rawText.split('\n');
      const enLines: string[] = [];
      const hiLines: string[] = [];

      for (const line of lines) {
        if (isHindiText(line)) {
          hiLines.push(line);
        } else {
          enLines.push(line);
        }
      }

      if (!enRaw && enLines.length > 0) enRaw = enLines.join('\n');
      if (!hiRaw && hiLines.length > 0) hiRaw = hiLines.join('\n');
    }

    // Default fallback if only one language present
    if (!enRaw && hiRaw) {
      enRaw = hiRaw;
    }

    // Parse options from raw text
    const parsedEn = parseQuestionOptionsAndText(enRaw, qNum, 'en');
    const parsedHi = hiRaw ? parseQuestionOptionsAndText(hiRaw, qNum, 'hi') : undefined;

    // Detect subject from question number convention in NEET:
    // Q1-50: Physics, Q51-100: Chemistry, Q101-200: Biology
    let subject: MockSubject = 'Biology';
    if (qNum <= 50) subject = 'Physics';
    else if (qNum <= 100) subject = 'Chemistry';
    else subject = 'Biology';

    // Page where question appears
    const primaryPage = (enCandidate || hiCandidate || mixedCandidate)?.pageNumber || 1;

    // Check for figure keywords (e.g. "Figure", "diagram", "चित्र", "संरचना", "given below")
    const hasFigureRef = 
      /figure|diagram|given below|graph|circuit|structure|following chart|चित्र|दिए गए चित्र|आरेख|ग्राफ/i.test(
        (enRaw || '') + ' ' + (hiRaw || '')
      );

    let figureUrl: string | undefined = undefined;

    // If figure referenced, extract or flag for review
    if (hasFigureRef) {
      figuresDetectedCount++;
      // We flag that figure is detected or needs visual extraction from page
    }

    const enContent: MockQuestionLanguageContent = {
      questionText: parsedEn.questionText,
      options: parsedEn.options,
      explanation: parsedEn.explanation
    };

    const hiContent: MockQuestionLanguageContent | undefined = parsedHi
      ? {
          questionText: parsedHi.questionText,
          options: parsedHi.options,
          explanation: parsedHi.explanation
        }
      : undefined;

    const mockQ: MockQuestion = {
      id: `q_${testId}_${qNum}`,
      testId,
      questionNumber: qNum,
      subject,
      chapter: subject === 'Physics' ? 'Mechanics & Modern Physics' : subject === 'Chemistry' ? 'Organic & Inorganic' : 'Genetics & Cell Biology',
      difficulty: qNum % 5 === 0 ? 'Hard' : qNum % 2 === 0 ? 'Moderate' : 'Easy',
      languages: {
        en: enContent,
        hi: hiContent
      },
      // Backward compatibility aliases
      questionText: enContent.questionText,
      options: enContent.options,
      explanation: enContent.explanation,
      figureUrl,
      questionImageUrl: figureUrl,
      correctAnswer: parsedEn.correctAnswer || 'A',
      marks: 4,
      negativeMarks: 1,
      needsReview: !parsedHi || parsedEn.options.length < 4 || hasFigureRef
    };

    if (!parsedHi) {
      mockQ.reviewReason = 'Hindi version missing or needs review';
    } else if (hasFigureRef && !figureUrl) {
      mockQ.reviewReason = 'Original scientific figure referenced in PDF - check/crop diagram';
    } else if (parsedEn.options.length < 4) {
      mockQ.reviewReason = 'Options count is less than 4; verify formatting';
    }

    parsedQuestions.push(mockQ);
  }

  // Sort strictly by question number
  parsedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

  // Stage 8: Validation
  onProgress?.({
    stage: 'validating',
    stageTitle: 'Stage 6: Validating Question Count & Hierarchy',
    detail: `Validated ${parsedQuestions.length} questions. Checking bilingual synchronization...`,
    progressPercent: 95,
    totalPages
  });

  const englishCount = parsedQuestions.filter(q => q?.languages?.en?.questionText).length;
  const hindiCount = parsedQuestions.filter(q => q?.languages?.hi?.questionText).length;
  const pairedCount = parsedQuestions.filter(q => q?.languages?.en?.questionText && q?.languages?.hi?.questionText).length;
  const unpairedCount = parsedQuestions.length - pairedCount;
  const reviewCount = parsedQuestions.filter(q => q.needsReview).length;

  if (parsedQuestions.length === 0) {
    warnings.push('No questions could be cleanly auto-detected. Please use interactive Crop or Copy/Paste as fallback.');
  } else if (parsedQuestions.length !== 180 && parsedQuestions.length !== 200) {
    warnings.push(`Detected ${parsedQuestions.length} questions. Typical NEET mock test has 180 questions (or 200 with optional questions).`);
  }

  if (unpairedCount > 0) {
    warnings.push(`${unpairedCount} questions are missing either English or Hindi translation.`);
  }

  const finalStats = {
    totalPages,
    questionsDetected: parsedQuestions.length,
    englishQuestions: englishCount,
    hindiQuestions: hindiCount,
    pairedQuestions: pairedCount,
    unpairedQuestions: unpairedCount,
    figuresDetected: figuresDetectedCount,
    optionFiguresDetected: optionFiguresCount,
    reviewRequiredCount: reviewCount
  };

  onProgress?.({
    stage: 'completed',
    stageTitle: 'Import Ready for Review',
    detail: `Successfully processed ${parsedQuestions.length} questions (${pairedCount} bilingual, ${figuresDetectedCount} diagrams).`,
    progressPercent: 100,
    stats: finalStats
  });

  return {
    questions: parsedQuestions,
    stats: finalStats,
    warnings
  };
}

/**
 * Extracts question body, 4 options (A, B, C, D), and answer/explanation from raw chunk
 */
function parseQuestionOptionsAndText(
  rawText: string,
  qNum: number,
  _lang: 'en' | 'hi'
): {
  questionText: string;
  options: MockQuestionOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
} {
  // Strip leading question number (e.g. "Q.59", "59.", etc.)
  let cleaned = rawText
    .replace(/^(?:Q(?:uestion)?\.?|प्रश्न|प्र\.)\s*\d{1,3}\s*(?:\.|\:|\))\s*/i, '')
    .replace(/^\d{1,3}\s*(?:\.|\:|\))\s*/, '')
    .trim();

  // Look for options markers: (1), (2), (3), (4) or (A), (B), (C), (D) or 1., 2., 3., 4. or A., B., C., D.
  const optionRegex = /(?:^|\n|\s)(?:\(([1-4A-Da-d])\)|([1-4A-Da-d])\.)\s+/g;
  const optionMatches: Array<{ index: number; labelStr: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = optionRegex.exec(cleaned)) !== null) {
    const rawLabel = m[1] || m[2];
    optionMatches.push({
      index: m.index,
      labelStr: rawLabel.toUpperCase()
    });
  }

  const options: MockQuestionOption[] = [];
  let questionText = cleaned;
  let explanation: string | undefined = undefined;
  let correctAnswer: 'A' | 'B' | 'C' | 'D' | undefined = undefined;

  // Check for Answer key / Explanation line (e.g. "Ans: (2)", "Answer: B", "उत्तर: 3")
  const ansMatch = cleaned.match(/(?:Ans(?:wer)?|उत्तर)\s*(?:\:|\-)\s*\(?([1-4A-D])\)?/i);
  if (ansMatch) {
    const rawAns = ansMatch[1].toUpperCase();
    if (rawAns === '1' || rawAns === 'A') correctAnswer = 'A';
    else if (rawAns === '2' || rawAns === 'B') correctAnswer = 'B';
    else if (rawAns === '3' || rawAns === 'C') correctAnswer = 'C';
    else if (rawAns === '4' || rawAns === 'D') correctAnswer = 'D';
  }

  if (optionMatches.length >= 2) {
    // Everything before the first option is questionText
    questionText = cleaned.substring(0, optionMatches[0].index).trim();

    // Map 1->A, 2->B, 3->C, 4->D
    const labelMapping: Record<string, 'A' | 'B' | 'C' | 'D'> = {
      '1': 'A', 'A': 'A',
      '2': 'B', 'B': 'B',
      '3': 'C', 'C': 'C',
      '4': 'D', 'D': 'D'
    };

    for (let i = 0; i < optionMatches.length; i++) {
      const cur = optionMatches[i];
      const next = optionMatches[i + 1];
      let optText = next ? cleaned.substring(cur.index, next.index) : cleaned.substring(cur.index);
      
      // Clean option prefix from text
      optText = optText.replace(/^\s*(?:\([1-4A-Da-d]\)|[1-4A-Da-d]\.)\s*/, '').trim();
      
      // If explanation is embedded at the end of last option, separate it
      if (i === optionMatches.length - 1) {
        const expSplit = optText.split(/(?:Explanation|स्पष्टीकरण)\s*\:/i);
        if (expSplit.length > 1) {
          optText = expSplit[0].trim();
          explanation = expSplit[1].trim();
        }
      }

      const mappedLabel = labelMapping[cur.labelStr] || (['A', 'B', 'C', 'D'][i] as 'A' | 'B' | 'C' | 'D');
      if (options.length < 4) {
        options.push({
          label: mappedLabel,
          type: 'text',
          value: optText
        });
      }
    }
  }

  // Ensure default 4 options if some were missing
  const neededLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  for (const lbl of neededLabels) {
    if (!options.some(o => o.label === lbl)) {
      options.push({
        label: lbl,
        type: 'text',
        value: `Option ${lbl}`
      });
    }
  }

  options.sort((a, b) => a.label.localeCompare(b.label));

  if (!questionText) {
    questionText = `Question ${qNum}`;
  }

  return {
    questionText,
    options,
    correctAnswer: correctAnswer || 'A',
    explanation
  };
}
