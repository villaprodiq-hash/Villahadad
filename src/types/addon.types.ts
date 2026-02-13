import { Currency } from './shared.types';

// Add-On Status
export type AddOnStatus = 'pending' | 'approved' | 'rejected' | 'invoiced' | 'paid';

// Add-On Category
export type AddOnCategory =
  | 'additional_edits'
  | 'extra_prints'
  | 'album_upgrade'
  | 'additional_hours'
  | 'special_effects'
  | 'rush_delivery'
  | 'custom_request';

// Category Labels in Arabic
export const AddOnCategoryLabels: Record<AddOnCategory, string> = {
  additional_edits: 'تعديلات إضافية',
  extra_prints: 'طبعات إضافية',
  album_upgrade: 'ترقية الألبوم',
  additional_hours: 'ساعات إضافية',
  special_effects: 'مؤثرات خاصة',
  rush_delivery: 'تسليم مستعجل',
  custom_request: 'طلب مخصص',
};

// Status Labels in Arabic
export const AddOnStatusLabels: Record<AddOnStatus, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  invoiced: 'تمت الفوترة',
  paid: 'مدفوع',
};

// Main Add-On Item Interface
export interface AddOnItem {
  id: string;
  bookingId: string;
  category: AddOnCategory;
  description: string;
  amount: number;
  currency: Currency;
  exchangeRate: number; // IQD per USD at time of creation
  convertedAmount: number; // Amount in IQD
  status: AddOnStatus;

  // Authorization tracking
  requestedBy: string; // User ID
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string; // User ID
  approvedByName?: string;
  approvedAt?: string;

  // Financial attribution
  originalPackagePrice: number; // Snapshot of package price at creation
  previousTotal: number; // Total before this add-on
  newTotal: number; // Total after this add-on

  // Customer notification
  customerNotifiedAt?: string;
  notificationMethod?: 'whatsapp' | 'sms' | 'email';

  // Invoice tracking
  invoiceId?: string;
  invoicedAt?: string;

  // Payment tracking
  paymentRecordId?: string;
  paidAt?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: number;
}

// Add-On Summary for a Booking
export interface AddOnSummary {
  bookingId: string;
  originalPackagePrice: number;
  totalAddOns: number;
  totalAddOnAmount: number;
  currentTotal: number;
  paidAmount: number;
  remainingBalance: number;
  currency: Currency;
  items: AddOnItem[];
}

// Add-On Audit Entry
export interface AddOnAuditEntry {
  id: string;
  addOnId: string;
  bookingId: string;
  action: 'created' | 'approved' | 'rejected' | 'modified' | 'deleted' | 'invoiced' | 'paid';
  performedBy: string;
  performedByName: string;
  performedAt: string;
  details: string;
  oldValues?: Partial<AddOnItem>;
  newValues?: Partial<AddOnItem>;
}

// Payment History Entry (Extended)
export interface PaymentHistoryEntry {
  id: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  convertedAmount: number;
  type: 'initial_deposit' | 'installment' | 'add_on_payment' | 'final_settlement';
  relatedAddOnId?: string;
  paidAt: string;
  receivedBy: string;
  paymentMethod: 'Cash' | 'Mastercard' | 'ZainCash';
  notes?: string;
}

// Invoice Entry
export interface InvoiceEntry {
  id: string;
  invoiceNumber: string;
  type: 'original' | 'updated' | 'add_on';
  generatedAt: string;
  generatedBy: string;
  totalAmount: number;
  currency: Currency;
  addOnIds?: string[];
  pdfUrl?: string;
  sentToCustomer: boolean;
  sentAt?: string;
}

// Create Add-On Request Data
export interface CreateAddOnData {
  category: AddOnCategory;
  description: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  notes?: string;
}

// Add-On Notification
export interface AddOnNotification {
  id: string;
  addOnId: string;
  bookingId: string;
  type: 'request' | 'approved' | 'invoice_ready' | 'payment_reminder';
  method: 'whatsapp' | 'sms' | 'email';
  recipient: string;
  message: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
}
