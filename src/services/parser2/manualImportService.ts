// NCERTify AI Parser 4.0 — Module 3: Manual Copy-Paste & Multi-Format Import Engine
// Supports Direct Copy-Paste, Markdown (.md), Plain Text (.txt), Word (.docx), JSON (.json), and PDF (.pdf).
// Enforces mandatory editable preview, rich validation/warning detection, and post-import reconciliation
// with duplicate prevention & "Import Missing Only" mode.

import zlib from 'zlib';
import {
  Parser2Job,
  Parser2Question,
  Parser2Subject,
  Parser2Option,
  Parser2MatchTable,
  Parser2StructuredTable,
  Parser2ImageAttachment,
  Parser2AnswerKeyEntry,
  isPlaceholderOption
} from './types';
import {
  saveParser2Job,
  getParser2JobById,
  getParser2Questions,
  upsertParser2Questions,
  saveParser2Questions,
  saveParser2AnswerKeys,
  getParser2AnswerKeys,
  saveParser2ValidationReport,
  addParser2Log,
  verifyJobQuestionsPersisted
} from './parser2Db';
import { evaluateStrictQuestionStatus } from './jobQueueService';
import { validationEngine } from './validationEngine';
import { answerKeyService } from './answerKeyService';
import { parseMatchTableFromText } from './layoutEngine';
import { formatScientificMathAndPowers, cleanQuestionTextForMatchTable } from '../../lib/mockTestData';

export type ManualImportFormat = 'paste' | 'markdown' | 'txt' | 'docx' | 'json' | 'pdf';

export interface ImportedQuestionDraft {
  tempId: string;
  questionNumber: number;
  subject: Parser2Subject;
  chapter?: string;
  questionType: Parser2Question['questionType'];
  questionText: string;
  options: Parser2Option[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  figureUrl?: string;
  imageAttachments?: Parser2ImageAttachment[];
  matchTable?: Parser2MatchTable;
  structuredTable?: Parser2StructuredTable;
  warnings: string[];
  hasMissingOptions: boolean;
  hasMissingAnswer: boolean;
  hasMissingExplanation: boolean;
  isDuplicateInBatch: boolean;
  alreadyExistsInTargetJob: boolean;
  selectedForImport: boolean;
}

export interface ManualImportPreviewResult {
  format: ManualImportFormat;
  sourceFileName?: string;
  rawCharCount: number;
  expectedCount: number;
  detectedCount: number;
  questions: ImportedQuestionDraft[];
  summary: {
    fourOptionCount: number;
    missingOptionsCount: number;
    missingAnswersCount: number;
    missingExplanationsCount: number;
    warningQuestionsCount: number;
    duplicatesInBatch: number[];
    existingInTargetJob: number[];
    numberingGaps: number[];
    tablesDetected: number;
    imagesDetected: number;
    unsupportedImageRefs: string[];
    malformedMarkdownWarnings: string[];
  };
}

export interface ManualImportCommitResult {
  job: Parser2Job;
  reconciliation: {
    expected: number;
    detected: number;
    saved: number;
    skipped: number;
    duplicatesPrevented: number;
    verifiedPersisted: boolean;
    savedNumbers: number[];
    failedQuestions: Array<{ questionNumber: number; error: string }>;
    skippedReasons: Array<{ questionNumber: number; reason: string }>;
  };
}

/**
 * Lightweight zero-dependency DOCX text extractor (parses PKZIP local headers & word/document.xml)
 */
export function extractTextFromDocxBuffer(buf: Buffer): string {
  // Search for ZIP local file headers (0x04034b50) to locate word/document.xml
  let offset = 0;
  let xmlContent = '';

  while (offset + 30 < buf.length) {
    if (
      buf[offset] === 0x50 &&
      buf[offset + 1] === 0x4b &&
      buf[offset + 2] === 0x03 &&
      buf[offset + 3] === 0x04
    ) {
      const compressionMethod = buf.readUInt16LE(offset + 8);
      const compressedSize = buf.readUInt32LE(offset + 18);
      const fileNameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const fileName = buf.subarray(offset + 30, offset + 30 + fileNameLen).toString('utf8');
      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (fileName === 'word/document.xml') {
        let dataEnd = compressedSize > 0 ? dataStart + compressedSize : buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), dataStart);
        if (dataEnd < 0) dataEnd = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), dataStart);
        if (dataEnd < 0) dataEnd = buf.length;
        const slice = buf.subarray(dataStart, dataEnd);
        try {
          if (compressionMethod === 0) {
            xmlContent = slice.toString('utf8');
          } else if (compressionMethod === 8) {
            xmlContent = zlib.inflateRawSync(slice).toString('utf8');
          }
        } catch {
          // Try raw scan fallback
          try {
            xmlContent = zlib.inflateRawSync(buf.subarray(dataStart)).toString('utf8');
          } catch {}
        }
        break;
      }

      if (compressedSize > 0) {
        offset = dataStart + compressedSize;
      } else {
        offset += 4;
      }
    } else {
      offset += 1;
    }
  }

  if (!xmlContent) {
    throw new Error('Could not read word/document.xml from .docx file. Ensure the file is a valid Word (.docx) document.');
  }

  // Convert Word XML paragraphs, tabs, breaks, and table cells cleanly into readable text/markdown
  const decoded = xmlContent
    .replace(/<w:tr\b[^>]*>/g, '\n')
    .replace(/<\/w:tc>\s*<w:tc\b[^>]*>/g, ' | ')
    .replace(/<w:tab\b[^>]*\/>/g, '  ')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return decoded;
}

/**
 * Extract plain text from an uploaded PDF buffer across all pages
 */
