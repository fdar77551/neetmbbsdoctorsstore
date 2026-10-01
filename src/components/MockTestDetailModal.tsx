import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Lock, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  Share2, 
  Sparkles, 
  BookOpen, 
  Languages, 
  FlaskConical, 
  RotateCcw,
  Trophy,
  Star
} from 'lucide-react';
import { MockTest, MockTestAttempt } from '../types';
import { 
  hasUserPurchasedMockTest, 
  getMockTestAttempt, 
  canStudentAttemptTest,
  getStoredMockQuestions 
} from '../lib/mockTestData';
import { ReviewSection } from './ReviewSection';
import { MockTestShareModal } from './MockTestShareModal';

interface MockTestDetailModalProps {
  test: MockTest | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  userProfile?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onStartTest: (test: MockTest) => void;
  onBuyTest?: (test: MockTest) => void;
  onRequireAuth?: () => void;
  onOpenLeaderboard?: (test: MockTest) => void;
}

export const MockTestDetailModal: React.FC<MockTestDetailModalProps> = ({
  test,
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onStartTest,
  onBuyTest,
  onRequireAuth,
  onOpenLeaderboard
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const effectiveUser = userProfile || currentUser;

  if (!isOpen || !test) return null;

  const isPurchased = hasUserPurchasedMockTest(effectiveUser?.uid, effectiveUser?.email, test.id);
  const userAttempt = getMockTestAttempt(test.id, effectiveUser?.uid, effectiveUser?.email);
  const isCompleted = userAttempt && userAttempt.status === 'submitted';
  const isInProgress = userAttempt && userAttempt.status === 'in_progress';
  const reattemptCheck = canStudentAttemptTest(test, effectiveUser?.uid, effectiveUser?.email);
  const isFree = test.isFree || test.price === 0 || !test.isPaid;

  const storedQuestions = getStoredMockQuestions(test.id);
  const isBilingual = Boolean(
    (test.languages && test.languages.includes('hi')) || 
    storedQuestions.some(q => Boolean(q?.languages?.hi?.questionText || (q as any)?.hindiQuestionText))
  );
  const hasFigures = storedQuestions.some(q => Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0)));

  const handleStartOrEnroll = () => {
    if (!effectiveUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (isFree || isPurchased) {
      onClose();
      onStartTest(test);
    } else {
      if (onBuyTest) {
        onClose();
        onBuyTest(test);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
        <div 
          className="fixed inset-0" 
          onClick={onClose} 
        />
        
        <div 
          className="relative bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-200 font-mono text-xs font-black border border-blue-400/30">
                  {test.testNumber || 'NEET-MOCK'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-bold border border-emerald-400/30">
                  {isFree ? 'Free Mock Test' : 'Official Premium Test'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Share Test"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Test Title & Description */}
            <div className="space-y-2 pt-3 relative z-10">
              <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight leading-snug">
                {test.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                {test.description || test.fullDescription || test.shortDescription || 'Full syllabus NEET mock test crafted by medical toppers.'}
              </p>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Key Test Specs Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <HelpCircle className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Questions</span>
                <span className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  {test.totalQuestions} Qs
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <Clock className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                <span className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  {test.durationMinutes} Mins
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Max Marks</span>
                <span className="text-base font-black text-emerald-700 font-['Outfit',sans-serif]">
                  {test.maxMarks || 720}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Marking</span>
                <span className="text-xs font-black text-amber-800 font-['Outfit',sans-serif]">
                  +{test.correctMarks} / -{test.negativeMarks}
                </span>
              </div>
            </div>

            {/* Subjects & Highlights Pills */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Subjects &amp; Features:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {test.subjects.map(s => (
                  <span key={s} className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
                    {s}
                  </span>
                ))}
                {isBilingual && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5 text-amber-600" />
                    <span>English + हिंदी</span>
                  </span>
                )}
                {hasFigures && (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                    <span>Original Scientific Diagrams</span>
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All India Rank &amp; Analysis</span>
                </span>
              </div>
            </div>

            {/* Syllabus summary */}
            {test.syllabus && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-xs font-black text-slate-700 block">Syllabus Covered:</span>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {test.syllabus}
                </p>
              </div>
            )}

            {/* User Attempt Status Card if applicable */}
            {userAttempt && (
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-blue-900">Your Last Attempt Status</span>
                  <span className="font-bold text-blue-700">
                    Score: {userAttempt.score ?? 0} / {userAttempt.maxMarks || test.maxMarks}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                  <span className="text-emerald-700">Accuracy: {userAttempt.accuracy || 0}%</span>
                  <span>•</span>
                  <span>Attempted: {new Date(userAttempt.submittedAt || userAttempt.startedAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Reviews & Star Rating Section */}
            <ReviewSection
              productId={test.id}
              productType="mock_test"
              productTitle={test.title}
              currentUser={currentUser}
              userProfile={userProfile}
              onRequireAuth={onRequireAuth}
              baseRating={4.9}
              baseCount={84}
            />
          </div>

          {/* Bottom Fixed Action Bar */}
          <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            {/* Price Info */}
            <div>
              {isFree ? (
                <div className="space-y-0.5">
                  <span className="text-lg font-black text-emerald-600 font-['Outfit',sans-serif] block">
                    Free
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">No payment required</span>
                </div>
              ) : isPurchased ? (
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Unlocked &amp; Purchased</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Ready to attempt</span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                      ₹{test.price}
                    </span>
                    {test.originalPrice && test.originalPrice > test.price && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{test.originalPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Full Access + Solutions</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Share Test"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>

              {!effectiveUser ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRequireAuth) onRequireAuth();
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
                >
                  Login to {isFree ? 'Start Test' : 'Enroll'}
                </button>
              ) : (isFree || isPurchased) ? (
                <button
                  type="button"
                  onClick={handleStartOrEnroll}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isInProgress ? 'Resume Test' : 'Start Test Now'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartOrEnroll}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Buy Mock Test (₹{test.price})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MockTestShareModal
        test={test}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
};
