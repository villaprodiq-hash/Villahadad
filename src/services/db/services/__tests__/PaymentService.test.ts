import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../PaymentService';
import { PaymentRepository } from '../../repositories/PaymentRepository';
import { BookingRepository } from '../../repositories/BookingRepository';

vi.mock('../../repositories/PaymentRepository', () => ({
  PaymentRepository: {
    create: vi.fn(),
    getByBookingId: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../repositories/BookingRepository', () => ({
  BookingRepository: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

describe('PaymentService Critical Path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a payment and update booking paidAmount', async () => {
    const bookingId = 'bk_123';
    const paymentData = {
      amount: 500,
      method: 'Cash',
      collectedBy: 'Receptionist A',
    };

    const mockBooking = {
      id: bookingId,
      totalAmount: 1000,
      paidAmount: 200,
    };

    vi.mocked(BookingRepository.getById).mockResolvedValue(mockBooking as any);

    await paymentService.addPayment(bookingId, paymentData);

    expect(PaymentRepository.create).toHaveBeenCalled();
    expect(BookingRepository.update).toHaveBeenCalledWith(bookingId, {
      paidAmount: 700,
    });
  });

  it('should fail if payment amount is zero or negative', async () => {
    const bookingId = 'bk_123';
    const invalidPayment = {
      amount: 0,
      method: 'Cash',
      collectedBy: 'Receptionist A',
    };

    await expect(paymentService.addPayment(bookingId, invalidPayment)).rejects.toThrow();
  });

  it('should correctly settle remaining payment', async () => {
    const bookingId = 'bk_123';
    const mockBooking = {
      id: bookingId,
      totalAmount: 1000,
      paidAmount: 600,
    };

    vi.mocked(BookingRepository.getById).mockResolvedValue(mockBooking as any);

    await paymentService.settlePayment(bookingId, 'Admin');

    expect(PaymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 400,
        collectedBy: 'Admin',
      })
    );

    expect(BookingRepository.update).toHaveBeenCalledWith(bookingId, {
      paidAmount: 1000,
    });
  });
});
