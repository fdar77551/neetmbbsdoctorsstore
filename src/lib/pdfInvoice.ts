import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { drawCode128Barcode, drawQrCodeMatrix } from './barcodeGenerator';
import { getStoredStoreConfig, DEFAULT_STORE_CONFIG } from './storage';

/**
 * Builds scannable QR payload containing Customer Details and Order Details
 */
export function buildCustomerOrderQrPayload(order: any): string {
  const rawOrderId = String(order.id || order.orderId || 'NMD-ORDER').replace(/^#/, '');
  const invoiceNo = order.invoiceNumber || rawOrderId.replace(/^NMD-/, 'INV-');
  const customerName = order.userName || order.customer?.name || order.shippingAddress?.fullName || 'NEET Aspirant';
  const customerPhone = order.shippingAddress?.phoneNumber || order.customer?.contact || 'N/A';
  const customerEmail = order.userEmail || order.customer?.email || 'aspirant@gmail.com';
  
  let addressStr = 'Instant Digital PDF Access';
  if (order.shippingAddress) {
    const s = order.shippingAddress;
    const parts = [
      `${s.addressLine1 || ''} ${s.addressLine2 || ''}`.trim(),
      s.district,
      s.state,
      s.pincode ? `PIN: ${s.pincode}` : '',
      'India'
    ].filter(Boolean);
    addressStr = parts.join(', ');
  }

  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items.map((i: any) => `${i.title || i.name} (Qty: ${i.quantity || 1})`).join('; ')
    : (order.productName || 'NEET Medical Study Material');

  const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod') || 
                String(order.paymentStatus || '').toLowerCase().includes('cash');

  return `NEETMBBS DOCTORS STORE - INVOICE
Order ID: ${rawOrderId}
Invoice No: ${invoiceNo}
Order Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}

CUSTOMER DETAILS:
Name: ${customerName}
Phone: ${customerPhone}
Email: ${customerEmail}
Address: ${addressStr}

ORDER SUMMARY:
Items: ${items}
Total Amount: Rs. ${Number(order.totalAmount || order.price || 0).toFixed(2)}
Payment: ${isCod ? 'Cash on Delivery (COD) | PENDING' : 'Razorpay (UPI) | PAID ONLINE'}
Verification: Official Store Order Verified`;
}

/**
 * Draws the official NEET MBBS DOCTORS STORE vector brand logo badge (Right).
 */
function drawStoreBrandBadge(doc: jsPDF, x: number, y: number): void {
  // Rounded container box
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.8);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, 78, 62, 4, 4, 'FD');

  // Navy left book leaf
  doc.setFillColor(11, 37, 69); // #0B2545
  doc.roundedRect(x + 16, y + 10, 20, 26, 2, 2, 'F');

  // Teal right book leaf
  doc.setFillColor(13, 148, 136); // #0D9488
  doc.roundedRect(x + 40, y + 10, 20, 26, 2, 2, 'F');

  // Page separator & lines
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.line(x + 38, y + 10, x + 38, y + 36);

  doc.setLineWidth(0.6);
  doc.line(x + 20, y + 16, x + 32, y + 16);
  doc.line(x + 20, y + 22, x + 32, y + 22);
  doc.line(x + 20, y + 28, x + 32, y + 28);

  doc.line(x + 44, y + 16, x + 56, y + 16);
  doc.line(x + 44, y + 22, x + 56, y + 22);
  doc.line(x + 44, y + 28, x + 56, y + 28);

  // Cross emblem
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 36.5, y + 19, 3, 10, 'F');
  doc.rect(x + 33, y + 22.5, 10, 3, 'F');

  // Text below badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(11, 37, 69);
  doc.text('NEETMBBS DOCTORS', x + 39, y + 46, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setTextColor(13, 148, 136);
  doc.text('OFFICIAL STORE', x + 39, y + 54, { align: 'center' });
}

