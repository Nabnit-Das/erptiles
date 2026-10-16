import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Customer,
  Referrer,
  Invoice,
  DeliveryChallan,
  BusinessProfile,
  DamageLog,
  PaymentRecord,
  CommissionPayout,
  LocationType,
} from '../types/erp';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_REFERRERS,
  INITIAL_INVOICES,
  INITIAL_CHALLANS,
  INITIAL_DAMAGE_LOGS,
} from '../data/initialData';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  lastSyncedAt?: string;
  autoSync: boolean;
}

interface ErpContextType {
  // Auth & Roles
  isOwnerMode: boolean;
  unlockOwnerMode: (pin: string) => boolean;
  lockOwnerMode: () => void;
  changeOwnerPin: (currentPin: string, newPin: string) => { success: boolean; error?: string };
  
  // Navigation
  activeTab: 'pos' | 'inventory' | 'khata' | 'delivery' | 'owner';
  setActiveTab: (tab: 'pos' | 'inventory' | 'khata' | 'delivery' | 'owner') => void;
  
  // Business Profile
  business: BusinessProfile;
  updateBusiness: (updated: Partial<BusinessProfile>) => void;
  
  // Inventory
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  recordStockIn: (productId: string, quantity: number, purchasePrice?: number, location?: LocationType) => void;
  recordDamage: (log: Omit<DamageLog, 'id' | 'date'>) => void;
  damageLogs: DamageLog[];
  
  // Billing & Invoices
  invoices: Invoice[];
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  updateInvoice: (id: string, updated: Partial<Invoice>) => void;
  convertQuoteToInvoice: (quoteId: string) => Invoice | null;
  deleteInvoice: (id: string) => void;
  
  // Parties & Customers
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'totalBilled' | 'totalPaid' | 'balanceDue' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updated: Partial<Customer>) => void;
  recordPayment: (payment: Omit<PaymentRecord, 'id' | 'date' | 'receiptNo'>) => void;
  payments: PaymentRecord[];
  
  // Referrers / Mistris
  referrers: Referrer[];
  addReferrer: (ref: Omit<Referrer, 'id' | 'totalReferredBills' | 'totalBusinessGenerated' | 'commissionEarned' | 'commissionPaid' | 'balanceCommission'>) => Referrer;
  recordCommissionPayout: (payout: Omit<CommissionPayout, 'id' | 'date'>) => void;
  commissionPayouts: CommissionPayout[];
  
  // Challans & Delivery
  challans: DeliveryChallan[];
  createChallan: (challan: Omit<DeliveryChallan, 'id' | 'challanNo' | 'date'>) => DeliveryChallan;
  recordCustomerReturn: (invoiceId: string, productId: string, boxesReturned: number, refundAmount: number, reason: string) => void;
  
  // Print Modal
  previewInvoice: Invoice | null;
  setPreviewInvoice: (inv: Invoice | null) => void;
  
  // Cloud & Backup
  supabaseConfig: SupabaseConfig;
  updateSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;
  exportBackupJson: () => void;
  restoreBackupJson: (jsonString: string) => { success: boolean; message: string };
  resetToFactoryDemoData: () => void;
}

const ErpContext = createContext<ErpContextType | null>(null);

