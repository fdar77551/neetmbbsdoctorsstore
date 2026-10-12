// Continuous Background PDF AI Parsing Service for NEET Medical Tests
// Runs persistently across admin section changes and browser restarts using IndexedDB

import { MockQuestion, MockSubject, MockTest } from '../types';
import { loadPdfDocument, renderPdfPageToCanvas } from './pdfFigureExtractor';
import { 
  idbSavePdfJob, 
  idbGetPdfJob, 
  idbGetAllPdfJobs, 
  idbSavePageImage, 
  idbGetPageImage,
  idbSaveQuestions,
  BackgroundPdfParseJob 
} from './idbStorage';
import { 
  cropDiagramFromCanvas, 
  detectDiagramInkBoundingBoxOnCanvas,
  estimateDiagramBoundingBox,
  cleanQuestionTextForMatchTable,
  repairDevanagariText,
  sendPageToGeminiParser
} from './geminiPdfParser';
import { 
  saveStoredMockQuestions, 
  saveStoredMockTests, 
  getStoredMockTests,
  parseQuestionsFromRawText 
} from './mockTestData';

class BackgroundPdfParserManager {
  private activeJobId: string | null = null;
  private isProcessing: boolean = false;
  private shouldAbort: boolean = false;
  private currentPdfDocProxy: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check on startup if there is an unfinished or recently completed job
      setTimeout(() => {
        this.resumeOrNotifyPendingJobs().catch(() => {});
      }, 1000);
    }
  }

  public async getActiveJob(): Promise<BackgroundPdfParseJob | null> {
    if (this.activeJobId) {
      return await idbGetPdfJob(this.activeJobId);
    }
    const all = await idbGetAllPdfJobs();
    const active = all.find(j => j.status === 'parsing');
    if (active) {
      this.activeJobId = active.jobId;
      return active;
    }
    const lastCompleted = all.sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1))[0];
    return lastCompleted || null;
  }

  public getActiveDocProxy(): any {
    return this.currentPdfDocProxy;
  }

  public async resumeOrNotifyPendingJobs() {
    const all = await idbGetAllPdfJobs();
    const parsingJob = all.find(j => j.status === 'parsing');
    if (parsingJob) {
      window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_progress', { detail: parsingJob }));
    }
    const completedJob = all.find(j => j.status === 'completed');
    if (completedJob) {
      window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_completed', { detail: completedJob }));
    }
  }

  public async startJob(
    file: File,
    options: {
      startPage?: number;
      endPage?: number;
      targetTestTitle?: string;
      targetTestNumber?: string;
      targetDurationMinutes?: number;
      targetPrice?: number;
      targetTestId?: string;
      autoCropDiagrams?: boolean;
    }
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeJobId = jobId;
    this.shouldAbort = false;

    const doc = await loadPdfDocument(file);
    this.currentPdfDocProxy = doc;

    const totalDocPages = doc.numPages;
    const startP = Math.max(1, Math.min(totalDocPages, options.startPage || 1));
    const endP = Math.max(startP, Math.min(totalDocPages, options.endPage || totalDocPages));
    const totalProcessingPages = endP - startP + 1;

    const initialJob: BackgroundPdfParseJob = {
      jobId,
      testId: options.targetTestId,
      pdfName: file.name,
      totalPages: totalProcessingPages,
      currentPage: startP,
      status: 'parsing',
      statusMessage: `Background AI Parser started for "${file.name}" (${totalProcessingPages} pages)...`,
      questionsFound: 0,
      figuresCropped: 0,
      parsedQuestions: [],
      startedAt: new Date().toISOString(),
      targetTestTitle: options.targetTestTitle || `NEET 2026 - ${file.name.replace(/\.pdf$/i, '')}`,
      targetTestNumber: options.targetTestNumber,
      targetDurationMinutes: options.targetDurationMinutes || (totalProcessingPages >= 15 ? 200 : 180),
      targetPrice: options.targetPrice || 0
    };

    await idbSavePdfJob(initialJob);
    window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_progress', { detail: initialJob }));

    // Run the parsing loop asynchronously in the background
    this.runParsingLoop(jobId, doc, startP, endP, options.autoCropDiagrams !== false).catch(err => {
      console.error('Background PDF parsing loop error:', err);
    });

    return jobId;
  }

  public stopActiveJob() {
    this.shouldAbort = true;
    if (this.activeJobId) {
      idbGetPdfJob(this.activeJobId).then(job => {
        if (job) {
          job.status = 'stopped';
          job.statusMessage = 'AI Parsing stopped by admin. Extracted questions preserved.';
          idbSavePdfJob(job);
          window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_progress', { detail: job }));
        }
      });
    }
  }

  private async runParsingLoop(
    jobId: string,
    pdfDoc: any,
    startP: number,
    endP: number,
    autoCropDiagrams: boolean
  ) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const accumulatedQuestions: MockQuestion[] = [];
    let totalFiguresCount = 0;
    const processingCanvas = document.createElement('canvas');

    try {
      for (let p = startP; p <= endP; p++) {
        if (this.shouldAbort) {
          console.log(`[Background Parser] Job ${jobId} stopped by admin.`);
          break;
        }

        // 1. Update status
        const progressMessage = `Rendering high-res Page ${p} of ${endP}...`;
        await this.updateJobStatus(jobId, p, progressMessage, accumulatedQuestions, totalFiguresCount);

        // 2. Render Page Canvas at 2.0x scale
        await renderPdfPageToCanvas(pdfDoc, p, processingCanvas, 2.0);

        // 3. Cache high-res page image to IndexedDB for instant diagram recropping
        const pageDataUrl = processingCanvas.toDataURL('image/jpeg', 0.85);
        await idbSavePageImage(jobId, p, pageDataUrl);

        // 4. Send to Gemini Vision OCR engine
        await this.updateJobStatus(jobId, p, `Scanning Page ${p} with Gemini Vision & OCR...`, accumulatedQuestions, totalFiguresCount);

        let pageQuestions: any[] = [];
        let modelUsed = 'Gemini';

        try {
          const parseResult = await sendPageToGeminiParser(pageDataUrl, p, pdfDoc.numPages);
          pageQuestions = parseResult.questions || [];
          modelUsed = parseResult.modelUsed || 'Gemini Vision';
        } catch (pageErr) {
          console.warn(`[Background Parser] Page ${p} parse note:`, pageErr);
        }

        // Automatic Vector Text Layer Fallback: If Gemini quota was reached or no questions returned,
        // extract directly from the PDF vector text stream so zero questions are lost!
        if (pageQuestions.length === 0 && pdfDoc) {
          try {
            const pageObj = await pdfDoc.getPage(p);
            const textContent = await pageObj.getTextContent();
            let pageRawText = '';
            let lastY: number | null = null;
            for (const item of (textContent.items || []) as any[]) {
              const itemY = item.transform?.[5];
              if (lastY !== null && itemY !== undefined && Math.abs(itemY - lastY) > 5) {
                pageRawText += '\n';
              } else if (item.hasEOL) {
                pageRawText += '\n';
              } else if (pageRawText.length > 0 && !pageRawText.endsWith(' ') && !pageRawText.endsWith('\n')) {
                pageRawText += ' ';
              }
              pageRawText += item.str || '';
              if (itemY !== undefined) lastY = itemY;
            }

            if (pageRawText.trim().length > 40) {
              const defaultSubj: MockSubject = p <= 12 ? 'Physics' : p <= 24 ? 'Chemistry' : 'Biology';
              const textQs = parseQuestionsFromRawText(pageRawText, defaultSubj);
              if (textQs.length > 0) {
                pageQuestions = textQs.map((tq, tIdx) => ({
                  questionNumber: tq.questionNumber || (accumulatedQuestions.length + tIdx + 1),
                  subject: tq.subject,
                  chapter: tq.chapter,
                  english: {
                    questionText: tq.questionText,
                    options: tq.options.map(o => ({ label: o.label, text: o.value }))
                  },
                  hindi: tq.languages?.hi ? {
                    questionText: tq.languages.hi.questionText,
                    options: tq.languages.hi.options?.map(o => ({ label: o.label, text: o.value }))
                  } : undefined,
                  correctAnswer: tq.correctAnswer,
                  hasFigure: false
                }));
                modelUsed = 'High-Precision Vector Text Layer';
              }
            }
          } catch (textExtractErr) {
            console.warn(`[Background Parser] Vector text fallback note for page ${p}:`, textExtractErr);
          }
        }

        // 5. Crop diagrams directly from canvas
        await this.updateJobStatus(jobId, p, `Preserving original diagrams from Page ${p}...`, accumulatedQuestions, totalFiguresCount);

        for (const rawQ of pageQuestions) {
          let figureDataUrl: string | undefined = undefined;
          const qNum = rawQ.questionNumber || (accumulatedQuestions.length + 1);

          if (autoCropDiagrams) {
            // A. Precise bounding box
            const resolvedBbox = rawQ.figureBoundingBox || (rawQ as any).boundingBox || (rawQ as any).bbox;
            if (resolvedBbox && Array.isArray(resolvedBbox) && resolvedBbox.length === 4) {
              const cropped = cropDiagramFromCanvas(processingCanvas, resolvedBbox as any);
              if (cropped) {
                figureDataUrl = cropped;
                totalFiguresCount++;
              }
            }

            // B. Ink scanning fallback
            if (!figureDataUrl) {
              const textToCheck = `${rawQ.english?.questionText || ''} ${rawQ.hindi?.questionText || ''}`.toLowerCase();
              const hasVisualRef = [
                'figure', 'diagram', 'circuit', 'graph', 'scheme', 'reaction',
                'benzene', 'structure', 'loop', 'curve', 'shown in', 'as shown', 'chitra', 'चित्र'
              ].some(kw => textToCheck.includes(kw));

              if (hasVisualRef) {
                const qIndex = pageQuestions.indexOf(rawQ);
                const safeTotal = Math.max(1, pageQuestions.length);
                const slotHeight = 900 / safeTotal;
                const searchYmin = Math.max(40, Math.round(50 + qIndex * slotHeight));
                const searchYmax = Math.min(970, Math.round(50 + (qIndex + 1) * slotHeight));

                const detectedInkBox = detectDiagramInkBoundingBoxOnCanvas(
                  processingCanvas,
                  searchYmin,
                  searchYmax,
                  30,
                  970
                );

                if (detectedInkBox) {
                  const detectedCrop = cropDiagramFromCanvas(processingCanvas, detectedInkBox);
                  if (detectedCrop) {
                    figureDataUrl = detectedCrop;
                    totalFiguresCount++;
                  }
                }
              }
            }
          }

          // Build clean question
          const defaultSubject: MockSubject = p <= 10 ? 'Physics' : p <= 20 ? 'Chemistry' : 'Biology';
          const resolvedSubject: MockSubject = (rawQ.subject as MockSubject) || defaultSubject;

          const cleanedOptions = (['A', 'B', 'C', 'D'] as const).map(label => {
            const rawOpt = rawQ.english?.options?.find((o: any) => o.label?.toUpperCase() === label);
            return {
              label,
              type: 'text' as const,
              value: rawOpt?.text || `Option ${label}`
            };
          });

          const formattedQ: MockQuestion = {
            id: `q_${jobId}_${qNum}`,
            testId: '',
            questionNumber: qNum,
            subject: resolvedSubject,
            chapter: rawQ.chapter || `${resolvedSubject} Chapter`,
            questionText: rawQ.english?.questionText || '',
            options: cleanedOptions,
            figures: figureDataUrl ? [figureDataUrl] : [],
            figureUrl: figureDataUrl,
            questionImageUrl: figureDataUrl,
            pdfPageNumber: p,
            figureCropInfo: rawQ.figureBoundingBox ? {
              pageNumber: p,
              box: rawQ.figureBoundingBox
            } : undefined,
            correctAnswer: (rawQ.correctAnswer as any) || 'A',
            marks: 4,
            negativeMarks: 1,
            needsReview: false
          };

          const existIdx = accumulatedQuestions.findIndex(q => q.questionNumber === qNum);
          if (existIdx > -1) {
            accumulatedQuestions[existIdx] = formattedQ;
          } else {
            accumulatedQuestions.push(formattedQ);
          }
        }

        accumulatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

        // Update progress in IndexedDB and notify UI
        await this.updateJobStatus(
          jobId,
          p,
          `Page ${p} complete (${accumulatedQuestions.length} questions, ${totalFiguresCount} diagrams)...`,
          accumulatedQuestions,
          totalFiguresCount
        );

        // Pacing delay
        if (p < endP) {
          await new Promise(r => setTimeout(r, 1800));
        }
      }

      // Mark Job Completed
      const completedJob = await idbGetPdfJob(jobId);
      if (completedJob) {
        completedJob.status = 'completed';
        completedJob.completedAt = new Date().toISOString();
        completedJob.questionsFound = accumulatedQuestions.length;
        completedJob.figuresCropped = totalFiguresCount;
        completedJob.parsedQuestions = accumulatedQuestions;
        completedJob.statusMessage = `✓ Finished parsing ${accumulatedQuestions.length} questions with ${totalFiguresCount} original diagrams! Ready to review and save.`;
        await idbSavePdfJob(completedJob);
        window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_completed', { detail: completedJob }));
      }
    } catch (loopErr: any) {
      console.error('[Background Parser] Error in processing loop:', loopErr);
      const failedJob = await idbGetPdfJob(jobId);
      if (failedJob) {
        failedJob.status = accumulatedQuestions.length > 0 ? 'completed' : 'error';
        failedJob.parsedQuestions = accumulatedQuestions;
        failedJob.statusMessage = loopErr.message || 'Error occurred during parsing';
        await idbSavePdfJob(failedJob);
        window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_completed', { detail: failedJob }));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async updateJobStatus(
    jobId: string,
    page: number,
    statusMessage: string,
    questions: MockQuestion[],
    figuresCropped: number
  ) {
    const job = await idbGetPdfJob(jobId);
    if (!job) return;
    job.currentPage = page;
    job.statusMessage = statusMessage;
    job.questionsFound = questions.length;
    job.figuresCropped = figuresCropped;
    job.parsedQuestions = questions;
    await idbSavePdfJob(job);
    window.dispatchEvent(new CustomEvent('neetmbbs_pdf_job_progress', { detail: job }));
  }
}

export const backgroundPdfParserService = new BackgroundPdfParserManager();
