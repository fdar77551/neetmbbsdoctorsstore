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
import { SoftCopyPdfPortal } from './components/SoftCopyPdfPortal';
import { HomeHeroSection } from './components/HomeHeroSection';
import { HomeCategoryCards } from './components/HomeCategoryCards';
import { 
  PopularPhysicalBooksSection, 
  DigitalStudyMaterialSection, 
  FeaturedMockTestsSection, 
  ConnectWithUsSection 
} from './components/HomeImage1Sections';
import { TrustBadges } from './components/TrustBadges';
import { MockTestsListingView } from './components/MockTestsListingView';
import { CbtTestInterface } from './components/CbtTestInterface';
import { MockTestResultView } from './components/MockTestResultView';
import { MockTestLeaderboardModal } from './components/MockTestLeaderboardModal';
import { MockTest, MockTestAttempt, NeetFullCourseConfig } from './types';
import { saveStoredMockPurchase, getStoredMockTests } from './lib/mockTestData';
import { HomeFullCourseCard } from './components/HomeFullCourseCard';
import { FullCourseDetailView } from './components/FullCourseDetailView';
import { 
  getFullCourseConfig, 
  syncFullCourseConfigFromBackend, 
  convertCourseToCartProduct, 
  COURSE_ID 
} from './lib/fullCourseData';
import { CheckCircle2, Package } from 'lucide-react';

