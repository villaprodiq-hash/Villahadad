
import React, { useMemo, useState } from 'react';
import { 
  Users, Search, Crown, Star, Heart, TrendingUp, 
  Download, MessageCircle, Wallet, Calendar, Clock,
  Globe, Link, Share2, Smartphone, QrCode, X, Check, Lock, ChevronRight
} from 'lucide-react';
import { Booking, BookingCategory, BookingStatus, StatusLabels } from '../../../types';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AdminClientsListViewProps {
  bookings: Booking[];
}

const AdminClientsListView: React.FC<AdminClientsListViewProps> = ({ bookings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [portalModalClient, setPortalModalClient] = useState<any | null>(null);

  const clients = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // Initial map
    const clientMap = new Map();

    bookings.forEach(b => {
        if (!clientMap.has(b.clientId)) {
            clientMap.set(b.clientId, {
                id: b.clientId,
                name: b.clientName,
                phone: b.clientPhone,
                email: b.clientEmail,
                bookingsCount: 0,
                totalSpent: 0,
                lastVisit: b.shootDate,
                nextVisit: null, 
                isVIP: b.isVIP,
                isFamous: b.isFamous,
                tier: 'bronze',
                token: b.client_token || `vh-token-${b.clientId.slice(0,6)}`, // Mock token if missing
                bookings: [] // Store bookings for portal view
            });
        }
        const c = clientMap.get(b.clientId);
        c.bookingsCount++;
        c.totalSpent += b.totalAmount;
        c.bookings.push(b);
        
        const bookingDate = parseISO(b.shootDate);
        if (bookingDate > parseISO(c.lastVisit)) c.lastVisit = b.shootDate;
        
        // Check for upcoming visit
        if (bookingDate >= today && bookingDate <= nextWeek) {
            if (!c.nextVisit || bookingDate < parseISO(c.nextVisit)) {
                c.nextVisit = b.shootDate;
            }
        }
    });

    return Array.from(clientMap.values())
        .map((c: any) => {
            // Calculate Tier logic
            if (c.totalSpent > 3000000) c.tier = 'gold'; 
            else if (c.totalSpent > 1000000) c.tier = 'silver'; 
            else c.tier = 'bronze';
            return c;
        })
        .filter((c: any) => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (c.phone && c.phone.includes(searchTerm))
        )
        .sort((a, b) => b.totalSpent - a.totalSpent); 
  }, [bookings, searchTerm]);

  // Extract Upcoming VIPs
  const upcomingVIPs = useMemo(() => {
      return clients.filter((c: any) => c.nextVisit && (c.tier === 'gold' || c.isVIP || c.isFamous));
  }, [clients]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono" dir="rtl">
        
        {/* CRM HUD Toolset */}
        <div className="bg-[#0B0E14]/60 backdrop-blur-3xl border border-cyan-500/20 rounded-[2.5rem] p-4 mb-6 flex items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                    <Users size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-white tracking-tighter uppercase">محطة العملاء / بوابة سارة</h2>
                   <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">الهدف: {clients.length} عميل متصل</p>
                </div>
             </div>

             <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative group w-full">
                    <Search className="absolute right-4 top-3 text-cyan-400/50 group-focus-within:text-cyan-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="بحث عن عميل بالاسم أو الهاتف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-cyan-500/10 rounded-2xl pr-10 pl-4 py-3 text-[10px] font-mono text-cyan-50 focus:border-cyan-500/50 outline-none transition-all shadow-inner"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black hover:bg-white/10 transition-all uppercase tracking-widest text-gray-400 hover:text-white">
                    <Globe size={14} className="text-emerald-500" />
                    حالة_البوابة
                </button>
             </div>
        </div>

        {/* --- Upcoming VIP Radar --- */}
        {upcomingVIPs.length > 0 && (
            <div className="mb-6 mx-2">
                <div className="bg-[#0B0E14] rounded-[1.4rem] p-5 border border-amber-500/20 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                    <div className="absolute top-0 right-0 w-full h-1 bg-linear-to-l from-amber-500 to-transparent opacity-50"></div>
                    
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                        <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                             <Crown size={14} />
                             رادار العملاء المهمين (7 أيام القادمة)
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingVIPs.map((client: any) => (
                            <div key={client.id} className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                                    <Star size={16} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white">{client.name}</p>
                                    <p className="text-[10px] text-amber-400 font-mono">قادم في: {client.nextVisit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Client Grid Terminal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-12 no-scrollbar">
            {clients.map((client, i) => (
                <div key={client.id} className={`bg-[#0B0E14]/60 backdrop-blur-md border rounded-3xl p-5 hover:shadow-[0_0_30px_rgba(0,242,255,0.05)] transition-all group relative overflow-hidden ${
                    client.tier === 'gold' ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 
                    client.tier === 'silver' ? 'border-gray-400/30' : 
                    'border-white/5'
                }`}>
                    {/* Identification */}
                    <div className="flex items-start justify-between mb-6">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl group-hover:scale-110 transition-transform border ${
                                client.tier === 'gold' ? 'bg-linear-to-br from-amber-600 to-amber-900 border-amber-500/50' : 
                                client.tier === 'silver' ? 'bg-linear-to-br from-gray-500 to-gray-800 border-gray-400/50' : 
                                'bg-linear-to-br from-gray-800 to-gray-900 border-white/10'
                            }`}>
                                {client.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-white text-[13px] truncate uppercase tracking-tighter flex items-center gap-2">
                                    {client.name}
                                    {client.tier === 'gold' && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">GOLD</span>}
                                    {client.tier === 'silver' && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-400/20 text-gray-300 border border-gray-400/30">SILVER</span>}
                                </h3>
                                <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{client.phone || 'No Phone'}</p>
                            </div>
                         </div>
                         <div className="flex gap-1">
                            <button 
                                onClick={() => setPortalModalClient(client)}
                                className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                                title="عرض بوابة العميل"
                            >
                                <Smartphone size={12} />
                            </button>
                         </div>
                    </div>

                    {/* Contact Stats */}
                    <div className="space-y-2 mb-6">
                        <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group/line hover:border-cyan-400/30 transition-all">
                             <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                                <Clock size={12} className="text-cyan-400/50" />
                                <span className="uppercase tracking-[0.2em] font-black">السجل</span>
                             </div>
                             <span className="text-[10px] text-white font-bold">{client.bookingsCount} جولة</span>
                        </div>
                        <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between group/line hover:border-cyan-400/30 transition-all">
                             <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                                <Calendar size={12} className="text-cyan-400/50" />
                                <span className="uppercase tracking-[0.2em] font-black">آخر ظهور</span>
                             </div>
                             <span className="text-[10px] text-white font-bold">{format(parseISO(client.lastVisit), 'MMM yyyy', { locale: ar })}</span>
                        </div>
                    </div>

                    {/* Strategic Data Footer */}
                    <div className="pt-4 border-t border-cyan-500/10 flex items-center justify-between">
                         <div>
                            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">إجمالي العائد</p>
                            <div className="flex items-center gap-1">
                                <Wallet size={10} className={client.tier === 'gold' ? 'text-amber-400' : 'text-cyan-400'} />
                                <span className={`${client.tier === 'gold' ? 'text-amber-400' : 'text-cyan-400'} font-black text-[15px] tracking-tighter`}>{client.totalSpent.toLocaleString()}</span>
                            </div>
                         </div>
                         <button 
                            className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                            onClick={() => {
                                // Simulate sending link
                                console.log(`Sharing portal link for ${client.name}`);
                            }}
                         >
                            <Share2 size={16} />
                         </button>
                    </div>

                    {/* HUD Scanline */}
                    <div className="absolute inset-x-0 top-0 h-px bg-cyan-400/10 group-hover:h-full transition-all duration-700 pointer-events-none"></div>
                </div>
            ))}
        </div>

        {/* Client Portal Simulation Modal */}
        {portalModalClient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                <div className="w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl relative border-8 border-gray-900">
                    <div className="absolute top-0 inset-x-0 h-6 bg-black flex justify-center pt-2 z-20">
                        <div className="w-20 h-4 bg-black rounded-b-xl"></div>
                    </div>
                    
                    {/* Simulated Phone Screen */}
                    <div className="h-[600px] bg-gray-50 flex flex-col pt-8 overflow-y-auto no-scrollbar relative">
                        {/* App Header */}
                        <div className="px-6 pb-6 pt-4 flex justify-between items-center bg-white sticky top-0 z-10 border-b border-gray-100">
                             <div>
                                 <h4 className="text-lg font-black text-gray-900">مرحباً {portalModalClient.name.split(' ')[0]} 👋</h4>
                                 <p className="text-xs text-gray-500">لديك {portalModalClient.bookings.length} حجوزات نشطة</p>
                             </div>
                             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                 <Users size={20} className="text-gray-900" />
                             </div>
                        </div>

                        {/* Booking Feed */}
                        <div className="p-4 space-y-4">
                            {portalModalClient.bookings.map((b: Booking) => (
                                <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded-full">
                                            {StatusLabels[b.status]}
                                        </div>
                                        <span className="text-xs font-bold text-gray-400">{b.shootDate}</span>
                                    </div>
                                    <h3 className="font-black text-gray-900 mb-1">{b.title}</h3>
                                    <p className="text-xs text-gray-500 mb-4">{b.totalAmount.toLocaleString()} IQD</p>
                                    
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 flex items-center justify-center gap-2">
                                            <Share2 size={12} />
                                            مشاركة
                                        </button>
                                        <button className="flex-1 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                            <QrCode size={12} />
                                            التذكرة
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Floating Action */}
                        <div className="absolute bottom-6 inset-x-6">
                            <button className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-xl">
                                حجز موعد جديد
                            </button>
                        </div>
                    </div>

                    {/* Close Button (Admin Side) */}
                    <button 
                        onClick={() => setPortalModalClient(null)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="absolute bottom-8 text-center">
                    <p className="text-cyan-400 font-mono text-sm mb-2">معاينة منظور العميل (Client Portal View)</p>
                    <p className="text-gray-500 text-xs">Generated via Token: {portalModalClient.token}</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminClientsListView;
