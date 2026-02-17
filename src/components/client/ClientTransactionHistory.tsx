import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Clock, 
  XCircle,
  User,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ClientTransaction } from '../../types/client-transaction.types';
import { clientTransactionService } from '../../services/db/services/ClientTransactionService';
import { formatMoney } from '../../utils/formatMoney';
import { Currency } from '../../types/shared.types';

interface ClientTransactionHistoryProps {
  clientId: string;
  clientName: string;
  currentUser: { id: string; name: string };
  currency?: Currency;
  compact?: boolean;
}

const ClientTransactionHistory: React.FC<ClientTransactionHistoryProps> = ({
  clientId,
  clientName: _clientName,
  currentUser,
  currency = 'IQD',
  compact = false,
}) => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});

  const loadTransactions = useCallback(async () => {
    try {
      const data = await clientTransactionService.getClientTransactions(clientId);
      setTransactions(data);
      
      // Calculate time remaining for each reversible transaction
      const remaining: Record<string, number> = {};
      data.forEach(t => {
        if (t.status === 'active') {
          remaining[t.id] = clientTransactionService.getReversalTimeRemaining(t);
        }
      });
      setTimeRemaining(remaining);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          const remaining = updated[id];
          if (typeof remaining === 'number' && remaining > 0) {
            updated[id] = Math.max(0, remaining - 1);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReverse = async (transaction: ClientTransaction) => {
    if (!clientTransactionService.canReverse(transaction)) {
      toast.error('انتهت فترة التراجع عن هذه العملية');
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من التراجع عن إضافة ${formatMoney(transaction.amount, transaction.currency)}؟\n\n` +
      `ملاحظة: ${transaction.note}`
    );

    if (!confirmed) return;

    setReversingId(transaction.id);

    try {
      const success = await clientTransactionService.reverseTransaction({
        transactionId: transaction.id,
        reversedBy: currentUser.id,
        reversedByName: currentUser.name,
        reason: 'تراجع يدوي من قبل المستخدم',
      });

      if (success) {
        await loadTransactions();
      }
    } catch (error) {
      console.error('Error reversing transaction:', error);
      toast.error('حدث خطأ أثناء التراجع عن العملية');
    } finally {
      setReversingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-IQ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (transaction: ClientTransaction) => {
    if (transaction.status === 'reversed') {
      return <XCircle className="w-4 h-4 text-gray-400" />;
    }
    if (transaction.amount > 0) {
      return <Plus className="w-4 h-4 text-emerald-500" />;
    }
    return <Minus className="w-4 h-4 text-rose-500" />;
  };

  const getTransactionColor = (transaction: ClientTransaction) => {
    if (transaction.status === 'reversed') {
      return 'bg-gray-50 border-gray-100';
    }
    if (transaction.amount > 0) {
      return 'bg-emerald-50/50 border-emerald-100';
    }
    return 'bg-rose-50/50 border-rose-100';
  };

  const activeTransactions = transactions.filter(t => t.status === 'active');
  const totalAdditions = activeTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDeductions = activeTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const currentBalance = totalAdditions - totalDeductions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <History className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-400 text-sm font-medium">لا توجد عمليات مالية مسجلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">الإضافات</p>
            <p className="text-lg font-black text-emerald-700" dir="ltr">
              {formatMoney(totalAdditions, currency)}
            </p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">الخصومات</p>
            <p className="text-lg font-black text-rose-700" dir="ltr">
              {formatMoney(totalDeductions, currency)}
            </p>
          </div>
          <div className={`rounded-xl p-3 border ${
            currentBalance >= 0 
              ? 'bg-blue-50 border-blue-100' 
              : 'bg-amber-50 border-amber-100'
          }`}>
            <p className={`text-[10px] font-bold uppercase mb-1 ${
              currentBalance >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}>
              الرصيد الحالي
            </p>
            <p className={`text-lg font-black ${
              currentBalance >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`} dir="ltr">
              {formatMoney(currentBalance, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <History className="w-3.5 h-3.5" />
          سجل العمليات
        </h4>

        <div className={`space-y-2 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent`}>
          <AnimatePresence mode="popLayout">
            {transactions.map((transaction, index) => {
              const canReverse = clientTransactionService.canReverse(transaction);
              const remaining = timeRemaining[transaction.id] || 0;
              const isReversing = reversingId === transaction.id;

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-xl border ${getTransactionColor(transaction)} transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        transaction.status === 'reversed'
                          ? 'bg-gray-100'
                          : transaction.amount > 0
                          ? 'bg-emerald-100'
                          : 'bg-rose-100'
                      }`}>
                        {getTransactionIcon(transaction)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${
                          transaction.status === 'reversed' ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}>
                          {transaction.note}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(transaction.createdAt)} • {formatTime(transaction.createdAt)}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {transaction.createdByName}
                          </span>
                        </div>
                        
                        {/* Reversal Info */}
                        {transaction.status === 'reversed' && (
                          <div className="mt-2 p-2 bg-gray-100 rounded-lg">
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              تم التراجع بواسطة {transaction.reversedByName}
                            </p>
                            {transaction.reversalReason && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                السبب: {transaction.reversalReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="text-left shrink-0">
                      <p className={`text-base font-black ${
                        transaction.status === 'reversed'
                          ? 'text-gray-400 line-through'
                          : transaction.amount > 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`} dir="ltr">
                        {transaction.amount > 0 ? '+' : ''}
                        {formatMoney(Math.abs(transaction.amount), transaction.currency)}
                      </p>
                      
                      {/* Reverse Button */}
                      {transaction.status === 'active' && canReverse && remaining > 0 && (
                        <button
                          onClick={() => handleReverse(transaction)}
                          disabled={isReversing}
                          className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {isReversing ? (
                            <>
                              <div className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                              جاري...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              تراجع ({clientTransactionService.formatTimeRemaining(remaining)})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>إضافة</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span>خصم</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span>ملغاة</span>
        </div>
        <div className="flex items-center gap-1 mr-auto">
          <Clock className="w-3 h-3" />
          <span>يمكن التراجع خلال 5 دقائق</span>
        </div>
      </div>
    </div>
  );
};

export default ClientTransactionHistory;
