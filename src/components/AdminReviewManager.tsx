import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search, 
  Filter, 
  ShieldCheck, 
  MessageSquare, 
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { ProductReview, ReviewProductType } from '../types';
import { 
  getStoredReviews, 
  saveStoredReviews, 
  toggleReviewVisibility, 
  deleteProductReview, 
  syncReviewsFromRemote 
} from '../lib/reviewData';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

export const AdminReviewManager: React.FC = () => {
  const [reviews, setReviews] = useState<ProductReview[]>(() => getStoredReviews());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | ReviewProductType>('all');
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  
  // Delete modal state (Requirement 18: type "delete" to confirm)
  const [deleteTarget, setDeleteTarget] = useState<ProductReview | null>(null);

  const refreshReviews = () => {
    setReviews(getStoredReviews());
  };

  useEffect(() => {
    refreshReviews();
    syncReviewsFromRemote().then(() => refreshReviews()).catch(() => {});
    const handleUpdate = () => refreshReviews();
    window.addEventListener('neetmbbs_reviews_updated', handleUpdate);
    return () => window.removeEventListener('neetmbbs_reviews_updated', handleUpdate);
  }, []);

  const handleToggleHide = (review: ProductReview) => {
    toggleReviewVisibility(review.id);
    refreshReviews();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteProductReview(deleteTarget.id);
    refreshReviews();
    setDeleteTarget(null);
  };

  // Filtered reviews
  const filteredReviews = reviews.filter(r => {
    if (selectedTypeFilter !== 'all' && r.productType !== selectedTypeFilter) {
      return false;
    }
    if (selectedVisibilityFilter === 'visible' && r.isHidden) return false;
    if (selectedVisibilityFilter === 'hidden' && !r.isHidden) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.userName?.toLowerCase().includes(q);
      const matchEmail = r.userEmail?.toLowerCase().includes(q);
      const matchComment = r.comment?.toLowerCase().includes(q);
      const matchProd = (r.productTitle || r.productId)?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchComment && !matchProd) return false;
    }

    return true;
  });

  const totalCount = reviews.length;
  const visibleCount = reviews.filter(r => !r.isHidden).length;
  const hiddenCount = reviews.filter(r => r.isHidden).length;
  const averageOverallRating = totalCount > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
    : '4.8';

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-2 border border-blue-400/30">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Reviews &amp; Ratings Moderation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif]">
              Student Feedback &amp; Review Management
            </h2>
            <p className="text-xs text-blue-200 font-medium mt-1">
              Moderate student star ratings, reviews, and verified feedback across Books, PDFs, Mock Tests, and Courses.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <div>
              <span className="text-base font-black text-white">{averageOverallRating} / 5</span>
              <span className="text-[10px] text-blue-200 block">Avg Platform Rating</span>
            </div>
          </div>
        </div>

        {/* Quick Counts */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/10 relative z-10">
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-blue-200 uppercase block">Total Reviews</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{totalCount}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-emerald-300 uppercase block">Published Visible</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{visibleCount}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-300 uppercase block">Hidden / Moderated</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{hiddenCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, product, or comment..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Visibility filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedVisibilityFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedVisibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedVisibilityFilter('visible')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedVisibilityFilter === 'visible' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Visible
            </button>
            <button
              type="button"
              onClick={() => setSelectedVisibilityFilter('hidden')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedVisibilityFilter === 'hidden' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Hidden
            </button>
          </div>
        </div>

        {/* Product Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'All Reviews' },
            { id: 'book', label: '📚 Books' },
            { id: 'pdf', label: '📄 PDFs' },
            { id: 'mock_test', label: '📝 Mock Tests' },
            { id: 'course', label: '🎓 Full Course' }
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedTypeFilter(type.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === type.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No reviews found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your filter tags or search keyword.
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-white rounded-2xl p-4 sm:p-5 border transition shadow-2xs space-y-3 ${
                rev.isHidden ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{rev.userName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({rev.userEmail})</span>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                      {rev.isHidden && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                          Hidden from Public
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-bold text-blue-700 uppercase text-[10px] bg-blue-50 px-1.5 py-0.2 rounded">
                        {rev.productType}
                      </span>
                      <span>Product: {rev.productTitle || rev.productId}</span>
                      <span>•</span>
                      <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Stars Rating */}
                <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-black text-slate-800 ml-1">{rev.rating}</span>
                </div>
              </div>

              {/* Review Text */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed">
                "{rev.comment}"
              </div>

              {/* Action Buttons: Hide/Unhide, Delete */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggleHide(rev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    rev.isHidden
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  {rev.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{rev.isHidden ? 'Unhide Review' : 'Hide from Public'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(rev)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Advanced Delete Confirmation Modal (Requirement 18: type "delete" to confirm) */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete this student review?"
        itemName={deleteTarget ? `Review by "${deleteTarget.userName}" (${deleteTarget.rating}★): "${deleteTarget.comment.substring(0, 50)}..."` : ''}
        itemType="review"
        warningText="Permanently removing this review will recalculate the product's average rating and remove it from public view."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
