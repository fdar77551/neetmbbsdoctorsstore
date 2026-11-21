// NCERTify AI Parser 2.0 / 3.0 - Triple-Durable Database Repository
// Tier 1: Isolated atomic local JSON store (parser2_store.json)
// Tier 2: Cloudflare R2 JSON persistence (parser2/db/jobs/{jobId}/*.json + jobs_index.json)
// Tier 3: Cloudflare D1 Relational DB (when API token configured) + Firebase RTDB index mirror

import fs from 'fs';
import path from 'path';
import {
  Parser2Job,
  Parser2SourceFile,
  Parser2Page,
  Parser2Question,
  Parser2Figure,
  Parser2AnswerKeyEntry,
  Parser2ValidationReport,
  Parser2ProcessingLog,
  Parser2Settings,
  isPlaceholderOption,
  isPageCompletedStatus
} from './types';
import { formatSourcePageRange } from './layoutEngine';
import { getR2Client, getR2Json, putR2Json, listR2Keys } from './parser2R2Storage';

const LEGACY_STORE_PATH = path.resolve(process.cwd(), 'store_database.json');
let PARSER2_STORE_PATH = path.resolve(process.cwd(), 'parser2_store.json');
const FIREBASE_RTDB_BASE = 'https://ncertify-neet-master-tests-default-rtdb.firebaseio.com';

const R2_INDEX_KEY = 'parser2/db/jobs_index.json';
const R2_DELETED_KEY = 'parser2/db/deleted_jobs.json';
const R2_SETTINGS_KEY = 'parser2/db/settings.json';
const r2JobKey = (jobId: string, part: string) => `parser2/db/jobs/${jobId}/${part}.json`;

export function setParser2StorePath(customPath: string): void {
  PARSER2_STORE_PATH = customPath;
  migratedOnce = false;
  lastHydrateAt = 0;
}

export const DEFAULT_PARSER2_SETTINGS: Parser2Settings = {
  mistralOcrEnabled: true,
  geminiVerificationEnabled: true,
  defaultProvider: 'gemini',
  geminiModel: 'gemini-4-hydrogen',
  mistralModel: 'mistral-ocr-latest',
  allowProviderFallback: true,
  fallbackProvider: 'gemini',
  autoScanAnswerKey: true,
  geminiMaxConcurrency: 1,
  geminiCooldownMs: 1800,
  mistralMaxConcurrency: 1,
  mistralCooldownMs: 1200,
  maxApiRetries: 4,
  ocrBatchSize: 4,
  retryCount: 3,
  pageLimit: 100,
  maxFileSizeMb: 50,
  figureDpi: 180,
  requireManualReviewForUncertain: true,
  estimatedCostPerPageCent: 0.15
};

let migratedOnce = false;
let d1TablesInitialized = false;
let lastHydrateAt = 0;
let activeHydratePromise: Promise<void> | null = null;
const hydratedJobDetails = new Set<string>();
const hydratingJobPromises = new Map<string, Promise<void>>();

const EMPTY_STORE = () => ({
  parser2_jobs: [] as Parser2Job[],
  parser2_deleted_jobs: [] as string[],
  parser2_source_files: {} as Record<string, Parser2SourceFile[]>,
  parser2_pages: {} as Record<string, Parser2Page[]>,
  parser2_questions: {} as Record<string, Parser2Question[]>,
  parser2_figures: {} as Record<string, Parser2Figure[]>,
  parser2_answer_keys: {} as Record<string, Record<number, Parser2AnswerKeyEntry>>,
  parser2_validation_reports: {} as Record<string, Parser2ValidationReport>,
  parser2_processing_logs: {} as Record<string, Parser2ProcessingLog[]>,
  parser2_settings: { ...DEFAULT_PARSER2_SETTINGS }
});

function sanitizeForRtdb<T>(val: T): T {
  try {
    return JSON.parse(JSON.stringify(val, (_k, v) => (v === undefined ? null : v)));
  } catch {
    return val;
  }
}

function migrateFromLegacyStoreIfNeeded(currentStore: Record<string, any>): Record<string, any> {
  if (migratedOnce) return currentStore;
  migratedOnce = true;

  try {
    if (!fs.existsSync(LEGACY_STORE_PATH)) return currentStore;
    const raw = fs.readFileSync(LEGACY_STORE_PATH, 'utf-8');
    const legacy = JSON.parse(raw);
    if (!legacy || typeof legacy !== 'object') return currentStore;

    let changed = false;
    const deletedSet = new Set<string>(currentStore.parser2_deleted_jobs || []);
    const legacyJobs: Parser2Job[] = Array.isArray(legacy.parser2_jobs) ? legacy.parser2_jobs : [];
    const existingIds = new Set((currentStore.parser2_jobs || []).map((j: Parser2Job) => j.id));

    for (const lj of legacyJobs) {
      if (lj?.id && !existingIds.has(lj.id) && !deletedSet.has(lj.id)) {
        if (!currentStore.parser2_jobs) currentStore.parser2_jobs = [];
        currentStore.parser2_jobs.push(lj);
        existingIds.add(lj.id);
        changed = true;
      }
    }

    const mapKeys = [
      'parser2_source_files',
      'parser2_pages',
      'parser2_questions',
      'parser2_figures',
      'parser2_answer_keys',
      'parser2_validation_reports',
      'parser2_processing_logs'
    ];

    for (const k of mapKeys) {
      if (legacy[k] && typeof legacy[k] === 'object') {
        if (!currentStore[k]) currentStore[k] = {};
        for (const [jobId, val] of Object.entries(legacy[k])) {
          if (!deletedSet.has(jobId) && currentStore[k][jobId] === undefined) {
            currentStore[k][jobId] = val;
            changed = true;
          }
        }
      }
    }

    if (legacy.parser2_settings && !currentStore.parser2_settings) {
      currentStore.parser2_settings = { ...DEFAULT_PARSER2_SETTINGS, ...legacy.parser2_settings };
      changed = true;
    }

    if (changed) {
      saveStore(currentStore);
      console.log(`[Parser2Db] Migrated ${legacyJobs.length} legacy Parser 2.0 job(s) safely into dedicated parser2_store.json`);
    }
  } catch (e: any) {
    console.warn('[Parser2Db] Legacy store migration note:', e.message);
  }
  return currentStore;
}

function loadStore(): Record<string, any> {
  let store: Record<string, any> = EMPTY_STORE();
  try {
    if (fs.existsSync(PARSER2_STORE_PATH)) {
      const content = fs.readFileSync(PARSER2_STORE_PATH, 'utf-8');
      if (content && content.trim()) {
        store = { ...EMPTY_STORE(), ...JSON.parse(content) };
      }
    }
  } catch (e) {
    console.warn('[Parser2Db] Store read error:', e);
  }
  return migrateFromLegacyStoreIfNeeded(store);
}

function saveStore(data: Record<string, any>): void {
  try {
    const dir = path.dirname(PARSER2_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${PARSER2_STORE_PATH}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, PARSER2_STORE_PATH);
  } catch (e) {
    console.error('[Parser2Db] Atomic store write error:', e);
  }
}

// Serialize synchronous read-modify-write store mutations cleanly
let writeChain: Promise<void> = Promise.resolve();
function withStoreWrite<T>(fn: (store: Record<string, any>) => T): Promise<T> {
  const next = writeChain.then(() => {
    const store = loadStore();
    const res = fn(store);
    saveStore(store);
    return res;
  });
  writeChain = next.then(() => undefined, () => undefined);
  return next;
}

