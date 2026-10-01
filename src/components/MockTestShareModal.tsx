import React, { useState } from 'react';
import { Share2, Copy, Check, X, MessageCircle, Send, Sparkles, ExternalLink } from 'lucide-react';
import { MockTest } from '../types';

interface MockTestShareModalProps {
  test: MockTest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MockTestShareModal: React.FC<MockTestShareModalProps> = ({
  test,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !test) return null;

  // Construct unique URL for the mock test
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neetmbbsdoctorsstore.com';
  const shareUrl = `${baseUrl}/mock-tests?testId=${encodeURIComponent(test.id)}`;

  const shareTitle = `${test.title} - NEET MBBS Doctors Store`;
  const shareText = `🎯 Take this NEET Mock Test: "${test.title}"\n⏱️ Duration: ${test.durationMinutes} mins | 📝 ${test.totalQuestions} Questions | Marks: ${test.maxMarks}\nPractice with official NTA timer, negative marking (+4/-1), and All India rank predictor!`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(`${shareText}\n\n👉 Test Link: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
  };

  const handleTelegramShare = () => {
    const tgText = encodeURIComponent(shareText);
    const tgUrl = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${tgUrl}&text=${tgText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div 
        className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <Share2 className="w-6 h-6" />
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Share Mock Test Link</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
            Share with NEET Aspirants
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Send this test link to friends, study groups, or your classmates.
          </p>
        </div>

        {/* Test Summary Pill */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
          <div className="font-black text-slate-900 font-['Outfit',sans-serif] line-clamp-2">
            {test.title}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 flex-wrap">
            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
              {test.testNumber || 'NEET'}
            </span>
            <span>{test.totalQuestions} Questions</span>
            <span>•</span>
            <span>{test.durationMinutes} Mins</span>
            <span>•</span>
            <span className={test.price === 0 ? 'text-emerald-700 font-black' : 'text-slate-900 font-black'}>
              {test.price === 0 ? 'Free' : `₹${test.price}`}
            </span>
          </div>
        </div>

        {/* Copy Link Input Bar */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-slate-500 block">Direct Test URL:</label>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-800 outline-none select-all truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-200 shadow-2xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Send className="w-4 h-4 fill-white" />
            <span>Telegram</span>
          </button>
        </div>

        {/* Native Mobile Share Button if supported */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer font-['Outfit',sans-serif]"
          >
            <Share2 className="w-4 h-4" />
            <span>More Sharing Options</span>
          </button>
        )}
      </div>
    </div>
  );
};
