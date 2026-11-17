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
  Award,
  RefreshCw,
  Gift,
  Flame,
  UserCheck
} from 'lucide-react';
import { 
  MockTest, 
  MockTestAttempt, 
  MockSubject, 
  UserProfile,
  MockTestPackagePricing,
  TestCategory,
  TestCategoryThemePreset
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
  hasUserPurchasedPackage,
  getCombinedMockTestLeaderboard,
  syncAllMockTestsFromSources
} from '../lib/mockTestData';
import {
  DEFAULT_TEST_CATEGORIES,
  fetchTestCategoriesFromServer,
  filterTestsForCategoryDeduped,
  getStoredTestCategories,
  normalizeTestCategories,
  resolveTestCategoryIds
} from '../lib/testCategoriesData';
import { getCurrentUser } from '../lib/storage';
import { MockTestLeaderboardModal } from './MockTestLeaderboardModal';
import { MockTestDetailModal } from './MockTestDetailModal';
import { MockTestShareModal } from './MockTestShareModal';

export type MockTestPageView = 
  | 'portal' 
  | 'chapter_wise' 
  | 'full_subject' 
  | 'full_syllabus' 
  | 'purchased' 
  | 'history' 
  | 'free_sample' 
  | 'leaderboard'
  | (string & {});

interface ThemeStyleConfig {
  borderHover: string;
  badgeBg: string;
  softTag: string;
  accentText: string;
  heroGradient: string;
  pillBg: string;
  gradientBar: string;
}

const THEME_STYLE_MAP: Record<TestCategoryThemePreset | 'default', ThemeStyleConfig> = {
  blue: {
    borderHover: 'border-blue-200/90 hover:border-blue-500',
    badgeBg: 'bg-blue-600/90 border-blue-400/40 text-white',
    softTag: 'bg-blue-50 text-blue-700 border-blue-200',
    accentText: 'text-blue-600',
    heroGradient: 'bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-white border-blue-200',
    pillBg: 'bg-blue-50 text-blue-700 border-blue-200',
    gradientBar: 'from-blue-600 via-sky-600 to-indigo-700'
  },
  purple: {
    borderHover: 'border-purple-200/90 hover:border-purple-500',
    badgeBg: 'bg-purple-600/90 border-purple-400/40 text-white',
    softTag: 'bg-purple-50 text-purple-700 border-purple-200',
    accentText: 'text-purple-700',
    heroGradient: 'bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-white border-purple-200',
    pillBg: 'bg-purple-50 text-purple-700 border-purple-200',
    gradientBar: 'from-purple-600 via-fuchsia-600 to-indigo-700'
  },
  amber: {
    borderHover: 'border-amber-200/90 hover:border-amber-500',
    badgeBg: 'bg-amber-500/95 border-amber-300/40 text-white',
    softTag: 'bg-amber-50 text-amber-800 border-amber-200',
    accentText: 'text-amber-700',
    heroGradient: 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-white border-amber-200',
    pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
    gradientBar: 'from-amber-500 via-orange-500 to-rose-600'
  },
  emerald: {
    borderHover: 'border-emerald-200/90 hover:border-emerald-500',
    badgeBg: 'bg-emerald-600/90 border-emerald-400/40 text-white',
    softTag: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentText: 'text-emerald-700',
    heroGradient: 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-white border-emerald-200',
    pillBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    gradientBar: 'from-emerald-500 via-teal-600 to-cyan-700'
  },
  violet: {
    borderHover: 'border-violet-200/90 hover:border-violet-500',
    badgeBg: 'bg-violet-600/90 border-violet-400/40 text-white',
    softTag: 'bg-violet-50 text-violet-800 border-violet-200',
    accentText: 'text-violet-700',
    heroGradient: 'bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-white border-violet-200',
    pillBg: 'bg-violet-50 text-violet-700 border-violet-200',
    gradientBar: 'from-violet-600 via-purple-600 to-indigo-700'
  },
  indigo: {
    borderHover: 'border-indigo-200/90 hover:border-indigo-500',
    badgeBg: 'bg-indigo-600/90 border-indigo-400/40 text-white',
    softTag: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    accentText: 'text-indigo-700',
    heroGradient: 'bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-white border-indigo-200',
    pillBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gradientBar: 'from-indigo-600 via-blue-700 to-slate-900'
  },
  rose: {
    borderHover: 'border-rose-200/90 hover:border-rose-500',
    badgeBg: 'bg-rose-600/90 border-rose-400/40 text-white',
    softTag: 'bg-rose-50 text-rose-800 border-rose-200',
    accentText: 'text-rose-700',
    heroGradient: 'bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-white border-rose-200',
    pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
    gradientBar: 'from-rose-500 via-pink-600 to-red-700'
  },
  cyan: {
    borderHover: 'border-cyan-200/90 hover:border-cyan-500',
    badgeBg: 'bg-cyan-600/90 border-cyan-400/40 text-white',
    softTag: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    accentText: 'text-cyan-700',
    heroGradient: 'bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-white border-cyan-200',
    pillBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    gradientBar: 'from-cyan-500 via-sky-600 to-blue-700'
  },
  teal: {
    borderHover: 'border-teal-200/90 hover:border-teal-500',
    badgeBg: 'bg-teal-600/90 border-teal-400/40 text-white',
    softTag: 'bg-teal-50 text-teal-800 border-teal-200',
    accentText: 'text-teal-700',
    heroGradient: 'bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-white border-teal-200',
    pillBg: 'bg-teal-50 text-teal-700 border-teal-200',
    gradientBar: 'from-teal-500 via-emerald-600 to-slate-800'
  },
  slate: {
    borderHover: 'border-slate-300 hover:border-slate-700',
    badgeBg: 'bg-slate-800/95 border-slate-600 text-white',
    softTag: 'bg-slate-100 text-slate-800 border-slate-200',
    accentText: 'text-slate-800',
    heroGradient: 'bg-gradient-to-r from-slate-200/50 via-slate-100 to-white border-slate-300',
    pillBg: 'bg-slate-100 text-slate-800 border-slate-200',
    gradientBar: 'from-slate-800 via-slate-900 to-indigo-950'
  },
  default: {
    borderHover: 'border-indigo-200/90 hover:border-indigo-500',
    badgeBg: 'bg-indigo-600/90 border-indigo-400/40 text-white',
    softTag: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    accentText: 'text-indigo-700',
    heroGradient: 'bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-white border-indigo-200',
    pillBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gradientBar: 'from-indigo-600 via-blue-600 to-slate-900'
  }
};

