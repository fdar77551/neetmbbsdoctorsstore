import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Percent, 
  DollarSign, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Search,
  BookOpen,
  FileText,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { Coupon, CouponUsageRecord, Product } from '../types';
import { 
  getStoredCoupons, 
  saveStoredCoupons, 
  getStoredCouponUsage, 
  syncCouponsFromRemote 
} from '../lib/couponData';
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal';

interface AdminCouponManagerProps {
  products?: Product[];
}

export const AdminCouponManager: React.FC<AdminCouponManagerProps> = ({ products = [] }) => {
  const [coupons, setCoupons] = useState<Coupon[]>(() => getStoredCoupons());
  const [usages, setUsages] = useState<CouponUsageRecord[]>(() => getStoredCouponUsage());
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'coupons' | 'usage_stats'>('coupons');

  // Delete modal state (Requirement 18: type "delete" to confirm)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  // New Coupon Form State
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(50);
  const [formMinAmount, setFormMinAmount] = useState<number>(199);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number | undefined>(undefined);
  const [formStartDate, setFormStartDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formTotalLimit, setFormTotalLimit] = useState<number | undefined>(500);
  const [formPerUserLimit, setFormPerUserLimit] = useState<number>(2);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formProductTypes, setFormProductTypes] = useState<('book' | 'pdf' | 'mock_test' | 'course' | 'all')[]>(['all']);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshData = () => {
    setCoupons(getStoredCoupons());
    setUsages(getStoredCouponUsage());
  };

  useEffect(() => {
    refreshData();
    syncCouponsFromRemote().then(() => refreshData()).catch(() => {});
    const handleUpdate = () => refreshData();
    window.addEventListener('neetmbbs_coupons_updated', handleUpdate);
    window.addEventListener('neetmbbs_coupon_usage_updated', handleUpdate);
    return () => {
      window.removeEventListener('neetmbbs_coupons_updated', handleUpdate);
      window.removeEventListener('neetmbbs_coupon_usage_updated', handleUpdate);
    };
  }, []);

  const handleProductTypeToggle = (type: 'book' | 'pdf' | 'mock_test' | 'course' | 'all') => {
    if (type === 'all') {
      setFormProductTypes(['all']);
      return;
    }

    setFormProductTypes(prev => {
      const withoutAll = prev.filter(t => t !== 'all');
      if (withoutAll.includes(type)) {
        const next = withoutAll.filter(t => t !== type);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, type];
      }
    });
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setFormFeedback({ type: 'error', message: 'Please enter a valid coupon code (e.g. NEET50)' });
      return;
    }

    if (formDiscountValue <= 0) {
      setFormFeedback({ type: 'error', message: 'Discount value must be greater than 0' });
      return;
    }

    const newCoupon: Coupon = {
      id: `coupon-${cleanCode.toLowerCase()}-${Date.now()}`,
      code: cleanCode,
      discountType: formDiscountType,
      discountValue: Number(formDiscountValue),
      minAmount: Number(formMinAmount) || 0,
      maxDiscount: formDiscountType === 'percentage' && formMaxDiscount ? Number(formMaxDiscount) : undefined,
      startDate: formStartDate || undefined,
      expiryDate: formExpiryDate || undefined,
      totalUsageLimit: formTotalLimit ? Number(formTotalLimit) : undefined,
      perUserUsageLimit: Number(formPerUserLimit) || 1,
      currentUsageCount: 0,
      active: formActive,
      applicableProductTypes: formProductTypes,
      createdAt: new Date().toISOString()
    };

    const current = getStoredCoupons();
    // Replace if exists, or prepend
    const existingIdx = current.findIndex(c => c.code.toUpperCase() === cleanCode);
    let updated: Coupon[];
    if (existingIdx !== -1) {
      updated = [...current];
      updated[existingIdx] = newCoupon;
    } else {
      updated = [newCoupon, ...current];
    }

    saveStoredCoupons(updated);
    setCoupons(updated);

    // Call backend API
    fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCoupon)
    }).catch(() => {});

    setFormFeedback({ type: 'success', message: `Coupon "${cleanCode}" saved successfully!` });
    setFormCode('');
    setIsCreating(false);
  };

  const handleToggleActive = (coupon: Coupon) => {
    const updated = coupons.map(c => {
      if (c.id === coupon.id) {
        const next = { ...c, active: !c.active };
        fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(() => {});
        return next;
      }
      return c;
    });
    saveStoredCoupons(updated);
    setCoupons(updated);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const updated = coupons.filter(c => c.id !== deleteTarget.id);
    saveStoredCoupons(updated);
    setCoupons(updated);

    fetch(`/api/coupons/${deleteTarget.id}`, { method: 'DELETE' }).catch(() => {});
    setDeleteTarget(null);
  };

  // Stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.active).length;
  const totalTimesUsed = usages.length + coupons.reduce((sum, c) => sum + (c.currentUsageCount || 0), 0);
  const totalDiscountGiven = usages.reduce((sum, u) => sum + (u.discountAmount || 0), 0);

  const filteredCoupons = coupons.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.discountType.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-amber-100 text-[10px] font-black uppercase tracking-wider mb-2 border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Discount &amp; Promotion Center</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif]">
              Coupon &amp; Discount Management
            </h2>
            <p className="text-xs text-amber-100 font-medium mt-1">
              Create, configure, and monitor discount codes for books, PDFs, mock tests, and full courses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(prev => !prev)}
              className="px-4 py-2.5 bg-white hover:bg-amber-50 text-slate-900 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 font-['Outfit',sans-serif]"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>{isCreating ? 'Close Form' : 'Create New Coupon'}</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/20 relative z-10">
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-200 uppercase block">Total Coupons</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{totalCoupons}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-200 uppercase block">Active Codes</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{activeCoupons}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-200 uppercase block">Total Applications</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">{totalTimesUsed}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-amber-200 uppercase block">Discount Given</span>
            <span className="text-lg font-black text-white font-['Outfit',sans-serif]">₹{totalDiscountGiven}</span>
          </div>
        </div>
      </div>

      {/* Form Feedback */}
      {formFeedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          formFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {formFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{formFeedback.message}</span>
        </div>
      )}

      {/* Create New Coupon Form Collapsible */}
      {isCreating && (
        <form onSubmit={handleCreateCoupon} className="bg-white rounded-3xl p-5 sm:p-7 border border-amber-300 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>Create or Update Coupon</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">Server Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Coupon Code</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. NEET50, DOCTOR10"
                className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Discount Type</label>
              <select
                value={formDiscountType}
                onChange={(e) => setFormDiscountType(e.target.value as 'flat' | 'percentage')}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer"
              >
                <option value="flat">Fixed Amount ₹ (Flat)</option>
                <option value="percentage">Percentage % (Percent)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Discount Value {formDiscountType === 'flat' ? '(₹)' : '(%)'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={formDiscountValue}
                onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                placeholder={formDiscountType === 'flat' ? '50' : '10'}
                className="w-full px-3.5 py-2 text-xs font-black rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Min Amount */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Minimum Order Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={formMinAmount}
                onChange={(e) => setFormMinAmount(Number(e.target.value))}
                placeholder="e.g. 199"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Max Discount if % */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Max Discount Cap (₹) {formDiscountType === 'flat' && '(N/A for flat)'}
              </label>
              <input
                type="number"
                min="1"
                disabled={formDiscountType === 'flat'}
                value={formMaxDiscount || ''}
                onChange={(e) => setFormMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 150 (Optional)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Per User Limit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Per-User Usage Limit</label>
              <input
                type="number"
                min="1"
                value={formPerUserLimit}
                onChange={(e) => setFormPerUserLimit(Number(e.target.value))}
                placeholder="e.g. 1 or 2"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Start Date (Optional)</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer"
              />
            </div>

            {/* Total Limit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Total Overall Usage Limit</label>
              <input
                type="number"
                min="1"
                value={formTotalLimit || ''}
                onChange={(e) => setFormTotalLimit(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 500"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Applicable Product Types (Checkboxes requested by user) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 block">
              Applicable Product Types:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: '☑ All Products' },
                { id: 'book', label: '📚 Physical Books' },
                { id: 'pdf', label: '📄 PDFs / Digital' },
                { id: 'mock_test', label: '📝 Mock Tests' },
                { id: 'course', label: '🎓 Full Course' }
              ].map((item) => {
                const isSelected = formProductTypes.includes(item.id as any);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProductTypeToggle(item.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active status toggle */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <span>Activate this coupon immediately</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer font-['Outfit',sans-serif]"
            >
              Save Coupon
            </button>
          </div>
        </form>
      )}

      {/* Tabs: Coupons List vs Usage Stats */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('coupons')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'coupons' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coupons List ({coupons.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('usage_stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'usage_stats' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Usage History &amp; Logs ({usages.length})
            </button>
          </div>

          {activeTab === 'coupons' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coupon code..."
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {activeTab === 'coupons' ? (
          <div className="space-y-3">
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No coupons found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCoupons.map((c) => (
                  <div
                    key={c.id || c.code}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-mono font-black text-xs border border-amber-200 tracking-wider">
                            {c.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.active 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {c.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle Active button */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title={c.active ? 'Deactivate' : 'Activate'}
                          >
                            {c.active ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          {/* Delete Coupon with typed confirmation */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Discount specs */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900 font-['Outfit',sans-serif]">
                          {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                        </span>
                        {c.minAmount && c.minAmount > 0 ? (
                          <span className="text-xs text-slate-500 font-medium">
                            (Min: ₹{c.minAmount})
                          </span>
                        ) : null}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Applies To:</span>
                          <span className="font-semibold">{c.applicableProductTypes?.join(', ') || 'all'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Usage Count:</span>
                          <span className="font-semibold">{c.currentUsageCount || 0} / {c.totalUsageLimit || '∞'}</span>
                        </div>
                      </div>

                      {(c.startDate || c.expiryDate) && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Valid: {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'Now'} → {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Forever'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Usage Statistics & Logs Tab */
          <div className="space-y-3">
            {usages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No coupons have been used in checkouts yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Coupon</th>
                      <th className="py-2.5 px-3">Student / Email</th>
                      <th className="py-2.5 px-3">Original</th>
                      <th className="py-2.5 px-3">Discount</th>
                      <th className="py-2.5 px-3">Final Paid</th>
                      <th className="py-2.5 px-3">Order ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usages.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(u.usedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-bold rounded">
                            {u.couponCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {u.userEmail || u.userId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">₹{u.originalAmount}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">-₹{u.discountAmount}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">₹{u.finalAmount}</td>
                        <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-400">
                          {u.orderId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Delete Confirmation Modal (Requirement 18: type "delete" to confirm) */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete this coupon code?"
        itemName={deleteTarget ? `${deleteTarget.code} (${deleteTarget.discountType === 'percentage' ? deleteTarget.discountValue + '%' : '₹' + deleteTarget.discountValue} OFF)` : ''}
        itemType="coupon"
        warningText="Deleting this coupon will invalidate it for all current student checkouts immediately."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
