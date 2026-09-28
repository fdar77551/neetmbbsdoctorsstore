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
  TrendingUp
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

  return (
    <section id="home-mock-tests-section" className="space-y-3 pt-2">
      {/* Section Header */}
      <div className="flex items-end justify-between px-0.5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 text-purple-800 text-[10px] font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>NTA NEET CBT Simulator</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-tight">
            NEET CBT Mock Tests
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real NEET timed interface, Section A &amp; B, negative marking &amp; All India Rank
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreMockTests}
          className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:text-indigo-700 transition cursor-pointer select-none"
        >
          <span>View All Tests</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tests.map((test) => {
          const isPurchased = hasUserPurchasedMockTest(test.id, userProfile);
          const isFree = test.isFree || test.price === 0;

          return (
            <div
              key={test.id}
              onClick={() => onSelectTest(test)}
              className="group relative bg-gradient-to-b from-white to-slate-50/60 rounded-2xl border border-slate-200/90 hover:border-indigo-400/80 p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Pattern & Subject Badge */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {test.subject}
                  </span>

                  {isFree ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      100% Free
                    </span>
                  ) : isPurchased ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                      ₹{test.price}
                      <span className="text-[10px] text-slate-400 line-through font-normal ml-1">
                        ₹{test.originalPrice}
                      </span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                  {test.title}
                </h3>

                {/* Meta details */}
                <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-medium mt-3 pt-2.5 border-t border-slate-100">
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-2xs">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{test.totalQuestions} Qs</span>
                  </span>
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{test.durationMinutes} Mins</span>
                  </span>
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-2xs">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{test.totalMarks} Marks</span>
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  {test.pattern === 'neet_full_cbt' ? 'Full Mock Test' : 'Chapter / Subject'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTest(test);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer ${
                    isPurchased || isFree
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
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

      {/* Mobile View All button */}
      <div className="pt-0.5 sm:hidden text-center">
        <button
          type="button"
          onClick={onExploreMockTests}
          className="w-full py-2 bg-slate-100/80 hover:bg-slate-200/80 active:scale-98 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <span>View All NEET Mock Tests</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