export async function extractTextFromPdfBuffer(buf: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pageChunks: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';
    for (const item of content.items as any[]) {
      const str = String(item?.str || '');
      const y = Array.isArray(item?.transform) ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = str;
      } else {
        currentLine += (currentLine && str && !currentLine.endsWith(' ') ? ' ' : '') + str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pageChunks.push(lines.join('\n'));
  }
  return pageChunks.join('\n\n');
}

function normalizeAnswerLabel(raw?: string): 'A' | 'B' | 'C' | 'D' | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^[\(\[\s*]+|[\)\]\s*.,:]+$/g, '').toUpperCase();
  if (cleaned === 'A' || cleaned === '1') return 'A';
  if (cleaned === 'B' || cleaned === '2') return 'B';
  if (cleaned === 'C' || cleaned === '3') return 'C';
  if (cleaned === 'D' || cleaned === '4') return 'D';
  return undefined;
}

function parseMarkdownTableBlock(text: string): {
  remainingText: string;
  structuredTable?: Parser2StructuredTable;
  matchTable?: Parser2MatchTable;
  malformedWarning?: string;
} {
  const lines = text.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^\|.+\|$/.test(trimmed) || (trimmed.includes('|') && trimmed.split('|').length >= 3)) {
      if (tableStart === -1) tableStart = i;
      tableEnd = i;
    } else if (tableStart !== -1) {
      if (tableEnd - tableStart >= 1) break;
      tableStart = -1;
      tableEnd = -1;
    }
  }

  if (tableStart === -1 || tableEnd - tableStart < 1) {
    return { remainingText: text };
  }

  const rawTableLines = lines.slice(tableStart, tableEnd + 1).map(l => l.trim());
  const parsedRows: string[][] = [];
  let hasSeparator = false;

  for (const line of rawTableLines) {
    const stripped = line.replace(/^\|/, '').replace(/\|$/, '');
    const cells = stripped.split('|').map(c => c.trim());
    if (cells.every(c => /^:?-{2,}:?$/.test(c))) {
      hasSeparator = true;
      continue;
    }
    parsedRows.push(cells);
  }

  if (parsedRows.length < 2) {
    return {
      remainingText: text,
      malformedWarning: 'Detected incomplete Markdown table (fewer than 2 rows).'
    };
  }

  const headers = parsedRows[0];
  const bodyRows = parsedRows.slice(1);
  const colCounts = new Set(parsedRows.map(r => r.length));
  const malformedWarning =
    colCounts.size > 1 && !hasSeparator
      ? 'Markdown table has uneven column counts; verify alignment in preview.'
      : undefined;

  const remainingLines = [...lines.slice(0, tableStart), ...lines.slice(tableEnd + 1)];
  const remainingText = remainingLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Detect Match-the-Column (2-column List I / List II table)
  const hJoined = headers.join(' ').toLowerCase();
  const isMatchHeader =
    headers.length === 2 &&
    (/(?:list|column)\s*[-–]?\s*(?:i|1|a)/i.test(hJoined) || /(?:list|column)\s*[-–]?\s*(?:ii|2|b)/i.test(hJoined));

  if (isMatchHeader) {
    const matchTable: Parser2MatchTable = {
      columnAHeader: headers[0] || 'List I',
      columnBHeader: headers[1] || 'List II',
      colATitle: headers[0] || 'List I',
      colBTitle: headers[1] || 'List II',
      showBorders: true,
      rows: bodyRows.map((r, idx) => {
        const aVal = formatScientificMathAndPowers(r[0] || '');
        const bVal = formatScientificMathAndPowers(r[1] || '');
        return {
          colAKey: String.fromCharCode(65 + idx),
          colAText: aVal,
          colAValue: aVal,
          colBKey: ['I', 'II', 'III', 'IV', 'V', 'VI'][idx] || String(idx + 1),
          colBText: bVal,
          colBValue: bVal
        };
      })
    };
    return { remainingText, matchTable, malformedWarning };
  }

  const maxCols = Math.max(...parsedRows.map(r => r.length));
  const normalizedHeaders = Array.from({ length: maxCols }, (_, i) => formatScientificMathAndPowers(headers[i] || `Col ${i + 1}`));
  const normalizedRows = bodyRows.map(r =>
    Array.from({ length: maxCols }, (_, i) => formatScientificMathAndPowers(r[i] || ''))
  );

  return {
    remainingText,
    structuredTable: {
      headers: normalizedHeaders,
      rows: normalizedRows,
      showBorders: true
    },
    malformedWarning
  };
}

