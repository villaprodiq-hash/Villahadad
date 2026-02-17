import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { GlowCard } from '../../../shared/GlowCard';

const TeamEfficiencyWidget: React.FC = () => {
  return (
    <GlowCard className="p-6 flex flex-col justify-between bg-[#121212]">
      <div className="flex justify-between items-start">
         <div>
            <h4 className="text-white font-bold text-lg mb-1">كفاءة الفريق</h4>
            <p className="text-gray-400 text-xs">معدل إنجاز المهام الأسبوعي</p>
         </div>
         <CheckCircle2 size={20} className="text-blue-500" />
      </div>
      <div className="mt-4">
         <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>التقدم العام</span>
            <span className="text-white font-bold font-mono">87%</span>
         </div>
         <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-blue-600 to-cyan-400 w-[87%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
         </div>
         <p className="text-[10px] text-gray-500 mt-2 text-left">↑ 12% تحسن عن الأسبوع الماضي</p>
      </div>
    </GlowCard>
  );
};

export default TeamEfficiencyWidget;
