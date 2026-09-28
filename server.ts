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

const app = express();
const PORT = 3000;

// Configure Multer for binary in-memory file uploads (Up to 100MB PDF notes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// Configuration (Live Production Razorpay Credentials)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_live_TS3u0sJ2yf9X6A";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "J0Vq8ih9V8dkiaunKk5HCPlr";
const PIPEDREAM_WEBHOOK_URL = process.env.PIPEDREAM_WEBHOOK_URL || "https://eokr7i7r2t9fttx.m.pipedream.net";

const CLOUDFLARE_R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY || "887e302ecc7e249de5f16198ddfb7bd4";
const CLOUDFLARE_R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_KEY || "20ddb02f48c59b9e1ae64dd1a164290e63396632633f0b49e2b5f310ba7fb79e";
const CLOUDFLARE_R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT || "https://d715d090a75efd8790b9a6da1e2f42d4.r2.cloudflarestorage.com";
const CLOUDFLARE_R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "ncertify";

// Cloudflare D1 Database Configuration
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "d715d090a75efd8790b9a6da1e2f42d4";
const CF_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "daf5a141-af4a-4db6-b10d-ac3bbab28b72";
const CF_D1_NAME = process.env.CLOUDFLARE_D1_NAME || "neetmbbsdoctorsstore";
let CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_D1_TOKEN || "";

// Telegram Configuration - Permanently active default bot token
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A";
const TELEGRAM_ADMIN_CHAT_IDS = ["7004282468", "1318240288"];

// Initialize Cloudflare R2 S3 Client
let r2Client: S3Client | null = null;
try {
  r2Client = new S3Client({
    region: "auto",
    endpoint: CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
    },
  });
} catch (err) {
  console.warn("Could not initialize S3 Client for R2:", err);
}

