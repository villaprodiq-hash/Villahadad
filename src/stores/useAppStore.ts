import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, Booking } from '../types';

interface AppStore {
  // User State
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Bookings State
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  
  // UI State
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

// ✅ IMPROVEMENT: Added devtools for better debugging in development
export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // User
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }, false, 'setCurrentUser'),
      
      // Bookings
      bookings: [],
      setBookings: (bookings) => set({ bookings }, false, 'setBookings'),
      addBooking: (booking) => set((state) => ({
        bookings: [...state.bookings, booking]
      }), false, 'addBooking'),
      updateBooking: (id, updates) => set((state) => ({
        bookings: state.bookings.map(b => 
          b.id === id ? { ...b, ...updates } : b
        )
      }), false, 'updateBooking'),
      deleteBooking: (id) => set((state) => ({
        bookings: state.bookings.filter(b => b.id !== id)
      }), false, 'deleteBooking'),
      
      // UI
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({
        isSidebarCollapsed: !state.isSidebarCollapsed
      }), false, 'toggleSidebar'),
      activeView: 'dashboard',
      setActiveView: (view) => set({ activeView: view }, false, 'setActiveView'),
    }),
    {
      name: 'VillaHadad-AppStore', // Name shown in Redux DevTools
      enabled: process.env.NODE_ENV === 'development', // Only in dev mode
    }
  )
);
