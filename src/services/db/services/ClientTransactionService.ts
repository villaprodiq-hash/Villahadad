import { ClientTransactionRepository as repo } from '../repositories/ClientTransactionRepository';
import { 
  ClientTransaction, 
  CreateClientTransactionDTO, 
  ReverseClientTransactionDTO,
  ClientBalance,
  ClientTransactionSummary,
  ClientTransactionType,
  ClientTransactionStatus
} from '../../../types/client-transaction.types';
import { Currency } from '../../../types/shared.types';
import { activityLogService } from './ActivityLogService';
import { SyncQueueService } from '../../sync/SyncQueue';
import { toast } from 'sonner';

// Constants
const REVERSAL_WINDOW_MINUTES = 5;

/**
 * Client Transaction Service
 * Manages client credit additions, deductions, and reversals
 */
export class ClientTransactionService {
  /**
   * Add a credit to client's account
   */
  async addCredit(
    data: CreateClientTransactionDTO
  ): Promise<ClientTransaction> {
    const now = new Date();
    const canReverseUntil = new Date(now.getTime() + REVERSAL_WINDOW_MINUTES * 60 * 1000);
    
    // Calculate current balance
    const currentBalance = await repo.calculateBalance(data.clientId);
    const newBalance = currentBalance + data.amount;

    const transaction: ClientTransaction = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId: data.clientId,
      bookingId: data.bookingId,
      amount: data.amount,
      currency: data.currency,
      type: data.type || 'credit_addition',
      note: data.note,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      canReverseUntil: canReverseUntil.toISOString(),
      balanceAfter: newBalance,
    };

    // Save to database
    await repo.create(transaction);

    // Log activity
    await activityLogService.logAction(
      'create',
      'client_transaction',
      transaction.id,
      `إضافة مبلغ ${data.amount} ${data.currency} لرصيد العميل`,
      { id: data.createdBy, name: data.createdByName }
    );

    // Queue for sync
    await SyncQueueService.enqueue('create', 'client_transaction', transaction);

    // Show success notification
    toast.success(`تم إضافة ${data.amount.toLocaleString()} ${data.currency} إلى رصيد العميل`, {
      description: `الرصيد الجديد: ${newBalance.toLocaleString()} ${data.currency}`,
      action: {
        label: 'تراجع',
        onClick: () => this.reverseTransaction({
          transactionId: transaction.id,
          reversedBy: data.createdBy,
          reversedByName: data.createdByName,
          reason: 'تراجع فوري',
        }),
      },
    });

