import { Product, Order, UserProfile, CartItem, BannerSlide, SupportMessage, StoreConfig } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_REGISTERED_USERS, DEFAULT_BANNERS } from './data';
import { 
  rtdb,
  ref,
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue
} from './firebase';

const PRODUCTS_KEY = 'neetmbbs_products_v2';
const BANNERS_KEY = 'neetmbbs_banners_v1';
const ORDERS_KEY = 'neetmbbs_orders_v2';
const USERS_KEY = 'neetmbbs_registered_users_v2';
const CURRENT_USER_KEY = 'neetmbbs_current_user_v2';
const CART_KEY = 'neetmbbs_cart_v2';
const WISHLIST_KEY = 'neetmbbs_wishlist_v2';
const SUPPORT_KEY = 'neetmbbs_support_messages_v1';
const R2_PUBLIC_DOMAIN_KEY = 'neetmbbs_r2_public_domain';

const FIREBASE_RTDB_BASE = "https://ncertify-neet-master-tests-default-rtdb.firebaseio.com";

// Sanitizer for Orders to prevent QuotaExceededError from nested large base64 image strings
export function sanitizeOrderForStorage(order: Order): Order {
  if (!order) return order;
  return {
    ...order,
    items: (order.items || []).map(item => {
      let cover = item.coverImage || '';
      // If it's a huge base64 data URI (> 300 chars), strip it from historical order records
      if (cover.startsWith('data:image/') && cover.length > 300) {
        cover = '';
      }
      return {
        ...item,
        coverImage: cover
      };
    })
  };
}

// Sanitizer for Products to prevent bloated sample images from exceeding storage quota
export function sanitizeProductForStorage(product: Product): Product {
  if (!product) return product;
  return {
    ...product,
    sampleImages: (product.sampleImages || []).map(img => {
      if (typeof img === 'string' && img.startsWith('data:image/') && img.length > 2000) {
        return '';
      }
      return img;
    }).filter(Boolean)
  };
}

// Quota-Safe LocalStorage Setter that guarantees no uncaught QuotaExceededError crashes the app
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (quotaError: any) {
    console.warn(`LocalStorage quota exceeded for key "${key}". Activating automatic quota recovery...`, quotaError?.message);
    try {
      // 1. If key is ORDERS_KEY, sanitize all orders and keep most recent 60
      if (key === ORDERS_KEY) {
        try {
          const parsed: Order[] = JSON.parse(value);
          const cleaned = parsed.map(sanitizeOrderForStorage).slice(0, 60);
          localStorage.setItem(key, JSON.stringify(cleaned));
          return true;
        } catch (e) {}
      }

      // 2. If key is PRODUCTS_KEY, sanitize product sample images
      if (key === PRODUCTS_KEY) {
        try {
          const parsed: Product[] = JSON.parse(value);
          const cleaned = parsed.map(sanitizeProductForStorage);
          localStorage.setItem(key, JSON.stringify(cleaned));
          return true;
        } catch (e) {}
      }

      // 3. Clear temporary checkout state
      try {
        localStorage.removeItem('neetmbbs_pending_checkout');
      } catch (e) {}

      // 4. Shrink stored orders if another key is trying to save
      try {
        const rawOrders = localStorage.getItem(ORDERS_KEY);
        if (rawOrders) {
          const parsedOrders: Order[] = JSON.parse(rawOrders);
          const cleanedOrders = parsedOrders.map(sanitizeOrderForStorage).slice(0, 35);
          localStorage.setItem(ORDERS_KEY, JSON.stringify(cleanedOrders));
        }
      } catch (e) {}

      // 5. Retry setting value
      localStorage.setItem(key, value);
      return true;
    } catch (fallbackError) {
      console.warn(`Could not set localStorage key "${key}" after quota recovery:`, fallbackError);
      return false;
    }
  }
}

// Self-heal and purge corrupted/bloated localStorage entries immediately on load
export function selfHealLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawOrders = localStorage.getItem(ORDERS_KEY);
    if (rawOrders) {
      try {
        const parsedOrders: Order[] = JSON.parse(rawOrders);
        if (Array.isArray(parsedOrders)) {
          const cleaned = parsedOrders.map(sanitizeOrderForStorage).slice(0, 80);
          safeSetLocalStorage(ORDERS_KEY, JSON.stringify(cleaned));
        }
      } catch (e) {
        localStorage.removeItem(ORDERS_KEY);
      }
    }

    try {
      const pendingRaw = localStorage.getItem('neetmbbs_pending_checkout');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (Date.now() - (pending?.timestamp || 0) > 1800000) {
          localStorage.removeItem('neetmbbs_pending_checkout');
        }
      }
    } catch (e) {}
  } catch (err) {
    console.warn('LocalStorage self-heal notice:', err);
  }
}

// Run self-heal immediately
if (typeof window !== 'undefined') {
  selfHealLocalStorage();
}

// Default Cloudflare R2 Public development URL
export const DEFAULT_R2_PUBLIC_DOMAIN = "https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev";

export function getR2PublicDomain(): string {
  try {
    const custom = localStorage.getItem(R2_PUBLIC_DOMAIN_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch (e) {}
  return DEFAULT_R2_PUBLIC_DOMAIN;
}

export function saveR2PublicDomain(domain: string): void {
  try {
    const clean = domain ? domain.trim().replace(/\/+$/, '') : '';
    if (clean) {
      safeSetLocalStorage(R2_PUBLIC_DOMAIN_KEY, clean);
    } else {
      localStorage.removeItem(R2_PUBLIC_DOMAIN_KEY);
    }
    window.dispatchEvent(new Event('neetmbbs_r2_config_updated'));
    // Sync to Firebase RTDB so all client browsers/Netlify visitors receive the updated public CDN domain automatically
    syncToFirebaseRTDBRest('config/r2_public_domain', clean || DEFAULT_R2_PUBLIC_DOMAIN);
  } catch (e) {
    console.error('Error saving R2 public domain:', e);
  }
}

// Universal Image URL resolver for Cloudflare R2, Base64, and Web CDNs
export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Data URLs (base64) & Blobs are self-contained
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const publicDomain = getR2PublicDomain() || DEFAULT_R2_PUBLIC_DOMAIN;

  // 2. If it's an old or different Cloudflare R2 .r2.dev URL (e.g. https://pub-d715d090a75efd8790b9a6da1e2f42d4.r2.dev/<key>)
  if (trimmed.includes('.r2.dev/')) {
    const key = trimmed.split('.r2.dev/')[1];
    if (key) {
      return `${publicDomain}/${key}`;
    }
  }

  // 3. If it's a private Cloudflare R2 S3 endpoint (e.g. https://...r2.cloudflarestorage.com/ncertify/<key>)
  if (trimmed.includes('.r2.cloudflarestorage.com/')) {
    const afterHost = trimmed.split('.r2.cloudflarestorage.com/')[1] || '';
    const parts = afterHost.split('/');
    const key = (parts.length > 1 && (parts[0] === 'ncertify' || parts[0] === 'bucket')) 
      ? parts.slice(1).join('/') 
      : afterHost;
    if (key) {
      return `${publicDomain}/${key}`;
    }
  }

  // 4. If it's an internal proxy URL like /api/r2/file/<key>
  if (trimmed.startsWith('/api/r2/file/')) {
    const key = trimmed.replace('/api/r2/file/', '');
    // In local dev with backend running we can use proxy, but direct CDN is always fast and universal
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return trimmed;
    }
    return `${publicDomain}/${key}`;
  }

  // 5. If it's an object key without leading slash (e.g. products/xxx.jpg or book-covers/xxx.png)
  if (
    trimmed.startsWith('products/') ||
    trimmed.startsWith('book-covers/') ||
    trimmed.startsWith('pdf-covers/') ||
    trimmed.startsWith('sample-pages/') ||
    trimmed.startsWith('banners/') ||
    trimmed.startsWith('pdfs/')
  ) {
    return `${publicDomain}/${trimmed}`;
  }

  // 6. Already an absolute HTTP/HTTPS URL (e.g. Unsplash, external CDN)
  return trimmed;
}

