/**
 * SelectionModal Component
 * 
 * Modal wrapper for SelectionDashboard
 * Opens when user wants to select images for a session
 */

import React from 'react';
import { X } from 'lucide-react';
import { SelectionDashboard } from './SelectionDashboard';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  clientName: string;
  onComplete?: () => void;
}

export function SelectionModal({ 
  isOpen, 
  onClose, 
  bookingId, 
  clientName, 
  onComplete 
}: SelectionModalProps) {
  console.log('[SelectionModal] Rendering - isOpen:', isOpen, 'bookingId:', bookingId);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-[#1a1c22] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 p-2 bg-[#21242b] hover:bg-[#2a2d35] rounded-full shadow-lg transition-colors border border-white/10"
        >
          <X className="w-5 h-5 text-gray-300" />
        </button>

        {/* Dashboard */}
        <div className="flex-1 overflow-hidden">
          <SelectionDashboard
            bookingId={bookingId}
            clientName={clientName}
            onComplete={() => {
              onComplete?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
