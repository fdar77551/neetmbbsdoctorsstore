import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import Razorpay from "razorpay";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createServer as createViteServer } from "vite";
import { generateInvoicePdfDoc, generateCombinedInvoicesPdfDoc } from "./src/lib/pdfInvoice";
import { GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
import { generateValidationLog, cleanLeadingOptionMarker } from "./src/lib/mockTestData";
import { GOLD_STANDARD_TEST_8_INFO, GOLD_STANDARD_TEST_8_QUESTIONS, runGoldStandardRegressionSuite } from "./src/lib/goldStandardTest8";
import { parser2Router } from "./src/services/parser2/parser2Routes";
import { jobQueueService } from "./src/services/parser2/jobQueueService";
import { ensureParser2D1Tables, hydrateParser2FromRemoteStores } from "./src/services/parser2/parser2Db";
import { getParser2AssetBuffer } from "./src/services/parser2/parser2R2Storage";
import {
  DEFAULT_TEST_CATEGORIES,
  normalizeTestCategories,
  filterTestsForCategoryDeduped,
  resolveTestCategoryIds
} from "./src/lib/testCategoriesData";

const app = express();
const args = process.argv.slice(2);
let portFromArg = 3000;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    portFromArg = Number(args[i + 1]) || 3000;
  } else if (args[i].startsWith("--port=")) {
    portFromArg = Number(args[i].split("=")[1]) || 3000;
  }
}
const PORT = Number(process.env.PORT) || portFromArg || 3000;

// Configure Multer for binary in-memory file uploads and large base64/JSON fields (Up to 150MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 150 * 1024 * 1024,      // 150MB max file size
    fieldSize: 150 * 1024 * 1024,     // 150MB max field value size (CRITICAL: prevents MulterError: Field value too long)
    fieldNameSize: 1000,              // 1000 bytes max field name
    fields: 1000,                     // max 1000 fields
    parts: 2000                       // max 2000 parts
  }
});

// Configuration (Live Production Razorpay Credentials)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_live_TS3u0sJ2yf9X6A";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "J0Vq8ih9V8dkiaunKk5HCPlr";
const PIPEDREAM_WEBHOOK_URL = process.env.PIPEDREAM_WEBHOOK_URL || "https://eokr7i7r2t9fttx.m.pipedream.net";

let CLOUDFLARE_R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY || "887e302ecc7e249de5f16198ddfb7bd4";
let CLOUDFLARE_R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_KEY || "20ddb02f48c59b9e1ae64dd1a164290e63396632633f0b49e2b5f310ba7fb79e";
let CLOUDFLARE_R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT || "https://d715d090a75efd8790b9a6da1e2f42d4.r2.cloudflarestorage.com";
let CLOUDFLARE_R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "ncertify";
let CLOUDFLARE_R2_PUBLIC_DEV_URL = "https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev";
let CLOUDFLARE_CUSTOM_CDN = "";

// Cloudflare D1 Database Configuration
let CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "d715d090a75efd8790b9a6da1e2f42d4";
let CF_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "daf5a141-af4a-4db6-b10d-ac3bbab28b72";
let CF_D1_NAME = process.env.CLOUDFLARE_D1_NAME || "neetmbbsdoctorsstore";
let CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_D1_TOKEN || "";

// Telegram Configuration - Permanently active default bot token
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A";
const TELEGRAM_ADMIN_CHAT_IDS = ["7004282468", "1318240288"];

// Initialize Cloudflare R2 S3 Client
let r2Client: S3Client | null = null;
function initR2Client() {
  try {
    r2Client = new S3Client({
      region: "auto",
      endpoint: CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
      },
    });
    console.log("Cloudflare R2 Client initialized successfully for bucket:", CLOUDFLARE_R2_BUCKET);
  } catch (err) {
    console.warn("Could not initialize S3 Client for R2:", err);
  }
}
initR2Client();

// In-Memory Fast Cache for Uploaded Files
const fileBufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// -------------------------------------------------------------
// PERSISTENT DATABASE ENGINE (Local Disk + Cloudflare D1 Sync)
// -------------------------------------------------------------
const DB_FILE_PATH = path.join(process.cwd(), "store_database.json");

interface DatabaseSchema {
  products: any[];
  users: any[];
  orders: any[];
  banners: any[];
  support_messages: any[];
  coupons: any[];
  reviews: any[];
  pdf_access: any[];
  payment_records: any[];
  settings?: any;
  mock_tests?: any[];
  mock_questions?: Record<string, any[]>;
  mock_purchases?: any[];
  mock_attempts?: any[];
  full_course_config?: any;
  full_course_purchases?: any[];
  courses?: any[];
  test_categories?: any[];
}

const SEED_PRODUCTS: any[] = [];


const SEED_USERS = [
  {
    uid: "admin-1",
    email: "fdar77551@gmail.com",
    displayName: "Faisal Fayaz",
    role: "admin",
    createdAt: "2025-12-01T00:00:00.000Z",
    totalOrders: 0,
    totalSpent: 0
  },
  {
    uid: "admin-2",
    email: "shahzaibhusain6@gmail.com",
    displayName: "Dr. Shahzaib Husain",
    role: "admin",
    createdAt: "2025-12-01T00:00:00.000Z",
    totalOrders: 0,
    totalSpent: 0
  }
];

const SEED_BANNERS = [
  {
    id: "banner-1",
    titleLine1: "NEET UG 2026",
    titleLine2: "Complete Mindmaps &",
    titleLine3: "High-Yield Books",
    subtitle: "Visual patterns & line-by-line questions for Biology & Chemistry",
    buttonText: "Explore Books →",
    badge: "Bestseller",
    type: "book",
    active: true
  },
  {
    id: "banner-2",
    titleLine1: "Instant PDF Notes",
    titleLine2: "Topper Cheatsheets",
    titleLine3: "Score 680+ Guaranteed",
    subtitle: "Rapid formula mindmaps & verified NCERT extracted pointers",
    buttonText: "Get PDF Notes →",
    badge: "Instant Access",
    type: "pdf",
    active: true
  }
];

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.products) {
        parsed.products = [];
      }
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = SEED_USERS;
      } else {
        // Strip any legacy stored passwords so Firebase Auth remains single source of truth
        parsed.users.forEach((u: any) => {
          if (u.password !== undefined) {
            delete u.password;
          }
        });
      }
      if (!parsed.banners || parsed.banners.length === 0) {
        parsed.banners = SEED_BANNERS;
      }
      if (!parsed.orders) parsed.orders = [];
      if (!parsed.support_messages) parsed.support_messages = [];
      if (!parsed.coupons) parsed.coupons = [];
      if (!parsed.reviews) parsed.reviews = [];
      if (!parsed.pdf_access) parsed.pdf_access = [];
      if (!parsed.payment_records) parsed.payment_records = [];
      parsed.test_categories = normalizeTestCategories(parsed.test_categories);
      return parsed;
    }
  } catch (err) {
    console.error("Error loading local database file:", err);
  }

  const initialDb: DatabaseSchema = {
    products: SEED_PRODUCTS,
    users: SEED_USERS,
    orders: [],
    banners: SEED_BANNERS,
    support_messages: [],
    coupons: [
      { code: "NEET2026", discountType: "percentage", discountValue: 15, minAmount: 299, active: true },
      { code: "DOCTOR50", discountType: "flat", discountValue: 50, minAmount: 199, active: true }
    ],
    reviews: [],
    pdf_access: [],
    payment_records: [],
    test_categories: DEFAULT_TEST_CATEGORIES
  };
  saveDatabase(initialDb);
  return initialDb;
}

function sanitizeDatabaseForDisk(db: DatabaseSchema): DatabaseSchema {
  try {
    if (Array.isArray(db.products)) {
      db.products.forEach(p => {
        if (typeof p.coverImage === 'string' && p.coverImage.startsWith('data:image/') && p.coverImage.length > 500) {
          const cacheKey = `products/cover-${p.id || Date.now()}`;
          const cleanB64 = p.coverImage.replace(/^data:[^;]+;base64,/, '');
          fileBufferCache.set(cacheKey, { buffer: Buffer.from(cleanB64, 'base64'), contentType: 'image/jpeg' });
          p.coverImage = `/api/r2/file/${cacheKey}`;
        }
        if (typeof p.pdfUrl === 'string' && p.pdfUrl.startsWith('data:')) {
          const cacheKey = `pdfs/note-${p.id || Date.now()}`;
          const cleanB64 = p.pdfUrl.replace(/^data:[^;]+;base64,/, '');
          fileBufferCache.set(cacheKey, { buffer: Buffer.from(cleanB64, 'base64'), contentType: 'application/pdf' });
          p.pdfUrl = `/api/r2/file/${cacheKey}`;
        }
        if (Array.isArray(p.sampleImages)) {
          p.sampleImages = p.sampleImages.map((img: any, idx: number) => {
            if (typeof img === 'string' && img.startsWith('data:') && img.length > 500) {
              const cacheKey = `sample-pages/${p.id || 'sample'}-${idx}-${Date.now()}`;
              const cleanB64 = img.replace(/^data:[^;]+;base64,/, '');
              fileBufferCache.set(cacheKey, { buffer: Buffer.from(cleanB64, 'base64'), contentType: 'image/jpeg' });
              return `/api/r2/file/${cacheKey}`;
            }
            return img;
          });
        }
      });
    }

    if (Array.isArray(db.banners)) {
      db.banners.forEach((b: any) => {
        if (typeof b.imageUrl === 'string' && b.imageUrl.startsWith('data:') && b.imageUrl.length > 500) {
          const cacheKey = `banners/${b.id || Date.now()}`;
          const mimeMatch = b.imageUrl.match(/^data:([^;]+);base64,/);
          const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const cleanB64 = b.imageUrl.replace(/^data:[^;]+;base64,/, '');
          fileBufferCache.set(cacheKey, { buffer: Buffer.from(cleanB64, 'base64'), contentType });
          b.imageUrl = `/api/r2/file/${cacheKey}`;
        }
      });
    }

    if (Array.isArray(db.orders)) {
      db.orders.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            if (typeof item.coverImage === 'string' && item.coverImage.startsWith('data:')) item.coverImage = '';
            if (typeof item.pdfUrl === 'string' && item.pdfUrl.startsWith('data:')) item.pdfUrl = '';
          });
        }
      });
    }
  } catch (e) {
    console.warn("DB sanitize note:", e);
  }
  return db;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    const cleanDb = sanitizeDatabaseForDisk(db);
    cleanDb.test_categories = normalizeTestCategories(cleanDb.test_categories);
    const tmpPath = `${DB_FILE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(cleanDb, null, 2), "utf-8");
    fs.renameSync(tmpPath, DB_FILE_PATH);
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

function restoreCloudflareSettingsFromDb() {
  try {
    const db = loadDatabase();
    const savedCf = db.settings?.cloudflare;
    if (savedCf) {
      if (savedCf.accountId) CF_ACCOUNT_ID = savedCf.accountId;
      if (savedCf.bucketName) CLOUDFLARE_R2_BUCKET = savedCf.bucketName;
      if (savedCf.accessKeyId) CLOUDFLARE_R2_ACCESS_KEY = savedCf.accessKeyId;
      if (savedCf.secretAccessKey) CLOUDFLARE_R2_SECRET_KEY = savedCf.secretAccessKey;
      if (savedCf.s3Endpoint) CLOUDFLARE_R2_ENDPOINT = savedCf.s3Endpoint;
      if (savedCf.publicDevUrl) CLOUDFLARE_R2_PUBLIC_DEV_URL = savedCf.publicDevUrl;
      if (savedCf.customCdnDomain !== undefined) CLOUDFLARE_CUSTOM_CDN = savedCf.customCdnDomain;
      if (savedCf.apiToken) CF_API_TOKEN = savedCf.apiToken;
      if (savedCf.d1DatabaseId) CF_D1_DATABASE_ID = savedCf.d1DatabaseId;
      if (savedCf.d1Name) CF_D1_NAME = savedCf.d1Name;
    }
    if (CF_API_TOKEN) {
      setTimeout(() => {
        syncAllProductsToD1Internal().catch(e => console.warn("Auto D1 sync on boot note:", e.message));
      }, 1500);
    }
  } catch (e) {
    console.warn("Could not restore Cloudflare settings from DB:", e);
  }
}
restoreCloudflareSettingsFromDb();

// Cloudflare D1 REST API Helper
async function queryCloudflareD1(sql: string, params: any[] = []) {
  if (!CF_API_TOKEN) {
    return { success: false, message: "Cloudflare API Token not set. Please provide API Token in Cloudflare settings." };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    });
    const result = await resp.json();
    return result;
  } catch (err: any) {
    console.warn("Cloudflare D1 Query Network Note:", err.message);
    return { success: false, error: err.message };
  }
}

// Initialize D1 Schema asynchronously
async function initD1Tables() {
  if (!CF_API_TOKEN) return;
  const schemas = [
    `CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, displayName TEXT, role TEXT, createdAt TEXT, totalOrders INTEGER, totalSpent REAL, photoURL TEXT, avatarUrl TEXT);`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT, author TEXT, type TEXT, category TEXT, price REAL, originalPrice REAL, rating REAL, reviewsCount INTEGER, coverImage TEXT, sampleImages TEXT, pdfUrl TEXT, description TEXT, features TEXT, tags TEXT, pages INTEGER, edition TEXT, isbn TEXT, inStock INTEGER, isBestSeller INTEGER, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userId TEXT, userEmail TEXT, userName TEXT, items TEXT, totalAmount REAL, paymentId TEXT, razorpayOrderId TEXT, paymentStatus TEXT, shippingAddress TEXT, status TEXT, orderDate TEXT, invoiceNumber TEXT, notes TEXT);`,
    `CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, orderId TEXT, paymentId TEXT, amount REAL, status TEXT, gateway TEXT, signature TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS pdf_access (id TEXT PRIMARY KEY, userId TEXT, userEmail TEXT, productId TEXT, orderId TEXT, grantedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, titleLine1 TEXT, titleLine2 TEXT, titleLine3 TEXT, subtitle TEXT, buttonText TEXT, badge TEXT, type TEXT, imageUrl TEXT, active INTEGER);`,
    `CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, discountType TEXT, discountValue REAL, minAmount REAL, active INTEGER);`,
    `CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, productId TEXT, userEmail TEXT, userName TEXT, rating REAL, comment TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT, status TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS mock_tests (id TEXT PRIMARY KEY, testNumber TEXT, title TEXT, subject TEXT, totalQuestions INTEGER, durationMinutes INTEGER, price REAL, isFree INTEGER, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS mock_questions (id TEXT PRIMARY KEY, testId TEXT, questionNumber INTEGER, subject TEXT, chapter TEXT, questionText TEXT, options TEXT, correctAnswer TEXT, figureUrl TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS mock_test_attempts (id TEXT PRIMARY KEY, testId TEXT, testTitle TEXT, testTypeCategory TEXT, subject TEXT, userId TEXT, userEmail TEXT, userName TEXT, photoURL TEXT, avatarUrl TEXT, score INTEGER, maxMarks INTEGER, accuracy INTEGER, correctCount INTEGER, incorrectCount INTEGER, unansweredCount INTEGER, timeSpentSeconds INTEGER, submittedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS test_categories (id TEXT PRIMARY KEY, slug TEXT, name TEXT, description TEXT, bannerImageUrl TEXT, themePreset TEXT, displayOrder INTEGER, isVisible INTEGER, isDefault INTEGER, badgeText TEXT, accentTags TEXT, ctaText TEXT, createdAt TEXT, updatedAt TEXT);`
  ];

  try {
    for (const sql of schemas) {
      await queryCloudflareD1(sql);
    }
    await ensureParser2D1Tables();
  } catch (err: any) {
    console.warn("initD1Tables notice:", err.message);
  }
}

// Direct Product to Cloudflare D1 Synchronizer
async function syncProductToD1(product: any) {
  if (!CF_API_TOKEN) return { success: false, message: "No Cloudflare API token configured" };
  try {
    await initD1Tables();
    const safeCover = typeof product.coverImage === 'string' && !product.coverImage.startsWith('data:') ? product.coverImage : '';
    const safePdf = typeof product.pdfUrl === 'string' && !product.pdfUrl.startsWith('data:') ? product.pdfUrl : '';
    const result = await queryCloudflareD1(
      `INSERT OR REPLACE INTO products (id, title, author, type, category, price, originalPrice, rating, reviewsCount, coverImage, sampleImages, pdfUrl, description, features, tags, pages, edition, isbn, inStock, isBestSeller, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.title || '',
        product.author || 'Verified Specialists',
        product.type || 'book',
        product.category || 'General',
        Number(product.price || 0),
        Number(product.originalPrice || 0),
        Number(product.rating || 4.8),
        Number(product.reviewsCount || 0),
        safeCover,
        JSON.stringify(product.sampleImages || []),
        safePdf,
        product.description || '',
        JSON.stringify(product.features || []),
        JSON.stringify(product.tags || []),
        Number(product.pages || 0),
        product.edition || '',
        product.isbn || '',
        product.inStock !== false ? 1 : 0,
        product.isBestSeller ? 1 : 0,
        product.createdAt || new Date().toISOString()
      ]
    );
    return result;
  } catch (err: any) {
    console.warn("[Cloudflare D1 Product Sync Error]:", err.message);
    return { success: false, error: err.message };
  }
}

// Bulk Sync all local database products to Cloudflare D1
async function syncAllProductsToD1Internal() {
  if (!CF_API_TOKEN) return { success: false, synced: 0 };
  const db = loadDatabase();
  await initD1Tables();
  let count = 0;
  for (const prod of db.products) {
    if (!prod || !prod.id) continue;
    try {
      await syncProductToD1(prod);
      count++;
    } catch (e: any) {
      console.warn("Product D1 sync error:", prod.id, e.message);
    }
  }
  console.log(`[Cloudflare D1] Synced ${count} of ${db.products.length} products to D1 database ${CF_D1_DATABASE_ID}`);
  return { success: true, synced: count };
}

// -------------------------------------------------------------
// FIREBASE REALTIME DATABASE SYNC ENGINE
// -------------------------------------------------------------
const FIREBASE_RTDB_BASE = "https://ncertify-neet-master-tests-default-rtdb.firebaseio.com";

async function syncToFirebaseRTDB(path: string, data: any) {
  try {
    const url = `${FIREBASE_RTDB_BASE}/${path}.json`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (err: any) {
    console.warn(`Firebase RTDB sync note (${path}):`, err.message);
  }
}

async function fetchFromFirebaseRTDB(path: string) {
  try {
    const url = `${FIREBASE_RTDB_BASE}/${path}.json`;
    const resp = await fetch(url);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err: any) {
    console.warn(`Firebase RTDB fetch note (${path}):`, err.message);
  }
  return null;
}

// Initial Two-Way Database Hydration (Firebase RTDB + Cloudflare + Local)
async function hydrateDualDatabases() {
  try {
    const db = loadDatabase();
    
    // 1. Check if Firebase Realtime Database has products
    const remoteProducts = await fetchFromFirebaseRTDB("products");
    if (remoteProducts && (Array.isArray(remoteProducts) || typeof remoteProducts === 'object')) {
      const prodList: any[] = Array.isArray(remoteProducts) ? remoteProducts.filter(Boolean) : Object.values(remoteProducts);
      if (prodList.length > 0) {
        for (const p of prodList) {
          if (!p || !p.id) continue;
          const exists = db.products.findIndex(localP => localP.id === p.id);
          if (exists >= 0) {
            db.products[exists] = { ...db.products[exists], ...p };
          } else {
            db.products.push(p);
          }
        }
        saveDatabase(db);
      }
    }

    // 2. Check if Firebase Realtime Database has users
    const remoteUsers = await fetchFromFirebaseRTDB("users");
    if (remoteUsers && (Array.isArray(remoteUsers) || typeof remoteUsers === 'object')) {
      const userList: any[] = Array.isArray(remoteUsers) ? remoteUsers.filter(Boolean) : Object.values(remoteUsers);
      if (userList.length > 0) {
        for (const u of userList) {
          if (!u || !u.email) continue;
          const uEmail = String(u.email || '').toLowerCase().trim();
          const exists = db.users.findIndex(localU => String(localU?.email || '').toLowerCase().trim() === uEmail);
          if (exists >= 0) {
            db.users[exists] = { ...db.users[exists], ...u };
          } else {
            db.users.push(u);
          }
        }
        saveDatabase(db);
      }
    }

    // 3. Check if Firebase Realtime Database has orders
    const remoteOrders = await fetchFromFirebaseRTDB("orders");
    if (remoteOrders && (Array.isArray(remoteOrders) || typeof remoteOrders === 'object')) {
      const orderList: any[] = Array.isArray(remoteOrders) ? remoteOrders.filter(Boolean) : Object.values(remoteOrders);
      if (orderList.length > 0) {
        for (const o of orderList) {
          if (!o || !o.id) continue;
          const exists = db.orders.findIndex(localO => localO.id === o.id);
          if (exists >= 0) {
            db.orders[exists] = { ...db.orders[exists], ...o };
          } else {
            db.orders.push(o);
          }
        }
        saveDatabase(db);
      }
    }

    // 4. Check if Firebase Realtime Database has banners (permanent banner persistence)
    const remoteBanners = await fetchFromFirebaseRTDB("banners");
    if (remoteBanners && (Array.isArray(remoteBanners) || typeof remoteBanners === 'object')) {
      const bannerList: any[] = Array.isArray(remoteBanners) ? remoteBanners.filter(Boolean) : Object.values(remoteBanners);
      if (bannerList.length > 0) {
        db.banners = bannerList;
        saveDatabase(db);
      }
    }

    // 5. Check if Firebase Realtime Database has settings (Telegram, Cloudflare permanent sync)
    const remoteSettings = await fetchFromFirebaseRTDB("settings");
    if (remoteSettings && typeof remoteSettings === 'object') {
      db.settings = { ...db.settings, ...remoteSettings };
      if (db.settings.telegramBotToken) {
        TELEGRAM_BOT_TOKEN = db.settings.telegramBotToken;
      }
      saveDatabase(db);
    }

    // 6. Check if Firebase RTDB has courses & full_course_config
    const remoteCourseConfig = await fetchFromFirebaseRTDB("config/full_course_config");
    if (remoteCourseConfig && typeof remoteCourseConfig === 'object') {
      db.full_course_config = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...db.full_course_config, ...remoteCourseConfig };
      saveDatabase(db);
    }
    const remoteCourses = await fetchFromFirebaseRTDB("config/courses");
    if (remoteCourses && Array.isArray(remoteCourses) && remoteCourses.length > 0) {
      db.courses = remoteCourses;
      saveDatabase(db);
    }

    // 6b. Merge mock_tests & test_categories across store_database.json and Firebase RTDB
    const remoteMockTests = await fetchFromFirebaseRTDB("mock_tests");
    if (!Array.isArray(db.mock_tests)) db.mock_tests = [];
    if (remoteMockTests && (Array.isArray(remoteMockTests) || typeof remoteMockTests === 'object')) {
      const rtList: any[] = Array.isArray(remoteMockTests) ? remoteMockTests.filter(Boolean) : Object.values(remoteMockTests);
      let dirtyTests = false;
      for (const rt of rtList) {
        if (!rt || !rt.id) continue;
        const idx = db.mock_tests.findIndex((localT: any) => localT && localT.id === rt.id);
        if (idx >= 0) {
          const localTs = Date.parse(db.mock_tests[idx].updatedAt || db.mock_tests[idx].createdAt || '') || 0;
          const rtTs = Date.parse(rt.updatedAt || rt.createdAt || '') || 0;
          if (rtTs > localTs) {
            db.mock_tests[idx] = { ...db.mock_tests[idx], ...rt };
            dirtyTests = true;
          }
        } else {
          db.mock_tests.push(rt);
          dirtyTests = true;
        }
      }
      if (dirtyTests) saveDatabase(db);
    }

    const remoteTestCats = await fetchFromFirebaseRTDB("test_categories");
    if (remoteTestCats && (Array.isArray(remoteTestCats) || typeof remoteTestCats === 'object')) {
      const catList: any[] = Array.isArray(remoteTestCats) ? remoteTestCats.filter(Boolean) : Object.values(remoteTestCats);
      if (catList.length > 0) {
        db.test_categories = normalizeTestCategories([...(Array.isArray(db.test_categories) ? db.test_categories : []), ...catList]);
        saveDatabase(db);
      }
    }

    // 7. Sync any local data to Firebase RTDB
    if (db.products.length > 0) {
      await syncToFirebaseRTDB("products", db.products);
    }
    if (db.banners.length > 0) {
      await syncToFirebaseRTDB("banners", db.banners);
    }
    if (db.orders.length > 0) {
      await syncToFirebaseRTDB("orders", db.orders);
    }
    if (db.users.length > 0) {
      await syncToFirebaseRTDB("users", db.users);
    }
    if (db.settings) {
      await syncToFirebaseRTDB("settings", db.settings);
    }
    if (db.full_course_config) {
      await syncToFirebaseRTDB("config/full_course_config", db.full_course_config);
    }
    if (Array.isArray(db.courses) && db.courses.length > 0) {
      await syncToFirebaseRTDB("config/courses", db.courses);
    }
    if (Array.isArray(db.mock_tests) && db.mock_tests.length > 0) {
      const testsMap: Record<string, any> = {};
      db.mock_tests.forEach((t: any) => {
        if (t && t.id) testsMap[t.id] = t;
      });
      await syncToFirebaseRTDB("mock_tests", testsMap);
    }
    if (db.mock_questions && typeof db.mock_questions === "object") {
      for (const [testId, qs] of Object.entries(db.mock_questions)) {
        if (Array.isArray(qs) && qs.length > 0) {
          syncToFirebaseRTDB(`mock_questions/${encodeURIComponent(testId)}`, qs).catch(() => {});
        }
      }
    }
    if (Array.isArray(db.test_categories) && db.test_categories.length > 0) {
      await syncToFirebaseRTDB("test_categories", db.test_categories);
    }
  } catch (e: any) {
    console.warn("Dual database hydration note:", e.message);
  }
}

// Run initial table checks and dual database sync
initD1Tables().catch(err => console.warn("D1 table init notice:", err.message));
hydrateDualDatabases().catch(err => console.warn("Dual DB hydration notice:", err.message));


// Helper: Generate Clean Standalone Printable HTML Tax Invoice Document
function generateInvoiceHtml(order: any): string {
  const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod');
  const invoiceDate = new Date(order.orderDate || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const rawId = String(order.id || '').replace(/^#/, '');
  const invoiceNumber = order.invoiceNumber || `INV-2026-${rawId.replace(/^ORD-/, '')}`;
  const customerName = order.userName || order.customer?.name || order.shippingAddress?.fullName || "Valued Customer";
  const customerEmail = order.userEmail || order.customer?.email || "aspirant@gmail.com";
  const customerPhone = order.shippingAddress?.phoneNumber || order.customer?.contact || "";
  const totalPrice = order.totalAmount || order.price || order.amount || 0;

  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
        ${item.title || item.name}
        <div style="font-size: 10px; color: #64748b; font-weight: normal;">By ${item.author || 'NEET Faculty'}</div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">
        ${item.type === 'pdf' ? 'Digital PDF' : 'Physical Book'}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${item.quantity || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.price}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${(item.price || 0) * (item.quantity || 1)}</td>
    </tr>
  `).join('');

  const paymentSectionHtml = isCod ? `
    <div style="background: #fffbeb; border: 1.5px solid #f59e0b; padding: 12px 16px; border-radius: 8px; display: inline-block;">
      <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
        💵 CASH ON DELIVERY (COD) • PENDING COLLECTION
      </div>
      <div style="font-size: 11px; color: #78350f; margin-top: 4px; font-weight: 700;">
        Collect from Customer: ₹${totalPrice}
      </div>
      <div style="font-size: 10px; color: #92400e; font-family: monospace; margin-top: 3px;">
        Payment Method: Cash on Delivery (COD)
      </div>
      <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 2px;">
        Ref ID: COD_${rawId.replace(/^ORD-/, '')} | #${rawId}
      </div>
    </div>
  ` : `
    <div style="background: #ecfdf5; border: 1.5px solid #10b981; padding: 12px 16px; border-radius: 8px; display: inline-block;">
      <div style="font-size: 11px; font-weight: 800; color: #065f46; text-transform: uppercase;">
        ✓ PAID via Razorpay • Verified Online
      </div>
      <div style="font-size: 10px; color: #047857; font-family: monospace; margin-top: 4px; font-weight: 600;">
        Payment ID: ${order.paymentId || 'Online'}
      </div>
      <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 2px;">
        Order ID: ${order.razorpayOrderId || rawId}
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 20px; }
    .invoice-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .print-bar { max-width: 680px; margin: 0 auto 12px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: #0f172a; color: #fff; font-size: 12px; font-weight: bold; border-radius: 6px; text-decoration: none; cursor: pointer; border: none; }
    .btn-gold { background: #f59e0b; color: #000; }
    @media print {
      body { background: #fff; padding: 0; }
      .print-bar { display: none; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-size: 12px; font-weight: bold; color: #475569;">NEET MBBS Doctors Store • Tax Invoice</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </div>

  <div class="invoice-card">
    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px;">
      <div>
        <h1 style="margin: 0; font-size: 17px; text-transform: uppercase; letter-spacing: -0.5px; font-weight: 900;">NEET MBBS DOCTORS STORE</h1>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">NCERTify Master Tests & Med Books PVT LTD</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Support: fdar77551@gmail.com | shahzaibhusain6@gmail.com</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">GSTIN: 07AABCN8891P1ZX</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; font-weight: 800; background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 4px; border: 1px solid #fde68a;">TAX INVOICE</span>
        ${isCod ? '<div style="margin-top: 4px;"><span style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #fcd34d;">💵 COD ORDER</span></div>' : ''}
        <div style="margin-top: 6px; font-weight: 800; font-family: monospace; font-size: 12px;">${invoiceNumber}</div>
        <div style="font-size: 11px; color: #64748b;">Date: ${invoiceDate}</div>
      </div>
    </div>

    <div style="display: flex; gap: 14px; background: #f8fafc; padding: 12px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 11px;">
      <div style="flex: 1;">
        <strong style="color: #64748b; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 3px;">Customer Details:</strong>
        <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${customerName}</div>
        <div style="color: #475569;">${customerEmail}</div>
        ${customerPhone ? `<div style="color: #475569;">Mobile: +91 ${customerPhone}</div>` : ''}
      </div>
      <div style="flex: 1;">
        <strong style="color: #64748b; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 3px;">Delivery Destination:</strong>
        ${order.shippingAddress ? `
          <div style="color: #334155; line-height: 1.4;">
            ${order.shippingAddress.addressLine1}, ${order.shippingAddress.addressLine2 || ''}<br/>
            <strong>${order.shippingAddress.district}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</strong>
          </div>
        ` : '<div style="color: #047857; font-weight: bold;">Instant Digital Delivery (Read / Download in App)</div>'}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #cbd5e1; color: #475569; text-align: left;">
          <th style="padding: 8px;">Item Description</th>
          <th style="padding: 8px; text-align: center;">Type</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px;">
      <div style="width: 230px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
          <span>Subtotal:</span>
          <span style="font-weight: bold;">₹${totalPrice}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
          <span>Shipping:</span>
          <span style="color: #047857; font-weight: bold;">FREE (₹0.00)</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
          <span>GST (0% Books):</span>
          <span>₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 6px; font-size: 13px; font-weight: 900;">
          <span>${isCod ? 'Collect on Delivery:' : 'Grand Total Paid:'}</span>
          <span style="color: ${isCod ? '#b45309' : '#047857'};">₹${totalPrice}</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
      ${paymentSectionHtml}
      <div style="text-align: right; font-family: monospace; font-size: 9px; color: #64748b;">
        <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; letter-spacing: 2px; font-weight: bold;">||| | |||| || ||| |||| | ||</div>
        <div style="margin-top: 2px;">#${rawId}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Helper: Send Telegram Order Notification + Direct Invoice Document Delivery
const sentTelegramOrderIds = new Set<string>();

function escapeTelegramHtml(text: any): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramOrderNotification(order: any, customBotToken?: string) {
  const token = (customBotToken && customBotToken.trim().length > 10) 
    ? customBotToken.trim() 
    : (TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A");
  
  if (!token) {
    console.log("Telegram notification queued: TELEGRAM_BOT_TOKEN is not configured yet.");
    return { success: false, message: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const orderId = String(order.id || order.orderId || order.invoiceNumber || `ORD-${Date.now()}`).replace(/^#/, '');

  // Deduplication check: avoid spamming if already sent successfully in the last 15 minutes
  if (sentTelegramOrderIds.has(orderId)) {
    console.log(`Telegram notification already dispatched for order #${orderId}, skipping duplicate.`);
    return { success: true, duplicate: true, orderId };
  }

  const rawCustomerName = order.userName || order.customer?.name || order.shippingAddress?.fullName || "Valued Customer";
  const rawCustomerPhone = order.shippingAddress?.phoneNumber || order.customer?.contact || "N/A";
  
  let rawCustomerAddress = "Digital Access / Instant PDF";
  if (order.shippingAddress) {
    const a = order.shippingAddress;
    const parts = [
      a.addressLine1,
      a.addressLine2,
      a.district,
      a.state ? `${a.state} - ${a.pincode || ''}` : a.pincode
    ].filter(Boolean);
    rawCustomerAddress = parts.join(", ") || "Physical Delivery";
  }

  const items = order.items || [];
  const rawProductNames = items.length > 0
    ? items.map((i: any) => `${i.title || i.name} (x${i.quantity || 1})`).join(", ")
    : (order.productName || "NEET Study Material");

  const totalQuantity = items.length > 0
    ? items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0)
    : (order.quantity || 1);

  const totalPrice = order.totalAmount || order.price || order.amount || 0;
  const isCod = String(order.paymentStatus || '').toLowerCase().includes("cod") || String(order.paymentStatus || '').toLowerCase().includes("cash");
  
  const paymentStatusHtml = isCod
    ? `💵 <b>Cash on Delivery (COD)</b> (₹${totalPrice} to collect)`
    : `✅ <b>PAID Online</b> (${escapeTelegramHtml(order.paymentId || 'Verified Online')})`;

  const paymentStatusPlain = isCod
    ? `Cash on Delivery (COD) - Collect ₹${totalPrice}`
    : `PAID Online (${order.paymentId || 'Verified Online'})`;

  // 1. Formatted HTML Message
  const htmlMessageText = 