function extractImageRefsFromText(text: string): {
  cleanedText: string;
  validAttachments: Parser2ImageAttachment[];
  unsupportedRefs: string[];
} {
  const validAttachments: Parser2ImageAttachment[] = [];
  const unsupportedRefs: string[] = [];

  const cleanedText = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt, url) => {
    const trimmedUrl = String(url || '').trim();
    if (/^(?:https?:\/\/|\/api\/r2\/|\/assets\/)/i.test(trimmedUrl)) {
      validAttachments.push({
        id: `imp-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: trimmedUrl,
        placement: 'after_question',
        alt: String(alt || '').trim() || 'Question figure',
        caption: String(alt || '').trim() || undefined,
        alignment: 'center',
        widthPercent: 85,
        sourceType: 'upload',
        createdAt: new Date().toISOString()
      });
    } else if (trimmedUrl) {
      unsupportedRefs.push(trimmedUrl);
    }
    return '';
  });

  return { cleanedText: cleanedText.trim(), validAttachments, unsupportedRefs };
}

function detectQuestionType(
  stem: string,
  matchTable?: Parser2MatchTable,
  structuredTable?: Parser2StructuredTable,
  hasImage?: boolean
): Parser2Question['questionType'] {
  if (matchTable?.rows?.length) return 'match_the_column';
  if (/assertion\s*(?:\(a\))?\s*:/i.test(stem) && /reason\s*(?:\(r\))?\s*:/i.test(stem)) return 'assertion_reason';
  if (/statement\s*(?:i|1)\s*:/i.test(stem) && /statement\s*(?:ii|2)\s*:/i.test(stem)) return 'multiple_statement';
  if (structuredTable?.rows?.length) return 'table_based';
  if (hasImage) return 'diagram_based';
  return 'single_mcq';
}

function parseJsonQuestions(
  rawText: string,
  defaultSubject: Parser2Subject
): {
  drafts: ImportedQuestionDraft[];
  unsupportedImageRefs: string[];
  malformedWarnings: string[];
} {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (e: any) {
    throw new Error(`Invalid JSON syntax: ${e?.message || 'Could not parse JSON'}`);
  }

  const list: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
    ? parsed.questions
    : Array.isArray(parsed?.data)
    ? parsed.data
    : [];

  if (list.length === 0) {
    throw new Error('JSON did not contain a non-empty array of questions (expected [...] or { "questions": [...] }).');
  }

  const drafts: ImportedQuestionDraft[] = [];
  const unsupportedImageRefs: string[] = [];
  const malformedWarnings: string[] = [];

  list.forEach((item, idx) => {
    const qNum = Number(item?.questionNumber ?? item?.qNo ?? item?.number ?? item?.id ?? idx + 1) || idx + 1;
    const rawStem = String(item?.questionText ?? item?.question ?? item?.stem ?? item?.text ?? '').trim();
    const stem = formatScientificMathAndPowers(rawStem);

    let opts: Parser2Option[] = [];
    if (Array.isArray(item?.options)) {
      opts = (['A', 'B', 'C', 'D'] as const).map((lbl, oi) => {
        const entry = item.options.find((o: any) => String(o?.label || '').toUpperCase() === lbl) ?? item.options[oi];
        const rawVal = typeof entry === 'string' ? entry : String(entry?.value ?? entry?.text ?? '');
        const val = formatScientificMathAndPowers(rawVal.trim());
        return {
          label: lbl,
          text: val,
          value: val,
          imageUrl: typeof entry === 'object' ? entry?.imageUrl : undefined
        };
      });
    } else if (item?.options && typeof item.options === 'object') {
      opts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
        const val = formatScientificMathAndPowers(String(item.options[lbl] ?? item.options[lbl.toLowerCase()] ?? '').trim());
        return { label: lbl, text: val, value: val };
      });
    } else {
      opts = (['A', 'B', 'C', 'D'] as const).map(lbl => {
        const key = `option${lbl}`;
        const snake = `option_${lbl.toLowerCase()}`;
        const val = formatScientificMathAndPowers(String(item?.[key] ?? item?.[snake] ?? '').trim());
        return { label: lbl, text: val, value: val };
      });
    }

    const ans = normalizeAnswerLabel(
      String(item?.correctAnswer ?? item?.answer ?? item?.correctOption ?? item?.correct_answer ?? '')
    );
    const explanation = item?.explanation || item?.solution ? formatScientificMathAndPowers(String(item.explanation || item.solution).trim()) : undefined;
    const figureUrl = typeof item?.figureUrl === 'string' && /^(?:https?:\/\/|\/api\/r2\/|\/assets\/)/i.test(item.figureUrl)
      ? item.figureUrl
      : undefined;
    if (typeof item?.figureUrl === 'string' && item.figureUrl && !figureUrl) {
      unsupportedImageRefs.push(item.figureUrl);
    }

    const matchTable = item?.matchTable;
    const structuredTable = item?.structuredTable;
    const subj = (['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Combined'].includes(item?.subject)
      ? item.subject
      : defaultSubject) as Parser2Subject;

    const missingOpts = opts.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value)));
    const warnings: string[] = [];
    if (!stem) warnings.push('Missing question stem');
    if (missingOpts) warnings.push('Missing one or more options (A-D)');
    if (!ans) warnings.push('Missing answer key');
    if (!explanation) warnings.push('Missing explanation');

    drafts.push({
      tempId: `draft-${qNum}-${idx}`,
      questionNumber: qNum,
      subject: subj,
      chapter: item?.chapter || '',
      questionType: detectQuestionType(stem, matchTable, structuredTable, Boolean(figureUrl)),
      questionText: stem,
      options: opts,
      correctAnswer: ans,
      explanation,
      figureUrl,
      imageAttachments: Array.isArray(item?.imageAttachments) ? item.imageAttachments : undefined,
      matchTable,
      structuredTable,
      warnings,
      hasMissingOptions: missingOpts,
      hasMissingAnswer: !ans,
      hasMissingExplanation: !explanation,
      isDuplicateInBatch: false,
      alreadyExistsInTargetJob: false,
      selectedForImport: true
    });
  });

  return { drafts, unsupportedImageRefs, malformedWarnings };
}

function parseStructuredTextOrMarkdown(
  rawText: string,
  defaultSubject: Parser2Subject
): {
  drafts: ImportedQuestionDraft[];
  unsupportedImageRefs: string[];
  malformedWarnings: string[];
} {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const malformedWarnings: string[] = [];
  const unsupportedImageRefs: string[] = [];

  // Check for unclosed code fences
  const fenceMatches = normalized.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    malformedWarnings.push('Unclosed Markdown code block (```) detected.');
  }

  // Separate optional trailing Answer Key section so bottom keys link cleanly to every question
  let bodyText = normalized;
  let bottomKeyMap: Record<number, Parser2AnswerKeyEntry> = {};
  const keySectionMatch = normalized.match(/\n\s*(?:#{1,4}\s*|\*\*)?(?:ANSWER\s*KEY|HINTS\s*&?\s*ANSWERS|SOLUTIONS\s*KEY)(?:\*\*)?\s*:?\s*\n([\s\S]+)$/i);
  if (keySectionMatch && keySectionMatch.index !== undefined) {
    const candidateKeys = answerKeyService.parseAnswerKeyText(keySectionMatch[1], 'text_paste');
    if (Object.keys(candidateKeys).length >= 2) {
      bottomKeyMap = candidateKeys;
      bodyText = normalized.slice(0, keySectionMatch.index).trim();
    }
  }

  // Split into question blocks using flexible NEET/Markdown question anchors:
  // "1. ...", "Q1. ...", "Q. 1 ...", "**1.** ...", "### Q1 ...", "Question 1: ..."
  const lines = bodyText.split('\n');
  const blocks: Array<{ questionNumber: number; lines: string[]; subjectHint?: Parser2Subject }> = [];
  let currentBlock: { questionNumber: number; lines: string[]; subjectHint?: Parser2Subject } | null = null;
  let currentSubjectHint: Parser2Subject = defaultSubject;

  const subjectBannerRegex = /^\s*(?:#{1,4}\s*|\*\*)?(?:SECTION\s*[-–:\s]*[A-Z0-9]*\s*[-–:\s]*)?(PHYSICS|CHEMISTRY|BIOLOGY|BOTANY|ZOOLOGY)\b/i;
  const qStartRegex = /^\s*(?:#{1,4}\s*)?(?:\*\*\s*)?(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:[\.\)\:]|\*\*[\.\)]?)\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Subject section heading update
    const subjMatch = trimmed.match(subjectBannerRegex);
    if (subjMatch && trimmed.length <= 60 && !qStartRegex.test(trimmed)) {
      const sWord = subjMatch[1].toLowerCase();
      currentSubjectHint =
        sWord === 'physics'
          ? 'Physics'
          : sWord === 'chemistry'
          ? 'Chemistry'
          : 'Biology';
      continue;
    }

    const qMatch = line.match(qStartRegex);
    // Guard against splitting statement lists "(1) ... (2) ..." or numeric options "1) ... 2) ..." inside an active question!
    const numVal = qMatch ? parseInt(qMatch[1], 10) : -1;
    const hasExplicitQPrefix = /^\s*(?:#{1,4}\s*)?(?:\*\*\s*)?Q(?:uestion)?\.?\s*\d+/i.test(line);
    const currentChunkJoined = currentBlock ? currentBlock.lines.join('\n') : '';
    const currentAlreadyHasOptions =
      /(?:^|\n)\s*(?:\*\*)?(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\)])\s+/i.test(currentChunkJoined) ||
      /(?:^|\n)\s*(?:\*\*)?(?:Answer|Ans\.?|Correct\s+Answer)\s*[:\-–]/i.test(currentChunkJoined);
    const isLikelyInternalStatementOrOption =
      Boolean(qMatch && currentBlock) &&
      !hasExplicitQPrefix &&
      numVal >= 1 &&
      numVal <= 6 &&
      (
        (/^\s*[1-4]\)\s+/.test(line) && numVal !== (currentBlock?.questionNumber || 0) + 1) ||
        (!currentAlreadyHasOptions && numVal <= 4 && numVal !== (currentBlock?.questionNumber || 0) + 1)
      );

    if (qMatch && !isLikelyInternalStatementOrOption && numVal >= 1 && numVal <= 500) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      const rest = qMatch[2].replace(/^\*\*\s*/, '').trim();
      currentBlock = {
        questionNumber: numVal,
        lines: rest ? [rest] : [],
        subjectHint: currentSubjectHint
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const drafts: ImportedQuestionDraft[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const blk = blocks[bIdx];
    let chunk = blk.lines.join('\n').trim();

    // 1. Extract Explanation / Solution block if present
    let explanation: string | undefined;
    const explanationAttachments: Parser2ImageAttachment[] = [];
    const expMatch = chunk.match(/(?:^|\n)\s*(?:\*\*)?(?:Explanation|Solution|Sol\.|Hint|Rationale)(?:\*\*)?\s*[:\-–]\s*([\s\S]*)$/i);
    if (expMatch && expMatch.index !== undefined) {
      const expImgRes = extractImageRefsFromText(expMatch[1]);
      for (const att of expImgRes.validAttachments) {
        explanationAttachments.push({ ...att, placement: 'explanation' });
      }
      if (expImgRes.unsupportedRefs.length > 0) {
        unsupportedImageRefs.push(...expImgRes.unsupportedRefs.map(r => `Q${blk.questionNumber} Exp: ${r}`));
      }
      explanation = formatScientificMathAndPowers(expImgRes.cleanedText.replace(/\*\*/g, '').trim());
      chunk = chunk.slice(0, expMatch.index).trim();
    }

    // 2. Extract inline Answer marker
    let correctAnswer: 'A' | 'B' | 'C' | 'D' | undefined;
    const ansMatch = chunk.match(/(?:^|\n)\s*(?:\*\*)?(?:Correct\s+Answer|Correct\s+Option|Answer|Ans\.?)(?:\*\*)?\s*[:\-–]?\s*\(?([A-Da-d1-4])\)?[^\n]*/i);
    if (ansMatch && ansMatch.index !== undefined) {
      correctAnswer = normalizeAnswerLabel(ansMatch[1]);
      chunk = (chunk.slice(0, ansMatch.index) + '\n' + chunk.slice(ansMatch.index + ansMatch[0].length)).trim();
    }
    if (!correctAnswer && bottomKeyMap[blk.questionNumber]) {
      correctAnswer = bottomKeyMap[blk.questionNumber].verifiedAnswer;
    }

    // 3. Extract Markdown Table or Match-the-Column Table
    let matchTable: Parser2MatchTable | undefined;
    let structuredTable: Parser2StructuredTable | undefined;
    const tblRes = parseMarkdownTableBlock(chunk);
    chunk = tblRes.remainingText;
    if (tblRes.matchTable) matchTable = tblRes.matchTable;
    if (tblRes.structuredTable) structuredTable = tblRes.structuredTable;
    if (tblRes.malformedWarning) {
      malformedWarnings.push(`Q${blk.questionNumber}: ${tblRes.malformedWarning}`);
    }

    // 4. Split stem vs options FIRST (so option-level ![alt](url) images stay mapped to their exact Option A-D!)
    // Also supports statement-combination questions: if "(1)..(4)" statements are followed by "(A)..(D)",
    // keep the numbered statements inside stemText and parse "(A)..(D)" as the 4 options!
    const optionMap: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};
    const optionImageMap: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};
    const optionAttachments: Parser2ImageAttachment[] = [];
    let stemText = chunk;

    // Normalize bullet prefixes on option lines ("- (A)" or "* A.")
    const optNormalized = chunk.replace(/^[ \t]*[-*•][ \t]+(?=(?:\(?[A-Da-d1-4][\)\.]|\*\*[A-Da-d1-4][\)\.]?\*\*))/gm, '');

    // Prefer lettered A/B/C/D options if present (so numbered statements 1..4 stay in stem!)
    const letteredOptPos = optNormalized.search(/(?:^|\n)\s*(?:\*\*)?(?:\(A\)|\[A\]|A[\.\)])(?:\*\*)?\s+/);
    const anyFirstOptPos = optNormalized.search(/(?:^|\n)\s*(?:\*\*)?(?:\([A1]\)|\[[A1]\]|[A1][\.\)])(?:\*\*)?\s+/i);
    const firstOptPos = letteredOptPos >= 0 ? letteredOptPos : anyFirstOptPos;
    let optionsArea = '';
    if (firstOptPos >= 0) {
      stemText = optNormalized.slice(0, firstOptPos).trim();
      optionsArea = optNormalized.slice(firstOptPos).trim();
    } else {
      // Try inline options on a single line: "...? (A) foo (B) bar (C) baz (D) qux"
      const inlinePos = optNormalized.search(/\s+(?:\([A1]\)|\[[A1]\])\s+/i);
      if (inlinePos >= 0) {
        stemText = optNormalized.slice(0, inlinePos).trim();
        optionsArea = optNormalized.slice(inlinePos).trim();
      }
    }

    // 5. Extract Markdown image references from STEM only
    const imgRes = extractImageRefsFromText(stemText);
    stemText = imgRes.cleanedText;
    if (imgRes.unsupportedRefs.length > 0) {
      unsupportedImageRefs.push(...imgRes.unsupportedRefs.map(r => `Q${blk.questionNumber}: ${r}`));
    }

    if (optionsArea) {
      const tokenRegex =
        letteredOptPos >= 0
          ? /(?:^|[\n\s])(?:\*\*)?(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[\.\)])(?:\*\*)?\s+/g
          : /(?:^|[\n\s])(?:\*\*)?(?:\(([A-Da-d1-4])\)|\[([A-Da-d1-4])\]|([A-Da-d])[\.\)]|([1-4])\))(?:\*\*)?\s+/g;
      const hits: Array<{ label: 'A' | 'B' | 'C' | 'D'; start: number; contentStart: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = tokenRegex.exec(optionsArea)) !== null) {
        const rawLbl = m[1] || m[2] || m[3] || m[4];
        const normLbl = normalizeAnswerLabel(rawLbl);
        if (!normLbl) continue;
        if (hits.some(h => h.label === normLbl)) continue;
        hits.push({ label: normLbl, start: m.index, contentStart: tokenRegex.lastIndex });
      }
      for (let hi = 0; hi < hits.length; hi++) {
        const cur = hits[hi];
        const end = hi + 1 < hits.length ? hits[hi + 1].start : optionsArea.length;
        const rawOptSlice = optionsArea.slice(cur.contentStart, end);
        const optImgRes = extractImageRefsFromText(rawOptSlice);
        if (optImgRes.validAttachments.length > 0) {
          optionImageMap[cur.label] = optImgRes.validAttachments[0].url;
          for (const oa of optImgRes.validAttachments) {
            optionAttachments.push({ ...oa, placement: `option_${cur.label}` as Parser2ImageAttachment['placement'] });
          }
        }
        if (optImgRes.unsupportedRefs.length > 0) {
          unsupportedImageRefs.push(...optImgRes.unsupportedRefs.map(r => `Q${blk.questionNumber} Opt ${cur.label}: ${r}`));
        }
        const val = optImgRes.cleanedText
          .replace(/\n+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (val) {
          optionMap[cur.label] = formatScientificMathAndPowers(val);
        }
      }
    }

    const allImageAttachments = [...imgRes.validAttachments, ...optionAttachments, ...explanationAttachments];

    // Try plain-text Match-the-Column extraction from stem if not already extracted as Markdown table
    if (!matchTable && /(?:list\s*[-–]?\s*i|column\s*[-–]?\s*i)/i.test(stemText)) {
      const textMatch = parseMatchTableFromText(stemText);
      if (textMatch && textMatch.rows.length >= 2) {
        matchTable = textMatch;
        stemText = cleanQuestionTextForMatchTable(stemText, matchTable);
      }
    }

    stemText = formatScientificMathAndPowers(stemText.replace(/\*\*/g, '').trim());
    const options: Parser2Option[] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
      const val = optionMap[lbl] || (optionImageMap[lbl] ? `[Figure ${lbl}]` : '');
      return {
        label: lbl,
        text: val,
        value: val,
        imageUrl: optionImageMap[lbl],
        isVisualOption: Boolean(optionImageMap[lbl])
      };
    });

    const missingOpts = options.some(o => !o.imageUrl && (!o.value || isPlaceholderOption(o.value)));
    const warnings: string[] = [];
    if (!stemText) warnings.push('Missing question stem');
    if (missingOpts) warnings.push('Missing one or more options (A-D)');
    if (!correctAnswer) warnings.push('Missing answer key');
    if (!explanation) warnings.push('Missing explanation');
    if (imgRes.unsupportedRefs.length > 0) {
      warnings.push(`Unsupported local image ref(s): ${imgRes.unsupportedRefs.join(', ')}`);
    }

    const figureUrl = imgRes.validAttachments[0]?.url;

    drafts.push({
      tempId: `draft-${blk.questionNumber}-${bIdx}`,
      questionNumber: blk.questionNumber,
      subject: blk.subjectHint || defaultSubject,
      chapter: '',
      questionType: detectQuestionType(stemText, matchTable, structuredTable, Boolean(figureUrl)),
      questionText: stemText,
      options,
      correctAnswer,
      explanation,
      figureUrl,
      imageAttachments: allImageAttachments.length > 0 ? allImageAttachments : undefined,
      matchTable,
      structuredTable,
      warnings,
      hasMissingOptions: missingOpts,
      hasMissingAnswer: !correctAnswer,
      hasMissingExplanation: !explanation,
      isDuplicateInBatch: false,
      alreadyExistsInTargetJob: false,
      selectedForImport: true
    });
  }

  return { drafts, unsupportedImageRefs, malformedWarnings };
}