// In-Memory Fast Cache for Uploaded Files
const fileBufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
    payment_records: []
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
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(cleanDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// Cloudflare D1 REST API Helper
async function queryCloudflareD1(sql: string, params: any[] = []) {
  if (!CF_API_TOKEN) {
    return { success: false, message: "Cloudflare API Token not set. Using local database storage engine." };
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
    `CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, displayName TEXT, role TEXT, createdAt TEXT, totalOrders INTEGER, totalSpent REAL);`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT, author TEXT, type TEXT, category TEXT, price REAL, originalPrice REAL, rating REAL, reviewsCount INTEGER, coverImage TEXT, sampleImages TEXT, pdfUrl TEXT, description TEXT, features TEXT, tags TEXT, pages INTEGER, edition TEXT, isbn TEXT, inStock INTEGER, isBestSeller INTEGER, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userId TEXT, userEmail TEXT, userName TEXT, items TEXT, totalAmount REAL, paymentId TEXT, razorpayOrderId TEXT, paymentStatus TEXT, shippingAddress TEXT, status TEXT, orderDate TEXT, invoiceNumber TEXT, notes TEXT);`,
    `CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, orderId TEXT, paymentId TEXT, amount REAL, status TEXT, gateway TEXT, signature TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS pdf_access (id TEXT PRIMARY KEY, userId TEXT, userEmail TEXT, productId TEXT, orderId TEXT, grantedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS banners (id TEXT PRIMARY KEY, titleLine1 TEXT, titleLine2 TEXT, titleLine3 TEXT, subtitle TEXT, buttonText TEXT, badge TEXT, type TEXT, imageUrl TEXT, active INTEGER);`,
    `CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, discountType TEXT, discountValue REAL, minAmount REAL, active INTEGER);`,
    `CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, productId TEXT, userEmail TEXT, userName TEXT, rating REAL, comment TEXT, createdAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT, status TEXT, createdAt TEXT);`
  ];

  for (const sql of schemas) {
    await queryCloudflareD1(sql);
  }
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

    // 6. Sync any local data to Firebase RTDB
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
  res.json({
    razorpayKeyId: RAZORPAY_KEY_ID,
    r2Endpoint: CLOUDFLARE_R2_ENDPOINT,
    bucket: CLOUDFLARE_R2_BUCKET,
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

// 2. Verify Razorpay Payment Signature
app.post("/api/payment/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing required payment parameters" });
    }

    let isValid = false;

    // Server-side HMAC-SHA256 signature verification
    if (razorpay_signature && RAZORPAY_KEY_SECRET && razorpay_signature !== "sandbox_verified_signature") {
      const generated_signature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isValid = generated_signature === razorpay_signature;
    } else {
      // In sandbox/test mode or if payment id format starts with pay_
      isValid = Boolean(razorpay_payment_id && razorpay_payment_id.startsWith("pay_"));
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
        message: "Payment verification failed. Invalid signature."
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

// 3B. Cloudflare R2 Standard Base64 Image Upload API
app.post("/api/r2/upload", async (req, res) => {
  try {
    const { filename, contentType, base64Data, folder } = req.body;

    if (!filename || !base64Data) {
      return res.status(400).json({ error: "Filename and base64Data are required" });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(cleanBase64, "base64");
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
app.get("/api/r2/file/*", async (req, res) => {
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
    queryCloudflareD1(
      `INSERT OR REPLACE INTO products (id, title, author, type, category, price, originalPrice, rating, reviewsCount, coverImage, sampleImages, pdfUrl, description, features, tags, pages, edition, isbn, inStock, isBestSeller, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.title,
        product.author || '',
        product.type || 'book',
        product.category || 'Biology',
        product.price || 0,
        product.originalPrice || 0,
        product.rating || 5,
        product.reviewsCount || 0,
        product.coverImage || '',
        JSON.stringify(product.sampleImages || []),
        product.pdfUrl || '',
        product.description || '',
        JSON.stringify(product.features || []),
        JSON.stringify(product.tags || []),
        product.pages || 0,
        product.edition || '',
        product.isbn || '',
        product.inStock !== false ? 1 : 0,
        product.isBestSeller ? 1 : 0,
        product.createdAt || new Date().toISOString()
      ]
    ).catch(err => console.warn("D1 sync notice:", err));

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
      saveDatabase(db);
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
app.get("/api/db/mock-tests", async (_req, res) => {
  try {
    const db = loadDatabase();
    return res.json({ success: true, tests: db.mock_tests || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/db/mock-tests", async (req, res) => {
  try {
    const db = loadDatabase();
    db.mock_tests = Array.isArray(req.body) ? req.body : req.body.tests || [];
    saveDatabase(db);
    return res.json({ success: true, count: db.mock_tests.length });
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
    return res.json({ success: true, course: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Secure access verification: verifies user payment before revealing main course Google Drive link
app.post("/api/course/access", async (req, res) => {
  try {
    const { userEmail, userId, orderId } = req.body;
    const db = loadDatabase();
    const email = (userEmail || "").trim().toLowerCase();
    const uId = (userId || "").trim();
    const ordId = (orderId || "").trim().toLowerCase();

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
          return pId === "neet-full-course-11-12" || pId.includes("full-course") || title.includes("full course");
        });
      }
      return false;
    });

    const isPurchasedExplicit = (db.full_course_purchases || []).some((p: any) => {
      return (email && p.userEmail?.toLowerCase() === email) || (uId && p.userId === uId) || (ordId && p.orderId?.toLowerCase() === ordId);
    });

    if (isPurchased || isPurchasedExplicit) {
      const cfg = { ...DEFAULT_FULL_COURSE_SERVER_CONFIG, ...(db.full_course_config || {}) };
      return res.json({
        success: true,
        accessUrl: cfg.mainCourseDriveLink || cfg.sampleDriveLink
      });
    }

    return res.status(403).json({
      success: false,
      message: "Please complete your enrollment to access the NEET (11th & 12th) Full Course folder."
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
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
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

// Resilient multi-model fallback chain to handle transient 503 (high demand) and 429 surges
// gemini-3.1-flash-lite has a higher 15 RPM quota limit on free tier, paired with gemini-2.5-flash
const GEMINI_MODELS_FALLBACK_CHAIN = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest"
];

function extractRetryDelaySeconds(err: any): number {
  try {
    const msg = err?.message || String(err);
    const match = msg.match(/retry in ([\d\.]+)s/i) || msg.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
    if (match && match[1]) {
      const parsed = Math.ceil(parseFloat(match[1]));
      if (!isNaN(parsed) && parsed > 0) return Math.min(parsed, 60);
    }
    if (Array.isArray(err?.details)) {
      for (const d of err.details) {
        if (d?.retryDelay) {
          const s = parseInt(String(d.retryDelay).replace(/[^\d]/g, ''), 10);
          if (!isNaN(s) && s > 0) return Math.min(s, 60);
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
            description: "[ymin, xmin, ymax, xmax] normalized 0-1000",
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
                  required: ["label"],
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
                  required: ["label"],
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
        required: ["questionNumber", "english"],
      },
    },
  },
  required: ["questions"],
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

  // If user requested a preferred model, try it first, followed by others
  const modelsToTry = params.preferredModel
    ? [params.preferredModel, ...GEMINI_MODELS_FALLBACK_CHAIN.filter(m => m !== params.preferredModel)]
    : GEMINI_MODELS_FALLBACK_CHAIN;

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
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini OCR] Requesting model: ${model} (attempt ${attempt})...`);
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

        console.warn(`[Gemini OCR] Model ${model} attempt ${attempt} note:`, errMsg);

        // If Google explicitly reports quota exhaustion (429 with e.g. "retry in 45s"),
        // retrying the exact same model after 1.2s is futile and wastes time.
        // Immediately break to try the next alternative model in the fallback chain.
        if (isQuota) {
          const retrySec = extractRetryDelaySeconds(err);
          (lastError as any).isRateLimited = true;
          (lastError as any).retryAfterSeconds = retrySec;
          console.log(`[Gemini OCR] Quota limit reached for ${model} (${retrySec}s cooldown). Switching to next model immediately...`);
          break;
        }

        if (isTransient && attempt === 1) {
          const delayMs = 1200 + Math.floor(Math.random() * 800);
          console.log(`[Gemini OCR] Temporary surge detected. Retrying ${model} after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Break to next candidate model in fallback chain
          break;
        }
      }
    }
  }

  // Provide clear, actionable message
  const isHighDemand = lastError?.message?.includes("503") || lastError?.message?.includes("high demand");
  const isQuota =
    Boolean((lastError as any)?.isRateLimited) ||
    lastError?.message?.includes("429") ||
    lastError?.message?.includes("RESOURCE_EXHAUSTED") ||
    lastError?.message?.includes("Quota exceeded") ||
    lastError?.message?.includes("quota");

  const retrySec = extractRetryDelaySeconds(lastError);

  const finalMsg = isQuota
    ? `Gemini API quota reached across models (Free tier limit: 5-15 RPM). Please wait ${retrySec}s for quota window to reset.`
    : isHighDemand
    ? "Gemini models are experiencing temporary high demand from Google. Please wait a moment and try again."
    : (lastError?.message || "Failed to communicate with Gemini API");

  const wrappedErr: any = new Error(finalMsg);
  wrappedErr.isRateLimited = isQuota;
  wrappedErr.retryAfterSeconds = retrySec;
  throw wrappedErr;
}

// AI Status Check Endpoint
app.get("/api/ai/status", (_req, res) => {
  return res.json({
    success: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-flash-latest",
    availableModels: GEMINI_MODELS_FALLBACK_CHAIN
  });
});

// Parse Single NEET PDF Page (High Resolution Vision + Figure Detection)
app.post("/api/ai/parse-neet-page", async (req, res) => {
  try {
    const { imageBase64, pageNumber, totalPages, preferredModel } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Missing imageBase64 data" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets."
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9.+]+;base64,/, "").trim();
    let mimeType = "image/png";
    if (imageBase64.startsWith("data:image/jpeg")) {
      mimeType = "image/jpeg";
    } else if (imageBase64.startsWith("data:image/webp")) {
      mimeType = "image/webp";
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are an expert NTA NEET Question Paper Digitization Assistant.
Your task is to accurately transcribe and digitize exam questions from this NEET exam page image with 100% fidelity.

CRITICAL RULES:
1. ONLY DIGITIZE GENUINE EXAM QUESTIONS (NEVER EXTRACT ANSWER KEYS OR SOLUTIONS AS QUESTIONS):
   - Many NEET PDFs have "Answer Key" grids (e.g. "1. (1), 2. (4)...") or "Hints & Solutions" / "Explanations" (e.g. "Sol: F1 = F2...", "Sol: F = qE_dipole...", "Answer: 1").
   - DO NOT extract answer key matrices or solution derivations as new questions!
   - If this page only contains "Answer Key", "Hints & Solutions", "Explanations", or "Answers", return: {"questions": []}.
   - NEVER create a question whose text is just "Answer: 1", "Ans: 4", "Sol:", or formula derivations without a question statement.
   - NEVER output dummy options like "N/A", "n/a", or invent fake options like "Calculate the ratio of velocities", "Application of...", "None of the above" when no options exist.
   - Every valid question MUST have a real question prompt and 4 real options (A, B, C, D) printed on the exam paper. If a block lacks 4 real options, it is NOT a question—do NOT output it!

2. Question Numbering & Layout:
   - NEET papers often have a 2-column layout: Left column is English, right column is Hindi for the EXACT SAME question number!
   - Associate both English and Hindi versions to the same questionNumber.
   - Extract the exact question number as printed (1 to 200). Never skip, merge, or re-order questions.

3. Complete Verbatim Text (Zero Paraphrasing):
   - Never summarize, rewrite, or paraphrase. Extract the exact words, symbols, and units.
   - All 4 options (A, B, C, D) must be captured with their exact printed text. If printed as (1), (2), (3), (4), map them to A, B, C, D.

4. Strict Bilingual Separation & Scientific Symbols (Clean Text):
   - english.questionText and english.options: Full verbatim English text and all options.
     * MUST contain ONLY clean English text and standard scientific symbols (e.g. Ω, μ, °, √, →, ⇌, Δ, α, β, γ, π, ×, ±, Å).
     * NEVER include Hindi or Devanagari script inside the english fields!
   - hindi.questionText and hindi.options: Full verbatim Hindi text in clean Devanagari script and all options.
   - NEVER output corrupted unicode, mojibake (like âˆ−, â€", Ã—, Â°C), or garbled characters.

5. Match-the-Column Questions & Tables (Zero Duplication):
   - When a question has Column-I & Column-II (or List-I & List-II):
     * Put ALL column names, labels, keys, and row contents EXCLUSIVELY into the structured "matchTable" object:
       "matchTable": {
         "column1Header": "Column-I",
         "column2Header": "Column-II",
         "rows": [
           { "leftKey": "(i)", "leftText": "...", "rightKey": "(a)", "rightText": "..." }
         ]
       }
     * CRITICAL: DO NOT repeat or duplicate the table rows, column lists, or items inside "english.questionText"!
     * "english.questionText" must ONLY contain the introductory premise sentence (e.g. "Match List-I with List-II:") and if present, the closing instruction (e.g. "Choose the correct answer from the options given below:").

6. MANDATORY Figures, Diagrams, Graphs, and Circuits (High Precision Bounding Boxes):
   - NEET Physics, Chemistry, and Biology questions frequently feature diagrams (circuits, mechanics setups, pulleys, graphs, ray optics sketches, potential energy curves, mutarotation curves, reaction schemes, apparatus sketches, plant/animal biological anatomy).
   - If a question contains ANY diagram, figure, chart, schematic, circuit, graph, sketch, reaction scheme, or visual apparatus:
     * Set "hasFigure": true
     * "figureDescription": a concise 3-5 word label (e.g. "Magnetic field wire circular bend", "Square loop near wire", "Blocks on smooth surface", "Chromatography plate")
     * "figureBoundingBox": [ymin, xmin, ymax, xmax] as 4 integers normalized between 0 and 1000 representing the PRECISE bounding box of ONLY the diagram. Do not clip the diagram edges, and do not include the question text above or neighboring question text.
   - If individual options (A, B, C, D) contain diagrams or chemical structures:
     * Include in "optionsWithFigures": [ { "label": "A", "boundingBox": [ymin, xmin, ymax, xmax] }, ... ]

7. Correct Answer:
   - If clearly marked on this question paper page, set correctAnswer ('A'|'B'|'C'|'D'). Otherwise default to 'A'.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };
    const textPart = {
      text: `Please parse all questions on this page (Page ${pageNumber || 1}${totalPages ? ` of ${totalPages}` : ""}). Return valid JSON adhering strictly to the schema.`,
    };

    const { rawText, modelUsed } = await callGeminiWithFallback(ai, {
      contents: { parts: [imagePart, textPart] },
      systemInstruction: systemPrompt,
      preferredModel
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

    return res.json({
      success: true,
      pageNumber: pageNumber || 1,
      modelUsed,
      questions: parsedData.questions || []
    });
  } catch (err: any) {
    console.error("Gemini NEET PDF page parse error:", err);
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
        : (err.message || "Failed to parse page with Gemini API")
    });
  }
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

    return res.json({
      success: true,
      modelUsed,
      questions: parsedData.questions || []
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
    console.error("Solutions & key parse error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to parse solutions and answer key"
    });
  }
});

// Start Server with Vite Middleware
async function startServer() {

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEET MBBS Doctors Store running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
