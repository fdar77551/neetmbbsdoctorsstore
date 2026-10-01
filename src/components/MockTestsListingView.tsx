import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  Clock, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  Lock, 
  Play, 
  Eye, 
  Trophy, 
  BookOpen, 
  Check, 
  ShieldCheck, 
  Zap, 
  Tag,
  History,
  RotateCcw,
  Calendar,
  BarChart2,
  ChevronRight,
  Languages,
  FlaskConical,
  X,
  Share2,
  Star
} from 'lucide-react';
import { MockTest, MockTestAttempt, MockSubject, MockTestType } from '../types';
import { 
  getStoredMockTests, 
  getStoredMockQuestions,
  hasUserPurchasedMockTest, 
  getMockTestAttempt,
  getAllAttemptsForStudent,
  canStudentAttemptTest
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
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'free' | 'premium' | 'full_syllabus' | 'subject_test' | 'purchased' | 'history'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<'all' | MockSubject>('all');
  const [activeLeaderboardTest, setActiveLeaderboardTest] = useState<MockTest | null>(null);
  const [attemptsUpdateTrigger, setAttemptsUpdateTrigger] = useState(0);
  const [languageSelectModalTest, setLanguageSelectModalTest] = useState<MockTest | null>(null);
  const [sharedTestModal, setSharedTestModal] = useState<MockTest | null>(null);
  const [shareModalTest, setShareModalTest] = useState<MockTest | null>(null);

  // Automatically open shared test when opened via unique link (?testId=...)
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

  const filteredTests = tests.filter(test => {
    // Only published in student view
    if (test.status !== 'published') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = test.title.toLowerCase().includes(q);
      const matchesNumber = test.testNumber.toLowerCase().includes(q);
      const matchesDesc = test.description.toLowerCase().includes(q);
      if (!matchesTitle && !matchesNumber && !matchesDesc) return false;
    }

    // Type filter
    if (selectedTypeFilter === 'free') {
      const isFree = test.isFree || test.price === 0 || !test.isPaid;
      if (!isFree) return false;
    } else if (selectedTypeFilter === 'premium') {
      const isPaid = test.isPaid || (test.price > 0 && !test.isFree);
      if (!isPaid) return false;
    } else if (selectedTypeFilter === 'purchased') {
      const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
      if (!isPurchased) return false;
    } else if (selectedTypeFilter !== 'all' && selectedTypeFilter !== 'history') {
      if (test.type !== selectedTypeFilter) return false;
    }

    // Subject filter
    if (selectedSubjectFilter !== 'all') {
      if (!test.subjects.includes(selectedSubjectFilter)) return false;
    }

    return true;
  });

  const handleOpenLeaderboardModal = (test: MockTest) => {
    if (onOpenLeaderboard) {
      onOpenLeaderboard(test);
    } else {
      setActiveLeaderboardTest(test);
    }
  };

  const handleViewAttemptResult = (attempt: MockTestAttempt) => {
    const test = tests.find(t => t.id === attempt.testId);
    if (test && onViewResult) {
      onViewResult(test, attempt);
    }
  };

  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-2 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Compact Modern Header matching user brief */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider mb-1 border border-blue-100">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>NTA NEET CBT Simulator</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
              NEET Mock Tests
            </h1>
            <p className="text-xs sm:text-sm text-blue-600 font-bold tracking-wide">
              Practice. Analyze. Improve.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +4/-1 Scoring
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Live Timer &amp; Rank
            </span>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mock tests by name, topic, or test number..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            {/* Subject Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSubjectFilter === subj
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {subj === 'all' ? 'All Subjects' : subj}
                </button>
              ))}
            </div>
          </div>

          {/* Main Navigation Tabs: Tests vs Attempt History */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Tests ({tests.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('free')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Free Practice Tests</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('premium')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === 'premium'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Premium Test Series</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('purchased')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === 'purchased'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              My Purchased Tests
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === 'history'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>My Attempt History</span>
              {userAttempts.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedTypeFilter === 'history' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-800'
                }`}>
                  {userAttempts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SECTION: MY ATTEMPT HISTORY VIEW */}
        {selectedTypeFilter === 'history' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                  Your NEET CBT Attempt History
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed scorecards, time tracking, and answer evaluation from all your completed mock tests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('all')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer shrink-0"
              >
                Browse All Tests →
              </button>
            </div>

            {userAttempts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
                <History className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Mock Tests Attempted Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Take your first NEET official CBT simulator test to see your detailed performance analysis, All India Rank, and question-by-question solutions.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTypeFilter('all')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Start a Mock Test
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {userAttempts.map((attempt, index) => {
                  const test = tests.find(t => t.id === attempt.testId);
                  const totalMarks = test?.maxMarks || 720;
                  const correctMarks = test?.correctMarks || 4;
                  const negativeMarks = test?.negativeMarks || 1;
                  const score = attempt.score ?? (((attempt.correctCount || 0) * correctMarks) - ((attempt.incorrectCount || 0) * negativeMarks));
                  const reattemptCheck = test ? canStudentAttemptTest(test, effectiveUser?.uid, effectiveUser?.email) : { allowed: false };

                  return (
                    <div
                      key={attempt.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                            {test?.testNumber || 'NEET-MOCK'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif] line-clamp-2">
                          {test?.title || attempt.testTitle || 'NEET Mock Test'}
                        </h3>

                        {/* Score Metric Card */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Score</span>
                            <span className="text-lg font-black text-blue-600 font-['Outfit',sans-serif]">
                              {score} <span className="text-xs text-slate-400 font-normal">/ {totalMarks}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
                            <span className="text-sm font-black text-emerald-600">
                              {attempt.accuracy || 0}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Time</span>
                            <span className="text-xs font-bold text-slate-700">
                              {formatDuration(attempt.timeSpentSeconds)}
                            </span>
                          </div>
                        </div>

                        {/* Question Breakdown */}
                        <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-slate-500">
                          <span className="text-emerald-700">✅ {attempt.correctCount || 0} Correct</span>
                          <span className="text-rose-600">❌ {attempt.incorrectCount || 0} Incorrect</span>
                          <span className="text-slate-400">⚪ {attempt.unansweredCount || 0} Skipped</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="bg-slate-50/80 px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {test && onViewResult && (
                          <button
                            type="button"
                            onClick={() => handleViewAttemptResult(attempt)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Analysis</span>
                          </button>
                        )}

                        {test && reattemptCheck.allowed && (
                          <button
                            type="button"
                            onClick={() => onStartTest(test)}
                            className="flex items-center gap-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                            title="Retake this test"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retake</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* SECTION: TESTS CATALOGUE - COMPACT, COLOURFUL, MODERN & MOBILE-FRIENDLY GRID */
          filteredTests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No mock tests found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query or filter tags to find matching NEET mock tests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredTests.map((test) => {
                const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
                const userAttempt = getMockTestAttempt(test.id, effectiveUser?.uid, effectiveUser?.email);
                const isCompleted = userAttempt && userAttempt.status === 'submitted';
                const isInProgress = userAttempt && userAttempt.status === 'in_progress';
                const reattemptCheck = canStudentAttemptTest(test, effectiveUser?.uid, effectiveUser?.email);
                const isBilingual = isTestBilingual(test);
                const storedQuestions = getStoredMockQuestions(test.id);
                const hasFigures = storedQuestions.some(q => Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0)));
                const attemptCount = userAttempt ? (userAttempt.status === 'submitted' ? 1 : 0) : 0;
                const ratingStats = getProductRatingStats(test.id, 4.9, 84);

                // Color accent theme based on subject / type
                const primarySubject = test.subjects?.[0] || 'Full';
                const theme = primarySubject === 'Physics'
                  ? { border: 'hover:border-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200', grad: 'from-blue-500/10 to-indigo-500/5' }
                  : primarySubject === 'Chemistry'
                  ? { border: 'hover:border-amber-400', badge: 'bg-amber-50 text-amber-800 border-amber-200', grad: 'from-amber-500/10 to-orange-500/5' }
                  : primarySubject === 'Biology'
                  ? { border: 'hover:border-emerald-400', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', grad: 'from-emerald-500/10 to-teal-500/5' }
                  : { border: 'hover:border-purple-400', badge: 'bg-purple-50 text-purple-800 border-purple-200', grad: 'from-purple-500/10 to-indigo-500/5' };

                return (
                  <div
                    key={test.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${theme.border} group`}
                  >
                    {/* Top Content Area */}
                    <div className="p-4 sm:p-5 space-y-2.5">
                      {/* Badges Bar: Test Code, Type, Access Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[11px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-['Outfit',sans-serif]">
                            {test.testNumber || 'NEET'}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${theme.badge} truncate`}>
                            {primarySubject}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                            </span>
                          ) : isPurchased ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-blue-600" /> Unlocked
                            </span>
                          ) : test.price === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
                              100% Free
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              <Lock className="w-2.5 h-2.5 text-amber-500" /> Premium
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Test Title (Clickable to open test details modal) */}
                      <h3 
                        onClick={() => setSharedTestModal(test)}
                        className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                        title="Click to view test syllabus, details and reviews"
                      >
                        {test.title}
                      </h3>

                      {/* Rating & Attempt Info */}
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div 
                          onClick={() => setSharedTestModal(test)}
                          className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/80 cursor-pointer hover:bg-amber-100 transition"
                          title="View reviews and star ratings"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{ratingStats.averageRating}</span>
                          <span className="text-slate-400 font-normal">({ratingStats.totalReviews})</span>
                        </div>

                        {attemptCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Attempted ({attemptCount})
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {test.description || test.shortDescription}
                      </p>

                      {/* Key Indicators Row: Questions, Time, Marks, Figures */}
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
                          <Award className="w-3 h-3 text-emerald-600" />
                          <span>+{test.correctMarks}/-{test.negativeMarks}</span>
                        </span>
                        {isBilingual && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded-md text-[10px]">
                            <Languages className="w-2.5 h-2.5 text-amber-600" />
                            <span>EN+हिंदी</span>
                          </span>
                        )}
                        {hasFigures && (
                          <span className="inline-flex items-center gap-0.5 bg-purple-50 border border-purple-200 text-purple-800 px-1.5 py-0.5 rounded-md text-[10px]">
                            <FlaskConical className="w-2.5 h-2.5 text-purple-600" />
                            <span>Diagrams</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Action Bar */}
                    <div className="bg-slate-50/90 px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* Price Display */}
                      <div>
                        {test.price === 0 ? (
                          <span className="text-base sm:text-lg font-black text-emerald-600 font-['Outfit',sans-serif]">Free</span>
                        ) : isPurchased ? (
                          <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                          </span>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                              ₹{test.price}
                            </span>
                            {test.originalPrice && test.originalPrice > test.price && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ₹{test.originalPrice}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Share Button (Prompt Requirement 1) */}
                        <button
                          type="button"
                          onClick={() => setShareModalTest(test)}
                          className="p-2 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                          title="Share Mock Test"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {test.showLeaderboard && (
                          <button
                            type="button"
                            onClick={() => handleOpenLeaderboardModal(test)}
                            className="p-2 bg-white hover:bg-slate-100 text-amber-600 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                            title="All India Leaderboard"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isCompleted ? (
                          <div className="flex items-center gap-1">
                            {onViewResult && (
                              <button
                                type="button"
                                onClick={() => onViewResult(test, userAttempt!)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Analysis</span>
                              </button>
                            )}
                            {reattemptCheck.allowed && (
                              <button
                                type="button"
                                onClick={() => handleTestStartClick(test)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
                                title="Retake Test"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (isPurchased || test.price === 0) ? (
                          <button
                            type="button"
                            onClick={() => handleTestStartClick(test)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 font-['Outfit',sans-serif]"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isInProgress ? 'Resume' : 'Start'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!effectiveUser) {
                                handleAuth();
                              } else if (onBuyTest) {
                                onBuyTest(test);
                              } else {
                                handleTestStartClick(test);
                              }
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1 font-['Outfit',sans-serif]"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Unlock • ₹{test.price}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>

      {/* Bilingual Language Selection Modal */}
      {languageSelectModalTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  Select Test Language / परीक्षा माध्यम
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  {languageSelectModalTest.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLanguageSelectModalTest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const test = languageSelectModalTest;
                  setLanguageSelectModalTest(null);
                  onStartTest(test);
                }}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 transition text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-blue-700">
                    English Medium
                  </div>
                  <div className="text-xs text-slate-500">
                    Questions and options presented in English
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition">
                  Start →
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const test = languageSelectModalTest;
                  setLanguageSelectModalTest(null);
                  onStartTest(test);
                }}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 font-['Outfit',sans-serif]">
                    हिंदी माध्यम (Hindi Medium)
                  </div>
                  <div className="text-xs text-slate-500">
                    प्रश्न एवं विकल्प देवनागरी हिंदी में प्रदर्शित होंगे
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white rounded-lg transition">
                  शुरू करें →
                </span>
              </button>
            </div>

            <p className="text-[11.5px] text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-2 leading-snug">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>You can also switch language at any time during the exam from the top bar.</span>
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {activeLeaderboardTest && (
        <MockTestLeaderboardModal
          test={activeLeaderboardTest}
          isOpen={Boolean(activeLeaderboardTest)}
          onClose={() => setActiveLeaderboardTest(null)}
          currentUserEmail={effectiveUser?.email}
        />
      )}

      {/* Mock Test Share Modal */}
      <MockTestShareModal
        test={shareModalTest}
        isOpen={Boolean(shareModalTest)}
        onClose={() => setShareModalTest(null)}
      />

      {/* Shared Mock Test Details & Review Modal */}
      <MockTestDetailModal
        test={sharedTestModal}
        isOpen={Boolean(sharedTestModal)}
        onClose={() => setSharedTestModal(null)}
        currentUser={currentUser}
        userProfile={userProfile}
        onStartTest={onStartTest}
        onBuyTest={onBuyTest}
        onRequireAuth={handleAuth}
        onOpenLeaderboard={handleOpenLeaderboardModal}
      />
    </div>
  );
};
