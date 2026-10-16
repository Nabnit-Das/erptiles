import React from 'react';
import { Printer, Share2, X, Download, Phone, Building2, CheckCircle2 } from 'lucide-react';
import type { Invoice } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import {
  numberToIndianWords,
  formatIndianCurrency,
  generateWhatsAppMessage
} from '../../utils/calculations';

interface A4InvoicePrintModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const A4InvoicePrintModal: React.FC<A4InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { business } = useErp();

  if (!invoice) return null;

  const isTaxInvoice = invoice.docType === 'TAX_INVOICE';
  const docTitle = isTaxInvoice ? 'TAX INVOICE' : 'QUOTATION / ESTIMATE';

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const rawPhone = invoice.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const textMsg = generateWhatsAppMessage(invoice, business);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:fixed-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-[#141414] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#C5A059]" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              Print Preview — {invoice.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] transition-colors rounded-lg shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close Preview"
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable A4 Sheet */}
        <div className="print-page bg-white p-6 sm:p-8 text-[#141414] text-xs">
          
          {/* Header */}
          <div className="border-b-2 border-[#141414] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-[10px] font-bold text-[#C5A059] tracking-wider uppercase">
                || JAI SHREE SHIRDI SAI ||
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141414] uppercase">
                {business.name}
              </h1>
              <p className="text-xs text-neutral-700 font-medium italic mt-0.5">
                {business.slogan}
              </p>
              <p className="text-[11px] text-neutral-600 mt-1">
                {business.addressLine1}, {business.addressLine2}, {business.city}, {business.state} - {business.pincode}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-700 mt-1">
                <span><strong>Phone:</strong> {business.phone}</span>
                {isTaxInvoice && (
                  <>
                    <span>·</span>
                    <span><strong>GSTIN:</strong> {business.gstin}</span>
                    <span>·</span>
                    <span><strong>State Code:</strong> 21 (Odisha)</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 border border-neutral-300 rounded-lg p-3 bg-neutral-50 sm:bg-transparent">
              <span className={`inline-block px-3 py-1 text-xs font-bold uppercase rounded tracking-wider ${
                isTaxInvoice ? 'bg-[#141414] text-[#C5A059]' : 'bg-[#C5A059] text-[#141414]'
              }`}>
                {docTitle}
              </span>
              <div className="mt-2 text-[11px] space-y-0.5">
                <div><span className="text-neutral-500">{isTaxInvoice ? 'Invoice No:' : 'Quote No:'}</span> <strong className="font-mono">{invoice.invoiceNo}</strong></div>
                <div><span className="text-neutral-500">Date:</span> <strong>{invoice.date}</strong></div>
                <div><span className="text-neutral-500">Payment:</span> <strong className="uppercase">{invoice.paymentMethod}</strong></div>
              </div>
            </div>
          </div>

          {/* Party & Site Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-b border-neutral-200">
            <div className="bg-neutral-50/70 p-3 rounded-lg border border-neutral-200">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                Bill To / Customer Details
              </div>
              <div className="text-sm font-bold text-neutral-900">{invoice.customerName}</div>
              <div className="text-[11px] text-neutral-700 mt-0.5">
                <strong>Locality / Village:</strong> {invoice.customerLocality}
              </div>
              <div className="text-[11px] text-neutral-700">
                <strong>Phone:</strong> {invoice.customerPhone}
              </div>
              {invoice.customerGstin && (
                <div className="text-[11px] text-neutral-700">
                  <strong>Customer GSTIN:</strong> <span className="font-mono">{invoice.customerGstin}</span>
                </div>
              )}
            </div>

            <div className="bg-neutral-50/70 p-3 rounded-lg border border-neutral-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Delivery / Referral Details
                </div>
                {invoice.referrerName && (
                  <div className="text-[11px] text-neutral-700">
                    <strong>Referred By (Mistri/Contractor):</strong> {invoice.referrerName}
                  </div>
                )}
                <div className="text-[11px] text-neutral-700 mt-0.5">
                  <strong>Place of Supply:</strong> Odisha (21)
                </div>
                <div className="text-[11px] text-neutral-700 mt-0.5">
                  <strong>Dispatch Status:</strong> <span className="font-medium text-neutral-900">{invoice.deliveryStatus}</span>
                </div>
              </div>
              {invoice.notes && (
                <div className="text-[10px] text-neutral-500 italic mt-1">
                  Note: {invoice.notes}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-300 text-[11px]">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800 font-semibold text-center border-b border-neutral-300">
                  <th className="py-2 px-1 border-r border-neutral-300 w-8">#</th>
                  <th className="py-2 px-2 border-r border-neutral-300 text-left">Room / Area &amp; Description</th>
                  <th className="py-2 px-1 border-r border-neutral-300 w-16">HSN</th>
                  <th className="py-2 px-1 border-r border-neutral-300 w-16">Size</th>
                  <th className="py-2 px-1 border-r border-neutral-300 w-16">Boxes / Slabs</th>
                  <th className="py-2 px-1 border-r border-neutral-300 w-16">Total Sq.Ft</th>
                  <th className="py-2 px-2 border-r border-neutral-300 text-right w-16">Rate (₹)</th>
                  <th className="py-2 px-2 border-r border-neutral-300 text-right w-20">Taxable</th>
                  {isTaxInvoice && (
                    <th className="py-2 px-1 border-r border-neutral-300 w-12">GST %</th>
                  )}
                  <th className="py-2 px-2 text-right w-20">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-neutral-200">
                    <td className="py-1.5 px-1 text-center font-mono border-r border-neutral-300 text-neutral-500">
                      {index + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-neutral-300">
                      <div className="font-bold text-neutral-900">{item.productName}</div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                        <span className="font-semibold text-[#B08D44]">[{item.roomTag}]</span>
                        <span>· Shade: {item.batchShadeNo}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono border-r border-neutral-300 text-neutral-600">
                      {item.hsnCode}
                    </td>
                    <td className="py-1.5 px-1 text-center border-r border-neutral-300 text-neutral-700">
                      {item.sizeLabel}
                    </td>
                    <td className="py-1.5 px-1 text-center font-semibold font-mono border-r border-neutral-300">
                      {item.boxesBilled}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono border-r border-neutral-300">
                      {item.actualTotalSqft}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-neutral-300">
                      {item.rate}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-neutral-300">
                      {item.taxableAmount.toFixed(2)}
                    </td>
                    {isTaxInvoice && (
                      <td className="py-1.5 px-1 text-center font-mono border-r border-neutral-300">
                        {item.gstPercent}%
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-right font-bold font-mono">
                      {item.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Summary Block */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Bank Details & Terms */}
            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 text-[10px] space-y-1.5">
              <div className="font-bold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#C5A059]" />
                Bank &amp; Digital Payment Mode
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-neutral-700">
                <div><strong>Bank Name:</strong> {business.bankName}</div>
                <div><strong>A/C No:</strong> <span className="font-mono">{business.accountNumber}</span></div>
                <div><strong>IFSC Code:</strong> <span className="font-mono">{business.ifscCode}</span></div>
                <div><strong>Branch:</strong> {business.branch}</div>
                <div className="col-span-2 text-emerald-800 font-semibold pt-0.5">
                  <strong>UPI ID:</strong> {business.upiId}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200">
                <strong className="text-neutral-700">Terms &amp; Conditions:</strong>
                <ol className="list-decimal list-inside text-neutral-500 text-[9px] mt-0.5 space-y-0.5">
                  {business.terms.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="divide-y divide-neutral-200 text-[11px]">
                <div className="flex justify-between px-3 py-1.5 bg-neutral-50">
                  <span className="text-neutral-600 font-medium">Total Quantity Billed:</span>
                  <span className="font-bold font-mono">
                    {invoice.totalBoxes} Boxes ({invoice.totalSqft} Sq.Ft)
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1.5">
                  <span className="text-neutral-600">Taxable Subtotal:</span>
                  <span className="font-mono">₹{invoice.taxableSubtotal.toFixed(2)}</span>
                </div>
                {isTaxInvoice && (
                  <>
                    <div className="flex justify-between px-3 py-1">
                      <span className="text-neutral-600">CGST (9%):</span>
                      <span className="font-mono">₹{invoice.cgstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-1">
                      <span className="text-neutral-600">SGST (9%):</span>
                      <span className="font-mono">₹{invoice.sgstTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {invoice.transportCharges > 0 && (
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-neutral-600">Transport &amp; Loading:</span>
                    <span className="font-mono">₹{invoice.transportCharges.toFixed(2)}</span>
                  </div>
                )}
                {invoice.overallDiscount > 0 && (
                  <div className="flex justify-between px-3 py-1 text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{invoice.overallDiscount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between px-3 py-1 text-neutral-500 text-[10px]">
                    <span>Round Off:</span>
                    <span className="font-mono">₹{invoice.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-[#141414] text-white text-xs font-bold">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-[#C5A059]">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5 bg-emerald-50 text-emerald-900 font-semibold text-[11px]">
                  <span>Amount Paid / Received:</span>
                  <span className="font-mono">₹{invoice.amountReceived.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between px-3 py-1.5 font-bold text-xs ${
                  invoice.balanceDue > 0 ? 'bg-red-50 text-red-700' : 'bg-neutral-50 text-neutral-700'
                }`}>
                  <span>Balance Due (Udhaar):</span>
                  <span className="font-mono">₹{invoice.balanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="mt-3 p-2 bg-neutral-100/80 rounded border border-neutral-200 text-[11px]">
            <span className="text-neutral-500 font-medium">Amount in Words: </span>
            <strong className="text-neutral-900 font-serif">
              {numberToIndianWords(invoice.grandTotal)}
            </strong>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t border-neutral-300 grid grid-cols-2 gap-8 text-center text-[10px] text-neutral-600">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-dashed border-neutral-400 pt-1 font-medium">
                Customer's Signature
              </div>
            </div>
            <div>
              <div className="h-10 flex items-center justify-center text-[10px] font-semibold text-[#141414]">
                FOR SHIRDI SAI MARBLES &amp; TILES
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 font-medium">
                Authorized Signatory
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
