import React from 'react';
import { Calendar as CalendarIcon, MoreHorizontal, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Booking, BookingStatus } from '../../../../types';
import { GlowCard } from '../../../shared/GlowCard';

interface DailyAgendaWidgetProps {
  selectedDay: Date;
  dailyBookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
}

const DailyAgendaWidget: React.FC<DailyAgendaWidgetProps> = ({ 
  selectedDay, 
  dailyBookings, 
  onSelectBooking 
}) => {
  return (
    <div className="w-full lg:w-[350px] flex flex-col gap-4">
       <div className="flex items-center justify-between p-2">
          <h3 className="font-bold text-white">
              أجندة {format(selectedDay, 'd MMMM', { locale: ar })}
          </h3>
          <span className="text-xs text-amber-500 font-mono bg-amber-500/10 px-2 py-1 rounded-lg">
              {dailyBookings.length} حجوزات
          </span>
       </div>

       <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {dailyBookings.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <CalendarIcon size={30} className="mb-2 opacity-50" />
                  <p className="text-sm">لا توجد مواعيد لهذا اليوم</p>
              </div>
          ) : (
              dailyBookings.map((booking, idx) => (
                  <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => onSelectBooking(booking)}
                  >
                      <GlowCard className="p-4 cursor-pointer hover:border-amber-500/30 group">
                          <div className="flex justify-between items-start mb-3">
                              <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                                  {new Date(booking.shootDate).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <button className="text-gray-500 hover:text-white"><MoreHorizontal size={16} /></button>
                          </div>
                          
                          <h4 className="text-white font-bold mb-1 group-hover:text-amber-500 transition-colors">
                              {booking.title || booking.clientName}
                          </h4>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                              <MapPin size={12} />
                              <span className="truncate">{booking.location || 'استوديو داخلي'}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
                              <div className="flex -space-x-2 space-x-reverse">
                                  <div className="w-6 h-6 rounded-full bg-gray-700 border border-black flex items-center justify-center text-[8px] text-white">
                                      {booking.clientName.charAt(0)}
                                  </div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  booking.status === BookingStatus.CONFIRMED ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'
                              }`}>
                                  {booking.status}
                              </span>
                          </div>
                      </GlowCard>
                  </motion.div>
              ))
          )}
       </div>

       {/* Mini Add Button */}
       <button className="w-full py-3 mt-auto bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-bold">
          + إضافة موعد سريع
       </button>
    </div>
  );
};

export default DailyAgendaWidget;