export class ManualImportService {
  /**
   * Step 1: Parse uploaded file or pasted text and produce the MANDATORY editable preview with full issue detection.
   */
  public async buildImportPreview(params: {
    format: ManualImportFormat;
    rawText?: string;
    fileBuffer?: Buffer;
    fileName?: string;
    defaultSubject?: Parser2Subject;
    existingJobId?: string;
    expectedCount?: number;
  }): Promise<ManualImportPreviewResult> {
    const subject: Parser2Subject = params.defaultSubject || 'Combined';
    let textContent = (params.rawText || '').trim();

    if (params.fileBuffer && params.fileBuffer.length > 0) {
      if (params.format === 'docx') {
        textContent = extractTextFromDocxBuffer(params.fileBuffer);
      } else if (params.format === 'pdf') {
        textContent = await extractTextFromPdfBuffer(params.fileBuffer);
      } else {
        textContent = params.fileBuffer.toString('utf8');
      }
    }

    if (!textContent || textContent.trim().length < 5) {
      throw new Error('No readable text content found in the pasted input or uploaded file.');
    }

    const parsed =
      params.format === 'json'
        ? parseJsonQuestions(textContent, subject)
        : parseStructuredTextOrMarkdown(textContent, subject);

    const { drafts, unsupportedImageRefs, malformedWarnings } = parsed;

    // Check duplicates within batch AND against target existing job (if merging / Import Missing Only)
    const seenCounts = new Map<number, number>();
    for (const d of drafts) {
      seenCounts.set(d.questionNumber, (seenCounts.get(d.questionNumber) || 0) + 1);
    }
    const duplicatesInBatch: number[] = [];
    const seenFirst = new Set<number>();

    let existingTargetNums = new Set<number>();
    if (params.existingJobId) {
      const targetQs = await getParser2Questions(params.existingJobId);
      existingTargetNums = new Set(targetQs.map(q => q.questionNumber));
    }
    const existingInTargetJob: number[] = [];

    for (const d of drafts) {
      if ((seenCounts.get(d.questionNumber) || 0) > 1) {
        if (seenFirst.has(d.questionNumber)) {
          d.isDuplicateInBatch = true;
          d.warnings.push(`Duplicate Q${d.questionNumber} inside this import`);
          if (!duplicatesInBatch.includes(d.questionNumber)) duplicatesInBatch.push(d.questionNumber);
        } else {
          seenFirst.add(d.questionNumber);
        }
      }
      if (existingTargetNums.has(d.questionNumber)) {
        d.alreadyExistsInTargetJob = true;
        d.warnings.push(`Q${d.questionNumber} already exists in target job`);
        if (!existingInTargetJob.includes(d.questionNumber)) existingInTargetJob.push(d.questionNumber);
      }
    }

    // Detect numbering gaps across detected question sequence
    const sortedUniqueNums = Array.from(new Set(drafts.map(d => d.questionNumber))).sort((a, b) => a - b);
    const numberingGaps: number[] = [];
    if (sortedUniqueNums.length > 0) {
      const start = sortedUniqueNums[0] <= 5 ? 1 : sortedUniqueNums[0];
      const end = Math.max(sortedUniqueNums[sortedUniqueNums.length - 1], params.expectedCount || 0);
      const present = new Set(sortedUniqueNums);
      for (let n = start; n <= end; n++) {
        if (!present.has(n)) numberingGaps.push(n);
      }
    }

    const expectedCount =
      params.expectedCount && params.expectedCount > 0
        ? params.expectedCount
        : sortedUniqueNums.length > 0
        ? Math.max(sortedUniqueNums[sortedUniqueNums.length - 1], drafts.length)
        : drafts.length;

    return {
      format: params.format,
      sourceFileName: params.fileName,
      rawCharCount: textContent.length,
      expectedCount,
      detectedCount: drafts.length,
      questions: drafts,
      summary: {
        fourOptionCount: drafts.filter(d => !d.hasMissingOptions).length,
        missingOptionsCount: drafts.filter(d => d.hasMissingOptions).length,
        missingAnswersCount: drafts.filter(d => d.hasMissingAnswer).length,
        missingExplanationsCount: drafts.filter(d => d.hasMissingExplanation).length,
        warningQuestionsCount: drafts.filter(d => (d.warnings || []).length > 0).length,
        duplicatesInBatch: duplicatesInBatch.sort((a, b) => a - b),
        existingInTargetJob: existingInTargetJob.sort((a, b) => a - b),
        numberingGaps: numberingGaps.slice(0, 100),
        tablesDetected: drafts.filter(d => Boolean(d.matchTable?.rows?.length || d.structuredTable?.rows?.length)).length,
        imagesDetected: drafts.reduce(
          (sum, d) =>
            sum +
            (d.imageAttachments?.length || (d.figureUrl ? 1 : 0)) +
            (d.options || []).filter(o => Boolean(o.imageUrl)).length,
          0
        ),
        unsupportedImageRefs,
        malformedMarkdownWarnings: malformedWarnings
      }
    };
  }

