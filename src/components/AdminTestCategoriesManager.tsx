import React, { useEffect, useRef, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Image as ImageIcon,
  Search,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { MockTest, TestCategory, TestCategoryThemePreset } from '../types';
import {
  DEFAULT_TEST_CATEGORIES,
  fetchTestCategoriesFromServer,
  normalizeTestCategories,
  resolveTestCategoryIds
} from '../lib/testCategoriesData';
import { getStoredMockTests, saveStoredMockTests, syncAllMockTestsFromSources } from '../lib/mockTestData';

const THEME_PRESET_OPTIONS: { value: TestCategoryThemePreset; label: string; previewClass: string }[] = [
  { value: 'amber', label: 'Amber Gold', previewClass: 'from-amber-500 to-orange-600' },
  { value: 'emerald', label: 'Emerald Green', previewClass: 'from-emerald-500 to-teal-600' },
  { value: 'blue', label: 'Electric Blue', previewClass: 'from-blue-600 to-indigo-700' },
  { value: 'violet', label: 'Violet Pulse', previewClass: 'from-violet-600 to-purple-700' },
  { value: 'indigo', label: 'Deep Indigo', previewClass: 'from-indigo-600 to-slate-900' },
  { value: 'rose', label: 'Crimson Rose', previewClass: 'from-rose-500 to-pink-600' },
  { value: 'cyan', label: 'Cyan Sky', previewClass: 'from-cyan-500 to-blue-600' }
];

export const AdminTestCategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<TestCategory[]>(DEFAULT_TEST_CATEGORIES);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create / Edit Category Modal State
  const [editingCat, setEditingCat] = useState<TestCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTheme, setFormTheme] = useState<TestCategoryThemePreset>('indigo');
  const [formBadge, setFormBadge] = useState('Custom Series');
  const [formCta, setFormCta] = useState('Explore Tests');
  const [formTags, setFormTags] = useState('NCERT Mapped, CBT Mock');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formOrder, setFormOrder] = useState(4);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Safe Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<TestCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('full_syllabus');
  const [reassignMode, setReassignMode] = useState<'category' | 'standalone'>('category');

  // Test Assignment Workbench State
  const [testSearch, setTestSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'standalone'>('all');
  const [savingTestId, setSavingTestId] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [fetchedCats, syncedTests] = await Promise.all([
        fetchTestCategoriesFromServer(),
        syncAllMockTestsFromSources().catch(() => getStoredMockTests())
      ]);
      setCategories(normalizeTestCategories(fetchedCats));
      setTests(syncedTests && syncedTests.length > 0 ? syncedTests : getStoredMockTests());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const openCreateModal = () => {
    setEditingCat(null);
    setFormName('');
    setFormDescription('');
    setFormTheme('indigo');
    setFormBadge('Custom Series');
    setFormCta('Explore Tests');
    setFormTags('NCERT Mapped, CBT Mock');
    setFormBannerUrl('');
    setFormVisible(true);
    setFormOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: TestCategory) => {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormTheme((cat.themePreset as TestCategoryThemePreset) || 'indigo');
    setFormBadge(cat.badgeText || '');
    setFormCta(cat.ctaText || 'Explore Tests');
    setFormTags((cat.accentTags || []).join(', '));
    setFormBannerUrl(cat.bannerImageUrl || '');
    setFormVisible(cat.isVisible !== false);
    setFormOrder(cat.displayOrder || 1);
    setIsModalOpen(true);
  };

  const handleBannerFileUpload = async (file: File) => {
    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'test-categories');
      formData.append('filename', `cat-banner-${Date.now()}-${file.name}`);
      formData.append('contentType', file.type || 'image/jpeg');

      const resp = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (data.success && data.url) {
        setFormBannerUrl(data.url);
        showToast('Category banner uploaded to Cloudflare R2.');
      } else {
        showToast(data.error || 'Failed to upload banner image.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Upload error.', 'error');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        themePreset: formTheme,
        badgeText: formBadge.trim(),
        ctaText: formCta.trim() || 'Explore Tests',
        accentTags: formTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        bannerImageUrl: formBannerUrl.trim(),
        isVisible: formVisible,
        displayOrder: Number(formOrder) || 1
      };

      const url = editingCat
        ? `/api/test-categories/${encodeURIComponent(editingCat.id)}`
        : '/api/test-categories';
      const method = editingCat ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success && Array.isArray(data.categories)) {
        const nextCats = normalizeTestCategories(data.categories);
        setCategories(nextCats);
        await fetchTestCategoriesFromServer();
        setIsModalOpen(false);
        showToast(editingCat ? `Updated "${payload.name}".` : `Created custom category "${payload.name}".`);
      } else {
        showToast(data.error || 'Failed to save category.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Server error saving category.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpdate = async (cat: TestCategory, patch: Partial<TestCategory>) => {
    try {
      const resp = await fetch(`/api/test-categories/${encodeURIComponent(cat.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await resp.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(normalizeTestCategories(data.categories));
        await fetchTestCategoriesFromServer();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update category.', 'error');
    }
  };

  const handleMoveOrder = async (cat: TestCategory, delta: -1 | 1) => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];

    await handleQuickUpdate(cat, { displayOrder: other.displayOrder || swapIdx + 1 });
    await handleQuickUpdate(other, { displayOrder: cat.displayOrder || idx + 1 });
    await loadAllData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/test-categories/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reassignMode === 'standalone'
            ? { makeStandalone: true }
            : { reassignToCategoryId: reassignTargetId || 'full_syllabus' }
        )
      });
      const data = await resp.json();
      if (data.success) {
        setCategories(normalizeTestCategories(data.categories));
        await loadAllData();
        setDeleteTarget(null);
        showToast(
          `Deleted "${deleteTarget.name}". ${data.reassignedTestsCount || 0} test(s) safely ${
            reassignMode === 'standalone' ? 'marked Standalone' : 'reassigned'
          }.`
        );
      } else {
        showToast(data.error || 'Could not delete category.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Delete request failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTestCategory = async (test: MockTest, categoryId: string) => {
    setSavingTestId(test.id);
    const current = resolveTestCategoryIds(test);
    const exists = current.includes(categoryId);
    const nextIds = exists ? current.filter(id => id !== categoryId) : [...current, categoryId];
    const standaloneNow = nextIds.length === 0;

    try {
      const resp = await fetch(`/api/db/mock-tests/${encodeURIComponent(test.id)}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryIds: nextIds,
          isStandalone: standaloneNow
        })
      });
      const data = await resp.json();
      if (data.success && data.test) {
        const updatedTests = tests.map(t => (t.id === test.id ? data.test : t));
        setTests(updatedTests);
        saveStoredMockTests(updatedTests);
        await fetchTestCategoriesFromServer();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update test assignment.', 'error');
    } finally {
      setSavingTestId(null);
    }
  };

  const handleToggleTestStandalone = async (test: MockTest) => {
    setSavingTestId(test.id);
    const nextStandalone = !test.isStandalone;
    try {
      const resp = await fetch(`/api/db/mock-tests/${encodeURIComponent(test.id)}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryIds: nextStandalone ? [] : resolveTestCategoryIds(test),
          isStandalone: nextStandalone
        })
      });
      const data = await resp.json();
      if (data.success && data.test) {
        const updatedTests = tests.map(t => (t.id === test.id ? data.test : t));
        setTests(updatedTests);
        saveStoredMockTests(updatedTests);
        await fetchTestCategoriesFromServer();
      }
    } finally {
      setSavingTestId(null);
    }
  };

  const filteredTests = tests.filter(t => {
    if (assignmentFilter === 'standalone' && !t.isStandalone && resolveTestCategoryIds(t).length > 0) {
      return false;
    }
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase();
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.chapter || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed bottom-20 sm:bottom-6 right-4 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-xl border flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Outfit',sans-serif]">
              Manage Test Categories
            </h2>
            <p className="text-xs text-slate-500">
              3 permanent default categories + custom admin categories. Edit descriptions, banners, visibility, or safely delete custom groups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllData}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">New Category</span>
          </button>
        </div>
      </div>

      {/* Category Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {categories.map((cat, idx) => {
          const preset = THEME_PRESET_OPTIONS.find(p => p.value === cat.themePreset) || THEME_PRESET_OPTIONS[2];
          const count = tests.filter(t => {
            if (t.visibility === 'draft' || t.visibility === 'unlisted' || t.isStandalone) return false;
            return resolveTestCategoryIds(t).includes(cat.id);
          }).length;

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-2xs flex flex-col justify-between transition ${
                cat.isVisible === false ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                <div className={`relative h-28 bg-gradient-to-br ${preset.previewClass} overflow-hidden`}>
                  {cat.bannerImageUrl && (
                    <img
                      src={cat.bannerImageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover opacity-85"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/95 text-slate-900 tabular-nums">
                      #{cat.displayOrder || idx + 1} · {count} Tests
                    </span>
                    {cat.isDefault ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                        Permanent Default
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                        Custom
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuickUpdate(cat, { isVisible: !(cat.isVisible !== false) })}
                      title={cat.isVisible !== false ? 'Hide from public Tests page' : 'Show on public Tests page'}
                      className="p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-slate-900 transition cursor-pointer"
                    >
                      {cat.isVisible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-300" />}
                    </button>
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3">
                    <h3 className="text-sm font-black text-white font-['Outfit',sans-serif] truncate">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                <div className="p-3.5 space-y-2">
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                    {cat.description || 'No description provided.'}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    Slug: {cat.id}
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveOrder(cat, -1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                    title="Move earlier"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === categories.length - 1}
                    onClick={() => handleMoveOrder(cat, 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                    title="Move later"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {!cat.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(cat);
                        setReassignMode('category');
                        const fallback = categories.find(c => c.id !== cat.id)?.id || 'full_syllabus';
                        setReassignTargetId(fallback);
                      }}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      title="Delete custom category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Category Test Assignment Workbench */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
              Test Category Assignment ({tests.length} Tests)
            </h3>
            <p className="text-xs text-slate-500">
              Assign any published test to one or more categories, or toggle Standalone (hidden from category cards while keeping direct link/purchases intact).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                placeholder="Search tests..."
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => setAssignmentFilter(prev => (prev === 'all' ? 'standalone' : 'all'))}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                assignmentFilter === 'standalone'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {assignmentFilter === 'standalone' ? 'Showing Standalone' : 'Filter Standalone'}
            </button>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredTests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No mock tests matched your filter.
            </div>
          ) : (
            filteredTests.map(test => {
              const assignedIds = resolveTestCategoryIds(test);
              const isBusy = savingTestId === test.id;

              return (
                <div
                  key={test.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">{test.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {test.subject || 'Combined'}
                      </span>
                      {test.isStandalone && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Standalone
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ID: {test.id} · {test.totalQuestions} Qs · {test.isFree ? 'Free' : `₹${test.price}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {categories.map(cat => {
                      const active = !test.isStandalone && assignedIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleTestCategory(test, cat.id)}
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {active && <ShieldCheck className="w-3 h-3" />}
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleTestStandalone(test)}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        test.isStandalone
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      Standalone
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                {editingCat ? `Edit "${editingCat.name}"` : 'Create Custom Test Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-3.5 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Category Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Grand Test Series, Part Tests, NCERT Line-by-Line"
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Short description displayed on the student portal card..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Theme Preset</label>
                  <select
                    value={formTheme}
                    onChange={e => setFormTheme(e.target.value as TestCategoryThemePreset)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                  >
                    {THEME_PRESET_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={e => setFormOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Top-Right Badge</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    placeholder="e.g. NEET 2026"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Button Label</label>
                  <input
                    type="text"
                    value={formCta}
                    onChange={e => setFormCta(e.target.value)}
                    placeholder="Explore Tests"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Highlight Tags (comma separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                  placeholder="NCERT Mapped, Timed CBT, Detailed Keys"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl"
                />
              </div>

              {/* Banner Image Upload / URL */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Banner Image (Optional)
                  </span>
                  <button
                    type="button"
                    disabled={isUploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingBanner ? 'Uploading...' : 'Upload Image to R2'}
                  </button>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleBannerFileUpload(f);
                      e.target.value = '';
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={formBannerUrl}
                  onChange={e => setFormBannerUrl(e.target.value)}
                  placeholder="https://... or /api/r2/file/... (leave blank for gradient theme)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formVisible}
                  onChange={e => setFormVisible(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Visible to students on public Mock Tests portal</span>
              </label>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingBanner}
                  className="min-h-[40px] px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Category Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                  Delete "{deleteTarget.name}"?
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tests, questions, purchases, and orders are NEVER deleted. Choose where tests in this category should go:
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'category'}
                  onChange={() => setReassignMode('category')}
                />
                <span className="font-bold text-slate-800">Reassign affected tests to another category</span>
              </label>

              {reassignMode === 'category' && (
                <select
                  value={reassignTargetId}
                  onChange={e => setReassignTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                >
                  {categories
                    .filter(c => c.id !== deleteTarget.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              )}

              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'standalone'}
                  onChange={() => setReassignMode('standalone')}
                />
                <span className="font-bold text-slate-800">Convert to Standalone tests (preserve access &amp; links)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {isSaving ? 'Deleting...' : 'Confirm Safe Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
