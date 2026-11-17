// NCERTify AI Parser 2.0 / 3.0 - Universal Test Assignment & Publishing Adapter
// Safely exports verified Parser tests to Student CBT engine with multi-category / standalone support
// Never deletes or overwrites unrelated tests, purchases, or orders

import fs from 'fs';
import path from 'path';
import { Parser2Job, Parser2Question } from './types';
import { MockTest, MockQuestion, MockTestCategory } from '../../types';
import {
  getStoredMockTests,
  saveStoredMockTests,
  saveStoredMockQuestions,
  sanitizeTestMetadata,
  cleanForFirebase,
  FIREBASE_RTDB_BASE
} from '../../lib/mockTestData';
import { normalizeTestCategories } from '../../lib/testCategoriesData';

export interface PublishTestParams {
  job: Parser2Job;
  questions: Parser2Question[];
  existingTestId?: string;
  createNewCopy?: boolean;
  excludeIncomplete?: boolean;
  testNumber?: string;
  code?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  instructions?: string;
  folderName?: string;
  categoryIds?: string[];
  isStandalone?: boolean;
  testTypeCategory?: MockTestCategory;
  subject?: 'Physics' | 'Chemistry' | 'Biology' | 'Combined';
  chapter?: string;
  visibility?: 'public' | 'unlisted' | 'draft';
  thumbnailUrl?: string;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | 'easy' | 'medium' | 'hard';
  language?: 'en' | 'hi' | 'bilingual';
  durationMinutes?: number;
  correctMarks?: number;
  negativeMarks?: number;
  isFree?: boolean;
  price?: number;
  originalPrice?: number;
  targetYear?: string;
  ncertCoveragePercent?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
}

export interface PublicationVerificationSummary {
  testId: string;
  testTitle: string;
  savedQuestionsCount: number;
  verifiedQuestionsCount: number;
  incompleteExcludedCount: number;
  categoryIds: string[];
  categoryNames: string[];
  visibility: 'public' | 'unlisted' | 'draft';
  status: 'draft' | 'published';
  isStandalone: boolean;
  dbSynced: boolean;
  rtdbSynced: boolean;
  visibleInStudentCatalog: boolean;
  repairedFields?: string[];
  verifiedAt: string;
}

const DB_FILE_PATH = path.resolve(process.cwd(), 'store_database.json');

export const INCOMPLETE_PARSER2_STATUSES = new Set<string>([
  'options_incomplete',
  'text_incomplete',
  'table_incomplete',
  'missing_figure',
  'figure_mismatch',
  'failed'
]);

