import { Currency } from '../types';

export const formatMoney = (amount: number, currency: Currency = 'IQD') => {
  if (amount === undefined || amount === null) return '0';

  // دولار أمريكي
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }

  // دينار عراقي (الافتراضي)
  return `${amount.toLocaleString('en-US')} د.ع`;
};
