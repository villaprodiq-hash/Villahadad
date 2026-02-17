import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Wallet, AlertCircle, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Currency } from '../../types/shared.types';
import { clientTransactionService } from '../../services/db/services/ClientTransactionService';
import { ClientTransaction } from '../../types/client-transaction.types';
import { formatMoney } from '../../utils/formatMoney';
import { MoneyInput } from '../ui/MoneyInput';

interface ClientTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  bookingId?: string;
  currentUser: { id: string; name: string };
  currency?: Currency;
  onTransactionAdded?: () => void;
}

const ClientTransactionModal: React.FC<ClientTransactionModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  bookingId,
  currentUser,
  currency = 'IQD',
  onTransactionAdded,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<ClientTransaction[]>([]);

  const loadRecentTransactions = useCallback(async () => {
    try {
      const transactions = await clientTransactionService.getClientTransactions(clientId);
      setRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, [clientId]);

  // Load recent transactions when modal opens
  useEffect(() => {
    if (isOpen && clientId) {
      loadRecentTransactions();
    }
  }, [isOpen, clientId, loadRecentTransactions]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount(0);
      setNote('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!note.trim()) {
      toast.error('يرجى إدخال ملاحظة توضح سبب الإضافة');
      return;
    }

    setIsSubmitting(true);

    try {
      await clientTransactionService.addCredit({
        clientId,
        bookingId,
        amount,
        currency,
        type: 'credit_addition',
        note: note.trim(),
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      });

      // Refresh transactions list
      await loadRecentTransactions();
      
      // Clear form
      setAmount(0);
      setNote('');
      
      // Notify parent
      onTransactionAdded?.();
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('حدث خطأ أثناء إضافة المبلغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-linear-to-r from-amber-500 to-orange-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">إضافة مبلغ مالي</h2>
                      <p className="text-white/80 text-sm font-medium">{clientName}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-500" />
                      المبلغ ({currency})
                    </label>
                    <MoneyInput
                      value={amount}
                      onChange={setAmount}
                      placeholder="0"
                      className="bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-2xl font-black text-gray-900 placeholder-gray-300 focus:border-amber-500 focus:ring-0 transition-all text-center"
                    />

                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {[50000, 100000, 250000, 500000, 1000000].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleQuickAmount(value)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          +{value.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      الملاحظة
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="اكتب سبب الإضافة هنا..."
                      rows={3}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:ring-0 transition-all resize-none"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-bold mb-1">معلومة مهمة</p>
                      <p className="text-blue-600">
                        يمكنك التراجع عن هذه العملية خلال{' '}
                        <span className="font-bold">5 دقائق</span> فقط من وقت
                        الإضافة.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !amount || !note.trim()}
                    className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري الإضافة...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        إضافة المبلغ
                      </>
                    )}
                  </button>
                </form>

                {/* Recent Transactions */}
                {recentTransactions.length > 0 && (
                  <div className="border-t border-gray-100 pt-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      آخر العمليات
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className={`flex items-center justify-between p-3 rounded-xl ${
                            transaction.status === 'reversed'
                              ? 'bg-gray-50 opacity-60'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                transaction.status === 'reversed'
                                  ? 'bg-gray-200 text-gray-500'
                                  : transaction.amount > 0
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-rose-100 text-rose-600'
                              }`}
                            >
                              {transaction.status === 'reversed' ? (
                                <X className="w-4 h-4" />
                              ) : transaction.amount > 0 ? (
                                <Plus className="w-4 h-4" />
                              ) : (
                                <Wallet className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 line-clamp-1">
                                {transaction.note}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {formatDate(transaction.createdAt)} •{' '}
                                {formatTime(transaction.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p
                              className={`text-sm font-black ${
                                transaction.status === 'reversed'
                                  ? 'text-gray-400 line-through'
                                  : transaction.amount > 0
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              }`}
                              dir="ltr"
                            >
                              {transaction.amount > 0 ? '+' : ''}
                              {formatMoney(Math.abs(transaction.amount), transaction.currency)}
                            </p>
                            {transaction.status === 'reversed' && (
                              <p className="text-[10px] text-gray-400">ملغاة</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ClientTransactionModal;
