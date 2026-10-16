import React from 'react';
import { ErpProvider, useErp } from './context/ErpContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { PosBillingTab } from './components/pos/PosBillingTab';
import { InventoryTab } from './components/inventory/InventoryTab';
import { KhataTab } from './components/khata/KhataTab';
import { DeliveryTab } from './components/delivery/DeliveryTab';
import { OwnerDashboardTab } from './components/owner/OwnerDashboardTab';
import { A4InvoicePrintModal } from './components/print/A4InvoicePrintModal';

const AppContent: React.FC = () => {
  const { activeTab, previewInvoice, setPreviewInvoice } = useErp();

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col text-[#141414]">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'pos' && <PosBillingTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'khata' && <KhataTab />}
          {activeTab === 'delivery' && <DeliveryTab />}
          {activeTab === 'owner' && <OwnerDashboardTab />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Dedicated A4 Print & WhatsApp Share Modal */}
      <A4InvoicePrintModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErpProvider>
      <AppContent />
    </ErpProvider>
  );
}
