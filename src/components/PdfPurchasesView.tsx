import React, { useState, useMemo } from 'react';
import { BookOpen, Download, Eye, FileText, Sparkles, CheckCircle2, Search, ArrowRight, ShieldCheck, Receipt, Crown, Printer } from 'lucide-react';
import { Order, Product, UserProfile } from '../types';
import { resolveImageUrl, getMyDeviceOrderIds } from '../lib/storage';
import { downloadNotesPdf, printNotesPdf } from '../lib/pdfDownloader';

interface PdfPurchasesViewProps {
  orders: Order[];
  products: Product[];
  userProfile: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenPdfReader: (pdfUrl: string, title: string, isPurchased: boolean) => void;
  onOpenInvoice?: (order: Order) => void;
  onExploreStore: () => void;
  onOpenDigitalPortal?: (tab?: 'pass' | 'library' | 'free' | 'dashboard') => void;
}

export interface PurchasedPdfItem {
  productId: string;
  title: string;
  author: string;
  category?: string;
  coverImage?: string;
  pdfUrl?: string;
  orderId: string;
  orderDate: string;
  price: number;
  invoiceNumber?: string;
  orderRef?: Order;
}

export const PdfPurchasesView: React.FC<PdfPurchasesViewProps> = ({
  orders,
  products,
  userProfile,
  onOpenAuth,
  onOpenPdfReader,
  onOpenInvoice,
  onExploreStore,
  onOpenDigitalPortal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const cleanUserEmail = userProfile?.email?.toLowerCase().trim();
  const myDeviceOrderIds = useMemo(() => getMyDeviceOrderIds(), [orders]);

  // Extract all purchased PDFs for this user or this device
  const purchasedPdfs = useMemo(() => {
    const itemsMap = new Map<string, PurchasedPdfItem>();

    // 1. First, search in all user orders
    const matchedOrders = orders.filter(order => {
      const cleanOrderId = (order.id || '').trim();
      const numId = cleanOrderId.replace(/^ORD-/, '').replace(/^#/, '');

      const isDeviceMatch = myDeviceOrderIds.includes(cleanOrderId) || 
                            myDeviceOrderIds.includes(numId) || 
                            myDeviceOrderIds.includes(`ORD-${numId}`);

      const orderEmail = (order.userEmail || '').toLowerCase().trim();
      const shippingEmail = ((order.shippingAddress as any)?.email || '').toLowerCase().trim();
      const isEmailMatch = Boolean(cleanUserEmail && (orderEmail === cleanUserEmail || order.userId === userProfile?.uid || shippingEmail === cleanUserEmail));

      return isDeviceMatch || isEmailMatch;
    });

    matchedOrders.forEach(order => {
      if (order.status === 'cancelled') return;

      (order.items || []).forEach(item => {
        if (item.type === 'pdf' || item.pdfUrl) {
          const catalogProduct = products.find(p => p.id === item.productId || p.title.toLowerCase() === item.title.toLowerCase());
          const uniqueKey = item.productId || item.title;

          if (!itemsMap.has(uniqueKey)) {
            itemsMap.set(uniqueKey, {
              productId: item.productId || uniqueKey,
              title: item.title,
              author: item.author || catalogProduct?.author || 'NEET MBBS Faculty',
              category: catalogProduct?.category || 'High-Yield Notes',
              coverImage: item.coverImage || catalogProduct?.coverImage,
              pdfUrl: item.pdfUrl || catalogProduct?.pdfUrl || '',
              orderId: order.id,
              orderDate: order.orderDate || new Date().toISOString(),
              price: item.price || 0,
              invoiceNumber: order.invoiceNumber,
              orderRef: order
            });
          }
        }
      });
    });

    // 2. Also check if catalog products marked as PDF were purchased in any stored orders
    products.filter(p => p.type === 'pdf').forEach(prod => {
      if (!itemsMap.has(prod.id)) {
        const foundOrder = orders.find(o => {
          const cleanOrderId = (o.id || '').trim();
          const numId = cleanOrderId.replace(/^ORD-/, '').replace(/^#/, '');
          const isDevice = myDeviceOrderIds.includes(cleanOrderId) || myDeviceOrderIds.includes(numId);
          const isEmail = cleanUserEmail && ((o.userEmail || '').toLowerCase() === cleanUserEmail);

          if (!isDevice && !isEmail) return false;
          return (o.items || []).some(it => it.productId === prod.id || it.title.toLowerCase() === prod.title.toLowerCase());
        });

        if (foundOrder) {
          itemsMap.set(prod.id, {
            productId: prod.id,
            title: prod.title,
            author: prod.author || 'NEET MBBS Doctors Faculty',
            category: prod.category || 'High-Yield Notes',
            coverImage: prod.coverImage,
            pdfUrl: prod.pdfUrl || '',
            orderId: foundOrder.id,
            orderDate: foundOrder.orderDate || new Date().toISOString(),
            price: prod.price || 0,
            invoiceNumber: foundOrder.invoiceNumber,
            orderRef: foundOrder
          });
        }
      }
    });

    return Array.from(itemsMap.values());
  }, [orders, products, cleanUserEmail, userProfile, myDeviceOrderIds]);

  const filteredPdfs = useMemo(() => {
    if (!searchQuery.trim()) return purchasedPdfs;
    const q = searchQuery.toLowerCase().trim();
    return purchasedPdfs.filter(pdf => 
      pdf.title.toLowerCase().includes(q) ||
      pdf.author.toLowerCase().includes(q) ||
      (pdf.category && pdf.category.toLowerCase().includes(q)) ||
      pdf.orderId.toLowerCase().includes(q)
    );
  }, [purchasedPdfs, searchQuery]);

  const handleDownload = async (pdf: PurchasedPdfItem) => {
    setDownloadingId(pdf.productId);
    try {
      await downloadNotesPdf({
        id: pdf.productId,
        title: pdf.title,
        author: pdf.author,
        category: pdf.category,
        pdfUrl: pdf.pdfUrl,
        orderId: pdf.orderId,
        userName: userProfile?.displayName,
        userEmail: userProfile?.email,
        orderDate: pdf.orderDate
      });
    } catch (err) {
      console.error('Error downloading note PDF:', err);
    } finally {
      setTimeout(() => setDownloadingId(null), 800);
    }
  };

  return (
    <div id="pdf-purchases-screen" className="p-4 space-y-4 pb-36 max-w-md mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Digital Library</span>
            </span>
            <span className="text-xs font-bold text-slate-300">
              {purchasedPdfs.length} {purchasedPdfs.length === 1 ? 'PDF' : 'PDFs'} Unlocked
            </span>
          </div>

          <h1 className="text-lg font-black tracking-tight font-['Outfit',sans-serif]">
            My PDF Purchases
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Read online or download high-yield NCERT mindmaps, formula sheets, & chapter notes purchased with your account.
          </p>

          {onOpenDigitalPortal && (
            <div className="pt-2">
              <button
                type="button"
                id="pdf-view-open-pass-btn"
                onClick={() => onOpenDigitalPortal('pass')}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Crown className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                <span>NEET Success Pass & Full Digital Library →</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guest Alert Prompt */}
      {!userProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="space-y-0.5 pr-2">
            <h4 className="text-xs font-black text-blue-950">Have existing PDF purchases?</h4>
            <p className="text-[11px] text-blue-800">
              Sign in to automatically sync all digital PDFs linked to your email.
            </p>
          </div>
          <button
            onClick={() => onOpenAuth('login')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs shrink-0 cursor-pointer transition"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Search Filter */}
      {purchasedPdfs.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search purchased notes by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
          />
        </div>
      )}

      {/* List of Purchased PDFs */}
      {filteredPdfs.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 px-1">
            <span>Unlocked Study Materials</span>
            <span className="text-[11px] text-slate-400 font-normal">Instant Offline Access</span>
          </div>

          {filteredPdfs.map((pdf) => {
            const resolvedImg = resolveImageUrl(pdf.coverImage);

            return (
              <div 
                key={pdf.productId}
                id={`purchased-pdf-${pdf.productId}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-blue-300 transition"
              >
                <div className="flex items-start gap-3.5">
                  {/* Thumbnail / PDF icon */}
                  <div className="w-16 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center relative shadow-2xs">
                    {resolvedImg ? (
                      <img 
                        src={resolvedImg} 
                        alt={pdf.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-700 to-indigo-900 flex flex-col items-center justify-center text-white p-1 text-center">
                        <BookOpen className="w-5 h-5 text-yellow-400" />
                        <span className="text-[7px] font-black uppercase mt-1">PDF Note</span>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[7px] font-black px-1 rounded-sm uppercase">
                      PAID
                    </span>
                  </div>

                  {/* PDF Meta */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Purchased & Verified Access</span>
                    </div>

                    <h3 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug font-['Outfit',sans-serif]">
                      {pdf.title}
                    </h3>

                    <p className="text-[11px] text-slate-500 font-medium">
                      By <span className="text-blue-700 font-bold">{pdf.author}</span> • {pdf.category}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 font-mono">
                      <span>Order #{pdf.orderId.replace(/^ORD-/, '')}</span>
                      <span>•</span>
                      <span>{new Date(pdf.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Read Online + Download PDF + Print/Save */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPdfReader(pdf.pdfUrl || '', pdf.title, true)}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-98"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Read</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(pdf)}
                    disabled={downloadingId === pdf.productId}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === pdf.productId ? 'Saving...' : 'Download'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printNotesPdf({
                      id: pdf.productId,
                      title: pdf.title,
                      author: pdf.author,
                      category: pdf.category,
                      pdfUrl: pdf.pdfUrl,
                      orderId: pdf.orderId,
                      userName: userProfile?.displayName,
                      userEmail: userProfile?.email,
                      orderDate: pdf.orderDate
                    })}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                    title="Print or Save to PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {pdf.orderRef && onOpenInvoice && (
                    <button
                      type="button"
                      onClick={() => onOpenInvoice(pdf.orderRef!)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="View Invoice"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
            <BookOpen className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {searchQuery ? 'No matching PDF notes found' : 'No Purchased PDFs Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {searchQuery 
                ? 'Try searching with another keyword or clear the search field.' 
                : 'When you purchase digital NCERT notes, formula sheets, or mindmaps, they will appear here with instant offline download options.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <button
              onClick={() => onOpenDigitalPortal ? onOpenDigitalPortal('pass') : onExploreStore()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-98"
            >
              <Crown className="w-4 h-4 text-yellow-200 fill-yellow-200" />
              <span>Get NEET Success Pass & Access All Notes</span>
            </button>
            <button
              onClick={onExploreStore}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer active:scale-98"
            >
              <span>Explore Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Security & Verification Guarantee */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-[11px] font-black text-slate-800">100% Genuine MBBS Verified Notes</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            All PDF notes are compiled and curated by Faisal Fayaz & Dr. Shahzaib Husain. Unlimited lifetime downloads enabled for all purchased digital study files.
          </p>
        </div>
      </div>
    </div>
  );
};
