import { AddOnItem, AddOnNotification } from '../types/addon.types';
import { Booking } from '../../types';
import { formatMoney } from './formatMoney';

/**
 * Generate WhatsApp message for add-on approval notification
 */
export const generateAddOnApprovedMessage = (
  addOn: AddOnItem,
  booking: Booking
): string => {
  const remainingBalance = addOn.newTotal - booking.paidAmount;

  const lines = [
    `مرحباً ${booking.clientName}،`,
    '',
    'تمت الموافقة على الخدمة الإضافية التالية:',
    `📋 ${addOn.description}`,
    `💰 المبلغ: ${formatMoney(addOn.amount, addOn.currency)}`,
    '',
    'الفاتورة المحدثة:',
    '━━━━━━━━━━━━━━━',
    `الباقة الأصلية: ${formatMoney(addOn.originalPackagePrice, booking.currency)}`,
    `الإضافات: ${formatMoney(addOn.amount, addOn.currency)}`,
    `الإجمالي الجديد: ${formatMoney(addOn.newTotal, booking.currency)}`,
    `المدفوع: ${formatMoney(booking.paidAmount, booking.currency)}`,
    `المتبقي: ${formatMoney(remainingBalance, booking.currency)}`,
    '━━━━━━━━━━━━━━━',
    '',
    'للاستفسار، يرجى التواصل معنا.',
    'شكراً لاختياركم فيلا حداد 📸',
  ];

  return lines.join('\n');
};

/**
 * Generate WhatsApp message for add-on request notification
 */
export const generateAddOnRequestMessage = (
  addOn: AddOnItem,
  booking: Booking
): string => {
  const lines = [
    `مرحباً ${booking.clientName}،`,
    '',
    'نود إعلامكم بوجود خدمة إضافية مقترحة:',
    `📋 ${addOn.description}`,
    `💰 المبلغ: ${formatMoney(addOn.amount, addOn.currency)}`,
    '',
    'في انتظار موافقتكم.',
    '',
    'للموافقة، يرجى الرد على هذه الرسالة أو الاتصال بنا.',
  ];

  return lines.join('\n');
};

/**
 * Generate WhatsApp message for payment reminder
 */
export const generatePaymentReminderMessage = (
  booking: Booking,
  remainingBalance: number
): string => {
  const lines = [
    `مرحباً ${booking.clientName}،`,
    '',
    'تذكير بموعد الدفع:',
    `📋 الحجز: ${booking.title}`,
    `💰 المبلغ المتبقي: ${formatMoney(remainingBalance, booking.currency)}`,
    '',
    'نرجو تسوية المبلغ المتبقي في أقرب وقت ممكن.',
    '',
    'للاستفسار، يرجى التواصل معنا.',
    'شكراً لاختياركم فيلا حداد 📸',
  ];

  return lines.join('\n');
};

/**
 * Generate WhatsApp message for invoice ready notification
 */
export const generateInvoiceReadyMessage = (
  invoiceNumber: string,
  booking: Booking,
  totalAmount: number
): string => {
  const lines = [
    `مرحباً ${booking.clientName}،`,
    '',
    `فاتورتكم رقم ${invoiceNumber} جاهزة!`,
    '',
    `📋 الحجز: ${booking.title}`,
    `💰 الإجمالي: ${formatMoney(totalAmount, booking.currency)}`,
    '',
    'يمكنكم الاطلاع على تفاصيل الفاتورة والدفع من خلال التواصل معنا.',
    '',
    'شكراً لاختياركم فيلا حداد 📸',
  ];

  return lines.join('\n');
};

/**
 * Generate WhatsApp message for balance change notification
 */
export const generateBalanceChangeMessage = (
  booking: Booking,
  oldBalance: number,
  newBalance: number,
  changeAmount: number
): string => {
  const isIncrease = changeAmount > 0;
  
  const lines = [
    `مرحباً ${booking.clientName}،`,
    '',
    'تحديث على رصيد الحجز:',
    `📋 ${booking.title}`,
    '',
    isIncrease 
      ? `⬆️ تمت إضافة: ${formatMoney(changeAmount, booking.currency)}`
      : `⬇️ تم خصم: ${formatMoney(Math.abs(changeAmount), booking.currency)}`,
    '',
    `الرصيد السابق: ${formatMoney(oldBalance, booking.currency)}`,
    `الرصيد الحالي: ${formatMoney(newBalance, booking.currency)}`,
    '',
    'للاستفسار، يرجى التواصل معنا.',
    'شكراً لاختياركم فيلا حداد 📸',
  ];

  return lines.join('\n');
};

/**
 * Format notification for display
 */
export const formatNotification = (notification: AddOnNotification): {
  title: string;
  description: string;
  icon: string;
} => {
  switch (notification.type) {
    case 'approved':
      return {
        title: 'تمت الموافقة على خدمة إضافية',
        description: 'تمت الموافقة على الخدمة الإضافية وإشعار العميل',
        icon: 'check-circle',
      };
    case 'request':
      return {
        title: 'طلب خدمة إضافية جديد',
        description: 'تم إرسال طلب الخدمة الإضافية للعميل',
        icon: 'plus-circle',
      };
    case 'invoice_ready':
      return {
        title: 'فاتورة جاهزة',
        description: 'الفاتورة المحدثة جاهزة للإرسال',
        icon: 'file-text',
      };
    case 'payment_reminder':
      return {
        title: 'تذكير بالدفع',
        description: 'تم إرسال تذكير بالدفع للعميل',
        icon: 'dollar-sign',
      };
    default:
      return {
        title: 'إشعار',
        description: 'إشعار جديد',
        icon: 'bell',
      };
  }
};

/**
 * Get notification priority
 */
export const getNotificationPriority = (type: AddOnNotification['type']): 'high' | 'medium' | 'low' => {
  switch (type) {
    case 'approved':
      return 'high';
    case 'invoice_ready':
      return 'high';
    case 'payment_reminder':
      return 'medium';
    case 'request':
      return 'low';
    default:
      return 'low';
  }
};
