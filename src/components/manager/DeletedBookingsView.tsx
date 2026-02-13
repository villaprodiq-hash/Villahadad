import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, User, Phone, Search, X } from 'lucide-react';
import { Booking } from '../../types';
import { bookingService } from '../../services/db/services/BookingService';
import { toast } from 'sonner';

interface DeletedBookingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (booking: Booking) => void;
}

const DeletedBookingsView: React.FC<DeletedBookingsViewProps> = ({ 
  isOpen, 
  onClose,
  onRestore 
}) => {
  const [deletedBookings, setDeletedBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<'restore' | 'permanent' | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDeletedBookings();
    }
  }, [isOpen]);

  const loadDeletedBookings = async () => {
    setIsLoading(true);
    try {
      const bookings = await bookingService.getDeletedBookings();
      setDeletedBookings(bookings);
    } catch (error) {
      console.error('Failed to load deleted bookings:', error);
      toast.error('فشل تحميل المحذوفات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (booking: Booking) => {
    try {
      await bookingService.restoreBooking(booking.id);
      setDeletedBookings(prev => prev.filter(b => b.id !== booking.id));
      toast.success(`تم استعادة حجز "${booking.clientName}" بنجاح`);
      onRestore?.(booking);
    } catch (error) {
      console.error('Failed to restore booking:', error);
      toast.error('فشل استعادة الحجز');
    }
    setShowConfirmModal(null);
    setSelectedBooking(null);
  };

  const handlePermanentDelete = async (booking: Booking) => {
    try {
      await bookingService.permanentDeleteBooking(booking.id);
      setDeletedBookings(prev => prev.filter(b => b.id !== booking.id));
      toast.success('تم الحذف النهائي بنجاح');
    } catch (error) {
      console.error('Failed to permanently delete booking:', error);
      toast.error('فشل الحذف النهائي');
    }
    setShowConfirmModal(null);
    setSelectedBooking(null);
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'غير معروف';
    return new Date(timestamp).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilPermanentDelete = (deletedAt: number | undefined) => {
    if (!deletedAt) return 0;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const permanentDeleteDate = deletedAt + thirtyDays;
    const daysLeft = Math.ceil((permanentDeleteDate - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const filteredBookings = deletedBookings.filter(booking => 
    booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.clientPhone.includes(searchTerm) ||
    booking.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">سلة المحذوفات</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {deletedBookings.length} حجز محذوف | يتم الحذف النهائي تلقائياً بعد 30 يوم
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، رقم الهاتف، أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Trash2 className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد حجوزات محذوفة</p>
              <p className="text-sm">ستظهر هنا الحجوزات المحذوفة مؤخراً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const daysLeft = getDaysUntilPermanentDelete(booking.deletedAt);
                return (
                  <div 
                    key={booking.id}
                    className="group bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">{booking.clientName}</h3>
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                            محذوف
                          </span>
                          {daysLeft <= 7 && (
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {daysLeft} أيام للحذف النهائي
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {booking.clientPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {booking.shootDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {booking.title}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">
                          تاريخ الحذف: {formatDate(booking.deletedAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowConfirmModal('restore');
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          استعادة
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowConfirmModal('permanent');
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف نهائي
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>
              <AlertTriangle className="w-4 h-4 inline-block ml-1 text-orange-500" />
              الحجوزات المحذوفة تُحذف نهائياً تلقائياً بعد 30 يوم
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6" dir="rtl">
            <div className="flex items-center gap-3 mb-4">
              {showConfirmModal === 'restore' ? (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <RotateCcw className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {showConfirmModal === 'restore' ? 'تأكيد الاستعادة' : 'تأكيد الحذف النهائي'}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {showConfirmModal === 'restore' 
                ? `هل أنت متأكد من استعادة حجز "${selectedBooking.clientName}"؟ سيتم إعادة الحجز إلى قائمة الحجوزات النشطة.`
                : `هل أنت متأكد من الحذف النهائي لحجز "${selectedBooking.clientName}"؟ هذا الإجراء لا يمكن التراجع عنه!`
              }
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(null);
                  setSelectedBooking(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={() => showConfirmModal === 'restore' 
                  ? handleRestore(selectedBooking) 
                  : handlePermanentDelete(selectedBooking)
                }
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors ${
                  showConfirmModal === 'restore'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showConfirmModal === 'restore' ? 'استعادة' : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedBookingsView;