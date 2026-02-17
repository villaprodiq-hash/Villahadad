import {
  User,
  UserRole,
  Booking,
  BookingStatus,
  BookingCategory,
  Expense,
  RecurringExpense,
  DashboardTask,
  Reminder,
  ReminderType,
  DiscountCode,
  DiscountCodeType,
  AppliedDiscount,
} from '../types';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { verifyPassword, hashPassword, needsMigration } from './security/PasswordService';
import { toast } from 'sonner';
import { sanitizeDate } from '../utils/filterUtils';
import { CurrentUserService } from './CurrentUserService';

// ✅ IMPROVED: Typed Electron API interface
interface ElectronDBAPI {
  query: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number }>;
  get: (sql: string, params?: unknown[]) => Promise<Record<string, unknown> | null>;
  getStatus: () => Promise<{ postgres: boolean; cache: boolean }>;
  isReady: () => boolean;
  getError: () => string | null;
}

interface ElectronAPI {
  db: ElectronDBAPI;
  fileSystem: {
    checkNasStatus: () => Promise<{ connected: boolean; path?: string }>;
  };
  // Auto Updates
  updatedStatus?: (status: string) => void;
  onUpdateStatus?: (callback: (data: unknown) => void) => () => void;
  checkForUpdates?: () => Promise<unknown>;
  installUpdate?: () => Promise<void>;
  getAppVersion?: () => Promise<string>;

  // Backup
  saveBackupFile?: (filename: string, content: string) => Promise<boolean>;
  openBackupFile?: () => Promise<string | null>;
}

// Helper to check for Electron API with proper typing
const getElectronAPI = (): ElectronAPI | null => {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return null;
  }
  return window.electronAPI as unknown as ElectronAPI;
};

// ✅ IMPROVED: Typed In-Memory Cache
let users: User[] = [];
let bookings: Booking[] = [];
let expenses: Expense[] = [];
let recurringExpenses: RecurringExpense[] = [];
let tasks: DashboardTask[] = [];
let reminders: Reminder[] = [];
let discountCodesCache: DiscountCode[] = [];
const fullSchemaSyncUnsupportedIds = new Set<string>();
let fullSchemaSyncUnsupportedGlobally = false;
const localOnlySyncLastAttempt = new Map<string, number>();
const LOCAL_ONLY_SYNC_COOLDOWN_MS = 15000;
let localOnlySyncInFlight = false;

// ✅ Offline-first: Check network status before Supabase calls
const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// ✅ Supabase call with timeout (prevents hanging when offline)
const withTimeout = <T>(promise: PromiseLike<T>, ms: number = 5000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Supabase request timeout')), ms);
    Promise.resolve(promise).then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err: unknown) => { clearTimeout(timer); reject(err); }
    );
  });
};

const isSupabaseSchemaMismatch = (error: unknown): boolean => {
  const err = error as { status?: number; message?: string } | null;
  const status = Number(err?.status || 0);
  const message = String(err?.message || '').toLowerCase();
  return (
    status === 400 ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('column')
  );
};

// ✅ IMPROVED: Typed Event System
type BackendEvent = 
  | 'users_updated' 
  | 'bookings_updated' 
  | 'expenses_updated' 
  | 'recurring_expenses_updated'
  | 'tasks_updated' 
  | 'reminders_updated'
  | 'discount_codes_updated';

type Listener = (event: BackendEvent) => void;
const listeners: Listener[] = [];

interface InventoryPool {
  total: number;
  charged: number;
}

interface MemoryPool {
  total: number;
  free: number;
}

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  icon: string;
  status: string;
  assignedTo: string | null;
  batteryPool: InventoryPool | null;
  memoryPool: MemoryPool | null;
  notes: string;
}

interface InventoryLogEntry {
  id: string;
  itemId: string;
  action: string;
  userId: string;
  details: string;
  createdAt: string;
}

interface InventoryUpdatePayload extends Record<string, unknown> {
  batteryPool?: InventoryPool;
  memoryPool?: MemoryPool;
}

interface ActivityLogEntry {
  id: string;
  user: string;
  userId: string;
  action: string;
  target: string;
  time: string;
  type: 'danger' | 'info';
}

interface AddExtraServiceResult {
  success: boolean;
}

interface DiscountValidationResult {
  valid: boolean;
  message: string;
  discount?: {
    codeId: string;
    code: string;
    type: DiscountCodeType;
    value: number;
    subtotalAmount: number;
    discountAmount: number;
    finalAmount: number;
    startAt: string;
    endAt?: string;
  };
}

const notifyListeners = (event: BackendEvent): void => {
  listeners.forEach(l => l(event));
};

// ✅ IMPROVED: Helper to parse DB row to User
const parseUserRow = (row: Record<string, unknown>): User => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  role: (row.role as UserRole) || UserRole.RECEPTION,
  password: row.password ? String(row.password) : undefined,
  jobTitle: row.jobTitle ? String(row.jobTitle) : undefined,
  avatar: row.avatar ? String(row.avatar) : undefined,
  email: row.email ? String(row.email) : undefined,
  preferences: typeof row.preferences === 'string' 
    ? JSON.parse(row.preferences) 
    : (row.preferences as User['preferences']),
});

const VALID_USER_ROLES = new Set<string>(Object.values(UserRole));

const normalizeUserRole = (role: unknown): UserRole => {
  const raw = String(role || '').trim();
  if (!raw) return UserRole.RECEPTION;

  const canonical = raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (VALID_USER_ROLES.has(canonical)) {
    return canonical as UserRole;
  }

  // Legacy/label aliases observed in older local payloads
  if (canonical === 'manager' || canonical === 'مديرة' || canonical === 'المديرة') {
    return UserRole.MANAGER;
  }
  if (canonical === 'admin' || canonical === 'مشرف' || canonical === 'الاداريه' || canonical === 'الإدارية') {
    return UserRole.ADMIN;
  }
  if (canonical === 'reception' || canonical === 'استقبال') {
    return UserRole.RECEPTION;
  }
  if (canonical === 'photo_editor' || canonical === 'photoeditor' || canonical === 'محرر' || canonical === 'محررة') {
    return UserRole.PHOTO_EDITOR;
  }
  if (canonical === 'video_editor' || canonical === 'videoeditor' || canonical === 'مونتير') {
    return UserRole.VIDEO_EDITOR;
  }
  if (canonical === 'printer' || canonical === 'طباعة') {
    return UserRole.PRINTER;
  }
  if (canonical === 'selector' || canonical === 'اختيار') {
    return UserRole.SELECTOR;
  }

  return UserRole.RECEPTION;
};

const sanitizeUserRecord = (input: User | null | undefined): User | null => {
  if (!input) return null;

  const id = String(input.id || '').trim();
  const name = String(input.name || '').trim();
  const role = normalizeUserRole(input.role);

  if (!id || id.length < 4) return null;
  if (/^\d+$/.test(id)) return null;
  if (!name || name.length < 2) return null;
  if (/^\d+$/.test(name)) return null;

  return {
    ...input,
    id,
    name,
    role,
  };
};

// ✅ Helper to parse Supabase/SQLite row to Booking
// Handles both snake_case (Supabase) and camelCase (SQLite) column names
const safeNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};
const safeJsonParseMB = (val: unknown, fallback: unknown = undefined): unknown => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
};
const parseBookingRow = (row: Record<string, unknown>): Booking => ({
  id: String(row.id || ''),
  clientName: String(row.client_name ?? row.clientName ?? 'Unknown'),
  shootDate: sanitizeDate(String(row.shoot_date ?? row.shootDate ?? '').trim()),
  title: String(row.title || ''),
  status: (row.status as Booking['status']) || BookingStatus.CONFIRMED,
  // ✅ Use safeNum to avoid 0 being treated as falsy
  totalAmount: safeNum(row.total_amount ?? row.totalAmount),
  paidAmount: safeNum(row.paid_amount ?? row.paidAmount),
  currency: (row.currency as Booking['currency']) || 'IQD',
  servicePackage: String(row.service_package ?? row.servicePackage ?? ''),
  location: String(row.location || ''),
  clientId: String(row.client_id ?? row.clientId ?? ''),
  clientPhone: String(row.phone ?? row.client_phone ?? row.clientPhone ?? ''),
  category: (row.category as Booking['category']) || BookingCategory.WEDDING,
  details: safeJsonParseMB(row.details),
  statusHistory: safeJsonParseMB(row.status_history ?? row.statusHistory, []),
  notes: String(row.notes || ''),
  createdAt: String(row.created_at ?? row.createdAt ?? ''),
  actualSelectionDate: row.actual_selection_date
    ? String(row.actual_selection_date)
    : row.actualSelectionDate
      ? String(row.actualSelectionDate)
      : undefined,
  deliveryDeadline: row.delivery_deadline
    ? String(row.delivery_deadline)
    : row.deliveryDeadline
      ? String(row.deliveryDeadline)
      : undefined,
  isPriority: Boolean(row.is_priority ?? row.isPriority),
  isCrewShooting: Boolean(row.is_crew_shooting ?? row.isCrewShooting),
  isFamous: Boolean(row.is_famous ?? row.isFamous),
  // ✅ Financial fields needed by TransactionHistoryWidget for mixed-currency add-ons
  originalPackagePrice: safeNum(row.original_package_price ?? row.originalPackagePrice) || undefined,
  addOnTotal: safeNum(row.add_on_total ?? row.addOnTotal) || undefined,
  paymentHistory: safeJsonParseMB(row.payment_history ?? row.paymentHistory),
  // ✅ Soft delete tracking
  deletedAt: row.deleted_at ?? row.deletedAt,
  // ✅ Staff assignment fields
  assignedShooter: row.assigned_shooter ? String(row.assigned_shooter) : (row.assignedShooter ? String(row.assignedShooter) : undefined),
  assignedPhotoEditor: row.assigned_photo_editor ? String(row.assigned_photo_editor) : (row.assignedPhotoEditor ? String(row.assignedPhotoEditor) : undefined),
  assignedPrinter: row.assigned_printer ? String(row.assigned_printer) : (row.assignedPrinter ? String(row.assignedPrinter) : undefined),
  assignedReceptionist: row.assigned_receptionist ? String(row.assigned_receptionist) : (row.assignedReceptionist ? String(row.assignedReceptionist) : undefined),
  client_token: row.client_token ? String(row.client_token) : undefined,
  // ✅ Exchange rate — saved per booking for historical accuracy
  exchangeRate: safeNum(row.exchange_rate ?? row.exchangeRate) || undefined,
  // ✅ Source and metadata
  source: (row.source as Booking['source']) || undefined,
  created_by: row.created_by ? String(row.created_by) : (row.createdBy ? String(row.createdBy) : undefined),
  updated_by: row.updated_by ? String(row.updated_by) : (row.updatedBy ? String(row.updatedBy) : undefined),
} as Booking);

const toIsoMinute = (isoLike?: string | null): string | undefined => {
  if (!isoLike) return undefined;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return undefined;
  // keep minute precision as requested by business flow
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const sanitizeDiscountCode = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, '');

const computeDiscountAmount = (
  type: DiscountCodeType,
  value: number,
  subtotalAmount: number
): number => {
  if (subtotalAmount <= 0) return 0;
  if (type === 'percentage') {
    const normalizedPercent = Math.max(0, Math.min(100, value));
    return Math.min(subtotalAmount, (subtotalAmount * normalizedPercent) / 100);
  }
  return Math.min(subtotalAmount, Math.max(0, value));
};

const parseDiscountCodeRow = (row: Record<string, unknown>): DiscountCode => ({
  id: String(row.id || ''),
  code: sanitizeDiscountCode(String(row.code || '')),
  type: (String(row.type || 'percentage') as DiscountCodeType),
  value: Number(row.value || 0),
  startAt: String(row.startAt || row.start_at || ''),
  endAt: row.endAt || row.end_at ? String(row.endAt || row.end_at) : undefined,
  isActive: Boolean(Number(row.isActive ?? row.is_active ?? 0)),
  isPublished: Boolean(Number(row.isPublished ?? row.is_published ?? 0)),
  notes: row.notes ? String(row.notes) : undefined,
  usageCount: Number(row.usageCount || row.usage_count || 0),
  createdBy: String(row.createdBy || row.created_by || ''),
  createdByName: String(row.createdByName || row.created_by_name || ''),
  createdAt: String(row.createdAt || row.created_at || ''),
  updatedAt: String(row.updatedAt || row.updated_at || ''),
});

