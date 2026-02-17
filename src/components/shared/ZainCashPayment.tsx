import React, { useState } from 'react';
import { Booking } from '../../types';
import { zainCashService } from '../../services/zaincash';
import { toast } from 'sonner';
import { CreditCard, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ZainCashPaymentProps {
  booking: Booking;
  onPaymentSuccess: (transactionId: string) => void;
}

export const ZainCashPayment: React.FC<ZainCashPaymentProps> = ({ booking, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(
    booking.zainCashTransactionId || null
  );

  const handlePay = async () => {
    try {
      setLoading(true);
      const remainingAmount = booking.totalAmount - booking.paidAmount;

      if (remainingAmount <= 0) {
        toast.error('المبلغ مدفوع بالكامل');
        return;
      }

      const response = await zainCashService.initiatePayment(
        remainingAmount,
        booking.id,
        booking.servicePackage
      );

      setPaymentUrl(response.url);
      setTransactionId(response.id);

      // Open in default browser (Electron or Web)
      const electronApi = window.electronAPI as
        | (typeof window.electronAPI & { openExternal?: (url: string) => void | Promise<void> })
        | undefined;
      if (electronApi?.openExternal) {
        void electronApi.openExternal(response.url);
      } else {
        window.open(response.url, '_blank');
      }

      toast.success('تم فتح بوابة الدفع');
    } catch (error) {
      toast.error('فشل في الاتصال ببوابة الدفع');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      const response = await zainCashService.checkStatus(transactionId);

      if (response.status === 'success' || response.status === 'completed') {
        toast.success('تم الدفع بنجاح!');
        onPaymentSuccess(transactionId);
        setPaymentUrl(null); // Reset UI
      } else if (response.status === 'pending') {
        toast.info('عملية الدفع لا تزال قيد الانتظار...');
      } else {
        toast.error(`حالة الدفع: ${response.status}`);
      }
    } catch (error) {
      toast.error('فشل في التحقق من الحالة');
    } finally {
      setLoading(false);
    }
  };

  if (booking.totalAmount - booking.paidAmount <= 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-bold text-gray-400 mb-3">الدفع الإلكتروني (ZainCash)</h4>

      {!paymentUrl && !transactionId ? (
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
          دفع عبر زين كاش
        </button>
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span>وضع التجربة: استخدم بيانات اختبار زين كاش للدفع</span>
          </div>

          <div className="flex gap-2">
            {paymentUrl && (
              <button
                onClick={() => window.open(paymentUrl, '_blank')}
                className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
              >
                <ExternalLink size={12} /> فتح الرابط
              </button>
            )}

            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"
            >
              {loading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              تحقق من الحالة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
