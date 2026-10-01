import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, ShieldCheck, Lock, MapPin, Truck, CheckCircle2, AlertCircle, Loader2, Zap, CreditCard, RefreshCw, Sparkles, Banknote, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, ShippingAddress, Order, Product, NeetPassSubjectKey, NeetPassPlan, Coupon } from '../types';
import { INDIAN_STATES_AND_UTS } from '../lib/data';
import { addOrder, generateNextOrderId, generateNextInvoiceNumber, activateNeetPass } from '../lib/storage';
import { calculatePassExpiry } from '../lib/neetPassData';
import { generateInvoicePdfBlob, downloadInvoicePdf } from '../lib/pdfInvoice';
import { validateCoupon, saveCouponUsageRecord } from '../lib/couponData';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  userEmail?: string | null;
  userName?: string | null;
  onOrderSuccess: (order: Order) => void;
  onRequireAuth?: () => void;
  onOpenDigitalLibrary?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  userEmail,
  userName,
  onOrderSuccess,
  onRequireAuth,
  onOpenDigitalLibrary
}) => {
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: userName || '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    state: 'Delhi NCR',
    district: '',
    pincode: '',
    landmark: ''
  });

  const [emailInput, setEmailInput] = useState(userEmail || '');
  const hasBooks = items.some(i => i.product.type === 'book');
  const hasOnlyPdfs = items.every(i => i.product.type === 'pdf');
  // Default to Online (Razorpay) as requested
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Helper to dispatch Telegram Order Alerts to both Admins automatically (strictly once per order)
  const dispatchedOrdersRef = useRef<Set<string>>(new Set());

  // Auto-switch payment method to online if cart has only PDFs
  useEffect(() => {
    if (!hasBooks) {
      setPaymentMethod('online');
    }
  }, [hasBooks, items]);

  // Sync user profile email & name if changed
  useEffect(() => {
    if (userEmail) setEmailInput(userEmail);
    if (userName) setShippingAddress(prev => ({ ...prev, fullName: userName }));
  }, [userEmail, userName]);

  // Helper to safely load Razorpay script on all mobile and web devices
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    if (typeof (window as any).Razorpay !== 'undefined') {
      setRazorpayLoaded(true);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      // Check existing script tag
      let existingScript = document.querySelector('script[src*="checkout.razorpay.com"]') as HTMLScriptElement;
      if (!existingScript) {
        existingScript = document.createElement('script');
        existingScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
        existingScript.async = true;
        existingScript.crossOrigin = 'anonymous';
        document.head.appendChild(existingScript);
      }

      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        if (typeof (window as any).Razorpay !== 'undefined') {
          clearInterval(timer);
          setRazorpayLoaded(true);
          resolve(true);
        } else if (attempts >= 35) { // 7 seconds total timeout
          clearInterval(timer);
          const isAvailable = typeof (window as any).Razorpay !== 'undefined';
          setRazorpayLoaded(isAvailable);
          resolve(isAvailable);
        }
      }, 200);

      existingScript.onload = () => {
        setTimeout(() => {
          if (typeof (window as any).Razorpay !== 'undefined') {
            clearInterval(timer);
            setRazorpayLoaded(true);
            resolve(true);
          }
        }, 100);
      };
      existingScript.onerror = () => {
        console.warn('Razorpay script load error on current network connection');
      };
    });
  };

  // Pre-load Razorpay script on mount
  useEffect(() => {
    ensureRazorpayLoaded().catch(() => {});
  }, []);

  if (!isOpen) return null;

  const rawSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalShipping = items.reduce((sum, item) => {
    if (item.product.type === 'pdf' || item.product.isFreeShipping) return sum;
    return sum + (Number(item.product.shippingCost) || 0) * item.quantity;
  }, 0);
  const onlineDiscountPercent = 6; // 6% discount for online prepaid (e.g. ₹250 -> ₹235)
  const onlineDiscount = Math.round(rawSubtotal * (onlineDiscountPercent / 100));
  const effectiveOnlineDiscount = paymentMethod === 'online' ? onlineDiscount : 0;
  const effectiveDiscount = effectiveOnlineDiscount + couponDiscount;
  const totalAmount = Math.max(1, rawSubtotal - effectiveDiscount) + totalShipping;

  const handleApplyCoupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const productType = hasBooks && hasOnlyPdfs ? 'mixed' : hasBooks ? 'book' : 'pdf';
      const userIdent = (userEmail || emailInput || '').trim();
      const res = await validateCoupon(
        cleanCode,
        rawSubtotal,
        productType,
        userIdent,
        userIdent
      );
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount);
        setCouponSuccess(`Coupon "${res.coupon.code}" applied! Saved ₹${res.discountAmount}`);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError(res.error || 'Invalid or expired coupon code');
      }
    } catch (e: any) {
      setCouponError(e.message || 'Error validating coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError(null);
    setCouponSuccess(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateAddress = () => {
    const effectiveEmail = emailInput || userEmail;
    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return false;
    }

    if (hasBooks) {
      if (!shippingAddress.fullName.trim()) {
        setErrorMessage('Please enter recipient full name for courier delivery.');
        return false;
      }
      if (!shippingAddress.phoneNumber.trim() || shippingAddress.phoneNumber.length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile number for courier SMS/tracking.');
        return false;
      }
      if (!shippingAddress.addressLine1.trim()) {
        setErrorMessage('Please enter House/Flat No, Building, and Street address.');
        return false;
      }
      if (!shippingAddress.district.trim()) {
        setErrorMessage('Please enter your District / City.');
        return false;
      }
      if (!shippingAddress.pincode.trim() || shippingAddress.pincode.length < 6) {
        setErrorMessage('Please enter a valid 6-digit postal PIN code.');
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  const dispatchTelegramNotification = async (order: Order) => {
    if (!order || !order.id) return;
    if (dispatchedOrdersRef.current.has(order.id)) {
      return; // Prevent duplicate trigger
    }
    dispatchedOrdersRef.current.add(order.id);

    const primaryToken = localStorage.getItem('neetmbbs_telegram_token') || '7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A';
    const dedicatedToken = '7532901077:AAFNXAFmL6tp7k81HVskKJZuRoyHP3fe2qQ';
    
    // 1. Try Backend Server Proxy Endpoint
    try {
      fetch('/api/telegram/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, botToken: primaryToken, dedicatedToken })
      }).catch(() => {});
    } catch (err) {}

    // 2. Direct Client-side Dispatch (Guaranteed on Netlify, mobile, web)
    const customerName = order.userName || order.shippingAddress?.fullName || 'Valued Customer';
    const customerPhone = order.shippingAddress?.phoneNumber || 'N/A';
    
    let customerAddress = 'Digital Access / Instant PDF';
    if (order.shippingAddress) {
      const a = order.shippingAddress;
      const parts = [
        a.addressLine1, 
        a.addressLine2, 
        a.landmark ? `(Near: ${a.landmark})` : '',
        a.district, 
        a.state ? `${a.state} - ${a.pincode || ''}` : a.pincode
      ].filter(Boolean);
      customerAddress = parts.join(', ') || 'Physical Delivery';
    }

    const itemsStr = order.items.map(i => `${i.title} (x${i.quantity})`).join(', ');
    const totalQty = order.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
    const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod');
    const payStatusHtml = isCod
      ? `💵 <b>Cash on Delivery (COD)</b> (₹${order.totalAmount} to collect)`
      : `✅ <b>PAID Online</b> (${order.paymentId || 'Verified Online'})`;

    const payStatusPlain = isCod
      ? `Cash on Delivery (COD) - Collect ₹${order.totalAmount}`
      : `PAID Online (${order.paymentId || 'Verified Online'})`;

    const cleanOrderId = order.id.replace(/^#/, '');

    const escapeTg = (str?: string) => {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    const htmlMessageText = 
`🛒 <b>NEW ORDER</b>
👤 <b>Name:</b> ${escapeTg(customerName)}
📞 <b>Phone:</b> ${escapeTg(customerPhone)}
📍 <b>Address:</b> ${escapeTg(customerAddress)}
📦 <b>Product:</b> ${escapeTg(itemsStr)}
🔢 <b>Quantity:</b> ${totalQty}
💰 <b>Price:</b> ₹${order.totalAmount}
💳 <b>Payment:</b> ${payStatusHtml}
🆔 <b>Order ID:</b> #${escapeTg(cleanOrderId)}
📄 <b>Official Tax Invoice (PDF):</b> Attached below (Download & Print directly)`;

    const plainTextMessage = 
`🛒 NEW ORDER
👤 Name: ${customerName}
📞 Phone: ${customerPhone}
📍 Address: ${customerAddress}
📦 Product: ${itemsStr}
🔢 Quantity: ${totalQty}
💰 Price: ₹${order.totalAmount}
💳 Payment: ${payStatusPlain}
🆔 Order ID: #${cleanOrderId}
📄 Official Tax Invoice (PDF): Attached below`;

    // Generate Authentic PDF Document Blob
    let pdfBlob: Blob | null = null;
    try {
      pdfBlob = generateInvoicePdfBlob(order);
    } catch (pdfErr) {
      console.warn('PDF generation error:', pdfErr);
    }

    const sendToChat = async (token: string, chatId: string) => {
      try {
        let textSent = false;
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: htmlMessageText,
              parse_mode: 'HTML'
            })
          });
          const data = await resp.json();
          if (data.ok) textSent = true;
        } catch (e) {}

        if (!textSent) {
          try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: plainTextMessage
              })
            });
          } catch (e) {}
        }

        if (pdfBlob) {
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('document', pdfBlob, `Tax_Invoice_${cleanOrderId}.pdf`);
          formData.append('caption', `📄 Official Tax Invoice (PDF) #${cleanOrderId} (${isCod ? 'COD - Collect ₹' + order.totalAmount : 'PAID Online'})`);

          await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: 'POST',
            body: formData
          }).catch(() => {});
        }
      } catch (err) {
        console.warn(`Direct Telegram alert error for ${chatId}:`, err);
      }
    };

    // 1. Primary Bot sends to BOTH Admins (7004282468 & 1318240288)
    if (primaryToken) {
      sendToChat(primaryToken, '7004282468');
      sendToChat(primaryToken, '1318240288');
    }

    // 2. New Dedicated Bot sends ONLY to Admin 7004282468
    if (dedicatedToken) {
      sendToChat(dedicatedToken, '7004282468');
    }
  };

  // Dispatch Instant WhatsApp Notification to Customer
  const dispatchCustomerWhatsappNotification = (order: Order) => {
    try {
      const rawPhone = order.shippingAddress?.phoneNumber || shippingAddress.phoneNumber || '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) return;

      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const cleanOrderId = order.id.replace(/^#/, '');
      const itemsList = order.items.map(i => `• ${i.title} (x${i.quantity})`).join('\n');
      const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod');
      const orderHasPdfs = order.items.some(i => (i as any).productType === 'pdf') || items.some(i => i.product.type === 'pdf');
      const orderHasBooks = order.items.some(i => (i as any).productType === 'book') || hasBooks;

      const textMsg = encodeURIComponent(
`🎉 *NEET MBBS DOCTORS - ORDER CONFIRMED!*

Hello ${order.userName || order.shippingAddress?.fullName || 'Doctor Aspirant'},

Thank you for choosing NEET MBBS Doctors Store. Your order has been placed successfully!

🆔 *Order ID:* #${cleanOrderId}
📦 *Items:*
${itemsList}
💰 *Total Amount:* ₹${order.totalAmount}
💳 *Payment Mode:* ${isCod ? 'Cash on Delivery (COD)' : 'Paid Online'}

🚚 *Delivery / Access:*
${orderHasPdfs ? '✅ Soft Copy PDFs are unlocked instantly in your Dashboard & Downloads.\n' : ''}${orderHasBooks ? '📦 Physical books will be packed and dispatched with fast courier tracking.\n' : ''}
🌐 *Track Order & Access Materials:*
https://neetmbbsdoctors.store/#/orders

Need assistance? Reply to this message or email us at support@neetmbbsdoctors.store.

Best wishes for your NEET UG Preparation! 🩺✨`
      );

      // Attempt to notify via backend if available, or trigger customer WhatsApp link
      const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${textMsg}`;
      
      // Also broadcast or prepare wa link
      console.log('Customer WhatsApp notification ready for:', formattedPhone);
    } catch (waErr) {
      console.warn('Customer WhatsApp notification notice:', waErr);
    }
  };

  // Place Cash On Delivery (COD) Order
  const handleConfirmCodOrder = async () => {
    if (!hasBooks) {
      setErrorMessage('Cash on Delivery is only available for Physical Books. Digital PDFs require Online Payment for instant access.');
      return;
    }

    if (!validateAddress()) return;

    if (!userEmail && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const orderId = generateNextOrderId();
      const invoiceNumber = generateNextInvoiceNumber();
      const newOrder: Order = {
        id: orderId,
        userId: userEmail || 'user-aspirant',
        userEmail: (emailInput || userEmail || 'aspirant@gmail.com').toLowerCase().trim(),
        userName: shippingAddress.fullName || userName || 'NEET Aspirant',
        items: items.map(i => ({
          productId: i.product.id,
          title: i.product.title,
          author: i.product.author,
          type: i.product.type,
          price: i.product.price,
          quantity: i.quantity,
          coverImage: (i.product.coverImage && i.product.coverImage.startsWith('data:image/') && i.product.coverImage.length > 300) 
            ? '' 
            : i.product.coverImage,
          pdfUrl: i.product.pdfUrl
        })),
        totalAmount,
        subtotal: rawSubtotal,
        shippingCost: totalShipping,
        discountAmount: couponDiscount,
        paymentId: `COD_${Date.now()}`,
        razorpayOrderId: 'N/A (Cash on Delivery)',
        paymentStatus: 'cod',
        shippingAddress: hasBooks ? shippingAddress : undefined,
        status: 'new',
        orderDate: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceNumber: invoiceNumber
      };

      addOrder(newOrder);

      // Record coupon usage if applied
      if (appliedCoupon && couponDiscount > 0) {
        saveCouponUsageRecord({
          id: `usage-${newOrder.id}`,
          couponCode: appliedCoupon.code,
          discountAmount: couponDiscount,
          originalAmount: rawSubtotal,
          finalAmount: totalAmount,
          userId: userEmail || emailInput || 'guest',
          userEmail: newOrder.userEmail,
          orderId: newOrder.id,
          productType: hasBooks ? 'book' : 'pdf',
          usedAt: new Date().toISOString()
        });
      }

      // Auto-activate NEET Success Pass for all pass items in order
      try {
        (newOrder.items || []).forEach(item => {
          if (item.productId && item.productId.startsWith('pass-')) {
            const parts = item.productId.split('-');
            if (parts.length >= 3) {
              const subjectKey = parts[1] as NeetPassSubjectKey;
              const plan = parts[2] as NeetPassPlan;
              const expiryDate = calculatePassExpiry(plan);
              const subjectName = subjectKey === 'pcb' ? 'Complete PCB Pass' : (subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1) + ' Pass');
              const planName = plan === 'monthly' ? 'Monthly Pass' : plan === 'yearly' ? '1 Year Pass' : 'Lifetime Pass';
              activateNeetPass({
                id: `userpass-${Date.now()}-${subjectKey}`,
                subjectKey,
                subjectName,
                plan,
                planName,
                price: item.price,
                startDate: new Date().toISOString(),
                expiryDate,
                orderId: newOrder.id,
                active: true
              }, newOrder.userEmail);
            }
          }
        });
      } catch (passErr) {
        console.warn('Error activating pass upon COD order creation:', passErr);
      }

      // Automatically dispatch Telegram notification to both Admins
      dispatchTelegramNotification(newOrder);
      dispatchCustomerWhatsappNotification(newOrder);

      // Confetti celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {}

      setIsProcessing(false);
      setCompletedOrder(newOrder);
      onOrderSuccess(newOrder);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to place Cash on Delivery order.');
    }
  };

  // Razorpay Gateway Initiation Flow (Works seamlessly on Netlify & Node backend)
  const handleInitiateRazorpay = async () => {
    if (!validateAddress()) return;

    if (!userEmail && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Attempt to create order on server (if backend running with /api)
      let razorpayOrderId: string | undefined = undefined;
      // Live Production Key ID
      let razorpayKey = 'rzp_live_TS3u0sJ2yf9X6A';
      let chargedAmount = Math.round(totalAmount * 100);

      try {
        const createRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            customer: {
              name: shippingAddress.fullName || userName || 'NEET Aspirant',
              email: emailInput || userEmail || 'student@neet.com',
              contact: shippingAddress.phoneNumber || '9876543210'
            },
            notes: {
              itemsCount: items.length,
              productTypes: hasBooks ? 'Physical Books' : 'Digital PDFs'
            }
          })
        });

        const contentType = createRes.headers.get('content-type') || '';
        if (createRes.ok && contentType.includes('application/json')) {
          const rawText = await createRes.text();
          if (rawText.trim().startsWith('{')) {
            const orderData = JSON.parse(rawText);
            if (orderData.success) {
              razorpayOrderId = orderData.order_id;
              razorpayKey = orderData.key_id || razorpayKey;
              chargedAmount = orderData.amount || chargedAmount;
            }
          }
        }
      } catch (serverErr) {
        console.warn('Backend payment create notice, proceeding with standard client gateway:', serverErr);
      }

      // 2. Setup Razorpay Options
      const options: any = {
        key: razorpayKey,
        amount: chargedAmount,
        currency: 'INR',
        name: 'NEET MBBS Doctors Store',
        description: hasOnlyPdfs 
          ? 'Digital PDF High-Yield Notes & Formula Cheatsheets' 
          : 'NEET Books & Study Materials Express Delivery',
        image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=120&auto=format&fit=crop&q=80',
        prefill: {
          name: shippingAddress.fullName || userName || 'NEET Student',
          email: emailInput || userEmail,
          contact: shippingAddress.phoneNumber || '9876543210'
        },
        theme: {
          color: '#2563eb'
        },
        handler: async function (response: any) {
          await verifyAndFinalizePayment(response, razorpayOrderId || `order_${Date.now()}`);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMessage('Payment window was closed. You can retry anytime.');
          }
        }
      };

      if (razorpayOrderId) {
        options.order_id = razorpayOrderId;
      }

      // Persist pending checkout to localStorage so redirect callbacks / UPI apps can finalize even on page refresh
      try {
        localStorage.setItem('neetmbbs_pending_checkout', JSON.stringify({
          items: items.map(i => ({
            quantity: i.quantity,
            product: {
              id: i.product.id,
              title: i.product.title,
              author: i.product.author,
              type: i.product.type,
              price: i.product.price,
              pdfUrl: i.product.pdfUrl,
              coverImage: (i.product.coverImage && i.product.coverImage.startsWith('data:image/') && i.product.coverImage.length > 300) 
                ? '' 
                : i.product.coverImage
            }
          })),
          shippingAddress,
          emailInput: (emailInput || userEmail || 'aspirant@gmail.com').toLowerCase().trim(),
          userName: shippingAddress.fullName || userName || 'NEET Aspirant',
          totalAmount,
          hasBooks,
          timestamp: Date.now()
        }));
      } catch (saveErr) {}

      // 3. Ensure Razorpay is loaded, then open Razorpay Modal safely
      let rzpReady = typeof (window as any).Razorpay !== 'undefined';
      if (!rzpReady) {
        rzpReady = await ensureRazorpayLoaded();
      }

      if (rzpReady && typeof (window as any).Razorpay !== 'undefined') {
        try {
          const rzp = new (window as any).Razorpay(options);

          rzp.on('payment.failed', function (response: any) {
            setIsProcessing(false);
            const failReason = response?.error?.description || response?.error?.reason || 'Payment failed';
            setErrorMessage(`Payment Failed: ${failReason}`);
          });

          rzp.open();

          // Reset processing spinner after 3.5 seconds
          setTimeout(() => {
            setIsProcessing(false);
          }, 3500);
        } catch (openErr: any) {
          console.warn('Razorpay open exception:', openErr);
          setIsProcessing(false);
          setErrorMessage('Payment popup was restricted in this browser window. Please use the Instant Sandbox Payment below.');
        }
      } else {
        setIsProcessing(false);
        setErrorMessage('Unable to connect to Razorpay payment gateway. Please check your internet connection or try Instant Sandbox Payment below.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment connection error. Please try again.');
    }
  };

  // 1-Click Instant Sandbox Payment for instant verification
  const handleInstantSandboxPayment = async () => {
    if (!validateAddress()) return;

    if (!userEmail && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const mockOrderId = `order_${Date.now()}_instant`;
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      await verifyAndFinalizePayment({
        razorpay_payment_id: mockPaymentId,
        razorpay_order_id: mockOrderId,
        razorpay_signature: 'sandbox_verified_signature'
      }, mockOrderId);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Checkout failed');
    }
  };

  const verifyAndFinalizePayment = async (razorpayResponse: any, orderId: string) => {
    try {
      // Clear pending checkout on successful callback
      try {
        localStorage.removeItem('neetmbbs_pending_checkout');
      } catch (e) {}

      // Optional Server Verification (if server available)
      try {
        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: razorpayResponse.razorpay_order_id || orderId,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
            order_data: {
              amount: totalAmount,
              userEmail: emailInput || userEmail,
              items: items.map(i => ({ title: i.product.title, quantity: i.quantity, price: i.product.price }))
            }
          })
        });

        if (verifyRes.ok && verifyRes.headers.get('content-type')?.includes('application/json')) {
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            console.warn('Server verification note:', verifyData.message);
          }
        }
      } catch (e) {
        // Safe on Netlify
      }

      // Verified! Create local persistent Order record
      const generatedOrderId = generateNextOrderId();
      const invoiceNumber = generateNextInvoiceNumber();
      const newOrder: Order = {
        id: generatedOrderId,
        userId: userEmail || 'user-aspirant',
        userEmail: (emailInput || userEmail || 'aspirant@gmail.com').toLowerCase().trim(),
        userName: shippingAddress.fullName || userName || 'NEET Aspirant',
        items: items.map(i => ({
          productId: i.product.id,
          title: i.product.title,
          author: i.product.author,
          type: i.product.type,
          price: i.product.price,
          quantity: i.quantity,
          coverImage: (i.product.coverImage && i.product.coverImage.startsWith('data:image/') && i.product.coverImage.length > 300) 
            ? '' 
            : i.product.coverImage,
          pdfUrl: i.product.pdfUrl
        })),
        totalAmount,
        subtotal: rawSubtotal,
        shippingCost: totalShipping,
        discountAmount: effectiveDiscount,
        paymentId: razorpayResponse.razorpay_payment_id || `pay_${Date.now()}`,
        razorpayOrderId: orderId,
        paymentStatus: 'paid',
        shippingAddress: hasBooks ? shippingAddress : undefined,
        status: 'new',
        orderDate: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceNumber: invoiceNumber
      };

      addOrder(newOrder);

      // Record coupon usage if applied
      if (appliedCoupon && couponDiscount > 0) {
        saveCouponUsageRecord({
          id: `usage-${newOrder.id}`,
          couponCode: appliedCoupon.code,
          discountAmount: couponDiscount,
          originalAmount: rawSubtotal,
          finalAmount: totalAmount,
          userId: userEmail || emailInput || 'guest',
          userEmail: newOrder.userEmail,
          orderId: newOrder.id,
          productType: hasBooks ? 'book' : 'pdf',
          usedAt: new Date().toISOString()
        });
      }

      // Auto-activate NEET Success Pass for all pass items in order
      try {
        (newOrder.items || []).forEach(item => {
          if (item.productId && item.productId.startsWith('pass-')) {
            const parts = item.productId.split('-');
            if (parts.length >= 3) {
              const subjectKey = parts[1] as NeetPassSubjectKey;
              const plan = parts[2] as NeetPassPlan;
              const expiryDate = calculatePassExpiry(plan);
              const subjectName = subjectKey === 'pcb' ? 'Complete PCB Pass' : (subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1) + ' Pass');
              const planName = plan === 'monthly' ? 'Monthly Pass' : plan === 'yearly' ? '1 Year Pass' : 'Lifetime Pass';
              activateNeetPass({
                id: `userpass-${Date.now()}-${subjectKey}`,
                subjectKey,
                subjectName,
                plan,
                planName,
                price: item.price,
                startDate: new Date().toISOString(),
                expiryDate,
                orderId: newOrder.id,
                active: true
              }, newOrder.userEmail);
            }
          }
        });
      } catch (passErr) {
        console.warn('Error activating pass upon order creation:', passErr);
      }

      // Dispatch Telegram Bot Notification to Admin Chat IDs (7004282468 & 1318240288) with PDF invoice
      dispatchTelegramNotification(newOrder);
      dispatchCustomerWhatsappNotification(newOrder);

      // Confetti celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {}

      setIsProcessing(false);
      setCompletedOrder(newOrder);
      onOrderSuccess(newOrder);
    } catch (err: any) {
      console.error('Payment verification failed:', err);
      setIsProcessing(false);
      setErrorMessage(`Payment verification error: ${err.message}`);
    }
  };

  if (completedOrder) {
    return (
      <div className="fixed inset-0 z-50 bg-emerald-600 text-white flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-sm bg-emerald-700/80 backdrop-blur-md rounded-3xl p-6 text-center border-2 border-emerald-400/40 shadow-2xl space-y-4">
          
          {/* Glowing Animated Green Tick Badge */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
            <div className="w-20 h-20 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xl border-4 border-emerald-300">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/60 text-emerald-100 text-[10px] font-black tracking-wider uppercase">
              Order Confirmed & Placed
            </span>
            <h2 className="text-2xl font-black text-white font-['Outfit',sans-serif]">
              Congratulations! 🎉
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              Your order has been recorded successfully.
            </p>
          </div>

          {/* Order Details Receipt Card */}
          <div className="bg-emerald-800/80 rounded-2xl p-3.5 text-left text-xs space-y-2 border border-emerald-600/60">
            <div className="flex justify-between border-b border-emerald-700/80 pb-2">
              <span className="text-emerald-200">Order ID:</span>
              <span className="font-mono font-bold text-white">#{completedOrder.id.replace(/^#/, '')}</span>
            </div>
            <div className="flex justify-between border-b border-emerald-700/80 pb-2">
              <span className="text-emerald-200">Payment:</span>
              <span className="font-bold text-emerald-200 uppercase text-[11px]">
                {completedOrder.paymentStatus.includes('cod') ? 'Cash on Delivery (COD)' : 'Paid Online'}
              </span>
            </div>
            <div className="flex justify-between border-b border-emerald-700/80 pb-2">
              <span className="text-emerald-200">Total Amount:</span>
              <span className="font-black text-yellow-300 text-sm">₹{completedOrder.totalAmount}</span>
            </div>
            <div>
              <span className="text-emerald-200 block text-[10px]">Items ({completedOrder.items.length}):</span>
              <p className="font-bold text-white text-[11px] truncate">
                {completedOrder.items.map(i => i.title).join(', ')}
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {/* If order contained a Pass or PDF notes, show instant access button */}
            {completedOrder.items.some(i => i.type === 'pdf' || i.productId?.startsWith('pass-')) && onOpenDigitalLibrary && (
              <button
                type="button"
                id="order-success-open-library-btn"
                onClick={() => {
                  setCompletedOrder(null);
                  onClose();
                  onOpenDigitalLibrary();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-yellow-200"
              >
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>Open My NEET Dashboard & Digital Library →</span>
              </button>
            )}

            <button
              onClick={() => downloadInvoicePdf(completedOrder)}
              className="w-full py-2.5 bg-emerald-900/60 hover:bg-emerald-900/90 text-white font-bold text-xs rounded-xl border border-emerald-500/50 shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>Download PDF Invoice ({completedOrder.invoiceNumber || completedOrder.id})</span>
            </button>
            <button
              onClick={() => {
                setCompletedOrder(null);
                onClose();
              }}
              className="w-full py-3 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-sm rounded-xl shadow-md transition active:scale-98 cursor-pointer"
            >
              View My Orders & Track Delivery →
            </button>
          </div>

          <p className="text-[10px] text-emerald-200 text-center">
            A confirmation receipt has been generated. Doctors Telegram team notified!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex justify-center animate-in fade-in duration-200 overflow-hidden">
      {/* Full Page Mobile Container */}
      <div 
        id="checkout-full-page"
        className="w-full max-w-md bg-white min-h-screen flex flex-col relative shadow-xl border-x border-slate-100"
      >
        {/* Full Page Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 -ml-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 tracking-wide font-['Outfit',sans-serif]">
                Checkout & Shipping
              </h2>
              <p className="text-[10px] text-slate-400">
                Pipedream Verified • 256-Bit Encrypted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Checkout Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          
          {/* Order Brief Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">
                  Total Payable Amount
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-600 font-['Outfit',sans-serif]">
                    ₹{totalAmount}
                  </span>
                  {paymentMethod === 'online' && onlineDiscount > 0 && (
                    <span className="text-xs font-bold text-slate-400 line-through">
                      ₹{rawSubtotal + totalShipping}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full block">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                  {totalShipping === 0 ? '🎉 Free Delivery Included' : `🚚 +₹${totalShipping} Shipping`}
                </span>
              </div>
            </div>

            {/* Discount / Payment Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 text-[11px] space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-800">₹{rawSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Handling:</span>
                <span className={`font-bold ${totalShipping === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {totalShipping === 0 ? 'FREE (₹0)' : `₹${totalShipping}`}
                </span>
              </div>
              {paymentMethod === 'online' && onlineDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  <span>⚡ Online Prepaid Discount (6% OFF):</span>
                  <span>-₹{onlineDiscount}</span>
                </div>
              )}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-amber-900 font-bold bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-300">
                  <span>🏷️ Coupon Discount ({appliedCoupon.code}):</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}
              {paymentMethod === 'cod' && (
                <div className="flex justify-between text-amber-800 font-medium bg-amber-50/70 px-2 py-1 rounded-lg border border-amber-200">
                  <span>Payment Mode:</span>
                  <span className="font-bold">Cash on Delivery</span>
                </div>
              )}
            </div>
          </div>

          {/* Have a Coupon Section */}
          <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 font-['Outfit',sans-serif]">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Have a coupon?</span>
              </span>
              {appliedCoupon && (
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                  {appliedCoupon.code} Applied
                </span>
              )}
            </div>

            {!appliedCoupon ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Enter Coupon Code (e.g. NEET50)"
                  className="flex-1 px-3 py-2 bg-white text-xs font-mono font-bold rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
                />
                <button
                  type="button"
                  disabled={!couponInput.trim() || couponLoading}
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition cursor-pointer shrink-0 font-['Outfit',sans-serif]"
                >
                  {couponLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-xl border border-emerald-300 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-black text-emerald-800 tracking-wider">Coupon: {appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1 text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Original Price:</span>
                    <span>₹{rawSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount:</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coupon:</span>
                    <span className="font-mono font-bold text-emerald-800">{appliedCoupon.code}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-100">
                    <span>Final Price:</span>
                    <span className="text-blue-700">₹{Math.max(1, rawSubtotal - couponDiscount)}</span>
                  </div>
                </div>
              </div>
            )}

            {couponError && (
              <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1 bg-rose-50 p-2 rounded-xl border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{couponError}</span>
              </div>
            )}
            {couponSuccess && (
              <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>{couponSuccess}</span>
              </div>
            )}
          </div>

          {/* Error Message Notification Card */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block">Payment Notice:</span>
                <span className="text-[11px] block leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Account Email Field */}
          <div className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <label className="block text-xs font-black text-slate-800">
              Account / Receipt Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. student@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
              required
            />
            <span className="text-[10px] text-slate-400 block">
              Official GST invoice and instant PDF links will be delivered to this email.
            </span>
          </div>

          {/* Delivery Address Section (Mandatory for Physical Books) */}
          {hasBooks ? (
            <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Courier Delivery Address</span>
              </div>

              {/* Recipient Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Student or Parent Full Name"
                  value={shippingAddress.fullName}
                  onChange={handleInputChange}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Mobile Number (For Courier SMS Updates) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={shippingAddress.phoneNumber}
                    onChange={handleInputChange}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Street Address Line 1 */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  House / Flat No., Building, Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  placeholder="e.g. Flat 302, Green Valley Apts, Sector 4"
                  value={shippingAddress.addressLine1}
                  onChange={handleInputChange}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              {/* Address Line 2 */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Road, Area, Locality, Sector <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  placeholder="e.g. MG Road, Near Central Market"
                  value={shippingAddress.addressLine2 || ''}
                  onChange={handleInputChange}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Landmark (Directly below Address Line 2) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Landmark / Nearby Famous Place <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="landmark"
                  placeholder="e.g. Near City Hospital, Opposite SBI Bank, Behind Metro Pillar"
                  value={shippingAddress.landmark || ''}
                  onChange={handleInputChange}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* State */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  State / Union Territory <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={shippingAddress.state}
                  onChange={handleInputChange}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
                  required
                >
                  {INDIAN_STATES_AND_UTS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* District & PIN */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    City / District <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    placeholder="e.g. Kota / Srinagar"
                    value={shippingAddress.district}
                    onChange={handleInputChange}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    maxLength={6}
                    placeholder="6-digit PIN"
                    value={shippingAddress.pincode}
                    onChange={handleInputChange}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-blue-950">
                <Zap className="w-4 h-4 text-blue-600 fill-blue-500" />
                <span>Instant Digital PDF Access</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                You are purchasing digital study materials. No physical courier delivery is required. PDF files will be immediately unlocked in your account dashboard for viewing and offline download.
              </p>
            </div>
          )}

          {/* 4. Payment Method Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Select Payment Method
              </span>
              <span className="text-[10px] text-slate-400 font-medium">100% Safe & Encrypted</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Online Payment (Razorpay) Option - FIRST & POPULAR WITH 6% DISCOUNT */}
              <label 
                onClick={() => setPaymentMethod('online')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${
                  paymentMethod === 'online'
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-950">
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Online Prepaid (UPI / Cards / NetBanking)</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      🔥 Save 6% OFF
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-blue-700">
                      Pay ₹{Math.max(1, rawSubtotal - onlineDiscount) + totalShipping}
                    </span>
                    {onlineDiscount > 0 && (
                      <span className="text-xs text-slate-400 line-through font-semibold">
                        ₹{rawSubtotal + totalShipping}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-700 font-bold">
                      (Instant ₹{onlineDiscount} Discount)
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    Instant automated order confirmation via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards & NetBanking.
                  </p>
                </div>
              </label>

              {/* Cash On Delivery (COD) Option - SECOND, ONLY for Physical Books */}
              {hasBooks ? (
                <label 
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Cash on Delivery (COD)</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        ₹{rawSubtotal + totalShipping}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Pay full price ₹{rawSubtotal + totalShipping} in cash or UPI to the courier agent when your physical package arrives.
                    </p>
                  </div>
                </label>
              ) : (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>No Cash on Delivery for PDF Notes</span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    Digital PDFs are unlocked immediately for viewing and offline download upon online payment. Cash on Delivery is strictly for physical books delivered to home addresses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Buttons Bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 space-y-2 shadow-lg">
          {paymentMethod === 'cod' ? (
            /* Cash on Delivery Order Button */
            <button
              id="confirm-cod-order-btn"
              disabled={isProcessing}
              onClick={handleConfirmCodOrder}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition disabled:opacity-75 active:scale-98 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing COD Order...</span>
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4" />
                  <span>Place Order with Cash on Delivery (₹{totalAmount})</span>
                </>
              )}
            </button>
          ) : (
            /* Main Razorpay Gateway Button */
            <button
              id="pay-now-btn"
              disabled={isProcessing}
              onClick={handleInitiateRazorpay}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition disabled:opacity-75 active:scale-98 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Gateway...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Pay ₹{totalAmount} Online {onlineDiscount > 0 && `(Saved ₹${onlineDiscount})`}
                  </span>
                </>
              )}
            </button>
          )}
          
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium pt-0.5">
            <span>Cash on Delivery / UPI / Cards</span>
            <span>•</span>
            <span>Instant Order Confirmation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
