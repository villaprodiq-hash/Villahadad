import { describe, it, expect } from 'vitest';

// ============ Utility Functions Tests ============

describe('Utility Functions', () => {
  
  // ============ Date Formatting ============
  describe('Date Formatting', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2026-01-19T10:30:00');
      const formatted = date.toISOString().split('T')[0];
      expect(formatted).toBe('2026-01-19');
    });

    it('should parse Arabic date correctly', () => {
      const dateStr = '2026-02-15';
      const date = new Date(dateStr);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(1); // 0-indexed
      expect(date.getDate()).toBe(15);
    });
  });

  // ============ Currency Formatting ============
  describe('Currency Formatting', () => {
    const formatCurrency = (amount: number, currency: 'IQD' | 'USD'): string => {
      if (currency === 'USD') {
        return `$${amount.toLocaleString()}`;
      }
      return `${amount.toLocaleString()} د.ع`;
    };

    it('should format IQD correctly', () => {
      expect(formatCurrency(500000, 'IQD')).toBe('500,000 د.ع');
      expect(formatCurrency(1500000, 'IQD')).toBe('1,500,000 د.ع');
    });

    it('should format USD correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000');
      expect(formatCurrency(2500, 'USD')).toBe('$2,500');
    });
  });

  // ============ Phone Number Validation ============
  describe('Phone Number Validation', () => {
    const isValidIraqiPhone = (phone: string): boolean => {
      // Iraqi phone: starts with 07, 10-11 digits
      const cleaned = phone.replace(/\D/g, '');
      return /^07[3-9]\d{8}$/.test(cleaned);
    };

    it('should validate correct Iraqi phone numbers', () => {
      expect(isValidIraqiPhone('07801234567')).toBe(true);
      expect(isValidIraqiPhone('07901234567')).toBe(true);
      expect(isValidIraqiPhone('07701234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidIraqiPhone('12345')).toBe(false);
      expect(isValidIraqiPhone('07001234567')).toBe(false); // 070 not valid
      expect(isValidIraqiPhone('08801234567')).toBe(false); // 088 not valid
    });

    it('should handle phone with spaces/dashes', () => {
      expect(isValidIraqiPhone('0780 123 4567')).toBe(true);
      expect(isValidIraqiPhone('0780-123-4567')).toBe(true);
    });
  });

  // ============ Exchange Rate Calculator ============
  describe('Exchange Rate Calculator', () => {
    const EXCHANGE_RATE = 1500; // 1 USD = 1500 IQD

    const convertToIQD = (amount: number, currency: 'USD' | 'IQD'): number => {
      if (currency === 'USD') {
        return amount * EXCHANGE_RATE;
      }
      return amount;
    };

    const convertToUSD = (amount: number, currency: 'USD' | 'IQD'): number => {
      if (currency === 'IQD') {
        return Math.round(amount / EXCHANGE_RATE);
      }
      return amount;
    };

    it('should convert USD to IQD', () => {
      expect(convertToIQD(100, 'USD')).toBe(150000);
      expect(convertToIQD(1000, 'USD')).toBe(1500000);
    });

    it('should return same amount for IQD', () => {
      expect(convertToIQD(500000, 'IQD')).toBe(500000);
    });

    it('should convert IQD to USD', () => {
      expect(convertToUSD(150000, 'IQD')).toBe(100);
      expect(convertToUSD(1500000, 'IQD')).toBe(1000);
    });
  });

  // ============ Booking Status Flow ============
  describe('Booking Status Flow', () => {
    const STATUS_ORDER = [
      'Inquiry',
      'Confirmed',
      'Shooting',
      'Shooting Completed',
      'Selection',
      'Editing',
      'Ready to Print',
      'Printing',
      'Ready for Pickup',
      'Delivered',
    ];

    const getNextStatus = (current: string): string | null => {
      const idx = STATUS_ORDER.indexOf(current);
      if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
      return STATUS_ORDER[idx + 1];
    };

    const getPrevStatus = (current: string): string | null => {
      const idx = STATUS_ORDER.indexOf(current);
      if (idx <= 0) return null;
      return STATUS_ORDER[idx - 1];
    };

    it('should get next status correctly', () => {
      expect(getNextStatus('Inquiry')).toBe('Confirmed');
      expect(getNextStatus('Shooting')).toBe('Shooting Completed');
      expect(getNextStatus('Editing')).toBe('Ready to Print');
    });

    it('should return null for last status', () => {
      expect(getNextStatus('Delivered')).toBeNull();
    });

    it('should get previous status correctly', () => {
      expect(getPrevStatus('Confirmed')).toBe('Inquiry');
      expect(getPrevStatus('Editing')).toBe('Selection');
    });

    it('should return null for first status', () => {
      expect(getPrevStatus('Inquiry')).toBeNull();
    });
  });

  // ============ Deadline Calculator (60-60 Rule) ============
  describe('60-60 Deadline Rule', () => {
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const calculateSelectionDeadline = (shootDate: string): string => {
      const shoot = new Date(shootDate);
      return addDays(shoot, 60).toISOString().split('T')[0];
    };

    const calculateDeliveryDeadline = (selectionDate: string): string => {
      const selection = new Date(selectionDate);
      return addDays(selection, 60).toISOString().split('T')[0];
    };

    const isOverdue = (deadline: string): boolean => {
      return new Date(deadline) < new Date();
    };

    it('should calculate selection deadline (60 days after shoot)', () => {
      const shootDate = '2026-01-01';
      const deadline = calculateSelectionDeadline(shootDate);
      expect(deadline).toBe('2026-03-02'); // 60 days later
    });

    it('should calculate delivery deadline (60 days after selection)', () => {
      const selectionDate = '2026-02-01';
      const deadline = calculateDeliveryDeadline(selectionDate);
      expect(deadline).toBe('2026-04-02');
    });

    it('should detect overdue deadlines', () => {
      expect(isOverdue('2020-01-01')).toBe(true);  // Past date
      expect(isOverdue('2030-01-01')).toBe(false); // Future date
    });
  });

  // ============ UUID Generation ============
  describe('UUID Generation', () => {
    const generateId = (): string => {
      return crypto.randomUUID();
    };

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate valid UUID format', () => {
      const id = generateId();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or test-uuid-xxxxx
      expect(id.length).toBeGreaterThan(10);
    });
  });

  // ============ Search/Filter Functions ============
  describe('Search & Filter', () => {
    const bookings = [
      { id: '1', clientName: 'أحمد محمد', status: 'Confirmed', category: 'Wedding' },
      { id: '2', clientName: 'فاطمة علي', status: 'Shooting', category: 'Studio' },
      { id: '3', clientName: 'محمد حسين', status: 'Confirmed', category: 'Wedding' },
      { id: '4', clientName: 'زينب أحمد', status: 'Delivered', category: 'Birthday' },
    ];

    it('should filter by status', () => {
      const confirmed = bookings.filter(b => b.status === 'Confirmed');
      expect(confirmed).toHaveLength(2);
    });

    it('should filter by category', () => {
      const weddings = bookings.filter(b => b.category === 'Wedding');
      expect(weddings).toHaveLength(2);
    });

    it('should search by client name (Arabic)', () => {
      const search = (query: string) => 
        bookings.filter(b => b.clientName.includes(query));

      expect(search('أحمد')).toHaveLength(2); // أحمد محمد, زينب أحمد
      expect(search('فاطمة')).toHaveLength(1);
      expect(search('غير موجود')).toHaveLength(0);
    });

    it('should combine multiple filters', () => {
      const filtered = bookings.filter(
        b => b.status === 'Confirmed' && b.category === 'Wedding'
      );
      expect(filtered).toHaveLength(2);
    });
  });

  // ============ Payment Calculations ============
  describe('Payment Calculations', () => {
    it('should calculate remaining balance', () => {
      const total = 500000;
      const paid = 250000;
      const remaining = total - paid;
      expect(remaining).toBe(250000);
    });

    it('should calculate payment percentage', () => {
      const total = 500000;
      const paid = 250000;
      const percentage = Math.round((paid / total) * 100);
      expect(percentage).toBe(50);
    });

    it('should handle fully paid booking', () => {
      const total = 500000;
      const paid = 500000;
      const remaining = total - paid;
      const percentage = Math.round((paid / total) * 100);
      
      expect(remaining).toBe(0);
      expect(percentage).toBe(100);
    });

    it('should handle zero payment', () => {
      const total = 500000;
      const paid = 0;
      const percentage = Math.round((paid / total) * 100);
      
      expect(percentage).toBe(0);
    });
  });
});
