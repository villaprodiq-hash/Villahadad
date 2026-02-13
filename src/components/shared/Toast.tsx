import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 4000 }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        // Allow animation to finish before calling onClose
        setTimeout(onClose, 300); 
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onClose]);

  // If not visible and not showing (animation done), don't render to avoid clicks
  if (!isVisible && !show) return null;

  return (
    <div 
      className={`fixed bottom-8 right-8 z-[200] transition-all duration-500 transform ${
        show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
      }`}
    >
      <div className="relative group">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative bg-[#1E1E1E]/90 backdrop-blur-xl border border-white/10 pr-4 pl-10 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] overflow-hidden">
          
          {/* Gradient Status Line */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-400 to-green-600" />
          
          {/* Icon */}
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <CheckCircle2 size={20} strokeWidth={3} />
          </div>
          
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">تمت العملية بنجاح</h4>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{message}</p>
          </div>

          <button 
            onClick={() => setShow(false)}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;