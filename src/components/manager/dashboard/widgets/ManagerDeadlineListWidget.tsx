import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ManagerDashboardCard from './ManagerDashboardCard';
import { Booking, BookingStatus } from '../../../../types';

const ManagerDeadlineListWidget = ({ bookings = [] }: { bookings?: Booking[] }) => {
  // Calculate Real Deadlines — Only show bookings WHERE client has completed photo selection
  // Delivery deadline = actualSelectionDate + 60 days
  const upcomingDeadlines = bookings
    .filter(b => {
      // Must have actualSelectionDate (client completed photo selection)
      if (!b.actualSelectionDate) return false;
      // Exclude already delivered/archived
      if (b.status === BookingStatus.DELIVERED || b.status === BookingStatus.ARCHIVED) return false;
      return true;
    })
    .map(b => {
        const actualSelectionDate = b.actualSelectionDate;
        if (!actualSelectionDate) return null;
        // Deadline = actualSelectionDate + 60 days
        const selectionDate = new Date(actualSelectionDate);
        const deadline = new Date(selectionDate);
        deadline.setDate(deadline.getDate() + 60);
        const diffTime = deadline.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            id: b.id,
            name: `${b.category} (${b.clientName})`,
            days: diffDays,
            status: b.status,
            priority: diffDays < 3 ? 'High' : diffDays < 7 ? 'Medium' : 'Normal'
        };
    })
    .filter((item): item is { id: string; name: string; days: number; status: BookingStatus; priority: string } => Boolean(item))
    .filter(item => item.days >= -7 && item.days <= 30) // Include 7 days overdue + next 30 days
    .sort((a, b) => a.days - b.days)
    .slice(0, 7);

  return (
    <ManagerDashboardCard className="h-[220px] flex flex-col justify-between" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-tajawal text-gray-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          تسليمات قريبة
        </h3>
        {upcomingDeadlines.length > 0 && (
            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full animate-pulse">{upcomingDeadlines.length} مهام</span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
        {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((item, i) => (
          <div key={item.id} className="flex flex-col gap-1.5 shrink-0">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 font-tajawal truncate max-w-[120px]">{item.name}</span>
                <span className={`text-[10px] font-bold ${item.days < 0 ? 'text-red-700' : item.days < 3 ? 'text-red-600' : 'text-orange-500'}`}>{item.days < 0 ? `متأخر ${Math.abs(item.days)} يوم` : item.days === 0 ? 'اليوم' : `${item.days} يوم`}</span>
             </div>
             <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: item.days < 3 ? '90%' : '60%' }}
                   transition={{ duration: 1, delay: i * 0.1 }}
                   className={`h-full rounded-full ${item.days < 0 ? 'bg-red-700' : item.days < 3 ? 'bg-red-500' : 'bg-orange-500'}`} 
                />
             </div>
          </div>
        )) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-xs font-tajawal">لا توجد تسليمات قريبة</p>
            </div>
        )}
      </div>
    </ManagerDashboardCard>
  );
};

export default ManagerDeadlineListWidget;
