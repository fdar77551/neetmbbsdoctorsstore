import React, { useState, useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Order, StoreConfig } from '../types';
import { downloadInvoicePdf, buildCustomerOrderQrPayload } from '../lib/pdfInvoice';
import { SvgBarcode, SvgQrCode } from '../lib/barcodeGenerator';
import { getStoredStoreConfig, DEFAULT_STORE_CONFIG } from '../lib/storage';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoredStoreConfig());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setStoreConfig(getStoredStoreConfig());
    };
    window.addEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('neetmbbs_store_config_updated', handleConfigUpdate);
    };
  }, []);

  if (!order) return null;

  const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod') || 
                String(order.paymentStatus || '').toLowerCase().includes('cash');

  const rawOrderId = String(order.id || order.razorpayOrderId || 'NMD-20260822-0001').replace(/^#/, '');
  const invoiceNo = order.invoiceNumber || (rawOrderId.startsWith('NMD-') ? rawOrderId.replace(/^NMD-/, 'INV-') : `INV-${rawOrderId}`);

  const orderDateStr = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print blocked, downloading invoice instead:', e);
      handleDownloadInvoice();
    }
  };

  const handleDownloadInvoice = () => {
    downloadInvoicePdf(order);
  };

  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        productId: 'item-1',
        title: order.productName || 'NEET Medical Study Material Handbook',
        author: 'NEET MBBS Doctors Faculty',
        type: 'book' as const,
        price: order.totalAmount || 599,
        quantity: order.quantity || 1,
        coverImage: ''
      }];

  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) * (Number(it.quantity) || 1)), 0);
  const shippingCost = Number(order.shippingCost ?? (order.shippingAmount ?? 0));
  const totalAmount = Number(order.totalAmount || subtotal);
  const discount = Math.max(0, (subtotal + shippingCost) - totalAmount);

  const customerName = order.userName || order.customer?.name || order.shippingAddress?.fullName || 'Valued Aspirant';
  const customerPhone = order.shippingAddress?.phoneNumber || order.customer?.contact || '9876543210';
  const customerEmail = order.userEmail || order.customer?.email || (storeConfig.supportEmails[0] || 'support@neetmbbsdoctors.store');

  const supEmail = storeConfig.supportEmails[0] || 'support@neetmbbsdoctors.store';
  const supPhone = storeConfig.supportPhones[0] || '+91 6005894110';
  const supWeb = storeConfig.websiteUrl || 'www.neetmbbsdoctors.store';

  const qrPayload = buildCustomerOrderQrPayload(order);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 print:p-0 print:bg-white overflow-y-auto">
      <div 
        id="invoice-modal-content"
        className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh] print:max-h-none print:shadow-none print:rounded-none border border-slate-200"
      >
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="bg-[#0b2545] text-white p-3 px-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black tracking-wide">Official Delivery Invoice ({rawOrderId})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadInvoice}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-700 active:scale-95"
              title="Download Authentic PDF Invoice"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-emerald-400 transition cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 text-xs text-slate-800 bg-white">
          
          {/* 1. Header Row (Left: Store Brand, Center: Invoice Info, Right: Logo Badge) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-1">
            {/* Left: Brand Name */}
            <div className="space-y-0.5">
              <div className="text-xl font-black text-[#0B2545] tracking-tight leading-none">
                NEETMBBS
              </div>
              <div className="text-xl font-black text-[#0D9488] tracking-tight leading-none">
                DOCTORS STORE
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-1">
                Your Trusted Store for NEET Preparation
              </p>
            </div>

            {/* Center: INVOICE Meta Table */}
            <div className="sm:text-left bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 min-w-[210px]">
              <h2 className="text-lg font-black text-[#0B2545] uppercase tracking-tight mb-1.5">
                INVOICE
              </h2>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Invoice No:</span>
                  <span className="font-bold text-slate-900">{invoiceNo}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-bold text-slate-900">{rawOrderId}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Order Date:</span>
                  <span className="font-medium text-slate-800">{orderDateStr}</span>
                </div>
                <div className="flex justify-between gap-2 items-center pt-0.5 border-t border-slate-200">
                  <span className="text-slate-500">Payment:</span>
                  <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${isCod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isCod ? 'Cash On Delivery (COD)' : 'Paid Online (Razorpay)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Official Store Emblem */}
            <div className="hidden sm:flex flex-col items-center justify-center w-24 h-20 bg-slate-50 rounded-xl border border-slate-200 p-1.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-4 h-6 bg-[#0B2545] rounded-l-xs" />
                <div className="w-4 h-6 bg-[#0D9488] rounded-r-xs" />
              </div>
              <span className="text-[8px] font-black text-[#0B2545] leading-none">NEETMBBS</span>
              <span className="text-[7px] font-bold text-[#0D9488] leading-none mt-0.5">OFFICIAL STORE</span>
            </div>
          </div>

          {/* 2. Customer Details on LEFT & Shipping Address on RIGHT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left Column: Customer Details */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-black text-xs text-[#0B2545]">
                BILLING / CUSTOMER DETAILS
              </div>
              <div className="p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{customerName}</span>
                  <span className="font-mono text-slate-700">{customerPhone}</span>
                </div>
                <div className="text-slate-600 font-mono text-[11px]">
                  {customerEmail}
                </div>
                <div className="text-slate-600 text-[11px] leading-relaxed pt-1 border-t border-slate-100">
                  {order.shippingAddress ? (
                    <>
                      <span>{order.shippingAddress.addressLine1} {order.shippingAddress.addressLine2}</span><br />
                      <span>{order.shippingAddress.district ? `${order.shippingAddress.district}, ` : ''}{order.shippingAddress.state} - {order.shippingAddress.pincode}, India</span>
                    </>
                  ) : (
                    <span className="text-slate-500 italic">Instant Digital PDF Access (Online Library)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Shipping Details */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-black text-xs text-[#0B2545]">
                SHIPPING ADDRESS
              </div>
              <div className="p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{customerName}</span>
                  <span className="font-mono text-slate-700">{customerPhone}</span>
                </div>
                <div className="text-slate-600 text-[11px] leading-relaxed pt-1">
                  {order.shippingAddress ? (
                    <>
                      <span>{order.shippingAddress.addressLine1} {order.shippingAddress.addressLine2}</span><br />
                      <span>{order.shippingAddress.district ? `${order.shippingAddress.district}, ` : ''}{order.shippingAddress.state} - {order.shippingAddress.pincode}, India</span>
                    </>
                  ) : (
                    <div className="text-[#0D9488] font-bold text-[11px]">
                      Instant Digital Delivery (PDF Notes)<br />
                      <span className="font-normal text-slate-500">Available immediately in student account library</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Product Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B2545] text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">PRODUCT</th>
                  <th className="py-2.5 px-3 text-center w-16">QTY</th>
                  <th className="py-2.5 px-3 text-right w-24">PRICE</th>
                  <th className="py-2.5 px-3 text-right w-24">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.price) || 0;
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="py-3 px-3 font-bold text-slate-900">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.type === 'pdf' ? 'English Medium • PDF Notes (Instant Digital)' : 'English Medium • Books (Physical Edition)'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-900">{qty}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">₹{price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{(qty * price).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Calculations Block */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping:</span>
                <span className={shippingCost === 0 ? "text-emerald-600 font-bold" : "font-mono"}>
                  {shippingCost === 0 ? '₹0.00 (Free)' : `₹${shippingCost.toFixed(2)}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-[#0B2545]">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">₹{totalAmount.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-slate-400">(Inclusive of all taxes)</p>
            </div>
          </div>

          {/* 6. Bottom 3-Column Box (Thank you + Barcode + QR Code) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {/* Box 1: Thank you */}
            <div className="flex flex-col justify-center space-y-1 sm:pr-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                  ✓
                </div>
                <h4 className="font-black text-xs text-emerald-700">Thank you for your order!</h4>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                We appreciate your trust in NEETMBBS Doctors Store.
              </p>
              <p className="text-[10px] text-slate-600">
                Happy Learning & Best Wishes for your NEET Exam!
              </p>
              <p className="text-[10px] font-bold text-[#0B2545] pt-0.5">
                — Team NEETMBBS Doctors Store
              </p>
            </div>

            {/* Box 2: Barcode (Order ID) */}
            <div className="flex flex-col items-center justify-center pt-3 sm:pt-0 sm:px-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0B2545] mb-1">
                SCAN / BARCODE (ORDER ID)
              </span>
              <SvgBarcode text={rawOrderId} width={160} height={36} className="my-0.5" />
              <span className="text-[9px] font-mono font-bold text-slate-800 mt-1">{rawOrderId}</span>
              <span className="text-[8px] text-slate-500">Scan for Order ID</span>
            </div>

            {/* Box 3: QR Code (Customer Details & Order Details) */}
            <div className="flex flex-col items-center justify-center pt-3 sm:pt-0 sm:pl-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0B2545] mb-1">
                SCAN QR TO VIEW ORDER
              </span>
              <SvgQrCode text={qrPayload} size={58} />
              <span className="text-[8px] font-bold text-[#0D9488] mt-1">Scan for Customer & Order Info</span>
              <span className="text-[7px] text-slate-400">Verified Tax Invoice</span>
            </div>
          </div>

          {/* 7. Payment Details & Status Banner */}
          <div className={`p-2.5 px-4 rounded-xl border text-center text-xs font-bold ${
            isCod 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {isCod ? (
              <span>
                PAYMENT METHOD: CASH ON DELIVERY (COD) — Please pay <span className="underline font-black">₹{totalAmount.toFixed(2)}</span> at delivery.
              </span>
            ) : (
              <span>
                PAYMENT STATUS: PAID ONLINE (Instant Verification - Razorpay) — ₹{totalAmount.toFixed(2)} received. No cash to collect.
              </span>
            )}
          </div>

          {/* 8. Support & Store Contact Footer (Below Payment Method) */}
          <div className="pt-3 border-t border-slate-200 text-center space-y-1 text-[11px] text-slate-600">
            <div className="font-bold text-[#0B2545] text-xs">{storeConfig.storeName || 'NEETMBBS DOCTORS STORE'}</div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-500 text-[10px]">
              <span><b>Website:</b> {supWeb}</span>
              <span>•</span>
              <span><b>Support:</b> {supEmail}</span>
              <span>•</span>
              <span><b>Contact:</b> {supPhone}</span>
              <span>•</span>
              <span><b>Telegram:</b> {storeConfig.telegramUsername || '@neetmbbsdoctors'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