// Normalize any R2 asset URL directly to the current public R2 CDN link
export function normalizeCdnUrl(url?: string): string {
  if (!url) return '';
  const resolved = resolveImageUrl(url);
  return resolved || url;
}

// Bulk migration utility to upgrade all legacy database entries to the active Cloudflare R2 Public CDN
export function migrateExistingProductsToR2Cdn(): { productsMigrated: number; bannersMigrated: number } {
  const publicDomain = getR2PublicDomain() || DEFAULT_R2_PUBLIC_DOMAIN;
  let productsMigrated = 0;
  let bannersMigrated = 0;

  try {
    const products = getStoredProducts();
    const updatedProducts = products.map(prod => {
      let changed = false;
      const oldCover = prod.coverImage;
      const newCover = resolveImageUrl(oldCover);
      if (newCover && newCover !== oldCover) {
        changed = true;
      }

      const newSamples = (prod.sampleImages || []).map(img => {
        const resolved = resolveImageUrl(img);
        if (resolved !== img) changed = true;
        return resolved;
      });

      let newPdf = prod.pdfUrl;
      if (prod.pdfUrl) {
        const resolvedPdf = resolveImageUrl(prod.pdfUrl);
        if (resolvedPdf !== prod.pdfUrl) {
          newPdf = resolvedPdf;
          changed = true;
        }
      }

      if (changed) {
        productsMigrated++;
        return {
          ...prod,
          coverImage: newCover,
          sampleImages: newSamples,
          pdfUrl: newPdf
        };
      }
      return prod;
    });

    if (productsMigrated > 0) {
      saveStoredProducts(updatedProducts);
    }

    const banners = getStoredBanners();
    const updatedBanners = banners.map(ban => {
      const oldImg = ban.imageUrl;
      const newImg = resolveImageUrl(oldImg);
      if (newImg && newImg !== oldImg) {
        bannersMigrated++;
        return { ...ban, imageUrl: newImg };
      }
      return ban;
    });

    if (bannersMigrated > 0) {
      saveStoredBanners(updatedBanners);
    }

    // Sync active public domain to Firebase RTDB
    syncToFirebaseRTDBRest('config/r2_public_domain', publicDomain);
  } catch (err) {
    console.error('Error during CDN migration:', err);
  }

  return { productsMigrated, bannersMigrated };
}

// Deduplication Helper Functions to prevent React duplicate key collisions
export function deduplicateById<T extends { id?: string | number }>(items: (T | null | undefined)[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item || item.id === undefined || item.id === null) continue;
    const strId = String(item.id).trim();
    if (!strId) continue;
    if (!seen.has(strId)) {
      seen.add(strId);
      result.push(item);
    }
  }
  return result;
}

export function deduplicateUsers(users: (UserProfile | null | undefined)[]): UserProfile[] {
  if (!Array.isArray(users)) return [];
  const seen = new Set<string>();
  const result: UserProfile[] = [];
  for (const u of users) {
    if (!u || !u.email) continue;
    const key = u.email.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(u);
    }
  }
  return result;
}

// Safe API Fetch Helper (Handles Netlify HTML 404/SPA fallbacks without throwing SyntaxError)
async function safeJsonFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    // Expected on static environments like Netlify
  }
  return null;
}

// Direct Firebase Realtime Database REST helper (Works in all environments: Netlify, Vercel, Local, Cloud Run)
export async function syncToFirebaseRTDBRest(path: string, data: any): Promise<boolean> {
  try {
    const url = `${FIREBASE_RTDB_BASE}/${path}.json`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err: any) {
    console.warn(`Firebase RTDB REST sync notice (${path}):`, err?.message);
    return false;
  }
}

export async function fetchFromFirebaseRTDBRest(path: string): Promise<any> {
  try {
    const url = `${FIREBASE_RTDB_BASE}/${path}.json`;
    const resp = await fetch(url);
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('application/json')) {
      return await resp.json();
    }
  } catch (err: any) {
    console.warn(`Firebase RTDB REST fetch notice (${path}):`, err?.message);
  }
  return null;
}

