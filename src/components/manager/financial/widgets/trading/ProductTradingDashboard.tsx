import React, { useState, useMemo } from 'react';
import { Booking, Expense, PACKAGES_DATA } from '../../../../../types';
import {
  Users, Globe, Package, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Activity,
  BarChart3, Printer, Table2
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import AnalyticsAreaChart from './view/AnalyticsAreaChart';
import { cn } from '../../../../../lib/utils';

interface ProductTradingDashboardProps {
    bookings: Booking[];
    expenses?: Expense[];
    onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
    onAddExpense?: (...args: unknown[]) => void;
    onDeleteExpense?: (...args: unknown[]) => void;
}

// --- UTILS ---
const formatNum = (amount: number) => amount.toLocaleString('en-US');

const ProductTradingDashboard: React.FC<ProductTradingDashboardProps> = ({ bookings = [] }) => {
    const [timeFilter, setTimeFilter] = useState<'1d' | '7d' | '1m' | '3m' | '1y'>('1m');
    const [viewMode, setViewMode] = useState<'TABLE' | 'CHART'>('TABLE');
    const [groupBy, setGroupBy] = useState<'PRODUCT' | 'SOURCE' | 'STAFF'>('PRODUCT');

    // --- 1. DATE LOGIC & FILTERING ---
    const { filteredBookings, previousBookings, dateRangeLabel } = useMemo(() => {
        const now = new Date();
        let startDate = subDays(now, 30); // Default 1m
        let prevStartDate = subDays(now, 60);

        if (timeFilter === '1d') {
            startDate = startOfDay(now);
            prevStartDate = subDays(startOfDay(now), 1);
        } else if (timeFilter === '7d') {
            startDate = subDays(now, 7);
            prevStartDate = subDays(now, 14);
        } else if (timeFilter === '3m') {
            startDate = subDays(now, 90);
            prevStartDate = subDays(now, 180);
        } else if (timeFilter === '1y') {
            startDate = subDays(now, 365);
            prevStartDate = subDays(now, 730);
        }

        const current = bookings.filter(b => {
             if (!b.shootDate) return false;
             return new Date(b.shootDate) >= startDate;
        });

        const previous = bookings.filter(b => {
            if (!b.shootDate) return false;
            const d = new Date(b.shootDate);
            return d >= prevStartDate && d < startDate;
        });

        return { 
            filteredBookings: current, 
            previousBookings: previous,
            dateRangeLabel: `${format(startDate, 'd MMM', { locale: ar })} - ${format(now, 'd MMM', { locale: ar })}`
        };
    }, [bookings, timeFilter]);

    // --- 2. KPIs COMPILATION (USD and IQD separated) ---
    const stats = useMemo(() => {
        let revenueUSD = 0, revenueIQD = 0;
        filteredBookings.forEach(b => {
            if (b.currency === 'USD') revenueUSD += (b.paidAmount || 0);
            else revenueIQD += (b.paidAmount || 0);
            // ✅ Include cross-currency add-ons
            if (b.addOnTotal && b.addOnTotal > 0) {
                if (b.currency === 'USD') revenueIQD += b.addOnTotal; // USD booking → IQD add-on
                else revenueUSD += b.addOnTotal; // IQD booking → USD add-on
            }
        });
        const count = filteredBookings.length;

        let prevRevenueUSD = 0, prevRevenueIQD = 0;
        previousBookings.forEach(b => {
            if (b.currency === 'USD') prevRevenueUSD += (b.paidAmount || 0);
            else prevRevenueIQD += (b.paidAmount || 0);
            if (b.addOnTotal && b.addOnTotal > 0) {
                if (b.currency === 'USD') prevRevenueIQD += b.addOnTotal;
                else prevRevenueUSD += b.addOnTotal;
            }
        });
        const prevCount = previousBookings.length;

        const revenueGrowthUSD = prevRevenueUSD > 0 ? ((revenueUSD - prevRevenueUSD) / prevRevenueUSD) * 100 : 0;
        const revenueGrowthIQD = prevRevenueIQD > 0 ? ((revenueIQD - prevRevenueIQD) / prevRevenueIQD) * 100 : 0;
        const countGrowth = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0;

        return {
            revenueUSD, revenueIQD,
            revenueGrowthUSD, revenueGrowthIQD,
            count, countGrowth,
        };
    }, [filteredBookings, previousBookings]);

    // --- 3. GROUPED DATA (TABLE) --- USD and IQD separated
    const tableData = useMemo(() => {
        const groups: Record<string, {
            id: string,
            title: string,
            subtitle: string,
            revenueUSD: number,
            revenueIQD: number,
            count: number,
            prevRevenueUSD: number,
            prevRevenueIQD: number
        }> = {};

        const getGroupKey = (b: Booking) => {
            if (groupBy === 'PRODUCT') return b.servicePackage || b.category || 'unknown';
            if (groupBy === 'SOURCE') return b.source || 'manual';
            return b.receivedBy || b.created_by || 'system';
        };

        const getMetadata = (key: string, b: Booking) => {
            if (groupBy === 'PRODUCT') {
                const pkg = PACKAGES_DATA.find(p => p.id === key);
                return {
                    title: pkg?.title || b.category || 'خدمة مخصصة',
                    subtitle: pkg?.categoryId || 'عام'
                };
            }
            if (groupBy === 'SOURCE') {
                return {
                    title: key === 'website' ? 'الموقع الإلكتروني' : 'إدخال يدوي',
                    subtitle: key.toUpperCase()
                };
            }
            return {
                title: key === 'system' ? 'النظام' : key,
                subtitle: 'موظف'
            };
        };

        filteredBookings.forEach(b => {
            const key = getGroupKey(b);
            if (!groups[key]) {
                 const meta = getMetadata(key, b);
                 groups[key] = { id: key, ...meta, revenueUSD: 0, revenueIQD: 0, count: 0, prevRevenueUSD: 0, prevRevenueIQD: 0 };
            }
            if (b.currency === 'USD') groups[key].revenueUSD += (b.paidAmount || 0);
            else groups[key].revenueIQD += (b.paidAmount || 0);
            // ✅ Include cross-currency add-ons
            if (b.addOnTotal && b.addOnTotal > 0) {
                if (b.currency === 'USD') groups[key].revenueIQD += b.addOnTotal;
                else groups[key].revenueUSD += b.addOnTotal;
            }
            groups[key].count += 1;
        });

        previousBookings.forEach(b => {
             const key = getGroupKey(b);
             if (groups[key]) {
                 if (b.currency === 'USD') groups[key].prevRevenueUSD += (b.paidAmount || 0);
                 else groups[key].prevRevenueIQD += (b.paidAmount || 0);
             }
        });

        return Object.values(groups)
            .sort((a, b) => (b.revenueUSD + b.revenueIQD) - (a.revenueUSD + a.revenueIQD))
            .map((item, index) => ({
                ...item,
                rank: index + 1,
                growthUSD: item.prevRevenueUSD > 0 ? ((item.revenueUSD - item.prevRevenueUSD) / item.prevRevenueUSD) * 100 : 0,
                growthIQD: item.prevRevenueIQD > 0 ? ((item.revenueIQD - item.prevRevenueIQD) / item.prevRevenueIQD) * 100 : 0,
            }));

    }, [filteredBookings, previousBookings, groupBy]);

    // --- 4. CHART DATA (USD only for chart - single currency) ---
    const chartData = useMemo(() => {
        const mapUSD: Record<string, number> = {};
        const mapIQD: Record<string, number> = {};
        filteredBookings.forEach(b => {
             if (!b.shootDate) return;
             const d = b.shootDate.slice(0, 10);
             if (b.currency === 'USD') mapUSD[d] = (mapUSD[d] || 0) + (b.paidAmount || 0);
             else mapIQD[d] = (mapIQD[d] || 0) + (b.paidAmount || 0);
        });

        // Use whichever currency has more data for the chart
        const useMap = Object.keys(mapUSD).length >= Object.keys(mapIQD).length ? mapUSD : mapIQD;
        return Object.entries(useMap)
            .sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, value]) => ({ date, close: value }));
    }, [filteredBookings]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#09090b] text-gray-900 dark:text-gray-100 overflow-hidden font-sans relative transition-colors duration-300" dir="rtl">
            
            {/* --- TOP TOOLBAR --- */}
            <div className="bg-white dark:bg-[#18181b] border-b border-gray-200 dark:border-white/5 py-3 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
                
                {/* Left: Title & Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                             <Activity size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">التقرير المالي</h2>
                            <p className="text-[10px] text-gray-500 font-medium">تحديث مباشر</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>

                    {/* Time Tabs (Compact) */}
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        {(['1d', '7d', '1m', '3m', '1y'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeFilter(t)}
                                className={cn(
                                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                                    timeFilter === t 
                                        ? "bg-white dark:bg-[#27272a] shadow-sm text-gray-900 dark:text-white" 
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                {t === '1d' ? 'يوم' : t === '7d' ? 'أسبوع' : t === '1m' ? 'شهر' : t === '3m' ? '3 أشهر' : 'سنة'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-500 ml-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5">
                        {dateRangeLabel}
                     </span>
                     <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#27272a] hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-lg transition-all text-xs font-bold shadow-sm"
                     >
                        <Printer size={14} /> طباعة
                     </button>
                </div>
            </div>

            {/* --- MAIN LAYOUT --- */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
                
                {/* --- LEFT SIDEBAR (KPIs) --- */}
                <div className="w-full md:w-[260px] bg-white dark:bg-[#121214] border-l border-gray-200 dark:border-white/5 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 z-10 shadow-xl md:shadow-none">
                    
                    {/* KPI 1: REVENUE USD */}
                    <div
                        data-testid="total-revenue-card"
                        className="bg-gray-50 dark:bg-[#1a1c22] border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-1 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
                    >
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">إيرادات ($)</span>
                             <div className={cn("p-1.5 rounded-full", stats.revenueGrowthUSD >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                                <DollarSign size={12} />
                             </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                ${formatNum(stats.revenueUSD)}
                            </span>
                        </div>
                        {stats.revenueGrowthUSD !== 0 && (
                        <div className={cn("text-[10px] flex items-center gap-1 font-bold mt-1", stats.revenueGrowthUSD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                             {stats.revenueGrowthUSD >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                             {Math.abs(stats.revenueGrowthUSD).toFixed(1)}%
                        </div>
                        )}
                    </div>

                    {/* KPI 2: REVENUE IQD */}
                    <div className="bg-gray-50 dark:bg-[#1a1c22] border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-1 hover:border-amber-500/30 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">إيرادات (د.ع)</span>
                             <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-600">
                                <DollarSign size={12} />
                             </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                {formatNum(stats.revenueIQD)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">د.ع</span>
                        </div>
                        {stats.revenueGrowthIQD !== 0 && (
                        <div className={cn("text-[10px] flex items-center gap-1 font-bold mt-1", stats.revenueGrowthIQD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                             {stats.revenueGrowthIQD >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                             {Math.abs(stats.revenueGrowthIQD).toFixed(1)}%
                        </div>
                        )}
                    </div>

                    {/* KPI 3: COUNT */}
                    <div className="bg-gray-50 dark:bg-[#1a1c22] border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-1 hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">عدد الحجوزات</span>
                             <div className={cn("p-1.5 rounded-full bg-blue-500/10 text-blue-600")}>
                                <Calendar size={12} />
                             </div>
                        </div>
                        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {stats.count}
                        </span>
                        <div className={cn("text-[10px] flex items-center gap-1 font-bold mt-2", stats.countGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                             {stats.countGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                             {Math.abs(stats.countGrowth).toFixed(1)}%
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-white/5 my-2"></div>

                     {/* GROUP BY CONTROL */}
                     <div className="flex flex-col gap-2">
                         <span className="text-[10px] text-gray-500 font-bold uppercase px-1">تجميع حسب</span>
                         <div className="flex flex-col gap-1">
                            {[
                                { id: 'PRODUCT', icon: Package, label: 'الباقات والخدمات' },
                                { id: 'SOURCE', icon: Globe, label: 'مصدر الحجز' },
                                { id: 'STAFF', icon: Users, label: 'آداء الموظفين' }
                            ].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setGroupBy(g.id as 'PRODUCT' | 'SOURCE' | 'STAFF')}
                                    className={cn(
                                        "py-2 px-3 text-[11px] font-bold rounded-xl transition-all text-right flex items-center gap-3",
                                        groupBy === g.id
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-black shadow-md" 
                                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    <g.icon size={14} />
                                    {g.label}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                {/* --- RIGHT CONTENT (TABLE/CHART) --- */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0c0d10] min-h-0 pl-1">
                    
                    {/* View Toolbar */}
                    <div className="p-3 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-[#121214]/50 backdrop-blur-sm sticky top-0 z-10">
                         <div className="flex gap-1 bg-gray-200 dark:bg-white/10 p-1 rounded-lg">
                             <button
                                onClick={() => setViewMode('TABLE')}
                                className={cn("px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all", viewMode === 'TABLE' ? "bg-white dark:bg-[#1a1c22] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900")}
                             >
                                 <Table2 size={14} /> جدول
                             </button>
                             <button
                                onClick={() => setViewMode('CHART')}
                                className={cn("px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all", viewMode === 'CHART' ? "bg-white dark:bg-[#1a1c22] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900")}
                             >
                                 <BarChart3 size={14} /> رسم بياني
                             </button>
                         </div>
                    </div>

                    <div className="flex-1 overflow-auto min-h-0 relative">
                        {viewMode === 'TABLE' ? (
                            <table className="w-full text-right border-collapse">
                                <thead className="sticky top-0 bg-gray-50/95 dark:bg-[#121214]/95 backdrop-blur-sm z-10 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-center w-12">#</th>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-right">الاسم / الفئة</th>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">العدد</th>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">إيرادات ($)</th>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">إيرادات (د.ع)</th>
                                        <th className="py-3 px-4 font-bold border-b border-gray-100 dark:border-white/5 text-center">النمو</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {tableData.length > 0 ? (
                                        tableData.map(item => (
                                            <tr key={item.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="py-3 px-4 text-center text-gray-400 font-bold">{item.rank}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-gray-200">{item.title}</span>
                                                        <span className="text-[10px] text-gray-500">{item.subtitle}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400 font-bold tabular-nums">
                                                    {item.count}
                                                </td>
                                                <td className="py-3 px-4 text-center font-black text-gray-900 dark:text-white tabular-nums">
                                                    {item.revenueUSD > 0 ? `$${formatNum(item.revenueUSD)}` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-center font-black text-gray-900 dark:text-white tabular-nums">
                                                    {item.revenueIQD > 0 ? `${formatNum(item.revenueIQD)} د.ع` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {(item.growthUSD !== 0 || item.growthIQD !== 0) ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {item.growthUSD !== 0 && (
                                                                <span className={cn("inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[10px]",
                                                                    item.growthUSD > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                                                                    {item.growthUSD > 0 ? "+" : ""}{item.growthUSD.toFixed(1)}% $
                                                                </span>
                                                            )}
                                                            {item.growthIQD !== 0 && (
                                                                <span className={cn("inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[10px]",
                                                                    item.growthIQD > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                                                                    {item.growthIQD > 0 ? "+" : ""}{item.growthIQD.toFixed(1)}% د.ع
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                                                لا توجد بيانات للفترة المحددة
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full w-full p-6">
                                <AnalyticsAreaChart data={chartData} color="#10b981" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTradingDashboard;
