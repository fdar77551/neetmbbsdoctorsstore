import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Maximize2,
  Wand2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Scan,
  Eye,
  EyeOff,
  CheckCircle2,
  Hand,
  MousePointerClick,
  Trash2,
  Star,
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import {
  Parser2CropType,
  Parser2Figure,
  Parser2ImagePlacement,
  Parser2Question
} from '../../services/parser2/types';
import { getAdminRequestHeaders } from '../../lib/firebase';
import { PLACEMENT_OPTIONS } from './Parser2ImageManager';

interface Parser2CropModalProps {
  jobId: string;
  question: Parser2Question;
  totalPages?: number;
  targetOption?: 'A' | 'B' | 'C' | 'D';
  initialPlacement?: Parser2ImagePlacement;
  pageImageUrl?: string;
  onClose: () => void;
  onSuccess: (updatedFigureUrl: string, updatedQuestion?: Parser2Question) => void;
  onQuestionUpdated?: (updatedQuestion: Parser2Question) => void;
}

type DragHandleType = 'box' | 'draw' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
type FitMode = 'fit-width' | 'fit-page' | 'manual';
type InteractionMode = 'draw' | 'pan';

const CROP_TYPE_OPTIONS: Array<{ value: Parser2CropType; label: string }> = [
  { value: 'diagram', label: 'Diagram / Apparatus' },
  { value: 'graph', label: 'Graph / Plot' },
  { value: 'circuit', label: 'Circuit Diagram' },
  { value: 'table', label: 'Table Image' },
  { value: 'match_the_column', label: 'Match the Column' },
  { value: 'chemical_structure', label: 'Chemical Structure' },
  { value: 'math_expression', label: 'Math Expression' },
  { value: 'complete_question', label: 'Complete Question' },
  { value: 'question_continuation', label: 'Question Continuation' },
  { value: 'option_A', label: 'Option A' },
  { value: 'option_B', label: 'Option B' },
  { value: 'option_C', label: 'Option C' },
  { value: 'option_D', label: 'Option D' },
  { value: 'combined_options', label: 'Combined Options' },
  { value: 'other', label: 'Other Crop' }
];

