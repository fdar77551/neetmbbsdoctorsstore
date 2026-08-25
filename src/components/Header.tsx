import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Heart, 
  CheckCircle,
  X
} from 'lucide-react';
import { ProductType } from '../types';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  activeTab?: ProductType;
  onTabChange?: (tab: ProductType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAuth: () => void;
  userEmail?: string | null;
  isAdmin?: boolean;
  onSelectCategory?: (category: string) => void;
  onSelectFormat?: (format: ProductType) => void;
  isHomeView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenAuth,
  userEmail,
  isAdmin,
  onSelectFormat
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSelectFormat) {
      onSelectFormat('book');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 shadow-xs border-b border-slate-100">
      {/* Top Branding & Main Navigation Bar */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-1.5 bg-white">
        {/* Brand Identity with Logo + Verified Badge + Subtitle */}
        <div className="flex items-center gap-2">
          <BrandLogo size="md" className="border border-slate-200/80 shadow-2xs shrink-0" />

          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
                Doctors Store
              </span>
              <CheckCircle className="w-3 h-3 text-blue-600 fill-blue-50 shrink-0" />
              {isAdmin && (
                <span className="text-[7.5px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase ml-0.5">
                  Admin
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-medium tracking-tight leading-none">
              Learn. Prepare. Practice. Achieve.
            </span>
          </div>
        </div>

        {/* Right Actions: Search (left of Account) + Login/Account + Wishlist + Cart */}
        <div className="flex items-center gap-0.5 sm:gap-1.5">
          {/* 1. Search Icon Button (at left of Account) */}
          <button
            type="button"
            id="header-search-toggle-btn"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex flex-col items-center justify-center p-1 sm:px-1.5 rounded-xl transition cursor-pointer ${
              isSearchOpen || searchQuery ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
            }`}
            title="Search"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600">
              <Search className="w-4 h-4" />
            </div>
            <span className="text-[8.5px] font-bold mt-0.5 leading-none">
              Search
            </span>
          </button>

          {/* 2. Login / Account */}
          <button
            type="button"
            id="header-user-btn"
            onClick={onOpenAuth}
            className="flex flex-col items-center justify-center p-1 sm:px-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
            title={userEmail ? `Account: ${userEmail}` : 'Login / Sign In'}
          >
            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-black text-[10px]">
              {userEmail ? userEmail.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              {userEmail ? 'Account' : 'Login'}
            </span>
          </button>

          {/* 3. Wishlist */}
          <button
            type="button"
            id="header-wishlist-btn"
            onClick={onOpenWishlist}
            className="relative flex flex-col items-center justify-center p-1 sm:px-1.5 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-slate-50 transition cursor-pointer"
            title="Wishlist"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-2xs">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              Wishlist
            </span>
          </button>

          {/* 4. Cart */}
          <button
            type="button"
            id="header-cart-btn"
            onClick={onOpenCart}
            className="relative flex flex-col items-center justify-center p-1 sm:px-1.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
            title="Shopping Cart"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <ShoppingCart className="w-4 h-4 text-slate-800" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-blue-600 text-white text-[8px] font-black min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center border border-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              Cart
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Search Input Row (Active when Search Icon is toggled or when search is typed) */}
      {(isSearchOpen || searchQuery) && (
        <div className="px-3 sm:px-4 pb-2 pt-1 border-t border-slate-100 bg-slate-50/70 animate-in fade-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              id="main-search-input"
              type="text"
              autoFocus
              placeholder="Search in books, PDF notes, subjects..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white text-slate-900 placeholder:text-slate-400 pl-3 pr-16 py-1.5 rounded-xl text-xs font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                title="Search"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
