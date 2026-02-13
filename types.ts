export type Currency = 'USD' | 'IQD';

export enum BookingCategory {
  WEDDING = 'Wedding',
  SHOOT = 'Shoot',              // جلسات التصوير (كادرنا يصور)
  LOCATION = 'Location',        // تأجير الموقع/الفيلا (المصور مع العميل)
  STUDIO = 'Studio',
  BIRTHDAY = 'Birthday',
  GRADUATION = 'Graduation',
  FAMILY = 'Family',
  TRANSACTION = 'Transaction',
}

export enum BookingStatus {
  INQUIRY = 'Inquiry',
  CONFIRMED = 'Confirmed',
  SHOOTING = 'Shooting',
  SHOOTING_COMPLETED = 'Shooting Completed', // انتهى التصوير - بانتظار الاختيار
  SELECTION = 'Selection', // العميل يختار الصور
  EDITING = 'Editing', // المصور يعدل الصور
  READY_TO_PRINT = 'Ready to Print', // قيد الطباعة
  PRINTING = 'Printing', // جاري الطباعة الفعلي
  READY_FOR_PICKUP = 'Ready for Pickup', // جاهز للتسليم / الاستلام
  DELIVERED = 'Delivered',
  ARCHIVED = 'Archived',
  CLIENT_DELAY = 'Client Delay',
}

export const StatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.INQUIRY]: 'استفسار',
  [BookingStatus.CONFIRMED]: 'مؤكد (قادم)',
  [BookingStatus.SHOOTING]: 'جاري التصوير',
  [BookingStatus.SHOOTING_COMPLETED]: 'بانتظار الاختيار',
  [BookingStatus.SELECTION]: 'جاري الاختيار',
  [BookingStatus.EDITING]: 'قيد التعديل',
  [BookingStatus.READY_TO_PRINT]: 'في انتظار الطباعة',
  [BookingStatus.PRINTING]: 'جاري الطباعة',
  [BookingStatus.READY_FOR_PICKUP]: 'جاهز للتسليم',
  [BookingStatus.DELIVERED]: 'تم',
  [BookingStatus.ARCHIVED]: 'أرشيف',
  [BookingStatus.CLIENT_DELAY]: 'تأخير العميل',
};

export const CategoryLabels: Record<BookingCategory, string> = {
  [BookingCategory.WEDDING]: 'أعراس',
  [BookingCategory.SHOOT]: 'جلسات تصوير',
  [BookingCategory.LOCATION]: 'فيلا حداد',
  [BookingCategory.STUDIO]: 'ستوديو',
  [BookingCategory.BIRTHDAY]: 'أعياد ميلاد',
  [BookingCategory.GRADUATION]: 'تخرج',
  [BookingCategory.FAMILY]: 'عائلي',
  [BookingCategory.TRANSACTION]: 'معاملة',
};

// ===== Smart Liability & Retouch System =====

// Retouch Style Options
export type RetouchStyle = 'Natural' | 'Sura Style' | 'Custom';

// Specific Retouch Options
export type RetouchOption =
  | 'Double Chin'
  | 'Eye Opening'
  | 'Object Removal'
  | 'Teeth Whitening'
  | 'Skin Smoothing'
  | 'Hair Fix'
  | 'Body Slimming';

export const RetouchOptionLabels: Record<RetouchOption, string> = {
  'Double Chin': 'إزالة اللغلوغ',
  'Eye Opening': 'فتح العيون',
  'Object Removal': 'إزالة عنصر',
  'Teeth Whitening': 'تبييض الأسنان',
  'Skin Smoothing': 'تنعيم البشرة',
  'Hair Fix': 'إصلاح الشعر',
  'Body Slimming': 'تنحيف الجسم',
};

// Global Retouch Preferences (Layer 1)
export interface RetouchPreferences {
  style: RetouchStyle;
  globalTeethWhitening: boolean;
  globalSkinSmoothing: boolean;
  globalBodySlimming: boolean;
  notes: string;
}

