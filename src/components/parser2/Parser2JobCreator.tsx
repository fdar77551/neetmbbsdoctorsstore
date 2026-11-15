import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Cpu,
  AlertCircle,
  Layers,
  Key
} from 'lucide-react';
import { Parser2Subject, Parser2OcrEngine, Parser2Job } from '../../services/parser2/types';

interface Parser2JobCreatorProps {
  onClose: () => void;
  onJobCreated: (newJob: Parser2Job) => void;
}

export const Parser2JobCreator: React.FC<Parser2JobCreatorProps> = ({
  onClose,
  onJobCreated
}) => {
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState<Parser2Subject>('Combined');
  const [chapter, setChapter] = useState('');
  const [questionRange, setQuestionRange] = useState('1-180');
  const [ocrEngine, setOcrEngine] = useState<Parser2OcrEngine>('mistral');
  const [geminiModel, setGeminiModel] = useState('gemini-4-hydrogen');
  const [enableGeminiVerification, setEnableGeminiVerification] = useState(true);

  const [questionPdfFile, setQuestionPdfFile] = useState<File | null>(null);
  const [solutionPdfFile, setSolutionPdfFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [answerKeyText, setAnswerKeyText] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const qFileInputRef = useRef<HTMLInputElement>(null);
  const solFileInputRef = useRef<HTMLInputElement>(null);
  const akFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionPdfFile) {
      setError('Please upload the question paper PDF.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress('Uploading PDF & optional keys to secure storage...');

    try {
      const formData = new FormData();
      formData.append('testName', testName.trim() || questionPdfFile.name.replace(/\.pdf$/i, ''));
      formData.append('subject', subject);
      formData.append('chapter', chapter.trim());
      formData.append('questionRange', questionRange.trim());
      formData.append('ocrEngine', ocrEngine);
      formData.append('geminiModel', geminiModel);
      formData.append('enableGeminiVerification', String(enableGeminiVerification));
      formData.append('questionPdf', questionPdfFile);

      if (solutionPdfFile) {
        formData.append('solutionPdf', solutionPdfFile);
      }
      if (answerKeyFile) {
        formData.append('answerKeyFile', answerKeyFile);
      }
      if (answerKeyText.trim()) {
        formData.append('answerKeyText', answerKeyText.trim());
      }

      setUploadProgress('Creating persistent job & starting background extraction...');

      const res = await fetch('/api/parser2/jobs', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.job) {
        onJobCreated(data.job);
        onClose();
      } else {
        setError(data.error || 'Failed to create parsing job.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                New Parsing Job — NCERTify AI Parser 3.0
              </h3>
              <p className="text-xs text-slate-500">
                Persistent background extraction with Mistral OCR + Gemini Vision + PyMuPDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Test Name & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Test Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={testName}
                onChange={e => setTestName(e.target.value)}
                required
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400"
                placeholder="e.g. NEET UG Major Test-09"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Subject Scope</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value as Parser2Subject)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="Combined">Combined (Physics + Chemistry + Biology - 180 Qs)</option>
                <option value="Physics">Physics (45 Qs)</option>
                <option value="Chemistry">Chemistry (45 Qs)</option>
                <option value="Biology">Biology (90 Qs)</option>
              </select>
            </div>
          </div>

          {/* Chapter & Question Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Chapter / Topic (Optional)</label>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400"
                placeholder="e.g. Full Syllabus or Laws of Motion"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Question Range</label>
              <input
                type="text"
                value={questionRange}
                onChange={e => setQuestionRange(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400"
                placeholder="e.g. 1-180 or 1-45"
              />
            </div>
          </div>

          {/* Upload Question PDF Box */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Upload Question Paper PDF <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => qFileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                questionPdfFile
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
              }`}
            >
              <input
                ref={qFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setQuestionPdfFile(e.target.files[0]);
                    if (!testName) setTestName(e.target.files[0].name.replace(/\.pdf$/i, ''));
                  }
                }}
              />
              <UploadCloud className={`w-8 h-8 mx-auto mb-1.5 ${questionPdfFile ? 'text-emerald-600' : 'text-slate-400'}`} />
              {questionPdfFile ? (
                <div>
                  <div className="text-xs font-black text-emerald-800">{questionPdfFile.name}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    {(questionPdfFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for durable background processing
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-slate-700">Click to upload Question PDF</div>
                  <div className="text-[11px] text-slate-500">Supports multi-column, scanned, or bilingual NEET papers up to 150MB</div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Solution PDF & Separate Answer Key (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Solution PDF (Optional)
              </label>
              <div
                onClick={() => solFileInputRef.current?.click()}
                className={`p-3 border border-dashed rounded-xl text-center cursor-pointer transition min-h-[60px] flex items-center justify-center ${
                  solutionPdfFile
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/30'
                }`}
              >
                <input
                  ref={solFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSolutionPdfFile(e.target.files[0]);
                    }
                  }}
                />
                {solutionPdfFile ? (
                  <div className="flex items-center justify-between w-full px-1 text-xs font-bold text-emerald-800">
                    <span className="truncate">{solutionPdfFile.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSolutionPdfFile(null);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Attach Solutions PDF</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Answer Key Image / Text File (Optional)
              </label>
              <div
                onClick={() => akFileInputRef.current?.click()}
                className={`p-3 border border-dashed rounded-xl text-center cursor-pointer transition min-h-[60px] flex items-center justify-center ${
                  answerKeyFile
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/30'
                }`}
              >
                <input
                  ref={akFileInputRef}
                  type="file"
                  accept="image/*,.txt"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setAnswerKeyFile(e.target.files[0]);
                    }
                  }}
                />
                {answerKeyFile ? (
                  <div className="flex items-center justify-between w-full px-1 text-xs font-bold text-emerald-800">
                    <span className="truncate">{answerKeyFile.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setAnswerKeyFile(null);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Upload Answer Key Screenshot / TXT</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Paste Answer Key Text */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Paste Answer Key Text (Optional — supports 1. (A), 2: B, 3-C, or 1-4 numbering)
            </label>
            <textarea
              rows={2}
              value={answerKeyText}
              onChange={e => setAnswerKeyText(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden placeholder-slate-400 resize-none"
              placeholder="e.g. 1. A, 2. C, 3. (2), 4-D ... (Leave blank if no separate key yet; missing answers are safely flagged without guessing)"
            />
          </div>

          {/* Engine & Verification Options */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
              Parsing &amp; Verification Engine
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">OCR Engine</label>
                <select
                  value={ocrEngine}
                  onChange={e => setOcrEngine(e.target.value as Parser2OcrEngine)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                >
                  <option value="mistral">Mistral OCR API (Recommended)</option>
                  <option value="gemini">Gemini Multimodal Direct</option>
                  <option value="hybrid">Hybrid (Mistral OCR + Gemini Dual-Pass)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gemini Verification Model</label>
                <select
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-hidden"
                >
                  <option value="gemini-4-hydrogen">gemini-4-hydrogen (Fast Multimodal)</option>
                  <option value="gemini-4-argon">gemini-4-argon</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={enableGeminiVerification}
                onChange={e => setEnableGeminiVerification(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Enable Gemini multimodal verification to inspect formulas, superscripts, and chemistry structures</span>
            </label>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-black text-blue-900">
                <span>{uploadProgress}</span>
                <span>In Progress</span>
              </div>
              <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-progress" />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || !questionPdfFile}
              className="min-h-[42px] px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              {isUploading ? 'Queueing Job...' : 'Start Background Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
