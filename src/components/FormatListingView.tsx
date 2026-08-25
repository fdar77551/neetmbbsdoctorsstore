import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  ShoppingCart, 
  Zap, 
  Share2, 
  BookOpen, 
  FileText, 
  Star, 
  CheckCircle2, 
  Download,
  Eye
} from 'lucide-react';
import { Product, ProductType } from '../types';
import { resolveImageUrl } from '../lib/storage';
import { downloadNotesPdf } from '../lib/pdfDownloader';

interface FormatListingViewProps {
  initialFormat: ProductType;
  products: Product[];
  wishlist: string[];
  purchasedPdfs: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  onToggleWishlist: (id: string) => void;
  onOpenPdfReader?: (pdfUrl: string, title: string) => void;
  initialCategory?: string;
}

export const FormatListingView: React.FC<FormatListingViewProps> = ({
  initialFormat,
  products,
  wishlist,
  purchasedPdfs,
  onBackToHome,
  onSelectProduct,
  onAddToCart,
  onQuickBuy,
  onToggleWishlist,
  onOpenPdfReader,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter products strictly by format
  const formatProducts = useMemo(() => {
    return products.filter(product => product.type === initialFormat);
  }, [products, initialFormat]);

  const handleShareClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
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

  const handleDownloadPdf = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setDownloadingId(product.id);
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
      setDownloadingId(null);
    }
  };

  return (
    <div id="format-listing-view" className="space-y-2 pb-8 animate-in fade-in duration-200">
      {/* Clean Minimalist Top Back Bar */}
      <div className="flex items-center justify-between py-1 px-1">
        <button
          type="button"
          id="back-to-home-btn"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <h2 className="text-xs font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
          {initialFormat === 'book' ? 'Physical Books' : 'PDF Study Notes'}
        </h2>

        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {formatProducts.length}
        </span>
      </div>

      {/* ================= VERTICAL LIST OF COMPACT HORIZONTAL PRODUCT CARDS ================= */}
      {/* 1 product per horizontal card, sized so up to 3 products fit per screen at a time */}
      {formatProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center space-y-2 shadow-xs">
          <p className="text-xs font-bold text-slate-700">No items available in this format yet.</p>
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
          >
            Back to Home
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {formatProducts.map((product) => {
            const isWishlisted = wishlist.includes(product.id);
            const isPurchased = product.type === 'pdf' && purchasedPdfs.includes(product.id);
            const discountPercent = Math.round(
              ((product.originalPrice - product.price) / product.originalPrice) * 100
            );

            return (
              <div
                key={product.id}
                id={`horizontal-product-card-${product.id}`}
                onClick={() => onSelectProduct(product)}
                className="group relative bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 sm:gap-4 overflow-hidden min-h-[160px] sm:min-h-[175px]"
              >
                {/* ================= LEFT DETAILS & ACTION BUTTONS ================= */}
                <div className="flex-1 flex flex-col justify-between min-w-0 pr-1 space-y-2 h-full py-0.5">
                  {/* Top: Category / Discount / Rating */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {discountPercent > 0 && (
                      <span className="bg-emerald-500 text-white font-black text-[8.5px] sm:text-[9px] px-1.5 py-0.5 rounded tracking-tight uppercase">
                        {discountPercent}% OFF
                      </span>
                    )}

                    {isPurchased && (
                      <span className="bg-emerald-600 text-white font-black text-[8.5px] sm:text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Purchased</span>
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px]">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{product.rating || 4.8}</span>
                    </div>
                  </div>

                  {/* Title & Author */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                      {product.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 font-medium mt-0.5">
                      {product.author || 'Verified Specialists'}
                    </p>
                  </div>

                  {/* Pricing Row */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm sm:text-base font-black text-slate-950">
                      ₹{product.price}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-[11px] text-slate-400 line-through font-normal">
                        ₹{product.originalPrice}
                      </span>
                    )}
                    {product.isFreeShipping && product.type === 'book' && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                        Free Delivery
                      </span>
                    )}
                  </div>

                  {/* Bottom Action Buttons: Compact Buy Now + ShoppingCart + Wishlist + Share */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap sm:flex-nowrap">
                    {isPurchased ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPdfReader && product.pdfUrl) {
                              onOpenPdfReader(product.pdfUrl, product.title);
                            } else {
                              onSelectProduct(product);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(e, product)}
                          disabled={downloadingId === product.id}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Quick Buy Button (Reduced / Auto Width) */}
                        <button
                          type="button"
                          id={`quick-buy-${product.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickBuy(product);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0"
                        >
                          <Zap className="w-3 h-3 fill-white" />
                          <span>Buy Now</span>
                        </button>

                        {/* Cart Icon Button (at right of Buy Now) */}
                        <button
                          type="button"
                          id={`add-to-cart-${product.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 rounded-xl transition active:scale-95 border border-slate-200/60 cursor-pointer"
                          title="Add to Cart"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      id={`wishlist-btn-${product.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      className={`p-1.5 rounded-xl border transition active:scale-90 cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-50 text-rose-500 border-rose-200'
                          : 'bg-slate-50 text-slate-400 hover:text-rose-500 border-slate-200/60'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      id={`share-btn-${product.id}`}
                      onClick={(e) => handleShareClick(e, product)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-white text-slate-400 hover:text-blue-600 border border-slate-200/60 transition active:scale-90 cursor-pointer"
                      title="Share Product"
                      aria-label="Share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ================= RIGHT PRODUCT COVER IMAGE (INCREASED PROPORTIONS) ================= */}
                <div className="w-32 sm:w-40 h-36 sm:h-42 shrink-0 flex items-center justify-center relative rounded-2xl bg-slate-50 border border-slate-200/70 overflow-hidden shadow-2xs p-1">
                  {product.coverImage ? (
                    <img
                      src={resolveImageUrl(product.coverImage)}
                      alt={product.title}
                      className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-300 rounded-xl"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-between p-2 text-center bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-xl">
                      {product.type === 'book' ? (
                        <BookOpen className="w-5 h-5 text-yellow-400 mb-0.5" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-300 mb-0.5" />
                      )}
                      <span className="text-[8px] font-black line-clamp-2">
                        {product.title}
                      </span>
                      <span className="text-[7px] text-blue-300 font-bold">Verified</span>
                    </div>
                  )}

                  {/* Format pill badge */}
                  <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[7.5px] font-black px-1.5 py-0.2 rounded uppercase">
                    {product.type === 'book' ? 'Hardcopy' : 'PDF'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
