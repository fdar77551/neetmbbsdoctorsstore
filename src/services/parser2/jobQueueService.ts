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
  isPlaceholderOption,
  isPageCompletedStatus
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
import {
  geminiVerificationService,
  normalizeOptionLabel,
  normalizeVerifiedOptionsList
} from './geminiVerificationService';
import { figureExtractionService, CropLayoutMode } from './figureExtractionService';
import { validationEngine } from './validationEngine';
import { uploadParser2Asset, getParser2AssetBuffer } from './parser2R2Storage';
import { answerKeyService, AnswerKeyMatchResult } from './answerKeyService';
import { formatScientificMathAndPowers, cleanQuestionTextForMatchTable, hasSuspiciousMathNotation } from '../../lib/mockTestData';
import { apiRateLimiter, classifyApiError, RetryNotice } from './apiRateLimiter.js';

// Active running job workers map with lock TTL + heartbeat tracking
interface ActiveJobHandle {
  abortController: AbortController;
  isRunning: boolean;
  lockOwnerId: string;
  startedAt: number;
  lastHeartbeatAt: number;
  currentPage?: number;
  currentStage?: string;
}

const activeJobs = new Map<string, ActiveJobHandle>();
const JOB_LOCK_TTL_MS = 180_000; // 3 minutes lease TTL
const STALL_WATCHDOG_THRESHOLD_MS = 120_000; // 2 minutes without heartbeat => stalled
const MAX_PAGE_DEAD_LETTER_ATTEMPTS = 3;
let lastWatchdogRunAt: string | null = null;
let totalStallsRecovered = 0;

