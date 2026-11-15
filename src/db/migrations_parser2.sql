-- ============================================================================
-- NCERTify AI Parser 2.0 - Cloudflare D1 Migration Script
-- Independent namespace: parser2_*
-- ============================================================================

-- 1. Jobs Table
CREATE TABLE IF NOT EXISTS parser2_jobs (
  id TEXT PRIMARY KEY,
  test_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT,
  question_range TEXT,
  ocr_engine TEXT NOT NULL DEFAULT 'mistral',
  gemini_model TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
  enable_gemini_verification INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  current_stage TEXT,
  total_pages INTEGER NOT NULL DEFAULT 0,
  completed_pages INTEGER NOT NULL DEFAULT 0,
  failed_pages INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  verified_questions INTEGER NOT NULL DEFAULT 0,
  review_required_count INTEGER NOT NULL DEFAULT 0,
  figure_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  manually_edited_count INTEGER NOT NULL DEFAULT 0,
  has_answer_key INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  reconciliation_json TEXT,
  quality_breakdown_json TEXT,
  published_test_id TEXT,
  error_message TEXT,
  original_pdf_file_name TEXT,
  source_question_pdf_name TEXT,
  source_solution_pdf_name TEXT,
  last_activity_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parser2_jobs_status ON parser2_jobs(status);
CREATE INDEX IF NOT EXISTS idx_parser2_jobs_created ON parser2_jobs(created_at DESC);

-- 2. Source Files Table
CREATE TABLE IF NOT EXISTS parser2_source_files (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parser2_files_job ON parser2_source_files(job_id);

-- 3. Pages Table
CREATE TABLE IF NOT EXISTS parser2_pages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ocr_raw_text TEXT,
  ocr_markdown TEXT,
  page_image_key TEXT,
  page_width INTEGER,
  page_height INTEGER,
  processing_time_ms INTEGER,
  error_message TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_parser2_pages_job_page ON parser2_pages(job_id, page_number);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS parser2_questions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  test_id TEXT,
  question_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT,
  question_type TEXT NOT NULL DEFAULT 'single_mcq',
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT,
  explanation TEXT,
  explanation_image_url TEXT,
  source_pdf_id TEXT,
  source_page_number INTEGER NOT NULL,
  figure_asset_ids TEXT, -- JSON array of figure IDs
  figure_url TEXT,
  match_table_json TEXT, -- JSON structure for match tables
  extraction_engine TEXT NOT NULL DEFAULT 'mistral',
  verification_status TEXT NOT NULL DEFAULT 'verified',
  confidence_score INTEGER NOT NULL DEFAULT 100,
  review_required INTEGER NOT NULL DEFAULT 0,
  review_notes TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  raw_ocr_snapshot TEXT,
  ai_corrections_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_parser2_questions_job ON parser2_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_parser2_questions_status ON parser2_questions(verification_status);

-- 5. Options Table (for image options & extended metadata)
CREATE TABLE IF NOT EXISTS parser2_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  value TEXT NOT NULL,
  image_url TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES parser2_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parser2_options_q ON parser2_options(question_id);

-- 6. Figures Table
CREATE TABLE IF NOT EXISTS parser2_figures (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  question_id TEXT,
  question_number INTEGER,
  page_number INTEGER NOT NULL,
  figure_key TEXT NOT NULL,
  figure_url TEXT NOT NULL,
  bounding_box TEXT, -- JSON [ymin, xmin, ymax, xmax]
  width INTEGER,
  height INTEGER,
  figure_type TEXT NOT NULL DEFAULT 'diagram',
  caption TEXT,
  is_manual_crop INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parser2_figures_job ON parser2_figures(job_id);
CREATE INDEX IF NOT EXISTS idx_parser2_figures_q ON parser2_figures(question_id);

-- 7. Answer Keys Table
CREATE TABLE IF NOT EXISTS parser2_answer_keys (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  raw_answer TEXT NOT NULL,
  verified_answer TEXT NOT NULL,
  explanation TEXT,
  source_type TEXT NOT NULL DEFAULT 'pdf_page',
  matched_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_parser2_answer_keys_job ON parser2_answer_keys(job_id);

-- 8. Validation Reports Table
CREATE TABLE IF NOT EXISTS parser2_validation_reports (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 100,
  total_checks INTEGER NOT NULL DEFAULT 0,
  passed_checks INTEGER NOT NULL DEFAULT 0,
  critical_errors_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  can_publish INTEGER NOT NULL DEFAULT 0,
  report_json TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parser2_reports_job ON parser2_validation_reports(job_id);

-- 9. Processing Logs Table
CREATE TABLE IF NOT EXISTS parser2_processing_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  level TEXT NOT NULL,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parser2_logs_job ON parser2_processing_logs(job_id, timestamp DESC);

-- 10. Published Tests Registry Table
CREATE TABLE IF NOT EXISTS parser2_tests (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 180,
  max_marks INTEGER NOT NULL DEFAULT 720,
  status TEXT NOT NULL DEFAULT 'draft',
  published_test_id TEXT,
  published_at TEXT,
  FOREIGN KEY (job_id) REFERENCES parser2_jobs(id) ON DELETE CASCADE
);
