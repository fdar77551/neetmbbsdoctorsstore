import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  Trophy, 
  ArrowLeft, 
  Share2, 
  Calendar, 
  Atom, 
  FlaskConical, 
  Dna,
  History,
  Check,
  CheckCircle,
  Award
} from 'lucide-react';
import { 
  MockTest, 
  MockQuestion, 
  MockTestPurchase, 
  MockTestAttempt, 
  MockSubject, 
  UserProfile,
  MockTestPackagePricing 
} from '../types';
import { 
  getStoredMockTests, 
  getStoredMockQuestions, 
  getAllAttemptsForStudent,
  canStudentAttemptTest,
  hasUserPurchasedMockTest,
  getTestCategory,
  getAvailableChaptersForSubject,
  getStoredMockPurchases,
  getMockTestPricingPackages,
  hasUserPurchasedPackage
} from '../lib/mockTestData';
import { getCurrentUser } from '../lib/storage';
import { MockTestLeaderboardModal } from './MockTestLeaderboardModal';
import { MockTestDetailModal } from './MockTestDetailModal';
import { MockTestShareModal } from './MockTestShareModal';

export type MockTestPageView = 'portal' | 'chapter_wise' | 'full_subject' | 'full_syllabus' | 'purchased' | 'history';

interface MockTestsListingViewProps {
  userProfile?: UserProfile | null;
  onStartTest: (test: MockTest, language?: 'en' | 'hi') => void;
  onViewResult?: (test: MockTest, attempt: MockTestAttempt) => void;
  onBuyTest?: (test: MockTest) => void;
  onRequireAuth?: () => void;
  onOpenAuth?: () => void;
  onOpenLeaderboard?: (test: MockTest) => void;
  onBackToHome?: () => void;
  initialPageView?: MockTestPageView;
}

