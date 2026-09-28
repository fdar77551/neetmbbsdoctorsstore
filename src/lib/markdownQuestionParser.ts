import { MockQuestion, MockQuestionOption, MockSubject, MockQuestionLanguageContent } from '../types';
import { isHindiText } from './pdfBilingualParser';

export interface MarkdownParseResult {
  questions: MockQuestion[];
  stats: {
    totalQuestions: number;
    bilingualCount: number;
    figuresCount: number;
    optionFiguresCount: number;
  };
  warnings: string[];
}

/**
 * Parses Markdown (.md) text into structured MockQuestion[]
 */
export function parseMarkdownQuestions(markdownText: string, testId: string): MarkdownParseResult {
  const warnings: string[] = [];
  const questions: MockQuestion[] = [];

  // Split markdown by Question headers: e.g. "## Question 1", "# Q1", "### Question 59", "## 59."
  const questionHeaderRegex = /(?:^|\n)#{1,4}\s*(?:Question|Q\.?|प्रश्न)?\s*(\d{1,3})[:.\s]/i;
  
  // Find all question starts
  const lines = markdownText.split('\n');
  const sectionIndices: Array<{ lineIdx: number; qNum: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(questionHeaderRegex);
    if (match && match[1]) {
      sectionIndices.push({
        lineIdx: i,
        qNum: parseInt(match[1], 10)
      });
    }
  }

  // If no ## Question headers found, try fallback split by "---" or "Q1."
  if (sectionIndices.length === 0) {
    const fallbackRegex = /(?:^|\n)(?:Q\.?\s*(\d{1,3})|(\d{1,3})\.)\s+/i;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(fallbackRegex);
      if (match) {
        const qNum = parseInt(match[1] || match[2], 10);
        if (qNum >= 1 && qNum <= 200) {
          sectionIndices.push({ lineIdx: i, qNum });
        }
      }
    }
  }

  let figuresCount = 0;
  let optionFiguresCount = 0;
  let bilingualCount = 0;

  for (let s = 0; s < sectionIndices.length; s++) {
    const cur = sectionIndices[s];
    const next = sectionIndices[s + 1];
    const chunkLines = next ? lines.slice(cur.lineIdx, next.lineIdx) : lines.slice(cur.lineIdx);
    const chunkText = chunkLines.join('\n');

    const qNum = cur.qNum;

    // Detect subject from line if specified: e.g. "Subject: Chemistry"
    let subject: MockSubject = 'Biology';
    const subjMatch = chunkText.match(/Subject\s*:\s*(Physics|Chemistry|Biology)/i);
    if (subjMatch) {
      subject = subjMatch[1] as MockSubject;
    } else if (qNum <= 50) {
      subject = 'Physics';
    } else if (qNum <= 100) {
      subject = 'Chemistry';
    } else {
      subject = 'Biology';
    }

    // Detect chapter if specified: "Chapter: Biomolecules"
    const chapMatch = chunkText.match(/Chapter\s*:\s*([^\n]+)/i);
    const chapter = chapMatch ? chapMatch[1].trim() : undefined;

    // Extract main question diagram / figure: `![Figure](url)` or `<img src="..." />`
    let figureUrl: string | undefined = undefined;
    const imgMatch = chunkText.match(/!\[.*?\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/i);
    if (imgMatch) {
      figureUrl = imgMatch[1];
      figuresCount++;
    }

    // Detect Hindi and English sections inside this question:
    // Support either explicit markers:
    // `### English` ... `### Hindi` OR Devanagari paragraph separation
    let enText = '';
    let hiText = '';

    const enMarkerIdx = chunkText.search(/#{1,4}\s*(?:English|EN)/i);
    const hiMarkerIdx = chunkText.search(/#{1,4}\s*(?:Hindi|HI|हिंदी)/i);

    if (enMarkerIdx !== -1 && hiMarkerIdx !== -1) {
      if (enMarkerIdx < hiMarkerIdx) {
        enText = chunkText.substring(enMarkerIdx, hiMarkerIdx);
        hiText = chunkText.substring(hiMarkerIdx);
      } else {
        hiText = chunkText.substring(hiMarkerIdx, enMarkerIdx);
        enText = chunkText.substring(enMarkerIdx);
      }
    } else {
      // Automatic line by line separation of Devanagari vs Latin
      const enLines: string[] = [];
      const hiLines: string[] = [];

      for (const line of chunkLines.slice(1)) {
        // Skip metadata lines
        if (/^(?:Subject|Chapter|Answer|Explanation)/i.test(line)) continue;
        if (isHindiText(line)) {
          hiLines.push(line);
        } else {
          enLines.push(line);
        }
      }

      enText = enLines.join('\n');
      hiText = hiLines.join('\n');
    }

    // Extract options from chunk
    const optionFigures: { A?: string; B?: string; C?: string; D?: string } = {};

    const parseOptionsFromMarkdown = (text: string): MockQuestionOption[] => {
      const opts: MockQuestionOption[] = [];
      const optLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

      // Regex matches: "- (A) text", "A. text", "(1) text", "1. text"
      const optRegex = /(?:^|\n)(?:[-*]\s*)?(?:\(([1-4A-Da-d])\)|([1-4A-Da-d])\.)\s+([^\n]+)/g;
      let om: RegExpExecArray | null;
      while ((om = optRegex.exec(text)) !== null) {
        const rawLbl = (om[1] || om[2]).toUpperCase();
        let mappedLbl: 'A' | 'B' | 'C' | 'D' = 'A';
        if (rawLbl === '1' || rawLbl === 'A') mappedLbl = 'A';
        else if (rawLbl === '2' || rawLbl === 'B') mappedLbl = 'B';
        else if (rawLbl === '3' || rawLbl === 'C') mappedLbl = 'C';
        else if (rawLbl === '4' || rawLbl === 'D') mappedLbl = 'D';

        let val = om[3].trim();
        let optImg: string | undefined = undefined;

        // Check if option value has an embedded image: `![Option A](url)`
        const optImgMatch = val.match(/!\[.*?\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/i);
        if (optImgMatch) {
          optImg = optImgMatch[1];
          optionFigures[mappedLbl] = optImg;
          optionFiguresCount++;
          val = val.replace(/!\[.*?\]\(.*?\)/, '').trim();
        }

        if (!opts.some(o => o.label === mappedLbl)) {
          opts.push({
            label: mappedLbl,
            type: optImg ? (val ? 'text_and_image' : 'image') : 'text',
            value: val || undefined,
            imageUrl: optImg
          });
        }
      }

      // Fill missing options
      for (const lbl of optLabels) {
        if (!opts.some(o => o.label === lbl)) {
          opts.push({ label: lbl, type: 'text', value: `Option ${lbl}` });
        }
      }

      opts.sort((a, b) => a.label.localeCompare(b.label));
      return opts;
    };

    const enOptions = parseOptionsFromMarkdown(enText || chunkText);
    const hiOptions = hiText ? parseOptionsFromMarkdown(hiText) : undefined;

    // Detect Correct Answer: `**Answer: (2)**` or `Answer: B`
    let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    const ansMatch = chunkText.match(/(?:\*\*|\*|#)*\s*(?:Answer|Ans|उत्तर)\s*(?:\:|\-)\s*\(?([1-4A-Da-d])\)?/i);
    if (ansMatch) {
      const rawAns = ansMatch[1].toUpperCase();
      if (rawAns === '1' || rawAns === 'A') correctAnswer = 'A';
      else if (rawAns === '2' || rawAns === 'B') correctAnswer = 'B';
      else if (rawAns === '3' || rawAns === 'C') correctAnswer = 'C';
      else if (rawAns === '4' || rawAns === 'D') correctAnswer = 'D';
    }

    // Detect Explanation
    let explanation: string | undefined = undefined;
    const expMatch = chunkText.match(/#{1,4}\s*(?:Explanation|स्पष्टीकरण)\s*\n([\s\S]*?)(?=(?:#{1,4}|\*\*Answer|$))/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
    }

    // Clean question text
    const cleanQText = (txt: string) => {
      return txt
        .replace(/#{1,4}\s*(?:Question|Q\.?|प्रश्न)?\s*\d{1,3}[:.\s]*/gi, '')
        .replace(/#{1,4}\s*(?:English|Hindi|HI|EN|हिंदी)*/gi, '')
        .replace(/(?:^|\n)(?:[-*]\s*)?(?:\(([1-4A-Da-d])\)|([1-4A-Da-d])\.)\s+[^\n]+/g, '')
        .replace(/(?:\*\*|\*|#)*\s*(?:Answer|Ans|उत्तर)\s*(?:\:|\-)[^\n]+/gi, '')
        .replace(/#{1,4}\s*(?:Explanation|स्पष्टीकरण)[\s\S]*/gi, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/^(?:Subject|Chapter|Difficulty)\s*:[^\n]+/gmi, '')
        .trim();
    };

    const parsedEnText = cleanQText(enText) || `Question ${qNum}`;
    const parsedHiText = hiText ? cleanQText(hiText) : undefined;

    if (parsedHiText && parsedHiText.length > 5) {
      bilingualCount++;
    }

    const enContent: MockQuestionLanguageContent = {
      questionText: parsedEnText,
      options: enOptions,
      explanation
    };

    const hiContent: MockQuestionLanguageContent | undefined = parsedHiText
      ? {
          questionText: parsedHiText,
          options: hiOptions || enOptions,
          explanation
        }
      : undefined;

    const mockQ: MockQuestion = {
      id: `q_${testId}_${qNum}`,
      testId,
      questionNumber: qNum,
      subject,
      chapter: chapter || (subject === 'Physics' ? 'Physics Unit' : subject === 'Chemistry' ? 'Chemistry Unit' : 'Biology Unit'),
      difficulty: qNum % 5 === 0 ? 'Hard' : qNum % 2 === 0 ? 'Moderate' : 'Easy',
      languages: {
        en: enContent,
        hi: hiContent
      },
      questionText: enContent.questionText,
      options: enContent.options,
      explanation: enContent.explanation,
      figureUrl,
      questionImageUrl: figureUrl,
      optionFigures: Object.keys(optionFigures).length > 0 ? optionFigures : undefined,
      correctAnswer,
      marks: 4,
      negativeMarks: 1,
      needsReview: !parsedHiText || enOptions.length < 4
    };

    questions.push(mockQ);
  }

  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  if (questions.length === 0) {
    warnings.push('No markdown questions could be parsed. Ensure headings like "## Question 1" are used.');
  }

  return {
    questions,
    stats: {
      totalQuestions: questions.length,
      bilingualCount,
      figuresCount,
      optionFiguresCount
    },
    warnings
  };
}
