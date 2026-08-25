import React from 'react';
import { Home, BookOpen, Package, User, ShieldCheck } from 'lucide-react';

export type ActiveNavScreen = 'home' | 'format-listing' | 'orders' | 'pdfs' | 'account' | 'admin';

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

  return (
    <nav 
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-x border-slate-200/80 rounded-t-[20px] px-4 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] max-w-md mx-auto"
    >
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          id="nav-btn-home"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 transition-all ${
            isHomeActive
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isHomeActive ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-300'
          }`}>
            <Home className="w-3 h-3" />
          </div>
          <span className="text-[9px] font-bold">Home</span>
        </button>

        {/* Orders */}
        <button
          id="nav-btn-orders"
          onClick={() => onNavigate('orders')}
          className={`flex flex-col items-center gap-1 relative transition-all ${
            currentScreen === 'orders'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              currentScreen === 'orders' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-300'
            }`}>
              <Package className="w-3 h-3" />
            </div>
            {orderBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                {orderBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold">Orders</span>
        </button>

        {/* My PDFs (Purchased Digital Library) */}
        <button
          id="nav-btn-pdfs"
          onClick={() => onNavigate('pdfs')}
          className={`flex flex-col items-center gap-1 relative transition-all ${
            currentScreen === 'pdfs'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              currentScreen === 'pdfs' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-300'
            }`}>
              <BookOpen className="w-3 h-3" />
            </div>
            {pdfBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                {pdfBadgeCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold">My PDFs</span>
        </button>

        {/* Account / Profile */}
        <button
          id="nav-btn-account"
          onClick={() => onNavigate('account')}
          className={`flex flex-col items-center gap-1 transition-all ${
            currentScreen === 'account'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            currentScreen === 'account' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-300'
          }`}>
            <User className="w-3 h-3" />
          </div>
          <span className="text-[9px] font-bold">Profile</span>
        </button>

        {/* Admin (For fdar77551@gmail.com and shahzaibhusain6@gmail.com) */}
        {isAdmin && (
          <button
            id="nav-btn-admin"
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              currentScreen === 'admin'
                ? 'text-red-600 font-bold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className="relative">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                currentScreen === 'admin' ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-300'
              }`}>
                <ShieldCheck className="w-3 h-3 text-red-600" />
              </div>
              <span className="absolute -top-1 -right-2 bg-red-600 text-white font-black text-[7px] px-1 rounded-full">
                ADMIN
              </span>
            </div>
            <span className="text-[9px] font-bold text-red-600">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};
