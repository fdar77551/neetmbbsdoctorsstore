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
  Table as TableIcon,
  RefreshCw,
  Upload,
  XCircle
} from 'lucide-react';
import { Parser2ImagePlacement, Parser2Question, isPlaceholderOption } from '../../services/parser2/types';
import { cleanQuestionTextForMatchTable, hasSuspiciousMathNotation } from '../../lib/mockTestData';
import { isQuestionTextTruncated } from '../../services/parser2/layoutEngine';
import { MathRenderer } from '../common/MathRenderer';
import {
  QuestionStemWithAttachments,
  QuestionAttachmentStrip,
  RichMatchTableView,
  RichStructuredTableView
} from '../common/QuestionMediaBlocks';

interface Parser2QuestionCardProps {
  question: Parser2Question;
  onEdit: (q: Parser2Question) => void;
  onCopyFromPage?: (q: Parser2Question) => void;
  onRecrop: (q: Parser2Question, targetOption?: 'A' | 'B' | 'C' | 'D') => void;
  onDelete: (questionId: string) => void;
  onMarkVerified: (questionId: string) => void;
  onReject?: (questionId: string) => void;
  onRemoveFigure?: (questionId: string) => void;
  onRemoveOptionFigure?: (questionId: string, optionLabel: 'A' | 'B' | 'C' | 'D') => Promise<void> | void;
  onAutoRecrop?: (questionId: string, targetOption?: 'A' | 'B' | 'C' | 'D') => Promise<void> | void;
  onReExtract?: (questionId: string, mode: 'options' | 'question' | 'both') => Promise<void> | void;
  onQuickUploadImage?: (
    questionId: string,
    file: File,
    opts?: { placement?: Parser2ImagePlacement; targetOption?: 'A' | 'B' | 'C' | 'D' }
  ) => Promise<void> | void;
}

