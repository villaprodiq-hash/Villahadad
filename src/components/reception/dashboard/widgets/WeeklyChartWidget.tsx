import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../../../../types';
import { formatMoney } from '../../../../utils/formatMoney';
import { CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface WeeklyChartWidgetProps {
  bookings: Booking[];
  isManager?: boolean;
}

const WeeklyChartWidget: React.FC<WeeklyChartWidgetProps> = ({ bookings, isManager = false }) => {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => {
    const days = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 1) % 7) + (weekOffset * 7));
    
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      day.setHours(0, 0, 0, 0);
      
      const dayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.shootDate);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === day.getTime();
      });
      
      const totalSlots = 16; // 8 hours * 2 (30-min slots)
      const bookedSlots = dayBookings.length;
      const percentage = Math.min((bookedSlots / totalSlots) * 100, 100);
      
      const isToday = day.toDateString() === today.toDateString();
      const isPast = day < today && !isToday;
      const isFuture = day > today;
      
      // Check for cancelled/postponed bookings
      const hasProblems = dayBookings.some(b => 
        b.status === BookingStatus.ARCHIVED || b.status === BookingStatus.CLIENT_DELAY
      );
      
      // Determine color based on logic
      let barColor = '#4B5563'; // Default grey
      let showCheckmark = false;
      let showWarning = false;
      
      if (isPast) {
        if (percentage === 100 && !hasProblems) {
          barColor = '#10B981'; // Green - fully completed
          showCheckmark = true;
        } else if (hasProblems) {
          barColor = '#F59E0B'; // Amber - had issues
          showWarning = true;
        } else if (percentage >= 70) {
          barColor = '#10B981'; // Green - good day
          showCheckmark = true;
        }
      } else if (isToday) {
        if (percentage >= 100) {
          barColor = '#EF4444'; // Red - overbooked
        } else if (percentage >= 70) {
          barColor = '#FF5722'; // Orange - busy
        } else {
          barColor = '#3B82F6'; // Blue - today
        }
      } else if (isFuture) {
        if (percentage >= 100) {
          barColor = '#EF4444'; // Red - fully booked
        } else if (percentage >= 70) {
          barColor = '#FF5722'; // Orange - busy
        } else {
          barColor = '#6B7280'; // Grey - available
        }
      }
      
      days.push({
        nameEn: dayNamesEn[i],
        nameAr: dayNamesAr[i],
        date: day.getDate(),
        bookedSlots,
        totalSlots,
        percentage,
        barColor,
        showCheckmark,
        showWarning,
        isToday,
        isPast,
        isFuture
      });
    }
    
    return days;
  }, [bookings, weekOffset]);

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => setWeekOffset(prev => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  return (
    <div className={`w-full h-full ${isManager ? 'bg-[#1a1c22] rounded-xl border border-white/10 shadow-2xl' : 'bg-[#262626] rounded-2xl p-4'} flex flex-col gap-3 relative overflow-hidden ${isManager ? 'p-5' : ''}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" 
           style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='nw'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23nw)'/%3E%3C/svg%3E")`, backgroundSize: '150px'}} />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <button
          onClick={goToPreviousWeek}
          className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#FF5722] transition-colors"
          style={{ boxShadow: 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #272727' }}
        >
          <ChevronLeft size={14} className="text-gray-400" />
        </button>
        
        <div className="text-center">
          <h3 className="text-sm font-bold text-white">حجوزات الأسبوع</h3>
          {weekOffset !== 0 && (
            <button
              onClick={goToCurrentWeek}
              className="text-[9px] text-[#FF5722] hover:underline"
            >
              العودة للأسبوع الحالي
            </button>
          )}
        </div>
        
        <button
          onClick={goToNextWeek}
          className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#FF5722] transition-colors"
          style={{ boxShadow: 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #272727' }}
        >
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-end justify-between gap-2 relative z-10">
        {weekData.map((day, index) => (
          <motion.div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Icon (Checkmark or Warning) */}
            <div className="h-4 flex items-center justify-center">
              {day.showCheckmark && (
                <CheckCircle size={12} className="text-[#10B981]" />
              )}
              {day.showWarning && (
                <AlertCircle size={12} className="text-[#F59E0B]" />
              )}
            </div>
            
            {/* Bar Container */}
            <div className="w-full flex flex-col items-center justify-end relative" style={{ height: '80px' }}>
              {/* Background Bar (Total Capacity) */}
              <div 
                className="absolute bottom-0 w-full rounded-full bg-[#1a1a1a]"
                style={{
                  height: '100%',
                  boxShadow: 'inset 2px 2px 4px #0d0d0d, inset -2px -2px 4px #1f1f1f'
                }}
              />
              
              {/* Fill Bar (Booked Time) */}
              <motion.div
                className="absolute bottom-0 w-full rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: day.barColor,
                  boxShadow: day.percentage > 0 ? `0 0 8px ${day.barColor}40` : 'none'
                }}
                initial={{ height: 0 }}
                animate={{ height: `${day.percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                {/* Percentage Text */}
                {day.percentage > 15 && (
                  <span className="text-[9px] font-bold text-white z-10">
                    {Math.round(day.percentage)}%
                  </span>
                )}
              </motion.div>
            </div>
            
            {/* Day Label */}
            <div className="text-center">
              <div className={`text-[10px] font-bold ${
                day.isToday ? 'text-[#3B82F6]' : 
                day.showCheckmark ? 'text-[#10B981]' : 
                'text-gray-500'
              }`}>
                {day.nameEn}
              </div>
              <div className="text-[8px] text-gray-600">{day.date}</div>
            </div>
            
            {/* Slots Info */}
            <div className="text-[7px] text-gray-600 text-center">
              {day.bookedSlots}/{day.totalSlots}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-[8px] relative z-10">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-gray-500">مكتمل</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF5722]" />
          <span className="text-gray-500">مشغول</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span className="text-gray-500">ممتلئ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          <span className="text-gray-500">اليوم</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChartWidget;