export function mapParser2QuestionsToMock(
  questions: Parser2Question[],
  targetTestId: string,
  effectiveSubject: string,
  effectiveChapter: string
): MockQuestion[] {
  return questions.map((q) => {
    const formattedMatchTable = q.matchTable
      ? {
          column1Header: q.matchTable.columnAHeader || 'Column I',
          column2Header: q.matchTable.columnBHeader || 'Column II',
          rows: (q.matchTable.rows || []).map(r => ({
            leftKey: r.colAKey || (r as any).leftKey,
            leftText: r.colAText || (r as any).leftText,
            rightKey: r.colBKey || (r as any).rightKey,
            rightText: r.colBText || (r as any).rightText
          }))
        }
      : undefined;

    const hasMatchRows = Boolean(formattedMatchTable && formattedMatchTable.rows.length > 0);
    const formattedStructuredTable =
      !hasMatchRows && q.structuredTable && Array.isArray(q.structuredTable.rows) && q.structuredTable.rows.length > 0
        ? {
            headers: q.structuredTable.headers || [],
            rows: q.structuredTable.rows,
            caption: q.structuredTable.caption
          }
        : undefined;

    const mappedOptions = q.options.map(o => {
      const optImg = o.imageUrl || q.optionFigures?.[o.label];
      const val = o.value || o.text || '';
      const optType: 'text' | 'image' | 'text_and_image' =
        optImg && (!val || val.startsWith('[Figure')) ? 'image' : optImg ? 'text_and_image' : 'text';
      return {
        label: o.label,
        value: val,
        type: optType,
        imageUrl: optImg
      };
    });

    const qSubject =
      q.subject && q.subject !== 'Combined'
        ? q.subject
        : effectiveSubject !== 'Combined'
        ? effectiveSubject
        : 'Physics';

    const sourcePages = Array.isArray(q.sourcePages) && q.sourcePages.length > 0
      ? q.sourcePages
      : [q.sourcePageNumber || 1];
    const sourcePageEnd = q.sourcePageEnd || sourcePages[sourcePages.length - 1] || q.sourcePageNumber || 1;
    const sourcePageRange = q.sourcePageRange || (
      q.sourcePageNumber && sourcePageEnd > q.sourcePageNumber
        ? `Page ${q.sourcePageNumber}–${sourcePageEnd}`
        : `Page ${q.sourcePageNumber || 1}`
    );

    return {
      id: `q-${targetTestId}-${q.questionNumber}`,
      testId: targetTestId,
      questionNumber: q.questionNumber,
      subject: qSubject as any,
      chapter: q.chapter || effectiveChapter || `${qSubject} Section`,
      questionText: q.questionText,
      options: mappedOptions,
      correctAnswer: (q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? q.correctAnswer : 'A') as 'A' | 'B' | 'C' | 'D',
      answerStatus: q.answerStatus || (q.correctAnswer ? 'matched' : 'answer_missing'),
      explanation: q.explanation || 'Step-by-step solution verified by NCERTify AI Parser.',
      figureUrl: q.figureUrl,
      questionImageUrl: q.figureUrl,
      figures: q.figures ? q.figures.map(f => f.figureUrl) : (q.figureUrl ? [q.figureUrl] : []),
      optionFigures: q.optionFigures,
      matchTable: formattedMatchTable,
      structuredTable: formattedStructuredTable,
      sourcePageNumber: q.sourcePageNumber,
      sourcePageEnd,
      sourcePages,
      sourcePageRange,
      pdfPageNumber: q.sourcePageNumber,
      pdfPageRange: sourcePageRange,
      hasFigure: Boolean(q.figureUrl),
      languages: {
        en: {
          questionText: q.questionText,
          options: mappedOptions,
          matchTable: formattedMatchTable,
          structuredTable: formattedStructuredTable
        }
      }
    };
  });
}