    return transaction;
  }

  /**
   * Reverse a transaction (within the allowed time window)
   */
  async reverseTransaction(
    data: ReverseClientTransactionDTO
  ): Promise<boolean> {
    const transaction = await repo.getById(data.transactionId);
    
    if (!transaction) {
      toast.error('العملية غير موجودة');
      return false;
    }

    if (transaction.status === 'reversed') {
      toast.error('العملية تم التراجع عنها مسبقاً');
      return false;
    }

    // Check if within reversal window
    const now = new Date();
    const canReverseUntil = new Date(transaction.canReverseUntil);
    
    if (now > canReverseUntil) {
      toast.error(`انتهت فترة التراجع (${REVERSAL_WINDOW_MINUTES} دقائق)`, {
        description: 'لا يمكن التراجع عن العملية بعد انقضاء المهلة',
      });
      return false;
    }

    // Perform reversal
    await repo.reverse(
      data.transactionId,
      data.reversedBy,
      data.reversedByName,
      data.reason
    );

    // Log activity
    await activityLogService.logAction(
      'reverse',
      'client_transaction',
      transaction.id,
      `تراجع عن إضافة مبلغ ${transaction.amount} ${transaction.currency}`,
      { id: data.reversedBy, name: data.reversedByName }
    );

    // Queue for sync
    await SyncQueueService.enqueue('update', 'client_transaction', {
      id: transaction.id,
      status: 'reversed',
      reversedAt: now.toISOString(),
      reversedBy: data.reversedBy,
    });

    // Recalculate balance
    const newBalance = await repo.calculateBalance(transaction.clientId);

    toast.success('تم التراجع عن العملية بنجاح', {
      description: `الرصيد الحالي: ${newBalance.toLocaleString()} ${transaction.currency}`,
    });

    return true;
  }

  /**
   * Get all transactions for a client with display info
   */
  async getClientTransactions(clientId: string): Promise<ClientTransaction[]> {
    return await repo.getByClientId(clientId);
  }

  /**
   * Get client balance summary
   */
  async getClientBalance(clientId: string, currency: Currency = 'IQD'): Promise<ClientBalance> {
    const transactions = await repo.getActiveByClientId(clientId);
    
    const totalAdditions = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDeductions = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const currentBalance = await repo.calculateBalance(clientId);
    const lastTransaction = transactions[0];

    return {
      clientId,
      totalAdditions,
      totalDeductions,
      currentBalance,
      currency,
      lastTransactionAt: lastTransaction?.createdAt,
    };
  }

  /**
   * Get transaction summary for a client
   */
  async getTransactionSummary(clientId: string): Promise<ClientTransactionSummary> {
    const transactions = await repo.getByClientId(clientId);
    const activeTransactions = transactions.filter(t => t.status === 'active');

    const totalAdditions = activeTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDeductions = activeTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalTransactions: transactions.length,
      totalAdditions,
      totalDeductions,
      recentTransactions: transactions.slice(0, 10),
    };
  }

  /**
   * Check if a transaction can be reversed
   */
  canReverse(transaction: ClientTransaction): boolean {
    if (transaction.status === 'reversed') return false;
    
    const now = new Date();
    const canReverseUntil = new Date(transaction.canReverseUntil);
    
    return now <= canReverseUntil;
  }

  /**
   * Get time remaining for reversal (in seconds)
   */
  getReversalTimeRemaining(transaction: ClientTransaction): number {
    if (transaction.status === 'reversed') return 0;
    
    const now = new Date();
    const canReverseUntil = new Date(transaction.canReverseUntil);
    const remaining = canReverseUntil.getTime() - now.getTime();
    
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Format reversal time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Deduct credit from client (for future use)
   */
  async deductCredit(
    data: CreateClientTransactionDTO
  ): Promise<ClientTransaction | null> {
    const currentBalance = await repo.calculateBalance(data.clientId);
    
    if (currentBalance < data.amount) {
      toast.error('رصيد العميل غير كافٍ', {
        description: `الرصيد المتاح: ${currentBalance.toLocaleString()} ${data.currency}`,
      });
      return null;
    }

    const now = new Date();
    const canReverseUntil = new Date(now.getTime() + REVERSAL_WINDOW_MINUTES * 60 * 1000);
    const newBalance = currentBalance - data.amount;

    const transaction: ClientTransaction = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId: data.clientId,
      bookingId: data.bookingId,
      amount: -data.amount, // Negative for deduction
      currency: data.currency,
      type: 'credit_deduction',
      note: data.note,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      canReverseUntil: canReverseUntil.toISOString(),
      balanceAfter: newBalance,
    };

    await repo.create(transaction);

    await activityLogService.logAction(
      'create',
      'client_transaction',
      transaction.id,
      `خصم مبلغ ${data.amount} ${data.currency} من رصيد العميل`,
      { id: data.createdBy, name: data.createdByName }
    );

    await SyncQueueService.enqueue('create', 'client_transaction', transaction);

    toast.success(`تم خصم ${data.amount.toLocaleString()} ${data.currency} من رصيد العميل`, {
      description: `الرصيد المتبقي: ${newBalance.toLocaleString()} ${data.currency}`,
    });

    return transaction;
  }
}

// Export singleton instance
export const clientTransactionService = new ClientTransactionService();
