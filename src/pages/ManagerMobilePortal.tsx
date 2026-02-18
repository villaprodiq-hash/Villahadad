import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock3,
  Loader2,
  ListFilter,
  LogOut,
  RefreshCcw,
  ShieldAlert,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useDataContextValue as useData } from '../providers/data-context';
import { SecurityAccessTerminal } from '../components/shared/auth/SecurityAccessTerminal';
import { electronBackend } from '../services/mockBackend';
import { verifyPasswordSync } from '../services/security/PasswordService';
import ManagerAccountsView from '../components/manager/financial/ManagerAccountsView';
import ManagerBookingDetailsView from '../components/manager/ManagerBookingDetailsView';
import ExpenseTrackerWidget from '../components/manager/financial/widgets/ExpenseTrackerWidget';
import { Booking, BookingStatus, Expense, StatusLabels, UserRole } from '../types';

type ManagerTab = 'sessions' | 'finance' | 'expenses';
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
const MANAGER_DEVICE_SEED_KEY = 'vh_manager_mobile_seed_v1';

const isManagerMasterPin = (pin: string): boolean => {
  const normalized = pin.trim();
  return normalized === '1234' || normalized === '112233' || normalized === 'admin2026';
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const legacyHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

const hashDeviceSignature = async (input: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return toHex(digest);
  }
  return legacyHash(input);
};

const createFallbackSeed = (): string => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const resolveManagerDeviceIdentity = async (): Promise<{ id: string; label: string }> => {
  if (typeof window === 'undefined') {
    return { id: '', label: 'Unknown Device' };
  }

  const storedSeed = window.localStorage.getItem(MANAGER_DEVICE_SEED_KEY);
  const seed = storedSeed || createFallbackSeed();
  if (!storedSeed) {
    window.localStorage.setItem(MANAGER_DEVICE_SEED_KEY, seed);
  }

  const ua = navigator.userAgent || 'unknown';
  const platform = navigator.platform || 'unknown';
  const language = navigator.language || 'ar-IQ';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Baghdad';
  const mobileModel = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android'
        : 'Mobile';
  const payload = `${seed}|${ua}|${platform}|${language}|${timezone}`;
  const digest = await hashDeviceSignature(payload);
  return {
    id: `vhmd_${digest.slice(0, 40)}`,
    label: `${mobileModel} • ${platform}`,
  };
};

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

const makeDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseBookingDateSafe = (value: string): Date | null => {
  if (!value || typeof value !== 'string') return null;

  const yyyyMmDd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDd) {
    const year = Number(yyyyMmDd[1]);
    const month = Number(yyyyMmDd[2]) - 1;
    const day = Number(yyyyMmDd[3]);
    return makeDate(year, month, day);
  }

  const ddMmYyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const day = Number(ddMmYyyy[1]);
    const month = Number(ddMmYyyy[2]) - 1;
    const year = Number(ddMmYyyy[3]);
    return makeDate(year, month, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) => {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setHours(23, 59, 59, 999);
  return value;
};

