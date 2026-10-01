import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  CheckCircle2, 
  RotateCcw, 
  LogOut, 
  Menu, 
  X, 
  AlertTriangle, 
  ZoomIn, 
  Info,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { MockTest, MockQuestion, MockTestAttempt, MockSubject } from '../types';
import { saveStoredMockAttempt, getStoredMockQuestions, getMockTestAttempt, getQuestionDisplayContent } from '../lib/mockTestData';
import { cleanQuestionTextForMatchTable } from '../lib/geminiPdfParser';

interface CbtTestInterfaceProps {
  test: MockTest;
  questions?: MockQuestion[];
  initialAttempt?: MockTestAttempt;
  userProfile?: { uid?: string; email?: string | null; displayName?: string | null; name?: string | null } | null;
  onFinishTest?: (finalAttempt: MockTestAttempt) => void;
  onSubmitTest?: (finalAttempt: MockTestAttempt) => void;
  onExitTest: () => void;
  initialLanguage?: 'en' | 'hi';
}

export const CbtTestInterface: React.FC<CbtTestInterfaceProps> = ({
  test,
  questions: passedQuestions,
  initialAttempt: passedAttempt,
  userProfile,
  onFinishTest,
  onSubmitTest,
  onExitTest,
  initialLanguage = 'en'
}) => {
  const questions = useMemo(() => {
    if (passedQuestions && passedQuestions.length > 0) return passedQuestions;
    return getStoredMockQuestions(test.id);
  }, [passedQuestions, test.id]);

  const initialAttempt = useMemo(() => {
    if (passedAttempt) return passedAttempt;
    const existing = getMockTestAttempt(test.id, userProfile?.uid, userProfile?.email);
    if (existing && existing.status === 'in_progress') return existing;
    return {
      id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      testId: test.id,
      testTitle: test.title,
      userId: userProfile?.uid || 'guest-user',
      userEmail: userProfile?.email || 'aspirant@student.neet',
      userName: userProfile?.displayName || userProfile?.name || 'Aspirant',
      startedAt: new Date().toISOString(),
      status: 'in_progress' as const,
      answers: {},
      markedForReview: [],
      visited: [1],
      timeSpentSeconds: 0
    };
  }, [passedAttempt, test, userProfile]);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi'>(initialLanguage);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>(() => initialAttempt.answers || {});
  const [markedForReview, setMarkedForReview] = useState<number[]>(() => initialAttempt.markedForReview || []);
  const [visited, setVisited] = useState<number[]>(() => initialAttempt.visited || [1]);
  
  // Timer state based on startedAt + duration
  const startTimeMs = useMemo(() => new Date(initialAttempt.startedAt).getTime(), [initialAttempt.startedAt]);
  const totalDurationSeconds = test.durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
    return Math.max(0, totalDurationSeconds - elapsed);
  });

  // UI States
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<'summary' | 'surity'>('summary');
  const [isSureChecked, setIsSureChecked] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<'All' | MockSubject>('All');
  const [timerWarning, setTimerWarning] = useState<string | null>(null);

  const openSubmitModal = () => {
    setSubmissionStep('summary');
    setIsSureChecked(false);
    setIsPaletteDrawerOpen(false);
    setIsSubmitModalOpen(true);
  };

  const timerRef = useRef<any>(null);

  const currentQuestion = questions[currentQIndex] || questions[0];
  const totalQuestionsCount = questions.length || test.totalQuestions;

  // Mark current question as visited
  useEffect(() => {
    if (currentQuestion && !visited.includes(currentQuestion.questionNumber)) {
      const updated = [...visited, currentQuestion.questionNumber];
      setVisited(updated);
      persistProgress(answers, markedForReview, updated);
    }
  }, [currentQIndex, currentQuestion?.questionNumber]);

  // Accurate Timer Loop: Calculated strictly from (startTime + duration) - now
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTimeMs) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);

      // Warning thresholds: 30m (1800s), 10m (600s), 5m (300s), 1m (60s)
      if (remaining === 1800) {
        showTimerAlert('⚠️ 30 Minutes Remaining! Check your pace.');
      } else if (remaining === 600) {
        showTimerAlert('⚠️ 10 Minutes Remaining! Review marked questions.');
      } else if (remaining === 300) {
        showTimerAlert('⚠️ 5 Minutes Remaining! Final checking.');
      } else if (remaining === 60) {
        showTimerAlert('🚨 1 Minute Remaining! Test will auto-submit soon.');
      }

      if (remaining <= 0) {
        // Auto-submit test immediately when time expires
        clearInterval(timerRef.current);
        handleFinalSubmit(true);
      }
    };

    timerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTimeMs, totalDurationSeconds]);

  const showTimerAlert = (msg: string) => {
    setTimerWarning(msg);
    setTimeout(() => setTimerWarning(null), 6000);
  };

  // Continuous Progress Persistence
  const persistProgress = (
    currentAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>,
    currentMarked: number[],
    currentVisited: number[]
  ) => {
    const elapsed = Math.min(totalDurationSeconds, Math.floor((Date.now() - startTimeMs) / 1000));
    const updatedAttempt: MockTestAttempt = {
      ...initialAttempt,
      answers: currentAnswers,
      markedForReview: currentMarked,
      visited: currentVisited,
      timeSpentSeconds: elapsed
    };
    saveStoredMockAttempt(updatedAttempt);
  };

  // Option selection
  const handleSelectOption = (optionLabel: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;
    const qNum = currentQuestion.questionNumber;
    const updated = { ...answers, [qNum]: optionLabel };
    setAnswers(updated);
    persistProgress(updated, markedForReview, visited);
  };

  // Clear current response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const qNum = currentQuestion.questionNumber;
    const updated = { ...answers };
    delete updated[qNum];
    setAnswers(updated);
    persistProgress(updated, markedForReview, visited);
  };

  // Toggle Mark for Review
  const handleToggleMarkForReview = () => {
    if (!currentQuestion) return;
    const qNum = currentQuestion.questionNumber;
    let updated: number[];
    if (markedForReview.includes(qNum)) {
      updated = markedForReview.filter(n => n !== qNum);
    } else {
      updated = [...markedForReview, qNum];
    }
    setMarkedForReview(updated);
    persistProgress(answers, updated, visited);

    // Auto advance to next question
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  // Save & Next
  const handleSaveAndNext = () => {
    persistProgress(answers, markedForReview, visited);
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      // Last question reached, open submit confirmation
      setIsSubmitModalOpen(true);
    }
  };

  // Final submission
  const handleFinalSubmit = (isAutoSubmit: boolean = false) => {
    clearInterval(timerRef.current);
    const elapsed = Math.min(totalDurationSeconds, Math.floor((Date.now() - startTimeMs) / 1000));
    
    // Calculate final scores
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const subjectBreakdown: any = {
      Physics: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 },
      Chemistry: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 },
      Biology: { correct: 0, incorrect: 0, unanswered: 0, score: 0, totalMarks: 0, questionsCount: 0 }
    };

    questions.forEach(q => {
      const subj = q.subject || 'Biology';
      if (subjectBreakdown[subj]) {
        subjectBreakdown[subj].questionsCount += 1;
        subjectBreakdown[subj].totalMarks += test.correctMarks;
      }

      const chosen = answers[q.questionNumber];
      if (!chosen) {
        unansweredCount++;
        if (subjectBreakdown[subj]) subjectBreakdown[subj].unanswered++;
      } else if (chosen === q.correctAnswer) {
        correctCount++;
        if (subjectBreakdown[subj]) {
          subjectBreakdown[subj].correct++;
          subjectBreakdown[subj].score += test.correctMarks;
        }
      } else {
        incorrectCount++;
        if (subjectBreakdown[subj]) {
          subjectBreakdown[subj].incorrect++;
          subjectBreakdown[subj].score -= test.negativeMarks;
        }
      }
    });

    const totalScore = (correctCount * test.correctMarks) - (incorrectCount * test.negativeMarks);
    const attemptedCount = correctCount + incorrectCount;
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    const finalAttempt: MockTestAttempt = {
      ...initialAttempt,
      status: isAutoSubmit ? 'timed_out' : 'submitted',
      submittedAt: new Date().toISOString(),
      answers,
      markedForReview,
      visited,
      timeSpentSeconds: elapsed,
      score: totalScore,
      correctCount,
      incorrectCount,
      unansweredCount,
      accuracy,
      subjectScores: subjectBreakdown
    };

    saveStoredMockAttempt(finalAttempt);
    const handler = onFinishTest || onSubmitTest;
    if (handler) {
      handler(finalAttempt);
    }
  };

  // Format Timer String
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // State calculations for palette
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.length;
  const unansweredCount = totalQuestionsCount - answeredCount;

  // Filtered questions for subject selection
  const subjectFilteredIndices = useMemo(() => {
    return questions.map((q, idx) => ({ q, idx })).filter(item => {
      if (selectedSubjectTab === 'All') return true;
      return item.q.subject === selectedSubjectTab;
    });
  }, [questions, selectedSubjectTab]);

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl font-black mx-auto border border-amber-500/30">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white">No Questions in this Mock Test</h2>
        <p className="text-slate-400 text-sm max-w-md">
          {test.title} does not contain any questions yet. Add questions via PDF upload, Markdown, or manual entry in the Admin Mock Test Manager.
        </p>
        <button
          type="button"
          onClick={onExitTest}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition shadow-lg cursor-pointer"
        >
          Return to Test Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none">
      
      {/* 1. TOP BAR (Serious NTA CBT Exam Header) */}
      <header className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0 shadow-md">
        
        {/* Left: Test Info & Subject Pills */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/30 uppercase tracking-wider font-['Outfit',sans-serif]">
              {test.testNumber || 'NEET CBT'}
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {test.title}
            </h1>
          </div>

          {/* Subject Switchers (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(sub => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSelectedSubjectTab(sub);
                  // Jump to first question of this subject
                  const firstOfSub = questions.findIndex(q => sub === 'All' || q.subject === sub);
                  if (firstOfSub > -1) setCurrentQIndex(firstOfSub);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedSubjectTab === sub
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Timer & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Bilingual Language Switcher [English | हिंदी] */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentLanguage('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentLanguage === 'en'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View in English"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setCurrentLanguage('hi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentLanguage === 'hi'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="हिंदी में देखें"
            >
              हिंदी
            </button>
          </div>

          {/* Real-time NTA Countdown Clock */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm border transition-colors ${
            secondsRemaining < 300 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
              : secondsRemaining < 900
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4 text-slate-300" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Instructions button */}
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="hidden sm:flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer"
            title="View Instructions"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Instructions</span>
          </button>

          {/* Question Palette Drawer Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setIsPaletteDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>Q-Grid</span>
          </button>

          {/* Exit test button */}
          <button
            type="button"
            onClick={() => setIsExitConfirmOpen(true)}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 p-1.5 sm:px-2 sm:py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
            title="Exit Test"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Timer Warning Floating Toast */}
      {timerWarning && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-center text-xs shadow-md animate-in slide-in-from-top duration-200 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{timerWarning}</span>
        </div>
      )}

      {/* 2. MAIN VIEW AREA (Question Display + Desktop Question Palette) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Question Workspace */}
        <main className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 bg-slate-50">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            
            {/* Question Meta Sub-Header */}
            <div className="bg-slate-50/80 px-4 sm:px-6 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-2xs font-['Outfit',sans-serif]">
                  {currentQuestion?.questionNumber || currentQIndex + 1}
                </span>
                <div>
                  <span className="text-xs font-black text-slate-900 block font-['Outfit',sans-serif]">
                    Question {currentQuestion?.questionNumber} of {totalQuestionsCount}
                  </span>
                  <span className="text-[10.5px] text-slate-500 font-semibold">
                    {currentQuestion?.subject} {currentQuestion?.chapter ? `• ${currentQuestion.chapter}` : ''}
                  </span>
                </div>
              </div>

              {/* Marking Scheme Badge */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  +{test.correctMarks} Correct
                </span>
                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  -{test.negativeMarks} Negative
                </span>
              </div>
            </div>

            {/* Question Body */}
            {(() => {
              const displayContent = getQuestionDisplayContent(currentQuestion, currentLanguage);
              const sharedFigureUrl = currentQuestion?.figureUrl || currentQuestion?.questionImageUrl || (currentQuestion?.figures && currentQuestion?.figures[0]);

              return (
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
                  
                  {/* Fallback notice if user requested Hindi but question only has English */}
                  {displayContent.isFallback && (
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-medium">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Hindi version not available for this question. Showing English.</span>
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed font-sans whitespace-pre-line">
                    {cleanQuestionTextForMatchTable(displayContent.questionText, displayContent.matchTable)}
                  </div>

                  {/* Match-the-Column Structured Table (Preserves exam table format) */}
                  {displayContent.matchTable && displayContent.matchTable.rows && displayContent.matchTable.rows.length > 0 && (
                    <div className="my-3 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xs max-w-xl">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black">
                            <th className="py-2 px-3.5 border-r border-slate-300 w-1/2">
                              {displayContent.matchTable.column1Header || (currentLanguage === 'hi' ? 'कॉलम-I' : 'Column-I')}
                            </th>
                            <th className="py-2 px-3.5 w-1/2">
                              {displayContent.matchTable.column2Header || (currentLanguage === 'hi' ? 'कॉलम-II' : 'Column-II')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayContent.matchTable.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                              <td className="py-2 px-3.5 border-r border-slate-200 font-medium">
                                <span className="font-black text-blue-700 mr-2">{row.leftKey}</span>
                                <span className="text-slate-900">{row.leftText}</span>
                              </td>
                              <td className="py-2 px-3.5 font-medium">
                                <span className="font-black text-indigo-700 mr-2">{row.rightKey}</span>
                                <span className="text-slate-900">{row.rightText}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ORIGINAL Scientific Figure (Diagram / Paper Chromatography / Circuit / Ray optics) */}
                  {sharedFigureUrl && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-w-lg">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Original Scientific Figure (Preserved from PDF):
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomedImage(sharedFigureUrl)}
                          className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer font-bold"
                        >
                          <ZoomIn className="w-3.5 h-3.5" /> Full Size
                        </button>
                      </div>

                      <img
                        src={sharedFigureUrl}
                        alt={`Scientific diagram for Question ${currentQuestion?.questionNumber || ''}`}
                        className="max-h-64 mx-auto object-contain rounded-xl bg-white p-2 border border-slate-200 cursor-pointer shadow-2xs"
                        onClick={() => setZoomedImage(sharedFigureUrl)}
                      />
                    </div>
                  )}

                  {/* Four Options (A, B, C, D) */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {currentLanguage === 'hi' ? 'सही विकल्प चुनें:' : 'Choose the correct option:'}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(displayContent.options || []).map((opt) => {
                        const isSelected = currentQuestion ? answers[currentQuestion.questionNumber] === opt.label : false;
                        const optFigure = currentQuestion?.optionFigures?.[opt.label] || opt.imageUrl;

                        return (
                          <div
                            key={opt.label}
                            onClick={() => handleSelectOption(opt.label)}
                            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                            }`}
                          >
                            {/* Option Radio Button & Label */}
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 text-slate-600 bg-slate-50'
                            }`}>
                              {opt.label}
                            </div>

                            {/* Option Content (Supports text, chemical structures/diagrams, or both) */}
                            <div className="flex-1 min-w-0 text-xs sm:text-sm">
                              {opt.value && <div className="leading-snug">{opt.value}</div>}

                              {/* Image Option (e.g. Chemical structure) */}
                              {optFigure && (
                                <div className="mt-1.5">
                                  <img
                                    src={optFigure}
                                    alt={`Option ${opt.label} chemical structure`}
                                    className="max-h-24 object-contain rounded-lg border border-slate-200 bg-white p-1"
                                  />
                                </div>
                              )}
                            </div>

                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </main>

        {/* Desktop Side Question Palette (Sticky Right Panel) */}
        <aside className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col shadow-xs shrink-0">
          
          {/* Palette Header with Legend */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70">
            <h3 className="text-xs font-black text-slate-900 font-['Outfit',sans-serif] uppercase tracking-wider flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-[10px] text-slate-500 font-bold">{answeredCount}/{totalQuestionsCount} Answered</span>
            </h3>

            {/* Quick States Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[9px]">✓</span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500 text-white flex items-center justify-center text-[9px]">✕</span>
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[9px]">★</span>
                <span>Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[9px]">•</span>
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Grid of Question Numbers */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {subjectFilteredIndices.map(({ q, idx }) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = Boolean(answers[q.questionNumber]);
                const isMarked = markedForReview.includes(q.questionNumber);
                const isHasVisited = visited.includes(q.questionNumber);

                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200';
                if (isAnswered && isMarked) {
                  btnStyle = 'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                } else if (isAnswered) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-700 shadow-2xs';
                } else if (isMarked) {
                  btnStyle = 'bg-purple-600 text-white border-purple-700 shadow-2xs';
                } else if (isHasVisited) {
                  btnStyle = 'bg-rose-500 text-white border-rose-600';
                }

                return (
                  <button
                    key={q.id ? `${q.id}-${idx}` : `q-${q.questionNumber}-${idx}`}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-black border transition-all flex items-center justify-center cursor-pointer ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 scale-105' : ''
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Submit Test Button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={openSubmitModal}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Test</span>
            </button>
          </div>
        </aside>

      </div>

      {/* 3. BOTTOM CONTROL BAR (Action Buttons) */}
      <footer className="bg-white border-t border-slate-200 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 shadow-lg shrink-0">
        
        {/* Left Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            type="button"
            onClick={handleClearResponse}
            className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Center & Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMarkForReview}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              markedForReview.includes(currentQuestion?.questionNumber)
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark for Review</span>
            <span className="sm:hidden">Review</span>
          </button>

          {/* Save & Next (Primary) */}
          <button
            type="button"
            onClick={handleSaveAndNext}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
          >
            <span>{currentQIndex === questions.length - 1 ? 'Save & Review' : 'Save & Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Mobile direct submit */}
          <button
            type="button"
            onClick={openSubmitModal}
            className="lg:hidden px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
          >
            Submit
          </button>
        </div>
      </footer>

      {/* 4. MOBILE SLIDE-OUT QUESTION PALETTE DRAWER */}
      {isPaletteDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="flex-1 cursor-pointer" 
            onClick={() => setIsPaletteDrawerOpen(false)} 
          />
          <div className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <span className="font-bold text-sm font-['Outfit',sans-serif]">Question Palette</span>
              <button 
                type="button" 
                onClick={() => setIsPaletteDrawerOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject filter */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-slate-50">
              {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubjectTab(sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSubjectTab === sub
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Numbers grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {subjectFilteredIndices.map(({ q, idx }) => {
                  const isCurrent = idx === currentQIndex;
                  const isAnswered = Boolean(answers[q.questionNumber]);
                  const isMarked = markedForReview.includes(q.questionNumber);
                  const isHasVisited = visited.includes(q.questionNumber);

                  let btnStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (isAnswered && isMarked) {
                    btnStyle = 'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                  } else if (isAnswered) {
                    btnStyle = 'bg-emerald-600 text-white border-emerald-700';
                  } else if (isMarked) {
                    btnStyle = 'bg-purple-600 text-white border-purple-700';
                  } else if (isHasVisited) {
                    btnStyle = 'bg-rose-500 text-white border-rose-600';
                  }

                  return (
                    <button
                      key={q.id ? `${q.id}-${idx}` : `q-${q.questionNumber}-${idx}`}
                      type="button"
                      onClick={() => {
                        setCurrentQIndex(idx);
                        setIsPaletteDrawerOpen(false);
                      }}
                      className={`h-9 rounded-xl text-xs font-black border transition-all flex items-center justify-center cursor-pointer ${btnStyle} ${
                        isCurrent ? 'ring-2 ring-blue-600' : ''
                      }`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Submit */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={openSubmitModal}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBMIT CONFIRMATION MODAL WITH SURITY CHECK */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            
            {submissionStep === 'summary' ? (
              <>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                    Exam Summary & Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review your overall question attempts before proceeding to final submission.
                  </p>
                </div>

                {/* Status Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Answered</span>
                    <span className="text-base font-black text-emerald-700">{answeredCount}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Unanswered</span>
                    <span className="text-base font-black text-rose-700">{unansweredCount}</span>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Marked</span>
                    <span className="text-base font-black text-purple-700">{markedCount}</span>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>You have <strong>{unansweredCount} unanswered questions</strong>. You will receive 0 marks for unattempted questions.</span>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      setSubmissionStep('summary');
                      setIsSureChecked(false);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Resume Test
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionStep('surity')}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Submit</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              /* STEP 2: EXPLICIT SURITY CHECK */
              <>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                    Are You 100% Sure?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Final Confirmation Step before evaluating your score.
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Important: Final Submission Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    Once you submit, your test will end immediately. You <strong>cannot change or review answers</strong> after this point. Your result, rank, and detailed solutions will be generated.
                  </p>
                </div>

                {/* Explicit Surity Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSureChecked}
                    onChange={(e) => setIsSureChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 leading-snug">
                    I am sure I want to submit my test now. I have verified my attempts and understand this cannot be undone.
                  </span>
                </label>

                {/* Final Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubmissionStep('summary')}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={!isSureChecked}
                    onClick={() => {
                      setIsSubmitModalOpen(false);
                      setSubmissionStep('summary');
                      setIsSureChecked(false);
                      handleFinalSubmit(false);
                    }}
                    className={`py-2.5 px-4 text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSureChecked 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yes, Finally Submit</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 6. EXIT CONFIRMATION MODAL */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
              Leave Mock Test?
            </h3>
            <p className="text-xs text-slate-500">
              Your selected answers will be securely saved, but the timer will continue running in the background.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={onExitTest}
                className="py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Exit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INSTRUCTIONS MODAL */}
      {isInstructionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                CBT Test Instructions
              </h3>
              <button type="button" onClick={() => setIsInstructionsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
              {(test.instructions && test.instructions.length > 0 ? test.instructions : [
                'Total test duration is ' + test.durationMinutes + ' minutes.',
                'Each correct answer carries +' + test.correctMarks + ' marks.',
                'Each incorrect answer deducts -' + test.negativeMarks + ' marks.',
                'Unanswered questions receive 0 marks.',
                'All scientific figures and chemical structures reflect original NTA papers.'
              ]).map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setIsInstructionsOpen(false)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Close Instructions
            </button>
          </div>
        </div>
      )}

      {/* 8. ZOOMED SCIENTIFIC IMAGE MODAL */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs cursor-pointer"
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
