import { Booking, BookingCategory } from '../types';

// Anniversary Event Types
export interface AnniversaryEvent {
  id: string;
  bookingId: string;
  clientName: string;
  clientPhone: string;
  eventType: 'wedding' | 'birthday_groom' | 'birthday_bride';
  eventDate: string; // YYYY-MM-DD
  originalDate: string; // Reference date (wedding date or birthdate)
  daysUntil: number;
  suggestion: string; // Marketing suggestion
  priority: 'urgent' | 'normal' | 'low';
}

/**
 * Calculate upcoming anniversaries and birthdays from bookings
 * @param bookings - List of all bookings
 * @param daysAhead - How many days to look ahead (default 14)
 * @returns Array of upcoming anniversary events
 */
export function getUpcomingAnniversaries(
  bookings: Booking[],
  daysAhead: number = 14
): AnniversaryEvent[] {
  const events: AnniversaryEvent[] = [];
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);

  // Filter to wedding bookings only
  const weddingBookings = bookings.filter(
    b => b.category === BookingCategory.WEDDING && 
    (b.details?.groomName || b.details?.brideName)
  );

  weddingBookings.forEach(booking => {
    // Wedding Anniversary
    if (booking.shootDate) {
      const weddingDate = new Date(booking.shootDate);
      const nextAnniversary = getNextAnniversaryDate(weddingDate);
      
      if (nextAnniversary <= endDate && nextAnniversary >= today) {
        const daysUntil = calculateDaysUntil(nextAnniversary);
        events.push({
          id: `${booking.id}_wedding`,
          bookingId: booking.id,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          eventType: 'wedding',
          eventDate: nextAnniversary.toISOString().split('T')[0],
          originalDate: booking.shootDate,
          daysUntil,
          suggestion: generateWeddingSuggestion(booking.clientName, daysUntil),
          priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 10 ? 'normal' : 'low'
        });
      }
    }

    // Groom Birthday
    if (booking.details?.groomBirthday && booking.details?.groomName) {
      const birthDate = new Date(booking.details.groomBirthday);
      const nextBirthday = getNextAnniversaryDate(birthDate);
      
      if (nextBirthday <= endDate && nextBirthday >= today) {
        const daysUntil = calculateDaysUntil(nextBirthday);
        events.push({
          id: `${booking.id}_groom_bd`,
          bookingId: booking.id,
          clientName: `${booking.details.groomName} (العريس)`,
          clientPhone: booking.clientPhone,
          eventType: 'birthday_groom',
          eventDate: nextBirthday.toISOString().split('T')[0],
          originalDate: booking.details.groomBirthday,
          daysUntil,
          suggestion: generateBirthdaySuggestion(booking.details.groomName, booking.details.brideName, true, daysUntil),
          priority: daysUntil <= 7 ? 'urgent' : 'normal'
        });
      }
    }

    // Bride Birthday
    if (booking.details?.brideBirthday && booking.details?.brideName) {
      const birthDate = new Date(booking.details.brideBirthday);
      const nextBirthday = getNextAnniversaryDate(birthDate);
      
      if (nextBirthday <= endDate && nextBirthday >= today) {
        const daysUntil = calculateDaysUntil(nextBirthday);
        events.push({
          id: `${booking.id}_bride_bd`,
          bookingId: booking.id,
          clientName: `${booking.details.brideName} (العروس)`,
          clientPhone: booking.clientPhone,
          eventType: 'birthday_bride',
          eventDate: nextBirthday.toISOString().split('T')[0],
          originalDate: booking.details.brideBirthday,
          daysUntil,
          suggestion: generateBirthdaySuggestion(booking.details.brideName, booking.details.groomName, false, daysUntil),
          priority: daysUntil <= 7 ? 'urgent' : 'normal'
        });
      }
    }
  });

  // Sort by days until (closest first)
  return events.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get the next occurrence of an anniversary from a past date
 */
function getNextAnniversaryDate(originalDate: Date): Date {
  const today = new Date();
  const thisYear = today.getFullYear();
  
  // Create anniversary for this year
  let anniversary = new Date(
    thisYear,
    originalDate.getMonth(),
    originalDate.getDate()
  );
  
  // If it already passed this year, use next year
  if (anniversary < today) {
    anniversary = new Date(
      thisYear + 1,
      originalDate.getMonth(),
      originalDate.getDate()
    );
  }
  
  return anniversary;
}

/**
 * Calculate days until a future date
 */
export function calculateDaysUntil(futureDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  futureDate.setHours(0, 0, 0, 0);
  
  const diffMs = futureDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate marketing suggestion for wedding anniversary
 */
function generateWeddingSuggestion(clientName: string, daysUntil: number): string {
  if (daysUntil <= 3) {
    return `🚨 عيد زواج ${clientName} بعد ${daysUntil} أيام! اتصل فوراً واعرض جلسة ذكرى مفاجأة.`;
  } else if (daysUntil <= 7) {
    return `⏰ عيد زواج ${clientName} قريب (${daysUntil} أيام). أرسل عرض خاص: جلسة تصوير رومانسية بخصم 20%.`;
  } else {
    return `📅 عيد زواج ${clientName} بعد ${daysUntil} يوم. أرسل تهنئة مبكرة وعرض حصري.`;
  }
}

/**
 * Generate marketing suggestion for birthday
 */
function generateBirthdaySuggestion(
  birthdayPerson: string | undefined,
  partner: string | undefined,
  isGroom: boolean,
  daysUntil: number
): string {
  const partnerName = isGroom ? partner : partner;
  
  if (daysUntil <= 5) {
    return `🎂 عيد ميلاد ${birthdayPerson} بعد ${daysUntil} أيام! اتصل بـ${partnerName || 'الشريك'} واقترح جلسة مفاجأة.`;
  } else {
    return `🎁 عيد ميلاد ${birthdayPerson} قريب (${daysUntil} أيام). عرض مميز: جلسة تصوير هدية + ألبوم صغير.`;
  }
}

/**
 * Get WhatsApp message template for event
 */
export function getWhatsAppMessage(event: AnniversaryEvent): string {
  const messages = {
    wedding: `مرحباً ${event.clientName}! 🎊\n\nعيد زواجكم السعيد بعد ${event.daysUntil} أيام! 💑\n\nنقدم لكم عرض خاص:\n✨ جلسة تصوير ذكرى رومانسية\n📸 ألبوم فاخر مجاناً\n🎁 خصم 20%\n\nاحجز الآن! 🌹`,
    
    birthday_groom: `مرحباً! 🎉\n\nعيد ميلاد ${event.clientName} بعد ${event.daysUntil} أيام! 🎂\n\nاقتراح: فاجئه بجلسة تصوير مميزة\n📷 خصم خاص 15%\n🎁 طباعة مجانية\n\nسجل الآن`,
    
    birthday_bride: `مرحباً! 🌸\n\nعيد ميلاد ${event.clientName} بعد ${event.daysUntil} أيام! 🎂\n\nفكرة: جلسة تصوير هدية رومانسية\n💐 باقة خاصة للسيدات\n📸 ألبوم أنيق\n🎁 خصم 15%\n\nاحجز الآن`
  };
  
  return messages[event.eventType];
}
