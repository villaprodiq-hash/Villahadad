
import React, { useMemo } from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { Booking, BookingStatus } from '../../../../types';

const PulseMonitor: React.FC<{ bookings?: Booking[] }> = ({ bookings = [] }) => {
    const stats = useMemo(() => {
      const active = bookings.filter(b => !b.deletedAt);
      // Active sessions = bookings not yet delivered/archived
      const activeSessions = active.filter(b =>
        b.status !== BookingStatus.DELIVERED &&
        b.status !== BookingStatus.ARCHIVED
      ).length;
      // Pending sync = bookings with pending approval
      const pendingSync = active.filter(b => b.approvalStatus === 'pending').length;
      // Critical alerts = overdue deliveries (past selection date + 60 days)
      const criticalAlerts = active.filter(b => {
        if (!b.actualSelectionDate) return false;
        const deadline = new Date(b.actualSelectionDate);
        deadline.setDate(deadline.getDate() + 60);
        return deadline.getTime() < Date.now() &&
          b.status !== BookingStatus.DELIVERED &&
          b.status !== BookingStatus.ARCHIVED;
      }).length;
      return { activeSessions, pendingSync, criticalAlerts };
    }, [bookings]);

    return (
        <div className="h-full w-full bg-[#0B0E14]/60 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-all"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <Activity size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-cyan-400/70 uppercase">مراقب النبض</h3>
                        <p className="text-sm font-black text-white uppercase tracking-tighter">
                          حالة النظام: {stats.criticalAlerts > 0 ? 'تنبيه' : 'نشط'}
                        </p>
                    </div>
                </div>
                <div className={`px-2 py-1 border rounded flex items-center gap-2 ${
                  stats.criticalAlerts > 0
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shadow-lg ${
                      stats.criticalAlerts > 0
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    }`}></div>
                    <span className={`text-[8px] font-mono font-bold ${
                      stats.criticalAlerts > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {stats.criticalAlerts > 0 ? 'يتطلب انتباه' : 'مستقر'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10 flex-1">
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-white font-mono">{String(stats.activeSessions).padStart(2, '0')}</span>
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-1">حجوزات نشطة</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-cyan-400 font-mono">{String(stats.pendingSync).padStart(2, '0')}</span>
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-1">بانتظار الموافقة</span>
                </div>
                <div className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center ${
                  stats.criticalAlerts > 0 ? 'bg-rose-500/5 border-rose-500/10' : 'bg-white/5 border-white/5'
                }`}>
                    <span className={`text-xl font-black font-mono ${stats.criticalAlerts > 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                      {String(stats.criticalAlerts).padStart(2, '0')}
                    </span>
                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-1">تسليمات متأخرة</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-cyan-500/10 flex items-center justify-between text-[8px] font-mono text-cyan-400/40 relative z-10">
                <span className="flex items-center gap-1"><ShieldCheck size={10}/> تحديث مباشر</span>
                <span className="flex items-center gap-1"><Zap size={10}/> إجمالي الحجوزات: {bookings.filter(b => !b.deletedAt).length}</span>
            </div>
        </div>
    );
};

export default PulseMonitor;
