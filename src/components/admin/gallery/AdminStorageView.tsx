
import React, { useMemo } from 'react';
import { 
  Database, HardDrive, ShieldCheck, Activity, 
  Search, Folder, CheckCircle, Clock, Server, 
  Cpu, Zap, BarChart3, RefreshCw
} from 'lucide-react';
import { Booking, BookingStatus, BookingCategory } from '../../../types';

interface AdminStorageViewProps {
  bookings: Booking[];
}

const AdminStorageView: React.FC<AdminStorageViewProps> = ({ bookings }) => {
  const stats = useMemo(() => {
    const totalFolders = bookings.length;
    const synced = bookings.filter(b => b.status === BookingStatus.DELIVERED).length;
    const pending = totalFolders - synced;
    const storageUsed = (totalFolders * 1.5).toFixed(1); // Mock 1.5GB per folder
    return { totalFolders, synced, pending, storageUsed };
  }, [bookings]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono" dir="rtl">
        
        {/* Storage HUD Header */}
        <div className="bg-[#0B0E14]/60 backdrop-blur-3xl border border-cyan-500/20 rounded-4xl p-4 mb-4">
             <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <Server size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">مركز التخزين / الشبكة</h2>
                        <p className="text-[10px] text-purple-400/50 font-mono tracking-widest uppercase">مراقبة تدفق البيانات السحابية</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto flex-1 max-w-2xl">
                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[9px] text-gray-500 uppercase font-black mb-1">استهلاك القرص</p>
                        <p className="text-xl font-black text-white">{stats.storageUsed} TB</p>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[9px] text-gray-500 uppercase font-black mb-1">نسبة المزامنة</p>
                        <p className="text-xl font-black text-emerald-400">{Math.round((stats.synced/stats.totalFolders)*100)}%</p>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                        <p className="text-[9px] text-gray-500 uppercase font-black mb-1">ملفات نشطة</p>
                        <p className="text-xl font-black text-cyan-400">{stats.totalFolders}</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl">
                        <p className="text-[9px] text-purple-400 uppercase font-black mb-1">Synology حالة</p>
                        <p className="text-xl font-black text-purple-400">نشط</p>
                    </div>
                </div>
             </div>
        </div>

        {/* Assets Grid (Abstract Terminals) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-y-auto custom-scrollbar pb-12">
            {bookings.map((booking, i) => (
                <div key={booking.id} className="bg-[#0B0E14]/60 backdrop-blur-md border border-white/5 rounded-xl p-3 hover:border-cyan-500/30 group transition-all relative overflow-hidden flex flex-col gap-3">
                    
                    {/* Header: Icon & Name */}
                    <div className="flex items-start gap-3">
                         <div className="p-2.5 bg-white/5 rounded-lg text-gray-500 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors shrink-0">
                            {booking.category === BookingCategory.WEDDING ? <Folder size={18} /> : <HardDrive size={18} />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h3 className="font-black text-white text-sm truncate uppercase tracking-tight mb-0.5" title={booking.clientName}>
                                {booking.clientName}
                            </h3>
                            <p className="text-[9px] text-gray-600 font-mono tracking-widest uppercase truncate">
                                ID_{booking.id.slice(0, 8)}
                            </p>
                         </div>
                         {/* Status Dot */}
                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${booking.status === BookingStatus.DELIVERED ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <span className="text-[8px] text-gray-600 font-bold block mb-0.5">SIZE</span>
                            <div className="flex items-center gap-1.5 text-gray-300">
                                <HardDrive size={10} />
                                <span className="text-[10px] font-mono font-bold">{Math.floor(Math.random() * 50) + 10}GB</span>
                            </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <span className="text-[8px] text-gray-600 font-bold block mb-0.5">UPDATED</span>
                            <div className="flex items-center gap-1.5 text-gray-300">
                                <Clock size={10} />
                                <span className="text-[10px] font-mono font-bold">
                                    {booking.status === BookingStatus.DELIVERED ? booking.shootDate : 'Today'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sentinel Scanline */}
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400/20 group-hover:h-full transition-all duration-700 pointer-events-none opacity-0 group-hover:opacity-5"></div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default AdminStorageView;
