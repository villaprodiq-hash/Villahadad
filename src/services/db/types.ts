// ===== Users Table =====
export interface UsersTable {
  id: string; // UUID
  name: string;
  role: string;
  avatar: string | null;
  password: string | null;
  email: string | null;
  jobTitle: string | null;
  preferences: string | null; // JSON string
  deletedAt: number | null;
}

// ===== Bookings Table =====
export interface BookingsTable {
  id: string; // UUID
  location: string | null;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  category: string;
  title: string;
  shootDate: string | null; // ISO Date String
  status: string;
  totalAmount: number; // REAL
  paidAmount: number; // REAL
  currency: string;
  servicePackage: string | null;
  details: string | null; // JSON string
  nasStatus: string | null;
  nasProgress: number | null;
  notes: string | null;
  assignedShooter: string | null;
  assignedPhotoEditor: string | null;
  assignedPrinter: string | null;
  assignedReceptionist: string | null;
  statusHistory: string | null; // JSON string
  createdBy: string | null;
  created_by: string | null; // ✅ FIX: Added snake_case
  updatedBy: string | null;
  updated_by: string | null; // ✅ FIX: Added snake_case
  updatedAt: string | null;
  updated_at: string | null; // ✅ FIX: Added snake_case
  deletedAt: number | null;
  actualSelectionDate: string | null;
  deliveryDeadline: string | null;
  photoEditCompletedAt: string | null;
  videoEditCompletedAt: string | null;
  printCompletedAt: string | null;
  paymentReceivedBy: string | null;
  paymentReceivedAt: string | null;
  // Exchange rate for multi-currency
  exchangeRate: number | null;
  // Add-on fields
  originalPackagePrice: number | null;
  addOnTotal: number | null;
  paymentHistory: string | null; // JSON string
  invoiceHistory: string | null; // JSON string
}

// ===== Payments Table =====
export interface PaymentsTable {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: string;
  collectedBy: string;
  notes: string | null;
  deletedAt: number | null;
  // Extended fields for add-on support
  currency: string | null;
  exchangeRate: number | null;
  convertedAmount: number | null;
  type: string | null; // 'initial_deposit' | 'installment' | 'add_on_payment' | 'final_settlement'
  relatedAddOnId: string | null;
}

// ===== Reminders Table =====
export interface RemindersTable {
  id: string;
  bookingId: string | null;
  title: string;
  dueDate: string;
  completed: number; // 0 or 1
  type: string;
  customIcon: string | null;
  deletedAt: number | null;
}

// ===== Dashboard Tasks Table =====
export interface DashboardTasksTable {
  id: string;
  title: string;
  time: string | null;
  completed: number;
  type: string;
  source: string | null;
  relatedBookingId: string | null;
  priority: string | null;
  deletedAt: number | null;
}

// ===== Sync Queue Table =====
export interface SyncQueueTable {
  id: string;
  action: string;
  entity: string;
  data: string; // JSON content
  status: string | null;
  createdAt: string;
  retryCount: number | null;
}

