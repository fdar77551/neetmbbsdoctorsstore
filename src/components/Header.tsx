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
  currentScreen?: string;
  onNavigate?: (screen: any) => void;
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
  onSelectFormat,
  currentScreen = 'home',
  onNavigate
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSelectFormat) {
      onSelectFormat('book');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 shadow-xs border-b border-sky-100">
      {/* Top Branding & Main Navigation Bar */}
      <div className="px-3 sm:px-6 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 bg-white/95">
        {/* Brand Identity with Logo + Verified Badge + Subtitle */}
        <div 
          onClick={() => onNavigate && onNavigate('home')} 
          className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer select-none group"
        >
          <div className="relative">
            <BrandLogo size="sm" className="sm:hidden border border-sky-100 shadow-2xs shrink-0 group-hover:scale-105 transition-transform" />
            <BrandLogo size="md" className="hidden sm:block border-2 border-sky-100 shadow-2xs shrink-0 group-hover:scale-105 transition-transform" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border border-white sm:border-2 flex items-center justify-center">
              <span className="text-[6.5px] sm:text-[7px] text-white font-black leading-none">✓</span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight font-['Outfit',sans-serif]">
                neetmbbsdoctors
              </span>
              <CheckCircle className="w-3 h-3 text-sky-600 fill-sky-50 shrink-0" />
              {isAdmin && (
                <span className="text-[7px] sm:text-[7.5px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase ml-0.5 shadow-2xs">
                  Admin
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[9.5px] text-sky-700/80 font-bold uppercase tracking-wider leading-none">
              DREAM • STUDY • BECOME A DOCTOR
            </span>
          </div>
        </div>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('home')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentScreen === 'home' 
                ? 'bg-sky-50 text-sky-700' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('mock-tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentScreen === 'mock-tests' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50/60'
            }`}
          >
            <span>Mock Tests</span>
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-2xs">
              CBT
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectFormat) onSelectFormat('book');
              if (onNavigate) onNavigate('format-listing');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            Physical Books
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectFormat) onSelectFormat('pdf');
              if (onNavigate) onNavigate('format-listing');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            PDF Notes
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('neet-pass')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            NEET Pass
          </button>
        </nav>

        {/* Right Actions: Search + Wishlist + Cart + Account */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* 1. Search Icon Button */}
          <button
            type="button"
            id="header-search-toggle-btn"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex sm:flex-col items-center justify-center p-1.5 sm:px-1.5 rounded-xl transition cursor-pointer ${
              isSearchOpen || searchQuery ? 'text-blue-600 bg-sky-50' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
            }`}
            title="Search"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="hidden sm:inline-block text-[8.5px] font-bold mt-0.5 leading-none">
              Search
            </span>
          </button>

          {/* 2. Wishlist */}
          <button
            type="button"
            id="header-wishlist-btn"
            onClick={onOpenWishlist}
            className="relative hidden sm:flex flex-col items-center justify-center p-1 sm:px-1.5 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-50/50 transition cursor-pointer"
            title="Wishlist"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[8px] font-black min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center border border-white shadow-2xs">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              Wishlist
            </span>
          </button>

          {/* 3. Cart */}
          <button
            type="button"
            id="header-cart-btn"
            onClick={onOpenCart}
            className="relative flex sm:flex-col items-center justify-center p-1.5 sm:px-1.5 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-sky-50/50 transition cursor-pointer"
            title="Shopping Cart"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center relative">
              <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-800" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-rose-600 text-white text-[7.5px] sm:text-[8px] font-black min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center border border-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline-block text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              Cart
            </span>
          </button>

          {/* 4. Login / Account */}
          <button
            type="button"
            id="header-user-btn"
            onClick={onOpenAuth}
            className="flex sm:flex-col items-center justify-center p-1.5 sm:px-1.5 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
            title={userEmail ? `Account: ${userEmail}` : 'Login / Sign In'}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-sky-100 to-blue-100 border border-sky-300 text-sky-800 flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-2xs">
              {userEmail ? userEmail.charAt(0).toUpperCase() : <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </div>
            <span className="hidden sm:inline-block text-[8.5px] font-bold text-slate-600 mt-0.5 leading-none">
              {userEmail ? 'Account' : 'Login'}
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
