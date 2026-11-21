// NCERTify AI Parser 2.0 / 3.0 - Automated Validation & Reconciliation Engine
// Audits extracted questions across 6 quality dimensions without inflating scores

import {
  Parser2Question,
  Parser2ValidationReport,
  Parser2ValidationCheck,
  Parser2ReconciliationSummary,
  Parser2QualityBreakdown,
  isPlaceholderOption
} from './types';
import {
  detectVisualRequirement,
  isQuestionTextTruncated,
  isMatchQuestionPrompt,
  isTableQuestionPrompt
} from './layoutEngine';
import { hasSuspiciousMathNotation } from '../../lib/mockTestData';

export class ValidationEngine {

  /**
   * Run comprehensive audit with reconciliation and 6-dimension quality breakdown
   */
  public auditQuestions(
    jobId: string,
    questions: Parser2Question[],
    expectedTotalQuestions: number | null = null,
    options?: {
      savedQuestions?: number;
      figuresExtracted?: number;
      expectedSource?: 'auto_detected' | 'manual';
      rejectedQuestions?: number;
    }
  ): Parser2ValidationReport {
    const checks: Parser2ValidationCheck[] = [];
    let criticalErrorsCount = 0;
    let warningsCount = 0;

    const expectedSource: 'auto_detected' | 'manual' =
      options?.expectedSource || (typeof expectedTotalQuestions === 'number' && expectedTotalQuestions > 0 ? 'manual' : 'auto_detected');
    const savedCount = options?.savedQuestions ?? questions.length;
    const rejectedCount = options?.rejectedQuestions ?? 0;
    const totalFiguresCount =
      options?.figuresExtracted ??
      questions.reduce((acc, q) => acc + (q.figures?.length || (q.figureUrl ? 1 : 0)), 0);

    // 0. Zero-Question Extraction Gate (never report false passed checks, fake 180 expected, or misleading 0% quality score)
    if (questions.length === 0) {
      const manualExpected =
        expectedSource === 'manual' && typeof expectedTotalQuestions === 'number' && expectedTotalQuestions > 0
          ? expectedTotalQuestions
          : null;

      const zeroChecks: Parser2ValidationCheck[] = [
        {
          id: 'chk-zero-questions',
          code: 'ZERO_QUESTIONS',
          title: 'Zero Questions Extracted',
          severity: 'critical',
          passed: false,
          message:
            manualExpected !== null
              ? `0 questions were extracted or saved out of ${manualExpected} expected questions. Extraction failed — retry failed pages or inspect API logs.`
              : `0 questions were extracted or saved across processed pages. Extraction failed — retry failed pages or inspect OCR/API logs.`
        },
        {
          id: 'chk-sequence',
          code: 'SEQ_GAPS',
          title: 'Missing Question Numbers',
          severity: 'critical',
          passed: false,
          message:
            manualExpected !== null
              ? `All ${manualExpected} expected questions are missing from the database.`
              : `No question numbers were detected in the extracted output.`
        }
      ];

      const zeroBreakdown: Parser2QualityBreakdown = {
        textExtraction: null,
        options: null,
        figures: null,
        chemistry: null,
        mathematics: null,
        answerKey: null
      };

      const zeroReconciliation: Parser2ReconciliationSummary = {
        expectedQuestions: manualExpected,
        expectedQuestionsSource: expectedSource,
        detectedQuestionNumbers: [],
        extractedQuestions: 0,
        validatedQuestions: 0,
        savedQuestions: savedCount,
        validQuestions: 0,
        rejectedQuestions: rejectedCount,
        reviewRequiredCount: 0,
        duplicateCount: 0,
        missingQuestions: manualExpected,
        missingQuestionNumbers: [],
        missingAnswerCount: 0,
        figuresExtracted: totalFiguresCount,
        answerKeyCoverage: null
      };

      return {
        id: `rep-${jobId}-${Date.now()}`,
        jobId,
        qualityScore: null,
        totalChecks: zeroChecks.length,
        passedChecks: 0,
        criticalErrorsCount: zeroChecks.length,
        warningsCount: 0,
        canPublish: false,
        checks: zeroChecks,
        reconciliation: zeroReconciliation,
        qualityBreakdown: zeroBreakdown,
        summary: `❌ Extraction Failed: 0 questions extracted/saved${manualExpected !== null ? ` (expected ${manualExpected})` : ''}. Retry failed pages before publishing.`,
        createdAt: new Date().toISOString()
      };
    }

    // 1. Missing Questions & Sequence Check (auto-detected max question number unless manual range was configured)
    const detectedNumbers = Array.from(new Set(questions.map(q => q.questionNumber).filter(n => n > 0))).sort((a, b) => a - b);
    const maxDetectedQNum = detectedNumbers.length > 0 ? detectedNumbers[detectedNumbers.length - 1] : questions.length;
    const minDetectedQNum = detectedNumbers.length > 0 ? detectedNumbers[0] : 1;
    const autoExpected =
      minDetectedQNum <= 2 && maxDetectedQNum <= Math.max(questions.length * 2 + 20, 220)
        ? Math.max(maxDetectedQNum, questions.length)
        : questions.length;
    const expectedCount =
      expectedSource === 'manual' && typeof expectedTotalQuestions === 'number' && expectedTotalQuestions > 0
        ? Math.max(expectedTotalQuestions, questions.length)
        : autoExpected;

    const existingQNums = new Set(detectedNumbers);
    const missingNums: number[] = [];
    const startSeq = expectedSource === 'manual' ? 1 : (minDetectedQNum <= 2 ? 1 : minDetectedQNum);
    const endSeq = expectedSource === 'manual' ? expectedCount : Math.max(maxDetectedQNum, startSeq + expectedCount - 1);
    if (endSeq - startSeq <= 300) {
      for (let i = startSeq; i <= endSeq; i++) {
        if (!existingQNums.has(i)) {
          missingNums.push(i);
        }
      }
    }

    if (missingNums.length === 0) {
      checks.push({
        id: 'chk-sequence',
        code: 'SEQ_OK',
        title: 'Complete Question Sequence',
        severity: 'critical',
        passed: true,
        message: `All ${expectedCount} questions present in contiguous sequence.`
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-sequence',
        code: 'SEQ_GAPS',
        title: 'Missing Question Numbers',
        severity: 'critical',
        passed: false,
        message: `Found ${missingNums.length} missing questions out of ${expectedCount} expected.`,
        affectedQuestionNumbers: missingNums.slice(0, 20),
        details: `Missing: ${missingNums.slice(0, 15).join(', ')}${missingNums.length > 15 ? '...' : ''}`
      });
    }

    // 2. Duplicate Question Numbers
    const qCountMap: Record<number, number> = {};
    questions.forEach(q => {
      qCountMap[q.questionNumber] = (qCountMap[q.questionNumber] || 0) + 1;
    });
    const dupes = Object.keys(qCountMap).filter(num => qCountMap[parseInt(num, 10)] > 1).map(Number);
    if (dupes.length === 0) {
      checks.push({
        id: 'chk-duplicates',
        code: 'DUP_NONE',
        title: 'Zero Duplicate Questions',
        severity: 'critical',
        passed: true,
        message: 'No duplicate question numbers detected.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-duplicates',
        code: 'DUP_FOUND',
        title: 'Duplicate Question Numbers Found',
        severity: 'critical',
        passed: false,
        message: `Found ${dupes.length} duplicate question numbers.`,
        affectedQuestionNumbers: dupes
      });
    }

    // 2b. Question Statement Completeness
    const truncatedStemQs: number[] = [];
    questions.forEach(q => {
      if (q.adminOverride && q.verificationStatus === 'verified') return;
      if (q.verificationStatus === 'text_incomplete' || isQuestionTextTruncated(q.questionText)) {
        truncatedStemQs.push(q.questionNumber);
      }
    });

    if (truncatedStemQs.length === 0) {
      checks.push({
        id: 'chk-text-complete',
        code: 'TEXT_COMPLETE',
        title: 'Complete Question Statements',
        severity: 'warning',
        passed: true,
        message: 'All extracted question statements begin cleanly and are non-truncated.'
      });
    } else {
      warningsCount++;
      checks.push({
        id: 'chk-text-complete',
        code: 'TEXT_INCOMPLETE',
        title: 'Incomplete / Truncated Stems Detected',
        severity: 'warning',
        passed: false,
        message: `${truncatedStemQs.length} question(s) appear truncated or start mid-sentence.`,
        affectedQuestionNumbers: truncatedStemQs
      });
    }

    // 3. Option Completeness (A, B, C, D)
    const missingOptQs: number[] = [];
    questions.forEach(q => {
      const labels = (q.options || []).map(o => o.label);
      if (!labels.includes('A') || !labels.includes('B') || !labels.includes('C') || !labels.includes('D')) {
        missingOptQs.push(q.questionNumber);
      }
    });

    if (missingOptQs.length === 0) {
      checks.push({
        id: 'chk-options-complete',
        code: 'OPTS_ALL_4',
        title: 'Four Options per Question',
        severity: 'critical',
        passed: true,
        message: 'Every question contains complete A, B, C, and D options.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-options-complete',
        code: 'OPTS_INCOMPLETE',
        title: 'Incomplete Options Detected',
        severity: 'critical',
        passed: false,
        message: `${missingOptQs.length} questions do not have all 4 options (A, B, C, D).`,
        affectedQuestionNumbers: missingOptQs
      });
    }

    // 3b. Real Option Content
    const placeholderOptQs: number[] = [];
    questions.forEach(q => {
      const hasPlaceholder = (q.options || []).some(o => {
        const hasOptionImage = Boolean(o.imageUrl || q.optionFigures?.[o.label]);
        if (hasOptionImage) return false;
        return isPlaceholderOption(o.value) || /^\[Figure\s+[A-D]\]$/i.test((o.value || '').trim());
      });
      if (hasPlaceholder || q.verificationStatus === 'options_incomplete') {
        placeholderOptQs.push(q.questionNumber);
      }
    });

    if (placeholderOptQs.length === 0) {
      checks.push({
        id: 'chk-options-real',
        code: 'OPTS_AUTHENTIC',
        title: 'Real Option Content Extracted',
        severity: 'critical',
        passed: true,
        message: 'All questions contain authentic text or original visual options from PDF.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-options-real',
        code: 'OPTS_PLACEHOLDER',
        title: 'Missing / Placeholder Options Detected',
        severity: 'critical',
        passed: false,
        message: `${placeholderOptQs.length} question(s) have empty or missing options. Re-extract or edit before publishing.`,
        affectedQuestionNumbers: Array.from(new Set(placeholderOptQs))
      });
    }

    // 3c. Option Duplicating Question Stem Check
    const stemDuplicatingQs: number[] = [];
    questions.forEach(q => {
      if (q.questionText && q.questionText.trim().length >= 15) {
        const stemPrefix = q.questionText.trim().toLowerCase().slice(0, 25);
        const hasDupe = (q.options || []).some(o =>
          o.value && o.value.trim().length >= 10 && o.value.toLowerCase().includes(stemPrefix)
        );
        if (hasDupe) {
          stemDuplicatingQs.push(q.questionNumber);
        }
      }
    });

    if (stemDuplicatingQs.length === 0) {
      checks.push({
        id: 'chk-options-no-stem-collision',
        code: 'OPTS_DISTINCT_FROM_STEM',
        title: 'Option Stem Independence',
        severity: 'critical',
        passed: true,
        message: 'All options are distinct from their question statements (no stem bleeding).'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-options-no-stem-collision',
        code: 'OPTS_DUPLICATE_STEM',
        title: 'Options Colliding with Question Stem',
        severity: 'critical',
        passed: false,
        message: `${stemDuplicatingQs.length} question(s) have options duplicating the question prompt. Must be corrected.`,
        affectedQuestionNumbers: stemDuplicatingQs
      });
    }

    // 4. Statement Combination Protection
    const brokenStatementQs: number[] = [];
    questions.forEach(q => {
      q.options.forEach(opt => {
        if (/^and\s+\(?[A-Ea-e]\)?\s*only/i.test((opt.value || '').trim()) || /^only$/i.test((opt.value || '').trim())) {
          brokenStatementQs.push(q.questionNumber);
        }
      });
    });

    if (brokenStatementQs.length === 0) {
      checks.push({
        id: 'chk-statement-combo',
        code: 'COMBO_INTACT',
        title: 'Statement Options Intact',
        severity: 'critical',
        passed: true,
        message: 'No truncated statement combinations detected.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-statement-combo',
        code: 'COMBO_BROKEN',
        title: 'Truncated Statement Combinations',
        severity: 'critical',
        passed: false,
        message: `${brokenStatementQs.length} questions have broken leading option statement prefixes.`,
        affectedQuestionNumbers: Array.from(new Set(brokenStatementQs))
      });
    }

    // 5. Scientific Figure & Visual Attachment Verification
    const missingFigureQs: number[] = [];
    const mismatchFigureQs: number[] = [];
    let expectedFigureCount = 0;
    let presentFigureCount = 0;

    questions.forEach(q => {
      if (q.verificationStatus === 'figure_mismatch') {
        mismatchFigureQs.push(q.questionNumber);
      }
      const optionsStr = (q.options || []).map(o => o.value || o.text || '').join(' ');
      const visualReq = detectVisualRequirement(q.questionText, optionsStr, q.reviewNotes);
      const hasFigure = Boolean(q.figureUrl || (q.figures && q.figures.length > 0));
      const allOptionsHaveImages = (q.options || []).length >= 4 && (q.options || []).every(o => Boolean(o.imageUrl || q.optionFigures?.[o.label]));

      if (visualReq.needsFigure || hasFigure || q.verificationStatus === 'missing_figure') {
        expectedFigureCount++;
        if (hasFigure || (visualReq.expectsVisualOptions && allOptionsHaveImages)) {
          presentFigureCount++;
        }
      }

      if ((visualReq.needsFigure || q.verificationStatus === 'missing_figure') && !hasFigure && !(visualReq.expectsVisualOptions && allOptionsHaveImages)) {
        missingFigureQs.push(q.questionNumber);
      }
    });

    if (missingFigureQs.length === 0) {
      checks.push({
        id: 'chk-figures',
        code: 'FIG_VERIFIED',
        title: 'Diagram & Graph Attachment',
        severity: 'critical',
        passed: true,
        message: 'All questions referencing diagrams or graphs have verified attached figures.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-figures',
        code: 'FIG_MISSING',
        title: 'Missing Scientific Diagrams / Graphs',
        severity: 'critical',
        passed: false,
        message: `${missingFigureQs.length} question(s) reference a diagram or graph without an attached figure asset.`,
        affectedQuestionNumbers: missingFigureQs
      });
    }

    if (mismatchFigureQs.length > 0) {
      warningsCount++;
      checks.push({
        id: 'chk-figure-mismatch',
        code: 'FIG_MISMATCH',
        title: 'Potential Figure Mismatch',
        severity: 'warning',
        passed: false,
        message: `${mismatchFigureQs.length} question(s) had suspect figure crops requiring admin inspection.`,
        affectedQuestionNumbers: mismatchFigureQs
      });
    }

    // 6. Answer Key Concordance Check
    const missingAnswerQs: number[] = [];
    questions.forEach(q => {
      const hasValidAns = Boolean(q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer));
      if (!hasValidAns || q.answerStatus === 'answer_missing') {
        missingAnswerQs.push(q.questionNumber);
      }
    });

