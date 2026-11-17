import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Settings2,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Sparkles,
  Search,
  Filter,
  Crop,
  Terminal,
  Activity,
  ShieldCheck,
  Image as ImageIcon,
  ExternalLink,
  Columns,
  ZoomIn,
  ZoomOut,
  Key,
  Clock,
  RefreshCw,
  Upload,
  X,
  Table as TableIcon
} from 'lucide-react';
import {
  Parser2Job,
  Parser2JobStatus,
  Parser2Page,
  Parser2Question,
  Parser2Figure,
  Parser2ValidationReport,
  Parser2ProcessingLog,
  isPlaceholderOption
} from '../../services/parser2/types';
import { syncAllMockTestsFromSources, hasSuspiciousMathNotation } from '../../lib/mockTestData';
import { getAdminRequestHeaders } from '../../lib/firebase';
import { Parser2JobCreator } from './Parser2JobCreator';
import { Parser2QuestionCard } from './Parser2QuestionCard';
import { Parser2QuestionEditModal } from './Parser2QuestionEditModal';
import { Parser2CropModal } from './Parser2CropModal';
import { Parser2ValidationModal } from './Parser2ValidationModal';
import { Parser2SettingsModal } from './Parser2SettingsModal';
import { Parser2PublishModal } from './Parser2PublishModal';
import { Parser2AnswerKeyModal } from './Parser2AnswerKeyModal';

const ACTIVE_STATUS_SET = new Set<Parser2JobStatus>([
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
  'saving',
  'verifying'
]);

const isJobActiveStatus = (status?: Parser2JobStatus) => Boolean(status && ACTIVE_STATUS_SET.has(status));

const JOBS_PER_PAGE = 6;

