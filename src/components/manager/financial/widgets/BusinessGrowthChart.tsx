import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Bar, ComposedChart, Line
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface BusinessGrowthPoint {
  date: string;
  revenue: number;
  expenses: number;
  net: number;
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

interface BusinessGrowthChartProps {
  data: BusinessGrowthPoint[];
  currency?: string;
}

const BusinessGrowthChart: React.FC<BusinessGrowthChartProps> = ({ data, currency = 'USD' }) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Custom Tooltip for Stock Market Vibe
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl border border-white/10 dark:border-amber-500/20 rounded-xl p-4 shadow-2xl min-w-[200px]">
          <p className="text-gray-400 text-xs font-mono mb-2 border-b border-white/10 pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <span className="text-xs font-bold flex items-center gap-2" style={{ color: entry.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name === 'revenue' ? 'الإيرادات' : entry.name === 'expenses' ? 'المصاريف' : 'الصافي'}
              </span>
              <span className="text-sm font-black text-white font-mono">
                {currency === 'USD' ? '$' : ''}
                {(typeof entry.value === 'number' ? entry.value : Number(entry.value || 0)).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#1a1c22] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-amber-500/10 h-[400px] flex flex-col relative overflow-hidden transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 z-10">
        <div>
           <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                   <TrendingUp className="text-emerald-500" size={20} />
                   الأداء المالي ونمو الأرباح
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                    Business Analytics
                </span>
           </div>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">تحليل مباشر لحركة الأموال والسيولة النقدية</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/5">
             <button 
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartType === 'area' ? 'bg-white dark:bg-amber-500 text-gray-900 dark:text-black shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
                منحنى (Area)
             </button>
             <button 
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartType === 'bar' ? 'bg-white dark:bg-amber-500 text-gray-900 dark:text-black shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
                أعمدة (Bars)
             </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full min-h-0 relative z-10" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" className="stroke-gray-100 dark:stroke-white/5" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--chart-text)', fontSize: 10, fontWeight: 'bold' }} 
                        className="fill-gray-400 dark:fill-gray-500"
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--chart-text)', fontSize: 10, fontWeight: 'bold' }} 
                        className="fill-gray-400 dark:fill-gray-500"
                        tickFormatter={(value) => `${value/1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="revenue"
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        name="expenses"
                        stroke="#f43f5e" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                    />
                </AreaChart>
            ) : (
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" className="stroke-gray-100 dark:stroke-white/5" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--chart-text)', fontSize: 10 }} 
                        className="fill-gray-400 dark:fill-gray-500"
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--chart-text)', fontSize: 10 }} 
                        className="fill-gray-400 dark:fill-gray-500"
                        tickFormatter={(value) => `${value/1000}k`}
                    />
                     <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                     
                     <Bar dataKey="revenue" name="revenue" barSize={20} fill="#10b981" radius={[4, 4, 0, 0]} />
                     <Bar dataKey="expenses" name="expenses" barSize={20} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                     <Line type="monotone" dataKey="net" name="net" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />

                </ComposedChart>
            )}
        </ResponsiveContainer>
      </div>

      {/* Decorative Background Elements for Premium Feel */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 dark:opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none -ml-10 -mb-10 dark:opacity-20"></div>

    </div>
  );
};

export default BusinessGrowthChart;
