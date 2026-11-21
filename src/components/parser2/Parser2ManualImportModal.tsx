import React, { useState, useRef } from 'react';
import {
  X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles,
  ClipboardPaste, ChevronRight, ArrowLeft, Trash2, Check, Layers
} from 'lucide-react';
import { Parser2Job, Parser2Subject } from '../../services/parser2/types';
import { getAdminRequestHeaders } from '../../lib/firebase';

interface ImportedDraft {
  tempId: string;
  questionNumber: number;
  subject: Parser2Subject;
  chapter?: string;
  questionType: string;
  questionText: string;
  options: Array<{ label: 'A' | 'B' | 'C' | 'D'; text: string; value: string; imageUrl?: string }>;
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  figureUrl?: string;
  imageAttachments?: any[];
  matchTable?: any;
  structuredTable?: any;
  warnings: string[];
  hasMissingOptions: boolean;
  hasMissingAnswer: boolean;
  hasMissingExplanation: boolean;
  isDuplicateInBatch: boolean;
  alreadyExistsInTargetJob: boolean;
  selectedForImport: boolean;
}

interface PreviewPayload {
  format: string;
  sourceFileName?: string;
  rawCharCount: number;
  expectedCount: number;
  detectedCount: number;
  questions: ImportedDraft[];
  summary: {
    fourOptionCount?: number;
    warningQuestionsCount?: number;
    missingOptionsCount: number;
    missingAnswersCount: number;
    missingExplanationsCount: number;
    duplicatesInBatch: number[];
    existingInTargetJob: number[];
    numberingGaps: number[];
    tablesDetected: number;
    imagesDetected: number;
    unsupportedImageRefs: string[];
    malformedMarkdownWarnings: string[];
  };
}

interface CommitReconciliation {
  expected: number;
  detected: number;
  saved: number;
  skipped: number;
  duplicatesPrevented: number;
  verifiedPersisted: boolean;
  savedNumbers?: number[];
  failedQuestions?: Array<{ questionNumber: number; error: string }>;
  skippedReasons: Array<{ questionNumber: number; reason: string }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingJobs: Parser2Job[];
  activeJobId?: string;
  onImportSuccess: (job: Parser2Job) => void;
}

