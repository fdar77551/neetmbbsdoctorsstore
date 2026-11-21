import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Settings2,
  CreditCard,
  GraduationCap,
  FolderPlus,
  Layers,
  Upload,
  Plus,
  CheckCircle2,
  ExternalLink,
  Database,
  Cloud
} from 'lucide-react';
import { Parser2Job, Parser2Question, Parser2ValidationReport } from '../../services/parser2/types';
import { TestCategory, TestCategoryThemePreset, TestVisibility } from '../../types';
import { DEFAULT_TEST_CATEGORIES, fetchTestCategoriesFromServer } from '../../lib/testCategoriesData';
import { syncAllMockTestsFromSources } from '../../lib/mockTestData';
import { getAdminRequestHeaders } from '../../lib/firebase';

interface Parser2PublishModalProps {
  job: Parser2Job;
  questions?: Parser2Question[];
  validationReport?: Parser2ValidationReport | null;
  onClose: () => void;
  onSuccess: (testId: string) => void;
  onReviewIncomplete?: () => void;
}

export const Parser2PublishModal: React.FC<Parser2PublishModalProps> = ({
  job,
  questions,
  validationReport,
  onClose,
  onSuccess,
  onReviewIncomplete
}) => {
  // Categories synced live from /api/test-categories
  const [categories, setCategories] = useState<TestCategory[]>(DEFAULT_TEST_CATEGORIES);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() => {
    if (job.totalQuestions > 0 && job.totalQuestions <= 50 && job.chapter) return ['chapter_wise'];
    if (job.subject !== 'Combined' && !job.chapter) return ['full_subject'];
    return ['full_syllabus'];
  });
  const [isStandalone, setIsStandalone] = useState(false);

  // Optional Inline New Category Creation
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineCategoryDescription, setInlineCategoryDescription] = useState('');
  const [inlineCategoryTheme, setInlineCategoryTheme] = useState<TestCategoryThemePreset>('indigo');

  // Section 1: Basic Information
  const [title, setTitle] = useState(job.testName || 'NEET-UG Major Test');
  const [subtitle, setSubtitle] = useState('NTA Pattern Mock Test with Step-by-Step Solutions');
  const [testNumber, setTestNumber] = useState('Test 01');
  const [code, setCode] = useState('#01');
  const [folderName, setFolderName] = useState('Brahmastra Major Test Series');
  const [subject, setSubject] = useState(job.subject || 'Combined');
  const [chapter, setChapter] = useState(job.chapter || '');
  const [visibility, setVisibility] = useState<TestVisibility>('public');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  // Update existing published test vs create new copy
  const [createNewCopy, setCreateNewCopy] = useState(false);

  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [language, setLanguage] = useState<'bilingual' | 'en' | 'hi'>('bilingual');
  const [description, setDescription] = useState(
    'Comprehensive NTA NEET-UG standard CBT mock examination with verified explanations and original source figures.'
  );
  const [instructions, setInstructions] = useState(
    '+4 marks for every correct response\n-1 mark for every incorrect response\n0 marks for unattempted questions\nCalculators and external aids are strictly prohibited\nTimer begins as soon as you enter the exam'
  );

  // Section 2: Configuration & Pattern
  const [durationMinutes, setDurationMinutes] = useState(job.totalQuestions >= 150 ? 180 : 60);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);

  // Section 3: Pricing & Monetization
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(199);
  const [includeInPass, setIncludeInPass] = useState(true);

  // Section 4: Educational & NCERT Mapping
  const [targetYear, setTargetYear] = useState('2026');
  const [ncertCoveragePercent, setNcertCoveragePercent] = useState(98);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    assignment: true,
    basic: true,
    config: false,
    pricing: false,
    education: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [forcePublish, setForcePublish] = useState(false);
  const [excludeIncomplete, setExcludeIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishVerification, setPublishVerification] = useState<{
    testId: string;
    savedQuestionsCount: number;
    verifiedQuestionsCount: number;
    incompleteExcludedCount: number;
    dbSynced: boolean;
    rtdbSynced: boolean;
    categoryNames: string[];
    visibility: string;
  } | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const canCleanPublish = validationReport ? validationReport.canPublish : true;

  const totalQuestionsCount = questions ? questions.length : job.totalQuestions;
  const savedQuestionsCount = totalQuestionsCount;
  const detectedQuestionsCount =
    validationReport?.reconciliation?.extractedQuestions ??
    job.questionsDetected ??
    totalQuestionsCount;
  const expectedQuestionsCount =
    validationReport?.reconciliation?.expectedQuestions ??
    job.expectedQuestionsManual ??
    null;
  const completeQuestionsCount = questions
    ? questions.filter(q => q.verificationStatus === 'verified' && !q.reviewRequired).length
    : validationReport?.reconciliation?.validQuestions ?? job.verifiedQuestionsCount ?? 0;
  const incompleteQuestionsCount = Math.max(0, totalQuestionsCount - completeQuestionsCount);
  const missingQuestionsCount =
    expectedQuestionsCount != null
      ? Math.max(0, expectedQuestionsCount - savedQuestionsCount)
      : validationReport?.reconciliation?.missingQuestions ?? 0;
  const duplicateNumbers = (() => {
    if (!questions) return [];
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const q of questions) {
      if (seen.has(q.questionNumber)) dupes.add(q.questionNumber);
      seen.add(q.questionNumber);
    }
    return Array.from(dupes).sort((a, b) => a - b);
  })();
  const duplicateCount = duplicateNumbers.length || validationReport?.reconciliation?.duplicateCount || 0;
  const figuresAttachedCount = questions
    ? questions.filter(
        q =>
          Boolean(q.figureUrl) ||
          (q.figures && q.figures.length > 0) ||
          (q.optionFigures && Object.keys(q.optionFigures).length > 0) ||
          (q.imageAttachments && q.imageAttachments.length > 0)
      ).length
    : job.totalFigures ?? 0;
  const answerKeysMatchedCount = questions
    ? questions.filter(q => Boolean(q.correctAnswer && q.answerStatus !== 'answer_missing')).length
    : Math.max(0, totalQuestionsCount - (validationReport?.reconciliation?.missingAnswerCount ?? 0));
  const missingAnswersCount = questions
    ? questions.filter(q => !q.correctAnswer || q.answerStatus === 'answer_missing').length
    : validationReport?.reconciliation?.missingAnswerCount ?? 0;
  const missingTablesCount = questions
    ? questions.filter(q => q.verificationStatus === 'table_incomplete').length
    : 0;
  const missingOptionsCount = questions
    ? questions.filter(q => q.verificationStatus === 'options_incomplete').length
    : 0;
  const missingFiguresCount = questions
    ? questions.filter(q => q.verificationStatus === 'missing_figure' || q.verificationStatus === 'figure_mismatch').length
    : 0;

  const hasHardBlocker = savedQuestionsCount === 0 || duplicateCount > 0;

  useEffect(() => {
    fetchTestCategoriesFromServer().then(setCategories).catch(() => {});
  }, []);

  const handleThumbUpload = async (file: File) => {
    setIsUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'test-thumbnails');
      formData.append('filename', `thumb-${job.id}-${Date.now()}.jpg`);
      const resp = await fetch('/api/r2/upload', { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.success && data.url) {
        setThumbnailUrl(data.url);
      } else {
        setError(data.error || 'Thumbnail upload failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Thumbnail upload error.');
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setIsStandalone(false);
    setSelectedCategoryIds(prev => {
      if (prev.includes(catId)) {
        const next = prev.filter(id => id !== catId);
        return next;
      }
      return [...prev, catId];
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const inlineNewCategory =
        showInlineCategory && inlineCategoryName.trim()
          ? {
              name: inlineCategoryName.trim(),
              description: inlineCategoryDescription.trim(),
              themePreset: inlineCategoryTheme
            }
          : undefined;

      const primaryCategory = isStandalone
        ? 'full_syllabus'
        : selectedCategoryIds[0] || 'full_syllabus';

      const res = await fetch(`/api/parser2/jobs/${job.id}/publish`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          testNumber: testNumber.trim(),
          code: code.trim(),
          folderName: folderName.trim(),
          testTypeCategory: primaryCategory,
          categoryIds: isStandalone ? [] : selectedCategoryIds,
          isStandalone,
          inlineNewCategory,
          subject,
          chapter: chapter.trim(),
          visibility,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          existingTestId: createNewCopy ? undefined : job.publishedTestId,
          createNewCopy,
          difficulty,
          language,
          description: description.trim(),
          instructions: instructions.trim(),
          durationMinutes,
          correctMarks,
          negativeMarks,
          randomizeQuestions,
          randomizeOptions,
          isFree,
          price: isFree ? 0 : price,
          originalPrice: isFree ? 0 : originalPrice,
          includeInPass,
          targetYear,
          ncertCoveragePercent,
          excludeIncomplete,
          force: forcePublish || (excludeIncomplete && completeQuestionsCount > 0)
        })
      });

      const data = await res.json();
      if (data.success && data.testId) {
        await syncAllMockTestsFromSources().catch(() => []);
        await fetchTestCategoriesFromServer().catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('neetmbbs_mock_tests_updated', { detail: { fromServer: true } }));
          window.dispatchEvent(new Event('neetmbbs_test_categories_updated'));
        }
        const pv = data.publicationVerification || {};
        setPublishVerification({
          testId: data.testId,
          savedQuestionsCount: pv.savedQuestionsCount ?? (excludeIncomplete ? completeQuestionsCount : totalQuestionsCount),
          verifiedQuestionsCount: pv.verifiedQuestionsCount ?? completeQuestionsCount,
          incompleteExcludedCount: pv.incompleteExcludedCount ?? (excludeIncomplete ? incompleteQuestionsCount : 0),
          dbSynced: pv.dbSynced !== false,
          rtdbSynced: Boolean(pv.rtdbSynced),
          categoryNames: Array.isArray(pv.categoryNames) ? pv.categoryNames : [],
          visibility: pv.visibility || visibility
        });
        onSuccess(data.testId);
      } else {
        setError(data.error || 'Failed to publish test.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                {job.publishedTestId ? 'Update or Re-Publish Test' : 'Publish Verified Test to CBT'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Assign categories (1 or multiple) or Standalone, visibility, pricing &amp; marking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!canCleanPublish && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Validation Warning: </span>
              {validationReport?.criticalErrorsCount} critical check(s) remain flagged. Review or authorize force publish below.
            </div>
          </div>
        )}

        {publishVerification ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-emerald-950 font-['Outfit',sans-serif]">
                  Publication Verified &amp; Synced to Student CBT
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Test <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">{publishVerification.testId}</code> is saved on disk and synced for immediate student access.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-500">Published Qs</div>
                <div className="text-lg font-black text-slate-900">{publishVerification.savedQuestionsCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Verified Complete</div>
                <div className="text-lg font-black text-emerald-800">{publishVerification.verifiedQuestionsCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-[10px] font-bold uppercase text-amber-700">Excluded Incomplete</div>
                <div className="text-lg font-black text-amber-800">{publishVerification.incompleteExcludedCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="text-[10px] font-bold uppercase text-blue-700">Visibility</div>
                <div className="text-sm font-black text-blue-900 uppercase mt-1">{publishVerification.visibility}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 font-bold ${publishVerification.dbSynced ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <Database className="w-3.5 h-3.5" />
                  Server DB / D1: {publishVerification.dbSynced ? 'Verified on Disk' : 'Sync Pending'}
                </span>
                <span className={`inline-flex items-center gap-1.5 font-bold ${publishVerification.rtdbSynced ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <Cloud className="w-3.5 h-3.5" />
                  Firebase RTDB: {publishVerification.rtdbSynced ? 'Synced' : 'Local Mode'}
                </span>
              </div>
              {publishVerification.categoryNames.length > 0 && (
                <div className="text-slate-600 font-medium">
                  Assigned Categories: <span className="font-bold text-slate-900">{publishVerification.categoryNames.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('neetmbbs_navigate_mock_tests'));
                  }
                  onClose();
                }}
                className="min-h-[42px] px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> View Published Test
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Pre-Publish Full Reconciliation Matrix (Module 8) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Pre-Publish Reconciliation Report
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                {subject} · Max Marks: {(excludeIncomplete ? completeQuestionsCount : totalQuestionsCount) * correctMarks} · {durationMinutes} mins
              </span>
            </div>

            {hasHardBlocker && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  {savedQuestionsCount === 0
                    ? 'Publishing Blocked: 0 questions are saved in the database for this job.'
                    : `Publishing Blocked: Duplicate question number(s) detected (${duplicateNumbers.map(n => `Q${n}`).join(', ')}). Remove or renumber duplicates before publishing.`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-xs tabular-nums">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Expected</div>
                <div className="text-base font-black text-slate-900">{expectedQuestionsCount ?? 'Auto'}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Detected</div>
                <div className="text-base font-black text-blue-700">{detectedQuestionsCount}</div>
              </div>
              <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Validated</div>
                <div className="text-base font-black text-emerald-800">{completeQuestionsCount}</div>
              </div>
              <div className={`p-2 rounded-lg border ${savedQuestionsCount === 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Saved in DB</div>
                <div className={`text-base font-black ${savedQuestionsCount === 0 ? 'text-rose-700' : 'text-indigo-700'}`}>{savedQuestionsCount}</div>
              </div>
              <div className={`p-2 rounded-lg border ${missingQuestionsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Missing</div>
                <div className={`text-base font-black ${missingQuestionsCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{missingQuestionsCount}</div>
              </div>
              <div className={`p-2 rounded-lg border ${duplicateCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                <div className={`text-[10px] font-bold uppercase ${duplicateCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Duplicates</div>
                <div className={`text-base font-black ${duplicateCount > 0 ? 'text-rose-800' : 'text-slate-900'}`}>{duplicateCount}</div>
              </div>
              <div className={`p-2 rounded-lg border ${incompleteQuestionsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <div className={`text-[10px] font-bold uppercase ${incompleteQuestionsCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  Needs Review
                </div>
                <div className={`text-base font-black ${incompleteQuestionsCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                  {incompleteQuestionsCount}
                </div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Figures Attached</div>
                <div className="text-base font-black text-indigo-700">{figuresAttachedCount}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Answer Keys</div>
                <div className="text-base font-black text-emerald-700">{answerKeysMatchedCount}/{savedQuestionsCount}</div>
              </div>
            </div>

            {(missingAnswersCount > 0 || missingTablesCount > 0 || missingOptionsCount > 0 || missingFiguresCount > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {missingTablesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                    {missingTablesCount} Missing Table
                  </span>
                )}
                {missingOptionsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                    {missingOptionsCount} Missing Options
                  </span>
                )}
                {missingFiguresCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                    {missingFiguresCount} Missing/Mismatch Figure
                  </span>
                )}
                {missingAnswersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                    {missingAnswersCount} Missing Answer Key
                  </span>
                )}
              </div>
            )}

            {incompleteQuestionsCount > 0 && (
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeIncomplete}
                    onChange={e => setExcludeIncomplete(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>
                    Publish Complete Questions Only ({completeQuestionsCount} verified · skip {incompleteQuestionsCount} incomplete)
                  </span>
                </label>

                {onReviewIncomplete && (
                  <button
                    type="button"
                    onClick={() => {
                      onReviewIncomplete();
                      onClose();
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition cursor-pointer"
                  >
                    Review Incomplete Questions
                  </button>
                )}
              </div>
            )}
          </div>

          {job.publishedTestId && (
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-indigo-950">
                Already published as <code className="font-mono bg-white px-1.5 py-0.5 rounded">{job.publishedTestId}</code>
              </span>
              <label className="flex items-center gap-1.5 font-bold text-indigo-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createNewCopy}
                  onChange={e => setCreateNewCopy(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>Create separate new test instead of updating in place</span>
              </label>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 0: UNIVERSAL TEST ASSIGNMENT & VISIBILITY */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('assignment')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Category Assignment &amp; Visibility
                </span>
              </div>
              {openSections.assignment ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {openSections.assignment && (
              <div className="p-4 space-y-3.5 border-t border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Select Portal Category / Categories (Multi-select)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineCategory(prev => !prev)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    {showInlineCategory ? 'Cancel New Category' : '+ Create New Category'}
                  </button>
                </div>

                {!isStandalone && (
                  <div className="flex flex-wrap items-center gap-2">
                    {categories.map(cat => {
                      const active = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {active ? '✓ ' : ''}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStandalone}
                    onChange={e => setIsStandalone(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Publish as Standalone Test (direct access/search only, not placed in category cards)</span>
                </label>

                {showInlineCategory && (
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2.5">
                    <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Inline New Category (Created Automatically on Publish)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={inlineCategoryName}
                        onChange={e => setInlineCategoryName(e.target.value)}
                        placeholder="Category Name (e.g. Grand Test Series)"
                        className="px-3 py-2 text-xs font-bold bg-white border border-indigo-200 rounded-xl outline-hidden"
                      />
                      <select
                        value={inlineCategoryTheme}
                        onChange={e => setInlineCategoryTheme(e.target.value as TestCategoryThemePreset)}
                        className="px-3 py-2 text-xs font-bold bg-white border border-indigo-200 rounded-xl outline-hidden"
                      >
                        <option value="indigo">Theme: Deep Indigo</option>
                        <option value="amber">Theme: Amber Gold</option>
                        <option value="emerald">Theme: Emerald</option>
                        <option value="blue">Theme: Electric Blue</option>
                        <option value="violet">Theme: Violet</option>
                        <option value="rose">Theme: Rose Crimson</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={inlineCategoryDescription}
                      onChange={e => setInlineCategoryDescription(e.target.value)}
                      placeholder="Short description for students..."
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl outline-hidden"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Visibility</label>
                    <select
                      value={visibility}
                      onChange={e => setVisibility(e.target.value as TestVisibility)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    >
                      <option value="public">Public (Visible on Tests Portal)</option>
                      <option value="unlisted">Unlisted (Direct Link / Passes Only)</option>
                      <option value="draft">Draft (Admin Preview Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Subject</label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    >
                      <option value="Combined">Combined (PCB)</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Chapter / Series Tag</label>
                    <input
                      type="text"
                      value={chapter}
                      onChange={e => setChapter(e.target.value)}
                      placeholder="Optional chapter name..."
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden"
                    />
                  </div>
                </div>

                {/* Test Card Thumbnail */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={e => setThumbnailUrl(e.target.value)}
                    placeholder="Optional cover thumbnail URL..."
                    className="flex-1 min-w-[200px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingThumb}
                    onClick={() => thumbInputRef.current?.click()}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingThumb ? 'Uploading...' : 'Upload Thumbnail'}
                  </button>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleThumbUpload(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: BASIC INFORMATION */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Basic Test Details &amp; Information
                </span>
              </div>
              {openSections.basic ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {openSections.basic && (
              <div className="p-4 space-y-3.5 border-t border-slate-200 bg-white">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Test Title (as shown to Students) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="e.g. NEET-UG Major Test 09"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Subtitle / Headline</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Test Number Badge</label>
                    <input
                      type="text"
                      value={testNumber}
                      onChange={e => setTestNumber(e.target.value)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Exam Code / Booklet</label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Target Series / Folder</label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={e => setFolderName(e.target.value)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Difficulty Level</label>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="easy">Easy (NCERT Basic)</option>
                      <option value="medium">Medium (Standard NEET-UG)</option>
                      <option value="hard">Hard (Advanced Multi-Concept)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="bilingual">Bilingual (English &amp; Hindi)</option>
                      <option value="en">English Only</option>
                      <option value="hi">Hindi Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Test Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Instructions to Candidates</label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: TEST CONFIGURATION & MARKING */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('config')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  2. Examination Configuration &amp; Marking Scheme
                </span>
              </div>
              {openSections.config ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {openSections.config && (
              <div className="p-4 space-y-3.5 border-t border-slate-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={360}
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 180)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Correct Mark (+)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={correctMarks}
                      onChange={e => setCorrectMarks(parseInt(e.target.value, 10) || 4)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Negative Mark (-)</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={negativeMarks}
                      onChange={e => setNegativeMarks(parseInt(e.target.value, 10) || 1)}
                      required
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={e => setRandomizeQuestions(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-800">Randomize Question Order</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={e => setRandomizeOptions(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-800">Randomize Option Order</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: PRICING & ACCESS */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('pricing')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  3. Pricing &amp; Student Access Control
                </span>
              </div>
              {openSections.pricing ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {openSections.pricing && (
              <div className="p-4 space-y-3.5 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pricingType" checked={isFree} onChange={() => setIsFree(true)} className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Free Practice Test</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pricingType" checked={!isFree} onChange={() => setIsFree(false)} className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Paid Test</span>
                  </label>
                </div>

                {!isFree && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Price (₹ INR)</label>
                      <input
                        type="number"
                        min={0}
                        value={price}
                        onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Original Strike Price (₹ INR)</label>
                      <input
                        type="number"
                        min={0}
                        value={originalPrice}
                        onChange={e => setOriginalPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInPass}
                    onChange={e => setIncludeInPass(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Include in NEET All-Access / Brahmastra Pass membership
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: EDUCATIONAL CONTEXT */}
          {/* ======================================================== */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('education')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  4. Educational Context &amp; NCERT Mapping
                </span>
              </div>
              {openSections.education ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {openSections.education && (
              <div className="p-4 space-y-3 border-t border-slate-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Target Exam Year</label>
                    <select
                      value={targetYear}
                      onChange={e => setTargetYear(e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    >
                      <option value="2025">NEET 2025</option>
                      <option value="2026">NEET 2026</option>
                      <option value="2027">NEET 2027</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">NCERT Coverage (%)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={ncertCoveragePercent}
                      onChange={e => setNcertCoveragePercent(parseInt(e.target.value, 10) || 98)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!canCleanPublish && (
            <label className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={forcePublish}
                onChange={e => setForcePublish(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>I confirm and authorize publishing despite validation warnings.</span>
            </label>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                hasHardBlocker ||
                isSubmitting ||
                isUploadingThumb ||
                (!canCleanPublish && !forcePublish && !(excludeIncomplete && completeQuestionsCount > 0))
              }
              className="min-h-[42px] px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : job.publishedTestId && !createNewCopy ? 'Update Published Test' : 'Publish to Student Engine'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
