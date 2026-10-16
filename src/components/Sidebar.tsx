import React, { useState } from 'react';
import {
  Receipt,
  Boxes,
  Users,
  Truck,
  TrendingUp,
  Lock,
  Phone,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PinModal } from './modals/PinModal';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isOwnerMode, business } = useErp();
  const [showPinModal, setShowPinModal] = useState(false);

  const navItems = [
    {
      id: 'pos' as const,
      label: 'POS Billing & Quotes',
      description: 'Estimates & Tax Invoices',
      icon: Receipt,
    },
    {
      id: 'inventory' as const,
      label: 'Stock & Godown',
      description: 'Tiles, Slabs & Chemicals',
      icon: Boxes,
    },
    {
      id: 'khata' as const,
      label: 'Party Khata & Referrals',
      description: 'Customer Udhaar & Mistris',
      icon: Users,
    },
    {
      id: 'delivery' as const,
      label: 'Split Delivery & Challan',
      description: 'Dispatches & Returns',
      icon: Truck,
    },
    {
      id: 'owner' as const,
      label: 'Owner & Tally Export',
      description: 'Profits & Tax Reports',
      icon: TrendingUp,
      requiresOwner: true,
    },
  ];

  const handleTabClick = (itemId: typeof activeTab, requiresOwner?: boolean) => {
    if (requiresOwner && !isOwnerMode) {
      setShowPinModal(true);
      return;
    }
    setActiveTab(itemId);
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 bg-[#141414] text-neutral-300 border-r border-neutral-800 shrink-0 select-none min-h-[calc(100vh-4rem)]">
        {/* Navigation List */}
        <div className="p-3 space-y-1 flex-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Main ERP Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = item.requiresOwner && !isOwnerMode;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.requiresOwner)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors group ${
                  isActive
                    ? 'bg-[#C5A059] text-[#141414] font-semibold shadow-xs'
                    : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? 'text-[#141414]'
                        : 'text-neutral-400 group-hover:text-[#C5A059]'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-xs font-medium truncate">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? 'text-neutral-800' : 'text-neutral-500'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>

                {isLocked && (
                  <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Showroom Footer Info */}
        <div className="p-3 border-t border-neutral-800/80 text-xs space-y-2">
          <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800">
            <div className="text-[11px] font-semibold text-[#C5A059] flex items-center justify-between">
              <span>Showroom Desk</span>
              <span className="text-[9px] bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded">
                ODISHA
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
              {business.addressLine1}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-1.5 pt-1.5 border-t border-neutral-800">
              <Phone className="w-3 h-3 text-[#C5A059]" />
              <span>{business.phone}</span>
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 text-center">
            SSMT ERP v2.6 · Offline Ready
          </div>
        </div>
      </aside>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => setActiveTab('owner')}
      />
    </>
  );
};
