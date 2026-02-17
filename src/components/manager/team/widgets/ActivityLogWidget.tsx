import React from 'react';
import { Activity, Trash2, Edit, Plus, Settings } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';

import { activityLogService, ActivityLog } from '../../../../services/db/services/ActivityLogService';

const ActivityLogWidget: React.FC = () => {
    const [activities, setActivities] = React.useState<ActivityLog[]>([]);

    React.useEffect(() => {
        const fetchLogs = async () => {
            const logs = await activityLogService.getRecentLogs();
            setActivities(logs);
        };

        fetchLogs();
        // Poll every 30 seconds for updates
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ManagerDashboardCard title="سجل النشاطات" className="h-full bg-white dark:bg-[#1a1c22]/50 flex flex-col" noPadding>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Activity size={24} className="mb-2 opacity-50" />
                        <span className="text-xs">لا توجد سجلات نشاط حديثة</span>
                    </div>
                ) : (
                    activities.map((activity, idx) => (
                    <div key={activity.id} className={`flex gap-3 relative p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                        idx !== activities.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''
                    }`}>
                        
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center z-10 ${
                             (activity.action || '').includes('delete') || (activity.action || '').includes('reject') ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                             (activity.action || '').includes('edit') || (activity.action || '').includes('update') ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                             (activity.action || '').includes('create') || (activity.action || '').includes('request') || (activity.action || '').includes('approve') ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' :
                             (activity.action || '').includes('system') ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' :
                             'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                        }`}>
                           {(activity.action || '').includes('delete') ? <Trash2 size={12} /> :
                            (activity.action || '').includes('edit') ? <Edit size={12} /> :
                            (activity.action || '').includes('create') ? <Plus size={12} /> :
                            (activity.action || '').includes('system') ? <Settings size={12} /> :
                            <Activity size={12} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-0.5">
                                 <h4 className="text-[11px] font-bold text-gray-900 dark:text-gray-200 truncate pr-2">{activity.userName}</h4>
                                 <span className="text-[9px] text-gray-400 flex items-center gap-1 shrink-0 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                     {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                             </div>
                             <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug wrap-break-word">
                                 {activity.details || `${activity.action} ${activity.entityType}`}
                             </p>
                        </div>
                    </div>
                )))}
            </div>
        </ManagerDashboardCard>
    );
};

export default ActivityLogWidget;
