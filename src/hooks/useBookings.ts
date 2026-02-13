import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Booking } from '../types';
import { electronBackend } from '../services/mockBackend';

/**
 * Hook للحصول على جميع الحجوزات
 * ✅ IMPROVED: Proper typing and return type
 */
export function useBookings() {
  return useQuery<Booking[], Error>({
    queryKey: ['bookings'],
    queryFn: async (): Promise<Booking[]> => {
      return await electronBackend.getBookings();
    },
  });
}

/**
 * Hook لإضافة حجز جديد
 * ✅ IMPROVED: Proper typing
 */
export function useAddBooking() {
  const queryClient = useQueryClient();
  
  return useMutation<Booking, Error, Booking>({
    mutationFn: async (newBooking: Booking): Promise<Booking> => {
      // Note: App.tsx calls electronBackend.addBooking directly, then calls mutate
      // This mutation is for cache invalidation only
      return newBooking; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook لتحديث حجز موجود
 * ✅ IMPROVED: Proper typing
 */
interface UpdateBookingVars {
  id: string;
  updates: Partial<Booking>;
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation<UpdateBookingVars, Error, UpdateBookingVars>({
    mutationFn: async ({ id, updates }: UpdateBookingVars): Promise<UpdateBookingVars> => {
      // Note: App.tsx calls electronBackend.updateBooking directly, then calls mutate
      // This mutation is for cache invalidation only
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook لحذف حجز
 * ✅ IMPROVED: Proper typing
 */
export function useDeleteBooking() {
  const queryClient = useQueryClient();
  
  return useMutation<string, Error, string>({
    mutationFn: async (id: string): Promise<string> => {
      // Note: App.tsx calls electronBackend.deleteBooking directly, then calls mutate
      // This mutation is for cache invalidation only
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook للحصول على حجز واحد بالـ ID
 * ✅ IMPROVED: Proper typing
 */
export function useBooking(id: string) {
  return useQuery<Booking | undefined, Error>({
    queryKey: ['booking', id],
    queryFn: async (): Promise<Booking | undefined> => {
      const bookings = await electronBackend.getBookings();
      return bookings.find((b: Booking) => b.id === id);
    },
    enabled: !!id,
  });
}
