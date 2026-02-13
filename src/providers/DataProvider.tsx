import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { toast } from 'sonner';
import {
  Booking,
  BookingStatus,
  DashboardTask,
  Reminder,
  AppNotification,
  NotificationCounts,
} from '../types';
import { electronBackend } from '../services/mockBackend';
import { SyncManager } from '../services/sync/SyncManager';
import { ConflictService } from '../services/sync/ConflictService';
import { calculateNotifications } from '../utils/notifications';
import { useAuth } from './AuthProvider';
import { logger } from '../utils/logger';
import { shallowEqualArrays } from '../utils/performance';
import { useBookingReminders } from '../hooks/useBookingReminders';

interface DataContextValue {
  bookings: Booking[];
  dashboardTasks: DashboardTask[];
  notifications: AppNotification[];
  isOffline: boolean;
  isPostgresOffline: boolean;
  conflictMode: boolean;
  setConflictMode: (value: boolean) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  addBooking: (booking: Booking) => void;
  deleteBooking: (id: string) => void;
  notificationBadges: NotificationCounts;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { currentUser, users } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dashboardTasks, setDashboardTasks] = useState<DashboardTask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPostgresOffline, setIsPostgresOffline] = useState(false);
  const [conflictMode, setConflictMode] = useState(false);

  const isFirstCheck = useRef(true);
  const bookingsRef = useRef<Booking[]>([]);

  // Calculate notification badges
  const notificationBadges = React.useMemo(() => {
    return calculateNotifications(bookings, users || [], currentUser) as NotificationCounts;
  }, [bookings, users, currentUser]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      console.log('[DataProvider] 🚀 Starting data load...');
      const startTime = Date.now();

      try {
        // Initialize Database Schema
        console.log('[DataProvider] 📦 Step 1: Initializing database schema...');
        const { initDB } = await import('../services/db/schema');
        await initDB();
        console.log(`[DataProvider] ✅ initDB completed (${Date.now() - startTime}ms)`);

        // Seed database with default users
        console.log('[DataProvider] 🌱 Step 2: Seeding database...');
        const { seedDatabase } = await import('../services/db/seed');
        await seedDatabase();
        console.log(`[DataProvider] ✅ seedDatabase completed (${Date.now() - startTime}ms)`);

        // 🔄 Initialize SyncManager early (before loading data)
        console.log('[DataProvider] 🔄 Step 2.5: Initializing SyncManager...');
        SyncManager.init();
        console.log(`[DataProvider] ✅ SyncManager initialized (${Date.now() - startTime}ms)`);

        // Load tasks and bookings
        console.log('[DataProvider] 📊 Step 3: Loading dashboard tasks...');
        const tasks = await electronBackend.getDashboardTasks();
        setDashboardTasks(tasks);
        console.log(`[DataProvider] ✅ Loaded ${tasks.length} tasks (${Date.now() - startTime}ms)`);

        console.log('[DataProvider] 📊 Step 4: Loading bookings...');
        const bookingsData = await electronBackend.getBookings();
        setBookings(bookingsData);
        bookingsRef.current = bookingsData;
        console.log(
          `[DataProvider] ✅ Loaded ${bookingsData.length} bookings (${Date.now() - startTime}ms)`
        );

        console.log(
          `[DataProvider] 🎉 All data loaded successfully in ${Date.now() - startTime}ms`
        );
      } catch (error) {
        console.error('[DataProvider] ❌ Failed to load data:', error);
        logger.error('Failed to load data', error as Error);
      }
    };

    loadData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = electronBackend.subscribe(async event => {
      logger.debug(`Received sync event`, { event });

      if (event === 'bookings_updated') {
        const data = await electronBackend.getBookings();
        setBookings(prev => {
          // Use shallow comparison for better performance
          if (!shallowEqualArrays(prev, data)) {
            bookingsRef.current = data;
            return data;
          }
          return prev;
        });
      } else if (event === 'tasks_updated') {
        const data = await electronBackend.getDashboardTasks();
        setDashboardTasks(prev => {
          if (!shallowEqualArrays(prev, data)) {
            return data;
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔔 Subscribe to SyncManager real-time events (Cloud -> Local)
  useEffect(() => {
    console.log('[DataProvider] 🔔 Setting up SyncManager listener...');

    const unsubscribe = SyncManager.onSync(async (event, data) => {
      console.log(`[DataProvider] 🔔 SyncManager event: ${event}`, data);

      if (
        event === 'booking:created' ||
        event === 'booking:updated' ||
        event === 'booking:deleted'
      ) {
        // Reload bookings from local SQLite (which was just updated by SyncManager)
        const freshBookings = await electronBackend.getBookings();
        setBookings(prev => {
          if (!shallowEqualArrays(prev, freshBookings)) {
            bookingsRef.current = freshBookings;
            console.log(
              `[DataProvider] ✅ Updated bookings from cloud sync: ${freshBookings.length} items`
            );
            return freshBookings;
          }
          return prev;
        });

        // Show toast notification for real-time updates from other devices
        if (event === 'booking:created') {
          toast.success('📥 حجز جديد من جهاز آخر', { duration: 3000 });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // PostgreSQL connection monitoring
  useEffect(() => {
    const checkPgStatus = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      if (api?.db?.getStatus) {
        try {
          const status = await api.db.getStatus();
          const wasOffline = isPostgresOffline;

          if (!status.postgres !== isPostgresOffline) {
            setIsPostgresOffline(!status.postgres);

            if (!isFirstCheck.current) {
              if (!status.postgres && !wasOffline) {
                toast.warning('تم فقدان الاتصال بالخادم - استخدام البيانات المخزنة');
              } else if (status.postgres && wasOffline) {
                toast.success('تم استعادة الاتصال بالخادم');
              }
            }
          }
          isFirstCheck.current = false;
        } catch (error) {
          if (!isFirstCheck.current && !isPostgresOffline) {
            toast.warning('تم فقدان الاتصال بالخادم - استخدام البيانات المخزنة');
          }
          if (!isPostgresOffline) setIsPostgresOffline(true);
          isFirstCheck.current = false;
        }
      } else {
        if (isPostgresOffline) setIsPostgresOffline(false);
        isFirstCheck.current = false;
      }
    };

    checkPgStatus();
    const interval = setInterval(checkPgStatus, 5000);
    return () => clearInterval(interval);
  }, [isPostgresOffline]);

  // Sync manager subscription - replaces offlineManager
  useEffect(() => {
    // Listen for sync-complete events from SyncManager
    const handleSyncComplete = (event: CustomEvent) => {
      const detail = event.detail || {};
      if (detail.failed > 0) {
        toast.error(`فشل مزامنة ${detail.failed} عنصر`, { duration: 5000 });
        if (currentUser?.role === 'manager' || currentUser?.role === 'admin') {
          setConflictMode(true);
        }
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success('تم استعادة الاتصال بالسيرفر 🟢');
      // Trigger sync when coming back online
      SyncManager.pushChanges();
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('انقطع الاتصال - وضع العمل دون اتصال 🔴');
    };

    window.addEventListener('sync-complete', handleSyncComplete as EventListener);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Check for pending conflicts periodically
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'admin')) {
      return;
    }

    const checkConflicts = async () => {
      try {
        const conflicts = await ConflictService.fetchPendingConflicts();
        if (conflicts.length > 0 && !conflictMode) {
          toast.error(`يوجد ${conflicts.length} تعارض في البيانات! يرجى المراجعة.`, {
            duration: 5000,
          });
          setConflictMode(true);
        }
      } catch (e) {
        // Silent fail - conflicts will be checked again
      }
    };

    checkConflicts();
    const interval = setInterval(checkConflicts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [currentUser, conflictMode]);

  // Booking reminders — shared hook (extracted to fix DRY violation)
  useBookingReminders(bookings, notifications, setNotifications);

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    const booking = bookings.find(b => b.id === id);
    const oldStatus = booking?.status;
    const newStatus = updates.status;

    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));

    // Just-in-time folder creation for SHOOTING → SELECTION transition
    if (booking && oldStatus === BookingStatus.SHOOTING && newStatus === BookingStatus.SELECTION) {
      const isExternal =
        booking.servicePackage?.includes('خارجي') ||
        booking.servicePackage?.includes('External') ||
        booking.location?.toLowerCase().includes('external');

      if (!isExternal) {
        try {
          const response = await fetch('http://localhost:3000/api/media/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingDate: booking.shootDate,
              clientName: booking.clientName,
              category: booking.category,
            }),
          });

          const result = await response.json();
          if (result.success) {
            toast.success(`📂 تم إنشاء مجلد ${booking.clientName} تلقائياً في السيرفر`);
            setBookings(prev =>
              prev.map(b => (b.id === id ? { ...b, folderPath: result.path } : b))
            );
          } else {
            toast.error('فشل إنشاء المجلد تلقائياً');
          }
        } catch (error) {
          console.error('Auto folder creation error:', error);
          toast.error('خطأ في إنشاء المجلد التلقائي');
        }
      } else {
        console.log('⏭️ Skipped folder creation for external booking');
      }
    }
  };

  const addBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const value: DataContextValue = {
    bookings,
    dashboardTasks,
    notifications,
    isOffline,
    isPostgresOffline,
    conflictMode,
    setConflictMode,
    updateBooking,
    addBooking,
    deleteBooking,
    notificationBadges,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
