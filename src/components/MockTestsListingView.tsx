import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  Lock, 
  Play, 
  Trophy, 
  BookOpen, 
  ShieldCheck, 
  Zap, 
  History, 
  RotateCcw, 
  Calendar, 
  ChevronRight, 
  FlaskConical, 
  Share2, 
  Star,
  Layers,
  Atom,
  Dna,
  FileText,
  Filter,
  ArrowRight
} from 'lucide-react';
import { MockTest, MockTestAttempt, MockSubject, MockTestType, MockTestCategory } from '../types';
import { 
  getStoredMockTests, 
  getStoredMockQuestions,
  hasUserPurchasedMockTest, 
  getAllAttemptsForStudent,
  canStudentAttemptTest,
  getTestCategory,
  getAvailableChaptersForSubject
} from '../lib/mockTestData';
import { MockTestLeaderboardModal } from './MockTestLeaderboardModal';
import { MockTestShareModal } from './MockTestShareModal';
import { MockTestDetailModal } from './MockTestDetailModal';
import { getProductRatingStats } from '../lib/reviewData';

interface MockTestsListingViewProps {
  currentUser?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  userProfile?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onStartTest: (test: MockTest) => void;
  onViewResult?: (test: MockTest, attempt: MockTestAttempt) => void;
  onBuyTest?: (test: MockTest) => void;
  onRequireAuth?: () => void;
  onOpenAuth?: () => void;
  onOpenLeaderboard?: (test: MockTest) => void;
  onBackToHome?: () => void;
}

