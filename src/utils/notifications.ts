import { Booking, BookingStatus, User, UserRole } from '../types';

export interface NotificationCounts {
  // Reception
  'section-home'?: number;
  'section-bookings'?: number;
  'section-calendar'?: number;
  
  // Manager
  'section-team-chat'?: number;
  'section-financial'?: number;
  
  // Printer
  'section-inventory'?: number;
  
  // Photo Editor / Video Editor / Selector
  'section-gallery'?: number;
  'section-projects'?: number;
  
  [key: string]: number | undefined;
}

export const calculateNotifications = (
  bookings: Booking[],
  users: User[],
  currentUser?: User
): NotificationCounts => {
  if (!currentUser) return {};

  const counts: NotificationCounts = {};

  switch (currentUser.role) {
    case UserRole.RECEPTION: {
      // New bookings (Inquiries and Confirmed)
      const newBookings = bookings.filter(b => 
        b.status === BookingStatus.INQUIRY || 
        b.status === BookingStatus.CONFIRMED
      ).length;
      counts['section-bookings'] = newBookings;

      // Today's appointments
      const today = new Date().toISOString().slice(0, 10);
      const todayAppointments = bookings.filter(b => 
        b.shootDate?.startsWith(today)
      ).length;
      if (todayAppointments > 0) {
        counts['section-calendar'] = todayAppointments;
      }
      break;
    }

    case UserRole.MANAGER: {
      // Team chat - mock for now (would need real message count)
      counts['section-team-chat'] = 0;
      
      // Financial alerts - bookings with pending payments (Paid < Total)
      const financialAlerts = bookings.filter(b => 
        b.paidAmount < b.totalAmount
      ).length;
      if (financialAlerts > 0) {
        counts['section-financial'] = financialAlerts;
      }
      break;
    }

    case UserRole.PRINTER: {
      // Print jobs in queue
      const queueJobs = bookings.filter(b => 
        b.status === BookingStatus.READY_TO_PRINT
      ).length;
      if (queueJobs > 0) {
        counts['section-home'] = queueJobs;
      }

      // Low inventory alert (mock - would need real inventory data)
      // counts['section-inventory'] = 0;
      break;
    }

    case UserRole.PHOTO_EDITOR: {
      // Photos assigned to THIS photo editor AND in relevant status
      const readyForPhotoWork = bookings.filter(b =>
        (b.status === BookingStatus.SELECTION ||
         b.status === BookingStatus.EDITING) &&
        b.assignedPhotoEditor === currentUser.id
      ).length;
      if (readyForPhotoWork > 0) {
        counts['section-gallery'] = readyForPhotoWork;
      }
      break;
    }

    case UserRole.VIDEO_EDITOR: {
      // Videos assigned to THIS video editor AND in relevant status
      const readyForVideoWork = bookings.filter(b =>
        (b.status === BookingStatus.SHOOTING ||
         b.status === BookingStatus.EDITING) &&
        b.assignedVideoEditor === currentUser.id
      ).length;
      if (readyForVideoWork > 0) {
        counts['section-projects'] = readyForVideoWork;
      }
      break;
    }

    case UserRole.SELECTOR: {
      // Albums ready for selection
      const albumsReady = bookings.filter(b => 
        b.status === BookingStatus.SELECTION
      ).length;
      if (albumsReady > 0) {
        counts['section-home'] = albumsReady;
      }
      break;
    }

    case UserRole.ADMIN:
      // System alerts (mock - would need real system data)
      // counts['section-users'] = 0;
      break;
  }

  return counts;
};

// Helper to get total notification count
export const getTotalNotifications = (counts: NotificationCounts): number => {
  return Object.values(counts).reduce<number>((sum, count) => sum + (count || 0), 0);
};
