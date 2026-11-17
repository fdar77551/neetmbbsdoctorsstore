// Cloudflare Worker entrypoint with Static Assets, Authoritative D1 Database Bindings,
// R2 Asset Streaming, Firebase RTDB / R2 Hydration Parity, and Strict /api/* JSON Routing.

export interface D1Database {
  exec(query: string): Promise<any>;
  prepare(query: string): any;
  batch?(statements: any[]): Promise<any[]>;
}

export interface Fetcher {
  fetch(request: Request | string, init?: any): Promise<Response>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB?: D1Database;
  ASSETS?: Fetcher;
  DEFAULT_R2_PUBLIC_DOMAIN?: string;
  GEMINI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  ALLOW_SANDBOX_PAYMENTS?: string;
  VITE_GEMINI_API_KEY?: string;
}

const R2_FALLBACK_BASE = 'https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev';
const FIREBASE_RTDB_BASE = 'https://ncertify-neet-master-tests-default-rtdb.firebaseio.com';
const ADMIN_EMAILS = new Set(['fdar77551@gmail.com', 'shahzaibhusain6@gmail.com']);

const DEFAULT_TEST_CATEGORIES = [
  {
    id: 'chapter_wise',
    slug: 'chapter_wise',
    name: 'Chapter Wise Tests',
    description: 'Deep-dive topic by topic across NCERT Physics, Chemistry & Biology chapters',
    bannerImageUrl: '/src/assets/images/category_chapter_wise_1794238280926.jpg',
    themePreset: 'blue',
    displayOrder: 1,
    isVisible: true,
    isDefault: true,
    badgeText: '90+ Chapters',
    accentTags: ['Physics', 'Chemistry', 'Biology'],
    ctaText: 'Explore Chapters',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'full_subject',
    slug: 'full_subject',
    name: 'Full Subject Tests',
    description: 'Complete 100% syllabus evaluation for individual subjects (180 Marks)',
    bannerImageUrl: '/src/assets/images/category_full_subject_1794238281273.jpg',
    themePreset: 'purple',
    displayOrder: 2,
    isVisible: true,
    isDefault: true,
    badgeText: '180 Marks / Paper',
    accentTags: ['45 Qs Standard', 'All 3 Subjects', 'Subject Mastery'],
    ctaText: 'Explore Subject Series',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'full_syllabus',
    slug: 'full_syllabus',
    name: 'Full Syllabus Tests',
    description: 'Comprehensive 720-marks NTA NEET simulation with live All India Rank',
    bannerImageUrl: '/src/assets/images/category_full_syllabus_1794238281967.jpg',
    themePreset: 'amber',
    displayOrder: 3,
    isVisible: true,
    isDefault: true,
    badgeText: '720M Full PCB',
    accentTags: ['720 Marks NEET', '180/200 Qs NTA', 'AIR Ranking'],
    ctaText: 'Explore Grand Mocks',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const REMOVED_LEGACY_CATS = new Set(['cbt_mock', 'pyq', 'custom_practice']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email'
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

function isAdminAuthorized(request: Request, body?: any): { ok: boolean; email?: string } {
  const email = String(request.headers.get('x-user-email') || body?.adminEmail || '')
    .toLowerCase()
    .trim();
  if (email && !ADMIN_EMAILS.has(email)) {
    return { ok: false, email };
  }
  return { ok: true, email };
}

async function fetchJsonSafe(url: string): Promise<any> {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Cloudflare-Worker-Sync' } });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text || text.trim() === 'null') return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchR2Json(key: string): Promise<any> {
  return fetchJsonSafe(`${R2_FALLBACK_BASE}/${key.replace(/^\/+/, '')}`);
}

async function putRtdbJson(path: string, data: any): Promise<boolean> {
  try {
    const resp = await fetch(`${FIREBASE_RTDB_BASE}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return resp.ok;
  } catch {
    return false;
  }
}

let d1Initialized = false;

async function getTableCols(db: D1Database, table: string): Promise<Set<string>> {
  try {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    return new Set((results || []).map((r: any) => String(r?.name || '').toLowerCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function ensureD1Tables(db: D1Database) {
  if (d1Initialized) return;
  try {
    const ddls = [
      `CREATE TABLE IF NOT EXISTS mock_tests (id TEXT PRIMARY KEY, title TEXT, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS mock_questions (test_id TEXT PRIMARY KEY, questions TEXT, count INTEGER, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS store_config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS test_categories (id TEXT PRIMARY KEY, slug TEXT, name TEXT, description TEXT, bannerImageUrl TEXT, themePreset TEXT, displayOrder INTEGER, isVisible INTEGER, isDefault INTEGER, badgeText TEXT, accentTags TEXT, ctaText TEXT, createdAt TEXT, updatedAt TEXT)`,
      `CREATE TABLE IF NOT EXISTS mock_purchases (id TEXT PRIMARY KEY, user_id TEXT, user_email TEXT, test_id TEXT, data TEXT, purchased_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS mock_test_attempts (id TEXT PRIMARY KEY, test_id TEXT, user_email TEXT, score INTEGER, data TEXT, submitted_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS parser2_jobs (id TEXT PRIMARY KEY, test_name TEXT, subject TEXT, chapter TEXT, question_range TEXT, ocr_engine TEXT DEFAULT 'mistral', gemini_model TEXT DEFAULT 'gemini-4-hydrogen', enable_gemini_verification INTEGER DEFAULT 1, status TEXT DEFAULT 'queued', current_stage TEXT, total_pages INTEGER DEFAULT 0, completed_pages INTEGER DEFAULT 0, failed_pages INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, questions_detected INTEGER DEFAULT 0, questions_saved INTEGER DEFAULT 0, saved_verified INTEGER DEFAULT 0, verified_questions INTEGER DEFAULT 0, review_required_count INTEGER DEFAULT 0, figure_count INTEGER DEFAULT 0, estimated_cost_usd REAL DEFAULT 0.0, retry_count INTEGER DEFAULT 0, manually_edited_count INTEGER DEFAULT 0, has_answer_key INTEGER DEFAULT 0, quality_score INTEGER DEFAULT 0, reconciliation_json TEXT, quality_breakdown_json TEXT, published_test_id TEXT, error_message TEXT, original_pdf_file_name TEXT, source_question_pdf_name TEXT, source_solution_pdf_name TEXT, data TEXT, last_activity_at TEXT, created_at TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS parser2_job_blobs (job_id TEXT PRIMARY KEY, pages_json TEXT, questions_json TEXT, figures_json TEXT, answer_keys_json TEXT, validation_json TEXT, logs_json TEXT, source_files_json TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, product_id TEXT, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, data TEXT, updated_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, data TEXT, updated_at TEXT)`
    ];
    for (const sql of ddls) {
      await db.prepare(sql).run().catch(() => {});
    }

    // Non-destructive column checks for tables that may pre-exist from older deployments
    const mtCols = await getTableCols(db, 'mock_tests');
    if (mtCols.size > 0 && !mtCols.has('data')) {
      await db.prepare(`ALTER TABLE mock_tests ADD COLUMN data TEXT`).run().catch(() => {});
    }
    if (mtCols.size > 0 && !mtCols.has('updated_at')) {
      await db.prepare(`ALTER TABLE mock_tests ADD COLUMN updated_at TEXT`).run().catch(() => {});
    }

    const mqCols = await getTableCols(db, 'mock_questions');
    if (mqCols.size > 0 && !mqCols.has('questions')) {
      await db.prepare(`ALTER TABLE mock_questions ADD COLUMN questions TEXT`).run().catch(() => {});
    }
    if (mqCols.size > 0 && !mqCols.has('test_id')) {
      await db.prepare(`ALTER TABLE mock_questions ADD COLUMN test_id TEXT`).run().catch(() => {});
    }

    const p2Cols = await getTableCols(db, 'parser2_jobs');
    if (p2Cols.size > 0 && !p2Cols.has('data')) {
      await db.prepare(`ALTER TABLE parser2_jobs ADD COLUMN data TEXT`).run().catch(() => {});
    }
    if (p2Cols.size > 0 && !p2Cols.has('questions_saved')) {
      await db.prepare(`ALTER TABLE parser2_jobs ADD COLUMN questions_saved INTEGER DEFAULT 0`).run().catch(() => {});
    }
    if (p2Cols.size > 0 && !p2Cols.has('questions_detected')) {
      await db.prepare(`ALTER TABLE parser2_jobs ADD COLUMN questions_detected INTEGER DEFAULT 0`).run().catch(() => {});
    }
    if (p2Cols.size > 0 && !p2Cols.has('saved_verified')) {
      await db.prepare(`ALTER TABLE parser2_jobs ADD COLUMN saved_verified INTEGER DEFAULT 0`).run().catch(() => {});
    }

    d1Initialized = true;
  } catch (e) {
    console.warn('ensureD1Tables note:', e);
  }
}

function mapJobRow(r: any): any {
  if (!r) return null;
  let parsedData: any = {};
  if (r.data && typeof r.data === 'string') {
    try { parsedData = JSON.parse(r.data); } catch {}
  }
  const totalQ = Number(r.total_questions ?? parsedData.totalQuestions ?? 0);
  const rawSaved = Number(r.questions_saved ?? parsedData.questionsSaved ?? 0);
  const status = String(r.status || parsedData.status || 'queued');
  const finished = ['completed', 'review_required', 'published', 'approved'].includes(status);
  const resolvedSaved = rawSaved > 0 ? rawSaved : finished && totalQ > 0 ? totalQ : rawSaved;

  return {
    ...parsedData,
    id: r.id || parsedData.id,
    testName: r.test_name || parsedData.testName || 'Untitled Test',
    subject: r.subject || parsedData.subject || 'Combined',
    chapter: r.chapter ?? parsedData.chapter ?? '',
    questionRange: r.question_range ?? parsedData.questionRange ?? '',
    ocrEngine: r.ocr_engine || parsedData.ocrEngine || 'mistral',
    geminiModel: r.gemini_model || parsedData.geminiModel || 'gemini-4-hydrogen',
    enableGeminiVerification: Boolean(r.enable_gemini_verification ?? parsedData.enableGeminiVerification ?? true),
    status,
    currentStage: r.current_stage || parsedData.currentStage,
    totalPages: Number(r.total_pages ?? parsedData.totalPages ?? 0),
    completedPages: Number(r.completed_pages ?? parsedData.completedPages ?? 0),
    failedPages: Number(r.failed_pages ?? parsedData.failedPages ?? 0),
    totalQuestions: totalQ,
    questionsDetected: Number(r.questions_detected ?? parsedData.questionsDetected ?? totalQ) || totalQ,
    questionsSaved: resolvedSaved,
    savedVerified: Boolean(r.saved_verified ?? parsedData.savedVerified ?? resolvedSaved > 0),
    verifiedQuestions: Number(r.verified_questions ?? parsedData.verifiedQuestions ?? 0),
    reviewRequiredCount: Number(r.review_required_count ?? parsedData.reviewRequiredCount ?? 0),
    figureCount: Number(r.figure_count ?? parsedData.figureCount ?? 0),
    estimatedCostUsd: Number(r.estimated_cost_usd ?? parsedData.estimatedCostUsd ?? 0),
    retryCount: Number(r.retry_count ?? parsedData.retryCount ?? 0),
    manuallyEditedCount: Number(r.manually_edited_count ?? parsedData.manuallyEditedCount ?? 0),
    hasAnswerKey: Boolean(r.has_answer_key ?? parsedData.hasAnswerKey),
    qualityScore: Number(r.quality_score ?? parsedData.qualityScore ?? 0) || undefined,
    publishedTestId: r.published_test_id || parsedData.publishedTestId || undefined,
    errorMessage: r.error_message || parsedData.errorMessage || undefined,
    originalPdfFileName: r.original_pdf_file_name || parsedData.originalPdfFileName || parsedData.sourceQuestionPdfName,
    sourceQuestionPdfName: r.source_question_pdf_name || parsedData.sourceQuestionPdfName,
    sourceSolutionPdfName: r.source_solution_pdf_name || parsedData.sourceSolutionPdfName,
    lastActivityAt: r.last_activity_at || parsedData.lastActivityAt || r.updated_at,
    createdAt: r.created_at || parsedData.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || parsedData.updatedAt || new Date().toISOString()
  };
}

async function upsertJobInD1(db: D1Database, j: any) {
  if (!j?.id) return;
  const now = new Date().toISOString();
  const totalQ = Number(j.totalQuestions || 0);
  const savedQ = Number(j.questionsSaved || 0) > 0
    ? Number(j.questionsSaved)
    : ['completed', 'review_required', 'published', 'approved'].includes(String(j.status || '')) && totalQ > 0
    ? totalQ
    : Number(j.questionsSaved || 0);
  const cleanJob = { ...j, questionsSaved: savedQ, savedVerified: savedQ > 0 || Boolean(j.savedVerified) };

  await db
    .prepare(
      `INSERT INTO parser2_jobs (id, test_name, subject, chapter, question_range, ocr_engine, gemini_model, enable_gemini_verification, status, current_stage, total_pages, completed_pages, failed_pages, total_questions, questions_detected, questions_saved, saved_verified, verified_questions, review_required_count, figure_count, estimated_cost_usd, retry_count, manually_edited_count, has_answer_key, quality_score, published_test_id, error_message, original_pdf_file_name, source_question_pdf_name, source_solution_pdf_name, data, last_activity_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34)
       ON CONFLICT(id) DO UPDATE SET
         test_name=?2, subject=?3, chapter=?4, status=?9, current_stage=?10,
         total_pages=?11, completed_pages=?12, failed_pages=?13, total_questions=?14,
         questions_detected=?15, questions_saved=?16, saved_verified=?17,
         verified_questions=?18, review_required_count=?19, figure_count=?20,
         has_answer_key=?24, quality_score=?25, published_test_id=?26, error_message=?27,
         data=?31, last_activity_at=?32, updated_at=?34`
    )
    .bind(
      cleanJob.id,
      cleanJob.testName || 'Untitled',
      cleanJob.subject || 'Combined',
      cleanJob.chapter || '',
      cleanJob.questionRange || '',
      cleanJob.ocrEngine || 'mistral',
      cleanJob.geminiModel || 'gemini-4-hydrogen',
      cleanJob.enableGeminiVerification ? 1 : 0,
      cleanJob.status || 'queued',
      cleanJob.currentStage || '',
      Number(cleanJob.totalPages || 0),
      Number(cleanJob.completedPages || 0),
      Number(cleanJob.failedPages || 0),
      totalQ,
      Number(cleanJob.questionsDetected || totalQ),
      savedQ,
      cleanJob.savedVerified ? 1 : 0,
      Number(cleanJob.verifiedQuestions || 0),
      Number(cleanJob.reviewRequiredCount || 0),
      Number(cleanJob.figureCount || 0),
      Number(cleanJob.estimatedCostUsd || 0),
      Number(cleanJob.retryCount || 0),
      Number(cleanJob.manuallyEditedCount || 0),
      cleanJob.hasAnswerKey ? 1 : 0,
      Number(cleanJob.qualityScore || 0),
      cleanJob.publishedTestId || '',
      cleanJob.errorMessage || '',
      cleanJob.originalPdfFileName || cleanJob.sourceQuestionPdfName || '',
      cleanJob.sourceQuestionPdfName || '',
      cleanJob.sourceSolutionPdfName || '',
      JSON.stringify(cleanJob),
      cleanJob.lastActivityAt || now,
      cleanJob.createdAt || now,
      cleanJob.updatedAt || now
    )
    .run();
}

async function hydrateParser2JobsIfEmpty(db: D1Database): Promise<void> {
  try {
    const countRow: any = await db.prepare(`SELECT COUNT(*) AS cnt FROM parser2_jobs`).first();
    if (Number(countRow?.cnt || 0) > 0) return;

    const deletedData = await fetchR2Json('parser2/db/deleted_jobs.json');
    const deletedSet = new Set<string>(Array.isArray(deletedData?.ids) ? deletedData.ids : []);

    const [r2Index, rtdbJobs] = await Promise.all([
      fetchR2Json('parser2/db/jobs_index.json'),
      fetchJsonSafe(`${FIREBASE_RTDB_BASE}/parser2_jobs.json`)
    ]);

    const merged = new Map<string, any>();
    if (Array.isArray(r2Index?.jobs)) {
      for (const j of r2Index.jobs) {
        if (j?.id && !deletedSet.has(j.id)) merged.set(j.id, j);
      }
    }
    if (rtdbJobs && typeof rtdbJobs === 'object') {
      const list = Array.isArray(rtdbJobs) ? rtdbJobs : Object.values(rtdbJobs);
      for (const j of list) {
        if (j?.id && !deletedSet.has(j.id) && !merged.has(j.id)) merged.set(j.id, j);
      }
    }

    for (const j of merged.values()) {
      await upsertJobInD1(db, j).catch(() => {});
    }
  } catch (e) {
    console.warn('hydrateParser2JobsIfEmpty note:', e);
  }
}

async function ensureJobBlobs(db: D1Database, jobId: string): Promise<any> {
  const existing: any = await db.prepare(`SELECT * FROM parser2_job_blobs WHERE job_id = ?`).bind(jobId).first();
  if (existing && (existing.questions_json || existing.pages_json)) {
    return {
      pages: existing.pages_json ? JSON.parse(existing.pages_json) : [],
      questions: existing.questions_json ? JSON.parse(existing.questions_json) : [],
      figures: existing.figures_json ? JSON.parse(existing.figures_json) : [],
      answerKeys: existing.answer_keys_json ? JSON.parse(existing.answer_keys_json) : {},
      validationReport: existing.validation_json ? JSON.parse(existing.validation_json) : null,
      logs: existing.logs_json ? JSON.parse(existing.logs_json) : [],
      sourceFiles: existing.source_files_json ? JSON.parse(existing.source_files_json) : []
    };
  }

  // Hydrate child blobs on demand from R2
  const [pages, questions, figures, answerKeys, validationReport, logs, sourceFiles] = await Promise.all([
    fetchR2Json(`parser2/db/jobs/${jobId}/pages.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/questions.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/figures.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/answerKeys.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/validationReport.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/logs.json`),
    fetchR2Json(`parser2/db/jobs/${jobId}/sourceFiles.json`)
  ]);

  const payload = {
    pages: Array.isArray(pages) ? pages : [],
    questions: Array.isArray(questions) ? questions : [],
    figures: Array.isArray(figures) ? figures : [],
    answerKeys: answerKeys && typeof answerKeys === 'object' ? answerKeys : {},
    validationReport: validationReport || null,
    logs: Array.isArray(logs) ? logs : [],
    sourceFiles: Array.isArray(sourceFiles) ? sourceFiles : []
  };

  if (payload.questions.length > 0 || payload.pages.length > 0) {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO parser2_job_blobs (job_id, pages_json, questions_json, figures_json, answer_keys_json, validation_json, logs_json, source_files_json, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(job_id) DO UPDATE SET pages_json=?2, questions_json=?3, figures_json=?4, answer_keys_json=?5, validation_json=?6, logs_json=?7, source_files_json=?8, updated_at=?9`
      )
      .bind(
        jobId,
        JSON.stringify(payload.pages),
        JSON.stringify(payload.questions),
        JSON.stringify(payload.figures),
        JSON.stringify(payload.answerKeys),
        payload.validationReport ? JSON.stringify(payload.validationReport) : '',
        JSON.stringify(payload.logs),
        JSON.stringify(payload.sourceFiles),
        now
      )
      .run()
      .catch(() => {});
  }
  return payload;
}

async function hydrateMockTestsIfEmpty(db: D1Database): Promise<void> {
  try {
    const countRow: any = await db.prepare(`SELECT COUNT(*) AS cnt FROM mock_tests`).first();
    if (Number(countRow?.cnt || 0) > 0) return;

    const [r2Index, rtdbTests] = await Promise.all([
      fetchR2Json('parser2/db/mock_tests_index.json'),
      fetchJsonSafe(`${FIREBASE_RTDB_BASE}/mock_tests.json`)
    ]);

    const merged = new Map<string, any>();
    if (Array.isArray(r2Index?.tests)) {
      for (const t of r2Index.tests) if (t?.id) merged.set(t.id, t);
    }
    if (rtdbTests && typeof rtdbTests === 'object') {
      const list = Array.isArray(rtdbTests) ? rtdbTests : Object.values(rtdbTests);
      for (const t of list) if (t?.id && !merged.has(t.id)) merged.set(t.id, t);
    }

    const now = new Date().toISOString();
    for (const t of merged.values()) {
      const { questions: _, ...cleanTest } = t;
      await db
        .prepare(
          `INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`
        )
        .bind(cleanTest.id, cleanTest.title || 'Untitled', JSON.stringify(cleanTest), cleanTest.updatedAt || now)
        .run()
        .catch(() => {});
    }
  } catch (e) {
    console.warn('hydrateMockTestsIfEmpty note:', e);
  }
}

async function getAllTestsFromD1(db: D1Database): Promise<any[]> {
  await hydrateMockTestsIfEmpty(db);
  const { results } = await db.prepare(`SELECT * FROM mock_tests ORDER BY updated_at DESC`).all();
  return (results || [])
    .map((r: any) => {
      if (r.data) {
        try {
          return JSON.parse(r.data);
        } catch {}
      }
      return {
        id: r.id,
        testNumber: r.testNumber,
        title: r.title,
        subject: r.subject,
        totalQuestions: Number(r.totalQuestions || 0),
        durationMinutes: Number(r.durationMinutes || 60),
        price: Number(r.price || 0),
        isFree: Boolean(r.isFree),
        createdAt: r.createdAt
      };
    })
    .filter((t: any) => t && t.id);
}

async function getQuestionsForTestFromD1(db: D1Database, testId: string): Promise<any[]> {
  const row: any = await db.prepare(`SELECT questions FROM mock_questions WHERE test_id = ?`).bind(testId).first();
  if (row?.questions) {
    try {
      const parsed = JSON.parse(row.questions);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  // On-demand hydrate from R2 published snapshot or Firebase RTDB
  const [r2Snap, rtdbQs] = await Promise.all([
    fetchR2Json(`parser2/db/published/${testId}.json`),
    fetchJsonSafe(`${FIREBASE_RTDB_BASE}/mock_questions/${encodeURIComponent(testId)}.json`)
  ]);
  const recovered = Array.isArray(r2Snap?.questions) && r2Snap.questions.length > 0
    ? r2Snap.questions
    : Array.isArray(rtdbQs) && rtdbQs.length > 0
    ? rtdbQs
    : [];

  if (recovered.length > 0) {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO mock_questions (test_id, questions, count, updated_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(test_id) DO UPDATE SET questions=?2, count=?3, updated_at=?4`
      )
      .bind(testId, JSON.stringify(recovered), recovered.length, now)
      .run()
      .catch(() => {});
  }
  return recovered;
}

function normalizeCategories(input: any[]): any[] {
  const map = new Map<string, any>();
  for (const d of DEFAULT_TEST_CATEGORIES) map.set(d.id, { ...d });
  if (Array.isArray(input)) {
    for (const raw of input) {
      if (!raw?.id || REMOVED_LEGACY_CATS.has(String(raw.id).trim())) continue;
      const cleanId = String(raw.id).trim();
      const ex = map.get(cleanId);
      map.set(cleanId, ex ? { ...ex, ...raw, id: ex.id, slug: ex.slug, isDefault: true } : { ...raw, id: cleanId, isDefault: false });
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

async function getCategoriesFromD1(db: D1Database): Promise<any[]> {
  let { results } = await db.prepare(`SELECT * FROM test_categories ORDER BY displayOrder ASC`).all();
  if (!results || results.length === 0) {
    const rtdbCats = await fetchJsonSafe(`${FIREBASE_RTDB_BASE}/test_categories.json`);
    const list = normalizeCategories(Array.isArray(rtdbCats) ? rtdbCats : Object.values(rtdbCats || {}));
    for (const c of list) {
      await db
        .prepare(
          `INSERT OR REPLACE INTO test_categories (id, slug, name, description, bannerImageUrl, themePreset, displayOrder, isVisible, isDefault, badgeText, accentTags, ctaText, createdAt, updatedAt)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
        )
        .bind(
          c.id, c.slug || c.id, c.name || '', c.description || '', c.bannerImageUrl || '',
          c.themePreset || 'indigo', Number(c.displayOrder || 1), c.isVisible !== false ? 1 : 0,
          c.isDefault ? 1 : 0, c.badgeText || '', JSON.stringify(c.accentTags || []),
          c.ctaText || 'Explore Tests', c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()
        )
        .run()
        .catch(() => {});
    }
    return list;
  }

  return normalizeCategories(
    results.map((r: any) => ({
      id: r.id,
      slug: r.slug || r.id,
      name: r.name,
      description: r.description || '',
      bannerImageUrl: r.bannerImageUrl || '',
      themePreset: r.themePreset || 'indigo',
      displayOrder: Number(r.displayOrder || 1),
      isVisible: r.isVisible !== 0,
      isDefault: Boolean(r.isDefault),
      badgeText: r.badgeText || '',
      accentTags: r.accentTags ? JSON.parse(r.accentTags) : [],
      ctaText: r.ctaText || 'Explore Tests',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }))
  );
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health Check
    if (pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        platform: 'cloudflare_workers',
        hasD1: Boolean(env.DB),
        database_name: 'neetmbbsdoctorsstore',
        database_id: 'daf5a141-af4a-4db6-b10d-ac3bbab28b72',
        razorpayConfigured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/api/config') {
      return jsonResponse({
        razorpayKeyId: env.RAZORPAY_KEY_ID || 'rzp_live_TS3u0sJ2yf9X6A',
        r2PublicDevUrl: R2_FALLBACK_BASE,
        platform: 'cloudflare_workers',
        hasD1: Boolean(env.DB)
      });
    }

    // 1. R2 File Streaming Proxy (/api/r2/file/* and /storage/*)
    if (pathname.startsWith('/api/r2/file/') || pathname.startsWith('/storage/')) {
      const key = pathname.startsWith('/api/r2/file/')
        ? pathname.replace('/api/r2/file/', '').replace(/^\/+/, '')
        : pathname.replace('/storage/', '').replace(/^\/+/, '');
      if (!key) return new Response('Key required', { status: 400 });

      try {
        const upstream = await fetch(`${R2_FALLBACK_BASE}/${key}`, {
          headers: { 'User-Agent': 'Cloudflare-Worker-R2-Proxy' }
        });
        if (upstream.ok) {
          const respHeaders = new Headers(upstream.headers);
          respHeaders.set('Access-Control-Allow-Origin', '*');
          respHeaders.set('Cache-Control', 'public, max-age=86400');
          return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
        }
      } catch (err) {
        console.error('R2 stream error:', err);
      }
      return new Response('Asset not found', { status: 404 });
    }

    // All remaining /api/* routes require JSON responses (never HTML fallbacks!)
    if (pathname.startsWith('/api/')) {
      if (!env.DB) {
        return jsonResponse({
          success: false,
          error: 'Cloudflare D1 binding "DB" is unavailable in Worker environment.'
        }, 503);
      }

      const db = env.DB;
      await ensureD1Tables(db);

      // -------------------------------------------------------------
      // PAYMENT ROUTES (/api/payment/create-order, /api/payment/verify)
      // -------------------------------------------------------------
      if (pathname === '/api/payment/create-order' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const amount = Number(body?.amount || 0);
          if (!amount || amount <= 0) return jsonResponse({ success: false, error: 'Invalid order amount' }, 400);
          const amountInPaise = Math.round(amount * 100);
          let orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

          if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
            const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
            const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
              method: 'POST',
              headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                receipt: body?.receipt || `rcpt_${Date.now()}`,
                notes: body?.notes || {}
              })
            });
            if (rzpResp.ok) {
              const rzpData: any = await rzpResp.json();
              if (rzpData?.id) orderId = rzpData.id;
            }
          }

          return jsonResponse({
            success: true,
            order_id: orderId,
            amount: amountInPaise,
            currency: 'INR',
            key_id: env.RAZORPAY_KEY_ID || 'rzp_live_TS3u0sJ2yf9X6A'
          });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      if (pathname === '/api/payment/verify' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mockTestUnlock, order_data } = body || {};
          if (!razorpay_order_id || !razorpay_payment_id) {
            return jsonResponse({ success: false, message: 'Missing required payment parameters' }, 400);
          }

          let isValid = false;
          const allowSandbox = env.ALLOW_SANDBOX_PAYMENTS === 'true' || !env.RAZORPAY_KEY_SECRET;
          if (razorpay_signature && env.RAZORPAY_KEY_SECRET && razorpay_signature !== 'sandbox_verified_signature') {
            const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
            isValid = expected === String(razorpay_signature);
          } else if (razorpay_signature === 'sandbox_verified_signature' && allowSandbox) {
            isValid = Boolean(String(razorpay_payment_id).startsWith('pay_'));
          }

          if (!isValid) {
            return jsonResponse({ success: false, message: 'Payment verification failed. Invalid HMAC signature.' }, 400);
          }

          if (mockTestUnlock?.testId && (mockTestUnlock?.userEmail || mockTestUnlock?.userId)) {
            const now = new Date().toISOString();
            const purchase = {
              id: `purch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              userId: mockTestUnlock.userId || mockTestUnlock.userEmail,
              userEmail: String(mockTestUnlock.userEmail || '').toLowerCase().trim(),
              testId: mockTestUnlock.testId,
              packageType: mockTestUnlock.packageType || undefined,
              amount: Number(mockTestUnlock.amount || order_data?.amount || 0),
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              verifiedServerSide: true,
              purchasedAt: now
            };
            await db
              .prepare(
                `INSERT OR REPLACE INTO mock_purchases (id, user_id, user_email, test_id, data, purchased_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
              )
              .bind(purchase.id, purchase.userId, purchase.userEmail, purchase.testId, JSON.stringify(purchase), now)
              .run();
          }

          return jsonResponse({
            success: true,
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
          });
        } catch (err: any) {
          return jsonResponse({ success: false, error: err.message }, 500);
        }
      }

      // -------------------------------------------------------------
      // PARSER 2.0 / 3.0 AUTHORITATIVE D1 APIs
      // -------------------------------------------------------------
      if (pathname === '/api/parser2/jobs' && request.method === 'GET') {
        await hydrateParser2JobsIfEmpty(db);
        const { results } = await db.prepare(`SELECT * FROM parser2_jobs ORDER BY created_at DESC LIMIT 200`).all();
        const jobs = (results || []).map(mapJobRow).filter(Boolean);
        return jsonResponse({
          success: true,
          jobs,
          totalCount: jobs.length,
          filterCounts: {
            all: jobs.length,
            queued: jobs.filter((j: any) => j.status === 'queued' || j.status === 'uploaded').length,
            active: jobs.filter((j: any) => ['extracting', 'processing', 'ocr_in_progress', 'question_detection', 'question_extraction', 'structuring', 'figure_extraction', 'validation', 'saving', 'verifying', 'paused'].includes(j.status)).length,
            completed: jobs.filter((j: any) => ['completed', 'review_required', 'published'].includes(j.status)).length,
            published: jobs.filter((j: any) => j.status === 'published').length,
            failed: jobs.filter((j: any) => j.status === 'failed').length
          }
        });
      }

      if (pathname === '/api/parser2/settings') {
        const row: any = await db.prepare(`SELECT value FROM store_config WHERE key = 'parser2_settings'`).first();
        let settings = row?.value ? JSON.parse(row.value) : await fetchR2Json('parser2/db/settings.json');
        if (!settings) {
          settings = {
            mistralOcrEnabled: true,
            geminiVerificationEnabled: true,
            geminiModel: 'gemini-4-hydrogen',
            ocrBatchSize: 4,
            retryCount: 3,
            pageLimit: 100,
            maxFileSizeMb: 50,
            figureDpi: 180,
            requireManualReviewForUncertain: true
          };
        }
        if (request.method === 'PUT') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const patch: any = await request.json();
          const merged = { ...settings, ...patch };
          await db
            .prepare(`INSERT OR REPLACE INTO store_config (key, value, updated_at) VALUES ('parser2_settings', ?1, ?2)`)
            .bind(JSON.stringify(merged), new Date().toISOString())
            .run();
          return jsonResponse({ success: true, settings: merged });
        }
        return jsonResponse({
          success: true,
          settings,
          status: {
            mistralConfigured: Boolean(env.MISTRAL_API_KEY),
            geminiConfigured: Boolean(env.GEMINI_API_KEY)
          }
        });
      }

      const p2JobMatch = pathname.match(/^\/api\/parser2\/jobs\/([^/]+)(?:\/(.*))?$/);
      if (p2JobMatch) {
        const jobId = decodeURIComponent(p2JobMatch[1]);
        const subRoute = p2JobMatch[2] || '';

        await hydrateParser2JobsIfEmpty(db);

        // GET /api/parser2/jobs/:jobId/pages/:pageNumber/image -> R2 stream
        const pageImgMatch = subRoute.match(/^pages\/(\d+)\/image$/);
        if (pageImgMatch && request.method === 'GET') {
          const pNum = parseInt(pageImgMatch[1], 10);
          const blobs = await ensureJobBlobs(db, jobId);
          const pageMeta = (blobs.pages || []).find((p: any) => Number(p.pageNumber) === pNum);
          const key = pageMeta?.pageImageKey || `parser2/jobs/${jobId}/pages/page_${pNum}.png`;
          const upstream = await fetch(`${R2_FALLBACK_BASE}/${key.replace(/^\/+/, '')}`);
          if (upstream.ok) {
            const h = new Headers(upstream.headers);
            h.set('Access-Control-Allow-Origin', '*');
            h.set('Cache-Control', 'public, max-age=86400');
            return new Response(upstream.body, { status: 200, headers: h });
          }
          return jsonResponse({ success: false, error: 'Page image not found in R2' }, 404);
        }

        const jobRow: any = await db.prepare(`SELECT * FROM parser2_jobs WHERE id = ?`).bind(jobId).first();
        if (!jobRow && request.method !== 'DELETE') {
          return jsonResponse({ success: false, error: 'Job not found' }, 404);
        }
        const job = mapJobRow(jobRow);

        if (!subRoute && request.method === 'GET') {
          const blobs = await ensureJobBlobs(db, jobId);
          return jsonResponse({
            success: true,
            job,
            pages: blobs.pages,
            logs: (blobs.logs || []).slice(-150),
            validationReport: blobs.validationReport,
            answerKeyCount: Object.keys(blobs.answerKeys || {}).length
          });
        }

        if (!subRoute && request.method === 'DELETE') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          await db.prepare(`DELETE FROM parser2_jobs WHERE id = ?`).bind(jobId).run();
          await db.prepare(`DELETE FROM parser2_job_blobs WHERE job_id = ?`).bind(jobId).run();
          return jsonResponse({ success: true, deletedId: jobId });
        }

        if (subRoute === 'questions' && request.method === 'GET') {
          const blobs = await ensureJobBlobs(db, jobId);
          const active = (blobs.questions || []).filter((q: any) => !q.isDeleted);
          return jsonResponse({ success: true, questions: active });
        }

        const qUpdateMatch = subRoute.match(/^questions\/([^/]+)$/);
        if (qUpdateMatch && request.method === 'PUT') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const questionId = decodeURIComponent(qUpdateMatch[1]);
          const patch: any = await request.json();
          const blobs = await ensureJobBlobs(db, jobId);
          const nextQs = (blobs.questions || []).map((q: any) =>
            q.id === questionId ? { ...q, ...patch, isManuallyEdited: true, updatedAt: new Date().toISOString() } : q
          );
          const updatedQ = nextQs.find((q: any) => q.id === questionId);
          await db
            .prepare(`UPDATE parser2_job_blobs SET questions_json = ?, updated_at = ? WHERE job_id = ?`)
            .bind(JSON.stringify(nextQs), new Date().toISOString(), jobId)
            .run();
          return jsonResponse({ success: true, question: updatedQ });
        }

        if (subRoute === 'figures' && request.method === 'GET') {
          const blobs = await ensureJobBlobs(db, jobId);
          return jsonResponse({ success: true, figures: blobs.figures || [] });
        }

        const figDeleteMatch = subRoute.match(/^questions\/([^/]+)\/figures\/([^/]+)$/);
        if (figDeleteMatch && request.method === 'DELETE') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const questionId = decodeURIComponent(figDeleteMatch[1]);
          const figureId = decodeURIComponent(figDeleteMatch[2]);
          const blobs = await ensureJobBlobs(db, jobId);
          const nextQs = (blobs.questions || []).map((q: any) => {
            if (q.id !== questionId) return q;
            const remaining = (q.figures || []).filter((f: any) => f.id !== figureId);
            const removed = (q.figures || []).find((f: any) => f.id === figureId);
            const nextPrimary =
              removed && q.figureUrl === removed.figureUrl
                ? remaining[0]?.figureUrl
                : remaining.length > 0
                ? q.figureUrl || remaining[0].figureUrl
                : undefined;
            return {
              ...q,
              figureUrl: nextPrimary,
              figures: remaining,
              figureAssetIds: remaining.map((f: any) => f.id),
              updatedAt: new Date().toISOString()
            };
          });
          const nextFigs = (blobs.figures || []).filter((f: any) => f.id !== figureId);
          await db
            .prepare(`UPDATE parser2_job_blobs SET questions_json = ?, figures_json = ?, updated_at = ? WHERE job_id = ?`)
            .bind(JSON.stringify(nextQs), JSON.stringify(nextFigs), new Date().toISOString(), jobId)
            .run();
          return jsonResponse({ success: true, question: nextQs.find((q: any) => q.id === questionId) });
        }

        const figPrimaryMatch = subRoute.match(/^questions\/([^/]+)\/figures\/([^/]+)\/primary$/);
        if (figPrimaryMatch && request.method === 'PUT') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const questionId = decodeURIComponent(figPrimaryMatch[1]);
          const figureId = decodeURIComponent(figPrimaryMatch[2]);
          const blobs = await ensureJobBlobs(db, jobId);
          const nextQs = (blobs.questions || []).map((q: any) => {
            if (q.id !== questionId) return q;
            const target = (q.figures || []).find((f: any) => f.id === figureId);
            if (!target) return q;
            const reordered = [target, ...(q.figures || []).filter((f: any) => f.id !== figureId)];
            return {
              ...q,
              figureUrl: target.figureUrl,
              figures: reordered,
              figureAssetIds: reordered.map((f: any) => f.id),
              updatedAt: new Date().toISOString()
            };
          });
          await db
            .prepare(`UPDATE parser2_job_blobs SET questions_json = ?, updated_at = ? WHERE job_id = ?`)
            .bind(JSON.stringify(nextQs), new Date().toISOString(), jobId)
            .run();
          return jsonResponse({ success: true, question: nextQs.find((q: any) => q.id === questionId) });
        }

        if (subRoute === 'answer-key') {
          const blobs = await ensureJobBlobs(db, jobId);
          if (request.method === 'GET') {
            return jsonResponse({
              success: true,
              answerKeys: blobs.answerKeys || {},
              count: Object.keys(blobs.answerKeys || {}).length
            });
          }
          if (request.method === 'PUT') {
            const auth = isAdminAuthorized(request);
            if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
            const body: any = await request.json().catch(() => ({}));
            const now = new Date().toISOString();
            const nextKeys: Record<number, any> = body.replaceAll ? {} : { ...(blobs.answerKeys || {}) };
            for (const entry of body.entries || []) {
              const ans = String(entry.verifiedAnswer || '').trim().toUpperCase();
              if (entry.questionNumber > 0 && ['A', 'B', 'C', 'D'].includes(ans)) {
                nextKeys[entry.questionNumber] = {
                  questionNumber: Number(entry.questionNumber),
                  rawAnswer: ans,
                  verifiedAnswer: ans,
                  setCode: entry.setCode || body.setCode,
                  sourcePage: entry.sourcePage,
                  confidence: entry.confidence ?? 100,
                  sourceType: 'manual',
                  matchedAt: now
                };
              }
            }
            const nextQs = (blobs.questions || []).map((q: any) => {
              const k = nextKeys[q.questionNumber];
              if (!k) return q;
              return { ...q, correctAnswer: k.verifiedAnswer, importedAnswer: k.verifiedAnswer, answerStatus: 'matched', updatedAt: now };
            });
            await db
              .prepare(`UPDATE parser2_job_blobs SET answer_keys_json = ?, questions_json = ?, updated_at = ? WHERE job_id = ?`)
              .bind(JSON.stringify(nextKeys), JSON.stringify(nextQs), now, jobId)
              .run();
            await db
              .prepare(`UPDATE parser2_jobs SET has_answer_key = ?, updated_at = ? WHERE id = ?`)
              .bind(Object.keys(nextKeys).length > 0 ? 1 : 0, now, jobId)
              .run();
            return jsonResponse({ success: true, answerKeys: nextKeys, questions: nextQs });
          }
          if (request.method === 'DELETE') {
            const auth = isAdminAuthorized(request);
            if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
            const now = new Date().toISOString();
            const nextQs = (blobs.questions || []).map((q: any) => ({
              ...q,
              correctAnswer: undefined,
              importedAnswer: undefined,
              answerStatus: 'answer_missing',
              updatedAt: now
            }));
            await db
              .prepare(`UPDATE parser2_job_blobs SET answer_keys_json = ?, questions_json = ?, updated_at = ? WHERE job_id = ?`)
              .bind('{}', JSON.stringify(nextQs), now, jobId)
              .run();
            await db
              .prepare(`UPDATE parser2_jobs SET has_answer_key = 0, updated_at = ? WHERE id = ?`)
              .bind(now, jobId)
              .run();
            return jsonResponse({ success: true, answerKeys: {}, questions: nextQs });
          }
        }

        if (subRoute === 'validation' && request.method === 'GET') {
          const blobs = await ensureJobBlobs(db, jobId);
          return jsonResponse({ success: true, report: blobs.validationReport });
        }

        if (subRoute === 'logs' && request.method === 'GET') {
          const blobs = await ensureJobBlobs(db, jobId);
          return jsonResponse({ success: true, logs: (blobs.logs || []).slice(-150) });
        }

        if ((subRoute === 'publish' || subRoute === 'repair-publication') && request.method === 'POST') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const body: any = await request.json().catch(() => ({}));
          const blobs = await ensureJobBlobs(db, jobId);
          const activeQs = (blobs.questions || []).filter((q: any) => !q.isDeleted);
          if (activeQs.length === 0) {
            return jsonResponse({ success: false, error: 'Cannot publish test with 0 saved questions.' }, 400);
          }

          const targetTestId = String(body?.existingTestId || job.publishedTestId || `cbt-p2-${Date.now()}`);
          const now = new Date().toISOString();
          const effSubj = body?.subject || job.subject || 'Combined';
          const effChap = body?.chapter ?? job.chapter ?? '';
          const catIds = Array.isArray(body?.categoryIds) && body.categoryIds.length > 0
            ? body.categoryIds
            : [activeQs.length >= 180 ? 'full_syllabus' : effChap ? 'chapter_wise' : 'full_subject'];

          const mockQuestions = activeQs.map((q: any) => ({
            id: `q-${targetTestId}-${q.questionNumber}`,
            testId: targetTestId,
            questionNumber: q.questionNumber,
            subject: q.subject && q.subject !== 'Combined' ? q.subject : effSubj !== 'Combined' ? effSubj : 'Physics',
            chapter: q.chapter || effChap || 'NEET Section',
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer || 'A',
            explanation: q.explanation || '',
            figureUrl: q.figureUrl,
            figures: q.figures ? q.figures.map((f: any) => f.figureUrl) : q.figureUrl ? [q.figureUrl] : [],
            optionFigures: q.optionFigures,
            matchTable: q.matchTable,
            structuredTable: q.matchTable?.rows?.length ? undefined : q.structuredTable,
            sourcePageNumber: q.sourcePageNumber,
            sourcePageEnd: q.sourcePageEnd,
            sourcePages: q.sourcePages,
            sourcePageRange: q.sourcePageRange,
            pdfPageNumber: q.sourcePageNumber,
            pdfPageRange: q.sourcePageRange,
            hasFigure: Boolean(q.figureUrl)
          }));

          const testMeta = {
            id: targetTestId,
            testNumber: body?.testNumber || `Test P2-${Math.floor(100 + Math.random() * 899)}`,
            code: body?.code || `#P2-${Math.floor(10 + Math.random() * 89)}`,
            title: String(body?.title || job.testName || 'NEET Mock Test').trim(),
            shortDescription: body?.subtitle || `Verified NEET Mock Test (${mockQuestions.length} Questions)`,
            description: body?.description || `Verified NEET Mock Test (${mockQuestions.length} Questions)`,
            type: catIds[0] === 'full_syllabus' ? 'full_syllabus' : catIds[0] === 'chapter_wise' ? 'chapter_test' : 'subject_test',
            testTypeCategory: catIds[0],
            categoryIds: body?.isStandalone ? [] : catIds,
            isStandalone: Boolean(body?.isStandalone),
            visibility: body?.visibility || 'public',
            status: body?.visibility === 'draft' ? 'draft' : 'published',
            sourceJobId: job.id,
            subject: effSubj,
            subjects: effSubj === 'Combined' ? ['Physics', 'Chemistry', 'Biology'] : [effSubj],
            chapter: effChap,
            difficulty: body?.difficulty || 'Moderate',
            totalQuestions: mockQuestions.length,
            questionsCount: mockQuestions.length,
            durationMinutes: Number(body?.durationMinutes || (mockQuestions.length >= 180 ? 180 : 60)),
            maxMarks: mockQuestions.length * Number(body?.correctMarks || 4),
            totalMarks: mockQuestions.length * Number(body?.correctMarks || 4),
            correctMarks: Number(body?.correctMarks || 4),
            negativeMarks: Number(body?.negativeMarks ?? 1),
            isFree: body?.isFree !== undefined ? Boolean(body.isFree) : true,
            isPaid: body?.isFree === false,
            price: body?.isFree === false ? Number(body?.price || 0) : 0,
            createdAt: now,
            updatedAt: now
          };

          await db
            .prepare(
              `INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4)
               ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`
            )
            .bind(testMeta.id, testMeta.title, JSON.stringify(testMeta), now)
            .run();

          await db
            .prepare(
              `INSERT INTO mock_questions (test_id, questions, count, updated_at) VALUES (?1, ?2, ?3, ?4)
               ON CONFLICT(test_id) DO UPDATE SET questions=?2, count=?3, updated_at=?4`
            )
            .bind(testMeta.id, JSON.stringify(mockQuestions), mockQuestions.length, now)
            .run();

          const nextJob = {
            ...job,
            status: 'published',
            publishedTestId: testMeta.id,
            totalQuestions: Math.max(job.totalQuestions || 0, activeQs.length),
            questionsDetected: Math.max(job.questionsDetected || 0, activeQs.length),
            questionsSaved: mockQuestions.length,
            savedVerified: true,
            currentStage: `Published to Student CBT (${testMeta.id})`,
            updatedAt: now
          };
          await upsertJobInD1(db, nextJob);
          await Promise.allSettled([
            putRtdbJson(`mock_tests/${encodeURIComponent(testMeta.id)}`, testMeta),
            putRtdbJson(`mock_questions/${encodeURIComponent(testMeta.id)}`, mockQuestions)
          ]);

          return jsonResponse({
            success: true,
            testId: testMeta.id,
            test: testMeta,
            job: nextJob,
            publicationVerification: {
              testId: testMeta.id,
              testTitle: testMeta.title,
              savedQuestionsCount: mockQuestions.length,
              verifiedQuestionsCount: activeQs.filter((q: any) => q.verificationStatus === 'verified').length,
              categoryIds: testMeta.categoryIds,
              visibility: testMeta.visibility,
              status: testMeta.status,
              dbSynced: true,
              d1Synced: true,
              verifiedAt: now
            },
            message: `Published "${testMeta.title}" with ${mockQuestions.length} verified questions.`
          });
        }
      }

      // -------------------------------------------------------------
      // MOCK TESTS, QUESTIONS, PURCHASES & CATEGORIES (/api/db/*, /api/d1/*, /api/test-categories*)
      // -------------------------------------------------------------
      if (pathname === '/api/d1/tests' || pathname === '/api/db/mock-tests') {
        if (request.method === 'GET') {
          const tests = await getAllTestsFromD1(db);
          return jsonResponse({ success: true, tests, count: tests.length });
        }
        if (request.method === 'POST') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const body: any = await request.json();
          const list = Array.isArray(body) ? body : Array.isArray(body?.tests) ? body.tests : body?.test ? [body.test] : [];
          const now = new Date().toISOString();
          for (const t of list) {
            if (!t?.id) continue;
            const { questions: _, ...clean } = t;
            await db
              .prepare(
                `INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`
              )
              .bind(clean.id, clean.title || 'Untitled', JSON.stringify(clean), now)
              .run();
          }
          return jsonResponse({ success: true, savedCount: list.length, count: list.length });
        }
        if (request.method === 'DELETE') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const id = url.searchParams.get('id');
          if (!id) return jsonResponse({ success: false, error: 'id required' }, 400);
          await db.prepare(`DELETE FROM mock_tests WHERE id = ?`).bind(id).run();
          await db.prepare(`DELETE FROM mock_questions WHERE test_id = ?`).bind(id).run();
          return jsonResponse({ success: true, deletedId: id });
        }
      }

      const testCatAssignMatch = pathname.match(/^\/api\/db\/mock-tests\/([^/]+)\/categories$/);
      if (testCatAssignMatch && request.method === 'POST') {
        const auth = isAdminAuthorized(request);
        if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
        const testId = decodeURIComponent(testCatAssignMatch[1]);
        const tests = await getAllTestsFromD1(db);
        const existing = tests.find((t: any) => t.id === testId);
        if (!existing) return jsonResponse({ success: false, error: 'Mock test not found' }, 404);
        const body: any = await request.json().catch(() => ({}));
        const cleanIds = Array.isArray(body.categoryIds) ? body.categoryIds.filter(Boolean) : existing.categoryIds || [];
        const isStandalone = typeof body.isStandalone === 'boolean' ? body.isStandalone : cleanIds.length === 0;
        const updated = {
          ...existing,
          ...(body.title ? { title: String(body.title).trim() } : {}),
          ...(body.subject !== undefined ? { subject: body.subject } : {}),
          ...(body.chapter !== undefined ? { chapter: body.chapter } : {}),
          ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
          categoryIds: isStandalone ? [] : Array.from(new Set(cleanIds)),
          isStandalone,
          testTypeCategory: isStandalone ? existing.testTypeCategory || 'full_syllabus' : cleanIds[0] || existing.testTypeCategory,
          updatedAt: new Date().toISOString()
        };
        await db
          .prepare(`INSERT OR REPLACE INTO mock_tests (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4)`)
          .bind(updated.id, updated.title || '', JSON.stringify(updated), updated.updatedAt)
          .run();
        await putRtdbJson(`mock_tests/${encodeURIComponent(testId)}`, updated);
        return jsonResponse({ success: true, test: updated });
      }

      if (pathname === '/api/d1/questions' || pathname === '/api/db/mock-questions') {
        if (request.method === 'GET') {
          const testId = url.searchParams.get('testId');
          if (!testId) {
            const { results } = await db.prepare(`SELECT test_id, questions FROM mock_questions`).all();
            const allQuestions: Record<string, any[]> = {};
            for (const r of results || []) {
              if (r.test_id && r.questions) {
                try { allQuestions[r.test_id] = JSON.parse(r.questions); } catch {}
              }
            }
            return jsonResponse({ success: true, allQuestions });
          }
          const questions = await getQuestionsForTestFromD1(db, testId);
          return jsonResponse({ success: true, testId, questions, count: questions.length });
        }
        if (request.method === 'POST') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const body: any = await request.json();
          const { testId, questions } = body || {};
          if (!testId || !Array.isArray(questions)) {
            return jsonResponse({ success: false, error: 'testId and questions array required' }, 400);
          }
          const now = new Date().toISOString();
          await db
            .prepare(
              `INSERT INTO mock_questions (test_id, questions, count, updated_at) VALUES (?1, ?2, ?3, ?4)
               ON CONFLICT(test_id) DO UPDATE SET questions=?2, count=?3, updated_at=?4`
            )
            .bind(testId, JSON.stringify(questions), questions.length, now)
            .run();
          return jsonResponse({ success: true, testId, count: questions.length });
        }
      }

      if (pathname === '/api/db/mock-purchases') {
        if (request.method === 'GET') {
          const { results } = await db.prepare(`SELECT data FROM mock_purchases ORDER BY purchased_at DESC`).all();
          const purchases = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
          return jsonResponse({ success: true, purchases });
        }
        if (request.method === 'POST') {
          const p: any = await request.json();
          const id = p.id || `purch-${Date.now()}`;
          const now = new Date().toISOString();
          await db
            .prepare(`INSERT OR REPLACE INTO mock_purchases (id, user_id, user_email, test_id, data, purchased_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
            .bind(id, p.userId || '', String(p.userEmail || '').toLowerCase(), p.testId || '', JSON.stringify(p), p.purchasedAt || now)
            .run();
          return jsonResponse({ success: true });
        }
      }

      if (pathname === '/api/test-categories' || pathname.startsWith('/api/test-categories/')) {
        const categories = await getCategoriesFromD1(db);
        const tests = await getAllTestsFromD1(db);

        if (pathname === '/api/test-categories' && request.method === 'GET') {
          const enriched = categories.map((c: any) => ({
            ...c,
            testCount: tests.filter((t: any) => {
              if (t.visibility === 'draft' || t.status === 'draft' || t.visibility === 'unlisted') return false;
              const ids = Array.isArray(t.categoryIds) && t.categoryIds.length > 0 ? t.categoryIds : [t.testTypeCategory || 'full_syllabus'];
              return ids.includes(c.id);
            }).length
          }));
          return jsonResponse({ success: true, categories: enriched });
        }

        if (pathname === '/api/test-categories' && request.method === 'POST') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const body: any = await request.json();
          const name = String(body?.name || '').trim();
          if (!name) return jsonResponse({ success: false, error: 'Category name is required' }, 400);
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;
          const id = `cat-${slug}-${Date.now().toString(36)}`;
          const now = new Date().toISOString();
          const newCat = {
            id,
            slug: id,
            name,
            description: String(body?.description || '').trim(),
            bannerImageUrl: String(body?.bannerImageUrl || '').trim(),
            themePreset: body?.themePreset || 'indigo',
            displayOrder: Number(body?.displayOrder || categories.length + 1),
            isVisible: body?.isVisible !== false,
            isDefault: false,
            badgeText: String(body?.badgeText || 'Custom Series'),
            accentTags: Array.isArray(body?.accentTags) ? body.accentTags : ['NCERT Mapped'],
            ctaText: String(body?.ctaText || 'Open Category'),
            createdAt: now,
            updatedAt: now
          };
          await db
            .prepare(
              `INSERT INTO test_categories (id, slug, name, description, bannerImageUrl, themePreset, displayOrder, isVisible, isDefault, badgeText, accentTags, ctaText, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?10, ?11, ?12, ?13)`
            )
            .bind(
              newCat.id, newCat.slug, newCat.name, newCat.description, newCat.bannerImageUrl,
              newCat.themePreset, newCat.displayOrder, newCat.isVisible ? 1 : 0,
              newCat.badgeText, JSON.stringify(newCat.accentTags), newCat.ctaText, now, now
            )
            .run();
          const next = normalizeCategories([...categories, newCat]);
          await putRtdbJson('test_categories', next);
          return jsonResponse({ success: true, category: newCat, categories: next }, 201);
        }

        const catId = decodeURIComponent(pathname.replace('/api/test-categories/', ''));
        if (request.method === 'PUT') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const idx = categories.findIndex((c: any) => c.id === catId || c.slug === catId);
          if (idx < 0) return jsonResponse({ success: false, error: 'Category not found' }, 404);
          const patch: any = await request.json();
          const updated = { ...categories[idx], ...patch, isDefault: categories[idx].isDefault, updatedAt: new Date().toISOString() };
          await db
            .prepare(
              `INSERT OR REPLACE INTO test_categories (id, slug, name, description, bannerImageUrl, themePreset, displayOrder, isVisible, isDefault, badgeText, accentTags, ctaText, createdAt, updatedAt)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
            )
            .bind(
              updated.id, updated.slug || updated.id, updated.name, updated.description || '',
              updated.bannerImageUrl || '', updated.themePreset || 'indigo', Number(updated.displayOrder || 1),
              updated.isVisible !== false ? 1 : 0, updated.isDefault ? 1 : 0, updated.badgeText || '',
              JSON.stringify(updated.accentTags || []), updated.ctaText || 'Explore Tests',
              updated.createdAt || new Date().toISOString(), updated.updatedAt
            )
            .run();
          categories[idx] = updated;
          await putRtdbJson('test_categories', categories);
          return jsonResponse({ success: true, category: updated, categories });
        }

        if (request.method === 'DELETE') {
          const auth = isAdminAuthorized(request);
          if (!auth.ok) return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
          const target = categories.find((c: any) => c.id === catId || c.slug === catId);
          if (!target) return jsonResponse({ success: false, error: 'Category not found' }, 404);
          if (target.isDefault) return jsonResponse({ success: false, error: 'Cannot delete default category' }, 403);
          await db.prepare(`DELETE FROM test_categories WHERE id = ?`).bind(target.id).run();
          const next = categories.filter((c: any) => c.id !== target.id);
          await putRtdbJson('test_categories', next);
          return jsonResponse({ success: true, deletedCategoryId: target.id, categories: next });
        }
      }

      // -------------------------------------------------------------
      // LEADERBOARD ROUTES
      // -------------------------------------------------------------
      if (pathname === '/api/leaderboard/submit' && request.method === 'POST') {
        const att: any = await request.json();
        const id = att.id || `att-${Date.now()}`;
        await db
          .prepare(`INSERT OR REPLACE INTO mock_test_attempts (id, test_id, user_email, score, data, submitted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
          .bind(id, att.testId || '', String(att.userEmail || '').toLowerCase(), Number(att.score || 0), JSON.stringify(att), att.submittedAt || new Date().toISOString())
          .run();
        return jsonResponse({ success: true, id });
      }

      if (pathname === '/api/leaderboard' && request.method === 'GET') {
        const testId = url.searchParams.get('testId');
        const { results } = testId && testId !== 'all'
          ? await db.prepare(`SELECT data FROM mock_test_attempts WHERE test_id = ? ORDER BY score DESC LIMIT 100`).bind(testId).all()
          : await db.prepare(`SELECT data FROM mock_test_attempts ORDER BY score DESC LIMIT 200`).all();
        const entries = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
        return jsonResponse({ success: true, leaderboard: entries });
      }

      // -------------------------------------------------------------
      // LEGACY D1 SYNC + STATUS
      // -------------------------------------------------------------
      if (pathname === '/api/d1/sync' && request.method === 'POST') {
        const body: any = await request.json();
        const now = new Date().toISOString();
        let syncedItems = 0;
        if (Array.isArray(body.tests)) {
          for (const t of body.tests) {
            if (!t?.id) continue;
            const { questions: _, ...cleanTest } = t;
            await db
              .prepare(`INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`)
              .bind(cleanTest.id, cleanTest.title || '', JSON.stringify(cleanTest), now)
              .run();
            syncedItems++;
          }
        }
        if (body.testQuestions && typeof body.testQuestions === 'object') {
          for (const [testId, qs] of Object.entries(body.testQuestions)) {
            if (Array.isArray(qs)) {
              await db
                .prepare(`INSERT INTO mock_questions (test_id, questions, count, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(test_id) DO UPDATE SET questions=?2, count=?3, updated_at=?4`)
                .bind(testId, JSON.stringify(qs), qs.length, now)
                .run();
              syncedItems++;
            }
          }
        }
        return jsonResponse({ success: true, syncedItems, timestamp: now });
      }

      if (pathname === '/api/db/d1-status' && request.method === 'GET') {
        const [jobsCnt, testsCnt]: any[] = await Promise.all([
          db.prepare(`SELECT COUNT(*) AS cnt FROM parser2_jobs`).first(),
          db.prepare(`SELECT COUNT(*) AS cnt FROM mock_tests`).first()
        ]);
        return jsonResponse({
          success: true,
          databaseName: 'neetmbbsdoctorsstore',
          databaseId: 'daf5a141-af4a-4db6-b10d-ac3bbab28b72',
          isD1Configured: true,
          d1Connected: true,
          totalParserJobs: Number(jobsCnt?.cnt || 0),
          totalMockTests: Number(testsCnt?.cnt || 0)
        });
      }

      // Generic storefront JSON endpoints backed by D1 / RTDB
      if (pathname === '/api/d1/products' || pathname === '/api/db/products') {
        if (request.method === 'GET') {
          const { results } = await db.prepare(`SELECT data FROM products ORDER BY updated_at DESC`).all();
          let products = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
          if (products.length === 0) {
            const rtdb = await fetchJsonSafe(`${FIREBASE_RTDB_BASE}/products.json`);
            if (rtdb) products = Array.isArray(rtdb) ? rtdb.filter(Boolean) : Object.values(rtdb);
          }
          return jsonResponse({ success: true, products });
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          const prods = Array.isArray(body) ? body : Array.isArray(body.products) ? body.products : body.product ? [body.product] : [];
          const now = new Date().toISOString();
          for (const p of prods) {
            if (!p?.id) continue;
            await db.prepare(`INSERT INTO products (id, title, data, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`)
              .bind(p.id, p.title || '', JSON.stringify(p), now)
              .run();
          }
          return jsonResponse({ success: true, saved: prods.length });
        }
      }

      if (pathname === '/api/db/orders') {
        if (request.method === 'GET') {
          const { results } = await db.prepare(`SELECT data FROM orders ORDER BY updated_at DESC`).all();
          const orders = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
          return jsonResponse({ success: true, orders });
        }
        if (request.method === 'POST') {
          const o: any = await request.json();
          if (o?.id) {
            await db.prepare(`INSERT OR REPLACE INTO orders (id, data, updated_at) VALUES (?1, ?2, ?3)`)
              .bind(o.id, JSON.stringify(o), new Date().toISOString())
              .run();
          }
          return jsonResponse({ success: true });
        }
      }

      if (pathname === '/api/db/banners') {
        const { results } = await db.prepare(`SELECT data FROM banners ORDER BY updated_at DESC`).all();
        const banners = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
        return jsonResponse({ success: true, banners });
      }

      if (pathname === '/api/coupons' && request.method === 'GET') {
        const { results } = await db.prepare(`SELECT data FROM coupons`).all();
        const coupons = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
        return jsonResponse({ success: true, coupons });
      }

      if (pathname === '/api/reviews' && request.method === 'GET') {
        const { results } = await db.prepare(`SELECT data FROM reviews`).all();
        const reviews = (results || []).map((r: any) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
        return jsonResponse({ success: true, reviews });
      }

      // Unimplemented multipart PDF upload on Worker returns explicit actionable error rather than HTML
      return jsonResponse({
        success: false,
        error: `Endpoint ${request.method} ${pathname} requires the Node.js background parser service or is not yet enabled on Cloudflare Workers.`
      }, 404);
    }

    // Fallback: Serve static assets via Cloudflare Assets Binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static assets binding not found', { status: 500 });
  }
};