export const Parser2Dashboard: React.FC = () => {
  // State
  const [jobs, setJobs] = useState<Parser2Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Parser2Job | null>(null);
  const [jobHistoryFilter, setJobHistoryFilter] = useState<'all' | 'queued' | 'active' | 'completed' | 'published' | 'failed'>('all');
  const [jobsPage, setJobsPage] = useState<number>(1);

  const [pages, setPages] = useState<Parser2Page[]>([]);
  const [questions, setQuestions] = useState<Parser2Question[]>([]);
  const [figures, setFigures] = useState<Parser2Figure[]>([]);
  const [logs, setLogs] = useState<Parser2ProcessingLog[]>([]);
  const [validationReport, setValidationReport] = useState<Parser2ValidationReport | null>(null);

  const [activeTab, setActiveTab] = useState<'questions' | 'figures' | 'comparison' | 'validation' | 'logs'>('questions');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'verified' | 'needs_review' | 'missing_options' | 'missing_table' | 'missing_figure' | 'symbol_review' | 'missing_answer' | 'has_figure' | 'has_table' | 'low_confidence'>('all');
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [isRepairingPublication, setIsRepairingPublication] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComparisonPage, setSelectedComparisonPage] = useState<number>(4);
  const [comparisonZoom, setComparisonZoom] = useState<number>(1);

  // Modals
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isAnswerKeyModalOpen, setIsAnswerKeyModalOpen] = useState(false);

  const [editingQuestion, setEditingQuestion] = useState<Parser2Question | null>(null);
  const [copyFromPageMode, setCopyFromPageMode] = useState(false);
  const [recroppingQuestion, setRecroppingQuestion] = useState<Parser2Question | null>(null);
  const [recropTargetOption, setRecropTargetOption] = useState<'A' | 'B' | 'C' | 'D' | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch all jobs (always sorted newest-first from backend)
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/parser2/jobs', {
        headers: getAdminRequestHeaders()
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        const msg = !ct.includes('application/json')
          ? `Parser API returned non-JSON response (${res.status}). Check Worker /api/parser2/* routing and D1 bindings.`
          : `Failed to fetch parsing jobs (HTTP ${res.status}).`;
        setApiError(msg);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setApiError(null);
        setJobs(data.jobs);
        setSelectedJobId(prev => {
          if (prev && data.jobs.some((j: Parser2Job) => j.id === prev)) return prev;
          return data.jobs.length > 0 ? data.jobs[0].id : null;
        });
      } else {
        setApiError(data.error || 'Parser API returned unsuccessful response.');
      }
    } catch (e: any) {
      const msg = `Cannot reach Parser backend: ${e?.message || 'Network error'}`;
      setApiError(msg);
      console.warn('Error fetching Parser2 jobs:', e);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Poll job list quickly whenever any job is active, otherwise every 15s (stable boolean dep)
  const hasActiveJob = jobs.some(j => isJobActiveStatus(j.status));
  useEffect(() => {
    const timer = setInterval(fetchJobs, hasActiveJob ? 3500 : 15000);
    return () => clearInterval(timer);
  }, [hasActiveJob]);

  // 2. Fetch active job details
  const fetchJobDetails = async (jobId: string) => {
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}`);
      const data = await res.json();
      if (data.success && data.job) {
        setSelectedJob(data.job);
        setPages(data.pages || []);
        setLogs(data.logs || []);
        if (data.validationReport) setValidationReport(data.validationReport);
        else setValidationReport(null);
      }
    } catch (e) {
      console.warn('Error fetching job details:', e);
    }
  };

  // 3. Fetch questions & figures for selected job
  const fetchJobQuestionsAndFigures = async (jobId: string) => {
    try {
      const [qRes, figRes] = await Promise.all([
        fetch(`/api/parser2/jobs/${jobId}/questions`),
        fetch(`/api/parser2/jobs/${jobId}/figures`)
      ]);
      const qData = await qRes.json();
      const figData = await figRes.json();

      if (qData.success && Array.isArray(qData.questions)) {
        setQuestions(qData.questions);
      }
      if (figData.success && Array.isArray(figData.figures)) {
        setFigures(figData.figures);
      }
    } catch (e) {
      console.warn('Error fetching questions/figures:', e);
    }
  };

  useEffect(() => {
    if (!selectedJobId) return;

    fetchJobDetails(selectedJobId);
    fetchJobQuestionsAndFigures(selectedJobId);

    const active = isJobActiveStatus(selectedJob?.status);
    if (!active) return;

    const interval = setInterval(() => {
      fetchJobDetails(selectedJobId);
      fetchJobQuestionsAndFigures(selectedJobId);
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedJobId, selectedJob?.status]);

  // Scroll logs to bottom on update
  useEffect(() => {
    if (activeTab === 'logs' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, activeTab]);

  // Pipeline Actions
  const handleStartResume = async (targetJobId?: string) => {
    const id = targetJobId || selectedJobId;
    if (!id) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${id}/start`, {
        method: 'POST',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Background extraction started / resumed.');
        fetchJobs();
        fetchJobDetails(id);
      } else {
        triggerToast('Start failed: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (e: any) {
      triggerToast('Error starting pipeline: ' + e.message);
    }
  };

  const handlePause = async (targetJobId?: string) => {
    const id = targetJobId || selectedJobId;
    if (!id) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${id}/pause`, {
        method: 'POST',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Pipeline paused safely at checkpoint.');
        fetchJobs();
        fetchJobDetails(id);
      }
    } catch (e: any) {
      triggerToast('Error pausing pipeline: ' + e.message);
    }
  };

  const handleRetryFailed = async (targetJobId?: string) => {
    const id = targetJobId || selectedJobId;
    if (!id) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${id}/retry-failed`, {
        method: 'POST',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Retrying failed pages with exponential backoff...');
        fetchJobs();
        fetchJobDetails(id);
      }
    } catch (e: any) {
      triggerToast('Error retrying pages: ' + e.message);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}`, {
        method: 'DELETE',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Job deleted.');
        setDeleteConfirmJobId(null);
        const remaining = jobs.filter(j => j.id !== jobId);
        setJobs(remaining);
        if (selectedJobId === jobId) {
          setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
          if (remaining.length === 0) setSelectedJob(null);
        }
      } else {
        triggerToast('Delete failed: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (e: any) {
      triggerToast('Error deleting job: ' + e.message);
    }
  };


  const handleApproveQuestion = async (qId: string) => {
    if (!selectedJobId) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${selectedJobId}/questions/${qId}`, {
        method: 'PUT',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ verificationStatus: 'verified', reviewRequired: false, reviewNotes: '' })
      });
      const data = await res.json();
      if (data.success && data.question) {
        setQuestions(prev => prev.map(q => (q.id === qId ? data.question : q)));
        triggerToast('Question marked as verified!');
        fetchJobDetails(selectedJobId);
      } else {
        triggerToast(data.error || 'Cannot verify incomplete question.');
      }
    } catch (e: any) {
      triggerToast('Error approving question: ' + e.message);
    }
  };

  const handleAutoRecrop = async (qId: string, targetOption?: 'A' | 'B' | 'C' | 'D') => {
    if (!selectedJobId) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${selectedJobId}/questions/${qId}/auto-recrop`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ targetOption })
      });
      const data = await res.json();
      if (data.success && data.question) {
        setQuestions(prev => prev.map(q => (q.id === qId ? data.question : q)));
        triggerToast(data.message || 'AI auto-locate completed.');
        fetchJobQuestionsAndFigures(selectedJobId);
        fetchJobDetails(selectedJobId);
      } else {
        triggerToast('AI auto-locate notice: ' + (data.error || 'Could not isolate figure cleanly.'));
      }
    } catch (e: any) {
      triggerToast('AI auto-locate error: ' + e.message);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedJobId) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${selectedJobId}/questions/${qId}`, {
        method: 'PUT',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ isDeleted: true })
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(prev => prev.filter(q => q.id !== qId));
        triggerToast('Question deleted.');
        fetchJobDetails(selectedJobId);
      }
    } catch (e: any) {
      triggerToast('Error deleting question: ' + e.message);
    }
  };

  const handleRemoveFigure = async (qId: string) => {
    if (!selectedJobId) return;
    try {
      const res = await fetch(`/api/parser2/jobs/${selectedJobId}/questions/${qId}`, {
        method: 'PUT',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          figureUrl: null,
          figures: [],
          figureAssetIds: [],
          reviewNotes: 'Figure removed by reviewer.'
        })
      });
      const data = await res.json();
      if (data.success && data.question) {
        setQuestions(prev => prev.map(q => (q.id === qId ? data.question : q)));
        triggerToast(`Figure removed from Question ${data.question.questionNumber}.`);
        fetchJobDetails(selectedJobId);
      }
    } catch (e: any) {
      triggerToast('Error removing figure: ' + e.message);
    }
  };

  const handleBulkVerifyEligible = async () => {
    if (!selectedJobId) return;
    setIsBulkVerifying(true);
    try {
      const res = await fetch(`/api/parser2/jobs/${selectedJobId}/questions/bulk-verify`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(data.message || `Verified ${data.verifiedCount} questions.`);
        await fetchJobQuestionsAndFigures(selectedJobId);
        await fetchJobDetails(selectedJobId);
      } else {
        triggerToast(`Bulk verify failed: ${data.error}`);
      }
    } catch (e: any) {
      triggerToast(`Bulk verify error: ${e.message}`);
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const handleRepairPublication = async (jobId: string) => {
    if (!jobId || isRepairingPublication) return;
    setIsRepairingPublication(true);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/repair-publication`, {
        method: 'POST',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await syncAllMockTestsFromSources().catch(() => []);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('neetmbbs_mock_tests_updated', { detail: { fromServer: true } }));
          window.dispatchEvent(new Event('neetmbbs_test_categories_updated'));
        }
        triggerToast(data.message || `Publication synced (${data.testId})`);
        fetchJobs();
        fetchJobDetails(jobId);
      } else {
        triggerToast(`Publication sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      triggerToast(`Publication sync error: ${e.message}`);
    } finally {
      setIsRepairingPublication(false);
    }
  };

  const getConfidencePct = (q: Parser2Question) =>
    q.confidenceScore == null ? 100 : q.confidenceScore <= 1 ? q.confidenceScore * 100 : q.confidenceScore;

  const hasMissingOptsFn = (q: Parser2Question) =>
    !q.options ||
    q.options.length < 4 ||
    q.options.some(o => {
      const hasImg = Boolean(o.imageUrl || q.optionFigures?.[o.label]);
      if (hasImg) return false;
      const val = (o.value || o.text || '').trim();
      return !val || isPlaceholderOption(val) || /^\[Figure\s+[A-D]\]$/i.test(val);
    });

  const hasMatchTableFn = (q: Parser2Question) =>
    Boolean(
      (q.matchTable && q.matchTable.rows && q.matchTable.rows.length > 0) ||
        (q.structuredTable && q.structuredTable.rows && q.structuredTable.rows.length > 0) ||
        (q.questionText && (q.questionText.includes('Column I') || q.questionText.includes('List-I') || q.questionText.includes('Match the')))
    );

  const hasSymbolReviewFn = (q: Parser2Question) => {
    if (q.adminOverride && q.verificationStatus === 'verified') return false;
    if (q.verificationStatus === 'symbol_review') return true;
    return (
      hasSuspiciousMathNotation(q.questionText).suspect ||
      (q.options || []).some(o => hasSuspiciousMathNotation(o.value || o.text || '').suspect)
    );
  };

  // Filter counts (Admin Override counts cleanly as verified)
  const verifiedCount = questions.filter(
    q => q.verificationStatus === 'verified' && !q.reviewRequired && (q.adminOverride || (!hasMissingOptsFn(q) && !hasSymbolReviewFn(q)))
  ).length;
  const needsReviewCount = questions.filter(
    q =>
      !(q.adminOverride && q.verificationStatus === 'verified') &&
      (q.reviewRequired ||
        q.verificationStatus === 'needs_review' ||
        q.verificationStatus === 'missing_figure' ||
        q.verificationStatus === 'options_incomplete' ||
        q.verificationStatus === 'table_incomplete' ||
        q.verificationStatus === 'text_incomplete' ||
        q.verificationStatus === 'symbol_review' ||
        q.verificationStatus === 'figure_mismatch' ||
        hasMissingOptsFn(q) ||
        hasSymbolReviewFn(q) ||
        getConfidencePct(q) < 80)
  ).length;
  const missingOptionsCount = questions.filter(q => !(q.adminOverride && q.verificationStatus === 'verified') && (hasMissingOptsFn(q) || q.verificationStatus === 'options_incomplete')).length;
  const missingTableCount = questions.filter(q => !(q.adminOverride && q.verificationStatus === 'verified') && q.verificationStatus === 'table_incomplete').length;
  const missingFigureCount = questions.filter(q => !(q.adminOverride && q.verificationStatus === 'verified') && (q.verificationStatus === 'missing_figure' || q.verificationStatus === 'figure_mismatch')).length;
  const symbolReviewCount = questions.filter(hasSymbolReviewFn).length;
  const missingAnswerCount = questions.filter(q => !q.correctAnswer || q.answerStatus === 'answer_missing').length;
  const figuresCount = questions.filter(q => Boolean(q.figureUrl || (q.optionFigures && Object.keys(q.optionFigures).length > 0) || (q.figures && q.figures.length > 0))).length;
  const tablesCount = questions.filter(hasMatchTableFn).length;
  const lowConfidenceCount = questions.filter(q => getConfidencePct(q) < 80).length;

  const filteredQuestions = questions.filter(q => {
    const isOverriddenVerified = Boolean(q.adminOverride && q.verificationStatus === 'verified');
    const hasMissingOption = !isOverriddenVerified && (hasMissingOptsFn(q) || q.verificationStatus === 'options_incomplete');
    const hasMissingTable = !isOverriddenVerified && q.verificationStatus === 'table_incomplete';
    const hasMissingFig = !isOverriddenVerified && (q.verificationStatus === 'missing_figure' || q.verificationStatus === 'figure_mismatch');
    const hasSymReview = hasSymbolReviewFn(q);
    const hasMissingAns = !q.correctAnswer || q.answerStatus === 'answer_missing';
    const hasFig = Boolean(q.figureUrl || (q.optionFigures && Object.keys(q.optionFigures).length > 0) || (q.figures && q.figures.length > 0));
    const hasTable = hasMatchTableFn(q);
    const isLowConfidence = getConfidencePct(q) < 80;

    if (questionFilter === 'verified' && (q.verificationStatus !== 'verified' || q.reviewRequired || (!isOverriddenVerified && (hasMissingOption || hasMissingTable || hasSymReview)))) return false;
    if (
      questionFilter === 'needs_review' &&
      (isOverriddenVerified ||
        (!q.reviewRequired &&
          q.verificationStatus !== 'needs_review' &&
          !hasMissingOption &&
          !hasMissingTable &&
          !hasMissingFig &&
          !hasSymReview &&
          q.verificationStatus !== 'text_incomplete' &&
          !isLowConfidence))
    ) return false;
    if (questionFilter === 'missing_options' && !hasMissingOption) return false;
    if (questionFilter === 'missing_table' && !hasMissingTable) return false;
    if (questionFilter === 'missing_figure' && !hasMissingFig) return false;
    if (questionFilter === 'symbol_review' && !hasSymReview) return false;
    if (questionFilter === 'missing_answer' && !hasMissingAns) return false;
    if (questionFilter === 'has_figure' && !hasFig) return false;
    if (questionFilter === 'has_table' && !hasTable) return false;
    if (questionFilter === 'low_confidence' && !isLowConfidence) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.questionText.toLowerCase().includes(query);
      const matchNum = String(q.questionNumber).includes(query);
      const matchOpts = q.options?.some(o => (o.value || o.text || '').toLowerCase().includes(query));
      if (!matchText && !matchNum && !matchOpts) return false;
    }

    return true;
  });

  // Job history filtering & pagination
  const filteredJobs = jobs.filter(j => {
    if (jobHistoryFilter === 'queued') return j.status === 'queued' || j.status === 'uploaded';
    if (jobHistoryFilter === 'active') return (isJobActiveStatus(j.status) && j.status !== 'queued' && j.status !== 'uploaded') || j.status === 'paused';
    if (jobHistoryFilter === 'completed') return j.status === 'completed' || j.status === 'review_required';
    if (jobHistoryFilter === 'published') return j.status === 'published' || Boolean(j.publishedTestId);
    if (jobHistoryFilter === 'failed') return j.status === 'failed';
    return true;
  });

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const safeJobsPage = Math.min(jobsPage, totalJobPages);
  const paginatedJobs = filteredJobs.slice((safeJobsPage - 1) * JOBS_PER_PAGE, safeJobsPage * JOBS_PER_PAGE);

  const reconciliation = validationReport?.reconciliation || selectedJob?.reconciliation;
  const qualityBreakdown = validationReport?.qualityBreakdown || selectedJob?.qualityBreakdown;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in-50 duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Hero Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black shadow-lg shadow-blue-500/20 text-white shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] tracking-tight">
                  NCERTify AI Parser 3.0
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Durable Queue + Multimodal Vision
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Server-side background PDF extraction · Checkpoint recovery · Explicit review-before-publish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchJobs}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Refresh Job Queue"
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Settings2 className="w-4 h-4 text-blue-400" />
              <span className="whitespace-nowrap">Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreatorOpen(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">New Parsing Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backend API Sync Error Banner (no silent failures) */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate sm:whitespace-normal">{apiError}</span>
          </div>
          <button
            type="button"
            onClick={fetchJobs}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* PERSISTENT JOB HISTORY & BACKGROUND QUEUE PANEL (NEWEST FIRST) */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
              Persistent Parsing Job History ({jobs.length})
            </h2>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'all', label: `All (${jobs.length})` },
                { id: 'queued', label: `Queued (${jobs.filter(j => j.status === 'queued' || j.status === 'uploaded').length})` },
                { id: 'active', label: `Active (${jobs.filter(j => (isJobActiveStatus(j.status) && j.status !== 'queued' && j.status !== 'uploaded') || j.status === 'paused').length})` },
                { id: 'completed', label: `Completed / Review (${jobs.filter(j => j.status === 'completed' || j.status === 'review_required').length})` },
                { id: 'published', label: `Published (${jobs.filter(j => j.status === 'published' || Boolean(j.publishedTestId)).length})` },
                { id: 'failed', label: `Failed (${jobs.filter(j => j.status === 'failed').length})` }
              ] as const
            ).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setJobHistoryFilter(f.id);
                  setJobsPage(1);
                }}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                  jobHistoryFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            {apiError
              ? 'Unable to load parsing job history due to API error above.'
              : jobs.length === 0
              ? 'No parsing jobs recorded yet. Click "New Parsing Job" to start background extraction.'
              : 'No jobs match the selected status filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {paginatedJobs.map(j => {
                const isSelected = j.id === selectedJobId;
                const active = isJobActiveStatus(j.status);
                const pct = j.totalPages > 0 ? Math.round((j.completedPages / j.totalPages) * 100) : 0;
                const savedCount =
                  (typeof j.questionsSaved === 'number' && j.questionsSaved > 0)
                    ? j.questionsSaved
                    : (typeof j.totalQuestions === 'number' && j.totalQuestions > 0)
                    ? j.totalQuestions
                    : 0;
                const needsSyncRepair = Boolean(j.publishedTestId) && (savedCount === 0 || j.savedVerified === false);

                return (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJobId(j.id)}
                    className={`p-2.5 sm:p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-600 ring-1 ring-blue-600 shadow-xs'
                        : 'bg-slate-50/40 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 line-clamp-1">
                          {j.testName}
                        </span>
                        <span
                          className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                            active
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : j.status === 'published'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : j.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : j.status === 'review_required'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : j.status === 'failed'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {j.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-[10.5px] text-slate-500 truncate">
                        PDF: {j.originalPdfFileName || j.sourceQuestionPdfName || 'questions.pdf'} · {j.subject}
                      </div>

                      {j.currentStage && (
                        <div className="text-[10px] font-semibold text-blue-700 truncate">
                          {j.currentStage}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 tabular-nums">
                        <span>
                          Pg {j.completedPages}/{j.totalPages || '?'} · Saved {savedCount}{j.questionsDetected && j.questionsDetected > savedCount ? `/${j.questionsDetected}` : ''} Qs
                          {j.savedVerified && savedCount > 0 ? ' ✓' : ''}
                        </span>
                        <span>
                          {typeof j.qualityScore === 'number' ? `Q: ${j.qualityScore}%` : `${pct}%`}
                        </span>
                      </div>

                      {j.totalPages > 0 && (
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              j.status === 'failed' ? 'bg-rose-500' : active ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span className="truncate">{new Date(j.createdAt).toLocaleString()}</span>
                        {needsSyncRepair ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRepairPublication(j.id);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[10px] cursor-pointer shrink-0"
                          >
                            Repair Sync
                          </button>
                        ) : j.publishedTestId ? (
                          <span className="font-bold text-purple-700 shrink-0">Published</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalJobPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold">
                  Showing {(safeJobsPage - 1) * JOBS_PER_PAGE + 1}–{Math.min(safeJobsPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeJobsPage <= 1}
                    onClick={() => setJobsPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-bold text-slate-700 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="font-bold text-slate-700 px-1.5">
                    {safeJobsPage} / {totalJobPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeJobsPage >= totalJobPages}
                    onClick={() => setJobsPage(p => Math.min(totalJobPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-bold text-slate-700 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Job Workspace */}
      {selectedJob ? (
        <div className="space-y-4">
          {/* Active Job Stats & Control Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                    {selectedJob.testName}
                  </h2>
                  <span
                    className={`text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      selectedJob.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isJobActiveStatus(selectedJob.status)
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : selectedJob.status === 'review_required'
                        ? 'bg-orange-50 text-orange-800 border-orange-300'
                        : selectedJob.status === 'published'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : selectedJob.status === 'failed'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {selectedJob.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Subject: <span className="font-bold text-slate-800">{selectedJob.subject}</span> · Engine:{' '}
                  <span className="font-bold text-slate-800">{selectedJob.ocrEngine.toUpperCase()}</span> · Model:{' '}
                  <span className="font-mono text-slate-700">{selectedJob.geminiModel}</span>
                  {selectedJob.currentStage ? ` · Stage: ${selectedJob.currentStage}` : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isJobActiveStatus(selectedJob.status) ? (
                  <button
                    type="button"
                    onClick={() => handlePause()}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartResume()}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />{' '}
                    {selectedJob.status === 'completed' || selectedJob.status === 'published' || selectedJob.status === 'review_required'
                      ? 'Re-run Pipeline'
                      : 'Resume Pipeline'}
                  </button>
                )}

                {selectedJob.failedPages > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRetryFailed()}
                    className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry {selectedJob.failedPages} Failed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsAnswerKeyModalOpen(true)}
                  className="min-h-[40px] px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" /> Manage Answer Key
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  disabled={questions.length === 0}
                  className="min-h-[40px] px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />{' '}
                  {selectedJob.publishedTestId ? 'Update Published Test' : 'Publish to CBT'}
                </button>

                {selectedJob.publishedTestId && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRepairPublication(selectedJob.id)}
                      disabled={isRepairingPublication}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      title="Verify and repair publication sync to D1, Store DB, and Firebase RTDB"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRepairingPublication ? 'animate-spin' : ''}`} />
                      {isRepairingPublication ? 'Syncing...' : 'Sync / Repair'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('neetmbbs_navigate_mock_tests'));
                        }
                      }}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Published
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteConfirmJobId(selectedJob.id)}
                  className="min-h-[40px] min-w-[40px] p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center justify-center"
                  title="Delete Job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedJob.errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Pipeline notice: {selectedJob.errorMessage}</span>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs tabular-nums">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Pages</span>
                <span className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  {selectedJob.completedPages} / {selectedJob.totalPages || '?'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Questions</span>
                <span className="text-base font-black text-blue-600 font-['Outfit',sans-serif]">
                  {questions.length}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Figures Extracted</span>
                <span className="text-base font-black text-indigo-600 font-['Outfit',sans-serif]">
                  {figures.length}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Needs Review</span>
                <span className="text-base font-black text-amber-600 font-['Outfit',sans-serif]">
                  {needsReviewCount}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Quality Score</span>
                <span
                  className={`text-base font-black font-['Outfit',sans-serif] ${
                    (validationReport?.qualityScore ?? selectedJob.qualityScore ?? 0) >= 85
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {validationReport?.qualityScore ?? selectedJob.qualityScore ?? 0}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Est. Cost</span>
                <span className="text-base font-black text-slate-800 font-['Outfit',sans-serif]">
                  ${Number(selectedJob.estimatedCostUsd || 0).toFixed(4)}
                </span>
              </div>
            </div>

            {/* Stage 4 Extraction Reconciliation + Honest 6-Dimension Quality Breakdown */}
            {(reconciliation || qualityBreakdown) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                {reconciliation && (
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Stage 4 Extraction Reconciliation
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs tabular-nums">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">Expected</div>
                        <div className="font-black text-slate-900">{reconciliation.expectedQuestions}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">Extracted</div>
                        <div className="font-black text-blue-700">{reconciliation.extractedQuestions}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">Valid</div>
                        <div className="font-black text-emerald-700">{reconciliation.validQuestions}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">Review</div>
                        <div className="font-black text-amber-700">{reconciliation.reviewRequiredCount}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">Dupes</div>
                        <div className="font-black text-rose-700">{reconciliation.duplicateCount}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">No Key</div>
                        <div className="font-black text-orange-700">{reconciliation.missingAnswerCount}</div>
                      </div>
                    </div>
                  </div>
                )}

                {qualityBreakdown && (
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Honest Quality Breakdown (6 Dimensions)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-bold tabular-nums">
                      {(
                        [
                          ['Text', qualityBreakdown.textExtraction],
                          ['Options', qualityBreakdown.options],
                          ['Figures', qualityBreakdown.figures],
                          ['Chemistry', qualityBreakdown.chemistry],
                          ['Math', qualityBreakdown.mathematics],
                          ['Answer Key', qualityBreakdown.answerKey]
                        ] as const
                      ).map(([label, score]) => (
                        <div key={label} className="bg-white p-2 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">{label}</span>
                            <span className={score >= 85 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-rose-700'}>
                              {score}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${score >= 85 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Progress Bar & Page Matrix */}
            {selectedJob.totalPages > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 tabular-nums">
                  <span>Page-by-Page Ingestion Progress</span>
                  <span>{Math.round((selectedJob.completedPages / selectedJob.totalPages) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${(selectedJob.completedPages / selectedJob.totalPages) * 100}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-1.5">
                  {pages.map(p => {
                    const isDone = p.status === 'completed';
                    const isFail = p.status === 'failed';
                    const isProc = p.status === 'processing';

                    return (
                      <span
                        key={p.pageNumber}
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded transition ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isFail
                            ? 'bg-rose-100 text-rose-800'
                            : isProc
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                        title={`Page ${p.pageNumber}: ${p.status}`}
                      >
                        {p.pageNumber}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation (Scrollable single-row on mobile) */}
          <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2.5 min-h-[42px] text-xs font-bold transition border-b-2 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Questions ({questions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('figures')}
              className={`px-4 py-2.5 min-h-[42px] text-xs font-bold transition border-b-2 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'figures' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Figures ({figures.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2.5 min-h-[42px] text-xs font-bold transition border-b-2 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'comparison' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span>Source Split-View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('validation')}
              className={`px-4 py-2.5 min-h-[42px] text-xs font-bold transition border-b-2 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'validation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit &amp; Quality</span>
              {validationReport && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    validationReport.canPublish ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {validationReport.qualityScore}%
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2.5 min-h-[42px] text-xs font-bold transition border-b-2 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Logs ({logs.length})</span>
            </button>
          </div>

          {/* TAB 1: QUESTIONS REVIEW & EDITOR */}
          {activeTab === 'questions' && (
            <div className="space-y-3">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search question text, equations, or number..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      questionFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('verified')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Verified ({verifiedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('needs_review')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'needs_review' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Needs Review ({needsReviewCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('missing_options')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'missing_options' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-3 h-3" />
                    Missing Options ({missingOptionsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('missing_table')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'missing_table' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <TableIcon className="w-3 h-3" />
                    Missing Table ({missingTableCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('missing_answer')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'missing_answer' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    Missing Answer ({missingAnswerCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('missing_figure')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'missing_figure' ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Missing Fig ({missingFigureCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('symbol_review')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'symbol_review' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Symbol Review ({symbolReviewCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('has_figure')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'has_figure' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Diagrams ({figuresCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('has_table')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'has_table' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    Tables ({tablesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilter('low_confidence')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      questionFilter === 'low_confidence' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    Low Conf ({lowConfidenceCount})
                  </button>
                  <div className="ml-auto pl-2 border-l border-slate-200 flex items-center">
                    <button
                      type="button"
                      onClick={handleBulkVerifyEligible}
                      disabled={isBulkVerifying || questions.length === 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-1 cursor-pointer font-bold shadow-xs text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isBulkVerifying ? 'Verifying...' : 'Bulk Verify Eligible'}
                    </button>
                  </div>
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No questions found matching filter</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    If the job is currently processing, extracted questions will stream here live.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map(q => (
                    <Parser2QuestionCard
                      key={q.id}
                      question={q}
                      onEdit={question => {
                        setCopyFromPageMode(false);
                        setEditingQuestion(question);
                      }}
                      onCopyFromPage={question => {
                        setCopyFromPageMode(true);
                        setEditingQuestion(question);
                      }}
                      onRecrop={(question, targetOption) => {
                        setRecropTargetOption(targetOption);
                        setRecroppingQuestion(question);
                      }}
                      onAutoRecrop={handleAutoRecrop}
                      onDelete={qId => handleDeleteQuestion(qId)}
                      onMarkVerified={qId => handleApproveQuestion(qId)}
                      onRemoveFigure={qId => handleRemoveFigure(qId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRACTED FIGURES GALLERY */}
          {activeTab === 'figures' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                  Extracted Original Scientific Figures ({figures.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Original vector and bitmap diagrams cropped cleanly from source PDF pages
                </p>
              </div>

              {figures.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No diagrams extracted yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {figures.map(fig => (
                    <div key={fig.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Q{fig.questionNumber || '?'}</span>
                        <span className="text-[10px] text-slate-400">Page {fig.pageNumber}</span>
                      </div>
                      <img
                        src={fig.figureUrl}
                        alt={`Figure for Q${fig.questionNumber}`}
                        className="h-32 w-full object-contain bg-white rounded-lg p-1.5 border border-slate-200"
                      />
                      <div className="text-[10px] font-medium text-slate-500 truncate">
                        {fig.figureType} · {fig.width}x{fig.height}px
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOURCE COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">Select Page:</span>
                {Array.from({ length: selectedJob.totalPages || 45 }, (_, idx) => idx + 1).map(pNum => {
                  const qCount = questions.filter(
                    q => q.sourcePageNumber === pNum || (Array.isArray(q.sourcePages) && q.sourcePages.includes(pNum))
                  ).length;
                  const isSelected = selectedComparisonPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setSelectedComparisonPage(pNum)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>Page {pNum}</span>
                      {qCount > 0 && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {qCount}Q
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Source Document</h4>
                      <div className="text-sm font-bold text-slate-900">Original PDF Page {selectedComparisonPage}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setComparisonZoom(prev => Math.max(0.7, prev - 0.2))}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold px-1">{Math.round(comparisonZoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setComparisonZoom(prev => Math.min(2.0, prev + 0.2))}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto max-h-[700px] bg-slate-100/60 rounded-xl p-2 border border-slate-200 flex items-center justify-center">
                    <img
                      src={`/api/parser2/jobs/${selectedJob.id}/pages/${selectedComparisonPage}/image`}
                      alt={`Original PDF Page ${selectedComparisonPage}`}
                      className="max-w-full h-auto object-contain shadow-md rounded transition-transform duration-100"
                      style={{ transform: `scale(${comparisonZoom})`, transformOrigin: 'top center' }}
                    />
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>High-Resolution Vector PDF Render</span>
                    {questions.filter(
                      q => q.sourcePageNumber === selectedComparisonPage || (Array.isArray(q.sourcePages) && q.sourcePages.includes(selectedComparisonPage))
                    ).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstQ = questions.find(
                            q => q.sourcePageNumber === selectedComparisonPage || (Array.isArray(q.sourcePages) && q.sourcePages.includes(selectedComparisonPage))
                          );
                          if (firstQ) setRecroppingQuestion(firstQ);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" /> Open Precision Cropper
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Extracted Data</h4>
                    <div className="text-sm font-bold text-slate-900">
                      Questions on Page {selectedComparisonPage} (
                      {questions.filter(
                        q => q.sourcePageNumber === selectedComparisonPage || (Array.isArray(q.sourcePages) && q.sourcePages.includes(selectedComparisonPage))
                      ).length})
                    </div>
                  </div>

                  {questions.filter(
                    q => q.sourcePageNumber === selectedComparisonPage || (Array.isArray(q.sourcePages) && q.sourcePages.includes(selectedComparisonPage))
                  ).length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No questions mapped to Page {selectedComparisonPage}.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                      {questions
                        .filter(
                          q => q.sourcePageNumber === selectedComparisonPage || (Array.isArray(q.sourcePages) && q.sourcePages.includes(selectedComparisonPage))
                        )
                        .map(q => (
                          <Parser2QuestionCard
                            key={q.id}
                            question={q}
                            onEdit={question => {
                              setCopyFromPageMode(false);
                              setEditingQuestion(question);
                            }}
                            onCopyFromPage={question => {
                              setCopyFromPageMode(true);
                              setEditingQuestion(question);
                            }}
                            onRecrop={(question, targetOption) => {
                              setRecropTargetOption(targetOption);
                              setRecroppingQuestion(question);
                            }}
                            onAutoRecrop={handleAutoRecrop}
                            onDelete={qId => handleDeleteQuestion(qId)}
                            onMarkVerified={qId => handleApproveQuestion(qId)}
                            onRemoveFigure={qId => handleRemoveFigure(qId)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUALITY & VALIDATION AUDIT */}
          {activeTab === 'validation' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    Examination Quality &amp; Reconciliation Audit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Checks sequence continuity, complete options, STEM symbols, diagrams, and authentic answer keys
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsValidationModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Modal
                </button>
              </div>

              {validationReport ? (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-2xl font-black text-emerald-600 font-['Outfit',sans-serif] tabular-nums">
                        {validationReport.qualityScore}% Quality Score
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{validationReport.summary}</p>
                    </div>
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-xl ${
                        validationReport.canPublish ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {validationReport.canPublish ? 'Ready to Publish' : 'Action Required'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {validationReport.checks.map(c => (
                      <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs">
                        {c.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-slate-900">{c.title}: </span>
                          <span className="text-slate-600 font-medium">{c.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Validation report will be generated as questions are processed.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROCESSING LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-300 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1">
              <div className="text-slate-500 font-bold border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
                <span>[NCERTify AI Parser 3.0 Execution Console]</span>
                <span>{logs.length} events logged</span>
              </div>
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={`shrink-0 font-bold uppercase text-[10px] px-1 rounded ${
                      log.level === 'error'
                        ? 'bg-rose-950 text-rose-400'
                        : log.level === 'warn'
                        ? 'bg-amber-950 text-amber-400'
                        : log.level === 'success'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-blue-950 text-blue-400'
                    }`}
                  >
                    {log.stage}
                  </span>
                  <span className={log.level === 'error' ? 'text-rose-300' : log.level === 'warn' ? 'text-amber-300' : 'text-slate-200'}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-black">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
            Welcome to NCERTify AI Parser 3.0
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload question PDFs and answer keys to run persistent background extraction with exact diagram cropping and audit checks.
          </p>
          <button
            type="button"
            onClick={() => setIsCreatorOpen(true)}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Ingestion Job
          </button>
        </div>
      )}

      {/* Answer Key Engine Modal */}
      {isAnswerKeyModalOpen && selectedJob && (
        <Parser2AnswerKeyModal
          job={selectedJob}
          questions={questions}
          onClose={() => setIsAnswerKeyModalOpen(false)}
          onDataUpdated={payload => {
            if (Array.isArray(payload.questions)) setQuestions(payload.questions);
            if (payload.job) setSelectedJob(payload.job);
            if (payload.validationReport) setValidationReport(payload.validationReport);
            if (payload.message) triggerToast(payload.message);
            fetchJobs();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmJobId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
              Confirm Delete Job?
            </h4>
            <p className="text-xs text-slate-600">
              Delete this parsing job and its intermediate assets? Already published tests in the student catalog remain intact.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmJobId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJob(deleteConfirmJobId)}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreatorOpen && (
        <Parser2JobCreator
          onClose={() => setIsCreatorOpen(false)}
          onJobCreated={newJob => {
            setJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)]);
            setSelectedJob(newJob);
            setSelectedJobId(newJob.id);
            setQuestions([]);
            setFigures([]);
            setPages([]);
            setLogs([]);
            setValidationReport(null);
            triggerToast(`Job "${newJob.testName}" started in background!`);
          }}
        />
      )}

      {isSettingsOpen && (
        <Parser2SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => triggerToast('Settings saved.')}
        />
      )}

      {isValidationModalOpen && validationReport && (
        <Parser2ValidationModal
          report={validationReport}
          onClose={() => setIsValidationModalOpen(false)}
          onSelectQuestion={num => {
            setActiveTab('questions');
            setSearchQuery(String(num));
          }}
        />
      )}

      {isPublishModalOpen && selectedJob && (
        <Parser2PublishModal
          job={selectedJob}
          questions={questions}
          validationReport={validationReport}
          onClose={() => setIsPublishModalOpen(false)}
          onReviewIncomplete={() => {
            setActiveTab('questions');
            setQuestionFilter('needs_review');
          }}
          onSuccess={testId => {
            triggerToast(`Published to Student CBT engine (Test ID: ${testId})!`);
            fetchJobs();
            fetchJobDetails(selectedJob.id);
          }}
        />
      )}

      {editingQuestion && selectedJob && (
        <Parser2QuestionEditModal
          jobId={selectedJob.id}
          question={editingQuestion}
          totalPages={selectedJob.totalPages || 100}
          initialShowSourceViewer={copyFromPageMode}
          onClose={() => {
            setEditingQuestion(null);
            setCopyFromPageMode(false);
          }}
          onQuestionSync={syncedQ => {
            setQuestions(prev => prev.map(q => (q.id === syncedQ.id ? syncedQ : q)));
            setEditingQuestion(syncedQ);
            fetchJobQuestionsAndFigures(selectedJob.id);
            fetchJobDetails(selectedJob.id);
          }}
          onOpenCropModal={(q, targetOption) => {
            setRecropTargetOption(targetOption);
            setRecroppingQuestion(q);
          }}
          onSave={updatedQ => {
            setQuestions(prev => prev.map(q => (q.id === updatedQ.id ? updatedQ : q)));
            setEditingQuestion(null);
            setCopyFromPageMode(false);
            triggerToast(`Saved edits for Question ${updatedQ.questionNumber} (marked Manually Edited).`);
            fetchJobDetails(selectedJob.id);
          }}
        />
      )}

      {recroppingQuestion && selectedJob && (
        <Parser2CropModal
          jobId={selectedJob.id}
          question={recroppingQuestion}
          totalPages={selectedJob.totalPages}
          targetOption={recropTargetOption}
          onClose={() => {
            setRecroppingQuestion(null);
            setRecropTargetOption(undefined);
          }}
          onQuestionUpdated={updatedQ => {
            setQuestions(prev => prev.map(q => (q.id === updatedQ.id ? updatedQ : q)));
            setRecroppingQuestion(updatedQ);
            if (editingQuestion && editingQuestion.id === updatedQ.id) {
              setEditingQuestion(updatedQ);
            }
            fetchJobQuestionsAndFigures(selectedJob.id);
            fetchJobDetails(selectedJob.id);
          }}
          onSuccess={(newFigUrl, updatedQuestion) => {
            setQuestions(prev =>
              prev.map(q => {
                if (q.id !== recroppingQuestion.id) return q;
                if (updatedQuestion) return updatedQuestion;
                if (recropTargetOption) {
                  return {
                    ...q,
                    optionFigures: { ...(q.optionFigures || {}), [recropTargetOption]: newFigUrl },
                    options: q.options.map(o =>
                      o.label === recropTargetOption ? { ...o, imageUrl: newFigUrl, isVisualOption: true } : o
                    )
                  };
                }
                return { ...q, figureUrl: newFigUrl };
              })
            );
            if (editingQuestion && editingQuestion.id === recroppingQuestion.id && updatedQuestion) {
              setEditingQuestion(updatedQuestion);
            }
            const labelInfo = recropTargetOption ? `Option ${recropTargetOption} of ` : '';
            triggerToast(`Figure cropped & attached to ${labelInfo}Question ${recroppingQuestion.questionNumber}!`);
            setRecroppingQuestion(null);
            setRecropTargetOption(undefined);
            fetchJobQuestionsAndFigures(selectedJob.id);
            fetchJobDetails(selectedJob.id);
          }}
        />
      )}
    </div>
  );
};