const getCurrentActor = () => {
  const current = CurrentUserService.getCurrentUser();
  if (current?.id && current?.name) {
    return {
      id: current.id,
      name: current.name,
      role: normalizeUserRole(current.role),
    };
  }

  const storageKeys = ['villahadad_current_user', 'user'];
  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const fromStorage = JSON.parse(raw) as Partial<User>;
      const id = String(fromStorage.id || '').trim();
      const name = String(fromStorage.name || '').trim();
      if (!id || !name) continue;

      return {
        id,
        name,
        role: normalizeUserRole(fromStorage.role),
      };
    } catch {
      // Ignore malformed storage and continue to next source
    }
  }

  return {
    id: 'unknown',
    name: 'Unknown',
    role: UserRole.RECEPTION,
  };
};

const ensureManagerRole = () => {
  const actor = getCurrentActor();
  if (actor.role !== UserRole.MANAGER) {
    throw new Error('صلاحية الخصومات متاحة للمديرة فقط');
  }
  return actor;
};

const persistDiscountRedemption = async (
  bookingId: string,
  discount: AppliedDiscount
): Promise<void> => {
  const api = getElectronAPI();
  if (!api?.db) return;

  const now = new Date().toISOString();
  const actor = getCurrentActor();

  try {
    await api.db.run(
      `INSERT INTO discount_redemptions
      (id, discountCodeId, bookingId, code, type, value, discountAmount, subtotalAmount, finalAmount, reason, appliedBy, appliedByName, appliedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        discount.codeId,
        bookingId,
        sanitizeDiscountCode(discount.code),
        discount.type,
        discount.value,
        discount.discountAmount,
        discount.subtotalAmount,
        discount.finalAmount,
        discount.reason || '',
        actor.id,
        actor.name,
        now,
      ]
    );

    await api.db.run(
      'UPDATE discount_codes SET usageCount = COALESCE(usageCount, 0) + 1, updatedAt = ? WHERE id = ?',
      [now, discount.codeId]
    );

    discountCodesCache = discountCodesCache.map(code =>
      code.id === discount.codeId
        ? { ...code, usageCount: (code.usageCount || 0) + 1, updatedAt: now }
        : code
    );
  } catch (error) {
    console.warn('⚠️ Failed to persist discount redemption:', error);
  }
};

// ✅ Real-time Supabase subscription for bookings (initialized after auth)
let bookingsChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeRetryTimeout: ReturnType<typeof setTimeout> | null = null;

const teardownBookingsRealtime = async () => {
  if (realtimeRetryTimeout) {
    clearTimeout(realtimeRetryTimeout);
    realtimeRetryTimeout = null;
  }
  if (bookingsChannel) {
    try {
      await supabase.removeChannel(bookingsChannel);
    } catch (e) {
      console.warn('⚠️ Error removing bookings channel:', e);
    }
    bookingsChannel = null;
    console.log('🔌 Real-time bookings subscription removed');
  }
};

const setupBookingsRealtime = () => {
  if (bookingsChannel) {
    console.log('⚠️ Bookings real-time already setup');
    return;
  }

  if (!isOnline()) {
    console.log('📴 Offline — deferring real-time setup until online');
    return;
  }

  console.log('🔔 Setting up real-time bookings sync...');

  bookingsChannel = supabase
    .channel('bookings-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookings' },
      (payload) => {
        console.log('🔔 New booking detected:', payload.new);
        try {
          const newBooking = parseBookingRow(payload.new as Record<string, unknown>);
          // Check if already exists (avoid duplicates)
          if (!bookings.find(b => b.id === newBooking.id)) {
            bookings = [...bookings, newBooking];
            // Also save to local SQLite for persistence
            const api = getElectronAPI();
            if (api?.db) {
              api.db.run(
                `INSERT OR REPLACE INTO bookings (id, clientName, clientPhone, clientId, category, title, shootDate, status, totalAmount, paidAmount, currency, exchangeRate, servicePackage, location, details, statusHistory, notes, isPriority, isCrewShooting)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  newBooking.id, newBooking.clientName, newBooking.clientPhone, newBooking.clientId,
                  newBooking.category, newBooking.title, newBooking.shootDate, newBooking.status,
                  newBooking.totalAmount, newBooking.paidAmount, newBooking.currency, newBooking.exchangeRate || null,
                  newBooking.servicePackage, newBooking.location,
                  JSON.stringify(newBooking.details), JSON.stringify(newBooking.statusHistory),
                  newBooking.notes || '', newBooking.isPriority ? 1 : 0, newBooking.isCrewShooting ? 1 : 0,
                ]
              ).catch(e => console.warn('⚠️ Failed to save real-time booking to SQLite:', e));
            }
            notifyListeners('bookings_updated');
            console.log('✅ Booking added to local cache + SQLite:', newBooking.id);
          }
        } catch (e) {
          console.error('❌ Failed to parse new booking:', e);
        }
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings' },
      (payload) => {
        console.log('🔔 Booking updated:', payload.new);
        try {
          const raw = payload.new as Record<string, unknown>;
          // Check if this UPDATE is actually a soft delete (deleted_at was set)
          if (raw.deleted_at) {
            const deletedId = String(raw.id || '');
            bookings = bookings.filter(b => b.id !== deletedId);
            notifyListeners('bookings_updated');
            console.log('✅ Booking soft-deleted & removed from cache:', deletedId);
          } else {
            const updatedBooking = parseBookingRow(raw);
            bookings = bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b);
            notifyListeners('bookings_updated');
            console.log('✅ Booking updated in local cache:', updatedBooking.id);
          }
        } catch (e) {
          console.error('❌ Failed to parse updated booking:', e);
        }
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'bookings' },
      (payload) => {
        console.log('🔔 Booking deleted:', payload.old);
        const deletedId = String((payload.old as Record<string, unknown>).id || '');
        bookings = bookings.filter(b => b.id !== deletedId);
        notifyListeners('bookings_updated');
        console.log('✅ Booking removed from local cache:', deletedId);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time bookings sync active!');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Real-time subscription error:', status);
        // Auto-retry after 10 seconds
        bookingsChannel = null;
        realtimeRetryTimeout = setTimeout(() => {
          console.log('🔄 Retrying real-time subscription...');
          setupBookingsRealtime();
        }, 10000);
      }
    });
};

// ✅ Listen for online/offline events to manage real-time connection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network online — reconnecting real-time...');
    if (!bookingsChannel) {
      setupBookingsRealtime();
    }
  });
  window.addEventListener('offline', () => {
    console.log('📴 Network offline — real-time paused');
    teardownBookingsRealtime();
  });
}

// ✅ DO NOT auto-setup real-time at module load — wait for auth
// setupBookingsRealtime() is called from initRealtimeAfterAuth() below

// ✅ PUBLIC: Called after user authenticates to start real-time sync
const initRealtimeAfterAuth = () => {
  if (!bookingsChannel && isOnline()) {
    setupBookingsRealtime();
  }
};

