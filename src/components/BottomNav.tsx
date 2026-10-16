import React, { useState } from 'react';
import { Receipt, Boxes, Users, Truck, TrendingUp, Lock } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PinModal } from './modals/PinModal';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isOwnerMode } = useErp();
  const [showPinModal, setShowPinModal] = useState(false);

  const navItems = [
    { id: 'pos' as const, label: 'Billing', icon: Receipt },
    { id: 'inventory' as const, label: 'Stock', icon: Boxes },
    { id: 'khata' as const, label: 'Khata', icon: Users },
    { id: 'delivery' as const, label: 'Challan', icon: Truck },
    { id: 'owner' as const, label: 'Owner', icon: TrendingUp, requiresOwner: true },
  ];

  const handleNavClick = (id: typeof activeTab, requiresOwner?: boolean) => {
    if (requiresOwner && !isOwnerMode) {
      setShowPinModal(true);
      return;
    }
    setActiveTab(id);
  };

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414] border-t border-neutral-800 h-14 flex items-center justify-around px-1 select-none shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLocked = item.requiresOwner && !isOwnerMode;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.requiresOwner)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors relative ${
                isActive ? 'text-[#C5A059]' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isLocked && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-[#C5A059]" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 truncate whitespace-nowrap ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => setActiveTab('owner')}
      />
    </>
  );
};
