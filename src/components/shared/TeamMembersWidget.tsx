import React from 'react';
import { Users, MoreHorizontal } from 'lucide-react';

export const TeamMembersWidget: React.FC<{ isManager?: boolean }> = ({ isManager: _isManager = false }) => {
  const team = [
    { name: 'علي مصطفى', role: 'مصور رئيسي', status: 'online', avatar: 'https://i.pravatar.cc/150?u=ali' },
    { name: 'سارة خالد', role: 'مونتير', status: 'busy', avatar: 'https://i.pravatar.cc/150?u=sara' },
    { name: 'أحمد كمال', role: 'مساعد إضاءة', status: 'offline', avatar: 'https://i.pravatar.cc/150?u=ahmed' },
    { name: 'نور الهدى', role: 'استقبال', status: 'online', avatar: 'https://i.pravatar.cc/150?u=noor' },
  ];

  return (
    <div className="bg-white/60 backdrop-blur-3xl rounded-4xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white/40 ring-1 ring-white/60 p-4 flex flex-col h-full overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Users size={16} className="text-amber-500" />
          فريق العمل
        </h3>
        <button className="p-1 rounded-lg hover:bg-black/5 transition-colors">
          <MoreHorizontal size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
        {team.map((member, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 transition-colors group cursor-pointer border border-transparent hover:border-white/50">
            <div className="relative">
              <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                member.status === 'online' ? 'bg-emerald-500' : 
                member.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-800 truncate">{member.name}</h4>
              <p className="text-[10px] text-gray-500 truncate">{member.role}</p>
            </div>
            
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <MoreHorizontal size={14} />
            </button>
          </div>
        ))}
      </div>
      
      <button className="mt-2 w-full py-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
        عرض الجدول الكامل
      </button>
    </div>
  );
};
