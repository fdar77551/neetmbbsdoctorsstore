import React from 'react';
import { MathRenderer } from './MathRenderer';

export interface RenderableImageAttachment {
  id?: string;
  url: string;
  placement: string;
  paragraphIndex?: number;
  tableRow?: number;
  tableCol?: number;
  caption?: string;
  alt?: string;
  alignment?: 'left' | 'center' | 'right';
  widthPercent?: number;
}

export interface RenderableTableCellMeta {
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
  imageUrl?: string;
  align?: 'left' | 'center' | 'right';
}

export interface RenderableStructuredTable {
  headers: string[];
  rows: string[][];
  cellMeta?: Record<string, RenderableTableCellMeta>;
  showBorders?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

export interface RenderableMatchTable {
  column1Header?: string;
  column2Header?: string;
  columnAHeader?: string;
  columnBHeader?: string;
  leftTableImageUrl?: string;
  rightTableImageUrl?: string;
  showBorders?: boolean;
  rows: Array<{
    leftKey?: string;
    leftText?: string;
    leftImageUrl?: string;
    rightKey?: string;
    rightText?: string;
    rightImageUrl?: string;
    colAKey?: string;
    colAText?: string;
    colAImageUrl?: string;
    colBKey?: string;
    colBText?: string;
    colBImageUrl?: string;
  }>;
}

export const AttachmentFigure: React.FC<{
  att: RenderableImageAttachment;
  onZoom?: (url: string) => void;
  compact?: boolean;
}> = ({ att, onZoom, compact = false }) => {
  const alignClass =
    att.alignment === 'left'
      ? 'items-start text-left'
      : att.alignment === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';
  const widthPct = Math.max(25, Math.min(100, att.widthPercent || 85));

  return (
    <figure className={`flex flex-col ${alignClass} my-2`}>
      <div style={{ width: `${widthPct}%`, maxWidth: '100%' }} className="inline-block">
        <img
          src={att.url}
          alt={att.alt || att.caption || 'Question diagram'}
          onClick={() => onZoom?.(att.url)}
          className={`${
            compact ? 'max-h-36' : 'max-h-64'
          } max-w-full object-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs ${
            onZoom ? 'cursor-zoom-in hover:opacity-95' : ''
          } ${att.alignment === 'center' || !att.alignment ? 'mx-auto' : ''}`}
        />
        {att.caption && (
          <figcaption className="mt-1 text-[11px] font-medium text-slate-500">
            {att.caption}
          </figcaption>
        )}
      </div>
    </figure>
  );
};

export const QuestionAttachmentStrip: React.FC<{
  attachments?: RenderableImageAttachment[];
  placements: string[];
  onZoom?: (url: string) => void;
  compact?: boolean;
}> = ({ attachments, placements, onZoom, compact }) => {
  if (!attachments || attachments.length === 0) return null;
  const matched = attachments.filter(a => a.url && placements.includes(a.placement));
  if (matched.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {matched.map((att, idx) => (
        <AttachmentFigure key={att.id || `${att.placement}-${idx}`} att={att} onZoom={onZoom} compact={compact} />
      ))}
    </div>
  );
};

export const QuestionStemWithAttachments: React.FC<{
  text: string;
  attachments?: RenderableImageAttachment[];
  onZoom?: (url: string) => void;
  textClassName?: string;
  compact?: boolean;
}> = ({ text, attachments, onZoom, textClassName = '', compact = false }) => {
  const beforeImgs = (attachments || []).filter(a => a.url && a.placement === 'before_question');
  const betweenImgs = (attachments || []).filter(a => a.url && a.placement === 'between_paragraphs');
  const arImgs = (attachments || []).filter(a => a.url && a.placement === 'assertion_reason');

  const paragraphs = text ? text.split(/\n{2,}|\n/) : [''];

  return (
    <div className="space-y-2">
      {beforeImgs.map((att, idx) => (
        <AttachmentFigure key={att.id || `before-${idx}`} att={att} onZoom={onZoom} compact={compact} />
      ))}

      {betweenImgs.length > 0 && paragraphs.length > 1 ? (
        <div className={`space-y-2 ${textClassName}`}>
          {paragraphs.map((para, pIdx) => {
            const afterThisPara = betweenImgs.filter(a => (a.paragraphIndex ?? 0) === pIdx);
            return (
              <React.Fragment key={pIdx}>
                {para.trim() && <MathRenderer text={para} className="block w-full" />}
                {afterThisPara.map((att, idx) => (
                  <AttachmentFigure key={att.id || `between-${pIdx}-${idx}`} att={att} onZoom={onZoom} compact={compact} />
                ))}
              </React.Fragment>
            );
          })}
          {betweenImgs
            .filter(a => (a.paragraphIndex ?? 0) >= paragraphs.length)
            .map((att, idx) => (
              <AttachmentFigure key={att.id || `between-tail-${idx}`} att={att} onZoom={onZoom} compact={compact} />
            ))}
        </div>
      ) : (
        <>
          <div className={textClassName}>
            <MathRenderer text={text} className="inline-block w-full" />
          </div>
          {betweenImgs.map((att, idx) => (
            <AttachmentFigure key={att.id || `between-solo-${idx}`} att={att} onZoom={onZoom} compact={compact} />
          ))}
        </>
      )}

      {arImgs.map((att, idx) => (
        <AttachmentFigure key={att.id || `ar-${idx}`} att={att} onZoom={onZoom} compact={compact} />
      ))}
    </div>
  );
};

export const RichMatchTableView: React.FC<{
  matchTable?: RenderableMatchTable;
  attachments?: RenderableImageAttachment[];
  defaultCol1?: string;
  defaultCol2?: string;
  onZoom?: (url: string) => void;
  titleHeader?: React.ReactNode;
}> = ({
  matchTable,
  attachments,
  defaultCol1 = 'Column-I',
  defaultCol2 = 'Column-II',
  onZoom,
  titleHeader
}) => {
  if (!matchTable || !matchTable.rows || matchTable.rows.length === 0) return null;

  const showBorders = matchTable.showBorders !== false;
  const col1Hdr = matchTable.column1Header || matchTable.columnAHeader || defaultCol1;
  const col2Hdr = matchTable.column2Header || matchTable.columnBHeader || defaultCol2;
  const leftTableAtts = (attachments || []).filter(a => a.url && a.placement === 'match_left_table');
  const rightTableAtts = (attachments || []).filter(a => a.url && a.placement === 'match_right_table');

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-2xs w-full max-w-2xl">
      {titleHeader}
      <table className="w-full min-w-[320px] text-left text-xs sm:text-sm border-collapse">
        <thead>
          <tr className={`bg-slate-100/90 text-slate-800 font-bold ${showBorders ? 'border-b border-slate-300' : ''}`}>
            <th className={`py-2 px-3 w-1/2 align-top ${showBorders ? 'border-r border-slate-300' : ''}`}>
              <MathRenderer as="span" text={col1Hdr} className="inline" />
              {matchTable.leftTableImageUrl && (
                <img
                  src={matchTable.leftTableImageUrl}
                  alt={col1Hdr}
                  onClick={() => onZoom?.(matchTable.leftTableImageUrl!)}
                  className="mt-1.5 max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-zoom-in"
                />
              )}
              {leftTableAtts.map((att, i) => (
                <AttachmentFigure key={att.id || `ml-${i}`} att={att} onZoom={onZoom} compact />
              ))}
            </th>
            <th className="py-2 px-3 w-1/2 align-top">
              <MathRenderer as="span" text={col2Hdr} className="inline" />
              {matchTable.rightTableImageUrl && (
                <img
                  src={matchTable.rightTableImageUrl}
                  alt={col2Hdr}
                  onClick={() => onZoom?.(matchTable.rightTableImageUrl!)}
                  className="mt-1.5 max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-zoom-in"
                />
              )}
              {rightTableAtts.map((att, i) => (
                <AttachmentFigure key={att.id || `mr-${i}`} att={att} onZoom={onZoom} compact />
              ))}
            </th>
          </tr>
        </thead>
        <tbody className={showBorders ? 'divide-y divide-slate-200' : ''}>
          {matchTable.rows.map((row, rIdx) => {
            const leftKey = row.leftKey ?? row.colAKey ?? '';
            const leftText = row.leftText ?? row.colAText ?? '';
            const leftImg = row.leftImageUrl ?? row.colAImageUrl;
            const rightKey = row.rightKey ?? row.colBKey ?? '';
            const rightText = row.rightText ?? row.colBText ?? '';
            const rightImg = row.rightImageUrl ?? row.colBImageUrl;

            return (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                <td className={`py-2 px-3 font-medium align-top ${showBorders ? 'border-r border-slate-200' : ''}`}>
                  <div className="flex items-start gap-1.5">
                    {leftKey && <span className="font-bold text-blue-700 shrink-0">{leftKey}</span>}
                    <div className="flex-1 min-w-0 space-y-1">
                      {leftText && <MathRenderer as="span" text={leftText} className="text-slate-900 inline" />}
                      {leftImg && (
                        <img
                          src={leftImg}
                          alt={`Row ${rIdx + 1} Left`}
                          onClick={() => onZoom?.(leftImg)}
                          className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-zoom-in block"
                        />
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 font-medium align-top">
                  <div className="flex items-start gap-1.5">
                    {rightKey && <span className="font-bold text-indigo-700 shrink-0">{rightKey}</span>}
                    <div className="flex-1 min-w-0 space-y-1">
                      {rightText && <MathRenderer as="span" text={rightText} className="text-slate-900 inline" />}
                      {rightImg && (
                        <img
                          src={rightImg}
                          alt={`Row ${rIdx + 1} Right`}
                          onClick={() => onZoom?.(rightImg)}
                          className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-zoom-in block"
                        />
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const RichStructuredTableView: React.FC<{
  table?: RenderableStructuredTable;
  attachments?: RenderableImageAttachment[];
  onZoom?: (url: string) => void;
  titleHeader?: React.ReactNode;
}> = ({ table, attachments, onZoom, titleHeader }) => {
  if (!table || !table.rows || table.rows.length === 0) return null;

  const showBorders = table.showBorders !== false;
  const tableAlign =
    table.alignment === 'center' ? 'text-center' : table.alignment === 'right' ? 'text-right' : 'text-left';
  const cellAttachments = (attachments || []).filter(a => a.url && a.placement === 'table_cell');

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-2xs w-full max-w-2xl">
      {titleHeader}
      <table className={`w-full min-w-[320px] text-xs sm:text-sm border-collapse ${tableAlign}`}>
        {table.headers && table.headers.length > 0 && (
          <thead>
            <tr className={`bg-slate-100/90 text-slate-800 font-bold ${showBorders ? 'border-b border-slate-300' : ''}`}>
              {table.headers.map((hdr, hIdx) => (
                <th
                  key={hIdx}
                  className={`py-2 px-3 ${showBorders ? 'border-r last:border-r-0 border-slate-300' : ''}`}
                >
                  <MathRenderer as="span" text={hdr} className="inline" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className={showBorders ? 'divide-y divide-slate-200' : ''}>
          {table.rows.map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
              {row.map((cell, cIdx) => {
                const meta = table.cellMeta?.[`${rIdx}:${cIdx}`];
                if (meta?.hidden) return null;
                const cellAlign =
                  meta?.align === 'center'
                    ? 'text-center'
                    : meta?.align === 'right'
                    ? 'text-right'
                    : meta?.align === 'left'
                    ? 'text-left'
                    : '';
                const matchedAtts = cellAttachments.filter(
                  a => a.tableRow === rIdx && a.tableCol === cIdx
                );
                return (
                  <td
                    key={cIdx}
                    rowSpan={meta?.rowSpan && meta.rowSpan > 1 ? meta.rowSpan : undefined}
                    colSpan={meta?.colSpan && meta.colSpan > 1 ? meta.colSpan : undefined}
                    className={`py-2 px-3 font-medium text-slate-900 align-top ${cellAlign} ${
                      showBorders ? 'border-r last:border-r-0 border-slate-200' : ''
                    }`}
                  >
                    {cell && <MathRenderer as="span" text={cell} className="inline" />}
                    {meta?.imageUrl && (
                      <img
                        src={meta.imageUrl}
                        alt={`Cell ${rIdx + 1},${cIdx + 1}`}
                        onClick={() => onZoom?.(meta.imageUrl!)}
                        className="mt-1 max-h-24 object-contain rounded border border-slate-200 bg-white p-1 cursor-zoom-in block"
                      />
                    )}
                    {matchedAtts.map((att, idx) => (
                      <AttachmentFigure key={att.id || `tc-${rIdx}-${cIdx}-${idx}`} att={att} onZoom={onZoom} compact />
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
