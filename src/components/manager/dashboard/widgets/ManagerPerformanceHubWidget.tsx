import React, { useState } from 'react';
import { DollarSign, Wallet, TrendingUp, TrendingDown, Eye, EyeOff, Calendar, Users, CheckCircle2 } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';

interface ManagerPerformanceBooking {
  deletedAt?: number | string | null;
  shootDate?: string;
  currency?: string;
  totalAmount?: number;
  paidAmount?: number;
  status?: string;
  addOnTotal?: number;
}

const ManagerPerformanceHubWidget: React.FC<{ bookings?: ManagerPerformanceBooking[] }> = ({ bookings = [] }) => {
  const [showRevenue, setShowRevenue] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // --- Calculate real stats from bookings ---
  const stats = React.useMemo(() => {
    let totalUSD = 0, totalIQD = 0;
    let paidUSD = 0, paidIQD = 0;
    let monthUSD = 0, monthIQD = 0;
    let monthPaidUSD = 0, monthPaidIQD = 0;
    let prevMonthUSD = 0, prevMonthIQD = 0;
    let monthCount = 0, totalCount = 0;
    let completedCount = 0;

    bookings.forEach(b => {
      if (b.deletedAt) return;
      const date = b.shootDate ? new Date(b.shootDate) : null;
      if (!date || isNaN(date.getTime())) return;

      totalCount++;
      const isUSD = b.currency === 'USD';
      const amount = b.totalAmount || 0;
      const paid = b.paidAmount || 0;

      if (isUSD) { totalUSD += amount; paidUSD += paid; }
      else { totalIQD += amount; paidIQD += paid; }

      // Current month
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        monthCount++;
        if (isUSD) { monthUSD += amount; monthPaidUSD += paid; }
        else { monthIQD += amount; monthPaidIQD += paid; }
      }

      // Previous month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      if (date.getFullYear() === prevYear && date.getMonth() === prevMonth) {
        if (isUSD) prevMonthUSD += paid;
        else prevMonthIQD += paid;
      }

      // Completed
      if (b.status === 'Completed' || b.status === 'completed' || b.status === 'Delivered') {
        completedCount++;
      }

      // Include cross-currency add-ons
      if (b.addOnTotal && b.addOnTotal > 0) {
        if (isUSD) { totalIQD += b.addOnTotal; monthIQD += (date?.getMonth() === currentMonth ? b.addOnTotal : 0); }
        else { totalUSD += b.addOnTotal; monthUSD += (date?.getMonth() === currentMonth ? b.addOnTotal : 0); }
      }
    });

    const trendUSD = prevMonthUSD > 0 ? ((monthPaidUSD - prevMonthUSD) / prevMonthUSD) * 100 : 0;
    const trendIQD = prevMonthIQD > 0 ? ((monthPaidIQD - prevMonthIQD) / prevMonthIQD) * 100 : 0;
    const remainingUSD = totalUSD - paidUSD;
    const remainingIQD = totalIQD - paidIQD;
    const collectionRate = (totalUSD + totalIQD) > 0 ? Math.round(((paidUSD + paidIQD) / (totalUSD + totalIQD)) * 100) : 0;

    return {
      totalUSD, totalIQD, paidUSD, paidIQD,
      monthUSD, monthIQD, monthPaidUSD, monthPaidIQD,
      remainingUSD, remainingIQD,
      trendUSD, trendIQD,
      monthCount, totalCount, completedCount, collectionRate,
    };
  }, [bookings, currentYear, currentMonth]);

  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  return (
    <ManagerDashboardCard className="bg-[#1a1c22] text-white h-[220px] flex flex-col relative overflow-hidden" dir="rtl">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[60px] translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">الإيرادات</h3>
            <p className="text-[9px] text-gray-500">{monthNames[currentMonth]} {currentYear}</p>
          </div>
        </div>
        <button
          onClick={() => setShowRevenue(!showRevenue)}
          className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
        >
          {showRevenue ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col gap-2.5 relative z-10 transition-all duration-300 ${!showRevenue ? 'blur-md select-none pointer-events-none' : ''}`}>

        {/* USD Row */}
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign size={12} className="text-green-400" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold">دولار</p>
              <p className="text-sm font-black text-white">${stats.monthPaidUSD.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.remainingUSD > 0 && (
              <div className="text-left">
                <p className="text-[8px] text-gray-600">متبقي</p>
                <p className="text-[10px] font-bold text-rose-400">${stats.remainingUSD.toLocaleString()}</p>
              </div>
            )}
            {stats.trendUSD !== 0 && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${stats.trendUSD >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {stats.trendUSD >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(stats.trendUSD).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* IQD Row */}
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wallet size={12} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-bold">دينار</p>
              <p className="text-sm font-black text-white">{stats.monthPaidIQD.toLocaleString()} <span className="text-[9px] text-gray-500">د.ع</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.remainingIQD > 0 && (
              <div className="text-left">
                <p className="text-[8px] text-gray-600">متبقي</p>
                <p className="text-[10px] font-bold text-rose-400">{stats.remainingIQD.toLocaleString()} د.ع</p>
              </div>
            )}
            {stats.trendIQD !== 0 && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${stats.trendIQD >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {stats.trendIQD >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(stats.trendIQD).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-amber-400" />
              <span className="text-[10px] text-gray-400"><span className="font-black text-white">{stats.monthCount}</span> حجز</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={11} className="text-purple-400" />
              <span className="text-[10px] text-gray-400"><span className="font-black text-white">{stats.totalCount}</span> كلي</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span className="text-[10px] text-gray-400">تحصيل: <span className="font-black text-emerald-400">{stats.collectionRate}%</span></span>
          </div>
        </div>
      </div>
    </ManagerDashboardCard>
  );
};

export default React.memo(ManagerPerformanceHubWidget);
