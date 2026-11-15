import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  Crop, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Wand2, 
  Image as ImageIcon,
  Columns,
  FileSearch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  CheckCircle2,
  Table as TableIcon,
  Plus,
  Loader2,
  ArrowRight,
  Copy,
  ClipboardCheck,
  Hand,
  MousePointerClick,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { 
  Parser2Question, 
  Parser2Subject, 
  Parser2QuestionType, 
  Parser2MatchTable,
  Parser2StructuredTable,
  Parser2Figure,
  isPlaceholderOption 
} from '../../services/parser2/types';

export type CopyTargetField =
  | 'questionText'
  | 'optionA'
  | 'optionB'
  | 'optionC'
  | 'optionD'
  | 'table'
  | 'listI'
  | 'listII'
  | 'explanation'
  | 'diagram'
  | 'tableCrop'
  | 'graphCrop'
  | 'chemicalStructureCrop'
  | 'optionAImage'
  | 'optionBImage'
  | 'optionCImage'
  | 'optionDImage';

interface EditorSnapshot {
  questionText: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  explanation: string;
  figureUrl?: string;
  figures?: Parser2Figure[];
  matchTable?: Parser2MatchTable;
  structuredTable?: Parser2StructuredTable;
}

interface Parser2QuestionEditModalProps {
  jobId: string;
  question: Parser2Question;
  totalPages?: number;
  initialShowSourceViewer?: boolean;
  onClose: () => void;
  onSave: (updated: Parser2Question) => void;
  onQuestionSync?: (updated: Parser2Question) => void;
  onOpenCropModal?: (question: Parser2Question, targetOption?: 'A' | 'B' | 'C' | 'D') => void;
}

const QUICK_SYMBOLS = ['→', '⇌', 'î', 'ĵ', 'k̂', 'γ', 'Δ', 'σ', 'λ', 'θ', 'ε₀', 'μ₀', 'Ω', '⁻', '²', '³', '₁', '₂', '₃'];

