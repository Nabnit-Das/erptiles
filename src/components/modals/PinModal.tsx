import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, X } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { unlockOwnerMode, changeOwnerPin, isOwnerMode } = useErp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = unlockOwnerMode(pin);
    if (success) {
      setPin('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError('Incorrect PIN. Default is 1234.');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (newPin !== confirmPin) {
      setError('New PINs do not match');
      return;
    }
    const result = changeOwnerPin(oldPin, newPin);
    if (result.success) {
      setSuccessMsg('PIN updated successfully!');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setIsChangingPin(false);
        setSuccessMsg('');
      }, 1500);
    } else {
      setError(result.error || 'Failed to update PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#141414] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                {isChangingPin ? 'Change Owner PIN' : 'Owner Mode Authentication'}
              </h2>
              <p className="text-xs text-neutral-400">Restricted financial and margin access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close PIN modal"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isChangingPin ? (
            <form onSubmit={handleUnlock} className="space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Enter your 4-digit Owner PIN to view purchase prices, gross profits, contractor commissions, and the Tally GST export.
              </p>

              <div>
                <label htmlFor="owner-pin-input" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Enter 4-Digit PIN
                </label>
                <input
                  id="owner-pin-input"
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-2.5 px-4 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
                />
              </div>

              {error && (
                <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#C5A059] hover:bg-[#B08D44] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock Mode
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                <span>Default PIN: <strong className="font-mono text-neutral-800">1234</strong></span>
                <button
                  type="button"
                  onClick={() => { setIsChangingPin(true); setError(''); }}
                  className="text-[#C5A059] hover:underline font-medium"
                >
                  Change PIN
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Current PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="Current 4-digit PIN"
                  className="w-full text-sm font-mono py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">New PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New 4-digit PIN"
                  className="w-full text-sm font-mono py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm 4-digit PIN"
                  className="w-full text-sm font-mono py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>

              {error && (
                <div className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded-lg text-center">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg text-center">
                  {successMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsChangingPin(false); setError(''); }}
                  className="flex-1 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#C5A059] hover:bg-[#B08D44] rounded-lg"
                >
                  Save New PIN
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
