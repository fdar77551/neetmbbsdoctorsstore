import React from 'react';
import { Heart, ShoppingBag, Trash2, ArrowLeft, ArrowRight, BookOpen, Star, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { Product } from '../types';

interface WishlistSectionViewProps {
  wishlistIds: string[];
  products: Product[];
  onToggleWishlist: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onInstantBuy: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
  onBackToHome: () => void;
  onClearWishlist?: () => void;
}

export const WishlistSectionView: React.FC<WishlistSectionViewProps> = ({
  wishlistIds,
  products,
  onToggleWishlist,
  onAddToCart,
  onInstantBuy,
  onOpenProduct,
  onBackToHome,
  onClearWishlist
}) => {
  const wishlistedProducts = products.filter(p => wishlistIds.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-3 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Store</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-2xs">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif] leading-tight">
                  My Wishlist
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {wishlistedProducts.length} saved {wishlistedProducts.length === 1 ? 'item' : 'items'} ready for NEET preparation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wishlistedProducts.length > 0 && onClearWishlist && (
              <button
                type="button"
                onClick={onClearWishlist}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-98"
            >
              <span>Explore More Books</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Empty Wishlist State */}
        {wishlistedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-14 text-center space-y-4 shadow-2xs max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                Your Wishlist is Empty
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Save essential NEET prep books, high-yield formula sheets, and PDF question banks to study anytime. Tap the heart icon on any product to save it here!
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToHome}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer"
              >
                Browse NEET Medical Books & Guides
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlistedProducts.map(product => {
              const discount = product.originalPrice && product.originalPrice > product.price
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Image & Quick Action */}
                  <div className="relative aspect-4/5 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onOpenProduct(product)}>
                    <img
                      src={product.coverImage}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white border border-white/20 shadow-2xs">
                        {product.type === 'pdf' ? '⚡ Instant PDF' : '📖 Printed Book'}
                      </span>
                      {discount > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {/* Remove Wishlist Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-rose-500 shadow-md flex items-center justify-center transition active:scale-90 cursor-pointer"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </button>
                  </div>

                  {/* Content & Actions */}
                  <div className="p-3.5 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
                        <div className="flex items-center">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="ml-1 text-slate-800 font-black">{product.rating || 4.8}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 text-[10px]">{product.category || 'NEET Core'}</span>
                      </div>

                      <h3
                        onClick={() => onOpenProduct(product)}
                        className="text-xs sm:text-sm font-black text-slate-900 font-['Outfit',sans-serif] leading-snug line-clamp-2 hover:text-blue-600 transition cursor-pointer"
                      >
                        {product.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        By {product.author || 'NEET MBBS Specialists'}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      {/* Price Display */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
                          ₹{product.price}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{product.originalPrice}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(product);
                            onToggleWishlist(product.id);
                          }}
                          className="py-2 px-2.5 bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">To Cart</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onInstantBuy(product)}
                          className="py-2 px-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5 shrink-0 text-yellow-300" />
                          <span className="truncate">Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
