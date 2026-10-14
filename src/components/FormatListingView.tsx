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
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

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

      {/* ================= FLIPKART-STYLE 2-PER-ROW PRODUCT GRID ================= */}
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
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 sm:grid-cols-3 md:grid-cols-4">
          {formatProducts.map((product) => {
            const isWishlisted = wishlist.includes(product.id);
            const isPurchased = product.type === 'pdf' && purchasedPdfs.includes(product.id);
            const discountPercent = Math.round(
              ((product.originalPrice - product.price) / product.originalPrice) * 100
            );

            return (
              <div
                key={product.id}
                id={`product-card-${product.id}`}
                onClick={() => onSelectProduct(product)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-2 sm:p-3 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* ================= PRODUCT COVER IMAGE CONTAINER ================= */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-slate-100/80 mb-2 flex items-center justify-center p-1 group-hover:bg-slate-100/60 transition">
                    {product.coverImage && !failedImageIds[product.id] ? (
                      <img
                        src={resolveImageUrl(product.coverImage)}
                        alt={product.title}
                        className="w-full h-full object-contain group-hover:scale-104 transition-transform duration-300"
                        loading="lazy"
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
                          setFailedImageIds(prev => ({ ...prev, [product.id]: true }));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-between p-2 text-center bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white rounded-lg shadow-inner border border-blue-500/20">
                        <div className="w-full flex items-center justify-between text-[6.5px] font-black uppercase text-yellow-400">
                          <span>NEET MBBS</span>
                          <span>{product.type === 'book' ? 'BOOK' : 'PDF'}</span>
                        </div>
                        <div className="my-auto px-0.5">
                          {product.type === 'book' ? (
                            <BookOpen className="w-4 h-4 text-yellow-400 mx-auto mb-0.5 opacity-90" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-300 mx-auto mb-0.5 opacity-90" />
                          )}
                          <span className="text-[8px] font-black line-clamp-2 leading-tight block">
                            {product.title}
                          </span>
                        </div>
                        <span className="text-[6px] bg-white/15 px-1 py-0.2 rounded-full text-blue-100 font-bold">
                          100% NCERT
                        </span>
                      </div>
                    )}

                    {/* Top-Right Floating Wishlist Heart */}
                    <button
                      type="button"
                      id={`wishlist-btn-${product.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      className={`absolute top-1.5 right-1.5 p-1 rounded-full shadow-xs backdrop-blur-xs transition active:scale-90 cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-50 text-rose-500 border border-rose-200'
                          : 'bg-white/85 text-slate-400 hover:text-rose-500 border border-slate-200/60'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-rose-500' : ''}`} />
                    </button>

                    {/* Top-Left Floating Discount Pill */}
                    {discountPercent > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white font-black text-[7.5px] sm:text-[8px] px-1.5 py-0.5 rounded-md shadow-xs uppercase">
                        {discountPercent}% OFF
                      </span>
                    )}

                    {/* Format Pill */}
                    <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[7px] font-black px-1.5 py-0.2 rounded uppercase">
                      {product.type === 'book' ? 'Hardcopy' : 'PDF'}
                    </span>
                  </div>

                  {/* Title & Author */}
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-[13px] font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition font-['Outfit',sans-serif]">
                      {product.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 font-medium">
                      {product.author || 'Verified Specialists'}
                    </p>
                  </div>

                  {/* Rating & Purchased Status */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black text-white bg-emerald-600 px-1.5 py-0.2 rounded">
                      <span>{product.rating || 4.8}</span>
                      <Star className="w-2.5 h-2.5 fill-white text-white" />
                    </span>

                    {isPurchased && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[8px] px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Owned</span>
                      </span>
                    )}
                  </div>

                  {/* Flipkart Pricing Row */}
                  <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-slate-950 font-['Outfit',sans-serif]">
                      ₹{product.price}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-[10px] sm:text-[11px] text-slate-400 line-through font-normal">
                        ₹{product.originalPrice}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="text-[9.5px] sm:text-[10px] font-black text-emerald-600">
                        {discountPercent}% off
                      </span>
                    )}
                  </div>

                  {/* Free Delivery Tag */}
                  {product.isFreeShipping && product.type === 'book' && (
                    <div className="mt-1">
                      <span className="text-[8.5px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                        Free delivery
                      </span>
                    </div>
                  )}
                </div>

                {/* ================= BOTTOM ACTION BUTTONS ================= */}
                <div className="pt-2 sm:pt-2.5 border-t border-slate-100 mt-2">
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
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-[10px] sm:text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Read</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(e, product)}
                        disabled={downloadingId === product.id}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Download PDF"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        id={`quick-buy-${product.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickBuy(product);
                        }}
                        className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-[10.5px] sm:text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Zap className="w-3 h-3 fill-white" />
                        <span>Buy Now</span>
                      </button>

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

                      <button
                        type="button"
                        id={`share-btn-${product.id}`}
                        onClick={(e) => handleShareClick(e, product)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-blue-600 border border-slate-200/60 transition active:scale-90 cursor-pointer"
                        title="Share Product"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
