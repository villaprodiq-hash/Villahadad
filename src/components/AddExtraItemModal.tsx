import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, DollarSign, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AddExtraItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (amount: number, description: string, selectedCurrency: string) => void;
  bookingCurrency?: string;
}

const AddExtraItemModal: React.FC<AddExtraItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  bookingCurrency = 'IQD',
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(bookingCurrency);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ✅ تنسيق الرقم مع فواصل الآلاف (1,500,000)
  const formatNumberWithCommas = (value: string | number): string => {
    if (!value && value !== 0) return '';
    const numStr = String(value).replace(/[^\d]/g, '');
    if (!numStr) return '';
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // ✅ إزالة الفواصل للحصول على الرقم الخام
  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  // ✅ معالجة إدخال المبلغ مع حفظ موضع المؤشر
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPos = input.selectionStart || 0;
    const oldValue = input.value;
    const oldCommasBefore = (oldValue.slice(0, cursorPos).match(/,/g) || []).length;
    
    // تحويل الأرقام العربية إلى إنجليزية
    let rawValue = e.target.value;
    const arabicNums: { [key: string]: string } = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    rawValue = rawValue.split('').map(char => arabicNums[char] || char).join('');
    
    // إزالة كل شيء ما عدا الأرقام
    const cleanValue = rawValue.replace(/[^\d]/g, '');
    
    // تطبيق الفواصل
    const formattedValue = formatNumberWithCommas(cleanValue);
    setAmount(cleanValue);
    
    // حساب موضع المؤشر الجديد
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const newCommasBefore = (formattedValue.slice(0, cursorPos).match(/,/g) || []).length;
        const newPos = cursorPos + (newCommasBefore - oldCommasBefore);
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleSubmit = () => {
    const amountValue = parseNumber(amount);

    if (!amountValue || amountValue <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!description.trim()) {
      toast.error('يرجى إدخال وصف للخدمة');
      return;
    }

    onAdd(amountValue, description.trim(), selectedCurrency);

    // إعادة تعيين الحقول
    setAmount('');
    setDescription('');
    setSelectedCurrency(bookingCurrency);
    onClose();
    toast.success(`تم إضافة ${formatNumberWithCommas(amountValue)} ${selectedCurrency === 'USD' ? '$' : 'د.ع'} بنجاح`);
  };

  // إغلاق بـ Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // حساب المبلغ المعروض
  const displayAmount = formatNumberWithCommas(amount);
  const numericAmount = parseNumber(amount);

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1c22] rounded-3xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header with Gradient */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/5">
          {/* Decorative */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">إضافة خدمة إضافية</h2>
                <p className="text-xs text-gray-400">بند مالي إضافي للحجز</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white hover:rotate-90 duration-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* المبلغ */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              <DollarSign size={14} className="text-purple-400" />
              المبلغ
            </label>
            {/* Currency Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSelectedCurrency('IQD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCurrency === 'IQD'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                دينار عراقي (IQD)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCurrency('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCurrency === 'USD'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                دولار ($)
              </button>
            </div>
            <div className="relative group">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={handleAmountChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="0"
                className="w-full px-5 py-4 bg-black/40 border-2 border-white/10 rounded-2xl text-2xl font-black text-white focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all text-center placeholder:text-gray-600 tracking-wider"
                style={{ fontFamily: 'monospace' }}
              />
              {/* Currency Badge */}
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border ${
                selectedCurrency === 'USD'
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-purple-500/20 border-purple-500/30'
              }`}>
                <span className={`text-sm font-black ${selectedCurrency === 'USD' ? 'text-green-400' : 'text-purple-400'}`}>
                  {selectedCurrency === 'USD' ? '$' : 'د.ع'}
                </span>
              </div>
              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            </div>
            
            {/* Live Preview */}
            {numericAmount > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">المبلغ:</span>
                  <span className={`text-lg font-black ${selectedCurrency === 'USD' ? 'text-green-400' : 'text-purple-400'}`}>
                    {selectedCurrency === 'USD' ? '$' : ''}{displayAmount} {selectedCurrency === 'IQD' ? <span className="text-xs text-gray-500">د.ع</span> : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* الوصف */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              <FileText size={14} className="text-pink-400" />
              وصف الخدمة
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: صور إضافية، فيديو إضافي، إكسسوارات، مكياج..."
              rows={3}
              className="w-full px-4 py-3.5 bg-black/40 border-2 border-white/10 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-pink-500/50 focus:bg-black/60 transition-all resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-2">
            {['صور إضافية', 'فيديو إضافي', 'مكياج', 'إكسسوارات', 'تصوير درون'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDescription(suggestion)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  description === suggestion
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* الأزرار */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-bold hover:bg-white/10 hover:text-white transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={!numericAmount || !description.trim()}
              className="flex-1 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Plus size={18} />
              إضافة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExtraItemModal;
