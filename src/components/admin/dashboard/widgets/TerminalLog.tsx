
import React, { useMemo } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { Booking } from '../../../../types';

const TerminalLog: React.FC<{ bookings?: Booking[] }> = ({ bookings = [] }) => {
    // Generate real log entries from booking activity
    const logs = useMemo(() => {
      const entries: { time: string; msg: string; status: 'success' | 'info' | 'warning' }[] = [];

      const activeBookings = bookings.filter(b => !b.deletedAt);

      // Recent bookings (sorted by creation time)
      const sorted = [...activeBookings]
        .filter(b => b.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10);

      sorted.forEach(b => {
        const date = new Date(b.createdAt!);
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        // Creation entry
        entries.push({
          time,
          msg: `حجز جديد: ${b.clientName} (${b.category})`,
          status: 'info',
        });

        // Payment status
        if (b.paidAmount >= b.totalAmount && b.totalAmount > 0) {
          entries.push({
            time,
            msg: `تم الدفع بالكامل: ${b.clientName} - ${b.currency === 'USD' ? '$' : ''}${b.paidAmount.toLocaleString()}${b.currency === 'IQD' ? ' د.ع' : ''}`,
            status: 'success',
          });
        } else if (b.totalAmount > 0 && b.paidAmount > 0 && b.paidAmount < b.totalAmount) {
          const remaining = b.totalAmount - b.paidAmount;
          entries.push({
            time,
            msg: `متبقي: ${b.clientName} - ${b.currency === 'USD' ? '$' : ''}${remaining.toLocaleString()}${b.currency === 'IQD' ? ' د.ع' : ''}`,
            status: 'warning',
          });
        }
      });

      // Sort by time desc and take top 8
      return entries.slice(0, 8);
    }, [bookings]);

    return (
        <div className="h-full w-full bg-black/40 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4 flex flex-col relative overflow-hidden font-mono">
             <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/10 pb-2">
                <TerminalIcon size={14} className="text-cyan-400" />
                <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">سجل النشاط الحي</span>
             </div>

             <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                {logs.length > 0 ? logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                        <span className="text-[9px] text-cyan-400/40 shrink-0">{log.time}</span>
                        <p className={`text-[10px] ${log.status === 'warning' ? 'text-rose-400' : (log.status === 'success' ? 'text-emerald-400' : 'text-gray-400')} group-hover:text-white transition-colors`}>
                            {`> ${log.msg}`}
                        </p>
                    </div>
                )) : (
                    <div className="h-full flex items-center justify-center text-gray-600 text-[10px]">
                        لا يوجد نشاط حالياً
                    </div>
                )}
             </div>

             <div className="absolute bottom-2 right-4 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-blink"></div>
                <span className="text-[8px] text-cyan-400/20 italic">تحديث تلقائي...</span>
             </div>

             <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink { animation: blink 1s step-end infinite; }
             `}</style>
        </div>
    );
};

export default TerminalLog;
