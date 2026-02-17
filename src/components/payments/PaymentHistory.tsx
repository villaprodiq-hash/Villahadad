import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, DollarSign, Calendar, User, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatMoney } from '../../utils/formatMoney';
import { paymentService } from '../../services/db/services/PaymentService';
import { PaymentHistoryEntry } from '../../types/addon.types';
import { Booking } from '../../../types';

interface PaymentHistoryProps {
  booking: Booking;
}

interface PaymentTypeInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const paymentTypeMap: Record<PaymentHistoryEntry['type'], PaymentTypeInfo> = {
  initial_deposit: {
    label: 'عربون تأكيدي',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: <CreditCard className="w-4 h-4" />,
  },
  installment: {
    label: 'دفعة جزئية',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: <ArrowUpRight className="w-4 h-4" />,
  },
  add_on_payment: {
    label: 'دفع إضافة',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    icon: <ArrowUpRight className="w-4 h-4" />,
  },
  final_settlement: {
    label: 'تسوية نهائية',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: <TrendingUp className="w-4 h-4" />,
  },
};

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ booking }) => {
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceInfo, setBalanceInfo] = useState<{
    originalPackagePrice: number;
    totalAddOns: number;
    currentTotal: number;
    paidAmount: number;
    remainingBalance: number;
  } | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    setLoading(true);
    try {
      const history = await paymentService.getPaymentHistory(booking.id);
      setPayments(history);

      const balance = await paymentService.calculateRemainingBalance(booking.id);
      setBalanceInfo(balance);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    void loadPaymentHistory();
  }, [loadPaymentHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentTypeInfo = (type: PaymentHistoryEntry['type']): PaymentTypeInfo => {
    return paymentTypeMap[type] || paymentTypeMap.installment;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Balance Summary Cards */}
      {balanceInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-linear-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">الباقة الأصلية</p>
            <p className="text-lg font-bold text-gray-900">
              {formatMoney(balanceInfo.originalPackagePrice, booking.currency)}
            </p>
          </div>
          
          <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">الإضافات</p>
            <p className="text-lg font-bold text-blue-700">
              {formatMoney(balanceInfo.totalAddOns, booking.currency)}
            </p>
          </div>
          
          <div className="bg-linear-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-600 mb-1">المدفوع</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatMoney(balanceInfo.paidAmount, booking.currency)}
            </p>
          </div>
          
          <div className="bg-linear-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200">
            <p className="text-xs text-rose-600 mb-1">المتبقي</p>
            <p className="text-lg font-bold text-rose-700">
              {formatMoney(balanceInfo.remainingBalance, booking.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            سجل المدفوعات
          </h3>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>لا توجد مدفوعات مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-700 text-sm">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">نوع الدفعة</th>
                  <th className="px-4 py-3 text-right font-medium">المبلغ الأصلي</th>
                  <th className="px-4 py-3 text-right font-medium">سعر الصرف</th>
                  <th className="px-4 py-3 text-right font-medium">المحول (د.ع)</th>
                  <th className="px-4 py-3 text-right font-medium">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right font-medium">المستلم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(payment => {
                  const typeInfo = getPaymentTypeInfo(payment.type);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {formatDate(payment.paidAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {formatMoney(payment.amount, payment.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {payment.exchangeRate.toLocaleString()}
                        </div>
                        {payment.currency === 'USD' && (
                          <div className="text-xs text-gray-400">
                            دينار/دولار
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-emerald-600">
                          {formatMoney(payment.convertedAmount, 'IQD')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {payment.paymentMethod === 'Cash' && 'نقدي'}
                          {payment.paymentMethod === 'Mastercard' && 'بطاقة'}
                          {payment.paymentMethod === 'ZainCash' && 'زين كاش'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{payment.receivedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {payments.length > 0 && balanceInfo && (
        <div className="bg-linear-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-800 mb-1">إجمالي المدفوعات</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatMoney(balanceInfo.paidAmount, booking.currency)}
              </p>
            </div>
            
            <div className="text-left">
              <p className="text-sm text-gray-600 mb-1">المتبقي للتسوية</p>
              <p className={`text-2xl font-bold ${balanceInfo.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatMoney(balanceInfo.remainingBalance, booking.currency)}
              </p>
            </div>
          </div>
          
          {balanceInfo.remainingBalance > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="flex items-center gap-2 text-amber-700">
                <ArrowDownRight className="w-5 h-5" />
                <span className="text-sm">
                  يوجد مبلغ متبقي يجب تسويته قبل تسليم الطلب
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exchange Rate Info */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          معلومات أسعار الصرف
        </h4>
        <p className="text-sm text-blue-700 leading-relaxed">
          يتم تسجيل سعر الصرف لكل دفعة على حدة عند إجرائها. 
          المبلغ المحول يظهر بالدينار العراقي (IQD) بناءً على سعر الصرف السائد وقت الدفع.
          هذا يساعد في الحفاظ على سجل دقيق للقيمة الفعلية للمدفوعات.
        </p>
      </div>
    </div>
  );
};

export default PaymentHistory;
