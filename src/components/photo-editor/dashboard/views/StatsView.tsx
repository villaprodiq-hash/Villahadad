import React from 'react';
import { Clock, Image, TrendingUp, Award } from 'lucide-react';

const StatsView: React.FC = () => {
  const stats = {
    today: {
      imagesEdited: 45,
      timeSpent: 19800, // seconds
      albumsCompleted: 3,
      avgTimePerImage: 440 // seconds
    },
    thisWeek: {
      imagesEdited: 234,
      timeSpent: 108000,
      albumsCompleted: 12,
      avgTimePerImage: 461
    },
    thisMonth: {
      imagesEdited: 987,
      timeSpent: 453600,
      albumsCompleted: 48,
      avgTimePerImage: 459
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6">
        <div>
          <h2 className="text-white font-bold">Statistics</h2>
          <p className="text-gray-500 text-xs">Performance tracking & insights</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Today */}
        <div className="mb-6">
          <h3 className="text-white font-bold mb-3">Today</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Image size={16} className="text-blue-400" />
                <span className="text-gray-400 text-xs">Images Edited</span>
              </div>
              <p className="text-white text-3xl font-black">{stats.today.imagesEdited}</p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-purple-400" />
                <span className="text-gray-400 text-xs">Time Spent</span>
              </div>
              <p className="text-white text-3xl font-black">{formatTime(stats.today.timeSpent)}</p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-emerald-400" />
                <span className="text-gray-400 text-xs">Albums Done</span>
              </div>
              <p className="text-white text-3xl font-black">{stats.today.albumsCompleted}</p>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-amber-400" />
                <span className="text-gray-400 text-xs">Avg/Image</span>
              </div>
              <p className="text-white text-3xl font-black">{Math.floor(stats.today.avgTimePerImage / 60)}m</p>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="mb-6">
          <h3 className="text-white font-bold mb-3">This Week</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Images</span>
              <p className="text-white text-2xl font-bold">{stats.thisWeek.imagesEdited}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Time</span>
              <p className="text-white text-2xl font-bold">{formatTime(stats.thisWeek.timeSpent)}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Albums</span>
              <p className="text-white text-2xl font-bold">{stats.thisWeek.albumsCompleted}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Avg</span>
              <p className="text-white text-2xl font-bold">{Math.floor(stats.thisWeek.avgTimePerImage / 60)}m</p>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div>
          <h3 className="text-white font-bold mb-3">This Month</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Images</span>
              <p className="text-white text-2xl font-bold">{stats.thisMonth.imagesEdited}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Time</span>
              <p className="text-white text-2xl font-bold">{formatTime(stats.thisMonth.timeSpent)}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Albums</span>
              <p className="text-white text-2xl font-bold">{stats.thisMonth.albumsCompleted}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="text-gray-400 text-xs block mb-1">Avg</span>
              <p className="text-white text-2xl font-bold">{Math.floor(stats.thisMonth.avgTimePerImage / 60)}m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;
