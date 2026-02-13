import React, { useState } from 'react';
import { WifiOff, X } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (!isOffline || isDismissed) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-sm text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium shadow-lg"
      dir="rtl"
    >
      <WifiOff size={14} />
      <span>وضع عدم الاتصال - البيانات محفوظة محلياً</span>
      <button 
        onClick={() => setIsDismissed(true)}
        className="mr-auto p-1 hover:bg-white/20 rounded transition-colors"
        title="إخفاء"
      >
        <X size={14} />
      </button>
    </div>
  );
};
