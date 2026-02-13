import React, { useRef, useState, useEffect } from 'react';
import { AlertTriangle, Lock, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Draggable from 'react-draggable';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  outstandingAmount: number;
  onSettle: (amount: number) => Promise<void>;
}

const PaymentLockModal: React.FC<PaymentLockModalProps> = ({ isOpen, onClose, outstandingAmount, onSettle }) => {
  const [paymentAmount, setPaymentAmount] = useState<string>(outstandingAmount.toString());
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const nodeRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      setPaymentAmount(outstandingAmount.toString());
      setIsSuccess(false);
      setIsSettling(false);
    }
  }, [isOpen, outstandingAmount]);

  if (!isOpen) return null;

  const handleSettleSubmit = async () => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount)) {
      setIsSettling(true);
      await onSettle(amount);
      setIsSuccess(true);
      // Wait for 1.5 seconds to show success before closing
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity duration-300" dir="rtl">
      <Draggable nodeRef={nodeRef} handle=".modal-header">
        <div ref={nodeRef} className="bg-[#1E1E1E] border border-emerald-500/20 w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden animate-in fade-in duration-300 ring-1 ring-white/5 relative">
          
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="payment-step"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent opacity-50 pointer-events-none" />

                {/* Header */}
                <div className="modal-header cursor-move p-8 pb-0 flex items-start gap-5 relative z-10">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <AlertTriangle size={32} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-2xl font-bold text-white tracking-tight">يرجى تصفية الحساب</h3>
                    <p className="text-emerald-400 text-sm mt-1 font-medium">يتوجب دفع المبلغ المتبقي للمتابعة.</p>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6 relative z-10">
                  
                  {/* Amount Input Card */}
                  <div className="bg-gradient-to-b from-black/60 to-black/30 p-8 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center gap-3 shadow-[inset_0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    
                    <span className="text-emerald-400/80 text-xs font-bold uppercase tracking-[0.2em] relative z-10">المبلغ المراد قبضه</span>
                    <div className="relative z-10 flex items-center justify-center w-full">
                       <input 
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-transparent text-center text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] outline-none"
                        autoFocus
                       />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-widest">بإمكانك تعديل الرقم في حال وجود خصم</p>
                  </div>
                  
                  <p className="text-gray-400 text-sm leading-relaxed text-center font-medium">
                    تم تثبيت المبلغ المتبقي افتراضياً. يرجى التأكد من استلام المبلغ قبل الضغط على "تأكيد واستمرار".
                  </p>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#121212]/80 backdrop-blur-sm flex gap-4 justify-between items-center border-t border-white/5 relative z-10">
                  <button 
                    onClick={onClose}
                    className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded-xl disabled:opacity-50"
                    disabled={isSettling}
                  >
                    إلغاء
                  </button>
                  
                  <button 
                    onClick={handleSettleSubmit}
                    disabled={isSettling}
                    className="relative flex-1 group overflow-hidden px-8 py-3.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:scale-[1.02] active:scale-95 ring-1 ring-white/20 disabled:opacity-70"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
                    
                    <div className="flex items-center justify-center gap-2 relative z-10">
                       <span>{isSettling ? 'جاري الحفظ...' : 'تأكيد واستمرار'}</span>
                       <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    </div>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="p-12 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                  <CheckCircle2 size={56} className="animate-in zoom-in duration-500" />
                </div>
                <h3 className="text-2xl font-black text-white">تم تصفية الحساب بنجاح</h3>
                <p className="text-emerald-400 font-bold">تم تحديث حالة الحجز ونقل البطاقة.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Draggable>
    </div>
  );
};

export default PaymentLockModal;