import { PaymentRepository as paymentRepo } from '../repositories/PaymentRepository';
import { BookingRepository as bookingRepo } from '../repositories/BookingRepository';
import { AddOnRepository as addOnRepo } from '../repositories/AddOnRepository';
import { PaymentSchema } from '../validation';
import { SyncQueueService } from '../../sync/SyncQueue';
import { PaymentHistoryEntry, AddOnItem } from '../../../types/addon.types';
import { Currency } from '../../../../types';

/**
 * Vibe Engineering: Payment Service
 * Handles installment logic, add-on payments, and updates booking state.
 */
export class PaymentService {
  async addPayment(bookingId: string, paymentData: any) {
    const validated = PaymentSchema.parse({
      ...paymentData,
      id: paymentData.id || `pay_${Date.now()}`,
      bookingId,
      date: paymentData.date || new Date().toISOString(),
    });

    // 1. Record the payment
    await paymentRepo.create(validated);

    // 2. Update the booking's paidAmount (Critical Path)
    const booking = await bookingRepo.getById(bookingId);
    if (booking) {
      const newPaidAmount = (booking.paidAmount || 0) + validated.amount;
      await bookingRepo.update(bookingId, { paidAmount: newPaidAmount });
      
      // 3. Add to payment history
      const paymentHistoryEntry: PaymentHistoryEntry = {
        id: validated.id,
        amount: validated.amount,
        currency: (paymentData.currency || booking.currency) as Currency,
        exchangeRate: paymentData.exchangeRate || booking.exchangeRate || 1400,
        convertedAmount: validated.amount, // ✅ No conversion - amount stays in original currency
        type: paymentData.type || 'installment',
        paidAt: validated.date,
        receivedBy: validated.collectedBy,
        paymentMethod: paymentData.paymentMethod || 'Cash',
        notes: validated.notes,
      };
      
      await this.appendPaymentHistory(bookingId, paymentHistoryEntry);
    }

    // Queue for sync
    await SyncQueueService.enqueue('create', 'payment', validated);

    return validated;
  }

  async settlePayment(bookingId: string, collectedBy: string) {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const remaining = (booking.totalAmount || 0) - (booking.paidAmount || 0);
    if (remaining > 0) {
      const paymentData = {
        amount: remaining,
        method: 'Cash',
        collectedBy,
        notes: 'تسوية المبلغ المتبقي',
        currency: booking.currency,
        exchangeRate: booking.exchangeRate || 1400,
        convertedAmount: remaining, // ✅ No conversion - stays in original currency
        type: 'final_settlement',
        paymentMethod: 'Cash',
      };
      
      await this.addPayment(bookingId, paymentData);
    }
  }

  async getPayments(bookingId: string) {
    return await paymentRepo.getByBookingId(bookingId);
  }

  /**
   * Add payment specifically for an add-on
   */
  async addAddOnPayment(
    bookingId: string,
    addOnId: string,
    paymentData: {
      amount: number;
      currency: Currency;
      exchangeRate: number;
      paymentMethod: 'Cash' | 'Mastercard' | 'ZainCash';
      notes?: string;
    },
    user: { id: string; name: string }
  ): Promise<PaymentHistoryEntry> {
    const booking = await bookingRepo.getById(bookingId);
    const addOn = await addOnRepo.getById(addOnId);

    if (!booking || !addOn) {
      throw new Error('Booking or add-on not found');
    }

    if (addOn.status !== 'approved' && addOn.status !== 'invoiced') {
      throw new Error(`Cannot pay for add-on with status: ${addOn.status}`);
    }

    // Create payment record
    const payment: PaymentHistoryEntry = {
      id: `pay_${Date.now()}`,
      amount: paymentData.amount,
      currency: paymentData.currency,
      exchangeRate: paymentData.exchangeRate,
      convertedAmount: paymentData.amount, // ✅ No conversion - stays in original currency
      type: 'add_on_payment',
      relatedAddOnId: addOnId,
      paidAt: new Date().toISOString(),
      receivedBy: user.name,
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes || `دفع مقابل: ${addOn.description}`,
    };

    // Save payment to payments table
    await paymentRepo.create({
      id: payment.id,
      bookingId,
      amount: payment.amount,
      date: payment.paidAt,
      method: payment.paymentMethod,
      collectedBy: user.name,
      notes: payment.notes,
      currency: payment.currency,
      exchangeRate: payment.exchangeRate,
      convertedAmount: payment.convertedAmount,
      type: payment.type,
      relatedAddOnId: addOnId,
    });

    // Update booking paid amount
    const newPaidAmount = booking.paidAmount + paymentData.amount;
    await bookingRepo.update(bookingId, { 
      paidAmount: newPaidAmount,
    });

    // Update add-on status
    await addOnRepo.update(addOnId, {
      status: 'paid',
      paymentRecordId: payment.id,
      paidAt: payment.paidAt,
    });

    // Log to payment history
    await this.appendPaymentHistory(bookingId, payment);

    // Queue for sync
    await SyncQueueService.enqueue('create', 'payment', payment);
    await SyncQueueService.enqueue('update', 'add_on', {
      id: addOnId,
      status: 'paid',
      paymentRecordId: payment.id,
      paidAt: payment.paidAt,
    });

    return payment;
  }

