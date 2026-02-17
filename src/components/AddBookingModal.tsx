import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  User,
  Users,
  Camera,
  Crown,
  PartyPopper,
  DollarSign,
  Check,
  Clock,
  Calendar,
  AlertTriangle,
  AlertCircle,
  History,
  CreditCard,
  Percent,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner'; // ✅ Import toast
import {
  Booking,
  BookingCategory,
  BookingStatus,
  Currency,
  AppliedDiscount,
  EVENT_TYPES,
  PACKAGES_DATA,
  PackageData,
  formatDropdownLabel,
} from '../types';
import TimePicker from './shared/TimePicker';
import DatePicker from './shared/DatePicker';
import Draggable from 'react-draggable';
import { MoneyInput } from './ui/MoneyInput';
import { bookingService } from '../services/db/services/BookingService';
import { zainCashService, type ZainCashInitResponse } from '../services/zaincash';
import { electronBackend } from '../services/mockBackend';

// ✅ تنظيف رقم الهاتف → آخر 10 أرقام (بدون مفتاح الدولة)
// مثال: "07701234567" → "7701234567", "+9647701234567" → "7701234567"
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

// ✅ تطبيع الأسماء العربية — إزالة التشكيل + توحيد الهمزات
// "أحمد" = "احمد" = "إحمد", "فاطمة" = "فاطمه"
const normalizeArabicName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // إزالة التشكيل
    .replace(/[أإآٱ]/g, 'ا') // توحيد الهمزات
    .replace(/ة/g, 'ه')     // تاء مربوطة = هاء
    .replace(/ى/g, 'ي')     // ألف مقصورة = ياء
    .replace(/ؤ/g, 'و')     // واو بهمزة = واو
    .replace(/ئ/g, 'ي')     // ياء بهمزة = ياء
    .trim()
    .toLowerCase();
};

// ✅ البحث عن عميل موجود — رقم هاتف كامل + تطابق اسم
const findExistingClientId = (
  phones: string[],        // كل أرقام الهاتف المدخلة [groomPhone, bridePhone, genericPhone]
  names: string[],         // كل الأسماء المدخلة [groomName, brideName, personName]
  bookings?: Booking[]
): string | null => {
  if (!bookings || bookings.length === 0) return null;

  // تنظيف الأرقام — فقط الأرقام الكاملة (10 أرقام بعد التنظيف)
  const cleanPhones = phones
    .map(p => normalizePhone(p || ''))
    .filter(p => p.length >= 10);
  if (cleanPhones.length === 0) return null;

  // تنظيف الأسماء
  const cleanNames = names
    .filter(n => n && n.trim().length > 1)
    .map(n => normalizeArabicName(n));
  if (cleanNames.length === 0) return null;

  const match = bookings.find(b => {
    if (!b.clientPhone || !b.clientName) return false;

    // 1. تطابق رقم الهاتف (كامل)
    const bPhone = normalizePhone(typeof b.clientPhone === 'string' ? b.clientPhone : '');
    if (bPhone.length < 10) return false;
    const phoneMatch = cleanPhones.some(p => p === bPhone);
    if (!phoneMatch) return false;

    // 2. تطابق أي جزء من الاسم
    // الاسم المحفوظ ممكن يكون "محمد و سارة" ف نقسمه
    const existingNameParts = normalizeArabicName(b.clientName)
      .split(/\s+و\s+|\s+/)
      .filter(p => p.length > 1);

    const nameMatch = cleanNames.some(newName =>
      existingNameParts.some(existingPart =>
        existingPart === newName || existingPart.includes(newName) || newName.includes(existingPart)
      )
    );

    return nameMatch;
  });

  return match?.clientId || null;
};

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Omit<Booking, 'id' | 'nasStatus' | 'nasProgress'>) => void;
  initialCategory?: BookingCategory;
  mode?: 'shoot' | 'location';
  initialDate?: Date;
  editingBooking?: Booking | null;
  readOnly?: boolean;
  existingBookings?: Booking[];
  hideHeader?: boolean;
  // ✅ بيانات عميل مسبقة لإعادة الحجز من كارت العملاء
  rebookClient?: { name: string; phone: string } | null;
}

// نموذج بند إضافي (مبلغ + وصف)
interface ExtraItem {
  id: string;
  amount: number;
  description: string;
}

interface BookingFormData {
  category: BookingCategory;
  servicePackage: string;
  baseAmount: number; // سعر الباقة الأساسية
  totalAmount: number; // المجموع الكلي (baseAmount + extraItems)
  paidAmount: number;
  currency: Currency;
  shootDate: string;
  groomName: string;
  brideName: string;
  groomBirthday: string;
  brideBirthday: string;
  personName: string;
  familyName: string;
  isPhotographer: boolean;
  groomPhone: string;
  bridePhone: string;
  genericPhone: string;
  startTime: string;
  endTime: string;
  locationLink: string;
  notes: string;
  allowPublishing: boolean;
  allowPhotography: boolean;
  isCrewShooting: boolean;
  isFamous: boolean;
  isVIP: boolean;
  extraItems: ExtraItem[];
}

