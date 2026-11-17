// NCERTify AI Parser 2.0 - Source-Aware Layout Engine
// High-precision two-column bilingual separation, question segmentation, and option extraction

import { Parser2Question, Parser2Subject } from './types';
import { formatScientificMathAndPowers } from '../../lib/mockTestData';

export interface ExtractedQuestionRecord {
  questionNumber: number;
  questionText: string;
  options: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string; rawValue?: string }>;
  detectedType: Parser2Question['questionType'];
  hasDiagram: boolean;
  diagramBoundingBox?: [number, number, number, number];
  isChemistryStructure: boolean;
  matchTableData?: {
    columnAHeader?: string;
    columnBHeader?: string;
    rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }>;
  };
  structuredTableData?: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
  reviewRequired: boolean;
  reviewNotes?: string;
  confidenceScore: number;
}

export interface VisualRequirementResult {
  needsFigure: boolean;
  expectsVisualOptions: boolean;
  expectedType: 'graph' | 'diagram' | 'chemical_structure' | 'unknown';
  reason?: string;
}

/**
 * Source-aware visual requirement detector.
 * Identifies when a NEET question relies on a diagram, apparatus figure, graph, circuit, or chemical structure.
 */
export function detectVisualRequirement(
  questionText: string,
  optionsText: string = '',
  reviewNotes: string = ''
): VisualRequirementResult {
  const combined = `${questionText || ''} ${optionsText || ''} ${reviewNotes || ''}`.trim();
  const qLower = (questionText || '').toLowerCase();

  // 1. Explicit graph cues (covers V-I characteristic, solar cell graph, P-V, X-Y curves, etc.)
  const graphRegex = /(?:given|following|shown|adjoining|below)\s+(?:the\s+)?(?:graph|plot|curve|v-i\s+characteristic|i-v\s+characteristic|p-v\s+diagram|p-t\s+diagram|v-t\s+graph)|v-i\s+characteristic|i-v\s+characteristic|graph\s+represents|graph\s+shows|relates\s+to\s+a\s+.*graph|points?\s+[ab]\s+and\s+[bc]\s+represent|graph\s+between/i;
  if (graphRegex.test(combined)) {
    return {
      needsFigure: true,
      expectsVisualOptions: false,
      expectedType: 'graph',
      reason: 'Question explicitly references a graph, plot, or characteristic curve.'
    };
  }

  // 2. Explicit diagram / apparatus / circuit / optical figure cues (catches "The diagram shows a venturimeter", "circuit diagram shown below", etc.)
  const diagramRegex = /(?:the\s+)?(?:circuit\s+|ray\s+|schematic\s+|block\s+)?diagram\s+(?:shows|shown|given|below|above)|shown\s+in\s+(?:the\s+)?(?:fig(?:ure)?|diagram|circuit)|(?:following|given|adjoining|adjacent|below)\s+(?:circuit\s+|ray\s+)?(?:fig(?:ure)?|diagram|circuit|arrangement|network|apparatus|setup)|in\s+the\s+(?:(?:circuit|ray|experimental|block)\s+)?(?:fig(?:ure)?|circuit|diagram)\s+(?:shown|given|below|above)|venturimeter|wheatstone\s+bridge|logic\s+gate|truth\s+table\s+for\s+the\s+given|pulley\s+system|inclined\s+plane\s+shown|spring[- ]block\s+system|p-n\s+junction\s+circuit|ray\s+diagram|convex\s+lens\s+as\s+shown|concave\s+mirror\s+as\s+shown|branching\s+pipe|fluid\s+is\s+flowing\s+through.*diagram|speed\s+of\s+water\s+at\s+[xy]\b|दिए\s+गए\s+चित्र|चित्र\s+में\s+दर्शा|परिपथ\s+चित्र/i;
  if (diagramRegex.test(combined)) {
    return {
      needsFigure: true,
      expectsVisualOptions: false,
      expectedType: 'diagram',
      reason: 'Question explicitly references an experimental diagram, apparatus, or circuit figure.'
    };
  }

  // 3. Visual/structural chemistry prompts (often visual options like Q74 "Anti aromatic molecule is", or reaction scheme)
  const chemVisualOptionPrompts = /(?:anti\s*[- ]?aromatic|aromatic\s+(?:molecule|compound|species)\s+is|which\s+of\s+the\s+following\s+(?:is|are)\s+(?:aromatic|anti[- ]?aromatic|chiral|optically\s+active)|identify\s+(?:the\s+)?(?:major\s+)?product\s*(?:\([A-Z]\)|$)|major\s+product\s+of\s+(?:this|the\s+following)\s+reaction\s*(?:is)?\s*[:\?]?$)/i;
  const expectsVisualOptions = chemVisualOptionPrompts.test(qLower) && !/among\s+[a-z0-9,\s]+$/i.test(qLower);

  const chemDiagramInStem = /(?:major\s+product\s+of\s+the\s+(?:given|following)\s+reaction|the\s+given\s+structure|structure\s+shown\s+below|given\s+compound\s+is|iupac\s+name\s+of\s+(?:the\s+)?(?:given\s+)?compound\s*(?:is|:|\?)|identify\s+[A-Z]\s+and\s+[A-Z]\s+in\s+the\s+following\s+reaction|following\s+reaction\s+sequence)/i;
  if (chemDiagramInStem.test(qLower)) {
    return {
      needsFigure: true,
      expectsVisualOptions,
      expectedType: 'chemical_structure',
      reason: 'Chemistry question requires structural diagram or reaction scheme from PDF.'
    };
  }

  // Also check if Gemini reviewNotes explicitly noticed a figure/graph that was not attached
  if (/(?:image\s+graph|refers\s+to\s+a\s+figure|figure\s+is\s+missing|diagram\s+is\s+missing)/i.test(reviewNotes || '')) {
    return {
      needsFigure: true,
      expectsVisualOptions,
      expectedType: /graph/i.test(reviewNotes) ? 'graph' : 'diagram',
      reason: 'Visual audit noted a missing figure or graph.'
    };
  }

  return {
    needsFigure: false,
    expectsVisualOptions,
    expectedType: 'unknown'
  };
}