// Client-side lightweight image compressor (resizes and compresses images to ~30-60KB WebP/JPEG)
export function compressImage(file: File | Blob, maxWidth = 1000, maxHeight = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      if (!dataUri) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUri);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp') && webpData.length < dataUri.length) {
            resolve(webpData);
            return;
          }
        } catch (e) {}

        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData.length < dataUri.length ? jpegData : dataUri);
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Push all local products, banners, orders, and users to Firebase RTDB
export async function syncAllToFirebaseRTDB(): Promise<boolean> {
  try {
    const prods = getStoredProducts();
    const bans = getStoredBanners();
    const ords = getStoredOrders();
    const usrs = getRegisteredUsers();

    // Map format for fast key-based syncing
    const prodMap: Record<string, Product> = {};
    prods.forEach(p => { if (p.id) prodMap[p.id] = p; });

    const banMap: Record<string, BannerSlide> = {};
    bans.forEach(b => { if (b.id) banMap[b.id] = b; });

    const ordMap: Record<string, Order> = {};
    ords.forEach(o => { if (o.id) ordMap[o.id] = o; });

    const usrMap: Record<string, UserProfile> = {};
    usrs.forEach(u => {
      const key = (u.uid || u.email || '').replace(/[\.\#\$\/\[\]]/g, '_');
      if (key) usrMap[key] = u;
    });

    await Promise.all([
      syncToFirebaseRTDBRest('products', prodMap),
      syncToFirebaseRTDBRest('banners', banMap),
      syncToFirebaseRTDBRest('orders', ordMap),
      syncToFirebaseRTDBRest('users', usrMap),
      syncToFirebaseRTDBRest('config/r2_public_domain', getR2PublicDomain())
    ]);
    return true;
  } catch (err) {
    console.error('Failed to sync all to RTDB:', err);
    return false;
  }
}

let isRtdbListening = false;

// Realtime Firebase RTDB Sync Listeners
export function initRealtimeFirebaseSync(): void {
  if (typeof window === 'undefined' || isRtdbListening) return;
  isRtdbListening = true;

  try {
    if (rtdb) {
      // 1. Live Products Listener from Firebase Realtime Database
      const productsRef = ref(rtdb, 'products');
      onValue(productsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const prodList: Product[] = Array.isArray(val) 
            ? val.filter(Boolean) 
            : Object.values(val);
          const cleanProds = sortProductsNewestFirst(deduplicateById<Product>(prodList).map(sanitizeProductForStorage));
          if (cleanProds.length > 0) {
            safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(cleanProds));
            window.dispatchEvent(new Event('neetmbbs_products_updated'));
          }
        }
      }, (err) => console.warn('Firebase RTDB products listener notice:', err));

      // 2. Live Orders Listener from Firebase Realtime Database
      const ordersRef = ref(rtdb, 'orders');
      onValue(ordersRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const orderList: Order[] = Array.isArray(val) 
            ? val.filter(Boolean) 
            : Object.values(val);
          const cleanOrders = sortOrdersNewestFirst(deduplicateById<Order>(orderList).map(sanitizeOrderForStorage));
          if (cleanOrders.length > 0) {
            safeSetLocalStorage(ORDERS_KEY, JSON.stringify(cleanOrders));
            window.dispatchEvent(new Event('neetmbbs_orders_updated'));
          }
        }
      }, (err) => console.warn('Firebase RTDB orders listener notice:', err));

      // 3. Live Banners Listener from Firebase Realtime Database
      const bannersRef = ref(rtdb, 'banners');
      onValue(bannersRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const bannerList: BannerSlide[] = Array.isArray(val) 
            ? val.filter(Boolean) 
            : Object.values(val);
          const cleanBanners = deduplicateById<BannerSlide>(bannerList);
          if (cleanBanners.length > 0) {
            safeSetLocalStorage(BANNERS_KEY, JSON.stringify(cleanBanners));
            window.dispatchEvent(new Event('neetmbbs_banners_updated'));
          }
        }
      }, (err) => console.warn('Firebase RTDB banners listener notice:', err));

      // 4. Live Support Messages Listener
      const supportRef = ref(rtdb, 'support');
      onValue(supportRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const msgList: SupportMessage[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          const cleanMsgs = deduplicateById<SupportMessage>(msgList);
          if (cleanMsgs.length > 0) {
            safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(cleanMsgs));
            window.dispatchEvent(new Event('neetmbbs_support_updated'));
          }
        }
      }, (err) => console.warn('Firebase RTDB support listener notice:', err));

      // 5. Live Registered Users Listener
      const usersRef = ref(rtdb, 'users');
      onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const userList: UserProfile[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val);
          const current = getRegisteredUsers();
          const cleanUsers = deduplicateUsers([...userList, ...current, ...INITIAL_REGISTERED_USERS]);
          if (cleanUsers.length > 0) {
            safeSetLocalStorage(USERS_KEY, JSON.stringify(cleanUsers));
            window.dispatchEvent(new Event('neetmbbs_users_updated'));
          }
        }
      }, (err) => console.warn('Firebase RTDB users listener notice:', err));

      // 6. Live R2 Public Domain Config Listener
      const r2DomainRef = ref(rtdb, 'config/r2_public_domain');
      onValue(r2DomainRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'string' && val.trim()) {
          const clean = val.trim().replace(/\/+$/, '');
          safeSetLocalStorage(R2_PUBLIC_DOMAIN_KEY, clean);
          window.dispatchEvent(new Event('neetmbbs_r2_config_updated'));
        }
      }, (err) => console.warn('Firebase RTDB R2 config listener notice:', err));

      // 7. Live Store Config Listener (Support emails, phones, social links)
      const storeConfigRef = ref(rtdb, 'config/store_settings');
      onValue(storeConfigRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const merged = { ...DEFAULT_STORE_CONFIG, ...val };
          safeSetLocalStorage(STORE_CONFIG_KEY, JSON.stringify(merged));
          window.dispatchEvent(new Event('neetmbbs_store_config_updated'));
        }
      }, (err) => console.warn('Firebase RTDB store config listener notice:', err));
    }
  } catch (err) {
    console.warn('Realtime database sync setup notice:', err);
  }
}