  /**
   * Get complete payment history with exchange rate details
   */
  async getPaymentHistory(bookingId: string): Promise<PaymentHistoryEntry[]> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    // First try to get from paymentHistory field
    if (booking.paymentHistory) {
      return typeof booking.paymentHistory === 'string'
        ? JSON.parse(booking.paymentHistory)
        : booking.paymentHistory;
    }

    // Fallback to payments table
    const payments = await paymentRepo.getByBookingId(bookingId);
    return payments.map(p => ({
      id: p.id,
      amount: p.amount,
      currency: (p.currency || booking.currency) as Currency,
      exchangeRate: p.exchangeRate || booking.exchangeRate || 1400,
      convertedAmount: p.convertedAmount || p.amount,
      type: (p.type as PaymentHistoryEntry['type']) || 'installment',
      relatedAddOnId: p.relatedAddOnId,
      paidAt: p.date,
      receivedBy: p.collectedBy,
      paymentMethod: (p.method as PaymentHistoryEntry['paymentMethod']) || 'Cash',
      notes: p.notes,
    }));
  }

  /**
   * Settle remaining balance with add-on awareness
   */
  async settlePaymentWithAddOns(
    bookingId: string,
    collectedBy: string,
    currentExchangeRate?: number
  ): Promise<{ payment: PaymentHistoryEntry | null; remainingBalance: number }> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const remaining = booking.totalAmount - booking.paidAmount;
    if (remaining <= 0) {
      return { payment: null, remainingBalance: 0 };
    }

    const rateToUse = currentExchangeRate || booking.exchangeRate || 1400;

    // Create final settlement payment record
    const payment: PaymentHistoryEntry = {
      id: `pay_${Date.now()}`,
      amount: remaining,
      currency: booking.currency,
      exchangeRate: rateToUse,
      convertedAmount: remaining, // ✅ No conversion - stays in original currency
      type: 'final_settlement',
      paidAt: new Date().toISOString(),
      receivedBy: collectedBy,
      paymentMethod: 'Cash',
      notes: 'تسوية المبلغ المتبقي شامل الإضافات',
    };

    // Save payment
    await paymentRepo.create({
      id: payment.id,
      bookingId,
      amount: payment.amount,
      date: payment.paidAt,
      method: payment.paymentMethod,
      collectedBy,
      notes: payment.notes,
      currency: payment.currency,
      exchangeRate: payment.exchangeRate,
      convertedAmount: payment.convertedAmount,
      type: payment.type,
    });

    // Update booking
    await bookingRepo.update(bookingId, { 
      paidAmount: booking.totalAmount,
    });

    // Log to payment history
    await this.appendPaymentHistory(bookingId, payment);

    // Queue for sync
    await SyncQueueService.enqueue('create', 'payment', payment);

    return { payment, remainingBalance: 0 };
  }

  /**
   * Calculate remaining balance considering all add-ons
   */
  async calculateRemainingBalance(bookingId: string): Promise<{
    originalPackagePrice: number;
    totalAddOns: number;
    currentTotal: number;
    paidAmount: number;
    remainingBalance: number;
  }> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const originalPackagePrice = booking.originalPackagePrice || booking.totalAmount;
    const totalAddOns = (booking.addOnTotal || 0);
    const currentTotal = booking.totalAmount;
    const paidAmount = booking.paidAmount;
    const remainingBalance = currentTotal - paidAmount;

    return {
      originalPackagePrice,
      totalAddOns,
      currentTotal,
      paidAmount,
      remainingBalance,
    };
  }

  // ===== Private Helper Methods =====

  private async appendPaymentHistory(
    bookingId: string,
    entry: PaymentHistoryEntry
  ): Promise<void> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) return;

    const history: PaymentHistoryEntry[] = booking.paymentHistory
      ? typeof booking.paymentHistory === 'string'
        ? JSON.parse(booking.paymentHistory)
        : booking.paymentHistory
      : [];

    history.push(entry);

    await bookingRepo.update(bookingId, {
      paymentHistory: history,
    });
  }
}

export const paymentService = new PaymentService();
