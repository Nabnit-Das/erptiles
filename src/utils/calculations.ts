import type { BillItem, Invoice, BusinessProfile, Customer } from '../types/erp.ts';

/**
 * Tile Box Calculator:
 * Calculates required boxes from room dimensions or direct sq.ft + wastage %.
 * Always rounds UP to full boxes (Math.ceil) because partial boxes cannot be sold.
 */
export function calculateTileBoxes(
  sqftInput: number,
  sqftPerBox: number,
  wastagePercent: number = 0
): {
  requiredSqft: number;
  totalWithWastage: number;
  boxesNeeded: number;
  actualBilledSqft: number;
} {
  const safeSqft = Math.max(0, Number(sqftInput) || 0);
  const safePerBox = Number(sqftPerBox) > 0 ? Number(sqftPerBox) : 16;
  const safeWastage = Math.max(0, Number(wastagePercent) || 0);

  const totalWithWastage = Number((safeSqft * (1 + safeWastage / 100)).toFixed(2));
  const boxesNeeded = totalWithWastage > 0 ? Math.ceil(totalWithWastage / safePerBox) : 0;
  const actualBilledSqft = Number((boxesNeeded * safePerBox).toFixed(2));

  return {
    requiredSqft: safeSqft,
    totalWithWastage,
    boxesNeeded,
    actualBilledSqft,
  };
}

/**
 * Slab Calculator:
 * Length (ft) * Width (ft) * Slab Count
 */
export function calculateSlabSqft(
  lengthFt: number,
  widthFt: number,
  slabCount: number = 1
): number {
  const l = Math.max(0, Number(lengthFt) || 0);
  const w = Math.max(0, Number(widthFt) || 0);
  const count = Math.max(0, Number(slabCount) || 0);
  return Number((l * w * count).toFixed(2));
}

/**
 * Recalculate a single BillItem's taxable value, GST, and row total
 */
export function calculateItemRow(item: Partial<BillItem>, isGstInvoice: boolean = true): BillItem {
  const calcMode = item.calcMode || 'Tile_Box_Calc';
  const sqftPerBox = Number(item.sqftPerBox) > 0 ? Number(item.sqftPerBox) : 16;
  const rate = Math.max(0, Number(item.rate) || 0);
  const discountAmount = Math.max(0, Number(item.discountAmount) || 0);
  const gstPercent = isGstInvoice ? (Number(item.gstPercent) || 18) : 0;

  let boxesBilled = Number(item.boxesBilled) || 0;
  let actualTotalSqft = Number(item.actualTotalSqft) || 0;
  let requiredSqft = Number(item.requiredSqft) || 0;

  if (calcMode === 'Tile_Box_Calc') {
    if (item.roomLengthFt && item.roomWidthFt) {
      const roomSqft = Number((item.roomLengthFt * item.roomWidthFt).toFixed(2));
      requiredSqft = roomSqft;
    }
    const tileRes = calculateTileBoxes(requiredSqft, sqftPerBox, item.wastagePercent || 0);
    boxesBilled = tileRes.boxesNeeded;
    actualTotalSqft = tileRes.actualBilledSqft;
  } else if (calcMode === 'Slab_Calc') {
    actualTotalSqft = calculateSlabSqft(
      item.slabLengthFt || 0,
      item.slabWidthFt || 0,
      item.slabCount || 1
    );
    boxesBilled = item.slabCount || 1;
  } else {
    // Standard Qty (adhesives, grout, sanitary)
    boxesBilled = Math.max(1, Math.round(Number(item.boxesBilled) || 1));
    actualTotalSqft = boxesBilled;
  }

  // Calculate gross before discount
  let grossAmount = 0;
  if (item.pricingUnit === 'per_sqft') {
    grossAmount = actualTotalSqft * rate;
  } else {
    // per_box or per_piece
    grossAmount = boxesBilled * rate;
  }

  const taxableAmount = Math.max(0, Number((grossAmount - discountAmount).toFixed(2)));
  
  let cgstAmount = 0;
  let sgstAmount = 0;
  if (isGstInvoice && gstPercent > 0) {
    const halfRate = gstPercent / 2;
    cgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
    sgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
  }

  const totalAmount = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));

  return {
    id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productId: item.productId || '',
    productName: item.productName || 'Unnamed Item',
    roomTag: item.roomTag || 'General Area',
    calcMode,
    hsnCode: item.hsnCode || '6907',
    sizeLabel: item.sizeLabel || 'Standard',
    batchShadeNo: item.batchShadeNo || 'Standard Batch',
    sqftPerBox,
    roomLengthFt: item.roomLengthFt,
    roomWidthFt: item.roomWidthFt,
    wastagePercent: item.wastagePercent || 0,
    requiredSqft,
    boxesBilled,
    actualTotalSqft,
    slabLengthFt: item.slabLengthFt,
    slabWidthFt: item.slabWidthFt,
    slabCount: item.slabCount,
    pricingUnit: item.pricingUnit || 'per_sqft',
    rate,
    discountAmount,
    taxableAmount,
    gstPercent,
    cgstAmount,
    sgstAmount,
    totalAmount,
    deliveredQty: item.deliveredQty || 0,
  };
}

