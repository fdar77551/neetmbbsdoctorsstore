import React from 'react';
import { ArrowRight, BookOpen, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { Product, ProductType } from '../types';
import { ProductCard } from './ProductCard';

interface HomeProductShowcaseSectionProps {
  type: ProductType;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor?: 'orange' | 'cyan' | 'purple';
  products: Product[];
  wishlist: string[];
  purchasedProductIds: string[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onQuickBuy: (p: Product) => void;
  onToggleWishlist: (id: string) => void;
  onOpenPdfReader: (url: string, title: string) => void;
  onViewAll: () => void;
}

export const HomeProductShowcaseSection: React.FC<HomeProductShowcaseSectionProps> = ({
  type,
  title,
  subtitle,
  badgeText,
  badgeColor = 'orange',
  products,
  wishlist,
  purchasedProductIds,
  onSelectProduct,
  onAddToCart,
  onQuickBuy,
  onToggleWishlist,
  onOpenPdfReader,
  onViewAll
}) => {
  const filtered = products.filter(p => p.type === type).slice(0, 4);

  if (filtered.length === 0) return null;

  const colorStyles = {
    orange: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
      icon: 'text-amber-600',
      headerDot: 'bg-orange-500',
      viewAllText: 'text-orange-600 hover:text-orange-700'
    },
    cyan: {
      badge: 'bg-sky-50 text-sky-800 border-sky-200/80',
      icon: 'text-sky-600',
      headerDot: 'bg-sky-500',
      viewAllText: 'text-sky-600 hover:text-sky-700'
    },
    purple: {
      badge: 'bg-purple-50 text-purple-800 border-purple-200/80',
      icon: 'text-purple-600',
      headerDot: 'bg-purple-500',
      viewAllText: 'text-purple-600 hover:text-purple-700'
    }
  }[badgeColor];

  return (
    <section id={`home-${type}-section`} className="space-y-3 pt-2">
      {/* Header with Title, Tagline, and View All link */}
      <div className="flex items-end justify-between px-0.5">
        <div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider mb-1 ${colorStyles.badge}`}>
            {type === 'book' ? (
              <BookOpen className="w-3 h-3" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            <span>{badgeText}</span>
          </div>

          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-['Outfit',sans-serif] leading-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className={`inline-flex items-center gap-1 text-xs font-black transition cursor-pointer select-none ${colorStyles.viewAllText}`}
        >
          <span>View All ({products.filter(p => p.type === type).length})</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Products (2 columns on mobile, 4 columns on desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
        {filtered.map(product => {
          const isWishlisted = wishlist.includes(product.id);
          const isPurchased = purchasedProductIds.includes(product.id);

          return (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={isWishlisted}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onQuickBuy={onQuickBuy}
              onSelect={onSelectProduct}
              isPurchased={isPurchased}
              onOpenPdfReader={onOpenPdfReader}
            />
          );
        })}
      </div>

      {/* Mobile-only View All CTA Button */}
      <div className="sm:hidden pt-0.5">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-2 bg-slate-100/80 hover:bg-slate-200/80 active:scale-98 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <span>View All {title}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
