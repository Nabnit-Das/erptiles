import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, MapPin, Plus, Store } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PinModal } from './modals/PinModal';

export const Header: React.FC = () => {
  const { isOwnerMode, lockOwnerMode, setActiveTab } = useErp();
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <header className="bg-[#141414] text-white border-b border-neutral-800 sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Area */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C5A059] to-[#99732A] flex items-center justify-center text-[#141414] shadow-md font-bold text-lg">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Shirdi Sai Marbles &amp; Tiles
            </span>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#C5A059]" />
                Gariapur, Jajpur Town
              </span>
              <span className="hidden sm:inline text-neutral-600">·</span>
              <span className="hidden sm:inline text-neutral-400">Odisha 755001</span>
            </div>
          </div>
        </div>

        {/* Right Action & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Create Bill */}
          <button
            onClick={() => setActiveTab('pos')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#141414] bg-[#C5A059] hover:bg-[#B08D44] transition-colors rounded-lg shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bill / Quote</span>
          </button>

          {/* Role-Based Mode Switcher */}
          {isOwnerMode ? (
            <button
              onClick={lockOwnerMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-lg hover:bg-emerald-900/60 transition-colors"
              title="Click to lock Owner Mode and switch to Staff Mode"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Owner Mode: Active</span>
              <span className="md:hidden">Owner</span>
              <Lock className="w-3 h-3 text-neutral-400 ml-1" />
            </button>
          ) : (
            <button
              onClick={() => setShowPinModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-700 hover:border-[#C5A059]/60 hover:text-[#C5A059] rounded-lg transition-colors"
              title="Enter 4-digit PIN to unlock purchase rates & profit analytics"
            >
              <Lock className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="hidden md:inline">Staff Mode (Active)</span>
              <span className="md:hidden">Staff</span>
              <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.2 rounded font-mono">
                PIN
              </span>
            </button>
          )}
        </div>
      </div>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => setActiveTab('owner')}
      />
    </header>
  );
};