export function renderInvoicePage(doc: jsPDF, order: any, pageIndex: number = 0): void {
  if (pageIndex > 0) {
    doc.addPage('a4', 'portrait');
  }

  const storeConfig = getStoredStoreConfig() || DEFAULT_STORE_CONFIG;
  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const margin = 32;
  const contentWidth = pageWidth - margin * 2; // 531.28 pt

  const isCod = String(order.paymentStatus || '').toLowerCase().includes('cod') || 
                String(order.paymentStatus || '').toLowerCase().includes('cash');

  const rawOrderId = String(order.id || order.orderId || `NMD-20260822-0001`).replace(/^#/, '');
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

  const customerName = order.userName || order.customer?.name || order.shippingAddress?.fullName || 'Valued Aspirant';
  const customerPhone = order.shippingAddress?.phoneNumber || order.customer?.contact || '9876543210';
  const customerEmail = order.userEmail || order.customer?.email || (storeConfig.supportEmails[0] || 'support@neetmbbsdoctors.store');

  // ================= 1. HEADER SECTION (Left, Center, Right) =================
  const headerTopY = 28;

  // 1A. Left: Store Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(11, 37, 69); // #0B2545 Dark Navy
  doc.text('NEETMBBS', margin, headerTopY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(13, 148, 136); // #0D9488 Teal Green
  doc.text('DOCTORS STORE', margin, headerTopY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Your Trusted Store for NEET Preparation', margin, headerTopY + 44);

  // 1B. Center: INVOICE Title & Metadata Table
  const centerBlockX = margin + 175;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(11, 37, 69);
  doc.text('INVOICE', centerBlockX, headerTopY + 12);

  let metaY = headerTopY + 23;
  const metaGap = 9.5;

  const drawMetaLine = (label: string, val: string, isStatus: boolean = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, centerBlockX, metaY);
    doc.text(':', centerBlockX + 60, metaY);

    if (isStatus) {
      if (isCod) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9); // Amber
        doc.text('Cash on Delivery (COD) | PENDING', centerBlockX + 68, metaY);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105); // Emerald Green
        doc.text('Razorpay (UPI) | PAID', centerBlockX + 68, metaY);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(val, centerBlockX + 68, metaY);
    }
    metaY += metaGap;
  };

  drawMetaLine('Invoice No.', invoiceNo);
  drawMetaLine('Order ID', rawOrderId);
  drawMetaLine('Order Date', orderDateStr);
  drawMetaLine('Payment', '', true);

  // 1C. Right: Store Logo Badge
  const badgeX = pageWidth - margin - 78;
  drawStoreBrandBadge(doc, badgeX, headerTopY);

  // ================= 2. CUSTOMER DETAILS (LEFT) & SHIPPING DETAILS (RIGHT) =================
  const detailsY = headerTopY + 64;
  const boxWidth = (contentWidth - 10) / 2;

  const leftBoxX = margin;
  const rightBoxX = margin + boxWidth + 10;

  // Prepare full address strings for left and right
  let billingAddrStr = 'Instant Digital PDF Access (Online Account Library)';
  if (order.shippingAddress) {
    const s = order.shippingAddress;
    const parts = [
      s.addressLine1 || '',
      s.addressLine2 || '',
      s.landmark ? `Near: ${s.landmark}` : '',
      s.district ? `${s.district}, ` : '',
      `${s.state || ''} - ${s.pincode || ''}`,
      'India'
    ].filter(Boolean);
    billingAddrStr = parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  let shippingAddrLines: string[] = [];
  if (order.shippingAddress) {
    const s = order.shippingAddress;
    const street = [s.addressLine1 || '', s.addressLine2 || '', s.landmark ? `(Near: ${s.landmark})` : ''].filter(Boolean).join(' ').trim();
    const cityState = `${s.district ? `${s.district}, ` : ''}${s.state || ''} - ${s.pincode || ''}, India`;
    const fullShipping = `Address: ${street} ${cityState}`.trim();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    shippingAddrLines = doc.splitTextToSize(fullShipping, boxWidth - 20);
  } else {
    shippingAddrLines = [
      'Instant Digital Delivery (PDF Notes)',
      'Unlocked immediately in student account library'
    ];
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const billingAddrLines = doc.splitTextToSize(`Address: ${billingAddrStr}`, boxWidth - 20);

  const maxAddrLines = Math.max(billingAddrLines.length, shippingAddrLines.length, 2);
  const detailsBoxH = Math.max(72, 48 + maxAddrLines * 9.5);

  // Left Box: BILLING / CUSTOMER DETAILS
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftBoxX, detailsY, boxWidth, detailsBoxH, 4, 4, 'FD');

  // Left Box Header Strip
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(leftBoxX, detailsY, boxWidth, 16, 4, 4, 'F');
  doc.rect(leftBoxX, detailsY + 10, boxWidth, 6, 'F'); // square bottom of strip

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 37, 69);
  doc.text('BILLING / CUSTOMER DETAILS', leftBoxX + 10, detailsY + 11);

  let cY = detailsY + 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${customerName}`, leftBoxX + 10, cY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${customerPhone}`, leftBoxX + boxWidth - 10, cY, { align: 'right' });

  cY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${customerEmail}`, leftBoxX + 10, cY);

  cY += 10;
  billingAddrLines.forEach((line: string) => {
    doc.text(line, leftBoxX + 10, cY);
    cY += 9;
  });

  // Right Box: SHIPPING ADDRESS
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightBoxX, detailsY, boxWidth, detailsBoxH, 4, 4, 'FD');

  // Right Box Header Strip
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightBoxX, detailsY, boxWidth, 16, 4, 4, 'F');
  doc.rect(rightBoxX, detailsY + 10, boxWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 37, 69);
  doc.text('SHIPPING ADDRESS', rightBoxX + 10, detailsY + 11);

  let sY = detailsY + 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${customerName}`, rightBoxX + 10, sY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${customerPhone}`, rightBoxX + boxWidth - 10, sY, { align: 'right' });

  sY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  if (order.shippingAddress) {
    shippingAddrLines.forEach((line: string) => {
      doc.text(line, rightBoxX + 10, sY);
      sY += 9;
    });
  } else {
    doc.setTextColor(13, 148, 136);
    doc.setFont('helvetica', 'bold');
    doc.text(shippingAddrLines[0] || 'Instant Digital Delivery', rightBoxX + 10, sY);
    sY += 9;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(shippingAddrLines[1] || 'Unlocked in student library', rightBoxX + 10, sY);
  }

  // ================= 4. PRODUCT TABLE =================
  let curY = detailsY + detailsBoxH + 12;

  // Table Header (Dark Navy)
  doc.setFillColor(11, 37, 69); // #0B2545
  doc.roundedRect(margin, curY, contentWidth, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 12, curY + 14);
  doc.text('PRODUCT', margin + 38, curY + 14);
  doc.text('QTY', margin + 325, curY + 14, { align: 'center' });
  doc.text('PRICE', margin + 415, curY + 14, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 12, curY + 14, { align: 'right' });

  curY += 22;

  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{
        title: order.productName || 'NEET Medical Study Material Handbook',
        author: 'NEET MBBS Doctors Faculty',
        type: 'book',
        quantity: order.quantity || 1,
        price: order.totalAmount || order.price || 599
      }];

  let subtotal = 0;

  items.forEach((item: any, idx: number) => {
    const itemQty = Number(item.quantity) || 1;
    const itemPrice = Number(item.price) || 0;
    const itemTotal = itemQty * itemPrice;
    subtotal += itemTotal;

    const rowHeight = 34;
    const isEven = idx % 2 === 0;

    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    }

    // Row border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margin, curY + rowHeight, pageWidth - margin, curY + rowHeight);

    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), margin + 12, curY + 19);

    // Product Title & Subtitle
    const itemTitle = String(item.title || 'NEET Study Material');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(itemTitle.length > 44 ? itemTitle.slice(0, 41) + '...' : itemTitle, margin + 38, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const categoryTag = item.type === 'pdf' ? 'English Medium • PDF Notes (Instant Digital)' : 'English Medium • Books (Physical Edition)';
    doc.text(categoryTag, margin + 38, curY + 25);

    // QTY
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(itemQty), margin + 325, curY + 19, { align: 'center' });

    // PRICE
    doc.text(`Rs. ${itemPrice.toFixed(2)}`, margin + 415, curY + 19, { align: 'right' });

    // TOTAL
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${itemTotal.toFixed(2)}`, pageWidth - margin - 12, curY + 19, { align: 'right' });

    curY += rowHeight;
  });

  // ================= 5. TOTALS CALCULATION SECTION =================
  const totalAmount = Number(order.totalAmount || subtotal);
  const shippingCost = Number(order.shippingCost ?? (order.shippingAmount ?? 0));
  const discount = Math.max(0, (subtotal + shippingCost) - totalAmount);

  const calcBlockX = pageWidth - margin - 190;
  let calcY = curY + 12;

  const renderCalcRow = (label: string, value: string, isBold: boolean = false, isGreen: boolean = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9.5 : 8.5);
    doc.setTextColor(isGreen ? 5 : (isBold ? 11 : 71), isGreen ? 150 : (isBold ? 37 : 85), isGreen ? 105 : (isBold ? 69 : 105));
    doc.text(label, calcBlockX, calcY);
    doc.text(value, pageWidth - margin - 12, calcY, { align: 'right' });
    calcY += 12;
  };

  renderCalcRow('Subtotal', `Rs. ${subtotal.toFixed(2)}`);
  renderCalcRow('Shipping', shippingCost === 0 ? 'Rs. 0.00 (Free)' : `Rs. ${shippingCost.toFixed(2)}`, false, shippingCost === 0);
  if (discount > 0) {
    renderCalcRow('Discount', `-Rs. ${discount.toFixed(2)}`, false, true);
  }

  // Divider above Grand Total
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(calcBlockX, calcY - 2, pageWidth - margin, calcY - 2);
  calcY += 4;

  renderCalcRow('GRAND TOTAL', `Rs. ${totalAmount.toFixed(2)}`, true);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('(Inclusive of all taxes)', pageWidth - margin - 12, calcY, { align: 'right' });
  calcY += 12;

  // ================= 5. BOTTOM 3-COLUMN BOX (Thanks + Barcode + QR Code) =================
  // Exactly 20px gap after the Grand Total block
  const bottomBoxY = calcY + 20;
  const bottomBoxHeight = 108;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.setFillColor(252, 253, 255);
  doc.roundedRect(margin, bottomBoxY, contentWidth, bottomBoxHeight, 4, 4, 'FD');

  const col1W = 185;
  const col2W = 175;
  const col3W = contentWidth - col1W - col2W;

  const div1X = margin + col1W;
  const div2X = margin + col1W + col2W;

  // Vertical dividers
  doc.setDrawColor(226, 232, 240);
  doc.line(div1X, bottomBoxY + 8, div1X, bottomBoxY + bottomBoxHeight - 8);
  doc.line(div2X, bottomBoxY + 8, div2X, bottomBoxY + bottomBoxHeight - 8);

  // Column 1: Thank You Note
  doc.setFillColor(16, 185, 129); // Emerald Check Circle
  doc.circle(margin + 20, bottomBoxY + 22, 9, 'F');
  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('✓', margin + 17.5, bottomBoxY + 25.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Thank you for your order!', margin + 34, bottomBoxY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('We appreciate your trust in NEETMBBS Doctors Store.', margin + 12, bottomBoxY + 44);
  doc.text('Happy Learning & Best Wishes for your NEET Exam!', margin + 12, bottomBoxY + 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 37, 69);
  doc.text(`— Team ${storeConfig.storeName || 'NEETMBBS Doctors Store'}`, margin + 12, bottomBoxY + 76);

  // Column 2: Barcode (Order ID)
  // Scanning this barcode reveals the exact Order ID (NMD-YYYYMMDD-XXXX)
  const barCenterX = div1X + col2W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 37, 69);
  doc.text('SCAN / BARCODE (ORDER ID)', barCenterX, bottomBoxY + 18, { align: 'center' });

  const barW = 145;
  const barH = 38;
  const barX = barCenterX - barW / 2;
  const barY = bottomBoxY + 25;
  drawCode128Barcode(doc, rawOrderId, barX, barY, barW, barH);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(rawOrderId, barCenterX, bottomBoxY + 76, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan with Barcode Scanner for Order ID', barCenterX, bottomBoxY + 88, { align: 'center' });

  // Column 3: Scan QR to View Order & Customer Details
  // Scanning this QR code reveals full customer & order details
  const qrCenterX = div2X + col3W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 37, 69);
  doc.text('SCAN QR TO VIEW ORDER', qrCenterX, bottomBoxY + 18, { align: 'center' });

  const qrSize = 52;
  const qrX = qrCenterX - qrSize / 2;
  const qrY = bottomBoxY + 24;
  const qrPayload = buildCustomerOrderQrPayload(order);
  drawQrCodeMatrix(doc, qrPayload, qrX, qrY, qrSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(13, 148, 136);
  doc.text('Scan for Customer & Order Info', qrCenterX, bottomBoxY + 84, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Digital Tax Invoice', qrCenterX, bottomBoxY + 94, { align: 'center' });

  // ================= 6. PAYMENT METHOD STATUS BANNER =================
  const paymentFooterY = bottomBoxY + bottomBoxHeight + 10;
  const paymentFooterH = 22;

  doc.setFillColor(isCod ? 254 : 240, isCod ? 243 : 253, isCod ? 199 : 244); // amber-100 or emerald-50
  doc.roundedRect(margin, paymentFooterY, contentWidth, paymentFooterH, 3, 3, 'F');
  doc.setDrawColor(isCod ? 252 : 167, isCod ? 211 : 243, isCod ? 77 : 208);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, paymentFooterY, contentWidth, paymentFooterH, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (isCod) {
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text(`PAYMENT METHOD: CASH ON DELIVERY (COD) — Please collect Rs. ${totalAmount.toFixed(2)} in cash at time of delivery.`, pageWidth / 2, paymentFooterY + 14, { align: 'center' });
  } else {
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text(`PAYMENT STATUS: PAID ONLINE (Verified via Razorpay UPI/Netbanking) — Rs. ${totalAmount.toFixed(2)} received. No cash to collect.`, pageWidth / 2, paymentFooterY + 14, { align: 'center' });
  }

  // ================= 7. SUPPORT & STORE DETAILS FOOTER (BELOW PAYMENT STATUS) =================
  const footerY = paymentFooterY + paymentFooterH + 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.7);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  const supEmail = storeConfig.supportEmails[0] || 'fdar77551@gmail.com';
  const supPhone = storeConfig.supportPhones[0] || '+91 6005894110';
  const supWeb = storeConfig.websiteUrl || 'www.neetmbbsdoctors.store';
  const supTelegram = storeConfig.telegramUsername || '@neetmbbsdoctors';
  const supStoreName = storeConfig.storeName || 'NEETMBBS DOCTORS STORE';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(11, 37, 69);
  doc.text(supStoreName, pageWidth / 2, footerY + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const footerText = `Website: ${supWeb}   |   Support Email: ${supEmail}   |   Contact: ${supPhone}   |   Telegram: ${supTelegram}`;
  doc.text(footerText, pageWidth / 2, footerY + 23, { align: 'center' });
}

export function generateInvoicePdfDoc(order: any): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  renderInvoicePage(doc, order, 0);
  return doc;
}