export const electronBackend = {
  // ✅ Called after login to start real-time sync
  initRealtimeSync: initRealtimeAfterAuth,

  // ========== AUTHENTICATION (🔐 SECURE) ==========
  
  /**
   * ✅ SECURITY: Authenticate user with hashed password verification
   * Supports both bcrypt hashes and legacy plain-text passwords
   */
  authenticateUser: async (name: string, password: string): Promise<User | null> => {
    try {
      const allUsers = await electronBackend.getUsers();
      const user = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
      
      if (!user || !user.password) {
        console.warn('🔐 Auth failed: User not found');
        return null;
      }

      // ✅ Verify password (handles both hashed and plain-text)
      const isValid = await verifyPassword(password, user.password);
      
      if (!isValid) {
        console.warn('🔐 Auth failed: Invalid password');
        return null;
      }

      // ✅ Auto-migrate plain-text passwords to hashed
      if (needsMigration(user.password)) {
        console.log('🔐 Migrating plain-text password to bcrypt hash...');
        const hashedPassword = await hashPassword(password);
        await electronBackend.updateUser(user.id, { password: hashedPassword });
        console.log('✅ Password migrated successfully');
      }

      console.log('✅ Auth successful:', user.name);
      
      // Return user without password
      const safeUser: User = { ...user, password: undefined };
      return safeUser;
    } catch (error) {
      console.error('🔐 Authentication error:', error);
      return null;
    }
  },

  /**
   * ✅ SECURITY: Change user password with hashing
   */
  changePassword: async (userId: string, oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const allUsers = await electronBackend.getUsers();
      const user = allUsers.find(u => u.id === userId);
      
      if (!user || !user.password) {
        return false;
      }

      // Verify old password
      const isValid = await verifyPassword(oldPassword, user.password);
      if (!isValid) {
        console.warn('🔐 Change password failed: Old password is incorrect');
        return false;
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      await electronBackend.updateUser(userId, { password: hashedPassword });
      
      console.log('✅ Password changed successfully');
      return true;
    } catch (error) {
      console.error('🔐 Change password error:', error);
      return false;
    }
  },

  // ========== USERS (SUPABASE + SQLite FALLBACK) ==========
  // Cache for better performance
  _usersCacheTTL: 5000,
  _lastUsersFetch: 0,

  getUsers: async (): Promise<User[]> => {
    const now = Date.now();
    
    // Return cache if still fresh
    if (users.length > 0 && (now - electronBackend._lastUsersFetch) < electronBackend._usersCacheTTL) {
      return [...users];
    }

    let supabaseUsers: User[] = [];
    let sqliteUsers: User[] = [];

    // 🔄 Try Supabase first (cloud sync) — ONLY if online, with timeout
    if (isOnline()) {
      try {
        console.log('🔍 Fetching users from Supabase...');
        const { data, error } = await withTimeout(
          supabase
            .from('users')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: true }),
          3000 // 3 second timeout (reduced for faster offline fallback)
        );

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        console.log('📊 Raw Supabase data:', data);

        // Parse Supabase rows (snake_case → camelCase)
        supabaseUsers = (data || [])
          .map((row: Record<string, unknown>) => ({
            id: String(row.id || ''),
            name: String(row.name || ''),
            role: (row.role as UserRole) || UserRole.RECEPTION,
            password: row.password ? String(row.password) : undefined,
            jobTitle: row.job_title ? String(row.job_title) : undefined,
            avatar: row.avatar ? String(row.avatar) : undefined,
            email: row.email ? String(row.email) : undefined,
            preferences: typeof row.preferences === 'string'
              ? JSON.parse(row.preferences)
              : (row.preferences as User['preferences']),
          }))
          .map(user => sanitizeUserRecord(user))
          .filter((user): user is User => user !== null);

        console.log(`✅ Loaded ${supabaseUsers.length} users from Supabase:`, supabaseUsers.map(u => u.name));

        // 💾 OFFLINE CACHE: Save Supabase users to SQLite for offline access
        const cacheApi = getElectronAPI();
        if (cacheApi?.db && supabaseUsers.length > 0) {
          console.log('💾 Caching Supabase users to SQLite for offline access...');
          for (const user of supabaseUsers) {
            try {
              await cacheApi.db.run(
                `INSERT OR REPLACE INTO users (id, name, role, password, jobTitle, avatar, email, preferences) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  user.id, user.name, user.role, user.password || null,
                  user.jobTitle || null, user.avatar || null, user.email || null,
                  user.preferences ? JSON.stringify(user.preferences) : null
                ]
              );
            } catch (cacheErr) {
              console.warn(`⚠️ Failed to cache user ${user.name} to SQLite:`, cacheErr);
            }
          }
          console.log(`✅ Cached ${supabaseUsers.length} users to SQLite`);
        }

      } catch (supabaseError) {
        console.warn('⚠️ Supabase fetch failed (offline/timeout):', supabaseError);
      }
    } else {
      console.log('📴 Offline — skipping Supabase users, loading from SQLite only');
    }

    // 📦 Also load from SQLite (to get offline/unsynced users)
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const result = await api.db.query('SELECT * FROM users');
        sqliteUsers = result
          .map(parseUserRow)
          .map(user => sanitizeUserRecord(user))
          .filter((user): user is User => user !== null);
        console.log(`✅ Loaded ${sqliteUsers.length} users from SQLite`);
      } catch (e) {
        console.error('SQLite fetch failed:', e);
      }
    }

    // 🔄 Merge users: Supabase users + SQLite-only users (unsynced)
    const userMap = new Map<string, User>();
    
    // Add Supabase users first (cloud = source of truth)
    supabaseUsers.forEach(user => userMap.set(user.id, user));
    
    const cloudUsersAvailable = supabaseUsers.length > 0;

    // Add local users only when cloud users are not available (offline fallback)
    if (!cloudUsersAvailable) {
      sqliteUsers.forEach(user => {
        if (!userMap.has(user.id)) {
          userMap.set(user.id, user);
          console.log(`📦 Found offline user: ${user.name}`);
        }
      });

      // 📦 Add Pending Users from LocalStorage (offline only)
      try {
          const pendingRaw = JSON.parse(localStorage.getItem('pending_users') || '[]') as unknown[];
          pendingRaw
            .map(item => sanitizeUserRecord(item as User))
            .filter((user): user is User => user !== null)
            .forEach((user: User) => {
              if (!userMap.has(user.id)) {
                userMap.set(user.id, user);
                console.log(`📦 Found pending local user: ${user.name}`);
              }
            });
      } catch (e) {
          console.warn('Failed to load pending users:', e);
      }
    } else if (sqliteUsers.length > supabaseUsers.length) {
      console.log('ℹ️ Cloud users loaded; ignoring extra local-only users to keep device lists consistent');
    }

    const mergedUsers = Array.from(userMap.values());
    
    // 🛡️ SAFETY: Never return empty if we had cached users
    if (mergedUsers.length === 0 && users.length > 0) {
      console.warn('⚠️ All sources returned empty but cache has users — keeping cache');
      return [...users];
    }

    users = mergedUsers;
    electronBackend._lastUsersFetch = now;
    
    console.log(`✅ Total merged users: ${users.length}`);
    return [...users];
  },

  addUser: async (
    name: string,
    role: UserRole,
    password?: string,
    jobTitle?: string,
    preferences?: User['preferences'],
    avatar?: string
  ): Promise<User> => {
    console.log('🔹 [addUser] Starting:', { name, role, jobTitle });

    // ✅ SECURITY: Hash password before storing
    const hashedPassword = password ? await hashPassword(password) : await hashPassword('1234');

    const newUser: User = {
      id: uuidv4(),
      name,
      role,
      password: hashedPassword,
      jobTitle,
      preferences,
      avatar: avatar || '',
      email: `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@local.app`,
    };

    try {
      // 🔄 Save to Supabase first (cloud sync)
      const { error } = await supabase.from('users').insert([{
        id: newUser.id,
        name: newUser.name,
        role: newUser.role,
        password: newUser.password,
        job_title: newUser.jobTitle,
        avatar: newUser.avatar,
        email: newUser.email,
        preferences: newUser.preferences || {},
      }]);

      if (error) throw error;
      console.log('✅ User saved to Supabase:', newUser.name);

    } catch (supabaseError) {
      console.warn('⚠️ Supabase save failed, trying SQLite:', supabaseError);
      
      // 📦 Fallback to SQLite
      const api = getElectronAPI();
      if (api?.db) {
        try {
          await api.db.run(
            'INSERT INTO users (id, name, role, password, jobTitle, preferences, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newUser.id, newUser.name, newUser.role, newUser.password, newUser.jobTitle, JSON.stringify(newUser.preferences), newUser.avatar]
          );
          console.log('✅ User saved to SQLite (offline)');
        } catch (sqliteError) {
          console.error('❌ SQLite also failed:', sqliteError);
        }
      }
      
      // 🔄 Queue for later sync
      const pending = JSON.parse(localStorage.getItem('pending_users') || '[]');
      pending.push(newUser);
      localStorage.setItem('pending_users', JSON.stringify(pending));
      toast.info('تم الحفظ محلياً (سيتم الرفع تلقائياً)');
    }

    // Update local cache
    users.push(newUser);
    
    // Invalidate cache to force fresh fetch
    electronBackend._lastUsersFetch = 0;
    
    notifyListeners('users_updated');
    return newUser;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    console.log('🔄 [updateUser] Starting...', { id, updateKeys: Object.keys(updates) });
    
    // 🚨 SPECIAL CASE: Bootstrap/Temp User being edited
    if (id === 'bootstrap_manager' || id.startsWith('temp_')) {
      console.log('✨ Converting Temp/Bootstrap User to Real User...');
      return electronBackend.addUser(
         updates.name || 'User', 
         (updates.role || UserRole.MANAGER), 
         updates.password || '1234', 
         updates.jobTitle || 'Staff',
         updates.preferences,
         updates.avatar 
      );
    }

    // Build Supabase update object (camelCase → snake_case)
    const supabaseUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.role !== undefined) supabaseUpdates.role = updates.role;
    if (updates.password !== undefined) supabaseUpdates.password = updates.password;
    if (updates.jobTitle !== undefined) supabaseUpdates.job_title = updates.jobTitle;
    if (updates.avatar !== undefined) {
      supabaseUpdates.avatar = updates.avatar;
      console.log('📸 [updateUser] Avatar being saved, size:', Math.round((updates.avatar?.length || 0) / 1024), 'KB');
    }
    if (updates.email !== undefined) supabaseUpdates.email = updates.email;
    if (updates.preferences !== undefined) supabaseUpdates.preferences = updates.preferences;

    let supabaseSaveSuccess = false;
    
    try {
      // 🔄 Update in Supabase first
      console.log('☁️ [updateUser] Saving to Supabase...');
      const { data, error } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('❌ [updateUser] Supabase error:', error);
        throw error;
      }
      
      console.log('✅ [updateUser] Supabase save SUCCESS!');
      console.log('   📸 Saved avatar length:', data?.avatar?.length || 0);
      supabaseSaveSuccess = true;

    } catch (supabaseError: unknown) {
      const supabaseMessage = supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
      console.warn('⚠️ [updateUser] Supabase update failed:', supabaseMessage);
      
      // 📦 Fallback to SQLite
      const api = getElectronAPI();
      if (api?.db) {
        const keys = Object.keys(updates).filter(k => k !== 'id') as (keyof User)[];
        if (keys.length > 0) {
          const setClause = keys.map(k => `${k} = ?`).join(', ');
          const values = keys.map(k => {
            const val = updates[k];
            return typeof val === 'object' ? JSON.stringify(val) : val;
          });
          try {
            await api.db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
            console.log('✅ [updateUser] SQLite save SUCCESS (offline mode)');
          } catch (e) {
            console.error('❌ [updateUser] SQLite update also failed:', e);
            throw new Error('Failed to save user: Both Supabase and SQLite failed');
          }
        }
      } else {
        // Re-throw if no SQLite fallback available
        throw supabaseError;
      }
    }

    // Update local cache
    users = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    
    // Invalidate cache TTL to force refresh on next getUsers()
    electronBackend._lastUsersFetch = 0;
    
    notifyListeners('users_updated');
    
    const updatedUser = users.find(u => u.id === id) || ({} as User);
    console.log('🏁 [updateUser] Complete!', { 
      success: supabaseSaveSuccess, 
      avatarSaved: !!updatedUser.avatar,
      avatarLength: updatedUser.avatar?.length || 0 
    });
    
    return updatedUser;
  },

  deleteUser: async (id: string): Promise<void> => {
    let supabaseSuccess = false;
    let sqliteSuccess = false;
    let supabaseErrorMsg = '';
    let sqliteErrorMsg = '';

    // 🔄 Try Supabase hard delete first
    try {
      console.log('🗑️ Attempting to hard delete user from Supabase:', id);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Supabase hard delete error:', error);
        supabaseErrorMsg = error.message;
        throw error;
      }
      console.log('✅ User hard deleted from Supabase:', id);
      supabaseSuccess = true;
    } catch (supabaseError) {
      console.warn('⚠️ Supabase hard delete failed, trying soft delete:', supabaseError);
      supabaseErrorMsg = supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
      
      // 🔄 Fallback: Try soft delete (mark as deleted)
      try {
        console.log('🗑️ Attempting soft delete for user:', id);
        const { error: softError } = await supabase
          .from('users')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        
        if (softError) {
          console.error('❌ Supabase soft delete also failed:', softError);
          supabaseErrorMsg += ` | Soft delete: ${softError.message}`;
        } else {
          console.log('✅ User soft deleted from Supabase:', id);
          supabaseSuccess = true; // Consider it success if soft delete works
        }
      } catch (softDeleteError) {
        console.error('❌ Soft delete exception:', softDeleteError);
        supabaseErrorMsg += ` | Soft delete exception`;
      }
    }

    // 📦 Also delete from SQLite (always, even if Supabase succeeded)
    const api = getElectronAPI();
    if (api?.db) {
      try {
        console.log('🗑️ Attempting to delete user from SQLite:', id);
        const result = await api.db.run('DELETE FROM users WHERE id = ?', [id]);
        console.log('✅ User deleted from SQLite, changes:', result.changes);
        sqliteSuccess = true;
      } catch (e) {
        console.error('❌ SQLite delete failed:', e);
        sqliteErrorMsg = e instanceof Error ? e.message : String(e);
      }
    }

    // Update local cache immediately (optimistic deletion)
    users = users.filter(u => u.id !== id);
    
    // Also remove from pending_users in localStorage if exists
    try {
      const pendingUsers = JSON.parse(localStorage.getItem('pending_users') || '[]');
      const filtered = pendingUsers.filter((u: User) => u.id !== id);
      localStorage.setItem('pending_users', JSON.stringify(filtered));
      console.log('✅ Removed user from pending_users if existed');
    } catch (e) {
      console.warn('Failed to update pending_users:', e);
    }
    
    // Invalidate cache to force fresh fetch
    electronBackend._lastUsersFetch = 0;
    
    notifyListeners('users_updated');
    
    // Only throw error if BOTH failed
    if (!supabaseSuccess && !sqliteSuccess) {
      throw new Error(`فشل حذف الموظف:\nSupabase: ${supabaseErrorMsg || 'OK'}\nSQLite: ${sqliteErrorMsg || 'OK'}`);
    }
    
    // Log warning if one failed but other succeeded
    if (!supabaseSuccess || !sqliteSuccess) {
      console.warn('⚠️ Partial deletion - one source failed, but user removed from UI');
    }
  },

  deleteAllUsers: async (): Promise<void> => {
    const api = getElectronAPI();
    if (api?.db) {
      await api.db.run('DELETE FROM users');
      notifyListeners('users_updated');
      return;
    }
    users = [];
    notifyListeners('users_updated');
  },

  // ========== BOOKINGS (Supabase + SQLite + Cache) ==========
  getBookings: async (): Promise<Booking[]> => {
    console.log('[mockBackend] 📅 getBookings called');

    let supabaseBookings: Booking[] = [];
    let sqliteBookings: Booking[] = [];
    let supabaseFetchSucceeded = false;

    // 1. Try Supabase (cloud sync) — ONLY if online, with timeout
    if (isOnline()) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('bookings')
            .select('*')
            .is('deleted_at', null)
            .order('shoot_date', { ascending: true }),
          5000 // 5 second timeout
        );

        if (error) {
          console.warn('[mockBackend] ⚠️ Supabase bookings fetch failed:', error.message);
        } else {
          supabaseBookings = (data || []).map((row: Record<string, unknown>) => parseBookingRow(row));
          supabaseFetchSucceeded = true;
          console.log(`[mockBackend] ☁️ Supabase: ${supabaseBookings.length} bookings`);
        }
      } catch (e) {
        console.warn('[mockBackend] ⚠️ Supabase bookings error (offline/timeout):', e);
      }
    } else {
      console.log('[mockBackend] 📴 Offline — skipping Supabase, loading from SQLite only');
    }

    // 2. Also load from SQLite (local persistence)
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const rows = await api.db.query('SELECT * FROM bookings WHERE deletedAt IS NULL ORDER BY shootDate ASC');
        sqliteBookings = (rows || []).map((row: Record<string, unknown>) => parseBookingRow(row));
        console.log(`[mockBackend] 💾 SQLite: ${sqliteBookings.length} bookings`);
      } catch (e) {
        console.warn('[mockBackend] ⚠️ SQLite bookings fetch failed:', e);
      }
    }

    // 3. Merge: Supabase wins for matching IDs, SQLite fills in local-only bookings
    const bookingMap = new Map<string, Booking>();
    const supabaseIds = new Set(supabaseBookings.map(b => b.id));

    // SQLite first (base)
    sqliteBookings.forEach(b => bookingMap.set(b.id, b));

    // Supabase overwrites (cloud is source of truth for synced data)
    supabaseBookings.forEach(b => bookingMap.set(b.id, b));

    // Also keep any in-memory cache entries not in either DB (recently added)
    bookings.forEach(b => {
      if (b.deletedAt) return;
      if (!bookingMap.has(b.id)) {
        bookingMap.set(b.id, b);
      }
    });

    const merged = Array.from(bookingMap.values());

    if (merged.length > 0) {
      bookings = merged;
    } else if (bookings.length > 0) {
      console.log(`[mockBackend] ⚠️ Both sources empty but cache has ${bookings.length} - keeping cache`);
      return [...bookings];
    }

    // 4. Sync-up: Push local-only bookings to Supabase (background, non-blocking)
    const localOnly = sqliteBookings.filter(b => !supabaseIds.has(b.id));
    if (localOnly.length > 0 && isOnline() && supabaseFetchSucceeded && !localOnlySyncInFlight) {
      console.log(`[mockBackend] 🔄 Found ${localOnly.length} local-only bookings, syncing to Supabase...`);
      localOnlySyncInFlight = true;
      // Fire-and-forget: don't block getBookings
      void (async () => {
        for (const b of localOnly) {
          const now = Date.now();
          const lastAttempt = localOnlySyncLastAttempt.get(b.id) || 0;
          if (now - lastAttempt < LOCAL_ONLY_SYNC_COOLDOWN_MS) {
            continue;
          }
          localOnlySyncLastAttempt.set(b.id, now);

          try {
            let fullSchemaError: { message?: string; status?: number } | null = null;

            if (!fullSchemaSyncUnsupportedGlobally && !fullSchemaSyncUnsupportedIds.has(b.id)) {
              // Try full schema first
              const { error } = await supabase.from('bookings').upsert([{
                id: b.id,
                client_name: b.clientName,
                shoot_date: b.shootDate,
                title: b.title,
                status: b.status,
                total_amount: b.totalAmount,
                paid_amount: b.paidAmount,
                currency: b.currency,
                exchange_rate: b.exchangeRate || null,
                service_package: b.servicePackage,
                location: b.location,
                client_id: b.clientId,
                phone: b.clientPhone,
                category: b.category,
                details: typeof b.details === 'string' ? b.details : JSON.stringify(b.details),
                status_history: typeof b.statusHistory === 'string' ? b.statusHistory : JSON.stringify(b.statusHistory),
                notes: b.notes,
                is_priority: b.isPriority ? 1 : 0,
                is_crew_shooting: b.isCrewShooting ? 1 : 0,
              }], { onConflict: 'id' });
              fullSchemaError = error;
            } else {
              fullSchemaError = { message: 'full schema disabled for this booking id' };
            }

            if (fullSchemaError) {
              const fullSchemaErrorMessage = String(fullSchemaError.message || '').toLowerCase();
              if (
                fullSchemaError.status === 400 ||
                fullSchemaErrorMessage.includes('schema cache') ||
                fullSchemaErrorMessage.includes('could not find') ||
                fullSchemaErrorMessage.includes('column')
              ) {
                // Remote schema doesn't accept one or more optional columns.
                fullSchemaSyncUnsupportedIds.add(b.id);
                fullSchemaSyncUnsupportedGlobally = true;
              }

              // Retry with core columns only
              const { error: retryError } = await supabase.from('bookings').upsert([{
                id: b.id,
                client_name: b.clientName,
                shoot_date: b.shootDate,
                title: b.title,
                status: b.status,
                total_amount: b.totalAmount,
                paid_amount: b.paidAmount,
                currency: b.currency,
                service_package: b.servicePackage,
                location: b.location,
                client_id: b.clientId,
                category: b.category,
                details: typeof b.details === 'string' ? b.details : JSON.stringify(b.details),
                status_history: typeof b.statusHistory === 'string' ? b.statusHistory : JSON.stringify(b.statusHistory),
                notes: b.notes,
              }], { onConflict: 'id' });
              if (retryError) {
                console.warn(`[mockBackend] ⚠️ Failed to sync booking ${b.id} to Supabase:`, retryError.message);
              } else {
                console.log(`[mockBackend] ✅ Synced booking ${b.id} to Supabase (core columns)`);
              }
            } else {
              console.log(`[mockBackend] ✅ Synced booking ${b.id} to Supabase`);
            }
          } catch (e) {
            console.warn(`[mockBackend] ⚠️ Error syncing booking ${b.id}:`, e);
          }
        }
      })().finally(() => {
        localOnlySyncInFlight = false;
      });
    } else if (localOnly.length > 0 && !supabaseFetchSucceeded) {
      console.log('[mockBackend] ⏭️ Skipping local-only sync because Supabase fetch was unavailable');
    }

    console.log(`[mockBackend] ✅ Total bookings: ${bookings.length} (Supabase: ${supabaseBookings.length}, SQLite: ${sqliteBookings.length})`);
    return [...bookings];
  },

  getDiscountCodes: async (
    options?: { includeInactive?: boolean; includeUnpublished?: boolean }
  ): Promise<DiscountCode[]> => {
    const includeInactive = Boolean(options?.includeInactive);
    const includeUnpublished = Boolean(options?.includeUnpublished);
    const api = getElectronAPI();

    if (api?.db) {
      try {
        const where: string[] = ['deletedAt IS NULL'];
        const params: unknown[] = [];

        if (!includeInactive) {
          where.push('isActive = 1');
        }
        if (!includeUnpublished) {
          where.push('isPublished = 1');
        }

        const rows = await api.db.query(
          `SELECT * FROM discount_codes WHERE ${where.join(' AND ')} ORDER BY createdAt DESC`,
          params
        );

        discountCodesCache = rows.map(parseDiscountCodeRow);
        return [...discountCodesCache];
      } catch (error) {
        console.warn('⚠️ Failed to load discount codes from SQLite, using cache:', error);
      }
    }

    return [...discountCodesCache].filter(code => {
      if (code.isActive === false && !includeInactive) return false;
      if (code.isPublished === false && !includeUnpublished) return false;
      return true;
    });
  },

  createDiscountCode: async (payload: {
    code: string;
    type: DiscountCodeType;
    value: number;
    startAt: string;
    endAt?: string | null;
    isPublished?: boolean;
    notes?: string;
  }): Promise<DiscountCode> => {
    const actor = ensureManagerRole();
    const api = getElectronAPI();
    const now = new Date().toISOString();

    const code = sanitizeDiscountCode(payload.code);
    if (!code || code.length < 3) {
      throw new Error('كود الخصم غير صالح');
    }

    const value = Number(payload.value || 0);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('قيمة الخصم يجب أن تكون أكبر من صفر');
    }
    if (payload.type === 'percentage' && value > 100) {
      throw new Error('نسبة الخصم يجب أن تكون 100 أو أقل');
    }

    const parsedStartAt = new Date(payload.startAt);
    if (Number.isNaN(parsedStartAt.getTime())) {
      throw new Error('وقت بداية الخصم غير صالح');
    }
    const startAt = parsedStartAt.toISOString();

    let endAt: string | undefined;
    if (payload.endAt) {
      const parsedEndAt = new Date(payload.endAt);
      if (Number.isNaN(parsedEndAt.getTime())) {
        throw new Error('وقت انتهاء الخصم غير صالح');
      }
      endAt = parsedEndAt.toISOString();
    }
    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      throw new Error('وقت انتهاء الخصم يجب أن يكون بعد وقت البدء');
    }

    const existsInCache = discountCodesCache.some(
      entry => entry.code === code && entry.isActive
    );
    if (existsInCache) {
      throw new Error('هذا الكود مستخدم مسبقًا');
    }

    const newCode: DiscountCode = {
      id: uuidv4(),
      code,
      type: payload.type,
      value,
      startAt,
      endAt,
      isActive: true,
      isPublished: Boolean(payload.isPublished),
      notes: payload.notes?.trim() || undefined,
      usageCount: 0,
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: now,
      updatedAt: now,
    };

    if (api?.db) {
      const duplicate = await api.db.query(
        'SELECT id FROM discount_codes WHERE code = ? AND deletedAt IS NULL',
        [code]
      );
      if (duplicate.length > 0) {
        throw new Error('هذا الكود مستخدم مسبقًا');
      }

      await api.db.run(
        `INSERT INTO discount_codes
        (id, code, type, value, startAt, endAt, isActive, isPublished, createdBy, createdByName, notes, usageCount, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          newCode.id,
          newCode.code,
          newCode.type,
          newCode.value,
          newCode.startAt,
          newCode.endAt || null,
          newCode.isActive ? 1 : 0,
          newCode.isPublished ? 1 : 0,
          newCode.createdBy,
          newCode.createdByName,
          newCode.notes || null,
          0,
          newCode.createdAt,
          newCode.updatedAt,
        ]
      );
    }

    discountCodesCache = [newCode, ...discountCodesCache];
    notifyListeners('discount_codes_updated');
    return newCode;
  },

  updateDiscountCode: async (
    id: string,
    updates: Partial<Pick<DiscountCode, 'code' | 'type' | 'value' | 'startAt' | 'endAt' | 'isPublished' | 'isActive' | 'notes'>>
  ): Promise<DiscountCode | null> => {
    ensureManagerRole();
    const api = getElectronAPI();

    const existingList = await electronBackend.getDiscountCodes({
      includeInactive: true,
      includeUnpublished: true,
    });
    const existing = existingList.find(item => item.id === id);
    if (!existing) return null;

    const nextCode = updates.code ? sanitizeDiscountCode(updates.code) : existing.code;
    const nextType = updates.type || existing.type;
    const nextValue = updates.value !== undefined ? Number(updates.value) : existing.value;
    let nextStart = existing.startAt;
    if (updates.startAt) {
      const parsedStart = new Date(updates.startAt);
      if (Number.isNaN(parsedStart.getTime())) {
        throw new Error('وقت بداية الخصم غير صالح');
      }
      nextStart = parsedStart.toISOString();
    }

    let nextEnd = existing.endAt;
    if (updates.endAt !== undefined) {
      if (!updates.endAt) {
        nextEnd = undefined;
      } else {
        const parsedEnd = new Date(updates.endAt);
        if (Number.isNaN(parsedEnd.getTime())) {
          throw new Error('وقت انتهاء الخصم غير صالح');
        }
        nextEnd = parsedEnd.toISOString();
      }
    }

    if (!nextCode || nextCode.length < 3) {
      throw new Error('كود الخصم غير صالح');
    }
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      throw new Error('قيمة الخصم يجب أن تكون أكبر من صفر');
    }
    if (nextType === 'percentage' && nextValue > 100) {
      throw new Error('نسبة الخصم يجب أن تكون 100 أو أقل');
    }
    if (nextEnd && new Date(nextEnd).getTime() <= new Date(nextStart).getTime()) {
      throw new Error('وقت انتهاء الخصم يجب أن يكون بعد وقت البدء');
    }

    if (api?.db) {
      const duplicate = await api.db.query(
        'SELECT id FROM discount_codes WHERE code = ? AND id != ? AND deletedAt IS NULL',
        [nextCode, id]
      );
      if (duplicate.length > 0) {
        throw new Error('هذا الكود مستخدم مسبقًا');
      }

      await api.db.run(
        `UPDATE discount_codes
        SET code = ?, type = ?, value = ?, startAt = ?, endAt = ?, isActive = ?, isPublished = ?, notes = ?, updatedAt = ?
        WHERE id = ?`,
        [
          nextCode,
          nextType,
          nextValue,
          nextStart,
          nextEnd || null,
          updates.isActive === undefined ? (existing.isActive ? 1 : 0) : updates.isActive ? 1 : 0,
          updates.isPublished === undefined ? (existing.isPublished ? 1 : 0) : updates.isPublished ? 1 : 0,
          updates.notes === undefined ? existing.notes || null : updates.notes || null,
          new Date().toISOString(),
          id,
        ]
      );
    }

    const updated: DiscountCode = {
      ...existing,
      code: nextCode,
      type: nextType,
      value: nextValue,
      startAt: nextStart,
      endAt: nextEnd,
      isActive: updates.isActive === undefined ? existing.isActive : updates.isActive,
      isPublished: updates.isPublished === undefined ? existing.isPublished : updates.isPublished,
      notes: updates.notes === undefined ? existing.notes : updates.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    discountCodesCache = discountCodesCache.map(code => (code.id === id ? updated : code));
    notifyListeners('discount_codes_updated');
    return updated;
  },

  deactivateDiscountCode: async (id: string): Promise<void> => {
    await electronBackend.updateDiscountCode(id, { isActive: false, isPublished: false });
  },

  validateDiscountCode: async (
    code: string,
    subtotalAmount: number
  ): Promise<DiscountValidationResult> => {
    const normalizedCode = sanitizeDiscountCode(code);
    if (!normalizedCode) {
      return { valid: false, message: 'أدخل كود الخصم' };
    }

    const subtotal = Math.max(0, Number(subtotalAmount || 0));
    if (subtotal <= 0) {
      return { valid: false, message: 'المبلغ غير صالح لتطبيق الخصم' };
    }

    const activeCodes = await electronBackend.getDiscountCodes({
      includeInactive: false,
      includeUnpublished: false,
    });
    const target = activeCodes.find(item => item.code === normalizedCode);

    if (!target) {
      return { valid: false, message: 'كود الخصم غير موجود أو غير منشور' };
    }

    const now = new Date().getTime();
    const startAt = new Date(target.startAt).getTime();
    if (Number.isFinite(startAt) && now < startAt) {
      return {
        valid: false,
        message: `الخصم يبدأ ${toIsoMinute(target.startAt) || target.startAt}`,
      };
    }

    if (target.endAt) {
      const endAt = new Date(target.endAt).getTime();
      if (Number.isFinite(endAt) && now > endAt) {
        return { valid: false, message: 'انتهت صلاحية كود الخصم' };
      }
    }

    const discountAmount = computeDiscountAmount(target.type, target.value, subtotal);
    const finalAmount = Math.max(0, subtotal - discountAmount);

    if (discountAmount <= 0) {
      return { valid: false, message: 'تعذر تطبيق الخصم على هذا المبلغ' };
    }

    return {
      valid: true,
      message: 'تم تطبيق الكود بنجاح',
      discount: {
        codeId: target.id,
        code: target.code,
        type: target.type,
        value: target.value,
        subtotalAmount: subtotal,
        discountAmount,
        finalAmount,
        startAt: target.startAt,
        endAt: target.endAt,
      },
    };
  },

  addBooking: async (booking: Omit<Booking, 'id'> & { id?: string }): Promise<Booking> => {
    const clientToken = booking.client_token || `vh-${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const newBooking: Booking = { 
      ...booking, 
      id: booking.id || uuidv4(),
      client_token: clientToken,
    } as Booking;

    const bookingDetails = (newBooking.details || {}) as Booking['details'];
    const incomingDiscount = bookingDetails?.discount as AppliedDiscount | undefined;

    if (incomingDiscount?.code) {
      const validation = await electronBackend.validateDiscountCode(
        incomingDiscount.code,
        Number(incomingDiscount.subtotalAmount || newBooking.totalAmount)
      );

      if (!validation.valid || !validation.discount) {
        const restoredTotal = Number(incomingDiscount.subtotalAmount || newBooking.totalAmount || 0);
        newBooking.totalAmount = Math.max(0, restoredTotal);
        newBooking.details = { ...bookingDetails, discount: undefined };
      } else {
        const actor = getCurrentActor();
        const appliedDiscount: AppliedDiscount = {
          codeId: validation.discount.codeId,
          code: validation.discount.code,
          type: validation.discount.type,
          value: validation.discount.value,
          reason: incomingDiscount.reason || '',
          subtotalAmount: validation.discount.subtotalAmount,
          discountAmount: validation.discount.discountAmount,
          finalAmount: validation.discount.finalAmount,
          appliedAt: new Date().toISOString(),
          appliedBy: actor.id,
          appliedByName: actor.name,
        };

        newBooking.totalAmount = appliedDiscount.finalAmount;
        newBooking.details = { ...bookingDetails, discount: appliedDiscount };
      }
    }

    if (newBooking.paidAmount > newBooking.totalAmount) {
      newBooking.paidAmount = newBooking.totalAmount;
    }
    
    // Save to Supabase (with timeout, skip if offline)
    if (isOnline()) {
      try {
        let fullSchemaError: unknown = null;

        if (!fullSchemaSyncUnsupportedGlobally) {
          const { error } = await withTimeout(
            supabase.from('bookings').insert([{
              id: newBooking.id,
              client_name: newBooking.clientName,
              shoot_date: newBooking.shootDate,
              title: newBooking.title,
              status: newBooking.status,
              total_amount: newBooking.totalAmount,
              paid_amount: newBooking.paidAmount,
              currency: newBooking.currency,
              exchange_rate: newBooking.exchangeRate || null,
              service_package: newBooking.servicePackage,
              location: newBooking.location,
              client_id: newBooking.clientId,
              phone: newBooking.clientPhone,
              category: newBooking.category,
              details: JSON.stringify(newBooking.details),
              status_history: JSON.stringify(newBooking.statusHistory),
              notes: newBooking.notes,
              is_priority: newBooking.isPriority ? 1 : 0,
              is_crew_shooting: newBooking.isCrewShooting ? 1 : 0,
              client_token: newBooking.client_token,
            }]),
            5000
          );
          if (error) fullSchemaError = error;
        } else {
          fullSchemaError = new Error('full schema disabled globally');
        }

        if (fullSchemaError) {
          if (isSupabaseSchemaMismatch(fullSchemaError)) {
            fullSchemaSyncUnsupportedGlobally = true;
          }

          const errorMessage = fullSchemaError instanceof Error ? fullSchemaError.message : String(fullSchemaError);
          console.warn('⚠️ Failed to save booking to Supabase (full schema), trying core columns...', errorMessage);

          const { error: retryError } = await withTimeout(
            supabase.from('bookings').insert([{
              id: newBooking.id,
              client_name: newBooking.clientName,
              shoot_date: newBooking.shootDate,
              title: newBooking.title,
              status: newBooking.status,
              total_amount: newBooking.totalAmount,
              paid_amount: newBooking.paidAmount,
              currency: newBooking.currency,
              service_package: newBooking.servicePackage,
              location: newBooking.location,
              client_id: newBooking.clientId,
              category: newBooking.category,
              details: JSON.stringify(newBooking.details),
              status_history: JSON.stringify(newBooking.statusHistory),
              notes: newBooking.notes,
              client_token: newBooking.client_token,
            }]),
            5000
          );
          if (retryError) throw retryError;
          console.log('✅ Booking saved to Supabase (core columns)');
        } else {
          console.log('✅ Booking saved to Supabase');
        }
      } catch (e2) {
        console.warn('⚠️ Failed to save booking to Supabase entirely (will sync later):', e2);
      }
    } else {
      console.log('📴 Offline — booking will be saved locally and synced later');
    }

    // Also save to local SQLite for persistence
    const api = getElectronAPI();
    if (api?.db) {
      try {
        // Try insert with all columns (new schema)
        await api.db.run(
          `INSERT OR REPLACE INTO bookings (id, clientName, clientPhone, clientId, category, title, shootDate, status, totalAmount, paidAmount, currency, exchangeRate, servicePackage, location, details, statusHistory, notes, createdBy, isPriority, isCrewShooting, client_token)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newBooking.id,
            newBooking.clientName,
            newBooking.clientPhone,
            newBooking.clientId,
            newBooking.category,
            newBooking.title,
            newBooking.shootDate,
            newBooking.status,
            newBooking.totalAmount,
            newBooking.paidAmount,
            newBooking.currency,
            newBooking.exchangeRate || null,
            newBooking.servicePackage,
            newBooking.location,
            JSON.stringify(newBooking.details),
            JSON.stringify(newBooking.statusHistory),
            newBooking.notes || '',
            newBooking.created_by || '',
            newBooking.isPriority ? 1 : 0,
            newBooking.isCrewShooting ? 1 : 0,
            newBooking.client_token || null,
          ]
        );
        console.log('✅ Booking saved to SQLite');
      } catch (e: unknown) {
        const sqliteError = e instanceof Error ? e.message : String(e);
        // If exchangeRate column doesn't exist, try without it (legacy schema)
        if (sqliteError.includes('no column named exchangeRate')) {
          try {
            await api.db.run(
              `INSERT OR REPLACE INTO bookings (id, clientName, clientPhone, clientId, category, title, shootDate, status, totalAmount, paidAmount, currency, servicePackage, location, details, statusHistory, notes, createdBy, isPriority, isCrewShooting, client_token)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newBooking.id,
                newBooking.clientName,
                newBooking.clientPhone,
                newBooking.clientId,
                newBooking.category,
                newBooking.title,
                newBooking.shootDate,
                newBooking.status,
                newBooking.totalAmount,
                newBooking.paidAmount,
                newBooking.currency,
                newBooking.servicePackage,
                newBooking.location,
                JSON.stringify(newBooking.details),
                JSON.stringify(newBooking.statusHistory),
                newBooking.notes || '',
                newBooking.created_by || '',
                newBooking.isPriority ? 1 : 0,
                newBooking.isCrewShooting ? 1 : 0,
                newBooking.client_token || null,
              ]
            );
            console.log('✅ Booking saved to SQLite (legacy schema)');
          } catch (e2) {
            console.warn('⚠️ Failed to save booking to SQLite:', e2);
          }
        } else {
          console.warn('⚠️ Failed to save booking to SQLite:', e);
        }
      }
    }

    bookings.push(newBooking);

    if (newBooking.details?.discount) {
      await persistDiscountRedemption(newBooking.id, newBooking.details.discount);
      notifyListeners('discount_codes_updated');
    }

    notifyListeners('bookings_updated');
    return newBooking;
  },

  updateBooking: async (id: string, updates: Partial<Booking>): Promise<Booking | undefined> => {
    try {
      // Build Supabase update object (convert camelCase to snake_case)
      const supabaseUpdates: Record<string, unknown> = {};
      if (updates.clientName !== undefined) supabaseUpdates.client_name = updates.clientName;
      if (updates.shootDate !== undefined) supabaseUpdates.shoot_date = updates.shootDate;
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.totalAmount !== undefined) supabaseUpdates.total_amount = updates.totalAmount;
      if (updates.paidAmount !== undefined) supabaseUpdates.paid_amount = updates.paidAmount;
      if (updates.currency !== undefined) supabaseUpdates.currency = updates.currency;
      if (updates.servicePackage !== undefined) supabaseUpdates.service_package = updates.servicePackage;
      if (updates.location !== undefined) supabaseUpdates.location = updates.location;
      if (updates.clientId !== undefined) supabaseUpdates.client_id = updates.clientId;
      if (updates.clientPhone !== undefined) supabaseUpdates.phone = updates.clientPhone;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.client_token !== undefined) supabaseUpdates.client_token = updates.client_token;
      // Safe JSON serialization helper
      const safeStringify = (obj: unknown): string => {
        try {
          // Remove any circular references and non-serializable objects
          return JSON.stringify(obj, (key, value) => {
            // Skip window, document, and other browser objects
            if (value === window || value === document || value instanceof Node) {
              return undefined;
            }
            // Skip functions
            if (typeof value === 'function') {
              return undefined;
            }
            return value;
          });
        } catch (e) {
          console.warn('Failed to stringify object:', e);
          return JSON.stringify({});
        }
      };
      
      if (updates.details !== undefined) supabaseUpdates.details = safeStringify(updates.details);
      if (updates.statusHistory !== undefined) supabaseUpdates.status_history = safeStringify(updates.statusHistory);
      if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
      if (updates.isPriority !== undefined) supabaseUpdates.is_priority = updates.isPriority ? 1 : 0;
      if (updates.isCrewShooting !== undefined) supabaseUpdates.is_crew_shooting = updates.isCrewShooting ? 1 : 0;
      if (updates.isFamous !== undefined) supabaseUpdates.is_famous = updates.isFamous ? 1 : 0;
      if (updates.exchangeRate !== undefined) supabaseUpdates.exchange_rate = updates.exchangeRate;

      if (isOnline()) {
        const { error } = await withTimeout(
          supabase.from('bookings').update(supabaseUpdates).eq('id', id),
          5000
        );
        if (error) throw error;
        console.log('✅ Booking updated in Supabase');
      } else {
        console.log('📴 Offline — booking update saved locally, will sync later');
      }
    } catch (e) {
      console.warn('⚠️ Failed to update booking in Supabase (will sync later):', e);
    }

    bookings = bookings.map(b => (b.id === id ? { ...b, ...updates } : b));

    // Also update in local SQLite
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const sqliteUpdates: string[] = [];
        const sqliteValues: unknown[] = [];

        if (updates.clientName !== undefined) { sqliteUpdates.push('clientName = ?'); sqliteValues.push(updates.clientName); }
        if (updates.shootDate !== undefined) { sqliteUpdates.push('shootDate = ?'); sqliteValues.push(updates.shootDate); }
        if (updates.title !== undefined) { sqliteUpdates.push('title = ?'); sqliteValues.push(updates.title); }
        if (updates.status !== undefined) { sqliteUpdates.push('status = ?'); sqliteValues.push(updates.status); }
        if (updates.totalAmount !== undefined) { sqliteUpdates.push('totalAmount = ?'); sqliteValues.push(updates.totalAmount); }
        if (updates.paidAmount !== undefined) { sqliteUpdates.push('paidAmount = ?'); sqliteValues.push(updates.paidAmount); }
        if (updates.currency !== undefined) { sqliteUpdates.push('currency = ?'); sqliteValues.push(updates.currency); }
        if (updates.category !== undefined) { sqliteUpdates.push('category = ?'); sqliteValues.push(updates.category); }
        if (updates.notes !== undefined) { sqliteUpdates.push('notes = ?'); sqliteValues.push(updates.notes); }
        if (updates.client_token !== undefined) { sqliteUpdates.push('client_token = ?'); sqliteValues.push(updates.client_token); }
        if (updates.details !== undefined) { sqliteUpdates.push('details = ?'); sqliteValues.push(JSON.stringify(updates.details)); }
        if (updates.statusHistory !== undefined) { sqliteUpdates.push('statusHistory = ?'); sqliteValues.push(JSON.stringify(updates.statusHistory)); }

        if (sqliteUpdates.length > 0) {
          sqliteValues.push(id);
          await api.db.run(`UPDATE bookings SET ${sqliteUpdates.join(', ')} WHERE id = ?`, sqliteValues);
        }
      } catch (e) {
        console.warn('⚠️ Failed to update booking in SQLite:', e);
      }
    }

    notifyListeners('bookings_updated');
    
    // ✅ AUTO-COMPLETE: Check and complete related tasks automatically
    const updatedBooking = bookings.find(b => b.id === id);
    if (updatedBooking) {
      // Run auto-complete in background (don't await to avoid blocking)
      electronBackend.autoCompleteTasksForBooking(id, updatedBooking).catch(err => {
        console.error('Auto-complete tasks error:', err);
      });
    }
    
    return updatedBooking;
  },

  softDeleteBooking: async (id: string): Promise<void> => {
    const deletedAt = Date.now();

    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase.from('bookings').update({ deleted_at: new Date().toISOString() }).eq('id', id),
          5000
        );
        if (error) throw error;
        console.log('✅ Booking soft-deleted in Supabase');
      } catch (e) {
        console.warn('Failed to soft delete booking in Supabase (will sync later):', e);
      }
    }

    // 2. Persist soft-delete locally to prevent re-sync resurrection
    const api = getElectronAPI();
    if (api?.db) {
      try {
        await api.db.run('UPDATE bookings SET deletedAt = ? WHERE id = ?', [deletedAt, id]);
      } catch (e) {
        console.warn('⚠️ Failed to soft-delete booking in SQLite:', e);
      }
    }

    // 3. Update in-memory cache (mark as deleted)
    bookings = bookings.map(b => b.id === id ? { ...b, deletedAt } : b);
    notifyListeners('bookings_updated');
  },

  restoreBooking: async (id: string): Promise<void> => {
    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase.from('bookings').update({ deleted_at: null }).eq('id', id),
          5000
        );
        if (error) throw error;
        console.log('✅ Booking restored in Supabase');
      } catch (e) {
        console.warn('Failed to restore booking in Supabase (will sync later):', e);
      }
    }

    // 2. Restore in local SQLite
    const api = getElectronAPI();
    if (api?.db) {
      try {
        await api.db.run('UPDATE bookings SET deletedAt = NULL WHERE id = ?', [id]);
      } catch (e) {
        console.warn('⚠️ Failed to restore booking in SQLite:', e);
      }
    }

    // 3. Restore in local cache
    bookings = bookings.map(b => b.id === id ? { ...b, deletedAt: undefined } : b);
    notifyListeners('bookings_updated');
  },

  getDeletedBookings: async (): Promise<Booking[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const rows = await api.db.query(
          'SELECT * FROM bookings WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
        );
        return rows.map(parseBookingRow);
      } catch (e) {
        console.error('Failed to get deleted bookings:', e);
      }
    }
    // Fallback to memory
    return bookings.filter(b => b.deletedAt);
  },

  permanentDeleteBooking: async (id: string): Promise<void> => {
    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase.from('bookings').delete().eq('id', id),
          5000
        );
        if (error) throw error;
        console.log('✅ Booking permanently deleted from Supabase');
      } catch (e) {
        console.warn('Failed to permanently delete booking from Supabase (will sync later):', e);
      }
    }

    // 2. Remove from local SQLite
    const api = getElectronAPI();
    if (api?.db) {
      try {
        await api.db.run('DELETE FROM bookings WHERE id = ?', [id]);
      } catch (e) {
        console.warn('⚠️ Failed to permanently delete booking from SQLite:', e);
      }
    }

    // 3. Remove from local cache
    bookings = bookings.filter(b => b.id !== id);
    notifyListeners('bookings_updated');
  },

  // Legacy method - redirects to soft delete
  deleteBooking: async (id: string): Promise<void> => {
    return electronBackend.softDeleteBooking(id);
  },

  updateBookingStatus: async (id: string, status: Booking['status']): Promise<Booking | undefined> => {
    return electronBackend.updateBooking(id, { status });
  },

  settlePayment: async (id: string): Promise<Booking | undefined> => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      return electronBackend.updateBooking(id, { paidAmount: booking.totalAmount });
    }
    return undefined;
  },

  // ========== TASKS & REMINDERS (Typed) ==========
  // ========== TASKS (Persisted via ElectronAPI) ==========
  getDashboardTasks: async (): Promise<DashboardTask[]> => {
    console.log('[mockBackend] 📋 getDashboardTasks called');
    const api = getElectronAPI();
    if (api?.db) {
      try {
        console.log('[mockBackend] 📋 Fetching tasks from database...');
        // Fetch all tasks and filter in JS to handle Timezones correctly for the "Midnight Rule"
        const allTasks = await api.db.query("SELECT * FROM dashboard_tasks WHERE deletedAt IS NULL");
        console.log(`[mockBackend] 📋 Fetched ${allTasks.length} tasks`);
        
        const today = new Date().toDateString(); // "Mon Jan 19 2026"
        
        tasks = allTasks.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            title: String(row.title),
            time: String(row.time || ''),
            completed: Boolean(row.completed),
            type: (row.type || 'general') as ReminderType,
            source: (row.source || 'manual') as 'system' | 'manual' | 'supervisor',
            relatedBookingId: row.relatedBookingId ? String(row.relatedBookingId) : undefined,
            priority: (row.priority || 'normal') as 'normal' | 'high' | 'urgent',
            createdAt: row.createdAt ? String(row.createdAt) : undefined,
        })).filter(t => {
            // Rule: Show if NOT completed OR (Completed AND Created/Completed Today)
            // Ideally we track 'completedAt', but we only have 'createdAt' based on schema.
            // If it's a daily task, valid for today.
            if (!t.completed) return true;
            
            // If completed, only show if created today
             if (t.createdAt) {
                const taskDate = new Date(t.createdAt).toDateString();
                return taskDate === today;
            }
            return false; // Completed legacy tasks with no date -> hide
        });

        console.log(`[mockBackend] 📋 Returning ${tasks.length} filtered tasks`);
        return tasks;
      } catch (e) {
        console.error('[mockBackend] ❌ IPC getDashboardTasks failed:', e);
        return [];
      }
    }
    // Web/Dev Fallback
    console.log('[mockBackend] 📋 No Electron API, returning cached tasks');
    return [...tasks];
  },

  addTask: async (title: string, type: ReminderType = 'general', source: 'manual' | 'system' = 'manual', priority: 'normal' | 'high' | 'urgent' = 'normal', relatedBookingId?: string, customId?: string, scheduledTime?: string): Promise<DashboardTask> => {
     const api = getElectronAPI();
     if (api?.db) {
         try {
             // ✅ FIX: Check if task already exists first
             if (customId) {
                const existing = await api.db.query('SELECT * FROM dashboard_tasks WHERE id = ? AND deletedAt IS NULL', [customId]);
                if (existing && existing.length > 0) {
                    // Return actual existing task from database
                    const existingTask = existing[0];
                    if (existingTask) {
                      return {
                          id: String(existingTask.id),
                          title: String(existingTask.title),
                          time: String(existingTask.time || ''),
                          completed: Boolean(existingTask.completed),
                          type: (existingTask.type || 'general') as ReminderType,
                          source: (existingTask.source || 'manual') as 'system' | 'manual' | 'supervisor',
                          relatedBookingId: existingTask.relatedBookingId ? String(existingTask.relatedBookingId) : undefined,
                          priority: (existingTask.priority || 'normal') as 'normal' | 'high' | 'urgent',
                          createdAt: existingTask.createdAt ? String(existingTask.createdAt) : new Date().toISOString()
                      };
                    }
                }
             }

             // Create new task only if it doesn't exist
             const newTask: DashboardTask = {
                 id: customId || uuidv4(),
                 title,
                 time: scheduledTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                 completed: false,
                 type,
                 source,
                 priority,
                 relatedBookingId,
                 createdAt: new Date().toISOString()
             };

             await api.db.run(
                 'INSERT INTO dashboard_tasks (id, title, time, completed, type, source, priority, relatedBookingId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                 [newTask.id, newTask.title, newTask.time, 0, newTask.type, newTask.source, newTask.priority, newTask.relatedBookingId, newTask.createdAt]
             );
             notifyListeners('tasks_updated');
             return newTask;
         } catch (e) {
             console.error('IPC addTask failed:', e);
             // Return a placeholder task to avoid breaking the UI
             return {
                 id: customId || uuidv4(),
                 title,
                 time: scheduledTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                 completed: false,
                 type,
                 source,
                 priority,
                 relatedBookingId,
                 createdAt: new Date().toISOString()
             };
         }
     } else {
         // In-memory fallback
         const newTask: DashboardTask = {
             id: customId || uuidv4(),
             title,
             time: scheduledTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
             completed: false,
             type,
             source,
             priority,
             relatedBookingId,
             createdAt: new Date().toISOString()
         };
         
         // Check if exists in memory
         const existingIndex = tasks.findIndex(t => t.id === newTask.id);
         if (existingIndex !== -1) {
             const existingTask = tasks[existingIndex];
             if (existingTask) {
               return existingTask;
             }
         }
         
         tasks.push(newTask);
         notifyListeners('tasks_updated');
         return newTask;
     }
  },

  toggleTask: async (id: string): Promise<void> => {
    const api = getElectronAPI();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1 && !api?.db) return; // Not found in memory and no DB?

    // Optimistic update for UI if we have it in memory
    if (taskIndex > -1) {
        const task = tasks[taskIndex];
        if (task) {
          task.completed = !task.completed;
          notifyListeners('tasks_updated');
        }
    }

    if (api?.db) {
        try {
            // We need to know current state to toggle, or just set it. 
            // Better to fetch or depend on the optimistic state if reliable.
            // Let's fetch current status to be safe or flip it in SQL.
            // SQL: UPDATE dashboard_tasks SET completed = NOT completed WHERE id = ?
             await api.db.run('UPDATE dashboard_tasks SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
             notifyListeners('tasks_updated');
        } catch (e) {
            console.error('IPC toggleTask failed:', e);
        }
    }
  },

  deleteTask: async (id: string): Promise<void> => {
      const api = getElectronAPI();
      if (api?.db) {
          try {
              await api.db.run('UPDATE dashboard_tasks SET deletedAt = ? WHERE id = ?', [Date.now(), id]);
              notifyListeners('tasks_updated');
          } catch (e) {
              console.error('IPC deleteTask failed:', e);
          }
      }
      
      tasks = tasks.filter(t => t.id !== id);
      notifyListeners('tasks_updated');
  },

  // ✅ AUTO-COMPLETE TASKS: Automatically complete tasks based on booking changes
  autoCompleteTasksForBooking: async (bookingId: string, booking?: Booking): Promise<void> => {
    try {
      // Get the booking if not provided
      const currentBooking = booking || bookings.find(b => b.id === bookingId);
      if (!currentBooking) {
        console.warn('autoCompleteTasksForBooking: Booking not found:', bookingId);
        return;
      }

      // Get all tasks from database to ensure we have the latest state
      const allTasks = await electronBackend.getDashboardTasks();
      const relatedTasks = allTasks.filter(t => t.relatedBookingId === bookingId);

      if (relatedTasks.length === 0) {
        // No tasks to auto-complete
        return;
      }

      // Rule 1: Auto-complete reception task when status becomes SHOOTING
      if (currentBooking.status === BookingStatus.SHOOTING) {
        const receptionTaskId = `reception-${bookingId}`;
        const receptionTask = relatedTasks.find(t => t.id === receptionTaskId);
        
        if (receptionTask && !receptionTask.completed) {
          console.log('✅ Auto-completing reception task:', receptionTaskId);
          await electronBackend.toggleTask(receptionTaskId);
        }
      }

      // Rule 2: Auto-complete payment task when fully paid
      if (currentBooking.paidAmount >= currentBooking.totalAmount) {
        const paymentTaskId = `payment-verify-${bookingId}`;
        const paymentTask = relatedTasks.find(t => t.id === paymentTaskId);
        
        if (paymentTask && !paymentTask.completed) {
          console.log('✅ Auto-completing payment task:', paymentTaskId);
          await electronBackend.toggleTask(paymentTaskId);
        }
      }

      console.log('✅ Auto-complete tasks check completed for booking:', bookingId);
    } catch (error) {
      console.error('Error in autoCompleteTasksForBooking:', error);
    }
  },

  getReminders: async (bookingId: string): Promise<Reminder[]> => {
    return reminders.filter(r => r.bookingId === bookingId);
  },

  addReminder: async (
    bookingId: string,
    title: string,
    dueDate: string,
    type: ReminderType,
    customIcon?: string
  ): Promise<Reminder> => {
    const newReminder: Reminder = {
      id: uuidv4(),
      bookingId,
      title,
      dueDate,
      type,
      customIcon,
      completed: false,
    };
    reminders.push(newReminder);
    notifyListeners('reminders_updated');
    return newReminder;
  },

  updateReminder: async (id: string, updates: Partial<Reminder>): Promise<void> => {
    reminders = reminders.map(r => (r.id === id ? { ...r, ...updates } : r));
    notifyListeners('reminders_updated');
  },

  deleteReminder: async (id: string): Promise<void> => {
    reminders = reminders.filter(r => r.id !== id);
    notifyListeners('reminders_updated');
  },

  toggleReminder: async (id: string): Promise<void> => {
    reminders = reminders.map(r => (r.id === id ? { ...r, completed: !r.completed } : r));
    notifyListeners('reminders_updated');
  },

  // ========== EXPENSES (Supabase + Queue) ==========
  getExpenses: async (): Promise<Expense[]> => {
    try {
      // 1. Fetch from Supabase
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) {
        console.warn('Failed to fetch expenses from Supabase, using cache:', error);
        return [...expenses];
      }

      // 2. Map Supabase Data
      const fetchedExpenses = (data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title),
        amount: Number(r.amount),
        currency: (r.currency || 'IQD') as Expense['currency'],
        category: (r.category || 'other') as Expense['category'],
        date: String(r.date),
        note: r.note as string | undefined,
        isRecurring: r.is_recurring as boolean | undefined,
        exchangeRate: r.exchange_rate as number | undefined, // ✅ Historical Rate
      }));

      // 3. Process Local Queue (Retry Failed Uploads)
      const pendingExpenses = JSON.parse(localStorage.getItem('pending_expenses') || '[]') as Expense[];
      const remainingPending: Expense[] = [];

      for (const pending of pendingExpenses) {
        try {
            console.log('🔄 Retrying pending expense upload:', pending.title);
            // Try inserting again
            const { error: retryError } = await supabase.from('expenses').insert([{
                id: pending.id,
                title: pending.title,
                amount: pending.amount,
                currency: pending.currency,
                category: pending.category,
                date: pending.date,
                note: pending.note,
                is_recurring: pending.isRecurring || false,
                exchange_rate: pending.exchangeRate || 1400,
            }]);

            if (retryError) {
                 // Check if it's the specific "column missing" error
                 if (retryError.message && retryError.message.includes('column "exchange_rate" does not exist')) {
                     // Retry without exchange_rate
                     await supabase.from('expenses').insert([{
                        id: pending.id,
                        title: pending.title,
                        amount: pending.amount,
                        currency: pending.currency,
                        category: pending.category,
                        date: pending.date,
                        note: pending.note,
                        is_recurring: pending.isRecurring || false
                     }]);
                     // If this succeeds, we consider it done
                 } else {
                     throw retryError; // Valid error, keep in queue
                 }
            }
            console.log('✅ Pending expense synced!');
        } catch (err) {
            console.warn('❌ Retry failed, keeping in queue:', err);
            remainingPending.push(pending);
        }
      }

      // Update Queue
      localStorage.setItem('pending_expenses', JSON.stringify(remainingPending));

      // 4. Merge (Supabase + Remaining Pending)
      // Filter out any pending items that might have actually been fetched (deduplication)
      const pendingIds = new Set(remainingPending.map(p => p.id));
      const uniqueFetched = fetchedExpenses.filter(e => !pendingIds.has(e.id));
      
      expenses = [...remainingPending, ...uniqueFetched];
      
      console.log(`✅ Loaded ${expenses.length} expenses (Supabase + Local Queue)`);
      return [...expenses];

    } catch (e) {
      console.error('getExpenses error:', e);
      return [...expenses];
    }
  },

  addExpense: async (expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> => {
    const newExpense: Expense = { 
      ...expense, 
      id: expense.id || uuidv4() 
    } as Expense;
    
    try {
      const { error } = await supabase.from('expenses').insert([{
        id: newExpense.id,
        title: newExpense.title,
        amount: newExpense.amount,
        currency: newExpense.currency,
        category: newExpense.category,
        date: newExpense.date,
        note: newExpense.note,
        is_recurring: newExpense.isRecurring || false,
        exchange_rate: newExpense.exchangeRate || 1400, // ✅ Try saving with rate
      }]);
      
      if (error) {
           // If column missing, try fallback immediately
           if (error.message && error.message.includes('column "exchange_rate" does not exist')) {
                console.warn('⚠️ Exchange rate column missing, retrying without it...');
                 const { error: fallbackError } = await supabase.from('expenses').insert([{
                    id: newExpense.id,
                    title: newExpense.title,
                    amount: newExpense.amount,
                    currency: newExpense.currency,
                    category: newExpense.category,
                    date: newExpense.date,
                    note: newExpense.note,
                    is_recurring: newExpense.isRecurring || false,
                }]);
                if (fallbackError) throw fallbackError; // If this fails, go to queue
           } else {
               throw error; // Other error, go to queue
           }
      }
      console.log('✅ Expense saved to Supabase');
    } catch (e) {
      console.warn('Failed to save expense to Supabase, saving to local queue:', e);
      // ✅ Add to Local Queue
      const pending = JSON.parse(localStorage.getItem('pending_expenses') || '[]');
      pending.push(newExpense);
      localStorage.setItem('pending_expenses', JSON.stringify(pending));
      toast.success('تم الحفظ محلياً (سيتم الرفع تلقائياً)');
    }
    
    expenses.unshift(newExpense); // Add to top
    notifyListeners('expenses_updated');
    return newExpense;
  },

  deleteExpense: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      console.log('✅ Expense soft-deleted in Supabase');
    } catch (e) {
      console.warn('Failed to delete expense in Supabase:', e);
    }

    expenses = expenses.filter(e => e.id !== id);
    // Remove from pending if exists
    const pending = JSON.parse(localStorage.getItem('pending_expenses') || '[]');
    const newPending = pending.filter((p: Expense) => p.id !== id);
    localStorage.setItem('pending_expenses', JSON.stringify(newPending));

    notifyListeners('expenses_updated');
  },

  // ========== RECURRING EXPENSES (Supabase + Fallback) ==========
  getRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('is_active', true)
        .order('day_of_month', { ascending: true });

      if (error) {
        console.warn('recurring_expenses fetch failed:', error);
        return [...recurringExpenses];
      }

      recurringExpenses = (data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        title: String(r.title),
        amount: Number(r.amount),
        currency: (r.currency as RecurringExpense['currency']) || 'IQD',
        category: (r.category as RecurringExpense['category']) || 'other',
        dayOfMonth: Number(r.day_of_month) || 1,
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at),
        exchangeRate: r.exchange_rate as number | undefined,
      }));
      
      return [...recurringExpenses];
    } catch {
      return [...recurringExpenses];
    }
  },

  // ========== INVENTORY & EQUIPMENT (🌑 BLACK'S REAL DB BRIDGE) ==========
  // ========== ADMIN INTELLIGENCE (🌑 BLACK'S ENGINEERED ANALYTICS) ==========
  
  /**
   * 🌑 REAL-TIME SUPERVISOR ANALYTICS
   * Aggregates live data for the Admin Dashboard from real tables.
   */
  getAdminStats: async () => {
    const api = getElectronAPI();
    if (!api?.db) return null;

    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. REAL CASHFLOW (The Vault)
      const paymentsToday = await api.db.query(
        "SELECT SUM(amount) as total FROM payments WHERE date LIKE ? AND deletedAt IS NULL",
        [`${today}%`]
      );
      const depositsToday = await api.db.query(
        "SELECT SUM(amount) as total FROM payments WHERE date LIKE ? AND type = 'deposit' AND deletedAt IS NULL",
        [`${today}%`]
      );
      // Finals = non-deposit payments today (final payments / settlements)
      const finalsToday = await api.db.query(
        "SELECT SUM(amount) as total FROM payments WHERE date LIKE ? AND (type != 'deposit' OR type IS NULL) AND deletedAt IS NULL",
        [`${today}%`]
      );

      const totalBookingsValue = await api.db.query("SELECT SUM(totalAmount) as total FROM bookings WHERE deletedAt IS NULL");
      const totalPaidValue = await api.db.query("SELECT SUM(paidAmount) as total FROM bookings WHERE deletedAt IS NULL");

      // 2. STAFF PERFORMANCE (The Sentinel)
      // Count completions per user from activity_logs or booking updates
      const staffPerformance = await api.db.query(`
        SELECT u.name, u.role, 
        (SELECT COUNT(*) FROM bookings b WHERE b.assignedPhotoEditor = u.id AND b.status = 'Ready to Print') as photoCompletions,
        (SELECT COUNT(*) FROM bookings b WHERE b.assignedShooter = u.id AND b.status = 'Shooting Completed') as shootCompletions
        FROM users u WHERE u.deletedAt IS NULL
      `);

      // 3. VENUE OCCUPANCY (The Matrix)
      const venueBookings = await api.db.query(
        "SELECT location, shootDate, details FROM bookings WHERE shootDate LIKE ? AND deletedAt IS NULL",
        [`${today}%`]
      );

      return {
        vault: {
          totalInDrawer: Number(paymentsToday[0]?.total || 0),
          deposits: Number(depositsToday[0]?.total || 0),
          finals: Number(finalsToday[0]?.total || 0),
          outstanding: Number(totalBookingsValue[0]?.total || 0) - Number(totalPaidValue[0]?.total || 0)
        },
        performance: staffPerformance.map((p: Record<string, unknown>) => ({
           name: p.name,
           role: p.role,
           score: Number(p.photoCompletions || 0) + Number(p.shootCompletions || 0)
        })),
        venues: venueBookings.map((b: Record<string, unknown>) => {
           const details = safeJsonParseMB(b.details, {}) as Record<string, unknown>;
           return {
              location: String(b.location || ''),
              start: String(details.startTime || ''),
              end: String(details.endTime || ''),
              client: String(b.clientName || '')
           };
        })
      };
    } catch (e) {
      console.error('Failed to aggregate Admin Stats:', e);
      return null;
    }
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const rows = await api.db.query('SELECT * FROM inventory ORDER BY type ASC, name ASC');
        return rows.map(r => ({
          id: String(r.id),
          name: String(r.name),
          type: String(r.type),
          icon: String(r.icon || '📦'),
          status: String(r.status || 'storage'),
          assignedTo: r.assignedTo ? String(r.assignedTo) : null,
          batteryPool: r.batteryTotal ? { total: Number(r.batteryTotal), charged: Number(r.batteryCharged) } : null,
          memoryPool: r.memoryTotal ? { total: Number(r.memoryTotal), free: Number(r.memoryFree) } : null,
          notes: r.notes ? String(r.notes) : ''
        }));
      } catch (e) {
        console.error('Failed to fetch inventory from SQLite:', e);
      }
    }
    return [];
  },

  updateInventoryItem: async (id: string, updates: InventoryUpdatePayload): Promise<void> => {
    const api = getElectronAPI();
    if (api?.db) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      
      // Map frontend fields to DB columns
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.batteryPool) {
        dbUpdates.batteryCharged = updates.batteryPool.charged;
        dbUpdates.batteryTotal = updates.batteryPool.total;
        delete dbUpdates.batteryPool;
      }
      if (updates.memoryPool) {
        dbUpdates.memoryFree = updates.memoryPool.free;
        dbUpdates.memoryTotal = updates.memoryPool.total;
        delete dbUpdates.memoryPool;
      }

      const mappedKeys = Object.keys(dbUpdates);
      const setClause = mappedKeys.map(k => `${k} = ?`).join(', ');
      const values = mappedKeys.map(k => dbUpdates[k]);

      try {
        await api.db.run(`UPDATE inventory SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);
        notifyListeners('bookings_updated'); // Trigger global refresh for now
      } catch (e) {
        console.error('Failed to update inventory in SQLite:', e);
      }
    }
  },

  getInventoryLogs: async (): Promise<InventoryLogEntry[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const rows = await api.db.query('SELECT * FROM inventory_logs ORDER BY createdAt DESC LIMIT 50');
        return rows.map(r => ({
          id: String(r.id),
          itemId: String(r.itemId),
          action: String(r.action),
          userId: String(r.userId),
          details: String(r.details || ''),
          createdAt: String(r.createdAt)
        }));
      } catch (e) {
        console.error('Failed to fetch inventory logs:', e);
      }
    }
    return [];
  },

  addInventoryLog: async (log: Pick<InventoryLogEntry, 'itemId' | 'action' | 'userId' | 'details'>): Promise<void> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        await api.db.run(
          'INSERT INTO inventory_logs (id, itemId, action, userId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), log.itemId, log.action, log.userId, log.details, new Date().toISOString()]
        );
      } catch (e) {
        console.error('Failed to add inventory log:', e);
      }
    }
  },

  addInventoryItem: async (item: { name: string; type: string; icon?: string; status?: string; assignedTo?: string | null; batteryTotal?: number; batteryCharged?: number; memoryTotal?: number; memoryFree?: number; notes?: string }): Promise<string | null> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const id = uuidv4();
        const now = new Date().toISOString();
        await api.db.run(
          'INSERT INTO inventory (id, name, type, icon, status, assignedTo, batteryCharged, batteryTotal, memoryFree, memoryTotal, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, item.name, item.type, item.icon || '📦', item.status || 'storage', item.assignedTo || null, item.batteryCharged ?? null, item.batteryTotal ?? null, item.memoryFree ?? null, item.memoryTotal ?? null, item.notes || '', now, now]
        );
        return id;
      } catch (e) {
        console.error('Failed to add inventory item:', e);
      }
    }
    return null;
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        await api.db.run('DELETE FROM inventory WHERE id = ?', [id]);
      } catch (e) {
        console.error('Failed to delete inventory item:', e);
      }
    }
  },

  // ========== ACTIVITY & AUDIT (🌑 BLACK'S SENTINEL LOGS) ==========
  getActivityLogs: async (limit = 50): Promise<ActivityLogEntry[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const rows = await api.db.query(
          `SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT ${limit}`
        );
        return rows.map(r => ({
          id: String(r.id),
          user: String(r.userName),
          userId: String(r.userId),
          action: String(r.action),
          target: String(r.details || r.entityType),
          time: new Date(String(r.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: String(r.action).toLowerCase().includes('delete') ? 'danger' : 'info'
        }));
      } catch (e) {
        console.error('Failed to fetch activity logs:', e);
      }
    }
    return [];
  },

  getProductivityStats: async (): Promise<Record<string, unknown>[]> => {
     const api = getElectronAPI();
     if (api?.db) {
         try {
             // Get actions grouped by hour for today
             const today = new Date().toISOString().split('T')[0];
             const rows = await api.db.query(
                 `SELECT strftime('%H:00', createdAt) as time, COUNT(*) as actions
                  FROM activity_logs
                  WHERE createdAt LIKE ?
                  GROUP BY time
                  ORDER BY time ASC`,
                 [`${today}%`]
             );
             return rows;
         } catch (e) {
             console.error('Failed to fetch productivity stats:', e);
         }
     }
     return [];
  },

  // Get attendance records for today
  getTodayAttendance: async (): Promise<Record<string, unknown>[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const rows = await api.db.query(
          `SELECT da.*, u.role, u.avatar, u.jobTitle
           FROM daily_attendance da
           LEFT JOIN users u ON da.userId = u.id
           WHERE da.date = ?
           ORDER BY da.checkIn ASC`,
          [today]
        );
        return rows || [];
      } catch (e) {
        console.error('Failed to fetch today attendance:', e);
      }
    }
    return [];
  },

  // Get per-employee action counts for today
  getEmployeeActionsToday: async (): Promise<Record<string, unknown>[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const rows = await api.db.query(
          `SELECT userId, userName, COUNT(*) as actionCount
           FROM activity_logs
           WHERE createdAt LIKE ?
           GROUP BY userId
           ORDER BY actionCount DESC`,
          [`${today}%`]
        );
        return rows || [];
      } catch (e) {
        console.error('Failed to fetch employee actions:', e);
      }
    }
    return [];
  },

  // Get bookings completed per employee today
  getEmployeeBookingsToday: async (): Promise<Record<string, unknown>[]> => {
    const api = getElectronAPI();
    if (api?.db) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const rows = await api.db.query(
          `SELECT updatedBy as userId, COUNT(*) as completedCount
           FROM bookings
           WHERE updatedAt LIKE ? AND status IN ('completed', 'delivered')
           GROUP BY updatedBy`,
          [`${today}%`]
        );
        return rows || [];
      } catch (e) {
        console.error('Failed to fetch employee bookings:', e);
      }
    }
    return [];
  },

  // ========== ADD-ONS & EXTRA SERVICES (🌑 BLACK'S PERSISTENCE FIX) ==========
  addExtraService: async (bookingId: string, amount: number, description: string, userId: string, userName: string, addOnCurrency?: string): Promise<AddExtraServiceResult> => {
    const api = getElectronAPI();
    if (api?.db) {
        try {
            const addOnId = uuidv4();
            const now = new Date().toISOString();

            // 0. Query booking's currency to determine where to store the add-on
            const bookingRows = await api.db.query('SELECT currency, totalAmount, addOnTotal, originalPackagePrice FROM bookings WHERE id = ?', [bookingId]);
            const bookingRow = bookingRows?.[0];
            const bookingCurrency = bookingRow?.currency || 'IQD';
            const effectiveAddOnCurrency = addOnCurrency || 'IQD';
            const isSameCurrency = effectiveAddOnCurrency === bookingCurrency;

            // 1. Insert into add_ons table
            await api.db.run(
                `INSERT INTO add_ons (id, bookingId, category, description, amount, currency, exchangeRate, convertedAmount, requestedBy, requestedByName, requestedAt, status, createdAt, updatedAt, originalPackagePrice, previousTotal, newTotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    addOnId, bookingId, 'Other', description, amount, effectiveAddOnCurrency, 1400, amount,
                    userId, userName, now, 'approved', now, now,
                    Number(bookingRow?.originalPackagePrice || bookingRow?.totalAmount || 0),
                    Number(bookingRow?.totalAmount || 0),
                    Number(bookingRow?.totalAmount || 0) + (isSameCurrency ? amount : 0)
                ]
            );

            // 2. Update booking — same currency goes to totalAmount + paidAmount (المبلغ الإضافي مستلم فوراً)
            //    different currency goes to addOnTotal
            if (isSameCurrency) {
                await api.db.run(
                    'UPDATE bookings SET totalAmount = totalAmount + ?, paidAmount = paidAmount + ? WHERE id = ?',
                    [amount, amount, bookingId]
                );
            } else {
                // Different currency: store in addOnTotal, preserve originalPackagePrice
                const currentAddOnTotal = Number(bookingRow?.addOnTotal || 0);
                const currentTotal = Number(bookingRow?.totalAmount || 0);
                await api.db.run(
                    'UPDATE bookings SET addOnTotal = ?, originalPackagePrice = CASE WHEN originalPackagePrice IS NULL OR originalPackagePrice = 0 THEN ? ELSE originalPackagePrice END WHERE id = ?',
                    [currentAddOnTotal + amount, currentTotal, bookingId]
                );
            }

            // 3. Log the activity
            await api.db.run(
                'INSERT INTO activity_logs (id, userId, userName, action, entityType, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), userId, userName, 'Added Extra Service', 'Booking', bookingId, `Added ${amount} ${effectiveAddOnCurrency} for ${description}`, now]
            );

            // 4. Update in-memory cache
            const cachedBooking = bookings.find(b => b.id === bookingId);
            if (cachedBooking) {
                if (isSameCurrency) {
                    cachedBooking.totalAmount = (cachedBooking.totalAmount || 0) + amount;
                    cachedBooking.paidAmount = (cachedBooking.paidAmount || 0) + amount; // ✅ المبلغ الإضافي مستلم فوراً
                } else {
                    if (!cachedBooking.originalPackagePrice) {
                        cachedBooking.originalPackagePrice = cachedBooking.totalAmount;
                    }
                    cachedBooking.addOnTotal = (cachedBooking.addOnTotal || 0) + amount;
                }
            }

            return { success: true };
        } catch (e) {
            console.error('Failed to add extra service:', e);
            throw e;
        }
    }
    return { success: false };
  },

  addRecurringExpense: async (expense: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> => {
    const newExpense: RecurringExpense = {
      ...expense,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert([
          {
            id: newExpense.id,
            title: newExpense.title,
            amount: newExpense.amount,
            currency: newExpense.currency,
            category: newExpense.category,
            day_of_month: newExpense.dayOfMonth,
            is_active: newExpense.isActive,
            created_at: newExpense.createdAt,
            exchange_rate: newExpense.exchangeRate || 1400,
          },
        ])
        .select()
        .single();

      if (error) {
           if (error.message && error.message.includes('column "exchange_rate" does not exist')) {
                 const { data: fallbackData, error: fallbackError } = await supabase.from('recurring_expenses').insert([{
                    id: newExpense.id,
                    title: newExpense.title,
                    amount: newExpense.amount,
                    currency: newExpense.currency,
                    category: newExpense.category,
                    day_of_month: newExpense.dayOfMonth,
                    is_active: newExpense.isActive,
                    created_at: newExpense.createdAt,
                }]).select().single();
                
                if (fallbackError) throw fallbackError;
                // Success fallback
                 notifyListeners('recurring_expenses_updated');
                 return {
                    id: String(fallbackData.id),
                    title: String(fallbackData.title),
                    amount: Number(fallbackData.amount),
                    currency: fallbackData.currency,
                    category: fallbackData.category,
                    dayOfMonth: Number(fallbackData.day_of_month),
                    isActive: Boolean(fallbackData.is_active),
                    createdAt: String(fallbackData.created_at),
                 };
           }
           throw error;
      }

      notifyListeners('recurring_expenses_updated');
      return {
        id: String(data.id),
        title: String(data.title),
        amount: Number(data.amount),
        currency: data.currency as RecurringExpense['currency'],
        category: data.category as RecurringExpense['category'],
        dayOfMonth: Number(data.day_of_month),
        isActive: Boolean(data.is_active),
        createdAt: String(data.created_at),
        exchangeRate: data.exchange_rate,
      };
    } catch {
      console.warn('Failed to save recurring to Supabase, saving locally');
      // For recurring, we just use simple array push fallback for now as they are less frequent
      recurringExpenses.push(newExpense);
      notifyListeners('recurring_expenses_updated');
      return newExpense;
    }
  },

  deleteRecurringExpense: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      notifyListeners('recurring_expenses_updated');
      return true;
    } catch {
      recurringExpenses = recurringExpenses.filter(e => e.id !== id);
      notifyListeners('recurring_expenses_updated');
      return true;
    }
  },

  // ========== AI ==========
  generateAiMessage: async (prompt: string): Promise<string> => {
    return 'This is a mock AI response for: ' + prompt;
  },

  // ========== PUB/SUB ==========
  subscribe: (callback: Listener): (() => void) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  },
};
