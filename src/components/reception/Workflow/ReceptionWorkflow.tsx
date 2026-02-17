import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus, BookingCategory, User, StatusHistoryItem } from '../../../types';
import { Clock, CheckCircle2, Camera, Calendar, AlertTriangle, Sparkles, X, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { formatMoney } from '../../../utils/formatMoney';
import { toast } from 'sonner';
import AddExtraItemModal from '../../AddExtraItemModal';

const getTimeInStage = (statusHistory: StatusHistoryItem[] | undefined, currentStatus: BookingStatus): number => {
  if (!statusHistory || statusHistory.length === 0) return 0;
  const lastEntry = [...statusHistory].reverse().find(h => h.status === currentStatus);
  if (!lastEntry) return 0;
  return differenceInDays(new Date(), parseISO(lastEntry.timestamp));
};

const getAssigneeForStage = (booking: Booking, users: User[]): User | undefined => {
  let assigneeId: string | undefined;
  switch (booking.status) {
    case BookingStatus.SHOOTING:
      assigneeId = booking.assignedShooter;
      break;
    case BookingStatus.EDITING:
      assigneeId = booking.assignedPhotoEditor || booking.assignedVideoEditor;
      break;
    case BookingStatus.READY_TO_PRINT:
      assigneeId = booking.assignedPrinter;
      break;
    default:
      assigneeId = booking.assignedReceptionist;
  }
  return users.find(u => u.id === assigneeId);
};

interface ReceptionWorkflowProps {
  bookings: Booking[];
  users: User[];
  onViewBooking?: (id: string, tab?: string) => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => void;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
}

const ReceptionWorkflow: React.FC<ReceptionWorkflowProps> = ({ 
  bookings, 
  users,
  onViewBooking, 
  onStatusUpdate,
  onUpdateBooking
}) => {
  // ✅ State للـ Quick Action Modal
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<Booking | null>(null);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  
  // Categorize bookings into 3 columns
  const columns = useMemo<WorkflowColumn[]>(() => {
    return [
      {
        id: 'upcoming',
        title: 'القادم',
        icon: <Calendar size={20} />,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        status: [BookingStatus.CONFIRMED]
      },
      {
        id: 'in-progress',
        title: 'قيد التنفيذ',
        icon: <Camera size={20} />,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        status: [
          BookingStatus.SHOOTING,
          BookingStatus.SELECTION,
          BookingStatus.EDITING,
          BookingStatus.PRINTING,
          BookingStatus.READY_TO_PRINT,
          BookingStatus.READY_FOR_PICKUP
        ]
      },
      {
        id: 'delivered',
        title: 'تم',
        icon: <CheckCircle2 size={20} />,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        status: [BookingStatus.SHOOTING_COMPLETED, BookingStatus.DELIVERED, BookingStatus.ARCHIVED]
      }
    ];
  }, []);

  const handleDrop = (bookingId: string, targetColumnId: string) => {
    if (!onStatusUpdate) return;
    
    // Get current booking to determine appropriate next status
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const currentStatus = booking.status;
    
    // ✅ DEBUG LOGS
    console.log('[ReceptionWorkflow] handleDrop called');
    console.log('[ReceptionWorkflow] bookingId:', bookingId);
    console.log('[ReceptionWorkflow] targetColumnId:', targetColumnId);
    console.log('[ReceptionWorkflow] currentStatus:', currentStatus);
    console.log('[ReceptionWorkflow] BookingStatus.SHOOTING:', BookingStatus.SHOOTING);
    console.log('[ReceptionWorkflow] Are they equal?:', currentStatus === BookingStatus.SHOOTING);
    
    // Map column ID to appropriate status based on current state
    let newStatus: BookingStatus;
    switch (targetColumnId) {
      case 'upcoming': 
        newStatus = BookingStatus.CONFIRMED; 
        break;
      case 'in-progress': 
        // ✅ SMART STATUS: Determine appropriate status based on current state
        console.log('[ReceptionWorkflow] in-progress branch - checking currentStatus...');
        if (currentStatus === BookingStatus.CONFIRMED) {
          // Moving from upcoming to in-progress: start shooting
          newStatus = BookingStatus.SHOOTING;
          console.log('[ReceptionWorkflow] → Setting to SHOOTING (was CONFIRMED)');
        } else if (currentStatus === BookingStatus.SHOOTING) {
          // Moving from shooting within in-progress: mark as completed
          newStatus = BookingStatus.SHOOTING_COMPLETED;
          console.log('[ReceptionWorkflow] → Setting to SHOOTING_COMPLETED (was SHOOTING)');
        } else {
          // Default for other states - keep current status or advance logically
          console.log('[ReceptionWorkflow] → Default case, currentStatus:', currentStatus);
          // If already in progress (editing, selection, etc.), don't change
          newStatus = currentStatus;
        }
        break;
      case 'delivered':
        // ✅ FIX: Drag to "تم" = انتهى التصوير (SHOOTING_COMPLETED) - safe for workflow
        newStatus = BookingStatus.SHOOTING_COMPLETED;
        break;
      default: return;
    }
    
    console.log('[ReceptionWorkflow] Final newStatus:', newStatus);
    console.log('[ReceptionWorkflow] Calling onStatusUpdate...');
    onStatusUpdate(bookingId, newStatus);
  };

  // ✅ Handler لإضافة خدمة إضافية — currency-aware
  const handleAddExtraItem = (
    amount: number,
    description: string,
    addOnCurrency: 'IQD' | 'USD' = 'IQD'
  ) => {
    if (!selectedBookingForAction || !onUpdateBooking) return;

    const currentExtraItems = selectedBookingForAction.details?.extraItems || [];
    const newItem = {
      id: Date.now().toString(),
      amount,
      description,
    };
    const updatedExtraItems = [...currentExtraItems, newItem];

    const bookingCurrency = selectedBookingForAction.currency || 'IQD';
    const isSameCurrency = addOnCurrency === bookingCurrency;

    const updates: Partial<Booking> = {
      details: {
        ...selectedBookingForAction.details,
        extraItems: updatedExtraItems,
      },
    };

    if (isSameCurrency) {
      updates.totalAmount = selectedBookingForAction.totalAmount + amount;
      updates.paidAmount = selectedBookingForAction.paidAmount + amount; // ✅ المبلغ الإضافي مستلم فوراً
    } else {
      // Different currency: store in addOnTotal, don't mix into totalAmount
      if (!selectedBookingForAction.originalPackagePrice) {
        updates.originalPackagePrice = selectedBookingForAction.totalAmount;
      }
      updates.addOnTotal = (selectedBookingForAction.addOnTotal || 0) + amount;
    }

    onUpdateBooking(selectedBookingForAction.id, updates);

    const currencyLabel = addOnCurrency === 'USD' ? '$' : 'د.ع';
    toast.success(`تم إضافة ${amount.toLocaleString()} ${currencyLabel} للحجز`);
    setShowAddExtraModal(false);
    setSelectedBookingForAction(null);
  };

  return (
    <div className="flex-1 flex gap-6 p-6 h-full overflow-hidden bg-[#121212]/50" dir="rtl">
      {columns.map(column => (
        <WorkflowColumn
          key={column.id}
          column={column}
          bookings={bookings.filter(b => column.status.includes(b.status))}
          users={users}
          onViewBooking={onViewBooking}
          onDrop={handleDrop}
          onQuickAction={(booking) => {
            setSelectedBookingForAction(booking);
            setShowAddExtraModal(true);
          }}
        />
      ))}

      {/* ✅ Modal إضافة خدمة */}
      <AddExtraItemModal
        isOpen={showAddExtraModal}
        onClose={() => {
          setShowAddExtraModal(false);
          setSelectedBookingForAction(null);
        }}
        onAdd={(amount, description, currency) =>
          handleAddExtraItem(amount, description, currency === 'USD' ? 'USD' : 'IQD')
        }
        bookingCurrency={selectedBookingForAction?.currency === 'USD' ? 'USD' : 'IQD'}
      />
    </div>
  );
};

interface WorkflowColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  status: BookingStatus[];
}