    if (missingAnswerQs.length === 0 && questions.length > 0) {
      checks.push({
        id: 'chk-answer-key',
        code: 'ANS_ALL_SET',
        title: 'Answer Key Concordance',
        severity: 'warning',
        passed: true,
        message: '100% of questions have verified or assigned answer keys.'
      });
    } else {
      warningsCount++;
      checks.push({
        id: 'chk-answer-key',
        code: 'ANS_MISSING',
        title: 'Missing Answer Keys',
        severity: 'warning',
        passed: false,
        message: `${missingAnswerQs.length} question(s) are marked answer_missing. Import an answer key or edit manually.`,
        affectedQuestionNumbers: missingAnswerQs
      });
    }

    // 7. Math & Formula Precision Check
    const mathCorruptQs: number[] = [];
    questions.forEach(q => {
      if (q.adminOverride && q.verificationStatus === 'verified') return;
      const hasEmptyDecimal = q.options.some(o => /^0\.\s*$/i.test((o.value || '').trim()));
      const hasGarbledPoVo = q.options.some(o => /PO\s*VO\s*POVO/i.test(o.value || ''));
      const stemMath = hasSuspiciousMathNotation(q.questionText || '');
      const optMath = (q.options || []).some(o => hasSuspiciousMathNotation(o.value || '').suspect);
      if (
        q.verificationStatus === 'symbol_review' ||
        hasEmptyDecimal ||
        hasGarbledPoVo ||
        stemMath.suspect ||
        optMath
      ) {
        mathCorruptQs.push(q.questionNumber);
      }
    });

