import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Crop, 
  Edit3, 
  Trash2, 
  ZoomIn, 
  Image as ImageIcon, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Columns,
  Wand2,
  AlertTriangle,
  FileSearch,
  Table as TableIcon
} from 'lucide-react';
import { Parser2Question, isPlaceholderOption } from '../../services/parser2/types';
import { cleanQuestionTextForMatchTable, hasSuspiciousMathNotation } from '../../lib/mockTestData';
import { isQuestionTextTruncated } from '../../services/parser2/layoutEngine';
import { MathRenderer } from '../common/MathRenderer';

interface Parser2QuestionCardProps {
  question: Parser2Question;
  onEdit: (q: Parser2Question) => void;
  onCopyFromPage?: (q: Parser2Question) => void;
  onRecrop: (q: Parser2Question, targetOption?: 'A' | 'B' | 'C' | 'D') => void;
  onDelete: (questionId: string) => void;
  onMarkVerified: (questionId: string) => void;
  onRemoveFigure?: (questionId: string) => void;
  onAutoRecrop?: (questionId: string, targetOption?: 'A' | 'B' | 'C' | 'D') => Promise<void> | void;
}

export const Parser2QuestionCard: React.FC<Parser2QuestionCardProps> = ({
  question,
  onEdit,
  onCopyFromPage,
  onRecrop,
  onDelete,
  onMarkVerified,
  onRemoveFigure,
  onAutoRecrop
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isAutoLocating, setIsAutoLocating] = useState(false);

  const validOptionsCount = (question.options || []).filter(o => {
    const optImg = o.imageUrl || question.optionFigures?.[o.label];
    if (optImg) return true;
    const val = (o.value || o.text || '').trim();
    return Boolean(val && !isPlaceholderOption(val) && !/^\[Figure\s+[A-D]\]$/i.test(val));
  }).length;

  const hasIncompleteOptions = !question.options || question.options.length < 4 || validOptionsCount < 4;
  const isTruncatedStem = !question.adminOverride && isQuestionTextTruncated(question.questionText);
  const isMissingTable = question.verificationStatus === 'table_incomplete';
  const hasMathArtifacts =
    !question.adminOverride &&
    (hasSuspiciousMathNotation(question.questionText || '').suspect ||
      (question.options || []).some(o => hasSuspiciousMathNotation(o.value || o.text || '').suspect) ||
      question.verificationStatus === 'symbol_review');
  const needsVisualAttention =
    !question.adminOverride &&
    (hasIncompleteOptions ||
      isTruncatedStem ||
      isMissingTable ||
      hasMathArtifacts ||
      question.reviewRequired ||
      question.verificationStatus === 'missing_figure' ||
      question.verificationStatus === 'options_incomplete' ||
      question.verificationStatus === 'text_incomplete' ||
      question.verificationStatus === 'symbol_review' ||
      question.verificationStatus === 'figure_mismatch');

  const handleAutoLocate = async (targetOption?: 'A' | 'B' | 'C' | 'D') => {
    if (!onAutoRecrop || isAutoLocating) return;
    setIsAutoLocating(true);
    try {
      await onAutoRecrop(question.id, targetOption);
    } finally {
      setIsAutoLocating(false);
    }
  };

  const getStatusBadge = () => {
    if (hasIncompleteOptions || question.verificationStatus === 'options_incomplete') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3 text-rose-700" /> Options Incomplete
        </span>
      );
    }

    switch (question.verificationStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
          </span>
        );
      case 'missing_figure':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            <ImageIcon className="w-3 h-3 text-rose-600" /> Diagram Required
          </span>
        );
      case 'figure_mismatch':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-fuchsia-800 bg-fuchsia-50 border border-fuchsia-200 px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-fuchsia-600" /> Figure Mismatch
          </span>
        );
      case 'table_incomplete':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
            <TableIcon className="w-3 h-3 text-rose-700" /> Table Incomplete
          </span>
        );
      case 'text_incomplete':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-orange-600" /> Text Incomplete
          </span>
        );
      case 'symbol_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-purple-600" /> Symbol Review
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Needs Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
            Pending
          </span>
        );
    }
  };

  const hasMatchRows = Boolean(question.matchTable?.rows?.length);
  const hasStructuredRows = Boolean(question.structuredTable?.rows?.length);
  const needsTableCheck = isMissingTable || hasMatchRows || hasStructuredRows;

  return (
    <div className={`p-3 sm:p-4 rounded-2xl border transition-all shadow-xs ${
      needsVisualAttention
        ? 'bg-amber-50/20 border-amber-300 hover:border-amber-400' 
        : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
            {question.questionNumber}
          </span>
          <span className="text-xs font-bold text-slate-900">
            {question.subject} {question.chapter ? `• ${question.chapter}` : ''}
          </span>
          <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            Page {question.sourcePageNumber || 1}
          </span>
          {typeof question.confidenceScore === 'number' && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              question.confidenceScore >= 85 ? 'bg-emerald-50 text-emerald-700' :
              question.confidenceScore >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {Math.round(question.confidenceScore <= 1 ? question.confidenceScore * 100 : question.confidenceScore)}%
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {getStatusBadge()}
          {question.adminOverride && (
            <span
              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full"
              title={question.adminOverrideNotes || 'Verified manually by Admin against original PDF'}
            >
              Admin Override
            </span>
          )}
          {question.isManuallyEdited && (
            <span
              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"
              title="Human edits are preserved across pipeline re-runs"
            >
              Manually Edited
            </span>
          )}
          {(question.answerStatus === 'answer_missing' || !question.correctAnswer) && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
              Answer Missing
            </span>
          )}
          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase">
            {question.questionType.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Concise Per-Field Integrity Audit Strip */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
        <span className={`px-1.5 py-0.5 rounded border ${isTruncatedStem ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          Text: {isTruncatedStem ? 'Incomplete' : 'OK'}
        </span>
        <span className={`px-1.5 py-0.5 rounded border ${hasMathArtifacts ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          Symbols: {hasMathArtifacts ? 'Review' : 'OK'}
        </span>
        <span className={`px-1.5 py-0.5 rounded border ${validOptionsCount < 4 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          Opts: {validOptionsCount}/4
        </span>
        {needsTableCheck && (
          <span className={`px-1.5 py-0.5 rounded border ${isMissingTable ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            Table: {isMissingTable ? 'Missing' : 'OK'}
          </span>
        )}
        {(question.hasDiagram || question.figureUrl || question.verificationStatus === 'missing_figure' || question.verificationStatus === 'figure_mismatch') && (
          <span className={`px-1.5 py-0.5 rounded border ${
            question.verificationStatus === 'missing_figure' || question.verificationStatus === 'figure_mismatch'
              ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            Diagram: {question.verificationStatus === 'missing_figure' ? 'Required' : question.verificationStatus === 'figure_mismatch' ? 'Mismatch' : 'Attached'}
          </span>
        )}
        <span className={`px-1.5 py-0.5 rounded border ${!question.correctAnswer ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          Ans: {question.correctAnswer || 'Missing'}
        </span>
      </div>

      {/* Review Notes Warning if flagged */}
      {(hasIncompleteOptions || isTruncatedStem || isMissingTable || hasMathArtifacts || (question.reviewRequired && question.reviewNotes) || question.verificationStatus === 'missing_figure' || question.verificationStatus === 'figure_mismatch') && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Review Note: </span>
            {isMissingTable
              ? (question.reviewNotes || 'Match-the-column / table question is missing its List I / List II table. Click "Copy from Page" or "Edit" to recover from the PDF page.')
              : hasIncompleteOptions
              ? (question.reviewNotes || 'One or more options are missing or placeholders. Click "Copy from Page" or "Edit" to restore authentic options.')
              : question.reviewNotes || 'Inspection required before publishing.'}
          </div>
        </div>
      )}

      {/* Question Statement */}
      <div className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed mb-3 font-sans">
        <MathRenderer
          text={cleanQuestionTextForMatchTable(question.questionText, question.matchTable)}
          className="inline-block w-full"
        />
      </div>

      {/* Attached Scientific Figure / Diagram */}
      {question.figureUrl && (
        <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-bold mb-1.5 px-1">
            <span className="flex items-center gap-1 text-blue-600">
              <Sparkles className="w-3.5 h-3.5" /> Original Scientific Figure
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoomedImage(question.figureUrl || null)}
                className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" /> Full Size
              </button>
              <button
                type="button"
                onClick={() => onRecrop(question)}
                className="text-amber-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Crop className="w-3.5 h-3.5" /> Recrop
              </button>
              {onRemoveFigure && (
                <button
                  type="button"
                  onClick={() => onRemoveFigure(question.id)}
                  className="text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  title="Remove incorrect figure"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Figure
                </button>
              )}
            </div>
          </div>

          <img
            src={question.figureUrl}
            alt={`Figure for Question ${question.questionNumber}`}
            className="max-h-52 mx-auto object-contain rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xs cursor-pointer"
            onClick={() => setZoomedImage(question.figureUrl || null)}
          />

          {(question.figures || []).filter(f => f.figureUrl && f.figureUrl !== question.figureUrl).length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-center gap-2">
              {(question.figures || [])
                .filter(f => f.figureUrl && f.figureUrl !== question.figureUrl)
                .map((extraFig, idx) => (
                  <img
                    key={extraFig.id || idx}
                    src={extraFig.figureUrl}
                    alt={`Additional figure ${idx + 2} for Q${question.questionNumber}`}
                    className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer hover:border-blue-400"
                    onClick={() => setZoomedImage(extraFig.figureUrl)}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Match The Column Table */}
      {question.matchTable && question.matchTable.rows && question.matchTable.rows.length > 0 && (
        <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
          <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200">
            <Columns className="w-3.5 h-3.5 text-blue-600" /> Match the Column
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold text-[11px]">
                <th className="px-3 py-1.5 w-1/2">{question.matchTable.columnAHeader || 'Column I'}</th>
                <th className="px-3 py-1.5 w-1/2">{question.matchTable.columnBHeader || 'Column II'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {question.matchTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-1.5 font-medium text-slate-800">
                    <span className="font-bold text-blue-600 mr-1.5">({row.colAKey})</span>
                    <MathRenderer as="span" text={row.colAText} className="inline" />
                  </td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">
                    <span className="font-bold text-indigo-600 mr-1.5">({row.colBKey})</span>
                    <MathRenderer as="span" text={row.colBText} className="inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Structured Data Table */}
      {question.structuredTable && question.structuredTable.rows && question.structuredTable.rows.length > 0 && (
        <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white text-xs">
          <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200">
            <TableIcon className="w-3.5 h-3.5 text-indigo-600" /> Data Table
          </div>
          <table className="w-full text-left border-collapse">
            {question.structuredTable.headers && question.structuredTable.headers.length > 0 && (
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-bold text-[11px]">
                  {question.structuredTable.headers.map((hdr, hIdx) => (
                    <th key={hIdx} className="px-3 py-1.5">
                      <MathRenderer as="span" text={hdr} className="inline" />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100">
              {question.structuredTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 font-medium text-slate-800">
                      <MathRenderer as="span" text={cell} className="inline" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
        {(question.options || []).map((opt) => {
          const isCorrect = question.correctAnswer === opt.label;
          const optImage = opt.imageUrl || question.optionFigures?.[opt.label];
          const rawOptText = (opt.value || opt.text || '').trim();
          const isFigurePlaceholderTag = /^\[Figure\s+[A-D]\]$/i.test(rawOptText);
          const isPlaceholder = !optImage && (!rawOptText || isPlaceholderOption(rawOptText) || isFigurePlaceholderTag);

          return (
            <div
              key={opt.label}
              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                isPlaceholder
                  ? 'bg-rose-50/70 border-rose-300 text-rose-900 font-medium'
                  : isCorrect 
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold' 
                    : 'bg-slate-50/60 border-slate-200 text-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] shrink-0 ${
                isPlaceholder
                  ? 'bg-rose-500 text-white'
                  : isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {opt.label}
              </span>

              <div className="flex-1 min-w-0">
                {isPlaceholder ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-rose-800 italic font-semibold">
                      (Missing — click Edit or Crop Option)
                    </span>
                    <button
                      type="button"
                      onClick={() => onRecrop(question, opt.label)}
                      className="text-[10px] font-bold text-blue-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Crop Opt
                    </button>
                  </div>
                ) : (
                  <>
                    {rawOptText && !isFigurePlaceholderTag && (
                      <div className="leading-snug">
                        <MathRenderer text={rawOptText} className="inline" />
                      </div>
                    )}
                    {optImage && (
                      <div className="mt-1 flex items-center gap-2">
                        <img
                          src={optImage}
                          alt={`Option ${opt.label} diagram`}
                          className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer"
                          onClick={() => setZoomedImage(optImage)}
                        />
                        <button
                          type="button"
                          onClick={() => onRecrop(question, opt.label)}
                          className="text-[10px] font-bold text-amber-600 hover:underline shrink-0 cursor-pointer"
                          title={`Recrop Option ${opt.label}`}
                        >
                          Recrop
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation Toggle */}
      {question.explanation && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showExplanation ? 'Hide Step-by-Step Solution' : 'View Step-by-Step Solution'}
          </button>

          {showExplanation && (
            <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-800 leading-relaxed">
              <span className="font-bold text-blue-900 block mb-1">Solution / Explanation:</span>
              <MathRenderer text={question.explanation} className="inline-block w-full" />
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          {question.reviewRequired && (
            <button
              type="button"
              onClick={() => onMarkVerified(question.id)}
              disabled={hasIncompleteOptions || isTruncatedStem || isMissingTable}
              title={hasIncompleteOptions || isTruncatedStem || isMissingTable ? 'Fix incomplete options, table, or text before verifying' : 'Approve and mark verified'}
              className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Verify
            </button>
          )}

          {onAutoRecrop && (question.verificationStatus === 'missing_figure' || question.verificationStatus === 'figure_mismatch' || question.verificationStatus === 'options_incomplete' || hasIncompleteOptions) && (
            <button
              type="button"
              onClick={() => handleAutoLocate()}
              disabled={isAutoLocating}
              className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <Wand2 className={`w-3.5 h-3.5 ${isAutoLocating ? 'animate-spin' : ''}`} />
              {isAutoLocating ? 'AI Locating...' : 'AI Auto-Locate'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onRecrop(question)}
            className="text-[11px] font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Crop className="w-3.5 h-3.5" /> {question.figureUrl ? 'Recrop Figure' : 'Add Diagram Crop'}
          </button>

          <button
            type="button"
            onClick={() => (onCopyFromPage ? onCopyFromPage(question) : onEdit(question))}
            className="text-[11px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            title="View original PDF page side-by-side and copy missing text, options, table, or diagram"
          >
            <FileSearch className="w-3.5 h-3.5" /> View Original PDF Page
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 p-1 rounded-lg transition cursor-pointer"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full-size Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl p-4 border border-slate-200 shadow-2xl overflow-auto">
            <img
              src={zoomedImage}
              alt="High resolution diagram zoom"
              className="max-h-[75vh] w-auto mx-auto object-contain"
            />
            <div className="text-center mt-3 text-xs text-slate-500 font-bold">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