function getThemeStyles(preset?: TestCategoryThemePreset): ThemeStyleConfig {
  return (preset && THEME_STYLE_MAP[preset]) || THEME_STYLE_MAP.default;
}

interface MockTestsListingViewProps {
  userProfile?: UserProfile | null;
  isAdmin?: boolean;
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
  isAdmin = false,
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
  const [categories, setCategories] = useState<TestCategory[]>(() => getStoredTestCategories());
  const [brokenBannerIds, setBrokenBannerIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic multi-page navigation state across default + custom admin categories
  const [pageView, setPageView] = useState<MockTestPageView>(() => {
    if (initialPageView) return initialPageView;
    if (typeof window !== 'undefined') {
      const rawHash = window.location.hash;
      const hash = rawHash.toLowerCase();
      if (hash.startsWith('#cat:')) {
        return decodeURIComponent(rawHash.slice(5));
      }
      if (hash.includes('chapter-wise')) return 'chapter_wise';
      if (hash.includes('full-subject')) return 'full_subject';
      if (hash.includes('full-syllabus') || hash.includes('cbt-mock') || hash.includes('pyq')) return 'full_syllabus';
      if (hash.includes('custom-practice')) return 'chapter_wise';
      if (hash.includes('purchased')) return 'purchased';
      if (hash.includes('history')) return 'history';
      if (hash.includes('leaderboard')) return 'leaderboard';
      if (hash.includes('free-sample') || hash.includes('free-tests')) return 'free_sample';
    }
    return 'portal';
  });

  // Chapter Wise Sub-Navigation: Subject & Chapter
  const [chapterSubject, setChapterSubject] = useState<MockSubject>('Physics');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');

  // Full Subject Sub-Navigation: Physics, Chemistry, Biology, or All
  const [fullSubjectSubFilter, setFullSubjectSubFilter] = useState<'all' | MockSubject>('all');

  // Modern Segmented Filter Controls
  const [homeSubjectFilter, setHomeSubjectFilter] = useState<'all' | 'Physics' | 'Chemistry' | 'Biology'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'moderate' | 'hard'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [homeActiveTab, setHomeActiveTab] = useState<'all' | 'featured' | 'recent' | 'cbt'>('all');

  // Real-Time Cloudflare D1 Leaderboard State
  const [leaderboardCategory, setLeaderboardCategory] = useState<'all' | 'chapter_wise' | 'full_subject' | 'full_syllabus'>('all');
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isD1Connected, setIsD1Connected] = useState(true);

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