export const Parser2QuestionEditModal: React.FC<Parser2QuestionEditModalProps> = ({
  jobId,
  question,
  totalPages = 100,
  initialShowSourceViewer = false,
  onClose,
  onSave,
  onQuestionSync,
  onOpenCropModal
}) => {
  const [questionText, setQuestionText] = useState(question.questionText);
  const [subject, setSubject] = useState<Parser2Subject>(question.subject);
  const [chapter, setChapter] = useState(question.chapter || '');
  const [questionType, setQuestionType] = useState<Parser2QuestionType>(question.questionType);
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D' | ''>(question.correctAnswer || '');
  const [explanation, setExplanation] = useState(question.explanation || '');

  const [optA, setOptA] = useState(question.options.find(o => o.label === 'A')?.value || '');
  const [optB, setOptB] = useState(question.options.find(o => o.label === 'B')?.value || '');
  const [optC, setOptC] = useState(question.options.find(o => o.label === 'C')?.value || '');
  const [optD, setOptD] = useState(question.options.find(o => o.label === 'D')?.value || '');

  const [figureUrl, setFigureUrl] = useState<string | undefined>(question.figureUrl);
  const [figuresList, setFiguresList] = useState<Parser2Figure[]>(question.figures || []);
  const [optionFigures, setOptionFigures] = useState<{ [label: string]: string }>(() => {
    const map: { [label: string]: string } = { ...(question.optionFigures || {}) };
    for (const o of question.options || []) {
      if (o.imageUrl && !map[o.label]) map[o.label] = o.imageUrl;
    }
    return map;
  });

  const [matchTable, setMatchTable] = useState<Parser2MatchTable | undefined>(question.matchTable);
  const [structuredTable, setStructuredTable] = useState<Parser2StructuredTable | undefined>(question.structuredTable);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisualBusy, setIsVisualBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'stem' | 'A' | 'B' | 'C' | 'D' | 'explanation'>('stem');

  // Undo / Redo Stack
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);

  // Source Page Viewer & Region OCR State
  const [showSourceViewer, setShowSourceViewer] = useState<boolean>(
    initialShowSourceViewer || question.verificationStatus !== 'verified'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sourcePageNum, setSourcePageNum] = useState<number>(Math.max(1, question.sourcePageNumber || 1));
  const [zoom, setZoom] = useState<number>(1);
  const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select');
  const [pageImageLoading, setPageImageLoading] = useState(true);
  const [pageImageError, setPageImageError] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [isLoadingPageOcr, setIsLoadingPageOcr] = useState(false);

  const [copyTarget, setCopyTarget] = useState<CopyTargetField>(() => {
    if (question.verificationStatus === 'table_incomplete' || question.questionType === 'match_the_column') return 'table';
    if (question.verificationStatus === 'options_incomplete') {
      const missingOpt = (['A', 'B', 'C', 'D'] as const).find(lbl => {
        const val = question.options.find(o => o.label === lbl)?.value || '';
        return !val || isPlaceholderOption(val);
      });
      if (missingOpt) return `option${missingOpt}` as CopyTargetField;
    }
    return 'questionText';
  });

  // Selection box [ymin, xmin, ymax, xmax] in 0..1000
  const [selBox, setSelBox] = useState<[number, number, number, number] | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isExtractingRegion, setIsExtractingRegion] = useState(false);
  const [extractedPreviewText, setExtractedPreviewText] = useState('');
  const [extractedMatchTable, setExtractedMatchTable] = useState<Parser2MatchTable | undefined>(undefined);
  const [extractedStructuredTable, setExtractedStructuredTable] = useState<Parser2StructuredTable | undefined>(undefined);
  const [cropAttachMode, setCropAttachMode] = useState<'replace' | 'add'>('replace');

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pageImgRef = useRef<HTMLImageElement>(null);

  const captureSnapshot = (): EditorSnapshot => ({
    questionText,
    optA,
    optB,
    optC,
    optD,
    explanation,
    figureUrl,
    figures: figuresList ? JSON.parse(JSON.stringify(figuresList)) : undefined,
    matchTable: matchTable ? JSON.parse(JSON.stringify(matchTable)) : undefined,
    structuredTable: structuredTable ? JSON.parse(JSON.stringify(structuredTable)) : undefined
  });

  const applySnapshot = (snap: EditorSnapshot) => {
    setQuestionText(snap.questionText);
    setOptA(snap.optA);
    setOptB(snap.optB);
    setOptC(snap.optC);
    setOptD(snap.optD);
    setExplanation(snap.explanation);
    setFigureUrl(snap.figureUrl);
    setFiguresList(snap.figures || []);
    setMatchTable(snap.matchTable);
    setStructuredTable(snap.structuredTable);
  };

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-19), captureSnapshot()]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, captureSnapshot()]);
    setUndoStack(prev => prev.slice(0, -1));
    applySnapshot(prevSnap);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, captureSnapshot()]);
    setRedoStack(prev => prev.slice(0, -1));
    applySnapshot(nextSnap);
  };

  const handleRestoreOriginalExtracted = () => {
    const snap = question.originalExtractedSnapshot;
    pushUndo();
    if (snap) {
      setQuestionText(snap.questionText || '');
      setOptA(snap.options?.find(o => o.label === 'A')?.value || '');
      setOptB(snap.options?.find(o => o.label === 'B')?.value || '');
      setOptC(snap.options?.find(o => o.label === 'C')?.value || '');
      setOptD(snap.options?.find(o => o.label === 'D')?.value || '');
      setMatchTable(snap.matchTable);
      setStructuredTable(snap.structuredTable);
      setFigureUrl(snap.figureUrl);
      setNotice('Restored original OCR extracted text & structure.');
    } else {
      setQuestionText(question.questionText);
      setOptA(question.options.find(o => o.label === 'A')?.value || '');
      setOptB(question.options.find(o => o.label === 'B')?.value || '');
      setOptC(question.options.find(o => o.label === 'C')?.value || '');
      setOptD(question.options.find(o => o.label === 'D')?.value || '');
      setMatchTable(question.matchTable);
      setStructuredTable(question.structuredTable);
      setFigureUrl(question.figureUrl);
      setNotice('Reset unsaved edits back to saved record.');
    }
  };

  useEffect(() => {
    setFigureUrl(question.figureUrl);
    setFiguresList(question.figures || []);
    const map: { [label: string]: string } = { ...(question.optionFigures || {}) };
    for (const o of question.options || []) {
      if (o.imageUrl && !map[o.label]) map[o.label] = o.imageUrl;
    }
    setOptionFigures(map);
  }, [question]);

  const insertSymbol = (sym: string) => {
    pushUndo();
    if (activeField === 'stem') setQuestionText(prev => prev + sym);
    else if (activeField === 'A') setOptA(prev => prev + sym);
    else if (activeField === 'B') setOptB(prev => prev + sym);
    else if (activeField === 'C') setOptC(prev => prev + sym);
    else if (activeField === 'D') setOptD(prev => prev + sym);
    else if (activeField === 'explanation') setExplanation(prev => prev + sym);
  };

  const copyToClipboard = async (text: string, label: string) => {
    const clean = text.trim();
    if (!clean) {
      setNotice(`Nothing available to copy for "${label}".`);
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clean);
      } else {
        const ta = document.createElement('textarea');
        ta.value = clean;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedLabel(label);
      setNotice(`Copied ${label} to clipboard.`);
      setTimeout(() => setCopiedLabel(prev => (prev === label ? null : prev)), 2500);
    } catch {
      setError(`Browser clipboard blocked copying ${label}.`);
    }
  };

  const formatTableForClipboard = () => {
    if (matchTable?.rows?.length) {
      const hdr = `${matchTable.columnAHeader || 'List - I'} | ${matchTable.columnBHeader || 'List - II'}`;
      const rows = matchTable.rows.map(
        r => `(${r.colAKey}) ${r.colAText} | (${r.colBKey}) ${r.colBText}`
      );
      return [hdr, ...rows].join('\n');
    }
    if (structuredTable?.rows?.length) {
      const hdr = structuredTable.headers.join(' | ');
      const rows = structuredTable.rows.map(r => r.join(' | '));
      return [hdr, ...rows].join('\n');
    }
    return '';
  };

  const extractEquationsFromQuestion = () => {
    const combined = [questionText, optA, optB, optC, optD, explanation].join('\n');
    const lines = combined
      .split('\n')
      .map(l => l.trim())
      .filter(l => /[=+\-*/×÷√^₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹ΔλθωεμΩπ→⇌îĵk̂\$\\]/.test(l));
    return lines.join('\n') || combined;
  };

  const handleCopyFullPageOcr = async () => {
    setIsLoadingPageOcr(true);
    setError(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/pages/${sourcePageNum}/ocr`);
      const data = await res.json();
      if (!data.success || !data.ocrText) {
        setError(data.error || `No cached OCR text stored for Page ${sourcePageNum}. Drag a selection box to run region OCR.`);
        return;
      }
      setExtractedPreviewText(data.ocrText);
      await copyToClipboard(data.ocrText, `OCR Text (Page ${sourcePageNum})`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch page OCR text.');
    } finally {
      setIsLoadingPageOcr(false);
    }
  };

  const getPointerCoords = (clientX: number, clientY: number) => {
    const el = pageImgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = Math.max(0, Math.min(1000, Math.round(((clientX - rect.left) / rect.width) * 1000)));
    const y = Math.max(0, Math.min(1000, Math.round(((clientY - rect.top) / rect.height) * 1000)));
    return { x, y };
  };

  const handleRunRegionOcr = async (overrideTarget?: CopyTargetField, attachModeOverride?: 'replace' | 'add') => {
    const target = overrideTarget || copyTarget;
    const mode = attachModeOverride || cropAttachMode;
    if (!selBox) {
      setError('Drag a box over the Original PDF Page first to select a region.');
      return;
    }
    setIsExtractingRegion(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/ocr-region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: sourcePageNum,
          boundingBox: selBox,
          targetField: target,
          questionNumber: question.questionNumber
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Region extraction failed.');
        return;
      }

      const optImgMatch = /^option([A-D])Image$/.exec(target);
      if (optImgMatch && (data.figureUrl || data.croppedImageUrl)) {
        const lbl = optImgMatch[1];
        const url = data.figureUrl || data.croppedImageUrl;
        pushUndo();
        setOptionFigures(prev => ({ ...prev, [lbl]: url }));
        setNotice(`Cropped Option (${lbl}) image attached! Click "Save & Verify Question" to commit.`);
        return;
      }

      const isFigureTarget =
        target === 'diagram' ||
        target === 'tableCrop' ||
        target === 'graphCrop' ||
        target === 'chemicalStructureCrop';

      if (isFigureTarget && (data.figureUrl || data.croppedImageUrl)) {
        const url = data.figureUrl || data.croppedImageUrl;
        const figRec: Parser2Figure | undefined = data.figure;
        pushUndo();
        if (mode === 'add' && figureUrl) {
          setFiguresList(prev => (figRec ? [...prev, figRec] : prev));
          setNotice(`Added extra ${target.replace('Crop', '')} crop to Question ${question.questionNumber}.`);
        } else {
          setFigureUrl(url);
          if (figRec) {
            setFiguresList(prev => [figRec, ...prev.filter(f => f.id !== figRec.id)]);
          }
          setNotice(`Cropped ${target.replace('Crop', '')} attached cleanly from Page ${sourcePageNum}.`);
        }
        return;
      }

      setExtractedPreviewText(data.extractedText || '');
      setExtractedMatchTable(data.matchTable);
      setExtractedStructuredTable(data.structuredTable);
      if (!data.extractedText && !data.matchTable && !data.structuredTable) {
        setNotice('No readable text detected in selection — try zooming in or drawing a slightly wider box.');
      } else {
        setNotice(`Extracted preview ready for ${target}. Review or copy below, or click "Apply to Selected Field".`);
      }
    } catch (err: any) {
      setError(err.message || 'Region OCR network error.');
    } finally {
      setIsExtractingRegion(false);
    }
  };

  const handleApplyExtractedToField = () => {
    if (!extractedPreviewText.trim() && !extractedMatchTable && !extractedStructuredTable) return;
    pushUndo();
    const txt = extractedPreviewText.trim();

    if (copyTarget === 'questionText') {
      setQuestionText(txt);
      setNotice('Applied extracted text to Question Statement.');
    } else if (copyTarget === 'optionA') {
      setOptA(txt);
      setNotice('Applied extracted text to Option A.');
    } else if (copyTarget === 'optionB') {
      setOptB(txt);
      setNotice('Applied extracted text to Option B.');
    } else if (copyTarget === 'optionC') {
      setOptC(txt);
      setNotice('Applied extracted text to Option C.');
    } else if (copyTarget === 'optionD') {
      setOptD(txt);
      setNotice('Applied extracted text to Option D.');
    } else if (copyTarget === 'explanation') {
      setExplanation(txt);
      setNotice('Applied extracted text to Explanation.');
    } else if (copyTarget === 'table') {
      if (extractedMatchTable?.rows?.length) {
        setMatchTable(extractedMatchTable);
        setQuestionType('match_the_column');
        setNotice(`Applied ${extractedMatchTable.rows.length} List I/II rows.`);
      } else if (extractedStructuredTable?.rows?.length) {
        setStructuredTable(extractedStructuredTable);
        setQuestionType('table_based');
        setNotice(`Applied structured table (${extractedStructuredTable.rows.length} rows).`);
      } else if (txt) {
        setQuestionText(prev => `${prev}\n${txt}`.trim());
        setNotice('Appended table text to question stem.');
      }
    } else if (copyTarget === 'listI' || copyTarget === 'listII') {
      const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
      const currentRows = matchTable?.rows ? [...matchTable.rows] : [
        { colAKey: 'a', colAText: '', colBKey: 'i', colBText: '' },
        { colAKey: 'b', colAText: '', colBKey: 'ii', colBText: '' },
        { colAKey: 'c', colAText: '', colBKey: 'iii', colBText: '' },
        { colAKey: 'd', colAText: '', colBKey: 'iv', colBText: '' }
      ];
      while (currentRows.length < lines.length) {
        const idx = currentRows.length;
        currentRows.push({
          colAKey: String.fromCharCode(97 + idx),
          colAText: '',
          colBKey: ['i', 'ii', 'iii', 'iv', 'v'][idx] || String(idx + 1),
          colBText: ''
        });
      }
      lines.forEach((line, idx) => {
        const cleaned = line.replace(/^\(?[A-Da-d1-4ivxIVX]+\)?[\.\):]?\s*/, '').trim();
        if (copyTarget === 'listI') currentRows[idx].colAText = cleaned;
        else currentRows[idx].colBText = cleaned;
      });
      setMatchTable({
        columnAHeader: matchTable?.columnAHeader || 'List - I',
        columnBHeader: matchTable?.columnBHeader || 'List - II',
        rows: currentRows
      });
      setQuestionType('match_the_column');
      setNotice(`Applied ${lines.length} items to ${copyTarget === 'listI' ? 'List I' : 'List II'}.`);
    }
  };

  const handleUploadFigure = async (file: File, targetOption?: 'A' | 'B' | 'C' | 'D') => {
    setIsVisualBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('figureFile', file);
      if (targetOption) formData.append('targetOption', targetOption);

      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}/upload-figure`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.question) {
        pushUndo();
        if (targetOption) {
          setOptionFigures(prev => ({ ...prev, [targetOption]: data.figureUrl }));
        } else {
          setFigureUrl(data.figureUrl);
        }
        onQuestionSync?.(data.question);
      } else {
        setError(data.error || 'Failed to upload figure.');
      }
    } catch (err: any) {
      setError(err.message || 'Upload error.');
    } finally {
      setIsVisualBusy(false);
    }
  };

  const handleRestoreOriginal = async (targetOption?: 'A' | 'B' | 'C' | 'D') => {
    setIsVisualBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}/restore-original-figure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetOption })
      });
      const data = await res.json();
      if (data.success && data.question) {
        setFigureUrl(data.question.figureUrl);
        if (data.question.optionFigures) setOptionFigures(data.question.optionFigures);
        onQuestionSync?.(data.question);
      } else {
        setError(data.error || 'No original crop available to restore.');
      }
    } catch (err: any) {
      setError(err.message || 'Error restoring original crop.');
    } finally {
      setIsVisualBusy(false);
    }
  };

  const handleAiAutoLocate = async () => {
    setIsVisualBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}/auto-recrop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success && data.question) {
        pushUndo();
        const uq: Parser2Question = data.question;
        setFigureUrl(uq.figureUrl);
        if (uq.optionFigures) setOptionFigures(uq.optionFigures);
        if (uq.questionText) setQuestionText(uq.questionText);
        if (uq.matchTable) setMatchTable(uq.matchTable);
        if (uq.structuredTable) setStructuredTable(uq.structuredTable);
        if (uq.options) {
          setOptA(uq.options.find(o => o.label === 'A')?.value || '');
          setOptB(uq.options.find(o => o.label === 'B')?.value || '');
          setOptC(uq.options.find(o => o.label === 'C')?.value || '');
          setOptD(uq.options.find(o => o.label === 'D')?.value || '');
        }
        setNotice('AI Auto-Locate completed.');
      } else {
        setError(data.error || 'AI Auto-Locate failed.');
      }
    } catch (err: any) {
      setError(err.message || 'AI Auto-Locate network error.');
    } finally {
      setIsVisualBusy(false);
    }
  };

  const submitCorrection = async (verifyAfterSave: boolean, forceOverride = false) => {
    setError(null);
    setNotice(null);

    const optVals = { A: optA.trim(), B: optB.trim(), C: optC.trim(), D: optD.trim() };
    if (verifyAfterSave && !forceOverride) {
      const missingAny = (['A', 'B', 'C', 'D'] as const).some(lbl => {
        const hasImg = Boolean(optionFigures[lbl]);
        if (hasImg) return false;
        const val = optVals[lbl];
        return !val || isPlaceholderOption(val) || /^\[Figure\s+[A-D]\]$/i.test(val);
      });

      if (missingAny) {
        setError('Each option must have authentic text or an option figure before approving (or use Admin Override if intentionally visual/complete on source page).');
        return;
      }
    }

    setIsSubmitting(true);

    const updatedOptions = (['A', 'B', 'C', 'D'] as const).map(lbl => {
      const imgUrl = optionFigures[lbl];
      const txtVal = optVals[lbl] || (imgUrl ? `[Figure ${lbl}]` : '');
      return {
        label: lbl,
        text: txtVal,
        value: txtVal,
        imageUrl: imgUrl || undefined,
        isVisualOption: Boolean(imgUrl)
      };
    });

    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questionText.trim(),
          subject,
          chapter: chapter.trim(),
          questionType,
          ...(correctAnswer ? { correctAnswer, answerStatus: 'manual' } : { answerStatus: 'answer_missing' }),
          explanation: explanation.trim(),
          options: updatedOptions,
          optionFigures: Object.keys(optionFigures).length > 0 ? optionFigures : undefined,
          figureUrl: figureUrl ?? null,
          ...(figureUrl ? (figuresList.length > 0 ? { figures: figuresList, figureAssetIds: figuresList.map(f => f.id) } : {}) : { figures: [], figureAssetIds: [] }),
          matchTable: matchTable && matchTable.rows?.length ? matchTable : undefined,
          structuredTable: structuredTable && structuredTable.rows?.length ? structuredTable : undefined,
          verificationStatus: verifyAfterSave ? 'verified' : 'needs_review',
          reviewRequired: !verifyAfterSave,
          reviewNotes: verifyAfterSave
            ? (forceOverride ? 'Verified via Admin Override after Original PDF Page inspection.' : '')
            : 'Saved as draft correction — pending final approval.',
          isManuallyEdited: true,
          ...(forceOverride ? { forceOverride: true, adminOverrideNotes: 'Verified by Admin after inspecting Original PDF Page' } : {})
        })
      });

      const data = await res.json();
      if (data.success && data.question) {
        onSave(data.question);
      } else {
        setError(data.error || 'Failed to save question edits.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageImageUrl = `/api/parser2/jobs/${jobId}/pages/${sourcePageNum}/image`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`bg-white flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : showSourceViewer
            ? 'rounded-2xl max-w-6xl w-full max-h-[94vh]'
            : 'rounded-2xl max-w-3xl w-full max-h-[92vh]'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {question.questionNumber}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Edit &amp; Recover Q{question.questionNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                Source: Page {question.sourcePageNumber || 1} · {question.verificationStatus.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Undo last field change"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" /> Redo
            </button>
            <button
              type="button"
              onClick={handleRestoreOriginalExtracted}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Restore original OCR extracted text"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore Original
            </button>
            <button
              type="button"
              onClick={() => setShowSourceViewer(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border flex items-center gap-1.5 cursor-pointer transition ${
                showSourceViewer
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              {showSourceViewer ? 'Hide Original PDF Page' : 'View Original PDF Page'}
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workspace'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Split Body: Source Page Recovery (left) + Structured Field Editor (right) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {showSourceViewer && (
            <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-900 flex flex-col min-h-[340px] max-h-[52vh] lg:max-h-none">
              {/* Page & Mode Toolbar */}
              <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-white text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={sourcePageNum <= 1}
                    onClick={() => {
                      setPageImageLoading(true);
                      setPageImageError(false);
                      setSelBox(null);
                      setSourcePageNum(p => Math.max(1, p - 1));
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold px-1.5">
                    Page {sourcePageNum} / {Math.max(totalPages, sourcePageNum)}
                  </span>
                  <button
                    type="button"
                    disabled={sourcePageNum >= totalPages}
                    onClick={() => {
                      setPageImageLoading(true);
                      setPageImageError(false);
                      setSelBox(null);
                      setSourcePageNum(p => Math.min(totalPages, p + 1));
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 cursor-pointer"
                    title="Next Page (for cross-page questions)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Touch / Pointer Mode Toggle (Select vs Pan/Scroll) */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setInteractionMode('select')}
                    className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer ${
                      interactionMode === 'select' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <MousePointerClick className="w-3 h-3" /> Select Box
                  </button>
                  <button
                    type="button"
                    onClick={() => setInteractionMode('pan')}
                    className={`px-2 py-1 rounded text-[10.5px] font-bold flex items-center gap-1 cursor-pointer ${
                      interactionMode === 'pan' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Hand className="w-3 h-3" /> Pan / Scroll
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer"
                    title="Zoom Out (min 50%)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="text-[11px] font-bold w-11 text-center hover:text-amber-300 cursor-pointer"
                    title="Reset Zoom to 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer"
                    title="Zoom In (up to 300%)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Target Field Selector (Text OCR + Visual Crops) */}
              <div className="px-3 py-2 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Extract To:</span>
                {(
                  [
                    ['questionText', 'Question'],
                    ['optionA', 'Opt A'],
                    ['optionB', 'Opt B'],
                    ['optionC', 'Opt C'],
                    ['optionD', 'Opt D'],
                    ['table', 'Table OCR'],
                    ['listI', 'List I'],
                    ['listII', 'List II'],
                    ['explanation', 'Solution']
                  ] as Array<[CopyTargetField, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCopyTarget(key)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition ${
                      copyTarget === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-[10px] font-extrabold text-amber-300 uppercase mx-1">Crop Img:</span>
                {(
                  [
                    ['diagram', 'Diagram'],
                    ['tableCrop', 'Table Img'],
                    ['graphCrop', 'Graph'],
                    ['chemicalStructureCrop', 'Chem Struct'],
                    ['optionAImage', 'Opt A Img'],
                    ['optionBImage', 'Opt B Img'],
                    ['optionCImage', 'Opt C Img'],
                    ['optionDImage', 'Opt D Img']
                  ] as Array<[CopyTargetField, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCopyTarget(key)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition ${
                      copyTarget === key
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700/80 text-amber-200 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Scrollable Zoomable Canvas with Touch-Safe Drag Selector */}
              <div className="flex-1 overflow-auto p-3 flex items-start justify-start relative bg-slate-950 select-none">
                <div
                  className={`relative inline-block origin-top-left ${
                    interactionMode === 'select' ? 'cursor-crosshair' : 'cursor-grab'
                  }`}
                  style={{
                    width: `${Math.round(zoom * 100)}%`,
                    maxWidth: zoom <= 1 ? '100%' : 'none',
                    touchAction: interactionMode === 'select' ? 'none' : 'pan-x pan-y'
                  }}
                  onPointerDown={(e) => {
                    if (interactionMode !== 'select') return;
                    const pt = getPointerCoords(e.clientX, e.clientY);
                    if (!pt) return;
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // ignore capture errors on synthetic events
                    }
                    setDragStart(pt);
                    setSelBox([pt.y, pt.x, pt.y, pt.x]);
                  }}
                  onPointerMove={(e) => {
                    if (interactionMode !== 'select' || !dragStart) return;
                    const pt = getPointerCoords(e.clientX, e.clientY);
                    if (!pt) return;
                    setSelBox([
                      Math.min(dragStart.y, pt.y),
                      Math.min(dragStart.x, pt.x),
                      Math.max(dragStart.y, pt.y),
                      Math.max(dragStart.x, pt.x)
                    ]);
                  }}
                  onPointerUp={() => setDragStart(null)}
                  onPointerCancel={() => setDragStart(null)}
                >
                  {pageImageLoading && (
                    <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading original PDF page {sourcePageNum}...
                    </div>
                  )}
                  {pageImageError && (
                    <div className="py-12 px-4 text-center text-rose-300 text-xs">
                      Source page PNG could not be rendered for page {sourcePageNum}.
                    </div>
                  )}
                  <img
                    ref={pageImgRef}
                    src={pageImageUrl}
                    alt={`Original PDF Page ${sourcePageNum}`}
                    draggable={false}
                    onLoad={() => setPageImageLoading(false)}
                    onError={() => {
                      setPageImageLoading(false);
                      setPageImageError(true);
                    }}
                    className={`w-full h-auto block rounded ${pageImageLoading || pageImageError ? 'hidden' : ''}`}
                  />

                  {selBox && !pageImageError && (
                    <div
                      className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none"
                      style={{
                        top: `${selBox[0] / 10}%`,
                        left: `${selBox[1] / 10}%`,
                        height: `${Math.max(1, (selBox[2] - selBox[0]) / 10)}%`,
                        width: `${Math.max(1, (selBox[3] - selBox[1]) / 10)}%`
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Region Crop / OCR Action Bar + Editable Preview + Page OCR Copy */}
              <div className="p-2.5 bg-slate-900 border-t border-slate-700 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300">
                    {selBox
                      ? `Selected box: [${selBox.join(', ')}]`
                      : interactionMode === 'select'
                      ? 'Drag a box over any question, table, option, or diagram'
                      : 'Pan/Scroll mode active — switch to Select Box to draw region'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isLoadingPageOcr}
                      onClick={handleCopyFullPageOcr}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-100 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                      title="Copy full cached OCR text from this page"
                    >
                      {isLoadingPageOcr ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                      Copy OCR Text From Page
                    </button>
                    {figureUrl && (
                      <button
                        type="button"
                        onClick={() => setCropAttachMode(prev => (prev === 'replace' ? 'add' : 'replace'))}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          cropAttachMode === 'add'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-300'
                        }`}
                        title="Toggle replacing primary diagram vs adding extra diagram"
                      >
                        {cropAttachMode === 'add' ? 'Mode: Add Extra Crop' : 'Mode: Set Primary'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!selBox || isExtractingRegion}
                      onClick={() => handleRunRegionOcr()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isExtractingRegion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {copyTarget === 'diagram' || copyTarget === 'tableCrop' || copyTarget === 'graphCrop' || copyTarget === 'chemicalStructureCrop'
                        ? 'Save Crop to Question'
                        : /^option[A-D]Image$/.test(copyTarget)
                        ? `Save Crop to ${copyTarget.replace('Image', '')}`
                        : `Extract Selected for ${copyTarget}`}
                    </button>
                  </div>
                </div>

                {/* One-Click Specialized Region Crop Buttons */}
                {selBox && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Crop Region:</span>
                    <button
                      type="button"
                      disabled={isExtractingRegion}
                      onClick={() => handleRunRegionOcr('diagram', 'replace')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-[10.5px] cursor-pointer"
                    >
                      Crop Question Diagram
                    </button>
                    <button
                      type="button"
                      disabled={isExtractingRegion}
                      onClick={() => handleRunRegionOcr('tableCrop', 'replace')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-200 font-bold text-[10.5px] cursor-pointer"
                    >
                      Crop Table
                    </button>
                    <button
                      type="button"
                      disabled={isExtractingRegion}
                      onClick={() => handleRunRegionOcr('graphCrop', 'replace')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold text-[10.5px] cursor-pointer"
                    >
                      Crop Graph
                    </button>
                    {(['A', 'B', 'C', 'D'] as const).map(lbl => (
                      <button
                        key={lbl}
                        type="button"
                        disabled={isExtractingRegion}
                        onClick={() => handleRunRegionOcr(`option${lbl}Image` as CopyTargetField)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-200 font-bold text-[10.5px] cursor-pointer"
                      >
                        Crop Option {lbl} Img
                      </button>
                    ))}
                  </div>
                )}

                {(extractedPreviewText || extractedMatchTable || extractedStructuredTable) && (
                  <div className="bg-slate-800 rounded-lg p-2 space-y-1.5 border border-slate-700">
                    <textarea
                      value={extractedPreviewText}
                      onChange={e => setExtractedPreviewText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 text-slate-100 border border-slate-700 rounded-md p-2 text-xs font-mono outline-hidden"
                      placeholder="Extracted region preview..."
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(extractedPreviewText, 'Selected Text')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy Selected Text
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyExtractedToField}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                      >
                        Apply to Selected Field <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Panel: Structured Question Editor */}
          <form
            onSubmit={e => {
              e.preventDefault();
              submitCorrection(true, false);
            }}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5"
          >
            {/* Component Validation Summary & Admin Override Status */}
            {(question.componentValidation || question.adminOverride) && (
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] font-bold">
                <span className="text-slate-500 uppercase mr-1">Checks:</span>
                {question.componentValidation && (() => {
                  const cv = question.componentValidation;
                  const textOk = cv.questionText.status === 'ok';
                  const optsOk = cv.options.status === 'ok';
                  const tblOk = cv.tables.status === 'ok' || cv.tables.status === 'not_applicable';
                  const eqOk = cv.equations.status === 'ok';
                  const diagOk = cv.diagrams.status === 'ok' || cv.diagrams.status === 'not_applicable';
                  return (
                    <>
                      <span className={`px-2 py-0.5 rounded-full ${textOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Text: {textOk ? 'OK' : 'Incomplete'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${optsOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Options: {optsOk ? '4/4 OK' : 'Incomplete'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${tblOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        Tables: {cv.tables.status === 'not_applicable' ? 'N/A' : tblOk ? 'OK' : 'Incomplete'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${eqOk ? 'bg-emerald-100 text-emerald-800' : 'bg-fuchsia-100 text-fuchsia-800'}`}>
                        Symbols: {eqOk ? 'Clean' : 'Symbol Review'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${diagOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        Diagram: {cv.diagrams.status === 'not_applicable' ? 'N/A' : diagOk ? 'OK' : 'Required'}
                      </span>
                    </>
                  );
                })()}
                {question.adminOverride && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Admin Override Active
                  </span>
                )}
              </div>
            )}

            {/* Quick-Copy Clipboard Toolbar (Part 6) */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-indigo-50/60 border border-indigo-200 rounded-xl">
              <span className="text-[10px] font-extrabold text-indigo-700 uppercase mr-1">Quick Copy:</span>
              <button
                type="button"
                onClick={() => copyToClipboard(questionText, 'Question Text')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10.5px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
              >
                {copiedLabel === 'Question Text' ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
                Copy Question Text
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(`(A) ${optA}\n(B) ${optB}\n(C) ${optC}\n(D) ${optD}`, 'Options A-D')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10.5px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
              >
                {copiedLabel === 'Options A-D' ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
                Copy Options
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(formatTableForClipboard(), 'Table')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10.5px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
              >
                {copiedLabel === 'Table' ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
                Copy Table
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(extractEquationsFromQuestion(), 'Equation')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10.5px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
              >
                {copiedLabel === 'Equation' ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
                Copy Equation
              </button>
              <button
                type="button"
                onClick={() => {
                  const tbl = formatTableForClipboard();
                  const full = [
                    `Q${question.questionNumber}. ${questionText}`,
                    tbl ? `\n${tbl}` : '',
                    `\n(A) ${optA}\n(B) ${optB}\n(C) ${optC}\n(D) ${optD}`,
                    correctAnswer ? `\nAnswer: (${correctAnswer})` : ''
                  ]
                    .filter(Boolean)
                    .join('\n');
                  copyToClipboard(full, 'Entire Question');
                }}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-200 text-[10.5px] font-bold text-slate-700 cursor-pointer flex items-center gap-1"
              >
                {copiedLabel === 'Entire Question' ? <ClipboardCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-600" />}
                Copy Entire Question
              </button>
            </div>

            {/* Metadata Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Parser2Subject)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Combined">Combined</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as Parser2QuestionType)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="single_mcq">Single MCQ</option>
                  <option value="multiple_statement">Multiple Statements</option>
                  <option value="assertion_reason">Assertion &amp; Reason</option>
                  <option value="match_the_column">Match the Column</option>
                  <option value="diagram_based">Diagram Based</option>
                  <option value="table_based">Table Based</option>
                  <option value="numerical">Numerical</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Correct Answer</label>
                <select
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value as any)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-black outline-hidden ${
                    correctAnswer
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                      : 'bg-amber-50 border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500'
                  }`}
                >
                  <option value="">-- Answer Missing --</option>
                  <option value="A">Option A (1)</option>
                  <option value="B">Option B (2)</option>
                  <option value="C">Option C (3)</option>
                  <option value="D">Option D (4)</option>
                </select>
              </div>
            </div>

            {/* Scientific Symbol Quick-Insert Bar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase mr-1.5">Symbol:</span>
              {QUICK_SYMBOLS.map(sym => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => insertSymbol(sym)}
                  className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded text-xs font-bold text-slate-700 cursor-pointer transition"
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Question Statement */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Question Statement
              </label>
              <textarea
                value={questionText}
                onFocus={() => setActiveField('stem')}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                required
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400"
                placeholder="Enter exact question statement..."
              />
            </div>

            {/* Match The Column Editable Table (Create / Edit) */}
            {(questionType === 'match_the_column' || (matchTable && matchTable.rows?.length > 0)) && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-blue-600" /> List I / List II Match Table
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      pushUndo();
                      const rows = matchTable?.rows ? [...matchTable.rows] : [];
                      const idx = rows.length;
                      rows.push({
                        colAKey: String.fromCharCode(97 + idx),
                        colAText: '',
                        colBKey: ['i', 'ii', 'iii', 'iv', 'v'][idx] || String(idx + 1),
                        colBText: ''
                      });
                      setMatchTable({
                        columnAHeader: matchTable?.columnAHeader || 'List - I',
                        columnBHeader: matchTable?.columnBHeader || 'List - II',
                        rows
                      });
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>

                {matchTable && matchTable.rows && matchTable.rows.length > 0 ? (
                  <div className="space-y-1.5">
                    {matchTable.rows.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={row.colAText}
                          onChange={(e) => {
                            const nextRows = [...matchTable.rows];
                            nextRows[rIdx] = { ...nextRows[rIdx], colAText: e.target.value };
                            setMatchTable({ ...matchTable, rows: nextRows });
                          }}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                          placeholder={`List I (${row.colAKey})`}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={row.colBText}
                            onChange={(e) => {
                              const nextRows = [...matchTable.rows];
                              nextRows[rIdx] = { ...nextRows[rIdx], colBText: e.target.value };
                              setMatchTable({ ...matchTable, rows: nextRows });
                            }}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                            placeholder={`List II (${row.colBKey})`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              pushUndo();
                              setMatchTable({
                                ...matchTable,
                                rows: matchTable.rows.filter((_, idx) => idx !== rIdx)
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    List I / List II table is empty. Use "View Source Page &amp; Copy" (Target: Table / List I / List II) or click "Add Row" above.
                  </div>
                )}
              </div>
            )}

            {/* Structured Table Editor (table_based questions) */}
            {(questionType === 'table_based' || (structuredTable && structuredTable.rows?.length > 0)) && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-indigo-600" /> Structured Data Table
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      pushUndo();
                      const headers = structuredTable?.headers?.length ? [...structuredTable.headers] : ['Column 1', 'Column 2'];
                      const rows = structuredTable?.rows ? [...structuredTable.rows] : [];
                      rows.push(headers.map(() => ''));
                      setStructuredTable({ headers, rows });
                    }}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>
                {structuredTable && structuredTable.rows.length > 0 && (
                  <div className="overflow-x-auto space-y-1">
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${structuredTable.headers.length}, minmax(90px, 1fr))` }}>
                      {structuredTable.headers.map((h, hIdx) => (
                        <input
                          key={hIdx}
                          type="text"
                          value={h}
                          onChange={e => {
                            const nextH = [...structuredTable.headers];
                            nextH[hIdx] = e.target.value;
                            setStructuredTable({ ...structuredTable, headers: nextH });
                          }}
                          className="bg-slate-200/70 border border-slate-300 rounded px-2 py-1 text-[11px] font-bold"
                        />
                      ))}
                    </div>
                    {structuredTable.rows.map((r, rIdx) => (
                      <div key={rIdx} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${structuredTable.headers.length}, minmax(90px, 1fr))` }}>
                        {r.map((cell, cIdx) => (
                          <input
                            key={cIdx}
                            type="text"
                            value={cell}
                            onChange={e => {
                              const nextRows = structuredTable.rows.map((rowArr, idx) =>
                                idx === rIdx ? rowArr.map((c, j) => (j === cIdx ? e.target.value : c)) : rowArr
                              );
                              setStructuredTable({ ...structuredTable, rows: nextRows });
                            }}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Primary Scientific Figure Controls */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Primary Figure / Diagram
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {onOpenCropModal && (
                    <button
                      type="button"
                      onClick={() => onOpenCropModal(question)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Crop className="w-3 h-3" /> {figureUrl ? 'Manual Recrop' : 'Crop from PDF'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isVisualBusy}
                    onClick={handleAiAutoLocate}
                    className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Wand2 className={`w-3 h-3 ${isVisualBusy ? 'animate-spin' : ''}`} /> AI Auto-Locate
                  </button>
                  <button
                    type="button"
                    disabled={isVisualBusy}
                    onClick={() => primaryFileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Upload Img
                  </button>
                  <input
                    ref={primaryFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadFigure(f);
                      e.target.value = '';
                    }}
                  />
                  {question.originalFigureUrl && question.originalFigureUrl !== figureUrl && (
                    <button
                      type="button"
                      disabled={isVisualBusy}
                      onClick={() => handleRestoreOriginal()}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore Fig
                    </button>
                  )}
                  {figureUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        pushUndo();
                        setFigureUrl(undefined);
                        setFiguresList([]);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
              </div>

              {figureUrl ? (
                <div className="space-y-2">
                  <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                    <img src={figureUrl} alt="Primary figure preview" className="max-h-36 mx-auto object-contain" />
                  </div>
                  {figuresList.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {figuresList.map((fig, fIdx) => (
                        <div key={fig.id} className="relative bg-white border border-slate-200 rounded-lg p-1 flex flex-col items-center gap-1">
                          <img src={fig.figureUrl} alt={`Figure ${fIdx + 1}`} className="h-14 w-16 object-contain" />
                          <div className="flex items-center gap-1 text-[10px]">
                            {fig.figureUrl === figureUrl ? (
                              <span className="font-bold text-blue-600">Primary</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  pushUndo();
                                  setFigureUrl(fig.figureUrl);
                                }}
                                className="font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
                              >
                                Make Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                pushUndo();
                                const next = figuresList.filter(f => f.id !== fig.id);
                                setFiguresList(next);
                                if (fig.figureUrl === figureUrl) {
                                  setFigureUrl(next[0]?.figureUrl);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Delete figure"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic py-1.5 text-center bg-white/70 rounded-lg border border-dashed border-slate-300">
                  No primary figure attached.
                </div>
              )}
            </div>

            {/* Four Options */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                Answer Options
              </label>

              {(['A', 'B', 'C', 'D'] as const).map(lbl => {
                const val = lbl === 'A' ? optA : lbl === 'B' ? optB : lbl === 'C' ? optC : optD;
                const setVal = lbl === 'A' ? setOptA : lbl === 'B' ? setOptB : lbl === 'C' ? setOptC : setOptD;
                const isCorrect = correctAnswer === lbl;
                const optImg = optionFigures[lbl];

                return (
                  <div key={lbl} className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(lbl)}
                        title={`Click to mark ${lbl} as correct answer`}
                        className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isCorrect 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {lbl}
                      </button>

                      <input
                        type="text"
                        value={val}
                        onFocus={() => setActiveField(lbl)}
                        onChange={(e) => setVal(e.target.value)}
                        className={`flex-1 border rounded-xl px-3 py-1.5 text-xs sm:text-sm outline-hidden ${
                          isCorrect
                            ? 'bg-emerald-50/50 border-emerald-300 font-bold text-slate-900'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        }`}
                        placeholder={optImg ? `Visual Figure ${lbl} (optional caption text)...` : `Option ${lbl} text or formula...`}
                      />

                      {onOpenCropModal && (
                        <button
                          type="button"
                          onClick={() => onOpenCropModal(question, lbl)}
                          className="px-2 py-1.5 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-700 border border-slate-300 rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                          title={`Crop Option ${lbl} from PDF`}
                        >
                          <Crop className="w-3 h-3" /> Crop
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isVisualBusy}
                        onClick={() => optionFileInputRefs.current[lbl]?.click()}
                        className="px-2 py-1.5 text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                        title={`Upload image for Option ${lbl}`}
                      >
                        <Upload className="w-3 h-3" /> Img
                      </button>
                      <input
                        ref={(el) => { optionFileInputRefs.current[lbl] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFigure(f, lbl);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {optImg && (
                      <div className="flex items-center justify-between gap-2 pl-9 bg-white p-1.5 rounded-lg border border-slate-200">
                        <img src={optImg} alt={`Option ${lbl} preview`} className="max-h-14 object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setOptionFigures(prev => {
                              const next = { ...prev };
                              delete next[lbl];
                              return next;
                            });
                          }}
                          className="text-[10.5px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Img
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step-by-Step Explanation */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Step-by-Step Solution / Explanation
              </label>
              <textarea
                value={explanation}
                onFocus={() => setActiveField('explanation')}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400"
                placeholder="Step-by-step solution, formula derivation, or NCERT reference..."
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting || isVisualBusy}
                onClick={() => submitCorrection(false, false)}
                className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Correction
              </button>

              <button
                type="button"
                disabled={isSubmitting || isVisualBusy}
                onClick={() => submitCorrection(true, true)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                title="Mark question Verified after inspecting the Original PDF Page"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Override: Verify
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isVisualBusy}
                className="min-h-[40px] px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save & Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

