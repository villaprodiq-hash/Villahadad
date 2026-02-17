
import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaveService } from '../../../services/db/services/LeaveService';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { users, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'Sick' as 'Sick' | 'Vacation' | 'Emergency' | 'Other',
    reason: ''
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Filter staff (exclude admin from the list)
  const staffList = (users || []).filter(u => u.role !== UserRole.ADMIN);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setFormData({ startDate: '', endDate: '', type: 'Sick', reason: '' });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error('يرجى تحديد تواريخ الإجازة');
      return;
    }

    if (isAdmin && !selectedUserId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }

    setLoading(true);
    try {
      if (isAdmin && selectedUserId) {
        // Admin adding leave directly for a specific employee
        const selectedUser = staffList.find(u => u.id === selectedUserId);
        await leaveService.addLeaveForEmployee(
          selectedUserId,
          selectedUser?.name || '',
          formData
        );
        toast.success(`تم إضافة إجازة لـ ${selectedUser?.name} بنجاح`);
      } else {
        // Regular employee requesting leave (status = Pending)
        await leaveService.requestLeave(formData);
        toast.success('تم إرسال طلب الإجازة بنجاح');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('فشل في إضافة الإجازة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#111] border border-white/6 shadow-2xl p-6 overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Calendar className="text-[#ff6d00]" size={20} />
                {isAdmin ? 'إضافة إجازة' : 'طلب إجازة'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Employee Selector (Admin Only) */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                    <Users size={12} />
                    اختر الموظف
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    required
                    className="w-full bg-[#0a0a0a] border border-white/6 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#ff6d00]/50 transition-all appearance-none"
                  >
                    <option value="">— اختر موظف —</option>
                    {staffList.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.jobTitle || user.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">من تاريخ</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-white/6 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#ff6d00]/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">إلى تاريخ</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-white/6 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#ff6d00]/50 transition-all"
                  />
                </div>
              </div>

              {/* Leave Type */}
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-zinc-400">نوع الإجازة</label>
                 <div className="grid grid-cols-4 gap-2">
                    {(['Sick', 'Vacation', 'Emergency', 'Other'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, type})}
                        className={`py-2 text-xs font-bold transition-all ${
                          formData.type === type
                          ? 'bg-[#ff6d00] text-black'
                          : 'bg-white/[0.03] text-zinc-500 hover:text-white border border-white/6'
                        }`}
                      >
                        {type === 'Sick' ? 'مرضية' :
                         type === 'Vacation' ? 'سنوية' :
                         type === 'Emergency' ? 'طارئة' : 'أخرى'}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">السبب (اختياري)</label>
                <textarea
                  rows={3}
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  className="w-full bg-[#0a0a0a] border border-white/6 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff6d00]/50 transition-all resize-none"
                  placeholder="اكتب سبب الإجازة هنا..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#ff6d00] text-black font-bold hover:bg-[#ff8c00] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'جاري الحفظ...' : (
                  <>
                    <Check size={18} />
                    {isAdmin ? 'إضافة الإجازة' : 'إرسال الطلب'}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LeaveRequestModal;
