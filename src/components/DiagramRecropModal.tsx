import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Crop, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  AlertCircle, 
  Maximize2 
} from 'lucide-react';
import { MockQuestion } from '../types';
import { idbGetPageImage, idbFindPageImageForQuestion } from '../lib/idbStorage';
import { renderPdfPageToCanvas, cropRegionFromCanvas } from '../lib/pdfFigureExtractor';
import { detectDiagramInkBoundingBoxOnCanvas } from '../lib/geminiPdfParser';

interface DiagramRecropModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: MockQuestion | null;
  jobId?: string;
  pdfDocProxy?: any;
  onSaveCroppedDiagram: (updatedQuestion: MockQuestion, newDiagramDataUrl: string) => void;
}

export const DiagramRecropModal: React.FC<DiagramRecropModalProps> = ({
  isOpen,
  onClose,
  question,
  jobId,
  pdfDocProxy,
  onSaveCroppedDiagram
}) => {
  if (!isOpen || !question) return null;

  const initialPage = question.pdfPageNumber || question.figureCropInfo?.pageNumber || 1;
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(() => pdfDocProxy?.numPages || 10);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [pageDataUrl, setPageDataUrl] = useState<string | null>(null);

  // Crop rectangle state (in normalized percentages: 0 to 100)
  const initialBox = question.figureCropInfo?.box;
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>(() => {
    if (initialBox && Array.isArray(initialBox) && initialBox.length === 4) {
      const [ymin, xmin, ymax, xmax] = initialBox;
      return {
        x: Math.max(0, xmin / 10),
        y: Math.max(0, ymin / 10),
        width: Math.min(100, (xmax - xmin) / 10),
        height: Math.min(100, (ymax - ymin) / 10)
      };
    }
    return { x: 15, y: 30, width: 70, height: 35 };
  });

  const [previewCropUrl, setPreviewCropUrl] = useState<string | null>(question.figureUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'create' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'>('create');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxAtDragStart, setBoxAtDragStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load the target PDF page whenever currentPage changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingPage(true);

    const loadPage = async () => {
      // 1. Try to render directly from PDF document proxy if active in memory
      if (pdfDocProxy && currentPage <= (pdfDocProxy.numPages || 100)) {
        try {
          const offCanvas = document.createElement('canvas');
          await renderPdfPageToCanvas(pdfDocProxy, currentPage, offCanvas, 2.0);
          if (!isCancelled) {
            offscreenCanvasRef.current = offCanvas;
            const dataUrl = offCanvas.toDataURL('image/jpeg', 0.9);
            setPageDataUrl(dataUrl);
            setTotalPages(pdfDocProxy.numPages);
            setIsLoadingPage(false);
            return;
          }
        } catch (err) {
          console.warn('Direct PDF render note:', err);
        }
      }

      // 2. Try IndexedDB page cache for this job
      if (jobId) {
        try {
          const cached = await idbGetPageImage(jobId, currentPage);
          if (cached && !isCancelled) {
            setPageDataUrl(cached);
            setIsLoadingPage(false);
            return;
          }
        } catch {}
      }

      // 3. Try to find any cached page for this question's pageNumber in IndexedDB
      try {
        const found = await idbFindPageImageForQuestion(currentPage);
        if (found && !isCancelled) {
          setPageDataUrl(found);
          setIsLoadingPage(false);
          return;
        }
      } catch {}

      if (!isCancelled) {
        setIsLoadingPage(false);
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, jobId, pdfDocProxy]);

  // Update live crop preview whenever cropBox or pageDataUrl changes
  useEffect(() => {
    if (!pageDataUrl) return;

    const img = new Image();
    img.src = pageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const pxX = Math.round((cropBox.x / 100) * img.naturalWidth);
      const pxY = Math.round((cropBox.y / 100) * img.naturalHeight);
      const pxW = Math.max(10, Math.round((cropBox.width / 100) * img.naturalWidth));
      const pxH = Math.max(10, Math.round((cropBox.height / 100) * img.naturalHeight));

      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pxW, pxH);
        ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);
        setPreviewCropUrl(canvas.toDataURL('image/png', 0.95));
      }
    };
  }, [cropBox, pageDataUrl]);

  // Handle Mouse / Touch down on the image or crop box
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, action: typeof dragAction) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDragging(true);
    setDragAction(action);
    setDragStart({ x: clickX, y: clickY });
    setBoxAtDragStart({ ...cropBox });

    if (action === 'create') {
      setCropBox({
        x: Math.max(0, Math.min(95, clickX)),
        y: Math.max(0, Math.min(95, clickY)),
        width: 1,
        height: 1
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;

    if (dragAction === 'move') {
      const newX = Math.max(0, Math.min(100 - boxAtDragStart.width, boxAtDragStart.x + dx));
      const newY = Math.max(0, Math.min(100 - boxAtDragStart.height, boxAtDragStart.y + dy));
      setCropBox(prev => ({ ...prev, x: newX, y: newY }));
    } else if (dragAction === 'create') {
      const newX = Math.min(dragStart.x, currentX);
      const newY = Math.min(dragStart.y, currentY);
      const newW = Math.abs(currentX - dragStart.x);
      const newH = Math.abs(currentY - dragStart.y);
      setCropBox({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: Math.min(100 - newX, Math.max(5, newW)),
        height: Math.min(100 - newY, Math.max(5, newH))
      });
    } else if (dragAction === 'se') {
      setCropBox(prev => ({
        ...prev,
        width: Math.max(5, Math.min(100 - prev.x, boxAtDragStart.width + dx)),
        height: Math.max(5, Math.min(100 - prev.y, boxAtDragStart.height + dy))
      }));
    } else if (dragAction === 'nw') {
      const newX = Math.max(0, Math.min(boxAtDragStart.x + boxAtDragStart.width - 5, boxAtDragStart.x + dx));
      const newY = Math.max(0, Math.min(boxAtDragStart.y + boxAtDragStart.height - 5, boxAtDragStart.y + dy));
      const newW = boxAtDragStart.width - (newX - boxAtDragStart.x);
      const newH = boxAtDragStart.height - (newY - boxAtDragStart.y);
      setCropBox({ x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Smart Auto-Ink Trimmer
  const handleAutoTrimWhitespace = () => {
    if (!pageDataUrl) return;
    const img = new Image();
    img.src = pageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const ymin = Math.round(cropBox.y * 10);
      const ymax = Math.round((cropBox.y + cropBox.height) * 10);
      const xmin = Math.round(cropBox.x * 10);
      const xmax = Math.round((cropBox.x + cropBox.width) * 10);

      const detected = detectDiagramInkBoundingBoxOnCanvas(canvas, ymin, ymax, xmin, xmax);
      if (detected) {
        setCropBox({
          x: detected[1] / 10,
          y: detected[0] / 10,
          width: (detected[3] - detected[1]) / 10,
          height: (detected[2] - detected[0]) / 10
        });
      }
    };
  };

  const handleSaveCrop = () => {
    if (!previewCropUrl) return;

    const normalizedBox: [number, number, number, number] = [
      Math.round(cropBox.y * 10),
      Math.round(cropBox.x * 10),
      Math.round((cropBox.y + cropBox.height) * 10),
      Math.round((cropBox.x + cropBox.width) * 10)
    ];

    const updatedQuestion: MockQuestion = {
      ...question,
      figureUrl: previewCropUrl,
      questionImageUrl: previewCropUrl,
      figures: [previewCropUrl],
      pdfPageNumber: currentPage,
      figureCropInfo: {
        pageNumber: currentPage,
        box: normalizedBox
      }
    };

    onSaveCroppedDiagram(updatedQuestion, previewCropUrl);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Crop className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Diagram Recropper & Editor</span>
                <span className="text-xs bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                  Q{question.questionNumber}
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium line-clamp-1 max-w-md">
                Viewing original PDF Page {currentPage} • Drag or resize the crop box to frame diagram perfectly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Page Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
            <span className="font-bold text-slate-600 mr-1">PDF Page:</span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="font-black px-1.5 text-blue-700 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Zoom & Auto Trim Tools */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.2))}
                className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold px-1 text-slate-700">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
                className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoTrimWhitespace}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Smart Trim Ink</span>
            </button>
          </div>

          {/* Hint */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-500 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Click &amp; drag anywhere on the page to draw a new crop box.</span>
          </div>
        </div>

        {/* Main Work Area: Left = PDF Page with interactive Crop Box, Right = Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-slate-900/5">
          {/* Left Canvas Viewport (8 cols on lg) */}
          <div className="lg:col-span-8 overflow-auto p-4 flex items-center justify-center bg-slate-200/50 min-h-[350px] relative">
            {isLoadingPage ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-white/90 rounded-2xl shadow-sm">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-black text-slate-700">Loading high-resolution PDF Page {currentPage}...</span>
              </div>
            ) : pageDataUrl ? (
              <div 
                ref={containerRef}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                className="relative bg-white shadow-2xl rounded-lg border border-slate-300 transition-transform duration-150 cursor-crosshair max-w-full"
                onMouseDown={(e) => handleMouseDown(e, 'create')}
              >
                {/* PDF Page Image */}
                <img
                  ref={imageRef}
                  src={pageDataUrl}
                  alt={`PDF Page ${currentPage}`}
                  className="max-w-full max-h-[75vh] object-contain select-none pointer-events-none block"
                  draggable={false}
                />

                {/* Interactive Highlighted Crop Box */}
                <div
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`
                  }}
                  className="absolute border-2 border-yellow-400 bg-yellow-400/20 shadow-md cursor-move group select-none"
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                  {/* Crop label badge */}
                  <div className="absolute -top-6 left-0 bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded shadow-xs uppercase tracking-tight flex items-center gap-1">
                    <Crop className="w-2.5 h-2.5" />
                    <span>Diagram Crop (Q{question.questionNumber})</span>
                  </div>

                  {/* Corner handles */}
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-yellow-400 border border-slate-900 rounded-full cursor-nwse-resize shadow-xs hover:scale-125 transition-transform" 
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-yellow-400 border border-slate-900 rounded-full cursor-nesw-resize shadow-xs hover:scale-125 transition-transform" 
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-yellow-400 border border-slate-900 rounded-full cursor-nwse-resize shadow-xs hover:scale-125 transition-transform" 
                  />
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-yellow-400 border border-slate-900 rounded-full cursor-nesw-resize shadow-xs hover:scale-125 transition-transform" 
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 bg-white rounded-2xl text-center max-w-sm">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">PDF Page {currentPage} Not in Cache</h4>
                <p className="text-xs text-slate-600">
                  Please select a page that was rendered or upload the question paper PDF to view original vector canvas.
                </p>
              </div>
            )}
          </div>

          {/* Right Live Crop Preview & Question Info (4 cols on lg) */}
          <div className="lg:col-span-4 p-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block mb-1">
                  Live Cropped Diagram Preview
                </span>
                <div className="w-full aspect-video sm:aspect-square max-h-[220px] rounded-2xl border-2 border-dashed border-blue-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                  {previewCropUrl ? (
                    <img
                      src={previewCropUrl}
                      alt="Cropped Preview"
                      className="max-w-full max-h-full object-contain drop-shadow-xs"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 text-xs">
                      <Crop className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span>Adjust the yellow crop box on the left to generate preview</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                    {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%
                  </div>
                </div>
              </div>

              {/* Question Context Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    Question {question.questionNumber} ({question.subject || 'Physics'})
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    Page {currentPage}
                  </span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                  {question.questionText || question.english?.questionText || 'Question statement...'}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={!previewCropUrl}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Apply Diagram to Q{question.questionNumber}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
