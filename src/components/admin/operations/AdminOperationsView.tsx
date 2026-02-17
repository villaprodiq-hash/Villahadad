import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar, Target, Activity, 
  Terminal as TerminalIcon, ChevronRight,
  Clock, CheckCircle2, Command
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Booking, BookingStatus, StatusLabels, CategoryLabels, User as UserType } from '../../../types';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import AdminOperationsDetailsView from './AdminOperationsDetailsView';

interface AdminOperationsViewProps {
  bookings: Booking[];
  users?: UserType[];
  onSelectBooking: (booking: Booking) => void;
  onAddBooking: () => void;
}

type ActiveTab = 'all' | 'pending' | 'processing' | 'completed';

const AdminOperationsView: React.FC<AdminOperationsViewProps> = ({ 
  bookings, users: _users = [], onSelectBooking: _onSelectBooking, onAddBooking: _onAddBooking 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedOp, setSelectedOp] = useState<Booking | null>(null);

  const tabs: Array<{ id: ActiveTab; label: string; icon: LucideIcon }> = [
    { id: 'all', label: 'الكل', icon: Command },
    { id: 'pending', label: 'قيد الانتظار', icon: Clock },
    { id: 'processing', label: 'جاري التنفيذ', icon: Activity },
    { id: 'completed', label: 'مكتمل', icon: CheckCircle2 },
  ];

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const clientName = b.clientName || '';
      const title = b.title || '';
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           title.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'pending') matchesTab = b.status === BookingStatus.INQUIRY;
      else if (activeTab === 'processing') matchesTab = [BookingStatus.CONFIRMED, BookingStatus.SHOOTING, BookingStatus.EDITING, BookingStatus.PRINTING, BookingStatus.SELECTION].includes(b.status);
      else if (activeTab === 'completed') matchesTab = [BookingStatus.DELIVERED, BookingStatus.ARCHIVED].includes(b.status);
      
      return matchesSearch && matchesTab;
    });
  }, [bookings, searchTerm, activeTab]);

  return (
    <div className="h-full flex flex-col font-sans text-zinc-100 p-6" dir="rtl">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
             <div>
                <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                    <span className="p-3 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl">
                        <Target className="text-cyan-500" size={24} />
                    </span>
                    سجل العمليات
                </h2>
                <p className="text-zinc-500 font-medium text-xs tracking-wider uppercase flex items-center gap-2">
                    <Activity size={12} className="text-emerald-500 animate-pulse" />
                    النظام يعمل بكفاءة 100%
                </p>
             </div>

             <div className="flex items-center gap-3 bg-zinc-900/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                            activeTab === tab.id 
                            ? 'bg-linear-to-br from-zinc-800 to-zinc-900 text-white shadow-lg border border-white/10' 
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? 'text-amber-500' : ''} />
                        {tab.label}
                    </button>
                ))}
             </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative group max-w-2xl">
            <div className="absolute inset-0 bg-linear-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center bg-zinc-900/80 border border-white/10 rounded-2xl p-2 focus-within:border-amber-500/50 transition-colors shadow-lg backdrop-blur-xl">
                <Search className="text-zinc-500 mr-3 ml-2" size={20} />
                <input 
                    type="text" 
                    placeholder="بحث سريع عن عملية، عميل، أو رقم مرجعي..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none"
                />
                 <button className="p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
                    <Filter size={18} />
                 </button>
            </div>
        </div>

        {/* Operations Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-20">
             {filteredBookings.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-32 opacity-30 text-center">
                     <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
                        <TerminalIcon size={48} className="text-zinc-700" />
                     </div>
                     <p className="text-lg font-bold text-zinc-500">لا توجد عمليات مطابقة</p>
                     <p className="text-xs text-zinc-600 mt-2">جرّب تغيير فلاتر البحث</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 gap-3">
                     <AnimatePresence>
                        {filteredBookings.map((booking, i) => (
                            <motion.div 
                                key={booking.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => setSelectedOp(booking)}
                                className="group relative bg-zinc-900/40 border border-white/5 hover:border-amber-500/20 hover:bg-zinc-900/60 rounded-3xl p-5 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl rounded-full translate-x-10 -translate-y-10 pointer-events-none"></div>
                                
                                <div className="relative z-10 flex items-center justify-between gap-6">
                                    
                                    {/* ID & Type */}
                                    <div className="flex items-center gap-4 min-w-[180px]">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 font-black text-lg group-hover:text-amber-500 group-hover:border-amber-500/20 transition-all">
                                            {(i + 1).toString().padStart(2, '0')}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-mono mb-1 uppercase tracking-widest">
                                                {CategoryLabels[booking.category]}
                                            </p>
                                            <p className="text-white font-bold text-base truncate max-w-[150px]">
                                                {booking.clientName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timeline Info */}
                                    <div className="hidden md:flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Calendar size={12} />
                                            {format(parseISO(booking.shootDate), 'yyyy-MM-dd')}
                                        </div>
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">تاريخ التنفيذ</span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="min-w-[120px] text-center">
                                        <StatusBadge status={booking.status} />
                                    </div>

                                    {/* Action Arrow */}
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-amber-500 group-hover:text-black transition-all transform group-hover:rotate-180">
                                        <ChevronRight size={18} className="rotate-180" />
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                     </AnimatePresence>
                 </div>
             )}
        </div>

        {/* Details Modal */}
        {selectedOp && (
            <AdminOperationsDetailsView 
                booking={selectedOp} 
                onClose={() => setSelectedOp(null)} 
                onUpdate={(id, updates) => {
                    console.log('Update payload:', updates);
                }}
            />
        )}
    </div>
  );
};

// --- Helper Components ---
const StatusBadge = ({ status }: { status: BookingStatus }) => {
    const styles = {
        [BookingStatus.SHOOTING]: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
        [BookingStatus.CONFIRMED]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        [BookingStatus.EDITING]: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        [BookingStatus.DELIVERED]: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        [BookingStatus.INQUIRY]: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        [BookingStatus.ARCHIVED]: 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50',
        [BookingStatus.SELECTION]: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        [BookingStatus.PRINTING]: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
        [BookingStatus.READY_TO_PRINT]: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
        [BookingStatus.READY_FOR_PICKUP]: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    };

    return (
        <span className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shadow-sm ${styles[status] || styles[BookingStatus.INQUIRY]}`}>
            {StatusLabels[status] || status}
        </span>
    );
};

export default AdminOperationsView;