    if (mathCorruptQs.length === 0) {
      checks.push({
        id: 'chk-math-precision',
        code: 'MATH_OK',
        title: 'Mathematical Notation Precision',
        severity: 'critical',
        passed: true,
        message: 'No decimal truncations, raw LaTeX delimiters, or garbled symbols detected.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-math-precision',
        code: 'MATH_CORRUPT',
        title: 'Symbol / Equation Review Required',
        severity: 'critical',
        passed: false,
        message: `${mathCorruptQs.length} question(s) contain broken decimals, unresolved LaTeX delimiters ($/\\frac/\\hat), or raw vector tags.`,
        affectedQuestionNumbers: mathCorruptQs
      });
    }

    // 8. Chemistry Organic Structure Integrity
    const chemQuestions = questions.filter(q => q.subject === 'Chemistry' || q.chemistryContentType === 'complex_structures');
    const missingChemStructures: number[] = [];
    chemQuestions.forEach(q => {
      if (q.chemistryContentType === 'complex_structures') {
        const hasPrimary = Boolean(q.figureUrl);
        const hasAllOptImgs = q.options?.every(o => Boolean(o.imageUrl || q.optionFigures?.[o.label]));
        if (!hasPrimary && !hasAllOptImgs) {
          missingChemStructures.push(q.questionNumber);
        }
      }
    });

