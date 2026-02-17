
import React, { useState } from 'react';
import { 
  X, Cpu, Terminal as TerminalIcon,
  DollarSign, Package, Zap, Target, Calendar
} from 'lucide-react';
import { Booking, BookingStatus, StatusLabels, CategoryLabels } from '../../../types';

interface AdminOperationsDetailsViewProps {
  booking: Booking;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Booking>) => void;
}

const AdminOperationsDetailsView: React.FC<AdminOperationsDetailsViewProps> = ({ 
  booking, onClose, onUpdate 
}) => {
    const [status, setStatus] = useState(booking.status);

    const handleOverrideStatus = (newStatus: BookingStatus) => {
        setStatus(newStatus);
        onUpdate(booking.id, { status: newStatus });
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 lg:p-12 overflow-hidden bg-[#0B0E14]/90 backdrop-blur-2xl font-mono" dir="rtl">
            <div className="w-full h-full max-w-7xl bg-[#0B0E14] border border-cyan-500/30 rounded-[3rem] shadow-[0_0_100px_rgba(0,242,255,0.1)] flex flex-col relative overflow-hidden">
                
                {/* HUD Header */}
                <div className="p-8 border-b border-cyan-500/10 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.2)]">
                            <Cpu size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-cyan-400 opacity-50 uppercase tracking-[0.5em]">Sentinel / رابط الاتصال / {booking.id.slice(0, 8)}</p>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{booking.clientName}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-2xl transition-all border border-white/5">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-8 grid grid-cols-12 gap-8">
                    
                    {/* Left: Tactical Metrics */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        
                        {/* Status Hub */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'هدف الحالة', value: StatusLabels[status], icon: Target, color: 'text-cyan-400' },
                                { label: 'المسار التشغيلي', value: CategoryLabels[booking.category], icon: Package, color: 'text-purple-400' },
                                { label: 'تاريخ النشر', value: booking.shootDate, icon: Calendar, color: 'text-amber-400' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-cyan-500/20 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <stat.icon size={16} className={stat.color} />
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <p className="text-xl font-black text-white tracking-tight uppercase">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* System Overrides */}
                        <div className="bg-[#0B0E14]/40 border border-cyan-500/10 rounded-[2.5rem] p-8">
                            <h3 className="text-xs font-black text-cyan-400/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Zap size={14} className="text-amber-500" />
                                تجاوزات لعمليات
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.values(BookingStatus).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleOverrideStatus(s)}
                                        className={`px-6 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.3)]' : 'bg-white/5 border-white/5 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30'}`}
                                    >
                                        {StatusLabels[s]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Financial Ledger HUD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-linear-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
                                <DollarSign size={80} className="absolute -bottom-4 -left-4 text-cyan-400/5 opacity-20" />
                                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4">عائد العقد</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white tracking-tighter">${booking.totalAmount.toLocaleString()}</span>
                                    <span className="text-cyan-400 font-bold">USD</span>
                                </div>
                                <div className="mt-6 flex gap-4">
                                     <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[10px] font-black">
                                        المدفوع: ${booking.paidAmount.toLocaleString()}
                                     </div>
                                     <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px] font-black">
                                        المستحق: ${(booking.totalAmount - booking.paidAmount).toLocaleString()}
                                     </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">تخصيص الموارد</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] text-gray-400">القائد التكتيكي</span>
                                        <span className="text-[10px] font-black text-cyan-400 uppercase">المشرف_نشط</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5">
                                        <span className="text-[10px] text-gray-400">نواة التصميم</span>
                                        <span className="text-[10px] font-black text-purple-400 uppercase">محرر_صور_S1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Operational Logs */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                         <div className="h-full bg-black/40 border border-cyan-500/10 rounded-[2.5rem] p-8 flex flex-col relative">
                            <h3 className="text-xs font-black text-cyan-400/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TerminalIcon size={14} />
                                سجلات المهمة
                            </h3>
                            <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar font-mono text-[10px]">
                                {[
                                    { time: '12:45:01', msg: 'تم تحديث الحالة التشغيلية إلى التصوير', user: 'المشرف' },
                                    { time: '10:20:15', msg: 'تم التحقق من عائد العقد بواسطة الخزينة', user: 'النظام' },
                                    { time: '09:00:00', msg: 'تم بدء مسار الحجز', user: 'الاستقبال' },
                                ].map((log, i) => (
                                    <div key={i} className="relative pr-6 before:absolute before:right-0 before:top-1 before:bottom-0 before:w-px before:bg-cyan-500/20">
                                        <div className="absolute right-[-3px] top-1 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_#00F2FF]"></div>
                                        <p className="text-cyan-400/40 mb-1">{log.time} • {log.user}</p>
                                        <p className="text-gray-300 leading-relaxed font-bold">{log.msg}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8">
                                <button className="w-full py-4 bg-cyan-500 text-black font-black uppercase text-[12px] rounded-2xl shadow-[0_0_30px_rgba(0,242,255,0.2)] hover:scale-[1.02] transition-all active:scale-[0.98]">
                                    تنفيذ الحفظ
                                </button>
                            </div>
                         </div>
                    </div>
                </div>

                {/* HUD Footer Background Decoration */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            </div>
        </div>
    );
};

export default AdminOperationsDetailsView;
