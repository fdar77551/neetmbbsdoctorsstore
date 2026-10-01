import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface AdminDeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName: string;
  itemType?: string; // 'test' | 'question' | 'pdf' | 'product' | 'review' | 'coupon' | 'course' | string
  warningText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const AdminDeleteConfirmModal: React.FC<AdminDeleteConfirmModalProps> = ({
  isOpen,
  title = 'Delete this item?',
  itemName,
  itemType = 'item',
  warningText,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  const [inputWord, setInputWord] = useState('');

  // Reset input when opened
  useEffect(() => {
    if (isOpen) {
      setInputWord('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDeleteMatched = inputWord.trim() === 'delete';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeleteMatched && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={onCancel}
      />
      <div 
        className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
            {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            This action is destructive and cannot be undone.
          </p>
        </div>

        {/* Item details card */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Selected {itemType}:
          </div>
          <div className="font-bold text-slate-800 break-words line-clamp-2">
            {itemName}
          </div>
        </div>

        {warningText && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] leading-relaxed">
            {warningText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <label className="block space-y-1.5 text-xs text-slate-700">
            <span className="font-bold">
              Type <code className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-black text-xs select-all">delete</code> to permanently delete this {itemType}:
            </span>
            <input
              type="text"
              autoFocus
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              placeholder="Type delete"
              className="w-full px-3.5 py-2.5 border-2 rounded-xl text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-500 transition border-slate-300 focus:border-rose-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDeleteMatched || isDeleting}
              className={`py-2.5 px-4 text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isDeleteMatched && !isDeleting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
