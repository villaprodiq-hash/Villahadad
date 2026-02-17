import React, { useMemo } from 'react';
import { Booking, BookingStatus, BookingCategory, StatusHistoryItem, User } from '../../../../types';
import { 
  Clock, Camera, Calendar, ArrowRight, Search, 
  Sparkles, Play, CheckCircle2, AlertTriangle, 
  Activity, TrendingUp, Users, Plus, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { formatMoney } from '../../../../utils/formatMoney';
import { differenceInDays, parseISO } from 'date-fns';

const getTimeInStage = (statusHistory: StatusHistoryItem[], currentStatus: BookingStatus) => {
  if (!statusHistory || statusHistory.length === 0) return 0;
  const lastEntry = [...statusHistory].reverse().find(h => h.status === currentStatus);
  if (!lastEntry) return 0;
  return differenceInDays(new Date(), parseISO(lastEntry.timestamp));
};

interface UnifiedPulseProps {
  bookings: Booking[];
  users: User[];
  onViewBooking: (id: string) => void;
  onStatusUpdate: (id: string, status: BookingStatus) => void;
}

const STAGES = [
  { status: BookingStatus.CONFIRMED, title: 'Upcoming', icon: <Calendar size={14} />, color: 'blue' },
  { status: BookingStatus.SHOOTING, title: 'Shooting', icon: <Camera size={14} />, color: 'amber' },
  { status: BookingStatus.SELECTION, title: 'Selection', icon: <Search size={14} />, color: 'purple' },
  { status: BookingStatus.EDITING, title: 'Editing', icon: <Sparkles size={14} />, color: 'pink' },
  { status: BookingStatus.READY_TO_PRINT, title: 'Printing', icon: <Play size={14} />, color: 'orange' },
  { status: BookingStatus.READY_FOR_PICKUP, title: 'Pickup', icon: <ArrowRight size={14} />, color: 'emerald' },
  { status: BookingStatus.DELIVERED, title: 'Delivered', icon: <CheckCircle2 size={14} />, color: 'green' },
];

const UnifiedPulse: React.FC<UnifiedPulseProps> = ({ bookings, users, onViewBooking, onStatusUpdate: _onStatusUpdate }) => {
  
  const stats = useMemo(() => {
    return STAGES.map(stage => {
      const stageBookings = bookings.filter(b => b.status === stage.status);
      const totalValue = stageBookings.reduce((acc, b) => acc + b.totalAmount, 0);
      const avgDays = stageBookings.length > 0 
        ? Math.round(stageBookings.reduce((acc, b) => acc + getTimeInStage(b.statusHistory || [], b.status), 0) / stageBookings.length)
        : 0;
      const criticalCount = stageBookings.filter(b => getTimeInStage(b.statusHistory || [], b.status) > 5).length;
      
      return {
        ...stage,
        bookings: stageBookings,
        totalValue,
        avgDays,
        criticalCount,
        load: stageBookings.length // Simple load metric
      };
    });
  }, [bookings]);

  const totalWorkflowValue = useMemo(() => bookings.reduce((acc, b) => acc + b.totalAmount, 0), [bookings]);

  return (
    <div className="w-full h-full flex flex-col gap-6 pt-4 px-4 pb-0 bg-transparent rounded-[3rem] overflow-hidden">
      
      {/* Top Pulse Bar - Ultra Compact Global Overview Pills */}
      <div className="flex items-center gap-3 px-2 overflow-x-auto no-scrollbar py-1">
         {/* 1. Pipeline Value */}
         {/* 8. Slim Global Stats Pulse 🛰️ [NEW]
- **Card-to-Pill Transition**: Replace large metric cards with compact horizontal pills.
- **Vertical Shrinkage**: Reduce height from ~80px to ~40px.
- **Icon Minimization**: Shrink icons and integrate them more tightly with the values.

### 9. Borderless Ultra-Slick Transition (Global Manager) ☁️ [NEW]
- **Ghost Borders**: Remove `border-gray-100`, `border-gray-200`, and `border-gray-300` from all widget containers. 
- **Shadow Overlays**: Replace borders with subtle `shadow-sm` or `shadow-md` for separation.
- **Ring Removal**: Remove ` ` and ` ` that create artificial boundary lines.
- **Glass Refinement**: Use `bg-white/40` or `bg-gray-100/10` for background differentiation without lines.
 */}
         {/* 1. Pipeline Value */}
         <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-[#1a1c22]/80 backdrop-blur-xl rounded-2xl shadow-sm shrink-0 min-w-[160px] border border-transparent dark:border-white/5">
            <div className="w-8 h-8 bg-amber-100/50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-inner">
               <TrendingUp size={16} />
            </div>
            <div>
               <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none mb-1">Pipeline Value</p>
               <h4 className="text-sm font-black text-gray-900 dark:text-white leading-none">{formatMoney(totalWorkflowValue, 'USD')}</h4>
            </div>
         </div>

         {/* 2. Total Active */}
         <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-[#1a1c22]/80 backdrop-blur-xl rounded-2xl shadow-sm shrink-0 min-w-[160px] border border-transparent dark:border-white/5">
            <div className="w-8 h-8 bg-blue-100/50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-500 shadow-inner">
               <Activity size={16} />
            </div>
            <div>
               <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none mb-1">Active Bookings</p>
               <h4 className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  {bookings.filter(b => b.status !== BookingStatus.DELIVERED).length} <span className="text-[10px] text-gray-400 dark:text-gray-600 font-bold ml-0.5">Tracked</span>
               </h4>
            </div>
         </div>

         {/* 3. Delayed Tasks */}
         <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-[#1a1c22]/80 backdrop-blur-xl rounded-2xl shadow-sm shrink-0 min-w-[160px] border border-transparent dark:border-white/5">
            <div className="w-8 h-8 bg-red-100/50 dark:bg-red-500/10 rounded-xl flex items-center justify-center text-red-600 dark:text-red-500 shadow-inner">
               <AlertTriangle size={16} />
            </div>
            <div>
               <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none mb-1">Urgent Alerts</p>
               <h4 className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  {bookings.filter(b => getTimeInStage(b.statusHistory || [], b.status) > 5).length} <span className="text-[10px] text-gray-400 dark:text-gray-600 font-bold ml-0.5">Bottlenecks</span>
               </h4>
            </div>
         </div>

         {/* 4. Team Load */}
         <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-[#1a1c22]/80 backdrop-blur-xl rounded-2xl shadow-sm shrink-0 min-w-[160px] border border-transparent dark:border-white/5">
            <div className="w-8 h-8 bg-emerald-100/50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-500 shadow-inner">
               <Users size={16} />
            </div>
            <div>
               <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none mb-1">Operational Load</p>
               <h4 className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  {users.length} <span className="text-[10px] text-gray-400 dark:text-gray-600 font-bold ml-0.5">Engineers</span>
               </h4>
            </div>
         </div>
      </div>

      {/* Main Command Grid - All 7 Stages At Once */}
      <div className="flex-1 grid grid-cols-7 gap-3 min-h-0">
         {stats.map((stage) => {
            const isCritical = stage.criticalCount > 0;
            
            return (
               <div 
                 key={stage.title}
                 className={cn(
                   "flex flex-col h-full rounded-[2.5rem] transition-all duration-500 overflow-hidden border border-transparent dark:border-white/5",
                   isCritical 
                    ? "bg-white/90 dark:bg-[#1a1c22]/90 shadow-[0_8px_32px_rgba(239,68,68,0.08)] ring-1 ring-red-500/20" 
                    : "bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md shadow-sm"
                 )}
               >
                  {/* Stage Header - Compact & Refined */}
                  <div className="relative group/header overflow-hidden">
                     <div className="pt-3 pb-2 px-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                           <div className={cn("p-1.5 rounded-lg shadow-sm text-white shrink-0", 
                              stage.color === 'blue' ? 'bg-blue-500' :
                              stage.color === 'amber' ? 'bg-amber-500' :
                              stage.color === 'purple' ? 'bg-purple-500' :
                              stage.color === 'pink' ? 'bg-pink-500' :
                              stage.color === 'orange' ? 'bg-orange-500' :
                              stage.color === 'emerald' ? 'bg-emerald-500' : 'bg-green-500'
                           )}>
                              {stage.icon}
                           </div>
                           <div className="min-w-0">
                              <h5 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-none mb-1">{stage.title}</h5>
                              <div className="flex items-center gap-1.5">
                                 <span className="text-[8px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">{stage.load} Tasks</span>
                                 <div className="w-0.5 h-0.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                                 <span className="text-[8px] font-black text-gray-400 dark:text-gray-500">{formatMoney(stage.totalValue, 'USD')}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                           <button className="p-1 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
                             <Plus size={12} />
                           </button>
                           <button className="p-1 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
                             <MoreVertical size={12} />
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Micro-Task Chips Container */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar pb-3">
                     <AnimatePresence mode="popLayout">
                        {stage.bookings.map((booking) => (
                           <motion.div
                             key={booking.id}
                             layout
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             onClick={() => onViewBooking(booking.id)}
                             className={cn(
                               "group relative p-3 rounded-2xl transition-all cursor-pointer bg-white/40 dark:bg-[#000]/20 hover:bg-white/80 dark:hover:bg-[#252830] hover:shadow-xl border border-transparent dark:border-white/5",
                               getTimeInStage(booking.statusHistory || [], booking.status) > 5 
                                 ? "ring-1 ring-red-500/20" 
                                 : ""
                               )
                             }
                           >
                              <div className="flex justify-between items-start mb-2">
                                 {/* Tags Row */}
                                 <div className="flex flex-wrap gap-1">
                                    <span className={cn(
                                       "px-2 py-0.5 rounded-md text-[7px] font-black uppercase",
                                       booking.category === BookingCategory.WEDDING ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                       {booking.category}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[7px] font-black uppercase bg-gray-100 text-gray-500">
                                       {booking.currency}
                                    </span>
                                 </div>
                                 <button className="p-1 hover:bg-gray-100 rounded-md text-gray-300 transition-colors">
                                   <MoreVertical size={10} />
                                 </button>
                              </div>

                              <h6 className="text-[10px] font-black text-gray-900 dark:text-gray-200 mb-2 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                 {booking.title}
                              </h6>

                              {/* Real Subtasks (Future Implementation) */}
                              {/* <div className="space-y-1 mb-3">
                                 <button className="flex items-center gap-1 text-[8px] font-black text-gray-400 mt-1 hover:text-gray-900 transition-colors">
                                    <Plus size={8} /> Add Subtask
                                 </button>
                              </div> */}

                              <div className="flex items-center justify-between pt-2 mt-2">
                                 <div className="flex -space-x-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[7px] font-black shadow-sm">
                                       {booking.clientName.charAt(0)}
                                    </div>

                                 </div>
                                 <div className="flex items-center gap-2">
                                    {/* Future: Real Attachment Counts */}
                                 </div>
                              </div>

                              {/* Delay Badge Overlaid */}
                              {getTimeInStage(booking.statusHistory || [], booking.status) > 5 && (
                                 <div className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md shadow-sm">
                                    <AlertTriangle size={8} />
                                 </div>
                              )}
                           </motion.div>
                        ))}
                     </AnimatePresence>
                     {stage.bookings.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                           <CheckCircle2 size={24} className="text-gray-400" />
                        </div>
                     )}
                  </div>

                  {/* Stage Bottom Meta */}
                  <div className="p-3 bg-transparent flex items-center justify-between">
                     <div className="flex items-center gap-1">
                        <Clock size={10} className="text-gray-400" />
                        <span className="text-[8px] font-black text-gray-500 uppercase">Avg {stage.avgDays}D</span>
                     </div>
                     {isCritical && (
                        <div className="animate-pulse flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                           <span className="text-[8px] font-black text-red-600 uppercase">Alert</span>
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

export default UnifiedPulse;
