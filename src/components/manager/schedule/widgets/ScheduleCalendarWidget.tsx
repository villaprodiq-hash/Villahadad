import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Booking } from '../../../../types';
import { GlowCard } from '../../../shared/GlowCard';

interface ScheduleCalendarWidgetProps {
  currentDate: Date;
  selectedDay: Date;
  bookings: Booking[];
  onMonthChange: (offset: number) => void;
  onDaySelect: (date: Date) => void;
}

const ScheduleCalendarWidget: React.FC<ScheduleCalendarWidgetProps> = ({ 
  currentDate, 
  selectedDay, 
  bookings, 
  onMonthChange, 
  onDaySelect 
}) => {
  // توليد أيام الشهر للعرض
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">الجدول الزمني</h1>
              <p className="text-gray-400 text-sm">تنظيم المواعيد وجلسات التصوير</p>
          </div>
          <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm hover:bg-white/10 transition-colors">يوم</button>
              <button className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">شهر</button>
          </div>
      </div>

      <GlowCard className="flex-1 p-6 bg-[#0c0c0e] border-white/5 relative overflow-hidden">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-white font-mono">
                  {format(currentDate, 'MMMM yyyy', { locale: ar })}
              </h2>
              <div className="flex gap-2">
                  <button onClick={() => onMonthChange(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronRight /></button>
                  <button onClick={() => onMonthChange(1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronLeft /></button>
              </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-500 font-bold text-sm">
              {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(d => <div key={d}>{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-2 h-[400px] lg:h-auto">
              {/* Empty cells for previous month */}
              {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
              ))}
              
              {/* Days */}
              {Array.from({ length: days }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isSelected = date.toDateString() === selectedDay.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const hasBooking = bookings.some(b => new Date(b.shootDate).toDateString() === date.toDateString());

                  return (
                      <motion.button
                          key={day}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onDaySelect(date)}
                          className={`
                              relative p-2 h-20 rounded-2xl border flex flex-col items-start justify-between transition-all group
                              ${isSelected 
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                                  : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'}
                          `}
                      >
                          <span className={`text-sm font-bold ${isToday ? 'bg-amber-500 text-black w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>
                              {day}
                          </span>
                          
                          {hasBooking && (
                              <div className="flex gap-1 mt-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                                  {bookings.filter(b => new Date(b.shootDate).toDateString() === date.toDateString()).length > 1 && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  )}
                              </div>
                          )}
                      </motion.button>
                  );
              })}
          </div>
          
          {/* Background Decor */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      </GlowCard>
    </div>
  );
};

export default ScheduleCalendarWidget;
