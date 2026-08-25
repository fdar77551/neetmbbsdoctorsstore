import React from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Product } from '../types';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  products: Product[];
  onRemoveWishlist: (id: string) => void;
  onAddToCart: (product: Product) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  products,
  onRemoveWishlist,
  onAddToCart
}) => {
  if (!isOpen) return null;

  const wishlistedProducts = products.filter(p => wishlistIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        id="wishlist-modal"
        className="bg-white text-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        <div className="p-4 bg-[#070e1e] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h3 className="font-extrabold text-sm">Saved Wishlist ({wishlistedProducts.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {wishlistedProducts.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Heart className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Your wishlist is empty</p>
              <p className="text-[10px] text-slate-400">Click the heart icon on any book to save for later.</p>
            </div>
          ) : (
            wishlistedProducts.map(product => (
              <div
                key={product.id}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3"
              >
                <img
                  src={product.coverImage}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-14 object-cover rounded bg-slate-900 shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{product.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">₹{product.price} • {product.type === 'pdf' ? '⚡ PDF' : '📖 Book'}</p>
                  
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => {
                        onAddToCart(product);
                        onRemoveWishlist(product.id);
                      }}
                      className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black rounded flex items-center gap-1 transition"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Move to Cart</span>
                    </button>
                    <button
                      onClick={() => onRemoveWishlist(product.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