`🛒 <b>NEW ORDER</b>
👤 <b>Name:</b> ${escapeTelegramHtml(rawCustomerName)}
📞 <b>Phone:</b> ${escapeTelegramHtml(rawCustomerPhone)}
📍 <b>Address:</b> ${escapeTelegramHtml(rawCustomerAddress)}
📦 <b>Product:</b> ${escapeTelegramHtml(rawProductNames)}
🔢 <b>Quantity:</b> ${totalQuantity}
💰 <b>Price:</b> ₹${totalPrice}
💳 <b>Payment:</b> ${paymentStatusHtml}
🆔 <b>Order ID:</b> #${escapeTelegramHtml(orderId)}
📄 <b>Official Tax Invoice (PDF):</b> Attached below (Download & Print directly)`;

  // 2. Plain Text Fallback Message (Guaranteed to parse even with special characters)
  const plainTextMessage = 
`🛒 NEW ORDER
👤 Name: ${rawCustomerName}
📞 Phone: ${rawCustomerPhone}
📍 Address: ${rawCustomerAddress}
📦 Product: ${rawProductNames}
🔢 Quantity: ${totalQuantity}
💰 Price: ₹${totalPrice}
💳 Payment: ${paymentStatusPlain}
🆔 Order ID: #${orderId}
📄 Official Tax Invoice (PDF): Attached below`;

  // Generate Authentic PDF Document
  let pdfBlob: Blob | null = null;
  try {
    const pdfDoc = generateInvoicePdfDoc(order);
    const pdfArrayBuffer = pdfDoc.output("arraybuffer");
    pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  } catch (pdfErr: any) {
    console.warn("PDF generation fallback notice:", pdfErr.message);
  }

  const results = [];
  let atLeastOneSuccess = false;

  for (const chatId of TELEGRAM_ADMIN_CHAT_IDS) {
    try {
      // Step 1: Send Message with HTML parsing
      let msgSent = false;
      try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: htmlMessageText,
            parse_mode: "HTML"
          })
        });
        const data = await resp.json();
        if (data.ok) {
          msgSent = true;
          atLeastOneSuccess = true;
          results.push({ chatId, ok: true });
        } else {
          console.warn(`HTML Telegram parse notice for ${chatId}, falling back to plain text:`, data.description);
        }
      } catch (e: any) {
        console.warn(`HTML Telegram fetch error for ${chatId}:`, e.message);
      }

      // Step 1 Fallback: Plain Text Message if HTML failed
      if (!msgSent) {
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainTextMessage
            })
          });
          const data = await resp.json();
          if (data.ok) {
            msgSent = true;
            atLeastOneSuccess = true;
            results.push({ chatId, ok: true, fallback: true });
          } else {
            console.warn(`Plain text Telegram notice for ${chatId}:`, data.description);
            results.push({ chatId, ok: false, error: data.description });
          }
        } catch (e: any) {
          console.warn(`Plain text Telegram fetch error for ${chatId}:`, e.message);
          results.push({ chatId, ok: false, error: e.message });
        }
      }

      // Step 2: Direct PDF Invoice Document Delivery via sendDocument
      if (pdfBlob) {
        try {
          const formData = new FormData();
          formData.append("chat_id", chatId);
          formData.append("document", pdfBlob, `Tax_Invoice_${orderId}.pdf`);
          formData.append("caption", `📄 Official Tax Invoice (PDF) #${orderId} (${isCod ? 'COD - Collect ₹' + totalPrice : 'PAID Online'})`);

          await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: "POST",
            body: formData
          });
        } catch (docErr: any) {
          console.warn(`Telegram sendDocument notice for chat ${chatId}:`, docErr.message);
        }
      }

    } catch (err: any) {
      console.warn(`Telegram general error for chat ${chatId}:`, err.message);
      results.push({ chatId, ok: false, error: err.message });
    }
  }

  if (atLeastOneSuccess) {
    sentTelegramOrderIds.add(orderId);
  }

  return { success: atLeastOneSuccess, results };
}

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "NEET MBBS Doctors Store API",
    razorpayConfigured: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
    r2Configured: Boolean(r2Client),
    pipedreamConfigured: Boolean(PIPEDREAM_WEBHOOK_URL),
    telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN),
    timestamp: new Date().toISOString()
  });
});

// Config Endpoint for public client info
app.get("/api/config", (_req, res) => {
  const db = loadDatabase();
  const savedCf = db.settings?.cloudflare || {};
  res.json({
    razorpayKeyId: RAZORPAY_KEY_ID,
    r2Endpoint: savedCf.s3Endpoint || CLOUDFLARE_R2_ENDPOINT,
    bucket: savedCf.bucketName || CLOUDFLARE_R2_BUCKET,
    r2AccessKeyId: savedCf.accessKeyId || CLOUDFLARE_R2_ACCESS_KEY,
    r2SecretAccessKey: savedCf.secretAccessKey || CLOUDFLARE_R2_SECRET_KEY,
    cfAccountId: savedCf.accountId || CF_ACCOUNT_ID,
    r2PublicDevUrl: savedCf.publicDevUrl || CLOUDFLARE_R2_PUBLIC_DEV_URL,
    r2CustomCdn: savedCf.customCdnDomain !== undefined ? savedCf.customCdnDomain : CLOUDFLARE_CUSTOM_CDN,
    pipedreamUrl: PIPEDREAM_WEBHOOK_URL,
    telegramBot: "NeetMbbsDoctorsStoreBot",
    telegramAdminChatIds: TELEGRAM_ADMIN_CHAT_IDS,
    isTelegramConfigured: Boolean(TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN)
  });
});

// Telegram Notification Endpoint (Called on Order Placement)
app.post("/api/telegram/notify-order", async (req, res) => {
  try {
    const { order, botToken } = req.body;
    if (!order) {
      return res.status(400).json({ error: "Order object is required" });
    }

    if (botToken && typeof botToken === "string" && botToken.trim()) {
      TELEGRAM_BOT_TOKEN = botToken.trim();
    }

    const result = await sendTelegramOrderNotification(order, botToken);
    return res.json(result);
  } catch (error: any) {
    console.error("Telegram notification error:", error);
    return res.status(500).json({ error: "Failed to send Telegram notification", message: error.message });
  }
});

// Helper for Mock Test, PDF, and Portal Events
async function sendTelegramAdminAlert(eventData: {
  eventType: 'mock_test_purchase' | 'mock_test_completed' | 'pdf_purchase';
  title: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  details?: Record<string, any>;
}) {
  const token = TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A";
  if (!token) return { success: false, message: "Token not configured" };

  let icon = "📢";
  let header = "ADMIN ALERT";
  if (eventData.eventType === 'mock_test_purchase') {
    icon = "📝";
    header = "MOCK TEST ENROLLED";
  } else if (eventData.eventType === 'mock_test_completed') {
    icon = "🎯";
    header = "MOCK TEST SUBMITTED & EVALUATED";
  } else if (eventData.eventType === 'pdf_purchase') {
    icon = "📑";
    header = "DIGITAL PDF UNLOCKED";
  }

  const name = escapeTelegramHtml(eventData.studentName || 'Verified Aspirant');
  const email = escapeTelegramHtml(eventData.studentEmail || 'N/A');
  const testTitle = escapeTelegramHtml(eventData.title || 'NEET Study Item');
  
  let extraLines = "";
  if (eventData.details) {
    for (const [k, v] of Object.entries(eventData.details)) {
      if (v !== undefined && v !== null && v !== '') {
        extraLines += `\n🔹 <b>${escapeTelegramHtml(k)}:</b> ${escapeTelegramHtml(String(v))}`;
      }
    }
  }

  const htmlMsg = `${icon} <b>${header}</b>
👤 <b>Student:</b> ${name}
📧 <b>Email:</b> ${email}
📚 <b>Subject / Item:</b> ${testTitle}${extraLines}
⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  const plainMsg = `${icon} ${header}\nStudent: ${eventData.studentName || 'Verified Aspirant'}\nEmail: ${eventData.studentEmail || 'N/A'}\nItem: ${eventData.title || ''}\nTime: ${new Date().toLocaleString('en-IN')}`;

  for (const chatId of TELEGRAM_ADMIN_CHAT_IDS) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMsg,
          parse_mode: "HTML"
        })
      });
    } catch (e: any) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainMsg
          })
        });
      } catch (err2) {}
    }
  }

  return { success: true };
}

// Telegram Event Alert Endpoint (Mock Test, PDF, Evaluation)
app.post("/api/telegram/notify-event", async (req, res) => {
  try {
    const { eventType, title, studentName, studentEmail, studentPhone, details } = req.body;
    const result = await sendTelegramAdminAlert({
      eventType,
      title,
      studentName,
      studentEmail,
      studentPhone,
      details
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to dispatch alert", message: err.message });
  }
});

// Telegram Test Message Endpoint (Allows Admin to test Bot in 1-Click)
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { token } = req.body;
    const effectiveToken = token || TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!effectiveToken) {
      return res.status(400).json({
        success: false,
        message: "No Telegram Bot Token provided. Please add TELEGRAM_BOT_TOKEN in settings."
      });
    }

    const testOrder = {
      id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      userName: "Dr. Faisal Fayaz (Test Aspirant)",
      customer: { contact: "+91 9876543210" },
      shippingAddress: {
        fullName: "Dr. Faisal Fayaz",
        phoneNumber: "9876543210",
        addressLine1: "AIIMS Campus, Medical Enclave",
        district: "Srinagar",
        state: "Jammu and Kashmir",
        pincode: "190001"
      },
      items: [
        { title: "NEET UG Biology Complete Handbook", quantity: 1, price: 399 }
      ],
      totalAmount: 399,
      paymentStatus: "Test Verified",
      paymentId: "pay_test_sandbox_123"
    };

    const result = await sendTelegramOrderNotification(testOrder, effectiveToken);
    return res.json({
      success: true,
      message: "Test message dispatched to Admin Chat IDs",
      details: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Telegram Config Update Endpoint (Allows dynamic token setup from Admin UI)
app.post("/api/telegram/config", (req, res) => {
  const { botToken } = req.body;
  if (typeof botToken === "string") {
    TELEGRAM_BOT_TOKEN = botToken.trim();
    return res.json({
      success: true,
      message: "Telegram Bot Token updated successfully",
      isConfigured: Boolean(TELEGRAM_BOT_TOKEN)
    });
  }
  return res.status(400).json({ error: "Invalid botToken" });
});

// Telegram Batch Combined Invoices PDF Dispatch
app.post("/api/telegram/send-batch-invoices", async (req, res) => {
  try {
    const { orders, orderIds, token, caption } = req.body;
    const effectiveToken = token || TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!effectiveToken) {
      return res.status(400).json({ success: false, error: "Telegram Bot Token is not configured" });
    }

    const db = loadDatabase();
    let targetOrders: any[] = [];

    if (Array.isArray(orders) && orders.length > 0) {
      targetOrders = orders;
    } else if (Array.isArray(orderIds) && orderIds.length > 0) {
      targetOrders = db.orders.filter(o => orderIds.includes(o.id) || orderIds.includes(o.id.replace(/^#/, '')));
    }

    if (targetOrders.length === 0) {
      return res.status(400).json({ success: false, error: "No orders found to generate invoice batch" });
    }

    const doc = generateCombinedInvoicesPdfDoc(targetOrders);
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const filename = `Batch_Invoices_${targetOrders.length}_Orders_${Date.now()}.pdf`;

    const totalRevenue = targetOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.price || 0)), 0);
    const defaultCaption = caption || 
`📦 <b>BATCH INVOICES PACKAGE (${targetOrders.length} ORDERS)</b>
💰 <b>Total Revenue:</b> Rs. ${totalRevenue}
📄 <i>Combined multi-page PDF invoice file for direct download & label printing.</i>`;

    const results = [];
    for (const chatId of TELEGRAM_ADMIN_CHAT_IDS) {
      try {
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("document", pdfBlob, filename);
        formData.append("caption", defaultCaption);
        formData.append("parse_mode", "HTML");

        const resp = await fetch(`https://api.telegram.org/bot${effectiveToken}/sendDocument`, {
          method: "POST",
          body: formData
        });
        const data = await resp.json();
        results.push({ chatId, ok: data.ok, description: data.description });
      } catch (err: any) {
        results.push({ chatId, ok: false, error: err.message });
      }
    }

    return res.json({
      success: results.some(r => r.ok),
      ordersCount: targetOrders.length,
      results
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Create Razorpay Order
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, receipt, notes, customer } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid order amount" });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If Razorpay live keys are configured, create the authentic order via Razorpay API
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const razorpayInstance = new Razorpay({
          key_id: RAZORPAY_KEY_ID,
          key_secret: RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: notes || {}
        });

        if (rzpOrder && rzpOrder.id) {
          orderId = rzpOrder.id;
        }
      } catch (rzpErr: any) {
        console.warn("Razorpay API order creation notice:", rzpErr.message);
      }
    }

    // Forward order initiation to Pipedream webhook for server tracking
    try {
      if (PIPEDREAM_WEBHOOK_URL) {
        fetch(PIPEDREAM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "order.created",
            order_id: orderId,
            amount: amountInPaise,
            currency: "INR",
            receipt: receipt || `rcpt_${Date.now()}`,
            customer: customer || {},
            notes: notes || {},
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.warn("Pipedream order logging non-blocking error:", err.message));
      }
    } catch (e) {
      console.warn("Pipedream fetch error:", e);
    }

    return res.json({
      success: true,
      order_id: orderId,
      amount: amountInPaise,
      currency: "INR",
      key_id: RAZORPAY_KEY_ID,
      receipt: receipt || `rcpt_${Date.now()}`
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(500).json({ error: "Failed to create order", message: error.message });
  }
});

// 2. Verify Razorpay Payment Signature (Server-Authoritative HMAC-SHA256 + Purchase Unlock)
app.post("/api/payment/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data, mockTestUnlock } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing required payment parameters" });
    }

    let isValid = false;
    const isSandboxBypassAllowed =
      process.env.ALLOW_SANDBOX_PAYMENTS === "true" ||
      (!RAZORPAY_KEY_SECRET && process.env.NODE_ENV !== "production");

    // Server-side HMAC-SHA256 signature verification
    if (razorpay_signature && RAZORPAY_KEY_SECRET && razorpay_signature !== "sandbox_verified_signature") {
      const generated_signature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const genBuf = Buffer.from(generated_signature, "hex");
      const sigBuf = Buffer.from(String(razorpay_signature), "hex");
      isValid = genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);
    } else if (razorpay_signature === "sandbox_verified_signature" && isSandboxBypassAllowed) {
      isValid = Boolean(razorpay_payment_id && String(razorpay_payment_id).startsWith("pay_"));
    }

    // Call Pipedream verification webhook
    try {
      if (PIPEDREAM_WEBHOOK_URL) {
        await fetch(PIPEDREAM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "payment.verification",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            is_valid: isValid,
            order_data: order_data || {},
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (e: any) {
      console.warn("Pipedream webhook notification error:", e.message);
    }

    // Persist verified Mock Test / Pass purchase server-side when valid
    if (isValid && mockTestUnlock && mockTestUnlock.testId && (mockTestUnlock.userEmail || mockTestUnlock.userId)) {
      try {
        const db = loadDatabase();
        if (!Array.isArray(db.mock_purchases)) db.mock_purchases = [];
        const purchaseRecord = {
          id: `purch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: mockTestUnlock.userId || mockTestUnlock.userEmail,
          userEmail: String(mockTestUnlock.userEmail || "").toLowerCase().trim(),
          testId: mockTestUnlock.testId,
          packageType: mockTestUnlock.packageType || undefined,
          amount: Number(mockTestUnlock.amount || order_data?.amount || 0),
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          verifiedServerSide: true,
          purchasedAt: new Date().toISOString()
        };
        const exists = db.mock_purchases.some(
          (p: any) =>
            p.paymentId === razorpay_payment_id ||
            (p.userEmail === purchaseRecord.userEmail && p.testId === purchaseRecord.testId)
        );
        if (!exists) {
          db.mock_purchases.unshift(purchaseRecord);
          saveDatabase(db);
          syncToFirebaseRTDB("mock_purchases", db.mock_purchases).catch(() => {});
        }
      } catch (pErr: any) {
        console.warn("Server purchase unlock persistence note:", pErr.message);
      }
    }

    // Trigger Telegram Notification for verified payment
    if (isValid && order_data) {
      sendTelegramOrderNotification({
        id: razorpay_order_id,
        userName: order_data.userEmail || order_data.userName,
        shippingAddress: order_data.shippingAddress,
        items: order_data.items,
        totalAmount: order_data.amount,
        paymentStatus: "PAID",
        paymentId: razorpay_payment_id
      }).catch(err => console.warn("Telegram background dispatch:", err.message));
    }

    if (isValid) {
      return res.json({
        success: true,
        message: "Payment verified successfully",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid HMAC signature."
      });
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying payment", error: error.message });
  }
});

// 3A. Cloudflare R2 Raw Binary PDF Direct Upload (Preserves original binary bytes without conversion)
app.post("/api/r2/upload-binary-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No PDF file attached in multipart form." });
    }

    const file = req.file;
    const originalName = file.originalname || "NEET_Notes.pdf";
    const cleanFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeFilename = cleanFilename.toLowerCase().endsWith(".pdf") ? cleanFilename : `${cleanFilename}.pdf`;
    
    // Store in clean 'pdfs/' R2 folder preserving .pdf extension
    const objectKey = `pdfs/${Date.now()}_${safeFilename}`;
    const fileBuffer = file.buffer;
    const mimeType = "application/pdf";
    const fileSize = file.size;
    const uploadDate = new Date().toISOString();
    const productId = req.body.productId || "";
    const productTitle = req.body.productTitle || "";

    // Cache locally for instant high-speed streaming
    fileBufferCache.set(objectKey, { buffer: fileBuffer, contentType: mimeType });

    // Upload direct binary to Cloudflare R2 S3 bucket
    if (r2Client) {
      try {
        const uploadCommand = new PutObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            filename: encodeURIComponent(originalName),
            filesize: String(fileSize),
            mimetype: mimeType,
            uploaddate: uploadDate,
            productid: encodeURIComponent(productId),
            producttitle: encodeURIComponent(productTitle)
          }
        });
        await r2Client.send(uploadCommand);
      } catch (r2Err: any) {
        console.warn("Cloudflare R2 binary PDF upload warning:", r2Err.message);
      }
    }

    const proxyUrl = `/api/r2/file/${objectKey}`;
    const downloadUrl = `/api/pdf/download/${objectKey}`;

    return res.json({
      success: true,
      key: objectKey,
      url: proxyUrl,
      downloadUrl: downloadUrl,
      metadata: {
        fileName: originalName,
        objectKey: objectKey,
        fileSize: fileSize,
        mimeType: mimeType,
        uploadDate: uploadDate,
        productId: productId,
        productTitle: productTitle
      },
      message: "Binary PDF uploaded directly to Cloudflare R2 without conversion"
    });
  } catch (err: any) {
    console.error("Binary PDF Upload error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3B. Cloudflare R2 Standard Base64 Image Upload API (handles JSON & multipart forms)
app.post(["/api/r2/upload", "/api/r2/upload-base64"], upload.any(), async (req, res) => {
  try {
    const filename = req.body?.filename || (req.files && Array.isArray(req.files) && req.files[0]?.originalname) || `upload-${Date.now()}`;
    const contentType = req.body?.contentType || (req.files && Array.isArray(req.files) && req.files[0]?.mimetype) || "image/jpeg";
    const folder = req.body?.folder || "products";

    let fileBuffer: Buffer | null = null;
    if (req.files && Array.isArray(req.files) && req.files.length > 0 && req.files[0].buffer) {
      fileBuffer = req.files[0].buffer;
    } else {
      const rawBase64 = req.body?.base64Data || req.body?.image || req.body?.file || "";
      if (rawBase64) {
        const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "");
        fileBuffer = Buffer.from(cleanBase64, "base64");
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "File data or base64Data is required" });
    }

    const mimeType = contentType || "image/jpeg";
    const safeFolder = folder || "products";
    const objectKey = `${safeFolder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Cache locally so it is guaranteed to serve instantly via proxy
    fileBufferCache.set(objectKey, { buffer: fileBuffer, contentType: mimeType });

    if (r2Client) {
      try {
        const uploadCommand = new PutObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
        });

        await r2Client.send(uploadCommand);

        // Return the reliable proxy URL that will serve the image directly to browsers
        const proxyUrl = `/api/r2/file/${objectKey}`;

        return res.json({
          success: true,
          key: objectKey,
          url: proxyUrl,
          message: "Uploaded to Cloudflare R2 successfully"
        });
      } catch (r2Error: any) {
        console.warn("R2 direct upload warning, fallback to stored asset:", r2Error.message);
      }
    }

    // Proxy URL for preview
    const proxyUrl = `/api/r2/file/${objectKey}`;
    return res.json({
      success: true,
      key: objectKey,
      url: proxyUrl,
      message: "File processed and ready"
    });
  } catch (error: any) {
    console.error("R2 Upload error:", error);
    return res.status(500).json({ error: "Failed to upload file", message: error.message });
  }
});

// Helper to extract clean object key from any URL or path
function extractCleanR2Key(inputKey: string): string {
  let clean = decodeURIComponent(inputKey || "").trim();
  if (clean.includes(".r2.dev/")) {
    clean = clean.split(".r2.dev/")[1] || clean;
  } else if (clean.includes(".r2.cloudflarestorage.com/")) {
    clean = clean.split(".r2.cloudflarestorage.com/")[1] || clean;
    if (clean.startsWith("ncertify/")) {
      clean = clean.replace("ncertify/", "");
    }
  } else if (clean.startsWith("/api/r2/file/")) {
    clean = clean.replace("/api/r2/file/", "");
  } else if (clean.startsWith("api/r2/file/")) {
    clean = clean.replace("api/r2/file/", "");
  } else if (clean.startsWith("/api/pdf/download/")) {
    clean = clean.replace("/api/pdf/download/", "");
  } else if (clean.startsWith("api/pdf/download/")) {
    clean = clean.replace("api/pdf/download/", "");
  }
  return clean.replace(/^\/+/, "");
}

// 4. Cloudflare R2 Proxy File Serving (Solves private S3 403 & CORS issues)
app.options(["/api/r2/file/*", "/api/r2/file", "/api/pdf/download/*", "/api/pdf/download"], (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.sendStatus(204);
});

app.get("/api/r2/file/*", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  try {
    const rawKey = req.params[0] || (req.query.key as string) || "";
    if (!rawKey) {
      return res.status(404).send("File key missing");
    }

    const cleanKey = extractCleanR2Key(rawKey);

    // 1. Check in-memory cache first
    const cached = fileBufferCache.get(cleanKey) || fileBufferCache.get(rawKey);
    if (cached) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached.buffer);
    }

    // 2. Fetch from Cloudflare R2 S3 Bucket
    if (r2Client) {
      try {
        const getCmd = new GetObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET,
          Key: cleanKey
        });
        const r2Res = await r2Client.send(getCmd);
        if (r2Res.Body) {
          const bytes = await r2Res.Body.transformToByteArray();
          const buffer = Buffer.from(bytes);
          const isPdf = cleanKey.toLowerCase().endsWith(".pdf") || (r2Res.ContentType && r2Res.ContentType.includes("pdf"));
          const cType = isPdf ? "application/pdf" : (r2Res.ContentType || "image/jpeg");
          
          fileBufferCache.set(cleanKey, { buffer, contentType: cType });
          res.setHeader("Content-Type", cType);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return res.send(buffer);
        }
      } catch (s3Err: any) {
        console.warn("Error fetching file from R2 S3:", s3Err.message);
      }
    }

    // 3. If rawKey was an external HTTP/HTTPS URL, proxy it safely
    if (rawKey.startsWith("http://") || rawKey.startsWith("https://")) {
      try {
        const extResp = await fetch(rawKey);
        if (extResp.ok) {
          const bytes = await extResp.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const cType = extResp.headers.get("content-type") || "application/pdf";
          res.setHeader("Content-Type", cType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(buffer);
        }
      } catch (extErr: any) {
        console.warn("External file proxy error:", extErr.message);
      }
    }

    // 4. Server-side fallback to Cloudflare public dev URL
    if (CLOUDFLARE_R2_PUBLIC_DEV_URL && cleanKey) {
      try {
        const devUrl = `${CLOUDFLARE_R2_PUBLIC_DEV_URL.replace(/\/+$/, '')}/${cleanKey}`;
        const devResp = await fetch(devUrl);
        if (devResp.ok) {
          const bytes = await devResp.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const isPdf = cleanKey.toLowerCase().endsWith(".pdf");
          const cType = isPdf ? "application/pdf" : (devResp.headers.get("content-type") || "image/jpeg");
          fileBufferCache.set(cleanKey, { buffer, contentType: cType });
          res.setHeader("Content-Type", cType);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return res.send(buffer);
        }
      } catch (devErr: any) {
        // Continue to 404
      }
    }

    return res.status(404).send("File not found");
  } catch (e: any) {
    console.error("File serve error:", e);
    return res.status(500).send("Error serving file");
  }
});

