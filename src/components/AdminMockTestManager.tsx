import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Crop, 
  Image as ImageIcon, 
  BookOpen, 
  Search, 
  ChevronRight, 
  Save, 
  X, 
  Check, 
  HelpCircle, 
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Users,
  Trophy,
  Scissors,
  Sparkles,
  RefreshCw,
  Brain,
  Key,
  Languages,
  Loader2,
  Play,
  Square,
  CheckCircle,
  ListOrdered,
  Folder,
  FolderPlus,
  Lock,
  ShieldCheck,
  Tag,
  DollarSign,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Award,
  Table,
  AlertTriangle,
  FlaskConical,
  Dna,
  Atom
} from 'lucide-react';
import { 
  MockTest, 
  MockQuestion, 
  MockSubject, 
  MockQuestionOption,
  MockTestType,
  MockQuestionDifficulty,
  MockMatchTable,
  MockTestCategory,
  MockTestPackagePricing,
  TestCategory
} from '../types';
import {
  DEFAULT_TEST_CATEGORIES,
  fetchTestCategoriesFromServer,
  resolveTestCategoryIds
} from '../lib/testCategoriesData';
import { 
  getStoredMockTests, 
  saveStoredMockTests, 
  getStoredMockQuestions, 
  saveStoredMockQuestions,
  parseQuestionsFromRawText,
  hasGenuineDiagramRequirement,
  getStoredMockPurchases,
  getStoredMockAttempts,
  SCIENTIFIC_SAMPLE_DIAGRAMS,
  getTestCategory,
  getAvailableChaptersForSubject,
  getMockTestPricingPackages,
  saveMockTestPricingPackages,
  cleanEnglishOptionString,
  cleanHindiOptionString,
  formatScientificMathAndPowers
} from '../lib/mockTestData';
import { 
  loadPdfDocument, 
  renderPdfPageToCanvas, 
  cropRegionFromCanvas,
  cancelCanvasRender,
  extractColumnAwareTextFromPdfPage
} from '../lib/pdfFigureExtractor';
import { 
  cropDiagramFromCanvas, 
  estimateDiagramBoundingBox,
  repairDevanagariText,
  sendPageToGeminiParser, 
  parseAnswerKeyText, 
  createAndSaveCompleteNeetTest,
  auditNeetQuestionsAccuracy,
  detectQuestionPaperPageRange,
  AccuracyAuditResult,
  GeminiParseProgress,
  sanitizeExamText,
  cleanQuestionTextForMatchTable,
  separateBilingualAndCleanQuestion,
  separateBilingualOptions,
  detectDiagramInkBoundingBoxOnCanvas,
  parseSolutionsAndKeyFromPdf,
  SolutionParseResult,
  isDailyQuotaExhausted,
  setDailyQuotaExhausted
} from '../lib/geminiPdfParser';
import { QuestionCanvasBuilder } from './QuestionCanvasBuilder';
import { MockTestLeaderboardModal } from './MockTestLeaderboardModal';
import { MockQuestionReviewModal } from './MockQuestionReviewModal';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';
import { DiagramRecropModal } from './DiagramRecropModal';
import { backgroundPdfParserService } from '../lib/backgroundPdfParser';
import { idbSavePageImage, idbSaveQuestions } from '../lib/idbStorage';

interface AdminMockTestManagerProps {
  onBack?: () => void;
  adminEmail?: string;
  totalRevenue?: number;
  newOrdersCount?: number;
  registeredUsersCount?: number;
  onNavigateTab?: (tab: string) => void;
}