// Serialize R2 index updates so concurrent jobs never clobber each other in R2_INDEX_KEY
let r2IndexChain: Promise<void> = Promise.resolve();
function enqueueR2IndexSync(): Promise<boolean> {
  const next = r2IndexChain.then(async () => {
    const store = loadStore();
    const jobs: Parser2Job[] = Array.isArray(store.parser2_jobs) ? store.parser2_jobs : [];
    const ok = await putR2Json(R2_INDEX_KEY, {
      jobs,
      updatedAt: new Date().toISOString()
    });
    // Also mirror lightweight index to Firebase RTDB
    try {
      const rtdbMap: Record<string, Parser2Job> = {};
      for (const j of jobs) {
        rtdbMap[j.id] = sanitizeForRtdb(j);
      }
      await fetch(`${FIREBASE_RTDB_BASE}/parser2_jobs.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rtdbMap)
      }).catch(() => {});
    } catch {}
    return ok;
  });
  r2IndexChain = next.then(() => undefined, () => undefined);
  return next;
}

// -------------------------------------------------------------
// Unified Cloudflare D1 Configuration & Engine
// -------------------------------------------------------------
function getD1Config(): { accountId: string; apiToken: string; d1DatabaseId: string } {
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'd715d090a75efd8790b9a6da1e2f42d4';
  let apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_D1_TOKEN || '';
  let d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || 'daf5a141-af4a-4db6-b10d-ac3bbab28b72';

  if (!apiToken || !d1DatabaseId) {
    try {
      if (fs.existsSync(LEGACY_STORE_PATH)) {
        const legacy = JSON.parse(fs.readFileSync(LEGACY_STORE_PATH, 'utf-8'));
        const cf = legacy?.settings?.cloudflare;
        if (cf) {
          if (cf.accountId) accountId = cf.accountId;
          if (!apiToken && cf.apiToken) apiToken = cf.apiToken;
          if (cf.d1DatabaseId) d1DatabaseId = cf.d1DatabaseId;
        }
      }
    } catch {}
  }

  return { accountId, apiToken, d1DatabaseId };
}

export function isD1Configured(): boolean {
  const { apiToken, d1DatabaseId } = getD1Config();
  return Boolean(apiToken && d1DatabaseId);
}

async function executeD1Query(
  sql: string,
  params: any[] = [],
  options?: { ignoreDuplicateColumn?: boolean }
): Promise<any> {
  const { accountId, apiToken, d1DatabaseId } = getD1Config();
  if (!apiToken || !d1DatabaseId) {
    return { success: true, localOnly: true };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${d1DatabaseId}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });
    const json = await res.json();
    if (!json?.success && json?.errors?.length) {
      const errText = JSON.stringify(json.errors);
      if (options?.ignoreDuplicateColumn && /duplicate column name/i.test(errText)) {
        return { success: true, alreadyExists: true };
      }
      console.warn('[Parser2Db] D1 query error:', errText.slice(0, 200));
    }
    return json;
  } catch (e: any) {
    console.warn('[Parser2Db] D1 Remote sync notice:', e.message);
    return { success: false, error: e.message };
  }
}

async function getD1TableColumns(tableName: string): Promise<Set<string> | null> {
  const res = await executeD1Query(`PRAGMA table_info(${tableName});`);
  const rows = res?.result?.[0]?.results;
  if (!Array.isArray(rows)) return null;
  return new Set(rows.map((r: any) => String(r?.name || '').toLowerCase()).filter(Boolean));
}

export async function ensureParser2D1Tables(): Promise<void> {
  if (d1TablesInitialized) return;
  const { apiToken, d1DatabaseId } = getD1Config();
  if (!apiToken || !d1DatabaseId) return;
  d1TablesInitialized = true;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS parser2_jobs (id TEXT PRIMARY KEY, test_name TEXT NOT NULL, subject TEXT NOT NULL, chapter TEXT, question_range TEXT, ocr_engine TEXT NOT NULL DEFAULT 'mistral', gemini_model TEXT NOT NULL DEFAULT 'gemini-4-hydrogen', enable_gemini_verification INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'queued', current_stage TEXT, failed_stage TEXT, total_pages INTEGER NOT NULL DEFAULT 0, completed_pages INTEGER NOT NULL DEFAULT 0, failed_pages INTEGER NOT NULL DEFAULT 0, total_questions INTEGER NOT NULL DEFAULT 0, questions_detected INTEGER NOT NULL DEFAULT 0, questions_saved INTEGER NOT NULL DEFAULT 0, saved_verified INTEGER NOT NULL DEFAULT 0, verified_questions INTEGER NOT NULL DEFAULT 0, review_required_count INTEGER NOT NULL DEFAULT 0, figure_count INTEGER NOT NULL DEFAULT 0, estimated_cost_usd REAL NOT NULL DEFAULT 0.0, retry_count INTEGER NOT NULL DEFAULT 0, manually_edited_count INTEGER NOT NULL DEFAULT 0, has_answer_key INTEGER NOT NULL DEFAULT 0, quality_score INTEGER NOT NULL DEFAULT 0, reconciliation_json TEXT, quality_breakdown_json TEXT, published_test_id TEXT, error_message TEXT, original_pdf_file_name TEXT, source_question_pdf_name TEXT, source_solution_pdf_name TEXT, last_activity_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parser2_source_files (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, file_type TEXT NOT NULL, file_name TEXT NOT NULL, file_size INTEGER NOT NULL, storage_key TEXT NOT NULL, mime_type TEXT NOT NULL, page_count INTEGER NOT NULL DEFAULT 0, uploaded_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parser2_pages (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, page_number INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', ocr_raw_text TEXT, ocr_markdown TEXT, page_image_key TEXT, page_width INTEGER, page_height INTEGER, processing_time_ms INTEGER, error_message TEXT, updated_at TEXT NOT NULL, UNIQUE(job_id, page_number));`,
    `CREATE TABLE IF NOT EXISTS parser2_questions (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, test_id TEXT, question_number INTEGER NOT NULL, subject TEXT NOT NULL, chapter TEXT, question_type TEXT NOT NULL DEFAULT 'single_mcq', question_text TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL, options_json TEXT, correct_answer TEXT, answer_status TEXT, explanation TEXT, source_page_number INTEGER NOT NULL, source_page_end INTEGER, source_pages_json TEXT, source_page_range TEXT, detected_answer TEXT, imported_answer TEXT, answer_set_code TEXT, answer_source_page INTEGER, answer_confidence REAL, answer_key_status TEXT, page_layout TEXT, chemistry_content_type TEXT, figure_url TEXT, figures_json TEXT, option_figures_json TEXT, match_table_json TEXT, structured_table_json TEXT, component_validation_json TEXT, original_snapshot_json TEXT, verification_status TEXT NOT NULL DEFAULT 'verified', confidence_score INTEGER NOT NULL DEFAULT 100, review_required INTEGER NOT NULL DEFAULT 0, review_notes TEXT, admin_override INTEGER NOT NULL DEFAULT 0, is_manually_edited INTEGER NOT NULL DEFAULT 0, manually_edited_at TEXT, edited_fields_json TEXT, is_deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parser2_figures (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, question_id TEXT, question_number INTEGER, page_number INTEGER NOT NULL, source_pdf_id TEXT, figure_key TEXT NOT NULL, figure_url TEXT NOT NULL, crop_type TEXT, figure_type TEXT NOT NULL DEFAULT 'diagram', bounding_box_json TEXT, pixel_box_json TEXT, natural_width INTEGER, natural_height INTEGER, is_manual_crop INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parser2_answer_keys (job_id TEXT NOT NULL, question_number INTEGER NOT NULL, raw_answer TEXT NOT NULL, verified_answer TEXT NOT NULL, set_code TEXT, source_page INTEGER, confidence REAL, source_type TEXT NOT NULL, explanation TEXT, matched_at TEXT NOT NULL, PRIMARY KEY (job_id, question_number));`,
    `CREATE TABLE IF NOT EXISTS parser2_validation_reports (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, quality_score INTEGER NOT NULL DEFAULT 100, total_checks INTEGER NOT NULL DEFAULT 0, passed_checks INTEGER NOT NULL DEFAULT 0, critical_errors_count INTEGER NOT NULL DEFAULT 0, warnings_count INTEGER NOT NULL DEFAULT 0, can_publish INTEGER NOT NULL DEFAULT 0, report_json TEXT NOT NULL, summary TEXT, created_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parser2_processing_logs (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, level TEXT NOT NULL, stage TEXT NOT NULL, message TEXT NOT NULL, details TEXT, timestamp TEXT NOT NULL);`
  ];

  for (const sql of stmts) {
    await executeD1Query(sql).catch(() => {});
  }

  const jobColumns = await getD1TableColumns('parser2_jobs');
  const jobMigrations: Array<[string, string]> = [
    ['current_stage', `ALTER TABLE parser2_jobs ADD COLUMN current_stage TEXT;`],
    ['failed_stage', `ALTER TABLE parser2_jobs ADD COLUMN failed_stage TEXT;`],
    ['retry_count', `ALTER TABLE parser2_jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;`],
    ['manually_edited_count', `ALTER TABLE parser2_jobs ADD COLUMN manually_edited_count INTEGER NOT NULL DEFAULT 0;`],
    ['has_answer_key', `ALTER TABLE parser2_jobs ADD COLUMN has_answer_key INTEGER NOT NULL DEFAULT 0;`],
    ['quality_score', `ALTER TABLE parser2_jobs ADD COLUMN quality_score INTEGER NOT NULL DEFAULT 0;`],
    ['questions_detected', `ALTER TABLE parser2_jobs ADD COLUMN questions_detected INTEGER NOT NULL DEFAULT 0;`],
    ['questions_saved', `ALTER TABLE parser2_jobs ADD COLUMN questions_saved INTEGER NOT NULL DEFAULT 0;`],
    ['saved_verified', `ALTER TABLE parser2_jobs ADD COLUMN saved_verified INTEGER NOT NULL DEFAULT 0;`],
    ['reconciliation_json', `ALTER TABLE parser2_jobs ADD COLUMN reconciliation_json TEXT;`],
    ['quality_breakdown_json', `ALTER TABLE parser2_jobs ADD COLUMN quality_breakdown_json TEXT;`],
    ['published_test_id', `ALTER TABLE parser2_jobs ADD COLUMN published_test_id TEXT;`],
    ['error_message', `ALTER TABLE parser2_jobs ADD COLUMN error_message TEXT;`],
    ['original_pdf_file_name', `ALTER TABLE parser2_jobs ADD COLUMN original_pdf_file_name TEXT;`],
    ['source_question_pdf_name', `ALTER TABLE parser2_jobs ADD COLUMN source_question_pdf_name TEXT;`],
    ['source_solution_pdf_name', `ALTER TABLE parser2_jobs ADD COLUMN source_solution_pdf_name TEXT;`],
    ['last_activity_at', `ALTER TABLE parser2_jobs ADD COLUMN last_activity_at TEXT;`],
    ['expected_questions_manual', `ALTER TABLE parser2_jobs ADD COLUMN expected_questions_manual INTEGER;`],
    ['allow_provider_fallback', `ALTER TABLE parser2_jobs ADD COLUMN allow_provider_fallback INTEGER NOT NULL DEFAULT 1;`],
    ['fallback_provider', `ALTER TABLE parser2_jobs ADD COLUMN fallback_provider TEXT;`],
    ['auto_scan_answer_key', `ALTER TABLE parser2_jobs ADD COLUMN auto_scan_answer_key INTEGER NOT NULL DEFAULT 1;`],
    ['mistral_model', `ALTER TABLE parser2_jobs ADD COLUMN mistral_model TEXT;`],
    ['lock_owner_id', `ALTER TABLE parser2_jobs ADD COLUMN lock_owner_id TEXT;`],
    ['lock_expires_at', `ALTER TABLE parser2_jobs ADD COLUMN lock_expires_at TEXT;`],
    ['stalled_at', `ALTER TABLE parser2_jobs ADD COLUMN stalled_at TEXT;`],
    ['stall_reason', `ALTER TABLE parser2_jobs ADD COLUMN stall_reason TEXT;`],
    ['import_source', `ALTER TABLE parser2_jobs ADD COLUMN import_source TEXT;`]
  ];

  for (const [col, sql] of jobMigrations) {
    if (!jobColumns || !jobColumns.has(col)) {
      await executeD1Query(sql, [], { ignoreDuplicateColumn: true }).catch(() => {});
    }
  }

  const pageColumns = await getD1TableColumns('parser2_pages');
  const pageMigrations: Array<[string, string]> = [
    ['provider_used', `ALTER TABLE parser2_pages ADD COLUMN provider_used TEXT;`],
    ['model_used', `ALTER TABLE parser2_pages ADD COLUMN model_used TEXT;`],
    ['fallback_used', `ALTER TABLE parser2_pages ADD COLUMN fallback_used INTEGER NOT NULL DEFAULT 0;`],
    ['fallback_reason', `ALTER TABLE parser2_pages ADD COLUMN fallback_reason TEXT;`],
    ['questions_extracted_count', `ALTER TABLE parser2_pages ADD COLUMN questions_extracted_count INTEGER NOT NULL DEFAULT 0;`],
    ['questions_saved_count', `ALTER TABLE parser2_pages ADD COLUMN questions_saved_count INTEGER NOT NULL DEFAULT 0;`],
    ['retry_attempts', `ALTER TABLE parser2_pages ADD COLUMN retry_attempts INTEGER NOT NULL DEFAULT 0;`],
    ['checkpoint_at', `ALTER TABLE parser2_pages ADD COLUMN checkpoint_at TEXT;`],
    ['request_started_at', `ALTER TABLE parser2_pages ADD COLUMN request_started_at TEXT;`],
    ['response_time_ms', `ALTER TABLE parser2_pages ADD COLUMN response_time_ms INTEGER;`],
    ['ocr_status', `ALTER TABLE parser2_pages ADD COLUMN ocr_status TEXT;`],
    ['extraction_status', `ALTER TABLE parser2_pages ADD COLUMN extraction_status TEXT;`],
    ['questions_detected_count', `ALTER TABLE parser2_pages ADD COLUMN questions_detected_count INTEGER NOT NULL DEFAULT 0;`],
    ['dead_lettered', `ALTER TABLE parser2_pages ADD COLUMN dead_lettered INTEGER NOT NULL DEFAULT 0;`],
    ['last_api_summary', `ALTER TABLE parser2_pages ADD COLUMN last_api_summary TEXT;`]
  ];

  for (const [col, sql] of pageMigrations) {
    if (!pageColumns || !pageColumns.has(col)) {
      await executeD1Query(sql, [], { ignoreDuplicateColumn: true }).catch(() => {});
    }
  }

  const questionColumns = await getD1TableColumns('parser2_questions');
  const questionMigrations: Array<[string, string]> = [
    ['is_manually_edited', `ALTER TABLE parser2_questions ADD COLUMN is_manually_edited INTEGER NOT NULL DEFAULT 0;`],
    ['manually_edited_at', `ALTER TABLE parser2_questions ADD COLUMN manually_edited_at TEXT;`],
    ['edited_fields_json', `ALTER TABLE parser2_questions ADD COLUMN edited_fields_json TEXT;`],
    ['answer_status', `ALTER TABLE parser2_questions ADD COLUMN answer_status TEXT;`],
    ['options_json', `ALTER TABLE parser2_questions ADD COLUMN options_json TEXT;`],
    ['page_layout', `ALTER TABLE parser2_questions ADD COLUMN page_layout TEXT;`],
    ['chemistry_content_type', `ALTER TABLE parser2_questions ADD COLUMN chemistry_content_type TEXT;`],
    ['figures_json', `ALTER TABLE parser2_questions ADD COLUMN figures_json TEXT;`],
    ['option_figures_json', `ALTER TABLE parser2_questions ADD COLUMN option_figures_json TEXT;`],
    ['image_attachments_json', `ALTER TABLE parser2_questions ADD COLUMN image_attachments_json TEXT;`],
    ['explanation_image_url', `ALTER TABLE parser2_questions ADD COLUMN explanation_image_url TEXT;`],
    ['match_table_json', `ALTER TABLE parser2_questions ADD COLUMN match_table_json TEXT;`],
    ['structured_table_json', `ALTER TABLE parser2_questions ADD COLUMN structured_table_json TEXT;`],
    ['component_validation_json', `ALTER TABLE parser2_questions ADD COLUMN component_validation_json TEXT;`],
    ['original_snapshot_json', `ALTER TABLE parser2_questions ADD COLUMN original_snapshot_json TEXT;`],
    ['admin_override', `ALTER TABLE parser2_questions ADD COLUMN admin_override INTEGER NOT NULL DEFAULT 0;`],
    ['source_page_end', `ALTER TABLE parser2_questions ADD COLUMN source_page_end INTEGER;`],
    ['source_pages_json', `ALTER TABLE parser2_questions ADD COLUMN source_pages_json TEXT;`],
    ['source_page_range', `ALTER TABLE parser2_questions ADD COLUMN source_page_range TEXT;`],
    ['detected_answer', `ALTER TABLE parser2_questions ADD COLUMN detected_answer TEXT;`],
    ['imported_answer', `ALTER TABLE parser2_questions ADD COLUMN imported_answer TEXT;`],
    ['answer_set_code', `ALTER TABLE parser2_questions ADD COLUMN answer_set_code TEXT;`],
    ['answer_source_page', `ALTER TABLE parser2_questions ADD COLUMN answer_source_page INTEGER;`],
    ['answer_confidence', `ALTER TABLE parser2_questions ADD COLUMN answer_confidence REAL;`],
    ['answer_key_status', `ALTER TABLE parser2_questions ADD COLUMN answer_key_status TEXT;`],
    ['extraction_engine', `ALTER TABLE parser2_questions ADD COLUMN extraction_engine TEXT;`],
    ['provider_used', `ALTER TABLE parser2_questions ADD COLUMN provider_used TEXT;`],
    ['model_used', `ALTER TABLE parser2_questions ADD COLUMN model_used TEXT;`]
  ];

  for (const [col, sql] of questionMigrations) {
    if (!questionColumns || !questionColumns.has(col)) {
      await executeD1Query(sql, [], { ignoreDuplicateColumn: true }).catch(() => {});
    }
  }
}

function mapD1RowToJob(r: any): Parser2Job {
  const totalQ = Number(r.total_questions || 0);
  const rawSaved = r.questions_saved !== undefined && r.questions_saved !== null ? Number(r.questions_saved) : undefined;
  const isFinishedStatus = ['completed', 'review_required', 'published', 'approved'].includes(String(r.status || ''));
  const resolvedSaved =
    rawSaved !== undefined && rawSaved > 0
      ? rawSaved
      : isFinishedStatus && totalQ > 0
      ? totalQ
      : rawSaved;
  return {
    id: r.id,
    testName: r.test_name,
    subject: r.subject,
    chapter: r.chapter || '',
    questionRange: r.question_range || '',
    expectedQuestionsManual: r.expected_questions_manual !== undefined && r.expected_questions_manual !== null ? Number(r.expected_questions_manual) : null,
    ocrEngine: r.ocr_engine || 'gemini',
    geminiModel: r.gemini_model === 'gemini-3.8-flash' ? 'gemini-4-hydrogen' : (r.gemini_model || 'gemini-4-hydrogen'),
    mistralModel: r.mistral_model || 'mistral-ocr-latest',
    allowProviderFallback: r.allow_provider_fallback === undefined ? true : Boolean(r.allow_provider_fallback),
    fallbackProvider: r.fallback_provider || 'gemini',
    autoScanAnswerKey: r.auto_scan_answer_key === undefined ? true : Boolean(r.auto_scan_answer_key),
    enableGeminiVerification: Boolean(r.enable_gemini_verification),
    status: r.status || 'queued',
    currentStage: r.current_stage || undefined,
    failedStage: r.failed_stage || undefined,
    totalPages: Number(r.total_pages || 0),
    completedPages: Number(r.completed_pages || 0),
    failedPages: Number(r.failed_pages || 0),
    totalQuestions: totalQ,
    questionsDetected: r.questions_detected !== undefined && Number(r.questions_detected) > 0
      ? Number(r.questions_detected)
      : totalQ || undefined,
    questionsSaved: resolvedSaved,
    savedVerified: r.saved_verified !== undefined ? (Boolean(r.saved_verified) || (Boolean(resolvedSaved) && resolvedSaved! > 0)) : undefined,
    verifiedQuestions: Number(r.verified_questions || 0),
    reviewRequiredCount: Number(r.review_required_count || 0),
    figureCount: Number(r.figure_count || 0),
    estimatedCostUsd: Number(r.estimated_cost_usd || 0),
    retryCount: Number(r.retry_count || 0),
    manuallyEditedCount: Number(r.manually_edited_count || 0),
    hasAnswerKey: Boolean(r.has_answer_key),
    qualityScore: totalQ === 0 && (resolvedSaved || 0) === 0 ? null : (r.quality_score !== undefined && r.quality_score !== null && Number(r.quality_score) >= 0 ? Number(r.quality_score) : null),
    reconciliation: r.reconciliation_json ? JSON.parse(r.reconciliation_json) : undefined,
    qualityBreakdown: r.quality_breakdown_json ? JSON.parse(r.quality_breakdown_json) : undefined,
    publishedTestId: r.published_test_id || undefined,
    errorMessage: r.error_message || undefined,
    originalPdfFileName: r.original_pdf_file_name || r.source_question_pdf_name || undefined,
    sourceQuestionPdfName: r.source_question_pdf_name || undefined,
    sourceSolutionPdfName: r.source_solution_pdf_name || undefined,
    lastActivityAt: r.last_activity_at || r.updated_at,
    lockOwnerId: r.lock_owner_id || undefined,
    lockExpiresAt: r.lock_expires_at || undefined,
    stalledAt: r.stalled_at || undefined,
    stallReason: r.stall_reason || undefined,
    importSource: r.import_source || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapD1RowToQuestion(r: any): Parser2Question {
  const parsedOpts = r.options_json ? JSON.parse(r.options_json) : null;
  const fallbackOpts = [
    { label: 'A' as const, text: r.option_a || '', value: r.option_a || '' },
    { label: 'B' as const, text: r.option_b || '', value: r.option_b || '' },
    { label: 'C' as const, text: r.option_c || '', value: r.option_c || '' },
    { label: 'D' as const, text: r.option_d || '', value: r.option_d || '' }
  ];
  return {
    id: r.id,
    jobId: r.job_id,
    testId: r.test_id || undefined,
    questionNumber: Number(r.question_number),
    subject: r.subject || 'Combined',
    chapter: r.chapter || '',
    questionType: r.question_type || 'single_mcq',
    questionText: r.question_text || '',
    options: Array.isArray(parsedOpts) && parsedOpts.length > 0 ? parsedOpts : fallbackOpts,
    correctAnswer: r.correct_answer || undefined,
    answerStatus: r.answer_status || undefined,
    explanation: r.explanation || undefined,
    sourcePageNumber: Number(r.source_page_number || 1),
    sourcePageEnd: r.source_page_end ? Number(r.source_page_end) : undefined,
    sourcePages: r.source_pages_json ? JSON.parse(r.source_pages_json) : undefined,
    sourcePageRange: r.source_page_range || undefined,
    detectedAnswer: r.detected_answer || undefined,
    importedAnswer: r.imported_answer || undefined,
    answerSetCode: r.answer_set_code || undefined,
    answerSourcePage: r.answer_source_page ? Number(r.answer_source_page) : undefined,
    answerConfidence: r.answer_confidence !== undefined && r.answer_confidence !== null ? Number(r.answer_confidence) : undefined,
    answerKeyStatus: r.answer_key_status || undefined,
    pageLayout: r.page_layout || undefined,
    chemistryContentType: r.chemistry_content_type || undefined,
    figureUrl: r.figure_url || undefined,
    explanationImageUrl: r.explanation_image_url || undefined,
    figures: r.figures_json ? JSON.parse(r.figures_json) : undefined,
    optionFigures: r.option_figures_json ? JSON.parse(r.option_figures_json) : undefined,
    imageAttachments: r.image_attachments_json ? JSON.parse(r.image_attachments_json) : undefined,
    matchTable: r.match_table_json ? JSON.parse(r.match_table_json) : undefined,
    structuredTable: r.structured_table_json ? JSON.parse(r.structured_table_json) : undefined,
    componentValidation: r.component_validation_json ? JSON.parse(r.component_validation_json) : undefined,
    originalExtractedSnapshot: r.original_snapshot_json ? JSON.parse(r.original_snapshot_json) : undefined,
    extractionEngine: r.extraction_engine || 'gemini',
    providerUsed: r.provider_used || undefined,
    modelUsed: r.model_used || undefined,
    verificationStatus: r.verification_status || 'needs_review',
    confidenceScore: Number(r.confidence_score ?? 80),
    reviewRequired: Boolean(r.review_required),
    reviewNotes: r.review_notes || undefined,
    adminOverride: Boolean(r.admin_override),
    isManuallyEdited: Boolean(r.is_manually_edited),
    manuallyEditedAt: r.manually_edited_at || undefined,
    editedFields: r.edited_fields_json ? JSON.parse(r.edited_fields_json) : undefined,
    isDeleted: Boolean(r.is_deleted),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/**
 * Hydrate and merge Parser 2.0 job index from R2 JSON, D1, and Firebase RTDB.
 * Runs automatically on startup and periodically (never gated on local jobs === 0!).
 */
export async function hydrateParser2FromRemoteStores(force: boolean = false): Promise<void> {
  const now = Date.now();
  if (!force && lastHydrateAt > 0 && now - lastHydrateAt < 12000) {
    return;
  }
  if (activeHydratePromise) return activeHydratePromise;

  activeHydratePromise = (async () => {
    try {
      const store = loadStore();
      const deletedIds = new Set<string>(Array.isArray(store.parser2_deleted_jobs) ? store.parser2_deleted_jobs : []);

      // 0. Check deleted tombstones in R2
      try {
        const remoteDeleted = await getR2Json<{ ids?: string[] }>(R2_DELETED_KEY);
        if (remoteDeleted?.ids) {
          for (const d of remoteDeleted.ids) deletedIds.add(d);
        }
      } catch {}

      const mergedMap = new Map<string, Parser2Job>();
      const localJobs: Parser2Job[] = Array.isArray(store.parser2_jobs) ? store.parser2_jobs : [];
      for (const lj of localJobs) {
        if (lj?.id && !deletedIds.has(lj.id)) {
          mergedMap.set(lj.id, lj);
        }
      }

      const absorbCandidate = (candidate: Parser2Job) => {
        if (!candidate?.id || deletedIds.has(candidate.id)) return;
        const existing = mergedMap.get(candidate.id);
        if (!existing) {
          mergedMap.set(candidate.id, candidate);
          return;
        }
        const tExisting = new Date(existing.updatedAt || existing.lastActivityAt || existing.createdAt || 0).getTime();
        const tRemote = new Date(candidate.updatedAt || candidate.lastActivityAt || candidate.createdAt || 0).getTime();
        if (tRemote > tExisting) {
          mergedMap.set(candidate.id, candidate);
        }
      };

      // 1. Hydrate from Cloudflare R2 jobs_index.json AND individual parser2/db/jobs/*/job.json files
      try {
        const r2Index = await getR2Json<{ jobs?: Parser2Job[] }>(R2_INDEX_KEY);
        if (Array.isArray(r2Index?.jobs)) {
          for (const rj of r2Index.jobs) absorbCandidate(rj);
        }
        const r2DbKeys = await listR2Keys('parser2/db/jobs/');
        const jobJsonKeys = r2DbKeys.filter(k => k.endsWith('/job.json'));
        for (const key of jobJsonKeys) {
          const rJob = await getR2Json<Parser2Job>(key);
          if (rJob) absorbCandidate(rJob);
        }
      } catch {}

      // 2. Hydrate from Cloudflare D1 when configured
      if (isD1Configured()) {
        try {
          await ensureParser2D1Tables();
          const d1Resp = await executeD1Query(`SELECT * FROM parser2_jobs ORDER BY created_at DESC LIMIT 200;`);
          const rows = d1Resp?.result?.[0]?.results;
          if (Array.isArray(rows)) {
            for (const r of rows) absorbCandidate(mapD1RowToJob(r));
          }
        } catch {}
      }

      // 3. Hydrate from Firebase RTDB mirror
      try {
        const fbRes = await fetch(`${FIREBASE_RTDB_BASE}/parser2_jobs.json`);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && typeof fbData === 'object') {
            const values: any[] = Array.isArray(fbData) ? fbData : Object.values(fbData);
            for (const item of values) {
              if (item && item.id) absorbCandidate(item as Parser2Job);
            }
          }
        }
      } catch {}

      // 4. Hydrate settings from R2 if local was just initialized
      try {
        const remoteSettings = await getR2Json<Parser2Settings>(R2_SETTINGS_KEY);
        if (remoteSettings) {
          await withStoreWrite(s => {
            s.parser2_settings = { ...DEFAULT_PARSER2_SETTINGS, ...remoteSettings, ...(s.parser2_settings || {}) };
          });
        }
      } catch {}

      // Normalize & reconcile questionsSaved for any job whose local/published question count is known
      const normalizedJobs = Array.from(mergedMap.values()).map((j) => {
        const localQs: Parser2Question[] = Array.isArray(store.parser2_questions?.[j.id])
          ? store.parser2_questions[j.id].filter((q: Parser2Question) => !q.isDeleted)
          : [];
        const actualCount = localQs.length;
        const nextJob = actualCount > 0 && (!j.questionsSaved || j.questionsSaved !== actualCount)
          ? {
              ...j,
              totalQuestions: Math.max(j.totalQuestions || 0, actualCount),
              questionsDetected: Math.max(j.questionsDetected || 0, actualCount),
              questionsSaved: actualCount,
              savedVerified: true
            }
          : j;
        if ((nextJob.totalQuestions || 0) === 0 && (nextJob.questionsSaved || 0) === 0) {
          return { ...nextJob, qualityScore: null };
        }
        return nextJob;
      });

      const mergedJobs = normalizedJobs.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        if (tB !== tA) return tB - tA;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });

      await withStoreWrite(s => {
        s.parser2_jobs = mergedJobs;
        s.parser2_deleted_jobs = Array.from(deletedIds).slice(-200);
      });

      lastHydrateAt = Date.now();
    } finally {
      activeHydratePromise = null;
    }
  })();

  return activeHydratePromise;
}

/**
 * Hydrate full child collections (sourceFiles, pages, questions, figures, answerKeys, validationReport, logs)
 * for a single job from Cloudflare R2 / D1 if missing or sparser locally.
 */
async function hydrateJobDetailsIfNeeded(jobId: string, force: boolean = false): Promise<void> {
  if (!jobId) return;
  if (!force && hydratedJobDetails.has(jobId)) return;
  if (hydratingJobPromises.has(jobId)) return hydratingJobPromises.get(jobId);

  const p = (async () => {
    try {
      const store = loadStore();
      if (Array.isArray(store.parser2_deleted_jobs) && store.parser2_deleted_jobs.includes(jobId)) {
        return;
      }

      const [rSourceFiles, rPages, rQuestions, rFigures, rAnswerKeys, rReport, rLogs] = await Promise.all([
        getR2Json<Parser2SourceFile[]>(r2JobKey(jobId, 'sourceFiles')),
        getR2Json<Parser2Page[]>(r2JobKey(jobId, 'pages')),
        getR2Json<Parser2Question[]>(r2JobKey(jobId, 'questions')),
        getR2Json<Parser2Figure[]>(r2JobKey(jobId, 'figures')),
        getR2Json<Record<number, Parser2AnswerKeyEntry>>(r2JobKey(jobId, 'answerKeys')),
        getR2Json<Parser2ValidationReport>(r2JobKey(jobId, 'validationReport')),
        getR2Json<Parser2ProcessingLog[]>(r2JobKey(jobId, 'logs'))
      ]);

      await withStoreWrite(s => {
        if (Array.isArray(rSourceFiles) && rSourceFiles.length > (s.parser2_source_files?.[jobId]?.length || 0)) {
          s.parser2_source_files[jobId] = rSourceFiles;
        }
        if (Array.isArray(rPages) && rPages.length > 0) {
          const curPages: Parser2Page[] = s.parser2_pages?.[jobId] || [];
          if (curPages.length === 0 || rPages.filter(x => isPageCompletedStatus(x.status)).length > curPages.filter(x => isPageCompletedStatus(x.status)).length) {
            s.parser2_pages[jobId] = rPages;
          }
        }
        if (Array.isArray(rQuestions) && rQuestions.length > 0) {
          const curQs: Parser2Question[] = s.parser2_questions?.[jobId] || [];
          if (curQs.length === 0 || rQuestions.length > curQs.length) {
            s.parser2_questions[jobId] = rQuestions;
          }
        }
        if (Array.isArray(rFigures) && rFigures.length > (s.parser2_figures?.[jobId]?.length || 0)) {
          s.parser2_figures[jobId] = rFigures;
        }
        if (rAnswerKeys && Object.keys(rAnswerKeys).length > Object.keys(s.parser2_answer_keys?.[jobId] || {}).length) {
          s.parser2_answer_keys[jobId] = rAnswerKeys;
        }
        if (rReport && !s.parser2_validation_reports?.[jobId]) {
          s.parser2_validation_reports[jobId] = rReport;
        }
        if (Array.isArray(rLogs) && rLogs.length > (s.parser2_processing_logs?.[jobId]?.length || 0)) {
          s.parser2_processing_logs[jobId] = rLogs;
        }
      });

      // D1 secondary hydration if local questions still empty
      if (isD1Configured()) {
        const afterR2 = loadStore();
        if (!afterR2.parser2_questions?.[jobId]?.length) {
          await ensureParser2D1Tables();
          const qResp = await executeD1Query(`SELECT * FROM parser2_questions WHERE job_id = ? ORDER BY question_number ASC;`, [jobId]);
          const qRows = qResp?.result?.[0]?.results;
          if (Array.isArray(qRows) && qRows.length > 0) {
            const mapped = qRows.map(mapD1RowToQuestion);
            await withStoreWrite(s => {
              s.parser2_questions[jobId] = mapped;
            });
          }
        }
      }

      hydratedJobDetails.add(jobId);
    } finally {
      hydratingJobPromises.delete(jobId);
    }
  })();

  hydratingJobPromises.set(jobId, p);
  return p;
}

/**
 * Reconciles job counters against actual persisted questions & published mock_questions.
 * Fixes legacy "Saved 0 Qs" records without losing edits.
 */
export async function reconcileParser2JobCounts(jobId: string): Promise<Parser2Job | null> {
  await hydrateJobDetailsIfNeeded(jobId);
  const job = await getParser2JobById(jobId);
  if (!job) return null;

  const qs = await getParser2Questions(jobId);
  let actualSaved = qs.length;

  // Fallback check against published store_database mock_questions if job questions weren't hydrated
  if (actualSaved === 0 && job.publishedTestId && fs.existsSync(LEGACY_STORE_PATH)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_STORE_PATH, 'utf-8'));
      const pubQs = legacy?.mock_questions?.[job.publishedTestId];
      if (Array.isArray(pubQs) && pubQs.length > 0) {
        actualSaved = pubQs.length;
      }
    } catch {}
  }

  if (actualSaved > 0 && (job.questionsSaved !== actualSaved || !job.savedVerified || job.totalQuestions !== actualSaved)) {
    const updated: Parser2Job = {
      ...job,
      totalQuestions: Math.max(job.totalQuestions || 0, actualSaved),
      questionsDetected: Math.max(job.questionsDetected || 0, actualSaved),
      questionsSaved: actualSaved,
      savedVerified: true,
      verifiedQuestions: qs.length > 0 ? qs.filter(q => q.verificationStatus === 'verified' && !q.reviewRequired).length : job.verifiedQuestions,
      reviewRequiredCount: qs.length > 0 ? qs.filter(q => q.reviewRequired).length : job.reviewRequiredCount
    };
    await saveParser2Job(updated);
    return updated;
  }

  return job;
}

