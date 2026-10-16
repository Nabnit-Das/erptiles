export type UnitType = 'Tile_Box' | 'Stone_Slab' | 'Standard_Piece';

export type CalculationMode = 'Tile_Box_Calc' | 'Slab_Calc' | 'Standard_Qty';

export type LocationType = 'Showroom Display' | 'Main Godown';

export type DocumentType = 'QUOTATION' | 'TAX_INVOICE';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Split' | 'Credit (Udhaar)';

export type FollowUpStatus = 'Visited' | 'Quotation Sent' | 'Follow-Up Pending' | 'Won' | 'Lost';

export type DeliveryStatus = 'Pending Dispatch' | 'Partially Delivered' | 'Delivered';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'Floor Tiles' | 'Wall Tiles' | 'Outdoor / Parking' | 'Marble & Granite' | 'Chemicals & Allied';
  sizeLabel: string; // e.g., '2x2 ft', '2x4 ft', '12x18 in', '16x16 in', 'Slab'
  unitType: UnitType;
  sqftPerBox: number; // e.g. 16 for 2x2, 9 for 12x18
  piecesPerBox: number; // e.g. 4 for 2x2, 2 for 2x4
  batchShadeNo: string;
  location: LocationType;
  stockBoxes: number; // or sq.ft for slabs, bags for chemicals
  minStockAlert: number;
  sellingPrice: number; // per Box or Sq.Ft based on pricingUnit
  pricingUnit: 'per_sqft' | 'per_box' | 'per_piece';
  purchasePrice: number; // visible ONLY in Owner Mode
  gstPercent: number; // 18% standard, 28% for certain granites
  hsnCode: string;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  locality: string; // Village or locality in Jajpur (e.g., Gariapur, Chorda, Kuakhia)
  address?: string;
  gstin?: string;
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  createdAt: string;
}

export interface Referrer {
  id: string;
  name: string;
  role: 'Contractor' | 'Mason (Mistri)' | 'Civil Engineer' | 'Interior Designer';
  phone: string;
  locality: string;
  commissionPercent: number; // e.g. 3% or 5% (Owner Mode)
  totalReferredBills: number;
  totalBusinessGenerated: number;
  commissionEarned: number;
  commissionPaid: number;
  balanceCommission: number;
}

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  roomTag: string; // e.g., 'Living Room', 'Master Bedroom', 'Kitchen Wall'
  calcMode: CalculationMode;
  hsnCode: string;
  sizeLabel: string;
  batchShadeNo: string;
  sqftPerBox: number;
  
  // Mode A: Tile Box inputs
  roomLengthFt?: number;
  roomWidthFt?: number;
  wastagePercent?: number; // 0, 5, 10
  requiredSqft?: number;
  boxesBilled: number;
  actualTotalSqft: number; // boxesBilled * sqftPerBox
  
  // Mode B: Slab inputs
  slabLengthFt?: number;
  slabWidthFt?: number;
  slabCount?: number;
  
  // Pricing
  pricingUnit: 'per_sqft' | 'per_box' | 'per_piece';
  rate: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  
  // Delivered count
  deliveredQty: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string; // SSMT/2026-27/001 or EST-2026-001
  docType: DocumentType;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerLocality: string;
  customerGstin?: string;
  referrerId?: string;
  referrerName?: string;
  followUpStatus?: FollowUpStatus;
  followUpDate?: string;
  
  items: BillItem[];
  
  totalBoxes: number;
  totalSqft: number;
  taxableSubtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  transportCharges: number;
  overallDiscount: number;
  roundOff: number;
  grandTotal: number;
  
  paymentMethod: PaymentMethod;
  amountReceived: number;
  balanceDue: number;
  
  deliveryStatus: DeliveryStatus;
  notes?: string;
  createdAt: string;
  isConvertedFromQuote?: boolean;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string; // DC/2026-27/001
  invoiceId: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  items: {
    productId: string;
    productName: string;
    roomTag: string;
    batchShadeNo: string;
    boxesToDeliver: number;
    sqftToDeliver: number;
  }[];
  notes?: string;
  status: 'Dispatched' | 'Delivered' | 'Returned';
}

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  date: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNo?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string; // UPI txn or cheque no
  notes?: string;
}

export interface CommissionPayout {
  id: string;
  date: string;
  referrerId: string;
  referrerName: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer';
  referenceNo?: string;
  notes?: string;
}

export interface DamageLog {
  id: string;
  date: string;
  productId: string;
  productName: string;
  batchShadeNo: string;
  location: LocationType;
  boxesDamaged: number;
  reason: 'Breakage during unloading' | 'Transit vibration' | 'Corner chipped' | 'Customer return damaged' | 'Other';
  reportedBy: string;
  estimatedLoss: number;
}

export interface BusinessProfile {
  name: string;
  slogan: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
  terms: string[];
}
