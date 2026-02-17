
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Booking, User } from '../../../types';
import ReceptionBookingCalendar from '../dashboard/ReceptionBookingCalendar';
import ReceptionPageWrapper from '../layout/ReceptionPageWrapper';
import { ErrorBoundary } from '../../shared/ErrorBoundary';

interface MyBookingsViewProps {
  bookings: Booking[];
  onAddBooking: () => void;
  onSelectBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => Promise<void> | void;
  onEditBooking: (bookingId: string) => void; // Add this
  onUpdateStatus: (id: string, newStatus: Booking['status']) => void;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => void;
  defaultViewMode?: 'board' | 'list' | 'schedule';
  isDraggable?: boolean;
  onDateClick?: (date: Date) => void;
  onViewBooking?: (id: string) => void;
  isReception?: boolean;
  isManager?: boolean;
  users?: User[]; // Add users list for photographer switcher
}

const ReceptionBookingsView: React.FC<MyBookingsViewProps> = ({ 
    bookings, 
    onAddBooking, 
    onDeleteBooking,
    onEditBooking, // Add this
    onUpdateBooking, 
    isDraggable = false,
    onDateClick,
    onViewBooking,
    isReception = true,
    isManager = false,
    users = [] // Add users with default
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleDateClick = (date: Date) => {
    // استدعاء callback الذي يمرر التاريخ ويفتح modal الاختيار
    if (onDateClick) {
      onDateClick(date);
    }
    // لا حاجة لاستدعاء onAddBooking() هنا لأن onDateClick يقوم بذلك
  };

  return (
    <ReceptionPageWrapper isDraggable={isDraggable} isReception={isReception} isManager={isManager}>
    <div className="flex flex-col h-full animate-in fade-in" dir="rtl">
      {/* Action Bar */}
      <div className={`flex items-center justify-between mb-4 gap-2 ${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 shadow-sm ring-1 ring-white/60' : 'bg-[#1a1c22] border-white/5 shadow-[8px_8px_16px_#111216,-8px_-8px_16px_#23262e]'} p-2 rounded-4xl border shrink-0`}>
          <div className="flex items-center gap-2">
              <button 
                data-testid="add-booking-btn"
                onClick={onAddBooking} 
                className={`px-5 py-2.5 ${isManager ? 'bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20' : 'bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'} text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg`}
              >
                <Plus size={18} />
                <span>إضافة حجز جديد</span>
              </button>
          </div>

          <div className="flex-1 relative mx-2">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <input type="text" placeholder="بحث باسم العميل أو العنوان..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className={`w-full ${isManager ? 'bg-white/50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-amber-400' : 'bg-black/20 border-white/5 text-gray-300 focus:border-pink-500/30'} border rounded-xl pr-10 pl-4 py-2.5 text-[11px] outline-none transition-colors`} />
          </div>

      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
          <ErrorBoundary name="Reception Calendar">
            <ReceptionBookingCalendar 
                bookings={bookings}
                searchQuery={searchTerm} 
                onDateClick={handleDateClick}
                onDeleteBooking={onDeleteBooking}
                onEditBooking={onEditBooking} 
                onViewBooking={onViewBooking}
                users={users}
                onUpdateBooking={onUpdateBooking}
            />
          </ErrorBoundary>
      </div>
    </div>
    </ReceptionPageWrapper>
  );
};

export default ReceptionBookingsView;