// Image-Specific Retouch Tag (Layer 2)
export interface ImageRetouchTag {
  id: string;
  imageId: string;
  option: RetouchOption;
  notes?: string;
  position?: { x: number; y: number }; // للإشارة لمكان محدد في الصورة
}

export type ReminderType = 'general' | 'payment' | 'shooting' | 'editing' | 'delivery' | 'booking' | 'alert' | 'manual';

export const ReminderTypeLabels: Record<ReminderType, string> = {
  general: 'عام',
  payment: 'دفع',
  shooting: 'تصوير',
  editing: 'تعديل',
  delivery: 'تسليم',
  booking: 'حجز',
  alert: 'تنبيه',
  manual: 'يدوي',
};

export interface ExtraService {
  id: string;
  description: string;
  amount: number;
}

// بند إضافي للحجز (مبلغ + وصف)
export interface BookingExtraItem {
  id: string;
  amount: number;
  currency?: Currency; // ✅ Support mixed currencies
  description: string;
}

export interface BookingDetails {
  baseAmount?: number; // سعر الباقة الأساسية (بدون البنود الإضافية)
  groomName?: string;
  brideName?: string;
  groomBirthday?: string; // Format: YYYY-MM-DD for anniversary tracking
  brideBirthday?: string; // Format: YYYY-MM-DD for anniversary tracking
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
  childName?: string; // For birthday bookings
  age?: number; // For birthday bookings
  rentalType?: 'Full' | 'Zone';
  startTime?: string;
  endTime?: string;
  duration?: number; // hours - for pricing automation
  isPrivate?: boolean; // Private/Veiled session flag
  isPhotographer?: boolean;
  notes?: string;
  allowPublishing?: boolean;
  allowPhotography?: boolean;
  zaffaTime?: string;
  secondaryPhone?: string;
  printerNotificationSentAt?: string;
  printerDeliveredAt?: string;
  actualArrivalTime?: string; // وقت الوصول الفعلي للعميل (لحساب التأخير)
  selectionAppointment?: string; // موعد الاختيار
  extraItems?: BookingExtraItem[]; // بنود إضافية مالية
}

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

  // Smart Liability Fields (60-60 Rule)
  selectionDeadline?: string; // 60 days after shoot date
  actualSelectionDate?: string; // التاريخ الفعلي للاختيار
  deliveryDeadline?: string; // 60 days after actualSelectionDate
  isClientDelayed?: boolean; // Flag for orange alert

  // Financial Tracking
  exchangeRate?: number; // The rate at the time of booking/payment
  convertedAmount?: number; // The IQD equivalent at that time
  paymentMethod?: 'Cash' | 'Mastercard' | 'ZainCash'; // New: Payment method
  zainCashTransactionId?: string;
  receivedBy?: string; // New: Who received the payment (User Name)

  // Multi-Payment Support (for different exchange rates per payment)
  paymentRecords?: PaymentRecord[]; // سجل الدفعات مع سعر الصرف لكل دفعة

  // Retouch Fields
  retouchPreferences?: RetouchPreferences;
  imageRetouchTags?: ImageRetouchTag[];

  // Task Assignment (RBAC)
  assignedPhotoEditor?: string; // User ID
  assignedVideoEditor?: string; // User ID
  assignedPrinter?: string; // User ID
  assignedShooter?: string; // User ID
  assignedReceptionist?: string; // User ID

  // Badge Flags
  isFamous?: boolean; // عميل مشهور (تاج ذهبي)
  isVIP?: boolean; // عميل VIP
  isPriority?: boolean; // أولوية قصوى
  isCrewShooting?: boolean; // تصوير كادر

  // Manager Approval & Conflict Lock
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // For conflict overrides
  conflictDetails?: string; // Reason for the conflict (e.g. "Venue Full")

  // Audit Log / Workflow History
  statusHistory?: StatusHistoryItem[];
  createdAt?: string; // ISO String for account age calculation
  source?: 'website' | 'manual'; // Booking Source
  client_token?: string; // Token for client portal access

  // Staff Audit Trail (Individual Attribution)
  created_by?: string; // User ID (from public.users) who created booking
  updated_by?: string; // User ID (from public.users) who last modified
  updated_at?: string; // ISO String of last modification timestamp

  // Performance Metrics
  photoEditCompletedAt?: string;
  videoEditCompletedAt?: string;
  printCompletedAt?: string;

  // Add-on tracking fields
  originalPackagePrice?: number; // Immutable - set at booking creation
  addOnTotal?: number; // Sum of all approved add-ons
  paymentHistory?: PaymentHistoryEntry[]; // JSON array
  invoiceHistory?: InvoiceEntry[]; // JSON array

  // Soft Delete Fields
  deletedAt?: number; // Timestamp when soft deleted (null if active)
}

