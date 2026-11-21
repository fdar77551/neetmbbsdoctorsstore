import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon, Upload, Clipboard, FolderOpen, Scissors, RotateCw,
  Trash2, Plus, Loader2, AlignLeft, AlignCenter, AlignRight, CheckCircle2, AlertCircle,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Parser2ImageAttachment, Parser2ImagePlacement } from '../../services/parser2/types';
import { getAdminRequestHeaders } from '../../lib/firebase';

export const PLACEMENT_OPTIONS: Array<{ value: Parser2ImagePlacement; label: string; group: string }> = [
  { value: 'before_question', label: 'Before Question Text', group: 'Question Stem' },
  { value: 'between_paragraphs', label: 'Between Question Paragraphs', group: 'Question Stem' },
  { value: 'after_question', label: 'After Question Text (Primary)', group: 'Question Stem' },
  { value: 'assertion_reason', label: 'Assertion / Reason Area', group: 'Question Stem' },
  { value: 'option_A', label: 'Inside Option (A)', group: 'Options' },
  { value: 'option_B', label: 'Inside Option (B)', group: 'Options' },
  { value: 'option_C', label: 'Inside Option (C)', group: 'Options' },
  { value: 'option_D', label: 'Inside Option (D)', group: 'Options' },
  { value: 'match_left_table', label: 'Match-the-Column: Left (List I)', group: 'Tables' },
  { value: 'match_right_table', label: 'Match-the-Column: Right (List II)', group: 'Tables' },
  { value: 'table_cell', label: 'Inside Specific Table Cell (Row, Col)', group: 'Tables' },
  { value: 'explanation', label: 'Inside Explanation / Solution', group: 'Solution' },
  { value: 'answer_key_explanation', label: 'Inside Answer Key Explanation', group: 'Solution' }
];

interface MediaItem {
  id: string;
  url: string;
  label: string;
  pageNumber?: number;
}

interface Props {
  jobId: string;
  questionId: string;
  questionNumber: number;
  attachments: Parser2ImageAttachment[];
  onChange: (next: Parser2ImageAttachment[]) => void;
  onOpenPdfCrop?: (placement: Parser2ImagePlacement) => void;
}