/**
 * Classifies whether a text option is a clean linear/condensed chemical formula or text option
 * (e.g. CH3-C(Cl)=CH2, CH3-CH(Cl)-CH2Cl, CH3-C(Cl)2-CH3, H2SO4, KMnO4, NaOH)
 * vs. empty/garbled/structural artwork requiring an image crop.
 */
export function isSimpleLinearChemicalFormula(text: string | undefined | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 90) return false;
  if (/^\[Figure\s+[A-D]\]$/i.test(trimmed)) return false;
  if (/^(?:\(?Empty|Missing|Option)/i.test(trimmed)) return false;

  // Multi-line ASCII structural drawings or broken line noise are NOT simple linear text
  if (trimmed.includes('\n') || /[│┌┐└┘├┤┬┴┼═║╔╗╚╝]/.test(trimmed)) return false;

  // Check if it looks like a clean condensed formula / organic chain / IUPAC / simple salt
  const hasChemicalTokens = /(?:CH|NH|OH|SH|Cl|Br|NO|SO|PO|CO|CN|Fe|Cu|Zn|Al|Mg|Ca|Ba|Na|K|H|C|N|O)[₂₃₄₅₆₀-₉0-9\(\)\-\=≡]*/.test(trimmed);
  const validLinearChars = /^[A-Za-z0-9₀-₉⁰-⁹⁺⁻\s\(\)\[\]\-\–\=\≡\+\,\.\·\/\:→⇌]+$/.test(trimmed);

  return hasChemicalTokens && validLinearChars;
}

/**
 * Returns true if all 4 options A-D are clean editable text (simple linear chemical formulas or plain text)
 * with zero missing/placeholder entries, meaning we should NOT attach redundant broken option image crops.
 */