export const Parser2CropModal: React.FC<Parser2CropModalProps> = ({
  jobId,
  question,
  totalPages: propTotalPages,
  targetOption,
  initialPlacement,
  pageImageUrl,
  onClose,
  onSuccess,
  onQuestionUpdated
}) => {
  const [localQuestion, setLocalQuestion] = useState<Parser2Question>(question);
  const totalPages = Math.max(1, propTotalPages || question.sourcePageEnd || question.sourcePageNumber || 1);

  const [cropBox, setCropBox] = useState<{ ymin: number; xmin: number; ymax: number; xmax: number }>({
    ymin: 200,
    xmin: 100,
    ymax: 600,
    xmax: 900
  });
  const [activePage, setActivePage] = useState<number>(Math.max(1, question.sourcePageNumber || 1));
  const [pageInput, setPageInput] = useState<string>(String(Math.max(1, question.sourcePageNumber || 1)));
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  const [cropType, setCropType] = useState<Parser2CropType>(() => {
    if (targetOption) return `option_${targetOption}` as Parser2CropType;
    if (question.subject === 'Chemistry') return 'chemical_structure';
    return 'diagram';
  });
  const [targetPlacement, setTargetPlacement] = useState<Parser2ImagePlacement>(() => {
    if (initialPlacement) return initialPlacement;
    if (targetOption) return `option_${targetOption}` as Parser2ImagePlacement;
    return 'after_question';
  });
  const [cropCaption, setCropCaption] = useState<string>('');
  const [tableRow, setTableRow] = useState<number>(0);
  const [tableCol, setTableCol] = useState<number>(0);
  const [cropMode, setCropMode] = useState<'replace' | 'add'>(() =>
    !targetOption && (question.figures?.length || 0) > 0 ? 'add' : 'replace'
  );
  const [editorMode, setEditorMode] = useState<'crop' | 'view'>('crop');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('draw');
  const [fitMode, setFitMode] = useState<FitMode>('fit-page');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1200, height: 1700 });
  const [previewDims, setPreviewDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageLoadedTick, setImageLoadedTick] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);
  const [draftBoxesByPage, setDraftBoxesByPage] = useState<
    Record<number, { ymin: number; xmin: number; ymax: number; xmax: number }>
  >({});

  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [drawOriginNorm, setDrawOriginNorm] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panOriginRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoLocating, setIsAutoLocating] = useState(false);
  const [busyFigureId, setBusyFigureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLocalQuestion(question);
    const startPage = Math.max(1, question.sourcePageNumber || 1);
    setActivePage(startPage);
    setPageInput(String(startPage));
    if (targetOption) {
      setCropType(`option_${targetOption}` as Parser2CropType);
      setCropBox({ ymin: 350, xmin: 60, ymax: 520, xmax: 460 });
    } else if (question.figures && question.figures.length > 0 && question.figures[0].boundingBox) {
      const [ymin, xmin, ymax, xmax] = question.figures[0].boundingBox;
      setCropBox({ ymin, xmin, ymax, xmax });
      setCropType((question.figures[0].cropType || question.figures[0].figureType || 'diagram') as Parser2CropType);
    }
  }, [question.id, targetOption]);

  useEffect(() => {
    setPageInput(String(activePage));
  }, [activePage]);

  const navigateToPage = useCallback((nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, Math.round(nextPage)));
    if (clamped !== activePage) {
      // Save current page's unsaved crop box so cross-page inspection never loses draft selections
      setDraftBoxesByPage(prev => ({ ...prev, [activePage]: cropBox }));
      setImageError(false);
      setActivePage(clamped);
      const savedDraft = draftBoxesByPage[clamped];
      if (savedDraft) {
        setCropBox(savedDraft);
      } else {
        const existingOnPage = (localQuestion.figures || []).find(f => f.pageNumber === clamped && f.boundingBox);
        if (existingOnPage?.boundingBox) {
          const [ymin, xmin, ymax, xmax] = existingOnPage.boundingBox;
          setCropBox({ ymin, xmin, ymax, xmax });
        } else {
          setCropBox({ ymin: 180, xmin: 100, ymax: 560, xmax: 900 });
        }
      }
    }
  }, [activePage, cropBox, draftBoxesByPage, localQuestion.figures, totalPages]);

  // Keyboard shortcuts: Left/Right arrows navigate pages, Escape closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToPage(activePage - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToPage(activePage + 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePage, navigateToPage, onClose]);

  // Track viewport size cleanly with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setContainerSize({
        width: Math.max(240, el.clientWidth - 24),
        height: Math.max(240, el.clientHeight - 24)
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const computedBaseScale = (() => {
    const nw = naturalSize.width || 1200;
    const nh = naturalSize.height || 1700;
    const cw = Math.max(240, containerSize.width || 640);
    const ch = Math.max(240, containerSize.height || 640);

    if (fitMode === 'fit-page') {
      return Math.min(cw / nw, ch / nh);
    }
    return Math.min(cw / nw, 1.35);
  })();

  const effectiveScale =
    fitMode === 'manual'
      ? zoomScale * Math.min((containerSize.width || 720) / (naturalSize.width || 1200), 1.35)
      : computedBaseScale;

  const renderedWidth = Math.max(220, Math.round((naturalSize.width || 1200) * effectiveScale));
  const renderedHeight = Math.max(280, Math.round((naturalSize.height || 1700) * effectiveScale));

  const applyZoomStep = (delta: number) => {
    setFitMode('manual');
    setZoomScale(prev => Math.max(0.4, Math.min(3.5, Number((prev + delta).toFixed(2)))));
  };

  const applyFitMode = (mode: FitMode) => {
    setFitMode(mode);
    setZoomScale(1);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  // Desktop Ctrl/Meta/Alt + Mouse Wheel Zoom
  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      applyZoomStep(delta);
    }
  };

  // Mobile 2-finger Pinch-to-Zoom
  const handleViewportTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        pinchStartRef.current = { dist, scale: fitMode === 'manual' ? zoomScale : 1 };
        setIsDragging(false);
        setDragHandle(null);
      }
    }
  };

  const handleViewportTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartRef.current.dist;
      const nextScale = Math.max(0.4, Math.min(3.5, Number((pinchStartRef.current.scale * ratio).toFixed(2))));
      setFitMode('manual');
      setZoomScale(nextScale);
    }
  };

  const handleViewportTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartRef.current = null;
    }
  };

  // Render live cropped pixel preview matching 1:1 server manual crop math
  const drawLivePreview = useCallback(() => {
    const img = imageRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) return;

    const sx = Math.max(0, Math.floor((cropBox.xmin / 1000) * img.naturalWidth));
    const sy = Math.max(0, Math.floor((cropBox.ymin / 1000) * img.naturalHeight));
    const sw = Math.max(10, Math.min(img.naturalWidth - sx, Math.ceil(((cropBox.xmax - cropBox.xmin) / 1000) * img.naturalWidth)));
    const sh = Math.max(10, Math.min(img.naturalHeight - sy, Math.ceil(((cropBox.ymax - cropBox.ymin) / 1000) * img.naturalHeight)));
    setPreviewDims({ width: sw, height: sh });

    const maxPreviewW = 260;
    const maxPreviewH = 148;
    const scale = Math.min(maxPreviewW / sw, maxPreviewH / sh, 1);
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }
  }, [cropBox]);

  useEffect(() => {
    drawLivePreview();
  }, [drawLivePreview, activePage, imageLoadedTick, showMobilePreview]);

  const fallbackPageUrl =
    activePage === (localQuestion.sourcePageNumber || 1) && pageImageUrl
      ? pageImageUrl
      : `/api/parser2/jobs/${jobId}/pages/${activePage}/image`;

  const getNormPoint = (clientX: number, clientY: number) => {
    const img = imageRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(1000, ((clientX - rect.left) / rect.width) * 1000)),
      y: Math.max(0, Math.min(1000, ((clientY - rect.top) / rect.height) * 1000))
    };
  };

  const handleBoxPointerDown = (e: React.PointerEvent, handle: DragHandleType) => {
    if (interactionMode !== 'draw') return;
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (pinchStartRef.current) return;
    if (interactionMode === 'pan') {
      const container = containerRef.current;
      if (!container) return;
      setIsPanning(true);
      panOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }
    if (interactionMode !== 'draw' || !imageRef.current) return;
    const pt = getNormPoint(e.clientX, e.clientY);
    if (!pt) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    setDragHandle('draw');
    setDrawOriginNorm(pt);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropBox({
      ymin: Math.round(pt.y),
      xmin: Math.round(pt.x),
      ymax: Math.min(1000, Math.round(pt.y + 16)),
      xmax: Math.min(1000, Math.round(pt.x + 16))
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pinchStartRef.current) return;
    if (interactionMode === 'pan' && isPanning && panOriginRef.current && containerRef.current) {
      const dx = e.clientX - panOriginRef.current.x;
      const dy = e.clientY - panOriginRef.current.y;
      containerRef.current.scrollLeft = panOriginRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = panOriginRef.current.scrollTop - dy;
      return;
    }
    if (interactionMode !== 'draw' || !isDragging || !dragHandle || !imageRef.current) return;
    e.preventDefault();

    if (dragHandle === 'draw' && drawOriginNorm) {
      const pt = getNormPoint(e.clientX, e.clientY);
      if (!pt) return;
      setCropBox({
        ymin: Math.round(Math.min(drawOriginNorm.y, pt.y)),
        xmin: Math.round(Math.min(drawOriginNorm.x, pt.x)),
        ymax: Math.round(Math.max(drawOriginNorm.y + 16, pt.y, Math.min(1000, drawOriginNorm.y + 16))),
        xmax: Math.round(Math.max(drawOriginNorm.x + 16, pt.x, Math.min(1000, drawOriginNorm.x + 16)))
      });
      if (Math.abs(pt.x - drawOriginNorm.x) > 15 || Math.abs(pt.y - drawOriginNorm.y) > 15) {
        const xmin = Math.min(drawOriginNorm.x, pt.x);
        const xmax = Math.max(drawOriginNorm.x, pt.x);
        const ymin = Math.min(drawOriginNorm.y, pt.y);
        const ymax = Math.max(drawOriginNorm.y, pt.y);
        setCropBox({
          xmin: Math.round(xmin),
          ymin: Math.round(ymin),
          xmax: Math.round(Math.max(xmin + 15, xmax)),
          ymax: Math.round(Math.max(ymin + 15, ymax))
        });
      }
      return;
    }

    if (!dragStart) return;
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
    setIsPanning(false);
    panOriginRef.current = null;
    setDragHandle(null);
    setDragStart(null);
    setDrawOriginNorm(null);
  };

  const verifySavedFigureUrl = async (url: string): Promise<boolean> => {
    if (!url) return false;
    return new Promise(resolve => {
      const probe = new Image();
      const timer = setTimeout(() => resolve(true), 3500);
      probe.onload = () => {
        clearTimeout(timer);
        resolve(probe.naturalWidth > 0 && probe.naturalHeight > 0);
      };
      probe.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      probe.src = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    });
  };

  const effectiveTargetOption =
    targetOption ||
    (/^option_([A-D])$/.exec(targetPlacement)?.[1] as 'A' | 'B' | 'C' | 'D' | undefined) ||
    (/^option_([A-D])$/.exec(cropType)?.[1] as 'A' | 'B' | 'C' | 'D' | undefined);

  const effectivePlacement: Parser2ImagePlacement = effectiveTargetOption
    ? (`option_${effectiveTargetOption}` as Parser2ImagePlacement)
    : targetPlacement;

  const handleSaveCrop = async (closeAfterSave: boolean) => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${localQuestion.id}/recrop`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          pageNumber: activePage,
          boundingBox: [
            Math.round(cropBox.ymin),
            Math.round(cropBox.xmin),
            Math.round(cropBox.ymax),
            Math.round(cropBox.xmax)
          ],
          targetOption: effectiveTargetOption,
          cropMode,
          figureType: cropType,
          cropType,
          placement: effectivePlacement,
          tableRow: effectivePlacement === 'table_cell' ? tableRow : undefined,
          tableCol: effectivePlacement === 'table_cell' ? tableCol : undefined,
          caption: cropCaption.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.figure?.figureUrl) {
        setError(data.error || `Crop save failed (HTTP ${res.status}).`);
        return;
      }

      const verifiedLoad = await verifySavedFigureUrl(data.figure.figureUrl);
      if (!verifiedLoad) {
        setError('Crop saved on server, but figure preview image could not be fetched yet. Please retry.');
        return;
      }

      if (data.question) {
        setLocalQuestion(data.question);
        onQuestionUpdated?.(data.question);
      }

      if (closeAfterSave) {
        onSuccess(data.figure.figureUrl, data.question);
      } else {
        setNotice(data.message || `Saved crop from Page ${activePage} (${cropType.replace(/_/g, ' ')}). Jump to any page to add more.`);
        setCropMode('add');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while saving crop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiAutoLocate = async () => {
    setIsAutoLocating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/questions/${localQuestion.id}/auto-recrop`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetOption: effectiveTargetOption,
          previewOnly: true,
          activePage
        })
      });
      const data = await res.json();
      if (data.success && data.previewSuggestion?.suggestedBoundingBox) {
        const s = data.previewSuggestion;
        const [ymin, xmin, ymax, xmax] = s.suggestedBoundingBox;
        if (s.suggestedPageNumber && s.suggestedPageNumber !== activePage) {
          navigateToPage(s.suggestedPageNumber);
        }
        setCropBox({ ymin, xmin, ymax, xmax });
        if (s.suggestedCropType) {
          setCropType(s.suggestedCropType as Parser2CropType);
        }
        setInteractionMode('draw');
        setNotice(s.note || `AI located region on Page ${s.suggestedPageNumber || activePage}. Fine-tune the blue box and click Save.`);
      } else if (data.success && data.question) {
        setLocalQuestion(data.question);
        onQuestionUpdated?.(data.question);
        setNotice(data.message || 'AI auto-locate completed.');
      } else {
        setError(data.error || 'AI auto-locate could not isolate a clean figure. Draw the blue box manually.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during AI auto-locate.');
    } finally {
      setIsAutoLocating(false);
    }
  };

  const handleDeleteAttachedFigure = async (figureId: string) => {
    setBusyFigureId(figureId);
    setError(null);
    try {
      const res = await fetch(
        `/api/parser2/jobs/${jobId}/questions/${localQuestion.id}/figures/${figureId}`,
        { method: 'DELETE', headers: getAdminRequestHeaders() }
      );
      const data = await res.json();
      if (data.success && data.question) {
        setLocalQuestion(data.question);
        onQuestionUpdated?.(data.question);
        setNotice('Removed crop attachment.');
      } else {
        setError(data.error || 'Failed to delete crop.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting crop.');
    } finally {
      setBusyFigureId(null);
    }
  };

  const handleSetPrimaryFigure = async (figureId: string) => {
    setBusyFigureId(figureId);
    setError(null);
    try {
      const res = await fetch(
        `/api/parser2/jobs/${jobId}/questions/${localQuestion.id}/figures/${figureId}/primary`,
        { method: 'PUT', headers: getAdminRequestHeaders() }
      );
      const data = await res.json();
      if (data.success && data.question) {
        setLocalQuestion(data.question);
        onQuestionUpdated?.(data.question);
        setNotice('Updated primary figure.');
      } else {
        setError(data.error || 'Failed to update primary figure.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error setting primary figure.');
    } finally {
      setBusyFigureId(null);
    }
  };

  const handleReassignFigure = async (figureId: string, nextPlacement: Parser2ImagePlacement) => {
    setBusyFigureId(figureId);
    setError(null);
    try {
      const res = await fetch(
        `/api/parser2/jobs/${jobId}/questions/${localQuestion.id}/figures/${figureId}/reassign`,
        {
          method: 'PUT',
          headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ placement: nextPlacement })
        }
      );
      const data = await res.json();
      if (data.success && data.question) {
        setLocalQuestion(data.question);
        onQuestionUpdated?.(data.question);
        setNotice(data.message || `Reassigned crop to ${nextPlacement.replace(/_/g, ' ')}.`);
      } else {
        setError(data.error || 'Failed to reassign crop destination.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error reassigning crop.');
    } finally {
      setBusyFigureId(null);
    }
  };

  // Source page chips (all pages question spans + attached figures' pages)
  const quickPages = Array.from(
    new Set<number>([
      ...(localQuestion.sourcePages || []),
      localQuestion.sourcePageNumber || 1,
      ...(localQuestion.figures || []).map(f => f.pageNumber).filter(Boolean)
    ])
  )
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const attachedFigures = localQuestion.figures || [];

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Sticky Top Header */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 tabular-nums">
            Q{localQuestion.questionNumber}{effectiveTargetOption ? `·${effectiveTargetOption}` : ''}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white font-['Outfit',sans-serif] truncate">
                {effectiveTargetOption ? `Crop Option (${effectiveTargetOption})` : 'PDF Figure Crop Editor'}
              </h3>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10.5px] font-bold text-blue-300">
                {localQuestion.sourcePageRange || `Page ${localQuestion.sourcePageNumber || 1}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate tabular-nums">
              Viewing Page {activePage} / {totalPages} · {attachedFigures.length} crop{attachedFigures.length === 1 ? '' : 's'} attached
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowThumbnails(t => !t)}
            className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              showThumbnails
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pages</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMobilePreview(p => !p)}
            className="lg:hidden min-h-[38px] px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {showMobilePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Crops ({attachedFigures.length})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close crop editor"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Dedicated Always-Visible Page Navigator Bar */}
      <div className="shrink-0 bg-slate-900/95 border-b border-slate-800 px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => navigateToPage(1)}
            disabled={activePage <= 1}
            aria-label="First page"
            className="min-h-[34px] min-w-[32px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-35 rounded-lg border border-slate-700 text-slate-100 cursor-pointer"
            title="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigateToPage(activePage - 1)}
            disabled={activePage <= 1}
            aria-label="Previous PDF page"
            className="min-h-[34px] px-2 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 rounded-lg border border-slate-700 text-xs font-bold text-slate-100 cursor-pointer"
            title="Previous page (Left Arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous Page</span>
          </button>

          <form
            onSubmit={e => {
              e.preventDefault();
              const parsed = parseInt(pageInput, 10);
              if (!isNaN(parsed)) navigateToPage(parsed);
            }}
            className="flex items-center gap-1 mx-0.5"
          >
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              aria-label="Jump to page number"
              className="w-12 h-[34px] px-1.5 text-center bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white tabular-nums outline-none focus:border-blue-500"
            />
            <span className="text-xs font-bold text-slate-400 tabular-nums whitespace-nowrap">of {totalPages}</span>
            <button
              type="submit"
              className="h-[34px] px-2 rounded-lg bg-slate-800 hover:bg-blue-600 border border-slate-700 text-[11px] font-bold text-slate-200 hover:text-white cursor-pointer"
            >
              Go
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigateToPage(activePage + 1)}
            disabled={activePage >= totalPages}
            aria-label="Next PDF page"
            className="min-h-[34px] px-2 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 rounded-lg border border-slate-700 text-xs font-bold text-slate-100 cursor-pointer"
            title="Next page (Right Arrow)"
          >
            <span className="hidden sm:inline">Next Page</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigateToPage(totalPages)}
            disabled={activePage >= totalPages}
            aria-label="Last page"
            className="min-h-[34px] min-w-[32px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-35 rounded-lg border border-slate-700 text-slate-100 cursor-pointer"
            title="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Source-Page Jump Chips */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase whitespace-nowrap mr-1">Q{localQuestion.questionNumber} Pages:</span>
          {quickPages.map(pNum => (
            <button
              key={pNum}
              type="button"
              onClick={() => navigateToPage(pNum)}
              className={`h-[30px] px-2.5 rounded-lg text-[11px] font-bold border whitespace-nowrap cursor-pointer transition ${
                activePage === pNum
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Pg {pNum}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Thumbnail Strip */}
      {showThumbnails && (
        <div className="shrink-0 bg-slate-950 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pNum => {
            const isSelected = pNum === activePage;
            const isQPage = quickPages.includes(pNum);
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => navigateToPage(pNum)}
                className={`shrink-0 p-1 rounded-lg border transition cursor-pointer flex flex-col items-center gap-1 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/60 ring-1 ring-blue-500'
                    : isQPage
                    ? 'border-emerald-600/70 bg-slate-900'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <img
                  src={`/api/parser2/jobs/${jobId}/pages/${pNum}/image`}
                  alt={`Page ${pNum}`}
                  loading="lazy"
                  className="w-12 h-16 object-cover rounded bg-white"
                />
                <span className={`text-[10px] font-bold tabular-nums ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                  Pg {pNum}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Control Toolbar Row 2: Mode 1/2 Switch, Interaction Mode, Zoom, Placement & Attach Mode */}
      <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Explicit Mode 1 (Original PDF Page) vs Mode 2 (Crop Editor) Toggle */}
          <div className="flex rounded-lg border border-slate-700 bg-slate-950 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditorMode('view');
                setInteractionMode('pan');
              }}
              className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                editorMode === 'view' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Mode 1: Inspect the clean original PDF page freely without crop box overlay"
            >
              <Eye className="w-3.5 h-3.5" /> Original Page
            </button>
            <button
              type="button"
              onClick={() => {
                setEditorMode('crop');
                setInteractionMode('draw');
              }}
              className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                editorMode === 'crop' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Mode 2: Draw, move, and resize crop boxes anywhere on the page"
            >
              <Crop className="w-3.5 h-3.5" /> Crop Editor
            </button>
          </div>

          {/* Interaction Mode Toggle (when in Crop Editor mode) */}
          {editorMode === 'crop' && (
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setInteractionMode('draw')}
                className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  interactionMode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5" /> Draw / Resize
              </button>
              <button
                type="button"
                onClick={() => setInteractionMode('pan')}
                className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  interactionMode === 'pan' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Hand className="w-3.5 h-3.5" /> Pan / Scroll
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => applyFitMode('fit-page')}
            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold border whitespace-nowrap cursor-pointer transition ${
              fitMode === 'fit-page'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Fit Page
          </button>
          <button
            type="button"
            onClick={() => applyFitMode('fit-width')}
            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold border whitespace-nowrap cursor-pointer transition ${
              fitMode === 'fit-width'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Fit Width
          </button>

          <button
            type="button"
            onClick={() => applyZoomStep(-0.25)}
            aria-label="Zoom out"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-200 tabular-nums shrink-0">
            {fitMode === 'manual' ? `${Math.round(zoomScale * 100)}%` : fitMode === 'fit-page' ? 'Page' : 'Width'}
          </span>
          <button
            type="button"
            onClick={() => applyZoomStep(0.25)}
            aria-label="Zoom in"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyFitMode('fit-page')}
            className="min-h-[36px] px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-bold whitespace-nowrap cursor-pointer"
            title="Reset zoom to full Fit Page view"
          >
            Reset Zoom
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={effectivePlacement}
            onChange={e => {
              const nextP = e.target.value as Parser2ImagePlacement;
              setTargetPlacement(nextP);
              const optM = /^option_([A-D])$/.exec(nextP);
              if (optM) setCropType(`option_${optM[1]}` as Parser2CropType);
            }}
            aria-label="Target placement"
            title="Where to attach this cropped image in the question"
            className="min-h-[36px] px-2.5 bg-indigo-950 border border-indigo-700 rounded-lg text-xs font-bold text-indigo-100 outline-none max-w-[200px]"
          >
            {PLACEMENT_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>
                Attach: {p.label}
              </option>
            ))}
          </select>

          <select
            value={cropType}
            onChange={e => setCropType(e.target.value as Parser2CropType)}
            aria-label="Crop type"
            className="min-h-[36px] px-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-100 outline-none"
          >
            {CROP_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={cropCaption}
            onChange={e => setCropCaption(e.target.value)}
            placeholder="Optional caption..."
            className="min-h-[36px] w-32 sm:w-40 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500"
          />

          {effectivePlacement === 'table_cell' && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 shrink-0">
              <span>R</span>
              <input
                type="number"
                min={0}
                value={tableRow}
                onChange={e => setTableRow(Math.max(0, parseInt(e.target.value, 10) || 0))}
                aria-label="Table row index"
                className="w-10 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white"
              />
              <span>C</span>
              <input
                type="number"
                min={0}
                value={tableCol}
                onChange={e => setTableCol(Math.max(0, parseInt(e.target.value, 10) || 0))}
                aria-label="Table column index"
                className="w-10 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-white"
              />
            </div>
          )}

          <div className="flex rounded-lg border border-slate-700 bg-slate-800 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setCropMode('replace')}
              className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                cropMode === 'replace' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
              title={effectiveTargetOption ? `Replace Option ${effectiveTargetOption} image` : 'Replace primary figure'}
            >
              {effectiveTargetOption ? 'Replace Opt' : 'Replace Primary'}
            </button>
            <button
              type="button"
              onClick={() => setCropMode('add')}
              className={`min-h-[36px] px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                cropMode === 'add' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
              title="Add an extra image attachment without removing existing images"
            >
              <Plus className="w-3.5 h-3.5" /> Add Extra
            </button>
          </div>
        </div>
      </div>

      {/* Notices / Errors */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-rose-950 border-b border-rose-800 text-rose-100 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-300 hover:text-white text-xs font-bold px-2">
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="shrink-0 px-4 py-2 bg-emerald-950/90 border-b border-emerald-800 text-emerald-100 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-300 hover:text-white text-xs font-bold px-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Viewport + Live Preview & Multi-Crop Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-3 pb-24 sm:p-5 sm:pb-12 bg-slate-950 select-none"
          style={{
            touchAction: interactionMode === 'pan' ? 'pan-x pan-y' : 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={handleViewportWheel}
          onTouchStart={handleViewportTouchStart}
          onTouchMove={handleViewportTouchMove}
          onTouchEnd={handleViewportTouchEnd}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageError ? (
            <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-white">Page {activePage} image failed to load</p>
              <button
                type="button"
                onClick={() => {
                  setImageError(false);
                  setImageLoadedTick(t => t + 1);
                }}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                Retry Loading Page
              </button>
            </div>
          ) : (
            <div
              className={`relative mx-auto border border-slate-700 bg-white shadow-2xl ${
                editorMode === 'crop' && interactionMode === 'draw' ? 'cursor-crosshair' : 'cursor-grab'
              }`}
              style={{
                width: `${renderedWidth}px`,
                height: `${renderedHeight}px`,
                touchAction: editorMode === 'crop' && interactionMode === 'draw' ? 'none' : 'pan-x pan-y'
              }}
              onPointerDown={handleCanvasPointerDown}
            >
              <img
                ref={imageRef}
                src={fallbackPageUrl}
                crossOrigin="anonymous"
                onLoad={e => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                  setImageError(false);
                  setImageLoadedTick(t => t + 1);
                }}
                onError={() => setImageError(true)}
                alt={`PDF Page ${activePage}`}
                className="w-full h-full object-contain block pointer-events-none select-none"
                draggable={false}
              />

              {/* Interactive Crop Box (hidden cleanly in Mode 1 Original Page Viewer) */}
              {editorMode === 'crop' && (
              <div
                className={`absolute border-2 border-blue-500 bg-blue-500/20 shadow-xl ring-2 ring-white/80 ${
                  interactionMode === 'draw' ? 'cursor-move' : 'pointer-events-none opacity-75'
                }`}
                style={{
                  top: `${cropBox.ymin / 10}%`,
                  left: `${cropBox.xmin / 10}%`,
                  width: `${(cropBox.xmax - cropBox.xmin) / 10}%`,
                  height: `${(cropBox.ymax - cropBox.ymin) / 10}%`,
                  touchAction: interactionMode === 'draw' ? 'none' : 'auto'
                }}
                onPointerDown={e => handleBoxPointerDown(e, 'box')}
              >
                {interactionMode === 'draw' && (
                  <>
                    {(
                      [
                        { handle: 'tl', pos: '-top-4 -left-4 cursor-nwse-resize' },
                        { handle: 'tr', pos: '-top-4 -right-4 cursor-nesw-resize' },
                        { handle: 'bl', pos: '-bottom-4 -left-4 cursor-nesw-resize' },
                        { handle: 'br', pos: '-bottom-4 -right-4 cursor-nwse-resize' }
                      ] as const
                    ).map(h => (
                      <div
                        key={h.handle}
                        className={`absolute ${h.pos} w-9 h-9 flex items-center justify-center z-20`}
                        style={{ touchAction: 'none' }}
                        onPointerDown={e => handleBoxPointerDown(e, h.handle)}
                      >
                        <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md" />
                      </div>
                    ))}

                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-10 h-7 flex items-center justify-center cursor-ns-resize z-20"
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => handleBoxPointerDown(e, 't')}
                    >
                      <div className="w-6 h-2.5 bg-blue-600 border border-white rounded-full shadow-sm" />
                    </div>
                    <div
                      className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-10 h-7 flex items-center justify-center cursor-ns-resize z-20"
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => handleBoxPointerDown(e, 'b')}
                    >
                      <div className="w-6 h-2.5 bg-blue-600 border border-white rounded-full shadow-sm" />
                    </div>
                    <div
                      className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-10 flex items-center justify-center cursor-ew-resize z-20"
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => handleBoxPointerDown(e, 'l')}
                    >
                      <div className="w-2.5 h-6 bg-blue-600 border border-white rounded-full shadow-sm" />
                    </div>
                    <div
                      className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-10 flex items-center justify-center cursor-ew-resize z-20"
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => handleBoxPointerDown(e, 'r')}
                    >
                      <div className="w-2.5 h-6 bg-blue-600 border border-white rounded-full shadow-sm" />
                    </div>
                  </>
                )}

                <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xs pointer-events-none">
                  {effectiveTargetOption ? `Option ${effectiveTargetOption}` : cropType.replace(/_/g, ' ')} · Pg {activePage}
                </div>
              </div>
              )}
            </div>
          )}
        </div>

        {/* Live Crop Preview & Attached Multi-Page Crops Rail */}
        <aside
          className={`${
            showMobilePreview ? 'flex' : 'hidden lg:flex'
          } lg:w-80 max-h-[45vh] lg:max-h-none overflow-y-auto shrink-0 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 sm:p-4 flex-col gap-3`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
              <Scan className="w-3.5 h-3.5 text-blue-400" />
              1:1 Live Preview
            </span>
            <span className="text-[10.5px] text-slate-400 font-mono tabular-nums">
              {previewDims.width > 0 ? `${previewDims.width}×${previewDims.height}px` : ''}
            </span>
          </div>

          <div className="bg-white border border-slate-700 rounded-xl p-2 flex items-center justify-center min-h-[136px]">
            <canvas ref={previewCanvasRef} className="max-w-full max-h-[144px] object-contain" />
          </div>

          <div className="text-[10.5px] text-slate-400 font-mono tabular-nums flex items-center justify-between">
            <span>Pg {activePage} · [{Math.round(cropBox.ymin)}, {Math.round(cropBox.xmin)}, {Math.round(cropBox.ymax)}, {Math.round(cropBox.xmax)}]</span>
          </div>

          {/* Attached Multi-Page Crops List */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-200">
                Attached Crops ({attachedFigures.length})
              </span>
              <span className="text-[10px] text-slate-400">
                {localQuestion.sourcePageRange || `Page ${localQuestion.sourcePageNumber || 1}`}
              </span>
            </div>

            {attachedFigures.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-[11px] text-slate-400 text-center">
                No crops attached yet. Select a page and box, then click &quot;Save Crop &amp; Stay&quot; or &quot;Save &amp; Done&quot;.
              </div>
            ) : (
              <div className="space-y-2">
                {attachedFigures.map((fig: Parser2Figure) => {
                  const isPrimary = localQuestion.figureUrl === fig.figureUrl;
                  const isBusy = busyFigureId === fig.id;
                  return (
                    <div
                      key={fig.id}
                      className={`p-2 rounded-xl border bg-slate-950 flex items-center gap-2 ${
                        isPrimary ? 'border-blue-500/80' : 'border-slate-800'
                      }`}
                    >
                      <img
                        src={fig.figureUrl}
                        alt={`Crop from page ${fig.pageNumber}`}
                        onClick={() => {
                          navigateToPage(fig.pageNumber);
                          if (fig.boundingBox) {
                            const [ymin, xmin, ymax, xmax] = fig.boundingBox;
                            setCropBox({ ymin, xmin, ymax, xmax });
                          }
                        }}
                        className="w-14 h-12 object-contain bg-white rounded border border-slate-700 shrink-0 cursor-pointer"
                        title="Click to jump to this crop's page & box"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10.5px] font-bold text-slate-200 truncate">
                            Pg {fig.pageNumber} · {(fig.cropType || fig.figureType || 'diagram').replace(/_/g, ' ')}
                          </span>
                          {isPrimary && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-600 text-white shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!isPrimary && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSetPrimaryFigure(fig.id)}
                              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                            >
                              <Star className="w-2.5 h-2.5" /> Set Primary
                            </button>
                          )}
                          <select
                            aria-label="Reassign crop destination"
                            disabled={isBusy}
                            defaultValue=""
                            onChange={e => {
                              const val = e.target.value as Parser2ImagePlacement;
                              if (val) {
                                handleReassignFigure(fig.id, val);
                                e.target.value = '';
                              }
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[9.5px] font-bold text-indigo-300 outline-none max-w-[96px]"
                          >
                            <option value="">Move to...</option>
                            {PLACEMENT_OPTIONS.map(p => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteAttachedFigure(fig.id)}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Action Footer */}
      <footer className="shrink-0 bg-slate-900 border-t border-slate-800 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const matchingFig = (localQuestion.figures || []).find(f => f.pageNumber === activePage && f.boundingBox);
              if (matchingFig?.boundingBox) {
                const [ymin, xmin, ymax, xmax] = matchingFig.boundingBox;
                setCropBox({ ymin, xmin, ymax, xmax });
              } else if (effectiveTargetOption) {
                setCropBox({ ymin: 350, xmin: 60, ymax: 520, xmax: 460 });
              } else {
                setCropBox({ ymin: 200, xmin: 100, ymax: 600, xmax: 900 });
              }
              setNotice('Selection reset.');
            }}
            className="min-h-[40px] px-3 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset Selection
          </button>
          <button
            type="button"
            onClick={() => {
              setCropBox({ ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 });
              setNotice('Selected full page bounds (0–1000).');
            }}
            className="min-h-[40px] px-3 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> Full Page Crop
          </button>
          <button
            type="button"
            onClick={handleAiAutoLocate}
            disabled={isAutoLocating || isSubmitting}
            className="min-h-[40px] px-3 text-xs font-bold text-indigo-200 hover:text-white bg-indigo-950 hover:bg-indigo-900 disabled:opacity-50 border border-indigo-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Wand2 className={`w-3.5 h-3.5 text-indigo-300 ${isAutoLocating ? 'animate-spin' : ''}`} />
            {isAutoLocating ? 'AI Locating...' : 'AI Auto-Locate'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isAutoLocating}
            className="min-h-[40px] px-3.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSaveCrop(false)}
            disabled={isSubmitting || isAutoLocating}
            className="min-h-[40px] px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save Crop & Stay'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveCrop(true)}
            disabled={isSubmitting || isAutoLocating}
            className="min-h-[40px] px-4 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            {isSubmitting ? <CheckCircle2 className="w-4 h-4 animate-pulse" /> : <Crop className="w-4 h-4" />}
            <span>
              {isSubmitting
                ? 'Saving...'
                : effectiveTargetOption
                ? `Save Option ${effectiveTargetOption} & Done`
                : 'Save & Done'}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};
