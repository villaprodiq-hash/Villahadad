import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, AlertTriangle, 
  CheckCircle2,
  Activity, MapPin, DollarSign, Command
} from 'lucide-react';
import { User, Booking, BookingStatus, UserRole } from '../../../types';

interface DashboardOverviewProps {
  bookings: Booking[];
  users: User[];
  onSelectBooking?: (booking: Booking) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  bookings, 
  users,
  onSelectBooking
}) => {
  // --- Enhanced State & Metrics ---
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter Today's Bookings
  const today = new Date().toISOString().slice(0, 10);
  const todaysBookings = bookings.filter(b => b.shootDate.startsWith(today));

  // Sort by Time
  todaysBookings.sort((a, b) => {
    // Assuming start time is in details, fallback to string comparison
    const timeA = a.details?.startTime || '00:00';
    const timeB = b.details?.startTime || '00:00';
    return timeA.localeCompare(timeB);
  });

  // Staff counts from real users
  const safeUsers = users || [];
  const isShooter = (role: UserRole | string | undefined): boolean =>
    role === UserRole.MANAGER || String(role ?? '').toLowerCase() === 'shooter';
  const staffStatus = {
    photographers: safeUsers.filter(u => isShooter(u.role)).length,
    editors: safeUsers.filter(u => u.role === UserRole.PHOTO_EDITOR || u.role === UserRole.VIDEO_EDITOR).length,
    reception: safeUsers.filter(u => u.role === UserRole.RECEPTION).length,
  };
  // Editing queue pressure indicator
  const editingQueue = bookings.filter(b => b.status === BookingStatus.EDITING || b.status === BookingStatus.READY_TO_PRINT).length;
  const shootingToday = todaysBookings.filter(b => b.status === BookingStatus.SHOOTING || b.status === BookingStatus.CONFIRMED).length;

  // Arabic Date Formatter
  const formattedDate = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(currentTime);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-8 space-y-8 font-sans selection:bg-[#ff6d00]/30 overflow-hidden relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-96 bg-[#ff6d00]/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
        
        {/* 1. Header: The Command Center Vibe */}
        <header className="flex items-end justify-between border-b border-white/5 pb-6 relative z-10">
            <div>
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black tracking-tight text-white mb-2"
                >
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-[#ff6d00] to-primary-light">مركز القيادة</span> والعمليات
                </motion.h1>
                <p className="text-zinc-500 font-medium text-sm tracking-widest uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {formattedDate}
                </p>
            </div>
            <div className="flex gap-4">
                 {/* Live Clock Widget */}
                 <div className="px-5 py-2 rounded-2xl bg-[#14161c]/50 border border-white/5 backdrop-blur-md flex items-center gap-3 shadow-2xl">
                    <Clock size={18} className="text-[#ff6d00]" />
                    <span className="text-2xl font-mono font-bold text-white dir-ltr">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                 </div>
            </div>
        </header>


        {/* 2. Staff Activity Bar (Live Pulse) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {/* Photographers */}
            <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative group overflow-hidden rounded-3xl bg-[#14161c]/60 border border-white/5 p-5 backdrop-blur-xl hover:border-[#ff6d00]/30 transition-all shadow-lg"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6d00]/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#ff6d00]/20 transition-all"></div>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-linear-to-br from-[#ff6d00]/10 to-[#ff6d00]/5 rounded-2xl text-[#ff6d00] border border-[#ff6d00]/10 shadow-inner">
                        <MapPin size={24} />
                    </div>
                    {shootingToday > 0 && (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        {shootingToday} جلسات اليوم
                    </div>
                    )}
                </div>
                <div>
                     <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">فريق التصوير</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">{staffStatus.photographers}</span>
                        <span className="text-zinc-600 text-sm">مصور</span>
                     </div>
                </div>
            </motion.div>

            {/* Editors */}
            <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative group overflow-hidden rounded-3xl bg-[#14161c]/60 border border-white/5 p-5 backdrop-blur-xl hover:border-cyan-500/30 transition-all shadow-lg"
            >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all"></div>
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-linear-to-br from-cyan-500/10 to-cyan-500/5 rounded-2xl text-cyan-500 border border-cyan-500/10 shadow-inner">
                        <Activity size={24} />
                    </div>
                    {editingQueue > 0 && (
                     <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                       editingQueue > 10
                         ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                         : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                     }`}>
                        {editingQueue} في الطابور
                    </div>
                    )}
                </div>
                 <div>
                     <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">غرفة المونتاج</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">{staffStatus.editors}</span>
                        <span className="text-zinc-600 text-sm">محرر</span>
                     </div>
                </div>
            </motion.div>

            {/* Reception */}
            <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative group overflow-hidden rounded-3xl bg-[#14161c]/60 border border-white/5 p-5 backdrop-blur-xl hover:border-purple-500/30 transition-all shadow-lg"
            >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-all"></div>
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-linear-to-br from-purple-500/10 to-purple-500/5 rounded-2xl text-purple-500 border border-purple-500/10 shadow-inner">
                        <DollarSign size={24} />
                    </div>
                </div>
                 <div>
                     <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">الاستقبال والمالية</p>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">{staffStatus.reception}</span>
                        <span className="text-zinc-600 text-sm">موظفين</span>
                     </div>
                </div>
            </motion.div>
        </section>


        {/* 3. The Day's Deck (Timeline & Cards) */}
        <section className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="p-2 bg-zinc-800 rounded-lg border border-white/5"><Calendar className="text-amber-500" size={20} /></span>
                    جدول اليوم
                </h2>
                
                {/* Status Summary */}
                   <div className="flex items-center gap-3 bg-background-subtle/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-inner">
                   <span className="text-xs text-zinc-500 font-bold">حجوزات اليوم:</span>
                   <span className="text-sm font-black text-white">{todaysBookings.length}</span>
                   <span className="text-[10px] text-zinc-600 font-mono">
                     {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                   </span>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {todaysBookings.length === 0 ? (
                    <div className="col-span-2 py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-4xl bg-zinc-900/20">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
                            <CheckCircle2 className="text-zinc-700" size={32} />
                        </div>
                        <p className="text-zinc-500 font-medium text-lg">لا توجد حجوزات نشطة اليوم.</p>
                    </div>
                ) : (
                    todaysBookings.map((booking) => (
                        <BookingOperationsCard 
                            key={booking.id} 
                            booking={booking} 
                            onClick={() => onSelectBooking?.(booking)}
                        />
                    ))
                )}
            </div>
        </section>

    </div>
  );
};

// --- Sub-Component: Smart Booking Card ---
const BookingOperationsCard = ({ booking, onClick }: { booking: Booking; onClick: () => void }) => {
    // Determine Status Color
    const isLate = false; // TODO: Implement Timeline Logic
    const hasBalance = (booking.totalAmount - booking.paidAmount) > 0;
    const isPrivate = booking.details?.isPrivate || false;
    
    // Status Logic
    const steps = [
        { status: BookingStatus.SHOOTING, label: 'تصوير' },
        { status: BookingStatus.SELECTION, label: 'اختيار' },
        { status: BookingStatus.EDITING, label: 'تعديل' },
        { status: BookingStatus.DELIVERED, label: 'جاهز' }
    ];

    const currentStepIndex = steps.findIndex(s => s.status === booking.status);
    const activeStep = currentStepIndex === -1 ? 0 : currentStepIndex + 1; 

    return (
        <motion.div 
            whileHover={{ scale: 1.01 }}
            onClick={onClick}
            className="group relative overflow-hidden bg-[#14161c]/60 border border-white/5 rounded-3xl p-6 cursor-pointer hover:border-[#ff6d00]/30 transition-all duration-300 shadow-xl"
        >
             {/* Glass Gradient */}
             <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

             <div className="relative z-10 flex justify-between">
                 {/* Left: Time & Client */}
                 <div>
                     <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-zinc-800 rounded-lg text-white font-mono font-bold text-sm border border-white/10 shadow-inner">
                            {booking.details?.startTime || '00:00'}
                        </span>
                        {/* Status Badge */}
                         {isLate && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded border border-red-500/20 animate-pulse">
                                تأخير
                            </span>
                         )}
                         <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                            booking.status === BookingStatus.SHOOTING ? 'bg-[#ff6d00]/20 text-[#ff6d00] border-[#ff6d00]/20 animate-pulse' : 
                            booking.status === BookingStatus.CONFIRMED ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' :
                            'bg-zinc-700 text-zinc-400 border-zinc-600'
                         }`}>
                            {booking.status === BookingStatus.SHOOTING ? 'جاري التصوير' : booking.status}
                         </span>
                     </div>
                     
                     <h3 className="text-xl font-bold text-white leading-tight mb-1 group-hover:text-[#ff6d00] transition-colors">
                         {booking.clientName}
                     </h3>
                     
                     <div className="flex items-center gap-3 text-zinc-500 text-xs font-medium uppercase tracking-wide mt-2">
                         <span className="flex items-center gap-1"><Command size={12}/> {booking.category}</span>
                         {isPrivate && (
                            <span className="text-rose-400 flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">
                                <AlertTriangle size={10} /> خاص (Private)
                            </span>
                         )}
                     </div>
                 </div>

                 {/* Right: Operational Status */}
                 <div className="text-right space-y-4">
                     {/* Collection Status (Privacy Aware) */}
                     <div className="flex flex-col items-end p-2 bg-zinc-950/30 rounded-xl border border-white/5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">المبلغ المتبقي</span>
                        <div className={`text-lg font-black font-mono tracking-tight ${hasBalance ? 'text-[#ff6d00]' : 'text-emerald-500'}`}>
                            {hasBalance 
                                ? Intl.NumberFormat('en-US').format(booking.totalAmount - booking.paidAmount)
                                : 'تم الدفع'
                            }
                        </div>
                     </div>

                     {/* Quick Actions */}
                     <div className="flex gap-2 justify-end">
                        <button className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-500 flex items-center justify-center transition-all border border-transparent hover:border-rose-500/30" title="تسجيل مشكلة">
                             <Clock size={14} />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-zinc-500 flex items-center justify-center transition-all border border-transparent hover:border-emerald-500/30" title="قائمة التحقق">
                             <CheckCircle2 size={14} />
                        </button>
                     </div>
                 </div>
             </div>

             {/* Bottom: Progress Pipeline (Visualizing State) */}
             <div className="mt-6"> 
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-600 mb-2 px-1">
                    <span>تصوير</span>
                    <span>اختيار</span>
                    <span>تعديل</span>
                    <span>جاهز</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                    {/* Segmented Progress */}
                    <div className={`flex-1 border-r border-zinc-900 transition-colors ${activeStep >= 1 ? 'bg-blue-500' : 'bg-zinc-800'}`}></div>
                    <div className={`flex-1 border-r border-zinc-900 transition-colors ${activeStep >= 2 ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div>
                    <div className={`flex-1 border-r border-zinc-900 transition-colors ${activeStep >= 3 ? 'bg-purple-500' : 'bg-zinc-800'}`}></div>
                    <div className={`flex-1 transition-colors ${activeStep >= 4 ? 'bg-emerald-500' : 'bg-zinc-800'}`}></div>
                </div>
             </div>
        </motion.div>
    );
};

export default DashboardOverview;