/**
 * Calculates entire Invoice Summary totals
 */
export function calculateInvoiceSummary(
  items: BillItem[],
  transportCharges: number = 0,
  overallDiscount: number = 0,
  applyRoundOff: boolean = true,
  isGstInvoice: boolean = true
) {
  const totalBoxes = items.reduce((sum, it) => sum + (it.boxesBilled || 0), 0);
  const totalSqft = Number(items.reduce((sum, it) => sum + (it.actualTotalSqft || 0), 0).toFixed(2));
  const taxableSubtotal = Number(items.reduce((sum, it) => sum + (it.taxableAmount || 0), 0).toFixed(2));
  
  let cgstTotal = 0;
  let sgstTotal = 0;
  if (isGstInvoice) {
    cgstTotal = Number(items.reduce((sum, it) => sum + (it.cgstAmount || 0), 0).toFixed(2));
    sgstTotal = Number(items.reduce((sum, it) => sum + (it.sgstAmount || 0), 0).toFixed(2));
  }

  const transport = Math.max(0, Number(transportCharges) || 0);
  const discount = Math.max(0, Number(overallDiscount) || 0);

  const rawGrandTotal = taxableSubtotal + cgstTotal + sgstTotal + transport - discount;
  let roundOff = 0;
  let grandTotal = rawGrandTotal;

  if (applyRoundOff) {
    grandTotal = Math.round(rawGrandTotal);
    roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
  } else {
    grandTotal = Number(rawGrandTotal.toFixed(2));
  }

  return {
    totalBoxes,
    totalSqft,
    taxableSubtotal,
    cgstTotal,
    sgstTotal,
    transportCharges: transport,
    overallDiscount: discount,
    roundOff,
    grandTotal: Math.max(0, grandTotal),
  };
}

/**
 * Convert number to Indian Rupees in words (Lakhs, Crores format)
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  if (!num || isNaN(num)) return '';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanOneThousand(n: number): string {
    let result = '';
    if (n >= 100) {
      result += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += a[n] + ' ';
    }
    return result.trim();
  }

  const integerPart = Math.floor(Math.abs(num));
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  let words = '';
  if (crore > 0) {
    words += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertLessThanOneThousand(remainder) + ' ';
  }

  const result = words.trim() + ' Rupees Only';
  return result.replace(/\s+/g, ' ');
}

/**
 * Format currency with Indian Comma System (₹ 1,50,000)
 */
export function formatIndianCurrency(amount: number): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Generate GSTR-1 Sales Register CSV string
 */
