import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  Clock3,
  ListFilter,
  LogOut,
  RefreshCcw,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useDataContextValue as useData } from '../providers/data-context';
import { SecurityAccessTerminal } from '../components/shared/auth/SecurityAccessTerminal';
import { electronBackend } from '../services/mockBackend';
import ManagerAccountsView from '../components/manager/financial/ManagerAccountsView';
import ManagerBookingDetailsView from '../components/manager/ManagerBookingDetailsView';
import { Booking, BookingStatus, StatusLabels, UserRole } from '../types';

type ManagerTab = 'sessions' | 'finance';
type SessionFilter = 'today' | 'tomorrow' | 'week' | 'date';

const arDate = new Intl.DateTimeFormat('ar-IQ', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const arDateTime = new Intl.DateTimeFormat('ar-IQ', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('ar-IQ');

const formatMoney = (value: number, currency: Booking['currency']) => {
  if (!Number.isFinite(value)) return '0';
  return currency === 'USD' ? `$${numberFormatter.format(value)}` : `${numberFormatter.format(value)} د.ع`;
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const parseBookingDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const statusClassMap: Record<BookingStatus, string> = {
  [BookingStatus.INQUIRY]: 'bg-zinc-500/20 text-zinc-200',
  [BookingStatus.CONFIRMED]: 'bg-blue-500/20 text-blue-200',
  [BookingStatus.SHOOTING]: 'bg-fuchsia-500/20 text-fuchsia-200',
  [BookingStatus.SHOOTING_COMPLETED]: 'bg-cyan-500/20 text-cyan-200',
  [BookingStatus.SELECTION]: 'bg-indigo-500/20 text-indigo-200',
  [BookingStatus.EDITING]: 'bg-purple-500/20 text-purple-200',
  [BookingStatus.READY_TO_PRINT]: 'bg-emerald-500/20 text-emerald-200',
  [BookingStatus.PRINTING]: 'bg-orange-500/20 text-orange-200',
  [BookingStatus.READY_FOR_PICKUP]: 'bg-green-500/20 text-green-200',
  [BookingStatus.DELIVERED]: 'bg-teal-500/20 text-teal-200',
  [BookingStatus.ARCHIVED]: 'bg-slate-500/20 text-slate-200',
  [BookingStatus.CLIENT_DELAY]: 'bg-rose-500/20 text-rose-200',
};

const ManagerMobilePortal: React.FC = () => {
  const { currentUser, users, login, logout } = useAuth();
  const { bookings, updateBooking, isOffline, isPostgresOffline } = useData();

  const [activeTab, setActiveTab] = useState<ManagerTab>('sessions');
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('today');
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [localBookings, setLocalBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const managerUsers = useMemo(
    () => users.filter(user => user.role === UserRole.MANAGER),
    [users]
  );

  useEffect(() => {
    setLocalBookings(bookings.filter(booking => !booking.deletedAt));
  }, [bookings]);

  const refreshBookings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const rows = await electronBackend.getBookings();
      setLocalBookings(rows.filter(booking => !booking.deletedAt));
      toast.success('تم تحديث البيانات');
    } catch (error) {
      console.error('Failed to refresh manager bookings:', error);
      toast.error('تعذر تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const sortedBookings = useMemo(() => {
    return [...localBookings].sort((a, b) => {
      const dateDiff = parseBookingDate(a.shootDate).getTime() - parseBookingDate(b.shootDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      const aStart = a.details?.startTime || '00:00';
      const bStart = b.details?.startTime || '00:00';
      return aStart.localeCompare(bStart);
    });
  }, [localBookings]);

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return value;
  }, []);

  const endOfWeek = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + (6 - value.getDay()));
    value.setHours(23, 59, 59, 999);
    return value;
  }, []);

  const bookingCounts = useMemo(() => {
    const customDate = new Date(`${selectedDate}T00:00:00`);

    return sortedBookings.reduce(
      (acc, booking) => {
        const shootDate = parseBookingDate(booking.shootDate);
        if (isSameDay(shootDate, today)) acc.today += 1;
        if (isSameDay(shootDate, tomorrow)) acc.tomorrow += 1;
        if (shootDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && shootDate <= endOfWeek) {
          acc.week += 1;
        }
        if (isSameDay(shootDate, customDate)) acc.date += 1;
        return acc;
      },
      { today: 0, tomorrow: 0, week: 0, date: 0 }
    );
  }, [sortedBookings, selectedDate, today, tomorrow, endOfWeek]);

  const filteredBookings = useMemo(() => {
    const customDate = new Date(`${selectedDate}T00:00:00`);

    return sortedBookings.filter(booking => {
      const shootDate = parseBookingDate(booking.shootDate);
      if (sessionFilter === 'today') return isSameDay(shootDate, today);
      if (sessionFilter === 'tomorrow') return isSameDay(shootDate, tomorrow);
      if (sessionFilter === 'week') {
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return shootDate >= dayStart && shootDate <= endOfWeek;
      }
      return isSameDay(shootDate, customDate);
    });
  }, [sortedBookings, selectedDate, sessionFilter, today, tomorrow, endOfWeek]);

  const todayFinance = useMemo(() => {
    return sortedBookings
      .filter(booking => isSameDay(parseBookingDate(booking.shootDate), today))
      .reduce(
        (acc, booking) => {
          if (booking.currency === 'USD') {
            acc.totalUSD += booking.totalAmount || 0;
            acc.paidUSD += booking.paidAmount || 0;
          } else {
            acc.totalIQD += booking.totalAmount || 0;
            acc.paidIQD += booking.paidAmount || 0;
          }
          return acc;
        },
        { totalUSD: 0, paidUSD: 0, totalIQD: 0, paidIQD: 0 }
      );
  }, [sortedBookings, today]);

  const allFinance = useMemo(() => {
    return sortedBookings.reduce(
      (acc, booking) => {
        if (booking.currency === 'USD') {
          acc.totalUSD += booking.totalAmount || 0;
          acc.paidUSD += booking.paidAmount || 0;
        } else {
          acc.totalIQD += booking.totalAmount || 0;
          acc.paidIQD += booking.paidAmount || 0;
        }
        return acc;
      },
      { totalUSD: 0, paidUSD: 0, totalIQD: 0, paidIQD: 0 }
    );
  }, [sortedBookings]);

  const selectedBooking = useMemo(
    () => sortedBookings.find(booking => booking.id === selectedBookingId) || null,
    [sortedBookings, selectedBookingId]
  );

  const handleUpdateBooking = useCallback(
    async (id: string, updates: Partial<Booking>) => {
      try {
        await updateBooking(id, updates);
        await electronBackend.updateBooking(id, updates);
        await refreshBookings();
      } catch (error) {
        console.error('Failed to update booking from manager mobile portal:', error);
        toast.error('تعذر تحديث الحجز');
      }
    },
    [refreshBookings, updateBooking]
  );

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
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <p className="text-xl font-black">هذا الرابط مخصص للمديرة فقط</p>
          <p className="text-sm text-white/70">يرجى تسجيل الدخول بحساب المديرة للوصول إلى التقارير.</p>
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
    <div
      className="min-h-screen bg-[#0a0f1c] text-white"
      dir="rtl"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-5xl mx-auto px-3 pb-24 space-y-3">
        <header className="rounded-3xl border border-white/10 bg-linear-to-l from-[#101b2e] to-[#0f1524] p-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/60">{arDateTime.format(new Date())}</p>
              <p className="text-lg font-black mt-1">لوحة المديرة - الموبايل</p>
              <p className="text-xs text-white/70 mt-1">
                {isOffline || isPostgresOffline ? 'المزامنة: غير متصلة مؤقتًا' : 'المزامنة: لحظية ومتصلة'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refreshBookings()}
                disabled={isRefreshing}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCcw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  تحديث
                </span>
              </button>
              <button onClick={() => void logout()} className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10">
                <span className="inline-flex items-center gap-1.5">
                  <LogOut className="size-3.5" /> خروج
                </span>
              </button>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`rounded-2xl p-3 font-bold text-sm border ${activeTab === 'sessions' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white/5 text-white/70 border-white/10'}`}
          >
            <span className="inline-flex items-center gap-2">
              <CalendarRange className="size-4" /> الجلسات
            </span>
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`rounded-2xl p-3 font-bold text-sm border ${activeTab === 'finance' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-white/70 border-white/10'}`}
          >
            <span className="inline-flex items-center gap-2">
              <WalletCards className="size-4" /> المالية والصرفيات
            </span>
          </button>
        </nav>

        {activeTab === 'sessions' && (
          <section className="space-y-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
              <div className="grid grid-cols-2 gap-2">
                <FilterChip active={sessionFilter === 'today'} onClick={() => setSessionFilter('today')} icon={<CalendarCheck2 className="size-3.5" />} label={`اليوم (${bookingCounts.today})`} />
                <FilterChip active={sessionFilter === 'tomorrow'} onClick={() => setSessionFilter('tomorrow')} icon={<CalendarClock className="size-3.5" />} label={`غدًا (${bookingCounts.tomorrow})`} />
                <FilterChip active={sessionFilter === 'week'} onClick={() => setSessionFilter('week')} icon={<ListFilter className="size-3.5" />} label={`هذا الأسبوع (${bookingCounts.week})`} />
                <FilterChip active={sessionFilter === 'date'} onClick={() => setSessionFilter('date')} icon={<Clock3 className="size-3.5" />} label={`حسب تاريخ (${bookingCounts.date})`} />
              </div>
              {sessionFilter === 'date' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={event => setSelectedDate(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              )}
            </div>

            <div className="space-y-2">
              {filteredBookings.map(booking => (
                <article key={booking.id} className="rounded-2xl border border-white/10 bg-linear-to-l from-[#111a2a] to-[#0d1322] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{booking.clientName}</p>
                      <p className="text-xs text-white/60 truncate mt-0.5">{booking.title}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClassMap[booking.status] || 'bg-white/10 text-white'}`}>
                      {StatusLabels[booking.status] || booking.status}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/70">
                    <p>التاريخ: {arDate.format(parseBookingDate(booking.shootDate))}</p>
                    <p>الوقت: {booking.details?.startTime || '-'}</p>
                    <p>الإجمالي: {formatMoney(booking.totalAmount || 0, booking.currency)}</p>
                    <p>المدفوع: {formatMoney(booking.paidAmount || 0, booking.currency)}</p>
                  </div>

                  <button
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="mt-3 w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2 text-xs font-bold"
                  >
                    فتح تفاصيل الجلسة
                  </button>
                </article>
              ))}
              {filteredBookings.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-sm text-white/60">
                  لا توجد جلسات ضمن الفلتر الحالي
                </p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'finance' && (
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SummaryCard
                title="مالية جلسات اليوم"
                line1={`المدفوع: ${formatMoney(todayFinance.paidUSD, 'USD')} | ${formatMoney(todayFinance.paidIQD, 'IQD')}`}
                line2={`الإجمالي: ${formatMoney(todayFinance.totalUSD, 'USD')} | ${formatMoney(todayFinance.totalIQD, 'IQD')}`}
              />
              <SummaryCard
                title="المالية العامة"
                line1={`المدفوع: ${formatMoney(allFinance.paidUSD, 'USD')} | ${formatMoney(allFinance.paidIQD, 'IQD')}`}
                line2={`الإجمالي: ${formatMoney(allFinance.totalUSD, 'USD')} | ${formatMoney(allFinance.totalIQD, 'IQD')}`}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-2 min-h-[72vh]">
              <ManagerAccountsView bookings={sortedBookings} onUpdateBooking={handleUpdateBooking} />
            </div>
          </section>
        )}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="min-h-screen p-3">
            <div className="mx-auto max-w-5xl rounded-3xl bg-white p-3">
              <ManagerBookingDetailsView
                booking={selectedBooking}
                reminders={[]}
                allBookings={sortedBookings}
                onBack={() => setSelectedBookingId(null)}
                onUpdateBooking={handleUpdateBooking}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterChip: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`rounded-xl px-3 py-2 text-xs font-bold border flex items-center justify-center gap-1.5 ${
      active
        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
        : 'bg-white/[0.03] border-white/10 text-white/70'
    }`}
  >
    {icon}
    {label}
  </button>
);

const SummaryCard: React.FC<{ title: string; line1: string; line2: string }> = ({ title, line1, line2 }) => (
  <article className="rounded-2xl border border-white/10 bg-linear-to-l from-[#10233b] to-[#0d1728] p-3">
    <p className="text-xs text-cyan-200/90 font-black">{title}</p>
    <p className="text-xs text-white/80 mt-2">{line1}</p>
    <p className="text-xs text-white/60 mt-1">{line2}</p>
  </article>
);

export default ManagerMobilePortal;
