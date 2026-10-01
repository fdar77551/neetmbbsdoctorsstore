import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Crop, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Check, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Move
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { MockQuestion } from '../types';
import { renderPdfPageToCanvas, cropRegionFromCanvas, cancelCanvasRender } from '../lib/pdfFigureExtractor';

interface AdminPdfCropModalProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pdfFile?: File | null;
  pdfName?: string;
  initialPageNumber: number;
  totalPages: number;
  question: MockQuestion;
  targetType?: 'question' | 'option_A' | 'option_B' | 'option_C' | 'option_D' | 'matchTable';
  onSaveCrop: (updatedQuestion: MockQuestion) => void;
  onClose: () => void;
}

export const AdminPdfCropModal: React.FC<AdminPdfCropModalProps> = ({
  pdfDoc,
  pdfFile,
  pdfName = 'Question_Paper.pdf',
  initialPageNumber,
  totalPages,
  question,
  targetType = 'question',
  onSaveCrop,
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState(Math.max(1, Math.min(initialPageNumber || 1, totalPages || 1)));
  const [zoomScale, setZoomScale] = useState(1.5);
  const [selectedTarget, setSelectedTarget] = useState<'question' | 'option_A' | 'option_B' | 'option_C' | 'option_D' | 'matchTable'>(targetType);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Render the PDF page onto canvas whenever currentPage or zoomScale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let isCancelled = false;

    const render = async () => {
      setIsLoadingPage(true);
      try {
        await renderPdfPageToCanvas(pdfDoc, currentPage, canvasRef.current!, zoomScale);
        if (!isCancelled) {
          // If question already had a figureBoundingBox on this page, initialize crop box
          if (question.figureCropInfo?.box && (question.figureCropInfo.pageNumber === currentPage || !question.figureCropInfo.pageNumber)) {
            const [ymin, xmin, ymax, xmax] = question.figureCropInfo.box;
            const cw = canvasRef.current!.width;
            const ch = canvasRef.current!.height;
            const initBox = {
              x: (xmin / 1000) * cw,
              y: (ymin / 1000) * ch,
              w: ((xmax - xmin) / 1000) * cw,
              h: ((ymax - ymin) / 1000) * ch
            };
            setCropBox(initBox);
            generatePreview(initBox);
          }
        }
      } catch (err) {
        console.warn('PDF render error in crop modal:', err);
      } finally {
        if (!isCancelled) setIsLoadingPage(false);
      }
    };

    render();

    return () => {
      isCancelled = true;
      cancelCanvasRender(canvasRef.current);
    };
  }, [pdfDoc, currentPage, zoomScale]);

  // Generate real-time crop preview from current canvas
  const generatePreview = (box: { x: number; y: number; w: number; h: number }) => {
    if (!canvasRef.current || box.w <= 5 || box.h <= 5) return;
    try {
      const cropped = cropRegionFromCanvas(canvasRef.current, {
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h
      });
      setPreviewDataUrl(cropped);
    } catch {
      // Ignore preview errors
    }
  };

  // Canvas Mouse Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panMode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDragStart({ x: startX, y: startY });
    setCropBox({ x: startX, y: startY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && panStart) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const w = Math.abs(currentX - dragStart.x);
    const h = Math.abs(currentY - dragStart.y);

    const newBox = { x, y, w, h };
    setCropBox(newBox);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      setDragStart(null);
      if (cropBox && cropBox.w > 10 && cropBox.h > 10) {
        generatePreview(cropBox);
      }
    }
  };

  // Save the cropped image to the target question/option (Requirement 17 & 18)
  const handleSaveAndApply = () => {
    if (!previewDataUrl || !canvasRef.current || !cropBox) return;

    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;

    // Normalized coordinates [ymin, xmin, ymax, xmax] 0-1000
    const normalizedBox: [number, number, number, number] = [
      Math.round((cropBox.y / ch) * 1000),
      Math.round((cropBox.x / cw) * 1000),
      Math.round(((cropBox.y + cropBox.h) / ch) * 1000),
      Math.round(((cropBox.x + cropBox.w) / cw) * 1000)
    ];

    const sourceMeta = {
      pdfName,
      pageNumber: currentPage,
      questionNumber: question.questionNumber,
      targetType: selectedTarget,
      box: normalizedBox,
      cropUrl: previewDataUrl
    };

    const updatedQ: MockQuestion = {
      ...question,
      pdfPageNumber: currentPage,
      sourceMetadata: sourceMeta,
      figureCropInfo: {
        pageNumber: currentPage,
        box: normalizedBox,
        cropUrl: previewDataUrl
      }
    };

    if (selectedTarget === 'question') {
      updatedQ.figureUrl = previewDataUrl;
      updatedQ.questionImageUrl = previewDataUrl;
      if (!updatedQ.figures || updatedQ.figures.length === 0) {
        updatedQ.figures = [previewDataUrl];
      } else {
        updatedQ.figures = [previewDataUrl, ...updatedQ.figures.slice(1)];
      }
    } else if (selectedTarget.startsWith('option_')) {
      const optLetter = selectedTarget.replace('option_', '') as 'A' | 'B' | 'C' | 'D';
      updatedQ.optionFigures = {
        ...(updatedQ.optionFigures || {}),
        [optLetter]: previewDataUrl
      };
      // Also update option image in options array
      if (Array.isArray(updatedQ.options)) {
        updatedQ.options = updatedQ.options.map(o => {
          if (o.label === optLetter) {
            return {
              ...o,
              type: o.value ? 'text_and_image' : 'image',
              imageUrl: previewDataUrl
            };
          }
          return o;
        });
      }
    }

    onSaveCrop(updatedQ);
    onClose();
  };

  // Delete existing figure
  const handleDeleteFigure = () => {
    const updatedQ: MockQuestion = { ...question };
    if (selectedTarget === 'question') {
      delete updatedQ.figureUrl;
      delete updatedQ.questionImageUrl;
      updatedQ.figures = [];
      delete updatedQ.figureCropInfo;
    } else if (selectedTarget.startsWith('option_')) {
      const optLetter = selectedTarget.replace('option_', '') as 'A' | 'B' | 'C' | 'D';
      if (updatedQ.optionFigures) {
        delete updatedQ.optionFigures[optLetter];
      }
      if (Array.isArray(updatedQ.options)) {
        updatedQ.options = updatedQ.options.map(o => {
          if (o.label === optLetter) {
            return { ...o, imageUrl: undefined, type: 'text' };
          }
          return o;
        });
      }
    }
    onSaveCrop(updatedQ);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden text-white animate-in fade-in duration-200">
        
        {/* Top Header & Navigation Bar */}
        <div className="p-3 sm:p-4 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-['Outfit',sans-serif] text-white">
                  Original PDF Page Re-Crop Studio
                </h3>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Q#{question.questionNumber}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate max-w-xs sm:max-w-md">
                Viewing original PDF canvas at high DPI. Zoom, pan, drag crop rectangle, and save.
              </p>
            </div>
          </div>

          {/* Page Selector & Zoom Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoadingPage}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold px-1 text-[11px]">
                Page {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= (totalPages || 1) || isLoadingPage}
                onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomScale(s => Math.max(0.8, s - 0.25))}
                className="p-1 hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1 font-bold">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(s => Math.min(3.0, s + 0.25))}
                className="p-1 hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pan Toggle Tool */}
            <button
              type="button"
              onClick={() => setPanMode(!panMode)}
              className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                panMode
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title={panMode ? 'Disable Pan Tool' : 'Enable Pan Tool'}
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pan</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target Attachment Selector Bar */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Attach Crop To:
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTarget('question')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTarget === 'question'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Main Question Figure
              </button>
              {(['option_A', 'option_B', 'option_C', 'option_D'] as const).map(opt => {
                const label = opt.replace('option_', '');
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedTarget(opt)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedTarget === opt
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Option ({label}) Structure
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action indicator note */}
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            Drag mouse across diagram/circuit/structure on page. Real-time preview updates on the right.
          </span>
        </div>

        {/* Main Work Area: Canvas on left, Live Preview on right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden bg-slate-950">
          
          {/* Left Canvas Viewport */}
          <div 
            ref={containerRef}
            className="lg:col-span-3 overflow-auto p-4 flex items-center justify-center relative bg-slate-950/90 select-none"
          >
            {isLoadingPage && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold z-20 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Rendering High-Resolution Page {currentPage}...</span>
              </div>
            )}

            <div 
              className="relative inline-block border-2 border-slate-700 shadow-2xl rounded-sm overflow-hidden"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`block max-w-none ${panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
              />

              {/* Visual Crop Box Overlay */}
              {cropBox && canvasRef.current && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none shadow-sm"
                  style={{
                    left: `${(cropBox.x / canvasRef.current.width) * 100}%`,
                    top: `${(cropBox.y / canvasRef.current.height) * 100}%`,
                    width: `${(cropBox.w / canvasRef.current.width) * 100}%`,
                    height: `${(cropBox.h / canvasRef.current.height) * 100}%`
                  }}
                >
                  <div className="absolute top-1 left-1 bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    Crop Region ({Math.round(cropBox.w)} × {Math.round(cropBox.h)})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Crop Preview & Inspection Sidebar */}
          <div className="p-4 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-slate-300">
                  Real-Time Crop Preview
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {previewDataUrl ? '✓ Lossless PNG' : 'Waiting for selection'}
                </span>
              </div>

              {/* Preview Display */}
              {previewDataUrl ? (
                <div className="bg-white p-3 rounded-2xl border border-slate-700 text-center space-y-2 shadow-inner">
                  <img
                    src={previewDataUrl}
                    alt="Crop Preview"
                    className="max-h-56 mx-auto object-contain rounded-lg"
                  />
                  <div className="text-[10px] font-mono text-slate-600 font-bold">
                    Target: {selectedTarget === 'question' ? 'Main Question Figure' : `Option ${selectedTarget.replace('option_', '')}`}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl space-y-2 text-xs">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-bold">No region cropped yet.</p>
                  <p className="text-[10px] text-slate-500">
                    Click &amp; drag on the PDF page to select the exact visual area.
                  </p>
                </div>
              )}

              {/* Source Tracking Metadata Display (Requirement 18) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[10.5px]">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">
                  Visual Source Tracking
                </span>
                <div className="text-slate-300 font-mono">
                  <div><strong>PDF File:</strong> {pdfName}</div>
                  <div><strong>Page #:</strong> {currentPage} of {totalPages || 1}</div>
                  <div><strong>Question:</strong> #{question.questionNumber}</div>
                  {cropBox && (
                    <div>
                      <strong>Box:</strong> [{Math.round(cropBox.y)}, {Math.round(cropBox.x)}, {Math.round(cropBox.y + cropBox.h)}, {Math.round(cropBox.x + cropBox.w)}]
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={!previewDataUrl}
                onClick={handleSaveAndApply}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Crop Without Re-Parsing</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteFigure}
                className="w-full py-2 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl border border-rose-800/80 transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Remove figure if unnecessary"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Existing Visual</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
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
