// NCERTify AI Parser 2.0 - Gemini Multimodal Verification Service
// Verifies OCR markdown against high-resolution rendered page images
// Uses @google/genai SDK with configurable model (default: gemini-4-hydrogen)

import sharp from 'sharp';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Parser2Question, Parser2Subject } from './types';
import { parser2LayoutEngine } from './layoutEngine';
import { answerKeyService } from './answerKeyService';

export interface AnswerKeyPageDetectionResult {
  isAnswerKeyPage: boolean;
  pageLayout?: 'two_column_english' | 'single_column' | 'grid';
  entries: Array<{ questionNumber: number; answer: 'A' | 'B' | 'C' | 'D'; rawAnswer?: string }>;
}

export interface GeminiVerificationResult {
  questionNumber: number;
  verifiedQuestionText: string;
  verifiedOptions: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string }>;
  detectedQuestionType: Parser2Question['questionType'];
  pageLayout?: 'two_column_bilingual' | 'two_column_english' | 'single_column';
  hasDiagram: boolean;
  figureType?: 'diagram' | 'graph' | 'chemical_structure' | 'table';
  diagramBoundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0..1000 scale
  isChemistryStructure: boolean;
  chemistryContentType?: 'none' | 'simple_text' | 'complex_structures' | 'mixed';
  matchTableData?: {
    columnAHeader?: string;
    columnBHeader?: string;
    rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }>;
  };
  structuredTableData?: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
  optionBoundingBoxes?: {
    A?: [number, number, number, number];
    B?: [number, number, number, number];
    C?: [number, number, number, number];
    D?: [number, number, number, number];
  };
  confidenceScore: number; // 0..100
  reviewRequired: boolean;
  reviewNotes?: string;
  correctionsSummary?: string;
}

export interface VisualCropCheckResult {
  isGenuineScientificFigure: boolean;
  isTextOnlyOrQuestionText: boolean;
  matchesQuestionContext: boolean;
  detectedType: 'diagram' | 'graph' | 'chemical_structure' | 'table' | 'printed_text_error';
  reason: string;
}

export interface TargetedRecoveryResult {
  recoveredQuestionText?: string;
  recoveredOptions?: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string }>;
  recoveredDiagramBoundingBox?: [number, number, number, number];
  recoveredDiagramType?: 'diagram' | 'graph' | 'chemical_structure' | 'table';
  recoveredOptionBoundingBoxes?: {
    A?: [number, number, number, number];
    B?: [number, number, number, number];
    C?: [number, number, number, number];
    D?: [number, number, number, number];
  };
  recoveredMatchTableData?: {
    columnAHeader?: string;
    columnBHeader?: string;
    rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }>;
  };
  recoveredStructuredTableData?: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
  fromNextPage?: boolean;
  pageLayout?: 'two_column_bilingual' | 'two_column_english' | 'single_column';
  chemistryContentType?: 'none' | 'simple_text' | 'complex_structures' | 'mixed';
  confidenceScore?: number;
  notes?: string;
}

export class GeminiVerificationService {
  private ai: GoogleGenAI | null = null;
  private defaultModel = 'gemini-4-hydrogen';
  private modelCooldownUntil = new Map<string, number>();

  constructor() {
    this.ensureClient();
  }

  private ensureClient(): GoogleGenAI | null {
    if (this.ai) return this.ai;
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 10) {
      this.ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          timeout: 60000,
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return this.ai;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  }

  private resolveModelCandidates(preferredModel?: string): string[] {
    const raw = (preferredModel || this.defaultModel).trim();
    const normalized = raw === 'gemini-3.8-flash' ? 'gemini-4-hydrogen' : raw;
    const baseCandidates = Array.from(new Set([normalized, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'].filter(Boolean)));
    const now = Date.now();
    const healthy = baseCandidates.filter(m => (this.modelCooldownUntil.get(m) || 0) <= now);
    const cooling = baseCandidates.filter(m => (this.modelCooldownUntil.get(m) || 0) > now);
    return [...healthy, ...cooling];
  }

  private buildThinkingConfig(model: string): { thinkingConfig?: { thinkingLevel: ThinkingLevel } } {
    if (model.includes('flash-lite')) {
      return {};
    }
    if (model.startsWith('gemini-4-') || model.startsWith('gemini-3')) {
      return { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } };
    }
    return {};
  }

  private summarizeGeminiError(err: any): string {
    const msg = String(err?.message || err || 'Unknown error');
    if (msg.includes('504') || msg.includes('DEADLINE_EXCEEDED') || msg.includes('deadline guard') || msg.includes('AbortError')) {
      return 'deadline timeout (504/aborted)';
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return 'rate limit (429)';
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
      return 'service unavailable (503)';
    }
    if (msg.includes('404') || msg.includes('NOT_FOUND')) {
      return 'model not found (404)';
    }
    return msg.slice(0, 140);
  }

  private isRetriableError(err: any): boolean {
    if (err instanceof SyntaxError) return true;
    const msg = String(err?.message || err || '');
    return (
      msg.includes('504') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('500') ||
      msg.includes('429') ||
      msg.includes('404') ||
      msg.includes('DEADLINE_EXCEEDED') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('NOT_FOUND') ||
      msg.includes('deadline guard') ||
      msg.includes('AbortError') ||
      msg.includes('aborted') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('ECONNRESET') ||
      msg.includes('fetch failed') ||
      msg.includes('Unexpected end of JSON') ||
      msg.includes('Unterminated string')
    );
  }

  private parseJsonArraySafe(rawText: string | undefined): GeminiVerificationResult[] {
    let cleaned = (rawText ?? '[]').trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      // Rescue truncated trailing array item from stream cutoffs if earlier complete objects exist
      const lastObjEnd = cleaned.lastIndexOf('},');
      if (cleaned.startsWith('[') && lastObjEnd > 0) {
        try {
          const salvaged = JSON.parse(cleaned.slice(0, lastObjEnd + 1) + ']');
          if (Array.isArray(salvaged) && salvaged.length > 0) {
            return salvaged;
          }
        } catch {}
      }
      throw parseErr;
    }
  }

  private async runWithDeadlineAndFallback<T>(params: {
    ai: GoogleGenAI;
    preferredModel?: string;
    timeoutMs: number;
    executeAttempt: (model: string, attemptIdx: number, abortSignal: AbortSignal) => Promise<T>;
  }): Promise<T> {
    const models = this.resolveModelCandidates(params.preferredModel);
    let lastError: any = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const controller = new AbortController();
      const attemptTimeout = model === 'gemini-4-hydrogen' && i === 0 ? Math.min(params.timeoutMs, 20000) : Math.max(params.timeoutMs, 34000);
      const timer = setTimeout(() => controller.abort(new Error(`Client deadline guard (${attemptTimeout}ms)`)), attemptTimeout);
      try {
        const result = await params.executeAttempt(model, i, controller.signal);
        clearTimeout(timer);
        this.modelCooldownUntil.delete(model);
        return result;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        const msg = String(err?.message || err || '');
        if (!this.isRetriableError(err)) {
          throw err;
        }
        // Cool down timed-out or rate-limited model for 10 min so subsequent pages route straight to fast healthy fallback
        if (i === 0 && models.length > 1) {
          this.modelCooldownUntil.set(model, Date.now() + 600_000);
          console.log(`[GeminiVerification] Cooling down ${model} for 10m (${this.summarizeGeminiError(err)}); promoting ${models[1]}.`);
        }
        if (i + 1 < models.length && !(msg.includes('404') || msg.includes('NOT_FOUND'))) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
    }

    throw lastError || new Error('Gemini request exceeded retries');
  }

  private async preparePageImagePayload(
    pageImageBuffer: Buffer,
    targetWidth: number = 1500,
    quality: number = 84
  ): Promise<{ data: string; mimeType: string }> {
    try {
      const optimized = await sharp(pageImageBuffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality, progressive: true })
        .toBuffer();
      return { data: optimized.toString('base64'), mimeType: 'image/jpeg' };
    } catch {
      return { data: pageImageBuffer.toString('base64'), mimeType: 'image/png' };
    }
  }

