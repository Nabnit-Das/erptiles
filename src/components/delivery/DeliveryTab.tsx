import React, { useState } from 'react';
import {
  Truck,
  FileText,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  Plus,
  X,
  Building,
  User
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import type { Invoice, DeliveryChallan } from '../../types/erp';

export const DeliveryTab: React.FC = () => {
  const {
    invoices,
    challans,
    createChallan,
    recordCustomerReturn,
    business
  } = useErp();

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending Dispatch' | 'Partially Delivered' | 'Delivered'>('ALL');
  
  // Create Challan Modal
  const [showChallanModal, setShowChallanModal] = useState<boolean>(false);
  const [selectedInvoiceForChallan, setSelectedInvoiceForChallan] = useState<Invoice | null>(null);
  const [vehicleNo, setVehicleNo] = useState<string>('OD-04-E-4912 (Tata Ace)');
  const [driverName, setDriverName] = useState<string>('Raju Behera');
  const [driverPhone, setDriverPhone] = useState<string>('9439182310');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [challanNotes, setChallanNotes] = useState<string>('Handle glazed boxes with care');
  const [itemsToDeliver, setItemsToDeliver] = useState<{ [itemId: string]: number }>({});

  // Return Box Modal
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<Invoice | null>(null);
  const [returnProductId, setReturnProductId] = useState<string>('');
  const [boxesToReturn, setBoxesToReturn] = useState<number>(2);
  const [refundCreditAmount, setRefundCreditAmount] = useState<number>(960);
  const [returnReason, setReturnReason] = useState<string>('Unopened surplus boxes from site');

  // Print Challan Preview Modal
  const [previewChallan, setPreviewChallan] = useState<DeliveryChallan | null>(null);

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (inv.docType !== 'TAX_INVOICE') return false; // challans for confirmed tax bills
    if (statusFilter !== 'ALL' && inv.deliveryStatus !== statusFilter) return false;
    return true;
  });

  const handleOpenChallanModal = (inv: Invoice) => {
    setSelectedInvoiceForChallan(inv);
    setDeliveryAddress(inv.customerLocality);
    // Initialize items to deliver with remaining undelivered quantities
    const initialQtys: { [itemId: string]: number } = {};
    inv.items.forEach(it => {
      const remaining = Math.max(0, it.boxesBilled - it.deliveredQty);
      initialQtys[it.id] = remaining;
    });
    setItemsToDeliver(initialQtys);
    setShowChallanModal(true);
  };

  const handleCreateChallanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForChallan) return;

    const deliveryItems = selectedInvoiceForChallan.items
      .filter(it => (itemsToDeliver[it.id] || 0) > 0)
      .map(it => ({
        productId: it.productId,
        productName: it.productName,
        roomTag: it.roomTag,
        batchShadeNo: it.batchShadeNo,
        boxesToDeliver: itemsToDeliver[it.id] || 0,
        sqftToDeliver: Number(((itemsToDeliver[it.id] || 0) * it.sqftPerBox).toFixed(2)),
      }));

    if (deliveryItems.length === 0) return;

    const created = createChallan({
      invoiceId: selectedInvoiceForChallan.id,
      invoiceNo: selectedInvoiceForChallan.invoiceNo,
      customerId: selectedInvoiceForChallan.customerId,
      customerName: selectedInvoiceForChallan.customerName,
      customerPhone: selectedInvoiceForChallan.customerPhone,
      deliveryAddress: deliveryAddress || selectedInvoiceForChallan.customerLocality,
      vehicleNumber: vehicleNo,
      driverName,
      driverPhone,
      items: deliveryItems,
      notes: challanNotes,
      status: 'Delivered',
    });

    setShowChallanModal(false);
    setSelectedInvoiceForChallan(null);
    setPreviewChallan(created);
  };

  const handleOpenReturnModal = (inv: Invoice) => {
    setSelectedInvoiceForReturn(inv);
    if (inv.items[0]) {
      setReturnProductId(inv.items[0].productId);
      const rowRate = inv.items[0].rate * (inv.items[0].pricingUnit === 'per_sqft' ? inv.items[0].sqftPerBox : 1);
      setRefundCreditAmount(Math.round(rowRate * 2));
    }
    setShowReturnModal(true);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForReturn || !returnProductId || boxesToReturn <= 0) return;
    recordCustomerReturn(
      selectedInvoiceForReturn.id,
      returnProductId,
      boxesToReturn,
      refundCreditAmount,
      returnReason
    );
    setShowReturnModal(false);
    setSelectedInvoiceForReturn(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Split Delivery &amp; Godown Challan Tracker
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage partial site deliveries, driver loading slips without prices, and customer box returns
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-lg text-xs">
          {(['ALL', 'Pending Dispatch', 'Partially Delivered', 'Delivered'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === st ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List with Dispatch Status */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            GST Invoices Ready for Loading &amp; Dispatch
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Customer &amp; Site Address</th>
                <th className="py-3 px-3 text-center">Billed Boxes</th>
                <th className="py-3 px-3 text-center">Delivered</th>
                <th className="py-3 px-3 text-center">Pending</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredInvoices.map((inv) => {
                const totalBilled = inv.items.reduce((s, it) => s + it.boxesBilled, 0);
                const totalDelivered = inv.items.reduce((s, it) => s + it.deliveredQty, 0);
                const pending = Math.max(0, totalBilled - totalDelivered);

                return (
                  <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 font-mono text-[11px]">
                      {inv.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{inv.customerName}</div>
                      <div className="text-[10px] text-neutral-500">{inv.customerLocality}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {totalBilled}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-semibold">
                      {totalDelivered}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700 font-semibold">
                      {pending}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        inv.deliveryStatus === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700'
                          : (inv.deliveryStatus === 'Partially Delivered' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600')
                      }`}>
                        {inv.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pending > 0 && (
                          <button
                            onClick={() => handleOpenChallanModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded transition-colors whitespace-nowrap"
                          >
                            <Truck className="w-3 h-3" />
                            Dispatch Trip
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenReturnModal(inv)}
                          className="px-2 py-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors whitespace-nowrap"
                          title="Record unopened customer box return"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Return Box
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Delivery Challans Log */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Generated Delivery Challans &amp; Vehicle Trips
          </h3>
          <span className="text-xs text-neutral-500 font-mono">{challans.length} Trips Dispatched</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {challans.map((ch) => (
            <div key={ch.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-neutral-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-neutral-900">{ch.challanNo}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Invoice: {ch.invoiceNo}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-medium px-1.5 py-0.2 rounded">
                    {ch.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-700">
                  <strong>Customer:</strong> {ch.customerName} · <strong>Destination:</strong> {ch.deliveryAddress}
                </div>
                <div className="text-[11px] text-neutral-500">
                  Vehicle: <span className="font-mono">{ch.vehicleNumber}</span> · Driver: {ch.driverName} ({ch.driverPhone})
                </div>
                <div className="text-[11px] text-neutral-600 mt-1 font-medium">
                  Delivered Items: {ch.items.map(it => `${it.boxesToDeliver} boxes ${it.productName}`).join(', ')}
                </div>
              </div>

              <button
                onClick={() => setPreviewChallan(ch)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Loading Slip (A4)
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Delivery Challan Modal */}
      {showChallanModal && selectedInvoiceForChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
            <div className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Generate Delivery Challan / Loading Slip</h3>
                <p className="text-xs text-neutral-400">
                  For Invoice {selectedInvoiceForChallan.invoiceNo} · {selectedInvoiceForChallan.customerName}
                </p>
              </div>
              <button onClick={() => setShowChallanModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallanSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Vehicle No. *</label>
                  <input
                    type="text"
                    required
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="OD-04-E-4912"
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Driver Name &amp; Contact *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Raju Behera"
                      className="w-full py-2 px-2 border border-neutral-300 rounded-lg"
                    />
                    <input
                      type="tel"
                      required
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="Driver Phone"
                      className="w-full py-2 px-2 border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Delivery Destination / Site Address *</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg"
                />
              </div>

              {/* Items to Deliver Selection */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1.5">
                  Select Quantities to Load for THIS Trip:
                </label>
                <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50/50">
                  {selectedInvoiceForChallan.items.map(it => {
                    const remaining = Math.max(0, it.boxesBilled - it.deliveredQty);
                    return (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-3 bg-white">
                        <div>
                          <div className="font-bold text-neutral-900">{it.productName}</div>
                          <div className="text-[10px] text-neutral-500">
                            [{it.roomTag}] · Shade: {it.batchShadeNo} · Billed: {it.boxesBilled} (Delivered: {it.deliveredQty})
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] text-neutral-500">Boxes this trip:</label>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={itemsToDeliver[it.id] ?? remaining}
                            onChange={(e) => {
                              const val = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0));
                              setItemsToDeliver(prev => ({ ...prev, [it.id]: val }));
                            }}
                            className="w-16 py-1 px-2 border border-neutral-300 rounded font-mono text-center font-bold text-xs"
                          />
                          <span className="text-[10px] text-neutral-400">/ {remaining} max</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Driver / Helper Instructions</label>
                <input
                  type="text"
                  value={challanNotes}
                  onChange={(e) => setChallanNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChallanModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-[#141414] hover:bg-neutral-800 rounded-lg font-bold"
                >
                  Generate &amp; Print Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Box Return Modal */}
      {showReturnModal && selectedInvoiceForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Customer Box Return / Exchange</h3>
                <p className="text-xs text-neutral-400">{selectedInvoiceForReturn.customerName}</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-5 space-y-3.5 text-xs">
              <p className="text-[11px] text-neutral-600 leading-relaxed bg-amber-50 p-2.5 rounded border border-amber-200">
                Returns must be sealed and unopened. Returned boxes are added back to stock and the customer's khata is credited.
              </p>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Item to Return *</label>
                <select
                  value={returnProductId}
                  onChange={(e) => {
                    setReturnProductId(e.target.value);
                    const it = selectedInvoiceForReturn.items.find(i => i.productId === e.target.value);
                    if (it) {
                      const rate = it.rate * (it.pricingUnit === 'per_sqft' ? it.sqftPerBox : 1);
                      setRefundCreditAmount(Math.round(rate * boxesToReturn));
                    }
                  }}
                  className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                >
                  {selectedInvoiceForReturn.items.map(it => (
                    <option key={it.id} value={it.productId}>
                      {it.productName} ({it.boxesBilled} boxes billed)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Unopened Boxes</label>
                  <input
                    type="number"
                    min="1"
                    value={boxesToReturn}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 1;
                      setBoxesToReturn(qty);
                      const it = selectedInvoiceForReturn.items.find(i => i.productId === returnProductId);
                      if (it) {
                        const rate = it.rate * (it.pricingUnit === 'per_sqft' ? it.sqftPerBox : 1);
                        setRefundCreditAmount(Math.round(rate * qty));
                      }
                    }}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Credit Amount (₹)</label>
                  <input
                    type="number"
                    value={refundCreditAmount}
                    onChange={(e) => setRefundCreditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono font-bold text-emerald-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-semibold"
                >
                  Confirm Return &amp; Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated A4 Printable Loading Slip Modal (WITHOUT PRICES) */}
      {previewChallan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed-none">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
            {/* Control Bar */}
            <div className="no-print bg-[#141414] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#C5A059]" />
                <span className="text-sm font-semibold">Delivery Challan / Loading Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded-lg"
                >
                  Print Slip
                </button>
                <button onClick={() => setPreviewChallan(null)} className="text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip */}
            <div className="print-page p-8 text-xs text-[#141414]">
              <div className="border-b-2 border-[#141414] pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold uppercase">{business.name}</h2>
                  <p className="text-xs text-neutral-600">{business.addressLine1}, {business.city}, Odisha</p>
                  <p className="text-[11px] text-neutral-500">Ph: {business.phone}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-[#141414] text-white text-xs font-bold uppercase rounded">
                    DELIVERY CHALLAN
                  </span>
                  <div className="text-[11px] mt-1 font-mono"><strong>Slip No:</strong> {previewChallan.challanNo}</div>
                  <div className="text-[11px]"><strong>Date:</strong> {previewChallan.date}</div>
                  <div className="text-[11px] font-mono">Ref Inv: {previewChallan.invoiceNo}</div>
                </div>
              </div>

              {/* Destination & Driver info */}
              <div className="grid grid-cols-2 gap-4 py-3 border-b border-neutral-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">Deliver To</div>
                  <div className="font-bold text-sm text-neutral-900">{previewChallan.customerName}</div>
                  <div>Ph: {previewChallan.customerPhone}</div>
                  <div>Site Address: {previewChallan.deliveryAddress}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase">Transport Logistics</div>
                  <div>Vehicle: <strong className="font-mono">{previewChallan.vehicleNumber}</strong></div>
                  <div>Driver: <strong>{previewChallan.driverName}</strong> ({previewChallan.driverPhone})</div>
                  {previewChallan.notes && <div className="text-neutral-500 italic mt-0.5">Instructions: {previewChallan.notes}</div>}
                </div>
              </div>

              {/* Items to Load (No prices shown!) */}
              <div className="mt-4">
                <table className="w-full border-collapse border border-neutral-300 text-xs">
                  <thead>
                    <tr className="bg-neutral-100 text-center font-bold">
                      <th className="py-2 px-2 border border-neutral-300 w-10">#</th>
                      <th className="py-2 px-3 border border-neutral-300 text-left">Item Description &amp; Room Tag</th>
                      <th className="py-2 px-2 border border-neutral-300 w-24">Batch / Shade</th>
                      <th className="py-2 px-2 border border-neutral-300 w-28">Boxes to Unload</th>
                      <th className="py-2 px-2 border border-neutral-300 w-28">Sq.Ft Loaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewChallan.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-neutral-300">
                        <td className="py-2 px-2 text-center font-mono border border-neutral-300">{idx + 1}</td>
                        <td className="py-2 px-3 border border-neutral-300">
                          <strong className="text-neutral-900">{it.productName}</strong>
                          <span className="text-[10px] text-[#B08D44] block">[{it.roomTag}]</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono border border-neutral-300">{it.batchShadeNo}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-sm border border-neutral-300">
                          {it.boxesToDeliver} Boxes
                        </td>
                        <td className="py-2 px-2 text-center font-mono border border-neutral-300">
                          {it.sqftToDeliver} sq.ft
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Signatures */}
              <div className="mt-12 pt-8 border-t border-neutral-300 grid grid-cols-3 gap-6 text-center text-[10px] text-neutral-600">
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-dashed border-neutral-400 pt-1">
                    Godown Helper / Loader
                  </div>
                </div>
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-dashed border-neutral-400 pt-1">
                    Driver's Signature
                  </div>
                </div>
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-dashed border-neutral-400 pt-1 font-semibold text-neutral-900">
                    Customer Received in Good Condition
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
