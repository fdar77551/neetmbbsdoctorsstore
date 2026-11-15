// NCERTify AI Parser 2.0 / 3.0 - Answer Key & Solution Document Matching Service
// Multi-format support: PDF table/grid, image answer key OCR via Gemini, solution chunks, pasted text, and manual input

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Parser2AnswerKeyEntry, Parser2Question } from './types';

export interface AnswerKeyMatchResult {
  matchedCount: number;
  explanationMatchedCount: number;
  missingQuestions: number[];
  skippedManualCount: number;
  keysMap: Record<number, Parser2AnswerKeyEntry>;
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
    const missingQuestions: number[] = [];

    for (const q of questions) {
      const keyEntry = keys[q.questionNumber];
      const solEntry = solutions[q.questionNumber];
      const targetAnswer = keyEntry?.verifiedAnswer || solEntry?.answer;

      if (q.isManuallyEdited && !overwriteManual) {
        // Still attach missing explanation if user hasn't manually edited explanation
        const editedSet = new Set(q.editedFields || []);
        if (solEntry?.explanation && !editedSet.has('explanation') && !q.explanation) {
          q.explanation = solEntry.explanation;
          explanationMatchedCount++;
        }
        if (!editedSet.has('correctAnswer')) {
          if (targetAnswer) {
            q.correctAnswer = targetAnswer;
            q.answerStatus = 'matched';
            matchedCount++;
          }
        } else {
          skippedManualCount++;
        }
        continue;
      }

      if (targetAnswer) {
        q.correctAnswer = targetAnswer;
        q.answerStatus = 'matched';
        matchedCount++;
      } else if (markMissing && !q.correctAnswer) {
        q.answerStatus = 'answer_missing';
        missingQuestions.push(q.questionNumber);
      }

      // Preserve existing explanation if already valid and incoming is empty
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
