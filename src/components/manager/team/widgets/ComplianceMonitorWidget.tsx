import React from 'react';
import { ShieldCheck, Users, Briefcase, CheckCircle2, Activity } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { useAuth } from '../../../../providers/AuthProvider';
import { useData } from '../../../../providers/DataProvider';
import { UserRole, RoleLabels } from '../../../../types';

const ComplianceMonitorWidget: React.FC = () => {
    const { users } = useAuth();
    const { bookings } = useData();

    const totalUsers = users?.length || 0;
    const activeBookings = bookings?.filter(b => b.status !== 'cancelled' && !b.deletedAt)?.length || 0;
    
    // Count unique roles
    const uniqueRoles = new Set(users?.map(u => u.role) || []);

    const stats = [
        {
            label: 'أعضاء الفريق',
            value: totalUsers,
            icon: <Users size={14} className="text-blue-500" />,
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            color: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'أقسام نشطة',
            value: uniqueRoles.size,
            icon: <Briefcase size={14} className="text-amber-500" />,
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            color: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'حجوزات نشطة',
            value: activeBookings,
            icon: <Activity size={14} className="text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            color: 'text-emerald-600 dark:text-emerald-400',
        },
    ];

    return (
        <ManagerDashboardCard title="لوحة المراقبة" className="h-full bg-white dark:bg-[#1a1c22]/50 relative overflow-hidden flex flex-col" noPadding>
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 opacity-50" />

            {/* Stats Grid */}
            <div className="p-3 space-y-2 relative z-10 shrink-0">
                {stats.map((stat, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 ${stat.bg}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-black/20 flex items-center justify-center shadow-sm">
                                {stat.icon}
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{stat.label}</span>
                        </div>
                        <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Role Breakdown */}
            <div className="px-3 pb-3 space-y-1.5 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase size={10} />
                    توزيع الأقسام
                </h4>
                {Array.from(uniqueRoles).map(role => {
                    const count = users?.filter(u => u.role === role).length || 0;
                    const percent = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                    return (
                        <div key={role} className="flex items-center gap-2 p-2 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 flex-1 truncate">
                                {RoleLabels[role as UserRole] || role}
                            </span>
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 w-6 text-left">{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Status Bar */}
            <div className="mt-auto relative z-10 border-t border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
                <div className="p-3 flex gap-3 items-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full shrink-0">
                        <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-snug flex-1">
                        <strong className="text-emerald-700 dark:text-emerald-400 block mb-0.5 text-xs">النظام يعمل بكفاءة</strong>
                        جميع الأقسام نشطة ولا توجد مشاكل
                    </p>
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default ComplianceMonitorWidget;
