import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Trash2, 
  Plus, 
  Image as ImageIcon, 
  Crop, 
  Eye, 
  AlertTriangle, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Languages, 
  Check, 
  X,
  Search,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  MockQuestion, 
  MockTest, 
  MockSubject, 
  MockQuestionOption,
  MockQuestionDifficulty
} from '../types';
import { normalizeMockQuestion } from '../lib/mockTestData';

interface QuestionCanvasBuilderProps {
  test: MockTest;
  questions: MockQuestion[];
  onSaveQuestions: (updatedQuestions: MockQuestion[]) => void;
  onClose: () => void;
  onRequestCropFromPdf?: (questionNumber: number, targetType: 'question' | 'option_A' | 'option_B' | 'option_C' | 'option_D') => void;
}

export const QuestionCanvasBuilder: React.FC<QuestionCanvasBuilderProps> = ({
  test,
  questions: initialQuestions,
  onSaveQuestions,
  onClose,
  onRequestCropFromPdf
}) => {
  const [questionsList, setQuestionsList] = useState<MockQuestion[]>(() => {
    if (!initialQuestions || initialQuestions.length === 0) {
      // Create first empty question if none exist
      return [normalizeMockQuestion({
        questionNumber: 1,
        testId: test.id,
        subject: test.subjects[0] || 'Biology'
      }, test.id)];
    }
    return initialQuestions.map(q => normalizeMockQuestion(q, test.id));
  });

  const [selectedQIndex, setSelectedQIndex] = useState(0);
  const [devicePreviewMode, setDevicePreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [editorLanguageMode, setEditorLanguageMode] = useState<'en' | 'hi' | 'side-by-side'>('en');
  const [filterSubject, setFilterSubject] = useState<'All' | MockSubject>('All');
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);
  const [filterFiguresOnly, setFilterFiguresOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSettingsOpenMobile, setIsSettingsOpenMobile] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const currentQ = questionsList[selectedQIndex] || questionsList[0];

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  // Mutate current question helper
  const updateCurrentQuestion = (updater: (prev: MockQuestion) => MockQuestion) => {
    setQuestionsList(prev => {
      const copy = [...prev];
      if (copy[selectedQIndex]) {
        copy[selectedQIndex] = updater(copy[selectedQIndex]);
      }
      return copy;
    });
  };

  // Add new question
  const handleAddNewQuestion = () => {
    const nextQNum = questionsList.length + 1;
    let autoSubject: MockSubject = 'Biology';
    if (nextQNum <= 50) autoSubject = 'Physics';
    else if (nextQNum <= 100) autoSubject = 'Chemistry';

    const newQ = normalizeMockQuestion({
      testId: test.id,
      questionNumber: nextQNum,
      subject: autoSubject,
      chapter: 'General Chapter',
      difficulty: 'Moderate'
    }, test.id);

    const updated = [...questionsList, newQ];
    setQuestionsList(updated);
    setSelectedQIndex(updated.length - 1);
    triggerToast(`Question ${nextQNum} added`);
  };

  // Delete current question
  const handleDeleteCurrentQuestion = () => {
    if (questionsList.length <= 1) {
      triggerToast('A test must contain at least 1 question');
      return;
    }
    const updated = questionsList
      .filter((_, idx) => idx !== selectedQIndex)
      .map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    setQuestionsList(updated);
    setSelectedQIndex(Math.max(0, selectedQIndex - 1));
    triggerToast('Question removed and numbers re-indexed');
  };

  // Save changes
  const handleSaveAll = () => {
    onSaveQuestions(questionsList);
    triggerToast('All questions saved successfully!');
  };

  // Filtered indices for left panel
  const filteredQuestions = questionsList.filter(q => {
    if (!q) return false;
    if (filterSubject !== 'All' && q.subject !== filterSubject) return false;
    if (filterReviewOnly && !q.needsReview) return false;
    if (filterFiguresOnly && !(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0) || (q.optionFigures && Object.keys(q.optionFigures).length > 0))) return false;
    if (searchQuery.trim()) {
      const qText = (q?.languages?.en?.questionText || q?.questionText || '').toLowerCase();
      const numStr = (q.questionNumber || '').toString();
      if (!qText.includes(searchQuery.toLowerCase()) && !numStr.includes(searchQuery)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col min-h-0 overflow-hidden font-sans">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Tests</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <span>{test.title || test.testNumber}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {questionsList.length} Questions
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Visual Question Canvas & Bilingual Editor
            </p>
          </div>
        </div>

        {/* Center: Device & Language Preview Controls */}
        <div className="flex items-center gap-2">
          {/* Device toggle */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDevicePreviewMode('desktop')}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                devicePreviewMode === 'desktop' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Desktop View (1200px)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevicePreviewMode('tablet')}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                devicePreviewMode === 'tablet' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setDevicePreviewMode('mobile')}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                devicePreviewMode === 'mobile' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mobile View (420px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Mobile</span>
            </button>
          </div>

          {/* Language Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setEditorLanguageMode('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                editorLanguageMode === 'en' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setEditorLanguageMode('hi')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                editorLanguageMode === 'hi' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setEditorLanguageMode('side-by-side')}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                editorLanguageMode === 'side-by-side' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compare English & Hindi side-by-side"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile toggles for sidebars */}
          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            className="lg:hidden p-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Questions
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpenMobile(!isSettingsOpenMobile)}
            className="xl:hidden p-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Questions</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">

        {/* 1. LEFT COLUMN: QUESTION LIST & QUICK JUMP */}
        <aside className={`w-72 bg-white border-r border-slate-200 flex flex-col min-h-0 shrink-0 transition-all z-20 ${
          isSidebarOpenMobile ? 'absolute inset-y-0 left-0 shadow-2xl' : 'hidden lg:flex'
        }`}>
          {/* Search & Subject Filters */}
          <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif] uppercase tracking-wider">
                Question Index
              </span>
              <button
                type="button"
                onClick={handleAddNewQuestion}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Q
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Q# or keyword..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(['All', 'Physics', 'Chemistry', 'Biology'] as const).map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setFilterSubject(subj)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer shrink-0 ${
                    filterSubject === subj
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>

            {/* Needs Review Toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-amber-700 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={filterReviewOnly}
                onChange={e => setFilterReviewOnly(e.target.checked)}
                className="rounded text-amber-600 focus:ring-0 cursor-pointer"
              />
              <span>Review flagged only</span>
            </label>

            {/* Diagram Questions Only Toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-purple-700 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={filterFiguresOnly}
                onChange={e => setFilterFiguresOnly(e.target.checked)}
                className="rounded text-purple-600 focus:ring-0 cursor-pointer"
              />
              <span>🖼️ Diagram questions only ({questionsList.filter(q => q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0)).length})</span>
            </label>
          </div>

          {/* List of Questions */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 overscroll-contain">
            {filteredQuestions.map((q, idx) => {
              const actualIdx = questionsList.findIndex(item => (item.id && q.id ? item.id === q.id : item.questionNumber === q.questionNumber));
              const isSelected = actualIdx === selectedQIndex;
              const hasHindi = Boolean(q.languages?.hi?.questionText);
              const hasFigure = Boolean(q.figureUrl || q.questionImageUrl);

              return (
                <button
                  key={q.id ? `${q.id}-${idx}` : `canvas-q-${q.questionNumber}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedQIndex(actualIdx);
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[11px] font-black font-['Outfit',sans-serif] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Q{q.questionNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 truncate">
                        {q.subject}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate leading-snug">
                      {q.languages?.en?.questionText || q.questionText || 'Empty question'}
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] font-bold px-1 rounded ${
                        hasHindi ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {hasHindi ? 'HI' : 'NO-HI'}
                      </span>
                      {hasFigure && (
                        <span className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-800" title="Scientific Diagram attached">
                          FIG
                        </span>
                      )}
                    </div>
                    {q.needsReview && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Flagged for review" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Left panel bottom stats */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between font-bold">
            <span>Total: {questionsList.length} Qs</span>
            <span className="text-amber-600">
              {questionsList.filter(q => q.needsReview).length} Need Review
            </span>
          </div>
        </aside>

        {/* 2. CENTER COLUMN: INTERACTIVE QUESTION CANVAS / WYSIWYG */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 flex flex-col items-center overscroll-contain pb-32">
          
          {/* Canvas Container with Device Dimensions */}
          <div className={`w-full transition-all duration-200 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden ${
            devicePreviewMode === 'mobile'
              ? 'max-w-[420px]'
              : devicePreviewMode === 'tablet'
              ? 'max-w-[768px]'
              : 'max-w-[980px]'
          }`}>

            {/* Canvas Sub-Header: Question Meta & Navigation */}
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  Question {currentQ?.questionNumber}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  currentQ?.subject === 'Physics' ? 'bg-cyan-100 text-cyan-800' :
                  currentQ?.subject === 'Chemistry' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-indigo-100 text-indigo-800'
                }`}>
                  {currentQ?.subject}
                </span>
                {currentQ?.needsReview && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" /> Review Flagged
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedQIndex === 0}
                  onClick={() => setSelectedQIndex(Math.max(0, selectedQIndex - 1))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {selectedQIndex + 1} of {questionsList.length}
                </span>
                <button
                  type="button"
                  disabled={selectedQIndex === questionsList.length - 1}
                  onClick={() => setSelectedQIndex(Math.min(questionsList.length - 1, selectedQIndex + 1))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Next Question"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Body: Question Editing & Scientific Diagram */}
            <div className="p-5 sm:p-7 space-y-6">

              {/* BILINGUAL QUESTION TEXT EDITOR */}
              {editorLanguageMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                      <span>Question Text (English)</span>
                      <span className="text-[10px] text-blue-600 font-bold">🇬🇧 English</span>
                    </label>
                    <textarea
                      rows={4}
                      value={currentQ?.languages?.en?.questionText || currentQ?.questionText || ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateCurrentQuestion(q => ({
                          ...q,
                          questionText: val,
                          languages: {
                            ...q?.languages,
                            en: {
                              ...q?.languages?.en,
                              questionText: val,
                              options: q?.languages?.en?.options || q?.options || [],
                              explanation: q?.languages?.en?.explanation || q?.explanation || ''
                            }
                          }
                        }));
                      }}
                      placeholder="Enter question statement in English..."
                      className="w-full p-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Hindi Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                      <span>प्रश्न पाठ (हिंदी)</span>
                      <span className="text-[10px] text-emerald-600 font-bold">🇮🇳 हिंदी</span>
                    </label>
                    <textarea
                      rows={4}
                      value={currentQ?.languages?.hi?.questionText || ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateCurrentQuestion(q => ({
                          ...q,
                          languages: {
                            ...q?.languages,
                            hi: {
                              ...q?.languages?.hi,
                              questionText: val,
                              options: q?.languages?.hi?.options || q?.languages?.en?.options || q?.options || [],
                              explanation: q?.languages?.hi?.explanation || ''
                            }
                          }
                        }));
                      }}
                      placeholder="हिंदी में प्रश्न दर्ज करें..."
                      className="w-full p-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                    />
                  </div>
                </div>
              ) : editorLanguageMode === 'hi' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">
                      प्रश्न पाठ (हिंदी संस्करण)
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      🇮🇳 Hindi Active
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={currentQ?.languages?.hi?.questionText || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateCurrentQuestion(q => ({
                        ...q,
                        languages: {
                          ...q?.languages,
                          hi: {
                            ...q?.languages?.hi,
                            questionText: val,
                            options: q?.languages?.hi?.options || q?.languages?.en?.options || q?.options || [],
                            explanation: q?.languages?.hi?.explanation || ''
                          }
                        }
                      }));
                    }}
                    placeholder="हिंदी में प्रश्न विवरण दर्ज करें..."
                    className="w-full p-3.5 text-sm sm:text-base border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">
                      Question Statement (English Version)
                    </label>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      🇬🇧 English Active
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={currentQ?.languages?.en?.questionText || currentQ?.questionText || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateCurrentQuestion(q => ({
                        ...q,
                        questionText: val,
                        languages: {
                          ...q?.languages,
                          en: {
                            ...q?.languages?.en,
                            questionText: val,
                            options: q?.languages?.en?.options || q?.options || [],
                            explanation: q?.languages?.en?.explanation || q?.explanation || ''
                          }
                        }
                      }));
                    }}
                    placeholder="Enter full question statement..."
                    className="w-full p-3.5 text-sm sm:text-base border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                  />
                </div>
              )}

              {/* SCIENTIFIC DIAGRAM / ORIGINAL FIGURE CONTAINER */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                      Original Scientific Figure (Paper Chromatography / Diagram / Circuit)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onRequestCropFromPdf && (
                      <button
                        type="button"
                        onClick={() => onRequestCropFromPdf(currentQ.questionNumber, 'question')}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" /> Crop from PDF
                      </button>
                    )}
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" /> Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const dataUrl = ev.target?.result as string;
                              updateCurrentQuestion(q => ({
                                ...q,
                                figureUrl: dataUrl,
                                questionImageUrl: dataUrl,
                                figures: [dataUrl]
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {currentQ?.figureUrl || currentQ?.questionImageUrl ? (
                  <div className="relative bg-white p-3 rounded-xl border border-slate-200 max-w-md mx-auto text-center group">
                    <img
                      src={currentQ.figureUrl || currentQ.questionImageUrl}
                      alt="Question Scientific Figure"
                      className="max-h-56 mx-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentQuestion(q => ({
                          ...q,
                          figureUrl: undefined,
                          questionImageUrl: undefined,
                          figures: []
                        }));
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition cursor-pointer"
                      title="Remove diagram"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                    <p className="text-xs text-slate-400">
                      No diagram attached. If this question has a figure in the PDF, click "Crop from PDF" or "Upload Image".
                    </p>
                  </div>
                )}
              </div>

              {/* OPTIONS (A, B, C, D) SECTION */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-['Outfit',sans-serif]">
                    Multiple Choice Options (Select Correct Answer)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    Correct Option: <strong className="font-black text-sm">{currentQ?.correctAnswer}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map(lbl => {
                    const isCorrect = currentQ?.correctAnswer === lbl;
                    const optEn = currentQ?.languages?.en?.options?.find(o => o.label === lbl);
                    const optHi = currentQ?.languages?.hi?.options?.find(o => o.label === lbl);
                    const optFigure = currentQ?.optionFigures?.[lbl] || optEn?.imageUrl;

                    return (
                      <div
                        key={lbl}
                        className={`p-3 rounded-2xl border-2 transition-all space-y-2.5 ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Option Header & Correct Radio */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="correctAnswerOption"
                              checked={isCorrect}
                              onChange={() => {
                                updateCurrentQuestion(q => ({
                                  ...q,
                                  correctAnswer: lbl
                                }));
                              }}
                              className="w-4 h-4 text-emerald-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {lbl}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {isCorrect ? 'Correct Answer' : `Option ${lbl}`}
                            </span>
                          </label>

                          {/* Option Figure Upload / Crop */}
                          <div className="flex items-center gap-1">
                            {onRequestCropFromPdf && (
                              <button
                                type="button"
                                onClick={() => onRequestCropFromPdf(currentQ.questionNumber, `option_${lbl}` as any)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                title={`Crop chemical structure for Option ${lbl}`}
                              >
                                <Crop className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <label className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer" title="Attach option image">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = ev => {
                                      const dataUrl = ev.target?.result as string;
                                      updateCurrentQuestion(q => {
                                        const updatedOpts = (q.options || []).map(o => {
                                          if (o.label === lbl) {
                                            return { ...o, imageUrl: dataUrl, type: 'text_and_image' as const };
                                          }
                                          return o;
                                        });
                                        return {
                                          ...q,
                                          options: updatedOpts,
                                          optionFigures: {
                                            ...q.optionFigures,
                                            [lbl]: dataUrl
                                          }
                                        };
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Option Text Input (English & Hindi) */}
                        <div className="space-y-1.5">
                          {editorLanguageMode !== 'hi' && (
                            <input
                              type="text"
                              value={optEn?.value || ''}
                              onChange={e => {
                                const val = e.target.value;
                                updateCurrentQuestion(q => {
                                  const enList = [...(q?.languages?.en?.options || q?.options || [])];
                                  const idx = enList.findIndex(o => o.label === lbl);
                                  if (idx >= 0) enList[idx] = { ...enList[idx], value: val };
                                  return {
                                    ...q,
                                    options: enList,
                                    languages: {
                                      ...q?.languages,
                                      en: {
                                        ...q?.languages?.en,
                                        questionText: q?.languages?.en?.questionText || q?.questionText || '',
                                        options: enList,
                                        explanation: q?.languages?.en?.explanation || q?.explanation || ''
                                      }
                                    }
                                  };
                                });
                              }}
                              placeholder={`Option ${lbl} text (English)...`}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500"
                            />
                          )}

                          {(editorLanguageMode === 'hi' || editorLanguageMode === 'side-by-side') && (
                            <input
                              type="text"
                              value={optHi?.value || ''}
                              onChange={e => {
                                const val = e.target.value;
                                updateCurrentQuestion(q => {
                                  const hiList = [...(q?.languages?.hi?.options || q?.languages?.en?.options || q?.options || [])];
                                  const idx = hiList.findIndex(o => o.label === lbl);
                                  if (idx >= 0) hiList[idx] = { ...hiList[idx], value: val };
                                  return {
                                    ...q,
                                    languages: {
                                      ...q?.languages,
                                      hi: {
                                        ...q?.languages?.hi,
                                        questionText: q?.languages?.hi?.questionText || '',
                                        options: hiList,
                                        explanation: q?.languages?.hi?.explanation
                                      }
                                    }
                                  };
                                });
                              }}
                              placeholder={`विकल्प ${lbl} पाठ (हिंदी)...`}
                              className="w-full px-3 py-1.5 text-xs bg-emerald-50/50 border border-emerald-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-sans"
                            />
                          )}
                        </div>

                        {/* Option Chemical Structure / Figure Preview */}
                        {optFigure && (
                          <div className="relative bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center">
                            <img
                              src={optFigure}
                              alt={`Option ${lbl} diagram`}
                              className="max-h-20 mx-auto object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateCurrentQuestion(q => {
                                  const updatedOptionFigures = { ...q.optionFigures };
                                  delete updatedOptionFigures[lbl];
                                  const updatedOpts = q.options.map(o => o.label === lbl ? { ...o, imageUrl: undefined, type: 'text' as const } : o);
                                  return {
                                    ...q,
                                    options: updatedOpts,
                                    optionFigures: updatedOptionFigures
                                  };
                                });
                              }}
                              className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded text-[10px]"
                              title="Remove option image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EXPLANATION / SOLUTION SECTION */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>Detailed Solution & NCERT Explanation</span>
                  <span className="text-[10px] text-slate-400">Shown after student test submission</span>
                </label>
                <textarea
                  rows={3}
                  value={currentQ?.explanation || currentQ?.languages?.en?.explanation || ''}
                  onChange={e => {
                    const val = e.target.value;
                    updateCurrentQuestion(q => ({
                      ...q,
                      explanation: val,
                      languages: {
                        ...q?.languages,
                        en: {
                          ...q?.languages?.en,
                          questionText: q?.languages?.en?.questionText || q?.questionText || '',
                          options: q?.languages?.en?.options || q?.options || [],
                          explanation: val
                        }
                      }
                    }));
                  }}
                  placeholder="Provide step-by-step scientific justification, chemical formula derivations, or NCERT page references..."
                  className="w-full p-3 text-xs sm:text-sm border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

            </div>

            {/* Canvas Footer Bar */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteCurrentQuestion}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Question</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedQIndex < questionsList.length - 1) {
                      setSelectedQIndex(selectedQIndex + 1);
                    } else {
                      handleAddNewQuestion();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
                >
                  {selectedQIndex < questionsList.length - 1 ? 'Save & Next Question →' : '+ Add Question'}
                </button>
              </div>
            </div>

          </div>
        </main>

        {/* 3. RIGHT COLUMN: QUESTION METADATA & SETTINGS */}
        <aside className={`w-72 bg-white border-l border-slate-200 flex flex-col min-h-0 shrink-0 transition-all z-20 ${
          isSettingsOpenMobile ? 'absolute inset-y-0 right-0 shadow-2xl' : 'hidden xl:flex'
        }`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 font-['Outfit',sans-serif] uppercase tracking-wider">
              Question Settings
            </h3>
            {isSettingsOpenMobile && (
              <button
                type="button"
                onClick={() => setIsSettingsOpenMobile(false)}
                className="text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs overscroll-contain pb-32">
            
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Subject</label>
              <select
                value={currentQ?.subject || 'Biology'}
                onChange={e => {
                  const s = e.target.value as MockSubject;
                  updateCurrentQuestion(q => ({ ...q, subject: s }));
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            {/* Chapter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Chapter / Topic</label>
              <input
                type="text"
                value={currentQ?.chapter || ''}
                onChange={e => {
                  const ch = e.target.value;
                  updateCurrentQuestion(q => ({ ...q, chapter: ch }));
                }}
                placeholder="e.g. Solutions, Optics, Biomolecules"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Difficulty</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Easy', 'Moderate', 'Hard'] as MockQuestionDifficulty[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateCurrentQuestion(q => ({ ...q, difficulty: d }))}
                    className={`py-1.5 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                      currentQ?.difficulty === d
                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Marking Scheme */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block">Marks (+)</label>
                <input
                  type="number"
                  value={currentQ?.marks ?? 4}
                  onChange={e => {
                    const m = parseInt(e.target.value, 10);
                    updateCurrentQuestion(q => ({ ...q, marks: isNaN(m) ? 4 : m }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block">Negative (-)</label>
                <input
                  type="number"
                  value={currentQ?.negativeMarks ?? 1}
                  onChange={e => {
                    const n = parseInt(e.target.value, 10);
                    updateCurrentQuestion(q => ({ ...q, negativeMarks: isNaN(n) ? 1 : n }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600"
                />
              </div>
            </div>

            {/* Bilingual Status Panel */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-black text-slate-800 uppercase tracking-wider text-[10px] block font-['Outfit',sans-serif]">
                Bilingual Translation Status
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">English Text:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Hindi Text:</span>
                {currentQ?.languages?.hi?.questionText ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <X className="w-3 h-3" /> Missing
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Scientific Figure:</span>
                {currentQ?.figureUrl || currentQ?.questionImageUrl ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Attached
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">None</span>
                )}
              </div>
            </div>

            {/* Needs Review Flag */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
              <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentQ?.needsReview)}
                  onChange={e => {
                    const ch = e.target.checked;
                    updateCurrentQuestion(q => ({
                      ...q,
                      needsReview: ch,
                      reviewReason: ch ? q.reviewReason || 'Manual review requested' : undefined
                    }));
                  }}
                  className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                />
                <span>Flag for Admin Review</span>
              </label>

              {currentQ?.needsReview && (
                <input
                  type="text"
                  value={currentQ.reviewReason || ''}
                  onChange={e => {
                    const r = e.target.value;
                    updateCurrentQuestion(q => ({ ...q, reviewReason: r }));
                  }}
                  placeholder="Reason (e.g. check Hindi diagram)..."
                  className="w-full p-1.5 bg-white border border-amber-300 rounded-lg text-[11px] text-amber-900 focus:outline-none"
                />
              )}
            </div>

          </div>
        </aside>

      </div>

    </div>
  );
};
