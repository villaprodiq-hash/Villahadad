import React, { useState, useEffect } from 'react';
import { CalendarDays, AlertCircle, Check, X } from 'lucide-react';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { toast } from 'sonner';

// Define Props
interface SmartLeavesWidgetProps {
  users?: any[];
}

const SmartLeavesWidget: React.FC<SmartLeavesWidgetProps> = ({ users = [] }) => {
    // ✅ FIX: Use real leave data from database, not fake data from users
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        // Load real leave requests from database
        const loadLeaves = async () => {
            try {
                const { leaveService } = await import('../../../../services/db/services/LeaveService');
                const leaves = await leaveService.getAllLeaves();
                // Only show pending leaves
                const pendingLeaves = leaves.filter(l => l.status === 'Pending').slice(0, 3);
                setRequests(pendingLeaves.map(leave => ({
                    id: leave.id,
                    user: leave.userName,
                    type: leave.type === 'Sick' ? 'إجازة مرضية' :
                          leave.type === 'Vacation' ? 'إجازة سنوية' :
                          leave.type === 'Emergency' ? 'إجازة طارئة' : 'أخرى',
                    dates: `${new Date(leave.startDate).toLocaleDateString('ar-IQ')} - ${new Date(leave.endDate).toLocaleDateString('ar-IQ')}`,
                    status: leave.status,
                    conflict: false
                })));
            } catch (e) {
                console.error('Failed to load leaves:', e);
                setRequests([]);
            }
        };
        loadLeaves();
    }, []);

    const handleApprove = (id: number) => {
        setRequests(prev => prev.filter(req => req.id !== id));
        toast.success('تم قبول طلب الإجازة');
    };

    const handleReject = (id: number) => {
        setRequests(prev => prev.filter(req => req.id !== id));
        toast.error('تم رفض طلب الإجازة');
    };

    return (
        <ManagerDashboardCard title="جدول الإجازات" className="h-full bg-white dark:bg-[#1a1c22]/50 flex flex-col" noPadding>
            <div className="flex-1 space-y-3 p-3 overflow-y-auto custom-scrollbar">
                {requests.map(req => (
                    <div key={req.id} className="relative group">
                        {/* Conflict Line */}
                        {req.conflict && <div className="absolute left-0 top-1 bottom-1 w-1 bg-rose-500 rounded-r-md z-20" />}
                        
                        <div className={`p-3 rounded-xl border transition-all ${
                            req.conflict ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-500/20' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 shadow-sm'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 font-bold border border-white dark:border-white/10 shadow-sm">
                                        {req.user.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-200">{req.user}</h4>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">{req.dates}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleApprove(req.id)}
                                        className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors"
                                    >
                                        <Check size={12} />
                                    </button>
                                    <button 
                                        onClick={() => handleReject(req.id)}
                                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                            
                            {req.conflict ? (
                                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-rose-600 dark:text-rose-400 font-bold">
                                    <AlertCircle size={10} className="text-rose-500" />
                                    <span>تعارض: نقص مصورين</span>
                                </div>
                            ) : (
                                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> متاح للموافقة
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {requests.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs h-32 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                        <CalendarDays className="mb-2 opacity-50" size={20} />
                        لا توجد طلبات معلقة
                    </div>
                )}
            </div>
        </ManagerDashboardCard>
    );
};

export default SmartLeavesWidget;
