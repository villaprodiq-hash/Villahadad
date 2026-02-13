import React from 'react';
import { Booking } from '../../../../types';
import ManagerDashboardCard from '../../dashboard/widgets/ManagerDashboardCard';
import { AlertCircle, Check, X, ShieldAlert } from 'lucide-react';

interface ApprovalRequestsWidgetProps {
    bookings: Booking[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

const ApprovalRequestsWidget: React.FC<ApprovalRequestsWidgetProps> = ({ bookings, onApprove, onReject }) => {
    // Filter for pending approvals
    const pendingRequests = bookings.filter(b => b.approvalStatus === 'pending');

    if (pendingRequests.length === 0) return null; // Hide if no requests

    return (
        <ManagerDashboardCard title="طلبات الموافقة الخاصة (Approval Lock)" className="mb-6 border-amber-200 bg-amber-50" noPadding>
            <div className="p-4">
                <div className="flex items-center gap-2 mb-4 text-amber-800 bg-amber-100/50 p-2 rounded-lg">
                    <ShieldAlert size={18} />
                    <span className="text-xs font-bold">يوجد {pendingRequests.length} حجز يتطلب موافقة المدير لوجود تضارب.</span>
                </div>

                <div className="space-y-3">
                    {pendingRequests.map(request => (
                        <div key={request.id} className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900">{request.clientName}</span>
                                    {request.isVIP && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">VIP Override</span>}
                                    <span className="text-xs text-gray-500 font-mono">({request.shootDate})</span>
                                </div>
                                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                                    <AlertCircle size={12} />
                                    <span>سبب التضارب: {request.conflictDetails || 'High Capacity Warning'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => onReject(request.id)}
                                    className="flex-1 md:flex-none px-3 py-1.5 bg-white  text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1"
                                >
                                    <X size={14} /> رفض
                                </button>
                                <button 
                                    onClick={() => onApprove(request.id)}
                                    className="flex-1 md:flex-none px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <Check size={14} /> موافقة (تجاوز)
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default ApprovalRequestsWidget;
