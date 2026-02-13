/**
 * نظام الفلاتر المتكامل - Filter System
 * يعمل بناءً على التصنيف الشجري للحجوزات
 */

import { Booking, BookingCategory } from '../types';

/**
 * Validates and sanitizes a date string
 * Returns a valid date string or a default date if invalid
 */
export function sanitizeDate(dateValue: string | undefined | null): string {
  const fallbackDate = new Date().toISOString().slice(0, 10);
  
  if (!dateValue || typeof dateValue !== 'string') {
    return fallbackDate;
  }
  
  // Check if it's already a valid ISO date or yyyy-MM-dd format
  const isoRegex = /^\d{4}-\d{2}-\d{2}/;
  if (isoRegex.test(dateValue)) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return dateValue.slice(0, 10);
    }
  }
  
  // If it looks like a phone number or other invalid data, return today's date
  if (dateValue.match(/^(07\d{9,10}|\d{10,15})$/)) {
    console.warn(`[sanitizeDate] Invalid date detected (phone number): ${dateValue}. Using fallback date.`);
    return fallbackDate;
  }
  
  // Try to parse as date
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  
  console.warn(`[sanitizeDate] Unparseable date: ${dateValue}. Using fallback date.`);
  return fallbackDate;
}

/**
 * Checks if a date string is valid
 */
export function isValidDate(dateValue: string | undefined | null): boolean {
  if (!dateValue || typeof dateValue !== 'string') return false;
  
  // Check for phone number pattern
  if (dateValue.match(/^(07\d{9,10}|\d{10,15})$/)) return false;
  
  const date = new Date(dateValue);
  return !isNaN(date.getTime());
}

// أنواع الفلاتر الرئيسية
export type MainFilterType = 'all' | 'sura' | 'villa';

// فئات التصوير (سورة)
export type SuraSubFilter = 
  | 'all_sura'
  | 'vip'           // عروض VIP (أعراس)
  | 'wedding_party' // أعراس وحفلات (خارجي)
  | 'wedding_studio'// عروض عرسان (استوديو)
  | 'kids'          // جلسات أطفال
  | 'general'       // جلسات منوعة (تخرج، ميلاد، حمل)
  | 'printing';     // طباعة وألبومات

// فئات الفيلا
export type VillaSubFilter =
  | 'all_villa'
  | 'venue_party'     // مناسبات الموقع (حجز كامل)
  | 'venue_room'      // غرفة VIP
  | 'venue_session'   // جلسات
  | 'venue_commercial'; // إعلاني

// حالة الفلتر الكاملة
export interface FilterState {
  mainFilter: MainFilterType;
  suraSubFilter: SuraSubFilter;
  villaSubFilter: VillaSubFilter;
}

// القيم الافتراضية
export const defaultFilterState: FilterState = {
  mainFilter: 'all',
  suraSubFilter: 'all_sura',
  villaSubFilter: 'all_villa',
};

// labels للعرض
export const mainFilterLabels: Record<MainFilterType, string> = {
  all: 'الكل',
  sura: 'جلسات التصوير',
  villa: 'حجوزات الفيلا',
};

export const suraSubFilterLabels: Record<SuraSubFilter, string> = {
  all_sura: 'كل الجلسات',
  vip: 'عروض VIP',
  wedding_party: 'أعراس وحفلات',
  wedding_studio: 'عرسان استوديو',
  kids: 'جلسات أطفال',
  general: 'جلسات منوعة',
  printing: 'طباعة وألبومات',
};

export const villaSubFilterLabels: Record<VillaSubFilter, string> = {
  all_villa: 'كل الحجوزات',
  venue_party: 'مناسبات الموقع',
  venue_room: 'غرفة VIP',
  venue_session: 'جلسات',
  venue_commercial: 'تصوير إعلاني',
};

/**
 * التحقق إذا كان الحجز ينتمي لفئة سورة
 */
export function isSuraBooking(booking: Booking): boolean {
  return booking.category !== BookingCategory.LOCATION;
}

/**
 * التحقق إذا كان الحجز ينتمي لفئة فيلا
 */
export function isVillaBooking(booking: Booking): boolean {
  return booking.category === BookingCategory.LOCATION;
}

/**
 * الحصول على الفئة الفرعية للحجز
 */
