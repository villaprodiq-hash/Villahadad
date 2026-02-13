import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingService } from '../BookingService';
import { BookingRepository } from '../../repositories/BookingRepository';
import { activityLogService } from '../ActivityLogService';
import { SyncQueueService } from '../../../sync/SyncQueue';

vi.mock('../../repositories/BookingRepository', () => ({
  BookingRepository: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../ActivityLogService', () => ({
  activityLogService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../../sync/SyncQueue', () => ({
  SyncQueueService: {
    enqueue: vi.fn(),
  },
}));

describe('BookingService Critical Path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a booking with valid data', async () => {
    const validBooking = {
      clientName: 'Mohamed',
      clientPhone: '0770',
      category: 'WEDDING',
      title: 'Wedding Shoot',
      totalAmount: 1000,
      paidAmount: 200,
      status: 'CONFIRMED',
    };

    const result = await bookingService.addBooking(validBooking);

    expect(result).toHaveProperty('id');
    expect(result.clientName).toBe('Mohamed');
    expect(BookingRepository.create).toHaveBeenCalled();
  });

  it('should fail if totalAmount is negative', async () => {
    const invalidBooking = {
      clientName: 'Mohamed',
      category: 'WEDDING',
      title: 'Wedding Shoot',
      totalAmount: -100,
      paidAmount: 0,
      status: 'CONFIRMED',
    };

    await expect(bookingService.addBooking(invalidBooking)).rejects.toThrow();
  });

  it('should fail if paidAmount exceeds totalAmount', async () => {
    const invalidBooking = {
      clientName: 'Mohamed',
      category: 'WEDDING',
      title: 'Wedding Shoot',
      totalAmount: 100,
      paidAmount: 200,
      status: 'CONFIRMED',
    };

    await expect(bookingService.addBooking(invalidBooking)).rejects.toThrow();
  });

  it('should sanitize input strings against XSS', async () => {
    const maliciousBooking = {
      clientName: "Mohamed <script>alert('xss')</script>",
      category: 'WEDDING',
      title: 'Wedding Shoot',
      totalAmount: 1000,
      paidAmount: 0,
      status: 'CONFIRMED',
    };

    const result = await bookingService.addBooking(maliciousBooking);
    expect(result.clientName).toBe('Mohamed ');
    expect(result.clientName).not.toContain('<script>');
  });
});
