import React, { useState, useEffect } from 'react';
import { 
  Printer, CheckCircle2, Clock, 
  Calendar, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowCard } from '../../../shared/GlowCard';
import { Booking, ALBUM_PRINT_COST, BookingStatus } from '../../../../types';
import { electronBackend } from '../../../../services/mockBackend';
import { toast } from 'sonner';

export const PrintingQueueWidget = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const all = await electronBackend.getBookings();
            // Filter for bookings that are "DELIVERED" or "COMPLETED" (ready for print)
            setBookings(all.filter(b => b.status === BookingStatus.DELIVERED || b.status === BookingStatus.CONFIRMED).slice(0, 5));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePrintConfirm = async (booking: Booking) => {
        try {
            // 1. Add Expense
            await electronBackend.addExpense({
                title: `طباعة ألبوم - ${booking.clientName}`,
                amount: ALBUM_PRINT_COST,
                currency: 'IQD',
                category: 'printing',
                date: new Date().toISOString(),
                note: `حجز رقم: ${booking.id}`
            });

            // 2. Ideally update booking status to 'printed' or similar, 
            // but for now just show success
            toast.success(`تم تسجيل تكلفة طباعة ألبوم ${booking.clientName}`);
            
            // 3. Remove from local view for demo
            setBookings(prev => prev.filter(b => b.id !== booking.id));
        } catch (e) {
            toast.error('فشل في تسجيل العملية');
        }
    };

    return (
        <GlowCard variant="dark" className="h-full flex flex-col bg-[#111111] overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2 text-amber-400">
                    <Printer size={18} />
                    <h3 className="font-bold text-sm">طابور الطباعة</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">
                    {bookings.length} طلبات
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                <AnimatePresence mode='popLayout'>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32 text-gray-500 text-xs animate-pulse">
                            جاري التحميل...
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
                            <CheckCircle2 size={32} className="opacity-20" />
                            <span className="text-xs">لا توجد طلبات طباعة حالياً</span>
                        </div>
                    ) : (
                        bookings.map((booking) => (
                            <motion.div
                                key={booking.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors uppercase">
                                            {booking.clientName}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {booking.shootDate}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">
                                                {booking.servicePackage}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handlePrintConfirm(booking)}
                                        className="h-8 px-3 rounded-lg bg-amber-500 text-black text-[10px] font-black hover:bg-amber-400 flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                    >
                                        <Sparkles size={12} />
                                        تأكيد الطباعة
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-gray-500 bg-black/20 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-blue-400" />
                                        <span>جاهز للطباعة</span>
                                    </div>
                                    <span className="font-mono text-white/50">{ALBUM_PRINT_COST.toLocaleString()} IQD</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className="p-3 bg-white/5 border-t border-white/5 text-[10px] text-center text-gray-500 font-bold">
                يتم خصم التكلفة تلقائياً من الإدارة المالية
            </div>
        </GlowCard>
    );
};
