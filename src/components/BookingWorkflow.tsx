import React, { useState, useRef } from 'react';
import { Booking, BookingStatus, BookingCategory, User, StatusLabels } from '../types';
import { Clock, CheckCircle2, Camera, MoreHorizontal, Calendar, Search, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { formatMoney } from '../utils/formatMoney';
import { LayoutGrid, Table, List, Settings } from 'lucide-react';

// Import Designs
import UnifiedPulse from './manager/workflow/designs/UnifiedPulse';

const getTimeInStage = (
  statusHistory: Array<{ status?: BookingStatus; timestamp?: string }>,
  currentStatus: BookingStatus
) => {
  if (!statusHistory || statusHistory.length === 0) return 0;
  const lastEntry = [...statusHistory].reverse().find(h => h.status === currentStatus);
  if (!lastEntry?.timestamp) return 0;
  return differenceInDays(new Date(), parseISO(lastEntry.timestamp));
};

const getAssigneeForStage = (booking: Booking, users: User[]): User | undefined => {
  let assigneeId: string | undefined;
  switch (booking.status) {
    case BookingStatus.SHOOTING:
      assigneeId = booking.assignedShooter;
      break;
    case BookingStatus.EDITING:
      assigneeId = booking.assignedPhotoEditor || booking.assignedVideoEditor;
      break;
    case BookingStatus.READY_TO_PRINT:
      assigneeId = booking.assignedPrinter;
      break;
    case BookingStatus.CONFIRMED:
    case BookingStatus.SELECTION:
    case BookingStatus.READY_FOR_PICKUP:
    case BookingStatus.DELIVERED:
      assigneeId = booking.assignedReceptionist;
      break;
  }
  return users.find(u => u.id === assigneeId);
};

interface BookingWorkflowProps {
  bookings: Booking[];
  users: User[];
  onViewBooking?: (id: string, tab?: string) => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => void;
  isManager?: boolean;
}

// --- Lumina Premium Glow Card Effect ---
const ROTATION_RANGE = 20;

const LuminaWorkflowCard = ({ children, className = "", onClick, onDragStart, draggable, disableTilt = false }: { 
    children: React.ReactNode; 
    className?: string;
    onClick?: () => void;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    draggable?: boolean;
    disableTilt?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 150, damping: 20 });

  const transform = useMotionTemplate`perspective(1200px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;
  
  // Dynamic luminescent gradients
  const borderMask = useMotionTemplate`radial-gradient(250px circle at ${mouseX}px ${mouseY}px, rgba(251, 191, 36, 0.8) 0%, transparent 100%)`;
  const surfaceGradient = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, rgba(251, 191, 36, 0.08), transparent 70%)`;
  const reflectionGradient = useMotionTemplate`linear-gradient(${mouseX}deg, transparent, rgba(255,255,255,0.1), transparent)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    mouseX.set(mX);
    mouseY.set(mY);

    const rX = disableTilt ? 0 : (mY / height - 0.5) * ROTATION_RANGE * -1;
    const rY = disableTilt ? 0 : (mX / width - 0.5) * ROTATION_RANGE;

    x.set(rX);
    y.set(rY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onDragStartCapture={onDragStart}
      draggable={draggable}
      style={{ transform }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative group rounded-4xl bg-white dark:bg-[#1a1c22] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-black/20 overflow-hidden transition-all duration-300",
        "hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]",
        className
      )}
    >
      {/* 1. Subsurface Glow */}
      <motion.div 
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: surfaceGradient }}
      />

      {/* 2. Dynamic Reflection Line */}
      <motion.div 
        className="pointer-events-none absolute inset-0 z-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: reflectionGradient }}
      />

      {/* 3. Border Luminescence - Only on Hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ maskImage: borderMask, WebkitMaskImage: borderMask }}
      />

      {/* 4. Glass-like Overlay */}
      <div className="absolute inset-0 z-0 bg-linear-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* 5. Content */}
      <div className="relative z-20 h-full p-3.5">
        {children}
      </div>
    </motion.div>
  );
};


export const WorkflowColumn: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  bookings: Booking[];
  onViewBooking?: (id: string, tab?: string) => void;
  onDrop: (bookingId: string) => void;
  isManager?: boolean;
  users: User[];
  disableTilt?: boolean;
}> = ({ id: _id, title, icon, color, count, bookings, onViewBooking, onDrop, isManager: _isManager, users, disableTilt = true }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const bookingId = e.dataTransfer.getData('bookingId');
    if (bookingId) {
      onDrop(bookingId);
    }
  };

  const iconBg = {
      blue: 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white',
      red: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500',
      green: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
  };

  return (
    <div 
      className={`flex flex-col h-full bg-white/40 dark:bg-[#0a0a0a]/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_2px_30px_-10px_rgba(0,0,0,0.05)] border border-transparent dark:border-white/5 transition-all duration-500 overflow-hidden ${
        isOver ? 'scale-[1.01] bg-white/60 dark:bg-white/10 ring-amber-400 ring-offset-4 ring-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Inner Glow */}
      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
      {/* Column Header */}
      <div className="p-4 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${iconBg[color as keyof typeof iconBg]}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-[13px] leading-tight">{title}</h3>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{count} مهام</span>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar no-scrollbar scroll-smooth">
        <AnimatePresence mode="popLayout">
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <LuminaWorkflowCard
                key={booking.id}
                draggable
                disableTilt={disableTilt}
                onDragStart={(e) => {
                  e.dataTransfer.setData('bookingId', booking.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => {
                    if (booking.status === BookingStatus.CONFIRMED) {
                        onViewBooking?.(booking.id, 'client');
                    } else if (booking.status === BookingStatus.DELIVERED) {
                        onViewBooking?.(booking.id, 'workflow');
                    } else {
                        onViewBooking?.(booking.id, 'financials');
                    }
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                  {/* Priority Indicator Dot */}
                  <div className="absolute top-4 left-4 flex gap-1">
                      <div className={cn(
                          "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                          booking.totalAmount > 1000 ? "bg-amber-500 text-amber-500 animate-pulse" : "bg-gray-200 text-gray-200"
                      )} />
                  </div>

                  <div className="flex flex-col h-full">
                    {/* Header: Category & Avatar */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md",
                                    booking.category === BookingCategory.WEDDING ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    {booking.category === BookingCategory.WEDDING ? 'Wedding' : (booking.category === BookingCategory.LOCATION ? 'Venue' : 'Photo Session')}
                                </span>
                                {getTimeInStage(booking.statusHistory || [], booking.status) > 5 && (
                                    <span className="flex items-center gap-1 text-red-500 text-[8px] font-black animate-pulse">
                                        <AlertTriangle size={10} />
                                        DELAYED
                                    </span>
                                )}
                             </div>
                             <h4 className="text-gray-900 dark:text-gray-100 font-black text-sm leading-tight group-hover:text-amber-600 transition-colors uppercase mt-1">
                                {booking.title}
                             </h4>
                        </div>
                        
                        <div className="relative">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-2xl transition-transform duration-500 group-hover:rotate-12",
                                booking.category === BookingCategory.WEDDING ? "bg-black" : "bg-gray-800"
                            )}>
                                {booking.clientName.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                                <Camera size={8} className="text-gray-900" />
                            </div>
                        </div>
                    </div>

                    {/* Meta: Stats & Assignee */}
                    <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             {/* Mini circular progress simulation for time */}
                             <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg group-hover:bg-amber-50 transition-colors">
                                <Clock size={12} className={cn(
                                    getTimeInStage(booking.statusHistory || [], booking.status) > 3 ? "text-amber-500" : "text-emerald-500"
                                )} />
                                <span className="text-[10px] font-black text-gray-700">
                                    {getTimeInStage(booking.statusHistory || [], booking.status)}D
                                </span>
                             </div>

                             {getAssigneeForStage(booking, users) && (
                                <div className="flex -space-x-2">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm",
                                        getAssigneeForStage(booking, users)?.avatar || "bg-gray-900"
                                    )}>
                                        {getAssigneeForStage(booking, users)?.name.charAt(0)}
                                    </div>
                                </div>
                             )}
                        </div>

                        <div className="text-[10px] font-black text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-xl shadow-inner group-hover:bg-amber-400 group-hover:text-white transition-all">
                             {formatMoney(booking.totalAmount, booking.currency)}
                        </div>
                    </div>
                  </div>
              </LuminaWorkflowCard>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-gray-300 border-2 border-dashed border-white/20 dark:border-white/5 rounded-[2.5rem] bg-white/10 dark:bg-white/5"
            >
              <div className="p-4 bg-white/20 dark:bg-white/5 backdrop-blur-md rounded-full mb-3 shadow-inner">
                <CheckCircle2 size={32} className="text-white/40 dark:text-white/20" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-tighter opacity-40">All Caught Up</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};



const PhotoGroupView: React.FC<{ 
    bookings: Booking[]; 
    users: User[]; 
    onViewBooking: (id: string, tab?: string) => void;
    onStatusUpdate?: (id: string, status: BookingStatus) => void;
}> = ({ bookings, users, onViewBooking, onStatusUpdate }) => {
    // Grouping bookings by status
    const statuses = [
        BookingStatus.CONFIRMED,
        BookingStatus.SHOOTING,
        BookingStatus.SELECTION,
        BookingStatus.CLIENT_DELAY,
        BookingStatus.EDITING,
        BookingStatus.READY_TO_PRINT,
        BookingStatus.READY_FOR_PICKUP,
        BookingStatus.DELIVERED
    ];

    return (
        <div className="flex h-full overflow-x-auto no-scrollbar gap-8 px-8 pb-2 pt-4" dir="rtl">
            {statuses.map((status) => {
                const stageBookings = bookings.filter(b => b.status === status);

                return (
                    <div 
                        key={status} 
                        className="flex flex-col gap-6 min-w-[412px] max-w-[412px] h-full"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const bookingId = e.dataTransfer.getData('bookingId');
                            if (bookingId && onStatusUpdate) {
                                onStatusUpdate(bookingId, status);
                            }
                        }}
                    >
                        {/* Section Header */}
                        <div className="flex items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{StatusLabels[status]}</h3>
                            </div>
                            <span className="px-2.5 py-1 bg-white/50 backdrop-blur-md rounded-lg text-[10px] font-black text-gray-500 shadow-sm border border-white">
                                {stageBookings.length} مهام
                            </span>
                        </div>

                        {/* Cards Vertical Container */}
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-7 pr-1">
                            <AnimatePresence mode="popLayout">
                                {stageBookings.length > 0 ? (
                                    stageBookings.map((booking) => {
                                        const assignee = getAssigneeForStage(booking, users);
                                        const daysInStage = getTimeInStage(booking.statusHistory || [], booking.status);
                                        
                                        return (
                                            <LuminaWorkflowCard 
                                                key={booking.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('bookingId', booking.id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                 onClick={() => {
                                                    if (booking.status === BookingStatus.CONFIRMED) {
                                                        onViewBooking(booking.id, 'client');
                                                    } else if (booking.status === BookingStatus.DELIVERED) {
                                                        onViewBooking(booking.id, 'workflow');
                                                    } else {
                                                        onViewBooking(booking.id, 'financials');
                                                    }
                                                 }}
                                                className="h-fit cursor-grab active:cursor-grabbing"
                                            >
                                                <div className="flex flex-col gap-[10.5px]">
                                                    {/* Header: Title & Premium Badges */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col gap-[4.5px] text-right flex-1">
                                                            <div className="flex items-center gap-[4.5px] justify-end">
                                                                {booking.isFamous && (
                                                                    <span className="flex items-center gap-1 bg-amber-100 text-amber-600 px-[4.5px] py-1 rounded-md text-[8.1px] font-black border border-amber-200">
                                                                        👑 FAMOUS
                                                                    </span>
                                                                )}
                                                                {booking.isVIP && (
                                                                    <span className="flex items-center gap-1 bg-gray-900 text-white px-[4.5px] py-1 rounded-md text-[8.1px] font-black">
                                                                        ✨ VIP
                                                                    </span>
                                                                )}
                                                                {booking.details?.isPrivate && (
                                                                    <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-[4.5px] py-1 rounded-md text-[8.1px] font-black border border-rose-100">
                                                                        🔒 PRIVATE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-[4.5px] justify-end mt-0.5">
                                                                {daysInStage > 5 && (
                                                                    <span className="flex items-center gap-1 text-red-500 text-[8.1px] font-black animate-pulse">
                                                                        <AlertTriangle size={8.1} />
                                                                        DELAYED
                                                                    </span>
                                                                )}
                                                                <span className={cn(
                                                                    "px-[4.5px] py-1 text-[8.1px] font-black uppercase tracking-wider rounded-md",
                                                                    booking.category === BookingCategory.WEDDING ? "bg-purple-100 text-purple-600 border border-purple-200" : "bg-blue-100 text-blue-600 border border-blue-200"
                                                                )}>
                                                                    {booking.category === BookingCategory.LOCATION ? 'Venue' : booking.category}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-gray-900 font-black text-[14.8px] leading-tight uppercase mt-0.5 line-clamp-1">{booking.title}</h3>
                                                            <p className="text-[9.1px] text-gray-400 font-bold flex items-center gap-1 uppercase justify-end">
                                                                {booking.shootDate}
                                                                <Calendar size={8.1} className="text-amber-500" />
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.25 text-left ml-[12.5px]">
                                                            <div className={cn(
                                                                "w-[40.5px] h-[40.5px] rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md transition-transform duration-500 group-hover:rotate-6",
                                                                booking.category === BookingCategory.WEDDING ? "bg-black" : (booking.category === BookingCategory.LOCATION ? "bg-amber-600" : "bg-gray-800")
                                                            )}>
                                                                {booking.clientName.charAt(0)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Body: Detailed Info Grid - More Compressed */}
                                                    <div className="grid grid-cols-2 gap-x-[12.5px] gap-y-[8.5px] py-[7px] border-y border-gray-100/50">
                                                        <div className="space-y-[7px] text-right">
                                                            <div>
                                                                <p className="text-[7.6px] font-black text-gray-400 uppercase tracking-tighter">العميل</p>
                                                                <p className="text-[10.1px] font-black text-gray-900 truncate">{booking.clientName}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[7.6px] font-black text-gray-400 uppercase tracking-tighter">الباقة</p>
                                                                <p className="text-[10.1px] font-black text-gray-700 line-clamp-1">{booking.servicePackage}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-[7px] text-right">
                                                            <div>
                                                                <p className="text-[7.6px] font-black text-gray-400 uppercase tracking-tighter">الحالة</p>
                                                                <p className="text-[10.1px] font-black text-amber-600 truncate">{StatusLabels[booking.status]}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[7.6px] font-black text-gray-400 uppercase tracking-tighter">المسؤول</p>
                                                                <p className="text-[10.1px] font-black text-gray-700 truncate">{assignee?.name || 'غير محدد'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Logistics Details - Slimmer */}
                                                    <div className="bg-gray-50/50 rounded-xl p-[7px] flex flex-wrap gap-x-[12.5px] gap-y-1 justify-end">
                                                        {booking.details?.hallName && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9.1px] font-black text-gray-600">{booking.details.hallName}</span>
                                                                <Settings size={8.1} className="text-gray-400 shrink-0" />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9.1px] font-black text-gray-600">{booking.details?.startTime} - {booking.details?.endTime}</span>
                                                            <Clock size={8.1} className="text-gray-400" />
                                                        </div>
                                                        {booking.details?.isPhotographer && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9.1px] font-black text-emerald-600">مصور</span>
                                                                <Camera size={8.1} className="text-emerald-500" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Financials - Ultra Slim Header style */}
                                                    <div className="flex items-center justify-between pt-[7px]">
                                                        <div className="flex gap-[14px]">
                                                            <p className="text-[9.8px] font-black text-gray-900">{formatMoney(booking.totalAmount, booking.currency)}</p>
                                                            <p className="text-[9.8px] font-black text-green-600">{formatMoney(booking.paidAmount, booking.currency)}</p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1 px-[8.5px] py-[3.25px] bg-amber-50 rounded-2xl border border-amber-100/50">
                                                            <Activity size={8.1} className="text-amber-500" />
                                                            <span className="text-[8.6px] font-black text-amber-700">{daysInStage} يوم</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </LuminaWorkflowCard>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-100 rounded-4xl bg-gray-50/30">
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">لا توجد مهام</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ListView: React.FC<{ 
    bookings: Booking[]; 
    users: User[]; 
    onViewBooking: (id: string) => void;
}> = ({ bookings, users, onViewBooking }) => {
    return (
        <div className="flex flex-col gap-2 p-6 h-full overflow-y-auto no-scrollbar" dir="rtl">
            {bookings.length > 0 ? (
                bookings.sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime()).map((booking) => {
                    const assignee = getAssigneeForStage(booking, users);
                    const daysInStage = getTimeInStage(booking.statusHistory || [], booking.status);
                    
                    return (
                        <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => onViewBooking(booking.id)}
                            className="flex items-center gap-6 p-3 bg-white/60 dark:bg-[#1a1c22]/60 hover:bg-white/90 dark:hover:bg-[#1a1c22]/90 backdrop-blur-xl rounded-2xl border border-white dark:border-white/5 transition-all cursor-pointer group"
                        >
                            {/* Status Indicator */}
                            <div className={cn(
                                "w-1 h-10 rounded-full",
                                booking.status === BookingStatus.DELIVERED ? "bg-emerald-400" :
                                booking.status === BookingStatus.SHOOTING ? "bg-amber-400" : "bg-gray-200"
                            )} />

                            {/* Client Avatar */}
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm",
                                booking.category === BookingCategory.WEDDING ? "bg-black" : (booking.category === BookingCategory.LOCATION ? "bg-amber-600" : "bg-gray-800")
                            )}>
                                {booking.clientName.charAt(0)}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0 text-right">
                                <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase truncate leading-tight">{booking.title}</h4>
                                <div className="flex items-center gap-2 mt-0.5 justify-end">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{booking.clientName}</span>
                                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                        booking.category === BookingCategory.WEDDING ? "bg-purple-50 text-purple-600" : (booking.category === BookingCategory.LOCATION ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")
                                    )}>
                                        {booking.category === BookingCategory.LOCATION ? 'Venue' : booking.category}
                                    </span>
                                </div>
                            </div>

                            {/* Date & Logistics */}
                            <div className="flex flex-col items-end min-w-[120px]">
                                <p className="text-[11px] font-black text-gray-700 flex items-center gap-1.5 uppercase">
                                    {booking.shootDate}
                                    <Calendar size={12} className="text-amber-500" />
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{booking.details?.hallName || 'موقع خارجي'}</p>
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center gap-3 min-w-[140px] justify-end">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-900 dark:text-gray-200 leading-none">{assignee?.name || 'غير محدد'}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">المسؤول</p>
                                </div>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm",
                                    assignee?.avatar || "bg-gray-900"
                                )}>
                                    {assignee ? assignee.name.charAt(0) : '?'}
                                </div>
                            </div>

                            {/* Status & Financials */}
                            <div className="flex items-center gap-6 min-w-[180px] justify-end">
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-emerald-600 leading-none">{formatMoney(booking.totalAmount, booking.currency)}</p>
                                    <div className="flex items-center gap-1 justify-end mt-1">
                                        <Activity size={10} className="text-amber-500" />
                                        <span className="text-[8px] font-bold text-gray-400 uppercase">{daysInStage} يوم</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest min-w-[110px] text-center",
                                    "bg-gray-50 text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors border border-transparent group-hover:border-amber-200"
                                )}>
                                    {StatusLabels[booking.status]}
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/30">
                    <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">لا توجد مهام مطابقة</p>
                </div>
            )}
        </div>
    );
};

const BookingWorkflow: React.FC<BookingWorkflowProps> = ({ 
  bookings, 
  users,
  onViewBooking, 
  onStatusUpdate,
  isManager: _isManager = false
}) => {
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutView, setLayoutView] = useState<'kanban' | 'pulse' | 'table' | 'list'>('kanban');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateInFilter = (dateString: string) => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    if (filterType === 'daily') return date.getTime() === today.getTime();
    if (filterType === 'weekly') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return date >= today && date <= nextWeek;
    }
    if (filterType === 'monthly') {
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return date >= today && date <= nextMonth;
    }
    return true;
  };

  const isSearchMatch = (booking: Booking) => {
     if (!searchQuery) return true;
     const query = searchQuery.toLowerCase();
     const clientName = booking.clientName || '';
     const title = booking.title || '';
     return clientName.toLowerCase().includes(query) ||
            title.toLowerCase().includes(query);
  };

  const visibleBookings = bookings.filter(
    booking => isDateInFilter(booking.shootDate) && isSearchMatch(booking)
  );

  return (
    <div className="h-full flex flex-col pt-6 px-6 pb-0 bg-transparent relative overflow-hidden" dir="rtl">
        {/* Animated Mesh Gradient Background (Premium Lumina) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-200/40 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100/30 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-100/20 blur-[100px] rounded-full" />
        </div>

        {/* Ultra-Compact Single-Row Header */}
        <div className="flex items-center justify-between gap-6 mb-4 relative z-10 px-6 py-3 bg-white/40 dark:bg-[#1a1c22]/40 backdrop-blur-2xl rounded-2xl shadow-sm border-none">
            {/* Left: Title & Kanban Indicator */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-sm"></div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">سير العمل</h2>
                </div>

                {/* View Switcher Icons Only */}
                <div className="flex items-center p-1 bg-gray-100/50 dark:bg-white/5 rounded-xl">
                    <button 
                        onClick={() => setLayoutView('kanban')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            layoutView === 'kanban' ? "bg-white dark:bg-[#1a1c22] text-gray-900 dark:text-white shadow-sm scale-110" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                        title="Photo Group"
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button 
                        onClick={() => setLayoutView('pulse')}
                        className={cn(
                            "p-2 rounded-lg transition-all mx-1",
                            layoutView === 'pulse' ? "bg-white dark:bg-[#1a1c22] text-amber-500 shadow-sm scale-110" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                        title="Table View"
                    >
                        <Table size={14} />
                    </button>
                    <button 
                        onClick={() => setLayoutView('list')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            layoutView === 'list' ? "bg-white dark:bg-[#1a1c22] text-blue-500 shadow-sm scale-110" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                        title="List View"
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Right: Search & Time Filters */}
            <div className="flex items-center gap-4">
                {/* Compact Time Filter Tabs */}
                <div className="flex p-0.5 bg-white/40 dark:bg-white/5 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                                filterType === type 
                                    ? 'bg-gray-900 text-white shadow-md' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Vertical Separator */}
                <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />

                {/* Slick Slim Search */}
                <div className="relative group">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" size={14} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="h-8 w-36 bg-white/80 dark:bg-white/5 border border-white dark:border-white/5 rounded-xl pr-9 pl-3 text-[10px] font-bold dark:text-gray-200 focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    />
                </div>
            </div>
        </div>

        {/* Main Overview Design */}
        <div className="flex-1 min-h-0 relative z-10 px-1 overflow-hidden">
            {layoutView === 'pulse' ? (
                <UnifiedPulse 
                    bookings={visibleBookings} 
                    users={users} 
                    onViewBooking={onViewBooking || (() => {})} 
                    onStatusUpdate={onStatusUpdate || (() => {})} 
                />
            ) : layoutView === 'list' ? (
                <ListView 
                    bookings={visibleBookings} 
                    users={users} 
                    onViewBooking={onViewBooking || (() => {})} 
                />
            ) : (
                <PhotoGroupView 
                    bookings={visibleBookings} 
                    users={users} 
                    onViewBooking={onViewBooking || (() => {})} 
                    onStatusUpdate={onStatusUpdate}
                />
            )}
        </div>
    </div>
  );
};

export default BookingWorkflow;
