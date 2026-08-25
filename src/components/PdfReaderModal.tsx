import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, BookOpen, ChevronLeft, ChevronRight, FileText, ExternalLink, Lock, CheckCircle2, Maximize2 } from 'lucide-react';
import { resolveImageUrl } from '../lib/storage';
import { downloadNotesPdf } from '../lib/pdfDownloader';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'document' | 'reader'>(
    resolvedPdfUrl ? 'document' : 'reader'
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Convert base64 data URL to an active Blob Object URL for fast and secure browser iframe rendering
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

  const totalPages = 18;

  const samplePages = [
    {
      page: 1,
      title: "Cell Cycle & Cell Division (High-Yield Summary)",
      content: [
        "1. Interphase (95% of cell cycle duration): G1 -> S (DNA replication) -> G2 phase.",
        "2. M Phase (Mitosis): Prophase -> Metaphase -> Anaphase -> Telophase.",
        "3. Metaphase: Chromosomes align at equatorial plate. Best stage to study morphology!",
        "4. Anaphase: Centromeres split, sister chromatids migrate to opposite poles.",
        "5. Recombination nodule appears in Pachytene stage of Meiosis I (Catalyzed by Recombinase)."
      ]
    },
    {
      page: 2,
      title: "Physics Mechanics & Vectors Rapid Cheatsheet",
      content: [
        "1. Dot Product: A • B = |A||B| cos θ (Work done W = F • s).",
        "2. Cross Product: |A × B| = |A||B| sin θ (Torque τ = r × F).",
        "3. Projectile Motion: Time of Flight T = (2u sin θ) / g.",
        "4. Maximum Height H = (u² sin² θ) / (2g).",
        "5. Horizontal Range R = (u² sin 2θ) / g (Maximum at θ = 45°)."
      ]
    },
    {
      page: 3,
      title: "Organic Chemistry Conversions & Key Reagents",
      content: [
        "1. PCC (Pyridinium chlorochromate): Oxidizes 1° alcohol to Aldehyde only (No over-oxidation to acid).",
        "2. Lucas Reagent (conc. HCl + anh. ZnCl2): 3° alcohol gives immediate turbidity; 2° in 5 min; 1° does not at room temp.",
        "3. Reimer-Tiemann Reaction: Phenol + CHCl3 + aq. NaOH -> Salicylaldehyde.",
        "4. Kolbe's Reaction: Phenol + NaOH + CO2 (400K, 4-7 atm) -> Salicylic acid (Aspirin precursor)."
      ]
    }
  ];

  const pageData = samplePages[(currentPage - 1) % samplePages.length];

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

  const handleOpenNewTab = () => {
    if (blobPdfUrl) {
      window.open(blobPdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="pdf-reader-modal"
        className="bg-slate-900 text-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[92vh] border border-slate-700"
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
            {blobPdfUrl && (
              <button
                onClick={handleOpenNewTab}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-700"
                title="Open in new window"
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

        {/* Controls Toolbar */}
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {blobPdfUrl && (
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setViewMode('document')}
                  className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                    viewMode === 'document' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Real PDF Document
                </button>
                <button
                  onClick={() => setViewMode('reader')}
                  className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                    viewMode === 'reader' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary Points
                </button>
              </div>
            )}
            {viewMode === 'reader' && (
              <span className="text-slate-400 text-[11px]">
                {isPurchased ? `Page ${currentPage} of ${totalPages}` : `Sample Page ${currentPage} of 3`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'reader' && (
              <>
                <button
                  onClick={() => setZoom(prev => Math.max(80, prev - 10))}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono">{zoom}%</span>
                <button
                  onClick={() => setZoom(prev => Math.min(140, prev + 10))}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-hidden bg-slate-950 flex items-center justify-center p-0">
          {viewMode === 'document' && blobPdfUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
              <iframe
                src={`${blobPdfUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-none"
                title={title}
              />
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto p-4 flex items-center justify-center">
              <div 
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center top' }}
                className="w-full max-w-md bg-white text-slate-900 rounded-xl p-5 shadow-2xl space-y-3 transition-transform duration-200 border border-slate-200 my-auto"
              >
                {/* Watermark */}
                <div className="flex items-center justify-between border-b pb-2 text-[9px] font-black text-amber-700 uppercase tracking-wider">
                  <span>NEET MBBS DOCTORS</span>
                  <span>{isPurchased ? 'PURCHASED FULL EDITION' : 'SAMPLE PREVIEW'}</span>
                </div>

                <h4 className="text-xs font-black text-slate-950 border-b border-slate-100 pb-1">
                  {pageData.title}
                </h4>

                <div className="space-y-2 text-[11px] text-slate-800 leading-relaxed font-sans">
                  {pageData.content.map((point, idx) => (
                    <p key={idx} className="bg-amber-50/50 p-2 rounded-lg border-l-2 border-amber-500">
                      {point}
                    </p>
                  ))}
                </div>

                <div className="pt-4 text-center border-t text-[9px] text-slate-400 font-mono">
                  {isPurchased ? `Verified full study material • All rights reserved` : `Sample page preview • Buy full PDF to download`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          {viewMode === 'reader' ? (
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
          ) : <div />}

          {/* Download Button */}
          {isPurchased ? (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-amber-300 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Downloading...' : 'Download Real PDF'}</span>
            </button>
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

          {viewMode === 'reader' ? (
            <button
              disabled={currentPage === (isPurchased ? totalPages : 3)}
              onClick={() => setCurrentPage(prev => Math.min((isPurchased ? totalPages : 3), prev + 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
};
