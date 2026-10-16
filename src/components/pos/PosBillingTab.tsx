import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  Share2,
  FileText,
  Calculator,
  UserPlus,
  CheckCircle2,
  Layers,
  ArrowRight,
  Search,
  Check
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import type {
  BillItem,
  CalculationMode,
  DocumentType,
  PaymentMethod,
  FollowUpStatus,
  Product
} from '../../types/erp';
import {
  calculateItemRow,
  calculateInvoiceSummary,
  formatIndianCurrency,
  generateWhatsAppMessage
} from '../../utils/calculations';

const COMMON_ROOM_TAGS = [
  'Living Room / Hall',
  'Master Bedroom',
  'Bedroom 2',
  'Kitchen Wall & Dado',
  'Kitchen Platform / Slab',
  'Common Bathroom',
  'Attached Bathroom',
  'Car Porch / Parking',
  'Balcony / Terrace',
  'Staircase Steps & Riser',
  'Pooja Room',
  'Exterior Elevation',
];

export const PosBillingTab: React.FC = () => {
  const {
    products,
    customers,
    addCustomer,
    referrers,
    invoices,
    createInvoice,
    convertQuoteToInvoice,
    setPreviewInvoice,
    business
  } = useErp();

  // Document Type
  const [docType, setDocType] = useState<DocumentType>('QUOTATION');

  // Customer selection or new creation
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerLocality, setNewCustomerLocality] = useState<string>('Jajpur Town');
  const [newCustomerGstin, setNewCustomerGstin] = useState<string>('');

  // Referral / Mistri
  const [selectedReferrerId, setSelectedReferrerId] = useState<string>('');

  // Follow-up for quotes
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>('Quotation Sent');
  const [followUpDate, setFollowUpDate] = useState<string>(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Line Items
  const [items, setItems] = useState<BillItem[]>(() => {
    // Initial sample row with product 1
    const defaultProd = products[0];
    if (!defaultProd) return [];
    return [
      calculateItemRow({
        productId: defaultProd.id,
        productName: defaultProd.name,
        roomTag: 'Living Room / Hall',
        calcMode: 'Tile_Box_Calc',
        hsnCode: defaultProd.hsnCode,
        sizeLabel: defaultProd.sizeLabel,
        batchShadeNo: defaultProd.batchShadeNo,
        sqftPerBox: defaultProd.sqftPerBox,
        requiredSqft: 200,
        wastagePercent: 5,
        pricingUnit: defaultProd.pricingUnit,
        rate: defaultProd.sellingPrice,
        gstPercent: 0, // Quote mode default
      }, false)
    ];
  });

  // Checkout settlement
  const [transportCharges, setTransportCharges] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [applyRoundOff, setApplyRoundOff] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [billNotes, setBillNotes] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // View toggle for Saved Documents
  const [savedFilter, setSavedFilter] = useState<'ALL' | 'QUOTATION' | 'TAX_INVOICE'>('ALL');
  const [searchSaved, setSearchSaved] = useState<string>('');

  // Active customer object
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Invoice calculations
  const isGst = docType === 'TAX_INVOICE';
  const summary = useMemo(() => {
    return calculateInvoiceSummary(items, transportCharges, overallDiscount, applyRoundOff, isGst);
  }, [items, transportCharges, overallDiscount, applyRoundOff, isGst]);

  const balanceDue = Math.max(0, summary.grandTotal - amountReceived);

  // Handle customer creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    const created = addCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      locality: newCustomerLocality.trim() || 'Jajpur Town',
      gstin: newCustomerGstin.trim(),
    });
    setSelectedCustomerId(created.id);
    setIsCreatingCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  // Add Item Row
  const handleAddItem = () => {
    const defaultProd = products[0];
    if (!defaultProd) return;
    const newItem = calculateItemRow({
      productId: defaultProd.id,
      productName: defaultProd.name,
      roomTag: 'Master Bedroom',
      calcMode: defaultProd.unitType === 'Stone_Slab' ? 'Slab_Calc' : (defaultProd.unitType === 'Standard_Piece' ? 'Standard_Qty' : 'Tile_Box_Calc'),
      hsnCode: defaultProd.hsnCode,
      sizeLabel: defaultProd.sizeLabel,
      batchShadeNo: defaultProd.batchShadeNo,
      sqftPerBox: defaultProd.sqftPerBox,
      requiredSqft: 150,
      wastagePercent: 5,
      pricingUnit: defaultProd.pricingUnit,
      rate: defaultProd.sellingPrice,
      gstPercent: isGst ? defaultProd.gstPercent : 0,
    }, isGst);

    setItems(prev => [...prev, newItem]);
  };

  // Update Item Row
  const handleUpdateItem = (id: string, updates: Partial<BillItem>) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return calculateItemRow({ ...it, ...updates }, isGst);
      }
      return it;
    }));
  };

  // Change product in an item row
  const handleProductChange = (itemId: string, newProductId: string) => {
    const prod = products.find(p => p.id === newProductId);
    if (!prod) return;

    let defaultCalcMode: CalculationMode = 'Tile_Box_Calc';
    if (prod.unitType === 'Stone_Slab') defaultCalcMode = 'Slab_Calc';
    if (prod.unitType === 'Standard_Piece') defaultCalcMode = 'Standard_Qty';

    handleUpdateItem(itemId, {
      productId: prod.id,
      productName: prod.name,
      calcMode: defaultCalcMode,
      hsnCode: prod.hsnCode,
      sizeLabel: prod.sizeLabel,
      batchShadeNo: prod.batchShadeNo,
      sqftPerBox: prod.sqftPerBox,
      pricingUnit: prod.pricingUnit,
      rate: prod.sellingPrice,
      gstPercent: isGst ? prod.gstPercent : 0,
    });
  };

  // Remove Item Row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Change Document Type
  const handleDocTypeChange = (type: DocumentType) => {
    setDocType(type);
    const newIsGst = type === 'TAX_INVOICE';
    // recalculate all items with or without GST
    setItems(prev => prev.map(it => {
      const prod = products.find(p => p.id === it.productId);
      const gstRate = newIsGst ? (prod?.gstPercent || 18) : 0;
      return calculateItemRow({ ...it, gstPercent: gstRate }, newIsGst);
    }));
  };

  // Save Document
  const handleSaveDocument = () => {
    if (!activeCustomer) return;
    if (items.length === 0) return;

    const nextCount = invoices.filter(inv => inv.docType === docType).length + 1;
    const prefix = docType === 'TAX_INVOICE' ? 'SSMT/2026-27' : 'EST-2026';
    const invoiceNo = `${prefix}/${String(nextCount).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const referrerObj = referrers.find(r => r.id === selectedReferrerId);

    const newInvoice = createInvoice({
      invoiceNo,
      docType,
      date: today,
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      customerPhone: activeCustomer.phone,
      customerLocality: activeCustomer.locality,
      customerGstin: activeCustomer.gstin,
      referrerId: referrerObj?.id,
      referrerName: referrerObj?.name,
      followUpStatus: docType === 'QUOTATION' ? followUpStatus : 'Won',
      followUpDate: docType === 'QUOTATION' ? followUpDate : undefined,
      items,
      totalBoxes: summary.totalBoxes,
      totalSqft: summary.totalSqft,
      taxableSubtotal: summary.taxableSubtotal,
      cgstTotal: summary.cgstTotal,
      sgstTotal: summary.sgstTotal,
      transportCharges: summary.transportCharges,
      overallDiscount: summary.overallDiscount,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      paymentMethod,
      amountReceived: docType === 'TAX_INVOICE' ? amountReceived : 0,
      balanceDue: docType === 'TAX_INVOICE' ? balanceDue : summary.grandTotal,
      deliveryStatus: docType === 'TAX_INVOICE' ? 'Pending Dispatch' : 'Pending Dispatch',
      notes: billNotes,
    });

    setSuccessNotice(`Saved ${docType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Quotation'} #${invoiceNo} successfully!`);
    setTimeout(() => setSuccessNotice(''), 4000);
    setPreviewInvoice(newInvoice);
  };

  // Filtered saved documents
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        if (savedFilter !== 'ALL' && inv.docType !== savedFilter) return false;
        if (!searchSaved.trim()) return true;
        const q = searchSaved.toLowerCase();
        return (
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.includes(q) ||
          inv.customerLocality.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, savedFilter, searchSaved]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Document Switcher */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              POS Billing &amp; Quotation Engine
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Room-wise tile sq.ft to box converter, marble slab calculator, and GST billing
            </p>
          </div>

          {/* Document Type Switcher (Segmented Control) */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-lg border border-neutral-200 self-stretch sm:self-auto">
            <button
              onClick={() => handleDocTypeChange('QUOTATION')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                docType === 'QUOTATION'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="sm:hidden">Quotation</span>
              <span className="hidden sm:inline">Quotation / Estimate (Kaccha)</span>
            </button>
            <button
              onClick={() => handleDocTypeChange('TAX_INVOICE')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                docType === 'TAX_INVOICE'
                  ? 'bg-[#141414] text-[#C5A059] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="sm:hidden">GST Invoice</span>
              <span className="hidden sm:inline">GST Tax Invoice (Pakka Bill)</span>
            </button>
          </div>
        </div>

        {/* Customer & Referral Header */}
        <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Customer / Party
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-[11px] text-[#B08D44] hover:underline flex items-center gap-1 font-medium"
              >
                <UserPlus className="w-3 h-3" />
                {isCreatingCustomer ? 'Select Existing' : '+ New Customer'}
              </button>
            </div>

            {!isCreatingCustomer ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone} ({c.locality})
                  </option>
                ))}
              </select>
            ) : (
              <form onSubmit={handleCreateCustomer} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                <input
                  type="text"
                  placeholder="Customer Full Name *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 bg-white border border-neutral-300 rounded"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 bg-white border border-neutral-300 rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Locality / Village"
                    value={newCustomerLocality}
                    onChange={(e) => setNewCustomerLocality(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 bg-white border border-neutral-300 rounded"
                  />
                </div>
                <input
                  type="text"
                  placeholder="GSTIN (Optional)"
                  value={newCustomerGstin}
                  onChange={(e) => setNewCustomerGstin(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 bg-white border border-neutral-300 rounded font-mono"
                />
                <button
                  type="submit"
                  className="w-full py-1 text-xs font-semibold text-white bg-[#C5A059] hover:bg-[#B08D44] rounded"
                >
                  Save &amp; Select Customer
                </button>
              </form>
            )}

            {activeCustomer && !isCreatingCustomer && (
              <div className="mt-1.5 text-[11px] text-neutral-500">
                <span>Khata Balance Due: </span>
                <strong className={`font-mono ${activeCustomer.balanceDue > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  ₹{activeCustomer.balanceDue.toLocaleString('en-IN')}
                </strong>
              </div>
            )}
          </div>

          {/* Referrer / Mistri Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Referred By (Mistri / Contractor)
            </label>
            <select
              value={selectedReferrerId}
              onChange={(e) => setSelectedReferrerId(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value="">Direct Customer (No Referrer)</option>
              {referrers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role} - {r.locality})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">
              Links invoice to mason/contractor ledger for reward &amp; commission calculation
            </p>
          </div>

          {/* Quotation Follow-up or Bill Date */}
          <div>
            {docType === 'QUOTATION' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Follow-Up Status
                  </label>
                  <select
                    value={followUpStatus}
                    onChange={(e) => setFollowUpStatus(e.target.value as FollowUpStatus)}
                    className="w-full text-xs py-2 px-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
                  >
                    <option value="Visited">Visited</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Follow-Up Pending">Pending</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Next Follow-Up
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full text-xs py-2 px-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Place of Supply &amp; State
                </label>
                <div className="py-2 px-3 bg-neutral-100 rounded-lg text-xs font-mono text-neutral-800 border border-neutral-200">
                  Odisha (State Code: 21) · Intra-State CGST+SGST
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Multi-Unit Line Item Calculator */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#C5A059]" />
            <h3 className="text-sm font-bold text-neutral-900">
              Bill Items &amp; Multi-Unit Calculator
            </h3>
          </div>
          <button
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#141414] hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Add Item Row</span>
          </button>
        </div>

        {/* Item Rows */}
        <div className="p-4 sm:p-5 space-y-4">
          {items.map((item, index) => {
            const currentProduct = products.find(p => p.id === item.productId);

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/40 hover:bg-white hover:border-neutral-300 transition-colors space-y-3"
              >
                {/* Row Header: Room Tag & Product Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400 font-mono w-5">
                        #{index + 1}
                      </span>

                      {/* Room Tag Input / Selector */}
                      <input
                        type="text"
                        list="room-tags"
                        value={item.roomTag}
                        onChange={(e) => handleUpdateItem(item.id, { roomTag: e.target.value })}
                        placeholder="Room / Area Tag"
                        className="text-xs font-semibold text-[#B08D44] bg-white border border-neutral-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-[#C5A059] flex-1 sm:w-44"
                      />
                    </div>
                    <datalist id="room-tags">
                      {COMMON_ROOM_TAGS.map(t => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>

                    {/* Product Selector */}
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(item.id, e.target.value)}
                        className="text-xs font-medium text-neutral-900 bg-white border border-neutral-300 rounded px-2.5 py-1.5 w-full sm:w-64 focus:ring-1 focus:ring-[#C5A059]"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sizeLabel} · {p.stockBoxes} in stock)
                          </option>
                        ))}
                      </select>

                      {/* Mode Tag */}
                      <span className="text-[10px] font-mono font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded whitespace-nowrap hidden sm:inline">
                        {item.calcMode === 'Tile_Box_Calc' && 'Tile Box'}
                        {item.calcMode === 'Slab_Calc' && 'Slab L×W'}
                        {item.calcMode === 'Standard_Qty' && 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors self-end sm:self-center"
                    title="Remove Item Row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Calculation Mode Specific Inputs */}
                {item.calcMode === 'Tile_Box_Calc' && (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                    {/* Dimension L x W (Optional) */}
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Length (ft)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.roomLengthFt || ''}
                        onChange={(e) => {
                          const l = parseFloat(e.target.value) || 0;
                          const w = item.roomWidthFt || 0;
                          const req = l * w > 0 ? Number((l * w).toFixed(2)) : item.requiredSqft;
                          handleUpdateItem(item.id, { roomLengthFt: l, requiredSqft: req });
                        }}
                        placeholder="e.g. 15"
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Width (ft)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.roomWidthFt || ''}
                        onChange={(e) => {
                          const w = parseFloat(e.target.value) || 0;
                          const l = item.roomLengthFt || 0;
                          const req = l * w > 0 ? Number((l * w).toFixed(2)) : item.requiredSqft;
                          handleUpdateItem(item.id, { roomWidthFt: w, requiredSqft: req });
                        }}
                        placeholder="e.g. 12"
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>

                    {/* Direct Required Sq.Ft */}
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-700 mb-0.5">Required Area (Sq.Ft)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.requiredSqft || ''}
                        onChange={(e) => handleUpdateItem(item.id, { requiredSqft: parseFloat(e.target.value) || 0 })}
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs bg-amber-50/50"
                      />
                    </div>

                    {/* Wastage % */}
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Wastage %</label>
                      <select
                        value={item.wastagePercent || 0}
                        onChange={(e) => handleUpdateItem(item.id, { wastagePercent: parseInt(e.target.value) || 0 })}
                        className="w-full py-1 px-1 border border-neutral-300 rounded text-xs"
                      >
                        <option value={0}>0% (Exact)</option>
                        <option value={5}>5% (Standard)</option>
                        <option value={10}>10% (Diagonal)</option>
                      </select>
                    </div>

                    {/* Auto-Calculated Full Boxes */}
                    <div className="bg-neutral-100 p-1.5 rounded border border-neutral-200">
                      <div className="text-[10px] text-neutral-500">Boxes Billed</div>
                      <div className="text-sm font-bold font-mono text-neutral-900">
                        {item.boxesBilled} <span className="text-[10px] font-normal">Boxes</span>
                      </div>
                      <div className="text-[9px] text-neutral-500">
                        ({item.sqftPerBox} sqft/box)
                      </div>
                    </div>

                    {/* Actual Total Sq.Ft Billed */}
                    <div className="bg-neutral-100 p-1.5 rounded border border-neutral-200">
                      <div className="text-[10px] text-neutral-500">Total Billed Sq.Ft</div>
                      <div className="text-sm font-bold font-mono text-neutral-900">
                        {item.actualTotalSqft} <span className="text-[10px] font-normal">sq.ft</span>
                      </div>
                      <div className="text-[9px] text-emerald-700">
                        Full boxes auto-rounded
                      </div>
                    </div>
                  </div>
                )}

                {item.calcMode === 'Slab_Calc' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Slab Length (ft)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={item.slabLengthFt || ''}
                        onChange={(e) => handleUpdateItem(item.id, { slabLengthFt: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 8"
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Slab Width (ft)</label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={item.slabWidthFt || ''}
                        onChange={(e) => handleUpdateItem(item.id, { slabWidthFt: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 3.5"
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">No. of Slabs / Pieces</label>
                      <input
                        type="number"
                        min="1"
                        value={item.slabCount || 1}
                        onChange={(e) => handleUpdateItem(item.id, { slabCount: parseInt(e.target.value) || 1 })}
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>
                    <div className="bg-neutral-100 p-1.5 rounded border border-neutral-200">
                      <div className="text-[10px] text-neutral-500">Calculated Slab Sq.Ft</div>
                      <div className="text-sm font-bold font-mono text-neutral-900">
                        {item.actualTotalSqft} sq.ft
                      </div>
                    </div>
                  </div>
                )}

                {item.calcMode === 'Standard_Qty' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-neutral-200 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">Quantity (Bags / Pieces)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.boxesBilled}
                        onChange={(e) => handleUpdateItem(item.id, { boxesBilled: parseInt(e.target.value) || 1 })}
                        className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-2 bg-neutral-100 p-1.5 rounded border border-neutral-200 flex items-center">
                      <span className="text-neutral-500 text-xs">Standard Bag / Chemical Pack Unit</span>
                    </div>
                  </div>
                )}

                {/* Rate, Discount, and Row Total Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">
                      Rate (₹ / {item.pricingUnit === 'per_sqft' ? 'Sq.Ft' : 'Box'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleUpdateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                      className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.discountAmount}
                      onChange={(e) => handleUpdateItem(item.id, { discountAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full py-1 px-2 border border-neutral-300 rounded font-mono text-xs text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Taxable Value</label>
                    <div className="py-1 px-2 bg-neutral-100 rounded border border-neutral-200 font-mono text-xs">
                      ₹{item.taxableAmount.toFixed(2)}
                    </div>
                  </div>

                  {isGst && (
                    <div>
                      <label className="block text-[10px] text-neutral-500 mb-0.5">GST (18%)</label>
                      <div className="py-1 px-2 bg-neutral-100 rounded border border-neutral-200 font-mono text-[11px] text-neutral-600">
                        ₹{(item.cgstAmount + item.sgstAmount).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#141414] text-white p-2 rounded flex flex-col justify-center items-end">
                    <span className="text-[9px] text-neutral-400">Row Total</span>
                    <span className="text-sm font-bold font-mono text-[#C5A059]">
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout & Settlement Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Charges & Notes */}
        <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5 space-y-4">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Transport &amp; Bill Notes
          </h4>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Transport / Loading / Unloading Charges (₹)
            </label>
            <input
              type="number"
              min="0"
              value={transportCharges}
              onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 500"
              className="w-full text-xs py-2 px-3 border border-neutral-300 rounded-lg font-mono focus:ring-2 focus:ring-[#C5A059]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Special Overall Bill Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={overallDiscount}
              onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 200"
              className="w-full text-xs py-2 px-3 border border-neutral-300 rounded-lg font-mono focus:ring-2 focus:ring-[#C5A059]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="round-off-toggle"
              checked={applyRoundOff}
              onChange={(e) => setApplyRoundOff(e.target.checked)}
              className="w-4 h-4 rounded text-[#C5A059] focus:ring-[#C5A059]"
            />
            <label htmlFor="round-off-toggle" className="text-xs text-neutral-700 cursor-pointer">
              Auto Round-Off Grand Total to nearest Rupee
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Bill / Loading Notes (Site Instructions)
            </label>
            <textarea
              rows={2}
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              placeholder="e.g. Site on 1st floor, deliver via Chorda road"
              className="w-full text-xs py-2 px-3 border border-neutral-300 rounded-lg"
            />
          </div>
        </div>

        {/* Payment & Udhaar Allocation */}
        <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5 space-y-4">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Settlement &amp; Payment Mode
          </h4>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full text-xs py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value="Cash">Cash at Counter</option>
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="Split">Split (Part Cash + Part Online)</option>
              <option value="Credit (Udhaar)">Full Credit (Udhaar Khata)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Amount Received Now (₹)
            </label>
            <input
              type="number"
              min="0"
              max={summary.grandTotal}
              value={amountReceived}
              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              className="w-full text-sm font-bold font-mono py-2 px-3 border border-neutral-300 rounded-lg text-emerald-800 focus:ring-2 focus:ring-[#C5A059]"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmountReceived(summary.grandTotal)}
                className="text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded"
              >
                Full Paid
              </button>
              <button
                type="button"
                onClick={() => setAmountReceived(Math.round(summary.grandTotal / 2))}
                className="text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded"
              >
                50% Advance
              </button>
              <button
                type="button"
                onClick={() => setAmountReceived(0)}
                className="text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded"
              >
                0 Advance (Udhaar)
              </button>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Grand Total:</span>
              <span className="font-mono font-bold">₹{summary.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Amount Received:</span>
              <span className="font-mono font-semibold">₹{amountReceived.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-neutral-200">
              <span>Balance Due (Udhaar):</span>
              <span className="font-mono">₹{balanceDue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Grand Total Summary & Checkout Button */}
        <div className="bg-[#141414] text-white rounded-xl shadow-md border border-neutral-800 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-[#C5A059] uppercase tracking-wider mb-2">
              Invoice Final Tally
            </div>

            <div className="space-y-1.5 text-xs text-neutral-300">
              <div className="flex justify-between">
                <span>Total Boxes:</span>
                <span className="font-mono font-bold text-white">{summary.totalBoxes} Boxes</span>
              </div>
              <div className="flex justify-between">
                <span>Total Square Feet:</span>
                <span className="font-mono text-white">{summary.totalSqft} Sq.Ft</span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <span className="font-mono text-white">₹{summary.taxableSubtotal.toFixed(2)}</span>
              </div>
              {isGst && (
                <div className="flex justify-between text-neutral-400">
                  <span>CGST (9%) + SGST (9%):</span>
                  <span className="font-mono text-white">₹{(summary.cgstTotal + summary.sgstTotal).toFixed(2)}</span>
                </div>
              )}
              {summary.transportCharges > 0 && (
                <div className="flex justify-between text-neutral-400">
                  <span>Transport &amp; Loading:</span>
                  <span className="font-mono text-white">₹{summary.transportCharges.toFixed(2)}</span>
                </div>
              )}
              {summary.roundOff !== 0 && (
                <div className="flex justify-between text-neutral-400">
                  <span>Round Off:</span>
                  <span className="font-mono text-white">₹{summary.roundOff.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-baseline">
              <span className="text-sm font-semibold text-neutral-300">Grand Total:</span>
              <span className="text-2xl font-extrabold font-mono text-[#C5A059]">
                ₹{summary.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {successNotice && (
            <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs p-2 rounded text-center font-medium">
              {successNotice}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSaveDocument}
              className="w-full py-3 px-4 bg-[#C5A059] hover:bg-[#B08D44] text-[#141414] font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                Save &amp; Generate {docType === 'TAX_INVOICE' ? 'GST Invoice' : 'Quotation'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Documents Sub-Table */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Recent Quotations &amp; Tax Invoices
            </h3>
            <p className="text-xs text-neutral-500">
              Convert quotations to final GST bills, preview A4 print sheet, or send WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter buttons */}
            <div className="flex items-center p-1 bg-neutral-100 rounded-lg text-xs">
              <button
                onClick={() => setSavedFilter('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  savedFilter === 'ALL' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSavedFilter('QUOTATION')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  savedFilter === 'QUOTATION' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                Quotes
              </button>
              <button
                onClick={() => setSavedFilter('TAX_INVOICE')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  savedFilter === 'TAX_INVOICE' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                GST Bills
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search bill or party..."
                value={searchSaved}
                onChange={(e) => setSearchSaved(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-2.5 px-4">Doc No. / Type</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4 text-center">Boxes</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                <th className="py-2.5 px-4 text-right">Due Balance</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-neutral-900 block">
                      {inv.invoiceNo}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {inv.docType === 'TAX_INVOICE' ? 'GST Invoice' : 'Quotation'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                    {inv.date}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-neutral-800 block">
                      {inv.customerName}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate block max-w-44">
                      {inv.customerLocality}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-neutral-700">
                    {inv.totalBoxes}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                    ₹{inv.grandTotal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <span className={inv.balanceDue > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      ₹{inv.balanceDue.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                      {inv.docType === 'QUOTATION' ? (inv.followUpStatus || 'Sent') : inv.deliveryStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inv.docType === 'QUOTATION' && (
                        <button
                          onClick={() => {
                            const converted = convertQuoteToInvoice(inv.id);
                            if (converted) {
                              setSuccessNotice(`Converted quote to GST Invoice #${converted.invoiceNo}!`);
                              setTimeout(() => setSuccessNotice(''), 4000);
                            }
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors whitespace-nowrap"
                          title="1-Click Convert to GST Invoice & Deduct Stock"
                        >
                          Convert to Bill
                        </button>
                      )}

                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="p-1.5 text-neutral-700 hover:text-[#141414] hover:bg-neutral-100 rounded transition-colors"
                        title="Preview & Print A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const rawPhone = inv.customerPhone.replace(/[^0-9]/g, '');
                          const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                          const textMsg = generateWhatsAppMessage(inv, business);
                          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
                        }}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Send on WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
