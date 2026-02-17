
import React, { useState, useEffect } from 'react';
import {
  CalendarDays, CheckCircle2, XCircle,
  FileText, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { leaveService, LeaveRequest } from '../../../services/db/services/LeaveService';
import LeaveRequestModal from './LeaveRequestModal';

const AdminLeavesView = () => {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

    const fetchLeaves = async () => {
        try {
            const data = await leaveService.getAllLeaves();
            setLeaves(data);
        } catch (e) {
            console.error(e);
            toast.error('فشل في تحميل الإجازات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
        try {
            await leaveService.updateLeaveStatus(id, action);
            toast.success(`تم ${action === 'Approved' ? 'قبول' : 'رفض'} الطلب بنجاح`);
            setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: action } : l));
        } catch (e) {
            toast.error('فشل في تحديث الحالة');
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Approved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Rejected': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'Approved': return 'مقبول';
            case 'Rejected': return 'مرفوض';
            default: return 'بالانتظار';
        }
    };

    const filteredLeaves = leaves.filter(l => filter === 'All' || l.status === filter);
    const pendingCount = leaves.filter(l => l.status === 'Pending').length;

    return (
        <div className="h-full flex flex-col font-sans p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                         <CalendarDays className="text-orange-500" size={20} />
                         إدارة الإجازات
                         {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                                {pendingCount} بالانتظار
                            </span>
                         )}
                    </h3>
                 </div>
                 <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ff6d00] text-black font-bold hover:bg-[#ff8c00] transition-colors"
                 >
                     <Plus size={16} /> إضافة إجازة
                 </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-6 bg-[#0a0a0a] p-1 border border-white/6 w-fit">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filter === f
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        {f === 'Pending' && pendingCount > 0 && (
                            <span className="w-1.5 h-1.5 bg-amber-500 animate-pulse" />
                        )}
                        {f === 'All' ? 'الكل' :
                         f === 'Pending' ? 'بالانتظار' :
                         f === 'Approved' ? 'مقبول' : 'مرفوض'}
                    </button>
                ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4">
                <AnimatePresence>
                    {filteredLeaves.map((leave) => (
                        <motion.div
                            key={leave.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`bg-[#111] border border-white/6 p-5 relative flex flex-col ${
                                leave.status === 'Pending' ? 'border-r-2 border-r-amber-500' : ''
                            }`}
                        >
                            {/* Status Badge */}
                            <div className={`absolute top-4 left-4 px-2 py-1 text-[10px] font-black uppercase tracking-wider border ${getStatusColor(leave.status)}`}>
                                {getStatusLabel(leave.status)}
                            </div>

                            {/* User Info */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-zinc-800 flex items-center justify-center text-white font-bold border border-white/10 text-sm">
                                    {leave.userName.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{leave.userName}</h4>
                                    <p className="text-zinc-600 text-[10px]">
                                        {new Date(leave.createdAt).toLocaleDateString('ar-IQ')}
                                    </p>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3 flex-1">
                                <div className="bg-white/[0.02] p-2 border border-white/[0.04]">
                                    <span className="text-[10px] text-zinc-500 block mb-1">من تاريخ</span>
                                    <span className="text-xs text-white font-mono">{leave.startDate}</span>
                                </div>
                                <div className="bg-white/[0.02] p-2 border border-white/[0.04]">
                                    <span className="text-[10px] text-zinc-500 block mb-1">إلى تاريخ</span>
                                    <span className="text-xs text-white font-mono">{leave.endDate}</span>
                                </div>
                                <div className="bg-white/[0.02] p-2 border border-white/[0.04] col-span-2">
                                    <span className="text-[10px] text-zinc-500 block mb-1">نوع الإجازة</span>
                                    <span className="text-xs text-[#ff6d00] font-bold flex items-center gap-1">
                                        <FileText size={12} />
                                        {leave.type === 'Sick' ? 'مرضية' :
                                         leave.type === 'Vacation' ? 'سنوية' :
                                         leave.type === 'Emergency' ? 'طارئة' : 'أخرى'}
                                    </span>
                                </div>
                            </div>

                            {/* Reason */}
                            {leave.reason && (
                                <div className="text-[11px] text-zinc-400 italic mb-3 bg-white/[0.02] p-2 border border-white/[0.04]">
                                    &quot;{leave.reason}&quot;
                                </div>
                            )}

                            {/* Actions (Only Pending) */}
                            {leave.status === 'Pending' ? (
                                <div className="flex gap-2 mt-auto pt-3 border-t border-white/6">
                                    <button
                                        onClick={() => handleAction(leave.id, 'Approved')}
                                        className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-bold transition-all border border-emerald-500/20 flex items-center justify-center gap-1"
                                    >
                                        <CheckCircle2 size={14} /> قبول
                                    </button>
                                    <button
                                        onClick={() => handleAction(leave.id, 'Rejected')}
                                        className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-1"
                                    >
                                        <XCircle size={14} /> رفض
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/6 text-[10px] text-zinc-500">
                                    <CheckCircle2 size={12} /> تمت المعالجة بواسطة {leave.approvedBy || 'Admin'}
                                </div>
                            )}

                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredLeaves.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                        <CalendarDays size={40} className="text-zinc-700 mb-3" />
                        <p className="text-sm font-bold text-zinc-500">لا توجد إجازات</p>
                        <p className="text-xs text-zinc-600 mt-1">
                            {filter === 'Pending' ? 'لا توجد طلبات بالانتظار' : 'أضف إجازة جديدة من الزر أعلاه'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <LeaveRequestModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchLeaves}
            />
        </div>
    );
};

export default AdminLeavesView;
