import { ProductReview, ReviewProductType } from '../types';
import { safeSetLocalStorage, fetchFromFirebaseRTDBRest, syncToFirebaseRTDBRest } from './storage';
import { hasUserPurchasedMockTest } from './mockTestData';
import { hasUserPurchasedFullCourse } from './fullCourseData';

export const REVIEWS_STORAGE_KEY = 'neetmbbs_product_reviews_v1';

export const INITIAL_REVIEWS: ProductReview[] = [
  // Physical Books
  {
    id: 'rev-book-1',
    productId: '1',
    productType: 'book',
    productTitle: 'NEET 37 Years Chapterwise Solved Papers - Biology',
    userId: 'user-topper-priya',
    userEmail: 'priya.sharma99@gmail.com',
    userName: 'Dr. Priya Sharma (AIIMS Rank 48)',
    rating: 5,
    comment: 'The quality of printing and NCERT citations beside every single question is unmatched. Helped me immensely in scoring 355/360 in NEET Biology!',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-02-14T10:30:00.000Z'
  },
  {
    id: 'rev-book-2',
    productId: '1',
    productType: 'book',
    productTitle: 'NEET 37 Years Chapterwise Solved Papers - Biology',
    userId: 'user-aman-k',
    userEmail: 'aman.kumar.neet@gmail.com',
    userName: 'Aman Kumar (AFMC Cadet)',
    rating: 5,
    comment: 'Strict NCERT based question segregation. Very useful material and good questions.',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-02-28T14:15:00.000Z'
  },
  // PDFs / Digital Products
  {
    id: 'rev-pdf-1',
    productId: 'prod-doc-notes-bio',
    productType: 'pdf',
    productTitle: 'Doctor Handwritten Rapid Revision Notes - Full Biology',
    userId: 'user-neha-p',
    userEmail: 'neha.patel.med@gmail.com',
    userName: 'Neha Patel',
    rating: 5,
    comment: 'Clean diagrams and memory mnemonics! Delivered instantly to my PDF portal right after payment.',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-03-05T09:20:00.000Z'
  },
  // Mock Tests
  {
    id: 'rev-mock-1',
    productId: 'neet-mock-01',
    productType: 'mock_test',
    productTitle: 'NEET Full Mock Test 01 (All India Rank Predictor)',
    userId: 'user-rohit-v',
    userEmail: 'rohit.verma.neet@gmail.com',
    userName: 'Rohit Verma',
    rating: 5,
    comment: 'Exactly mimics the real NTA interface! The +4/-1 negative marking, Hindi/English switch, and scientific diagrams match official NEET standards.',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-03-12T16:45:00.000Z'
  },
  {
    id: 'rev-mock-2',
    productId: 'neet-mock-01',
    productType: 'mock_test',
    productTitle: 'NEET Full Mock Test 01 (All India Rank Predictor)',
    userId: 'user-simran-j',
    userEmail: 'simran.jeet.medical@gmail.com',
    userName: 'Simran Jeet Kaur',
    rating: 4,
    comment: 'High yield questions in Organic Chemistry and Genetics. The solution breakdown after submission gave me clear focus areas.',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-03-18T11:10:00.000Z'
  },
  // NEET Full Course
  {
    id: 'rev-course-1',
    productId: 'neet-full-course-11-12',
    productType: 'course',
    productTitle: 'NEET (11th & 12th) Complete Foundation & Mastery Course',
    userId: 'user-aarav-m',
    userEmail: 'aarav.mehta.doctor@gmail.com',
    userName: 'Aarav Mehta',
    rating: 5,
    comment: 'The Google Drive access provided after payment had complete lecture modules, question banks, and flashcards for Class 11 and 12. Best investment for NEET preparation!',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-03-20T18:00:00.000Z'
  },
  {
    id: 'rev-course-2',
    productId: 'neet-full-course-11-12',
    productType: 'course',
    productTitle: 'NEET (11th & 12th) Complete Foundation & Mastery Course',
    userId: 'user-tanvi-s',
    userEmail: 'tanvi.singh.neet26@gmail.com',
    userName: 'Tanvi Singh',
    rating: 5,
    comment: 'Everything organized subject-wise and chapter-wise. Formula sheets are phenomenal for last-minute revisions.',
    isVerifiedPurchase: true,
    isHidden: false,
    createdAt: '2026-03-25T13:30:00.000Z'
  }
];

export function getStoredReviews(): ProductReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored reviews:', e);
  }
  return INITIAL_REVIEWS;
}

export function saveStoredReviews(reviews: ProductReview[]): void {
  try {
    safeSetLocalStorage(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new CustomEvent('neetmbbs_reviews_updated', { detail: reviews }));
    syncToFirebaseRTDBRest('reviews', reviews).catch(() => {});
  } catch (e) {
    console.error('Failed to save reviews:', e);
  }
}