  /**
   * Step 2: Commit edited preview questions to a new or existing Parser 4.0 job with strict post-import reconciliation.
   */
  public async commitImportedQuestions(params: {
    testName: string;
    subject: Parser2Subject;
    chapter?: string;
    format: ManualImportFormat;
    sourceFileName?: string;
    existingJobId?: string;
    importMissingOnly?: boolean;
    expectedCount?: number;
    questions: ImportedQuestionDraft[];
  }): Promise<ManualImportCommitResult> {
    const now = new Date().toISOString();
    const isMerge = Boolean(params.existingJobId);
    let job: Parser2Job | null = params.existingJobId ? await getParser2JobById(params.existingJobId) : null;

    if (isMerge && !job) {
      throw new Error(`Target job ${params.existingJobId} not found for merge import.`);
    }

    if (!job) {
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      job = {
        id: jobId,
        testName: (params.testName || `Imported ${params.format.toUpperCase()} Test`).trim(),
        subject: params.subject || 'Combined',
        chapter: params.chapter || '',
        questionRange: params.expectedCount ? `1-${params.expectedCount}` : '',
        expectedQuestionsManual: params.expectedCount || null,
        ocrEngine: 'gemini',
        geminiModel: 'gemini-4-hydrogen',
        enableGeminiVerification: false,
        status: 'saving',
        currentStage: 'Saving imported questions',
        totalPages: 1,
        completedPages: 1,
        failedPages: 0,
        totalQuestions: 0,
        questionsDetected: params.questions.length,
        questionsSaved: 0,
        savedVerified: false,
        verifiedQuestions: 0,
        reviewRequiredCount: 0,
        figureCount: 0,
        estimatedCostUsd: 0,
        retryCount: 0,
        manuallyEditedCount: 0,
        hasAnswerKey: false,
        qualityScore: null,
        originalPdfFileName: params.sourceFileName || `manual-${params.format}-import`,
        sourceQuestionPdfName: params.sourceFileName || `manual-${params.format}-import`,
        importSource: params.format,
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now
      };
      await saveParser2Job(job);
    }

    const existingQuestions = await getParser2Questions(job.id);
    const existingNums = new Set(existingQuestions.map(q => q.questionNumber));
    const batchSeenNums = new Set<number>();

    const skippedReasons: Array<{ questionNumber: number; reason: string }> = [];
    let duplicatesPrevented = 0;
    const toSave: Parser2Question[] = [];
    const importedKeys: Record<number, Parser2AnswerKeyEntry> = {};

    for (const draft of params.questions) {
      if (draft.selectedForImport === false) {
        skippedReasons.push({ questionNumber: draft.questionNumber, reason: 'Unchecked by admin in preview' });
        continue;
      }
      if (!draft.questionNumber || draft.questionNumber <= 0) {
        skippedReasons.push({ questionNumber: draft.questionNumber || 0, reason: 'Invalid question number' });
        continue;
      }
      if (batchSeenNums.has(draft.questionNumber)) {
        duplicatesPrevented++;
        skippedReasons.push({ questionNumber: draft.questionNumber, reason: 'Duplicate question number inside import batch' });
        continue;
      }
      if (params.importMissingOnly && existingNums.has(draft.questionNumber)) {
        duplicatesPrevented++;
        skippedReasons.push({ questionNumber: draft.questionNumber, reason: 'Already exists in target job (Import Missing Only)' });
        continue;
      }
      if (!draft.questionText || !draft.questionText.trim()) {
        skippedReasons.push({ questionNumber: draft.questionNumber, reason: 'Empty question statement' });
        continue;
      }

      batchSeenNums.add(draft.questionNumber);

      const formattedStem = formatScientificMathAndPowers(draft.questionText.trim());
      const normalizedOptions: Parser2Option[] = (['A', 'B', 'C', 'D'] as const).map(lbl => {
        const found = (draft.options || []).find(o => o.label === lbl);
        const val = formatScientificMathAndPowers((found?.value ?? found?.text ?? '').trim());
        return {
          label: lbl,
          text: val,
          value: val,
          imageUrl: found?.imageUrl,
          isVisualOption: Boolean(found?.imageUrl)
        };
      });

      const normAns = normalizeAnswerLabel(draft.correctAnswer);
      const qType = draft.questionType || detectQuestionType(formattedStem, draft.matchTable, draft.structuredTable, Boolean(draft.figureUrl));
      const strict = evaluateStrictQuestionStatus({
        questionType: qType,
        questionText: formattedStem,
        options: normalizedOptions,
        figureUrl: draft.figureUrl,
        matchTable: draft.matchTable,
        structuredTable: draft.structuredTable,
        confidenceScore: 95
      });

      if (normAns) {
        importedKeys[draft.questionNumber] = {
          questionNumber: draft.questionNumber,
          rawAnswer: normAns,
          verifiedAnswer: normAns,
          explanation: draft.explanation,
          sourceType: 'manual',
          confidence: 100,
          matchedAt: now
        };
      }

      toSave.push({
        id: `q-${job.id}-${draft.questionNumber}`,
        jobId: job.id,
        questionNumber: draft.questionNumber,
        subject: draft.subject || job.subject || 'Combined',
        chapter: draft.chapter || job.chapter || '',
        questionType: qType,
        questionText: formattedStem,
        options: normalizedOptions,
        correctAnswer: normAns,
        answerStatus: normAns ? 'matched' : 'answer_missing',
        answerKeyStatus: normAns ? 'matched' : 'missing',
        explanation: draft.explanation ? formatScientificMathAndPowers(draft.explanation.trim()) : undefined,
        sourcePageNumber: 1,
        sourcePageEnd: 1,
        sourcePages: [1],
        sourcePageRange: `Import (${params.format.toUpperCase()})`,
        figureUrl: draft.figureUrl || draft.imageAttachments?.[0]?.url,
        imageAttachments: draft.imageAttachments,
        matchTable: draft.matchTable,
        structuredTable: draft.structuredTable,
        extractionEngine: 'manual_import',
        providerUsed: `manual_${params.format}`,
        modelUsed: 'manual_import_parser_4.0',
        verificationStatus: strict.verificationStatus,
        confidenceScore: strict.confidenceScore,
        reviewRequired: strict.reviewRequired,
        reviewNotes: strict.reviewNotes,
        componentValidation: strict.componentValidation,
        createdAt: now,
        updatedAt: now
      });
    }

    // Safe chunked batch persistence with per-question failure reporting (never fake success on partial failure!)
    const savedNumbers: number[] = [];
    const failedQuestions: Array<{ questionNumber: number; error: string }> = [];
    const CHUNK_SIZE = 25;
    for (let start = 0; start < toSave.length; start += CHUNK_SIZE) {
      const chunk = toSave.slice(start, start + CHUNK_SIZE);
      try {
        if (isMerge || start > 0) {
          await upsertParser2Questions(job.id, chunk);
        } else {
          await saveParser2Questions(job.id, chunk);
        }
        savedNumbers.push(...chunk.map(q => q.questionNumber));
      } catch (chunkErr: any) {
        // Fall back to per-question upsert so we report EXACTLY which questions saved vs failed!
        for (const singleQ of chunk) {
          try {
            await upsertParser2Questions(job.id, [singleQ]);
            savedNumbers.push(singleQ.questionNumber);
          } catch (singleErr: any) {
            failedQuestions.push({
              questionNumber: singleQ.questionNumber,
              error: singleErr?.message || chunkErr?.message || 'Database write failed'
            });
          }
        }
      }
    }

    if (Object.keys(importedKeys).length > 0) {
      const existingKeys = await getParser2AnswerKeys(job.id);
      await saveParser2AnswerKeys(job.id, { ...existingKeys, ...importedKeys });
    }

    const finalQuestions = await getParser2Questions(job.id);
    const verifyRes = await verifyJobQuestionsPersisted(job.id, isMerge ? existingQuestions.length : savedNumbers.length);
    const finalKeys = await getParser2AnswerKeys(job.id);

    const expectedFinal =
      params.expectedCount && params.expectedCount > 0
        ? params.expectedCount
        : Math.max(job.expectedQuestionsManual || 0, finalQuestions.length);

    const report = validationEngine.auditQuestions(job.id, finalQuestions, expectedFinal || null, {
      savedQuestions: verifyRes.savedCount,
      expectedSource: params.expectedCount ? 'manual' : 'auto_detected'
    });
    await saveParser2ValidationReport(report);

    const hasPartialFailure = failedQuestions.length > 0;
    const needsReview = hasPartialFailure || report.criticalErrorsCount > 0 || finalQuestions.some(q => q.reviewRequired);
    const updatedJob: Parser2Job = {
      ...job,
      status: finalQuestions.length === 0 ? 'failed' : needsReview ? 'review_required' : 'completed',
      currentStage:
        finalQuestions.length === 0
          ? 'Import Saved 0 Questions'
          : hasPartialFailure
          ? `Partial Import: ${savedNumbers.length} Saved, ${failedQuestions.length} Failed`
          : needsReview
          ? `Imported ${savedNumbers.length} Qs (Total ${finalQuestions.length}) — Review Flagged`
          : `Imported ${savedNumbers.length} Qs (Total ${finalQuestions.length}) — Ready to Publish`,
      totalQuestions: finalQuestions.length,
      questionsDetected: Math.max(job.questionsDetected || 0, params.questions.length, finalQuestions.length),
      questionsSaved: verifyRes.savedCount,
      savedVerified: verifyRes.verified && verifyRes.savedCount > 0 && !hasPartialFailure,
      verifiedQuestions: finalQuestions.filter(q => q.verificationStatus === 'verified').length,
      reviewRequiredCount: finalQuestions.filter(q => q.reviewRequired).length,
      manuallyEditedCount: finalQuestions.filter(q => q.isManuallyEdited).length,
      hasAnswerKey: Object.keys(finalKeys).length > 0,
      figureCount: finalQuestions.reduce((acc, q) => acc + (q.imageAttachments?.length || (q.figureUrl ? 1 : 0)), 0),
      qualityScore: report.qualityScore,
      reconciliation: report.reconciliation,
      qualityBreakdown: report.qualityBreakdown,
      lastActivityAt: now,
      updatedAt: now
    };
    await saveParser2Job(updatedJob);

    await addParser2Log(
      job.id,
      'upload',
      `Manual ${params.format.toUpperCase()} import finished: Expected ${expectedFinal}, Detected ${params.questions.length}, Saved ${savedNumbers.length}, Failed ${failedQuestions.length}, Skipped ${skippedReasons.length} (${duplicatesPrevented} duplicates prevented).`,
      hasPartialFailure ? 'error' : savedNumbers.length > 0 ? 'success' : 'warn'
    );

    return {
      job: updatedJob,
      reconciliation: {
        expected: expectedFinal,
        detected: params.questions.length,
        saved: savedNumbers.length,
        skipped: skippedReasons.length,
        duplicatesPrevented,
        verifiedPersisted: verifyRes.verified && !hasPartialFailure,
        savedNumbers,
        failedQuestions,
        skippedReasons
      }
    };
  }
}

export const manualImportService = new ManualImportService();