// ===== Leaves Table =====
export interface LeavesTable {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  status: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ===== Activity Logs Table =====
export interface ActivityLogsTable {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null; // JSON string
  createdAt: string;
}

// ===== Daily Attendance Table =====
export interface DailyAttendanceTable {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  totalHours: number | null;
  isFrozen: number | null;
  createdAt: string;
  updatedAt: string;
  // Optional snake_case compatibility for cloud payload mapping
  user_id?: string;
  user_name?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Messages Table =====
export interface MessagesTable {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string | null;
  type: string;
  createdAt: string;
  isRead: number | null; // 0 or 1
}

// ===== Packages Table =====
export interface PackagesTable {
  id: string;
  category: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  currency: string;
  discountType: string | null;
  discountValue: number | null;
  discountStart: string | null;
  discountEnd: string | null;
  isCustom: number | null; // 0 or 1
  isActive: number | null; // 0 or 1
  isBestseller: number | null; // 0 or 1
  features: string | null; // JSON string
  details: string | null; // JSON string
  createdAt: string;
  updatedAt: string;
  deletedAt: number | null;
}

// ===== Discount Codes Table =====
export interface DiscountCodesTable {
  id: string;
  code: string;
  type: string; // 'percentage' | 'fixed'
  value: number;
  startAt: string;
  endAt: string | null;
  isActive: number;
  isPublished: number;
  createdBy: string;
  createdByName: string;
  notes: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: number | null;
}

// ===== Discount Redemptions Table =====
export interface DiscountRedemptionsTable {
  id: string;
  discountCodeId: string;
  bookingId: string;
  code: string;
  type: string; // 'percentage' | 'fixed'
  value: number;
  discountAmount: number;
  subtotalAmount: number;
  finalAmount: number;
  reason: string | null;
  appliedBy: string;
  appliedByName: string;
  appliedAt: string;
}

// ===== Add-Ons Table =====
export interface AddOnsTable {
  id: string;
  bookingId: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  convertedAmount: number;
  status: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  originalPackagePrice: number;
  previousTotal: number;
  newTotal: number;
  customerNotifiedAt: string | null;
  notificationMethod: string | null;
  invoiceId: string | null;
  invoicedAt: string | null;
  paymentRecordId: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: number | null;
}

// ===== Add-On Audit Table =====
export interface AddOnAuditTable {
  id: string;
  addOnId: string;
  bookingId: string;
  action: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  details: string;
  oldValues: string | null; // JSON
  newValues: string | null; // JSON
}

// ===== Client Transactions Table =====
export interface ClientTransactionsTable {
  id: string;
  clientId: string;
  bookingId: string | null;
  amount: number;
  currency: string;
  type: string; // 'credit_addition', 'credit_deduction', 'refund', 'adjustment'
  note: string;
  status: string; // 'active', 'reversed', 'pending'
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  canReverseUntil: string; // ISO timestamp
  reversedAt: string | null;
  reversedBy: string | null;
  reversedByName: string | null;
  reversalReason: string | null;
  balanceAfter: number;
}

// ===== Sessions Table (Photoshoot Sessions) =====
// Matches schema.ts sessions table definition
export interface SessionsTable {
  id: string;
  bookingId: string | null;
  clientName: string;
  nasPath: string | null;
  folderPath?: string | null; // Legacy alias used by session UI
  cloudGalleryUrl: string | null;
  status: 'ingesting' | 'selecting' | 'editing' | 'printing' | 'completed';
  totalImages: number;
  selectedImages: number;
  uploadProgress: number;
  selectionMethod: 'studio' | 'remote' | 'hybrid';
  selectionConfirmedAt: string | null;
  r2CleanupAfter: string | null;
  r2Cleaned: number; // 0 or 1
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
}

// ===== Session Images Table =====
// Matches schema.ts session_images table definition
export interface SessionImagesTable {
  id: string;
  sessionId: string;
  bookingId: string | null;
  fileName: string;
  originalPath: string | null;
  cloudUrl: string | null;
  thumbnailUrl: string | null;
  status: 'pending' | 'selected' | 'rejected' | 'editing' | 'final';
  isSelected?: boolean; // Legacy UI alias; maps to status === 'selected'
  selectedBy: string | null;
  selectedAt: string | null;
  liked: number; // 0 or 1
  notes: string | null;
  sortOrder: number;
  uploadedAt: string;
  updatedAt: string | null;
  syncedToCloud: number; // 0 or 1
}

// ===== Inventory Tables =====
export interface InventoryTable {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  status: string | null;
  assignedTo: string | null;
  batteryCharged: number | null;
  batteryTotal: number | null;
  memoryFree: number | null;
  memoryTotal: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface InventoryLogsTable {
  id: string;
  itemId: string;
  action: string;
  userId: string;
  details: string | null;
  createdAt: string;
}

// For UI state management (not in DB)
export type SessionSelectorRole = 'client' | 'selector' | 'designer';
export type SessionUIStatus = 'ingesting' | 'selecting' | 'editing' | 'printing' | 'completed';

// ===== Database Interface =====
export interface Database {
  users: UsersTable;
  bookings: BookingsTable;
  payments: PaymentsTable;
  reminders: RemindersTable;
  dashboard_tasks: DashboardTasksTable;
  sync_queue: SyncQueueTable;
  leaves: LeavesTable;
  activity_logs: ActivityLogsTable;
  daily_attendance: DailyAttendanceTable;
  messages: MessagesTable;
  packages: PackagesTable;
  discount_codes: DiscountCodesTable;
  discount_redemptions: DiscountRedemptionsTable;
  add_ons: AddOnsTable;
  add_on_audit: AddOnAuditTable;
  client_transactions: ClientTransactionsTable;
  sessions: SessionsTable;
  session_images: SessionImagesTable;
  inventory: InventoryTable;
  inventory_logs: InventoryLogsTable;
}
