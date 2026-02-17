import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { Booking } from '../../../../types';
import ManagerDashboardCard from './ManagerDashboardCard';

/**
 * ManagerTimelineSwimlaneWidget
 * Displays bookings on a weekly timeline with safe data handling.
 * Added optional chaining, error boundaries and graceful fallback UI.
 */
const ManagerTimelineSwimlaneWidget = ({
  bookings = [],
  onBookingDoubleClick,
}: {
  bookings: Booking[];
  onBookingDoubleClick?: (booking: Booking) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Custom Time Range (11 AM to 8 PM)
  const START_HOUR = 11;
  const END_HOUR = 20; // 8 PM
  const TOTAL_HOURS = END_HOUR - START_HOUR + 1; // include last hour

  // Navigation helpers
  const nextMonth = () => setSelectedDate(addDays(selectedDate, 30));
  const prevMonth = () => setSelectedDate(addDays(selectedDate, -30));

  // Generate days for the current week (starting today)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i)), []);

  interface TimelineEvent {
    id?: string;
    title: string;
    start: number;
    duration: number;
    category: 'normal' | 'vip' | 'private';
    emoji: string;
    paid: number;
    remaining: number;
    allowPublish: boolean;
    laneIndex: number;
  }

  // Process bookings into timeline events with safety checks
  const processedEvents = useMemo(() => {
    try {
      // Filter bookings for the selected day safely
      const dayBookings = (bookings ?? []).filter((b) =>
        b?.shootDate && isSameDay(new Date(b.shootDate), selectedDate)
      );

      const mappedEvents: TimelineEvent[] = dayBookings.map((b) => {
        let startHour = START_HOUR;
        if (b?.details?.startTime) {
          const [h, m] = String(b.details.startTime).split(':').map(Number);
          const safeH = typeof h === 'number' && Number.isFinite(h) ? h : START_HOUR;
          const safeM = typeof m === 'number' && Number.isFinite(m) ? m : 0;
          startHour = safeH + safeM / 60;
        }
        // Determine category/priority safely
        let cat: TimelineEvent['category'] = 'normal';
        if (b?.isVIP) cat = 'vip';
        else if (b?.details?.isPrivate) cat = 'private';

        return {
          id: b?.id,
          title: `${b?.clientName ?? 'Unknown'} - ${b?.title ?? ''}`,
          start: startHour,
          duration: b?.details?.duration || 2,
          category: cat,
          emoji: b?.category === 'Wedding' ? '👑' : '📸',
          paid: b?.paidAmount ?? 0,
          remaining: (b?.totalAmount ?? 0) - (b?.paidAmount ?? 0),
          allowPublish: b?.details?.allowPublishing ?? false,
          laneIndex: 0,
        };
      });

      // Sort and assign lanes
      const sorted = [...mappedEvents].sort((a, b) => a.start - b.start);
      const lanes: TimelineEvent[][] = [];
      sorted.forEach((event) => {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
          const lane = lanes[i];
          if (!lane || lane.length === 0) continue;
          const lastInLane = lane[lane.length - 1];
          if (!lastInLane) continue;
          if (event.start >= (lastInLane.start + lastInLane.duration)) {
            lane.push(event);
            placed = true;
            break;
          }
        }
        if (!placed) lanes.push([event]);
      });
      return lanes.flatMap((lane, laneIndex) => lane.map((ev) => ({ ...ev, laneIndex })));
    } catch (e) {
      console.error('Error processing timeline events', e);
      setError('Failed to load timeline data');
      return [];
    }
  }, [bookings, selectedDate]);

  const maxLane = Math.max(...processedEvents.map((e) => e.laneIndex), 0);
  const trackHeight = (maxLane + 1) * 70; // 60px card + 10px gap

  return (
    <ManagerDashboardCard noPadding className="h-auto min-h-[200px] flex flex-col relative overflow-hidden bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md border-gray-200 dark:border-white/5" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white font-tajawal">{format(selectedDate, 'MMMM yyyy')}</h3>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <ChevronDown className="rotate-90" size={16} />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {/* Days Strip */}
        <div className="flex items-center gap-2">
          {days.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isSelected ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-600 text-white p-2 text-center font-bold">{error}</div>
      )}

      {/* Timeline */}
      <div className="flex-1 relative mt-4 px-6 overflow-x-auto custom-scrollbar pb-6">
        {/* Time Markers */}
        <div className="flex border-b border-gray-200 dark:border-white/10 pb-2 mb-2 w-full min-w-[600px]">
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
            <div key={i} className="flex-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono text-center border-l border-gray-200 dark:border-white/10 first:border-0 pl-1">
              {START_HOUR + i}:00
            </div>
          ))}
        </div>
        {/* Events Track */}
        <div className="relative w-full min-w-[600px]" style={{ height: `${trackHeight + 20}px` }}>
          {/* Grid Lines */}
          <div className="absolute inset-0 flex pointer-events-none h-full">
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <div key={i} className="flex-1 border-l border-dashed border-gray-700/30 first:border-0" />
            ))}
          </div>
          {/* Booking Cards */}
          {processedEvents.map((event, i) => {
            const visualDuration = Math.max(event.duration, 2);
            const leftPercent = ((event.start - START_HOUR) / TOTAL_HOURS) * 100;
            const widthPercent = (visualDuration / TOTAL_HOURS) * 100;
            const compactTime = (h: number) => {
              const hour12 = h % 12 || 12;
              const minutes = (h % 1) * 60;
              return `${Math.floor(hour12)}:${minutes === 0 ? '00' : Math.floor(minutes)}`;
            };
            const timeString = `${compactTime(event.start)}-${compactTime(event.start + event.duration)}`;
            const getCardColor = () => {
              if (event.allowPublish) return 'bg-linear-to-r from-emerald-500/30 to-emerald-700/40 border-emerald-500/40 text-emerald-50';
              if (event.category === 'private') return 'bg-linear-to-r from-rose-500/30 to-rose-700/40 border-rose-500/40 text-rose-50';
              if (event.category === 'vip') return 'bg-linear-to-r from-amber-400/30 to-amber-600/40 border-amber-500/40 text-amber-50';
              return 'bg-linear-to-r from-blue-500/30 to-blue-700/40 border-blue-500/40 text-blue-50';
            };
            return (
              <motion.div
                key={event.id}
                onDoubleClick={() => {
                  const selectedBooking = bookings.find((b) => b.id === event.id);
                  if (selectedBooking && onBookingDoubleClick) onBookingDoubleClick(selectedBooking);
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`absolute h-[64px] rounded-2xl border backdrop-blur-md flex items-center px-4 gap-3 overflow-hidden cursor-pointer group z-10 hover:z-50 shadow-lg transition-all duration-300 hover:brightness-125 ${getCardColor()}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 12)}%`,
                  top: `${event.laneIndex * 74}px`,
                }}
              >
                <div className="min-w-0 flex-1 flex flex-col justify-center h-full relative z-10 px-0.5">
                  <h4 className="text-[11px] font-bold truncate font-tajawal text-white mb-0.5 drop-shadow-sm">{event.title}</h4>
                  <div className="flex items-center justify-between gap-1 overflow-hidden">
                    <div className="text-[9px] font-mono font-bold text-white/70 whitespace-nowrap">{timeString}</div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-black/30 px-1 py-0.5 rounded border border-white/5 shrink-0">
                      <span className="text-green-400">${event.paid}</span>
                      {event.remaining > 0 && (
                        <span className="text-rose-400 border-l border-white/20 pl-1.5">-${event.remaining}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ManagerDashboardCard>
  );
};

export default ManagerTimelineSwimlaneWidget;
