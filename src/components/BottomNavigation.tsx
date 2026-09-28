import React from 'react';
import { Home, BookOpen, Package, User, ShieldCheck, ClipboardCheck } from 'lucide-react';

export type ActiveNavScreen = 
  | 'home' 
  | 'format-listing' 
  | 'orders' 
  | 'pdfs' 
  | 'account' 
  | 'admin' 
  | 'neet-pass'
  | 'mock-tests'
  | 'mock-test-cbt'
  | 'mock-test-result'
  | 'neet-full-course';

interface BottomNavigationProps {
  currentScreen: ActiveNavScreen;
  onNavigate: (screen: ActiveNavScreen) => void;
  isAdmin: boolean;
  orderBadgeCount?: number;
  pdfBadgeCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  isAdmin,
  orderBadgeCount = 0,
  pdfBadgeCount = 0
}) => {
  const isHomeActive = currentScreen === 'home' || currentScreen === 'format-listing';
  const isMockTestsActive = currentScreen === 'mock-tests' || currentScreen === 'mock-test-cbt' || currentScreen === 'mock-test-result';

  return (
    <nav 
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 rounded-t-xl sm:rounded-t-3xl px-1 sm:px-4 py-1 sm:py-1.5 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] max-w-md sm:max-w-lg mx-auto"
    >
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <button
          id="nav-btn-home"
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex-1 py-0.5 sm:py-1 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[38px] sm:min-h-[44px] ${
            isHomeActive
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className={`w-7 h-6 sm:w-8 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
            isHomeActive ? 'bg-sky-50 text-blue-600 shadow-2xs' : ''
          }`}>
            <Home className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none mt-0.5 ${isHomeActive ? 'font-black text-blue-600' : 'font-semibold text-slate-500'}`}>
            Home
          </span>
        </button>

        {/* 2. Mock Tests (NEET CBT) */}
        <button
          id="nav-btn-mock-tests"
          type="button"
          onClick={() => onNavigate('mock-tests')}
          className={`flex-1 py-0.5 sm:py-1 flex flex-col items-center justify-center relative transition-all cursor-pointer min-h-[38px] sm:min-h-[44px] ${
            isMockTestsActive
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <div className={`w-7 h-6 sm:w-8 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
              isMockTestsActive ? 'bg-sky-50 text-blue-600 shadow-2xs' : ''
            }`}>
              <ClipboardCheck className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isMockTestsActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className="absolute -top-1 -right-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[6.5px] sm:text-[7px] px-1 py-0.2 rounded-full border border-white shadow-2xs">
              CBT
            </span>
          </div>
          <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none mt-0.5 ${isMockTestsActive ? 'font-black text-blue-600' : 'font-semibold text-slate-500'}`}>
            Mock Tests
          </span>
        </button>

        {/* 3. Orders */}
        <button
          id="nav-btn-orders"
          type="button"
          onClick={() => onNavigate('orders')}
          className={`flex-1 py-0.5 sm:py-1 flex flex-col items-center justify-center relative transition-all cursor-pointer min-h-[38px] sm:min-h-[44px] ${
            currentScreen === 'orders'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <div className={`w-7 h-6 sm:w-8 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
              currentScreen === 'orders' ? 'bg-sky-50 text-blue-600 shadow-2xs' : ''
            }`}>
              <Package className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${currentScreen === 'orders' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            {orderBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-black text-[7.5px] sm:text-[8px] min-w-3 sm:min-w-3.5 h-3 sm:h-3.5 px-0.5 rounded-full flex items-center justify-center border border-white shadow-xs">
                {orderBadgeCount}
              </span>
            )}
          </div>
          <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none mt-0.5 ${currentScreen === 'orders' ? 'font-black text-blue-600' : 'font-semibold text-slate-500'}`}>
            Orders
          </span>
        </button>

        {/* 4. Profile / Account */}
        <button
          id="nav-btn-account"
          type="button"
          onClick={() => onNavigate('account')}
          className={`flex-1 py-0.5 sm:py-1 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[38px] sm:min-h-[44px] ${
            currentScreen === 'account'
              ? 'text-blue-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className={`w-7 h-6 sm:w-8 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
            currentScreen === 'account' ? 'bg-sky-50 text-blue-600 shadow-2xs' : ''
          }`}>
            <User className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${currentScreen === 'account' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none mt-0.5 ${currentScreen === 'account' ? 'font-black text-blue-600' : 'font-semibold text-slate-500'}`}>
            Profile
          </span>
        </button>

        {/* 5. Admin (Visible when Admin is logged in) */}
        {isAdmin && (
          <button
            id="nav-btn-admin"
            type="button"
            onClick={() => onNavigate('admin')}
            className={`flex-1 py-0.5 sm:py-1 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[38px] sm:min-h-[44px] ${
              currentScreen === 'admin'
                ? 'text-red-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className={`w-7 h-6 sm:w-8 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
              currentScreen === 'admin' ? 'bg-red-50 text-red-600 shadow-2xs' : ''
            }`}>
              <ShieldCheck className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${currentScreen === 'admin' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none mt-0.5 ${currentScreen === 'admin' ? 'font-black text-red-600' : 'font-semibold text-slate-500'}`}>
              Admin
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
