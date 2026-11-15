import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, ZoomIn, ZoomOut, RotateCcw, AlertCircle, Maximize2, Wand2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Parser2Figure, Parser2Question } from '../../services/parser2/types';

interface Parser2CropModalProps {
  jobId: string;
  question: Parser2Question;
  totalPages?: number;
  targetOption?: 'A' | 'B' | 'C' | 'D';
  pageImageUrl?: string;
  onClose: () => void;
  onSuccess: (updatedFigureUrl: string, updatedQuestion?: Parser2Question) => void;
}

type DragHandleType = 'box' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

export const Parser2CropModal: React.FC<Parser2CropModalProps> = ({
  jobId,
  question,
  totalPages,
  targetOption,
  pageImageUrl,
  onClose,
  onSuccess
}) => {
  const [cropBox, setCropBox] = useState<{ ymin: number; xmin: number; ymax: number; xmax: number }>({
    ymin: 200,
    xmin: 100,
    ymax: 600,
    xmax: 900
  });
  const [activePage, setActivePage] = useState<number>(question.sourcePageNumber || 1);
  const [figureType, setFigureType] = useState<Parser2Figure['figureType']>(
    targetOption || question.subject === 'Chemistry' ? 'chemical_structure' : 'diagram'
  );
  const [cropMode, setCropMode] = useState<'replace' | 'add'>('replace');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imageLoadedTick, setImageLoadedTick] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoLocating, setIsAutoLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setActivePage(question.sourcePageNumber || 1);
    if (!targetOption && question.figures && question.figures.length > 0 && question.figures[0].boundingBox) {
      const [ymin, xmin, ymax, xmax] = question.figures[0].boundingBox;
      setCropBox({ ymin, xmin, ymax, xmax });
    } else if (targetOption) {
      setCropBox({ ymin: 350, xmin: 60, ymax: 520, xmax: 460 });
    }
  }, [question, targetOption]);

  // Render live cropped pixel preview whenever cropBox or active image changes
  useEffect(() => {
    const img = imageRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) return;

    const sx = Math.max(0, Math.floor((cropBox.xmin / 1000) * img.naturalWidth));
    const sy = Math.max(0, Math.floor((cropBox.ymin / 1000) * img.naturalHeight));
    const sw = Math.max(10, Math.min(img.naturalWidth - sx, Math.ceil(((cropBox.xmax - cropBox.xmin) / 1000) * img.naturalWidth)));
    const sh = Math.max(10, Math.min(img.naturalHeight - sy, Math.ceil(((cropBox.ymax - cropBox.ymin) / 1000) * img.naturalHeight)));

    const maxPreviewW = 240;
    const maxPreviewH = 120;
    const scale = Math.min(maxPreviewW / sw, maxPreviewH / sh, 1);
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
  }, [cropBox, activePage, imageLoadedTick]);

  const fallbackPageUrl =
    activePage === (question.sourcePageNumber || 1) && pageImageUrl
      ? pageImageUrl
      : `/api/parser2/jobs/${jobId}/pages/${activePage}/image`;

  const handlePointerDown = (e: React.PointerEvent, handle: DragHandleType) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart || !dragHandle || !imageRef.current) return;
    e.preventDefault();

    const imgRect = imageRef.current.getBoundingClientRect();
    if (imgRect.width <= 0 || imgRect.height <= 0) return;

    const deltaX = ((e.clientX - dragStart.x) / imgRect.width) * 1000;
    const deltaY = ((e.clientY - dragStart.y) / imgRect.height) * 1000;

    setCropBox(prev => {
      let { ymin, xmin, ymax, xmax } = prev;

      if (dragHandle === 'box') {
        const width = xmax - xmin;
        const height = ymax - ymin;
        xmin = Math.max(0, Math.min(1000 - width, xmin + deltaX));
        ymin = Math.max(0, Math.min(1000 - height, ymin + deltaY));
        xmax = xmin + width;
        ymax = ymin + height;
      } else if (dragHandle === 'tl') {
        xmin = Math.max(0, Math.min(xmax - 20, xmin + deltaX));
        ymin = Math.max(0, Math.min(ymax - 20, ymin + deltaY));
      } else if (dragHandle === 'tr') {
        xmax = Math.min(1000, Math.max(xmin + 20, xmax + deltaX));
        ymin = Math.max(0, Math.min(ymax - 20, ymin + deltaY));
      } else if (dragHandle === 'bl') {
        xmin = Math.max(0, Math.min(xmax - 20, xmin + deltaX));
        ymax = Math.min(1000, Math.max(ymin + 20, ymax + deltaY));
      } else if (dragHandle === 'br') {
        xmax = Math.min(1000, Math.max(xmin + 20, xmax + deltaX));
        ymax = Math.min(1000, Math.max(ymin + 20, ymax + deltaY));
      } else if (dragHandle === 't') {
        ymin = Math.max(0, Math.min(ymax - 20, ymin + deltaY));
      } else if (dragHandle === 'b') {
        ymax = Math.min(1000, Math.max(ymin + 20, ymax + deltaY));
      } else if (dragHandle === 'l') {
        xmin = Math.max(0, Math.min(xmax - 20, xmin + deltaX));
      } else if (dragHandle === 'r') {
        xmax = Math.min(1000, Math.max(xmin + 20, xmax + deltaX));
      }

      return { ymin, xmin, ymax, xmax };
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget?.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDragging(false);
    setDragHandle(null);
    setDragStart(null);
  };

  const handleSaveCrop = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}/recrop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: activePage,
          boundingBox: [
            Math.round(cropBox.ymin),
            Math.round(cropBox.xmin),
            Math.round(cropBox.ymax),
            Math.round(cropBox.xmax)
          ],
          targetOption,
          cropMode: targetOption ? 'replace' : cropMode,
          figureType
        })
      });

      const data = await res.json();
      if (data.success && data.figure) {
        onSuccess(data.figure.figureUrl, data.question);
      } else {
        setError(data.error || 'Failed to crop figure.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while cropping.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiAutoLocate = async () => {
    setIsAutoLocating(true);
    setError(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${question.id}/auto-recrop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetOption })
      });
      const data = await res.json();
      if (data.success && data.question) {
        const updatedQ: Parser2Question = data.question;
        const resultUrl = targetOption
          ? (updatedQ.optionFigures?.[targetOption] || updatedQ.options.find(o => o.label === targetOption)?.imageUrl || '')
          : (updatedQ.figureUrl || '');
        if (!resultUrl) {
          setError('AI inspected the page but could not isolate a clean figure crop. Drag the blue box manually to crop.');
          return;
        }
        onSuccess(resultUrl, updatedQ);
      } else {
        setError(data.error || 'AI auto-locate could not find a figure.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during AI auto-locate.');
    } finally {
      setIsAutoLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full flex flex-col max-h-[95vh] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs">
              Q{question.questionNumber}{targetOption ? `·${targetOption}` : ''}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                {targetOption ? `Crop Option (${targetOption}) Figure` : 'Precision PDF Figure Crop Editor'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Original PDF Page {activePage} • Exact natural-resolution crop (verified on canvas preview before saving)
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

        {/* Error notification */}
        {error && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar: Zoom, Page Switcher, Type & Mode */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px]">Zoom:</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
              className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 text-slate-700 font-bold transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 text-slate-700 font-bold transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 text-slate-700 text-[10px] font-bold transition cursor-pointer"
            >
              Fit
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => setActivePage(p => Math.max(1, p - 1))}
              disabled={activePage <= 1}
              className="p-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded border border-slate-300 text-slate-700 cursor-pointer"
              title="Previous PDF page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700 px-1">
              Pg {activePage}{totalPages ? `/${totalPages}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setActivePage(p => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
              disabled={Boolean(totalPages && activePage >= totalPages)}
              className="p-1 bg-white hover:bg-slate-200 disabled:opacity-40 rounded border border-slate-300 text-slate-700 cursor-pointer"
              title="Next PDF page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!targetOption && (
              <>
                <select
                  value={figureType}
                  onChange={e => setFigureType(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 outline-none"
                >
                  <option value="diagram">Diagram / Circuit</option>
                  <option value="graph">Graph / Plot</option>
                  <option value="table">Table Image</option>
                  <option value="chemical_structure">Chemical Structure</option>
                </select>

                {question.figureUrl && (
                  <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCropMode('replace')}
                      className={`px-2 py-1 text-[10.5px] font-bold cursor-pointer ${
                        cropMode === 'replace' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Replace Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropMode('add')}
                      className={`px-2 py-1 text-[10.5px] font-bold cursor-pointer flex items-center gap-0.5 ${
                        cropMode === 'add' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3 h-3" /> Add Extra
                    </button>
                  </div>
                )}
              </>
            )}

            <span className="text-[10.5px] text-slate-600 font-mono font-medium">
              [{Math.round(cropBox.xmin)},{Math.round(cropBox.ymin)}]-[{Math.round(cropBox.xmax)},{Math.round(cropBox.ymax)}]
            </span>
          </div>
        </div>

        {/* Interactive Cropper Canvas + Live Preview Rail */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <div
            ref={containerRef}
            className="flex-1 overflow-auto p-3 sm:p-5 bg-slate-950 select-none"
            style={{ touchAction: 'none' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              className="relative mx-auto border-2 border-slate-700 bg-white shadow-2xl"
              style={{
                width: `${Math.round(zoomLevel * 100)}%`,
                maxWidth: zoomLevel === 1 ? '640px' : 'none',
                touchAction: 'none'
              }}
            >
              <img
                ref={imageRef}
                src={fallbackPageUrl}
                crossOrigin="anonymous"
                onLoad={() => setImageLoadedTick(t => t + 1)}
                alt={`Page ${activePage}`}
                className="w-full h-auto block pointer-events-none select-none"
                draggable={false}
              />

              {/* Crop Overlay Area */}
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move shadow-xl ring-2 ring-white/70"
                style={{
                  top: `${cropBox.ymin / 10}%`,
                  left: `${cropBox.xmin / 10}%`,
                  width: `${(cropBox.xmax - cropBox.xmin) / 10}%`,
                  height: `${(cropBox.ymax - cropBox.ymin) / 10}%`,
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, 'box')}
              >
                {/* Corner Handles */}
                <div
                  className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'tl')}
                >
                  <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                </div>
                <div
                  className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'tr')}
                >
                  <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                </div>
                <div
                  className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'bl')}
                >
                  <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                </div>
                <div
                  className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'br')}
                >
                  <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                </div>

                {/* Edge Handles */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-5 flex items-center justify-center cursor-ns-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 't')}
                >
                  <div className="w-5 h-2 bg-blue-600 border border-white rounded-full shadow-sm" />
                </div>
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-5 flex items-center justify-center cursor-ns-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'b')}
                >
                  <div className="w-5 h-2 bg-blue-600 border border-white rounded-full shadow-sm" />
                </div>
                <div
                  className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-8 flex items-center justify-center cursor-ew-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'l')}
                >
                  <div className="w-2 h-5 bg-blue-600 border border-white rounded-full shadow-sm" />
                </div>
                <div
                  className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-8 flex items-center justify-center cursor-ew-resize z-20"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, 'r')}
                >
                  <div className="w-2 h-5 bg-blue-600 border border-white rounded-full shadow-sm" />
                </div>

                <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs pointer-events-none">
                  {targetOption ? `Option ${targetOption}` : figureType.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Live Crop Preview Sidebar */}
          <div className="lg:w-64 shrink-0 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-3 flex flex-col gap-2.5">
            <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
              Live Crop Preview
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center min-h-[120px] shadow-2xs">
              <canvas ref={previewCanvasRef} className="max-w-full max-h-[120px] object-contain" />
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug">
              Verify labels, axes, and edges in the preview before saving. Source PNG is saved unmodified.
            </p>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCropBox({ ymin: 200, xmin: 100, ymax: 600, xmax: 900 })}
              className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset Box
            </button>
            <button
              type="button"
              onClick={() => setCropBox({ ymin: 100, xmin: 50, ymax: 900, xmax: 950 })}
              className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> Full Page
            </button>
            <button
              type="button"
              onClick={handleAiAutoLocate}
              disabled={isAutoLocating || isSubmitting}
              className="px-3 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Wand2 className={`w-3.5 h-3.5 text-indigo-600 ${isAutoLocating ? 'animate-spin' : ''}`} />
              {isAutoLocating ? 'AI Locating...' : 'AI Auto-Locate'}
            </button>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isAutoLocating}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={isSubmitting || isAutoLocating}
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              <Crop className="w-4 h-4" />
              {isSubmitting
                ? 'Cropping...'
                : targetOption
                ? `Save Option ${targetOption} Figure`
                : cropMode === 'add'
                ? 'Add Additional Figure'
                : 'Save & Attach Figure'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
