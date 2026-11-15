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
  Cloud,
  Loader2,
  Trash2,
  Grid,
  Square,
  Maximize2,
  Upload,
  FileText
} from 'lucide-react';
import { MockQuestion } from '../types';
import { idbGetPageImage, idbFindPageImageForQuestion } from '../lib/idbStorage';
import { renderPdfPageToCanvas, loadPdfDocument } from '../lib/pdfFigureExtractor';
import { detectDiagramInkBoundingBoxOnCanvas } from '../lib/geminiPdfParser';
import { backgroundPdfParserService } from '../lib/backgroundPdfParser';

interface DiagramRecropModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: MockQuestion | null;
  jobId?: string;
  pdfDocProxy?: any;
  testId?: string;
  allQuestions?: MockQuestion[];
  onSaveQuestionsList?: (updatedList: MockQuestion[]) => void;
  onSaveCroppedDiagram: (
    updatedQuestion: MockQuestion, 
    newDiagramDataUrl: string, 
    target?: 'question' | 'A' | 'B' | 'C' | 'D'
  ) => void;
}

export const DiagramRecropModal: React.FC<DiagramRecropModalProps> = ({
  isOpen,
  onClose,
  question: initialQuestion,
  jobId,
  pdfDocProxy,
  testId,
  allQuestions = [],
  onSaveQuestionsList,
  onSaveCroppedDiagram
}) => {
  const [localPdfDocProxy, setLocalPdfDocProxy] = useState<any>(pdfDocProxy || null);
  const activeDocProxy = localPdfDocProxy || pdfDocProxy || backgroundPdfParserService.getActiveDocProxy();
  const [activeQuestion, setActiveQuestion] = useState<MockQuestion | null>(initialQuestion);

  const getQuestionPage = (q: MockQuestion | null | undefined): number => {
    if (!q) return 1;
    if (q.pdfPageNumber && q.pdfPageNumber > 0) return q.pdfPageNumber;
    if (q.figureCropInfo?.pageNumber && q.figureCropInfo.pageNumber > 0) return q.figureCropInfo.pageNumber;
    const match = (q.diagramHint || '').match(/Page\s*(\d+)/i);
    if (match && match[1]) return Number(match[1]);
    return 1;
  };

  const initialPage = getQuestionPage(activeQuestion);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(() => activeDocProxy?.numPages || 45);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [isCustomPdfLoading, setIsCustomPdfLoading] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [pageDataUrl, setPageDataUrl] = useState<string | null>(null);

  // Target Destination: Main question diagram or an option figure (A, B, C, D)
  const [cropTarget, setCropTarget] = useState<'question' | 'A' | 'B' | 'C' | 'D'>('question');
  const [isUploadingToCloudflare, setIsUploadingToCloudflare] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '16:9' | '3:4'>('free');

  // Question navigation helpers
  const questionIndex = allQuestions.findIndex(q => q.questionNumber === activeQuestion?.questionNumber);
  const hasPrev = questionIndex > 0;
  const hasNext = questionIndex >= 0 && questionIndex < allQuestions.length - 1;

  const parseBoxToCropPercentages = (box: any) => {
    if (box && Array.isArray(box) && box.length === 4) {
      const [ymin, xmin, ymax, xmax] = box;
      const maxVal = Math.max(ymin, xmin, ymax, xmax);
      let scale = 1;
      if (maxVal <= 1.05) {
        scale = 100; // 0..1 normalized
      } else if (maxVal <= 100.5) {
        scale = 1; // 0..100 percent
      } else {
        scale = 0.1; // 0..1000 Gemini coordinate space
      }
      const x = Math.max(0, Math.min(95, xmin * scale));
      const y = Math.max(0, Math.min(95, ymin * scale));
      const width = Math.max(5, Math.min(100 - x, (xmax - xmin) * scale));
      const height = Math.max(5, Math.min(100 - y, (ymax - ymin) * scale));
      return { x, y, width, height };
    }
    return null;
  };

  const getInitialCropForQuestion = (targetQ: MockQuestion | null | undefined) => {
    if (!targetQ) return { x: 6, y: 20, width: 46, height: 30 };
    
    // Check if question has a valid pre-existing bounding box
    if (targetQ.figureCropInfo?.box) {
      const parsed = parseBoxToCropPercentages(targetQ.figureCropInfo.box);
      if (parsed && parsed.width > 5 && parsed.height > 5) {
        return parsed;
      }
    }

    // Estimate vertical position of the question on its page:
    // This guarantees Question 2 opens in the middle of page 3 rather than stuck at top covering Question 1!
    const targetPage = getQuestionPage(targetQ);
    const pageQuestions = allQuestions.filter(q => getQuestionPage(q) === targetPage);
    let pageIdx = pageQuestions.findIndex(q => q.questionNumber === targetQ.questionNumber);
    if (pageIdx === -1) pageIdx = 0;
    const totalOnPage = Math.max(1, pageQuestions.length);

    // Progression from top to bottom based on question order on this page
    const estimatedY = Math.min(75, Math.max(4, Math.round((pageIdx / totalOnPage) * 78 + 4)));
    return { x: 6, y: estimatedY, width: 46, height: 30 };
  };

  const goToQuestion = (targetQ: MockQuestion) => {
    setActiveQuestion(targetQ);
    const targetPage = getQuestionPage(targetQ);
    setCurrentPage(targetPage);
    setCropTarget('question');
    const existingFig = targetQ.figureUrl || targetQ.questionImageUrl || targetQ.figures?.[0] || null;
    setPreviewCropUrl(existingFig);
    setCropBox(getInitialCropForQuestion(targetQ));
  };

  // Crop rectangle state (in normalized percentages: 0 to 100)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>(() => {
    return getInitialCropForQuestion(initialQuestion);
  });

  const [previewCropUrl, setPreviewCropUrl] = useState<string | null>(initialQuestion?.figureUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'create' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'>('create');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxAtDragStart, setBoxAtDragStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state whenever initialQuestion changes
  useEffect(() => {
    if (!isOpen || !initialQuestion) return;
    setActiveQuestion(initialQuestion);
    const page = getQuestionPage(initialQuestion);
    setCurrentPage(page);
    const docToUse = activeDocProxy || backgroundPdfParserService.getActiveDocProxy();
    if (docToUse?.numPages) setTotalPages(docToUse.numPages);

    setCropBox(getInitialCropForQuestion(initialQuestion));
    setCropTarget('question');
    setPreviewCropUrl(initialQuestion.figureUrl || null);
  }, [isOpen, initialQuestion, pdfDocProxy]);

  const question = activeQuestion || initialQuestion;

  const handleSelectPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCustomPdfLoading(true);
    setIsLoadingPage(true);
    try {
      const doc = await loadPdfDocument(file);
      setLocalPdfDocProxy(doc);
      setTotalPages(doc.numPages);
      const targetPage = Math.min(doc.numPages, Math.max(1, currentPage));
      const offCanvas = document.createElement('canvas');
      await renderPdfPageToCanvas(doc, targetPage, offCanvas, 2.0);
      offscreenCanvasRef.current = offCanvas;
      const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92);
      setPageDataUrl(dataUrl);
    } catch (err: any) {
      console.error('Error loading PDF in DiagramRecropModal:', err);
    } finally {
      setIsCustomPdfLoading(false);
      setIsLoadingPage(false);
    }
  };

  const handleSelectDirectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      if (url) {
        setPreviewCropUrl(url);
        // Also if we set this as the page data url so they can crop if needed, or save directly
        setPageDataUrl(url);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load target PDF page whenever currentPage changes
  useEffect(() => {
    if (!isOpen || !question) return;
    let isCancelled = false;
    // CRITICAL: Immediately clear stale page canvas so the previous page never flashes
    // or appears in the middle of the cropping area while a new page loads
    setPageDataUrl(null);
    setIsLoadingPage(true);

    const loadPage = async () => {
      const docToUse = activeDocProxy || backgroundPdfParserService.getActiveDocProxy();

      // 1. Try to render directly from PDF document proxy if active in memory
      if (docToUse && docToUse.numPages > 0) {
        const clampedPage = Math.max(1, Math.min(docToUse.numPages, currentPage));
        try {
          const offCanvas = document.createElement('canvas');
          await renderPdfPageToCanvas(docToUse, clampedPage, offCanvas, 2.0);
          if (!isCancelled) {
            offscreenCanvasRef.current = offCanvas;
            const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92);
            setPageDataUrl(dataUrl);
            setTotalPages(docToUse.numPages);
            if (clampedPage !== currentPage) {
              setCurrentPage(clampedPage);
            }
            setIsLoadingPage(false);
            return;
          }
        } catch (err) {
          console.warn('Direct PDF render note:', err);
        }
      }

      // 2. Try IndexedDB page cache for jobId
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

      // 3. Try IndexedDB page cache for testId
      if (testId) {
        try {
          const cached = await idbGetPageImage(testId, currentPage);
          if (cached && !isCancelled) {
            setPageDataUrl(cached);
            setIsLoadingPage(false);
            return;
          }
        } catch {}
      }

      // 4. Try standard active job cache
      try {
        const cached = await idbGetPageImage('active_pdf_job', currentPage);
        if (cached && !isCancelled) {
          setPageDataUrl(cached);
          setIsLoadingPage(false);
          return;
        }
      } catch {}

      // 5. Try to find any cached page for this question in IndexedDB
      try {
        const found = await idbFindPageImageForQuestion(currentPage);
        if (found && !isCancelled) {
          setPageDataUrl(found);
          setIsLoadingPage(false);
          return;
        }
      } catch {}

      // 6. If no PDF page is cached anywhere, preserve existing cropped diagram for preview only!
      // NEVER set pageDataUrl to a cropped diagram thumbnail as that distorts coordinates and page boundaries.
      const existingFigure = question?.figureUrl || question?.questionImageUrl || (question?.figures && question?.figures[0]);
      if (existingFigure && !isCancelled) {
        setPreviewCropUrl(existingFigure);
      }

      if (!isCancelled) {
        setIsLoadingPage(false);
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, question, currentPage, jobId, activeDocProxy]);

  // Update live crop preview whenever cropBox or pageDataUrl changes
  useEffect(() => {
    if (!isOpen || !question || !pageDataUrl) return;

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
  }, [isOpen, question, cropBox, pageDataUrl]);

  // Helper to extract relative percent coordinates strictly from the displayed image dimensions
  const getCoordinates = (clientX: number, clientY: number) => {
    const el = imageRef.current || containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
  };

  // Start dragging: Move box, resize on any of 8 handles, or create new box
  const startDrag = (clientX: number, clientY: number, action: typeof dragAction) => {
    const coords = getCoordinates(clientX, clientY);
    setIsDragging(true);
    setDragAction(action);
    setDragStart(coords);
    setBoxAtDragStart({ ...cropBox });

    if (action === 'create') {
      setCropBox({
        x: Math.max(0, Math.min(95, coords.x)),
        y: Math.max(0, Math.min(95, coords.y)),
        width: 2,
        height: 2
      });
    }
  };

  // Move dragging: Phone Gallery style smooth bounded adjustment
  const updateDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const current = getCoordinates(clientX, clientY);

    const dx = current.x - dragStart.x;
    const dy = current.y - dragStart.y;

    if (dragAction === 'move') {
      const newX = Math.max(0, Math.min(100 - boxAtDragStart.width, boxAtDragStart.x + dx));
      const newY = Math.max(0, Math.min(100 - boxAtDragStart.height, boxAtDragStart.y + dy));
      setCropBox(prev => ({ ...prev, x: newX, y: newY }));
    } else if (dragAction === 'create') {
      const newX = Math.min(dragStart.x, current.x);
      const newY = Math.min(dragStart.y, current.y);
      let newW = Math.abs(current.x - dragStart.x);
      let newH = Math.abs(current.y - dragStart.y);

      if (aspectRatio === '1:1') {
        const side = Math.max(newW, newH);
        newW = side;
        newH = side;
      } else if (aspectRatio === '4:3') {
        newH = newW * 0.75;
      } else if (aspectRatio === '16:9') {
        newH = newW * (9 / 16);
      } else if (aspectRatio === '3:4') {
        newH = newW * (4 / 3);
      }

      setCropBox({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: Math.min(100 - newX, Math.max(3, newW)),
        height: Math.min(100 - newY, Math.max(3, newH))
      });
    } else if (dragAction === 'se') {
      const newW = Math.max(3, Math.min(100 - boxAtDragStart.x, boxAtDragStart.width + dx));
      const newH = Math.max(3, Math.min(100 - boxAtDragStart.y, boxAtDragStart.height + dy));
      setCropBox(prev => ({ ...prev, width: newW, height: newH }));
    } else if (dragAction === 'nw') {
      const newX = Math.max(0, Math.min(boxAtDragStart.x + boxAtDragStart.width - 3, boxAtDragStart.x + dx));
      const newY = Math.max(0, Math.min(boxAtDragStart.y + boxAtDragStart.height - 3, boxAtDragStart.y + dy));
      const newW = boxAtDragStart.width - (newX - boxAtDragStart.x);
      const newH = boxAtDragStart.height - (newY - boxAtDragStart.y);
      setCropBox({ x: newX, y: newY, width: newW, height: newH });
    } else if (dragAction === 'ne') {
      const newY = Math.max(0, Math.min(boxAtDragStart.y + boxAtDragStart.height - 3, boxAtDragStart.y + dy));
      const newW = Math.max(3, Math.min(100 - boxAtDragStart.x, boxAtDragStart.width + dx));
      const newH = boxAtDragStart.height - (newY - boxAtDragStart.y);
      setCropBox(prev => ({ ...prev, y: newY, width: newW, height: newH }));
    } else if (dragAction === 'sw') {
      const newX = Math.max(0, Math.min(boxAtDragStart.x + boxAtDragStart.width - 3, boxAtDragStart.x + dx));
      const newW = boxAtDragStart.width - (newX - boxAtDragStart.x);
      const newH = Math.max(3, Math.min(100 - boxAtDragStart.y, boxAtDragStart.height + dy));
      setCropBox(prev => ({ ...prev, x: newX, width: newW, height: newH }));
    } else if (dragAction === 'n') {
      const newY = Math.max(0, Math.min(boxAtDragStart.y + boxAtDragStart.height - 3, boxAtDragStart.y + dy));
      const newH = boxAtDragStart.height - (newY - boxAtDragStart.y);
      setCropBox(prev => ({ ...prev, y: newY, height: newH }));
    } else if (dragAction === 's') {
      const newH = Math.max(3, Math.min(100 - boxAtDragStart.y, boxAtDragStart.height + dy));
      setCropBox(prev => ({ ...prev, height: newH }));
    } else if (dragAction === 'w') {
      const newX = Math.max(0, Math.min(boxAtDragStart.x + boxAtDragStart.width - 3, boxAtDragStart.x + dx));
      const newW = boxAtDragStart.width - (newX - boxAtDragStart.x);
      setCropBox(prev => ({ ...prev, x: newX, width: newW }));
    } else if (dragAction === 'e') {
      const newW = Math.max(3, Math.min(100 - boxAtDragStart.x, boxAtDragStart.width + dx));
      setCropBox(prev => ({ ...prev, width: newW }));
    }
  };

  const endDrag = (e?: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e && 'releasePointerCapture' in e.target && (e as any).pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture((e as any).pointerId);
      } catch {}
    }
    setIsDragging(false);
  };

  // Pointer event handlers (Works flawlessly for Mouse, Touch, and Stylus with Zero Page Scrolling)
  const handlePointerDown = (e: React.PointerEvent, action: typeof dragAction) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startDrag(e.clientX, e.clientY, action);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updateDrag(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    endDrag(e);
  };

  // Fallback Mouse and Touch event handlers
  const handleMouseDown = (e: React.MouseEvent, action: typeof dragAction) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, action);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updateDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent, action: typeof dragAction) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, action);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      updateDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Window-level drag locking: Guarantees dragging the crop box NEVER moves or scrolls the whole page
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      updateDrag(e.clientX, e.clientY);
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      endDrag();
    };

    const onGlobalTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onGlobalTouchEnd = () => {
      endDrag();
    };

    window.addEventListener('pointermove', onGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', onGlobalPointerUp, { passive: false });
    window.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', onGlobalTouchEnd, { passive: false });

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isDragging, dragAction, dragStart, boxAtDragStart]);

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  const focusCropInView = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    if (imageRef.current && imageRef.current.clientHeight > 50) {
      const imgTop = imageRef.current.offsetTop || 0;
      const imgH = imageRef.current.clientHeight;
      const targetY = imgTop + (cropBox.y / 100) * imgH;
      container.scrollTo({
        top: Math.max(0, targetY - container.clientHeight / 2.8),
        behavior: 'smooth'
      });
    } else {
      const scrollH = container.scrollHeight;
      const targetY = (cropBox.y / 100) * scrollH;
      container.scrollTo({
        top: Math.max(0, targetY - container.clientHeight / 3),
        behavior: 'smooth'
      });
    }
  };

  // Auto-focus the crop box when page finishes loading or question switches
  useEffect(() => {
    if (pageDataUrl && !isLoadingPage) {
      const timer = setTimeout(() => {
        focusCropInView();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pageDataUrl, isLoadingPage, activeQuestion?.questionNumber]);

  const applyPreset = (type: 'left_col' | 'right_col' | 'full_width' | 'figure_only' | 'nudge_up' | 'nudge_down' | 'grow' | 'shrink') => {
    setCropBox(prev => {
      switch (type) {
        case 'left_col':
          return {
            x: 4,
            y: Math.max(0, Math.min(80, prev.y)),
            width: 45,
            height: Math.max(12, Math.min(35, prev.height))
          };
        case 'right_col':
          return {
            x: 51,
            y: Math.max(0, Math.min(80, prev.y)),
            width: 45,
            height: Math.max(12, Math.min(35, prev.height))
          };
        case 'full_width':
          return {
            x: 4,
            y: Math.max(0, Math.min(80, prev.y)),
            width: 92,
            height: Math.max(12, Math.min(45, prev.height))
          };
        case 'figure_only':
          return {
            x: Math.max(2, Math.min(65, prev.x + (prev.width - 34) / 2)),
            y: Math.max(2, Math.min(75, prev.y + (prev.height - 24) / 2)),
            width: 34,
            height: 24
          };
        case 'nudge_up':
          return { ...prev, y: Math.max(0, prev.y - 2) };
        case 'nudge_down':
          return { ...prev, y: Math.min(100 - prev.height, prev.y + 2) };
        case 'grow':
          return { ...prev, height: Math.min(100 - prev.y, prev.height + 3) };
        case 'shrink':
          return { ...prev, height: Math.max(5, prev.height - 3) };
      }
    });
  };

  // Save diagram crop with direct server upload to prevent localStorage quota overflows
  const handleSaveCrop = async (andNext: boolean = false) => {
    if (!previewCropUrl || !question) return;
    setIsUploadingToCloudflare(true);
    const localDataUrl = previewCropUrl;

    const normalizedBox: [number, number, number, number] = [
      Math.round(cropBox.y * 10),
      Math.round(cropBox.x * 10),
      Math.round((cropBox.y + cropBox.height) * 10),
      Math.round((cropBox.x + cropBox.width) * 10)
    ];

    let finalCropUrl = localDataUrl;

    // Upload to server endpoint to obtain a lightweight proxy URL
    try {
      const cleanFileName = `q${question.questionNumber}_${cropTarget}_${Date.now()}.png`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch('/api/r2/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: cleanFileName,
          base64Data: localDataUrl,
          contentType: 'image/png',
          folder: 'cbt_diagrams'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.url) {
          finalCropUrl = data.url;
        }
      }
    } catch (uploadErr) {
      console.warn('R2 upload note, keeping local data URL fallback:', uploadErr);
    } finally {
      setIsUploadingToCloudflare(false);
    }

    let updatedQuestion: MockQuestion = { ...question };

    if (cropTarget === 'question') {
      updatedQuestion = {
        ...updatedQuestion,
        figureUrl: finalCropUrl,
        questionImageUrl: finalCropUrl,
        figures: [finalCropUrl],
        pdfPageNumber: currentPage,
        hasFigure: true,
        needsDiagramCrop: false,
        diagramHint: undefined,
        figureCropInfo: {
          pageNumber: currentPage,
          box: normalizedBox,
          isManualCrop: true,
          confidence: 1.0,
          label: 'diagram'
        },
        languages: {
          ...updatedQuestion.languages,
          en: {
            ...(updatedQuestion.languages?.en || { questionText: updatedQuestion.questionText, options: updatedQuestion.options }),
            figureUrl: finalCropUrl
          },
          hi: updatedQuestion.languages?.hi ? {
            ...updatedQuestion.languages.hi,
            figureUrl: finalCropUrl
          } : {
            questionText: updatedQuestion.questionText,
            options: updatedQuestion.options,
            figureUrl: finalCropUrl
          }
        }
      };
    } else {
      // Option figure (A, B, C, D)
      const currentOptFigures = { ...(updatedQuestion.optionFigures || {}) };
      currentOptFigures[cropTarget] = finalCropUrl;

      const updatedOptions = (updatedQuestion.options || []).map(opt => {
        if (opt.label === cropTarget) {
          return {
            ...opt,
            type: 'text_and_image' as const,
            imageUrl: finalCropUrl
          };
        }
        return opt;
      });

      updatedQuestion = {
        ...updatedQuestion,
        optionFigures: currentOptFigures,
        options: updatedOptions,
        pdfPageNumber: currentPage,
        languages: {
          ...updatedQuestion.languages,
          en: {
            ...(updatedQuestion.languages?.en || { questionText: updatedQuestion.questionText, options: updatedOptions }),
            options: updatedOptions
          },
          hi: updatedQuestion.languages?.hi ? {
            ...updatedQuestion.languages.hi,
            options: updatedOptions
          } : undefined
        }
      };
    }

    // Persist immediately to parent and storage
    onSaveCroppedDiagram(updatedQuestion, finalCropUrl, cropTarget);
    setSaveSuccessNotice(true);

    // Navigate or close smoothly
    if (andNext && hasNext) {
      setTimeout(() => {
        setSaveSuccessNotice(false);
        goToQuestion(allQuestions[questionIndex + 1]);
      }, 250);
    } else if (!andNext) {
      setTimeout(() => {
        onClose();
      }, 250);
    }
  };

  // Remove existing image for selected target
  const handleRemoveExistingImage = () => {
    if (!question) return;
    let updatedQuestion: MockQuestion = { ...question };

    if (cropTarget === 'question') {
      updatedQuestion = {
        ...updatedQuestion,
        figureUrl: undefined,
        questionImageUrl: undefined,
        figures: [],
        hasFigure: false
      };
    } else {
      const currentOptFigures = { ...(updatedQuestion.optionFigures || {}) };
      delete currentOptFigures[cropTarget];

      const updatedOptions = (updatedQuestion.options || []).map(opt => {
        if (opt.label === cropTarget) {
          const { imageUrl: _, ...rest } = opt;
          return { ...rest, type: 'text' as const };
        }
        return opt;
      });

      updatedQuestion = {
        ...updatedQuestion,
        optionFigures: currentOptFigures,
        options: updatedOptions
      };
    }

    onSaveCroppedDiagram(updatedQuestion, '', cropTarget);
    onClose();
  };

  // Existing image for currently selected crop target
  const currentTargetExistingImage = question ? (
    cropTarget === 'question' 
      ? (question.figureUrl || question.questionImageUrl || question.figures?.[0])
      : (question.optionFigures?.[cropTarget] || question.options?.find(o => o.label === cropTarget)?.imageUrl)
  ) : undefined;

  if (!isOpen || !question) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Crop className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 flex-wrap">
                <span>Phone Gallery Diagram Cropper</span>
                <span className="text-xs bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full font-black">
                  Q{question.questionNumber}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  <Cloud className="w-3 h-3 text-emerald-300" /> Cloudflare R2
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium line-clamp-1 max-w-lg">
                Drag box to reposition • Pull corner/edge handles to resize • Saves directly to Cloudflare
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Question Switcher */}
            {allQuestions.length > 1 && (
              <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-xl border border-white/20 text-xs">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => goToQuestion(allQuestions[questionIndex - 1])}
                  className="p-1 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                  title="Previous Question"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={activeQuestion?.questionNumber}
                  onChange={(e) => {
                    const qNum = Number(e.target.value);
                    const match = allQuestions.find(q => q.questionNumber === qNum);
                    if (match) goToQuestion(match);
                  }}
                  className="bg-transparent text-white font-black text-xs cursor-pointer focus:outline-none max-w-[140px] truncate"
                >
                  {allQuestions.map(q => {
                    const hasCrop = Boolean(q.figureUrl || q.questionImageUrl || (q.figures && q.figures.length > 0));
                    const needsCrop = Boolean(q.needsDiagramCrop || q.hasFigure || /(?:figure|diagram|graph|circuit|shown|चित्र|chitra)/i.test(q.questionText || ''));
                    const statusTag = hasCrop ? '✓ Attached' : needsCrop ? `📷 Crop Needed (p.${q.pdfPageNumber || 1})` : '';
                    return (
                      <option key={q.questionNumber} value={q.questionNumber} className="text-slate-900 font-bold">
                        Q{q.questionNumber} - {q.subject} {statusTag}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => goToQuestion(allQuestions[questionIndex + 1])}
                  className="p-1 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                  title="Next Question"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
          {/* Target Selector: Main Question vs Option A/B/C/D */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 px-1.5">Attach to:</span>
            <button
              type="button"
              onClick={() => setCropTarget('question')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                cropTarget === 'question' 
                  ? 'bg-blue-600 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>🖼️ Main Diagram</span>
            </button>

            {(['A', 'B', 'C', 'D'] as const).map(lbl => {
              const hasImg = Boolean(question.optionFigures?.[lbl] || question.options?.find(o => o.label === lbl)?.imageUrl);
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setCropTarget(lbl)}
                  className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-0.5 ${
                    cropTarget === lbl 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : hasImg 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={hasImg ? `Option (${lbl}) already has image. Click to crop new image.` : `Crop image for Option (${lbl})`}
                >
                  <span>Opt ({lbl})</span>
                  {hasImg && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Page Switcher with Direct Number Input & Quick Jump */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
            <span className="font-bold text-slate-600 mr-1">PDF Page:</span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous PDF Page"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                }
              }}
              className="w-12 text-center font-black text-blue-700 font-mono bg-blue-50/70 border border-blue-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Type page number to jump directly"
            />
            <span className="text-slate-400 font-bold text-xs">/ {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next PDF Page"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
            {question && getQuestionPage(question) !== currentPage && (
              <button
                type="button"
                onClick={() => setCurrentPage(getQuestionPage(question))}
                className="ml-1 text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-black transition cursor-pointer"
                title={`Jump to Question ${question.questionNumber}'s assigned page (${getQuestionPage(question)})`}
              >
                Go to Q{question.questionNumber} Page ({getQuestionPage(question)})
              </button>
            )}
          </div>

          {/* Column Presets & Smart Quick Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 hidden md:inline">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('left_col')}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
              title="Snap crop box to Left Column (Standard NEET English column)"
            >
              <span>📐 Left (English) Col</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('right_col')}
              className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
              title="Snap crop box to Right Column (Hindi translation column)"
            >
              <span>📐 Right (Hindi) Col</span>
            </button>
            <button
              type="button"
              onClick={() => {
                applyPreset('figure_only');
                setTimeout(() => handleAutoTrimWhitespace(), 50);
              }}
              className="px-2 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
              title="Tight crop box focusing only on the graph, circuit, or chemical structure"
            >
              <span>🔬 Figure Only</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('full_width')}
              className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
              title="Full width crop across both columns"
            >
              <span>↔ Full Width</span>
            </button>
            <button
              type="button"
              onClick={focusCropInView}
              className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
              title="Smoothly center the question's crop box in the view"
            >
              <span>🎯 Focus Crop</span>
            </button>
          </div>

          {/* Zoom, Grid & Smart Ink Trim Tools */}
          <div className="flex items-center gap-2">
            {/* Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowGrid(g => !g)}
              className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 font-bold ${
                showGrid 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title="Toggle Rule-of-Thirds Grid"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.2))}
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
                title="Reset Zoom to 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoTrimWhitespace}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition shadow-2xs cursor-pointer"
              title="Automatically detects dark ink inside selection to snap edges around diagram"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Snap Ink</span>
            </button>
          </div>
        </div>

        {/* Main Work Area: Left = PDF Page with Phone Gallery Crop Box, Right = Live Preview & Save */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-slate-900/5">
          {/* Left Canvas Viewport with generous bottom padding so bottom-of-page questions scroll cleanly into center view */}
          <div 
            ref={scrollContainerRef}
            className={`lg:col-span-8 p-3 sm:p-5 pb-36 sm:pb-48 flex flex-col items-center justify-start bg-slate-200/90 min-h-[380px] relative select-none ${isDragging ? 'overflow-hidden' : 'overflow-auto'}`}
            style={{ overscrollBehavior: 'contain', touchAction: isDragging ? 'none' : 'pan-x pan-y' }}
          >
            {isLoadingPage ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-white/95 rounded-3xl shadow-md border border-slate-200 my-auto">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-black text-slate-700">Rendering high-resolution PDF Page {currentPage}...</span>
              </div>
            ) : pageDataUrl ? (
              <div 
                ref={containerRef}
                style={{ 
                  transform: `scale(${zoomLevel})`, 
                  transformOrigin: 'top center',
                  touchAction: 'none'
                }}
                className="relative bg-white shadow-2xl rounded-lg border border-slate-400/80 transition-transform duration-150 cursor-crosshair max-w-full overflow-hidden select-none mb-12"
                onPointerDown={(e) => handlePointerDown(e, 'create')}
                onMouseDown={(e) => handleMouseDown(e, 'create')}
                onTouchStart={(e) => handleTouchStart(e, 'create')}
              >
                {/* PDF Page Image: spacious display without artificial 75vh truncation */}
                <img
                  ref={imageRef}
                  src={pageDataUrl}
                  alt={`PDF Page ${currentPage}`}
                  className="w-full max-w-2xl sm:max-w-3xl block select-none pointer-events-none shadow-sm"
                  draggable={false}
                />

                {/* Outer Dimmed Mask (Phone Gallery Style: highlights the crop area by dimming everything else) */}
                {/* Top mask */}
                <div 
                  className="absolute left-0 top-0 right-0 bg-black/55 pointer-events-none"
                  style={{ height: `${cropBox.y}%` }}
                />
                {/* Bottom mask */}
                <div 
                  className="absolute left-0 right-0 bottom-0 bg-black/55 pointer-events-none"
                  style={{ top: `${cropBox.y + cropBox.height}%` }}
                />
                {/* Left mask */}
                <div 
                  className="absolute left-0 bg-black/55 pointer-events-none"
                  style={{ top: `${cropBox.y}%`, height: `${cropBox.height}%`, width: `${cropBox.x}%` }}
                />
                {/* Right mask */}
                <div 
                  className="absolute right-0 bg-black/55 pointer-events-none"
                  style={{ top: `${cropBox.y}%`, height: `${cropBox.height}%`, left: `${cropBox.x + cropBox.width}%` }}
                />

                {/* Interactive Phone Gallery Crop Window */}
                <div
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                    touchAction: 'none'
                  }}
                  className="absolute border-2 border-white/95 shadow-[0_0_0_1.5px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.35)] cursor-move select-none"
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                  onTouchStart={(e) => handleTouchStart(e, 'move')}
                >
                  {/* Target Label Pill floating above crop box */}
                  <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1 border border-blue-400 pointer-events-none">
                    <Crop className="w-2.5 h-2.5" />
                    <span>
                      {cropTarget === 'question' ? `Q${question.questionNumber} Figure` : `Q${question.questionNumber} Option (${cropTarget})`}
                    </span>
                  </div>

                  {/* Rule of Thirds Grid Lines (Phone Photo Gallery Composition Grid) */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Horizontal grid lines */}
                      <div className="absolute left-0 right-0 top-1/3 border-b border-white/40 border-dashed" />
                      <div className="absolute left-0 right-0 top-2/3 border-b border-white/40 border-dashed" />
                      {/* Vertical grid lines */}
                      <div className="absolute top-0 bottom-0 left-1/3 border-r border-white/40 border-dashed" />
                      <div className="absolute top-0 bottom-0 left-2/3 border-r border-white/40 border-dashed" />
                    </div>
                  )}

                  {/* 4 Corner L-Brackets with Generous 36px Touch Zones */}
                  {/* Top-Left (NW) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'nw')}
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleTouchStart(e, 'nw')}
                    className="absolute -top-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20 group"
                  >
                    <div className="w-5 h-5 border-t-4 border-l-4 border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-125 transition-transform" />
                  </div>
                  {/* Top-Right (NE) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'ne')}
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleTouchStart(e, 'ne')}
                    className="absolute -top-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20 group"
                  >
                    <div className="w-5 h-5 border-t-4 border-r-4 border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-125 transition-transform" />
                  </div>
                  {/* Bottom-Right (SE) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'se')}
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleTouchStart(e, 'se')}
                    className="absolute -bottom-3.5 -right-3.5 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-20 group"
                  >
                    <div className="w-5 h-5 border-b-4 border-r-4 border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-125 transition-transform" />
                  </div>
                  {/* Bottom-Left (SW) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'sw')}
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleTouchStart(e, 'sw')}
                    className="absolute -bottom-3.5 -left-3.5 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-20 group"
                  >
                    <div className="w-5 h-5 border-b-4 border-l-4 border-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-125 transition-transform" />
                  </div>

                  {/* 4 Edge Center Grab Bars */}
                  {/* Top Edge (N) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'n')}
                    onMouseDown={(e) => handleMouseDown(e, 'n')}
                    onTouchStart={(e) => handleTouchStart(e, 'n')}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 flex items-center justify-center cursor-ns-resize z-10"
                  >
                    <div className="w-8 h-2.5 bg-white/95 border border-slate-700 rounded-full shadow-xs hover:scale-110" />
                  </div>
                  {/* Bottom Edge (S) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 's')}
                    onMouseDown={(e) => handleMouseDown(e, 's')}
                    onTouchStart={(e) => handleTouchStart(e, 's')}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-12 h-5 flex items-center justify-center cursor-ns-resize z-10"
                  >
                    <div className="w-8 h-2.5 bg-white/95 border border-slate-700 rounded-full shadow-xs hover:scale-110" />
                  </div>
                  {/* Left Edge (W) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'w')}
                    onMouseDown={(e) => handleMouseDown(e, 'w')}
                    onTouchStart={(e) => handleTouchStart(e, 'w')}
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-12 flex items-center justify-center cursor-ew-resize z-10"
                  >
                    <div className="w-2.5 h-8 bg-white/95 border border-slate-700 rounded-full shadow-xs hover:scale-110" />
                  </div>
                  {/* Right Edge (E) */}
                  <div 
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handlePointerDown(e, 'e')}
                    onMouseDown={(e) => handleMouseDown(e, 'e')}
                    onTouchStart={(e) => handleTouchStart(e, 'e')}
                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-12 flex items-center justify-center cursor-ew-resize z-10"
                  >
                    <div className="w-2.5 h-8 bg-white/95 border border-slate-700 rounded-full shadow-xs hover:scale-110" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 bg-white rounded-3xl text-center max-w-md border border-slate-200 shadow-md">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    PDF Page {currentPage} Ready for Cropping
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    To crop Question #{question.questionNumber}'s diagram directly from the original PDF page, browse and select the NEET question paper PDF:
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full">
                  <label className="flex-1 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>Select Question PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleSelectPdfFile}
                    />
                  </label>
                  <label className="flex-1 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSelectDirectImage}
                    />
                  </label>
                </div>
                {isCustomPdfLoading && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700 font-bold mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering PDF pages...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Live Crop Preview & Question Info (4 cols on lg) */}
          <div className="lg:col-span-4 p-4 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                    {cropTarget === 'question' ? 'Live Diagram Preview' : `Option (${cropTarget}) Crop Preview`}
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-500 font-bold">
                    {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%
                  </span>
                </div>

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
                      <span>Adjust the white crop box on the left</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Already Attached Image Info & Remove Option */}
              {currentTargetExistingImage && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={currentTargetExistingImage} 
                      alt="Current attached" 
                      className="w-10 h-10 object-contain rounded-lg border border-amber-300 bg-white" 
                    />
                    <div>
                      <span className="text-[10.5px] font-bold text-amber-900 block">
                        Already has {cropTarget === 'question' ? 'Diagram' : `Option (${cropTarget}) Image`}
                      </span>
                      <span className="text-[9px] text-amber-700">Saving will replace this with new crop</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveExistingImage}
                    className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                    title="Remove existing image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Question Context Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">
                    Question {question.questionNumber} ({question.subject || 'Biology'})
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                    Page {currentPage}
                  </span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                  {question.questionText || question.english?.questionText || 'Question statement...'}
                </p>

                {/* Target Options Quick Info */}
                {cropTarget !== 'question' && (
                  <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] font-bold text-indigo-900">
                    Target Option ({cropTarget}): {' '}
                    <span className="font-medium text-slate-700">
                      {question.options?.find(o => o.label === cropTarget)?.value || `Option (${cropTarget})`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              {hasNext && (
                <button
                  type="button"
                  onClick={() => handleSaveCrop(true)}
                  disabled={!previewCropUrl}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  title="Saves instantly to test and opens next question"
                >
                  <Cloud className="w-4 h-4 text-emerald-200" />
                  <span>Save Crop &amp; Next Question →</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCrop(false)}
                  disabled={!previewCropUrl}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98 ${
                    saveSuccessNotice 
                      ? 'bg-emerald-600' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{saveSuccessNotice ? '✓ Saved!' : 'Save & Close'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Floating Sticky Bottom Bar (Always visible on phones without needing to scroll!) */}
        <div className="lg:hidden p-2.5 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-700 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {previewCropUrl ? (
                <img src={previewCropUrl} alt="Crop preview" className="w-full h-full object-contain" />
              ) : (
                <Crop className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-amber-300 truncate">
                {cropTarget === 'question' ? `Q${question.questionNumber} Figure` : `Opt (${cropTarget})`}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => applyPreset('left_col')}
                  className="text-[9.5px] bg-white/15 px-1.5 py-0.5 rounded font-bold hover:bg-white/25 cursor-pointer text-slate-200"
                >
                  Left Col
                </button>
                <button
                  type="button"
                  onClick={focusCropInView}
                  className="text-[9.5px] bg-white/15 px-1.5 py-0.5 rounded font-bold hover:bg-white/25 cursor-pointer text-amber-300"
                >
                  🎯 Focus
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasNext && (
              <button
                type="button"
                onClick={() => handleSaveCrop(true)}
                disabled={!previewCropUrl}
                className="px-2.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-black text-xs transition cursor-pointer disabled:opacity-50"
                title="Save & Go to Next Question"
              >
                Next →
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSaveCrop(false)}
              disabled={!previewCropUrl}
              className={`px-3.5 py-2 rounded-xl text-white font-black text-xs shadow-md transition flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50 ${
                saveSuccessNotice ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessNotice ? 'Saved!' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
