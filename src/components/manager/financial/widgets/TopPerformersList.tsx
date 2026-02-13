import React from 'react';
import { Trophy, TrendingUp, DollarSign, Camera, Video, Music } from 'lucide-react';

interface TopPerformerProps {
    data: {
        rank: number;
        name: string;
        category: string;
        revenue: number;
        count: number;
        trend: number[];
    }[];
    exchangeRate?: number;
}

const TopPerformersList: React.FC<TopPerformerProps> = ({ data, exchangeRate = 1 }) => {
    return (
        <div className="bg-white dark:bg-[#1a1c22] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Trophy size={16} />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white">Top Performers</h3>
                </div>
                <button className="text-xs text-amber-500 font-bold hover:underline">View All</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 text-[10px] items-center font-bold text-gray-400 pb-2 px-2 border-b border-gray-100 dark:border-white/5 uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Service / Product</div>
                    <div className="col-span-3 text-right">Revenue</div>
                    <div className="col-span-3 text-right">Trend</div>
                </div>

                {data.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-center p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                        <div className="col-span-1 font-black text-gray-500 dark:text-gray-400">{item.rank}</div>
                        
                        <div className="col-span-5 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-500' : idx === 2 ? 'bg-orange-700' : 'bg-gray-800'
                            }`}>
                                {item.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                <p className="text-[10px] text-gray-400 truncate">{item.category} • {item.count} Bookings</p>
                            </div>
                        </div>

                        <div className="col-span-3 text-right">
                            <p className="text-xs font-black text-gray-900 dark:text-white">{(item.revenue).toLocaleString()}</p>
                            <p className="text-[9px] text-emerald-500 font-bold">IQD</p>
                        </div>

                        <div className="col-span-3 flex justify-end">
                            <div className="w-16 h-8">
                                <svg viewBox="0 0 50 20" className="w-full h-full">
                                     <path 
                                        d={`M 0,${20 - (item.trend[0] || 0)} ${item.trend.map((d, i) => `L ${(i / (item.trend.length - 1)) * 50},${20 - d}`).join(' ')}`}
                                        fill="none"
                                        stroke={idx < 3 ? '#f59e0b' : '#10b981'}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                     />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopPerformersList;
