import React, { useMemo, useState } from 'react';
import {
    Users, Phone, Search, Download, Crown, Heart, Star, TrendingUp,
    Calendar, Clock, StickyNote, Wallet, Sparkles, MessageCircle, MapPin, ArrowLeftRight, Plus
} from 'lucide-react';
import { Booking } from '../../../types';
import { cn } from '../../../lib/utils';
import ScrollReveal from '../../shared/ScrollReveal';
import ClientBadge from '../../shared/ClientBadge';
import { GlowCard } from '../../shared/GlowCard';
import { format, isToday, isTomorrow, isSameWeek, parseISO, startOfToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import ClientHeatmapWidget from './widgets/ClientHeatmapWidget';
import FilterBar from '../../shared/FilterBar';
import { FilterState, defaultFilterState, filterClientsByBookingType, getFilterStats } from '../../../utils/filterUtils';

// Helper
const getWhatsAppUrl = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `مرحباً ${name}، نحن من فيلا حداد...`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

interface ClientsViewProps {
  bookings: Booking[];
  onRebookClient?: (clientName: string, clientPhone: string) => void;
}

// Helper to safely format dates
const safeFormatDate = (dateStr: string, formatStr: string) => {
    try {
        if (!dateStr) return 'N/A';
        const date = parseISO(dateStr);
        // Check for Invalid Date
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, formatStr);
    } catch (e) {
        return 'N/A';
    }
};