export function getReviewsForProduct(productId: string, includeHidden = false): ProductReview[] {
  const all = getStoredReviews();
  return all.filter(r => {
    if (r.productId !== productId) return false;
    if (!includeHidden && r.isHidden) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface ProductRatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export function getProductRatingStats(
  productId: string, 
  baseRating = 4.8, 
  baseCount = 126
): ProductRatingStats {
  const reviews = getReviewsForProduct(productId, false);
  
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  if (reviews.length === 0) {
    // Generate balanced realistic distribution based on default rating
    const total = baseCount;
    distribution[5] = Math.round(total * 0.82);
    distribution[4] = Math.round(total * 0.13);
    distribution[3] = Math.round(total * 0.03);
    distribution[2] = Math.round(total * 0.01);
    distribution[1] = total - (distribution[5] + distribution[4] + distribution[3] + distribution[2]);
    return {
      averageRating: baseRating,
      totalReviews: baseCount,
      ratingDistribution: distribution
    };
  }

  // Calculate actual
  let sum = 0;
  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    sum += r.rating;
  });

  const avg = parseFloat((sum / reviews.length).toFixed(1));

  return {
    averageRating: avg,
    totalReviews: reviews.length,
    ratingDistribution: distribution
  };
}

/**
 * Add a new user review
 */
export function addProductReview(review: Omit<ProductReview, 'id' | 'createdAt'>): ProductReview {
  const newReview: ProductReview = {
    ...review,
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    isHidden: false
  };

  const current = getStoredReviews();
  const updated = [newReview, ...current];
  saveStoredReviews(updated);

  // Sync to backend
  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newReview)
  }).catch(() => {});

  return newReview;
}

/**
 * Toggle hide/unhide for review moderation
 */
export function toggleReviewVisibility(reviewId: string): void {
  const all = getStoredReviews();
  const target = all.find(r => r.id === reviewId);
  if (target) {
    target.isHidden = !target.isHidden;
    saveStoredReviews(all);

    fetch(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: target.isHidden })
    }).catch(() => {});
  }
}

/**
 * Delete review permanently
 */
export function deleteProductReview(reviewId: string): void {
  const all = getStoredReviews();
  const filtered = all.filter(r => r.id !== reviewId);
  saveStoredReviews(filtered);

  fetch(`/api/reviews/${reviewId}`, {
    method: 'DELETE'
  }).catch(() => {});
}

/**
 * Verify whether a user is allowed to submit a review for a specific product
 */
export function canUserReviewProduct(
  productId: string,
  productType: ReviewProductType,
  userId?: string,
  userEmail?: string
): { canReview: boolean; reason?: string; isVerified: boolean } {
  if (!userId && !userEmail) {
    return { canReview: false, reason: 'Please log in to submit a review', isVerified: false };
  }

  // Check if user already reviewed
  const existing = getStoredReviews().find(r => 
    r.productId === productId && 
    ((userId && r.userId === userId) || (userEmail && r.userEmail.toLowerCase() === userEmail.toLowerCase()))
  );
  if (existing) {
    return { canReview: false, reason: 'You have already reviewed this item. Thank you!', isVerified: true };
  }

  // Check purchase status
  let isPurchased = false;
  if (productType === 'mock_test') {
    isPurchased = hasUserPurchasedMockTest(userId, userEmail, productId);
  } else if (productType === 'course') {
    isPurchased = hasUserPurchasedFullCourse(
      userEmail ? { uid: userId || '', email: userEmail, displayName: '', role: 'user', createdAt: '' } : null
    );
  } else {
    // For books and PDFs, check orders from localStorage
    try {
      const ordersRaw = localStorage.getItem('neetmbbs_orders');
      if (ordersRaw) {
        const orders = JSON.parse(ordersRaw);
        if (Array.isArray(orders)) {
          isPurchased = orders.some(o => 
            ((userId && o.userId === userId) || (userEmail && o.userEmail?.toLowerCase() === userEmail?.toLowerCase())) &&
            o.items?.some((i: any) => i.productId === productId)
          );
        }
      }
    } catch (e) {}
  }

  return { canReview: true, isVerified: isPurchased };
}

/**
 * Sync reviews from remote
 */
export async function syncReviewsFromRemote(): Promise<void> {
  try {
    const remote = await fetchFromFirebaseRTDBRest('reviews');
    if (remote && (Array.isArray(remote) || typeof remote === 'object')) {
      const list: ProductReview[] = Array.isArray(remote) ? remote.filter(Boolean) : Object.values(remote);
      if (list.length > 0) {
        safeSetLocalStorage(REVIEWS_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('neetmbbs_reviews_updated', { detail: list }));
      }
    }
  } catch (e) {
    console.warn('Sync reviews notice:', e);
  }
}