export function isAllSimpleChemicalFormulaOptions(
  options: Array<{ value?: string; text?: string }>
): boolean {
  if (!options || options.length < 4) return false;
  let validChemCount = 0;
  for (const opt of options) {
    const val = (opt.value || opt.text || '').trim();
    if (!val || /^\[Figure\s+[A-D]\]$/i.test(val) || isPlaceholderOptionText(val)) {
      return false;
    }
    if (isSimpleLinearChemicalFormula(val)) {
      validChemCount++;
    }
  }
  // If all 4 options are clean text and at least 2 match linear chemical formula tokens
  return validChemCount >= 2;
}

export function formatSourcePageRange(
  pages: number[] | undefined,
  fallbackPage: number = 1
): { startPage: number; endPage: number; sourcePages: number[]; label: string } {
  const valid = Array.from(
    new Set((pages || []).filter((p) => Number.isFinite(p) && p >= 1).map((p) => Math.round(p)))
  ).sort((a, b) => a - b);
  if (valid.length === 0) {
    const safe = Math.max(1, Math.round(fallbackPage || 1));
    return { startPage: safe, endPage: safe, sourcePages: [safe], label: `Page ${safe}` };
  }
  const startPage = valid[0];
  const endPage = valid[valid.length - 1];
  const label = startPage === endPage ? `Page ${startPage}` : `Page ${startPage}–${endPage}`;
  return { startPage, endPage, sourcePages: valid, label };
}

export function isPlaceholderOptionText(val: string | undefined | null): boolean {
  if (!val) return true;
  const t = val.trim().toLowerCase();
  return (
    !t ||
    /insufficient\s+data/i.test(t) ||
    /not\s+(?:visible|provided|available|readable|shown)\s+in\s+(?:the\s+)?(?:snippet|image|crop|page)/i.test(t) ||
    /cannot\s+be\s+(?:determined|read|extracted)/i.test(t) ||
    /^\[?\s*(?:illegible|unclear|unreadable|missing\s+option(?:\s+text)?|data\s+missing|not\s+available)\s*\]?$/i.test(t) ||
    t === '[missing option text]' ||
    t === 'missing option' ||
    t === '(empty - click edit to add)' ||
    t === '[empty]' ||
    t === 'empty' ||
    /^(?:option\s*[\(\[]?[a-d1-4][\)\]]?|[\(\[][a-d1-4][\)\]])$/i.test(t)
  );
}

/**
 * Detects whether an extracted question statement looks truncated, cut-off, or mid-sentence.
 */
export function isQuestionTextTruncated(text: string | undefined | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 12) return true;

  // Starts lowercase (except valid scientific prefixes like pH, pKa, m/z, α, β, γ, Δ)
  if (/^[a-z]/.test(trimmed) && !/^(?:p[HKa]|m\/z|e\/m|n[- ]type|p[- ]type|d[- ]orbitals|cis-|trans-)/.test(trimmed)) {
    return true;
  }

  // Starts with dangling continuation punctuation or relative clause
  if (/^(?:and\s+|or\s+|with\s+the\s+|as\s+shown\s+in|then\s+the\s+|[,;\)\]])/i.test(trimmed)) {
    return true;
  }

  // Ends dangling mid-phrase (allow complete NEET stems >= 25 chars ending in "is"/"are" before options)
  if (/\b(?:of|the|a|an|with|for|between|when|where|which|and|from|to|in|at|by|as)\s*$/i.test(trimmed)) {
    return true;
  }
  if (trimmed.length < 25 && /\b(?:is|are|was|were)\s*$/i.test(trimmed)) {
    return true;
  }

  return false;
}

export function isMatchQuestionPrompt(text: string | undefined | null): boolean {
  if (!text) return false;
  return /match\s+(?:the\s+)?(?:following\s+)?(?:column|list)|list\s*[-–]?\s*i\b.*list\s*[-–]?\s*ii\b|column\s*[-–]?\s*i\b.*column\s*[-–]?\s*ii\b|सूची|कॉलम/i.test(text);
}