// Direct Binary PDF Download Endpoint with Content-Disposition Attachment
app.get(["/api/pdf/download/*", "/api/r2/download/*", "/api/pdf/download", "/api/r2/download"], async (req, res) => {
  try {
    const rawKey = req.params[0] || (req.query.key as string) || (req.query.url as string) || "";
    if (!rawKey) {
      return res.status(404).send("File key required");
    }

    const cleanKey = extractCleanR2Key(rawKey);
    let buffer: Buffer | null = null;
    let contentType = "application/pdf";
    let downloadFilename = (req.query.filename as string) || path.basename(cleanKey) || "NEET_Notes.pdf";
    if (!downloadFilename.toLowerCase().endsWith(".pdf")) {
      downloadFilename = `${downloadFilename}.pdf`;
    }

    // 1. Check in-memory cache
    const cached = fileBufferCache.get(cleanKey) || fileBufferCache.get(rawKey);
    if (cached) {
      buffer = cached.buffer;
      contentType = cached.contentType;
    } else if (r2Client) {
      // 2. Fetch from Cloudflare R2
      try {
        const getCmd = new GetObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET,
          Key: cleanKey
        });
        const r2Res = await r2Client.send(getCmd);
        if (r2Res.Body) {
          const bytes = await r2Res.Body.transformToByteArray();
          buffer = Buffer.from(bytes);
          contentType = r2Res.ContentType || "application/pdf";
        }
      } catch (r2Err: any) {
        console.warn("R2 download fetch note:", r2Err.message);
      }
    }

    // 3. Fallback: If rawKey or cleanKey is an external URL, fetch directly
    if (!buffer && (rawKey.startsWith("http://") || rawKey.startsWith("https://"))) {
      try {
        const extResp = await fetch(rawKey);
        if (extResp.ok) {
          const bytes = await extResp.arrayBuffer();
          buffer = Buffer.from(bytes);
          contentType = extResp.headers.get("content-type") || "application/pdf";
        }
      } catch (extErr: any) {
        console.warn("External PDF download fetch error:", extErr.message);
      }
    }

    if (!buffer) {
      return res.status(404).send("Original PDF file not found in R2 storage");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(buffer);
  } catch (err: any) {
    console.error("PDF Download error:", err);
    return res.status(500).send("Error downloading PDF file");
  }
});

// 5. Cloudflare R2 List Objects
app.get("/api/r2/list", async (_req, res) => {
  try {
    if (r2Client) {
      const listCommand = new ListObjectsV2Command({
        Bucket: CLOUDFLARE_R2_BUCKET,
        MaxKeys: 30
      });
      const data = await r2Client.send(listCommand);
      return res.json({
        success: true,
        bucket: CLOUDFLARE_R2_BUCKET,
        contents: data.Contents || []
      });
    }
    return res.json({ success: true, bucket: CLOUDFLARE_R2_BUCKET, contents: [] });
  } catch (error: any) {
    return res.json({ success: false, message: error.message, contents: [] });
  }
});