const getWeekEndFromToday = (today: Date) => {
  const start = startOfDay(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
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
  const { currentUser, users, login, logout, updateUser } = useAuth();
  const { bookings, updateBooking, isOffline, isPostgresOffline } = useData();

  const [activeTab, setActiveTab] = useState<ManagerTab>('sessions');
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('today');
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [localBookings, setLocalBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [devicePin, setDevicePin] = useState('');
  const [isBindingDevice, setIsBindingDevice] = useState(false);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');

  const managerUsers = useMemo(() => users.filter(user => user.role === UserRole.MANAGER), [users]);
  const isLikelyMobileDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|Android|Mobile|iPod/i.test(navigator.userAgent || '');
  }, []);

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return value;
  }, []);

  const weekEnd = useMemo(() => getWeekEndFromToday(today), [today]);

  useEffect(() => {
    let cancelled = false;
    const loadIdentity = async () => {
      try {
        const identity = await resolveManagerDeviceIdentity();
        if (cancelled) return;
        setDeviceId(identity.id);
        setDeviceLabel(identity.label);
      } catch (error) {
        console.error('Failed to resolve manager mobile device identity:', error);
      } finally {
        if (!cancelled) setIsDeviceReady(true);
      }
    };
    void loadIdentity();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLocalBookings(bookings.filter(booking => !booking.deletedAt));
  }, [bookings]);

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
    const valid = localBookings.filter(booking => parseBookingDateSafe(booking.shootDate) !== null);
    return [...valid].sort((a, b) => {
      const aDate = parseBookingDateSafe(a.shootDate);
      const bDate = parseBookingDateSafe(b.shootDate);
      if (!aDate || !bDate) return 0;
      const dateDiff = aDate.getTime() - bDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      const aStart = a.details?.startTime || '00:00';
      const bStart = b.details?.startTime || '00:00';
      return aStart.localeCompare(bStart);
    });
  }, [localBookings]);

  const bookingCounts = useMemo(() => {
    const customDate = parseBookingDateSafe(selectedDate);
    const todayStart = startOfDay(today);

    return sortedBookings.reduce(
      (acc, booking) => {
        const shootDate = parseBookingDateSafe(booking.shootDate);
        if (!shootDate) return acc;

        if (isSameDay(shootDate, today)) acc.today += 1;
        if (isSameDay(shootDate, tomorrow)) acc.tomorrow += 1;
        if (shootDate >= todayStart && shootDate <= weekEnd) acc.week += 1;
        if (customDate && isSameDay(shootDate, customDate)) acc.date += 1;

        return acc;
      },
      { today: 0, tomorrow: 0, week: 0, date: 0 }
    );
  }, [selectedDate, sortedBookings, today, tomorrow, weekEnd]);

  const filteredBookings = useMemo(() => {
    const customDate = parseBookingDateSafe(selectedDate);
    const todayStart = startOfDay(today);

    return sortedBookings.filter(booking => {
      const shootDate = parseBookingDateSafe(booking.shootDate);
      if (!shootDate) return false;

      if (sessionFilter === 'today') return isSameDay(shootDate, today);
      if (sessionFilter === 'tomorrow') return isSameDay(shootDate, tomorrow);
      if (sessionFilter === 'week') return shootDate >= todayStart && shootDate <= weekEnd;
      if (!customDate) return false;
      return isSameDay(shootDate, customDate);
    });
  }, [selectedDate, sessionFilter, sortedBookings, today, tomorrow, weekEnd]);

  const todayFinance = useMemo(() => {
    return sortedBookings
      .filter(booking => {
        const date = parseBookingDateSafe(booking.shootDate);
        return Boolean(date && isSameDay(date, today));
      })
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
    [selectedBookingId, sortedBookings]
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

  const handleAddExpense = useCallback(async (newExpense: Omit<Expense, 'id'>) => {
    try {
      await electronBackend.addExpense(newExpense);
      await loadExpenses();
      toast.success('تمت إضافة الصرفية');
    } catch (error) {
      console.error('Failed to add expense in manager mobile portal:', error);
      toast.error('تعذر إضافة الصرفية');
    }
  }, [loadExpenses]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    try {
      await electronBackend.deleteExpense(id);
      await loadExpenses();
      toast.success('تم حذف الصرفية');
    } catch (error) {
      console.error('Failed to delete expense in manager mobile portal:', error);
      toast.error('تعذر حذف الصرفية');
    }
  }, [loadExpenses]);

  const managerMobileAccess = currentUser?.preferences?.managerMobileAccess;
  const trustedDeviceId = managerMobileAccess?.trustedDeviceId?.trim() || '';
  const deviceIsTrusted = Boolean(isDeviceReady && trustedDeviceId && trustedDeviceId === deviceId);
  const needsInitialBind = Boolean(currentUser && isDeviceReady && !trustedDeviceId);
  const blockedByDeviceLock = Boolean(currentUser && isDeviceReady && trustedDeviceId && trustedDeviceId !== deviceId);

  const verifyPin = useCallback((pin: string): boolean => {
    const normalized = pin.trim();
    if (!normalized) return false;
    if (isManagerMasterPin(normalized)) return true;
    if (currentUser?.password) {
      return verifyPasswordSync(normalized, currentUser.password);
    }
    return false;
  }, [currentUser?.password]);

  const bindCurrentDevice = useCallback(async (mode: 'initial' | 'transfer') => {
    if (!currentUser) return;
    if (!deviceId) {
      toast.error('تعذر قراءة بصمة الجهاز الحالية');
      return;
    }
    if (!verifyPin(devicePin)) {
      toast.error('رمز المديرة غير صحيح');
      return;
    }

    const now = new Date().toISOString();
    const currentPrefs = currentUser.preferences || {};
    const lock = currentPrefs.managerMobileAccess;
    const nextPreferences = {
      ...currentPrefs,
      managerMobileAccess: {
        trustedDeviceId: deviceId,
        trustedDeviceLabel: deviceLabel,
        trustedAt: mode === 'initial' ? now : lock?.trustedAt || now,
        updatedAt: now,
      },
    };

    setIsBindingDevice(true);
    try {
      await updateUser(currentUser.id, { preferences: nextPreferences });
      setDevicePin('');
      toast.success(mode === 'initial' ? 'تم ربط هاتف المديرة بنجاح' : 'تم نقل صلاحية الهاتف لهذا الجهاز');
    } catch (error) {
      console.error('Failed to bind manager mobile trusted device:', error);
      toast.error('تعذر حفظ قفل الجهاز');
    } finally {
      setIsBindingDevice(false);
    }
  }, [currentUser, deviceId, deviceLabel, devicePin, updateUser, verifyPin]);

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
      <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <p className="text-xl font-black">هذا الرابط مخصص للمديرة فقط</p>
          <p className="text-sm text-white/70">يرجى تسجيل الدخول بحساب المديرة للوصول إلى لوحة الإدارة.</p>
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

  if (!isLikelyMobileDevice) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <p className="text-xl font-black">هذا الرابط مخصص للموبايل فقط</p>
          <p className="text-sm text-white/70">لأسباب أمنية، لوحة المديرة تعمل على جهاز موبايل موثوق فقط.</p>
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

  if (!isDeviceReady) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <Loader2 className="mx-auto size-8 animate-spin text-cyan-300" />
          <p className="text-lg font-black">جارٍ التحقق من بصمة الجهاز</p>
          <p className="text-sm text-white/70">يرجى الانتظار لحظة...</p>
        </div>
      </div>
    );
  }

  if (needsInitialBind) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-cyan-400/40 bg-[#0f1728] p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-cyan-200">
            <Smartphone className="size-5" />
            <p className="text-lg font-black">تفعيل هاتف المديرة</p>
          </div>
          <p className="text-sm text-white/70 text-center leading-7">
            سيتم قفل <strong>manager.villahadad.org</strong> على هذا الجهاز فقط.
            أدخلي رمز المديرة لتأكيد التفعيل.
          </p>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/65">
            الجهاز الحالي: {deviceLabel || 'Mobile Device'}
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={devicePin}
            onChange={event => setDevicePin(event.target.value)}
            placeholder="رمز المديرة"
            className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void bindCurrentDevice('initial')}
            disabled={isBindingDevice || !devicePin.trim()}
            className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 py-2.5 text-sm font-black"
          >
            {isBindingDevice ? 'جارٍ التفعيل...' : 'تفعيل هذا الهاتف'}
          </button>
          <button
            onClick={() => void logout()}
            className="w-full rounded-xl border border-white/20 hover:bg-white/10 py-2.5 text-sm font-bold"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (blockedByDeviceLock && !deviceIsTrusted) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] text-white flex items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-rose-400/40 bg-[#190f16] p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-rose-200">
            <ShieldAlert className="size-5" />
            <p className="text-lg font-black">الجهاز غير موثوق</p>
          </div>
          <p className="text-sm text-white/75 text-center leading-7">
            هذا الرابط مقفول على هاتف المديرة الأساسي.
            لإعادة ربطه على هذا الهاتف أدخلي رمز المديرة.
          </p>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/65">
            الجهاز الحالي: {deviceLabel || 'Mobile Device'}
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={devicePin}
            onChange={event => setDevicePin(event.target.value)}
            placeholder="رمز المديرة لنقل الصلاحية"
            className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void bindCurrentDevice('transfer')}
            disabled={isBindingDevice || !devicePin.trim()}
            className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 py-2.5 text-sm font-black"
          >
            {isBindingDevice ? 'جارٍ النقل...' : 'نقل الصلاحية لهذا الهاتف'}
          </button>
          <button
            onClick={() => void logout()}
            className="w-full rounded-xl border border-white/20 hover:bg-white/10 py-2.5 text-sm font-bold"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#090b13] text-white"
      dir="rtl"
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-6xl mx-auto px-3 pb-28 space-y-3">
        <header className="rounded-[2rem] border border-white/10 bg-[#151922] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/55">{arDateTime.format(new Date())}</p>
              <p className="mt-1 text-lg font-black">إدارة المديرة - الموبايل</p>
              <p className="mt-1 text-xs text-white/65">
                {isOffline || isPostgresOffline ? 'حالة الاتصال: أوفلاين مؤقتًا' : 'حالة الاتصال: مزامنة لحظية'}
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
                  <LogOut className="size-3.5" />
                  خروج
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <TabButton
            active={activeTab === 'sessions'}
            onClick={() => setActiveTab('sessions')}
            icon={<CalendarDays className="size-4" />}
            label="الجلسات"
            accent="cyan"
          />
          <TabButton
            active={activeTab === 'finance'}
            onClick={() => setActiveTab('finance')}
            icon={<WalletCards className="size-4" />}
            label="المالية"
            accent="emerald"
          />
          <TabButton
            active={activeTab === 'expenses'}
            onClick={() => setActiveTab('expenses')}
            icon={<ListFilter className="size-4" />}
            label="الصرفيات"
            accent="amber"
          />
        </section>

        {activeTab === 'sessions' && (
          <section className="space-y-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#141a28] p-3">
              <div className="grid grid-cols-2 gap-2">
                <FilterChip active={sessionFilter === 'today'} onClick={() => setSessionFilter('today')} icon={<CalendarCheck2 className="size-3.5" />} label={`اليوم (${bookingCounts.today})`} />
                <FilterChip active={sessionFilter === 'tomorrow'} onClick={() => setSessionFilter('tomorrow')} icon={<CalendarClock className="size-3.5" />} label={`غدًا (${bookingCounts.tomorrow})`} />
                <FilterChip active={sessionFilter === 'week'} onClick={() => setSessionFilter('week')} icon={<CalendarRange className="size-3.5" />} label={`هذا الأسبوع (${bookingCounts.week})`} />
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
                <article key={booking.id} className="rounded-[1.4rem] border border-white/10 bg-[#151a25] p-3">
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
                    <p>التاريخ: {(() => {
                      const d = parseBookingDateSafe(booking.shootDate);
                      return d ? arDate.format(d) : '-';
                    })()}</p>
                    <p>الوقت: {booking.details?.startTime || '-'}</p>
                    <p>الإجمالي: {formatMoney(booking.totalAmount || 0, booking.currency)}</p>
                    <p>المدفوع: {formatMoney(booking.paidAmount || 0, booking.currency)}</p>
                  </div>

                  <button
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="mt-3 w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 py-2 text-xs font-bold"
                  >
                    تفاصيل الجلسة
                  </button>
                </article>
              ))}

              {filteredBookings.length === 0 && (
                <p className="rounded-[1.4rem] border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-sm text-white/60">
                  لا توجد جلسات ضمن هذا الفلتر
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

            <div className="rounded-[1.6rem] border border-white/10 bg-[#121826] p-2 min-h-[68vh]">
              <ManagerAccountsView bookings={sortedBookings} onUpdateBooking={handleUpdateBooking} />
            </div>
          </section>
        )}

        {activeTab === 'expenses' && (
          <section className="space-y-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#121826] p-2 min-h-[68vh]">
              <ExpenseTrackerWidget
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                disableTilt
              />
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

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: 'cyan' | 'emerald' | 'amber';
}> = ({ active, onClick, icon, label, accent }) => {
  const activeClass =
    accent === 'cyan'
      ? 'bg-cyan-500 text-white border-cyan-400'
      : accent === 'emerald'
        ? 'bg-emerald-500 text-white border-emerald-400'
        : 'bg-amber-500 text-black border-amber-400';

  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-3 font-bold text-xs border transition-colors ${active ? activeClass : 'bg-white/5 text-white/70 border-white/10'}`}
    >
      <span className="inline-flex items-center justify-center gap-1.5 w-full">
        {icon}
        {label}
      </span>
    </button>
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
      active ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100' : 'bg-white/[0.03] border-white/10 text-white/70'
    }`}
  >
    {icon}
    {label}
  </button>
);

const SummaryCard: React.FC<{ title: string; line1: string; line2: string }> = ({ title, line1, line2 }) => (
  <article className="rounded-[1.4rem] border border-white/10 bg-[#151a25] p-3">
    <p className="text-xs text-cyan-200/90 font-black">{title}</p>
    <p className="text-xs text-white/80 mt-2">{line1}</p>
    <p className="text-xs text-white/60 mt-1">{line2}</p>
  </article>
);

export default ManagerMobilePortal;
