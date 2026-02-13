import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Calendar, ChevronDown, Download, TrendingUp } from 'lucide-react';
import { GlowCard } from './GlowCard';
import { format, startOfMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { Booking, Expense } from '../../types';

// --- Types ---
interface ChartDataPoint {
  date: string;
  revenue: number;
  bookings: number;
  expenses: number;
}

// --- Custom Components ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18181b]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-gray-400 text-xs mb-2 font-medium">
          {format(new Date(label), 'MMMM yyyy', { locale: ar })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1 last:mb-0">
            <div 
              className="w-2 h-2 rounded-full shadow-[0_0_8px]" 
              style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }} 
            />
            <span className="text-gray-300 text-sm font-medium w-16">{entry.name}:</span>
            <span className="text-white text-sm font-bold font-mono">
              {entry.name === 'الدخل' ? '$' : ''}{entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface UnifiedAnalyticsWidgetProps {
    bookings: Booking[];
    expenses: Expense[];
    isManager?: boolean;
}

const UnifiedAnalyticsWidget: React.FC<UnifiedAnalyticsWidgetProps> = ({ bookings, expenses, isManager = false }) => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'bookings'>('revenue');

  // ✅ Calculate real data from props
  const { chartData, totalRevenue, totalBookings } = useMemo(() => {
    // Group bookings by month
    const monthlyData = new Map<string, ChartDataPoint>();
    
    // Exchange rate for conversion
    const EXCHANGE_RATE = 1400;

    // Process bookings
    bookings.forEach(b => {
      if (!b.shootDate) return;
      
      try {
        const monthKey = format(startOfMonth(parseISO(b.shootDate)), 'yyyy-MM-dd');
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { date: monthKey, revenue: 0, bookings: 0, expenses: 0 });
        }
        
        const entry = monthlyData.get(monthKey)!;
        entry.bookings += 1;
        
        // ✅ CRITICAL: Use paidAmount (actual collected revenue)
        const paidUSD = b.currency === 'USD' ? (b.paidAmount || 0) : (b.paidAmount || 0) / EXCHANGE_RATE;
        entry.revenue += paidUSD;
      } catch (error) {
        console.warn('Invalid date for booking:', b.id, b.shootDate);
      }
    });

    // Process expenses
    expenses.forEach(e => {
      if (!e.date) return;
      
      try {
        const monthKey = format(startOfMonth(parseISO(e.date)), 'yyyy-MM-dd');
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { date: monthKey, revenue: 0, bookings: 0, expenses: 0 });
        }
        
        const entry = monthlyData.get(monthKey)!;
        const expenseUSD = e.currency === 'USD' ? e.amount : e.amount / EXCHANGE_RATE;
        entry.expenses += expenseUSD;
      } catch (error) {
        console.warn('Invalid date for expense:', e.id, e.date);
      }
    });

    // Convert to array and sort
    const chartData = Array.from(monthlyData.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Calculate totals
    const totalRevenue = bookings.reduce((sum, b) => {
      const paidUSD = b.currency === 'USD' ? (b.paidAmount || 0) : (b.paidAmount || 0) / EXCHANGE_RATE;
      return sum + paidUSD;
    }, 0);
    
    const totalBookings = bookings.length;

    return { chartData, totalRevenue, totalBookings };
  }, [bookings, expenses]);

  const colors = {
    revenue: { stroke: '#C94557', fill: '#C94557' },
    bookings: { stroke: '#3b82f6', fill: '#3b82f6' },
    expenses: { stroke: '#eab308', fill: '#eab308' },
  };

  const activeColor = activeTab === 'revenue' ? colors.revenue : colors.bookings;

  return (
    <GlowCard className="h-full flex flex-col p-6 relative overflow-hidden">
      
      {/* Header - Compact & Streamlined */}
      <div className="flex items-center justify-between gap-4 mb-4 z-10">
        <div className="flex items-center gap-3">
          <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
             activeTab === 'revenue' ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-500'
          )}>
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">
              تحليل الأداء
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Compact Tab Switcher */}
           <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
             <button 
               onClick={() => setActiveTab('revenue')}
               className={cn(
                 "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                 activeTab === 'revenue' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
               )}
             >
               الدخل
             </button>
             <button 
               onClick={() => setActiveTab('bookings')}
               className={cn(
                 "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                 activeTab === 'bookings' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
               )}
             >
               العدد
             </button>
           </div>

           <div className="flex gap-1">
              <button className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-amber-400 transition-all">
                 <Calendar size={14} />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-blue-400 transition-all">
                 <Download size={14} />
              </button>
           </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[300px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeColor.fill} stopOpacity={0.4} />
                <stop offset="95%" stopColor={activeColor.fill} stopOpacity={0} />
              </linearGradient>
              
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.expenses.fill} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colors.expenses.fill} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />

            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#52525b', fontSize: 11, fontWeight: 500 }} 
              tickFormatter={(str) => format(new Date(str), 'MMM', { locale: ar })}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#52525b', fontSize: 11, fontWeight: 500 }} 
              tickFormatter={(number) => activeTab === 'revenue' ? `${(number/1000).toFixed(0)}k` : number}
              dx={-10}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />

            {activeTab === 'revenue' && (
               <Area 
                 type="monotone" 
                 dataKey="expenses" 
                 name="المصاريف"
                 stroke={colors.expenses.stroke} 
                 strokeWidth={2}
                 fillOpacity={1} 
                 fill="url(#colorExpenses)" 
                 strokeDasharray="4 4"
               />
            )}

            <Area 
              type="monotone" 
              dataKey={activeTab} 
              name={activeTab === 'revenue' ? 'الدخل' : 'العدد'}
              stroke={activeColor.stroke} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMain)" 
              style={{ filter: `drop-shadow(0px 0px 8px ${activeColor.stroke}80)` }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer - ✅ REAL CALCULATED DATA */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 z-10">
        <div className="flex items-center gap-4">
           <div>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider block">الإجمالي</span>
              <span className="text-white text-lg font-bold font-mono">
                {activeTab === 'revenue' 
                  ? `$${totalRevenue.toLocaleString()}` 
                  : totalBookings.toLocaleString()}
              </span>
           </div>
        </div>
        
        <button className="text-xs text-rose-400 hover:text-white transition-colors flex items-center gap-1 font-medium">
           عرض التقرير الكامل <ChevronDown size={14} className="-rotate-90"/>
        </button>
      </div>

      <div className={`
         absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br 
         ${activeTab === 'revenue' ? 'from-rose-500/10' : 'from-blue-500/10'} 
         to-transparent rounded-full blur-3xl pointer-events-none transition-colors duration-700
      `} />

    </GlowCard>
  );
};

export default UnifiedAnalyticsWidget;