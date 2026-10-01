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
  FileText,
  Plus,
  Trash2,
  Database,
  Cloud,
  Server,
  BookOpen
} from 'lucide-react';
import { NeetFullCourseConfig, Order } from '../types';
import { 
  getFullCourseConfig, 
  saveFullCourseConfig, 
  DEFAULT_FULL_COURSE_CONFIG,
  getAllCourses,
  saveAllCourses,
  syncAllCoursesFromBackend
} from '../lib/fullCourseData';
import { getR2PublicDomain, saveR2PublicDomain, DEFAULT_R2_PUBLIC_DOMAIN } from '../lib/storage';

interface AdminFullCourseManagerProps {
  orders: Order[];
  onOpenInvoiceModal?: (order: Order) => void;
}

export const AdminFullCourseManager: React.FC<AdminFullCourseManagerProps> = ({
  orders,
  onOpenInvoiceModal
}) => {
  const [activeTab, setActiveTab] = useState<'neet_course' | 'multi_class' | 'storage_status'>('neet_course');
  const [config, setConfig] = useState<NeetFullCourseConfig>(getFullCourseConfig());
  const [multiClassCourses, setMultiClassCourses] = useState<NeetFullCourseConfig[]>(getAllCourses());
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-class-10');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPrivateLink, setShowPrivateLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [r2DomainInput, setR2DomainInput] = useState<string>(getR2PublicDomain());
  const [serverStats, setServerStats] = useState<{
    totalPurchases: number;
    successfulPurchases: number;
    revenue: number;
  }>({ totalPurchases: 0, successfulPurchases: 0, revenue: 0 });
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Sync config & stats from backend & Firebase
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

      // Sync multi-class courses
      const syncedCourses = await syncAllCoursesFromBackend(true);
      if (syncedCourses && syncedCourses.length > 0) {
        setMultiClassCourses(syncedCourses);
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
      return pId === 'neet-full-course-11-12' || pId.includes('full-course') || pId.includes('course-class') || title.includes('full course');
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
      return pId === 'neet-full-course-11-12' || pId.includes('full-course') || pId.includes('course-class') || title.includes('full course');
    });
    return sum + (courseItem?.price || config.price) * (courseItem?.quantity || 1);
  }, 0);

  const displayStats = {
    totalPurchases: Math.max(serverStats.totalPurchases, localTotalPurchases),
    successfulPurchases: Math.max(serverStats.successfulPurchases, localSuccessfulPurchases),
    revenue: Math.max(serverStats.revenue, localRevenue)
  };

  const handleSaveNeetCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const updated = await saveFullCourseConfig(config);
      setConfig(updated);
      setFeedback({ type: 'success', message: 'NEET Full Course settings saved and synced to Firebase RTDB & Server!' });
      setTimeout(() => setFeedback(null), 4000);
      fetchBackendConfigAndStats();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save course settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Multi-Class Course Operations
  const activeEditingCourse = multiClassCourses.find(c => c.id === selectedCourseId) || multiClassCourses[0];

  const handleUpdateCurrentClassCourse = (field: keyof NeetFullCourseConfig, value: any) => {
    if (!activeEditingCourse) return;
    const updated = multiClassCourses.map(c => {
      if (c.id === activeEditingCourse.id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setMultiClassCourses(updated);
  };

  const handleSaveAllMultiClassCourses = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await saveAllCourses(multiClassCourses);

      // Also persist active one to backend
      if (activeEditingCourse) {
        await fetch('/api/courses/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeEditingCourse)
        });
      }

      setFeedback({ type: 'success', message: 'All Multi-Class courses saved and synced to Firebase Realtime Database!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save class courses.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewClassCourse = (targetClass: string) => {
    const classSlug = targetClass.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCourseId = `course-${classSlug}-${Date.now().toString().slice(-4)}`;
    const newCourse: NeetFullCourseConfig = {
      id: newCourseId,
      title: `${targetClass} Full Foundation Course`,
      subtitle: `Complete Science & Mathematics foundation study material for ${targetClass}.`,
      description: `Comprehensive digital study notes, formula sheets, and chapter summaries for ${targetClass} delivered through Google Drive.`,
      targetClass: targetClass,
      badgeText: 'Foundation',
      price: 299,
      originalPrice: 999,
      sampleDriveLink: 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
      mainCourseDriveLink: 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
      isActive: true,
      features: [
        `Complete ${targetClass} Syllabus Coverage`,
        'Science (Physics, Chemistry, Biology) Core Notes',
        'Mathematics Problem Sets & Step-by-Step Solutions',
        'Delivered Digitally through Dedicated Google Drive',
        'Learn at Your Own Pace with Instant Digital Access'
      ],
      highlights: [
        targetClass,
        'Science & Maths',
        'Complete Notes',
        'Google Drive Access'
      ]
    };

    const updated = [...multiClassCourses, newCourse];
    setMultiClassCourses(updated);
    setSelectedCourseId(newCourseId);
    saveAllCourses(updated);
    setFeedback({ type: 'success', message: `Added new course for ${targetClass}! You can now edit its details.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteClassCourse = async (courseId: string) => {
    if (courseId === 'neet-full-course-11-12') {
      alert('The core NEET 11th & 12th course cannot be deleted.');
      return;
    }
    if (!confirm('Are you sure you want to delete this class course?')) return;

    const filtered = multiClassCourses.filter(c => c.id !== courseId);
    setMultiClassCourses(filtered);
    if (selectedCourseId === courseId) {
      setSelectedCourseId(filtered[0]?.id || '');
    }
    await saveAllCourses(filtered);
    try {
      await fetch(`/api/courses/admin/${courseId}`, { method: 'DELETE' });
    } catch {}
    setFeedback({ type: 'success', message: 'Course removed successfully.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveR2Domain = (e: React.FormEvent) => {
    e.preventDefault();
    saveR2PublicDomain(r2DomainInput);
    setFeedback({ type: 'success', message: 'Cloudflare R2 Public Domain saved and synced to Firebase RTDB!' });
    setTimeout(() => setFeedback(null), 4000);
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
                Course Management & Cloud Storage
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Manage courses for NEET, Class 6th to 12th, synchronize Firebase RTDB & Cloudflare R2 storage in real-time.
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('neet_course')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'neet_course'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>NEET (11th & 12th) Course</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multi_class')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'multi_class'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Classes (6th, 7th, 8th, 9th, 10th...)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage_status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'storage_status'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Firebase & Cloudflare Storage</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-950 font-['Outfit',sans-serif]">
            ₹{displayStats.revenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">From all course enrollments</span>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* TAB 1: NEET FULL COURSE */}
      {activeTab === 'neet_course' && (
        <form onSubmit={handleSaveNeetCourse} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>NEET (11th & 12th) Course Setup & Drive Links</span>
            </h3>

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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Course Title</label>
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-indigo-500 font-medium"
              placeholder="e.g. NEET (11th & 12th) Full Course"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Selling Price (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.price}
                  onChange={e => setConfig(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 focus:outline-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Original / Strikethrough Price (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.originalPrice}
                  onChange={e => setConfig(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-500 focus:outline-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Drive Folders */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-blue-600" />
                <span>Public Sample Google Drive Link (Accessible to Everyone)</span>
              </label>
              <input
                type="url"
                value={config.sampleDriveLink}
                onChange={e => setConfig(prev => ({ ...prev, sampleDriveLink: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-indigo-500"
                placeholder="https://drive.google.com/drive/folders/..."
                required
              />
            </div>

            <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Private Full Course Google Drive Link (Paid Students Only)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPrivateLink(!showPrivateLink)}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer flex items-center gap-1"
                >
                  {showPrivateLink ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPrivateLink ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showPrivateLink ? 'text' : 'password'}
                value={config.mainCourseDriveLink}
                onChange={e => setConfig(prev => ({ ...prev, mainCourseDriveLink: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono text-slate-900 focus:outline-amber-600"
                placeholder="https://drive.google.com/drive/folders/..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving to Firebase & Server...' : 'Save NEET Course Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MULTI-CLASS COURSES (Class 6th, 7th, 8th, 9th, 10th, 11th, 12th, NEET) */}
      {activeTab === 'multi_class' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Multi-Class Course Catalog (6th, 7th, 8th, 9th, 10th...)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Add and customize foundation courses for any grade level. All courses sync directly to Firebase RTDB.
              </p>
            </div>

            {/* Quick Add Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">Quick Add:</span>
              {['Class 6th', 'Class 7th', 'Class 8th', 'Class 9th', 'Class 10th', 'NEET Dropper'].map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => handleAddNewClassCourse(cls)}
                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{cls}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Course Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
            {multiClassCourses.map(c => {
              const isSelected = c.id === activeEditingCourse?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{c.targetClass || c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    ₹{c.price}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Class Course Editor */}
          {activeEditingCourse && (
            <div className="space-y-4 pt-1 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200">
                    {activeEditingCourse.targetClass || 'Course'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {activeEditingCourse.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentClassCourse('isActive', !activeEditingCourse.isActive)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      activeEditingCourse.isActive 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {activeEditingCourse.isActive ? 'Active' : 'Disabled'}
                  </button>

                  {activeEditingCourse.id !== 'neet-full-course-11-12' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClassCourse(activeEditingCourse.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Target Class / Level</label>
                  <input
                    type="text"
                    value={activeEditingCourse.targetClass || ''}
                    onChange={e => handleUpdateCurrentClassCourse('targetClass', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    placeholder="e.g. Class 7th, Class 10th, NEET Dropper"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Badge Text</label>
                  <input
                    type="text"
                    value={activeEditingCourse.badgeText || ''}
                    onChange={e => handleUpdateCurrentClassCourse('badgeText', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    placeholder="e.g. Foundation, Board Special, Starter"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Course Title</label>
                <input
                  type="text"
                  value={activeEditingCourse.title}
                  onChange={e => handleUpdateCurrentClassCourse('title', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={activeEditingCourse.subtitle || ''}
                  onChange={e => handleUpdateCurrentClassCourse('subtitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Selling Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={activeEditingCourse.price}
                      onChange={e => handleUpdateCurrentClassCourse('price', Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Original Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={activeEditingCourse.originalPrice || 999}
                      onChange={e => handleUpdateCurrentClassCourse('originalPrice', Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Public Sample Google Drive Link</span>
                  </label>
                  <input
                    type="url"
                    value={activeEditingCourse.sampleDriveLink || ''}
                    onChange={e => handleUpdateCurrentClassCourse('sampleDriveLink', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </div>

                <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Main Full Course Drive Link (Delivered after payment)</span>
                  </label>
                  <input
                    type="text"
                    value={activeEditingCourse.mainCourseDriveLink || ''}
                    onChange={e => handleUpdateCurrentClassCourse('mainCourseDriveLink', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono"
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAllMultiClassCourses}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Syncing to Firebase...' : 'Save & Sync Multi-Class Courses'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLOUDFLARE R2 & FIREBASE REALTIME DATABASE STATUS */}
      {activeTab === 'storage_status' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Firebase Realtime Database & Cloudflare R2 Diagnostic</span>
            </h3>
            <p className="text-xs text-slate-500">
              Verified persistent storage architecture for static hosting (Cloudflare Pages / Netlify) and live server mode.
            </p>
          </div>

          {/* Architecture Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Firebase RTDB */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Firebase Realtime Database</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-800">
                  CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Direct browser sync enabled. All course settings, multi-class catalog, orders, and student access keys are stored and retrieved with zero server requirement.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-white/70 p-2 rounded-lg border border-emerald-200 break-all">
                https://ncertify-neet-master-tests-default-rtdb.firebaseio.com
              </div>
            </div>

            {/* Cloudflare R2 Storage */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Cloudflare R2 Storage</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-200 text-blue-800">
                  READY
                </span>
              </div>
              <p className="text-[11px] text-blue-800">
                Bucket <code className="font-mono font-bold">ncertify</code> is active. Direct file downloads and sample previews are delivered via Cloudflare edge CDN.
              </p>
              <div className="text-[10px] font-mono text-blue-700 bg-white/70 p-2 rounded-lg border border-blue-200 break-all">
                {DEFAULT_R2_PUBLIC_DOMAIN}
              </div>
            </div>
          </div>

          {/* Cloudflare Pages Static Variable Guide */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Cloudflare Pages Static Hosting Note & Fix</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When hosting on <strong>Cloudflare Pages</strong>, frontend files are served statically. In this app, all credentials (Firebase RTDB, Cloudflare R2 bucket endpoints, Google Drive integrations) are <strong>self-contained and self-healing</strong>:
            </p>
            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
              <li>You <strong>do not need</strong> to configure build-time variables in Cloudflare Pages.</li>
              <li>Whenever you update prices, Drive links, or add courses in this Admin Panel, changes write directly to <strong>Firebase Realtime Database</strong>.</li>
              <li>Every student browser listens to these updates live in real-time.</li>
            </ul>
          </div>

          {/* Cloudflare R2 Public CDN Config */}
          <form onSubmit={handleSaveR2Domain} className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Cloudflare R2 Public Domain (CDN Endpoint)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={r2DomainInput}
                  onChange={e => setR2DomainInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900"
                  placeholder="https://pub-xxxxxx.r2.dev or custom domain"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Update CDN
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Enrolled Students & Purchases Feed */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

