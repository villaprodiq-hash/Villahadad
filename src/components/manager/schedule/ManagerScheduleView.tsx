import React, { useState } from 'react';
import { Booking } from '../../../types';
import ScheduleCalendarWidget from './widgets/ScheduleCalendarWidget';
import DailyAgendaWidget from './widgets/DailyAgendaWidget';
import ApprovalRequestsWidget from './widgets/ApprovalRequestsWidget';

interface ScheduleViewProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
}

const ManagerScheduleView: React.FC<ScheduleViewProps> = ({ bookings: initialBookings, onSelectBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [bookings, setBookings] = useState(initialBookings); 

  // Mock handlers for approval actions (In real app, these would call API)
  const handleApprove = (id: string) => {
      console.log(`Approved booking ${id}`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: 'approved' } : b));
  };
  
  const handleReject = (id: string) => {
      console.log(`Rejected booking ${id}`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: 'rejected' } : b));
  };

  // Filter daily bookings
  const dailyBookings = bookings.filter(b => 
    new Date(b.shootDate).toDateString() === selectedDay.toDateString() &&
    b.approvalStatus !== 'rejected' // Don't show rejected
  );

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-y-auto custom-scrollbar">
      
      {/* 0. Approval Lock Manager (Shows only if pending requests exist) */}
      <ApprovalRequestsWidget 
          bookings={bookings} 
          onApprove={handleApprove} 
          onReject={handleReject} 
      />

      <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* 1. Left Side: The Big Calendar */}
          <div className="flex-1">
             <ScheduleCalendarWidget 
                currentDate={currentDate}
                selectedDay={selectedDay}
                bookings={bookings.filter(b => b.approvalStatus !== 'rejected')}
                onMonthChange={changeMonth}
                onDaySelect={setSelectedDay}
            />
          </div>

          {/* 2. Right Side: Daily Agenda */}
          <div className="w-full lg:w-96">
            <DailyAgendaWidget 
                selectedDay={selectedDay}
                dailyBookings={dailyBookings}
                onSelectBooking={onSelectBooking}
            />
          </div>
      </div>
    </div>
  );
};

export default ManagerScheduleView;
