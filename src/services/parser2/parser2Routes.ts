// NCERTify AI Parser 2.0 - Dedicated Server-Side Express Router
// Completely isolated under /api/parser2/* and /api/r2/parser2/*

import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  getParser2Jobs,
  getParser2JobById,
  saveParser2Job,
  deleteParser2Job,
  saveParser2SourceFile,
  getParser2Pages,
  saveParser2Page,
  getParser2Questions,
  updateParser2Question,
  getParser2Figures,
  saveParser2Figures,
  upsertParser2Figures,
  getParser2AnswerKeys,
  saveParser2AnswerKeys,
  getParser2ValidationReport,
  saveParser2ValidationReport,
  getParser2Logs,
  getParser2Settings,
  saveParser2Settings,
  reconcileParser2JobCounts,
  runDatabaseSelfTest
} from './parser2Db';
import { ADMIN_EMAILS } from '../../lib/firebase';
import { uploadParser2Asset, getParser2AssetBuffer, deleteParser2JobAssets, getR2Client } from './parser2R2Storage';
import { jobQueueService, evaluateStrictQuestionStatus, ACTIVE_PARSER_JOB_STATUSES } from './jobQueueService';
import { validationEngine } from './validationEngine';
import { figureExtractionService } from './figureExtractionService';
import { manualImportService, ManualImportFormat } from './manualImportService';
import {
  isQuestionTextTruncated,
  parseMatchTableFromText,
  parseStructuredTableFromText,
  formatSourcePageRange
} from './layoutEngine';
import { mistralOcrService } from './mistralOcrService';
import { geminiVerificationService } from './geminiVerificationService';
import { answerKeyService } from './answerKeyService';
import { apiRateLimiter } from './apiRateLimiter';
import {
  publishParser2TestToStudentEngine,
  syncPublishedTestToRemoteStores,
  repairPublishedParser2Test,
  resolveCategoryNamesForIds,
  INCOMPLETE_PARSER2_STATUSES
} from './parser2Adapter';
import { formatScientificMathAndPowers, cleanForFirebase, FIREBASE_RTDB_BASE } from '../../lib/mockTestData';
import {
  Parser2AnswerKeyEntry,
  Parser2CropType,
  Parser2Figure,
  Parser2ImageAttachment,
  Parser2ImagePlacement,
  Parser2Job,
  Parser2SourceFile,
  isPlaceholderOption
} from './types';
import { normalizeTestCategories } from '../../lib/testCategoriesData';
import { TestCategory } from '../../types';

const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS.map(e => e.toLowerCase().trim()));

function requireAdminIfIdentified(req: express.Request, res: express.Response): boolean {
  const email = String(req.headers['x-user-email'] || req.body?.adminEmail || '').toLowerCase().trim();
  if (email && !ADMIN_EMAIL_SET.has(email)) {
    res.status(403).json({ success: false, error: 'Unauthorized: Admin access required for this operation.' });
    return false;
  }
  return true;
}

function resolveExpectedQuestionsForAudit(job: Parser2Job): {
  expectedTotal: number | null;
  expectedSource: 'auto_detected' | 'manual';
} {
  if (typeof job.expectedQuestionsManual === 'number' && job.expectedQuestionsManual > 0) {
    return { expectedTotal: job.expectedQuestionsManual, expectedSource: 'manual' };
  }
  const rangeStr = (job.questionRange || '').trim();
  const rangeMatch = rangeStr.match(/^(\d+)\s*[-–to]+\s*(\d+)$/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return { expectedTotal: end - start + 1, expectedSource: 'manual' };
    }
  }
  const singleNum = rangeStr.match(/^(\d+)$/);
  if (singleNum) {
    const n = parseInt(singleNum[1], 10);
    if (!isNaN(n) && n > 0) return { expectedTotal: n, expectedSource: 'manual' };
  }
  if (job.reconciliation?.expectedQuestionsSource === 'manual' && job.reconciliation.expectedQuestions) {
    return { expectedTotal: job.reconciliation.expectedQuestions, expectedSource: 'manual' };
  }
  return { expectedTotal: null, expectedSource: 'auto_detected' };
}

async function refreshJobStatsAndReport(jobId: string): Promise<{
  job: Parser2Job | null;
  report: ReturnType<typeof validationEngine.auditQuestions> | null;
}> {
  const allQs = await getParser2Questions(jobId);
  const allFigs = await getParser2Figures(jobId);
  const job = await getParser2JobById(jobId);
  if (!job) return { job: null, report: null };

  const expectedCfg = resolveExpectedQuestionsForAudit(job);
  const report = validationEngine.auditQuestions(jobId, allQs, expectedCfg.expectedTotal, {
    savedQuestions: allQs.length,
    figuresExtracted: allFigs.length,
    expectedSource: expectedCfg.expectedSource
  });

  job.totalQuestions = allQs.length;
  job.questionsDetected = Math.max(job.questionsDetected || 0, allQs.length);
  job.questionsSaved = allQs.length;
  job.savedVerified = allQs.length > 0;
  job.figureCount = allFigs.length;
  job.verifiedQuestions = allQs.filter(q => q.verificationStatus === 'verified' && !q.reviewRequired).length;
  job.reviewRequiredCount = allQs.filter(q => q.reviewRequired).length;
  job.manuallyEditedCount = allQs.filter(q => q.isManuallyEdited).length;
  job.qualityScore = report.qualityScore;
  job.qualityBreakdown = report.qualityBreakdown;
  job.reconciliation = report.reconciliation;
  job.hasAnswerKey = allQs.some(q => Boolean(q.correctAnswer && q.answerStatus !== 'answer_missing'));
  job.lastActivityAt = new Date().toISOString();

  await saveParser2Job(job);
  await saveParser2ValidationReport(report);

  return { job, report };
}

