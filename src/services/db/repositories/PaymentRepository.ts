import { db } from '../index';

interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: string;
  collectedBy: string;
  notes?: string | null;
  currency?: string | null;
  exchangeRate?: number | null;
  convertedAmount?: number | null;
  type?: string | null;
  relatedAddOnId?: string | null;
}

export const PaymentRepository = {
  async getByBookingId(bookingId: string): Promise<PaymentRecord[]> {
    try {
      return await db
        .selectFrom('payments')
        .selectAll()
        .where('bookingId', '=', bookingId)
        .where('deletedAt', 'is', null)
        .execute();
    } catch (error) {
      console.error(`❌ PaymentRepository.getByBookingId(${bookingId}) failed:`, error);
      return [];
    }
  },

  async create(payment: PaymentRecord): Promise<void> {
    try {
      await db
        .insertInto('payments')
        .values({
          id: payment.id,
          bookingId: payment.bookingId,
          amount: payment.amount,
          date: payment.date,
          method: payment.method,
          collectedBy: payment.collectedBy,
          notes: payment.notes || null,
          deletedAt: null
        })
        .execute();
    } catch (error) {
      console.error('❌ PaymentRepository.create failed:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await db
        .updateTable('payments')
        .set({ deletedAt: Date.now() })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ PaymentRepository.delete(${id}) failed:`, error);
      throw error;
    }
  }
};
