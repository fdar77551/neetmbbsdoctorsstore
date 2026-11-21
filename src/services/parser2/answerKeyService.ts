// NCERTify AI Parser 2.0 / 3.0 - Answer Key & Solution Document Matching Service
// Multi-format support: PDF table/grid, image answer key OCR via Gemini, solution chunks, pasted text, and manual input

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Parser2AnswerKeyEntry, Parser2Question } from './types';
import { apiRateLimiter } from './apiRateLimiter.js';

export interface AnswerKeyMatchResult {
  matchedCount: number;
  explanationMatchedCount: number;
  missingQuestions: number[];
  skippedManualCount: number;
  conflictCount: number;
  keysMap: Record<number, Parser2AnswerKeyEntry>;
}

export interface AnswerKeyComparisonRow {
  questionNumber: number;
  questionId?: string;
  sourcePageNumber: number;
  sourcePageRange?: string;
  currentAnswer?: 'A' | 'B' | 'C' | 'D';
  detectedAnswer?: 'A' | 'B' | 'C' | 'D';
  importedAnswer?: 'A' | 'B' | 'C' | 'D';
  setCode?: string;
  sourcePage?: number;
  confidence?: number;
  sourceType?: Parser2AnswerKeyEntry['sourceType'];
  status: 'matched' | 'missing' | 'conflict' | 'needs_review' | 'verified';
}

export class AnswerKeyService {