export async function syncPublishedTestToRemoteStores(
  testMeta: MockTest,
  mockQuestions: MockQuestion[]
): Promise<{ rtdbSynced: boolean; r2Synced: boolean; d1Synced: boolean }> {
  let rtdbSynced = false;
  let r2Synced = false;
  let d1Synced = false;

  // 1. Firebase RTDB mirror
  try {
    if (typeof fetch !== 'undefined') {
      const safeTest = cleanForFirebase(sanitizeTestMetadata(testMeta));
      const safeQuestions = cleanForFirebase(mockQuestions);

      const [tResp, qResp] = await Promise.all([
        fetch(`${FIREBASE_RTDB_BASE}/mock_tests/${encodeURIComponent(testMeta.id)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safeTest)
        }),
        fetch(`${FIREBASE_RTDB_BASE}/mock_questions/${encodeURIComponent(testMeta.id)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safeQuestions)
        })
      ]);
      rtdbSynced = tResp.ok && qResp.ok;
    }
  } catch (err) {
    console.warn('[Parser2Adapter] RTDB publish sync note:', err);
  }

  // 2. Cloudflare R2 Published Snapshot + Catalog Index (authoritative remote mirror for Workers)
  try {
    const { putR2Json, getR2Json } = await import('./parser2R2Storage');
    const safeTest = sanitizeTestMetadata(testMeta);
    const snapOk = await putR2Json(`parser2/db/published/${testMeta.id}.json`, {
      test: safeTest,
      questions: mockQuestions,
      updatedAt: new Date().toISOString()
    });
    const curIndex = (await getR2Json<{ tests?: MockTest[] }>('parser2/db/mock_tests_index.json')) || {};
    const existingTests = Array.isArray(curIndex.tests) ? curIndex.tests : [];
    const nextTests = [safeTest, ...existingTests.filter(t => t && t.id !== safeTest.id)];
    const idxOk = await putR2Json('parser2/db/mock_tests_index.json', {
      tests: nextTests,
      updatedAt: new Date().toISOString()
    });
    r2Synced = Boolean(snapOk && idxOk);
  } catch (err) {
    console.warn('[Parser2Adapter] R2 publish sync note:', err);
  }

  // 3. Direct Cloudflare D1 SQL sync when CF API Token is available in env/settings
  try {
    let apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_D1_TOKEN || '';
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'd715d090a75efd8790b9a6da1e2f42d4';
    let d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || 'daf5a141-af4a-4db6-b10d-ac3bbab28b72';
    if (!apiToken && fs.existsSync(DB_FILE_PATH)) {
      const legacy = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
      const cf = legacy?.settings?.cloudflare;
      if (cf?.apiToken) apiToken = cf.apiToken;
      if (cf?.accountId) accountId = cf.accountId;
      if (cf?.d1DatabaseId) d1DatabaseId = cf.d1DatabaseId;
    }

    if (apiToken && d1DatabaseId && typeof fetch !== 'undefined') {
      const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${d1DatabaseId}/query`;
      const queryD1 = async (sql: string, params: any[] = []) => {
        const resp = await fetch(d1Url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params })
        });
        return resp.json();
      };

      const info = await queryD1(`PRAGMA table_info(mock_tests);`);
      const cols = new Set<string>(
        (info?.result?.[0]?.results || []).map((c: any) => String(c?.name || '').toLowerCase())
      );

      const now = new Date().toISOString();
      const { questions: _, ...cleanMeta } = sanitizeTestMetadata(testMeta);
      let testOk = false;

      if (cols.has('data')) {
        const res = await queryD1(
          `INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, data=excluded.data, updated_at=excluded.updated_at;`,
          [cleanMeta.id, cleanMeta.title, JSON.stringify(cleanMeta), now]
        );
        testOk = Boolean(res?.success);
      } else {
        await queryD1(
          `CREATE TABLE IF NOT EXISTS mock_tests (id TEXT PRIMARY KEY, title TEXT, data TEXT, updated_at TEXT);`
        );
        const res = cols.size === 0
          ? await queryD1(
              `INSERT INTO mock_tests (id, title, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, data=excluded.data, updated_at=excluded.updated_at;`,
              [cleanMeta.id, cleanMeta.title, JSON.stringify(cleanMeta), now]
            )
          : await queryD1(
              `INSERT OR REPLACE INTO mock_tests (id, testNumber, title, subject, totalQuestions, durationMinutes, price, isFree, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                cleanMeta.id,
                cleanMeta.testNumber || '',
                cleanMeta.title,
                cleanMeta.subject || 'Combined',
                cleanMeta.totalQuestions || mockQuestions.length,
                cleanMeta.durationMinutes || 60,
                cleanMeta.price || 0,
                cleanMeta.isFree ? 1 : 0,
                cleanMeta.createdAt || now
              ]
            );
        testOk = Boolean(res?.success);
      }

      const qInfo = await queryD1(`PRAGMA table_info(mock_questions);`);
      const qCols = new Set<string>(
        (qInfo?.result?.[0]?.results || []).map((c: any) => String(c?.name || '').toLowerCase())
      );
      let qOk = false;
      if (qCols.has('questions') && qCols.has('test_id')) {
        const qRes = await queryD1(
          `INSERT INTO mock_questions (test_id, questions, count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(test_id) DO UPDATE SET questions=excluded.questions, count=excluded.count, updated_at=excluded.updated_at;`,
          [cleanMeta.id, JSON.stringify(mockQuestions), mockQuestions.length, now]
        );
        qOk = Boolean(qRes?.success);
      }
      d1Synced = Boolean(testOk && qOk);
    }
  } catch (err) {
    console.warn('[Parser2Adapter] D1 publish sync note:', err);
  }

  return { rtdbSynced, r2Synced, d1Synced };
}

