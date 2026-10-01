/**
 * NEET MBBS Doctors Store - Runtime Configuration Helper for Cloudflare Pages / Static Hosting
 * 
 * If you deploy this site as a static site (Cloudflare Pages, Netlify, Vercel, GitHub Pages)
 * and cannot pass environment variables through a backend server, you can set them here!
 * This file is loaded by index.html before the app mounts.
 */
window.__NEETMBBS_RUNTIME_CONFIG__ = window.__NEETMBBS_RUNTIME_CONFIG__ || {
  // Cloudflare R2 Public Domain for storage (PDFs, Diagrams, Covers)
  R2_PUBLIC_DOMAIN: "https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev",

  // Custom API Base URL (if backend is hosted on Render, Railway, Cloudflare Worker, or Fly.io)
  API_BASE_URL: "",

  // Google Search Console Site Verification ID (optional)
  GOOGLE_SITE_VERIFICATION: "",

  // Firebase Realtime Database and Auth config (already has built-in defaults)
  FIREBASE_DATABASE_URL: "https://neet-mbbs-doctors-store-default-rtdb.firebaseio.com"
};