export function getBookingSubCategory(booking: Booking): string {
  // للفيلا: نستخدم servicePackage لتحديد النوع
  if (isVillaBooking(booking)) {
    const pkg = booking.servicePackage || '';
    if (pkg.includes('غرفة') || pkg.includes('VIP')) return 'venue_room';
    if (pkg.includes('برايفت') || pkg.includes('كامل')) return 'venue_party';
    if (pkg.includes('إعلان') || pkg.includes('تجاري')) return 'venue_commercial';
    return 'venue_session';
  }
  
  // لسورة: نستخدم servicePackage لتحديد النوع
  const pkg = booking.servicePackage || '';
  if (pkg.includes('VIP')) return 'vip';
  if (pkg.includes('حفل') || pkg.includes('عرس خارجي')) return 'wedding_party';
  if (pkg.includes('استوديو') || pkg.includes('عرسان')) return 'wedding_studio';
  if (pkg.includes('أطفال') || pkg.includes('kids')) return 'kids';
  if (pkg.includes('طباعة') || pkg.includes('ألبوم')) return 'printing';
  return 'general';
}

/**
 * فلترة الحجوزات حسب الفلتر المحدد
 */
export function filterBookings(
  bookings: Booking[],
  filter: FilterState,
  searchTerm?: string
): Booking[] {
  return bookings.filter(booking => {
    // فلترة البحث
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const clientName = (booking.clientName || '').toLowerCase();
      const phone = (booking.clientPhone || '').toString().toLowerCase();
      if (!clientName.includes(search) && !phone.includes(search)) {
        return false;
      }
    }

    // فلترة رئيسية
    if (filter.mainFilter === 'sura') {
      if (!isSuraBooking(booking)) return false;
      
      // فلترة فرعية لسورة
      if (filter.suraSubFilter !== 'all_sura') {
        const subCat = getBookingSubCategory(booking);
        if (subCat !== filter.suraSubFilter) return false;
      }
    } 
    else if (filter.mainFilter === 'villa') {
      if (!isVillaBooking(booking)) return false;
      
      // فلترة فرعية للفيلا
      if (filter.villaSubFilter !== 'all_villa') {
        const subCat = getBookingSubCategory(booking);
        if (subCat !== filter.villaSubFilter) return false;
      }
    }

    return true;
  });
}

/**
 * فلترة العملاء حسب نوع حجوزاتهم
 */
export function filterClientsByBookingType(
  clients: any[],
  bookings: Booking[],
  filter: FilterState
): any[] {
  return clients.filter(client => {
    const clientBookings = bookings.filter(b => b.clientId === client.id);
    
    if (clientBookings.length === 0) {
      return filter.mainFilter === 'all';
    }

    // التحقق من نوع الحجوزات
    const hasSura = clientBookings.some(isSuraBooking);
    const hasVilla = clientBookings.some(isVillaBooking);

    if (filter.mainFilter === 'sura') {
      if (!hasSura) return false;
      
      // فلترة فرعية
      if (filter.suraSubFilter !== 'all_sura') {
        const hasMatchingSub = clientBookings.some(b => {
          if (!isSuraBooking(b)) return false;
          return getBookingSubCategory(b) === filter.suraSubFilter;
        });
        if (!hasMatchingSub) return false;
      }
    } 
    else if (filter.mainFilter === 'villa') {
      if (!hasVilla) return false;
      
      // فلترة فرعية
      if (filter.villaSubFilter !== 'all_villa') {
        const hasMatchingSub = clientBookings.some(b => {
          if (!isVillaBooking(b)) return false;
          return getBookingSubCategory(b) === filter.villaSubFilter;
        });
        if (!hasMatchingSub) return false;
      }
    }

    return true;
  });
}

/**
 * الحصول على الإحصائيات للفلاتر
 */
export function getFilterStats(bookings: Booking[]) {
  const stats = {
    all: bookings.length,
    sura: bookings.filter(isSuraBooking).length,
    villa: bookings.filter(isVillaBooking).length,
    // سورة فرعي
    vip: 0,
    wedding_party: 0,
    wedding_studio: 0,
    kids: 0,
    general: 0,
    printing: 0,
    // فيلا فرعي
    venue_party: 0,
    venue_room: 0,
    venue_session: 0,
    venue_commercial: 0,
  };

  bookings.forEach(booking => {
    const subCat = getBookingSubCategory(booking);
    if (subCat in stats) {
      (stats as any)[subCat]++;
    }
  });

  return stats;
}
