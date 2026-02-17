import { createContext, useContext } from 'react';
import type {
  Booking,
  DashboardTask,
  AppNotification,
  NotificationCounts,
} from '../types';

export interface DataContextValue {
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

export const DataContext = createContext<DataContextValue | undefined>(undefined);

export function useDataContextValue() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
