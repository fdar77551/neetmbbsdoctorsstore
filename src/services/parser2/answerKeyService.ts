// NCERTify AI Parser 2.0 / 3.0 - Answer Key & Solution Document Matching Service
// Multi-format support: PDF table/grid, image answer key OCR via Gemini, solution chunks, pasted text, and manual input

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Parser2AnswerKeyEntry, Parser2Question } from './types';

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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('Answer key OCR deadline guard (40000ms)')), 40000);
      try {
        response = await ai.models.generateContent({
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
                  answer: { type: Type.STRING, description: 'A, B, C, or D' }
                },
                required: ['questionNumber', 'answer']
              }
            }
          }
        });
        clearTimeout(timer);
        break;
      } catch (err: any) {
        clearTimeout(timer);
        lastErr = err;
      }
    }

    if (!response) {
      throw lastErr || new Error('Failed to parse answer key image.');
    }

    const parsed: Array<{ questionNumber: number; rawAnswer?: string; answer: string }> =
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
   * 2. "1: B, 2: C, 3: A ..."
   * 3. Table columns: "Q No. Ans \n 1 A \n 2 B ..."
   * 4. Devanagari numerals: "1. (२) 2. (३) ..."
   */
  public parseAnswerKeyText(text: string, sourceType: Parser2AnswerKeyEntry['sourceType'] = 'text_paste'): Record<number, Parser2AnswerKeyEntry> {
    const results: Record<number, Parser2AnswerKeyEntry> = {};
    if (!text || !text.trim()) return results;

    const clean = text.replace(/[\r\n]+/g, ' ');

    // Pattern 1: Question followed by option in parentheses or colon or dot
    const regex = /\b(\d{1,3})\s*[\.:\-\>\)]+\s*[\(\[]?([1-4A-Da-d१-४])[\)\]]?\b/g;
    let match;

    while ((match = regex.exec(clean)) !== null) {
      const qNum = parseInt(match[1], 10);
      const rawOpt = match[2];

      const verified = this.normalizeOptionLabel(rawOpt);
      if (verified && qNum >= 1 && qNum <= 250) {
        results[qNum] = {
          questionNumber: qNum,
          rawAnswer: rawOpt,
          verifiedAnswer: verified,
          sourceType,
          matchedAt: new Date().toISOString()
        };
      }
    }

    // Pattern 2: Tabular line by line "1  A", "2  (1)", "Q1 B"
    if (Object.keys(results).length === 0) {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const lineMatch = line.trim().match(/^(?:Q\.?\s*)?(\d{1,3})\s*[:\-|\t ]+\s*[\(\[]?([1-4A-Da-d१-४])[\)\]]?$/i);
        if (lineMatch) {
          const qNum = parseInt(lineMatch[1], 10);
          const verified = this.normalizeOptionLabel(lineMatch[2]);
          if (verified && qNum >= 1 && qNum <= 250) {
            results[qNum] = {
              questionNumber: qNum,
              rawAnswer: lineMatch[2],
              verifiedAnswer: verified,
              sourceType,
              matchedAt: new Date().toISOString()
            };
          }
        }
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