export interface StatusHistoryItem {
  status: BookingStatus;
  timestamp: string; // ISO String
  userId?: string;
  notes?: string;
}

// Payment Record for Multi-Payment Support with different exchange rates
export interface PaymentRecord {
  id: string;
  amount: number;
  currency: Currency;
  exchangeRate: number; // سعر الصرف وقت هذه الدفعة
  convertedAmount?: number; // المبلغ المحول (IQD)
  paidAt: string; // ISO String
  receivedBy?: string;
  paymentMethod?: 'Cash' | 'Mastercard' | 'ZainCash';
  notes?: string;
}

export interface NasTask {
  id: string;
  bookingId: string;
  sourcePath: string;
  destinationPath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
}

export interface Reminder {
  id: string;
  bookingId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  type: ReminderType;
  customIcon?: string;
}

// Payment History Entry for Add-On System
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

// Invoice Entry for Add-On System
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

// ===== Financial Types =====

export type ExpenseCategory =
  | 'rent'
  | 'salaries'
  | 'equipment'
  | 'marketing'
  | 'services'
  | 'printing'
  | 'other';

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  rent: 'إيجار',
  salaries: 'رواتب',
  equipment: 'معدات',
  marketing: 'ترويج وإعلان',
  services: 'خدمات',
  printing: 'طباعة وألبومات',
  other: 'نثريات أخرى',
};

export const ALBUM_PRINT_COST = 50000; // Cost in IQD

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  date: string;
  note?: string;
  isRecurring?: boolean;
  exchangeRate?: number; // Exchange rate at time of creation (IQD per USD)
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  dayOfMonth: number;
  isActive: boolean;
  createdAt?: string;
  exchangeRate?: number; // Exchange rate at time of creation (IQD per USD)
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'ZinCash' | string;
  collectedBy: string;
  notes?: string;
  deletedAt?: number | null;
}

// ===== RBAC System: 7 Roles =====

export enum UserRole {
  MANAGER = 'manager',
  ADMIN = 'admin',
  RECEPTION = 'reception',
  PHOTO_EDITOR = 'photo_editor',
  VIDEO_EDITOR = 'video_editor',
  PRINTER = 'printer',
  SELECTOR = 'selector',
}

export const RoleLabels: Record<UserRole, string> = {
  [UserRole.MANAGER]: '👑 المديرة',
  [UserRole.ADMIN]: '🎯 المشرف',
  [UserRole.RECEPTION]: 'مسؤول الحجوزات',
  [UserRole.PHOTO_EDITOR]: 'قسم التصميم',
  [UserRole.VIDEO_EDITOR]: 'المونتير',
  [UserRole.PRINTER]: 'قسم الطباعة',
  [UserRole.SELECTOR]: 'الوصيفة / العرض',
};

