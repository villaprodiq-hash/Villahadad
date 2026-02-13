import React, { useState, useEffect } from 'react';
import { Activity, Clock, Trash2, Edit, Plus, Settings } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { activityLogService, ActivityLog } from '../../../../services/db/services/ActivityLogService';

const PerformanceLiveWidget: React.FC = () => {
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await activityLogService.getRecentLogs();
                setActivities(logs.slice(0, 8)); // Show last 8 activities
            } catch (e) {
                console.error('Failed to load activity logs:', e);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const getActionIcon = (action: string) => {
        if (action?.includes('delete') || action?.includes('reject')) return <Trash2 size={10} />;
        if (action?.includes('edit') || action?.includes('update')) return <Edit size={10} />;
        if (action?.includes('create') || action?.includes('approve')) return <Plus size={10} />;
        if (action?.includes('system')) return <Settings size={10} />;
        return <Activity size={10} />;
    };

    const getActionColor = (action: string) => {
        if (action?.includes('delete') || action?.includes('reject')) return 'bg-red-50 dark:bg-red-900/20 text-red-500';
        if (action?.includes('edit') || action?.includes('update')) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-500';
        if (action?.includes('create') || action?.includes('approve')) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500';
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-500';
    };

    return (
        <div className="h-full">
            <ManagerDashboardCard title="النشاط المباشر" className="h-full bg-white dark:bg-[#1a1c22]/50 flex flex-col" noPadding>
                {activities.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                        <Activity size={24} className="text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">لا توجد نشاطات حديثة</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activities.map((activity, idx) => (
                            <div
                                key={activity.id}
                                className={`flex gap-2.5 p-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                                    idx !== activities.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center ${getActionColor(activity.action || '')}`}>
                                    {getActionIcon(activity.action || '')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-200 truncate pr-2">
                                            {activity.userName}
                                        </h4>
                                        <span className="text-[8px] text-gray-400 shrink-0 bg-gray-50 dark:bg-white/5 px-1 py-0.5 rounded flex items-center gap-0.5">
                                            <Clock size={8} />
                                            {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-snug truncate">
                                        {activity.details || `${activity.action} ${activity.entityType}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ManagerDashboardCard>
        </div>
    );
};

export default PerformanceLiveWidget;