/**
 * Verification helper for automated tests (resets local state without deleting R2)
 */
export function resetLocalParser2CacheOnly(): void {
  hydratedJobDetails.clear();
  lastHydrateAt = 0;
  migratedOnce = false;
  if (fs.existsSync(PARSER2_STORE_PATH)) {
    fs.unlinkSync(PARSER2_STORE_PATH);
  }
}

// -------------------------------------------------------------
// Jobs CRUD
// -------------------------------------------------------------
export async function getParser2Jobs(options?: { forceRemoteSync?: boolean }): Promise<Parser2Job[]> {
  await hydrateParser2FromRemoteStores(Boolean(options?.forceRemoteSync));
  const store = loadStore();
  const jobs: Parser2Job[] = (Array.isArray(store.parser2_jobs) ? [...store.parser2_jobs] : []).map((j) => {
    const localQs: Parser2Question[] = Array.isArray(store.parser2_questions?.[j.id])
      ? store.parser2_questions[j.id].filter((q: Parser2Question) => !q.isDeleted)
      : [];
    const nextJob =
      localQs.length > 0 && (!j.questionsSaved || j.questionsSaved === 0)
        ? {
            ...j,
            totalQuestions: Math.max(j.totalQuestions || 0, localQs.length),
            questionsDetected: Math.max(j.questionsDetected || 0, localQs.length),
            questionsSaved: localQs.length,
            savedVerified: true
          }
        : j;
    if ((nextJob.totalQuestions || 0) === 0 && (nextJob.questionsSaved || 0) === 0) {
      return { ...nextJob, qualityScore: null };
    }
    return nextJob;
  });

  return jobs.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    if (tB !== tA) return tB - tA;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
}

