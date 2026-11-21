// NCERTify AI Parser 2.0 - Core TypeScript Schema & Definitions
// Independent namespace: parser2

export type Parser2Subject = 'Physics' | 'Chemistry' | 'Biology' | 'Combined';

export type Parser2OcrEngine = 'mistral' | 'gemini' | 'hybrid' | 'local_text' | 'manual_import';

export type Parser2JobStatus = 
  | 'uploaded'
  | 'queued' 
  | 'starting'
  | 'uploading' 
  | 'extracting'
  | 'processing' 
  | 'ocr_in_progress'
  | 'ocr_completed'
  | 'question_detection'
  | 'question_extraction'
  | 'structuring'
  | 'figure_extraction'
  | 'validation'
  | 'validating'
  | 'saving'
  | 'retry_waiting'
  | 'stalled'
  | 'dead_letter'
  | 'review_required'
  | 'verifying' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'published';

export type Parser2PageStatus =
  | 'pending'
  | 'starting'
  | 'processing'
  | 'ocr_in_progress'
  | 'ocr_completed'
  | 'extracting'
  | 'extracted'
  | 'validating'
  | 'validated'
  | 'saving'
  | 'saved'
  | 'page_completed'
  | 'completed'
  | 'retry_waiting'
  | 'retry_required'
  | 'stalled'
  | 'failed'
  | 'dead_letter'
  | 'skipped';

export function isPageCompletedStatus(status: Parser2PageStatus | string | undefined): boolean {
  return status === 'completed' || status === 'saved' || status === 'page_completed';
}

export type Parser2QuestionType = 
  | 'single_mcq' 
  | 'multiple_statement' 
  | 'assertion_reason' 
  | 'match_the_column' 
  | 'diagram_based' 
  | 'table_based' 
  | 'numerical';

export type Parser2VerificationStatus = 
  | 'verified' 
  | 'needs_review' 
  | 'missing_figure'
  | 'options_incomplete'
  | 'text_incomplete'
  | 'table_incomplete'
  | 'symbol_review'
  | 'figure_mismatch'
  | 'failed' 
  | 'answer_mismatch';

export interface Parser2ComponentScore {
  status: 'ok' | 'warning' | 'missing' | 'incomplete' | 'not_applicable' | 'review_needed';
  score: number; // 0..100
  reason?: string;
}

export interface Parser2ComponentValidation {
  questionText: Parser2ComponentScore;
  options: Parser2ComponentScore;
  tables: Parser2ComponentScore;
  equations: Parser2ComponentScore;
  diagrams: Parser2ComponentScore;
}

export interface Parser2ReconciliationSummary {
  expectedQuestions: number | null;
  expectedQuestionsSource?: 'auto_detected' | 'manual';
  detectedQuestionNumbers?: number[];
  extractedQuestions: number;
  validatedQuestions?: number;
  savedQuestions?: number;
  validQuestions: number;
  rejectedQuestions?: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  missingQuestions?: number | null;
  missingQuestionNumbers?: number[];
  missingAnswerCount?: number;
  figuresExtracted?: number;
  answerKeyCoverage?: number | null;
}

export interface Parser2QualityBreakdown {
  textExtraction: number | null; // 0..100 or null (N/A)
  options: number | null;        // 0..100 or null (N/A)
  figures: number | null;        // 0..100 or null (N/A)
  chemistry: number | null;      // 0..100 or null (N/A)
  mathematics: number | null;    // 0..100 or null (N/A)
  answerKey: number | null;      // 0..100 or null (N/A)
}

export interface Parser2RateLimitStatus {
  active: boolean;
  provider?: string;
  retryAttempt?: number;
  maxRetries?: number;
  nextRetryAt?: string;
  message?: string;
}

