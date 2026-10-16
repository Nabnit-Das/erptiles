import React, { useState, useMemo } from 'react';
import {
  Users,
  CreditCard,
  Share2,
  Plus,
  ArrowDownLeft,
  Calendar,
  Building,
  UserCheck,
  Search,
  FileText,
  X,
  Phone,
  CheckCircle2,
  HardHat
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import type { Customer, Referrer, PaymentMethod } from '../../types/erp';
import {
  formatIndianCurrency,
  generatePaymentReminderWhatsApp
} from '../../utils/calculations';

export const KhataTab: React.FC = () => {
  const {
    customers,
    referrers,
    addReferrer,
    invoices,
    payments,
    recordPayment,
    commissionPayouts,
    recordCommissionPayout,
    isOwnerMode,
    business
  } = useErp();

  // Active sub-tab
  const [subTab, setSubTab] = useState<'CUSTOMERS' | 'REFERRERS'>('CUSTOMERS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected customer for Statement drill-down
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // Payment In Modal
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('Partial settlement of bill dues');

  // Commission Payout Modal
  const [showCommissionModal, setShowCommissionModal] = useState<boolean>(false);
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
  const [commissionAmount, setCommissionAmount] = useState<number>(1000);
  const [commissionMethod, setCommissionMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [commissionNotes, setCommissionNotes] = useState<string>('Site referral incentive payout');

  // Add Referrer Modal
  const [showAddReferrerModal, setShowAddReferrerModal] = useState<boolean>(false);
  const [newRefName, setNewRefName] = useState<string>('');
  const [newRefRole, setNewRefRole] = useState<Referrer['role']>('Mason (Mistri)');
  const [newRefPhone, setNewRefPhone] = useState<string>('');
  const [newRefLocality, setNewRefLocality] = useState<string>('Jajpur Town');
  const [newRefCommission, setNewRefCommission] = useState<number>(4);

  // Active customer statement data
  const currentCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const customerInvoices = useMemo(() => {
    if (!currentCustomer) return [];
    return invoices.filter(inv => inv.customerId === currentCustomer.id);
  }, [invoices, currentCustomer]);

  const customerPayments = useMemo(() => {
    if (!currentCustomer) return [];
    return payments.filter(p => p.customerId === currentCustomer.id);
  }, [payments, currentCustomer]);

  // Combined statement chronological ledger
  const combinedLedger = useMemo(() => {
    const entries: {
      id: string;
      date: string;
      type: 'INVOICE' | 'PAYMENT';
      reference: string;
      debit: number; // Bill amount
      credit: number; // Payment received
      description: string;
    }[] = [];

    customerInvoices.forEach(inv => {
      entries.push({
        id: inv.id,
        date: inv.date,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        debit: inv.grandTotal,
        credit: 0,
        description: `${inv.docType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Quotation'} (${inv.totalBoxes} Boxes)`,
      });
    });

    customerPayments.forEach(p => {
      entries.push({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        reference: p.receiptNo,
        debit: 0,
        credit: p.amount,
        description: `Receipt via ${p.paymentMethod} ${p.referenceNo ? `(Ref: ${p.referenceNo})` : ''}`,
      });
    });

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [customerInvoices, customerPayments]);

  // Total Market Udhaar
  const totalMarketUdhaar = customers.reduce((sum, c) => sum + c.balanceDue, 0);

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.locality.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const filteredReferrers = useMemo(() => {
    if (!searchQuery.trim()) return referrers;
    const q = searchQuery.toLowerCase();
    return referrers.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.locality.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
    );
  }, [referrers, searchQuery]);

  // Submit Payment In
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || paymentAmount <= 0) return;
    recordPayment({
      customerId: paymentCustomer.id,
      customerName: paymentCustomer.name,
      amount: paymentAmount,
      paymentMethod,
      referenceNo: paymentRefNo,
      notes: paymentNotes,
    });
    setShowPaymentModal(false);
    setPaymentCustomer(null);
  };

  // Submit Commission Payout
  const handleCommissionPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferrer || commissionAmount <= 0) return;
    recordCommissionPayout({
      referrerId: selectedReferrer.id,
      referrerName: selectedReferrer.name,
      amount: commissionAmount,
      paymentMethod: commissionMethod,
      notes: commissionNotes,
    });
    setShowCommissionModal(false);
    setSelectedReferrer(null);
  };

  // Submit New Referrer
  const handleAddReferrerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefName.trim() || !newRefPhone.trim()) return;
    addReferrer({
      name: newRefName.trim(),
      role: newRefRole,
      phone: newRefPhone.trim(),
      locality: newRefLocality.trim() || 'Jajpur Town',
      commissionPercent: newRefCommission,
    });
    setShowAddReferrerModal(false);
    setNewRefName('');
    setNewRefPhone('');
  };

  // Send WhatsApp Payment Reminder
  const handleSendReminder = (customer: Customer) => {
    const rawPhone = customer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = generatePaymentReminderWhatsApp(customer, business);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Party Khata &amp; Contractor Referrals
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Customer Udhaar ledger, payment receipts, and mason/contractor commission tracking
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-lg border border-neutral-200">
          <button
            onClick={() => setSubTab('CUSTOMERS')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'CUSTOMERS' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Customer Khata (Udhaar)
          </button>
          <button
            onClick={() => setSubTab('REFERRERS')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              subTab === 'REFERRERS' ? 'bg-[#141414] text-[#C5A059] shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Mistri / Contractor Ledger
          </button>
        </div>
      </div>

      {subTab === 'CUSTOMERS' && (
        <>
          {/* Market Udhaar KPI Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
                ₹
              </div>
              <div>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Total Market Udhaar (Receivable to Collect)
                </span>
                <div className="text-2xl font-extrabold font-mono text-red-600">
                  ₹{totalMarketUdhaar.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>{customers.length} Registered Parties</span>
              <span>·</span>
              <span>{customers.filter(c => c.balanceDue > 0).length} with Outstanding Dues</span>
            </div>
          </div>

          {/* Master-Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Customer List (Left 5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden flex flex-col h-[650px]">
              <div className="p-3.5 border-b border-neutral-200 bg-neutral-50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search party by name, phone, locality..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs py-1.5 pl-8 pr-3 bg-white border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
                {filteredCustomers.map((cust) => {
                  const isSelected = cust.id === selectedCustomerId;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/60 border-l-4 border-l-[#C5A059]' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-neutral-900">{cust.name}</div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-neutral-400" />
                            <span>{cust.phone}</span>
                            <span>·</span>
                            <span className="truncate max-w-36">{cust.locality}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-neutral-900">
                            ₹{cust.balanceDue.toLocaleString('en-IN')}
                          </div>
                          <span className={`text-[9px] font-semibold px-1 rounded ${
                            cust.balanceDue > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {cust.balanceDue > 0 ? 'DUE' : 'CLEAR'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentCustomer(cust);
                            setPaymentAmount(cust.balanceDue > 0 ? cust.balanceDue : 5000);
                            setShowPaymentModal(true);
                          }}
                          className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Record Payment
                        </button>

                        {cust.balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendReminder(cust);
                            }}
                            className="text-emerald-600 hover:underline font-medium flex items-center gap-1 ml-auto"
                            title="Send Odia + English Payment Reminder"
                          >
                            <Share2 className="w-3 h-3" />
                            WhatsApp Reminder
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statement Drill-Down (Right 7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden flex flex-col h-[650px]">
              {currentCustomer ? (
                <>
                  {/* Customer Banner */}
                  <div className="p-4 bg-neutral-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{currentCustomer.name}</h3>
                        {currentCustomer.gstin && (
                          <span className="text-[10px] bg-neutral-800 text-[#C5A059] px-1.5 py-0.5 rounded font-mono">
                            GSTIN: {currentCustomer.gstin}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {currentCustomer.phone} · {currentCustomer.locality}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      <button
                        onClick={() => {
                          setPaymentCustomer(currentCustomer);
                          setPaymentAmount(currentCustomer.balanceDue > 0 ? currentCustomer.balanceDue : 5000);
                          setShowPaymentModal(true);
                        }}
                        className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded-lg transition-colors whitespace-nowrap"
                      >
                        + Payment In
                      </button>
                      <button
                        onClick={() => handleSendReminder(currentCustomer)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-50 border-b border-neutral-200 text-center text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Total Billed</span>
                      <strong className="font-mono text-neutral-800">₹{currentCustomer.totalBilled.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Total Paid</span>
                      <strong className="font-mono text-emerald-700">₹{currentCustomer.totalPaid.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Balance Due</span>
                      <strong className="font-mono text-red-600">₹{currentCustomer.balanceDue.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Statement Table */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                      Complete Date-Wise Ledger Statement
                    </h4>

                    {combinedLedger.length === 0 ? (
                      <div className="py-12 text-center text-xs text-neutral-400">
                        No transactions recorded for this customer yet.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                            <th className="py-2 px-2.5">Date</th>
                            <th className="py-2 px-2.5">Type &amp; Ref</th>
                            <th className="py-2 px-2.5">Particulars</th>
                            <th className="py-2 px-2.5 text-right">Debit (Bill)</th>
                            <th className="py-2 px-2.5 text-right">Credit (Paid)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {combinedLedger.map((row) => (
                            <tr key={row.id} className="hover:bg-neutral-50/70">
                              <td className="py-2 px-2.5 font-mono text-[11px] text-neutral-600">
                                {row.date}
                              </td>
                              <td className="py-2 px-2.5">
                                <span className={`font-mono font-semibold ${
                                  row.type === 'INVOICE' ? 'text-neutral-900' : 'text-emerald-700'
                                }`}>
                                  {row.reference}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-neutral-600 text-[11px]">
                                {row.description}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-neutral-900 font-semibold">
                                {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-semibold">
                                {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-neutral-400 text-xs">
                  Select a customer from the left to view ledger
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Referrer / Mistri Ledger (Subtab B) */}
      {subTab === 'REFERRERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Registered Contractors, Masons &amp; Designers
              </h3>
              <p className="text-xs text-neutral-500">
                Tracks business generated by referrers and calculates commission payouts
              </p>
            </div>

            <button
              onClick={() => setShowAddReferrerModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#141414] hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>+ Register Referrer</span>
            </button>
          </div>

          {/* Referrers Table */}
          <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                    <th className="py-3 px-4">Name &amp; Role</th>
                    <th className="py-3 px-3">Phone &amp; Locality</th>
                    <th className="py-3 px-3 text-center">Referred Bills</th>
                    <th className="py-3 px-3 text-right">Business Generated</th>
                    <th className="py-3 px-3 text-right">Commission Rate</th>
                    {isOwnerMode && (
                      <>
                        <th className="py-3 px-3 text-right text-amber-800 bg-amber-50/50">Earned</th>
                        <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/50">Paid</th>
                        <th className="py-3 px-3 text-right text-red-700 bg-red-50/50">Balance</th>
                      </>
                    )}
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredReferrers.map((ref) => (
                    <tr key={ref.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <HardHat className="w-3.5 h-3.5 text-[#C5A059]" />
                          {ref.name}
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium">{ref.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-neutral-800 font-mono text-[11px]">{ref.phone}</div>
                        <div className="text-[10px] text-neutral-400">{ref.locality}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-800">
                        {ref.totalReferredBills}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                        ₹{ref.totalBusinessGenerated.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-700">
                        {ref.commissionPercent}%
                      </td>
                      {isOwnerMode && (
                        <>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-amber-900 bg-amber-50/30">
                            ₹{ref.commissionEarned.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                            ₹{ref.commissionPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-red-700 bg-red-50/30">
                            ₹{ref.balanceCommission.toLocaleString('en-IN')}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReferrer(ref);
                            setCommissionAmount(ref.balanceCommission > 0 ? ref.balanceCommission : 1000);
                            setShowCommissionModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded transition-colors whitespace-nowrap"
                        >
                          Payout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment In Modal */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-emerald-950 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-100">Record Payment In (Receipt)</h3>
                <p className="text-xs text-emerald-300">{paymentCustomer.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-emerald-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono text-sm font-bold text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reference / Transaction No (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Bank Txn ID"
                  value={paymentRefNo}
                  onChange={(e) => setPaymentRefNo(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Receipt Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-semibold"
                >
                  Confirm &amp; Update Khata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Commission Payout Modal */}
      {showCommissionModal && selectedReferrer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Mistri Commission Payout</h3>
                <p className="text-xs text-neutral-400">{selectedReferrer.name}</p>
              </div>
              <button onClick={() => setShowCommissionModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommissionPayoutSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Payout Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono text-sm font-bold text-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Payout Mode
                </label>
                <select
                  value={commissionMethod}
                  onChange={(e) => setCommissionMethod(e.target.value as any)}
                  className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={commissionNotes}
                  onChange={(e) => setCommissionNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded-lg font-bold"
                >
                  Record Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Referrer Modal */}
      {showAddReferrerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Register Mason / Contractor</h3>
                <p className="text-xs text-neutral-400">Add to showroom referral network</p>
              </div>
              <button onClick={() => setShowAddReferrerModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReferrerSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Mistri"
                  value={newRefName}
                  onChange={(e) => setNewRefName(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Role *</label>
                  <select
                    value={newRefRole}
                    onChange={(e) => setNewRefRole(e.target.value as any)}
                    className="w-full py-2 px-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="Mason (Mistri)">Mason (Mistri)</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Civil Engineer">Civil Engineer</option>
                    <option value="Interior Designer">Interior Designer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Commission %</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={newRefCommission}
                    onChange={(e) => setNewRefCommission(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9861234567"
                  value={newRefPhone}
                  onChange={(e) => setNewRefPhone(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Locality / Working Area</label>
                <input
                  type="text"
                  placeholder="e.g. Gariapur & Jajpur Town"
                  value={newRefLocality}
                  onChange={(e) => setNewRefLocality(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReferrerModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded-lg font-bold"
                >
                  Save Referrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