const STORAGE_KEYS = {
  OWNER_PIN: 'ssmt_owner_pin',
  BUSINESS: 'ssmt_business',
  PRODUCTS: 'ssmt_products',
  CUSTOMERS: 'ssmt_customers',
  REFERRERS: 'ssmt_referrers',
  INVOICES: 'ssmt_invoices',
  CHALLANS: 'ssmt_challans',
  DAMAGES: 'ssmt_damages',
  PAYMENTS: 'ssmt_payments',
  COMMISSIONS: 'ssmt_commissions',
  SUPABASE_CFG: 'ssmt_supabase_cfg',
};

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Owner mode state (resets to Staff on refresh for security)
  const [isOwnerMode, setIsOwnerMode] = useState<boolean>(false);
  const [ownerPin, setOwnerPin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.OWNER_PIN) || '1234';
  });

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'khata' | 'delivery' | 'owner'>('pos');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Business Profile
  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUSINESS);
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE;
  });

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  // Referrers
  const [referrers, setReferrers] = useState<Referrer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFERRERS);
    return saved ? JSON.parse(saved) : INITIAL_REFERRERS;
  });

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  // Challans
  const [challans, setChallans] = useState<DeliveryChallan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHALLANS);
    return saved ? JSON.parse(saved) : INITIAL_CHALLANS;
  });

  // Damage Logs
  const [damageLogs, setDamageLogs] = useState<DamageLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAMAGES);
    return saved ? JSON.parse(saved) : INITIAL_DAMAGE_LOGS;
  });

  // Payment Records
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  // Commission Payouts
  const [commissionPayouts, setCommissionPayouts] = useState<CommissionPayout[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMISSIONS);
    return saved ? JSON.parse(saved) : [];
  });

  // Supabase Config
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CFG);
    return saved ? JSON.parse(saved) : { url: '', anonKey: '', autoSync: false };
  });

  // Synchronize to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REFERRERS, JSON.stringify(referrers));
  }, [referrers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHALLANS, JSON.stringify(challans));
  }, [challans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DAMAGES, JSON.stringify(damageLogs));
  }, [damageLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMMISSIONS, JSON.stringify(commissionPayouts));
  }, [commissionPayouts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(business));
  }, [business]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CFG, JSON.stringify(supabaseConfig));
  }, [supabaseConfig]);

  // Auth Functions
  const unlockOwnerMode = (pin: string): boolean => {
    if (pin.trim() === ownerPin.trim()) {
      setIsOwnerMode(true);
      return true;
    }
    return false;
  };

  const lockOwnerMode = () => {
    setIsOwnerMode(false);
    if (activeTab === 'owner') {
      setActiveTab('pos');
    }
  };

  const changeOwnerPin = (currentPin: string, newPin: string) => {
    if (currentPin.trim() !== ownerPin.trim()) {
      return { success: false, error: 'Incorrect current PIN' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits' };
    }
    setOwnerPin(newPin);
    localStorage.setItem(STORAGE_KEYS.OWNER_PIN, newPin);
    return { success: true };
  };

  // Inventory Functions
  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod_${Date.now()}`,
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const recordStockIn = (productId: string, quantity: number, purchasePrice?: number, location?: LocationType) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stockBoxes: p.stockBoxes + quantity,
          purchasePrice: purchasePrice !== undefined && purchasePrice > 0 ? purchasePrice : p.purchasePrice,
          location: location || p.location,
        };
      }
      return p;
    }));
  };

  const recordDamage = (log: Omit<DamageLog, 'id' | 'date'>) => {
    const newLog: DamageLog = {
      ...log,
      id: `dmg_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    setDamageLogs(prev => [newLog, ...prev]);

    // Deduct damaged boxes from stock
    setProducts(prev => prev.map(p => {
      if (p.id === log.productId) {
        return {
          ...p,
          stockBoxes: Math.max(0, p.stockBoxes - log.boxesDamaged),
        };
      }
      return p;
    }));
  };

  // Customer Management
  const addCustomer = (custData: Omit<Customer, 'id' | 'totalBilled' | 'totalPaid' | 'balanceDue' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `cust_${Date.now()}`,
      totalBilled: 0,
      totalPaid: 0,
      balanceDue: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers(prev => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const recordPayment = (data: Omit<PaymentRecord, 'id' | 'date' | 'receiptNo'>) => {
    const receiptNo = `RCT-${Date.now().toString().slice(-6)}`;
    const newPayment: PaymentRecord = {
      ...data,
      id: `pay_${Date.now()}`,
      receiptNo,
      date: new Date().toISOString().split('T')[0],
    };

    setPayments(prev => [newPayment, ...prev]);

    // Update customer ledger
    setCustomers(prev => prev.map(c => {
      if (c.id === data.customerId) {
        const totalPaid = c.totalPaid + data.amount;
        const balanceDue = Math.max(0, c.totalBilled - totalPaid);
        return { ...c, totalPaid, balanceDue };
      }
      return c;
    }));

    // If linked to an invoice, update invoice amountReceived and balanceDue
    if (data.invoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === data.invoiceId) {
          const amountReceived = inv.amountReceived + data.amount;
          const balanceDue = Math.max(0, inv.grandTotal - amountReceived);
          return { ...inv, amountReceived, balanceDue };
        }
        return inv;
      }));
    }
  };

  // Referrers
  const addReferrer = (refData: Omit<Referrer, 'id' | 'totalReferredBills' | 'totalBusinessGenerated' | 'commissionEarned' | 'commissionPaid' | 'balanceCommission'>): Referrer => {
    const newRef: Referrer = {
      ...refData,
      id: `ref_${Date.now()}`,
      totalReferredBills: 0,
      totalBusinessGenerated: 0,
      commissionEarned: 0,
      commissionPaid: 0,
      balanceCommission: 0,
    };
    setReferrers(prev => [newRef, ...prev]);
    return newRef;
  };

  const recordCommissionPayout = (payoutData: Omit<CommissionPayout, 'id' | 'date'>) => {
    const newPayout: CommissionPayout = {
      ...payoutData,
      id: `payout_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    setCommissionPayouts(prev => [newPayout, ...prev]);

    setReferrers(prev => prev.map(r => {
      if (r.id === payoutData.referrerId) {
        const paid = r.commissionPaid + payoutData.amount;
        const balance = Math.max(0, r.commissionEarned - paid);
        return { ...r, commissionPaid: paid, balanceCommission: balance };
      }
      return r;
    }));
  };

  // Invoice & Quotations
  const createInvoice = (invData: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const newInvoice: Invoice = {
      ...invData,
      id: `inv_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // If it's a TAX_INVOICE, deduct stock immediately and update party & referrer stats
    if (newInvoice.docType === 'TAX_INVOICE') {
      // 1. Deduct stock for each line item
      setProducts(prevProducts => {
        const productMap = new Map(prevProducts.map(p => [p.id, { ...p }]));
        newInvoice.items.forEach(item => {
          const prod = productMap.get(item.productId);
          if (prod) {
            prod.stockBoxes = Math.max(0, prod.stockBoxes - item.boxesBilled);
          }
        });
        return Array.from(productMap.values());
      });

      // 2. Update customer ledger
      setCustomers(prev => prev.map(c => {
        if (c.id === newInvoice.customerId) {
          const totalBilled = c.totalBilled + newInvoice.grandTotal;
          const totalPaid = c.totalPaid + newInvoice.amountReceived;
          const balanceDue = totalBilled - totalPaid;
          return { ...c, totalBilled, totalPaid, balanceDue };
        }
        return c;
      }));

      // 3. Update referrer stats if applicable
      if (newInvoice.referrerId) {
        setReferrers(prev => prev.map(r => {
          if (r.id === newInvoice.referrerId) {
            const totalReferredBills = r.totalReferredBills + 1;
            const totalBusinessGenerated = r.totalBusinessGenerated + newInvoice.taxableSubtotal;
            const newEarned = (newInvoice.taxableSubtotal * (r.commissionPercent || 0)) / 100;
            const commissionEarned = r.commissionEarned + newEarned;
            const balanceCommission = commissionEarned - r.commissionPaid;
            return {
              ...r,
              totalReferredBills,
              totalBusinessGenerated,
              commissionEarned,
              balanceCommission,
            };
          }
          return r;
        }));
      }

      // 4. If payment was made at checkout, record payment entry
      if (newInvoice.amountReceived > 0) {
        const paymentRecord: PaymentRecord = {
          id: `pay_${Date.now()}`,
          receiptNo: `RCT-${Date.now().toString().slice(-6)}`,
          date: newInvoice.date,
          customerId: newInvoice.customerId,
          customerName: newInvoice.customerName,
          invoiceId: newInvoice.id,
          invoiceNo: newInvoice.invoiceNo,
          amount: newInvoice.amountReceived,
          paymentMethod: newInvoice.paymentMethod,
          notes: `Initial payment at billing for ${newInvoice.invoiceNo}`,
        };
        setPayments(prev => [paymentRecord, ...prev]);
      }
    }

    return newInvoice;
  };

  const updateInvoice = (id: string, updated: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updated } : inv));
  };

  const convertQuoteToInvoice = (quoteId: string): Invoice | null => {
    const quote = invoices.find(inv => inv.id === quoteId);
    if (!quote || quote.docType === 'TAX_INVOICE') return null;

    // Generate new GST invoice number
    const nextNum = invoices.filter(inv => inv.docType === 'TAX_INVOICE').length + 1;
    const invoiceNo = `SSMT/2026-27/${String(nextNum).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Compute GST for items that were 0% in quote
    const updatedItems = quote.items.map(it => {
      const prod = products.find(p => p.id === it.productId);
      const gstRate = prod?.gstPercent || 18;
      const halfRate = gstRate / 2;
      const cgst = Number(((it.taxableAmount * halfRate) / 100).toFixed(2));
      const sgst = Number(((it.taxableAmount * halfRate) / 100).toFixed(2));
      const totalAmount = Number((it.taxableAmount + cgst + sgst).toFixed(2));
      return {
        ...it,
        gstPercent: gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount,
      };
    });

    const cgstTotal = Number(updatedItems.reduce((sum, it) => sum + it.cgstAmount, 0).toFixed(2));
    const sgstTotal = Number(updatedItems.reduce((sum, it) => sum + it.sgstAmount, 0).toFixed(2));
    const rawGrandTotal = quote.taxableSubtotal + cgstTotal + sgstTotal + quote.transportCharges - quote.overallDiscount;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

    const convertedInvoice: Invoice = {
      ...quote,
      id: `inv_${Date.now()}`,
      invoiceNo,
      docType: 'TAX_INVOICE',
      date: today,
      followUpStatus: 'Won',
      items: updatedItems,
      cgstTotal,
      sgstTotal,
      roundOff,
      grandTotal,
      balanceDue: grandTotal,
      amountReceived: 0,
      deliveryStatus: 'Pending Dispatch',
      isConvertedFromQuote: true,
      createdAt: today,
    };

    // Deduct stock for each line item
    setProducts(prevProducts => {
      const productMap = new Map(prevProducts.map(p => [p.id, { ...p }]));
      convertedInvoice.items.forEach(item => {
        const prod = productMap.get(item.productId);
        if (prod) {
          prod.stockBoxes = Math.max(0, prod.stockBoxes - item.boxesBilled);
        }
      });
      return Array.from(productMap.values());
    });

    // Update customer ledger
    setCustomers(prev => prev.map(c => {
      if (c.id === convertedInvoice.customerId) {
        const totalBilled = c.totalBilled + convertedInvoice.grandTotal;
        const balanceDue = c.balanceDue + convertedInvoice.grandTotal;
        return { ...c, totalBilled, balanceDue };
      }
      return c;
    }));

    // Update quote status and add new converted invoice
    setInvoices(prev => [
      convertedInvoice,
      ...prev.map(inv => inv.id === quoteId ? { ...inv, followUpStatus: 'Won' as const } : inv)
    ]);

    return convertedInvoice;
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  // Challan Creation
  const createChallan = (challanData: Omit<DeliveryChallan, 'id' | 'challanNo' | 'date'>): DeliveryChallan => {
    const challanCount = challans.length + 1;
    const challanNo = `DC/2026-27/${String(challanCount).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newChallan: DeliveryChallan = {
      ...challanData,
      id: `ch_${Date.now()}`,
      challanNo,
      date: today,
    };

    setChallans(prev => [newChallan, ...prev]);

    // Update invoice delivery status and item deliveredQty
    setInvoices(prev => prev.map(inv => {
      if (inv.id === challanData.invoiceId) {
        const updatedItems = inv.items.map(item => {
          const deliveredMatch = challanData.items.find(ci => ci.productId === item.productId && ci.roomTag === item.roomTag);
          if (deliveredMatch) {
            return {
              ...item,
              deliveredQty: item.deliveredQty + deliveredMatch.boxesToDeliver,
            };
          }
          return item;
        });

        const allBoxes = updatedItems.reduce((sum, it) => sum + it.boxesBilled, 0);
        const totalDelivered = updatedItems.reduce((sum, it) => sum + it.deliveredQty, 0);
        let deliveryStatus = inv.deliveryStatus;
        if (totalDelivered >= allBoxes) {
          deliveryStatus = 'Delivered';
        } else if (totalDelivered > 0) {
          deliveryStatus = 'Partially Delivered';
        }

        return {
          ...inv,
          items: updatedItems,
          deliveryStatus,
        };
      }
      return inv;
    }));

    return newChallan;
  };

  // Customer Return / Exchange (e.g. 2-3 extra unopened boxes returned)
  const recordCustomerReturn = (invoiceId: string, productId: string, boxesReturned: number, refundAmount: number, reason: string) => {
    // 1. Add sealed boxes back to stock
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stockBoxes: p.stockBoxes + boxesReturned,
        };
      }
      return p;
    }));

    // 2. Adjust customer ledger (reduce balanceDue or give credit)
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (targetInvoice) {
      setCustomers(prev => prev.map(c => {
        if (c.id === targetInvoice.customerId) {
          const balanceDue = Math.max(0, c.balanceDue - refundAmount);
          return { ...c, balanceDue };
        }
        return c;
      }));

      // Update invoice notes
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceId) {
          const currentNotes = inv.notes ? `${inv.notes}; ` : '';
          return {
            ...inv,
            notes: `${currentNotes}[Return: ${boxesReturned} boxes returned (₹${refundAmount} credited). Reason: ${reason}]`,
          };
        }
        return inv;
      }));
    }
  };

  const updateBusiness = (updated: Partial<BusinessProfile>) => {
    setBusiness(prev => ({ ...prev, ...updated }));
  };

  const updateSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    setSupabaseConfig(prev => ({ ...prev, ...cfg }));
  };

  // Database Backup (JSON) & Restore
  const exportBackupJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      business,
      products,
      customers,
      referrers,
      invoices,
      challans,
      damageLogs,
      payments,
      commissionPayouts,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `SSMT_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const restoreBackupJson = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.products || !parsed.invoices) {
        return { success: false, message: 'Invalid backup file format' };
      }
      if (parsed.business) setBusiness(parsed.business);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.referrers) setReferrers(parsed.referrers);
      if (parsed.invoices) setInvoices(parsed.invoices);
      if (parsed.challans) setChallans(parsed.challans);
      if (parsed.damageLogs) setDamageLogs(parsed.damageLogs);
      if (parsed.payments) setPayments(parsed.payments);
      if (parsed.commissionPayouts) setCommissionPayouts(parsed.commissionPayouts);
      return { success: true, message: 'Backup restored successfully!' };
    } catch {
      return { success: false, message: 'Failed to parse JSON file' };
    }
  };

  const resetToFactoryDemoData = () => {
    setBusiness(INITIAL_BUSINESS_PROFILE);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setReferrers(INITIAL_REFERRERS);
    setInvoices(INITIAL_INVOICES);
    setChallans(INITIAL_CHALLANS);
    setDamageLogs(INITIAL_DAMAGE_LOGS);
    setPayments([]);
    setCommissionPayouts([]);
    localStorage.clear();
  };

  return (
    <ErpContext.Provider
      value={{
        isOwnerMode,
        unlockOwnerMode,
        lockOwnerMode,
        changeOwnerPin,
        activeTab,
        setActiveTab,
        business,
        updateBusiness,
        products,
        addProduct,
        updateProduct,
        recordStockIn,
        recordDamage,
        damageLogs,
        invoices,
        createInvoice,
        updateInvoice,
        convertQuoteToInvoice,
        deleteInvoice,
        customers,
        addCustomer,
        updateCustomer,
        recordPayment,
        payments,
        referrers,
        addReferrer,
        recordCommissionPayout,
        commissionPayouts,
        challans,
        createChallan,
        recordCustomerReturn,
        previewInvoice,
        setPreviewInvoice,
        supabaseConfig,
        updateSupabaseConfig,
        exportBackupJson,
        restoreBackupJson,
        resetToFactoryDemoData,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
};
