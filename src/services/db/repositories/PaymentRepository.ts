import { db } from '../index';
import { Payment } from '../../../../types'; // You might need to define Payment interface if not in types.ts

export const PaymentRepository = {
  async getByBookingId(bookingId: string): Promise<any[]> {
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

  async create(payment: any): Promise<void> {
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
