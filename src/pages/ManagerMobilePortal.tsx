import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, WalletCards, Receipt, TrendingUp, HandIcon, CircleDollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useDataContextValue as useData } from '../providers/data-context';
import { SecurityAccessTerminal } from '../components/shared/auth/SecurityAccessTerminal';
import { electronBackend } from '../services/mockBackend';
import { Booking, Expense, ExpenseCategory, ExpenseCategoryLabels, UserRole, StatusLabels } from '../types';

type ManagerTab = 'bookings' | 'finance' | 'expenses';

const DEFAULT_CURRENCY: Expense['currency'] = 'IQD';
type ExpenseFormState = {
  title: string;
  amount: string;
  category: ExpenseCategory;
  currency: Expense['currency'];
  note: string;
};

const dateFormatter = new Intl.DateTimeFormat('ar-IQ', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('ar-IQ', {
  hour: '2-digit',
  minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('ar-IQ');

const formatMoney = (value: number, currency: Expense['currency']) => {
  if (!Number.isFinite(value)) return '0';
  return currency === 'USD' ? `$${numberFormatter.format(value)}` : `${numberFormatter.format(value)} د.ع`;
};

const ManagerMobilePortal: React.FC = () => {
  const { currentUser, users, login, logout } = useAuth();
  const { bookings } = useData();

  const [activeTab, setActiveTab] = useState<ManagerTab>('bookings');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    title: '',
    amount: '',
    category: 'other' as ExpenseCategory,
    currency: DEFAULT_CURRENCY,
    note: '',
  });

  const managerUsers = useMemo(() => users.filter(user => user.role === UserRole.MANAGER), [users]);

  const loadExpenses = useCallback(async () => {
    try {
      const rows = await electronBackend.getExpenses();
      setExpenses(rows);
    } catch (error) {
      console.error('Failed to load manager expenses:', error);
      toast.error('تعذر تحميل الصرفيات');
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
    const unsubscribe = electronBackend.subscribe(event => {
      if (event === 'expenses_updated') {
        void loadExpenses();
      }
    });
    return () => unsubscribe();
  }, [loadExpenses]);

  const sortedBookings = useMemo(() => {
    return [...bookings]
      .filter(booking => !booking.deletedAt)
      .sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
  }, [bookings]);

  const financeStats = useMemo(() => {
    let totalUSD = 0;
    let totalIQD = 0;
    let paidUSD = 0;
    let paidIQD = 0;
    let expenseUSD = 0;
    let expenseIQD = 0;

    sortedBookings.forEach(booking => {
      if (booking.currency === 'USD') {
        totalUSD += booking.totalAmount || 0;
        paidUSD += booking.paidAmount || 0;
      } else {
        totalIQD += booking.totalAmount || 0;
        paidIQD += booking.paidAmount || 0;
      }
    });

    expenses.forEach(expense => {
      if (expense.currency === 'USD') {
        expenseUSD += expense.amount || 0;
      } else {
        expenseIQD += expense.amount || 0;
      }
    });

    return {
      totalUSD,
      totalIQD,
      paidUSD,
      paidIQD,
      dueUSD: totalUSD - paidUSD,
      dueIQD: totalIQD - paidIQD,
      expenseUSD,
      expenseIQD,
    };
  }, [sortedBookings, expenses]);

  const handleExpenseSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = Number(expenseForm.amount);
    if (!expenseForm.title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('يرجى إدخال عنوان ومبلغ صحيح');
      return;
    }

    setIsSavingExpense(true);
    try {
      await electronBackend.addExpense({
        title: expenseForm.title.trim(),
        amount: parsedAmount,
        currency: expenseForm.currency,
        category: expenseForm.category,
        date: new Date().toISOString(),
        note: expenseForm.note.trim() || undefined,
      });

      setExpenseForm({ title: '', amount: '', category: 'other', currency: DEFAULT_CURRENCY, note: '' });
      toast.success('تمت إضافة الصرفية بنجاح');
      await loadExpenses();
    } catch (error) {
      console.error('Failed to add manager expense:', error);
      toast.error('تعذر إضافة الصرفية');
    } finally {
      setIsSavingExpense(false);
    }
  };

  if (!currentUser) {
    return (
      <SecurityAccessTerminal
        onLogin={async (_role, userId) => {
          await login(UserRole.MANAGER, userId);
        }}
        users={managerUsers}
      />
    );
  }

  if (currentUser.role !== UserRole.MANAGER) {
    return (
      <div className="min-h-screen bg-[#090b12] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <p className="text-xl font-black">هذا الرابط مخصص للمديرة فقط</p>
          <p className="text-sm text-white/70">يرجى تسجيل الدخول بحساب المديرة للوصول إلى النسخة الإدارية للموبايل.</p>
          <button
            onClick={() => void logout()}
            className="w-full rounded-2xl bg-rose-500 hover:bg-rose-600 transition-colors py-3 font-bold"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-white" dir="rtl" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="max-w-3xl mx-auto px-4 pb-24 space-y-4">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">{dateFormatter.format(new Date())} - {timeFormatter.format(new Date())}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black">لوحة المديرة</p>
              <p className="text-xs text-white/60">قراءة فقط للحجوزات والمالية، مع إضافة صرفيات مباشرة</p>
            </div>
            <button onClick={() => void logout()} className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10">
              خروج
            </button>
          </div>
        </header>

        {activeTab === 'bookings' && (
          <section className="space-y-3">
            {sortedBookings.map((booking: Booking) => (
              <motion.article key={booking.id} layout className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-base font-bold">{booking.clientName}</p>
                <p className="text-xs text-white/60 mt-1">{booking.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-cyan-500/20 px-2 py-1">{StatusLabels[booking.status] || booking.status}</span>
                  <span className="rounded-full bg-white/10 px-2 py-1">{dateFormatter.format(new Date(booking.shootDate))}</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1">{formatMoney(booking.totalAmount, booking.currency)}</span>
                </div>
              </motion.article>
            ))}
            {sortedBookings.length === 0 && <p className="text-center text-white/60 py-8">لا توجد حجوزات حالياً</p>}
          </section>
        )}

        {activeTab === 'finance' && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FinanceCard title="الإجمالي" usd={financeStats.totalUSD} iqd={financeStats.totalIQD} icon={<TrendingUp className="size-4" />} />
              <FinanceCard title="المدفوع" usd={financeStats.paidUSD} iqd={financeStats.paidIQD} icon={<HandIcon className="size-4" />} />
              <FinanceCard title="المتبقي" usd={financeStats.dueUSD} iqd={financeStats.dueIQD} icon={<CircleDollarSign className="size-4" />} />
              <FinanceCard title="الصرفيات" usd={financeStats.expenseUSD} iqd={financeStats.expenseIQD} icon={<Receipt className="size-4" />} />
            </div>
          </section>
        )}

        {activeTab === 'expenses' && (
          <section className="space-y-3">
            <form onSubmit={handleExpenseSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <p className="font-bold">إضافة صرفية</p>
              <input value={expenseForm.title} onChange={e => setExpenseForm(prev => ({ ...prev, title: e.target.value }))} placeholder="عنوان الصرفية" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400" />
              <div className="grid grid-cols-2 gap-2">
                <input value={expenseForm.amount} onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="المبلغ" inputMode="decimal" className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400" />
                <select value={expenseForm.currency} onChange={e => setExpenseForm(prev => ({ ...prev, currency: e.target.value as Expense['currency'] }))} className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400">
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <select value={expenseForm.category} onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400">
                {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <textarea value={expenseForm.note} onChange={e => setExpenseForm(prev => ({ ...prev, note: e.target.value }))} placeholder="ملاحظة (اختياري)" rows={2} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400 resize-none" />
              <button type="submit" disabled={isSavingExpense} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 py-2.5 font-bold text-sm">
                {isSavingExpense ? 'جارِ الحفظ...' : 'حفظ الصرفية'}
              </button>
            </form>

            <div className="space-y-2">
              {expenses.map(expense => (
                <article key={expense.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{expense.title}</p>
                    <p className="text-sm text-emerald-300">{formatMoney(expense.amount, expense.currency)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                    <span>{ExpenseCategoryLabels[expense.category]}</span>
                    <span>{dateFormatter.format(new Date(expense.date))}</span>
                  </div>
                  {expense.note && <p className="text-xs text-white/70 mt-2">{expense.note}</p>}
                </article>
              ))}
              {expenses.length === 0 && <p className="text-center text-white/60 py-8">لا توجد صرفيات مسجلة</p>}
            </div>
          </section>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0b0f18]/95 backdrop-blur-xl" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto px-4 py-2 grid grid-cols-3 gap-2">
          <TabButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} icon={<CalendarDays className="size-4" />} label="الحجوزات" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<WalletCards className="size-4" />} label="المالية" />
          <TabButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<Plus className="size-4" />} label="الصرفيات" />
        </div>
      </nav>
    </div>
  );
};

const FinanceCard: React.FC<{ title: string; usd: number; iqd: number; icon: React.ReactNode }> = ({ title, usd, iqd, icon }) => (
  <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center justify-between text-sm text-white/70">
      <span>{title}</span>
      {icon}
    </div>
    <p className="mt-3 text-sm">USD: <span className="font-black">{formatMoney(usd, 'USD')}</span></p>
    <p className="mt-1 text-sm">IQD: <span className="font-black">{formatMoney(iqd, 'IQD')}</span></p>
  </article>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 ${active ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/70'}`}>
    {icon}
    {label}
  </button>
);

export default ManagerMobilePortal;