export function isTableQuestionPrompt(text: string | undefined | null): boolean {
  if (!text) return false;
  if (isMatchQuestionPrompt(text)) return false;
  return /(?:given|following|below|adjoining)\s+table|table\s+(?:shows|gives|below)|from\s+the\s+(?:data\s+in\s+)?table/i.test(text);
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractHtmlTableRows(rawText: string): string[][] {
  if (!rawText || !/<table[\s>]/i.test(rawText)) return [];
  const tableMatch = rawText.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];
  const trMatches = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows: string[][] = [];
  for (const tr of trMatches) {
    const cellMatches = [...tr[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)];
    const cells = cellMatches.map(c => decodeBasicHtmlEntities(c[1]));
    if (cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }
  return rows;
}

/**
 * Extracts a structured Match-the-Column / List I vs List II table from multi-format text:
 * - HTML <table>...</table> blocks emitted by Mistral OCR
 * - Side-by-side rows: `(a) Zygotene  (i) Synapsis` or `A. foo  I. bar`
 * - Markdown pipe tables: `| List-I | List-II |`
 * - Vertical two-section blocks: `List - I (a) ... (b) ... List - II (i) ... (ii) ...`
 */
export function parseMatchTableFromText(
  rawText: string
): { columnAHeader: string; columnBHeader: string; rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }> } | undefined {
  if (!rawText) return undefined;
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let columnAHeader = 'List - I';
  let columnBHeader = 'List - II';

  // Strategy 0: HTML <table> emitted by Mistral OCR
  const htmlRows = extractHtmlTableRows(text);
  if (htmlRows.length >= 2) {
    const firstRow = htmlRows[0];
    const hasHeaderWords = firstRow.some(c => /(?:list|column|सूची|कॉलम|category|group)/i.test(c));
    const startIdx = hasHeaderWords ? 1 : 0;
    if (hasHeaderWords && firstRow.length >= 2) {
      columnAHeader = firstRow[0] || columnAHeader;
      columnBHeader = firstRow[1] || columnBHeader;
    }
    const rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }> = [];
    for (let i = startIdx; i < htmlRows.length; i++) {
      const cols = htmlRows[i];
      if (cols.length < 2) continue;
      if (cols.length >= 4 && /^(?:\(?[a-dA-D1-4]\)?\.?)$/.test(cols[0])) {
        rows.push({
          colAKey: cols[0].replace(/[().]/g, '').trim(),
          colAText: cols[1].trim(),
          colBKey: cols[2].replace(/[().]/g, '').trim() || ['i', 'ii', 'iii', 'iv'][rows.length] || String(rows.length + 1),
          colBText: cols[3].trim()
        });
      } else {
        const leftM = cols[0].match(/^\(?([A-Da-d1-4])\)?[\.\):]?\s*(.+)$/);
        const rightM = cols[1].match(/^\(?([ivxIVX1-4P-Sp-s]+)\)?[\.\):]?\s*(.+)$/);
        rows.push({
          colAKey: leftM ? leftM[1] : String.fromCharCode(97 + rows.length),
          colAText: leftM ? leftM[2].trim() : cols[0].trim(),
          colBKey: rightM ? rightM[1] : ['i', 'ii', 'iii', 'iv'][rows.length] || String(rows.length + 1),
          colBText: rightM ? rightM[2].trim() : cols[1].trim()
        });
      }
    }
    if (rows.length >= 2) {
      return { columnAHeader, columnBHeader, rows };
    }
  }

  // Strategy 1: Markdown pipe table
  const pipeLines = lines.filter(l => l.includes('|'));
  if (pipeLines.length >= 3) {
    const cleanPipeRows = pipeLines
      .filter(l => !/^\|?[\s\-:|]+\|?$/.test(l))
      .map(l => l.split('|').map(c => c.trim()).filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === '')));
    if (cleanPipeRows.length >= 3) {
      const hdr = cleanPipeRows[0];
      if (hdr.length >= 2) {
        columnAHeader = hdr[0] || columnAHeader;
        columnBHeader = hdr[1] || columnBHeader;
      }
      const rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }> = [];
      for (let i = 1; i < cleanPipeRows.length; i++) {
        const cols = cleanPipeRows[i];
        if (cols.length < 2) continue;
        const leftM = cols[0].match(/^\(?([A-Da-d1-4])\)?[\.\):]?\s*(.+)$/);
        const rightM = cols[1].match(/^\(?([ivxIVX1-4P-Sp-s]+)\)?[\.\):]?\s*(.+)$/);
        rows.push({
          colAKey: leftM ? leftM[1] : String.fromCharCode(97 + rows.length),
          colAText: leftM ? leftM[2].trim() : cols[0].trim(),
          colBKey: rightM ? rightM[1] : ['i', 'ii', 'iii', 'iv'][rows.length] || String(rows.length + 1),
          colBText: rightM ? rightM[2].trim() : cols[1].trim()
        });
      }
      if (rows.length >= 2) {
        return { columnAHeader, columnBHeader, rows };
      }
    }
  }

  // Strategy 2: Two-section vertical blocks ("List - I" followed later by "List - II")
  // Prefer line-start headers so "Match List - I with List - II." in the prompt stem does not swallow the match.
  const lineStart1 = /(?:^|\n)[ \t]*(?:List|Column)\s*[-–]?\s*(?:I|1|A)\b/gi;
  const lineStart2 = /(?:^|\n)[ \t]*(?:List|Column)\s*[-–]?\s*(?:II|2|B)\b/gi;
  const lineMatches1 = [...text.matchAll(lineStart1)];
  const lineMatches2 = [...text.matchAll(lineStart2)];

  let list1Idx = lineMatches1.length > 0 ? (lineMatches1[lineMatches1.length - 1].index ?? -1) : -1;
  let list2Idx = lineMatches2.length > 0 ? (lineMatches2[lineMatches2.length - 1].index ?? -1) : -1;

  if (list1Idx < 0 || list2Idx <= list1Idx) {
    // Fallback for single-line flattened text: skip "List - I with List - II" prompt prefix
    const all1 = [...text.matchAll(/\b(?:List|Column)\s*[-–]?\s*(?:I|1|A)\b(?!\s*with\b)/gi)];
    const all2 = [...text.matchAll(/(?<!with\s+)\b(?:List|Column)\s*[-–]?\s*(?:II|2|B)\b/gi)];
    if (all1.length > 0 && all2.length > 0) {
      list1Idx = all1[all1.length - 1].index ?? -1;
      list2Idx = all2[all2.length - 1].index ?? -1;
    }
  }

  if (list1Idx >= 0 && list2Idx > list1Idx) {
    const part1 = text.slice(list1Idx, list2Idx);
    const part2All = text.slice(list2Idx);
    // Stop part2 before option choices like "(1) a-iv" or "A. a-iv"
    const optCut = part2All.search(/(?:^|\n)\s*(?:\([1-4A-D]\)\s*(?:[a-dA-D]\s*[-–>:]|[A-D]\s*-\s*[iIvVxX1-4]))/);
    const part2 = optCut > 0 ? part2All.slice(0, optCut) : part2All;

    const extractItems = (block: string, keyPattern: RegExp) => {
      const items: Array<{ key: string; text: string }> = [];
      const bLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      for (const rawLine of bLines) {
        const l = rawLine.replace(/^(?:List|Column)\s*[-–]?\s*(?:II|I|1|2|A|B)\b[:.\-\s]*/i, '').trim();
        if (!l) continue;
        const m = l.match(keyPattern);
        if (m) {
          items.push({ key: m[1].trim(), text: m[2].trim() });
        } else if (items.length > 0 && !/^(?:\([1-4A-D]\)|Choose\s+the)/i.test(l)) {
          items[items.length - 1].text = `${items[items.length - 1].text} ${l}`.trim();
        }
      }
      return items;
    };

    const leftItems = extractItems(part1, /^\(?([a-dA-D1-4])\)?[\.\):]?\s+(.+)$/);
    const rightItems = extractItems(part2, /^\(?((?:iv|iii|ii|i|IV|III|II|I|[1-4]|[p-sP-S]))\)?[\.\):]?\s+(.+)$/);

    if (leftItems.length >= 2 && rightItems.length >= 2) {
      const len = Math.max(leftItems.length, rightItems.length);
      const rows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }> = [];
      for (let i = 0; i < len; i++) {
        rows.push({
          colAKey: leftItems[i]?.key || String.fromCharCode(97 + i),
          colAText: leftItems[i]?.text || '',
          colBKey: rightItems[i]?.key || ['i', 'ii', 'iii', 'iv'][i] || String(i + 1),
          colBText: rightItems[i]?.text || ''
        });
      }
      if (rows.filter(r => r.colAText && r.colBText).length >= 2) {
        return { columnAHeader, columnBHeader, rows };
      }
    }
  }

  // Strategy 3: Side-by-side single-line rows
  const sideRows: Array<{ colAKey: string; colAText: string; colBKey: string; colBText: string }> = [];
  for (const line of lines) {
    const hdrMatch = line.match(/^\s*(Column\s*[I1A]+|List\s*[-–]?\s*[I1A]+)\s+(Column\s*[I2B]+|List\s*[-–]?\s*[I2B]+)\s*$/i);
    if (hdrMatch) {
      columnAHeader = hdrMatch[1].trim();
      columnBHeader = hdrMatch[2].trim();
      continue;
    }
    const rowMatch = line.match(
      /^\s*(?:\(?([A-Da-d])\)?|\b([A-Da-d])[\.:])\s+(.+?)\s{2,}(?:\(?((?:iv|iii|ii|i|IV|III|II|I|[1-4]|[p-sP-S]))\)?|\b((?:iv|iii|ii|i|IV|III|II|I|[1-4]|[p-sP-S]))[\.:])\s+(.+)$/
    );
    if (rowMatch) {
      sideRows.push({
        colAKey: (rowMatch[1] || rowMatch[2]).trim(),
        colAText: rowMatch[3].trim(),
        colBKey: (rowMatch[4] || rowMatch[5]).trim(),
        colBText: rowMatch[6].trim()
      });
    }
  }
  if (sideRows.length >= 2) {
    return { columnAHeader, columnBHeader, rows: sideRows };
  }

  return undefined;
}

