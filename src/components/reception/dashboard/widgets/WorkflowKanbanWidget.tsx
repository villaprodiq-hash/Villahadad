import React, { useState, useMemo } from 'react';
import { Camera, User, CheckCircle, GripVertical, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { Booking, BookingStatus, BookingCategory } from '../../../../types';

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface ColumnStats {
  daily: { count: number; trend: 'up' | 'down'; change: number };
  weekly: { count: number; trend: 'up' | 'down'; change: number };
  monthly: { count: number; trend: 'up' | 'down'; change: number };
}

interface WorkflowKanbanWidgetProps {
  bookings?: Booking[];
  onStatusUpdate?: (id: string, status: BookingStatus) => void;
  isManager?: boolean;
}

const WorkflowKanbanWidget: React.FC<WorkflowKanbanWidgetProps> = ({ 
  bookings = [], 
  onStatusUpdate,
  isManager = false 
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);

  // Derive columns from real bookings with filtering
  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredBookings = bookings.filter(b => {
      const date = new Date(b.shootDate);
      date.setHours(0, 0, 0, 0);

      if (timeRange === 'daily') {
        return date.getTime() === today.getTime();
      }
      
      if (timeRange === 'weekly') {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return date >= today && date <= nextWeek;
      }
      
      if (timeRange === 'monthly') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        return date >= today && date <= nextMonth;
      }
      
      return true;
    });

    const upcoming = filteredBookings.filter(b => b.status === BookingStatus.CONFIRMED);
    const shooting = filteredBookings.filter(b => b.status === BookingStatus.SHOOTING);
    const selection = filteredBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED);

    return [
      { id: 'upcoming', title: 'قادم', cards: upcoming, status: BookingStatus.CONFIRMED },
      { id: 'shooting', title: 'تصوير', cards: shooting, status: BookingStatus.SHOOTING },
      { id: 'done', title: 'تم التصوير', cards: selection, status: BookingStatus.SHOOTING_COMPLETED }
    ];
  }, [bookings, timeRange]);

  // Keep mock stats for visual appeal as they require complex calculation logic not fully available yet
  // Removed fake stats
  const columnStats = {};

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('bookingId', id);
    setDraggedBookingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: BookingStatus) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('bookingId') || draggedBookingId;
    
    if (bookingId && onStatusUpdate) {
       onStatusUpdate(bookingId, targetStatus);
    }
    setDraggedBookingId(null);
  };

  const getCategoryIcon = (category: BookingCategory) => {
    switch (category) {
      case BookingCategory.WEDDING: return <Gift className="w-2.5 h-2.5 text-[#C94557]" />;
      case BookingCategory.STUDIO: return <Camera className="w-2.5 h-2.5 text-[#C94557]" />;
      default: return <User className="w-2.5 h-2.5 text-[#C94557]" />;
    }
  };

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'daily': return 'يومي';
      case 'weekly': return 'أسبوعي';
      case 'monthly': return 'شهري';
    }
  };

  // مكون الجارت الدائري (Circular Chart)
  const CircularChart = ({ value, max = 50, color = "#C94557" }: { value: number, max?: number, color?: string }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min((value / max) * 100, 100);
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(201,69,87,0.3)]">
          {/* خلفية الدائرة */}
          <circle
            cx="40" cy="40" r={radius}
            stroke="#333" strokeWidth="4" fill="transparent"
          />
          {/* شريط التقدم */}
          <circle
            cx="40" cy="40" r={radius}
            stroke={color} strokeWidth="4" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* الرقم في الوسط */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white leading-none">{value}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-linear-to-br from-[#2a2a2a] to-[#202020] rounded-3xl p-3 flex flex-col gap-2 overflow-hidden relative border-t border-l border-white/10" dir="rtl">
      
      {/* 1. تم نقل التبويبات إلى اليمين (justify-start) */}
      <div className="flex justify-start gap-1 mb-1 px-1">
        {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              timeRange === range
                ? 'bg-[#C94557] text-white shadow-[0_2px_8px_rgba(201,69,87,0.4)]'
                : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300 border border-white/5'
            }`}
          >
            {getTimeRangeLabel(range)}
          </button>
        ))}
      </div>

      {/* Columns */}
      <div className="flex-1 flex gap-2 overflow-hidden">
        {columns.map((column) => {
          const currentCount = column.cards.length; // Use real count

          return (
            <div
              key={column.id}
              className="flex-1 bg-[#1a1a1a] rounded-2xl p-2 flex flex-col shadow-[inset_3px_3px_6px_rgba(0,0,0,0.9),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border-b border-white/5 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              
              {/* 2. الهيدر: تم استبدال الرقم العادي بالجارت الدائري */}
              <div className="flex flex-col items-center justify-center -mt-1 mb-2">
                <CircularChart value={currentCount} max={Math.max(bookings.length, 10)} />
                
                <div className="flex items-center gap-1 -mt-2">
                  <h3 className="text-[10px] font-bold text-gray-400">
                    {column.title}
                  </h3>
                </div>
              </div>

              {/* 3. البطاقات: تم تصغير الحجم (Padding & Text) */}
              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar px-1">
                {column.cards.map((booking) => (
                  <div
                    key={booking.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, booking.id)}
                    className="bg-[#252525] rounded-lg py-2 px-2.5 cursor-grab active:cursor-grabbing transition-all hover:bg-[#2a2a2a] shadow-sm hover:shadow-md border border-white/5 hover:border-[#C94557]/30 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical className="w-2.5 h-2.5 text-gray-600 shrink-0 group-hover:text-[#C94557]" />
                        <span className="text-[10px] font-bold text-gray-200 truncate group-hover:text-white">
                          {booking.clientName}
                        </span>
                      </div>
                      <div className="p-1 bg-[#C94557]/10 rounded-md shrink-0">
                        {getCategoryIcon(booking.category)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {column.cards.length === 0 && (
                  <div className="text-center py-6 text-gray-700 text-[10px]">
                    فارغ
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default WorkflowKanbanWidget;