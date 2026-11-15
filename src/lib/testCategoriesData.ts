// Dynamic Test Categories Engine
// Pre-seeded ONLY with the 3 permanent default categories:
//   1. chapter_wise  - Chapter Wise Tests
//   2. full_subject  - Full Subject Tests
//   3. full_syllabus - Full Syllabus Tests
// Note: Legacy hardcoded cards (cbt_mock, pyq, custom_practice) are completely removed from defaults.

import { TestCategory, MockTest } from '../types';
import { getTestCategory, resolveApiUrl } from './mockTestData';

export const TEST_CATEGORIES_STORAGE_KEY = 'neetmbbs_test_categories_v1';

export const DEFAULT_TEST_CATEGORIES: TestCategory[] = [
  {
    id: 'chapter_wise',
    slug: 'chapter_wise',
    name: 'Chapter Wise Tests',
    description: 'Deep-dive topic by topic across NCERT Physics, Chemistry & Biology chapters',
    bannerImageUrl: '/src/assets/images/category_chapter_wise_1794238280926.jpg',
    themePreset: 'blue',
    displayOrder: 1,
    isVisible: true,
    isDefault: true,
    badgeText: '90+ Chapters',
    accentTags: ['Physics', 'Chemistry', 'Biology'],
    ctaText: 'Explore Chapters',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'full_subject',
    slug: 'full_subject',
    name: 'Full Subject Tests',
    description: 'Complete 100% syllabus evaluation for individual subjects (180 Marks)',
    bannerImageUrl: '/src/assets/images/category_full_subject_1794238281273.jpg',
    themePreset: 'purple',
    displayOrder: 2,
    isVisible: true,
    isDefault: true,
    badgeText: '180 Marks / Paper',
    accentTags: ['45 Qs Standard', 'All 3 Subjects', 'Subject Mastery'],
    ctaText: 'Explore Subject Series',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'full_syllabus',
    slug: 'full_syllabus',
    name: 'Full Syllabus Tests',
    description: 'Comprehensive 720-marks NTA NEET simulation with live All India Rank',
    bannerImageUrl: '/src/assets/images/category_full_syllabus_1794238281967.jpg',
    themePreset: 'amber',
    displayOrder: 3,
    isVisible: true,
    isDefault: true,
    badgeText: '720M Full PCB',
    accentTags: ['720 Marks NEET', '180/200 Qs NTA', 'AIR Ranking'],
    ctaText: 'Explore Grand Mocks',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export const REMOVED_LEGACY_CATEGORY_IDS = new Set(['cbt_mock', 'pyq', 'custom_practice']);

/**
 * Normalize & ensure the 3 permanent default categories always exist while never re-adding removed hardcoded cards
 */
export function normalizeTestCategories(input: TestCategory[] | undefined | null): TestCategory[] {
  const map = new Map<string, TestCategory>();

  for (const def of DEFAULT_TEST_CATEGORIES) {
    map.set(def.id, { ...def });
  }

  if (Array.isArray(input)) {
    for (const raw of input) {
      if (!raw || !raw.id) continue;
      const cleanId = String(raw.id).trim();
      if (REMOVED_LEGACY_CATEGORY_IDS.has(cleanId)) continue;

      const existing = map.get(cleanId);
      if (existing) {
        // Default category — allow admin customization of banner, description, order, etc. while keeping isDefault=true
        map.set(cleanId, {
          ...existing,
          ...raw,
          id: existing.id,
          slug: existing.slug,
          isDefault: true
        });
      } else {
        map.set(cleanId, {
          ...raw,
          id: cleanId,
          slug: raw.slug || cleanId,
          isDefault: false,
          displayOrder: typeof raw.displayOrder === 'number' ? raw.displayOrder : 10,
          isVisible: raw.isVisible !== false,
          themePreset: raw.themePreset || 'indigo',
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString()
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const oA = typeof a.displayOrder === 'number' ? a.displayOrder : 99;
    const oB = typeof b.displayOrder === 'number' ? b.displayOrder : 99;
    if (oA !== oB) return oA - oB;
    return a.name.localeCompare(b.name);
  });
}

export function getStoredTestCategories(): TestCategory[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TEST_CATEGORIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return normalizeTestCategories(parsed);
        }
      }
    }
  } catch {}
  return normalizeTestCategories(DEFAULT_TEST_CATEGORIES);
}

export function saveStoredTestCategories(categories: TestCategory[]): TestCategory[] {
  const normalized = normalizeTestCategories(categories);
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(TEST_CATEGORIES_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('neetmbbs_test_categories_updated', { detail: normalized }));
    }
  } catch {}
  return normalized;
}

export async function fetchTestCategoriesFromServer(): Promise<TestCategory[]> {
  try {
    const res = await fetch(resolveApiUrl('/api/test-categories'));
    const data = await res.json();
    if (data && data.success && Array.isArray(data.categories)) {
      return saveStoredTestCategories(data.categories);
    }
  } catch (e) {
    console.warn('[TestCategories] Fetch fallback note:', e);
  }
  return getStoredTestCategories();
}

/**
 * Determine effective category IDs for any test (handles legacy single category + multi-category + standalone)
 */
export function resolveTestCategoryIds(test: MockTest): string[] {
  if (test.isStandalone && (!test.categoryIds || test.categoryIds.length === 0)) {
    return [];
  }
  if (Array.isArray(test.categoryIds) && test.categoryIds.length > 0) {
    return Array.from(new Set(test.categoryIds.map(c => String(c).trim()).filter(Boolean)));
  }

  // Legacy single-category fallback mapping (preserving access without showing removed legacy cards)
  const rawCat = test.testTypeCategory || getTestCategory(test);
  if (rawCat === 'cbt_mock' || rawCat === 'pyq') return ['full_syllabus'];
  if (rawCat === 'custom_practice') return ['chapter_wise'];
  if (rawCat) return [String(rawCat)];
  return ['full_syllabus'];
}

/**
 * True if a test should appear inside a given category slug/id
 */
export function testBelongsToCategory(
  test: MockTest,
  categoryIdOrSlug: string,
  options?: { includeUnlisted?: boolean }
): boolean {
  if (!categoryIdOrSlug) return false;
  if (test.visibility === 'draft' || test.status === 'draft') return false;
  if (!options?.includeUnlisted && test.visibility === 'unlisted') return false;
  const ids = resolveTestCategoryIds(test);
  return ids.includes(categoryIdOrSlug);
}

/**
 * Filter and deduplicate tests belonging to a category so each test card appears at most once per category
 */
export function filterTestsForCategoryDeduped(
  tests: MockTest[],
  categoryIdOrSlug: string,
  options?: { includeUnlisted?: boolean }
): MockTest[] {
  const seen = new Set<string>();
  const result: MockTest[] = [];
  for (const t of tests) {
    if (!t || !t.id || seen.has(t.id)) continue;
    if (testBelongsToCategory(t, categoryIdOrSlug, options)) {
      seen.add(t.id);
      result.push(t);
    }
  }
  return result;
}
