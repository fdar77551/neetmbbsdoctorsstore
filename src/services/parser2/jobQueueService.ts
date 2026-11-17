// NCERTify AI Parser 2.0 - Asynchronous Job Queue & Pipeline Orchestrator
// Coordinates Mistral OCR, Gemini Multimodal Verification, Figure Extraction, and Validation

import fs from 'fs';
import path from 'path';
import { 
  Parser2Job, 
  Parser2Page, 
  Parser2Question, 
  Parser2Figure, 
  Parser2Subject, 
  Parser2Settings,
  Parser2ComponentValidation,
  Parser2AnswerKeyEntry,
  Parser2CropType,
  isPlaceholderOption
} from './types';
import { 
  parser2LayoutEngine, 
  detectVisualRequirement, 
  isAllSimpleChemicalFormulaOptions, 
  isQuestionTextTruncated,
  isMatchQuestionPrompt,
  isTableQuestionPrompt,
  parseMatchTableFromText,
  parseStructuredTableFromText,
  formatSourcePageRange
} from './layoutEngine';
import { 
  getParser2Jobs,
  getParser2JobById, 
  saveParser2Job, 
  saveParser2Page, 
  getParser2Pages, 
  saveParser2Questions,
  upsertParser2Questions,
  getParser2Questions, 
  saveParser2Figures,
  upsertParser2Figures,
  getParser2Figures, 
  saveParser2ValidationReport,
  addParser2Log,
  saveParser2AnswerKeys,
  getParser2AnswerKeys,
  getParser2Settings,
  getParser2SourceFiles,
  updateParser2Question,
  verifyJobQuestionsPersisted
} from './parser2Db';
import { mistralOcrService } from './mistralOcrService';
import { geminiVerificationService } from './geminiVerificationService';
import { figureExtractionService, CropLayoutMode } from './figureExtractionService';
import { validationEngine } from './validationEngine';
import { uploadParser2Asset, getParser2AssetBuffer } from './parser2R2Storage';
import { answerKeyService, AnswerKeyMatchResult } from './answerKeyService';
import { formatScientificMathAndPowers, cleanQuestionTextForMatchTable, hasSuspiciousMathNotation } from '../../lib/mockTestData';

// Active running job workers map (in-memory lock)
const activeJobs = new Map<string, { abortController: AbortController; isRunning: boolean }>();

export const ACTIVE_PARSER_JOB_STATUSES = new Set([
  'uploaded',
  'queued',
  'uploading',
  'extracting',
  'processing',
  'ocr_in_progress',
  'question_detection',
  'question_extraction',
  'structuring',
  'figure_extraction',
  'validation',
  'verifying',
  'saving'
]);

