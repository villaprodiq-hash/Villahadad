/**
 * Conflict Detection for Studio Bookings
 * منطق كشف التعارضات للجلسات الخاصة والعادية
 */

import { Booking } from '../types';

export type ConflictSeverity = 'none' | 'warning' | 'error';

export interface ConflictResult {
  severity: ConflictSeverity;
  message: string;
  conflictingBookings: Booking[];
  canSave: boolean;
}

/**
 * Check if two time slots overlap
 */
function doTimeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
  date1: string,
  date2: string
): boolean {
  // Different dates = no overlap
  if (date1 !== date2) return false;
  
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  
  // Check overlap: (start1 < end2) AND (end1 > start2)
  return s1 < e2 && e1 > s2;
}

/**
 * Main Conflict Detection Function
 * 
 * Rules:
 * - Scenario A: New Private + Slot Busy = RED ERROR (block save)
 * - Scenario B: Existing Private in Slot = RED ERROR (block save)
 * - Scenario C: Normal + Slot Busy = YELLOW WARNING (allow save)
 */
export function checkConflict(
  newBooking: {
    shootDate: string;
    startTime?: string;
    endTime?: string;
    isPrivate?: boolean;
  },
  existingBookings: Booking[]
): ConflictResult {
  // No time specified = no conflict
  if (!newBooking.startTime || !newBooking.endTime) {
    return {
      severity: 'none',
      message: '',
      conflictingBookings: [],
      canSave: true
    };
  }
  
  // Find overlapping bookings
  const overlapping = existingBookings.filter(booking => {
    const bookingStart = booking.details?.startTime;
    const bookingEnd = booking.details?.endTime;
    
    if (!bookingStart || !bookingEnd) return false;
    
    return doTimeSlotsOverlap(
      newBooking.startTime!,
      newBooking.endTime!,
      bookingStart,
      bookingEnd,
      newBooking.shootDate,
      booking.shootDate
    );
  });
  
  // No overlaps = OK
  if (overlapping.length === 0) {
    return {
      severity: 'none',
      message: '',
      conflictingBookings: [],
      canSave: true
    };
  }
  
  // Check for private sessions
  const hasExistingPrivate = overlapping.some(b => b.details?.isPrivate);
  const isNewPrivate = newBooking.isPrivate;
  
  // Scenario A: New booking is Private + Slot is busy
  if (isNewPrivate) {
    return {
      severity: 'error',
      message: 'لا يمكن حجز جلسة خاصة - الاستوديو مشغول في هذا الوقت',
      conflictingBookings: overlapping,
      canSave: false
    };
  }
  
  // Scenario B: Existing Private booking in slot
  if (hasExistingPrivate) {
    return {
      severity: 'error',
      message: 'لا يمكن الحجز - يوجد جلسة خاصة محجوزة في هذا الوقت',
      conflictingBookings: overlapping.filter(b => b.details?.isPrivate),
      canSave: false
    };
  }
  
  // Scenario C: Normal booking + Normal overlap = Warning (allow)
  return {
    severity: 'warning',
    message: `ملاحظة: يوجد ${overlapping.length} حجز آخر في نفس الوقت`,
    conflictingBookings: overlapping,
    canSave: true
  };
}

/**
 * Get conflict color for UI
 */
export function getConflictColor(severity: ConflictSeverity): string {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    default:
      return 'green';
  }
}