/**
 * Extracts a general multi-column table from HTML <table> or Markdown pipe tables for table_based questions.
 */
export function parseStructuredTableFromText(
  rawText: string
): { headers: string[]; rows: string[][]; caption?: string } | undefined {
  if (!rawText) return undefined;

  // Strategy 1: HTML <table> emitted by Mistral OCR
  const htmlRows = extractHtmlTableRows(rawText);
  if (htmlRows.length >= 2) {
    const colCount = Math.max(...htmlRows.map(r => r.length));
    if (colCount >= 2) {
      const normalized = htmlRows.map(r => {
        const padded = [...r];
        while (padded.length < colCount) padded.push('');
        return padded.slice(0, colCount);
      });
      return { headers: normalized[0], rows: normalized.slice(1) };
    }
  }

  // Strategy 2: Markdown pipe table
  const lines = rawText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const pipeLines = lines.filter(l => l.includes('|'));
  if (pipeLines.length < 2) return undefined;

  const parsedRows = pipeLines
    .filter(l => !/^\|?[\s\-:|]+\|?$/.test(l))
    .map(l =>
      l
        .split('|')
        .map(c => c.trim())
        .filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''))
    )
    .filter(r => r.length >= 2);

  if (parsedRows.length < 2) return undefined;
  const headers = parsedRows[0];
  const rows = parsedRows.slice(1).map(r => {
    const padded = [...r];
    while (padded.length < headers.length) padded.push('');
    return padded.slice(0, headers.length);
  });

  if (rows.length === 0) return undefined;
  return { headers, rows };
}

