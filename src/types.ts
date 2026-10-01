export type ProductType = 'book' | 'pdf';

export type ProductCategory = 'All' | 'Physics' | 'Chemistry' | 'Biology' | 'Full NEET Combo' | 'PYQ' | 'Mock Tests';

export type NeetSubject = 'Biology' | 'Chemistry' | 'Physics' | 'Complete PCB';

export type NeetMaterialType = 
  | 'Notes'
  | 'PYQs'
  | 'MCQs'
  | 'Formulas'
  | 'Revision Material'
  | 'Tests'
  | 'Short Notes'
  | 'NCERT Content'
  | 'New Content';

export type NeetPassPlan = 'monthly' | 'yearly' | 'lifetime';
export type NeetPassSubjectKey = 'biology' | 'chemistry' | 'physics' | 'pcb';

export interface UserNeetPass {
  id: string;
  subjectKey: NeetPassSubjectKey;
  subjectName: string;
  plan: NeetPassPlan;
  planName: string;
  price: number;
  startDate: string;
  expiryDate: string; // ISO date string or 'lifetime'
  orderId: string;
  active: boolean;
}

export interface DownloadHistoryItem {
  id: string;
  productId: string;
  title: string;
  subject?: string;
  materialType?: string;
  pdfUrl: string;
  downloadedAt: string;
}

export interface Product {
  id: string;
  title: string;
  author: string;
  type: ProductType;
  category: string;
  subject?: NeetSubject | string;
  materialType?: NeetMaterialType | string;
  passTier?: 'biology' | 'chemistry' | 'physics' | 'pcb' | 'all' | 'free' | 'none';
  chapterName?: string;
  isFreeResource?: boolean;
  includedInPass?: boolean;
  downloadCount?: number;
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
  neetPasses?: UserNeetPass[];
}

export interface CloudflareR2Config {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string; // 64-character hex
  s3Endpoint: string;
  publicDevUrl: string;
  customCdnDomain?: string;
  storageMode?: 'proxy' | 'direct_r2' | 'custom_cdn';
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
  popularBookIds?: string[];
  featuredPdfIds?: string[];
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

export type ReviewProductType = 'book' | 'pdf' | 'mock_test' | 'course' | 'all' | 'general';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat'; // 'percentage' (%) or 'flat' (₹)
  discountValue: number;
  minAmount?: number;
  maxDiscount?: number; // Cap for percentage discount
  startDate?: string;
  expiryDate?: string;
  totalUsageLimit?: number;
  perUserUsageLimit?: number;
  currentUsageCount?: number;
  active: boolean;
  applicableProductTypes: ('book' | 'pdf' | 'mock_test' | 'course' | 'all')[];
  applicableProductIds?: string[];
  createdAt: string;
}