export const ACTIVE_PARSER_JOB_STATUSES = new Set([
  'uploaded',
  'queued',
  'starting',
  'uploading',
  'extracting',
  'processing',
  'ocr_in_progress',
  'ocr_completed',
  'question_detection',
  'question_extraction',
  'structuring',
  'figure_extraction',
  'validation',
  'validating',
  'verifying',
  'saving',
  'retry_waiting'
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
   * Touch heartbeat + extend lock TTL for an actively running job.
   */
  private touchJobHeartbeat(job: Parser2Job, stage?: string, pageNumber?: number | null): void {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const handle = activeJobs.get(job.id);
    if (handle) {
      handle.lastHeartbeatAt = nowMs;
      if (stage) handle.currentStage = stage;
      if (pageNumber === null) {
        handle.currentPage = undefined;
      } else if (pageNumber !== undefined) {
        handle.currentPage = pageNumber;
      }
      job.lockOwnerId = handle.lockOwnerId;
    }
    job.lockExpiresAt = new Date(nowMs + JOB_LOCK_TTL_MS).toISOString();
    job.lastActivityAt = nowIso;
    if (stage) job.currentStage = stage;
  }

  /**
   * Expose live watchdog & active worker telemetry for Diagnostics (Module 9)
   */
  public getWatchdogStatus(): {
    runningWorkers: Array<{
      jobId: string;
      lockOwnerId: string;
      startedAt: string;
      lastHeartbeatAt: string;
      heartbeatAgeMs: number;
      currentPage?: number;
      currentStage?: string;
    }>;
    lockTtlMs: number;
    stallThresholdMs: number;
    maxPageDeadLetterAttempts: number;
    lastWatchdogRunAt: string | null;
    totalStallsRecovered: number;
  } {
    const now = Date.now();
    return {
      runningWorkers: Array.from(activeJobs.entries()).map(([jobId, h]) => ({
        jobId,
        lockOwnerId: h.lockOwnerId,
        startedAt: new Date(h.startedAt).toISOString(),
        lastHeartbeatAt: new Date(h.lastHeartbeatAt).toISOString(),
        heartbeatAgeMs: Math.max(0, now - h.lastHeartbeatAt),
        currentPage: h.currentPage,
        currentStage: h.currentStage
      })),
      lockTtlMs: JOB_LOCK_TTL_MS,
      stallThresholdMs: STALL_WATCHDOG_THRESHOLD_MS,
      maxPageDeadLetterAttempts: MAX_PAGE_DEAD_LETTER_ATTEMPTS,
      lastWatchdogRunAt,
      totalStallsRecovered
    };
  }

  /**
   * Module 9 Diagnostics: Safe live Queue Worker self-test (verifies watchdog, lock map, and rate limiter health).
   */
  public async runQueueSelfTest(): Promise<{
    ok: boolean;
    latencyMs: number;
    watchdog: ReturnType<JobQueueService['getWatchdogStatus']>;
    rateLimiter: ReturnType<typeof apiRateLimiter.getSnapshot>;
    checkedAt: string;
  }> {
    const t0 = Date.now();
    await this.reconcilePendingJobs();
    return {
      ok: true,
      latencyMs: Date.now() - t0,
      watchdog: this.getWatchdogStatus(),
      rateLimiter: apiRateLimiter.getSnapshot(),
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Boot-time and Periodic Reconciliation / Stall Watchdog Daemon
   * 1. Detects active in-memory workers whose heartbeat exceeded STALL_WATCHDOG_THRESHOLD_MS (or whose rate-limit wait is abnormally long),
   *    aborts them, marks the active page stalled/dead_letter, and releases the lock so the job never hangs indefinitely.
   * 2. Recovers orphaned jobs left in active states after a server restart or expired lock TTL.
   */
  public async initJobRecovery(): Promise<void> {
    console.log('[JobQueue] Initializing Persistent Job Recovery & Stall Watchdog Daemon...');
    await this.reconcilePendingJobs();
    setInterval(() => {
      this.reconcilePendingJobs().catch(e => console.warn('[JobQueue] Recovery daemon cycle error:', e.message));
    }, 30000);
  }

  public async reconcilePendingJobs(): Promise<void> {
    lastWatchdogRunAt = new Date().toISOString();
    try {
      const nowMs = Date.now();
      const jobs = await getParser2Jobs();

      // 1. Stall Watchdog on in-memory active workers
      for (const [jobId, handle] of Array.from(activeJobs.entries())) {
        const heartbeatAge = nowMs - handle.lastHeartbeatAt;
        if (heartbeatAge > STALL_WATCHDOG_THRESHOLD_MS) {
          totalStallsRecovered++;
          const stallMsg = `Watchdog detected stalled worker on Page ${handle.currentPage || '?'} (no heartbeat for ${Math.round(heartbeatAge / 1000)}s during "${handle.currentStage || 'processing'}"). Aborting and recovering cleanly.`;
          console.warn(`[JobQueue][Watchdog] ${jobId}: ${stallMsg}`);
          try {
            handle.abortController.abort();
          } catch {}
          activeJobs.delete(jobId);

          const stalledJob = await getParser2JobById(jobId);
          if (stalledJob && stalledJob.status !== 'paused') {
            const pages = await getParser2Pages(jobId);
            const activePage = pages.find(p =>
              handle.currentPage
                ? p.pageNumber === handle.currentPage
                : ['processing', 'ocr_in_progress', 'ocr_completed', 'extracting', 'validating', 'saving'].includes(p.status)
            );
            // NEVER overwrite an already-completed or saved page (e.g. Page 7 Answer Key) if a post-page stage stalled
            if (activePage && !isPageCompletedStatus(activePage.status)) {
              const attempts = (activePage.retryAttempts || 1);
              if (attempts >= MAX_PAGE_DEAD_LETTER_ATTEMPTS) {
                activePage.status = 'dead_letter';
                activePage.deadLettered = true;
                activePage.errorMessage = `Dead-lettered after ${attempts} stalled/failed attempts: ${stallMsg}`;
              } else {
                activePage.status = 'stalled';
                activePage.errorMessage = stallMsg;
              }
              await saveParser2Page(activePage);
            }
            stalledJob.status = 'stalled';
            stalledJob.stalledAt = new Date().toISOString();
            stalledJob.stallReason = stallMsg;
            stalledJob.failedStage = handle.currentStage || 'ocr_in_progress';
            stalledJob.currentStage = `Stalled on Page ${handle.currentPage || '?'} — Ready to Retry`;
            stalledJob.errorMessage = stallMsg;
            stalledJob.lockOwnerId = undefined;
            stalledJob.lockExpiresAt = undefined;
            stalledJob.rateLimitStatus = null;
            stalledJob.lastActivityAt = new Date().toISOString();
            await saveParser2Job(stalledJob);
            await addParser2Log(jobId, 'ocr', stallMsg, 'error');
          }
        }
      }

      // 2. Orphaned active jobs (after process restart or expired lock)
      for (const job of jobs) {
        if (!ACTIVE_PARSER_JOB_STATUSES.has(job.status)) continue;
        if (activeJobs.has(job.id)) continue;

        // If job had an absurdly long stale rateLimitStatus (> 5 min in future) from pre-4.0 code, clear it immediately!
        if (job.rateLimitStatus?.nextRetryAt) {
          const waitLeft = new Date(job.rateLimitStatus.nextRetryAt).getTime() - nowMs;
          if (waitLeft > 300_000) {
            apiRateLimiter.clearPause('gemini');
            apiRateLimiter.clearPause('mistral');
            job.rateLimitStatus = null;
          }
        }

        const lastActMs = new Date(job.lastActivityAt || job.updatedAt || job.createdAt || 0).getTime();
        const lockExpMs = job.lockExpiresAt ? new Date(job.lockExpiresAt).getTime() : 0;
        const lockExpired = !lockExpMs || lockExpMs < nowMs;
        if (!lockExpired && nowMs - lastActMs < STALL_WATCHDOG_THRESHOLD_MS) {
          continue;
        }

        // Check if job already stalled/failed too many times without progress -> mark stalled instead of infinite loop
        const pages = await getParser2Pages(job.id);
        const allDeadOrExhausted =
          pages.length > 0 &&
          pages.every(p => isPageCompletedStatus(p.status) || p.status === 'dead_letter' || (p.retryAttempts || 0) >= MAX_PAGE_DEAD_LETTER_ATTEMPTS);

        if (allDeadOrExhausted && pages.some(p => !isPageCompletedStatus(p.status))) {
          const qs = await getParser2Questions(job.id);
          job.status = qs.length > 0 ? 'review_required' : 'stalled';
          job.stalledAt = new Date().toISOString();
          job.stallReason = 'All remaining pages reached maximum retry attempts without completing.';
          job.currentStage = qs.length > 0 ? `Partial Checkpoint (${qs.length} Qs) — Review Required` : 'Stalled — Retry Required';
          job.errorMessage = job.errorMessage || job.stallReason;
          job.lockOwnerId = undefined;
          job.lockExpiresAt = undefined;
          job.rateLimitStatus = null;
          await saveParser2Job(job);
          await addParser2Log(job.id, 'ocr', `Watchdog halted repeated retries: ${job.stallReason}`, 'warn');
          continue;
        }

        console.log(`[JobQueue] Auto-recovering interrupted job ${job.id} ("${job.testName}", status: ${job.status})...`);
        await addParser2Log(job.id, 'ocr', `System auto-recovery: Resuming background pipeline from last saved page checkpoint.`, 'info');
        this.startJob(job.id).catch(err => {
          console.error(`[JobQueue] Failed to auto-resume job ${job.id}:`, err);
        });
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

    const expCfg = this.resolveExpectedConfig(job);
    const report = validationEngine.auditQuestions(jobId, questions, expCfg.expected, {
      savedQuestions: questions.length,
      expectedSource: expCfg.source
    });
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

      // Pass 1: Deterministic text check on EVERY page (handles inline keys right after questions AND full-page key tables anywhere in PDF)
      const inlineKeys = answerKeyService.extractInlineAnswersFromPageText(pageText, pNum);
      if (Object.keys(inlineKeys).length > 0) {
        keyPages.push(pNum);
        for (const [kStr, e] of Object.entries(inlineKeys)) {
          detectedMap[Number(kStr)] = {
            ...e,
            sourcePage: pNum,
            setCode: options?.setCode || e.setCode,
            matchedAt: now
          };
        }
      }

      const textOnlyKeys = answerKeyService.parseAnswerKeyText(pageText, 'pdf_page');
      const hasQuestionStems = /\b\d{1,3}\s*[\.\)]\s*[A-Za-z]{6,}[\s\S]{15,}\([1-4A-D]\)/.test(pageText);

      if (Object.keys(textOnlyKeys).length >= 8 && !hasQuestionStems) {
        keyPages.push(pNum);
        for (const [kStr, e] of Object.entries(textOnlyKeys)) {
          detectedMap[Number(kStr)] = {
            ...e,
            sourcePage: pNum,
            setCode: options?.setCode || e.setCode,
            confidence: e.confidence ?? 97,
            matchedAt: now
          };
        }
        continue;
      }

      // Pass 2: Vision check on key-heading pages, trailing pages, or sparse/scanned pages with <= 2 extracted questions
      if (!mentionsKey && !isTrailing && !isSparse) continue;

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
                explanation: item.explanation,
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

    const expCfg = this.resolveExpectedConfig(job);
    const report = validationEngine.auditQuestions(jobId, questions, expCfg.expected, {
      savedQuestions: questions.length,
      expectedSource: expCfg.source
    });
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
   * Start or resume processing for a job in the background.
   * Preserves all already-saved pages and questions — continues strictly from incomplete checkpoints.
   * Only resets all pages if 0 questions were saved AND no pending/retryable pages remain.
   */
  public async startJob(jobId: string): Promise<boolean> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (activeJobs.has(jobId) && activeJobs.get(jobId)?.isRunning) {
      console.log(`[JobQueue] Job ${jobId} is already running.`);
      return true;
    }

    const existingPages = await getParser2Pages(jobId);
    const existingQuestions = await getParser2Questions(jobId);
    const hasIncomplete = existingPages.some(
      p => p.status === 'pending' || p.status === 'processing' || p.status === 'ocr_in_progress' || p.status === 'extracting' || p.status === 'retry_required' || p.status === 'retry_waiting' || p.status === 'stalled'
    );
    const hasFailed = existingPages.some(p => p.status === 'failed' || p.status === 'dead_letter');

    if (existingPages.length > 0 && !hasIncomplete && existingQuestions.length === 0) {
      // If 0 questions exist and pages previously failed or produced 0 Qs, reset them cleanly for re-extraction
      for (const p of existingPages) {
        p.status = 'pending';
        p.errorMessage = undefined;
        p.deadLettered = false;
        p.retryAttempts = 0;
        await saveParser2Page(p);
      }
      await addParser2Log(
        jobId,
        'ocr',
        `Detected 0 saved questions across ${existingPages.length} page(s); reset all pages to pending for full re-extraction.`,
        'warn'
      );
    } else if (existingPages.length > 0 && !hasIncomplete && hasFailed && existingQuestions.length > 0) {
      // Resume with partially saved job: retry only the failed/dead-letter pages without touching already-saved pages
      for (const p of existingPages.filter(x => x.status === 'failed' || x.status === 'dead_letter')) {
        p.status = 'pending';
        p.errorMessage = undefined;
        p.deadLettered = false;
        await saveParser2Page(p);
      }
      await addParser2Log(
        jobId,
        'ocr',
        `Resuming from checkpoint: preserving ${existingQuestions.length} saved Qs and retrying only failed page(s).`,
        'info'
      );
    }

    const abortController = new AbortController();
    const lockOwnerId = `worker-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nowMs = Date.now();
    activeJobs.set(jobId, {
      abortController,
      isRunning: true,
      lockOwnerId,
      startedAt: nowMs,
      lastHeartbeatAt: nowMs,
      currentStage: 'starting'
    });

    job.status = 'starting';
    job.currentStage = 'Initializing PDF pipeline';
    job.errorMessage = undefined;
    job.failedStage = undefined;
    job.stalledAt = undefined;
    job.stallReason = undefined;
    job.rateLimitStatus = null;
    job.lockOwnerId = lockOwnerId;
    job.lockAcquiredAt = new Date(nowMs).toISOString();
    job.lockExpiresAt = new Date(nowMs + JOB_LOCK_TTL_MS).toISOString();
    job.lastActivityAt = new Date(nowMs).toISOString();
    await saveParser2Job(job);
    await addParser2Log(jobId, 'ocr', `Started/resumed processing job "${job.testName}" (Subject: ${job.subject}, Provider: ${job.ocrEngine}, Lock: ${lockOwnerId})`, 'info');

    this.runJobPipeline(jobId, abortController.signal).catch(async (err) => {
      console.error(`[JobQueue] Error running job ${jobId}:`, err);
      const j = await getParser2JobById(jobId);
      if (j && j.status !== 'paused' && j.status !== 'stalled') {
        j.status = 'failed';
        j.failedStage = j.failedStage || j.currentStage || 'pipeline_execution';
        j.currentStage = 'Pipeline Failed';
        j.errorMessage = err.message;
        j.lockOwnerId = undefined;
        j.lockExpiresAt = undefined;
        j.rateLimitStatus = null;
        j.lastActivityAt = new Date().toISOString();
        await saveParser2Job(j);
        await addParser2Log(jobId, 'ocr', `Job execution failed: ${err.message}`, 'error');
      }
    }).finally(() => {
      const cur = activeJobs.get(jobId);
      if (cur && cur.lockOwnerId === lockOwnerId) {
        activeJobs.delete(jobId);
      }
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
   * Retry ONLY failed or retry_required pages without deleting or duplicating already-saved questions.
   * If 0 questions were saved across the entire PDF, resets all non-answer-key pages so extraction actually runs.
   */
  public async retryFailedPages(jobId: string): Promise<boolean> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const pages = await getParser2Pages(jobId);
    const questions = await getParser2Questions(jobId);
    const failedOrRetryPages = pages.filter(
      p => p.status === 'failed' || p.status === 'retry_required' || p.status === 'retry_waiting' || p.status === 'stalled' || p.status === 'dead_letter'
    );

    if (failedOrRetryPages.length > 0) {
      for (const p of failedOrRetryPages) {
        p.status = 'pending';
        p.errorMessage = undefined;
        p.deadLettered = false;
        p.retryAttempts = 0;
        await saveParser2Page(p);
      }
      // Also if 0 questions were saved across the whole job, reset 0-question "completed" pages that were silently emptied
      if (questions.length === 0) {
        const emptyDone = pages.filter(
          p => isPageCompletedStatus(p.status) && !p.isAnswerKeyPage && !p.isCoverPage && (p.extractedQuestionNumbers?.length || 0) === 0
        );
        for (const p of emptyDone) {
          p.status = 'pending';
          p.errorMessage = undefined;
          await saveParser2Page(p);
        }
      }
      await addParser2Log(
        jobId,
        'ocr',
        `Retry Failed Pages: Queued ${failedOrRetryPages.length} failed/retry_required page(s) while preserving ${questions.length} saved question(s).`,
        'info'
      );
    } else if (questions.length === 0 && pages.length > 0) {
      for (const p of pages) {
        p.status = 'pending';
        p.errorMessage = undefined;
        await saveParser2Page(p);
      }
      await addParser2Log(
        jobId,
        'ocr',
        `Retry Failed Pages: 0 saved questions found across ${pages.length} page(s). Reset all pages to pending for full re-extraction.`,
        'info'
      );
    } else {
      await addParser2Log(
        jobId,
        'validation',
        `Retry Failed Stage (${job.failedStage || 'validation'}): Re-running cross-page stitching, validation & DB save verification.`,
        'info'
      );
    }

    return this.startJob(jobId);
  }

  public async retryFailedStage(jobId: string): Promise<boolean> {
    return this.retryFailedPages(jobId);
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
    const expCfg = this.resolveExpectedConfig(job);
    const report = validationEngine.auditQuestions(jobId, refreshed, expCfg.expected, {
      savedQuestions: refreshed.length,
      figuresExtracted: allFigures.length,
      expectedSource: expCfg.source
    });
    await saveParser2ValidationReport(report);
    job.figureCount = allFigures.length;
    job.verifiedQuestions = refreshed.filter(item => item.verificationStatus === 'verified').length;
    job.reviewRequiredCount = refreshed.filter(item => item.reviewRequired).length;
    job.qualityScore = report.qualityScore;
    job.reconciliation = report.reconciliation;
    job.qualityBreakdown = report.qualityBreakdown;
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

    // Sync centralized provider rate-limiter configuration from settings
    apiRateLimiter.configureProvider('gemini', {
      maxConcurrency: settings.geminiMaxConcurrency ?? 1,
      minIntervalMs: settings.geminiCooldownMs ?? 1800,
      maxRetries: settings.maxApiRetries ?? 4
    });
    apiRateLimiter.configureProvider('mistral', {
      maxConcurrency: settings.mistralMaxConcurrency ?? 1,
      minIntervalMs: settings.mistralCooldownMs ?? 1200,
      maxRetries: Math.min(3, settings.maxApiRetries ?? 3)
    });

    // Live retry status reporter -> surfaces real-time 429/backoff status to admin UI & logs
    const onProviderRetry = (notice: RetryNotice) => {
      job.retryCount = (job.retryCount || 0) + 1;
      job.rateLimitStatus = {
        active: true,
        provider: notice.provider,
        retryAttempt: notice.attempt,
        maxRetries: notice.maxRetries,
        nextRetryAt: notice.nextRetryAt,
        message: `${notice.label}: ${notice.reason}`
      };
      job.currentStage = `Rate-limit backoff (${notice.provider.toUpperCase()} retry ${notice.attempt}/${notice.maxRetries})`;
      job.lastActivityAt = new Date().toISOString();
      saveParser2Job(job, { syncRemote: false }).catch(() => {});
      addParser2Log(
        jobId,
        notice.provider === 'gemini' ? 'gemini_verification' : 'ocr',
        `${notice.label}: ${notice.reason}`,
        'warn'
      ).catch(() => {});
    };

    // 1. Load Question PDF buffer from storage
    job.status = 'extracting';
    job.currentStage = 'Reading PDF pages & metadata';
    job.rateLimitStatus = null;
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);

    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer || pdfBuffer.length < 100) {
      job.failedStage = 'pdf_retrieval';
      throw new Error('questions.pdf not found or empty in job storage (R2/local).');
    }
    const pdfHeaderCheck = pdfBuffer.subarray(0, 1024).toString('latin1');
    if (!pdfHeaderCheck.includes('%PDF-')) {
      job.failedStage = 'pdf_integrity';
      throw new Error('Uploaded questions.pdf binary failed integrity check (missing %PDF header).');
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

    // 4. Page-Level Checkpoint Processing Loop (persists questions + page status + job counters after EVERY single page)
    const allPages = await getParser2Pages(jobId);
    const pendingPages = allPages.filter(
      p =>
        !isPageCompletedStatus(p.status) &&
        p.status !== 'failed' &&
        p.status !== 'dead_letter'
    );

    const expCfg = this.resolveExpectedConfig(job);
    let quotaExhaustedShortCircuit = false;
    let quotaExhaustedReason = '';

    for (const page of pendingPages) {
      if (signal.aborted) {
        console.log(`[JobQueue] Job ${jobId} aborted.`);
        return;
      }

      if (quotaExhaustedShortCircuit) {
        // Provider quota is completely exhausted across all fallback models -> mark remaining pages retry_waiting without hammering API
        page.status = 'retry_waiting';
        page.ocrStatus = 'failed';
        page.extractionStatus = 'skipped';
        page.errorMessage = quotaExhaustedReason || 'Upstream AI provider quota exhausted; queued for retry once quota resets.';
        await saveParser2Page(page);
        continue;
      }

      job.status = 'ocr_in_progress';
      this.touchJobHeartbeat(job, `Extracting Page ${page.pageNumber} / ${totalPages} (${job.ocrEngine.toUpperCase()})`, page.pageNumber);
      await saveParser2Job(job, { syncRemote: false });

      // ApiRateLimiter already performs exponential backoff + jitter + Retry-After retries per API call,
      // so we do NOT multiply calls with blind outer retry loops that cause 429 storms.
      const pageOutcome = await this.processSinglePage(jobId, job, page, pdfBuffer, job.subject, settings, totalPages, signal, onProviderRetry);
      if (pageOutcome?.quotaExhausted) {
        quotaExhaustedShortCircuit = true;
        quotaExhaustedReason = pageOutcome.errorMessage || 'Upstream AI provider daily/billing quota exhausted across all configured models.';
        await addParser2Log(
          jobId,
          'gemini_verification',
          `Short-circuiting remaining pages because all configured AI provider models exhausted quota: ${quotaExhaustedReason}`,
          'warn'
        );
      }

      // Immediate per-page checkpoint sync: even if server restarts mid-job, all saved pages & questions are durable!
      const updatedPages = await getParser2Pages(jobId);
      const completed = updatedPages.filter(p => isPageCompletedStatus(p.status)).length;
      const failed = updatedPages.filter(p =>
        p.status === 'failed' || p.status === 'retry_required' || p.status === 'retry_waiting' || p.status === 'stalled' || p.status === 'dead_letter'
      ).length;
      const currentQuestions = await getParser2Questions(jobId);
      const currentFigures = await getParser2Figures(jobId);
      const liveReport = validationEngine.auditQuestions(jobId, currentQuestions, expCfg.expected, {
        savedQuestions: currentQuestions.length,
        figuresExtracted: currentFigures.length,
        expectedSource: expCfg.source
      });

      job.status = 'structuring';
      job.rateLimitStatus = null;
      this.touchJobHeartbeat(job, `Checkpoint: ${completed}/${totalPages} pages saved (${currentQuestions.length} Qs persisted)`, page.pageNumber);
      job.completedPages = completed;
      job.failedPages = failed;
      job.pagesAttempted = updatedPages.filter(p => p.status !== 'pending').length;
      job.ocrCompletedPages = updatedPages.filter(p => p.ocrStatus === 'completed' || isPageCompletedStatus(p.status)).length;
      job.extractedPages = updatedPages.filter(p => p.extractionStatus === 'completed' || isPageCompletedStatus(p.status)).length;
      job.totalQuestions = currentQuestions.length;
      job.questionsDetected = Math.max(job.questionsDetected || 0, currentQuestions.length);
      job.questionsSaved = currentQuestions.length;
      job.savedVerified = currentQuestions.length > 0;
      job.figureCount = currentFigures.length;
      job.verifiedQuestions = currentQuestions.filter(q => q.verificationStatus === 'verified').length;
      job.reviewRequiredCount = currentQuestions.filter(q => q.reviewRequired).length;
      job.manuallyEditedCount = currentQuestions.filter(q => q.isManuallyEdited).length;
      job.qualityScore = liveReport.qualityScore;
      job.reconciliation = liveReport.reconciliation;
      job.qualityBreakdown = liveReport.qualityBreakdown;
      job.estimatedCostUsd = Number(((completed * settings.estimatedCostPerPageCent) / 100).toFixed(4));

      await saveParser2Job(job);
    }

    // 4a. Cross-page continuation stitching for incomplete questions at page boundaries
    if (!signal.aborted) {
      this.touchJobHeartbeat(job, 'Cross-page & sequence-gap recovery', null);
      await saveParser2Job(job, { syncRemote: false });
      await this.stitchCrossPageContinuations(jobId, job, pdfBuffer, job.subject, settings, totalPages, signal);
    }
    if (signal.aborted) {
      console.log(`[JobQueue] Job ${jobId} aborted before validation stage.`);
      return;
    }

    // 4b. Apply any pre-uploaded / stored answer keys & mark missing answers honestly
    job.status = 'validation';
    job.rateLimitStatus = null;
    this.touchJobHeartbeat(job, 'Matching Answer Keys & Running Quality Audit', null);
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

    // 5. Saving & Final Verification Gate before marking completed/review_required/failed
    job.status = 'saving';
    this.touchJobHeartbeat(job, 'Verifying Database Persistence & Running Quality Audit', null);
    await saveParser2Job(job);

    const persistenceVerify = await verifyJobQuestionsPersisted(jobId, finalQuestions.length);

    const updatedPagesFinal = await getParser2Pages(jobId);
    const completedFinal = updatedPagesFinal.filter(p => isPageCompletedStatus(p.status)).length;
    const retryableFinal = updatedPagesFinal.filter(p => p.status === 'retry_required' || p.status === 'retry_waiting').length;
    const deadLetterFinal = updatedPagesFinal.filter(p => p.status === 'dead_letter').length;
    const failedFinal = updatedPagesFinal.filter(
      p => p.status === 'failed' || p.status === 'retry_required' || p.status === 'retry_waiting' || p.status === 'stalled' || p.status === 'dead_letter'
    ).length;
    const currentFigsFinal = await getParser2Figures(jobId);

    const report = validationEngine.auditQuestions(jobId, finalQuestions, expCfg.expected, {
      savedQuestions: persistenceVerify.savedCount,
      figuresExtracted: currentFigsFinal.length,
      expectedSource: expCfg.source
    });
    await saveParser2ValidationReport(report);

    const pageErrors = updatedPagesFinal
      .filter(p => !isPageCompletedStatus(p.status) && p.errorMessage)
      .map(p => `Pg ${p.pageNumber}: ${p.errorMessage}`);

    const needsReviewFinal = report.criticalErrorsCount > 0 || finalQuestions.some(q => q.reviewRequired);
    job.completedPages = completedFinal;
    job.failedPages = failedFinal;
    job.totalQuestions = finalQuestions.length;
    job.questionsDetected = Math.max(job.questionsDetected || 0, finalQuestions.length);
    job.questionsSaved = persistenceVerify.savedCount;
    job.savedVerified = persistenceVerify.verified && persistenceVerify.savedCount > 0;
    job.figureCount = currentFigsFinal.length;
    job.verifiedQuestions = finalQuestions.filter(q => q.verificationStatus === 'verified').length;
    job.reviewRequiredCount = finalQuestions.filter(q => q.reviewRequired).length;
    job.manuallyEditedCount = finalQuestions.filter(q => q.isManuallyEdited).length;
    job.hasAnswerKey = Object.keys(storedKeys).length > 0;
    job.qualityScore = report.qualityScore;
    job.reconciliation = report.reconciliation;
    job.qualityBreakdown = report.qualityBreakdown;
    job.rateLimitStatus = null;
    job.lockOwnerId = undefined;
    job.lockExpiresAt = undefined;

    // Strict Zero-Question & Persistence Verification Gate:
    // A job MUST NEVER be marked completed or review_required when 0 questions were extracted/saved!
    if (finalQuestions.length === 0 || persistenceVerify.savedCount === 0) {
      job.status = 'failed';
      job.failedStage = quotaExhaustedShortCircuit ? 'api_quota_exhausted' : failedFinal > 0 ? 'ocr_extraction' : 'question_extraction';
      job.currentStage = quotaExhaustedShortCircuit
        ? `Provider Quota Exhausted (${retryableFinal} page(s) waiting) — 0 Qs Saved`
        : retryableFinal > 0
        ? `Rate-Limited / Retry Required (${retryableFinal} page(s)) — 0 Qs Saved`
        : 'Extraction Failed — 0 Questions Saved';
      job.errorMessage =
        quotaExhaustedReason ||
        (pageErrors.length > 0
          ? `0 questions extracted across ${totalPages} page(s). ${pageErrors.slice(0, 2).join(' | ')}`
          : `0 questions extracted or saved from ${totalPages} page(s). Inspect Diagnostics tab and click Retry Failed Pages.`);
    } else if (!persistenceVerify.verified) {
      job.status = 'failed';
      job.failedStage = 'saving';
      job.currentStage = 'Save Verification Failed — Database Mismatch';
      job.errorMessage = `Database save mismatch: extracted ${finalQuestions.length} question(s), verified ${persistenceVerify.savedCount} saved.`;
    } else if (failedFinal > 0 || needsReviewFinal) {
      job.status = 'review_required';
      job.failedStage = failedFinal > 0 ? 'ocr_extraction' : undefined;
      job.currentStage =
        retryableFinal > 0
          ? `Partial Checkpoint Saved (${persistenceVerify.savedCount} Qs) — ${retryableFinal} Page(s) Need Retry`
          : deadLetterFinal > 0
          ? `Review Required (${deadLetterFinal} dead-letter page(s), ${persistenceVerify.savedCount} Qs saved)`
          : failedFinal > 0
          ? `Review Required (${failedFinal} page(s) failed, ${persistenceVerify.savedCount} Qs saved)`
          : 'Completed with Review Items Flagged';
      job.errorMessage = failedFinal > 0 ? pageErrors.slice(0, 2).join(' | ') : undefined;
    } else {
      job.status = 'completed';
      job.failedStage = undefined;
      job.currentStage = 'Ready for Admin Review & Publishing';
      job.errorMessage = undefined;
    }

    job.lastActivityAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    await saveParser2Job(job);

    await addParser2Log(
      jobId,
      'validation',
      `Pipeline finished (${job.status}). Saved & verified ${persistenceVerify.savedCount} Qs in database. Quality Score: ${report.qualityScore === null ? 'N/A' : `${report.qualityScore}%`} (${job.reviewRequiredCount} review flagged, ${job.figureCount} figures).${job.errorMessage ? ` Detail: ${job.errorMessage}` : ''}`,
      job.status === 'failed' ? 'error' : report.canPublish && persistenceVerify.verified ? 'success' : 'warn'
    );
  }

  /**
   * Process a single page through the complete source-aware pipeline:
   * Render 200 DPI -> Mistral OCR / GS Fallback -> Gemini Vision -> Chem Simple/Complex Filter ->
   * Metric & Visual Crop Gate -> Targeted Recovery for Missing Figure/Options -> Strict 6-Status Assignment
   */
  private async processSinglePage(
    jobId: string,
    job: Parser2Job,
    page: Parser2Page,
    pdfBuffer: Buffer,
    subject: Parser2Subject,
    settings: Parser2Settings,
    totalPages: number,
    signal: AbortSignal,
    onRetry?: (notice: RetryNotice) => void
  ): Promise<{ quotaExhausted?: boolean; errorMessage?: string }> {
    const startTime = Date.now();
    const requestStartedIso = new Date(startTime).toISOString();
    page.status = 'ocr_in_progress';
    page.ocrStatus = 'in_progress';
    page.extractionStatus = 'pending';
    page.requestStartedAt = requestStartedIso;
    page.heartbeatAt = requestStartedIso;
    page.retryAttempts = (page.retryAttempts || 0) + 1;
    await saveParser2Page(page, { syncRemote: false });

    const dpi = Math.max(180, settings.figureDpi || 200);
    const geminiModel = job.geminiModel || settings.geminiModel || 'gemini-4-hydrogen';
    const mistralModel = job.mistralModel || settings.mistralModel || 'mistral-ocr-latest';
    const allowFallback = job.allowProviderFallback ?? settings.allowProviderFallback ?? true;
    const autoScanKey = job.autoScanAnswerKey ?? settings.autoScanAnswerKey ?? true;
    const maxRetries = settings.maxApiRetries ?? 4;

    const shouldUseMistral =
      (job.ocrEngine === 'mistral' || job.ocrEngine === 'hybrid') &&
      settings.mistralOcrEnabled !== false;
    const shouldUseGemini =
      job.ocrEngine === 'gemini' ||
      job.ocrEngine === 'hybrid' ||
      job.enableGeminiVerification ||
      allowFallback;

    let providerUsed: string = job.ocrEngine;
    let modelUsed: string = job.ocrEngine === 'mistral' && !job.enableGeminiVerification ? mistralModel : geminiModel;
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    try {
      // Stage 1: Render high-DPI page PNG with hard 45s timeout so Ghostscript/pdfjs can never hang forever
      this.touchJobHeartbeat(job, `Rendering Page ${page.pageNumber} / ${totalPages}`, page.pageNumber);
      const pageImageBuffer = await Promise.race([
        figureExtractionService.renderPdfPageToPng(pdfBuffer, page.pageNumber, dpi),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`PDF Page ${page.pageNumber} render timed out after 45s`)), 45_000)
        )
      ]);

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

      // Stage 2: OCR Extraction (strictly honoring configured ocrEngine & explicit fallback policy)
      let ocrMarkdown = '';
      if (shouldUseMistral) {
        if (mistralOcrService.isConfigured()) {
          const base64DataUrl = `data:image/png;base64,${pageImageBuffer.toString('base64')}`;
          const ocrResp = await mistralOcrService.processPageImage(base64DataUrl, true, {
            model: mistralModel,
            label: `Page ${page.pageNumber} Mistral OCR`,
            maxRetries: Math.min(3, maxRetries),
            onRetry
          });
          if (ocrResp.pages && ocrResp.pages.length > 0 && ocrResp.pages[0].markdown?.trim()) {
            ocrMarkdown = ocrResp.pages[0].markdown;
            providerUsed = job.ocrEngine === 'hybrid' || job.enableGeminiVerification ? 'hybrid' : 'mistral';
          } else if (ocrResp.error) {
            if (!shouldUseGemini) {
              throw new Error(`Mistral OCR failed on Page ${page.pageNumber}: ${ocrResp.error}`);
            }
            fallbackUsed = true;
            fallbackReason = `Mistral OCR unavailable (${ocrResp.error}); switched to Gemini Vision`;
            providerUsed = 'gemini';
            await addParser2Log(jobId, 'ocr', `Page ${page.pageNumber}: ${fallbackReason}`, 'warn');
          }
        } else if (job.ocrEngine === 'mistral' && !shouldUseGemini) {
          throw new Error('MISTRAL_API_KEY is not configured in server environment and fallback is disabled.');
        } else if (job.ocrEngine === 'mistral' || job.ocrEngine === 'hybrid') {
          fallbackUsed = true;
          fallbackReason = 'MISTRAL_API_KEY not configured; using local PDF text + Gemini Vision';
          providerUsed = 'gemini';
        }
      }

      if (!ocrMarkdown || ocrMarkdown.trim().length === 0) {
        try {
          ocrMarkdown = await figureExtractionService.extractPdfPageText(pdfBuffer, page.pageNumber);
        } catch {}
      }

      page.ocrMarkdown = ocrMarkdown;
      page.status = 'ocr_completed';
      page.ocrStatus = 'completed';
      page.extractionStatus = 'in_progress';
      page.heartbeatAt = new Date().toISOString();
      this.touchJobHeartbeat(job, `Extracting Questions on Page ${page.pageNumber} / ${totalPages}`, page.pageNumber);
      await saveParser2Page(page, { syncRemote: false });

      // Stage 2b: Capture inline answer keys immediately after questions if present on this page
      if (autoScanKey && ocrMarkdown) {
        const inlineAns = answerKeyService.extractInlineAnswersFromPageText(ocrMarkdown, page.pageNumber);
        if (Object.keys(inlineAns).length > 0) {
          const existingKeys = await getParser2AnswerKeys(jobId);
          await saveParser2AnswerKeys(jobId, { ...existingKeys, ...inlineAns });
          await addParser2Log(
            jobId,
            'validation',
            `Page ${page.pageNumber}: Detected ${Object.keys(inlineAns).length} inline answer key(s) from page text.`,
            'info'
          );
        }
      }

      // Stage 3: Gemini Multimodal Verification & Parsing + Full-PDF Answer Key Detection
      page.status = 'extracting';
      let verifiedQuestions: any[] = [];
      const geminiCallOpts = {
        allowModelFallback: allowFallback,
        maxRetries,
        signal,
        onRetry,
        label: `Page ${page.pageNumber}`
      };

      if (shouldUseGemini && geminiVerificationService.isConfigured()) {
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

        const strippedOcr = (ocrMarkdown || '').replace(/@neetmbbsdoctors/gi, '').replace(/^Page\s+\d+\s*$/gim, '').trim();
        const isLikelyScannedPage = strippedOcr.length < 320;
        const mentionsKeySheet = /answer\s*key|hints\s*&?\s*solutions|key\s*sheet/i.test(ocrMarkdown || '');

        // Full-PDF Answer Key Scan: check deterministic text key tables on ANY page, and Vision key check on key-heading / trailing pages
        if (autoScanKey) {
          const detKeyEntries = !/\b\d{1,3}\s*[\.\)]\s*[A-Za-z]{6,}[\s\S]{15,}\([1-4A-D]\)/.test(ocrMarkdown || '')
            ? answerKeyService.parseAnswerKeyText(ocrMarkdown || '', 'pdf_page')
            : {};
          const detKeyCount = Object.keys(detKeyEntries).length;

          if (detKeyCount >= 12 || mentionsKeySheet || page.pageNumber === totalPages) {
            const keyDetect =
              detKeyCount >= 12 && !mentionsKeySheet
                ? {
                    isAnswerKeyPage: true,
                    entries: Object.values(detKeyEntries).map(e => ({
                      questionNumber: e.questionNumber,
                      answer: e.verifiedAnswer,
                      rawAnswer: e.rawAnswer,
                      explanation: e.explanation
                    }))
                  }
                : await geminiVerificationService.detectAndParseAnswerKeyPage(
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
                  explanation: entry.explanation,
                  sourcePage: page.pageNumber,
                  confidence: 95,
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

              page.status = 'page_completed';
              page.isAnswerKeyPage = true;
              page.ocrStatus = 'completed';
              page.extractionStatus = 'completed';
              page.errorMessage = undefined;
              page.providerUsed = providerUsed;
              page.modelUsed = modelUsed;
              page.fallbackUsed = fallbackUsed;
              page.fallbackReason = fallbackReason;
              page.processingTimeMs = Date.now() - startTime;
              page.extractedQuestionNumbers = [];
              page.questionsDetectedCount = 0;
              page.questionsExtractedCount = 0;
              page.questionsSavedCount = 0;
              page.figuresDetectedCount = 0;
              page.figuresSavedCount = 0;
              page.questionsReviewCount = 0;
              page.checkpointAt = nowIso;
              page.heartbeatAt = nowIso;
              await saveParser2Page(page);
              await addParser2Log(
                jobId,
                'validation',
                `Auto-detected Answer Key on Page ${page.pageNumber} (${keyDetect.entries.length} keys extracted and saved in ${page.processingTimeMs}ms).`,
                'success'
              );
              return {};
            }
          }
        }

        if (isLikelyScannedPage && page.pageNumber <= totalPages) {
          // Direct High-Res Two-Column English Split Pass for scanned image pages
          let twoColErr: any = null;
          try {
            verifiedQuestions = await geminiVerificationService.verifyTwoColumnEnglishPage(
              page.pageNumber,
              pageImageBuffer,
              ocrMarkdown || `Page ${page.pageNumber}`,
              subject,
              geminiModel,
              prevPageTailContext || prevPageLastQNum,
              geminiCallOpts
            );
          } catch (err: any) {
            twoColErr = err;
            const errCat = classifyApiError(err);
            // CRITICAL: If two-column failed due to 429 rate-limit, quota exhaustion, or permanent error, DO NOT spam a full-page call on top of it!
            if (errCat === 'rate_limit' || errCat === 'quota_exhausted' || errCat === 'permanent') {
              throw err;
            }
            await addParser2Log(
              jobId,
              'gemini_verification',
              `Page ${page.pageNumber} two-column split pass error (${err?.message || 'unknown'}); trying full-page vision pass.`,
              'warn'
            );
            verifiedQuestions = [];
          }

          if (verifiedQuestions.length === 0) {
            try {
              verifiedQuestions = await geminiVerificationService.verifyPageQuestions(
                page.pageNumber,
                pageImageBuffer,
                ocrMarkdown || `Page ${page.pageNumber}`,
                subject,
                geminiModel,
                geminiCallOpts
              );
            } catch (fullErr: any) {
              throw twoColErr || fullErr;
            }
            // CRITICAL: Never silently mark a page completed with 0 Qs when an upstream API error occurred!
            if (verifiedQuestions.length === 0 && twoColErr) {
              throw twoColErr;
            }
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
            geminiModel,
            geminiCallOpts
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
              page.status = 'page_completed';
              page.isAnswerKeyPage = true;
              page.ocrStatus = 'completed';
              page.extractionStatus = 'completed';
              page.errorMessage = undefined;
              page.providerUsed = providerUsed;
              page.modelUsed = modelUsed;
              page.fallbackUsed = fallbackUsed;
              page.fallbackReason = fallbackReason;
              page.processingTimeMs = Date.now() - startTime;
              page.extractedQuestionNumbers = [];
              page.questionsDetectedCount = 0;
              page.questionsExtractedCount = 0;
              page.questionsSavedCount = 0;
              page.figuresDetectedCount = 0;
              page.figuresSavedCount = 0;
              page.questionsReviewCount = 0;
              page.checkpointAt = nowIso;
              page.heartbeatAt = nowIso;
              await saveParser2Page(page);
              await addParser2Log(
                jobId,
                'validation',
                `Auto-detected Answer Key on Page ${page.pageNumber} (${keyDetect.entries.length} keys extracted and saved in ${page.processingTimeMs}ms).`,
                'success'
              );
              return {};
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
              prevPageTailContext || prevPageLastQNum,
              geminiCallOpts
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
                  const prevNorm = normalizeVerifiedOptionsList(prev.verifiedOptions);
                  const sqNorm = normalizeVerifiedOptionsList(sq.verifiedOptions);
                  const mergedOpts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
                    const pOpt = prevNorm.find(o => o.label === lbl)?.value?.trim() || '';
                    const sOpt = sqNorm.find(o => o.label === lbl)?.value?.trim() || '';
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
        if (signal.aborted) return {};
        if (!vq.questionNumber) continue;
        this.touchJobHeartbeat(job, `Extracting Page ${page.pageNumber} / ${totalPages} — Q${vq.questionNumber}`, page.pageNumber);
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

        // Stage 4a-pre: Normalize raw option labels (1/2/3/4, a/b/c/d, i/ii/iii/iv -> A/B/C/D)
        // and rescue MCQ options accidentally emitted inside structuredTableData (e.g. 2x2 box choices)
        vq.verifiedOptions = normalizeVerifiedOptionsList(vq.verifiedOptions);
        const rescuedFromTable = this.rescueOptionsFromStructuredTable(vq.structuredTableData);
        if (rescuedFromTable.rescuedCount >= 2) {
          const existingMap = new Map<string, string>();
          for (const o of (vq.verifiedOptions || [])) {
            const normLbl = normalizeOptionLabel(o?.label);
            if (normLbl && o?.value && !isPlaceholderOption(o.value)) {
              existingMap.set(normLbl, o.value);
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
        const canonicalVerifiedOpts = normalizeVerifiedOptionsList(vq.verifiedOptions);
        let normalizedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
          const found = canonicalVerifiedOpts.find(o => o.label === lbl);
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

        // Stage 4b: Strict Visual-Option Gate (NEVER attach printed text/number/fraction snippets as option images!)
        // Only auto-crop optionBoundingBoxes when the question genuinely expects visual/graphical/structural options
        // AND the individual option does not already have clean extracted text.
        const allSimpleFormulaText = isAllSimpleChemicalFormulaOptions(normalizedOptions);
        const nonEmptyTextOptCount = normalizedOptions.filter(
          o => o.value && !isPlaceholderOption(o.value) && !/^\[Figure\s+[A-D]\]$/i.test(o.value)
        ).length;
        const rawOptBoxCount = vq.optionBoundingBoxes
          ? (['A', 'B', 'C', 'D'] as const).filter(
              k => Array.isArray(vq.optionBoundingBoxes?.[k]) && vq.optionBoundingBoxes![k]!.length === 4
            ).length
          : 0;
        const visualReqPre = detectVisualRequirement(
          cleanedQuestionText,
          normalizedOptions.map(o => o.value).join(' '),
          vq.reviewNotes
        );
        const expectsVisualOptionsForQ = Boolean(
          visualReqPre.expectsVisualOptions ||
          vq.isChemistryStructure ||
          vq.chemistryContentType === 'complex_structures' ||
          vq.chemistryContentType === 'mixed' ||
          /\b(?:correct\s+graph|following\s+graph|which\s+graph|plot\s+between|variation\s+of|circuit\s+diagram|logic\s+gate|ray\s+diagram|anti[\s-]?aromatic|aromatic\s+compound|structure\s+of|isomer\s+is|following\s+diagrams?|following\s+figures?|(?:is|are)\s+(?:best\s+)?(?:given|represented|shown)\s+(?:best\s+)?by|free[\s-]?body|force\s+diagram)\b/i.test(cleanedQuestionText) ||
          (nonEmptyTextOptCount === 0 && rawOptBoxCount >= 2)
        );

        let chemistryContentType: Parser2Question['chemistryContentType'] = vq.chemistryContentType || 'none';
        if (allSimpleFormulaText) {
          chemistryContentType = subject === 'Chemistry' ? 'simple_text' : chemistryContentType;
        } else if (vq.optionBoundingBoxes && expectsVisualOptionsForQ) {
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
            // Never overwrite an already-extracted clean text/numeric option with an auto-cropped snippet
            const existingOpt = normalizedOptions.find(o => o.label === optKey);
            if (existingOpt?.value && !isPlaceholderOption(existingOpt.value) && !/^\[Figure\s+[A-D]\]$/i.test(existingOpt.value)) {
              continue;
            }
            const validBox = boxCheck.validBoxes[optKey];
            if (!validBox) continue;

            const optFigRecord = await this.cropOptionFigureSafe({
              jobId,
              pageNumber: page.pageNumber,
              questionNumber: vq.questionNumber,
              optionLabel: optKey,
              pageImageBuffer,
              boundingBox: validBox,
              layoutMode,
              questionText: cleanedQuestionText,
              modelName: geminiModel
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
              const normRecOpts = normalizeVerifiedOptionsList(recovery.recoveredOptions);
              for (const ro of normRecOpts) {
                if (!ro.value || isPlaceholderOption(ro.value)) continue;
                const formatted = formatScientificMathAndPowers(ro.value.trim());
                const idx = normalizedOptions.findIndex(o => o.label === ro.label);
                if (idx >= 0 && (!normalizedOptions[idx].value || isPlaceholderOption(normalizedOptions[idx].value))) {
                  normalizedOptions[idx] = { ...normalizedOptions[idx], text: formatted, value: formatted };
                }
              }
            }

            if (recovery.recoveredOptionBoundingBoxes && expectsVisualOptionsForQ && !isAllSimpleChemicalFormulaOptions(normalizedOptions)) {
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
                  layoutMode: recLayoutMode,
                  questionText: cleanedQuestionText,
                  modelName: geminiModel
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

        // Discard hallucinated "Scale / Features" or synthetic graph-replacement tables, AND strip ANY option-duplicating table
        if (structuredTableData) {
          const sanitizedTbl = this.sanitizeStructuredTableAgainstOptions(
            structuredTableData,
            normalizedOptions,
            cleanedQuestionText,
            Boolean(visualReq.needsFigure || figureUrl)
          );
          if (sanitizedTbl.rescuedAny) {
            normalizedOptions = sanitizedTbl.updatedOptions;
          }
          structuredTableData = sanitizedTbl.structuredTable;
        }

        const sanitizedDetectedType =
          vq.detectedQuestionType === 'table_based' && !structuredTableData && !isTableQuestionPrompt(cleanedQuestionText)
            ? undefined
            : vq.detectedQuestionType;

        const resolvedQuestionType: Parser2Question['questionType'] =
          matchTableData?.rows?.length
            ? 'match_the_column'
            : sanitizedDetectedType ||
              (structuredTableData ? 'table_based' : figureUrl || visualReq.needsFigure ? 'diagram_based' : 'single_mcq');

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
          extractionEngine: providerUsed === 'mistral' ? 'mistral' : providerUsed === 'hybrid' ? 'hybrid' : 'gemini',
          providerUsed,
          modelUsed: vq.modelUsed || modelUsed,
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

      // Capture exact Gemini model/fallback metadata recorded during this page
      const geminiMeta = geminiVerificationService.getLastExecutionMeta(`page-${page.pageNumber}`);
      if (geminiMeta) {
        modelUsed = geminiMeta.modelUsed;
        if (geminiMeta.fallbackUsed) {
          fallbackUsed = true;
          fallbackReason = fallbackReason
            ? `${fallbackReason}; ${geminiMeta.fallbackReason || ''}`
            : geminiMeta.fallbackReason;
        }
      }

      // Transition page checkpoint: extracted -> validating -> saving -> page_completed
      page.status = 'validating';
      page.extractionStatus = 'completed';
      page.questionsDetectedCount = verifiedQuestions.length;
      page.questionsExtractedCount = verifiedQuestions.length;
      this.touchJobHeartbeat(job, `Saving ${pageQuestionsToUpsert.length} Qs from Page ${page.pageNumber}`, page.pageNumber);

      if (pageQuestionsToUpsert.length > 0) {
        page.status = 'saving';
        await upsertParser2Questions(jobId, pageQuestionsToUpsert);
      }
      if (pageFiguresToUpsert.length > 0) {
        await upsertParser2Figures(jobId, pageFiguresToUpsert);
      }

      const checkpointNow = new Date().toISOString();
      const elapsedMs = Date.now() - startTime;
      page.status = 'page_completed';
      page.ocrStatus = 'completed';
      page.extractionStatus = 'completed';
      page.errorMessage = undefined;
      page.providerUsed = providerUsed;
      page.modelUsed = modelUsed;
      page.fallbackUsed = fallbackUsed;
      page.fallbackReason = fallbackReason;
      page.questionsDetectedCount = verifiedQuestions.length;
      page.questionsExtractedCount = verifiedQuestions.length;
      page.questionsSavedCount = pageQuestionsToUpsert.length;
      page.figuresDetectedCount = pageFiguresToUpsert.length;
      page.figuresSavedCount = pageFiguresToUpsert.length;
      page.questionsReviewCount = pageQuestionsToUpsert.filter(q => q.reviewRequired).length;
      page.processingTimeMs = elapsedMs;
      page.responseTimeMs = geminiMeta?.responseTimeMs ?? elapsedMs;
      page.lastApiSummary =
        geminiMeta?.summary ||
        `OK via ${providerUsed}/${modelUsed} (${verifiedQuestions.length} detected, ${pageQuestionsToUpsert.length} saved, ${pageFiguresToUpsert.length} figs)`;
      page.extractedQuestionNumbers = verifiedQuestions.map(q => q.questionNumber).filter(Boolean);
      page.checkpointAt = checkpointNow;
      page.heartbeatAt = checkpointNow;
      await saveParser2Page(page);

      await addParser2Log(
        jobId,
        'ocr',
        `Page ${page.pageNumber} saved in ${page.processingTimeMs}ms (${pageQuestionsToUpsert.length} Qs saved via ${providerUsed}/${modelUsed}${fallbackUsed ? ` [fallback: ${fallbackReason}]` : ''}).`,
        'success'
      );
      return {};
    } catch (e: any) {
      const errCategory = classifyApiError(e);
      const errMsg = e?.message || 'Page extraction failed';
      const elapsedMs = Date.now() - startTime;

      // Smart Local Text Fallback when AI provider quota is exhausted AND PDF has selectable text layer
      if (errCategory === 'quota_exhausted' && allowFallback && (page.ocrMarkdown || '').trim().length >= 80) {
        const localExtracted = parser2LayoutEngine.parseQuestionsFromText(page.ocrMarkdown || '', subject, page.pageNumber);
        if (localExtracted.length > 0) {
          const nowIso = new Date().toISOString();
          const localQs: Parser2Question[] = localExtracted.map(lq => {
            const opts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
              const found = lq.options.find(o => o.label === lbl);
              const val = formatScientificMathAndPowers((found?.value || '').trim());
              return { label: lbl, text: val, value: val };
            });
            const stem = formatScientificMathAndPowers(lq.questionText || '');
            const strict = evaluateStrictQuestionStatus({
              questionType: lq.detectedType || 'single_mcq',
              questionText: stem,
              options: opts,
              matchTable: lq.matchTableData,
              structuredTable: lq.structuredTableData,
              confidenceScore: Math.min(72, lq.confidenceScore || 70),
              baseReviewRequired: true,
              reviewNotes: 'Extracted via deterministic PDF text fallback (AI provider quota exhausted); review recommended.'
            });
            return {
              id: `q-${jobId}-${lq.questionNumber}`,
              jobId,
              questionNumber: lq.questionNumber,
              subject,
              chapter: '',
              questionType: lq.detectedType || 'single_mcq',
              questionText: stem,
              options: opts,
              sourcePageNumber: page.pageNumber,
              sourcePageEnd: page.pageNumber,
              sourcePages: [page.pageNumber],
              sourcePageRange: `Page ${page.pageNumber}`,
              matchTable: lq.matchTableData,
              structuredTable: lq.structuredTableData,
              extractionEngine: 'local_text',
              providerUsed: 'local_text_fallback',
              modelUsed: 'deterministic_layout_engine',
              verificationStatus: strict.verificationStatus,
              confidenceScore: strict.confidenceScore,
              reviewRequired: true,
              reviewNotes: strict.reviewNotes,
              componentValidation: strict.componentValidation,
              createdAt: nowIso,
              updatedAt: nowIso
            };
          });
          await upsertParser2Questions(jobId, localQs);
          page.status = 'page_completed';
          page.ocrStatus = 'completed';
          page.extractionStatus = 'completed';
          page.providerUsed = 'local_text_fallback';
          page.modelUsed = 'deterministic_layout_engine';
          page.fallbackUsed = true;
          page.fallbackReason = `AI quota exhausted (${errMsg.slice(0, 120)}); used PDF text fallback`;
          page.questionsDetectedCount = localQs.length;
          page.questionsExtractedCount = localQs.length;
          page.questionsSavedCount = localQs.length;
          page.processingTimeMs = elapsedMs;
          page.responseTimeMs = elapsedMs;
          page.lastApiSummary = `Fallback local text extraction saved ${localQs.length} Qs (review required)`;
          page.extractedQuestionNumbers = localQs.map(q => q.questionNumber);
          page.checkpointAt = nowIso;
          await saveParser2Page(page);
          await addParser2Log(jobId, 'ocr', `Page ${page.pageNumber}: AI quota exhausted; saved ${localQs.length} Qs via local text fallback (flagged for review).`, 'warn');
          return {};
        }
      }

      // Dead-letter permanently failing pages after MAX_PAGE_DEAD_LETTER_ATTEMPTS
      const isDeadLetter =
        errCategory !== 'quota_exhausted' &&
        (page.retryAttempts || 1) >= MAX_PAGE_DEAD_LETTER_ATTEMPTS &&
        errCategory === 'permanent';

      page.status = isDeadLetter
        ? 'dead_letter'
        : errCategory === 'quota_exhausted'
        ? 'retry_waiting'
        : errCategory === 'rate_limit' || errCategory === 'transient'
        ? 'retry_required'
        : 'failed';
      page.deadLettered = isDeadLetter;
      page.ocrStatus = page.ocrMarkdown ? 'completed' : 'failed';
      page.extractionStatus = 'failed';
      page.errorMessage = errMsg;
      page.lastApiSummary = `Error [${errCategory}]: ${errMsg.slice(0, 180)}`;
      page.providerUsed = providerUsed;
      page.modelUsed = modelUsed;
      page.fallbackUsed = fallbackUsed;
      page.fallbackReason = fallbackReason;
      page.processingTimeMs = elapsedMs;
      page.responseTimeMs = elapsedMs;
      await saveParser2Page(page);

      await addParser2Log(
        jobId,
        'ocr',
        `Page ${page.pageNumber} marked ${page.status} (${errCategory}): ${errMsg}`,
        page.status === 'retry_required' || page.status === 'retry_waiting' ? 'warn' : 'error'
      );

      return {
        quotaExhausted: errCategory === 'quota_exhausted',
        errorMessage: errMsg
      };
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
    questionText?: string;
    modelName?: string;
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
      // STRICT GATE: Never attach invalid crops OR crops that look like printed text fragments / numbers!
      if (!metrics.valid || metrics.likelyTextOnly) {
        return null;
      }

      // Secondary visual verification gate to prevent printed words ("Block", "act on", "(3) 1") from ever attaching as option images
      if (geminiVerificationService.isConfigured()) {
        const visualCheck = await geminiVerificationService.validateCroppedFigureVisual(
          cropped.buffer,
          params.questionText || `Option ${params.optionLabel} for Question ${params.questionNumber}`,
          'diagram',
          params.modelName
        );
        if (
          visualCheck.isTextOnlyOrQuestionText ||
          visualCheck.detectedType === 'printed_text_error' ||
          !visualCheck.isGenuineScientificFigure
        ) {
          return null;
        }
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
    job: Parser2Job,
    pdfBuffer: Buffer,
    subject: Parser2Subject,
    settings: Parser2Settings,
    totalPages: number,
    signal?: AbortSignal
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
        if (signal?.aborted) return;
        this.touchJobHeartbeat(job, `Cross-boundary recovery (Q${q.questionNumber})`, null);
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
              const normRecovered = normalizeVerifiedOptionsList(rec.recoveredOptions);
              for (const ro of normRecovered) {
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
              const san = this.sanitizeStructuredTableAgainstOptions(
                rec.recoveredStructuredTableData,
                q.options,
                q.questionText,
                Boolean(q.figureUrl || detectVisualRequirement(q.questionText, '').needsFigure)
              );
              if (san.rescuedAny) {
                q.options = san.updatedOptions;
                changed = true;
              }
              if (san.structuredTable) {
                q.structuredTable = san.structuredTable;
                changed = true;
                if (rec.fromNextPage && nBuf) touchedNextPage = true;
              }
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
          if (signal?.aborted) return;
          this.touchJobHeartbeat(job, `Sequence-gap recovery (Q${missingNum})`, null);
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
              const normGapOpts = normalizeVerifiedOptionsList(rec.recoveredOptions);
              const recOpts: Parser2Question['options'] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
                const found = normGapOpts.find(o => o.label === lbl);
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
   * Targeted Admin Re-Extraction for a Single Question ('options' | 'question' | 'both').
   * Re-inspects the original high-res PDF page (+ next page if options cross a page boundary),
   * recovers clean normalized A-D options and/or full question stem, removes bogus text-fragment
   * auto-cropped option images when clean text options are recovered, and persists to D1.
   */
  public async reExtractSingleQuestion(
    jobId: string,
    questionId: string,
    mode: 'options' | 'question' | 'both' = 'options',
    opts?: { previewOnly?: boolean; allowOverwriteVerified?: boolean }
  ): Promise<{
    question: Parser2Question;
    preview?: Partial<Parser2Question> & {
      pageNumber: number;
      recoveredOptionCount: number;
      removedDuplicateTable: boolean;
      recoveredFigureUrl?: string;
      changesSummary: string[];
    };
    previewOnly?: boolean;
    message: string;
  }> {
    const job = await getParser2JobById(jobId);
    if (!job) throw new Error('Job not found.');
    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) throw new Error('Question not found.');

    if (!opts?.previewOnly && !opts?.allowOverwriteVerified && q.verificationStatus === 'verified' && q.isManuallyEdited) {
      throw new Error(
        `Question ${q.questionNumber} is manually verified. Use Re-extract Preview to compare changes before overwriting.`
      );
    }

    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error(
        job.importSource && job.importSource !== 'pdf'
          ? `Question ${q.questionNumber} came from a ${job.importSource.toUpperCase()} import (no source PDF attached). Use Edit to modify it directly.`
          : 'Original source PDF is not available in job storage for re-extraction.'
      );
    }

    const totalPages = Math.max(1, job.totalPages || (await this.getPdfPageCount(pdfBuffer)));
    const pageNum = Math.max(1, Math.min(totalPages, q.sourcePageNumber || 1));
    let pageImg: Buffer;
    try {
      pageImg = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pageNum, 200);
    } catch (renderErr: any) {
      throw new Error(`Failed to render PDF Page ${pageNum} for Q${q.questionNumber}: ${renderErr?.message || 'PDF render error'}`);
    }

    let nextPageImg: Buffer | undefined;
    if ((mode === 'options' || mode === 'both') && pageNum < totalPages) {
      try {
        nextPageImg = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pageNum + 1, 180);
      } catch {}
    }

    const visualReqOrig = detectVisualRequirement(q.questionText || '', (q.options || []).map(o => o.value || '').join(' '));
    const recovery = await geminiVerificationService.recoverMissingQuestionContent({
      pageNumber: pageNum,
      pageImageBuffer: pageImg,
      questionNumber: q.questionNumber,
      currentQuestionText: q.questionText || '',
      currentOptions: (q.options || []).map(o => ({ label: o.label, value: o.value || o.text || '' })),
      missingFigure: (mode === 'question' || mode === 'both') && (!q.figureUrl && (visualReqOrig.needsFigure || q.questionType === 'diagram_based')),
      missingOptions: mode === 'options' || mode === 'both',
      truncatedText: mode === 'question' || mode === 'both',
      subject: q.subject || job.subject || 'Combined',
      nextPageImageBuffer: nextPageImg,
      modelName: job.geminiModel
    });

    const changesSummary: string[] = [];
    let nextQuestionText = q.questionText;
    if ((mode === 'question' || mode === 'both') && recovery.recoveredQuestionText && recovery.recoveredQuestionText.trim().length >= 8) {
      const cleanedStem = formatScientificMathAndPowers(recovery.recoveredQuestionText.trim());
      if (cleanedStem !== q.questionText) {
        nextQuestionText = cleanedStem;
        changesSummary.push('Updated question stem from high-res PDF page');
      }
    }

    let nextOptions: Parser2Question['options'] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
      const existing = (q.options || []).find(o => normalizeOptionLabel(o.label) === lbl);
      return existing
        ? { ...existing, label: lbl }
        : { label: lbl, text: '', value: '' };
    });
    const nextOptFigs: { [label: string]: string } = { ...(q.optionFigures || {}) };
    let recoveredOptCount = 0;

    if ((mode === 'options' || mode === 'both') && recovery.recoveredOptions && recovery.recoveredOptions.length > 0) {
      const normRec = normalizeVerifiedOptionsList(recovery.recoveredOptions);
      for (const ro of normRec) {
        const cleanVal = formatScientificMathAndPowers((ro.value || '').trim());
        if (!cleanVal || isPlaceholderOption(cleanVal) || /^\[Figure\s+[A-D]\]$/i.test(cleanVal)) continue;
        const idx = nextOptions.findIndex(o => o.label === ro.label);
        if (idx >= 0) {
          delete nextOptFigs[ro.label];
          nextOptions[idx] = {
            ...nextOptions[idx],
            label: ro.label,
            text: cleanVal,
            value: cleanVal,
            imageUrl: undefined,
            isVisualOption: false
          };
          recoveredOptCount++;
        }
      }
    }

    // If options are genuinely visual diagrams (0 text options extracted) and Gemini returned optionBoundingBoxes, crop them!
    const textOptAfterCount = nextOptions.filter(o => o.value && !isPlaceholderOption(o.value) && !/^\[Figure\s+[A-D]\]$/i.test(o.value)).length;
    if ((mode === 'options' || mode === 'both') && textOptAfterCount === 0 && recovery.recoveredOptionBoundingBoxes) {
      const recBuf = recovery.fromNextPage && nextPageImg ? nextPageImg : pageImg;
      const recPg = recovery.fromNextPage && nextPageImg ? pageNum + 1 : pageNum;
      const boxCheck = figureExtractionService.validateOptionBoundingBoxes(
        recovery.recoveredOptionBoundingBoxes,
        (recovery.pageLayout as any) || q.pageLayout || 'two_column_english'
      );
      for (const optKey of ['A', 'B', 'C', 'D'] as const) {
        const box = boxCheck.validBoxes[optKey];
        if (!box) continue;
        const optFig = await this.cropOptionFigureSafe({
          jobId,
          pageNumber: recPg,
          questionNumber: q.questionNumber,
          optionLabel: optKey,
          pageImageBuffer: recBuf,
          boundingBox: box,
          layoutMode: (recovery.pageLayout as any) || q.pageLayout || 'two_column_english',
          questionText: nextQuestionText,
          modelName: job.geminiModel
        });
        if (optFig) {
          nextOptFigs[optKey] = optFig.figureUrl;
          const idx = nextOptions.findIndex(o => o.label === optKey);
          if (idx >= 0) {
            nextOptions[idx] = {
              ...nextOptions[idx],
              label: optKey,
              text: `[Figure ${optKey}]`,
              value: `[Figure ${optKey}]`,
              imageUrl: optFig.figureUrl,
              isVisualOption: true
            };
          }
          recoveredOptCount++;
        }
      }
      if (recoveredOptCount > 0) {
        changesSummary.push(`Cropped ${recoveredOptCount}/4 visual diagram options`);
      }
    } else if (recoveredOptCount > 0) {
      changesSummary.push(`Recovered ${recoveredOptCount}/4 text options`);
    }

    // Recover missing primary diagram/graph if requested (e.g. velocity-time graph)
    let nextFigureUrl = q.figureUrl;
    let nextFigures = q.figures || [];
    let recoveredFigureRecord: Parser2Figure | undefined;
    if (
      (mode === 'question' || mode === 'both') &&
      !nextFigureUrl &&
      recovery.recoveredDiagramBoundingBox &&
      recovery.recoveredDiagramBoundingBox.length === 4
    ) {
      const targetBuf = recovery.fromNextPage && nextPageImg ? nextPageImg : pageImg;
      const targetPg = recovery.fromNextPage && nextPageImg ? pageNum + 1 : pageNum;
      try {
        const cropRes = await this.validateAndCropPrimaryFigure({
          jobId,
          pageNumber: targetPg,
          questionNumber: q.questionNumber,
          questionText: nextQuestionText,
          pageImageBuffer: targetBuf,
          boundingBox: recovery.recoveredDiagramBoundingBox,
          figureType: (recovery.recoveredDiagramType as any) || 'diagram',
          layoutMode: (recovery.pageLayout as any) || q.pageLayout || 'two_column_english',
          modelName: job.geminiModel
        });
        if (cropRes.figureRecord) {
          recoveredFigureRecord = cropRes.figureRecord;
          nextFigureUrl = cropRes.figureRecord.figureUrl;
          nextFigures = [cropRes.figureRecord, ...nextFigures];
          changesSummary.push(`Extracted missing ${cropRes.figureRecord.figureType || 'diagram'} from Page ${targetPg}`);
        }
      } catch {}
    }

    const nextMatchTable =
      recovery.recoveredMatchTableData?.rows?.length && (!q.matchTable?.rows?.length || mode !== 'options')
        ? recovery.recoveredMatchTableData
        : q.matchTable;
    let candidateStructuredTable =
      !nextMatchTable?.rows?.length && recovery.recoveredStructuredTableData?.rows?.length && (!q.structuredTable?.rows?.length || mode !== 'options')
        ? recovery.recoveredStructuredTableData
        : q.structuredTable;

    // Sanitize existing or newly returned structuredTable so option-only or synthetic graph tables are removed & options rescued!
    let removedDuplicateTable = false;
    if (candidateStructuredTable) {
      const san = this.sanitizeStructuredTableAgainstOptions(
        candidateStructuredTable,
        nextOptions,
        nextQuestionText,
        Boolean(nextFigureUrl || detectVisualRequirement(nextQuestionText, '').needsFigure)
      );
      if (san.rescuedAny) {
        nextOptions = san.updatedOptions;
        recoveredOptCount = Math.max(recoveredOptCount, san.rescuedCount);
        changesSummary.push('Rescued missing options from misclassified Data Table');
      }
      if (!san.structuredTable) {
        removedDuplicateTable = true;
        changesSummary.push('Removed bogus option/graph Data Table');
      }
      candidateStructuredTable = san.structuredTable;
    }

    const nextQuestionType: Parser2Question['questionType'] =
      nextMatchTable?.rows?.length
        ? 'match_the_column'
        : candidateStructuredTable?.rows?.length
        ? 'table_based'
        : nextFigureUrl || detectVisualRequirement(nextQuestionText, '').needsFigure
        ? 'diagram_based'
        : q.questionType === 'table_based' && !candidateStructuredTable
        ? 'single_mcq'
        : q.questionType;

    const strict = evaluateStrictQuestionStatus({
      questionType: nextQuestionType,
      questionText: nextQuestionText,
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      figureUrl: nextFigureUrl,
      matchTable: nextMatchTable,
      structuredTable: candidateStructuredTable,
      reviewNotes: '',
      confidenceScore: Math.max(q.confidenceScore || 85, recovery.confidenceScore || 90)
    });

    const summaryMsg =
      changesSummary.length > 0
        ? `Q${q.questionNumber} (Page ${pageNum}): ${changesSummary.join('; ')}.`
        : mode === 'options'
        ? `Re-extraction inspected Page ${pageNum} for Q${q.questionNumber}, but no additional option changes were found — use Edit or Crop.`
        : `Re-extraction inspected Page ${pageNum} for Q${q.questionNumber}; review the extracted preview below.`;

    if (opts?.previewOnly) {
      return {
        question: q,
        previewOnly: true,
        preview: {
          questionType: nextQuestionType,
          questionText: nextQuestionText,
          options: nextOptions,
          optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
          figureUrl: nextFigureUrl,
          figures: nextFigures,
          matchTable: nextMatchTable,
          structuredTable: candidateStructuredTable,
          verificationStatus: strict.verificationStatus,
          reviewRequired: strict.reviewRequired,
          reviewNotes: strict.reviewNotes,
          componentValidation: strict.componentValidation,
          confidenceScore: strict.confidenceScore,
          pageNumber: pageNum,
          recoveredOptionCount: recoveredOptCount,
          removedDuplicateTable,
          recoveredFigureUrl: recoveredFigureRecord?.figureUrl,
          changesSummary
        },
        message: summaryMsg
      };
    }

    if (recoveredFigureRecord) {
      await upsertParser2Figures(jobId, [recoveredFigureRecord]);
    }

    const updated = await updateParser2Question(jobId, questionId, {
      questionType: nextQuestionType,
      questionText: nextQuestionText,
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      figureUrl: nextFigureUrl,
      figures: nextFigures,
      figureAssetIds: nextFigures.map(f => f.id),
      matchTable: nextMatchTable,
      structuredTable: candidateStructuredTable,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation,
      confidenceScore: strict.confidenceScore
    });

    if (!updated) throw new Error('Failed to save re-extracted question.');

    await addParser2Log(
      jobId,
      'gemini_verification',
      `Admin re-extracted ${mode} for Q${q.questionNumber} (Page ${pageNum}): ${changesSummary.join('; ') || `${recoveredOptCount}/4 options updated`}.`,
      'success'
    );

    return { question: updated, message: summaryMsg };
  }

  /**
   * Rescues MCQ options (A)-(D) or (1)-(4) that Gemini occasionally puts into structuredTableData rows.
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
      // Pattern 1: Key-Value row like ["(1)", "25 N"] or ["(A)", "1"] or ["1.", "50 N"]
      if (row.length === 2) {
        const keyOnly = String(row[0] || '').trim().match(/^(?:\(([A-D1-4])\)|\[([A-D1-4])\]|([A-D1-4])[\.\):]?)$/i);
        if (keyOnly) {
          const lbl = mapLabel(keyOnly[1] || keyOnly[2] || keyOnly[3]);
          const val = String(row[1] || '').trim();
          if (lbl && val) {
            out[lbl] = val;
            matchedCells += 2;
            totalCells += 2;
            continue;
          }
        }
      }
      // Pattern 2: Cells containing inline markers like "(1) The back of seat...", "(A) Mass", "1. Foo", "A) Bar"
      for (const cell of row) {
        const txt = String(cell || '').trim();
        if (!txt) continue;
        totalCells++;
        const m = txt.match(/^(?:\(([A-D1-4])\)|\[([A-D1-4])\]|([A-D1-4])[\.\):])\s+(.+)$/i);
        if (m) {
          const lbl = mapLabel(m[1] || m[2] || m[3]);
          const val = (m[4] || '').trim();
          if (lbl && val) {
            out[lbl] = val;
            matchedCells++;
          }
        }
      }
    }

    const rescuedCount = Object.keys(out).length;
    const wasOptionOnlyTable = rescuedCount >= 2 && matchedCells >= Math.max(2, totalCells - 1);
    return { rescuedCount, options: out, wasOptionOnlyTable };
  }

  /**
   * Sanitizes structuredTableData against MCQ options & visual-diagram rules:
   * 1. Rescues any missing A-D options trapped inside a misclassified table.
   * 2. Strips any table that merely duplicates options (e.g. "Option | Value" or 4 numbered choices "(1)...(4)...").
   * 3. Strips synthetic descriptive tables substituted for a graph or physical apparatus drawing.
   */
  private sanitizeStructuredTableAgainstOptions(
    tableData: Parser2Question['structuredTable'],
    currentOptions: Parser2Question['options'],
    questionText: string,
    hasOrNeedsFigure: boolean
  ): {
    structuredTable: Parser2Question['structuredTable'] | undefined;
    updatedOptions: Parser2Question['options'];
    rescuedAny: boolean;
    rescuedCount: number;
  } {
    if (!tableData || !Array.isArray(tableData.rows) || tableData.rows.length === 0) {
      return { structuredTable: undefined, updatedOptions: currentOptions, rescuedAny: false, rescuedCount: 0 };
    }

    const rescued = this.rescueOptionsFromStructuredTable(tableData);
    let rescuedAny = false;
    const updatedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
      const existing = (currentOptions || []).find(o => o.label === lbl) || { label: lbl, text: '', value: '' };
      const existingValid = existing.value && !isPlaceholderOption(existing.value) && !/^\[Figure\s+[A-D]\]$/i.test(existing.value);
      if (!existingValid && rescued.options[lbl] && !isPlaceholderOption(rescued.options[lbl])) {
        const cleanVal = formatScientificMathAndPowers(rescued.options[lbl]!.trim());
        rescuedAny = true;
        return { ...existing, label: lbl, text: cleanVal, value: cleanVal };
      }
      return existing;
    });

    // Rule 1: Drop option-only tables (e.g. "(1) ... (2) ... (3) ... (4) ..." or "Option | Value" with (1)-(4))
    if (rescued.wasOptionOnlyTable) {
      return { structuredTable: undefined, updatedOptions, rescuedAny, rescuedCount: rescued.rescuedCount };
    }

    // Rule 2: Drop any table whose headers/values duplicate the extracted A-D options
    const headersJoined = (tableData.headers || []).map(h => String(h || '').trim().toLowerCase()).join(' ');
    const looksLikeOptionHeader =
      tableData.rows.length <= 4 &&
      /\b(?:option|choice|answer|alternative)\b/i.test(headersJoined);

    const optNormSet = new Set(
      updatedOptions
        .map(o => (o.value || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(s => s.length >= 2)
    );
    let dupCellHits = 0;
    let totalNonMarkerCells = 0;
    for (const row of tableData.rows) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const raw = String(cell || '').trim();
        if (!raw || /^\(?[A-D1-4]\)?[\.\):]?$/i.test(raw)) continue;
        totalNonMarkerCells++;
        const stripped = raw.replace(/^(?:\([A-D1-4]\)|\[[A-D1-4]\]|[A-D1-4][\.\):])\s+/i, '');
        const normCell = stripped.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normCell.length >= 2 && optNormSet.has(normCell)) {
          dupCellHits++;
        }
      }
    }
    const duplicatesOptions =
      looksLikeOptionHeader ||
      (totalNonMarkerCells > 0 && dupCellHits >= 2 && dupCellHits / totalNonMarkerCells >= 0.5);

    if (duplicatesOptions) {
      return { structuredTable: undefined, updatedOptions, rescuedAny, rescuedCount: rescued.rescuedCount };
    }

    // Rule 3: Drop hallucinated descriptive tables substituted for a graph or physical apparatus drawing
    if (hasOrNeedsFigure && !isTableQuestionPrompt(questionText)) {
      const cap = `${tableData.caption || ''} ${headersJoined}`.toLowerCase();
      if (
        /(?:vernier|main\s*scale|screw\s*gauge|diagram|shows\s+(?:major|secondary)\s+divisions|features|graph|velocity|acceleration|time\s*\(?s\)?|option|value)/i.test(
          cap
        )
      ) {
        return { structuredTable: undefined, updatedOptions, rescuedAny, rescuedCount: rescued.rescuedCount };
      }
    }

    return { structuredTable: tableData, updatedOptions, rescuedAny, rescuedCount: rescued.rescuedCount };
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

  private resolveExpectedConfig(job: Parser2Job): { expected: number | null; source: 'auto_detected' | 'manual' } {
    if (typeof job.expectedQuestionsManual === 'number' && job.expectedQuestionsManual > 0) {
      return { expected: job.expectedQuestionsManual, source: 'manual' };
    }
    const parsed = this.parseExpectedCount(job.questionRange || '');
    if (parsed !== null && parsed > 0) {
      return { expected: parsed, source: 'manual' };
    }
    return { expected: null, source: 'auto_detected' };
  }

  private parseExpectedCount(rangeStr: string): number | null {
    const trimmed = (rangeStr || '').trim();
    if (!trimmed) return null;
    const match = trimmed.match(/\b(\d+)\s*[\-\:]\s*(\d+)\b/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (end >= start && end > 0) {
        return Math.max(1, end - start + 1);
      }
    }
    if (/^\d+$/.test(trimmed)) {
      const single = parseInt(trimmed, 10);
      return single > 0 ? single : null;
    }
    return null;
  }
}

export const jobQueueService = new JobQueueService();
