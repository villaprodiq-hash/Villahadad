
import React from 'react';
import { Booking, BookingStatus, BookingCategory, User } from '../../../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Camera, Briefcase, Gift, Globe } from 'lucide-react';
import ClientBadge from '../../shared/ClientBadge';

interface ReceptionTimelineWidgetProps {
    bookings: Booking[];
    users?: User[];
    viewMode: 'daily' | 'weekly' | 'monthly';
    setViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    weekOffset: number;
    setWeekOffset: (offset: number) => void;
    weekDays: any[];
    selectedDateBookings: Booking[];
    weekBookings: any[];
    monthBookings: any[][];
    currentMonth: string;
    currentDay: string;
    onSelectBooking: (booking: Booking) => void;
    isManager?: boolean;
}

const ReceptionTimelineWidget: React.FC<ReceptionTimelineWidgetProps> = ({
    bookings = [],
    users = [],
    viewMode = 'daily',
    setViewMode = () => {},
    selectedDate = new Date(),
    setSelectedDate = () => {},
    weekOffset = 0,
    setWeekOffset = () => {},
    weekDays = [],
    selectedDateBookings = [],
    weekBookings = [],
    monthBookings = [],
    currentMonth = '',
    currentDay = '',
    onSelectBooking = () => {},
    isManager = false
}) => {
  
  const getCategoryIcon = (booking: Booking) => {
    const iconSize = 10;
    switch (booking?.category) {
      case BookingCategory.WEDDING: return <Camera size={iconSize} className="text-[#C94557]" />;
      case BookingCategory.STUDIO: return <Briefcase size={iconSize} className="text-blue-400" />;
      case BookingCategory.BIRTHDAY: return <Gift size={iconSize} className="text-yellow-400" />;
      default: return <Camera size={iconSize} className="text-gray-400" />;
    }
  };

  const getCreatorInfo = (booking: Booking) => {
      if (booking.source === 'website') return { type: 'web', label: 'Online' };
      if (booking.created_by) {
          const u = users.find(user => user.id === booking.created_by);
          return { type: 'staff', label: u?.name || 'Unknown', user: u };
      }
      return null;
  };

  const handleBookingClick = (booking: Booking) => {
    onSelectBooking(booking);
  };

  return (
    <div className={`${isManager ? 'bg-[#1a1c22] rounded-xl p-5' : 'bg-[#1E1E1E]/80 backdrop-blur-xl rounded-4xl p-3'} border border-white/10 shadow-2xl h-full overflow-hidden flex flex-col relative`} dir="rtl">
      
      <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="shrink-0 mb-3 relative z-10 px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-linear-to-br from-[#C94557] to-[#B3434F] rounded-lg text-white shadow-lg shadow-[#C94557]/20">
              <CalendarIcon size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">الجدول الزمني</h3>
              <p className="text-[9px] text-gray-400 font-medium">{currentMonth} {currentDay}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
            {['daily', 'weekly', 'monthly'].map((mode) => (
                <button 
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`flex-1 px-1 py-1 rounded-md text-[9px] font-bold transition-all ${
                    viewMode === mode 
                    ? 'bg-[#C94557] text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                >
                {mode === 'daily' ? 'يومي' : mode === 'weekly' ? 'أسبوعي' : 'شهري'}
                </button>
            ))}
          </div>
          
          <input 
            type="date" 
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:border-[#C94557]/50 focus:bg-black/20 transition-all"
          />
        </div>
      </div>
      
      {viewMode === 'daily' && (
        <>
           {/* Weekdays Header */}
          <div className="grid grid-cols-6 gap-1 mb-2 bg-black/20 p-1.5 rounded-lg border border-white/5 shrink-0">
            {weekDays && weekDays.map((day) => (
               <button 
                 key={day?.number ?? Math.random()}
                 onClick={() => day?.date && setSelectedDate(day.date)}
                 className={`flex flex-col items-center gap-0.5 py-1 rounded-md transition-all ${
                   day?.isSelected ? 'bg-[#C94557] text-white shadow-lg shadow-[#C94557]/20 scale-105' : 
                   day?.isToday ? 'bg-[#C94557]/10 text-[#C94557] border border-[#C94557]/20' : 
                   'hover:bg-white/5 text-gray-500'
                 }`}
               >
                 <span className="text-[8px] font-bold uppercase opacity-80">{day?.dayName}</span>
                 <span className="text-[10px] font-black">{day?.number}</span>
               </button>
             ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative pr-1">
            {selectedDateBookings.length > 0 ? (
              <div className="relative py-2 px-1">
                {/* Axis Line */}
                <div className="absolute right-1/2 transform translate-x-1/2 top-0 bottom-0 w-px bg-linear-to-b from-white/5 via-white/20 to-white/5"></div>
                
                <div className="space-y-6"> 
                  {selectedDateBookings.map((booking, index) => {
                    const time = booking.details?.startTime || '00:00';
                    const isEven = index % 2 === 0; 
                    const creator = getCreatorInfo(booking);

                    return (
                      <div key={booking.id} className={`flex items-center w-full ${!isEven ? 'flex-row-reverse' : ''}`}>
                        
                        {/* Card */}
                        <div className="w-[44%]">
                            <div 
                              onClick={() => handleBookingClick(booking)}
                              className={`
                                relative p-2 rounded-lg bg-[#252525] border border-white/5 hover:border-[#C94557]/50
                                transition-all cursor-pointer group shadow-lg overflow-hidden flex flex-col justify-between min-h-[60px]
                                ${isEven ? 'ml-1 text-right border-r-2 border-r-[#C94557]' : 'mr-1 text-left border-l-2 border-l-[#C94557]'}
                              `}
                            >
                              {/* Content Header */}
                              <div className={`flex justify-between items-start mb-1 gap-1 ${isEven ? '' : 'flex-row-reverse'}`}>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="text-[10px] font-bold text-white group-hover:text-[#C94557] transition-colors leading-tight truncate flex items-center gap-1.5">
                                          {booking?.clientName}
                                          <ClientBadge booking={booking} allBookings={bookings} compact />
                                      </h4>
                                      <span className="text-[8px] text-gray-400 mt-0.5 block truncate opacity-80">
                                          {booking?.title}
                                      </span>
                                  </div>
                                  <div className="bg-black/20 p-1 rounded border border-white/5 shrink-0">
                                      {getCategoryIcon(booking)}
                                  </div>
                              </div>

                              {/* Footer Status & Attribution */}
                              <div className={`flex items-center mt-1 justify-between ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                                   
                                   {/* Status Badge */}
                                   <span className={`text-[8px] px-1.5 py-px rounded border font-medium whitespace-nowrap ${
                                        booking?.status === BookingStatus.SHOOTING ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        booking?.status === BookingStatus.CONFIRMED ? 'bg-[#C94557]/10 text-[#C94557] border-[#C94557]/20' :
                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                   }`}>
                                      {booking?.status === BookingStatus.SHOOTING ? 'جاري' :
                                       booking?.status === BookingStatus.CONFIRMED ? 'مؤكد' : 'منتهي'}
                                   </span>

                                   {/* Staff Attribution */}
                                   {creator && (
                                       <div className="flex items-center gap-1 opacity-60" title={creator.type === 'web' ? 'Online Booking' : `Created by ${creator.label}`}>
                                           {creator.type === 'web' ? (
                                               <Globe size={8} className="text-emerald-400" />
                                           ) : (
                                               <div className="w-3 h-3 rounded-full bg-gray-600 flex items-center justify-center text-[6px] font-bold text-white border border-white/10">
                                                   {creator.label.charAt(0)}
                                               </div>
                                           )}
                                       </div>
                                   )}
                              </div>
                            </div>
                        </div>

                        {/* Middle Axis Dot */}
                        <div className="w-[12%] flex flex-col items-center justify-center relative z-10">
                            <div className="w-2.5 h-2.5 bg-[#C94557] rounded-full border-2 border-[#1E1E1E] shadow-[0_0_8px_#C94557]"></div>
                            <span className="mt-1 text-[8px] font-mono font-bold text-gray-400 bg-[#1E1E1E] px-1 py-px rounded border border-white/10 whitespace-nowrap z-20">
                                {time}
                            </span>
                        </div>

                        {/* Spacer */}
                        <div className="w-[44%]"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
                <CalendarIcon size={30} className="text-gray-600 mb-2" />
                <p className="text-gray-500 text-[10px]">لا توجد حجوزات</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Weekly & Monthly Views - No changes needed, too small for attribution */}
      {(viewMode === 'weekly' || viewMode === 'monthly') && (
         <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1">
            {viewMode === 'weekly' && (
                <div className="space-y-1.5">
                     <div className="flex items-center justify-between mb-2 px-1">
                        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1 hover:bg-white/10 rounded-md"><ChevronRight size={14} className="text-gray-400" /></button>
                        <span className="text-[10px] font-bold text-white">أسبوع {Math.abs(weekOffset) + 1}</span>
                        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1 hover:bg-white/10 rounded-md"><ChevronLeft size={14} className="text-gray-400" /></button>
                    </div>
                  {weekBookings && weekBookings.map((day, index) => (
                      <div key={index} className="bg-white/5 hover:bg-white/[0.07] rounded-lg p-2 border border-white/5">
                           <div className="flex items-center justify-between mb-1">
                               <div>
                                   <span className="text-[9px] font-bold text-[#C94557] ml-1">{day?.date?.toLocaleDateString('ar-IQ', { weekday: 'short' })}</span>
                                   <span className="text-[9px] text-gray-400">{day?.date?.getDate()}</span>
                               </div>
                               {day?.bookings?.length > 0 && <span className="text-[8px] bg-[#C94557] text-white px-1 rounded">{day.bookings.length}</span>}
                           </div>
                           {day?.bookings?.slice(0, 3).map((b: any) => (
                               <div key={b.id} onClick={() => onSelectBooking(b)} className="text-[8px] text-gray-300 py-0.5 truncate cursor-pointer hover:text-[#C94557]">• {b.clientName}</div>
                           ))}
                       </div>
                  ))}
                </div>
            )}

            {viewMode === 'monthly' && (
                <div className="space-y-1">
                     <div className="mb-2 text-center">
                         <span className="text-[10px] font-bold text-white bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{selectedDate?.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}</span>
                     </div>
                     {monthBookings && monthBookings.map((week, wIndex) => (
                          <div key={wIndex} className="grid grid-cols-7 gap-0.5">
                              {week && week.map((day: any, dIndex: number) => (
                                   <div 
                                       key={dIndex}
                                       onClick={() => { if(day?.date) { setSelectedDate(day.date); setViewMode('daily'); } }}
                                       className={`
                                           h-8 rounded-md flex flex-col items-center justify-center cursor-pointer border border-transparent
                                           ${!day?.date ? 'invisible' : ''}
                                           ${day?.count > 0 ? 'bg-[#C94557]/10 border-[#C94557]/20 hover:bg-[#C94557]/20' : 'bg-white/5 hover:bg-white/10 hover:border-white/10'}
                                       `}
                                   >
                                       {day?.date && (
                                           <>
                                               <span className={`text-[8px] font-bold ${day?.count > 0 ? 'text-[#C94557]' : 'text-gray-400'}`}>{day.date.getDate()}</span>
                                               {day?.count > 0 && <span className="w-1 h-1 rounded-full bg-[#C94557] mt-0.5"/>}
                                           </>
                                       )}
                                   </div>
                               ))}
                          </div>
                     ))}
                 </div>
             )}
         </div>
      )}

    </div>
  );
};

export default React.memo(ReceptionTimelineWidget);