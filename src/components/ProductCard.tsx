import React, { useState } from 'react';
import { Heart, Star, ShoppingCart, Zap, Share2, BookOpen, FileText, Download, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { resolveImageUrl } from '../lib/storage';
import { downloadNotesPdf } from '../lib/pdfDownloader';

export { resolveImageUrl };

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  onSelect: (product: Product) => void;
  onShare?: (product: Product) => void;
  isPurchased?: boolean;
  onOpenPdfReader?: (pdfUrl: string, title: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onQuickBuy,
  onSelect,
  onShare,
  isPurchased = false,
  onOpenPdfReader
}) => {
  const [imgError, setImgError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(product);
      return;
    }

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
      }
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank');
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleReadPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenPdfReader) {
      onOpenPdfReader(product.pdfUrl || '', product.title);
    } else {
      onSelect(product);
    }
  };

  const isPdfPurchased = product.type === 'pdf' && isPurchased;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group relative bg-white text-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-100 flex flex-col justify-between"
    >
      {/* Top Action Icons (Share + Wishlist) */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
        {/* Share Button */}
        <button
          id={`share-btn-${product.id}`}
          onClick={handleShareClick}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/95 text-slate-600 hover:text-blue-600 hover:bg-white shadow-xs border border-slate-100/80 transition-all active:scale-90 cursor-pointer"
          title="Share to WhatsApp / Friends"
          aria-label="Share product"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Wishlist Heart Icon */}
        <button
          id={`wishlist-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-100/80 ${
            isWishlisted
              ? 'bg-rose-50 text-rose-500 shadow-xs'
              : 'bg-white/95 text-slate-400 hover:text-rose-500 hover:bg-white shadow-xs'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-4.5 h-4.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      {/* Discount / Digital / Purchased Tag */}
      {isPdfPurchased ? (
        <div className="absolute top-2.5 left-2.5 z-20 bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-2xs tracking-tight uppercase flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Purchased</span>
        </div>
      ) : discountPercent > 0 ? (
        <div className="absolute top-2.5 left-2.5 z-20 bg-emerald-500 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded shadow-2xs tracking-tight uppercase">
          {discountPercent}% OFF
        </div>
      ) : product.type === 'pdf' ? (
        <div className="absolute top-2.5 left-2.5 z-20 bg-blue-600 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded shadow-2xs tracking-tight uppercase">
          PDF Note
        </div>
      ) : null}

      {/* Direct Clean Product Cover Image (Increased Width & Height) */}
      <div 
        onClick={() => onSelect(product)}
        className="cursor-pointer pt-2 pb-2 flex items-center justify-center relative overflow-hidden rounded-xl bg-slate-50/80 min-h-[160px] sm:min-h-[175px]"
      >
        {product.coverImage && !imgError ? (
          <img
            src={resolveImageUrl(product.coverImage)}
            alt={product.title}
            className="w-full h-40 sm:h-44 object-contain rounded-lg transition-transform duration-200 group-hover:scale-103"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              const currentSrc = target.src;
              // If it failed on direct r2.dev (e.g. ISP blocked on mobile), try our reliable server proxy
              if (currentSrc.includes('.r2.dev/') && !currentSrc.includes('/api/r2/file/')) {
                const key = currentSrc.split('.r2.dev/')[1];
                if (key) {
                  target.src = `/api/r2/file/${key.replace(/^\/+/, '')}`;
                  return;
                }
              }
              // If proxy or other source also fails, show the handsome fallback card
              setImgError(true);
            }}
          />
        ) : (
          <div className="w-full h-40 sm:h-44 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-lg flex flex-col items-center justify-between p-3 text-white text-center shadow-xs border border-blue-500/30 relative overflow-hidden">
            <div className="w-full flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-yellow-400">
              <span className="flex items-center gap-1">
                {product.type === 'pdf' ? <FileText className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />}
                NEET MBBS
              </span>
              <span>{product.type === 'pdf' ? 'PDF NOTE' : '2026'}</span>
            </div>
            <div className="my-auto px-1 py-1">
              <span className="text-xs font-black leading-tight line-clamp-2 block text-white drop-shadow-xs">
                {product.title}
              </span>
              <span className="text-[9.5px] text-blue-200 font-medium mt-1 block truncate">
                {product.author || 'NEET Doctors Board'}
              </span>
            </div>
            <div className="w-full flex items-center justify-center">
              <span className="text-[8px] bg-white/15 px-2 py-0.5 rounded-full text-blue-100 font-bold border border-white/10">
                100% NCERT Verified
              </span>
            </div>
          </div>
        )}

        {/* Sample Pages Indicator Badge */}
        {product.sampleImages && product.sampleImages.length > 0 && (
          <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs">
            <span>📸 {product.sampleImages.length} sample pages</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col justify-between mt-1.5">
        <div onClick={() => onSelect(product)} className="cursor-pointer">
          {/* Title (2 lines clamp) */}
          <h3 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 hover:text-blue-600 transition min-h-[34px]">
            {product.title}
          </h3>

          {/* Author/Publisher */}
          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            {product.author}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-700">{product.rating}</span>
            <span className="text-[9px] text-slate-400">
              ({product.reviewsCount > 999 ? `${(product.reviewsCount / 1000).toFixed(1)}k` : product.reviewsCount})
            </span>
          </div>

          {/* Pricing Row OR Purchased Status Banner */}
          <div className="flex items-baseline justify-between mt-1.5 min-h-[22px]">
            {isPdfPurchased ? (
              <span className="text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Unlocked in Library</span>
              </span>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-blue-600">
                    ₹{product.price}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-[10.5px] font-normal text-slate-400 line-through">
                      ₹{product.originalPrice}
                    </span>
                  )}
                </div>
                {product.type === 'book' && (
                  <span className="text-[9px] font-bold text-emerald-600">
                    {product.shippingCost && product.shippingCost > 0 ? `+₹${product.shippingCost} delivery` : 'Free Delivery'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Button Row */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
          {isPdfPurchased ? (
            /* Purchased PDF Action: Download & Read Online */
            <div className="w-full flex items-center gap-2">
              <button
                id={`download-pdf-btn-${product.id}`}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-75"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Saving...' : 'Download PDF'}</span>
              </button>

              <button
                id={`read-pdf-btn-${product.id}`}
                onClick={handleReadPdf}
                title="Read Online"
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl transition active:scale-95 border border-blue-200 cursor-pointer flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read</span>
              </button>
            </div>
          ) : (
            /* Standard Purchase Buttons */
            <>
              <button
                id={`buy-btn-${product.id}`}
                onClick={() => onQuickBuy(product)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                {product.type === 'pdf' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Buy PDF</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Buy Now</span>
                  </>
                )}
              </button>

              <button
                id={`add-cart-${product.id}`}
                onClick={() => onAddToCart(product)}
                title="Add to Cart"
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl transition active:scale-95 border border-slate-200 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
