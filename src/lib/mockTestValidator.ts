import { MockTest, MockQuestion } from '../types';

export interface TestValidationIssue {
  type: 'error' | 'warning';
  questionNumber?: number;
  message: string;
  field?: string;
}

export interface TestValidationResult {
  isValid: boolean; // True if zero blocking errors
  errors: TestValidationIssue[];
  warnings: TestValidationIssue[];
  totalQuestions: number;
  readyQuestionsCount: number;
  missingQuestionNumbers: number[];
  duplicateQuestionNumbers: number[];
  questionsWithoutOptions: number[];
  questionsWithoutCorrectAnswer: number[];
  visualQuestionsMissingAsset: number[];
  answerKeyStatus: 'ready' | 'pending_review' | 'missing';
}

/**
 * Keywords in question text indicating that a scientific visual/drawing is required
 */
const FIGURE_KEYWORDS = [
  'given figure',
  'in the figure',
  'shown in figure',
  'shown in the figure',
  'given diagram',
  'in the diagram',
  'shown in the diagram',
  'given circuit',
  'in the circuit',
  'circuit diagram',
  'in the graph',
  'given graph',
  'following graph',
  'as shown',
  'reaction sequence',
  'reaction scheme',
  'structure of',
  'which of the following structures',
  'match the column',
  'list-i',
  'column-i'
];

/**
 * Validates a mock test and all its questions before publishing.
 * Enforces Requirement 19 of the NEET CBT mock test constitution.
 */
export function validateMockTestForPublishing(test: MockTest, questions: MockQuestion[]): TestValidationResult {
  const errors: TestValidationIssue[] = [];
  const warnings: TestValidationIssue[] = [];

  // 1. Basic Test Metadata Validation
  if (!test.title || !test.title.trim()) {
    errors.push({ type: 'error', message: 'Test title is required.' });
  }

  if (!test.durationMinutes || test.durationMinutes <= 0) {
    errors.push({ type: 'error', message: 'Test duration must be greater than 0 minutes.' });
  }

  if (questions.length === 0) {
    errors.push({ type: 'error', message: 'Cannot publish a test with 0 questions. Please add questions or upload a PDF.' });
    return {
      isValid: false,
      errors,
      warnings,
      totalQuestions: 0,
      readyQuestionsCount: 0,
      missingQuestionNumbers: [],
      duplicateQuestionNumbers: [],
      questionsWithoutOptions: [],
      questionsWithoutCorrectAnswer: [],
      visualQuestionsMissingAsset: [],
      answerKeyStatus: 'missing'
    };
  }

  // 2. Question Numbering Sequence & Duplicate Checks
  const seenNumbers = new Map<number, number>();
  const questionNumberList: number[] = [];

  questions.forEach(q => {
    const num = q.questionNumber;
    questionNumberList.push(num);
    seenNumbers.set(num, (seenNumbers.get(num) || 0) + 1);
  });

  const duplicateQuestionNumbers: number[] = [];
  seenNumbers.forEach((count, num) => {
    if (count > 1) {
      duplicateQuestionNumbers.push(num);
      errors.push({
        type: 'error',
        questionNumber: num,
        message: `Duplicate question number #${num} detected (${count} times). Every question number must be unique.`
      });
    }
  });

  // Check for gaps in sequence
  const minNum = Math.min(...questionNumberList);
  const maxNum = Math.max(...questionNumberList);
  const missingQuestionNumbers: number[] = [];

  for (let i = 1; i <= Math.max(test.totalQuestions || questions.length, maxNum); i++) {
    if (!seenNumbers.has(i) && i <= maxNum) {
      missingQuestionNumbers.push(i);
    }
  }

  if (missingQuestionNumbers.length > 0 && missingQuestionNumbers.length <= 10) {
    warnings.push({
      type: 'warning',
      message: `Questions missing in sequence: #${missingQuestionNumbers.join(', #')}. Verify if pages were skipped.`
    });
  } else if (missingQuestionNumbers.length > 10) {
    warnings.push({
      type: 'warning',
      message: `${missingQuestionNumbers.length} questions are missing in sequence between Q#1 and Q#${maxNum}.`
    });
  }

  // 3. Question Options, Answers, and Visuals Check
  const questionsWithoutOptions: number[] = [];
  const questionsWithoutCorrectAnswer: number[] = [];
  const visualQuestionsMissingAsset: number[] = [];

  let readyQuestions = 0;

  questions.forEach(q => {
    let questionHasErrors = false;

    // A. Check options
    const options = q.options || q.languages?.en?.options || [];
    if (!Array.isArray(options) || options.length < 2) {
      questionsWithoutOptions.push(q.questionNumber);
      errors.push({
        type: 'error',
        questionNumber: q.questionNumber,
        message: `Question #${q.questionNumber} has insufficient options (${options.length}/4). All 4 options (A, B, C, D) are required.`
      });
      questionHasErrors = true;
    } else if (options.length < 4) {
      warnings.push({
        type: 'warning',
        questionNumber: q.questionNumber,
        message: `Question #${q.questionNumber} only has ${options.length} options. Standard NEET format requires 4 options (A, B, C, D).`
      });
    }

    // B. Check correct answer
    const validAnswers = ['A', 'B', 'C', 'D'];
    if (!q.correctAnswer || !validAnswers.includes(q.correctAnswer.toUpperCase())) {
      questionsWithoutCorrectAnswer.push(q.questionNumber);
      errors.push({
        type: 'error',
        questionNumber: q.questionNumber,
        message: `Question #${q.questionNumber} does not have a valid correct answer assigned (currently "${q.correctAnswer || 'None'}").`
      });
      questionHasErrors = true;
    }

    // C. Check Question Visuals / Diagrams / Graphs / Organic Structures
    const qText = (q.questionText || q.languages?.en?.questionText || '').toLowerCase();
    const hasVisualText = FIGURE_KEYWORDS.some(k => qText.includes(k));
    const hasVisualAsset = Boolean(
      q.figureUrl || 
      q.questionImageUrl || 
      (q.figures && q.figures.length > 0) ||
      (q.optionFigures && (q.optionFigures.A || q.optionFigures.B || q.optionFigures.C || q.optionFigures.D)) ||
      q.matchTable
    );

    if (hasVisualText && !hasVisualAsset) {
      visualQuestionsMissingAsset.push(q.questionNumber);
      warnings.push({
        type: 'warning',
        questionNumber: q.questionNumber,
        message: `Question #${q.questionNumber} references a diagram/circuit/structure in text ("${qText.slice(0, 45)}...") but has no visual asset attached.`
      });
    }

    // D. Check OCR mojibake / corrupted artifacts
    if (qText.includes('âˆ') || qText.includes('Ã—') || qText.includes('|||')) {
      warnings.push({
        type: 'warning',
        questionNumber: q.questionNumber,
        message: `Question #${q.questionNumber} contains raw font artifacts or unformatted table pipes.`
      });
    }

    if (!questionHasErrors) {
      readyQuestions++;
    }
  });

  // 4. Overall Answer Key Status
  let answerKeyStatus: 'ready' | 'pending_review' | 'missing' = 'ready';
  if (questionsWithoutCorrectAnswer.length > 0) {
    answerKeyStatus = questionsWithoutCorrectAnswer.length === questions.length ? 'missing' : 'pending_review';
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalQuestions: questions.length,
    readyQuestionsCount: readyQuestions,
    missingQuestionNumbers,
    duplicateQuestionNumbers,
    questionsWithoutOptions,
    questionsWithoutCorrectAnswer,
    visualQuestionsMissingAsset,
    answerKeyStatus
  };
}
