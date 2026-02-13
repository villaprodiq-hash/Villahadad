
import React, { useMemo, useState } from 'react';
import { 
    Users, Phone, Mail, Search, Download, Crown, Heart, Star, TrendingUp, 
    Filter, Calendar, Clock, StickyNote, ChevronLeft, ChevronRight,
    MapPin, Wallet, Sparkles, UserCheck, AlertCircle, Info, MessageCircle
} from 'lucide-react';
import { Booking, BookingCategory } from '../../../types';
import ScrollReveal from '../../shared/ScrollReveal';
import ReceptionPageWrapper from '../../reception/layout/ReceptionPageWrapper';
import ClientBadge from '../../shared/ClientBadge';
import { format, isToday, isTomorrow, isSameWeek, parseISO, startOfToday } from 'date-fns';
import { ar } from 'date-fns/locale';

const getWhatsAppUrl = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `مرحباً ${name}، نحن من فيلا حداد...`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

interface ClientsViewProps {
  bookings: Booking[];
  isReception?: boolean;
  isManager?: boolean;
}

const ClientsView: React.FC<ClientsViewProps> = ({ bookings, isReception = true, isManager = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'sura' | 'villa'>('all');
  const [arrivalFilter, setArrivalFilter] = useState<'today' | 'tomorrow' | 'week'>('today');

  // 1. Core Client Data with CRM Insights
  const clients = useMemo(() => {
    const clientMap = new Map();
    
    bookings.forEach(b => {
        if (!clientMap.has(b.clientId)) {
            clientMap.set(b.clientId, {
                id: b.clientId,
                name: b.clientName,
                email: b.clientEmail,
                phone: b.clientPhone,
                bookingsCount: 0,
                totalSpent: 0,
                lastVisit: b.shootDate,
                notes: [] as string[],
                isFamous: false,
                isManualVIP: false
            });
        }
        const client = clientMap.get(b.clientId);
        client.bookingsCount += 1;
        client.totalSpent += b.totalAmount;
        
        // Update last visit if this booking is newer
        if (new Date(b.shootDate) > new Date(client.lastVisit)) {
            client.lastVisit = b.shootDate;
        }

        // Aggregate notes
        if (b.details?.notes) {
            client.notes.push(b.details.notes);
        }

        // Flags
        if (b.isFamous) client.isFamous = true;
        if (b.isVIP) client.isManualVIP = true;
    });

    return Array.from(clientMap.values()).map(c => {
        // Derive Categorization
        const isVIP = c.totalSpent > 2000 || c.isManualVIP || c.name.toLowerCase().includes('vip'); 
        const isLoyal = c.bookingsCount > 1;
        const isNew = c.bookingsCount === 1;
        const isFamous = c.isFamous;

        return { ...c, isVIP, isLoyal, isNew, isFamous };
    });
  }, [bookings]);

  // 2. Filtered Clients for the list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm));
      if (!matchesSearch) return false;

      const clientBookings = bookings.filter(b => b.clientId === c.id);
      // ✅ FIXED: Sura includes ALL categories except LOCATION
      const isSura = clientBookings.some(b => b.category !== BookingCategory.LOCATION);
      const isVilla = clientBookings.some(b => b.category === BookingCategory.LOCATION);

      if (activeFilter === 'villa') return isVilla;
      if (activeFilter === 'sura') return isSura;
      return true;
    });
  }, [clients, searchTerm, activeFilter, bookings]);

  // 3. Daily Arrivals Logic
  const dailyArrivals = useMemo(() => {
    const today = startOfToday();
    
    const relevantBookings = bookings.filter(b => {
        const date = parseISO(b.shootDate);
        if (arrivalFilter === 'today') return isToday(date);
        if (arrivalFilter === 'tomorrow') return isTomorrow(date);
        if (arrivalFilter === 'week') return isSameWeek(date, today, { weekStartsOn: 6 });
        return false;
    });

    // Map unique clients arriving
    const arrivals = new Map();
    relevantBookings.forEach(b => {
        if (!arrivals.has(b.clientId)) {
            const client = clients.find(c => c.id === b.clientId);
            if (client) {
                arrivals.set(b.clientId, {
                    ...client,
                    bookingTime: b.details?.startTime || '00:00',
                    bookingTitle: b.title
                });
            }
        }
    });

    // Strictly filter for "Priority" arrivals: VIP, Famous, or Returning (Not New)
    return Array.from(arrivals.values())
      .filter(c => c.isVIP || c.isFamous || !c.isNew)
      .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));
  }, [bookings, arrivalFilter, clients]);

  // 4. Widget Calculations (Reactive)
  const vipStats = useMemo(() => filteredClients.filter(c => c.isVIP).length, [filteredClients]);
  const loyalStats = useMemo(() => filteredClients.filter(c => c.isLoyal).length, [filteredClients]);
  const starStats = useMemo(() => filteredClients.filter(c => c.isFamous).length, [filteredClients]);

  const vipStatsList = useMemo(() => {
    return [...filteredClients].filter(c => c.isVIP).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);
  }, [filteredClients]);

  const loyalStatsList = useMemo(() => {
    return [...filteredClients].filter(c => c.isLoyal).sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, 3);
  }, [filteredClients]);

  const celebrityStatsList = useMemo(() => {
    return filteredClients.filter(c => c.isFamous).slice(0, 3);
  }, [filteredClients]);


  const handleExportCSV = () => {
    // 1. Define Headers
    const headers = ['Client ID', 'Name', 'Email', 'Phone', 'Bookings Count', 'Total Spent'];

    // 2. Format Rows
    const rows = filteredClients.map(client => {
        // Escape quotes within data to avoid CSV breakage
        const safeName = `"${client.name.replace(/"/g, '""')}"`;
        const safeEmail = client.email ? `"${client.email}"` : '';
        const safePhone = client.phone ? `"${client.phone}"` : ''; // Force string for phone to keep leading zeros

        return [
            client.id,
            safeName,
            safeEmail,
            safePhone,
            client.bookingsCount,
            client.totalSpent
        ].join(',');
    });

    // 3. Combine with BOM for Arabic support in Excel
    const BOM = "\uFEFF"; 
    const csvContent = BOM + [headers.join(','), ...rows].join('\n');

    // 4. Create Blob and Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ReceptionPageWrapper isReception={isReception} isManager={isManager}>
        <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60' : 'bg-[#09090b] border-white/10'} rounded-[2.5rem] p-4 border mb-4 shrink-0 transition-all`}>
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
                <h2 className={`text-2xl font-bold ${isManager ? 'text-gray-800' : 'text-white'} flex items-center gap-3`}>
                   <div className={`p-2 ${isManager ? 'bg-amber-50 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'} rounded-lg`}>
                      <Users size={24} />
                   </div>
                   لوحة عمليات العملاء (CRM)
                </h2>

                <div className={`hidden lg:flex ${isManager ? 'bg-gray-100/50 border-gray-200' : 'bg-[#18181b] border-white/5'} p-1 rounded-xl border gap-0.5`}>
                    <button 
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'all' ? (isManager ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20' : 'bg-[#F7931E] text-white shadow-lg shadow-[#F7931E]/20') : (isManager ? 'text-gray-500 hover:text-gray-800 hover:bg-white' : 'text-gray-500 hover:text-white hover:bg-white/5')}`}
                    >
                        الكل
                    </button>
                    <button 
                        onClick={() => setActiveFilter('sura')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'sura' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : (isManager ? 'text-gray-500 hover:text-gray-800 hover:bg-white' : 'text-gray-500 hover:text-white hover:bg-white/5')}`}
                    >
                        جلسات التصوير
                    </button>
                    <button 
                        onClick={() => setActiveFilter('villa')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeFilter === 'villa' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (isManager ? 'text-gray-500 hover:text-gray-800 hover:bg-white' : 'text-gray-500 hover:text-white hover:bg-white/5')}`}
                    >
                        حجوزات الفيلا
                    </button>
                </div>
            </div>
            
             <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="relative group/search flex-1 sm:flex-initial min-w-[200px] lg:min-w-[300px]">
                    <Search className={`absolute right-4 top-2.5 ${isManager ? 'text-gray-400 group-focus-within/search:text-amber-500' : 'text-gray-500 group-focus-within/search:text-[#F7931E]'} transition-colors`} size={16} />
                    <input 
                        type="text" 
                        placeholder="بحث سريع..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isManager ? 'bg-black/5 focus:bg-white border-transparent focus:border-amber-300 text-gray-800 placeholder-gray-400' : 'bg-black/40 border-white/5 text-white focus:border-[#F7931E]/50 focus:bg-black/60 placeholder-gray-600'} border rounded-xl pr-10 pl-4 py-2 text-xs transition-all outline-none`}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${isManager ? 'text-gray-500' : 'text-gray-500'} hidden md:inline`}>{filteredClients.length} عميل</span>
                </div>
             </div>
          </div>

         {/* Mobile Filter Tabs */}
         <div className="flex lg:hidden bg-[#18181b] p-1 rounded-xl border border-white/5 gap-1 mb-4 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveFilter('all')}
                    className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-[#F7931E] text-white shadow-lg shadow-[#F7931E]/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    الكل
                </button>
                <button 
                    onClick={() => setActiveFilter('sura')}
                    className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${activeFilter === 'sura' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    جلسات التصوير
                </button>
                <button 
                    onClick={() => setActiveFilter('villa')}
                    className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${activeFilter === 'villa' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    حجوزات الفيلا
                </button>
            </div>

      </div>

       {/* CRM Operational Summary - Compact Grid */}
       <div className={`grid grid-cols-1 md:grid-cols-2 ${dailyArrivals.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-6 w-full items-start`}>
            {/* 1. Daily Arrivals Widget (Show only if priority clients exist) */}
            {dailyArrivals.length > 0 && (
                <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60 shadow-sm' : 'bg-[#18181b] border-white/10'} p-4 rounded-3xl border relative overflow-hidden group flex flex-col`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 ${isManager ? 'bg-blue-500/5' : 'bg-blue-500/10'} rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all`}></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                <Calendar size={20} />
                            </div>
                            <h3 className={`${isManager ? 'text-gray-800' : 'text-white'} font-bold text-sm`}>وصول اليوم</h3>
                        </div>
                        <div className={`flex ${isManager ? 'bg-gray-100/50' : 'bg-black/40'} p-0.5 rounded-lg border border-white/5 gap-0.5 text-[8px] font-bold`}>
                            <button onClick={() => setArrivalFilter('today')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'today' ? 'bg-blue-600/40 text-blue-400' : (isManager ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-400')}`}>اليوم</button>
                            <button onClick={() => setArrivalFilter('tomorrow')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'tomorrow' ? 'bg-blue-600/40 text-blue-400' : (isManager ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-400')}`}>غداً</button>
                            <button onClick={() => setArrivalFilter('week')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'week' ? 'bg-blue-600/40 text-blue-400' : (isManager ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-400')}`}>الأسبوع</button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 relative z-10 max-h-[240px] overflow-y-auto no-scrollbar p-0.5">
                        {dailyArrivals.map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:border-blue-500/20 transition-all hover:bg-white/10">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-black text-blue-400 shrink-0 border border-blue-500/10">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-[15px] font-bold ${isManager ? 'text-gray-800' : 'text-white'} truncate`}>{client.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-blue-400 font-bold bg-blue-400/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                <Clock size={10} /> {client.bookingTime}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0 mr-2 items-center">
                                    {client.isFamous && <div className="p-1 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/20"><Star size={12} fill="currentColor" /></div>}
                                    {client.isVIP && <div className="p-1 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 text-[8px] font-black flex items-center justify-center min-w-[20px]">VIP</div>}
                                    {!client.isNew && <div className="p-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20"><TrendingUp size={12} /></div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. VIP Clients List */}
            <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60 shadow-sm' : 'bg-[#18181b] border-white/10'} p-4 rounded-3xl border relative overflow-hidden group flex flex-col`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${isManager ? 'bg-purple-500/5' : 'bg-purple-500/10'} rounded-full blur-[40px] group-hover:bg-purple-500/20 transition-all`}></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        <Crown size={20} />
                    </div>
                    <div>
                        <h3 className={`${isManager ? 'text-gray-800' : 'text-white'} font-bold text-sm`}>كبار العملاء (VIP)</h3>
                        <p className="text-[10px] text-gray-500">الأكثر استثماراً</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {vipStatsList.map((client, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl flex-shrink-0 transition-transform group-hover/item:scale-110 ${i===0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-[#262626] border border-white/10'}`}>
                                    {client.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[13px] font-bold ${isManager ? 'text-gray-800' : 'text-white'} truncate`}>{client.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{client.bookingsCount} حجز مكتمل</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                                <span className="text-sm font-black text-purple-400 tracking-tighter">${(client.totalSpent/1000).toFixed(1)}k</span>
                            </div>
                        </div>
                    ))}
                    {vipStatsList.length === 0 && <p className="text-[10px] text-center text-gray-600 py-4 font-bold">لا يوجد عملاء VIP حالياً</p>}
                </div>
            </div>

            {/* 3. Loyal Clients List */}
            <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60 shadow-sm' : 'bg-[#18181b] border-white/10'} p-4 rounded-3xl border relative overflow-hidden group flex flex-col`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${isManager ? 'bg-pink-500/5' : 'bg-pink-500/10'} rounded-full blur-[40px] group-hover:bg-pink-500/20 transition-all`}></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                        <Heart size={20} />
                    </div>
                    <div>
                        <h3 className={`${isManager ? 'text-gray-800' : 'text-white'} font-bold text-sm`}>الأوفياء</h3>
                        <p className="text-[10px] text-gray-500">الأكثر تكراراً</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {loyalStatsList.map((client, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl flex-shrink-0 transition-transform group-hover/item:scale-110 ${i===0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-[#262626] border border-white/10'}`}>
                                    {client.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[13px] font-bold ${isManager ? 'text-gray-800' : 'text-white'} truncate`}>{client.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">سجل حافل بالزيارات</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                                <span className="text-sm font-black text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg">{client.bookingsCount}</span>
                            </div>
                        </div>
                    ))}
                     {loyalStatsList.length === 0 && <p className="text-[10px] text-center text-gray-600 py-4 font-bold">لا يوجد مخلصون حالياً</p>}
                </div>
            </div>

            {/* 4. Celebrities List */}
            <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60 shadow-sm' : 'bg-[#18181b] border-white/10'} p-4 rounded-3xl border relative overflow-hidden group flex flex-col`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${isManager ? 'bg-amber-500/5' : 'bg-yellow-500/10'} rounded-full blur-[40px] group-hover:bg-yellow-500/20 transition-all`}></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                        <Star size={20} />
                    </div>
                    <div>
                        <h3 className={`${isManager ? 'text-gray-800' : 'text-white'} font-bold text-sm`}>المشاهير</h3>
                        <p className="text-[10px] text-gray-500">أوزان ذهبية</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {celebrityStatsList.length > 0 ? (
                        celebrityStatsList.map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl flex-shrink-0 bg-gradient-to-br from-yellow-400 to-amber-600 transition-transform group-hover/item:scale-110">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-[13px] font-bold ${isManager ? 'text-gray-800' : 'text-white'} truncate`}>{client.name}</p>
                                        <p className="text-[10px] text-yellow-500/80 font-bold flex items-center gap-1 mt-0.5"><TrendingUp size={10}/> شخصية بارزة</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <Star className="text-yellow-500 shadow-lg" size={16} fill="currentColor" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                            <Star size={32} />
                            <p className="text-[9px] mt-2 font-bold">لا توجد شخصيات بارزة حالياً</p>
                        </div>
                    )}
                </div>
            </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8 custom-scrollbar">
        {filteredClients.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-600 py-12">
                <Users size={48} className="opacity-10 mb-4" />
                <p className="font-bold">قاعدة بيانات العملاء خالية من النتائج المطابقة</p>
            </div>
        ) : (
            filteredClients.map((client, index) => (
                <ScrollReveal key={client.id} delay={Math.min(index * 0.05, 0.3)}>
                    <div className={`${isManager ? 'bg-white/40 hover:bg-white/60 border-white/40 hover:border-amber-400/30 hover:shadow-amber-500/5' : 'bg-[#09090b]/40 hover:bg-[#18181b]/60 border-white/5 hover:border-[#F7931E]/40 hover:shadow-[#F7931E]/5'} backdrop-blur-md rounded-[1.5rem] p-4 border transition-all group h-full flex flex-col shadow-lg hover:-translate-y-1 duration-300`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                                    {client.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className={`font-bold ${isManager ? 'text-gray-800' : 'text-white'} text-[13px] truncate`}>{client.name}</h3>
                                        <ClientBadge booking={bookings.find(b => b.clientId === client.id) || bookings[0]} allBookings={bookings} compact />
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">ID: {client.id.slice(0, 8)}</p>
                                </div>
                            </div>

                            {client.notes.length > 0 && (
                                <div className="relative group/note">
                                    <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 cursor-help">
                                        <StickyNote size={16} />
                                    </div>
                                    <div className="absolute top-0 right-full mr-3 w-48 bg-gray-900 border border-white/10 p-3 rounded-2xl shadow-2xl opacity-0 group-hover/note:opacity-100 pointer-events-none transition-all z-50 text-[10px] text-gray-300">
                                        <p className="font-bold text-yellow-500 mb-2 flex items-center gap-1"><AlertCircle size={10}/> ملاحظات أخيرة:</p>
                                        <p className="leading-relaxed">{client.notes[client.notes.length - 1]}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2 mb-4 flex-1">
                            <div className={`flex items-center gap-2 text-[11px] text-gray-400 ${isManager ? 'bg-white/40 border-gray-100 hover:bg-white/60' : 'bg-white/5 border-white/5 group-hover:bg-white/10'} px-2 py-1.5 rounded-lg border transition-colors`}>
                                <Phone size={12} className="text-gray-500" /> 
                                <span dir="ltr" className="font-medium flex-1">{client.phone || '---'}</span>
                                {client.phone && (
                                    <a 
                                        href={getWhatsAppUrl(client.phone, client.name)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-1.5 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                        title="مراسلة عبر واتساب"
                                    >
                                        <MessageCircle size={14} />
                                    </a>
                                )}
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] text-gray-400 ${isManager ? 'bg-white/40 border-gray-100 hover:bg-white/60' : 'bg-white/5 border-white/5 group-hover:bg-white/10'} px-2 py-1.5 rounded-lg border transition-colors`}>
                                <Calendar size={12} className="text-gray-500" /> 
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">آخر زيارة:</span>
                                    <span className={`font-medium ${isManager ? 'text-gray-700' : 'text-white/70'}`}>{format(parseISO(client.lastVisit), 'MMM yyyy', { locale: ar })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">إجمالي الاستثمار</span>
                                <div className="flex items-center gap-1">
                                    <Wallet size={10} className="text-[#F7931E]" />
                                    <span className="text-[#F7931E] font-black text-sm">${client.totalSpent.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">جلسات التصوير</span>
                                <div className={`flex items-center gap-1 ${isManager ? 'text-gray-800' : 'text-white/90'} font-black text-sm`}>
                                    <Sparkles size={10} className="text-blue-400" />
                                    <span>{client.bookingsCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            ))
        )}
      </div>
        </div>
    </ReceptionPageWrapper>
  );
};

export default ClientsView;
