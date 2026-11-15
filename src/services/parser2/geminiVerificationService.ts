// NCERTify AI Parser 2.0 - Gemini Multimodal Verification Service
// Verifies OCR markdown against high-resolution rendered page images
// Uses @google/genai SDK with configurable model (default: gemini-4-hydrogen)

import sharp from 'sharp';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Parser2Question, Parser2Subject } from './types';
import { parser2LayoutEngine } from './layoutEngine';

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
    // Map legacy alias to active low-latency Gemini 4 Flash model
    const normalized = raw === 'gemini-3.8-flash' ? 'gemini-4-hydrogen' : raw;
    const candidates = [normalized, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private buildThinkingConfig(model: string): { thinkingConfig?: { thinkingLevel: ThinkingLevel } } {
    if (model.includes('flash-lite')) {
      return {};
    }
    if (model.startsWith('gemini-4-') || model.startsWith('gemini-3')) {
      return { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
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
      msg.includes('fetch failed')
    );
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
      const maxTries = i === 0 ? 2 : 1;
      for (let t = 0; t < maxTries; t++) {
        const controller = new AbortController();
        const attemptTimeout = t === 0 ? params.timeoutMs : Math.max(20000, params.timeoutMs - 6000);
        const timer = setTimeout(() => controller.abort(new Error(`Client deadline guard (${attemptTimeout}ms)`)), attemptTimeout);
        try {
          const result = await params.executeAttempt(model, i + t, controller.signal);
          clearTimeout(timer);
          return result;
        } catch (err: any) {
          clearTimeout(timer);
          lastError = err;
          const msg = String(err?.message || err || '');
          // If model doesn't exist (404), skip straight to next fallback model
          if (msg.includes('404') || msg.includes('NOT_FOUND')) {
            break;
          }
          if (!this.isRetriableError(err)) {
            throw err;
          }
          if (t + 1 < maxTries || i + 1 < models.length) {
            await new Promise(r => setTimeout(r, 700 * (t + 1)));
          }
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

COVER / INSTRUCTIONS PAGE HANDLING:
- If this page is a Cover Page, Title Page, or contains only General Instructions ("Instructions to Candidates", "3 Hours Duration", "Max Marks: 720") without questions, return [].
- Never extract instruction rules as questions.

PAGE LAYOUT DETECTION:
- Identify "pageLayout":
  * "two_column_bilingual": English questions on left half (~x: 30..490), Hindi translation on right half (~x: 510..970).
  * "two_column_english": English questions printed in two side-by-side columns with no Hindi column.
  * "single_column": Full-width single-column English questions.

STRICT VERIFICATION GUIDELINES:
1. OPTION EXTRACTION (ZERO TOLERANCE ON MISSING OR PLACEHOLDER OPTIONS):
   - NEVER output placeholder strings like "Option (A)", "Option B", "[Missing Option Text]", or "(Empty)".
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
   - Never start mid-sentence; capture full stem from beginning including sub-statements (A)-(E), Assertion (A) / Reason (R), or Statements I & II.
   - Preserve chemistry reaction arrows (→, ⇌, Δ), charges (+, −), subscripts/superscripts, fractions, roots (√), Greek letters (Δ, λ, ω, θ, σ, μ₀, ε₀), dimensions ("[M⁻³ L⁻² T⁻² A⁻⁴]"), and inverse trig ("tan⁻¹(...)").
   - NEVER leave raw "$" LaTeX delimiters or raw commands like "\\frac", "\\hat", "\\vec", "i_cap", "j_cap", or "k_cap"! Convert vectors and symbols directly to clean Unicode: "î", "ĵ", "k̂", "F⃗", "3î + 4ĵ", "×", "±", "≤", "≥", "√".
   - For Match-the-Column / List I vs List II questions: keep ONLY the introductory instruction in "verifiedQuestionText" and YOU MUST populate structured "matchTableData" with ALL rows from List I / Column I and List II / Column II (including Roman numerals i, ii, iii, iv). Never mark a match question complete without "matchTableData"!
   - For Table-based questions: populate "structuredTableData" with exact column "headers" and all data "rows". If a complex table cannot be transcribed cleanly, also provide "diagramBoundingBox" with "figureType": "table" as visual fallback.

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
        timeoutMs: 44000,
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

          const jsonStr = (response.text ?? '[]').trim();
          const results: GeminiVerificationResult[] = JSON.parse(jsonStr);
          return results;
        }
      });
    } catch (e: any) {
      console.log(`[GeminiVerification] Page ${pageNumber}: Gemini verification deferred (${this.summarizeGeminiError(e)}). Continuing with OCR extraction fallback.`);
      return this.fallbackParseOcrMarkdown(ocrMarkdown, subject, pageNumber);
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
1. Is this image ONLY ordinary printed text lines / sentences / numbered options like "(1) ...", "(4) ...", or paragraphs from a question? If YES, set "isTextOnlyOrQuestionText": true and "isGenuineScientificFigure": false!
2. Does it actually show a genuine non-text scientific figure (physics apparatus/diagram, circuit, ray diagram, X-Y graph/plot/curve, or 2D chemical bond-line/ring structure, or structured table)?
3. Does the figure contextually match the question stem above (not an unrelated adjacent question's diagram)?`;

      const response = await this.runWithDeadlineAndFallback({
        ai,
        preferredModel: modelName || 'gemini-3.1-flash-lite',
        timeoutMs: 22000,
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
        timeoutMs: 36000,
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