// Initial Cloud / Server / Firebase Sync Loader
export async function syncDataFromDatabase(): Promise<void> {
  try {
    initRealtimeFirebaseSync();

    // 0. Sync Cloudflare R2 Public Domain
    const remoteR2Domain = await fetchFromFirebaseRTDBRest('config/r2_public_domain');
    if (remoteR2Domain && typeof remoteR2Domain === 'string' && remoteR2Domain.trim()) {
      safeSetLocalStorage(R2_PUBLIC_DOMAIN_KEY, remoteR2Domain.trim().replace(/\/+$/, ''));
      window.dispatchEvent(new Event('neetmbbs_r2_config_updated'));
    }

    // 0.1 Sync Store Config from Firebase
    const remoteStoreConfig = await fetchFromFirebaseRTDBRest('config/store_settings');
    if (remoteStoreConfig && typeof remoteStoreConfig === 'object') {
      const merged = { ...DEFAULT_STORE_CONFIG, ...remoteStoreConfig };
      safeSetLocalStorage(STORE_CONFIG_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event('neetmbbs_store_config_updated'));
    }

    // 1. Direct fetch from Firebase Realtime Database (Primary source of truth for Netlify & everywhere)
    const remoteProducts = await fetchFromFirebaseRTDBRest('products');
    if (remoteProducts && (Array.isArray(remoteProducts) || typeof remoteProducts === 'object')) {
      const prodList: Product[] = Array.isArray(remoteProducts)
        ? remoteProducts.filter(Boolean)
        : Object.values(remoteProducts);
      const cleanProds = sortProductsNewestFirst(deduplicateById<Product>(prodList).map(sanitizeProductForStorage));
      if (cleanProds.length > 0) {
        safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(cleanProds));
        window.dispatchEvent(new Event('neetmbbs_products_updated'));
      }
    }

    const remoteBanners = await fetchFromFirebaseRTDBRest('banners');
    if (remoteBanners && (Array.isArray(remoteBanners) || typeof remoteBanners === 'object')) {
      const banList: BannerSlide[] = Array.isArray(remoteBanners)
        ? remoteBanners.filter(Boolean)
        : Object.values(remoteBanners);
      const cleanBanners = deduplicateById<BannerSlide>(banList);
      if (cleanBanners.length > 0) {
        safeSetLocalStorage(BANNERS_KEY, JSON.stringify(cleanBanners));
        window.dispatchEvent(new Event('neetmbbs_banners_updated'));
      }
    }

    const remoteOrders = await fetchFromFirebaseRTDBRest('orders');
    if (remoteOrders && (Array.isArray(remoteOrders) || typeof remoteOrders === 'object')) {
      const orderList: Order[] = Array.isArray(remoteOrders)
        ? remoteOrders.filter(Boolean)
        : Object.values(remoteOrders);
      const cleanOrders = sortOrdersNewestFirst(deduplicateById<Order>(orderList).map(sanitizeOrderForStorage));
      if (cleanOrders.length > 0) {
        safeSetLocalStorage(ORDERS_KEY, JSON.stringify(cleanOrders));
        window.dispatchEvent(new Event('neetmbbs_orders_updated'));
      }
    }

    const remoteUsers = await fetchFromFirebaseRTDBRest('users');
    if (remoteUsers && (Array.isArray(remoteUsers) || typeof remoteUsers === 'object')) {
      const userList: UserProfile[] = Array.isArray(remoteUsers)
        ? remoteUsers.filter(Boolean)
        : Object.values(remoteUsers);
      const current = getRegisteredUsers();
      const cleanUsers = deduplicateUsers([...userList, ...current, ...INITIAL_REGISTERED_USERS]);
      if (cleanUsers.length > 0) {
        safeSetLocalStorage(USERS_KEY, JSON.stringify(cleanUsers));
        window.dispatchEvent(new Event('neetmbbs_users_updated'));
      }
    }

    const remoteSupport = await fetchFromFirebaseRTDBRest('support');
    if (remoteSupport && (Array.isArray(remoteSupport) || typeof remoteSupport === 'object')) {
      const supList: SupportMessage[] = Array.isArray(remoteSupport)
        ? remoteSupport.filter(Boolean)
        : Object.values(remoteSupport);
      const cleanMsgs = deduplicateById<SupportMessage>(supList);
      if (cleanMsgs.length > 0) {
        safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(cleanMsgs));
        window.dispatchEvent(new Event('neetmbbs_support_updated'));
      }
    }

    // 2. Safely check Server DB / Cloudflare D1 if backend server is running
    const prodData = await safeJsonFetch('/api/db/products');
    if (prodData && prodData.success && Array.isArray(prodData.products) && prodData.products.length > 0) {
      const cleanProds = sortProductsNewestFirst(deduplicateById<Product>(prodData.products).map(sanitizeProductForStorage));
      safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(cleanProds));
      window.dispatchEvent(new Event('neetmbbs_products_updated'));
    }

    const ordData = await safeJsonFetch('/api/db/orders');
    if (ordData && ordData.success && Array.isArray(ordData.orders) && ordData.orders.length > 0) {
      const cleanOrders = sortOrdersNewestFirst(deduplicateById<Order>(ordData.orders).map(sanitizeOrderForStorage));
      safeSetLocalStorage(ORDERS_KEY, JSON.stringify(cleanOrders));
      window.dispatchEvent(new Event('neetmbbs_orders_updated'));
    }

    const userData = await safeJsonFetch('/api/db/users');
    if (userData && userData.success && Array.isArray(userData.users) && userData.users.length > 0) {
      const current = getRegisteredUsers();
      const cleanUsers = deduplicateUsers([...userData.users, ...current, ...INITIAL_REGISTERED_USERS]);
      safeSetLocalStorage(USERS_KEY, JSON.stringify(cleanUsers));
      window.dispatchEvent(new Event('neetmbbs_users_updated'));
    }

    const banData = await safeJsonFetch('/api/db/banners');
    if (banData && banData.success && Array.isArray(banData.banners) && banData.banners.length > 0) {
      const cleanBanners = deduplicateById<BannerSlide>(banData.banners);
      safeSetLocalStorage(BANNERS_KEY, JSON.stringify(cleanBanners));
      window.dispatchEvent(new Event('neetmbbs_banners_updated'));
    }

    const supData = await safeJsonFetch('/api/db/support');
    if (supData && supData.success && Array.isArray(supData.messages) && supData.messages.length > 0) {
      const cleanMsgs = deduplicateById<SupportMessage>(supData.messages);
      safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(cleanMsgs));
      window.dispatchEvent(new Event('neetmbbs_support_updated'));
    }
  } catch (err) {
    console.warn('Sync with database note:', err);
  }
}

// Auto-trigger sync on module load
if (typeof window !== 'undefined') {
  syncDataFromDatabase().catch(() => {});
}

export function sortProductsNewestFirst(prods: Product[]): Product[] {
  return [...prods].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
    if (numB !== numA) return numB - numA;
    return (b.id || '').localeCompare(a.id || '');
  });
}

export function sortOrdersNewestFirst(ordersList: Order[]): Order[] {
  return [...ordersList].sort((a, b) => {
    const timeA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
    const timeB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
    if (numB !== numA) return numB - numA;
    return (b.id || '').localeCompare(a.id || '');
  });
}

export const MY_DEVICE_ORDERS_KEY = 'neetmbbs_my_device_order_ids';

