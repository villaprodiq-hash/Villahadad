import React, { useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle 
} from 'lucide-react';
import { Booking, Expense } from '../../../../types';

interface FinancialHealthWidgetProps {
    bookings: Booking[];
    expenses: Expense[];
}

const FinancialHealthWidget: React.FC<FinancialHealthWidgetProps> = ({ bookings, expenses }) => {
    
    // 1. Calculate Totals (Normalized to IQD for standard calculation, but we keep USD separate for display)
    const stats = useMemo(() => {
        let totalRevenueIQD = 0;
        let totalRevenueUSD = 0;

        // Only count active (non-deleted) bookings
        const activeBookings = bookings.filter(b => !b.deletedAt);

        // ✅ CRITICAL FIX: Use paidAmount (actual collected revenue) NOT totalAmount (projected booking value)
        activeBookings.forEach(b => {
            const paid = b.paidAmount || 0;
            if (b.currency === 'IQD') totalRevenueIQD += paid;
            else totalRevenueUSD += paid;
        });

        let totalExpensesIQD = 0;
        let totalExpensesUSD = 0;

        expenses.forEach(e => {
            if (e.currency === 'IQD') totalExpensesIQD += e.amount;
            else totalExpensesUSD += e.amount;
        });

        // Net Profit - USD and IQD completely separate, NO conversion
        const netProfitIQD = totalRevenueIQD - totalExpensesIQD;
        const netProfitUSD = totalRevenueUSD - totalExpensesUSD;

        // Profit margin per currency (no mixing)
        const profitMarginUSD = totalRevenueUSD > 0
            ? (netProfitUSD / totalRevenueUSD) * 100
            : 0;
        const profitMarginIQD = totalRevenueIQD > 0
            ? (netProfitIQD / totalRevenueIQD) * 100
            : 0;

        // Use the currency with more revenue for the health indicator
        const profitMargin = totalRevenueUSD > 0 && totalRevenueIQD > 0
            ? Math.min(profitMarginUSD, profitMarginIQD) // worst of both
            : totalRevenueUSD > 0 ? profitMarginUSD : profitMarginIQD;

        return {
            netProfitIQD,
            netProfitUSD,
            profitMargin,
            profitMarginUSD,
            profitMarginIQD,
        };
    }, [bookings, expenses]);

    // Format Helpers
    const formatIQD = (n: number) => n.toLocaleString();
    const formatUSD = (n: number) => n.toLocaleString();

    // Determine Health Status
    const getHealthColor = (margin: number) => {
        if (margin >= 40) return 'text-emerald-500 bg-emerald-50 border-emerald-100'; // Healthy
        if (margin >= 15) return 'text-amber-500 bg-amber-50 border-amber-100';   // Warning
        return 'text-rose-500 bg-rose-50 border-rose-100';       // Danger
    };
    
    const healthStatus = getHealthColor(stats.profitMargin);
    const healthText = stats.profitMargin >= 40 ? 'ممتاز' : stats.profitMargin >= 15 ? 'متوسط' : 'خطر';

    return (
        <div className="bg-white rounded-3xl  shadow-sm p-6 h-full flex flex-col justify-between relative overflow-hidden">
             
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-32 h-32 bg-gray-50 rounded-br-full -mt-10 -ml-10 opacity-50"></div>

             <div className="flex justify-between items-start relative z-10 mb-4">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Activity className={stats.profitMargin >= 0 ? "text-emerald-500" : "text-rose-500"} size={20} />
                        صحة الأرباح
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">صافي الربح (الإيرادات - المصروفات)</p>
                 </div>
                 
                 <div className={`px-3 py-1 rounded-full border text-xs font-black flex items-center gap-1 ${healthStatus}`}>
                     {stats.profitMargin >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                     {stats.profitMargin.toFixed(1)}% ({healthText})
                 </div>
             </div>

             {/* Main Numbers */}
             <div className="space-y-4 relative z-10">
                 {/* USD Profit */}
                 <div className="bg-gray-50 rounded-2xl p-4  flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                             <DollarSign size={20} />
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-gray-400 uppercase">صافي الربح (USD)</p>
                             <h4 className={`text-2xl font-black ${stats.netProfitUSD >= 0 ? 'text-gray-800' : 'text-rose-500'}`}>
                                 ${formatUSD(stats.netProfitUSD)}
                             </h4>
                         </div>
                     </div>
                     {stats.netProfitUSD < 0 && <AlertCircle size={18} className="text-rose-400" />}
                 </div>

                 {/* IQD Profit */}
                 <div className="bg-gray-50 rounded-2xl p-4  flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                             د.ع
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-gray-400 uppercase">صافي الربح (IQD)</p>
                             <h4 className={`text-2xl font-black ${stats.netProfitIQD >= 0 ? 'text-gray-800' : 'text-rose-500'}`}>
                                 {formatIQD(stats.netProfitIQD)}
                             </h4>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Footer Info */}
             <div className="mt-4 pt-4 border-t  text-center">
                 <p className="text-[10px] text-gray-400">
                     يتم حساب نسبة هامش الربح بناءً على القيمة التقديرية الموحدة
                 </p>
             </div>
        </div>
    );
};

export default FinancialHealthWidget;
