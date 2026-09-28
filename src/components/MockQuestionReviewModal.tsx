import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Crop, 
  Upload, 
  Trash2, 
  Table as TableIcon, 
  Plus, 
  Sparkles,
  HelpCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { MockQuestion, MockSubject, MockMatchTable, MockMatchTableRow } from '../types';

interface MockQuestionReviewModalProps {
  question: MockQuestion;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedQuestion: MockQuestion) => void;
  onTriggerReCropFromPdf?: (question: MockQuestion) => void;
  currentPdfPage?: number;
}

export const MockQuestionReviewModal: React.FC<MockQuestionReviewModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
  onTriggerReCropFromPdf,
  currentPdfPage
}) => {
  if (!isOpen || !question) return null;

  const [subject, setSubject] = useState<MockSubject>(question?.subject || 'Chemistry');
  const [chapter, setChapter] = useState<string>(question?.chapter || '');
  const [questionText, setQuestionText] = useState<string>(
    question?.languages?.en?.questionText || question?.questionText || ''
  );
  const [hindiQuestionText, setHindiQuestionText] = useState<string>(
    question?.languages?.hi?.questionText || ''
  );

  // Options state
  const [options, setOptions] = useState<Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string; imageUrl?: string }>>(() => {
    const rawOpts = question?.options || [];
    return (['A', 'B', 'C', 'D'] as const).map(label => {
      const found = rawOpts.find(o => o.label === label);
      return {
        label,
        value: found?.value || '',
        imageUrl: found?.imageUrl
      };
    });
  });

  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>(question?.correctAnswer || 'A');

  // Figure state
  const [figureUrl, setFigureUrl] = useState<string | undefined>(
    question?.figureUrl || question?.questionImageUrl || (question?.figures && question.figures[0])
  );

  // Match-the-Column Table state
  const initialMatch = question?.matchTable || question?.languages?.en?.matchTable;
  const [hasMatchTable, setHasMatchTable] = useState<boolean>(Boolean(initialMatch && initialMatch.rows && initialMatch.rows.length > 0));
  const [column1Header, setColumn1Header] = useState<string>(initialMatch?.column1Header || 'Column I');
  const [column2Header, setColumn2Header] = useState<string>(initialMatch?.column2Header || 'Column II');
  const [matchRows, setMatchRows] = useState<MockMatchTableRow[]>(() => {
    if (initialMatch?.rows && initialMatch.rows.length > 0) {
      return [...initialMatch.rows];
    }
    return [
      { leftKey: '(A)', leftText: '', rightKey: '(p)', rightText: '' },
      { leftKey: '(B)', leftText: '', rightKey: '(q)', rightText: '' },
      { leftKey: '(C)', leftText: '', rightKey: '(r)', rightText: '' },
      { leftKey: '(D)', leftText: '', rightKey: '(s)', rightText: '' },
    ];
  });

  // Handle image upload from computer
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFigureUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMatchRow = () => {
    const nextIdx = matchRows.length;
    const leftKeys = ['(A)', '(B)', '(C)', '(D)', '(E)', '(F)'];
    const rightKeys = ['(p)', '(q)', '(r)', '(s)', '(t)', '(u)'];
    setMatchRows([
      ...matchRows,
      {
        leftKey: leftKeys[nextIdx] || `(${nextIdx + 1})`,
        leftText: '',
        rightKey: rightKeys[nextIdx] || `(${nextIdx + 1})`,
        rightText: ''
      }
    ]);
  };

  const handleRemoveMatchRow = (index: number) => {
    setMatchRows(matchRows.filter((_, i) => i !== index));
  };

  const handleUpdateMatchRow = (index: number, field: keyof MockMatchTableRow, val: string) => {
    setMatchRows(matchRows.map((r, i) => i === index ? { ...r, [field]: val } : r));
  };

  const handleSave = () => {
    const constructedMatchTable: MockMatchTable | undefined = hasMatchTable ? {
      column1Header,
      column2Header,
      rows: matchRows.filter(r => r.leftText.trim() || r.rightText.trim())
    } : undefined;

    const updatedQuestion: MockQuestion = {
      ...question,
      subject,
      chapter: chapter.trim() || question.chapter || `${subject} Core`,
      questionText: questionText.trim(),
      options: options.map(o => ({
        label: o.label,
        type: o.imageUrl ? 'image' : 'text',
        value: o.value,
        imageUrl: o.imageUrl
      })),
      correctAnswer,
      figureUrl: figureUrl,
      questionImageUrl: figureUrl,
      figures: figureUrl ? [figureUrl] : [],
      matchTable: constructedMatchTable,
      languages: {
        en: {
          questionText: questionText.trim(),
          options: options.map(o => ({
            label: o.label,
            type: o.imageUrl ? 'image' : 'text',
            value: o.value,
            imageUrl: o.imageUrl
          })),
          figureUrl: figureUrl,
          matchTable: constructedMatchTable
        },
        hi: hindiQuestionText.trim() ? {
          questionText: hindiQuestionText.trim(),
          options: options.map(o => ({
            label: o.label,
            type: o.imageUrl ? 'image' : 'text',
            value: o.value,
            imageUrl: o.imageUrl
          })),
          figureUrl: figureUrl,
          matchTable: constructedMatchTable
        } : question?.languages?.hi
      },
      needsReview: false
    };

    onSave(updatedQuestion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center font-['Outfit',sans-serif]">
              Q{question.questionNumber}
            </span>
            <div>
              <h3 className="text-base font-black font-['Outfit',sans-serif]">
                Admin Review &amp; Edit Question #{question.questionNumber}
              </h3>
              <p className="text-[11px] text-slate-300">
                Fine-tune verbatim text, diagram crop, options, and match-the-column tables
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
          
          {/* Metadata Row: Subject, Chapter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value as MockSubject)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chapter / Unit</label>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="e.g. Organic Chemistry, Hydrocarbons"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Question Text (English) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Verbatim Question Text (English) *
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs leading-relaxed focus:bg-white transition"
              placeholder="Paste exact verbatim question text..."
            />
          </div>

          {/* Question Text (Hindi, if applicable) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Hindi Translation / Devanagari Text (Optional)
            </label>
            <textarea
              rows={2}
              value={hindiQuestionText}
              onChange={e => setHindiQuestionText(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs leading-relaxed font-['Noto_Sans_Devanagari',sans-serif]"
              placeholder="हिंदी प्रश्न पाठ (वैकल्पिक)..."
            />
          </div>

          {/* DIAGRAM / FIGURE REVIEW AREA (Requirement 3 & 4) */}
          <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crop className="w-4 h-4 text-purple-700" />
                <h4 className="font-black text-slate-900 uppercase tracking-wide text-[11px]">
                  Original PDF Diagram / Figure Asset
                </h4>
              </div>
              {question.pdfPageNumber && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  PDF Page {question.pdfPageNumber}
                </span>
              )}
            </div>

            {figureUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <div className="max-w-[240px] max-h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center">
                  <img
                    src={figureUrl}
                    alt={`Q${question.questionNumber} Diagram`}
                    className="max-h-32 object-contain"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-700 block">
                    ✓ High-Resolution Lossless Original Crop Attached
                  </span>
                  <p className="text-[10.5px] text-slate-500">
                    Cropped directly from the PDF vector canvas without AI hallucination or redraw.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onTriggerReCropFromPdf && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTriggerReCropFromPdf(question);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Re-crop from PDF Page</span>
                      </button>
                    )}
                    <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFigureUrl(undefined)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-xl border border-dashed border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <span className="font-bold text-slate-700 block">No diagram attached to this question</span>
                  <p className="text-[10.5px] text-slate-400">
                    If this question contains a ray optics sketch, chemical mechanism, or graph, add it directly.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onTriggerReCropFromPdf && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onTriggerReCropFromPdf(question);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Crop from PDF Page</span>
                    </button>
                  )}
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* MATCH-THE-COLUMN TABLE EDITOR (Requirement 5) */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-black text-slate-900 text-xs">
                <input
                  type="checkbox"
                  checked={hasMatchTable}
                  onChange={e => setHasMatchTable(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <TableIcon className="w-4 h-4 text-blue-600" />
                <span>Match-the-Column Structured Table (Real Exam Format)</span>
              </label>

              {hasMatchTable && (
                <button
                  type="button"
                  onClick={handleAddMatchRow}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Row</span>
                </button>
              )}
            </div>

            {hasMatchTable && (
              <div className="space-y-2.5 bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Left Column Title</label>
                    <input
                      type="text"
                      value={column1Header}
                      onChange={e => setColumn1Header(e.target.value)}
                      placeholder="e.g. Column-I or List-I"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Right Column Title</label>
                    <input
                      type="text"
                      value={column2Header}
                      onChange={e => setColumn2Header(e.target.value)}
                      placeholder="e.g. Column-II or List-II"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {matchRows.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={row.leftKey}
                          onChange={e => handleUpdateMatchRow(rIdx, 'leftKey', e.target.value)}
                          placeholder="(A)"
                          className="w-full p-1 bg-white border border-slate-200 rounded text-center font-bold text-blue-700 text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={row.leftText}
                          onChange={e => handleUpdateMatchRow(rIdx, 'leftText', e.target.value)}
                          placeholder="e.g. Rosenmund Reduction"
                          className="w-full p-1 bg-white border border-slate-200 rounded font-medium text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={row.rightKey}
                          onChange={e => handleUpdateMatchRow(rIdx, 'rightKey', e.target.value)}
                          placeholder="(p)"
                          className="w-full p-1 bg-white border border-slate-200 rounded text-center font-bold text-indigo-700 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={row.rightText}
                          onChange={e => handleUpdateMatchRow(rIdx, 'rightText', e.target.value)}
                          placeholder="e.g. NH2NH2/KOH"
                          className="w-full p-1 bg-white border border-slate-200 rounded font-medium text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMatchRow(rIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete row"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OPTIONS & CORRECT ANSWER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block">
                Options &amp; Correct Answer Selection
              </label>
              <span className="text-[11px] text-slate-400">
                Click a letter to mark as the verified correct key
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt, i) => {
                const isCorrect = correctAnswer === opt.label;

                return (
                  <div
                    key={opt.label}
                    className={`p-2.5 rounded-xl border transition flex items-center gap-2 ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt.label)}
                      className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 transition cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={`Mark Option ${opt.label} as Correct Answer`}
                    >
                      {opt.label}
                    </button>
                    <input
                      type="text"
                      value={opt.value}
                      onChange={e => {
                        const newVal = e.target.value;
                        setOptions(options.map((o, idx) => idx === i ? { ...o, value: newVal } : o));
                      }}
                      placeholder={`Option ${opt.label} value...`}
                      className="w-full text-xs font-semibold p-1.5 bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Selected Correct Answer: <strong className="text-emerald-700">Option {correctAnswer}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
