import React from 'react';
import BookingWorkflow from './BookingWorkflow';
import ReceptionWorkflow from './reception/Workflow/ReceptionWorkflow';
import ReceptionPageWrapper from './reception/layout/ReceptionPageWrapper';
import { Booking, BookingStatus, User } from '../types';

interface WorkflowViewProps {
  bookings: Booking[];
  users: User[];
  isDraggable?: boolean;
  onViewBooking?: (id: string, tab?: string) => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => void;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => void;
  isReception?: boolean;
  isManager?: boolean;
}

const WorkflowView: React.FC<WorkflowViewProps> = ({ 
  bookings, 
  users,
  isDraggable, 
  onViewBooking,
  onStatusUpdate,
  onUpdateBooking,
  isReception = true,
  isManager = false
}) => {
  return (
    <ReceptionPageWrapper isDraggable={isDraggable} isReception={isReception} isManager={isManager} hideBackground noPadding>
      <div className="flex flex-col h-full animate-in fade-in" dir="rtl">
        {isManager ? (
          <BookingWorkflow 
            bookings={bookings} 
            users={users}
            onViewBooking={onViewBooking} 
            onStatusUpdate={onStatusUpdate}
            isManager={isManager}
          />
        ) : (
          <ReceptionWorkflow 
            bookings={bookings} 
            users={users}
            onViewBooking={onViewBooking} 
            onStatusUpdate={onStatusUpdate}
            onUpdateBooking={onUpdateBooking}
          />
        )}
      </div>
    </ReceptionPageWrapper>
  );
};

export default WorkflowView;
