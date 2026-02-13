import { toast } from 'sonner';
import { ClientTransaction } from '../types/client-transaction.types';
import { formatMoney } from './formatMoney';
import { Currency } from '../types/shared.types';

/**
 * Show notification for successful transaction creation
 */
export const showTransactionSuccessNotification = (
  transaction: ClientTransaction,
  onUndo?: () => void
) => {
  const { amount, currency, note, balanceAfter } = transaction;

  toast.success(
    `تم إضافة ${formatMoney(amount, currency)} - ${note}\nالرصيد الجديد: ${formatMoney(balanceAfter, currency)}`,
    {
      duration: 5000,
      action: onUndo
        ? {
            label: 'تراجع',
            onClick: onUndo,
          }
        : undefined,
    }
  );
};

/**
 * Show notification for successful transaction reversal
 */
export const showTransactionReversedNotification = (
  transaction: ClientTransaction,
  newBalance: number
) => {
  const { amount, currency } = transaction;

  toast.info(
    `تم التراجع عن إضافة ${formatMoney(amount, currency)}\nالرصيد الحالي: ${formatMoney(newBalance, currency)}`,
    {
      duration: 4000,
    }
  );
};

/**
 * Show notification when reversal window is about to expire
 */
export const showReversalExpiringNotification = (
  transaction: ClientTransaction,
  secondsRemaining: number
) => {
  const { amount, currency } = transaction;

  toast.warning(
    `فترة التراجع على وشك الانتهاء\nإضافة ${formatMoney(amount, currency)} - متبقي ${secondsRemaining} ثانية`,
    {
      duration: 3000,
    }
  );
};

/**
 * Show notification for insufficient balance
 */
export const showInsufficientBalanceNotification = (
  requestedAmount: number,
  availableBalance: number,
  currency: Currency
) => {
  toast.error(
    `رصيد غير كافٍ\nالمبلغ المطلوب: ${formatMoney(requestedAmount, currency)}\nالرصيد المتاح: ${formatMoney(availableBalance, currency)}`,
    {
      duration: 4000,
    }
  );
};

/**
 * Show notification for transaction error
 */
export const showTransactionErrorNotification = (message: string) => {
  toast.error(
    `خطأ في العملية\n${message}`,
    {
      duration: 4000,
    }
  );
};

/**
 * Format time remaining for display in notifications
 */
export const formatReversalTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'انتهت المهلة';
  if (seconds < 60) return `${seconds} ثانية`;
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (secs === 0) return `${mins} دقيقة`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