export interface Parser2Job {
  id: string;
  testName: string;
  subject: Parser2Subject;
  chapter?: string;
  questionRange?: string; // optional manual range e.g. "1-180" or "1-45"; empty = auto-detect
  expectedQuestionsManual?: number | null;
  importSource?: 'pdf' | 'markdown' | 'txt' | 'docx' | 'json' | 'paste';
  ocrEngine: Parser2OcrEngine;
  geminiModel: string; // e.g. "gemini-4-hydrogen"
  mistralModel?: string; // e.g. "mistral-ocr-latest"
  allowProviderFallback?: boolean;
  fallbackProvider?: Parser2OcrEngine | 'none';
  autoScanAnswerKey?: boolean;
  enableGeminiVerification: boolean;
  status: Parser2JobStatus;
  currentStage?: string;
  failedStage?: string;
  rateLimitStatus?: Parser2RateLimitStatus | null;
  lockOwnerId?: string | null;
  lockAcquiredAt?: string | null;
  lockExpiresAt?: string | null;
  stalledAt?: string | null;
  stallReason?: string | null;
  totalPages: number;
  pagesAttempted?: number;
  ocrCompletedPages?: number;
  extractedPages?: number;
  completedPages: number;
  failedPages: number;
  totalQuestions: number;
  questionsDetected?: number;
  questionsSaved?: number;
  savedVerified?: boolean;
  verifiedQuestions: number;
  reviewRequiredCount: number;
  figureCount: number;
  estimatedCostUsd: number;
  retryCount?: number;
  manuallyEditedCount?: number;
  hasAnswerKey?: boolean;
  qualityScore?: number | null;
  reconciliation?: Parser2ReconciliationSummary;
  qualityBreakdown?: Parser2QualityBreakdown;
  publishedTestId?: string;
  errorMessage?: string;
  originalPdfFileName?: string;
  sourceQuestionPdfName?: string;
  sourceSolutionPdfName?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Parser2SourceFile {
  id: string;
  jobId: string;
  fileType: 'question_pdf' | 'solution_pdf' | 'answer_key_pdf' | 'answer_key_image' | 'manual_import';
  fileName: string;
  fileSize: number;
  storageKey: string;
  mimeType: string;
  pageCount: number;
  uploadedAt: string;
}

export interface Parser2Page {
  id: string;
  jobId: string;
  pageNumber: number;
  status: Parser2PageStatus;
  pageLayout?: 'two_column_bilingual' | 'two_column_english' | 'single_column';
  ocrRawText?: string;
  ocrMarkdown?: string;
  pageImageKey?: string;
  pageImageUrl?: string;
  pageWidth?: number;
  pageHeight?: number;
  requestStartedAt?: string;
  responseTimeMs?: number;
  processingTimeMs?: number;
  ocrStatus?: 'pending' | 'running' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  extractionStatus?: 'pending' | 'running' | 'in_progress' | 'completed' | 'skipped' | 'retry_waiting' | 'stalled' | 'failed';
  errorMessage?: string;
  lastApiSummary?: string;
  extractedQuestionNumbers?: number[];
  questionsDetectedCount?: number;
  questionsExtractedCount?: number;
  questionsSavedCount?: number;
  figuresDetectedCount?: number;
  figuresSavedCount?: number;
  questionsReviewCount?: number;
  providerUsed?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  retryAttempts?: number;
  deadLettered?: boolean;
  isAnswerKeyPage?: boolean;
  isCoverPage?: boolean;
  heartbeatAt?: string;
  checkpointAt?: string;
  updatedAt: string;
}

export interface Parser2Option {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  value: string;
  imageUrl?: string;
  isVisualOption?: boolean;
  isCorrect?: boolean;
}

export interface Parser2MatchTableRow {
  colAKey: string; // e.g. "A", "P"
  colAText: string;
  colAValue?: string;
  colAImageUrl?: string;
  colBKey: string; // e.g. "i", "1", "Q"
  colBText: string;
  colBValue?: string;
  colBImageUrl?: string;
}

export interface Parser2MatchTable {
  columnAHeader?: string;
  columnBHeader?: string;
  colATitle?: string;
  colBTitle?: string;
  leftTableImageUrl?: string;
  rightTableImageUrl?: string;
  showBorders?: boolean;
  rows: Parser2MatchTableRow[];
}

export interface Parser2TableCellMeta {
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
  imageUrl?: string;
  align?: 'left' | 'center' | 'right';
}

export interface Parser2StructuredTable {
  headers: string[];
  rows: string[][];
  caption?: string;
  showBorders?: boolean;
  alignment?: 'left' | 'center' | 'right';
  cellMeta?: Record<string, Parser2TableCellMeta>; // keyed as `${rowIdx}:${colIdx}`
}

export type Parser2ImagePlacement =
  | 'before_question'
  | 'between_paragraphs'
  | 'after_question'
  | 'option_A'
  | 'option_B'
  | 'option_C'
  | 'option_D'
  | 'match_left_table'
  | 'match_right_table'
  | 'table_cell'
  | 'assertion_reason'
  | 'explanation'
  | 'answer_key_explanation';

export interface Parser2ImageAttachment {
  id: string;
  url: string;
  storageKey?: string;
  placement: Parser2ImagePlacement;
  paragraphIndex?: number; // used when placement === 'between_paragraphs'
  tableRow?: number;       // used when placement === 'table_cell'
  tableCol?: number;       // used when placement === 'table_cell'
  caption?: string;
  alt?: string;
  altText?: string;
  alignment?: 'left' | 'center' | 'right';
  widthPercent?: number;   // 25..100
  width?: number;
  height?: number;
  rotation?: number;       // 0 | 90 | 180 | 270
  pageNumber?: number;
  sourcePageNumber?: number;
  boundingBox?: [number, number, number, number];
  sourceType: 'upload' | 'pdf_crop' | 'clipboard' | 'media_library' | 'library';
  mimeType?: string;
  createdAt?: string;
}

export type Parser2CropType =
  | 'complete_question'
  | 'question_continuation'
  | 'option_A'
  | 'option_B'
  | 'option_C'
  | 'option_D'
  | 'combined_options'
  | 'diagram'
  | 'graph'
  | 'circuit'
  | 'table'
  | 'match_the_column'
  | 'chemical_structure'
  | 'math_expression'
  | 'explanation'
  | 'other';

export interface Parser2Figure {
  id: string;
  jobId: string;
  questionId?: string;
  questionNumber?: number;
  pageNumber: number;
  sourcePdfId?: string;
  figureKey: string;
  figureUrl: string;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized 0..1000
  pixelBox?: { x: number; y: number; width: number; height: number };
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  figureType: Parser2CropType | 'embedded_image';
  cropType?: Parser2CropType;
  placement?: Parser2ImagePlacement;
  caption?: string;
  isManualCrop?: boolean;
  createdAt: string;
}

export interface Parser2Question {
  id: string;
  jobId: string;
  testId?: string;
  questionNumber: number;
  subject: Parser2Subject;
  chapter?: string;
  questionType: Parser2QuestionType;
  questionText: string;
  options: Parser2Option[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  answerStatus?: 'matched' | 'answer_missing' | 'manual' | 'inferred';
  explanation?: string;
  explanationImageUrl?: string;
  sourcePdfId?: string;
  sourcePageNumber: number;
  sourcePageEnd?: number;
  sourcePages?: number[];
  sourcePageRange?: string;
  detectedAnswer?: 'A' | 'B' | 'C' | 'D';
  importedAnswer?: 'A' | 'B' | 'C' | 'D';
  answerSetCode?: string;
  answerSourcePage?: number;
  answerConfidence?: number;
  answerKeyStatus?: 'matched' | 'missing' | 'conflict' | 'needs_review' | 'verified';
  pageLayout?: 'two_column_bilingual' | 'two_column_english' | 'single_column';
  chemistryContentType?: 'none' | 'simple_text' | 'complex_structures' | 'mixed';
  figureAssetIds?: string[];
  figures?: Parser2Figure[];
  figureUrl?: string; // primary figure
  originalFigureUrl?: string; // backup of initial figure crop for Restore Original
  optionFigures?: { [label: string]: string }; // option-level images e.g. chemical structures
  originalOptionFigures?: { [label: string]: string };
  imageAttachments?: Parser2ImageAttachment[]; // rich 14-slot image attachment array
  matchTable?: Parser2MatchTable;
  structuredTable?: Parser2StructuredTable;
  originalExtractedSnapshot?: {
    questionText: string;
    options: Parser2Option[];
    matchTable?: Parser2MatchTable;
    structuredTable?: Parser2StructuredTable;
    figureUrl?: string;
    capturedAt: string;
  };
  extractionEngine: Parser2OcrEngine;
  providerUsed?: string;
  modelUsed?: string;
  verificationStatus: Parser2VerificationStatus;
  confidenceScore: number; // 0..100
  componentValidation?: Parser2ComponentValidation;
  reviewRequired: boolean;
  reviewNotes?: string;
  adminOverride?: boolean;
  adminOverrideAt?: string;
  adminOverrideNotes?: string;
  isManuallyEdited?: boolean;
  manuallyEditedAt?: string;
  editedFields?: string[];
  isDeleted?: boolean;
  rawOcrSnapshot?: string;
  aiCorrectionsSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export function isPlaceholderOption(val: string | undefined | null): boolean {
  if (!val) return true;
  const trimmed = val.trim().toLowerCase();
  if (trimmed.length === 0) return true;

  // Real NEET/JEE MCQ choices like "None", "None of these", "All of these",
  // "Nothing can be said due to insufficient data", "Insufficient data", "Cannot be determined",
  // or pure numbers like "4", "3.5", "10" are authentic answer options — NEVER placeholders.
  if (
    trimmed === 'none' ||
    trimmed === 'none of these' ||
    trimmed === 'none of the above' ||
    trimmed === 'all of these' ||
    trimmed === 'all of the above' ||
    trimmed === 'data insufficient' ||
    trimmed === 'insufficient data' ||
    trimmed === 'cannot be determined' ||
    trimmed === 'can not be determined' ||
    /^nothing\s+can\s+be\s+said/i.test(trimmed) ||
    /^\d+(?:\.\d+)?(?:\s*[a-zµΩ°%]+)?$/i.test(trimmed)
  ) {
    return false;
  }

  return (
    /^(?:(?:option|विकल्प)\s*[\(\[]?[a-d1-4१-४][\)\]]?|option\s+[a-d1-4]|[\(\[][a-d1-4][\)\]])$/i.test(trimmed) ||
    /insufficient\s+data\s+in\s+(?:the\s+)?(?:snippet|image|crop|page|ocr)/i.test(trimmed) ||
    /not\s+(?:visible|provided|available|readable|shown)\s+in\s+(?:the\s+)?(?:snippet|image|crop|page)/i.test(trimmed) ||
    /cannot\s+be\s+(?:read|extracted)\s+(?:from|in)\s+(?:the\s+)?(?:snippet|image|crop|page)/i.test(trimmed) ||
    /^\[?\s*(?:illegible|unclear|unreadable|missing\s+option(?:\s+text)?|data\s+missing|not\s+available|n\/a)\s*\]?$/i.test(trimmed) ||
    trimmed === '[missing option text]' ||
    trimmed === 'missing option' ||
    trimmed === '(empty - click edit to add)' ||
    trimmed === '[empty]' ||
    trimmed === 'empty' ||
    trimmed === 'tbd' ||
    trimmed === '...' ||
    trimmed === '-'
  );
}

export interface Parser2AnswerKeyEntry {
  questionNumber: number;
  rawAnswer: string;
  verifiedAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  setCode?: string;
  sourcePage?: number;
  confidence?: number;
  sourceType: 'pdf_page' | 'solution_pdf' | 'answer_key_pdf' | 'text_paste' | 'image_upload' | 'manual';
  matchedAt: string;
}

export interface Parser2ValidationCheck {
  id: string;
  code: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  passed: boolean;
  message: string;
  affectedQuestionNumbers?: number[];
  details?: string;
}

export interface Parser2ValidationReport {
  id: string;
  jobId: string;
  qualityScore: number | null; // 0..100 or null (N/A when 0 questions extracted)
  totalChecks: number;
  passedChecks: number;
  criticalErrorsCount: number;
  warningsCount: number;
  canPublish: boolean;
  checks: Parser2ValidationCheck[];
  reconciliation?: Parser2ReconciliationSummary;
  qualityBreakdown?: Parser2QualityBreakdown;
  summary: string;
  createdAt: string;
}

export interface Parser2ProcessingLog {
  id: string;
  jobId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  stage: 'upload' | 'ocr' | 'gemini_verification' | 'figure_extraction' | 'validation' | 'publishing';
  message: string;
  details?: any;
  timestamp: string;
}

export interface Parser2Settings {
  mistralOcrEnabled: boolean;
  geminiVerificationEnabled: boolean;
  defaultProvider?: Parser2OcrEngine;
  geminiModel: string; // e.g. "gemini-4-hydrogen"
  mistralModel?: string; // e.g. "mistral-ocr-latest"
  allowProviderFallback?: boolean;
  fallbackProvider?: Parser2OcrEngine | 'none';
  autoScanAnswerKey?: boolean;
  geminiMaxConcurrency?: number;
  geminiCooldownMs?: number;
  mistralMaxConcurrency?: number;
  mistralCooldownMs?: number;
  maxApiRetries?: number;
  ocrBatchSize: number; // e.g. 5 pages per batch
  retryCount: number; // e.g. 3 retries
  pageLimit: number; // e.g. 100 pages per test
  maxFileSizeMb: number; // e.g. 50 MB
  figureDpi: number; // e.g. 150 or 200 DPI
  requireManualReviewForUncertain: boolean;
  estimatedCostPerPageCent: number; // estimated ~$0.001 per page
}
