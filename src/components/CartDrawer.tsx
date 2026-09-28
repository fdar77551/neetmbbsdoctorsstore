import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';
import { CartItem } from '../types';
import { resolveImageUrl } from './ProductCard';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const originalTotal = cart.reduce(
    (sum, item) => sum + item.product.originalPrice * item.quantity,
    0
  );
  const totalShipping = cart.reduce((sum, item) => {
    if (item.product.type === 'pdf' || item.product.isFreeShipping) return sum;
    return sum + (Number(item.product.shippingCost) || 0) * item.quantity;
  }, 0);
  const totalAmount = subtotal + totalShipping;
  const totalSavings = originalTotal - subtotal;

  return (
    <div className="fixed inset-0 z-50 bg-white flex justify-center animate-in fade-in duration-200 overflow-hidden">
      {/* Full Page Mobile Cart Shell */}
      <div 
        id="cart-full-page"
        className="w-full max-w-md bg-white min-h-screen flex flex-col relative shadow-xl border-x border-slate-100"
      >
        {/* Cart Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 -ml-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 tracking-wide font-['Outfit',sans-serif]">
                Your Shopping Cart
              </h2>
              <p className="text-[10px] text-slate-400">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} ready for checkout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Free Shipping & Fast Access Banner */}
        {subtotal > 0 && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-900 font-bold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
              <span>Free Pan-India Delivery & Instant Digital PDF Access</span>
            </span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base font-['Outfit',sans-serif]">
                Your Cart is Empty
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Explore best-selling NEET MBBS books, chapterwise solutions, and topper handwritten PDFs.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                Explore Books & Notes
              </button>
            </div>
          ) : (
            cart.map(({ product, quantity }) => {
              const cover = resolveImageUrl(product.coverImage);
              return (
                <div
                  key={product.id}
                  className="p-3 bg-white border border-slate-200/80 rounded-2xl flex gap-3 shadow-2xs relative"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-18 bg-slate-900 rounded-lg overflow-hidden shrink-0 shadow-xs border border-slate-200">
                    {cover ? (
                      <img
                        src={cover}
                        alt={product.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-700 to-slate-900 flex items-center justify-center text-white text-[8px] font-black">
                        {product.category.slice(0, 3)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {product.title}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(product.id)}
                          className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block mt-0.5 text-[9.5px] font-black px-1.5 py-0.2 rounded border ${
                          product.id.startsWith('pass-')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : product.type === 'pdf' 
                            ? 'text-blue-700 bg-blue-50 border-blue-100' 
                            : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        }`}>
                          {product.id.startsWith('pass-') 
                            ? '👑 NEET SUCCESS PASS' 
                            : product.type === 'pdf' 
                            ? '⚡ Instant PDF' 
                            : '📖 Physical Book'}
                        </span>
                        {product.id.startsWith('pass-') && (
                          <span className="text-[9px] font-bold text-amber-700">
                            Instant VIP Unlock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-black text-blue-600">
                          ₹{product.price * quantity}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{product.originalPrice * quantity}
                          </span>
                        )}
                      </div>

                      {/* Quantity controls (disabled / fixed to 1 for passes) */}
                      {product.id.startsWith('pass-') ? (
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          1 Subscription
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                          <button
                            onClick={() => onUpdateQuantity(product.id, -1)}
                            className="text-slate-600 hover:text-slate-950 text-xs font-bold p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-slate-900 min-w-4 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(product.id, 1)}
                            className="text-slate-600 hover:text-slate-950 text-xs font-bold p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Summary & Checkout Sticky Footer */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 space-y-3 shadow-lg">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-bold text-slate-900">₹{subtotal}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Total Discount Saved</span>
                  <span>-₹{totalSavings}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700">
                <span>Shipping & Handling</span>
                <span className={`font-bold ${totalShipping === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {totalShipping === 0 ? 'FREE (₹0)' : `₹${totalShipping}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-200 font-['Outfit',sans-serif]">
                <span>Total Payable Amount</span>
                <span className="text-blue-600">₹{totalAmount}</span>
              </div>
            </div>

            <button
              id="cart-proceed-checkout-btn"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition active:scale-98 cursor-pointer"
            >
              <span>Proceed to Checkout (₹{totalAmount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 text-center font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Guaranteed Razorpay Payment Security</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
