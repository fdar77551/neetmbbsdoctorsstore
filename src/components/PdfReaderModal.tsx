import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Lock, CheckCircle2, Maximize2, ExternalLink, Printer } from 'lucide-react';
import { resolveImageUrl } from '../lib/storage';
import { downloadNotesPdf, printNotesPdf } from '../lib/pdfDownloader';

interface PdfReaderModalProps {
  pdfUrl: string;
  title: string;
  isPurchased?: boolean;
  onClose: () => void;
  onBuyClick?: () => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({ 
  pdfUrl, 
  title, 
  isPurchased = false, 
  onClose,
  onBuyClick 
}) => {
  const resolvedPdfUrl = resolveImageUrl(pdfUrl);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Convert base64 data URL or R2 URL to an active Blob Object URL for fast and secure browser iframe rendering
  useEffect(() => {
    if (!resolvedPdfUrl) {
      setBlobPdfUrl('');
      return;
    }

    if (resolvedPdfUrl.startsWith('data:application/pdf') || (resolvedPdfUrl.startsWith('data:') && resolvedPdfUrl.includes('base64'))) {
      try {
        const parts = resolvedPdfUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const objUrl = URL.createObjectURL(blob);
        setBlobPdfUrl(objUrl);

        return () => {
          URL.revokeObjectURL(objUrl);
        };
      } catch (e) {
        console.warn('Could not convert base64 to blob URL:', e);
        setBlobPdfUrl(resolvedPdfUrl);
      }
    } else {
      setBlobPdfUrl(resolvedPdfUrl);
    }
  }, [resolvedPdfUrl]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadNotesPdf({
        id: title,
        title,
        pdfUrl: resolvedPdfUrl || pdfUrl
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printNotesPdf({
        id: title,
        title,
        pdfUrl: resolvedPdfUrl || pdfUrl
      });
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const handleOpenNewTab = () => {
    if (blobPdfUrl) {
      window.open(blobPdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="pdf-reader-modal"
        className="bg-slate-900 text-white w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[92vh] border border-slate-700"
      >
        {/* Top Header */}
        <div className="p-3 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold truncate">{title}</h3>
            {isPurchased ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Purchased Edition</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full shrink-0">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Sample Preview</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-700"
              title="Print or Save to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save</span>
            </button>
            {blobPdfUrl && (
              <button
                onClick={handleOpenNewTab}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-700"
                title="Open in new window / Full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Screen</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition cursor-pointer hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-hidden bg-slate-950 flex items-center justify-center p-0">
          {blobPdfUrl ? (
            <iframe
              src={`${blobPdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-none bg-slate-900"
              title={title}
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
              <p className="text-sm text-slate-400">Loading authentic PDF document...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>High-Yield NEET Study Material • Digital Edition</span>
          </div>

          {/* Download & Buy Actions */}
          <div className="flex items-center gap-2">
            {isPurchased ? (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition cursor-pointer active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-amber-300 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300 font-medium hidden sm:inline flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Sample Preview Only</span>
                </span>
                {onBuyClick && (
                  <button
                    onClick={onBuyClick}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Buy Note to Download
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