export function generateInvoicePdfBlob(order: any): Blob {
  const doc = generateInvoicePdfDoc(order);
  return doc.output('blob');
}

export function downloadInvoicePdf(order: any, customFilename?: string): void {
  const doc = generateInvoicePdfDoc(order);
  const rawId = String(order.id || order.orderId || 'ORD').replace(/^#/, '');
  const filename = customFilename || `Invoice_${rawId}.pdf`;
  doc.save(filename);
}

// Batch Multi-Order Invoices System
export function generateCombinedInvoicesPdfDoc(orders: any[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const validOrders = Array.isArray(orders) && orders.length > 0 ? orders : [];
  if (validOrders.length === 0) {
    renderInvoicePage(doc, { id: 'EMPTY', totalAmount: 0 }, 0);
    return doc;
  }

  validOrders.forEach((order, index) => {
    renderInvoicePage(doc, order, index);
  });

  return doc;
}

export function downloadCombinedInvoicesPdf(orders: any[], customFilename?: string): void {
  const doc = generateCombinedInvoicesPdfDoc(orders);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Batch_Invoices_${orders.length}_Orders_${dateStr}.pdf`;
  doc.save(filename);
}

export async function sendBatchInvoicesToTelegram(
  orders: any[],
  customBotToken?: string,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; message: string; results?: any[] }> {
  if (!orders || orders.length === 0) {
    return { success: false, message: 'No orders selected for dispatch' };
  }

  const token = (customBotToken && customBotToken.trim()) || 
                localStorage.getItem('neetmbbs_telegram_token') || 
                '7876878891:AAHR8rM7QGqF-yQk667T0-h5_P9Zz2_t69A';

  const adminChatIds = ['7004282468', '1318240288'];

  if (onProgress) onProgress(`Generating combined ${orders.length}-page PDF document...`);

  const doc = generateCombinedInvoicesPdfDoc(orders);
  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  const filename = `Batch_Invoices_${orders.length}_Orders_${Date.now()}.pdf`;

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount || o.price || 0)), 0);
  const codCount = orders.filter(o => String(o.paymentStatus || '').toLowerCase().includes('cod')).length;
  const paidCount = orders.length - codCount;

  const captionText = 
`📦 <b>BATCH INVOICES PACKAGE (${orders.length} ORDERS)</b>
💰 <b>Total Value:</b> Rs. ${totalRevenue}
✅ <b>Paid Online:</b> ${paidCount} Orders
💵 <b>Cash on Delivery (COD):</b> ${codCount} Orders
📄 <i>All ${orders.length} official tax invoices compiled into this single multi-page PDF for instant printing.</i>`;

  if (onProgress) onProgress(`Sending combined PDF to Admin Telegram channels...`);

  try {
    const formData = new FormData();
    formData.append('document', pdfBlob, filename);
    formData.append('token', token);
    formData.append('caption', captionText);
    formData.append('ordersCount', String(orders.length));
    formData.append('totalRevenue', String(totalRevenue));

    const serverResp = await fetch('/api/telegram/send-batch-invoices', {
      method: 'POST',
      body: formData
    });

    if (serverResp.ok) {
      const data = await serverResp.json();
      if (data.success) {
        if (onProgress) onProgress(`Successfully delivered to Telegram!`);
        return { success: true, message: `Batch invoice PDF sent to Telegram successfully!`, results: data.results };
      }
    }
  } catch (e) {
    console.warn('Backend batch telegram notice, fallback to direct client dispatch:', e);
  }

  const results = [];
  for (const chatId of adminChatIds) {
    try {
      if (onProgress) onProgress(`Sending to admin chat ${chatId}...`);
      const directForm = new FormData();
      directForm.append('chat_id', chatId);
      directForm.append('document', pdfBlob, filename);
      directForm.append('caption', captionText);
      directForm.append('parse_mode', 'HTML');

      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: directForm
      });
      const data = await res.json();
      results.push({ chatId, ok: data.ok, description: data.description });
    } catch (chatErr: any) {
      results.push({ chatId, ok: false, error: chatErr.message });
    }
  }

  const anySuccess = results.some(r => r.ok);
  if (anySuccess) {
    return { success: true, message: `Batch invoice PDF sent to Telegram successfully!`, results };
  } else {
    return { success: false, message: `Could not send PDF to Telegram. Please verify bot permissions.`, results };
  }
}