export function generateGstr1Csv(invoices: Invoice[]): string {
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Document Type',
    'Customer Name',
    'Phone',
    'Locality/Place of Supply',
    'GSTIN',
    'HSN Codes',
    'Total Boxes',
    'Total Sq.Ft',
    'Taxable Subtotal',
    'CGST (9%)',
    'SGST (9%)',
    'Transport / Loading',
    'Discount',
    'Round Off',
    'Invoice Value (Grand Total)',
    'Amount Received',
    'Balance Due',
    'Payment Mode',
    'Referrer Name'
  ];

  const rows = invoices.map(inv => {
    const hsnSet = Array.from(new Set(inv.items.map(it => it.hsnCode).filter(Boolean))).join('; ');
    return [
      `"${inv.invoiceNo}"`,
      `"${inv.date}"`,
      `"${inv.docType}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      `"${inv.customerPhone}"`,
      `"${inv.customerLocality.replace(/"/g, '""')}"`,
      `"${inv.customerGstin || 'URP (Unregistered)'}"`,
      `"${hsnSet}"`,
      inv.totalBoxes,
      inv.totalSqft,
      inv.taxableSubtotal.toFixed(2),
      inv.cgstTotal.toFixed(2),
      inv.sgstTotal.toFixed(2),
      inv.transportCharges.toFixed(2),
      inv.overallDiscount.toFixed(2),
      inv.roundOff.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.amountReceived.toFixed(2),
      inv.balanceDue.toFixed(2),
      `"${inv.paymentMethod}"`,
      `"${(inv.referrerName || 'Direct / None').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate WhatsApp share message for Quotation or Tax Invoice
 */
export function generateWhatsAppMessage(invoice: Invoice, business: BusinessProfile): string {
  const isInvoice = invoice.docType === 'TAX_INVOICE';
  const title = isInvoice ? 'GST TAX INVOICE' : 'QUOTATION / ESTIMATE';
  
  let msg = `*${business.name}*\n`;
  msg += `${business.slogan}\n`;
  msg += `📍 ${business.addressLine1}, ${business.city}, Odisha\n`;
  msg += `📞 Ph: ${business.phone}\n`;
  msg += `------------------------------------\n`;
  msg += `📋 *${title}*: #${invoice.invoiceNo}\n`;
  msg += `📅 Date: ${invoice.date}\n`;
  msg += `👤 Customer: *${invoice.customerName}* (${invoice.customerLocality})\n`;
  msg += `------------------------------------\n`;
  msg += `*ROOM-WISE ITEM BREAKDOWN:*\n`;

  invoice.items.forEach((it, idx) => {
    msg += `\n${idx + 1}. *${it.roomTag}* - ${it.productName}\n`;
    msg += `   • Size: ${it.sizeLabel} | Shade: ${it.batchShadeNo}\n`;
    if (it.calcMode === 'Tile_Box_Calc') {
      msg += `   • Qty: *${it.boxesBilled} Boxes* (${it.actualTotalSqft} Sq.Ft) @ ₹${it.rate}/${it.pricingUnit === 'per_sqft' ? 'sqft' : 'box'}\n`;
    } else if (it.calcMode === 'Slab_Calc') {
      msg += `   • Slabs: ${it.slabCount || 1} Pcs (${it.actualTotalSqft} Sq.Ft) @ ₹${it.rate}/sqft\n`;
    } else {
      msg += `   • Qty: ${it.boxesBilled} Pcs/Bags @ ₹${it.rate}/pc\n`;
    }
    msg += `   • Amount: ₹${it.totalAmount.toLocaleString('en-IN')}\n`;
  });

  msg += `\n------------------------------------\n`;
  msg += `📦 *Total Boxes Billed:* ${invoice.totalBoxes} Boxes\n`;
  msg += `📐 *Total Area:* ${invoice.totalSqft} Sq.Ft\n`;
  if (isInvoice) {
    msg += `💵 Taxable Subtotal: ₹${invoice.taxableSubtotal.toLocaleString('en-IN')}\n`;
    msg += `🏛️ CGST + SGST (18%): ₹${(invoice.cgstTotal + invoice.sgstTotal).toLocaleString('en-IN')}\n`;
  }
  if (invoice.transportCharges > 0) {
    msg += `🚚 Transport/Loading: ₹${invoice.transportCharges.toLocaleString('en-IN')}\n`;
  }
  msg += `💰 *GRAND TOTAL:* *₹${invoice.grandTotal.toLocaleString('en-IN')}*\n`;
  msg += `✅ Amount Paid: ₹${invoice.amountReceived.toLocaleString('en-IN')}\n`;
  
  if (invoice.balanceDue > 0) {
    msg += `⚠️ *Balance Due:* *₹${invoice.balanceDue.toLocaleString('en-IN')}*\n`;
  } else {
    msg += `🎉 *Payment Status: Fully Paid*\n`;
  }

  msg += `\n🏦 *Bank & UPI Details for Payment:*\n`;
  msg += `• Bank: ${business.bankName}\n`;
  msg += `• A/C No: ${business.accountNumber}\n`;
  msg += `• IFSC: ${business.ifscCode}\n`;
  msg += `• UPI ID: ${business.upiId}\n\n`;
  msg += `_Thank you for trusting Shirdi Sai Marbles & Tiles! Visit us again._`;

  return msg;
}

/**
 * Generate Odia + English Payment Reminder for Customer Khata
 */
export function generatePaymentReminderWhatsApp(customer: Customer, business: BusinessProfile): string {
  let msg = `*PAYMENT REMINDER | ବକେୟା ଟଙ୍କା ପୈଠ ସୂଚନା*\n`;
  msg += `*${business.name}*\n`;
  msg += `📍 Gariapur, Medical Road, Jajpur Town\n`;
  msg += `📞 ${business.phone}\n\n`;
  msg += `Namaskar *${customer.name}* Babu,\n`;
  msg += `This is a gentle reminder regarding your outstanding bill balance with us.\n\n`;
  msg += `ଆପଣଙ୍କର *Shirdi Sai Marbles & Tiles* ରେ ବକେୟା (Dues) ଥିବା ଟଙ୍କା ବିବରଣୀ:\n`;
  msg += `• Total Billed: ₹${customer.totalBilled.toLocaleString('en-IN')}\n`;
  msg += `• Total Paid So Far: ₹${customer.totalPaid.toLocaleString('en-IN')}\n`;
  msg += `• *Pending Balance Due: ₹${customer.balanceDue.toLocaleString('en-IN')}*\n\n`;
  msg += `ଦୟାକରି ଏହି ବକେୟା ଟଙ୍କା Cash, UPI କିମ୍ବା Bank Transfer ମାଧ୍ୟମରେ ପୈଠ କରିବାକୁ ଅନୁରୋଧ।\n\n`;
  msg += `📲 *Pay via UPI:* ${business.upiId}\n`;
  msg += `🏦 *A/C:* ${business.accountNumber} | IFSC: ${business.ifscCode}\n\n`;
  msg += `Any clarification? Call us on ${business.phone}. Thank you! 🙏`;
  return msg;
}
