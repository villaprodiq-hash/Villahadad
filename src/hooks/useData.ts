/**
 * Custom hook for data access
 * Provides bookings, notifications, and sync status
 */
import { useData } from '../providers/DataProvider';

export const useBookings = () => {
  const { bookings, updateBooking, addBooking, deleteBooking } = useData();
  
  return {
    bookings,
    updateBooking,
    addBooking,
    deleteBooking,
  };
};

export const useNotifications = () => {
  const { notifications, notificationBadges } = useData();
  
  return {
    notifications,
    notificationBadges,
  };
};

export const useSyncStatus = () => {
  const { isOffline, isPostgresOffline, conflictMode, setConflictMode } = useData();
  
  return {
    isOffline,
    isPostgresOffline,
    conflictMode,
    setConflictMode,
  };
};