export function evaluateStrictQuestionStatus(params: {
  questionType?: Parser2Question['questionType'];
  questionText: string;
  options: Parser2Question['options'];
  optionFigures?: { [label: string]: string };
  figureUrl?: string;
  matchTable?: Parser2Question['matchTable'];
  structuredTable?: Parser2Question['structuredTable'];
  reviewNotes?: string;
  confidenceScore: number;
  baseReviewRequired?: boolean;
  figureMismatchDetected?: boolean;
}): {
  verificationStatus: Parser2Question['verificationStatus'];
  reviewRequired: boolean;
  confidenceScore: number;
  reviewNotes: string;
  componentValidation: Parser2ComponentValidation;
} {
  let rawNotes = (params.reviewNotes || '').trim();
  let confidenceScore = params.confidenceScore ?? 90;
  if (confidenceScore > 0 && confidenceScore <= 1) {
    confidenceScore = Math.round(confidenceScore * 100);
  }

  const optionsTextJoined = (params.options || []).map(o => o.value || o.text || '').join(' ');
  const visualReq = detectVisualRequirement(params.questionText, optionsTextJoined, rawNotes);

  const hasMissingOptions =
    !params.options ||
    params.options.length < 4 ||
    params.options.some(o => {
      const hasOptImg = Boolean(o.imageUrl || params.optionFigures?.[o.label]);
      if (hasOptImg) return false;
      const val = (o.value || o.text || '').trim();
      return !val || isPlaceholderOption(val) || /^\[Figure\s+[A-D]\]$/i.test(val);
    });

  const allOptionsHaveImages =
    (params.options || []).length >= 4 &&
    (params.options || []).every(o => Boolean(o.imageUrl || params.optionFigures?.[o.label]));

  const hasTruncatedStem = isQuestionTextTruncated(params.questionText);
  const hasMissingFigure =
    (visualReq.needsFigure || params.questionType === 'diagram_based') &&
    !params.figureUrl &&
    !(allOptionsHaveImages && (visualReq.expectsVisualOptions || !visualReq.needsFigure));

  const isMatchType = params.questionType === 'match_the_column' || isMatchQuestionPrompt(params.questionText);
  const missingMatchTable =
    isMatchType &&
    !params.figureUrl &&
    (!params.matchTable || !params.matchTable.rows || params.matchTable.rows.length < 2);

  const isTableType = !isMatchType && (params.questionType === 'table_based' || isTableQuestionPrompt(params.questionText));
  const missingStructuredTable =
    isTableType &&
    !params.figureUrl &&
    (!params.structuredTable || !params.structuredTable.rows || params.structuredTable.rows.length === 0);

  const stemMath = hasSuspiciousMathNotation(params.questionText || '');
  const optMathHit = (params.options || []).find(o => hasSuspiciousMathNotation(o.value || o.text || '').suspect);
  const mathNote = stemMath.suspect
    ? stemMath.reason
    : optMathHit
    ? hasSuspiciousMathNotation(optMathHit.value || optMathHit.text || '').reason
    : undefined;

  const missingOptCount = (params.options || []).filter(o => {
    const hasOptImg = Boolean(o.imageUrl || params.optionFigures?.[o.label]);
    if (hasOptImg) return false;
    const val = (o.value || o.text || '').trim();
    return !val || isPlaceholderOption(val) || /^\[Figure\s+[A-D]\]$/i.test(val);
  }).length;

  const componentValidation: Parser2ComponentValidation = {
    questionText: {
      status: hasTruncatedStem ? 'incomplete' : 'ok',
      score: hasTruncatedStem ? 35 : Math.min(100, confidenceScore),
      reason: hasTruncatedStem ? 'Statement appears truncated or starts mid-sentence.' : undefined
    },
    options: {
      status: hasMissingOptions ? (missingOptCount >= 4 ? 'missing' : 'incomplete') : 'ok',
      score: hasMissingOptions ? Math.max(0, 100 - missingOptCount * 25) : 98,
      reason: hasMissingOptions ? `${missingOptCount} option(s) missing or placeholder.` : undefined
    },
    tables: {
      status: !isMatchType && !isTableType
        ? 'not_applicable'
        : missingMatchTable || missingStructuredTable
        ? 'incomplete'
        : 'ok',
      score: !isMatchType && !isTableType
        ? 100
        : missingMatchTable || missingStructuredTable
        ? 25
        : 95,
      reason: missingMatchTable
        ? 'Missing List I / List II match rows.'
        : missingStructuredTable
        ? 'Missing structured data table rows.'
        : undefined
    },
    equations: {
      status: mathNote ? 'review_needed' : 'ok',
      score: mathNote ? 55 : 98,
      reason: mathNote
    },
    diagrams: {
      status: params.figureMismatchDetected
        ? 'incomplete'
        : hasMissingFigure
        ? 'missing'
        : visualReq.needsFigure || params.figureUrl
        ? 'ok'
        : 'not_applicable',
      score: params.figureMismatchDetected ? 40 : hasMissingFigure ? 20 : 96,
      reason: params.figureMismatchDetected
        ? 'Auto-cropped image did not match figure criteria.'
        : hasMissingFigure
        ? visualReq.reason || 'Referenced diagram or graph not attached.'
        : undefined
    }
  };

  // Strip stale warning segments once the underlying component has resolved cleanly
  const noteSegments = rawNotes
    .split(/\s*•\s*|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(seg => {
      const low = seg.toLowerCase();
      if (!missingMatchTable && !missingStructuredTable && /(?:missing\s+(?:list\s*i|list\s*ii|structured\s*table)|list\s*ii\s+table\s+rows|table\s+is\s+missing)/i.test(low)) {
        return false;
      }
      if (!hasMissingOptions && /(?:options\s+are\s+missing|missing\s+or\s+empty;\s*verify\s+options|insufficient\s+data)/i.test(low)) {
        return false;
      }
      if (!hasMissingFigure && !params.figureMismatchDetected && /(?:figure\s+is\s+missing|diagram\s+is\s+missing|graph\s+that\s+is\s+not\s+attached|did\s+not\s+match\s+question\s+context)/i.test(low)) {
        return false;
      }
      if (!hasTruncatedStem && /(?:statement\s+appears\s+truncated|starts\s+mid-sentence)/i.test(low)) {
        return false;
      }
      return true;
    });
  const reviewNotes = noteSegments.join(' • ');

  if (hasMissingOptions) {
    return {
      verificationStatus: 'options_incomplete',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 25),
      reviewNotes: reviewNotes.includes('options')
        ? reviewNotes
        : [reviewNotes, 'One or more options are missing or empty; verify options before publishing.'].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (missingMatchTable || missingStructuredTable) {
    const msg = missingMatchTable
      ? 'Match-the-Column question is missing List I / List II table rows.'
      : 'Table-based question is missing structured table data.';
    return {
      verificationStatus: 'table_incomplete',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 30),
      reviewNotes: reviewNotes.includes('List I') || reviewNotes.includes('table')
        ? reviewNotes
        : [reviewNotes, msg].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (hasTruncatedStem) {
    return {
      verificationStatus: 'text_incomplete',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 40),
      reviewNotes: reviewNotes.includes('incomplete') || reviewNotes.includes('truncated')
        ? reviewNotes
        : [reviewNotes, 'Question statement appears truncated or starts mid-sentence.'].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (params.figureMismatchDetected) {
    return {
      verificationStatus: 'figure_mismatch',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 50),
      reviewNotes: reviewNotes.includes('mismatch')
        ? reviewNotes
        : [reviewNotes, 'Extracted crop did not match question context or appeared to be text; rejected automatically.'].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (hasMissingFigure) {
    return {
      verificationStatus: 'missing_figure',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 60),
      reviewNotes: reviewNotes.includes('figure') || reviewNotes.includes('graph') || reviewNotes.includes('diagram')
        ? reviewNotes
        : [reviewNotes, visualReq.reason || 'Question references a figure, graph, or diagram that is not attached.'].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (mathNote) {
    return {
      verificationStatus: 'symbol_review',
      reviewRequired: true,
      confidenceScore: Math.min(confidenceScore, 60),
      reviewNotes: [reviewNotes, mathNote].filter(Boolean).join(' • '),
      componentValidation
    };
  }

  if (params.baseReviewRequired || confidenceScore < 75) {
    return {
      verificationStatus: 'needs_review',
      reviewRequired: true,
      confidenceScore,
      reviewNotes: reviewNotes || 'Low extraction confidence; inspect against source PDF.',
      componentValidation
    };
  }

  return {
    verificationStatus: 'verified',
    reviewRequired: false,
    confidenceScore,
    reviewNotes,
    componentValidation
  };
}

export class JobQueueService {

  /**
   * Boot-time and Periodic Reconciliation / Job Recovery Daemon
   * Scans database for any jobs left in 'processing' or 'queued' state and resumes workers.
   */
  public async initJobRecovery(): Promise<void> {
    console.log('[JobQueue] Initializing Persistent Job Recovery Daemon...');
    await this.reconcilePendingJobs();
    setInterval(() => {
      this.reconcilePendingJobs().catch(e => console.warn('[JobQueue] Recovery daemon cycle error:', e.message));
    }, 30000);
  }

  public async reconcilePendingJobs(): Promise<void> {
    try {
      const jobs = await getParser2Jobs();
      for (const job of jobs) {
        if (ACTIVE_PARSER_JOB_STATUSES.has(job.status) && !activeJobs.has(job.id)) {
          console.log(`[JobQueue] Auto-recovering interrupted job ${job.id} ("${job.testName}", status: ${job.status})...`);
          await addParser2Log(job.id, 'ocr', `System auto-recovery: Resuming background pipeline from last saved page checkpoint.`, 'info');
          this.startJob(job.id).catch(err => {
            console.error(`[JobQueue] Failed to auto-resume job ${job.id}:`, err);
          });
        }
      }
    } catch (err: any) {
      console.warn('[JobQueue] Error during job reconciliation:', err.message);
    }
  }

  /**
   * Apply pasted text or uploaded image answer key to an existing job without losing manual edits or inventing keys
   */
  public async applyAnswerKeyToJob(
    jobId: string,
    input: {
      rawText?: string;
      imageBase64?: string;
      mimeType?: string;
      pdfBuffer?: Buffer;
      entries?: Array<{
        questionNumber: number;
        verifiedAnswer: string;
        setCode?: string;
        sourcePage?: number;
        confidence?: number;
        explanation?: string;
      }>;
      setCode?: string;
      overwriteManual?: boolean;
      replaceAll?: boolean;
    }
  ): Promise<AnswerKeyMatchResult> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error('Job not found');

    let incomingKeys: Record<number, Parser2AnswerKeyEntry> = {};
    let incomingSolutions: Record<number, { answer?: 'A' | 'B' | 'C' | 'D'; explanation: string }> = {};
    const now = new Date().toISOString();

    if (input.pdfBuffer) {
      const pdfRes = await answerKeyService.parseAnswerKeyPdf(input.pdfBuffer, { setCode: input.setCode });
      incomingKeys = { ...incomingKeys, ...pdfRes.keys };
    }
    if (input.imageBase64) {
      const imgKeys = await answerKeyService.parseAnswerKeyImage(input.imageBase64, input.mimeType);
      for (const [kStr, v] of Object.entries(imgKeys)) {
        incomingKeys[Number(kStr)] = {
          ...v,
          setCode: input.setCode || v.setCode,
          confidence: v.confidence ?? 92
        };
      }
    }
    if (input.rawText && input.rawText.trim()) {
      const txtKeys = answerKeyService.parseAnswerKeyText(input.rawText, 'text_paste');
      const sols = answerKeyService.parseSolutionsDocument(input.rawText);
      for (const [kStr, v] of Object.entries(txtKeys)) {
        incomingKeys[Number(kStr)] = {
          ...v,
          setCode: input.setCode || v.setCode,
          confidence: v.confidence ?? 98
        };
      }
      incomingSolutions = { ...incomingSolutions, ...sols };
    }
    if (Array.isArray(input.entries)) {
      for (const e of input.entries) {
        const norm = answerKeyService.normalizeOptionLabel(e.verifiedAnswer || '');
        if (e.questionNumber > 0 && norm) {
          incomingKeys[e.questionNumber] = {
            questionNumber: e.questionNumber,
            rawAnswer: e.verifiedAnswer,
            verifiedAnswer: norm,
            setCode: e.setCode || input.setCode,
            sourcePage: e.sourcePage,
            confidence: e.confidence ?? 100,
            explanation: e.explanation,
            sourceType: 'manual',
            matchedAt: now
          };
        }
      }
    }

    const existingKeys = input.replaceAll ? {} : await getParser2AnswerKeys(jobId);
    const mergedKeys = { ...existingKeys, ...incomingKeys };
    await saveParser2AnswerKeys(jobId, mergedKeys);

    const questions = await getParser2Questions(jobId);
    const result = answerKeyService.applyKeysAndSolutionsToQuestions(
      questions,
      mergedKeys,
      incomingSolutions,
      { overwriteManual: input.overwriteManual ?? false, markMissingUnmatched: true }
    );

    if (questions.length > 0) {
      await saveParser2Questions(jobId, questions);
    }

    const expectedCount = job.questionRange ? this.parseExpectedCount(job.questionRange) : (questions.length || 180);
    const report = validationEngine.auditQuestions(jobId, questions, expectedCount);
    await saveParser2ValidationReport(report);

    await saveParser2Job({
      ...job,
      hasAnswerKey: Object.keys(mergedKeys).length > 0,
      qualityScore: report.qualityScore,
      reconciliation: report.reconciliation,
      qualityBreakdown: report.qualityBreakdown,
      verifiedQuestions: questions.filter(q => q.verificationStatus === 'verified').length,
      reviewRequiredCount: questions.filter(q => q.reviewRequired).length,
      manuallyEditedCount: questions.filter(q => q.isManuallyEdited).length,
      lastActivityAt: now
    });

    await addParser2Log(
      jobId,
      'validation',
      `Answer key applied: ${result.matchedCount} matched, ${result.missingQuestions.length} missing key, ${result.conflictCount} conflicts, ${result.skippedManualCount} manual edit(s) preserved.`,
      result.matchedCount > 0 ? 'success' : 'warn'
    );

    return result;
  }

  /**
   * Auto-detect answer key entries from pages already inside the job's current PDF (returns preview or applies).
   */
  public async detectAnswerKeyFromCurrentPdf(
    jobId: string,
    options?: { apply?: boolean; overwriteManual?: boolean; setCode?: string }
  ): Promise<{
    detectedCount: number;
    keyPages: number[];
    entries: Parser2AnswerKeyEntry[];
    comparison: ReturnType<typeof answerKeyService.buildAnswerKeyComparison>;
    applied: boolean;
  }> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error('Job not found');
    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer) throw new Error('Source questions.pdf not found in job storage.');

    const pages = await getParser2Pages(jobId);
    const totalPages = job.totalPages || pages.length || (await this.getPdfPageCount(pdfBuffer));
    const settings = await getParser2Settings();
    const dpi = Math.max(180, settings.figureDpi || 200);
    const geminiModel = job.geminiModel || settings.geminiModel || 'gemini-4-hydrogen';

    // Prioritize explicit key pages & trailing pages, then scan all pages if needed
    const pageOrder: number[] = [];
    for (let p = totalPages; p >= 1; p--) pageOrder.push(p);
    pageOrder.sort((a, b) => {
      const pA = pages.find(x => x.pageNumber === a);
      const pB = pages.find(x => x.pageNumber === b);
      const aHint = /answer\s*key|hints|key\s*sheet/i.test(pA?.ocrMarkdown || '') ? 1 : 0;
      const bHint = /answer\s*key|hints|key\s*sheet/i.test(pB?.ocrMarkdown || '') ? 1 : 0;
      if (bHint !== aHint) return bHint - aHint;
      return b - a;
    });

    const detectedMap: Record<number, Parser2AnswerKeyEntry> = {};
    const keyPages: number[] = [];
    const now = new Date().toISOString();

    for (const pNum of pageOrder) {
      const pageRec = pages.find(x => x.pageNumber === pNum);
      let pageText = pageRec?.ocrMarkdown || '';
      if (!pageText) {
        try {
          pageText = await figureExtractionService.extractPdfPageText(pdfBuffer, pNum);
        } catch {}
      }

      const mentionsKey = /answer\s*key|hints\s*&?\s*solutions|key\s*sheet/i.test(pageText);
      const isTrailing = pNum >= Math.max(1, totalPages - 2);
      const isSparse = (pageRec?.extractedQuestionNumbers?.length || 0) <= 2;

      if (!mentionsKey && !isTrailing && !isSparse) continue;

      const textOnlyKeys = answerKeyService.parseAnswerKeyText(pageText, 'pdf_page');
      const hasQuestionStems = /\b\d{1,3}\s*[\.\)]\s*[A-Za-z]{6,}[\s\S]{15,}\([1-4A-D]\)/.test(pageText);

      if (Object.keys(textOnlyKeys).length >= 15 && !hasQuestionStems) {
        keyPages.push(pNum);
        for (const [kStr, e] of Object.entries(textOnlyKeys)) {
          detectedMap[Number(kStr)] = {
            ...e,
            sourcePage: pNum,
            setCode: options?.setCode || e.setCode,
            confidence: 97,
            matchedAt: now
          };
        }
        continue;
      }

      if (geminiVerificationService.isConfigured()) {
        try {
          const buf = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pNum, dpi);
          const detect = await geminiVerificationService.detectAndParseAnswerKeyPage(pNum, buf, pageText, geminiModel);
          if (detect.isAnswerKeyPage && detect.entries.length > 0) {
            keyPages.push(pNum);
            for (const item of detect.entries) {
              detectedMap[item.questionNumber] = {
                questionNumber: item.questionNumber,
                rawAnswer: item.rawAnswer || item.answer,
                verifiedAnswer: item.answer,
                sourcePage: pNum,
                setCode: options?.setCode,
                confidence: 95,
                sourceType: 'pdf_page',
                matchedAt: now
              };
            }
          }
        } catch {}
      }
    }

    const questions = await getParser2Questions(jobId);
    const existingKeys = await getParser2AnswerKeys(jobId);
    const previewKeys = { ...existingKeys, ...detectedMap };

    if (options?.apply && Object.keys(detectedMap).length > 0) {
      await this.applyAnswerKeyToJob(jobId, {
        entries: Object.values(detectedMap).map(e => ({
          questionNumber: e.questionNumber,
          verifiedAnswer: e.verifiedAnswer,
          setCode: e.setCode,
          sourcePage: e.sourcePage,
          confidence: e.confidence
        })),
        overwriteManual: options.overwriteManual ?? false,
        setCode: options.setCode
      });
    }

    const refreshedQuestions = options?.apply ? await getParser2Questions(jobId) : questions;
    const finalKeys = options?.apply ? await getParser2AnswerKeys(jobId) : previewKeys;
    const comparison = answerKeyService.buildAnswerKeyComparison(refreshedQuestions, finalKeys);

    return {
      detectedCount: Object.keys(detectedMap).length,
      keyPages: Array.from(new Set(keyPages)).sort((a, b) => a - b),
      entries: Object.values(detectedMap).sort((a, b) => a.questionNumber - b.questionNumber),
      comparison,
      applied: Boolean(options?.apply && Object.keys(detectedMap).length > 0)
    };
  }

  /**
   * Remove / reset all answer keys for a job cleanly
   */
  public async clearAnswerKeysForJob(jobId: string): Promise<{ clearedCount: number }> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error('Job not found');
    const existingKeys = await getParser2AnswerKeys(jobId);
    const clearedCount = Object.keys(existingKeys).length;
    await saveParser2AnswerKeys(jobId, {});

    const questions = await getParser2Questions(jobId);
    for (const q of questions) {
      const isManualAns = q.isManuallyEdited && q.editedFields?.includes('correctAnswer');
      q.importedAnswer = undefined;
      q.answerSourcePage = undefined;
      q.answerConfidence = undefined;
      if (!isManualAns) {
        q.correctAnswer = undefined;
        q.answerStatus = 'answer_missing';
        q.answerKeyStatus = 'missing';
      }
    }
    if (questions.length > 0) {
      await saveParser2Questions(jobId, questions);
    }

    const expectedCount = job.questionRange ? this.parseExpectedCount(job.questionRange) : (questions.length || 180);
    const report = validationEngine.auditQuestions(jobId, questions, expectedCount);
    await saveParser2ValidationReport(report);
    await saveParser2Job({
      ...job,
      hasAnswerKey: false,
      qualityScore: report.qualityScore,
      reconciliation: report.reconciliation,
      qualityBreakdown: report.qualityBreakdown,
      lastActivityAt: new Date().toISOString()
    });
    await addParser2Log(jobId, 'validation', `Cleared ${clearedCount} answer key entry(ies).`, 'info');
    return { clearedCount };
  }

  /**
   * Start or resume processing for a job in the background
   */
  public async startJob(jobId: string): Promise<boolean> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (activeJobs.has(jobId) && activeJobs.get(jobId)?.isRunning) {
      console.log(`[JobQueue] Job ${jobId} is already running.`);
      return true;
    }

    const abortController = new AbortController();
    activeJobs.set(jobId, { abortController, isRunning: true });

    job.status = 'processing';
    job.currentStage = 'Initializing PDF pipeline';
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);
    await addParser2Log(jobId, 'ocr', `Started processing job "${job.testName}" (Subject: ${job.subject})`, 'info');

    this.runJobPipeline(jobId, abortController.signal).catch(async (err) => {
      console.error(`[JobQueue] Error running job ${jobId}:`, err);
      const j = await getParser2JobById(jobId);
      if (j && j.status !== 'paused') {
        j.status = 'failed';
        j.currentStage = 'Failed';
        j.errorMessage = err.message;
        j.lastActivityAt = new Date().toISOString();
        await saveParser2Job(j);
        await addParser2Log(jobId, 'ocr', `Job execution failed: ${err.message}`, 'error');
      }
    }).finally(() => {
      activeJobs.delete(jobId);
    });

    return true;
  }

  /**
   * Pause a running job
   */
  public async pauseJob(jobId: string): Promise<boolean> {
    const active = activeJobs.get(jobId);
    if (active) {
      active.abortController.abort();
      activeJobs.delete(jobId);
    }

    const job = await getParser2JobById(jobId);
    if (job) {
      job.status = 'paused';
      await saveParser2Job(job);
      await addParser2Log(jobId, 'ocr', 'Job execution paused by admin.', 'warn');
    }
    return true;
  }

  /**
   * Retry failed pages only
   */
  public async retryFailedPages(jobId: string): Promise<boolean> {
    const pages = await getParser2Pages(jobId);
    const failedPages = pages.filter(p => p.status === 'failed');

    for (const p of failedPages) {
      p.status = 'pending';
      p.errorMessage = undefined;
      await saveParser2Page(p);
    }

    await addParser2Log(jobId, 'ocr', `Reset ${failedPages.length} failed pages for retry.`, 'info');
    return this.startJob(jobId);
  }

  /**
   * Targeted single-question AI auto-recrop & option recovery (invoked from Admin UI)
   */
  /**
   * Targeted single-question AI auto-recrop & option recovery (invoked from Admin UI & Crop Editor).
   * Supports previewOnly mode for the Crop Editor so the user can review/resize the box before saving.
   */
  public async reprocessSingleQuestionVisuals(
    jobId: string,
    questionId: string,
    targetOptionOrOptions?:
      | 'A'
      | 'B'
      | 'C'
      | 'D'
      | { targetOption?: 'A' | 'B' | 'C' | 'D'; previewOnly?: boolean; activePage?: number }
  ): Promise<Parser2Question & {
    previewSuggestion?: {
      suggestedPageNumber: number;
      suggestedBoundingBox?: [number, number, number, number];
      suggestedCropType?: Parser2CropType;
      note?: string;
    };
  }> {
    const opts =
      typeof targetOptionOrOptions === 'string'
        ? { targetOption: targetOptionOrOptions }
        : (targetOptionOrOptions || {});
    const targetOption = opts.targetOption;

    const job = await getParser2JobById(jobId);
    if (!job) throw new Error('Job not found');

    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) throw new Error('Question not found');

    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer) throw new Error('Source PDF not found');

    const settings = await getParser2Settings();
    const dpi = Math.max(200, settings.figureDpi || 200);
    const pageNum = opts.activePage || q.sourcePageNumber || 1;
    const totalPages = job.totalPages || 1;
    const pageImageBuffer = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pageNum, dpi);

    const needsNextPageInspect =
      Boolean(opts.previewOnly) ||
      Boolean(targetOption) ||
      q.verificationStatus === 'options_incomplete' ||
      q.verificationStatus === 'text_incomplete';

    const nextCandidatePage =
      q.sourcePageEnd && q.sourcePageEnd !== pageNum
        ? q.sourcePageEnd
        : pageNum < totalPages
        ? pageNum + 1
        : undefined;

    let nextPageImageBuffer: Buffer | undefined;
    if (needsNextPageInspect && nextCandidatePage && nextCandidatePage >= 1 && nextCandidatePage <= totalPages) {
      try {
        nextPageImageBuffer = await figureExtractionService.renderPdfPageToPng(pdfBuffer, nextCandidatePage, dpi);
      } catch {}
    }

    const recovery = await geminiVerificationService.recoverMissingQuestionContent({
      pageNumber: pageNum,
      pageImageBuffer,
      questionNumber: q.questionNumber,
      currentQuestionText: q.questionText,
      currentOptions: (q.options || []).map(o => ({ label: o.label, value: o.value || o.text || '' })),
      missingFigure: !targetOption,
      missingOptions: Boolean(targetOption) || q.verificationStatus === 'options_incomplete',
      truncatedText: q.verificationStatus === 'text_incomplete',
      subject: q.subject || job.subject,
      nextPageImageBuffer,
      modelName: job.geminiModel || settings.geminiModel || 'gemini-4-hydrogen'
    });

    const layoutMode: CropLayoutMode = recovery.pageLayout || q.pageLayout || 'two_column_bilingual';
    const targetImgBuf = recovery.fromNextPage && nextPageImageBuffer ? nextPageImageBuffer : pageImageBuffer;
    const targetImgPageNum =
      recovery.fromNextPage && nextPageImageBuffer && nextCandidatePage ? nextCandidatePage : pageNum;

    if (opts.previewOnly) {
      const boxFromOption =
        targetOption && recovery.recoveredOptionBoundingBoxes?.[targetOption]
          ? recovery.recoveredOptionBoundingBoxes[targetOption]
          : undefined;
      const suggestedBox = boxFromOption || recovery.recoveredDiagramBoundingBox;
      const suggestedCropType: Parser2CropType = targetOption
        ? (`option_${targetOption}` as Parser2CropType)
        : ((recovery.recoveredDiagramType as Parser2CropType) || 'diagram');
      return {
        ...q,
        previewSuggestion: {
          suggestedPageNumber: targetImgPageNum,
          suggestedBoundingBox: suggestedBox,
          suggestedCropType,
          note: recovery.notes || (suggestedBox ? `Located on Page ${targetImgPageNum}` : 'No clear figure box detected on current/next page')
        }
      };
    }

    let updatedQuestionText = q.questionText;
    if (recovery.recoveredQuestionText && recovery.recoveredQuestionText.trim().length > q.questionText.length) {
      updatedQuestionText = formatScientificMathAndPowers(recovery.recoveredQuestionText.trim());
    }

    let updatedFigureUrl = q.figureUrl;
    let updatedFigures = [...(q.figures || [])];
    let updatedOptionFigures = { ...(q.optionFigures || {}) };
    let updatedOptions = [...(q.options || [])];
    let figureMismatchDetected = false;

    const allFigures = await getParser2Figures(jobId);

    // Handle recovered primary diagram / graph
    if (!targetOption && recovery.recoveredDiagramBoundingBox && recovery.recoveredDiagramBoundingBox.length === 4) {
      const validated = await this.validateAndCropPrimaryFigure({
        jobId,
        pageNumber: targetImgPageNum,
        questionNumber: q.questionNumber,
        questionText: updatedQuestionText,
        pageImageBuffer: targetImgBuf,
        boundingBox: recovery.recoveredDiagramBoundingBox,
        figureType: (recovery.recoveredDiagramType as any) || 'diagram',
        layoutMode,
        modelName: job.geminiModel || settings.geminiModel
      });

      if (validated.figureRecord) {
        updatedFigureUrl = validated.figureRecord.figureUrl;
        updatedFigures = [validated.figureRecord, ...updatedFigures.filter(f => f.id !== validated.figureRecord?.id)];
        allFigures.push(validated.figureRecord);
      } else if (validated.mismatchRejected) {
        figureMismatchDetected = true;
      }
    }

    // Handle recovered text or visual options
    if (recovery.recoveredOptions && recovery.recoveredOptions.length > 0) {
      for (const ro of recovery.recoveredOptions) {
        if (!ro.value || isPlaceholderOption(ro.value)) continue;
        const formatted = formatScientificMathAndPowers(ro.value.trim());
        const idx = updatedOptions.findIndex(o => o.label === ro.label);
        if (idx >= 0 && (!updatedOptions[idx].value || isPlaceholderOption(updatedOptions[idx].value))) {
          updatedOptions[idx] = { ...updatedOptions[idx], text: formatted, value: formatted };
        }
      }
    }

    const useSimpleTextOnly = isAllSimpleChemicalFormulaOptions(updatedOptions);
    if (!useSimpleTextOnly && recovery.recoveredOptionBoundingBoxes) {
      const boxCheck = figureExtractionService.validateOptionBoundingBoxes(recovery.recoveredOptionBoundingBoxes, layoutMode);
      const keysToCrop = targetOption ? ([targetOption] as const) : (['A', 'B', 'C', 'D'] as const);
      for (const lbl of keysToCrop) {
        const box = boxCheck.validBoxes[lbl];
        if (!box) continue;
        const optFig = await this.cropOptionFigureSafe({
          jobId,
          pageNumber: targetImgPageNum,
          questionNumber: q.questionNumber,
          optionLabel: lbl,
          pageImageBuffer: targetImgBuf,
          boundingBox: box,
          layoutMode
        });
        if (optFig) {
          updatedOptionFigures[lbl] = optFig.figureUrl;
          allFigures.push(optFig);
          const idx = updatedOptions.findIndex(o => o.label === lbl);
          if (idx >= 0) {
            const curVal = updatedOptions[idx].value || '';
            updatedOptions[idx] = {
              ...updatedOptions[idx],
              imageUrl: optFig.figureUrl,
              isVisualOption: true,
              value: curVal || `[Figure ${lbl}]`,
              text: curVal || `[Figure ${lbl}]`
            };
          }
        }
      }
    }

    const pageMeta = formatSourcePageRange(
      [...(q.sourcePages || [q.sourcePageNumber]), targetImgPageNum],
      q.sourcePageNumber
    );

    const strictStatus = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: updatedQuestionText,
      options: updatedOptions,
      optionFigures: updatedOptionFigures,
      figureUrl: updatedFigureUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: recovery.notes || q.reviewNotes,
      confidenceScore: recovery.confidenceScore || q.confidenceScore,
      figureMismatchDetected
    });

    const updated = await updateParser2Question(jobId, questionId, {
      questionText: updatedQuestionText,
      options: updatedOptions,
      sourcePageNumber: pageMeta.startPage,
      sourcePageEnd: pageMeta.endPage,
      sourcePages: pageMeta.sourcePages,
      sourcePageRange: pageMeta.label,
      figureUrl: updatedFigureUrl,
      originalFigureUrl: q.originalFigureUrl || updatedFigureUrl,
      figures: updatedFigures,
      optionFigures: Object.keys(updatedOptionFigures).length > 0 ? updatedOptionFigures : undefined,
      originalOptionFigures: q.originalOptionFigures || (Object.keys(updatedOptionFigures).length > 0 ? updatedOptionFigures : undefined),
      verificationStatus: strictStatus.verificationStatus,
      reviewRequired: strictStatus.reviewRequired,
      confidenceScore: strictStatus.confidenceScore,
      reviewNotes: strictStatus.reviewNotes,
      componentValidation: strictStatus.componentValidation
    });

    await saveParser2Figures(jobId, allFigures);

    const refreshed = await getParser2Questions(jobId);
    const report = validationEngine.auditQuestions(jobId, refreshed, job.totalQuestions || refreshed.length || 180);
    await saveParser2ValidationReport(report);
    job.figureCount = allFigures.length;
    job.verifiedQuestions = refreshed.filter(item => item.verificationStatus === 'verified').length;
    job.reviewRequiredCount = refreshed.filter(item => item.reviewRequired).length;
    await saveParser2Job(job);

    return updated || q;
  }

  /**
   * Main Pipeline Execution Engine
   */
  private async runJobPipeline(jobId: string, signal: AbortSignal): Promise<void> {
    const job = await getParser2JobById(jobId);
    if (!job) return;

    const settings = await getParser2Settings();

    // 1. Load Question PDF buffer from storage
    job.status = 'extracting';
    job.currentStage = 'Reading PDF pages & metadata';
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);

    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer) {
      throw new Error('questions.pdf not found in job storage.');
    }

    // 2. Count total pages if not already determined
    const existingPages = await getParser2Pages(jobId);
    let totalPages = job.totalPages;

    if (existingPages.length === 0 || totalPages === 0) {
      totalPages = await this.getPdfPageCount(pdfBuffer);
      job.totalPages = totalPages;
      await saveParser2Job(job);

      for (let p = 1; p <= totalPages; p++) {
        const pageRecord: Parser2Page = {
          id: `page-${jobId}-${p}`,
          jobId,
          pageNumber: p,
          status: 'pending',
          updatedAt: new Date().toISOString()
        };
        await saveParser2Page(pageRecord);
      }
      await addParser2Log(jobId, 'upload', `Detected ${totalPages} pages in question PDF. Initialized page queue.`, 'info');
    }

    // 3. Process Solution PDF if present
    const sourceFiles = await getParser2SourceFiles(jobId);
    const hasSolutionFile = sourceFiles.some(f => f.fileType === 'solution_pdf');
    if (hasSolutionFile) {
      const solutionPdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'solutions.pdf');
      if (solutionPdfBuffer) {
        await addParser2Log(jobId, 'ocr', 'Found attached solutions PDF. Parsing solutions & answer key...', 'info');
        try {
          await this.processSolutionPdf(jobId, solutionPdfBuffer);
        } catch (solErr: any) {
          await addParser2Log(jobId, 'ocr', `Note on solutions PDF parse: ${solErr.message}`, 'warn');
        }
      }
    }

    // 4. Batch Processing Loop with Exponential Backoff & Checkpoints
    const allPages = await getParser2Pages(jobId);
    const pendingPages = allPages.filter(p => p.status === 'pending' || p.status === 'processing');

    const batchSize = Math.max(1, settings.ocrBatchSize || 4);
    const maxPageRetries = Math.max(1, Math.min(3, settings.retryCount ?? 2));

    for (let i = 0; i < pendingPages.length; i += batchSize) {
      if (signal.aborted) {
        console.log(`[JobQueue] Job ${jobId} aborted.`);
        return;
      }

      const batch = pendingPages.slice(i, i + batchSize);

      for (const page of batch) {
        if (signal.aborted) return;
        job.status = 'ocr_in_progress';
        job.currentStage = `OCR & Question Detection: Page ${page.pageNumber} / ${totalPages}`;
        job.lastActivityAt = new Date().toISOString();
        await saveParser2Job(job);

        let attempt = 0;
        let succeeded = false;
        let lastPageErr: any = null;

        while (attempt < maxPageRetries && !succeeded && !signal.aborted) {
          try {
            if (attempt > 0) {
              const backoffMs = Math.min(8000, 1200 * Math.pow(2, attempt - 1));
              job.retryCount = (job.retryCount || 0) + 1;
              await addParser2Log(jobId, 'ocr', `Retrying page ${page.pageNumber} (attempt ${attempt + 1}/${maxPageRetries}) after ${backoffMs}ms...`, 'warn');
              await new Promise(r => setTimeout(r, backoffMs));
            }
            await this.processSinglePage(jobId, page, pdfBuffer, job.subject, settings, totalPages, signal);
            // Check if processSinglePage caught an error internally and marked failed
            const updatedP = (await getParser2Pages(jobId)).find(p => p.pageNumber === page.pageNumber);
            if (updatedP?.status === 'completed') {
              succeeded = true;
            } else {
              attempt++;
              lastPageErr = new Error(updatedP?.errorMessage || 'Page extraction failed');
            }
          } catch (pageErr: any) {
            attempt++;
            lastPageErr = pageErr;
            console.error(`[JobQueue] Attempt ${attempt} failure on page ${page.pageNumber}:`, pageErr);
          }
        }

        if (!succeeded && !signal.aborted) {
          page.status = 'failed';
          page.errorMessage = lastPageErr?.message || 'Page failed after retries';
          await saveParser2Page(page);
          await addParser2Log(jobId, 'ocr', `Page ${page.pageNumber} failed after ${maxPageRetries} attempt(s): ${page.errorMessage}`, 'error');
        }

        if (!signal.aborted) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Checkpoint Update Job Counters & Reconciliation Preview
      const updatedPages = await getParser2Pages(jobId);
      const completed = updatedPages.filter(p => p.status === 'completed').length;
      const failed = updatedPages.filter(p => p.status === 'failed').length;

      const currentQuestions = await getParser2Questions(jobId);
      const currentFigures = await getParser2Figures(jobId);

      job.status = 'structuring';
      job.currentStage = `Checkpoint: ${completed}/${totalPages} pages parsed (${currentQuestions.length} Qs saved)`;
      job.completedPages = completed;
      job.failedPages = failed;
      job.totalQuestions = currentQuestions.length;
      job.questionsDetected = Math.max(job.questionsDetected || 0, currentQuestions.length);
      job.questionsSaved = currentQuestions.length;
      job.figureCount = currentFigures.length;
      job.verifiedQuestions = currentQuestions.filter(q => q.verificationStatus === 'verified').length;
      job.reviewRequiredCount = currentQuestions.filter(q => q.reviewRequired).length;
      job.manuallyEditedCount = currentQuestions.filter(q => q.isManuallyEdited).length;
      job.estimatedCostUsd = Number(((completed * settings.estimatedCostPerPageCent) / 100).toFixed(4));
      job.lastActivityAt = new Date().toISOString();

      await saveParser2Job(job);
    }

    // 4a. Cross-page continuation stitching for incomplete questions at page boundaries
    if (!signal.aborted) {
      await this.stitchCrossPageContinuations(jobId, pdfBuffer, job.subject, settings, totalPages);
    }

    // 4b. Apply any pre-uploaded / stored answer keys & mark missing answers honestly
    job.status = 'validation';
    job.currentStage = 'Matching Answer Keys & Running Quality Audit';
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);

    let finalQuestions = await getParser2Questions(jobId);
    const storedKeys = await getParser2AnswerKeys(jobId);
    if (Object.keys(storedKeys).length > 0 && finalQuestions.length > 0) {
      answerKeyService.applyKeysAndSolutionsToQuestions(finalQuestions, storedKeys, {}, {
        overwriteManual: false,
        markMissingUnmatched: true
      });
      await saveParser2Questions(jobId, finalQuestions);
      finalQuestions = await getParser2Questions(jobId);
    } else if (finalQuestions.length > 0) {
      let dirtyMissing = false;
      for (const q of finalQuestions) {
        if (!q.correctAnswer && q.answerStatus !== 'answer_missing') {
          q.answerStatus = 'answer_missing';
          dirtyMissing = true;
        }
      }
      if (dirtyMissing) {
        await saveParser2Questions(jobId, finalQuestions);
      }
    }

    // 5. Saving & Final Verification Gate before marking completed/review_required
    job.status = 'saving';
    job.currentStage = 'Verifying Database Persistence & Running Quality Audit';
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);

    const expectedCount = job.questionRange ? this.parseExpectedCount(job.questionRange) : (finalQuestions.length || 180);
    const report = validationEngine.auditQuestions(jobId, finalQuestions, expectedCount);
    await saveParser2ValidationReport(report);

    const persistenceVerify = await verifyJobQuestionsPersisted(jobId, finalQuestions.length);

    const updatedPagesFinal = await getParser2Pages(jobId);
    const completedFinal = updatedPagesFinal.filter(p => p.status === 'completed').length;
    const failedFinal = updatedPagesFinal.filter(p => p.status === 'failed').length;
    const currentFigsFinal = await getParser2Figures(jobId);

    const needsReviewFinal = report.criticalErrorsCount > 0 || finalQuestions.some(q => q.reviewRequired);
    job.completedPages = completedFinal;
    job.failedPages = failedFinal;
    job.totalQuestions = finalQuestions.length;
    job.questionsDetected = Math.max(job.questionsDetected || 0, finalQuestions.length);
    job.questionsSaved = persistenceVerify.savedCount;
    job.savedVerified = persistenceVerify.verified;
    job.figureCount = currentFigsFinal.length;
    job.verifiedQuestions = finalQuestions.filter(q => q.verificationStatus === 'verified').length;
    job.reviewRequiredCount = finalQuestions.filter(q => q.reviewRequired).length;
    job.manuallyEditedCount = finalQuestions.filter(q => q.isManuallyEdited).length;
    job.hasAnswerKey = Object.keys(storedKeys).length > 0;
    job.qualityScore = report.qualityScore;
    job.reconciliation = report.reconciliation;
    job.qualityBreakdown = report.qualityBreakdown;
    job.status = finalQuestions.length === 0 && failedFinal > 0
      ? 'failed'
      : !persistenceVerify.verified && finalQuestions.length > 0
      ? 'review_required'
      : needsReviewFinal
      ? 'review_required'
      : 'completed';
    job.currentStage = job.status === 'completed'
      ? 'Ready for Admin Review & Publishing'
      : job.status === 'review_required'
      ? (persistenceVerify.verified ? 'Completed with Review Items Flagged' : 'Persistence Warning — Verify Saved Questions')
      : 'Extraction Failed';
    job.lastActivityAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    await saveParser2Job(job);

    await addParser2Log(
      jobId,
      'validation',
      `Pipeline finished (${job.status}). Saved & verified ${persistenceVerify.savedCount} Qs in database. Quality Score: ${report.qualityScore}% (${job.reviewRequiredCount} review flagged, ${job.figureCount} figures).`,
      report.canPublish && persistenceVerify.verified ? 'success' : 'warn'
    );
  }

  /**
   * Process a single page through the complete source-aware pipeline:
   * Render 200 DPI -> Mistral OCR / GS Fallback -> Gemini Vision -> Chem Simple/Complex Filter ->
   * Metric & Visual Crop Gate -> Targeted Recovery for Missing Figure/Options -> Strict 6-Status Assignment
   */
  private async processSinglePage(
    jobId: string,
    page: Parser2Page,
    pdfBuffer: Buffer,
    subject: Parser2Subject,
    settings: Parser2Settings,
    totalPages: number,
    _signal: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();
    page.status = 'processing';
    await saveParser2Page(page);

    const dpi = Math.max(180, settings.figureDpi || 200);
    const geminiModel = settings.geminiModel || 'gemini-4-hydrogen';

    try {
      // Stage 1: Render high-DPI page PNG (cached on disk)
      const pageImageBuffer = await figureExtractionService.renderPdfPageToPng(
        pdfBuffer,
        page.pageNumber,
        dpi
      );

      // Save page image to R2/local storage
      const pageImageResult = await uploadParser2Asset(
        jobId,
        'pages',
        `page-${String(page.pageNumber).padStart(3, '0')}.png`,
        pageImageBuffer,
        'image/png'
      );
      page.pageImageKey = pageImageResult.storageKey;
      page.pageImageUrl = pageImageResult.publicUrl;

      // Stage 2: OCR Extraction (Mistral Primary + Ghostscript Fallback)
      let ocrMarkdown = '';
      if (settings.mistralOcrEnabled && mistralOcrService.isConfigured()) {
        try {
          const base64DataUrl = `data:image/png;base64,${pageImageBuffer.toString('base64')}`;
          const ocrResp = await mistralOcrService.processPageImage(base64DataUrl, true);
          if (ocrResp.pages && ocrResp.pages.length > 0) {
            ocrMarkdown = ocrResp.pages[0].markdown;
          }
        } catch {
          // Gracefully continue to local extraction fallback
        }
      }

      if (!ocrMarkdown || ocrMarkdown.trim().length === 0) {
        try {
          ocrMarkdown = await figureExtractionService.extractPdfPageText(pdfBuffer, page.pageNumber);
        } catch {}
      }

      page.ocrMarkdown = ocrMarkdown;

      // Stage 3: Gemini Multimodal Verification & Parsing + Auto Answer-Key Page Detection
      let verifiedQuestions: any[] = [];
      if (settings.geminiVerificationEnabled && geminiVerificationService.isConfigured()) {
        const preExistingQs = await getParser2Questions(jobId);
        const prevQs = preExistingQs
          .filter(q => q.sourcePageNumber < page.pageNumber)
          .sort((a, b) => b.questionNumber - a.questionNumber);
        const prevLastQ = prevQs[0];
        const prevPageLastQNum = prevLastQ?.questionNumber || undefined;
        const prevPageTailContext = prevLastQ
          ? {
              questionNumber: prevLastQ.questionNumber,
              tailText: prevLastQ.questionText,
              missingOptions: prevLastQ.options?.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value))),
              danglingAnchorOnly: false
            }
          : undefined;

        const isLikelyScannedPage = (ocrMarkdown || '').replace(/@neetmbbsdoctors/gi, '').trim().length < 320;
        const mentionsKeySheet = /answer\s*key|hints\s*&?\s*solutions|key\s*sheet/i.test(ocrMarkdown || '');

        // On the final page(s) or explicit Key Sheets, check for embedded Answer Key Sheet FIRST
        if (mentionsKeySheet || page.pageNumber === totalPages) {
          const keyDetect = await geminiVerificationService.detectAndParseAnswerKeyPage(
            page.pageNumber,
            pageImageBuffer,
            ocrMarkdown || '',
            geminiModel
          );
          if (keyDetect.isAnswerKeyPage && keyDetect.entries.length > 0) {
            const existingKeys = await getParser2AnswerKeys(jobId);
            const nowIso = new Date().toISOString();
            const mergedKeys = { ...existingKeys };
            for (const entry of keyDetect.entries) {
              mergedKeys[entry.questionNumber] = {
                questionNumber: entry.questionNumber,
                rawAnswer: entry.rawAnswer || entry.answer,
                verifiedAnswer: entry.answer,
                sourceType: 'pdf_page',
                matchedAt: nowIso
              };
            }
            await saveParser2AnswerKeys(jobId, mergedKeys);

            const currentQuestions = await getParser2Questions(jobId);
            if (currentQuestions.length > 0) {
              answerKeyService.applyKeysAndSolutionsToQuestions(currentQuestions, mergedKeys, {}, {
                overwriteManual: false,
                markMissingUnmatched: false
              });
              await saveParser2Questions(jobId, currentQuestions);
            }

            page.status = 'completed';
            page.processingTimeMs = Date.now() - startTime;
            page.extractedQuestionNumbers = [];
            await saveParser2Page(page);
            await addParser2Log(
              jobId,
              'validation',
              `Auto-detected Answer Key on Page ${page.pageNumber} (${keyDetect.entries.length} keys extracted and saved in ${page.processingTimeMs}ms).`,
              'success'
            );
            return;
          }
        }

        if (isLikelyScannedPage && page.pageNumber < totalPages) {
          // Direct High-Res Two-Column English Split Pass for scanned image pages: avoids wasted whole-page call + doubles per-character DPI
          verifiedQuestions = await geminiVerificationService.verifyTwoColumnEnglishPage(
            page.pageNumber,
            pageImageBuffer,
            ocrMarkdown || `Page ${page.pageNumber}`,
            subject,
            geminiModel,
            prevPageTailContext || prevPageLastQNum
          );
          if (verifiedQuestions.length === 0) {
            verifiedQuestions = await geminiVerificationService.verifyPageQuestions(
              page.pageNumber,
              pageImageBuffer,
              ocrMarkdown || `Page ${page.pageNumber}`,
              subject,
              geminiModel
            );
          } else {
            page.pageLayout = 'two_column_english';
          }
        } else {
          const tVerifyStart = Date.now();
          verifiedQuestions = await geminiVerificationService.verifyPageQuestions(
            page.pageNumber,
            pageImageBuffer,
            ocrMarkdown || `Page ${page.pageNumber}`,
            subject,
            geminiModel
          );
          const verifyMs = Date.now() - tVerifyStart;

          // Fallback answer-key check if sparse page returned <= 1 question near end
          if (!mentionsKeySheet && verifiedQuestions.length <= 1 && (page.pageNumber >= totalPages - 1 || totalPages <= 2)) {
            const keyDetect = await geminiVerificationService.detectAndParseAnswerKeyPage(
              page.pageNumber,
              pageImageBuffer,
              ocrMarkdown || '',
              geminiModel
            );
            if (keyDetect.isAnswerKeyPage && keyDetect.entries.length > 0) {
              const existingKeys = await getParser2AnswerKeys(jobId);
              const nowIso = new Date().toISOString();
              const mergedKeys = { ...existingKeys };
              for (const entry of keyDetect.entries) {
                mergedKeys[entry.questionNumber] = {
                  questionNumber: entry.questionNumber,
                  rawAnswer: entry.rawAnswer || entry.answer,
                  verifiedAnswer: entry.answer,
                  sourceType: 'pdf_page',
                  matchedAt: nowIso
                };
              }
              await saveParser2AnswerKeys(jobId, mergedKeys);
              const currentQuestions = await getParser2Questions(jobId);
              if (currentQuestions.length > 0) {
                answerKeyService.applyKeysAndSolutionsToQuestions(currentQuestions, mergedKeys, {}, {
                  overwriteManual: false,
                  markMissingUnmatched: false
                });
                await saveParser2Questions(jobId, currentQuestions);
              }
              page.status = 'completed';
              page.processingTimeMs = Date.now() - startTime;
              page.extractedQuestionNumbers = [];
              await saveParser2Page(page);
              await addParser2Log(
                jobId,
                'validation',
                `Auto-detected Answer Key on Page ${page.pageNumber} (${keyDetect.entries.length} keys extracted and saved in ${page.processingTimeMs}ms).`,
                'success'
              );
              return;
            }
          }

          // High-res Two-Column English Split Pass: run when full-page returned empty OR when options/match-tables/diagrams/sequence have gaps
          const sortedFull = [...verifiedQuestions].sort((a, b) => Number(a.questionNumber) - Number(b.questionNumber));
          const hasMissingOrGap =
            sortedFull.length === 0 ||
            sortedFull.some(
              vq =>
                !vq.verifiedOptions ||
                vq.verifiedOptions.length < 4 ||
                vq.verifiedOptions.some((o: any) => !o?.value || isPlaceholderOption(o.value)) ||
                (isMatchQuestionPrompt(vq.verifiedQuestionText || '') && !vq.matchTableData?.rows?.length) ||
                (isTableQuestionPrompt(vq.verifiedQuestionText || '') && !vq.structuredTableData?.rows?.length && !vq.diagramBoundingBox)
            ) ||
            sortedFull.some(
              (vq: any, idx: number, arr: any[]) =>
                idx > 0 && Number(vq.questionNumber) - Number(arr[idx - 1].questionNumber) > 1
            );
          const isTwoColEnglish =
            !verifiedQuestions.some(vq => vq.pageLayout === 'two_column_bilingual') &&
            hasMissingOrGap;

          if (isTwoColEnglish) {
            const splitQuestions = await geminiVerificationService.verifyTwoColumnEnglishPage(
              page.pageNumber,
              pageImageBuffer,
              ocrMarkdown || `Page ${page.pageNumber}`,
              subject,
              geminiModel,
              prevPageTailContext || prevPageLastQNum
            );
            if (verifyMs > 15000 && splitQuestions.length > 0) {
              await addParser2Log(jobId, 'gemini_verification', `Page ${page.pageNumber} full-page Vision took ${verifyMs}ms; merged ${splitQuestions.length} dual-column questions.`, 'info');
            }

            if (splitQuestions.length > 0) {
              const mergedByNum = new Map<number, any>();
              for (const q of verifiedQuestions) {
                if (q?.questionNumber) mergedByNum.set(Number(q.questionNumber), q);
              }
              for (const sq of splitQuestions) {
                if (!sq?.questionNumber) continue;
                const prev = mergedByNum.get(Number(sq.questionNumber));
                if (!prev) {
                  mergedByNum.set(Number(sq.questionNumber), sq);
                } else {
                  const mergedOpts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
                    const pOpt = prev.verifiedOptions?.find((o: any) => o.label === lbl)?.value?.trim() || '';
                    const sOpt = sq.verifiedOptions?.find((o: any) => o.label === lbl)?.value?.trim() || '';
                    const pValid = pOpt && !isPlaceholderOption(pOpt);
                    const sValid = sOpt && !isPlaceholderOption(sOpt);
                    if (sValid && !pValid) return { label: lbl, value: sOpt };
                    if (pValid && !sValid) return { label: lbl, value: pOpt };
                    return { label: lbl, value: sOpt.length >= pOpt.length ? sOpt : pOpt };
                  });

                  mergedByNum.set(Number(sq.questionNumber), {
                    ...prev,
                    pageLayout: 'two_column_english',
                    verifiedQuestionText:
                      (sq.verifiedQuestionText || '').trim().length > (prev.verifiedQuestionText || '').trim().length
                        ? sq.verifiedQuestionText
                        : prev.verifiedQuestionText,
                    verifiedOptions: mergedOpts,
                    hasDiagram: Boolean(prev.hasDiagram || sq.hasDiagram),
                    figureType: sq.figureType || prev.figureType,
                    diagramBoundingBox: sq.diagramBoundingBox || prev.diagramBoundingBox,
                    matchTableData:
                      (sq.matchTableData?.rows?.length || 0) >= (prev.matchTableData?.rows?.length || 0)
                        ? sq.matchTableData || prev.matchTableData
                        : prev.matchTableData,
                    structuredTableData:
                      (sq.structuredTableData?.rows?.length || 0) >= (prev.structuredTableData?.rows?.length || 0)
                        ? sq.structuredTableData || prev.structuredTableData
                        : prev.structuredTableData,
                    optionBoundingBoxes: sq.optionBoundingBoxes || prev.optionBoundingBoxes,
                    confidenceScore: Math.max(prev.confidenceScore || 0, sq.confidenceScore || 0),
                    reviewRequired: Boolean(prev.reviewRequired && sq.reviewRequired)
                  });
                }
              }
              verifiedQuestions = Array.from(mergedByNum.values()).sort((a, b) => a.questionNumber - b.questionNumber);
              page.pageLayout = 'two_column_english';
            }
          }
        }
      } else {
        const localExtracted = parser2LayoutEngine.parseQuestionsFromText(ocrMarkdown || '', subject, page.pageNumber);
        verifiedQuestions = localExtracted.map(q => ({
          questionNumber: q.questionNumber,
          verifiedQuestionText: q.questionText,
          verifiedOptions: q.options.map(o => ({ label: o.label, value: o.value })),
          detectedQuestionType: q.detectedType,
          hasDiagram: q.hasDiagram,
          diagramBoundingBox: q.diagramBoundingBox,
          isChemistryStructure: q.isChemistryStructure,
          matchTableData: q.matchTableData,
          confidenceScore: q.confidenceScore,
          reviewRequired: q.reviewRequired,
          reviewNotes: q.reviewNotes
        }));
      }

      const pageQuestionsToUpsert: Parser2Question[] = [];
      const pageFiguresToUpsert: Parser2Figure[] = [];
      const existingQuestionsSnapshot = await getParser2Questions(jobId);

      // Lazily load next page buffer ONLY if a question on this page needs cross-page recovery
      let nextPageImageBufferCache: Buffer | undefined;
      let perPageRecoveryCount = 0;

      for (const vq of verifiedQuestions) {
        if (!vq.questionNumber) continue;
        const preQ = existingQuestionsSnapshot.find(q => q.questionNumber === vq.questionNumber);
        if (!vq.verifiedQuestionText && !preQ) continue;
        if (!vq.verifiedQuestionText && preQ) {
          vq.verifiedQuestionText = preQ.questionText;
        }

        const layoutMode: CropLayoutMode = vq.pageLayout || 'two_column_bilingual';
        if (!page.pageLayout && vq.pageLayout) page.pageLayout = vq.pageLayout;

        let cleanedQuestionText = formatScientificMathAndPowers(vq.verifiedQuestionText);
        let figureUrl: string | undefined = undefined;
        let figureRecord: Parser2Figure | undefined = undefined;
        const optionFiguresMap: { [label: string]: string } = {};
        let figureMismatchDetected = false;

        // Stage 4a-pre: Rescue MCQ options accidentally emitted inside structuredTableData (e.g. 2x2 box choices)
        const rescuedFromTable = this.rescueOptionsFromStructuredTable(vq.structuredTableData);
        if (rescuedFromTable.rescuedCount >= 2) {
          const existingMap = new Map<string, string>();
          for (const o of (vq.verifiedOptions || [])) {
            if (o?.label && o?.value && !isPlaceholderOption(o.value)) {
              existingMap.set(String(o.label).toUpperCase(), o.value);
            }
          }
          vq.verifiedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => ({
            label: lbl,
            value: existingMap.get(lbl) || rescuedFromTable.options[lbl] || ''
          }));
          if (rescuedFromTable.wasOptionOnlyTable) {
            vq.structuredTableData = undefined;
          }
        }

        // Stage 4a: Normalize & Format Text Options FIRST (before deciding whether option crops are needed!)
        let normalizedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
          const found = vq.verifiedOptions?.find((o: any) => o.label === lbl);
          let rawVal = (found?.value || '').trim();
          if (isPlaceholderOption(rawVal)) {
            rawVal = '';
          }

          // Anti-Collision Rule: If option accidentally duplicates the question stem, discard it
          if (cleanedQuestionText && rawVal.length > 10) {
            const stemStart = cleanedQuestionText.toLowerCase().slice(0, 25).trim();
            if (stemStart.length >= 10 && rawVal.toLowerCase().includes(stemStart)) {
              rawVal = '';
            }
          }

          if (!rawVal && page.ocrMarkdown) {
            rawVal = this.tryExtractOptionFromOcr(page.ocrMarkdown, vq.questionNumber, lbl);
          }

          const formattedVal = formatScientificMathAndPowers(rawVal);
          return {
            label: lbl,
            text: formattedVal,
            value: formattedVal
          } as Parser2Question['options'][number];
        });

        // Stage 4b: Chemistry Simple-Text vs Complex-Structure Arbitration (fixes Screenshot 3!)
        // If all 4 options are clean simple formulas/text (e.g. CH3-C(Cl)=CH2, CH3-CH(Cl)-CH2Cl), NEVER attach broken option crops!
        const allSimpleFormulaText = isAllSimpleChemicalFormulaOptions(normalizedOptions);
        let chemistryContentType: Parser2Question['chemistryContentType'] = vq.chemistryContentType || 'none';
        if (allSimpleFormulaText) {
          chemistryContentType = subject === 'Chemistry' ? 'simple_text' : chemistryContentType;
        } else if (vq.optionBoundingBoxes && !allSimpleFormulaText) {
          // Validate bounding boxes against overlap / Hindi-column bleed before cropping
          const boxCheck = figureExtractionService.validateOptionBoundingBoxes(vq.optionBoundingBoxes, layoutMode);
          if (boxCheck.reasons.length > 0) {
            await addParser2Log(
              jobId,
              'figure_extraction',
              `Q${vq.questionNumber} option boxes filtered: ${boxCheck.reasons.join('; ')}`,
              'warn'
            );
          }

          for (const optKey of ['A', 'B', 'C', 'D'] as const) {
            const validBox = boxCheck.validBoxes[optKey];
            if (!validBox) continue;

            const optFigRecord = await this.cropOptionFigureSafe({
              jobId,
              pageNumber: page.pageNumber,
              questionNumber: vq.questionNumber,
              optionLabel: optKey,
              pageImageBuffer,
              boundingBox: validBox,
              layoutMode
            });
            if (optFigRecord) {
              optionFiguresMap[optKey] = optFigRecord.figureUrl;
              pageFiguresToUpsert.push(optFigRecord);
            }
          }

          if (Object.keys(optionFiguresMap).length > 0) {
            chemistryContentType = 'complex_structures';
          }
        }

        // Attach valid option figures back onto options array
        normalizedOptions = normalizedOptions.map(opt => {
          const imgUrl = optionFiguresMap[opt.label];
          if (imgUrl) {
            const cleanTxt = opt.value && !/^\[Figure\s+[A-D]\]$/i.test(opt.value) ? opt.value : `[Figure ${opt.label}]`;
            return { ...opt, text: cleanTxt, value: cleanTxt, imageUrl: imgUrl, isVisualOption: true };
          }
          return opt;
        });

        // Stage 5: Primary Diagram / Graph Extraction & Visual Validation Gate (NO hardcoded boxes!)
        let diagramBox: [number, number, number, number] | undefined = undefined;
        if (vq.diagramBoundingBox && Array.isArray(vq.diagramBoundingBox) && vq.diagramBoundingBox.length === 4) {
          const [ymin, xmin, ymax, xmax] = vq.diagramBoundingBox.map(Number);
          const height = Math.abs(ymax - ymin);
          const width = Math.abs(xmax - xmin);
          const inEnglishColumn = layoutMode !== 'two_column_bilingual' || xmin < 495;
          if (height >= 20 && height <= 520 && width >= 20 && width <= 920 && inEnglishColumn) {
            diagramBox = [
              Math.max(0, Math.min(ymin, ymax)),
              Math.max(0, Math.min(xmin, xmax)),
              Math.min(1000, Math.max(ymin, ymax)),
              Math.min(layoutMode === 'two_column_bilingual' ? 495 : 1000, Math.max(xmin, xmax))
            ];
          }
        }

        if (diagramBox) {
          const validated = await this.validateAndCropPrimaryFigure({
            jobId,
            pageNumber: page.pageNumber,
            questionNumber: vq.questionNumber,
            questionText: cleanedQuestionText,
            pageImageBuffer,
            boundingBox: diagramBox,
            figureType: vq.figureType || (vq.isChemistryStructure ? 'chemical_structure' : 'diagram'),
            layoutMode,
            modelName: geminiModel
          });

          if (validated.figureRecord) {
            figureRecord = validated.figureRecord;
            figureUrl = figureRecord.figureUrl;
            pageFiguresToUpsert.push(figureRecord);
          } else {
            if (validated.mismatchRejected) {
              figureMismatchDetected = true;
            }
            if (validated.rejectionReason) {
              await addParser2Log(
                jobId,
                'figure_extraction',
                `Q${vq.questionNumber} crop rejected (${validated.rejectionReason})`,
                'warn'
              );
            }
          }
        }

        // Stage 6: Automated Targeted Visual Recovery for Missing Figure / Graph / Options / Truncated Stem
        const optionsJoined = normalizedOptions.map(o => o.value).join(' ');
        const visualReq = detectVisualRequirement(cleanedQuestionText, optionsJoined, vq.reviewNotes);
        const allOptionsHaveImages = normalizedOptions.every(o => Boolean(o.imageUrl || optionFiguresMap[o.label]));
        const needsFigureRecovery = visualReq.needsFigure && !figureUrl && !(visualReq.expectsVisualOptions && allOptionsHaveImages);
        const needsOptionRecovery = normalizedOptions.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value)));
        const needsTextRecovery = isQuestionTextTruncated(cleanedQuestionText);

        if ((needsFigureRecovery || needsOptionRecovery || needsTextRecovery) && settings.geminiVerificationEnabled && geminiVerificationService.isConfigured() && (needsFigureRecovery || perPageRecoveryCount < 4)) {
          perPageRecoveryCount++;
          if (needsOptionRecovery && page.pageNumber < totalPages && !nextPageImageBufferCache) {
            try {
              nextPageImageBufferCache = await figureExtractionService.renderPdfPageToPng(pdfBuffer, page.pageNumber + 1, dpi);
            } catch {}
          }

          const recovery = await geminiVerificationService.recoverMissingQuestionContent({
            pageNumber: page.pageNumber,
            pageImageBuffer,
            questionNumber: vq.questionNumber,
            currentQuestionText: cleanedQuestionText,
            currentOptions: normalizedOptions.map(o => ({ label: o.label, value: o.value })),
            missingFigure: needsFigureRecovery,
            missingOptions: needsOptionRecovery,
            truncatedText: needsTextRecovery,
            subject,
            nextPageImageBuffer: needsOptionRecovery ? nextPageImageBufferCache : undefined,
            modelName: geminiModel
          });

          const targetRecBuf = recovery.fromNextPage && nextPageImageBufferCache ? nextPageImageBufferCache : pageImageBuffer;
          const targetRecPageNum = recovery.fromNextPage && nextPageImageBufferCache ? page.pageNumber + 1 : page.pageNumber;
          const recLayoutMode: CropLayoutMode = recovery.pageLayout || layoutMode;

          if (needsTextRecovery && recovery.recoveredQuestionText && recovery.recoveredQuestionText.trim().length > cleanedQuestionText.length) {
            cleanedQuestionText = formatScientificMathAndPowers(recovery.recoveredQuestionText.trim());
          }

          if (needsFigureRecovery && recovery.recoveredDiagramBoundingBox && recovery.recoveredDiagramBoundingBox.length === 4) {
            const recoveredCrop = await this.validateAndCropPrimaryFigure({
              jobId,
              pageNumber: targetRecPageNum,
              questionNumber: vq.questionNumber,
              questionText: cleanedQuestionText,
              pageImageBuffer: targetRecBuf,
              boundingBox: recovery.recoveredDiagramBoundingBox,
              figureType: (recovery.recoveredDiagramType as any) || visualReq.expectedType === 'graph' ? 'graph' : 'diagram',
              layoutMode: recLayoutMode,
              modelName: geminiModel
            });
            if (recoveredCrop.figureRecord) {
              figureRecord = recoveredCrop.figureRecord;
              figureUrl = figureRecord.figureUrl;
              pageFiguresToUpsert.push(figureRecord);
              figureMismatchDetected = false;
              await addParser2Log(jobId, 'figure_extraction', `Recovered missing ${figureRecord.figureType} for Q${vq.questionNumber} (Page ${targetRecPageNum}).`, 'success');
            } else if (recoveredCrop.rejectionReason) {
              await addParser2Log(jobId, 'figure_extraction', `Q${vq.questionNumber} recovery crop rejected (${recoveredCrop.rejectionReason})`, 'warn');
            }
          }

          if (needsOptionRecovery) {
            if (recovery.recoveredOptions && recovery.recoveredOptions.length > 0) {
              for (const ro of recovery.recoveredOptions) {
                if (!ro.value || isPlaceholderOption(ro.value)) continue;
                const formatted = formatScientificMathAndPowers(ro.value.trim());
                const idx = normalizedOptions.findIndex(o => o.label === ro.label);
                if (idx >= 0 && (!normalizedOptions[idx].value || isPlaceholderOption(normalizedOptions[idx].value))) {
                  normalizedOptions[idx] = { ...normalizedOptions[idx], text: formatted, value: formatted };
                }
              }
            }

            if (recovery.recoveredOptionBoundingBoxes && !isAllSimpleChemicalFormulaOptions(normalizedOptions)) {
              const recBoxCheck = figureExtractionService.validateOptionBoundingBoxes(recovery.recoveredOptionBoundingBoxes, recLayoutMode);
              for (const optKey of ['A', 'B', 'C', 'D'] as const) {
                const idx = normalizedOptions.findIndex(o => o.label === optKey);
                if (idx < 0 || normalizedOptions[idx].imageUrl || (normalizedOptions[idx].value && !isPlaceholderOption(normalizedOptions[idx].value))) {
                  continue;
                }
                const box = recBoxCheck.validBoxes[optKey];
                if (!box) continue;
                const recOptFig = await this.cropOptionFigureSafe({
                  jobId,
                  pageNumber: targetRecPageNum,
                  questionNumber: vq.questionNumber,
                  optionLabel: optKey,
                  pageImageBuffer: targetRecBuf,
                  boundingBox: box,
                  layoutMode: recLayoutMode
                });
                if (recOptFig) {
                  optionFiguresMap[optKey] = recOptFig.figureUrl;
                  pageFiguresToUpsert.push(recOptFig);
                  normalizedOptions[idx] = {
                    ...normalizedOptions[idx],
                    text: `[Figure ${optKey}]`,
                    value: `[Figure ${optKey}]`,
                    imageUrl: recOptFig.figureUrl,
                    isVisualOption: true
                  };
                }
              }
              if (Object.keys(optionFiguresMap).length > 0) {
                chemistryContentType = 'complex_structures';
              }
            }
          }
        }

        // Match table & structured table handling + prompt cleanup
        let matchTableData = vq.matchTableData;
        let structuredTableData = vq.structuredTableData;
        const looksLikeMatch = vq.detectedQuestionType === 'match_the_column' || isMatchQuestionPrompt(cleanedQuestionText) || normalizedOptions.some(o => /^[A-Da-d]\s*[-–>:]\s*[I-Vi-v1-4]/.test(o.value || ''));
        if (!matchTableData && looksLikeMatch && page.ocrMarkdown) {
          const extracted = parser2LayoutEngine.parseQuestionsFromText(page.ocrMarkdown, subject, page.pageNumber);
          const foundExt = extracted.find(e => e.questionNumber === vq.questionNumber);
          if (foundExt?.matchTableData) {
            matchTableData = foundExt.matchTableData;
          } else {
            const directTable = parseMatchTableFromText(page.ocrMarkdown);
            if (directTable && extracted.length <= 2) {
              matchTableData = directTable;
            }
          }
        }
        if (!structuredTableData && (vq.detectedQuestionType === 'table_based' || isTableQuestionPrompt(cleanedQuestionText)) && page.ocrMarkdown) {
          const extracted = parser2LayoutEngine.parseQuestionsFromText(page.ocrMarkdown, subject, page.pageNumber);
          const foundExt = extracted.find(e => e.questionNumber === vq.questionNumber);
          if (foundExt?.structuredTableData) {
            structuredTableData = foundExt.structuredTableData;
          }
        }

        if (matchTableData && matchTableData.rows && matchTableData.rows.length > 0) {
          cleanedQuestionText = cleanQuestionTextForMatchTable(cleanedQuestionText, matchTableData);
          // Canonical Single Table Rule: never store duplicate structuredTable alongside matchTable
          structuredTableData = undefined;
        }

        // Discard hallucinated "Scale / Features" tables generated to describe a physical diagram (e.g. Vernier scale)
        if (structuredTableData && (visualReq.needsFigure || figureUrl) && !isTableQuestionPrompt(cleanedQuestionText)) {
          const cap = `${structuredTableData.caption || ''} ${(structuredTableData.headers || []).join(' ')}`.toLowerCase();
          if (/(?:vernier|main\s*scale|screw\s*gauge|diagram|shows\s+(?:major|secondary)\s+divisions|features)/i.test(cap)) {
            structuredTableData = undefined;
          }
        }

        const resolvedQuestionType: Parser2Question['questionType'] =
          matchTableData?.rows?.length
            ? 'match_the_column'
            : vq.detectedQuestionType || (structuredTableData ? 'table_based' : figureUrl ? 'diagram_based' : 'single_mcq');

        // Stage 7: Strict Verification Status Evaluation (never marks incomplete/missing-table/missing-figure as verified!)
        const strict = evaluateStrictQuestionStatus({
          questionType: resolvedQuestionType,
          questionText: cleanedQuestionText,
          options: normalizedOptions,
          optionFigures: optionFiguresMap,
          figureUrl,
          matchTable: matchTableData,
          structuredTable: structuredTableData,
          reviewNotes: vq.reviewNotes,
          confidenceScore: vq.confidenceScore ?? 95,
          baseReviewRequired: vq.reviewRequired,
          figureMismatchDetected
        });

        const spannedPages = [page.pageNumber];
        if (figureRecord?.pageNumber && !spannedPages.includes(figureRecord.pageNumber)) {
          spannedPages.push(figureRecord.pageNumber);
        }
        const pageMeta = formatSourcePageRange(spannedPages, page.pageNumber);

        const nowIso = new Date().toISOString();
        const qRecord: Parser2Question = {
          id: `q-${jobId}-${vq.questionNumber}`,
          jobId,
          questionNumber: vq.questionNumber,
          subject,
          chapter: '',
          questionType: resolvedQuestionType,
          questionText: cleanedQuestionText,
          options: normalizedOptions,
          sourcePageNumber: pageMeta.startPage,
          sourcePageEnd: pageMeta.endPage,
          sourcePages: pageMeta.sourcePages,
          sourcePageRange: pageMeta.label,
          pageLayout: layoutMode === 'manual' ? undefined : layoutMode,
          chemistryContentType,
          figureUrl,
          originalFigureUrl: figureUrl,
          figures: figureRecord ? [figureRecord] : [],
          figureAssetIds: figureRecord ? [figureRecord.id] : [],
          optionFigures: Object.keys(optionFiguresMap).length > 0 ? optionFiguresMap : undefined,
          originalOptionFigures: Object.keys(optionFiguresMap).length > 0 ? { ...optionFiguresMap } : undefined,
          matchTable: matchTableData,
          structuredTable: structuredTableData,
          originalExtractedSnapshot: {
            questionText: cleanedQuestionText,
            options: normalizedOptions.map(o => ({ ...o })),
            matchTable: matchTableData ? JSON.parse(JSON.stringify(matchTableData)) : undefined,
            structuredTable: structuredTableData ? JSON.parse(JSON.stringify(structuredTableData)) : undefined,
            figureUrl,
            capturedAt: nowIso
          },
          extractionEngine: 'mistral',
          verificationStatus: strict.verificationStatus,
          confidenceScore: strict.confidenceScore,
          reviewRequired: strict.reviewRequired,
          reviewNotes: strict.reviewNotes,
          componentValidation: strict.componentValidation,
          aiCorrectionsSummary: vq.correctionsSummary,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        const existingQ = existingQuestionsSnapshot.find(q => q.questionNumber === vq.questionNumber);
        if (existingQ?.isManuallyEdited) {
          await addParser2Log(
            jobId,
            'gemini_verification',
            `Preserved manual edits for Question ${vq.questionNumber} during pipeline re-run.`,
            'info'
          );
          continue;
        }
        if (existingQ) {
          qRecord.correctAnswer = existingQ.correctAnswer || qRecord.correctAnswer;
          qRecord.answerStatus = existingQ.answerStatus || qRecord.answerStatus;
          qRecord.explanation = existingQ.explanation || qRecord.explanation;
        }
        pageQuestionsToUpsert.push(qRecord);
      }

      if (pageQuestionsToUpsert.length > 0) {
        await upsertParser2Questions(jobId, pageQuestionsToUpsert);
      }
      if (pageFiguresToUpsert.length > 0) {
        await upsertParser2Figures(jobId, pageFiguresToUpsert);
      }

      page.status = 'completed';
      page.processingTimeMs = Date.now() - startTime;
      page.extractedQuestionNumbers = verifiedQuestions.map(q => q.questionNumber);
      await saveParser2Page(page);

      await addParser2Log(
        jobId, 
        'ocr', 
        `Page ${page.pageNumber} completed in ${page.processingTimeMs}ms (${verifiedQuestions.length} questions extracted).`,
        'info'
      );
    } catch (e: any) {
      page.status = 'failed';
      page.errorMessage = e.message;
      page.processingTimeMs = Date.now() - startTime;
      await saveParser2Page(page);

      await addParser2Log(jobId, 'ocr', `Page ${page.pageNumber} extraction failed: ${e.message}`, 'error');
    }
  }

  /**
   * Crops a candidate primary figure and runs BOTH Sharp pixel metrics + Gemini visual self-check
   * to prevent cropped printed text lines (Q18 bug) or half-page captures.
   */
  private async validateAndCropPrimaryFigure(params: {
    jobId: string;
    pageNumber: number;
    questionNumber: number;
    questionText: string;
    pageImageBuffer: Buffer;
    boundingBox: [number, number, number, number];
    figureType: Parser2Figure['figureType'];
    layoutMode: CropLayoutMode;
    modelName?: string;
  }): Promise<{ figureRecord?: Parser2Figure; mismatchRejected?: boolean; rejectionReason?: string }> {
    try {
      const cropped = await figureExtractionService.cropFigureFromPage(
        params.pageImageBuffer,
        params.boundingBox,
        true,
        params.layoutMode
      );

      const metrics = await figureExtractionService.validateCroppedFigureMetrics(
        cropped.buffer,
        cropped.pageWidth,
        cropped.pageHeight,
        'question_figure'
      );

      if (!metrics.valid) {
        return { rejectionReason: metrics.reason };
      }

      // Visual check via Gemini whenever configured (strictly rejects printed text blocks)
      const visualReq = detectVisualRequirement(params.questionText);
      if (geminiVerificationService.isConfigured() && (metrics.likelyTextOnly || !visualReq.needsFigure || params.questionText.length > 0)) {
        const visualCheck = await geminiVerificationService.validateCroppedFigureVisual(
          cropped.buffer,
          params.questionText,
          params.figureType === 'chemical_structure' ? 'chemical_structure' : params.figureType === 'graph' ? 'graph' : 'diagram',
          params.modelName
        );

        if (visualCheck.isTextOnlyOrQuestionText || !visualCheck.isGenuineScientificFigure) {
          return {
            mismatchRejected: visualReq.needsFigure,
            rejectionReason: `Printed text / non-figure crop rejected: ${visualCheck.reason || 'contains text instead of diagram'}`
          };
        }

        if (!visualCheck.matchesQuestionContext && visualReq.needsFigure) {
          return {
            mismatchRejected: true,
            rejectionReason: `Figure context mismatch: ${visualCheck.reason}`
          };
        }

        if (visualCheck.detectedType === 'graph') {
          params.figureType = 'graph';
        } else if (visualCheck.detectedType === 'chemical_structure') {
          params.figureType = 'chemical_structure';
        }
      } else if (metrics.likelyTextOnly && !visualReq.needsFigure) {
        return { rejectionReason: 'Heuristic detected printed text block on diagram-free question' };
      }

      const figureRecord = await figureExtractionService.extractAndSaveFigure(
        params.jobId,
        params.pageNumber,
        params.questionNumber,
        params.pageImageBuffer,
        params.boundingBox,
        params.figureType,
        false,
        {
          layoutMode: params.layoutMode,
          preCropped: { buffer: cropped.buffer, width: cropped.width, height: cropped.height }
        }
      );

      return { figureRecord };
    } catch (err: any) {
      return { rejectionReason: err.message };
    }
  }

  private async cropOptionFigureSafe(params: {
    jobId: string;
    pageNumber: number;
    questionNumber: number;
    optionLabel: 'A' | 'B' | 'C' | 'D';
    pageImageBuffer: Buffer;
    boundingBox: [number, number, number, number];
    layoutMode: CropLayoutMode;
  }): Promise<Parser2Figure | null> {
    try {
      const cropped = await figureExtractionService.cropFigureFromPage(
        params.pageImageBuffer,
        params.boundingBox,
        true,
        params.layoutMode
      );
      const metrics = await figureExtractionService.validateCroppedFigureMetrics(
        cropped.buffer,
        cropped.pageWidth,
        cropped.pageHeight,
        'option_figure'
      );
      if (!metrics.valid) {
        return null;
      }

      return await figureExtractionService.extractAndSaveFigure(
        params.jobId,
        params.pageNumber,
        params.questionNumber,
        params.pageImageBuffer,
        params.boundingBox,
        'chemical_structure',
        false,
        {
          layoutMode: params.layoutMode,
          preCropped: { buffer: cropped.buffer, width: cropped.width, height: cropped.height },
          suffix: `opt${params.optionLabel}`
        }
      );
    } catch {
      return null;
    }
  }

  /**
   * Process attached Solutions/Answer Key PDF
   */
  private async processSolutionPdf(jobId: string, pdfBuffer: Buffer): Promise<void> {
    const tempPath = path.resolve(process.cwd(), `.temp_sol_${jobId}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
      let fullText = '';

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        fullText += `\n--- Page ${p} ---\n` + content.items.map((it: any) => it.str).join(' ');
      }

      const keys = answerKeyService.parseAnswerKeyText(fullText, 'solution_pdf');
      const solMap = answerKeyService.parseSolutionsDocument(fullText);

      // Attach explanation text directly inside key entries so step 4b can apply them post-extraction
      for (const [qNumStr, solObj] of Object.entries(solMap)) {
        const qNum = parseInt(qNumStr, 10);
        if (!keys[qNum] && solObj.answer) {
          keys[qNum] = {
            questionNumber: qNum,
            rawAnswer: solObj.answer,
            verifiedAnswer: solObj.answer,
            explanation: solObj.explanation,
            sourceType: 'solution_pdf',
            matchedAt: new Date().toISOString()
          };
        } else if (keys[qNum] && solObj.explanation) {
          keys[qNum].explanation = solObj.explanation;
        }
      }

      const existingKeys = await getParser2AnswerKeys(jobId);
      const mergedKeys = { ...existingKeys, ...keys };
      await saveParser2AnswerKeys(jobId, mergedKeys);

      const questions = await getParser2Questions(jobId);
      if (questions.length > 0) {
        const res = answerKeyService.applyKeysAndSolutionsToQuestions(questions, mergedKeys, solMap, {
          overwriteManual: false,
          markMissingUnmatched: false
        });
        await saveParser2Questions(jobId, questions);
        await addParser2Log(jobId, 'ocr', `Linked ${res.matchedCount} answers and ${res.explanationMatchedCount} step-by-step solutions from solutions PDF.`, 'info');
      } else {
        await addParser2Log(jobId, 'ocr', `Parsed ${Object.keys(mergedKeys).length} answer keys and ${Object.keys(solMap).length} solutions from solutions PDF for post-OCR matching.`, 'info');
      }
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  /**
   * Rescues an option value by parsing the raw OCR text of the page
   */
  private tryExtractOptionFromOcr(ocrText: string, questionNumber: number, label: 'A' | 'B' | 'C' | 'D'): string {
    if (!ocrText) return '';
    try {
      const cleanOcr = parser2LayoutEngine.extractEnglishColumn(ocrText);

      const qRegex = new RegExp(`(?:^|\\n)\\s*(?:\\*\\*)?${questionNumber}\\s*[\\.\\)]\\s*(?:\\*\\*)?([\\s\\S]*?)(?=(?:^|\\n)\\s*(?:\\*\\*)?\\d{1,3}\\s*[\\.\\)]|$)`, 'i');
      const qMatch = cleanOcr.match(qRegex);
      if (!qMatch || !qMatch[1]) return '';
      const chunk = qMatch[1].trim();

      const firstOptMatch = chunk.search(/(?:\([1-4A-D]\)|\[[1-4A-D]\])/);
      const statement = firstOptMatch > 0 ? chunk.slice(0, firstOptMatch).trim() : '';
      const optionsSection = firstOptMatch > 0 ? chunk.slice(firstOptMatch) : chunk;

      const numLabel = label === 'A' ? '1' : label === 'B' ? '2' : label === 'C' ? '3' : '4';

      const optRegex = new RegExp(
        `(?:\\((?:${label}|${numLabel})\\)|\\[(?:${label}|${numLabel})\\])\\s*([\\s\\S]*?)(?=(?:\\([A-D1-4]\\)|\\[[A-D1-4]\\]|$))`,
        'i'
      );
      const optMatch = optionsSection.match(optRegex);
      if (optMatch && optMatch[1]) {
        const val = optMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (val && !isPlaceholderOption(val)) {
          if (statement && statement.length > 10 && val.toLowerCase().includes(statement.toLowerCase().slice(0, 20))) {
            return '';
          }
          return val;
        }
      }
    } catch {}
    return '';
  }

  /**
   * Cross-Page Continuation Stitch Pass:
   * Recovers options/stems/tables split across page boundaries (e.g. Page P -> Page P+1)
   * without duplicating or fabricating missing content.
   */
  private async stitchCrossPageContinuations(
    jobId: string,
    pdfBuffer: Buffer,
    subject: Parser2Subject,
    settings: Parser2Settings,
    totalPages: number
  ): Promise<void> {
    try {
      const questions = await getParser2Questions(jobId);
      const pages = await getParser2Pages(jobId);
      const candidates = questions.filter(
        q =>
          !q.isManuallyEdited &&
          q.sourcePageNumber <= totalPages &&
          (q.verificationStatus === 'options_incomplete' ||
            q.verificationStatus === 'text_incomplete' ||
            q.verificationStatus === 'table_incomplete' ||
            q.verificationStatus === 'missing_figure')
      );

      const dpi = Math.max(180, settings.figureDpi || 200);
      const geminiModel = settings.geminiModel || 'gemini-4-hydrogen';
      let updatedCount = 0;

      const updatedCrossPageQuestions: Parser2Question[] = [];
      const recoveryFigures: Parser2Figure[] = [];

      for (const q of candidates.slice(0, 20)) {
        const curPage = pages.find(p => p.pageNumber === q.sourcePageNumber);
        const nextPage = q.sourcePageNumber < totalPages ? pages.find(p => p.pageNumber === q.sourcePageNumber + 1) : undefined;
        if (!curPage) continue;

        let changed = false;
        let touchedNextPage = false;

        // 1. Deterministic lead-in scan on nextPage OCR markdown before the next question starts
        if (nextPage?.ocrMarkdown && q.verificationStatus === 'options_incomplete') {
          const engNext = parser2LayoutEngine.extractEnglishColumn(nextPage.ocrMarkdown);
          const nextQIdx = engNext.search(/(?:^|\n)\s*(?:\*\*)?\d{1,3}\s*[\.\)]\s*/);
          const leadingChunk = nextQIdx > 0 ? engNext.slice(0, nextQIdx) : engNext.slice(0, 600);
          if (leadingChunk && /\([1-4A-D]\)/.test(leadingChunk)) {
            for (const lbl of ['A', 'B', 'C', 'D'] as const) {
              const idx = q.options.findIndex(o => o.label === lbl);
              if (idx < 0 || (q.options[idx].value && !isPlaceholderOption(q.options[idx].value))) continue;
              const numL = lbl === 'A' ? '1' : lbl === 'B' ? '2' : lbl === 'C' ? '3' : '4';
              const om = leadingChunk.match(
                new RegExp(`(?:\\((?:${lbl}|${numL})\\)|\\[(?:${lbl}|${numL})\\])\\s*([\\s\\S]*?)(?=(?:\\([1-4A-D]\\)|\\[[1-4A-D]\\]|$))`, 'i')
              );
              if (om && om[1]) {
                const candidateVal = formatScientificMathAndPowers(om[1].replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim());
                if (candidateVal && !isPlaceholderOption(candidateVal)) {
                  q.options[idx] = { ...q.options[idx], text: candidateVal, value: candidateVal };
                  changed = true;
                  touchedNextPage = true;
                }
              }
            }
          }
        }

        // 2. Multimodal lookahead across Page P (& Page P+1 if available)
        if (
          settings.geminiVerificationEnabled &&
          geminiVerificationService.isConfigured() &&
          (q.options.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value))) ||
            q.verificationStatus === 'text_incomplete' ||
            q.verificationStatus === 'table_incomplete' ||
            q.verificationStatus === 'missing_figure')
        ) {
          try {
            const pBuf = await figureExtractionService.renderPdfPageToPng(pdfBuffer, q.sourcePageNumber, dpi);
            const nBuf =
              q.sourcePageNumber < totalPages
                ? await figureExtractionService.renderPdfPageToPng(pdfBuffer, q.sourcePageNumber + 1, dpi)
                : undefined;
            const rec = await geminiVerificationService.recoverMissingQuestionContent({
              pageNumber: q.sourcePageNumber,
              pageImageBuffer: pBuf,
              nextPageImageBuffer: nBuf,
              questionNumber: q.questionNumber,
              currentQuestionText: q.questionText,
              currentOptions: q.options.map(o => ({ label: o.label, value: o.value })),
              missingFigure: q.verificationStatus === 'missing_figure',
              missingOptions: q.options.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value))),
              truncatedText: q.verificationStatus === 'text_incomplete' || q.verificationStatus === 'table_incomplete',
              subject,
              modelName: geminiModel
            });

            if (rec.recoveredQuestionText && rec.recoveredQuestionText.trim().length > q.questionText.length) {
              q.questionText = formatScientificMathAndPowers(rec.recoveredQuestionText.trim());
              changed = true;
              if (rec.fromNextPage && nBuf) touchedNextPage = true;
            }
            if (rec.recoveredOptions && rec.recoveredOptions.length > 0) {
              for (const ro of rec.recoveredOptions) {
                if (!ro.value || isPlaceholderOption(ro.value)) continue;
                const idx = q.options.findIndex(o => o.label === ro.label);
                if (idx >= 0 && (!q.options[idx].value || isPlaceholderOption(q.options[idx].value))) {
                  const formatted = formatScientificMathAndPowers(ro.value.trim());
                  q.options[idx] = { ...q.options[idx], text: formatted, value: formatted };
                  changed = true;
                  if (nBuf) touchedNextPage = true;
                }
              }
            }
            if (rec.recoveredMatchTableData && rec.recoveredMatchTableData.rows?.length) {
              q.matchTable = rec.recoveredMatchTableData;
              q.structuredTable = undefined;
              q.questionText = cleanQuestionTextForMatchTable(q.questionText, q.matchTable);
              changed = true;
              if (rec.fromNextPage && nBuf) touchedNextPage = true;
            }
            if (!q.matchTable?.rows?.length && rec.recoveredStructuredTableData && rec.recoveredStructuredTableData.rows?.length) {
              q.structuredTable = rec.recoveredStructuredTableData;
              changed = true;
              if (rec.fromNextPage && nBuf) touchedNextPage = true;
            }
            if (!q.figureUrl && rec.recoveredDiagramBoundingBox && rec.recoveredDiagramBoundingBox.length === 4) {
              const targetBuf = rec.fromNextPage && nBuf ? nBuf : pBuf;
              const targetPg = rec.fromNextPage && nBuf ? q.sourcePageNumber + 1 : q.sourcePageNumber;
              const cropRes = await this.validateAndCropPrimaryFigure({
                jobId,
                pageNumber: targetPg,
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                pageImageBuffer: targetBuf,
                boundingBox: rec.recoveredDiagramBoundingBox,
                figureType: (rec.recoveredDiagramType as any) || 'diagram',
                layoutMode: (rec.pageLayout as any) || q.pageLayout || 'two_column_english',
                modelName: geminiModel
              });
              if (cropRes.figureRecord) {
                q.figureUrl = cropRes.figureRecord.figureUrl;
                q.originalFigureUrl = q.originalFigureUrl || cropRes.figureRecord.figureUrl;
                q.figures = [cropRes.figureRecord, ...(q.figures || [])];
                q.figureAssetIds = [cropRes.figureRecord.id];
                recoveryFigures.push(cropRes.figureRecord);
                changed = true;
                if (targetPg > q.sourcePageNumber) touchedNextPage = true;
              }
            }
          } catch {}
        }

        if (changed) {
          if (q.matchTable?.rows?.length) {
            q.structuredTable = undefined;
          }
          if (touchedNextPage && q.sourcePageNumber < totalPages) {
            const pageMeta = formatSourcePageRange(
              [...(q.sourcePages || [q.sourcePageNumber]), q.sourcePageNumber + 1],
              q.sourcePageNumber
            );
            q.sourcePageNumber = pageMeta.startPage;
            q.sourcePageEnd = pageMeta.endPage;
            q.sourcePages = pageMeta.sourcePages;
            q.sourcePageRange = pageMeta.label;
          }
          const strict = evaluateStrictQuestionStatus({
            questionType: q.questionType,
            questionText: q.questionText,
            options: q.options,
            optionFigures: q.optionFigures,
            figureUrl: q.figureUrl,
            matchTable: q.matchTable,
            structuredTable: q.structuredTable,
            reviewNotes: q.reviewNotes,
            confidenceScore: q.confidenceScore,
            baseReviewRequired: q.reviewRequired
          });
          q.verificationStatus = strict.verificationStatus;
          q.reviewRequired = strict.reviewRequired;
          q.confidenceScore = strict.confidenceScore;
          q.reviewNotes = strict.reviewNotes;
          q.componentValidation = strict.componentValidation;
          q.updatedAt = new Date().toISOString();
          updatedCount++;
          updatedCrossPageQuestions.push(q);
        }
      }

      // 3. Sequence-Gap Integrity Recovery (recovers any missing integers e.g. Q21 across pg 2->3)
      if (questions.length > 0 && settings.geminiVerificationEnabled && geminiVerificationService.isConfigured()) {
        const sortedNums = questions.map(q => q.questionNumber).sort((a, b) => a - b);
        const minQ = sortedNums[0] <= 5 ? 1 : sortedNums[0];
        const maxQ = sortedNums[sortedNums.length - 1];
        const presentSet = new Set(sortedNums);
        const missingNums: number[] = [];
        for (let n = minQ; n <= maxQ; n++) {
          if (!presentSet.has(n)) missingNums.push(n);
        }

        for (const missingNum of missingNums.slice(0, 15)) {
          const prevQ = [...questions].filter(q => q.questionNumber < missingNum).sort((a, b) => b.questionNumber - a.questionNumber)[0];
          const nextQ = [...questions].filter(q => q.questionNumber > missingNum).sort((a, b) => a.questionNumber - b.questionNumber)[0];
          const pageA = prevQ?.sourcePageNumber || nextQ?.sourcePageNumber || 1;
          const pageB = nextQ?.sourcePageNumber && nextQ.sourcePageNumber !== pageA ? nextQ.sourcePageNumber : Math.min(totalPages, pageA + 1);

          try {
            const bufA = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pageA, dpi);
            const bufB = pageB !== pageA && pageB <= totalPages ? await figureExtractionService.renderPdfPageToPng(pdfBuffer, pageB, dpi) : undefined;
            const rec = await geminiVerificationService.recoverMissingQuestionContent({
              pageNumber: pageA,
              pageImageBuffer: bufA,
              nextPageImageBuffer: bufB,
              questionNumber: missingNum,
              currentQuestionText: '',
              currentOptions: [],
              missingFigure: true,
              missingOptions: true,
              truncatedText: true,
              subject,
              modelName: geminiModel
            });

            if (rec.recoveredQuestionText && rec.recoveredQuestionText.trim().length > 8) {
              const gapRescued = this.rescueOptionsFromStructuredTable(rec.recoveredStructuredTableData);
              if (gapRescued.rescuedCount >= 2 && gapRescued.wasOptionOnlyTable) {
                rec.recoveredStructuredTableData = undefined;
              }
              let recoveredStem = formatScientificMathAndPowers(rec.recoveredQuestionText.trim());
              const recOpts: Parser2Question['options'] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
                const found = rec.recoveredOptions?.find(o => o.label === lbl);
                const rawVal = found?.value && !isPlaceholderOption(found.value) ? found.value : gapRescued.options[lbl] || '';
                const val = rawVal && !isPlaceholderOption(rawVal) ? formatScientificMathAndPowers(rawVal.trim()) : '';
                return { label: lbl, text: val, value: val };
              });

              let recFigUrl: string | undefined;
              let recFigs: Parser2Figure[] = [];
              if (rec.recoveredDiagramBoundingBox && rec.recoveredDiagramBoundingBox.length === 4) {
                const targetBuf = rec.fromNextPage && bufB ? bufB : bufA;
                const targetPg = rec.fromNextPage && bufB ? pageB : pageA;
                const cropRes = await this.validateAndCropPrimaryFigure({
                  jobId,
                  pageNumber: targetPg,
                  questionNumber: missingNum,
                  questionText: recoveredStem,
                  pageImageBuffer: targetBuf,
                  boundingBox: rec.recoveredDiagramBoundingBox,
                  figureType: (rec.recoveredDiagramType as any) || 'diagram',
                  layoutMode: (rec.pageLayout as any) || 'two_column_english',
                  modelName: geminiModel
                });
                if (cropRes.figureRecord) {
                  recFigUrl = cropRes.figureRecord.figureUrl;
                  recFigs = [cropRes.figureRecord];
                  recoveryFigures.push(cropRes.figureRecord);
                }
              }

              if (rec.recoveredMatchTableData?.rows?.length) {
                recoveredStem = cleanQuestionTextForMatchTable(recoveredStem, rec.recoveredMatchTableData);
              }

              const qType: Parser2Question['questionType'] =
                rec.recoveredMatchTableData?.rows?.length
                  ? 'match_the_column'
                  : rec.recoveredStructuredTableData?.rows?.length
                  ? 'table_based'
                  : recFigUrl
                  ? 'diagram_based'
                  : 'single_mcq';

              const strict = evaluateStrictQuestionStatus({
                questionType: qType,
                questionText: recoveredStem,
                options: recOpts,
                figureUrl: recFigUrl,
                matchTable: rec.recoveredMatchTableData,
                structuredTable: rec.recoveredStructuredTableData,
                confidenceScore: rec.confidenceScore || 85
              });

              const nowIso = new Date().toISOString();
              const recoveredQ: Parser2Question = {
                id: `q-${jobId}-${missingNum}`,
                jobId,
                questionNumber: missingNum,
                subject,
                chapter: '',
                questionType: qType,
                questionText: recoveredStem,
                options: recOpts,
                sourcePageNumber: rec.fromNextPage && bufB ? pageB : pageA,
                pageLayout: (rec.pageLayout as any) || 'two_column_english',
                figureUrl: recFigUrl,
                originalFigureUrl: recFigUrl,
                figures: recFigs,
                figureAssetIds: recFigs.map(f => f.id),
                matchTable: rec.recoveredMatchTableData,
                structuredTable: rec.recoveredStructuredTableData,
                extractionEngine: 'gemini',
                verificationStatus: strict.verificationStatus,
                confidenceScore: strict.confidenceScore,
                reviewRequired: strict.reviewRequired,
                reviewNotes: strict.reviewNotes || `Recovered Q${missingNum} via sequence-gap boundary pass.`,
                componentValidation: strict.componentValidation,
                createdAt: nowIso,
                updatedAt: nowIso
              };

              updatedCrossPageQuestions.push(recoveredQ);
              updatedCount++;
            }
          } catch {}
        }
      }

      if (recoveryFigures.length > 0) {
        await upsertParser2Figures(jobId, recoveryFigures);
      }
      if (updatedCount > 0) {
        await upsertParser2Questions(jobId, updatedCrossPageQuestions);
        await addParser2Log(
          jobId,
          'validation',
          `Cross-boundary & sequence-gap pass recovered/completed ${updatedCount} question(s).`,
          'info'
        );
      }
    } catch (err: any) {
      console.warn('[JobQueue] stitchCrossPageContinuations note:', err.message);
    }
  }

  /**
   * Rescues MCQ options (A)-(D) that Gemini occasionally puts into structuredTableData rows.
   */
  private rescueOptionsFromStructuredTable(tableData?: {
    headers?: string[];
    rows?: string[][];
    caption?: string;
  }): { rescuedCount: number; options: Partial<Record<'A' | 'B' | 'C' | 'D', string>>; wasOptionOnlyTable: boolean } {
    const out: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};
    if (!tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0) {
      return { rescuedCount: 0, options: out, wasOptionOnlyTable: false };
    }

    let matchedCells = 0;
    let totalCells = 0;
    const mapLabel = (raw: string): 'A' | 'B' | 'C' | 'D' | null => {
      const up = raw.toUpperCase();
      if (up === 'A' || up === '1') return 'A';
      if (up === 'B' || up === '2') return 'B';
      if (up === 'C' || up === '3') return 'C';
      if (up === 'D' || up === '4') return 'D';
      return null;
    };

    for (const row of tableData.rows) {
      if (!Array.isArray(row)) continue;
      // Pattern 1: Key-Value row like ["(A)", "1"]
      if (row.length === 2) {
        const keyOnly = String(row[0] || '').trim().match(/^\(?([A-D1-4])\)?[\.\):]?$/i);
        if (keyOnly) {
          const lbl = mapLabel(keyOnly[1]);
          const val = String(row[1] || '').trim();
          if (lbl && val) {
            out[lbl] = val;
            matchedCells += 2;
            totalCells += 2;
            continue;
          }
        }
      }
      // Pattern 2: Cells containing inline markers like "(A) Mass", "(B) Length", etc.
      for (const cell of row) {
        const txt = String(cell || '').trim();
        if (!txt) continue;
        totalCells++;
        const m = txt.match(/^\(?([A-D1-4])\)?[\.\):]\s*(.+)$/i);
        if (m) {
          const lbl = mapLabel(m[1]);
          if (lbl && m[2].trim()) {
            out[lbl] = m[2].trim();
            matchedCells++;
          }
        }
      }
    }

    const rescuedCount = Object.keys(out).length;
    const wasOptionOnlyTable = rescuedCount >= 2 && matchedCells >= Math.max(2, totalCells - 1);
    return { rescuedCount, options: out, wasOptionOnlyTable };
  }

  private async getPdfPageCount(buffer: Buffer): Promise<number> {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      return doc.numPages;
    } catch {
      return 1;
    }
  }

  private parseExpectedCount(rangeStr: string): number {
    const match = rangeStr.match(/\b(\d+)\s*[\-\:]\s*(\d+)\b/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      return Math.max(1, end - start + 1);
    }
    const single = parseInt(rangeStr, 10);
    return isNaN(single) ? 180 : single;
  }
}

export const jobQueueService = new JobQueueService();
