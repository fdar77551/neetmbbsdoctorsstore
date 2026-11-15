// NCERTify AI Parser 2.0 - Core TypeScript Schema & Definitions
// Independent namespace: parser2

export type Parser2Subject = 'Physics' | 'Chemistry' | 'Biology' | 'Combined';

export type Parser2OcrEngine = 'mistral' | 'gemini' | 'hybrid';

export type Parser2JobStatus = 
  | 'uploaded'
  | 'queued' 
  | 'uploading' 
  | 'extracting'
  | 'processing' 
  | 'ocr_in_progress'
  | 'question_detection'
  | 'question_extraction'
  | 'structuring'
  | 'figure_extraction'
  | 'validation'
  | 'saving'
  | 'review_required'
  | 'verifying' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'published';

export type Parser2PageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

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
  expectedQuestions: number;
  extractedQuestions: number;
  validQuestions: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  missingAnswerCount?: number;
}

export interface Parser2QualityBreakdown {
  textExtraction: number; // 0..100
  options: number;        // 0..100
  figures: number;        // 0..100
  chemistry: number;      // 0..100
  mathematics: number;    // 0..100
  answerKey: number;      // 0..100
}

export interface Parser2Job {
  id: string;
  testName: string;
  subject: Parser2Subject;
  chapter?: string;
  questionRange?: string; // e.g. "1-180" or "1-45"
  ocrEngine: Parser2OcrEngine;
  geminiModel: string; // e.g. "gemini-4-hydrogen"
  enableGeminiVerification: boolean;
  status: Parser2JobStatus;
  currentStage?: string;
  totalPages: number;
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
  qualityScore?: number;
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
  fileType: 'question_pdf' | 'solution_pdf' | 'answer_key_pdf' | 'answer_key_image';
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
  processingTimeMs?: number;
  errorMessage?: string;
  extractedQuestionNumbers?: number[];
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
  colBKey: string; // e.g. "i", "1", "Q"
  colBText: string;
}

export interface Parser2MatchTable {
  columnAHeader?: string;
  columnBHeader?: string;
  rows: Parser2MatchTableRow[];
}

export interface Parser2StructuredTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface Parser2Figure {
  id: string;
  jobId: string;
  questionId?: string;
  questionNumber?: number;
  pageNumber: number;
  figureKey: string;
  figureUrl: string;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized 0..1000 or pt
  width?: number;
  height?: number;
  figureType: 'diagram' | 'chemical_structure' | 'graph' | 'table' | 'embedded_image';
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
  pageLayout?: 'two_column_bilingual' | 'two_column_english' | 'single_column';
  chemistryContentType?: 'none' | 'simple_text' | 'complex_structures' | 'mixed';
  figureAssetIds?: string[];
  figures?: Parser2Figure[];
  figureUrl?: string; // primary figure
  originalFigureUrl?: string; // backup of initial figure crop for Restore Original
  optionFigures?: { [label: string]: string }; // option-level images e.g. chemical structures
  originalOptionFigures?: { [label: string]: string };
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

  // Real answers like "None", "None of these", "All of these", or pure numbers like "4", "3.5", "10" are authentic options
  if (
    trimmed === 'none' || 
    trimmed === 'none of these' || 
    trimmed === 'all of these' || 
    /^\d+(?:\.\d+)?(?:\s*[a-zµΩ°%]+)?$/i.test(trimmed)
  ) {
    return false;
  }

  return (
    /^(?:(?:option|विकल्प)\s*[\(\[]?[a-d1-4१-४][\)\]]?|option\s+[a-d1-4]|[\(\[][a-d1-4][\)\]])$/i.test(trimmed) ||
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
  sourceType: 'pdf_page' | 'solution_pdf' | 'text_paste' | 'image_upload' | 'manual';
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
  qualityScore: number; // 0..100
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
  geminiModel: string; // e.g. "gemini-3.8-flash"
  ocrBatchSize: number; // e.g. 5 pages per batch
  retryCount: number; // e.g. 3 retries
  pageLimit: number; // e.g. 100 pages per test
  maxFileSizeMb: number; // e.g. 50 MB
  figureDpi: number; // e.g. 150 or 200 DPI
  requireManualReviewForUncertain: boolean;
  estimatedCostPerPageCent: number; // estimated ~$0.001 per page
}
