import React, { useState } from 'react';
import { 
  ArrowLeft, 
  X, 
  Star, 
  ShoppingBag, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Download, 
  Share2, 
  CheckCircle2, 
  FileText, 
  Heart, 
  Image as ImageIcon, 
  Eye, 
  BookOpen,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
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

  const savingsAmount = product.originalPrice - product.price;

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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 overflow-y-auto animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Real App (Flipkart Style) Responsive Container: Full screen on mobile, elegant wide dialog on desktop */}
      <div 
        id="product-detail-modal-container"
        className="w-full h-full md:h-auto md:max-h-[92vh] max-w-5xl bg-white md:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border border-slate-200"
      >
        {/* Flipkart Style Top App Bar Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold truncate">
              <span className="hidden sm:inline hover:underline cursor-pointer" onClick={onClose}>Store</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border border-blue-100 shrink-0">
                {product.type === 'pdf' ? '⚡ Digital PDF' : '📖 Physical Book'}
              </span>
              <span className="text-slate-300 hidden md:inline">/</span>
              <span className="text-slate-700 truncate max-w-[200px] hidden md:inline">{product.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-slate-600 hover:text-blue-600 rounded-full hover:bg-blue-50 transition cursor-pointer flex items-center gap-1"
              title="Share Product"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">{copied ? 'Copied Link' : 'Share'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Body: 2-Column Desktop Grid / 1-Column Mobile Flow */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
            
            {/* ================= LEFT COLUMN: Flipkart Style Image Gallery & Quick CTAs ================= */}
            <div className="md:col-span-5 space-y-4">
              
              {/* Main Image Box */}
              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden border border-slate-200/90 shadow-2xs group min-h-[260px] sm:min-h-[320px]">
                
                {/* Special Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                  {discountPercent > 0 && (
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                      {discountPercent}% OFF
                    </span>
                  )}
                  <span className="bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    NCERT 2026
                  </span>
                </div>

                {/* Main Image */}
                <div className="relative w-full flex items-center justify-center py-2">
                  {allImages.length > 0 && !imageErrors[activeImageIndex] ? (
                    <img
                      src={resolveImageUrl(allImages[activeImageIndex] || product.coverImage)}
                      alt={product.title}
                      onClick={() => setLightboxImage(allImages[activeImageIndex] || product.coverImage)}
                      className="max-h-72 sm:max-h-80 max-w-full object-contain rounded-xl shadow-md cursor-zoom-in group-hover:scale-102 transition duration-200"
                      referrerPolicy="no-referrer"
                      onError={() => setImageErrors(prev => ({ ...prev, [activeImageIndex]: true }))}
                    />
                  ) : (
                    <div className="w-48 h-64 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 rounded-xl flex flex-col items-center justify-between p-4 text-white text-center shadow-md border border-blue-500/30">
                      <div className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-amber-300">
                        <span>NEET MBBS</span>
                        <span>{product.type === 'pdf' ? '⚡ PDF' : '📖 BOOK'}</span>
                      </div>
                      <div className="my-auto px-1">
                        <span className="text-sm font-black leading-tight line-clamp-3 block text-white drop-shadow-xs">
                          {product.title}
                        </span>
                        <span className="text-xs text-blue-200 font-medium mt-1.5 block">
                          {product.author || 'NEET Doctors Faculty'}
                        </span>
                      </div>
                      <div className="w-full text-center">
                        <span className="text-[9px] bg-white/15 px-2.5 py-1 rounded-full text-blue-100 font-bold border border-white/10">
                          100% NCERT Verified
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tap to Zoom prompt button */}
                  <button
                    type="button"
                    onClick={() => setLightboxImage(allImages[activeImageIndex] || product.coverImage)}
                    className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-xs transition cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Zoom</span>
                  </button>
                </div>

                {/* Thumbnails list underneath image */}
                {allImages.length > 1 && (
                  <div className="w-full mt-3 pt-3 border-t border-slate-200/80">
                    <div className="text-[10px] font-extrabold uppercase text-slate-500 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-blue-600" />
                        <span>Sample Previews ({allImages.length})</span>
                      </span>
                      <span className="text-[9px] text-slate-400">Click to view</span>
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
                            alt={`Preview ${idx + 1}`}
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

              {/* Desktop Flipkart Style Action Buttons (Below Gallery) */}
              <div className="hidden md:flex items-center gap-3 pt-1">
                {isPdfPurchased ? (
                  <div className="w-full flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onOpenPdfReader) onOpenPdfReader(product.pdfUrl || '', product.title);
                        onClose();
                      }}
                      className="flex-1 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border border-blue-200 shadow-2xs"
                    >
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Read Online</span>
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isDownloading}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCart(product);
                        onClose();
                      }}
                      className="flex-1 py-3.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-400/20 active:scale-98"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>ADD TO CART</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onQuickBuy(product);
                        onClose();
                      }}
                      className="flex-1 py-3.5 px-4 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-98"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>BUY NOW</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ================= RIGHT COLUMN: Flipkart Style Details, Pricing, Offers & Specs ================= */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Product Title and Brand */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                    {product.category || 'NEET Study Material'}
                  </span>
                  
                  {/* Rating Badge */}
                  <div className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-md text-xs font-black shadow-2xs">
                    <span>{product.rating ?? 4.8}</span>
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                  
                  <span className="text-xs text-slate-500 font-medium">
                    ({product.reviewsCount ?? 1420} Ratings &amp; {Math.round((product.reviewsCount ?? 1420) * 0.35)} Reviews)
                  </span>
                </div>

                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-snug">
                  {product.title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Prepared by <strong className="text-slate-800">{product.author || 'NEET MBBS Doctors Board'}</strong>
                </p>
              </div>

              {/* Price & Discount Banner (Flipkart Style) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit',sans-serif]">
                    ₹{product.price}
                  </span>
                  {product.originalPrice > product.price && (
                    <>
                      <span className="text-sm sm:text-base text-slate-400 line-through">
                        ₹{product.originalPrice}
                      </span>
                      <span className="text-sm font-black text-emerald-600">
                        {discountPercent}% off
                      </span>
                    </>
                  )}
                </div>

                {savingsAmount > 0 && (
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>You save ₹{savingsAmount} on this order</span>
                  </p>
                )}
              </div>

              {/* Available Offers Card (Flipkart App Style) */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <span>Available Offers &amp; Discounts</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">🏷️ Bank Offer:</span>
                    <span>Instant UPI / Card discount with zero processing fees.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-700 font-bold shrink-0">⚡ Special Coupon:</span>
                    <span>Use code <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-800">NEET2026</strong> at checkout for bonus savings.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 font-bold shrink-0">📦 Delivery:</span>
                    <span>{product.type === 'pdf' ? 'Instant 5-second Google Drive & Direct Download access.' : 'Free Express Pan-India home delivery within 3-5 days.'}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mb-1" />
                  <span className="font-bold text-[11px] text-slate-800">100% Genuine</span>
                  <span className="text-[9px] text-slate-400">NCERT Authentic</span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center">
                  <Truck className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="font-bold text-[11px] text-slate-800">{product.type === 'pdf' ? 'Instant PDF' : 'Free Shipping'}</span>
                  <span className="text-[9px] text-slate-400">Lifetime Access</span>
                </div>
                <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="font-bold text-[11px] text-slate-800">High Yield</span>
                  <span className="text-[9px] text-slate-400">AIIMS / GMC Focus</span>
                </div>
              </div>

              {/* Highlights & Features */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Product Highlights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  {(product.features && product.features.length > 0 ? product.features : [
                    'Complete NCERT Syllabus Class 11 & 12',
                    'Handwritten Doctor Notes & Flowcharts',
                    'High-Yield Formulae & Mechanisms',
                    'Instant PDF Download & Offline Reading'
                  ]).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Product Description
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                  {product.description || 'Complete study notes specially compiled by doctors and top rankers for NEET aspirants. Includes high-yield conceptual points, diagrams, and memory hacks.'}
                </p>
              </div>

              {/* Student Ratings & Review Section */}
              <div className="pt-2 border-t border-slate-100">
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

          </div>
        </div>

        {/* Mobile Sticky Bottom Action Buttons Bar (Flipkart App Layout) */}
        <div className="md:hidden sticky bottom-0 z-30 bg-white border-t border-slate-200 p-2.5 sm:p-3 flex items-center gap-2 shadow-xl">
          {isPdfPurchased ? (
            <div className="w-full flex items-center gap-2">
              <button
                onClick={() => {
                  if (onOpenPdfReader) onOpenPdfReader(product.pdfUrl || '', product.title);
                  onClose();
                }}
                className="flex-1 py-3 px-3 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Read Online</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 py-3 px-3 bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="flex-1 py-3 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>ADD TO CART</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickBuy(product);
                  onClose();
                }}
                className="flex-1 py-3 px-3 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-98 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>BUY NOW (₹{product.price})</span>
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
