import React, { useMemo } from 'react';
import { DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { Booking } from '../../../../types';
import { GlowCard } from '../../../shared/GlowCard';

interface FinancialUnifiedStatsWidgetProps {
  bookings: Booking[];
}

const FinancialUnifiedStatsWidget: React.FC<FinancialUnifiedStatsWidgetProps> = ({ bookings }) => {
  const stats = useMemo(() => {
    const usd = { revenue: 0, collected: 0, outstanding: 0, baseTotal: 0, extraTotal: 0 };
    const iqd = { revenue: 0, collected: 0, outstanding: 0, baseTotal: 0, extraTotal: 0 };

    // Only count active (non-deleted) bookings
    const activeBookings = bookings.filter(b => !b.deletedAt);

    activeBookings.forEach(b => {
        const target = b.currency === 'USD' ? usd : iqd;
        target.revenue += b.totalAmount;
        target.collected += b.paidAmount;
        target.outstanding += (b.totalAmount - b.paidAmount);
        
        // حساب البنود الإضافية — group by item's own currency
        const extraItems = b.details?.extraItems || [];
        extraItems.forEach(item => {
            const itemCurrency = item.currency || b.currency;
            const itemTarget = itemCurrency === 'USD' ? usd : iqd;
            itemTarget.extraTotal += (item.amount || 0);
        });
        const sameExtras = extraItems.filter(i => (i.currency || b.currency) === b.currency).reduce((s, i) => s + (i.amount || 0), 0);
        target.baseTotal += (b.totalAmount - sameExtras);
    });

    return { usd, iqd };
  }, [bookings]);

  return (
    <GlowCard variant="light" className="p-6 h-full flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 z-10 relative">
         <h3 className="font-bold text-gray-800 flex items-center gap-2">
             <span className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
               <TrendingUp size={16} />
             </span>
             ملخص الإيرادات
         </h3>
      </div>

      <div className="flex flex-col gap-6 relative z-10 h-full justify-around">
          {/* USD Section */}
          <div className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm group-hover:scale-105 transition-transform">
                      <DollarSign size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">الدولار الأمريكي</p>
                      <h4 className="text-2xl font-black text-gray-900">${stats.usd.revenue.toLocaleString()}</h4>
                  </div>
              </div>
              <div className="text-left space-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-gray-400 font-bold">محصل:</span>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">${stats.usd.collected.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-gray-400 font-bold">ديون:</span>
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">${stats.usd.outstanding.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-gray-400 font-bold">الباقة:</span>
                      <span className="text-xs font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">${stats.usd.baseTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-gray-400 font-bold">إضافي:</span>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">${stats.usd.extraTotal.toLocaleString()}</span>
                  </div>
              </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-linear-to-r from-transparent via-gray-200 to-transparent w-full" />

          {/* IQD Section */}
          <div className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                      <Wallet size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">الدينار العراقي</p>
                      <h4 className="text-2xl font-black text-gray-900">{stats.iqd.revenue.toLocaleString()}</h4>
                  </div>
              </div>
              <div className="text-left space-y-1">
                   <div className="flex items-center gap-1.5 justify-end">
                       <span className="text-[10px] text-gray-400 font-bold">محصل:</span>
                       <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{stats.iqd.collected.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-1.5 justify-end">
                       <span className="text-[10px] text-gray-400 font-bold">ديون:</span>
                       <span className="text-xs font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">{stats.iqd.outstanding.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-1.5 justify-end">
                       <span className="text-[10px] text-gray-400 font-bold">الباقة:</span>
                       <span className="text-xs font-bold text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{stats.iqd.baseTotal.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center gap-1.5 justify-end">
                       <span className="text-[10px] text-gray-400 font-bold">إضافي:</span>
                       <span className="text-xs font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{stats.iqd.extraTotal.toLocaleString()}</span>
                   </div>
              </div>
          </div>
      </div>
      
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -mt-10 -mr-10 opacity-50 z-0"></div>
    </GlowCard>
  );
};

export default FinancialUnifiedStatsWidget;
