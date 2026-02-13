import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/useAppStore';
import { BookingCategory, BookingStatus, UserRole } from '../types';
import type { User, Booking } from '../types';

describe('Zustand AppStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useAppStore.setState({
      currentUser: null,
      bookings: [],
      isSidebarCollapsed: false,
      activeView: 'dashboard',
    });
  });

  // ============ User State ============
  describe('User State', () => {
    it('should start with null user', () => {
      const { currentUser } = useAppStore.getState();
      expect(currentUser).toBeNull();
    });

    it('should set current user', () => {
      const user: User = {
        id: 'user-1',
        name: 'سورة',
        role: UserRole.MANAGER,
      };

      useAppStore.getState().setCurrentUser(user);
      
      const { currentUser } = useAppStore.getState();
      expect(currentUser).toEqual(user);
      expect(currentUser?.name).toBe('سورة');
      expect(currentUser?.role).toBe(UserRole.MANAGER);
    });

    it('should logout user (set to null)', () => {
      const user: User = { id: 'user-1', name: 'Test', role: UserRole.RECEPTION };
      
      useAppStore.getState().setCurrentUser(user);
      expect(useAppStore.getState().currentUser).not.toBeNull();
      
      useAppStore.getState().setCurrentUser(null);
      expect(useAppStore.getState().currentUser).toBeNull();
    });
  });

  // ============ Bookings State ============
  describe('Bookings State', () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      clientName: 'أحمد محمد',
      clientId: 'client-1',
      clientPhone: '07801234567',
      title: 'حفل زفاف',
      category: BookingCategory.WEDDING,
      shootDate: '2026-02-01',
      status: BookingStatus.CONFIRMED,
      totalAmount: 500000,
      paidAmount: 250000,
      currency: 'IQD',
      servicePackage: 'Gold',
      location: 'Studio',
    };

    it('should start with empty bookings', () => {
      const { bookings } = useAppStore.getState();
      expect(bookings).toEqual([]);
    });

    it('should set bookings array', () => {
      const bookingsArray = [mockBooking];
      
      useAppStore.getState().setBookings(bookingsArray);
      
      const { bookings } = useAppStore.getState();
      expect(bookings).toHaveLength(1);
      expect(bookings[0].clientName).toBe('أحمد محمد');
    });

    it('should add a booking', () => {
      useAppStore.getState().addBooking(mockBooking);
      
      const { bookings } = useAppStore.getState();
      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('booking-1');
    });

    it('should add multiple bookings', () => {
      const booking2: Booking = { ...mockBooking, id: 'booking-2', clientName: 'فاطمة علي' };
      
      useAppStore.getState().addBooking(mockBooking);
      useAppStore.getState().addBooking(booking2);
      
      const { bookings } = useAppStore.getState();
      expect(bookings).toHaveLength(2);
    });

    it('should update a booking', () => {
      useAppStore.getState().addBooking(mockBooking);
      
      useAppStore.getState().updateBooking('booking-1', {
        status: BookingStatus.SHOOTING,
        paidAmount: 400000,
      });
      
      const { bookings } = useAppStore.getState();
      expect(bookings[0].status).toBe(BookingStatus.SHOOTING);
      expect(bookings[0].paidAmount).toBe(400000);
      // Original fields should remain
      expect(bookings[0].clientName).toBe('أحمد محمد');
    });

    it('should delete a booking', () => {
      const booking2: Booking = { ...mockBooking, id: 'booking-2' };
      
      useAppStore.getState().addBooking(mockBooking);
      useAppStore.getState().addBooking(booking2);
      expect(useAppStore.getState().bookings).toHaveLength(2);
      
      useAppStore.getState().deleteBooking('booking-1');
      
      const { bookings } = useAppStore.getState();
      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('booking-2');
    });

    it('should not affect other bookings when updating one', () => {
      const booking2: Booking = { ...mockBooking, id: 'booking-2', clientName: 'فاطمة' };
      
      useAppStore.getState().addBooking(mockBooking);
      useAppStore.getState().addBooking(booking2);
      
      useAppStore.getState().updateBooking('booking-1', { status: BookingStatus.DELIVERED });
      
      const { bookings } = useAppStore.getState();
      expect(bookings[0].status).toBe(BookingStatus.DELIVERED);
      expect(bookings[1].status).toBe(BookingStatus.CONFIRMED); // Unchanged
    });
  });

  // ============ UI State ============
  describe('UI State', () => {
    it('should start with sidebar expanded', () => {
      const { isSidebarCollapsed } = useAppStore.getState();
      expect(isSidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar', () => {
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(true);
      
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    });

    it('should start with dashboard view', () => {
      const { activeView } = useAppStore.getState();
      expect(activeView).toBe('dashboard');
    });

    it('should change active view', () => {
      useAppStore.getState().setActiveView('bookings');
      expect(useAppStore.getState().activeView).toBe('bookings');
      
      useAppStore.getState().setActiveView('gallery');
      expect(useAppStore.getState().activeView).toBe('gallery');
    });
  });

  // ============ Integration Tests ============
  describe('Integration', () => {
    it('should handle complete booking workflow', () => {
      // 1. Login
      const user: User = { id: 'rec-1', name: 'علي', role: UserRole.RECEPTION };
      useAppStore.getState().setCurrentUser(user);
      
      // 2. Add booking
      const booking: Booking = {
        id: 'b-1',
        clientName: 'زينب',
        clientId: 'c-1',
        clientPhone: '07801111111',
        title: 'جلسة تصوير',
        category: BookingCategory.STUDIO,
        shootDate: '2026-03-01',
        status: BookingStatus.INQUIRY,
        totalAmount: 300000,
        paidAmount: 0,
        currency: 'IQD',
        servicePackage: 'Basic',
        location: 'Studio',
      };
      useAppStore.getState().addBooking(booking);
      
      // 3. Update to confirmed with payment
      useAppStore.getState().updateBooking('b-1', {
        status: BookingStatus.CONFIRMED,
        paidAmount: 150000,
      });
      
      // 4. Verify state
      const state = useAppStore.getState();
      expect(state.currentUser?.name).toBe('علي');
      expect(state.bookings[0].status).toBe(BookingStatus.CONFIRMED);
      expect(state.bookings[0].paidAmount).toBe(150000);
    });
  });
});