export const MockTestsListingView: React.FC<MockTestsListingViewProps> = ({
  currentUser,
  userProfile,
  onStartTest,
  onViewResult,
  onBuyTest,
  onRequireAuth,
  onOpenAuth,
  onOpenLeaderboard,
  onBackToHome
}) => {
  const effectiveUser = userProfile || currentUser;
  const handleAuth = onOpenAuth || onRequireAuth || (() => {});

  const [tests, setTests] = useState<MockTest[]>(() => getStoredMockTests());
  const [searchQuery, setSearchQuery] = useState('');

  // 3 Primary Categories as required by User Brief:
  // 1. 'chapter_wise'
  // 2. 'full_subject'
  // 3. 'full_syllabus'
  // plus utility states: 'purchased' | 'history'
  const [activeMainCategory, setActiveMainCategory] = useState<'chapter_wise' | 'full_subject' | 'full_syllabus' | 'purchased' | 'history'>('chapter_wise');
  
  // Chapter Wise Sub-Navigation: Subject & Chapter
  const [chapterSubject, setChapterSubject] = useState<MockSubject>('Physics');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');

  // Full Subject Sub-Navigation: Physics, Chemistry, Biology, or All
  const [fullSubjectSubFilter, setFullSubjectSubFilter] = useState<'all' | MockSubject>('all');

  // Free vs Premium Quick Toggle
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'premium'>('all');

  const [activeLeaderboardTest, setActiveLeaderboardTest] = useState<MockTest | null>(null);
  const [attemptsUpdateTrigger, setAttemptsUpdateTrigger] = useState(0);
  const [languageSelectModalTest, setLanguageSelectModalTest] = useState<MockTest | null>(null);
  const [sharedTestModal, setSharedTestModal] = useState<MockTest | null>(null);
  const [shareModalTest, setShareModalTest] = useState<MockTest | null>(null);

  // Auto-open shared test if opened via direct link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testId = params.get('testId') || params.get('mockTest');
      if (testId) {
        const found = tests.find(t => t.id === testId);
        if (found) {
          setSharedTestModal(found);
        }
      }
    }
  }, [tests]);

  // Reactive listener to updates
  useEffect(() => {
    const handleUpdate = () => {
      setTests(getStoredMockTests());
      setAttemptsUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('neetmbbs_mock_attempts_updated', handleUpdate);
    window.addEventListener('neetmbbs_mock_tests_updated', handleUpdate);
    return () => {
      window.removeEventListener('neetmbbs_mock_attempts_updated', handleUpdate);
      window.removeEventListener('neetmbbs_mock_tests_updated', handleUpdate);
    };
  }, []);

  const userAttempts = useMemo(() => {
    return getAllAttemptsForStudent(effectiveUser?.uid, effectiveUser?.email);
  }, [effectiveUser, attemptsUpdateTrigger]);

  const isTestBilingual = (test: MockTest): boolean => {
    if (test.languages && test.languages.includes('hi')) return true;
    const questions = getStoredMockQuestions(test.id);
    return (questions || []).some(q => Boolean(q?.languages?.hi?.questionText || (q as any)?.hindiQuestionText));
  };

  const handleTestStartClick = (test: MockTest) => {
    if (!effectiveUser) {
      handleAuth();
      return;
    }
    if (isTestBilingual(test)) {
      setLanguageSelectModalTest(test);
    } else {
      onStartTest(test);
    }
  };

  // Only published tests in student view
  const publishedTests = useMemo(() => {
    return tests.filter(t => t.status === 'published');
  }, [tests]);

  // 3 Category Test Counts
  const counts = useMemo(() => {
    let chapterWise = 0;
    let fullSubject = 0;
    let fullSyllabus = 0;
    publishedTests.forEach(t => {
      const cat = getTestCategory(t);
      if (cat === 'chapter_wise') chapterWise++;
      else if (cat === 'full_subject') fullSubject++;
      else fullSyllabus++;
    });
    return { chapterWise, fullSubject, fullSyllabus };
  }, [publishedTests]);

  // Dynamically derive chapters for currently chosen chapter subject (Strictly non-hardcoded)
  const availableChapters = useMemo(() => {
    return getAvailableChaptersForSubject(publishedTests, chapterSubject);
  }, [publishedTests, chapterSubject]);

  // Reset chapter selection if subject changes and previous chapter is not in list
  useEffect(() => {
    if (selectedChapter !== 'all' && !availableChapters.includes(selectedChapter)) {
      setSelectedChapter('all');
    }
  }, [chapterSubject, availableChapters, selectedChapter]);

  // Filtered Tests based on active category and sub-filters
  const displayedTests = useMemo(() => {
    return publishedTests.filter(test => {
      const cat = getTestCategory(test);

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = test.title.toLowerCase().includes(q);
        const matchesNumber = test.testNumber.toLowerCase().includes(q);
        const matchesChapter = test.chapter ? test.chapter.toLowerCase().includes(q) : false;
        const matchesDesc = (test.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesNumber && !matchesChapter && !matchesDesc) return false;
      }

      // Free vs Premium filter
      if (priceFilter === 'free') {
        const isFree = test.isFree || test.price === 0 || !test.isPaid;
        if (!isFree) return false;
      } else if (priceFilter === 'premium') {
        const isPaid = test.isPaid || (test.price > 0 && !test.isFree);
        if (!isPaid) return false;
      }

      // 1. Chapter Wise Tests Filter
      if (activeMainCategory === 'chapter_wise') {
        if (cat !== 'chapter_wise') return false;
        const matchSubj = test.subject === chapterSubject || (test.subjects && test.subjects.includes(chapterSubject));
        if (!matchSubj) return false;
        if (selectedChapter !== 'all') {
          if (!test.chapter || test.chapter.trim().toLowerCase() !== selectedChapter.trim().toLowerCase()) {
            return false;
          }
        }
        return true;
      }

      // 2. Full Subject Tests Filter
      if (activeMainCategory === 'full_subject') {
        if (cat !== 'full_subject') return false;
        if (fullSubjectSubFilter !== 'all') {
          const matchSubj = test.subject === fullSubjectSubFilter || (test.subjects && test.subjects.includes(fullSubjectSubFilter));
          if (!matchSubj) return false;
        }
        return true;
      }

      // 3. Full Syllabus Tests Filter
      if (activeMainCategory === 'full_syllabus') {
        return cat === 'full_syllabus';
      }

      // 4. Purchased Tests Filter
      if (activeMainCategory === 'purchased') {
        return hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
      }

      return true;
    });
  }, [publishedTests, activeMainCategory, chapterSubject, selectedChapter, fullSubjectSubFilter, priceFilter, searchQuery, effectiveUser]);

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 px-2 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ============================================================== */}
        {/* HEADER BAR: NEET CBT SIMULATOR TITLE */}
        {/* ============================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-[10px] font-black uppercase tracking-wider mb-1 border border-blue-100">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>NTA NEET CBT Official Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-tight">
              NEET Mock Tests System
            </h1>
            <p className="text-xs sm:text-sm text-blue-600 font-bold tracking-wide mt-0.5">
              Practice Chapter-wise, Full Subject &amp; Full Syllabus CBT Tests with All India Rank
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +4/-1 Marking
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Live Timer
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
              <Trophy className="w-3.5 h-3.5 text-purple-600" /> Leaderboard
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* REQUIREMENT 1 & 6: THREE MAIN MOCK TEST TYPES (TOP 3 CARDS) */}
        {/* ============================================================== */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">

            {/* 1️⃣ CHAPTER WISE TESTS CARD */}
            <div
              onClick={() => {
                setActiveMainCategory('chapter_wise');
                setSelectedChapter('all');
              }}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                activeMainCategory === 'chapter_wise'
                  ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/15 border-orange-500 shadow-md ring-2 ring-orange-500/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-orange-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    activeMainCategory === 'chapter_wise'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {counts.chapterWise} Tests Live
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-tight">
                    Chapter Wise Tests
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Practice chapter by chapter. Master individual topics across Physics, Chemistry, and Biology.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-orange-700 flex items-center gap-1 text-[11px]">
                  <span>Physics • Chemistry • Biology</span>
                </span>
                <span className="text-orange-600 font-black flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Explore</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 2️⃣ FULL SUBJECT TESTS CARD */}
            <div
              onClick={() => setActiveMainCategory('full_subject')}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                activeMainCategory === 'full_subject'
                  ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/15 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-emerald-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    activeMainCategory === 'full_subject'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {counts.fullSubject} Tests Live
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-tight">
                    Full Subject Tests
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Test your complete Physics, Chemistry or Biology. Complete syllabus evaluation per subject.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                  <span>100% Subject Tests</span>
                </span>
                <span className="text-emerald-600 font-black flex items-center gap-0.5 text-xs">
                  <span>Explore</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 3️⃣ FULL SYLLABUS TESTS CARD */}
            <div
              onClick={() => setActiveMainCategory('full_syllabus')}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                activeMainCategory === 'full_syllabus'
                  ? 'bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/15 border-blue-600 shadow-md ring-2 ring-blue-600/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-blue-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    activeMainCategory === 'full_syllabus'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {counts.fullSyllabus} Tests Live
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-tight">
                    Full Syllabus Tests
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Experience a complete NEET-style PCB test. 720 Marks with Physics + Chemistry + Biology.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-blue-700 flex items-center gap-1 text-[11px]">
                  <span>Physics + Chemistry + Biology</span>
                </span>
                <span className="text-blue-600 font-black flex items-center gap-0.5 text-xs">
                  <span>Explore</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* SUB-NAVIGATION & SEARCH BAR */}
        {/* ============================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mock tests by title, chapter name, or code..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            {/* Utility Tabs: Purchased, Attempt History, All */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => setPriceFilter(prev => prev === 'all' ? 'free' : prev === 'free' ? 'premium' : 'all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  priceFilter === 'free'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : priceFilter === 'premium'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {priceFilter === 'all' ? 'Price: All' : priceFilter === 'free' ? '⚡ Free Tests' : '🔒 Premium'}
              </button>

              <button
                type="button"
                onClick={() => setActiveMainCategory('purchased')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                  activeMainCategory === 'purchased'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Purchased Tests
              </button>

              <button
                type="button"
                onClick={() => setActiveMainCategory('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                  activeMainCategory === 'history'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
                {userAttempts.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-black">
                    {userAttempts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* DYNAMIC SUB-SELECTOR FOR CHAPTER WISE TESTS (Requirement 2) */}
          {activeMainCategory === 'chapter_wise' && (
            <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Select Subject:</span>
                </span>

                {/* 3 Subject Buttons: Physics, Chemistry, Biology */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChapterSubject('Physics');
                      setSelectedChapter('all');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      chapterSubject === 'Physics'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <Atom className="w-3.5 h-3.5 text-blue-300" />
                    <span>Physics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChapterSubject('Chemistry');
                      setSelectedChapter('all');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      chapterSubject === 'Chemistry'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-amber-200" />
                    <span>Chemistry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChapterSubject('Biology');
                      setSelectedChapter('all');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      chapterSubject === 'Biology'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <Dna className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Biology</span>
                  </button>
                </div>
              </div>

              {/* Chapters list for selected subject */}
              {availableChapters.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Chapters:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedChapter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
                      selectedChapter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Chapters ({availableChapters.length})
                  </button>
                  {availableChapters.map(chap => (
                    <button
                      key={chap}
                      type="button"
                      onClick={() => setSelectedChapter(chap)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
                        selectedChapter === chap
                          ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {chap}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC SUB-SELECTOR FOR FULL SUBJECT TESTS (Requirement 3) */}
          {activeMainCategory === 'full_subject' && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 animate-in fade-in duration-150">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Filter By Complete Subject:</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['all', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setFullSubjectSubFilter(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      fullSubjectSubFilter === subj
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {subj === 'all' ? 'All Subjects' : subj}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* ATTEMPT HISTORY VIEW */}
        {/* ============================================================== */}
        {activeMainCategory === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                  Your NEET Mock Test Attempts ({userAttempts.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Performance analysis, scores, and answer reviews from your completed CBT mock exams.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMainCategory('chapter_wise')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer shrink-0"
              >
                Back to Tests →
              </button>
            </div>

            {userAttempts.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Mock Tests Attempted Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Take your first NEET official CBT simulator test to see your detailed performance analysis, All India Rank, and solutions.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMainCategory('chapter_wise')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Start Chapter Wise Test
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {userAttempts.map((attempt) => {
                  const test = tests.find(t => t.id === attempt.testId);
                  const totalMarks = test?.maxMarks || 720;
                  const correctMarks = test?.correctMarks || 4;
                  const negativeMarks = test?.negativeMarks || 1;
                  const score = attempt.score ?? (((attempt.correctCount || 0) * correctMarks) - ((attempt.incorrectCount || 0) * negativeMarks));
                  const reattemptCheck = test ? canStudentAttemptTest(test, effectiveUser?.uid, effectiveUser?.email) : { allowed: false };

                  return (
                    <div
                      key={attempt.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono">
                            {test?.testNumber || 'NEET'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>

                        <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] line-clamp-2">
                          {test?.title || attempt.testTitle || 'NEET Mock Test'}
                        </h3>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Score</span>
                            <span className="text-base font-black text-blue-600 font-['Outfit',sans-serif]">
                              {score} <span className="text-xs text-slate-400 font-normal">/ {totalMarks}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Accuracy</span>
                            <span className="text-sm font-bold text-emerald-600">
                              {attempt.accuracy !== undefined ? `${attempt.accuracy}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        {onViewResult && (
                          <button
                            type="button"
                            onClick={() => {
                              if (test && onViewResult) {
                                onViewResult(test, attempt);
                              }
                            }}
                            className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                          >
                            View Result
                          </button>
                        )}
                        {test && reattemptCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => handleTestStartClick(test)}
                            className="py-2 px-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reattempt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TESTS LISTING VIEW (CHAPTER WISE / FULL SUBJECT / FULL SYLLABUS) */}
        {/* ============================================================== */}
        {activeMainCategory !== 'history' && (
          <div className="space-y-3">
            {/* Header info for currently active category */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                  <span>
                    {activeMainCategory === 'chapter_wise'
                      ? `📖 Chapter Wise Tests • ${chapterSubject}`
                      : activeMainCategory === 'full_subject'
                      ? `🧪 Full Subject Tests`
                      : activeMainCategory === 'full_syllabus'
                      ? `🏆 Full Syllabus Tests (PCB)`
                      : `Purchased Mock Tests`}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    ({displayedTests.length} {displayedTests.length === 1 ? 'test' : 'tests'})
                  </span>
                </h2>
              </div>
            </div>

            {/* EMPTY STATE */}
            {displayedTests.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {activeMainCategory === 'chapter_wise'
                    ? `No chapter tests published for ${chapterSubject} yet`
                    : activeMainCategory === 'full_subject'
                    ? `No full subject tests published yet`
                    : activeMainCategory === 'full_syllabus'
                    ? `No full syllabus tests published yet`
                    : `No purchased tests found`}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {activeMainCategory === 'chapter_wise'
                    ? `The admin has not uploaded tests for ${chapterSubject} ${selectedChapter !== 'all' ? `(${selectedChapter})` : ''} yet. As soon as the admin uploads and publishes chapter tests, they will appear right here!`
                    : `Tests will appear here once published by the admin. Try selecting another test category above!`}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  {activeMainCategory !== 'full_syllabus' && (
                    <button
                      type="button"
                      onClick={() => setActiveMainCategory('full_syllabus')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Try Full Syllabus Tests
                    </button>
                  )}
                  {activeMainCategory !== 'chapter_wise' && (
                    <button
                      type="button"
                      onClick={() => setActiveMainCategory('chapter_wise')}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Try Chapter Wise Tests
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* GRID OF TESTS */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {displayedTests.map((test) => {
                  const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
                  const isCompleted = userAttempts.some(a => a.testId === test.id);
                  const ratingStats = getProductRatingStats(test.id);
                  const testCat = getTestCategory(test);

                  // Colorful card theming
                  const cardTheme = testCat === 'chapter_wise'
                    ? {
                        border: 'hover:border-orange-400',
                        badge: 'bg-orange-50 text-orange-700 border-orange-200',
                        glow: 'hover:shadow-orange-500/10'
                      }
                    : testCat === 'full_subject'
                    ? {
                        border: 'hover:border-emerald-400',
                        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        glow: 'hover:shadow-emerald-500/10'
                      }
                    : {
                        border: 'hover:border-blue-400',
                        badge: 'bg-blue-50 text-blue-700 border-blue-200',
                        glow: 'hover:shadow-blue-500/10'
                      };

                  return (
                    <div
                      key={test.id}
                      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${cardTheme.border} group`}
                    >
                      {/* Top Content Area */}
                      <div className="p-4 sm:p-5 space-y-2.5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-[10.5px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-['Outfit',sans-serif]">
                              {test.testNumber || 'NEET'}
                            </span>
                            <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${cardTheme.badge} truncate`}>
                              {testCat === 'chapter_wise' 
                                ? (test.subject || 'Chapter Test') 
                                : testCat === 'full_subject' 
                                ? (test.subject ? `${test.subject} Full` : 'Full Subject')
                                : 'Full PCB (720M)'}
                            </span>
                          </div>

                          {/* Access Badge */}
                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                              </span>
                            ) : isPurchased ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3 text-blue-600" /> Unlocked
                              </span>
                            ) : test.price === 0 || test.isFree ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
                                Free Test
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                <Lock className="w-2.5 h-2.5 text-amber-500" /> ₹{test.price}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chapter indicator if Chapter Wise */}
                        {testCat === 'chapter_wise' && test.chapter && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50/80 border border-orange-200/80 px-2 py-0.5 rounded-md">
                            <BookOpen className="w-3 h-3 text-orange-600" />
                            <span className="truncate max-w-[220px]">{test.chapter}</span>
                          </div>
                        )}

                        {/* Title */}
                        <h3 
                          onClick={() => setSharedTestModal(test)}
                          className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] leading-snug line-clamp-2 group-hover:text-blue-600 transition cursor-pointer"
                          title="Click to view test syllabus & details"
                        >
                          {test.title}
                        </h3>

                        {/* Description */}
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {test.description || test.shortDescription || 'NEET pattern questions with detailed answer keys and explanations.'}
                        </p>

                        {/* Metrics Bar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10.5px] font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            <HelpCircle className="w-3 h-3 text-blue-600" />
                            <span>{test.totalQuestions} Qs</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            <span>{test.durationMinutes}m</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-emerald-50/70 border border-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            <span>+4/-1 Marks</span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-purple-50/70 border border-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            <span>{test.maxMarks || 720}M</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons Toolbar */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenLeaderboard ? onOpenLeaderboard(test) : setActiveLeaderboardTest(test)}
                            className="p-2 hover:bg-white text-slate-500 hover:text-amber-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                            title="View Leaderboard & Rankings"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setShareModalTest(test)}
                            className="p-2 hover:bg-white text-slate-500 hover:text-blue-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                            title="Share this test"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSharedTestModal(test)}
                            className="text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg transition"
                          >
                            Syllabus
                          </button>
                        </div>

                        {/* Primary Start / Unlock Button */}
                        <div>
                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleTestStartClick(test)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reattempt</span>
                            </button>
                          ) : isPurchased || test.price === 0 || test.isFree ? (
                            <button
                              type="button"
                              onClick={() => handleTestStartClick(test)}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start Test</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onBuyTest ? onBuyTest(test) : setSharedTestModal(test)}
                              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Unlock ₹{test.price}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modals */}
      {activeLeaderboardTest && (
        <MockTestLeaderboardModal
          test={activeLeaderboardTest}
          onClose={() => setActiveLeaderboardTest(null)}
        />
      )}

      {sharedTestModal && (
        <MockTestDetailModal
          test={sharedTestModal}
          currentUser={effectiveUser}
          onStartTest={(t) => {
            setSharedTestModal(null);
            handleTestStartClick(t);
          }}
          onBuyTest={(t) => {
            setSharedTestModal(null);
            if (onBuyTest) onBuyTest(t);
          }}
          onClose={() => setSharedTestModal(null)}
        />
      )}

      {shareModalTest && (
        <MockTestShareModal
          test={shareModalTest}
          onClose={() => setShareModalTest(null)}
        />
      )}
    </div>
  );
};
