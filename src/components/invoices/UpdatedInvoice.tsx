import React from 'react';
import { FileText, Download, Send, Printer, CheckCircle, Package, Plus } from 'lucide-react';
import { formatMoney } from '../../utils/formatMoney';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { InvoiceEntry, AddOnItem } from '../../types/addon.types';
import { Booking } from '../../../types';
import { AddOnCategoryLabels } from '../../types/addon.types';

interface UpdatedInvoiceProps {
  booking: Booking;
  addOns: AddOnItem[];
  invoice: InvoiceEntry;
  onSendToCustomer?: () => void;
  onDownloadPDF?: () => void;
}

export const UpdatedInvoice: React.FC<UpdatedInvoiceProps> = ({
  booking,
  addOns,
  invoice,
  onSendToCustomer,
  onDownloadPDF,
}) => {
  const originalPrice = booking.originalPackagePrice || booking.totalAmount - (booking.addOnTotal || 0);
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.amount, 0);
  const remainingBalance = invoice.totalAmount - booking.paidAmount;

  const handleSendWhatsApp = () => {
    const message = generateInvoiceMessage();
    const url = getWhatsAppUrl(booking.clientPhone || '', message);
    window.open(url, '_blank');
    onSendToCustomer?.();
  };

  const generateInvoiceMessage = (): string => {
    const lines = [
      `مرحباً ${booking.clientName}،`,
      '',
      `فاتورتكم المحدثة رقم: ${invoice.invoiceNumber}`,
      '━━━━━━━━━━━━━━━',
      `📦 الباقة الأصلية: ${formatMoney(originalPrice, booking.currency)}`,
    ];

    if (addOns.length > 0) {
      lines.push('');
      lines.push('📋 الخدمات الإضافية:');
      addOns.forEach(addOn => {
        lines.push(`  • ${addOn.description}: ${formatMoney(addOn.amount, addOn.currency)}`);
      });
      lines.push(`  الإجمالي: ${formatMoney(addOnsTotal, booking.currency)}`);
    }

    lines.push('');
    lines.push(`💰 الإجمالي الكلي: ${formatMoney(invoice.totalAmount, invoice.currency)}`);
    lines.push(`💳 المدفوع: ${formatMoney(booking.paidAmount, booking.currency)}`);
    lines.push(`📌 المتبقي: ${formatMoney(remainingBalance, booking.currency)}`);
    lines.push('━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('شكراً لاختياركم فيلا حداد 📸');

    return lines.join('\n');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">فاتورة محدثة</h2>
            <p className="text-blue-100 mt-1">رقم: {invoice.invoiceNumber}</p>
            <p className="text-blue-100">التاريخ: {formatDate(invoice.generatedAt)}</p>
          </div>
          <div className="text-left">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm text-blue-100">حالة الفاتورة</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                <span className="font-medium">{invoice.sentToCustomer ? 'تم الإرسال' : 'جاهزة'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-3">معلومات العميل</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">الاسم</p>
            <p className="font-medium text-gray-900">{booking.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">رقم الهاتف</p>
            <p className="font-medium text-gray-900" dir="ltr">{booking.clientPhone}</p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-6 space-y-6">
        {/* Original Package */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-gray-600" />
            <h3 className="font-bold text-gray-900">الباقة الأصلية</h3>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700">{booking.servicePackage}</p>
              <p className="text-sm text-gray-500">السعر الأساسي</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatMoney(originalPrice, booking.currency)}
            </p>
          </div>
        </div>

        {/* Add-Ons */}
        {addOns.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900">الخدمات الإضافية</h3>
            </div>
            <div className="space-y-3">
              {addOns.map(addOn => (
                <div
                  key={addOn.id}
                  className="flex justify-between items-start p-3 bg-white rounded-lg border border-blue-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{addOn.description}</p>
                    <p className="text-sm text-gray-500">
                      {AddOnCategoryLabels[addOn.category]}
                    </p>
                    {addOn.approvedByName && (
                      <p className="text-xs text-gray-400 mt-1">
                        تمت الموافقة بواسطة: {addOn.approvedByName}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-blue-700">
                      +{formatMoney(addOn.amount, addOn.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      سعر الصرف: {addOn.exchangeRate.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-blue-200">
              <span className="font-bold text-blue-900">إجمالي الإضافات</span>
              <span className="text-xl font-bold text-blue-700">
                {formatMoney(addOnsTotal, booking.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-linear-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">الإجمالي الكلي</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-gray-600">
              <span>المدفوع سابقاً</span>
              <span className="font-medium">{formatMoney(booking.paidAmount, booking.currency)}</span>
            </div>
            
            <div className="pt-3 border-t border-emerald-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-rose-700">المتبقي للدفع</span>
                <span className="text-2xl font-bold text-rose-600">
                  {formatMoney(remainingBalance, booking.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Note */}
        {booking.paymentHistory && booking.paymentHistory.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-2">ملاحظة</h4>
            <p className="text-sm text-amber-800">
              تم تسجيل {booking.paymentHistory.length} دفعة(s) سابقاً. 
              يمكن الاطلاع على تفاصيل المدفوعات في سجل المدفوعات.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Send className="w-5 h-5" />
            إرسال للعميل عبر واتساب
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-5 h-5" />
            طباعة
          </button>

          <button
            onClick={onDownloadPDF}
            disabled={!onDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-5 h-5" />
            تحميل PDF
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-100 text-center">
        <p className="text-sm text-gray-600">
          شكراً لاختياركم فيلا حداد للتصوير 📸
        </p>
        <p className="text-xs text-gray-500 mt-1">
          تم إنشاء هذه الفاتورة بتاريخ {formatDate(invoice.generatedAt)}
        </p>
      </div>
    </div>
  );
};

// Invoice Preview Component (for listing)
interface InvoicePreviewProps {
  invoice: InvoiceEntry;
  booking: Booking;
  onClick?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  booking: _booking,
  onClick,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-500">{formatDate(invoice.generatedAt)}</p>
          </div>
        </div>
        
        <div className="text-left">
          <p className="font-bold text-gray-900">
            {formatMoney(invoice.totalAmount, invoice.currency)}
          </p>
          <div className="flex items-center gap-1">
            {invoice.sentToCustomer ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600">تم الإرسال</span>
              </>
            ) : (
              <span className="text-xs text-amber-600">بانتظار الإرسال</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatedInvoice;
