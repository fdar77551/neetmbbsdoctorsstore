import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, MessageSquare, Send, ChevronDown, User, Sparkles, ShieldCheck } from 'lucide-react';
import { ProductReview, ReviewProductType } from '../types';
import { 
  getReviewsForProduct, 
  getProductRatingStats, 
  addProductReview, 
  canUserReviewProduct 
} from '../lib/reviewData';

interface ReviewSectionProps {
  productId: string;
  productType: ReviewProductType;
  productTitle?: string;
  currentUser?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  userProfile?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onRequireAuth?: () => void;
  baseRating?: number;
  baseCount?: number;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  productType,
  productTitle,
  currentUser,
  userProfile,
  onRequireAuth,
  baseRating = 4.8,
  baseCount = 126
}) => {
  const effectiveUser = userProfile || currentUser;
  const [reviews, setReviews] = useState<ProductReview[]>(() => getReviewsForProduct(productId));
  const [stats, setStats] = useState(() => getProductRatingStats(productId, baseRating, baseCount));
  
  // Write Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [reviewerName, setReviewerName] = useState(effectiveUser?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination / Load More
  const [visibleCount, setVisibleCount] = useState(4);

  // Reload reviews on events
  const refreshReviews = () => {
    const updated = getReviewsForProduct(productId);
    setReviews(updated);
    setStats(getProductRatingStats(productId, baseRating, baseCount));
  };

  useEffect(() => {
    refreshReviews();
    const handleUpdate = () => refreshReviews();
    window.addEventListener('neetmbbs_reviews_updated', handleUpdate);
    return () => window.removeEventListener('neetmbbs_reviews_updated', handleUpdate);
  }, [productId]);

  useEffect(() => {
    if (effectiveUser?.displayName && !reviewerName) {
      setReviewerName(effectiveUser.displayName);
    }
  }, [effectiveUser]);

  const reviewPermission = canUserReviewProduct(
    productId,
    productType,
    effectiveUser?.uid,
    effectiveUser?.email || undefined
  );

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!commentText.trim()) {
      setFormFeedback({ type: 'error', message: 'Please write a brief comment sharing your experience' });
      return;
    }

    if (commentText.trim().length < 10) {
      setFormFeedback({ type: 'error', message: 'Review must be at least 10 characters long' });
      return;
    }

    setIsSubmitting(true);
    try {
      addProductReview({
        productId,
        productType,
        productTitle,
        userId: effectiveUser.uid || `anon-${Date.now()}`,
        userEmail: effectiveUser.email || 'student@neetmbbs.com',
        userName: reviewerName.trim() || effectiveUser.displayName || 'NEET Aspirant',
        rating: selectedRating,
        comment: commentText.trim(),
        isVerifiedPurchase: reviewPermission.isVerified
      });

      setFormFeedback({ type: 'success', message: 'Your review was submitted successfully. Thank you!' });
      setCommentText('');
      setShowReviewForm(false);
      refreshReviews();
    } catch (err) {
      setFormFeedback({ type: 'error', message: 'Failed to submit review. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleReviews = reviews.slice(0, visibleCount);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-1 border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Student Ratings &amp; Experiences</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
            Verified Reviews &amp; Star Ratings
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Read real feedback from students and doctors preparing for NEET.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!effectiveUser && onRequireAuth) {
              onRequireAuth();
            } else {
              setShowReviewForm(prev => !prev);
              setFormFeedback(null);
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0 font-['Outfit',sans-serif]"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Ratings Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 bg-slate-50/80 p-4 sm:p-6 rounded-2xl border border-slate-200/80">
        {/* Left: Overall Big Score */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center text-center p-2 sm:border-r sm:border-slate-200">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 font-['Outfit',sans-serif]">
            {stats.averageRating}
          </span>
          {/* Star Icons */}
          <div className="flex items-center gap-1 my-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(stats.averageRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500">
            Based on {stats.totalReviews} reviews
          </span>
        </div>

        {/* Right: Star Breakdown Progress Bars */}
        <div className="sm:col-span-8 flex flex-col justify-center space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = stats.ratingDistribution[star] || 0;
            const percentage = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 font-bold text-slate-700 flex items-center gap-0.5 justify-end">
                  <span>{star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-[11px] font-semibold text-slate-500 text-right">
                  {percentage}% ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Feedback Alert */}
      {formFeedback && (
        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          formFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {formFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Star className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{formFeedback.message}</span>
        </div>
      )}

      {/* Write Review Form Collapsible */}
      {showReviewForm && (
        <form onSubmit={handleSubmitReview} className="bg-blue-50/60 p-4 sm:p-5 rounded-2xl border border-blue-200 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
              Share Your Experience
            </span>
            <span className="text-[11px] text-blue-700">
              {reviewPermission.isVerified ? '✓ Verified Purchase' : 'Student Review'}
            </span>
          </div>

          {/* Star selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Your Rating (1 to 5 Stars):</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedRating(s)}
                  className="p-1 hover:scale-110 transition cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      s <= (hoverRating || selectedRating)
                        ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-black text-amber-700 ml-2">
                {hoverRating || selectedRating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Reviewer name input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Your Display Name:</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="e.g. Rahul Sharma (NEET Aspirant)"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Review comment text */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Review &amp; Feedback:</label>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="How did this material / mock test help your NEET preparation? Mention question quality, explanations, or exam-level coverage..."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Submit Review'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3 pt-1">
        {reviews.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No student reviews posted yet</p>
            <p className="text-[11px] text-slate-500">
              Be the first to share your experience with this study resource!
            </p>
          </div>
        ) : (
          visibleReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2 hover:bg-slate-50 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{rev.userName}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Verified Buyer</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Comment */}
              <p className="text-xs text-slate-700 leading-relaxed pl-10.5">
                "{rev.comment}"
              </p>
            </div>
          ))
        )}

        {/* Load More Button */}
        {reviews.length > visibleCount && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <span>Load More Reviews ({reviews.length - visibleCount} remaining)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
