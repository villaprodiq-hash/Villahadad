import React, { useState } from 'react';
import { X, Clock, AlertTriangle, Check, Edit3 } from 'lucide-react';
import { Booking } from '../types';
import { bookingService } from '../services/db/services/BookingService';
import { CurrentUserService } from '../services/CurrentUserService';

interface ApprovalNotificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onApproved?: () => void;
  onRejected?: () => void;
  onEdit?: (booking: Booking) => void;
}

const ApprovalNotificationPopup: React.FC<ApprovalNotificationPopupProps> = ({
  isOpen,
  onClose,
  booking,
  onApproved,
  onRejected,
  onEdit,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const currentUser = CurrentUserService.getCurrentUser();
  const userName = currentUser?.name || 'مستخدم';
  const userRole = currentUser?.roleLabel || 'غير محدد';

  const handleApprove = async () => {
    if (!booking) return;
    setIsProcessing(true);
    setAction('approve');
    try {
      await bookingService.approveBooking(booking.id, userName, userRole);
      onApproved?.();
      onClose();
    } catch (error) {
      console.error('Error approving booking:', error);
    }
    setIsProcessing(false);
    setAction(null);
  };

  const handleReject = async () => {
    if (!booking) return;
    setIsProcessing(true);
    setAction('reject');
    try {
      await bookingService.rejectBooking(booking.id, userName, userRole);
      onRejected?.();
      onClose();
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
    setIsProcessing(false);
    setAction(null);
  };

  const handleEdit = () => {
    if (!booking) return;
    onEdit?.(booking);
    onClose();
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[400000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E1E1E] border border-yellow-500/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-linear-to-r from-yellow-500/20 to-orange-500/20 p-4 flex items-center justify-between border-b border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-white font-bold">حجز جديد بانتظار الموافقة</h3>
              <p className="text-yellow-400 text-xs">يوجد تعارض في الوقت</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#262626] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">العميل</span>
              <span className="text-white font-bold">{booking.clientName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">نوع الحجز</span>
              <span className="text-white">{booking.servicePackage}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">التاريخ</span>
              <span className="text-white">{booking.shootDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">الوقت</span>
              <span className="text-white">
                {booking.details?.startTime} - {booking.details?.endTime}
              </span>
            </div>
          </div>

          {booking.conflictDetails && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-bold text-sm mb-1">سبب التعارض</p>
                  <p className="text-gray-300 text-sm">{booking.conflictDetails}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#121212]/50 border-t border-white/5 flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isProcessing && action === 'reject' ? (
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <X size={16} />
            )}
            رفض
          </button>
          <button
            onClick={handleEdit}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            <Edit3 size={16} />
            تعديل
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isProcessing && action === 'approve' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            موافقة
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalNotificationPopup;
