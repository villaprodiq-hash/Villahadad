import { BookingCategory } from '../types/booking.types';
import { Currency } from '../types/shared.types';

/**
 * Get localized category label
 */
export const getCategoryLabel = (category: BookingCategory, lang: 'ar' | 'en' = 'ar'): string => {
  const labels = {
    [BookingCategory.WEDDING]: { ar: 'زفاف', en: 'Wedding' },
    [BookingCategory.SHOOT]: { ar: 'جلسات تصوير', en: 'Photo Session' },
    [BookingCategory.LOCATION]: { ar: 'تأجير موقع', en: 'Venue Rental' },
    [BookingCategory.STUDIO]: { ar: 'ستوديو', en: 'Studio' },
    [BookingCategory.BIRTHDAY]: { ar: 'عيد ميلاد', en: 'Birthday' },
    [BookingCategory.GRADUATION]: { ar: 'تخرج', en: 'Graduation' },
    [BookingCategory.FAMILY]: { ar: 'عائلي', en: 'Family' },
    [BookingCategory.TRANSACTION]: { ar: 'معاملة', en: 'Transaction' },
  };
  
  return labels[category]?.[lang] || category;
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'USD' ? '$' : 'د.ع';
};

/**
 * Format amount with currency
 */
export const formatAmount = (amount: number, currency: Currency = 'IQD'): string => {
  const symbol = getCurrencySymbol(currency);
  return `${amount.toLocaleString()} ${symbol}`;
};

/**
 * Get category icon component name
 */
export const getCategoryIcon = (category: BookingCategory): string => {
  const icons = {
    [BookingCategory.WEDDING]: 'Heart',
    [BookingCategory.SHOOT]: 'Camera',
    [BookingCategory.LOCATION]: 'Building',
    [BookingCategory.STUDIO]: 'Video',
    [BookingCategory.BIRTHDAY]: 'Cake',
    [BookingCategory.GRADUATION]: 'GraduationCap',
    [BookingCategory.FAMILY]: 'Users',
    [BookingCategory.TRANSACTION]: 'FileText',
  };
  
  return icons[category] || 'Calendar';
};
