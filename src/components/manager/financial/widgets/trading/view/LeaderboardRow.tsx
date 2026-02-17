import React from 'react';
import Sparkline from './Sparkline';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface LeaderboardItem {
    rank: number;
    id: string;
    title: string;
    subtitle: string;
    image?: string; 
    
    // Stats
    followers: number; // bookings count
    followersTrend: number;
    
    streams: number;   // revenue
    streamsTrend: number;
    
    playlists: number; // avg price
    playlistsTrend: number;
    
    charts: number;    // charts position
    chartsTrend: number;

    trendData: Array<{ value: number }>;
    hypemeter: number; // 0-100
}

interface LeaderboardRowProps {
    item: LeaderboardItem;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ item }) => {
    // Determine Hype Color
    const getHypeColor = (score: number) => {
        if (score >= 90) return '#FF5722'; // Orange
        if (score >= 80) return '#FFC107'; // Amber
        if (score >= 70) return '#8BC34A'; // Light Green
        if (score >= 50) return '#4CAF50'; // Green
        return '#607D8B'; // Grey
    };
    
    const hypeColor = getHypeColor(item.hypemeter);

    return (
        <div className="flex items-center py-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group px-4">
            {/* 1. Rank */}
            <div className="w-16 flex items-center justify-center">
                <span className="text-3xl font-black text-transparent stroke-1 stroke-gray-300 dark:stroke-gray-700 bg-clip-text transition-colors group-hover:stroke-gray-400 dark:group-hover:stroke-gray-600" 
                      style={{ WebkitTextStroke: '1px currentColor' }}>
                    {item.rank}
                </span>
            </div>

            {/* 2. Artist/Product */}
            <div className="w-[220px] flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#222] bg-cover bg-center shrink-0 border border-gray-200 dark:border-white/5 relative" 
                     style={{ backgroundImage: item.image ? `url(${item.image})` : undefined }}
                >
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-black border border-gray-200 dark:border-white/10 flex items-center justify-center">
                        <span className="text-[8px]">🎵</span> 
                    </div>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-sm truncate group-hover:text-black dark:group-hover:text-white transition-colors">{item.title}</span>
                    <span className="text-gray-500 text-xs truncate flex items-center gap-1">
                        @{item.subtitle}
                    </span>
                </div>
            </div>

            {/* 3. Stats Columns (Grid for alignment) */}
            <div className="flex-1 grid grid-cols-4 gap-4 px-4">
                {/* Followers (Count) */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{item.followers.toLocaleString()}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${item.followersTrend >= 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}`} dir="ltr">
                        {item.followersTrend > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                        {Math.abs(item.followersTrend)}%
                    </span>
                </div>

                {/* Streams (Revenue) */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{(item.streams / 1000).toFixed(0)}K</span>
                    <span className={`text-[10px] flex items-center gap-1 ${item.streamsTrend >= 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}`} dir="ltr">
                         {item.streamsTrend > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                        {Math.abs(item.streamsTrend)}K
                    </span>
                </div>

                {/* Playlists */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{item.playlists.toLocaleString()}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${item.playlistsTrend >= 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}`} dir="ltr">
                         {item.playlistsTrend > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                        {Math.abs(item.playlistsTrend)}%
                    </span>
                </div>
                 
                 {/* Charts */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-200 font-bold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{item.charts}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${item.chartsTrend >= 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}`} dir="ltr">
                         {item.chartsTrend > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                        {item.chartsTrend}
                    </span>
                </div>
            </div>

            {/* 4. Mini Chart */}
            <div className="w-[120px] h-10 px-2" dir="ltr">
                 <Sparkline 
                    data={item.trendData} 
                    dataKey="value" 
                    color={hypeColor} 
                    height={32} 
                />
            </div>

            {/* 5. Hypemeter */}
            <div className="w-20 flex justify-end">
                <span className="text-xl font-black" style={{ color: hypeColor }}>
                    {item.hypemeter}%
                </span>
            </div>
        </div>
    );
};

export default LeaderboardRow;
