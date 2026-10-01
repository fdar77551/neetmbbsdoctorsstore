import { Coupon, CouponUsageRecord } from '../types';
import { safeSetLocalStorage, fetchFromFirebaseRTDBRest, syncToFirebaseRTDBRest } from './storage';

export const COUPONS_STORAGE_KEY = 'neetmbbs_coupons_list_v1';
export const COUPON_USAGE_STORAGE_KEY = 'neetmbbs_coupon_usage_v1';

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coupon-neet50',
    code: 'NEET50',
    discountType: 'flat',
    discountValue: 50,
    minAmount: 199,
    active: true,
    applicableProductTypes: ['all', 'book', 'pdf', 'mock_test', 'course'],
    totalUsageLimit: 1000,
    perUserUsageLimit: 3,
    currentUsageCount: 42,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'coupon-doctor10',
    code: 'DOCTOR10',
    discountType: 'percentage',
    discountValue: 10,
    minAmount: 399,
    maxDiscount: 150,
    active: true,
    applicableProductTypes: ['all', 'book', 'pdf', 'mock_test', 'course'],
    totalUsageLimit: 500,
    perUserUsageLimit: 2,
    currentUsageCount: 18,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'coupon-mock25',
    code: 'MOCK25',
    discountType: 'percentage',
    discountValue: 25,
    minAmount: 99,
    maxDiscount: 100,
    active: true,
    applicableProductTypes: ['mock_test'],
    totalUsageLimit: 300,
    perUserUsageLimit: 1,
    currentUsageCount: 9,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'coupon-course100',
    code: 'COURSE100',
    discountType: 'flat',
    discountValue: 100,
    minAmount: 499,
    active: true,
    applicableProductTypes: ['course'],
    totalUsageLimit: 200,
    perUserUsageLimit: 1,
    currentUsageCount: 14,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function getStoredCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored coupons:', e);
  }
  return DEFAULT_COUPONS;
}

export function saveStoredCoupons(coupons: Coupon[]): void {
  try {
    safeSetLocalStorage(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new CustomEvent('neetmbbs_coupons_updated', { detail: coupons }));
    syncToFirebaseRTDBRest('coupons', coupons).catch(() => {});
  } catch (e) {
    console.error('Failed to save coupons:', e);
  }
}

export function getStoredCouponUsage(): CouponUsageRecord[] {
  try {
    const raw = localStorage.getItem(COUPON_USAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveCouponUsageRecord(record: CouponUsageRecord): void {
  try {
    const current = getStoredCouponUsage();
    const updated = [record, ...current];
    safeSetLocalStorage(COUPON_USAGE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('neetmbbs_coupon_usage_updated', { detail: updated }));

    // Increment coupon currentUsageCount
    const allCoupons = getStoredCoupons();
    const targetIdx = allCoupons.findIndex(c => c.code.toUpperCase() === record.couponCode.toUpperCase());
    if (targetIdx !== -1) {
      allCoupons[targetIdx].currentUsageCount = (allCoupons[targetIdx].currentUsageCount || 0) + 1;
      saveStoredCoupons(allCoupons);
    }

    // Sync to backend / Firebase
    syncToFirebaseRTDBRest(`coupon_usage/${record.id}`, record).catch(() => {});
    fetch('/api/coupons/record-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => {});
  } catch (e) {
    console.error('Failed to save coupon usage record:', e);
  }
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  finalAmount: number;
  originalAmount: number;
  error?: string;
}

/**
 * Validates a coupon against an order amount and product context
 */
export function validateCouponLocal(
  rawCode: string,
  cartAmount: number,
  productType: 'book' | 'pdf' | 'mock_test' | 'course' | 'mixed' | 'all' = 'all',
  userId?: string,
  userEmail?: string
): CouponValidationResult {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: 'Please enter a coupon code' };
  }

  const coupons = getStoredCoupons();
  const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" is not recognized` };
  }

  if (!coupon.active) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" is currently inactive` };
  }

  // Check start date
  if (coupon.startDate && new Date(coupon.startDate).getTime() > Date.now()) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" has not started yet` };
  }

  // Check expiry date
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" has expired` };
  }

  // Check minimum order amount
  if (coupon.minAmount && cartAmount < coupon.minAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalAmount: cartAmount,
      originalAmount: cartAmount,
      error: `Minimum order amount of ₹${coupon.minAmount} required to apply this coupon`
    };
  }

  // Check total usage limit
  if (coupon.totalUsageLimit && (coupon.currentUsageCount || 0) >= coupon.totalUsageLimit) {
    return { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" usage limit has been reached` };
  }

  // Check per-user limit
  if (coupon.perUserUsageLimit && (userId || userEmail)) {
    const usages = getStoredCouponUsage();
    const userUsages = usages.filter(u => 
      u.couponCode.toUpperCase() === cleanCode && 
      ((userId && u.userId === userId) || (userEmail && u.userEmail.toLowerCase() === userEmail.toLowerCase()))
    );
    if (userUsages.length >= coupon.perUserUsageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: cartAmount,
        originalAmount: cartAmount,
        error: `You have already used this coupon the maximum allowed times (${coupon.perUserUsageLimit})`
      };
    }
  }

  // Check applicable product types
  const applicableTypes = coupon.applicableProductTypes || ['all'];
  if (!applicableTypes.includes('all')) {
    if (productType !== 'all' && productType !== 'mixed' && !applicableTypes.includes(productType as any)) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: cartAmount,
        originalAmount: cartAmount,
        error: `Coupon "${cleanCode}" is only applicable for ${applicableTypes.join(', ')}`
      };
    }
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((cartAmount * coupon.discountValue) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    // Flat ₹
    discount = Math.min(coupon.discountValue, cartAmount);
  }

  const finalAmount = Math.max(1, cartAmount - discount);

  return {
    valid: true,
    coupon,
    discountAmount: discount,
    finalAmount,
    originalAmount: cartAmount
  };
}

/**
 * Validate with server fallback
 */
export async function validateCoupon(
  rawCode: string,
  cartAmount: number,
  productType: 'book' | 'pdf' | 'mock_test' | 'course' | 'mixed' | 'all' = 'all',
  userId?: string,
  userEmail?: string,
  productId?: string
): Promise<CouponValidationResult> {
  const localResult = validateCouponLocal(rawCode, cartAmount, productType, userId, userEmail);

  // Try calling server-side validation route
  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: rawCode,
        amount: cartAmount,
        productType,
        userId,
        userEmail,
        productId
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.result) {
        return data.result;
      }
    }
  } catch (err) {
    console.warn('Server coupon validation offline, using verified local validation');
  }

  return localResult;
}

/**
 * Sync coupons from backend / Firebase
 */
export async function syncCouponsFromRemote(): Promise<void> {
  try {
    const remote = await fetchFromFirebaseRTDBRest('coupons');
    if (remote && (Array.isArray(remote) || typeof remote === 'object')) {
      const list: Coupon[] = Array.isArray(remote) ? remote.filter(Boolean) : Object.values(remote);
      if (list.length > 0) {
        safeSetLocalStorage(COUPONS_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('neetmbbs_coupons_updated', { detail: list }));
      }
    }
  } catch (e) {
    console.warn('Sync coupons notice:', e);
  }
}