export const Parser2QuestionCard: React.FC<Parser2QuestionCardProps> = ({
  question,
  onEdit,
  onCopyFromPage,
  onRecrop,
  onDelete,
  onMarkVerified,
  onReject,
  onRemoveFigure,
  onRemoveOptionFigure,
  onAutoRecrop,
  onReExtract,
  onQuickUploadImage
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isAutoLocating, setIsAutoLocating] = useState(false);
  const [reExtractingMode, setReExtractingMode] = useState<'options' | 'question' | null>(null);
  const [isUploadingQuickImg, setIsUploadingQuickImg] = useState(false);
  const [quickUploadTarget, setQuickUploadTarget] = useState<{
    placement?: Parser2ImagePlacement;
    targetOption?: 'A' | 'B' | 'C' | 'D';
  }>({ placement: 'after_question' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quickUploadInputRef = React.useRef<HTMLInputElement>(null);

  const validOptionsCount = (question.options || []).filter(o => {
    const optImg = o.imageUrl || question.optionFigures?.[o.label];
    if (optImg) return true;
    const val = (o.value || o.text || '').trim();
    return Boolean(val && !isPlaceholderOption(val) && !/^\[Figure\s+[A-D]\]$/i.test(val));
  }).length;

  const hasIncompleteOptions = !question.options || question.options.length < 4 || validOptionsCount < 4;
  const isTruncatedStem = !question.adminOverride && isQuestionTextTruncated(question.questionText);
  const hasMatchRows = Boolean(question.matchTable?.rows?.length);
  const hasStructuredRows = !hasMatchRows && Boolean(question.structuredTable?.rows?.length);
  const isMissingTable = question.verificationStatus === 'table_incomplete' && !hasMatchRows && !hasStructuredRows;
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

  const handleReExtractClick = async (mode: 'options' | 'question') => {
    if (!onReExtract || reExtractingMode) return;
    setReExtractingMode(mode);
    try {
      await onReExtract(question.id, mode);
    } finally {
      setReExtractingMode(null);
    }
  };

  const triggerQuickUpload = (opts?: { placement?: Parser2ImagePlacement; targetOption?: 'A' | 'B' | 'C' | 'D' }) => {
    setQuickUploadTarget(opts || { placement: 'after_question' });
    setTimeout(() => quickUploadInputRef.current?.click(), 0);
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onQuickUploadImage) return;
    setIsUploadingQuickImg(true);
    try {
      await onQuickUploadImage(question.id, file, quickUploadTarget);
    } finally {
      setIsUploadingQuickImg(false);
    }
  };

  const getStatusBadge = () => {
    if (question.verificationStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
          <XCircle className="w-3 h-3 text-rose-700" /> Rejected / Failed
        </span>
      );
    }
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

  const needsTableCheck = isMissingTable || hasMatchRows || hasStructuredRows;
  const totalAttachedImagesCount = (() => {
    const urls = new Set<string>();
    if (question.figureUrl) urls.add(question.figureUrl);
    for (const f of question.figures || []) if (f.figureUrl) urls.add(f.figureUrl);
    for (const a of question.imageAttachments || []) if (a.url) urls.add(a.url);
    for (const o of question.options || []) {
      const u = o.imageUrl || question.optionFigures?.[o.label];
      if (u) urls.add(u);
    }
    return urls.size;
  })();

  return (
    <div className={`p-3 sm:p-4 rounded-2xl border transition-all shadow-xs ${
      needsVisualAttention
        ? 'bg-amber-50/20 border-amber-300 hover:border-amber-400' 
        : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
            {question.questionNumber}
          </span>
          <span className="text-xs font-bold text-slate-900">
            {question.subject} {question.chapter ? `• ${question.chapter}` : ''}
          </span>
          <span
            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
              (question.sourcePages?.length || 0) > 1
                ? 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                : 'text-slate-500 bg-slate-100'
            }`}
          >
            {question.sourcePageRange || `Page ${question.sourcePageNumber || 1}`}
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
        {totalAttachedImagesCount > 0 && (
          <span className="px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200">
            Images: {totalAttachedImagesCount}
          </span>
        )}
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

      {/* Question Statement + before_question / between_paragraphs / assertion_reason attachments */}
      <div className="mb-3">
        <QuestionStemWithAttachments
          text={cleanQuestionTextForMatchTable(question.questionText, question.matchTable)}
          attachments={question.imageAttachments}
          onZoom={url => setZoomedImage(url)}
          textClassName="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed font-sans"
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
                  <div key={extraFig.id || idx} className="flex flex-col items-center gap-1">
                    <img
                      src={extraFig.figureUrl}
                      alt={`Additional figure ${idx + 2} for Q${question.questionNumber}`}
                      className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer hover:border-blue-400"
                      onClick={() => setZoomedImage(extraFig.figureUrl)}
                    />
                    <span className="text-[9.5px] font-bold text-slate-500">
                      Pg {extraFig.pageNumber} · {(extraFig.cropType || extraFig.figureType || 'figure').replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Additional after_question imageAttachments not already shown as primary figureUrl */}
      <QuestionAttachmentStrip
        attachments={(question.imageAttachments || []).filter(
          a => a.placement === 'after_question' && a.url !== question.figureUrl
        )}
        placements={['after_question']}
        onZoom={url => setZoomedImage(url)}
      />

      {/* Match The Column Table (with cell/column images & border toggle) */}
      {question.matchTable && question.matchTable.rows && question.matchTable.rows.length > 0 && (
        <RichMatchTableView
          matchTable={question.matchTable}
          attachments={question.imageAttachments}
          defaultCol1="Column I"
          defaultCol2="Column II"
          onZoom={url => setZoomedImage(url)}
          titleHeader={
            <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 text-xs">
              <Columns className="w-3.5 h-3.5 text-blue-600" /> Match the Column
            </div>
          }
        />
      )}

      {/* Structured Data Table (with rowSpan/colSpan merged cells & cell images) */}
      {question.structuredTable && question.structuredTable.rows && question.structuredTable.rows.length > 0 && (
        <RichStructuredTableView
          table={question.structuredTable}
          attachments={question.imageAttachments}
          onZoom={url => setZoomedImage(url)}
          titleHeader={
            <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 text-xs">
              <TableIcon className="w-3.5 h-3.5 text-indigo-600" /> Data Table
            </div>
          }
        />
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
        {(question.options || []).map((opt) => {
          const isCorrect = question.correctAnswer === opt.label;
          const optImage = opt.imageUrl || question.optionFigures?.[opt.label];
          const extraOptImages = (question.imageAttachments || []).filter(
            a => a.placement === `option_${opt.label}` && a.url && a.url !== optImage
          );
          const hasAnyOptImage = Boolean(optImage || extraOptImages.length > 0);
          const rawOptText = (opt.value || opt.text || '').trim();
          const isFigurePlaceholderTag = /^\[Figure\s+[A-D]\]$/i.test(rawOptText);
          const isPlaceholder = !hasAnyOptImage && (!rawOptText || isPlaceholderOption(rawOptText) || isFigurePlaceholderTag);

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
                      (Missing — click Edit, Upload, or Crop Option)
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {onQuickUploadImage && (
                        <button
                          type="button"
                          onClick={() => triggerQuickUpload({ placement: `option_${opt.label}` as Parser2ImagePlacement, targetOption: opt.label })}
                          className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                          title={`Upload JPG/PNG/WebP image for Option ${opt.label}`}
                        >
                          Upload
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRecrop(question, opt.label)}
                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Crop Opt
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {rawOptText && !isFigurePlaceholderTag && (
                      <div className="leading-snug">
                        <MathRenderer text={rawOptText} className="inline" />
                      </div>
                    )}
                    {hasAnyOptImage && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {optImage && (
                          <img
                            src={optImage}
                            alt={`Option ${opt.label} diagram`}
                            className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer"
                            onClick={() => setZoomedImage(optImage)}
                          />
                        )}
                        {extraOptImages.map(extra => (
                          <img
                            key={extra.id}
                            src={extra.url}
                            alt={extra.alt || `Option ${opt.label} extra diagram`}
                            className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-pointer"
                            onClick={() => setZoomedImage(extra.url)}
                          />
                        ))}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRecrop(question, opt.label)}
                            className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                            title={`Recrop or add image to Option ${opt.label}`}
                          >
                            Recrop
                          </button>
                          {onQuickUploadImage && (
                            <button
                              type="button"
                              onClick={() => triggerQuickUpload({ placement: `option_${opt.label}` as Parser2ImagePlacement, targetOption: opt.label })}
                              className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                              title={`Upload image into Option ${opt.label}`}
                            >
                              Upload
                            </button>
                          )}
                          {onRemoveOptionFigure && (
                            <button
                              type="button"
                              onClick={() => onRemoveOptionFigure(question.id, opt.label)}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                              title={`Remove image from Option ${opt.label}`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
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
      {(question.explanation ||
        question.explanationImageUrl ||
        (question.imageAttachments || []).some(
          a => a.placement === 'explanation' || a.placement === 'answer_key_explanation'
        )) && (
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
            <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-800 leading-relaxed space-y-2">
              <span className="font-bold text-blue-900 block">Solution / Explanation:</span>
              {question.explanation && (
                <MathRenderer text={question.explanation} className="inline-block w-full" />
              )}
              {question.explanationImageUrl &&
                !(question.imageAttachments || []).some(a => a.url === question.explanationImageUrl) && (
                  <img
                    src={question.explanationImageUrl}
                    alt={`Explanation for Q${question.questionNumber}`}
                    onClick={() => setZoomedImage(question.explanationImageUrl || null)}
                    className="max-h-48 object-contain rounded-lg border border-blue-200 bg-white p-1 cursor-zoom-in"
                  />
                )}
              <QuestionAttachmentStrip
                attachments={question.imageAttachments}
                placements={['explanation', 'answer_key_explanation']}
                onZoom={url => setZoomedImage(url)}
                compact
              />
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

          {onReExtract && (
            <>
              <button
                type="button"
                onClick={() => handleReExtractClick('options')}
                disabled={Boolean(reExtractingMode)}
                className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Re-extract all 4 options from the original PDF page"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reExtractingMode === 'options' ? 'animate-spin' : ''}`} />
                {reExtractingMode === 'options' ? 'Extracting Opts...' : 'Re-extract Options'}
              </button>
              <button
                type="button"
                onClick={() => handleReExtractClick('question')}
                disabled={Boolean(reExtractingMode)}
                className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Re-extract complete question statement from original PDF page"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reExtractingMode === 'question' ? 'animate-spin' : ''}`} />
                {reExtractingMode === 'question' ? 'Extracting Q...' : 'Re-extract Question'}
              </button>
            </>
          )}

          {onQuickUploadImage && (
            <>
              <input
                ref={quickUploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleQuickFileChange}
              />
              <button
                type="button"
                onClick={() => triggerQuickUpload({ placement: 'after_question' })}
                disabled={isUploadingQuickImg}
                className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 border border-teal-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Upload custom JPG/PNG/WebP image directly to this question"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploadingQuickImg ? 'Uploading...' : 'Upload Image'}
              </button>
            </>
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
          {onReject && question.verificationStatus !== 'failed' && (
            <button
              type="button"
              onClick={() => onReject(question.id)}
              className="text-[11px] font-bold text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Reject / flag question as failed so it is excluded from auto-publishing"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete(question.id);
                }}
                className="text-[10.5px] font-black text-rose-700 hover:underline px-1 cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[10.5px] font-bold text-slate-500 hover:text-slate-700 px-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 p-1 rounded-lg transition cursor-pointer"
              title="Delete question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
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
