import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Download, 
  FileText, 
  Printer, 
  AlertCircle, 
  ChevronRight, 
  X, 
  MapPin, 
  CreditCard, 
  Banknote,
  ShieldCheck,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Phone,
  User,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Unlock,
  GraduationCap
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { 
  getStoredProducts, 
  getMyDeviceOrderIds, 
  sortOrdersNewestFirst, 
  syncDataFromDatabase,
  resolveImageUrl,
  deleteOrder
} from '../lib/storage';
import { downloadNotesPdf } from '../lib/pdfDownloader';
import { COURSE_ID, hasUserPurchasedFullCourse, fetchVerifiedCourseAccess } from '../lib/fullCourseData';

interface OrdersViewProps {
  orders: Order[];
  userEmail?: string | null;
  isAdmin?: boolean;
  onOpenPdfReader?: (pdfUrl: string, title: string) => void;
  onOpenPdf?: (pdfUrl: string, title: string) => void;
  onOpenInvoiceModal?: (order: Order) => void;
  onOpenInvoice?: (order: Order) => void;
  onExplore?: () => void;
  onExploreStore?: () => void;
  onOpenFullCourse?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  userEmail,
  isAdmin = false,
  onOpenPdfReader,
  onOpenPdf,
  onOpenInvoiceModal,
  onOpenInvoice,
  onExplore,
  onExploreStore,
  onOpenFullCourse
}) => {
  const [filter, setFilter] = useState<'all' | 'books' | 'pdfs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-sync remote orders on mount
  useEffect(() => {
    syncDataFromDatabase().catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncDataFromDatabase();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const id = orderToDelete.id;
      deleteOrder(id);
      
      // Backend deletion call
      try {
        await fetch(`/api/db/orders/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('Backend delete order notice:', err);
      }
      
      if (selectedOrderDetails?.id === id) {
        setSelectedOrderDetails(null);
      }
      setOrderToDelete(null);
      await syncDataFromDatabase();
    } catch (err) {
      console.error('Delete order error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getItemCoverImage = (item: any): string => {
    if (item?.coverImage && typeof item.coverImage === 'string' && item.coverImage.trim()) {
      return resolveImageUrl(item.coverImage);
    }
    try {
      const allProds = getStoredProducts();
      const match = allProds.find(p => 
        p.id === item?.productId || 
        p.id === item?.id || 
        p.title?.toLowerCase().trim() === (item?.title || '').toLowerCase().trim()
      );
      if (match?.coverImage) {
        return resolveImageUrl(match.coverImage);
      }
    } catch (e) {}
    return '';
  };

  const handleInvoiceClick = (order: Order) => {
    if (onOpenInvoiceModal) {
      onOpenInvoiceModal(order);
    } else if (onOpenInvoice) {
      onOpenInvoice(order);
    }
  };

  const handlePdfReadClick = (pdfUrl: string, title: string) => {
    if (onOpenPdfReader) {
      onOpenPdfReader(pdfUrl, title);
    } else if (onOpenPdf) {
      onOpenPdf(pdfUrl, title);
    }
  };

  const handleExploreClick = () => {
    if (onExplore) {
      onExplore();
    } else if (onExploreStore) {
      onExploreStore();
    }
  };

  // Extract Device/Session Order IDs
  const myDeviceOrderIds = useMemo(() => getMyDeviceOrderIds(), [orders]);

  // Order scoping: Admins see all store orders, students see their own placed orders
  const userOrders = useMemo(() => {
    const sorted = sortOrdersNewestFirst(orders);
    if (isAdmin) {
      return sorted;
    }

    const cleanUserEmail = userEmail?.toLowerCase().trim();

    const matched = sorted.filter(order => {
      // 1. Check if order was placed on this device / browser session
      const cleanOrderId = (order.id || '').trim();
      const numId = cleanOrderId.replace(/^ORD-/, '').replace(/^#/, '');
      if (
        myDeviceOrderIds.includes(cleanOrderId) ||
        myDeviceOrderIds.includes(numId) ||
        myDeviceOrderIds.includes(`ORD-${numId}`) ||
        myDeviceOrderIds.includes(`#${numId}`)
      ) {
        return true;
      }

      // 2. If logged in with email, match by userEmail / shippingAddress.email
      if (cleanUserEmail) {
        const orderEmail = (order.userEmail || '').toLowerCase().trim();
        if (orderEmail && orderEmail === cleanUserEmail) return true;

        if (order.userId && order.userId.toLowerCase().trim() === cleanUserEmail) return true;

        // Shipping address email if present
        const shippingEmail = ((order.shippingAddress as any)?.email || '').toLowerCase().trim();
        if (shippingEmail && shippingEmail === cleanUserEmail) return true;
      }

      return false;
    });

    return matched;
  }, [orders, userEmail, myDeviceOrderIds, isAdmin]);

  // Filter by Type & Search Query
  const filteredOrders = useMemo(() => {
    return userOrders.filter(order => {
      // Type filter
      if (filter === 'books' && !order.items.some(i => i.type === 'book')) return false;
      if (filter === 'pdfs' && !order.items.some(i => i.type === 'pdf')) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (order.id || '').toLowerCase().includes(q) || (order.invoiceNumber || '').toLowerCase().includes(q);
        const matchesTitle = order.items.some(i => (i.title || '').toLowerCase().includes(q));
        const matchesName = (order.shippingAddress?.fullName || order.userName || '').toLowerCase().includes(q);
        const matchesPhone = (order.shippingAddress?.phoneNumber || '').toLowerCase().includes(q);
        const matchesEmail = (order.userEmail || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesName && !matchesPhone && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [userOrders, filter, searchQuery]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" /> Placed
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <Truck className="w-2.5 h-2.5" /> Dispatched
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-2.5 h-2.5" /> Cancelled
          </span>
        );
    }
  };

  const getPdfUrlForItem = (item: any): string => {
    if (item.pdfUrl && item.pdfUrl.trim().length > 0) return item.pdfUrl;
    const allProds = getStoredProducts();
    const found = allProds.find(p => p.id === item.productId || p.title.toLowerCase() === (item.title || '').toLowerCase());
    return found?.pdfUrl || '';
  };

  const handleDownloadPdf = async (pdfUrl?: string, title?: string, productId?: string, orderId?: string) => {
    let resolvedUrl = pdfUrl;
    let author = 'Faisal Fayaz & Dr. Shahzaib Husain';
    let category = 'High-Yield Medical Notes';

    if (productId) {
      const allProds = getStoredProducts();
      const match = allProds.find(p => p.id === productId || p.title.toLowerCase() === (title || '').toLowerCase());
      if (match) {
        resolvedUrl = match.pdfUrl || resolvedUrl;
        author = match.author || author;
        category = match.category || category;
      }
    }

    try {
      await downloadNotesPdf({
        id: productId || 'NOTE',
        title: title || 'NEET MBBS Digital Notes',
        author,
        category,
        pdfUrl: resolvedUrl,
        orderId,
        userEmail: userEmail || undefined
      });
    } catch (e) {
      console.error('Download note error:', e);
    }
  };

  return (
    <div className="p-4 space-y-3.5 pb-28 max-w-md mx-auto animate-in fade-in duration-200">
      {/* Screen Title & Live Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span>My Orders & Library</span>
          </h1>
          <p className="text-[11px] text-slate-500">
            Real-time delivery tracking, GST invoices & instant PDF library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Refresh Orders"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>
      </div>

      {/* Search / Lookup Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Order ID, Book Title, or Phone..."
          className="w-full pl-8 pr-8 py-2 bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer text-[11px] ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({userOrders.length})
          </button>
          <button
            onClick={() => setFilter('books')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer text-[11px] ${
              filter === 'books'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📖 Physical Books
          </button>
          <button
            onClick={() => setFilter('pdfs')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer text-[11px] ${
              filter === 'pdfs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚡ PDF Purchases
          </button>
        </div>
      </div>

      {/* Enrolled NEET Full Course Card (VIP Digital Access) */}
      {hasUserPurchasedFullCourse(userEmail ? { uid: '', email: userEmail, displayName: '', role: 'user', createdAt: '' } : null, orders) && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-indigo-500/40 shadow-md relative overflow-hidden flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                VIP Enrolled
              </span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Status: Purchased
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white truncate">
              NEET (11th & 12th) Full Course
            </h3>
            <p className="text-[10px] text-slate-300 truncate">
              Class 11 + Class 12 Master Digital Study Material on Google Drive
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              const res = await fetchVerifiedCourseAccess(userEmail || undefined);
              if (res.success && res.accessUrl) {
                window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
              } else if (onOpenFullCourse) {
                onOpenFullCourse();
              }
            }}
            className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5 animate-pulse"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Access Course</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-7 border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              {searchQuery ? 'No Orders Match Your Search' : 'No Orders Found Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              {searchQuery 
                ? 'Try searching with a different order ID or book title.'
                : 'Explore our high-yield NEET physical books and verified topper PDF notes!'
              }
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={handleExploreClick}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Explore Store</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => {
            const firstItem = order.items[0];
            const extraItemsCount = order.items.length - 1;
            const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod');
            const cleanOrderId = order.id.startsWith('#') ? order.id : `#${order.id}`;

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                onClick={() => setSelectedOrderDetails(order)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-xs p-3 transition active:scale-[0.99] cursor-pointer space-y-2.5"
              >
                {/* Header Row: ID + Date + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-black text-slate-900">{cleanOrderId}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium text-[10px]">
                      {new Date(order.orderDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Body Row: Thumbnail + Title + Pricing */}
                <div className="flex items-center gap-2.5">
                  {getItemCoverImage(firstItem) ? (
                    <img
                      src={getItemCoverImage(firstItem)}
                      alt={firstItem?.title || 'Book cover'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-12 object-cover rounded-lg bg-slate-900 shrink-0 border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-10 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {firstItem?.title || 'Order Item'}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {extraItemsCount > 0 
                        ? `+${extraItemsCount} more ${extraItemsCount === 1 ? 'item' : 'items'}`
                        : firstItem?.type === 'pdf' ? '⚡ Instant PDF Notes' : '📖 Express Courier Delivery'
                      }
                    </p>
                    {order.shippingAddress?.fullName && (
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">
                        Delivering to: {order.shippingAddress.fullName}
                      </p>
                    )}
                  </div>

                  {/* Price & Action Chevron */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-xs font-black text-slate-950 block">
                        ₹{order.totalAmount}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                        isCod 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isCod ? 'COD' : 'Paid Online'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-900">
                    Order Details: {selectedOrderDetails.id.startsWith('#') ? selectedOrderDetails.id : `#${selectedOrderDetails.id}`}
                  </h3>
                </div>
                <p className="text-[10px] text-slate-500">
                  Placed on {new Date(selectedOrderDetails.orderDate).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Live Status Tracker */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Status:</span>
                  <div>{getStatusBadge(selectedOrderDetails.status)}</div>
                </div>
                {/* Visual Step Tracker */}
                <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[9px] font-bold">
                  <div className={`p-1.5 rounded-lg border ${
                    selectedOrderDetails.status !== 'cancelled' 
                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    1. Placed
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    selectedOrderDetails.status === 'accepted' || selectedOrderDetails.status === 'delivered'
                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    2. Dispatched
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    selectedOrderDetails.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    3. Delivered
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Purchased Items ({selectedOrderDetails.items.length})
                </span>
                {selectedOrderDetails.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex gap-3 items-center bg-white p-2.5 rounded-xl border border-slate-200"
                  >
                    {getItemCoverImage(item) ? (
                      <img
                        src={getItemCoverImage(item)}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 object-cover rounded-lg bg-slate-900 shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Qty: {item.quantity} • ₹{item.price * item.quantity}
                      </p>

                      {/* Full Course Direct Access Action */}
                      {(item.productId === COURSE_ID || (item.title || '').toLowerCase().includes('full course')) ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            Status: Purchased
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetchVerifiedCourseAccess(userEmail || undefined);
                              if (res.success && res.accessUrl) {
                                window.open(res.accessUrl, '_blank', 'noopener,noreferrer');
                              } else if (onOpenFullCourse) {
                                setSelectedOrderDetails(null);
                                onOpenFullCourse();
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 px-3 py-1 rounded-lg shadow-xs transition cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Access Course</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (item.type === 'pdf' || getPdfUrlForItem(item)) && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleDownloadPdf(getPdfUrlForItem(item), item.title, item.productId, selectedOrderDetails.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrderDetails(null);
                              handlePdfReadClick(getPdfUrlForItem(item), item.title);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Read in App</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address (if physical book) */}
              {selectedOrderDetails.shippingAddress && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Courier Delivery Address:</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">
                    {selectedOrderDetails.shippingAddress.fullName} (+91 {selectedOrderDetails.shippingAddress.phoneNumber})
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {selectedOrderDetails.shippingAddress.addressLine1}, {selectedOrderDetails.shippingAddress.addressLine2 && `${selectedOrderDetails.shippingAddress.addressLine2}, `}
                    {selectedOrderDetails.shippingAddress.district}, {selectedOrderDetails.shippingAddress.state} - {selectedOrderDetails.shippingAddress.pincode}
                  </p>
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedOrderDetails.invoiceNumber || selectedOrderDetails.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Customer Email:</span>
                  <span className="font-mono font-medium text-slate-700 text-[11px]">
                    {selectedOrderDetails.userEmail || 'Customer'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Payment Mode:</span>
                  <span className="font-bold text-slate-900">
                    {String(selectedOrderDetails.paymentStatus || '').toLowerCase().includes('cod') ? 'Cash on Delivery (COD)' : 'Prepaid Online (Razorpay)'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-slate-950">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">₹{selectedOrderDetails.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3.5 border-t border-slate-100 bg-white flex gap-2">
              <button
                onClick={() => {
                  const ord = selectedOrderDetails;
                  setSelectedOrderDetails(null);
                  handleInvoiceClick(ord);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View GST Tax Invoice</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setOrderToDelete(selectedOrderDetails)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                  title="Delete Testing Order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Order Deletion */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 border border-rose-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Confirm Order Deletion
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete order{' '}
                <strong className="text-slate-900 font-mono">
                  {orderToDelete.id.startsWith('#') ? orderToDelete.id : `#${orderToDelete.id}`}
                </strong>{' '}
                ({orderToDelete.shippingAddress?.fullName || orderToDelete.userName || 'Test Customer'}, ₹{orderToDelete.totalAmount})?
              </p>
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-2 font-medium">
                ⚠️ This will permanently remove this testing order from the server database, Telegram records, and your active dashboard.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteOrder}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
