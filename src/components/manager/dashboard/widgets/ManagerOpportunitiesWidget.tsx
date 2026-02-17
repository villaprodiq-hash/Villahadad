import React from 'react';
import { Sparkles } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';
import ManagerWeatherWidget from './ManagerWeatherWidget';

const ManagerOpportunitiesWidget = () => {
    // Empty state for now - logic to detech opportunities requires advanced analytics not yet implemented
  return (
    <div className="flex flex-col gap-4">
      {/* Weather Replaces Progress */}
      <ManagerWeatherWidget />
      
      {/* Opportunities List (Dark Card) */}
      <ManagerDashboardCard className="bg-[#303030] text-white p-4 group/opp">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold font-tajawal">تنبيهات الفرص</h4>
          <div className="text-3xl font-bold font-mono">
            0<span className="text-gray-600">/0</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-gray-500 gap-2">
             <Sparkles size={20} className="text-amber-500/30" />
             <p className="text-xs font-tajawal">لا توجد فرص متاحة حالياً</p>
        </div>
      </ManagerDashboardCard>
    </div>
  );
};

export default ManagerOpportunitiesWidget;
