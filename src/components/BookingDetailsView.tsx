import React, { useState, useEffect } from 'react';
import {
  Booking,
  BookingStatus,
  Reminder,
  ReminderType,
  StatusLabels,
} from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  ArrowRight,
  Check,
  Wallet,
  ListChecks,
  Plus,
  DollarSign,
  Receipt,
  History,
  Printer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatMoney } from '../utils/formatMoney';
import { printReceipt, ReceiptType } from '../utils/printReceipt';
import { toast } from 'sonner';

import { ZainCashPayment } from './shared/ZainCashPayment';
import { ClientTransactionModal, ClientTransactionHistory } from './client';
import AddExtraItemModal from './AddExtraItemModal';
import { SessionCard, SelectionModal } from './session';
import { useSessionLifecycle } from '../hooks/useSessionLifecycle';
import { sanitizeDate } from '../utils/filterUtils';

interface BookingDetailsViewProps {
  booking: Booking;
  reminders: Reminder[];
  onStatusChange: (status: BookingStatus) => void;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => void;
  onSettlePayment: () => void;
  onDropFolder: (paths: string[]) => void;
  onAddReminder: (type: ReminderType, title?: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onOpenAiAssistant: () => void;
  onBack: () => void;
  allBookings?: Booking[];
  initialTab?: string;
}

const BookingDetailsView: React.FC<BookingDetailsViewProps> = ({
  booking,
  onStatusChange,
  onUpdateBooking,
  onSettlePayment,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [showAddExtraItemModal, setShowAddExtraItemModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  
  const currentUser = { id: 'reception-user', name: 'موظف الاستقبال' };

  // Session lifecycle for photo management
  const {
    session,
    images,
    selectedCount,
    totalCount,
  } = useSessionLifecycle({
    bookingId: booking.id,
    clientName: booking.clientName,
  });

  const [formData, setFormData] = useState({
    title: booking.title,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: booking.clientEmail || '',
    shootDate: booking.shootDate,
    servicePackage: booking.servicePackage,
    startTime: booking.details?.startTime || '',
    endTime: booking.details?.endTime || '',
    notes: booking.details?.notes || '',
  });

  useEffect(() => {
    setFormData({
      title: booking.title,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      clientEmail: booking.clientEmail || '',
      shootDate: booking.shootDate,
      servicePackage: booking.servicePackage,
      startTime: booking.details?.startTime || '',
      endTime: booking.details?.endTime || '',
      notes: booking.details?.notes || '',
    });
  }, [booking]);

  const handleSave = () => {
    onUpdateBooking(booking.id, {
      title: formData.title,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail,
      shootDate: formData.shootDate,
      servicePackage: formData.servicePackage,
      details: {
        ...booking.details,
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes,
      },
    });
    setIsEditing(false);
    toast.success('تم حفظ التغييرات بنجاح');
  };

  const handleAddExtraItem = async (amount: number, description: string, itemCurrency?: string) => {
    try {
      const { electronBackend } = await import('../services/mockBackend');

      // The modal always sends IQD as the extra currency
      const extraCurrency = itemCurrency || 'IQD';
      const isSameCurrency = booking.currency === extraCurrency;

      // Save to backend (add_ons table) — pass currency so backend knows where to store
      await electronBackend.addExtraService(
        booking.id,
        amount,
        description,
        currentUser.id,
        currentUser.name,
        extraCurrency
      );

      // Optimistic update of the local UI state
      const currentExtraItems = booking.details?.extraItems || [];
      const newItem = {
        id: Date.now().toString(),
        amount,
        currency: extraCurrency as 'USD' | 'IQD',
        description,
      };
      const updatedExtraItems = [...currentExtraItems, newItem];

      if (isSameCurrency) {
        // Same currency → add directly to totalAmount + paidAmount (المبلغ الإضافي مستلم فوراً)
        onUpdateBooking(booking.id, {
          totalAmount: booking.totalAmount + amount,
          paidAmount: booking.paidAmount + amount,
          details: { ...booking.details, extraItems: updatedExtraItems },
        });
      } else {
        // Different currency → store in addOnTotal, do NOT mix into totalAmount
        const currentAddOnTotal = (booking as any).addOnTotal || 0;
        onUpdateBooking(booking.id, {
          addOnTotal: currentAddOnTotal + amount,
          originalPackagePrice: booking.originalPackagePrice || booking.totalAmount,
          details: { ...booking.details, extraItems: updatedExtraItems },
        } as any);
      }

      toast.success('تم إضافة الخدمة الإضافية بنجاح وتم تحديث المجموع');
    } catch (e) {
      console.error('Failed to add extra service:', e);
      toast.error('فشل حفظ الخدمة الإضافية في النظام');
    }
  };

  const remainingAmount = booking.totalAmount - booking.paidAmount;

  return (
    <div className="bg-[#21242b] min-h-screen p-6 font-sans" dir="rtl">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2.5 bg-[#1a1c22] rounded-xl border border-white/10 text-gray-300 hover:bg-[#1f222a] transition-colors"
          >
            <ArrowRight size={20} />
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddExtraItemModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1c22] text-gray-300 border border-white/10 rounded-xl font-semibold hover:bg-[#1f222a] transition-colors"
            >
              <Plus size={18} /> إضافة خدمة
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Card */}
            <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#C94557]/20 flex items-center justify-center text-[#C94557] text-2xl font-bold">
                    {booking.clientName?.charAt(0)}
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                        className="text-2xl font-bold text-white border-b-2 border-[#C94557] outline-none bg-transparent pb-1"
                      />
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold text-white mb-1">
                          {booking.clientName}
                        </h1>
                        <p className="text-sm text-gray-400">{booking.title}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-semibold text-gray-300">
                    {StatusLabels[booking.status]}
                  </div>
                  
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        data-testid="save-booking-btn"
                        className="p-2 bg-[#C94557] hover:bg-[#B3434F] text-white rounded-lg transition-colors"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="p-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      data-testid="edit-booking-btn"
                      className="p-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Info */}
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                    بيانات الاتصال
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.clientPhone}
                        onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                        className="w-full text-sm font-medium bg-[#21242b] text-white border border-white/10 rounded-lg px-3 py-2"
                      />
                      <input
                        type="text"
                        value={formData.clientEmail}
                        onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                        className="w-full text-sm font-medium bg-[#21242b] text-white border border-white/10 rounded-lg px-3 py-2"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-white">
                        <Phone size={14} className="text-[#C94557]" />
                        <span className="text-sm font-medium" dir="ltr">{booking.clientPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} className="text-[#C94557]" />
                        <span className="text-sm">{booking.clientEmail || 'لا يوجد'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appointment Info */}
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                    تفاصيل الموعد
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={sanitizeDate(formData.shootDate)}
                        onChange={e => setFormData({ ...formData, shootDate: e.target.value })}
                        className="w-full text-sm font-medium bg-[#21242b] text-white border border-white/10 rounded-lg px-3 py-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full text-sm font-medium bg-[#21242b] text-white border border-white/10 rounded-lg px-3 py-2"
                        />
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                          className="w-full text-sm font-medium bg-[#21242b] text-white border border-white/10 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white">
                        <Calendar size={14} className="text-[#C94557]" />
                        <span className="text-sm font-medium">
                          {format(parseISO(booking.shootDate), 'dd MMMM yyyy', { locale: ar })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock size={14} className="text-[#C94557]" />
                        <span className="text-sm">
                          {booking.details?.startTime || '--:--'} - {booking.details?.endTime || '--:--'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks size={18} className="text-[#C94557]" />
                <h3 className="text-lg font-bold text-white">الملاحظات</h3>
              </div>
              {isEditing ? (
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-[100px] p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#C94557]/50 transition-colors resize-none"
                  placeholder="أضف ملاحظات..."
                />
              ) : (
                <p className="text-sm text-gray-400 leading-relaxed bg-white/5 p-4 rounded-xl min-h-[100px]">
                  {booking.details?.notes || 'لا توجد ملاحظات.'}
                </p>
              )}
            </div>

            {/* Transaction History */}
            <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <History size={18} className="text-[#C94557]" />
                <h3 className="text-lg font-bold text-white">سجل المعاملات</h3>
              </div>
              <ClientTransactionHistory
                key={transactionRefreshKey}
                clientId={booking.clientId}
                clientName={booking.clientName}
                currentUser={currentUser}
                currency={booking.currency}
                compact
              />
            </div>

            {/* Session Management - Photo Selection */}
            <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
              <SessionCard
                session={session}
                imageCount={totalCount}
                selectedCount={selectedCount}
                onOpenSelection={() => setShowSelectionModal(true)}
                onOpenFolder={() => {
                  if (session?.folderPath) {
                    void window.electronAPI?.fileSystem?.openDirectory?.();
                  }
                }}
              />
            </div>
          </div>

          {/* Right Column - Financial */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Wallet size={18} className="text-[#C94557]" />
                <h3 className="text-lg font-bold text-white">الملخص المالي</h3>
              </div>

              <div className="space-y-4">
                {/* Base Amount */}
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-400">السعر الأساسي</span>
                    <DollarSign size={16} className="text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-300">
                    {formatMoney(booking.details?.baseAmount || booking.totalAmount, booking.currency)}
                  </p>
                </div>

                {/* Extra Items */}
                {booking.details?.extraItems && booking.details.extraItems.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      الخدمات الإضافية
                    </div>
                    <div className="space-y-2">
                      {booking.details.extraItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <span className="text-sm text-purple-300">{item.description}</span>
                          <span className="text-sm font-semibold text-white">
                            +{formatMoney(item.amount, item.currency || booking.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-400">الإجمالي</span>
                    <span className="text-lg font-bold text-white">
                      {formatMoney(booking.totalAmount, booking.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-400">المدفوع</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatMoney(booking.paidAmount, booking.currency)}
                    </span>
                  </div>
                  {remainingAmount > 0 && (
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-300">المتبقي</span>
                        <span className="text-3xl font-bold text-rose-400">
                          {formatMoney(remainingAmount, booking.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Settlement Button */}
              <button
                onClick={onSettlePayment}
                disabled={remainingAmount <= 0}
                className="w-full mt-6 py-4 bg-[#C94557] hover:bg-[#B3434F] disabled:bg-white/5 disabled:text-gray-600 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                <span>تسوية المبلغ</span>
              </button>

              {/* Print Receipt Buttons */}
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">طباعة وصل استلام</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => printReceipt({
                      booking,
                      type: 'deposit',
                      amount: booking.paidAmount,
                      currency: booking.currency,
                      description: 'عربون تأكيد الحجز',
                    })}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold transition-colors border border-emerald-500/20"
                  >
                    <Printer size={13} />
                    وصل العربون
                  </button>
                  <button
                    onClick={() => printReceipt({
                      booking,
                      type: 'full',
                      amount: booking.totalAmount,
                      currency: booking.currency,
                      description: 'استلام المبلغ الكامل',
                    })}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[11px] font-bold transition-colors border border-blue-500/20"
                  >
                    <Printer size={13} />
                    وصل كامل
                  </button>
                  <button
                    onClick={() => printReceipt({
                      booking,
                      type: 'addon',
                      amount: (booking as any).addOnTotal || 0,
                      currency: booking.currency,
                      description: 'مبلغ الخدمات الإضافية',
                    })}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-[11px] font-bold transition-colors border border-purple-500/20"
                  >
                    <Printer size={13} />
                    وصل إضافي
                  </button>
                  <button
                    onClick={() => printReceipt({
                      booking,
                      type: 'partial',
                      amount: remainingAmount > 0 ? booking.paidAmount : booking.totalAmount,
                      currency: booking.currency,
                      description: `دفعة جزئية - ${formatMoney(booking.paidAmount, booking.currency)} من ${formatMoney(booking.totalAmount, booking.currency)}`,
                    })}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[11px] font-bold transition-colors border border-amber-500/20"
                  >
                    <Printer size={13} />
                    وصل دفعة
                  </button>
                </div>
              </div>

              <ZainCashPayment
                booking={booking}
                onPaymentSuccess={transactionId => {
                  onUpdateBooking(booking.id, {
                    paidAmount: booking.totalAmount,
                    paymentMethod: 'ZainCash',
                    zainCashTransactionId: transactionId,
                    status: BookingStatus.CONFIRMED,
                  } as any);
                }}
              />
            </div>

            {/* Quick Actions */}
            {(booking.status === BookingStatus.SHOOTING || booking.status === BookingStatus.SHOOTING_COMPLETED) && (
              <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt size={18} className="text-[#C94557]" />
                  <h3 className="text-lg font-bold text-white">إجراءات سريعة</h3>
                </div>
                <div className="space-y-2">
                  {booking.status === BookingStatus.SHOOTING && (
                    <button
                      onClick={() => onStatusChange(BookingStatus.SHOOTING_COMPLETED)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> إنهاء التصوير
                    </button>
                  )}
                  {booking.status === BookingStatus.SHOOTING_COMPLETED && (
                    <button
                      onClick={() => onStatusChange(BookingStatus.SELECTION)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> بدء الاختيار
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ClientTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        clientId={booking.clientId}
        clientName={booking.clientName}
        bookingId={booking.id}
        currentUser={currentUser}
        currency={booking.currency}
        onTransactionAdded={() => setTransactionRefreshKey((prev: number) => prev + 1)}
      />

      <AddExtraItemModal
        isOpen={showAddExtraItemModal}
        onClose={() => setShowAddExtraItemModal(false)}
        onAdd={handleAddExtraItem}
        bookingCurrency={booking.currency}
      />

      {/* Session Selection Modal */}
      <SelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        bookingId={booking.id}
        clientName={booking.clientName}
        onComplete={() => {
          toast.success('تم الاختيار بنجاح!');
          setShowSelectionModal(false);
        }}
      />
    </div>
  );
};

export default BookingDetailsView;