    if (missingChemStructures.length === 0) {
      checks.push({
        id: 'chk-chem-structures',
        code: 'CHEM_OK',
        title: 'Organic Chemistry Structures',
        severity: 'warning',
        passed: true,
        message: 'Complex chemical ring structures preserved as images; linear formulas stored as clean text.'
      });
    } else {
      warningsCount++;
      checks.push({
        id: 'chk-chem-structures',
        code: 'CHEM_MISSING_IMG',
        title: 'Complex Chemical Structures Need Crop',
        severity: 'warning',
        passed: false,
        message: `${missingChemStructures.length} Chemistry questions with ring/bond structures need image verification.`,
        affectedQuestionNumbers: missingChemStructures
      });
    }

    // 9. Match the Column & Data Table Structured Format
    const matchQuestions = questions.filter(
      q => q.questionType === 'match_the_column' || isMatchQuestionPrompt(q.questionText)
    );
    const brokenMatches: number[] = [];
    matchQuestions.forEach(q => {
      if (!q.matchTable || !q.matchTable.rows || q.matchTable.rows.length < 2) {
        if (!q.figureUrl) {
          brokenMatches.push(q.questionNumber);
        }
      }
    });

    const tableQuestions = questions.filter(
      q => q.questionType === 'table_based' || isTableQuestionPrompt(q.questionText)
    );
    const brokenTables: number[] = [];
    tableQuestions.forEach(q => {
      const hasStruct = Boolean(q.structuredTable && q.structuredTable.rows && q.structuredTable.rows.length > 0);
      const hasMatch = Boolean(q.matchTable && q.matchTable.rows && q.matchTable.rows.length > 0);
      if (!hasStruct && !hasMatch && !q.figureUrl) {
        brokenTables.push(q.questionNumber);
      }
    });