  // Fetch live test categories AND published mock tests from authoritative backend sources on mount
  useEffect(() => {
    let mounted = true;
    fetchTestCategoriesFromServer().then(fetched => {
      if (mounted) {
        setCategories(normalizeTestCategories(fetched));
      }
    }).catch(() => {});
    syncAllMockTestsFromSources().then(synced => {
      if (mounted && Array.isArray(synced)) {
        setTests(synced);
      }
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Navigate to dedicated page with hash synchronization for browser Back/Forward buttons
  const navigateToPage = (newPage: MockTestPageView) => {
    setPageView(newPage);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      if (newPage === 'portal') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      } else if (
        newPage === 'chapter_wise' ||
        newPage === 'full_subject' ||
        newPage === 'full_syllabus' ||
        newPage === 'purchased' ||
        newPage === 'history' ||
        newPage === 'free_sample' ||
        newPage === 'leaderboard'
      ) {
        const slug = newPage.replace(/_/g, '-');
        window.history.pushState(null, '', `#${slug}`);
      } else {
        window.history.pushState(null, '', `#cat:${encodeURIComponent(newPage)}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync hash on popstate / hashchange (Browser Back button support)
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
      const hash = rawHash.toLowerCase();
      if (hash.startsWith('#cat:')) {
        setPageView(decodeURIComponent(rawHash.slice(5)));
      } else if (hash.includes('chapter-wise')) setPageView('chapter_wise');
      else if (hash.includes('full-subject')) setPageView('full_subject');
      else if (hash.includes('full-syllabus') || hash.includes('cbt-mock') || hash.includes('pyq')) setPageView('full_syllabus');
      else if (hash.includes('purchased')) setPageView('purchased');
      else if (hash.includes('history')) setPageView('history');
      else if (hash.includes('leaderboard')) setPageView('leaderboard');
      else if (hash.includes('free-sample') || hash.includes('free-tests')) setPageView('free_sample');
      else setPageView('portal');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-open shared test if opened via direct link ?testId=xxx (works for standalone & unlisted direct links)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testId = params.get('testId') || params.get('mockTest');
      if (testId) {
        const found = tests.find(t => t.id === testId);
        if (found) {
          setSharedTestModal(found);
          const ids = resolveTestCategoryIds(found);
          if (ids.length > 0 && !found.isStandalone) {
            setPageView(ids[0]);
          }
        }
      }
    }
  }, [tests]);

  // Reactive listener to updates from storage / Firebase / Admin category manager
  useEffect(() => {
    const handleAttemptsOrPurchasesUpdate = () => {
      setTests(getStoredMockTests());
      setAttemptsUpdateTrigger(prev => prev + 1);
    };
    const handleTestsUpdate = (e?: Event) => {
      const fromServer = Boolean((e as CustomEvent)?.detail?.fromServer);
      if (fromServer) {
        setTests(getStoredMockTests());
      } else {
        syncAllMockTestsFromSources()
          .then(synced => setTests(synced))
          .catch(() => setTests(getStoredMockTests()));
      }
      setAttemptsUpdateTrigger(prev => prev + 1);
    };
    const handleCategoriesUpdate = () => {
      setCategories(getStoredTestCategories());
      fetchTestCategoriesFromServer().then(fetched => {
        setCategories(normalizeTestCategories(fetched));
      }).catch(() => {});
    };
    window.addEventListener('neetmbbs_mock_attempts_updated', handleAttemptsOrPurchasesUpdate);
    window.addEventListener('neetmbbs_mock_tests_updated', handleTestsUpdate);
    window.addEventListener('neetmbbs_mock_purchases_updated', handleAttemptsOrPurchasesUpdate);
    window.addEventListener('neetmbbs_test_categories_updated', handleCategoriesUpdate);
    return () => {
      window.removeEventListener('neetmbbs_mock_attempts_updated', handleAttemptsOrPurchasesUpdate);
      window.removeEventListener('neetmbbs_mock_tests_updated', handleTestsUpdate);
      window.removeEventListener('neetmbbs_mock_purchases_updated', handleAttemptsOrPurchasesUpdate);
      window.removeEventListener('neetmbbs_test_categories_updated', handleCategoriesUpdate);
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

    const isFree = test.isFree || test.price === 0;
    const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);

    // If test is not free and user has not purchased it, redirect to purchase flow
    if (!isAdmin && !isFree && !isPurchased) {
      if (onBuyTest) {
        onBuyTest(test);
      } else {
        setSharedTestModal(test);
      }
      return;
    }

    if (isTestBilingual(test)) {
      setLanguageSelectModalTest(test);
    } else {
      onStartTest(test);
    }
  };

  // Only published & non-draft tests in student view
  const publishedTests = useMemo(() => {
    return tests.filter(t => t.status === 'published' && t.visibility !== 'draft');
  }, [tests]);

  // Publicly listable tests (excludes 'unlisted' tests which are accessible via direct link or Purchased tab)
  const publicTests = useMemo(() => {
    return publishedTests.filter(t => t.visibility !== 'unlisted');
  }, [publishedTests]);

  // Normalized visible categories (ONLY the 3 permanent defaults + admin-created visible custom categories)
  const visibleCategories = useMemo(() => {
    return normalizeTestCategories(categories)
      .filter(c => c.isVisible !== false)
      .sort((a, b) => {
        const oA = typeof a.displayOrder === 'number' ? a.displayOrder : 99;
        const oB = typeof b.displayOrder === 'number' ? b.displayOrder : 99;
        if (oA !== oB) return oA - oB;
        return a.name.localeCompare(b.name);
      });
  }, [categories]);

  // Map category ID -> Category object for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, TestCategory>();
    normalizeTestCategories(categories).forEach(c => {
      map.set(c.id, c);
      if (c.slug) map.set(c.slug, c);
    });
    DEFAULT_TEST_CATEGORIES.forEach(d => {
      if (!map.has(d.id)) map.set(d.id, d);
    });
    return map;
  }, [categories]);

  // Active category object if user opened a category page (default OR custom)
  const activeCategoryObj = useMemo(() => {
    if (
      pageView === 'portal' ||
      pageView === 'purchased' ||
      pageView === 'history' ||
      pageView === 'free_sample' ||
      pageView === 'leaderboard'
    ) {
      return null;
    }
    return categoryMap.get(pageView) || null;
  }, [pageView, categoryMap]);

  // True, deduplicated live counts per category (ZERO artificial Math.max inflation)
  const categoryCounts = useMemo(() => {
    const countsById: Record<string, number> = {};
    visibleCategories.forEach(cat => {
      countsById[cat.id] = filterTestsForCategoryDeduped(publicTests, cat.id, { includeUnlisted: false }).length;
    });
    return countsById;
  }, [publicTests, visibleCategories]);

  // Dynamically derive chapters for currently chosen chapter subject (Strictly non-hardcoded)
  const availableChapters = useMemo(() => {
    const chapterTests = filterTestsForCategoryDeduped(publicTests, 'chapter_wise', { includeUnlisted: false });
    return getAvailableChaptersForSubject(chapterTests, chapterSubject);
  }, [publicTests, chapterSubject]);

  // Reset chapter selection if subject changes and previous chapter is not in list
  useEffect(() => {
    if (selectedChapter !== 'all' && !availableChapters.includes(selectedChapter)) {
      setSelectedChapter('all');
    }
  }, [chapterSubject, availableChapters, selectedChapter]);

  // Filtered Tests for the Active Dedicated Page or Homepage (always deduplicated)
  const displayedTests = useMemo(() => {
    let baseList: MockTest[];

    if (pageView === 'purchased') {
      baseList = publishedTests.filter(t => hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, t.id));
    } else if (pageView === 'free_sample') {
      baseList = publicTests.filter(t => t.isFree || t.price === 0);
    } else if (activeCategoryObj) {
      baseList = filterTestsForCategoryDeduped(publicTests, activeCategoryObj.id, { includeUnlisted: false });
    } else {
      baseList = publicTests;
    }

    const seenIds = new Set<string>();
    return baseList.filter(test => {
      if (!test || !test.id || seenIds.has(test.id)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = test.title.toLowerCase().includes(q);
        const matchesNumber = (test.testNumber || '').toLowerCase().includes(q);
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

      // Global Subject Filter
      if (homeSubjectFilter !== 'all') {
        const matchesSubj = test.subject === homeSubjectFilter || (test.subjects && test.subjects.includes(homeSubjectFilter));
        if (!matchesSubj) return false;
      }

      // Difficulty Filter
      if (difficultyFilter !== 'all') {
        const diff = (test.difficulty || 'moderate').toLowerCase();
        if (diff !== difficultyFilter && !(difficultyFilter === 'moderate' && diff === 'medium')) {
          return false;
        }
      }

      // Chapter Wise Sub-Filters
      if (pageView === 'chapter_wise') {
        const matchSubj = test.subject === chapterSubject || (test.subjects && test.subjects.includes(chapterSubject));
        if (!matchSubj) return false;
        if (selectedChapter !== 'all') {
          if (!test.chapter || test.chapter.trim().toLowerCase() !== selectedChapter.trim().toLowerCase()) {
            return false;
          }
        }
      }

      // Full Subject Sub-Filter
      if (pageView === 'full_subject' && fullSubjectSubFilter !== 'all') {
        const matchSubj = test.subject === fullSubjectSubFilter || (test.subjects && test.subjects.includes(fullSubjectSubFilter));
        if (!matchSubj) return false;
      }

      // Portal active tab
      if (pageView === 'portal') {
        if (homeActiveTab === 'featured') {
          if (!(test.isFree || test.price === 0 || /08|gold|major/i.test(test.testNumber || test.title))) {
            return false;
          }
        } else if (homeActiveTab === 'cbt') {
          const ids = resolveTestCategoryIds(test);
          if (!ids.includes('full_syllabus')) return false;
        }
      }

      seenIds.add(test.id);
      return true;
    });
  }, [
    publishedTests,
    publicTests,
    activeCategoryObj,
    pageView,
    chapterSubject,
    selectedChapter,
    fullSubjectSubFilter,
    priceFilter,
    homeSubjectFilter,
    difficultyFilter,
    homeActiveTab,
    searchQuery,
    effectiveUser
  ]);

  // Free sample test count (accurate live total)
  const freeCounts = useMemo(() => {
    let totalFree = 0;
    publicTests.forEach(t => {
      if (t.isFree || t.price === 0) totalFree++;
    });
    return { totalFree };
  }, [publicTests]);

  // Fetch real-time Cloudflare D1 leaderboard
  const fetchRealTimeLeaderboard = async (cat: string = leaderboardCategory) => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?category=${cat}&limit=50`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.entries) && data.entries.length > 0) {
        setLeaderboardEntries(data.entries);
        setIsD1Connected(data.source === 'cloudflare_d1');
      } else {
        const local = getCombinedMockTestLeaderboard({ timePeriod: 'all' });
        setLeaderboardEntries(local.map((item, idx) => ({
          rank: idx + 1,
          id: `local_${idx}`,
          userId: item.userId,
          userName: item.userName,
          photoURL: item.photoURL,
          avatarUrl: item.avatarUrl,
          score: item.bestScore,
          maxMarks: 720,
          accuracy: item.accuracy,
          timeSpentSeconds: 0,
          testTitle: `${item.testsAttempted} Tests Taken`,
          testTypeCategory: cat,
          submittedAt: item.lastAttemptDate
        })));
        setIsD1Connected(true);
      }
    } catch {
      const local = getCombinedMockTestLeaderboard({ timePeriod: 'all' });
      setLeaderboardEntries(local.map((item, idx) => ({
        rank: idx + 1,
        id: `local_${idx}`,
        userId: item.userId,
        userName: item.userName,
        photoURL: item.photoURL,
        avatarUrl: item.avatarUrl,
        score: item.bestScore,
        maxMarks: 720,
        accuracy: item.accuracy,
        timeSpentSeconds: 0,
        testTitle: `${item.testsAttempted} Tests Taken`,
        testTypeCategory: cat,
        submittedAt: item.lastAttemptDate
      })));
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (pageView === 'leaderboard') {
      fetchRealTimeLeaderboard(leaderboardCategory);
    }
  }, [pageView, leaderboardCategory, attemptsUpdateTrigger]);

  const renderLeaderboardUserAvatar = (entry: any, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const dim = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    if (entry.photoURL) {
      return (
        <img
          src={entry.photoURL}
          alt={entry.userName || 'Aspirant'}
          className={`${dim} rounded-full object-cover border-2 border-amber-300 shrink-0 shadow-2xs`}
          referrerPolicy="no-referrer"
        />
      );
    }
    if (entry.avatarUrl) {
      return (
        <span className={`${dim} ${size === 'lg' ? 'text-2xl' : 'text-base'} rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0`}>
          {entry.avatarUrl}
        </span>
      );
    }
    const initial = (entry.userName || 'A').charAt(0).toUpperCase();
    return (
      <div className={`${dim} ${size === 'lg' ? 'text-base' : 'text-xs'} rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white font-black flex items-center justify-center shrink-0 shadow-2xs`}>
        {initial}
      </div>
    );
  };

  // Unified Test Card Renderer
  const renderTestCard = (test: MockTest, isSampleFreeSection?: boolean) => {
    const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
    const isCompleted = userAttempts.some(a => a.testId === test.id);
    const resolvedIds = resolveTestCategoryIds(test);
    const primaryCatId = resolvedIds[0] || getTestCategory(test);
    const primaryCatObj = categoryMap.get(primaryCatId);
    const isFree = test.isFree || test.price === 0;

    const theme = getThemeStyles(primaryCatObj?.themePreset);
    const cardTheme = {
      border: theme.borderHover.split(' ').find(c => c.startsWith('hover:')) || 'hover:border-blue-500',
      badge: theme.softTag
    };

    const categoryBadgeLabel = test.isStandalone && resolvedIds.length === 0
      ? 'Standalone Test'
      : primaryCatId === 'chapter_wise'
      ? (test.subject || 'Chapter Test')
      : primaryCatId === 'full_subject'
      ? (test.subject ? `${test.subject} Full` : 'Full Subject')
      : primaryCatId === 'full_syllabus'
      ? 'Full PCB (720M)'
      : (primaryCatObj?.name || 'Special Series');

    const difficulty = (test.difficulty || 'Moderate').toLowerCase();
    const diffColor = difficulty === 'easy' 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
      : difficulty === 'hard'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : 'text-amber-700 bg-amber-50 border-amber-200';

    return (
      <div
        key={test.id}
        className={`bg-white rounded-2xl border ${isFree ? 'border-emerald-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-md' : 'border-slate-200/90 shadow-2xs hover:shadow-md'} transition-all overflow-hidden flex flex-col justify-between ${cardTheme.border} group min-w-0`}
      >
        {/* Top Compact Content Area */}
        <div className="p-3 sm:p-3.5 space-y-2">
          {/* Header Badges (Max 2 concise badges left + access pill right) */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="text-[10px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-['Outfit',sans-serif] shrink-0">
                {test.testNumber || 'NEET'}
              </span>
              <span className={`text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-md border ${cardTheme.badge} truncate`}>
                {categoryBadgeLabel}
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
              ) : isFree ? (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Free
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5 text-amber-500" /> ₹{test.price}
                </span>
              )}
            </div>
          </div>

          {/* Title & Single-line Chapter if present */}
          <div className="space-y-0.5">
            {test.chapter && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 truncate">
                <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">{test.chapter}</span>
              </div>
            )}
            <h3 
              onClick={() => setSharedTestModal(test)}
              className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] leading-snug line-clamp-2 group-hover:text-blue-600 transition cursor-pointer"
              title="Click to view test syllabus & details"
            >
              {test.title}
            </h3>
          </div>

          {/* Compact 1-line Description */}
          <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">
            {test.description || test.shortDescription || (isFree ? 'Free NTA CBT mock test with step-by-step solutions.' : 'NEET pattern questions with detailed explanations.')}
          </p>

          {/* Compact Scannable Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[11px] text-slate-500 font-medium tabular-nums">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-blue-600" />
              {(() => {
                const storedCount = getStoredMockQuestions(test.id).length;
                const total = storedCount > 0 ? storedCount : test.totalQuestions;
                return `${total} Qs`;
              })()}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {test.durationMinutes}m
            </span>
            <span>·</span>
            <span className="font-bold text-slate-700">
              {test.maxMarks || 720}M
            </span>
            <span>·</span>
            <span className={`text-[10px] font-bold capitalize px-1.5 py-0.2 rounded border ${diffColor}`}>
              {test.difficulty || 'Moderate'}
            </span>
          </div>
        </div>

        {/* Card Action Buttons Toolbar */}
        <div className="px-3 sm:px-3.5 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenLeaderboard ? onOpenLeaderboard(test) : setActiveLeaderboardTest(test)}
              className="min-h-[44px] sm:min-h-[38px] min-w-[44px] sm:min-w-[38px] p-1.5 hover:bg-white text-slate-500 hover:text-amber-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200 flex items-center justify-center"
              title="View Leaderboard & Rankings"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShareModalTest(test)}
              className="min-h-[44px] sm:min-h-[38px] min-w-[44px] sm:min-w-[38px] p-1.5 hover:bg-white text-slate-500 hover:text-blue-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200 flex items-center justify-center"
              title="Share this test"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSharedTestModal(test)}
              className="min-h-[44px] sm:min-h-[38px] text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              Syllabus
            </button>
          </div>

          {/* Primary Start / Unlock Button (>= 44px touch target on mobile) */}
          <div className="shrink-0">
            {isCompleted ? (
              <button
                type="button"
                onClick={() => handleTestStartClick(test)}
                className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-98 whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reattempt</span>
              </button>
            ) : isPurchased ? (
              <button
                type="button"
                onClick={() => handleTestStartClick(test)}
                className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-98 whitespace-nowrap"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Start Test</span>
              </button>
            ) : isFree ? (
              <button
                type="button"
                onClick={() => handleTestStartClick(test)}
                className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Start Free</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onBuyTest ? onBuyTest(test) : setSharedTestModal(test)}
                className="min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 whitespace-nowrap tabular-nums"
              >
                <Lock className="w-3 h-3" />
                <span>Unlock ₹{test.price}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-3 sm:py-6 px-2 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ============================================================== */}
        {/* VIEW 1: MAIN TEST CATEGORIES PORTAL PAGE (When pageView === 'portal') */}
        {/* Shows the Category Cards & Fast Access Portal. */}
        {/* ============================================================== */}
        {pageView === 'portal' && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            {/* Top Fast Access Pill Navigation Bar */}
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => navigateToPage('portal')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>All Categories</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('free_sample')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap tabular-nums"
                >
                  <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Free Sample Tests ({freeCounts.totalFree})</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('leaderboard')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Leaderboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('purchased')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap tabular-nums"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Purchased ({userPurchases.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('history')}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap tabular-nums"
                >
                  <History className="w-3.5 h-3.5 text-purple-600" />
                  <span>History ({userAttempts.length})</span>
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 tabular-nums">
                <span className="text-emerald-700">+4 / -1 Marking</span>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700">Real CBT Timer</span>
              </div>
            </div>

            {/* DYNAMIC TEST CATEGORIES GRID (ONLY 3 PERMANENT DEFAULTS + ADMIN-CREATED VISIBLE CATEGORIES) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif] tracking-tight">
                    Select Test Category
                  </h2>
                  <p className="text-xs text-slate-500">
                    Explore curated test series mapped cleanly to the NTA NEET pattern
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                    {publicTests.length} Total {publicTests.length === 1 ? 'Test' : 'Tests'} Live
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {visibleCategories.map(cat => {
                  const count = categoryCounts[cat.id] ?? 0;
                  const theme = getThemeStyles(cat.themePreset);
                  const hasBanner = Boolean(cat.bannerImageUrl && !brokenBannerIds[cat.id]);

                  const topRightLabel =
                    cat.id === 'chapter_wise'
                      ? `From ₹${pricingPackages.chapterWiseBiologyPrice}`
                      : cat.id === 'full_subject'
                      ? `Pass ₹${pricingPackages.fullSubjectAll3Price}`
                      : cat.badgeText || (cat.isDefault ? '720M Full PCB' : 'Custom Series');

                  const accentPills =
                    cat.id === 'chapter_wise'
                      ? [
                          { label: `⚛️ Physics (₹${pricingPackages.chapterWisePhysicsPrice})`, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                          { label: `🧪 Chem (₹${pricingPackages.chapterWiseChemistryPrice})`, cls: 'bg-sky-50 text-sky-800 border-sky-200' },
                          { label: `🧬 Bio (₹${pricingPackages.chapterWiseBiologyPrice})`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                        ]
                      : (cat.accentTags && cat.accentTags.length > 0 ? cat.accentTags : ['NCERT Mapped', 'NTA CBT Pattern']).map(tag => ({
                          label: tag,
                          cls: theme.softTag
                        }));

                  return (
                    <div
                      key={cat.id}
                      onClick={() => navigateToPage(cat.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigateToPage(cat.id);
                        }
                      }}
                      className={`group relative overflow-hidden rounded-2xl bg-white border-2 ${theme.borderHover} shadow-2xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-w-0`}
                    >
                      <div className={`relative h-24 sm:h-28 overflow-hidden bg-gradient-to-br ${theme.gradientBar}`}>
                        {hasBanner && (
                          <img
                            src={cat.bannerImageUrl}
                            alt={cat.name}
                            onError={() => setBrokenBannerIds(prev => ({ ...prev, [cat.id]: true }))}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/35 to-transparent" />

                        <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs border ${theme.badgeBg}`}>
                            {count === 0 ? '0 Tests' : `${count} ${count === 1 ? 'Test' : 'Tests'}`}
                          </span>
                        </div>

                        {topRightLabel && (
                          <div className="absolute top-2 right-2.5">
                            <span className="text-[10px] font-black text-white bg-slate-900/80 backdrop-blur-xs border border-white/25 px-2 py-0.5 rounded-md shadow-xs">
                              {topRightLabel}
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-2 left-3 right-3">
                          <h3 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif] leading-tight drop-shadow-sm group-hover:text-cyan-200 transition-colors truncate">
                            {cat.name}
                          </h3>
                          <p className="text-[11px] text-slate-200 line-clamp-1">
                            {cat.description || 'Structured NEET mock test series with official NTA CBT timer & analytics.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 sm:p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-600">
                          {accentPills.slice(0, 3).map((pill, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-md border ${pill.cls}`}>
                              {pill.label}
                            </span>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black min-h-[32px]">
                          <span className={`${theme.accentText} text-[11px]`}>
                            {cat.badgeText || (cat.isDefault ? 'Official Series' : 'Custom Category')}
                          </span>
                          <span className={`inline-flex items-center gap-1 ${theme.accentText} group-hover:translate-x-1 transition-transform text-xs`}>
                            <span>{cat.ctaText || 'Open Page'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Categories</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                  {activeCategoryObj
                    ? activeCategoryObj.name
                    : pageView === 'free_sample'
                    ? 'Free Sample Tests'
                    : pageView === 'purchased'
                    ? 'My Purchased Tests'
                    : pageView === 'leaderboard'
                    ? 'All India Rank Leaderboard'
                    : 'My Attempt History'}
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

            {/* Dedicated Hero Header Banner for this category / utility page */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              activeCategoryObj
                ? getThemeStyles(activeCategoryObj.themePreset).heroGradient
                : pageView === 'free_sample'
                ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-white border-emerald-200'
                : pageView === 'purchased'
                ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-white border-indigo-200'
                : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700'
            }`}>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider mb-1 bg-white/80 text-slate-800 border border-slate-200/80 shadow-2xs">
                  {pageView === 'chapter_wise' && <BookOpen className="w-3 h-3 text-blue-600" />}
                  {pageView === 'full_subject' && <FlaskConical className="w-3 h-3 text-purple-600" />}
                  {pageView === 'full_syllabus' && <Trophy className="w-3 h-3 text-amber-600" />}
                  {activeCategoryObj && !activeCategoryObj.isDefault && <Layers className="w-3 h-3 text-indigo-600" />}
                  {pageView === 'free_sample' && <Gift className="w-3 h-3 text-emerald-600" />}
                  {pageView === 'purchased' && <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                  {pageView === 'history' && <History className="w-3 h-3 text-purple-600" />}
                  <span>
                    {activeCategoryObj
                      ? (activeCategoryObj.badgeText || (activeCategoryObj.isDefault ? 'Official Series' : 'Custom Series'))
                      : pageView === 'free_sample'
                      ? 'Zero Cost CBT Practice'
                      : pageView === 'purchased'
                      ? 'Your Active Subscriptions'
                      : 'Past Performance & Solutions'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                  {activeCategoryObj
                    ? activeCategoryObj.name
                    : pageView === 'free_sample'
                    ? 'Free Sample Mock Tests'
                    : pageView === 'purchased'
                    ? 'My Purchased Mock Tests'
                    : 'Your Mock Test Attempts'}
                </h2>

                <p className={`text-xs sm:text-sm leading-relaxed max-w-2xl ${pageView === 'history' ? 'text-slate-300' : 'text-slate-600'}`}>
                  {activeCategoryObj
                    ? activeCategoryObj.description
                    : pageView === 'free_sample'
                    ? 'Attend free sample tests immediately to experience the official NTA CBT exam interface.'
                    : pageView === 'purchased'
                    ? 'Access all the tests you have purchased or unlocked.'
                    : 'Review your past test scores, accuracy, and answer explanations.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white shadow-2xs border border-slate-200 text-slate-800">
                  {pageView === 'history'
                    ? `${userAttempts.length} Attempts`
                    : `${displayedTests.length} ${displayedTests.length === 1 ? 'Test' : 'Tests'} Available`}
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
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Select Subject:
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
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Filter By Subject:
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

            {/* ================= VIEW: REAL-TIME LEADERBOARD ================= */}
            {pageView === 'leaderboard' && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                {/* Leaderboard Header Card */}
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-xs text-yellow-200 text-xs font-black uppercase tracking-wider border border-white/20">
                      <span>Live All India Rank Leaderboard</span>
                      <span className="text-[10px] text-white/80">· Cloudflare D1 Synced</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] tracking-tight">
                      NEET Aspirants All India Rankings
                    </h2>
                    <p className="text-xs sm:text-sm text-amber-100 max-w-xl leading-relaxed">
                      Real-time test rankings computed from authentic completed CBT attempts with verified student profile pictures from Cloudflare storage.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fetchRealTimeLeaderboard(leaderboardCategory)}
                      disabled={loadingLeaderboard}
                      className="px-4 py-2.5 bg-white text-slate-900 hover:bg-amber-50 active:scale-98 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                      <span>{loadingLeaderboard ? 'Updating...' : 'Refresh Live'}</span>
                    </button>
                  </div>
                </div>

                {/* Leaderboard Filter Switcher */}
                <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { key: 'all', label: '🏆 Overall AIR (All Tests)' },
                      { key: 'chapter_wise', label: '1️⃣ Chapter Wise Mocks' },
                      { key: 'full_subject', label: '2️⃣ Full Subject Tests' },
                      { key: 'full_syllabus', label: '3️⃣ Full Syllabus Grand' }
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setLeaderboardCategory(f.key as any);
                          fetchRealTimeLeaderboard(f.key);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                          leaderboardCategory === f.key
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 shrink-0 hidden sm:inline">
                    {leaderboardEntries.length} Ranked Aspirants
                  </span>
                </div>

                {/* Top 3 Podium Cards */}
                {leaderboardEntries.length >= 3 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto pt-2 pb-2">
                    {/* Rank 2 (Silver) */}
                    <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-slate-200 shadow-2xs flex flex-col items-center text-center justify-between">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                          {renderLeaderboardUserAvatar(leaderboardEntries[1], 'md')}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-800 text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                            2
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[100px] sm:max-w-[140px]">
                          {leaderboardEntries[1].userName}
                        </h4>
                        <span className="text-[10px] text-slate-500 truncate max-w-[110px] mt-0.5">
                          {leaderboardEntries[1].testTitle || 'NEET Test'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 w-full">
                        <span className="text-sm sm:text-base font-black text-slate-700 block">
                          {leaderboardEntries[1].score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          {leaderboardEntries[1].accuracy}% acc
                        </span>
                      </div>
                    </div>

                    {/* Rank 1 (Gold - Center & Elevated) */}
                    <div className="bg-gradient-to-b from-amber-100 via-amber-50 to-white rounded-2xl p-3.5 sm:p-5 border-2 border-amber-400 shadow-md flex flex-col items-center text-center justify-between -translate-y-2 relative">
                      <span className="absolute -top-3 text-lg sm:text-xl">👑</span>
                      <div className="flex flex-col items-center mt-1">
                        <div className="relative mb-2">
                          {renderLeaderboardUserAvatar(leaderboardEntries[0], 'lg')}
                          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                            1
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-amber-950 truncate max-w-[110px] sm:max-w-[150px]">
                          {leaderboardEntries[0].userName}
                        </h4>
                        <span className="text-[10px] text-amber-700 font-medium truncate max-w-[120px] mt-0.5">
                          {leaderboardEntries[0].testTitle || 'NEET Test'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-amber-200/60 w-full">
                        <span className="text-base sm:text-xl font-black text-amber-700 block">
                          {leaderboardEntries[0].score} <span className="text-xs text-amber-600/70 font-normal">pts</span>
                        </span>
                        <span className="text-[10.5px] font-bold text-amber-800 block">
                          {leaderboardEntries[0].accuracy}% acc
                        </span>
                      </div>
                    </div>

                    {/* Rank 3 (Bronze) */}
                    <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-amber-200 shadow-2xs flex flex-col items-center text-center justify-between">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                          {renderLeaderboardUserAvatar(leaderboardEntries[2], 'md')}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                            3
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[100px] sm:max-w-[140px]">
                          {leaderboardEntries[2].userName}
                        </h4>
                        <span className="text-[10px] text-slate-500 truncate max-w-[110px] mt-0.5">
                          {leaderboardEntries[2].testTitle || 'NEET Test'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 w-full">
                        <span className="text-sm sm:text-base font-black text-slate-700 block">
                          {leaderboardEntries[2].score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          {leaderboardEntries[2].accuracy}% acc
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Complete Rankings List */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center">Rank</span>
                      <span>Aspirant</span>
                    </div>
                    <div className="flex items-center gap-6 sm:gap-10">
                      <span className="hidden sm:inline">Test Paper</span>
                      <span>Score</span>
                      <span className="hidden sm:inline">Accuracy</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {leaderboardEntries.length === 0 ? (
                      <div className="text-center py-12 p-4 space-y-2">
                        <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                        <h3 className="text-sm font-bold text-slate-700">No attempts logged yet</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Be the first aspirant to complete a mock test and lead the All India Rankings!
                        </p>
                      </div>
                    ) : (
                      leaderboardEntries.map((entry, idx) => {
                        const isSelf = effectiveUser && (
                          (entry.userId && entry.userId.toLowerCase() === (effectiveUser.uid || '').toLowerCase()) ||
                          (entry.userEmail && entry.userEmail.toLowerCase() === (effectiveUser.email || '').toLowerCase())
                        );

                        return (
                          <div
                            key={entry.id || idx}
                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition ${
                              isSelf ? 'bg-amber-50/60 border-l-4 border-amber-500' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                entry.rank === 1 ? 'bg-amber-500 text-white shadow-xs' :
                                entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                                entry.rank === 3 ? 'bg-amber-700 text-white' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                #{entry.rank}
                              </span>

                              <div className="flex items-center gap-2.5 min-w-0">
                                {renderLeaderboardUserAvatar(entry, 'sm')}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                      {entry.userName}
                                    </span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block truncate sm:hidden">
                                    {entry.testTitle || 'NEET Test'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-10 shrink-0 text-right">
                              <span className="hidden sm:inline text-xs text-slate-600 max-w-[140px] truncate font-medium">
                                {entry.testTitle || 'NEET Test'}
                              </span>
                              <div>
                                <span className="text-xs sm:text-sm font-black text-blue-600 font-['Outfit',sans-serif]">
                                  {entry.score} <span className="text-[10px] text-slate-400 font-normal">/ {entry.maxMarks || 720}</span>
                                </span>
                              </div>
                              <span className="hidden sm:inline-block text-xs font-bold text-emerald-600 w-12 text-center">
                                {entry.accuracy}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW: DEDICATED TESTS GRIDS (With Free Tests Section) ================= */}
            {pageView !== 'history' && pageView !== 'leaderboard' && (() => {
              const freeTests = displayedTests.filter(t => t.isFree || t.price === 0);
              const paidTests = displayedTests.filter(t => !t.isFree && t.price > 0);
              const isCategoryView = Boolean(activeCategoryObj);

              return (
                <div className="space-y-6 sm:space-y-8">
                  {/* Empty State */}
                  {displayedTests.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        {pageView === 'chapter_wise'
                          ? `No chapter tests published for ${chapterSubject} ${selectedChapter !== 'all' ? `(${selectedChapter})` : ''} yet`
                          : activeCategoryObj
                          ? `No tests published in ${activeCategoryObj.name} yet`
                          : pageView === 'free_sample'
                          ? `No free sample tests published yet`
                          : `No purchased tests found`}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Tests published to this category by the admin will appear here automatically.
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
                  ) : isCategoryView ? (
                    <>
                      {/* 1️⃣ FREE TESTS SECTION (Sample Tests) */}
                      <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-emerald-300/80 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3.5">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-black uppercase tracking-wider">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Free Tests Section • Sample Tests</span>
                            </div>
                            <h3 className="text-base sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                              Free Sample {activeCategoryObj?.name || 'Mock Tests'} ({freeTests.length})
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                              Attend these free tests immediately without payment to experience the official CBT timer and question pattern.
                            </p>
                          </div>
                          <span className="text-xs font-black text-emerald-900 bg-white border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs self-start sm:self-auto shrink-0">
                            {freeTests.length} Free Sample {freeTests.length === 1 ? 'Test' : 'Tests'}
                          </span>
                        </div>

                        {freeTests.length === 0 ? (
                          <div className="text-center py-6 bg-white/80 rounded-2xl border border-dashed border-emerald-300 p-4">
                            <p className="text-xs font-bold text-slate-700">No free sample tests published in this category yet.</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Admin can publish free sample tests into this category anytime.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
                            {freeTests.map(test => renderTestCard(test, true))}
                          </div>
                        )}
                      </div>

                      {/* 2️⃣ PAID TESTS SECTION (Complete Master Series) */}
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10.5px] font-black uppercase tracking-wider">
                              <Lock className="w-3.5 h-3.5 text-purple-600" />
                              <span>Complete Test Series • Pay to Unlock</span>
                            </div>
                            <h3 className="text-base sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                              Complete {activeCategoryObj?.name || 'Master Series'} ({paidTests.length})
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                              Unlock full access with official NTA CBT timer, verified answer keys, detailed explanations, and All India Rank analytics.
                            </p>
                          </div>
                          <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl self-start sm:self-auto shrink-0">
                            {paidTests.length} Premium {paidTests.length === 1 ? 'Test' : 'Tests'}
                          </span>
                        </div>

                        {paidTests.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                            <p className="text-xs font-bold text-slate-700">No premium tests published in this section yet.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
                            {paidTests.map(test => renderTestCard(test, false))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Default Simple Grid for Purchased or Free Sample View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                      {displayedTests.map(test => renderTestCard(test))}
                    </div>
                  )}

                  {/* Back to Categories Footer Link */}
                  <div className="pt-2 flex justify-center">
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
              );
            })()}

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
