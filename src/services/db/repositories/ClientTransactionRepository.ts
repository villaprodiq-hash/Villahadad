import { db } from '../index';
import { ClientTransaction, ClientTransactionStatus } from '../../../types/client-transaction.types';

/**
 * Client Transaction Repository
 * Handles CRUD operations for client credit transactions
 */
export const ClientTransactionRepository = {
  async getByClientId(clientId: string): Promise<ClientTransaction[]> {
    try {
      const transactions = await db
        .selectFrom('client_transactions')
        .selectAll()
        .where('clientId', '=', clientId)
        .orderBy('createdAt', 'desc')
        .execute();

      return transactions.map(t => ({
        ...t,
        status: t.status as ClientTransactionStatus,
      })) as ClientTransaction[];
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.getByClientId(${clientId}) failed:`, error);
      return [];
    }
  },

  async getById(id: string): Promise<ClientTransaction | null> {
    try {
      const t = await db
        .selectFrom('client_transactions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!t) return null;

      return {
        ...t,
        status: t.status as ClientTransactionStatus,
      } as ClientTransaction;
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.getById(${id}) failed:`, error);
      return null;
    }
  },

  async getByBookingId(bookingId: string): Promise<ClientTransaction[]> {
    try {
      const transactions = await db
        .selectFrom('client_transactions')
        .selectAll()
        .where('bookingId', '=', bookingId)
        .orderBy('createdAt', 'desc')
        .execute();

      return transactions.map(t => ({
        ...t,
        status: t.status as ClientTransactionStatus,
      })) as ClientTransaction[];
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.getByBookingId(${bookingId}) failed:`, error);
      return [];
    }
  },

  async create(transaction: ClientTransaction): Promise<void> {
    try {
      await db
        .insertInto('client_transactions')
        .values({
          id: transaction.id,
          clientId: transaction.clientId,
          bookingId: transaction.bookingId || null,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          note: transaction.note,
          status: transaction.status,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          createdBy: transaction.createdBy,
          createdByName: transaction.createdByName,
          canReverseUntil: transaction.canReverseUntil,
          reversedAt: transaction.reversedAt || null,
          reversedBy: transaction.reversedBy || null,
          reversedByName: transaction.reversedByName || null,
          reversalReason: transaction.reversalReason || null,
          balanceAfter: transaction.balanceAfter,
        })
        .execute();
    } catch (error) {
      console.error('❌ ClientTransactionRepository.create failed:', error);
      throw error;
    }
  },

  async reverse(
    id: string,
    reversedBy: string,
    reversedByName: string,
    reason?: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      await db
        .updateTable('client_transactions')
        .set({
          status: 'reversed',
          updatedAt: now,
          reversedAt: now,
          reversedBy,
          reversedByName,
          reversalReason: reason || null,
        })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.reverse(${id}) failed:`, error);
      throw error;
    }
  },

  async getActiveByClientId(clientId: string): Promise<ClientTransaction[]> {
    try {
      const transactions = await db
        .selectFrom('client_transactions')
        .selectAll()
        .where('clientId', '=', clientId)
        .where('status', '=', 'active')
        .orderBy('createdAt', 'desc')
        .execute();

      return transactions.map(t => ({
        ...t,
        status: t.status as ClientTransactionStatus,
      })) as ClientTransaction[];
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.getActiveByClientId(${clientId}) failed:`, error);
      return [];
    }
  },

  async calculateBalance(clientId: string): Promise<number> {
    try {
      const result = await db
        .selectFrom('client_transactions')
        .select(({ fn }) => [
          fn.sum('amount').as('total'),
        ])
        .where('clientId', '=', clientId)
        .where('status', '=', 'active')
        .executeTakeFirst();

      return (result?.total as number) || 0;
    } catch (error) {
      console.error(`❌ ClientTransactionRepository.calculateBalance(${clientId}) failed:`, error);
      return 0;
    }
  },

  async getRecent(days: number = 30): Promise<ClientTransaction[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const transactions = await db
        .selectFrom('client_transactions')
        .selectAll()
        .where('createdAt', '>=', cutoffDate.toISOString())
        .orderBy('createdAt', 'desc')
        .execute();

      return transactions.map(t => ({
        ...t,
        status: t.status as ClientTransactionStatus,
      })) as ClientTransaction[];
    } catch (error) {
      console.error('❌ ClientTransactionRepository.getRecent failed:', error);
      return [];
    }
  },
};
