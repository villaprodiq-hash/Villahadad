import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Booking, BookingStatus, AppNotification } from '../types';
import { REMINDER_CHECK_INTERVAL_MS, REMINDER_ADVANCE_MINUTES } from '../constants/appConstants';

/**
 * Shared hook for booking reminder logic.
 * Extracted from App.tsx + DataProvider.tsx to fix DRY violation.
 *
 * Uses a ref for notifications to avoid the infinite loop that occurred
 * when notifications was in the dependency array (since checkReminders
 * itself adds to notifications, creating a cycle).
 */
export function useBookingReminders(
  bookings: Booking[],
  notifications: AppNotification[],
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) {
  // Use ref for notifications to avoid stale closure WITHOUT adding to deps
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const checkReminders = useCallback(() => {
    const now = new Date();
    const advanceMs = REMINDER_ADVANCE_MINUTES * 60_000;
    const futureThreshold = new Date(now.getTime() + advanceMs);

    bookings.forEach((booking) => {
      if (booking.status !== BookingStatus.CONFIRMED || !booking.shootDate) return;

      const shootTime = new Date(booking.shootDate);
      if (booking.details?.startTime) {
        const [hoursRaw, minutesRaw] = String(booking.details.startTime).split(':').map(Number);
        const hours =
          typeof hoursRaw === 'number' && Number.isFinite(hoursRaw) ? hoursRaw : 0;
        const minutes =
          typeof minutesRaw === 'number' && Number.isFinite(minutesRaw) ? minutesRaw : 0;
        if (!isNaN(hours) && !isNaN(minutes)) {
          shootTime.setHours(hours, minutes, 0, 0);
        }
      }

      if (shootTime <= now || shootTime > futureThreshold) return;

      const reminderId = `reminder-${booking.id}`;
      const alreadyNotified = notificationsRef.current.some(
        (n) => n.id === reminderId || n.message.includes(booking.clientName)
      );

      if (alreadyNotified) return;

      const newNotification: AppNotification = {
        id: reminderId,
        title: 'تذكير موعد الحجز',
        message: `حان موعد حجز ${booking.clientName} (${booking.title}). اضغط هنا للانتقال لقسم سير العمل`,
        time: 'الآن',
        read: false,
        type: 'workflow_reminder',
      };

      setNotifications((prev) => [newNotification, ...prev]);
      toast('⏰ اقترب موعد حجز جديد!', { icon: '🔔' });
    });
  }, [bookings, setNotifications]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, REMINDER_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkReminders]);
}
