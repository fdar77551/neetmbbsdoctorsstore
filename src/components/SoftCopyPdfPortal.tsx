import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Download, 
  Eye, 
  Search, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Zap, 
  Clock, 
  Calendar, 
  Layers, 
  FileText, 
  ShoppingCart, 
  Check, 
  Lock, 
  Unlock, 
  Gift, 
  FolderLock, 
  ExternalLink,
  History,
  RotateCcw,
  Receipt,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { 
  Product, 
  Order, 
  UserProfile, 
  UserNeetPass, 
  NeetPassPlan, 
  NeetPassSubjectKey,
  NeetMaterialType,
  DownloadHistoryItem
} from '../types';
import { 
  NEET_PASS_TIERS, 
  DIGITAL_LIBRARY_SUBJECTS, 
  NEET_MATERIAL_CATEGORIES, 
  createNeetPassProduct,
  calculatePassExpiry,
  isPassActive
} from '../lib/neetPassData';
import { 
  resolveImageUrl, 
  hasUserAccessToPdf, 
  getUserNeetPasses, 
  getDownloadHistory, 
  recordPdfDownload, 
  clearDownloadHistory,
  hasActivePassForSubject
} from '../lib/storage';
import { downloadNotesPdf } from '../lib/pdfDownloader';

interface SoftCopyPdfPortalProps {
  products: Product[];
  orders: Order[];
  userProfile: UserProfile | null;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  onOpenPdfReader: (pdfUrl: string, title: string, isPurchased: boolean) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenInvoice?: (order: Order) => void;
  onBackToHome?: () => void;
  initialTab?: 'pass' | 'library' | 'free' | 'dashboard';
  initialSubject?: 'Biology' | 'Chemistry' | 'Physics';
}

