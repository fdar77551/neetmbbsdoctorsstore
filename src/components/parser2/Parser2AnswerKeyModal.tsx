import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Save,
  Table as TableIcon,
  Wand2,
  Loader2,
  FileText
} from 'lucide-react';
import {
  Parser2AnswerKeyEntry,
  Parser2Job,
  Parser2Question,
  Parser2ValidationReport
} from '../../services/parser2/types';
import { getAdminRequestHeaders } from '../../lib/firebase';

export interface AnswerKeyComparisonRow {
  questionNumber: number;
  questionId?: string;
  sourcePageNumber: number;
  sourcePageRange?: string;
  currentAnswer?: 'A' | 'B' | 'C' | 'D';
  detectedAnswer?: 'A' | 'B' | 'C' | 'D';
  importedAnswer?: 'A' | 'B' | 'C' | 'D';
  setCode?: string;
  sourcePage?: number;
  confidence?: number;
  sourceType?: Parser2AnswerKeyEntry['sourceType'];
  status: 'matched' | 'missing' | 'conflict' | 'needs_review' | 'verified';
}

interface Parser2AnswerKeyModalProps {
  job: Parser2Job;
  questions: Parser2Question[];
  onClose: () => void;
  onDataUpdated: (payload: {
    questions?: Parser2Question[];
    job?: Parser2Job;
    validationReport?: Parser2ValidationReport;
    message?: string;
  }) => void;
}

type ModalTab = 'comparison' | 'detect' | 'import';
type StatusFilter = 'all' | 'matched' | 'missing' | 'conflict' | 'needs_review' | 'verified';