export const Parser2ImageManager: React.FC<Props> = ({
  jobId,
  questionId,
  questionNumber,
  attachments,
  onChange,
  onOpenPdfCrop
}) => {
  const [selectedPlacement, setSelectedPlacement] = useState<Parser2ImagePlacement>('after_question');
  const [uploading, setUploading] = useState(false);
  const [transformingId, setTransformingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMediaLibrary = async () => {
    setLoadingLib(true);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/media`, {
        headers: getAdminRequestHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.media)) {
        setLibraryItems(data.media);
      }
    } catch {}
    setLoadingLib(false);
  };

  useEffect(() => {
    if (showLibrary) {
      fetchMediaLibrary();
    }
  }, [showLibrary, jobId]);

  const uploadImageFile = async (file: File, replaceId?: string) => {
    setStatusMsg(null);
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type.toLowerCase())) {
      setStatusMsg({ type: 'err', text: 'Only PNG, JPG, JPEG, and WebP images are supported.' });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('imageFile', file);
      fd.append('questionId', questionId);
      fd.append('questionNumber', String(questionNumber));
      fd.append('placement', selectedPlacement);

      const res = await fetch(`/api/parser2/jobs/${jobId}/media/upload`, {
        method: 'POST',
        headers: getAdminRequestHeaders(),
        body: fd
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Image upload failed');
      }

      if (replaceId) {
        onChange(
          attachments.map(a =>
            a.id === replaceId
              ? { ...a, url: data.url, width: data.width, height: data.height, sourceType: 'upload' }
              : a
          )
        );
        setStatusMsg({ type: 'ok', text: 'Image replaced and saved permanently to R2 storage.' });
      } else {
        const newAtt: Parser2ImageAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: data.url,
          placement: selectedPlacement,
          paragraphIndex: selectedPlacement === 'between_paragraphs' ? 0 : undefined,
          tableRow: selectedPlacement === 'table_cell' ? 0 : undefined,
          tableCol: selectedPlacement === 'table_cell' ? 0 : undefined,
          alt: `Q${questionNumber} ${selectedPlacement}`,
          alignment: 'center',
          widthPercent: 85,
          width: data.width,
          height: data.height,
          sourceType: 'upload',
          createdAt: new Date().toISOString()
        };
        onChange([...attachments, newAtt]);
        setStatusMsg({ type: 'ok', text: `Uploaded & attached to "${selectedPlacement}" (persisted in R2).` });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await uploadImageFile(file);
          return;
        }
      }
    }
  };

  const handleRotate = async (att: Parser2ImageAttachment) => {
    setTransformingId(att.id);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/parser2/jobs/${jobId}/media/transform`, {
        method: 'POST',
        headers: getAdminRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ url: att.url, rotation: 90 })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Rotate failed');
      }
      onChange(
        attachments.map(a =>
          a.id === att.id ? { ...a, url: data.url, width: data.width, height: data.height } : a
        )
      );
      setStatusMsg({ type: 'ok', text: 'Rotated 90° and persisted new image in R2.' });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Rotate failed' });
    } finally {
      setTransformingId(null);
    }
  };

  const attachFromLibrary = (item: MediaItem) => {
    const newAtt: Parser2ImageAttachment = {
      id: `att-lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: item.url,
      placement: selectedPlacement,
      paragraphIndex: selectedPlacement === 'between_paragraphs' ? 0 : undefined,
      tableRow: selectedPlacement === 'table_cell' ? 0 : undefined,
      tableCol: selectedPlacement === 'table_cell' ? 0 : undefined,
      alt: item.label || `Q${questionNumber} diagram`,
      alignment: 'center',
      widthPercent: 85,
      sourceType: 'library',
      sourcePageNumber: item.pageNumber,
      createdAt: new Date().toISOString()
    };
    onChange([...attachments, newAtt]);
    setShowLibrary(false);
    setStatusMsg({ type: 'ok', text: `Attached from Media Library to "${selectedPlacement}".` });
  };

  const updateAtt = (id: string, patch: Partial<Parser2ImageAttachment>) => {
    onChange(attachments.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAtt = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  const moveAtt = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= attachments.length) return;
    const next = [...attachments];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div
      onPaste={handlePaste}
      className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
            Complete Image & Diagram Manager ({attachments.length} attached)
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selectedPlacement}
            onChange={e => setSelectedPlacement(e.target.value as Parser2ImagePlacement)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white font-semibold text-slate-800"
          >
            {PLACEMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.group}: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload / Drag-Drop / Paste / Library / PDF Crop Toolbar */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) uploadImageFile(f);
        }}
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-100/70' : 'border-slate-300 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) uploadImageFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setShowLibrary(v => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Media Library
            </button>
            {onOpenPdfCrop && (
              <button
                type="button"
                onClick={() => onOpenPdfCrop(selectedPlacement)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Scissors className="w-3.5 h-3.5" />
                Crop from Source PDF
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clipboard className="w-3.5 h-3.5" />
            Drag & drop or press Ctrl+V to paste image (PNG/JPG/WebP)
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {statusMsg.text}
        </div>
      )}

      {/* Media Library Drawer */}
      {showLibrary && (
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Reusable Job Media Library</span>
            <button
              type="button"
              onClick={() => setShowLibrary(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          {loadingLib ? (
            <div className="text-xs text-slate-500 py-4 text-center">Loading media library…</div>
          ) : libraryItems.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No uploaded or cropped figures in this job yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {libraryItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => attachFromLibrary(item)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-500 bg-slate-50 text-left group"
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-full h-16 object-contain bg-white rounded border border-slate-100"
                  />
                  <div className="text-[10px] font-semibold text-slate-700 truncate mt-1 group-hover:text-indigo-700">
                    <Plus className="w-3 h-3 inline mr-0.5" />
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attached Images List */}
      {attachments.length > 0 && (
        <div className="space-y-2.5">
          {attachments.map((att, idx) => (
            <div key={att.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-32 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={att.url}
                    alt={att.alt || 'Attached figure'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                      <select
                        value={att.placement}
                        onChange={e => updateAtt(att.id, { placement: e.target.value as Parser2ImagePlacement })}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        {PLACEMENT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {att.placement === 'between_paragraphs' && (
                        <label className="text-[11px] flex items-center gap-1 text-slate-600">
                          After Para #
                          <input
                            type="number"
                            min={0}
                            value={att.paragraphIndex ?? 0}
                            onChange={e => updateAtt(att.id, { paragraphIndex: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            className="w-12 px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                          />
                        </label>
                      )}
                      {att.placement === 'table_cell' && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          Row
                          <input
                            type="number"
                            min={0}
                            value={att.tableRow ?? 0}
                            onChange={e => updateAtt(att.id, { tableRow: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            className="w-11 px-1 py-0.5 border border-slate-300 rounded text-xs"
                          />
                          Col
                          <input
                            type="number"
                            min={0}
                            value={att.tableCol ?? 0}
                            onChange={e => updateAtt(att.id, { tableCol: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            className="w-11 px-1 py-0.5 border border-slate-300 rounded text-xs"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveAtt(idx, -1)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-35"
                        title="Move image up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === attachments.length - 1}
                        onClick={() => moveAtt(idx, 1)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-35"
                        title="Move image down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={transformingId === att.id}
                        onClick={() => handleRotate(att)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700"
                        title="Rotate 90° clockwise"
                      >
                        {transformingId === att.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCw className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAtt(att.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                        title="Delete image attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={att.caption || ''}
                      onChange={e => updateAtt(att.id, { caption: e.target.value })}
                      placeholder="Optional figure caption (shown to students)"
                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                    <input
                      value={att.alt || ''}
                      onChange={e => updateAtt(att.id, { alt: e.target.value })}
                      placeholder="Alt text for accessibility"
                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Width: {att.widthPercent || 85}%</span>
                      <input
                        type="range"
                        min={25}
                        max={100}
                        step={5}
                        value={att.widthPercent || 85}
                        onChange={e => updateAtt(att.id, { widthPercent: parseInt(e.target.value, 10) })}
                        className="w-24 accent-indigo-600"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {(['left', 'center', 'right'] as const).map(al => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => updateAtt(att.id, { alignment: al })}
                          className={`p-1 rounded ${
                            (att.alignment || 'center') === al
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={`Align ${al}`}
                        >
                          {al === 'left' ? <AlignLeft className="w-3 h-3" /> : al === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
