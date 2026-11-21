import React, { useState, useEffect } from 'react';
import { X, Settings2, Save, Cpu, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Activity } from 'lucide-react';
import { Parser2Settings } from '../../services/parser2/types';

interface Parser2SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const Parser2SettingsModal: React.FC<Parser2SettingsModalProps> = ({
  onClose,
  onSaved
}) => {
  const [settings, setSettings] = useState<Parser2Settings>({
    defaultProvider: 'gemini',
    mistralOcrEnabled: true,
    mistralModel: 'mistral-ocr-latest',
    geminiVerificationEnabled: true,
    geminiModel: 'gemini-4-hydrogen',
    allowProviderFallback: true,
    fallbackProvider: 'gemini',
    autoScanAnswerKey: true,
    ocrBatchSize: 4,
    retryCount: 4,
    maxApiRetries: 5,
    geminiMaxConcurrency: 1,
    geminiCooldownMs: 1500,
    mistralMaxConcurrency: 1,
    mistralCooldownMs: 1000,
    pageLimit: 100,
    maxFileSizeMb: 50,
    figureDpi: 180,
    requireManualReviewForUncertain: true,
    estimatedCostPerPageCent: 0.15
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ mistral?: any; gemini?: any } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/parser2/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings({
            ...data.settings,
            geminiModel: data.settings.geminiModel === 'gemini-3.8-flash' ? 'gemini-4-hydrogen' : (data.settings.geminiModel || 'gemini-4-hydrogen')
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleTestConnections = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/parser2/test-connections');
      const data = await res.json();
      if (data.success) {
        setTestResult(data);
      }
    } catch (e: any) {
      setFeedback('Failed to test connections: ' + e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/parser2/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('Settings updated successfully!');
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        setFeedback(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      setFeedback(err.message || 'Error communicating with server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                NCERTify AI Parser 2.0 Engine Settings
              </h3>
              <p className="text-xs text-slate-500">
                Configure OCR providers, Gemini models, batching & figure quality
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

        {feedback && (
          <div className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 border-b ${
            feedback.includes('success') 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {feedback.includes('success') ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Mistral OCR Configuration */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Mistral OCR API (Primary Engine)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.mistralOcrEnabled}
                  onChange={(e) => setSettings({ ...settings, mistralOcrEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-normal">
              Uses server secret <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono font-bold">MISTRAL_API_KEY</code> with model <code className="text-slate-800 font-mono font-bold">mistral-ocr-latest</code> to extract full text, tables, and embedded figure coordinates.
            </p>
          </div>

          {/* Gemini Multimodal Verification Configuration */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Gemini Multimodal Verification
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.geminiVerificationEnabled}
                  onChange={(e) => setSettings({ ...settings, geminiVerificationEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-normal">
              Inspects rendered PDF page images against OCR output to cross-check mathematical symbols, powers, fractions, and organic chemistry structures.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Gemini Verification Model
              </label>
              <select
                value={settings.geminiModel}
                onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Recommended: Fast, accurate STEM & vision reasoning)</option>
                <option value="gemini-4-argon">gemini-4-argon (Pro: Maximum precision for difficult chemical mechanisms)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Cost-effective fast verification)</option>
              </select>
            </div>
          </div>

          {/* Batching & Figure Quality Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Default Extraction Provider
              </label>
              <select
                value={settings.defaultProvider || 'gemini'}
                onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value as any })}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="gemini">Gemini Vision Direct (Recommended)</option>
                <option value="hybrid">Hybrid (Mistral OCR + Gemini)</option>
                <option value="mistral">Mistral OCR Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Figure Rendering DPI
              </label>
              <select
                value={settings.figureDpi}
                onChange={(e) => setSettings({ ...settings, figureDpi: parseInt(e.target.value, 10) || 180 })}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value={150}>150 DPI (Fast)</option>
                <option value={180}>180 DPI (Standard)</option>
                <option value={200}>200 DPI (High Clarity)</option>
                <option value={300}>300 DPI (Ultra Sharp)</option>
              </select>
            </div>
          </div>

          {/* API Rate-Limit & Request Queue Management */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              API Rate-Limit Queue &amp; Recovery Policy
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Max API Retries (429/5xx)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxApiRetries ?? settings.retryCount ?? 5}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 5));
                    setSettings({ ...settings, maxApiRetries: v, retryCount: v });
                  }}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Gemini Concurrency
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={settings.geminiMaxConcurrency ?? 1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiMaxConcurrency: Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 1))
                    })
                  }
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Gemini Cooldown (ms)
                </label>
                <input
                  type="number"
                  min={250}
                  max={15000}
                  step={250}
                  value={settings.geminiCooldownMs ?? 1500}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      geminiCooldownMs: Math.max(250, Math.min(15000, parseInt(e.target.value, 10) || 1500))
                    })
                  }
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowProviderFallback !== false}
                  onChange={(e) => setSettings({ ...settings, allowProviderFallback: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Allow explicit logged fallback model/provider on rate limits or unavailability</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoScanAnswerKey !== false}
                  onChange={(e) => setSettings({ ...settings, autoScanAnswerKey: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Scan entire PDF automatically for inline or end-of-PDF Answer Keys</span>
              </label>
            </div>
          </div>

          {/* Live API Connectivity Test */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestConnections}
              disabled={isTesting}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-blue-600" />
              {isTesting ? 'Testing Connectivity...' : 'Test Mistral & Gemini API Connectivity'}
            </button>

            {testResult && (
              <div className="mt-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5 font-medium">
                <div className="flex items-center justify-between">
                  <span>Mistral OCR API:</span>
                  <span className={`font-bold ${testResult.mistral?.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {testResult.mistral?.success ? `✅ Online (${testResult.mistral.model})` : `❌ ${testResult.mistral?.error}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gemini API:</span>
                  <span className={`font-bold ${testResult.gemini?.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {testResult.gemini?.success ? `✅ Online (${testResult.gemini.model})` : `❌ ${testResult.gemini?.error}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Engine Settings'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
