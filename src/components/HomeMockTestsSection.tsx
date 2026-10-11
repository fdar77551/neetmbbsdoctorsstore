import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  HelpCircle, 
  Award, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Play,
  TrendingUp,
  Atom,
  Flame,
  Dna,
  Zap,
  Trophy
} from 'lucide-react';
import { MockTest, UserProfile } from '../types';
import { getStoredMockTests, hasUserPurchasedMockTest } from '../lib/mockTestData';

interface HomeMockTestsSectionProps {
  onExploreMockTests: () => void;
  onSelectTest: (test: MockTest) => void;
  userProfile: UserProfile | null;
}

export const HomeMockTestsSection: React.FC<HomeMockTestsSectionProps> = ({
  onExploreMockTests,
  onSelectTest,
  userProfile
}) => {
  const [tests, setTests] = useState<MockTest[]>([]);

  useEffect(() => {
    const load = () => {
      const all = getStoredMockTests().filter(t => t.status === 'published');
      setTests(all.slice(0, 3));
    };
    load();
    window.addEventListener('neetmbbs_mock_tests_updated', load);
    return () => window.removeEventListener('neetmbbs_mock_tests_updated', load);
  }, []);

  if (tests.length === 0) return null;

  const getSubjectColorTheme = (subject: string, type?: string) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('phys')) {
      return {
        badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
        glow: 'from-violet-500/15 via-indigo-500/10 to-transparent',
        accentText: 'text-violet-600',
        icon: <Atom className="w-3.5 h-3.5 text-violet-600" />
      };
    }
    if (s.includes('chem')) {
      return {
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        glow: 'from-rose-500/15 via-orange-500/10 to-transparent',
        accentText: 'text-rose-600',
        icon: <Flame className="w-3.5 h-3.5 text-rose-600" />
      };
    }
    if (s.includes('bio') || s.includes('bot') || s.includes('zoo')) {
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        glow: 'from-emerald-500/15 via-teal-500/10 to-transparent',
        accentText: 'text-emerald-600',
        icon: <Dna className="w-3.5 h-3.5 text-emerald-600" />
      };
    }
    return {
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      glow: 'from-amber-500/15 via-yellow-500/10 to-transparent',
      accentText: 'text-amber-600',
      icon: <Trophy className="w-3.5 h-3.5 text-amber-600" />
    };
  };

  return (
    <section id="home-mock-tests-section" className="space-y-3.5 pt-2 max-w-7xl mx-auto px-3 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Section Header */}
      <div className="flex items-end justify-between px-0.5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 via-indigo-50 to-pink-50 border border-purple-200/80 text-purple-900 text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-500/20 animate-pulse" />
            <span>NTA NEET CBT Simulator &amp; AIR Rank</span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-tight">
            Featured NEET Mock Tests
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real NTA pattern, Section A &amp; B, negative marking (-1), timer &amp; instant detailed solutions
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreMockTests}
          className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition cursor-pointer select-none"
        >
          <span>All Test Series</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Colorful Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {tests.map((test) => {
          const isPurchased = hasUserPurchasedMockTest(test.id, userProfile);
          const isFree = test.isFree || test.price === 0;
          const theme = getSubjectColorTheme(test.subject, test.type);

          return (
            <div
              key={test.id}
              onClick={() => onSelectTest(test)}
              className="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-400 p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              {/* Top ambient color glow */}
              <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${theme.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />

              <div className="relative z-10 space-y-2.5">
                {/* Pattern & Subject Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${theme.badgeBg}`}>
                    {theme.icon}
                    <span>{test.subject}</span>
                  </span>

                  {isFree ? (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                      <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                      100% Free
                    </span>
                  ) : isPurchased ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-0.5 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      Unlocked
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                        ₹{test.price}
                      </span>
                      {test.originalPrice > test.price && (
                        <span className="text-[10px] text-slate-400 line-through font-normal ml-1">
                          ₹{test.originalPrice}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                  {test.title}
                </h3>

                {/* Meta details with colorful chips */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold text-slate-700 pt-1">
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                    <HelpCircle className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{test.totalQuestions} Qs</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{test.durationMinutes}m</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                    <Award className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{test.totalMarks} Marks</span>
                  </div>
                </div>
              </div>

              {/* Action Button & Pattern */}
              <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  {test.type === 'chapter_wise' ? 'Chapter Test' : test.type === 'full_subject' ? 'Subject Test' : 'Full Syllabus NEET'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTest(test);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs cursor-pointer ${
                    isPurchased || isFree
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-indigo-500/25'
                      : 'bg-slate-900 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {isPurchased || isFree ? (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Test</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Unlock Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
