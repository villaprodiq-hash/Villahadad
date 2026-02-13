// App Notification Interface
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'payment' | 'system' | 'workflow_reminder' | 'nas_cleanup' | 'r2_cleanup';
  /** Roles that should see this notification */
  targetRoles?: string[];
  /** Related booking ID for navigation */
  bookingId?: string;
}