export default function App() {
  // Navigation & View States
  const [currentScreen, setCurrentScreen] = useState<ActiveNavScreen>('home');
  const [selectedFormat, setSelectedFormat] = useState<ProductType>('book');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Test System States
  const [activeMockTest, setActiveMockTest] = useState<MockTest | null>(null);
  const [activeMockTestAttempt, setActiveMockTestAttempt] = useState<MockTestAttempt | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardMockTest, setLeaderboardMockTest] = useState<MockTest | null>(null);

  // NEET Full Course State
  const [fullCourseConfig, setFullCourseConfig] = useState<NeetFullCourseConfig>(() => getFullCourseConfig());

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
      if (current && current.email) {
        const currentEmail = current.email.toLowerCase().trim();
        const matched = allUsers.find(u => (u?.email || '').toLowerCase().trim() === currentEmail);
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
    const handleCourseConfigUpdate = (e: any) => {
      if (e?.detail) setFullCourseConfig(e.detail);
      else setFullCourseConfig(getFullCourseConfig());
    };

    window.addEventListener('neetmbbs_products_updated', handleProductsUpdate);
    window.addEventListener('neetmbbs_orders_updated', handleOrdersUpdate);
    window.addEventListener('neetmbbs_users_updated', handleUsersUpdate);
    window.addEventListener('neetmbbs_cart_updated', handleCartUpdate);
    window.addEventListener('neetmbbs_wishlist_updated', handleWishlistUpdate);
    window.addEventListener('neetmbbs_current_user_updated', handleCurrentUserUpdate);
    window.addEventListener('neetmbbs_store_config_updated', handleStoreConfigUpdate);
    window.addEventListener('neetmbbs_course_config_updated', handleCourseConfigUpdate);

    // Initial background sync with backend course endpoint
    syncFullCourseConfigFromBackend(isUserAdmin(userProfile?.email)).then(cfg => {
      if (cfg) setFullCourseConfig(cfg);
    }).catch(() => {});

    // Check deep linking for full course
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('course') === 'neet-full-course' || window.location.hash === '#full-course' || window.location.hash === '#neet-full-course') {
        setCurrentScreen('neet-full-course');
      }
    } catch (e) {}

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanFbEmail = fbUser.email.toLowerCase().trim();
        const registered = getRegisteredUsers().find(
          u => (u?.email || '').toLowerCase().trim() === cleanFbEmail
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
      window.removeEventListener('neetmbbs_course_config_updated', handleCourseConfigUpdate);
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
    let updatedCart: CartItem[];

    if (product.id.startsWith('pass-')) {
      const parts = product.id.split('-');
      const subjectKey = parts[1];
      // Filter out any conflicting plan for the same subject
      const withoutSubjectPass = cart.filter(item => {
        if (!item.product.id.startsWith('pass-')) return true;
        const itemSubject = item.product.id.split('-')[1];
        return itemSubject !== subjectKey;
      });
      updatedCart = [{ product, quantity: 1 }, ...withoutSubjectPass];
    } else {
      const existingIndex = cart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        updatedCart = [...cart];
        updatedCart[existingIndex].quantity += 1;
      } else {
        updatedCart = [...cart, { product, quantity: 1 }];
      }
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

  // NEET (11th & 12th) Full Course Enrollment
  const handleEnrollFullCourse = () => {
    if (!userProfile) {
      setAuthInitialMode('signup');
      setIsAuthOpen(true);
      showToast('Please sign in or create an account to enroll in the Full Course');
      return;
    }
    const courseProduct = convertCourseToCartProduct(fullCourseConfig);
    handleQuickBuy(courseProduct);
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

  // Sync route with browser history & URL paths
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const urlParams = new URLSearchParams(window.location.search);
      const testParam = urlParams.get('testId') || urlParams.get('mockTest');

      if (testParam || path === 'mock-tests' || path === 'mock-test') {
        setCurrentScreen('mock-tests');
      } else if (path === 'neet-full-course' || path === 'course' || path === 'courses' || path.startsWith('course/')) {
        setCurrentScreen('neet-full-course');
      } else if (path === 'neet-pass' || path === 'pass') {
        setSelectedFormat('pdf');
        setCurrentScreen('neet-pass');
      } else if (path === 'orders' || path === 'my-orders') {
        setCurrentScreen('orders');
      } else if (path === 'my-pdfs' || path === 'pdfs') {
        setCurrentScreen('pdfs');
      } else if (path === 'account' || path === 'profile') {
        setCurrentScreen('account');
      } else if (path === 'admin') {
        setCurrentScreen('admin');
      } else if (path === 'books') {
        setSelectedFormat('book');
        setCurrentScreen('format-listing');
      } else if (path === 'softcopy-pdf' || path === 'notes') {
        setSelectedFormat('pdf');
        setCurrentScreen('format-listing');
      } else if (!path) {
        setCurrentScreen('home');
      }
    };

    syncRouteFromLocation();

    const handlePopState = (e: PopStateEvent) => {
      // Close modals if open first
      if (selectedProduct) {
        setSelectedProduct(null);
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        return;
      }
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        return;
      }
      if (isAuthOpen) {
        setIsAuthOpen(false);
        return;
      }
      if (isLeaderboardOpen) {
        setIsLeaderboardOpen(false);
        return;
      }
      if (pdfReaderData) {
        setPdfReaderData(null);
        return;
      }

      if (e.state && e.state.screen) {
        setCurrentScreen(e.state.screen);
      } else {
        syncRouteFromLocation();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProduct, isCartOpen, isCheckoutOpen, isAuthOpen, isLeaderboardOpen, pdfReaderData]);

  const handleNavigateScreen = (screen: ActiveNavScreen) => {
    setCurrentScreen(screen);
    const path = screen === 'home' ? '/' : `/${screen}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ screen }, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock Test System Handlers
  const handleStartMockTest = (test: MockTest) => {
    setActiveMockTest(test);
    setCurrentScreen('mock-test-cbt');
    if (window.location.pathname !== '/mock-tests/cbt') {
      window.history.pushState({ screen: 'mock-test-cbt' }, '', '/mock-tests/cbt');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBuyMockTest = (test: MockTest) => {
    if (!userProfile) {
      setAuthInitialMode('signup');
      setIsAuthOpen(true);
      showToast('Please login or create an account to enroll');
      return;
    }
    const testProduct: Product = {
      id: test.id,
      title: test.title,
      author: 'NEET MBBS Team',
      type: 'pdf',
      category: 'Mock Test' as any,
      price: test.price,
      originalPrice: test.originalPrice || test.price + 200,
      rating: 4.9,
      reviewsCount: 142,
      coverImage: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=800',
      description: test.description,
      features: [
        `${test.totalQuestions} NTA NEET Mock Questions`,
        `${test.durationMinutes} Minutes Real CBT Timer`,
        `All India Rank Leaderboard`,
        `Instant Answer Key & Explanations`
      ],
      tags: ['Mock Test', 'CBT', 'NEET UG', ...test.subjects],
      pages: test.totalQuestions,
      edition: '2025 Edition',
      inStock: true,
      isBestSeller: true,
      createdAt: new Date().toISOString()
    };
    setCart([{ product: testProduct, quantity: 1 }]);
    saveStoredCart([{ product: testProduct, quantity: 1 }]);
    setIsCheckoutOpen(true);
  };

  const handleSubmitMockTest = (attempt: MockTestAttempt) => {
    setActiveMockTestAttempt(attempt);
    setCurrentScreen('mock-test-result');
    if (window.location.pathname !== '/mock-tests/result') {
      window.history.pushState({ screen: 'mock-test-result' }, '', '/mock-tests/result');
    }
    showToast('Mock Test Submitted! Viewing Scorecard 📊');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Send Telegram Admin Alert
    fetch('/api/telegram/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'mock_test_completed',
        title: activeMockTest?.title || 'NEET Mock Test',
        studentName: userProfile?.displayName || userProfile?.name || 'Enrolled Aspirant',
        studentEmail: userProfile?.email || 'N/A',
        details: {
          'Test Number': activeMockTest?.testNumber || 'NEET-MOCK',
          'Score': `${attempt.score} / ${activeMockTest?.maxMarks || 720}`,
          'Accuracy': `${attempt.accuracy || 0}%`,
          'Correct': attempt.correctCount || 0,
          'Incorrect': attempt.incorrectCount || 0,
          'Time Taken': `${Math.floor((attempt.timeSpentSeconds || 0) / 60)} mins`
        }
      })
    }).catch(() => {});
  };

  const handleOpenLeaderboard = (test: MockTest) => {
    setLeaderboardMockTest(test);
    setIsLeaderboardOpen(true);
  };

  // Purchased IDs for current user
  const purchasedProductIds = useMemo(() => {
    if (!userProfile) return [];
    const ids = new Set<string>();
    orders.forEach(o => {
      const uEmail = (userProfile?.email || '').toLowerCase().trim();
      const oEmail = (o.customerEmail || (o as any).userEmail || '').toLowerCase().trim();
      if (
        (o.userId && userProfile?.uid && o.userId === userProfile.uid) ||
        (uEmail && oEmail && oEmail === uEmail)
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

  const isCbtMode = currentScreen === 'mock-test-cbt';

  return (
    <div className="min-h-screen bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex justify-center selection:bg-blue-600 selection:text-white">
      {/* Responsive Mobile / Tablet / Desktop Shell */}
      <div className={`w-full ${isCbtMode ? 'max-w-full' : 'max-w-6xl xl:max-w-7xl'} bg-white min-h-screen flex flex-col relative shadow-sm border-x border-slate-100 transition-all duration-200`}>
        
        {/* App Header (Sticky) - Hidden during full-screen CBT examination */}
        {!isCbtMode && (
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
            currentScreen={currentScreen}
            onNavigate={handleNavigateScreen}
          />
        )}

        {/* Dynamic Main Body */}
        <main className={`flex-1 ${isCbtMode ? 'pb-0' : 'pb-20 sm:pb-28'} bg-slate-50`}>
          {/* ================= 1. REDESIGNED HOME SCREEN ================= */}
          {currentScreen === 'home' && (
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-5 lg:space-y-6 p-2 sm:p-4 lg:p-6 pb-16 sm:pb-20">
              {/* 1. Brand Hero Section: "Prepare Smarter. Practice Better. Achieve Your NEET Goal." (Banners hidden) */}
              <HomeHeroSection
                activeTab={selectedFormat}
                onExploreBooks={(type) => {
                  if (type) handleSelectFormat(type);
                  else handleSelectFormat('book');
                }}
                onExploreMockTests={() => handleNavigateScreen('mock-tests')}
              />

              {/* 2. "Everything You Need for NEET Preparation" line: Physical Books, Digital Study Material, Mock Tests in same horizontal */}
              <HomeCategoryCards
                onSelectFormat={handleSelectFormat}
                onNavigateMockTests={() => handleNavigateScreen('mock-tests')}
                onNavigatePasses={() => {
                  setSelectedFormat('pdf');
                  handleNavigateScreen('neet-pass');
                }}
                onNavigateFreeResources={() => {
                  setSelectedFormat('pdf');
                  handleNavigateScreen('neet-pass');
                }}
                onSelectCategory={handleSelectCategory}
              />

              {/* 2B. NEET (11th & 12th) Full Course Premium Section */}
              <HomeFullCourseCard
                config={fullCourseConfig}
                userProfile={userProfile}
                orders={orders}
                onViewCourse={() => handleNavigateScreen('neet-full-course')}
                onQuickBuy={handleEnrollFullCourse}
                onRequireAuth={() => {
                  setAuthInitialMode('login');
                  setIsAuthOpen(true);
                }}
              />

              {/* 3. Popular Physical Books (Horizontal scroll / desktop grid, chosen by admin) */}
              <PopularPhysicalBooksSection
                products={products}
                popularBookIds={storeConfig.popularBookIds}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={handleAddToCart}
                onViewAll={() => {
                  handleSelectFormat('book');
                  handleNavigateScreen('format-listing');
                }}
              />

              {/* 4. Digital Study Material (Horizontal scroll / desktop grid, chosen by admin) */}
              <DigitalStudyMaterialSection
                products={products}
                featuredPdfIds={storeConfig.featuredPdfIds}
                purchasedProductIds={purchasedProductIds}
                onSelectProduct={(p) => setSelectedProduct(p)}
                onAddToCart={handleAddToCart}
                onQuickBuy={handleQuickBuy}
                onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
                onViewAll={() => {
                  handleSelectFormat('pdf');
                  handleNavigateScreen('format-listing');
                }}
              />

              {/* 5. Featured Mock Tests (Real CBT Mock Tests) */}
              <FeaturedMockTestsSection
                tests={getStoredMockTests()}
                onExploreMockTests={() => handleNavigateScreen('mock-tests')}
                onSelectTest={handleStartMockTest}
                userProfile={userProfile}
              />

              {/* 6. Connect With Us Section */}
              <ConnectWithUsSection
                storeConfig={storeConfig}
                onSupportClick={() => setIsSupportOpen(true)}
              />
            </div>
          )}

          {/* ================= MOCK TESTS SECTION ================= */}
          {currentScreen === 'mock-tests' && (
            <div className="p-3.5 sm:p-6 pb-16">
              <MockTestsListingView
                userProfile={userProfile}
                onStartTest={handleStartMockTest}
                onViewResult={(test, attempt) => {
                  setActiveMockTest(test);
                  setActiveMockTestAttempt(attempt);
                  handleNavigateScreen('mock-test-result');
                }}
                onBuyTest={handleBuyMockTest}
                onOpenAuth={() => {
                  setAuthInitialMode('login');
                  setIsAuthOpen(true);
                }}
                onOpenLeaderboard={handleOpenLeaderboard}
                onBackToHome={() => handleNavigateScreen('home')}
              />
            </div>
          )}

          {/* ================= CBT EXAM INTERFACE ================= */}
          {currentScreen === 'mock-test-cbt' && activeMockTest && (
            <CbtTestInterface
              test={activeMockTest}
              userProfile={userProfile}
              onSubmitTest={handleSubmitMockTest}
              onExitTest={() => handleNavigateScreen('mock-tests')}
            />
          )}

          {/* ================= MOCK TEST RESULTS & SCORECARD ================= */}
          {currentScreen === 'mock-test-result' && activeMockTestAttempt && (
            <div className="p-3.5 sm:p-6 pb-16">
              <MockTestResultView
                attempt={activeMockTestAttempt}
                test={activeMockTest}
                questions={activeMockTest?.questions}
                onRetakeTest={() => {
                  if (activeMockTest) {
                    handleStartMockTest(activeMockTest);
                  } else {
                    handleNavigateScreen('mock-tests');
                  }
                }}
                onOpenLeaderboard={() => {
                  if (activeMockTest) {
                    handleOpenLeaderboard(activeMockTest);
                  }
                }}
                onBackToTests={() => handleNavigateScreen('mock-tests')}
              />
            </div>
          )}

          {/* ================= 2. FORMAT LISTING DEDICATED VIEW / SOFTCOPY PORTAL ================= */}
          {currentScreen === 'format-listing' && (
            <div className="p-3.5 pb-12">
              {selectedFormat === 'pdf' ? (
                <SoftCopyPdfPortal
                  products={products}
                  orders={orders}
                  userProfile={userProfile}
                  onAddToCart={handleAddToCart}
                  onQuickBuy={handleQuickBuy}
                  onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
                  onOpenAuth={(mode) => {
                    setAuthInitialMode(mode || 'login');
                    setIsAuthOpen(true);
                  }}
                  onOpenInvoice={(order) => setActiveInvoiceOrder(order)}
                  onBackToHome={() => setCurrentScreen('home')}
                  initialTab="pass"
                />
              ) : (
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
              )}
            </div>
          )}

          {/* ================= 2B. DIRECT NEET PASS / DIGITAL SUITE SCREEN ================= */}
          {currentScreen === 'neet-pass' && (
            <div className="p-3.5 pb-12">
              <SoftCopyPdfPortal
                products={products}
                orders={orders}
                userProfile={userProfile}
                onAddToCart={handleAddToCart}
                onQuickBuy={handleQuickBuy}
                onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
                onOpenAuth={(mode) => {
                  setAuthInitialMode(mode || 'login');
                  setIsAuthOpen(true);
                }}
                onOpenInvoice={(order) => setActiveInvoiceOrder(order)}
                onBackToHome={() => setCurrentScreen('home')}
                initialTab="pass"
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
              onOpenFullCourse={() => handleNavigateScreen('neet-full-course')}
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
              onOpenDigitalPortal={() => {
                setSelectedFormat('pdf');
                setCurrentScreen('neet-pass');
              }}
            />
          )}

          {/* ================= 4B. NEET (11th & 12th) FULL COURSE DETAILS PAGE ================= */}
          {currentScreen === 'neet-full-course' && (
            <FullCourseDetailView
              config={fullCourseConfig}
              userProfile={userProfile}
              orders={orders}
              onBack={() => handleNavigateScreen('home')}
              onEnrollCourse={handleEnrollFullCourse}
              onOpenAuth={(mode) => {
                setAuthInitialMode(mode || 'login');
                setIsAuthOpen(true);
              }}
              onOpenSupport={() => setIsSupportOpen(true)}
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
              onOpenNeetPass={() => {
                setSelectedFormat('pdf');
                setCurrentScreen('neet-pass');
              }}
              onOpenFullCourse={() => handleNavigateScreen('neet-full-course')}
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
                onOpenPdfReader={(url, title) => setPdfReaderData({ url, title })}
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

        {/* Fixed Bottom Navigation (Hidden during CBT exam) */}
        {!isCbtMode && (
          <BottomNavigation
            currentScreen={currentScreen}
            onNavigate={handleNavigateScreen}
            isAdmin={isAdmin}
            orderBadgeCount={orders.filter(o => o.status === 'new' && (o.items || []).some(it => it.type !== 'pdf')).length}
          />
        )}

        {/* ================= MODALS & DRAWERS ================= */}

        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          currentUser={userProfile}
          userProfile={userProfile}
          onRequireAuth={() => setIsAuthOpen(true)}
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
            // Check if any item is a mock test and unlock it
            (order.items || []).forEach(it => {
              if (it.category === 'Mock Test' || it.type === 'pdf') {
                saveStoredMockPurchase({
                  id: `mp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                  testId: it.productId,
                  orderId: order.id,
                  paymentId: (order as any).paymentId || 'upi_verified',
                  userId: userProfile?.uid || order.userId || 'guest',
                  userEmail: userProfile?.email || order.customerEmail || '',
                  userName: userProfile?.displayName || order.userName || '',
                  amount: Number(it.price) || 0,
                  purchaseDate: new Date().toISOString(),
                  status: 'active'
                });
              }
            });
            setCart([]);
            saveStoredCart([]);
            showToast('Order Placed Successfully! 🎉');
            const hasMock = (order.items || []).some(it => it.category === 'Mock Test');
            if (hasMock) {
              handleNavigateScreen('mock-tests');
            } else {
              handleNavigateScreen('orders');
            }
          }}
          onOpenDigitalLibrary={() => {
            setSelectedFormat('pdf');
            setCurrentScreen('neet-pass');
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

        {/* Mock Test Leaderboard Modal */}
        {isLeaderboardOpen && leaderboardMockTest && (
          <MockTestLeaderboardModal
            test={leaderboardMockTest}
            isOpen={isLeaderboardOpen}
            onClose={() => {
              setIsLeaderboardOpen(false);
              setLeaderboardMockTest(null);
            }}
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
