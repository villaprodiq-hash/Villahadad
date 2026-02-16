
import React from 'react';
import { Booking, BookingStatus, User } from '../../../types';
import { 
  Camera, Phone, MessageCircle, 
  CheckCircle2, User as UserIcon, Filter, Search,
  CalendarCheck2
} from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { getWhatsAppUrl, openWhatsAppUrl } from '../../../utils/whatsapp';

interface WorkflowManagerViewProps {
  bookings: Booking[];
  users: User[];
  onSelectBooking: (booking: Booking) => void;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => void;
}

const WorkflowManagerView: React.FC<WorkflowManagerViewProps> = ({
  bookings,
  users: _users,
  onSelectBooking,
  onUpdateBooking
}) => {
  const buildWhatsAppMessage = (name: string) => `مرحباً ${name}، نحن من فيلا حداد...`;

  // --- 1. Waiting Queue (Call List - Clients who finished shooting) ---
  const waitingQueue = bookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED);

  // --- 2. Ready for Workflow (Clients with selection appointments) ---
  const readyForSelection = bookings.filter(b => b.status === BookingStatus.SELECTION);

  const handleConfirmAppointment = (id: string, date: string) => {
      // In a real app, we'd save this appointment date somewhere in details
      onUpdateBooking(id, { 
          status: BookingStatus.SELECTION,
          details: { ...bookings.find(b=>b.id===id)?.details, selectionAppointment: date } 
      });
      toast.success('تم تأكيد موعد الاختيار ونقل العميل لقائمة الاختيار');
  };

  const getDelayColor = (date: string) => {
      const days = differenceInDays(new Date(), parseISO(date));
      if (days > 7) return 'text-red-500 bg-red-500/10 border-red-500/20';
      if (days > 3) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 space-y-8 font-sans" dir="rtl">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-6">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                   <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                      <Camera size={24} className="text-white" />
                   </div>
                   مدير سير العمل (ما بعد التصوير)
                </h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">
                   POST-PRODUCTION WORKFLOW MANAGER
                </p>
            </div>
            
             <div className="flex gap-2">
                <button className="p-2 bg-[#14161c] border border-white/5 rounded-lg text-zinc-400 hover:text-white"><Filter size={16} /></button>
                <button className="p-2 bg-[#14161c] border border-white/5 rounded-lg text-zinc-400 hover:text-white"><Search size={16} /></button>
            </div>
        </header>

        {/* --- SECTION 1: THE CALL LIST (Clients waiting for contact) --- */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Phone className="text-amber-500" />
                    قائمة الاتصال (The Call List) - بانتظار تحديد موعد
                    <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-xs font-black">{waitingQueue.length}</span>
                </h2>
                <p className="text-xs text-zinc-500">
                    هؤلاء العملاء أنهوا التصوير ويحتاجون اتصال لتحديد موعد الاختيار
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waitingQueue.map(booking => {
                    const daysWait = differenceInDays(new Date(), parseISO(booking.shootDate));
                    const delayStyle = getDelayColor(booking.shootDate);
                    
                    return (
                        <div key={booking.id} className="bg-[#14161c] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg group transition-all">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center text-amber-500 font-black text-lg border border-amber-500/20">
                                        {booking.clientName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">{booking.clientName}</h3>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                            <CalendarCheck2 size={10} /> تم التصوير: {booking.shootDate}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-black border ${delayStyle}`}>
                                    منذ {daysWait} يوم
                                </div>
                            </div>

                            {/* Contact Actions */}
                            <div className="flex gap-2 mb-4">
                                <a href={`tel:${booking.clientPhone}`} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 text-zinc-300 text-xs font-bold transition-colors">
                                    <Phone size={14} className="text-blue-400" /> اتصال
                                </a>
                                <button
                                  type="button"
                                  onClick={() => void openWhatsAppUrl(getWhatsAppUrl(booking.clientPhone || '', buildWhatsAppMessage(booking.clientName)))}
                                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 text-zinc-300 text-xs font-bold transition-colors"
                                >
                                    <MessageCircle size={14} className="text-green-400" /> واتساب
                                </button>
                            </div>

                            {/* Appointment Setter */}
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">تحديد موعد الاختيار (Move to Selection)</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleConfirmAppointment(booking.id, 'Tomorrow')}
                                        className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-black transition-all"
                                    >
                                        غداً
                                    </button>
                                    <button 
                                        onClick={() => handleConfirmAppointment(booking.id, 'After Tomorrow')}
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                                    >
                                        بعد غد
                                    </button>
                                    <button 
                                        onClick={() => onSelectBooking(booking)}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white rounded-lg"
                                    >
                                        ...
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {waitingQueue.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                        <CheckCircle2 size={48} className="mx-auto text-zinc-700 mb-4" />
                        <p className="text-zinc-500 font-bold">قائمة الاتصال فارغة</p>
                        <p className="text-xs text-zinc-600 mt-1">ممتاز! تم التواصل مع جميع العملاء الذين أنهوا التصوير</p>
                    </div>
                )}
            </div>
        </section>

        {/* --- SECTION 2: SELECTION PIPELINE (Active Post-Production) --- */}
        <section className="space-y-4 pt-8 border-t border-white/5">
            <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserIcon className="text-blue-500" />
                    مرحلة الاختيار (Selection Stage)
                    <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-xs font-black">{readyForSelection.length}</span>
                </h2>
            </div>
            
            <div className="bg-[#14161c] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-[#1a1d24] text-xs font-bold text-zinc-400 uppercase">
                        <tr>
                            <th className="p-4">العميل</th>
                            <th className="p-4">موعد الاختيار</th>
                            <th className="p-4">الموظف المسؤول</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {readyForSelection.map(booking => (
                            <tr key={booking.id} className="hover:bg-white/2 transition-colors">
                                <td className="p-4 font-bold text-white">{booking.clientName}</td>
                                <td className="p-4 text-zinc-400 text-xs font-mono">
                                    {booking.details?.selectionAppointment || 'لم يحدد'}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-700"></div>
                                        <span className="text-xs text-zinc-300">لم يعين</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs border border-blue-500/20 font-bold">
                                        جاري الاختيار
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => onSelectBooking(booking)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                                        فتح التفاصيل
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {readyForSelection.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm italic font-bold">لا توجد جلسات اختيار نشطة</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>

    </div>
  );
};

export default WorkflowManagerView;
