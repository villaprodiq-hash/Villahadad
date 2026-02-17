import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Activity, MapPin, LayoutGrid,
  Lock, ShieldAlert, UserCheck, Eye,
  Camera, Palette, Printer, Package, PhoneCall, Scissors
} from 'lucide-react';
import { User, Booking, BookingStatus, UserRole, StatusHistoryItem } from '../../../types';
import { toast } from 'sonner';
import { presenceService } from '../../../services/db/services/PresenceService';

interface AdminGeniusDashboardProps {
  bookings: Booking[];
  users: User[];
  onSelectBooking: (booking: Booking) => void;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

interface AdminVaultStats {
  totalInDrawer?: number;
  deposits?: number;
  finals?: number;
  outstanding?: number;
}

interface AdminStatsSnapshot {
  vault?: AdminVaultStats;
}

type BookingHistoryEntry = StatusHistoryItem & { date?: string };

const AdminGeniusDashboard: React.FC<AdminGeniusDashboardProps> = ({
  bookings,
  users,
  onSelectBooking,
  onUpdateBooking
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realStats, setRealStats] = useState<AdminStatsSnapshot | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  // Real audit count: pending approvals + overdue deliveries
  const auditCount = useMemo(() => {
    const pending = bookings.filter(b => b.approvalStatus === 'pending').length;
    const overdue = bookings.filter(b => {
      if (!b.actualSelectionDate) return false;
      const deadline = new Date(b.actualSelectionDate);
      deadline.setDate(deadline.getDate() + 60);
      return deadline.getTime() < Date.now() && b.status !== BookingStatus.DELIVERED && b.status !== BookingStatus.ARCHIVED;
    }).length;
    return pending + overdue;
  }, [bookings]);

  // Subscribe to real-time presence
  useEffect(() => {
    const initial = presenceService.getOnlineUsers();
    if (initial.length > 0) setOnlineUsers(initial);

    const unsubscribe = presenceService.subscribe((online) => {
      setOnlineUsers(online);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    loadRealStats();
    return () => clearInterval(timer);
  }, [bookings]);

  const loadRealStats = async () => {
     const { electronBackend } = await import('../../../services/mockBackend');
     const stats = await electronBackend.getAdminStats();
     setRealStats(stats);
  };

  // --- 1. PIPELINE STATS (Group bookings by status) ---
  const pipelineStats = useMemo(() => {
    return {
      reception: bookings.filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.INQUIRY),
      shooting: bookings.filter(b => b.status === BookingStatus.SHOOTING || b.status === BookingStatus.SHOOTING_COMPLETED),
      selection: bookings.filter(b => b.status === BookingStatus.SELECTION),
      editing: bookings.filter(b => b.status === BookingStatus.EDITING || b.status === BookingStatus.READY_TO_PRINT),
      printing: bookings.filter(b => b.status === BookingStatus.PRINTING),
      delivery: bookings.filter(b => b.status === BookingStatus.READY_FOR_PICKUP || b.status === BookingStatus.DELIVERED),
    };
  }, [bookings]);

  // --- 2. STAFF MAPPING — ONLY online users by role ---
  const onlineIds = useMemo(() => new Set(onlineUsers.map(u => u.id)), [onlineUsers]);

  const getStaffForStage = (stage: string): (User & { isOnline: boolean })[] => {
    const roleMap: Record<string, UserRole[]> = {
      reception: [UserRole.RECEPTION],
      shooting: [UserRole.MANAGER],
      selection: [UserRole.SELECTOR],
      editing: [UserRole.PHOTO_EDITOR, UserRole.VIDEO_EDITOR],
      printing: [UserRole.PRINTER],
    };
    const roles = roleMap[stage] || [];
    return users
      .filter(u => roles.includes(u.role))
      .map(u => ({ ...u, isOnline: onlineIds.has(u.id) }));
  };

  // --- 3. HANDLE BOOKING MOVE ---
  const handleMoveBooking = (id: string, newStatus: BookingStatus) => {
    if (onUpdateBooking) {
      onUpdateBooking(id, { status: newStatus });
    }
  };

  // --- Today's date (shared) ---
  const today = new Date().toISOString().slice(0, 10);

  // --- 4. FINANCIAL DATA (Computed from bookings — always accurate) ---
  const financialVault = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const active = bookings.filter(b => !b.deletedAt);

    // Today's bookings for deposits
    const todayBookingsPayments = active.filter(b => {
      // Check if booking was created today (first status history entry)
      const history: BookingHistoryEntry[] = Array.isArray(b.statusHistory) ? b.statusHistory as BookingHistoryEntry[] : [];
      const firstEntry = history[0] ?? null;
      const created = firstEntry?.date || firstEntry?.timestamp || '';
      return String(created).startsWith(todayStr);
    });

    // Calculate deposits (paidAmount of today's new bookings)
    let depositsToday = 0;
    todayBookingsPayments.forEach(b => {
      depositsToday += b.paidAmount || 0;
    });

    // Total outstanding across all active bookings
    let totalOutstanding = 0;
    active.forEach(b => {
      if (b.status !== BookingStatus.ARCHIVED) {
        const remaining = (b.totalAmount || 0) - (b.paidAmount || 0);
        if (remaining > 0) totalOutstanding += remaining;
      }
    });

    // Use realStats if available (from payments table), fallback to bookings calculation
    if (realStats?.vault) {
      const outstandingFromReal = Number(realStats.vault.outstanding ?? 0);
      return {
        totalInDrawer: realStats.vault.totalInDrawer || depositsToday,
        deposits: realStats.vault.deposits || depositsToday,
        finals: realStats.vault.finals || 0,
        outstanding: outstandingFromReal > 0 ? outstandingFromReal : totalOutstanding,
      };
    }

    return {
      deposits: depositsToday,
      finals: 0,
      totalInDrawer: depositsToday,
      outstanding: totalOutstanding,
    };
  }, [bookings, realStats]);