  /**
   * Extract question-to-answer mappings from an uploaded answer key image using server-side Gemini multimodal
   */
  public async parseAnswerKeyImage(
    imageBase64: string,
    mimeType: string = 'image/png'
  ): Promise<Record<number, Parser2AnswerKeyEntry>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('GEMINI_API_KEY is not configured for image-based answer key extraction.');
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const detectedMime = imageBase64.startsWith('data:image/')
      ? (imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/)?.[1] || mimeType)
      : mimeType;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 55000,
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const prompt = `Read this NEET examination answer key image carefully.
Extract EVERY question number (1 to 200) and its official answer key option.
Normalize numeric answers: 1 -> A, 2 -> B, 3 -> C, 4 -> D.
Ignore headers/footers. Do NOT guess or invent answers for missing rows.
Return JSON array of { questionNumber, rawAnswer, answer }.`;

    const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    let response: any = null;
    let lastErr: any = null;

    for (const model of models) {
      try {
        response = await apiRateLimiter.schedule(
          'gemini',
          async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(new Error('Answer key OCR deadline guard (40000ms)')), 40000);
            try {
              return await ai.models.generateContent({
                model,
                contents: {
                  parts: [
                    { inlineData: { mimeType: detectedMime, data: cleanBase64 } },
                    { text: prompt }
                  ]
                },
                config: {
                  abortSignal: controller.signal,
                  ...(model.startsWith('gemini-4-') ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.INTEGER },
                        rawAnswer: { type: Type.STRING },
                        answer: { type: Type.STRING, description: 'A, B, C, or D' },
                        explanation: { type: Type.STRING }
                      },
                      required: ['questionNumber', 'answer']
                    }
                  }
                }
              });
            } finally {
              clearTimeout(timer);
            }
          },
          { label: `Answer key image OCR [${model}]` }
        );
        break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!response) {
      throw lastErr || new Error('Failed to parse answer key image.');
    }

    const parsed: Array<{ questionNumber: number; rawAnswer?: string; answer: string; explanation?: string }> =
      JSON.parse((response.text ?? '[]').trim());

    const map: Record<number, Parser2AnswerKeyEntry> = {};
    const now = new Date().toISOString();
    for (const item of parsed) {
      const normalized = this.normalizeOptionLabel(item.answer || item.rawAnswer || '');
      if (item.questionNumber > 0 && normalized) {
        map[item.questionNumber] = {
          questionNumber: item.questionNumber,
          rawAnswer: item.rawAnswer || item.answer,
          verifiedAnswer: normalized,
          explanation: item.explanation ? String(item.explanation).trim() : undefined,
          sourceType: 'image_upload',
          matchedAt: now
        };
      }
    }

    return map;
  }

  /**
   * Parse an uploaded Answer Key PDF (both selectable text and scanned/grid answer key sheets).
   */
  public async parseAnswerKeyPdf(
    pdfBuffer: Buffer,
    options?: { dpi?: number; setCode?: string }
  ): Promise<{ keys: Record<number, Parser2AnswerKeyEntry>; pagesScanned: number; keyPages: number[] }> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { figureExtractionService } = await import('./figureExtractionService');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const totalPages = Math.min(doc.numPages, 30);
    const merged: Record<number, Parser2AnswerKeyEntry> = {};
    const keyPages: number[] = [];
    const now = new Date().toISOString();
    const dpi = Math.max(160, options?.dpi || 180);

    for (let p = 1; p <= totalPages; p++) {
      let pageText = '';
      try {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        pageText = content.items.map((it: any) => it.str).join(' ');
      } catch {}

      const textKeys = this.parseAnswerKeyText(pageText, 'answer_key_pdf');
      const textCount = Object.keys(textKeys).length;
      if (textCount >= 8) {
        keyPages.push(p);
        for (const [kStr, entry] of Object.entries(textKeys)) {
          const qNum = Number(kStr);
          merged[qNum] = {
            ...entry,
            sourceType: 'answer_key_pdf',
            sourcePage: p,
            setCode: options?.setCode || entry.setCode,
            confidence: entry.confidence ?? 96,
            matchedAt: now
          };
        }
        continue;
      }

      // Render page PNG and use Gemini vision for tabular/image answer key PDFs
      try {
        const pagePng = await figureExtractionService.renderPdfPageToPng(pdfBuffer, p, dpi);
        const imgKeys = await this.parseAnswerKeyImage(pagePng.toString('base64'), 'image/png');
        const imgCount = Object.keys(imgKeys).length;
        if (imgCount > 0) {
          keyPages.push(p);
          for (const [kStr, entry] of Object.entries(imgKeys)) {
            const qNum = Number(kStr);
            merged[qNum] = {
              ...entry,
              sourceType: 'answer_key_pdf',
              sourcePage: p,
              setCode: options?.setCode || entry.setCode,
              confidence: entry.confidence ?? 92,
              matchedAt: now
            };
          }
        }
      } catch {}
    }

    return { keys: merged, pagesScanned: totalPages, keyPages };
  }

  /**
   * Build detailed per-question answer key comparison table for the Admin UI
   */
  public buildAnswerKeyComparison(
    questions: Parser2Question[],
    keys: Record<number, Parser2AnswerKeyEntry>
  ): AnswerKeyComparisonRow[] {
    const qByNum = new Map<number, Parser2Question>();
    for (const q of questions) {
      qByNum.set(q.questionNumber, q);
    }

    const allQNums = new Set<number>([
      ...questions.map(q => q.questionNumber),
      ...Object.keys(keys || {}).map(Number).filter(n => n > 0)
    ]);

    return Array.from(allQNums)
      .sort((a, b) => a - b)
      .map(qNum => {
        const q = qByNum.get(qNum);
        const k = keys[qNum];
        const importedAns = k?.verifiedAnswer || q?.importedAnswer;
        const detectedAns = q?.detectedAnswer || (q?.answerStatus === 'inferred' ? q.correctAnswer : undefined);
        const currentAns = q?.correctAnswer;

        let status: AnswerKeyComparisonRow['status'] = 'missing';
        if (q?.isManuallyEdited && q.editedFields?.includes('correctAnswer') && currentAns) {
          status = importedAns && importedAns !== currentAns ? 'conflict' : 'verified';
        } else if (detectedAns && importedAns && detectedAns !== importedAns) {
          status = 'conflict';
        } else if (importedAns && currentAns === importedAns) {
          status = k?.confidence !== undefined && k.confidence < 75 ? 'needs_review' : 'matched';
        } else if (importedAns && !currentAns) {
          status = 'matched';
        } else if (currentAns) {
          status = 'verified';
        }

        return {
          questionNumber: qNum,
          questionId: q?.id,
          sourcePageNumber: q?.sourcePageNumber || k?.sourcePage || 1,
          sourcePageRange: q?.sourcePageRange || (q ? `Page ${q.sourcePageNumber}` : undefined),
          currentAnswer: currentAns,
          detectedAnswer: detectedAns,
          importedAnswer: importedAns,
          setCode: k?.setCode || q?.answerSetCode,
          sourcePage: k?.sourcePage ?? q?.answerSourcePage,
          confidence: k?.confidence ?? q?.answerConfidence,
          sourceType: k?.sourceType,
          status
        };
      });
  }

  /**
   * Match extracted answer keys & explanations onto questions strictly by questionNumber.
   * Rules:
   * - Never overwrite manually edited questions unless overwriteManual=true.
   * - Never overwrite existing valid explanations if solution map doesn't have one.
   * - Mark unmatched questions honestly as answerStatus: 'answer_missing' without inventing fake keys.
   */
  public applyKeysAndSolutionsToQuestions(
    questions: Parser2Question[],
    keys: Record<number, Parser2AnswerKeyEntry>,
    solutions: Record<number, { answer?: 'A' | 'B' | 'C' | 'D'; explanation: string }> = {},
    options?: { overwriteManual?: boolean; markMissingUnmatched?: boolean }
  ): AnswerKeyMatchResult {
    const overwriteManual = options?.overwriteManual ?? false;
    const markMissing = options?.markMissingUnmatched ?? true;

    let matchedCount = 0;
    let explanationMatchedCount = 0;
    let skippedManualCount = 0;
    let conflictCount = 0;
    const missingQuestions: number[] = [];

    for (const q of questions) {
      const keyEntry = keys[q.questionNumber];
      const solEntry = solutions[q.questionNumber];
      const targetAnswer = keyEntry?.verifiedAnswer || solEntry?.answer;

      if (keyEntry) {
        q.importedAnswer = keyEntry.verifiedAnswer;
        if (keyEntry.setCode) q.answerSetCode = keyEntry.setCode;
        if (keyEntry.sourcePage) q.answerSourcePage = keyEntry.sourcePage;
        if (keyEntry.confidence !== undefined) q.answerConfidence = keyEntry.confidence;
      }

      if (q.isManuallyEdited && !overwriteManual) {
        const editedSet = new Set(q.editedFields || []);
        if (solEntry?.explanation && !editedSet.has('explanation') && !q.explanation) {
          q.explanation = solEntry.explanation;
          explanationMatchedCount++;
        }
        if (!editedSet.has('correctAnswer')) {
          if (targetAnswer) {
            if (q.detectedAnswer && q.detectedAnswer !== targetAnswer) {
              conflictCount++;
              q.answerKeyStatus = 'conflict';
            } else {
              q.answerKeyStatus = 'matched';
            }
            q.correctAnswer = targetAnswer;
            q.answerStatus = 'matched';
            matchedCount++;
          }
        } else {
          if (targetAnswer && q.correctAnswer && q.correctAnswer !== targetAnswer) {
            conflictCount++;
            q.answerKeyStatus = 'conflict';
          } else if (q.correctAnswer) {
            q.answerKeyStatus = 'verified';
          }
          skippedManualCount++;
        }
        continue;
      }

      if (targetAnswer) {
        if (q.detectedAnswer && q.detectedAnswer !== targetAnswer) {
          conflictCount++;
          q.answerKeyStatus = 'conflict';
        } else {
          q.answerKeyStatus = keyEntry?.confidence !== undefined && keyEntry.confidence < 75 ? 'needs_review' : 'matched';
        }
        q.correctAnswer = targetAnswer;
        q.answerStatus = 'matched';
        matchedCount++;
      } else if (markMissing && !q.correctAnswer) {
        q.answerStatus = 'answer_missing';
        q.answerKeyStatus = 'missing';
        missingQuestions.push(q.questionNumber);
      }

      const incomingExplanation = solEntry?.explanation || keyEntry?.explanation;
      if (incomingExplanation && incomingExplanation.trim().length > 3) {
        q.explanation = incomingExplanation.trim();
        explanationMatchedCount++;
      }
    }

    return {
      matchedCount,
      explanationMatchedCount,
      missingQuestions,
      skippedManualCount,
      conflictCount,
      keysMap: keys
    };
  }

  /**
   * Parse answer key from raw text or pasted string
   * Handles formats:
   * 1. "1. (2) 2. (3) 3. (1) ..."
   * 2. "1-A, 2-C, 3-D" / "1: B, 2: C, 3: A ..."
   * 3. "Q1. A", "Q.2 - B", "Q3) (C)"
   * 4. Multi-column tabular rows: "1 A  26 B  51 C" and Markdown tables "| 1 | A | 26 | B |"
   * 5. Keys with inline explanations: "1. (A) By Newton's second law F = ma"
   * 6. Devanagari numerals: "1. (२) 2. (३) ..."
   * Duplicate question numbers with conflicting answers in the same sheet are flagged with low confidence (45).
   */
  public parseAnswerKeyText(text: string, sourceType: Parser2AnswerKeyEntry['sourceType'] = 'text_paste'): Record<number, Parser2AnswerKeyEntry> {
    const results: Record<number, Parser2AnswerKeyEntry> = {};
    if (!text || !text.trim()) return results;

    const now = new Date().toISOString();
    const recordEntry = (qNum: number, rawOpt: string, explanation?: string) => {
      const verified = this.normalizeOptionLabel(rawOpt);
      if (!verified || qNum < 1 || qNum > 250) return;
      const existing = results[qNum];
      if (existing && existing.verifiedAnswer !== verified) {
        // Conflicting duplicate in same source — flag for review rather than silently guessing
        existing.confidence = 45;
        existing.rawAnswer = `${existing.rawAnswer} (conflict: ${rawOpt})`;
        return;
      }
      results[qNum] = {
        questionNumber: qNum,
        rawAnswer: rawOpt,
        verifiedAnswer: verified,
        explanation: explanation && explanation.trim().length > 2 ? explanation.trim() : existing?.explanation,
        confidence: existing?.confidence ?? 96,
        sourceType,
        matchedAt: now
      };
    };

    // Pass 1: Line-by-line parsing for single-row with optional explanation, Markdown tables, and multi-column grids
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Skip pure markdown separator rows like |---|---|
      if (/^\|?[\s:\-|]+\|?$/.test(line)) continue;

      // Markdown / pipe table row with one or more pairs: "| 1 | A | 26 | B |"
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .map(c => c.trim())
          .filter(Boolean);
        for (let i = 0; i + 1 < cells.length; i += 2) {
          const qMatch = cells[i].match(/^(?:Q\.?\s*)?(\d{1,3})\.?$/i);
          const aMatch = cells[i + 1].match(/^[\(\[]?([1-4A-Da-d१-४])[\)\]]?$/);
          if (qMatch && aMatch) {
            recordEntry(parseInt(qMatch[1], 10), aMatch[1]);
          }
        }
        continue;
      }

      // Single-line "Q1. (A) Explanation text..." or "1. B - Explanation text..."
      const expLineMatch = line.match(
        /^(?:Q\.?\s*)?(\d{1,3})\s*(?:[\.:\-\>\)]+|\s+)\s*(?:(?:Ans(?:wer)?|Key)\s*[:\-]?\s*)?[\(\[]?([1-4A-Da-d१-४])[\)\]]?(?:\s*(?:[-–—:\|]|\b(?:because|since|as|by|explanation|sol(?:ution)?)\b)\s*(.+))?$/i
      );
      if (expLineMatch) {
        const qNum = parseInt(expLineMatch[1], 10);
        const rawOpt = expLineMatch[2];
        const maybeExp = expLineMatch[3];
        // Make sure trailing text isn't another pair like "2-C, 3-D"
        if (!maybeExp || !/^\s*(?:Q\.?\s*)?\d{1,3}\s*[\.:\-\>\)\s]+[\(\[]?[1-4A-Da-d१-४]/i.test(maybeExp)) {
          recordEntry(qNum, rawOpt, maybeExp);
          continue;
        }
      }

      // Multi-column tabular line: "1 A   26 B   51 C" or "Q1. A  Q2. B"
      const multiPairRegex = /(?:^|[\s,;]+)(?:Q\.?\s*)?(\d{1,3})\s*(?:[\.:\-\>\)]+|\s{1,4})\s*[\(\[]?([1-4A-Da-d१-४])[\)\]]?(?=$|[\s,;]+)/gi;
      let pairMatch;
      let lineMatches = 0;
      const linePairs: Array<[number, string]> = [];
      while ((pairMatch = multiPairRegex.exec(line)) !== null) {
        lineMatches++;
        linePairs.push([parseInt(pairMatch[1], 10), pairMatch[2]]);
      }
      if (lineMatches >= 2) {
        for (const [qNum, rawOpt] of linePairs) {
          recordEntry(qNum, rawOpt);
        }
      }
    }

    // Pass 2: Inline / comma-separated / continuous stream patterns ("1-A, 2-C, 3-D", "Q1. A Q2. B", "1. (2) 2. (3)")
    if (Object.keys(results).length < 2) {
      const clean = text.replace(/[\r\n]+/g, ' ');
      const regex = /(?:^|[\s,;|])(?:Q\.?\s*)?(\d{1,3})\s*[\.:\-\>\)]+\s*(?:(?:Ans(?:wer)?)\s*[:\-]?\s*)?[\(\[]?([1-4A-Da-d१-४])[\)\]]?(?=$|[\s,;|])/gi;
      let match;
      while ((match = regex.exec(clean)) !== null) {
        const qNum = parseInt(match[1], 10);
        recordEntry(qNum, match[2]);
      }
    }

    return results;
  }

  /**
   * Extract inline answer keys printed immediately after individual questions on a page
   * e.g. "Q.12 ... (4) 10 m/s  Ans. (2)" or "12. ... Answer: (B)"
   */
  public extractInlineAnswersFromPageText(
    pageText: string,
    sourcePage?: number
  ): Record<number, Parser2AnswerKeyEntry> {
    const results: Record<number, Parser2AnswerKeyEntry> = {};
    if (!pageText || !/(?:ans(?:wer)?|correct\s*option|उत्तर)\s*[:.\-\s]*[\(\[]?[1-4A-Da-d१-४]/i.test(pageText)) {
      return results;
    }

    const now = new Date().toISOString();
    // Split roughly on question starts to bind each inline "Ans: (X)" to its preceding question number
    const blocks = pageText.split(/(?=(?:^|\n)\s*(?:Q\.?\s*\d{1,3}(?:\s*[\.\):]|\s+)|\d{1,3}\s*[\.\)]))/im);
    for (const block of blocks) {
      const qStart = block.match(/^\s*(?:Q\.?\s*(\d{1,3})(?:\s*[\.\):]|\s+)|(\d{1,3})\s*[\.\)])/i);
      if (!qStart) continue;
      const qNum = parseInt(qStart[1] || qStart[2], 10);
      if (qNum < 1 || qNum > 250) continue;
      const ansMatch = block.match(/(?:ans(?:wer)?|correct\s*(?:option|answer)|उत्तर)\s*[:.\-]?\s*[\(\[]?([1-4A-Da-d१-४])[\)\]]?/i);
      if (!ansMatch) continue;
      const verified = this.normalizeOptionLabel(ansMatch[1]);
      if (verified) {
        results[qNum] = {
          questionNumber: qNum,
          rawAnswer: ansMatch[1],
          verifiedAnswer: verified,
          sourceType: 'pdf_page',
          sourcePage,
          confidence: 92,
          matchedAt: now
        };
      }
    }
    return results;
  }

  /**
   * Parse full SOLUTIONS.pdf text into explanations and answers
   * Matches chunks by: "\b\d{1,3}\s*\.\s*Answer\s*:\s*\(([1-4A-D])\)"
   */
  public parseSolutionsDocument(solutionsText: string): Record<number, { answer?: 'A' | 'B' | 'C' | 'D'; explanation: string }> {
    const map: Record<number, { answer?: 'A' | 'B' | 'C' | 'D'; explanation: string }> = {};
    if (!solutionsText) return map;

    const splitRegex = /(?:^|\n)\s*(\d{1,3})\s*\.\s*(?:Answer|Ans|उत्तर)\s*[:\-]?\s*[\(\[]?([1-4A-Da-d१-४])[\)\]]?/gi;

    let lastIndex = 0;
    let lastQNum: number | null = null;
    let lastAns: ('A' | 'B' | 'C' | 'D') | undefined = undefined;

    let match;
    while ((match = splitRegex.exec(solutionsText)) !== null) {
      if (lastQNum !== null) {
        const expChunk = solutionsText.slice(lastIndex, match.index).trim();
        map[lastQNum] = {
          answer: lastAns,
          explanation: this.cleanExplanationText(expChunk)
        };
      }
      lastQNum = parseInt(match[1], 10);
      lastAns = this.normalizeOptionLabel(match[2]);
      lastIndex = splitRegex.lastIndex;
    }

    if (lastQNum !== null && lastIndex < solutionsText.length) {
      const expChunk = solutionsText.slice(lastIndex).trim();
      map[lastQNum] = {
        answer: lastAns,
        explanation: this.cleanExplanationText(expChunk)
      };
    }

    return map;
  }

  public normalizeOptionLabel(raw: string): ('A' | 'B' | 'C' | 'D') | undefined {
    if (!raw) return undefined;
    const r = raw.trim().toUpperCase();
    if (r === 'A' || r === '1' || r === '१') return 'A';
    if (r === 'B' || r === '2' || r === '२') return 'B';
    if (r === 'C' || r === '3' || r === '३') return 'C';
    if (r === 'D' || r === '4' || r === '४') return 'D';
    return undefined;
  }

  private cleanExplanationText(raw: string): string {
    return raw
      .replace(/^(?:Answer|Ans|उत्तर)\s*[:\-]?\s*[\(\[]?[1-4A-D१-४][\)\]]?\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const answerKeyService = new AnswerKeyService();