export const MockTestsListingView: React.FC<MockTestsListingViewProps> = ({
  userProfile,
  onStartTest,
  onViewResult,
  onBuyTest,
  onRequireAuth,
  onOpenAuth,
  onOpenLeaderboard,
  onBackToHome,
  initialPageView
}) => {
  const effectiveUser = userProfile || getCurrentUser();
  const handleAuth = onOpenAuth || onRequireAuth || (() => {});

  const [tests, setTests] = useState<MockTest[]>(() => getStoredMockTests());
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-page navigation state:
  // 'portal' = Main Landing Portal with the 3 Category Cards
  // 'chapter_wise' = Dedicated Page for Chapter Wise Tests
  // 'full_subject' = Dedicated Page for Full Subject Tests
  // 'full_syllabus' = Dedicated Page for Full Syllabus Tests
  // 'purchased' = Dedicated Page for Purchased Tests
  // 'history' = Dedicated Page for Attempt History
  const [pageView, setPageView] = useState<MockTestPageView>(() => {
    if (initialPageView) return initialPageView;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('chapter-wise')) return 'chapter_wise';
      if (hash.includes('full-subject')) return 'full_subject';
      if (hash.includes('full-syllabus')) return 'full_syllabus';
      if (hash.includes('purchased')) return 'purchased';
      if (hash.includes('history')) return 'history';
    }
    return 'portal';
  });

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
  const [pricingPackages, setPricingPackages] = useState<MockTestPackagePricing>(() => getMockTestPricingPackages());

  // Reactive listener to pricing updates
  useEffect(() => {
    const handlePricingUpdate = () => {
      setPricingPackages(getMockTestPricingPackages());
    };
    window.addEventListener('neetmbbs_mock_pricing_updated', handlePricingUpdate);
    return () => window.removeEventListener('neetmbbs_mock_pricing_updated', handlePricingUpdate);
  }, []);

  const handleBuyPackage = (packageKey: string, title: string, price: number, originalPrice?: number) => {
    if (!effectiveUser) {
      handleAuth();
      return;
    }
    const pseudoTest: MockTest = {
      id: packageKey,
      title,
      testNumber: 'PASS',
      description: `Complete unlock for all tests in this pass. Immediate access to official NTA CBT interface, timer, and All India Rank leaderboards.`,
      type: 'chapter_test',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      totalQuestions: 180,
      durationMinutes: 180,
      maxMarks: 720,
      correctMarks: 4,
      negativeMarks: 1,
      price,
      originalPrice: originalPrice || (price > 0 ? price + 250 : 399),
      allowMultipleAttempts: true,
      showLeaderboard: true,
      status: 'published',
      createdAt: new Date().toISOString()
    };
    if (onBuyTest) {
      onBuyTest(pseudoTest);
    } else {
      setSharedTestModal(pseudoTest);
    }
  };

  // Navigate to dedicated page with hash synchronization for browser Back/Forward buttons
  const navigateToPage = (newPage: MockTestPageView) => {
    setPageView(newPage);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      if (newPage === 'portal') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      } else {
        const slug = newPage.replace('_', '-');
        window.history.pushState(null, '', `#${slug}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync hash on popstate / hashchange (Browser Back button support)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase();
      if (hash.includes('chapter-wise')) setPageView('chapter_wise');
      else if (hash.includes('full-subject')) setPageView('full_subject');
      else if (hash.includes('full-syllabus')) setPageView('full_syllabus');
      else if (hash.includes('purchased')) setPageView('purchased');
      else if (hash.includes('history')) setPageView('history');
      else setPageView('portal');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-open shared test if opened via direct link ?testId=xxx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testId = params.get('testId') || params.get('mockTest');
      if (testId) {
        const found = tests.find(t => t.id === testId);
        if (found) {
          setSharedTestModal(found);
          const cat = getTestCategory(found);
          setPageView(cat);
        }
      }
    }
  }, [tests]);

  // Reactive listener to updates from storage / Firebase
  useEffect(() => {
    const handleUpdate = () => {
      setTests(getStoredMockTests());
      setAttemptsUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('neetmbbs_mock_attempts_updated', handleUpdate);
    window.addEventListener('neetmbbs_mock_tests_updated', handleUpdate);
    window.addEventListener('neetmbbs_mock_purchases_updated', handleUpdate);
    return () => {
      window.removeEventListener('neetmbbs_mock_attempts_updated', handleUpdate);
      window.removeEventListener('neetmbbs_mock_tests_updated', handleUpdate);
      window.removeEventListener('neetmbbs_mock_purchases_updated', handleUpdate);
    };
  }, []);

  const userAttempts = useMemo(() => {
    return getAllAttemptsForStudent(effectiveUser?.uid, effectiveUser?.email);
  }, [effectiveUser, attemptsUpdateTrigger]);

  const userPurchases = useMemo(() => {
    const all = getStoredMockPurchases();
    if (!effectiveUser) return [];
    const uid = effectiveUser.uid;
    const email = (effectiveUser.email || '').toLowerCase();
    return all.filter(p => (uid && p.userId === uid) || (email && p.userEmail.toLowerCase() === email));
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

  // Filtered Tests for the Active Dedicated Page
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

      // 1. Chapter Wise Page Filter
      if (pageView === 'chapter_wise') {
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

      // 2. Full Subject Page Filter
      if (pageView === 'full_subject') {
        if (cat !== 'full_subject') return false;
        if (fullSubjectSubFilter !== 'all') {
          const matchSubj = test.subject === fullSubjectSubFilter || (test.subjects && test.subjects.includes(fullSubjectSubFilter));
          if (!matchSubj) return false;
        }
        return true;
      }

      // 3. Full Syllabus Page Filter
      if (pageView === 'full_syllabus') {
        return cat === 'full_syllabus';
      }

      // 4. Purchased Tests Page Filter
      if (pageView === 'purchased') {
        return hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
      }

      return true;
    });
  }, [publishedTests, pageView, chapterSubject, selectedChapter, fullSubjectSubFilter, priceFilter, searchQuery, effectiveUser]);

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 px-2 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ============================================================== */}
        {/* VIEW 1: MAIN TEST CATEGORIES PORTAL PAGE (When pageView === 'portal') */}
        {/* Shows ONLY the 3 Category Cards & Quick Access Portal. */}
        {/* DOES NOT show the tests on the bottom of these types! */}
        {/* ============================================================== */}
        {pageView === 'portal' && (
          <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-200">
            {/* Top Portal Hero */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-wider mb-2 border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>NTA NEET CBT Official Engine • 2025-2026</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-tight">
                  NEET Mock Tests Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide mt-1 max-w-2xl">
                  Choose a mock test category below to open its dedicated testing environment with official NTA timer, marking scheme, and All India Rank analytics.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +4 / -1 Marking
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Real CBT Timer
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5 text-purple-600" /> All India Rank
                </span>
              </div>
            </div>

            {/* THE THREE MAIN MOCK TEST TYPES (CARDS THAT OPEN NEW PAGES) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                    Select Test Type
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any test type to open its dedicated page and view all tests
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {publishedTests.length} Total Tests Live
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">

                {/* 1️⃣ CHAPTER WISE TESTS PORTAL CARD */}
                <div
                  onClick={() => navigateToPage('chapter_wise')}
                  className="group relative overflow-hidden rounded-2xl p-4 sm:p-4.5 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 hover:to-orange-100/60 border-2 border-orange-200/90 hover:border-orange-500 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 shadow-2xs">
                          {counts.chapterWise} Tests
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-snug group-hover:text-orange-600 transition-colors">
                          Chapter Wise Tests
                        </h3>
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                          From ₹{pricingPackages.chapterWiseBiologyPrice}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        Deep-dive topic by topic. Master individual chapters in Physics, Chemistry, and Biology.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-600 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">⚛️ Physics (₹{pricingPackages.chapterWisePhysicsPrice})</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">🧪 Chem (₹{pricingPackages.chapterWiseChemistryPrice})</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">🧬 Bio (₹{pricingPackages.chapterWiseBiologyPrice})</span>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-orange-100/90 flex items-center justify-between text-xs font-black">
                    <span className="text-orange-700 text-[11px]">Explore Chapters &amp; Tests</span>
                    <span className="inline-flex items-center gap-1 text-orange-600 group-hover:translate-x-1 transition-transform text-xs">
                      <span>Open Page</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 2️⃣ FULL SUBJECT TESTS PORTAL CARD */}
                <div
                  onClick={() => navigateToPage('full_subject')}
                  className="group relative overflow-hidden rounded-2xl p-4 sm:p-4.5 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 hover:to-emerald-100/60 border-2 border-emerald-200/90 hover:border-emerald-500 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                          {counts.fullSubject} Tests
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-snug group-hover:text-emerald-600 transition-colors">
                          Full Subject Tests
                        </h3>
                        <span className="text-[10px] font-black text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md shrink-0">
                          Pass ₹{pricingPackages.fullSubjectAll3Price}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        Complete syllabus tests per subject. 100% of Physics, 100% of Chemistry, or 100% of Biology.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-600 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">180 Marks / Subject</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">45 Qs Standard</span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">All 3 Subjects</span>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-emerald-100/90 flex items-center justify-between text-xs font-black">
                    <span className="text-emerald-700 text-[11px]">Explore Full Subjects</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 group-hover:translate-x-1 transition-transform text-xs">
                      <span>Open Page</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* 3️⃣ FULL SYLLABUS TESTS PORTAL CARD */}
                <div
                  onClick={() => navigateToPage('full_syllabus')}
                  className="group relative overflow-hidden rounded-2xl p-4 sm:p-4.5 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 hover:to-blue-100/60 border-2 border-blue-200/90 hover:border-blue-500 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                          {counts.fullSyllabus} Tests
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif] leading-snug group-hover:text-blue-600 transition-colors">
                          Full Syllabus Tests
                        </h3>
                        <span className="text-[10px] font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0">
                          Pass ₹{pricingPackages.fullSyllabusAllPrice}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        The ultimate NEET simulation. Comprehensive 720-marks Grand Tests featuring PCB with All India Rank.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-slate-600 pt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">720 Marks NEET</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">PCB Combined</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">AIR Ranking</span>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-blue-100/90 flex items-center justify-between text-xs font-black">
                    <span className="text-blue-700 text-[11px]">Explore Grand Mocks</span>
                    <span className="inline-flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform text-xs">
                      <span>Open Page</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Access Utility Cards: Purchased Tests & Attempt History */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div
                onClick={() => navigateToPage('purchased')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition">
                      My Purchased Tests
                    </h4>
                    <p className="text-xs text-slate-500">
                      Access all your unlocked premium mock test papers
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-blue-600 shrink-0">
                  <span>View ({userPurchases.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div
                onClick={() => navigateToPage('history')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-slate-400 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-purple-600 transition">
                      CBT Attempts &amp; Results
                    </h4>
                    <p className="text-xs text-slate-500">
                      Check your scores, accuracy, and reattempt tests
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-purple-600 shrink-0">
                  <span>History ({userAttempts.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Educational Info Card */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-bold border border-emerald-400/30">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Real NTA Test Simulation</span>
                </div>
                <h3 className="text-base sm:text-lg font-black font-['Outfit',sans-serif]">
                  How to prepare systematically for NEET?
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Start with <strong>Chapter Wise Tests</strong> to master individual textbook topics. Next, evaluate full subjects with <strong>Full Subject Tests</strong>. Finally, build speed and exam stamina with <strong>Full Syllabus NEET Grand Mocks</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateToPage('chapter_wise')}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 active:scale-98 text-xs font-black rounded-xl transition cursor-pointer shrink-0 shadow-sm"
              >
                Start Chapter 1 Test →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: DEDICATED TEST PAGE (When pageView !== 'portal') */}
        {/* Opens a dedicated clean page with breadcrumbs and test cards! */}
        {/* ============================================================== */}
        {pageView !== 'portal' && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">

            {/* Dedicated Top Breadcrumb Navigation */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateToPage('portal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Categories</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                  {pageView === 'chapter_wise' && 'Chapter Wise Tests'}
                  {pageView === 'full_subject' && 'Full Subject Tests'}
                  {pageView === 'full_syllabus' && 'Full Syllabus Grand Tests'}
                  {pageView === 'purchased' && 'My Purchased Tests'}
                  {pageView === 'history' && 'My Attempt History'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
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
                  {priceFilter === 'all' ? 'All Prices' : priceFilter === 'free' ? '⚡ Free Tests' : '🔒 Premium'}
                </button>

                {pageView !== 'history' && (
                  <button
                    type="button"
                    onClick={() => navigateToPage('history')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>My History ({userAttempts.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dedicated Hero Header Banner for this category */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              pageView === 'chapter_wise'
                ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-white border-orange-200'
                : pageView === 'full_subject'
                ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-white border-emerald-200'
                : pageView === 'full_syllabus'
                ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-white border-blue-200'
                : pageView === 'purchased'
                ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-white border-indigo-200'
                : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700'
            }`}>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider mb-1 bg-white/80 border border-slate-200/80 shadow-2xs">
                  {pageView === 'chapter_wise' && <BookOpen className="w-3 h-3 text-orange-600" />}
                  {pageView === 'full_subject' && <FlaskConical className="w-3 h-3 text-emerald-600" />}
                  {pageView === 'full_syllabus' && <Trophy className="w-3 h-3 text-blue-600" />}
                  {pageView === 'purchased' && <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                  {pageView === 'history' && <History className="w-3 h-3 text-purple-400" />}
                  <span>
                    {pageView === 'chapter_wise' && 'Chapter Level Mastery'}
                    {pageView === 'full_subject' && '100% Complete Subject Evaluation'}
                    {pageView === 'full_syllabus' && '720 Marks Full PCB Grand Test'}
                    {pageView === 'purchased' && 'Your Active Subscriptions'}
                    {pageView === 'history' && 'Past Performance & Solutions'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                  {pageView === 'chapter_wise' && 'Chapter Wise Mock Tests'}
                  {pageView === 'full_subject' && 'Full Subject Mock Tests'}
                  {pageView === 'full_syllabus' && 'Full Syllabus Grand Mock Tests'}
                  {pageView === 'purchased' && 'My Purchased Mock Tests'}
                  {pageView === 'history' && 'Your Mock Test Attempts'}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                  {pageView === 'chapter_wise' && 'Practice high-yield questions chapter by chapter across Physics, Chemistry, and Biology.'}
                  {pageView === 'full_subject' && 'Test your readiness across complete subjects under official NTA exam time limits.'}
                  {pageView === 'full_syllabus' && 'Complete 720-marks NEET PCB tests with section A & B questions and live All India Rank.'}
                  {pageView === 'purchased' && 'Access all the tests you have purchased or unlocked.'}
                  {pageView === 'history' && 'Review your past test scores, accuracy, and answer explanations.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white shadow-2xs border border-slate-200 text-slate-800">
                  {pageView === 'history' ? `${userAttempts.length} Attempts` : `${displayedTests.length} Tests Available`}
                </span>
              </div>
            </div>

            {/* Filter and Sub-Navigation Box */}
            {pageView !== 'history' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search test by title, chapter name, or code..."
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>

                {/* Sub-Selector for Chapter Wise Tests */}
                {pageView === 'chapter_wise' && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
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

                    {/* Chapters list dynamically derived from admin uploads */}
                    {availableChapters.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
                        <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Chapters:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedChapter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
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
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
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

                {/* Sub-Selector for Full Subject Tests */}
                {pageView === 'full_subject' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Filter By Subject:</span>
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
            )}

            {/* Dynamic Subject Package Pass Banners for Dedicated Pages */}
            {pageView === 'chapter_wise' && (() => {
              const isSubjectUnlocked = hasUserPurchasedPackage(effectiveUser?.uid, effectiveUser?.email, `package:chapter_wise:${chapterSubject}`);
              const price = chapterSubject === 'Biology' 
                ? pricingPackages.chapterWiseBiologyPrice 
                : chapterSubject === 'Chemistry' 
                ? pricingPackages.chapterWiseChemistryPrice 
                : pricingPackages.chapterWisePhysicsPrice;
              const origPrice = chapterSubject === 'Biology'
                ? (pricingPackages.chapterWiseBiologyOriginalPrice || 399)
                : chapterSubject === 'Chemistry'
                ? (pricingPackages.chapterWiseChemistryOriginalPrice || 399)
                : (pricingPackages.chapterWisePhysicsOriginalPrice || 399);

              return (
                <div className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                  isSubjectUnlocked
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : chapterSubject === 'Biology'
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border-emerald-200'
                    : chapterSubject === 'Chemistry'
                    ? 'bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border-amber-200'
                    : 'bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white border-blue-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      isSubjectUnlocked
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : chapterSubject === 'Biology'
                        ? 'bg-emerald-500 text-white'
                        : chapterSubject === 'Chemistry'
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {isSubjectUnlocked ? <CheckCircle2 className="w-5 h-5" /> : chapterSubject === 'Biology' ? '🧬' : chapterSubject === 'Chemistry' ? '🧪' : '⚛️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                          {chapterSubject} Chapter Wise Tests Pass
                        </h4>
                        {isSubjectUnlocked ? (
                          <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                            Active / Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                            Subject Pass
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {isSubjectUnlocked
                          ? `You have full access to all ${chapterSubject} chapter-wise mock tests. Enjoy unlimited NTA CBT attempts!`
                          : `Unlock all ${chapterSubject} chapter tests at once with NTA timer, answers & detailed explanations.`}
                      </p>
                    </div>
                  </div>

                  {!isSubjectUnlocked && (
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 line-through block">₹{origPrice}</span>
                        <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">₹{price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBuyPackage(`package:chapter_wise:${chapterSubject}`, `NEET 2026 ${chapterSubject} Chapter Wise Tests Pass`, price, origPrice)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                          chapterSubject === 'Biology'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : chapterSubject === 'Chemistry'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock {chapterSubject} Pass</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {pageView === 'full_subject' && (() => {
              const isAllSubjectsUnlocked = hasUserPurchasedPackage(effectiveUser?.uid, effectiveUser?.email, 'package:full_subject');
              const price = pricingPackages.fullSubjectAll3Price;
              const origPrice = pricingPackages.fullSubjectAll3OriginalPrice || 599;

              return (
                <div className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                  isAllSubjectsUnlocked
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-gradient-to-r from-teal-50 via-emerald-50/40 to-white border-teal-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {isAllSubjectsUnlocked ? <CheckCircle2 className="w-5 h-5" /> : '🧪'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                          All 3 Full Subjects Pass (Physics + Chemistry + Biology)
                        </h4>
                        {isAllSubjectsUnlocked ? (
                          <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                            Active / Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md">
                            All 3 Bundle
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {isAllSubjectsUnlocked
                          ? 'You have unlocked all 3 Full Subject Tests. Enjoy official 180-marks NTA tests.'
                          : 'Unlock all 180-marks full subject tests across Physics, Chemistry, and Biology in one pass.'}
                      </p>
                    </div>
                  </div>

                  {!isAllSubjectsUnlocked && (
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 line-through block">₹{origPrice}</span>
                        <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">₹{price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBuyPackage('package:full_subject', 'NEET 2026 All 3 Full Subjects Tests Pass (PCB)', price, origPrice)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock All 3 Subjects (₹{price})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {pageView === 'full_syllabus' && (() => {
              const isGrandUnlocked = hasUserPurchasedPackage(effectiveUser?.uid, effectiveUser?.email, 'package:full_syllabus');
              const price = pricingPackages.fullSyllabusAllPrice;
              const origPrice = pricingPackages.fullSyllabusAllOriginalPrice || 799;

              return (
                <div className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                  isGrandUnlocked
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-gradient-to-r from-indigo-50 via-purple-50/40 to-white border-indigo-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {isGrandUnlocked ? <CheckCircle2 className="w-5 h-5" /> : '🏆'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                          Full Syllabus NEET Grand Test Series Pass
                        </h4>
                        {isGrandUnlocked ? (
                          <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                            Active / Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                            Grand Pass
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {isGrandUnlocked
                          ? 'You have unlocked all 720-marks Grand Mock Tests. Compete for All India Rank!'
                          : 'Unlock all 720-marks full PCB grand tests with live AIR leaderboards and solutions.'}
                      </p>
                    </div>
                  </div>

                  {!isGrandUnlocked && (
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 line-through block">₹{origPrice}</span>
                        <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">₹{price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBuyPackage('package:full_syllabus', 'NEET 2026 Full Syllabus Grand Mock Test Series Pass', price, origPrice)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Grand Pass (₹{price})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ATTEMPT HISTORY SECTION */}
            {pageView === 'history' && (
              <div className="space-y-4">
                {userAttempts.length === 0 ? (
                  <div className="text-center py-14 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                    <History className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">No Mock Tests Attempted Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Take your first NEET official CBT simulator test to see your detailed performance analysis, All India Rank, and solutions.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateToPage('chapter_wise')}
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

            {/* TESTS GRID (For Chapter Wise, Full Subject, Full Syllabus, Purchased) */}
            {pageView !== 'history' && (
              <div className="space-y-3">
                {displayedTests.length === 0 ? (
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      {pageView === 'chapter_wise'
                        ? `No chapter tests published for ${chapterSubject} ${selectedChapter !== 'all' ? `(${selectedChapter})` : ''} yet`
                        : pageView === 'full_subject'
                        ? `No full subject tests published yet`
                        : pageView === 'full_syllabus'
                        ? `No full syllabus tests published yet`
                        : `No purchased tests found`}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      {pageView === 'chapter_wise'
                        ? `The admin has not uploaded tests for this chapter yet. Once published by the admin, they will automatically synchronize to Firebase and appear here.`
                        : `Tests will appear here once published by the admin.`}
                    </p>
                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateToPage('portal')}
                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        ← Back to Test Categories
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {displayedTests.map((test) => {
                      const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
                      const isCompleted = userAttempts.some(a => a.testId === test.id);
                      const testCat = getTestCategory(test);

                      const cardTheme = testCat === 'chapter_wise'
                        ? {
                            border: 'hover:border-orange-400',
                            badge: 'bg-orange-50 text-orange-700 border-orange-200'
                          }
                        : testCat === 'full_subject'
                        ? {
                            border: 'hover:border-emerald-400',
                            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }
                        : {
                            border: 'hover:border-blue-400',
                            badge: 'bg-blue-50 text-blue-700 border-blue-200'
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

                {/* Back to Categories Footer Link */}
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigateToPage('portal')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black rounded-2xl shadow-2xs transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to All Test Categories Portal</span>
                  </button>
                </div>
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

      {/* Bilingual CBT Language Selection Modal */}
      {languageSelectModalTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  🌐
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                    Select Test Medium
                  </h3>
                  <p className="text-xs text-slate-500">Official NTA Bilingual CBT Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLanguageSelectModalTest(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">{languageSelectModalTest.title}</strong> is prepared in both English and Hindi. Select your primary language to enter the CBT exam room:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const t = languageSelectModalTest;
                  setLanguageSelectModalTest(null);
                  onStartTest(t, 'en');
                }}
                className="w-full p-3.5 rounded-2xl border-2 border-blue-500 bg-blue-50/60 hover:bg-blue-100 text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">Medium 01</span>
                  <span className="text-sm font-black text-slate-900">English Medium</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">NTA NEET standard English text &amp; diagrams</p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 shrink-0 shadow-xs">
                  <Play className="w-3 h-3 fill-white" />
                  <span>Start (EN)</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const t = languageSelectModalTest;
                  setLanguageSelectModalTest(null);
                  onStartTest(t, 'hi');
                }}
                className="w-full p-3.5 rounded-2xl border-2 border-emerald-400 bg-emerald-50/60 hover:bg-emerald-100 text-left transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">Medium 02</span>
                  <span className="text-sm font-black text-slate-900">हिंदी माध्यम (Hindi Medium)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">शुद्ध देवनागरी हिंदी अनुवाद सहित प्रश्न पत्र</p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shrink-0 shadow-xs">
                  <Play className="w-3 h-3 fill-white" />
                  <span>शुरू करें (HI)</span>
                </span>
              </button>
            </div>

            <div className="pt-2 text-center border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                Tip: You can switch between English and Hindi anytime during the test in the top exam bar.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
