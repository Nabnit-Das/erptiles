import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Upload,
  Database,
  Lock,
  Copy,
  Check,
  DollarSign,
  PieChart,
  Target,
  RefreshCw,
  Wallet,
  Building,
  HardHat,
  ShieldAlert
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { generateGstr1Csv, formatIndianCurrency } from '../../utils/calculations';

export const OwnerDashboardTab: React.FC = () => {
  const {
    invoices,
    products,
    customers,
    referrers,
    payments,
    damageLogs,
    lockOwnerMode,
    exportBackupJson,
    restoreBackupJson,
    supabaseConfig,
    updateSupabaseConfig,
    resetToFactoryDemoData
  } = useErp();

  const [copiedSchema, setCopiedSchema] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<{ success: boolean; msg: string } | null>(null);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(supabaseConfig.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(supabaseConfig.anonKey);
  const [isSavedSupabase, setIsSavedSupabase] = useState(false);

  // Financial Metrics Calculation
  const gstInvoices = useMemo(() => invoices.filter(i => i.docType === 'TAX_INVOICE'), [invoices]);
  const quotations = useMemo(() => invoices.filter(i => i.docType === 'QUOTATION'), [invoices]);

  // Total Confirmed Revenue
  const totalRevenue = useMemo(() => {
    return gstInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [gstInvoices]);

  // Monthly Target
  const MONTHLY_TARGET = 3000000; // ₹30,00,000 target
  const targetProgress = Math.min(100, Math.round((totalRevenue / MONTHLY_TARGET) * 100));

  // Today's collections
  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.date === today);
  const todayCash = todayPayments.filter(p => p.paymentMethod === 'Cash').reduce((s, p) => s + p.amount, 0);
  const todayUpi = todayPayments.filter(p => p.paymentMethod === 'UPI').reduce((s, p) => s + p.amount, 0);
  const todayBank = todayPayments.filter(p => p.paymentMethod === 'Bank Transfer').reduce((s, p) => s + p.amount, 0);
  const todayTotal = todayCash + todayUpi + todayBank;

  // Market Udhaar
  const marketUdhaar = customers.reduce((sum, c) => sum + c.balanceDue, 0);

  // Gross Profit Calculation
  // Revenue - Purchase Cost of sold items - Contractor Commissions Paid
  const { totalPurchaseCost, totalTaxableRevenue, totalCommissionsEarned } = useMemo(() => {
    let cost = 0;
    let taxable = 0;
    gstInvoices.forEach(inv => {
      taxable += inv.taxableSubtotal;
      inv.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const itemCost = prod ? prod.purchasePrice : 0;
        if (it.pricingUnit === 'per_sqft') {
          cost += itemCost * it.actualTotalSqft;
        } else {
          cost += itemCost * it.boxesBilled;
        }
      });
    });

    const commissions = referrers.reduce((s, r) => s + r.commissionEarned, 0);

    return {
      totalPurchaseCost: cost,
      totalTaxableRevenue: taxable,
      totalCommissionsEarned: commissions,
    };
  }, [gstInvoices, products, referrers]);

  const grossProfit = Math.max(0, totalTaxableRevenue - totalPurchaseCost - totalCommissionsEarned);
  const profitMarginPercent = totalTaxableRevenue > 0 ? Math.round((grossProfit / totalTaxableRevenue) * 100) : 0;

  // Quotation Conversion Rate
  const totalQuotesCount = quotations.length;
  const wonQuotesCount = invoices.filter(i => i.isConvertedFromQuote || i.followUpStatus === 'Won').length;
  const quoteConversionRate = totalQuotesCount + wonQuotesCount > 0
    ? Math.round((wonQuotesCount / (totalQuotesCount + wonQuotesCount)) * 100)
    : 0;

  // Download GSTR-1 CSV
  const handleDownloadGstr1 = () => {
    const csvContent = generateGstr1Csv(gstInvoices);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GSTR1_Sales_Register_SSMT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore file picker
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = restoreBackupJson(content);
      setRestoreNotice({ success: res.success, msg: res.message });
      setTimeout(() => setRestoreNotice(null), 4000);
    };
    reader.readAsText(file);
  };

  // Supabase SQL Schema string
  const SUPABASE_SQL_SCHEMA = `-- Supabase SQL Schema for Shirdi Sai Marbles & Tiles ERP
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size_label TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  sqft_per_box NUMERIC,
  pieces_per_box INT,
  batch_shade_no TEXT,
  location TEXT,
  stock_boxes INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 20,
  selling_price NUMERIC NOT NULL,
  purchase_price NUMERIC,
  gst_percent NUMERIC DEFAULT 18,
  hsn_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality TEXT NOT NULL,
  gstin TEXT,
  total_billed NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  doc_type TEXT NOT NULL,
  date DATE NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  total_boxes INT NOT NULL,
  total_sqft NUMERIC NOT NULL,
  taxable_subtotal NUMERIC NOT NULL,
  cgst_total NUMERIC,
  sgst_total NUMERIC,
  grand_total NUMERIC NOT NULL,
  amount_received NUMERIC NOT NULL,
  balance_due NUMERIC NOT NULL,
  payment_method TEXT,
  delivery_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- End of Schema`;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig({
      url: supabaseUrlInput.trim(),
      anonKey: supabaseKeyInput.trim(),
      autoSync: true,
      lastSyncedAt: new Date().toISOString(),
    });
    setIsSavedSupabase(true);
    setTimeout(() => setIsSavedSupabase(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Owner Executive Financial &amp; Tax Portal
            </h2>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">
              PIN UNLOCKED
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gross margins, GSTR-1/Tally sales registers, and multi-device cloud synchronization
          </p>
        </div>

        <button
          onClick={lockOwnerMode}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock &amp; Exit Owner Mode</span>
        </button>
      </div>

      {/* Monthly Sales Target Progress Bar */}
      <div className="bg-gradient-to-br from-[#141414] to-[#1E1E1E] text-white p-5 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[11px] font-semibold text-[#C5A059] uppercase tracking-wider">
              Monthly Showroom Revenue Goal
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
              ₹{totalRevenue.toLocaleString('en-IN')} <span className="text-xs font-normal text-neutral-400">/ ₹{MONTHLY_TARGET.toLocaleString('en-IN')} Target</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold font-mono text-[#C5A059]">{targetProgress}%</span>
            <div className="text-[11px] text-neutral-400">Achieved this month</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden border border-neutral-700">
          <div
            className="bg-gradient-to-r from-[#99732A] via-[#C5A059] to-[#E3BE78] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, targetProgress)}%` }}
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Actual Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">
            ₹{grossProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Margin: <strong className="font-mono text-neutral-800">{profitMarginPercent}%</strong> (after cost &amp; mistri commission)
          </div>
        </div>

        {/* Today's Counter Collection */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Collections</span>
            <Wallet className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-neutral-900">
            ₹{todayTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-2">
            <span>Cash: ₹{todayCash}</span>
            <span>·</span>
            <span>UPI: ₹{todayUpi}</span>
            <span>·</span>
            <span>Bank: ₹{todayBank}</span>
          </div>
        </div>

        {/* Market Udhaar */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Market Udhaar</span>
            <DollarSign className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-600">
            ₹{marketUdhaar.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Pending collection across {customers.filter(c => c.balanceDue > 0).length} parties
          </div>
        </div>

        {/* Quote Conversion Rate */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Quote Win Rate</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-blue-600">
            {quoteConversionRate}%
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Quotations converted into confirmed GST sales
          </div>
        </div>

      </div>

      {/* 1-Click Tally & CA GSTR-1 Sales Register Export */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#C5A059]" />
            <h3 className="text-sm font-bold text-neutral-900">
              Download GSTR-1 &amp; Tally Sales Register (CSV)
            </h3>
          </div>
          <p className="text-xs text-neutral-500 max-w-xl">
            Generates standardized CSV file with all {gstInvoices.length} GST invoices, customer GSTIN, HSN summaries, CGST, SGST, and taxable values formatted specifically for your Chartered Accountant and Tally ERP.
          </p>
        </div>

        <button
          onClick={handleDownloadGstr1}
          className="px-5 py-2.5 text-xs font-bold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] rounded-lg transition-colors shadow-sm flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export GSTR-1 Sales Register (CSV)</span>
        </button>
      </div>

      {/* Offline Backup & Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Full Database Backup */}
        <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-neutral-900">
              Offline Database Backup &amp; Restore
            </h3>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            All your showroom data (stock, bills, customers, challans, ledger) is safely stored in browser storage. Download an offline JSON file for your records or restore on a new computer.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={exportBackupJson}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#141414] hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Export Full Backup (JSON)</span>
            </button>

            <label className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border border-neutral-300">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Backup (JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                className="hidden"
              />
            </label>
          </div>

          {restoreNotice && (
            <div className={`p-2.5 rounded-lg text-xs font-medium ${
              restoreNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {restoreNotice.msg}
            </div>
          )}
        </div>

        {/* Supabase Live Multi-Device Sync Configuration */}
        <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Supabase Multi-Device Cloud Sync
              </h3>
            </div>
            <button
              onClick={handleCopySchema}
              className="text-[11px] font-semibold text-[#B08D44] hover:underline flex items-center gap-1"
            >
              {copiedSchema ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <p className="text-xs text-neutral-600">
            Paste your project URL and Anon Key to sync stock and invoices in real time across showroom laptops and mobile phones.
          </p>

          <form onSubmit={handleSaveSupabase} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                SUPABASE_URL
              </label>
              <input
                type="text"
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full py-1.5 px-2.5 border border-neutral-300 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                SUPABASE_ANON_KEY
              </label>
              <input
                type="password"
                value={supabaseKeyInput}
                onChange={(e) => setSupabaseKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full py-1.5 px-2.5 border border-neutral-300 rounded-lg font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-neutral-400">
                {supabaseConfig.url ? 'Status: Configured' : 'Status: Local-Only'}
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#141414] hover:bg-neutral-800 text-[#C5A059] font-bold rounded-lg text-xs"
              >
                Save Sync Credentials
              </button>
            </div>

            {isSavedSupabase && (
              <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 p-2 rounded text-center">
                Supabase configuration saved to secure storage!
              </div>
            )}
          </form>
        </div>

      </div>

      {/* Factory Demo Reset Warning */}
      <div className="pt-4 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-400">
        <span>Shirdi Sai Marbles &amp; Tiles ERP · Version 2.6</span>
        <button
          onClick={() => {
            if (window.confirm('Reset all ERP data to factory demo products and customer records?')) {
              resetToFactoryDemoData();
            }
          }}
          className="text-neutral-400 hover:text-red-600 transition-colors"
        >
          Reset Demo Data
        </button>
      </div>

    </div>
  );
};