export async function getParser2JobById(jobId: string): Promise<Parser2Job | null> {
  const store = loadStore();
  let found = (store.parser2_jobs || []).find((j: Parser2Job) => j.id === jobId) || null;
  if (!found) {
    await hydrateParser2FromRemoteStores(true);
    const refreshed = loadStore();
    found = (refreshed.parser2_jobs || []).find((j: Parser2Job) => j.id === jobId) || null;
  }
  if (found && (found.totalQuestions || 0) === 0 && (found.questionsSaved || 0) === 0) {
    return { ...found, qualityScore: null };
  }
  return found;
}

export async function saveParser2Job(job: Parser2Job, options?: { syncRemote?: boolean }): Promise<Parser2Job> {
  const now = new Date().toISOString();
  const saved = await withStoreWrite((store) => {
    if (!store.parser2_jobs) store.parser2_jobs = [];
    // Ensure saved job is not in deleted tombstone set
    if (Array.isArray(store.parser2_deleted_jobs)) {
      store.parser2_deleted_jobs = store.parser2_deleted_jobs.filter((d: string) => d !== job.id);
    }

    const idx = store.parser2_jobs.findIndex((j: Parser2Job) => j.id === job.id);
    const merged: Parser2Job = idx >= 0
      ? {
          ...store.parser2_jobs[idx],
          ...job,
          createdAt: store.parser2_jobs[idx].createdAt || job.createdAt || now,
          lastActivityAt: job.lastActivityAt || now,
          updatedAt: now
        }
      : {
          ...job,
          createdAt: job.createdAt || now,
          lastActivityAt: job.lastActivityAt || now,
          updatedAt: now
        };
    if (idx >= 0) {
      store.parser2_jobs[idx] = merged;
    } else {
      store.parser2_jobs.unshift(merged);
    }
    return merged;
  });

  const shouldAwaitRemote = options?.syncRemote !== false;
  const remotePromise = Promise.allSettled([
    putR2Json(r2JobKey(saved.id, 'job'), saved),
    enqueueR2IndexSync(),
    isD1Configured()
      ? ensureParser2D1Tables().then(() =>
          executeD1Query(
            `INSERT INTO parser2_jobs (id, test_name, subject, chapter, question_range, ocr_engine, gemini_model, enable_gemini_verification, status, current_stage, failed_stage, total_pages, completed_pages, failed_pages, total_questions, questions_detected, questions_saved, saved_verified, verified_questions, review_required_count, figure_count, estimated_cost_usd, retry_count, manually_edited_count, has_answer_key, quality_score, reconciliation_json, quality_breakdown_json, published_test_id, error_message, original_pdf_file_name, source_question_pdf_name, source_solution_pdf_name, last_activity_at, lock_owner_id, lock_expires_at, stalled_at, stall_reason, import_source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET test_name=excluded.test_name, subject=excluded.subject, chapter=excluded.chapter, status=excluded.status, current_stage=excluded.current_stage, failed_stage=excluded.failed_stage, total_pages=excluded.total_pages, completed_pages=excluded.completed_pages, failed_pages=excluded.failed_pages, total_questions=excluded.total_questions, questions_detected=excluded.questions_detected, questions_saved=excluded.questions_saved, saved_verified=excluded.saved_verified, verified_questions=excluded.verified_questions, review_required_count=excluded.review_required_count, figure_count=excluded.figure_count, estimated_cost_usd=excluded.estimated_cost_usd, retry_count=excluded.retry_count, manually_edited_count=excluded.manually_edited_count, has_answer_key=excluded.has_answer_key, quality_score=excluded.quality_score, reconciliation_json=excluded.reconciliation_json, quality_breakdown_json=excluded.quality_breakdown_json, published_test_id=excluded.published_test_id, error_message=excluded.error_message, last_activity_at=excluded.last_activity_at, lock_owner_id=excluded.lock_owner_id, lock_expires_at=excluded.lock_expires_at, stalled_at=excluded.stalled_at, stall_reason=excluded.stall_reason, import_source=excluded.import_source, updated_at=excluded.updated_at;`,
            [
              saved.id,
              saved.testName,
              saved.subject,
              saved.chapter || '',
              saved.questionRange || '',
              saved.ocrEngine,
              saved.geminiModel,
              saved.enableGeminiVerification ? 1 : 0,
              saved.status,
              saved.currentStage || '',
              saved.failedStage || '',
              saved.totalPages || 0,
              saved.completedPages || 0,
              saved.failedPages || 0,
              saved.totalQuestions || 0,
              saved.questionsDetected ?? saved.totalQuestions ?? 0,
              saved.questionsSaved ?? saved.totalQuestions ?? 0,
              saved.savedVerified ? 1 : 0,
              saved.verifiedQuestions || 0,
              saved.reviewRequiredCount || 0,
              saved.figureCount || 0,
              saved.estimatedCostUsd || 0,
              saved.retryCount || 0,
              saved.manuallyEditedCount || 0,
              saved.hasAnswerKey ? 1 : 0,
              saved.qualityScore || 0,
              saved.reconciliation ? JSON.stringify(saved.reconciliation) : '',
              saved.qualityBreakdown ? JSON.stringify(saved.qualityBreakdown) : '',
              saved.publishedTestId || '',
              saved.errorMessage || '',
              saved.originalPdfFileName || saved.sourceQuestionPdfName || '',
              saved.sourceQuestionPdfName || '',
              saved.sourceSolutionPdfName || '',
              saved.lastActivityAt || now,
              saved.lockOwnerId || '',
              saved.lockExpiresAt || '',
              saved.stalledAt || '',
              saved.stallReason || '',
              saved.importSource || '',
              saved.createdAt,
              saved.updatedAt
            ]
          )
        )
      : Promise.resolve()
  ]);

  if (shouldAwaitRemote) {
    await remotePromise;
  }

  return saved;
}

