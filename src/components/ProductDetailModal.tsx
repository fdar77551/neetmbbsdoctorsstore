import React, { useState } from 'react';
import { ArrowLeft, X, Star, ShoppingBag, Zap, ShieldCheck, Truck, Download, Share2, CheckCircle2, FileText, Heart, Image as ImageIcon, Eye, BookOpen } from 'lucide-react';
import { Product } from '../types';
import { resolveImageUrl } from './ProductCard';
import { downloadNotesPdf } from '../lib/pdfDownloader';
import { ReviewSection } from './ReviewSection';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  onOpenPdfReader?: (pdfUrl: string, title: string) => void;
  isPurchased?: boolean;
  currentUser?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  userProfile?: { uid?: string; email?: string | null; displayName?: string | null } | null;
  onRequireAuth?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onQuickBuy,
  onOpenPdfReader,
  isPurchased = false,
  currentUser,
  userProfile,
  onRequireAuth
}) => {
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  if (!product) return null;

  const isPdfPurchased = product.type === 'pdf' && isPurchased;

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const allImages = [
    ...(product.coverImage ? [product.coverImage] : []),
    ...(product.sampleImages || [])
  ];

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
    const shareText = `Check out "${product.title}" on NEET MBBS Doctors Store!`;

    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank');
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadNotesPdf({
        id: product.id,
        title: product.title,
        author: product.author,
        category: product.category,
        pdfUrl: product.pdfUrl
      });
    } catch (err) {
      console.error('Error downloading note PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex justify-center animate-in fade-in duration-200 overflow-hidden">
      {/* Full Page Mobile Shell Container */}
      <div 
        id="product-detail-page"
        className="w-full max-w-md bg-white min-h-screen flex flex-col relative shadow-xl border-x border-slate-100"
      >
        {/* Full Page Top Header with Back Button */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-2 -ml-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {product.type === 'pdf' ? '⚡ Digital PDF Note' : '📖 Physical Book Edition'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-blue-50 transition cursor-pointer"
              title="Share Product"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Full-Height Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
          
          {/* Purchased Status Banner */}
          {isPdfPurchased && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>You own this digital PDF note. Unlimited downloads & offline reading unlocked.</span>
            </div>
          )}

          {/* Main Product Image & Sample Gallery Container */}
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200 shadow-xs">
            {/* Active Display Image */}
            <div className="relative w-full flex items-center justify-center min-h-[220px]">
              {allImages.length > 0 && !imageErrors[activeImageIndex] ? (
                <img
                  src={resolveImageUrl(allImages[activeImageIndex] || product.coverImage)}
                  alt={product.title}
                  onClick={() => setLightboxImage(allImages[activeImageIndex] || product.coverImage)}
                  className="max-h-64 max-w-full object-contain rounded-xl shadow-md cursor-zoom-in hover:scale-101 transition duration-150"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const currentSrc = target.src;
                    if (currentSrc.includes('.r2.dev/') && !currentSrc.includes('/api/r2/file/')) {
                      const key = currentSrc.split('.r2.dev/')[1];
                      if (key) {
                        target.src = `/api/r2/file/${key.replace(/^\/+/, '')}`;
                        return;
                      }
                    }
                    setImageErrors(prev => ({ ...prev, [activeImageIndex]: true }));
                  }}
                />
              ) : (
                <div className="w-48 h-64 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-xl flex flex-col items-center justify-between p-4 text-white text-center shadow-md border border-blue-500/30">
                  <div className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-yellow-400">
                    <span>NEET MBBS</span>
                    <span>{product.type === 'pdf' ? '⚡ PDF NOTE' : '📖 2026'}</span>
                  </div>
                  <div className="my-auto px-1">
                    <span className="text-sm font-black leading-tight line-clamp-3 block text-white drop-shadow-xs">
                      {product.title}
                    </span>
                    <span className="text-xs text-blue-200 font-medium mt-1.5 block">
                      {product.author || 'NEET Doctors Board'}
                    </span>
                  </div>
                  <div className="w-full text-center">
                    <span className="text-[9px] bg-white/15 px-2.5 py-1 rounded-full text-blue-100 font-bold border border-white/10">
                      100% NCERT Verified
                    </span>
                  </div>
                </div>
              )}

              {/* Tap to Zoom Prompt */}
              {allImages.length > 0 && !imageErrors[activeImageIndex] && (
                <button
                  type="button"
                  onClick={() => setLightboxImage(allImages[activeImageIndex] || product.coverImage)}
                  className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-xs transition cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Tap to Zoom</span>
                </button>
              )}
            </div>

            {/* Sample Pages Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="w-full mt-3 pt-3 border-t border-slate-200/80">
                <div className="text-[10px] font-extrabold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Sample Pages & Cover ({allImages.length})</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-12 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-white ${
                        activeImageIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/20 scale-105'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={resolveImageUrl(imgUrl)}
                        alt={`Sample thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[7px] font-bold text-center">
                        {idx === 0 ? 'Cover' : `P.${idx}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Title and Header Information */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                {product.category || 'NEET Study Material'}
              </span>
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-900">{product.rating ?? 4.8}</span>
                <span className="text-[10px] text-amber-600">({product.reviewsCount ?? 850} reviews)</span>
              </div>
              {product.type === 'book' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {product.shippingCost && product.shippingCost > 0 ? `🚚 +₹${product.shippingCost} Delivery` : '🚚 Free Delivery'}
                </span>
              )}
            </div>

            <h1 className="text-base font-black text-slate-900 leading-snug pt-1">
              {product.title}
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              By <span className="text-slate-800 font-bold">{product.author}</span>
            </p>
          </div>

          {/* Pricing Row */}
          {!isPdfPurchased ? (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Special Offer Price
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-blue-700">₹{product.price}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through">₹{product.originalPrice}</span>
                  )}
                </div>
              </div>
              {discountPercent > 0 && (
                <div className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-xs uppercase">
                  {discountPercent}% OFF
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Purchased Digital Access
                </span>
                <span className="text-sm font-black text-emerald-700">✓ Ready to Download & Read</span>
              </div>
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                Active
              </span>
            </div>
          )}

          {/* High-Yield Key Features Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
              <span>What's Inside & Key Highlights</span>
            </h3>
            <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {product.features?.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Product Overview */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
              <span>Product Overview</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
              {product.description}
            </p>
          </div>

          {/* Delivery & Authenticity Guarantees */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-[11px] font-bold">100% MBBS Verified</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold">{product.type === 'pdf' ? 'Instant Download' : 'Pan-India Express'}</span>
            </div>
          </div>

          {/* Student Reviews & Star Rating Section */}
          <div className="pt-2">
            <ReviewSection
              productId={product.id}
              productType={product.type === 'pdf' ? 'pdf' : 'book'}
              productTitle={product.title}
              currentUser={currentUser}
              userProfile={userProfile}
              onRequireAuth={onRequireAuth}
              baseRating={product.rating || 4.8}
              baseCount={product.reviewsCount || 126}
            />
          </div>
        </div>

        {/* Sticky Bottom Action Buttons Bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center gap-2.5 shadow-lg">
          {isPdfPurchased ? (
            <div className="w-full flex items-center gap-2">
              <button
                id="modal-read-pdf-btn"
                onClick={() => {
                  if (onOpenPdfReader) {
                    onOpenPdfReader(product.pdfUrl || '', product.title);
                  }
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border border-blue-200"
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Read Online</span>
              </button>

              <button
                id="modal-download-pdf-btn"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition active:scale-98 cursor-pointer disabled:opacity-75"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={() => {
                  onQuickBuy(product);
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition active:scale-98 cursor-pointer"
              >
                {product.type === 'pdf' ? (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Buy PDF (₹{product.price})</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy Now (₹{product.price})</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Modal for High-Resolution Sample Pages */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={resolveImageUrl(lightboxImage)}
            alt="Sample Page Preview"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
