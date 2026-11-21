import React, { useState } from 'react';
import {
  Table as TableIcon, Plus, Trash2, Upload, Merge, SplitSquareHorizontal,
  Eye, EyeOff, Loader2, Grid, Columns
} from 'lucide-react';
import { Parser2MatchTable, Parser2StructuredTable, Parser2TableCellMeta } from '../../services/parser2/types';

interface Props {
  jobId: string;
  questionId: string;
  questionNumber: number;
  matchTable?: Parser2MatchTable;
  structuredTable?: Parser2StructuredTable;
  onChangeMatchTable: (next?: Parser2MatchTable) => void;
  onChangeStructuredTable: (next?: Parser2StructuredTable) => void;
}

export const Parser2TableEditor: React.FC<Props> = ({
  jobId,
  questionId,
  questionNumber,
  matchTable,
  structuredTable,
  onChangeMatchTable,
  onChangeStructuredTable
}) => {
  const [mode, setMode] = useState<'match' | 'data'>(
    matchTable?.rows?.length ? 'match' : structuredTable?.rows?.length ? 'data' : 'match'
  );
  const [showPreview, setShowPreview] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  const uploadCellImage = async (file: File, tag: string): Promise<string | null> => {
    setUploadingKey(tag);
    try {
      const fd = new FormData();
      fd.append('imageFile', file);
      fd.append('questionId', questionId);
      fd.append('questionNumber', String(questionNumber));
      fd.append('placement', 'table_cell');
      const res = await fetch(`/api/parser2/jobs/${jobId}/media/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.success && data.url) return data.url;
    } catch {}
    finally {
      setUploadingKey(null);
    }
    return null;
  };

  // --- Match-the-Column Helpers ---
  const initMatchTable = () => {
    onChangeStructuredTable(undefined);
    onChangeMatchTable({
      columnAHeader: 'List I',
      columnBHeader: 'List II',
      colATitle: 'List I',
      colBTitle: 'List II',
      showBorders: true,
      rows: [
        { colAKey: 'A', colAText: '', colBKey: 'I', colBText: '' },
        { colAKey: 'B', colAText: '', colBKey: 'II', colBText: '' },
        { colAKey: 'C', colAText: '', colBKey: 'III', colBText: '' },
        { colAKey: 'D', colAText: '', colBKey: 'IV', colBText: '' }
      ]
    });
    setMode('match');
  };

  const updateMatchRow = (idx: number, patch: Partial<Parser2MatchTable['rows'][number]>) => {
    if (!matchTable) return;
    const nextRows = matchTable.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChangeMatchTable({ ...matchTable, rows: nextRows });
  };

  const addMatchRow = () => {
    if (!matchTable) return initMatchTable();
    const idx = matchTable.rows.length;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][idx] || String(idx + 1);
    onChangeMatchTable({
      ...matchTable,
      rows: [...matchTable.rows, { colAKey: String.fromCharCode(65 + idx), colAText: '', colBKey: roman, colBText: '' }]
    });
  };

  // --- Structured Data Table Helpers ---
  const initStructuredTable = () => {
    onChangeMatchTable(undefined);
    onChangeStructuredTable({
      headers: ['Parameter', 'Value 1', 'Value 2'],
      rows: [
        ['Row 1', '', ''],
        ['Row 2', '', '']
      ],
      cellMeta: {},
      showBorders: true,
      alignment: 'center'
    });
    setMode('data');
  };

  const updateDataCell = (r: number, c: number, val: string) => {
    if (!structuredTable) return;
    const nextRows = structuredTable.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
    );
    onChangeStructuredTable({ ...structuredTable, rows: nextRows });
  };

  const updateCellMeta = (r: number, c: number, patch: Partial<Parser2TableCellMeta>) => {
    if (!structuredTable) return;
    const key = `${r}:${c}`;
    const cur = structuredTable.cellMeta?.[key] || {};
    onChangeStructuredTable({
      ...structuredTable,
      cellMeta: {
        ...(structuredTable.cellMeta || {}),
        [key]: { ...cur, ...patch }
      }
    });
  };

  const addDataRow = () => {
    if (!structuredTable) return initStructuredTable();
    const cols = Math.max(1, structuredTable.headers.length);
    onChangeStructuredTable({
      ...structuredTable,
      rows: [...structuredTable.rows, Array.from({ length: cols }, () => '')]
    });
  };

  const addDataCol = () => {
    if (!structuredTable) return initStructuredTable();
    const nextColIdx = structuredTable.headers.length + 1;
    onChangeStructuredTable({
      ...structuredTable,
      headers: [...structuredTable.headers, `Column ${nextColIdx}`],
      rows: structuredTable.rows.map(r => [...r, ''])
    });
  };

  const removeDataCol = (colIdx: number) => {
    if (!structuredTable || structuredTable.headers.length <= 1) return;
    onChangeStructuredTable({
      ...structuredTable,
      headers: structuredTable.headers.filter((_, i) => i !== colIdx),
      rows: structuredTable.rows.map(r => r.filter((_, i) => i !== colIdx))
    });
  };

  const mergeRight = () => {
    if (!structuredTable || !selectedCell) return;
    const { r, c } = selectedCell;
    const curKey = `${r}:${c}`;
    const curMeta = structuredTable.cellMeta?.[curKey] || {};
    const curSpan = curMeta.colSpan || 1;
    const nextCol = c + curSpan;
    if (nextCol >= structuredTable.headers.length) return;
    const nextMeta = { ...(structuredTable.cellMeta || {}) };
    nextMeta[curKey] = { ...curMeta, colSpan: curSpan + 1 };
    nextMeta[`${r}:${nextCol}`] = { ...(nextMeta[`${r}:${nextCol}`] || {}), hidden: true };
    onChangeStructuredTable({ ...structuredTable, cellMeta: nextMeta });
  };

  const mergeDown = () => {
    if (!structuredTable || !selectedCell) return;
    const { r, c } = selectedCell;
    const curKey = `${r}:${c}`;
    const curMeta = structuredTable.cellMeta?.[curKey] || {};
    const curSpan = curMeta.rowSpan || 1;
    const nextRow = r + curSpan;
    if (nextRow >= structuredTable.rows.length) return;
    const nextMeta = { ...(structuredTable.cellMeta || {}) };
    nextMeta[curKey] = { ...curMeta, rowSpan: curSpan + 1 };
    nextMeta[`${nextRow}:${c}`] = { ...(nextMeta[`${nextRow}:${c}`] || {}), hidden: true };
    onChangeStructuredTable({ ...structuredTable, cellMeta: nextMeta });
  };

  const unmergeSelected = () => {
    if (!structuredTable || !selectedCell) return;
    const { r, c } = selectedCell;
    const curKey = `${r}:${c}`;
    const curMeta = structuredTable.cellMeta?.[curKey];
    if (!curMeta) return;
    const rSpan = curMeta.rowSpan || 1;
    const cSpan = curMeta.colSpan || 1;
    const nextMeta = { ...(structuredTable.cellMeta || {}) };
    for (let rr = r; rr < r + rSpan; rr++) {
      for (let cc = c; cc < c + cSpan; cc++) {
        const k = `${rr}:${cc}`;
        if (nextMeta[k]) {
          const { rowSpan: _rs, colSpan: _cs, hidden: _h, ...rest } = nextMeta[k];
          nextMeta[k] = rest;
        }
      }
    }
    onChangeStructuredTable({ ...structuredTable, cellMeta: nextMeta });
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
            Visual Match-the-Column & Table Editor
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setMode('match')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
              mode === 'match' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Match-the-Column
          </button>
          <button
            type="button"
            onClick={() => setMode('data')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
              mode === 'data' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Data Table
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 flex items-center gap-1"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Preview
          </button>
        </div>
      </div>

      {/* MATCH-THE-COLUMN EDITOR */}
      {mode === 'match' && (
        <div className="space-y-2.5">
          {!matchTable ? (
            <button
              type="button"
              onClick={initMatchTable}
              className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-xs font-bold text-purple-700 hover:bg-purple-50"
            >
              + Create Visual Match-the-Column (List I / List II) Table
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={matchTable.columnAHeader || matchTable.colATitle || 'List I'}
                  onChange={e =>
                    onChangeMatchTable({ ...matchTable, columnAHeader: e.target.value, colATitle: e.target.value })
                  }
                  placeholder="Left Header (List I)"
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                />
                <input
                  value={matchTable.columnBHeader || matchTable.colBTitle || 'List II'}
                  onChange={e =>
                    onChangeMatchTable({ ...matchTable, columnBHeader: e.target.value, colBTitle: e.target.value })
                  }
                  placeholder="Right Header (List II)"
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={matchTable.showBorders !== false}
                    onChange={e => onChangeMatchTable({ ...matchTable, showBorders: e.target.checked })}
                  />
                  Borders
                </label>
                <button
                  type="button"
                  onClick={() => onChangeMatchTable(undefined)}
                  className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Clear Table
                </button>
              </div>

              <div className="space-y-2">
                {matchTable.rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 rounded-xl bg-white border border-slate-200">
                    {/* Column A Cell */}
                    <div className="flex items-start gap-1.5">
                      <input
                        value={row.colAKey}
                        onChange={e => updateMatchRow(idx, { colAKey: e.target.value })}
                        className="w-10 px-1.5 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg"
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          value={row.colAText ?? row.colAValue ?? ''}
                          onChange={e => updateMatchRow(idx, { colAText: e.target.value, colAValue: e.target.value })}
                          placeholder="List I item text (supports 10⁻³, H₂SO₄)"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
                            {uploadingKey === `mA-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {row.colAImageUrl ? 'Replace Cell Image' : 'Attach Cell Image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={async e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const url = await uploadCellImage(f, `mA-${idx}`);
                                if (url) updateMatchRow(idx, { colAImageUrl: url });
                              }}
                            />
                          </label>
                          {row.colAImageUrl && (
                            <>
                              <img src={row.colAImageUrl} alt="" className="h-7 rounded border border-slate-200" />
                              <button
                                type="button"
                                onClick={() => updateMatchRow(idx, { colAImageUrl: undefined })}
                                className="text-[10px] text-rose-600 font-bold"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column B Cell */}
                    <div className="flex items-start gap-1.5">
                      <input
                        value={row.colBKey}
                        onChange={e => updateMatchRow(idx, { colBKey: e.target.value })}
                        className="w-10 px-1.5 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg"
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          value={row.colBText ?? row.colBValue ?? ''}
                          onChange={e => updateMatchRow(idx, { colBText: e.target.value, colBValue: e.target.value })}
                          placeholder="List II item text"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
                            {uploadingKey === `mB-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {row.colBImageUrl ? 'Replace Cell Image' : 'Attach Cell Image'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={async e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const url = await uploadCellImage(f, `mB-${idx}`);
                                if (url) updateMatchRow(idx, { colBImageUrl: url });
                              }}
                            />
                          </label>
                          {row.colBImageUrl && (
                            <>
                              <img src={row.colBImageUrl} alt="" className="h-7 rounded border border-slate-200" />
                              <button
                                type="button"
                                onClick={() => updateMatchRow(idx, { colBImageUrl: undefined })}
                                className="text-[10px] text-rose-600 font-bold"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeMatchTable({
                            ...matchTable,
                            rows: matchTable.rows.filter((_, i) => i !== idx)
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMatchRow}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Match Row
              </button>
            </>
          )}
        </div>
      )}

      {/* STRUCTURED DATA TABLE EDITOR */}
      {mode === 'data' && (
        <div className="space-y-2.5">
          {!structuredTable ? (
            <button
              type="button"
              onClick={initStructuredTable}
              className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-xs font-bold text-purple-700 hover:bg-purple-50"
            >
              + Create Structured Data Table (with Merge/Unmerge & Cell Images)
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={addDataRow}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700"
                >
                  + Row
                </button>
                <button
                  type="button"
                  onClick={addDataCol}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  + Column
                </button>
                <button
                  type="button"
                  disabled={!selectedCell}
                  onClick={mergeRight}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <Merge className="w-3 h-3" /> Merge Right
                </button>
                <button
                  type="button"
                  disabled={!selectedCell}
                  onClick={mergeDown}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <Merge className="w-3 h-3 rotate-90" /> Merge Down
                </button>
                <button
                  type="button"
                  disabled={!selectedCell}
                  onClick={unmergeSelected}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <SplitSquareHorizontal className="w-3 h-3" /> Unmerge
                </button>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 ml-auto">
                  <input
                    type="checkbox"
                    checked={structuredTable.showBorders !== false}
                    onChange={e => onChangeStructuredTable({ ...structuredTable, showBorders: e.target.checked })}
                  />
                  Borders
                </label>
                <button
                  type="button"
                  onClick={() => onChangeStructuredTable(undefined)}
                  className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Clear Table
                </button>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 p-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {structuredTable.headers.map((h, ci) => (
                        <th key={ci} className="p-1 border border-slate-200 bg-slate-50">
                          <div className="flex items-center gap-1">
                            <input
                              value={h}
                              onChange={e =>
                                onChangeStructuredTable({
                                  ...structuredTable,
                                  headers: structuredTable.headers.map((x, i) => (i === ci ? e.target.value : x))
                                })
                              }
                              className="w-full px-1.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded"
                            />
                            {structuredTable.headers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDataCol(ci)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {structuredTable.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          const meta = structuredTable.cellMeta?.[`${ri}:${ci}`];
                          if (meta?.hidden) return null;
                          const isSel = selectedCell?.r === ri && selectedCell?.c === ci;
                          return (
                            <td
                              key={ci}
                              rowSpan={meta?.rowSpan || 1}
                              colSpan={meta?.colSpan || 1}
                              onClick={() => setSelectedCell({ r: ri, c: ci })}
                              className={`p-1.5 border ${isSel ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}
                            >
                              <input
                                value={cell}
                                onChange={e => updateDataCell(ri, ci, e.target.value)}
                                className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
                              />
                              <div className="flex items-center justify-between mt-1 gap-1">
                                <label className="text-[10px] font-bold text-indigo-600 cursor-pointer hover:underline">
                                  {uploadingKey === `cell-${ri}-${ci}` ? 'Uploading…' : meta?.imageUrl ? 'Replace Img' : '+ Img'}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={async e => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const url = await uploadCellImage(f, `cell-${ri}-${ci}`);
                                      if (url) updateCellMeta(ri, ci, { imageUrl: url });
                                    }}
                                  />
                                </label>
                                {meta?.imageUrl && (
                                  <div className="flex items-center gap-1">
                                    <img src={meta.imageUrl} alt="" className="h-6 rounded border" />
                                    <button
                                      type="button"
                                      onClick={() => updateCellMeta(ri, ci, { imageUrl: undefined })}
                                      className="text-[10px] text-rose-600"
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStructuredTable({
                                ...structuredTable,
                                rows: structuredTable.rows.filter((_, i) => i !== ri)
                              })
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* LIVE STUDENT CBT TABLE PREVIEW */}
      {showPreview && (matchTable?.rows?.length || structuredTable?.rows?.length) ? (
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Live Student CBT Layout Preview</div>
          {matchTable?.rows?.length ? (
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${matchTable.showBorders !== false ? 'border border-slate-300' : ''}`}>
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left border border-slate-300 font-bold" colSpan={2}>
                      {matchTable.columnAHeader || matchTable.colATitle || 'List I'}
                    </th>
                    <th className="p-2 text-left border border-slate-300 font-bold" colSpan={2}>
                      {matchTable.columnBHeader || matchTable.colBTitle || 'List II'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchTable.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-slate-200 font-bold w-10">{r.colAKey}.</td>
                      <td className="p-2 border border-slate-200">
                        <div>{r.colAText ?? r.colAValue}</div>
                        {r.colAImageUrl && <img src={r.colAImageUrl} alt="" className="mt-1 max-h-20 rounded border" />}
                      </td>
                      <td className="p-2 border border-slate-200 font-bold w-10">{r.colBKey}.</td>
                      <td className="p-2 border border-slate-200">
                        <div>{r.colBText ?? r.colBValue}</div>
                        {r.colBImageUrl && <img src={r.colBImageUrl} alt="" className="mt-1 max-h-20 rounded border" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : structuredTable?.rows?.length ? (
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${structuredTable.showBorders !== false ? 'border border-slate-300' : ''}`}>
                <thead className="bg-slate-100">
                  <tr>
                    {structuredTable.headers.map((h, i) => (
                      <th key={i} className="p-2 border border-slate-300 font-bold text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {structuredTable.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => {
                        const meta = structuredTable.cellMeta?.[`${ri}:${ci}`];
                        if (meta?.hidden) return null;
                        return (
                          <td
                            key={ci}
                            rowSpan={meta?.rowSpan || 1}
                            colSpan={meta?.colSpan || 1}
                            className="p-2 border border-slate-200 align-top"
                          >
                            <div>{cell}</div>
                            {meta?.imageUrl && <img src={meta.imageUrl} alt="" className="mt-1 max-h-20 rounded border" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
