import React from 'react';
import { ArrowUp } from 'lucide-react';
import Sparkline from './Sparkline';

interface HighlightItem {
    id: string;
    title: string;
    subtitle?: string; // e.g., Artist Name
    image?: string;
    value: string; // e.g. "90%"
    trend: number; // e.g., 45
    trendData: Array<{ value: number }>;
}

interface HighlightCardProps {
    title: string;
    icon?: React.ReactNode;
    items: HighlightItem[];
    accentColor: string; // e.g., #FF5722
}

const HighlightCard: React.FC<HighlightCardProps> = ({ title, icon, items, accentColor }) => {
  return (
    <div className="bg-white dark:bg-[#1a1c22] rounded-3xl p-6 flex flex-col gap-4 border border-gray-100 dark:border-white/5 shadow-sm transition-colors ring-1 ring-black/5 dark:ring-white/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg tracking-tight">{title}</h3>
            </div>
            <button className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 border border-gray-200 dark:border-white/10 px-3 py-1 rounded-full hover:bg-gray-50 dark:hover:bg-white/5">
                عرض المزيد ›
            </button>
        </div>

        {/* Items List */}
        <div className="flex flex-col gap-6">
            {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                    {/* Left: Info */}
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#222] bg-cover bg-center shrink-0 border border-gray-200 dark:border-white/5" style={{ backgroundImage: item.image ? `url(${item.image})` : undefined }} />
                        <div className="flex flex-col min-w-[120px]">
                            <span className="text-gray-900 dark:text-gray-200 font-bold text-sm truncate group-hover:text-black dark:group-hover:text-white transition-colors">{item.title}</span>
                            {item.subtitle && <span className="text-gray-500 dark:text-gray-600 text-xs truncate">{item.subtitle}</span>}
                        </div>
                    </div>

                    {/* Middle: Sparkline (Hidden on mobile) */}
                    <div className="w-24 h-8 hidden sm:block opacity-50 group-hover:opacity-100 transition-opacity" dir="ltr">
                         <Sparkline data={item.trendData} dataKey="value" color={accentColor} height={30} />
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-3 w-28 justify-end">
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                            style={{ backgroundColor: accentColor }}
                        >
                            {item.value}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#4CAF50]">
                            <ArrowUp size={10} />
                            {item.trend}%
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HighlightCard;