export async function deleteParser2Job(jobId: string): Promise<boolean> {
  hydratedJobDetails.delete(jobId);

  const tombstones = await withStoreWrite((store) => {
    if (store.parser2_jobs) {
      store.parser2_jobs = store.parser2_jobs.filter((j: Parser2Job) => j.id !== jobId);
    }
    if (!Array.isArray(store.parser2_deleted_jobs)) store.parser2_deleted_jobs = [];
    if (!store.parser2_deleted_jobs.includes(jobId)) {
      store.parser2_deleted_jobs.push(jobId);
    }
    if (store.parser2_source_files) delete store.parser2_source_files[jobId];
    if (store.parser2_questions) delete store.parser2_questions[jobId];
    if (store.parser2_pages) delete store.parser2_pages[jobId];
    if (store.parser2_figures) delete store.parser2_figures[jobId];
    if (store.parser2_answer_keys) delete store.parser2_answer_keys[jobId];
    if (store.parser2_validation_reports) delete store.parser2_validation_reports[jobId];
    if (store.parser2_processing_logs) delete store.parser2_processing_logs[jobId];
    return store.parser2_deleted_jobs;
  });

  await Promise.allSettled([
    putR2Json(R2_DELETED_KEY, { ids: tombstones, updatedAt: new Date().toISOString() }),
    enqueueR2IndexSync(),
    fetch(`${FIREBASE_RTDB_BASE}/parser2_jobs/${encodeURIComponent(jobId)}.json`, { method: 'DELETE' }),
    isD1Configured() ? executeD1Query(`DELETE FROM parser2_jobs WHERE id = ?;`, [jobId]) : Promise.resolve()
  ]);

  return true;
}