  // --- 5. TODAY'S BOOKINGS FOR VENUE GRID ---
  const todayBookings = useMemo(() => {
    return bookings.filter(b => b.shootDate === today && b.status !== BookingStatus.ARCHIVED);
  }, [bookings, today]);

  const venues = useMemo(() => {
    const locationLabels: Record<string, string> = {
      'Garden': 'الحديقة الخارجية', 'Studio': 'الاستوديو الداخلي',
      'VIP': 'غرفة VIP', 'Royal': 'الجناح الملكي', 'Outdoor': 'التصوير الخارجي',
    };
    const usedLocations = new Set<string>();
    todayBookings.forEach(b => { if (b.location) usedLocations.add(b.location); });
    const defaults = ['Garden', 'Studio', 'VIP', 'Royal'];
    defaults.forEach(d => usedLocations.add(d));
    return Array.from(usedLocations).map(loc => ({
      id: loc, name: locationLabels[loc] || loc,
      type: loc === 'Garden' || loc === 'Outdoor' ? 'outdoor' : 'indoor',
    }));
  }, [todayBookings]);

  const isOccupied = (venueId: string, hour: number) => {
    return todayBookings.find(b => {
      if (b.location !== venueId) return false;
      const startTime = b.details?.startTime;
      const endTime = b.details?.endTime;
      if (!startTime) return false;
      const startH = parseInt(startTime.split(':')[0] || '0');
      const endH = endTime ? parseInt(endTime.split(':')[0] || '24') : startH + 2;
      return hour >= startH && hour < endH;
    }) || null;
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 10);

