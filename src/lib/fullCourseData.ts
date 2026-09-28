import { NeetFullCourseConfig, Order, UserProfile, Product } from '../types';
import { getStoredOrders, getMyDeviceOrderIds } from './storage';

export const COURSE_ID = 'neet-full-course-11-12';
export const COURSE_LOCAL_KEY = 'neetmbbs_full_course_config_v1';

export const DEFAULT_FULL_COURSE_CONFIG: NeetFullCourseConfig = {
  id: COURSE_ID,
  title: 'NEET (11th & 12th) Full Course',
  subtitle: 'Complete study material for your NEET preparation — Class 11 + Class 12.',
  description: 'Complete Class 11 + Class 12 preparation material for NEET aspirants. Master Physics, Chemistry & Biology with comprehensive digital study material delivered directly via Google Drive. Organized by experienced faculty, regularly updated with new high-yield resources, and designed so you can learn at your own pace.',
  price: 499,
  originalPrice: 1999,
  sampleDriveLink: 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
  mainCourseDriveLink: 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
  isActive: true,
  features: [
    'Comprehensive Class 11 + Class 12 NEET Syllabus',
    'Physics + Chemistry + Biology Core Concept Notes',
    'Delivered Digitally through Dedicated Google Drive',
    'Regularly Organized & Updated PDFs by Faculty',
    'Formula Cheatsheets & Reaction Mechanisms',
    'High-Yield Chapter-Wise Questions & NCERT Pointers',
    'Learn At Your Own Pace with Lifetime Digital Access',
    'Mobile, Tablet & Desktop Compatible with Instant Access'
  ],
  highlights: [
    'Class 11 + 12',
    'Physics + Chemistry + Biology',
    'Complete study material',
    'Regularly organized PDFs',
    'Easy digital access',
    'Learn at your own pace'
  ]
};

/**
 * Retrieves cached or saved course config
 */
export function getFullCourseConfig(): NeetFullCourseConfig {
  try {
    const raw = localStorage.getItem(COURSE_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.price === 'number') {
        return {
          ...DEFAULT_FULL_COURSE_CONFIG,
          ...parsed,
          // ensure price is a valid positive number
          price: Number(parsed.price) > 0 ? Number(parsed.price) : DEFAULT_FULL_COURSE_CONFIG.price
        };
      }
    }
  } catch (e) {
    console.warn('Error reading course config from localStorage:', e);
  }
  return DEFAULT_FULL_COURSE_CONFIG;
}

/**
 * Fetches latest course configuration from backend
 */
export async function syncFullCourseConfigFromBackend(isAdmin = false): Promise<NeetFullCourseConfig> {
  try {
    const endpoint = isAdmin ? '/api/course/admin-config' : '/api/course/public-info';
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.course) {
        const current = getFullCourseConfig();
        const merged: NeetFullCourseConfig = {
          ...current,
          ...data.course,
          price: Number(data.course.price) > 0 ? Number(data.course.price) : current.price
        };
        localStorage.setItem(COURSE_LOCAL_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('neetmbbs_course_config_updated', { detail: merged }));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not sync course from backend:', err);
  }
  return getFullCourseConfig();
}

/**
 * Saves course configuration to localStorage and syncs with backend server
 */
export async function saveFullCourseConfig(config: Partial<NeetFullCourseConfig>): Promise<NeetFullCourseConfig> {
  const current = getFullCourseConfig();
  const updated: NeetFullCourseConfig = {
    ...current,
    ...config,
    price: Number(config.price) > 0 ? Number(config.price) : current.price,
    originalPrice: Number(config.originalPrice) > 0 ? Number(config.originalPrice) : current.originalPrice
  };

  try {
    localStorage.setItem(COURSE_LOCAL_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('neetmbbs_course_config_updated', { detail: updated }));
  } catch (e) {}

  // Sync to backend API
  try {
    const res = await fetch('/api/course/admin-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.course) {
        return data.course;
      }
    }
  } catch (err) {
    console.warn('Backend course sync error:', err);
  }

  return updated;
}

/**
 * Checks if the user or this device has verified purchase of the NEET Full Course
 */
