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

export interface BookingExtraItem {
  id: string;
  amount: number;
  currency?: Currency;
  description: string;
}

export type DiscountCodeType = 'percentage' | 'fixed';

export interface AppliedDiscount {
  codeId: string;
  code: string;
  type: DiscountCodeType;
  value: number;
  reason: string;
  subtotalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedAt: string;
  appliedBy?: string;
  appliedByName?: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountCodeType;
  value: number;
  startAt: string;
  endAt?: string;
  isActive: boolean;
  isPublished: boolean;
  notes?: string;
  usageCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// Booking Details
export interface BookingDetails {
  baseAmount?: number;
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
  groomPhone?: string;
  bridePhone?: string;
  genericPhone?: string;
  secondaryPhone?: string;
  printerNotificationSentAt?: string;
  printerDeliveredAt?: string;
  printerProductId?: string;
  printerUnitPrice?: number;
  printerQuantity?: number;
  actualArrivalTime?: string;
  selectionAppointment?: string;
  selectionCompletedAt?: string;
  extraItems?: BookingExtraItem[];
  discount?: AppliedDiscount;
  // Legacy assignment/media fields used by admin/reception dashboards
  includesVideo?: boolean;
  assignedTo?: string;
  photographer?: string;
  editor?: string;
  videoNotes?: string;
  // Photo editor completion metadata
  photoEditorStartedAt?: string;
  photoEditorCompletedAt?: string;
  photoEditorCompletedById?: string;
  photoEditorCompletedByName?: string;
  photoEditorDurationMinutes?: number;
  photoEditorCompletedImages?: number;
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
  nasSessionId?: string;
  extras?: ExtraService[];
  notes?: string;
  packageName?: string;
  assignedToName?: string;
  createdByName?: string;
  selectionDeadline?: string;
  actualSelectionDate?: string;
  deliveryDeadline?: string;
  isClientDelayed?: boolean;
  exchangeRate?: number;
  convertedAmount?: number;
  paymentMethod?: 'Cash' | 'Mastercard' | 'ZainCash';
  receivedBy?: string;
  zainCashTransactionId?: string;
  retouchPreferences?: Record<string, unknown>; // Will be imported from retouch.types.ts
  imageRetouchTags?: unknown[]; // Will be imported from retouch.types.ts
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
  createdBy?: string;
  updated_by?: string;
  updatedBy?: string;
  updated_at?: string;
  photoEditCompletedAt?: string;
  videoEditCompletedAt?: string;
  printCompletedAt?: string;
  // Soft delete
  deletedAt?: number | string;
  // Financial add-on fields
  originalPackagePrice?: number;
  addOnTotal?: number;
  paymentHistory?: unknown;
  invoiceHistory?: unknown;
  // Crew/Priority
  isPriority?: boolean;
  isCrewShooting?: boolean;
}