// -------------------------------------------------------------
// Source Files
// -------------------------------------------------------------
export async function saveParser2SourceFile(file: Parser2SourceFile): Promise<void> {
  const list = await withStoreWrite((store) => {
    if (!store.parser2_source_files) store.parser2_source_files = {};
    if (!store.parser2_source_files[file.jobId]) store.parser2_source_files[file.jobId] = [];
    const idx = store.parser2_source_files[file.jobId].findIndex((f: Parser2SourceFile) => f.id === file.id);
    if (idx >= 0) store.parser2_source_files[file.jobId][idx] = file;
    else store.parser2_source_files[file.jobId].push(file);
    return store.parser2_source_files[file.jobId];
  });

  await Promise.allSettled([
    putR2Json(r2JobKey(file.jobId, 'sourceFiles'), list),
    isD1Configured()
      ? ensureParser2D1Tables().then(() =>
          executeD1Query(
            `INSERT OR REPLACE INTO parser2_source_files (id, job_id, file_type, file_name, file_size, storage_key, mime_type, page_count, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [file.id, file.jobId, file.fileType, file.fileName, file.fileSize, file.storageKey, file.mimeType, file.pageCount, file.uploadedAt]
          )
        )
      : Promise.resolve()
  ]);
}

export async function getParser2SourceFiles(jobId: string): Promise<Parser2SourceFile[]> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  return (store.parser2_source_files && store.parser2_source_files[jobId]) || [];
}

// -------------------------------------------------------------
// Pages (Checkpoint Durable)
// -------------------------------------------------------------
export async function getParser2Pages(jobId: string): Promise<Parser2Page[]> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  const list: Parser2Page[] = (store.parser2_pages && store.parser2_pages[jobId]) || [];
  return [...list].sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function saveParser2Page(page: Parser2Page, options?: { syncRemote?: boolean }): Promise<void> {
  const now = new Date().toISOString();
  const updatedList = await withStoreWrite((store) => {
    if (!store.parser2_pages) store.parser2_pages = {};
    if (!store.parser2_pages[page.jobId]) store.parser2_pages[page.jobId] = [];

    const existingIdx = store.parser2_pages[page.jobId].findIndex((p: Parser2Page) => p.pageNumber === page.pageNumber);
    if (existingIdx >= 0) {
      store.parser2_pages[page.jobId][existingIdx] = { ...store.parser2_pages[page.jobId][existingIdx], ...page, updatedAt: now };
    } else {
      store.parser2_pages[page.jobId].push({ ...page, updatedAt: now });
    }
    return store.parser2_pages[page.jobId];
  });

  if (options?.syncRemote === false) return;

  await Promise.allSettled([
    putR2Json(r2JobKey(page.jobId, 'pages'), updatedList),
    isD1Configured()
      ? ensureParser2D1Tables().then(() =>
          executeD1Query(
            `INSERT INTO parser2_pages (id, job_id, page_number, status, ocr_markdown, page_image_key, page_width, page_height, processing_time_ms, error_message, provider_used, model_used, fallback_used, fallback_reason, questions_extracted_count, questions_saved_count, retry_attempts, checkpoint_at, request_started_at, response_time_ms, ocr_status, extraction_status, questions_detected_count, dead_lettered, last_api_summary, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(job_id, page_number) DO UPDATE SET status=excluded.status, ocr_markdown=excluded.ocr_markdown, page_image_key=excluded.page_image_key, processing_time_ms=excluded.processing_time_ms, error_message=excluded.error_message, provider_used=excluded.provider_used, model_used=excluded.model_used, fallback_used=excluded.fallback_used, fallback_reason=excluded.fallback_reason, questions_extracted_count=excluded.questions_extracted_count, questions_saved_count=excluded.questions_saved_count, retry_attempts=excluded.retry_attempts, checkpoint_at=excluded.checkpoint_at, request_started_at=excluded.request_started_at, response_time_ms=excluded.response_time_ms, ocr_status=excluded.ocr_status, extraction_status=excluded.extraction_status, questions_detected_count=excluded.questions_detected_count, dead_lettered=excluded.dead_lettered, last_api_summary=excluded.last_api_summary, updated_at=excluded.updated_at;`,
            [
              page.id, page.jobId, page.pageNumber, page.status, page.ocrMarkdown || '',
              page.pageImageKey || '', page.pageWidth || 0, page.pageHeight || 0,
              page.processingTimeMs || 0, page.errorMessage || '',
              page.providerUsed || '', page.modelUsed || '',
              page.fallbackUsed ? 1 : 0, page.fallbackReason || '',
              page.questionsExtractedCount || 0, page.questionsSavedCount || 0,
              page.retryAttempts || 0, page.checkpointAt || now,
              page.requestStartedAt || '', page.responseTimeMs ?? null,
              page.ocrStatus || '', page.extractionStatus || '',
              page.questionsDetectedCount ?? page.questionsExtractedCount ?? 0,
              page.deadLettered ? 1 : 0, page.lastApiSummary || '', now
            ]
          )
        )
      : Promise.resolve()
  ]);
}

// -------------------------------------------------------------
// Questions CRUD (Atomic Idempotent Upsert & Full Schema Sync)
// -------------------------------------------------------------
export async function getParser2Questions(jobId: string, includeDeleted = false): Promise<Parser2Question[]> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  const list: Parser2Question[] = (store.parser2_questions && store.parser2_questions[jobId]) || [];
  return list
    .filter(q => includeDeleted || !q.isDeleted)
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

async function syncQuestionsToRemote(jobId: string, allQuestions: Parser2Question[], deltaQuestions?: Parser2Question[]): Promise<void> {
  const d1Targets = deltaQuestions && deltaQuestions.length > 0 ? deltaQuestions : allQuestions;
  await Promise.allSettled([
    putR2Json(r2JobKey(jobId, 'questions'), allQuestions),
    isD1Configured()
      ? ensureParser2D1Tables().then(async () => {
          const CHUNK = 6;
          for (let idx = 0; idx < d1Targets.length; idx += CHUNK) {
            const slice = d1Targets.slice(idx, idx + CHUNK);
            await Promise.allSettled(
              slice.map((q) => {
                const optA = q.options.find(o => o.label === 'A')?.value || '';
                const optB = q.options.find(o => o.label === 'B')?.value || '';
                const optC = q.options.find(o => o.label === 'C')?.value || '';
                const optD = q.options.find(o => o.label === 'D')?.value || '';

                return executeD1Query(
                  `INSERT INTO parser2_questions (id, job_id, question_number, subject, chapter, question_type, question_text, option_a, option_b, option_c, option_d, options_json, correct_answer, answer_status, explanation, explanation_image_url, source_page_number, source_page_end, source_pages_json, source_page_range, detected_answer, imported_answer, answer_set_code, answer_source_page, answer_confidence, answer_key_status, page_layout, chemistry_content_type, figure_url, figures_json, option_figures_json, image_attachments_json, match_table_json, structured_table_json, component_validation_json, original_snapshot_json, extraction_engine, provider_used, model_used, verification_status, confidence_score, review_required, review_notes, admin_override, is_manually_edited, manually_edited_at, edited_fields_json, is_deleted, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET question_text=excluded.question_text, option_a=excluded.option_a, option_b=excluded.option_b, option_c=excluded.option_c, option_d=excluded.option_d, options_json=excluded.options_json, correct_answer=excluded.correct_answer, answer_status=excluded.answer_status, explanation=excluded.explanation, explanation_image_url=excluded.explanation_image_url, source_page_number=excluded.source_page_number, source_page_end=excluded.source_page_end, source_pages_json=excluded.source_pages_json, source_page_range=excluded.source_page_range, detected_answer=excluded.detected_answer, imported_answer=excluded.imported_answer, answer_set_code=excluded.answer_set_code, answer_source_page=excluded.answer_source_page, answer_confidence=excluded.answer_confidence, answer_key_status=excluded.answer_key_status, page_layout=excluded.page_layout, chemistry_content_type=excluded.chemistry_content_type, figure_url=excluded.figure_url, figures_json=excluded.figures_json, option_figures_json=excluded.option_figures_json, image_attachments_json=excluded.image_attachments_json, match_table_json=excluded.match_table_json, structured_table_json=excluded.structured_table_json, component_validation_json=excluded.component_validation_json, original_snapshot_json=excluded.original_snapshot_json, extraction_engine=excluded.extraction_engine, provider_used=excluded.provider_used, model_used=excluded.model_used, verification_status=excluded.verification_status, confidence_score=excluded.confidence_score, review_required=excluded.review_required, review_notes=excluded.review_notes, admin_override=excluded.admin_override, is_manually_edited=excluded.is_manually_edited, manually_edited_at=excluded.manually_edited_at, edited_fields_json=excluded.edited_fields_json, is_deleted=excluded.is_deleted, updated_at=excluded.updated_at;`,
                  [
                    q.id, q.jobId, q.questionNumber, q.subject, q.chapter || '',
                    q.questionType, q.questionText, optA, optB, optC, optD,
                    JSON.stringify(q.options || []),
                    q.correctAnswer || '', q.answerStatus || '', q.explanation || '', q.explanationImageUrl || '',
                    q.sourcePageNumber,
                    q.sourcePageEnd ?? q.sourcePageNumber,
                    JSON.stringify(q.sourcePages && q.sourcePages.length ? q.sourcePages : [q.sourcePageNumber]),
                    q.sourcePageRange || `Page ${q.sourcePageNumber}`,
                    q.detectedAnswer || '', q.importedAnswer || '', q.answerSetCode || '',
                    q.answerSourcePage ?? null, q.answerConfidence ?? null, q.answerKeyStatus || '',
                    q.pageLayout || '', q.chemistryContentType || '',
                    q.figureUrl || '',
                    q.figures ? JSON.stringify(q.figures) : '[]',
                    q.optionFigures ? JSON.stringify(q.optionFigures) : '{}',
                    q.imageAttachments ? JSON.stringify(q.imageAttachments) : '[]',
                    q.matchTable ? JSON.stringify(q.matchTable) : '',
                    q.structuredTable ? JSON.stringify(q.structuredTable) : '',
                    q.componentValidation ? JSON.stringify(q.componentValidation) : '',
                    q.originalExtractedSnapshot ? JSON.stringify(q.originalExtractedSnapshot) : '',
                    q.extractionEngine || 'gemini', q.providerUsed || '', q.modelUsed || '',
                    q.verificationStatus, q.confidenceScore,
                    q.reviewRequired ? 1 : 0, q.reviewNotes || '',
                    q.adminOverride ? 1 : 0,
                    q.isManuallyEdited ? 1 : 0, q.manuallyEditedAt || '',
                    q.editedFields ? JSON.stringify(q.editedFields) : '[]',
                    q.isDeleted ? 1 : 0, q.createdAt, q.updatedAt
                  ]
                ).catch(() => {});
              })
            );
          }
        })
      : Promise.resolve()
  ]);
}

export async function saveParser2Questions(jobId: string, questions: Parser2Question[]): Promise<void> {
  // Deduplicate by questionNumber cleanly inside atomic lock
  const normalized = await withStoreWrite((store) => {
    if (!store.parser2_questions) store.parser2_questions = {};
    const byNum = new Map<number, Parser2Question>();
    for (const q of questions) {
      byNum.set(q.questionNumber, q);
    }
    const deduped = Array.from(byNum.values()).sort((a, b) => a.questionNumber - b.questionNumber);
    store.parser2_questions[jobId] = deduped;
    return deduped;
  });

  await syncQuestionsToRemote(jobId, normalized);
}

/**
 * Atomic, idempotent question upsert keyed by questionNumber.
 * Preserves manual edits & answer keys even during concurrent page retries or resumes!
 */
export async function upsertParser2Questions(
  jobId: string,
  incoming: Parser2Question[]
): Promise<{ savedList: Parser2Question[]; preservedManualNums: number[] }> {
  const { savedList, preservedManualNums } = await withStoreWrite((store) => {
    if (!store.parser2_questions) store.parser2_questions = {};
    const current: Parser2Question[] = Array.isArray(store.parser2_questions[jobId])
      ? [...store.parser2_questions[jobId]]
      : [];

    const byNum = new Map<number, Parser2Question>();
    for (const q of current) {
      byNum.set(q.questionNumber, q);
    }

    const preserved: number[] = [];
    for (const inc of incoming) {
      const existing = byNum.get(inc.questionNumber);
      if (existing) {
        if (existing.isManuallyEdited) {
          preserved.push(inc.questionNumber);
          continue;
        }
        const mergedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
          const exOpt = (existing.options || []).find(o => o.label === lbl);
          const inOpt = (inc.options || []).find(o => o.label === lbl);
          const exVal = isPlaceholderOption(exOpt?.value) ? '' : (exOpt?.value || '').trim();
          const inVal = isPlaceholderOption(inOpt?.value) ? '' : (inOpt?.value || '').trim();
          if (inOpt?.imageUrl && !exOpt?.imageUrl) return inOpt;
          if (exOpt?.imageUrl && !inOpt?.imageUrl) return exOpt;
          if (!exVal) {
            return inVal ? { ...(inOpt || { label: lbl, text: inVal, value: inVal }), text: inVal, value: inVal } : { label: lbl, text: '', value: '' };
          }
          if (inVal && inVal.length > exVal.length) {
            return { ...(inOpt || { label: lbl, text: inVal, value: inVal }), text: inVal, value: inVal };
          }
          return { ...(exOpt || { label: lbl, text: exVal, value: exVal }), text: exVal, value: exVal };
        });

        const exTextTrim = (existing.questionText || '').trim();
        const inTextTrim = (inc.questionText || '').trim();
        let mergedText = exTextTrim.length >= inTextTrim.length ? existing.questionText : inc.questionText;
        if (
          exTextTrim.length >= 15 &&
          inTextTrim.length >= 15 &&
          !exTextTrim.toLowerCase().includes(inTextTrim.slice(0, 20).toLowerCase()) &&
          !inTextTrim.toLowerCase().includes(exTextTrim.slice(0, 20).toLowerCase()) &&
          (inc.sourcePageNumber || 0) > (existing.sourcePageNumber || 0)
        ) {
          mergedText = `${exTextTrim}\n${inTextTrim}`;
        }

        const mergedMatch =
          (inc.matchTable?.rows?.length || 0) >= (existing.matchTable?.rows?.length || 0)
            ? inc.matchTable || existing.matchTable
            : existing.matchTable;
        const mergedTable =
          mergedMatch && mergedMatch.rows && mergedMatch.rows.length > 0
            ? undefined
            : (inc.structuredTable?.rows?.length || 0) >= (existing.structuredTable?.rows?.length || 0)
              ? inc.structuredTable || existing.structuredTable
              : existing.structuredTable;

        const pageList = [
          ...(existing.sourcePages || [existing.sourcePageNumber]),
          ...(inc.sourcePages || [inc.sourcePageNumber])
        ];
        const pageMeta = formatSourcePageRange(pageList, existing.sourcePageNumber || inc.sourcePageNumber || 1);

        byNum.set(inc.questionNumber, {
          ...existing,
          ...inc,
          id: existing.id || inc.id,
          sourcePageNumber: pageMeta.startPage,
          sourcePageEnd: pageMeta.endPage,
          sourcePages: pageMeta.sourcePages,
          sourcePageRange: pageMeta.label,
          questionText: mergedText,
          options: mergedOptions,
          matchTable: mergedMatch,
          structuredTable: mergedTable,
          figureUrl: existing.figureUrl || inc.figureUrl,
          originalFigureUrl: existing.originalFigureUrl || inc.originalFigureUrl || inc.figureUrl,
          figures: (existing.figures?.length || 0) >= (inc.figures?.length || 0) ? existing.figures : inc.figures,
          correctAnswer: existing.correctAnswer || inc.correctAnswer,
          answerStatus: existing.answerStatus || inc.answerStatus,
          explanation: existing.explanation || inc.explanation,
          createdAt: existing.createdAt || inc.createdAt
        });
      } else {
        byNum.set(inc.questionNumber, inc);
      }
    }

    const nextList = Array.from(byNum.values()).sort((a, b) => a.questionNumber - b.questionNumber);
    store.parser2_questions[jobId] = nextList;
    return { savedList: nextList, preservedManualNums: preserved };
  });

  await syncQuestionsToRemote(jobId, savedList, incoming);
  return { savedList, preservedManualNums };
}

const MANUAL_TRACKED_FIELDS = new Set([
  'questionText',
  'options',
  'correctAnswer',
  'explanation',
  'explanationImageUrl',
  'figureUrl',
  'figures',
  'optionFigures',
  'imageAttachments',
  'matchTable',
  'structuredTable',
  'subject',
  'chapter',
  'questionType'
]);

export async function updateParser2Question(
  jobId: string,
  questionId: string,
  patch: Partial<Parser2Question>,
  options?: { markManualEdit?: boolean }
): Promise<Parser2Question | null> {
  const now = new Date().toISOString();
  const markManual = options?.markManualEdit ?? true;

  const { updated, fullList } = await withStoreWrite((store) => {
    if (!store.parser2_questions || !store.parser2_questions[jobId]) {
      return { updated: null, fullList: [] as Parser2Question[] };
    }
    const idx = store.parser2_questions[jobId].findIndex((q: Parser2Question) => q.id === questionId);
    if (idx < 0) return { updated: null, fullList: store.parser2_questions[jobId] };

    const current = store.parser2_questions[jobId][idx];
    const changedKeys = Object.keys(patch).filter(k => MANUAL_TRACKED_FIELDS.has(k) && (patch as any)[k] !== undefined);
    const shouldFlagManual = markManual && (changedKeys.length > 0 || patch.isManuallyEdited === true);

    const existingEditedFields = Array.isArray(current.editedFields) ? current.editedFields : [];
    const mergedEditedFields = shouldFlagManual
      ? Array.from(new Set([...existingEditedFields, ...changedKeys]))
      : existingEditedFields;

    const nextAnswerStatus =
      patch.correctAnswer && ['A', 'B', 'C', 'D'].includes(patch.correctAnswer) && shouldFlagManual
        ? 'manual'
        : patch.answerStatus || current.answerStatus;

    const merged: Parser2Question = {
      ...current,
      ...patch,
      answerStatus: nextAnswerStatus,
      isManuallyEdited: patch.isManuallyEdited !== undefined ? patch.isManuallyEdited : (shouldFlagManual ? true : current.isManuallyEdited),
      manuallyEditedAt: shouldFlagManual ? now : current.manuallyEditedAt,
      editedFields: mergedEditedFields.length > 0 ? mergedEditedFields : current.editedFields,
      updatedAt: now
    };

    store.parser2_questions[jobId][idx] = merged;
    return { updated: merged, fullList: store.parser2_questions[jobId] as Parser2Question[] };
  });

  if (updated) {
    await Promise.allSettled([
      putR2Json(r2JobKey(jobId, 'questions'), fullList),
      isD1Configured()
        ? ensureParser2D1Tables().then(() => {
            const optA = updated.options.find(o => o.label === 'A')?.value || '';
            const optB = updated.options.find(o => o.label === 'B')?.value || '';
            const optC = updated.options.find(o => o.label === 'C')?.value || '';
            const optD = updated.options.find(o => o.label === 'D')?.value || '';
            return executeD1Query(
              `UPDATE parser2_questions SET question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, options_json=?, correct_answer=?, answer_status=?, explanation=?, explanation_image_url=?, source_page_number=?, source_page_end=?, source_pages_json=?, source_page_range=?, detected_answer=?, imported_answer=?, answer_set_code=?, answer_source_page=?, answer_confidence=?, answer_key_status=?, figure_url=?, figures_json=?, option_figures_json=?, image_attachments_json=?, match_table_json=?, structured_table_json=?, component_validation_json=?, verification_status=?, confidence_score=?, review_required=?, review_notes=?, admin_override=?, is_manually_edited=?, manually_edited_at=?, edited_fields_json=?, is_deleted=?, updated_at=? WHERE id=?;`,
              [
                updated.questionText, optA, optB, optC, optD, JSON.stringify(updated.options || []),
                updated.correctAnswer || '', updated.answerStatus || '', updated.explanation || '', updated.explanationImageUrl || '',
                updated.sourcePageNumber || 1,
                updated.sourcePageEnd ?? updated.sourcePageNumber ?? 1,
                JSON.stringify(updated.sourcePages && updated.sourcePages.length ? updated.sourcePages : [updated.sourcePageNumber || 1]),
                updated.sourcePageRange || `Page ${updated.sourcePageNumber || 1}`,
                updated.detectedAnswer || '', updated.importedAnswer || '', updated.answerSetCode || '',
                updated.answerSourcePage ?? null, updated.answerConfidence ?? null, updated.answerKeyStatus || '',
                updated.figureUrl || '',
                updated.figures ? JSON.stringify(updated.figures) : '[]',
                updated.optionFigures ? JSON.stringify(updated.optionFigures) : '{}',
                updated.imageAttachments ? JSON.stringify(updated.imageAttachments) : '[]',
                updated.matchTable ? JSON.stringify(updated.matchTable) : '',
                updated.structuredTable ? JSON.stringify(updated.structuredTable) : '',
                updated.componentValidation ? JSON.stringify(updated.componentValidation) : '',
                updated.verificationStatus, updated.confidenceScore,
                updated.reviewRequired ? 1 : 0, updated.reviewNotes || '',
                updated.adminOverride ? 1 : 0,
                updated.isManuallyEdited ? 1 : 0, updated.manuallyEditedAt || '',
                updated.editedFields ? JSON.stringify(updated.editedFields) : '[]',
                updated.isDeleted ? 1 : 0, updated.updatedAt, updated.id
              ]
            );
          })
        : Promise.resolve()
    ]);
  }

  return updated;
}

/**
 * Verifies that questions for a job are genuinely persisted on disk & remote R2 store.
 */
export async function verifyJobQuestionsPersisted(
  jobId: string,
  expectedMinCount = 0
): Promise<{ count: number; savedCount: number; verified: boolean; localOk: boolean; r2Ok: boolean }> {
  const localQs = await getParser2Questions(jobId);
  const r2Configured = Boolean(getR2Client());
  let remoteQs = r2Configured ? await getR2Json<Parser2Question[]>(r2JobKey(jobId, 'questions')) : null;
  if (r2Configured && (!Array.isArray(remoteQs) || remoteQs.length < localQs.length) && localQs.length > 0) {
    await putR2Json(r2JobKey(jobId, 'questions'), localQs);
    remoteQs = await getR2Json<Parser2Question[]>(r2JobKey(jobId, 'questions'));
  }
  const r2Ok = Array.isArray(remoteQs) ? remoteQs.length >= localQs.length : false;
  const localOk = localQs.length > 0 && localQs.length >= expectedMinCount;
  const verified = localOk && (r2Ok || !r2Configured);
  return {
    count: localQs.length,
    savedCount: localQs.length,
    verified,
    localOk,
    r2Ok
  };
}

// -------------------------------------------------------------
// Figures CRUD (Atomic Upsert by Figure ID)
// -------------------------------------------------------------
export async function getParser2Figures(jobId: string): Promise<Parser2Figure[]> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  return (store.parser2_figures && store.parser2_figures[jobId]) || [];
}

export async function saveParser2Figures(jobId: string, figures: Parser2Figure[]): Promise<void> {
  const deduped = await withStoreWrite((store) => {
    if (!store.parser2_figures) store.parser2_figures = {};
    const byId = new Map<string, Parser2Figure>();
    for (const f of figures) {
      if (f?.id) byId.set(f.id, f);
    }
    const list = Array.from(byId.values());
    store.parser2_figures[jobId] = list;
    return list;
  });

  await Promise.allSettled([
    putR2Json(r2JobKey(jobId, 'figures'), deduped),
    isD1Configured()
      ? ensureParser2D1Tables().then(async () => {
          await executeD1Query(`DELETE FROM parser2_figures WHERE job_id = ?;`, [jobId]);
          for (const f of deduped.slice(0, 300)) {
            await executeD1Query(
              `INSERT OR REPLACE INTO parser2_figures (id, job_id, question_id, question_number, page_number, source_pdf_id, figure_key, figure_url, crop_type, figure_type, bounding_box_json, pixel_box_json, natural_width, natural_height, is_manual_crop, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                f.id, jobId, f.questionId || '', f.questionNumber ?? null, f.pageNumber || 1,
                f.sourcePdfId || '', f.figureKey, f.figureUrl, f.cropType || f.figureType || 'diagram',
                f.figureType || 'diagram', f.boundingBox ? JSON.stringify(f.boundingBox) : '',
                f.pixelBox ? JSON.stringify(f.pixelBox) : '', f.naturalWidth ?? f.width ?? null,
                f.naturalHeight ?? f.height ?? null, f.isManualCrop ? 1 : 0, f.createdAt || new Date().toISOString()
              ]
            ).catch(() => {});
          }
        })
      : Promise.resolve()
  ]);
}

