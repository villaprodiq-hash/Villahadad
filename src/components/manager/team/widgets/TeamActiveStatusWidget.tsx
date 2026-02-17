import React from 'react';
import { Users } from 'lucide-react';
import { GlowCard } from '../../../shared/GlowCard';

const TeamActiveStatusWidget: React.FC = () => {
  return (
    <GlowCard className="p-6 flex flex-col justify-between bg-linear-to-br from-emerald-900/10 to-transparent border-emerald-500/20">
      <div className="flex justify-between items-start">
         <div>
            <h4 className="text-emerald-400 font-bold text-lg mb-1 flex items-center gap-2">
                نشط الآن
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </h4>
            <p className="text-gray-400 text-xs">4 أعضاء يعملون حالياً</p>
         </div>
         <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Users size={20} />
         </div>
      </div>
      <div className="flex -space-x-3 space-x-reverse mt-4">
         {[1,2,3,4].map(i => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#09090b] bg-gray-800 flex items-center justify-center text-xs font-bold text-white relative shadow-lg">
               U{i}
               <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#09090b] rounded-full"></div>
            </div>
         ))}
         <div className="w-10 h-10 rounded-full border-2 border-[#09090b] bg-[#1a1c22] flex items-center justify-center text-[10px] text-gray-400 font-bold shadow-lg">
            +3
         </div>
      </div>
    </GlowCard>
  );
};

export default TeamActiveStatusWidget;
