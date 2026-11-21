import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, ShieldCheck, ArrowRight } from 'lucide-react';
import { Parser2ValidationReport } from '../../services/parser2/types';

interface Parser2ValidationModalProps {
  report: Parser2ValidationReport;
  onClose: () => void;
  onSelectQuestion?: (questionNumber: number) => void;
}

export const Parser2ValidationModal: React.FC<Parser2ValidationModalProps> = ({
  report,
  onClose,
  onSelectQuestion
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs ${
              report.canPublish ? 'bg-emerald-600' : 'bg-amber-600'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                Automated Validation & Audit Report
              </h3>
              <p className="text-xs text-slate-500">
                12-Point Automated Examination Integrity Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quality Score Hero */}
        <div className={`p-5 border-b flex flex-wrap items-center justify-between gap-4 ${
          report.canPublish 
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' 
            : (report.reconciliation?.extractedQuestions ?? 1) === 0
            ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-0.5">
              Overall Examination Quality
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-['Outfit',sans-serif] ${
                report.qualityScore === null || report.qualityScore === undefined || (report.reconciliation?.extractedQuestions ?? 0) === 0
                  ? 'text-slate-500'
                  : report.canPublish
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                {report.qualityScore === null || report.qualityScore === undefined || (report.reconciliation?.extractedQuestions ?? 0) === 0
                  ? 'N/A'
                  : `${report.qualityScore}%`}
              </span>
              <span className="text-xs font-bold text-slate-600">
                ({report.passedChecks}/{report.totalChecks} Checks Passed)
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mt-1">
              {report.summary}
            </p>
            {report.reconciliation && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold text-slate-600 tabular-nums">
                <span>
                  Expected:{' '}
                  {report.reconciliation.expectedQuestions != null
                    ? `${report.reconciliation.expectedQuestions}${report.reconciliation.expectedQuestionsSource === 'manual' ? ' (Manual)' : ' (Auto)'}`
                    : 'Auto'}
                </span>
                <span>·</span>
                <span>Extracted: {report.reconciliation.extractedQuestions}</span>
                <span>·</span>
                <span>Saved: {report.reconciliation.savedQuestions ?? report.reconciliation.extractedQuestions}</span>
                <span>·</span>
                <span>
                  Missing:{' '}
                  {report.reconciliation.missingQuestions != null
                    ? report.reconciliation.missingQuestions
                    : 'N/A'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700">{report.criticalErrorsCount} Critical Errors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-700">{report.warningsCount} Warnings</span>
            </div>
          </div>
        </div>

        {/* Checks Checklist */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {report.checks.map((check) => {
            const isCritical = check.severity === 'critical';
            const isPublishBlocker = !check.passed && isCritical;

            return (
              <div
                key={check.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  check.passed
                    ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                    : isCritical
                    ? 'bg-rose-50/70 border-rose-300 text-slate-900'
                    : 'bg-amber-50/40 border-amber-200 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 w-full">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : isCritical ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                          {check.title}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          check.passed 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isCritical 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {check.passed ? 'PASSED' : check.severity}
                        </span>
                        {isPublishBlocker && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white">
                            Blocks Clean Publish
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {check.message}
                      </p>

                      {/* Affected question chips with jump targets */}
                      {check.affectedQuestionNumbers && check.affectedQuestionNumbers.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">Jump to fix:</span>
                          {check.affectedQuestionNumbers.map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                onSelectQuestion?.(num);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-white hover:bg-blue-600 hover:text-white border border-slate-300 px-2 py-0.5 rounded-md transition cursor-pointer shadow-2xs"
                              title={`Click to view and edit Question ${num}`}
                            >
                              <span>Q{num}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Close Audit Report
          </button>
        </div>

      </div>
    </div>
  );
};