// Role Permissions
export interface RolePermissions {
  canViewFinancials: boolean;
  canEditBookings: boolean;
  canDeleteBookings: boolean; // New: Can delete bookings
  canViewGallery: boolean;
  canEditGallery: boolean;
  canViewClientPhone: boolean;
  canViewPrices: boolean;
  canAccessSettings: boolean;
  canAssignTasks: boolean;
  canManageUsers: boolean; // New: Can add/remove users
  canAccessDevTools: boolean; // New: Developer tools access
  canViewSystemLogs: boolean; // New: System logs access
  canApproveBookings: boolean; // صلاحية الموافقة على الحجوزات المتعارضة
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.MANAGER]: {
    canViewFinancials: true,
    canEditBookings: true,
    canDeleteBookings: true,
    canViewGallery: true,
    canEditGallery: true,
    canViewClientPhone: true,
    canViewPrices: true,
    canAccessSettings: true,
    canAssignTasks: true,
    canManageUsers: true,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: true,
  },
  [UserRole.ADMIN]: {
    canViewFinancials: true,
    canEditBookings: true,
    canDeleteBookings: true,
    canViewGallery: true,
    canEditGallery: true,
    canViewClientPhone: true,
    canViewPrices: true,
    canAccessSettings: true,
    canAssignTasks: true,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: true,
  },
  [UserRole.RECEPTION]: {
    canViewFinancials: false,
    canEditBookings: true,
    canDeleteBookings: false,
    canViewGallery: false,
    canEditGallery: false,
    canViewClientPhone: true,
    canViewPrices: true,
    canAccessSettings: false,
    canAssignTasks: false,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: false,
  },
  [UserRole.PHOTO_EDITOR]: {
    canViewFinancials: false,
    canEditBookings: false,
    canDeleteBookings: false,
    canViewGallery: true,
    canEditGallery: true,
    canViewClientPhone: false,
    canViewPrices: false,
    canAccessSettings: false,
    canAssignTasks: false,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: false,
  },
  [UserRole.VIDEO_EDITOR]: {
    canViewFinancials: false,
    canEditBookings: false,
    canDeleteBookings: false,
    canViewGallery: true,
    canEditGallery: false,
    canViewClientPhone: false,
    canViewPrices: false,
    canAccessSettings: false,
    canAssignTasks: false,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: false,
  },
  [UserRole.PRINTER]: {
    canViewFinancials: false,
    canEditBookings: false,
    canDeleteBookings: false,
    canViewGallery: true,
    canEditGallery: false,
    canViewClientPhone: false,
    canViewPrices: false,
    canAccessSettings: false,
    canAssignTasks: false,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: false,
  },
  [UserRole.SELECTOR]: {
    canViewFinancials: false,
    canEditBookings: false,
    canDeleteBookings: false,
    canViewGallery: true,
    canEditGallery: false,
    canViewClientPhone: false,
    canViewPrices: false,
    canAccessSettings: false,
    canAssignTasks: false,
    canManageUsers: false,
    canAccessDevTools: false,
    canViewSystemLogs: false,
    canApproveBookings: false,
  },
};

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  email?: string;
  password?: string; // For authentication
  jobTitle?: string; // e.g. "Morning Supervisor"
  preferences?: {
    hiddenSections?: string[];
    hiddenWidgets?: string[];
    // HR Data
    hr_strikes?: number;
    hr_performance?: number;
    hr_notes?: string;
  };
}

export interface DashboardTask {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  type: ReminderType;
  // New Fields for Task Distinction
  source: 'system' | 'manual' | 'supervisor'; // auto-generated vs user-created vs assigned
  relatedBookingId?: string; // Links to the specific booking triggering this task
  assignedBy?: string; // If supervisor assigned it
  priority?: 'normal' | 'high' | 'urgent';
  createdAt?: string;
}

export interface NotificationCounts {
  chat: number;
  [key: string]: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'payment' | 'system' | 'workflow_reminder';
}

export interface PackageData {
  id: string;
  categoryId: string;
  title: string;
  price: number;
  currency: Currency;
  features: string[];
}