export const SoftCopyPdfPortal: React.FC<SoftCopyPdfPortalProps> = ({
  products,
  orders,
  userProfile,
  onAddToCart,
  onQuickBuy,
  onOpenPdfReader,
  onOpenAuth,
  onOpenInvoice,
  onBackToHome,
  initialTab = 'pass',
  initialSubject = 'Biology'
}) => {
  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'pass' | 'library' | 'free' | 'dashboard'>(initialTab);
  const [selectedSubject, setSelectedSubject] = useState<'Biology' | 'Chemistry' | 'Physics'>(initialSubject);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Billing cycle selector for NEET Success Pass (monthly | yearly | lifetime)
  const [passBillingCycle, setPassBillingCycle] = useState<NeetPassPlan>('yearly');
  
  // Local active states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);
  const [userPasses, setUserPasses] = useState<UserNeetPass[]>(() => getUserNeetPasses(userProfile));
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>(() => getDownloadHistory());

  // Listen to live pass & download updates
  useEffect(() => {
    const handlePassUpdate = () => setUserPasses(getUserNeetPasses(userProfile));
    const handleDownloadUpdate = () => setDownloadHistory(getDownloadHistory());
    
    window.addEventListener('neetmbbs_user_passes_updated', handlePassUpdate);
    window.addEventListener('neetmbbs_current_user_updated', handlePassUpdate);
    window.addEventListener('neetmbbs_download_history_updated', handleDownloadUpdate);
    
    return () => {
      window.removeEventListener('neetmbbs_user_passes_updated', handlePassUpdate);
      window.removeEventListener('neetmbbs_current_user_updated', handlePassUpdate);
      window.removeEventListener('neetmbbs_download_history_updated', handleDownloadUpdate);
    };
  }, [userProfile]);

  // Filter only PDF products
  const pdfProducts = useMemo(() => {
    return products.filter(p => p.type === 'pdf' || (p.category && p.category.toLowerCase().includes('pdf')));
  }, [products]);

  // Digital Library Filtered Products
  const libraryFilteredProducts = useMemo(() => {
    return pdfProducts.filter(product => {
      // Exclude pure pass dummy items from general list
      if (product.id.startsWith('pass-')) return false;

      // Subject Filter
      const targetSubjLower = selectedSubject.toLowerCase();
      const prodPassTier = product.passTier || '';
      const prodSubject = (product.subject || product.category || '').toLowerCase();

      const matchSubject = 
        prodPassTier === targetSubjLower ||
        prodPassTier === 'pcb' ||
        prodPassTier === 'all' ||
        prodSubject.includes(targetSubjLower) || 
        (selectedSubject === 'Biology' && (prodSubject.includes('botany') || prodSubject.includes('zoology'))) ||
        prodSubject.includes('full') || prodSubject.includes('pcb');
      
      if (!matchSubject) return false;

      // Material Type Filter
      if (selectedMaterialType !== 'All') {
        const prodMat = typeof product.materialType === 'object' && product.materialType !== null
          ? ((product.materialType as any).type || (product.materialType as any).label || '').toLowerCase()
          : String(product.materialType || '').toLowerCase();
        const selMat = selectedMaterialType.toLowerCase();
        const matchMat = prodMat.includes(selMat) || (product.tags || []).some(t => t.toLowerCase().includes(selMat));
        if (!matchMat) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = product.title.toLowerCase().includes(q);
        const matchChapter = (product.chapterName || '').toLowerCase().includes(q);
        const matchDesc = (product.description || '').toLowerCase().includes(q);
        const matchAuthor = (product.author || '').toLowerCase().includes(q);
        const matchTag = (product.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchChapter && !matchDesc && !matchAuthor && !matchTag) return false;
      }

      return true;
    });
  }, [pdfProducts, selectedSubject, selectedMaterialType, searchQuery]);

  // Free Resources Filtered
  const freeResources = useMemo(() => {
    return pdfProducts.filter(product => {
      if (product.id.startsWith('pass-')) return false;
      const isFree = product.isFreeResource || product.price === 0 || product.passTier === 'free' || (product.tags || []).includes('free');
      if (!isFree) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return product.title.toLowerCase().includes(q) || (product.subject || '').toLowerCase().includes(q) || (product.chapterName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [pdfProducts, searchQuery]);

  // User Unlocked Library items (for My NEET Dashboard)
  const myUnlockedItems = useMemo(() => {
    return pdfProducts.filter(p => {
      if (p.id.startsWith('pass-')) return false;
      return hasUserAccessToPdf(p, userProfile, orders);
    });
  }, [pdfProducts, userProfile, orders, userPasses]);

  // Handle Pass Direct Purchase / Add to Cart
  const handleGetPass = (subjectKey: NeetPassSubjectKey, plan: NeetPassPlan, buyNow = false) => {
    const passProduct = createNeetPassProduct(subjectKey, plan);
    if (buyNow) {
      onQuickBuy(passProduct);
    } else {
      onAddToCart(passProduct);
      setAddedToastId(passProduct.id);
      setTimeout(() => setAddedToastId(null), 2500);
    }
  };

  // Handle PDF Download
  const handleDownload = async (product: Product) => {
    setDownloadingId(product.id);
    try {
      await downloadNotesPdf({
        id: product.id,
        title: product.title,
        author: product.author,
        category: product.category,
        pdfUrl: product.pdfUrl
      });
      recordPdfDownload(
        product.id,
        product.title,
        product.pdfUrl || '',
        product.subject || product.category,
        product.materialType || 'Notes'
      );
    } catch (err) {
      console.error('Error downloading note PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div id="softcopy-pdf-portal" className="space-y-4 pb-16 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. TOP HERO HEADER & HIGH-YIELD NAV TABS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-blue-900/60 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* Top Pill & Trust Badge */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {onBackToHome && (
                <button
                  type="button"
                  id="portal-back-to-store-btn"
                  onClick={onBackToHome}
                  className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-white/20"
                  title="Back to Store"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Store</span>
                </button>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>NEET UG 2026 Digital Soft Copy Hub</span>
              </div>
            </div>

            {userPasses.some(p => isPassActive(p.expiryDate)) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Active VIP Pass Holder</span>
              </span>
            )}
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight font-['Outfit',sans-serif] flex items-center gap-2">
              <span>NEET MBBS DIGITAL STUDY SUITE</span>
            </h1>
            <p className="text-xs text-blue-200/90 font-medium leading-relaxed max-w-xl mt-0.5">
              Doctor-curated handwritten notes, chapterwise PYQ archives, formula handbooks, and instant downloads.
            </p>
          </div>

          {/* ================= 4 MAIN NAV TABS ================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {/* Tab 1: NEET Success Pass */}
            <button
              type="button"
              id="tab-btn-success-pass"
              onClick={() => setActiveTab('pass')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'pass'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
            >
              <Crown className="w-4 h-4 text-yellow-300" />
              <span>NEET Success Pass</span>
            </button>

            {/* Tab 2: Digital Library */}
            <button
              type="button"
              id="tab-btn-digital-library"
              onClick={() => setActiveTab('library')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-300" />
              <span>Digital Library</span>
            </button>

            {/* Tab 3: Free Resources */}
            <button
              type="button"
              id="tab-btn-free-resources"
              onClick={() => setActiveTab('free')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'free'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
            >
              <Gift className="w-4 h-4 text-emerald-300" />
              <span>Free Resources</span>
            </button>

            {/* Tab 4: My NEET Dashboard */}
            <button
              type="button"
              id="tab-btn-my-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
              }`}
            >
              <UserCheck className="w-4 h-4 text-pink-300" />
              <span>My NEET Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION 1: NEET SUCCESS PASS */}
      {/* ========================================================================= */}
      {activeTab === 'pass' && (
        <div id="neet-success-pass-section" className="space-y-4 animate-in fade-in duration-200">
          
          {/* Billing Cycle Switcher */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 font-['Outfit',sans-serif]">
                  Choose Access Duration
                </h3>
                <p className="text-[10px] text-slate-500">
                  Instant unlock for Notes, PYQs, NCERT & Tests across all devices.
                </p>
              </div>
            </div>

            {/* Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPassBillingCycle('monthly')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  passBillingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPassBillingCycle('yearly')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                  passBillingCycle === 'yearly'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>1 Year</span>
                <span className="ml-1 text-[8px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-black">
                  POPULAR
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPassBillingCycle('lifetime')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                  passBillingCycle === 'lifetime'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Lifetime</span>
                <span className="ml-1 text-[8px] bg-emerald-400 text-emerald-950 px-1 py-0.2 rounded font-black">
                  BEST
                </span>
              </button>
            </div>
          </div>

          {/* Pass Tier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Complete PCB Pass (VIP Card First or Highlighted) */}
            {(['pcb', 'biology', 'chemistry', 'physics'] as NeetPassSubjectKey[]).map((key) => {
              const tier = NEET_PASS_TIERS[key];
              const planData = tier.plans[passBillingCycle];
              const isPcb = key === 'pcb';
              const hasActive = hasActivePassForSubject(key === 'pcb' ? 'pcb' : key, userProfile);

              return (
                <div
                  key={key}
                  id={`pass-card-${key}`}
                  className={`relative rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    isPcb 
                      ? 'bg-gradient-to-br from-[#fffbf0] via-[#fff9e6] to-[#fed7aa]/40 border-amber-300 md:col-span-2' 
                      : `bg-gradient-to-br ${tier.gradient} ${tier.border}`
                  }`}
                >
                  {/* Glowing Accent */}
                  {isPcb && (
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
                  )}

                  <div className="space-y-3 relative z-10">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                          isPcb ? 'bg-amber-500 text-white' : 'bg-white text-slate-900 border border-slate-200'
                        }`}>
                          {tier.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                              {tier.subjectName}
                            </h3>
                            {isPcb && (
                              <span className="bg-amber-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                                🌟 TOPPERS CHOICE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">
                            {tier.badge}
                          </p>
                        </div>
                      </div>

                      {/* Pricing Tag */}
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
                            ₹{planData.price}
                          </span>
                          <span className="text-[11px] text-slate-500 font-bold">
                            {planData.periodText}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-slate-400 line-through">
                            ₹{planData.originalPrice}
                          </span>
                          <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {planData.savings}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      {tier.tagline}
                    </p>

                    {/* Features Checklist */}
                    <div className={`grid ${isPcb ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-1.5 pt-1 text-xs text-slate-700`}>
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPcb ? 'text-amber-600' : 'text-blue-600'}`} />
                          <span className="font-medium text-[11.5px]">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-3 border-t border-slate-200/80 flex items-center justify-between gap-2.5">
                    {hasActive ? (
                      <div className="w-full flex items-center justify-between bg-emerald-100 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span>Pass Active on Your Account</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubject(key === 'pcb' ? 'Biology' : (key.charAt(0).toUpperCase() + key.slice(1)) as any);
                            setActiveTab('library');
                          }}
                          className="text-xs font-black underline hover:text-emerald-950 cursor-pointer"
                        >
                          Open Library →
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGetPass(key, passBillingCycle, false)}
                          className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-300 shadow-2xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{addedToastId === `pass-${key}-${passBillingCycle}` ? 'Added to Cart ✓' : 'Add to Study Cart'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGetPass(key, passBillingCycle, true)}
                          className={`flex-1 py-2.5 px-3 font-black text-xs rounded-xl shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 text-white ${
                            isPcb
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Instant Unlock (₹{planData.price})</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SECTION 2: DIGITAL LIBRARY */}
      {/* ========================================================================= */}
      {activeTab === 'library' && (
        <div id="digital-library-section" className="space-y-3.5 animate-in fade-in duration-200">
          
          {/* Subject Switcher Header */}
          <div className="grid grid-cols-3 gap-2">
            {DIGITAL_LIBRARY_SUBJECTS.map((subj) => {
              const isSelected = selectedSubject === subj.key;
              const hasSubjectPass = hasActivePassForSubject(subj.key, userProfile);

              return (
                <button
                  key={subj.key}
                  type="button"
                  id={`subject-tab-${subj.key}`}
                  onClick={() => setSelectedSubject(subj.key)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                      : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="text-2xl mb-1">{subj.icon}</div>
                  <h4 className={`text-xs font-black font-['Outfit',sans-serif] ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>
                    {subj.label}
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                    {subj.badge}
                  </span>

                  {hasSubjectPass && (
                    <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs" title="Pass Active">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Bar & Material Filter Chips */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${selectedSubject} (e.g. Genetics, Reaction Mechanism, Thermodynamics)...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-700 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* 9 Material Categories Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedMaterialType('All')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedMaterialType === 'All'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Materials
              </button>

              {NEET_MATERIAL_CATEGORIES.map((cat) => {
                const isSelected = selectedMaterialType === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setSelectedMaterialType(cat.type)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-black shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Material Cards List */}
          {libraryFilteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No resources found for "{selectedMaterialType}" in {selectedSubject}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Admin is constantly adding verified handwritten notes and test papers. Try searching for other topics or reset filters.
              </p>
              <button
                type="button"
                onClick={() => { setSelectedMaterialType('All'); setSearchQuery(''); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                View All {selectedSubject} Notes
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {libraryFilteredProducts.map((product, pIdx) => {
                const isUnlocked = hasUserAccessToPdf(product, userProfile, orders);
                const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                const safeMaterialLabel = typeof product.materialType === 'object' && product.materialType !== null
                  ? ((product.materialType as any).label || (product.materialType as any).type || 'Notes')
                  : (product.materialType || 'Notes');

                return (
                  <div
                    key={`${product.id || 'mat'}-${pIdx}`}
                    id={`library-card-${product.id || pIdx}`}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    {/* Left Details */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase">
                          {product.subject || selectedSubject}
                        </span>
                        
                        <span className="bg-slate-100 text-slate-700 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                          {safeMaterialLabel}
                        </span>

                        {product.isFreeResource ? (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                            FREE RESOURCE
                          </span>
                        ) : isUnlocked ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Unlocked & Available</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Included in NEET Pass
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif] leading-snug">
                        {product.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {product.description || 'Verified high-yield NEET chapter summary, NCERT line pointers, and solved MCQs.'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span>By {product.author || 'NEET MBBS Faculty'}</span>
                        {product.pages && <span>• {product.pages} Pages</span>}
                        <span>• 2026 Updated Edition</span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {!isUnlocked && !product.isFreeResource && (
                        <div className="text-left sm:text-right">
                          <span className="text-sm font-black text-slate-900">₹{product.price}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-[10px] text-slate-400 line-through ml-1">₹{product.originalPrice}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {isUnlocked || product.isFreeResource ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenPdfReader(product.pdfUrl || '', product.title, true)}
                              className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Read Online</span>
                            </button>

                            <button
                              type="button"
                              disabled={downloadingId === product.id}
                              onClick={() => handleDownload(product)}
                              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingId === product.id ? 'Downloading...' : 'Download PDF'}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToCart(product);
                                setAddedToastId(product.id);
                                setTimeout(() => setAddedToastId(null), 2500);
                              }}
                              className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{addedToastId === product.id ? 'Added' : 'Cart'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onQuickBuy(product)}
                              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Buy ₹{product.price}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SECTION 3: FREE RESOURCES */}
      {/* ========================================================================= */}
      {activeTab === 'free' && (
        <div id="free-resources-section" className="space-y-3.5 animate-in fade-in duration-200">
          
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                100% Free NEET UG Study Material
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Curated free resources released by MBBS Doctors & NEET Toppers. All aspirants can view and download instantly without subscription.
            </p>
          </div>

          {freeResources.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 shadow-2xs">
              <Gift className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Free Resources Active Right Now</h4>
              <p className="text-xs text-slate-500">
                Check back soon or explore the NEET Success Pass for complete access.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('pass')}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                View NEET Success Pass →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {freeResources.map((resource) => (
                <div
                  key={resource.id}
                  id={`free-card-${resource.id}`}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-emerald-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-500 text-white text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase">
                        Free PDF
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[9.5px] font-bold px-2 py-0.2 rounded-full">
                        {resource.subject || 'All Subjects'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                      {resource.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {resource.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => onOpenPdfReader(resource.pdfUrl || '', resource.title, true)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </button>

                    <button
                      type="button"
                      disabled={downloadingId === resource.id}
                      onClick={() => handleDownload(resource)}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === resource.id ? 'Downloading...' : 'Download Free PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SECTION 4: MY NEET DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div id="my-neet-dashboard-section" className="space-y-4 animate-in fade-in duration-200">
          
          {/* Membership Status Box */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                    Membership Status
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    {userProfile?.email || 'Guest Aspirant'}
                  </p>
                </div>
              </div>

              {!userProfile && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition"
                >
                  Sign In to Sync Pass
                </button>
              )}
            </div>

            {/* Active Passes Display */}
            {userPasses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {userPasses.map((pass) => {
                  const isActive = isPassActive(pass.expiryDate);
                  const isLifetime = pass.expiryDate.toLowerCase() === 'lifetime';
                  const expiryDisplay = isLifetime 
                    ? 'Lifetime Access' 
                    : `Expires on ${new Date(pass.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

                  return (
                    <div
                      key={pass.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        isActive ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-purple-950 font-['Outfit',sans-serif]">
                            {pass.subjectName}
                          </span>
                          <span className="bg-purple-200 text-purple-800 font-bold text-[9px] px-1.5 py-0.2 rounded">
                            {pass.planName}
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-700 font-medium">
                          {isActive ? `✅ Active • ${expiryDisplay}` : '❌ Expired'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('library')}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] rounded-lg shadow-2xs"
                      >
                        Study
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">No Active NEET Success Pass</h4>
                  <p className="text-[11px] text-slate-500">
                    Get full unlimited access to Biology, Chemistry, or Complete PCB for just ₹99/mo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pass')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-xs transition"
                >
                  View Passes →
                </button>
              </div>
            )}

            {/* Access Matrix */}
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Available Content / Access Permissions
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {(['Biology', 'Chemistry', 'Physics'] as const).map((sub) => {
                  const hasPass = hasActivePassForSubject(sub, userProfile);
                  return (
                    <div
                      key={sub}
                      className={`p-2 rounded-xl border ${
                        hasPass ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="block text-[11px] font-black">{sub}</span>
                      <span className="text-[9.5px]">{hasPass ? '✅ Unlocked' : '🔒 Locked'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* My Unlocked Library Items */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                  My Library ({myUnlockedItems.length} Notes Unlocked)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Browse All
              </button>
            </div>

            {myUnlockedItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No materials unlocked yet. Purchase individual notes or activate a NEET Success Pass to unlock instantly.
              </p>
            ) : (
              <div className="space-y-2">
                {myUnlockedItems.slice(0, 8).map((item, itmIdx) => {
                  const safeMatLabel = typeof item.materialType === 'object' && item.materialType !== null
                    ? ((item.materialType as any).label || (item.materialType as any).type || 'Notes')
                    : (item.materialType || 'Notes');

                  return (
                    <div
                      key={`${item.id || 'unlocked'}-${itmIdx}`}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {item.subject || 'NEET Study Material'} • {safeMatLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenPdfReader(item.pdfUrl || '', item.title, true)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-bold transition"
                          title="Read"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={downloadingId === item.id}
                          onClick={() => handleDownload(item)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Download History Log */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-black text-slate-900 font-['Outfit',sans-serif]">
                  Download History ({downloadHistory.length})
                </h3>
              </div>
              {downloadHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearDownloadHistory}
                  className="text-[10px] text-slate-400 hover:text-red-600 transition"
                >
                  Clear History
                </button>
              )}
            </div>

            {downloadHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Your downloaded PDFs will appear here for fast 1-click re-downloading anytime.
              </p>
            ) : (
              <div className="space-y-1.5">
                {downloadHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-[11.5px] truncate">{item.title}</p>
                      <span className="text-[9.5px] text-slate-400">
                        {new Date(item.downloadedAt).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const prod = products.find(p => p.id === item.productId);
                        if (prod) handleDownload(prod);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