export class Parser2LayoutEngine {
  /**
   * Separates bilingual two-column page text into clean English text.
   * Never truncates long single-column English lines!
   */
  public extractEnglishColumn(pageText: string): string {
    if (!pageText) return '';
    const lines = pageText.split('\n');
    const englishLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Ignore section headers that span across
      if (/^(?:PHYSICS|CHEMISTRY|BIOLOGY|BOTANY|ZOOLOGY)\s*$/i.test(line.trim())) {
        englishLines.push(line.trim());
        continue;
      }

      // Check for Devanagari script (Hindi column)
      const devIdx = line.search(/[\u0900-\u097F]/);
      if (devIdx > 0) {
        const prefix = line.slice(0, devIdx);
        // Look for wide space gap or repeated question number before Hindi text
        const matchGap = prefix.search(/\s{3,}\d{1,3}[\.\)]\s*$/);
        if (matchGap > 5) {
          englishLines.push(prefix.slice(0, matchGap).trim());
        } else {
          englishLines.push(prefix.trim());
        }
      } else if (devIdx === 0) {
        // Pure Hindi line — skip
        continue;
      } else {
        // Only split on a true multi-column gap (>= 6 spaces after col 32), NEVER truncate long English prose lines!
        if (line.length > 55) {
          const midGap = line.slice(32).search(/\s{6,}\S/);
          if (midGap > 0) {
            englishLines.push(line.slice(0, 32 + midGap).trim());
          } else {
            englishLines.push(line.trim());
          }
        } else {
          englishLines.push(line.trim());
        }
      }
    }

    return englishLines.filter(l => l.length > 0).join('\n');
  }

  /**
   * Parse question records from English page text
   */
  public parseQuestionsFromText(
    pageText: string,
    subject: Parser2Subject = 'Combined',
    _pageNumber: number = 1
  ): ExtractedQuestionRecord[] {
    const englishText = this.extractEnglishColumn(pageText);
    const results: ExtractedQuestionRecord[] = [];

    if (!englishText) return results;

    // Detect question boundaries: e.g. "1.", "2.", "18.", "**1.**"
    const qSplitter = /(?:^|\n)\s*(?:\*\*)?(\d{1,3})\s*[\.\)]\s*(?:\*\*)?/g;
    const matches: Array<{ qNum: number; index: number }> = [];

    let m;
    while ((m = qSplitter.exec(englishText)) !== null) {
      matches.push({ qNum: parseInt(m[1], 10), index: m.index });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : englishText.length;
      let chunk = englishText.slice(current.index, nextIndex).trim();

      // Strip leading question numbering (e.g. "1. " or "18. ")
      chunk = chunk.replace(/^(?:\*\*)?\d{1,3}\s*[\.\)]\s*(?:\*\*)?/, '').trim();

      // Find where options start: support (1)/(A)/[1]/[A]/1)/A) while protecting Assertion (A), Reason (R), and List-I (a)-(d)
      const optStartPattern = /(?:(?:^|\n)\s*(?:\([1-4]\)|\[[1-4]\]|[1-4]\)|\([A-D]\)(?!\s*(?::|-|is\b))|\[[A-D]\])|(?:\s{2,}|\s)(?:\([1-4]\)|\[[1-4]\]))/;
      const optStartMatch = chunk.search(optStartPattern);
      let statement = optStartMatch > 0 ? chunk.slice(0, optStartMatch).trim() : chunk;
      const optionsText = optStartMatch > 0 ? chunk.slice(optStartMatch).trim() : '';

      // Preserve line structure for Match/Table detection, normalize stem separately
      statement = formatScientificMathAndPowers(statement.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' '));

      const options: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string; rawValue?: string }> = [
        { label: 'A', value: '' },
        { label: 'B', value: '' },
        { label: 'C', value: '' },
        { label: 'D', value: '' }
      ];

      if (optionsText) {
        // Split on two-column or sequential option markers: (1)..(4), [1]..[4], 1)..4), (A)..(D), [A]..[D], or line-start A)/A.
        const optRegex = /(?:(?:^|\s)(?:\(([1-4A-D])\)|\[([1-4A-D])\]|([1-4])\))|(?:^|\n)\s*([A-D])[\.\)])\s*([\s\S]*?)(?=(?:(?:^|\s)(?:\([1-4A-D]\)|\[[1-4A-D]\]|[1-4]\))|(?:^|\n)\s*[A-D][\.\)])|$)/g;
        let om;
        while ((om = optRegex.exec(optionsText)) !== null) {
          const rawLbl = (om[1] || om[2] || om[3] || om[4]).toUpperCase();
          const lbl: 'A' | 'B' | 'C' | 'D' = (rawLbl === '1' || rawLbl === 'A') ? 'A'
            : (rawLbl === '2' || rawLbl === 'B') ? 'B'
            : (rawLbl === '3' || rawLbl === 'C') ? 'C'
            : 'D';

          const optVal = (om[5] || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

          // CRITICAL DEDUPLICATION:
          // Check if optVal is accidentally duplicating the question statement
          if (statement && optVal) {
            const stemStart = statement.toLowerCase().slice(0, 25).trim();
            if (stemStart.length >= 10 && optVal.toLowerCase().includes(stemStart)) {
              continue; // Reject option that contains question statement
            }
          }

          // Format math & powers
          const formatted = formatScientificMathAndPowers(optVal);

          const target = options.find(o => o.label === lbl);
          if (target && formatted) {
            // Keep the more detailed value if multiple appear
            if (!target.value || formatted.length > target.value.length) {
              target.value = formatted;
              target.rawValue = optVal;
            }
          }
        }
      }

      // Check for Match the Column & Structured Tables BEFORE stripping newlines
      const isMatch = isMatchQuestionPrompt(chunk);
      const isTablePrompt = isTableQuestionPrompt(chunk);
      const matchTableData = isMatch ? parseMatchTableFromText(chunk) : undefined;
      const structuredTableData = !isMatch && isTablePrompt ? parseStructuredTableFromText(chunk) : undefined;

      const visualReq = detectVisualRequirement(statement, optionsText);
      const anyMissingOptions = options.some(o => !o.value || o.value.trim().length === 0);
      const missingMatchTable = isMatch && (!matchTableData || matchTableData.rows.length === 0);
      const missingStructuredTable = isTablePrompt && (!structuredTableData || structuredTableData.rows.length === 0);

      const notes: string[] = [];
      if (anyMissingOptions) notes.push('One or more options could not be extracted; verify options before publishing.');
      if (missingMatchTable) notes.push('Match-the-Column question is missing its List I / List II table rows.');
      if (missingStructuredTable) notes.push('Table-based question is missing its structured data table.');
      if (visualReq.needsFigure && visualReq.reason) notes.push(visualReq.reason);

      results.push({
        questionNumber: current.qNum,
        questionText: statement,
        options,
        detectedType: isMatch
          ? 'match_the_column'
          : isTablePrompt
          ? 'table_based'
          : visualReq.needsFigure
          ? 'diagram_based'
          : 'single_mcq',
        hasDiagram: visualReq.needsFigure,
        diagramBoundingBox: undefined,
        isChemistryStructure: subject === 'Chemistry' && (visualReq.needsFigure || visualReq.expectsVisualOptions),
        matchTableData,
        structuredTableData,
        confidenceScore: anyMissingOptions || missingMatchTable ? 25 : visualReq.needsFigure ? 60 : 90,
        reviewRequired: anyMissingOptions || missingMatchTable || missingStructuredTable || visualReq.needsFigure,
        reviewNotes: notes.length > 0 ? notes.join(' ') : undefined
      });
    }

    return results;
  }
}

export const parser2LayoutEngine = new Parser2LayoutEngine();
