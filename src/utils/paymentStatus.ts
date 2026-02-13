import { Booking } from '../types';

export type PaymentStatus = 'paid_full' | 'paid_partial' | 'unpaid';

export const getPaymentStatus = (booking: Booking): PaymentStatus => {
  if (booking.paidAmount >= booking.totalAmount && booking.totalAmount > 0) {
    return 'paid_full';
  }
  if (booking.paidAmount > 0) {
    return 'paid_partial';
  }
  return 'unpaid';
};

export const getPaymentStatusLabel = (status: PaymentStatus): string => {
  switch (status) {
    case 'paid_full':
      return 'واصل كامل';
    case 'paid_partial':
      return 'واصل جزء';
    case 'unpaid':
      return 'غير مدفوع';
    default:
      return 'غير معروف';
  }
};

export const getPaymentStatusColor = (status: PaymentStatus): string => {
  switch (status) {
    case 'paid_full':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'paid_partial':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'unpaid':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};
