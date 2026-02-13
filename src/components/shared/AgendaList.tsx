import { Booking, BookingCategory, CategoryLabels } from '../../types';
import { Bell, MoreHorizontal, MessageCircle } from 'lucide-react';
import ClientBadge from './ClientBadge';

const getWhatsAppUrl = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `مرحباً ${name}، نحن من فيلا حداد...`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

interface AgendaListProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  isManager?: boolean;
}

const AgendaList: React.FC<AgendaListProps> = ({ bookings, onSelectBooking, isManager = false }) => {
  const sortedBookings = [...bookings].sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime());
  
  const grouped: Record<string, Booking[]> = {};
  sortedBookings.forEach(b => {
     const dateKey = b.shootDate;
     if (!grouped[dateKey]) grouped[dateKey] = [];
     grouped[dateKey].push(b);
  });

  const dates = Object.keys(grouped).sort();

  return (
    <div className={`${isManager ? 'bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border-white ring-1 ring-black/5' : 'bg-[#21242b] rounded-[40px] shadow-[10px_10px_20px_#16181d,-10px_-10px_20px_#2c3039] border-white/5'} p-6 flex flex-col h-full border relative overflow-hidden transition-all duration-300`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>الجدول الزمني</h3>
            <button className={`p-2 ${isManager ? 'bg-gray-100/50 text-gray-500 hover:text-amber-500 hover:bg-white' : 'bg-[#21242b] text-gray-400 hover:text-pink-500 shadow-[5px_5px_10px_#16181d,-5px_-5px_10px_#2c3039] border-white/5'} rounded-full transition-all`}>
                <Bell size={16} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pl-2 space-y-6 overflow-x-hidden">
            {dates.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
                    <Bell size={32} />
                    <p className="text-xs">لا توجد مواعيد قادمة</p>
                </div>
            ) : (
                dates.map(date => (
                    <div key={date} className="animate-in slide-in-from-bottom-2 duration-500">
                        {/* Date Header */}
                        <div className={`flex justify-between items-center mb-4 sticky top-0 ${isManager ? 'bg-white/50' : 'bg-[#21242b]/90'} backdrop-blur-sm z-20 py-1`}>
                            <span className={`text-[10px] font-bold ${isManager ? 'text-gray-500 bg-white shadow-sm ring-1 ring-black/5' : 'text-gray-500 bg-[#21242b] shadow-[inset_2px_2px_4px_#16181d,inset_-2px_-2px_4px_#2c3039] border-white/5'} uppercase tracking-widest px-3 py-1 rounded-full`}>
                                {new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <MoreHorizontal size={14} className={`${isManager ? 'text-gray-400' : 'text-gray-600'} cursor-pointer hover:${isManager ? 'text-gray-800' : 'text-white'}`} />
                        </div>
                        
                        {/* Events List */}
                        <div className="space-y-4">
                            {grouped[date].map(booking => (
                                <AgendaItem 
                                    key={booking.id} 
                                    booking={booking} 
                                    allBookings={bookings}
                                    isManager={isManager}
                                    onSelect={() => onSelectBooking(booking)} 
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

const AgendaItem: React.FC<{ booking: Booking; allBookings: Booking[]; isManager: boolean; onSelect: () => void }> = ({ booking, allBookings, isManager, onSelect }) => {
    const getCategoryColor = (cat: BookingCategory) => {
        switch (cat) {
          case BookingCategory.WEDDING: return 'bg-purple-500 shadow-[0_0_8px_#a855f7]';
          case BookingCategory.GRADUATION: return 'bg-pink-500 shadow-[0_0_8px_#ec4899]';
          case BookingCategory.BIRTHDAY: return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
          default: return 'bg-gray-400 shadow-[0_0_8px_#9ca3af]';
        }
    };

    const getAvatarColor = (name: string) => {
        const colors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500', 'from-purple-500 to-pink-500', 'from-yellow-500 to-orange-500'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div 
            className="flex gap-4 group relative z-10 cursor-pointer" 
            onClick={onSelect}
        >
            {/* Time */}
            <div className="w-10 text-left pt-1 shrink-0">
                <span className={`text-[10px] font-bold ${isManager ? 'text-gray-400 group-hover:text-amber-600' : 'text-gray-400 group-hover:text-pink-500'} transition-colors font-mono`}>
                    {booking.details?.zaffaTime || '12:00'}
                </span>
            </div>

            {/* Color Bar */}
            <div className={`w-1.5 rounded-full ${getCategoryColor(booking.category)} h-auto min-h-[40px] opacity-80 group-hover:opacity-100 transition-all group-hover:scale-y-110 origin-top`} />

            {/* Content */}
            <div className={`flex-1 p-2 rounded-2xl transition-all ${isManager ? 'hover:bg-amber-50 group-hover:shadow-[0_4px_15px_rgba(0,0,0,0.02)]' : 'hover:bg-[#262626] hover:shadow-[5px_5px_10px_#16181d,-5px_-5px_10px_#2c3039]'} border border-transparent ${!isManager && 'hover:border-white/5'} flex items-center gap-3`}>
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarColor(booking.clientName)} flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0`}>
                    {booking.clientName.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold ${isManager ? 'text-gray-700' : 'text-gray-200'} group-hover:${isManager ? 'text-gray-900' : 'text-white'} transition-colors line-clamp-1 flex items-center gap-2`}>
                        {booking.title.split('-')[1]?.trim() || booking.title}
                        <ClientBadge booking={booking} allBookings={allBookings} compact />
                    </h4>
                    <p className={`text-[9px] font-bold mt-0.5 ${isManager ? 'text-gray-400 group-hover:text-amber-500' : 'text-gray-500 group-hover:text-pink-500'} transition-colors`}>
                        {CategoryLabels[booking.category]}
                    </p>
                </div>
                {booking.clientPhone && (
                    <a 
                        href={getWhatsAppUrl(booking.clientPhone, booking.clientName)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`p-2 ${isManager ? 'bg-amber-100/50 text-amber-600 hover:bg-amber-500 hover:text-white' : 'bg-white/5 hover:bg-green-500/20 text-green-500'} rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-lg`}
                        onClick={(e) => e.stopPropagation()}
                        title="واتساب"
                    >
                        <MessageCircle size={14} />
                    </a>
                )}
            </div>
        </div>
    );
};

export default AgendaList;