const ManagerClientsView: React.FC<ClientsViewProps> = ({ bookings = [], onRebookClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterState>(defaultFilterState);
  const [arrivalFilter, setArrivalFilter] = useState<'today' | 'tomorrow' | 'week'>('today');
  
  // Show/Hide Heatmap
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Exchange rate: USD → IQD
  const [exchangeRate, setExchangeRate] = useState(1500);

  // 1. Data Processing (Identical logic to Reception for consistency)
  const clients = useMemo(() => {
    const clientMap = new Map();
    // Validate bookings first
    const validBookings = bookings.filter(b => b && b.clientId && b.shootDate);

    validBookings.forEach(b => {
        if (!clientMap.has(b.clientId)) {
            clientMap.set(b.clientId, {
                id: b.clientId,
                name: b.clientName || 'Unknown',
                email: b.clientEmail,
                phone: b.clientPhone,
                bookingsCount: 0,
                totalSpent: 0,
                totalSpentUSD: 0,
                totalSpentIQD: 0,
                totalInIQD: 0,
                lastVisit: b.shootDate,
                notes: [] as string[],
                isFamous: false,
                isManualVIP: false
            });
        }
        const client = clientMap.get(b.clientId);
        client.bookingsCount += 1;
        client.totalSpent += (b.totalAmount || 0);
        if (b.currency === 'USD') client.totalSpentUSD += (b.totalAmount || 0);
        else client.totalSpentIQD += (b.totalAmount || 0);

        // ✅ حساب المجموع بالدينار — كل حجز يستخدم سعر الصرف المحفوظ معه
        // الحجوزات القديمة بدون exchangeRate تستخدم السعر الافتراضي من الأعلى
        const bookingRate = b.exchangeRate || exchangeRate;
        if (b.currency === 'USD') {
            client.totalInIQD += (b.totalAmount || 0) * bookingRate;
        } else {
            client.totalInIQD += (b.totalAmount || 0);
        }

        // ✅ Include cross-currency add-ons (addOnTotal is in the OTHER currency)
        if (b.addOnTotal && b.addOnTotal > 0) {
            if (b.currency === 'USD') {
                // addOnTotal هنا بالدينار (عكس عملة الحجز)
                client.totalSpentIQD += b.addOnTotal;
                client.totalInIQD += b.addOnTotal;
            } else {
                // addOnTotal هنا بالدولار
                client.totalSpentUSD += b.addOnTotal;
                client.totalInIQD += b.addOnTotal * bookingRate;
            }
        }

        // Safety check for date comparison
        try {
            const currentShootDate = new Date(b.shootDate);
            const clientLastVisit = new Date(client.lastVisit);
            if (!isNaN(currentShootDate.getTime()) && !isNaN(clientLastVisit.getTime())) {
                 if (currentShootDate > clientLastVisit) client.lastVisit = b.shootDate;
            }
        } catch(e) { /* ignore invalid date comparison */ }

        if (b.details?.notes) client.notes.push(b.details.notes);
        if (b.isFamous) client.isFamous = true;
        if (b.isVIP) client.isManualVIP = true;
    });

    return Array.from(clientMap.values()).map(c => ({
        ...c,
        isVIP: c.totalSpent > 2000 || c.isManualVIP || c.name.toLowerCase().includes('vip'),
        isLoyal: c.bookingsCount > 1,
        isNew: c.bookingsCount === 1,
        isFamous: c.isFamous
    }));
  }, [bookings, exchangeRate]);

  // Get filter stats
  const filterStats = useMemo(() => getFilterStats(bookings), [bookings]);

  // Apply new filter system
  const filteredClients = useMemo(() => {
    // First filter by search
    let result = clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (String(c.phone).includes(searchTerm));
      return matchesSearch;
    });

    // Then apply booking type filter
    result = filterClientsByBookingType(result, bookings, filter);

    return result;
  }, [clients, searchTerm, filter, bookings]);

  // 2. Widget Lists
  const dailyArrivals = useMemo(() => {
    const today = startOfToday();
    const relevantBookings = bookings.filter(b => {
        if (!b || !b.shootDate) return false; // Safety check
        try {
            const date = parseISO(b.shootDate);
            if (isNaN(date.getTime())) return false; // Invalid Date check
            if (arrivalFilter === 'today') return isToday(date);
            if (arrivalFilter === 'tomorrow') return isTomorrow(date);
            if (arrivalFilter === 'week') return isSameWeek(date, today, { weekStartsOn: 6 });
            return false;
        } catch (e) { return false; }
    });
    const arrivals = new Map();
    relevantBookings.forEach(b => {
        if (!arrivals.has(b.clientId) && b.clientId) {
            const client = clients.find(c => c.id === b.clientId);
            if (client) {
                arrivals.set(b.clientId, { ...client, bookingTime: b.details?.startTime || '00:00' });
            }
        }
    });
    return Array.from(arrivals.values()).filter(c => c.isVIP || c.isFamous || !c.isNew).sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));
  }, [bookings, arrivalFilter, clients]);

  const vipStatsList = useMemo(() => [...filteredClients].filter(c => c.isVIP).sort((a, b) => b.totalInIQD - a.totalInIQD).slice(0, 3), [filteredClients]);
  const loyalStatsList = useMemo(() => [...filteredClients].filter(c => c.isLoyal).sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, 3), [filteredClients]);
  const celebrityStatsList = useMemo(() => filteredClients.filter(c => c.isFamous).slice(0, 3), [filteredClients]);

  // 3. Export Logic (Condensed)
  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Bookings', 'Total Spent', 'Last Visit'];
    const rows = filteredClients.map(c => [
        `"${c.name}"`, 
        `"${c.phone}"`, 
        c.bookingsCount, 
        c.totalSpent, 
        c.lastVisit
    ].join(','));
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `clients_db_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    document.body.removeChild(link);
    link.remove();
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
        
        {/* Header Section - Compact & Slim */}
        <div className="bg-white/80 dark:bg-[#1a1c22]/80 backdrop-blur-xl rounded-3xl px-6 py-3 shadow-sm mb-4 shrink-0 flex items-center justify-between gap-6 border border-white/20 dark:border-white/5 transition-colors duration-300">
             {/* Title & Stats */}
             <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm">
                        <Users size={16} />
                     </div>
                     <div>
                        <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight leading-none">سجل العملاء</h2>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{filteredClients.length} Profiles Tracking</span>
                     </div>
                 </div>

                 {/* Separator */}
                 <div className="h-6 w-px bg-gray-100/50 dark:bg-white/5 hidden sm:block" />

                 {/* Toggle Heatmap Mini */}
                 <button
                     onClick={() => setShowHeatmap(!showHeatmap)}
                     className={cn(
                        "text-[9px] font-black px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider",
                        showHeatmap ? 'bg-blue-600 text-white shadow-md' : 'bg-white/50 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
                     )}
                 >
                     <MapPin size={10} /> {showHeatmap ? 'Hide Map' : 'Heatmap'}
                 </button>

                 {/* Separator */}
                 <div className="h-6 w-px bg-gray-100/50 dark:bg-white/5 hidden sm:block" />

                 {/* Exchange Rate Input */}
                 <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 rounded-lg px-2 py-1 border border-white/10 dark:border-white/5">
                     <ArrowLeftRight size={10} className="text-emerald-500 shrink-0" />
                     <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap">$1 =</span>
                     <input
                         type="text"
                         inputMode="numeric"
                         value={exchangeRate.toLocaleString()}
                         onChange={(e) => {
                             const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                             if (!isNaN(val) && val > 0) setExchangeRate(val);
                         }}
                         className="w-16 bg-transparent text-[10px] font-black text-gray-800 dark:text-white text-center outline-none"
                     />
                     <span className="text-[8px] font-black text-gray-400 dark:text-gray-500">د.ع</span>
                 </div>
             </div>

             {/* Filters & Actions */}
             <div className="flex items-center gap-3">
                 {/* New Filter System */}
                 <FilterBar 
                   filter={filter}
                   onFilterChange={setFilter}
                   stats={filterStats}
                 />

                 {/* Search - Slick */}
                 <div className="relative group/search hidden sm:block">
                     <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 group-focus-within/search:text-blue-500 transition-colors" size={12} />
                     <input 
                         type="text" 
                         placeholder="Quick search..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="h-8 w-40 bg-white/50 dark:bg-white/5 rounded-xl pr-9 pl-3 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
                     />
                 </div>

             </div>
        </div>

        {/* Optional Heatmap Row */}
        {showHeatmap && (
             <div className="mb-6 animate-in hover:animate-none fade-in slide-in-from-top-4 duration-500 h-[240px] shrink-0">
                  <ClientHeatmapWidget bookings={bookings} />
             </div>
        )}

        {/* Widgets Row - Compact & Space-Efficient */}
        {!showHeatmap && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
             
             {/* 1. Daily Arrivals - Reduced padding, smaller text */}
             <div className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md p-3 rounded-2xl shadow-sm flex flex-col h-[180px] border border-white/20 dark:border-white/5 transition-colors">
                 <div className="flex items-center justify-between mb-2">
                     <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Calendar size={12} /> Arrivals</span>
                     <div className="flex gap-1">
                        {['today','tomorrow','week'].map(t => (
                            <button key={t} onClick={() => setArrivalFilter(t as any)} className={`w-1 h-1 rounded-full ${arrivalFilter === t ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        ))}
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                     {dailyArrivals.length > 0 ? dailyArrivals.map((c, i) => (
                         <div key={i} className="flex items-center gap-2 p-1.5 bg-white/40 dark:bg-white/5 rounded-xl">
                             <div className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[9px] font-black">{c.name[0]}</div>
                             <div className="min-w-0">
                                 <p className="text-[9px] font-black text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                                 <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 leading-none">{c.bookingTime}</p>
                             </div>
                         </div>
                     )) : <div className="h-full flex items-center justify-center text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase">Clear Schedule</div>}
                 </div>
             </div>

             {/* 2. VIPs - Merged title and count */}
             <div className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md p-3 rounded-2xl shadow-sm flex flex-col h-[180px] border border-white/20 dark:border-white/5 transition-colors">
                 <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Crown size={12} className="text-amber-500" /> Top VIPs</span>
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-500 px-2 py-0.5 rounded-full">Top 3</span>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                     {vipStatsList.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors group">
                             <div className="flex items-center gap-2 min-w-0">
                                 <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black text-white shadow-sm", i===0 ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400')}>{i+1}</div>
                                 <p className="text-[9px] font-black text-gray-700 dark:text-gray-300 truncate">{c.name}</p>
                             </div>
                             <span className="text-[9px] font-black text-gray-900 dark:text-white">
                               {c.totalInIQD.toLocaleString()} <span className="text-[7px] text-gray-400">د.ع</span>
                             </span>
                         </div>
                     ))}
                 </div>
             </div>

             {/* 3. Loyal - Thinner rows */}
             <div className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md p-3 rounded-2xl shadow-sm flex flex-col h-[180px] border border-white/20 dark:border-white/5 transition-colors">
                 <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Heart size={12} className="text-rose-500" /> Retention</div>
                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                     {loyalStatsList.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-rose-50 dark:hover:border-rose-900/30">
                             <p className="text-[9px] font-black text-gray-700 dark:text-gray-300 truncate">{c.name}</p>
                             <span className="text-[8px] bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">{c.bookingsCount} Visits</span>
                         </div>
                     ))}
                 </div>
             </div>

             {/* 4. Celebrities - Grid style inside mini-widget */}
             <div className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md p-3 rounded-2xl shadow-sm flex flex-col h-[180px] border border-white/20 dark:border-white/5 transition-colors">
                 <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Star size={12} className="text-yellow-500" /> Influencers</div>
                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
                     {celebrityStatsList.length > 0 ? celebrityStatsList.map((c, i) => (
                         <div key={i} className="flex items-center gap-2 p-1.5 bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-100/50 dark:border-yellow-900/30 rounded-xl group hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors">
                             <Star size={10} className="text-yellow-500 fill-yellow-500 group-hover:scale-110 transition-transform" />
                             <p className="text-[9px] font-black text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                         </div>
                     )) : <div className="h-full flex items-center justify-center text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase">None Tracked</div>}
                 </div>
             </div>
        </div>
        )}

        {/* Main Grid (Client Cards) */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                {filteredClients.map((client, i) => (
                    <ScrollReveal key={client.id} delay={Math.min(i * 0.05, 0.3)}>
                        <GlowCard variant="light" className="p-4 h-full flex flex-col relative overflow-hidden group bg-white dark:bg-[#1a1c22] border border-transparent dark:border-white/5 transition-colors duration-300">
                             {/* Hover Effect Background - Handled by GlowCard now, but keeping specific bg if needed */}
                             
                             <div className="flex items-start justify-between mb-3 relative z-10">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-black  group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                         {client.name.charAt(0)}
                                     </div>
                                     <div>
                                         <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{client.name}</h3>
                                         <p className="text-[10px] text-gray-400 dark:text-gray-500 tracking-wider">ID: {client.id.slice(0,6)}</p>
                                     </div>
                                 </div>
                                 <ClientBadge booking={bookings.find(b => b.clientId === client.id) || bookings[0]} allBookings={bookings} compact />
                             </div>

                             {/* Contact & Last Visit */}
                             <div className="space-y-1.5 mb-4 relative z-10">
                                 <div className="flex items-center gap-2 text-[10px]">
                                     <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500"><Phone size={12} /></div>
                                     <span dir="ltr" className="font-medium text-gray-600 dark:text-gray-400">{client.phone}</span>
                                     <a href={getWhatsAppUrl(String(client.phone), client.name)} target="_blank" rel="noreferrer" className="text-green-500 hover:scale-110 transition-transform"><MessageCircle size={14} /></a>
                                 </div>
                                 <div className="flex items-center gap-2 text-[10px]">
                                     <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500"><Calendar size={12} /></div>
                                     <span className="text-gray-500 dark:text-gray-400">{safeFormatDate(client.lastVisit, 'MMM yyyy')}</span>
                                 </div>
                             </div>

                             {/* Footer Stats */}
                             <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between relative z-10">
                                  <div className="text-center">
                                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">المجموع</p>
                                      <p className="text-xs font-black text-gray-800 dark:text-gray-200">{client.totalInIQD.toLocaleString()} <span className="text-[8px] text-gray-400">د.ع</span></p>
                                      {client.totalSpentUSD > 0 && (
                                        <p className="text-[8px] text-gray-400 dark:text-gray-500">(${client.totalSpentUSD.toLocaleString()} + {client.totalSpentIQD.toLocaleString()} د.ع)</p>
                                      )}
                                  </div>
                                  <div className="h-4 w-px bg-gray-100 dark:bg-white/5"></div>
                                  <div className="text-center">
                                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">زيارات</p>
                                      <p className="text-xs font-black text-blue-600 dark:text-blue-400">{client.bookingsCount}</p>
                                  </div>
                                  {onRebookClient && (
                                    <>
                                      <div className="h-4 w-px bg-gray-100 dark:bg-white/5"></div>
                                      <button
                                        onClick={() => onRebookClient(client.name, client.phone)}
                                        className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:scale-110"
                                        title="حجز جديد لهذا العميل"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </>
                                  )}
                             </div>

                             {/* Note Indicator */}
                             {client.notes.length > 0 && (
                                 <div className="absolute bottom-3 left-3 text-amber-400 opacity-50 group-hover:opacity-100" title={client.notes[client.notes.length-1]}>
                                     <StickyNote size={12} />
                                 </div>
                             )}
                        </GlowCard>
                    </ScrollReveal>
                ))}
            </div>
        </div>
    </div>
  );
};

export default ManagerClientsView;