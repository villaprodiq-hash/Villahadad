import React, { useState } from 'react';
import { 
  Eye, HardDrive, CheckCircle2, AlertOctagon, 
  CalendarDays, Printer, 
  Clock, ArrowRight, Search, Sparkles, X, Phone 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- مكونات تصميم محسّنة ---
const GlassCard = ({ children, className = "", danger = false, gradient = false, onClick }: { children: React.ReactNode, className?: string, danger?: boolean, gradient?: boolean, onClick?: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-300 group
      ${danger
        ? 'bg-linear-to-br from-rose-500/10 to-rose-500/10 border-rose-500/20 hover:border-rose-500/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)]'
        : gradient
        ? 'bg-linear-to-br from-zinc-900/60 to-zinc-800/40 border-white/10 hover:border-purple-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)]'
        : 'bg-zinc-900/60 border-white/10 hover:border-purple-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)]'
      }
      ${onClick ? 'cursor-pointer' : ''}
      ${className}
    `}
  >
    {/* Shine Effect */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
    
    {children}
  </motion.div>
);

const SectionTitle = ({
  icon: Icon,
  title,
  color,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  color: string;
  badge?: string;
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`p-2.5 rounded-xl bg-linear-to-br from-purple-500/10 to-purple-500/10 border border-purple-500/20 shadow-sm`}>
      <Icon size={18} className={color} />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    {badge && (
      <span className="ml-auto px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
        {badge}
      </span>
    )}
  </div>
);

import { Booking, BookingStatus } from '../../../types';

interface SelectionHomeViewProps {
  bookings?: Booking[];
  onNavigateToGallery?: () => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

const SelectionHomeView: React.FC<SelectionHomeViewProps> = ({ bookings = [], onNavigateToGallery, onStatusUpdate }) => {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<Booking | null>(null);

  // --- Real Stats Calculation ---
  const stats = [
    { label: 'مواعيد العرض اليوم', value: bookings.filter(b => b.status === BookingStatus.SELECTION).length, icon: Eye, color: 'text-purple-600', gradient: 'from-purple-500 to-purple-600', key: 'sessions' },
    { label: 'بانتظار النقل', value: bookings.filter(b => b.status === BookingStatus.SHOOTING).length, icon: HardDrive, color: 'text-amber-600', gradient: 'from-amber-500 to-amber-600', key: 'transfers' },
    { label: 'جاهز للاستلام', value: bookings.filter(b => b.status === BookingStatus.READY_FOR_PICKUP).length, icon: CheckCircle2, color: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600', key: 'ready' },
    { label: 'فائت الموعد', value: bookings.filter(b => {
        if (!b.shootDate) return false;
        const shootDate = new Date(b.shootDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        shootDate.setHours(0,0,0,0);
        return shootDate < today && b.status === BookingStatus.CONFIRMED;
    }).length, icon: AlertOctagon, color: 'text-rose-600', gradient: 'from-rose-500 to-rose-600', key: 'missed' },
  ];

  // --- Filter Logic ---
  const filteredBookings = bookings.filter(b => {
      if (!searchQuery) return true;
      const clientName = b.clientName || '';
      const title = b.title || '';
      return clientName.toLowerCase().includes(searchQuery.toLowerCase()) || title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 1. Selection Schedule: Bookings waiting for or in selection
  const selectionSchedule = filteredBookings.filter(b =>
      b.status === BookingStatus.SHOOTING_COMPLETED || b.status === BookingStatus.SELECTION
  ).map(b => ({
      id: b.id,
      client: b.clientName,
      type: b.title,
      time: b.shootDate,
      status: b.status === BookingStatus.SELECTION ? 'In Progress' : 'Waiting',
      image: b.category === 'Wedding' ? '💑' : '📸',
      date: 'today',
      raw: b
  }));

  // 3. Ready for Pickup
  const readyForPickup = bookings.filter(b => b.status === BookingStatus.READY_FOR_PICKUP);

  const missed = bookings.filter(b => {
      if (!b.shootDate) return false;
      const shootDate = new Date(b.shootDate);
      const today = new Date();
      // Reset hours to compare dates only
      today.setHours(0,0,0,0);
      shootDate.setHours(0,0,0,0);
      
      return shootDate < today && b.status === BookingStatus.CONFIRMED;
  }).map(b => ({
      id: b.id,
      client: b.clientName,
      phone: b.clientPhone,
      date: b.shootDate.slice(0, 10)
  }));

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="h-full w-full px-2 pb-2 space-y-2 overflow-hidden">
      
      {/* 1. Header & Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex flex-col md:flex-row justify-between items-end gap-1">
          <div>
             <h1 className="text-base font-black bg-linear-to-r from-white via-purple-400 to-white bg-clip-text text-transparent tracking-tight flex items-center gap-1">
               صالة العرض
               <Sparkles className="text-purple-500 animate-pulse" size={12} />
             </h1>
             <p className="text-zinc-400 font-medium text-[9px]">مراقبة دورة حياة الصور</p>
          </div>
          
          {/* Filters */}
          <div className="bg-zinc-900/60 p-0.5 rounded-lg border border-white/10 flex shadow-lg shadow-black/50">
            {(['today', 'tomorrow', 'week'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-2.5 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                  filter === f
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
                }`}
              >
                {filter === f && (
                  <motion.div 
                    layoutId="filter-bg"
                    className="absolute inset-0 bg-linear-to-r from-purple-500 to-purple-600 rounded-md shadow-lg shadow-purple-500/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {f === 'today' ? 'اليوم' : f === 'tomorrow' ? 'غداً' : 'الأسبوع'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map((stat, i) => (
            <GlassCard 
              key={i} 
              gradient 
              className="p-1 flex items-center gap-1"
              onClick={() => setSelectedStat(stat.key)}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-linear-to-br ${stat.gradient} shadow-lg`}>
                <stat.icon size={10} className="text-white" />
              </div>
              <div>
                <p className="text-zinc-400 text-[7px] font-bold uppercase tracking-wider leading-tight">{stat.label}</p>
                <p className="text-base font-black text-white">{stat.value}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 flex-1 overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div className="xl:col-span-2 space-y-2 overflow-hidden flex flex-col">
          
          {/* A. Selections Timeline */}
          <GlassCard gradient className="p-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle 
                icon={CalendarDays} 
                title={`جدول العرض`} 
                color="text-purple-600"
                badge={`${selectionSchedule.length} موعد`}
              />
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600" size={10} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث..."
                  className="w-24 h-6 pr-6 pl-2 text-[8px] rounded-lg border border-white/10 bg-zinc-900/60 text-white placeholder-zinc-600 focus:border-purple-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {selectionSchedule.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={item.status === 'In Progress' ? onNavigateToGallery : () => {
                        if (onStatusUpdate && item.status === 'Waiting') {
                             // Confirm start selection
                             if (window.confirm(`بدء جلسة الاختيار للعميل ${item.client}؟`)) {
                                 onStatusUpdate(item.id, BookingStatus.SELECTION);
                             }
                        }
                    }}
                    className={`group relative bg-linear-to-br from-zinc-900/60 to-zinc-800/40 p-1 rounded-md border transition-all cursor-pointer overflow-hidden ${
                      item.status === 'In Progress'
                        ? 'border-purple-300 shadow-xl shadow-purple-200/50'
                        : 'border-white/10 hover:border-purple-200 hover:shadow-lg'
                    }`}
                  >
                    {item.status === 'In Progress' && (
                       <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-purple-200/30 to-transparent blur-2xl rounded-full" />
                    )}
                    
                    <div className="flex justify-between items-start relative z-10 mb-0.5">
                      <div className="flex gap-1">
                         <div className="w-8 h-8 rounded-md bg-linear-to-br from-purple-500/10 to-purple-500/10 border border-purple-500/20 flex items-center justify-center text-base shadow-lg">
                           {item.image}
                         </div>
                         <div>
                           <h4 className="text-white font-bold text-[10px] leading-tight group-hover:text-purple-600 transition-colors">{item.client}</h4>
                           <span className="text-[7px] text-zinc-400 inline-block px-0.5 py-0.5 bg-zinc-800 rounded-full">{item.type}</span>
                         </div>
                      </div>
                      <div className="text-left bg-linear-to-br from-purple-500/10 to-purple-500/10 px-0.5 py-0.5 rounded-sm border border-purple-500/20">
                         <span className="block text-[10px] font-black text-purple-400 font-mono leading-none">{item.time.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="pt-0.5 border-t border-white/10 flex justify-between items-center relative z-10">
                       <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full border ${
                         item.status === 'In Progress'
                           ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse'
                           : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                       }`}>
                         {item.status === 'In Progress' ? '• جاري العرض الآن' : 'بانتظار الاختيار'}
                       </span>
                       <div className="flex items-center gap-1">
                          {item.status === 'In Progress' && (
                             <button
                               onClick={(e) => {
                                   e.stopPropagation();
                                   if (onStatusUpdate) {
                                       if (window.confirm(`إنهاء الاختيار وإرسال الصور للعميل ${item.client} للتعديل؟`)) {
                                           onStatusUpdate(item.id, BookingStatus.EDITING);
                                       }
                                   }
                               }}
                               className="text-[7px] text-white bg-purple-600 hover:bg-purple-700 px-2 py-0.5 rounded-full font-bold transition-colors"
                             >
                               إنهاء وإرسال
                             </button>
                          )}
                          <button className="flex items-center text-[7px] text-purple-600 hover:text-purple-700 font-bold transition-colors">
                              {item.status === 'In Progress' ? 'دخول' : 'بدء الاختيار'}
                              <ArrowRight size={8} className="group-hover:-translate-x-1 transition-transform" />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                ))}
            {selectionSchedule.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center p-8 text-zinc-600">
                    <p className="text-[10px]">لا توجد جلسات اختيار اليوم</p>
                </div>
            )}
              </AnimatePresence>
            </div>
          </GlassCard>


        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-2 overflow-hidden flex flex-col">
          
          {/* 1. Missed Appointments */}
          <AnimatePresence>
            {missed.length > 0 && (
              <GlassCard danger className="p-1.5">
                 <div className="flex items-center gap-2 mb-2 text-rose-400">
                    <AlertOctagon size={14} className="animate-pulse" />
                    <h3 className="font-bold text-[10px]">فائت الموعد</h3>
                 </div>
                 <div className="space-y-1.5">
                   {missed.map(m => (
                     <div key={m.id} className="bg-linear-to-br from-rose-500/10 to-rose-500/10 border-2 border-rose-500/20 p-2 rounded-xl shadow-lg">
                        <p className="text-white font-bold text-[11px]">{m.client}</p>
                        <p className="text-[8px] text-rose-400 mt-0.5 flex items-center gap-1 font-medium">
                          <Clock size={8} /> موعده كان: {m.date}
                        </p>
                        <button 
                          onClick={() => handleCall(m.phone)}
                          className="w-full mt-2 py-1.5 bg-linear-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-[9px] font-bold rounded-lg transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-1"
                        >
                           <Phone size={10} />
                           اتصال فوري
                        </button>
                     </div>
                   ))}
                 </div>
              </GlassCard>
            )}
          </AnimatePresence>

          {/* 2. Ready for Pickup */}
          <GlassCard gradient className="p-1.5 flex-1">
             <SectionTitle icon={CheckCircle2} title="جاهز للتسليم" color="text-emerald-600" badge={`${readyForPickup.length}`} />
             <div className="space-y-1.5">
                {readyForPickup.map((b) => (
                  <motion.div 
                    key={b.id}
                    whileHover={{ x: -2 }}
                    onClick={() => setSelectedPickup(b)}
                    className="group p-2 rounded-lg bg-linear-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 hover:border-emerald-300 hover:shadow-md transition-all flex justify-between items-center cursor-pointer"
                  >
                     <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                           <Printer size={12} />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-white">{b.clientName}</p>
                           <p className="text-[7px] text-zinc-500">{b.title}</p>
                        </div>
                     </div>
                     <ArrowRight size={10} className="text-emerald-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </motion.div>
                ))}
                {readyForPickup.length === 0 && (
                   <div className="flex flex-col items-center justify-center p-4 text-zinc-600">
                     <p className="text-[9px]">لا توجد طلبات جاهزة</p>
                   </div>
                )}
             </div>
             
             <button
               onClick={() => alert('ميزة قادمة: تسجيل استلام يدوي')}
               className="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-white/10 text-zinc-400 text-[9px] font-bold hover:bg-linear-to-r hover:from-purple-500/10 hover:to-purple-500/10 hover:border-purple-300 hover:text-purple-400 transition-all"
             >
                + تسجيل استلام جديد
             </button>
          </GlassCard>

        </div>
      </div>

      {/* Stat Detail Modal */}
      <AnimatePresence>
        {selectedStat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStat(null)}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-zinc-900/60 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <button
                onClick={() => setSelectedStat(null)}
                className="absolute top-4 left-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
              <h2 className="text-xl font-bold text-white mb-4">
                {stats.find(s => s.key === selectedStat)?.label}
              </h2>
              <p className="text-zinc-400">تفاصيل إضافية ستظهر هنا...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pickup Detail Modal */}
      <AnimatePresence>
        {selectedPickup !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPickup(null)}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-zinc-900/60 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <button
                onClick={() => setSelectedPickup(null)}
                className="absolute top-4 left-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
              <h2 className="text-xl font-bold text-white mb-4">تسليم الطلب</h2>
              <p className="text-zinc-400 mb-4">{selectedPickup?.clientName} - {selectedPickup?.title}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    alert('تم تأكيد التسليم!');
                    setSelectedPickup(null);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
                >
                  تأكيد التسليم
                </button>
                <button
                  onClick={() => setSelectedPickup(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-white/10 text-zinc-300 rounded-lg font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectionHomeView;
