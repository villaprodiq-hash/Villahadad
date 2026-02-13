
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  customContent?: React.ReactNode; // Optional custom content instead of message
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel,
  customContent 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#2a2d35] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {customContent ? (
          <div className="mb-6">{customContent}</div>
        ) : (
          <p className="text-gray-300 mb-6">{message}</p>
        )}
        
        {(confirmLabel || cancelLabel) && (
          <div className="flex gap-3 justify-end">
            {cancelLabel && (
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            {confirmLabel && (
              <button 
                onClick={onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-bold"
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmationModal;