export const Parser2AnswerKeyModal: React.FC<Parser2AnswerKeyModalProps> = ({
  job,
  questions,
  onClose,
  onDataUpdated
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('comparison');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [comparison, setComparison] = useState<AnswerKeyComparisonRow[]>([]);
  const [answerKeysMap, setAnswerKeysMap] = useState<Record<number, Parser2AnswerKeyEntry>>({});
  const [editedAnswers, setEditedAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  // Auto-detect state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedEntries, setDetectedEntries] = useState<Parser2AnswerKeyEntry[]>([]);
  const [detectedPages, setDetectedPages] = useState<number[]>([]);
  const [detectSetCode, setDetectSetCode] = useState('');

  // Upload / Paste state
  const [akFile, setAkFile] = useState<File | null>(null);
  const [akRawText, setAkRawText] = useState('');
  const [setCode, setSetCode] = useState('');
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Delete confirmation
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAnswerKeyData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${job.id}/answer-key`, {
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setAnswerKeysMap(data.answerKeys || {});
        setComparison(Array.isArray(data.comparison) ? data.comparison : []);
        setEditedAnswers({});
      } else {
        setError(data.error || 'Failed to load answer key data.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading answer keys.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnswerKeyData();
  }, [job.id]);

  const handleDetectFromPdf = async (applyImmediately: boolean, overwriteUnmatchedOnly = false) => {
    setIsDetecting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${job.id}/answer-key/detect`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          apply: applyImmediately,
          overwriteManual: overwriteUnmatchedOnly ? false : overwriteManual,
          setCode: detectSetCode.trim() || undefined
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Answer key detection failed.');
        return;
      }

      setDetectedEntries(Array.isArray(data.entries) ? data.entries : []);
      setDetectedPages(Array.isArray(data.keyPages) ? data.keyPages : []);
      if (Array.isArray(data.comparison)) setComparison(data.comparison);
      if (data.answerKeys) setAnswerKeysMap(data.answerKeys);

      if (applyImmediately) {
        onDataUpdated({
          questions: data.questions,
          job: data.job,
          validationReport: data.validationReport,
          message: data.message
        });
        setNotice(data.message || 'Detected answer keys applied!');
        setActiveTab('comparison');
      } else {
        setNotice(
          data.detectedCount > 0
            ? `Preview ready: ${data.detectedCount} keys found on page(s) ${(data.keyPages || []).join(', ')}. Review and click Apply.`
            : 'No answer key table was detected inside the current PDF. You can upload an external Answer Key PDF/image or paste text.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error detecting answer key from current PDF.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!akRawText.trim() && !akFile) {
      setError('Choose a PDF / image / TXT answer key file, or paste answer key text.');
      return;
    }

    setIsImporting(true);
    setError(null);
    setNotice(null);
    try {
      let res: Response;
      if (akFile) {
        const fd = new FormData();
        fd.append('answerKeyFile', akFile);
        if (akRawText.trim()) fd.append('rawText', akRawText.trim());
        if (setCode.trim()) fd.append('setCode', setCode.trim());
        fd.append('overwriteManual', String(overwriteManual));
        fd.append('replaceAll', String(replaceAll));
        res = await fetch(`/api/parser2/jobs/${job.id}/answer-key`, {
          method: 'POST',
          headers: getAdminRequestHeaders(),
          body: fd
        });
      } else {
        res = await fetch(`/api/parser2/jobs/${job.id}/answer-key`, {
          method: 'POST',
          headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            rawText: akRawText.trim(),
            setCode: setCode.trim() || undefined,
            overwriteManual,
            replaceAll
          })
        });
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Answer key import failed.');
        return;
      }

      if (data.answerKeys) setAnswerKeysMap(data.answerKeys);
      if (Array.isArray(data.comparison)) setComparison(data.comparison);
      setEditedAnswers({});
      setAkFile(null);
      setAkRawText('');
      onDataUpdated({
        questions: data.questions,
        job: data.job,
        validationReport: data.validationReport,
        message: data.message
      });
      setNotice(data.message || 'Answer key imported and matched cleanly!');
      setActiveTab('comparison');
    } catch (err: any) {
      setError(err.message || 'Network error while importing answer key.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveSpreadsheetEdits = async () => {
    const dirtyEntries = Object.entries(editedAnswers).map(([qNumStr, ans]) => ({
      questionNumber: Number(qNumStr),
      verifiedAnswer: ans,
      rawAnswer: ans,
      sourceType: 'manual' as const,
      confidence: 100
    }));

    if (dirtyEntries.length === 0) return;

    setIsSavingEdits(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${job.id}/answer-key`, {
        method: 'PUT',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          entries: dirtyEntries,
          setCode: setCode.trim() || undefined,
          overwriteManual: true,
          replaceAll: false
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save spreadsheet edits.');
        return;
      }

      if (data.answerKeys) setAnswerKeysMap(data.answerKeys);
      if (Array.isArray(data.comparison)) setComparison(data.comparison);
      setEditedAnswers({});
      onDataUpdated({
        questions: data.questions,
        job: data.job,
        validationReport: data.validationReport,
        message: data.message
      });
      setNotice(data.message || `Saved ${dirtyEntries.length} updated answer key entries.`);
    } catch (err: any) {
      setError(err.message || 'Error saving spreadsheet edits.');
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleClearAllKeys = async () => {
    setIsClearing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${job.id}/answer-key`, {
        method: 'DELETE',
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to clear answer keys.');
        return;
      }
      setAnswerKeysMap({});
      if (Array.isArray(data.comparison)) setComparison(data.comparison);
      setEditedAnswers({});
      setConfirmClearAll(false);
      onDataUpdated({
        questions: data.questions,
        job: data.job,
        validationReport: data.validationReport,
        message: data.message
      });
      setNotice(data.message || 'Removed stored answer key entries.');
    } catch (err: any) {
      setError(err.message || 'Network error clearing answer keys.');
    } finally {
      setIsClearing(false);
    }
  };

  const dirtyCount = Object.keys(editedAnswers).length;
  const totalStoredKeys = Object.keys(answerKeysMap).length;

  const statusCounts = {
    all: comparison.length,
    matched: comparison.filter(r => r.status === 'matched').length,
    missing: comparison.filter(r => r.status === 'missing').length,
    conflict: comparison.filter(r => r.status === 'conflict').length,
    needs_review: comparison.filter(r => r.status === 'needs_review').length,
    verified: comparison.filter(r => r.status === 'verified').length
  };

  const filteredRows = comparison.filter(r => (statusFilter === 'all' ? true : r.status === statusFilter));

  const renderStatusPill = (status: AnswerKeyComparisonRow['status']) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Verified
          </span>
        );
      case 'matched':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Matched
          </span>
        );
      case 'conflict':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Conflict
          </span>
        );
      case 'needs_review':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Needs Review
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Missing
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Answer Key Engine · {job.testName}
              </h4>
              <p className="text-[11px] text-slate-500">
                {totalStoredKeys} stored key{totalStoredKeys === 1 ? '' : 's'} · {questions.length} parsed question{questions.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalStoredKeys > 0 &&
              (confirmClearAll ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-rose-800">Remove all keys?</span>
                  <button
                    type="button"
                    disabled={isClearing}
                    onClick={handleClearAllKeys}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black cursor-pointer disabled:opacity-50"
                  >
                    {isClearing ? 'Removing...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="min-h-[36px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Key
                </button>
              ))}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Answer Key Manager"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comparison' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Comparison Spreadsheet ({comparison.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('detect')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'detect' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Detect from Current PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload PDF / Image / Bulk Paste
          </button>
        </div>

        {/* Alert Banners */}
        {error && (
          <div className="px-4 sm:px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}
        {notice && (
          <div className="px-4 sm:px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{notice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'comparison' && (
            <div className="space-y-3">
              {/* Filter Bar + Quick Detect CTA */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['all', `All (${statusCounts.all})`],
                      ['verified', `Verified (${statusCounts.verified})`],
                      ['matched', `Matched (${statusCounts.matched})`],
                      ['conflict', `Conflict (${statusCounts.conflict})`],
                      ['needs_review', `Needs Review (${statusCounts.needs_review})`],
                      ['missing', `Missing (${statusCounts.missing})`]
                    ] as Array<[StatusFilter, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatusFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                        statusFilter === id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDetectFromPdf(false)}
                    disabled={isDetecting}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Scan Current PDF
                  </button>
                  {dirtyCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSaveSpreadsheetEdits}
                      disabled={isSavingEdits}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingEdits ? 'Saving...' : `Save ${dirtyCount} Change${dirtyCount === 1 ? '' : 's'}`}
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading comparison spreadsheet...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No questions or answer key entries match this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="px-3 py-2">Q#</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Current / Extracted</th>
                        <th className="px-3 py-2">Imported Key</th>
                        <th className="px-3 py-2">Edit Answer (A–D)</th>
                        <th className="px-3 py-2">Conf</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map(row => {
                        const effectiveAns = editedAnswers[row.questionNumber] ?? row.currentAnswer;
                        const isDirty = editedAnswers[row.questionNumber] !== undefined;
                        return (
                          <tr
                            key={row.questionNumber}
                            className={
                              row.status === 'conflict'
                                ? 'bg-rose-50/40'
                                : isDirty
                                ? 'bg-indigo-50/40'
                                : 'hover:bg-slate-50/70'
                            }
                          >
                            <td className="px-3 py-2 font-black text-slate-900 tabular-nums">
                              Q{row.questionNumber}
                            </td>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                              {row.sourcePageRange || (row.sourcePageNumber ? `Pg ${row.sourcePageNumber}` : row.sourcePage ? `Key Pg ${row.sourcePage}` : '—')}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-700">
                              {row.currentAnswer || row.detectedAnswer || <span className="text-slate-400 font-normal">None</span>}
                            </td>
                            <td className="px-3 py-2 font-bold text-indigo-700">
                              {row.importedAnswer ? (
                                <span>
                                  {row.importedAnswer}
                                  {row.setCode ? <span className="text-[10px] text-slate-400 ml-1">({row.setCode})</span> : null}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                                  const selected = effectiveAns === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        setEditedAnswers(prev => ({ ...prev, [row.questionNumber]: opt }))
                                      }
                                      className={`w-7 h-7 rounded-lg font-black text-xs cursor-pointer transition ${
                                        selected
                                          ? 'bg-indigo-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-500 tabular-nums">
                              {typeof row.confidence === 'number' ? `${Math.round(row.confidence)}%` : '—'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {renderStatusPill(row.status)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'detect' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-black text-indigo-950 font-['Outfit',sans-serif]">
                      Detect Answer Key from Current Uploaded PDF
                    </h5>
                    <p className="text-xs text-indigo-800/80 mt-0.5">
                      Scans the PDF pages and cached OCR for trailing Answer Key tables, maps Question Numbers 1–200 (normalizing 1→A, 2→B, 3→C, 4→D), and previews results before applying.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={detectSetCode}
                      onChange={e => setDetectSetCode(e.target.value)}
                      placeholder="Set / Code (optional)"
                      className="w-36 px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isDetecting}
                      onClick={() => handleDetectFromPdf(false)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
                    >
                      {isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {isDetecting ? 'Scanning PDF...' : 'Scan & Preview Keys'}
                    </button>
                  </div>
                </div>
              </div>

              {detectedEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700">
                      Found {detectedEntries.length} answer key entries on page(s) {detectedPages.join(', ') || 'PDF'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDetecting}
                        onClick={() => handleDetectFromPdf(true, true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        Apply to Unmatched Only
                      </button>
                      <button
                        type="button"
                        disabled={isDetecting}
                        onClick={() => handleDetectFromPdf(true, false)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Apply All ({detectedEntries.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1">
                    {detectedEntries.map(entry => (
                      <div
                        key={entry.questionNumber}
                        className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-700">Q{entry.questionNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black">
                          {entry.verifiedAnswer}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Upload Answer Key File (PDF, Image, or TXT)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer text-xs font-bold transition ${
                      akFile
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-indigo-400'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,application/pdf,image/*,.txt"
                      className="hidden"
                      onChange={e => setAkFile(e.target.files?.[0] || null)}
                    />
                    {akFile ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> {akFile.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> Choose PDF, Image Screenshot, or TXT
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Exam Set / Booklet Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={setCode}
                    onChange={e => setSetCode(e.target.value)}
                    placeholder="e.g. Code A, Set Q1, Master Key"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Stored alongside every imported key entry for booklet auditability.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Or Paste Bulk Answer Key Text
                </label>
                <textarea
                  rows={5}
                  value={akRawText}
                  onChange={e => setAkRawText(e.target.value)}
                  placeholder={'Examples:\n1-A\n2-C\n3-B\n4-D\nor: 1. (1)  2. (3)  3. B  4-D'}
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteManual}
                    onChange={e => setOverwriteManual(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Overwrite manually edited answers</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceAll}
                    onChange={e => setReplaceAll(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  <span>Replace existing imported key map cleanly</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="min-h-[40px] px-5 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isImporting ? 'Extracting & Matching...' : 'Import & Match Answer Key'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Conflicts highlight differences between extracted and imported keys without overwriting verified edits unless enabled.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
