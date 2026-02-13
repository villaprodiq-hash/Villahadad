import React from 'react';
import { Sun, Sunrise, Sunset } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';

const ManagerWeatherWidget = () => (
  <ManagerDashboardCard className="relative overflow-hidden group">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <Sun size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold font-tajawal text-gray-800">طقس بغداد</h3>
          <p className="text-[10px] text-gray-500 font-tajawal">صافي ومناسب للتصوير</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-gray-900">24°</p>
        <p className="text-[10px] text-gray-500 font-mono">C°</p>
      </div>
    </div>

    <div className="flex items-center justify-between gap-4 mt-2 p-3 bg-gray-50 rounded-2xl ">
       <div className="flex items-center gap-2">
          <Sunrise size={14} className="text-orange-500" />
          <span className="text-[10px] font-bold font-mono text-gray-600">06:42 AM</span>
       </div>
       <div className="flex items-center gap-2">
          <Sunset size={14} className="text-indigo-500" />
          <span className="text-[10px] font-bold font-mono text-gray-600">05:15 PM</span>
       </div>
    </div>
  </ManagerDashboardCard>
);

export default ManagerWeatherWidget;