interface WorkflowColumnProps {
  column: WorkflowColumn;
  bookings: Booking[];
  users: User[];
  onViewBooking?: (id: string, tab?: string) => void;
  onDrop: (bookingId: string, columnId: string) => void;
  onQuickAction: (booking: Booking) => void;
}

const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
  column,
  bookings,
  users,
  onViewBooking,
  onDrop,
  onQuickAction,
}) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col bg-[#1a1a1a] rounded-4xl border border-white/5 shadow-2xl transition-all",
        isOver && "ring-2 ring-white/10 bg-[#222]"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const bookingId = e.dataTransfer.getData('bookingId');
        onDrop(bookingId, column.id);
      }}
    >
      {/* Column Header */}
      <div className="p-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", column.bg, column.color)}>
            {column.icon}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{column.title}</h3>
            <span className="text-xs text-gray-500 font-medium">{bookings.length} مهام</span>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {bookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              users={users}
              onViewBooking={onViewBooking}
              onQuickAction={onQuickAction}
            />
          ))}
          {bookings.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 grayscale">
               <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-500 mb-4" />
               <p className="text-gray-400 text-sm font-bold">لا توجد مهام</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface BookingCardProps {
  booking: Booking;
  users: User[];
  onViewBooking?: (id: string, tab?: string) => void;
  onQuickAction: (booking: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, users, onViewBooking, onQuickAction }) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const timeInStage = getTimeInStage(booking.statusHistory || [], booking.status);
  const assignee = getAssigneeForStage(booking, users);
  const balance = booking.totalAmount - (booking.paidAmount || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div
        draggable
        onDragStart={(e: React.DragEvent) => {
          e.dataTransfer.setData('bookingId', booking.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => setShowQuickMenu(true)}
        className="bg-[#252525] hover:bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group relative overflow-hidden"
      >
        {/* Status Accent */}
        <div className={cn(
          "absolute top-0 right-0 w-1.5 h-full",
          booking.category === BookingCategory.WEDDING ? "bg-red-500/50" : "bg-blue-500/50"
        )} />

        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-white font-bold text-sm mb-1 group-hover:text-white transition-colors">
              {booking.clientName}
            </h4>
            <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
              <Clock size={10} />
              {booking.title} • {new Date(booking.shootDate).toLocaleDateString('ar-IQ')}
            </p>
          </div>
          <div className="bg-white/5 p-2 rounded-xl text-gray-400">
             {booking.category === BookingCategory.WEDDING ? <Camera size={16} /> : <Calendar size={16} />}
          </div>
        </div>

        {/* ✅ Financial Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
            <span className="text-[9px] text-emerald-400 font-bold">
              الإجمالي: {formatMoney(booking.totalAmount, booking.currency)}
            </span>
          </div>
          {balance > 0 && (
            <div className="bg-rose-500/10 px-2 py-1 rounded-lg">
              <span className="text-[9px] text-rose-400 font-bold">
                متبقي: {formatMoney(balance, booking.currency)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
              {booking.status === BookingStatus.DELIVERED ? (
                 <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                    <CheckCircle2 size={12} />
                    <span>تم التسليم</span>
                 </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                      <Clock size={12} className="text-gray-500" />
                      <span>منذ {timeInStage} يوم</span>
                  </div>
                  {timeInStage > 5 && booking.status !== BookingStatus.CONFIRMED && (
                    <div className="flex items-center gap-1 text-red-400">
                        <AlertTriangle size={12} />
                        <span className="text-[9px] font-black uppercase">متأخر</span>
                    </div>
                  )}
                </>
              )}
          </div>

          {assignee && (
            <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-linear-to-br from-purple-500 to-pink-500")}>
                {assignee.name.charAt(0)}
              </div>
              <span className="text-[10px] font-bold text-gray-400 truncate max-w-[60px]">{assignee.name.split(' ')[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Quick Action Menu (Popup) */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
            onClick={() => setShowQuickMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1c22] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-black">
                    {booking.clientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{booking.clientName}</h3>
                    <p className="text-xs text-gray-500">{booking.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickMenu(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Financial Summary */}
              <div className="bg-black/40 rounded-2xl p-4 mb-6 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">الإجمالي</span>
                  <span className="text-white font-bold">{formatMoney(booking.totalAmount, booking.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">المدفوع</span>
                  <span className="text-emerald-400 font-bold">{formatMoney(booking.paidAmount || 0, booking.currency)}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">المتبقي</span>
                  <span className={cn("font-bold", balance > 0 ? "text-rose-400" : "text-gray-500")}>
                    {formatMoney(balance, booking.currency)}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                {/* ✅ إضافة خدمة */}
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onQuickAction(booking);
                  }}
                  className="w-full py-3.5 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  إضافة خدمة إضافية
                </button>

                {/* عرض التفاصيل الكاملة */}
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onViewBooking?.(booking.id, 'financials');
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} />
                  عرض التفاصيل المالية
                </button>

                {/* بيانات العميل */}
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onViewBooking?.(booking.id, 'client');
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-2xl font-medium transition-all text-sm"
                >
                  بيانات العميل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReceptionWorkflow;