export const EVENT_TYPES = [
  { id: 'vip', label: 'عروض VIP (أعراس)', mapTo: BookingCategory.WEDDING },
  { id: 'wedding_party', label: 'أعراس وحفلات (خارجي)', mapTo: BookingCategory.WEDDING },
  { id: 'wedding_studio', label: 'عروض عرسان (استوديو)', mapTo: BookingCategory.STUDIO },
  { id: 'kids', label: 'جلسات أطفال', mapTo: BookingCategory.BIRTHDAY },
  { id: 'general', label: 'جلسات منوعة (تخرج، ميلاد، حمل)', mapTo: BookingCategory.GRADUATION },
  { id: 'printing', label: 'طباعة وألبومات (Printing)', mapTo: BookingCategory.TRANSACTION },
  { id: 'location', label: 'حجز فيلا حداد', mapTo: BookingCategory.LOCATION }, // تأجير الفيلا/الاستديو
];

export const PACKAGES_DATA: PackageData[] = [
  // --- عروض تصوير (حمل، تخرج، عيد ميلاد، كبلز) ---
  {
    id: 'general_150',
    categoryId: 'general',
    title: 'العرض الأول',
    price: 150000,
    currency: 'IQD',
    features: ['مجموع الصور 10', 'اليوم قديفة 8 صور', 'صورتين ورقي قياس فوجي'],
  },
  {
    id: 'general_250',
    categoryId: 'general',
    title: 'العرض الثاني',
    price: 250000,
    currency: 'IQD',
    features: [
      'مجموع الصور 20 صورة',
      'فيديو ريلز',
      'اليوم قديفة 12 صوره',
      'صور ورقية قياس فوجي 5',
      'منضديات (2) وجداريه (1)',
      'ارسال جميع الصور على الهاتف',
    ],
  },
  {
    id: 'general_400',
    categoryId: 'general',
    title: 'العرض الثالث',
    price: 400000,
    currency: 'IQD',
    features: [
      'مجموع الصور 30 صورة',
      'ارسال جميع الصور على الهاتف',
      'التصوير في غرفة ال Vip',
      'فيديو برومو',
      'سبت فخم جداً يحتوي على',
      'اليوم كبير 10 صوره',
      'اليوم ميني 10 صور',
      'منضديات عدد 2',
      'a3+a4 جداريات عدد 2',
      'ورقيات قياس فوجي 6',
      'ارسال جميع الصور على الهاتف',
    ],
  },

  // --- عروض جلسات الأطفال والعائلية ---
  {
    id: 'kids_200',
    categoryId: 'kids',
    title: 'عرض الأطفال الأول',
    price: 200000,
    currency: 'IQD',
    features: ['مجموع الصور 10', 'اليوم قديفة 8 صور', 'منضديه(1) + جداريه (1)'],
  },
  {
    id: 'kids_350',
    categoryId: 'kids',
    title: 'عرض الأطفال الثاني',
    price: 350000,
    currency: 'IQD',
    features: [
      'مجموع الصور 20 صورة',
      'فيديو ريلز',
      'اليوم قديفة 14 صوره',
      'صور ورقية قياس فوجي 3',
      'منضديات (2) وجداريه (1)',
      'ارسال جميع الصور على الهاتف',
    ],
  },
  {
    id: 'kids_500',
    categoryId: 'kids',
    title: 'عرض الأطفال الثالث',
    price: 500000,
    currency: 'IQD',
    features: [
      'مجموع الصور 30 صورة',
      'ارسال جميع الصور على الهاتف',
      'التصوير في غرفة ال Vip',
      'فيديو برومو',
      'سبت فخم جداً يحتوي على',
      'اليوم كبير 10 صوره',
      'اليوم ميني 10 صور',
      'منضديات عدد 2',
      'a3+a4 جداريات عدد 2',
      'ورقيات قياس فوجي 6',
      'ارسال جميع الصور على الهاتف',
    ],
  },

  // --- عروض تصوير الحفلات (قاعة، بيت، مزرعة) ---
  {
    id: 'party_400',
    categoryId: 'wedding_party',
    title: 'العرض الأول',
    price: 400000,
    currency: 'IQD',
    features: [
      'تصوير كادر فيلا حداد',
      'التقاط صور عدد مفتوح على مدار ساعه ونص',
      'تعديل وطباعه وارسال 30 صوره ورقيه',
    ],
  },
  {
    id: 'party_750',
    categoryId: 'wedding_party',
    title: 'العرض الثاني',
    price: 750000,
    currency: 'IQD',
    features: [
      'التقاط صور عدد مفتوح على مدار ساعتان ونص',
      'يحتوي العرض على ريلز مده 45 ثانيه',
      'تعديل وطباعه 20 صوره مجله',
      'و30 صوره ورقيه',
      'ارسال جميع الصورة الهاتف',
    ],
  },
  {
    id: 'party_1m',
    categoryId: 'wedding_party',
    title: 'العرض الثالث',
    price: 1000000,
    currency: 'IQD',
    features: [
      'التقاط صور عدد مفتوح على طول الحفل',
      'ارسال جميع الصور على الهاتف',
      'معالجة وطباعة 80 صوره',
      'فيديو برومو',
      'سبت فخم جداً يحتوي على',
      'اليوم كبير 16 صوره',
      'اليوم ميني 10 صور',
      'منضديات عدد 2',
      'a3+a4 جداريات عدد 2',
      'اليوم مجله 10 صور',
      'ورقيات عدد 40 صوره بقياسين',
    ],
  },

  // --- عروض التصوير داخل فيلا حداد ---
  {
    id: 'wedding_studio_400',
    categoryId: 'wedding_studio',
    title: 'العرض الأول',
    price: 400000,
    currency: 'IQD',
    features: ['مجموع الصور 17 صورة', 'اليوم كبير 14 صوره', 'منضدية عدد 2', 'جدارية مقاس 30×40'],
  },
  {
    id: 'wedding_studio_700',
    categoryId: 'wedding_studio',
    title: 'العرض الثاني',
    price: 700000,
    currency: 'IQD',
    features: [
      'مجموع الصور 25 صورة',
      'فيديو ريلز',
      'اليوم كبير 12 صوره',
      'اليوم ميني 10 صور',
      'منضديات (2) وجداريه (1)',
      'ارسال جميع الصور على الهاتف',
    ],
  },
  {
    id: 'wedding_studio_1m',
    categoryId: 'wedding_studio',
    title: 'العرض الثالث',
    price: 1000000,
    currency: 'IQD',
    features: [
      'مجموع الصور 40 صورة',
      'ارسال جميع الصور على الهاتف',
      'التصوير في غرفة العروس',
      'فيديو برومو',
      'سبت فخم جداً يحتوي على',
      'اليوم كبير 14 صوره',
      'اليوم ميني 10 صور',
      'منضديات عدد 2',
      'a3+a4 جداريات عدد 2',
      'ارسال جميع الصور على الهاتف',
    ],
  },

  // --- عروض العرسان داخل فيلا حداد (صورة أخرى) ---
  {
    id: 'bride_studio_400',
    categoryId: 'wedding_studio',
    title: 'عرض العرسان الأول',
    price: 400000,
    currency: 'IQD',
    features: ['مجموع الصور 17 صورة', 'اليوم كبير 14 صوره', 'منضدية عدد 2', 'جدارية مقاس 30×40'],
  },
  {
    id: 'bride_studio_700',
    categoryId: 'wedding_studio',
    title: 'عرض العرسان الثاني',
    price: 700000,
    currency: 'IQD',
    features: [
      'مجموع الصور 25 صورة',
      'فيديو ريلز',
      'اليوم كبير 12 صوره',
      'اليوم ميني 10 صور',
      'منضديات (2) وجداريه (1)',
      'ارسال جميع الصور على الهاتف',
    ],
  },
  {
    id: 'bride_studio_1m',
    categoryId: 'wedding_studio',
    title: 'عرض العرسان الثالث',
    price: 1000000,
    currency: 'IQD',
    features: [
      'مجموع الصور 40 صورة',
      'ارسال جميع الصور على الهاتف',
      'التصوير في غرفة العروس',
      'فيديو برومو',
      'سبت فخم جداً يحتوي على',
      'اليوم كبير 14 صوره',
      'اليوم ميني 10 صور',
      'منضديات عدد 2',
      'a3+a4 جداريات عدد 2',
      'ارسال جميع الصور على الهاتف',
    ],
  },

  // --- أسعار حجز الموقع (حسب الصورة المرفقة) ---

  // 1. جلسات ومناسبات خاصة (Sessions)
  {
    id: 'venue_session_couples',
    categoryId: 'venue_session',
    title: 'جلسات العرسان',
    price: 150000,
    currency: 'IQD',
    features: ['جلسة عرسان اعتيادية'],
  },
  {
    id: 'venue_session_private',
    categoryId: 'venue_session',
    title: 'عرسان برايفت',
    price: 300000,
    currency: 'IQD',
    features: ['خصوصية تامة'],
  },
  {
    id: 'venue_session_maternity',
    categoryId: 'venue_session',
    title: 'جلسات الحمل',
    price: 75000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_session_graduation',
    categoryId: 'venue_session',
    title: 'جلسات التخرج',
    price: 75000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_session_couples_gen',
    categoryId: 'venue_session',
    title: 'كبلز',
    price: 75000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_session_kids',
    categoryId: 'venue_session',
    title: 'جلسات الاطفال',
    price: 75000,
    currency: 'IQD',
    features: [],
  },

  // 2. أجور الحجز الاعلاني (Commercial)
  {
    id: 'venue_ad_60min',
    categoryId: 'venue_commercial',
    title: 'ساعة',
    price: 150000,
    currency: 'IQD',
    features: ['الوقت 50 دقيقة'],
  },
  {
    id: 'venue_ad_3hours',
    categoryId: 'venue_commercial',
    title: '3 ساعات',
    price: 300000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_ad_monthly',
    categoryId: 'venue_commercial',
    title: 'شهرياً 4 أيام (3 ساعات)',
    price: 1000000,
    currency: 'IQD',
    features: [],
  },

  // 3. أجور حجز الغرفة ال VIP
  {
    id: 'vip_room_economy',
    categoryId: 'venue_room',
    title: 'الباقة الاقتصاديه',
    price: 75000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'vip_room_silver',
    categoryId: 'venue_room',
    title: 'الباقة الفضيه',
    price: 150000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'vip_room_gold',
    categoryId: 'venue_room',
    title: 'الباقة الذهبيه',
    price: 250000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'vip_room_royal',
    categoryId: 'venue_room',
    title: 'الباقة الملكيه',
    price: 500000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'vip_room_rental',
    categoryId: 'venue_room',
    title: 'ايجار غراض الغرفه',
    price: 50000,
    currency: 'IQD',
    features: [],
  },

  // 4. حجز الموقع بالكامل للمناسبات
  {
    id: 'venue_full_3pm_12am',
    categoryId: 'venue_party',
    title: 'من 3م - الى: 12م',
    price: 3000000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_full_4pm_11pm',
    categoryId: 'venue_party',
    title: 'من 4م - الى: 11م',
    price: 2500000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_full_5pm_10pm',
    categoryId: 'venue_party',
    title: 'من 5م - الى: 10م',
    price: 2000000,
    currency: 'IQD',
    features: [],
  },
  {
    id: 'venue_full_6pm_10pm',
    categoryId: 'venue_party',
    title: 'من 6م - الى: 10م',
    price: 1500000,
    currency: 'IQD',
    features: [],
  },

  // 5. عروض Sura VIP (بالدولار)
  {
    id: 'vip_1000',
    categoryId: 'vip',
    title: 'العرض الأول VIP (بدون حفلة)',
    price: 1000,
    currency: 'USD',
    features: [
      'مجموع الصور 70 صورة',
      'يشمل تصوير صالون وستوديو',
      'البوم العروس 10 صور + البوم العريس 10 صور',
      'البوم العرسان 45 صورة',
      'منضديات (2) + جداريات (3)',
      'ارسال جميع الصور المصورة على الهاتف',
    ],
  },
  {
    id: 'vip_1550',
    categoryId: 'vip',
    title: 'عرض FULL DAY VVIP',
    price: 1550,
    currency: 'USD',
    features: [
      'تصوير اليوم كامل (فيديو وفوتو)',
      'يشمل: صالون، جلسة، بيت أو قاعة',
      'مجموع الصور 100 صورة',
      'تصوير فيرست لوك + الحفل كامل',
      'البوم العرسان 40 + العائلة 20 + العروس 10 + العريس 10',
      'منضديات (2) + جداريات (3)',
      'فيديو تفاصيل كاملة (اكسسوارات، تحضيرات، رقصة سلو)',
      'تصوير لقطات لا محدودة',
    ],
  },
  {
    id: 'vip_2100',
    categoryId: 'vip',
    title: 'عرض ROYAL VVIP',
    price: 2100,
    currency: 'USD',
    features: [
      'تصوير اليوم كامل (فوتو + فيديو)',
      'تصوير طيارة (درون) + فيديو أرضي وجوي',
      'كادر نسائي للعروس + كادر رجالي للعريس',
      'مجموع الصور 150 صورة',
      'البوم الصالون + الجلسة + الحفل + الرمزيات',
      'اختيار عدد الصور بالتقسيم حسب الطلب',
      'تصوير لقطات لا محدودة + ريلزات وأفكار',
    ],
  },
];

