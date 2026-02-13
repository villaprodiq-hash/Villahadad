import React, { useState, useEffect } from 'react';
import {
  Clock,
  Check,
  X,
  Edit3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
} from 'lucide-react';
import { Booking } from '../types';
import { bookingService } from '../services/db/services/BookingService';
import { CurrentUserService } from '../services/CurrentUserService';

interface PendingApprovalsWidgetProps {
  onEditBooking?: (booking: Booking) => void;
  onRefresh?: () => void;
}

const PendingApprovalsWidget: React.FC<PendingApprovalsWidgetProps> = ({
  onEditBooking,
  onRefresh,
}) => {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const currentUser = CurrentUserService.getCurrentUser();
  const userName = currentUser?.name || 'مستخدم';
  const userRole = currentUser?.roleLabel || 'غير محدد';

  const loadPendingBookings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const pending = await bookingService.getPendingApprovals();
      setPendingBookings(pending);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    loadPendingBookings();
    const interval = setInterval(() => loadPendingBookings(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await bookingService.approveBooking(bookingId, userName, userRole);
      await loadPendingBookings();
      onRefresh?.();
    } catch (error) {
      console.error('Error approving booking:', error);
    }
    setProcessingId(null);
  };

  const handleReject = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      await bookingService.rejectBooking(bookingId, userName, userRole);
      await loadPendingBookings();
      onRefresh?.();
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
    setProcessingId(null);
  };

  const handleEdit = (booking: Booking) => {
    onEditBooking?.(booking);
  };

  if (pendingBookings.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Clock size={20} className="text-yellow-500" />
          </div>
          <div className="text-right">
            <h3 className="text-white font-bold text-sm">حجوزات بانتظار الموافقة</h3>
            <p className="text-gray-400 text-xs">
              {isLoading ? 'جاري التحميل...' : `${pendingBookings.length} حجز معلق`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingBookings.length > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              {pendingBookings.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-yellow-500/20">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2" />
              جاري التحميل...
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-gray-400 shrink-0" />
                        <span className="text-white font-bold text-sm truncate">
                          {booking.clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={12} className="text-gray-500 shrink-0" />
                        <span className="text-gray-400 text-xs">
                          {booking.shootDate} | {booking.details?.startTime} -{' '}
                          {booking.details?.endTime}
                        </span>
                      </div>
                      {booking.conflictDetails && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                          <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                          <span className="text-yellow-400 text-xs leading-relaxed">
                            {booking.conflictDetails}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleApprove(booking.id)}
                        disabled={processingId === booking.id}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors disabled:opacity-50"
                        title="موافقة"
                      >
                        {processingId === booking.id ? (
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(booking)}
                        disabled={processingId === booking.id}
                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors disabled:opacity-50"
                        title="تعديل"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleReject(booking.id)}
                        disabled={processingId === booking.id}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                        title="رفض"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingApprovalsWidget;