export interface CouponUsageRecord {
  id: string;
  couponCode: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  userId: string;
  userEmail: string;
  orderId: string;
  productType?: string;
  productId?: string;
  usedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  productType: ReviewProductType;
  productTitle?: string;
  userId: string;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5 stars
  comment: string;
  isVerifiedPurchase?: boolean;
  isHidden?: boolean;
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

// ==========================================
// MOCK TEST SYSTEM TYPES
// ==========================================

export type MockTestType = 
  | 'full_syllabus' 
  | 'part_test' 
  | 'chapter_test' 
  | 'subject_test' 
  | 'pyq_based' 
  | 'custom';

export type MockTestCategory = 'chapter_wise' | 'full_subject' | 'full_syllabus';

export type MockSubject = 'Physics' | 'Chemistry' | 'Biology';

export type MockQuestionDifficulty = 'Easy' | 'Moderate' | 'Hard';

export interface MockQuestionOption {
  label: 'A' | 'B' | 'C' | 'D';
  type: 'text' | 'image' | 'text_and_image';
  value?: string;
  imageUrl?: string;
}

export interface MockQuestionContentBlock {
  type: 'text' | 'image';
  value?: string;
  imageUrl?: string;
}

export interface MockMatchTableRow {
  leftKey: string;
  leftText: string;
  rightKey: string;
  rightText: string;
}

export interface MockMatchTable {
  column1Header: string;
  column2Header: string;
  rows: MockMatchTableRow[];
}

export interface MockQuestionLanguageContent {
  questionText: string;
  options: MockQuestionOption[];
  explanation?: string;
  explanationImageUrl?: string;
  figureUrl?: string;
  matchTable?: MockMatchTable;
}

export interface MockQuestion {
  id: string;
  testId: string;
  questionNumber: number;
  subject: MockSubject;
  chapter?: string;
  difficulty?: MockQuestionDifficulty;
  // Bilingual representations: One question, multiple language versions
  languages?: {
    en: MockQuestionLanguageContent;
    hi?: MockQuestionLanguageContent;
  };
  // Match-the-column table
  matchTable?: MockMatchTable;
  // Figures
  figures?: string[];
  figureUrl?: string;
  questionImageUrl?: string; // Backwards-compatible alias for primary figure
  // Legacy aliases for English text & options for backwards compatibility
  questionText: string;
  options: MockQuestionOption[];
  explanation?: string;
  explanationImageUrl?: string;
  questionContent?: MockQuestionContentBlock[];
  // Option figures (e.g. chemical structures for A, B, C, D)
  optionFigures?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks?: number;
  negativeMarks?: number;
  pdfPageNumber?: number;
  figureCropInfo?: {
    box?: number[];
    pageNumber?: number;
    cropUrl?: string;
  };
  sourceMetadata?: {
    pdfId?: string;
    pdfName?: string;
    pageNumber?: number;
    questionNumber?: number;
    targetType?: 'question' | 'option_A' | 'option_B' | 'option_C' | 'option_D' | 'matchTable';
    box?: [number, number, number, number];
    cropUrl?: string;
    storagePath?: string;
  };
  needsReview?: boolean;
  reviewReason?: string;
}

export interface MockTest {
  id: string;
  testNumber: string; // e.g. "Test 01" or "#01"
  code?: string; // e.g. "01" or "#01"
  title: string;
  description: string;
  shortDescription?: string;
  fullDescription?: string;
  folderId?: string;
  folderName?: string;
  testTypeCategory?: MockTestCategory; // 'chapter_wise' | 'full_subject' | 'full_syllabus'
  subject?: MockSubject; // 'Physics' | 'Chemistry' | 'Biology'
  chapter?: string; // Chapter name (e.g. "Laws of Motion", "Chemical Bonding")
  orderIndex?: number;
  type: MockTestType;
  subjects: (MockSubject | string)[];
  totalQuestions: number;
  durationMinutes: number; // e.g. 180
  totalMarks?: number;
  maxMarks: number; // e.g. 720
  correctMarks: number; // +4
  negativeMarks: number; // -1
  price: number; // e.g. 99 (0 for free)
  isFree?: boolean;
  isPaid?: boolean;
  originalPrice?: number; // e.g. 299
  discountedPrice?: number;
  razorpayPlanId?: string;
  difficulty?: MockQuestionDifficulty;
  status: 'draft' | 'published';
  syllabus?: string;
  instructions?: string[];
  languages?: ('en' | 'hi')[]; // ['en', 'hi']
  isBilingual?: boolean;
  attemptLimit?: 'once' | 'multiple' | 'unlimited';
  allowMultipleAttempts: boolean;
  showLeaderboard: boolean;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  scheduledAt?: string;
  questionsCount?: number;
  questions?: MockQuestion[];
  purchasesCount?: number;
  completionsCount?: number;
  pdfUrl?: string;
  answerKeyStatus?: 'pending' | 'reviewed' | 'published';
}

export interface MockTestPurchase {
  id: string;
  testId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  orderId: string;
  paymentId: string;
  amount: number;
  purchaseDate: string;
  status: 'active' | 'completed';
}

export interface SubjectScoreBreakdown {
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  totalMarks: number;
  questionsCount: number;
}

export interface MockTestAttempt {
  id: string;
  testId: string;
  testTitle?: string;
  attemptNumber?: number; // 1, 2, 3...
  userId: string;
  userEmail: string;
  userName: string;
  startedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  submittedAt?: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  timeTakenFormatted?: string; // e.g. "2h 41m"
  rank?: number;
  status: 'in_progress' | 'submitted' | 'timed_out';
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>; // questionNumber -> chosen option
  markedForReview: number[]; // array of question numbers
  visited: number[]; // array of question numbers
  timeSpentSeconds: number;
  score?: number;
  maxMarks?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  accuracy?: number; // percentage
  subjectScores?: {
    Physics: SubjectScoreBreakdown;
    Chemistry: SubjectScoreBreakdown;
    Biology: SubjectScoreBreakdown;
  };
}

export interface MockTestLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  maxMarks: number;
  accuracy: number;
  timeSpentSeconds: number;
  submittedAt: string;
  testId?: string;
  testTitle?: string;
}

export interface CombinedLeaderboardUser {
  rank: number;
  userId: string;
  userName: string;
  score: number; // Combined or best score
  totalScore: number;
  bestScore: number;
  averageScore: number;
  testsAttempted: number;
  accuracy: number;
  lastAttemptDate: string;
}

// ==========================================
// NEET (11th & 12th) FULL COURSE SYSTEM TYPES
// ==========================================

export interface NeetFullCourseConfig {
  id: string; // 'neet-full-course-11-12' or 'course-class-6', 'course-class-7', etc.
  title: string;
  subtitle: string;
  description: string;
  targetClass?: string; // 'Class 6th', 'Class 7th', 'Class 8th', 'Class 9th', 'Class 10th', 'Class 11th', 'Class 12th', 'NEET (11th & 12th)', 'Dropper'
  badgeText?: string;
  price: number;
  originalPrice: number;
  sampleDriveLink: string;
  mainCourseDriveLink?: string; // Private - only exposed upon verified purchase
  isActive: boolean;
  features?: string[];
  highlights?: string[];
}

export interface NeetFullCoursePurchase {
  id: string;
  courseId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  orderId: string;
  paymentId: string;
  amount: number;
  purchaseDate: string;
  status: 'active' | 'completed';
}