// Helper function to format date without timezone issues
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AddBookingModal: React.FC<AddBookingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory = BookingCategory.WEDDING,
  mode = 'shoot',
  initialDate,
  editingBooking,
  readOnly = false,
  existingBookings = [],
  hideHeader = false,
  rebookClient,
}) => {
  // React Hook Form
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<BookingFormData>({
    defaultValues: {
      category: BookingCategory.WEDDING,
      servicePackage: '',
      baseAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      currency: 'IQD',
      shootDate: new Date().toISOString().split('T')[0],
      groomName: '',
      brideName: '',
      groomBirthday: '',
      brideBirthday: '',
      personName: '',
      familyName: '',
      isPhotographer: false,
      groomPhone: '',
      bridePhone: '',
      genericPhone: '',
      startTime: '10:00',
      endTime: '12:00',
      locationLink: '',
      notes: '',
      allowPublishing: false,
      allowPhotography: true,
      isFamous: false,
      isCrewShooting: false,
      isVIP: false,
      extraItems: [],
    },
  });

  // Watch form values
  const formData = watch();
  const fallbackEventTypeId = EVENT_TYPES[0]?.id ?? 'wedding';

  // Dynamic Package Data
  const [availablePackages, setAvailablePackages] = useState<PackageData[]>(PACKAGES_DATA);
  const [showDepositPopup, setShowDepositPopup] = useState(false);
  const depositInputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef(null);

  // حالة البنود الإضافية
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);

  // Initialize category based on mode prop: 'location' for villa bookings, first event type for shoot
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    mode === 'location' ? 'venue' : fallbackEventTypeId
  );
  const [venueTab, setVenueTab] = useState<
    'venue_party' | 'venue_room' | 'venue_session' | 'venue_commercial'
  >('venue_session');

  // Reset selectedCategoryId when modal opens with a different mode
  useEffect(() => {
    if (isOpen && !editingBooking) {
      setSelectedCategoryId(mode === 'location' ? 'venue' : fallbackEventTypeId);
    }
  }, [isOpen, mode, editingBooking, fallbackEventTypeId]);

  // Load Merged Packages on Mount
  useEffect(() => {
    const loadData = async () => {
      // Skipped PackageSyncService to fix missing module error
      console.log('📦 AddBookingModal: Using static packages');
      setAvailablePackages(PACKAGES_DATA);
    };
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingBooking) {
        // --- Edit Mode: Populate Fields ---
        // Use availablePackages to check if custom
        const isKnown = availablePackages.find(p => p.title === editingBooking.servicePackage);
        setIsCustomPackage(!isKnown);

        setShowDepositPopup(false);
        const details = editingBooking.details || {};

        // Try to map existing category to event type ID for dropdown
        const eventType = EVENT_TYPES.find(e => e.mapTo === editingBooking.category);
        setSelectedCategoryId(eventType?.id ?? fallbackEventTypeId);

        // Populate form
        // حساب baseAmount من totalAmount - extraItems
        const extraItemsList = details.extraItems || [];
        const extraItemsTotal = extraItemsList.reduce((sum, item) => sum + (item.amount || 0), 0);
        const existingDiscount = (details.discount as AppliedDiscount | undefined) || undefined;
        const totalBeforeDiscount = existingDiscount?.subtotalAmount ?? editingBooking.totalAmount ?? 0;
        const baseAmount = Math.max(0, totalBeforeDiscount - extraItemsTotal);

        reset({
          category: editingBooking.category,
          servicePackage: editingBooking.servicePackage,
          baseAmount: baseAmount,
          totalAmount: editingBooking.totalAmount,
          paidAmount: editingBooking.paidAmount,
          currency: editingBooking.currency,
          shootDate: editingBooking.shootDate,
          groomName: details.groomName || '',
          brideName: details.brideName || '',
          groomBirthday: details.groomBirthday || '',
          brideBirthday: details.brideBirthday || '',
          personName: details.personName || '',
          familyName: details.familyName || '',
          isPhotographer: details.isPhotographer || false,
          // Simple logic to extract phone, might need smarter parsing if mulitple phones
          groomPhone: Array.isArray(editingBooking.clientPhone)
            ? editingBooking.clientPhone[0]
            : editingBooking.clientPhone,
          bridePhone: '', // Assuming one phone for now or groom phone is primary
          genericPhone:
            typeof editingBooking.clientPhone === 'string' ? editingBooking.clientPhone : '',
          startTime: details.startTime || '10:00',
          endTime: details.endTime || '12:00',
          locationLink: details.notes?.match(/Mapped Location: (.*)/)?.[1] || '',
          notes: details.notes?.replace(/\n\nMapped Location: .*/, '') || '', // Remove appended location
          allowPublishing: details.allowPublishing || false,
          allowPhotography:
            details.allowPhotography !== undefined ? details.allowPhotography : true,
          isFamous: editingBooking.isFamous || false,
          isCrewShooting: editingBooking.isCrewShooting || false,
          isVIP: editingBooking.isVIP || false,
          extraItems: extraItemsList,
        });
        // تحميل البنود الإضافية في الحالة المحلية
        setExtraItems(details.extraItems || []);
        setAppliedDiscount(existingDiscount || null);
        setDiscountCodeInput(existingDiscount?.code || '');
        setDiscountReason(existingDiscount?.reason || '');
        setDiscountFeedback({ type: null, message: '' });
        setShowDiscountPopup(false);
      } else {
        // --- Add Mode: Reset to Defaults ---
        setIsCustomPackage(false);
        setShowDepositPopup(false);
        // ✅ FIX: استخدام mode بدلاً من initialCategory لتحديد القائمة الصحيحة
        const startCatId = mode === 'location' ? 'venue' : fallbackEventTypeId;
        setSelectedCategoryId(startCatId);
        setVenueTab('venue_session');

        // ✅ إذا هناك بيانات عميل مسبقة (إعادة حجز) — نملأ الاسم والرقم
        const nameParts = rebookClient?.name?.split(/\s+و\s+/) || [];
        const firstName = nameParts[0] ?? '';
        const secondName = nameParts[1] ?? '';
        const hasTwo = nameParts.length >= 2;

        reset({
          category: initialCategory,
          groomName: rebookClient ? (hasTwo ? firstName.trim() : firstName.trim()) : '',
          brideName: rebookClient ? (hasTwo ? secondName.trim() : '') : '',
          personName: rebookClient ? rebookClient.name : '',
          isPhotographer: false,
          groomPhone: rebookClient ? rebookClient.phone : '',
          bridePhone: '',
          genericPhone: rebookClient ? rebookClient.phone : '',
          servicePackage: '',
          baseAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          currency: 'IQD',
          startTime: '10:00',
          endTime: '10:30',
          shootDate: initialDate ? formatDateForInput(initialDate) : formatDateForInput(new Date()),
          locationLink: '',
          notes: '',
          allowPublishing: false,
          allowPhotography: true,
          brideBirthday: '',
          familyName: '',
          isFamous: false,
          isCrewShooting: false,
          isVIP: false,
          extraItems: [],
        });
        // إعادة تعيين البنود الإضافية
        setExtraItems([]);
        setAppliedDiscount(null);
        setDiscountCodeInput('');
        setDiscountReason('');
        setDiscountFeedback({ type: null, message: '' });
        setShowDiscountPopup(false);
      }
    }
  }, [
    isOpen,
    initialCategory,
    initialDate,
    reset,
    editingBooking,
    rebookClient,
    mode,
    availablePackages,
    fallbackEventTypeId,
  ]);

  const [isCustomPackage, setIsCustomPackage] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountFeedback, setDiscountFeedback] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);

  const discountIndicator = useMemo(() => {
    if (discountFeedback.type === 'error') {
      return {
        button:
          'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/20',
        dot: 'bg-red-400',
        label: 'خطأ خصم',
      };
    }

    if (appliedDiscount) {
      return {
        button:
          'border-amber-400/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20',
        dot: 'bg-amber-300',
        label: 'خصم مفعّل',
      };
    }

    return {
      button:
        'border-white/15 bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300',
      dot: 'bg-gray-500',
      label: 'خصم غير مفعّل',
    };
  }, [appliedDiscount, discountFeedback.type]);

  const calculateSubtotal = useCallback((base: number, items: ExtraItem[]) => {
    const safeBase = Number(base || 0);
    const extras = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.max(0, safeBase + extras);
  }, []);

  // --- Conflict Detection Logic (Standard) ---
  const bookingConflict = useMemo(() => {
    if (!formData.shootDate || !formData.startTime || !formData.endTime) return null;
    if (readOnly) return null;

    const newStart = parseInt(String(formData.startTime || '').replace(':', '')) || 0;
    const newEnd = parseInt(String(formData.endTime || '').replace(':', '')) || 0;

    // Check if NEW booking is blocking
    // Using selectedCategoryId because formData.category is enum
    const isNewFullStudio =
      (selectedCategoryId === 'venue' && venueTab === 'venue_party') ||
      formData.servicePackage.includes('برايفت');

    const dayBookings = existingBookings.filter(
      b => b.shootDate === formData.shootDate && b.id !== editingBooking?.id
    );

    let severeConflict = false;
    let normalConflict = false;
    let conflictMessage = '';

    for (const b of dayBookings) {
      if (!b.details?.startTime || !b.details?.endTime) continue;
      const bStart = parseInt(b.details.startTime.replace(':', ''));
      const bEnd = parseInt(b.details.endTime.replace(':', ''));

      // Check if EXISTING booking is blocking
      const bIsFull = b.details.rentalType === 'Full';

      if (newStart < bEnd && newEnd > bStart) {
        if (isNewFullStudio || bIsFull) {
          severeConflict = true;
          conflictMessage = 'الاستوديو محجوز بالكامل في هذا الوقت (تعارض كلي)';
          break;
        } else {
          normalConflict = true;
          conflictMessage = 'يوجد حجز آخر في نفس التوقيت (تعارض جزئي)';
        }
      }
    }

    if (severeConflict) return { type: 'error', message: conflictMessage };
    if (normalConflict) return { type: 'warning', message: conflictMessage };
    return null;
  }, [
    formData.shootDate,
    formData.startTime,
    formData.endTime,
    selectedCategoryId,
    formData.servicePackage,
    venueTab,
    existingBookings,
    editingBooking,
    readOnly,
  ]);

  // --- Client History Logic (FIXED & STRICT) ---
  // يتطلب رقم هاتف كامل (10 أرقام بعد التنظيف) لعرض سجل العميل
  const clientHistory = useMemo(() => {
    const currentPhones = [formData.groomPhone, formData.bridePhone, formData.genericPhone]
      .map(p => normalizePhone(p || ''))
      .filter(p => p.length >= 10);

    if (currentPhones.length === 0) return null;

    const matches = existingBookings.filter(b => {
      if (b.id === editingBooking?.id) return false;
      if (!b.clientPhone) return false;

      const bPhone = normalizePhone(typeof b.clientPhone === 'string' ? b.clientPhone : '');
      if (bPhone.length < 10) return false;

      return currentPhones.some(p => p === bPhone);
    });

    if (matches.length > 0) {
      const lastBooking = matches.sort(
        (a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime()
      )[0];
      if (!lastBooking) {
        return null;
      }
      return {
        count: matches.length,
        lastTitle: lastBooking.title,
        lastDate: lastBooking.shootDate,
        clientName: lastBooking.clientName,
      };
    }
    return null;
  }, [
    formData.groomPhone,
    formData.bridePhone,
    formData.genericPhone,
    existingBookings,
    editingBooking,
  ]);

  useEffect(() => {
    if (showDepositPopup && depositInputRef.current) {
      setTimeout(() => depositInputRef.current?.focus(), 100);
    }
  }, [showDepositPopup]);


  const handleAmountInput = (field: 'totalAmount' | 'paidAmount', value: string) => {
    // تحويل الأرقام العربية إلى إنجليزية
    const englishValue = value
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^0-9]/g, ''); // إزالة كل شيء ما عدا الأرقام
    setValue(field, Number(englishValue) || 0);
  };

  // 🔢 تنسيق الأرقام مع فواصل للعرض
  const formatNumberWithCommas = (num: number): string => {
    if (!num || num === 0) return '';
    return num.toLocaleString('en-US');
  };

  const handlePhoneInput = (field: 'groomPhone' | 'bridePhone' | 'genericPhone', value: string) => {
    const converted = value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const validValue = converted.replace(/[^0-9+\s()]/g, '');
    setValue(field, validValue);
  };

  const isVenueMode = selectedCategoryId === 'venue';

  const filteredPackages = availablePackages.filter(pkg => {
    if (isVenueMode) {
      // Exact match with new categories
      return pkg.categoryId === venueTab;
    }
    return pkg.categoryId === selectedCategoryId;
  });

  const handlePackageChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomPackage(true);
      setValue('servicePackage', 'عرض مخصص');
      setValue('baseAmount', 0);
      updateTotalAmount(0, extraItems, appliedDiscount);
      setShowDepositPopup(false);
    } else {
      setIsCustomPackage(false);
      const pkg = availablePackages.find(p => p.id === value);
      if (pkg) {
        setValue('servicePackage', pkg.title);
        setValue('baseAmount', pkg.price);
        setValue('currency', pkg.currency);
        updateTotalAmount(pkg.price, extraItems, appliedDiscount);
        setShowDepositPopup(true);
      }
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    setValue('servicePackage', '');
    setValue('baseAmount', 0);
    setAppliedDiscount(null);
    setDiscountCodeInput('');
    setDiscountReason('');
    setDiscountFeedback({ type: null, message: '' });
    setShowDiscountPopup(false);
    updateTotalAmount(0, extraItems, null);
    setIsCustomPackage(false);
    setShowDepositPopup(false);

    // ✅ [Fix] تفعيل وضع VIP تلقائياً لفتح الحجز المقفول
    const isVIPCategory = ['vip', 'wedding_party'].includes(catId);
    setValue('isVIP', isVIPCategory);

    const eventType = EVENT_TYPES.find(e => e.id === catId);
    if (eventType) setValue('category', eventType.mapTo);

    // ✅ [Fix] تحديث genericPhone عند تغيير النوع
    if (catId === 'venue') {
      // استخدام groomPhone أو bridePhone كقيمة افتراضية إذا كان genericPhone فارغاً
      const phoneToUse = formData.genericPhone || formData.groomPhone || formData.bridePhone || '';
      setValue('genericPhone', phoneToUse);
    }
  };

  const subtotalAmount = useMemo(
    () => calculateSubtotal(formData.baseAmount, extraItems),
    [calculateSubtotal, formData.baseAmount, extraItems]
  );

  // دالة لتحديث المجموع الكلي (مع دعم الخصم المطبق)
  const updateTotalAmount = useCallback(
    (base: number, items: ExtraItem[], discount?: AppliedDiscount | null) => {
      const subtotal = calculateSubtotal(base, items);

      if (!discount) {
        setValue('totalAmount', subtotal);
        if (formData.paidAmount > subtotal) {
          setValue('paidAmount', subtotal);
        }
        return;
      }

      const discountAmount =
        discount.type === 'percentage'
          ? Math.min(subtotal, (subtotal * Math.max(0, Math.min(100, discount.value))) / 100)
          : Math.min(subtotal, Math.max(0, discount.value));
      const finalAmount = Math.max(0, subtotal - discountAmount);

      setValue('totalAmount', finalAmount);
      if (formData.paidAmount > finalAmount) {
        setValue('paidAmount', finalAmount);
      }
    },
    [calculateSubtotal, formData.paidAmount, setValue]
  );

  const calculateExtraItemsTotal = useCallback(() => {
    return extraItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [extraItems]);

  const clearAppliedDiscount = useCallback(() => {
    setAppliedDiscount(null);
    setDiscountFeedback({ type: 'info', message: 'تم إلغاء الخصم' });
    updateTotalAmount(formData.baseAmount, extraItems, null);
  }, [extraItems, formData.baseAmount, updateTotalAmount]);

  const applyDiscountCode = useCallback(async (): Promise<boolean> => {
    const normalizedCode = discountCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setDiscountFeedback({ type: 'error', message: 'أدخل كود الخصم أولاً' });
      return false;
    }

    if (subtotalAmount <= 0) {
      setDiscountFeedback({ type: 'error', message: 'لا يمكن تطبيق خصم على مبلغ صفر' });
      return false;
    }

    setIsApplyingDiscount(true);
    try {
      const validation = await electronBackend.validateDiscountCode(normalizedCode, subtotalAmount);
      if (!validation.valid || !validation.discount) {
        setAppliedDiscount(null);
        updateTotalAmount(formData.baseAmount, extraItems, null);
        setDiscountFeedback({
          type: 'error',
          message: validation.message || 'تعذر تطبيق كود الخصم',
        });
        return false;
      }

      const nextDiscount: AppliedDiscount = {
        codeId: validation.discount.codeId,
        code: validation.discount.code,
        type: validation.discount.type,
        value: validation.discount.value,
        reason: discountReason.trim(),
        subtotalAmount: validation.discount.subtotalAmount,
        discountAmount: validation.discount.discountAmount,
        finalAmount: validation.discount.finalAmount,
        appliedAt: new Date().toISOString(),
      };

      setAppliedDiscount(nextDiscount);
      setDiscountCodeInput(validation.discount.code);
      setValue('totalAmount', validation.discount.finalAmount);
      if (formData.paidAmount > validation.discount.finalAmount) {
        setValue('paidAmount', validation.discount.finalAmount);
      }
      setDiscountFeedback({
        type: 'success',
        message: `تم تطبيق خصم ${validation.discount.discountAmount.toLocaleString()} بنجاح`,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل التحقق من كود الخصم';
      setDiscountFeedback({ type: 'error', message });
      return false;
    } finally {
      setIsApplyingDiscount(false);
    }
  }, [
    discountCodeInput,
    subtotalAmount,
    formData.baseAmount,
    extraItems,
    discountReason,
    setValue,
    formData.paidAmount,
    updateTotalAmount,
  ]);

  // عند تغيير المبلغ الأساسي/الإضافات: إما تحديث الخصم أو الرجوع إلى subtotal
  useEffect(() => {
    if (!appliedDiscount?.code) {
      updateTotalAmount(formData.baseAmount, extraItems, null);
      return;
    }

    let isCancelled = false;
    const refreshAppliedDiscount = async () => {
      try {
        const validation = await electronBackend.validateDiscountCode(appliedDiscount.code, subtotalAmount);
        if (isCancelled) return;

        if (!validation.valid || !validation.discount) {
          setAppliedDiscount(null);
          updateTotalAmount(formData.baseAmount, extraItems, null);
          setDiscountFeedback({
            type: 'error',
            message: validation.message || 'تم إلغاء الخصم لأن الشروط تغيّرت',
          });
          return;
        }

        setAppliedDiscount(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            subtotalAmount: validation.discount?.subtotalAmount ?? prev.subtotalAmount,
            discountAmount: validation.discount?.discountAmount ?? prev.discountAmount,
            finalAmount: validation.discount?.finalAmount ?? prev.finalAmount,
          };
        });
        setValue('totalAmount', validation.discount.finalAmount);
        if (formData.paidAmount > validation.discount.finalAmount) {
          setValue('paidAmount', validation.discount.finalAmount);
        }
      } catch {
        // keep previous discount state without hard-failing UX
      }
    };

    refreshAppliedDiscount();
    return () => {
      isCancelled = true;
    };
  }, [
    appliedDiscount?.code,
    subtotalAmount,
    formData.baseAmount,
    extraItems,
    formData.paidAmount,
    setValue,
    updateTotalAmount,
  ]);

  useEffect(() => {
    setAppliedDiscount(prev =>
      prev
        ? {
            ...prev,
            reason: discountReason.trim(),
          }
        : prev
    );
  }, [discountReason]);

  const [isSaving, setIsSaving] = useState(false);
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  const [showPendingConfirmation, setShowPendingConfirmation] = useState(false);
  const [pendingConflictDetails, setPendingConflictDetails] = useState<string | null>(null);

  const processBookingSave = async (forcePending = false) => {
    if (isSaving) return;
    setIsSaving(true);
    setConflictAlert(null);

    const availability = await bookingService.checkAvailability(
      formData.shootDate,
      formData.startTime,
      formData.endTime,
      editingBooking?.id
    );

    if (availability.hasConflict && !forcePending) {
      const conflictMsg = availability.conflictMessage || 'تعارض في الوقت';
      setPendingConflictDetails(conflictMsg);
      setShowPendingConfirmation(true);
      setIsSaving(false);
      return;
    }

    const shouldBePending = availability.hasConflict && forcePending;

    const { groomName, brideName, personName, familyName } = formData;
    let generatedClientName = personName || 'عميل';

    if (['vip', 'wedding_party', 'wedding_studio'].includes(selectedCategoryId)) {
      if (groomName && brideName) generatedClientName = `${groomName} و ${brideName}`;
      else if (groomName) generatedClientName = groomName;
      else if (brideName) generatedClientName = brideName;
    } else if (isVenueMode) {
      if (venueTab === 'venue_session') {
        if (groomName && brideName) generatedClientName = `${groomName} و ${brideName}`;
        else generatedClientName = groomName || brideName || personName || 'جلسة فيلا';
      } else if (venueTab === 'venue_room') {
        generatedClientName = brideName || personName || 'غرفة VIP';
      } else if (venueTab === 'venue_party') {
        generatedClientName = personName || 'حفل خاص';
      } else if (venueTab === 'venue_commercial') {
        generatedClientName = personName || 'حجز إعلاني';
      } else {
        generatedClientName = personName || (formData.isPhotographer ? 'مصور خارجي' : 'عميل');
      }
    } else if (selectedCategoryId === 'general') {
      if (familyName) generatedClientName = familyName;
    }

    const title = `${EVENT_TYPES.find(e => e.id === selectedCategoryId)?.label || 'حجز'} - ${generatedClientName}`;
    
    // 📱 تحديد رقم الهاتف الأساسي مع fallback ذكي
    let primaryPhone = '';
    
    if (['vip', 'wedding_party', 'wedding_studio'].includes(selectedCategoryId)) {
      // حجوزات الزفاف: العريس أولاً ثم العروس
      primaryPhone = formData.groomPhone || formData.bridePhone || formData.genericPhone;
    } else if (isVenueMode && venueTab === 'venue_room') {
      // غرفة VIP: العروس أولاً
      primaryPhone = formData.bridePhone || formData.genericPhone || formData.groomPhone;
    } else if (isVenueMode) {
      // باقي حجوزات الفيلا
      primaryPhone = formData.genericPhone || formData.groomPhone || formData.bridePhone;
    } else {
      // الحجوزات العادية
      primaryPhone = formData.genericPhone || formData.groomPhone || formData.bridePhone;
    }
    
    console.log('📱 [Booking] Phone saved:', {
      groomPhone: formData.groomPhone,
      bridePhone: formData.bridePhone,
      genericPhone: formData.genericPhone,
      selectedPrimary: primaryPhone,
      category: selectedCategoryId
    });
    const normalizedPrimaryPhone = normalizePhone(primaryPhone);
    const secondaryPhone =
      [formData.groomPhone, formData.bridePhone, formData.genericPhone]
        .map((value) => value.trim())
        .find((value) => value && normalizePhone(value) !== normalizedPrimaryPhone) || '';

    const statusToSave = shouldBePending ? BookingStatus.INQUIRY : BookingStatus.CONFIRMED;
    const approvalStatusToSave: 'pending' | 'approved' | 'rejected' | undefined = shouldBePending
      ? 'pending'
      : undefined;
    const normalizedDiscount: AppliedDiscount | undefined = appliedDiscount
      ? {
          ...appliedDiscount,
          reason: discountReason.trim(),
          subtotalAmount,
          finalAmount: Number(formData.totalAmount || 0),
          appliedAt: appliedDiscount.appliedAt || new Date().toISOString(),
        }
      : undefined;

    onSave({
      clientId: findExistingClientId(
        [formData.groomPhone, formData.bridePhone, formData.genericPhone],
        [groomName, brideName, personName, familyName],
        existingBookings
      ) || `cl_${Date.now()}`,
      clientName: generatedClientName,
      clientPhone: primaryPhone,
      category: formData.category,
      title: title,
      shootDate: formData.shootDate,
      status: statusToSave,
      totalAmount: Number(formData.totalAmount),
      paidAmount: Number(formData.paidAmount),
      currency: formData.currency,
      exchangeRate: formData.currency === 'USD' ? 1500 : undefined,
      servicePackage: formData.servicePackage || 'مخصص',
      isFamous: formData.isFamous,
      isVIP: formData.isVIP,
      approvalStatus: approvalStatusToSave,
      conflictDetails: shouldBePending ? pendingConflictDetails || undefined : undefined,
      details: {
        groomName,
        brideName,
        groomPhone: formData.groomPhone || undefined,
        bridePhone: formData.bridePhone || undefined,
        genericPhone: formData.genericPhone || undefined,
        secondaryPhone: secondaryPhone || undefined,
        personName,
        familyName,
        groomBirthday: formData.groomBirthday || undefined,
        brideBirthday: formData.brideBirthday || undefined,
        isPhotographer: formData.isPhotographer,
        startTime: formData.startTime,
        endTime: formData.endTime,
        rentalType:
          formData.servicePackage.includes('برايفت') || venueTab === 'venue_party'
            ? 'Full'
            : 'Zone',
        notes: formData.notes,
        allowPublishing: formData.allowPublishing,
        allowPhotography: formData.allowPhotography,
        extraItems: extraItems,
        baseAmount: formData.baseAmount, // سعر الباقة الأساسية
        discount: normalizedDiscount,
      },
      location: formData.locationLink || '',
    });
    setIsSaving(false);
    onClose();
  };

  const onFormSubmit = () => processBookingSave(false);
  const onForceSubmitAsPending = () => {
    setShowPendingConfirmation(false);
    processBookingSave(true);
  };

  const canProceed = () => {
    const basicValid =
      (formData.totalAmount > 0 || isCustomPackage) && formData.servicePackage !== '';

    // Name validation: At least one name required
    let nameValid = false;
    if (['vip', 'wedding_party', 'wedding_studio'].includes(selectedCategoryId)) {
      nameValid = formData.groomName.trim().length > 1 || formData.brideName.trim().length > 1;
    } else if (isVenueMode && venueTab === 'venue_room') {
      nameValid = formData.brideName.trim().length > 1;
    } else {
      nameValid =
        formData.personName.trim().length > 1 ||
        formData.familyName.trim().length > 1 ||
        formData.groomName.trim().length > 1;
    }

    // Phone validation: at least ONE phone number required
    const phoneValid = ['vip', 'wedding_party', 'wedding_studio'].includes(selectedCategoryId)
      ? formData.groomPhone.length > 3 || formData.bridePhone.length > 3
      : isVenueMode && venueTab === 'venue_room'
        ? formData.bridePhone.length > 3
        : formData.genericPhone.length > 3;

    return basicValid && phoneValid && nameValid;
  };

  const handleApplyDiscountFromPopup = async () => {
    const isApplied = await applyDiscountCode();
    if (isApplied) {
      setShowDiscountPopup(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-200000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300">
        <Draggable nodeRef={nodeRef} handle=".modal-header" disabled={showDepositPopup}>
          <div
            ref={nodeRef}
            data-testid="add-booking-modal"
            className="bg-[#1E1E1E] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
          >
            {showDepositPopup && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="bg-[#262626] border border-[#F7931E]/50 w-full max-w-sm rounded-2xl p-6 transform scale-100 animate-in zoom-in-95">
                  <div className="text-center mb-6">
                    <DollarSign size={28} className="text-[#F7931E] mx-auto mb-3" />
                    <h4 className="text-xl font-bold text-white">المستلم (العربون)</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        ref={depositInputRef}
                        type="text"
                        dir="ltr"
                        value={formatNumberWithCommas(formData.paidAmount)}
                        onChange={e => handleAmountInput('paidAmount', e.target.value)}
                        placeholder="0"
                        className="w-full bg-black/40 border border-[#F7931E] rounded-xl px-4 py-4 text-white text-center font-mono text-3xl font-bold outline-none focus:ring-2 focus:ring-[#F7931E]/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue('currency', formData.currency === 'IQD' ? 'USD' : 'IQD')
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white font-bold text-sm bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                      >
                        {formData.currency}
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDepositPopup(false)}
                        className="flex-1 py-3 bg-[#F7931E] hover:bg-[#F9BE70] text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Check size={18} /> تأكيد
                      </button>

                      <button
                        onClick={() => {
                          zainCashService
                            .initiatePayment(
                              formData.totalAmount - formData.paidAmount,
                              `temp_${Date.now()}`,
                              formData.servicePackage
                            )
                            .then((response: ZainCashInitResponse) => {
                              if (window.open) {
                                window.open(response.url, '_blank');
                              }
                            })
                            .catch(() => {
                              toast.info('خدمة الدفع الإلكتروني قيد التطوير 🚧');
                            });
                        }}
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all flex items-center justify-center active:scale-95 group relative"
                        title="دفع إلكتروني (قريباً)"
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <CreditCard size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hideHeader && (
              <div className="modal-header cursor-move bg-linear-to-l from-[#262626] to-[#1E1E1E] p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-white">
                    {readOnly
                      ? 'تفاصيل الحجز'
                      : editingBooking
                        ? 'تعديل الحجز'
                        : isVenueMode
                          ? 'حجز فيلا حداد'
                          : 'إضافة حجز جديد'}
                  </h3>

                  {/* Compact Conflict Alert in Header */}
                  {bookingConflict && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold animate-in fade-in zoom-in-95 ${bookingConflict.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'}`}
                    >
                      {bookingConflict.type === 'error' ? (
                        <AlertCircle size={14} />
                      ) : (
                        <AlertTriangle size={14} />
                      )}
                      <span>{bookingConflict.message}</span>
                    </div>
                  )}

                  {conflictAlert && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold animate-in fade-in zoom-in-95 bg-red-500/20 border-red-500/30 text-red-400">
                      <AlertCircle size={14} />
                      <span>{conflictAlert}</span>
                    </div>
                  )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
              <fieldset disabled={readOnly} className="contents">
                {isVenueMode && (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    <button
                      onClick={() => {
                        setVenueTab('venue_party');
                        setValue('servicePackage', '');
                      }}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${venueTab === 'venue_party' ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-[#262626] border-transparent text-gray-500 hover:bg-[#333]'}`}
                    >
                      <PartyPopper size={18} />
                      <span className="font-bold text-xs md:text-sm">مناسبات فيلا</span>
                    </button>
                    <button
                      onClick={() => {
                        setVenueTab('venue_room');
                        setValue('servicePackage', '');
                      }}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${venueTab === 'venue_room' ? 'bg-pink-600/20 border-pink-500 text-pink-200 shadow-[0_0_15px_rgba(219,39,119,0.3)]' : 'bg-[#262626] border-transparent text-gray-500 hover:bg-[#333]'}`}
                    >
                      <Crown size={18} />
                      <span className="font-bold text-xs md:text-sm">غرفة VIP</span>
                    </button>
                    <button
                      onClick={() => {
                        setVenueTab('venue_session');
                        setValue('servicePackage', '');
                      }}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${venueTab === 'venue_session' ? 'bg-[#F7931E]/20 border-[#F7931E] text-[#F9BE70] shadow-[0_0_15px_rgba(247,147,30,0.3)]' : 'bg-[#262626] border-transparent text-gray-500 hover:bg-[#333]'}`}
                    >
                      <Camera size={18} />
                      <span className="font-bold text-xs md:text-sm">جلسات</span>
                    </button>
                    <button
                      onClick={() => {
                        setVenueTab('venue_commercial');
                        setValue('servicePackage', '');
                      }}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-300 ${venueTab === 'venue_commercial' ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#262626] border-transparent text-gray-500 hover:bg-[#333]'}`}
                    >
                      <DollarSign size={18} />
                      <span className="font-bold text-xs md:text-sm">إعلاني</span>
                    </button>
                  </div>
                )}

                {/* Section 1: تفاصيل العرض والوقت */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-[#C94557] rounded-full"></div>
                      <h4 className="text-white font-bold text-sm">بيانات العرض والوقت</h4>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDiscountPopup(true)}
                        disabled={readOnly}
                        title={discountIndicator.label}
                        className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border transition-all text-[10px] font-bold ${
                          appliedDiscount
                            ? 'bg-amber-500/12 border-amber-400/35 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.28)]'
                            : discountFeedback.type === 'error'
                              ? 'bg-red-500/10 border-red-500/30 text-red-200'
                              : 'bg-[#1f242c] border-white/10 text-gray-300 hover:border-amber-400/35 hover:text-amber-200'
                        } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Percent size={12} />
                        <span>خصم</span>
                        <span
                          className={`absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border border-black/50 ${discountIndicator.dot}`}
                        />
                      </button>

                      {appliedDiscount && (
                        <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-md border border-emerald-400/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.22)]">
                          -{Math.max(0, appliedDiscount.discountAmount).toLocaleString()} {formData.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!isVenueMode && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold">نوع المناسبة</label>
                        <select
                          value={selectedCategoryId}
                          onChange={e => handleCategoryChange(e.target.value)}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#F7931E] rounded-2xl px-5 py-4 text-white appearance-none cursor-pointer outline-none transition-all duration-300"
                        >
                          {EVENT_TYPES.filter(type => type.id !== 'venue').map(type => (
                            <option key={type.id} value={type.id} className="bg-[#121212]">
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={`space-y-2 ${isVenueMode ? 'md:col-span-2' : ''}`}>
                      <label className="text-xs text-gray-400 font-bold">اختر العرض</label>
                      <select
                        className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#F7931E] rounded-2xl px-5 py-4 text-white appearance-none cursor-pointer outline-none transition-all duration-300"
                        value={
                          isCustomPackage
                            ? 'custom'
                            : availablePackages.find(p => p.title === formData.servicePackage)
                                ?.id || ''
                        }
                        onChange={e => handlePackageChange(e.target.value)}
                      >
                        <option value="">-- اختر الباقة --</option>
                        {filteredPackages.map(pkg => (
                          <option key={pkg.id} value={pkg.id} className="bg-[#121212]">
                            {formatDropdownLabel(pkg)}
                          </option>
                        ))}
                        <option value="custom" className="bg-[#121212] text-[#F7931E] font-bold">
                          ✨ عرض مخصص
                        </option>
                      </select>
                    </div>

                    {isCustomPackage && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs text-gray-400 font-bold">
                          سعر الباقة (أساسي)
                        </label>
                        <MoneyInput
                          value={formData.baseAmount}
                          onChange={val => {
                            setValue('baseAmount', val);
                            updateTotalAmount(val, extraItems, appliedDiscount);
                          }}
                          placeholder="أدخل سعر الباقة"
                        />
                        {extraItems.length > 0 && (
                          <div className="flex justify-between text-xs mt-2">
                            <span className="text-gray-500">الباقة: {formData.baseAmount.toLocaleString()}</span>
                            <span className="text-emerald-400">+ إضافات: {calculateExtraItemsTotal().toLocaleString()}</span>
                            <span className="text-white font-bold">= المجموع: {formData.totalAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold block">تاريخ الحجز</label>
                      <DatePicker
                        value={formData.shootDate}
                        onChange={val => setValue('shootDate', val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400 font-bold flex items-center gap-2">
                          <Clock size={12} /> وقت البدء
                        </label>
                      </div>
                      <TimePicker
                        value={formData.startTime}
                        onChange={val => {
                          setValue('startTime', val);
                          const [hours = 0, minutes = 0] = val.split(':').map(Number);
                          const endMinutes = minutes + 30;
                          const endHours = hours + Math.floor(endMinutes / 60);
                          const finalMinutes = endMinutes % 60;
                          const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                          setValue('endTime', endTime);
                        }}
                      />
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        ينتهي <span className="text-[#C94557] font-bold">
                          {formData.endTime}
                        </span>{' '}
                        (30 دقيقة)
                      </p>
                    </div>
                  </div>
                </div>
                {/* Section 2: بيانات العميل */}
                <div className="bg-[#1a1c22] p-5 lg:p-6 rounded-3xl border border-white/5 space-y-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C94557]/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-[#C94557]/10 transition-colors duration-500"></div>

                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-linear-to-b from-[#C94557] to-red-600 rounded-full shadow-[0_0_10px_rgba(201,69,87,0.4)]"></div>
                      <h4 className="text-white font-bold text-base tracking-wide">
                        بيانات العملاء
                      </h4>
                    </div>

                    {/* Permission & Badge Toggles moved here */}
                    <div className="flex gap-2">
                      {/* Publishing - Only for Non-Venue (Sura/Studio) */}
                      {!isVenueMode && (
                        <button
                          type="button"
                          onClick={() => setValue('allowPublishing', !formData.allowPublishing)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all text-[9px] font-bold ${formData.allowPublishing ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                        >
                          <Check size={10} /> نشر
                        </button>
                      )}

                      {/* Crew Shooting Toggle */}
                      <button
                        type="button"
                        onClick={() => setValue('isCrewShooting', !formData.isCrewShooting)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all text-[9px] font-bold ${formData.isCrewShooting ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                      >
                        <Users size={10} /> كادر
                      </button>

                      {/* Photography Permission - Only for Venue */}
                      {isVenueMode && (
                        <button
                          type="button"
                          onClick={() => setValue('allowPhotography', !formData.allowPhotography)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all text-[9px] font-bold ${formData.allowPhotography ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                        >
                          <Camera size={10} /> تصوير
                        </button>
                      )}

                      {/* Famous Badge - Available for all */}
                      <button
                        type="button"
                        onClick={() => setValue('isFamous', !formData.isFamous)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all text-[9px] font-bold ${formData.isFamous ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]' : 'bg-gray-800 border-white/5 text-gray-500'}`}
                      >
                        <Crown size={10} className={formData.isFamous ? 'animate-pulse' : ''} />{' '}
                        مشهور
                      </button>
                    </div>
                  </div>

                  {/* Client History Alert */}
                  {clientHistory && (
                    <div className="p-3 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <History size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          عميل مميز (سجل سابق){' '}
                          <Crown size={12} className="text-yellow-500 fill-yellow-500" />
                        </p>
                        <p className="text-[10px] text-gray-400">
                          سبق له الحجز {clientHistory.count} مرات (آخر حجز:{' '}
                          {clientHistory.lastTitle} في {clientHistory.lastDate})
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedCategoryId === 'venue' && (
                    <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5 w-fit">
                      <button
                        type="button"
                        onClick={() => setValue('isPhotographer', false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${!formData.isPhotographer ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      >
                        زبون
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('isPhotographer', true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${formData.isPhotographer ? 'bg-linear-to-r from-[#F7931E] to-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      >
                        مصور
                      </button>
                    </div>
                  )}

                  {/* Wedding bookings: VIP, outdoor, and studio */}
                  {['vip', 'wedding_party', 'wedding_studio'].includes(selectedCategoryId) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Names */}
                      <div className="space-y-3">
                        <label className="text-xs text-[#F7931E] font-bold flex items-center gap-2">
                          <User size={12} /> اسم العريس
                        </label>
                        <input
                          type="text"
                          value={formData.groomName}
                          onChange={e => setValue('groomName', e.target.value)}
                          placeholder="الاسم الكامل"
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#F7931E] rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs text-pink-500 font-bold flex items-center gap-2">
                          <User size={12} /> اسم العروس
                        </label>
                        <input
                          type="text"
                          value={formData.brideName}
                          onChange={e => setValue('brideName', e.target.value)}
                          placeholder="الاسم الكامل"
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-pink-500 rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300"
                        />
                      </div>

                      {/* Phone Numbers */}
                      <div className="space-y-3">
                        <label className="text-xs text-gray-400 font-bold">هاتف العريس</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={formData.groomPhone}
                          onChange={e => handlePhoneInput('groomPhone', e.target.value)}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#F7931E] rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300 font-mono text-sm"
                          placeholder="07XX..."
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs text-gray-400 font-bold">هاتف العروس</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={formData.bridePhone}
                          onChange={e => handlePhoneInput('bridePhone', e.target.value)}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-pink-500 rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300 font-mono text-sm"
                          placeholder="07XX..."
                        />
                      </div>

                      {/* Birthday Inputs (Optional) */}
                      <div className="space-y-3">
                        <label className="text-xs text-gray-500 font-bold flex items-center gap-2 opacity-80">
                          <Calendar size={12} />
                          تاريخ ميلاد العريس
                          <span className="text-[10px] font-normal text-gray-600 bg-white/5 px-2 py-0.5 rounded-md">
                            اختياري
                          </span>
                        </label>
                        <input
                          type="date"
                          value={formData.groomBirthday}
                          onChange={e => setValue('groomBirthday', e.target.value)}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-2xl px-5 py-4 text-white/70 outline-none transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs text-gray-500 font-bold flex items-center gap-2 opacity-80">
                          <Calendar size={12} />
                          تاريخ ميلاد العروس
                          <span className="text-[10px] font-normal text-gray-600 bg-white/5 px-2 py-0.5 rounded-md">
                            اختياري
                          </span>
                        </label>
                        <input
                          type="date"
                          value={formData.brideBirthday}
                          onChange={e => setValue('brideBirthday', e.target.value)}
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-2xl px-5 py-4 text-white/70 outline-none transition-all duration-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Name */}
                      <div className="space-y-3">
                        <label className="text-xs text-gray-400 font-bold">
                          {isVenueMode && venueTab === 'venue_room' ? 'اسم العروس' : 'اسم العميل'}
                        </label>
                        <input
                          type="text"
                          value={
                            isVenueMode && venueTab === 'venue_room'
                              ? formData.brideName
                              : formData.personName
                          }
                          onChange={e =>
                            isVenueMode && venueTab === 'venue_room'
                              ? setValue('brideName', e.target.value)
                              : setValue('personName', e.target.value)
                          }
                          placeholder="الاسم الكامل"
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#C94557] rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-3">
                        <label className="text-xs text-gray-400 font-bold">رقم الهاتف</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={
                            isVenueMode && venueTab === 'venue_room'
                              ? formData.bridePhone
                              : formData.genericPhone
                          }
                          onChange={e =>
                            handlePhoneInput(
                              isVenueMode && venueTab === 'venue_room'
                                ? 'bridePhone'
                                : 'genericPhone',
                              e.target.value
                            )
                          }
                          className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#C94557] rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300 font-mono text-sm"
                          placeholder="07XX..."
                        />
                      </div>

                      {/* Birthday field for kids/general bookings (Optional) */}
                      {['kids', 'general'].includes(selectedCategoryId) && (
                        <div className="space-y-3 md:col-span-2">
                          <label className="text-xs text-gray-500 font-bold flex items-center gap-2 opacity-80">
                            <Calendar size={12} />
                            تاريخ الميلاد
                            <span className="text-[10px] font-normal text-gray-600 bg-white/5 px-2 py-0.5 rounded-md">
                              اختياري
                            </span>
                          </label>
                          <input
                            type="date"
                            value={formData.groomBirthday}
                            onChange={e => setValue('groomBirthday', e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-2xl px-5 py-4 text-white/70 outline-none transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Section 3: ملاحظات */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-xs text-gray-400 font-bold">ملاحظات إضافية</label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setValue('notes', e.target.value)}
                      placeholder="أي تفاصيل أو طلبات خاصة..."
                      rows={3}
                      className="w-full bg-[#121212] border border-white/10 hover:border-white/20 focus:border-[#C94557] rounded-2xl px-5 py-4 text-white placeholder-gray-600 outline-none transition-all duration-300 resize-none"
                    ></textarea>
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="p-6 bg-[#121212]/50 flex justify-end gap-3 border-t border-white/5">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {readOnly ? 'إغلاق' : 'إلغاء'}
              </button>
              {!readOnly && (
                <button
                  onClick={handleSubmit(onFormSubmit)}
                  disabled={isSaving || !canProceed()}
                  className="flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 bg-linear-to-r from-[#F7931E] to-[#F9BE70] text-white"
                >
                  {isSaving ? (
                    <span className="animate-pulse">جاري الحفظ...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> {editingBooking ? 'حفظ التعديلات' : 'تأكيد الحجز'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Draggable>
      </div>

      {showDiscountPopup && (
        <div className="fixed inset-0 z-[300000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1d24] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center ${discountIndicator.button}`}
                >
                  <Percent size={15} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">إدارة الخصم</h4>
                  <p className="text-[11px] text-gray-500">{discountIndicator.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountPopup(false)}
                className="w-8 h-8 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={15} className="mx-auto" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-bold">كود الخصم</label>
                <input
                  type="text"
                  value={discountCodeInput}
                  onChange={e => setDiscountCodeInput(e.target.value.toUpperCase())}
                  placeholder="مثال: VIP2026"
                  autoFocus
                  className="w-full bg-[#0f1218] border border-white/10 hover:border-white/20 focus:border-[#F7931E] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-300 font-bold">السبب</label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  placeholder="سبب الخصم (اختياري)"
                  className="w-full bg-[#0f1218] border border-white/10 hover:border-white/20 focus:border-[#C94557] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-gray-400 mb-1">قبل الخصم</p>
                  <p className="text-white font-bold">
                    {subtotalAmount.toLocaleString()} {formData.currency}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-gray-400 mb-1">الخصم</p>
                  <p className="text-[#F9BE70] font-bold">
                    {Math.max(0, appliedDiscount?.discountAmount || 0).toLocaleString()} {formData.currency}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <p className="text-emerald-300/80 mb-1">بعد الخصم</p>
                  <p className="text-emerald-300 font-bold">
                    {Number(formData.totalAmount || 0).toLocaleString()} {formData.currency}
                  </p>
                </div>
              </div>

              {discountFeedback.message && (
                <p
                  className={`text-xs font-bold ${
                    discountFeedback.type === 'success'
                      ? 'text-emerald-300'
                      : discountFeedback.type === 'error'
                        ? 'text-red-300'
                        : 'text-gray-300'
                  }`}
                >
                  {discountFeedback.message}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearAppliedDiscount}
                disabled={!appliedDiscount || readOnly}
                className="h-10 px-3 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-300 text-xs font-bold transition-all"
              >
                إزالة الخصم
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscountPopup(false)}
                  className="h-10 px-4 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyDiscountFromPopup}
                  disabled={isApplyingDiscount || readOnly}
                  className="h-10 px-4 rounded-lg bg-[#F7931E] hover:bg-[#F9BE70] disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-bold transition-all"
                >
                  {isApplyingDiscount ? 'جارِ التحقق...' : 'تطبيق الكود'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPendingConfirmation && (
        <div className="fixed inset-0 z-[300000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1E1E1E] border border-yellow-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-yellow-500" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">تعارض في الوقت</h4>
              <p className="text-gray-400 text-sm">{pendingConflictDetails}</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <p className="text-yellow-400 text-sm text-center">
                سيتم إضافة الحجز بانتظار موافقة المشرف
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPendingConfirmation(false)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white border border-white/10 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={onForceSubmitAsPending}
                className="flex-1 px-4 py-3 text-sm font-bold bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Clock size={16} />
                استمرار
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddBookingModal;