    const allBrokenTables = Array.from(new Set([...brokenMatches, ...brokenTables]));

    if (allBrokenTables.length === 0) {
      checks.push({
        id: 'chk-match-tables',
        code: 'MATCH_OK',
        title: 'Match Lists & Data Tables',
        severity: 'critical',
        passed: true,
        message: 'All match-the-column and table-based questions include complete List I / List II or structured tables.'
      });
    } else {
      criticalErrorsCount++;
      checks.push({
        id: 'chk-match-tables',
        code: 'MATCH_TABLE_MISSING',
        title: 'Missing Match Lists / Data Tables',
        severity: 'critical',
        passed: false,
        message: `${allBrokenTables.length} match/table question(s) are missing List I / List II or table rows. Recover from source page before publishing.`,
        affectedQuestionNumbers: allBrokenTables
      });
    }

    // 10. Manual Review Required Count
    const reviewRequiredQs = questions
      .filter(q => !q.adminOverride && (q.reviewRequired || (q.verificationStatus !== 'verified' && !q.isManuallyEdited)))
      .map(q => q.questionNumber);

    if (reviewRequiredQs.length === 0) {
      checks.push({
        id: 'chk-review-flags',
        code: 'REVIEW_CLEAR',
        title: 'AI Confidence & Review Status',
        severity: 'info',
        passed: true,
        message: 'Zero questions flagged for manual human inspection.'
      });
    } else {
      warningsCount++;
      checks.push({
        id: 'chk-review-flags',
        code: 'REVIEW_FLAGGED',
        title: 'Questions Flagged for Review',
        severity: 'info',
        passed: false,
        message: `${reviewRequiredQs.length} questions require admin review before publishing.`,
        affectedQuestionNumbers: reviewRequiredQs
      });
    }

    // Compute 6-Dimension Quality Breakdown honestly (0..100 or null = N/A when insufficient data exists)
    const total = Math.max(questions.length, 1);
    const badTextCount = new Set([...truncatedStemQs, ...allBrokenTables]).size;
    const badOptionCount = new Set([...missingOptQs, ...placeholderOptQs, ...stemDuplicatingQs, ...brokenStatementQs]).size;

