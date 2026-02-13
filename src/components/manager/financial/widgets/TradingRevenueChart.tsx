import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Calendar, Maximize2, Activity } from 'lucide-react';
import { Booking } from '../../../../types';

interface TradingRevenueChartProps {
    bookings: Booking[];
    period: 'day' | 'week' | 'month' | 'year';
    exchangeRate?: number; // kept for interface compat, ignored
}

const TradingRevenueChart: React.FC<TradingRevenueChartProps> = ({ bookings, period }) => {
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);

    // Determine primary currency (whichever has more bookings)
    const primaryCurrency = useMemo(() => {
        const usdCount = bookings.filter(b => b.currency === 'USD').length;
        const iqdCount = bookings.length - usdCount;
        return usdCount >= iqdCount ? 'USD' : 'IQD';
    }, [bookings]);

    const currencySymbol = primaryCurrency === 'USD' ? '$' : 'د.ع';

    // 1. Process Data - NO conversion, show primary currency only
    const data = useMemo(() => {
        const sortedBookings = [...bookings]
            .filter(b => b.currency === primaryCurrency) // Only show primary currency
            .sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime());
        const grouped = new Map<string, number>();

        sortedBookings.forEach(b => {
            const key = new Date(b.shootDate).toISOString().split('T')[0];
            const amount = b.paidAmount || 0;
            grouped.set(key, (grouped.get(key) || 0) + amount);
        });

        return Array.from(grouped.entries()).map(([date, value]) => ({ date, value }));
    }, [bookings, primaryCurrency]);

    // 2. Chart Scaling
    const width = 800;
    const height = 300;
    const maxVal = Math.max(...data.map(d => d.value), 100);
    const minVal = 0;
    
    // Smooth line generation
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - ((d.value - minVal) / (maxVal - minVal)) * (height * 0.8) - (height * 0.1); // Padding
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `${points} L ${width},${height} L 0,${height} Z`;

    return (
        <div className="bg-white dark:bg-[#1a1c22] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                     <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-amber-500"/>
                        Revenue Analysis
                     </h3>
                     <div className="flex items-baseline gap-2 mt-1">
                         <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                            {primaryCurrency === 'USD' ? '$' : ''}{data.reduce((a, b) => a + b.value, 0).toLocaleString()}
                            <span className="text-xs text-gray-400 font-bold ml-1">{primaryCurrency === 'USD' ? 'USD' : 'د.ع'}</span>
                         </h2>
                         <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                             <ArrowUpRight size={12} />
                             +12.5%
                         </span>
                     </div>
                </div>
                
                {/* Time Filters - Visual Only for now */}
                <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                    {['1H', '1D', '1W', '1M', '1Y'].map(t => (
                        <button key={t} className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${t === '1M' ? 'bg-white dark:bg-[#1a1c22] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="relative w-full h-[300px] select-none">
                {data.length > 1 ? (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
                            <line 
                                key={i}
                                x1="0" 
                                y1={height * tick} 
                                x2={width} 
                                y2={height * tick} 
                                stroke="currentColor" 
                                className="text-gray-100 dark:text-white/5" 
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                        ))}

                        {/* Area Fill */}
                        <path d={areaPath} fill="url(#chartGradient)" />

                        {/* Main Line with Glow */}
                        <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            d={`M ${points}`} 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="3"
                            filter="url(#glow)"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Interactive Points Overlay */}
                        {data.map((d, i) => {
                             const x = (i / (data.length - 1)) * width;
                             return (
                                 <rect 
                                    key={i}
                                    x={x - (width / data.length) / 2}
                                    y={0}
                                    width={width / data.length}
                                    height={height}
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredPoint({ x, y: height - ((d.value - minVal) / (maxVal - minVal)) * (height * 0.8) - (height * 0.1), value: d.value, date: d.date })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    className="cursor-crosshair"
                                 />
                             )
                        })}
                        
                        {/* Hover Tooltip */}
                        {hoveredPoint && (
                            <g>
                                <line x1={hoveredPoint.x} y1={0} x2={hoveredPoint.x} y2={height} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
                                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" fill="#1a1c22" stroke="#f59e0b" strokeWidth="2" />
                            </g>
                        )}
                    </svg>
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">Not enough data for chart</div>
                )}
                
                {/* Floating Tooltip HTML */}
                <AnimatePresence>
                    {hoveredPoint && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none bg-gray-900 text-white dark:bg-white dark:text-gray-900 p-3 rounded-xl shadow-xl text-xs z-50 transform -translate-x-1/2"
                            style={{ left: `${(hoveredPoint.x / width) * 100}%`, top: hoveredPoint.y - 60 }}
                        >
                            <p className="font-bold opacity-60 mb-1">{hoveredPoint.date}</p>
                            <p className="font-black text-lg">{primaryCurrency === 'USD' ? '$' : ''}{hoveredPoint.value.toLocaleString()} {primaryCurrency === 'USD' ? '' : 'د.ع'}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TradingRevenueChart;