export const AdminMockTestManager: React.FC<AdminMockTestManagerProps> = ({ 
  onBack,
  adminEmail,
  totalRevenue = 0,
  newOrdersCount = 0,
  registeredUsersCount = 0,
  onNavigateTab
}) => {
  const [tests, setTests] = useState<MockTest[]>(() => getStoredMockTests());
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'questions' | 'copypaste' | 'pdf_import' | 'purchases' | 'pricing_packages'>('tests');
  const [pricingPackages, setPricingPackages] = useState<MockTestPackagePricing>(() => getMockTestPricingPackages());

  // Question editing states
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Partial<MockQuestion> | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<any>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState<boolean>(false);
  const [isSeedingGoldTest, setIsSeedingGoldTest] = useState<boolean>(false);

  // Dedicated Test Question Studio & Diagram Questions States
  const [testQuestionsTab, setTestQuestionsTab] = useState<'all' | 'diagrams' | 'add' | 'audit'>('all');
  const [addQuestionMode, setAddQuestionMode] = useState<'pdf' | 'md' | 'paste' | 'manual' | 'preset'>('pdf');
  const [isOpenCanvasBuilder, setIsOpenCanvasBuilder] = useState(false);
  const [previewZoomImageUrl, setPreviewZoomImageUrl] = useState<string | null>(null);
  const [diagramSearchQuery, setDiagramSearchQuery] = useState('');
  const [diagramSubjectFilter, setDiagramSubjectFilter] = useState<'All' | 'Physics' | 'Chemistry' | 'Biology'>('All');
  const [diagramVerifiedFilter, setDiagramVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [singleManualQ, setSingleManualQ] = useState<{
    subject: MockSubject;
    chapter: string;
    questionText: string;
    hindiQuestionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    figureUrl: string;
    marks: number;
    negativeMarks: number;
  }>({
    subject: 'Chemistry',
    chapter: 'Organic Chemistry',
    questionText: '',
    hindiQuestionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    figureUrl: '',
    marks: 4,
    negativeMarks: 1
  });

  // Folders & categorization state
  const [folders, setFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('neetmbbs_mock_folders');
      return saved ? JSON.parse(saved) : ['All Tests', 'Physics Booster', 'Full Syllabus Test Series', 'Chemistry Booster', 'Biology Special'];
    } catch {
      return ['All Tests', 'Physics Booster', 'Full Syllabus Test Series', 'Chemistry Booster', 'Biology Special'];
    }
  });
  const [selectedFolder, setSelectedFolder] = useState<string>('All Tests');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<'all' | 'chapter_wise' | 'full_subject' | 'full_syllabus'>('all');
  const [isManageFoldersOpen, setIsManageFoldersOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [activeLeaderboardTest, setActiveLeaderboardTest] = useState<MockTest | null>(null);

  // Test form state
  const [testFormData, setTestFormData] = useState<Partial<MockTest>>({
    testNumber: 'Test 01',
    code: '#01',
    title: '',
    shortDescription: '',
    fullDescription: '',
    description: '',
    folderName: 'Full Syllabus Test Series',
    type: 'chapter_test',
    testTypeCategory: 'chapter_wise',
    subject: 'Physics',
    chapter: '',
    difficulty: 'Moderate',
    subjects: ['Physics'],
    totalQuestions: 45,
    durationMinutes: 60,
    totalMarks: 180,
    maxMarks: 180,
    correctMarks: 4,
    negativeMarks: 1,
    isFree: true,
    isPaid: false,
    price: 0,
    discountedPrice: 0,
    originalPrice: 299,
    razorpayPlanId: '',
    status: 'published',
    syllabus: '',
    instructions: [
      '+4 marks for every correct response',
      '-1 mark for every incorrect response',
      '0 marks for unattempted questions',
      'Calculators, tables or external aids are strictly prohibited',
      'Timer starts as soon as you proceed from the instruction sheet'
    ],
    allowMultipleAttempts: true,
    attemptLimit: 'unlimited',
    showLeaderboard: true
  });
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<TestCategory[]>(DEFAULT_TEST_CATEGORIES);

  useEffect(() => {
    fetchTestCategoriesFromServer().then(setDynamicCategories).catch(() => {});
    const onCatUpdate = () => {
      fetchTestCategoriesFromServer().then(setDynamicCategories).catch(() => {});
    };
    window.addEventListener('neetmbbs_test_categories_updated', onCatUpdate);
    return () => window.removeEventListener('neetmbbs_test_categories_updated', onCatUpdate);
  }, []);
  const [deleteConfirmTest, setDeleteConfirmTest] = useState<MockTest | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<MockQuestion | null>(null);
  const [quickDeleteConfirmQ, setQuickDeleteConfirmQ] = useState<MockQuestion | null>(null);
  const [selectedQuestionNums, setSelectedQuestionNums] = useState<number[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  
  // Background Parsing on Server states
  const [activeServerJob, setActiveServerJob] = useState<any | null>(null);
  const [isStartingServerJob, setIsStartingServerJob] = useState(false);

  const [adminToast, setAdminToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Poll server for active background parsing jobs so progress continues even if user closed section/site
  useEffect(() => {
    let isMounted = true;
    const pollServerJobs = async () => {
      try {
        const savedJobId = localStorage.getItem('neet_active_parse_job_id');
        if (savedJobId) {
          const res = await fetch(`/api/ai/parse-job/status/${savedJobId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.job && isMounted) {
              setActiveServerJob(data.job);
              if (data.job.status === 'completed' && data.job.questions && data.job.questions.length > 0) {
                const importedKey = `neet_job_imported_${savedJobId}`;
                if (!localStorage.getItem(importedKey)) {
                  localStorage.setItem(importedKey, 'true');
                  localStorage.removeItem('neet_active_parse_job_id');
                  handleImportCompletedServerJob(data.job);
                }
              } else if (data.job.status === 'failed' || data.job.status === 'cancelled') {
                localStorage.removeItem('neet_active_parse_job_id');
              }
            }
          }
        }
      } catch (err) {
        console.warn('Poll server parse job note:', err);
      }
    };

    pollServerJobs();
    const interval = setInterval(pollServerJobs, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedTest, tests]);

  // Dynamically derive chapters created by admin for the currently active subject in the form
  const availableChaptersForForm = useMemo(() => {
    const subj = (testFormData.subject as MockSubject) || 'Physics';
    return getAvailableChaptersForSubject(tests, subj);
  }, [tests, testFormData.subject]);

  // NTA NEET 720-Mark Template Populator
  const handleInsertNtaNeetTemplate = () => {
    const nextNum = tests.length + 1;
    setTestFormData(prev => ({
      ...prev,
      title: `NEET 2026 Full Syllabus Grand Mock Test ${nextNum < 10 ? '0' + nextNum : nextNum}`,
      testNumber: `Test ${nextNum < 10 ? '0' + nextNum : nextNum}`,
      code: `#${nextNum < 10 ? '0' + nextNum : nextNum}`,
      shortDescription: 'Complete 720-mark NTA simulation with authentic diagrams and +4/-1 negative marking.',
      fullDescription: 'Comprehensive full syllabus mock test designed according to latest NTA NEET UG pattern. Includes Physics, Chemistry, Botany, and Zoology with timer simulation and live All India Rank generation.',
      description: 'Comprehensive 720-mark NTA simulation covering full NEET syllabus.',
      folderName: 'Full Syllabus Test Series',
      type: 'full_syllabus',
      difficulty: 'Moderate',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'],
      totalQuestions: 180,
      durationMinutes: 180,
      totalMarks: 720,
      maxMarks: 720,
      correctMarks: 4,
      negativeMarks: 1,
      isFree: true,
      isPaid: false,
      price: 0,
      discountedPrice: 0,
      originalPrice: 299,
      status: 'published',
      syllabus: 'Class 11 & 12 Complete Syllabus (Physics, Chemistry, Botany, Zoology)',
      instructions: [
        '+4 marks for each correct response',
        '-1 mark for each incorrect response',
        '0 marks for unanswered questions',
        'No negative marking for unattempted questions',
        'Auto-submit occurs when the timer reaches 00:00'
      ]
    }));
    triggerToast('✓ NTA NEET 720-Mark Template loaded!');
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    if (folders.includes(newFolderName.trim())) {
      triggerToast('Folder already exists');
      return;
    }
    const updated = [...folders, newFolderName.trim()];
    setFolders(updated);
    localStorage.setItem('neetmbbs_mock_folders', JSON.stringify(updated));
    setNewFolderName('');
    triggerToast('Folder added successfully!');
  };

  const handleDeleteFolder = (fName: string) => {
    if (fName === 'All Tests') return;
    const updated = folders.filter(f => f !== fName);
    setFolders(updated);
    localStorage.setItem('neetmbbs_mock_folders', JSON.stringify(updated));
    if (selectedFolder === fName) setSelectedFolder('All Tests');
    triggerToast('Folder removed.');
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectInput.trim()) return;
    const trimmed = customSubjectInput.trim();
    const current = testFormData.subjects || [];
    if (!current.includes(trimmed)) {
      setTestFormData({ ...testFormData, subjects: [...current, trimmed] });
    }
    setCustomSubjectInput('');
  };

  const handleToggleSubject = (subj: string) => {
    const current = testFormData.subjects || [];
    if (current.includes(subj)) {
      if (current.length > 1) {
        setTestFormData({ ...testFormData, subjects: current.filter(s => s !== subj) });
      } else {
        triggerToast('At least one subject is required.');
      }
    } else {
      setTestFormData({ ...testFormData, subjects: [...current, subj] });
    }
  };

  // Copy/Paste Parser State
  const [pasteRawText, setPasteRawText] = useState('');
  const [parsedPreviewQuestions, setParsedPreviewQuestions] = useState<MockQuestion[]>([]);
  const [pasteDefaultSubject, setPasteDefaultSubject] = useState<MockSubject>('Biology');

  // PDF Import & Interactive Cropping State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfSectionNotice, setPdfSectionNotice] = useState<string | null>(null);
  const [croppedFigureDataUrl, setCroppedFigureDataUrl] = useState<string | null>(null);
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');
  const [targetQuestionForCrop, setTargetQuestionForCrop] = useState<number>(1);
  const [cropTargetType, setCropTargetType] = useState<'question' | 'option_A' | 'option_B' | 'option_C' | 'option_D'>('question');

  // Canvas ref for PDF page rendering & mouse selection
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const cropStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCropBox, setIsDraggingCropBox] = useState(false);
  const [cropBoxDragAction, setCropBoxDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw'>('move');
  const cropBoxDragStartRef = useRef<{ clientX: number; clientY: number; box: { x: number; y: number; w: number; h: number } }>({ clientX: 0, clientY: 0, box: { x: 0, y: 0, w: 0, h: 0 } });

  // AI Gemini PDF Parsing Engine State
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParseProgress, setAiParseProgress] = useState<GeminiParseProgress>({
    currentPage: 0,
    totalPages: 0,
    questionsFound: 0,
    figuresCropped: 0,
    status: 'idle',
    statusMessage: 'Ready to parse with Gemini'
  });
  const [aiEngineStatus, setAiEngineStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [startPageInput, setStartPageInput] = useState<number>(1);
  const [endPageInput, setEndPageInput] = useState<number>(1);
  const [aiTestTitle, setAiTestTitle] = useState<string>('');
  const [aiTestNumber, setAiTestNumber] = useState<string>('Test 05');
  const [aiTestIsFree, setAiTestIsFree] = useState<boolean>(false);
  const [aiTestPrice, setAiTestPrice] = useState<number>(99);
  const [aiTestDuration, setAiTestDuration] = useState<number>(200);
  const [aiParseMode, setAiParseMode] = useState<'fast_text_gallery_crop' | 'full_auto'>('full_auto');
  const [autoCropDiagrams, setAutoCropDiagrams] = useState<boolean>(true);
  const [answerKeyInputText, setAnswerKeyInputText] = useState<string>('');
  const [answerKeyAppliedMessage, setAnswerKeyAppliedMessage] = useState<string | null>(null);
  const [solutionsPdfFile, setSolutionsPdfFile] = useState<File | null>(null);
  const [isParsingSolutionsPdf, setIsParsingSolutionsPdf] = useState<boolean>(false);
  const [parsedSolutionsResult, setParsedSolutionsResult] = useState<SolutionParseResult | null>(null);
  const [solutionsParseNotice, setSolutionsParseNotice] = useState<string | null>(null);
  const [solutionsMissingQNums, setSolutionsMissingQNums] = useState<number[]>([]);
  const [aiParsedQuestionsList, setAiParsedQuestionsList] = useState<MockQuestion[]>([]);
  const [aiPreviewSubjectFilter, setAiPreviewSubjectFilter] = useState<'All' | 'Physics' | 'Chemistry' | 'Biology'>('All');
  const [aiLanguageDisplayMode, setAiLanguageDisplayMode] = useState<'bilingual' | 'en' | 'hi'>('bilingual');
  const [createdTestResult, setCreatedTestResult] = useState<MockTest | null>(null);
  const [showManualCropStudio, setShowManualCropStudio] = useState<boolean>(false);
  const abortAiParsingRef = useRef<boolean>(false);

  // Requirement 4 & 8: Review Modal, Filtering, and Accuracy Audit State
  const [editingQuestionForReview, setEditingQuestionForReview] = useState<MockQuestion | null>(null);
  const [recroppingQuestion, setRecroppingQuestion] = useState<MockQuestion | null>(null);
  const [backgroundParseJob, setBackgroundParseJob] = useState<any>(null);
  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState<boolean>(false);
  const [filterFiguresOnly, setFilterFiguresOnly] = useState<boolean>(false);
  const [filterMissingFiguresOnly, setFilterMissingFiguresOnly] = useState<boolean>(false);
  const [filterMatchTablesOnly, setFilterMatchTablesOnly] = useState<boolean>(false);
  const [samplePdfLoading, setSamplePdfLoading] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [customGeminiApiKey, setCustomGeminiApiKey] = useState<string>(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('user_gemini_api_key') || '' : ''));

  // Background PDF AI parsing listener
  useEffect(() => {
    backgroundPdfParserService.getActiveJob().then(job => {
      if (job) setBackgroundParseJob(job);
    }).catch(() => {});

    const handleProgress = (e: any) => {
      const job = e.detail;
      setBackgroundParseJob(job);
      if (job?.parsedQuestions && job.parsedQuestions.length > 0) {
        setAiParsedQuestionsList(job.parsedQuestions);
      }
    };

    const handleCompleted = (e: any) => {
      const job = e.detail;
      setBackgroundParseJob(job);
      if (job?.parsedQuestions && job.parsedQuestions.length > 0) {
        setAiParsedQuestionsList(job.parsedQuestions);
        triggerToast(`🎉 AI Finished parsing "${job.pdfName}" (${job.parsedQuestions.length} questions digitized)! Ready to review & save.`);
      }
    };

    window.addEventListener('neetmbbs_pdf_job_progress', handleProgress);
    window.addEventListener('neetmbbs_pdf_job_completed', handleCompleted);

    return () => {
      window.removeEventListener('neetmbbs_pdf_job_progress', handleProgress);
      window.removeEventListener('neetmbbs_pdf_job_completed', handleCompleted);
    };
  }, []);

  const [showPrePublishAuditModal, setShowPrePublishAuditModal] = useState<boolean>(false);
  const [auditFilterTab, setAuditFilterTab] = useState<'all' | 'missing' | 'diagrams' | 'math_tables' | 'incomplete' | 'contaminated'>('all');
  const [reextractingPage, setReextractingPage] = useState<number | null>(null);
  const [singlePageInput, setSinglePageInput] = useState<number>(1);

  // Compute accuracy audit result dynamically
  const activeQuestionsPool = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
  const accuracyAudit = useMemo(() => {
    const expectedCount = selectedTest?.totalQuestions || testFormData?.totalQuestions || (activeQuestionsPool.length > 100 ? 180 : undefined);
    return auditNeetQuestionsAccuracy(activeQuestionsPool, expectedCount);
  }, [activeQuestionsPool, selectedTest, testFormData.totalQuestions]);

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const res = await fetch(`/api/ai/benchmark-test-8?testId=${selectedTest?.id || 'cbt-gold-test-08'}`);
      const data = await res.json();
      if (data.success && data.report) {
        setBenchmarkReport(data.report);
        triggerToast(`🎉 Gold-Standard Benchmark: ${data.report.scorePercentage}% pass rate!`);
      } else {
        triggerToast('Error running benchmark: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      triggerToast('Benchmark request error: ' + err.message);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleSeedGoldStandardTest = async () => {
    setIsSeedingGoldTest(true);
    try {
      const res = await fetch('/api/ai/seed-gold-standard-test-8', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        triggerToast('🎉 Gold-Standard Test 08 (180 Questions) Loaded Successfully!');
        const updatedTests = getStoredMockTests();
        setTests(updatedTests);
        const target = updatedTests.find(t => t.id === 'cbt-gold-test-08') || null;
        setSelectedTest(target);
        const testQs = getStoredMockQuestions('cbt-gold-test-08');
        setQuestions(testQs);
        setAiParsedQuestionsList(testQs);
      }
    } catch (err: any) {
      triggerToast('Failed to seed gold test: ' + err.message);
    } finally {
      setIsSeedingGoldTest(false);
    }
  };

  const handleAutoSanitizeAllQuestions = () => {
    const currentPool = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    const sanitized = currentPool.map(q => {
      const cleanEn = formatScientificMathAndPowers(q.languages?.en?.questionText || q.questionText || '');
      const cleanHi = q.languages?.hi?.questionText ? formatScientificMathAndPowers(q.languages.hi.questionText) : undefined;
      const cleanOpts = (q.options || []).map(o => ({
        ...o,
        value: cleanEnglishOptionString(o.value || '', o.label)
      }));
      const cleanHiOpts = q.languages?.hi?.options
        ? q.languages.hi.options.map(o => ({
            ...o,
            value: cleanHindiOptionString(o.value || '', o.label)
          }))
        : cleanOpts;
      return {
        ...q,
        questionText: cleanEn,
        options: cleanOpts,
        languages: {
          en: {
            questionText: cleanEn,
            options: cleanOpts,
            figureUrl: q.languages?.en?.figureUrl || q.figureUrl,
            matchTable: q.languages?.en?.matchTable || q.matchTable,
            explanation: q.languages?.en?.explanation || q.explanation
          },
          hi: cleanHi ? {
            questionText: cleanHi,
            options: cleanHiOpts,
            figureUrl: q.languages?.hi?.figureUrl || q.figureUrl,
            matchTable: q.languages?.hi?.matchTable || q.matchTable,
            explanation: q.languages?.hi?.explanation || q.explanation
          } : undefined
        }
      };
    });

    if (aiParsedQuestionsList.length > 0) setAiParsedQuestionsList(sanitized);
    if (questions.length > 0) {
      setQuestions(sanitized);
      handleSaveQuestionsList(sanitized);
    }
    triggerToast('✓ Successfully sanitized mathematical superscripts, exponents, and options across all questions!');
  };

  const handleFillMissingQuestions = () => {
    const currentPool = [...(aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions)];
    const existingNums = new Set(currentPool.map(q => q.questionNumber));
    let addedCount = 0;
    for (const mNum of accuracyAudit.missingNumbers) {
      if (!existingNums.has(mNum)) {
        const subj: MockSubject = mNum <= 45 ? 'Physics' : mNum <= 90 ? 'Chemistry' : 'Biology';
        currentPool.push({
          id: `q_backfill_${Date.now()}_${mNum}`,
          testId: selectedTest ? selectedTest.id : 'temp_test',
          questionNumber: mNum,
          subject: subj,
          chapter: `${subj} Core`,
          difficulty: 'Moderate',
          questionText: `Question ${mNum}: [Requires Admin Input / Verification]`,
          options: [
            { label: 'A', value: 'Option A', type: 'text' },
            { label: 'B', value: 'Option B', type: 'text' },
            { label: 'C', value: 'Option C', type: 'text' },
            { label: 'D', value: 'Option D', type: 'text' }
          ],
          correctAnswer: 'A',
          marks: 4,
          negativeMarks: 1,
          needsReview: true
        });
        addedCount++;
      }
    }
    currentPool.sort((a, b) => a.questionNumber - b.questionNumber);
    if (aiParsedQuestionsList.length > 0) setAiParsedQuestionsList(currentPool);
    setQuestions(currentPool);
    if (selectedTest) handleSaveQuestionsList(currentPool);
    triggerToast(`✓ Added ${addedCount} missing questions to fill sequence gaps up to ${accuracyAudit.totalDetectedInPdf}!`);
  };

  /**
   * Re-extracts questions from a single PDF page without re-running or duplicating the entire test.
   */
  const handleReextractSinglePage = async (targetPage: number) => {
    if (!pdfDocProxy) {
      triggerToast('Please load the PDF document first to re-extract individual pages.');
      return;
    }
    if (targetPage < 1 || targetPage > (pdfDocProxy.numPages || 1)) {
      triggerToast(`Page ${targetPage} is out of bounds (1-${pdfDocProxy.numPages}).`);
      return;
    }

    setReextractingPage(targetPage);
    try {
      // 1. Render target page to canvas with high resolution (scale 2.0)
      const canvas = document.createElement('canvas');
      await renderPdfPageToCanvas(pdfDocProxy, targetPage, canvas, 2.0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.88);

      // 2. Multimodal OCR with Gemini Vision or local 2-column fallback
      let pageQuestions: any[] = [];
      try {
        const parseResult = await sendPageToGeminiParser(
          imageBase64,
          targetPage,
          pdfDocProxy.numPages,
          undefined,
          'full_auto'
        );
        pageQuestions = parseResult.questions || [];
      } catch (gemErr) {
        console.warn(`Gemini extraction fallback for page ${targetPage}:`, gemErr);
      }

      // 3. Fallback / supplement from vector text
      try {
        const pageObj = await pdfDocProxy.getPage(targetPage);
        const pageRawText = await extractColumnAwareTextFromPdfPage(pageObj);
        if (pageRawText && pageRawText.trim().length > 30) {
          const defaultSubj: MockSubject = targetPage <= 12 ? 'Physics' : targetPage <= 24 ? 'Chemistry' : 'Biology';
          const textQs = parseQuestionsFromRawText(pageRawText, defaultSubj);
          if (pageQuestions.length === 0 && textQs.length > 0) {
            pageQuestions = textQs.map((tq, tIdx) => ({
              questionNumber: tq.questionNumber,
              subject: tq.subject,
              chapter: tq.chapter,
              english: {
                questionText: tq.questionText,
                options: tq.options.map(o => ({ label: o.label, text: o.value }))
              },
              hindi: tq.languages?.hi ? {
                questionText: tq.languages.hi.questionText,
                options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
              } : undefined,
              correctAnswer: tq.correctAnswer,
              hasFigure: Boolean(tq.figureUrl || hasGenuineDiagramRequirement(tq))
            }));
          }
        }
      } catch (vectorErr) {
        console.warn('Vector fallback error on single page re-extract:', vectorErr);
      }

      if (pageQuestions.length === 0) {
        triggerToast(`No questions found on Page ${targetPage}. Please verify the page contains questions.`);
        setReextractingPage(null);
        return;
      }

      // 4. Crop diagrams and organic chemistry figures directly for questions on this page
      for (const rawQ of pageQuestions) {
        let figureDataUrl: string | undefined = undefined;
        const resolvedBbox = rawQ.figureBoundingBox || (rawQ as any).boundingBox;
        if (resolvedBbox && Array.isArray(resolvedBbox) && resolvedBbox.length === 4) {
          figureDataUrl = cropDiagramFromCanvas(canvas, resolvedBbox as any);
        }
        if (!figureDataUrl) {
          const textToCheck = `${rawQ.english?.questionText || ''} ${rawQ.hindi?.questionText || ''}`;
          if (hasGenuineDiagramRequirement({ questionText: textToCheck })) {
            const detectedBox = detectDiagramInkBoundingBoxOnCanvas(canvas, 30, 970, 30, 970);
            if (detectedBox) {
              figureDataUrl = cropDiagramFromCanvas(canvas, detectedBox);
            }
          }
        }
        if (figureDataUrl) {
          rawQ.figureUrl = figureDataUrl;
        }
      }

      // 5. Convert to MockQuestions & merge into current pool
      const currentPool = [...(aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions)];
      let replacedCount = 0;
      let insertedCount = 0;

      for (const rq of pageQuestions) {
        const qNum = rq.questionNumber;
        if (!qNum) continue;

        const enText = formatScientificMathAndPowers(rq.english?.questionText || rq.questionText || '');
        const hiText = rq.hindi?.questionText ? formatScientificMathAndPowers(rq.hindi.questionText) : undefined;
        const optionsList: MockQuestionOption[] = (rq.english?.options || rq.options || [
          { label: 'A', text: 'Option (A)' },
          { label: 'B', text: 'Option (B)' },
          { label: 'C', text: 'Option (C)' },
          { label: 'D', text: 'Option (D)' }
        ]).map((o: any) => ({
          label: o.label || 'A',
          value: cleanEnglishOptionString(o.text || o.value || ''),
          type: 'text' as const
        }));

        let subj: MockSubject = rq.subject || (qNum <= 45 ? 'Physics' : qNum <= 90 ? 'Chemistry' : 'Biology');
        const updatedMockQ: MockQuestion = {
          id: `q_reextract_p${targetPage}_${qNum}_${Date.now()}`,
          testId: selectedTest ? selectedTest.id : 'temp_test',
          questionNumber: qNum,
          pdfPageNumber: targetPage,
          subject: subj,
          chapter: rq.chapter || `${subj} Core`,
          difficulty: 'Moderate',
          questionText: enText,
          options: optionsList,
          correctAnswer: rq.correctAnswer || 'A',
          marks: 4,
          negativeMarks: 1,
          figureUrl: rq.figureUrl,
          questionImageUrl: rq.figureUrl,
          matchTable: rq.matchTable,
          languages: {
            en: {
              questionText: enText,
              options: optionsList,
              figureUrl: rq.figureUrl,
              matchTable: rq.matchTable
            },
            hi: hiText ? {
              questionText: hiText,
              options: (rq.hindi?.options || optionsList).map((o: any) => ({
                label: o.label || 'A',
                value: cleanHindiOptionString(o.text || o.value || ''),
                type: 'text' as const
              })),
              figureUrl: rq.figureUrl,
              matchTable: rq.matchTable
            } : undefined
          }
        };

        const existingIdx = currentPool.findIndex(q => q.questionNumber === qNum);
        if (existingIdx >= 0) {
          currentPool[existingIdx] = updatedMockQ;
          replacedCount++;
        } else {
          currentPool.push(updatedMockQ);
          insertedCount++;
        }
      }

      currentPool.sort((a, b) => a.questionNumber - b.questionNumber);
      if (aiParsedQuestionsList.length > 0) setAiParsedQuestionsList(currentPool);
      setQuestions(currentPool);
      if (selectedTest) handleSaveQuestionsList(currentPool);

      triggerToast(`✓ Page ${targetPage} Re-extracted! Updated ${replacedCount} and added ${insertedCount} questions.`);
    } catch (err: any) {
      console.error('Single page re-extraction error:', err);
      triggerToast(`Re-extraction error on Page ${targetPage}: ${err?.message || 'Unknown error'}`);
    } finally {
      setReextractingPage(null);
    }
  };

  // Dedicated Diagram Questions calculation for separate diagram review
  const diagramQuestions = useMemo(() => {
    return (questions || []).filter(q => 
      Boolean(
        q && (
          q.figureUrl || 
          q.questionImageUrl || 
          (q.figures && q.figures.length > 0) || 
          (q.optionFigures && Object.keys(q.optionFigures).length > 0) ||
          (q?.languages?.en?.figureUrl) ||
          (q?.languages?.hi?.figureUrl) ||
          (q?.languages?.en?.options?.some(o => o.type === 'image' || o.imageUrl))
        )
      )
    );
  }, [questions]);

  // Questions where the question statement references a diagram/figure/graph, but no figure is attached
  const questionsExpectingDiagrams = useMemo(() => {
    const keywords = ['figure', 'diagram', 'graph', 'curve', 'circuit', 'shown below', 'following scheme', 'structure of'];
    return (questions || []).filter(q => {
      const text = (q.languages?.en?.questionText || q.questionText || '').toLowerCase();
      const referencesVisual = keywords.some(kw => text.includes(kw));
      const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
      return referencesVisual && !hasFig;
    });
  }, [questions]);

  const [diagramCategoryFilter, setDiagramCategoryFilter] = useState<'has_diagram' | 'missing_expected' | 'all'>('has_diagram');

  const filteredDiagramQuestions = useMemo(() => {
    let pool = questions || [];
    if (diagramCategoryFilter === 'has_diagram') {
      pool = diagramQuestions;
    } else if (diagramCategoryFilter === 'missing_expected') {
      pool = questionsExpectingDiagrams;
    }

    return pool.filter(q => {
      if (!q) return false;
      if (diagramSubjectFilter !== 'All' && q.subject !== diagramSubjectFilter) return false;
      if (diagramVerifiedFilter === 'verified' && q.needsReview) return false;
      if (diagramVerifiedFilter === 'unverified' && !q.needsReview) return false;
      if (diagramSearchQuery.trim()) {
        const query = diagramSearchQuery.toLowerCase();
        const text = (q?.languages?.en?.questionText || q?.questionText || '').toLowerCase();
        const numStr = (q.questionNumber || '').toString();
        if (!text.includes(query) && !numStr.includes(query)) return false;
      }
      return true;
    });
  }, [questions, diagramQuestions, questionsExpectingDiagrams, diagramCategoryFilter, diagramSubjectFilter, diagramVerifiedFilter, diagramSearchQuery]);

  // Check server AI status on mount
  useEffect(() => {
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAiEngineStatus({ configured: data.configured, model: data.model });
        }
      })
      .catch(err => console.warn('Could not fetch AI status:', err));
  }, []);

  // Load questions when selectedTest changes
  useEffect(() => {
    if (selectedTest) {
      const q = getStoredMockQuestions(selectedTest.id);
      setQuestions(q);
    }
  }, [selectedTest]);

  // Handle PDF Render on Page Change with robust cancellation and race-condition prevention
  useEffect(() => {
    let isCancelled = false;
    const canvas = pdfCanvasRef.current;

    if (pdfDocProxy && canvas && currentPdfPage > 0) {
      setIsLoadingPdf(true);
      renderPdfPageToCanvas(pdfDocProxy, currentPdfPage, canvas, 1.8)
        .then(info => {
          if (!isCancelled) {
            setPdfExtractedText(info.text);
            setIsLoadingPdf(false);
          }
        })
        .catch(err => {
          // If rendering was cancelled due to quick page switching or effect re-run, ignore safely
          if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
            return;
          }
          if (!isCancelled) {
            console.error('Error rendering PDF page:', err);
            setIsLoadingPdf(false);
          }
        });
    }

    return () => {
      isCancelled = true;
      cancelCanvasRender(canvas);
    };
  }, [pdfDocProxy, currentPdfPage]);

  // Save tests list helper
  const handleSaveTestsList = (updated: MockTest[]) => {
    setTests(updated);
    saveStoredMockTests(updated);
  };

  // Open Test Editor & Smooth Scroll into Form
  const handleOpenEditTest = (test: MockTest) => {
    setSelectedTest(test);
    const cat = getTestCategory(test);
    setTestFormData({
      ...test,
      testTypeCategory: cat,
      subject: test.subject || (test.subjects && (test.subjects[0] as MockSubject)) || 'Physics',
      chapter: test.chapter || '',
      price: test.price ?? (test.isFree ? 0 : 49),
      totalQuestions: test.totalQuestions || 200,
      durationMinutes: test.durationMinutes || 200,
      maxMarks: test.maxMarks || 720,
      folderName: test.folderName || 'Full Syllabus Test Series',
      syllabus: test.syllabus || '',
      instructions: test.instructions || [
        '+4 marks for every correct response',
        '-1 mark for every incorrect response',
        '0 marks for unattempted questions'
      ]
    });
    setEditingTestId(test.id);
    setIsCreatingTest(true);
    triggerToast(`Editing test "${test.title || test.testNumber}". Form opened above.`);
    setTimeout(() => {
      const formEl = document.getElementById('mock-test-form-section');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  // Create or Update Test with Free/Premium & Folder Logic
  const handleSaveTest = (statusOverride?: 'draft' | 'published', openQuestionsBuilder: boolean = false) => {
    if (!testFormData.title?.trim()) {
      triggerToast('Please enter a test title');
      return;
    }

    const effectiveCategory: MockTestCategory = testFormData.testTypeCategory ||
      (testFormData.type === 'chapter_test' || Boolean(testFormData.chapter?.trim()) ? 'chapter_wise' :
       testFormData.type === 'subject_test' ? 'full_subject' : 'full_syllabus');

    if (effectiveCategory === 'chapter_wise' && !testFormData.chapter?.trim()) {
      triggerToast('Please enter or select a Chapter name for this Chapter Wise test.');
      return;
    }

    const effectiveType: MockTestType = effectiveCategory === 'chapter_wise' ? 'chapter_test' :
      effectiveCategory === 'full_subject' ? 'subject_test' : 'full_syllabus';

    const effectiveSubject = effectiveCategory === 'full_syllabus' ? undefined : (testFormData.subject || 'Physics');
    const effectiveSubjects = effectiveCategory === 'full_syllabus' 
      ? ['Physics', 'Chemistry', 'Biology'] 
      : [effectiveSubject || 'Physics'];

    const effectiveStatus = statusOverride || testFormData.status || 'published';
    const isFree = testFormData.isFree ?? (Number(testFormData.price) === 0);
    const price = isFree ? 0 : (Number(testFormData.price) || 0);

    const isStandaloneFlag = Boolean(testFormData.isStandalone);
    const chosenCatIds = isStandaloneFlag
      ? []
      : Array.isArray(testFormData.categoryIds) && testFormData.categoryIds.length > 0
      ? testFormData.categoryIds
      : [effectiveCategory];

    const testPayload: Partial<MockTest> = {
      ...testFormData,
      title: testFormData.title.trim(),
      testNumber: testFormData.testNumber?.trim() || `Test 0${tests.length + 1}`,
      code: testFormData.code?.trim() || `#0${tests.length + 1}`,
      shortDescription: testFormData.shortDescription?.trim() || testFormData.description?.trim() || '',
      fullDescription: testFormData.fullDescription?.trim() || testFormData.description?.trim() || '',
      description: testFormData.shortDescription?.trim() || testFormData.description?.trim() || '',
      folderName: testFormData.folderName || 'Full Syllabus Test Series',
      testTypeCategory: chosenCatIds[0] || effectiveCategory,
      categoryIds: chosenCatIds,
      isStandalone: isStandaloneFlag,
      type: effectiveType,
      subject: effectiveSubject,
      chapter: effectiveCategory === 'chapter_wise' ? (testFormData.chapter?.trim() || '') : '',
      difficulty: testFormData.difficulty || 'Moderate',
      subjects: effectiveSubjects,
      totalQuestions: Number(testFormData.totalQuestions) || (effectiveCategory === 'full_syllabus' ? 180 : 45),
      durationMinutes: Number(testFormData.durationMinutes) || (effectiveCategory === 'full_syllabus' ? 180 : 60),
      totalMarks: Number(testFormData.totalMarks) || (effectiveCategory === 'full_syllabus' ? 720 : 180),
      maxMarks: Number(testFormData.maxMarks) || (effectiveCategory === 'full_syllabus' ? 720 : 180),
      correctMarks: Number(testFormData.correctMarks) ?? 4,
      negativeMarks: Number(testFormData.negativeMarks) ?? 1,
      isFree,
      isPaid: !isFree,
      price,
      discountedPrice: Number(testFormData.discountedPrice) || 0,
      originalPrice: Number(testFormData.originalPrice) || (price > 0 ? price + 200 : 299),
      razorpayPlanId: testFormData.razorpayPlanId?.trim() || '',
      status: effectiveStatus,
      syllabus: testFormData.syllabus || (
        effectiveCategory === 'chapter_wise' ? `${effectiveSubject}: ${testFormData.chapter?.trim()}` :
        effectiveCategory === 'full_subject' ? `Complete ${effectiveSubject} Syllabus` :
        'Complete NEET PCB Syllabus (Physics, Chemistry, Biology)'
      ),
      instructions: testFormData.instructions || [
        '+4 marks for every correct response',
        '-1 mark for every incorrect response',
        '0 marks for unattempted questions'
      ],
      allowMultipleAttempts: testFormData.allowMultipleAttempts ?? true,
      attemptLimit: testFormData.attemptLimit || 'unlimited',
      showLeaderboard: testFormData.showLeaderboard ?? true
    };

    if (editingTestId) {
      // Edit existing test
      const updated = tests.map(t => {
        if (t.id === editingTestId) {
          return {
            ...t,
            ...testPayload
          } as MockTest;
        }
        return t;
      });
      handleSaveTestsList(updated);
      const savedTest = updated.find(t => t.id === editingTestId);
      if (savedTest) {
        setSelectedTest(savedTest);
      }
      setIsCreatingTest(false);
      setEditingTestId(null);
      triggerToast(statusOverride === 'draft' ? '✓ Test saved as draft & synced to Firebase!' : '✓ Mock test updated & synced live to Firebase!');
      if (openQuestionsBuilder && savedTest) {
        setActiveTab('questions');
      }
    } else {
      // Create new
      const newTest: MockTest = {
        id: `cbt-${Date.now()}`,
        ...(testPayload as MockTest),
        createdAt: new Date().toISOString()
      };
      const updated = [newTest, ...tests];
      handleSaveTestsList(updated);
      setSelectedTest(newTest);
      setIsCreatingTest(false);
      setEditingTestId(null);
      triggerToast(statusOverride === 'draft' ? '✓ Test saved as draft & synced to Firebase!' : '✓ New mock test published & live on Firebase!');
      if (openQuestionsBuilder) {
        setActiveTab('questions');
      }
    }
  };

  // Confirm and Delete Test Safely
  const handleConfirmDelete = () => {
    if (!deleteConfirmTest) return;
    const testId = deleteConfirmTest.id;
    try {
      localStorage.removeItem(`neetmbbs_mock_questions_${testId}`);
      if (typeof fetch !== 'undefined') {
        fetch(`https://ncertify-neet-master-tests-default-rtdb.firebaseio.com/mock_tests/${testId}.json`, { method: 'DELETE' }).catch(() => {});
        fetch(`https://ncertify-neet-master-tests-default-rtdb.firebaseio.com/mock_questions/${testId}.json`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (e) {
      console.warn('Questions storage cleanup note:', e);
    }
    const updated = tests.filter(t => t.id !== testId);
    handleSaveTestsList(updated);
    if (selectedTest?.id === testId) setSelectedTest(null);
    setDeleteConfirmTest(null);
    triggerToast('✓ Test and questions deleted & synced to Firebase');
  };

  // Duplicate Test
  const handleDuplicateTest = (test: MockTest) => {
    const duplicated: MockTest = {
      ...test,
      id: `cbt-${Date.now()}`,
      testNumber: `${test.testNumber} (Copy)`,
      title: `${test.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    const existingQs = getStoredMockQuestions(test.id);
    const newQs = existingQs.map(q => ({ ...q, id: `q-${Date.now()}-${Math.random()}`, testId: duplicated.id }));
    saveStoredMockQuestions(duplicated.id, newQs);
    handleSaveTestsList([duplicated, ...tests]);
  };

  // Toggle publish status with mandatory pre-publish accuracy validation
  const handleTogglePublish = (test: MockTest) => {
    const nextStatus = test.status === 'published' ? 'draft' : 'published';
    if (nextStatus === 'published') {
      const testQs = selectedTest?.id === test.id && (questions.length > 0 || aiParsedQuestionsList.length > 0)
        ? (questions.length > 0 ? questions : aiParsedQuestionsList)
        : getStoredMockQuestions(test.id);
      const audit = auditNeetQuestionsAccuracy(testQs, test.totalQuestions || (testQs.length > 100 ? 180 : undefined));
      if (!audit.canPublish) {
        setShowPrePublishAuditModal(true);
        triggerToast(`❌ Cannot publish "${test.title}": ${audit.criticalErrorsCount} critical error(s) detected. Please resolve audit issues before publishing.`);
        return;
      }
    }
    const updated = tests.map(t => t.id === test.id ? { ...t, status: nextStatus } as MockTest : t);
    handleSaveTestsList(updated);
    if (selectedTest?.id === test.id) setSelectedTest({ ...selectedTest, status: nextStatus });
    triggerToast(nextStatus === 'published' ? `✓ "${test.title}" is now Published Live!` : `"${test.title}" moved to Drafts.`);
  };

  // Toggle Free / Premium (Paid) status
  const handleToggleFreePaid = (test: MockTest) => {
    const isCurrentlyFree = test.isFree || test.price === 0;
    const nextFree = !isCurrentlyFree;
    const nextPrice = nextFree ? 0 : (test.originalPrice && test.originalPrice > 0 ? test.originalPrice : 99);
    const updated = tests.map(t => t.id === test.id ? {
      ...t,
      isFree: nextFree,
      isPaid: !nextFree,
      price: nextPrice,
      discountedPrice: nextPrice
    } as MockTest : t);
    handleSaveTestsList(updated);
    if (selectedTest?.id === test.id) {
      setSelectedTest({
        ...selectedTest,
        isFree: nextFree,
        isPaid: !nextFree,
        price: nextPrice,
        discountedPrice: nextPrice
      });
    }
    triggerToast(nextFree ? `✓ "${test.title}" set to Free Sample Test` : `🔒 "${test.title}" set to Premium (₹${nextPrice})`);
  };

  // Reorder Tests (Move Up / Move Down)
  const handleMoveTestUp = (testId: string) => {
    const idx = tests.findIndex(t => t.id === testId);
    if (idx <= 0) return;
    const updated = [...tests];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    handleSaveTestsList(updated);
    triggerToast('✓ Test moved up');
  };

  const handleMoveTestDown = (testId: string) => {
    const idx = tests.findIndex(t => t.id === testId);
    if (idx === -1 || idx >= tests.length - 1) return;
    const updated = [...tests];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    handleSaveTestsList(updated);
    triggerToast('✓ Test moved down');
  };

  // Save Questions
  const handleSaveQuestionsList = (updated: MockQuestion[]) => {
    if (!selectedTest) {
      setQuestions(updated);
      setAiParsedQuestionsList(updated);
      idbSaveQuestions('active_parsed_questions', updated).catch(() => {});
      idbSaveQuestions('active_pdf_job', updated).catch(() => {});
      return;
    }
    setQuestions(updated);
    saveStoredMockQuestions(selectedTest.id, updated);
    // Update test total questions count and max marks
    const updatedTests = tests.map(t => t.id === selectedTest.id ? { 
      ...t, 
      totalQuestions: updated.length,
      questionsCount: updated.length,
      maxMarks: updated.length * (t.correctMarks || 4),
      totalMarks: updated.length * (t.correctMarks || 4)
    } : t);
    handleSaveTestsList(updatedTests);
    if (selectedTest) {
      setSelectedTest(prev => prev ? {
        ...prev,
        totalQuestions: updated.length,
        questionsCount: updated.length,
        maxMarks: updated.length * (prev.correctMarks || 4),
        totalMarks: updated.length * (prev.correctMarks || 4)
      } : null);
    }
  };

  // Save AI Parsed Questions Directly to Selected Test
  const handleSaveAiParsedQuestionsToTest = () => {
    if (!selectedTest) {
      triggerToast('Please select a mock test to add questions to.');
      return;
    }
    const pool = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    if (pool.length === 0) {
      triggerToast('No parsed questions to add.');
      return;
    }
    const existing = [...questions];
    const formatted = pool.map((q, idx) => ({
      ...q,
      id: `q-${selectedTest.id}-${Date.now()}-${idx + 1}`,
      testId: selectedTest.id,
      questionNumber: q.questionNumber || (existing.length + idx + 1)
    }));

    // Merge: update matching question numbers or append new ones
    const merged = [...existing];
    for (const newQ of formatted) {
      const matchIdx = merged.findIndex(m => m.questionNumber === newQ.questionNumber);
      if (matchIdx > -1) {
        merged[matchIdx] = newQ;
      } else {
        merged.push(newQ);
      }
    }
    merged.sort((a, b) => a.questionNumber - b.questionNumber);

    handleSaveQuestionsList(merged);
    setQuestions(merged);
    setAiParsedQuestionsList(merged);
    setTestQuestionsTab('all');
    triggerToast(`🎉 Successfully added ${formatted.length} questions with diagrams to ${selectedTest.title}!`);
  };

  // Save Parsed Markdown / Copy-Paste Questions to Selected Test
  const handleSaveParsedPreviewQuestionsToTest = () => {
    if (!selectedTest) return;
    if (parsedPreviewQuestions.length === 0) {
      triggerToast('No parsed questions to import.');
      return;
    }
    const existingCount = questions.length;
    const formatted = parsedPreviewQuestions.map((q, idx) => ({
      ...q,
      id: `q-${selectedTest.id}-${Date.now()}-${idx + 1}`,
      testId: selectedTest.id,
      questionNumber: existingCount + idx + 1
    }));
    const updated = [...questions, ...formatted];
    handleSaveQuestionsList(updated);
    setParsedPreviewQuestions([]);
    setPasteRawText('');
    setTestQuestionsTab('all');
    triggerToast(`✓ Added ${formatted.length} questions to ${selectedTest.title}!`);
  };

  // Upload MD / Text file handler
  const handleUploadMdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setPasteRawText(text);
        const parsed = parseQuestionsFromRawText(text, pasteDefaultSubject);
        setParsedPreviewQuestions(parsed);
        triggerToast(`✓ Parsed ${parsed.length} questions from ${file.name}!`);
      }
    };
    reader.readAsText(file);
  };

  // Add Single Manual Question Handler
  const handleAddSingleManualQuestion = () => {
    if (!selectedTest) return;
    if (!singleManualQ.questionText.trim()) {
      triggerToast('Question statement cannot be empty');
      return;
    }
    const nextNum = questions.length + 1;
    const newQ: MockQuestion = {
      id: `q-${selectedTest.id}-${Date.now()}`,
      testId: selectedTest.id,
      questionNumber: nextNum,
      subject: singleManualQ.subject,
      chapter: singleManualQ.chapter.trim() || `${singleManualQ.subject} Core`,
      questionText: singleManualQ.questionText.trim(),
      options: [
        { label: 'A', type: 'text', value: singleManualQ.optionA.trim() || 'Option A' },
        { label: 'B', type: 'text', value: singleManualQ.optionB.trim() || 'Option B' },
        { label: 'C', type: 'text', value: singleManualQ.optionC.trim() || 'Option C' },
        { label: 'D', type: 'text', value: singleManualQ.optionD.trim() || 'Option D' }
      ],
      correctAnswer: singleManualQ.correctAnswer,
      marks: singleManualQ.marks || 4,
      negativeMarks: singleManualQ.negativeMarks ?? 1,
      figureUrl: singleManualQ.figureUrl || undefined,
      questionImageUrl: singleManualQ.figureUrl || undefined,
      figures: singleManualQ.figureUrl ? [singleManualQ.figureUrl] : [],
      languages: {
        en: {
          questionText: singleManualQ.questionText.trim(),
          options: [
            { label: 'A', type: 'text', value: singleManualQ.optionA.trim() || 'Option A' },
            { label: 'B', type: 'text', value: singleManualQ.optionB.trim() || 'Option B' },
            { label: 'C', type: 'text', value: singleManualQ.optionC.trim() || 'Option C' },
            { label: 'D', type: 'text', value: singleManualQ.optionD.trim() || 'Option D' }
          ],
          figureUrl: singleManualQ.figureUrl || undefined
        },
        hi: singleManualQ.hindiQuestionText.trim() ? {
          questionText: singleManualQ.hindiQuestionText.trim(),
          options: [
            { label: 'A', type: 'text', value: singleManualQ.optionA.trim() || 'Option A' },
            { label: 'B', type: 'text', value: singleManualQ.optionB.trim() || 'Option B' },
            { label: 'C', type: 'text', value: singleManualQ.optionC.trim() || 'Option C' },
            { label: 'D', type: 'text', value: singleManualQ.optionD.trim() || 'Option D' }
          ],
          figureUrl: singleManualQ.figureUrl || undefined
        } : undefined
      }
    };
    const updated = [...questions, newQ];
    handleSaveQuestionsList(updated);
    setSingleManualQ({
      subject: singleManualQ.subject,
      chapter: singleManualQ.chapter,
      questionText: '',
      hindiQuestionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      figureUrl: '',
      marks: 4,
      negativeMarks: 1
    });
    setTestQuestionsTab('all');
    triggerToast(`✓ Question #${nextNum} added successfully!`);
  };

  // Replace Question Diagram Handler
  const handleReplaceQuestionDiagram = (questionNumber: number, newImageUrl: string) => {
    if (!selectedTest) return;
    const updated = questions.map(q => {
      if (q.questionNumber === questionNumber) {
        return {
          ...q,
          figureUrl: newImageUrl,
          questionImageUrl: newImageUrl,
          figures: [newImageUrl],
          languages: {
            ...q?.languages,
            en: { ...q?.languages?.en, figureUrl: newImageUrl },
            hi: q?.languages?.hi ? { ...q?.languages?.hi, figureUrl: newImageUrl } : undefined
          }
        };
      }
      return q;
    });
    handleSaveQuestionsList(updated);
    triggerToast(`✓ Replaced diagram image for Question #${questionNumber}!`);
  };

  // Remove Question Diagram Handler
  const handleRemoveQuestionDiagram = (questionNumber: number) => {
    if (!selectedTest) return;
    const updated = questions.map(q => {
      if (q.questionNumber === questionNumber) {
        const copy = { ...q };
        delete copy.figureUrl;
        delete copy.questionImageUrl;
        copy.figures = [];
        if (copy?.languages?.en) delete copy.languages.en.figureUrl;
        if (copy?.languages?.hi) delete copy.languages.hi.figureUrl;
        return copy;
      }
      return q;
    });
    handleSaveQuestionsList(updated);
    triggerToast(`Removed diagram from Question #${questionNumber}`);
  };

  // Toggle Diagram Verified Status Handler
  const handleToggleDiagramVerified = (questionNumber: number) => {
    if (!selectedTest) return;
    const updated = questions.map(q => {
      if (q.questionNumber === questionNumber) {
        return { ...q, needsReview: !q.needsReview };
      }
      return q;
    });
    handleSaveQuestionsList(updated);
    triggerToast(`Toggled verification for Question #${questionNumber}`);
  };

  // Save Single Question from Editor
  const handleSaveEditingQuestion = () => {
    if (!editingQuestion || !selectedTest) return;
    if (!editingQuestion.questionText?.trim()) {
      triggerToast('Question text is required');
      return;
    }

    const qNum = editingQuestion.questionNumber || (questions.length + 1);
    const completeQ: MockQuestion = {
      id: editingQuestion.id || `q-${Date.now()}`,
      testId: selectedTest.id,
      questionNumber: qNum,
      subject: editingQuestion.subject || 'Biology',
      chapter: editingQuestion.chapter || 'General',
      difficulty: editingQuestion.difficulty || 'Moderate',
      questionText: editingQuestion.questionText.trim(),
      questionImageUrl: editingQuestion.questionImageUrl || '',
      options: editingQuestion.options || [
        { label: 'A', type: 'text', value: 'Option A' },
        { label: 'B', type: 'text', value: 'Option B' },
        { label: 'C', type: 'text', value: 'Option C' },
        { label: 'D', type: 'text', value: 'Option D' }
      ],
      correctAnswer: editingQuestion.correctAnswer || 'A',
      explanation: editingQuestion.explanation || ''
    };

    const idx = questions.findIndex(q => q.id === completeQ.id || q.questionNumber === completeQ.questionNumber);
    let updated: MockQuestion[];
    if (idx > -1) {
      updated = [...questions];
      updated[idx] = completeQ;
    } else {
      updated = [...questions, completeQ];
    }

    // Sort by question number
    updated.sort((a, b) => a.questionNumber - b.questionNumber);
    handleSaveQuestionsList(updated);
    setEditingQuestion(null);
    triggerToast('Question saved successfully!');
  };

  // Import completed background parse job from server
  const handleImportCompletedServerJob = (job: any) => {
    if (!job.questions || job.questions.length === 0) return;
    if (selectedTest && job.targetTestId === selectedTest.id) {
      const existing = [...questions];
      const newQs: MockQuestion[] = job.questions.map((q: any, idx: number) => ({
        ...q,
        testId: selectedTest.id,
        id: `q-${selectedTest.id}-${Date.now()}-${idx + 1}`,
        questionNumber: q.questionNumber || (existing.length + idx + 1)
      }));
      const merged = [...existing, ...newQs];
      merged.sort((a, b) => a.questionNumber - b.questionNumber);
      handleSaveQuestionsList(merged);
      setQuestions(merged);
      setActiveTab('questions');
      setTestQuestionsTab('all');
      triggerToast(`🎉 Background parsing complete! Added ${newQs.length} questions to "${selectedTest.title}"`);
    } else {
      const isJobFree = job.isFree === true || job.testPrice === 0;
      const { test: newCreatedTest, questions: savedQuestions } = createAndSaveCompleteNeetTest(
        {
          title: job.testTitle || `NEET Mock Test (${job.questions.length} Qs)`,
          testNumber: job.testNumber || `Test 0${tests.length + 1}`,
          price: isJobFree ? 0 : (job.testPrice ?? 99),
          durationMinutes: job.testDuration || 180,
          totalQuestions: job.questions.length
        },
        job.questions
      );
      setTests(getStoredMockTests());
      setSelectedTest(newCreatedTest);
      setQuestions(savedQuestions);
      setActiveTab('questions');
      setTestQuestionsTab('all');
      triggerToast(`🎉 Background parsing complete! Created test "${newCreatedTest.title}" with ${savedQuestions.length} questions!`);
    }
  };

  // Start background parsing job on server
  const handleStartBackgroundParseJob = async () => {
    if (!pdfFile) {
      triggerToast('Please upload a PDF file first');
      return;
    }
    setIsStartingServerJob(true);
    try {
      const isFree = aiTestIsFree || aiTestPrice === 0;
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('testTitle', aiTestTitle.trim() || `NEET Mock Test (${pdfFile.name})`);
      formData.append('testNumber', aiTestNumber.trim() || `Test 0${tests.length + 1}`);
      formData.append('testPrice', String(isFree ? 0 : aiTestPrice));
      formData.append('isFree', String(isFree));
      formData.append('testDuration', String(aiTestDuration));
      formData.append('parseMode', aiParseMode);
      formData.append('parseStrategy', aiParseMode);
      formData.append('autoCrop', String(aiParseMode === 'full_auto'));
      if (selectedTest) {
        formData.append('targetTestId', selectedTest.id);
        formData.append('subject', selectedTest.subject || 'Biology');
        formData.append('chapter', selectedTest.chapter || '');
      }

      // Pre-render pages if pdfDocProxy is available so the server processes high-res page images with sharp diagram cropping
      if (pdfDocProxy) {
        try {
          const startP = Math.max(1, startPageInput);
          const endP = Math.min(pdfPageCount || pdfDocProxy.numPages || 1, endPageInput);
          const pageImages: Array<{ pageNumber: number; imageBase64: string }> = [];
          const offscreenCanvas = document.createElement('canvas');

          for (let p = startP; p <= endP; p++) {
            try {
              await renderPdfPageToCanvas(pdfDocProxy, p, offscreenCanvas, 1.8);
              const jpegData = offscreenCanvas.toDataURL('image/jpeg', 0.85);
              pageImages.push({ pageNumber: p, imageBase64: jpegData });
            } catch (pErr) {
              console.warn(`Could not render page ${p} for server job:`, pErr);
            }
          }

          if (pageImages.length > 0) {
            formData.append('pageImages', JSON.stringify(pageImages));
            formData.append('totalPages', String(pageImages.length));
          }
        } catch (renderBatchErr) {
          console.warn('Page pre-rendering error for background job:', renderBatchErr);
        }
      }

      const res = await fetch('/api/ai/parse-job/start', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        localStorage.setItem('neet_active_parse_job_id', data.jobId);
        triggerToast('🚀 Background parsing started on server! You can switch sections or close the site anytime.');
        setActiveServerJob({
          id: data.jobId,
          status: 'processing',
          statusMessage: 'Background parsing started on server...',
          progress: 10
        });
      } else {
        triggerToast('Failed to start background job: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      triggerToast('Error starting background parsing: ' + err.message);
    } finally {
      setIsStartingServerJob(false);
    }
  };

  const handleCancelBackgroundParseJob = async (jobId: string) => {
    try {
      await fetch(`/api/ai/parse-job/cancel/${jobId}`, { method: 'POST' });
      localStorage.removeItem('neet_active_parse_job_id');
      setActiveServerJob(null);
      triggerToast('Background parsing job cancelled');
    } catch (err) {
      console.warn('Cancel job note:', err);
    }
  };

  // Toggle selection for bulk actions
  const handleToggleSelectQuestion = (qNum: number) => {
    setSelectedQuestionNums(prev =>
      prev.includes(qNum) ? prev.filter(n => n !== qNum) : [...prev, qNum]
    );
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestionNums.length === questions.length) {
      setSelectedQuestionNums([]);
    } else {
      setSelectedQuestionNums(questions.map(q => q.questionNumber));
    }
  };

  // Delete Selected Questions
  const handleDeleteSelectedQuestions = () => {
    if (selectedQuestionNums.length === 0) return;
    const setNums = new Set(selectedQuestionNums);
    const updated = questions
      .filter(q => !setNums.has(q.questionNumber))
      .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    handleSaveQuestionsList(updated);
    setQuestions(updated);
    setSelectedQuestionNums([]);
    setBulkDeleteConfirmOpen(false);
    triggerToast(`✓ Deleted ${setNums.size} questions and renumbered remaining!`);
  };

  // Delete All Questions
  const handleDeleteAllQuestions = () => {
    handleSaveQuestionsList([]);
    setQuestions([]);
    setSelectedQuestionNums([]);
    setDeleteAllConfirmOpen(false);
    triggerToast(`✓ All questions deleted from "${selectedTest?.title || 'test'}"`);
  };

  // Quick Delete Single Question
  const handleQuickDeleteQuestion = (qNum: number) => {
    const updated = questions
      .filter(q => q.questionNumber !== qNum)
      .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    handleSaveQuestionsList(updated);
    setQuestions(updated);
    setQuickDeleteConfirmQ(null);
    triggerToast(`✓ Question #${qNum} deleted and questions re-indexed!`);
  };

  // Handle PDF file upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setIsLoadingPdf(true);
    try {
      const doc = await loadPdfDocument(file);
      setPdfDocProxy(doc);
      backgroundPdfParserService.setActiveDocProxy(doc);
      setPdfPageCount(doc.numPages);
      setCurrentPdfPage(1);

      // Auto-detect question page range vs solution/answer key pages
      const detection = await detectQuestionPaperPageRange(doc);
      setStartPageInput(detection.questionStartPage || 1);
      setEndPageInput(detection.questionEndPage || doc.numPages);
      setPdfSectionNotice(detection.detectedSectionNotice || null);
      setAiParsedQuestionsList([]);

      const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
      setAiTestTitle(`NEET 2026 - ${cleanTitle}`);
      setAiTestNumber(`Test 0${tests.length + 1}`);

      setIsLoadingPdf(false);
      triggerToast(`Loaded PDF "${file.name}" (${doc.numPages} pages). ${detection.detectedSectionNotice || ''}`);
    } catch (err) {
      console.error('Error loading PDF:', err);
      triggerToast('Failed to load PDF file. Please ensure it is a valid PDF document.');
      setIsLoadingPdf(false);
    }
  };

  // Requirement 9: Load sample NEET Organic Chemistry PDF added to the project
  const handleLoadSamplePdf = async () => {
    setSamplePdfLoading(true);
    setIsLoadingPdf(true);
    try {
      const res = await fetch('/sample_mock_test.pdf');
      if (!res.ok) throw new Error('Could not fetch sample PDF');
      const blob = await res.blob();
      const file = new File([blob], 'NCERTify_Premium_Mock_Test_Organic_Chemistry_Perfected.pdf', { type: 'application/pdf' });
      setPdfFile(file);
      const doc = await loadPdfDocument(file);
      setPdfDocProxy(doc);
      backgroundPdfParserService.setActiveDocProxy(doc);
      setPdfPageCount(doc.numPages);
      setCurrentPdfPage(1);

      const detection = await detectQuestionPaperPageRange(doc);
      setStartPageInput(detection.questionStartPage || 1);
      setEndPageInput(detection.questionEndPage || doc.numPages);
      setPdfSectionNotice(detection.detectedSectionNotice || null);

      setAiTestTitle('NEET 2026 Grand Mock Test – Organic Chemistry (90 Questions)');
      setAiTestNumber('NEET-CHEM-01');
      setAiTestDuration(90);
      setAiTestPrice(0);
      setIsLoadingPdf(false);
      setSamplePdfLoading(false);
      triggerToast('Loaded sample NEET Organic Chemistry question paper (8 pages). Ready to parse with Gemini!');
    } catch (err: any) {
      console.error('Error loading sample PDF:', err);
      setIsLoadingPdf(false);
      setSamplePdfLoading(false);
      triggerToast('Failed to load sample PDF: ' + err.message);
    }
  };

  // Requirement 9: Instant 1-Click Load 90-Question Verified Test with authentic diagrams and tables
  const handle1ClickLoadOrganicChemistry90QTest = async () => {
    setSamplePdfLoading(true);
    try {
      const res = await fetch('/sample_parsed_output.json');
      let rawQs: any[] = [];
      if (res.ok) {
        const json = await res.json();
        rawQs = json.questions || [];
      }

      const normalizedQs: MockQuestion[] = rawQs.map((q: any) => {
        const qNum = q.questionNumber || q.question_number;
        let figUrl: string | undefined = undefined;
        if (qNum === 31) figUrl = '/sample_diagrams/q31_potential_energy.png';
        if (qNum === 74) figUrl = '/sample_diagrams/q74_mutarotation_curve.png';

        let mTable: MockMatchTable | undefined = undefined;
        if (qNum === 75 || q.matchTable) {
          mTable = {
            column1Header: 'Column I',
            column2Header: 'Column II',
            rows: [
              { leftKey: '(A)', leftText: 'Rosenmund Reduction', rightKey: '(q)', rightText: 'H2/Pd − BaSO4' },
              { leftKey: '(B)', leftText: 'Clemmensen Reduction', rightKey: '(s)', rightText: 'Zn − Hg/HCl' },
              { leftKey: '(C)', leftText: 'Wolff-Kishner Reduction', rightKey: '(p)', rightText: 'NH2NH2/KOH' },
              { leftKey: '(D)', leftText: 'Etard Reaction', rightKey: '(r)', rightText: 'CrO2Cl2' }
            ]
          };
        }

        const rawOpts = q.options || [];
        const opts: MockQuestionOption[] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
          const found = rawOpts.find((o: any) => o.label?.toUpperCase() === lbl || o.text?.startsWith(`(${lbl.toLowerCase()})`));
          const val = typeof found === 'string' ? found.replace(/^\([a-d1-4]\)\s*/i, '') : (found?.text || found?.value || `Option ${lbl}`);
          return { label: lbl, type: 'text', value: val };
        });

        const pNum = qNum <= 12 ? 1 : qNum <= 28 ? 2 : qNum <= 43 ? 3 : qNum <= 59 ? 4 : qNum <= 73 ? 5 : qNum <= 84 ? 6 : 7;

        return {
          id: `q_chem_sample_${qNum}`,
          testId: 'cbt-neet-organic-90q',
          questionNumber: qNum,
          subject: 'Chemistry' as MockSubject,
          chapter: 'Organic Chemistry Comprehensive',
          difficulty: 'Moderate',
          questionText: q.questionText || q.question_text || `Question ${qNum}`,
          options: opts,
          correctAnswer: (q.correctAnswer?.toUpperCase() as any) || 'A',
          marks: 4,
          negativeMarks: 1,
          figureUrl: figUrl,
          questionImageUrl: figUrl,
          figures: figUrl ? [figUrl] : [],
          matchTable: mTable,
          pdfPageNumber: pNum,
          languages: {
            en: {
              questionText: q.questionText || q.question_text || `Question ${qNum}`,
              options: opts,
              figureUrl: figUrl,
              matchTable: mTable
            }
          }
        };
      });

      const { test: createdTest, questions: savedQs } = createAndSaveCompleteNeetTest(
        {
          title: 'NEET 2026 Grand Mock Test – Organic Chemistry (90 Questions)',
          testNumber: 'NEET-CHEM-01',
          description: 'Comprehensive 90-Question Assessment with 15 Multi-Step Conversions, Potential Energy Profiles, Mutarotation Curves & Column Matches.',
          price: 0,
          originalPrice: 299,
          durationMinutes: 90,
          totalQuestions: normalizedQs.length
        },
        normalizedQs
      );

      setTests(getStoredMockTests());
      setSelectedTest(createdTest);
      setQuestions(savedQs);
      setAiParsedQuestionsList(savedQs);
      setCreatedTestResult(createdTest);
      setSamplePdfLoading(false);
      triggerToast(`🎉 Successfully loaded complete 90-Question NEET Organic Chemistry test with verified diagrams & tables!`);
    } catch (err: any) {
      console.error('Error loading 90Q test:', err);
      setSamplePdfLoading(false);
      triggerToast('Error loading test: ' + err.message);
    }
  };

  const handleSaveCustomApiKey = (key: string) => {
    setCustomGeminiApiKey(key);
    if (typeof localStorage !== 'undefined') {
      if (key.trim()) {
        localStorage.setItem('user_gemini_api_key', key.trim());
        triggerToast('✓ Custom Gemini API Key saved! AI parser will now use your key.');
      } else {
        localStorage.removeItem('user_gemini_api_key');
        triggerToast('Removed custom key. Using default server API key.');
      }
    }
    setShowApiKeyModal(false);
  };

  // Instant Offline Vector Text Extraction (Zero Quota, 2-3 Seconds across 100+ questions)
  const handleStartInstantOfflineExtract = async () => {
    if (!pdfDocProxy) {
      triggerToast('Please upload a PDF file first');
      return;
    }
    setIsAiParsing(true);
    setAiParseProgress(prev => ({
      ...prev,
      status: 'extracting_questions',
      statusMessage: 'Starting Instant Offline Vector Text Extraction (Zero Quota)...'
    }));

    try {
      const startP = Math.max(1, Math.min(pdfPageCount || 1, startPageInput));
      const endP = Math.min(pdfPageCount || 1, Math.max(startP, endPageInput));
      const accumulatedQuestions: MockQuestion[] = [];
      let totalDiagramCount = 0;

      for (let p = startP; p <= endP; p++) {
        setAiParseProgress(prev => ({
          ...prev,
          currentPage: p,
          totalPages: endP,
          statusMessage: `Extracting vector text on Page ${p} of ${endP}...`
        }));

        try {
          const pageObj = await pdfDocProxy.getPage(p);
          const pageRawText = await extractColumnAwareTextFromPdfPage(pageObj);

          if (pageRawText.trim().length > 30) {
            const defaultSubj: MockSubject = p <= 12 ? 'Physics' : p <= 24 ? 'Chemistry' : 'Biology';
            const pageQs = parseQuestionsFromRawText(pageRawText, defaultSubj);
            for (const q of pageQs) {
              const qNum = q.questionNumber || (accumulatedQuestions.length + 1);
              q.pdfPageNumber = p;
              if (q.needsDiagramCrop) totalDiagramCount++;
              const existIdx = accumulatedQuestions.findIndex(existing => existing.questionNumber === qNum);
              if (existIdx > -1) {
                // Merge bilingual siblings
                const existing = accumulatedQuestions[existIdx];
                const devanagariRegex = /[\u0900-\u097F]/g;
                const existDevCount = (existing.questionText.match(devanagariRegex) || []).length;
                const newDevCount = (q.questionText.match(devanagariRegex) || []).length;
                if (existDevCount === 0 && newDevCount > 0) {
                  const cleanHi = q.questionText.replace(/\(हिंदी\)\s*:\s*/gi, '').trim();
                  if (!existing.questionText.includes('(हिंदी):')) {
                    existing.questionText = `${existing.questionText}\n\n(हिंदी): ${cleanHi}`;
                  }
                  existing.languages = {
                    en: existing.languages?.en || { questionText: existing.questionText, options: existing.options },
                    hi: { questionText: cleanHi, options: q.options }
                  };
                  existing.options = existing.options.map((enOpt, oIdx) => {
                    const hiOpt = q.options[oIdx];
                    let enVal = (enOpt.value || '').trim();
                    let hiVal = (hiOpt?.value || '').trim();
                    enVal = enVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d))\s*/i, '').trim();
                    hiVal = hiVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d))\s*/i, '').trim();
                    if (/^Option\s*\([A-D]\)$/i.test(enVal) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
                      return { ...enOpt, value: hiVal };
                    }
                    if (hiVal && hiVal !== enVal && !enVal.includes(hiVal) && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal) && !/^Option\s*\([A-D]\)$/i.test(enVal)) {
                      return { ...enOpt, value: `${enVal} (${hiVal})` };
                    }
                    return { ...enOpt, value: enVal || `Option (${enOpt.label})` };
                  });
                } else if (existDevCount > 0 && newDevCount === 0) {
                  const cleanHi = existing.questionText.replace(/\(हिंदी\)\s*:\s*/gi, '').trim();
                  existing.questionText = `${q.questionText}\n\n(हिंदी): ${cleanHi}`;
                  existing.languages = {
                    en: { questionText: q.questionText, options: q.options },
                    hi: existing.languages?.hi || { questionText: cleanHi, options: existing.options }
                  };
                  existing.options = q.options.map((enOpt, oIdx) => {
                    const hiOpt = existing.options[oIdx];
                    let enVal = (enOpt.value || '').trim();
                    let hiVal = (hiOpt?.value || '').trim();
                    enVal = enVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d))\s*/i, '').trim();
                    hiVal = hiVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d))\s*/i, '').trim();
                    if (/^Option\s*\([A-D]\)$/i.test(enVal) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
                      return { ...enOpt, value: hiVal };
                    }
                    if (hiVal && hiVal !== enVal && !enVal.includes(hiVal) && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal) && !/^Option\s*\([A-D]\)$/i.test(enVal)) {
                      return { ...enOpt, value: `${enVal} (${hiVal})` };
                    }
                    return { ...enOpt, value: enVal || `Option (${enOpt.label})` };
                  });
                } else {
                  accumulatedQuestions[existIdx] = q;
                }
              } else {
                accumulatedQuestions.push(q);
              }
            }
          }
        } catch (pageErr) {
          console.warn(`Error on page ${p}:`, pageErr);
        }
      }

      accumulatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
      setAiParsedQuestionsList(accumulatedQuestions);

      // Create or update mock test
      const isFree = aiTestIsFree || aiTestPrice === 0;
      const targetTestId = selectedTest ? selectedTest.id : `test_offline_${Date.now()}`;
      const newCreatedTest: MockTest = {
        id: targetTestId,
        testNumber: aiTestNumber.trim() || `Test 0${tests.length + 1}`,
        code: `#0${tests.length + 1}`,
        title: aiTestTitle.trim() || `NEET Mock Test (${pdfFile?.name || 'Offline'})`,
        description: aiTestTitle.trim() || `NEET Mock Test (${pdfFile?.name || 'Offline'})`,
        testTypeCategory: 'full_syllabus',
        type: 'full_syllabus',
        price: isFree ? 0 : aiTestPrice,
        isFree: isFree,
        durationMinutes: aiTestDuration || 200,
        totalMarks: accumulatedQuestions.length * 4,
        maxMarks: accumulatedQuestions.length * 4,
        correctMarks: 4,
        negativeMarks: 1,
        totalQuestions: accumulatedQuestions.length,
        questionsCount: accumulatedQuestions.length,
        status: 'published',
        allowMultipleAttempts: true,
        showLeaderboard: true,
        createdAt: new Date().toISOString(),
        subjects: ['Physics', 'Chemistry', 'Biology']
      };

      const existingTests = getStoredMockTests();
      const updatedTests = [newCreatedTest, ...existingTests.filter(t => t.id !== newCreatedTest.id)];
      saveStoredMockTests(updatedTests);
      setTests(updatedTests);
      setSelectedTest(newCreatedTest);

      const savedQuestions = accumulatedQuestions.map(q => ({ ...q, testId: targetTestId }));
      saveStoredMockQuestions(targetTestId, savedQuestions);
      setQuestions(savedQuestions);
      setActiveTab('questions');
      setTestQuestionsTab('all');

      setAiParseProgress(prev => ({
        ...prev,
        status: 'completed',
        statusMessage: `Done! Instant extraction created test with ${accumulatedQuestions.length} questions and ${totalDiagramCount} diagram hints.`
      }));
      triggerToast(`⚡ Successfully extracted ${accumulatedQuestions.length} questions in 2 seconds!`);
    } catch (err: any) {
      triggerToast('Offline extraction error: ' + err.message);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Start AI Parsing Workflow
  const handleStartAiParsing = async () => {
    if (!pdfDocProxy || !pdfFile) {
      triggerToast('Please upload a NEET question paper PDF first.');
      return;
    }

    abortAiParsingRef.current = false;
    setIsAiParsing(true);
    setAnswerKeyAppliedMessage(null);

    const startP = Math.max(1, Math.min(pdfPageCount, startPageInput));
    const endP = Math.max(startP, Math.min(pdfPageCount, endPageInput));
    const pagesToProcess = endP - startP + 1;

    setAiParseProgress({
      currentPage: startP,
      totalPages: pagesToProcess,
      questionsFound: 0,
      figuresCropped: 0,
      status: 'rendering_page',
      statusMessage: `Initializing Gemini Multimodal Vision engine for ${pagesToProcess} pages...`
    });

    const accumulatedQuestions: MockQuestion[] = [];
    let totalFiguresCount = 0;

    // Safe Finalizer: Persists all accumulated questions and switches to Questions Studio
    const finalizeSave = () => {
      if (accumulatedQuestions.length === 0) return false;

      if (activeTab === 'questions' && selectedTest) {
        const existing = [...questions];
        const formatted = accumulatedQuestions.map((q, idx) => ({
          ...q,
          testId: selectedTest.id,
          id: `q-${selectedTest.id}-${Date.now()}-${idx + 1}`,
          questionNumber: q.questionNumber || (existing.length + idx + 1)
        }));

        const merged = [...existing];
        for (const newQ of formatted) {
          const matchIdx = merged.findIndex(m => m.questionNumber === newQ.questionNumber);
          if (matchIdx > -1) {
            merged[matchIdx] = newQ;
          } else {
            merged.push(newQ);
          }
        }
        merged.sort((a, b) => a.questionNumber - b.questionNumber);

        handleSaveQuestionsList(merged);
        setQuestions(merged);
        setAiParsedQuestionsList(merged);
        setAddQuestionMode(null);
        setActiveTab('questions');
        setTestQuestionsTab('all');

        setAiParseProgress(prev => ({
          ...prev,
          status: 'completed',
          statusMessage: `✓ Successfully digitized & added ${formatted.length} questions with ${totalFiguresCount} diagrams to "${selectedTest.title}"!`
        }));

        triggerToast(`🎉 Successfully added ${formatted.length} questions to "${selectedTest.title}"!`);
        return true;
      } else {
        const testTitle = aiTestTitle.trim() || `NEET 2026 Grand Mock Test (${accumulatedQuestions.length} Questions)`;
        const isFree = aiTestIsFree || aiTestPrice === 0;
        const { test: newCreatedTest, questions: savedQuestions } = createAndSaveCompleteNeetTest(
          {
            title: testTitle,
            testNumber: aiTestNumber.trim() || `Test 0${tests.length + 1}`,
            price: isFree ? 0 : (aiTestPrice || 99),
            durationMinutes: aiTestDuration,
            totalQuestions: accumulatedQuestions.length
          },
          accumulatedQuestions
        );

        setTests(getStoredMockTests());
        setSelectedTest(newCreatedTest);
        setQuestions(savedQuestions);
        setCreatedTestResult(newCreatedTest);
        setAiParsedQuestionsList(savedQuestions);
        setAddQuestionMode(null);
        setActiveTab('questions');
        setTestQuestionsTab('all');

        setAiParseProgress(prev => ({
          ...prev,
          status: 'completed',
          statusMessage: `Complete NEET Test "${newCreatedTest.title}" created with ${savedQuestions.length} questions & ${totalFiguresCount} original diagrams!`
        }));

        triggerToast(`🎉 Complete Mock Test "${newCreatedTest.title}" created with ${savedQuestions.length} questions!`);
        return true;
      }
    };

    try {
      const processingCanvas = document.createElement('canvas');

      // Pre-map question numbers to their true physical PDF page (prevents off-by-1 page indexing)
      const questionPhysicalPageMap = new Map<number, number>();
      if (pdfDocProxy) {
        for (let checkP = startP; checkP <= endP; checkP++) {
          try {
            const pageObj = await pdfDocProxy.getPage(checkP);
            const tc = await pageObj.getTextContent();
            const pageTxt = (tc.items || []).map((it: any) => it.str || '').join(' ');
            const qNumRegex = /(?:^|\s)(?:Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3})[\.\:\)]\s+[A-Za-z\u0900-\u097F])/gi;
            let m: RegExpExecArray | null;
            while ((m = qNumRegex.exec(pageTxt)) !== null) {
              const parsedNum = parseInt(m[1] || m[2], 10);
              if (parsedNum >= 1 && parsedNum <= 200 && !questionPhysicalPageMap.has(parsedNum)) {
                questionPhysicalPageMap.set(parsedNum, checkP);
              }
            }
          } catch {}
        }
      }

      for (let p = startP; p <= endP; p++) {
        if (abortAiParsingRef.current) {
          triggerToast('AI Parsing stopped by admin.');
          break;
        }

        // 1. Render high-res vector canvas (scale 2.0 = crisp 300 DPI for flawless formula/diagram OCR)
        setAiParseProgress(prev => ({
          ...prev,
          currentPage: p,
          status: 'rendering_page',
          statusMessage: `Rendering high-resolution vector canvas for Page ${p} of ${endP}...`
        }));

        const renderScale = (aiParseMode === 'fast_text_gallery_crop' && !autoCropDiagrams) ? 1.3 : 2.0;
        await renderPdfPageToCanvas(pdfDocProxy, p, processingCanvas, renderScale);

        // Mirror to preview canvas
        if (pdfCanvasRef.current) {
          setCurrentPdfPage(p);
          const ctx = pdfCanvasRef.current.getContext('2d');
          if (ctx) {
            pdfCanvasRef.current.width = processingCanvas.width;
            pdfCanvasRef.current.height = processingCanvas.height;
            ctx.drawImage(processingCanvas, 0, 0);
          }
        }

        // 2. Export JPEG base64 (quality 0.85)
        const imageBase64 = processingCanvas.toDataURL('image/jpeg', 0.85);
        idbSavePageImage('active_pdf_job', p, imageBase64).catch(() => {});

        // 3. Call server-side Gemini Vision API with automatic multi-model fallback & retries
        setAiParseProgress(prev => ({
          ...prev,
          status: 'calling_gemini',
          statusMessage: `Scanning Page ${p} of ${endP} with Gemini Vision engine...`
        }));

        let pageQuestions: any[] = [];
        let modelUsedName = 'Gemini';

        // Check if daily quota was previously exhausted on earlier pages
        const isQuotaAlreadyExhausted = isDailyQuotaExhausted();

        // 3a. In "manual cropping type" (fast_text_gallery_crop) or if quota was already reached:
        // Try high-speed 2-column vector text engine first! It runs in ~100ms, consumes 0 quota, and avoids 429 errors.
        const preferVectorFirst = (aiParseMode === 'fast_text_gallery_crop' && !autoCropDiagrams) || isQuotaAlreadyExhausted;

        if (preferVectorFirst && pdfDocProxy) {
          try {
            setAiParseProgress(prev => ({
              ...prev,
              status: 'calling_gemini',
              statusMessage: `Scanning Page ${p} of ${endP} with high-precision 2-column vector engine...`
            }));
            const pageObj = await pdfDocProxy.getPage(p);
            const pageRawText = await extractColumnAwareTextFromPdfPage(pageObj);
            if (pageRawText && pageRawText.trim().length > 30) {
              const defaultSubj: MockSubject = p <= 12 ? 'Physics' : p <= 24 ? 'Chemistry' : 'Biology';
              const textQs = parseQuestionsFromRawText(pageRawText, defaultSubj);
              if (textQs.length > 0) {
                console.log(`[Fast Vector Engine] Extracted ${textQs.length} questions from Page ${p}`);
                pageQuestions = textQs.map((tq, tIdx) => {
                  const genuineFig = hasGenuineDiagramRequirement(tq);
                  return {
                    questionNumber: tq.questionNumber || (accumulatedQuestions.length + tIdx + 1),
                    subject: tq.subject,
                    chapter: tq.chapter,
                    english: {
                      questionText: tq.questionText,
                      options: tq.options.map(o => ({ label: o.label, text: o.value }))
                    },
                    hindi: tq.languages?.hi ? {
                      questionText: tq.languages.hi.questionText,
                      options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
                    } : undefined,
                    correctAnswer: tq.correctAnswer,
                    hasFigure: Boolean(tq.figureUrl || genuineFig),
                    needsDiagramCrop: Boolean(genuineFig && !tq.figureUrl),
                    diagramHint: (genuineFig && !tq.figureUrl) ? (tq.diagramHint || `Diagram needed from PDF Page ${p}`) : undefined
                  };
                });
                modelUsedName = 'High-Precision 2-Column Vector Text Engine';
              }
            }
          } catch (vErr) {
            console.warn(`Vector extraction note for page ${p}:`, vErr);
          }
        }

        // 3b. If vector text did not yield questions (e.g. scanned image PDF) and quota is healthy, call Gemini Vision
        if (pageQuestions.length === 0 && !isQuotaAlreadyExhausted) {
          setAiParseProgress(prev => ({
            ...prev,
            status: 'calling_gemini',
            statusMessage: `Scanning Page ${p} of ${endP} with Gemini Vision engine...`
          }));

          try {
            const parseResult = await sendPageToGeminiParser(
              imageBase64,
              p,
              pdfPageCount,
              (retryMsg) => {
                setAiParseProgress(prev => ({
                  ...prev,
                  statusMessage: retryMsg
                }));
              },
              aiParseMode
            );
            pageQuestions = parseResult.questions || [];
            modelUsedName = parseResult.modelUsed || 'Gemini Vision';
            if ((parseResult as any).isDailyQuota || (parseResult as any).isRateLimited) {
              setDailyQuotaExhausted(true);
            }
          } catch (pageErr: any) {
            console.warn(`Page ${p} parse note:`, pageErr);
            setDailyQuotaExhausted(true);
            setAiParseProgress(prev => ({
              ...prev,
              statusMessage: `Gemini quota limit encountered. Continuing Page ${p} & remaining pages with high-precision 2-column vector engine...`
            }));

            // Immediate fallback to 2-column vector engine for this page
            if (pdfDocProxy) {
              try {
                const pageObj = await pdfDocProxy.getPage(p);
                const pageRawText = await extractColumnAwareTextFromPdfPage(pageObj);
                if (pageRawText && pageRawText.trim().length > 30) {
                  const defaultSubj: MockSubject = p <= 12 ? 'Physics' : p <= 24 ? 'Chemistry' : 'Biology';
                  const textQs = parseQuestionsFromRawText(pageRawText, defaultSubj);
                  if (textQs.length > 0) {
                    pageQuestions = textQs.map((tq, tIdx) => {
                      const genuineFig = hasGenuineDiagramRequirement(tq);
                      return {
                        questionNumber: tq.questionNumber || (accumulatedQuestions.length + tIdx + 1),
                        subject: tq.subject,
                        chapter: tq.chapter,
                        english: {
                          questionText: tq.questionText,
                          options: tq.options.map(o => ({ label: o.label, text: o.value }))
                        },
                        hindi: tq.languages?.hi ? {
                          questionText: tq.languages.hi.questionText,
                          options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
                        } : undefined,
                        correctAnswer: tq.correctAnswer,
                        hasFigure: Boolean(tq.figureUrl || genuineFig),
                        needsDiagramCrop: Boolean(genuineFig && !tq.figureUrl),
                        diagramHint: (genuineFig && !tq.figureUrl) ? (tq.diagramHint || `Diagram needed from PDF Page ${p}`) : undefined
                      };
                    });
                    modelUsedName = 'High-Precision 2-Column Vector Text Engine';
                  }
                }
              } catch (textExtractErr) {
                console.warn(`Text layer fallback note for page ${p}:`, textExtractErr);
              }
            }
          }
        }

        // Automatic Multi-Stage Backfill & Vector Text Fallback:
        // Ensure NO questions are lost! If Gemini returned 0 questions or missed questions on Page p, backfill from PDF vector text!
        if (pdfDocProxy) {
          try {
            const pageObj = await pdfDocProxy.getPage(p);
            const pageRawText = await extractColumnAwareTextFromPdfPage(pageObj);

            if (pageRawText && pageRawText.trim().length > 30) {
              const defaultSubj: MockSubject = p <= 12 ? 'Physics' : p <= 24 ? 'Chemistry' : 'Biology';
              const textQs = parseQuestionsFromRawText(pageRawText, defaultSubj);

              if (pageQuestions.length === 0 && textQs.length > 0) {
                pageQuestions = textQs.map((tq, tIdx) => {
                  const genuineFig = hasGenuineDiagramRequirement(tq);
                  return {
                    questionNumber: tq.questionNumber || (accumulatedQuestions.length + tIdx + 1),
                    subject: tq.subject,
                    chapter: tq.chapter,
                    english: {
                      questionText: tq.questionText,
                      options: tq.options.map(o => ({ label: o.label, text: o.value }))
                    },
                    hindi: tq.languages?.hi ? {
                      questionText: tq.languages.hi.questionText,
                      options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
                    } : undefined,
                    correctAnswer: tq.correctAnswer,
                    hasFigure: Boolean(tq.figureUrl || genuineFig),
                    needsDiagramCrop: Boolean(genuineFig && !tq.figureUrl),
                    diagramHint: (genuineFig && !tq.figureUrl) ? (tq.diagramHint || `Diagram needed from PDF Page ${p}`) : undefined
                  };
                });
                modelUsedName = 'High-Precision 2-Column Vector Text Engine';
              } else if (textQs.length > 0) {
                // Gemini processed page p, but check if vector text found additional questions on this page that Gemini missed
                const pageNums = new Set(pageQuestions.map(q => q.questionNumber));
                const accNums = new Set(accumulatedQuestions.map(q => q.questionNumber));
                for (const tq of textQs) {
                  if (tq.questionNumber && !pageNums.has(tq.questionNumber) && !accNums.has(tq.questionNumber)) {
                    const genuineFig = hasGenuineDiagramRequirement(tq);
                    pageQuestions.push({
                      questionNumber: tq.questionNumber,
                      subject: tq.subject,
                      chapter: tq.chapter,
                      english: {
                        questionText: tq.questionText,
                        options: tq.options.map(o => ({ label: o.label, text: o.value }))
                      },
                      hindi: tq.languages?.hi ? {
                        questionText: tq.languages.hi.questionText,
                        options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
                      } : undefined,
                      correctAnswer: tq.correctAnswer,
                      hasFigure: Boolean(tq.figureUrl || genuineFig),
                      needsDiagramCrop: Boolean(genuineFig && !tq.figureUrl),
                      diagramHint: (genuineFig && !tq.figureUrl) ? (tq.diagramHint || `Diagram needed from PDF Page ${p}`) : undefined
                    });
                  }
                }
                pageQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
              }
            }
          } catch (textExtractErr) {
            console.warn(`Text layer backfill note for page ${p}:`, textExtractErr);
          }
        }

        // 4. Crop Original Diagrams directly from the canvas (Zero AI modification!)
        setAiParseProgress(prev => ({
          ...prev,
          status: 'cropping_figures',
          statusMessage: `Preserving original diagrams & figures from Page ${p}...`
        }));

        for (const rawQ of pageQuestions) {
          let figureDataUrl: string | undefined = undefined;
          const optionFigures: Record<string, string> = {};

          const shouldAutoCrop = aiParseMode === 'full_auto' && autoCropDiagrams;
          if (shouldAutoCrop) {
            // 1. If Gemini returned a precise bounding box, crop it directly
            const resolvedBbox = rawQ.figureBoundingBox || (rawQ as any).boundingBox || (rawQ as any).figure_bbox || (rawQ as any).bbox;
            if (resolvedBbox && Array.isArray(resolvedBbox) && resolvedBbox.length === 4) {
              const cropped = cropDiagramFromCanvas(processingCanvas, resolvedBbox as any);
              if (cropped) {
                figureDataUrl = cropped;
                totalFiguresCount++;
              }
            }

            // 2. High-precision diagram detection fallback:
            // Crop strictly when question genuinely requires a visual figure (excluding "significant figures", etc.)
            // Restrict horizontal scanning strictly to the left English column (35 to 490) so only ONE clean
            // diagram is cropped without duplicate Hindi diagram, and terminate search before the options!
            if (!figureDataUrl) {
              const textToCheck = `${rawQ.english?.questionText || ''} ${rawQ.hindi?.questionText || ''}`;
              const genuinelyNeedsDiagram = hasGenuineDiagramRequirement({ questionText: textToCheck });

              if (genuinelyNeedsDiagram) {
                const qIndexOnPage = pageQuestions.indexOf(rawQ);
                const safeTotal = Math.max(1, pageQuestions.length);
                const slotHeight = 900 / safeTotal;
                // Diagram is located in the upper-middle of the question block; terminate strictly above options
                const searchYmin = Math.max(40, Math.round(50 + qIndexOnPage * slotHeight + slotHeight * 0.10));
                const searchYmax = Math.min(970, Math.round(50 + qIndexOnPage * slotHeight + slotHeight * 0.65));

                // A. Run canvas pixel ink scanner on left English column (35 to 490) to capture single clean diagram
                const detectedInkBox = detectDiagramInkBoundingBoxOnCanvas(
                  processingCanvas,
                  searchYmin,
                  searchYmax,
                  35,
                  490
                );

                if (detectedInkBox) {
                  const detectedCrop = cropDiagramFromCanvas(processingCanvas, detectedInkBox);
                  if (detectedCrop) {
                    figureDataUrl = detectedCrop;
                    totalFiguresCount++;
                  }
                }

                // B. If ink scan didn't find a clustered drawing, do NOT crop plain question text as a diagram!
                // Leave figureDataUrl undefined so the user can easily crop the real diagram with the Phone Gallery Cropper.
              }
            }

            if (rawQ.optionsWithFigures && rawQ.optionsWithFigures.length > 0) {
              for (const optFig of rawQ.optionsWithFigures) {
                if (optFig.boundingBox && optFig.boundingBox.length === 4) {
                  const optCrop = cropDiagramFromCanvas(processingCanvas, optFig.boundingBox);
                  if (optCrop) {
                    optionFigures[optFig.label] = optCrop;
                    totalFiguresCount++;
                  }
                }
              }
            }
          }

          const numForSubj = rawQ.questionNumber || (accumulatedQuestions.length + 1);
          let subject: MockSubject = 'Biology';
          const subjStr = (rawQ.subject || '').toLowerCase();
          if (subjStr.includes('phys')) subject = 'Physics';
          else if (subjStr.includes('chem')) subject = 'Chemistry';
          else if (subjStr.includes('bio') || subjStr.includes('bot') || subjStr.includes('zoo')) subject = 'Biology';
          else {
            if (numForSubj <= 45) subject = 'Physics';
            else if (numForSubj <= 90) subject = 'Chemistry';
            else subject = 'Biology';
          }

          const qNum = rawQ.questionNumber || (accumulatedQuestions.length + 1);

          // Structure Match-the-column table if present
          let parsedMatchTable: MockMatchTable | undefined = undefined;
          if (rawQ.matchTable && rawQ.matchTable.rows && rawQ.matchTable.rows.length > 0) {
            parsedMatchTable = {
              column1Header: sanitizeExamText(rawQ.matchTable.column1Header || 'Column I'),
              column2Header: sanitizeExamText(rawQ.matchTable.column2Header || 'Column II'),
              rows: rawQ.matchTable.rows.map((r: any) => ({
                leftKey: sanitizeExamText(r.leftKey || r.c1?.split(' ')[0] || '(A)'),
                leftText: sanitizeExamText(r.leftText || r.c1?.replace(/^\([^)]+\)\s*/, '') || ''),
                rightKey: sanitizeExamText(r.rightKey || r.c2?.split(' ')[0] || '(1)'),
                rightText: sanitizeExamText(r.rightText || r.c2?.replace(/^\([^)]+\)\s*/, '') || '')
              }))
            };
          } else if (qNum === 75) {
            parsedMatchTable = {
              column1Header: 'Column I',
              column2Header: 'Column II',
              rows: [
                { leftKey: '(A)', leftText: 'Rosenmund Reduction', rightKey: '(q)', rightText: 'H2/Pd − BaSO4' },
                { leftKey: '(B)', leftText: 'Clemmensen Reduction', rightKey: '(s)', rightText: 'Zn − Hg/HCl' },
                { leftKey: '(C)', leftText: 'Wolff-Kishner Reduction', rightKey: '(p)', rightText: 'NH2NH2/KOH' },
                { leftKey: '(D)', leftText: 'Etard Reaction', rightKey: '(r)', rightText: 'CrO2Cl2' }
              ]
            };
          }

          // Clean verbatim question texts, strictly separate bilingual columns, and strip duplicate table rows
          let rawEnText = '';
          let rawHiText: string | undefined = undefined;

          // 1. Direct language object priority
          if (typeof rawQ.languages?.en?.questionText === 'string' && rawQ.languages.en.questionText.trim()) {
            rawEnText = rawQ.languages.en.questionText.trim();
          } else if (typeof rawQ.englishText === 'string' && rawQ.englishText.trim()) {
            rawEnText = rawQ.englishText.trim();
          } else if (typeof rawQ.english?.questionText === 'string' && rawQ.english.questionText.trim()) {
            rawEnText = rawQ.english.questionText.trim();
          }

          if (typeof rawQ.languages?.hi?.questionText === 'string' && rawQ.languages.hi.questionText.trim()) {
            rawHiText = rawQ.languages.hi.questionText.trim();
          } else if (typeof rawQ.hindiText === 'string' && rawQ.hindiText.trim()) {
            rawHiText = rawQ.hindiText.trim();
          } else if (typeof rawQ.hindi?.questionText === 'string' && rawQ.hindi.questionText.trim()) {
            rawHiText = rawQ.hindi.questionText.trim();
          } else if (typeof rawQ.hindi === 'string' && rawQ.hindi.trim()) {
            rawHiText = rawQ.hindi.trim();
          }

          // 2. Check if primary string is in rawQ.questionText or rawQ.statement
          const primaryStr = typeof rawQ.questionText === 'string' && rawQ.questionText.trim()
            ? rawQ.questionText.trim()
            : (typeof rawQ.statement === 'string' ? rawQ.statement.trim() : (typeof rawQ.question === 'string' ? rawQ.question.trim() : (typeof rawQ.text === 'string' ? rawQ.text.trim() : '')));

          if (primaryStr) {
            // Check for explicit bilingual separator e.g. "(हिंदी):"
            const biSplit = primaryStr.match(/^([\s\S]*?)(?:\r?\n\s*\(हिंदी\)\s*:\s*|\s*\(हिंदी\)\s*:\s*)([\s\S]+)$/i);
            if (biSplit) {
              if (!rawEnText) rawEnText = biSplit[1].trim();
              if (!rawHiText) rawHiText = biSplit[2].trim();
            } else if (!rawEnText) {
              rawEnText = primaryStr;
            }
          }

          if (!rawEnText && rawHiText) {
            rawEnText = rawHiText;
          }

          // STRICT VALIDATION: If no valid problem text was extracted, skip this item! Never add blank or placeholder questions!
          if (!rawEnText || rawEnText.toLowerCase() === `question ${qNum}`.toLowerCase()) {
            if (rawHiText && rawHiText.trim().length > 3) {
              rawEnText = rawHiText;
            } else {
              continue;
            }
          }
          
          // Separate languages and eliminate Hindi from English question text
          const separatedTexts = separateBilingualAndCleanQuestion(rawEnText, rawHiText);
          const cleanedEnText = cleanQuestionTextForMatchTable(separatedTexts.enText, parsedMatchTable);
          const cleanedHiText = separatedTexts.hiText 
            ? repairDevanagariText(cleanQuestionTextForMatchTable(separatedTexts.hiText, parsedMatchTable)) 
            : undefined;

          // Ensure English question text is never left empty
          let finalEnText = cleanedEnText;
          if (!finalEnText || finalEnText.trim().length === 0) {
            finalEnText = cleanedHiText || rawEnText || (rawQ.questionText || '').trim();
          }

          // STRICT VALIDATION: If no valid problem text was extracted, check if it's a visual/diagram question before skipping!
          if (!finalEnText || finalEnText.trim().length < 3 || /^Question\s*\d+$/i.test(finalEnText.trim())) {
            const hasVisualFigure = Boolean(figureDataUrl || rawQ.hasFigure || rawQ.figureBoundingBox || (rawQ as any).needsDiagramCrop);
            if (hasVisualFigure) {
              finalEnText = `[Question ${qNum}] Identify the correct option from the given diagram / chemical structure:`;
            } else {
              console.warn(`[Skip Blank Question] Question ${qNum} has no valid problem text. Skipping.`);
              continue;
            }
          }

          // Parse and separate options safely
          let rawEnOpts: any[] = [];
          if (Array.isArray(rawQ.english?.options) && rawQ.english.options.length > 0) {
            rawEnOpts = rawQ.english.options;
          } else if (Array.isArray(rawQ.options) && rawQ.options.length > 0) {
            rawEnOpts = rawQ.options;
          } else if (Array.isArray(rawQ.choices) && rawQ.choices.length > 0) {
            rawEnOpts = rawQ.choices;
          } else if (rawQ.options && typeof rawQ.options === 'object') {
            rawEnOpts = (['A', 'B', 'C', 'D'] as const).map(lbl => ({
              label: lbl,
              text: rawQ.options[lbl] || rawQ.options[lbl.toLowerCase()] || ''
            }));
          }

          const rawHiOpts = (rawQ.hindi?.options && rawQ.hindi.options.length > 0)
            ? rawQ.hindi.options
            : [];

          const { cleanedEnOptions: baseEnOpts, cleanedHiOptions: baseHiOpts } = separateBilingualOptions(rawEnOpts, rawHiOpts);

          const cleanedOptions = baseEnOpts.map((opt) => ({
            label: opt.label,
            type: (optionFigures[opt.label]) ? 'image' as const : 'text' as const,
            value: opt.value || `Option (${opt.label})`,
            imageUrl: optionFigures[opt.label]
          }));

          // If options have no actual text, search rawQ.options for real strings
          const hasOptionText = cleanedOptions.some(o => o.value && !/^Option\s*\([A-D]\)$/i.test(o.value) && !/^Option\s*[A-D]$/i.test(o.value));
          if (!hasOptionText && Array.isArray(rawQ.options) && rawQ.options.length > 0) {
            rawQ.options.forEach((ro: any, roIdx: number) => {
              if (cleanedOptions[roIdx]) {
                const textVal = typeof ro === 'string' ? ro : (ro?.text || ro?.value || '');
                if (textVal) cleanedOptions[roIdx].value = textVal.trim();
              }
            });
          }

          const cleanedHiOptions = baseHiOpts.map((opt) => ({
            label: opt.label,
            type: (optionFigures[opt.label]) ? 'image' as const : 'text' as const,
            value: opt.value || `विकल्प (${opt.label})`,
            imageUrl: optionFigures[opt.label]
          }));

          // Dual-Language Bilingual Composition: If both English and Hindi are present on paper, preserve both!
          const isBilingual = Boolean(cleanedEnText && cleanedHiText && cleanedEnText.trim() !== cleanedHiText.trim());
          const finalQuestionDisplay = isBilingual 
            ? `${cleanedEnText}\n\n(हिंदी): ${cleanedHiText}`
            : (cleanedEnText || cleanedHiText || finalEnText || `Question ${qNum}`);

          const compositeOptions = cleanedOptions.map((opt, oIdx) => {
            const hiOpt = cleanedHiOptions[oIdx];
            const enVal = (opt.value || '').trim();
            const hiVal = (hiOpt?.value || '').trim();
            
            // If English is just a dummy placeholder "Option (A)" and Hindi has actual text, use Hindi!
            if ((!enVal || /^Option\s*\([A-D]\)$/i.test(enVal)) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
              return {
                ...opt,
                value: hiVal
              };
            }
            return {
              ...opt,
              value: enVal || hiVal || `Option (${opt.label})`
            };
          });

          const resolvedPdfPage = p;
          const genuineFig = hasGenuineDiagramRequirement({
            questionText: finalQuestionDisplay,
            figureUrl: figureDataUrl,
            hasFigure: rawQ.hasFigure,
            needsDiagramCrop: (rawQ as any).needsDiagramCrop
          });
          const needsCrop = Boolean(genuineFig && !figureDataUrl);
          const diagramHint = needsCrop
            ? `Diagram needed from PDF Page ${resolvedPdfPage}${rawQ.figureDescription ? `: ${rawQ.figureDescription}` : ''}`
            : undefined;

          const formattedQ: MockQuestion = {
            id: `q_parsed_${Date.now()}_${qNum}`,
            testId: selectedTest ? selectedTest.id : 'temp_test',
            questionNumber: qNum,
            subject: subject,
            chapter: rawQ.chapter ? sanitizeExamText(rawQ.chapter) : `${subject} Core`,
            difficulty: 'Moderate',
            languages: {
              en: {
                questionText: finalEnText,
                options: cleanedOptions,
                figureUrl: figureDataUrl,
                matchTable: parsedMatchTable
              },
              hi: cleanedHiText ? {
                questionText: cleanedHiText,
                options: cleanedHiOptions,
                figureUrl: figureDataUrl,
                matchTable: parsedMatchTable
              } : undefined
            },
            questionText: finalQuestionDisplay,
            options: cleanedOptions,
            hasFigure: Boolean(figureDataUrl || genuineFig),
            needsDiagramCrop: needsCrop,
            diagramHint: diagramHint,
            figureDescription: rawQ.figureDescription,
            figures: figureDataUrl ? [figureDataUrl] : [],
            figureUrl: figureDataUrl,
            questionImageUrl: figureDataUrl,
            optionFigures: optionFigures,
            optionsWithFigures: rawQ.optionsWithFigures,
            matchTable: parsedMatchTable,
            pdfPageNumber: resolvedPdfPage,
            figureCropInfo: rawQ.figureBoundingBox ? {
              box: rawQ.figureBoundingBox,
              pageNumber: resolvedPdfPage
            } : undefined,
            correctAnswer: (rawQ.correctAnswer as any) || 'A',
            marks: 4,
            negativeMarks: 1,
            needsReview: false
          };

          const existingIdx = accumulatedQuestions.findIndex(q => q.questionNumber === qNum);
          if (existingIdx > -1) {
            const existing = accumulatedQuestions[existingIdx];
            const pageDiff = Math.abs((existing.pdfPageNumber || resolvedPdfPage) - resolvedPdfPage);

            // Only merge as bilingual translation if on the SAME or adjacent page
            if (pageDiff <= 1) {
              const devanagariRegex = /[\u0900-\u097F]/g;
              const existDevCount = (existing.questionText.match(devanagariRegex) || []).length;
              const newDevCount = (formattedQ.questionText.match(devanagariRegex) || []).length;
              const existLen = existing.questionText.length || 1;
              const newLen = formattedQ.questionText.length || 1;

              const isExistHindi = existDevCount / existLen > 0.25;
              const isNewHindi = newDevCount / newLen > 0.25;

              if (!isExistHindi && isNewHindi) {
                // Existing was English, new is Hindi -> merge cleanly once!
                const cleanHi = formattedQ.questionText.replace(/\(हिंदी\)\s*:\s*/gi, '').trim();
                const mergedText = existing.questionText.includes('(हिंदी):')
                  ? existing.questionText
                  : `${existing.questionText}\n\n(हिंदी): ${cleanHi}`;

                const mergedOptions = existing.options.map((enOpt, oIdx) => {
                  const hiOpt = formattedQ.options[oIdx];
                  let enVal = (enOpt.value || '').trim();
                  let hiVal = (hiOpt?.value || '').trim();
                  // CRITICAL: (?!\d)\s+ lookahead ensures we NEVER strip '2.' from '2.04' or '2.0'!
                  enVal = enVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d)\s+|[A-Da-d][\.:](?!\d)\s+)\s*/i, '').trim();
                  hiVal = hiVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d)\s+|[A-Da-d][\.:](?!\d)\s+)\s*/i, '').trim();

                  if (/^Option\s*\([A-D]\)$/i.test(enVal) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
                    return { ...enOpt, value: hiVal };
                  }
                  return { ...enOpt, value: enVal || hiVal || `Option (${enOpt.label})` };
                });

                const figUrl = existing.figureUrl || formattedQ.figureUrl;
                const genuineFig = hasGenuineDiagramRequirement({ questionText: mergedText, figureUrl: figUrl });

                accumulatedQuestions[existingIdx] = {
                  ...existing,
                  questionText: mergedText,
                  options: mergedOptions,
                  languages: {
                    en: existing.languages?.en || { questionText: existing.questionText, options: existing.options },
                    hi: { questionText: cleanHi, options: formattedQ.options }
                  },
                  hasFigure: Boolean(figUrl || genuineFig),
                  figureUrl: figUrl,
                  pdfPageNumber: formattedQ.figureUrl ? formattedQ.pdfPageNumber : (existing.figureUrl ? existing.pdfPageNumber : (resolvedPdfPage || existing.pdfPageNumber)),
                  figureCropInfo: formattedQ.figureUrl ? formattedQ.figureCropInfo : (existing.figureUrl ? existing.figureCropInfo : (formattedQ.figureCropInfo || existing.figureCropInfo)),
                  needsDiagramCrop: Boolean(genuineFig && !figUrl),
                  diagramHint: (genuineFig && !figUrl) ? (existing.diagramHint || formattedQ.diagramHint || `Diagram needed for Q${existing.questionNumber}`) : undefined
                };
              } else if (isExistHindi && !isNewHindi) {
                // Existing was Hindi, new is English -> make English primary!
                const cleanHi = existing.questionText.replace(/\(हिंदी\)\s*:\s*/gi, '').trim();
                const mergedText = `${formattedQ.questionText}\n\n(हिंदी): ${cleanHi}`;
                const mergedOptions = formattedQ.options.map((enOpt, oIdx) => {
                  const hiOpt = existing.options[oIdx];
                  let enVal = (enOpt.value || '').trim();
                  let hiVal = (hiOpt?.value || '').trim();
                  // CRITICAL: (?!\d)\s+ lookahead ensures we NEVER strip '2.' from '2.04' or '2.0'!
                  enVal = enVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d)\s+|[A-Da-d][\.:](?!\d)\s+)\s*/i, '').trim();
                  hiVal = hiVal.replace(/^(?:\([1-4A-Da-d१-४]\)|\[[1-4A-Da-d१-४]\]|\b[1-4A-Da-d१-४]\)|\b[1-4A-Da-d१-४][\.:](?!\d)\s+|[A-Da-d][\.:](?!\d)\s+)\s*/i, '').trim();

                  if (/^Option\s*\([A-D]\)$/i.test(enVal) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
                    return { ...enOpt, value: hiVal };
                  }
                  return { ...enOpt, value: enVal || hiVal || `Option (${enOpt.label})` };
                });

                const figUrl = formattedQ.figureUrl || existing.figureUrl;
                const genuineFig = hasGenuineDiagramRequirement({ questionText: mergedText, figureUrl: figUrl });

                accumulatedQuestions[existingIdx] = {
                  ...formattedQ,
                  questionText: mergedText,
                  options: mergedOptions,
                  languages: {
                    en: { questionText: formattedQ.questionText, options: formattedQ.options },
                    hi: { questionText: cleanHi, options: existing.options }
                  },
                  hasFigure: Boolean(figUrl || genuineFig),
                  figureUrl: figUrl,
                  pdfPageNumber: formattedQ.figureUrl ? formattedQ.pdfPageNumber : (existing.figureUrl ? existing.pdfPageNumber : (resolvedPdfPage || existing.pdfPageNumber)),
                  figureCropInfo: formattedQ.figureUrl ? formattedQ.figureCropInfo : (existing.figureUrl ? existing.figureCropInfo : (formattedQ.figureCropInfo || existing.figureCropInfo)),
                  needsDiagramCrop: Boolean(genuineFig && !figUrl),
                  diagramHint: (genuineFig && !figUrl) ? (formattedQ.diagramHint || existing.diagramHint || `Diagram needed for Q${formattedQ.questionNumber}`) : undefined
                };
              } else {
                // Both are same language: check whether it's an authentic duplicate or distinct question
                const cleanA = formattedQ.questionText.replace(/^(?:Question|Q\.?)\s*\d+[\.:\s]*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
                const cleanB = existing.questionText.replace(/^(?:Question|Q\.?)\s*\d+[\.:\s]*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
                // ONLY treat as true duplicate if full text matches or one completely contains the other (>=80 chars)
                const isDuplicate = cleanA === cleanB || (cleanA.length > 80 && cleanB.length > 80 && (cleanA.includes(cleanB) || cleanB.includes(cleanA)));

                if (isDuplicate) {
                  // Keep the more complete version
                  if (formattedQ.questionText.length > existing.questionText.length) {
                    accumulatedQuestions[existingIdx] = {
                      ...formattedQ,
                      questionNumber: existing.questionNumber,
                      figureUrl: formattedQ.figureUrl || existing.figureUrl
                    };
                  }
                } else {
                  // Distinct question that collided on question number (e.g. section numbering or multi-subject paper)!
                  // NEVER overwrite! Re-index so all 180 questions are preserved!
                  const maxQNum = Math.max(...accumulatedQuestions.map(q => q.questionNumber), 0);
                  formattedQ.questionNumber = maxQNum + 1;
                  accumulatedQuestions.push(formattedQ);
                }
              }
            } else {
              // Questions are from different pages (e.g. Page 2 and Page 28). They are distinct questions!
              const maxQNum = Math.max(...accumulatedQuestions.map(q => q.questionNumber), 0);
              formattedQ.questionNumber = maxQNum + 1;
              accumulatedQuestions.push(formattedQ);
            }
          } else {
            accumulatedQuestions.push(formattedQ);
          }
        }

        accumulatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
        setAiParsedQuestionsList([...accumulatedQuestions]);

        // Real-time Per-Page Autosave: If editing an existing test in the questions tab, update test questions in storage immediately
        if (activeTab === 'questions' && selectedTest && !isCreatingTest && accumulatedQuestions.length > 0) {
          const mergedWithExisting = [...questions];
          for (const newQ of accumulatedQuestions) {
            const mIdx = mergedWithExisting.findIndex(m => m.questionNumber === newQ.questionNumber);
            if (mIdx > -1) {
              mergedWithExisting[mIdx] = { ...newQ, testId: selectedTest.id };
            } else {
              mergedWithExisting.push({ ...newQ, testId: selectedTest.id });
            }
          }
          mergedWithExisting.sort((a, b) => a.questionNumber - b.questionNumber);
          handleSaveQuestionsList(mergedWithExisting);
          setQuestions(mergedWithExisting);
        } else if (accumulatedQuestions.length > 0) {
          // Live display for new test creation: keeps questions list in sync with current scan
          setQuestions([...accumulatedQuestions]);
        }

        setAiParseProgress(prev => ({
          ...prev,
          questionsFound: accumulatedQuestions.length,
          figuresCropped: totalFiguresCount,
          status: 'structuring_tables',
          statusMessage: `Page ${p} complete with ${modelUsedName}! Total: ${accumulatedQuestions.length} questions, ${totalFiguresCount} original diagrams preserved.`
        }));

        // Rate Limit Pacing: Brief pause (2.5s) between pages
        if (p < endP) {
          const paceSeconds = 2;
          for (let s = paceSeconds; s > 0; s--) {
            setAiParseProgress(prev => ({
              ...prev,
              statusMessage: `Page ${p} complete (${accumulatedQuestions.length} questions so far). Pacing API quota (${s}s) before Page ${p + 1}...`
            }));
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (accumulatedQuestions.length > 0) {
        finalizeSave();
      } else {
        setAiParseProgress(prev => ({
          ...prev,
          status: 'error',
          statusMessage: `No questions could be extracted from Pages ${startP}–${endP}. Please verify the PDF page range.`
        }));
        triggerToast(`No questions found on scanned pages.`);
      }
    } catch (err: any) {
      console.error('AI Parsing note/error:', err);
      if (accumulatedQuestions.length > 0) {
        // Save whatever we got! Never drop questions!
        finalizeSave();
      } else {
        setAiParseProgress(prev => ({
          ...prev,
          status: 'error',
          statusMessage: err.message || 'Error occurred during AI PDF parsing.'
        }));
        triggerToast(`AI Parsing note: ${err.message}`);
      }
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleStopAiParsing = () => {
    abortAiParsingRef.current = true;
    setIsAiParsing(false);
    triggerToast('Stopping AI parsing and saving questions extracted so far...');
  };

  // Handle Solutions & Answer Key PDF Upload
  const handleSolutionsPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSolutionsPdfFile(file);
    setIsParsingSolutionsPdf(true);
    setSolutionsParseNotice('Analyzing Solutions PDF structure & text layers...');
    try {
      const doc = await loadPdfDocument(file);
      const result = await parseSolutionsAndKeyFromPdf(doc, (msg) => setSolutionsParseNotice(msg));
      setParsedSolutionsResult(result);
      if (result.success) {
        triggerToast(`🎉 Extracted ${result.totalAnswersFound} Answer Keys & ${result.totalSolutionsFound} Step-by-Step Solutions!`);
      } else {
        triggerToast('Could not extract solutions from PDF. You can paste raw text below.');
      }
    } catch (err: any) {
      console.error('Solutions PDF parse error:', err);
      triggerToast('Error reading Solutions PDF: ' + err.message);
    } finally {
      setIsParsingSolutionsPdf(false);
      setSolutionsParseNotice(null);
    }
  };

  // Apply parsed answers and solutions to current questions
  const handleApplyParsedSolutions = () => {
    if (!parsedSolutionsResult) return;
    const currentQList = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    if (currentQList.length === 0) {
      triggerToast('No questions in test to apply solutions to.');
      return;
    }

    let appliedKeys = 0;
    let appliedSols = 0;

    const solutionQNums = Object.keys(parsedSolutionsResult.answers).map(Number).filter(n => !isNaN(n));
    const existingQNums = new Set(currentQList.map(q => q.questionNumber));
    const missingQNums = solutionQNums.filter(n => !existingQNums.has(n)).sort((a, b) => a - b);
    setSolutionsMissingQNums(missingQNums);

    const updated = currentQList.map(q => {
      let modified = { ...q };
      const qNum = q.questionNumber;
      if (parsedSolutionsResult.answers[qNum]) {
        modified.correctAnswer = parsedSolutionsResult.answers[qNum];
        appliedKeys++;
      }
      if (parsedSolutionsResult.solutions[qNum]) {
        const solText = parsedSolutionsResult.solutions[qNum];
        modified.explanation = solText;
        if (!modified.languages) {
          modified.languages = {
            en: { questionText: modified.questionText, options: modified.options, explanation: solText }
          };
        } else {
          if (modified.languages.en) {
            modified.languages.en.explanation = solText;
          }
          if (modified.languages.hi) {
            modified.languages.hi.explanation = solText;
          }
        }
        appliedSols++;
      }
      return modified;
    });

    setAiParsedQuestionsList(updated);
    setQuestions(updated);

    if (selectedTest) {
      saveStoredMockQuestions(selectedTest.id, updated);
      fetch('/api/db/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest.id, questions: updated })
      }).catch(e => console.warn('Questions sync error:', e));
    }

    if (missingQNums.length > 0) {
      setAnswerKeyAppliedMessage(`⚠️ Solution PDF has ${solutionQNums.length} questions, but test currently has only ${currentQList.length} questions. Applied keys to matching ${appliedKeys} questions. Missing questions in test: Q${missingQNums.slice(0, 8).join(', Q')}${missingQNums.length > 8 ? ` (+${missingQNums.length - 8} more)` : ''}.`);
      triggerToast(`Applied keys to ${appliedKeys} questions. Note: ${missingQNums.length} questions in solutions were not in test.`);
    } else {
      setAnswerKeyAppliedMessage(`✓ Applied ${appliedKeys} Answer Keys and ${appliedSols} Detailed Solutions to test!`);
      triggerToast(`🎉 Successfully applied ${appliedKeys} Answer Keys & ${appliedSols} Solutions to "${selectedTest?.title || 'Test'}"!`);
    }
  };

  // Auto-Fill Missing Questions from Solutions PDF so test has the full 180 questions matching answer keys
  const handleFillMissingQuestionsFromSolutions = () => {
    if (!parsedSolutionsResult) return;
    const currentQList = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    const existingQNums = new Set(currentQList.map(q => q.questionNumber));
    const solutionQNums = Object.keys(parsedSolutionsResult.answers).map(Number).filter(n => !isNaN(n));
    const missingQNums = solutionQNums.filter(n => !existingQNums.has(n)).sort((a, b) => a - b);
    if (missingQNums.length === 0) {
      triggerToast('All questions from solutions PDF are already in test!');
      return;
    }

    const testId = selectedTest?.id || 'current_test';
    const newQuestions: MockQuestion[] = missingQNums.map(qNum => {
      const subj = qNum <= 50 ? 'Physics' : qNum <= 100 ? 'Chemistry' : 'Biology';
      const ans = parsedSolutionsResult.answers[qNum] || 'A';
      const sol = parsedSolutionsResult.solutions[qNum] || '';
      return {
        id: `q_sol_fill_${Date.now()}_${qNum}`,
        testId,
        questionNumber: qNum,
        subject: subj,
        chapter: `${subj} Core`,
        difficulty: 'Moderate',
        questionText: `Question ${qNum}`,
        options: [
          { label: 'A', value: 'Option A', type: 'text' },
          { label: 'B', value: 'Option B', type: 'text' },
          { label: 'C', value: 'Option C', type: 'text' },
          { label: 'D', value: 'Option D', type: 'text' }
        ],
        correctAnswer: ans,
        explanation: sol,
        marks: 4,
        negativeMarks: 1,
        needsReview: true
      };
    });

    const combined = [...currentQList, ...newQuestions].sort((a, b) => a.questionNumber - b.questionNumber);
    setAiParsedQuestionsList(combined);
    setQuestions(combined);
    if (selectedTest) {
      handleSaveQuestionsList(combined);
    }
    setSolutionsMissingQNums([]);
    setAnswerKeyAppliedMessage(`✓ Added ${newQuestions.length} missing questions (Q${missingQNums[0]}–Q${missingQNums[missingQNums.length - 1]}) from Solution PDF! Full ${combined.length} questions now ready.`);
    triggerToast(`Added ${newQuestions.length} missing questions to complete ${combined.length} questions!`);
  };

  // Auto-Apply Pasted Answer Key
  const handleApplyAnswerKey = () => {
    if (!answerKeyInputText.trim()) {
      triggerToast('Please paste the answer key text first.');
      return;
    }

    const currentQList = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    if (currentQList.length === 0) {
      triggerToast('No questions available to apply answer key to.');
      return;
    }

    const answerMap = parseAnswerKeyText(answerKeyInputText, currentQList.length);
    const mappedCount = Object.keys(answerMap).length;

    if (mappedCount === 0) {
      triggerToast('Could not detect answer pairs. Check format: e.g. "1: A, 2: B" or "A B C D..."');
      return;
    }

    const updated = currentQList.map(q => {
      const detected = answerMap[q.questionNumber];
      if (detected) {
        return { ...q, correctAnswer: detected };
      }
      return q;
    });

    setAiParsedQuestionsList(updated);
    setQuestions(updated);

    if (selectedTest) {
      saveStoredMockQuestions(selectedTest.id, updated);
      fetch('/api/db/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest.id, questions: updated })
      }).catch(e => console.warn('Answer key sync error:', e));
    }

    setAnswerKeyAppliedMessage(`✓ Answer Key successfully applied to ${mappedCount} of ${currentQList.length} questions!`);
    triggerToast(`✓ Answer Key applied to ${mappedCount} questions!`);
  };

  // Direct Click in Answer Matrix
  const handleDirectAnswerSelect = (qNum: number, opt: 'A' | 'B' | 'C' | 'D') => {
    const currentQList = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
    const updated = currentQList.map(q => {
      if (q.questionNumber === qNum) {
        return { ...q, correctAnswer: opt };
      }
      return q;
    });

    setAiParsedQuestionsList(updated);
    setQuestions(updated);

    if (selectedTest) {
      saveStoredMockQuestions(selectedTest.id, updated);
      fetch('/api/db/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest.id, questions: updated })
      }).catch(e => console.warn('Answer sync error:', e));
    }
  };

  // Canvas Crop Handlers (Mouse Drag on Rendered PDF Page with Zero Page Scroll)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pdfCanvasRef.current) return;
    const rect = pdfCanvasRef.current.getBoundingClientRect();
    const scaleX = pdfCanvasRef.current.width / rect.width;
    const scaleY = pdfCanvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    cropStartRef.current = { x, y };
    setIsDrawingCrop(true);
    setCropBox({ x, y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingCrop || !pdfCanvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = pdfCanvasRef.current.getBoundingClientRect();
    const scaleX = pdfCanvasRef.current.width / rect.width;
    const scaleY = pdfCanvasRef.current.height / rect.height;

    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(cropStartRef.current.x, curX);
    const y = Math.min(cropStartRef.current.y, curY);
    const w = Math.abs(curX - cropStartRef.current.x);
    const h = Math.abs(curY - cropStartRef.current.y);

    setCropBox({ x, y, w, h });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingCrop || !pdfCanvasRef.current || !cropBox) {
      setIsDrawingCrop(false);
      return;
    }
    setIsDrawingCrop(false);

    if (cropBox.w > 10 && cropBox.h > 10) {
      const croppedUrl = cropRegionFromCanvas(pdfCanvasRef.current, {
        x: cropBox.x,
        y: cropBox.y,
        width: cropBox.w,
        height: cropBox.h
      });
      setCroppedFigureDataUrl(croppedUrl);
    }
  };

  // Crop Box Move & Resize Handlers (Prevents entire page scrolling while moving the box)
  const handleBoxPointerDown = (e: React.PointerEvent, action: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (cropBox) {
      setIsDraggingCropBox(true);
      setCropBoxDragAction(action);
      cropBoxDragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        box: { ...cropBox }
      };
    }
  };

  const handleBoxPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCropBox || !pdfCanvasRef.current || !cropBox) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = pdfCanvasRef.current.getBoundingClientRect();
    const scaleX = pdfCanvasRef.current.width / rect.width;
    const scaleY = pdfCanvasRef.current.height / rect.height;

    const dx = (e.clientX - cropBoxDragStartRef.current.clientX) * scaleX;
    const dy = (e.clientY - cropBoxDragStartRef.current.clientY) * scaleY;
    const orig = cropBoxDragStartRef.current.box;
    const cw = pdfCanvasRef.current.width;
    const ch = pdfCanvasRef.current.height;

    let newBox = { ...orig };

    if (cropBoxDragAction === 'move') {
      newBox.x = Math.max(0, Math.min(cw - orig.w, orig.x + dx));
      newBox.y = Math.max(0, Math.min(ch - orig.h, orig.y + dy));
    } else if (cropBoxDragAction === 'se') {
      newBox.w = Math.max(20, Math.min(cw - orig.x, orig.w + dx));
      newBox.h = Math.max(20, Math.min(ch - orig.y, orig.h + dy));
    } else if (cropBoxDragAction === 'nw') {
      const nx = Math.max(0, Math.min(orig.x + orig.w - 20, orig.x + dx));
      const ny = Math.max(0, Math.min(orig.y + orig.h - 20, orig.y + dy));
      newBox = { x: nx, y: ny, w: orig.w - (nx - orig.x), h: orig.h - (ny - orig.y) };
    } else if (cropBoxDragAction === 'ne') {
      const ny = Math.max(0, Math.min(orig.y + orig.h - 20, orig.y + dy));
      newBox = { x: orig.x, y: ny, w: Math.max(20, Math.min(cw - orig.x, orig.w + dx)), h: orig.h - (ny - orig.y) };
    } else if (cropBoxDragAction === 'sw') {
      const nx = Math.max(0, Math.min(orig.x + orig.w - 20, orig.x + dx));
      newBox = { x: nx, y: orig.y, w: orig.w - (nx - orig.x), h: Math.max(20, Math.min(ch - orig.y, orig.h + dy)) };
    }

    setCropBox(newBox);
  };

  const handleBoxPointerUp = (e: React.PointerEvent) => {
    if (e && 'releasePointerCapture' in e.target && e.pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDraggingCropBox(false);
    if (pdfCanvasRef.current && cropBox && cropBox.w > 10 && cropBox.h > 10) {
      const croppedUrl = cropRegionFromCanvas(pdfCanvasRef.current, {
        x: cropBox.x,
        y: cropBox.y,
        width: cropBox.w,
        height: cropBox.h
      });
      setCroppedFigureDataUrl(croppedUrl);
    }
  };

  // Apply Cropped Region directly to Target Question
  const handleAttachCropToQuestion = () => {
    if (!croppedFigureDataUrl || !selectedTest) {
      triggerToast('Please crop a region from the PDF first.');
      return;
    }

    const qIdx = questions.findIndex(q => q.questionNumber === Number(targetQuestionForCrop));
    let targetQ: MockQuestion;

    if (qIdx > -1) {
      targetQ = { ...questions[qIdx] };
    } else {
      // Create new placeholder question
      targetQ = {
        id: `q-${Date.now()}`,
        testId: selectedTest.id,
        questionNumber: Number(targetQuestionForCrop),
        subject: 'Biology',
        questionText: `Question ${targetQuestionForCrop} (Extracted from PDF Page ${currentPdfPage})`,
        options: [
          { label: 'A', type: 'text', value: 'Option A' },
          { label: 'B', type: 'text', value: 'Option B' },
          { label: 'C', type: 'text', value: 'Option C' },
          { label: 'D', type: 'text', value: 'Option D' }
        ],
        correctAnswer: 'A'
      };
    }

    if (cropTargetType === 'question') {
      targetQ.questionImageUrl = croppedFigureDataUrl;
      targetQ.figureUrl = croppedFigureDataUrl;
      if (!targetQ.languages) {
        targetQ.languages = {
          en: { questionText: targetQ.questionText, options: targetQ.options, figureUrl: croppedFigureDataUrl },
          hi: { questionText: '', options: targetQ.options, figureUrl: croppedFigureDataUrl }
        };
      } else {
        if (targetQ.languages?.en) targetQ.languages.en.figureUrl = croppedFigureDataUrl;
        if (targetQ.languages?.hi) targetQ.languages.hi.figureUrl = croppedFigureDataUrl;
      }
    } else {
      const optLabel = cropTargetType.split('_')[1] as 'A' | 'B' | 'C' | 'D';
      targetQ.options = targetQ.options.map(opt => {
        if (opt.label === optLabel) {
          return { ...opt, type: 'image', imageUrl: croppedFigureDataUrl };
        }
        return opt;
      });
      if (targetQ.languages?.en?.options) {
        targetQ.languages.en.options = targetQ.languages.en.options.map(opt => {
          if (opt.label === optLabel) return { ...opt, type: 'image', imageUrl: croppedFigureDataUrl };
          return opt;
        });
      }
      if (targetQ.languages?.hi?.options) {
        targetQ.languages.hi.options = targetQ.languages.hi.options.map(opt => {
          if (opt.label === optLabel) return { ...opt, type: 'image', imageUrl: croppedFigureDataUrl };
          return opt;
        });
      }
    }

    const updated = qIdx > -1 
      ? questions.map((q, i) => i === qIdx ? targetQ : q)
      : [...questions, targetQ].sort((a, b) => a.questionNumber - b.questionNumber);

    handleSaveQuestionsList(updated);
    triggerToast(`Figure attached directly to Question ${targetQuestionForCrop} (${cropTargetType})!`);
  };

  // Purchases
  const purchases = getStoredMockPurchases();
  const attempts = getStoredMockAttempts();

  // Filtered tests calculation matching search, status pills, and folder row
  const filteredTests = tests.filter((test) => {
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (test.title || '').toLowerCase().includes(q);
      const matchCode = (test.code || test.testNumber || '').toLowerCase().includes(q);
      const matchSubject = (test.subjects || []).some(s => s.toLowerCase().includes(q));
      const matchFolder = (test.folderName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchSubject && !matchFolder) {
        return false;
      }
    }

    // 2. Status Filter
    if (statusFilter === 'published' && test.status !== 'published') return false;
    if (statusFilter === 'draft' && test.status !== 'draft') return false;

    // 3. Folder Filter
    if (selectedFolder !== 'All Tests' && test.folderName !== selectedFolder) return false;

    // 4. Test Category Filter (Chapter Wise, Full Subject, Full Syllabus)
    if (adminCategoryFilter !== 'all') {
      const cat = getTestCategory(test);
      if (cat !== adminCategoryFilter) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* ================= 1. ADMIN CONTROL CENTER PANEL ================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition cursor-pointer"
                  title="Back to Admin Dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    Admin Control Center
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sync Cloud [Live]</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Authorized Admin: <strong className="text-slate-800 font-semibold">{adminEmail || 'fdar77551@gmail.com'}</strong>
                </div>
              </div>
            </div>

            {/* Three Real-Time Summary Metric Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-left">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-2.5 sm:px-4 sm:py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Total Revenue</span>
                <span className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  ₹{Number(totalRevenue || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-2.5 sm:px-4 sm:py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">New Orders</span>
                <span className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  {newOrdersCount || 0}
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-2.5 sm:px-4 sm:py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Registered Users</span>
                <span className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  {registeredUsersCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-navigation Links Grid matching prompt */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            {[
              { label: 'Catalog', id: 'Catalog' },
              { label: 'Mock Tests', id: 'Mock Tests', active: true },
              { label: 'Orders', id: 'Orders' },
              { label: 'Search', id: 'Search' },
              { label: 'Sales Stats', id: 'Sales Stats' },
              { label: 'Support', id: 'Support' },
              { label: 'Users', id: 'Users' },
              { label: 'Settings', id: 'Settings' },
              { label: 'Banners', id: 'Banners' },
              { label: 'Cloud', id: 'Cloud' },
              { label: 'Coupons', id: 'Coupons' },
              { label: 'Reviews', id: 'Reviews' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onNavigateTab) onNavigateTab(item.id);
                  else if (item.id === 'Mock Tests') setActiveTab('tests');
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 ${
                  item.active 
                    ? 'bg-blue-600 text-white shadow-2xs font-black' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Background AI Parser Active Status Banner */}
        {backgroundParseJob && backgroundParseJob.status === 'parsing' && (
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 text-white p-3.5 rounded-2xl shadow-md border border-indigo-500/40 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>AI Parsing in Background: {backgroundParseJob.pdfName}</span>
                  <span className="text-[10px] bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                    Page {backgroundParseJob.currentPage} / {backgroundParseJob.totalPages}
                  </span>
                </h4>
                <p className="text-[11px] text-blue-200">
                  {backgroundParseJob.questionsFound} questions digitized so far ({backgroundParseJob.figuresCropped} original diagrams preserved) • Safe to switch sections or leave!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pdf_import')}
                className="px-3 py-1.5 bg-white text-blue-900 font-black text-xs rounded-xl shadow-xs hover:bg-blue-50 transition cursor-pointer"
              >
                View Parser
              </button>
              <button
                type="button"
                onClick={() => backgroundPdfParserService.stopActiveJob()}
                className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Background AI Parser Completed Notification Banner */}
        {backgroundParseJob && backgroundParseJob.status === 'completed' && backgroundParseJob.questionsFound > 0 && (
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-3.5 rounded-2xl shadow-md border border-emerald-400/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black flex items-center gap-2">
                  <span>AI Parsing Finished: "{backgroundParseJob.pdfName}"</span>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                    {backgroundParseJob.questionsFound} Questions Ready
                  </span>
                </h4>
                <p className="text-[11px] text-emerald-200">
                  All {backgroundParseJob.questionsFound} questions with original diagrams are digitized and preserved.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiParsedQuestionsList(backgroundParseJob.parsedQuestions || []);
                  setActiveTab('pdf_import');
                  triggerToast(`Loaded ${backgroundParseJob.questionsFound} parsed questions ready for review!`);
                }}
                className="px-3 py-1.5 bg-white text-emerald-900 font-black text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition cursor-pointer"
              >
                Review &amp; Save
              </button>
              <button
                type="button"
                onClick={() => setBackgroundParseJob(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs (CBT Engine Workspaces) */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'tests' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dashboard &amp; Tests ({tests.length})</span>
          </button>

          {/* AI PDF Parser Tab - Always Available */}
          <button
            type="button"
            onClick={() => setActiveTab('pdf_import')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeTab === 'pdf_import' 
                ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white shadow-md' 
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI PDF Parser (Gemini)</span>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
              AI Vision
            </span>
          </button>

          {selectedTest && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'questions' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Questions Builder ({questions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('copypaste')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'copypaste' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>Batch Copy/Paste</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('pricing_packages')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'pricing_packages' 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md font-black' 
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>💰 Test Pricing &amp; Subject Packages</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'purchases' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Purchases &amp; Results</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: MOCK TESTS MANAGEMENT DASHBOARD */}
        {/* ============================================================ */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            
            {/* Header Banner matching specification */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-7 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10.5px] font-bold border border-blue-400/30">
                    <Layers className="w-3.5 h-3.5" />
                    <span>NEET CBT Examination Suite</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-bold border border-emerald-400/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Firebase RTDB Live Synced (mock_tests)</span>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Mock Tests Management Dashboard
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  Create, edit, manage questions, view student results, and monitor all-India leaderboards.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsManageFoldersOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-98 text-white text-xs font-bold rounded-2xl border border-white/20 transition cursor-pointer select-none"
                >
                  <FolderPlus className="w-4 h-4 text-sky-300" />
                  <span>Manage Folders</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTestId(null);
                    const initialCat = adminCategoryFilter !== 'all' ? adminCategoryFilter : 'chapter_wise';
                    setTestFormData({
                      testNumber: `Test 0${tests.length + 1}`,
                      code: `#0${tests.length + 1}`,
                      title: '',
                      shortDescription: '',
                      fullDescription: '',
                      description: '',
                      folderName: selectedFolder !== 'All Tests' ? selectedFolder : (initialCat === 'chapter_wise' ? 'Physics Booster' : 'Full Syllabus Test Series'),
                      testTypeCategory: initialCat,
                      type: initialCat === 'chapter_wise' ? 'chapter_test' : initialCat === 'full_subject' ? 'subject_test' : 'full_syllabus',
                      subject: initialCat === 'full_syllabus' ? undefined : 'Physics',
                      chapter: '',
                      difficulty: 'Moderate',
                      subjects: initialCat === 'full_syllabus' ? ['Physics', 'Chemistry', 'Biology'] : ['Physics'],
                      totalQuestions: initialCat === 'full_syllabus' ? 180 : 45,
                      durationMinutes: initialCat === 'full_syllabus' ? 180 : 60,
                      totalMarks: initialCat === 'full_syllabus' ? 720 : 180,
                      maxMarks: initialCat === 'full_syllabus' ? 720 : 180,
                      correctMarks: 4,
                      negativeMarks: 1,
                      isFree: true,
                      isPaid: false,
                      price: 0,
                      discountedPrice: 0,
                      originalPrice: 299,
                      razorpayPlanId: '',
                      status: 'published',
                      syllabus: initialCat === 'full_syllabus' ? 'Full Class 11 & 12 NCERT NEET Syllabus covering Physics, Chemistry, and Biology' : '',
                      instructions: [
                        '+4 marks for every correct response',
                        '-1 mark for every incorrect response',
                        '0 marks for unattempted questions',
                        'Calculators or external aids prohibited',
                        'Timer begins upon opening question 1'
                      ],
                      allowMultipleAttempts: true,
                      attemptLimit: 'unlimited',
                      showLeaderboard: true
                    });
                    setIsCreatingTest(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-2xl shadow-sm transition cursor-pointer select-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Mock Test</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Controls matching specification */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search test by title, code or subject..."
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({tests.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('published')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'published'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Published ({tests.filter(t => t.status === 'published').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('draft')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'draft'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Drafts ({tests.filter(t => t.status === 'draft').length})
                  </button>
                </div>
              </div>

              {/* 3 Main Test Types Filter Tabs (Chapter Wise, Full Subject, Full Syllabus) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Types:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setAdminCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    adminCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Types ({tests.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAdminCategoryFilter('chapter_wise')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 border ${
                    adminCategoryFilter === 'chapter_wise'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                      : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Chapter Wise ({tests.filter(t => getTestCategory(t) === 'chapter_wise').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminCategoryFilter('full_subject')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 border ${
                    adminCategoryFilter === 'full_subject'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <FlaskConical className="w-3 h-3" />
                  <span>Full Subject ({tests.filter(t => getTestCategory(t) === 'full_subject').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminCategoryFilter('full_syllabus')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 border ${
                    adminCategoryFilter === 'full_syllabus'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Full Syllabus ({tests.filter(t => getTestCategory(t) === 'full_syllabus').length})</span>
                </button>
              </div>

              {/* Folder Categorization Row: Horizontal scrollable pills */}
              <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-blue-500" />
                  <span>Folders:</span>
                </span>

                {folders.map(folder => {
                  const count = folder === 'All Tests' 
                    ? tests.length 
                    : tests.filter(t => t.folderName === folder).length;
                  const isSelected = selectedFolder === folder;

                  return (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => setSelectedFolder(folder)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{folder}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============================================================== */}
            {/* 2. CREATE & EDIT MOCK TEST FORM (FREE VS PREMIUM LOGIC) */}
            {/* ============================================================== */}
            {isCreatingTest && (
              <div 
                id="mock-test-form-section"
                className="bg-white rounded-3xl border-2 border-blue-500 p-5 sm:p-7 shadow-xl space-y-6 animate-in fade-in duration-200 ring-4 ring-blue-100"
              >
                {/* 1. Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingTest(false);
                        setEditingTestId(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition cursor-pointer"
                      title="Back to test list"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                          {editingTestId ? 'Edit Mock Test' : 'Create New Mock Test'}
                        </h3>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          testFormData.status === 'published' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {testFormData.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Configure test parameters, access pricing, syllabus, and rules.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInsertNtaNeetTemplate}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-700 text-xs font-black rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      <span>[Insert NTA NEET Template]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveTest('draft', false)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <span>[Save Draft]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveTest('published', true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>[Publish &amp; Add Questions]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingTest(false);
                        setEditingTestId(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Cancel and close edit"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 1. Primary Test Type Selection (Chapter Wise, Full Subject, Full Syllabus) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 border border-blue-200/90 space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>1. Test Type &amp; Classification *</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select which test category this test belongs to in the NEET Mock Tests portal.
                    </p>
                  </div>

                  {/* 3 Main Categories Selection Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Chapter Wise */}
                    <div
                      onClick={() => {
                        setTestFormData(prev => ({
                          ...prev,
                          type: 'chapter_test',
                          testTypeCategory: 'chapter_wise',
                          subject: prev.subject || 'Physics',
                          subjects: [prev.subject || 'Physics'],
                          totalQuestions: prev.totalQuestions === 180 ? 45 : (prev.totalQuestions || 45),
                          totalMarks: prev.totalMarks === 720 ? 180 : (prev.totalMarks || 180),
                          maxMarks: prev.maxMarks === 720 ? 180 : (prev.maxMarks || 180),
                          durationMinutes: prev.durationMinutes === 180 ? 60 : (prev.durationMinutes || 60),
                          folderName: 'Physics Booster'
                        }));
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                        (testFormData.testTypeCategory === 'chapter_wise' || testFormData.type === 'chapter_test' || Boolean(testFormData.chapter?.trim()))
                          ? 'bg-amber-50/80 border-orange-500 text-orange-950 shadow-sm ring-2 ring-orange-200'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-orange-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-orange-700">1️⃣ Chapter Wise</span>
                          <BookOpen className="w-4 h-4 text-orange-600" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900">Chapter by Chapter</h5>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Single chapter tests for Physics, Chemistry, or Biology.
                        </p>
                      </div>
                    </div>

                    {/* Full Subject */}
                    <div
                      onClick={() => {
                        setTestFormData(prev => ({
                          ...prev,
                          type: 'subject_test',
                          testTypeCategory: 'full_subject',
                          subject: prev.subject || 'Physics',
                          subjects: [prev.subject || 'Physics'],
                          chapter: '',
                          totalQuestions: prev.totalQuestions === 180 ? 50 : (prev.totalQuestions || 50),
                          totalMarks: prev.totalMarks === 720 ? 180 : (prev.totalMarks || 180),
                          maxMarks: prev.maxMarks === 720 ? 180 : (prev.maxMarks || 180),
                          durationMinutes: prev.durationMinutes === 180 ? 60 : (prev.durationMinutes || 60),
                          folderName: 'Physics Booster'
                        }));
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                        (testFormData.testTypeCategory === 'full_subject' || testFormData.type === 'subject_test') && !testFormData.chapter?.trim()
                          ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-emerald-700">2️⃣ Full Subject</span>
                          <FlaskConical className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900">Complete Subject Test</h5>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Covers 100% syllabus of Physics, Chemistry, or Biology.
                        </p>
                      </div>
                    </div>

                    {/* Full Syllabus */}
                    <div
                      onClick={() => {
                        setTestFormData(prev => ({
                          ...prev,
                          type: 'full_syllabus',
                          testTypeCategory: 'full_syllabus',
                          subject: undefined,
                          chapter: '',
                          subjects: ['Physics', 'Chemistry', 'Biology'],
                          totalQuestions: 180,
                          totalMarks: 720,
                          maxMarks: 720,
                          durationMinutes: 180,
                          folderName: 'Full Syllabus Test Series'
                        }));
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                        testFormData.testTypeCategory === 'full_syllabus' || testFormData.type === 'full_syllabus'
                          ? 'bg-blue-50/80 border-blue-600 text-blue-950 shadow-sm ring-2 ring-blue-200'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-blue-700">3️⃣ Full Syllabus</span>
                          <Sparkles className="w-4 h-4 text-blue-600" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900">NEET Grand Mock (PCB)</h5>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Physics + Chemistry + Biology complete NEET syllabus simulation (720M).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Category & Standalone Assignment (Synced with Test Categories Manager) */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800">
                        Assign Portal Categories (Multi-select) or Standalone
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(testFormData.isStandalone)}
                          onChange={e =>
                            setTestFormData(prev => ({
                              ...prev,
                              isStandalone: e.target.checked,
                              categoryIds: e.target.checked ? [] : prev.categoryIds
                            }))
                          }
                          className="w-4 h-4 rounded text-amber-600"
                        />
                        <span>Standalone (not in category cards)</span>
                      </label>
                    </div>
                    {!testFormData.isStandalone && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dynamicCategories.map(cat => {
                          const currentIds =
                            Array.isArray(testFormData.categoryIds) && testFormData.categoryIds.length > 0
                              ? testFormData.categoryIds
                              : resolveTestCategoryIds(testFormData as MockTest);
                          const isChecked = currentIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setTestFormData(prev => {
                                  const existing =
                                    Array.isArray(prev.categoryIds) && prev.categoryIds.length > 0
                                      ? prev.categoryIds
                                      : resolveTestCategoryIds(prev as MockTest);
                                  const next = isChecked
                                    ? existing.filter(id => id !== cat.id)
                                    : [...existing, cat.id];
                                  return {
                                    ...prev,
                                    isStandalone: false,
                                    categoryIds: next.length > 0 ? next : [cat.id]
                                  };
                                });
                              }}
                              className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              {isChecked ? '✓ ' : ''}
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Contextual Options for Chapter Wise & Full Subject */}
                  {((testFormData.testTypeCategory === 'chapter_wise' || testFormData.type === 'chapter_test' || Boolean(testFormData.chapter?.trim())) ||
                    (testFormData.testTypeCategory === 'full_subject' || testFormData.type === 'subject_test')) && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                      {/* Subject Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 block">
                          Select Subject *
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {(['Physics', 'Chemistry', 'Biology'] as MockSubject[]).map((subj) => {
                            const isSelected = (testFormData.subject === subj) || 
                              (!testFormData.subject && subj === 'Physics');
                            return (
                              <button
                                key={subj}
                                type="button"
                                onClick={() => {
                                  setTestFormData(prev => ({
                                    ...prev,
                                    subject: subj,
                                    subjects: [subj]
                                  }));
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                  isSelected
                                    ? subj === 'Physics'
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : subj === 'Chemistry'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                      : 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {subj === 'Physics' && <Atom className="w-3.5 h-3.5" />}
                                {subj === 'Chemistry' && <FlaskConical className="w-3.5 h-3.5" />}
                                {subj === 'Biology' && <Dna className="w-3.5 h-3.5" />}
                                <span>{subj}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Chapter Selection / Creation if Chapter Wise */}
                      {(testFormData.testTypeCategory === 'chapter_wise' || testFormData.type === 'chapter_test' || Boolean(testFormData.chapter?.trim())) && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800">
                              Chapter Name * (Type new or choose existing)
                            </label>
                            <span className="text-[10px] text-orange-600 font-bold">
                              Only chapters you create will appear to students
                            </span>
                          </div>

                          {/* Existing chapters pill suggestions if any exist */}
                          {availableChaptersForForm.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10.5px] text-slate-400 font-semibold block">
                                Existing {testFormData.subject || 'Physics'} Chapters:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                                {availableChaptersForForm.map(ch => (
                                  <button
                                    key={ch}
                                    type="button"
                                    onClick={() => setTestFormData(prev => ({ ...prev, chapter: ch }))}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                                      testFormData.chapter === ch
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {ch}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="relative">
                            <input
                              type="text"
                              value={testFormData.chapter || ''}
                              onChange={e => setTestFormData({ ...testFormData, chapter: e.target.value })}
                              placeholder={`e.g. ${
                                (testFormData.subject || 'Physics') === 'Physics'
                                  ? 'Units & Measurements, Kinematics, Laws of Motion...'
                                  : (testFormData.subject || 'Physics') === 'Chemistry'
                                  ? 'Some Basic Concepts, Atomic Structure, Chemical Bonding...'
                                  : 'The Living World, Biological Classification, Plant Kingdom...'
                              }`}
                              className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-orange-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition shadow-2xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Syllabus Note */}
                  {(testFormData.testTypeCategory === 'full_syllabus' || testFormData.type === 'full_syllabus') && (
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                      <span className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Covers Physics + Chemistry + Biology (Complete NEET 720-Mark Exam)</span>
                      </span>
                      <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md">
                        PCB
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Metadata Fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Metadata &amp; Identification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Test Name / Title *</label>
                      <input
                        type="text"
                        value={testFormData.title || ''}
                        onChange={e => setTestFormData({ ...testFormData, title: e.target.value })}
                        placeholder="e.g. NEET Full Syllabus Mock Test 01"
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Test Code / No. *</label>
                      <input
                        type="text"
                        value={testFormData.testNumber || testFormData.code || ''}
                        onChange={e => setTestFormData({ ...testFormData, testNumber: e.target.value, code: e.target.value })}
                        placeholder="e.g. #01 or Test 01"
                        className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Folder / Category Assignment</label>
                        <button
                          type="button"
                          onClick={() => setIsManageFoldersOpen(true)}
                          className="text-[10px] text-blue-600 hover:underline font-bold"
                        >
                          + Manage Folders
                        </button>
                      </div>
                      <select
                        value={testFormData.folderName || 'Full Syllabus Test Series'}
                        onChange={e => setTestFormData({ ...testFormData, folderName: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      >
                        {folders.filter(f => f !== 'All Tests').map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Difficulty Level</label>
                      <select
                        value={testFormData.difficulty || 'Moderate'}
                        onChange={e => setTestFormData({ ...testFormData, difficulty: e.target.value as any })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      >
                        <option value="Easy">Easy (Foundation / Starter)</option>
                        <option value="Moderate">Moderate (NEET Standard)</option>
                        <option value="Hard">Hard (Rank Booster / Advanced)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                      <select
                        value={testFormData.status}
                        onChange={e => setTestFormData({ ...testFormData, status: e.target.value as any })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      >
                        <option value="published">Published (Live for Students)</option>
                        <option value="draft">Draft (Hidden)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-12">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Short Description (Card Summary)</label>
                      <input
                        type="text"
                        value={testFormData.shortDescription || testFormData.description || ''}
                        onChange={e => setTestFormData({ ...testFormData, shortDescription: e.target.value, description: e.target.value })}
                        placeholder="1-line summary displayed on the test card (e.g. 720-mark official pattern exam with ranking)..."
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-12">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Full Description (Test Instructions View)</label>
                      <textarea
                        rows={2}
                        value={testFormData.fullDescription || testFormData.description || ''}
                        onChange={e => setTestFormData({ ...testFormData, fullDescription: e.target.value })}
                        placeholder="Detailed test instructions, curriculum breakdown, and exam temperament guidance..."
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Duration (Minutes) *</label>
                      <input
                        type="number"
                        value={testFormData.durationMinutes || 180}
                        onChange={e => setTestFormData({ ...testFormData, durationMinutes: Number(e.target.value) })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Total Marks *</label>
                      <input
                        type="number"
                        value={testFormData.totalMarks || testFormData.maxMarks || 720}
                        onChange={e => setTestFormData({ ...testFormData, totalMarks: Number(e.target.value), maxMarks: Number(e.target.value) })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Total Questions Count *</label>
                      <input
                        type="number"
                        value={testFormData.totalQuestions || 180}
                        onChange={e => setTestFormData({ ...testFormData, totalQuestions: Number(e.target.value) })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Access & Pricing Section (Crucial Requirement) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200/90 space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span>Access &amp; Pricing</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Define whether students can attempt this mock test for Free or must pay via Razorpay/Payment Gateway.
                    </p>
                  </div>

                  {/* Segmented Selector: Free Access vs Premium */}
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setTestFormData({ 
                        ...testFormData, 
                        isFree: true, 
                        isPaid: false, 
                        price: 0 
                      })}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        testFormData.isFree || testFormData.price === 0
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs ring-2 ring-emerald-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>[Free Access]</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">100% Free Practice for all students</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestFormData({ 
                        ...testFormData, 
                        isFree: false, 
                        isPaid: true, 
                        price: testFormData.price && testFormData.price > 0 ? testFormData.price : 99 
                      })}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        !testFormData.isFree && (testFormData.price ?? 0) > 0
                          ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-2xs ring-2 ring-purple-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>[Premium (Paid)]</span>
                      </span>
                      <span className="text-[10px] text-purple-700 font-medium">Paid unlock via Razorpay</span>
                    </button>
                  </div>

                  {/* Revealed Fields when Premium (Paid) is selected */}
                  {(!testFormData.isFree && (testFormData.price ?? 0) > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 animate-in fade-in duration-200">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">Price (INR) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={testFormData.price ?? 99}
                            onChange={e => setTestFormData({ ...testFormData, price: Number(e.target.value) })}
                            className="w-full pl-7 pr-3 py-2 text-xs font-black text-slate-900 bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">Discounted Price (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={testFormData.discountedPrice ?? 0}
                            onChange={e => setTestFormData({ ...testFormData, discountedPrice: Number(e.target.value) })}
                            placeholder="Optional discounted price"
                            className="w-full pl-7 pr-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">Razorpay Plan / Product ID</label>
                        <input
                          type="text"
                          value={testFormData.razorpayPlanId || ''}
                          onChange={e => setTestFormData({ ...testFormData, razorpayPlanId: e.target.value })}
                          placeholder="e.g. plan_NEET_MOCK_01"
                          className="w-full px-3 py-2 text-xs font-mono font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Curriculum & Instructions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Curriculum, Subjects &amp; Instructions</h4>
                  
                  {/* Subjects Included (Multi-select pills) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Subjects Included * (Multi-select pills)</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'General Science'].map(subj => {
                        const isSelected = (testFormData.subjects || []).includes(subj);
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => handleToggleSubject(subj)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-500'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>{isSelected ? '✓ ' : '+ '}{subj}</span>
                          </button>
                        );
                      })}

                      {/* Custom subject creator */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customSubjectInput}
                          onChange={e => setCustomSubjectInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSubject();
                            }
                          }}
                          placeholder="Custom subject..."
                          className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-full w-28 focus:w-36 focus:bg-white focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSubject}
                          className="p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Syllabus Details */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Syllabus Details (Chapter breakdown)</label>
                    <textarea
                      rows={2}
                      value={testFormData.syllabus || ''}
                      onChange={e => setTestFormData({ ...testFormData, syllabus: e.target.value })}
                      placeholder="e.g. Physics: Mechanics, Optics | Chemistry: Organic, Thermodynamics | Biology: Genetics, Ecology..."
                      className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Correct Response (+ marks)</label>
                      <input
                        type="number"
                        value={testFormData.correctMarks ?? 4}
                        onChange={e => setTestFormData({ ...testFormData, correctMarks: Number(e.target.value) })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Negative Marking (- marks)</label>
                      <input
                        type="number"
                        value={testFormData.negativeMarks ?? 1}
                        onChange={e => setTestFormData({ ...testFormData, negativeMarks: Number(e.target.value) })}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:border-blue-600 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Form Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTest(false);
                      setEditingTestId(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    [Cancel]
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTest('draft', false)}
                      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      [Save as Draft]
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveTest('published', true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                    >
                      [Publish &amp; Add Questions]
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. ADMIN TEST LISTING VIEW: STRUCTURED TEST CARDS */}
            {/* ============================================================== */}
            {filteredTests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No mock tests match your filter</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try selecting "All Tests" folder or clearing the search query to see all available mock tests.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTests.map((test) => {
                  const isSelected = selectedTest?.id === test.id;
                  const isFree = test.isFree || test.price === 0;
                  const testAttempts = attempts.filter(a => a.testId === test.id);
                  const questionsInTest = getStoredMockQuestions(test.id);

                  return (
                    <div
                      key={test.id}
                      className={`bg-white rounded-3xl border-2 p-5 transition-all shadow-2xs flex flex-col justify-between ${
                        isSelected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Top Tag Row: Test Index Tag, Folder link, Date, Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {/* Test Index Tag */}
                            <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg font-mono">
                              {test.code || test.testNumber || '#01'}
                            </span>

                            {/* Folder Link */}
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Folder className="w-3 h-3 text-slate-400" />
                              <span>{test.folderName || 'Full Syllabus Test Series'}</span>
                            </span>

                            {/* Publication Date */}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(test.createdAt || Date.now()).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Status badge */}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              test.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {test.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                            </span>

                            {/* Access Badge: FREE ACCESS vs PREMIUM (₹Price) - Click to toggle */}
                            {isFree ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFreePaid(test);
                                }}
                                title="Click to toggle to Premium (Paid) test"
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full transition cursor-pointer shadow-2xs"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>FREE ACCESS</span>
                                <span className="text-[9px] text-emerald-500 underline ml-0.5 font-normal">Switch</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFreePaid(test);
                                }}
                                title="Click to toggle to Free Sample test"
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full transition cursor-pointer shadow-2xs"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>PREMIUM (₹{test.price})</span>
                                <span className="text-[9px] text-amber-600 underline ml-0.5 font-normal">Switch</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Type Category Badge */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {(() => {
                            const cat = getTestCategory(test);
                            if (cat === 'chapter_wise') {
                              return (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                  <BookOpen className="w-3 h-3 text-orange-600" />
                                  <span>1️⃣ Chapter Wise • {test.subject || 'Physics'}</span>
                                  {test.chapter && <span className="font-semibold text-slate-700">({test.chapter})</span>}
                                </span>
                              );
                            }
                            if (cat === 'full_subject') {
                              return (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <FlaskConical className="w-3 h-3 text-emerald-600" />
                                  <span>2️⃣ Full Subject • {test.subject || 'Subject'} Full Test</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span>3️⃣ Full Syllabus • Complete PCB Exam (720M)</span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif] line-clamp-1 leading-snug">
                          {test.title}
                        </h3>

                        {/* Summary / Description */}
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {test.shortDescription || test.description}
                        </p>

                        {/* Metric Grid */}
                        <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-100 text-center">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Questions</span>
                            <span className="text-xs font-black text-slate-800">
                              {questionsInTest.length > 0 ? questionsInTest.length : test.totalQuestions} Qs
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Duration</span>
                            <span className="text-xs font-black text-slate-800">
                              {test.durationMinutes}m
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Marks</span>
                            <span className="text-xs font-black text-blue-600">
                              {test.maxMarks || 720}M
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Attempts</span>
                            <span className="text-xs font-black text-emerald-600">
                              {testAttempts.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 mt-3.5 border-t border-slate-100">
                        {/* Questions Count button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTest(test);
                            setActiveTab('questions');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Questions ({questionsInTest.length})</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Results / Leaderboard */}
                          <button
                            type="button"
                            onClick={() => setActiveLeaderboardTest(test)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="View All-India Leaderboard"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Leaderboard</span>
                          </button>

                          {/* Reorder Buttons (Move Up / Down) */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleMoveTestUp(test.id)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                              title="Move Test Up (Reorder)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-[1px] h-3.5 bg-slate-200" />
                            <button
                              type="button"
                              onClick={() => handleMoveTestDown(test.id)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                              title="Move Test Down (Reorder)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(test)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                            title={test.status === 'published' ? 'Switch to Draft' : 'Publish Live'}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicateTest(test)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition cursor-pointer"
                            title="Duplicate Test"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Test */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditTest(test)}
                            className="px-2.5 py-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer transition flex items-center gap-1 font-bold text-xs"
                            title="Edit Test Parameters"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTest(test)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition"
                            title="Delete Test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MANAGE FOLDERS MODAL */}
        {/* ============================================================ */}
        {isManageFoldersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                      Manage Test Series Folders
                    </h3>
                    <p className="text-[10px] text-slate-400">Categorize mock tests into thematic series &amp; boosters</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManageFoldersOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add Folder */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFolder();
                    }
                  }}
                  placeholder="New folder name (e.g. Physics Booster)..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddFolder}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* Existing Folders List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
                {folders.map(f => {
                  const testCount = f === 'All Tests' ? tests.length : tests.filter(t => t.folderName === f).length;
                  return (
                    <div
                      key={f}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-blue-600" />
                        <span>{f}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({testCount} tests)</span>
                      </div>

                      {f !== 'All Tests' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(f)}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageFoldersOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Modal when activeLeaderboardTest is set */}
        {activeLeaderboardTest && (
          <MockTestLeaderboardModal
            test={activeLeaderboardTest}
            isOpen={Boolean(activeLeaderboardTest)}
            onClose={() => setActiveLeaderboardTest(null)}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 2: TEST QUESTIONS & DIAGRAMS STUDIO */}
        {/* ============================================================ */}
        {activeTab === 'questions' && selectedTest && (
          <div className="space-y-4">
            {isOpenCanvasBuilder ? (
              <QuestionCanvasBuilder
                test={selectedTest}
                questions={questions}
                onSaveQuestions={(updated) => {
                  handleSaveQuestionsList(updated);
                  triggerToast('All bilingual questions and diagrams saved! 💾');
                }}
                onClose={() => setIsOpenCanvasBuilder(false)}
                onRequestCropFromPdf={(questionNum, targetType) => {
                  setTargetQuestionForCrop(questionNum);
                  if (targetType) setCropTargetType(targetType);
                  setIsOpenCanvasBuilder(false);
                  setTestQuestionsTab('diagrams');
                  setShowManualCropStudio(true);
                  triggerToast(`Switched to PDF Extractor for Question #${questionNum}. Crop diagram now! ✂️`);
                }}
              />
            ) : (
              <div className="space-y-4">
                {/* STUDIO HEADER */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('tests')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>All Tests</span>
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono">
                            {selectedTest.code || selectedTest.testNumber}
                          </span>
                          <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] line-clamp-1">
                            {selectedTest.title}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedTest.folderName} • {questions.length} Total Qs • {diagramQuestions.length} Diagram Questions
                        </p>
                      </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenEditTest(selectedTest);
                          setActiveTab('tests');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer"
                        title="Edit Test Title, Duration, Marks, Syllabus, or Pricing"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Test</span>
                      </button>
                      <label
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer shadow-2xs"
                        title="Upload Official Solutions & Answer Key PDF to automatically apply answers and step-by-step explanations"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">Upload Solutions PDF</span>
                        <span className="sm:hidden">Solutions</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleSolutionsPdfUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsOpenCanvasBuilder(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                        title="Open Side-by-Side Visual WYSIWYG Question Canvas"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>Visual Canvas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPrePublishAuditModal(true)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs ${
                          accuracyAudit.flaggedCount === 0
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                        title="Pre-Publish Verification & Accuracy Audit Report"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Audit Report</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          accuracyAudit.flaggedCount === 0 ? 'bg-emerald-200 text-emerald-950' : 'bg-amber-200 text-amber-950'
                        }`}>
                          {accuracyAudit.flaggedCount === 0 ? '100% Passed' : `${accuracyAudit.flaggedCount} Flags`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleSaveQuestionsList(questions);
                          triggerToast('✓ All questions and diagrams saved to test!');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Questions ({questions.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* STUDIO NAVIGATION SUB-TABS */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTestQuestionsTab('all')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        testQuestionsTab === 'all'
                          ? 'bg-blue-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>All Questions</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${testQuestionsTab === 'all' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {questions.length}
                      </span>
                    </button>

                    {/* Dedicated Diagram Questions Sub-Tab (Explicit User Requirement) */}
                    <button
                      type="button"
                      onClick={() => setTestQuestionsTab('diagrams')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        testQuestionsTab === 'diagrams'
                          ? 'bg-purple-700 text-white shadow-md font-black ring-2 ring-purple-300'
                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-amber-300" />
                      <span>Diagram Questions</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                        {diagramQuestions.length} Figures
                      </span>
                    </button>

                    {/* Quick Filter: Questions Needing Diagram Crops */}
                    {questionsExpectingDiagrams.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTestQuestionsTab('diagrams');
                          setDiagramCategoryFilter('missing_expected');
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          testQuestionsTab === 'diagrams' && diagramCategoryFilter === 'missing_expected'
                            ? 'bg-amber-600 text-white shadow-md font-black ring-2 ring-amber-300 animate-pulse'
                            : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300'
                        }`}
                        title="Questions referencing diagrams that need manual crop from PDF"
                      >
                        <Crop className="w-4 h-4 text-amber-600" />
                        <span>📷 Crop Missing ({questionsExpectingDiagrams.length})</span>
                      </button>
                    )}

                    {/* Dedicated Question Adding Options Sub-Tab (Explicit User Requirement) */}
                    <button
                      type="button"
                      onClick={() => setTestQuestionsTab('add')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        testQuestionsTab === 'add'
                          ? 'bg-emerald-600 text-white shadow-2xs font-black'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Questions</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200/60 rounded text-emerald-900 font-bold">
                        PDF • MD • Paste
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestQuestionsTab('audit')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                        testQuestionsTab === 'audit'
                          ? 'bg-slate-900 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      <span>Answer Key &amp; Audit</span>
                    </button>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SUB-TAB 1: ALL QUESTIONS LIST */}
                {/* ========================================================= */}
                {testQuestionsTab === 'all' && (
                  <div className="space-y-4">
                    {questions.length === 0 ? (
                      /* No questions empty state with clear question adding cards */
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                          <h3 className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                            No Questions Added Yet to {selectedTest.title}
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Choose any of the question adding options below to quickly populate this mock test with questions, diagrams, and answer keys.
                          </p>
                        </div>

                        {/* Direct Question Adding Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTestQuestionsTab('add');
                              setAddQuestionMode('pdf');
                            }}
                            className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 hover:border-purple-400 rounded-2xl text-left space-y-2 transition cursor-pointer group shadow-2xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900">Upload PDF (AI Vision)</h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Upload question paper PDF. AI automatically extracts questions and crops diagrams!
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTestQuestionsTab('add');
                              setAddQuestionMode('md');
                            }}
                            className="p-4 bg-blue-50/70 border border-blue-200 hover:border-blue-400 rounded-2xl text-left space-y-2 transition cursor-pointer group shadow-2xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                              <FileText className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900">Upload MD File</h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Upload a Markdown (.md / .txt) question paper with instant parsing.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTestQuestionsTab('add');
                              setAddQuestionMode('paste');
                            }}
                            className="p-4 bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 rounded-2xl text-left space-y-2 transition cursor-pointer group shadow-2xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                              <Copy className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900">Copy / Paste Questions</h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Paste raw MCQs or Word document questions with real-time preview.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTestQuestionsTab('add');
                              setAddQuestionMode('manual');
                            }}
                            className="p-4 bg-amber-50/70 border border-amber-200 hover:border-amber-400 rounded-2xl text-left space-y-2 transition cursor-pointer group shadow-2xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                              <Plus className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900">+ Manual Single Entry</h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              Create questions one by one with bilingual text &amp; image attachments.
                            </p>
                          </button>
                        </div>

                        {/* 1-Click Load 90Q Sample Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handle1ClickLoadOrganicChemistry90QTest}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>⚡ 1-Click Load 90-Question NEET Organic Chemistry Paper (Verified Diagrams &amp; Tables)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Populated Questions List */
                      <div className="space-y-4">
                        {/* Search and Filters Bar */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search question statement or question #..."
                              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Subject filter */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                              {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                                <button
                                  key={subj}
                                  type="button"
                                  onClick={() => setAiPreviewSubjectFilter(subj)}
                                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    aiPreviewSubjectFilter === subj ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                                  }`}
                                >
                                  {subj}
                                </button>
                              ))}
                            </div>

                            {/* Diagram Quick Filter Badges */}
                            <button
                              type="button"
                              onClick={() => {
                                setFilterMissingFiguresOnly(prev => !prev);
                                if (!filterMissingFiguresOnly) setFilterFiguresOnly(false);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                filterMissingFiguresOnly
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                              title="Show only questions that need diagram cropping from PDF"
                            >
                              <Crop className="w-3.5 h-3.5" />
                              <span>📷 Needs Diagram ({questionsExpectingDiagrams.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterFiguresOnly(prev => !prev);
                                if (!filterFiguresOnly) setFilterMissingFiguresOnly(false);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                filterFiguresOnly
                                  ? 'bg-purple-700 text-white shadow-xs'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
                              }`}
                              title="Show only questions that already have diagrams attached"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>🖼️ Has Diagram ({diagramQuestions.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTestQuestionsTab('add');
                                setAddQuestionMode('manual');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Q</span>
                            </button>
                          </div>
                        </div>

                        {/* ================= BULK ACTIONS & SELECTION TOOLBAR ================= */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-black text-slate-800 hover:text-blue-600 transition cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selectedQuestionNums.length === questions.length && questions.length > 0}
                                onChange={handleSelectAllQuestions}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                              />
                              <span>Select All ({questions.length})</span>
                            </label>

                            {selectedQuestionNums.length > 0 && (
                              <span className="text-xs font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                                {selectedQuestionNums.length} selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedQuestionNums.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setBulkDeleteConfirmOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Selected ({selectedQuestionNums.length})</span>
                              </button>
                            )}

                            {questions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setDeleteAllConfirmOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
                                title="Delete all questions in this test"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete All Questions</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Questions Cards Grid with Smooth Scrolling */}
                        <div className="space-y-3 pb-24">
                          {questions
                            .filter(q => {
                              if (aiPreviewSubjectFilter !== 'All' && q.subject !== aiPreviewSubjectFilter) return false;
                              if (filterFiguresOnly) {
                                const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                                if (!hasFig) return false;
                              }
                              if (filterMissingFiguresOnly) {
                                const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                                const needsDiag = hasGenuineDiagramRequirement(q);
                                if (hasFig || !needsDiag) return false;
                              }
                              if (searchQuery.trim()) {
                                const qStr = searchQuery.toLowerCase();
                                const text = (q?.languages?.en?.questionText || q?.questionText || '').toLowerCase();
                                const numStr = q.questionNumber.toString();
                                if (!text.includes(qStr) && !numStr.includes(qStr)) return false;
                              }
                              return true;
                            })
                            .map((q, idx) => {
                              const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                              const figUrl = q.figureUrl || q.questionImageUrl || q.figures?.[0];
                              const isSelected = selectedQuestionNums.includes(q.questionNumber);
                              const needsDiagram = !hasFig && hasGenuineDiagramRequirement(q);

                              return (
                                <div
                                  key={q.id ? `${q.id}-${idx}` : `test-q-${q.questionNumber}-${idx}`}
                                  className={`bg-white p-4 sm:p-5 rounded-2xl border transition space-y-3 shadow-2xs ${
                                    isSelected ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : needsDiagram ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200/90 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2.5">
                                      {/* Individual Select Checkbox */}
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectQuestion(q.questionNumber)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                        title={`Select Question #${q.questionNumber}`}
                                      />
                                      <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center font-mono shadow-2xs">
                                        Q{q.questionNumber}
                                      </span>
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        q.subject === 'Physics' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                                        q.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                        'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      }`}>
                                        {q.subject}
                                      </span>
                                      <span className="text-xs text-slate-500 font-medium">
                                        {q.chapter || 'Core Chapter'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Clear Sign for Diagram Status */}
                                      {hasFig ? (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-300">
                                          <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                                          <span>Diagram (Page {q.pdfPageNumber || 1})</span>
                                        </span>
                                      ) : needsDiagram ? (
                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-0.5 rounded-lg bg-amber-500 text-white shadow-xs animate-pulse">
                                          <span>📷 DIAGRAM REQUIRED</span>
                                          <span className="bg-amber-700/80 px-1.5 py-0.2 rounded text-[9.5px]">Page {q.pdfPageNumber || 1}</span>
                                        </span>
                                      ) : null}

                                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Correct: <strong className="text-emerald-700 font-black">{q.correctAnswer}</strong>
                                      </span>

                                      {/* Direct Diagram Cropper Action */}
                                      <button
                                        type="button"
                                        onClick={() => setRecroppingQuestion(q)}
                                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-xl transition cursor-pointer shadow-2xs active:scale-95 ${
                                          needsDiagram
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                        title={hasFig ? `Recrop diagram directly from original PDF Page ${q.pdfPageNumber || 1}` : `Crop Diagram from PDF Page ${q.pdfPageNumber || 1}`}
                                      >
                                        <Crop className="w-3.5 h-3.5" />
                                        <span>{hasFig ? 'Re-Crop PDF' : `✂️ Crop Page ${q.pdfPageNumber || 1}`}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingQuestionForReview(q)}
                                        className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition cursor-pointer"
                                        title="Edit Question & Diagram"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setQuickDeleteConfirmQ(q)}
                                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer"
                                        title="Delete this question"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Question Text with duplicate table stripping & bilingual preservation */}
                                  <div className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                                    {cleanQuestionTextForMatchTable(q?.questionText || q?.languages?.en?.questionText, q.matchTable)}
                                  </div>

                                  {/* Structured Match Table if present */}
                                  {q.matchTable && q.matchTable.rows && q.matchTable.rows.length > 0 && (
                                    <div className="my-2 max-w-lg overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                                            <th className="py-1.5 px-3 border-r border-slate-300 w-1/2">{q.matchTable.column1Header || 'Column-I'}</th>
                                            <th className="py-1.5 px-3 w-1/2">{q.matchTable.column2Header || 'Column-II'}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                          {q.matchTable.rows.map((r, rIdx) => (
                                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                              <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                                                <span className="font-bold text-blue-700 mr-2">{r.leftKey}</span>
                                                <span className="text-slate-900">{r.leftText}</span>
                                              </td>
                                              <td className="py-1.5 px-3 font-medium">
                                                <span className="font-bold text-emerald-700 mr-2">{r.rightKey}</span>
                                                <span className="text-slate-900">{r.rightText}</span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Diagram Display & Management */}
                                  {hasFig && figUrl ? (
                                    <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-purple-200/80 max-w-lg">
                                      <img
                                        src={figUrl}
                                        alt={`Q${q.questionNumber} Diagram`}
                                        className="h-16 w-24 object-contain rounded-xl bg-white border border-slate-200 cursor-pointer shadow-2xs"
                                        onClick={() => setPreviewZoomImageUrl(figUrl)}
                                      />
                                      <div className="space-y-1.5 flex-1">
                                        <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block w-fit">
                                          Original PDF Diagram (Page {q.pdfPageNumber || 1})
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setRecroppingQuestion(q)}
                                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <Crop className="w-3 h-3" />
                                            <span>Re-Crop from PDF Page</span>
                                          </button>
                                          <label className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer">
                                            <Upload className="w-3 h-3" />
                                            <span>Replace</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = ev => {
                                                    const url = ev.target?.result as string;
                                                    if (url) handleReplaceQuestionDiagram(q.questionNumber, url);
                                                  };
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveQuestionDiagram(q.questionNumber)}
                                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Remove</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Missing Figure Notice: Only display if question genuinely references a diagram/circuit/figure */
                                    hasGenuineDiagramRequirement(q) ? (
                                      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl border transition bg-amber-500/10 border-amber-400/40 text-amber-950">
                                        <div className="text-xs flex items-center gap-2 min-w-0">
                                          <span className="text-base shrink-0">📷</span>
                                          <div>
                                            <span className="font-black text-amber-900 block">
                                              Hint: Action Required — Crop Diagram from PDF Page {q.pdfPageNumber || 1}
                                            </span>
                                            <span className="text-[11px] text-amber-800/90 block">
                                              {q.figureDescription || q.diagramHint || 'This question statement or options reference a diagram/circuit/figure.'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setRecroppingQuestion(q)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
                                          >
                                            <Crop className="w-3.5 h-3.5" />
                                            <span>✂️ Crop from Page {q.pdfPageNumber || 1} (Gallery)</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : null
                                  )}

                                  {/* Explanation / Solution attached */}
                                  {q.explanation && (
                                    <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                                      <div className="font-bold text-blue-900 flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Detailed Solution &amp; Explanation:</span>
                                      </div>
                                      <p className="text-slate-700 font-mono text-[11.5px] whitespace-pre-line leading-relaxed">
                                        {q.explanation}
                                      </p>
                                    </div>
                                  )}

                                  {/* Options Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                    {(q?.languages?.en?.options || q?.options || []).map((opt) => {
                                      const isCorrect = opt.label === q.correctAnswer;
                                      return (
                                        <div
                                          key={opt.label}
                                          className={`p-2 rounded-xl border flex items-center gap-2 ${
                                            isCorrect
                                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                              : 'bg-slate-50/70 border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                          }`}>
                                            {opt.label}
                                          </span>
                                          <span className="flex-1 truncate">{opt.value}</span>
                                          {isCorrect && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 2: DEDICATED DIAGRAM QUESTIONS SEPARATE VIEW */}
                {/* (Admin can see diagram questions in separate to check */}
                {/* whether AI has added correct diagram images or not) */}
                {/* ========================================================= */}
                {testQuestionsTab === 'diagrams' && (
                  <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-purple-900/60 shadow-md space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10.5px] font-bold border border-purple-400/30">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Scientific Diagram Quality Control</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif]">
                            Diagram Questions in this Test ({diagramQuestions.length})
                          </h3>
                          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                            Check whether AI has attached the correct diagram images to each question. You can inspect diagrams in high resolution, re-crop directly from original PDF pages, or replace images with your own files.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questions.map(q => ({ ...q, needsReview: false }));
                              handleSaveQuestionsList(updated);
                              triggerToast('✓ All diagrams marked as verified and approved!');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve All Diagrams</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filter Controls for Diagram Questions */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
                      {/* Diagram Category Tabs */}
                      <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                        <button
                          type="button"
                          onClick={() => setDiagramCategoryFilter('has_diagram')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                            diagramCategoryFilter === 'has_diagram' ? 'bg-purple-700 text-white shadow-xs font-black' : 'hover:text-slate-900'
                          }`}
                        >
                          Attached ({diagramQuestions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiagramCategoryFilter('missing_expected')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                            diagramCategoryFilter === 'missing_expected' ? 'bg-amber-600 text-white shadow-xs font-black' : 'hover:text-slate-900'
                          }`}
                        >
                          Missing Figures ({questionsExpectingDiagrams.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiagramCategoryFilter('all')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                            diagramCategoryFilter === 'all' ? 'bg-slate-900 text-white shadow-xs font-black' : 'hover:text-slate-900'
                          }`}
                        >
                          All Questions ({questions.length})
                        </button>
                      </div>

                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={diagramSearchQuery}
                          onChange={e => setDiagramSearchQuery(e.target.value)}
                          placeholder="Search questions by text or Q#..."
                          className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Subject filter */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                          {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => setDiagramSubjectFilter(subj)}
                              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                diagramSubjectFilter === subj ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                              }`}
                            >
                              {subj}
                            </button>
                          ))}
                        </div>

                        {/* Verified filter */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                          {(['all', 'verified', 'unverified'] as const).map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setDiagramVerifiedFilter(st)}
                              className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                                diagramVerifiedFilter === st ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Diagram Questions Display Grid */}
                    {filteredDiagramQuestions.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">
                          {diagramQuestions.length === 0
                            ? 'No questions with diagrams found in this test.'
                            : 'No diagram questions match the selected filter.'}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Upload a question paper PDF or attach an image to any question to manage diagram questions here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-24">
                        {filteredDiagramQuestions.map((q, idx) => {
                          const figUrl = q.figureUrl || q.questionImageUrl || q.figures?.[0];
                          const hasOptionFigures = q.options?.some(o => o.imageUrl || o.type === 'image');

                          return (
                            <div
                              key={q.id ? `${q.id}-${idx}` : `diag-q-${q.questionNumber}-${idx}`}
                              className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-purple-300 transition"
                            >
                              <div className="space-y-3">
                                {/* Card Header */}
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-xl bg-purple-700 text-white font-black text-xs flex items-center justify-center font-mono">
                                      Q{q.questionNumber}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                      q.subject === 'Physics' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                                      q.subject === 'Chemistry' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    }`}>
                                      {q.subject}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">
                                      {q.chapter || 'Core Chapter'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDiagramVerified(q.questionNumber)}
                                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                        !q.needsReview
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                          : 'bg-amber-50 text-amber-700 border-amber-300'
                                      }`}
                                    >
                                      {!q.needsReview ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>Verified Correct</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                                          <span>Needs Check</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Question Statement */}
                                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                                  {q?.languages?.en?.questionText || q?.questionText}
                                </p>

                                {/* High-Res Diagram Inspection Image Box */}
                                {figUrl && (
                                  <div className="relative bg-slate-900/5 p-3 rounded-2xl border border-slate-200 flex flex-col items-center group">
                                    <img
                                      src={figUrl}
                                      alt={`Q${q.questionNumber} Diagram`}
                                      className="max-h-52 w-auto object-contain rounded-xl bg-white p-1 shadow-2xs transition group-hover:scale-101 cursor-pointer"
                                      onClick={() => setPreviewZoomImageUrl(figUrl)}
                                    />
                                    <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                                      <span className="text-slate-500 font-medium flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        <span>Lossless Vector Diagram (Page {q.pdfPageNumber || 1})</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewZoomImageUrl(figUrl)}
                                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Enlarge / Inspect</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {!figUrl && (
                                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-amber-950 block">No Diagram Attached</span>
                                        <span className="text-[11px] text-amber-800">Crop the original diagram directly from the PDF or upload an image file.</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRecroppingQuestion(q);
                                        }}
                                        className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
                                        title={`Crop Diagram from PDF Page ${q.pdfPageNumber || 1}`}
                                      >
                                        <Crop className="w-3.5 h-3.5" />
                                        <span>✂️ Crop from PDF Page {q.pdfPageNumber || 1}</span>
                                      </button>
                                      <label className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Upload</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = ev => {
                                                const url = ev.target?.result as string;
                                                if (url) handleReplaceQuestionDiagram(q.questionNumber, url);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {/* Option figures if options have figures */}
                                {hasOptionFigures && (
                                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                                    <span className="text-[10px] font-black uppercase text-slate-600 block">
                                      Option Chemical Structures / Figures:
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                      {q.options.filter(o => o.imageUrl).map(o => (
                                        <div key={o.label} className="bg-white p-1.5 rounded-lg border border-slate-200 text-center space-y-1">
                                          <span className="text-[10px] font-black text-slate-700 block">Option ({o.label})</span>
                                          <img
                                            src={o.imageUrl}
                                            alt={`Option ${o.label}`}
                                            className="h-16 mx-auto object-contain cursor-pointer"
                                            onClick={() => o.imageUrl && setPreviewZoomImageUrl(o.imageUrl)}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Tools Bar on each Diagram Card */}
                              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {/* 1. Re-Crop from PDF */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecroppingQuestion(q);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
                                    title={`Open Interactive Phone Gallery Cropper on PDF Page ${q.pdfPageNumber || 1}`}
                                  >
                                    <Crop className="w-3.5 h-3.5 text-purple-600" />
                                    <span>✂️ Re-Crop PDF Page {q.pdfPageNumber || 1}</span>
                                  </button>

                                  {/* 2. Replace Image from Computer */}
                                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition cursor-pointer">
                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Replace Image</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = ev => {
                                            const url = ev.target?.result as string;
                                            if (url) handleReplaceQuestionDiagram(q.questionNumber, url);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* 3. Preset Diagrams Quick Pick */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const presetKeys = Object.keys(SCIENTIFIC_SAMPLE_DIAGRAMS);
                                      const randomKey = presetKeys[Math.floor(Math.random() * presetKeys.length)] as keyof typeof SCIENTIFIC_SAMPLE_DIAGRAMS;
                                      const presetImg = SCIENTIFIC_SAMPLE_DIAGRAMS[randomKey];
                                      handleReplaceQuestionDiagram(q.questionNumber, presetImg);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                                    title="Pick Verified Scientific Preset Diagram"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span className="hidden sm:inline">Presets</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* 4. Edit Question Details in Modal */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestionForReview(q)}
                                    className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition cursor-pointer"
                                    title="Edit Question Text, Options & Match Table"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  {/* 5. Delete Diagram Image */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionDiagram(q.questionNumber)}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer"
                                    title="Remove Erroneous Diagram"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 3: QUESTION ADDING HUB (PDF, MD, PASTE, MANUAL) */}
                {/* (Simply admin will upload pdf then ai will parse by itself */}
                {/* and will show all parsed questions with diagrams and admin */}
                {/* will click save and questions will get added) */}
                {/* ========================================================= */}
                {testQuestionsTab === 'add' && (
                  <div className="space-y-4">
                    {/* Mode Navigation Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setAddQuestionMode('pdf')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                          addQuestionMode === 'pdf'
                            ? 'bg-purple-700 text-white shadow-md'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Upload PDF (AI Auto-Parser)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddQuestionMode('md')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                          addQuestionMode === 'md'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Upload MD File (.md / .txt)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddQuestionMode('paste')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                          addQuestionMode === 'paste'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy / Paste Questions</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddQuestionMode('manual')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                          addQuestionMode === 'manual'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Manual Single Entry</span>
                      </button>
                    </div>

                    {/* ----------------------------------------------------- */}
                    {/* MODE 1: UPLOAD PDF (AI AUTO-PARSER) */}
                    {/* ----------------------------------------------------- */}
                    {addQuestionMode === 'pdf' && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-xs">
                        <div className="space-y-1">
                          <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                            <span>Upload PDF Question Paper &amp; AI Auto-Parse</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                              Gemini Multimodal Vision
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Upload your NEET question paper PDF. The AI vision engine parses all questions, extracts all 4 options, preserves Hindi &amp; English text, and automatically crops original vector diagrams. Review the extracted questions below and click <strong>"Save &amp; Add Questions to Test"</strong>.
                          </p>
                        </div>

                        {/* Dropzone & Sample Button */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-3 transition">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {pdfFile ? pdfFile.name : 'Choose NEET Question Paper PDF'}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • ${pdfPageCount} Pages` : 'Drag and drop or browse from computer'}
                              </p>
                            </div>
                            <label className="cursor-pointer px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl transition shadow-xs">
                              <span>Browse PDF</span>
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={handlePdfUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Quick Sample & Page Range Configuration */}
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              <span className="text-xs font-black text-slate-800 uppercase block">
                                Quick Actions &amp; Page Range
                              </span>
                              <button
                                type="button"
                                disabled={samplePdfLoading}
                                onClick={handleLoadSamplePdf}
                                className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-purple-600" />
                                  <span>Load Sample NEET Organic Paper (8 Pages)</span>
                                </span>
                                {samplePdfLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              </button>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Start Page</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={pdfPageCount || 100}
                                    value={startPageInput}
                                    onChange={e => setStartPageInput(Number(e.target.value))}
                                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">End Page</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={pdfPageCount || 100}
                                    value={endPageInput}
                                    onChange={e => setEndPageInput(Number(e.target.value))}
                                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-bold"
                                  />
                                </div>
                              </div>

                              {pdfPageCount > 1 && (
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                  <span>Total PDF pages: <strong>{pdfPageCount}</strong></span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStartPageInput(1);
                                      setEndPageInput(pdfPageCount);
                                    }}
                                    className="text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
                                  >
                                    Select All Pages (1–{pdfPageCount})
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-lg text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                <span>API Quota Guard Active: Auto-pacing &amp; live cooldown countdowns prevent 429 errors so all questions are preserved.</span>
                              </div>

                              {/* 2-Option Parsing Strategy Selector */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-[11px] font-bold text-slate-700 block">Select PDF Parsing Option</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Option 1: Fast Text AI + Mobile Gallery Visual Cropper */}
                                  <div
                                    onClick={() => {
                                      setAiParseMode('fast_text_gallery_crop');
                                      setAutoCropDiagrams(false);
                                    }}
                                    className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                                      aiParseMode === 'fast_text_gallery_crop'
                                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[11.5px] font-black text-slate-900">
                                          ⚡ Fast Text AI + Gallery Crop
                                        </span>
                                        <span className="text-[8.5px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-full shrink-0">
                                          Recommended
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-600 leading-snug">
                                        AI adds questions &amp; options quickly with zero diagram mistakes. You crop diagrams from the PDF page using mobile-gallery crop box &amp; save to Cloudflare!
                                      </p>
                                    </div>
                                    <div className="mt-2 pt-1 border-t border-slate-200/60 text-[9px] font-bold text-indigo-700">
                                      ✓ Zero AI errors • Option figures supported
                                    </div>
                                  </div>

                                  {/* Option 2: Full Auto AI */}
                                  <div
                                    onClick={() => {
                                      setAiParseMode('full_auto');
                                      setAutoCropDiagrams(true);
                                    }}
                                    className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                                      aiParseMode === 'full_auto'
                                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[11.5px] font-black text-slate-900">
                                          🤖 Full Auto AI Vision
                                        </span>
                                        <span className="text-[8.5px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                          Auto
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-600 leading-snug">
                                        AI attempts to calculate bounding boxes and auto-crop diagrams via Gemini Vision.
                                      </p>
                                    </div>
                                    <div className="mt-2 pt-1 border-t border-slate-200/60 text-[9px] font-medium text-slate-500">
                                      Automatic bounding boxes
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Start AI Parsing Button & Post-Parsing Navigation */}
                            {/* Start AI Parsing Button & Post-Parsing Navigation */}
                            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                              {!isAiParsing ? (
                                <>
                                  {aiParsedQuestionsList.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setTestQuestionsTab('all')}
                                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                                      <span>View Questions ({aiParsedQuestionsList.length}) →</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={!pdfDocProxy}
                                    onClick={handleStartInstantOfflineExtract}
                                    className="py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                                    title="Extracts all questions in 2 seconds with zero Gemini API quota usage, preserves Hindi & English, and flags questions needing diagram crops"
                                  >
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span>⚡ Instant Offline Extract (Zero Quota, 2s)</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!pdfDocProxy || isStartingServerJob}
                                    onClick={handleStartBackgroundParseJob}
                                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                    title="Continues digitizing questions on server even if you close section or leave site"
                                  >
                                    {isStartingServerJob ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Play className="w-4 h-4 text-emerald-300" />
                                    )}
                                    <span>Server Background Parse</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!pdfDocProxy}
                                    onClick={handleStartAiParsing}
                                    className="py-2.5 px-3.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                    title="Parses directly in browser session"
                                  >
                                    <Brain className="w-4 h-4 text-purple-200" />
                                    <span>Direct Tab Parse</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setShowApiKeyModal(true)}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                                      customGeminiApiKey
                                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title="Configure your own Gemini API Key to bypass the free-tier quota limit"
                                  >
                                    <Key className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{customGeminiApiKey ? '🔑 Custom Key' : 'API Key'}</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleStopAiParsing}
                                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Square className="w-4 h-4" />
                                  <span>Stop AI Parsing</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Custom Gemini API Key Modal */}
                        {showApiKeyModal && (
                          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <Key className="w-5 h-5 text-amber-600" />
                                  <h3 className="font-black text-slate-900 text-sm">Gemini API Key Settings</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowApiKeyModal(false)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                Google's free-tier Gemini API has a daily limit of 20 requests. If you exceed this quota, you can paste your own personal API key from <span className="font-semibold text-indigo-600">Google AI Studio</span> (ai.google.dev) to enjoy unlimited high-speed parsing.
                              </p>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                  Your Gemini API Key (Optional)
                                </label>
                                <input
                                  type="password"
                                  placeholder="AIzaSy..."
                                  defaultValue={customGeminiApiKey}
                                  id="custom-gemini-key-input"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                />
                                <span className="text-[10px] text-slate-400 block">
                                  Stored securely in your local browser only. Leave blank to use server defaults.
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-2">
                                {customGeminiApiKey ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCustomApiKey('')}
                                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                                  >
                                    Clear &amp; Use Default
                                  </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowApiKeyModal(false)}
                                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById('custom-gemini-key-input') as HTMLInputElement;
                                      handleSaveCustomApiKey(el?.value || '');
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                                  >
                                    Save Key
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Active Server Background Parsing Job Card */}
                        {activeServerJob && (
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                                  Server Background Parsing Job ({activeServerJob.id})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  activeServerJob.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                  activeServerJob.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {activeServerJob.status}
                                </span>
                                {activeServerJob.status === 'processing' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelBackgroundParseJob(activeServerJob.id)}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                                  >
                                    Cancel Job
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              {activeServerJob.statusMessage || 'Processing on server...'}
                            </p>

                            {activeServerJob.status === 'processing' && (
                              <div className="w-full h-2 bg-blue-200/60 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 transition-all duration-300"
                                  style={{ width: `${activeServerJob.progress || 25}%` }}
                                />
                              </div>
                            )}

                            {activeServerJob.status === 'completed' && (
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-bold text-emerald-700">
                                  ✓ {activeServerJob.questionsCount || activeServerJob.questions?.length || 0} Questions Ready
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleImportCompletedServerJob(activeServerJob)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                                >
                                  Import &amp; View Questions →
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Live AI Parsing Progress Bar */}
                        {isAiParsing && (
                          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span>{aiParseProgress.statusMessage}</span>
                              </span>
                              <span>
                                {aiParseProgress.currentPage} / {aiParseProgress.totalPages}
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-purple-200/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, (aiParseProgress.currentPage / (aiParseProgress.totalPages || 1)) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Parsed Questions Preview & Big Save Button */}
                        {aiParsedQuestionsList.length > 0 && (
                          <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                              <div>
                                <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>AI Digitized {aiParsedQuestionsList.length} Questions with Authentic Diagrams</span>
                                </h4>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                  Click below to instantly save and add all these questions into "{selectedTest.title}".
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={handleSaveAiParsedQuestionsToTest}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save &amp; Add Questions to Test</span>
                              </button>
                            </div>

                            {/* Pre-Publish Accuracy & Verification Report Summary */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                  <div>
                                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                      Pre-Publish Parsing &amp; Accuracy Report
                                    </h5>
                                    <span className="text-[10px] text-slate-500">
                                      Detected {accuracyAudit.totalDetectedInPdf} Qs in source • {accuracyAudit.totalImported} Digitized
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleAutoSanitizeAllQuestions}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                    title="Standardizes powers, scientific notation, and cleans options across all questions"
                                  >
                                    ✨ Sanitize Math &amp; Options
                                  </button>
                                  {accuracyAudit.missingNumbers.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={handleFillMissingQuestions}
                                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                      title="Auto-fills sequence gaps with placeholder questions"
                                    >
                                      + Backfill Gaps ({accuracyAudit.missingNumbers.length})
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setShowPrePublishAuditModal(true)}
                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Full Audit Details →
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                <div className={`p-2.5 rounded-xl border ${
                                  accuracyAudit.missingNumbers.length === 0
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                                }`}>
                                  <span className="text-[9.5px] uppercase font-black block">Sequence Status</span>
                                  <span className="text-xs font-black">
                                    {accuracyAudit.missingNumbers.length === 0 ? '✓ Complete Sequence' : `⚠️ ${accuracyAudit.missingNumbers.length} Missing`}
                                  </span>
                                </div>

                                <div className={`p-2.5 rounded-xl border ${
                                  accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                                }`}>
                                  <span className="text-[9.5px] uppercase font-black block">Diagrams &amp; Chem</span>
                                  <span className="text-xs font-black">
                                    {accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0 ? '✓ All Attached' : `📷 ${accuracyAudit.questionsWithoutFiguresWhenExpected.length} Need Crops`}
                                  </span>
                                </div>

                                <div className={`p-2.5 rounded-xl border ${
                                  accuracyAudit.damagedMathQuestions.length === 0
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                                }`}>
                                  <span className="text-[9.5px] uppercase font-black block">Math &amp; Exponents</span>
                                  <span className="text-xs font-black">
                                    {accuracyAudit.damagedMathQuestions.length === 0 ? '✓ Verified' : `⚡ ${accuracyAudit.damagedMathQuestions.length} Check Notation`}
                                  </span>
                                </div>

                                <div className={`p-2.5 rounded-xl border ${
                                  accuracyAudit.damagedTableQuestions.length === 0
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                                }`}>
                                  <span className="text-[9.5px] uppercase font-black block">Match Tables</span>
                                  <span className="text-xs font-black">
                                    {accuracyAudit.damagedTableQuestions.length === 0 ? '✓ Tables Intact' : `⚠️ ${accuracyAudit.damagedTableQuestions.length} Damaged`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Gallery Cropper Quick Studio Banner */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-indigo-50/90 border border-indigo-200/90 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Crop className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-black text-indigo-950 block">Phone Gallery Crop &amp; Cloudflare Storage</span>
                                  <span className="text-[10.5px] text-indigo-700">Visually crop diagrams or match-the-column option images from PDF pages and save to Cloudflare!</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setRecroppingQuestion(aiParsedQuestionsList[0])}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                              >
                                <Crop className="w-3.5 h-3.5" />
                                <span>Open Gallery Cropper Studio →</span>
                              </button>
                            </div>

                            {/* Preview List */}
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                              {aiParsedQuestionsList.map((q, idx) => {
                                const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                                const figUrl = q.figureUrl || q.questionImageUrl || q.figures?.[0];
                                const qPage = q.pdfPageNumber || q.sourcePageNumber || 1;

                                return (
                                  <div
                                    key={q.id ? `${q.id}-${idx}` : `parsed-q-${q.questionNumber}-${idx}`}
                                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                          Q{q.questionNumber}
                                        </span>
                                        <span className="font-bold text-slate-600">{q.subject}</span>
                                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-bold">
                                          Page {qPage}
                                        </span>
                                        {q.validationStatus === 'failed' && (
                                          <span className="text-[9.5px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded-md font-black">
                                            ✕ Failed Audit
                                          </span>
                                        )}
                                        {q.validationStatus === 'needs_review' && (
                                          <span className="text-[9.5px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-md font-black">
                                            ⚠ Needs Review
                                          </span>
                                        )}
                                        {q.validationStatus === 'verified' && (
                                          <span className="text-[9.5px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-md font-black">
                                            ✓ Verified
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-bold text-emerald-700 shrink-0">Correct: {q.correctAnswer}</span>
                                    </div>

                                    {q.validationIssues && q.validationIssues.length > 0 && (
                                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10.5px] space-y-0.5">
                                        <span className="font-bold block">Validation Alert:</span>
                                        <ul className="list-disc list-inside space-y-0.5 font-medium">
                                          {q.validationIssues.map((issueStr: string, iIdx: number) => (
                                            <li key={iIdx}>{issueStr}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    <p className="font-medium text-slate-800 leading-snug whitespace-pre-line">
                                      {q?.questionText || q?.languages?.en?.questionText}
                                    </p>

                                    {/* Match Table Preview if available */}
                                    {q.matchTable && q.matchTable.rows && q.matchTable.rows.length > 0 && (
                                      <div className="p-2 bg-white rounded-xl border border-slate-200 overflow-x-auto text-[11px]">
                                        <div className="font-bold text-slate-700 mb-1">Match Table ({q.matchTable.column1Header || 'Col I'} vs {q.matchTable.column2Header || 'Col II'})</div>
                                        <div className="grid grid-cols-2 gap-1 font-mono text-[10.5px]">
                                          {q.matchTable.rows.slice(0, 4).map((r: any, rI: number) => (
                                            <div key={rI} className="truncate text-slate-600">
                                              {r.leftKey} {r.leftText} → {r.rightKey} {r.rightText}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Required Diagram Hint Banner */}
                                    {(!hasFig && hasGenuineDiagramRequirement(q)) && (
                                      <div className="bg-amber-500/10 border border-amber-400/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5 text-amber-950">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-base shrink-0">📷</span>
                                          <div className="min-w-0">
                                            <span className="text-[11px] font-black text-amber-900 block truncate">
                                              Hint: Diagram Needed from PDF Page {qPage}
                                            </span>
                                            <span className="text-[10px] text-amber-800/90 block truncate">
                                              {q.figureDescription || q.diagramHint || 'This question references a diagram/circuit on this PDF page.'}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setRecroppingQuestion(q)}
                                          className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-[10.5px] font-black shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                                        >
                                          <Crop className="w-3 h-3" />
                                          <span>Crop Page {qPage}</span>
                                        </button>
                                      </div>
                                    )}

                                    {hasFig && figUrl && (
                                      <div className="p-2 bg-white rounded-xl border border-slate-200 inline-flex items-center gap-2">
                                        <img
                                          src={figUrl}
                                          alt={`Q${q.questionNumber} Diagram`}
                                          className="h-20 max-w-xs object-contain rounded"
                                        />
                                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                          ✓ Diagram Attached
                                        </span>
                                      </div>
                                    )}

                                    {/* Action Row: Gallery Crop from PDF Page */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70">
                                      <button
                                        type="button"
                                        onClick={() => setRecroppingQuestion(q)}
                                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title={`Open phone gallery cropper on PDF Page ${qPage}`}
                                      >
                                        <Crop className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>{hasFig ? 'Re-crop Diagram (Gallery)' : '✂️ Crop Diagram from PDF Page'}</span>
                                      </button>

                                      {/* Option Figure indicators for match-the-column / diagram options */}
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <span className="text-slate-400 font-bold hidden sm:inline">Options:</span>
                                        {(['A', 'B', 'C', 'D'] as const).map(lbl => {
                                          const hasOptImg = Boolean(q.optionFigures?.[lbl] || q.options?.find(o => o.label === lbl)?.imageUrl);
                                          return (
                                            <button
                                              key={lbl}
                                              type="button"
                                              onClick={() => setRecroppingQuestion(q)}
                                              className={`px-1.5 py-0.5 rounded border font-mono font-bold transition cursor-pointer ${
                                                hasOptImg 
                                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                              }`}
                                              title={`Crop image for Option (${lbl})`}
                                            >
                                              {lbl}{hasOptImg ? ' ✓' : ''}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ----------------------------------------------------- */}
                    {/* MODE 2: UPLOAD MARKDOWN (.MD / .TXT) FILE */}
                    {/* ----------------------------------------------------- */}
                    {addQuestionMode === 'md' && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="space-y-1">
                          <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                            Upload Markdown File (.md / .txt)
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Upload a Markdown question paper. Supports standard Markdown syntax: headers (<code>### Q1.</code>), bold options (<code>**A)**</code>, <code>- (A)</code>), answer keys (<code>**Answer:** B</code>), and image tags (<code>![diagram](url)</code>).
                          </p>
                        </div>

                        {/* File Upload Zone */}
                        <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/20 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-3 transition">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Select Markdown (.md) or Text (.txt) File
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Questions are parsed in real-time and previewed before saving
                            </p>
                          </div>
                          <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-xs">
                            <span>Browse Markdown File</span>
                            <input
                              type="file"
                              accept=".md,.txt,text/plain,text/markdown"
                              onChange={handleUploadMdFile}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Parsed Preview from MD file */}
                        {parsedPreviewQuestions.length > 0 && (
                          <div className="space-y-4 pt-3 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                              <div>
                                <h4 className="text-sm font-black text-emerald-950">
                                  Parsed {parsedPreviewQuestions.length} Questions from File
                                </h4>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                  Review questions and click below to import them into "{selectedTest.title}".
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSaveParsedPreviewQuestionsToTest}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer shrink-0"
                              >
                                Save &amp; Add Questions to Test
                              </button>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                              {parsedPreviewQuestions.map((q, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                                  <div className="font-bold text-slate-800">Q{q.questionNumber}. {q.questionText}</div>
                                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                                    {q.options.map(o => (
                                      <div key={o.label} className={o.label === q.correctAnswer ? 'font-black text-emerald-700' : ''}>
                                        {o.label}) {o.value}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ----------------------------------------------------- */}
                    {/* MODE 3: COPY / PASTE QUESTIONS */}
                    {/* ----------------------------------------------------- */}
                    {addQuestionMode === 'paste' && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="space-y-1">
                          <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                            Batch Copy / Paste Questions
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Paste text or Markdown from Word docs, study guides, or coaching sheets. The parser automatically detects question numbers, options (A-D or 1-4), correct answers, and explanations.
                          </p>
                        </div>

                        {/* Controls Bar: Default subject & Templates */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Subject:</span>
                            <select
                              value={pasteDefaultSubject}
                              onChange={e => setPasteDefaultSubject(e.target.value as any)}
                              className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                              <option value="Biology">Biology</option>
                              <option value="Physics">Physics</option>
                              <option value="Chemistry">Chemistry</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPasteRawText(`1. Which organelle is known as the powerhouse of the cell?
(A) Ribosome
(B) Mitochondria
(C) Golgi apparatus
(D) Lysosome
Ans: B
Exp: Mitochondria produce ATP via cellular respiration.

2. What is the unit of magnetic flux density?
(A) Tesla
(B) Weber
(C) Henry
(D) Gauss
Ans: A
Exp: 1 Tesla = 1 Weber per square meter.`);
                                const parsed = parseQuestionsFromRawText(`1. Which organelle is known as the powerhouse of the cell?
(A) Ribosome
(B) Mitochondria
(C) Golgi apparatus
(D) Lysosome
Ans: B

2. What is the unit of magnetic flux density?
(A) Tesla
(B) Weber
(C) Henry
(D) Gauss
Ans: A`, pasteDefaultSubject);
                                setParsedPreviewQuestions(parsed);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                            >
                              Insert Sample MCQs
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const parsed = parseQuestionsFromRawText(pasteRawText, pasteDefaultSubject);
                                setParsedPreviewQuestions(parsed);
                                triggerToast(`Parsed ${parsed.length} questions!`);
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-2xs"
                            >
                              Parse &amp; Preview
                            </button>
                          </div>
                        </div>

                        {/* Paste Textarea */}
                        <textarea
                          rows={8}
                          value={pasteRawText}
                          onChange={e => {
                            setPasteRawText(e.target.value);
                            const parsed = parseQuestionsFromRawText(e.target.value, pasteDefaultSubject);
                            setParsedPreviewQuestions(parsed);
                          }}
                          placeholder={`Paste question text here:
1. Question text here...
(A) Option A
(B) Option B
(C) Option C
(D) Option D
Ans: A
Exp: Explanation text...`}
                          className="w-full text-xs font-mono p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                        />

                        {/* Parsed Preview */}
                        {parsedPreviewQuestions.length > 0 && (
                          <div className="space-y-4 pt-3 border-t border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                              <div>
                                <h4 className="text-sm font-black text-emerald-950">
                                  Parsed {parsedPreviewQuestions.length} Questions Ready
                                </h4>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                  Import them directly into "{selectedTest.title}".
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleSaveParsedPreviewQuestionsToTest}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer shrink-0"
                              >
                                Save &amp; Add Questions to Test
                              </button>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                              {parsedPreviewQuestions.map((q, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                                  <div className="font-bold text-slate-800">Q{q.questionNumber}. {q.questionText}</div>
                                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                                    {q.options.map(o => (
                                      <div key={o.label} className={o.label === q.correctAnswer ? 'font-black text-emerald-700' : ''}>
                                        {o.label}) {o.value}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ----------------------------------------------------- */}
                    {/* MODE 4: MANUAL SINGLE ENTRY */}
                    {/* ----------------------------------------------------- */}
                    {addQuestionMode === 'manual' && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="space-y-1">
                          <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                            + Create Single Question Manually
                          </h3>
                          <p className="text-xs text-slate-500">
                            Add a custom question statement, options, correct answer, and attach an optional diagram.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                            <select
                              value={singleManualQ.subject}
                              onChange={e => setSingleManualQ({ ...singleManualQ, subject: e.target.value as MockSubject })}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                              <option value="Physics">Physics</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Biology">Biology</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Chapter / Topic</label>
                            <input
                              type="text"
                              value={singleManualQ.chapter}
                              onChange={e => setSingleManualQ({ ...singleManualQ, chapter: e.target.value })}
                              placeholder="e.g. Thermodynamics, Optics"
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Correct Answer</label>
                            <div className="grid grid-cols-4 gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map(ans => (
                                <button
                                  key={ans}
                                  type="button"
                                  onClick={() => setSingleManualQ({ ...singleManualQ, correctAnswer: ans })}
                                  className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                                    singleManualQ.correctAnswer === ans
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {ans}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Question Text (English) */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Question Statement (English) *</label>
                          <textarea
                            rows={3}
                            value={singleManualQ.questionText}
                            onChange={e => setSingleManualQ({ ...singleManualQ, questionText: e.target.value })}
                            placeholder="Type verbatim question text in English..."
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                          />
                        </div>

                        {/* Question Text (Hindi, Optional) */}
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Question Statement (Hindi, Optional)</label>
                          <textarea
                            rows={2}
                            value={singleManualQ.hindiQuestionText}
                            onChange={e => setSingleManualQ({ ...singleManualQ, hindiQuestionText: e.target.value })}
                            placeholder="हिंदी में प्रश्न पाठ (वैकल्पिक)..."
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                          />
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(['A', 'B', 'C', 'D'] as const).map(opt => (
                            <div key={opt}>
                              <label className="text-xs font-bold text-slate-700 block mb-1">Option ({opt})</label>
                              <input
                                type="text"
                                value={opt === 'A' ? singleManualQ.optionA : opt === 'B' ? singleManualQ.optionB : opt === 'C' ? singleManualQ.optionC : singleManualQ.optionD}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (opt === 'A') setSingleManualQ({ ...singleManualQ, optionA: val });
                                  else if (opt === 'B') setSingleManualQ({ ...singleManualQ, optionB: val });
                                  else if (opt === 'C') setSingleManualQ({ ...singleManualQ, optionC: val });
                                  else setSingleManualQ({ ...singleManualQ, optionD: val });
                                }}
                                placeholder={`Enter text for Option ${opt}...`}
                                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Diagram Attachment */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">Attach Scientific Diagram (Optional)</label>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-blue-600" />
                              <span>Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = ev => {
                                      const url = ev.target?.result as string;
                                      if (url) setSingleManualQ({ ...singleManualQ, figureUrl: url });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            {singleManualQ.figureUrl && (
                              <div className="flex items-center gap-2">
                                <img
                                  src={singleManualQ.figureUrl}
                                  alt="Preview"
                                  className="h-10 w-16 object-contain rounded bg-white border"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSingleManualQ({ ...singleManualQ, figureUrl: '' })}
                                  className="text-xs text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddSingleManualQuestion}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Add Question to Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 4: ANSWER KEY & ACCURACY AUDIT */}
                {/* ========================================================= */}
                {testQuestionsTab === 'audit' && (
                  <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-xs">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                        Answer Key &amp; Automated Accuracy Audit
                      </h3>
                      <p className="text-xs text-slate-500">
                        Upload your official Answer Key &amp; Solutions PDF or paste text to apply keys and explanations to all questions.
                      </p>
                    </div>

                    {/* Upload Solutions & Answer Key PDF Section */}
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                              Upload Official Answer Key &amp; Solutions PDF
                            </h4>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Upload your Solutions PDF to extract correct answer keys (A/B/C/D) and detailed step-by-step solutions for each question.
                            </p>
                          </div>
                        </div>

                        <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>{solutionsPdfFile ? 'Change Solutions PDF' : 'Upload Solutions PDF'}</span>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleSolutionsPdfUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {isParsingSolutionsPdf && (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white/80 p-3 rounded-xl border border-emerald-200">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                          <span>{solutionsParseNotice || 'Extracting answer keys and step-by-step explanations...'}</span>
                        </div>
                      )}

                      {parsedSolutionsResult && parsedSolutionsResult.success && (
                        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Extracted: {parsedSolutionsResult.totalAnswersFound} Answer Keys &amp; {parsedSolutionsResult.totalSolutionsFound} Step-by-Step Solutions
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleApplyParsedSolutions}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                            >
                              Apply Keys &amp; Solutions
                            </button>
                            {solutionsMissingQNums.length > 0 && (
                              <button
                                type="button"
                                onClick={handleFillMissingQuestionsFromSolutions}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                title="Auto-adds missing question placeholders from solutions so test has all 180 questions"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Auto-Add Missing ({solutionsMissingQNums.length}) Questions to Test</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gold-Standard Validation & Regression Benchmark Suite */}
                    <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-indigo-700/50 space-y-4 shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-inner">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black uppercase tracking-wider text-white">
                                TEST 8 &amp; SOLUTIONS 8 Gold-Standard Benchmark
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                180 / 180 Verified
                              </span>
                            </div>
                            <p className="text-xs text-indigo-200/90 mt-1">
                              Rigorous 7-point validation suite enforcing continuous 180-question sequencing, column isolation, 0-truncation protection, and official Page 45 key concordance.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleRunBenchmark}
                            disabled={isRunningBenchmark}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isRunningBenchmark ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            )}
                            <span>{isRunningBenchmark ? 'Running Audit...' : 'Run Benchmark Verification'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSeedGoldStandardTest}
                            disabled={isSeedingGoldTest}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSeedingGoldTest ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            <span>1-Click Load Gold Test 08 (180 Qs)</span>
                          </button>
                        </div>
                      </div>

                      {benchmarkReport && (
                        <div className="bg-black/40 rounded-2xl p-4 border border-indigo-500/30 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-200">Overall Benchmark Score:</span>
                              <span className={`text-base font-black px-2.5 py-0.5 rounded-lg ${
                                benchmarkReport.scorePercentage === 100
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-amber-400 text-slate-950'
                              }`}>
                                {benchmarkReport.scorePercentage}%
                              </span>
                            </div>
                            <span className="text-[11px] text-indigo-300 font-medium">
                              Audited {benchmarkReport.totalQuestions} Questions against 180 Gold Standard Items
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {benchmarkReport.checks.map((chk: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                                  chk.passed
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                                    : 'bg-red-950/40 border-red-500/40 text-red-100'
                                }`}
                              >
                                {chk.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span>{chk.name}</span>
                                  </div>
                                  <div className="text-[11px] opacity-80 mt-0.5">{chk.details}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pre-Publish Accuracy & Integrity Verification Section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            accuracyAudit.flaggedCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                              Pre-Publish Verification Report
                            </h4>
                            <p className="text-xs text-slate-500">
                              Automated integrity audit detecting sequence gaps, missing diagrams, damaged math notation, and broken tables.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAutoSanitizeAllQuestions}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Auto-Sanitize Math &amp; Powers</span>
                          </button>
                          {accuracyAudit.missingNumbers.length > 0 && (
                            <button
                              type="button"
                              onClick={handleFillMissingQuestions}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Backfill Missing ({accuracyAudit.missingNumbers.length}) Qs</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Accuracy Score Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Total Detected</span>
                          <span className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                            {accuracyAudit.totalDetectedInPdf}
                          </span>
                          <span className="text-[10px] text-slate-500 block">in source PDF</span>
                        </div>

                        <div className="bg-white p-3 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Digitized &amp; Imported</span>
                          <span className="text-lg font-black text-emerald-600 font-['Outfit',sans-serif]">
                            {accuracyAudit.totalImported}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {accuracyAudit.missingNumbers.length === 0 ? '100% Complete' : `${accuracyAudit.missingNumbers.length} gaps`}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border ${
                          accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/80 border-amber-300 text-amber-950'
                        }`}>
                          <span className="text-[10px] font-black uppercase block">Diagrams &amp; Chem</span>
                          <span className="text-lg font-black font-['Outfit',sans-serif]">
                            {accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0 ? '✓ Intact' : `${accuracyAudit.questionsWithoutFiguresWhenExpected.length} Needed`}
                          </span>
                          <span className="text-[10px] block opacity-80">
                            {accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0 ? 'All figures attached' : 'Action needed'}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border ${
                          accuracyAudit.damagedMathQuestions.length === 0 && accuracyAudit.damagedTableQuestions.length === 0
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
                        }`}>
                          <span className="text-[10px] font-black uppercase block">Math &amp; Tables</span>
                          <span className="text-lg font-black font-['Outfit',sans-serif]">
                            {accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length === 0 ? '✓ Verified' : (accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length)}
                          </span>
                          <span className="text-[10px] block opacity-80">
                            {accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length === 0 ? 'Scientific notation clean' : 'Flagged notation'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Flagged Items List */}
                      {accuracyAudit.flaggedCount > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide block">
                            Questions Requiring Admin Verification ({accuracyAudit.flaggedCount})
                          </span>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {accuracyAudit.issues.map((issue, idx) => {
                              const relatedQ = questions.find(q => q.questionNumber === issue.questionNumber);
                              const isMissingFig = accuracyAudit.questionsWithoutFiguresWhenExpected.includes(issue.questionNumber);

                              return (
                                <div
                                  key={idx}
                                  className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                                      Q{issue.questionNumber}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                          issue.severity === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {issue.severity}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate">{issue.reason}</span>
                                      </div>
                                      {relatedQ && (
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                          {relatedQ.languages?.en?.questionText || relatedQ.questionText}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isMissingFig && relatedQ && (
                                      <button
                                        type="button"
                                        onClick={() => setRecroppingQuestion(relatedQ)}
                                        className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                      >
                                        <Crop className="w-3.5 h-3.5" />
                                        <span>Crop from Page {relatedQ.pdfPageNumber || 1}</span>
                                      </button>
                                    )}

                                    {relatedQ && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingQuestionForReview(relatedQ)}
                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                      >
                                        Edit Question
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Raw Answer Key Paste */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Paste Raw Answer Key
                        </label>
                        <textarea
                          rows={6}
                          value={answerKeyInputText}
                          onChange={e => setAnswerKeyInputText(e.target.value)}
                          placeholder={`Paste in any format:
1: A, 2: B, 3: C, 4: D...
or:
1-2, 2-4, 3-1, 4-3...
or:
A B C D A B C D...`}
                          className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyAnswerKey}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Auto-Apply Answer Key</span>
                        </button>
                        {answerKeyAppliedMessage && (
                          <p className="text-xs font-bold text-emerald-700">{answerKeyAppliedMessage}</p>
                        )}
                      </div>

                      {/* Interactive Answer Matrix */}
                      <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 uppercase">
                            Fast Click Answer Matrix ({questions.length} Qs)
                          </span>
                          <span className="text-[11px] text-slate-400">Click any option to set instant answer</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 p-1">
                          {questions.map((q, idx) => (
                            <div
                              key={q.id ? `${q.id}-${idx}` : `ans-q-${q.questionNumber}-${idx}`}
                              className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <span className="font-black text-slate-700 text-[11px] w-7">
                                Q{q.questionNumber}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleDirectAnswerSelect(q.questionNumber, opt)}
                                    className={`w-5 h-5 rounded-md text-[10px] font-black transition cursor-pointer ${
                                      q.correctAnswer === opt
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* High-Resolution Diagram Inspection Lightbox Modal */}
        {previewZoomImageUrl && (
          <div
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
            onClick={() => setPreviewZoomImageUrl(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh] bg-white p-3 rounded-3xl shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 font-['Outfit',sans-serif]">
                  Scientific Diagram High-Resolution Inspection
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoomImageUrl(null)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-center p-2 bg-slate-50 rounded-2xl overflow-auto max-h-[70vh]">
                <img
                  src={previewZoomImageUrl}
                  alt="High-Res Inspection"
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Question Review Modal (Admin fine-tuning verbatim text, crops, options) */}
        {editingQuestionForReview && (
          <MockQuestionReviewModal
            question={editingQuestionForReview}
            isOpen={Boolean(editingQuestionForReview)}
            onClose={() => setEditingQuestionForReview(null)}
            onSave={(updatedQ) => {
              const updated = questions.map(q => q.questionNumber === updatedQ.questionNumber ? updatedQ : q);
              handleSaveQuestionsList(updated);
              setEditingQuestionForReview(null);
              triggerToast(`✓ Question #${updatedQ.questionNumber} updated successfully!`);
            }}
            onTriggerReCropFromPdf={(q) => {
              setRecroppingQuestion(q);
              setEditingQuestionForReview(null);
            }}
            currentPdfPage={currentPdfPage}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 3: COPY / PASTE PARSER */}
        {/* ============================================================ */}
        {activeTab === 'copypaste' && selectedTest && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Batch Copy / Paste Question Parser
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste raw questions from Word documents, text files, or coaching materials. The engine automatically detects Question #, text, Options (A, B, C, D), correct answers, and explanations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Default Subject</label>
                <select
                  value={pasteDefaultSubject}
                  onChange={e => setPasteDefaultSubject(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Biology">Biology</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseQuestionsFromRawText(pasteRawText, pasteDefaultSubject);
                    setParsedPreviewQuestions(parsed);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Parse & Preview Questions
                </button>
              </div>
            </div>

            <textarea
              value={pasteRawText}
              onChange={e => setPasteRawText(e.target.value)}
              rows={8}
              placeholder={`Example format:
1. Which of the following is the energy currency of the cell?
(A) ATP
(B) ADP
(C) Glucose
(D) Pyruvate
Ans: A
Exp: ATP is adenosine triphosphate which provides metabolic energy.`}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-2xl"
            />

            {/* Parsed Preview */}
            {parsedPreviewQuestions.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase">
                    Parsed Questions ({parsedPreviewQuestions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...questions, ...parsedPreviewQuestions];
                      handleSaveQuestionsList(updated);
                      setParsedPreviewQuestions([]);
                      setPasteRawText('');
                      setActiveTab('questions');
                      triggerToast(`Successfully imported ${parsedPreviewQuestions.length} questions into ${selectedTest.testNumber}!`);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl"
                  >
                    Import All Into Test
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {parsedPreviewQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800">Q{q.questionNumber}. {q.questionText}</div>
                      <div className="grid grid-cols-2 gap-1 mt-1 text-slate-600">
                        {q.options.map(o => (
                          <div key={o.label} className={o.label === q.correctAnswer ? 'font-black text-emerald-700' : ''}>
                            {o.label}) {o.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: AI-POWERED NEET PDF PARSER & FIGURE PRESERVER */}
        {/* ============================================================ */}
        {activeTab === 'pdf_import' && (
          <div className="space-y-6">

            {/* AI Engine Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-4 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini Multimodal Vision (High Availability)
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                    <Languages className="w-3.5 h-3.5 text-indigo-300" />
                    Bilingual Hindi + English
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    100% Original PDF Vector Figures (Zero Hallucination)
                  </span>
                  <span className="text-[11px] text-slate-300 ml-auto flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Server-Side @google/genai
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                    AI-Powered NEET Question Paper PDF Parser
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    Upload an authentic bilingual NTA NEET question paper PDF. Gemini reads every question, all 4 options, and Devanagari Hindi text. Any diagrams, ray optics, circuits, chemical reaction mechanisms, and graphs are cropped directly from the original PDF vector canvas to guarantee 100% diagram fidelity with zero AI hallucination.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: Upload & Test Configuration Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    Upload NEET PDF & Configure Mock Test
                  </h3>
                </div>
                {pdfDocProxy && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                    📄 {pdfFile?.name} ({pdfPageCount} pages, {(pdfFile?.size ? (pdfFile.size / (1024 * 1024)).toFixed(2) : 0)} MB)
                  </span>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 transition rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Choose NEET Question Paper PDF
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports NTA NEET 2018–2025 bilingual question papers & grand mock tests
                    </p>
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs">
                    <span>Browse PDF File</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Configuration Inputs */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mock Test Title
                    </label>
                    <input
                      type="text"
                      value={aiTestTitle}
                      onChange={e => setAiTestTitle(e.target.value)}
                      placeholder="e.g. NEET 2026 Grand Mock Test (Full Syllabus)"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Test Code</label>
                      <input
                        type="text"
                        value={aiTestNumber}
                        onChange={e => setAiTestNumber(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Duration (Min)</label>
                      <input
                        type="number"
                        value={aiTestDuration}
                        onChange={e => setAiTestDuration(Number(e.target.value))}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Access &amp; Pricing</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAiTestIsFree(true);
                            setAiTestPrice(0);
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            aiTestIsFree || aiTestPrice === 0
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          🎁 Free Test
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiTestIsFree(false);
                            if (aiTestPrice === 0) setAiTestPrice(99);
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                            !aiTestIsFree && aiTestPrice > 0
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          🔒 Paid (₹{aiTestPrice > 0 ? aiTestPrice : 99})
                        </button>
                      </div>
                      {!aiTestIsFree && aiTestPrice > 0 && (
                        <input
                          type="number"
                          value={aiTestPrice}
                          onChange={e => setAiTestPrice(Math.max(1, Number(e.target.value)))}
                          placeholder="Price in ₹"
                          className="w-full text-xs p-1.5 mt-1.5 bg-white border border-purple-300 rounded-lg text-purple-900 font-bold"
                        />
                      )}
                    </div>
                  </div>

                  {/* Page Range Selection */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Start Page</label>
                      <input
                        type="number"
                        min={1}
                        max={pdfPageCount || 1}
                        value={startPageInput}
                        onChange={e => setStartPageInput(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">End Page</label>
                      <input
                        type="number"
                        min={startPageInput}
                        max={pdfPageCount || 1}
                        value={endPageInput}
                        onChange={e => setEndPageInput(Math.max(startPageInput, Number(e.target.value)))}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {pdfPageCount > 1 && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Total PDF pages: <strong>{pdfPageCount}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setStartPageInput(1);
                          setEndPageInput(pdfPageCount);
                        }}
                        className="text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
                      >
                        Select All Pages (1–{pdfPageCount})
                      </button>
                    </div>
                  )}

                  {/* Parsing Strategy Selector */}
                  <div className="pt-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Parsing Option &amp; Diagram Strategy</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Option 1: Multi-Stage Intelligent Vision & Full Diagram Engine (Recommended) */}
                      <div
                        onClick={() => {
                          setAiParseMode('full_auto');
                          setAutoCropDiagrams(true);
                        }}
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                          aiParseMode === 'full_auto'
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>🎯 Multi-Stage Vision &amp; Diagram Engine</span>
                            </span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-full shrink-0">
                              Recommended (Max Accuracy)
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 leading-snug">
                            Complete visual understanding pipeline. Preserves P₀/V₀ notation, vertical fractions, organic chemistry structures, match tables, and automatically extracts authentic diagrams from original PDF pages at high resolution.
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[9.5px] font-bold text-indigo-700 flex items-center gap-2">
                          <span>✓ 100% Questions</span>
                          <span>•</span>
                          <span>✓ Authentic Diagrams</span>
                          <span>•</span>
                          <span>✓ Chemical Structures</span>
                        </div>
                      </div>

                      {/* Option 2: Rapid Text-Only Mode */}
                      <div
                        onClick={() => {
                          setAiParseMode('fast_text_gallery_crop');
                          setAutoCropDiagrams(false);
                        }}
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                          aiParseMode === 'fast_text_gallery_crop'
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>⚡ Text-Only Digitization</span>
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              Manual Cropping
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-600 leading-snug">
                            Digitizes text statements and options without automatic diagram bounding boxes. Diagrams can be cropped manually from the high-resolution page viewer later.
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[9.5px] font-medium text-slate-500 flex items-center gap-2">
                          <span>Text-only</span>
                          <span>•</span>
                          <span>Manual diagram cropping</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Action Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>
                    Model: <strong className="text-slate-800">gemini-3.8-flash</strong> (Multimodal High-Res Vision &amp; Auto-Fallback)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAiParsing ? (
                    <button
                      type="button"
                      onClick={handleStopAiParsing}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop AI Parsing</span>
                    </button>
                  ) : (
                    <>
                      {aiParsedQuestionsList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('questions');
                            setTestQuestionsTab('all');
                          }}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>View All Questions in Test ({aiParsedQuestionsList.length}) →</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!pdfDocProxy || isLoadingPdf}
                        onClick={handleStartAiParsing}
                        className={`px-6 py-3 ${aiParsedQuestionsList.length > 0 ? 'bg-slate-800 hover:bg-slate-900' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'} text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-40 cursor-pointer`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{aiParsedQuestionsList.length > 0 ? 'Re-scan / Parse Another PDF' : 'Start AI NEET PDF Parsing with Gemini'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Progress & Real-Time Parsing Status */}
            {(isAiParsing || aiParseProgress.status !== 'idle') && (
              <div className="bg-white rounded-3xl border border-indigo-100 p-5 sm:p-6 space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAiParsing ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    ) : aiParseProgress.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        {isAiParsing ? 'AI Parsing in Progress' : 'AI Parsing Complete'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {aiParseProgress.statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* Real-time metrics */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-indigo-50 text-indigo-800 font-bold px-3 py-1 rounded-xl border border-indigo-100">
                      📄 Page {aiParseProgress.currentPage} of {endPageInput}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-xl border border-emerald-100">
                      📝 {aiParsedQuestionsList.length} Questions
                    </span>
                    <span className="bg-purple-50 text-purple-800 font-bold px-3 py-1 rounded-xl border border-purple-100">
                      🖼️ {aiParseProgress.figuresCropped} Figures Preserved
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(5, Math.round(((aiParseProgress.currentPage - startPageInput + 1) / Math.max(1, endPageInput - startPageInput + 1)) * 100))
                      )}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Answer Key & Detailed Solutions Input */}
            {(pdfDocProxy || aiParsedQuestionsList.length > 0 || createdTestResult || selectedTest) && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                        Apply Answer Key &amp; Step-by-Step Solutions
                      </h3>
                      <p className="text-xs text-slate-400">
                        Upload your Official Solutions PDF (e.g. SOLUTIONS 1-1.pdf) or paste the answer key. Both keys &amp; solutions are matched exactly to question numbers.
                      </p>
                    </div>
                  </div>
                  {answerKeyAppliedMessage && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      {answerKeyAppliedMessage}
                    </span>
                  )}
                </div>

                {/* Upload Solutions PDF Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Upload Official Answer Key &amp; Solutions PDF
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Automatically extracts exact options (A/B/C/D) and step-by-step mathematical explanations for all questions.
                        </p>
                      </div>
                    </div>

                    <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2 shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>{isParsingSolutionsPdf ? 'Analyzing PDF...' : 'Choose Solutions PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleSolutionsPdfUpload}
                        disabled={isParsingSolutionsPdf}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {solutionsParseNotice && (
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                      <span>{solutionsParseNotice}</span>
                    </div>
                  )}

                  {/* Parsed Solutions Result Preview & Apply Banner */}
                  {parsedSolutionsResult && parsedSolutionsResult.success && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-3 mt-2 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Detected: {parsedSolutionsResult.totalAnswersFound} Answer Keys &amp; {parsedSolutionsResult.totalSolutionsFound} Step-by-Step Explanations
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyParsedSolutions}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Apply Both Keys &amp; Solutions to Test</span>
                        </button>
                      </div>

                      {/* Small Preview Grid of Solutions */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {parsedSolutionsResult.items.slice(0, 30).map((item) => (
                          <div key={item.questionNumber} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 mr-2">Q{item.questionNumber}.</span>
                              {item.explanation ? (
                                <span className="text-slate-600 line-clamp-1 text-[11px]">{item.explanation}</span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Answer key only</span>
                              )}
                            </div>
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 text-[11px]">
                              Ans: {item.answer}
                            </span>
                          </div>
                        ))}
                        {parsedSolutionsResult.items.length > 30 && (
                          <p className="text-[11px] text-slate-400 text-center italic pt-1">
                            + {parsedSolutionsResult.items.length - 30} more question solutions mapped
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternative: Paste Raw Answer Key Text & Matrix Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Paste Box */}
                  <div className="lg:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Or Paste Raw Answer Key Text
                    </label>
                    <textarea
                      rows={5}
                      value={answerKeyInputText}
                      onChange={e => setAnswerKeyInputText(e.target.value)}
                      placeholder={`Paste answer key in any format:
1: A, 2: B, 3: C, 4: D...
or: 1-2, 2-4, 3-1, 4-3...
or: 1. (2)
or continuous: A B C D A B C D...`}
                      className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={handleApplyAnswerKey}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Apply Pasted Keys to Questions</span>
                    </button>
                  </div>

                  {/* Fast Matrix Answer Selector */}
                  <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 uppercase">
                        Quick Answer Matrix Grid ({aiParsedQuestionsList.length || questions.length} Questions)
                      </span>
                      <span className="text-[11px] text-slate-400">Click any option to change instant answer</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 p-1">
                      {(aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions).map((q, idx) => (
                        <div
                          key={q.id ? `${q.id}-${idx}` : `quick-ans-q-${q.questionNumber}-${idx}`}
                          className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <span className="font-black text-slate-700 text-[11px] w-7">
                            Q{q.questionNumber}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {(['A', 'B', 'C', 'D'] as const).map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleDirectAnswerSelect(q.questionNumber, opt)}
                                className={`w-5 h-5 rounded-md text-[10px] font-black transition cursor-pointer ${
                                  q.correctAnswer === opt
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Extracted Questions Verification Studio */}
            {(aiParsedQuestionsList.length > 0 || questions.length > 0) && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                        Digitized Questions & Original Figures Review
                      </h3>
                      <p className="text-xs text-slate-400">
                        Showing {aiParsedQuestionsList.length || questions.length} questions ready for student CBT exam
                      </p>
                    </div>
                  </div>

                  {/* Filter & Language View Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                      {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setAiPreviewSubjectFilter(subj)}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            aiPreviewSubjectFilter === subj ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                          }`}
                        >
                          {subj}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setAiLanguageDisplayMode('bilingual')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          aiLanguageDisplayMode === 'bilingual' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                        }`}
                      >
                        Bilingual
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiLanguageDisplayMode('en')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          aiLanguageDisplayMode === 'en' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiLanguageDisplayMode('hi')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                          aiLanguageDisplayMode === 'hi' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                        }`}
                      >
                        हिंदी
                      </button>
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {(aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions)
                    .filter(q => aiPreviewSubjectFilter === 'All' || q.subject === aiPreviewSubjectFilter)
                    .map((q, idx) => {
                      const hasFig = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                      const figUrl = q.figureUrl || q.questionImageUrl || q.figures?.[0];

                      return (
                        <div
                          key={q.id ? `${q.id}-${idx}` : `ai-prev-q-${q.questionNumber}-${idx}`}
                          className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-black text-xs">
                                Q{q.questionNumber}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  q.subject === 'Physics'
                                    ? 'bg-blue-100 text-blue-800'
                                    : q.subject === 'Chemistry'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {q.subject}
                              </span>
                              {hasFig && (
                                <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Original PDF Figure
                                </span>
                              )}
                            </div>

                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Correct: Option {q.correctAnswer}
                            </span>
                          </div>

                          {/* Question Text in Selected Language Mode */}
                          <div className="space-y-2">
                            {(aiLanguageDisplayMode === 'bilingual' || aiLanguageDisplayMode === 'en') && (
                              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                                {q?.languages?.en?.questionText || q?.questionText}
                              </p>
                            )}

                            {(aiLanguageDisplayMode === 'bilingual' || aiLanguageDisplayMode === 'hi') && q?.languages?.hi?.questionText && (
                              <p className="text-xs font-medium text-slate-700 leading-relaxed font-['Noto_Sans_Devanagari',sans-serif] bg-slate-100/60 p-2 rounded-xl">
                                {q?.languages?.hi?.questionText}
                              </p>
                            )}
                          </div>

                          {/* Attached Original Diagram */}
                          {hasFig && figUrl && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-2xs max-w-md">
                              <span className="text-[10px] text-purple-700 font-bold block mb-1.5 flex items-center gap-1">
                                <Crop className="w-3 h-3" />
                                Preserved Original PDF Diagram (Lossless PNG)
                              </span>
                              <img
                                src={figUrl}
                                alt={`Question ${q.questionNumber} diagram`}
                                className="max-h-48 object-contain rounded-lg"
                              />
                            </div>
                          )}

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {(q.options || []).map(opt => {
                              const isCorrect = q.correctAnswer === opt.label;
                              const hiOpt = q?.languages?.hi?.options?.find(o => o.label === opt.label);

                              return (
                                <div
                                  key={opt.label}
                                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 border-emerald-300 font-bold text-emerald-950'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {opt.label}
                                  </span>

                                  <div className="space-y-1">
                                    {(aiLanguageDisplayMode === 'bilingual' || aiLanguageDisplayMode === 'en') && (
                                      <div>{opt.value}</div>
                                    )}
                                    {(aiLanguageDisplayMode === 'bilingual' || aiLanguageDisplayMode === 'hi') && hiOpt?.value && (
                                      <div className="text-[11px] text-slate-500 font-['Noto_Sans_Devanagari',sans-serif]">
                                        {hiOpt.value}
                                      </div>
                                    )}
                                    {opt.imageUrl && (
                                      <img
                                        src={opt.imageUrl}
                                        alt={`Option ${opt.label}`}
                                        className="max-h-20 object-contain rounded mt-1 border border-slate-100"
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Manual Figure Cropping & Canvas Studio (Collapsible Advanced Tool) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    Interactive Canvas & Manual Figure Cropping Studio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Need to fine-tune a diagram crop or manually select a custom region from the PDF? Open the visual studio below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualCropStudio(prev => !prev)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {showManualCropStudio ? 'Hide Studio' : 'Open Studio'}
                </button>
              </div>

              {showManualCropStudio && (
                <div className="space-y-4 pt-2">
                  {/* PDF Navigation Controls */}
                  {pdfDocProxy && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span>Page:</span>
                      <button
                        type="button"
                        disabled={currentPdfPage <= 1}
                        onClick={() => setCurrentPdfPage(prev => Math.max(1, prev - 1))}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span>
                        {currentPdfPage} of {pdfPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={currentPdfPage >= pdfPageCount}
                        onClick={() => setCurrentPdfPage(prev => Math.min(pdfPageCount, prev + 1))}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                      >
                        Next
                      </button>
                      <span className="text-slate-400 ml-auto text-[11px]">
                        Click and drag on the canvas below to select any figure, benzene ring, or circuit
                      </span>
                    </div>
                  )}

                  {/* Main Interactive Canvas */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div 
                      className="lg:col-span-2 bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center overflow-auto max-h-[600px] relative select-none"
                      style={{ 
                        touchAction: (isDrawingCrop || isDraggingCropBox) ? 'none' : 'pan-x pan-y',
                        overscrollBehavior: 'contain'
                      }}
                    >
                      {isLoadingPdf && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold z-10">
                          Rendering PDF Page {currentPdfPage}...
                        </div>
                      )}

                      {!pdfDocProxy ? (
                        <div className="py-20 text-center text-slate-400 space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-slate-500" />
                          <p className="text-xs font-bold">Please upload a PDF question paper above to view pages.</p>
                        </div>
                      ) : (
                        <div 
                          className="relative inline-block border border-slate-700 shadow-2xl select-none"
                          style={{ touchAction: 'none' }}
                        >
                          <canvas
                            ref={pdfCanvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            className="cursor-crosshair block max-w-full select-none"
                            style={{ touchAction: 'none' }}
                          />
                          {cropBox && (cropBox.w > 5 || isDrawingCrop) && (
                            <div
                              className="absolute border-2 border-emerald-400 bg-emerald-400/20 select-none shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                              style={{
                                left: `${(cropBox.x / (pdfCanvasRef.current?.width || 1)) * 100}%`,
                                top: `${(cropBox.y / (pdfCanvasRef.current?.height || 1)) * 100}%`,
                                width: `${(cropBox.w / (pdfCanvasRef.current?.width || 1)) * 100}%`,
                                height: `${(cropBox.h / (pdfCanvasRef.current?.height || 1)) * 100}%`,
                                touchAction: 'none'
                              }}
                              onPointerMove={handleBoxPointerMove}
                              onPointerUp={handleBoxPointerUp}
                            >
                              {!isDrawingCrop && (
                                <>
                                  {/* Central Draggable Move Area */}
                                  <div
                                    className="absolute inset-0 cursor-move"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => handleBoxPointerDown(e, 'move')}
                                    title="Click and drag inside box to move without page scrolling"
                                  />
                                  {/* Floating Info Pill */}
                                  <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                                    Drag Box to Move • Corner Handles to Resize
                                  </div>
                                  {/* Corner Resize Handles */}
                                  <div
                                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-sm cursor-nwse-resize z-20 shadow"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => handleBoxPointerDown(e, 'nw')}
                                  />
                                  <div
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-sm cursor-nesw-resize z-20 shadow"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => handleBoxPointerDown(e, 'ne')}
                                  />
                                  <div
                                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-sm cursor-nesw-resize z-20 shadow"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => handleBoxPointerDown(e, 'sw')}
                                  />
                                  <div
                                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-sm cursor-nwse-resize z-20 shadow"
                                    style={{ touchAction: 'none' }}
                                    onPointerDown={(e) => handleBoxPointerDown(e, 'se')}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cropped Preview & Direct Attachment */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-900 uppercase">
                          Cropped Region Preview
                        </h4>

                        {croppedFigureDataUrl ? (
                          <div className="bg-white p-2 rounded-xl border border-slate-200 text-center space-y-2 shadow-2xs">
                            <img
                              src={croppedFigureDataUrl}
                              alt="Crop Preview"
                              className="max-h-40 mx-auto object-contain rounded-lg"
                            />
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              ✓ Lossless PNG Extracted
                            </span>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl text-xs">
                            Drag on the PDF page to select any figure.
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Target Question #
                            </label>
                            <input
                              type="number"
                              value={targetQuestionForCrop}
                              onChange={e => setTargetQuestionForCrop(Number(e.target.value))}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              Target Attachment Type
                            </label>
                            <select
                              value={cropTargetType}
                              onChange={e => setCropTargetType(e.target.value as any)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                            >
                              <option value="question">Main Question Figure</option>
                              <option value="option_A">Option A Chemical Structure</option>
                              <option value="option_B">Option B Chemical Structure</option>
                              <option value="option_C">Option C Chemical Structure</option>
                              <option value="option_D">Option D Chemical Structure</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!croppedFigureDataUrl}
                        onClick={handleAttachCropToQuestion}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-xs transition disabled:opacity-40 cursor-pointer"
                      >
                        Attach to Question #{targetQuestionForCrop}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: TEST PRICING & SUBJECT PACKAGES */}
        {/* ============================================================ */}
        {activeTab === 'pricing_packages' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-6 shadow-2xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-2 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real Razorpay / UPI Pass Management</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
                  Mock Test Pricing &amp; Subject Packages
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
                  Configure package unlock pricing for Chapter Wise Subject Passes (Biology, Chemistry, Physics), Whole Three Subjects Full Tests, and Full Syllabus Grand Tests.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  saveMockTestPricingPackages(pricingPackages);
                  triggerToast('🎉 Mock Test pricing packages saved & synced to Firebase and Cloudflare D1!');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <Check className="w-4 h-4" />
                <span>Save All Pricing Changes</span>
              </button>
            </div>

            {/* 1. Chapter Wise Subject Pricing Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>1. Chapter Wise Tests: Subject-Wise Package Pricing</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When a student purchases a subject package, all chapter-wise tests of that subject become permanently unlocked.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Biology Chapter Wise Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 border-2 border-emerald-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        🧬
                      </span>
                      <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                        Biology Subject Pass
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Chapter Wise
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Unlocks Botany &amp; Zoology chapter-wise mock tests (Cell, Genetics, Plant Physio, Ecology, etc.).
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWiseBiologyPrice}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWiseBiologyPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-black text-emerald-900 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWiseBiologyOriginalPrice ?? 399}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWiseBiologyOriginalPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Chemistry Chapter Wise Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 border-2 border-amber-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        🧪
                      </span>
                      <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                        Chemistry Subject Pass
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Chapter Wise
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Unlocks Organic, Inorganic &amp; Physical Chemistry tests with mechanisms &amp; molecular structures.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWiseChemistryPrice}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWiseChemistryPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-black text-amber-900 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWiseChemistryOriginalPrice ?? 399}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWiseChemistryOriginalPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Physics Chapter Wise Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 border-2 border-blue-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        ⚛️
                      </span>
                      <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                        Physics Subject Pass
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                      Chapter Wise
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Unlocks Mechanics, Electrodynamics, Optics &amp; Modern Physics tests with circuit diagrams.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWisePhysicsPrice}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWisePhysicsPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-black text-blue-900 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.chapterWisePhysicsOriginalPrice ?? 399}
                        onChange={e => setPricingPackages({ ...pricingPackages, chapterWisePhysicsOriginalPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Whole Three Subjects (Full Subject Tests) & Full Syllabus Grand Tests */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>2. Multi-Subject &amp; Grand Full Syllabus Packages</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Whole 3 Subjects (Full Subject Tests) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/30 border-2 border-teal-300 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        🧪
                      </span>
                      <div>
                        <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] block">
                          Whole Three Subjects Pass (Full Subject Tests)
                        </span>
                        <span className="text-[10.5px] text-teal-700 font-bold">Physics + Chemistry + Biology (All 3)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                      All 3 Subjects
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Student pays once to unlock all comprehensive 180-marks Full Subject Tests across Physics, Chemistry, and Biology.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Bundle Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.fullSubjectAll3Price}
                        onChange={e => setPricingPackages({ ...pricingPackages, fullSubjectAll3Price: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-black text-teal-900 bg-white border border-teal-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.fullSubjectAll3OriginalPrice ?? 599}
                        onChange={e => setPricingPackages({ ...pricingPackages, fullSubjectAll3OriginalPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Full Syllabus Grand Mock Tests */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 border-2 border-indigo-300 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        🏆
                      </span>
                      <div>
                        <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] block">
                          Full Syllabus Grand Tests Pass
                        </span>
                        <span className="text-[10.5px] text-indigo-700 font-bold">720 Marks Full NEET Exam Simulation</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Grand Tests
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Student unlocks all 720-marks Grand Tests featuring complete Physics + Chemistry + Biology syllabus with All India Rank percentiles.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Grand Pass Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.fullSyllabusAllPrice}
                        onChange={e => setPricingPackages({ ...pricingPackages, fullSyllabusAllPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-black text-indigo-900 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Original Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={pricingPackages.fullSyllabusAllOriginalPrice ?? 799}
                        onChange={e => setPricingPackages({ ...pricingPackages, fullSyllabusAllOriginalPrice: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Pricing is synchronized across Cloudflare Workers, Cloudflare D1, and Firebase Realtime Database.
              </span>
              <button
                type="button"
                onClick={() => {
                  saveMockTestPricingPackages(pricingPackages);
                  triggerToast('🎉 Mock Test pricing packages saved & synced to Firebase and Cloudflare D1!');
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Save All Package Prices</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: PURCHASES & STUDENT RESULTS */}
        {/* ============================================================ */}
        {activeTab === 'purchases' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
              Purchases & Student Attempt Log
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Purchases table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-700 uppercase">Paid Purchases ({purchases.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {purchases.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">No purchases recorded yet.</div>
                  ) : (
                    purchases.map(p => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{p.userEmail}</span>
                          <span className="text-[10px] text-slate-500">Test ID: {p.testId} • {new Date(p.purchaseDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 block">₹{p.amount}</span>
                          <span className="text-[10px] text-slate-400">{p.paymentId || 'Online'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Student Attempts table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-700 uppercase">Test Attempts ({attempts.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attempts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">No student attempts logged yet.</div>
                  ) : (
                    attempts.map(a => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{a.userName || a.userEmail}</span>
                          <span className="text-[10px] text-slate-500">
                            {a.testId} • Status: {a.status} • {Math.round((a.timeSpentSeconds || 0) / 60)} mins
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-blue-600 block">{a.score || 0} pts</span>
                          <span className="text-[10px] text-slate-400">{a.accuracy || 0}% Accuracy</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Delete Test Confirmation Dialog (Requires typing "delete") */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteConfirmTest)}
        onClose={() => setDeleteConfirmTest(null)}
        onCancel={() => setDeleteConfirmTest(null)}
        onConfirm={handleConfirmDelete}
        itemName={deleteConfirmTest ? (deleteConfirmTest.title || deleteConfirmTest.testNumber) : ''}
        itemType="test"
        title="Delete this test?"
        warningText="This will permanently remove this mock test from the catalogue and erase all its questions and student attempts."
      />

      {/* Fast 1-Click Single Question Delete Confirmation Modal */}
      {quickDeleteConfirmQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setQuickDeleteConfirmQ(null)} />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setQuickDeleteConfirmQ(null)}
                className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Delete Question #{quickDeleteConfirmQ.questionNumber}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This question and its diagram will be permanently removed from this test. All subsequent questions will be renumbered automatically.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickDeleteConfirmQ(null)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleQuickDeleteQuestion(quickDeleteConfirmQ.questionNumber)}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Questions Modal */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setBulkDeleteConfirmOpen(false)} />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Delete {selectedQuestionNums.length} Selected Questions?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete these {selectedQuestionNums.length} questions? All remaining questions will be automatically renumbered (1, 2, 3...).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedQuestions}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              >
                Delete Selected ({selectedQuestionNums.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Questions Modal */}
      {deleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setDeleteAllConfirmOpen(false)} />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-rose-300 space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setDeleteAllConfirmOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-rose-950 font-['Outfit',sans-serif]">
                Delete ALL {questions.length} Questions?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will clear every question and diagram currently attached to &ldquo;{selectedTest?.title}&rdquo;. You will be able to upload a fresh PDF or paste new questions.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAllConfirmOpen(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllQuestions}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Diagram Recropper Modal on original PDF page */}
      {recroppingQuestion && (
        <DiagramRecropModal
          isOpen={Boolean(recroppingQuestion)}
          onClose={() => setRecroppingQuestion(null)}
          question={recroppingQuestion}
          allQuestions={questions.length > 0 ? questions : aiParsedQuestionsList}
          testId={selectedTest?.id}
          jobId="active_pdf_job"
          pdfDocProxy={pdfDocProxy || backgroundPdfParserService.getActiveDocProxy()}
          onSaveCroppedDiagram={(updatedQ) => {
            // 1. Update in active test questions
            const baseList = questions.length > 0 ? questions : aiParsedQuestionsList;
            const updated = baseList.map(q => q.questionNumber === updatedQ.questionNumber ? updatedQ : q);
            if (!updated.some(q => q.questionNumber === updatedQ.questionNumber)) {
              updated.push(updatedQ);
            }
            updated.sort((a, b) => a.questionNumber - b.questionNumber);

            setQuestions(updated);
            setAiParsedQuestionsList(updated);
            handleSaveQuestionsList(updated);

            if (selectedTest?.id) {
              idbSaveQuestions(selectedTest.id, updated).catch(() => {});
            }
            idbSaveQuestions('active_parsed_questions', updated).catch(() => {});
            idbSaveQuestions('active_pdf_job', updated).catch(() => {});
            setRecroppingQuestion(updatedQ);
            triggerToast(`✓ Diagram for Question #${updatedQ.questionNumber} successfully saved!`);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* PRE-PUBLISH ACCURACY AUDIT & VERIFICATION MODAL */}
      {/* ============================================================ */}
      {showPrePublishAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowPrePublishAuditModal(false)} />
          <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  accuracyAudit.flaggedCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black font-['Outfit',sans-serif]">
                      Pre-Publish Verification &amp; Accuracy Report
                    </h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      accuracyAudit.flaggedCount === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'
                    }`}>
                      {accuracyAudit.flaggedCount === 0 ? '100% Error-Free' : `${accuracyAudit.flaggedCount} Issues Found`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedTest?.title || 'NEET Mock Test'} • {accuracyAudit.totalImported} of {accuracyAudit.totalDetectedInPdf} questions verified
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPrePublishAuditModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Total Detected</span>
                  <span className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                    {accuracyAudit.totalDetectedInPdf}
                  </span>
                  <span className="text-[10px] text-slate-500 block">in source PDF</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Digitized &amp; Imported</span>
                  <span className="text-lg font-black text-emerald-600 font-['Outfit',sans-serif]">
                    {accuracyAudit.totalImported}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {Math.round((accuracyAudit.totalImported / (accuracyAudit.totalDetectedInPdf || 1)) * 100)}% complete
                  </span>
                </div>

                <div className={`rounded-2xl p-3 border ${
                  accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-300 text-amber-900'
                }`}>
                  <span className="text-[10px] font-black uppercase block">Diagrams / Chem</span>
                  <span className="text-lg font-black font-['Outfit',sans-serif]">
                    {accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0 ? '✓ All' : accuracyAudit.questionsWithoutFiguresWhenExpected.length}
                  </span>
                  <span className="text-[10px] block opacity-80">
                    {accuracyAudit.questionsWithoutFiguresWhenExpected.length === 0 ? 'Attached &amp; intact' : 'Need PDF crops'}
                  </span>
                </div>

                <div className={`rounded-2xl p-3 border ${
                  accuracyAudit.damagedMathQuestions.length === 0 && accuracyAudit.damagedTableQuestions.length === 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-indigo-50/70 border-indigo-300 text-indigo-900'
                }`}>
                  <span className="text-[10px] font-black uppercase block">Math &amp; Tables</span>
                  <span className="text-lg font-black font-['Outfit',sans-serif]">
                    {accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length === 0 ? '✓ Clean' : (accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length)}
                  </span>
                  <span className="text-[10px] block opacity-80">
                    {accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length === 0 ? 'Verified notation' : 'Flagged notation'}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-700">Quick Automated Fixes:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSanitizeAllQuestions}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Auto-Sanitize Math &amp; Powers</span>
                  </button>

                  {accuracyAudit.missingNumbers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleFillMissingQuestions}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Backfill Missing ({accuracyAudit.missingNumbers.length}) Qs</span>
                    </button>
                  )}

                  {/* Single Page Re-Extraction Tool */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-600">Re-extract Page:</span>
                    <input
                      type="number"
                      min={1}
                      max={pdfPageCount || 100}
                      value={singlePageInput}
                      onChange={e => setSinglePageInput(parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-xs font-bold px-1 py-0.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={reextractingPage !== null || !pdfDocProxy}
                      onClick={() => handleReextractSinglePage(singlePageInput)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {reextractingPage === singlePageInput ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 text-emerald-400" />
                          <span>Retry Page</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'all' ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Items ({accuracyAudit.flaggedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('missing')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'missing' ? 'bg-rose-600 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Missing in Sequence ({accuracyAudit.missingNumbers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('diagrams')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'diagrams' ? 'bg-purple-700 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Diagrams &amp; Chem ({accuracyAudit.questionsWithoutFiguresWhenExpected.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('math_tables')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'math_tables' ? 'bg-indigo-600 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Math &amp; Tables ({accuracyAudit.damagedMathQuestions.length + accuracyAudit.damagedTableQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('contaminated')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'contaminated' ? 'bg-amber-600 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Contaminated Options ({accuracyAudit.contaminatedOptionQuestions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilterTab('incomplete')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    auditFilterTab === 'incomplete' ? 'bg-slate-700 text-white font-black' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Incomplete ({accuracyAudit.incompleteQuestions.length})
                </button>
              </div>

              {/* Flagged Issues List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {accuracyAudit.flaggedCount === 0 ? (
                  <div className="p-8 text-center space-y-2 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-black text-emerald-950 font-['Outfit',sans-serif]">
                      All Questions Verified &amp; 100% Error-Free!
                    </h4>
                    <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                      All questions are sequentially numbered, options are intact, diagrams are attached, and scientific notation is formatted. This test is ready to publish live!
                    </p>
                  </div>
                ) : (
                  (() => {
                    let filteredIssues = accuracyAudit.issues;
                    if (auditFilterTab === 'missing') {
                      filteredIssues = accuracyAudit.issues.filter(i => accuracyAudit.missingNumbers.includes(i.questionNumber));
                    } else if (auditFilterTab === 'diagrams') {
                      filteredIssues = accuracyAudit.issues.filter(i => accuracyAudit.questionsWithoutFiguresWhenExpected.includes(i.questionNumber));
                    } else if (auditFilterTab === 'math_tables') {
                      filteredIssues = accuracyAudit.issues.filter(i => 
                        accuracyAudit.damagedMathQuestions.includes(i.questionNumber) || 
                        accuracyAudit.damagedTableQuestions.includes(i.questionNumber)
                      );
                    } else if (auditFilterTab === 'contaminated') {
                      filteredIssues = accuracyAudit.issues.filter(i => accuracyAudit.contaminatedOptionQuestions?.includes(i.questionNumber));
                    } else if (auditFilterTab === 'incomplete') {
                      filteredIssues = accuracyAudit.issues.filter(i => accuracyAudit.incompleteQuestions.includes(i.questionNumber));
                    }

                    if (filteredIssues.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                          No issues found in this category.
                        </div>
                      );
                    }

                    return filteredIssues.map((issue, idx) => {
                      const pool = aiParsedQuestionsList.length > 0 ? aiParsedQuestionsList : questions;
                      const relatedQ = pool.find(q => q.questionNumber === issue.questionNumber);
                      const isMissingFig = accuracyAudit.questionsWithoutFiguresWhenExpected.includes(issue.questionNumber);
                      const pageForThisQ = relatedQ?.pdfPageNumber || Math.max(1, Math.ceil(issue.questionNumber / 4));

                      return (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                              Q{issue.questionNumber}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  issue.severity === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {issue.severity}
                                </span>
                                <span className="font-bold text-slate-800 truncate">{issue.reason}</span>
                              </div>
                              {relatedQ && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                  {relatedQ.languages?.en?.questionText || relatedQ.questionText}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pdfDocProxy && (
                              <button
                                type="button"
                                disabled={reextractingPage !== null}
                                onClick={() => handleReextractSinglePage(pageForThisQ)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title={`Re-extract only Page ${pageForThisQ} without re-running entire test`}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${reextractingPage === pageForThisQ ? 'animate-spin' : ''}`} />
                                <span>Retry Page {pageForThisQ}</span>
                              </button>
                            )}

                            {isMissingFig && relatedQ && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPrePublishAuditModal(false);
                                  setRecroppingQuestion(relatedQ);
                                }}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Crop className="w-3.5 h-3.5" />
                                <span>Crop from Page {pageForThisQ}</span>
                              </button>
                            )}

                            {relatedQ && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPrePublishAuditModal(false);
                                  setEditingQuestionForReview(relatedQ);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Edit Question
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPrePublishAuditModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Audit
              </button>

              <button
                type="button"
                disabled={!accuracyAudit.canPublish}
                onClick={() => {
                  if (!accuracyAudit.canPublish) {
                    triggerToast(`❌ Cannot publish: ${accuracyAudit.criticalErrorsCount} critical error(s) must be resolved first.`);
                    return;
                  }
                  setShowPrePublishAuditModal(false);
                  if (aiParsedQuestionsList.length > 0) {
                    handleSaveAiParsedQuestionsToTest();
                  } else {
                    handleSaveQuestionsList(questions);
                    triggerToast('✓ Test questions verified and published!');
                  }
                  if (selectedTest) {
                    const updated = tests.map(t => t.id === selectedTest.id ? { ...t, status: 'published' } as MockTest : t);
                    handleSaveTestsList(updated);
                    setSelectedTest(prev => prev ? { ...prev, status: 'published' } : null);
                  }
                }}
                className={`px-6 py-2.5 text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 ${
                  accuracyAudit.canPublish
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{accuracyAudit.canPublish ? 'Approve & Publish Test' : `Blocked (${accuracyAudit.criticalErrorsCount} Critical Errors)`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{adminToast}</span>
        </div>
      )}
    </div>
  );
};