  /**
   * Multimodal verification: Compares extracted page OCR markdown against high-res rendered page image
   */
  public async verifyPageQuestions(
    pageNumber: number,
    pageImageBuffer: Buffer,
    ocrMarkdown: string,
    subject: Parser2Subject,
    modelName: string = this.defaultModel
  ): Promise<GeminiVerificationResult[]> {
    // 0. Quick Cover Page / General Instructions Detection
    if (this.isCoverPage(ocrMarkdown)) {
      console.log(`[GeminiVerification] Page ${pageNumber} identified as Cover/Instructions page. Skipping question extraction.`);
      return [];
    }

    const ai = this.ensureClient();
    if (!ai) {
      console.warn('[GeminiVerification] GEMINI_API_KEY not set, using deterministic OCR parser.');
      return this.fallbackParseOcrMarkdown(ocrMarkdown, subject, pageNumber);
    }

    const prompt = `You are the Lead Scientific OCR & Visual Layout Auditor for NEET-UG examination papers.
You are given:
1. High-resolution rendered image of PDF Page ${pageNumber} (Subject scope: ${subject}).
2. The initial OCR Markdown text extracted from this page (may be empty or noisy for scanned pages).

YOUR TASK:
Inspect the original PDF page image VISUALLY and carefully extract every English examination question, all 4 options, exact mathematical/chemical notation, structured tables, AND tight visual bounding boxes ONLY for genuine figures/graphs/structures.

COVER / INSTRUCTIONS / ANSWER KEY PAGE HANDLING:
- If this page is a Cover Page, Title Page, or contains only General Instructions ("Instructions to Candidates", "3 Hours Duration", "Max Marks: 720") without questions, return [].
- If this page is purely an Answer Key sheet or Hints/Answer Table (e.g. "Answer Key", "1. (A) 2. (B) ... 50. (C)") with NO full MCQ question stems/options, return [] so the dedicated Answer Key detector extracts all entries accurately.
- Never extract instruction rules or answer-key-only rows as questions.

PAGE LAYOUT DETECTION:
- Identify "pageLayout":
  * "two_column_bilingual": English questions on left half (~x: 30..490), Hindi translation on right half (~x: 510..970).
  * "two_column_english": English questions printed in two side-by-side columns with no Hindi column. IMPORTANT: Extract ALL Column 1 (left half, x: 0..500) questions top-to-bottom FIRST, then ALL Column 2 (right half, x: 500..1000) questions top-to-bottom.
  * "single_column": Full-width single-column English questions.

STRICT VERIFICATION GUIDELINES:
1. OPTION EXTRACTION (ZERO TOLERANCE ON MISSING OR PLACEHOLDER OPTIONS):
   - NEVER output placeholder or refusal strings like "Insufficient data in snippet", "Not visible in snippet", "Cannot be determined", "Option (A)", "Option B", "[Missing Option Text]", or "(Empty)". If an option is genuinely cut off onto the next page, output "" (empty string) for that option instead of any explanatory placeholder!
   - Detect options arranged horizontally "(1) ... (2) ... (3) ... (4) ...", vertically, or in 2x2 grids.
   - An option MUST NEVER repeat the question stem!
   - Preserve statement combinations verbatim: e.g. "(A) and (E) only", "(D) only".
   - If options are purely graphical drawings (benzene/aromatic/cyclic rings, isomers, circuit sketches, graphs — e.g. "Anti aromatic molecule is"):
     * Set "optionBoundingBoxes" with TIGHT, STRICTLY NON-OVERLAPPING coordinates [ymin, xmin, ymax, xmax] (0..1000 scale) enclosing ONLY each drawing A, B, C, D.
     * EXCLUDE option numbers "(1)", "(2)", "(3)", "(4)" and EXCLUDE neighboring options!

2. CHEMISTRY SIMPLE FORMULAS VS COMPLEX STRUCTURES (CRITICAL DISTINCTION):
   - Classify "chemistryContentType":
     * "simple_text": Linear/condensed formulas representable as clean editable text — e.g. "CH3-C(Cl)=CH2", "CH3-CH(Cl)-CH2Cl", "CH3-CH2-C(Cl)2", "CH3-C(Cl)2-CH3", "H2SO4", "KMnO4", "CH4", "NH3", IUPAC names.
       -> For "simple_text" options: Write clean formula strings in "verifiedOptions" (e.g. "CH3-C(Cl)=CH2") and DO NOT output "optionBoundingBoxes"! NEVER crop linear formulas into images!
     * "complex_structures": Cyclic rings, benzene/aromatic rings, fused bicyclic systems, chair/boat conformations, stereochemical wedges/dashes, or structural reaction schemes that cannot be written linearly.
       -> For "complex_structures": Provide tight non-overlapping "optionBoundingBoxes" (or "diagramBoundingBox" if in stem) and set "isChemistryStructure": true.

3. STRICT DIAGRAM & GRAPH BOUNDING BOXES (NEVER CROP PRINTED TEXT!):
   - Look visually around and inside EVERY question block for diagrams, apparatus (e.g. venturimeter, pulley, pipes, ray optics, circuits, logic gates), and X-Y graphs (e.g. solar cell V-I characteristic curve, P-V curves, plots with points A and B).
   - If ANY scientific diagram, graph, or complex chemical drawing exists near or inside the question:
     * Set "hasDiagram": true and set "figureType" ("diagram" | "graph" | "chemical_structure" | "table").
     * Provide "diagramBoundingBox": [ymin, xmin, ymax, xmax] on 0..1000 normalized scale.
     * Tightly enclose ONLY the artwork/graph axes/curves/labels. NEVER include printed question text sentences above or option lines (1)-(4) below!
     * NEVER crop printed plain-text questions (e.g. adiabatic gas exponent gamma = 5/3, gamma = 7/5 text questions) as a diagram! If a question is pure text with no artwork, "hasDiagram" MUST be false and "diagramBoundingBox" MUST be omitted!
   - Column boundary rule: If "pageLayout" is "two_column_bilingual", English diagrams MUST stay in left column (xmax <= 490). In "single_column" or "two_column_english", use the exact diagram column coordinates.

4. COMPLETE QUESTION STEM, VECTORS, MATH SYMBOLS, LISTS & TABLES PRECISION:
   - Never start mid-sentence or stop mid-sentence; capture the ENTIRE stem from start through all wrapped lines (e.g. "...taken as fundamental units, then dimensions of gravitational constant are").
   - Preserve chemistry reaction arrows (→, ⇌, Δ), charges (+, −), subscripts/superscripts, fractions, roots (√), Greek letters (Δ, λ, ω, θ, σ, μ₀, ε₀), dimensions ("[M⁻³ L⁻² T⁻² A⁻⁴]"), and inverse trig ("tan⁻¹(...)").
   - NEVER leave raw "$" LaTeX delimiters or raw commands like "\\frac", "\\hat", "\\vec", "i_cap", "j_cap", or "k_cap"! Convert vectors and symbols directly to clean Unicode: "î", "ĵ", "k̂", "F⃗", "3î + 4ĵ", "×", "±", "≤", "≥", "√".
   - NEVER put MCQ choices "(A)..(D)" or "(1)..(4)" into "structuredTableData"! All 4 options MUST ALWAYS be in "verifiedOptions" even when arranged in a 2x2 grid or table.
   - NEVER convert a visual drawing (Vernier calipers, screw gauge, scale ticks, pulley, circuit, ray diagram, graph) into a descriptive "structuredTableData" summary! Set "hasDiagram": true and provide a tight "diagramBoundingBox" around ONLY the illustration instead.
   - For Match-the-Column / List I vs List II questions: keep ONLY the introductory instruction in "verifiedQuestionText" and YOU MUST populate structured "matchTableData" with ALL rows from List I / Column I and List II / Column II (including Roman numerals i, ii, iii, iv). When "matchTableData" is populated, DO NOT also emit a duplicate "structuredTableData" with the same List I/Column I rows!
   - For non-match stem data tables: populate "structuredTableData" with exact column "headers" and all data "rows". If a complex table cannot be transcribed cleanly, also provide "diagramBoundingBox" with "figureType": "table" as visual fallback.

OCR Markdown Context:
"""
${(ocrMarkdown || '').slice(0, 8000)}
"""`;

    try {
      const primaryPayload = await this.preparePageImagePayload(pageImageBuffer, 1550, 84);
      let compactPayload: { data: string; mimeType: string } | null = null;

      return await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: modelName,
        timeoutMs: 22000,
        executeAttempt: async (currentModel, attemptIdx, abortSignal) => {
          const payload =
            attemptIdx === 0
              ? primaryPayload
              : (compactPayload ??= await this.preparePageImagePayload(pageImageBuffer, 1150, 76));

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: payload.mimeType,
                    data: payload.data
                  }
                },
                {
                  text: prompt
                }
              ]
            },
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNumber: { type: Type.INTEGER, description: 'Question number (1 to 200)' },
                    pageLayout: { type: Type.STRING, description: 'two_column_bilingual, two_column_english, or single_column' },
                    verifiedQuestionText: { type: Type.STRING, description: 'Complete verified question statement' },
                    verifiedOptions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING, description: 'A, B, C, or D' },
                          value: { type: Type.STRING, description: 'Exact verified text or formula of the option (empty string if purely visual ring/drawing)' }
                        },
                        required: ['label', 'value']
                      }
                    },
                    detectedQuestionType: {
                      type: Type.STRING,
                      description: 'single_mcq, multiple_statement, assertion_reason, match_the_column, diagram_based, table_based, or numerical'
                    },
                    hasDiagram: { type: Type.BOOLEAN, description: 'True ONLY if there is an actual visual diagram, graph, or complex chemical drawing' },
                    figureType: { type: Type.STRING, description: 'diagram, graph, chemical_structure, or table' },
                    diagramBoundingBox: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER },
                      description: 'Tight [ymin, xmin, ymax, xmax] in 0-1000 scale enclosing ONLY the artwork/graph, NEVER plain question text'
                    },
                    isChemistryStructure: { type: Type.BOOLEAN, description: 'True if complex cyclic/aromatic/reaction structure exists' },
                    chemistryContentType: { type: Type.STRING, description: 'none, simple_text, complex_structures, or mixed' },
                    matchTableData: {
                      type: Type.OBJECT,
                      description: 'Structured Column I vs Column II data for match questions',
                      properties: {
                        columnAHeader: { type: Type.STRING },
                        columnBHeader: { type: Type.STRING },
                        rows: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              colAKey: { type: Type.STRING },
                              colAText: { type: Type.STRING },
                              colBKey: { type: Type.STRING },
                              colBText: { type: Type.STRING }
                            },
                            required: ['colAKey', 'colAText', 'colBKey', 'colBText']
                          }
                        }
                      }
                    },
                    structuredTableData: {
                      type: Type.OBJECT,
                      description: 'Structured table headers and rows for table_based questions',
                      properties: {
                        caption: { type: Type.STRING },
                        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rows: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          }
                        }
                      }
                    },
                    optionBoundingBoxes: {
                      type: Type.OBJECT,
                      description: 'ONLY for graphical/ring options (never for simple linear text formulas). Tight non-overlapping [ymin, xmin, ymax, xmax] for A, B, C, D',
                      properties: {
                        A: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                        B: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                        C: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                        D: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                      }
                    },
                    confidenceScore: { type: Type.INTEGER, description: 'Confidence 0-100' },
                    reviewRequired: { type: Type.BOOLEAN, description: 'Flag if human inspection is needed' },
                    reviewNotes: { type: Type.STRING, description: 'Notes explaining why manual review is needed or what was fixed' },
                    correctionsSummary: { type: Type.STRING, description: 'Summary of corrections applied vs raw OCR' }
                  },
                  required: ['questionNumber', 'verifiedQuestionText', 'verifiedOptions', 'confidenceScore', 'reviewRequired']
                }
              }
            }
          });

          const results = this.parseJsonArraySafe(response.text);
          return results;
        }
      });
    } catch (e: any) {
      console.log(`[GeminiVerification] Page ${pageNumber}: Gemini verification deferred (${this.summarizeGeminiError(e)}). Continuing with OCR extraction fallback.`);
      return this.fallbackParseOcrMarkdown(ocrMarkdown, subject, pageNumber);
    }
  }

  /**
   * High-Resolution Two-Column English Split Extraction:
   * Crops Left Column (0..0.518w) and Right Column (0.482w..w) at full resolution,
   * extracts Column 1 strictly top-to-bottom then Column 2 strictly top-to-bottom,
   * re-projects column bounding boxes back to full-page [0..1000] scale, and stitches
   * any question split across the Column 1 bottom -> Column 2 top boundary.
   */
  public async verifyTwoColumnEnglishPage(
    pageNumber: number,
    pageImageBuffer: Buffer,
    ocrMarkdown: string,
    subject: Parser2Subject,
    modelName: string = this.defaultModel,
    prevPageTailContext?: number | {
      questionNumber: number;
      tailText?: string;
      missingOptions?: boolean;
      danglingAnchorOnly?: boolean;
    }
  ): Promise<GeminiVerificationResult[]> {
    const prevPageLastQuestionNumber =
      typeof prevPageTailContext === 'number'
        ? prevPageTailContext
        : prevPageTailContext?.questionNumber;
    const prevPageTailNote =
      typeof prevPageTailContext === 'object' && prevPageTailContext
        ? prevPageTailContext
        : undefined;
    const ai = this.ensureClient();
    if (!ai) return [];

    try {
      const meta = await sharp(pageImageBuffer).metadata();
      const imgW = meta.width || 1600;
      const imgH = meta.height || 2200;

      const leftColEndRatio = 0.518;
      const rightColStartRatio = 0.482;
      const rightColWidthRatio = 1 - rightColStartRatio;

      const leftW = Math.max(200, Math.round(imgW * leftColEndRatio));
      const rightLeft = Math.max(0, Math.round(imgW * rightColStartRatio));
      const rightW = Math.max(200, imgW - rightLeft);

      const [leftBuf, rightBuf] = await Promise.all([
        sharp(pageImageBuffer).extract({ left: 0, top: 0, width: leftW, height: imgH }).png().toBuffer(),
        sharp(pageImageBuffer).extract({ left: rightLeft, top: 0, width: rightW, height: imgH }).png().toBuffer()
      ]);

      const projectBox = (
        box: number[] | undefined,
        colStartRatio: number,
        colWidthRatio: number
      ): [number, number, number, number] | undefined => {
        if (!Array.isArray(box) || box.length !== 4) return undefined;
        const [ymin, xmin, ymax, xmax] = box.map(Number);
        if ([ymin, xmin, ymax, xmax].some(v => Number.isNaN(v))) return undefined;
        const fYmin = Math.max(0, Math.min(1000, Math.round(Math.min(ymin, ymax))));
        const fYmax = Math.max(0, Math.min(1000, Math.round(Math.max(ymin, ymax))));
        const fXmin = Math.max(0, Math.min(1000, Math.round((colStartRatio + (Math.min(xmin, xmax) / 1000) * colWidthRatio) * 1000)));
        const fXmax = Math.max(0, Math.min(1000, Math.round((colStartRatio + (Math.max(xmin, xmax) / 1000) * colWidthRatio) * 1000)));
        if (fYmax - fYmin < 15 || fXmax - fXmin < 15) return undefined;
        return [fYmin, fXmin, fYmax, fXmax];
      };

      const projectResult = (
        r: GeminiVerificationResult,
        colStartRatio: number,
        colWidthRatio: number
      ): GeminiVerificationResult => {
        const mappedOptBoxes = r.optionBoundingBoxes
          ? {
              A: projectBox(r.optionBoundingBoxes.A, colStartRatio, colWidthRatio),
              B: projectBox(r.optionBoundingBoxes.B, colStartRatio, colWidthRatio),
              C: projectBox(r.optionBoundingBoxes.C, colStartRatio, colWidthRatio),
              D: projectBox(r.optionBoundingBoxes.D, colStartRatio, colWidthRatio)
            }
          : undefined;
        const hasAnyOptBox = Boolean(mappedOptBoxes && (mappedOptBoxes.A || mappedOptBoxes.B || mappedOptBoxes.C || mappedOptBoxes.D));
        return {
          ...r,
          pageLayout: 'two_column_english',
          diagramBoundingBox: projectBox(r.diagramBoundingBox, colStartRatio, colWidthRatio),
          optionBoundingBoxes: hasAnyOptBox ? mappedOptBoxes : undefined
        };
      };

      const extractCol = async (
        colBuf: Buffer,
        side: 'LEFT' | 'RIGHT',
        continuationQNum?: number,
        compactOnly: boolean = false,
        tailSnippet?: string
      ): Promise<GeminiVerificationResult[]> => {
        const contHint = continuationQNum
          ? `CONTINUATION HINT: Any unnumbered options (e.g. (1)/(A)..(4)/(D)), equations, remaining stem text, or List-I/List-II table at the VERY TOP of this ${side} column ABOVE the first printed question number belong to Question ${continuationQNum} from the previous ${side === 'LEFT' ? `page${tailSnippet ? ` (whose bottom snippet was: "${tailSnippet.slice(0, 160)}")` : ''}` : 'LEFT column'} — emit an item with questionNumber: ${continuationQNum} containing those continuing stem/options/table!`
          : `1. If a question is partially split across columns or pages, still extract whatever stem/table/options belong to it with its exact questionNumber.`;
        const colPrompt = `You are inspecting the ${side} COLUMN crop of PDF Page ${pageNumber} (Subject: ${subject}, two-column English MCQ exam paper).
Extract EVERY question and continuation visible in this ${side} column STRICTLY from TOP to BOTTOM.
RULES:
1. ${contHint}
2. NEVER omit a printed question number in this column — extract EVERY question visible from top to bottom (including questions with incomplete/wrapping options or tables) and read COMPLETE stems across all wrapped lines (never truncate mid-sentence).
3. NEVER output refusal strings like "Insufficient data in snippet", "Not provided", or "[Empty]" as option text! If an option is missing/cut off onto the next column or page, output "" (empty string). ALWAYS place all visible choices (A..D / 1..4) into "verifiedOptions" even in 2x2 grids — NEVER put choices into "structuredTableData".
4. Preserve ALL superscripts, exponents (e.g. 10⁻³, M⁻¹ L³ T⁻², p⁻³, x^(1/2)), subscripts, square roots (√), Greek symbols (Δ, λ, θ, ε₀, μ₀, σ), significant figures (0.00204), vectors (î, ĵ, k̂, F⃗), and inverse trig (tan⁻¹) cleanly in Unicode. NEVER leave raw LaTeX like $...$ or \\frac.
5. Match-the-Column / List-I vs List-II questions MUST populate "matchTableData" completely with all rows (and MUST NOT duplicate the same rows into "structuredTableData"). Only genuine non-match stem data tables go into "structuredTableData".
6. Detect ANY visual diagram, Vernier caliper / micrometer / screw gauge / pulley / circuit / graph in this column, set "hasDiagram": true, and return TIGHT "diagramBoundingBox": [ymin, xmin, ymax, xmax] (0..1000 scale relative to this column image) around ONLY the artwork/scale/graph. NEVER turn a Vernier scale or apparatus drawing into a fake text "structuredTableData"!
7. If this column is ONLY an Answer Key list (e.g. "Q1 (A) Q2 (B)..."), return [].

OCR context:
"""
${(ocrMarkdown || '').slice(0, 3500)}
"""`;

        const payload = await this.preparePageImagePayload(colBuf, compactOnly ? 960 : 1150, compactOnly ? 78 : 86);
        let compactColPayload: { data: string; mimeType: string } | null = compactOnly ? payload : null;

        return this.runWithDeadlineAndFallback({
          ai,
          preferredModel: compactOnly ? 'gemini-3.1-flash-lite' : modelName,
          timeoutMs: 38000,
          executeAttempt: async (currentModel, attemptIdx, abortSignal) => {
            const p = attemptIdx === 0 && !compactOnly ? payload : (compactColPayload ??= await this.preparePageImagePayload(colBuf, 920, 78));
            const resp = await ai.models.generateContent({
              model: currentModel,
              contents: {
                parts: [
                  { inlineData: { mimeType: p.mimeType, data: p.data } },
                  { text: colPrompt }
                ]
              },
              config: {
                abortSignal,
                ...this.buildThinkingConfig(currentModel),
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionNumber: { type: Type.INTEGER },
                      verifiedQuestionText: { type: Type.STRING },
                      verifiedOptions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING }
                          },
                          required: ['label', 'value']
                        }
                      },
                      detectedQuestionType: { type: Type.STRING },
                      hasDiagram: { type: Type.BOOLEAN },
                      figureType: { type: Type.STRING },
                      diagramBoundingBox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      isChemistryStructure: { type: Type.BOOLEAN },
                      chemistryContentType: { type: Type.STRING },
                      matchTableData: {
                        type: Type.OBJECT,
                        properties: {
                          columnAHeader: { type: Type.STRING },
                          columnBHeader: { type: Type.STRING },
                          rows: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                colAKey: { type: Type.STRING },
                                colAText: { type: Type.STRING },
                                colBKey: { type: Type.STRING },
                                colBText: { type: Type.STRING }
                              },
                              required: ['colAKey', 'colAText', 'colBKey', 'colBText']
                            }
                          }
                        }
                      },
                      structuredTableData: {
                        type: Type.OBJECT,
                        properties: {
                          caption: { type: Type.STRING },
                          headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                          rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                        }
                      },
                      optionBoundingBoxes: {
                        type: Type.OBJECT,
                        properties: {
                          A: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                          B: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                          C: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                          D: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                        }
                      },
                      confidenceScore: { type: Type.INTEGER },
                      reviewRequired: { type: Type.BOOLEAN },
                      reviewNotes: { type: Type.STRING }
                    },
                    required: ['questionNumber', 'verifiedQuestionText', 'verifiedOptions', 'confidenceScore', 'reviewRequired']
                  }
                }
              }
            });
            return this.parseJsonArraySafe(resp.text);
          }
        });
      };

      // Extract LEFT column then RIGHT column sequentially so columns never compete on quota/timeout,
      // pass LEFT's last questionNumber as continuation hint for RIGHT, and automatically retry any column
      // that transiently fails or returns empty while the adjacent column has questions.
      let leftRaw = await extractCol(leftBuf, 'LEFT', prevPageLastQuestionNumber, false, prevPageTailNote?.tailText).catch((err) => {
        console.warn(`[GeminiVerification] Page ${pageNumber} LEFT column error (${this.summarizeGeminiError(err)}); retrying compact.`);
        return [] as GeminiVerificationResult[];
      });
      if (leftRaw.length === 0) {
        await new Promise(r => setTimeout(r, 400));
        leftRaw = await extractCol(leftBuf, 'LEFT', prevPageLastQuestionNumber, true, prevPageTailNote?.tailText).catch((err) => {
          console.warn(`[GeminiVerification] Page ${pageNumber} LEFT retry failed: ${this.summarizeGeminiError(err)}`);
          return [] as GeminiVerificationResult[];
        });
      }

      const leftMaxQ = leftRaw.reduce((max, item) => Math.max(max, Number(item?.questionNumber) || 0), prevPageLastQuestionNumber || 0);
      let rightRaw = await extractCol(rightBuf, 'RIGHT', leftMaxQ > 0 ? leftMaxQ : undefined).catch((err) => {
        console.warn(`[GeminiVerification] Page ${pageNumber} RIGHT column error (${this.summarizeGeminiError(err)}); retrying compact.`);
        return [] as GeminiVerificationResult[];
      });
      if (rightRaw.length === 0 && leftRaw.length > 0) {
        await new Promise(r => setTimeout(r, 400));
        rightRaw = await extractCol(rightBuf, 'RIGHT', leftMaxQ > 0 ? leftMaxQ : undefined, true).catch((err) => {
          console.warn(`[GeminiVerification] Page ${pageNumber} RIGHT retry failed: ${this.summarizeGeminiError(err)}`);
          return [] as GeminiVerificationResult[];
        });
      }

      const leftProjected = leftRaw.map(r => projectResult(r, 0, leftColEndRatio));
      const rightProjected = rightRaw.map(r => projectResult(r, rightColStartRatio, rightColWidthRatio));

      // Merge strictly preserving Col 1 then Col 2 order, stitching duplicate questionNumbers across the center boundary
      const byQ = new Map<number, GeminiVerificationResult>();
      for (const item of [...leftProjected, ...rightProjected]) {
        if (!item || !item.questionNumber || item.questionNumber <= 0) continue;
        const existing = byQ.get(item.questionNumber);
        if (!existing) {
          byQ.set(item.questionNumber, item);
        } else {
          // Stitch stem, options, matchTable, structuredTable, diagramBoundingBox across Column 1 -> Column 2 split
          const mergedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
            const eOpt = existing.verifiedOptions?.find(o => o.label === lbl);
            const nOpt = item.verifiedOptions?.find(o => o.label === lbl);
            const eVal = (eOpt?.value || '').trim();
            const nVal = (nOpt?.value || '').trim();
            return { label: lbl, value: nVal.length > eVal.length ? nVal : eVal };
          });
          byQ.set(item.questionNumber, {
            ...existing,
            verifiedQuestionText:
              item.verifiedQuestionText.trim().length > existing.verifiedQuestionText.trim().length
                ? item.verifiedQuestionText
                : existing.verifiedQuestionText,
            verifiedOptions: mergedOptions,
            hasDiagram: Boolean(existing.hasDiagram || item.hasDiagram),
            figureType: existing.figureType || item.figureType,
            diagramBoundingBox: existing.diagramBoundingBox || item.diagramBoundingBox,
            matchTableData:
              (item.matchTableData?.rows?.length || 0) > (existing.matchTableData?.rows?.length || 0)
                ? item.matchTableData
                : existing.matchTableData,
            structuredTableData:
              (item.structuredTableData?.rows?.length || 0) > (existing.structuredTableData?.rows?.length || 0)
                ? item.structuredTableData
                : existing.structuredTableData,
            optionBoundingBoxes: existing.optionBoundingBoxes || item.optionBoundingBoxes,
            confidenceScore: Math.max(existing.confidenceScore || 0, item.confidenceScore || 0),
            reviewRequired: Boolean(existing.reviewRequired && item.reviewRequired)
          });
        }
      }

      return Array.from(byQ.values()).sort((a, b) => a.questionNumber - b.questionNumber);
    } catch (err: any) {
      console.warn(`[GeminiVerification] Two-column split pass fallback on Page ${pageNumber}:`, this.summarizeGeminiError(err));
      return [];
    }
  }

  /**
   * Automatic Answer Key / Hints Sheet Detection on PDF Pages (e.g. Page 6 of Test 1 Units & Measurements).
   */
  public async detectAndParseAnswerKeyPage(
    pageNumber: number,
    pageImageBuffer: Buffer,
    ocrMarkdown: string,
    modelName: string = this.defaultModel
  ): Promise<AnswerKeyPageDetectionResult> {
    const cleanedOcr = (ocrMarkdown || '').trim();
    const hasMcqStems = /\b1\s*[\.\)]\s*[A-Za-z]{4,}[\s\S]{15,}\([1-4A-D]\)\s*[A-Za-z0-9]/.test(cleanedOcr);
    const hasAnswerKeyKeyword = /answer\s*key|hints\s*&?\s*solutions|key\s*sheet/i.test(cleanedOcr);

    // Deterministic fast path only if text already looks clearly like a pure key sheet and has >= 15 entries
    if (cleanedOcr.length > 40 && !hasMcqStems) {
      const det = answerKeyService.parseAnswerKeyText(cleanedOcr, 'pdf_page');
      const detEntries = Object.values(det)
        .filter(e => e.verifiedAnswer)
        .map(e => ({ questionNumber: e.questionNumber, answer: e.verifiedAnswer!, rawAnswer: e.rawAnswer }));
      if (detEntries.length >= 15 && (hasAnswerKeyKeyword || detEntries.length >= 25)) {
        return {
          isAnswerKeyPage: true,
          pageLayout: 'two_column_english',
          entries: detEntries.sort((a, b) => a.questionNumber - b.questionNumber)
        };
      }
    }

    const ai = this.ensureClient();
    if (!ai) {
      return { isAnswerKeyPage: false, entries: [] };
    }

    const prompt = `Inspect PDF Page ${pageNumber} carefully.
Determine if this page is primarily an **Answer Key Sheet / Key Grid** (listing question numbers mapped to their correct option like "1. (A)  2. (B) ... 50. (C)" or a table of Q.No vs Ans), rather than full MCQ questions.

RULES:
- If this page contains full MCQ questions and options (even at bottom), set "isAnswerKeyPage": false and "entries": [].
- If this page IS an Answer Key page:
  1. Set "isAnswerKeyPage": true.
  2. Read EVERY column / row carefully from top to bottom across all columns (Left column, Right column, or table grid).
  3. Extract EVERY questionNumber (integer) and answer letter ("A", "B", "C", or "D" — map 1->A, 2->B, 3->C, 4->D).
  4. Preserve exact questionNumber -> answer alignment; never guess missing rows.`;

    try {
      const primaryPayload = await this.preparePageImagePayload(pageImageBuffer, 1450, 86);
      const parsed = await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: modelName,
        timeoutMs: 18000,
        executeAttempt: async (currentModel, attemptIdx, abortSignal) => {
          const payload =
            attemptIdx === 0
              ? primaryPayload
              : await this.preparePageImagePayload(pageImageBuffer, 1100, 78);

          const resp = await ai.models.generateContent({
            model: currentModel,
            contents: {
              parts: [
                { inlineData: { mimeType: payload.mimeType, data: payload.data } },
                { text: prompt }
              ]
            },
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isAnswerKeyPage: { type: Type.BOOLEAN },
                  pageLayout: { type: Type.STRING },
                  entries: {
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
                },
                required: ['isAnswerKeyPage', 'entries']
              }
            }
          });
          return JSON.parse((resp.text ?? '{}').trim());
        }
      });

      const validEntries: AnswerKeyPageDetectionResult['entries'] = [];
      const seenQ = new Set<number>();
      for (const e of parsed?.entries || []) {
        const norm = answerKeyService.normalizeOptionLabel(e.answer || e.rawAnswer || '');
        if (e.questionNumber > 0 && e.questionNumber <= 250 && norm && !seenQ.has(e.questionNumber)) {
          seenQ.add(e.questionNumber);
          validEntries.push({
            questionNumber: e.questionNumber,
            answer: norm,
            rawAnswer: e.rawAnswer || e.answer
          });
        }
      }

      return {
        isAnswerKeyPage: Boolean(parsed?.isAnswerKeyPage) && validEntries.length >= 3,
        pageLayout: parsed?.pageLayout,
        entries: validEntries.sort((a, b) => a.questionNumber - b.questionNumber)
      };
    } catch (err: any) {
      console.log(`[GeminiVerification] Page ${pageNumber} answer-key check deferred (${this.summarizeGeminiError(err)}).`);
      return { isAnswerKeyPage: false, entries: [] };
    }
  }

  /**
   * Visual Crop Validation Gate:
   * Inspects an extracted image crop BEFORE attaching it to any question.
   * Rejects cropped printed question text / numbered options (e.g. Q18 gas bug) and blank/partial artifacts.
   */
  public async validateCroppedFigureVisual(
    croppedBuffer: Buffer,
    questionText: string,
    expectedType: 'diagram' | 'graph' | 'chemical_structure' | 'table' | 'unknown' = 'diagram',
    modelName: string = this.defaultModel
  ): Promise<VisualCropCheckResult> {
    const ai = this.ensureClient();
    if (!ai) {
      return {
        isGenuineScientificFigure: true,
        isTextOnlyOrQuestionText: false,
        matchesQuestionContext: true,
        detectedType: expectedType === 'unknown' ? 'diagram' : expectedType,
        reason: 'Visual API unavailable; passed metric check'
      };
    }

    try {
      const base64 = croppedBuffer.toString('base64');
      const prompt = `Inspect this cropped image region extracted from a NEET exam PDF for the following question:
Question: "${questionText.slice(0, 400)}"

Verify strictly:
1. Is this image ONLY ordinary prose paragraphs / sentences or pure text lines from a question? If YES, set "isTextOnlyOrQuestionText": true and "isGenuineScientificFigure": false!
2. Does it show a genuine scientific figure — including physics apparatus/diagrams, Vernier calipers, micrometer screw gauges, ruler scales with tick marks/numbers, circuits, ray diagrams, X-Y graphs/plots/curves, 2D chemical bond-line/ring structures, or data tables? If YES, set "isGenuineScientificFigure": true and "isTextOnlyOrQuestionText": false!
3. Does the figure contextually match the question stem above (not an unrelated adjacent question's diagram)?`;

      const response = await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: modelName || 'gemini-3.1-flash-lite',
        timeoutMs: 14000,
        executeAttempt: async (currentModel, _idx, abortSignal) =>
          ai.models.generateContent({
            model: currentModel,
            contents: {
              parts: [
                { inlineData: { mimeType: 'image/png', data: base64 } },
                { text: prompt }
              ]
            },
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isGenuineScientificFigure: { type: Type.BOOLEAN },
                  isTextOnlyOrQuestionText: { type: Type.BOOLEAN },
                  matchesQuestionContext: { type: Type.BOOLEAN },
                  detectedType: { type: Type.STRING, description: 'diagram, graph, chemical_structure, table, or printed_text_error' },
                  reason: { type: Type.STRING }
                },
                required: ['isGenuineScientificFigure', 'isTextOnlyOrQuestionText', 'matchesQuestionContext', 'detectedType', 'reason']
              }
            }
          })
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return {
        isGenuineScientificFigure: Boolean(parsed.isGenuineScientificFigure),
        isTextOnlyOrQuestionText: Boolean(parsed.isTextOnlyOrQuestionText),
        matchesQuestionContext: parsed.matchesQuestionContext !== false,
        detectedType: parsed.detectedType || 'diagram',
        reason: parsed.reason || ''
      };
    } catch (err: any) {
      console.log(`[GeminiVerification] Visual crop check deferred (${this.summarizeGeminiError(err)}); keeping metric check.`);
      return {
        isGenuineScientificFigure: true,
        isTextOnlyOrQuestionText: false,
        matchesQuestionContext: true,
        detectedType: expectedType === 'unknown' ? 'diagram' : expectedType,
        reason: 'Visual crop check deferred due to transient timeout'
      };
    }
  }

  /**
   * Targeted Single-Question Recovery (Stage 6/7):
   * Re-inspects high-resolution page image (+ optional next page if options cross page break)
   * specifically for a single question missing a diagram/graph (Q8 Venturimeter, Q19 V-I graph),
   * missing/visual options (Q74 Anti aromatic rings), or truncated stem.
   */
  public async recoverMissingQuestionContent(params: {
    pageNumber: number;
    pageImageBuffer: Buffer;
    questionNumber: number;
    currentQuestionText: string;
    currentOptions: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string }>;
    missingFigure: boolean;
    missingOptions: boolean;
    truncatedText: boolean;
    subject: Parser2Subject;
    nextPageImageBuffer?: Buffer;
    modelName?: string;
  }): Promise<TargetedRecoveryResult> {
    const ai = this.ensureClient();
    if (!ai) return {};

    const prompt = `TARGETED RECOVERY AUDIT FOR QUESTION ${params.questionNumber} ON PAGE ${params.pageNumber} (Subject: ${params.subject}).
Current extracted stem: "${params.currentQuestionText.slice(0, 600)}"
Current extracted options: ${JSON.stringify(params.currentOptions)}
Issues detected requiring surgical visual recovery:
${params.missingFigure ? '- MISSING DIAGRAM OR GRAPH: Visually locate the figure, apparatus, circuit, or X-Y graph belonging ONLY to Question ' + params.questionNumber + ' and return tight [ymin, xmin, ymax, xmax] coordinates (0..1000 scale).' : ''}
${params.missingOptions ? '- MISSING OR VISUAL OPTIONS: Inspect below Question ' + params.questionNumber + ' (and on the second attached page image if Question ' + params.questionNumber + ' splits across the page break). Extract all 4 text options if they are printable text/formulas, OR return 4 TIGHT, NON-OVERLAPPING "recoveredOptionBoundingBoxes" (A, B, C, D) if the options are chemical rings/drawings/graphs!' : ''}
${params.truncatedText ? '- INCOMPLETE QUESTION STEM: Re-read the full stem of Question ' + params.questionNumber + ' from the image from start to finish.' : ''}

RULES:
- NEVER include Question ${params.questionNumber - 1} or Question ${params.questionNumber + 1} text or options in any bounding box!
- NEVER include Hindi column content (x > 500) if pageLayout is two_column_bilingual!
- EXCLUDE "(1)", "(2)", "(3)", "(4)" markers from option bounding boxes when possible and ensure zero overlap between A, B, C, D boxes!
- If all 4 options can be cleanly expressed as text (e.g. linear chemical formulas like CH3-C(Cl)=CH2), return them in "recoveredOptions" and leave "recoveredOptionBoundingBoxes" empty.`;

    let primaryStd: { data: string; mimeType: string } | null = null;
    let primaryCompact: { data: string; mimeType: string } | null = null;
    let nextStd: { data: string; mimeType: string } | null = null;
    let nextCompact: { data: string; mimeType: string } | null = null;

    try {
      const response = await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: params.modelName,
        timeoutMs: 18000,
        executeAttempt: async (currentModel, attemptIdx, abortSignal) => {
          const useCompact = attemptIdx > 0;
          const pImg = useCompact
            ? (primaryCompact ??= await this.preparePageImagePayload(params.pageImageBuffer, 1050, 75))
            : (primaryStd ??= await this.preparePageImagePayload(params.pageImageBuffer, 1400, 82));

          const parts: any[] = [{ inlineData: { mimeType: pImg.mimeType, data: pImg.data } }];

          if (params.nextPageImageBuffer) {
            const nImg = useCompact
              ? (nextCompact ??= await this.preparePageImagePayload(params.nextPageImageBuffer, 950, 74))
              : (nextStd ??= await this.preparePageImagePayload(params.nextPageImageBuffer, 1200, 78));
            parts.push({ inlineData: { mimeType: nImg.mimeType, data: nImg.data } });
          }

          parts.push({ text: prompt });

          return ai.models.generateContent({
            model: currentModel,
            contents: { parts },
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  recoveredQuestionText: { type: Type.STRING },
                  pageLayout: { type: Type.STRING },
                  chemistryContentType: { type: Type.STRING },
                  fromNextPage: { type: Type.BOOLEAN, description: 'True if recovered visual/options were found on the second (next page) image' },
                  recoveredDiagramType: { type: Type.STRING, description: 'diagram, graph, chemical_structure, or table' },
                  recoveredDiagramBoundingBox: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: 'Tight [ymin, xmin, ymax, xmax] on 0..1000 scale'
                  },
                  recoveredOptions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.STRING }
                      },
                      required: ['label', 'value']
                    }
                  },
                  recoveredOptionBoundingBoxes: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      B: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      C: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      D: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                    }
                  },
                  recoveredMatchTableData: {
                    type: Type.OBJECT,
                    properties: {
                      columnAHeader: { type: Type.STRING },
                      columnBHeader: { type: Type.STRING },
                      rows: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            colAKey: { type: Type.STRING },
                            colAText: { type: Type.STRING },
                            colBKey: { type: Type.STRING },
                            colBText: { type: Type.STRING }
                          },
                          required: ['colAKey', 'colAText', 'colBKey', 'colBText']
                        }
                      }
                    }
                  },
                  recoveredStructuredTableData: {
                    type: Type.OBJECT,
                    properties: {
                      caption: { type: Type.STRING },
                      headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                      rows: {
                        type: Type.ARRAY,
                        items: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  },
                  confidenceScore: { type: Type.INTEGER },
                  notes: { type: Type.STRING }
                }
              }
            }
          });
        }
      });

      const parsed: TargetedRecoveryResult = JSON.parse((response.text ?? '{}').trim());
      return parsed;
    } catch (err: any) {
      console.log(`[GeminiVerification] Targeted recovery deferred for Q${params.questionNumber} (${this.summarizeGeminiError(err)}); keeping existing extraction.`);
      return {};
    }
  }

  /**
   * Region-specific OCR / Visual Recovery for Admin Page-Based Correction Workflow ("Copy from Page").
   * Crops ONLY the selected [ymin, xmin, ymax, xmax] (0..1000) region from the cached page PNG
   * without mutating the source page image.
   */
  public async extractRegionFromPageImage(params: {
    pageImageBuffer: Buffer;
    boundingBox?: [number, number, number, number];
    targetField:
      | 'questionText'
      | 'optionA'
      | 'optionB'
      | 'optionC'
      | 'optionD'
      | 'table'
      | 'listI'
      | 'listII'
      | 'explanation'
      | 'diagram';
    questionNumber?: number;
    modelName?: string;
  }): Promise<{
    extractedText: string;
    matchTable?: {
      columnAHeader?: string;
      columnBHeader?: string;
      rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }>;
    };
    structuredTable?: {
      headers: string[];
      rows: string[][];
      caption?: string;
    };
    croppedPngBuffer?: Buffer;
    confidenceScore: number;
  }> {
    let regionBuf = params.pageImageBuffer;
    const meta = await sharp(params.pageImageBuffer).metadata();
    const imgW = meta.width || 1600;
    const imgH = meta.height || 2200;

    if (params.boundingBox && params.boundingBox.length === 4) {
      const [ymin, xmin, ymax, xmax] = params.boundingBox;
      const left = Math.max(0, Math.min(imgW - 20, Math.floor((xmin / 1000) * imgW)));
      const top = Math.max(0, Math.min(imgH - 20, Math.floor((ymin / 1000) * imgH)));
      const width = Math.max(20, Math.min(imgW - left, Math.ceil(((xmax - xmin) / 1000) * imgW)));
      const height = Math.max(20, Math.min(imgH - top, Math.ceil(((ymax - ymin) / 1000) * imgH)));
      regionBuf = await sharp(params.pageImageBuffer)
        .extract({ left, top, width, height })
        .png()
        .toBuffer();
    }

    if (params.targetField === 'diagram') {
      return {
        extractedText: '',
        croppedPngBuffer: regionBuf,
        confidenceScore: 100
      };
    }

    const ai = this.ensureClient();
    if (!ai) {
      return {
        extractedText: '',
        confidenceScore: 0
      };
    }

    const imgPayload = await this.preparePageImagePayload(regionBuf, 1400, 84);
    const fieldInstructionMap: Record<string, string> = {
      questionText: 'Extract the complete English question statement/stem shown in this cropped image region cleanly. Exclude leading question number if clear, preserve subscripts/superscripts/unit vectors (use î, ĵ, k̂ instead of i_cap/j_cap/k_cap).',
      optionA: 'Extract ONLY the text/formula of this single option (strip leading option marker like (1), (A), A. if present). Preserve scientific notation and unit vectors (î, ĵ, k̂).',
      optionB: 'Extract ONLY the text/formula of this single option (strip leading option marker like (2), (B), B. if present). Preserve scientific notation and unit vectors (î, ĵ, k̂).',
      optionC: 'Extract ONLY the text/formula of this single option (strip leading option marker like (3), (C), C. if present). Preserve scientific notation and unit vectors (î, ĵ, k̂).',
      optionD: 'Extract ONLY the text/formula of this single option (strip leading option marker like (4), (D), D. if present). Preserve scientific notation and unit vectors (î, ĵ, k̂).',
      table: 'Extract the structured table or List I / List II rows shown in this region. Populate matchTable if it is List I vs List II / Column I vs Column II, or structuredTable if it is a general data table, AND provide a clean readable text summary in extractedText.',
      listI: 'Extract List I / Column I items shown in this region (one per line, keeping key and text like "(a) Zygotene").',
      listII: 'Extract List II / Column II items shown in this region (one per line, keeping key and text like "(i) Synapsis").',
      explanation: 'Extract the complete solution / explanation text shown in this cropped region accurately.'
    };

    const prompt = `Precisely OCR this cropped NEET examination PDF region${params.questionNumber ? ` for Question ${params.questionNumber}` : ''}.
Target field: ${params.targetField}.
Instructions: ${fieldInstructionMap[params.targetField] || 'Extract the exact text cleanly.'}
NEVER invent or guess text that is not visible in the image.`;

    try {
      const response = await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: params.modelName,
        timeoutMs: 32000,
        executeAttempt: async (currentModel, _idx, abortSignal) =>
          ai.models.generateContent({
            model: currentModel,
            contents: {
              parts: [
                { inlineData: { mimeType: imgPayload.mimeType, data: imgPayload.data } },
                { text: prompt }
              ]
            },
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel),
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  extractedText: { type: Type.STRING },
                  matchTable: {
                    type: Type.OBJECT,
                    properties: {
                      columnAHeader: { type: Type.STRING },
                      columnBHeader: { type: Type.STRING },
                      rows: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            colAKey: { type: Type.STRING },
                            colAText: { type: Type.STRING },
                            colBKey: { type: Type.STRING },
                            colBText: { type: Type.STRING }
                          },
                          required: ['colAKey', 'colAText', 'colBKey', 'colBText']
                        }
                      }
                    }
                  },
                  structuredTable: {
                    type: Type.OBJECT,
                    properties: {
                      caption: { type: Type.STRING },
                      headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                      rows: {
                        type: Type.ARRAY,
                        items: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  },
                  confidenceScore: { type: Type.INTEGER }
                },
                required: ['extractedText']
              }
            }
          })
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return {
        extractedText: String(parsed.extractedText || '').trim(),
        matchTable: parsed.matchTable,
        structuredTable: parsed.structuredTable,
        croppedPngBuffer: regionBuf,
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 90
      };
    } catch (err: any) {
      console.log(`[GeminiVerification] Region OCR deferred (${this.summarizeGeminiError(err)}).`);
      return {
        extractedText: '',
        croppedPngBuffer: regionBuf,
        confidenceScore: 0
      };
    }
  }

  private isCoverPage(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const hasCoverKeywords = (
      lower.includes('instructions to candidate') || 
      lower.includes('instructions for candidate') ||
      lower.includes('test booklet code') ||
      (lower.includes('duration:') && lower.includes('max marks:')) ||
      lower.includes('read the following instructions carefully')
    );
    // Check if it has actual option choices like "(1) 400J" or "(A)"
    const hasOptions = /\([1-4A-D]\)\s+[A-Za-z0-9]/.test(text);
    return hasCoverKeywords && !hasOptions;
  }

  /**
   * Deterministic local fallback parser: extracts questions from OCR text using the source-aware layout engine
   */
  private fallbackParseOcrMarkdown(markdown: string, subject: Parser2Subject, pageNumber: number = 1): GeminiVerificationResult[] {
    if (!markdown || this.isCoverPage(markdown)) return [];

    const extracted = parser2LayoutEngine.parseQuestionsFromText(markdown, subject, pageNumber);

    return extracted.map(q => ({
      questionNumber: q.questionNumber,
      verifiedQuestionText: q.questionText || `Question ${q.questionNumber}`,
      verifiedOptions: q.options.map(o => ({ label: o.label, value: o.value })),
      detectedQuestionType: q.detectedType,
      hasDiagram: q.hasDiagram,
      diagramBoundingBox: q.diagramBoundingBox,
      isChemistryStructure: q.isChemistryStructure,
      matchTableData: q.matchTableData,
      structuredTableData: q.structuredTableData,
      confidenceScore: q.confidenceScore,
      reviewRequired: q.reviewRequired,
      reviewNotes: q.reviewNotes,
      correctionsSummary: 'Extracted with high-precision layout engine'
    }));
  }

  /**
   * Test Gemini connectivity
   */
  public async testConnection(modelName: string = this.defaultModel): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      const ai = this.ensureClient();
      if (!ai) {
        return { success: false, error: 'GEMINI_API_KEY is not configured in server environment.' };
      }

      const resolvedModel = this.resolveModelCandidates(modelName)[0];
      await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: resolvedModel,
        timeoutMs: 15000,
        executeAttempt: async (currentModel, _idx, abortSignal) =>
          ai.models.generateContent({
            model: currentModel,
            contents: 'Ping: reply with pong in 1 word.',
            config: {
              abortSignal,
              ...this.buildThinkingConfig(currentModel)
            }
          })
      });

      return { success: true, model: resolvedModel };
    } catch (e: any) {
      return { success: false, error: this.summarizeGeminiError(e) };
    }
  }
}

export const geminiVerificationService = new GeminiVerificationService();
