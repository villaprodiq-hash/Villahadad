import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Phone, MoreVertical, Edit, Trash2 } from 'lucide-react';

// TypeScript Interfaces
interface Booking {
  id: string;
  clientName: string;
  type: 'wedding' | 'studio' | 'event';
  time: string;
  price: number;
  phone: string;
  location?: string;
}

interface BookingCalendarProps {
  bookings?: Booking[];
  onEdit?: (booking: Booking) => void;
  onDelete?: (bookingId: string) => void;
}

// Mock Data
const MOCK_BOOKINGS: Booking[] = [
  { id: '1', clientName: 'أحمد ومريم', type: 'wedding', time: '10:00', price: 5000000, phone: '07701234567', location: 'قاعة الزهراء' },
  { id: '2', clientName: 'علي الخفاجي', type: 'studio', time: '14:00', price: 1500000, phone: '07709876543' },
  { id: '3', clientName: 'سارة وحسين', type: 'wedding', time: '18:00', price: 6000000, phone: '07701111222', location: 'فندق بابل' },
  { id: '4', clientName: 'فاطمة محمد', type: 'event', time: '16:00', price: 2000000, phone: '07702222333', location: 'مركز المؤتمرات' },
];

const BookingCalendar: React.FC<BookingCalendarProps> = ({ 
  bookings = MOCK_BOOKINGS,
  onEdit,
  onDelete 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Calculate if we need 5 or 6 rows
  const getCalendarRows = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalCells = daysInMonth + firstDay;
    return Math.ceil(totalCells / 7);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const rows = getCalendarRows();
    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Fill remaining cells to complete the grid
    const totalCells = rows * 7;
    while (days.length < totalCells) {
      days.push(null);
    }

    return days;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (day: number) => {
    // For demo, show bookings on specific days
    if (day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth()) {
      return bookings;
    }
    return [];
  };

  // Get bookings for selected date
  const selectedDateBookings = getBookingsForDate(selectedDate.getDate());

  // Type badge colors
  const getTypeBadge = (type: string) => {
    const badges = {
      wedding: { bg: 'bg-[#C94557]/10', text: 'text-[#C94557]', label: 'زفاف' },
      studio: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'ستوديو' },
      event: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'مناسبة' },
    };
    return badges[type as keyof typeof badges] || badges.wedding;
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Arabic month names
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="flex gap-4 h-full bg-[#09090b] p-6 rounded-3xl" dir="rtl">
      {/* Sidebar - Daily View */}
      <div className="w-[340px] flex flex-col gap-4">
        {/* Selected Date Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[#18181b] border border-white/5 p-6">
          {/* Decorative Blur Background */}
          <div className="absolute inset-0 bg-linear-to-br from-[#C94557]/20 to-transparent blur-3xl opacity-30"></div>
          
          <div className="relative z-10">
            <p className="text-gray-400 text-sm mb-1">التاريخ المحدد</p>
            <h2 className="text-3xl font-bold text-white">
              {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{dayNames[selectedDate.getDay()]}</p>
          </div>
        </div>

        {/* Bookings List */}
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {selectedDateBookings.length > 0 ? (
            selectedDateBookings.map((booking) => {
              const badge = getTypeBadge(booking.type);
              return (
                <div 
                  key={booking.id}
                  className="bg-[#18181b] border border-white/5 rounded-xl p-4 hover:border-[#C94557]/30 transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm mb-1">{booking.clientName}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    
                    {/* Three-Dots Menu */}
                    <div className="relative" ref={openMenuId === booking.id ? menuRef : null}>
                      <button
                        onMouseDown={(e) => e.stopPropagation()} // CRITICAL: Prevents menu flicker
                        onClick={() => setOpenMenuId(openMenuId === booking.id ? null : booking.id)}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                      
                      {openMenuId === booking.id && (
                        <div className="absolute left-0 top-full mt-1 w-32 bg-[#18181b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                          <button
                            onClick={() => {
                              onEdit?.(booking);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-right text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
                          >
                            <Edit size={14} />
                            تعديل
                          </button>
                          <button
                            onClick={() => {
                              onDelete?.(booking.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-right text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} />
                            حذف
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time & Price */}
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="text-gray-400">{booking.time}</span>
                    <span className="text-[#C94557] font-semibold">{booking.price.toLocaleString()} IQD</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-xs font-medium">
                      <Phone size={14} />
                      اتصال
                    </button>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
              <p>لا توجد حجوزات</p>
              <p className="text-xs mt-1">في هذا اليوم</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col bg-[#18181b] border border-white/5 rounded-2xl p-6">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day.substring(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={`grid grid-cols-7 gap-2 flex-1`}>
          {generateCalendarDays().map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className=""></div>;
            }

            const isToday = 
              day === new Date().getDate() && 
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear();

            const isSelected = 
              day === selectedDate.getDate() && 
              currentDate.getMonth() === selectedDate.getMonth() &&
              currentDate.getFullYear() === selectedDate.getFullYear();

            const dayBookings = getBookingsForDate(day);
            const hasBookings = dayBookings.length > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center
                  transition-all hover:bg-white/5 border
                  ${isSelected ? 'bg-[#C94557] border-[#C94557] text-white' : 'border-white/5 text-gray-300'}
                  ${isToday && !isSelected ? 'border-[#C94557]/50' : ''}
                `}
              >
                <span className={`text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                  {day}
                </span>
                
                {/* Booking Indicators */}
                {hasBookings && !isSelected && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayBookings.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-[#C94557]"></div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default BookingCalendar;