// -------------------------------------------------------------
// 5B. CLOUDFLARE R2 CREDENTIALS & DETAILS API (Admin Panel Sync)
// -------------------------------------------------------------
app.get("/api/cloudflare/config", (_req, res) => {
  try {
    const db = loadDatabase();
    const savedCf = db.settings?.cloudflare || {};
    return res.json({
      success: true,
      accountId: savedCf.accountId || CF_ACCOUNT_ID,
      bucketName: savedCf.bucketName || CLOUDFLARE_R2_BUCKET,
      accessKeyId: savedCf.accessKeyId || CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: savedCf.secretAccessKey || CLOUDFLARE_R2_SECRET_KEY,
      s3Endpoint: savedCf.s3Endpoint || CLOUDFLARE_R2_ENDPOINT,
      publicDevUrl: savedCf.publicDevUrl || CLOUDFLARE_R2_PUBLIC_DEV_URL,
      customCdnDomain: savedCf.customCdnDomain !== undefined ? savedCf.customCdnDomain : CLOUDFLARE_CUSTOM_CDN,
      apiToken: savedCf.apiToken || CF_API_TOKEN,
      d1DatabaseId: savedCf.d1DatabaseId || CF_D1_DATABASE_ID,
      d1Name: savedCf.d1Name || CF_D1_NAME,
      isConfigured: Boolean(r2Client),
      isD1Configured: Boolean(CF_API_TOKEN)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/cloudflare/config", async (req, res) => {
  try {
    const { accountId, bucketName, accessKeyId, secretAccessKey, s3Endpoint, publicDevUrl, customCdnDomain, apiToken, d1DatabaseId, d1Name } = req.body;
    if (accountId && typeof accountId === "string") CF_ACCOUNT_ID = accountId.trim();
    if (bucketName && typeof bucketName === "string") CLOUDFLARE_R2_BUCKET = bucketName.trim();
    if (accessKeyId && typeof accessKeyId === "string") CLOUDFLARE_R2_ACCESS_KEY = accessKeyId.trim();
    if (secretAccessKey && typeof secretAccessKey === "string") CLOUDFLARE_R2_SECRET_KEY = secretAccessKey.trim();
    if (s3Endpoint && typeof s3Endpoint === "string") CLOUDFLARE_R2_ENDPOINT = s3Endpoint.trim();
    if (publicDevUrl && typeof publicDevUrl === "string") CLOUDFLARE_R2_PUBLIC_DEV_URL = publicDevUrl.trim();
    if (customCdnDomain !== undefined) CLOUDFLARE_CUSTOM_CDN = String(customCdnDomain || "").trim();
    if (apiToken !== undefined) CF_API_TOKEN = String(apiToken || "").trim();
    if (d1DatabaseId && typeof d1DatabaseId === "string") CF_D1_DATABASE_ID = d1DatabaseId.trim();
    if (d1Name && typeof d1Name === "string") CF_D1_NAME = d1Name.trim();

    // Re-initialize AWS S3 Client with updated credentials
    initR2Client();

    // Persist in local database settings
    const db = loadDatabase();
    db.settings = {
      ...(db.settings || {}),
      cloudflare: {
        accountId: CF_ACCOUNT_ID,
        bucketName: CLOUDFLARE_R2_BUCKET,
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
        s3Endpoint: CLOUDFLARE_R2_ENDPOINT,
        publicDevUrl: CLOUDFLARE_R2_PUBLIC_DEV_URL,
        customCdnDomain: CLOUDFLARE_CUSTOM_CDN,
        apiToken: CF_API_TOKEN,
        d1DatabaseId: CF_D1_DATABASE_ID,
        d1Name: CF_D1_NAME
      }
    };
    saveDatabase(db);

    // If API Token is present, automatically initialize D1 tables & sync all products
    if (CF_API_TOKEN) {
      initD1Tables().catch(err => console.warn("D1 tables init note:", err));
      syncAllProductsToD1Internal().catch(err => console.warn("D1 sync note:", err));
    }

    return res.json({
      success: true,
      message: "Cloudflare R2 and D1 credentials successfully saved!",
      isD1Configured: Boolean(CF_API_TOKEN)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/cloudflare/test", async (_req, res) => {
  try {
    if (!r2Client) {
      initR2Client();
    }
    if (!r2Client) {
      return res.status(400).json({ success: false, error: "Cloudflare R2 client could not be initialized. Please check credentials." });
    }

    const listCmd = new ListObjectsV2Command({
      Bucket: CLOUDFLARE_R2_BUCKET,
      MaxKeys: 8
    });
    const s3Res = await r2Client.send(listCmd);
    const objectCount = s3Res.Contents ? s3Res.Contents.length : 0;
    const sampleKeys = (s3Res.Contents || []).map(o => o.Key).filter(Boolean);

    return res.json({
      success: true,
      message: `Successfully connected to Cloudflare R2 bucket "${CLOUDFLARE_R2_BUCKET}"! Verified ${objectCount} sample objects.`,
      bucket: CLOUDFLARE_R2_BUCKET,
      endpoint: CLOUDFLARE_R2_ENDPOINT,
      sampleObjects: sampleKeys
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Cloudflare R2 connection error: ${err.message}`
    });
  }
});

// CLOUDFLARE D1 DATABASE MANAGEMENT APIS
// 1. Sync All Local Products into Cloudflare D1
app.post("/api/cloudflare/d1/sync-products", async (_req, res) => {
  try {
    if (!CF_API_TOKEN) {
      return res.status(400).json({
        success: false,
        error: "Cloudflare API Token is not set. Please enter your Cloudflare API Token in Admin Settings > Cloudflare R2 & D1 Database."
      });
    }

    const db = loadDatabase();
    await initD1Tables();

    let syncedCount = 0;
    const errors: string[] = [];

    for (const product of db.products) {
      if (!product || !product.id) continue;
      const result = await queryCloudflareD1(
        `INSERT OR REPLACE INTO products (id, title, author, type, category, price, originalPrice, rating, reviewsCount, coverImage, sampleImages, pdfUrl, description, features, tags, pages, edition, isbn, inStock, isBestSeller, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.title || '',
          product.author || 'Verified Specialists',
          product.type || 'book',
          product.category || 'General',
          Number(product.price || 0),
          Number(product.originalPrice || 0),
          Number(product.rating || 4.8),
          Number(product.reviewsCount || 0),
          typeof product.coverImage === 'string' && !product.coverImage.startsWith('data:') ? product.coverImage : '',
          JSON.stringify(product.sampleImages || []),
          typeof product.pdfUrl === 'string' && !product.pdfUrl.startsWith('data:') ? product.pdfUrl : '',
          product.description || '',
          JSON.stringify(product.features || []),
          JSON.stringify(product.tags || []),
          Number(product.pages || 0),
          product.edition || '',
          product.isbn || '',
          product.inStock !== false ? 1 : 0,
          product.isBestSeller ? 1 : 0,
          product.createdAt || new Date().toISOString()
        ]
      );
      if (result && result.success !== false) {
        syncedCount++;
      } else if (result?.errors && result.errors.length > 0) {
        errors.push(result.errors[0]?.message || 'Query error');
      }
    }

    return res.json({
      success: syncedCount > 0 || errors.length === 0,
      syncedCount,
      totalProducts: db.products.length,
      errors: errors.slice(0, 3),
      message: `Successfully synchronized ${syncedCount} of ${db.products.length} products to Cloudflare D1 (${CF_D1_NAME || CF_D1_DATABASE_ID})!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Execute SQL query on Cloudflare D1
app.post("/api/cloudflare/d1/query", async (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: "SQL query string is required" });
    }
    if (!CF_API_TOKEN) {
      return res.status(400).json({
        success: false,
        error: "Cloudflare API Token not configured. Please add your token in Cloudflare Settings."
      });
    }

    const d1Result = await queryCloudflareD1(sql, params);
    return res.json(d1Result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test Cloudflare D1: SELECT count(*) as products FROM products;
app.get("/api/cloudflare/d1/test", async (_req, res) => {
  try {
    if (!CF_API_TOKEN) {
      return res.json({
        success: false,
        isConfigured: false,
        message: "Cloudflare API Token is not set. Enter your Cloudflare API Token in the Admin Settings tab to enable D1 Database sync.",
        databaseId: CF_D1_DATABASE_ID,
        accountId: CF_ACCOUNT_ID
      });
    }

    await initD1Tables();
    const result = await queryCloudflareD1("SELECT count(*) as products FROM products;");
    
    // Cloudflare D1 response format: { result: [ { results: [ { products: 8 } ] } ], success: true }
    let count = 0;
    if (result && Array.isArray(result.result) && result.result[0]?.results?.[0]) {
      const row = result.result[0].results[0];
      count = Number(row.products ?? row["count(*)"] ?? 0);
    }

    return res.json({
      success: Boolean(result?.success),
      isConfigured: true,
      count,
      databaseId: CF_D1_DATABASE_ID,
      accountId: CF_ACCOUNT_ID,
      raw: result,
      message: result?.success 
        ? `Connected to Cloudflare D1! "SELECT count(*) FROM products;" returned ${count} product(s).` 
        : `Cloudflare D1 query returned: ${JSON.stringify(result?.errors || result?.message || result)}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download D1 Seed SQL (.sql) Migration file
app.get("/api/cloudflare/d1/export-sql", (_req, res) => {
  try {
    const db = loadDatabase();
    let sqlContent = `-- NEET MBBS Doctors Store - Cloudflare D1 Schema & Data Migration\n-- Database: ${CF_D1_NAME} (${CF_D1_DATABASE_ID})\n\n`;
    sqlContent += `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT, author TEXT, type TEXT, category TEXT, price REAL, originalPrice REAL, rating REAL, reviewsCount INTEGER, coverImage TEXT, sampleImages TEXT, pdfUrl TEXT, description TEXT, features TEXT, tags TEXT, pages INTEGER, edition TEXT, isbn TEXT, inStock INTEGER, isBestSeller INTEGER, createdAt TEXT);\n\n`;

    for (const p of db.products) {
      if (!p || !p.id) continue;
      const escape = (val: any) => `'${String(val || '').replace(/'/g, "''")}'`;
      const num = (val: any) => Number(val || 0);
      sqlContent += `INSERT OR REPLACE INTO products (id, title, author, type, category, price, originalPrice, rating, reviewsCount, coverImage, sampleImages, pdfUrl, description, features, tags, pages, edition, isbn, inStock, isBestSeller, createdAt) VALUES (${escape(p.id)}, ${escape(p.title)}, ${escape(p.author || 'Verified Specialists')}, ${escape(p.type || 'book')}, ${escape(p.category || 'General')}, ${num(p.price)}, ${num(p.originalPrice)}, ${num(p.rating || 4.8)}, ${num(p.reviewsCount)}, ${escape(p.coverImage)}, ${escape(JSON.stringify(p.sampleImages || []))}, ${escape(p.pdfUrl)}, ${escape(p.description)}, ${escape(JSON.stringify(p.features || []))}, ${escape(JSON.stringify(p.tags || []))}, ${num(p.pages)}, ${escape(p.edition)}, ${escape(p.isbn)}, ${p.inStock !== false ? 1 : 0}, ${p.isBestSeller ? 1 : 0}, ${escape(p.createdAt || new Date().toISOString())});\n`;
    }

    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="cloudflare_d1_products.sql"`);
    return res.send(sqlContent);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================
// REAL-TIME CLOUDFLARE D1 LEADERBOARD & USER PROFILE API
// =============================================================

// Sync user profile photo & details to Cloudflare D1
app.post("/api/user/sync-profile", async (req, res) => {
  try {
    const { uid, email, displayName, photoURL, avatarUrl } = req.body || {};
    if (!email && !uid) {
      return res.status(400).json({ success: false, error: "uid or email required" });
    }

    const cleanUid = uid || email;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanName = displayName || cleanEmail.split('@')[0] || 'NEET Aspirant';
    let safePhoto = typeof photoURL === 'string' ? photoURL : '';
    if (safePhoto.startsWith('data:')) {
      try {
        const cleanBase64 = safePhoto.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(cleanBase64, 'base64');
        const mimeType = safePhoto.split(';')[0].replace('data:', '') || 'image/jpeg';
        const objectKey = `avatars/user_${Date.now()}_${cleanUid.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16)}.jpg`;
        fileBufferCache.set(objectKey, { buffer: fileBuffer, contentType: mimeType });
        if (r2Client) {
          r2Client.send(new PutObjectCommand({
            Bucket: CLOUDFLARE_R2_BUCKET,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: mimeType,
          })).catch(() => {});
        }
        safePhoto = `/api/r2/file/${objectKey}`;
      } catch (err: any) {
        console.warn('Avatar base64 save warning:', err.message);
      }
    }
    const safeAvatar = typeof avatarUrl === 'string' ? avatarUrl : '';

    if (CF_API_TOKEN) {
      await initD1Tables();
      // Upsert into users table
      await queryCloudflareD1(
        `INSERT INTO users (uid, email, displayName, role, createdAt, totalOrders, totalSpent, photoURL, avatarUrl)
         VALUES (?, ?, ?, 'customer', datetime('now'), 0, 0, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           displayName = excluded.displayName,
           photoURL = COALESCE(NULLIF(excluded.photoURL, ''), users.photoURL),
           avatarUrl = COALESCE(NULLIF(excluded.avatarUrl, ''), users.avatarUrl);`,
        [cleanUid, cleanEmail, cleanName, safePhoto, safeAvatar]
      );

      // Also update any existing leaderboard attempts for this user so their profile picture reflects immediately
      if (safePhoto || safeAvatar) {
        await queryCloudflareD1(
          `UPDATE mock_test_attempts SET 
             userName = ?, 
             photoURL = CASE WHEN ? != '' THEN ? ELSE photoURL END,
             avatarUrl = CASE WHEN ? != '' THEN ? ELSE avatarUrl END
           WHERE userId = ? OR userEmail = ?;`,
          [cleanName, safePhoto, safePhoto, safeAvatar, safeAvatar, cleanUid, cleanEmail]
        );
      }
    }

    return res.json({ success: true, message: "Profile synced to Cloudflare D1", photoURL: safePhoto, avatarUrl: safeAvatar });
  } catch (err: any) {
    console.warn("Profile sync notice:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Submit / Record Test Attempt to Cloudflare D1
app.post("/api/leaderboard/submit", async (req, res) => {
  try {
    const attempt = req.body || {};
    if (!attempt.testId || !attempt.userId) {
      return res.status(400).json({ success: false, error: "testId and userId are required" });
    }

    const id = attempt.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safePhoto = typeof attempt.photoURL === 'string' && !attempt.photoURL.startsWith('data:') ? attempt.photoURL : '';
    const safeAvatar = typeof attempt.avatarUrl === 'string' ? attempt.avatarUrl : '';

    if (CF_API_TOKEN) {
      await initD1Tables();
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO mock_test_attempts 
         (id, testId, testTitle, testTypeCategory, subject, userId, userEmail, userName, photoURL, avatarUrl, score, maxMarks, accuracy, correctCount, incorrectCount, unansweredCount, timeSpentSeconds, submittedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          attempt.testId,
          attempt.testTitle || 'NEET Mock Test',
          attempt.testTypeCategory || 'chapter_wise',
          attempt.subject || 'All',
          attempt.userId,
          (attempt.userEmail || '').toLowerCase(),
          attempt.userName || 'NEET Aspirant',
          safePhoto,
          safeAvatar,
          Number(attempt.score || 0),
          Number(attempt.maxMarks || 720),
          Number(attempt.accuracy || 0),
          Number(attempt.correctCount || 0),
          Number(attempt.incorrectCount || 0),
          Number(attempt.unansweredCount || 0),
          Number(attempt.timeSpentSeconds || 0),
          attempt.submittedAt || new Date().toISOString()
        ]
      );
    }

    return res.json({ success: true, id, message: "Attempt recorded to Cloudflare D1" });
  } catch (err: any) {
    console.warn("Leaderboard submit notice:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch Real-time Leaderboard with Profile Pictures
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { category, testId, limit } = req.query;
    const maxEntries = Math.min(Number(limit) || 50, 100);

    let d1Entries: any[] = [];
    if (CF_API_TOKEN) {
      await initD1Tables();
      let sql = `SELECT * FROM mock_test_attempts WHERE 1=1`;
      const params: any[] = [];

      if (category && category !== 'all') {
        sql += ` AND testTypeCategory = ?`;
        params.push(String(category));
      }
      if (testId && testId !== 'all') {
        sql += ` AND testId = ?`;
        params.push(String(testId));
      }

      sql += ` ORDER BY score DESC, timeSpentSeconds ASC LIMIT ?`;
      params.push(maxEntries);

      const result = await queryCloudflareD1(sql, params);
      if (result && Array.isArray(result.result) && result.result[0]?.results) {
        d1Entries = result.result[0].results;
      }
    }

    // Assign rank numbers and ensure photoURL / avatar are resolved
    const ranked = d1Entries.map((item, idx) => ({
      rank: idx + 1,
      id: item.id,
      userId: item.userId,
      userEmail: item.userEmail,
      userName: item.userName || 'Verified Aspirant',
      testId: item.testId,
      testTitle: item.testTitle,
      testTypeCategory: item.testTypeCategory || 'chapter_wise',
      subject: item.subject,
      score: Number(item.score || 0),
      maxMarks: Number(item.maxMarks || 720),
      accuracy: Number(item.accuracy || 0),
      timeSpentSeconds: Number(item.timeSpentSeconds || 0),
      submittedAt: item.submittedAt,
      photoURL: item.photoURL || undefined,
      avatarUrl: item.avatarUrl || undefined
    }));

    return res.json({
      success: true,
      source: d1Entries.length > 0 ? "cloudflare_d1" : "fallback",
      count: ranked.length,
      entries: ranked
    });
  } catch (err: any) {
    console.warn("Leaderboard fetch error:", err.message);
    return res.status(500).json({ success: false, error: err.message, entries: [] });
  }
});

// -------------------------------------------------------------
// DATABASE REST API ENDPOINTS (Products, Orders, Users, Banners, etc.)
// -------------------------------------------------------------

// 1. PRODUCTS
app.get("/api/db/products", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, products: db.products });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/products", async (req, res) => {
  try {
    const db = loadDatabase();
    const product = req.body;
    if (!product || !product.title) {
      return res.status(400).json({ success: false, error: "Product title is required" });
    }
    if (!product.id) {
      product.id = `${product.type || 'item'}-${Date.now()}`;
    }
    const idx = db.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      db.products[idx] = { ...db.products[idx], ...product };
    } else {
      db.products.unshift(product);
    }
    saveDatabase(db);

    // Sync with Cloudflare D1
    syncProductToD1(product).catch(err => console.warn("D1 sync notice:", err));

    // Sync with Firebase Realtime Database
    syncToFirebaseRTDB("products", db.products).catch(e => console.warn(e));

    return res.json({ success: true, product, products: db.products });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/db/products/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    const update = req.body;
    const idx = db.products.findIndex(p => p.id === id);
    if (idx >= 0) {
      db.products[idx] = { ...db.products[idx], ...update };
      const updatedP = db.products[idx];
      saveDatabase(db);
      
      // Sync with Cloudflare D1
      syncProductToD1(updatedP).catch(err => console.warn("D1 sync notice:", err));

      syncToFirebaseRTDB("products", db.products).catch(e => console.warn(e));
      return res.json({ success: true, product: db.products[idx] });
    }
    return res.status(404).json({ success: false, error: "Product not found" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/db/products/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    db.products = db.products.filter(p => p.id !== id);
    saveDatabase(db);
    queryCloudflareD1(`DELETE FROM products WHERE id = ?`, [id]).catch(e => console.warn(e));
    syncToFirebaseRTDB("products", db.products).catch(e => console.warn(e));
    return res.json({ success: true, products: db.products });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. ORDERS
app.get("/api/db/orders", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, orders: db.orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/orders", async (req, res) => {
  try {
    const db = loadDatabase();
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }
    const idx = db.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      db.orders[idx] = { ...db.orders[idx], ...order };
    } else {
      db.orders.unshift(order);
    }
    saveDatabase(db);

    // Save payment record if paid
    if (order.paymentId) {
      db.payment_records.unshift({
        id: `pay-${Date.now()}`,
        orderId: order.id,
        paymentId: order.paymentId,
        gateway: order.paymentStatus?.includes('cod') ? 'COD' : 'Razorpay',
        amount: order.totalAmount,
        status: order.paymentStatus || 'paid',
        createdAt: new Date().toISOString()
      });
      saveDatabase(db);
    }

    // Save PDF access records for digital items
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.type === 'pdf' || item.pdfUrl) {
          db.pdf_access.unshift({
            id: `access-${Date.now()}-${item.productId}`,
            userId: order.userId,
            userEmail: order.userEmail,
            productId: item.productId,
            productTitle: item.title,
            pdfUrl: item.pdfUrl || '',
            orderId: order.id,
            grantedAt: new Date().toISOString()
          });
        }
      }
      saveDatabase(db);
    }

    // Async sync with Cloudflare D1
    queryCloudflareD1(
      `INSERT OR REPLACE INTO orders (id, userId, userEmail, userName, items, totalAmount, paymentId, razorpayOrderId, paymentStatus, shippingAddress, status, orderDate, invoiceNumber, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.userId || '',
        order.userEmail || '',
        order.userName || '',
        JSON.stringify(order.items || []),
        order.totalAmount || 0,
        order.paymentId || '',
        order.razorpayOrderId || '',
        order.paymentStatus || 'paid',
        JSON.stringify(order.shippingAddress || {}),
        order.status || 'new',
        order.orderDate || new Date().toISOString(),
        order.invoiceNumber || '',
        order.notes || ''
      ]
    ).catch(err => console.warn("D1 order sync:", err));

    // Sync with Firebase Realtime Database
    syncToFirebaseRTDB("orders", db.orders).catch(e => console.warn(e));

    // Automatically trigger Telegram notification with PDF Tax Invoice to both Admins
    sendTelegramOrderNotification(order).catch(e => console.warn("Auto Telegram order dispatch notice:", e));

    return res.json({ success: true, order, orders: db.orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/db/orders/:id/status", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    const { status, notes, deliveredDate } = req.body;
    const idx = db.orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      db.orders[idx].status = status;
      if (notes !== undefined) db.orders[idx].notes = notes;
      if (deliveredDate !== undefined) db.orders[idx].deliveredDate = deliveredDate;
      saveDatabase(db);
      queryCloudflareD1(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]).catch(e => console.warn(e));
      syncToFirebaseRTDB("orders", db.orders).catch(e => console.warn(e));
      return res.json({ success: true, order: db.orders[idx] });
    }
    return res.status(404).json({ success: false, error: "Order not found" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Single Order
app.delete("/api/db/orders/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    const initialCount = db.orders.length;
    db.orders = db.orders.filter(o => o.id !== id && o.id !== `ORD-${id}` && o.id !== id.replace(/^ORD-/, ''));
    
    // Also clean matching pdf_access and payment_records
    db.pdf_access = (db.pdf_access || []).filter(p => p.orderId !== id);
    db.payment_records = (db.payment_records || []).filter(p => p.orderId !== id);
    
    saveDatabase(db);
    queryCloudflareD1(`DELETE FROM orders WHERE id = ?`, [id]).catch(e => console.warn(e));
    syncToFirebaseRTDB("orders", db.orders).catch(e => console.warn(e));
    
    return res.json({
      success: true,
      message: `Order #${id} deleted successfully`,
      deleted: initialCount !== db.orders.length,
      orders: db.orders
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Batch Delete Multiple Orders
app.post("/api/db/orders/batch-delete", async (req, res) => {
  try {
    const db = loadDatabase();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of order IDs required" });
    }
    
    const idSet = new Set(ids.map(id => String(id).trim()));
    const initialCount = db.orders.length;
    
    db.orders = db.orders.filter(o => {
      const match = idSet.has(o.id) || idSet.has(o.id.replace(/^ORD-/, '')) || idSet.has(`ORD-${o.id}`);
      return !match;
    });

    db.pdf_access = (db.pdf_access || []).filter(p => !idSet.has(p.orderId));
    db.payment_records = (db.payment_records || []).filter(p => !idSet.has(p.orderId));

    saveDatabase(db);
    syncToFirebaseRTDB("orders", db.orders).catch(e => console.warn(e));

    for (const id of ids) {
      queryCloudflareD1(`DELETE FROM orders WHERE id = ?`, [id]).catch(() => {});
    }

    return res.json({
      success: true,
      deletedCount: initialCount - db.orders.length,
      orders: db.orders
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Standalone Printable Tax Invoice Endpoint (Can be opened & printed directly from Telegram/browser)
app.get("/api/invoice/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const rawId = req.params.id.replace(/^#/, '');
    const order = db.orders.find(o => o.id === rawId || o.id === `ORD-${rawId}` || o.invoiceNumber === rawId || o.invoiceNumber === `INV-${rawId}`);
    
    if (!order) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invoice Not Found</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
          <h2>Invoice #${rawId} Not Found</h2>
          <p>This order record may still be syncing with the cloud database.</p>
          <a href="/" style="display:inline-block; margin-top: 15px; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px;">Return to Store</a>
        </body>
        </html>
      `);
    }

    const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod');
    const invoiceDate = new Date(order.orderDate || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const itemsHtml = (order.items || []).map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">
          ${item.title}
          <div style="font-size: 10px; color: #64748b; font-weight: normal;">By ${item.author || 'NEET Faculty'}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">
          ${item.type === 'pdf' ? 'Digital PDF' : 'Physical Book'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${item.quantity || 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${(item.price || 0) * (item.quantity || 1)}</td>
      </tr>
    `).join('');

    const paymentSectionHtml = isCod ? `
      <div style="background: #fffbeb; border: 1.5px solid #f59e0b; padding: 12px 16px; border-radius: 8px; display: inline-block;">
        <div style="font-size: 12px; font-weight: 800; color: #b45309; text-transform: uppercase;">
          💵 CASH ON DELIVERY (COD) • PENDING COLLECTION
        </div>
        <div style="font-size: 11px; color: #78350f; margin-top: 4px; font-weight: 700;">
          Collect from Customer: ₹${order.totalAmount}
        </div>
        <div style="font-size: 10px; color: #92400e; font-family: monospace; margin-top: 3px;">
          Payment Method: Cash on Delivery (COD)
        </div>
        <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 2px;">
          Ref ID: COD_${order.id.replace(/^ORD-/, '')} | #${order.id}
        </div>
      </div>
    ` : `
      <div style="background: #ecfdf5; border: 1.5px solid #10b981; padding: 12px 16px; border-radius: 8px; display: inline-block;">
        <div style="font-size: 12px; font-weight: 800; color: #065f46; text-transform: uppercase;">
          ✓ PAID via Razorpay • Verified Online
        </div>
        <div style="font-size: 10px; color: #047857; font-family: monospace; margin-top: 4px; font-weight: 600;">
          Payment ID: ${order.paymentId}
        </div>
        <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 2px;">
          Order ID: ${order.razorpayOrderId || order.id}
        </div>
      </div>
    `;

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${order.invoiceNumber || order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
    .invoice-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #cbd5e1; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); }
    .print-bar { max-width: 680px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #0f172a; color: #fff; font-size: 12px; font-weight: bold; border-radius: 8px; text-decoration: none; cursor: pointer; border: none; }
    .btn-gold { background: #f59e0b; color: #000; }
    @media print {
      body { background: #fff; padding: 0; }
      .print-bar { display: none; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-size: 13px; font-weight: bold; color: #475569;">NEET MBBS Doctors Store • Tax Invoice</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <a class="btn" href="/">Return to Store</a>
    </div>
  </div>

  <div class="invoice-card">
    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
      <div>
        <h1 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: -0.5px; font-weight: 900;">NEET MBBS DOCTORS STORE</h1>
        <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">NCERTify Master Tests & Med Books PVT LTD</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Support: fdar77551@gmail.com | shahzaibhusain6@gmail.com</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">GSTIN: 07AABCN8891P1ZX</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; font-weight: 800; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; border: 1px solid #fde68a;">TAX INVOICE</span>
        ${isCod ? '<div style="margin-top: 4px;"><span style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; border: 1px solid #fcd34d;">💵 COD ORDER</span></div>' : ''}
        <div style="margin-top: 8px; font-weight: 800; font-family: monospace; font-size: 12px;">${order.invoiceNumber || order.id}</div>
        <div style="font-size: 11px; color: #64748b;">Date: ${invoiceDate}</div>
      </div>
    </div>

    <div style="display: flex; gap: 16px; background: #f8fafc; padding: 14px; border-radius: 10px; margin: 18px 0; border: 1px solid #e2e8f0; font-size: 11px;">
      <div style="flex: 1;">
        <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px;">Customer Details:</strong>
        <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${order.userName}</div>
        <div style="color: #475569;">${order.userEmail}</div>
        ${order.shippingAddress?.phoneNumber ? `<div style="color: #475569;">Mobile: +91 ${order.shippingAddress.phoneNumber}</div>` : ''}
      </div>
      <div style="flex: 1;">
        <strong style="color: #64748b; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px;">Delivery Destination:</strong>
        ${order.shippingAddress ? `
          <div style="color: #334155; line-height: 1.4;">
            ${order.shippingAddress.addressLine1}, ${order.shippingAddress.addressLine2 || ''}<br/>
            <strong>${order.shippingAddress.district}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</strong>
          </div>
        ` : '<div style="color: #047857; font-weight: bold;">Instant Digital Delivery (Read / Download in App)</div>'}
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
      <thead>
        <tr style="border-bottom: 2px solid #cbd5e1; color: #475569; text-align: left;">
          <th style="padding: 10px;">Item Description</th>
          <th style="padding: 10px; text-align: center;">Type</th>
          <th style="padding: 10px; text-align: center;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      <div style="width: 220px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
          <span>Subtotal:</span>
          <span style="font-weight: bold;">₹${order.totalAmount}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #475569;">
          <span>Shipping:</span>
          <span style="color: #047857; font-weight: bold;">FREE (₹0.00)</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #475569;">
          <span>GST (0% Books):</span>
          <span>₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 6px; font-size: 14px; font-weight: 900;">
          <span>Grand Total:</span>
          <span>₹${order.totalAmount}</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
      ${paymentSectionHtml}
      <div style="text-align: right; font-family: monospace; font-size: 9px; color: #64748b;">
        <div style="background: #f1f5f9; padding: 6px 10px; border-radius: 4px; letter-spacing: 2px; font-weight: bold;">||| | |||| || ||| |||| | ||</div>
        <div style="margin-top: 3px;">#${order.id}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(fullHtml);
  } catch (err: any) {
    return res.status(500).send("Error generating invoice");
  }
});

// 3. USERS (Authentication & Profile with exact Password Validation)
app.get("/api/db/users", async (_req, res) => {
  try {
    const db = loadDatabase();
    // Return sanitized users without plain password unless requested for admin
    const sanitized = db.users.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
      totalOrders: u.totalOrders || 0,
      totalSpent: u.totalSpent || 0
    }));
    return res.json({ success: true, users: sanitized });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/users/register", async (req, res) => {
  try {
    const db = loadDatabase();
    const { uid, email, displayName, role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === "fdar77551@gmail.com" || cleanEmail === "shahzaibhusain6@gmail.com";
    
    const existing = db.users.find(u => String(u.email || '').toLowerCase().trim() === cleanEmail);
    if (existing) {
      existing.displayName = displayName || existing.displayName;
      if (uid) existing.uid = uid;
      if (isAdmin) existing.role = 'admin';
      delete (existing as any).password;
      saveDatabase(db);
      return res.json({
        success: true,
        user: {
          uid: existing.uid,
          email: existing.email,
          displayName: existing.displayName,
          role: existing.role
        }
      });
    }

    const newUser = {
      uid: uid || `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      role: isAdmin ? 'admin' : (role || 'user'),
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0
    };

    db.users.push(newUser);
    saveDatabase(db);

    queryCloudflareD1(
      `INSERT OR REPLACE INTO users (uid, email, displayName, role, createdAt, totalOrders, totalSpent) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newUser.uid, newUser.email, newUser.displayName, newUser.role, newUser.createdAt, 0, 0]
    ).catch(e => console.warn(e));

    syncToFirebaseRTDB("users", db.users).catch(e => console.warn(e));

    return res.json({
      success: true,
      user: {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/users/reset-password", async (req, res) => {
  // Password resets are executed directly and securely via Firebase Authentication (sendPasswordResetEmail)
  return res.json({
    success: true,
    message: "Password reset instructions sent via Firebase Authentication. Your database does not store passwords."
  });
});

app.post("/api/db/users/login", async (req, res) => {
  try {
    const db = loadDatabase();
    const { email, uid, displayName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === "fdar77551@gmail.com" || cleanEmail === "shahzaibhusain6@gmail.com";

    let user = db.users.find(u => String(u.email || '').toLowerCase().trim() === cleanEmail);
    if (!user) {
      user = {
        uid: uid || (isAdmin ? (cleanEmail === "fdar77551@gmail.com" ? "admin-1" : "admin-2") : `user-${Date.now()}`),
        email: cleanEmail,
        displayName: displayName || (cleanEmail === "fdar77551@gmail.com" ? "Faisal Fayaz" : cleanEmail === "shahzaibhusain6@gmail.com" ? "Dr. Shahzaib Husain" : cleanEmail.split('@')[0]),
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0
      };
      db.users.push(user);
      saveDatabase(db);
      syncToFirebaseRTDB("users", db.users).catch(e => console.warn(e));
    } else {
      delete (user as any).password;
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        saveDatabase(db);
      }
      if (uid && user.uid !== uid) {
        user.uid = uid;
        saveDatabase(db);
      }
    }

    return res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// STORE CONFIGURATION (Dynamic Admin Support Emails, Phones, Telegram, Branding)
app.get("/api/db/config", async (_req, res) => {
  try {
    const db = loadDatabase();
    const defaultConfig = {
      storeName: "NEET MBBS DOCTORS STORE",
      tagline: "India's #1 Dedicated Store for Medical Aspirants & MBBS Books",
      supportEmails: ["fdar77551@gmail.com", "shahzaibhusain6@gmail.com"],
      supportPhones: ["+91 6005894110", "+91 6397462104"],
      whatsappNumber: "+91 6005894110",
      telegramUsername: "@neetmbbsdoctors",
      telegramLink: "https://t.me/neetmbbsdoctors",
      websiteUrl: "https://neetmbbsdoctorsstore.com",
      companyLegalName: "NCERTify Master Tests & Med Books PVT LTD",
      gstin: "07AABCN8891P1ZX",
      storeAddress: "Medical Enclave, Central Educational District, New Delhi - 110001"
    };
    return res.json({ success: true, config: db.settings?.storeConfig || defaultConfig });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/config", async (req, res) => {
  try {
    const db = loadDatabase();
    if (!db.settings) db.settings = {};
    db.settings.storeConfig = {
      ...db.settings.storeConfig,
      ...req.body
    };
    saveDatabase(db);
    syncToFirebaseRTDB("config/store_config", db.settings.storeConfig).catch(e => console.warn(e));
    return res.json({ success: true, config: db.settings.storeConfig });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. BANNERS
app.get("/api/db/banners", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, banners: db.banners });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/banners", async (req, res) => {
  try {
    const db = loadDatabase();
    const banner = req.body;
    if (!banner || !banner.titleLine1) {
      return res.status(400).json({ success: false, error: "Banner title is required" });
    }
    if (!banner.id) banner.id = `banner-${Date.now()}`;
    const idx = db.banners.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      db.banners[idx] = { ...db.banners[idx], ...banner };
    } else {
      db.banners.push(banner);
    }
    saveDatabase(db);
    syncToFirebaseRTDB("banners", db.banners).catch(e => console.warn(e));
    return res.json({ success: true, banner, banners: db.banners });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/db/banners/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    db.banners = db.banners.filter(b => b.id !== id);
    saveDatabase(db);
    syncToFirebaseRTDB("banners", db.banners).catch(e => console.warn(e));
    return res.json({ success: true, banners: db.banners });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. SUPPORT MESSAGES
app.get("/api/db/support", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, messages: db.support_messages });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/support", async (req, res) => {
  try {
    const db = loadDatabase();
    const msg = req.body;
    if (!msg || !msg.message) {
      return res.status(400).json({ success: false, error: "Message content is required" });
    }
    if (!msg.id) msg.id = `msg-${Date.now()}`;
    if (!msg.createdAt) msg.createdAt = new Date().toISOString();
    if (!msg.status) msg.status = 'unread';
    db.support_messages.unshift(msg);
    saveDatabase(db);
    syncToFirebaseRTDB("support", db.support_messages).catch(e => console.warn(e));
    return res.json({ success: true, message: msg, messages: db.support_messages });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/db/support/:id/status", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    const { status } = req.body;
    const idx = db.support_messages.findIndex(m => m.id === id);
    if (idx >= 0) {
      db.support_messages[idx].status = status;
      saveDatabase(db);
      return res.json({ success: true, message: db.support_messages[idx] });
    }
    return res.status(404).json({ success: false, error: "Message not found" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/db/support/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    db.support_messages = db.support_messages.filter(m => m.id !== id);
    saveDatabase(db);
    syncToFirebaseRTDB("support", db.support_messages).catch(e => console.warn(e));
    queryCloudflareD1(`DELETE FROM support_messages WHERE id = ?;`, [id]).catch(e => console.warn(e));
    return res.json({ success: true, messages: db.support_messages });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. MOCK TESTS & QUESTIONS PERSISTENCE
const SERVER_ADMIN_EMAILS = new Set(["fdar77551@gmail.com", "shahzaibhusain6@gmail.com"]);
function requireAdminIfIdentifiedServer(req: express.Request, res: express.Response): boolean {
  const email = String(req.headers["x-user-email"] || req.body?.adminEmail || "").toLowerCase().trim();
  if (email && !SERVER_ADMIN_EMAILS.has(email)) {
    res.status(403).json({ success: false, error: "Unauthorized: Admin privileges required." });
    return false;
  }
  return true;
}

app.get("/api/db/mock-tests", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, tests: db.mock_tests || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/mock-tests", async (req, res) => {
  if (!requireAdminIfIdentifiedServer(req, res)) return;
  try {
    const db = loadDatabase();
    const rawTests = Array.isArray(req.body) ? req.body : req.body.tests || [];
    db.mock_tests = rawTests.map((t: any) => {
      const { questions: _, ...rest } = t || {};
      return rest;
    });
    saveDatabase(db);
    return res.json({ success: true, count: db.mock_tests.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/mock-tests/:testId/categories", async (req, res) => {
  if (!requireAdminIfIdentifiedServer(req, res)) return;
  try {
    const db = loadDatabase();
    const { testId } = req.params;
    if (!db.mock_tests) db.mock_tests = [];
    const idx = db.mock_tests.findIndex((t: any) => t.id === testId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Mock test not found" });
    }

    const existing = db.mock_tests[idx];
    const {
      categoryIds,
      isStandalone,
      visibility,
      subject,
      chapter,
      thumbnailUrl,
      title
    } = req.body || {};

    const cleanCatIds = Array.isArray(categoryIds)
      ? categoryIds.filter((c: any) => typeof c === "string" && c.trim().length > 0)
      : existing.categoryIds || [];

    const standaloneFlag = typeof isStandalone === "boolean" ? isStandalone : cleanCatIds.length === 0;
    const primaryCat = standaloneFlag
      ? existing.testTypeCategory || "full_syllabus"
      : cleanCatIds[0] || existing.testTypeCategory || "full_syllabus";

    const updated = {
      ...existing,
      ...(typeof title === "string" && title.trim() ? { title: title.trim() } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(chapter !== undefined ? { chapter } : {}),
      ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      categoryIds: standaloneFlag ? [] : Array.from(new Set(cleanCatIds)),
      isStandalone: standaloneFlag,
      testTypeCategory: primaryCat,
      updatedAt: new Date().toISOString()
    };

    db.mock_tests[idx] = updated;
    saveDatabase(db);

    syncToFirebaseRTDB(`mock_tests/${testId}`, updated).catch(() => {});

    return res.json({ success: true, test: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================
// 6B. DYNAMIC TEST CATEGORIES CRUD (3 PERMANENT DEFAULTS + CUSTOM)
// =============================================================
function syncCategoryToD1AndRtdb(category: any, allCategories: any[]) {
  syncToFirebaseRTDB("test_categories", allCategories).catch(() => {});
  if (!CF_API_TOKEN || !category?.id) return;
  queryCloudflareD1(
    `INSERT OR REPLACE INTO test_categories (id, slug, name, description, bannerImageUrl, themePreset, displayOrder, isVisible, isDefault, badgeText, accentTags, ctaText, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.slug || category.id,
      category.name || "",
      category.description || "",
      category.bannerImageUrl || "",
      category.themePreset || "indigo",
      Number(category.displayOrder || 1),
      category.isVisible !== false ? 1 : 0,
      category.isDefault ? 1 : 0,
      category.badgeText || "",
      JSON.stringify(category.accentTags || []),
      category.ctaText || "Explore Tests",
      category.createdAt || new Date().toISOString(),
      category.updatedAt || new Date().toISOString()
    ]
  ).catch(() => {});
}

app.get("/api/test-categories", async (_req, res) => {
  try {
    const db = loadDatabase();
    const categories = normalizeTestCategories(db.test_categories);
    const allTests = Array.isArray(db.mock_tests) ? db.mock_tests : [];

    const enriched = categories.map(cat => ({
      ...cat,
      testCount: filterTestsForCategoryDeduped(allTests, cat.id, { includeUnlisted: false }).length
    }));

    return res.json({ success: true, categories: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/test-categories", async (req, res) => {
  if (!requireAdminIfIdentifiedServer(req, res)) return;
  try {
    const db = loadDatabase();
    const categories = normalizeTestCategories(db.test_categories);
    const {
      name,
      description,
      bannerImageUrl,
      themePreset = "indigo",
      displayOrder,
      isVisible = true,
      badgeText,
      accentTags,
      ctaText
    } = req.body || {};

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return res.status(400).json({ success: false, error: "Category name is required." });
    }

    const slugBase = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `cat_${Date.now()}`;

    const duplicate = categories.find(
      c => c.name.toLowerCase() === cleanName.toLowerCase() || c.slug.toLowerCase() === slugBase
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: `A category named "${duplicate.name}" already exists.`
      });
    }

    const id = `cat-${slugBase}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const newCat = {
      id,
      slug: id,
      name: cleanName,
      description: typeof description === "string" ? description.trim() : "",
      bannerImageUrl: typeof bannerImageUrl === "string" ? bannerImageUrl.trim() : "",
      themePreset,
      displayOrder: typeof displayOrder === "number" ? displayOrder : categories.length + 1,
      isVisible: isVisible !== false,
      isDefault: false,
      badgeText: typeof badgeText === "string" && badgeText.trim() ? badgeText.trim() : "Custom Series",
      accentTags: Array.isArray(accentTags)
        ? accentTags.filter((t: any) => typeof t === "string" && t.trim())
        : ["NCERT Mapped", "CBT Pattern"],
      ctaText: typeof ctaText === "string" && ctaText.trim() ? ctaText.trim() : "Open Category",
      createdAt: now,
      updatedAt: now
    };

    const nextCategories = normalizeTestCategories([...categories, newCat]);
    db.test_categories = nextCategories;
    saveDatabase(db);
    syncCategoryToD1AndRtdb(newCat, nextCategories);

    return res.status(201).json({ success: true, category: newCat, categories: nextCategories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/test-categories/:id", async (req, res) => {
  if (!requireAdminIfIdentifiedServer(req, res)) return;
  try {
    const db = loadDatabase();
    const categories = normalizeTestCategories(db.test_categories);
    const { id } = req.params;
    const idx = categories.findIndex(c => c.id === id || c.slug === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Category not found." });
    }

    const existing = categories[idx];
    const patch = req.body || {};
    const updated = {
      ...existing,
      ...(typeof patch.name === "string" && patch.name.trim() ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: String(patch.description || "").trim() } : {}),
      ...(patch.bannerImageUrl !== undefined ? { bannerImageUrl: String(patch.bannerImageUrl || "").trim() } : {}),
      ...(patch.themePreset !== undefined ? { themePreset: patch.themePreset } : {}),
      ...(typeof patch.displayOrder === "number" ? { displayOrder: patch.displayOrder } : {}),
      ...(typeof patch.isVisible === "boolean" ? { isVisible: patch.isVisible } : {}),
      ...(patch.badgeText !== undefined ? { badgeText: String(patch.badgeText || "").trim() } : {}),
      ...(Array.isArray(patch.accentTags) ? { accentTags: patch.accentTags.filter((t: any) => typeof t === "string" && t.trim()) } : {}),
      ...(patch.ctaText !== undefined ? { ctaText: String(patch.ctaText || "").trim() } : {}),
      isDefault: existing.isDefault, // Default flag is immutable
      updatedAt: new Date().toISOString()
    };

    categories[idx] = updated;
    const nextCategories = normalizeTestCategories(categories);
    db.test_categories = nextCategories;
    saveDatabase(db);
    syncCategoryToD1AndRtdb(updated, nextCategories);

    return res.json({ success: true, category: updated, categories: nextCategories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/test-categories/:id", async (req, res) => {
  if (!requireAdminIfIdentifiedServer(req, res)) return;
  try {
    const db = loadDatabase();
    const categories = normalizeTestCategories(db.test_categories);
    const { id } = req.params;
    const target = categories.find(c => c.id === id || c.slug === id);
    if (!target) {
      return res.status(404).json({ success: false, error: "Category not found." });
    }
    if (target.isDefault) {
      return res.status(403).json({
        success: false,
        error: `Cannot delete permanent default category "${target.name}". You may edit its title, description, or visibility.`
      });
    }

    const reassignToCategoryId =
      (req.body && req.body.reassignToCategoryId) ||
      (typeof req.query.reassignToCategoryId === "string" ? req.query.reassignToCategoryId : undefined);
    const makeStandalone = req.body?.makeStandalone === true || req.query.makeStandalone === "true";

    const nextCategories = categories.filter(c => c.id !== target.id);

    // Safely reassign or mark standalone on affected tests — NEVER delete tests, questions, purchases, or orders
    let reassignedTestsCount = 0;
    if (Array.isArray(db.mock_tests)) {
      db.mock_tests = db.mock_tests.map((test: any) => {
        const currentIds = resolveTestCategoryIds(test);
        if (!currentIds.includes(target.id)) return test;

        reassignedTestsCount++;
        const filteredIds = currentIds.filter(cid => cid !== target.id);
        if (reassignToCategoryId && !makeStandalone && reassignToCategoryId !== target.id) {
          if (!filteredIds.includes(reassignToCategoryId)) {
            filteredIds.push(reassignToCategoryId);
          }
        }
        const standaloneNow = makeStandalone || filteredIds.length === 0;
        const nextPrimary = standaloneNow
          ? test.testTypeCategory && test.testTypeCategory !== target.id
            ? test.testTypeCategory
            : "full_syllabus"
          : filteredIds[0];

        return {
          ...test,
          categoryIds: standaloneNow ? [] : filteredIds,
          isStandalone: standaloneNow,
          testTypeCategory: nextPrimary,
          updatedAt: new Date().toISOString()
        };
      });
    }

    db.test_categories = nextCategories;
    saveDatabase(db);
    syncToFirebaseRTDB("test_categories", nextCategories).catch(() => {});
    if (Array.isArray(db.mock_tests)) {
      const testsMap: Record<string, any> = {};
      db.mock_tests.forEach((t: any) => {
        if (t?.id) testsMap[t.id] = t;
      });
      syncToFirebaseRTDB("mock_tests", testsMap).catch(() => {});
    }
    if (CF_API_TOKEN) {
      queryCloudflareD1(`DELETE FROM test_categories WHERE id = ?;`, [target.id]).catch(() => {});
    }

    return res.json({
      success: true,
      deletedCategoryId: target.id,
      reassignedTestsCount,
      categories: nextCategories
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/db/mock-questions", async (req, res) => {
  try {
    const db = loadDatabase();
    const testId = req.query.testId as string;
    if (testId) {
      const qList = (db.mock_questions && db.mock_questions[testId]) || [];
      return res.json({ success: true, testId, questions: qList });
    }
    return res.json({ success: true, allQuestions: db.mock_questions || {} });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/mock-questions", async (req, res) => {
  try {
    const db = loadDatabase();
    const { testId, questions } = req.body;
    if (!testId || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: "testId and questions array required" });
    }
    if (!db.mock_questions) db.mock_questions = {};
    db.mock_questions[testId] = questions;
    saveDatabase(db);
    return res.json({ success: true, testId, count: questions.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/db/mock-purchases", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, purchases: db.mock_purchases || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/mock-purchases", async (req, res) => {
  try {
    const db = loadDatabase();
    const purchase = req.body;
    if (!db.mock_purchases) db.mock_purchases = [];
    db.mock_purchases.unshift(purchase);
    saveDatabase(db);
    return res.json({ success: true, count: db.mock_purchases.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// CLOUDFLARE D1 DATABASE APIS COMPATIBILITY LAYER
app.get("/api/d1/tests", async (_req, res) => {
  try {
    const db = loadDatabase();
    const tests = db.mock_tests || [];
    return res.json({ success: true, tests, count: tests.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, tests: [] });
  }
});

app.post("/api/d1/tests", async (req, res) => {
  try {
    const db = loadDatabase();
    const testsToSave = Array.isArray(req.body.tests) ? req.body.tests : (req.body.test ? [req.body.test] : (Array.isArray(req.body) ? req.body : []));
    if (!db.mock_tests) db.mock_tests = [];

    // Clean tests (strip heavy embedded questions)
    const cleaned = testsToSave.map((t: any) => {
      const { questions: _, ...rest } = t;
      return rest;
    });

    for (const ct of cleaned) {
      const idx = db.mock_tests.findIndex((existing: any) => existing.id === ct.id);
      if (idx > -1) {
        db.mock_tests[idx] = { ...db.mock_tests[idx], ...ct };
      } else {
        db.mock_tests.unshift(ct);
      }
      syncToFirebaseRTDB(`mock_tests/${encodeURIComponent(ct.id)}`, ct).catch(() => {});
    }
    saveDatabase(db);
    return res.json({ success: true, savedCount: cleaned.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/d1/questions", async (req, res) => {
  try {
    const db = loadDatabase();
    const testId = req.query.testId as string;
    if (!testId) return res.status(400).json({ success: false, error: "testId required" });
    const questions = (db.mock_questions && db.mock_questions[testId]) || [];
    return res.json({ success: true, testId, questions, count: questions.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, questions: [] });
  }
});

app.post("/api/d1/questions", async (req, res) => {
  try {
    const db = loadDatabase();
    const { testId, questions } = req.body;
    if (!testId || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: "testId and questions array required" });
    }
    if (!db.mock_questions) db.mock_questions = {};
    db.mock_questions[testId] = questions;

    // Update question count in mock_tests
    if (db.mock_tests) {
      const t = db.mock_tests.find((item: any) => item.id === testId);
      if (t) {
        t.questionsCount = questions.length;
        t.totalQuestions = questions.length;
      }
    }
    saveDatabase(db);
    syncToFirebaseRTDB(`mock_questions/${encodeURIComponent(testId)}`, questions).catch(() => {});
    return res.json({ success: true, testId, count: questions.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/d1/sync", async (req, res) => {
  try {
    const db = loadDatabase();
    const body = req.body;
    if (Array.isArray(body.tests)) {
      if (!db.mock_tests) db.mock_tests = [];
      for (const t of body.tests) {
        const { questions: _, ...cleanT } = t;
        const idx = db.mock_tests.findIndex((existing: any) => existing.id === cleanT.id);
        if (idx > -1) db.mock_tests[idx] = { ...db.mock_tests[idx], ...cleanT };
        else db.mock_tests.unshift(cleanT);
      }
    }
    if (body.testQuestions && typeof body.testQuestions === "object") {
      if (!db.mock_questions) db.mock_questions = {};
      Object.assign(db.mock_questions, body.testQuestions);
    }
    saveDatabase(db);
    return res.json({ success: true, message: "Synced to database" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// NEET (11th & 12th) FULL COURSE API ENDPOINTS
// ==========================================
const DEFAULT_FULL_COURSE_SERVER_CONFIG = {
  id: "neet-full-course-11-12",
  title: "NEET (11th & 12th) Full Course",
  subtitle: "Complete study material for your NEET preparation — Class 11 + Class 12.",
  description: "Complete Class 11 + Class 12 preparation material for NEET aspirants. Master Physics, Chemistry & Biology with comprehensive digital study material delivered directly via Google Drive. Organized by experienced faculty, regularly updated with new high-yield resources, and designed so you can learn at your own pace.",
  price: 499,
  originalPrice: 1999,
  sampleDriveLink: "https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH",
  mainCourseDriveLink: "https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH",
  isActive: true,
  features: [
    "Comprehensive Class 11 + Class 12 NEET Syllabus",
    "Physics + Chemistry + Biology Core Concept Notes",
    "Delivered Digitally through Dedicated Google Drive",
    "Regularly Organized & Updated PDFs by Faculty",
    "Formula Cheatsheets & Reaction Mechanisms",
    "High-Yield Chapter-Wise Questions & NCERT Pointers",
    "Learn At Your Own Pace with Lifetime Digital Access",
    "Mobile, Tablet & Desktop Compatible with Instant Access"
  ],
  highlights: [
    "Class 11 + 12",
    "Physics + Chemistry + Biology",
    "Complete study material",
    "Regularly organized PDFs",
    "Easy digital access",
    "Learn at your own pace"
  ]
};

// Public course metadata (SECURITY: NEVER exposes mainCourseDriveLink)
app.get(["/api/course/public-info", "/api/course/info"], async (_req, res) => {
  try {
    const db = loadDatabase();
    const cfg = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
    const publicInfo = {
      id: cfg.id || "neet-full-course-11-12",
      title: cfg.title || "NEET (11th & 12th) Full Course",
      subtitle: cfg.subtitle || "Complete study material for your NEET preparation — Class 11 + Class 12.",
      description: cfg.description || "",
      price: Number(cfg.price) > 0 ? Number(cfg.price) : 499,
      originalPrice: Number(cfg.originalPrice) > 0 ? Number(cfg.originalPrice) : 1999,
      sampleDriveLink: cfg.sampleDriveLink || "https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH",
      isActive: cfg.isActive !== false,
      features: cfg.features || DEFAULT_FULL_COURSE_SERVER_CONFIG.features,
      highlights: cfg.highlights || DEFAULT_FULL_COURSE_SERVER_CONFIG.highlights
    };
    return res.json({ success: true, course: publicInfo });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin get full configuration including private mainCourseDriveLink and stats
app.get("/api/course/admin-config", async (_req, res) => {
  try {
    const db = loadDatabase();
    const cfg = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };

    // Calculate real-time purchase stats from orders
    const orders = db.orders || [];
    let totalPurchases = 0;
    let successfulPurchases = 0;
    let revenue = 0;

    for (const o of orders) {
      const isCourseOrder = (o.items || []).some((item: any) => {
        const pId = (item.productId || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        return pId === "neet-full-course-11-12" || pId.includes("full-course") || title.includes("full course");
      });

      if (isCourseOrder) {
        totalPurchases++;
        const isPaid = (o.paymentStatus === "paid" || o.paymentStatus === "paid_sandbox" || o.paymentStatus === "cod") && o.status !== "cancelled";
        if (isPaid) {
          successfulPurchases++;
          const courseItem = (o.items || []).find((item: any) => {
            const pId = (item.productId || "").toLowerCase();
            const title = (item.title || "").toLowerCase();
            return pId === "neet-full-course-11-12" || pId.includes("full-course") || title.includes("full course");
          });
          revenue += (courseItem?.price || cfg.price || 499) * (courseItem?.quantity || 1);
        }
      }
    }

    return res.json({
      success: true,
      course: cfg,
      stats: {
        totalPurchases,
        successfulPurchases,
        revenue
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin save configuration
app.post("/api/course/admin-config", async (req, res) => {
  try {
    const db = loadDatabase();
    const current = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
    const updated = {
      ...current,
      ...req.body,
      price: Number(req.body.price) > 0 ? Number(req.body.price) : current.price,
      originalPrice: Number(req.body.originalPrice) > 0 ? Number(req.body.originalPrice) : current.originalPrice
    };
    db.full_course_config = updated;
    saveDatabase(db);
    // Real-time synchronization to Firebase RTDB
    syncToFirebaseRTDB("config/full_course_config", updated).catch(e => console.warn("Firebase course sync note:", e.message));
    return res.json({ success: true, course: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Multi-Class Courses Public Endpoint (Class 6th, 7th, 8th, 9th, 10th, 11th, 12th, NEET)
app.get("/api/courses", async (_req, res) => {
  try {
    const db = loadDatabase();
    const baseCourse = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
    const allCourses = Array.isArray(db.courses) && db.courses.length > 0 
      ? db.courses 
      : [baseCourse];
    
    // Sanitize to omit private mainCourseDriveLink before purchase
    const sanitized = allCourses.map((c: any) => {
      const copy = { ...c };
      delete copy.mainCourseDriveLink;
      return copy;
    });

    return res.json({ success: true, courses: sanitized });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Multi-Class Courses Admin Endpoint
app.get("/api/courses/admin", async (_req, res) => {
  try {
    const db = loadDatabase();
    const baseCourse = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
    let courses = Array.isArray(db.courses) && db.courses.length > 0 
      ? db.courses 
      : [baseCourse];

    // Ensure the default NEET course is always included
    if (!courses.some((c: any) => c.id === baseCourse.id)) {
      courses = [baseCourse, ...courses];
    }

    return res.json({ success: true, courses });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Create or Update Course for Any Class (6th, 7th, 8th, 9th, 10th, etc.)
app.post("/api/courses/admin", async (req, res) => {
  try {
    const db = loadDatabase();
    const courseData = req.body;
    if (!courseData.title) {
      return res.status(400).json({ success: false, error: "Course title is required" });
    }

    const courseId = courseData.id || `course-class-${(courseData.targetClass || 'other').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newOrUpdatedCourse = {
      id: courseId,
      title: courseData.title,
      subtitle: courseData.subtitle || `Complete study material for ${courseData.targetClass || 'students'}`,
      description: courseData.description || 'Complete study notes, digital study material, and formula sheets.',
      targetClass: courseData.targetClass || 'Class 11 & 12',
      price: Number(courseData.price) > 0 ? Number(courseData.price) : 499,
      originalPrice: Number(courseData.originalPrice) > 0 ? Number(courseData.originalPrice) : 1999,
      sampleDriveLink: courseData.sampleDriveLink || 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
      mainCourseDriveLink: courseData.mainCourseDriveLink || 'https://drive.google.com/drive/folders/1Mdq8czw42v-QaSegmWnWjq9Vmb5qAWZH',
      isActive: courseData.isActive !== false,
      features: courseData.features || [
        `Complete ${courseData.targetClass || 'Class'} Preparation Material`,
        'Delivered Digitally through Google Drive',
        'Regularly Organized PDFs & Cheatsheets',
        'Learn at Your Own Pace'
      ],
      highlights: courseData.highlights || [
        courseData.targetClass || 'Foundation',
        'Complete study material',
        'Regularly organized PDFs',
        'Easy digital access'
      ]
    };

    if (!Array.isArray(db.courses)) {
      db.courses = [{ ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) }];
    }

    const idx = db.courses.findIndex((c: any) => c.id === courseId);
    if (idx >= 0) {
      db.courses[idx] = { ...db.courses[idx], ...newOrUpdatedCourse };
    } else {
      db.courses.push(newOrUpdatedCourse);
    }

    // If updating primary NEET 11-12 course, sync full_course_config
    if (courseId === 'neet-full-course-11-12') {
      db.full_course_config = { ...db.full_course_config, ...newOrUpdatedCourse };
    }

    saveDatabase(db);
    syncToFirebaseRTDB("config/courses", db.courses).catch(e => console.warn("Firebase sync error:", e));
    syncToFirebaseRTDB("config/full_course_config", db.full_course_config || db.courses[0]).catch(e => console.warn(e));

    return res.json({ success: true, course: newOrUpdatedCourse, courses: db.courses });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Delete Course
app.delete("/api/courses/admin/:id", async (req, res) => {
  try {
    const db = loadDatabase();
    const { id } = req.params;
    if (id === 'neet-full-course-11-12') {
      return res.status(400).json({ success: false, error: "The default NEET (11th & 12th) Full Course cannot be removed." });
    }

    if (Array.isArray(db.courses)) {
      db.courses = db.courses.filter((c: any) => c.id !== id);
      saveDatabase(db);
      syncToFirebaseRTDB("config/courses", db.courses).catch(e => console.warn(e));
    }

    return res.json({ success: true, message: `Course ${id} removed successfully.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Secure access verification: verifies user payment before revealing main course Google Drive link
app.post("/api/course/access", async (req, res) => {
  try {
    const { userEmail, userId, orderId, courseId } = req.body;
    const db = loadDatabase();
    const email = (userEmail || "").trim().toLowerCase();
    const uId = (userId || "").trim();
    const ordId = (orderId || "").trim().toLowerCase();
    const requestedCourseId = (courseId || "neet-full-course-11-12").toLowerCase();

    const orders = db.orders || [];
    const isPurchased = orders.some((order: any) => {
      const isPaid = (order.paymentStatus === "paid" || order.paymentStatus === "paid_sandbox" || order.paymentStatus === "cod") && order.status !== "cancelled";
      if (!isPaid) return false;

      const orderEmail = (order.userEmail || "").trim().toLowerCase();
      const orderUid = order.userId || "";
      const cleanOrderId = (order.id || "").trim().toLowerCase();

      const emailMatch = email && orderEmail === email;
      const uidMatch = uId && orderUid === uId;
      const orderIdMatch = ordId && (cleanOrderId === ordId || cleanOrderId.replace(/^ord-/, "") === ordId || cleanOrderId.replace(/^#/, "") === ordId);

      if (emailMatch || uidMatch || orderIdMatch) {
        return (order.items || []).some((item: any) => {
          const pId = (item.productId || "").toLowerCase();
          const title = (item.title || "").toLowerCase();
          return (
            pId === requestedCourseId ||
            pId === "neet-full-course-11-12" ||
            pId.includes("full-course") ||
            pId.includes("course-class") ||
            title.includes("full course") ||
            title.includes("course")
          );
        });
      }
      return false;
    });

    const isPurchasedExplicit = (db.full_course_purchases || []).some((p: any) => {
      const matchCourse = !p.courseId || p.courseId.toLowerCase() === requestedCourseId || requestedCourseId === "neet-full-course-11-12";
      return matchCourse && ((email && p.userEmail?.toLowerCase() === email) || (uId && p.userId === uId) || (ordId && p.orderId?.toLowerCase() === ordId));
    });

    if (isPurchased || isPurchasedExplicit) {
      // Find matching course or fall back to default
      const allCourses = Array.isArray(db.courses) ? db.courses : [];
      const matchedCourse = allCourses.find((c: any) => c.id === requestedCourseId) || { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
      return res.json({
        success: true,
        accessUrl: matchedCourse.mainCourseDriveLink || matchedCourse.sampleDriveLink
      });
    }

    return res.status(403).json({
      success: false,
      message: "Please complete your enrollment to access the course Google Drive folder."
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin stats endpoint
app.get("/api/course/admin-stats", async (_req, res) => {
  try {
    const db = loadDatabase();
    const cfg = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
    const orders = db.orders || [];
    let totalPurchases = 0;
    let successfulPurchases = 0;
    let revenue = 0;
    const purchases: any[] = [];

    for (const o of orders) {
      const isCourseOrder = (o.items || []).some((item: any) => {
        const pId = (item.productId || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        return pId === "neet-full-course-11-12" || pId.includes("full-course") || title.includes("full course");
      });

      if (isCourseOrder) {
        totalPurchases++;
        const isPaid = (o.paymentStatus === "paid" || o.paymentStatus === "paid_sandbox" || o.paymentStatus === "cod") && o.status !== "cancelled";
        if (isPaid) {
          successfulPurchases++;
          const courseItem = (o.items || []).find((item: any) => {
            const pId = (item.productId || "").toLowerCase();
            const title = (item.title || "").toLowerCase();
            return pId === "neet-full-course-11-12" || pId.includes("full-course") || title.includes("full course");
          });
          revenue += (courseItem?.price || cfg.price || 499) * (courseItem?.quantity || 1);
        }
        purchases.push({
          id: o.id,
          userName: o.userName,
          userEmail: o.userEmail,
          paymentStatus: o.paymentStatus,
          status: o.status,
          orderDate: o.orderDate,
          totalAmount: o.totalAmount
        });
      }
    }

    return res.json({
      success: true,
      stats: { totalPurchases, successfulPurchases, revenue },
      purchases
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. COUPONS & DISCOUNT ENGINE
// ==========================================

const DEFAULT_SERVER_COUPONS = [
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

// GET all coupons
app.get("/api/coupons", (_req, res) => {
  try {
    const db = loadDatabase();
    if (!Array.isArray(db.coupons) || db.coupons.length === 0) {
      db.coupons = DEFAULT_SERVER_COUPONS;
      saveDatabase(db);
    }
    return res.json({ success: true, coupons: db.coupons });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Create or Update Coupon
app.post("/api/coupons", (req, res) => {
  try {
    const couponData = req.body;
    if (!couponData.code) {
      return res.status(400).json({ success: false, error: "Coupon code is required" });
    }

    const db = loadDatabase();
    if (!Array.isArray(db.coupons)) db.coupons = [];

    const cleanCode = couponData.code.trim().toUpperCase();
    const existingIndex = db.coupons.findIndex((c: any) => c.code.toUpperCase() === cleanCode || (couponData.id && c.id === couponData.id));

    const couponRecord = {
      id: couponData.id || `coupon-${cleanCode.toLowerCase()}-${Date.now()}`,
      code: cleanCode,
      discountType: couponData.discountType === 'percentage' ? 'percentage' : 'flat',
      discountValue: Number(couponData.discountValue) || 0,
      minAmount: Number(couponData.minAmount) || 0,
      maxDiscount: couponData.maxDiscount ? Number(couponData.maxDiscount) : undefined,
      startDate: couponData.startDate || undefined,
      expiryDate: couponData.expiryDate || undefined,
      totalUsageLimit: couponData.totalUsageLimit ? Number(couponData.totalUsageLimit) : undefined,
      perUserUsageLimit: couponData.perUserUsageLimit ? Number(couponData.perUserUsageLimit) : 1,
      currentUsageCount: Number(couponData.currentUsageCount) || 0,
      active: couponData.active !== false,
      applicableProductTypes: Array.isArray(couponData.applicableProductTypes) && couponData.applicableProductTypes.length > 0 
        ? couponData.applicableProductTypes 
        : ['all'],
      applicableProductIds: Array.isArray(couponData.applicableProductIds) ? couponData.applicableProductIds : [],
      createdAt: couponData.createdAt || new Date().toISOString()
    };

    if (existingIndex !== -1) {
      db.coupons[existingIndex] = { ...db.coupons[existingIndex], ...couponRecord };
    } else {
      db.coupons.push(couponRecord);
    }

    saveDatabase(db);
    syncToFirebaseRTDB("coupons", db.coupons).catch(() => {});

    return res.json({ success: true, coupon: couponRecord });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Delete Coupon
app.delete("/api/coupons/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDatabase();
    if (Array.isArray(db.coupons)) {
      db.coupons = db.coupons.filter((c: any) => c.id !== id && c.code !== id);
      saveDatabase(db);
      syncToFirebaseRTDB("coupons", db.coupons).catch(() => {});
    }
    return res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Server-Side Coupon Validation Endpoint
app.post("/api/coupons/validate", (req, res) => {
  try {
    const { code, amount, productType, userId, userEmail } = req.body;
    const cleanCode = (code || "").trim().toUpperCase();
    const cartAmount = Number(amount) || 0;

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: "Please provide a coupon code" }
      });
    }

    const db = loadDatabase();
    const coupons = Array.isArray(db.coupons) && db.coupons.length > 0 ? db.coupons : DEFAULT_SERVER_COUPONS;
    const coupon = coupons.find((c: any) => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return res.json({
        success: true,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" is not recognized` }
      });
    }

    if (!coupon.active) {
      return res.json({
        success: true,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" is inactive` }
      });
    }

    // Check dates
    if (coupon.startDate && new Date(coupon.startDate).getTime() > Date.now()) {
      return res.json({
        success: true,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" is not yet active` }
      });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      return res.json({
        success: true,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" has expired` }
      });
    }

    // Check min order amount
    if (coupon.minAmount && cartAmount < coupon.minAmount) {
      return res.json({
        success: true,
        result: {
          valid: false,
          discountAmount: 0,
          finalAmount: cartAmount,
          originalAmount: cartAmount,
          error: `Minimum order amount of ₹${coupon.minAmount} required to apply coupon "${cleanCode}"`
        }
      });
    }

    // Check total usage limit
    if (coupon.totalUsageLimit && (coupon.currentUsageCount || 0) >= coupon.totalUsageLimit) {
      return res.json({
        success: true,
        result: { valid: false, discountAmount: 0, finalAmount: cartAmount, originalAmount: cartAmount, error: `Coupon "${cleanCode}" usage limit reached` }
      });
    }

    // Check applicable product types
    const applicableTypes = coupon.applicableProductTypes || ['all'];
    if (!applicableTypes.includes('all')) {
      if (productType && productType !== 'all' && productType !== 'mixed' && !applicableTypes.includes(productType)) {
        return res.json({
          success: true,
          result: {
            valid: false,
            discountAmount: 0,
            finalAmount: cartAmount,
            originalAmount: cartAmount,
            error: `Coupon "${cleanCode}" is only applicable to ${applicableTypes.join(', ')}`
          }
        });
      }
    }

    // Calculate verified discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((cartAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = Math.min(coupon.discountValue, cartAmount);
    }

    const finalAmount = Math.max(1, cartAmount - discount);

    return res.json({
      success: true,
      result: {
        valid: true,
        coupon,
        discountAmount: discount,
        finalAmount,
        originalAmount: cartAmount
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Record Coupon Usage
app.post("/api/coupons/record-usage", (req, res) => {
  try {
    const record = req.body;
    if (!record.couponCode) {
      return res.status(400).json({ success: false, error: "Missing coupon code" });
    }

    const db = loadDatabase();
    if (!Array.isArray((db as any).coupon_usage)) (db as any).coupon_usage = [];
    (db as any).coupon_usage.push({
      ...record,
      id: record.id || `usage-${Date.now()}`,
      usedAt: record.usedAt || new Date().toISOString()
    });

    // Increment coupon count
    if (Array.isArray(db.coupons)) {
      const cIdx = db.coupons.findIndex((c: any) => c.code.toUpperCase() === record.couponCode.toUpperCase());
      if (cIdx !== -1) {
        db.coupons[cIdx].currentUsageCount = (db.coupons[cIdx].currentUsageCount || 0) + 1;
      }
    }

    saveDatabase(db);
    return res.json({ success: true, message: "Coupon usage recorded" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. REVIEWS & RATINGS ENGINE
// ==========================================

// GET reviews
app.get("/api/reviews", (req, res) => {
  try {
    const { productId } = req.query;
    const db = loadDatabase();
    let reviews = Array.isArray(db.reviews) ? db.reviews : [];
    if (productId) {
      reviews = reviews.filter((r: any) => r.productId === productId);
    }
    return res.json({ success: true, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST review
app.post("/api/reviews", (req, res) => {
  try {
    const reviewData = req.body;
    if (!reviewData.productId || !reviewData.comment) {
      return res.status(400).json({ success: false, error: "Product ID and comment are required" });
    }

    const db = loadDatabase();
    if (!Array.isArray(db.reviews)) db.reviews = [];

    const newReview = {
      id: reviewData.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: reviewData.productId,
      productType: reviewData.productType || 'general',
      productTitle: reviewData.productTitle || '',
      userId: reviewData.userId || '',
      userEmail: reviewData.userEmail || '',
      userName: reviewData.userName || 'Verified Student',
      userAvatar: reviewData.userAvatar || '',
      rating: Number(reviewData.rating) || 5,
      comment: reviewData.comment,
      isVerifiedPurchase: reviewData.isVerifiedPurchase !== false,
      isHidden: reviewData.isHidden === true,
      createdAt: reviewData.createdAt || new Date().toISOString()
    };

    db.reviews.unshift(newReview);
    saveDatabase(db);
    syncToFirebaseRTDB("reviews", db.reviews).catch(() => {});

    return res.json({ success: true, review: newReview });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT review (moderation hide/unhide)
app.put("/api/reviews/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;
    const db = loadDatabase();
    if (Array.isArray(db.reviews)) {
      const idx = db.reviews.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        db.reviews[idx].isHidden = Boolean(isHidden);
        saveDatabase(db);
        syncToFirebaseRTDB("reviews", db.reviews).catch(() => {});
        return res.json({ success: true, review: db.reviews[idx] });
      }
    }
    return res.status(404).json({ success: false, error: "Review not found" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE review
app.delete("/api/reviews/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDatabase();
    if (Array.isArray(db.reviews)) {
      db.reviews = db.reviews.filter((r: any) => r.id !== id);
      saveDatabase(db);
      syncToFirebaseRTDB("reviews", db.reviews).catch(() => {});
    }
    return res.json({ success: true, message: "Review deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. CLOUDFLARE D1 STATUS & SYNC
app.get("/api/db/d1-status", async (_req, res) => {
  try {
    const db = loadDatabase();
    const d1Test = await queryCloudflareD1("SELECT 1 as connected;");
    return res.json({
      success: true,
      databaseName: CF_D1_NAME,
      databaseId: CF_D1_DATABASE_ID,
      accountId: CF_ACCOUNT_ID,
      isD1Configured: Boolean(CF_API_TOKEN),
      d1Connected: d1Test?.success || false,
      totalProducts: db.products.length,
      totalUsers: db.users.length,
      totalOrders: db.orders.length,
      totalSupportMessages: db.support_messages.length,
      tables: ["users", "products", "orders", "payment_records", "pdf_access", "banners", "coupons", "reviews", "support_messages"]
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/d1-sync", async (req, res) => {
  try {
    if (req.body?.apiToken) {
      CF_API_TOKEN = req.body.apiToken.trim();
    }
    await initD1Tables();
    const db = loadDatabase();
    // Bulk sync products to D1
    for (const p of db.products) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO products (id, title, author, type, category, price, originalPrice, rating, reviewsCount, coverImage, sampleImages, pdfUrl, description, features, tags, pages, edition, isbn, inStock, isBestSeller, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.title,
          p.author || '',
          p.type || 'book',
          p.category || 'Biology',
          p.price || 0,
          p.originalPrice || 0,
          p.rating || 5,
          p.reviewsCount || 0,
          p.coverImage || '',
          JSON.stringify(p.sampleImages || []),
          p.pdfUrl || '',
          p.description || '',
          JSON.stringify(p.features || []),
          JSON.stringify(p.tags || []),
          p.pages || 0,
          p.edition || '',
          p.isbn || '',
          p.inStock !== false ? 1 : 0,
          p.isBestSeller ? 1 : 0,
          p.createdAt || new Date().toISOString()
        ]
      );
    }
    return res.json({ success: true, message: `Synced ${db.products.length} products to Cloudflare D1 (${CF_D1_NAME})` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. GEMINI AI NEET PDF PARSER ENDPOINTS
// ==========================================
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets or enter your Gemini API key in the admin panel.");
  }
  if (customApiKey && customApiKey.trim() && customApiKey.trim() !== process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// Active, high-throughput Gemini models per @google/genai guidelines:
// gemini-3.8-flash: Flagship recommended model with highest capacity, speed & STEM reasoning
// gemini-flash-latest: Stable production model
// gemini-3.1-flash-lite: Lightweight fast fallback model
const GEMINI_MODELS_FALLBACK_CHAIN = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-4-argon",
  "gemini-3.1-flash-lite"
];

// Track models that have encountered quota limits or demand surges to avoid retrying them on subsequent pages
const geminiModelCooldowns = new Map<string, number>();

function cleanErrorMessage(err: any): string {
  try {
    const raw = typeof err === 'string' ? err : err?.message || String(err || '');
    if (raw.includes('503') || raw.includes('high demand') || raw.includes('spikes in demand') || raw.includes('UNAVAILABLE')) {
      return 'Google Gemini temporary demand surge (503). Switching to fallback model...';
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota') || raw.includes('Quota exceeded')) {
      return 'Google Gemini API quota limit reached (429).';
    }
    if (raw.startsWith('{') && raw.includes('"message"')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error?.message) {
          return String(parsed.error.message).slice(0, 120);
        }
      } catch (e) {}
    }
    return raw.replace(/\{"error":\{.*\}\}/g, 'API Service Notice').slice(0, 120);
  } catch {
    return 'API request notice';
  }
}

function extractRetryDelaySeconds(err: any): number {
  try {
    const msg = err?.message || String(err);
    // 1. Match human-readable durations like "retry in 19h52m31s"
    const hourMatch = msg.match(/retry in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*([\d\.]+)s/i);
    if (hourMatch && (hourMatch[1] || hourMatch[2])) {
      const h = parseInt(hourMatch[1] || '0', 10);
      const m = parseInt(hourMatch[2] || '0', 10);
      const s = Math.ceil(parseFloat(hourMatch[3] || '0'));
      const totalSec = h * 3600 + m * 60 + s;
      if (totalSec > 0) return totalSec;
    }

    // 2. Match seconds like "retry in 18s"
    const match = msg.match(/retry in ([\d\.]+)s/i) || msg.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
    if (match && match[1]) {
      const parsed = Math.ceil(parseFloat(match[1]));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // 3. Match Google RPC details retryDelay
    if (Array.isArray(err?.details)) {
      for (const d of err.details) {
        if (d?.retryDelay) {
          const s = parseInt(String(d.retryDelay).replace(/[^\d]/g, ''), 10);
          if (!isNaN(s) && s > 0) return s;
        }
      }
    }
  } catch (e) {}
  return 35;
}

const NEET_QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          subject: { type: Type.STRING },
          chapter: { type: Type.STRING },
          hasFigure: { type: Type.BOOLEAN },
          figureDescription: { type: Type.STRING },
          figureBoundingBox: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "[ymin, xmin, ymax, xmax] normalized 0-1000 containing the visual drawing/diagram/circuit/chemical structure",
          },
          questionText: { type: Type.STRING, description: "Full problem statement verbatim without dropping words" },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["label", "text"],
            },
          },
          matchTable: {
            type: Type.OBJECT,
            properties: {
              column1Header: { type: Type.STRING },
              column2Header: { type: Type.STRING },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    leftKey: { type: Type.STRING },
                    leftText: { type: Type.STRING },
                    rightKey: { type: Type.STRING },
                    rightText: { type: Type.STRING },
                  },
                  required: ["leftKey", "leftText", "rightKey", "rightText"],
                },
              },
            },
          },
          english: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["label", "text"],
                },
              },
            },
            required: ["questionText", "options"],
          },
          hindi: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["label", "text"],
                },
              },
            },
          },
          optionsWithFigures: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                boundingBox: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
              },
              required: ["label", "boundingBox"],
            },
          },
          correctAnswer: { type: Type.STRING },
        },
        required: ["questionNumber", "questionText", "options"],
      },
    },
  },
  required: ["questions"],
};

// High-speed, token-efficient schema for Fast Text AI parsing
// Omits bounding boxes and redundant duplicate blocks, accelerating parse time by ~3x
const NEET_FAST_TEXT_QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          subject: { type: Type.STRING },
          chapter: { type: Type.STRING },
          hasFigure: { 
            type: Type.BOOLEAN, 
            description: "true if this question statement or its options refer to or contain a diagram, circuit, figure, graph, apparatus, ray optics diagram, or chemical structure" 
          },
          figureDescription: { 
            type: Type.STRING, 
            description: "Concise 3-6 word summary of the diagram needed from this page (e.g. 'Resistor bridge circuit', 'Convex lens ray optics')" 
          },
          optionsWithFigures: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of option labels ['A', 'B', 'C', 'D'] whose options are diagrams/structures"
          },
          questionText: { 
            type: Type.STRING, 
            description: "Full problem statement. If the question paper contains both English and Hindi, MUST include BOTH English and Hindi text together verbatim (e.g. English text, then Hindi text below it)!" 
          },
          englishText: { type: Type.STRING, description: "Pure verbatim English statement" },
          hindiText: { type: Type.STRING, description: "Pure verbatim Hindi (Devanagari) statement if present in paper" },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING, description: "Option text. If bilingual in PDF, include both English and Hindi text e.g. '10 m/s (10 मी/से)'" }
              },
              required: ["label", "text"]
            }
          },
          englishOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["label", "text"]
            }
          },
          hindiOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["label", "text"]
            }
          },
          matchTable: {
            type: Type.OBJECT,
            properties: {
              column1Header: { type: Type.STRING },
              column2Header: { type: Type.STRING },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    leftKey: { type: Type.STRING },
                    leftText: { type: Type.STRING },
                    rightKey: { type: Type.STRING },
                    rightText: { type: Type.STRING }
                  },
                  required: ["leftKey", "leftText", "rightKey", "rightText"]
                }
              }
            }
          },
          correctAnswer: { type: Type.STRING }
        },
        required: ["questionNumber", "questionText", "options"]
      }
    }
  },
  required: ["questions"]
};

const ANSWER_KEY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          answer: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          rawText: { type: Type.STRING }
        },
        required: ["questionNumber", "answer"]
      }
    }
  },
  required: ["answers"]
};

const SOLUTIONS_AND_KEY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          answer: { type: Type.STRING },
          rawText: { type: Type.STRING }
        },
        required: ["questionNumber", "answer"]
      }
    },
    solutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          answer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          formulaSummary: { type: Type.STRING }
        },
        required: ["questionNumber", "explanation"]
      }
    }
  },
  required: ["answers"]
};

/**
 * Resilient Gemini caller that catches 503 (high demand), 429, and transient timeouts
 * with automatic exponential backoff and seamless multi-model fallback.
 */
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction: string;
    preferredModel?: string;
    responseSchema?: any;
    responseMimeType?: string;
  }
): Promise<{ rawText: string; modelUsed: string }> {
  let lastError: any = null;

  // Filter out models currently in cooldown, unless all are in cooldown
  const now = Date.now();
  const allCandidates = params.preferredModel
    ? [params.preferredModel, ...GEMINI_MODELS_FALLBACK_CHAIN.filter(m => m !== params.preferredModel)]
    : GEMINI_MODELS_FALLBACK_CHAIN;

  const activeCandidates = allCandidates.filter(m => {
    const cd = geminiModelCooldowns.get(m);
    return !cd || cd <= now;
  });

  const modelsToTry = activeCandidates.length > 0 ? activeCandidates : allCandidates;

  const targetSchema = params.responseSchema === undefined
    ? NEET_QUESTION_SCHEMA
    : params.responseSchema;

  const configObj: any = {
    systemInstruction: params.systemInstruction,
    responseMimeType: params.responseMimeType || "application/json",
  };
  if (targetSchema) {
    configObj.responseSchema = targetSchema;
  }

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini OCR] Requesting model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: configObj,
      });

      const rawText = response.text || "{}";
      console.log(`[Gemini OCR] Model ${model} successfully digitized content.`);
      return { rawText, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuota =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("Quota exceeded") ||
        errMsg.includes("quota");
      const isTransient =
        isQuota ||
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("spikes in demand") ||
        errMsg.includes("temporarily unavailable") ||
        errMsg.includes("fetch failed");

      if (isQuota) {
        const retrySec = extractRetryDelaySeconds(err);
        (lastError as any).isRateLimited = true;
        (lastError as any).retryAfterSeconds = retrySec;
        geminiModelCooldowns.set(model, Date.now() + Math.max(retrySec, 60) * 1000);
        console.log(`[Gemini OCR] Model ${model} free-tier daily quota limit reached (${retrySec}s cooldown). Marked model in cooldown. Switching to fallback model...`);
        continue;
      }

      console.log(`[Gemini OCR] Model ${model}: ${cleanErrorMessage(err)}`);

      if (errMsg.includes("fetch failed")) {
        console.log(`[Gemini OCR] Model ${model} connection hiccup. Retrying once after 600ms...`);
        try {
          await new Promise(r => setTimeout(r, 600));
          const retryRes = await ai.models.generateContent({
            model,
            contents: params.contents,
            config: configObj,
          });
          const rawText = retryRes.text || "{}";
          console.log(`[Gemini OCR] Model ${model} retry succeeded.`);
          return { rawText, modelUsed: model };
        } catch (retryErr: any) {
          console.log(`[Gemini OCR] Model ${model} retry did not succeed, proceeding to next model.`);
        }
      }

      if (isTransient) {
        console.log(`[Gemini OCR] Model ${model} surge notice. Routing to next model in chain...`);
        // Cooldown the surged model for 45 seconds so subsequent pages don't waste time retrying it
        geminiModelCooldowns.set(model, Date.now() + 45000);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // If other non-retryable error, continue to next model
      continue;
    }
  }

  // Provide clear, actionable message
  const isHighDemand = Boolean(
    lastError?.message?.includes("503") ||
    lastError?.message?.includes("high demand") ||
    lastError?.message?.includes("spikes in demand") ||
    lastError?.message?.includes("UNAVAILABLE")
  );
  const isQuota =
    Boolean((lastError as any)?.isRateLimited) ||
    lastError?.message?.includes("429") ||
    lastError?.message?.includes("RESOURCE_EXHAUSTED") ||
    lastError?.message?.includes("Quota exceeded") ||
    lastError?.message?.includes("quota");

  const retrySec = extractRetryDelaySeconds(lastError);
  const isDaily = retrySec > 120 || Boolean(lastError?.message?.includes("per day") || lastError?.message?.includes("GenerateRequestsPerDayPerProjectPerModel"));

  const finalMsg = isQuota
    ? (isDaily
        ? `Gemini Free-tier daily quota limit reached (20 requests/day). Retry in ${Math.round(retrySec / 3600)}h or use offline vector extraction.`
        : `Gemini API quota reached. Please wait ${retrySec}s for quota window to reset.`)
    : isHighDemand
    ? "Gemini models are experiencing temporary high demand from Google. Seamlessly continuing with offline vector extraction."
    : cleanErrorMessage(lastError);

  const wrappedErr: any = new Error(finalMsg);
  wrappedErr.isRateLimited = isQuota;
  wrappedErr.isHighDemand = isHighDemand;
  wrappedErr.retryAfterSeconds = retrySec;
  wrappedErr.isDailyQuota = isDaily;
  throw wrappedErr;
}

// AI Status Check Endpoint
app.get("/api/ai/status", (_req, res) => {
  return res.json({
    success: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-3.8-flash",
    availableModels: GEMINI_MODELS_FALLBACK_CHAIN
  });
});

// Parse Single NEET PDF Page (High Resolution Vision + Figure Detection)
app.post("/api/ai/parse-neet-page", async (req, res) => {
  try {
    const { imageBase64, pageNumber, totalPages, preferredModel, parseMode, autoCrop, customApiKey } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Missing imageBase64 data" });
    }

    const providedKey = customApiKey || (req.headers['x-gemini-api-key'] as string) || undefined;
    const apiKey = providedKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets or enter your Gemini API key in the admin panel."
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, "").trim();
    let mimeType = "image/png";
    if (imageBase64.startsWith("data:image/jpeg")) {
      mimeType = "image/jpeg";
    } else if (imageBase64.startsWith("data:image/webp")) {
      mimeType = "image/webp";
    }

    const ai = getGeminiClient(providedKey);
    const isFastTextMode = parseMode === 'fast_text_gallery_crop';

    const figureRule = `3. MANDATORY Figures, Diagrams, Circuits, Graphs, and Chemical Structures (Tightly Isolated Bounding Boxes):
   - Physics, Chemistry, and Biology questions frequently feature diagrams, graphs, circuits, reaction schemes, benzene rings, anatomical figures, or experimental setups.
   - For ANY question with a visual drawing, schematic, circuit, graph, sketch, reaction scheme, or visual apparatus:
     * MUST set "hasFigure": true
     * "figureDescription": a concise label (e.g. "Pulley with suspended masses and tension T", "RC circuit diagram", "Reaction scheme Ph-C≡C-CH3 with reagent")
     * "figureBoundingBox": [ymin, xmin, ymax, xmax] as 4 integers normalized between 0 and 1000 representing the COMPLETE diagram region including all labels, tension symbols, suspended weights, axes, and arrow notations.
     * ZERO CLIPPING: Include the top pulley ceiling support, all hanging weights, tension 'T' labels, coordinate axes, and arrow directions!
     * DO NOT crop question statement text above the diagram or answer options below into the diagram box! The diagram box should tightly capture the figure itself.
     * If individual options (A, B, C, D) contain chemical structures or drawings (e.g. solid HF hydrogen bond representations, or organic reaction products):
       - MUST include "optionsWithFigures": [ { "label": "A", "boundingBox": [ymin, xmin, ymax, xmax] }, ... ]
   - FALSE FIGURE WARNING: DO NOT set "hasFigure": true for word questions without any visual drawings (e.g. "The number of significant figures in 11.118 x 10^-6 is" does NOT have a diagram!).`;

    const systemPrompt = `You are an expert NTA NEET Question Paper Digitization Assistant.
Your task is to accurately transcribe and digitize exam questions from this NEET exam page image with 100% fidelity.

CRITICAL RULES:
1. ONLY DIGITIZE GENUINE EXAM QUESTIONS (NEVER EXTRACT STANDALONE ANSWER KEYS OR SOLUTIONS AS QUESTIONS):
   - Many NEET PDFs have "Answer Key" grids at the end or "Hints & Solutions" / "Explanations".
   - DO NOT extract answer key matrices or solution derivations as new questions!
   - If this entire page contains ONLY an Answer Key table or Solutions without any question statements, return: {"questions": []}.
   - If the page has REAL QUESTIONS with question numbers, statements, and 4 options (A, B, C, D or 1, 2, 3, 4), digitize ALL OF THEM.

2. COLUMN-FIRST READING ORDER (ZERO CROSS-QUESTION CONTAMINATION):
   - NEET pages are almost always formatted in TWO COLUMNS (Left Column and Right Column).
   - You MUST read the LEFT COLUMN completely from top to bottom first, then the RIGHT COLUMN from top to bottom.
   - NEVER read horizontally across the vertical dividing line! Reading horizontally scrambles options between different questions (e.g. assigning de Broglie graph options to a solid HF question). Every question's options belong strictly to that question!

3. BILINGUAL INTEGRITY — ZERO RANDOM LANGUAGE MIXING:
   NEET and NTA question papers are very frequently BILINGUAL (English and Hindi).
   - If the page has bilingual text:
     * DO NOT extract Question 1 in English and Question 2 in Hindi!
     * If columns are parallel (Left = English, Right = Hindi with identical question numbers), pair Question N (English) with Question N (Hindi) as the EXACT SAME question!
     * If questions are stacked (English statement printed first, then Hindi translation below), extract BOTH English and Hindi for that question!
     * In "questionText": MUST include BOTH English and Hindi statements together verbatim:
       [English question statement]

       (हिंदी): [Hindi question statement]
     * In "englishText": English statement
     * In "hindiText": Hindi statement (Devanagari)
     * In "options": Options with both languages if both are printed on paper (e.g. '10 m/s (10 मी/से)')
     * In "englishOptions": Pure English options
     * In "hindiOptions": Pure Hindi options
   - If the page is purely English with no Hindi:
     * Extract English only into "questionText", "englishText", and "options", and omit "hindiText".

${figureRule}

4. Strict Mathematical Powers, Dimensional Formulas & Scientific Symbols:
   - Exponents, powers of 10, dimensional formulas, and inverse functions MUST use proper Unicode superscripts:
     [M⁻¹ L⁻² T⁴ A²], [M⁻³ L⁻² T⁴ A²], [M L⁻¹ T⁻²], [M⁰ L⁰ T⁰], 11.118 × 10⁻⁶, 2.04 × 10⁻²⁴ N, 2.04 × 10⁻²⁸ N, 10⁻⁶, m/s², cm³, tan⁻¹, sin⁻¹, √2.
   - SCIENTIFIC NOTATION & DECIMAL FIDELITY:
     * Retain decimal points and all digits (e.g. 0.01, 0.02, 0.005, 0.04). NEVER truncate to '0.' or a bare decimal point!
     * In shear strain questions: options like 0.01, 0.02, 0.005, 0.04 must be preserved with full precision!
     * If an option has "2.04 × 10⁻²⁴ N", output "2.04 × 10⁻²⁴ N". Do NOT shift powers across options A, B, C, D!
   - POLYNOMIAL EXPRESSIONS:
     * In polynomial kinematic equations (e.g. "x = 2 + 4t, y = 3t + 8t²"):
       Keep powers attached to their respective variables! Write "y = 3t + 8t²" verbatim.
   - VERTICAL FRACTIONS & RATIOS (NEVER DROP FRACTION SLASH):
     * When options or formulas contain vertical fractions (e.g. 4mg sin θ / K, 2mg sin θ / K, mg sin θ / 2K, 7/4 T, 4/3 T, 3/2 T):
       ALWAYS format with clean forward slash: '4mg sin θ / K', '2mg sin θ / K', 'mg sin θ / 2K', '7/4 T'.
       NEVER drop the fraction slash or output numbers like 'T7', 'T4 3', or 'T2 4'!
   - Use standard scientific Unicode characters: μ₀ (not mu_0), π (not pi), ε₀ (not epsilon_0), ω, θ, λ, α, β, γ, Δ, Ω (ohm), √ (not sqrt), · or × (not *), ±, °, →, ⇌.

5. Chemistry IUPAC, Benzene Rings, Chemical Structures & Boundary Rules:
   - ZERO MISSING COMPOUNDS: Never omit chemical structures, reaction schemes, or compounds!
   - In "The type of bonds present in solid HF are:", options are bond types: hydrogen bonds and covalent bonds. NEVER copy options from physics or de Broglie questions!
   - If a chemistry question refers to a compound A, B, C, skeletal bond line structure, substituted benzene ring, chair conformation, or reaction scheme:
     * MUST set "hasFigure": true
     * Provide "figureBoundingBox": [ymin, xmin, ymax, xmax] precisely enclosing the chemical drawing / benzene structure!

6. Clean Options Extraction (No Prefix Pollution & No Merging):
   - In "options", each option's "text" must contain the true choice content. NEVER include 'Option (A)', '(1)', '(A)', 'A.' inside the text!
   - NEVER merge all 4 options into one option or into questionText! Keep Options A, B, C, D separate with their true respective contents.
   - COMBINATION & STATEMENT OPTIONS:
     * When options refer to statements (e.g. Statements A, B, C, D, E), such as:
       (1) (A) and (E) only
       (2) (B) and (E) only
       (3) (A) takes lesser time to reach home
       (4) (D) only
       OR (1) Both (A) and (B) are true
     * DO NOT STRIP THE STATEMENT LABELS (A), (B), (C), (D), (E)!
     * The option text MUST BE "(A) and (E) only", NOT "and (E) only"!
     * Option (4) MUST BE "(D) only", NOT "only"!
   - 2x2 GRID & INLINE OPTIONS:
     * If options are printed in a 2x2 grid (e.g. thermodynamic cycles, spring blocks):
       (1) P₀ V₀        (2) 2 P₀ V₀
       (3) - P₀ V₀       (4) Zero
     * MUST extract all 4 options separately:
       Option A = "P₀ V₀"
       Option B = "2 P₀ V₀"
       Option C = "- P₀ V₀"
       Option D = "Zero"
     * NEVER merge (1) and (2) into Option A or Option B, and NEVER leave Option C or D as empty or "Option (C)"!
     * Recognize subscript 0: output P₀, V₀, P₀V₀, 2P₀V₀, not the letter 'O' ("PO VO")!

7. Match-the-Column Questions, Tables & Option Matrices:
   - When a question has Column 1 & Column 2 (or Column-I & Column-II, List-I & List-II):
     * MUST structure into "matchTable" with "column1Header", "column2Header", and ALL "rows".
     * Capture EVERY item from both columns.
     * The 4 options are complete matching combinations: e.g. A -> a, c; B -> d; C -> b; D -> b, c. NEVER truncate any option to 'A'!

8. Correct Answer:
   - If clearly marked on this question paper page, set correctAnswer ('A'|'B'|'C'|'D'). Otherwise default to 'A'.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };
    const textPart = {
      text: `Please parse all questions on this page (Page ${pageNumber || 1}${totalPages ? ` of ${totalPages}` : ""}). Follow column-first reading order. If the page is bilingual, ensure BOTH English and Hindi are captured for every question without mixing languages. Return valid JSON adhering strictly to the schema.`,
    };

    const { rawText, modelUsed } = await callGeminiWithFallback(ai, {
      contents: { parts: [imagePart, textPart] },
      systemInstruction: systemPrompt,
      preferredModel,
      responseSchema: isFastTextMode ? NEET_FAST_TEXT_QUESTION_SCHEMA : NEET_QUESTION_SCHEMA
    });

    const parsedData = safeParseGeminiJson(rawText);
    const pageBuffer = Buffer.from(cleanBase64, "base64");
    const normalized = await normalizeExtractedQuestions(
      parsedData.questions || [], 
      pageBuffer, 
      Number(pageNumber) || 1
    );

    const detectedQuestions = normalized.map(q => ({
      pageNumber: Number(pageNumber) || 1,
      questionNumber: q.questionNumber
    }));
    const pageValidationLog = generateValidationLog(
      detectedQuestions,
      normalized,
      1,
      normalized.length
    );

    return res.json({
      success: true,
      pageNumber: pageNumber || 1,
      modelUsed,
      questions: normalized,
      validationLog: pageValidationLog
    });
  } catch (err: any) {
    const isHighDemand = Boolean(
      err?.isHighDemand ||
      err?.message?.includes("503") ||
      err?.message?.includes("high demand") ||
      err?.message?.includes("spikes in demand") ||
      err?.message?.includes("UNAVAILABLE")
    );
    const isRateLimited = Boolean(
      err?.isRateLimited ||
      err?.message?.includes("429") ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("Quota exceeded") ||
      err?.message?.includes("quota")
    );
    const retryAfterSeconds = err?.retryAfterSeconds || 35;
    const isDailyQuota = Boolean(err?.isDailyQuota || retryAfterSeconds > 120 || isHighDemand);

    if (isRateLimited || isHighDemand) {
      console.log(`[Gemini OCR] Quota/demand notice for page ${req.body?.pageNumber || 1}. Returning safe vector fallback.`);
      return res.json({
        success: false,
        isRateLimited: true,
        isHighDemand,
        isDailyQuota: true,
        retryAfterSeconds,
        error: isHighDemand
          ? "Gemini models are experiencing temporary high demand from Google. Continuing seamlessly via offline vector extraction."
          : (isDailyQuota
              ? `Gemini Free-tier daily quota limit reached (20 requests/day). Continuing via offline vector extraction.`
              : `Gemini API quota reached. Please pause for ${retryAfterSeconds}s before retrying.`),
        questions: []
      });
    }

    const cleanErr = cleanErrorMessage(err);
    console.log(`[Gemini OCR] Page parse status: ${cleanErr}`);
    return res.status(500).json({
      success: false,
      error: cleanErr
    });
  }
});

/**
 * Robust JSON parser and repair engine for Gemini outputs:
 * Handles LaTeX backslashes (\alpha, \mu), missing commas, unescaped inner quotes,
 * literal unescaped newlines/tabs inside strings, trailing commas, and truncated responses.
 * Guarantees zero unhandled SyntaxErrors.
 */
function safeParseGeminiJson(rawText: string): any {
  if (!rawText || typeof rawText !== "string") return { questions: [] };

  // 1. Direct parse attempt
  try {
    return JSON.parse(rawText);
  } catch {}

  // 2. Strip markdown backticks
  let text = rawText.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(text);
  } catch {}

  // 3. Extract outermost object or array
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = text.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {}
    text = sliced;
  }

  // 4. Sanitize unescaped newlines, carriage returns, and control chars inside JSON strings
  const sanitizeControlCharsInStrings = (str: string): string => {
    let result = "";
    let inString = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const prev = i > 0 ? str[i - 1] : "";
      if (ch === '"' && prev !== "\\") {
        inString = !inString;
        result += ch;
      } else if (inString) {
        if (ch === "\n") result += "\\n";
        else if (ch === "\r") {} // drop carriage return
        else if (ch === "\t") result += " ";
        else result += ch;
      } else {
        result += ch;
      }
    }
    return result;
  };

  const textNoControlChars = sanitizeControlCharsInStrings(text);
  try {
    return JSON.parse(textNoControlChars);
  } catch {}

  // 5. Try LaTeX escape repair and trailing commas
  try {
    const r1 = textNoControlChars
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(r1);
  } catch {}

  // 6. Try missing commas between properties and array items
  try {
    const r2 = textNoControlChars
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/(:\s*"[^"]*?)"([^",}\]\s][^"]*?)"/g, "$1\\\"$2\\\"")
      .replace(/("(?:[^"\\]|\\.)*"|\d+|true|false|null|\]|\})\s*\n\s*("|\{|\[)/g, "$1,\n$2")
      .replace(/(}|])\s*\n\s*(")/g, "$1,\n$2");
    return JSON.parse(r2);
  } catch {}

  // 7. LIFO stack truncation repair (in case token limit was reached mid-JSON)
  try {
    let s = textNoControlChars.trim();
    const quotes = (s.match(/(?<!\\)"/g) || []).length;
    if (quotes % 2 !== 0) s += "\"";
    s = s.replace(/,\s*$/, "");
    s = s.replace(/,\s*"[^"]*?"\s*:\s*$/, "");

    const stack: string[] = [];
    let inString = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const prev = i > 0 ? s[i - 1] : "";
      if (ch === "\"" && prev !== "\\") {
        inString = !inString;
      } else if (!inString) {
        if (ch === "{" || ch === "[") {
          stack.push(ch);
        } else if (ch === "}" && stack[stack.length - 1] === "{") {
          stack.pop();
        } else if (ch === "]" && stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
    }
    while (stack.length > 0) {
      const top = stack.pop();
      if (top === "{") s += "}";
      else if (top === "[") s += "]";
    }
    const r3 = s
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/("(?:[^"\\]|\\.)*"|\d+|true|false|null|\]|\})\s*\n\s*("|\{|\[)/g, "$1,\n$2");
    return JSON.parse(r3);
  } catch {}

  // 8. Regex question extractor fallback: extracts individual valid question blocks
  try {
    const questions: any[] = [];
    const qMatches = text.match(/\{[^{}]*?"questionNumber"\s*:\s*\d+[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g) ||
                    text.match(/\{[^{}]*?"questionNumber"[\s\S]*?\}/g);
    if (qMatches && qMatches.length > 0) {
      for (const m of qMatches) {
        try {
          const sanitizedM = sanitizeControlCharsInStrings(m);
          const cleaned = sanitizedM
            .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
            .replace(/,\s*([}\]])/g, "$1");
          const qObj = JSON.parse(cleaned);
          if (qObj && typeof qObj === "object") questions.push(qObj);
        } catch {
          const numMatch = m.match(/"questionNumber"\s*:\s*(\d+)/);
          const qTextMatch = m.match(/"questionText"\s*:\s*"([\s\S]*?)(?<!\\)"/);
          if (numMatch && qTextMatch) {
            questions.push({
              questionNumber: parseInt(numMatch[1], 10),
              questionText: qTextMatch[1].replace(/\\n/g, "\n"),
              options: []
            });
          }
        }
      }
      if (questions.length > 0) return { questions };
    }
  } catch {}

  return { questions: [] };
}

/**
 * Crops a normalized bounding box [ymin, xmin, ymax, xmax] from an image buffer using sharp.
 * Optical padding of 45px ensures labels (A, B, P, Q, R, S), subscripts, units (10 Ω, 5 cm),
 * vector arrows, and captions are completely preserved without clipping.
 */
async function cropDiagramWithSharp(
  imageBuffer: Buffer,
  boundingBox: [number, number, number, number] | any
): Promise<string | null> {
  if (!imageBuffer || !Array.isArray(boundingBox) || boundingBox.length !== 4) return null;
  try {
    const meta = await sharp(imageBuffer).metadata();
    if (!meta.width || !meta.height) return null;

    let b0 = Number(boundingBox[0]);
    let b1 = Number(boundingBox[1]);
    let b2 = Number(boundingBox[2]);
    let b3 = Number(boundingBox[3]);

    if (isNaN(b0) || isNaN(b1) || isNaN(b2) || isNaN(b3)) return null;

    // Convert from 0-1 float to 0-1000 if needed
    if (b0 <= 1 && b1 <= 1 && b2 <= 1 && b3 <= 1 && (b2 > 0 || b3 > 0)) {
      b0 = Math.round(b0 * 1000);
      b1 = Math.round(b1 * 1000);
      b2 = Math.round(b2 * 1000);
      b3 = Math.round(b3 * 1000);
    }

    const ymin = Math.max(0, Math.min(1000, Math.min(b0, b2)));
    const ymax = Math.max(0, Math.min(1000, Math.max(b0, b2)));
    const xmin = Math.max(0, Math.min(1000, Math.min(b1, b3)));
    const xmax = Math.max(0, Math.min(1000, Math.max(b1, b3)));

    if (ymax - ymin < 12 || xmax - xmin < 12) return null;

    // Generous optical margin: 65 pixels around the diagram to capture pulleys, tension labels, and bonds
    const pad = 65;
    const rawX = Math.round((xmin / 1000) * meta.width);
    const rawY = Math.round((ymin / 1000) * meta.height);
    const rawW = Math.round(((xmax - xmin) / 1000) * meta.width);
    const rawH = Math.round(((ymax - ymin) / 1000) * meta.height);

    const left = Math.max(0, rawX - pad);
    const top = Math.max(0, rawY - pad);
    const width = Math.min(meta.width - left, rawW + pad * 2);
    const height = Math.min(meta.height - top, rawH + pad * 2);

    if (width < 25 || height < 25) return null;

    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .png({ quality: 90 })
      .toBuffer();

    return `data:image/png;base64,${croppedBuffer.toString("base64")}`;
  } catch (err) {
    console.warn("Sharp diagram crop error:", err);
    return null;
  }
}

/**
 * Extracts and structures Match-the-Column tables from question content.
 * Supports Column-I / Column-II, List-I / List-II, सूची-I / सूची-II.
 */
function extractMatchTable(q: any, rawText: string): any | undefined {
  if (q.matchTable && Array.isArray(q.matchTable.rows) && q.matchTable.rows.length > 0) {
    return {
      column1Header: (q.matchTable.column1Header || "Column-I").trim(),
      column2Header: (q.matchTable.column2Header || "Column-II").trim(),
      rows: q.matchTable.rows.map((r: any, rIdx: number) => ({
        leftKey: (r.leftKey || r.c1?.split(' ')[0] || `(${String.fromCharCode(65 + rIdx)})`).trim(),
        leftText: (r.leftText || r.c1?.replace(/^\([^)]+\)\s*/, '') || '').trim(),
        rightKey: (r.rightKey || r.c2?.split(' ')[0] || `(${rIdx + 1})`).trim(),
        rightText: (r.rightText || r.c2?.replace(/^\([^)]+\)\s*/, '') || '').trim()
      }))
    };
  }

  // Regex pattern matching from text: e.g. "(A) Lyophilic sols (I) Reversible sols" or "(A) m = -2 (a) Convex mirror"
  if (rawText && /match\s+(?:the\s+)?(?:corresponding\s+)?(?:column|list|following|entries)|सूची\s*[-–—I1ivx\s]*को\s*सूची|कॉलम\s*[-–—I1ivx\s]*को\s*कॉलम|सुमेलित\s*कीजिए/i.test(rawText)) {
    const lines = rawText.split(/\r?\n/);
    const rows: any[] = [];
    for (const line of lines) {
      // Matches: (A) text (a) text, (A) text (1) text, (A) text (I) text, A. text a. text
      const match = line.match(/^\s*(?:\(?([A-Da-d])\)?|\b([A-Da-d])[\.:])\s+([^(\n]+?)\s+(?:\(?([1-4I-Vi-va-zA-Z]+)\)?|\b([1-4I-Vi-va-zA-Z]+)[\.:])\s+(.+)$/);
      if (match) {
        rows.push({
          leftKey: `(${match[1] || match[2]})`.toUpperCase(),
          leftText: match[3].trim(),
          rightKey: `(${match[4] || match[5]})`,
          rightText: match[6].trim()
        });
      }
    }
    if (rows.length >= 2) {
      return {
        column1Header: "Column-I",
        column2Header: "Column-II",
        rows
      };
    }
  }

  return undefined;
}

/**
 * Cleans question text by removing duplicate table rows and markdown syntax
 */
function cleanQuestionStatementText(text: string, matchTable?: any): string {
  if (!text) return "";
  let cleaned = text
    .replace(/^\|?[\s|:\-]+(?:\|[\s|:\-]+)*\|?$/gm, "")
    .replace(/\|{2,}/g, "")
    .replace(/\|\s*:\s*-+[\s\-:|]*/g, "")
    .replace(/^\s*\|\s*$/gm, "")
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");

  if (matchTable && matchTable.rows && matchTable.rows.length >= 2) {
    const preambleMatch = cleaned.match(/^([\s\S]*?(?:Match\s+(?:List|Column)[\s\S]*?[:\.]|सूची\s*[-–—I1]\s*को\s*सूची[\s\S]*?[:\.]|कॉलम\s*[-–—I1]\s*को\s*कॉलम[\s\S]*?[:\.]))/i);
    const closingMatch = cleaned.match(/((?:Choose\s+the\s+correct\s+answer|Select\s+the\s+correct\s+option|नीचे\s+दिए\s+गए\s+विकल्पों\s+में\s+से)[\s\S]*)$/i);
    if (preambleMatch && preambleMatch[1] && preambleMatch[1].trim().length > 6) {
      const preamble = preambleMatch[1].trim();
      const ending = closingMatch ? `\n\n${closingMatch[1].trim()}` : "";
      return `${preamble}${ending}`.trim();
    }
    for (const row of matchTable.rows) {
      if (row.leftText && row.leftText.length > 2) {
        const esc = row.leftText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
      }
      if (row.rightText && row.rightText.length > 2) {
        const esc = row.rightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(`(?:\\([a-zA-Z0-9ivx]+\\)\\s*)?${esc}`, 'gi'), '');
      }
    }
  }

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Universal Question Normalizer:
 * Extracts real question statements, bilingual English & Hindi text, Match Tables,
 * and crops authentic high-resolution diagrams using sharp.
 */
async function normalizeExtractedQuestions(rawList: any[], pageBuffer?: Buffer, pageNumber?: number): Promise<any[]> {
  if (!Array.isArray(rawList)) return [];

  const devanagariRegex = /[\u0900-\u097F]/g;
  const normalizedList: any[] = [];

  for (let idx = 0; idx < rawList.length; idx++) {
    const q = rawList[idx];

    // Verbatim text extraction across English & Hindi fields
    let rawEnText = '';
    if (typeof q.englishText === 'string' && q.englishText.trim()) {
      rawEnText = q.englishText.trim();
    } else if (typeof q.english?.questionText === 'string' && q.english.questionText.trim()) {
      rawEnText = q.english.questionText.trim();
    } else if (typeof q.questionText === 'string' && q.questionText.trim()) {
      rawEnText = q.questionText.trim();
    } else if (typeof q.question === 'string' && q.question.trim()) {
      rawEnText = q.question.trim();
    } else if (typeof q.statement === 'string' && q.statement.trim()) {
      rawEnText = q.statement.trim();
    } else if (typeof q.text === 'string' && q.text.trim()) {
      rawEnText = q.text.trim();
    } else if (typeof q.english === 'string' && q.english.trim()) {
      rawEnText = q.english.trim();
    }

    let rawHiText = '';
    if (typeof q.hindiText === 'string' && q.hindiText.trim()) {
      rawHiText = q.hindiText.trim();
    } else if (typeof q.hindi?.questionText === 'string' && q.hindi.questionText.trim()) {
      rawHiText = q.hindi.questionText.trim();
    } else if (typeof q.hindi === 'string' && q.hindi.trim()) {
      rawHiText = q.hindi.trim();
    }

    let qNum = typeof q.questionNumber === 'number' && q.questionNumber > 0
      ? q.questionNumber
      : 0;
    if (qNum <= 0) {
      const numMatch = (rawEnText || rawHiText || '').match(/^(?:Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3})[\.\:\)])/i);
      if (numMatch) {
        qNum = parseInt(numMatch[1] || numMatch[2], 10);
      }
    }
    if (qNum <= 0) {
      qNum = idx + 1;
    }

    // Check for explicit bilingual delimiter e.g. "(हिंदी):"
    const biDelimMatch = rawEnText.match(/^([\s\S]*?)(?:\r?\n\s*\(हिंदी\)\s*:\s*|\s*\(हिंदी\)\s*:\s*)([\s\S]+)$/i);
    if (biDelimMatch) {
      rawEnText = biDelimMatch[1].trim();
      rawHiText = rawHiText ? `${rawHiText} ${biDelimMatch[2].trim()}` : biDelimMatch[2].trim();
    }

    // If rawEnText itself contains both English and Hindi (e.g. stacked in questionText),
    // separate them cleanly so both languages are preserved
    const enDevCount = (rawEnText.match(devanagariRegex) || []).length;
    const enTotalLen = rawEnText.replace(/\s+/g, '').length;
    const enDevRatio = enTotalLen > 0 ? enDevCount / enTotalLen : 0;

    if (!rawHiText && enDevRatio > 0.15 && enTotalLen > 30) {
      const lines = rawEnText.split(/\r?\n/);
      const enLines: string[] = [];
      const hiLines: string[] = [];
      for (const line of lines) {
        const lineDevCount = (line.match(devanagariRegex) || []).length;
        const lineLen = line.replace(/\s+/g, '').length;
        if (lineLen > 0 && lineDevCount / lineLen > 0.30) {
          hiLines.push(line);
        } else {
          enLines.push(line);
        }
      }
      if (enLines.length > 0 && hiLines.length > 0) {
        rawEnText = enLines.join(' ').trim();
        rawHiText = hiLines.join(' ').trim();
      }
    } else if (enDevRatio > 0.40) {
      if (rawHiText && rawHiText.length > 0) {
        const temp = rawEnText;
        rawEnText = rawHiText;
        rawHiText = temp;
      } else {
        rawHiText = rawEnText;
      }
    }

    // Extract English options
    let rawOpts = q.englishOptions || q.english?.options || q.options || q.choices || q.answers || [];
    let normalizedEnOpts: Array<{ label: 'A'|'B'|'C'|'D'; text: string; value: string; type: 'text' }> = [];

    if (Array.isArray(rawOpts) && rawOpts.length > 0) {
      normalizedEnOpts = (['A', 'B', 'C', 'D'] as const).map((lbl, oIdx) => {
        const item = rawOpts.find((o: any) => (o?.label || '').toUpperCase() === lbl) || rawOpts[oIdx];
        let val = '';
        if (typeof item === 'string') {
          val = cleanLeadingOptionMarker(item, lbl);
        } else if (item && typeof item === 'object') {
          val = cleanLeadingOptionMarker((item.text || item.value || item.statement || item.label_text || '').toString(), lbl);
        }
        return { label: lbl, text: val || `Option (${lbl})`, value: val || `Option (${lbl})`, type: 'text' as const };
      });
    } else {
      normalizedEnOpts = (['A', 'B', 'C', 'D'] as const).map(lbl => ({
        label: lbl,
        text: `Option (${lbl})`,
        value: `Option (${lbl})`,
        type: 'text' as const
      }));
    }

    // Extract Hindi options if present
    let rawHiOpts = q.hindiOptions || q.hindi?.options || [];
    let normalizedHiOpts: Array<{ label: 'A'|'B'|'C'|'D'; text: string; value: string; type: 'text' }> = [];
    if (Array.isArray(rawHiOpts) && rawHiOpts.length > 0) {
      normalizedHiOpts = (['A', 'B', 'C', 'D'] as const).map((lbl, oIdx) => {
        const item = rawHiOpts.find((o: any) => (o?.label || '').toUpperCase() === lbl) || rawHiOpts[oIdx];
        let val = '';
        if (typeof item === 'string') {
          val = cleanLeadingOptionMarker(item, lbl);
        } else if (item && typeof item === 'object') {
          val = cleanLeadingOptionMarker((item.text || item.value || item.statement || item.label_text || '').toString(), lbl);
        }
        return { label: lbl, text: val || `विकल्प (${lbl})`, value: val || `विकल्प (${lbl})`, type: 'text' as const };
      });
    }

    // Match Table Extraction
    const matchTable = extractMatchTable(q, rawEnText || rawHiText);
    const cleanEnText = cleanQuestionStatementText(rawEnText, matchTable);
    const cleanHiText = rawHiText ? cleanQuestionStatementText(rawHiText, matchTable) : undefined;

    // Figure Bounding Box & Sharp Diagram Crop
    const resolvedBbox = q.figureBoundingBox || q.boundingBox || q.figure_bbox || q.bbox || null;
    let croppedFigureUrl: string | undefined = undefined;

    if (pageBuffer && resolvedBbox && Array.isArray(resolvedBbox) && resolvedBbox.length === 4) {
      const cropped = await cropDiagramWithSharp(pageBuffer, resolvedBbox);
      if (cropped) {
        croppedFigureUrl = cropped;
      }
    }

    // Option Figures Crop
    let optionFigures: Record<string, string> | undefined = undefined;
    if (pageBuffer && Array.isArray(q.optionsWithFigures)) {
      optionFigures = {};
      for (const optFig of q.optionsWithFigures) {
        if (optFig?.label && optFig?.boundingBox) {
          const optCrop = await cropDiagramWithSharp(pageBuffer, optFig.boundingBox);
          if (optCrop) {
            optionFigures[optFig.label.toUpperCase()] = optCrop;
          }
        }
      }
      if (Object.keys(optionFigures).length === 0) {
        optionFigures = undefined;
      }
    }

    const genuineVisualRegex = /(?:(?:given|shown|depicted|illustrated)\s+in\s+(?:the\s+)?(?:given\s+)?(?:figure|diagram|scheme|graph|circuit|drawing|curve)|as\s+shown\s+in|refer\s+to\s+(?:the\s+)?(?:diagram|figure)|following\s+(?:circuit\s+diagram|reaction\s+scheme|ray\s+diagram|potential\s+energy\s+curve)|दिए\s*गए\s*(?:चित्र|आरेख|ग्राफ|परिपथ)|चित्र\s*में\s*(?:दर्शाए|दिखाए)|नीचे\s*दिए\s*गए\s*(?:चित्र|आरेख)|IUPAC\s+name\s+of\b|structure\s+of\s+(?:the\s+)?(?:compound|molecule)|following\s+(?:compound|compounds|reaction|sequence)|acidic\s+strength|basic\s+strength|major\s+product\b|benzene\s+ring|pulley|tension\s+in\s+the\s+string|bond\s+in\s+solid\s+hf|solid\s+hf|----->|-->|→)/i;
    const mentionsVisual = genuineVisualRegex.test(cleanEnText + ' ' + (cleanHiText || '')) || /IUPAC\s+name\s+of\s*[:\?]?$/i.test((cleanEnText || '').trim()) || /acidic\s+strength.*[:\?]$/i.test((cleanEnText || '').trim());

    // Auto-Crop Fallback for Organic Chemistry and Diagrams if boundingBox was omitted by Gemini
    if (pageBuffer && !croppedFigureUrl && (mentionsVisual || q.hasFigure)) {
      const qIndexOnPage = idx;
      const safeTotal = Math.max(1, rawList.length);
      const slotHeight = 900 / safeTotal;
      const ymin = Math.max(40, Math.round(50 + qIndexOnPage * slotHeight + slotHeight * 0.10));
      const ymax = Math.min(970, Math.round(50 + qIndexOnPage * slotHeight + slotHeight * 0.85));
      const estimatedBox: [number, number, number, number] = [ymin, 35, ymax, 490]; // Left English column
      const autoCrop = await cropDiagramWithSharp(pageBuffer, estimatedBox);
      if (autoCrop) {
        croppedFigureUrl = autoCrop;
      }
    }

    const hasFig = Boolean(croppedFigureUrl || (q.hasFigure && mentionsVisual) || mentionsVisual);

    // Skip blank placeholder questions
    const primaryText = cleanEnText || cleanHiText || '';
    if (!primaryText || primaryText.trim().length < 3 || /^Question\s*\d+$/i.test(primaryText.trim())) {
      continue;
    }

    const subject: string = q.subject || (qNum <= 45 ? 'Physics' : qNum <= 90 ? 'Chemistry' : 'Biology');
    const resolvedPageNumber = Number(q.pdfPageNumber || q.pageNumber || pageNumber || 1);

    // Dual-language bilingual composition: If both English and Hindi are present on paper, preserve both!
    const isBilingual = Boolean(cleanEnText && cleanHiText && cleanEnText.trim() !== cleanHiText.trim());
    const compositeQuestionText = isBilingual
      ? `${cleanEnText}\n\n(हिंदी): ${cleanHiText}`
      : (cleanEnText || cleanHiText || `Question ${qNum}`);

    // Check for foreign question text contaminated inside an option (e.g. Q52 de-Broglie text inside Q51 option D)
    let extraSwallowedQuestion: any = null;
    const foreignQuestionRegex = /(?:according\s+to\s+the\s+wave-particle|which\s+of\s+the\s+following\s+graph|wave-particle\s+duality|relation\s+between\s+wavelength.*momentum)/i;

    // If options are bilingual, combine text cleanly without nested markers
    const finalOptions = normalizedEnOpts.map((enOpt, oIdx) => {
      const hiOpt = normalizedHiOpts[oIdx];
      let enVal = (enOpt.value || '').trim();
      let hiVal = (hiOpt?.value || '').trim();

      // Check cross-question contamination
      if (foreignQuestionRegex.test(enVal) && enVal.length > 40) {
        extraSwallowedQuestion = {
          statement: enVal,
          sourcePage: resolvedPageNumber,
          afterQNum: qNum
        };
        enVal = `Option (${enOpt.label})`;
      }

      // Preserve match the column option combinations
      if (!/^\(?[A-D]\)?\s*(?:->|→|-|:)\s*/i.test(enVal)) {
        // Strip leading option markers safely while strictly protecting combinations like "(A) and (E) only"
        enVal = cleanLeadingOptionMarker(enVal, enOpt.label);
        hiVal = cleanLeadingOptionMarker(hiVal, enOpt.label);
      }

      if (/^Option\s*\([A-D]\)$/i.test(enVal) && hiVal && !/^विकल्प\s*\([A-D]\)$/i.test(hiVal)) {
        return {
          ...enOpt,
          text: hiVal,
          value: hiVal
        };
      }
      return {
        ...enOpt,
        text: enVal || hiVal || `Option (${enOpt.label})`,
        value: enVal || hiVal || `Option (${enOpt.label})`
      };
    });

    const needsCrop = Boolean(hasFig && !croppedFigureUrl && mentionsVisual);
    const hintText = needsCrop
      ? `Diagram needed from PDF Page ${resolvedPageNumber}${q.figureDescription ? `: ${q.figureDescription}` : ''}`
      : undefined;

    const itemToPush = {
      ...q,
      questionNumber: qNum,
      pdfPageNumber: resolvedPageNumber,
      subject,
      chapter: q.chapter || `${subject} Chapter`,
      questionText: compositeQuestionText,
      options: finalOptions,
      languages: {
        en: {
          questionText: cleanEnText || cleanHiText || `Question ${qNum}`,
          options: normalizedEnOpts,
          figureUrl: croppedFigureUrl,
          matchTable
        },
        hi: cleanHiText ? {
          questionText: cleanHiText,
          options: normalizedHiOpts.length > 0 ? normalizedHiOpts : normalizedEnOpts,
          figureUrl: croppedFigureUrl,
          matchTable
        } : undefined
      },
      matchTable,
      hasFigure: hasFig,
      needsDiagramCrop: needsCrop,
      diagramHint: hintText,
      figureDescription: q.figureDescription,
      figureUrl: croppedFigureUrl,
      figures: croppedFigureUrl ? [croppedFigureUrl] : [],
      questionImageUrl: croppedFigureUrl,
      optionFigures,
      optionsWithFigures: q.optionsWithFigures,
      figureBoundingBox: Array.isArray(resolvedBbox) ? resolvedBbox : undefined,
      correctAnswer: (q.correctAnswer || 'A').toString().toUpperCase().slice(0, 1),
      marks: 4,
      negativeMarks: 1
    };

    const existIdx = normalizedList.findIndex(item => item.questionNumber === qNum);
    if (existIdx > -1) {
      const existing = normalizedList[existIdx];
      const existDevCount = (existing.questionText.match(devanagariRegex) || []).length;
      const newDevCount = (compositeQuestionText.match(devanagariRegex) || []).length;

      if (existDevCount === 0 && newDevCount > 0) {
        existing.questionText = `${existing.questionText}\n\n(हिंदी): ${cleanHiText || compositeQuestionText}`;
        existing.languages = {
          en: existing.languages?.en || { questionText: existing.questionText, options: existing.options },
          hi: { questionText: cleanHiText || compositeQuestionText, options: normalizedHiOpts.length > 0 ? normalizedHiOpts : existing.options }
        };
      } else if (existDevCount > 0 && newDevCount === 0) {
        existing.questionText = `${cleanEnText || compositeQuestionText}\n\n(हिंदी): ${existing.questionText}`;
        existing.languages = {
          en: { questionText: cleanEnText || compositeQuestionText, options: normalizedEnOpts.length > 0 ? normalizedEnOpts : existing.options },
          hi: existing.languages?.hi || { questionText: existing.questionText, options: existing.options }
        };
      } else {
        const cleanA = (compositeQuestionText || '').replace(/^(?:Question|Q\.?)\s*\d+[\.:\s]*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const cleanB = (existing.questionText || '').replace(/^(?:Question|Q\.?)\s*\d+[\.:\s]*/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const isExactSame = cleanA === cleanB || (cleanA.length > 80 && cleanB.length > 80 && (cleanA.includes(cleanB) || cleanB.includes(cleanA)));
        if (isExactSame) {
          normalizedList[existIdx] = { ...existing, ...itemToPush };
        } else {
          // Distinct question that collided on question number: keep both!
          const maxNum = Math.max(...normalizedList.map(item => item.questionNumber), 0);
          itemToPush.questionNumber = maxNum + 1;
          normalizedList.push(itemToPush);
        }
      }
    } else {
      normalizedList.push(itemToPush);
    }

    // If an adjacent question was swallowed into an option, push it as a distinct question!
    if (extraSwallowedQuestion) {
      const nextQNum = qNum + 1;
      const nextSubj: 'Physics' | 'Chemistry' | 'Biology' = nextQNum <= 45 ? 'Physics' : nextQNum <= 90 ? 'Chemistry' : 'Biology';
      normalizedList.push({
        questionNumber: nextQNum,
        pdfPageNumber: extraSwallowedQuestion.sourcePage,
        subject: nextSubj,
        chapter: `${nextSubj} Core`,
        questionText: extraSwallowedQuestion.statement,
        options: (['A', 'B', 'C', 'D'] as const).map(lbl => ({
          label: lbl,
          text: `Option (${lbl})`,
          value: `Option (${lbl})`,
          type: 'text' as const
        })),
        languages: {
          en: {
            questionText: extraSwallowedQuestion.statement,
            options: (['A', 'B', 'C', 'D'] as const).map(lbl => ({ label: lbl, text: `Option (${lbl})`, value: `Option (${lbl})`, type: 'text' as const }))
          }
        },
        hasFigure: true,
        needsDiagramCrop: true,
        diagramHint: `Diagram (graph/relation) needed for Q${nextQNum}`,
        correctAnswer: 'A',
        marks: 4,
        negativeMarks: 1
      });
    }
  }

  return normalizedList;
}

// ==========================================
// BACKGROUND PDF PARSING JOBS SYSTEM
// Continues executing on server even if client closes section or site
// ==========================================
interface ServerParseJob {
  id: string;
  testTitle: string;
  testNumber: string;
  testPrice: number;
  isFree: boolean;
  testDuration: number;
  testCategory?: string;
  subject?: string;
  chapter?: string;
  targetTestId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  statusMessage: string;
  progress: number;
  currentPage: number;
  totalPages: number;
  questionsCount: number;
  figuresCount: number;
  questions: any[];
  validationLog?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const activeParseJobs = new Map<string, ServerParseJob>();
const PARSE_JOBS_CACHE_FILE = path.join(process.cwd(), ".parse_jobs_cache.json");

function saveJobsToDisk() {
  try {
    const list = Array.from(activeParseJobs.entries()).slice(-10); // Keep last 10 jobs
    fs.writeFileSync(PARSE_JOBS_CACHE_FILE, JSON.stringify(list), "utf-8");
  } catch (e) {
    console.warn("Failed saving parse jobs to disk:", e);
  }
}

function loadJobsFromDisk() {
  try {
    if (fs.existsSync(PARSE_JOBS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(PARSE_JOBS_CACHE_FILE, "utf-8"));
      if (Array.isArray(data)) {
        for (const [id, job] of data) {
          activeParseJobs.set(id, job);
        }
      }
    }
  } catch (e) {
    console.warn("Failed loading parse jobs from disk:", e);
  }
}

// Load persisted jobs on server boot
loadJobsFromDisk();

// Start a Background Parsing Job (supports pageImages array or direct PDF)
app.post("/api/ai/parse-job/start", upload.any(), async (req, res) => {
  try {
    let pageImages: Array<{ pageNumber: number; imageBase64: string }> = [];
    if (req.body?.pageImages) {
      if (typeof req.body.pageImages === 'string') {
        try {
          pageImages = JSON.parse(req.body.pageImages);
        } catch {}
      } else if (Array.isArray(req.body.pageImages)) {
        pageImages = req.body.pageImages;
      }
    }

    let pdfBase64 = "";
    const attachedPdfFile = req.file || (req.files && Array.isArray(req.files) ? req.files.find((f: any) => f.fieldname === 'pdf' || f.mimetype?.includes('pdf')) || req.files[0] : null);
    if (attachedPdfFile && attachedPdfFile.buffer) {
      pdfBase64 = attachedPdfFile.buffer.toString("base64");
    } else if (req.body?.pdfBase64) {
      pdfBase64 = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
    }

    if (pageImages.length === 0 && !pdfBase64) {
      return res.status(400).json({ success: false, error: "pageImages array or PDF file required" });
    }

    const testPrice = Number(req.body?.testPrice || 0);
    const isFree = req.body?.isFree === 'true' || req.body?.isFree === true || testPrice === 0;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalPagesCount = pageImages.length > 0 ? pageImages.length : (Number(req.body?.totalPages) || 1);

    const job: ServerParseJob = {
      id: jobId,
      testTitle: req.body?.testTitle || "NEET Grand Mock Test",
      testNumber: req.body?.testNumber || "Test 01",
      testPrice: isFree ? 0 : testPrice,
      isFree,
      testDuration: Number(req.body?.testDuration || 180),
      testCategory: req.body?.testCategory || 'full_syllabus',
      subject: req.body?.subject,
      chapter: req.body?.chapter,
      targetTestId: req.body?.targetTestId,
      status: 'processing',
      statusMessage: `AI Parser started for ${totalPagesCount} pages...`,
      progress: 5,
      currentPage: 0,
      totalPages: totalPagesCount,
      questionsCount: 0,
      figuresCount: 0,
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    activeParseJobs.set(jobId, job);
    saveJobsToDisk();

    // Asynchronously execute background parsing on server
    (async () => {
      try {
        const ai = getGeminiClient();
        const accumulatedQuestions: any[] = [];
        let accumulatedFiguresCount = 0;

        if (pageImages.length > 0) {
          // Page-by-page high-resolution processing with sharp diagram cropping
          for (let pIdx = 0; pIdx < pageImages.length; pIdx++) {
            if (job.status === 'cancelled') break;

            const pageItem = pageImages[pIdx];
            const pNum = pageItem.pageNumber || (pIdx + 1);

            job.currentPage = pNum;
            job.statusMessage = `Digitizing Page ${pNum} of ${pageImages.length} with Gemini Vision & OCR...`;
            job.progress = Math.round((pIdx / pageImages.length) * 95);
            job.updatedAt = new Date().toISOString();
            saveJobsToDisk();

            try {
              const cleanB64 = pageItem.imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, "").trim();
              const pageBuf = Buffer.from(cleanB64, "base64");
              let mimeType = "image/jpeg";
              if (pageItem.imageBase64.startsWith("data:image/png")) mimeType = "image/png";

              const isFastTextMode = req.body?.parseMode === 'fast_text_gallery_crop' || req.body?.parseStrategy === 'fast_text_gallery_crop' || req.body?.autoCrop === false || req.body?.autoCrop === 'false';

              const promptInstruction = isFastTextMode
                ? `You are an expert NTA NEET Question Paper Digitization Assistant.
CRITICAL RULES:
1. Digitize all real questions with problem statements and 4 real options. Ignore standalone answer key grids and solutions.
2. If bilingual, extract both "english" and "hindi" fields verbatim.
3. FAST TEXT-ONLY MODE: DO NOT extract diagram bounding boxes or image coordinates. Set "hasFigure": true if question mentions a diagram, and provide "figureDescription".
4. For Match the Column, populate structured "matchTable" with "rows": [{"leftKey": "(A)", "leftText": "...", "rightKey": "(1)", "rightText": "..."}].
5. Never return dummy questions. Output valid JSON adhering strictly to schema.`
                : `You are an expert NTA NEET Question Paper Digitization Assistant.
CRITICAL RULES:
1. Digitize all real questions with problem statements and 4 real options. Ignore standalone answer key grids and solutions.
2. If bilingual, extract both "english" and "hindi" fields verbatim.
3. For any diagrams, circuits, graphs, or chemical structures, provide "figureBoundingBox": [ymin, xmin, ymax, xmax] (normalized 0-1000) with generous margins capturing all labels, subscripts, and units.
4. For Match the Column, populate structured "matchTable" with "rows": [{"leftKey": "(A)", "leftText": "...", "rightKey": "(1)", "rightText": "..."}].
5. Never return dummy questions. Output valid JSON adhering strictly to schema.`;

              const { rawText } = await callGeminiWithFallback(ai, {
                contents: {
                  parts: [
                    { inlineData: { mimeType, data: cleanB64 } },
                    { text: `Parse all questions on Page ${pNum} of ${pageImages.length}. Transcribe English and Hindi verbatim.${isFastTextMode ? ' Skip diagram coordinates.' : ' Detect diagrams and provide precise bounding box [ymin, xmin, ymax, xmax].'} Structure match-the-column tables.` }
                  ]
                },
                systemInstruction: promptInstruction,
                responseSchema: isFastTextMode ? NEET_FAST_TEXT_QUESTION_SCHEMA : NEET_QUESTION_SCHEMA
              });

              const parsedData = safeParseGeminiJson(rawText);
              const normalizedPageQs = await normalizeExtractedQuestions(
                parsedData.questions || [], 
                isFastTextMode ? undefined : pageBuf,
                pNum
              );

              for (const nq of normalizedPageQs) {
                if (nq.figureUrl) accumulatedFiguresCount++;
                const existIdx = accumulatedQuestions.findIndex(q => q.questionNumber === nq.questionNumber);
                if (existIdx > -1) {
                  const existing = accumulatedQuestions[existIdx];
                  const devanagariRegex = /[\u0900-\u097F]/g;
                  const existDevCount = (existing.questionText.match(devanagariRegex) || []).length;
                  const newDevCount = (nq.questionText.match(devanagariRegex) || []).length;

                  // 1. If one is predominantly English and the other is Hindi, merge into bilingual question
                  if (existDevCount < 5 && newDevCount >= 5) {
                    existing.questionText = `${existing.questionText}\n\n(हिंदी): ${nq.questionText}`;
                    existing.languages = {
                      en: existing.languages?.en || { questionText: existing.questionText, options: existing.options },
                      hi: nq.languages?.hi || { questionText: nq.questionText, options: nq.options }
                    };
                    if (nq.figureUrl && !existing.figureUrl) {
                      existing.figureUrl = nq.figureUrl;
                      existing.questionImageUrl = nq.figureUrl;
                    }
                  } else if (existDevCount >= 5 && newDevCount < 5) {
                    existing.questionText = `${nq.questionText}\n\n(हिंदी): ${existing.questionText}`;
                    existing.languages = {
                      en: nq.languages?.en || { questionText: nq.questionText, options: nq.options },
                      hi: existing.languages?.hi || { questionText: existing.questionText, options: existing.options }
                    };
                    if (nq.figureUrl && !existing.figureUrl) {
                      existing.figureUrl = nq.figureUrl;
                      existing.questionImageUrl = nq.figureUrl;
                    }
                  } else {
                    // 2. Both are English or both are Hindi: select the more complete extraction without incrementing question count
                    const scoreExisting = (existing.options?.filter(o => o.value && !/^Option\s*\([A-D]\)$/i.test(o.value)).length || 0) * 20 
                      + Math.min(100, existing.questionText.length) 
                      + (existing.figureUrl ? 50 : 0);
                    const scoreNew = (nq.options?.filter(o => o.value && !/^Option\s*\([A-D]\)$/i.test(o.value)).length || 0) * 20 
                      + Math.min(100, nq.questionText.length) 
                      + (nq.figureUrl ? 50 : 0);

                    if (scoreNew > scoreExisting) {
                      accumulatedQuestions[existIdx] = {
                        ...nq,
                        questionNumber: existing.questionNumber,
                        figureUrl: nq.figureUrl || existing.figureUrl,
                        questionImageUrl: nq.questionImageUrl || existing.questionImageUrl
                      };
                    } else if (nq.figureUrl && !existing.figureUrl) {
                      existing.figureUrl = nq.figureUrl;
                      existing.questionImageUrl = nq.figureUrl;
                    }
                  }
                } else {
                  accumulatedQuestions.push(nq);
                }
              }

              accumulatedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
              job.questions = accumulatedQuestions;
              job.questionsCount = accumulatedQuestions.length;
              job.figuresCount = accumulatedFiguresCount;
              job.progress = Math.round(((pIdx + 1) / pageImages.length) * 95);
              job.statusMessage = `Page ${pNum} of ${pageImages.length} parsed (${accumulatedQuestions.length} Qs, ${accumulatedFiguresCount} diagrams)...`;
              saveJobsToDisk();

              // Pacing cooldown between pages
              if (pIdx < pageImages.length - 1) {
                await new Promise(r => setTimeout(r, 1200));
              }
            } catch (pageErr: any) {
              console.warn(`[Background Parse Job] Error on page ${pNum}:`, pageErr?.message || pageErr);
            }
          }
        } else {
          // Direct PDF buffer processing
          const { rawText, modelUsed } = await callGeminiWithFallback(ai, {
            contents: [
              { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
              { text: `Parse all questions from this NEET exam PDF. ONLY parse genuine exam questions with problem statements and 4 real options. Strictly preserve question numbering, bilingual Hindi & English text, all 4 options, and figure bounding boxes.` }
            ],
            systemInstruction: `You are an expert NTA NEET Question Paper Digitization Assistant. Accurately digitize all exam questions from this PDF. Transcribe full problem statements, all 4 options, and precise figureBoundingBox [ymin, xmin, ymax, xmax]. Never omit question statements or option texts.`
          });

          const parsedData = safeParseGeminiJson(rawText);
          const normalized = await normalizeExtractedQuestions(parsedData.questions || []);
          accumulatedQuestions.push(...normalized);
        }

        if (job.status !== 'cancelled') {
          const detectedList = accumulatedQuestions.map(q => ({
            pageNumber: q.pdfPageNumber || 1,
            questionNumber: q.questionNumber
          }));
          const jobValidationLog = generateValidationLog(
            detectedList,
            accumulatedQuestions,
            job.totalPages,
            accumulatedQuestions.length >= 180 ? 180 : accumulatedQuestions.length
          );

          job.questions = accumulatedQuestions;
          job.questionsCount = accumulatedQuestions.length;
          job.figuresCount = accumulatedQuestions.filter(q => q.figureUrl).length;
          job.validationLog = jobValidationLog;
          job.status = 'completed';
          job.progress = 100;
          job.statusMessage = `✓ Finished! Successfully digitized ${accumulatedQuestions.length} questions with ${job.figuresCount} diagrams!`;
          job.updatedAt = new Date().toISOString();
          saveJobsToDisk();
          console.log(`[Background Parse Job] Job ${jobId} finished with ${accumulatedQuestions.length} questions. Validation status: ${jobValidationLog.status}`);
        }
      } catch (jobErr: any) {
        console.error(`[Background Parse Job] Job ${jobId} failed:`, jobErr);
        job.status = 'failed';
        job.error = jobErr?.message || 'Background parsing failed';
        job.statusMessage = `Error in background parsing: ${job.error}`;
        job.updatedAt = new Date().toISOString();
        saveJobsToDisk();
      }
    })();

    return res.json({
      success: true,
      jobId,
      status: job.status,
      message: 'Background parsing started on server. You can safely switch sections or close the site.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Check Background Job Status
app.get("/api/ai/parse-job/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeParseJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  return res.json({
    success: true,
    job
  });
});

// Get Active / Recent Jobs
app.get("/api/ai/parse-job/active", (_req, res) => {
  const jobsList = Array.from(activeParseJobs.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return res.json({
    success: true,
    activeJobs: jobsList.slice(0, 5)
  });
});

// Save completed parse job directly to a test on server
app.post("/api/ai/parse-job/save-to-test/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = activeParseJobs.get(jobId);
    if (!job || !job.questions || job.questions.length === 0) {
      return res.status(404).json({ success: false, error: "Job or questions not found" });
    }

    const db = loadDatabase();
    if (!db.mock_tests) db.mock_tests = [];
    if (!db.mock_questions) db.mock_questions = {};

    const targetTestId = req.body?.targetTestId || job.targetTestId;
    let targetTest: any = null;

    if (targetTestId) {
      targetTest = db.mock_tests.find((t: any) => t.id === targetTestId);
    }

    const testId = targetTest ? targetTest.id : `cbt-neet-${Date.now()}`;
    const totalQCount = job.questions.length;
    const isFree = req.body?.isFree !== undefined ? Boolean(req.body.isFree) : job.isFree;
    const price = isFree ? 0 : (Number(req.body?.price ?? job.testPrice) || 99);

    if (targetTest) {
      targetTest.totalQuestions = totalQCount;
      targetTest.maxMarks = totalQCount * 4;
      targetTest.isFree = isFree;
      targetTest.isPaid = !isFree;
      targetTest.price = price;
      if (req.body?.testTitle) targetTest.title = req.body.testTitle;
      targetTest.updatedAt = new Date().toISOString();
    } else {
      targetTest = {
        id: testId,
        testNumber: req.body?.testNumber || job.testNumber || `Test 0${db.mock_tests.length + 1}`,
        title: req.body?.testTitle || job.testTitle || `NEET Mock Test (${totalQCount} Qs)`,
        description: `Official NEET Practice Mock Test with ${totalQCount} questions and PDF diagrams.`,
        type: req.body?.testCategory || job.testCategory || 'full_syllabus',
        subjects: ['Physics', 'Chemistry', 'Biology'],
        totalQuestions: totalQCount,
        durationMinutes: job.testDuration || (totalQCount >= 180 ? 200 : 180),
        maxMarks: totalQCount * 4,
        correctMarks: 4,
        negativeMarks: 1,
        isFree,
        isPaid: !isFree,
        price,
        originalPrice: isFree ? 0 : 299,
        status: 'published',
        languages: ['en', 'hi'],
        allowMultipleAttempts: true,
        attemptLimit: 'unlimited',
        showLeaderboard: true,
        createdAt: new Date().toISOString()
      };
      db.mock_tests.unshift(targetTest);
    }

    // Attach questions with testId
    const formattedQs = job.questions.map((q: any, idx: number) => ({
      ...q,
      testId,
      id: q.id ? `${q.id}_${idx + 1}` : `q_${testId}_${idx + 1}`,
      questionNumber: q.questionNumber || (idx + 1)
    }));

    db.mock_questions[testId] = formattedQs;
    saveDatabase(db);
    saveJobsToDisk();

    return res.json({
      success: true,
      test: targetTest,
      questionsCount: formattedQs.length,
      message: `Successfully saved ${formattedQs.length} questions to "${targetTest.title}"`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel Background Job
app.post("/api/ai/parse-job/cancel/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeParseJobs.get(jobId);
  if (job) {
    job.status = 'cancelled';
    job.statusMessage = 'Job cancelled by admin';
    job.updatedAt = new Date().toISOString();
    saveJobsToDisk();
  }
  return res.json({ success: true, message: "Job cancelled" });
});

// Parse Complete NEET PDF File Directly
app.post("/api/ai/parse-neet-pdf", upload.single("pdf"), async (req, res) => {
  try {
    let pdfBase64 = "";
    if (req.file && req.file.buffer) {
      pdfBase64 = req.file.buffer.toString("base64");
    } else if (req.body?.pdfBase64) {
      pdfBase64 = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
    }

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: "PDF file or pdfBase64 required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets."
      });
    }

    const ai = getGeminiClient();

    const { rawText, modelUsed } = await callGeminiWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        {
          text: `Parse all questions from this NEET exam PDF. ONLY parse genuine exam questions with problem statements and 4 real options. STRICTLY IGNORE answer key grids, hints, solutions, and explanations—never create questions from solutions or return 'N/A' options. Maintain verbatim accuracy, question numbering, bilingual Hindi & English text, all 4 options, and figure bounding boxes [ymin, xmin, ymax, xmax] (normalized 0-1000).`,
        },
      ],
      systemInstruction: `You are an expert NTA NEET Question Paper Digitization Assistant. Accurately digitize all exam questions from this PDF. ONLY extract genuine exam questions. DO NOT create questions out of Answer Key matrices, Hints, or Solutions pages. If a page or block contains solutions or answer keys, IGNORE it. Every question must have real question text and 4 distinct options. Preserve verbatim math, formulas, bilingual text, and detect figures with normalized bounding boxes [ymin, xmin, ymax, xmax].`,
    });

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      try {
        const cleaned = rawText.replace(/```(?:json)?/gi, "").trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          parsedData = JSON.parse(rawText.slice(start, end + 1));
        } else {
          parsedData = { questions: [] };
        }
      }
    }

    const normalized = normalizeExtractedQuestions(parsedData.questions || []);

    return res.json({
      success: true,
      modelUsed,
      questions: normalized
    });
  } catch (err: any) {
    console.error("Gemini NEET PDF parse error:", err);
    const isRateLimited = Boolean(
      err?.isRateLimited ||
      err?.message?.includes("429") ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("Quota exceeded") ||
      err?.message?.includes("quota")
    );
    const retryAfterSeconds = err?.retryAfterSeconds || 35;
    return res.status(isRateLimited ? 429 : 500).json({
      success: false,
      isRateLimited,
      retryAfterSeconds,
      error: isRateLimited
        ? `Gemini API rate limit reached (Free tier). Please pause for ${retryAfterSeconds}s before retrying.`
        : (err.message || "Failed to parse PDF with Gemini API")
    });
  }
});

// Run Gold-Standard Regression Benchmark Suite (validating against TEST 8 and SOLUTIONS 8)
app.get("/api/ai/benchmark-test-8", async (req, res) => {
  try {
    const db = loadDatabase();
    const testId = (req.query.testId as string) || "cbt-gold-test-08";
    const questionsToTest = (db.mock_questions && db.mock_questions[testId] && db.mock_questions[testId].length > 0)
      ? db.mock_questions[testId]
      : GOLD_STANDARD_TEST_8_QUESTIONS;

    const report = runGoldStandardRegressionSuite(questionsToTest);
    return res.json({
      success: true,
      report,
      testId,
      goldStandardInfo: GOLD_STANDARD_TEST_8_INFO
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Seed Gold-Standard Test 08 directly into Database
app.post("/api/ai/seed-gold-standard-test-8", async (_req, res) => {
  try {
    const db = loadDatabase();
    if (!db.mock_tests) db.mock_tests = [];
    if (!db.mock_questions) db.mock_questions = {};

    db.mock_tests = db.mock_tests.filter((t: any) => t.id !== "cbt-gold-test-08" && t.id !== "neet-gold-standard-test-08");
    const testRecord = {
      ...GOLD_STANDARD_TEST_8_INFO,
      id: "cbt-gold-test-08",
      isPurchased: true,
      status: "published"
    };
    db.mock_tests.unshift(testRecord);

    const formattedQuestions = GOLD_STANDARD_TEST_8_QUESTIONS.map(q => ({
      ...q,
      testId: "cbt-gold-test-08"
    }));
    db.mock_questions["cbt-gold-test-08"] = formattedQuestions;

    saveDatabase(db);
    return res.json({
      success: true,
      message: "Successfully loaded Gold-Standard NEET Test 08 (180 questions with official keys & step-by-step solutions)!",
      test: testRecord,
      questionsCount: formattedQuestions.length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Robust Server Solutions PDF Parser
app.post("/api/ai/parse-solutions-pdf", upload.single("pdf"), async (req, res) => {
  try {
    let pdfBuffer: Buffer | null = null;
    if (req.file && req.file.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (req.body?.pdfBase64) {
      const cleanB64 = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
      pdfBuffer = Buffer.from(cleanB64, "base64");
    } else {
      // Default fallback: load SOLUTIONS 8 if available on disk
      const defaultSolPath = path.join(process.cwd(), "public/assets/aistudio/SOLUTIONS_8_7a2997fc.pdf");
      if (fs.existsSync(defaultSolPath)) {
        pdfBuffer = fs.readFileSync(defaultSolPath);
      }
    }

    if (!pdfBuffer) {
      return res.status(400).json({ success: false, error: "Solutions PDF buffer required" });
    }

    const pdfjsLib: any = await import("./node_modules/pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;

    let fullDocText = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      fullDocText += "\n" + tc.items.map((i: any) => i.str).join(" ");
    }

    // High-Precision Chunk Split Pass
    const splits = fullDocText.split(/(?=(?:^|\s)\b\d{1,3}\s*\.\s*(?:Answer|Ans|उत्तर)\s*:)/i);
    const answers: Record<number, "A" | "B" | "C" | "D"> = {};
    const solutions: Record<number, string> = {};
    const numToLetter: Record<string, "A" | "B" | "C" | "D"> = { "1": "A", "2": "B", "3": "C", "4": "D", "A": "A", "B": "B", "C": "C", "D": "D" };

    for (const chunk of splits) {
      const hm = chunk.match(/^\s*(\d{1,3})\s*\.\s*(?:Answer|Ans|उत्तर)\s*:\s*\(?([1-4A-Da-d])\)?(?:\s*(?:Sol|Hints?|Explanation|हल|व्याख्या)\s*:)?([\s\S]*)$/i);
      if (hm) {
        const qNum = parseInt(hm[1], 10);
        const rawVal = hm[2].trim().toUpperCase();
        const letter = numToLetter[rawVal] || "A";
        answers[qNum] = letter;
        const solText = (hm[3] || "").trim().replace(/--- PAGE \d+ ---/g, "").trim();
        if (solText.length > 2) {
          solutions[qNum] = solText;
        }
      }
    }

    const testId = req.body?.testId as string;
    let appliedCount = 0;
    if (testId) {
      const db = loadDatabase();
      if (db.mock_questions && db.mock_questions[testId]) {
        db.mock_questions[testId].forEach((q: any) => {
          const qn = q.questionNumber;
          if (qn && answers[qn]) {
            q.correctAnswer = answers[qn];
            if (solutions[qn]) {
              q.explanation = solutions[qn];
            }
            appliedCount++;
          }
        });
        saveDatabase(db);
      }
    }

    return res.json({
      success: true,
      totalAnswersFound: Object.keys(answers).length,
      totalSolutionsFound: Object.keys(solutions).length,
      appliedCount,
      answers,
      solutions
    });
  } catch (err: any) {
    console.error("parse-solutions-pdf error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Parse NEET Exam Answer Key (Text, Image or PDF)
app.post("/api/ai/parse-answer-key", async (req, res) => {
  try {
    const { rawText, imageBase64, pdfBase64, totalQuestions = 180, preferredModel } = req.body;
    
    if (!rawText && !imageBase64 && !pdfBase64) {
      return res.status(400).json({ success: false, error: "Either rawText, imageBase64, or pdfBase64 must be provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing."
      });
    }

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, "").trim();
      let mimeType = "image/png";
      if (imageBase64.startsWith("data:image/jpeg")) mimeType = "image/jpeg";
      parts.push({
        inlineData: { mimeType, data: cleanBase64 }
      });
    } else if (pdfBase64) {
      const cleanPdf = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
      parts.push({
        inlineData: { mimeType: "application/pdf", data: cleanPdf }
      });
    }

    const promptText = `You are an expert NEET Answer Key digitizer.
Extract all Question Number -> Correct Answer Option pairs from this answer key.
Format rules:
- Questions are numbered (e.g. 1 to 180, or 1 to 200).
- Answer options are A, B, C, D (or 1, 2, 3, 4 which map to A, B, C, D: 1->A, 2->B, 3->C, 4->D).
- Common patterns in NEET exams: "1. Answer: 3", "1 - B", "1. (4)", "1 B", "Q1: C", tabular columns.
- For each detected answer, return:
  "questionNumber": integer,
  "answer": "A" | "B" | "C" | "D",
  "confidence": float 0.0 to 1.0 (set < 0.8 if ambiguous),
  "rawText": the exact snippet matched.
Return JSON strictly in this structure:
{
  "answers": [
    { "questionNumber": 1, "answer": "C", "confidence": 1.0, "rawText": "1. Answer: 3" }
  ]
}
${rawText ? `Pasted Answer Key Text:\n${rawText}` : ""}`;

    parts.push({ text: promptText });

    const systemInstruction = `You are a precision Answer Key Digitizer. Extract all question numbers and correct options (A, B, C, D) with 100% accuracy. Never guess or hallucinate. Return strictly valid JSON.`;

    const { rawText: resultText, modelUsed } = await callGeminiWithFallback(ai, {
      contents: parts,
      systemInstruction,
      preferredModel,
      responseSchema: ANSWER_KEY_SCHEMA
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      const cleaned = resultText.replace(/```(?:json)?/gi, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      modelUsed,
      answers: parsed.answers || []
    });
  } catch (err: any) {
    console.error("Answer key parse error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to parse answer key"
    });
  }
});

// Parse Detailed Solutions & Answer Key PDF/Text (Full Step-by-Step Explanations)
app.post("/api/ai/parse-solutions-and-key", async (req, res) => {
  try {
    const { rawText, imageBase64, pdfBase64, preferredModel } = req.body;

    if (!rawText && !imageBase64 && !pdfBase64) {
      return res.status(400).json({ success: false, error: "Either rawText, imageBase64, or pdfBase64 must be provided" });
    }

    const apiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing."
      });
    }

    const ai = getGeminiClient(apiKey);

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, "").trim();
      let mimeType = "image/png";
      if (imageBase64.startsWith("data:image/jpeg")) mimeType = "image/jpeg";
      parts.push({
        inlineData: { mimeType, data: cleanBase64 }
      });
    } else if (pdfBase64) {
      const cleanPdf = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
      parts.push({
        inlineData: { mimeType: "application/pdf", data: cleanPdf }
      });
    }

    const promptText = `You are an expert NTA NEET Solutions and Answer Key Digitizer.
Your job is to extract:
1. The exact Correct Answer Option (A, B, C, or D) for every question number.
   * If given as numbers (1, 2, 3, 4), map strictly to (A, B, C, D): 1->A, 2->B, 3->C, 4->D.
2. The detailed step-by-step mathematical / conceptual Solution & Explanation for each question.
   * Preserve formulas, calculations, chemical reaction steps, and laws verbatim.
   * Do not omit steps. Clean up any weird font artifacts into standard math symbols (e.g. sqrt √, minus −, times ×, mu μ, ohm Ω, degree °).

Return JSON strictly matching this schema:
{
  "answers": [
    { "questionNumber": 1, "answer": "B", "rawText": "1. Answer (2)" }
  ],
  "solutions": [
    {
      "questionNumber": 1,
      "answer": "B",
      "explanation": "Sol. Given F = qE ... Therefore, the ratio of velocities is ...",
      "formulaSummary": "F = qE"
    }
  ]
}
${rawText ? `Document Text:\n${rawText}` : ""}`;

    parts.push({ text: promptText });

    const systemInstruction = `You are a precision NEET exam solutions extractor. Extract exact question numbers, correct answers (A, B, C, D), and complete step-by-step solutions/explanations. Never skip questions. Return valid JSON only.`;

    const { rawText: resultText, modelUsed } = await callGeminiWithFallback(ai, {
      contents: parts,
      systemInstruction,
      preferredModel,
      responseSchema: SOLUTIONS_AND_KEY_SCHEMA
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(resultText);
    } catch {
      const cleaned = resultText.replace(/```(?:json)?/gi, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      modelUsed,
      answers: parsed.answers || [],
      solutions: parsed.solutions || []
    });
  } catch (err: any) {
    const isHighDemand = Boolean(
      err?.isHighDemand ||
      err?.message?.includes("503") ||
      err?.message?.includes("high demand") ||
      err?.message?.includes("spikes in demand") ||
      err?.message?.includes("UNAVAILABLE")
    );
    const isRateLimited = Boolean(
      err?.isRateLimited ||
      err?.message?.includes("429") ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("Quota exceeded") ||
      err?.message?.includes("quota")
    );

    console.warn("Solutions & key parse note:", err?.message || err);
    return res.json({
      success: false,
      isRateLimited: isRateLimited || isHighDemand,
      isHighDemand,
      answers: [],
      solutions: [],
      error: isHighDemand
        ? "Gemini models are experiencing temporary high demand. Falling back to local pattern extraction."
        : (err.message || "Failed to parse solutions and answer key")
    });
  }
});

// =============================================================
// NCERTify AI Parser 2.0 - Independent Engine Mount
// =============================================================
app.use("/api/parser2", parser2Router);
app.use("/storage/parser2", express.static(path.resolve(process.cwd(), "public", "storage", "parser2")));
app.get("/storage/parser2/jobs/:jobId/:category/:fileName", async (req, res) => {
  try {
    const { jobId, category, fileName } = req.params;
    const buffer = await getParser2AssetBuffer(jobId, category, fileName);
    if (!buffer || buffer.length === 0) {
      return res.status(404).json({ success: false, error: "Asset not found" });
    }
    const lower = fileName.toLowerCase();
    const contentType = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".pdf")
      ? "application/pdf"
      : lower.endsWith(".svg")
      ? "image/svg+xml"
      : "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to load asset" });
  }
});

// Global Multer and Request Payload Error Handler
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error(`[Multer Error] ${err.code}: ${err.message}`);
    if (err.code === "LIMIT_FIELD_VALUE") {
      return res.status(400).json({
        success: false,
        error: "Form field value is too large. Field size limit has been raised to 150MB."
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "Uploaded file exceeds the 150MB limit."
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message} (${err.code})`
    });
  }

  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    console.error("[Payload Error] Request entity too large");
    return res.status(413).json({
      success: false,
      error: "Payload too large. Please upload files under 150MB."
    });
  }

  next(err);
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEET MBBS Doctors Store running on http://0.0.0.0:${PORT}`);
    // Hydrate durable Parser 2.0 state from R2/D1/RTDB first, then resume interrupted background jobs
    (async () => {
      try {
        await ensureParser2D1Tables();
        await hydrateParser2FromRemoteStores(true);
      } catch (hydErr) {
        console.warn("[Parser2] Startup remote hydration warning:", hydErr);
      }
      try {
        await jobQueueService.initJobRecovery();
      } catch (err) {
        console.warn("[JobQueue] Startup job recovery error:", err);
      }
    })();
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error("Server error:", err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);
}

startServer();
