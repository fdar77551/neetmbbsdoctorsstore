import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Target, 
  Award, 
  BookOpen, 
  RotateCcw, 
  ChevronRight, 
  Filter,
  ZoomIn,
  Sparkles,
  History,
  Calendar,
  Zap,
  Gauge,
  Flame,
  Atom,
  Dna,
  Share2
} from 'lucide-react';
import { MockTest, MockQuestion, MockTestAttempt } from '../types';
import { getStoredMockQuestions, getAttemptsForTest } from '../lib/mockTestData';

interface MockTestResultViewProps {
  test?: MockTest;
  questions?: MockQuestion[];
  attempt: MockTestAttempt;
  onBackToTests: () => void;
  onRetakeTest?: () => void;
  onOpenLeaderboard?: () => void;
  onSelectAttempt?: (attempt: MockTestAttempt) => void;
}

export const MockTestResultView: React.FC<MockTestResultViewProps> = ({
  test: propTest,
  questions,
  attempt: initialAttempt,
  onBackToTests,
  onRetakeTest,
  onOpenLeaderboard,
  onSelectAttempt
}) => {
  const safeTestId = propTest?.id || initialAttempt?.testId || 'cbt-test';
  const test: MockTest = useMemo(() => {
    if (propTest) return propTest;
    return {
      id: safeTestId,
      testNumber: 'Test',
      title: initialAttempt?.testTitle || 'NEET Mock Test',
      totalQuestions: 180,
      durationMinutes: 180,
      maxMarks: 720,
      correctMarks: 4,
      negativeMarks: 1,
      type: 'full_syllabus',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      price: 0,
      status: 'published',
      showLeaderboard: true,
      allowMultipleAttempts: true,
      createdAt: new Date().toISOString()
    };
  }, [propTest, safeTestId, initialAttempt]);

  const [selectedAttemptId, setSelectedAttemptId] = useState<string>(initialAttempt?.id || '');
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<'all' | 'Physics' | 'Chemistry' | 'Biology'>('all');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Safe questions resolution
  const resolvedQuestions = useMemo(() => {
    if (questions && questions.length > 0) return questions.filter(Boolean);
    if (propTest?.questions && propTest.questions.length > 0) return propTest.questions.filter(Boolean);
    return (getStoredMockQuestions(test.id) || []).filter(Boolean);
  }, [questions, propTest, test.id]);

  // All historical attempts for this user and test
  const allTestAttempts = useMemo(() => {
    return getAttemptsForTest(test.id, initialAttempt?.userId, initialAttempt?.userEmail);
  }, [test.id, initialAttempt?.userId, initialAttempt?.userEmail]);

  // Current active attempt to display
  const attempt = useMemo(() => {
    return allTestAttempts.find(a => a.id === selectedAttemptId) || initialAttempt;
  }, [allTestAttempts, selectedAttemptId, initialAttempt]);

  const totalQuestions = resolvedQuestions.length || test.totalQuestions || 180;
  const correctCount = attempt?.correctCount || 0;
  const incorrectCount = attempt?.incorrectCount || 0;
  const unansweredCount = attempt?.unansweredCount ?? Math.max(0, totalQuestions - correctCount - incorrectCount);
  const correctMarks = test.correctMarks ?? 4;
  const negativeMarks = test.negativeMarks ?? 1;
  const maxMarks = test.maxMarks || (totalQuestions * correctMarks) || 720;
  const score = attempt?.score ?? ((correctCount * correctMarks) - (incorrectCount * negativeMarks));
  const attemptedCount = correctCount + incorrectCount;
  const accuracy = attempt?.accuracy ?? (attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0);

  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    return `${mins}m ${s}s`;
  };

  const avgSecondsPerQ = attemptedCount > 0 ? Math.round(attempt.timeSpentSeconds / attemptedCount) : 0;
  const percentScore = Math.max(0, Math.round((score / maxMarks) * 100));

  // Dynamic energetic All India Rank projection
  const estimatedAirRange = useMemo(() => {
    if (percentScore >= 95) return 'AIR 1 – 150 (Top AIIMS Confirmed)';
    if (percentScore >= 88) return 'AIR 150 – 850 (Top GMC / MAMC Ready)';
    if (percentScore >= 75) return 'AIR 850 – 3,500 (State Govt Medical College)';
    if (percentScore >= 60) return 'AIR 3,500 – 14,000 (Govt Medical Seat Qualifier)';
    if (percentScore >= 45) return 'AIR 14,000 – 45,000 (Private / Semigovt Qualifying)';
    return 'AIR 50,000+ (High Revision Needed)';
  }, [percentScore]);

  const filteredQuestions = resolvedQuestions.filter(q => {
    if (!q) return false;
    if (selectedSubjectFilter !== 'all' && q.subject !== selectedSubjectFilter) {
      return false;
    }
    const userAnswer = attempt?.answers?.[q.questionNumber];
    if (activeFilter === 'correct') return userAnswer === q.correctAnswer;
    if (activeFilter === 'incorrect') return userAnswer && userAnswer !== q.correctAnswer;
    if (activeFilter === 'unanswered') return !userAnswer;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900/5 py-4 sm:py-6 px-3 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={onBackToTests}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Mock Tests</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenLeaderboard && test.showLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Leaderboard</span>
              </button>
            )}

            {test.allowMultipleAttempts && onRetakeTest && (
              <button
                type="button"
                onClick={onRetakeTest}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Test</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Attempt History Switcher Bar */}
        {allTestAttempts.length > 1 && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-blue-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <History className="w-4 h-4 text-blue-600" />
              <span>You have attempted this test <strong>{allTestAttempts.length} times</strong></span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Switch Attempt:</span>
              {allTestAttempts.map((att, idx) => {
                const isCurrent = att.id === attempt.id;
                const attScore = att.score ?? ((att.correctCount || 0) * test.correctMarks - (att.incorrectCount || 0) * test.negativeMarks);
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => {
                      setSelectedAttemptId(att.id);
                      if (onSelectAttempt) onSelectAttempt(att);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-2xs ring-2 ring-blue-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Attempt #{allTestAttempts.length - idx} ({attScore}/{test.maxMarks})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= HERO SCORE CARD: ENERGETIC, COLOURFUL & ADVANCED ================= */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-5 sm:p-8 shadow-2xl border border-indigo-500/30">
          
          {/* Ambient Glowing Neon Spotlights */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/20 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left Header & Test Meta */}
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 text-indigo-300 text-[11px] font-black border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                <span>OFFICIAL NTA NEET CBT SCORECARD</span>
              </div>
              
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-['Outfit',sans-serif] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200">
                {test.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Submitted on {new Date(attempt.submittedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Dynamic AIR Estimation Pill */}
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estimated Rank: {estimatedAirRange}</span>
                </span>
              </div>
            </div>

            {/* Right Big Score Gauge Ring */}
            <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 min-w-[200px] text-center shadow-xl">
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block">
                Total NEET Score
              </span>
              
              <div className="text-4xl sm:text-5xl font-black font-['Outfit',sans-serif] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 mt-1">
                {score}
                <span className="text-base sm:text-lg font-normal text-slate-300 ml-1">
                  / {test.maxMarks}
                </span>
              </div>

              {/* Admission Readiness Badge */}
              <div className="mt-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-500/40 to-teal-500/40 border border-emerald-400/50 px-3 py-1 rounded-full shadow-xs">
                {percentScore >= 80 ? '🌟 AIIMS Cutoff Ready' : percentScore >= 60 ? '🩺 GMC Qualifiable' : '⚡ Revision Recommended'}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid (Energetic & Colourful Glassmorphism) */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <div className="bg-emerald-500/10 rounded-2xl p-3 sm:p-3.5 border border-emerald-500/20 text-center backdrop-blur-xs">
              <span className="text-[10px] uppercase font-black text-emerald-300 block">Correct (+4)</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 block">{correctCount}</span>
              <span className="text-[10px] text-emerald-200/80">+{correctCount * test.correctMarks} marks gained</span>
            </div>

            <div className="bg-rose-500/10 rounded-2xl p-3 sm:p-3.5 border border-rose-500/20 text-center backdrop-blur-xs">
              <span className="text-[10px] uppercase font-black text-rose-300 block">Incorrect (-1)</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5 block">{incorrectCount}</span>
              <span className="text-[10px] text-rose-200/80">-{incorrectCount * test.negativeMarks} negative marks</span>
            </div>

            <div className="bg-amber-500/10 rounded-2xl p-3 sm:p-3.5 border border-amber-500/20 text-center backdrop-blur-xs">
              <span className="text-[10px] uppercase font-black text-amber-300 block">Accuracy</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5 block">{accuracy}%</span>
              <span className="text-[10px] text-amber-200/80">{unansweredCount} unattempted</span>
            </div>

            <div className="bg-blue-500/10 rounded-2xl p-3 sm:p-3.5 border border-blue-500/20 text-center backdrop-blur-xs">
              <span className="text-[10px] uppercase font-black text-blue-300 block">Avg Speed</span>
              <span className="text-xl sm:text-2xl font-black text-blue-300 mt-0.5 block">{avgSecondsPerQ}s / Q</span>
              <span className="text-[10px] text-blue-200/80">{formatDuration(attempt.timeSpentSeconds)} total</span>
            </div>
          </div>
        </div>

        {/* ================= SUBJECT PERFORMANCE BREAKDOWN (COLOURFUL THEMED CARDS) ================= */}
        {attempt.subjectScores && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Subject-Wise Score Breakdown &amp; Analysis</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(['Physics', 'Chemistry', 'Biology'] as const).map(subj => {
                const subData = attempt.subjectScores?.[subj];
                if (!subData || subData.questionsCount === 0) return null;
                const subPercent = subData.totalMarks > 0 ? Math.max(0, Math.round((subData.score / subData.totalMarks) * 100)) : 0;

                const subjTheme = subj === 'Physics'
                  ? { bg: 'bg-violet-50/70 border-violet-200', text: 'text-violet-900', bar: 'bg-violet-600', icon: <Atom className="w-4 h-4 text-violet-600" /> }
                  : subj === 'Chemistry'
                  ? { bg: 'bg-rose-50/70 border-rose-200', text: 'text-rose-900', bar: 'bg-rose-600', icon: <Flame className="w-4 h-4 text-rose-600" /> }
                  : { bg: 'bg-emerald-50/70 border-emerald-200', text: 'text-emerald-900', bar: 'bg-emerald-600', icon: <Dna className="w-4 h-4 text-emerald-600" /> };
                
                return (
                  <div key={subj} className={`${subjTheme.bg} border rounded-2xl p-4 space-y-2.5 shadow-2xs`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-sm">
                        {subjTheme.icon}
                        <span className={subjTheme.text}>{subj}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                        {subData.score} <span className="text-xs text-slate-500 font-normal">/ {subData.totalMarks}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/90 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${subjTheme.bar}`}
                        style={{ width: `${Math.min(100, Math.max(5, subPercent))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-emerald-700">✓ {subData.correct} Correct</span>
                      <span className="text-rose-700">✕ {subData.incorrect} Wrong</span>
                      <span className="text-slate-500">⭕ {subData.unanswered} Skipped</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= QUESTION-WISE SOLUTION & REVIEW SECTION ================= */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Question-Wise Explanations &amp; Solutions</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect authentic diagrams, derivations, and learn from mistakes.
              </p>
            </div>

            {/* Subject selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'Physics', 'Chemistry', 'Biology'] as const).map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSubjectFilter === sub
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sub === 'all' ? 'All Subjects' : sub}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs: All / Correct / Incorrect / Unanswered */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Questions ({resolvedQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('correct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Correct ({correctCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('incorrect')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'incorrect'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Incorrect ({incorrectCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unanswered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'unanswered'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Unattempted ({unansweredCount})</span>
            </button>
          </div>

          {/* Questions list */}
          <div className="space-y-4 pt-2">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">
                No questions found under this filter.
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const userAns = attempt?.answers?.[q.questionNumber];
                const isCorrect = userAns === q.correctAnswer;
                const isUnanswered = !userAns;

                return (
                  <div 
                    key={q.id || `q-${q.questionNumber}`}
                    className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition ${
                      isCorrect 
                        ? 'border-emerald-200 bg-emerald-50/20' 
                        : isUnanswered 
                        ? 'border-slate-200 bg-slate-50/40' 
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    {/* Header: Question Number, Subject, Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                          {q.questionNumber}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {q.subject}
                        </span>
                      </div>

                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Correct (+4)</span>
                        </span>
                      ) : isUnanswered ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Skipped (0)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Wrong (-1)</span>
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* Diagram preview if available */}
                    {(q.figureUrl || q.questionImageUrl || (q.figures && q.figures[0])) && (
                      <div className="my-2 bg-white p-2 rounded-xl border border-slate-200 inline-block">
                        <img 
                          src={q.figureUrl || q.questionImageUrl || q.figures?.[0]} 
                          alt="Diagram" 
                          onClick={() => setZoomedImage(q.figureUrl || q.questionImageUrl || q.figures?.[0] || null)}
                          className="max-h-48 rounded-lg cursor-zoom-in hover:opacity-90"
                        />
                      </div>
                    )}

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map(opt => {
                        const isSelected = userAns === opt.label;
                        const isCorrectOpt = q.correctAnswer === opt.label;

                        let style = 'bg-white border-slate-200 text-slate-700';
                        if (isCorrectOpt) {
                          style = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300';
                        } else if (isSelected) {
                          style = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                        }

                        return (
                          <div key={opt.label} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${style}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-black text-[10px] shrink-0">
                                {opt.label}
                              </span>
                              <span>{opt.value}</span>
                            </div>
                            {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Solution / Explanation Box */}
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-indigo-950 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Detailed Derivation &amp; Solution:</span>
                        </span>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Lightbox Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white p-3 rounded-2xl shadow-2xl">
            <img src={zoomedImage} alt="Diagram" className="max-w-full max-h-[80vh] object-contain mx-auto" />
            <p className="text-center text-xs text-slate-500 mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
