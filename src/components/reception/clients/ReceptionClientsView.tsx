import React, { useMemo, useState, useDeferredValue } from 'react';
import {
    Users, Phone, Search, Crown, Heart, Star, TrendingUp,
    Calendar, Clock, StickyNote, AlertCircle, Wallet, Sparkles, MessageCircle, Plus,
    Link2, Copy, Check, Send, ArrowLeftRight
} from 'lucide-react';
import { Booking } from '../../../types';
import ScrollReveal from '../../shared/ScrollReveal';
import ReceptionPageWrapper from '../layout/ReceptionPageWrapper';
import ClientBadge from '../../shared/ClientBadge';
import AddExtraItemModal from '../../AddExtraItemModal';
import { format, isToday, isTomorrow, isSameWeek, parseISO, startOfToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import FilterBar from '../../shared/FilterBar';
import { FilterState, defaultFilterState, filterClientsByBookingType, getFilterStats } from '../../../utils/filterUtils';
import { buildClientPortalUrl, getClientPortalLinkError } from '../../../utils/clientPortal';
import { getWhatsAppUrl, openWhatsAppUrl } from '../../../utils/whatsapp';

interface ClientsViewProps {
  bookings: Booking[];
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
  onRebookClient?: (clientName: string, clientPhone: string) => void;
}

interface LinkTargetClient {
  id: string;
  name: string;
  phone?: string;
}

const ReceptionClientsView: React.FC<ClientsViewProps> = ({ bookings, onUpdateBooking, onRebookClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filter, setFilter] = useState<FilterState>(defaultFilterState);
  const [arrivalFilter, setArrivalFilter] = useState<'today' | 'tomorrow' | 'week'>('today');
  
  // Quick Charge Modal (unified AddExtraItemModal)
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Send Link Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedClientForLink, setSelectedClientForLink] = useState<LinkTargetClient | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Exchange rate: USD → IQD
  const [exchangeRate, setExchangeRate] = useState(1500);

  const buildWhatsAppMessage = (name: string) => `مرحباً ${name}، نحن من فيلا حداد...`;

  // Hardcoded for Reception
  const isReception = true;

  // Get client portal link
  const getClientPortalLink = (clientId: string) => {
    // Find the latest booking for this client to get the token
    const clientBookings = bookings
      .filter(b => b.clientId === clientId && !b.deletedAt)
      .sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
    
    if (clientBookings.length === 0) return null;
    
    const latestBooking = clientBookings[0];
    if (!latestBooking) return null;
    const token = latestBooking.client_token;
    const linkError = getClientPortalLinkError(token);
    if (linkError) return null;
    const url = buildClientPortalUrl(token);
    if (!url) return null;
    return {
      url,
      booking: latestBooking
    };
  };

  const handleSendLink = (client: LinkTargetClient) => {
    setSelectedClientForLink(client);
    setShowLinkModal(true);
    setCopiedLink(false);
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendWhatsApp = (client: LinkTargetClient, url: string) => {
    const message = `مرحباً ${client.name} 👋\n\nإليك رابط بوابة اختيار الصور الخاصة بك:\n${url}\n\nيرجى الدخول واختيار الصور المفضلة لديك.\n\nفيلا حداد - لتجربة تصوير لا تُنسى 📸`;
    
    let phone = client.phone?.replace(/\D/g, '') || '';
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (phone.length > 0 && !phone.startsWith('964')) phone = '964' + phone;
    
    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    void openWhatsAppUrl(waUrl);
  };

  // ✅ Unified handler — called by AddExtraItemModal onAdd callback
  const handleQuickCharge = (amount: number, description: string, chargeCurrency: string) => {
    if (!selectedClientId || !onUpdateBooking) return;

    // Find latest booking for this client (exclude deleted)
    const clientBookings = bookings
      .filter(b => b.clientId === selectedClientId && !b.deletedAt)
      .sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());

    if (clientBookings.length === 0) return;

    const latestBooking = clientBookings[0];
    if (!latestBooking) return;
    const currentExtraItems = latestBooking.details?.extraItems || [];
    const newItem = {
      id: Date.now().toString(),
      amount,
      currency: chargeCurrency as 'USD' | 'IQD',
      description,
    };

    // ✅ Handle currency: same currency adds to totalAmount, different currency adds to addOnTotal
    const isSameCurrency = latestBooking.currency === chargeCurrency;

    if (isSameCurrency) {
      onUpdateBooking(latestBooking.id, {
        totalAmount: latestBooking.totalAmount + amount,
        paidAmount: latestBooking.paidAmount + amount, // ✅ المبلغ الإضافي مستلم فوراً
        details: {
          ...latestBooking.details,
          extraItems: [...currentExtraItems, newItem],
        },
      });
    } else {
      const currentAddOnTotal = latestBooking.addOnTotal || 0;
      onUpdateBooking(latestBooking.id, {
        addOnTotal: currentAddOnTotal + amount,
        originalPackagePrice: latestBooking.originalPackagePrice || latestBooking.totalAmount,
        details: {
          ...latestBooking.details,
          extraItems: [...currentExtraItems, newItem],
        },
      });
    }

    // Reset
    setShowChargeModal(false);
    setSelectedClientId(null);
  };


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
        // Separate totals by currency to avoid mixing USD and IQD
        if (b.currency === 'USD') {
            client.totalSpentUSD += b.totalAmount;
        } else {
            client.totalSpentIQD += b.totalAmount;
        }
        client.totalSpent += b.totalAmount; // Keep for sorting

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
  }, [bookings, exchangeRate]);

  // Get filter stats
  const filterStats = useMemo(() => getFilterStats(bookings), [bookings]);

  // 2. Filtered Clients for the list
  const filteredClients = useMemo(() => {
    // First filter by search (using deferred value for smooth typing)
    let result = clients.filter(c => {
      if (!deferredSearchTerm) return true;
      const matchesName = c.name.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      // Normalize phone: strip non-digits for flexible matching (e.g. "0770" matches "07701234567")
      const normalizedPhone = c.phone?.replace(/\D/g, '') || '';
      const searchDigits = deferredSearchTerm.replace(/\D/g, '');
      const matchesPhone = searchDigits.length > 0 && normalizedPhone.includes(searchDigits);
      return matchesName || matchesPhone;
    });

    // Then apply booking type filter
    result = filterClientsByBookingType(result, bookings, filter);

    return result;
  }, [clients, deferredSearchTerm, filter, bookings]);

  // 3. Daily Arrivals Logic
  const dailyArrivals = useMemo(() => {
    const today = startOfToday();
    
    const relevantBookings = bookings.filter(b => {
        if (b.deletedAt) return false; // Exclude deleted bookings
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
      .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));
  }, [bookings, arrivalFilter, clients]);

  // 4. Widget Calculations (Reactive)
  const vipStatsList = useMemo(() => {
    return [...filteredClients].filter(c => c.isVIP).sort((a, b) => b.totalInIQD - a.totalInIQD).slice(0, 3);
  }, [filteredClients]);

  const loyalStatsList = useMemo(() => {
    return [...filteredClients].filter(c => c.isLoyal).sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, 3);
  }, [filteredClients]);

  const celebrityStatsList = useMemo(() => {
    return filteredClients.filter(c => c.isFamous).slice(0, 3);
  }, [filteredClients]);


  return (
    <ReceptionPageWrapper isReception={isReception}>
        <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="bg-[#09090b] rounded-[2.5rem] p-4 border border-white/10 mb-4 shrink-0">
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Users size={24} />
                   </div>
                   لوحة عمليات العملاء (CRM)
                </h2>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {/* Exchange Rate Input */}
                <div className="flex items-center gap-1.5 bg-black/40 rounded-xl px-3 py-1.5 border border-white/5">
                    <ArrowLeftRight size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">$1 =</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={exchangeRate.toLocaleString()}
                        onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(val) && val > 0) setExchangeRate(val);
                        }}
                        className="w-16 bg-transparent text-xs font-black text-white text-center outline-none"
                    />
                    <span className="text-[9px] font-bold text-gray-500">د.ع</span>
                </div>

                <div className="hidden lg:block">
                    <FilterBar
                      filter={filter}
                      onFilterChange={setFilter}
                      stats={filterStats}
                    />
                </div>

                <div className="relative group/search flex-1 sm:flex-initial min-w-[200px] lg:min-w-[300px]">
                    <Search className="absolute right-4 top-2.5 text-gray-500 group-focus-within/search:text-[#F7931E] transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder="بحث سريع..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:border-[#F7931E]/50 focus:bg-black/60 placeholder-gray-600 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 hidden md:inline">{filteredClients.length} عميل</span>
                </div>
             </div>
          </div>

          {/* Mobile Filter */}
          <div className="lg:hidden mt-4">
              <FilterBar 
                filter={filter}
                onFilterChange={setFilter}
                stats={filterStats}
              />
          </div>
      </div>

       {/* CRM Operational Summary - Compact Grid */}
       <div className={`grid grid-cols-1 md:grid-cols-2 ${dailyArrivals.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-6 w-full items-start`}>
            {/* 1. Daily Arrivals Widget (Show only if priority clients exist) */}
            {dailyArrivals.length > 0 && (
                <div className="bg-[#18181b] p-4 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                <Calendar size={20} />
                            </div>
                            <h3 className="text-white font-bold text-sm">وصول اليوم</h3>
                        </div>
                        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5 text-[8px] font-bold">
                            <button onClick={() => setArrivalFilter('today')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'today' ? 'bg-blue-600/40 text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}>اليوم</button>
                            <button onClick={() => setArrivalFilter('tomorrow')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'tomorrow' ? 'bg-blue-600/40 text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}>غداً</button>
                            <button onClick={() => setArrivalFilter('week')} className={`px-2 py-1 rounded-md transition-all ${arrivalFilter === 'week' ? 'bg-blue-600/40 text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}>الأسبوع</button>
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
                                        <p className="text-[15px] font-bold text-white truncate">{client.name}</p>
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
            <div className="bg-[#18181b] p-4 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        <Crown size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">كبار العملاء (VIP)</h3>
                        <p className="text-[10px] text-gray-500">الأكثر استثماراً</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {vipStatsList.map((client, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 transition-transform group-hover/item:scale-110 ${i===0 ? 'bg-linear-to-r from-yellow-400 to-yellow-600' : 'bg-[#262626] border border-white/10'}`}>
                                    {client.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-white truncate">{client.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{client.bookingsCount} حجز مكتمل</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-black text-purple-400 tracking-tighter">{client.totalInIQD.toLocaleString()}</span>
                                <span className="text-[9px] text-gray-500 mr-1">د.ع</span>
                            </div>
                        </div>
                    ))}
                    {vipStatsList.length === 0 && <p className="text-[10px] text-center text-gray-600 py-4 font-bold">لا يوجد عملاء VIP حالياً</p>}
                </div>
            </div>

            {/* 3. Loyal Clients List */}
            <div className="bg-[#18181b] p-4 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                        <Heart size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">الأوفياء</h3>
                        <p className="text-[10px] text-gray-500">الأكثر تكراراً</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {loyalStatsList.map((client, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 transition-transform group-hover/item:scale-110 ${i===0 ? 'bg-linear-to-r from-pink-500 to-rose-500' : 'bg-[#262626] border border-white/10'}`}>
                                    {client.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-white truncate">{client.name}</p>
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
            <div className="bg-[#18181b] p-4 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                        <Star size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">المشاهير</h3>
                        <p className="text-[10px] text-gray-500">أوزان ذهبية</p>
                    </div>
                </div>
                <div className="space-y-3 relative z-10 p-1 max-h-[240px] overflow-y-auto no-scrollbar">
                    {celebrityStatsList.length > 0 ? (
                        celebrityStatsList.map((client, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/item">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 bg-linear-to-br from-yellow-400 to-amber-600 transition-transform group-hover/item:scale-110">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-white truncate">{client.name}</p>
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
            filteredClients.map((client, index) => {
                const clientPrimaryBooking = bookings.find(b => b.clientId === client.id) ?? bookings[0];

                return (
                <ScrollReveal key={client.id} delay={Math.min(index * 0.05, 0.3)}>
                    <div 
                      onClick={() => {
                        if (onUpdateBooking) {
                          setSelectedClientId(client.id);
                          setShowChargeModal(true);
                        }
                      }}
                      className="bg-[#09090b]/40 backdrop-blur-md hover:bg-[#18181b]/60 border border-white/5 hover:border-[#F7931E]/40 rounded-3xl p-4 transition-all group h-full flex flex-col shadow-lg hover:shadow-[#F7931E]/5 hover:-translate-y-1 duration-300 cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center text-sm font-black text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                                    {client.name.charAt(0)}
                                </div>
                                    <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className="font-bold text-white text-[13px] truncate">{client.name}</h3>
                                        {clientPrimaryBooking && (
                                          <ClientBadge booking={clientPrimaryBooking} allBookings={bookings} compact />
                                        )}
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
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                                <Phone size={12} className="text-gray-500" /> 
                                <span dir="ltr" className="font-medium flex-1">{client.phone || '---'}</span>
                                <div className="flex items-center gap-1">
                                    {client.phone && (
                                        <button
                                            type="button"
                                            className="p-1.5 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void openWhatsAppUrl(getWhatsAppUrl(client.phone, buildWhatsAppMessage(client.name)));
                                            }}
                                            title="مراسلة عبر واتساب"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSendLink(client);
                                        }}
                                        className="p-1.5 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all"
                                        title="إرسال رابط البوابة"
                                    >
                                        <Link2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                                <Calendar size={12} className="text-gray-500" /> 
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-gray-600 font-bold uppercase">آخر زيارة:</span>
                                    <span className="font-medium text-white/70">{format(parseISO(client.lastVisit), 'MMM yyyy', { locale: ar })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">إجمالي الاستثمار</span>
                                <div className="flex items-center gap-1">
                                    <Wallet size={10} className="text-[#F7931E]" />
                                    <span className="text-[#F7931E] font-black text-sm">{client.totalInIQD.toLocaleString()} <span className="text-[9px] text-gray-500">د.ع</span></span>
                                </div>
                                {client.totalSpentUSD > 0 && (
                                    <span className="text-[8px] text-gray-600">(${client.totalSpentUSD.toLocaleString()} + {client.totalSpentIQD.toLocaleString()} د.ع)</span>
                                )}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">جلسات التصوير</span>
                                <div className="flex items-center gap-1 text-white/90 font-black text-sm">
                                    <Sparkles size={10} className="text-blue-400" />
                                    <span>{client.bookingsCount}</span>
                                </div>
                            </div>
                            {onRebookClient && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRebookClient(client.name, client.phone);
                                }}
                                className="w-9 h-9 rounded-xl bg-[#F7931E]/10 text-[#F7931E] hover:bg-[#F7931E] hover:text-white flex items-center justify-center transition-all hover:scale-110 border border-[#F7931E]/20"
                                title="حجز جديد لهذا العميل"
                              >
                                <Plus size={16} />
                              </button>
                            )}
                        </div>
                    </div>
                </ScrollReveal>
            )})
        )}
      </div>

      {/* Quick Charge Modal — unified AddExtraItemModal */}
      <AddExtraItemModal
        isOpen={showChargeModal}
        onClose={() => { setShowChargeModal(false); setSelectedClientId(null); }}
        onAdd={handleQuickCharge}
        bookingCurrency={(() => {
          if (!selectedClientId) return 'IQD';
          const latest = bookings
            .filter(b => b.clientId === selectedClientId && !b.deletedAt)
            .sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime())[0];
          return latest?.currency || 'IQD';
        })()}
      />

      {/* Send Link Modal */}
      {showLinkModal && selectedClientForLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100000 p-4" onClick={() => setShowLinkModal(false)}>
          <div className="bg-[#1a1c22] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Link2 className="text-amber-500" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">إرسال رابط البوابة</h3>
                <p className="text-sm text-gray-400">{selectedClientForLink.name}</p>
              </div>
            </div>

            {(() => {
              const linkData = getClientPortalLink(selectedClientForLink.id);
              if (!linkData) {
                return (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>لا يوجد رابط بوابة صالح لهذا العميل</p>
                    <p className="text-[11px] mt-2 text-gray-500">تحقق من token و VITE_CLIENT_PORTAL_BASE_URL</p>
                  </div>
                );
              }
              
              const { url, booking } = linkData;
              
              return (
                <div className="space-y-4">
                  {/* Booking Info */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">الحجز الأخير</p>
                    <p className="text-sm font-bold text-white">{booking?.title ?? 'بدون عنوان'}</p>
                    <p className="text-xs text-gray-400">{booking?.shootDate ?? 'بدون تاريخ'}</p>
                  </div>

                  {/* Link Display */}
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pl-12 text-sm text-gray-300 font-mono text-left focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopyLink(url)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="نسخ الرابط"
                    >
                      {copiedLink ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-400" />}
                    </button>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`}
                        alt="QR Code"
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">رمز QR</p>
                      <p className="text-xs text-gray-400">يمكن للعميل مسح الرمز للوصول مباشرة</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setShowLinkModal(false)}
                      className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-all"
                    >
                      إغلاق
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(selectedClientForLink, url)}
                      disabled={!selectedClientForLink.phone}
                      className="py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                      إرسال واتساب
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
        </div>
    </ReceptionPageWrapper>
  );
};

export default ReceptionClientsView;