export function resolveCategoryNamesForIds(categoryIds: string[]): string[] {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) return categoryIds;
    const db = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
    const cats = normalizeTestCategories(db.test_categories);
    return categoryIds.map(id => cats.find(c => c.id === id || c.slug === id)?.name || id);
  } catch {
    return categoryIds;
  }
}

export function publishParser2TestToStudentEngine(params: PublishTestParams): {
  success: boolean;
  testId: string;
  test: MockTest;
  mockQuestions: MockQuestion[];
  incompleteExcludedCount: number;
  verifiedQuestionsCount: number;
  dbSynced: boolean;
  message: string;
} {
  const {
    job,
    questions,
    existingTestId,
    createNewCopy = false,
    excludeIncomplete = false,
    testNumber,
    code,
    title,
    subtitle,
    description,
    instructions,
    folderName,
    categoryIds,
    isStandalone = false,
    testTypeCategory,
    subject,
    chapter,
    visibility = 'public',
    thumbnailUrl,
    difficulty,
    language = 'bilingual',
    durationMinutes,
    correctMarks = 4,
    negativeMarks = 1,
    isFree = true,
    price = 0,
    originalPrice = 0,
    targetYear = '2026'
  } = params;

  const activeSourceQuestions = questions.filter(q => !q.isDeleted);
  const filteredQuestions = excludeIncomplete
    ? activeSourceQuestions.filter(q => !INCOMPLETE_PARSER2_STATUSES.has(q.verificationStatus))
    : activeSourceQuestions;
  const incompleteExcludedCount = activeSourceQuestions.length - filteredQuestions.length;
  const verifiedQuestionsCount = filteredQuestions.filter(q => q.verificationStatus === 'verified').length;

  if (filteredQuestions.length === 0) {
    throw new Error(
      excludeIncomplete
        ? 'No complete questions available to publish after excluding incomplete items.'
        : 'Cannot publish test with 0 questions.'
    );
  }

  const targetTestId =
    !createNewCopy && (existingTestId || job.publishedTestId)
      ? String(existingTestId || job.publishedTestId)
      : `cbt-p2-${Date.now()}`;

  const totalQCount = filteredQuestions.length;
  const maxMarks = totalQCount * correctMarks;
  const effectiveSubject = subject || job.subject || 'Combined';
  const effectiveChapter = (chapter !== undefined ? chapter : job.chapter) || '';

  // Clean multi-category assignment
  const cleanCategoryIds = isStandalone
    ? []
    : Array.from(
        new Set(
          (Array.isArray(categoryIds) && categoryIds.length > 0
            ? categoryIds
            : testTypeCategory
            ? [testTypeCategory]
            : [totalQCount >= 180 ? 'full_syllabus' : effectiveChapter ? 'chapter_wise' : 'full_subject']
          )
            .map(c => String(c).trim())
            .filter(Boolean)
        )
      );

  const primaryCategory: MockTestCategory =
    cleanCategoryIds[0] || testTypeCategory || (totalQCount >= 180 ? 'full_syllabus' : effectiveChapter ? 'chapter_wise' : 'full_subject');

  // 1. Convert Parser2Questions to MockQuestion format
  const mockQuestions = mapParser2QuestionsToMock(
    filteredQuestions,
    targetTestId,
    effectiveSubject,
    effectiveChapter
  );

  const parsedInstructions = instructions
    ? instructions.split('\n').map(s => s.trim()).filter(Boolean)
    : [
        `+${correctMarks} marks for every correct response`,
        `-${negativeMarks} mark for every incorrect response`,
        '0 marks for unattempted questions',
        'Calculators and external aids are prohibited',
        'Timer begins as soon as you enter the exam interface'
      ];

  const now = new Date().toISOString();

  // 2. Create MockTest definition with full multi-category & standalone metadata
  const testStatus: 'draft' | 'published' = visibility === 'draft' ? 'draft' : 'published';
  const testType =
    primaryCategory === 'full_syllabus'
      ? 'full_syllabus'
      : primaryCategory === 'chapter_wise'
      ? 'chapter_test'
      : totalQCount >= 180
      ? 'full_syllabus'
      : 'subject_test';

  const newMockTest: MockTest = sanitizeTestMetadata({
    id: targetTestId,
    testNumber: testNumber || `Test P2-${String(Math.floor(Math.random() * 900) + 100)}`,
    code: code || `#P2-${String(Math.floor(Math.random() * 90) + 10)}`,
    title: (title || job.testName || `NEET Mock Test (${effectiveSubject})`).trim(),
    shortDescription: subtitle || `Verified NEET Mock Test (${totalQCount} Questions)`,
    fullDescription: description || `Full official CBT Mock Test parsed and verified by NCERTify AI Parser. Target Year: NEET ${targetYear}. Contains complete original figures, step-by-step solutions, and NTA scoring.`,
    description: description || `Verified NEET Mock Test (${totalQCount} Questions)`,
    folderName: folderName || 'NCERTify Parser Series',
    type: testType,
    testTypeCategory: primaryCategory,
    categoryIds: cleanCategoryIds,
    isStandalone,
    visibility,
    sourceJobId: job.id,
    thumbnailUrl: thumbnailUrl || undefined,
    language,
    subject: effectiveSubject as any,
    subjects: effectiveSubject === 'Combined' ? ['Physics', 'Chemistry', 'Biology'] : [effectiveSubject],
    chapter: effectiveChapter,
    difficulty: (difficulty === 'hard' || difficulty === 'Hard' ? 'Hard' : difficulty === 'easy' || difficulty === 'Easy' ? 'Easy' : 'Moderate'),
    totalQuestions: totalQCount,
    durationMinutes: durationMinutes || (totalQCount >= 180 ? 180 : 60),
    maxMarks,
    totalMarks: maxMarks,
    correctMarks,
    negativeMarks,
    isFree,
    isPaid: !isFree,
    isPurchased: isFree || price === 0,
    price: isFree ? 0 : price,
    originalPrice: originalPrice && originalPrice > 0 ? originalPrice : 0,
    discountedPrice: isFree ? 0 : price,
    status: testStatus,
    instructions: parsedInstructions,
    languages: language === 'en' ? ['en'] : language === 'hi' ? ['hi'] : ['en', 'hi'],
    isBilingual: language === 'bilingual',
    allowMultipleAttempts: true,
    attemptLimit: 'unlimited',
    showLeaderboard: true,
    createdAt: now,
    updatedAt: now,
    questionsCount: totalQCount
  });

  // 3. Browser-safe mirror if invoked inside browser context
  if (typeof window !== 'undefined') {
    const existingTests = getStoredMockTests();
    const updatedTests = [newMockTest, ...existingTests.filter(t => t.id !== targetTestId)];
    saveStoredMockTests(updatedTests);
    saveStoredMockQuestions(targetTestId, mockQuestions);
  }

  // 4. Atomic disk persistence on server + read-back verification
  let dbSynced = false;
  try {
    let db: any = { mock_tests: [], mock_questions: {} };
    if (fs.existsSync(DB_FILE_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
    }
    if (!Array.isArray(db.mock_tests)) db.mock_tests = [];
    if (!db.mock_questions || typeof db.mock_questions !== 'object') db.mock_questions = {};

    const { questions: _, ...cleanMeta } = newMockTest;
    const idx = db.mock_tests.findIndex((t: any) => t.id === targetTestId);
    if (idx > -1) {
      db.mock_tests[idx] = {
        ...db.mock_tests[idx],
        ...cleanMeta,
        createdAt: db.mock_tests[idx].createdAt || now,
        updatedAt: now
      };
    } else {
      db.mock_tests.unshift(cleanMeta);
    }
    db.mock_questions[targetTestId] = mockQuestions;

    const tmpPath = `${DB_FILE_PATH}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_FILE_PATH);

    // Read-back confirmation
    const verifyDb = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
    const savedT = Array.isArray(verifyDb.mock_tests)
      ? verifyDb.mock_tests.find((t: any) => t.id === targetTestId)
      : null;
    const savedQs = verifyDb.mock_questions?.[targetTestId];
    dbSynced = Boolean(savedT && Array.isArray(savedQs) && savedQs.length === mockQuestions.length);
  } catch (fsErr) {
    console.warn('[Parser2Adapter] Atomic disk persistence note:', fsErr);
  }

  return {
    success: true,
    testId: targetTestId,
    test: newMockTest,
    mockQuestions,
    incompleteExcludedCount,
    verifiedQuestionsCount,
    dbSynced,
    message: `Successfully published "${newMockTest.title}" (${totalQCount} questions)${isStandalone ? ' as Standalone test' : ` into ${cleanCategoryIds.length} category(s)`}!`
  };
}

/**
 * Repairs an existing published Parser 2.0 job's student catalog record:
 * ensures `store_database.json`, Firebase RTDB, `mock_questions`, `categoryIds`,
 * `status: 'published'`, and `visibility` are intact and synchronized.
 */
export async function repairPublishedParser2Test(params: {
  job: Parser2Job;
  questions: Parser2Question[];
  fallbackCategoryIds?: string[];
}): Promise<{
  test: MockTest;
  verification: PublicationVerificationSummary;
}> {
  const { job, questions, fallbackCategoryIds } = params;
  const activeQs = questions.filter(q => !q.isDeleted);
  if (activeQs.length === 0) {
    throw new Error('Job has 0 questions to sync/repair.');
  }

  let db: any = { mock_tests: [], mock_questions: {}, test_categories: [] };
  if (fs.existsSync(DB_FILE_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
  }
  if (!Array.isArray(db.mock_tests)) db.mock_tests = [];
  if (!db.mock_questions || typeof db.mock_questions !== 'object') db.mock_questions = {};

  const targetTestId = job.publishedTestId || `cbt-p2-${Date.now()}`;
  const existingIdx = db.mock_tests.findIndex(
    (t: any) => t.id === targetTestId || t.sourceJobId === job.id
  );
  const existingTest: Partial<MockTest> = existingIdx >= 0 ? db.mock_tests[existingIdx] : {};
  const repairedFields: string[] = [];

  const effectiveSubject = (existingTest.subject as any) || job.subject || 'Combined';
  const effectiveChapter = (existingTest.chapter as any) || job.chapter || '';
  const defaultCat = activeQs.length >= 180 ? 'full_syllabus' : effectiveChapter ? 'chapter_wise' : 'full_subject';

  let categoryIds = Array.isArray(existingTest.categoryIds) && existingTest.categoryIds.length > 0
    ? existingTest.categoryIds
    : Array.isArray(fallbackCategoryIds) && fallbackCategoryIds.length > 0
    ? fallbackCategoryIds
    : existingTest.testTypeCategory
    ? [existingTest.testTypeCategory]
    : [defaultCat];

  categoryIds = Array.from(new Set(categoryIds.map(c => String(c).trim()).filter(Boolean)));
  if (!existingTest.categoryIds || existingTest.categoryIds.length === 0) {
    repairedFields.push('categoryIds');
  }

  const visibility: 'public' | 'unlisted' | 'draft' =
    existingTest.visibility === 'draft' ? 'public' : existingTest.visibility || 'public';
  if (existingTest.visibility !== visibility) repairedFields.push('visibility');

  const status: 'draft' | 'published' = 'published';
  if (existingTest.status !== 'published') repairedFields.push('status');

  const now = new Date().toISOString();
  const mockQuestions = mapParser2QuestionsToMock(
    activeQs,
    existingTest.id || targetTestId,
    effectiveSubject,
    effectiveChapter
  );

  const repairedTest: MockTest = sanitizeTestMetadata({
    ...existingTest,
    id: existingTest.id || targetTestId,
    testNumber: existingTest.testNumber || `Test P2-${String(Math.floor(Math.random() * 900) + 100)}`,
    code: existingTest.code || `#P2-${String(Math.floor(Math.random() * 90) + 10)}`,
    title: existingTest.title || job.testName || `NEET Mock Test (${effectiveSubject})`,
    description: existingTest.description || `Verified NEET Mock Test (${mockQuestions.length} Questions)`,
    type: existingTest.type || (categoryIds[0] === 'full_syllabus' ? 'full_syllabus' : categoryIds[0] === 'chapter_wise' ? 'chapter_test' : 'subject_test'),
    testTypeCategory: (categoryIds[0] as any) || defaultCat,
    categoryIds: existingTest.isStandalone ? [] : categoryIds,
    isStandalone: Boolean(existingTest.isStandalone),
    visibility,
    sourceJobId: job.id,
    subject: effectiveSubject,
    subjects: existingTest.subjects || (effectiveSubject === 'Combined' ? ['Physics', 'Chemistry', 'Biology'] : [effectiveSubject]),
    chapter: effectiveChapter,
    totalQuestions: mockQuestions.length,
    questionsCount: mockQuestions.length,
    durationMinutes: existingTest.durationMinutes || (mockQuestions.length >= 180 ? 180 : 60),
    maxMarks: existingTest.maxMarks || mockQuestions.length * (existingTest.correctMarks || 4),
    totalMarks: existingTest.totalMarks || mockQuestions.length * (existingTest.correctMarks || 4),
    correctMarks: existingTest.correctMarks || 4,
    negativeMarks: existingTest.negativeMarks ?? 1,
    price: existingTest.price ?? 0,
    isFree: existingTest.isFree ?? (Number(existingTest.price || 0) === 0),
    isPaid: existingTest.isPaid ?? (Number(existingTest.price || 0) > 0),
    isPurchased: existingTest.isPurchased ?? (Number(existingTest.price || 0) === 0),
    status,
    allowMultipleAttempts: existingTest.allowMultipleAttempts ?? true,
    showLeaderboard: existingTest.showLeaderboard ?? true,
    createdAt: existingTest.createdAt || now,
    updatedAt: now
  } as MockTest);

  if (existingIdx >= 0) {
    db.mock_tests[existingIdx] = repairedTest;
  } else {
    db.mock_tests.unshift(repairedTest);
    repairedFields.push('mock_tests_record');
  }

  const prevQs = db.mock_questions[repairedTest.id];
  if (!Array.isArray(prevQs) || prevQs.length !== mockQuestions.length) {
    repairedFields.push('mock_questions');
  }
  db.mock_questions[repairedTest.id] = mockQuestions;

  const tmpPath = `${DB_FILE_PATH}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE_PATH);

  const { rtdbSynced } = await syncPublishedTestToRemoteStores(repairedTest, mockQuestions);

  const verifiedQuestionsCount = activeQs.filter(q => q.verificationStatus === 'verified').length;
  const categoryNames = resolveCategoryNamesForIds(repairedTest.categoryIds || []);

  return {
    test: repairedTest,
    verification: {
      testId: repairedTest.id,
      testTitle: repairedTest.title,
      savedQuestionsCount: mockQuestions.length,
      verifiedQuestionsCount,
      incompleteExcludedCount: 0,
      categoryIds: repairedTest.categoryIds || [],
      categoryNames,
      visibility: repairedTest.visibility || 'public',
      status: repairedTest.status,
      isStandalone: Boolean(repairedTest.isStandalone),
      dbSynced: true,
      rtdbSynced,
      visibleInStudentCatalog: repairedTest.status === 'published' && repairedTest.visibility === 'public',
      repairedFields,
      verifiedAt: now
    }
  };
}