export async function upsertParser2Figures(jobId: string, incoming: Parser2Figure[]): Promise<Parser2Figure[]> {
  const merged = await withStoreWrite((store) => {
    if (!store.parser2_figures) store.parser2_figures = {};
    const current: Parser2Figure[] = store.parser2_figures[jobId] || [];
    const byId = new Map<string, Parser2Figure>();
    for (const f of current) {
      if (f?.id) byId.set(f.id, f);
    }
    for (const f of incoming) {
      if (f?.id) byId.set(f.id, f);
    }
    const next = Array.from(byId.values());
    store.parser2_figures[jobId] = next;
    return next;
  });

  await Promise.allSettled([
    putR2Json(r2JobKey(jobId, 'figures'), merged),
    isD1Configured()
      ? ensureParser2D1Tables().then(async () => {
          for (const f of incoming) {
            await executeD1Query(
              `INSERT OR REPLACE INTO parser2_figures (id, job_id, question_id, question_number, page_number, source_pdf_id, figure_key, figure_url, crop_type, figure_type, bounding_box_json, pixel_box_json, natural_width, natural_height, is_manual_crop, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                f.id, jobId, f.questionId || '', f.questionNumber ?? null, f.pageNumber || 1,
                f.sourcePdfId || '', f.figureKey, f.figureUrl, f.cropType || f.figureType || 'diagram',
                f.figureType || 'diagram', f.boundingBox ? JSON.stringify(f.boundingBox) : '',
                f.pixelBox ? JSON.stringify(f.pixelBox) : '', f.naturalWidth ?? f.width ?? null,
                f.naturalHeight ?? f.height ?? null, f.isManualCrop ? 1 : 0, f.createdAt || new Date().toISOString()
              ]
            ).catch(() => {});
          }
        })
      : Promise.resolve()
  ]);
  return merged;
}

// -------------------------------------------------------------
// Answer Keys
// -------------------------------------------------------------
export async function getParser2AnswerKeys(jobId: string): Promise<Record<number, Parser2AnswerKeyEntry>> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  return (store.parser2_answer_keys && store.parser2_answer_keys[jobId]) || {};
}

export async function saveParser2AnswerKeys(jobId: string, keys: Record<number, Parser2AnswerKeyEntry>): Promise<void> {
  await withStoreWrite((store) => {
    if (!store.parser2_answer_keys) store.parser2_answer_keys = {};
    store.parser2_answer_keys[jobId] = keys;
  });

  await Promise.allSettled([
    putR2Json(r2JobKey(jobId, 'answerKeys'), keys),
    isD1Configured()
      ? ensureParser2D1Tables().then(async () => {
          await executeD1Query(`DELETE FROM parser2_answer_keys WHERE job_id = ?;`, [jobId]);
          const entries = Object.values(keys || {});
          const CHUNK = 15;
          for (let i = 0; i < entries.length; i += CHUNK) {
            await Promise.allSettled(
              entries.slice(i, i + CHUNK).map((k) =>
                executeD1Query(
                  `INSERT OR REPLACE INTO parser2_answer_keys (job_id, question_number, raw_answer, verified_answer, set_code, source_page, confidence, source_type, explanation, matched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                  [
                    jobId, k.questionNumber, k.rawAnswer || k.verifiedAnswer, k.verifiedAnswer,
                    k.setCode || '', k.sourcePage ?? null, k.confidence ?? null,
                    k.sourceType || 'manual', k.explanation || '', k.matchedAt || new Date().toISOString()
                  ]
                )
              )
            );
          }
        })
      : Promise.resolve()
  ]);
}

