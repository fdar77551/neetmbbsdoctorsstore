export type ProductType = 'book' | 'pdf';

export type ProductCategory = 'All' | 'Physics' | 'Chemistry' | 'Biology' | 'Full NEET Combo' | 'PYQ' | 'Mock Tests';

export interface Product {
  id: string;
  title: string;
  author: string;
  type: ProductType;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  coverImage: string;
  sampleImages?: string[];
  pdfUrl?: string; // For instant PDF download
  description: string;
  features: string[];
  tags?: string[]; // Product tags uploaded by admin for fast interactive search
  pages?: number;
  edition?: string;
  isbn?: string;
  language?: string;
  inStock?: boolean;
  isBestSeller?: boolean;
  shippingCost?: number; // Configurable per product (0 = Free Shipping)
  isFreeShipping?: boolean;
  createdAt: string;
}

export interface BannerSlide {
  id: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  subtitle: string;
  buttonText: string;
  badge: string;
  type: ProductType;
  imageUrl?: string; // Uploaded to Cloudflare R2 or direct link
  active: boolean;
}

export interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  state: string;
  district: string;
  pincode: string;
  landmark?: string;
}

export type OrderStatus = 'new' | 'accepted' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  title: string;
  author: string;
  type: ProductType;
  price: number;
  quantity: number;
  coverImage: string;
  pdfUrl?: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  subtotal?: number;
  shippingCost?: number;
  discountAmount?: number;
  paymentId: string;
  razorpayOrderId: string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'cod' | 'paid_sandbox';
  shippingAddress?: ShippingAddress;
  status: OrderStatus;
  orderDate: string;
  estimatedDelivery?: string;
  deliveredDate?: string;
  invoiceNumber: string;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  createdAt: string;
  totalOrders?: number;
  totalSpent?: number;
  savedAddresses?: ShippingAddress[];
}

export interface StoreConfig {
  storeName: string;
  tagline: string;
  supportEmails: string[];
  supportPhones: string[];
  whatsappNumber: string;
  whatsappUrl?: string;
  telegramUsername: string; // e.g. @neetmbbsdoctors or link
  telegramLink: string;
  telegramUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  hardcopyCardImage?: string;
  softcopyCardImage?: string;
  websiteUrl: string;
  companyLegalName: string;
  gstin: string;
  storeAddress: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied';
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minAmount?: number;
  active: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  userEmail: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PdfAccessRecord {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productTitle: string;
  pdfUrl: string;
  orderId: string;
  grantedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  paymentId: string;
  gateway: string;
  amount: number;
  status: string;
  signature?: string;
  createdAt: string;
}
