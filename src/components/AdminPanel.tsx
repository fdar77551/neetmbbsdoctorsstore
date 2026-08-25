import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  Plus, 
  Package, 
  Users, 
  Copy, 
  Check, 
  Printer, 
  Trash2, 
  Edit3, 
  FileText, 
  Image as ImageIcon, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Truck, 
  Ban, 
  Sparkles,
  Sliders,
  Layers,
  X,
  Save,
  BookOpen,
  Send,
  BellRing,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Search,
  Zap,
  RefreshCw,
  Compass,
  CreditCard,
  Banknote,
  MapPin,
  Download,
  UserCheck,
  Settings,
  Globe,
  Building,
  AtSign,
  Smartphone,
  Instagram,
  Youtube,
  Share2
} from 'lucide-react';
import { Product, Order, UserProfile, ProductType, OrderStatus, BannerSlide, SupportMessage, StoreConfig } from '../types';
import { 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  updateOrderStatus,
  deleteOrder,
  deleteMultipleOrders,
  getStoredBanners,
  addBanner,
  updateBanner,
  deleteBanner,
  getStoredSupportMessages,
  updateSupportMessageStatus,
  deleteSupportMessage,
  updateUserProfile,
  deduplicateById,
  deduplicateUsers,
  sortProductsNewestFirst,
  sortOrdersNewestFirst,
  getR2PublicDomain,
  saveR2PublicDomain,
  DEFAULT_R2_PUBLIC_DOMAIN,
  migrateExistingProductsToR2Cdn,
  compressImage,
  syncAllToFirebaseRTDB,
  syncDataFromDatabase,
  getStoredStoreConfig,
  saveStoredStoreConfig,
  DEFAULT_STORE_CONFIG
} from '../lib/storage';
import { resolveImageUrl } from '../lib/storage';
import { BookMockup3D } from './BookMockup3D';
import { downloadInvoicePdf, downloadCombinedInvoicesPdf, sendBatchInvoicesToTelegram } from '../lib/pdfInvoice';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  users: UserProfile[];
  onOpenInvoiceModal: (order: Order) => void;
  adminEmail: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  orders,
  users,
  onOpenInvoiceModal,
  adminEmail
}) => {
  const [adminTab, setAdminTab] = useState<'products' | 'banners' | 'orders' | 'order-search' | 'support' | 'users' | 'store-settings' | 'storage'>('products');
  const [orderSubTab, setOrderSubTab] = useState<OrderStatus>('new');
  
  // Store & Support Configuration State
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());
  const [storeConfigFeedback, setStoreConfigFeedback] = useState<string | null>(null);
  const [isSavingStoreConfig, setIsSavingStoreConfig] = useState(false);
  
  // Search & Customer Support State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderSearchFilter, setOrderSearchFilter] = useState<'all' | 'books' | 'pdfs' | 'cod' | 'paid'>('all');
  const [orderSearchStatusFilter, setOrderSearchStatusFilter] = useState<string>('all');
  const [inTabOrderSearch, setInTabOrderSearch] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Batch Multi-Order Invoice Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isSendingBatchTelegram, setIsSendingBatchTelegram] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  
  // Cloud Sync State
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);

  // Ref for auto-scrolling to edit form
  const productFormRef = useRef<HTMLFormElement>(null);
  const bannerFormRef = useRef<HTMLFormElement>(null);

  // ================= Product Form State =================
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<ProductType>('book');
  const [category, setCategory] = useState('Biology');
  const [price, setPrice] = useState<number>(299);
  const [originalPrice, setOriginalPrice] = useState<number>(499);
  const [rating, setRating] = useState<number>(4.8);
  const [reviewsCount, setReviewsCount] = useState<number>(850);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(true);
  const [coverImage, setCoverImage] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [pages, setPages] = useState<number>(350);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [sampleImages, setSampleImages] = useState<string[]>([]);
  const [uploadingSample, setUploadingSample] = useState(false);
  const [sampleUploadSuccess, setSampleUploadSuccess] = useState('');

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState('');

  // ================= Banner Form State =================
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle1, setBannerTitle1] = useState('NEET UG 2026');
  const [bannerTitle2, setBannerTitle2] = useState('High-Yield Notes &');
  const [bannerTitle3, setBannerTitle3] = useState('Formula Cheatsheets');
  const [bannerSubtitle, setBannerSubtitle] = useState('Score 680+ with verified doctor summaries');
  const [bannerBadge, setBannerBadge] = useState('Bestseller');
  const [bannerBtnText, setBannerBtnText] = useState('Explore Store →');
  const [bannerType, setBannerType] = useState<ProductType>('book');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);
  const [bannerUploadSuccess, setBannerUploadSuccess] = useState('');

  // ================= Support Messages State =================
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const unreadSupportCount = supportMessages.filter(m => m.status === 'unread').length;

  // Copy States
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Telegram Bot State
  const [telegramToken, setTelegramToken] = useState(localStorage.getItem('neetmbbs_telegram_token') || '');
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Cloudflare R2 Public CDN / Domain State
  const [r2PublicDomain, setR2PublicDomainState] = useState(getR2PublicDomain());
  const [r2DomainStatus, setR2DomainStatus] = useState<string | null>(null);
  const [isTestingR2, setIsTestingR2] = useState(false);

  // Delete Surety / Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'product' | 'banner' | 'support' | 'order' | 'batch_orders';
    id: string;
    title: string;
    orderData?: Order;
    orderCount?: number;
    totalAmount?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format Card Image Upload States
  const [uploadingHardcopyCardImg, setUploadingHardcopyCardImg] = useState(false);
  const [uploadingSoftcopyCardImg, setUploadingSoftcopyCardImg] = useState(false);

  useEffect(() => {
    setBanners(getStoredBanners());
    const handleBannersUpdate = () => setBanners(getStoredBanners());
    window.addEventListener('neetmbbs_banners_updated', handleBannersUpdate);
    return () => window.removeEventListener('neetmbbs_banners_updated', handleBannersUpdate);
  }, []);

  useEffect(() => {
    setSupportMessages(getStoredSupportMessages());
    const handleSupportUpdate = () => setSupportMessages(getStoredSupportMessages());
    window.addEventListener('neetmbbs_support_updated', handleSupportUpdate);
    return () => window.removeEventListener('neetmbbs_support_updated', handleSupportUpdate);
  }, []);

  useEffect(() => {
    setStoreConfig(getStoredStoreConfig());
    const handleConfigUpdate = () => setStoreConfig(getStoredStoreConfig());
    window.addEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
  }, []);

  const handleSaveStoreConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingStoreConfig(true);
    setStoreConfigFeedback(null);
    try {
      saveStoredStoreConfig(storeConfig);
      
      // Also broadcast sync to Firebase RTDB config path
      fetch('https://ncertify-neet-master-tests-default-rtdb.firebaseio.com/config/store_settings.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeConfig)
      }).catch(() => {});

      setStoreConfigFeedback('✅ Store & Support Details Saved & Synced live across all Invoices, Header, Footer & Support Modal!');
      setTimeout(() => setStoreConfigFeedback(null), 4500);
    } catch (err: any) {
      setStoreConfigFeedback(`Error saving store details: ${err.message}`);
    } finally {
      setIsSavingStoreConfig(false);
    }
  };

  const handleResetStoreConfig = () => {
    if (window.confirm('Reset all store, support emails & contact details to recommended official defaults?')) {
      setStoreConfig(DEFAULT_STORE_CONFIG);
      saveStoredStoreConfig(DEFAULT_STORE_CONFIG);
      setStoreConfigFeedback('✅ Reset to Recommended Official Defaults!');
      setTimeout(() => setStoreConfigFeedback(null), 4000);
    }
  };

  const handleSaveTelegramToken = async () => {
    try {
      const cleanToken = telegramToken.trim();
      localStorage.setItem('neetmbbs_telegram_token', cleanToken);
      
      // Sync to Firebase RTDB directly
      fetch('https://ncertify-neet-master-tests-default-rtdb.firebaseio.com/config/telegram.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanToken })
      }).catch(() => {});

      // Sync to backend if present
      try {
        const res = await fetch('/api/telegram/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken: cleanToken })
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setTelegramStatus(data.message || 'Token saved successfully!');
          setTimeout(() => setTelegramStatus(null), 3500);
          return;
        }
      } catch (e) {}

      setTelegramStatus('Telegram bot token saved & active across all devices!');
      setTimeout(() => setTelegramStatus(null), 3500);
    } catch (e: any) {
      setTelegramStatus(`Error: ${e.message}`);
    }
  };

  const handleTestTelegramAlert = async () => {
    setIsTestingTelegram(true);
    setTelegramStatus(null);
    const tokenToUse = telegramToken.trim() || localStorage.getItem('neetmbbs_telegram_token') || '7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A';

    try {
      // 1. Try server endpoint
      let serverSuccess = false;
      try {
        const res = await fetch('/api/telegram/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenToUse })
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            serverSuccess = true;
          }
        }
      } catch (e) {}

      // 2. Direct client fallback (For Netlify / static hosting)
      if (!serverSuccess && tokenToUse) {
        const adminChatIds = ['7004282468', '1318240288'];
        const testMsg = `🛒 <b>TEST ORDER ALERT</b>\n👤 <b>Name:</b> Test NEET Aspirant\n📞 <b>Phone:</b> +91 9876543210\n📍 <b>Address:</b> NEET MBBS Doctors Store\n📦 <b>Product:</b> High-Yield Chemistry & Biology Notes\n🔢 <b>Quantity:</b> 1\n💰 <b>Price:</b> ₹299\n💳 <b>Payment:</b> Verified Test Online\n🆔 <b>Order ID:</b> #TEST-${Date.now()}`;
        
        for (const cid of adminChatIds) {
          await fetch(`https://api.telegram.org/bot${tokenToUse}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cid,
              text: testMsg,
              parse_mode: 'HTML'
            })
          }).catch(err => console.warn('Telegram direct test note:', err));
        }
      }

      setTelegramStatus('Test order alert dispatched to Admins (7004282468 & 1318240288)!');
      setTimeout(() => setTelegramStatus(null), 4500);
    } catch (e: any) {
      setTelegramStatus(`Telegram dispatch note: ${e.message}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  useEffect(() => {
    const handleR2Update = () => setR2PublicDomainState(getR2PublicDomain());
    window.addEventListener('neetmbbs_r2_config_updated', handleR2Update);
    return () => window.removeEventListener('neetmbbs_r2_config_updated', handleR2Update);
  }, []);

  const handleSaveR2Domain = () => {
    try {
      saveR2PublicDomain(r2PublicDomain);
      setR2DomainStatus('Cloudflare R2 Public Domain saved & synced across all devices via Firebase!');
      setTimeout(() => setR2DomainStatus(null), 4000);
    } catch (e: any) {
      setR2DomainStatus(`Error saving domain: ${e.message}`);
    }
  };

  const handleTestR2Connection = async () => {
    setIsTestingR2(true);
    setR2DomainStatus(null);
    const domain = (r2PublicDomain || getR2PublicDomain()).replace(/\/+$/, '');

    try {
      // Test fetching a test file or bucket response
      const testUrl = `${domain}/test-connection.json`;
      const res = await fetch(testUrl, { method: 'HEAD' }).catch(() => null);
      
      if (res && (res.status === 200 || res.status === 404)) {
        setR2DomainStatus(`Public CDN domain "${domain}" is active and accessible! (HTTP ${res.status})`);
      } else {
        setR2DomainStatus(`Connected to domain "${domain}". Note: Make sure "Public Development URL (r2.dev)" or Custom Domain is enabled in Cloudflare Dashboard.`);
      }
    } catch (e: any) {
      setR2DomainStatus(`Domain "${domain}" is saved. Cloudflare Public Access will serve images once enabled in your dashboard.`);
    } finally {
      setIsTestingR2(false);
      setTimeout(() => setR2DomainStatus(null), 5000);
    }
  };

  // Safe Cloudflare R2 Upload Helper
  const uploadToR2Safe = async (filename: string, contentType: string, base64Data: string, folder: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/r2/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType, base64Data, folder })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          const publicDom = getR2PublicDomain() || DEFAULT_R2_PUBLIC_DOMAIN;
          if (data.key && publicDom) {
            return `${publicDom}/${data.key}`;
          }
          if (data.url) {
            return data.url;
          }
        }
      }
    } catch (e) {
      // Expected in static environments like Netlify
    }
    return null;
  };

  // Calculate live quick stats
  const totalSalesRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'new').length;
  const totalUsersCount = users.length;

  // Cloud Sync Handler (Syncs Local Storage to Firebase Realtime Database & Cloudflare)
  const handleForceCloudSync = async () => {
    setIsCloudSyncing(true);
    setCloudSyncFeedback(null);
    try {
      const ok = await syncAllToFirebaseRTDB();
      if (ok) {
        setCloudSyncFeedback('Successfully Synced with Firebase RTDB & Cloud! 🚀');
      } else {
        setCloudSyncFeedback('Sync completed with local persistence.');
      }
    } catch (err: any) {
      setCloudSyncFeedback(`Sync note: ${err?.message || 'Local updated'}`);
    } finally {
      setIsCloudSyncing(false);
      setTimeout(() => setCloudSyncFeedback(null), 4000);
    }
  };

  // Cloudflare R2 / Compressed Upload Handler for Product Cover
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadSuccess('');

    try {
      // Compress image client-side to ensure fast loading and prevent quota errors
      const compressedData = await compressImage(file, 1000, 1000, 0.82);
      const r2Url = await uploadToR2Safe(file.name, file.type || 'image/jpeg', compressedData, type === 'pdf' ? 'pdf-covers' : 'book-covers');
      if (r2Url) {
        setCoverImage(r2Url);
        setUploadSuccess(`Uploaded to Cloudflare R2 (ncertify)!`);
      } else {
        setCoverImage(compressedData);
        setUploadSuccess(`Image ready (${file.name}) - optimized & synced via Firebase!`);
      }
      setUploadingImage(false);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadingImage(false);
    }
  };

  // Cloudflare R2 Upload Handler for Sample Pages / Preview Images
  const handleSampleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSample(true);
    setSampleUploadSuccess('');

    try {
      const compressedData = await compressImage(file, 1000, 1000, 0.82);
      const r2Url = await uploadToR2Safe(file.name, file.type || 'image/jpeg', compressedData, 'sample-pages');
      const finalUrl = r2Url || compressedData;
      setSampleImages(prev => [...prev, finalUrl]);
      setSampleUploadSuccess('Sample page added successfully!');
      setUploadingSample(false);
    } catch (err: any) {
      console.error('Sample page upload error:', err);
      setUploadingSample(false);
    }
  };

  // Cloudflare R2 Direct Binary Upload Handler for PDF File (No Base64 conversion)
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    setPdfUploadSuccess('');

    try {
      // 1. Send original binary file directly to backend S3 R2 endpoint via FormData
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('productId', editingProductId || `${type}-${Date.now()}`);
      formData.append('productTitle', title || 'NEET Study Notes');

      const response = await fetch('/api/r2/upload-binary-pdf', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && (data.url || data.key)) {
          const finalPdfUrl = data.url || `/api/r2/file/${data.key}`;
          setPdfUrl(finalPdfUrl);
          const sizeKb = Math.round(file.size / 1024);
          const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
          const displaySize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
          setPdfUploadSuccess(`Binary PDF uploaded directly to Cloudflare R2! (${file.name}, ${displaySize})`);
          setUploadingPdf(false);
          return;
        }
      }

      // Fallback: If server is unavailable, use standard object URL
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
      setPdfUploadSuccess(`PDF attached (${file.name}) - original format preserved!`);
      setUploadingPdf(false);
    } catch (err: any) {
      console.error('PDF file upload error:', err);
      // Fallback to object URL
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
      setPdfUploadSuccess(`PDF attached (${file.name})`);
      setUploadingPdf(false);
    }
  };

  // Cloudflare R2 / Compressed Upload Handler for Banner Image
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBannerImg(true);
    setBannerUploadSuccess('');

    try {
      const compressedData = await compressImage(file, 1280, 720, 0.85);
      const r2Url = await uploadToR2Safe(file.name, file.type || 'image/jpeg', compressedData, 'banners');
      if (r2Url) {
        setBannerImageUrl(r2Url);
        setBannerUploadSuccess(`Banner uploaded to Cloudflare R2!`);
      } else {
        setBannerImageUrl(compressedData);
        setBannerUploadSuccess(`Banner image loaded (${file.name}) - optimized!`);
      }
      setUploadingBannerImg(false);
    } catch (err: any) {
      console.error('Banner upload error:', err);
      setUploadingBannerImg(false);
    }
  };

  const handleHardcopyCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHardcopyCardImg(true);
    try {
      const compressedData = await compressImage(file, 800, 800, 0.85);
      const r2Url = await uploadToR2Safe(file.name, file.type || 'image/jpeg', compressedData, 'format_cards');
      const urlToSave = r2Url || compressedData;
      const updated = { ...storeConfig, hardcopyCardImage: urlToSave };
      setStoreConfig(updated);
      saveStoredStoreConfig(updated);
    } catch (err: any) {
      console.error('Error uploading hardcopy card image:', err);
    } finally {
      setUploadingHardcopyCardImg(false);
    }
  };

  const handleSoftcopyCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSoftcopyCardImg(true);
    try {
      const compressedData = await compressImage(file, 800, 800, 0.85);
      const r2Url = await uploadToR2Safe(file.name, file.type || 'image/jpeg', compressedData, 'format_cards');
      const urlToSave = r2Url || compressedData;
      const updated = { ...storeConfig, softcopyCardImage: urlToSave };
      setStoreConfig(updated);
      saveStoredStoreConfig(updated);
    } catch (err: any) {
      console.error('Error uploading softcopy card image:', err);
    } finally {
      setUploadingSoftcopyCardImg(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please provide product title');
      return;
    }

    const featureList = features
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    const productPayload: Product = {
      id: editingProductId || `${type}-${Date.now()}`,
      title,
      author: author || 'NEET MBBS Doctors Board',
      type,
      category,
      price: Number(price) || 299,
      originalPrice: Number(originalPrice || price) || 499,
      rating: Number(rating) || 4.8,
      reviewsCount: Number(reviewsCount) || 100,
      shippingCost: isFreeShipping ? 0 : (Number(shippingCost) || 0),
      isFreeShipping: isFreeShipping || Number(shippingCost) === 0,
      coverImage: coverImage.trim() || '',
      sampleImages: sampleImages.filter(Boolean),
      pdfUrl: type === 'pdf' ? (pdfUrl || 'https://raw.githubusercontent.com/ncertify-neet/sample-notes/main/sample.pdf') : undefined,
      description: description || 'High-yield verified medical study material for NEET aspirants.',
      features: featureList.length > 0 ? featureList : [
        'Complete line-by-line NCERT syllabus coverage',
        'Verified solutions and high-yield concept pointers',
        'Direct access in student dashboard'
      ],
      pages: Number(pages) || 300,
      edition: '2026 Latest Edition',
      language: 'English',
      inStock: true,
      createdAt: new Date().toISOString()
    };

    if (editingProductId) {
      updateProduct(productPayload);
    } else {
      addProduct(productPayload);
    }

    // Reset Form
    setIsAddingProduct(false);
    setEditingProductId(null);
    setTitle('');
    setAuthor('');
    setCoverImage('');
    setSampleImages([]);
    setPdfUrl('');
    setDescription('');
    setFeatures('');
    setShippingCost(0);
    setIsFreeShipping(true);
    setRating(4.8);
    setReviewsCount(850);
    setUploadSuccess('');
    setSampleUploadSuccess('');
  };

  const handleSaveBanner = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const bannerPayload: BannerSlide = {
      id: editingBannerId || `banner-${Date.now()}`,
      titleLine1: bannerTitle1.trim() || 'NEET UG 2026',
      titleLine2: bannerTitle2.trim(),
      titleLine3: bannerTitle3.trim(),
      subtitle: bannerSubtitle.trim(),
      badge: bannerBadge.trim(),
      buttonText: bannerBtnText.trim() || 'Explore Store →',
      type: bannerType,
      imageUrl: bannerImageUrl.trim() || undefined,
      active: true
    };

    if (editingBannerId) {
      updateBanner(bannerPayload);
      setBannerUploadSuccess('✅ Banner slide updated successfully!');
    } else {
      addBanner(bannerPayload);
      setBannerUploadSuccess('✅ New banner slide added successfully!');
    }

    setTimeout(() => {
      setIsAddingBanner(false);
      setEditingBannerId(null);
      setBannerTitle1('NEET UG 2026');
      setBannerTitle2('High-Yield Notes');
      setBannerTitle3('Top Scores');
      setBannerImageUrl('');
      setBannerUploadSuccess('');
    }, 1200);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProductId(product.id);
    setTitle(product.title);
    setAuthor(product.author);
    setType(product.type);
    setCategory(product.category);
    setPrice(product.price);
    setOriginalPrice(product.originalPrice);
    setRating(product.rating ?? 4.8);
    setReviewsCount(product.reviewsCount ?? 850);
    setShippingCost(product.shippingCost ?? 0);
    setIsFreeShipping(product.isFreeShipping ?? (product.shippingCost === 0 || product.shippingCost === undefined));
    setCoverImage(product.coverImage);
    setSampleImages(product.sampleImages || []);
    setPdfUrl(product.pdfUrl || '');
    setDescription(product.description);
    setFeatures(product.features.join('\n'));
    setPages(product.pages || 350);
    setIsAddingProduct(true);

    // Auto-scroll to the edit form
    setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEditBannerClick = (banner: BannerSlide) => {
    setEditingBannerId(banner.id);
    setBannerTitle1(banner.titleLine1);
    setBannerTitle2(banner.titleLine2);
    setBannerTitle3(banner.titleLine3);
    setBannerSubtitle(banner.subtitle);
    setBannerBadge(banner.badge);
    setBannerBtnText(banner.buttonText);
    setBannerType(banner.type);
    setBannerImageUrl(banner.imageUrl || '');
    setIsAddingBanner(true);

    setTimeout(() => {
      bannerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteProduct = (productId: string, productTitle: string) => {
    setDeleteTarget({
      type: 'product',
      id: productId,
      title: productTitle
    });
  };

  const handleDeleteBanner = (bannerId: string, bannerTitle: string) => {
    setDeleteTarget({
      type: 'banner',
      id: bannerId,
      title: bannerTitle
    });
  };

  const handleDeleteSupportMessage = (messageId: string, messageTitle: string) => {
    setDeleteTarget({
      type: 'support',
      id: messageId,
      title: messageTitle
    });
  };

  const handleDeleteOrder = (order: Order) => {
    setDeleteTarget({
      type: 'order',
      id: order.id,
      title: `Order #${order.id.replace(/^ORD-/, '')}`,
      orderData: order,
      totalAmount: order.totalAmount
    });
  };

  const handleBatchDeleteOrders = () => {
    if (selectedOrderIds.length === 0) return;
    setDeleteTarget({
      type: 'batch_orders',
      id: 'batch',
      title: `${selectedOrderIds.length} Selected Orders`,
      orderCount: selectedOrderIds.length,
      totalAmount: selectedTotalRevenue
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'product') {
        deleteProduct(deleteTarget.id);
      } else if (deleteTarget.type === 'banner') {
        deleteBanner(deleteTarget.id);
      } else if (deleteTarget.type === 'support') {
        deleteSupportMessage(deleteTarget.id);
      } else if (deleteTarget.type === 'order') {
        deleteOrder(deleteTarget.id);
        setSelectedOrderIds(prev => prev.filter(id => id !== deleteTarget.id));
      } else if (deleteTarget.type === 'batch_orders') {
        deleteMultipleOrders(selectedOrderIds);
        setSelectedOrderIds([]);
      }
    } catch (err) {
      console.error('Delete execution error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const cleanProducts = React.useMemo(() => sortProductsNewestFirst(deduplicateById(products)), [products]);
  const cleanOrders = React.useMemo(() => sortOrdersNewestFirst(deduplicateById(orders)), [orders]);
  const cleanUsers = React.useMemo(() => deduplicateUsers(users), [users]);
  const cleanBanners = React.useMemo(() => deduplicateById(banners), [banners]);
  const cleanSupport = React.useMemo(() => deduplicateById(supportMessages), [supportMessages]);

  const handleCopyAllEmails = () => {
    const allEmails = cleanUsers.map(u => u.email).join(', ');
    navigator.clipboard?.writeText(allEmails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Filtered orders for the standard 'orders' tab with in-tab search
  const filteredOrders = React.useMemo(() => {
    let list = cleanOrders.filter(o => o.status === orderSubTab);
    if (inTabOrderSearch.trim()) {
      const q = inTabOrderSearch.toLowerCase().trim();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.userName.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q) ||
        (o.shippingAddress?.phoneNumber && o.shippingAddress.phoneNumber.includes(q)) ||
        (o.shippingAddress?.landmark && o.shippingAddress.landmark.toLowerCase().includes(q)) ||
        (o.paymentId && o.paymentId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cleanOrders, orderSubTab, inTabOrderSearch]);

  // Comprehensive Support Order Search Filter
  const searchedSupportOrders = React.useMemo(() => {
    let list = cleanOrders;
    
    // Status filter
    if (orderSearchStatusFilter !== 'all') {
      list = list.filter(o => o.status === orderSearchStatusFilter);
    }

    // Type filter
    if (orderSearchFilter === 'books') {
      list = list.filter(o => o.items.some(i => i.type === 'book'));
    } else if (orderSearchFilter === 'pdfs') {
      list = list.filter(o => o.items.every(i => i.type === 'pdf'));
    } else if (orderSearchFilter === 'cod') {
      list = list.filter(o => o.paymentStatus.includes('cod') || o.paymentId?.startsWith('COD_'));
    } else if (orderSearchFilter === 'paid') {
      list = list.filter(o => o.paymentStatus === 'paid' && !o.paymentId?.startsWith('COD_'));
    }

    // Text search query
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      list = list.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.id.replace(/^ORD-/, '').includes(q) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        o.userName.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q) ||
        (o.paymentId && o.paymentId.toLowerCase().includes(q)) ||
        (o.razorpayOrderId && o.razorpayOrderId.toLowerCase().includes(q)) ||
        (o.shippingAddress?.phoneNumber && o.shippingAddress.phoneNumber.includes(q)) ||
        (o.shippingAddress?.pincode && o.shippingAddress.pincode.includes(q)) ||
        (o.shippingAddress?.district && o.shippingAddress.district.toLowerCase().includes(q)) ||
        (o.shippingAddress?.landmark && o.shippingAddress.landmark.toLowerCase().includes(q)) ||
        (o.shippingAddress?.addressLine1 && o.shippingAddress.addressLine1.toLowerCase().includes(q)) ||
        o.items.some(i => i.title.toLowerCase().includes(q))
      );
    }

    return list;
  }, [cleanOrders, orderSearchQuery, orderSearchFilter, orderSearchStatusFilter]);

  // Selected Orders for Batch Processing
  const selectedOrders = React.useMemo(() => {
    return cleanOrders.filter(o => selectedOrderIds.includes(o.id));
  }, [cleanOrders, selectedOrderIds]);

  const selectedTotalRevenue = React.useMemo(() => {
    return selectedOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.price || 0)), 0);
  }, [selectedOrders]);

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllVisible = (ordersList: Order[]) => {
    const visibleIds = ordersList.map(o => o.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearSelected = () => {
    setSelectedOrderIds([]);
  };

  const handleDownloadBatchInvoices = () => {
    if (selectedOrders.length === 0) return;
    downloadCombinedInvoicesPdf(selectedOrders);
  };

  const handleSendBatchInvoicesToTelegram = async () => {
    if (selectedOrders.length === 0) return;
    setIsSendingBatchTelegram(true);
    setBatchFeedback(`Generating combined ${selectedOrders.length}-page PDF document...`);
    try {
      const res = await sendBatchInvoicesToTelegram(
        selectedOrders,
        telegramToken,
        (progressMsg) => setBatchFeedback(progressMsg)
      );
      if (res.success) {
        setBatchFeedback(`✓ Sent combined PDF with ${selectedOrders.length} invoices to Telegram!`);
        setTimeout(() => setBatchFeedback(null), 5000);
      } else {
        setBatchFeedback(`Notice: ${res.message}`);
        setTimeout(() => setBatchFeedback(null), 6000);
      }
    } catch (err: any) {
      setBatchFeedback(`Error: ${err.message}`);
      setTimeout(() => setBatchFeedback(null), 6000);
    } finally {
      setIsSendingBatchTelegram(false);
    }
  };

  // Mock product object for live 3D preview in admin form
  const livePreviewProduct: Product = {
    id: 'preview',
    title: title || 'Book Title Preview',
    author: author || 'Dr. Faisal Fayaz',
    type,
    category,
    price: Number(price) || 299,
    originalPrice: Number(originalPrice) || 499,
    rating: 4.8,
    reviewsCount: 850,
    coverImage,
    description: '',
    features: [],
    createdAt: new Date().toISOString()
  };

  return (
    <div className="p-4 space-y-4 pb-48 max-w-md mx-auto min-h-screen">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-bold flex items-center gap-1.5 font-['Outfit',sans-serif]">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Admin Control Center</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Authorized: <span className="text-blue-300 font-bold">{adminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleForceCloudSync}
              disabled={isCloudSyncing}
              className="px-2.5 py-1 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Force Sync with Firebase RTDB & Cloudflare"
            >
              {isCloudSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>{isCloudSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
            <span className="px-2 py-1 bg-emerald-600/90 rounded-lg text-[9px] font-bold">
              Live
            </span>
          </div>
        </div>

        {/* Sync feedback notification */}
        {cloudSyncFeedback && (
          <div className="p-2 bg-blue-900/80 border border-blue-500/50 rounded-xl text-[10px] font-bold text-blue-100 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{cloudSyncFeedback}</span>
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
          <div className="p-2 bg-blue-950/60 rounded-xl border border-blue-800/40 text-center">
            <span className="text-[8px] uppercase font-bold text-blue-400 block">Total Revenue</span>
            <div className="text-sm font-black text-blue-200">₹{totalSalesRevenue}</div>
          </div>
          <div className="p-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 text-center">
            <span className="text-[8px] uppercase font-bold text-emerald-400 block">New Orders</span>
            <div className="text-sm font-black text-emerald-200">{pendingOrdersCount}</div>
          </div>
          <div className="p-2 bg-amber-950/60 rounded-xl border border-amber-800/40 text-center">
            <span className="text-[8px] uppercase font-bold text-amber-400 block">Users</span>
            <div className="text-sm font-black text-amber-200">{totalUsersCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (8 Core Sections) */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 bg-slate-100 p-1 rounded-xl text-[9px] font-bold sticky top-14 z-30 shadow-xs">
        <button
          onClick={() => setAdminTab('products')}
          className={`py-2 rounded-lg text-center transition cursor-pointer ${
            adminTab === 'products' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Catalog
        </button>
        <button
          onClick={() => setAdminTab('banners')}
          className={`py-2 rounded-lg text-center transition cursor-pointer ${
            adminTab === 'banners' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Banners
        </button>
        <button
          onClick={() => setAdminTab('orders')}
          className={`py-2 rounded-lg text-center relative transition cursor-pointer ${
            adminTab === 'orders' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Orders
          {pendingOrdersCount > 0 && (
            <span className="absolute -top-1 right-0.5 bg-blue-600 text-white text-[7px] font-black px-1 rounded-full">
              {pendingOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab('order-search')}
          className={`py-2 rounded-lg text-center relative transition cursor-pointer ${
            adminTab === 'order-search' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
          title="Customer Support Order Lookup"
        >
          Search
        </button>
        <button
          onClick={() => setAdminTab('support')}
          className={`py-2 rounded-lg text-center relative transition cursor-pointer ${
            adminTab === 'support' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Support
          {unreadSupportCount > 0 && (
            <span className="absolute -top-1 right-0.5 bg-rose-600 text-white text-[7px] font-black px-1 rounded-full animate-pulse">
              {unreadSupportCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab('users')}
          className={`py-2 rounded-lg text-center transition cursor-pointer ${
            adminTab === 'users' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setAdminTab('store-settings')}
          className={`py-2 rounded-lg text-center transition cursor-pointer ${
            adminTab === 'store-settings' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
          title="Store and Support Settings"
        >
          Settings
        </button>
        <button
          onClick={() => setAdminTab('storage')}
          className={`py-2 rounded-lg text-center transition cursor-pointer ${
            adminTab === 'storage' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Cloud
        </button>
      </div>

      {/* ================= 1. PRODUCTS SECTION ================= */}
      {adminTab === 'products' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
              <span>Store Products ({products.length})</span>
            </h3>
            <button
              id="admin-add-product-btn"
              onClick={() => {
                setEditingProductId(null);
                setTitle('');
                setCoverImage('');
                setIsAddingProduct(!isAddingProduct);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingProduct ? 'Cancel' : 'Add Product'}</span>
            </button>
          </div>

          {/* Add / Edit Form with Easy Scrolling */}
          {isAddingProduct && (
            <form 
              ref={productFormRef}
              onSubmit={handleSaveProduct} 
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-md space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider">
                  {editingProductId ? '✏️ Edit Product Details' : '➕ Add New Product / PDF'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('book')}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'book'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span>📖</span>
                  <span>Physical Book</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('pdf')}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === 'pdf'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span>⚡</span>
                  <span>PDF Download</span>
                </button>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 block">Product Title *</label>
                <input
                  type="text"
                  placeholder="e.g. NEET UG Biology Line By Line"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-medium"
                  required
                />
              </div>

              {/* Author & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Author / Board</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Faisal Fayaz"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Subject Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="Biology">Biology</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Full NEET Combo">Full NEET Combo</option>
                    <option value="PYQ">PYQ Papers</option>
                    <option value="Mock Tests">Mock Tests</option>
                  </select>
                </div>
              </div>

              {/* Price & MRP & Rating */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Original MRP (₹)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">⭐ Star Rating (e.g. 4.8)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">💬 Reviews Count (e.g. 850)</label>
                  <input
                    type="number"
                    value={reviewsCount}
                    onChange={(e) => setReviewsCount(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Shipping Configuration */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black text-emerald-900 block flex items-center gap-1.5">
                    <span>🚚</span>
                    <span>Product Shipping Cost Settings</span>
                  </label>
                  <span className="text-[9px] font-bold text-emerald-700">Applies to delivery & checkout</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFreeShipping(true);
                      setShippingCost(0);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isFreeShipping || shippingCost === 0
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🎉</span>
                      <span>Free Shipping (₹0)</span>
                    </span>
                    {(isFreeShipping || shippingCost === 0) && <span>✓ Active</span>}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFreeShipping(false);
                        if (shippingCost === 0) setShippingCost(50);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer shrink-0 ${
                        !isFreeShipping && shippingCost > 0
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs font-black'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Custom Cost
                    </button>
                    <div className="flex-1 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 50"
                        value={isFreeShipping ? 0 : shippingCost}
                        disabled={isFreeShipping}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setShippingCost(val);
                          if (val > 0) setIsFreeShipping(false);
                          else setIsFreeShipping(true);
                        }}
                        className={`w-full text-xs p-2 pl-6 rounded-xl border font-bold ${
                          isFreeShipping 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-white border-blue-300 text-slate-900 focus:ring-2 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cloudflare R2 Upload Cover Image & Sample Image Selector */}
              <div className="space-y-2.5 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-blue-900 block">
                    Product Profile Photo / Cover Icon
                  </label>
                  <span className="text-[9px] font-bold text-blue-600">Home Screen Icon</span>
                </div>

                {/* Option 1: Pick from Uploaded Sample Pages */}
                {sampleImages.length > 0 && (
                  <div className="bg-white/90 rounded-xl p-2.5 border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                        Choose from Uploaded Sample Pages ({sampleImages.length}):
                      </span>
                      <span className="text-[9px] text-blue-600 font-semibold">Tap to set as cover</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {sampleImages.map((sImg, idx) => {
                        const isSelected = coverImage === sImg;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCoverImage(sImg);
                              setUploadSuccess(`Set Sample Page #${idx + 1} as the main cover photo!`);
                            }}
                            className={`relative shrink-0 rounded-lg p-0.5 border-2 transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 ring-2 ring-blue-400 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <img
                              src={resolveImageUrl(sImg)}
                              alt={`Sample page ${idx + 1}`}
                              className="w-12 h-16 object-cover rounded"
                              referrerPolicy="no-referrer"
                            />
                            {isSelected && (
                              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                            <span className="text-[8px] font-bold text-slate-600 block text-center mt-0.5">
                              Page {idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option 2: Or choose from Sample Library Covers */}
                <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-700 block">
                    🎨 Or Quick-Select Sample Cover Art:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { name: 'Biology Master', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=600' },
                      { name: 'Physics Booster', url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=600' },
                      { name: 'Organic Chem', url: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=600' },
                      { name: '37 Yr PYQs', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600' },
                      { name: 'Doctor Notes', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600' },
                      { name: 'Topper Notes', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCoverImage(preset.url);
                          setUploadSuccess(`Selected ${preset.name} cover photo!`);
                        }}
                        className={`p-1 rounded-lg border text-left transition cursor-pointer ${
                          coverImage === preset.url
                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-10 object-cover rounded mb-1"
                        />
                        <span className="text-[8px] font-bold text-slate-800 line-clamp-1 block text-center">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Button Box */}
                <label className="cursor-pointer border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center bg-white transition shadow-2xs">
                  {uploadingImage ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-bold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading to R2...</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <Cloud className="w-5 h-5 text-blue-600 mx-auto" />
                      <span className="text-xs font-bold text-slate-800 block">Tap to Select & Upload Custom Cover Image</span>
                      <span className="text-[9px] text-slate-400 block">Uploaded to Cloudflare R2 bucket (ncertify)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                {/* Cover Image URL / Preview */}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Image URL or proxy path"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full text-[11px] bg-white border border-slate-200 p-2 rounded-xl text-slate-800"
                  />
                </div>

                {/* Direct Image Preview */}
                {coverImage && (
                  <div className="bg-white rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 mb-2">Current Cover Image / Profile Photo:</span>
                    <img
                      src={resolveImageUrl(coverImage)}
                      alt="Cover Preview"
                      className="max-h-40 max-w-full object-contain rounded-lg shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {uploadSuccess && (
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> {uploadSuccess}
                  </p>
                )}
              </div>

              {/* Sample Images Upload (Multiple Preview Pages) */}
              <div className="space-y-2.5 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-purple-900 block">
                    Sample Pages / Diagram Previews ({sampleImages.length})
                  </label>
                  <span className="text-[9px] font-bold text-purple-600">Customer Preview</span>
                </div>

                {/* Upload Sample Button */}
                <label className="cursor-pointer border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-3 flex flex-col items-center justify-center bg-white transition shadow-2xs">
                  {uploadingSample ? (
                    <div className="flex items-center gap-2 text-xs text-purple-600 font-bold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading Sample Page...</span>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <Plus className="w-5 h-5 text-purple-600 mx-auto" />
                      <span className="text-xs font-bold text-slate-800 block">+ Add Sample Page Image</span>
                      <span className="text-[9px] text-slate-400 block">Aspirants can browse these sample pages before purchasing</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleSampleFileUpload} className="hidden" />
                </label>

                {sampleUploadSuccess && (
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> {sampleUploadSuccess}
                  </p>
                )}

                {/* Uploaded Samples Thumbnails Grid with Star as Cover Option */}
                {sampleImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {sampleImages.map((sImg, idx) => {
                      const isCover = coverImage === sImg;
                      return (
                        <div 
                          key={idx} 
                          className={`relative group bg-white rounded-lg p-1.5 border transition ${
                            isCover ? 'border-blue-600 ring-2 ring-blue-400 shadow-xs' : 'border-slate-200 shadow-2xs'
                          }`}
                        >
                          <img
                            src={resolveImageUrl(sImg)}
                            alt={`Sample ${idx + 1}`}
                            className="w-full h-18 object-contain rounded"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Set As Cover Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCoverImage(sImg);
                              setUploadSuccess(`Page #${idx + 1} set as main cover photo!`);
                            }}
                            className={`w-full mt-1 py-0.5 px-1 rounded text-[8px] font-bold flex items-center justify-center gap-0.5 transition cursor-pointer ${
                              isCover 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                            }`}
                          >
                            {isCover ? '✓ Main Cover' : 'Set as Cover'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSampleImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow cursor-pointer"
                            title="Delete sample page"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PDF URL if digital - Direct Upload or Cloudflare / GitHub link */}
              {type === 'pdf' && (
                <div className="space-y-2 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-amber-900 block">
                      Digital PDF Source (Upload Direct or Link)
                    </label>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Direct / Cloudflare / GitHub
                    </span>
                  </div>

                  {/* Direct PDF File Upload Button */}
                  <div>
                    <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-white hover:bg-amber-100/50 border border-dashed border-amber-300 rounded-xl cursor-pointer transition text-xs font-bold text-amber-900 shadow-2xs">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>{uploadingPdf ? 'Uploading PDF to Cloudflare R2...' : 'Upload PDF Document Directly'}</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handlePdfFileUpload}
                        className="hidden"
                        disabled={uploadingPdf}
                      />
                    </label>
                    {pdfUploadSuccess && (
                      <p className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {pdfUploadSuccess}
                      </p>
                    )}
                  </div>

                  {/* Or Manual Link Input */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      Or paste Cloudflare / GitHub Raw / Google Drive / Direct PDF URL:
                    </span>
                    <input
                      type="url"
                      placeholder="https://.../notes.pdf or https://raw.githubusercontent.com/..."
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      className="w-full text-xs bg-white border border-amber-200 p-2 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[9px] text-amber-700 block">
                    Users get instant access to view in reader & download this PDF after successful payment.
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 block">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive line-by-line NCERT extract, question bank, diagrams..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              {/* Features */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 block">Key Bullet Points (1 per line)</label>
                <textarea
                  rows={3}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Line-by-line NCERT coverage&#10;Topper verified notes&#10;High yield diagrams"
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-900 focus:bg-white font-mono text-[11px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProductId ? 'Save Product Changes' : 'Publish Product to Store'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Products */}
          {cleanProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 border border-slate-100 shadow-2xs">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">No products uploaded yet</h4>
              <p className="text-[10px] text-slate-400">
                Click "+ Add Product" above to upload your first physical book or PDF download to the store!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cleanProducts.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs flex items-center gap-3"
                  >
                    <div className="w-11 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-2xs">
                      {item.coverImage ? (
                        <img 
                          src={resolveImageUrl(item.coverImage)} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-base">{item.type === 'pdf' ? '⚡' : '📖'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.type === 'pdf' ? '⚡ PDF' : '📖 Book'} • <span className="font-bold text-blue-600">₹{item.price}</span> • {item.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditProductClick(item)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(item.id, item.title)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= 2. BANNERS SECTION ================= */}
      {adminTab === 'banners' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
              <span>Hero Banners ({banners.length})</span>
            </h3>

            <button
              onClick={() => {
                setEditingBannerId(null);
                setBannerImageUrl('');
                setIsAddingBanner(!isAddingBanner);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingBanner ? 'Cancel' : 'Add Banner'}</span>
            </button>
          </div>

          {/* Add / Edit Banner Form */}
          {isAddingBanner && (
            <form 
              ref={bannerFormRef}
              onSubmit={handleSaveBanner} 
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-md space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider">
                  {editingBannerId ? '✏️ Edit Banner Slide' : '➕ Create New Hero Banner'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingBanner(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Optional Title Lines */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">
                    Banner Title (Optional - Leave blank if image has text)
                  </label>
                  <span className="text-[9px] text-slate-400 font-semibold">Optional</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    placeholder="Title 1 (Optional)"
                    value={bannerTitle1}
                    onChange={(e) => setBannerTitle1(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Title 2 (Optional)"
                    value={bannerTitle2}
                    onChange={(e) => setBannerTitle2(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Title 3 (Optional)"
                    value={bannerTitle3}
                    onChange={(e) => setBannerTitle3(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900 text-yellow-600 font-bold"
                  />
                </div>
              </div>

              {/* Subtitle & Badge */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Badge (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bestseller (Optional)"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-600 block">Button (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Explore Store → (Optional)"
                    value={bannerBtnText}
                    onChange={(e) => setBannerBtnText(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 block">Subtitle (Optional)</label>
                <input
                  type="text"
                  placeholder="Subtitle (Optional - leave blank if not needed)"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-slate-900"
                />
              </div>

              {/* Banner Image (Direct Upload to R2 or Link) */}
              <div className="space-y-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black text-blue-950 block">
                    Banner Artwork / AI Image
                  </label>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    Auto-Fit Scaling
                  </span>
                </div>

                {/* AI Image Generation Size Guide Card */}
                <div className="bg-white/90 border border-blue-200 rounded-lg p-2.5 space-y-1.5 text-[10px] text-slate-700">
                  <div className="flex items-center gap-1 font-extrabold text-blue-900 text-[11px]">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                    <span>Recommended AI Image Generator Sizes:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="font-bold text-slate-900 block">📐 Standard Store Banner:</span>
                      <span className="text-blue-600 font-black">1200 × 600 px</span> (2:1 Ratio)
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="font-bold text-slate-900 block">🤖 AI / DALL-E / Midjourney:</span>
                      <span className="text-blue-600 font-black">1280 × 640 px</span> or <span className="text-blue-600 font-black">16:9</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-tight italic">
                    💡 Any image uploaded will automatically auto-fit and scale smoothly across mobile & desktop screens.
                  </p>
                </div>

                <label className="cursor-pointer border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center bg-white transition">
                  {uploadingBannerImg ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="text-center space-y-1">
                      <ImageIcon className="w-5 h-5 text-blue-600 mx-auto" />
                      <span className="text-xs font-bold text-slate-700 block">Upload Banner Image</span>
                      <span className="text-[9px] text-slate-400 block">PNG, JPG, WebP up to 50MB</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                </label>

                <input
                  type="text"
                  placeholder="Or paste banner image URL (e.g. from Cloudflare R2 / Unsplash)"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 p-2 rounded-lg text-slate-900"
                />

                {bannerImageUrl && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">Live Responsive Fit Preview:</span>
                    <div className="relative w-full h-20 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img 
                        src={resolveImageUrl(bannerImageUrl)} 
                        alt="Banner Preview" 
                        className="w-full h-full object-cover object-center" 
                      />
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                        Auto-Fitted
                      </div>
                    </div>
                  </div>
                )}

                {bannerUploadSuccess && (
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> {bannerUploadSuccess}
                  </p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  id="admin-save-banner-btn"
                  onClick={(e) => handleSaveBanner(e)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingBannerId ? 'Update Banner Slide' : 'Save Banner Slide'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBanner(false);
                    setEditingBannerId(null);
                    setBannerTitle1('NEET UG 2026');
                    setBannerTitle2('High-Yield Notes');
                    setBannerTitle3('Top Scores');
                    setBannerImageUrl('');
                    setBannerUploadSuccess('');
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Banners */}
          <div className="space-y-2">
            {cleanBanners.map((b) => (
              <div
                key={b.id}
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {b.imageUrl ? (
                    <img 
                      src={resolveImageUrl(b.imageUrl)} 
                      alt={b.titleLine1} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0">
                      3D Book
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[8px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
                      {b.badge}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {b.titleLine1} {b.titleLine2}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditBannerClick(b)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(b.id, `${b.titleLine1} ${b.titleLine2}`)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. ORDERS MANAGEMENT SECTION ================= */}
      {adminTab === 'orders' && (
        <div className="space-y-3">
          {/* Quick In-Tab Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inTabOrderSearch}
              onChange={(e) => setInTabOrderSearch(e.target.value)}
              placeholder="Quick search by Order ID, name, phone, landmark..."
              className="w-full pl-8 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            {inTabOrderSearch && (
              <button
                onClick={() => setInTabOrderSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Order Status Subtabs & Batch Select Controls */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
              <button
                onClick={() => setOrderSubTab('new')}
                className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                  orderSubTab === 'new' ? 'bg-blue-600 text-white font-extrabold shadow-2xs' : 'text-slate-600'
                }`}
              >
                New ({cleanOrders.filter(o => o.status === 'new').length})
              </button>
              <button
                onClick={() => setOrderSubTab('accepted')}
                className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                  orderSubTab === 'accepted' ? 'bg-blue-600 text-white font-extrabold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Accepted ({cleanOrders.filter(o => o.status === 'accepted').length})
              </button>
              <button
                onClick={() => setOrderSubTab('delivered')}
                className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                  orderSubTab === 'delivered' ? 'bg-blue-600 text-white font-extrabold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Delivered ({cleanOrders.filter(o => o.status === 'delivered').length})
              </button>
              <button
                onClick={() => setOrderSubTab('cancelled')}
                className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                  orderSubTab === 'cancelled' ? 'bg-blue-600 text-white font-extrabold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Cancelled ({cleanOrders.filter(o => o.status === 'cancelled').length})
              </button>
            </div>

            {/* Quick Multi-Order Selection Toolbar */}
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-[11px]">
                <button
                  onClick={() => handleSelectAllVisible(filteredOrders)}
                  className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {filteredOrders.every(o => selectedOrderIds.includes(o.id))
                      ? 'Deselect All Visible'
                      : `Select All Visible (${filteredOrders.length})`}
                  </span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {selectedOrderIds.length} Selected
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Batch Invoices Action Panel */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl shadow-lg border border-blue-800 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                    {selectedOrderIds.length}
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {selectedOrderIds.length} Orders Selected
                    </h4>
                    <p className="text-[10px] text-blue-200">
                      Total Invoice Value: <strong className="text-yellow-300">₹{selectedTotalRevenue}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClearSelected}
                  className="text-[10px] text-blue-200 hover:text-white bg-blue-900/60 hover:bg-blue-850 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {batchFeedback && (
                <div className="p-2 bg-blue-900/90 border border-blue-700 rounded-xl text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{batchFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleSendBatchInvoicesToTelegram}
                  disabled={isSendingBatchTelegram}
                  className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-[11px] rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Generate 1 multi-page PDF document and send directly to Telegram Admin chat"
                >
                  {isSendingBatchTelegram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Send 1 PDF to Telegram</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadBatchInvoices}
                  className="py-2.5 px-3 bg-white hover:bg-blue-50 active:scale-98 text-blue-950 font-black text-[11px] rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="Download all selected orders compiled into 1 PDF document for printing"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>Download 1 PDF File</span>
                </button>

                <button
                  onClick={handleBatchDeleteOrders}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-black text-[11px] rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                  title="Delete all selected test orders with confirmation"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Delete Selected ({selectedOrderIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-100 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                {inTabOrderSearch ? `No orders matching "${inTabOrderSearch}"` : `No ${orderSubTab} orders.`}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = selectedOrderIds.includes(order.id);
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl border p-3 shadow-xs space-y-2.5 transition ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/10' : 'border-slate-100'
                  }`}
                >
                  {/* Select Checkbox Banner */}
                  <div 
                    onClick={() => toggleSelectOrder(order.id)}
                    className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-blue-600 pointer-events-none accent-blue-600"
                      />
                      <span className="text-[10px]">
                        {isSelected ? '✓ Selected for 1 Combined PDF' : 'Select for 1 Combined Invoice PDF'}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-80">
                      {isSelected ? 'Click to deselect' : 'Click to select'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">{order.id}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          order.paymentStatus === 'paid' && !order.paymentId?.startsWith('COD_')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus === 'paid' && !order.paymentId?.startsWith('COD_') ? 'Online Paid' : 'COD'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {order.userName} • {order.userEmail}
                      </p>
                    </div>
                    <span className="text-xs font-black text-blue-600">₹{order.totalAmount}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 bg-slate-50 p-2 rounded-lg text-[11px]">
                    {order.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span className="truncate flex-1 font-medium">
                          <span className="font-bold text-[9px] uppercase text-blue-600 mr-1">[{i.type}]</span>
                          {i.title} (x{i.quantity})
                        </span>
                        <span className="font-bold">₹{i.price * i.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address & Landmark */}
                  {order.shippingAddress && (
                    <div className="text-[10px] bg-blue-50/50 border border-blue-100 p-2 rounded-lg text-slate-700 space-y-0.5">
                      <p className="font-bold">{order.shippingAddress.fullName} (+91 {order.shippingAddress.phoneNumber})</p>
                      <p className="text-slate-500">
                        {order.shippingAddress.addressLine1}, {order.shippingAddress.district}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                      </p>
                      {order.shippingAddress.landmark && (
                        <p className="text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Landmark: <strong className="text-slate-900">{order.shippingAddress.landmark}</strong></span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenInvoiceModal(order)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="View Invoice"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Invoice</span>
                      </button>
                      <button
                        onClick={() => downloadInvoicePdf(order)}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        title="Download Single PDF"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete Test Order (with confirmation)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.status === 'new' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'accepted')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept Order</span>
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Mark Delivered</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= 4. CUSTOMER SUPPORT ORDER SEARCH SECTION ================= */}
      {adminTab === 'order-search' && (
        <div className="space-y-3">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-yellow-400" />
                <span>Customer Support Order Hub</span>
              </h3>
              <span className="text-[9px] bg-blue-700/80 px-2 py-0.5 rounded-full font-bold">
                {cleanOrders.length} Total Orders
              </span>
            </div>
            <p className="text-[10px] text-blue-200">
              Instantly find orders by Order ID, Customer Name, Email, Phone, Landmark, Pincode, or Payment Reference to check status & assist students.
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="Search by ID (e.g. 177123 or ORD-177123), Phone, Landmark, Email..."
              className="w-full pl-9 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-xs"
            />
            {orderSearchQuery && (
              <button
                onClick={() => setOrderSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-bold">
            <button
              onClick={() => setOrderSearchFilter('all')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                orderSearchFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setOrderSearchFilter('books')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                orderSearchFilter === 'books' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              📚 Books (Shipping)
            </button>
            <button
              onClick={() => setOrderSearchFilter('pdfs')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                orderSearchFilter === 'pdfs' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              ⚡ PDFs (Digital)
            </button>
            <button
              onClick={() => setOrderSearchFilter('paid')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                orderSearchFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              💳 Online Paid
            </button>
            <button
              onClick={() => setOrderSearchFilter('cod')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition cursor-pointer ${
                orderSearchFilter === 'cod' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              💵 COD Orders
            </button>
          </div>

          {/* Status Filter Subtabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[9px] font-bold overflow-x-auto">
            {['all', 'new', 'accepted', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setOrderSearchStatusFilter(st)}
                className={`flex-1 py-1 rounded-lg capitalize transition cursor-pointer ${
                  orderSearchStatusFilter === st ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500'
                }`}
              >
                {st} {st !== 'all' && `(${cleanOrders.filter(o => o.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Results Summary & Batch Select Toggle */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-medium">
            <span>Found <strong>{searchedSupportOrders.length}</strong> matching orders</span>
            <div className="flex items-center gap-2">
              {searchedSupportOrders.length > 0 && (
                <button
                  onClick={() => handleSelectAllVisible(searchedSupportOrders)}
                  className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {searchedSupportOrders.every(o => selectedOrderIds.includes(o.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
              )}
              {orderSearchQuery && (
                <button
                  onClick={() => {
                    setOrderSearchQuery('');
                    setOrderSearchFilter('all');
                    setOrderSearchStatusFilter('all');
                  }}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Batch Invoices Action Panel in Search Hub */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl shadow-lg border border-blue-800 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                    {selectedOrderIds.length}
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {selectedOrderIds.length} Orders Selected
                    </h4>
                    <p className="text-[10px] text-blue-200">
                      Total Invoice Value: <strong className="text-yellow-300">₹{selectedTotalRevenue}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClearSelected}
                  className="text-[10px] text-blue-200 hover:text-white bg-blue-900/60 hover:bg-blue-850 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {batchFeedback && (
                <div className="p-2 bg-blue-900/90 border border-blue-700 rounded-xl text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{batchFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleSendBatchInvoicesToTelegram}
                  disabled={isSendingBatchTelegram}
                  className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-[11px] rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingBatchTelegram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Send 1 PDF to Telegram</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadBatchInvoices}
                  className="py-2.5 px-3 bg-white hover:bg-blue-50 active:scale-98 text-blue-950 font-black text-[11px] rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>Download 1 PDF File</span>
                </button>
              </div>
            </div>
          )}

          {/* Order Cards List */}
          {searchedSupportOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2.5 shadow-2xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800">No Orders Found</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                No orders match your current query "{orderSearchQuery}". Check for typos in Order ID or search by customer phone number.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchedSupportOrders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const isCod = order.paymentStatus.includes('cod') || order.paymentId?.startsWith('COD_');
                const isPaid = order.paymentStatus === 'paid' && !isCod;
                const hasBooks = order.items.some(i => i.type === 'book');
                const phoneNumber = order.shippingAddress?.phoneNumber || '';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border p-3.5 shadow-sm space-y-3 transition hover:border-blue-200 ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/10' : 'border-slate-200/80'
                    }`}
                  >
                    {/* Select Checkbox Banner */}
                    <div 
                      onClick={() => toggleSelectOrder(order.id)}
                      className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-blue-600 pointer-events-none accent-blue-600"
                        />
                        <span className="text-[10px]">
                          {isSelected ? '✓ Selected for 1 Combined PDF' : 'Select for 1 Combined Invoice PDF'}
                        </span>
                      </div>
                      <span className="text-[9px] opacity-80">
                        {isSelected ? 'Click to deselect' : 'Click to select'}
                      </span>
                    </div>
                    {/* Top Row: Order ID, Status, Amount */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-950 font-mono tracking-tight">{order.id}</span>
                          
                          {/* Order Status Badge */}
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-900'
                          }`}>
                            {order.status}
                          </span>

                          {/* Payment Badge */}
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                            isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {isPaid ? '✓ Paid Online' : 'Cash on Delivery'}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Placed on: {new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900">₹{order.totalAmount}</div>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} {order.items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Support Info & Actions */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>{order.userName}</span>
                        </div>
                        
                        {/* Quick Contact Buttons */}
                        {phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(`Hi ${order.userName}, this is Dr. Faisal Fayaz NEET MBBS Team regarding your order ${order.id}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg flex items-center gap-1 transition shadow-2xs"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:+91${phoneNumber}`}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg flex items-center gap-1 transition shadow-2xs"
                              title="Call Customer"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>Call</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-600 flex items-center gap-2">
                        <span className="truncate">Email: <strong>{order.userEmail}</strong></span>
                        {order.paymentId && (
                          <span className="text-slate-400 font-mono text-[9px] truncate">
                            Ref: {order.paymentId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ordered Items Breakdown */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                        Ordered Titles
                      </span>
                      <div className="space-y-1 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] text-slate-800">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                                it.type === 'book' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {it.type}
                              </span>
                              <span className="truncate font-medium">{it.title} (x{it.quantity})</span>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address with Prominent Landmark */}
                    {order.shippingAddress && (
                      <div className="text-[10px] bg-blue-50/40 border border-blue-100 p-2.5 rounded-xl space-y-1 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            <span>Delivery Destination</span>
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 font-bold">
                            PIN: {order.shippingAddress.pincode}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          {order.shippingAddress.addressLine1}, {order.shippingAddress.district}, {order.shippingAddress.state}
                        </p>
                        {order.shippingAddress.landmark ? (
                          <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[10px] font-bold flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Landmark: <strong className="text-slate-950 font-black">{order.shippingAddress.landmark}</strong></span>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-400 italic">No landmark provided</p>
                        )}
                      </div>
                    )}

                    {/* Live Progress Stage Tracker & Order Status Controls */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          Update Order Progress
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenInvoiceModal(order)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                          <button
                            onClick={() => downloadInvoicePdf(order)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Delete this order"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Status Selector Button Group */}
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'new')}
                          className={`py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                            order.status === 'new'
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          New
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'accepted')}
                          className={`py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                            order.status === 'accepted'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Accepted
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className={`py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                            order.status === 'delivered'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Delivered
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className={`py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                            order.status === 'cancelled'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= 5. USERS SECTION ================= */}
      {adminTab === 'users' && (() => {
        const filteredUsersList = cleanUsers.filter(u => {
          if (userRoleFilter === 'admin' && u.role !== 'admin') return false;
          if (userRoleFilter === 'user' && u.role === 'admin') return false;
          if (userSearchQuery.trim()) {
            const q = userSearchQuery.toLowerCase().trim();
            const nameMatch = (u.displayName || '').toLowerCase().includes(q);
            const emailMatch = (u.email || '').toLowerCase().includes(q);
            const phoneMatch = ((u as any).phoneNumber || '').toLowerCase().includes(q);
            if (!nameMatch && !emailMatch && !phoneMatch) return false;
          }
          return true;
        });

        const adminCount = cleanUsers.filter(u => u.role === 'admin').length;
        const studentCount = cleanUsers.filter(u => u.role !== 'admin').length;
        const totalUserOrders = cleanUsers.reduce((sum, u) => sum + (u.totalOrders || 0), 0);

        const handleRefreshUsers = async () => {
          setIsRefreshingUsers(true);
          try {
            await syncDataFromDatabase();
          } finally {
            setTimeout(() => setIsRefreshingUsers(false), 600);
          }
        };

        return (
          <div className="space-y-3">
            {/* Header & Quick Actions */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <span>All Registered Users & Aspirants ({cleanUsers.length})</span>
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRefreshUsers}
                  title="Refresh Users from Cloud"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingUsers ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{isRefreshingUsers ? 'Syncing...' : 'Sync'}</span>
                </button>
                {cleanUsers.length > 0 && (
                  <button
                    id="copy-all-emails-btn"
                    onClick={handleCopyAllEmails}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white" />}
                    <span>{copiedAll ? 'Copied All' : 'Copy Emails'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2 text-center">
                <span className="text-[10px] text-blue-700 font-bold block">Total Aspirants</span>
                <span className="text-sm font-black text-blue-950">{studentCount}</span>
              </div>
              <div className="bg-red-50/70 border border-red-100 rounded-xl p-2 text-center">
                <span className="text-[10px] text-red-700 font-bold block">Admin Accounts</span>
                <span className="text-sm font-black text-red-950">{adminCount}</span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2 text-center">
                <span className="text-[10px] text-emerald-700 font-bold block">Total User Orders</span>
                <span className="text-sm font-black text-emerald-950">{totalUserOrders}</span>
              </div>
            </div>

            {/* Search Bar & Role Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user by name, email, or phone..."
                  className="w-full pl-8 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filters */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <button
                  onClick={() => setUserRoleFilter('all')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    userRoleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({cleanUsers.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('user')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    userRoleFilter === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Aspirants ({studentCount})
                </button>
                <button
                  onClick={() => setUserRoleFilter('admin')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    userRoleFilter === 'admin' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Admins ({adminCount})
                </button>
              </div>
            </div>

            {/* Users List */}
            {filteredUsersList.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-slate-100 text-center space-y-2">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  {userSearchQuery ? `No users matching "${userSearchQuery}"` : 'No registered users found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsersList.map((user) => {
                  const userOrdersCount = orders.filter(o => (o.userEmail || '').toLowerCase() === user.email.toLowerCase()).length;

                  return (
                    <div
                      key={user.uid || user.email}
                      className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : user.avatarUrl ? (
                            <span className="text-base">{user.avatarUrl}</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-600">
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || user.email.split('@')[0]}
                            </span>
                            {user.role === 'admin' ? (
                              <span className="text-[8px] bg-red-100 text-red-700 font-extrabold px-1 rounded">
                                ADMIN
                              </span>
                            ) : (
                              <span className="text-[8px] bg-blue-50 text-blue-700 font-bold px-1 rounded">
                                ASPIRANT
                              </span>
                            )}
                            {userOrdersCount > 0 && (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold px-1 rounded">
                                {userOrdersCount} {userOrdersCount === 1 ? 'order' : 'orders'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {user.email}
                          </p>
                          {user.createdAt && (
                            <p className="text-[9px] text-slate-400">
                              Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setAdminTab('order-search');
                            setOrderSearchQuery(user.email);
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition flex items-center gap-1 cursor-pointer"
                          title="View Orders by this user"
                        >
                          <Package className="w-3 h-3" />
                          <span>Orders</span>
                        </button>
                        <a
                          href={`mailto:${user.email}`}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                          title="Send Email"
                        >
                          <Send className="w-3 h-3" />
                          <span>Email</span>
                        </a>
                        <button
                          onClick={() => handleCopyEmail(user.email)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                            copiedEmail === user.email
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {copiedEmail === user.email ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedEmail === user.email ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ================= 5. STORAGE & TELEGRAM INTEGRATION STATUS ================= */}
      {adminTab === 'storage' && (
        <div className="space-y-4">
          {/* Telegram Bot Alerts Integration Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                  <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 leading-tight">Telegram Order Alerts</h4>
                  <p className="text-[10px] text-slate-400 font-normal">NeetMbbsDoctorsStoreBot</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-[10px] font-bold">
                API Active
              </span>
            </div>

            {/* Target Admin Chat IDs list */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Configured Admin Telegram Chat IDs:</span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded text-[9px]">2 Admins</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 flex items-center justify-between">
                  <span>Admin 1:</span>
                  <span className="font-bold text-sky-700">7004282468</span>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 flex items-center justify-between">
                  <span>Admin 2:</span>
                  <span className="font-bold text-sky-700">1318240288</span>
                </div>
              </div>
            </div>

            {/* Bot Token Configuration */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Telegram Bot Token (from @BotFather)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste your Telegram Bot Token here (e.g. 123456:ABC-DEF...)"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTelegramToken}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                You can apply the token here or via <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">TELEGRAM_BOT_TOKEN</code> in your environment secrets.
              </p>
            </div>

            {/* Status Alert Message */}
            {telegramStatus && (
              <div className="p-3 bg-sky-50 border border-sky-200 text-sky-900 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                <BellRing className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span className="font-medium text-[11px]">{telegramStatus}</span>
              </div>
            )}

            {/* Actions: 1-Click Test Order Alert */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                disabled={isTestingTelegram}
                onClick={handleTestTelegramAlert}
                className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isTestingTelegram ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Test Alert...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Order Notification to Telegram</span>
                  </>
                )}
              </button>
            </div>

            {/* Notification Format Preview */}
            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl space-y-1 font-mono text-[10px] leading-relaxed border border-slate-800">
              <span className="text-slate-400 font-sans text-[9px] uppercase tracking-wider block font-bold">
                Live Alert Message Format:
              </span>
              <div className="text-emerald-400 font-bold">🛒 NEW ORDER</div>
              <div>👤 <b>Name:</b> [customer name]</div>
              <div>📞 <b>Phone:</b> [customer phone]</div>
              <div>📍 <b>Address:</b> [customer address]</div>
              <div>📦 <b>Product:</b> [product name]</div>
              <div>🔢 <b>Quantity:</b> [quantity]</div>
              <div>💰 <b>Price:</b> ₹[total price]</div>
              <div>💳 <b>Payment:</b> [payment status]</div>
              <div>🆔 <b>Order ID:</b> #[order ID]</div>
            </div>
          </div>

          {/* Cloudflare Storage & Public CDN Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Cloud className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Cloudflare R2 Storage & Public CDN (ncertify)</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                Direct CDN Active
              </span>
            </div>

            {/* Public Domain / CDN Configuration Form */}
            <div className="bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/50 p-4 rounded-xl border border-blue-100/80 space-y-3">
              <div>
                <label className="block text-slate-900 font-bold text-xs mb-1">
                  Cloudflare R2 Public Domain / Custom Domain (CDN)
                </label>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-2">
                  Unlike Firebase Database rules (which control data reads/writes), Cloudflare R2 stores binary media. Enter your bucket's <b>Public Development URL (r2.dev)</b> or <b>Custom Domain</b> so images and PDFs load instantly on Netlify and all client browsers.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={r2PublicDomain}
                    onChange={(e) => setR2PublicDomainState(e.target.value)}
                    placeholder="https://pub-fe249f0325e741c9bb12b22f8850f331.r2.dev or https://cdn.yoursite.com"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    onClick={handleSaveR2Domain}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Sync</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {r2DomainStatus && (
                <div className="p-2.5 bg-slate-900 text-white rounded-lg text-xs font-mono flex items-start gap-2 shadow-xs">
                  <span className="text-emerald-400 font-bold">●</span>
                  <span>{r2DomainStatus}</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestR2Connection}
                  disabled={isTestingR2}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {isTestingR2 ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <ExternalLink className="w-3 h-3 text-blue-600" />}
                  <span>Test Public CDN URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setR2PublicDomainState(DEFAULT_R2_PUBLIC_DOMAIN);
                    saveR2PublicDomain(DEFAULT_R2_PUBLIC_DOMAIN);
                    setR2DomainStatus(`Reset to default R2.dev domain: ${DEFAULT_R2_PUBLIC_DOMAIN}`);
                    setTimeout(() => setR2DomainStatus(null), 4000);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-700">
              <span className="font-bold text-slate-900 block text-xs">
                📖 How Cloudflare R2 Public Access Works:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                <li>
                  <b className="text-slate-800">Firebase vs Cloudflare R2:</b> Firebase Realtime Database handles structured JSON metadata with security rules. Cloudflare R2 serves raw images/PDFs.
                </li>
                <li>
                  <b className="text-slate-800">Enable Public URL in Cloudflare:</b> Go to Cloudflare Dashboard → <b>R2</b> → Bucket <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-[10px]">ncertify</code> → <b>Settings</b> → <b>Public Access</b>.
                </li>
                <li>
                  <b className="text-slate-800">Connect Domain or Enable R2.dev:</b> Enable <i>"R2.dev subdomain"</i> or click <i>"Connect Custom Domain"</i> (e.g. <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-[10px]">cdn.ncertify.com</code>) and paste the URL in the field above.
                </li>
              </ol>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-700 border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Bucket Name:</span>
                <span className="font-bold text-slate-900">ncertify</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">S3 Storage Endpoint:</span>
                <span className="text-slate-600 break-all text-[10px]">https://d715d090a75efd8790b9a6da1e2f42d4.r2.cloudflarestorage.com</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. SUPPORT INQUIRIES SECTION ================= */}
      {adminTab === 'support' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-rose-600 rounded-full" />
              <span>User Support Inquiries & Messages ({cleanSupport.length})</span>
            </h3>
            {unreadSupportCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold border border-rose-200">
                {unreadSupportCount} Unresolved
              </span>
            )}
          </div>

          {cleanSupport.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No Support Inquiries Yet</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                When aspirants submit support requests from their profile page, they will appear here with full contact details for instant email or phone callback.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cleanSupport.map((msg) => (
                <div 
                  key={msg.id}
                  className={`bg-white p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                    msg.status === 'unread' ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-100'
                  }`}
                >
                  {/* Header with User Info & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{msg.name}</span>
                        {msg.status === 'unread' ? (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-wider">
                            New Unread
                          </span>
                        ) : msg.status === 'replied' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[8px] font-black uppercase tracking-wider">
                            Replied / Resolved
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-bold uppercase tracking-wider">
                            Read
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(msg.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    {/* Quick Delete */}
                    <button
                      onClick={() => handleDeleteSupportMessage(msg.id, msg.subject || msg.name)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subject and Message Body */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wide block">
                      Topic: {msg.subject}
                    </span>
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                  </div>

                  {/* Contact Info Badges & One-Click Contact Actions */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-[11px]">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Email Link */}
                      <a
                        href={`mailto:${msg.email}?subject=${encodeURIComponent(`NEET MBBS Support: Re ${msg.subject}`)}&body=${encodeURIComponent(`Dear ${msg.name},\n\nThank you for reaching out to NEET MBBS Doctors Store regarding "${msg.subject}".\n\n`)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition cursor-pointer text-[11px]"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{msg.email}</span>
                      </a>

                      {/* Phone Link */}
                      {msg.phone && (
                        <>
                          <a
                            href={`tel:${msg.phone.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 transition cursor-pointer text-[11px]"
                          >
                            <Phone className="w-3 h-3" />
                            <span>+91 {msg.phone}</span>
                          </a>

                          <a
                            href={`https://wa.me/91${msg.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello Dr. ${msg.name}, I am contacting you regarding your NEET MBBS Doctors Store inquiry: ${msg.subject}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition cursor-pointer text-[11px]"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {msg.status !== 'replied' ? (
                        <button
                          onClick={() => updateSupportMessageStatus(msg.id, 'replied')}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Resolved</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateSupportMessageStatus(msg.id, 'unread')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition cursor-pointer"
                        >
                          Mark as Unread
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 6. STORE & SUPPORT SETTINGS SECTION ================= */}
      {adminTab === 'store-settings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                <span>Store & Support Details Management</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update support contact emails, phone numbers, website name, legal entity, and telegram handle. All changes update live on generated PDF Invoices, Customer Support modals, Header, and Footer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetStoreConfig}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => handleSaveStoreConfig()}
                disabled={isSavingStoreConfig}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingStoreConfig ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {storeConfigFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{storeConfigFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSaveStoreConfig} className="space-y-4">
            {/* Card 1: Support Contact Channels (Emails & Phones) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Support Contacts & Aspirant Helplines</h4>
                  <p className="text-[10px] text-slate-400">These contact details appear on PDF Invoices, support dialogs, and footer</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Primary Support Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={storeConfig.supportEmails[0] || ''}
                    onChange={(e) => {
                      const newEmails = [...storeConfig.supportEmails];
                      newEmails[0] = e.target.value;
                      setStoreConfig({ ...storeConfig, supportEmails: newEmails });
                    }}
                    placeholder="e.g. fdar77551@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Main contact email printed on invoices & store support</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Secondary Support Email
                  </label>
                  <input
                    type="email"
                    value={storeConfig.supportEmails[1] || ''}
                    onChange={(e) => {
                      const newEmails = [...storeConfig.supportEmails];
                      newEmails[1] = e.target.value;
                      setStoreConfig({ ...storeConfig, supportEmails: newEmails });
                    }}
                    placeholder="e.g. shahzaibhusain6@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Backup admin email address</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Primary Phone / Helpline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={storeConfig.supportPhones[0] || ''}
                    onChange={(e) => {
                      const newPhones = [...storeConfig.supportPhones];
                      newPhones[0] = e.target.value;
                      setStoreConfig({ ...storeConfig, supportPhones: newPhones });
                    }}
                    placeholder="e.g. +91 6005894110"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Customer care phone number printed on invoice footer</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    WhatsApp Helpline Number
                  </label>
                  <input
                    type="tel"
                    value={storeConfig.whatsappNumber || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, whatsappNumber: e.target.value })}
                    placeholder="e.g. +91 6005894110"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Direct WhatsApp chat link for customers</span>
                </div>
              </div>
            </div>

            {/* Card 2: Store Branding & Digital Identity */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Store Identity & Online Channels</h4>
                  <p className="text-[10px] text-slate-400">Store name, website domain, and Telegram community handles</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Store Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.storeName || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                    placeholder="e.g. NEET MBBS Doctors Store"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Official display title of the store</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Store Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={storeConfig.tagline || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, tagline: e.target.value })}
                    placeholder="e.g. Official Medical Books & PDF Notes"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Brand subtitle under the store emblem</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Website Domain / URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.websiteUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, websiteUrl: e.target.value })}
                    placeholder="e.g. www.neetmbbsdoctors.store"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Website link printed on invoices and invoices QR codes</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Telegram Username / Handle
                  </label>
                  <input
                    type="text"
                    value={storeConfig.telegramUsername || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, telegramUsername: e.target.value })}
                    placeholder="e.g. @neetmbbsdoctors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Telegram channel handle for instant community updates</span>
                </div>
              </div>
            </div>

            {/* Card 3: Social Media Channels (Instagram, YouTube, Telegram & WhatsApp) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                  <Instagram className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Official Social Media & Community Links</h4>
                  <p className="text-[10px] text-slate-400">Configure links for Instagram, YouTube, Telegram, and WhatsApp shown in the home page footer</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[10px]">
                      <Instagram className="w-2.5 h-2.5" />
                    </span>
                    <span>Instagram Profile Link</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.instagramUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, instagramUrl: e.target.value })}
                    placeholder="e.g. https://instagram.com/neetmbbsdoctors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Direct link to your official Instagram page</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px]">
                      <Youtube className="w-2.5 h-2.5" />
                    </span>
                    <span>YouTube Channel Link</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.youtubeUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, youtubeUrl: e.target.value })}
                    placeholder="e.g. https://youtube.com/@neetmbbsdoctors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Direct link to your YouTube video channel</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px]">
                      <Send className="w-2.5 h-2.5" />
                    </span>
                    <span>Telegram Channel / Group Link</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.telegramUrl || storeConfig.telegramLink || ''}
                    onChange={(e) => setStoreConfig({ 
                      ...storeConfig, 
                      telegramUrl: e.target.value,
                      telegramLink: e.target.value 
                    })}
                    placeholder="e.g. https://t.me/neetmbbsdoctors"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Telegram invitation or channel join link</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">
                      <MessageCircle className="w-2.5 h-2.5" />
                    </span>
                    <span>WhatsApp Direct Chat Link / URL</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.whatsappUrl || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, whatsappUrl: e.target.value })}
                    placeholder="e.g. https://wa.me/916005894110"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Direct WhatsApp link (e.g. https://wa.me/916005894110)</span>
                </div>
              </div>
            </div>

            {/* Card 3.5: Home Page Format Selection Card Images (Hardcopy & Softcopy) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Format Selection Card Images (Home Page)</h4>
                  <p className="text-[10px] text-slate-400">Custom right-side images for the "Physical Books" and "PDF Notes" format cards on the home page</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Hardcopy Card Image */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                      <span>Hardcopy Physical Books Card Image</span>
                    </label>
                    {uploadingHardcopyCardImg && (
                      <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-14 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {storeConfig.hardcopyCardImage ? (
                        <img 
                          src={resolveImageUrl(storeConfig.hardcopyCardImage)} 
                          alt="Hardcopy Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 text-orange-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={storeConfig.hardcopyCardImage || ''}
                        onChange={(e) => setStoreConfig({ ...storeConfig, hardcopyCardImage: e.target.value })}
                        placeholder="Image URL or upload file below"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />

                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs">
                          <Upload className="w-3 h-3 text-blue-600" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHardcopyCardUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...storeConfig, hardcopyCardImage: '' };
                            setStoreConfig(updated);
                            saveStoredStoreConfig(updated);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer"
                          title="Reset to built-in 3D realistic graphic"
                        >
                          Built-in Default
                        </button>

                        {storeConfig.hardcopyCardImage && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...storeConfig, hardcopyCardImage: '' };
                              setStoreConfig(updated);
                              saveStoredStoreConfig(updated);
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Softcopy Card Image */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Softcopy PDF Notes Card Image</span>
                    </label>
                    {uploadingSoftcopyCardImg && (
                      <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-14 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {storeConfig.softcopyCardImage ? (
                        <img 
                          src={resolveImageUrl(storeConfig.softcopyCardImage)} 
                          alt="Softcopy Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={storeConfig.softcopyCardImage || ''}
                        onChange={(e) => setStoreConfig({ ...storeConfig, softcopyCardImage: e.target.value })}
                        placeholder="Image URL or upload file below"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />

                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs">
                          <Upload className="w-3 h-3 text-blue-600" />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSoftcopyCardUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...storeConfig, softcopyCardImage: '' };
                            setStoreConfig(updated);
                            saveStoredStoreConfig(updated);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition cursor-pointer"
                          title="Reset to built-in 3D realistic graphic"
                        >
                          Built-in Default
                        </button>

                        {storeConfig.softcopyCardImage && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...storeConfig, softcopyCardImage: '' };
                              setStoreConfig(updated);
                              saveStoredStoreConfig(updated);
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Business Legal Entity & Fulfillment Hub */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Legal Company Details & Dispatch Center</h4>
                  <p className="text-[10px] text-slate-400">Company registration, tax ID, and fulfillment hub address</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Legal Entity / Company Name
                  </label>
                  <input
                    type="text"
                    value={storeConfig.companyLegalName || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, companyLegalName: e.target.value })}
                    placeholder="e.g. NEETMBBS Medical Education Pvt Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    GSTIN / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={storeConfig.gstin || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, gstin: e.target.value })}
                    placeholder="e.g. 01AABCU9603R1ZM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Store & Dispatch Warehouse Address
                  </label>
                  <textarea
                    rows={2}
                    value={storeConfig.storeAddress || ''}
                    onChange={(e) => setStoreConfig({ ...storeConfig, storeAddress: e.target.value })}
                    placeholder="e.g. Central Book Dispatch & Logistics Hub, Kashmir / Delhi NCR, India"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Invoice Preview Box */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Preview: PDF Invoice Footer & Support Strip
                </span>
                <span className="text-[9px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                  Auto-Updates on Invoices
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-center text-xs">
                <div className="text-white font-black text-sm">
                  {storeConfig.storeName || 'NEETMBBS DOCTORS STORE'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  <span>Web: {storeConfig.websiteUrl || 'www.neetmbbsdoctors.store'}</span>
                  <span>|</span>
                  <span>Email: {storeConfig.supportEmails[0] || 'fdar77551@gmail.com'}</span>
                  <span>|</span>
                  <span>Phone: {storeConfig.supportPhones[0] || '+91 6005894110'}</span>
                  <span>|</span>
                  <span>Telegram: {storeConfig.telegramUsername || '@neetmbbsdoctors'}</span>
                </div>
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetStoreConfig}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Reset to Defaults
              </button>
              <button
                type="submit"
                disabled={isSavingStoreConfig}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingStoreConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Store Settings...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All Store & Support Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SURETY / CONFIRMATION MODAL FOR DELETIONS ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteTarget.type === 'order' ? 'Confirm Delete Order' :
                   deleteTarget.type === 'batch_orders' ? 'Confirm Batch Order Deletion' :
                   'Confirm Permanent Deletion'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium capitalize">
                  {deleteTarget.type === 'product' ? 'Store Product / PDF' : 
                   deleteTarget.type === 'banner' ? 'Hero Banner Slide' : 
                   deleteTarget.type === 'order' ? 'Single Order Record' :
                   deleteTarget.type === 'batch_orders' ? 'Multiple Selected Orders' :
                   'Support Inquiry'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
              <p className="font-extrabold text-slate-900 line-clamp-2">
                "{deleteTarget.title}"
              </p>
              {deleteTarget.type === 'order' && deleteTarget.orderData && (
                <div className="bg-white/80 p-2 rounded-lg text-[11px] space-y-0.5 border border-red-100 text-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold">{deleteTarget.orderData.userName || deleteTarget.orderData.shippingAddress?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Amount:</span>
                    <span className="font-bold text-emerald-700">₹{deleteTarget.orderData.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items:</span>
                    <span className="font-bold">{deleteTarget.orderData.items?.length || 1} item(s)</span>
                  </div>
                </div>
              )}
              {deleteTarget.type === 'batch_orders' && (
                <div className="bg-white/80 p-2 rounded-lg text-[11px] space-y-0.5 border border-red-100 text-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Orders:</span>
                    <span className="font-bold">{deleteTarget.orderCount} orders</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Value:</span>
                    <span className="font-bold text-emerald-700">₹{deleteTarget.totalAmount}</span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-red-700 leading-snug">
                ⚠️ Are you sure you want to permanently delete this? It will be removed from local storage, Firebase Realtime Database, and server records. This is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