// -------------------------------------------------------------
// Validation Reports
// -------------------------------------------------------------
export async function getParser2ValidationReport(jobId: string): Promise<Parser2ValidationReport | null> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  return (store.parser2_validation_reports && store.parser2_validation_reports[jobId]) || null;
}

export async function saveParser2ValidationReport(report: Parser2ValidationReport): Promise<void> {
  await withStoreWrite((store) => {
    if (!store.parser2_validation_reports) store.parser2_validation_reports = {};
    store.parser2_validation_reports[report.jobId] = report;
  });

  await Promise.allSettled([
    putR2Json(r2JobKey(report.jobId, 'validationReport'), report),
    isD1Configured()
      ? ensureParser2D1Tables().then(() =>
          executeD1Query(
            `INSERT INTO parser2_validation_reports (id, job_id, quality_score, total_checks, passed_checks, critical_errors_count, warnings_count, can_publish, report_json, summary, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET quality_score=excluded.quality_score, passed_checks=excluded.passed_checks, critical_errors_count=excluded.critical_errors_count, warnings_count=excluded.warnings_count, can_publish=excluded.can_publish, report_json=excluded.report_json, summary=excluded.summary;`,
            [
              report.id, report.jobId, report.qualityScore ?? 0, report.totalChecks, report.passedChecks,
              report.criticalErrorsCount, report.warningsCount, report.canPublish ? 1 : 0,
              JSON.stringify(report.checks), report.summary, report.createdAt
            ]
          )
        )
      : Promise.resolve()
  ]);
}

// -------------------------------------------------------------
// Processing Logs
// -------------------------------------------------------------
export async function getParser2Logs(jobId: string): Promise<Parser2ProcessingLog[]> {
  await hydrateJobDetailsIfNeeded(jobId);
  const store = loadStore();
  const list: Parser2ProcessingLog[] = (store.parser2_processing_logs && store.parser2_processing_logs[jobId]) || [];
  return [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function addParser2Log(
  jobId: string,
  stage: Parser2ProcessingLog['stage'],
  message: string,
  level: Parser2ProcessingLog['level'] = 'info',
  details?: any
): Promise<void> {
  const log: Parser2ProcessingLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    jobId,
    level,
    stage,
    message,
    details: details ? (typeof details === 'object' ? details : { info: details }) : undefined,
    timestamp: new Date().toISOString()
  };

  const fullLogs = await withStoreWrite((store) => {
    if (!store.parser2_processing_logs) store.parser2_processing_logs = {};
    if (!store.parser2_processing_logs[jobId]) store.parser2_processing_logs[jobId] = [];

    store.parser2_processing_logs[jobId].push(log);
    if (store.parser2_processing_logs[jobId].length > 500) {
      store.parser2_processing_logs[jobId] = store.parser2_processing_logs[jobId].slice(-500);
    }
    return store.parser2_processing_logs[jobId];
  });

  // Fire-and-forget async log replication to R2 / D1 so logging stays ultra-fast
  putR2Json(r2JobKey(jobId, 'logs'), fullLogs).catch(() => {});
  if (isD1Configured()) {
    ensureParser2D1Tables().then(() =>
      executeD1Query(
        `INSERT INTO parser2_processing_logs (id, job_id, level, stage, message, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [log.id, log.jobId, log.level, log.stage, log.message, details ? JSON.stringify(details) : '', log.timestamp]
      )
    ).catch(() => {});
  }
}

// -------------------------------------------------------------
// Settings
// -------------------------------------------------------------
export async function getParser2Settings(): Promise<Parser2Settings> {
  const store = loadStore();
  return { ...DEFAULT_PARSER2_SETTINGS, ...(store.parser2_settings || {}) };
}

export async function saveParser2Settings(settings: Partial<Parser2Settings>): Promise<Parser2Settings> {
  const updated = await withStoreWrite((store) => {
    const next = { ...DEFAULT_PARSER2_SETTINGS, ...(store.parser2_settings || {}), ...settings };
    store.parser2_settings = next;
    return next;
  });

  await putR2Json(R2_SETTINGS_KEY, updated);
  return updated;
}

/**
 * Module 9 Diagnostics: Safe live Database Write/Read/Delete self-test across Local Store, R2 JSON, and Cloudflare D1.
 * Never exposes secrets, API tokens, or credentials.
 */
export async function runDatabaseSelfTest(): Promise<{
  ok: boolean;
  latencyMs: number;
  localStore: { ok: boolean; latencyMs: number; jobCount: number; error?: string };
  r2Json: { configured: boolean; ok: boolean; latencyMs: number; error?: string };
  d1: { configured: boolean; ok: boolean; latencyMs: number; jobCount?: number; error?: string };
  checkedAt: string;
}> {
  const overallStart = Date.now();
  const probeId = `diag-probe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const checkedAt = new Date().toISOString();

  // 1. Local atomic JSON write/read/delete probe
  let localStore: { ok: boolean; latencyMs: number; jobCount: number; error?: string } = {
    ok: false,
    latencyMs: 0,
    jobCount: 0
  };
  const tLocal = Date.now();
  try {
    await withStoreWrite((s) => {
      s._diag_probe = { id: probeId, ts: checkedAt };
    });
    const readBack = loadStore();
    const matched = readBack?._diag_probe?.id === probeId;
    const jobCount = Array.isArray(readBack?.parser2_jobs) ? readBack.parser2_jobs.length : 0;
    await withStoreWrite((s) => {
      delete s._diag_probe;
    });
    localStore = { ok: matched, latencyMs: Date.now() - tLocal, jobCount };
  } catch (e: any) {
    localStore = { ok: false, latencyMs: Date.now() - tLocal, jobCount: 0, error: e?.message || 'Local store write failed' };
  }

  // 2. R2 JSON persistence write/read probe
  const r2Configured = Boolean(getR2Client());
  let r2Json: { configured: boolean; ok: boolean; latencyMs: number; error?: string } = {
    configured: r2Configured,
    ok: false,
    latencyMs: 0
  };
  if (r2Configured) {
    const tR2 = Date.now();
    try {
      const probeKey = `parser2/diagnostics/${probeId}.json`;
      const wrote = await putR2Json(probeKey, { probeId, checkedAt });
      const fetched = await getR2Json<{ probeId?: string }>(probeKey);
      r2Json = {
        configured: true,
        ok: Boolean(wrote && fetched?.probeId === probeId),
        latencyMs: Date.now() - tR2,
        error: !wrote ? 'R2 put failed' : fetched?.probeId !== probeId ? 'R2 readback mismatch' : undefined
      };
    } catch (e: any) {
      r2Json = { configured: true, ok: false, latencyMs: Date.now() - tR2, error: e?.message || 'R2 JSON probe error' };
    }
  }

  // 3. Cloudflare D1 query probe (when configured)
  const d1Configured = isD1Configured();
  let d1: { configured: boolean; ok: boolean; latencyMs: number; jobCount?: number; error?: string } = {
    configured: d1Configured,
    ok: !d1Configured,
    latencyMs: 0
  };
  if (d1Configured) {
    const tD1 = Date.now();
    try {
      await ensureParser2D1Tables();
      const res = await executeD1Query(`SELECT COUNT(*) AS cnt FROM parser2_jobs;`);
      const cnt = Number(res?.result?.[0]?.results?.[0]?.cnt ?? 0);
      d1 = {
        configured: true,
        ok: Boolean(res?.success),
        latencyMs: Date.now() - tD1,
        jobCount: cnt,
        error: res?.success ? undefined : (res?.error || 'D1 query failed')
      };
    } catch (e: any) {
      d1 = { configured: true, ok: false, latencyMs: Date.now() - tD1, error: e?.message || 'D1 probe error' };
    }
  }

  const ok = localStore.ok && (!r2Configured || r2Json.ok) && (!d1Configured || d1.ok);
  return {
    ok,
    latencyMs: Date.now() - overallStart,
    localStore,
    r2Json,
    d1,
    checkedAt
  };
}
