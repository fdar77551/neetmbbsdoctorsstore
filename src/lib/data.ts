import { Product, Order, UserProfile, BannerSlide, StoreConfig } from '../types';

export const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi NCR",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

// Products are loaded directly from server DB / Cloudflare / Firebase
export const INITIAL_PRODUCTS: Product[] = [];



export const DEFAULT_BANNERS: BannerSlide[] = [
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

export const INITIAL_ORDERS: Order[] = [];

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: "NEET MBBS DOCTORS STORE",
  tagline: "India's #1 Dedicated Store for Medical Aspirants & MBBS Books",
  supportEmails: ["fdar77551@gmail.com", "shahzaibhusain6@gmail.com"],
  supportPhones: ["+91 6005894110", "+91 6397462104"],
  whatsappNumber: "+91 6005894110",
  telegramUsername: "@neetmbbsdoctors",
  telegramLink: "https://t.me/neetmbbsdoctors",
  hardcopyCardImage: "",
  softcopyCardImage: "",
  websiteUrl: "https://neetmbbsdoctorsstore.com",
  companyLegalName: "NCERTify Master Tests & Med Books PVT LTD",
  gstin: "07AABCN8891P1ZX",
  storeAddress: "Medical Enclave, Central Educational District, New Delhi - 110001"
};

export const INITIAL_REGISTERED_USERS: UserProfile[] = [
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