export function getMyDeviceOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_DEVICE_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function recordMyDeviceOrderId(orderId: string): void {
  try {
    const cleanId = orderId.trim();
    if (!cleanId) return;
    const current = getMyDeviceOrderIds();
    const updated = [cleanId, ...current.filter(id => id !== cleanId)];
    safeSetLocalStorage(MY_DEVICE_ORDERS_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {}
}

/**
 * Check if the active user or device has purchased a specific product (e.g. PDF)
 */
export function hasUserPurchasedProduct(
  productId: string, 
  user?: UserProfile | null, 
  orders?: Order[]
): boolean {
  if (!productId) return false;
  const cleanProdId = productId.trim().toLowerCase();
  const allOrders = (orders && orders.length > 0) ? orders : getStoredOrders();
  const deviceOrderIds = new Set(getMyDeviceOrderIds().map(id => id.trim().toLowerCase()));
  const userEmail = (user?.email || '').trim().toLowerCase();

  return allOrders.some(order => {
    const isDeviceOrder = order.id && (
      deviceOrderIds.has(order.id.toLowerCase()) || 
      deviceOrderIds.has(order.id.replace(/^ord-/, '').toLowerCase()) ||
      deviceOrderIds.has(order.id.replace(/^#/, '').toLowerCase())
    );
    const isUserOrder = userEmail && order.userEmail && order.userEmail.trim().toLowerCase() === userEmail;

    if (isDeviceOrder || isUserOrder) {
      return (order.items || []).some(item => 
        (item.productId && item.productId.trim().toLowerCase() === cleanProdId) ||
        ((item as any).id && String((item as any).id).trim().toLowerCase() === cleanProdId) ||
        (item.title && item.title.trim().toLowerCase() === cleanProdId)
      );
    }
    return false;
  });
}

// Products Storage
export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = sortProductsNewestFirst(
          deduplicateById<Product>(parsed).map(sanitizeProductForStorage)
        );
        // Self-heal localStorage if duplicates or unsorted
        if (clean.length !== parsed.length) {
          safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(clean));
        }
        return clean;
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading products from storage:', err);
    return [];
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    const clean = sortProductsNewestFirst(
      deduplicateById<Product>(products).map(sanitizeProductForStorage)
    );
    safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_products_updated'));
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

export function addProduct(product: Product): void {
  const prodWithDate: Product = {
    ...product,
    createdAt: product.createdAt || new Date().toISOString()
  };
  const current = getStoredProducts();
  const updated = sortProductsNewestFirst(
    deduplicateById<Product>([prodWithDate, ...current.filter(p => p.id !== prodWithDate.id)])
  );
  saveStoredProducts(updated);

  // 1. Direct REST Sync to Firebase Realtime Database
  syncToFirebaseRTDBRest(`products/${prodWithDate.id}`, prodWithDate);
  const prodMap: Record<string, Product> = {};
  updated.forEach(p => { if (p.id) prodMap[p.id] = p; });
  syncToFirebaseRTDBRest('products', prodMap);

  // 2. Sync to Server & Cloudflare D1 (if Express backend running)
  fetch('/api/db/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prodWithDate)
  }).catch(() => {});

  // 3. Sync via Firebase Realtime Database SDK
  try {
    if (rtdb && prodWithDate.id) {
      rtdbSet(ref(rtdb, `products/${prodWithDate.id}`), prodWithDate).catch(err =>
        console.warn('Firebase RTDB product add sync note:', err)
      );
    }
  } catch (rtdbErr) {
    console.warn('RTDB sync note:', rtdbErr);
  }
}

export function updateProduct(updatedProduct: Product): void {
  const current = getStoredProducts();
  const updated = current.map(p => p.id === updatedProduct.id ? updatedProduct : p);
  saveStoredProducts(updated);

  // 1. Direct REST Sync to Firebase Realtime Database
  syncToFirebaseRTDBRest(`products/${updatedProduct.id}`, updatedProduct);
  const prodMap: Record<string, Product> = {};
  updated.forEach(p => { if (p.id) prodMap[p.id] = p; });
  syncToFirebaseRTDBRest('products', prodMap);

  // 2. Sync to Server & Cloudflare D1
  fetch('/api/db/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedProduct)
  }).catch(() => {});

  // 3. Sync via Firebase Realtime Database SDK
  try {
    if (rtdb && updatedProduct.id) {
      rtdbSet(ref(rtdb, `products/${updatedProduct.id}`), updatedProduct).catch(err =>
        console.warn('Firebase RTDB product update sync note:', err)
      );
    }
  } catch (rtdbErr) {
    console.warn('RTDB sync note:', rtdbErr);
  }
}

export function deleteProduct(productId: string): void {
  const current = getStoredProducts();
  const updated = current.filter(p => p.id !== productId);
  saveStoredProducts(updated);

  // 1. Direct REST Sync to Firebase Realtime Database
  fetch(`${FIREBASE_RTDB_BASE}/products/${productId}.json`, { method: 'DELETE' }).catch(() => {});
  const prodMap: Record<string, Product> = {};
  updated.forEach(p => { if (p.id) prodMap[p.id] = p; });
  syncToFirebaseRTDBRest('products', prodMap);

  // 2. Sync to Server & Cloudflare D1
  fetch(`/api/db/products/${productId}`, {
    method: 'DELETE'
  }).catch(() => {});

  // 3. Sync via Firebase Realtime Database SDK
  try {
    if (rtdb && productId) {
      rtdbRemove(ref(rtdb, `products/${productId}`)).catch(err =>
        console.warn('Firebase RTDB product delete sync note:', err)
      );
    }
  } catch (rtdbErr) {
    console.warn('RTDB delete note:', rtdbErr);
  }
}

// Banner Slides Storage
export function getStoredBanners(): BannerSlide[] {
  try {
    const raw = localStorage.getItem(BANNERS_KEY);
    if (!raw) {
      safeSetLocalStorage(BANNERS_KEY, JSON.stringify(DEFAULT_BANNERS));
      return DEFAULT_BANNERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const clean = deduplicateById<BannerSlide>(parsed);
      if (clean.length !== parsed.length) {
        safeSetLocalStorage(BANNERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return DEFAULT_BANNERS;
  } catch (err) {
    console.error('Error loading banners from storage:', err);
    return DEFAULT_BANNERS;
  }
}

export function saveStoredBanners(banners: BannerSlide[]): void {
  try {
    const clean = deduplicateById<BannerSlide>(banners);
    safeSetLocalStorage(BANNERS_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_banners_updated'));
  } catch (err) {
    console.error('Error saving banners:', err);
  }
}

export function addBanner(banner: BannerSlide): void {
  const current = getStoredBanners();
  const updated = deduplicateById<BannerSlide>([...current.filter(b => b.id !== banner.id), banner]);
  saveStoredBanners(updated);

  syncToFirebaseRTDBRest(`banners/${banner.id}`, banner);
  syncToFirebaseRTDBRest('banners', updated);

  fetch('/api/db/banners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(banner)
  }).catch(() => {});

  try {
    if (rtdb && banner.id) {
      rtdbSet(ref(rtdb, `banners/${banner.id}`), banner).catch(() => {});
    }
  } catch (e) {}
}

export function updateBanner(updatedBanner: BannerSlide): void {
  const current = getStoredBanners();
  const updated = deduplicateById<BannerSlide>(current.map(b => b.id === updatedBanner.id ? updatedBanner : b));
  saveStoredBanners(updated);

  syncToFirebaseRTDBRest(`banners/${updatedBanner.id}`, updatedBanner);
  syncToFirebaseRTDBRest('banners', updated);

  fetch('/api/db/banners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedBanner)
  }).catch(() => {});

  try {
    if (rtdb && updatedBanner.id) {
      rtdbSet(ref(rtdb, `banners/${updatedBanner.id}`), updatedBanner).catch(() => {});
    }
  } catch (e) {}
}

export function deleteBanner(bannerId: string): void {
  const current = getStoredBanners();
  const updated = deduplicateById<BannerSlide>(current.filter(b => b.id !== bannerId));
  saveStoredBanners(updated);

  syncToFirebaseRTDBRest('banners', updated);
  fetch(`${FIREBASE_RTDB_BASE}/banners/${bannerId}.json`, { method: 'DELETE' }).catch(() => {});

  fetch(`/api/db/banners/${bannerId}`, {
    method: 'DELETE'
  }).catch(() => {});

  try {
    if (rtdb && bannerId) {
      rtdbRemove(ref(rtdb, `banners/${bannerId}`)).catch(() => {});
    }
  } catch (e) {}
}

// Orders Storage
export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      const initial = sortOrdersNewestFirst(INITIAL_ORDERS.map(sanitizeOrderForStorage));
      safeSetLocalStorage(ORDERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = sortOrdersNewestFirst(
        deduplicateById<Order>(parsed).map(sanitizeOrderForStorage)
      );
      if (clean.length !== parsed.length) {
        safeSetLocalStorage(ORDERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return INITIAL_ORDERS;
  } catch (err) {
    console.error('Error loading orders from storage:', err);
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: Order[]): void {
  try {
    const clean = sortOrdersNewestFirst(
      deduplicateById<Order>(orders).map(sanitizeOrderForStorage)
    );
    safeSetLocalStorage(ORDERS_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_orders_updated'));
  } catch (err) {
    console.error('Error saving orders:', err);
  }
}

export function addOrder(order: Order): void {
  const orderWithDate: Order = {
    ...order,
    orderDate: order.orderDate || new Date().toISOString()
  };
  const sanitized = sanitizeOrderForStorage(orderWithDate);

  // Record this order ID for the current browser/device session
  if (sanitized.id) {
    recordMyDeviceOrderId(sanitized.id);
    recordMyDeviceOrderId(sanitized.id.replace(/^ORD-/, ''));
    recordMyDeviceOrderId(sanitized.id.replace(/^#/, ''));
  }

  const current = getStoredOrders();
  const updated = sortOrdersNewestFirst(
    deduplicateById<Order>([sanitized, ...current.filter(o => o.id !== sanitized.id)]).map(sanitizeOrderForStorage)
  );
  saveStoredOrders(updated);

  if (sanitized.userEmail) {
    updateUserOrderStats(sanitized.userEmail, sanitized.totalAmount);
  }

  // 1. Direct REST sync to Firebase Realtime Database
  syncToFirebaseRTDBRest(`orders/${sanitized.id}`, sanitized);
  syncToFirebaseRTDBRest('orders', updated);

  // 2. Sync to Express server (if running)
  fetch('/api/db/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
  }).catch(() => {});

  // 3. Sync to Firebase SDK
  try {
    if (rtdb && sanitized.id) {
      rtdbSet(ref(rtdb, `orders/${sanitized.id}`), sanitized).catch(e => console.warn(e));
    }
  } catch (e) {}
}

export function updateOrderStatus(orderId: string, status: Order['status'], notes?: string): void {
  const current = getStoredOrders();
  const updated = deduplicateById<Order>(current.map(o => {
    if (o.id === orderId) {
      const isDelivered = status === 'delivered';
      return {
        ...o,
        status,
        notes: notes !== undefined ? notes : o.notes,
        deliveredDate: isDelivered ? new Date().toISOString() : o.deliveredDate
      };
    }
    return o;
  })).map(sanitizeOrderForStorage);
  saveStoredOrders(updated);

  const ord = updated.find(o => o.id === orderId);
  if (ord) {
    syncToFirebaseRTDBRest(`orders/${orderId}`, ord);
  }
  syncToFirebaseRTDBRest('orders', updated);

  fetch(`/api/db/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  }).catch(() => {});

  try {
    if (rtdb && orderId) {
      if (ord) {
        rtdbSet(ref(rtdb, `orders/${orderId}`), ord).catch(e => console.warn(e));
      }
    }
  } catch (e) {}
}

export function deleteOrder(orderId: string): void {
  const cleanId = orderId.trim();
  const current = getStoredOrders();
  const updated = current.filter(o => o.id !== cleanId && o.id !== `ORD-${cleanId}` && o.id !== cleanId.replace(/^ORD-/, ''));
  saveStoredOrders(updated);

  // 1. Direct REST sync to Firebase Realtime Database
  fetch(`${FIREBASE_RTDB_BASE}/orders/${cleanId}.json`, { method: 'DELETE' }).catch(() => {});
  syncToFirebaseRTDBRest('orders', updated);

  // 2. Sync to Server & Cloudflare D1
  fetch(`/api/db/orders/${cleanId}`, {
    method: 'DELETE'
  }).catch(() => {});

  // 3. Sync to Firebase SDK
  try {
    if (rtdb && cleanId) {
      rtdbRemove(ref(rtdb, `orders/${cleanId}`)).catch(e => console.warn(e));
    }
  } catch (e) {}
}

export function deleteMultipleOrders(orderIds: string[]): void {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return;
  const idSet = new Set(orderIds.map(id => id.trim()));
  const current = getStoredOrders();
  const updated = current.filter(o => !idSet.has(o.id) && !idSet.has(o.id.replace(/^ORD-/, '')) && !idSet.has(`ORD-${o.id}`));
  saveStoredOrders(updated);

  // 1. Sync to Firebase RTDB
  syncToFirebaseRTDBRest('orders', updated);
  for (const id of orderIds) {
    fetch(`${FIREBASE_RTDB_BASE}/orders/${id}.json`, { method: 'DELETE' }).catch(() => {});
  }

  // 2. Sync to Server & Cloudflare D1
  fetch('/api/db/orders/batch-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: orderIds })
  }).catch(() => {});

  // 3. Sync to Firebase SDK
  try {
    if (rtdb) {
      for (const id of orderIds) {
        rtdbRemove(ref(rtdb, `orders/${id}`)).catch(() => {});
      }
    }
  } catch (e) {}
}

// Registered Users Storage
export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      safeSetLocalStorage(USERS_KEY, JSON.stringify(INITIAL_REGISTERED_USERS));
      return INITIAL_REGISTERED_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = deduplicateUsers(parsed);
      if (clean.length !== parsed.length) {
        safeSetLocalStorage(USERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return INITIAL_REGISTERED_USERS;
  } catch (err) {
    console.error('Error loading registered users:', err);
    return INITIAL_REGISTERED_USERS;
  }
}

export function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    const clean = deduplicateUsers(users);
    safeSetLocalStorage(USERS_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_users_updated'));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

export function getCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function saveCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      safeSetLocalStorage(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new Event('neetmbbs_current_user_updated'));
  } catch (err) {
    console.error('Error saving current user session:', err);
  }
}

export function registerNewUser(user: UserProfile): void {
  const current = getRegisteredUsers();
  const exists = current.some(u => u.email.toLowerCase() === user.email.toLowerCase());
  let updated = current;
  if (!exists) {
    updated = deduplicateUsers([user, ...current]);
  } else {
    updated = deduplicateUsers(current.map(u => u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, ...user } : u));
  }
  saveRegisteredUsers(updated);

  // Also save active session
  saveCurrentUser(user);

  // 1. Direct REST Sync to Firebase Realtime Database
  const userKey = (user.uid || user.email).replace(/[\.\#\$\/\[\]]/g, '_');
  syncToFirebaseRTDBRest(`users/${userKey}`, user);
  const usrMap: Record<string, UserProfile> = {};
  updated.forEach(u => {
    const k = (u.uid || u.email).replace(/[\.\#\$\/\[\]]/g, '_');
    if (k) usrMap[k] = u;
  });
  syncToFirebaseRTDBRest('users', usrMap);

  // 2. Sync to Express Server / D1
  fetch('/api/db/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  }).catch(e => console.warn(e));

  // 3. Sync to Firebase SDK
  try {
    if (rtdb) {
      rtdbSet(ref(rtdb, `users/${userKey}`), user).catch(() => {});
    }
  } catch (e) {}
}

export function updateUserProfile(updatedUser: Partial<UserProfile> & { email: string }): void {
  const current = getRegisteredUsers();
  const updated = deduplicateUsers(current.map(u => {
    if (u.email.toLowerCase() === updatedUser.email.toLowerCase()) {
      return { ...u, ...updatedUser };
    }
    return u;
  }));
  saveRegisteredUsers(updated);

  // If active user is being updated, sync active session
  const activeUser = getCurrentUser();
  if (activeUser && activeUser.email.toLowerCase() === updatedUser.email.toLowerCase()) {
    saveCurrentUser({ ...activeUser, ...updatedUser });
  }

  // 1. Sync to Firebase RTDB
  const userKey = (updatedUser.uid || updatedUser.email).replace(/[\.\#\$\/\[\]]/g, '_');
  const targetUser = updated.find(u => u.email.toLowerCase() === updatedUser.email.toLowerCase());
  if (targetUser) {
    syncToFirebaseRTDBRest(`users/${userKey}`, targetUser);
    try {
      if (rtdb) {
        rtdbSet(ref(rtdb, `users/${userKey}`), targetUser).catch(() => {});
      }
    } catch (e) {}
  }
  const usrMap: Record<string, UserProfile> = {};
  updated.forEach(u => {
    const k = (u.uid || u.email).replace(/[\.\#\$\/\[\]]/g, '_');
    if (k) usrMap[k] = u;
  });
  syncToFirebaseRTDBRest('users', usrMap);

  // 2. Sync to Express Server / D1
  fetch('/api/db/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedUser)
  }).catch(e => console.warn(e));
}

export function isEmailRegistered(email: string): boolean {
  const current = getRegisteredUsers();
  return current.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

export function updateUserOrderStats(email: string, amount: number): void {
  const current = getRegisteredUsers();
  const updated = deduplicateUsers(current.map(u => {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return {
        ...u,
        totalOrders: (u.totalOrders || 0) + 1,
        totalSpent: (u.totalSpent || 0) + amount
      };
    }
    return u;
  }));
  saveRegisteredUsers(updated);

  const matched = updated.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (matched) {
    const userKey = (matched.uid || matched.email).replace(/[\.\#\$\/\[\]]/g, '_');
    syncToFirebaseRTDBRest(`users/${userKey}`, matched);
    fetch('/api/db/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matched)
    }).catch(() => {});
  }
}

// Cart Storage
export function getStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredCart(cart: CartItem[]): void {
  try {
    safeSetLocalStorage(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('neetmbbs_cart_updated'));
  } catch (err) {}
}

// Wishlist Storage
export function getStoredWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredWishlist(wishlist: string[]): void {
  try {
    const clean = Array.from(new Set(wishlist));
    safeSetLocalStorage(WISHLIST_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_wishlist_updated'));
  } catch (err) {}
}

// Support Messages Storage
export function getStoredSupportMessages(): SupportMessage[] {
  try {
    const raw = localStorage.getItem(SUPPORT_KEY);
    if (!raw) {
      const initial: SupportMessage[] = [
        {
          id: 'MSG-101',
          name: 'Aarav Sharma',
          email: 'aarav.neet2026@gmail.com',
          phone: '9876543210',
          subject: 'Delivery Timeline Query',
          message: 'Hello, when will my Biology Mindmap physical handbook arrive in Delhi?',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          status: 'unread'
        }
      ];
      safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = deduplicateById<SupportMessage>(parsed);
      if (clean.length !== parsed.length) {
        safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export function saveStoredSupportMessages(messages: SupportMessage[]): void {
  try {
    const clean = deduplicateById<SupportMessage>(messages);
    safeSetLocalStorage(SUPPORT_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('neetmbbs_support_updated'));
  } catch (err) {
    console.error('Error saving support messages:', err);
  }
}

export function addSupportMessage(msg: SupportMessage): void {
  const current = getStoredSupportMessages();
  const updated = deduplicateById<SupportMessage>([msg, ...current.filter(m => m.id !== msg.id)]);
  saveStoredSupportMessages(updated);

  // 1. Direct REST sync to Firebase Realtime Database
  const cleanId = (msg.id || `MSG-${Date.now()}`).replace(/[\.\#\$\/\[\]]/g, '_');
  syncToFirebaseRTDBRest(`support/${cleanId}`, msg);
  syncToFirebaseRTDBRest('support', updated);

  // 2. Server API & Cloudflare D1
  fetch('/api/db/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  }).catch(e => console.warn(e));

  // 3. Realtime SDK write
  try {
    if (rtdb && cleanId) {
      rtdbSet(ref(rtdb, `support/${cleanId}`), msg).catch(e => console.warn(e));
    }
  } catch (e) {}
}

export function deleteSupportMessage(id: string): void {
  const current = getStoredSupportMessages();
  const cleanId = (id || '').replace(/[\.\#\$\/\[\]]/g, '_');
  const updated = deduplicateById<SupportMessage>(current.filter(m => m.id !== id && m.id !== cleanId));
  saveStoredSupportMessages(updated);

  // 1. Direct REST sync to Firebase Realtime Database
  fetch(`${FIREBASE_RTDB_BASE}/support/${cleanId}.json`, { method: 'DELETE' }).catch(() => {});
  syncToFirebaseRTDBRest('support', updated);

  // 2. Server API & Cloudflare D1
  fetch(`/api/db/support/${cleanId}`, {
    method: 'DELETE'
  }).catch(e => console.warn(e));

  // 3. Realtime SDK delete if initialized
  try {
    if (rtdb && cleanId) {
      rtdbRemove(ref(rtdb, `support/${cleanId}`)).catch(() => {});
    }
  } catch (e) {}
}

export function updateSupportMessageStatus(id: string, status: 'unread' | 'read' | 'replied'): void {
  const current = getStoredSupportMessages();
  const cleanId = (id || '').replace(/[\.\#\$\/\[\]]/g, '_');
  const updated = deduplicateById<SupportMessage>(current.map(m => m.id === id ? { ...m, status } : m));
  saveStoredSupportMessages(updated);

  const matched = updated.find(m => m.id === id);
  if (matched) {
    syncToFirebaseRTDBRest(`support/${cleanId}`, matched);
    try {
      if (rtdb && cleanId) {
        rtdbSet(ref(rtdb, `support/${cleanId}`), matched).catch(e => console.warn(e));
      }
    } catch (e) {}
  }
  syncToFirebaseRTDBRest('support', updated);

  fetch(`/api/db/support/${cleanId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).catch(e => console.warn(e));
}

// ---------------------------------------------------------------------------
// DYNAMIC STORE CONFIGURATION & SUPPORT CONTACTS
// ---------------------------------------------------------------------------
export const STORE_CONFIG_KEY = 'neetmbbs_store_config_v2';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: 'NEETMBBS DOCTORS STORE',
  tagline: 'Your Trusted Store for NEET Preparation',
  supportEmails: ['fdar77551@gmail.com', 'shahzaibhusain6@gmail.com'],
  supportPhones: ['+91 6005894110', '+91 6397462104'],
  whatsappNumber: '+916005894110',
  whatsappUrl: 'https://wa.me/916005894110',
  telegramUsername: '@neetmbbsdoctors',
  telegramLink: 'https://t.me/neetmbbsdoctors',
  telegramUrl: 'https://t.me/neetmbbsdoctors',
  instagramUrl: 'https://instagram.com/neetmbbsdoctors',
  youtubeUrl: 'https://youtube.com/@neetmbbsdoctors',
  hardcopyCardImage: '',
  softcopyCardImage: '',
  websiteUrl: 'www.neetmbbsdoctors.store',
  companyLegalName: 'NEETMBBS DOCTORS STORE PRIVATE LIMITED',
  gstin: '01AABCN9876Q1Z5',
  storeAddress: 'Srinagar, Jammu & Kashmir - 190001, India'
};

export function getStoredStoreConfig(): StoreConfig {
  try {
    const raw = localStorage.getItem(STORE_CONFIG_KEY);
    if (!raw) {
      safeSetLocalStorage(STORE_CONFIG_KEY, JSON.stringify(DEFAULT_STORE_CONFIG));
      return DEFAULT_STORE_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STORE_CONFIG, ...parsed };
  } catch (err) {
    return DEFAULT_STORE_CONFIG;
  }
}

export function saveStoredStoreConfig(config: StoreConfig): void {
  try {
    const merged = { ...DEFAULT_STORE_CONFIG, ...config };
    safeSetLocalStorage(STORE_CONFIG_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('neetmbbs_store_config_updated'));

    // 1. Direct REST sync to Firebase Realtime Database
    syncToFirebaseRTDBRest('config/store_settings', merged);

    // 2. Server API & Cloudflare D1
    fetch('/api/db/store-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    }).catch(e => console.warn(e));

    // 3. Realtime SDK
    try {
      if (rtdb) {
        rtdbSet(ref(rtdb, 'config/store_settings'), merged).catch(() => {});
      }
    } catch (e) {}
  } catch (err) {
    console.error('Error saving store config:', err);
  }
}

// ---------------------------------------------------------------------------
// CLEAN SEQUENTIAL ORDER ID & INVOICE NUMBER GENERATORS
// Format: NMD-YYYYMMDD-0001, NMD-YYYYMMDD-0002, etc.
// ---------------------------------------------------------------------------
export function generateNextOrderId(): string {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`; // e.g. 20260823

    const allOrders = getStoredOrders();
    let maxSequence = 0;

    allOrders.forEach(o => {
      const orderId = (o.id || '').trim();
      // Match pattern NMD-YYYYMMDD-XXXX or NMD-XXXXXXXX-XXXX
      const match = orderId.match(/^NMD-(\d{8})-(\d{4,6})$/i);
      if (match) {
        const orderDateStr = match[1];
        const seqNum = parseInt(match[2], 10);
        if (orderDateStr === datePrefix && !isNaN(seqNum) && seqNum > maxSequence) {
          maxSequence = seqNum;
        }
      } else {
        // Also check any 4-digit trailing number in generic order IDs for today
        const genericMatch = orderId.match(/-(\d{4})$/);
        if (genericMatch) {
          const num = parseInt(genericMatch[1], 10);
          if (!isNaN(num) && num > maxSequence && num < 9000) {
            maxSequence = Math.max(maxSequence, num);
          }
        }
      }
    });

    const nextSeq = maxSequence + 1;
    const formattedSeq = String(nextSeq).padStart(4, '0');
    return `NMD-${datePrefix}-${formattedSeq}`;
  } catch (err) {
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `NMD-${dateStr}-${fallbackSeq}`;
  }
}

export function generateNextInvoiceNumber(orderId?: string): string {
  if (orderId && orderId.startsWith('NMD-')) {
    return orderId.replace(/^NMD-/, 'INV-');
  }
  const nextId = generateNextOrderId();
  return nextId.replace(/^NMD-/, 'INV-');
}