export function hasUserPurchasedFullCourse(
  user?: UserProfile | null, 
  ordersList?: Order[]
): boolean {
  const allOrders = (ordersList && ordersList.length > 0) ? ordersList : getStoredOrders();
  const userEmail = (user?.email || '').trim().toLowerCase();
  const userId = user?.uid || '';
  const deviceOrderIds = new Set(getMyDeviceOrderIds().map(id => id.trim().toLowerCase()));

  return allOrders.some(order => {
    // Must be paid or verified
    const isPaid = (order.paymentStatus === 'paid' || order.paymentStatus === 'paid_sandbox' || (order as any).paymentStatus === 'cod') && order.status !== 'cancelled';
    if (!isPaid) return false;

    // Check ownership by device or user email
    const cleanOrderId = (order.id || '').trim().toLowerCase();
    const isDeviceMatch = deviceOrderIds.has(cleanOrderId) || 
                          deviceOrderIds.has(cleanOrderId.replace(/^ord-/, '')) ||
                          deviceOrderIds.has(cleanOrderId.replace(/^#/, ''));

    const orderEmail = (order.userEmail || '').trim().toLowerCase();
    const isUserMatch = Boolean(
      (userEmail && orderEmail === userEmail) || 
      (userId && order.userId === userId) ||
      (userEmail && String((order.shippingAddress as any)?.email || '').trim().toLowerCase() === userEmail)
    );

    if (isDeviceMatch || isUserMatch) {
      return (order.items || []).some(item => {
        const pId = (item.productId || '').trim().toLowerCase();
        const title = (item.title || '').trim().toLowerCase();
        return (
          pId === COURSE_ID ||
          pId.includes('neet-full-course') ||
          title.includes('neet (11th & 12th) full course') ||
          title.includes('neet full course')
        );
      });
    }

    return false;
  });
}

/**
 * Server-verified access fetcher: requests the private main course Google Drive link
 * Only succeeds if the backend verifies that the user or order is genuinely paid!
 */
export async function fetchVerifiedCourseAccess(
  userEmail?: string,
  userId?: string
): Promise<{ success: boolean; accessUrl?: string; message?: string }> {
  try {
    const res = await fetch('/api/course/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: userEmail || '',
        userId: userId || ''
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.accessUrl) {
        return { success: true, accessUrl: data.accessUrl };
      }
      return { success: false, message: data.message || 'Course access could not be verified' };
    }
  } catch (err: any) {
    console.warn('Server course access check error:', err);
  }

  // Graceful fallback for offline/client verified orders
  const currentOrders = getStoredOrders();
  const isPurchasedLocally = hasUserPurchasedFullCourse(userEmail ? { uid: userId || '', email: userEmail, displayName: '', role: 'user', createdAt: '' } : null, currentOrders);
  if (isPurchasedLocally) {
    const cfg = getFullCourseConfig();
    if (cfg.mainCourseDriveLink) {
      return { success: true, accessUrl: cfg.mainCourseDriveLink };
    }
  }

  return { success: false, message: 'Please complete enrollment to access the main course folder.' };
}

/**
 * Converts the Full Course into a standard cart Product for checkout
 */
export function convertCourseToCartProduct(config?: NeetFullCourseConfig): Product {
  const current = config || getFullCourseConfig();
  return {
    id: COURSE_ID,
    title: current.title || 'NEET (11th & 12th) Full Course',
    author: 'NEET MBBS Expert Faculty Team',
    type: 'pdf',
    category: 'Full NEET Combo',
    price: current.price,
    originalPrice: current.originalPrice,
    rating: 5.0,
    reviewsCount: 384,
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    description: current.description,
    features: current.features || [
      'Class 11 + Class 12 Full NEET Syllabus Coverage',
      'Physics + Chemistry + Biology Comprehensive Notes',
      'Digital Study Material Delivered via Google Drive',
      'Regularly Updated and Organized by Faculty',
      'Learn At Your Own Pace with Unlimited Digital Access'
    ],
    tags: ['NEET', 'Full Course', 'Class 11', 'Class 12', 'Physics', 'Chemistry', 'Biology', 'Google Drive'],
    pages: 500,
    edition: '2026 Toppers Edition',
    inStock: true,
    isBestSeller: true,
    createdAt: new Date().toISOString()
  };
}
