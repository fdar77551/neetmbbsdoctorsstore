import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Lock, 
  Unlock, 
  FolderOpen, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Sparkles, 
  Layers, 
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Copy,
  TrendingUp,
  FileText
} from 'lucide-react';
import { NeetFullCourseConfig, Order } from '../types';
import { getFullCourseConfig, saveFullCourseConfig, DEFAULT_FULL_COURSE_CONFIG } from '../lib/fullCourseData';

interface AdminFullCourseManagerProps {
  orders: Order[];
  onOpenInvoiceModal?: (order: Order) => void;
}

export const AdminFullCourseManager: React.FC<AdminFullCourseManagerProps> = ({
  orders,
  onOpenInvoiceModal
}) => {
  const [config, setConfig] = useState<NeetFullCourseConfig>(getFullCourseConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPrivateLink, setShowPrivateLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [serverStats, setServerStats] = useState<{
    totalPurchases: number;
    successfulPurchases: number;
    revenue: number;
  }>({ totalPurchases: 0, successfulPurchases: 0, revenue: 0 });
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Sync config & stats from backend
  const fetchBackendConfigAndStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/course/admin-config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.course) {
          setConfig(prev => ({
            ...prev,
            ...data.course,
            price: Number(data.course.price) > 0 ? Number(data.course.price) : prev.price
          }));
        }
        if (data.stats) {
          setServerStats(data.stats);
        }
      }

      const statsRes = await fetch('/api/course/admin-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          if (statsData.stats) setServerStats(statsData.stats);
          if (statsData.purchases) setRecentPurchases(statsData.purchases);
        }
      }
    } catch (err) {
      console.warn('Backend course stats sync error:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchBackendConfigAndStats();
  }, []);

  // Compute local stats from props orders as fallback
  const localCourseOrders = orders.filter(o => {
    return (o.items || []).some(item => {
      const pId = (item.productId || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      return pId === 'neet-full-course-11-12' || pId.includes('full-course') || title.includes('full course');
    });
  });

  const localTotalPurchases = localCourseOrders.length;
  const localSuccessfulOrders = localCourseOrders.filter(
    o => (o.paymentStatus === 'paid' || o.paymentStatus === 'paid_sandbox' || (o as any).paymentStatus === 'cod') && o.status !== 'cancelled'
  );
  const localSuccessfulPurchases = localSuccessfulOrders.length;
  const localRevenue = localSuccessfulOrders.reduce((sum, o) => {
    const courseItem = (o.items || []).find(i => {
      const pId = (i.productId || '').toLowerCase();
      const title = (i.title || '').toLowerCase();
      return pId === 'neet-full-course-11-12' || pId.includes('full-course') || title.includes('full course');
    });
    return sum + (courseItem?.price || config.price) * (courseItem?.quantity || 1);
  }, 0);

  const displayStats = {
    totalPurchases: Math.max(serverStats.totalPurchases, localTotalPurchases),
    successfulPurchases: Math.max(serverStats.successfulPurchases, localSuccessfulPurchases),
    revenue: Math.max(serverStats.revenue, localRevenue)
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const updated = await saveFullCourseConfig(config);
      setConfig(updated);
      setFeedback({ type: 'success', message: 'Course settings saved successfully!' });
      setTimeout(() => setFeedback(null), 4000);
      fetchBackendConfigAndStats();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save course settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-white">
                NEET (11th & 12th) Full Course Manager
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Configure course pricing, public sample folder, private main course Google Drive link & view real-time student enrollments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchBackendConfigAndStats}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-blue-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Basic Purchase Information & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Purchases */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Purchases</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-['Outfit',sans-serif]">
            {displayStats.totalPurchases}
          </div>
          <span className="text-[10px] text-slate-400">All checkout attempts</span>
        </div>

        {/* Successful Purchases */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Successful Purchases</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-['Outfit',sans-serif]">
            {displayStats.successfulPurchases}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Verified paid students</span>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-950 font-['Outfit',sans-serif]">
            ₹{displayStats.revenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">From Full Course enrollments</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Course Setup & Google Drive Links</span>
          </h3>

          {/* Course Status Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Course Status:</span>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer ${
                config.isActive 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {config.isActive ? 'Active (Published)' : 'Inactive (Draft)'}
            </button>
          </div>
        </div>

        {/* Course Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Course Title
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            placeholder="NEET (11th & 12th) Full Course"
            className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            required
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Course Subtitle / Tagline
          </label>
          <input
            type="text"
            value={config.subtitle}
            onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
            placeholder="Complete study material for your NEET preparation — Class 11 + Class 12."
            className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Full Course Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Describe the study material, syllabus coverage, and benefits..."
            className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
          />
        </div>

        {/* Pricing Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Course Price (₹) <span className="text-rose-500">*Admin Configurable</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={config.price}
                onChange={(e) => setConfig(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 text-xs font-black text-emerald-700 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Admin can change the price anytime without modifying code.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Original / MRP Price (₹) <span className="text-slate-400 font-normal">(For discount display)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={config.originalPrice}
                onChange={(e) => setConfig(prev => ({ ...prev, originalPrice: Number(e.target.value) || 0 }))}
                className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Shown with strikethrough to highlight student discount.
            </p>
          </div>
        </div>

        {/* 1. Sample Google Drive Link */}
        <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-amber-600" />
              <span>Sample Google Drive Link (Publicly Accessible)</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCopy(config.sampleDriveLink, 'sample')}
                className="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 transition cursor-pointer"
              >
                {copiedLink === 'sample' ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={config.sampleDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 transition inline-flex items-center gap-0.5"
              >
                <span>Test Link</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <input
            type="url"
            value={config.sampleDriveLink}
            onChange={(e) => setConfig(prev => ({ ...prev, sampleDriveLink: e.target.value }))}
            placeholder="https://drive.google.com/drive/folders/..."
            className="w-full px-3 py-2 bg-white text-xs text-slate-900 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            required
          />
          <p className="text-[10px] text-amber-800">
            This folder is freely accessible before purchase so students can inspect sample study material.
          </p>
        </div>

        {/* 2. Main Course Google Drive Link (PRIVATE & SECURE) */}
        <div className="space-y-1.5 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Main Course Google Drive Link (Private — Paid Access Only)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPrivateLink(!showPrivateLink)}
                className="text-[10px] text-indigo-700 hover:text-indigo-950 font-bold px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 transition cursor-pointer flex items-center gap-1"
              >
                {showPrivateLink ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPrivateLink ? 'Hide' : 'Show'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(config.mainCourseDriveLink || '', 'main')}
                className="text-[10px] text-indigo-700 hover:text-indigo-950 font-bold px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 transition cursor-pointer"
              >
                {copiedLink === 'main' ? 'Copied!' : 'Copy'}
              </button>
              {config.mainCourseDriveLink && (
                <a
                  href={config.mainCourseDriveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-700 hover:text-indigo-950 font-bold px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 transition inline-flex items-center gap-0.5"
                >
                  <span>Test Folder</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
          <div className="relative">
            <input
              type={showPrivateLink ? 'text' : 'password'}
              value={config.mainCourseDriveLink || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, mainCourseDriveLink: e.target.value }))}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 bg-white text-xs text-slate-900 rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              required
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-800 font-medium">
            <Lock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>
              <strong>CRITICAL SECURITY:</strong> This link is protected by server verification. It is NEVER exposed to public visitors or search engines before verified payment.
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* Enrolled Students / Recent Purchases List */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Enrolled Students & Course Purchases ({localCourseOrders.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-bold">
            Live Database Feed
          </span>
        </div>

        {localCourseOrders.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            No student purchases recorded yet. Once students enroll, their details and payment status will appear here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {localCourseOrders.map((ord, idx) => {
              const isPaid = (ord.paymentStatus === 'paid' || ord.paymentStatus === 'paid_sandbox' || (ord as any).paymentStatus === 'cod') && ord.status !== 'cancelled';
              return (
                <div key={ord.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {ord.userName || ord.shippingAddress?.fullName || 'Doctor Aspirant'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        #{ord.id.replace(/^ORD-/, '')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {ord.userEmail} • {new Date(ord.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="font-black text-slate-900 block">
                        ₹{ord.totalAmount}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPaid ? 'Access Granted' : ord.paymentStatus}
                      </span>
                    </div>

                    {onOpenInvoiceModal && (
                      <button
                        type="button"
                        onClick={() => onOpenInvoiceModal(ord)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="View Order / Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