export const Parser2ManualImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingJobs,
  activeJobId,
  onImportSuccess
}) => {
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState<Parser2Subject>('Combined');
  const [chapter, setChapter] = useState('');
  const [expectedCount, setExpectedCount] = useState('');
  const [targetExistingJobId, setTargetExistingJobId] = useState<string>('');
  const [importMissingOnly, setImportMissingOnly] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [drafts, setDrafts] = useState<ImportedDraft[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [reconciliation, setReconciliation] = useState<CommitReconciliation | null>(null);
  const [savedJob, setSavedJob] = useState<Parser2Job | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGeneratePreview = async () => {
    setError(null);
    if (mode === 'paste' && rawText.trim().length < 5) {
      setError('Please paste questions (Markdown, Plain Text, or JSON) to preview.');
      return;
    }
    if (mode === 'file' && !selectedFile) {
      setError('Please select a .md, .txt, .docx, .json, or .pdf file to import.');
      return;
    }

    setLoading(true);
    try {
      let resp: Response;
      if (mode === 'file' && selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('subject', subject);
        if (targetExistingJobId) fd.append('existingJobId', targetExistingJobId);
        if (expectedCount.trim()) fd.append('expectedCount', expectedCount.trim());
        resp = await fetch('/api/parser2/import/preview', {
          method: 'POST',
          headers: getAdminRequestHeaders(),
          body: fd
        });
      } else {
        const trimmed = rawText.trim();
        const inferredFormat = trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : /[#|*`]/.test(trimmed) ? 'markdown' : 'paste';
        resp = await fetch('/api/parser2/import/preview', {
          method: 'POST',
          headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            format: inferredFormat,
            rawText,
            subject,
            existingJobId: targetExistingJobId || undefined,
            expectedCount: expectedCount.trim() ? parseInt(expectedCount.trim(), 10) : undefined
          })
        });
      }

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Could not parse input for preview.');
      }

      setPreview(data.preview);
      setDrafts(data.preview.questions || []);
      if (!testName.trim() && selectedFile) {
        setTestName(selectedFile.name.replace(/\.(md|markdown|txt|docx|json|pdf)$/i, ''));
      }
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!preview || drafts.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/parser2/import/commit', {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          testName: testName.trim() || preview.sourceFileName || `Manual ${preview.format.toUpperCase()} Import`,
          subject,
          chapter,
          format: preview.format,
          sourceFileName: preview.sourceFileName,
          existingJobId: targetExistingJobId || undefined,
          importMissingOnly: Boolean(targetExistingJobId && importMissingOnly),
          expectedCount: expectedCount.trim() ? parseInt(expectedCount.trim(), 10) : preview.expectedCount,
          questions: drafts
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to save imported questions.');
      }
      setReconciliation(data.reconciliation);
      setSavedJob(data.job);
      setStep('done');
      onImportSuccess(data.job);
    } catch (e: any) {
      setError(e.message || 'Import commit failed');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (idx: number, patch: Partial<ImportedDraft>) => {
    setDrafts(prev => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const updateDraftOption = (idx: number, label: 'A' | 'B' | 'C' | 'D', val: string) => {
    setDrafts(prev =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const nextOpts = d.options.map(o => (o.label === label ? { ...o, text: val, value: val } : o));
        return {
          ...d,
          options: nextOpts,
          hasMissingOptions: nextOpts.some(o => !o.imageUrl && !o.value.trim())
        };
      })
    );
  };

  const selectedCount = drafts.filter(d => d.selectedForImport && !(targetExistingJobId && importMissingOnly && d.alreadyExistsInTargetJob)).length;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Copy-Paste & Multi-Format Question Importer
              </h3>
              <p className="text-xs text-indigo-200">
                Supports Direct Paste, .md, .txt, .docx, .json, and .pdf — with mandatory editable preview & reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold">
          <span className={`px-2.5 py-1 rounded-full ${step === 'input' ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
            1. Source Input
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className={`px-2.5 py-1 rounded-full ${step === 'preview' ? 'bg-indigo-600 text-white' : step === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
            2. Mandatory Editable Preview
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className={`px-2.5 py-1 rounded-full ${step === 'done' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            3. Post-Import Reconciliation
          </span>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'input' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Test Name</label>
                  <input
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    placeholder="e.g., NEET Grand Test 12 (Markdown Import)"
                    disabled={Boolean(targetExistingJobId)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination Mode</label>
                  <select
                    value={targetExistingJobId}
                    onChange={e => setTargetExistingJobId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Create New Persistent Test Job</option>
                    {existingJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        Merge into: {j.testName} ({j.questionsSaved || j.totalQuestions || 0} Qs)
                        {j.id === activeJobId ? ' [Current]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value as Parser2Subject)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Combined">Combined (Full NEET)</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Botany">Botany</option>
                    <option value="Zoology">Zoology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter (Optional)</label>
                  <input
                    value={chapter}
                    onChange={e => setChapter(e.target.value)}
                    placeholder="e.g., Laws of Motion"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Qs (Optional)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={expectedCount}
                    onChange={e => setExpectedCount(e.target.value)}
                    placeholder="Auto-detect (e.g., 180)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Input Method Switch */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                    mode === 'paste'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Direct Copy-Paste (Markdown / Text / JSON)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                    mode === 'file'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File (.md, .txt, .docx, .json, .pdf)
                </button>
              </div>

              {mode === 'paste' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paste Questions Here (preserves numbering, A–D / 1–4 options, superscripts 10⁻³, Markdown tables, Match-the-Column, Answers & Explanations)
                  </label>
                  <textarea
                    rows={12}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`1. A force of 2 × 10^-3 N acts on a particle of mass 1 kg. What is its acceleration?\n(A) 2 × 10^-3 m/s^2\n(B) 4 × 10^-3 m/s^2\n(C) 10^-3 m/s^2\n(D) 2 m/s^2\nAnswer: A\nExplanation: a = F/m = 2 × 10^-3 m/s^2`}
                    className="w-full p-3 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt,.docx,.json,.pdf"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-800">Click to select a file to import</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supported formats: Markdown (.md), Plain Text (.txt), Word (.docx), JSON (.json), PDF (.pdf)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'preview' && preview && (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-[11px] font-semibold text-indigo-700">Detected</div>
                  <div className="text-lg font-extrabold text-indigo-950">{preview.detectedCount}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-semibold text-emerald-700">4/4 Opts</div>
                  <div className="text-lg font-extrabold text-emerald-950">
                    {preview.summary.fourOptionCount ?? Math.max(0, preview.detectedCount - preview.summary.missingOptionsCount)}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${preview.summary.missingOptionsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-700">Missing Opts</div>
                  <div className="text-lg font-extrabold text-slate-900">{preview.summary.missingOptionsCount}</div>
                </div>
                <div className={`p-2.5 rounded-xl border ${preview.summary.missingAnswersCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-700">Missing Keys</div>
                  <div className="text-lg font-extrabold text-slate-900">{preview.summary.missingAnswersCount}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="text-[11px] font-semibold text-purple-700">Tables</div>
                  <div className="text-lg font-extrabold text-purple-950">{preview.summary.tablesDetected}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="text-[11px] font-semibold text-sky-700">Images</div>
                  <div className="text-lg font-extrabold text-sky-950">{preview.summary.imagesDetected}</div>
                </div>
                <div className={`p-2.5 rounded-xl border ${(preview.summary.warningQuestionsCount ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-700">Warnings</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {preview.summary.warningQuestionsCount ?? drafts.filter(d => d.warnings.length > 0).length}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${preview.summary.duplicatesInBatch.length + preview.summary.numberingGaps.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-700">Gaps / Dups</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {preview.summary.numberingGaps.length} / {preview.summary.duplicatesInBatch.length}
                  </div>
                </div>
              </div>

              {/* Warnings Banner */}
              {(preview.summary.numberingGaps.length > 0 ||
                preview.summary.duplicatesInBatch.length > 0 ||
                preview.summary.unsupportedImageRefs.length > 0 ||
                preview.summary.malformedMarkdownWarnings.length > 0) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Pre-Import Integrity Findings (Review & Edit Below Before Saving)
                  </div>
                  {preview.summary.numberingGaps.length > 0 && (
                    <div>Numbering gaps detected: Q{preview.summary.numberingGaps.slice(0, 20).join(', Q')}{preview.summary.numberingGaps.length > 20 ? '…' : ''}</div>
                  )}
                  {preview.summary.duplicatesInBatch.length > 0 && (
                    <div>Duplicate question numbers in file: Q{preview.summary.duplicatesInBatch.join(', Q')} (duplicates will be safely skipped on save)</div>
                  )}
                  {preview.summary.unsupportedImageRefs.length > 0 && (
                    <div>Unsupported local image paths (upload images after import via Image Manager): {preview.summary.unsupportedImageRefs.slice(0, 4).join('; ')}</div>
                  )}
                  {preview.summary.malformedMarkdownWarnings.map((w, i) => (
                    <div key={i}>Markdown warning: {w}</div>
                  ))}
                </div>
              )}

              {/* Import Missing Only toggle when merging into existing job */}
              {targetExistingJobId && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importMissingOnly}
                    onChange={e => setImportMissingOnly(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-indigo-950">
                    Import Missing Only ({preview.summary.existingInTargetJob.length} existing question(s) in target job will be preserved untouched without duplication)
                  </span>
                </label>
              )}

              {/* Editable Question List */}
              <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {drafts.map((d, idx) => {
                  const willSkipAsExisting = Boolean(targetExistingJobId && importMissingOnly && d.alreadyExistsInTargetJob);
                  const isEditing = editingIdx === idx;
                  return (
                    <div
                      key={d.tempId}
                      className={`rounded-xl border p-3 transition-all ${
                        willSkipAsExisting || !d.selectedForImport
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : d.warnings.length > 0
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={d.selectedForImport && !willSkipAsExisting}
                            disabled={willSkipAsExisting}
                            onChange={e => updateDraft(idx, { selectedForImport: e.target.checked })}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-extrabold">
                            Q{d.questionNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">{d.subject}</span>
                          {d.correctAnswer ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              Ans: {d.correctAnswer}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                              No Answer Key
                            </span>
                          )}
                          {d.matchTable?.rows?.length ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold">
                              Match Table ({d.matchTable.rows.length} rows)
                            </span>
                          ) : null}
                          {d.structuredTable?.rows?.length ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                              Data Table ({d.structuredTable.rows.length} rows)
                            </span>
                          ) : null}
                          {willSkipAsExisting && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold">
                              Exists in Target — Skipped
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingIdx(isEditing ? null : idx)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800"
                          >
                            {isEditing ? 'Done' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrafts(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Remove from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="mt-2 space-y-1.5 text-xs text-slate-800">
                          <div className="whitespace-pre-wrap font-medium">{d.questionText || <span className="text-rose-500 italic">Empty stem</span>}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                            {d.options.map(o => (
                              <div key={o.label} className={`px-2 py-1 rounded border ${d.correctAnswer === o.label ? 'bg-emerald-50 border-emerald-300 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                                <span className="font-bold mr-1">({o.label})</span>
                                {o.value || <span className="text-rose-500 italic">Missing</span>}
                              </div>
                            ))}
                          </div>
                          {d.warnings.length > 0 && (
                            <div className="text-[11px] text-amber-700 font-medium">
                              ⚠ {d.warnings.join(' • ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-2.5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Q #</label>
                              <input
                                type="number"
                                value={d.questionNumber}
                                onChange={e => updateDraft(idx, { questionNumber: parseInt(e.target.value, 10) || 1 })}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Correct Answer</label>
                              <select
                                value={d.correctAnswer || ''}
                                onChange={e => updateDraft(idx, { correctAnswer: (e.target.value || undefined) as any, hasMissingAnswer: !e.target.value })}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              >
                                <option value="">Not Set</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Subject</label>
                              <select
                                value={d.subject}
                                onChange={e => updateDraft(idx, { subject: e.target.value as Parser2Subject })}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              >
                                <option value="Physics">Physics</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Biology">Biology</option>
                                <option value="Botany">Botany</option>
                                <option value="Zoology">Zoology</option>
                                <option value="Combined">Combined</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Question Statement</label>
                            <textarea
                              rows={3}
                              value={d.questionText}
                              onChange={e => updateDraft(idx, { questionText: e.target.value })}
                              className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(['A', 'B', 'C', 'D'] as const).map(lbl => {
                              const opt = d.options.find(o => o.label === lbl);
                              return (
                                <div key={lbl}>
                                  <label className="text-[11px] font-bold text-slate-600">Option ({lbl})</label>
                                  <input
                                    value={opt?.value || ''}
                                    onChange={e => updateDraftOption(idx, lbl, e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600">Explanation (Optional)</label>
                            <textarea
                              rows={2}
                              value={d.explanation || ''}
                              onChange={e => updateDraft(idx, { explanation: e.target.value, hasMissingExplanation: !e.target.value.trim() })}
                              className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 'done' && reconciliation && savedJob && (
            <div className="space-y-4 py-2">
              {reconciliation.failedQuestions && reconciliation.failedQuestions.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-base">
                      Partial Import Completed — {reconciliation.failedQuestions.length} Question(s) Failed to Save
                    </h4>
                    <p className="text-xs text-amber-900 mt-0.5">
                      Saved <strong>{reconciliation.saved}</strong> question(s) into "{savedJob.testName}". Review the failed list below before publishing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-base">
                      Import Saved & Verified in Persistent Database
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Job "{savedJob.testName}" now has <strong>{savedJob.questionsSaved}</strong> questions persisted in D1.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Expected</div>
                  <div className="text-xl font-extrabold text-slate-900">{reconciliation.expected}</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-xs text-indigo-700">Detected</div>
                  <div className="text-xl font-extrabold text-indigo-950">{reconciliation.detected}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700">Saved</div>
                  <div className="text-xl font-extrabold text-emerald-900">{reconciliation.saved}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs text-amber-700">Skipped</div>
                  <div className="text-xl font-extrabold text-amber-900">{reconciliation.skipped}</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-700">Dups Prevented</div>
                  <div className="text-xl font-extrabold text-blue-900">{reconciliation.duplicatesPrevented}</div>
                </div>
                <div className={`p-3 rounded-xl border ${(reconciliation.failedQuestions?.length || 0) > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs text-rose-700">Failed</div>
                  <div className="text-xl font-extrabold text-rose-900">{reconciliation.failedQuestions?.length || 0}</div>
                </div>
              </div>

              {reconciliation.failedQuestions && reconciliation.failedQuestions.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 max-h-40 overflow-y-auto text-xs space-y-1">
                  <div className="font-bold text-rose-800">Failed Question Log (Not Saved):</div>
                  {reconciliation.failedQuestions.map((f, i) => (
                    <div key={i} className="text-rose-700">
                      • Q{f.questionNumber}: {f.error}
                    </div>
                  ))}
                </div>
              )}

              {reconciliation.skippedReasons.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto text-xs space-y-1">
                  <div className="font-bold text-slate-700">Skipped Question Log:</div>
                  {reconciliation.skippedReasons.map((s, i) => (
                    <div key={i} className="text-slate-600">
                      • Q{s.questionNumber}: {s.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleGeneratePreview}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Parse & Open Editable Preview
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Input
              </button>
              <button
                type="button"
                disabled={loading || selectedCount === 0}
                onClick={handleCommitImport}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save {selectedCount} Question(s) to Database
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Open Imported Questions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
