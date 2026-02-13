import React, { useMemo } from 'react';
import { Booking } from '../../types';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface TimelineWidgetProps {
  booking: Booking;
}

const TimelineWidget: React.FC<TimelineWidgetProps> = ({ booking }) => {
  
  // حساب المواعيد النهائية
  const timeline = useMemo(() => {
    const shootDate = new Date(booking.shootDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Phase 1: Selection Deadline = Shoot Date + 60 days
    const selectionDeadline = new Date(shootDate);
    selectionDeadline.setDate(selectionDeadline.getDate() + 60);
    
    // Check if client is delayed
    const actualSelectionDate = booking.actualSelectionDate 
      ? new Date(booking.actualSelectionDate) 
      : null;
    
    const isClientDelayed = !actualSelectionDate && today > selectionDeadline;
    
    // Phase 2: Delivery Deadline = Actual Selection Date + 60 days
    const deliveryDeadline = actualSelectionDate 
      ? new Date(actualSelectionDate.getTime() + 60 * 24 * 60 * 60 * 1000)
      : null;
    
    // حساب الأيام المتبقية
    const daysUntilSelection = actualSelectionDate 
      ? 0 
      : Math.ceil((selectionDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const daysUntilDelivery = deliveryDeadline 
      ? Math.ceil((deliveryDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    // تحديد المرحلة الحالية
    const currentPhase = actualSelectionDate 
      ? (deliveryDeadline && today < deliveryDeadline ? 'delivery' : 'completed')
      : (isClientDelayed ? 'delayed' : 'selection');
    
    return {
      selectionDeadline,
      deliveryDeadline,
      isClientDelayed,
      daysUntilSelection,
      daysUntilDelivery,
      currentPhase,
      actualSelectionDate
    };
  }, [booking.shootDate, booking.actualSelectionDate]);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <div className="bg-[#21242b] rounded-[2rem] p-6 shadow-[10px_10px_20px_#16181d,-10px_-10px_20px_#2c3039] border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Clock size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">الجدول الزمني</h3>
          <p className="text-[10px] text-gray-500">قاعدة 60-60 للحماية القانونية</p>
        </div>
      </div>
      
      {/* Timeline Phases */}
      <div className="space-y-4">
        
        {/* Phase 1: Selection */}
        <div className={`p-4 rounded-xl border transition-all ${
          timeline.currentPhase === 'selection' 
            ? 'bg-blue-500/10 border-blue-500/30' 
            : timeline.currentPhase === 'delayed'
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className={
                timeline.currentPhase === 'delayed' ? 'text-orange-500' : 'text-blue-400'
              } />
              <span className="text-xs font-bold text-white">المرحلة 1: اختيار الصور</span>
            </div>
            {timeline.actualSelectionDate && (
              <CheckCircle size={16} className="text-green-500" />
            )}
          </div>
          
          <div className="text-[11px] text-gray-400 space-y-1">
            <div>الموعد النهائي: {formatDate(timeline.selectionDeadline)}</div>
            {timeline.actualSelectionDate && (
              <div className="text-green-400">
                ✓ تم الاختيار في: {formatDate(timeline.actualSelectionDate)}
              </div>
            )}
            {!timeline.actualSelectionDate && (
              <div className={timeline.isClientDelayed ? 'text-orange-500 font-bold' : 'text-gray-400'}>
                {timeline.isClientDelayed ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={12} />
                    تأخير العميل: {Math.abs(timeline.daysUntilSelection)} يوم
                  </div>
                ) : (
                  `متبقي: ${timeline.daysUntilSelection} يوم`
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Phase 2: Delivery */}
        {timeline.deliveryDeadline && (
          <div className={`p-4 rounded-xl border transition-all ${
            timeline.currentPhase === 'delivery' 
              ? 'bg-purple-500/10 border-purple-500/30' 
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-purple-400" />
                <span className="text-xs font-bold text-white">المرحلة 2: التسليم</span>
              </div>
              {timeline.currentPhase === 'completed' && (
                <CheckCircle size={16} className="text-green-500" />
              )}
            </div>
            
            <div className="text-[11px] text-gray-400 space-y-1">
              <div>الموعد النهائي: {formatDate(timeline.deliveryDeadline)}</div>
              {timeline.daysUntilDelivery !== null && (
                <div className={timeline.daysUntilDelivery < 0 ? 'text-red-500' : 'text-gray-400'}>
                  {timeline.daysUntilDelivery < 0 
                    ? `متأخر: ${Math.abs(timeline.daysUntilDelivery)} يوم`
                    : `متبقي: ${timeline.daysUntilDelivery} يوم`
                  }
                </div>
              )}
            </div>
          </div>
        )}
        
      </div>
      
      {/* Alert Box for Client Delay */}
      {timeline.isClientDelayed && (
        <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-500">تنبيه: تأخير من العميل</p>
              <p className="text-[10px] text-gray-400 mt-1">
                العميل لم يختر الصور بعد. الموعد النهائي للتسليم سيبدأ من تاريخ الاختيار الفعلي.
              </p>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default TimelineWidget;
