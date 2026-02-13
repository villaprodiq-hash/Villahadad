import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  TrendingDown,
  Tag,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  ChevronDown,
} from 'lucide-react';
import {
  Expense,
  RecurringExpense,
  ExpenseCategory,
  ExpenseCategoryLabels,
  Currency,
} from '../../../../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { electronBackend } from '../../../../services/mockBackend';

import { GlowCard } from '../../../shared/GlowCard';

interface ExpenseTrackerWidgetProps {
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  expenses: Expense[];
  disableTilt?: boolean;
}

const ExpenseTrackerWidget: React.FC<ExpenseTrackerWidgetProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  disableTilt = false,
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'recurring'>('expenses');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('IQD');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  useEffect(() => {
    loadRecurringExpenses();
  }, []);

  const loadRecurringExpenses = async () => {
    try {
      const data = await electronBackend.getRecurringExpenses();
      setRecurringExpenses(data);
    } catch (err) {
      console.error('Failed to load recurring expenses:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    onAddExpense?.({
      title,
      amount: parseFloat(amount),
      currency,
      category,
      date: new Date().toISOString(),
      note,
    });

    setAmount('');
    setTitle('');
    setNote('');
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    try {
      await electronBackend.addRecurringExpense({
        title,
        amount: parseFloat(amount),
        currency,
        category,
        dayOfMonth,
        isActive: true,
      });
      await loadRecurringExpenses();
      setAmount('');
      setTitle('');
      setDayOfMonth(1);
    } catch (err) {
      console.error('Failed to add recurring expense:', err);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await electronBackend.deleteRecurringExpense(id);
      await loadRecurringExpenses();
    } catch (err) {
      console.error('Failed to delete recurring expense:', err);
    }
  };

  // ✅ No conversion - show each currency separately
  const totalExpenses = useMemo(() => {
    const usd = expenses.reduce((acc, curr) => acc + (curr.currency === 'USD' ? curr.amount : 0), 0);
    const iqd = expenses.reduce((acc, curr) => acc + (curr.currency !== 'USD' ? curr.amount : 0), 0);
    return { usd, iqd };
  }, [expenses]);

  const totalRecurring = useMemo(() => {
    const usd = recurringExpenses.reduce((acc, curr) => acc + (curr.currency === 'USD' ? curr.amount : 0), 0);
    const iqd = recurringExpenses.reduce((acc, curr) => acc + (curr.currency !== 'USD' ? curr.amount : 0), 0);
    return { usd, iqd };
  }, [recurringExpenses]);

  const categories: ExpenseCategory[] = [
    'rent',
    'salaries',
    'equipment',
    'marketing',
    'services',
    'other',
  ];

  return (
    <GlowCard
      variant="light"
      disableTilt={disableTilt}
      className="h-full flex flex-col bg-white dark:bg-[#1a1c22] rounded-4xl shadow-sm overflow-hidden border border-transparent dark:border-white/5 transition-colors duration-300"
    >
      <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
            <TrendingDown size={18} />
          </div>
          <h3 className="font-bold text-sm">المصروفات</h3>
        </div>
        <div className="text-right">
          {(totalExpenses.usd + totalRecurring.usd) > 0 && (
            <span className="block text-lg font-black text-rose-600 dark:text-rose-500 font-mono">
              ${(totalExpenses.usd + totalRecurring.usd).toLocaleString()}
            </span>
          )}
          {(totalExpenses.iqd + totalRecurring.iqd) > 0 && (
            <span className="block text-lg font-black text-rose-600 dark:text-rose-500 font-mono">
              {(totalExpenses.iqd + totalRecurring.iqd).toLocaleString()} <span className="text-xs">د.ع</span>
            </span>
          )}
          {(totalExpenses.usd + totalRecurring.usd) === 0 && (totalExpenses.iqd + totalRecurring.iqd) === 0 && (
            <span className="block text-xl font-black text-rose-600 dark:text-rose-500 font-mono">0</span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            إجمالي المصروفات
          </span>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Wallet size={14} /> مصروفات عادية
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'recurring'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Repeat size={14} /> مصروفات ثابتة
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        <div className="w-full md:w-[38%] p-4 border-l border-gray-100 dark:border-white/5 overflow-y-auto bg-gray-50/30 dark:bg-black/10">
          {activeTab === 'expenses' ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">
                  عنوان المصروف
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="مثلاً: تنظيف الاستوديو"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">المبلغ</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-mono placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-400">
                      <DollarSign size={10} />
                    </span>
                  </div>
                </div>
                <div className="w-1/3">
                  <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">العملة</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    className="w-full px-2 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                  >
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">الفئة</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${category === cat ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                    >
                      {ExpenseCategoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 mb-1 block">ملاحظات</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"
                  rows={2}
                  placeholder="تفاصيل إضافية..."
                />
              </div>

              <button
                type="submit"
                disabled={!title || !amount}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${!title || !amount ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:shadow-rose-600/40 transform hover:-translate-y-0.5'}`}
              >
                <Plus size={16} />
                إضافة مصروف
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddRecurring} className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">
                  عنوان المصروف الثابت
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="مثلاً: إيجار الستوديو"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">
                    المبلغ الشهري
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono placeholder-gray-400 dark:placeholder-gray-600"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-2 text-gray-400">
                      <DollarSign size={10} />
                    </span>
                  </div>
                </div>
                <div className="w-1/3">
                  <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">العملة</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    className="w-full px-2 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-0.5 block">
                  يوم الخصم من كل شهر
                </label>
                <div className="relative">
                  <select
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-black/50 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        يوم {day}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">الفئة</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${category === cat ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                    >
                      {ExpenseCategoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!title || !amount}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${!title || !amount ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transform hover:-translate-y-0.5'}`}
              >
                <Plus size={16} />
                إضافة مصروف ثابت
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 p-2 bg-white dark:bg-[#1a1c22] overflow-hidden flex flex-col transition-colors">
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {activeTab === 'expenses' ? (
              expenses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                  <Wallet size={40} className="opacity-20" />
                  <span className="text-xs font-bold">لا توجد مصروفات مسجلة</span>
                </div>
              ) : (
                expenses.map(expense => (
                  <div
                    key={expense.id}
                    className="group flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-white/5 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {expense.category === 'salaries' && <Wallet size={18} />}
                        {expense.category === 'rent' && <Calendar size={18} />}
                        {expense.category === 'equipment' && <Tag size={18} />}
                        {expense.category === 'marketing' && <ArrowUpRight size={18} />}
                        {expense.category === 'services' && <ArrowDownLeft size={18} />}
                        {expense.category === 'other' && <DollarSign size={18} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {expense.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span>{format(new Date(expense.date), 'dd MMM', { locale: ar })}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          <span>{ExpenseCategoryLabels[expense.category]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-sm font-black text-gray-900 dark:text-white font-mono">
                          -{expense.amount.toLocaleString()}{' '}
                          <span className="text-[10px] text-gray-500">{expense.currency}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteExpense?.(expense.id)}
                        className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : recurringExpenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                <Repeat size={40} className="opacity-20" />
                <span className="text-xs font-bold">لا توجد مصروفات ثابتة</span>
                <span className="text-[10px] text-gray-400">أضف رواتب، اشتراكات، إيجار...</span>
              </div>
            ) : (
              recurringExpenses.map(expense => (
                <div
                  key={expense.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Repeat size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {expense.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>يوم {expense.dayOfMonth} من كل شهر</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        <span>{ExpenseCategoryLabels[expense.category]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                        -{expense.amount.toLocaleString()}{' '}
                        <span className="text-[10px] text-gray-500">{expense.currency}</span>
                      </span>
                      <span className="text-[9px] text-gray-400">شهرياً</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRecurring(expense.id)}
                      className="p-1.5 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </GlowCard>
  );
};

export default React.memo(ExpenseTrackerWidget);
