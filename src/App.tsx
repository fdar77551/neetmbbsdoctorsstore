import React, { useState, useEffect, useMemo } from 'react';
import { 
  Product, 
  ProductType, 
  ProductCategory, 
  Order, 
  UserProfile, 
  CartItem,
  StoreConfig
} from './types';
import { 
  getStoredProducts, 
  getStoredOrders, 
  getRegisteredUsers, 
  getStoredCart, 
  saveStoredCart, 
  getStoredWishlist, 
  saveStoredWishlist,
  getCurrentUser,
  saveCurrentUser,
  sortProductsNewestFirst,
  migrateExistingProductsToR2Cdn,
  hasUserPurchasedProduct,
  getStoredStoreConfig
} from './lib/storage';
import { auth, onAuthStateChanged, isUserAdmin, fbSignOut } from './lib/firebase';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { FormatSelectionSection } from './components/FormatSelectionSection';
import { FormatListingView } from './components/FormatListingView';
import { NewsletterFooter } from './components/NewsletterFooter';
import { BottomNavigation, ActiveNavScreen } from './components/BottomNavigation';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrdersView } from './components/OrdersView';
import { PdfPurchasesView } from './components/PdfPurchasesView';
import { AccountView } from './components/AccountView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { InvoiceModal } from './components/InvoiceModal';
import { PdfReaderModal } from './components/PdfReaderModal';
import { SupportModal } from './components/SupportModal';
import { WishlistModal } from './components/WishlistModal';
import { CheckCircle2, Package } from 'lucide-react';

