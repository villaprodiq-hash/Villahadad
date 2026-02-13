import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface TradingStatCardProps {
    title: string;
    value: string | number;
    subvalue?: string;
    trend?: number; // percentage
    icon?: React.ReactNode;
    color?: 'amber' | 'blue' | 'purple' | 'emerald';
    chartData?: number[]; // For mini sparkline
}

const TradingStatCard: React.FC<TradingStatCardProps> = ({ title, value, subvalue, trend, icon, color = 'amber', chartData = [] }) => {
    // Colors
    const colors = {
        amber: 'bg-amber-500 text-amber-500',
        blue: 'bg-blue-500 text-blue-500',
        purple: 'bg-purple-500 text-purple-500',
        emerald: 'bg-emerald-500 text-emerald-500'
    };

    return (
        <div className="bg-white dark:bg-[#1a1c22] p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
             {/* Background glow */}
             <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-3xl ${colors[color].split(' ')[0]}`} />
             
             <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 ${colors[color].split(' ')[1]}`}>
                         {icon}
                     </div>
                     <div>
                         <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider">{title}</h3>
                         {subvalue && <p className="text-gray-400 text-[10px] font-bold">{subvalue}</p>}
                     </div>
                 </div>
                 {trend !== undefined && (
                     <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500'}`}>
                         {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                         {Math.abs(trend)}%
                     </div>
                 )}
             </div>

             <div className="flex items-end justify-between">
                 <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</h2>
                 
                 {/* Mini Sparkline SVG */}
                 <div className="w-20 h-10">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                        <path 
                            d={`M 0,${50 - (chartData[0] || 0)} ${chartData.map((d, i) => `L ${(i / (chartData.length - 1)) * 100},${50 - d}`).join(' ')}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={colors[color].split(' ')[1]} // Use text color class for stroke
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                 </div>
             </div>
        </div>
    );
};

export default TradingStatCard;
