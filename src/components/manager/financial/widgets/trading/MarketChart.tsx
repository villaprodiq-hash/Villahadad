import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Maximize2, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MarketChartProps {
  data: any[];
  selectedAsset: string;
}

const MarketChart: React.FC<MarketChartProps> = ({ data, selectedAsset }) => {
  const [timeframe, setTimeframe] = useState<'1H' | '1D' | '1W' | '1M' | '1Y'>('1M');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e2026] border border-gray-700/50 rounded-lg p-3 shadow-2xl min-w-[180px]">
          <p className="text-gray-400 text-[10px] font-mono mb-2">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-gray-300">Volume</span>
            <span className="text-sm font-black text-[#0ecb81] font-mono">
              ${payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-xs font-bold text-gray-300">Count</span>
            <span className="text-xs font-mono text-white">
              {payload[0].payload.count} trades
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#161a1e] rounded-xl border border-gray-800 overflow-hidden relative">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161a1e]">
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                 <h3 className="text-lg font-black text-white flex items-center gap-2 font-mono">
                    {selectedAsset}/USD
                 </h3>
                 <span className="text-xs font-bold text-[#0ecb81] bg-[#0ecb81]/10 px-1.5 py-0.5 rounded">
                    +2.4%
                 </span>
             </div>
             <div className="hidden md:flex bg-black/20 rounded-lg p-0.5">
                 {['1H', '1D', '1W', '1M', '1Y'].map((t) => (
                     <button
                        key={t}
                        onClick={() => setTimeframe(t as any)}
                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${timeframe === t ? 'bg-[#2b3139] text-[#f0b90b]' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        {t}
                     </button>
                 ))}
             </div>
         </div>
         <div className="flex items-center gap-2 text-gray-500">
             <BarChart2 size={16} className="hover:text-white cursor-pointer"/>
             <Maximize2 size={16} className="hover:text-white cursor-pointer"/>
         </div>
      </div>

      {/* Main Chart */}
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ecb81" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ecb81" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2b3139" />
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#848e9c', fontSize: 10, fontFamily: 'monospace' }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#848e9c', fontSize: 10, fontFamily: 'monospace' }} 
                    tickFormatter={(value) => `${value/1000}k`}
                    orientation="right"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#848e9c', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0ecb81" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    isAnimationActive={true}
                />
            </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Current Price overlay */}
      <div className="absolute top-16 left-4 z-10 pointer-events-none">
         <div className="flex flex-col">
            <span className="text-3xl font-black text-[#0ecb81] font-mono tracking-tighter">
                ${data.length > 0 ? data[data.length-1].value.toLocaleString() : '0.00'}
            </span>
            <span className="text-xs text-gray-500 font-mono">Vol: {data.reduce((acc: number, curr: any) => acc + curr.value, 0).toLocaleString()} USD</span>
         </div>
      </div>
    </div>
  );
};

export default MarketChart;