export default function App() {
  // Navigation & View States
  const [currentScreen, setCurrentScreen] = useState<ActiveNavScreen>('home');
  const [selectedFormat, setSelectedFormat] = useState<ProductType>('book');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getCurrentUser());
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => getStoredStoreConfig());

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [pdfReaderData, setPdfReaderData] = useState<{ url: string; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data, listeners & Deep-Link Product Check
  useEffect(() => {
    try {
      migrateExistingProductsToR2Cdn();
    } catch (e) {}

    const loadedProducts = getStoredProducts();
    setProducts(loadedProducts);
    setOrders(getStoredOrders());
    setUsers(getRegisteredUsers());
    setCart(getStoredCart());
    setWishlist(getStoredWishlist());
    setStoreConfig(getStoredStoreConfig());

    const savedUser = getCurrentUser();
    if (savedUser) {
      setUserProfile(savedUser);
    }

    // Check URL parameters for direct deep-linking
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedProdId = urlParams.get('product') || (window.location.hash.startsWith('#product-') ? window.location.hash.replace('#product-', '') : null);
      if (sharedProdId) {
        const found = loadedProducts.find(p => p.id === sharedProdId);
        if (found) {
          setSelectedProduct(found);
        }
      }

      const invoiceId = urlParams.get('invoice') || urlParams.get('order');
      if (invoiceId) {
        const rawInv = invoiceId.trim().replace(/^#/, '');
        const loadedOrders = getStoredOrders();
        const foundOrder = loadedOrders.find(o => 
          o.id === rawInv || 
          o.id === `ORD-${rawInv}` || 
          o.invoiceNumber === rawInv ||
          o.invoiceNumber === `INV-${rawInv}` ||
          o.id.replace(/^ORD-/, '') === rawInv
        );
        if (foundOrder) {
          setActiveInvoiceOrder(foundOrder);
        }
      }
    } catch (e) {}

    const handleProductsUpdate = () => {
      const prods = getStoredProducts();
      setProducts(prods);
    };
    const handleOrdersUpdate = () => setOrders(getStoredOrders());
    const handleUsersUpdate = () => {
      const allUsers = getRegisteredUsers();
      setUsers(allUsers);
      const current = getCurrentUser();
      if (current) {
        const matched = allUsers.find(u => u.email.toLowerCase() === current.email.toLowerCase());
        if (matched) {
          setUserProfile(matched);
          saveCurrentUser(matched);
        }
      }
    };
    const handleCartUpdate = () => setCart(getStoredCart());
    const handleWishlistUpdate = () => setWishlist(getStoredWishlist());
    const handleCurrentUserUpdate = () => {
      setUserProfile(getCurrentUser());
    };
    const handleStoreConfigUpdate = () => {
      setStoreConfig(getStoredStoreConfig());
    };

    window.addEventListener('neetmbbs_products_updated', handleProductsUpdate);
    window.addEventListener('neetmbbs_orders_updated', handleOrdersUpdate);
    window.addEventListener('neetmbbs_users_updated', handleUsersUpdate);
    window.addEventListener('neetmbbs_cart_updated', handleCartUpdate);
    window.addEventListener('neetmbbs_wishlist_updated', handleWishlistUpdate);
    window.addEventListener('neetmbbs_current_user_updated', handleCurrentUserUpdate);
    window.addEventListener('neetmbbs_store_config_updated', handleStoreConfigUpdate);

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const registered = getRegisteredUsers().find(
          u => u.email.toLowerCase() === fbUser.email!.toLowerCase()
        );
        const isAdmin = isUserAdmin(fbUser.email);
        const resolvedProfile: UserProfile = registered || {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          role: isAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        };
        setUserProfile(resolvedProfile);
        saveCurrentUser(resolvedProfile);
      }
    });

    return () => {
      window.removeEventListener('neetmbbs_products_updated', handleProductsUpdate);
      window.removeEventListener('neetmbbs_orders_updated', handleOrdersUpdate);
      window.removeEventListener('neetmbbs_users_updated', handleUsersUpdate);
      window.removeEventListener('neetmbbs_cart_updated', handleCartUpdate);
      window.removeEventListener('neetmbbs_wishlist_updated', handleWishlistUpdate);
      window.removeEventListener('neetmbbs_current_user_updated', handleCurrentUserUpdate);
      window.removeEventListener('neetmbbs_store_config_updated', handleStoreConfigUpdate);
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isAdmin = isUserAdmin(userProfile?.email);

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    let updatedCart: CartItem[];

    if (existingIndex > -1) {
      updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
    } else {
      updatedCart = [...cart, { product, quantity: 1 }];
    }

    setCart(updatedCart);
    saveStoredCart(updatedCart);
    showToast(`Added to cart!`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];

    setCart(updated);
    saveStoredCart(updated);
  };

  const handleRemoveFromCart = (productId: string) => {
    const updated = cart.filter(item => item.product.id !== productId);
    setCart(updated);
    saveStoredCart(updated);
  };

  // Wishlist Handlers
  const handleToggleWishlist = (productId: string) => {
    let updated: string[];
    if (wishlist.includes(productId)) {
      updated = wishlist.filter(id => id !== productId);
      showToast('Removed from wishlist');
    } else {
      updated = [...wishlist, productId];
      showToast('Saved to wishlist ❤️');
    }
    setWishlist(updated);
    saveStoredWishlist(updated);
  };

  // Quick Buy
  const handleQuickBuy = (product: Product) => {
    if (!userProfile) {
      setAuthInitialMode('signup');
      setIsAuthOpen(true);
      showToast('Please login or create an account to proceed with purchase');
      return;
    }
    setCart([{ product, quantity: 1 }]);
    saveStoredCart([{ product, quantity: 1 }]);
    setIsCheckoutOpen(true);
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {}
    saveCurrentUser(null);
    setUserProfile(null);
    if (currentScreen === 'admin') {
      setCurrentScreen('home');
    }
    showToast('Logged out successfully');
  };

  // Format Selection Handlers
  const handleSelectFormat = (format: ProductType) => {
    setSelectedFormat(format);
    setSelectedCategoryFilter('all');
    setCurrentScreen('format-listing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: string) => {
    if (cat === 'Books') {
      setSelectedFormat('book');
      setSelectedCategoryFilter('all');
    } else {
      setSelectedCategoryFilter(cat);
    }
    setCurrentScreen('format-listing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavigateScreen = (screen: ActiveNavScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Purchased IDs for current user
  const purchasedProductIds = useMemo(() => {
    if (!userProfile) return [];
    const ids = new Set<string>();
    orders.forEach(o => {
      if (
        (o.userId && o.userId === userProfile.uid) ||
        (o.customerEmail && o.customerEmail.toLowerCase() === userProfile.email.toLowerCase())
      ) {
        if (o.status !== 'cancelled') {
          (o.items || []).forEach(it => {
            if (it.productId) ids.add(it.productId);
          });
        }
      }
    });
    return Array.from(ids);
  }, [userProfile, orders]);

  return (
    <div className="min-h-screen bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex justify-center selection:bg-blue-600 selection:text-white">
      {/* Responsive Mobile Shell */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative shadow-sm border-x border-slate-100">
        
        {/* App Header (Sticky) */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cartCount={cartTotalItems}
          wishlistCount={wishlist.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenWishlist={() => setIsWishlistOpen(true)}
          onOpenAuth={() => {
            setAuthInitialMode('login');
            setIsAuthOpen(true);
          }}
          userEmail={userProfile?.email}
          isAdmin={isAdmin}
          onSelectCategory={handleSelectCategory}
          onSelectFormat={handleSelectFormat}
          isHomeView={currentScreen === 'home'}
        />

        {/* Dynamic Main Body */}
        <main className="flex-1 pb-28 bg-slate-50">
          {/* ================= 1. HOME SCREEN ================= */}
          {currentScreen === 'home' && (
            <div className="space-y-3 p-3 sm:p-4 pb-16">
              {/* Dynamic Banner Carousel */}
              <HeroBanner
                activeTab={selectedFormat}
                onExplore={(type) => {
                  if (type) handleSelectFormat(type);
                  else handleSelectFormat('book');
                }}
              />

              {/* Choose Your Format Section (Hardcopy Physical Books vs Softcopy PDF Books) */}
              <FormatSelectionSection
                onSelectFormat={handleSelectFormat}
                storeConfig={storeConfig}
              />

              {/* Stay Updated & Social Media Follow Us Banner */}
              <NewsletterFooter
                storeConfig={storeConfig}
              />
            </div>
          )}

          {/* ================= 2. FORMAT LISTING DEDICATED VIEW ================= */}
          {currentScreen === 'format-listing' && (
            <div className="p-3.5 pb-12">
              <FormatListingView
                initialFormat={selectedFormat}
                products={products}
                wishlist={wishlist}
                purchasedPdfs={purchasedProductIds}
                onBackToHome={() => setCurrentScreen('home')}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={handleAddToCart}
                onQuickBuy={handleQuickBuy}
                onToggleWishlist={handleToggleWishlist}
                onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
                initialCategory={selectedCategoryFilter}
              />
            </div>
          )}

          {/* ================= 3. ORDERS SCREEN ================= */}
          {currentScreen === 'orders' && (
            <OrdersView
              orders={orders}
              userEmail={userProfile?.email}
              isAdmin={isAdmin}
              onOpenInvoiceModal={(order) => setActiveInvoiceOrder(order)}
              onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
              onExplore={() => setCurrentScreen('home')}
            />
          )}

          {/* ================= 4. MY PDFS DIGITAL LIBRARY SCREEN ================= */}
          {currentScreen === 'pdfs' && (
            <PdfPurchasesView
              orders={orders}
              products={products}
              userProfile={userProfile}
              onOpenAuth={(mode) => {
                setAuthInitialMode(mode || 'login');
                setIsAuthOpen(true);
              }}
              onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
              onOpenInvoice={(order) => setActiveInvoiceOrder(order)}
              onExploreStore={() => setCurrentScreen('home')}
            />
          )}

          {/* ================= 5. ACCOUNT PROFILE SCREEN ================= */}
          {currentScreen === 'account' && (
            <AccountView
              userProfile={userProfile}
              orders={orders}
              onOpenAuth={(mode) => {
                setAuthInitialMode(mode || 'login');
                setIsAuthOpen(true);
              }}
              onSignOut={handleSignOut}
              onNavigateToOrders={() => setCurrentScreen('orders')}
              onOpenWishlist={() => setIsWishlistOpen(true)}
              onOpenSupport={() => setIsSupportOpen(true)}
              onNavigateToAdmin={() => setCurrentScreen('admin')}
              onOpenPdfLibrary={() => setCurrentScreen('pdfs')}
              isAdmin={isAdmin}
            />
          )}

          {/* ================= 6. ADMIN CONTROL CENTER ================= */}
          {currentScreen === 'admin' && (
            isAdmin ? (
              <AdminPanel
                products={products}
                orders={orders}
                users={users}
                onOpenInvoiceModal={(order) => setActiveInvoiceOrder(order)}
                adminEmail={userProfile?.email || 'admin@neetmbbs.in'}
              />
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Admin Authorization Required</h3>
                <p className="text-xs text-slate-500">
                  Please sign in using an authorized administrator account to access store controls.
                </p>
                <button
                  onClick={() => {
                    setAuthInitialMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Admin Sign In
                </button>
              </div>
            )
          )}
        </main>

        {/* Fixed Bottom Navigation */}
        <BottomNavigation
          currentScreen={currentScreen}
          onNavigate={handleNavigateScreen}
          isAdmin={isAdmin}
          orderBadgeCount={orders.filter(o => o.status === 'new' && (o.items || []).some(it => it.type !== 'pdf')).length}
        />

        {/* ================= MODALS & DRAWERS ================= */}

        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            if (window.history.replaceState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('product');
              window.history.replaceState({}, '', url.pathname);
            }
          }}
          onAddToCart={handleAddToCart}
          onQuickBuy={handleQuickBuy}
          isPurchased={selectedProduct ? hasUserPurchasedProduct(selectedProduct.id, userProfile, orders) : false}
          onOpenPdfReader={(url, title) => {
            setSelectedProduct(null);
            setPdfReaderData({ url, title });
          }}
        />

        {/* Cart Drawer */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onProceedToCheckout={() => {
            setIsCartOpen(false);
            if (!userProfile) {
              setAuthInitialMode('signup');
              setIsAuthOpen(true);
              showToast('Please sign in or create an account to checkout');
              return;
            }
            setIsCheckoutOpen(true);
          }}
        />

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cart}
          userEmail={userProfile?.email}
          userName={userProfile?.displayName}
          onRequireAuth={() => {
            setIsCheckoutOpen(false);
            setAuthInitialMode('signup');
            setIsAuthOpen(true);
            showToast('Please sign in or sign up to complete your purchase');
          }}
          onOrderSuccess={(order) => {
            setCart([]);
            saveStoredCart([]);
            showToast('Order Placed Successfully! 🎉');
            setCurrentScreen('orders');
          }}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(profile) => {
            saveCurrentUser(profile);
            setUserProfile(profile);
            showToast(`Welcome, ${profile.displayName}!`);
            if (profile.role === 'admin') {
              setCurrentScreen('admin');
            }
          }}
          initialMode={authInitialMode}
        />

        {/* Invoice Modal */}
        <InvoiceModal
          order={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
        />

        {/* PDF Reader Modal */}
        {pdfReaderData && (
          <PdfReaderModal
            pdfUrl={pdfReaderData.url}
            title={pdfReaderData.title}
            onClose={() => setPdfReaderData(null)}
          />
        )}

        {/* Support Modal */}
        <SupportModal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />

        {/* Wishlist Modal */}
        <WishlistModal
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          wishlistIds={wishlist}
          products={products}
          onRemoveWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
