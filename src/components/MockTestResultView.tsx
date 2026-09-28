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
  Calendar
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
  const accuracy = attempt?.accuracy ?? (correctCount + incorrectCount > 0 ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) : 0);

  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    return `${mins}m ${s}s`;
  };

  const filteredQuestions = resolvedQuestions.filter(q => {
    if (!q) return false;
    // Subject filter
    if (selectedSubjectFilter !== 'all' && q.subject !== selectedSubjectFilter) {
      return false;
    }

    const userAnswer = attempt?.answers?.[q.questionNumber];
    if (activeFilter === 'correct') return userAnswer === q.correctAnswer;
    if (activeFilter === 'incorrect') return userAnswer && userAnswer !== q.correctAnswer;
    if (activeFilter === 'unanswered') return !userAnswer;
    return true;
  });

  const percentScore = Math.max(0, Math.round((score / maxMarks) * 100));

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 px-3 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Leaderboard</span>
              </button>
            )}

            {test.allowMultipleAttempts && onRetakeTest && (
              <button
                type="button"
                onClick={onRetakeTest}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
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

        {/* Hero Score Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-8 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30">
                <Sparkles className="w-3 h-3 text-blue-300" />
                <span>Official NEET CBT Evaluation Result</span>
              </div>
              
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-['Outfit',sans-serif] tracking-tight">
                {test.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Completed on {new Date(attempt.submittedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Score Badge Ring */}
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 min-w-[170px] text-center shadow-lg">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Your Total Score
              </span>
              <div className="text-3xl sm:text-4xl font-black font-['Outfit',sans-serif] text-emerald-400 mt-0.5">
                {score}
                <span className="text-sm sm:text-base font-normal text-slate-400 ml-1">
                  / {test.maxMarks}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-white bg-emerald-500/30 border border-emerald-400/40 px-3 py-0.5 rounded-full">
                {percentScore >= 80 ? '🌟 AIIMS Cutoff Ready' : percentScore >= 60 ? '🩺 GMC Qualifiable' : '⚡ High Revision Needed'}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Correct (+4)</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">{correctCount}</span>
              <span className="text-[10px] text-slate-400">+{correctCount * test.correctMarks} marks</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Incorrect (-1)</span>
              <span className="text-lg font-black text-rose-400 mt-0.5 block">{incorrectCount}</span>
              <span className="text-[10px] text-slate-400">-{incorrectCount * test.negativeMarks} marks</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
              <span className="text-lg font-black text-amber-300 mt-0.5 block">{accuracy}%</span>
              <span className="text-[10px] text-slate-400">{unansweredCount} unattempted</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Taken</span>
              <span className="text-lg font-black text-blue-300 mt-0.5 block">{formatDuration(attempt.timeSpentSeconds)}</span>
              <span className="text-[10px] text-slate-400">of {test.durationMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Subject Performance Breakdown */}
        {attempt.subjectScores && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Subject Performance Analysis</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['Physics', 'Chemistry', 'Biology'] as const).map(subj => {
                const subData = attempt.subjectScores?.[subj];
                if (!subData || subData.questionsCount === 0) return null;
                const subPercent = subData.totalMarks > 0 ? Math.max(0, Math.round((subData.score / subData.totalMarks) * 100)) : 0;
                
                return (
                  <div key={subj} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">{subj}</span>
                      <span className="text-xs font-black text-blue-600">{subData.score} / {subData.totalMarks}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          subPercent >= 75 ? 'bg-emerald-500' : subPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, subPercent))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="text-emerald-700 font-bold">✓ {subData.correct} Correct</span>
                      <span className="text-rose-700 font-bold">✕ {subData.incorrect} Wrong</span>
                      <span className="text-slate-500">⭕ {subData.unanswered} Skipped</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question-Wise Detailed Review Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Question-Wise Solution & Explanations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect authentic figures, verify step-by-step derivations, and rectify conceptual errors.
              </p>
            </div>

            {/* Subject selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'Physics', 'Chemistry', 'Biology'] as const).map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSubjectFilter === sub
                      ? 'bg-blue-600 text-white shadow-2xs'
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
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Questions ({resolvedQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('correct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                activeFilter === 'correct'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Correct ({correctCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('incorrect')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                activeFilter === 'incorrect'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Incorrect ({incorrectCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unanswered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                activeFilter === 'unanswered'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Unattempted ({unansweredCount})
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No questions match the selected filter.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const userChoice = attempt?.answers?.[q.questionNumber];
                const isCorrect = userChoice === q.correctAnswer;
                const isUnanswered = !userChoice;

                return (
                  <div
                    key={q.id ? `${q.id}-${idx}` : `result-q-${q.questionNumber}-${idx}`}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isUnanswered
                        ? 'border-slate-200 bg-white'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                          Q{q.questionNumber}
                        </span>
                        <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {q.subject}
                        </span>
                        {q.chapter && (
                          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                            • {q.chapter}
                          </span>
                        )}
                      </div>

                      {/* Status Tag */}
                      <div>
                        {isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> +4 Marks
                          </span>
                        )}
                        {!isCorrect && !isUnanswered && (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> -1 Mark
                          </span>
                        )}
                        {isUnanswered && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                            0 Marks (Skipped)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {q?.languages?.en?.questionText || q.questionText || `Question ${q.questionNumber}`}
                    </p>

                    {/* Original Scientific Diagram (Unaltered) */}
                    {q.questionImageUrl && (
                      <div className="my-3 p-2 bg-white rounded-xl border border-slate-200 max-w-md">
                        <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500 font-medium">
                          <span>Original Scientific Figure / Mechanism:</span>
                          <button
                            type="button"
                            onClick={() => setZoomedImage(q.questionImageUrl!)}
                            className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer"
                          >
                            <ZoomIn className="w-3 h-3" /> Zoom
                          </button>
                        </div>
                        <img
                          src={q.questionImageUrl}
                          alt={`Question ${q.questionNumber} Diagram`}
                          className="max-h-60 mx-auto object-contain rounded-lg cursor-pointer"
                          onClick={() => setZoomedImage(q.questionImageUrl!)}
                        />
                      </div>
                    )}

                    {/* Options List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {(q?.languages?.en?.options || q.options || []).map((opt) => {
                        const isChosen = userChoice === opt.label;
                        const isTheCorrectOne = q.correctAnswer === opt.label;

                        let optStyles = 'bg-white border-slate-200 text-slate-800';
                        if (isTheCorrectOne) {
                          optStyles = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400';
                        } else if (isChosen && !isTheCorrectOne) {
                          optStyles = 'bg-rose-50 border-rose-400 text-rose-950 font-bold ring-1 ring-rose-400';
                        }

                        return (
                          <div
                            key={opt.label}
                            className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs transition ${optStyles}`}
                          >
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isTheCorrectOne ? 'bg-emerald-600 text-white' :
                              isChosen ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {opt.label}
                            </span>

                            <div className="flex-1 min-w-0">
                              {opt.value && <span>{opt.value}</span>}
                              
                              {/* Option image if chemical structure */}
                              {opt.imageUrl && (
                                <div className="mt-1">
                                  <img 
                                    src={opt.imageUrl} 
                                    alt={`Option ${opt.label} structure`}
                                    className="max-h-20 object-contain rounded border border-slate-200 bg-white p-1"
                                  />
                                </div>
                              )}
                            </div>

                            {isTheCorrectOne && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            {isChosen && !isTheCorrectOne && (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Step-by-Step NCERT Explanation */}
                    {(q.explanation || q?.languages?.en?.explanation) && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200/80 bg-blue-50/50 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:p-4 rounded-b-2xl">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Detailed Solution & NCERT Explanation:</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {q.explanation || q?.languages?.en?.explanation}
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

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white p-3 rounded-2xl shadow-2xl">
            <img src={zoomedImage} alt="Zoomed scientific diagram" className="max-w-full max-h-[80vh] object-contain mx-auto" />
            <p className="text-center text-xs text-slate-500 mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
