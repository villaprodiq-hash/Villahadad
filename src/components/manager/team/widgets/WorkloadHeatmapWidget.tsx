import React from 'react';
import { Users, Briefcase, Camera, Video, Printer, Palette, Shield } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { User, UserRole, RoleLabels } from '../../../../types';

interface WorkloadHeatmapWidgetProps {
  users?: User[];
}

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case UserRole.MANAGER: return <Shield size={14} className="text-amber-500" />;
    case UserRole.ADMIN: return <Shield size={14} className="text-purple-500" />;
    case UserRole.RECEPTION: return <Briefcase size={14} className="text-rose-500" />;
    case UserRole.PHOTO_EDITOR: return <Camera size={14} className="text-blue-500" />;
    case UserRole.VIDEO_EDITOR: return <Video size={14} className="text-emerald-500" />;
    case UserRole.PRINTER: return <Printer size={14} className="text-indigo-500" />;
    default: return <Palette size={14} className="text-gray-500" />;
  }
};

const getRoleBg = (role: UserRole) => {
  switch (role) {
    case UserRole.MANAGER: return 'from-amber-500/20 to-orange-500/10 border-amber-500/20';
    case UserRole.ADMIN: return 'from-purple-500/20 to-indigo-500/10 border-purple-500/20';
    case UserRole.RECEPTION: return 'from-rose-500/20 to-pink-500/10 border-rose-500/20';
    case UserRole.PHOTO_EDITOR: return 'from-blue-500/20 to-cyan-500/10 border-blue-500/20';
    case UserRole.VIDEO_EDITOR: return 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20';
    case UserRole.PRINTER: return 'from-indigo-500/20 to-violet-500/10 border-indigo-500/20';
    default: return 'from-gray-500/20 to-gray-500/10 border-gray-500/20';
  }
};

const WorkloadHeatmapWidget: React.FC<WorkloadHeatmapWidgetProps> = ({ users = [] }) => {
  // Group users by role
  const roleGroups = users.reduce((acc, user) => {
    const role = user.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  return (
    <ManagerDashboardCard title="خريطة الفريق" className="h-full bg-white dark:bg-[#1a1c22]/50 flex flex-col" noPadding>
      {users.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 text-center">
          <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
            <Users size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-xs text-gray-400">لا يوجد أعضاء فريق</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
          {/* Summary Bar */}
          <div className="flex items-center justify-between px-2 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">إجمالي الفريق</span>
            </div>
            <span className="text-sm font-black text-gray-900 dark:text-white">{users.length}</span>
          </div>

          {/* Role Groups */}
          {Object.entries(roleGroups).map(([role, members]) => (
            <div key={role} className={`rounded-xl border bg-gradient-to-br ${getRoleBg(role as UserRole)} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getRoleIcon(role as UserRole)}
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {RoleLabels[role as UserRole] || role}
                  </span>
                </div>
                <span className="text-xs font-black text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full">
                  {members.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white/70 dark:bg-black/20 rounded-lg border border-white/50 dark:border-white/5"
                    title={member.jobTitle || RoleLabels[member.role]}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                      {member.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ManagerDashboardCard>
  );
};

export default WorkloadHeatmapWidget;