// Helper Function for Dropdowns
export const formatDropdownLabel = (pkg: PackageData) => {
  const price = typeof pkg.price === 'number' ? pkg.price : 0;
  return `${pkg.title} - ${price.toLocaleString()} ${pkg.currency}`;
};

// ===== RBAC Helper Functions =====

/**
 * Check if user can see a specific booking based on role and assignment
 */
export function canUserSeeBooking(booking: Booking, currentUser: User): boolean {
  // Safety check: Don't show deleted bookings to anyone
  if (booking.deletedAt) return false;

  if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) return true;

  if (currentUser.role === UserRole.RECEPTION) return true;

  if (currentUser.role === UserRole.PHOTO_EDITOR) {
    return (
      booking.assignedPhotoEditor === currentUser.id || booking.status === BookingStatus.EDITING
    );
  }

  if (currentUser.role === UserRole.VIDEO_EDITOR) {
    return booking.assignedVideoEditor === currentUser.id;
  }

  if (currentUser.role === UserRole.PRINTER) {
    return (
      booking.assignedPrinter === currentUser.id || booking.status === BookingStatus.READY_TO_PRINT
    );
  }

  return false;
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(user: User): RolePermissions {
  return ROLE_PERMISSIONS[user.role];
}

/**
 * Mask sensitive data based on user permissions
 */
export function maskSensitiveData(data: string, user: User, dataType: 'phone' | 'price'): string {
  const permissions = getUserPermissions(user);

  if (dataType === 'phone' && !permissions.canViewClientPhone) {
    return '***-****';
  }

  if (dataType === 'price' && !permissions.canViewPrices) {
    return '****';
  }

  return data;
}

// Legacy support if needed, but we encourage using PACKAGES_DATA
export const PACKAGES: Record<string, unknown[]> = {};

export interface Package {
  id: string;
  category: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  currency: 'USD' | 'IQD';
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;
  isCustom: boolean;
  isActive: boolean;
  isBestseller: boolean;
  features: string[];
  details?: unknown;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;

  // Backward compatibility fields (optional)
  price?: number; // mapped to currentPrice
}