  // Pipeline stage config
  const stages = [
    { key: 'reception', label: 'الاستقبال', icon: PhoneCall, color: 'blue', status: BookingStatus.CONFIRMED },
    { key: 'shooting', label: 'التصوير', icon: Camera, color: 'amber', status: BookingStatus.SHOOTING },
    { key: 'selection', label: 'الاختيار', icon: Scissors, color: 'purple', status: BookingStatus.SELECTION },
    { key: 'editing', label: 'التعديل', icon: Palette, color: 'cyan', status: BookingStatus.EDITING },
    { key: 'printing', label: 'الطباعة', icon: Printer, color: 'pink', status: BookingStatus.PRINTING },
    { key: 'delivery', label: 'التسليم', icon: Package, color: 'emerald', status: BookingStatus.READY_FOR_PICKUP },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string; badge: string }> = {
    blue:    { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', badge: 'bg-blue-500' },
    amber:   { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', badge: 'bg-amber-500' },
    purple:  { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500', badge: 'bg-purple-500' },
    cyan:    { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500', badge: 'bg-cyan-500' },
    pink:    { bg: 'bg-pink-500/5', border: 'border-pink-500/20', text: 'text-pink-400', dot: 'bg-pink-500', badge: 'bg-pink-500' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500', badge: 'bg-emerald-500' },
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 space-y-5 font-sans overflow-hidden relative">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-1 flex items-center gap-3">
                   <div className="p-2 bg-[#ff6d00] rounded-lg shadow-[0_0_20px_rgba(255,109,0,0.4)]">
                      <Activity size={20} className="text-white" />
                   </div>
                   مركز قيادة فيلا حداد
                </h1>
                <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
                    SUPERVISOR CONTROL DECK • {currentTime.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})} • {onlineUsers.length} متصلين الآن
                </p>
            </div>

            <div className="flex gap-3">
                {auditCount > 0 && (
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                    <ShieldAlert size={16} />
                    <span className="text-xs font-bold">تنبيهات ({auditCount})</span>
                </button>
                )}
            </div>
        </header>

        {/* --- LIVING PIPELINE (Redesigned) --- */}
        <section className="bg-[#14161c] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <LayoutGrid size={18} className="text-emerald-500" />
                    شريان العمل الحي
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
                        <Eye size={10} className="animate-pulse" />
                        <span className="font-bold">مباشر</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        تحديث مباشر
                    </div>
                </div>
            </div>

            {/* Pipeline Grid — 6 columns */}
            <div className="grid grid-cols-6 gap-3">
                {stages.map((stage) => {
                    const stageBookings = pipelineStats[stage.key as keyof typeof pipelineStats] || [];
                    const stageStaff = getStaffForStage(stage.key);
                    const onlineStaff = stageStaff.filter(s => s.isOnline);
                    const offlineStaff = stageStaff.filter(s => !s.isOnline);
                    const colors = colorMap[stage.color] || colorMap.blue!
                    const Icon = stage.icon;
                    const hasPressure = stageBookings.length > 5;

                    return (
                        <div
                            key={stage.key}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const bookingId = e.dataTransfer.getData('bookingId');
                                if (bookingId) { handleMoveBooking(bookingId, stage.status); toast.success('تم نقل العمل بنجاح'); }
                            }}
                            className={`relative rounded-xl border p-3 transition-all duration-300 ${
                                hasPressure ? 'bg-red-500/5 border-red-500/20' : `${colors.bg} ${colors.border}`
                            } hover:border-white/20`}
                        >
                            {/* Stage Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                                        <Icon size={14} className={colors.text} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white leading-none">{stage.label}</p>
                                        <p className="text-[9px] text-zinc-500 mt-0.5">{stageBookings.length} حجز</p>
                                    </div>
                                </div>
                                {stageBookings.length > 0 && (
                                    <div className={`min-w-[22px] h-[22px] px-1 ${colors.badge} rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
                                        {stageBookings.length}
                                    </div>
                                )}
                            </div>

                            {/* Online Staff in this section */}
                            <div className="mb-3 min-h-[36px]">
                                {onlineStaff.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {onlineStaff.map((user) => (
                                            <div key={user.id} className="group/staff relative">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/40 bg-zinc-800 overflow-hidden shadow-sm">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-linear-to-tr from-zinc-700 to-zinc-600 text-[9px] text-white font-bold">
                                                                {user.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#14161c]"></div>
                                                </div>
                                                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 text-white text-[9px] rounded opacity-0 group-hover/staff:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                                    {user.name} <span className="text-emerald-400">●</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                                        <div className="w-8 h-8 rounded-full border border-dashed border-zinc-700 flex items-center justify-center opacity-50">
                                            <UserCheck size={12} className="text-zinc-600" />
                                        </div>
                                        {offlineStaff.length > 0 ? (
                                            <span className="text-zinc-600">{offlineStaff.length} غير متصل</span>
                                        ) : (
                                            <span>لا يوجد</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bookings List */}
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                {stageBookings.length > 0 ? (
                                    <>
                                        {stageBookings.slice(0, 4).map((booking) => {
                                            const isVilla = booking.category === 'Location';
                                            return (
                                                <div
                                                    key={booking.id}
                                                    draggable
                                                    onDragStart={(e) => { e.dataTransfer.setData('bookingId', booking.id); e.dataTransfer.effectAllowed = 'move'; }}
                                                    onClick={() => onSelectBooking(booking)}
                                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-[#ff6d00]/30 cursor-pointer transition-all active:scale-95 relative"
                                                >
                                                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#14161c] ${isVilla ? 'bg-blue-500' : 'bg-purple-500'}`} title={isVilla ? 'فيلا' : 'سرى'}></div>
                                                    <div className={`w-1 h-6 shrink-0 rounded-full ${colors.dot}`}></div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-bold text-zinc-300 truncate dir-rtl text-right leading-tight">
                                                            {booking.clientName}
                                                        </p>
                                                        <p className="text-[8px] text-zinc-600 truncate">{booking.title || booking.category}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {stageBookings.length > 4 && (
                                            <div className="text-center pt-1">
                                                <span className="text-[9px] text-zinc-600 font-mono">+{stageBookings.length - 4} آخرين</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center py-3 text-[9px] text-zinc-700 italic">
                                        فارغ
                                    </div>
                                )}
                            </div>

                            {/* Pressure indicator */}
                            {hasPressure && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500/50 animate-pulse rounded-b-xl"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>

        {/* 2. SPLIT VIEW: VENUE GRID & FINANCIAL VAULT + RUSH */}
        <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">

            {/* VENUE GRID */}
            <div className="col-span-12 lg:col-span-8 bg-[#14161c] border border-white/5 rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                   <h2 className="text-base font-bold text-white flex items-center gap-2">
                       <MapPin size={18} className="text-purple-500" />
                       شبكة إدارة المكان
                   </h2>
                   <div className="flex gap-2 text-[10px] font-bold">
                       <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">متاح</span>
                       <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded border border-red-500/10">محجوز</span>
                   </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative border border-white/5 rounded-xl bg-[#0a0c10]">
                    <div className="flex border-b border-white/5 sticky top-0 bg-[#14161c] z-10">
                        <div className="w-32 shrink-0 p-2.5 text-[10px] font-bold text-zinc-500 border-l border-white/5 text-center">القاعة / الوقت</div>
                        {hours.map(h => (
                            <div key={h} className="flex-1 min-w-[50px] p-2.5 text-center text-[10px] font-mono text-zinc-400 border-l border-white/5">
                                {h}:00
                            </div>
                        ))}
                    </div>

                    {venues.map(venue => (
                        <div key={venue.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <div className="w-32 shrink-0 p-3 text-[10px] font-bold text-white border-l border-white/5 flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${venue.type === 'outdoor' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                                {venue.name}
                            </div>
                            {hours.map(h => {
                                const booking = isOccupied(venue.id, h);
                                if (booking) return (
                                    <div key={h} className="flex-1 min-w-[50px] bg-red-500/20 border-l border-red-500/20 relative group cursor-pointer hover:bg-red-500/30 transition-colors">
                                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-white/10 px-2 py-1 rounded text-[9px] whitespace-nowrap z-20 shadow-2xl">
                                            {booking.clientName}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                        </div>
                                    </div>
                                );
                                return <div key={h} className="flex-1 min-w-[50px] border-l border-white/5 hover:bg-white/5 transition-colors"></div>;
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* FINANCIAL VAULT + RUSH */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">

                {/* The Safe */}
                <div className="bg-[#14161c] border border-white/5 rounded-2xl p-5 flex-1 flex flex-col relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none"></div>

                     <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Lock size={18} className="text-emerald-500" />
                            الخزنة اليومية
                        </h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-5">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">الموجود الفعلي (في الدرج)</p>
                            <div className="text-4xl font-black text-white font-mono tracking-tighter">
                                {financialVault.totalInDrawer.toLocaleString()} <span className="text-sm text-emerald-500">$</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <p className="text-[9px] text-zinc-400 uppercase">عربونات اليوم</p>
                                </div>
                                <p className="text-lg font-bold text-blue-400 font-mono">{financialVault.deposits.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                                 <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <p className="text-[9px] text-zinc-400 uppercase">تصفية حساب</p>
                                </div>
                                <p className="text-lg font-bold text-emerald-400 font-mono">{financialVault.finals.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                             <div className="flex justify-between items-center mb-1.5">
                                <p className="text-zinc-500 text-[10px] font-bold uppercase">ديون مستحقة (في السوق)</p>
                                {financialVault.outstanding > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] rounded border border-red-500/10 font-bold">
                                        {financialVault.outstanding > 1000000 ? 'عالي' : 'متوسط'}
                                    </span>
                                )}
                             </div>
                             <p className={`text-xl font-bold font-mono ${financialVault.outstanding > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                {financialVault.outstanding.toLocaleString()}
                             </p>
                        </div>
                    </div>
                </div>

                {/* Rush Card */}
                <div className="bg-linear-to-br from-rose-900/20 to-black border border-rose-500/20 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-rose-400 font-bold text-sm flex items-center gap-2">
                            <AlertCircle size={14} />
                            تسليمات عاجلة
                        </h3>
                        <span className="text-[9px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-white/5">
                            60 يوم من الاختيار
                        </span>
                    </div>

                    <div className="space-y-2">
                        {bookings
                            .filter(b => b.isPriority || b.actualSelectionDate)
                            .map(b => {
                                let daysLeft = 999;
                                if (b.actualSelectionDate) {
                                    const selDate = new Date(b.actualSelectionDate!);
                                    const deadline = new Date(selDate);
                                    deadline.setDate(deadline.getDate() + 60);
                                    daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                }
                                return { ...b, daysLeft };
                            })
                            .filter(b => b.isPriority || b.daysLeft <= 10)
                            .sort((a, b) => {
                                if (a.isPriority && !b.isPriority) return -1;
                                if (!a.isPriority && b.isPriority) return 1;
                                return a.daysLeft - b.daysLeft;
                            })
                            .slice(0, 4)
                            .map((b, i) => (
                            <motion.div
                                key={b.id}
                                animate={(b.isPriority || b.daysLeft <= 7) ? { x: [-1, 1, -1, 1, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 0.4 }}
                                className={`flex items-center justify-between p-2.5 rounded-lg border ${
                                    b.isPriority ? 'bg-orange-500/10 border-orange-500/30' :
                                    b.daysLeft <= 3 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.03] border-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                   <span className={`text-[10px] font-bold text-white w-5 h-5 flex items-center justify-center rounded-full shadow-lg ${
                                       b.isPriority ? 'bg-orange-500' : 'bg-rose-500'
                                   }`}>
                                    {b.isPriority ? '⚡' : i+1}
                                   </span>
                                   <div>
                                       <p className="text-[10px] text-zinc-200 font-bold">{b.clientName}</p>
                                       <p className="text-[8px] text-zinc-500">{b.isPriority ? 'أولوية قصوى' : 'موعد التسليم'}</p>
                                   </div>
                                </div>
                                <span className={`text-[10px] font-mono font-black ${b.isPriority ? 'text-orange-400' : b.daysLeft < 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {b.isPriority ? 'عاجل' : b.daysLeft < 0 ? `متأخر ${Math.abs(b.daysLeft)}` : `${b.daysLeft} يوم`}
                                </span>
                            </motion.div>
                        ))}

                        {bookings.filter(b => b.actualSelectionDate || b.isPriority).length === 0 && (
                            <div className="text-center py-4">
                                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-1.5 text-zinc-500">
                                    <CheckCircle2 size={14} />
                                </div>
                                <p className="text-[9px] text-zinc-600">لا توجد تسليمات عاجلة</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default AdminGeniusDashboard;