function createInlineCategoryInStore(inlineCategory: {
  name: string;
  description?: string;
  themePreset?: string;
}): TestCategory | null {
  const cleanName = (inlineCategory?.name || '').trim();
  if (!cleanName) return null;

  const dbPath = path.join(process.cwd(), 'store_database.json');
  let db: any = {};
  try {
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch {
    db = {};
  }

  const existingList = normalizeTestCategories(db.test_categories);
  const slugBase = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `custom_${Date.now()}`;

  const duplicate = existingList.find(
    c => c.slug.toLowerCase() === slugBase || c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) return duplicate;

  const uniqueId = `cat-${slugBase}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const created: TestCategory = {
    id: uniqueId,
    slug: uniqueId,
    name: cleanName,
    description: (inlineCategory.description || `${cleanName} NEET CBT mock examinations.`).trim(),
    themePreset: (inlineCategory.themePreset as any) || 'indigo',
    displayOrder: existingList.length + 1,
    isVisible: true,
    isDefault: false,
    badgeText: 'Custom Series',
    accentTags: ['NCERT Mapped', 'CBT Mock'],
    ctaText: 'Explore Tests',
    createdAt: now,
    updatedAt: now
  };

  const nextCategories = normalizeTestCategories([...existingList, created]);
  db.test_categories = nextCategories;
  const tmpPath = `${dbPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, dbPath);

  if (typeof fetch !== 'undefined') {
    fetch(`${FIREBASE_RTDB_BASE}/test_categories.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanForFirebase(nextCategories))
    }).catch(() => {});
  }

  return created;
}

export const parser2Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  }
});

// -------------------------------------------------------------
// 1. Jobs Listing, Persistent History & Creation
// -------------------------------------------------------------
parser2Router.get('/jobs', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const allJobs = await getParser2Jobs();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';
    const pageParam = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10) || 1) : null;
    const limitParam = req.query.limit ? Math.max(1, Math.min(100, parseInt(String(req.query.limit), 10) || 20)) : null;

    const filterCounts = {
      all: allJobs.length,
      queued: allJobs.filter(j => j.status === 'queued' || j.status === 'uploaded').length,
      active: allJobs.filter(j => ACTIVE_PARSER_JOB_STATUSES.has(j.status) || j.status === 'paused').length,
      completed: allJobs.filter(j => j.status === 'completed' || j.status === 'review_required').length,
      published: allJobs.filter(j => j.status === 'published').length,
      failed: allJobs.filter(j => j.status === 'failed' || j.status === 'stalled').length
    };

    let filtered = allJobs;
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'queued') {
        filtered = allJobs.filter(j => j.status === 'queued' || j.status === 'uploaded');
      } else if (statusFilter === 'active') {
        filtered = allJobs.filter(j => ACTIVE_PARSER_JOB_STATUSES.has(j.status) || j.status === 'paused');
      } else if (statusFilter === 'completed' || statusFilter === 'review') {
        filtered = allJobs.filter(j => j.status === 'completed' || j.status === 'review_required' || j.status === 'published');
      } else if (statusFilter === 'published') {
        filtered = allJobs.filter(j => j.status === 'published');
      } else if (statusFilter === 'failed') {
        filtered = allJobs.filter(j => j.status === 'failed' || j.status === 'stalled');
      }
    }

    const totalCount = filtered.length;
    let jobs = filtered;
    let totalPages = 1;
    let page = 1;

    if (pageParam && limitParam) {
      totalPages = Math.max(1, Math.ceil(totalCount / limitParam));
      page = Math.min(pageParam, totalPages);
      const start = (page - 1) * limitParam;
      jobs = filtered.slice(start, start + limitParam);
    }

    return res.json({
      success: true,
      jobs,
      totalCount,
      page,
      totalPages,
      filterCounts
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post(
  '/jobs',
  upload.fields([
    { name: 'questionPdf', maxCount: 1 },
    { name: 'solutionPdf', maxCount: 1 },
    { name: 'answerKeyFile', maxCount: 1 }
  ]),
  async (req: express.Request, res: express.Response) => {
    if (!requireAdminIfIdentified(req, res)) return;
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const questionFile = files?.questionPdf?.[0];
      const solutionFile = files?.solutionPdf?.[0];
      const answerKeyFile = files?.answerKeyFile?.[0];

      if (!questionFile) {
        return res.status(400).json({ success: false, error: 'Question PDF file is required.' });
      }

      const currentSettings = await getParser2Settings();
      const {
        testName,
        subject = 'Combined',
        chapter = '',
        questionRange = '',
        expectedQuestionsManual,
        ocrEngine = currentSettings.defaultProvider || 'gemini',
        geminiModel = currentSettings.geminiModel || 'gemini-4-hydrogen',
        mistralModel = currentSettings.mistralModel || 'mistral-ocr-latest',
        enableGeminiVerification = 'true',
        allowProviderFallback,
        fallbackProvider,
        autoScanAnswerKey,
        answerKeyText = ''
      } = req.body;

      const parsedManualExpected =
        expectedQuestionsManual !== undefined && String(expectedQuestionsManual).trim() !== ''
          ? parseInt(String(expectedQuestionsManual), 10)
          : undefined;
      const validManualExpected =
        typeof parsedManualExpected === 'number' && !isNaN(parsedManualExpected) && parsedManualExpected > 0
          ? parsedManualExpected
          : undefined;

      const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      // Save Question PDF to R2/local storage
      const qUpload = await uploadParser2Asset(
        jobId,
        'source',
        'questions.pdf',
        questionFile.buffer,
        questionFile.mimetype || 'application/pdf'
      );

      const qSource: Parser2SourceFile = {
        id: `file-q-${jobId}`,
        jobId,
        fileType: 'question_pdf',
        fileName: questionFile.originalname || 'questions.pdf',
        fileSize: questionFile.size,
        storageKey: qUpload.storageKey,
        mimeType: questionFile.mimetype || 'application/pdf',
        pageCount: 0,
        uploadedAt: now
      };
      await saveParser2SourceFile(qSource);

      // Save Solution PDF if provided
      let solName: string | undefined = undefined;
      if (solutionFile) {
        const solUpload = await uploadParser2Asset(
          jobId,
          'source',
          'solutions.pdf',
          solutionFile.buffer,
          solutionFile.mimetype || 'application/pdf'
        );
        const solSource: Parser2SourceFile = {
          id: `file-sol-${jobId}`,
          jobId,
          fileType: 'solution_pdf',
          fileName: solutionFile.originalname || 'solutions.pdf',
          fileSize: solutionFile.size,
          storageKey: solUpload.storageKey,
          mimeType: solutionFile.mimetype || 'application/pdf',
          pageCount: 0,
          uploadedAt: now
        };
        await saveParser2SourceFile(solSource);
        solName = solutionFile.originalname;
      }

      // Optional pre-uploaded answer key (pasted text or answer key image / text file)
      let preParsedKeys: Record<number, Parser2AnswerKeyEntry> = {};
      let answerKeyFileName: string | undefined = undefined;

      if (typeof answerKeyText === 'string' && answerKeyText.trim()) {
        const parsedFromText = answerKeyService.parseAnswerKeyText(answerKeyText);
        if (Object.keys(parsedFromText).length > 0) {
          preParsedKeys = { ...preParsedKeys, ...parsedFromText };
        }
      }

      if (answerKeyFile) {
        answerKeyFileName = answerKeyFile.originalname || 'answer_key';
        const akMime = answerKeyFile.mimetype || 'image/png';
        const ext = akMime.includes('png') ? 'png' : akMime.includes('pdf') ? 'pdf' : akMime.includes('text') ? 'txt' : 'jpg';
        const akUpload = await uploadParser2Asset(
          jobId,
          'source',
          `answer-key.${ext}`,
          answerKeyFile.buffer,
          akMime
        );
        const akSource: Parser2SourceFile = {
          id: `file-ak-${jobId}`,
          jobId,
          fileType: akMime.startsWith('image/') ? 'answer_key_image' : 'answer_key_pdf',
          fileName: answerKeyFileName,
          fileSize: answerKeyFile.size,
          storageKey: akUpload.storageKey,
          mimeType: akMime,
          pageCount: 1,
          uploadedAt: now
        };
        await saveParser2SourceFile(akSource);

        if (akMime.includes('pdf') || answerKeyFileName.toLowerCase().endsWith('.pdf')) {
          const pdfResult = await answerKeyService.parseAnswerKeyPdf(answerKeyFile.buffer);
          if (pdfResult.keys && Object.keys(pdfResult.keys).length > 0) {
            preParsedKeys = { ...preParsedKeys, ...pdfResult.keys };
          }
        } else if (akMime.startsWith('image/')) {
          const imgKeys = await answerKeyService.parseAnswerKeyImage(
            answerKeyFile.buffer.toString('base64'),
            akMime
          );
          if (Object.keys(imgKeys).length > 0) {
            preParsedKeys = { ...preParsedKeys, ...imgKeys };
          }
        } else if (akMime.startsWith('text/') || answerKeyFileName.toLowerCase().endsWith('.txt')) {
          const textKeys = answerKeyService.parseAnswerKeyText(answerKeyFile.buffer.toString('utf-8'));
          if (Object.keys(textKeys).length > 0) {
            preParsedKeys = { ...preParsedKeys, ...textKeys };
          }
        }
      }

      if (Object.keys(preParsedKeys).length > 0) {
        await saveParser2AnswerKeys(jobId, preParsedKeys);
      }

      const resolvedAllowFallback =
        allowProviderFallback !== undefined
          ? allowProviderFallback === 'true' || allowProviderFallback === true
          : currentSettings.allowProviderFallback !== false;

      const resolvedAutoScanAnswerKey =
        autoScanAnswerKey !== undefined
          ? autoScanAnswerKey === 'true' || autoScanAnswerKey === true
          : currentSettings.autoScanAnswerKey !== false;

      const newJob: Parser2Job = {
        id: jobId,
        testName: (testName || questionFile.originalname.replace(/\.pdf$/i, '') || 'NEET CBT Practice Test').trim(),
        subject: subject as any,
        chapter: chapter.trim(),
        questionRange: String(questionRange || '').trim(),
        expectedQuestionsManual: validManualExpected,
        ocrEngine: ocrEngine as any,
        geminiModel: String(geminiModel || 'gemini-4-hydrogen').trim(),
        mistralModel: String(mistralModel || 'mistral-ocr-latest').trim(),
        enableGeminiVerification: enableGeminiVerification === 'true' || enableGeminiVerification === true,
        allowProviderFallback: resolvedAllowFallback,
        fallbackProvider: (fallbackProvider as any) || currentSettings.fallbackProvider || 'gemini',
        autoScanAnswerKey: resolvedAutoScanAnswerKey,
        status: 'queued',
        currentStage: 'Queued for background PDF extraction',
        totalPages: 0,
        completedPages: 0,
        failedPages: 0,
        totalQuestions: 0,
        questionsDetected: 0,
        questionsSaved: 0,
        savedVerified: false,
        verifiedQuestions: 0,
        reviewRequiredCount: 0,
        manuallyEditedCount: 0,
        figureCount: 0,
        qualityScore: null,
        estimatedCostUsd: 0,
        hasAnswerKey: Object.keys(preParsedKeys).length > 0,
        retryCount: 0,
        originalPdfFileName: questionFile.originalname || 'questions.pdf',
        sourceQuestionPdfName: questionFile.originalname,
        sourceSolutionPdfName: solName || answerKeyFileName,
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now
      };

      await saveParser2Job(newJob);

      // Enqueue server-side background execution cleanly (non-blocking)
      jobQueueService.startJob(jobId).catch(err => {
        console.warn(`[Parser2Routes] Auto-start note for job ${jobId}:`, err.message);
      });

      return res.status(201).json({ success: true, job: newJob });
    } catch (err: any) {
      console.error('[Parser2Routes] Job creation error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// -------------------------------------------------------------
// 2. Job Detail & Pipeline Actions
// -------------------------------------------------------------
parser2Router.get('/jobs/:jobId', async (req, res) => {
  try {
    let job = await getParser2JobById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    if (!job.questionsSaved || job.questionsSaved === 0) {
      job = (await reconcileParser2JobCounts(job.id)) || job;
    }

    const pages = await getParser2Pages(job.id);
    const logs = await getParser2Logs(job.id);
    const validationReport = await getParser2ValidationReport(job.id);
    const answerKeys = await getParser2AnswerKeys(job.id);

    return res.json({
      success: true,
      job,
      pages,
      logs: logs.slice(-150),
      validationReport,
      answerKeyCount: Object.keys(answerKeys).length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/start', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    await jobQueueService.startJob(req.params.jobId);
    return res.json({ success: true, message: 'Processing started.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/resume', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    await jobQueueService.startJob(req.params.jobId);
    return res.json({ success: true, message: 'Processing resumed from last page checkpoint.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/pause', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    await jobQueueService.pauseJob(req.params.jobId);
    return res.json({ success: true, message: 'Processing paused.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/retry-failed', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    await jobQueueService.retryFailedStage(req.params.jobId);
    return res.json({ success: true, message: 'Retrying failed stage / pages.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/retry-stage', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    await jobQueueService.retryFailedStage(req.params.jobId);
    return res.json({ success: true, message: 'Retrying failed stage cleanly.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.delete('/jobs/:jobId', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    await jobQueueService.pauseJob(jobId);
    await deleteParser2JobAssets(jobId);
    await deleteParser2Job(jobId);
    return res.json({ success: true, message: 'Job deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get stored Answer Keys & per-question comparison table
parser2Router.get('/jobs/:jobId/answer-key', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getParser2JobById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found.' });
    const answerKeys = await getParser2AnswerKeys(jobId);
    const questions = await getParser2Questions(jobId);
    const comparison = answerKeyService.buildAnswerKeyComparison(questions, answerKeys);
    return res.json({
      success: true,
      answerKeys,
      comparison,
      count: Object.keys(answerKeys).length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Auto-detect Answer Key pages/entries from the job's current uploaded PDF (preview or apply)
parser2Router.post('/jobs/:jobId/answer-key/detect', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const apply = req.body?.apply === true || req.body?.apply === 'true';
    const overwriteManual = req.body?.overwriteManual === true || req.body?.overwriteManual === 'true';
    const setCode = typeof req.body?.setCode === 'string' ? req.body.setCode.trim() : undefined;

    const detection = await jobQueueService.detectAnswerKeyFromCurrentPdf(jobId, {
      apply,
      overwriteManual,
      setCode
    });

    const refreshed = apply ? await refreshJobStatsAndReport(jobId) : null;
    const questions = apply ? await getParser2Questions(jobId) : undefined;
    const answerKeys = await getParser2AnswerKeys(jobId);

    return res.json({
      success: true,
      ...detection,
      answerKeys,
      job: refreshed?.job,
      validationReport: refreshed?.report,
      questions,
      message: detection.detectedCount > 0
        ? `Detected ${detection.detectedCount} answer key entries on page(s) ${detection.keyPages.join(', ')}${detection.applied ? ' and applied to questions.' : '.'}`
        : 'No answer key sheet detected in current PDF.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Upload or paste Answer Key (PDF, Image, Text, or Structured Entries)
parser2Router.post(
  '/jobs/:jobId/answer-key',
  upload.single('answerKeyFile'),
  async (req: express.Request, res: express.Response) => {
    if (!requireAdminIfIdentified(req, res)) return;
    try {
      const { jobId } = req.params;
      const job = await getParser2JobById(jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found.' });

      let rawText = typeof req.body?.rawText === 'string' ? req.body.rawText : '';
      let imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : undefined;
      let mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;
      let pdfBuffer: Buffer | undefined = undefined;
      let entries = Array.isArray(req.body?.entries) ? req.body.entries : undefined;
      const setCode = typeof req.body?.setCode === 'string' ? req.body.setCode.trim() : undefined;
      const overwriteManual = req.body?.overwriteManual === true || req.body?.overwriteManual === 'true';
      const replaceAll = req.body?.replaceAll === true || req.body?.replaceAll === 'true';

      if (typeof req.body?.entries === 'string') {
        try { entries = JSON.parse(req.body.entries); } catch {}
      }

      if (req.file) {
        const fMime = (req.file.mimetype || '').toLowerCase();
        const fName = (req.file.originalname || '').toLowerCase();
        if (fMime === 'application/pdf' || fName.endsWith('.pdf')) {
          pdfBuffer = req.file.buffer;
          await uploadParser2Asset(jobId, 'source', `answer-key-${Date.now()}.pdf`, req.file.buffer, 'application/pdf');
        } else if (fMime.startsWith('image/')) {
          imageBase64 = req.file.buffer.toString('base64');
          mimeType = fMime;
          await uploadParser2Asset(jobId, 'source', `answer-key-${Date.now()}.png`, req.file.buffer, fMime);
        } else {
          rawText = req.file.buffer.toString('utf-8');
        }
      }

      if (!rawText && !imageBase64 && !pdfBuffer && (!entries || entries.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Provide an Answer Key PDF, image, pasted text, or entries.'
        });
      }

      const applyResult = await jobQueueService.applyAnswerKeyToJob(jobId, {
        rawText,
        imageBase64,
        mimeType,
        pdfBuffer,
        entries,
        setCode,
        overwriteManual,
        replaceAll
      });

      const refreshed = await refreshJobStatsAndReport(jobId);
      const questions = await getParser2Questions(jobId);
      const answerKeys = await getParser2AnswerKeys(jobId);
      const comparison = answerKeyService.buildAnswerKeyComparison(questions, answerKeys);
      const parsedKeysCount = Object.keys(applyResult.keysMap || {}).length;

      return res.json({
        success: true,
        result: applyResult,
        answerKeys,
        comparison,
        job: refreshed.job,
        validationReport: refreshed.report,
        questions,
        message: `Saved ${parsedKeysCount} answer keys; updated ${applyResult.matchedCount} questions (${applyResult.skippedManualCount} manual edits preserved).`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Update / Edit Answer Key entries from spreadsheet UI
parser2Router.put('/jobs/:jobId/answer-key', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const { entries, rawText, setCode, overwriteManual = true, replaceAll = false } = req.body || {};
    if (!Array.isArray(entries) && !rawText) {
      return res.status(400).json({ success: false, error: 'Provide entries array or rawText to update answer keys.' });
    }

    const applyResult = await jobQueueService.applyAnswerKeyToJob(jobId, {
      entries,
      rawText,
      setCode,
      overwriteManual: Boolean(overwriteManual),
      replaceAll: Boolean(replaceAll)
    });

    const refreshed = await refreshJobStatsAndReport(jobId);
    const questions = await getParser2Questions(jobId);
    const answerKeys = await getParser2AnswerKeys(jobId);
    const comparison = answerKeyService.buildAnswerKeyComparison(questions, answerKeys);

    return res.json({
      success: true,
      result: applyResult,
      answerKeys,
      comparison,
      job: refreshed.job,
      validationReport: refreshed.report,
      questions,
      message: `Updated answer keys (${Object.keys(answerKeys).length} total entries, ${applyResult.matchedCount} matched).`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete / Reset Answer Key entries for a job
parser2Router.delete('/jobs/:jobId/answer-key', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const { clearedCount } = await jobQueueService.clearAnswerKeysForJob(jobId);
    const refreshed = await refreshJobStatsAndReport(jobId);
    const questions = await getParser2Questions(jobId);
    const comparison = answerKeyService.buildAnswerKeyComparison(questions, {});

    return res.json({
      success: true,
      clearedCount,
      answerKeys: {},
      comparison,
      job: refreshed.job,
      validationReport: refreshed.report,
      questions,
      message: `Removed ${clearedCount} answer key entry(ies).`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.get('/jobs/:jobId/pages/:pageNumber/image', async (req, res) => {
  try {
    const { jobId, pageNumber } = req.params;
    const pNum = parseInt(pageNumber, 10);
    const padded = String(pNum).padStart(3, '0');

    let imgBuf = await getParser2AssetBuffer(jobId, 'pages', `page-${padded}.png`);

    if (!imgBuf) {
      const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
      if (pdfBuffer) {
        imgBuf = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pNum, 180);
        await uploadParser2Asset(jobId, 'pages', `page-${padded}.png`, imgBuf, 'image/png');
      }
    }

    if (imgBuf) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(imgBuf);
    }

    return res.status(404).json({ success: false, error: `Page ${pNum} could not be rendered.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.get('/jobs/:jobId/pages/:pageNumber/ocr', async (req, res) => {
  try {
    const { jobId, pageNumber } = req.params;
    const pNum = Math.max(1, parseInt(pageNumber, 10) || 1);
    const pages = await getParser2Pages(jobId);
    let page = pages.find(p => p.pageNumber === pNum);
    let ocrText = page?.ocrMarkdown || '';

    if (!ocrText.trim()) {
      const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
      if (pdfBuffer) {
        try {
          ocrText = await figureExtractionService.extractPdfPageText(pdfBuffer, pNum);
        } catch {}
      }

      if (!ocrText.trim()) {
        const padded = String(pNum).padStart(3, '0');
        let pageImg = await getParser2AssetBuffer(jobId, 'pages', `page-${padded}.png`);
        if (!pageImg && pdfBuffer) {
          pageImg = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pNum, 180);
        }
        if (pageImg) {
          const regionOcr = await geminiVerificationService.extractRegionFromPageImage({
            pageImageBuffer: pageImg,
            targetField: 'explanation'
          });
          ocrText = regionOcr.extractedText || '';
        }
      }

      if (ocrText.trim() && page) {
        page.ocrMarkdown = ocrText;
        page.updatedAt = new Date().toISOString();
        await saveParser2Page(page);
      }
    }

    return res.json({
      success: true,
      pageNumber: pNum,
      ocrText: formatScientificMathAndPowers(ocrText || ''),
      rawMarkdown: ocrText || ''
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Questions CRUD & Inline Editing
// -------------------------------------------------------------
parser2Router.get('/jobs/:jobId/questions', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.query;
    let questions = await getParser2Questions(jobId);

    if (status && status !== 'all') {
      if (status === 'needs_review') {
        questions = questions.filter(
          q =>
            q.reviewRequired ||
            q.verificationStatus === 'needs_review' ||
            q.verificationStatus === 'missing_figure' ||
            q.verificationStatus === 'options_incomplete' ||
            q.verificationStatus === 'text_incomplete' ||
            q.verificationStatus === 'table_incomplete' ||
            q.verificationStatus === 'symbol_review' ||
            q.verificationStatus === 'figure_mismatch'
        );
      } else {
        questions = questions.filter(q => q.verificationStatus === status);
      }
    }

    return res.json({ success: true, questions, totalCount: questions.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.put('/jobs/:jobId/questions/:questionId', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const rawPatch = { ...(req.body || {}) };
    const forceOverride = rawPatch.forceOverride === true;
    delete rawPatch.forceOverride;

    if (rawPatch.figureUrl === null) rawPatch.figureUrl = undefined;
    if (rawPatch.structuredTable === null) rawPatch.structuredTable = undefined;
    if (rawPatch.matchTable === null) rawPatch.matchTable = undefined;

    const allExisting = await getParser2Questions(jobId);
    const existing = allExisting.find(q => q.id === questionId);
    if (!existing) return res.status(404).json({ success: false, error: 'Question not found' });

    const merged = { ...existing, ...rawPatch };

    if (forceOverride) {
      rawPatch.adminOverride = true;
      rawPatch.adminOverrideAt = new Date().toISOString();
      rawPatch.adminOverrideNotes = rawPatch.adminOverrideNotes || rawPatch.reviewNotes || 'Verified manually by Admin against original PDF';
      rawPatch.verificationStatus = 'verified';
      rawPatch.reviewRequired = false;
      rawPatch.isManuallyEdited = true;
      rawPatch.confidenceScore = 100;
    } else if (rawPatch.verificationStatus === 'verified') {
      const strict = evaluateStrictQuestionStatus({
        questionType: merged.questionType,
        questionText: merged.questionText,
        options: merged.options,
        optionFigures: merged.optionFigures,
        figureUrl: merged.figureUrl,
        matchTable: merged.matchTable,
        structuredTable: merged.structuredTable,
        reviewNotes: rawPatch.reviewNotes ?? merged.reviewNotes,
        confidenceScore: merged.confidenceScore ?? 90,
        baseReviewRequired: false
      });

      if (strict.verificationStatus !== 'verified') {
        return res.status(400).json({
          success: false,
          error: `Cannot verify question (${strict.verificationStatus}): ${strict.reviewNotes || 'Resolve incomplete fields before verifying, or use Admin Override after checking original PDF.'}`
        });
      }

      rawPatch.reviewRequired = false;
      rawPatch.confidenceScore = Math.max(merged.confidenceScore || 90, 90);
      rawPatch.componentValidation = strict.componentValidation;
    } else if (rawPatch.verificationStatus === 'failed') {
      rawPatch.reviewRequired = true;
      rawPatch.adminOverride = false;
      rawPatch.reviewNotes = rawPatch.reviewNotes || 'Rejected by Admin during review; excluded from auto-publishing.';
    } else if (Object.prototype.hasOwnProperty.call(rawPatch, 'figureUrl') && !rawPatch.figureUrl) {
      const strict = evaluateStrictQuestionStatus({
        questionType: merged.questionType,
        questionText: merged.questionText,
        options: merged.options,
        optionFigures: merged.optionFigures,
        figureUrl: undefined,
        matchTable: merged.matchTable,
        structuredTable: merged.structuredTable,
        reviewNotes: rawPatch.reviewNotes ?? merged.reviewNotes,
        confidenceScore: merged.confidenceScore ?? 85,
        baseReviewRequired: true
      });
      rawPatch.verificationStatus = strict.verificationStatus;
      rawPatch.reviewRequired = strict.reviewRequired;
      rawPatch.reviewNotes = strict.reviewNotes;
      rawPatch.componentValidation = strict.componentValidation;
    }

    if (rawPatch.correctAnswer && ['A', 'B', 'C', 'D'].includes(rawPatch.correctAnswer)) {
      rawPatch.answerStatus = 'manual';
    }

    const updated = await updateParser2Question(jobId, questionId, rawPatch);
    if (!updated) return res.status(404).json({ success: false, error: 'Question not found' });

    await refreshJobStatsAndReport(jobId);
    return res.json({ success: true, question: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk verify eligible questions
parser2Router.post('/jobs/:jobId/questions/bulk-verify', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const { questionIds } = req.body || {};
    const questions = await getParser2Questions(jobId);

    let count = 0;
    let skipped = 0;
    for (const q of questions) {
      if (questionIds && Array.isArray(questionIds)) {
        if (!questionIds.includes(q.id)) continue;
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
        confidenceScore: q.confidenceScore ?? 90,
        baseReviewRequired: false
      });

      if (strict.verificationStatus !== 'verified') {
        skipped++;
        continue;
      }

      await updateParser2Question(jobId, q.id, {
        verificationStatus: 'verified',
        reviewRequired: false
      });
      count++;
    }

    await refreshJobStatsAndReport(jobId);

    return res.json({
      success: true,
      verifiedCount: count,
      skippedCount: skipped,
      message: `Successfully verified ${count} complete questions${skipped > 0 ? ` (${skipped} incomplete/missing-table/missing-figure questions skipped)` : ''}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Page-Based Region OCR & Copy Recovery ("Copy from Page")
parser2Router.post('/jobs/:jobId/ocr-region', async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      pageNumber = 1,
      boundingBox,
      targetField = 'questionText',
      questionNumber
    } = req.body || {};

    const pNum = Math.max(1, parseInt(String(pageNumber), 10) || 1);
    const cachedName = `page-${String(pNum).padStart(3, '0')}.png`;
    let pageImageBuffer = await getParser2AssetBuffer(jobId, 'pages', cachedName);

    if (!pageImageBuffer) {
      const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
      if (!pdfBuffer) {
        return res.status(404).json({ success: false, error: 'Source PDF page image could not be loaded.' });
      }
      pageImageBuffer = await figureExtractionService.renderPdfPageToPng(pdfBuffer, pNum, 200);
    }

    const validBox =
      Array.isArray(boundingBox) && boundingBox.length === 4
        ? (boundingBox.map(Number) as [number, number, number, number])
        : undefined;

    const isImageCropField =
      targetField === 'diagram' ||
      targetField === 'tableCrop' ||
      targetField === 'graphCrop' ||
      targetField === 'chemicalStructureCrop' ||
      /^option[A-D]Image$/.test(targetField);

    const ocrResult = await geminiVerificationService.extractRegionFromPageImage({
      pageImageBuffer,
      boundingBox: validBox,
      targetField: isImageCropField ? 'diagram' : targetField,
      questionNumber: questionNumber ? Number(questionNumber) : undefined
    });

    if (isImageCropField && ocrResult.croppedPngBuffer) {
      const resolvedFigType: Parser2Figure['figureType'] =
        targetField === 'tableCrop'
          ? 'table'
          : targetField === 'graphCrop'
          ? 'graph'
          : targetField === 'chemicalStructureCrop' || /^option[A-D]Image$/.test(targetField)
          ? 'chemical_structure'
          : 'diagram';
      const figName = `q${questionNumber || 'region'}_p${pNum}_${targetField}_${Date.now()}.png`;
      const uploaded = await uploadParser2Asset(jobId, 'figures', figName, ocrResult.croppedPngBuffer, 'image/png');
      const figRecord: Parser2Figure = {
        id: `fig-rec-${jobId}-${Date.now()}`,
        jobId,
        questionNumber: questionNumber ? Number(questionNumber) : undefined,
        pageNumber: pNum,
        figureKey: uploaded.storageKey,
        figureUrl: uploaded.publicUrl,
        boundingBox: validBox,
        figureType: resolvedFigType,
        isManualCrop: true,
        createdAt: new Date().toISOString()
      };
      await upsertParser2Figures(jobId, [figRecord]);

      return res.json({
        success: true,
        targetField,
        croppedImageUrl: uploaded.publicUrl,
        figureUrl: uploaded.publicUrl,
        figure: figRecord,
        extractedText: '',
        confidenceScore: 100
      });
    }

    const formattedText = formatScientificMathAndPowers(ocrResult.extractedText || '');
    let matchTable = ocrResult.matchTable;
    let structuredTable = ocrResult.structuredTable;
    if (targetField === 'table' && !matchTable && !structuredTable && formattedText) {
      matchTable = parseMatchTableFromText(formattedText);
      if (!matchTable) {
        structuredTable = parseStructuredTableFromText(formattedText);
      }
    }

    return res.json({
      success: true,
      targetField,
      extractedText: formattedText,
      matchTable,
      structuredTable,
      confidenceScore: ocrResult.confidenceScore
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Visual Diagram Recropping, AI Auto-Locate, Upload & Restore
// -------------------------------------------------------------
parser2Router.post('/jobs/:jobId/questions/:questionId/recrop', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const {
      boundingBox,
      pageNumber,
      figureType = 'diagram',
      cropType,
      targetOption,
      placement,
      caption,
      tableRow,
      tableCol,
      cropMode = 'replace',
      replaceFigureId
    } = req.body;

    if (!boundingBox || !Array.isArray(boundingBox) || boundingBox.length !== 4) {
      return res.status(400).json({ success: false, error: 'Valid boundingBox [ymin, xmin, ymax, xmax] required.' });
    }

    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const resolvedCropType: Parser2CropType = (cropType || figureType || 'diagram') as Parser2CropType;
    const inferredOptionFromCropType = /^option_([A-D])$/.exec(resolvedCropType)?.[1] as
      | 'A'
      | 'B'
      | 'C'
      | 'D'
      | undefined;
    const effectiveTargetOption = targetOption || inferredOptionFromCropType;

    const targetPage = Math.max(1, Number(pageNumber || q.sourcePageNumber || 1));
    const pdfBuffer = await getParser2AssetBuffer(jobId, 'source', 'questions.pdf');
    if (!pdfBuffer) return res.status(404).json({ success: false, error: 'Source PDF not found.' });

    const pageImageBuffer = await figureExtractionService.renderPdfPageToPng(pdfBuffer, targetPage, 200);

    const optSuffix = effectiveTargetOption && ['A', 'B', 'C', 'D'].includes(effectiveTargetOption)
      ? `opt${effectiveTargetOption}`
      : cropMode === 'add'
      ? `${resolvedCropType}_${Date.now()}`
      : `${resolvedCropType}_manual`;
    const figureRecord = await figureExtractionService.extractAndSaveFigure(
      jobId,
      targetPage,
      q.questionNumber,
      pageImageBuffer,
      boundingBox as [number, number, number, number],
      effectiveTargetOption ? 'chemical_structure' : resolvedCropType,
      true,
      {
        layoutMode: 'manual',
        suffix: optSuffix,
        questionId: q.id,
        sourcePdfId: q.sourcePdfId || 'questions.pdf',
        cropType: resolvedCropType,
        skipTrim: true
      }
    );

    await upsertParser2Figures(jobId, [figureRecord]);

    const pageMeta = formatSourcePageRange(
      [...(q.sourcePages || [q.sourcePageNumber]), targetPage],
      q.sourcePageNumber
    );

    if (effectiveTargetOption && ['A', 'B', 'C', 'D'].includes(effectiveTargetOption)) {
      const origOptFigs = q.originalOptionFigures || (q.optionFigures ? { ...q.optionFigures } : undefined);
      const optPlacement = `option_${effectiveTargetOption}` as Parser2ImagePlacement;
      const optAtt: Parser2ImageAttachment = {
        id: `att-${figureRecord.id}`,
        url: figureRecord.figureUrl,
        placement: optPlacement,
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : undefined,
        alt: `Page ${targetPage} Option ${effectiveTargetOption}`,
        alignment: 'center',
        widthPercent: 85,
        sourceType: 'pdf_crop',
        sourcePageNumber: targetPage,
        createdAt: new Date().toISOString()
      };
      const existingAtts = Array.isArray(q.imageAttachments) ? [...q.imageAttachments] : [];
      const nextAtts =
        cropMode === 'add'
          ? [...existingAtts, optAtt]
          : [...existingAtts.filter(a => a.placement !== optPlacement), optAtt];
      const nextPrimaryOptUrl =
        cropMode === 'add' && q.optionFigures?.[effectiveTargetOption]
          ? q.optionFigures[effectiveTargetOption]
          : figureRecord.figureUrl;
      const optFigures = { ...(q.optionFigures || {}), [effectiveTargetOption]: nextPrimaryOptUrl };
      const updatedOpts = (q.options || []).map(opt => {
        if (opt.label === effectiveTargetOption) {
          const curText = opt.value && !isPlaceholderOption(opt.value) ? opt.value : `[Figure ${effectiveTargetOption}]`;
          return { ...opt, value: curText, text: curText, imageUrl: nextPrimaryOptUrl, isVisualOption: true };
        }
        return opt;
      });
      const updatedOptFigsList = [...(q.figures || []), figureRecord];

      const strict = evaluateStrictQuestionStatus({
        questionType: q.questionType,
        questionText: q.questionText,
        options: updatedOpts,
        optionFigures: optFigures,
        figureUrl: q.figureUrl,
        matchTable: q.matchTable,
        structuredTable: q.structuredTable,
        reviewNotes: q.reviewNotes || '',
        confidenceScore: Math.max(q.confidenceScore || 90, 92)
      });

      const updated = await updateParser2Question(jobId, questionId, {
        sourcePageNumber: pageMeta.startPage,
        sourcePageEnd: pageMeta.endPage,
        sourcePages: pageMeta.sourcePages,
        sourcePageRange: pageMeta.label,
        optionFigures: optFigures,
        originalOptionFigures: origOptFigs,
        options: updatedOpts,
        figures: updatedOptFigsList,
        figureAssetIds: updatedOptFigsList.map(f => f.id),
        imageAttachments: nextAtts,
        verificationStatus: strict.verificationStatus,
        reviewRequired: strict.reviewRequired,
        reviewNotes: strict.reviewNotes,
        componentValidation: strict.componentValidation,
        confidenceScore: strict.confidenceScore
      });

      await refreshJobStatsAndReport(jobId);

      return res.json({
        success: true,
        figure: figureRecord,
        question: updated,
        message: `Cropped Page ${targetPage} and ${cropMode === 'add' ? 'added to' : 'attached to'} Option (${effectiveTargetOption}) for Q${q.questionNumber}!`
      });
    }

    const preservedOriginal = q.originalFigureUrl || q.figureUrl || figureRecord.figureUrl;
    const isAddMode = cropMode === 'add' && Boolean(q.figureUrl);
    let updatedFiguresList: Parser2Figure[];
    if (replaceFigureId) {
      updatedFiguresList = (q.figures || []).map(f => (f.id === replaceFigureId ? figureRecord : f));
      if (!updatedFiguresList.some(f => f.id === figureRecord.id)) {
        updatedFiguresList.push(figureRecord);
      }
    } else if (isAddMode) {
      updatedFiguresList = [...(q.figures || []), figureRecord];
    } else {
      updatedFiguresList = [figureRecord, ...(q.figures || []).filter(f => f.id !== figureRecord.id)];
    }

    const nextPrimaryFigureUrl =
      replaceFigureId && q.figureUrl && !q.figures?.some(f => f.id === replaceFigureId && f.figureUrl === q.figureUrl)
        ? q.figureUrl
        : isAddMode
        ? q.figureUrl!
        : figureRecord.figureUrl;

    const resolvedPlacement: Parser2ImagePlacement = (placement as Parser2ImagePlacement) || 'after_question';
    const parsedRow = tableRow !== undefined && tableRow !== '' && Number.isFinite(Number(tableRow)) ? Math.max(0, Math.round(Number(tableRow))) : undefined;
    const parsedCol = tableCol !== undefined && tableCol !== '' && Number.isFinite(Number(tableCol)) ? Math.max(0, Math.round(Number(tableCol))) : undefined;
    const newAttachment: Parser2ImageAttachment = {
      id: `att-${figureRecord.id}`,
      url: figureRecord.figureUrl,
      placement: resolvedPlacement,
      tableRow: parsedRow,
      tableCol: parsedCol,
      caption: typeof caption === 'string' && caption.trim() ? caption.trim() : undefined,
      alt: `Page ${targetPage} ${resolvedCropType}`,
      alignment: 'center',
      widthPercent: 85,
      sourceType: 'pdf_crop',
      sourcePageNumber: targetPage,
      createdAt: new Date().toISOString()
    };

    const existingAttachments = Array.isArray(q.imageAttachments) ? [...q.imageAttachments] : [];
    const nextAttachments =
      cropMode === 'replace' && resolvedPlacement === 'after_question' && existingAttachments.some(a => a.placement === 'after_question')
        ? existingAttachments.map(a => (a.placement === 'after_question' ? newAttachment : a))
        : [...existingAttachments, newAttachment];

    const isExplanationSlot = resolvedPlacement === 'explanation' || resolvedPlacement === 'answer_key_explanation';
    const nextExplanationImageUrl = isExplanationSlot ? figureRecord.figureUrl : q.explanationImageUrl;

    const strict = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: q.questionText,
      options: q.options,
      optionFigures: q.optionFigures,
      figureUrl: isExplanationSlot ? q.figureUrl : nextPrimaryFigureUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: q.reviewNotes || '',
      confidenceScore: Math.max(q.confidenceScore || 90, 92)
    });

    const updated = await updateParser2Question(jobId, questionId, {
      sourcePageNumber: pageMeta.startPage,
      sourcePageEnd: pageMeta.endPage,
      sourcePages: pageMeta.sourcePages,
      sourcePageRange: pageMeta.label,
      figureUrl: isExplanationSlot ? q.figureUrl : nextPrimaryFigureUrl,
      explanationImageUrl: nextExplanationImageUrl,
      originalFigureUrl: preservedOriginal,
      figures: updatedFiguresList,
      figureAssetIds: updatedFiguresList.map(f => f.id),
      imageAttachments: nextAttachments,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation,
      confidenceScore: strict.confidenceScore
    });

    await refreshJobStatsAndReport(jobId);

    return res.json({
      success: true,
      figure: figureRecord,
      attachment: newAttachment,
      question: updated,
      message: isAddMode
        ? `Attached Page ${targetPage} crop (${resolvedCropType}) to Question ${q.questionNumber}!`
        : `Figure cropped from Page ${targetPage} (${resolvedPlacement}) for Question ${q.questionNumber}!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a specific crop figure attached to a question
parser2Router.delete('/jobs/:jobId/questions/:questionId/figures/:figureId', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId, figureId } = req.params;
    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const remainingFigs = (q.figures || []).filter(f => f.id !== figureId);
    const removedFig = (q.figures || []).find(f => f.id === figureId);
    const nextPrimaryUrl =
      removedFig && q.figureUrl === removedFig.figureUrl
        ? remainingFigs[0]?.figureUrl
        : remainingFigs.length > 0
        ? q.figureUrl || remainingFigs[0].figureUrl
        : undefined;

    const allJobFigs = (await getParser2Figures(jobId)).filter(f => f.id !== figureId);
    await saveParser2Figures(jobId, allJobFigs);

    const strict = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: q.questionText,
      options: q.options,
      optionFigures: q.optionFigures,
      figureUrl: nextPrimaryUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: q.reviewNotes || '',
      confidenceScore: q.confidenceScore || 85
    });

    const updated = await updateParser2Question(jobId, questionId, {
      figureUrl: nextPrimaryUrl,
      figures: remainingFigs,
      figureAssetIds: remainingFigs.map(f => f.id),
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation
    });

    await refreshJobStatsAndReport(jobId);
    return res.json({ success: true, question: updated, message: 'Removed crop attachment.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Set a specific attached crop as primary figure for a question
parser2Router.put('/jobs/:jobId/questions/:questionId/figures/:figureId/primary', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId, figureId } = req.params;
    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const target = (q.figures || []).find(f => f.id === figureId);
    if (!target) return res.status(404).json({ success: false, error: 'Figure not found on question.' });

    const reordered = [target, ...(q.figures || []).filter(f => f.id !== figureId)];
    const updated = await updateParser2Question(jobId, questionId, {
      figureUrl: target.figureUrl,
      figures: reordered,
      figureAssetIds: reordered.map(f => f.id)
    });
    await refreshJobStatsAndReport(jobId);
    return res.json({ success: true, question: updated, message: 'Updated primary figure.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reassign an already-cropped figure's placement/destination (e.g. move to Option A-D, Explanation, or Question Stem)
parser2Router.put('/jobs/:jobId/questions/:questionId/figures/:figureId/reassign', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId, figureId } = req.params;
    const { placement = 'after_question', caption } = req.body || {};
    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const target = (q.figures || []).find(f => f.id === figureId);
    if (!target) return res.status(404).json({ success: false, error: 'Figure not found on question.' });

    const resolvedPlacement = String(placement || 'after_question') as Parser2ImagePlacement;
    const optMatch = /^option_([A-D])$/.exec(resolvedPlacement);
    const nextOptFigs = { ...(q.optionFigures || {}) };
    let nextOptions = [...(q.options || [])];
    let nextFigureUrl = q.figureUrl;
    let nextExplanationImg = q.explanationImageUrl;

    if (optMatch) {
      const optLbl = optMatch[1] as 'A' | 'B' | 'C' | 'D';
      nextOptFigs[optLbl] = target.figureUrl;
      nextOptions = nextOptions.map(o =>
        o.label === optLbl
          ? {
              ...o,
              value: o.value && !isPlaceholderOption(o.value) ? o.value : `[Figure ${optLbl}]`,
              text: o.text && !isPlaceholderOption(o.text) ? o.text : `[Figure ${optLbl}]`,
              imageUrl: target.figureUrl,
              isVisualOption: true
            }
          : o
      );
      if (nextFigureUrl === target.figureUrl) {
        const otherFig = (q.figures || []).find(f => f.id !== figureId);
        nextFigureUrl = otherFig?.figureUrl;
      }
    } else if (resolvedPlacement === 'explanation' || resolvedPlacement === 'answer_key_explanation') {
      nextExplanationImg = target.figureUrl;
      if (nextFigureUrl === target.figureUrl) {
        const otherFig = (q.figures || []).find(f => f.id !== figureId);
        nextFigureUrl = otherFig?.figureUrl;
      }
    } else if (resolvedPlacement === 'after_question' || resolvedPlacement === 'before_question') {
      nextFigureUrl = target.figureUrl;
    }

    const existingAtts = Array.isArray(q.imageAttachments) ? [...q.imageAttachments] : [];
    const attIdx = existingAtts.findIndex(a => a.url === target.figureUrl || a.id === `att-${target.id}`);
    const updatedAtt: Parser2ImageAttachment = {
      id: attIdx >= 0 ? existingAtts[attIdx].id : `att-${target.id}`,
      url: target.figureUrl,
      placement: resolvedPlacement,
      caption: typeof caption === 'string' && caption.trim() ? caption.trim() : existingAtts[attIdx]?.caption,
      alt: `Page ${target.pageNumber} ${target.cropType || target.figureType || 'figure'}`,
      alignment: 'center',
      widthPercent: 85,
      sourceType: 'pdf_crop',
      sourcePageNumber: target.pageNumber,
      createdAt: existingAtts[attIdx]?.createdAt || new Date().toISOString()
    };
    const nextAttachments =
      attIdx >= 0
        ? existingAtts.map((a, idx) => (idx === attIdx ? updatedAtt : a))
        : [...existingAtts, updatedAtt];

    const strict = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: q.questionText,
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      figureUrl: nextFigureUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: q.reviewNotes || '',
      confidenceScore: Math.max(q.confidenceScore || 90, 90)
    });

    const updated = await updateParser2Question(jobId, questionId, {
      figureUrl: nextFigureUrl,
      explanationImageUrl: nextExplanationImg,
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      imageAttachments: nextAttachments,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation
    });

    await refreshJobStatsAndReport(jobId);
    return res.json({
      success: true,
      question: updated,
      message: `Reassigned crop to "${resolvedPlacement.replace(/_/g, ' ')}".`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Remove an unwanted image attached to a specific option (A, B, C, or D) in 1 click
parser2Router.delete('/jobs/:jobId/questions/:questionId/options/:optionLabel/figure', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId, optionLabel } = req.params;
    const lbl = String(optionLabel || '').toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(lbl)) {
      return res.status(400).json({ success: false, error: 'optionLabel must be A, B, C, or D.' });
    }

    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const nextOptFigs = { ...(q.optionFigures || {}) };
    const removedUrl = nextOptFigs[lbl];
    delete nextOptFigs[lbl];

    const nextOptions = (q.options || []).map(o => {
      if (o.label !== lbl) return o;
      const cleanVal = o.value && !/^\[Figure\s+[A-D]\]$/i.test(o.value) ? o.value : '';
      return {
        ...o,
        text: cleanVal,
        value: cleanVal,
        imageUrl: undefined,
        isVisualOption: false
      };
    });

    const nextAttachments = (q.imageAttachments || []).filter(
      a => !(a.placement === `option_${lbl}` || (removedUrl && a.url === removedUrl))
    );

    const strict = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: q.questionText,
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      figureUrl: q.figureUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: q.reviewNotes || '',
      confidenceScore: q.confidenceScore || 85
    });

    const updated = await updateParser2Question(jobId, questionId, {
      options: nextOptions,
      optionFigures: Object.keys(nextOptFigs).length > 0 ? nextOptFigs : undefined,
      imageAttachments: nextAttachments,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation
    });

    await refreshJobStatsAndReport(jobId);
    return res.json({
      success: true,
      question: updated,
      message: `Removed image from Option (${lbl}) on Question ${q.questionNumber}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Targeted Admin Re-Extraction for Options or Full Question Stem (supports previewOnly comparison before saving!)
parser2Router.post('/jobs/:jobId/questions/:questionId/re-extract', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const rawMode = String(req.body?.mode || 'options').toLowerCase();
    const mode: 'options' | 'question' | 'both' =
      rawMode === 'question' ? 'question' : rawMode === 'both' ? 'both' : 'options';
    const previewOnly = Boolean(req.body?.previewOnly);
    const allowOverwriteVerified = Boolean(req.body?.allowOverwriteVerified);

    const result = await jobQueueService.reExtractSingleQuestion(jobId, questionId, mode, {
      previewOnly,
      allowOverwriteVerified
    });
    if (!previewOnly) {
      await refreshJobStatsAndReport(jobId);
    }
    return res.json({
      success: true,
      previewOnly,
      question: result.question,
      preview: result.preview,
      message: result.message
    });
  } catch (err: any) {
    const msg = err?.message || 'Re-extraction failed.';
    const status = /not found|no source pdf|manually verified/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
});

parser2Router.post('/jobs/:jobId/questions/:questionId/auto-recrop', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const { targetOption, previewOnly = false, activePage } = req.body || {};
    const validOpt = targetOption && ['A', 'B', 'C', 'D'].includes(targetOption) ? targetOption : undefined;

    const updated = await jobQueueService.reprocessSingleQuestionVisuals(jobId, questionId, {
      targetOption: validOpt,
      previewOnly: Boolean(previewOnly),
      activePage: activePage ? Number(activePage) : undefined
    });
    if (!previewOnly) {
      await refreshJobStatsAndReport(jobId);
    }
    return res.json({
      success: true,
      question: updated,
      previewSuggestion: updated.previewSuggestion,
      message: previewOnly
        ? updated.previewSuggestion?.note || 'AI auto-locate preview ready.'
        : `AI auto-locate finished for Question ${updated.questionNumber}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/questions/:questionId/restore-original-figure', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const { targetOption } = req.body || {};
    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    if (targetOption && ['A', 'B', 'C', 'D'].includes(targetOption)) {
      const origUrl = q.originalOptionFigures?.[targetOption];
      if (!origUrl) {
        return res.status(400).json({ success: false, error: `No original image saved for Option ${targetOption}.` });
      }
      const nextOptFigs = { ...(q.optionFigures || {}), [targetOption]: origUrl };
      const nextOpts = (q.options || []).map(o => o.label === targetOption ? { ...o, imageUrl: origUrl, isVisualOption: true } : o);
      const strict = evaluateStrictQuestionStatus({
        questionText: q.questionText,
        options: nextOpts,
        optionFigures: nextOptFigs,
        figureUrl: q.figureUrl,
        reviewNotes: q.reviewNotes,
        confidenceScore: q.confidenceScore ?? 90
      });
      const updated = await updateParser2Question(jobId, questionId, {
        optionFigures: nextOptFigs,
        options: nextOpts,
        verificationStatus: strict.verificationStatus,
        reviewRequired: strict.reviewRequired,
        reviewNotes: strict.reviewNotes
      });
      await refreshJobStatsAndReport(jobId);
      return res.json({ success: true, question: updated, message: `Restored original image for Option ${targetOption}.` });
    }

    if (!q.originalFigureUrl) {
      return res.status(400).json({ success: false, error: 'No original crop saved to restore.' });
    }

    const strict = evaluateStrictQuestionStatus({
      questionText: q.questionText,
      options: q.options,
      optionFigures: q.optionFigures,
      figureUrl: q.originalFigureUrl,
      reviewNotes: '',
      confidenceScore: Math.max(q.confidenceScore ?? 90, 88)
    });

    const updated = await updateParser2Question(jobId, questionId, {
      figureUrl: q.originalFigureUrl,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes
    });

    await refreshJobStatsAndReport(jobId);
    return res.json({ success: true, question: updated, message: `Restored original figure crop for Question ${q.questionNumber}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/questions/:questionId/upload-figure', upload.single('figureFile'), async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId, questionId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'Image file is required.' });

    const mime = String(file.mimetype || '').toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mime)) {
      return res.status(400).json({ success: false, error: 'Only JPG, JPEG, PNG, and WebP images are allowed.' });
    }

    const rawPlacement = String(req.body?.placement || '').trim() as Parser2ImagePlacement;
    const inferredOptFromPlacement = /^option_([A-D])$/.exec(rawPlacement)?.[1] as 'A' | 'B' | 'C' | 'D' | undefined;
    const targetOption = (req.body?.targetOption && ['A', 'B', 'C', 'D'].includes(req.body.targetOption)
      ? req.body.targetOption
      : inferredOptFromPlacement) as 'A' | 'B' | 'C' | 'D' | undefined;
    const cropMode = req.body?.cropMode === 'replace' ? 'replace' : 'add';
    const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : undefined;
    const tableRow = req.body?.tableRow !== undefined && req.body.tableRow !== '' && Number.isFinite(Number(req.body.tableRow))
      ? Math.max(0, Math.round(Number(req.body.tableRow)))
      : undefined;
    const tableCol = req.body?.tableCol !== undefined && req.body.tableCol !== '' && Number.isFinite(Number(req.body.tableCol))
      ? Math.max(0, Math.round(Number(req.body.tableCol)))
      : undefined;

    const questions = await getParser2Questions(jobId);
    const q = questions.find(item => item.id === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Question not found.' });

    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const optTag = targetOption ? `_opt${targetOption}` : rawPlacement ? `_${rawPlacement}` : '';
    const fileName = `q${q.questionNumber}_upload${optTag}_${Date.now()}.${ext}`;

    const uploaded = await uploadParser2Asset(
      jobId,
      'figures',
      fileName,
      file.buffer,
      file.mimetype || 'image/png'
    );

    const figRecord: Parser2Figure = {
      id: `fig-upload-${jobId}-q${q.questionNumber}${optTag}-${Date.now()}`,
      jobId,
      questionId: q.id,
      questionNumber: q.questionNumber,
      pageNumber: q.sourcePageNumber || 1,
      figureKey: uploaded.storageKey,
      figureUrl: uploaded.publicUrl,
      figureType: targetOption ? 'chemical_structure' : 'diagram',
      isManualCrop: true,
      createdAt: new Date().toISOString()
    };

    const allFigs = await getParser2Figures(jobId);
    allFigs.push(figRecord);
    await saveParser2Figures(jobId, allFigs);

    const resolvedPlacement: Parser2ImagePlacement = targetOption
      ? (`option_${targetOption}` as Parser2ImagePlacement)
      : rawPlacement || 'after_question';

    const newAtt: Parser2ImageAttachment = {
      id: `att-${figRecord.id}`,
      url: uploaded.publicUrl,
      placement: resolvedPlacement,
      tableRow,
      tableCol,
      caption,
      alt: `Q${q.questionNumber} ${resolvedPlacement.replace(/_/g, ' ')}`,
      alignment: 'center',
      widthPercent: 85,
      sourceType: 'upload',
      createdAt: new Date().toISOString()
    };

    const existingAtts = Array.isArray(q.imageAttachments) ? [...q.imageAttachments] : [];

    if (targetOption) {
      const origOptFigs = q.originalOptionFigures || (q.optionFigures ? { ...q.optionFigures } : undefined);
      const nextPrimaryOptUrl =
        cropMode === 'add' && q.optionFigures?.[targetOption]
          ? q.optionFigures[targetOption]
          : uploaded.publicUrl;
      const nextOptFigs = { ...(q.optionFigures || {}), [targetOption]: nextPrimaryOptUrl };
      const nextOpts = (q.options || []).map(o => {
        if (o.label === targetOption) {
          const curTxt = o.value && !isPlaceholderOption(o.value) ? o.value : `[Figure ${targetOption}]`;
          return { ...o, value: curTxt, text: curTxt, imageUrl: nextPrimaryOptUrl, isVisualOption: true };
        }
        return o;
      });
      const nextAtts =
        cropMode === 'add'
          ? [...existingAtts, newAtt]
          : [...existingAtts.filter(a => a.placement !== resolvedPlacement), newAtt];
      const nextFigures = [...(q.figures || []), figRecord];
      const strict = evaluateStrictQuestionStatus({
        questionType: q.questionType,
        questionText: q.questionText,
        options: nextOpts,
        optionFigures: nextOptFigs,
        figureUrl: q.figureUrl,
        matchTable: q.matchTable,
        structuredTable: q.structuredTable,
        reviewNotes: '',
        confidenceScore: Math.max(q.confidenceScore ?? 90, 92)
      });
      const updated = await updateParser2Question(jobId, questionId, {
        optionFigures: nextOptFigs,
        originalOptionFigures: origOptFigs,
        options: nextOpts,
        figures: nextFigures,
        figureAssetIds: nextFigures.map(f => f.id),
        imageAttachments: nextAtts,
        verificationStatus: strict.verificationStatus,
        reviewRequired: strict.reviewRequired,
        reviewNotes: strict.reviewNotes,
        componentValidation: strict.componentValidation
      });
      await refreshJobStatsAndReport(jobId);
      return res.json({ success: true, question: updated, figureUrl: uploaded.publicUrl, placement: resolvedPlacement });
    }

    const isExplanationSlot = resolvedPlacement === 'explanation' || resolvedPlacement === 'answer_key_explanation';
    const isTableSlot =
      resolvedPlacement === 'table_cell' ||
      resolvedPlacement === 'match_left_table' ||
      resolvedPlacement === 'match_right_table';
    const preservedOriginal = q.originalFigureUrl || q.figureUrl || uploaded.publicUrl;
    const nextFigures = [figRecord, ...(q.figures || [])];
    const nextAtts = [...existingAtts, newAtt];
    const nextPrimaryFigureUrl =
      isExplanationSlot || isTableSlot
        ? q.figureUrl
        : cropMode === 'add' && q.figureUrl
        ? q.figureUrl
        : uploaded.publicUrl;

    const strict = evaluateStrictQuestionStatus({
      questionType: q.questionType,
      questionText: q.questionText,
      options: q.options,
      optionFigures: q.optionFigures,
      figureUrl: nextPrimaryFigureUrl,
      matchTable: q.matchTable,
      structuredTable: q.structuredTable,
      reviewNotes: '',
      confidenceScore: Math.max(q.confidenceScore ?? 90, 92)
    });

    const updated = await updateParser2Question(jobId, questionId, {
      figureUrl: nextPrimaryFigureUrl,
      explanationImageUrl: isExplanationSlot ? uploaded.publicUrl : q.explanationImageUrl,
      originalFigureUrl: preservedOriginal,
      figures: nextFigures,
      figureAssetIds: nextFigures.map(f => f.id),
      imageAttachments: nextAtts,
      verificationStatus: strict.verificationStatus,
      reviewRequired: strict.reviewRequired,
      reviewNotes: strict.reviewNotes,
      componentValidation: strict.componentValidation
    });

    await refreshJobStatsAndReport(jobId);
    return res.json({ success: true, question: updated, figureUrl: uploaded.publicUrl, placement: resolvedPlacement });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. Figures Gallery
// -------------------------------------------------------------
parser2Router.get('/jobs/:jobId/figures', async (req, res) => {
  try {
    const figures = await getParser2Figures(req.params.jobId);
    return res.json({ success: true, figures });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. Validation Audit Report
// -------------------------------------------------------------
parser2Router.get('/jobs/:jobId/validation', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getParser2JobById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const questions = await getParser2Questions(jobId);
    const figures = await getParser2Figures(jobId);
    const expectedCfg = resolveExpectedQuestionsForAudit(job);
    const report = validationEngine.auditQuestions(jobId, questions, expectedCfg.expectedTotal, {
      savedQuestions: questions.length,
      figuresExtracted: figures.length,
      expectedSource: expectedCfg.expectedSource
    });
    await saveParser2ValidationReport(report);

    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 7. Publishing to Student Mock Test Engine (Explicit Human Action)
// -------------------------------------------------------------
parser2Router.post('/jobs/:jobId/publish', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const job = await getParser2JobById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const questions = await getParser2Questions(jobId);
    const activeQuestions = questions.filter(q => !q.isDeleted);
    if (activeQuestions.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot publish a test with 0 saved questions.' });
    }

    const excludeIncomplete = Boolean(req.body.excludeIncomplete);
    const questionsToAudit = excludeIncomplete
      ? activeQuestions.filter(q => !INCOMPLETE_PARSER2_STATUSES.has(q.verificationStatus))
      : activeQuestions;

    // Module 8 Strict Publishing Safety Gate: verify no duplicate numbers & persisted count integrity
    const seenNums = new Set<number>();
    const dupNums: number[] = [];
    for (const q of questionsToAudit) {
      if (seenNums.has(q.questionNumber)) dupNums.push(q.questionNumber);
      seenNums.add(q.questionNumber);
    }
    if (dupNums.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot publish: Duplicate question number(s) detected (${dupNums.join(', ')}). Resolve duplicates before publishing.`
      });
    }

    const expectedCfg = resolveExpectedQuestionsForAudit(job);
    const report = validationEngine.auditQuestions(jobId, questionsToAudit, expectedCfg.expectedTotal, {
      savedQuestions: questionsToAudit.length,
      expectedSource: expectedCfg.expectedSource
    });

    if (!report.canPublish && req.body.force !== true && !excludeIncomplete) {
      return res.status(400).json({
        success: false,
        error: 'Critical validation errors or missing/incomplete questions remain unresolved. Resolve flagged questions, enable "Publish Complete Questions Only", or explicitly confirm admin publish override.',
        report
      });
    }

    const {
      testNumber,
      code,
      title,
      subtitle,
      description,
      instructions,
      folderName,
      testTypeCategory,
      categoryIds,
      isStandalone,
      inlineNewCategory,
      subject,
      chapter,
      visibility,
      thumbnailUrl,
      existingTestId,
      createNewCopy,
      difficulty,
      language,
      durationMinutes,
      correctMarks,
      negativeMarks,
      isFree,
      price,
      originalPrice,
      targetYear,
      ncertCoveragePercent
    } = req.body;

    // Optional inline creation of a custom Test Category during publishing
    let finalCategoryIds: string[] = Array.isArray(categoryIds)
      ? categoryIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0)
      : [];
    let createdCategory: TestCategory | null = null;

    if (inlineNewCategory && typeof inlineNewCategory.name === 'string' && inlineNewCategory.name.trim()) {
      createdCategory = createInlineCategoryInStore(inlineNewCategory);
      if (createdCategory && !finalCategoryIds.includes(createdCategory.id)) {
        finalCategoryIds.push(createdCategory.id);
      }
    }

    const result = publishParser2TestToStudentEngine({
      job,
      questions,
      excludeIncomplete,
      testNumber,
      code,
      title,
      subtitle,
      description,
      instructions,
      folderName,
      testTypeCategory,
      categoryIds: finalCategoryIds,
      isStandalone: Boolean(isStandalone),
      subject,
      chapter,
      visibility,
      thumbnailUrl,
      existingTestId,
      createNewCopy: Boolean(createNewCopy),
      difficulty,
      language,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      correctMarks: correctMarks ? parseInt(correctMarks, 10) : 4,
      negativeMarks: negativeMarks ? parseInt(negativeMarks, 10) : 1,
      isFree: isFree === true || isFree === 'true',
      price: price ? parseFloat(price) : 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : 0,
      targetYear: targetYear ? String(targetYear) : '2025',
      ncertCoveragePercent: ncertCoveragePercent ? parseInt(ncertCoveragePercent, 10) : 95
    });

    if (!result.mockQuestions || result.mockQuestions.length === 0 || !result.dbSynced) {
      return res.status(500).json({
        success: false,
        error: 'Failed to persist mock test questions to server store. Please try again.'
      });
    }

    // Atomic sync to Firebase RTDB + Cloudflare R2 + Cloudflare D1
    const { rtdbSynced, r2Synced, d1Synced } = await syncPublishedTestToRemoteStores(result.test, result.mockQuestions);

    job.status = 'published';
    job.currentStage = `Published to Student CBT (${result.testId})`;
    job.publishedTestId = result.testId;
    job.totalQuestions = Math.max(job.totalQuestions || 0, activeQuestions.length);
    job.questionsDetected = Math.max(job.questionsDetected || 0, activeQuestions.length);
    job.questionsSaved = result.mockQuestions.length;
    job.savedVerified = true;
    job.lastActivityAt = new Date().toISOString();
    await saveParser2Job(job);

    const categoryNames = resolveCategoryNamesForIds(result.test.categoryIds || []);
    const publicationVerification = {
      testId: result.testId,
      testTitle: result.test.title,
      savedQuestionsCount: result.mockQuestions.length,
      verifiedQuestionsCount: result.verifiedQuestionsCount,
      incompleteExcludedCount: result.incompleteExcludedCount,
      categoryIds: result.test.categoryIds || [],
      categoryNames,
      visibility: result.test.visibility || 'public',
      status: result.test.status,
      isStandalone: Boolean(result.test.isStandalone),
      dbSynced: result.dbSynced,
      rtdbSynced,
      r2Synced,
      d1Synced,
      visibleInStudentCatalog: result.test.status === 'published' && (result.test.visibility || 'public') === 'public',
      verifiedAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      testId: result.testId,
      test: result.test,
      job,
      createdCategory,
      publicationVerification,
      message: result.message
    });
  } catch (err: any) {
    console.error('[Parser2Routes] Publish error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Sync / Repair Publication for already published tests missing in Student CBT or showing Saved 0 Qs
parser2Router.post('/jobs/:jobId/repair-publication', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const reconciledJob = (await reconcileParser2JobCounts(jobId)) || (await getParser2JobById(jobId));
    if (!reconciledJob) return res.status(404).json({ success: false, error: 'Job not found' });

    const questions = await getParser2Questions(jobId);
    const activeQs = questions.filter(q => !q.isDeleted);
    const fallbackCategoryIds = Array.isArray(req.body?.categoryIds) ? req.body.categoryIds : undefined;

    const repaired = await repairPublishedParser2Test({
      job: reconciledJob,
      questions,
      fallbackCategoryIds
    });

    reconciledJob.status = 'published';
    reconciledJob.publishedTestId = repaired.test.id;
    reconciledJob.totalQuestions = Math.max(reconciledJob.totalQuestions || 0, activeQs.length);
    reconciledJob.questionsDetected = Math.max(reconciledJob.questionsDetected || 0, activeQs.length);
    reconciledJob.questionsSaved = repaired.verification.savedQuestionsCount;
    reconciledJob.savedVerified = repaired.verification.savedQuestionsCount > 0;
    reconciledJob.currentStage = `Published & Synced (${repaired.test.id})`;
    reconciledJob.lastActivityAt = new Date().toISOString();
    await saveParser2Job(reconciledJob);

    return res.json({
      success: true,
      testId: repaired.test.id,
      test: repaired.test,
      job: reconciledJob,
      publicationVerification: repaired.verification,
      message: `Publication synced & verified for "${repaired.test.title}" (${repaired.verification.savedQuestionsCount} Qs).`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 8. Settings & Connectivity Status
// -------------------------------------------------------------
parser2Router.get('/settings', async (_req, res) => {
  try {
    const settings = await getParser2Settings();
    const mistralConfigured = mistralOcrService.isConfigured();
    const geminiConfigured = geminiVerificationService.isConfigured();

    return res.json({
      success: true,
      settings,
      status: {
        mistralConfigured,
        geminiConfigured
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.put('/settings', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const updated = await saveParser2Settings(req.body);
    apiRateLimiter.configureProvider('gemini', {
      maxConcurrency: updated.geminiMaxConcurrency ?? 1,
      minIntervalMs: updated.geminiCooldownMs ?? 1500,
      maxRetries: updated.maxApiRetries ?? updated.retryCount ?? 5
    });
    apiRateLimiter.configureProvider('mistral', {
      maxConcurrency: updated.mistralMaxConcurrency ?? 1,
      minIntervalMs: updated.mistralCooldownMs ?? 1000,
      maxRetries: updated.maxApiRetries ?? updated.retryCount ?? 4
    });
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.get('/queue-status', async (_req, res) => {
  return res.json({
    success: true,
    providers: apiRateLimiter.getSnapshot(),
    watchdog: jobQueueService.getWatchdogStatus()
  });
});

parser2Router.get('/test-connections', async (_req, res) => {
  const mistral = await mistralOcrService.testConnection();
  const gemini = await geminiVerificationService.testConnection();

  return res.json({
    success: true,
    mistral,
    gemini
  });
});

// -------------------------------------------------------------
// 9. Module 3: Manual Copy-Paste & Multi-Format Import Routes
// -------------------------------------------------------------
parser2Router.post('/import/preview', upload.single('file'), async (req: express.Request, res: express.Response) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const file = req.file;
    let format = String(req.body?.format || '').toLowerCase().trim() as ManualImportFormat;
    const fileName = file?.originalname || req.body?.fileName || undefined;

    if (!format) {
      const lowName = (fileName || '').toLowerCase();
      if (lowName.endsWith('.md') || lowName.endsWith('.markdown')) format = 'markdown';
      else if (lowName.endsWith('.txt')) format = 'txt';
      else if (lowName.endsWith('.docx')) format = 'docx';
      else if (lowName.endsWith('.json')) format = 'json';
      else if (lowName.endsWith('.pdf')) format = 'pdf';
      else format = 'paste';
    }

    const preview = await manualImportService.buildImportPreview({
      format,
      rawText: typeof req.body?.rawText === 'string' ? req.body.rawText : undefined,
      fileBuffer: file?.buffer,
      fileName,
      defaultSubject: (req.body?.subject as any) || 'Combined',
      existingJobId: typeof req.body?.existingJobId === 'string' && req.body.existingJobId.trim() ? req.body.existingJobId.trim() : undefined,
      expectedCount: req.body?.expectedCount ? parseInt(String(req.body.expectedCount), 10) : undefined
    });

    return res.json({ success: true, preview });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

parser2Router.post('/import/commit', async (req: express.Request, res: express.Response) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const {
      testName,
      subject = 'Combined',
      chapter = '',
      format = 'paste',
      sourceFileName,
      existingJobId,
      importMissingOnly = false,
      expectedCount,
      questions
    } = req.body || {};

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one previewed question is required to commit import.' });
    }

    const result = await manualImportService.commitImportedQuestions({
      testName: String(testName || 'Imported Test'),
      subject,
      chapter,
      format,
      sourceFileName,
      existingJobId: typeof existingJobId === 'string' && existingJobId.trim() ? existingJobId.trim() : undefined,
      importMissingOnly: Boolean(importMissingOnly),
      expectedCount: expectedCount ? parseInt(String(expectedCount), 10) : undefined,
      questions
    });

    return res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 10. Module 4: Job Media Library, Direct Image Upload & Transform
// -------------------------------------------------------------
parser2Router.get('/jobs/:jobId/media', async (req, res) => {
  try {
    const { jobId } = req.params;
    const figures = await getParser2Figures(jobId);
    const questions = await getParser2Questions(jobId);

    const byUrl = new Map<string, { id: string; url: string; label: string; pageNumber?: number; questionNumber?: number; createdAt?: string; sourceType: string }>();
    for (const f of figures) {
      if (f?.figureUrl && !byUrl.has(f.figureUrl)) {
        byUrl.set(f.figureUrl, {
          id: f.id,
          url: f.figureUrl,
          label: `Q${f.questionNumber || '?'} • ${f.cropType || f.figureType || 'figure'} (Pg ${f.pageNumber || 1})`,
          pageNumber: f.pageNumber,
          questionNumber: f.questionNumber,
          createdAt: f.createdAt,
          sourceType: f.isManualCrop ? 'manual' : 'auto'
        });
      }
    }
    for (const q of questions) {
      for (const att of q.imageAttachments || []) {
        if (att?.url && !byUrl.has(att.url)) {
          byUrl.set(att.url, {
            id: att.id,
            url: att.url,
            label: att.caption || `Q${q.questionNumber} • ${att.placement}`,
            pageNumber: att.sourcePageNumber || q.sourcePageNumber,
            questionNumber: q.questionNumber,
            createdAt: att.createdAt,
            sourceType: att.sourceType || 'upload'
          });
        }
      }
    }

    return res.json({ success: true, media: Array.from(byUrl.values()) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/media/upload', upload.single('imageFile'), async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'Image file is required (PNG, JPG, JPEG, or WebP).' });

    const mime = (file.mimetype || 'image/png').toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mime)) {
      return res.status(400).json({ success: false, error: `Unsupported image type "${mime}". Allowed: PNG, JPG, JPEG, WebP.` });
    }

    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const qNum = req.body?.questionNumber ? parseInt(String(req.body.questionNumber), 10) : undefined;
    const placement = String(req.body?.placement || 'after_question');
    const fileName = `media_${qNum ? `q${qNum}_` : ''}${placement}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const uploaded = await uploadParser2Asset(jobId, 'figures', fileName, file.buffer, mime);

    let naturalWidth: number | undefined;
    let naturalHeight: number | undefined;
    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(file.buffer).metadata();
      naturalWidth = meta.width;
      naturalHeight = meta.height;
    } catch {}

    const figRecord: Parser2Figure = {
      id: `fig-media-${jobId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      jobId,
      questionId: typeof req.body?.questionId === 'string' ? req.body.questionId : undefined,
      questionNumber: qNum,
      pageNumber: 1,
      figureKey: uploaded.storageKey,
      figureUrl: uploaded.publicUrl,
      figureType: 'diagram',
      width: naturalWidth,
      height: naturalHeight,
      naturalWidth,
      naturalHeight,
      isManualCrop: true,
      createdAt: new Date().toISOString()
    };
    await upsertParser2Figures(jobId, [figRecord]);

    return res.json({
      success: true,
      url: uploaded.publicUrl,
      storageKey: uploaded.storageKey,
      width: naturalWidth,
      height: naturalHeight,
      figure: figRecord
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

parser2Router.post('/jobs/:jobId/media/transform', async (req, res) => {
  if (!requireAdminIfIdentified(req, res)) return;
  try {
    const { jobId } = req.params;
    const { url, rotation = 0, cropBox, maxWidth } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Image URL is required to transform.' });
    }

    let imgBuf: Buffer | null = null;
    // Support both /api/r2/parser2/<jobId>/<category>/<fileName> and /storage/parser2/jobs/<jobId>/<category>/<fileName>
    const r2Match =
      url.match(/\/api\/r2\/parser2\/([^/]+)\/([^/]+)\/([^/?#]+)/) ||
      url.match(/\/storage\/parser2\/jobs\/([^/]+)\/([^/]+)\/([^/?#]+)/);
    if (r2Match) {
      imgBuf = await getParser2AssetBuffer(r2Match[1], r2Match[2] as any, decodeURIComponent(r2Match[3]));
    } else if (/^https?:\/\//i.test(url)) {
      const resp = await fetch(url);
      if (resp.ok) {
        imgBuf = Buffer.from(await resp.arrayBuffer());
      }
    }

    if (!imgBuf) {
      return res.status(404).json({ success: false, error: 'Could not load source image for transformation.' });
    }

    const sharp = (await import('sharp')).default;
    let pipeline = sharp(imgBuf);
    const meta = await pipeline.metadata();

    if (Array.isArray(cropBox) && cropBox.length === 4 && meta.width && meta.height) {
      const [ymin, xmin, ymax, xmax] = cropBox.map(Number);
      const left = Math.max(0, Math.round((Math.min(xmin, xmax) / 1000) * meta.width));
      const top = Math.max(0, Math.round((Math.min(ymin, ymax) / 1000) * meta.height));
      const width = Math.max(10, Math.min(meta.width - left, Math.round((Math.abs(xmax - xmin) / 1000) * meta.width)));
      const height = Math.max(10, Math.min(meta.height - top, Math.round((Math.abs(ymax - ymin) / 1000) * meta.height)));
      pipeline = pipeline.extract({ left, top, width, height });
    }

    const deg = Number(rotation) || 0;
    if (deg % 360 !== 0) {
      pipeline = pipeline.rotate(deg);
    }

    if (maxWidth && Number(maxWidth) >= 80 && Number(maxWidth) <= 2400) {
      pipeline = pipeline.resize({ width: Math.round(Number(maxWidth)), withoutEnlargement: true });
    }

    const outBuf = await pipeline.png().toBuffer();
    const outMeta = await sharp(outBuf).metadata();
    const fileName = `media_edit_${Date.now()}_${Math.random().toString(36).slice(2, 5)}.png`;
    const uploaded = await uploadParser2Asset(jobId, 'figures', fileName, outBuf, 'image/png');

    return res.json({
      success: true,
      url: uploaded.publicUrl,
      width: outMeta.width,
      height: outMeta.height
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 11. Module 9: Live Safe Diagnostics Self-Test Endpoints (ZERO secrets/tokens)
// -------------------------------------------------------------
parser2Router.get('/diagnostics/api', async (_req, res) => {
  try {
    const t0 = Date.now();
    const [gemini, mistral] = await Promise.all([
      geminiVerificationService.testConnection(),
      mistralOcrService.testConnection()
    ]);
    const rateLimiter = apiRateLimiter.getSnapshot();
    return res.json({
      success: true,
      ok: Boolean(gemini.success || mistral.success),
      latencyMs: Date.now() - t0,
      gemini: {
        configured: geminiVerificationService.isConfigured(),
        ok: Boolean(gemini.success),
        model: gemini.model,
        message: gemini.success ? `Connected (${gemini.model || 'Gemini'})` : (gemini.error || 'Unavailable')
      },
      mistral: {
        configured: mistralOcrService.isConfigured(),
        ok: Boolean(mistral.success),
        model: mistral.model,
        message: mistral.success ? `Connected (${mistral.model || 'Mistral'})` : (mistral.error || 'Not configured')
      },
      rateLimiter,
      checkedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, ok: false, error: err.message });
  }
});

parser2Router.post('/diagnostics/db', async (_req, res) => {
  try {
    const result = await runDatabaseSelfTest();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, ok: false, error: err.message });
  }
});

parser2Router.post('/diagnostics/r2', async (_req, res) => {
  const t0 = Date.now();
  try {
    const probePayload = Buffer.from(`NCERTIFY_R2_DIAG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 'utf8');
    const probeJobId = '_diagnostics';
    const probeFile = `r2_probe_${Date.now()}.txt`;
    const uploaded = await uploadParser2Asset(probeJobId, 'figures', probeFile, probePayload, 'text/plain');
    const readBack = await getParser2AssetBuffer(probeJobId, 'figures', probeFile);
    const matched = Boolean(readBack && Buffer.compare(readBack, probePayload) === 0);
    await deleteParser2JobAssets(probeJobId).catch(() => {});

    return res.json({
      success: true,
      ok: matched,
      r2Configured: Boolean(getR2Client()),
      storageTier: uploaded.r2Synced ? 'cloudflare_r2' : 'local_fallback',
      bytesVerified: readBack?.length || 0,
      latencyMs: Date.now() - t0,
      checkedAt: new Date().toISOString(),
      message: matched
        ? `Upload & readback verified (${probePayload.length} bytes via ${uploaded.r2Synced ? 'Cloudflare R2' : 'Local Storage'}).`
        : 'Readback verification mismatch.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, ok: false, latencyMs: Date.now() - t0, error: err.message });
  }
});

parser2Router.post('/diagnostics/queue', async (_req, res) => {
  try {
    const result = await jobQueueService.runQueueSelfTest();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, ok: false, error: err.message });
  }
});
