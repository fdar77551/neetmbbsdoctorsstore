import React, { useState } from 'react';
import {
  Activity, Database, Cloud, Cpu, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, RefreshCw, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Parser2Job, Parser2Page, Parser2ProcessingLog } from '../../services/parser2/types';

interface Props {
  job: Parser2Job | null;
  pages: Parser2Page[];
  logs: Parser2ProcessingLog[];
  onRefreshJob?: () => void;
}

interface SelfTestState {
  loading: boolean;
  ok?: boolean;
  latencyMs?: number;
  summary?: string;
  details?: any;
}

export const Parser2DiagnosticsPanel: React.FC<Props> = ({ job, pages, logs, onRefreshJob }) => {
  const [apiTest, setApiTest] = useState<SelfTestState>({ loading: false });
  const [dbTest, setDbTest] = useState<SelfTestState>({ loading: false });
  const [r2Test, setR2Test] = useState<SelfTestState>({ loading: false });
  const [queueTest, setQueueTest] = useState<SelfTestState>({ loading: false });
  const [showTechLog, setShowTechLog] = useState(false);

  const runApiTest = async () => {
    setApiTest({ loading: true });
    try {
      const res = await fetch('/api/parser2/diagnostics/api');
      const d = await res.json();
      setApiTest({
        loading: false,
        ok: Boolean(d.ok),
        latencyMs: d.latencyMs,
        summary: `Gemini: ${d.gemini?.ok ? 'OK' : d.gemini?.message || 'Unavailable'} | Mistral: ${d.mistral?.ok ? 'OK' : d.mistral?.configured ? d.mistral?.message : 'Not configured'}`,
        details: d
      });
    } catch (e: any) {
      setApiTest({ loading: false, ok: false, summary: e.message || 'API check failed' });
    }
  };

  const runDbTest = async () => {
    setDbTest({ loading: true });
    try {
      const res = await fetch('/api/parser2/diagnostics/db', { method: 'POST' });
      const d = await res.json();
      setDbTest({
        loading: false,
        ok: Boolean(d.ok),
        latencyMs: d.latencyMs,
        summary: `Local: ${d.localStore?.ok ? 'OK' : 'Fail'} (${d.localStore?.jobCount ?? 0} jobs) | R2 JSON: ${d.r2Json?.configured ? (d.r2Json?.ok ? 'OK' : 'Fail') : 'Off'} | D1: ${d.d1?.configured ? (d.d1?.ok ? 'OK' : 'Fail') : 'Off'}`,
        details: d
      });
    } catch (e: any) {
      setDbTest({ loading: false, ok: false, summary: e.message || 'DB check failed' });
    }
  };

  const runR2Test = async () => {
    setR2Test({ loading: true });
    try {
      const res = await fetch('/api/parser2/diagnostics/r2', { method: 'POST' });
      const d = await res.json();
      setR2Test({
        loading: false,
        ok: Boolean(d.ok),
        latencyMs: d.latencyMs,
        summary: d.message || (d.ok ? 'Upload & readback OK' : d.error || 'R2 check failed'),
        details: d
      });
    } catch (e: any) {
      setR2Test({ loading: false, ok: false, summary: e.message || 'R2 check failed' });
    }
  };

  const runQueueTest = async () => {
    setQueueTest({ loading: true });
    try {
      const res = await fetch('/api/parser2/diagnostics/queue', { method: 'POST' });
      const d = await res.json();
      const workers = d.watchdog?.runningWorkers?.length ?? 0;
      const recovered = d.watchdog?.totalStallsRecovered ?? 0;
      setQueueTest({
        loading: false,
        ok: Boolean(d.ok),
        latencyMs: d.latencyMs,
        summary: `Watchdog active • ${workers} running worker(s) • ${recovered} stall(s) recovered`,
        details: d
      });
    } catch (e: any) {
      setQueueTest({ loading: false, ok: false, summary: e.message || 'Queue check failed' });
    }
  };

  const statusPill = (status?: string) => {
    const s = String(status || 'pending');
    if (['saved', 'completed', 'page_completed'].includes(s)) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (['retry_waiting', 'retry_required', 'stalled'].includes(s)) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (['failed', 'dead_letter'].includes(s)) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  return (
    <div className="space-y-4">
      {/* Live System Self-Test Controls (4 Required Buttons) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Parser 4.0 Live Infrastructure Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Safe real-time verification across AI APIs, Database, R2 Storage, and Queue Watchdog (zero keys or tokens exposed)
              </p>
            </div>
          </div>
          {onRefreshJob && (
            <button
              type="button"
              onClick={onRefreshJob}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Telemetry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Test API Connection', icon: Activity, state: apiTest, action: runApiTest },
            { label: 'Test Database Write/Read', icon: Database, state: dbTest, action: runDbTest },
            { label: 'Test R2 Upload/Read', icon: Cloud, state: r2Test, action: runR2Test },
            { label: 'Test Queue Worker', icon: Cpu, state: queueTest, action: runQueueTest }
          ].map(({ label, icon: Icon, state, action }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between gap-2">
              <button
                type="button"
                disabled={state.loading}
                onClick={action}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {state.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                {label}
              </button>
              {state.summary && (
                <div className={`text-[11px] rounded-lg p-2 border ${state.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  <div className="flex items-center justify-between font-bold mb-0.5">
                    <span className="flex items-center gap-1">
                      {state.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {state.ok ? 'PASS' : 'FAIL'}
                    </span>
                    {state.latencyMs !== undefined && <span>{state.latencyMs}ms</span>}
                  </div>
                  <div className="leading-snug">{state.summary}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Job Lock & Watchdog Summary */}
      {job && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">
              Per-Page Processing Telemetry — {job.testName}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                Job Status: <strong>{job.status}</strong>
              </span>
              {job.lockOwnerId && (
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                  Lock: {job.lockOwnerId}
                </span>
              )}
              {job.stallReason && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {job.stallReason}
                </span>
              )}
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">
              No per-page telemetry recorded yet for this job.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-left">
                    <th className="p-2 border border-slate-200">Pg #</th>
                    <th className="p-2 border border-slate-200">State</th>
                    <th className="p-2 border border-slate-200">Provider / Model</th>
                    <th className="p-2 border border-slate-200">Started</th>
                    <th className="p-2 border border-slate-200">Response</th>
                    <th className="p-2 border border-slate-200">OCR / Extract</th>
                    <th className="p-2 border border-slate-200">Detected / Saved</th>
                    <th className="p-2 border border-slate-200">Figures</th>
                    <th className="p-2 border border-slate-200">Review</th>
                    <th className="p-2 border border-slate-200">Retries</th>
                    <th className="p-2 border border-slate-200">Last Error / Safe Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 font-extrabold text-slate-900">
                        {p.pageNumber}
                        {p.isAnswerKeyPage && (
                          <span className="ml-1 px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            Key
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusPill(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200">
                        <div className="font-semibold text-slate-800">{p.providerUsed || job.ocrEngine}</div>
                        <div className="text-[10px] text-slate-500">{p.modelUsed || job.geminiModel}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-[11px] text-slate-600 whitespace-nowrap">
                        {p.requestStartedAt ? new Date(p.requestStartedAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono text-[11px] text-slate-700">
                        {p.responseTimeMs ?? p.processingTimeMs ? `${p.responseTimeMs ?? p.processingTimeMs}ms` : '—'}
                      </td>
                      <td className="p-2 border border-slate-200 text-[11px]">
                        <div>OCR: <strong>{p.ocrStatus || (p.ocrMarkdown ? 'ok' : '—')}</strong></div>
                        <div>Ext: <strong>{p.extractionStatus || p.status}</strong></div>
                      </td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-800">
                        {p.questionsDetectedCount ?? p.questionsExtractedCount ?? 0} / {p.questionsSavedCount ?? 0}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-semibold text-indigo-700">
                        {p.figuresSavedCount ?? p.figuresDetectedCount ?? 0}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-semibold text-amber-700">
                        {p.questionsReviewCount ?? 0}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-semibold">
                        {p.retryAttempts || 0}
                      </td>
                      <td className="p-2 border border-slate-200 max-w-xs">
                        {p.errorMessage ? (
                          <div className="text-rose-700 font-medium break-words">{p.errorMessage}</div>
                        ) : (
                          <div className="text-slate-600 break-words">{p.lastApiSummary || '—'}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expandable Technical Log */}
          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowTechLog(v => !v)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
            >
              {showTechLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showTechLog ? 'Hide Technical Processing Log' : `Expand Technical Processing Log (${logs.length} entries)`}
            </button>

            {showTechLog && (
              <div className="mt-2 rounded-xl bg-slate-950 text-slate-100 p-3 max-h-64 overflow-y-auto font-mono text-[11px] space-y-1">
                {logs.length === 0 ? (
                  <div className="text-slate-400">No log entries recorded yet.</div>
                ) : (
                  logs.map(l => (
                    <div key={l.id} className="leading-relaxed">
                      <span className="text-slate-500">[{new Date(l.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span
                        className={
                          l.level === 'error'
                            ? 'text-rose-400 font-bold'
                            : l.level === 'warn'
                            ? 'text-amber-300 font-bold'
                            : l.level === 'success'
                            ? 'text-emerald-400 font-bold'
                            : 'text-sky-300'
                        }
                      >
                        [{l.stage.toUpperCase()}]
                      </span>{' '}
                      <span>{l.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
