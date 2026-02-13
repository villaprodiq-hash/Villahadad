import { Currency } from './shared.types';

// Booking Categories
export enum BookingCategory {
  WEDDING = 'Wedding',
  SHOOT = 'Shoot',              // ✅ جلسات التصوير (كادرنا يصور)
  LOCATION = 'Location',        // ✅ تأجير الموقع/الفيلا (المصور مع العميل)
  STUDIO = 'Studio',
  BIRTHDAY = 'Birthday',
  GRADUATION = 'Graduation',
  FAMILY = 'Family',
  TRANSACTION = 'Transaction',
}

// Booking Statuses
export enum BookingStatus {
  INQUIRY = 'Inquiry',
  CONFIRMED = 'Confirmed',
  SHOOTING = 'Shooting',
  SHOOTING_COMPLETED = 'Shooting Completed',
  SELECTION = 'Selection',
  EDITING = 'Editing',
  READY_TO_PRINT = 'Ready to Print',
  PRINTING = 'Printing',
  READY_FOR_PICKUP = 'Ready for Pickup',
  DELIVERED = 'Delivered',
  ARCHIVED = 'Archived',
  CLIENT_DELAY = 'Client Delay',
}

// Extra Service
export interface ExtraService {
  id: string;
  description: string;
  amount: number;
  currency?: Currency; // ✅ Support mixed currencies (USD/IQD)
}

// Booking Details
export interface BookingDetails {
  groomName?: string;
  brideName?: string;
  groomBirthday?: string;
  brideBirthday?: string;
  hallName?: string;
  personName?: string;
  university?: string;
  gownColor?: string;
  weather?: {
    temp: number;
    condition: string;
    sunset: string;
    humidity?: number;
  };
  backgroundTheme?: string;
  themeCount?: number;
  familyName?: string;
  childName?: string;
  age?: number;
  rentalType?: 'Full' | 'Zone';
  startTime?: string;
  endTime?: string;
  duration?: number;
  isPrivate?: boolean;
  isPhotographer?: boolean;
  notes?: string;
  allowPublishing?: boolean;
  allowPhotography?: boolean;
  zaffaTime?: string;
  secondaryPhone?: string;
  printerNotificationSentAt?: string;
  printerDeliveredAt?: string;
  actualArrivalTime?: string;
  selectionAppointment?: string;
}

// Status History Item
export interface StatusHistoryItem {
  status: BookingStatus;
  timestamp: string;
  userId?: string;
  notes?: string;
}

// Main Booking Interface
export interface Booking {
  location: string;
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  category: BookingCategory;
  title: string;
  shootDate: string;
  status: BookingStatus;
  totalAmount: number;
  paidAmount: number;
  currency: Currency;
  servicePackage: string;
  nasStatus?: 'none' | 'pending' | 'synced' | 'error';
  nasProgress?: number;
  details?: BookingDetails;
  folderPath?: string;
  extras?: ExtraService[];
  notes?: string;
  selectionDeadline?: string;
  actualSelectionDate?: string;
  deliveryDeadline?: string;
  isClientDelayed?: boolean;
  exchangeRate?: number;
  convertedAmount?: number;
  paymentMethod?: 'Cash' | 'Mastercard' | 'ZainCash';
  receivedBy?: string;
  zainCashTransactionId?: string;
  retouchPreferences?: any; // Will be imported from retouch.types.ts
  imageRetouchTags?: any[]; // Will be imported from retouch.types.ts
  assignedPhotoEditor?: string;
  assignedVideoEditor?: string;
  assignedPrinter?: string;
  assignedShooter?: string;
  assignedReceptionist?: string;
  isFamous?: boolean;
  isVIP?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  conflictDetails?: string;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByRole?: string;
  rejectedAt?: string;
  statusHistory?: StatusHistoryItem[];
  createdAt?: string;
  source?: 'website' | 'manual';
  client_token?: string;
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
  photoEditCompletedAt?: string;
  videoEditCompletedAt?: string;
  printCompletedAt?: string;
  // Soft delete
  deletedAt?: number | string;
  // Financial add-on fields
  originalPackagePrice?: number;
  addOnTotal?: number;
  paymentHistory?: any;
  invoiceHistory?: any;
  // Crew/Priority
  isPriority?: boolean;
  isCrewShooting?: boolean;
}
