import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTileBoxes,
  calculateSlabSqft,
  calculateItemRow,
  calculateInvoiceSummary,
  numberToIndianWords,
  formatIndianCurrency,
  generateGstr1Csv
} from './calculations.ts';
import type { BillItem, Invoice } from '../types/erp.ts';

test('Mode A: Tile calculator converts sqft to full boxes with wastage', () => {
  // 200 sq.ft required, 16 sq.ft/box, 10% wastage = 220 sq.ft -> Math.ceil(220/16) = 14 boxes -> 224 actual sq.ft
  const result = calculateTileBoxes(200, 16, 10);
  assert.equal(result.requiredSqft, 200);
  assert.equal(result.totalWithWastage, 220);
  assert.equal(result.boxesNeeded, 14);
  assert.equal(result.actualBilledSqft, 224);
});

test('Mode A: Tile calculator handles exact multiple with 0% wastage', () => {
  // 160 sq.ft / 16 sqftPerBox = exactly 10 boxes
  const result = calculateTileBoxes(160, 16, 0);
  assert.equal(result.boxesNeeded, 10);
  assert.equal(result.actualBilledSqft, 160);
});

test('Mode B: Slab calculator computes total sqft correctly', () => {
  // 8 ft length * 4 ft width * 2 slabs = 64 sq.ft
  const sqft = calculateSlabSqft(8, 4, 2);
  assert.equal(sqft, 64);
});

test('Line item calculation handles per_sqft rate and 18% GST', () => {
  const itemInput: Partial<BillItem> = {
    calcMode: 'Tile_Box_Calc',
    requiredSqft: 100,
    sqftPerBox: 16,
    wastagePercent: 0, // 100 / 16 = 6.25 -> 7 boxes -> 112 sq.ft
    pricingUnit: 'per_sqft',
    rate: 50, // 112 * 50 = 5600
    discountAmount: 100, // taxable = 5500
    gstPercent: 18, // 9% CGST (495) + 9% SGST (495)
  };

  const calculated = calculateItemRow(itemInput, true);
  assert.equal(calculated.boxesBilled, 7);
  assert.equal(calculated.actualTotalSqft, 112);
  assert.equal(calculated.taxableAmount, 5500);
  assert.equal(calculated.cgstAmount, 495);
  assert.equal(calculated.sgstAmount, 495);
  assert.equal(calculated.totalAmount, 6490);
});

test('Invoice summary calculates subtotals, roundoff, and grand total', () => {
  const items: BillItem[] = [
    {
      id: '1',
      productId: 'p1',
      productName: 'Tile A',
      roomTag: 'Living',
      calcMode: 'Tile_Box_Calc',
      hsnCode: '6907',
      sizeLabel: '2x2',
      batchShadeNo: 'B-10',
      sqftPerBox: 16,
      boxesBilled: 10,
      actualTotalSqft: 160,
      pricingUnit: 'per_sqft',
      rate: 50,
      discountAmount: 0,
      taxableAmount: 8000,
      gstPercent: 18,
      cgstAmount: 720,
      sgstAmount: 720,
      totalAmount: 9440,
      deliveredQty: 0
    }
  ];

  const summary = calculateInvoiceSummary(items, 500, 100, true, true);
  // taxable = 8000, cgst = 720, sgst = 720, transport = 500, discount = 100
  // total = 8000 + 720 + 720 + 500 - 100 = 9840
  assert.equal(summary.taxableSubtotal, 8000);
  assert.equal(summary.cgstTotal, 720);
  assert.equal(summary.sgstTotal, 720);
  assert.equal(summary.grandTotal, 9840);
  assert.equal(summary.totalBoxes, 10);
});

test('numberToIndianWords correctly converts amounts into Indian Lakhs and Crores', () => {
  const words = numberToIndianWords(156400);
  assert.equal(words, 'One Lakh Fifty Six Thousand Four Hundred Rupees Only');

  const zeroWords = numberToIndianWords(0);
  assert.equal(zeroWords, 'Zero Rupees Only');
});

test('GSTR-1 CSV generator formats compliant columns', () => {
  const dummyInvoice: Invoice = {
    id: 'inv_1',
    invoiceNo: 'SSMT/2026-27/001',
    docType: 'TAX_INVOICE',
    date: '2026-10-15',
    customerId: 'c1',
    customerName: 'Pradeep Rout',
    customerPhone: '9861012345',
    customerLocality: 'Gariapur',
    customerGstin: '21ABCDE1234F1Z5',
    referrerName: 'Bikash Mistri',
    items: [{
      id: 'i1',
      productId: 'p1',
      productName: 'Double Charge Nano Ivory',
      roomTag: 'Hall',
      calcMode: 'Tile_Box_Calc',
      hsnCode: '69072100',
      sizeLabel: '2x2 ft',
      batchShadeNo: 'A4',
      sqftPerBox: 16,
      boxesBilled: 20,
      actualTotalSqft: 320,
      pricingUnit: 'per_sqft',
      rate: 45,
      discountAmount: 0,
      taxableAmount: 14400,
      gstPercent: 18,
      cgstAmount: 1296,
      sgstAmount: 1296,
      totalAmount: 16992,
      deliveredQty: 20
    }],
    totalBoxes: 20,
    totalSqft: 320,
    taxableSubtotal: 14400,
    cgstTotal: 1296,
    sgstTotal: 1296,
    transportCharges: 400,
    overallDiscount: 0,
    roundOff: 0,
    grandTotal: 17392,
    paymentMethod: 'UPI',
    amountReceived: 10000,
    balanceDue: 7392,
    deliveryStatus: 'Delivered',
    createdAt: '2026-10-15'
  };

  const csv = generateGstr1Csv([dummyInvoice]);
  assert.ok(csv.includes('Invoice Number,Invoice Date'));
  assert.ok(csv.includes('"SSMT/2026-27/001"'));
  assert.ok(csv.includes('"Pradeep Rout"'));
  assert.ok(csv.includes('69072100'));
});
