// Reminder Type
export type ReminderType = 'general' | 'payment' | 'shooting' | 'editing' | 'delivery';

// Reminder Interface
export interface Reminder {
  id: string;
  bookingId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  type: ReminderType;
  customIcon?: string;
}

// Dashboard Task Interface
export interface DashboardTask {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  type: ReminderType;
  source: 'system' | 'manual' | 'supervisor';
  relatedBookingId?: string;
  assignedBy?: string;
  priority?: 'normal' | 'high' | 'urgent';
}
