
import React, { useState, useMemo } from 'react';
import { Booking, BookingCategory, CategoryLabels } from '../types';
import { ChevronRight, ChevronLeft, Calendar, Clock, MapPin, X, Bell, User, Video, AlignLeft, Layers, Users } from 'lucide-react';

interface ScheduleSectionProps {
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({ bookings, onSelectBooking }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Helper to format date consistently as YYYY-MM-DD (Local)
  const toDateString = (date: Date) => {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  };

  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setSelectedDate(d);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  // Filter and Sort Bookings
  const displayedBookings = useMemo(() => {
    let filtered: Booking[] = [];

    if (viewMode === 'day') {
      const targetStr = toDateString(selectedDate);
      filtered = bookings.filter(b => b.shootDate === targetStr);
    } else {
      const curr = new Date(selectedDate);
      const dayInWeek = curr.getDay(); 
      const startOfWeek = new Date(curr);
      const diff = (dayInWeek + 1) % 7; 
      startOfWeek.setDate(curr.getDate() - diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      filtered = bookings.filter(b => {
        const bDate = new Date(b.shootDate);
        bDate.setHours(0,0,0,0);
        const s = new Date(startOfWeek); s.setHours(0,0,0,0);
        const e = new Date(endOfWeek); e.setHours(23,59,59,999);
        return bDate >= s && bDate <= e;
      });
    }

    filtered = filtered.filter(b => !dismissedIds.has(b.id));

    return filtered.sort((a, b) => {
      const dateA = new Date(a.shootDate).getTime();
      const dateB = new Date(b.shootDate).getTime();
      if (dateA !== dateB) return dateB - dateA;

      const timeA = a.details?.startTime || '00:00';
      const timeB = b.details?.startTime || '00:00';
      return timeB.localeCompare(timeA);
    });

  }, [bookings, selectedDate, viewMode, dismissedIds]);

  const getDateLabel = () => {
    if (viewMode === 'day') {
      const today = new Date();
      if (toDateString(selectedDate) === toDateString(today)) return 'اليوم';
      
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      if (toDateString(selectedDate) === toDateString(tomorrow)) return 'غداً';

      return selectedDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' });
    } else {
       const curr = new Date(selectedDate);
       const dayInWeek = curr.getDay(); 
       const diff = (dayInWeek + 1) % 7; 
       const startOfWeek = new Date(curr);
       startOfWeek.setDate(curr.getDate() - diff);
       const endOfWeek = new Date(startOfWeek);
       endOfWeek.setDate(startOfWeek.getDate() + 6);
       
       return `${startOfWeek.getDate()} - ${endOfWeek.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
    }
  };

  return (
    <div className="bg-[#121212] rounded-[24px] h-full flex flex-col relative overflow-hidden shadow-2xl border border-white/5 font-sans">
        
        <div className="p-5 pb-2 shrink-0 z-20 bg-[#121212]/90 backdrop-blur-sm sticky top-0">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
                    <Bell size={20} />
                  </div>
                  جدول الحجوزات
                </h3>
                
                <div className="flex bg-[#262626] rounded-lg p-1 border border-white/5">
                   <button 
                     onClick={() => setViewMode('day')}
                     className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                     يوم
                   </button>
                   <button 
                     onClick={() => setViewMode('week')}
                     className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                     أسبوع
                   </button>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
                <button onClick={handlePrev} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                   <ChevronRight size={20} />
                </button>
                <div className="flex flex-col items-center">
                   <span className="text-lg font-bold text-white">{getDateLabel()}</span>
                   <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      {viewMode === 'day' ? selectedDate.getFullYear() : 'عرض أسبوعي'}
                   </span>
                </div>
                <button onClick={handleNext} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                   <ChevronLeft size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 relative">
            {displayedBookings.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-40 gap-2">
                  <Layers size={48} strokeWidth={1} />
                  <p className="text-sm font-medium">لا توجد حجوزات في هذا الوقت</p>
               </div>
            ) : (
               displayedBookings.map(booking => (
                  <NotificationCard 
                    key={booking.id} 
                    booking={booking} 
                    onClick={() => onSelectBooking(booking)}
                    onDismiss={(e) => handleDismiss(e, booking.id)}
                  />
               ))
            )}
        </div>
    </div>
  );
};

interface NotificationCardProps {
  booking: Booking;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ booking, onClick, onDismiss }) => {
  const timeStr = booking.details?.startTime || '12:00';
  
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const formattedTime = `${h12}:${mStr} ${suffix}`;

  const getIcon = () => {
     switch (booking.category) {
        case BookingCategory.WEDDING: return <Users size={16} />;
        case BookingCategory.GRADUATION: return <User size={16} />;
        case BookingCategory.TRANSACTION: return <AlignLeft size={16} />;
        default: return <Video size={16} />;
     }
  };

  const getCategoryColor = () => {
    switch(booking.category) {
        case BookingCategory.WEDDING: return 'text-blue-400';
        case BookingCategory.GRADUATION: return 'text-red-400';
        case BookingCategory.BIRTHDAY: return 'text-purple-400';
        default: return 'text-[#F7931E]';
    }
  };

  return (
    <div 
       onClick={onClick}
       className="relative group w-full bg-[#262626]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:bg-[#262626]/80 overflow-hidden"
    >
       <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

       <button 
         onClick={onDismiss}
         className="absolute top-2 left-2 p-1.5 rounded-full bg-white/10 text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20 scale-90 group-hover:scale-100"
         title="إزالة من العرض"
       >
         <X size={14} />
       </button>

       <div className="flex items-center justify-between mb-2 opacity-80">
          <div className="flex items-center gap-2">
             <div className={`p-1 rounded-md bg-white/10 ${getCategoryColor()}`}>
                {getIcon()}
             </div>
             <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">{CategoryLabels[booking.category]}</span>
          </div>
          <span className="text-[10px] font-medium text-gray-400">{formattedTime}</span>
       </div>

       <div className="pr-1">
          <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{booking.title}</h4>
          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
             {booking.clientName} 
             {booking.details?.hallName ? ` • ${booking.details.hallName}` : ''}
          </p>
       </div>

       {booking.details?.hallName && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-500">
             <MapPin size={10} />
             <span className="truncate">{booking.details.hallName}</span>
          </div>
       )}
    </div>
  );
};

export default ScheduleSection;
