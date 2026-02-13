import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';
import { presenceService } from '../../../../services/db/services/PresenceService';
import { User } from '../../../../types';

interface ManagerTeamStatusWidgetProps {
  users: any[];
}

const ManagerTeamStatusWidget: React.FC<ManagerTeamStatusWidgetProps> = ({ users = [] }) => {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  // Subscribe to real-time presence updates
  useEffect(() => {
    // Get initial state
    const initial = presenceService.getOnlineUsers();
    if (initial.length > 0) {
      setOnlineUsers(initial);
    }

    // Subscribe to changes
    const unsubscribe = presenceService.subscribe((online) => {
      setOnlineUsers(online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Build team list: mark users as online/offline based on presence
  const onlineIds = new Set(onlineUsers.map(u => u.id));

  const team = users
    .filter(user => user && user.name)
    .map(user => ({
      name: user.name,
      status: onlineIds.has(user.id) ? 'available' : 'offline',
      task: user.role
    }));

  // Sort: online users first
  team.sort((a, b) => {
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (a.status !== 'available' && b.status === 'available') return 1;
    return 0;
  });

  const onlineCount = team.filter(m => m.status === 'available').length;

  return (
    <ManagerDashboardCard className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md border-none shadow-sm h-[160px] flex flex-col pt-3" dir="rtl" style={{ minHeight: '160px', maxHeight: '160px' }}>
      <div className="flex items-center justify-between mb-3 shrink-0 px-2">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-400 dark:text-gray-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-tajawal">نشاط الفريق</h3>
        </div>
        <span className="text-[10px] text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded-full">
          {onlineCount} متصلين
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {team.map((member, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-1.5 group hover:bg-white/50 dark:hover:bg-white/5 transition-all px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${member.status === 'available' ? 'bg-green-500' : 'bg-red-400 opacity-50'}`} />
                <span className={`text-[11px] font-bold font-tajawal truncate ${member.status === 'available' ? 'text-gray-900 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{member.name}</span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-tajawal truncate text-left max-w-[60px]">
                {member.task}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ManagerDashboardCard>
  );
};

export default ManagerTeamStatusWidget;
