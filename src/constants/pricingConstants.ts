/**
 * Villa Hadad Studio - Pricing Constants
 * جميع الأسعار والمدد الزمنية للجلسات والغرف
 */

export interface PricingPackage {
  id: string;
  label: string;
  labelEn: string;
  price: number;
  duration: number; // hours
  isPrivate?: boolean;
  category: 'standard' | 'vip' | 'full_location';
}

// ===== Standard Sessions (2 Hours) =====
export const STANDARD_SESSIONS: PricingPackage[] = [
  {
    id: 'couple',
    label: 'جلسة عروس/عريس',
    labelEn: 'Couple/Groom Session',
    price: 150000,
    duration: 2,
    category: 'standard'
  },
  {
    id: 'private',
    label: 'جلسة خاصة/محجبات',
    labelEn: 'Private/Veiled Session',
    price: 300000,
    duration: 2,
    isPrivate: true,
    category: 'standard'
  },
  {
    id: 'kids',
    label: 'أطفال/تخرج/حمل',
    labelEn: 'Kids/Graduation/Pregnancy',
    price: 75000,
    duration: 2,
    category: 'standard'
  }
];

// ===== VIP Rooms =====
export const VIP_ROOMS: PricingPackage[] = [
  {
    id: 'economic',
    label: 'غرفة اقتصادية',
    labelEn: 'Economic Room',
    price: 75000,
    duration: 1,
    category: 'vip'
  },
  {
    id: 'silver',
    label: 'غرفة فضية',
    labelEn: 'Silver Room',
    price: 150000,
    duration: 1,
    category: 'vip'
  },
  {
    id: 'gold',
    label: 'غرفة ذهبية',
    labelEn: 'Gold Room',
    price: 250000,
    duration: 1,
    category: 'vip'
  },
  {
    id: 'royal',
    label: 'غرفة ملكية',
    labelEn: 'Royal Room',
    price: 500000,
    duration: 2,
    category: 'vip'
  }
];

// ===== Full Location (Events) =====
export const FULL_LOCATION: PricingPackage[] = [
  {
    id: 'pm3_12',
    label: '3 مساءً - 12 منتصف الليل (كامل)',
    labelEn: '3PM - 12AM (Full)',
    price: 3000000,
    duration: 9,
    category: 'full_location'
  },
  {
    id: 'pm4_12',
    label: '4 مساءً - 12 منتصف الليل',
    labelEn: '4PM - 12AM',
    price: 2500000,
    duration: 8,
    category: 'full_location'
  },
  {
    id: 'pm5_12',
    label: '5 مساءً - 12 منتصف الليل',
    labelEn: '5PM - 12AM',
    price: 2000000,
    duration: 7,
    category: 'full_location'
  },
  {
    id: 'pm6_12',
    label: '6 مساءً - 12 منتصف الليل',
    labelEn: '6PM - 12AM',
    price: 1500000,
    duration: 6,
    category: 'full_location'
  }
];

// ===== All Packages Combined =====
export const ALL_PACKAGES: PricingPackage[] = [
  ...STANDARD_SESSIONS,
  ...VIP_ROOMS,
  ...FULL_LOCATION
];

// ===== Helper Functions =====

/**
 * Get package by ID
 */
export function getPackageById(id: string): PricingPackage | undefined {
  return ALL_PACKAGES.find(pkg => pkg.id === id);
}

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(startTime: string, durationHours: number): string {
  const [hoursRaw, minutesRaw] = startTime.split(':').map(Number);
  const hours = typeof hoursRaw === 'number' && Number.isFinite(hoursRaw) ? hoursRaw : 0;
  const minutes = typeof minutesRaw === 'number' && Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  
  return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: 'IQD' | 'USD' = 'IQD'): string {
  if (currency === 'USD') {
    return `$${price.toLocaleString()}`;
  }
  return `${price.toLocaleString()} IQD`;
}

/**
 * Get packages by category
 */
export function getPackagesByCategory(category: 'standard' | 'vip' | 'full_location'): PricingPackage[] {
  return ALL_PACKAGES.filter(pkg => pkg.category === category);
}
