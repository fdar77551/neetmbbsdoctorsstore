import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Save, 
  Check, 
  HelpCircle,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import { MockQuestion, MockTest } from '../types';

interface DetectedAnswerItem {
  questionNumber: number;
  answer: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  rawText?: string;
  isManuallyEdited?: boolean;
}

interface AdminAnswerKeyModalProps {
  test: MockTest;
  questions: MockQuestion[];
  onApplyAnswers: (updatedQuestions: MockQuestion[]) => void;
  onClose: () => void;
}

export const AdminAnswerKeyModal: React.FC<AdminAnswerKeyModalProps> = ({
  test,
  questions,
  onApplyAnswers,
  onClose
}) => {
  const [activeMethod, setActiveMethod] = useState<'upload_pdf' | 'upload_image' | 'paste_text'>('paste_text');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedAnswers, setDetectedAnswers] = useState<Map<number, DetectedAnswerItem>>(new Map());
  const [hasProcessed, setHasProcessed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showReviewOnly, setShowReviewOnly] = useState(false);

  // Initialize with current answers if any exist
  React.useEffect(() => {
    const existing = new Map<number, DetectedAnswerItem>();
    questions.forEach(q => {
      if (q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer.toUpperCase())) {
        existing.set(q.questionNumber, {
          questionNumber: q.questionNumber,
          answer: q.correctAnswer as 'A' | 'B' | 'C' | 'D',
          confidence: 1.0,
          rawText: 'Current Test Value'
        });
      }
    });
    if (existing.size > 0 && !hasProcessed) {
      setDetectedAnswers(existing);
    }
  }, [questions, hasProcessed]);

  // Handle File Upload for PDF or Image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Local Regex Parser for Pasted Answer Key
  const parsePastedTextLocally = (text: string): Map<number, DetectedAnswerItem> => {
    const map = new Map<number, DetectedAnswerItem>();
    if (!text.trim()) return map;

    // Pattern 1: e.g. "1-B, 2-C, 3-A, 4-D" or "1. B 2. C" or "Q1: A" or "1 (B)" or "1. (3)"
    const lines = text.split(/[\n,;]+/);
    const pairRegex = /(?:Q|Question\s*)?(\d{1,3})\s*[:\.\-\)\s]+\(?([A-Da-d1-4])\)?/g;

    let match;
    while ((match = pairRegex.exec(text)) !== null) {
      const qNum = parseInt(match[1], 10);
      let optRaw = match[2].toUpperCase();
      // Map 1->A, 2->B, 3->C, 4->D
      if (optRaw === '1') optRaw = 'A';
      else if (optRaw === '2') optRaw = 'B';
      else if (optRaw === '3') optRaw = 'C';
      else if (optRaw === '4') optRaw = 'D';

      if (qNum > 0 && ['A', 'B', 'C', 'D'].includes(optRaw)) {
        map.set(qNum, {
          questionNumber: qNum,
          answer: optRaw as 'A' | 'B' | 'C' | 'D',
          confidence: 0.95,
          rawText: match[0].trim()
        });
      }
    }

    // Pattern 2: Tabular whitespace columns e.g. "1 B\n2 C\n3 A"
    if (map.size === 0) {
      lines.forEach(line => {
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const num = parseInt(parts[0].replace(/\D/g, ''), 10);
          let opt = parts[1].replace(/[\(\)\.]/g, '').toUpperCase();
          if (opt === '1') opt = 'A';
          else if (opt === '2') opt = 'B';
          else if (opt === '3') opt = 'C';
          else if (opt === '4') opt = 'D';

          if (!isNaN(num) && num > 0 && ['A', 'B', 'C', 'D'].includes(opt)) {
            map.set(num, {
              questionNumber: num,
              answer: opt as 'A' | 'B' | 'C' | 'D',
              confidence: 0.9,
              rawText: trimmed
            });
          }
        }
      });
    }

    return map;
  };

  // Run AI / OCR Recognition
  const handleProcessAnswerKey = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. If method is paste_text, try local parsing first
      if (activeMethod === 'paste_text') {
        if (!pastedText.trim()) {
          setErrorMessage('Please paste answer key text first (e.g. "1-B, 2-C, 3-A...").');
          setIsProcessing(false);
          return;
        }

        const localParsed = parsePastedTextLocally(pastedText);

        // Also call backend AI if text is irregular or complex
        try {
          const res = await fetch('/api/ai/parse-answer-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawText: pastedText,
              totalQuestions: test.totalQuestions || questions.length
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.answers && Array.isArray(data.answers)) {
              data.answers.forEach((ans: any) => {
                const qNum = Number(ans.questionNumber);
                let opt = String(ans.answer).toUpperCase();
                if (opt === '1') opt = 'A';
                else if (opt === '2') opt = 'B';
                else if (opt === '3') opt = 'C';
                else if (opt === '4') opt = 'D';

                if (qNum > 0 && ['A', 'B', 'C', 'D'].includes(opt)) {
                  localParsed.set(qNum, {
                    questionNumber: qNum,
                    answer: opt as 'A' | 'B' | 'C' | 'D',
                    confidence: ans.confidence !== undefined ? ans.confidence : 0.9,
                    rawText: ans.rawText || `AI parsed Q${qNum} -> ${opt}`
                  });
                }
              });
            }
          }
        } catch {
          // If network / API limit, fallback gracefully to localParsed
        }

        if (localParsed.size === 0) {
          setErrorMessage('Could not extract valid question-answer pairs. Please check your text format.');
          setIsProcessing(false);
          return;
        }

        setDetectedAnswers(localParsed);
        setHasProcessed(true);
      } else {
        // Method: upload_pdf or upload_image
        if (!fileBase64) {
          setErrorMessage(`Please select a ${activeMethod === 'upload_pdf' ? 'PDF document' : 'image/photo'} first.`);
          setIsProcessing(false);
          return;
        }

        const payload: any = {
          totalQuestions: test.totalQuestions || questions.length
        };

        if (activeMethod === 'upload_pdf') {
          payload.pdfBase64 = fileBase64;
        } else {
          payload.imageBase64 = fileBase64;
        }

        const res = await fetch('/api/ai/parse-answer-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to analyze answer key file with AI OCR.');
        }

        const parsedMap = new Map<number, DetectedAnswerItem>();
        if (Array.isArray(data.answers)) {
          data.answers.forEach((ans: any) => {
            const qNum = Number(ans.questionNumber);
            let opt = String(ans.answer).toUpperCase();
            if (opt === '1') opt = 'A';
            else if (opt === '2') opt = 'B';
            else if (opt === '3') opt = 'C';
            else if (opt === '4') opt = 'D';

            if (qNum > 0 && ['A', 'B', 'C', 'D'].includes(opt)) {
              parsedMap.set(qNum, {
                questionNumber: qNum,
                answer: opt as 'A' | 'B' | 'C' | 'D',
                confidence: ans.confidence !== undefined ? ans.confidence : 0.9,
                rawText: ans.rawText
              });
            }
          });
        }

        if (parsedMap.size === 0) {
          setErrorMessage('AI OCR could not find any answer key matrix on this document. Please verify the file.');
          setIsProcessing(false);
          return;
        }

        setDetectedAnswers(parsedMap);
        setHasProcessed(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing answer key.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Change individual answer in table
  const handleOptionChange = (questionNumber: number, newOption: 'A' | 'B' | 'C' | 'D') => {
    setDetectedAnswers(prev => {
      const copy = new Map<number, DetectedAnswerItem>(prev);
      const existing = copy.get(questionNumber);
      copy.set(questionNumber, {
        questionNumber,
        answer: newOption,
        confidence: 1.0,
        isManuallyEdited: true,
        rawText: existing?.rawText || 'Admin Verified'
      });
      return copy;
    });
  };

  // Apply to Questions and Save
  const handleApplyToTest = () => {
    if (detectedAnswers.size === 0) {
      setErrorMessage('No answers available to apply.');
      return;
    }

    // Map strictly by actual question number (Requirement 15)
    const updated = questions.map(q => {
      const item = detectedAnswers.get(q.questionNumber);
      if (item && item.answer) {
        return {
          ...q,
          correctAnswer: item.answer,
          needsReview: item.confidence < 0.8 && !item.isManuallyEdited ? true : false
        };
      }
      return q;
    });

    onApplyAnswers(updated);
    onClose();
  };

  // Derived counts
  const totalTargetQs = questions.length || test.totalQuestions || 180;
  const mappedCount = detectedAnswers.size;
  const reviewRequiredCount = (Array.from(detectedAnswers.values()) as DetectedAnswerItem[]).filter(
    a => a.confidence < 0.8 && !a.isManuallyEdited
  ).length;

  // Filtered rows for the review table
  const questionRows = questions.map(q => {
    const item = detectedAnswers.get(q.questionNumber);
    const isUnderReview = item ? (item.confidence < 0.8 && !item.isManuallyEdited) : true;
    return {
      qNum: q.questionNumber,
      subject: q.subject,
      currentAns: q.correctAnswer,
      detectedItem: item,
      isUnderReview
    };
  }).filter(row => {
    if (showReviewOnly && !row.isUnderReview) return false;
    if (searchFilter.trim()) {
      const s = searchFilter.toLowerCase().trim();
      return (
        String(row.qNum).includes(s) ||
        row.subject.toLowerCase().includes(s) ||
        (row.detectedItem?.answer || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>AI Answer Key System (Method 1, 2, 3)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
              Answer Key Digitizer &amp; Question Mapper
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Target Test: <strong className="text-slate-800 font-semibold">{test.title}</strong> ({questions.length} questions loaded)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Method Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Select Answer Key Ingestion Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveMethod('paste_text');
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                  activeMethod === 'paste_text'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-xs text-blue-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">Method 3: Paste Text</div>
                  <div className="text-[10px] text-slate-500">e.g. "1-B, 2-C, 3-A..."</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMethod('upload_pdf');
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                  activeMethod === 'upload_pdf'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-xs text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">Method 1: Upload PDF</div>
                  <div className="text-[10px] text-slate-500">Multi-page official PDF</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMethod('upload_image');
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                  activeMethod === 'upload_image'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 shadow-xs text-purple-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">Method 2: Upload Image</div>
                  <div className="text-[10px] text-slate-500">Photo / Scan / Screenshot</div>
                </div>
              </button>
            </div>
          </div>

          {/* Ingestion Input Container */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            {activeMethod === 'paste_text' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Paste Answer Key Text</label>
                  <span className="text-[10px] text-slate-400">Supports "1-B", "1. (4)", "Q1: C", column tables</span>
                </div>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  placeholder="Paste your answer key here. Examples:&#10;1-B, 2-C, 3-A, 4-D&#10;or:&#10;1. (2)&#10;2. (3)&#10;3. (1)"
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  {activeMethod === 'upload_pdf' ? 'Select Answer Key PDF Document' : 'Select Answer Key Image / Photo / Screenshot'}
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-white hover:border-blue-400 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept={activeMethod === 'upload_pdf' ? '.pdf,application/pdf' : 'image/*'}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      {selectedFile ? selectedFile.name : `Click to choose ${activeMethod === 'upload_pdf' ? 'PDF' : 'Image'} or drag and drop`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB selected` : 'AI OCR will parse question numbers and options with confidence scoring'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Trigger Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Uses resilient Gemini multimodal OCR with local regex fallback.
              </span>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleProcessAnswerKey}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Answer Key with AI OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Process &amp; Detect Answers</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit & Interactive Review Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Question → Answer Mapping Audit
                </h3>
                <p className="text-[11px] text-slate-500">
                  Detected {mappedCount} of {totalTargetQs} questions. Review options below before publishing.
                </p>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2 text-[10.5px] font-bold">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{mappedCount} Assigned</span>
                </span>
                {reviewRequiredCount > 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>{reviewRequiredCount} Review Required</span>
                  </span>
                )}
              </div>
            </div>

            {/* Filter / Search within answers */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Filter question # or subject..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowReviewOnly(!showReviewOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  showReviewOnly
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>{showReviewOnly ? 'Show All' : 'Review Only'}</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="p-2.5 pl-3">Q#</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Current</th>
                    <th className="p-2.5">Detected Correct Option (Interactive)</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questionRows.map(row => {
                    const chosen = row.detectedItem?.answer || row.currentAns;
                    const confidence = row.detectedItem?.confidence ?? 1.0;
                    const isManual = row.detectedItem?.isManuallyEdited;

                    return (
                      <tr key={row.qNum} className="hover:bg-slate-50/70 transition">
                        <td className="p-2 pl-3 font-mono font-black text-slate-900">
                          #{row.qNum}
                        </td>
                        <td className="p-2 text-slate-600 font-medium">
                          {row.subject}
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-500">
                          {row.currentAns || '-'}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {(['A', 'B', 'C', 'D'] as const).map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleOptionChange(row.qNum, opt)}
                                className={`w-6 h-6 rounded-lg text-xs font-black transition cursor-pointer ${
                                  chosen === opt
                                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-2">
                          {isManual ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              <Check className="w-2.5 h-2.5" /> Admin Set
                            </span>
                          ) : confidence >= 0.8 && chosen ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                            </span>
                          ) : chosen ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-2.5 h-2.5" /> ⚠ Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={detectedAnswers.size === 0}
              onClick={handleApplyToTest}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply &amp; Confirm Answer Key ({detectedAnswers.size} Qs)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