    const textExtraction: number | null = Math.max(0, Math.round(((total - badTextCount) / total) * 100));
    const optionsScore: number | null = Math.max(0, Math.round(((total - badOptionCount) / total) * 100));
    const figuresScore: number | null = expectedFigureCount === 0
      ? null
      : Math.min(100, Math.max(0, Math.round(((presentFigureCount - mismatchFigureQs.length * 0.5) / expectedFigureCount) * 100)));
    const chemTotal = Math.max(chemQuestions.length, 1);
    const chemistryScore: number | null = chemQuestions.length === 0
      ? null
      : Math.max(0, Math.round(((chemTotal - missingChemStructures.length) / chemTotal) * 100));
    const mathScore: number | null = Math.max(0, Math.round(((total - mathCorruptQs.length) / total) * 100));
    const answerKeyScore: number | null = Math.max(0, Math.round(((total - missingAnswerQs.length) / total) * 100));

    const qualityBreakdown: Parser2QualityBreakdown = {
      textExtraction,
      options: optionsScore,
      figures: figuresScore,
      chemistry: chemistryScore,
      mathematics: mathScore,
      answerKey: answerKeyScore
    };

    // Weighted overall score normalized strictly across non-null dimensions (never inflated by N/A dimensions)
    const weightedDimensions: Array<[number | null, number]> = [
      [qualityBreakdown.textExtraction, 0.22],
      [qualityBreakdown.options, 0.28],
      [qualityBreakdown.figures, 0.18],
      [qualityBreakdown.chemistry, 0.10],
      [qualityBreakdown.mathematics, 0.10],
      [qualityBreakdown.answerKey, 0.12]
    ];
    const activeWeightSum = weightedDimensions.reduce((sum, [val, w]) => (val === null ? sum : sum + w), 0);
    const weightedQuality =
      activeWeightSum > 0
        ? Math.round(
            weightedDimensions.reduce((sum, [val, w]) => (val === null ? sum : sum + val * w), 0) / activeWeightSum
          )
        : 0;

    const passedCount = checks.filter(c => c.passed).length;
    const penalty = criticalErrorsCount * 8;
    const qualityScore = Math.max(0, Math.min(100, weightedQuality - Math.min(35, penalty)));
    const canPublish = questions.length > 0 && savedCount > 0 && criticalErrorsCount === 0;

    // Extraction Reconciliation Summary
    const validQuestions = questions.filter(q =>
      q.verificationStatus === 'verified' && !q.reviewRequired
    ).length;

    const targetExpected =
      expectedSource === 'manual' && typeof expectedTotalQuestions === 'number' && expectedTotalQuestions > 0
        ? expectedTotalQuestions
        : expectedCount;
    const reconciliation: Parser2ReconciliationSummary = {
      expectedQuestions: targetExpected,
      expectedQuestionsSource: expectedSource,
      detectedQuestionNumbers: detectedNumbers,
      extractedQuestions: questions.length,
      validatedQuestions: validQuestions,
      savedQuestions: savedCount,
      validQuestions,
      rejectedQuestions: rejectedCount,
      reviewRequiredCount: reviewRequiredQs.length,
      duplicateCount: dupes.length,
      missingQuestions: missingNums.length > 0 ? missingNums.length : Math.max(0, targetExpected - existingQNums.size),
      missingQuestionNumbers: missingNums.slice(0, 50),
      missingAnswerCount: missingAnswerQs.length,
      figuresExtracted: totalFiguresCount,
      answerKeyCoverage: answerKeyScore
    };

    const report: Parser2ValidationReport = {
      id: `rep-${jobId}-${Date.now()}`,
      jobId,
      qualityScore,
      totalChecks: checks.length,
      passedChecks: passedCount,
      criticalErrorsCount,
      warningsCount,
      canPublish,
      checks,
      reconciliation,
      qualityBreakdown,
      summary: canPublish
        ? `✅ Quality Score ${qualityScore}% (${reconciliation.validQuestions}/${reconciliation.savedQuestions} valid & saved). Ready to assign & publish.`
        : `⚠️ Quality Score ${qualityScore}%. ${criticalErrorsCount} critical issue(s) across ${reconciliation.extractedQuestions} extracted (${reconciliation.savedQuestions} saved) questions. Resolve before publishing.`,
      createdAt: new Date().toISOString()
    };

    return report;
  }
}

export const validationEngine = new ValidationEngine();
