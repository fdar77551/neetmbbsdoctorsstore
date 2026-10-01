import { 
  Product, 
  Order, 
  UserProfile, 
  CartItem, 
  BannerSlide, 
  SupportMessage, 
  StoreConfig,
  UserNeetPass,
  DownloadHistoryItem,
  CloudflareR2Config
} from '../types';
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

const DELETED_ORDERS_KEY = 'neetmbbs_deleted_orders_v1';
const DELETED_PRODUCTS_KEY = 'neetmbbs_deleted_products_v1';
const DELETED_BANNERS_KEY = 'neetmbbs_deleted_banners_v1';

export function getDeletedOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ORDERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set<string>();
}

export function markOrderDeleted(orderId: string): void {
  try {
    const cleanId = orderId.trim();
    const set = getDeletedOrderIds();
    set.add(cleanId);
    set.add(cleanId.replace(/^ORD-/, ''));
    set.add(`ORD-${cleanId.replace(/^ORD-/, '')}`);
    localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set<string>();
}

export function markProductDeleted(productId: string): void {
  try {
    const cleanId = productId.trim();
    const set = getDeletedProductIds();
    set.add(cleanId);
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function getDeletedBannerIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_BANNERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set<string>();
}

export function markBannerDeleted(bannerId: string): void {
  try {
    const cleanId = bannerId.trim();
    const set = getDeletedBannerIds();
    set.add(cleanId);
    localStorage.setItem(DELETED_BANNERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

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

    try {
      const cfRaw = localStorage.getItem(CLOUDFLARE_CONFIG_KEY);
      if (cfRaw) {
        const cfParsed = JSON.parse(cfRaw);
        const needsUpdate = !cfParsed.publicDevUrl || 
          cfParsed.publicDevUrl.includes('pub-8faec') || 
          !cfParsed.secretAccessKey || 
          cfParsed.secretAccessKey.length !== 64 ||
          cfParsed.storageMode === 'direct_r2' ||
          !cfParsed.storageMode;

        if (needsUpdate) {
          safeSetLocalStorage(CLOUDFLARE_CONFIG_KEY, JSON.stringify({
            ...DEFAULT_CLOUDFLARE_CONFIG,
            ...cfParsed,
            publicDevUrl: DEFAULT_CLOUDFLARE_CONFIG.publicDevUrl,
            secretAccessKey: DEFAULT_CLOUDFLARE_CONFIG.secretAccessKey,
            accessKeyId: DEFAULT_CLOUDFLARE_CONFIG.accessKeyId,
            accountId: DEFAULT_CLOUDFLARE_CONFIG.accountId,
            bucketName: DEFAULT_CLOUDFLARE_CONFIG.bucketName,
            storageMode: (cfParsed.customCdnDomain && cfParsed.customCdnDomain.trim()) ? 'custom_cdn' : 'proxy'
          }));
        }
      } else {
        safeSetLocalStorage(CLOUDFLARE_CONFIG_KEY, JSON.stringify(DEFAULT_CLOUDFLARE_CONFIG));
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

// Cloudflare R2 Full Configuration Constants & Storage Keys
export const CLOUDFLARE_CONFIG_KEY = 'neetmbbs_cloudflare_r2_config_v1';
export const DEFAULT_R2_PUBLIC_DOMAIN = "https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev";

export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareR2Config = {
  accountId: "d715d090a75efd8790b9a6da1e2f42d4",
  bucketName: "ncertify",
  accessKeyId: "887e302ecc7e249de5f16198ddfb7bd4",
  secretAccessKey: "20ddb02f48c59b9e1ae64dd1a164290e63396632633f0b49e2b5f310ba7fb79e", // 64-char hex
  s3Endpoint: "https://d715d090a75efd8790b9a6da1e2f42d4.r2.cloudflarestorage.com",
  publicDevUrl: "https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev",
  customCdnDomain: "",
  storageMode: "proxy" // 'proxy' serves through Express backend with S3 credentials (solves CORS & Jio/Airtel blocking)
};

export function getStoredCloudflareConfig(): CloudflareR2Config {
  try {
    const raw = localStorage.getItem(CLOUDFLARE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isBadPubDev = !parsed.publicDevUrl || parsed.publicDevUrl.includes('pub-8faec');
      return {
        ...DEFAULT_CLOUDFLARE_CONFIG,
        ...parsed,
        accountId: (parsed.accountId && parsed.accountId.length === 32) ? parsed.accountId : DEFAULT_CLOUDFLARE_CONFIG.accountId,
        bucketName: (parsed.bucketName && parsed.bucketName.trim()) ? parsed.bucketName.trim() : DEFAULT_CLOUDFLARE_CONFIG.bucketName,
        accessKeyId: (parsed.accessKeyId && parsed.accessKeyId.length === 32) ? parsed.accessKeyId : DEFAULT_CLOUDFLARE_CONFIG.accessKeyId,
        secretAccessKey: (parsed.secretAccessKey && parsed.secretAccessKey.length === 64) ? parsed.secretAccessKey : DEFAULT_CLOUDFLARE_CONFIG.secretAccessKey,
        s3Endpoint: parsed.s3Endpoint || DEFAULT_CLOUDFLARE_CONFIG.s3Endpoint,
        publicDevUrl: isBadPubDev ? DEFAULT_CLOUDFLARE_CONFIG.publicDevUrl : parsed.publicDevUrl,
        storageMode: parsed.storageMode || DEFAULT_CLOUDFLARE_CONFIG.storageMode
      };
    }
  } catch (e) {}
  return { ...DEFAULT_CLOUDFLARE_CONFIG };
}

export function saveStoredCloudflareConfig(cfg: Partial<CloudflareR2Config>): void {
  try {
    const current = getStoredCloudflareConfig();
    const updated: CloudflareR2Config = {
      ...current,
      ...cfg
    };
    safeSetLocalStorage(CLOUDFLARE_CONFIG_KEY, JSON.stringify(updated));
    if (updated.customCdnDomain) {
      safeSetLocalStorage(R2_PUBLIC_DOMAIN_KEY, updated.customCdnDomain);
    } else if (updated.publicDevUrl) {
      safeSetLocalStorage(R2_PUBLIC_DOMAIN_KEY, updated.publicDevUrl);
    }
    window.dispatchEvent(new Event('neetmbbs_r2_config_updated'));

    // Sync to backend server
    if (typeof fetch !== 'undefined') {
      fetch('/api/cloudflare/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    }

    // Sync to Firebase RTDB
    syncToFirebaseRTDBRest('config/cloudflare_r2', updated);
  } catch (e) {
    console.error('Error saving Cloudflare R2 config:', e);
  }
}

export function getR2PublicDomain(): string {
  try {
    const cf = getStoredCloudflareConfig();
    if (cf.customCdnDomain && cf.customCdnDomain.trim()) {
      return cf.customCdnDomain.trim().replace(/\/+$/, '');
    }
    const runtimeConfig = typeof window !== 'undefined' ? (window as any).__NEETMBBS_RUNTIME_CONFIG__ : undefined;
    if (runtimeConfig?.R2_PUBLIC_DOMAIN && typeof runtimeConfig.R2_PUBLIC_DOMAIN === 'string' && runtimeConfig.R2_PUBLIC_DOMAIN.trim()) {
      return runtimeConfig.R2_PUBLIC_DOMAIN.trim().replace(/\/+$/, '');
    }
    const envDomain = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN;
    if (envDomain && typeof envDomain === 'string' && envDomain.trim()) {
      return envDomain.trim().replace(/\/+$/, '');
    }
    const custom = localStorage.getItem(R2_PUBLIC_DOMAIN_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    if (cf.publicDevUrl && cf.publicDevUrl.trim()) {
      return cf.publicDevUrl.trim().replace(/\/+$/, '');
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
    saveStoredCloudflareConfig({ customCdnDomain: clean });
  } catch (e) {
    console.error('Error saving R2 public domain:', e);
  }
}

// Universal Image and Asset URL resolver for Cloudflare R2, Base64, and Web CDNs
export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Data URLs (base64) & Blobs are self-contained
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const cfConfig = getStoredCloudflareConfig();
  const customCdn = cfConfig.customCdnDomain ? cfConfig.customCdnDomain.trim().replace(/\/+$/, '') : '';
  const isDirectMode = cfConfig.storageMode === 'direct_r2';

  // 2. Extract clean key if it's already an R2 URL or internal proxy URL
  let cleanKey = '';
  if (trimmed.startsWith('/api/r2/file/')) {
    cleanKey = trimmed.replace('/api/r2/file/', '');
  } else if (trimmed.startsWith('api/r2/file/')) {
    cleanKey = trimmed.replace('api/r2/file/', '');
  } else if (trimmed.includes('.r2.dev/')) {
    cleanKey = trimmed.split('.r2.dev/')[1] || '';
  } else if (trimmed.includes('.r2.cloudflarestorage.com/')) {
    const afterHost = trimmed.split('.r2.cloudflarestorage.com/')[1] || '';
    const parts = afterHost.split('/');
    cleanKey = (parts.length > 1 && (parts[0] === 'ncertify' || parts[0] === 'bucket')) 
      ? parts.slice(1).join('/') 
      : afterHost;
  }

  if (cleanKey) {
    cleanKey = cleanKey.replace(/^\/+/, '');
    // If Custom CDN domain configured (e.g. cdn.neetmbbsdoctors.store), prefer it
    if (customCdn) {
      return `${customCdn}/${cleanKey}`;
    }
    // If user explicitly chose direct R2.dev
    if (isDirectMode) {
      const pubDev = cfConfig.publicDevUrl || DEFAULT_R2_PUBLIC_DOMAIN;
      return `${pubDev.replace(/\/+$/, '')}/${cleanKey}`;
    }
    // Default smart proxy: always reliable, resolves ISP/CORS/iframe issues on mobile & Jio/Airtel
    return `/api/r2/file/${cleanKey}`;
  }

  // 3. Absolute External URL (Unsplash, external CDNs, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 4. Relative bare key (e.g. "book-covers/xxx.png")
  const bareKey = trimmed.replace(/^\/+/, '');
  if (customCdn) {
    return `${customCdn}/${bareKey}`;
  }
  if (isDirectMode) {
    const pubDev = cfConfig.publicDevUrl || DEFAULT_R2_PUBLIC_DOMAIN;
    return `${pubDev.replace(/\/+$/, '')}/${bareKey}`;
  }
  return `/api/r2/file/${bareKey}`;
}

// Dedicated PDF Direct Download URL resolver for Cloudflare R2
export function resolvePdfUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  const cfConfig = getStoredCloudflareConfig();
  const customCdn = cfConfig.customCdnDomain ? cfConfig.customCdnDomain.trim().replace(/\/+$/, '') : '';
  const isDirectMode = cfConfig.storageMode === 'direct_r2';

  let cleanKey = '';
  if (trimmed.startsWith('/api/r2/file/')) {
    cleanKey = trimmed.replace('/api/r2/file/', '');
  } else if (trimmed.startsWith('/api/pdf/download/')) {
    cleanKey = trimmed.replace('/api/pdf/download/', '');
  } else if (trimmed.includes('.r2.dev/')) {
    cleanKey = trimmed.split('.r2.dev/')[1] || '';
  } else if (trimmed.includes('.r2.cloudflarestorage.com/')) {
    const afterHost = trimmed.split('.r2.cloudflarestorage.com/')[1] || '';
    const parts = afterHost.split('/');
    cleanKey = (parts.length > 1 && (parts[0] === 'ncertify' || parts[0] === 'bucket')) 
      ? parts.slice(1).join('/') 
      : afterHost;
  }

  if (cleanKey) {
    cleanKey = cleanKey.replace(/^\/+/, '');
    if (customCdn) return `${customCdn}/${cleanKey}`;
    if (isDirectMode) {
      const pubDev = cfConfig.publicDevUrl || DEFAULT_R2_PUBLIC_DOMAIN;
      return `${pubDev.replace(/\/+$/, '')}/${cleanKey}`;
    }
    return `/api/r2/file/${cleanKey}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const bareKey = trimmed.replace(/^\/+/, '');
  if (customCdn) return `${customCdn}/${bareKey}`;
  if (isDirectMode) {
    const pubDev = cfConfig.publicDevUrl || DEFAULT_R2_PUBLIC_DOMAIN;
    return `${pubDev.replace(/\/+$/, '')}/${bareKey}`;
  }
  return `/api/r2/file/${bareKey}`;
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
          const deletedProds = getDeletedProductIds();
          const prodList: Product[] = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val))
            .filter(p => p && p.id && !deletedProds.has(p.id));
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
          const deletedOrders = getDeletedOrderIds();
          const orderList: Order[] = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val))
            .filter(o => o && o.id && !deletedOrders.has(o.id) && !deletedOrders.has(o.id.replace(/^ORD-/, '')) && !deletedOrders.has(`ORD-${o.id}`));
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
          const deletedBanners = getDeletedBannerIds();
          const bannerList: BannerSlide[] = (Array.isArray(val) ? val.filter(Boolean) : Object.values(val))
            .filter(b => b && b.id && !deletedBanners.has(b.id));
          const currentBanners = getStoredBanners().filter(b => b && b.id && !deletedBanners.has(b.id));
          const cleanBanners = deduplicateById<BannerSlide>([...currentBanners, ...bannerList]);
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

      // 8. Live NEET Full Course Config Listener (Persistent Realtime Sync)
      const fullCourseRef = ref(rtdb, 'config/full_course_config');
      onValue(fullCourseRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          safeSetLocalStorage('neetmbbs_full_course_config_v1', JSON.stringify(val));
          window.dispatchEvent(new CustomEvent('neetmbbs_course_config_updated', { detail: val }));
        }
      }, (err) => console.warn('Firebase RTDB full course listener notice:', err));

      // 9. Live Multi-Class Courses Listener (Class 6th, 7th, 8th, 9th, 10th, 11th, 12th, NEET)
      const coursesRef = ref(rtdb, 'config/courses');
      onValue(coursesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
          if (list.length > 0) {
            safeSetLocalStorage('neetmbbs_all_courses_list_v1', JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('neetmbbs_all_courses_updated', { detail: list }));
          }
        }
      }, (err) => console.warn('Firebase RTDB courses listener notice:', err));
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

    // 0.2 Sync NEET Full Course Config from Firebase RTDB
    const remoteFullCourse = await fetchFromFirebaseRTDBRest('config/full_course_config');
    if (remoteFullCourse && typeof remoteFullCourse === 'object') {
      safeSetLocalStorage('neetmbbs_full_course_config_v1', JSON.stringify(remoteFullCourse));
      window.dispatchEvent(new CustomEvent('neetmbbs_course_config_updated', { detail: remoteFullCourse }));
    }

    // 0.3 Sync All Multi-Class Courses (Class 6th to 12th + NEET) from Firebase RTDB
    const remoteCourses = await fetchFromFirebaseRTDBRest('config/courses');
    if (remoteCourses && (Array.isArray(remoteCourses) || typeof remoteCourses === 'object')) {
      const list = Array.isArray(remoteCourses) ? remoteCourses.filter(Boolean) : Object.values(remoteCourses);
      if (list.length > 0) {
        safeSetLocalStorage('neetmbbs_all_courses_list_v1', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('neetmbbs_all_courses_updated', { detail: list }));
      }
    }

    // 1. Direct fetch from Firebase Realtime Database (Primary source of truth for Netlify & everywhere)
    const remoteProducts = await fetchFromFirebaseRTDBRest('products');
    if (remoteProducts && (Array.isArray(remoteProducts) || typeof remoteProducts === 'object')) {
      const deletedProds = getDeletedProductIds();
      const prodList: Product[] = (Array.isArray(remoteProducts) ? remoteProducts.filter(Boolean) : Object.values(remoteProducts))
        .filter(p => p && p.id && !deletedProds.has(p.id));
      const cleanProds = sortProductsNewestFirst(deduplicateById<Product>(prodList).map(sanitizeProductForStorage));
      if (cleanProds.length > 0) {
        safeSetLocalStorage(PRODUCTS_KEY, JSON.stringify(cleanProds));
        window.dispatchEvent(new Event('neetmbbs_products_updated'));
      }
    }

    const remoteBanners = await fetchFromFirebaseRTDBRest('banners');
    if (remoteBanners && (Array.isArray(remoteBanners) || typeof remoteBanners === 'object')) {
      const deletedBanners = getDeletedBannerIds();
      const banList: BannerSlide[] = (Array.isArray(remoteBanners) ? remoteBanners.filter(Boolean) : Object.values(remoteBanners))
        .filter(b => b && b.id && !deletedBanners.has(b.id));
      const currentBanners = getStoredBanners().filter(b => b && b.id && !deletedBanners.has(b.id));
      const cleanBanners = deduplicateById<BannerSlide>([...currentBanners, ...banList]);
      if (cleanBanners.length > 0) {
        safeSetLocalStorage(BANNERS_KEY, JSON.stringify(cleanBanners));
        window.dispatchEvent(new Event('neetmbbs_banners_updated'));
      }
    }

    const remoteOrders = await fetchFromFirebaseRTDBRest('orders');
    if (remoteOrders && (Array.isArray(remoteOrders) || typeof remoteOrders === 'object')) {
      const deletedOrders = getDeletedOrderIds();
      const orderList: Order[] = (Array.isArray(remoteOrders) ? remoteOrders.filter(Boolean) : Object.values(remoteOrders))
        .filter(o => o && o.id && !deletedOrders.has(o.id) && !deletedOrders.has(o.id.replace(/^ORD-/, '')) && !deletedOrders.has(`ORD-${o.id}`));
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
    const deletedProds = getDeletedProductIds();
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = sortProductsNewestFirst(
          deduplicateById<Product>(parsed)
            .filter(p => p && p.id && !deletedProds.has(p.id))
            .map(sanitizeProductForStorage)
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
    const deletedProds = getDeletedProductIds();
    const clean = sortProductsNewestFirst(
      deduplicateById<Product>(products)
        .filter(p => p && p.id && !deletedProds.has(p.id))
        .map(sanitizeProductForStorage)
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
  const cleanId = productId.trim();
  markProductDeleted(cleanId);
  const current = getStoredProducts();
  const updated = current.filter(p => p.id !== cleanId);
  saveStoredProducts(updated);

  // Clean up user purchases and download records associated with this deleted PDF
  try {
    const rawPurchases = localStorage.getItem('neetmbbs_purchased_pdfs_v2');
    if (rawPurchases) {
      const parsed = JSON.parse(rawPurchases);
      if (Array.isArray(parsed)) {
        const cleanedPurchases = parsed.filter(p => (p.id || p.productId) !== cleanId);
        localStorage.setItem('neetmbbs_purchased_pdfs_v2', JSON.stringify(cleanedPurchases));
        window.dispatchEvent(new Event('neetmbbs_purchases_updated'));
      }
    }
  } catch (e) {}

  try {
    const rawDownloads = localStorage.getItem('neetmbbs_download_history_v1');
    if (rawDownloads) {
      const parsed = JSON.parse(rawDownloads);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((d: any) => d.productId !== cleanId);
        localStorage.setItem('neetmbbs_download_history_v1', JSON.stringify(cleaned));
      }
    }
  } catch (e) {}

  // 1. Direct REST Sync to Firebase Realtime Database
  fetch(`${FIREBASE_RTDB_BASE}/products/${cleanId}.json`, { method: 'DELETE' }).catch(() => {});
  const prodMap: Record<string, Product> = {};
  updated.forEach(p => { if (p.id) prodMap[p.id] = p; });
  syncToFirebaseRTDBRest('products', prodMap);

  // 2. Sync to Server & Cloudflare D1
  fetch(`/api/db/products/${cleanId}`, {
    method: 'DELETE'
  }).catch(() => {});

  // 3. Sync via Firebase Realtime Database SDK
  try {
    if (rtdb && cleanId) {
      rtdbRemove(ref(rtdb, `products/${cleanId}`)).catch(err =>
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
    const deletedBanners = getDeletedBannerIds();
    if (!raw) {
      const initBanners = DEFAULT_BANNERS.filter(b => !deletedBanners.has(b.id));
      safeSetLocalStorage(BANNERS_KEY, JSON.stringify(initBanners));
      return initBanners;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const clean = deduplicateById<BannerSlide>(parsed).filter(b => b && b.id && !deletedBanners.has(b.id));
      if (clean.length !== parsed.length) {
        safeSetLocalStorage(BANNERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return DEFAULT_BANNERS.filter(b => !deletedBanners.has(b.id));
  } catch (err) {
    console.error('Error loading banners from storage:', err);
    return DEFAULT_BANNERS;
  }
}

export function saveStoredBanners(banners: BannerSlide[]): void {
  try {
    const deletedBanners = getDeletedBannerIds();
    const clean = deduplicateById<BannerSlide>(banners).filter(b => b && b.id && !deletedBanners.has(b.id));
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
  const cleanId = bannerId.trim();
  markBannerDeleted(cleanId);
  const current = getStoredBanners();
  const updated = deduplicateById<BannerSlide>(current.filter(b => b.id !== cleanId));
  saveStoredBanners(updated);

  syncToFirebaseRTDBRest('banners', updated);
  fetch(`${FIREBASE_RTDB_BASE}/banners/${cleanId}.json`, { method: 'DELETE' }).catch(() => {});

  fetch(`/api/db/banners/${cleanId}`, {
    method: 'DELETE'
  }).catch(() => {});

  try {
    if (rtdb && cleanId) {
      rtdbRemove(ref(rtdb, `banners/${cleanId}`)).catch(() => {});
    }
  } catch (e) {}
}

// Orders Storage
export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const deletedOrders = getDeletedOrderIds();
    if (!raw) {
      const initial = sortOrdersNewestFirst(INITIAL_ORDERS.filter(o => !deletedOrders.has(o.id)).map(sanitizeOrderForStorage));
      safeSetLocalStorage(ORDERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = sortOrdersNewestFirst(
        deduplicateById<Order>(parsed)
          .filter(o => o && o.id && !deletedOrders.has(o.id) && !deletedOrders.has(o.id.replace(/^ORD-/, '')) && !deletedOrders.has(`ORD-${o.id}`))
          .map(sanitizeOrderForStorage)
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
    const deletedOrders = getDeletedOrderIds();
    const clean = sortOrdersNewestFirst(
      deduplicateById<Order>(orders)
        .filter(o => o && o.id && !deletedOrders.has(o.id) && !deletedOrders.has(o.id.replace(/^ORD-/, '')) && !deletedOrders.has(`ORD-${o.id}`))
        .map(sanitizeOrderForStorage)
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
  markOrderDeleted(cleanId);
  const current = getStoredOrders();
  const targetOrder = current.find(o => o.id === cleanId || o.id === `ORD-${cleanId}` || o.id === cleanId.replace(/^ORD-/, ''));
  const updated = current.filter(o => o.id !== cleanId && o.id !== `ORD-${cleanId}` && o.id !== cleanId.replace(/^ORD-/, ''));
  saveStoredOrders(updated);

  // If deleted order had revenue, deduct from user's lifetime totalSpent and order count
  if (targetOrder && targetOrder.userEmail && targetOrder.totalAmount) {
    try {
      const users = getRegisteredUsers();
      const uIndex = users.findIndex(u => (u.email || '').toLowerCase() === (targetOrder.userEmail || '').toLowerCase());
      if (uIndex >= 0) {
        users[uIndex].totalOrders = Math.max(0, (users[uIndex].totalOrders || 1) - 1);
        users[uIndex].totalSpent = Math.max(0, (users[uIndex].totalSpent || targetOrder.totalAmount) - targetOrder.totalAmount);
        saveRegisteredUsers(users);
      }
    } catch (e) {}
  }

  // 1. Direct REST sync to Firebase Realtime Database
  fetch(`${FIREBASE_RTDB_BASE}/orders/${cleanId}.json`, { method: 'DELETE' }).catch(() => {});
  syncToFirebaseRTDBRest('orders', updated);

  // 2. Sync to Server & Cloudflare D1
  fetch(`/api/db/orders/${cleanId}`, {
    method: 'DELETE'
  }).catch(() => {});

  // 3. Sync via Firebase SDK
  try {
    if (rtdb && cleanId) {
      rtdbRemove(ref(rtdb, `orders/${cleanId}`)).catch(e => console.warn(e));
    }
  } catch (e) {}
}

export function deleteMultipleOrders(orderIds: string[]): void {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return;
  orderIds.forEach(id => markOrderDeleted(id));
  const idSet = new Set(orderIds.map(id => id.trim()));
  const current = getStoredOrders();
  
  // Deduct revenue for all targeted orders
  current.forEach(order => {
    if (idSet.has(order.id) || idSet.has(order.id.replace(/^ORD-/, '')) || idSet.has(`ORD-${order.id}`)) {
      if (order.userEmail && order.totalAmount) {
        try {
          const users = getRegisteredUsers();
          const uIndex = users.findIndex(u => (u.email || '').toLowerCase() === (order.userEmail || '').toLowerCase());
          if (uIndex >= 0) {
            users[uIndex].totalOrders = Math.max(0, (users[uIndex].totalOrders || 1) - 1);
            users[uIndex].totalSpent = Math.max(0, (users[uIndex].totalSpent || order.totalAmount) - order.totalAmount);
            saveRegisteredUsers(users);
          }
        } catch (e) {}
      }
    }
  });

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
  const cleanTargetEmail = (user?.email || '').toLowerCase().trim();
  const exists = current.some(u => (u?.email || '').toLowerCase().trim() === cleanTargetEmail);
  let updated = current;
  if (!exists) {
    updated = deduplicateUsers([user, ...current]);
  } else {
    updated = deduplicateUsers(current.map(u => (u?.email || '').toLowerCase().trim() === cleanTargetEmail ? { ...u, ...user } : u));
  }
  saveRegisteredUsers(updated);

  // Also save active session
  saveCurrentUser(user);

  // 1. Direct REST Sync to Firebase Realtime Database
  const userKey = (user.uid || user.email || 'user').replace(/[\.\#\$\/\[\]]/g, '_');
  syncToFirebaseRTDBRest(`users/${userKey}`, user);
  const usrMap: Record<string, UserProfile> = {};
  updated.forEach(u => {
    const k = (u.uid || u.email || '').replace(/[\.\#\$\/\[\]]/g, '_');
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
  const targetEmail = (updatedUser?.email || '').toLowerCase().trim();
  const updated = deduplicateUsers(current.map(u => {
    if ((u?.email || '').toLowerCase().trim() === targetEmail) {
      return { ...u, ...updatedUser };
    }
    return u;
  }));
  saveRegisteredUsers(updated);

  // If active user is being updated, sync active session
  const activeUser = getCurrentUser();
  if (activeUser && (activeUser.email || '').toLowerCase().trim() === targetEmail) {
    saveCurrentUser({ ...activeUser, ...updatedUser });
  }

  // 1. Sync to Firebase RTDB
  const userKey = (updatedUser.uid || updatedUser.email || 'user').replace(/[\.\#\$\/\[\]]/g, '_');
  const targetUser = updated.find(u => (u?.email || '').toLowerCase().trim() === targetEmail);
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
    const k = (u.uid || u.email || '').replace(/[\.\#\$\/\[\]]/g, '_');
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

export function isEmailRegistered(email: any): boolean {
  if (!email || typeof email !== 'string') return false;
  const current = getRegisteredUsers();
  const clean = email.toLowerCase().trim();
  return current.some(u => (u?.email || '').toLowerCase().trim() === clean);
}

export function updateUserOrderStats(email: any, amount: number): void {
  if (!email || typeof email !== 'string') return;
  const cleanEmail = email.toLowerCase().trim();
  const current = getRegisteredUsers();
  const updated = deduplicateUsers(current.map(u => {
    if ((u?.email || '').toLowerCase().trim() === cleanEmail) {
      return {
        ...u,
        totalOrders: (u.totalOrders || 0) + 1,
        totalSpent: (u.totalSpent || 0) + amount
      };
    }
    return u;
  }));
  saveRegisteredUsers(updated);

  const matched = updated.find(u => (u?.email || '').toLowerCase().trim() === cleanEmail);
  if (matched) {
    const userKey = (matched.uid || matched.email || 'user').replace(/[\.\#\$\/\[\]]/g, '_');
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

// ---------------------------------------------------------------------------
// NEET SUCCESS PASS & DIGITAL LIBRARY ACCESS PERMISSION SYSTEM
// ---------------------------------------------------------------------------
export const NEET_PASSES_KEY = 'neetmbbs_user_passes_v1';
export const DOWNLOAD_HISTORY_KEY = 'neetmbbs_download_history_v1';

export function getUserNeetPasses(user?: UserProfile | null): UserNeetPass[] {
  try {
    const raw = localStorage.getItem(NEET_PASSES_KEY);
    let localPasses: UserNeetPass[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localPasses = parsed;
    }

    const currentUser = user || getCurrentUser();
    if (currentUser?.neetPasses && Array.isArray(currentUser.neetPasses)) {
      const combined = [...localPasses, ...currentUser.neetPasses];
      const uniqueMap = new Map<string, UserNeetPass>();
      combined.forEach(p => {
        if (p && p.id) uniqueMap.set(p.id, p);
      });
      return Array.from(uniqueMap.values());
    }

    return localPasses;
  } catch (e) {
    return [];
  }
}

export function saveUserNeetPasses(passes: UserNeetPass[]): void {
  try {
    safeSetLocalStorage(NEET_PASSES_KEY, JSON.stringify(passes));
    window.dispatchEvent(new Event('neetmbbs_user_passes_updated'));
  } catch (e) {}
}

export function activateNeetPass(pass: UserNeetPass, userEmail?: string): void {
  try {
    const current = getUserNeetPasses();
    const updated = [pass, ...current.filter(p => p.id !== pass.id)];
    saveUserNeetPasses(updated);

    const currentUser = getCurrentUser();
    const emailToUse = userEmail || currentUser?.email;
    if (emailToUse) {
      const allUsers = getRegisteredUsers();
      const cleanEmailToUse = String(emailToUse).toLowerCase().trim();
      const target = allUsers.find(u => (u?.email || '').toLowerCase().trim() === cleanEmailToUse);
      if (target) {
        const userPasses = target.neetPasses ? [pass, ...target.neetPasses.filter(p => p.id !== pass.id)] : [pass];
        updateUserProfile({ email: target.email, neetPasses: userPasses });
      }
    }

    // Sync pass record to Firebase RTDB
    if (emailToUse) {
      const cleanEmail = emailToUse.replace(/[\.\#\$\/\[\]]/g, '_');
      syncToFirebaseRTDBRest(`user_passes/${cleanEmail}/${pass.id}`, pass);
    }
  } catch (e) {
    console.error('Error activating NEET Pass:', e);
  }
}

/**
 * Checks if user has an active NEET Pass for a specific subject or complete PCB
 */
export function hasActivePassForSubject(subject?: string, user?: UserProfile | null): boolean {
  if (!subject) return false;
  const passes = getUserNeetPasses(user);
  if (!passes || passes.length === 0) return false;

  const now = Date.now();
  const activePasses = passes.filter(p => {
    if (!p.active) return false;
    if (p.expiryDate.toLowerCase() === 'lifetime') return true;
    try {
      return new Date(p.expiryDate).getTime() > now;
    } catch (e) {
      return false;
    }
  });

  if (activePasses.length === 0) return false;

  // If user has complete PCB pass -> has access to all subjects
  if (activePasses.some(p => p.subjectKey === 'pcb')) {
    return true;
  }

  const cleanSubject = subject.toLowerCase().trim();
  if (cleanSubject.includes('bio') || cleanSubject.includes('botany') || cleanSubject.includes('zoology')) {
    return activePasses.some(p => p.subjectKey === 'biology');
  }
  if (cleanSubject.includes('chem') || cleanSubject.includes('organic') || cleanSubject.includes('inorganic') || cleanSubject.includes('physical')) {
    return activePasses.some(p => p.subjectKey === 'chemistry');
  }
  if (cleanSubject.includes('phys') || cleanSubject.includes('mechanics') || cleanSubject.includes('optics')) {
    return activePasses.some(p => p.subjectKey === 'physics');
  }
  if (cleanSubject.includes('pcb') || cleanSubject.includes('full') || cleanSubject.includes('combo')) {
    return activePasses.some(p => p.subjectKey === 'pcb');
  }

  return false;
}

/**
 * Universal Access check for any PDF study resource:
 * 1. Free resource or price 0 or passTier === 'free'
 * 2. Individually purchased by order
 * 3. Covered by active NEET Success Pass (Biology, Chemistry, Physics, Complete PCB)
 */
export function hasUserAccessToPdf(
  product: Product,
  user?: UserProfile | null,
  orders?: Order[]
): boolean {
  if (!product) return false;
  
  // 1. 100% Free resource or free tier
  if (product.isFreeResource || product.price === 0 || product.passTier === 'free') {
    return true;
  }

  // 2. Purchased directly via order
  if (hasUserPurchasedProduct(product.id, user, orders)) {
    return true;
  }

  // 3. Check active NEET Success Passes
  const passes = getUserNeetPasses(user);
  if (!passes || passes.length === 0) return false;

  const now = Date.now();
  const activePasses = passes.filter(p => {
    if (!p.active) return false;
    if (p.expiryDate.toLowerCase() === 'lifetime') return true;
    try {
      return new Date(p.expiryDate).getTime() > now;
    } catch (e) {
      return false;
    }
  });

  if (activePasses.length === 0) return false;

  // If user has complete PCB pass -> has access to all biology, chemistry, physics & pcb study materials
  const hasPcbPass = activePasses.some(p => p.subjectKey === 'pcb');
  if (hasPcbPass) {
    return true;
  }

  // If product is specifically tagged with a passTier:
  if (product.passTier) {
    if (product.passTier === 'biology') {
      return activePasses.some(p => p.subjectKey === 'biology' || p.subjectKey === 'pcb');
    }
    if (product.passTier === 'chemistry') {
      return activePasses.some(p => p.subjectKey === 'chemistry' || p.subjectKey === 'pcb');
    }
    if (product.passTier === 'physics') {
      return activePasses.some(p => p.subjectKey === 'physics' || p.subjectKey === 'pcb');
    }
    if (product.passTier === 'pcb') {
      return hasPcbPass;
    }
    if (product.passTier === 'all') {
      return activePasses.length > 0;
    }
  }

  // 4. Covered by NEET Success Pass based on subject or category
  const targetSubject = product.subject || product.category;
  if (targetSubject && hasActivePassForSubject(targetSubject, user)) {
    return true;
  }

  return false;
}

// Download History Tracking
export function getDownloadHistory(): DownloadHistoryItem[] {
  try {
    const raw = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function recordPdfDownload(
  productId: string, 
  title: string, 
  pdfUrl: string, 
  subject?: string, 
  materialType?: string
): void {
  try {
    const current = getDownloadHistory();
    const newItem: DownloadHistoryItem = {
      id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      title,
      subject: subject || 'NEET Study Material',
      materialType: materialType || 'Notes',
      pdfUrl,
      downloadedAt: new Date().toISOString()
    };
    const updated = [newItem, ...current.filter(item => item.productId !== productId)].slice(0, 50);
    safeSetLocalStorage(DOWNLOAD_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('neetmbbs_download_history_updated'));
  } catch (e) {}
}

export function clearDownloadHistory(): void {
  try {
    localStorage.removeItem(DOWNLOAD_HISTORY_KEY);
    window.dispatchEvent(new Event('neetmbbs_download_history_updated'));
  } catch (e) {}
}



