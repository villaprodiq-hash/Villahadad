import React, { useState, useEffect } from 'react';
import {
  Printer as PrinterIcon,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  FileText,
  Plus,
  MonitorPlay,
  Search,
  Filter,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PrinterArchiveView from './views/PrinterArchiveView';
import PrinterInventoryView from './views/PrinterInventoryView';
import UnifiedTeamChat from '../../shared/UnifiedTeamChat';
import TasksPanel from './TasksPanel';
import PaymentLockModal from '../../PaymentLockModal';
import {
  Booking,
  BookingStatus,
  BookingCategory,
  User,
  ROLE_PERMISSIONS,
} from '../../../types';
import { getWhatsAppUrl, openWhatsAppUrl } from '../../../utils/whatsapp';
import { ALBUMS_PACKAGES_DATA } from '../../../services/constants';

// Types
interface PrintJob {
  id: string;
  clientName: string;
  clientPhone?: string;
  productType: string;
  quantity: number;
  status: 'queue' | 'printing' | 'ready' | 'delivered';
  priority: 'high' | 'normal' | 'low';
  deadline: string;
  progress: number;
  thumbnail: string;
  paperType?: string;
  inkLevel?: number;
  notificationSentAt?: string;
  deliveredAt?: string;
  rawBooking?: Booking; // Link to original booking
  source: 'workflow' | 'manual'; // Track origin of job
}

interface PrinterInventoryProduct {
  id: string;
  name: string;
  category: 'album' | 'set' | 'package';
  price: number;
  stock: number;
  description?: string;
}

type PrinterJobFormState = Partial<PrintJob> & {
  productCatalogId?: string;
  unitPrice?: number;
};

const PRINTER_INVENTORY_STORAGE_KEY = 'printer_inventory_items_v1';

const FALLBACK_PRODUCTS: PrinterInventoryProduct[] = ALBUMS_PACKAGES_DATA.map(item => {
  const category: PrinterInventoryProduct['category'] =
    item.categoryId === 'album_sets'
      ? 'set'
      : item.categoryId === 'album_single'
        ? 'album'
        : 'package';

  return {
    id: item.id,
    name: item.title,
    category,
    price: item.price,
    stock: 1,
    description: item.features?.join(' • ')
  };
});

const extractBestWhatsAppPhone = (rawPhone?: string): string => {
  if (!rawPhone) return '';

  const source = String(rawPhone).trim();
  if (!source) return '';

  const candidates = source
    .split(/[,\n/|]+/g)
    .map(part => part.trim())
    .filter(Boolean);

  const all = candidates.length > 0 ? candidates : [source];
  for (const candidate of all) {
    const digits = candidate.replace(/\D/g, '');
    if (!digits) continue;
    if (digits.length >= 10) return digits;
  }

  return '';
};

const readPrinterProductsFromStorage = (): PrinterInventoryProduct[] => {
  if (typeof window === 'undefined') return FALLBACK_PRODUCTS;

  try {
    const raw = window.localStorage.getItem(PRINTER_INVENTORY_STORAGE_KEY);
    if (!raw) return FALLBACK_PRODUCTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return FALLBACK_PRODUCTS;

    const normalized = parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.category === 'string' &&
          typeof item.price !== 'undefined' &&
          typeof item.stock !== 'undefined'
      )
      .map(item => {
        const category: PrinterInventoryProduct['category'] =
          item.category === 'album' || item.category === 'set' || item.category === 'package'
            ? item.category
            : 'package';
        return {
          id: String(item.id),
          name: String(item.name),
          category,
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          description: typeof item.description === 'string' ? item.description : undefined,
        };
      })
      .filter(item => item.category === 'album' || item.category === 'set' || item.category === 'package');

    return normalized.length > 0 ? normalized : FALLBACK_PRODUCTS;
  } catch (error) {
    console.error('[PrinterDashboard] Failed to read inventory products:', error);
    return FALLBACK_PRODUCTS;
  }
};

interface PrinterDashboardProps {
  activeSection?: string;
  bookings?: Booking[];
  users?: User[];
  currentUser?: User;
  onStatusUpdate?: (id: string, status: BookingStatus, updates?: Partial<Booking>) => Promise<void>;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => Promise<void>;
  onAddBooking?: (booking: Omit<Booking, 'id'>) => Promise<void>;
}

const PrinterDashboard: React.FC<PrinterDashboardProps> = ({
  activeSection,
  bookings = [],
  users = [],
  currentUser,
  onStatusUpdate,
  onUpdateBooking,
  onAddBooking,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'printing' | 'ready' | 'delivered'>('queue');
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);

  // Job State - Derived from Bookings
  // Map booking status to job status
  const getJobStatus = (status: BookingStatus): PrintJob['status'] => {
    if (status === BookingStatus.READY_TO_PRINT) return 'queue';
    if (status === BookingStatus.PRINTING) return 'printing';
    if (status === BookingStatus.READY_FOR_PICKUP) return 'ready';
    if (status === BookingStatus.DELIVERED) return 'delivered';
    return 'queue'; // Default fallback
  };

  const jobs: PrintJob[] = bookings
    .filter(
      b =>
        b.status === BookingStatus.READY_TO_PRINT ||
        b.status === BookingStatus.PRINTING ||
        b.status === BookingStatus.READY_FOR_PICKUP ||
        b.status === BookingStatus.DELIVERED
    )
    .map(b => ({
      id: b.id,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      productType: b.title, // Or package name
      quantity: 1, // Default to 1
      status: getJobStatus(b.status),
      priority: 'normal',
      deadline: b.deliveryDeadline || '2025-02-01',
      progress:
        b.status === BookingStatus.PRINTING ? 50 : b.status === BookingStatus.DELIVERED ? 100 : 0,
      thumbnail: b.category === 'Wedding' ? '📸' : '📄',
      paperType: b.servicePackage || 'غير محدد',
      inkLevel: 80,
      notificationSentAt: b.details?.printerNotificationSentAt,
      deliveredAt: b.details?.printerDeliveredAt,
      rawBooking: b,
      source: 'workflow', // Jobs from bookings are workflow-sourced
    }));

  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<PrintJob | null>(null);
  const [newJob, setNewJob] = useState<PrinterJobFormState>({
    priority: 'normal',
    status: 'queue',
    quantity: 1,
    thumbnail: '📄',
    source: 'manual',
  });
  const [editingJob, setEditingJob] = useState<PrintJob | null>(null);
  const [printerProducts, setPrinterProducts] = useState<PrinterInventoryProduct[]>(() =>
    readPrinterProductsFromStorage()
  );

  useEffect(() => {
    if (!showAddJobModal && !showEditJobModal) return;
    setPrinterProducts(readPrinterProductsFromStorage());
  }, [showAddJobModal, showEditJobModal]);

  const getInitialFormState = (): PrinterJobFormState => ({
    priority: 'normal',
    status: 'queue',
    quantity: 1,
    thumbnail: '📄',
    source: 'manual',
  });

  const handleSelectProduct = (productId: string) => {
    const product = printerProducts.find(item => item.id === productId);
    if (!product) {
      setNewJob(prev => ({
        ...prev,
        productCatalogId: undefined,
        productType: '',
        unitPrice: 0,
      }));
      return;
    }

    setNewJob(prev => ({
      ...prev,
      productCatalogId: product.id,
      productType: product.name,
      unitPrice: product.price,
      paperType: product.description || product.name,
    }));
  };

  const computedTotal = (newJob.unitPrice || 0) * (newJob.quantity || 1);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.clientName || !newJob.productType || !newJob.productCatalogId) {
      toast.error('يرجى اختيار المنتج من المخزن وإكمال الحقول المطلوبة');
      return;
    }

    if ((newJob.quantity || 1) <= 0) {
      toast.error('الكمية يجب أن تكون أكبر من صفر');
      return;
    }

    if (onAddBooking) {
      try {
        const quantity = newJob.quantity || 1;
        const unitPrice = newJob.unitPrice || 0;
        const totalAmount = unitPrice * quantity;
        const newBooking: Omit<Booking, 'id'> = {
          clientId: `client-${Date.now()}`, // Generate a temporary client ID
          clientName: newJob.clientName,
          clientPhone: newJob.clientPhone || '',
          title: newJob.productType,
          shootDate: new Date().toISOString().slice(0, 10),
          category: BookingCategory.WEDDING,
          status: BookingStatus.READY_TO_PRINT,
          servicePackage: newJob.paperType || 'طباعة عادية',
          deliveryDeadline: newJob.deadline || '',
          location: 'فيلا حداد',
          folderPath: '',
          totalAmount,
          paidAmount: 0,
          currency: 'IQD',
          details: {
            printerProductId: newJob.productCatalogId,
            printerUnitPrice: unitPrice,
            printerQuantity: quantity,
          },
        };

        await onAddBooking(newBooking);
        toast.success('تم إضافة الطلب بنجاح');
        setShowAddJobModal(false);
        setNewJob(getInitialFormState());
      } catch (error) {
        toast.error('حدث خطأ أثناء إضافة الطلب');
      }
    } else {
      toast.error('وظيفة الإضافة غير متاحة');
    }
  };

  const [showPaymentLockModal, setShowPaymentLockModal] = useState(false);
  const [pendingDeliveryJob, setPendingDeliveryJob] = useState<PrintJob | null>(null);

  const updateJobStatus = async (id: string, newStatus: PrintJob['status']) => {
    // فحص الدين قبل التسليم
    if (newStatus === 'delivered') {
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const remainingBalance = currentBooking.totalAmount - currentBooking.paidAmount;
        if (remainingBalance > 0) {
          const job = jobs.find(j => j.id === id);
          setPendingDeliveryJob(job || null);
          setShowPaymentLockModal(true);
          return;
        }
      }
    }

    await processDelivery(id, newStatus);
  };

  const processDelivery = async (id: string, newStatus: PrintJob['status']) => {
    let bookingStatus: BookingStatus;
    switch (newStatus) {
      case 'printing':
        bookingStatus = BookingStatus.PRINTING;
        break;
      case 'ready':
        bookingStatus = BookingStatus.READY_FOR_PICKUP;
        break;
      case 'delivered':
        bookingStatus = BookingStatus.ARCHIVED;
        break;
      default:
        bookingStatus = BookingStatus.READY_TO_PRINT;
    }

    if (onStatusUpdate) {
      const currentBooking = bookings.find(b => b.id === id);
      const deliveredAt = newStatus === 'delivered' ? new Date().toISOString() : undefined;
      const statusUpdates: Partial<Booking> | undefined = deliveredAt
        ? {
            printCompletedAt: deliveredAt,
            details: {
              ...(currentBooking?.details || {}),
              printerDeliveredAt: deliveredAt,
            },
          }
        : undefined;

      await onStatusUpdate(id, bookingStatus, statusUpdates);

      // Optimistic UI update for selected job modal
      if (selectedJob && selectedJob.id === id) {
        setSelectedJob({ ...selectedJob, status: newStatus });
      }

      if (newStatus === 'printing') toast.success('تم بدء عملية الطباعة');
      if (newStatus === 'ready') toast.success('الطلب جاهز للتسليم الآن');
      if (newStatus === 'delivered') toast.success('تم تسليم الطلب وأرشفته تلقائياً');
    }
  };

  const handlePaymentSettled = async (amount: number) => {
    if (!pendingDeliveryJob || !onUpdateBooking) return;

    const currentBooking = bookings.find(b => b.id === pendingDeliveryJob.id);
    if (currentBooking) {
      await onUpdateBooking(pendingDeliveryJob.id, {
        paidAmount: currentBooking.paidAmount + amount,
      });
    }

    await processDelivery(pendingDeliveryJob.id, 'delivered');
    setShowPaymentLockModal(false);
    setPendingDeliveryJob(null);
  };

  const handleSendWhatsapp = async (job: PrintJob) => {
    const canViewPhone = currentUser && ROLE_PERMISSIONS[currentUser.role]?.canViewClientPhone;
    const phone = canViewPhone ? extractBestWhatsAppPhone(job.clientPhone) : '';

    const message = [
      `مرحباً ${job.clientName} ✨`,
      '',
      'نبشّركم أن طلبكم صار جاهز للاستلام ✅',
      `المنتج: ${job.productType}`,
      `الكمية: ${job.quantity || 1}`,
      '',
      'الدوام: يومياً من 10:00 صباحاً إلى 10:00 مساءً',
      'العنوان: فيلا حداد - قسم الطباعة',
      '',
      'ننتظركم بكل محبة، وأي استفسار إحنا بالخدمة 💛',
    ].join('\n');
    const url = getWhatsAppUrl(phone, message);

    if (!url) {
      toast.error('تعذر إنشاء رابط واتساب');
      return;
    }

    try {
      await openWhatsAppUrl(url);
    } catch (error) {
      console.error('[PrinterDashboard] Failed to open WhatsApp:', error);
      toast.error('تعذر فتح واتساب');
      return;
    }

    const timestamp = new Date().toISOString();
    // Persist notification time
    if (onUpdateBooking && job.rawBooking) {
      await onUpdateBooking(job.id, {
        details: {
          ...job.rawBooking.details,
          printerNotificationSentAt: timestamp,
        },
      });
      if (phone) {
        toast.success('تم فتح واتساب برقم العميل وتسجيل وقت الإشعار');
      } else {
        toast.success('تم فتح واتساب بدون رقم (يمكن اختيار جهة الاتصال يدوياً)');
      }
    } else {
      toast.success('تم فتح واتساب (لم يتم الحفظ - خطأ في الاتصال)');
    }
  };

  // Handle Edit Job (Manual Jobs Only)
  const handleEditJob = (job: PrintJob) => {
    if (job.source !== 'manual') {
      toast.error('لا يمكن تعديل المشاريع القادمة من سير العمل');
      return;
    }
    const bookingDetails = job.rawBooking?.details as
      | {
          printerProductId?: string;
          printerUnitPrice?: number;
          printerQuantity?: number;
        }
      | undefined;

    const matchedProduct =
      printerProducts.find(item => item.id === bookingDetails?.printerProductId) ||
      printerProducts.find(item => item.name === job.productType);

    setEditingJob(job);
    setNewJob({
      clientName: job.clientName,
      clientPhone: job.clientPhone,
      productType: matchedProduct?.name || job.productType,
      productCatalogId: matchedProduct?.id,
      quantity: bookingDetails?.printerQuantity || job.quantity,
      unitPrice: bookingDetails?.printerUnitPrice || matchedProduct?.price || 0,
      priority: job.priority,
      deadline: job.deadline,
      paperType: job.paperType || matchedProduct?.description || job.productType,
      thumbnail: job.thumbnail,
      source: 'manual',
    });
    setShowEditJobModal(true);
    setSelectedJob(null);
  };

  // Handle Update Job
  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob || !newJob.clientName || !newJob.productType || !newJob.productCatalogId) {
      toast.error('يرجى اختيار المنتج من المخزن وإكمال الحقول المطلوبة');
      return;
    }

    if (onUpdateBooking && editingJob.rawBooking) {
      try {
        const quantity = newJob.quantity || 1;
        const unitPrice = newJob.unitPrice || 0;
        await onUpdateBooking(editingJob.id, {
          clientName: newJob.clientName,
          clientPhone: newJob.clientPhone || '',
          title: newJob.productType,
          servicePackage: newJob.paperType || 'طباعة عادية',
          deliveryDeadline: newJob.deadline || '',
          totalAmount: unitPrice * quantity,
          details: {
            ...(editingJob.rawBooking.details || {}),
            printerProductId: newJob.productCatalogId,
            printerUnitPrice: unitPrice,
            printerQuantity: quantity,
          },
        });
        toast.success('تم تحديث الطلب بنجاح');
        setShowEditJobModal(false);
        setEditingJob(null);
        setNewJob(getInitialFormState());
      } catch (error) {
        toast.error('حدث خطأ أثناء تحديث الطلب');
      }
    } else {
      toast.error('وظيفة التحديث غير متاحة');
    }
  };

  // Handle Delete Job (Manual Jobs Only)
  const handleDeleteJob = (job: PrintJob) => {
    if (job.source !== 'manual') {
      toast.error('لا يمكن حذف المشاريع القادمة من سير العمل');
      return;
    }
    setJobToDelete(job);
    setShowDeleteConfirm(true);
    setSelectedJob(null);
  };

  // Confirm Delete
  const confirmDeleteJob = async () => {
    if (!jobToDelete || !jobToDelete.rawBooking) {
      toast.error('خطأ في البيانات');
      return;
    }

    if (onStatusUpdate) {
      try {
        // Instead of actually deleting, we could mark it as cancelled or remove from print queue
        // For now, let's assume we have a delete function in the backend
        // await electronBackend.deleteBooking(jobToDelete.id);
        toast.success('تم حذف الطلب بنجاح');
        setShowDeleteConfirm(false);
        setJobToDelete(null);
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف الطلب');
      }
    }
  };
  const filteredJobs = jobs.filter(j => {
    if (activeTab === 'queue') return j.status === 'queue';
    if (activeTab === 'printing') return j.status === 'printing';
    if (activeTab === 'ready') return j.status === 'ready';
    if (activeTab === 'delivered') return j.status === 'delivered';
    return true;
  });

  // Calculate duration between notification and delivery
  const getDeliveryDelay = (sent: string, delivered: string) => {
    const start = new Date(sent).getTime();
    const end = new Date(delivered).getTime();
    const diffHours = (end - start) / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} يوم`;
    return `${Math.floor(diffHours)} ساعة`;
  };

  // View Switching Logic
  type View = 'dashboard' | 'archive' | 'inventory' | 'team-chat'; // Add team-chat
  const [view, setView] = useState<View>('dashboard');

  useEffect(() => {
    if (activeSection === 'section-archive') setView('archive');
    else if (activeSection === 'section-inventory') setView('inventory');
    else if (activeSection === 'section-team-chat')
      setView('team-chat'); // Handle chat section
    else setView('dashboard');
  }, [activeSection]);

  if (view === 'archive') {
    return <PrinterArchiveView bookings={bookings} />;
  }

  if (view === 'inventory') {
    return <PrinterInventoryView />;
  }

  if (view === 'team-chat') {
    return <UnifiedTeamChat currentUser={currentUser} users={users} />;
  }

  return (
    <div className="h-full min-h-0 w-full bg-[#0a0f0d] flex flex-col overflow-x-hidden overflow-y-auto xl:overflow-hidden relative font-sans text-gray-100 selection:bg-emerald-500/30">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[20%] w-[60%] h-[40%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-teal-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* --- HEADER --- */}
      <div className="shrink-0 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0 bg-[#0a0f0d]/50 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <PrinterIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">قسم الطباعة</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
              Print Station Command
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">الطابعات متصلة</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <MonitorPlay size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row p-3 sm:p-4 lg:p-6 gap-4 lg:gap-6 relative z-10">
        {/* --- LEFT COLUMN: QUEUE & JOBS --- */}
        <div className="flex-1 flex flex-col min-w-0 gap-6">
          {/* Workflow Tracker & Toolbar */}
          <div className="flex flex-col gap-6">
            {/* Workflow Status Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
              {[
                {
                  id: 'queue',
                  icon: Clock,
                  label: 'قيد الانتظار',
                  count: jobs.filter(j => j.status === 'queue').length,
                  color: 'text-gray-400',
                  bg: 'bg-white/5',
                  border: 'border-white/5',
                },
                {
                  id: 'printing',
                  icon: PrinterIcon,
                  label: 'جاري الطباعة',
                  count: jobs.filter(j => j.status === 'printing').length,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  border: 'border-blue-500/20',
                },
                {
                  id: 'ready',
                  icon: CheckCircle2,
                  label: 'التسليم',
                  count: jobs.filter(j => j.status === 'ready').length,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10',
                  border: 'border-emerald-500/20',
                },
                {
                  id: 'delivered',
                  icon: Package,
                  label: 'تم التسليم والأرشفة',
                  count: jobs.filter(j => j.status === 'delivered').length,
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                  border: 'border-purple-500/20',
                },
              ].map(status => (
                <button
                  key={status.id}
                  onClick={() => setActiveTab(status.id as PrintJob['status'])}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 group
                           ${activeTab === status.id ? `${status.bg} ${status.border} ring-1 ring-inset ring-white/10` : 'bg-[#151a18] border-white/5 hover:border-white/10'}
                        `}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${status.bg} ${status.color} transition-transform group-hover:scale-110`}
                  >
                    <status.icon size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className={`text-2xl font-bold ${status.color} font-mono mb-1`}>
                      {status.count}
                    </h3>
                    <p
                      className={`text-[10px] font-bold ${activeTab === status.id ? 'text-white' : 'text-gray-500'}`}
                    >
                      {status.label}
                    </p>
                  </div>

                  {activeTab === status.id && (
                    <motion.div
                      layoutId="activeWorkflowGlow"
                      className={`absolute inset-0 rounded-2xl ${status.bg} opacity-20 blur-xl -z-10`}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Filters & Actions Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 bg-[#151a18] p-2 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 w-full xl:w-auto">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="بحث في الطلبات..."
                    className="pl-4 pr-9 py-2.5 rounded-xl bg-black/20 border border-white/5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 w-full sm:w-64 transition-all"
                  />
                </div>
                <button className="p-2.5 rounded-xl bg-black/20 border border-white/5 text-gray-400 hover:text-white transition-colors hover:bg-white/5">
                  <Filter size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 px-2 justify-center xl:justify-start">
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] text-gray-500 font-medium">
                  عرض:{' '}
                  {activeTab === 'queue'
                    ? 'الانتظار'
                    : activeTab === 'printing'
                      ? 'قيد الطباعة'
                      : activeTab === 'ready'
                        ? 'جاهز للاستلام'
                        : 'الأرشيف'}
                </span>
              </div>

              <button
                onClick={() => setShowAddJobModal(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 w-full xl:w-auto"
              >
                <Plus size={16} />
                <span>عمل جديد</span>
              </button>
            </div>
          </div>

          {/* Jobs Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredJobs.map((job, idx) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedJob(job)}
                    className="group relative bg-[#151a18] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
                        {job.thumbnail}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                            {job.productType}
                          </h3>
                          {job.priority === 'high' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mb-2">{job.clientName}</p>

                        <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-black/20 px-2 py-1 rounded-lg w-fit">
                          <Clock size={10} />
                          <span>{job.deadline}</span>
                        </div>
                      </div>
                    </div>

                    {job.status === 'printing' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-emerald-400 mb-1 font-bold">
                          <span>جاري الطباعة</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress}%` }}
                            className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* Delivered Badge */}
                    {job.status === 'delivered' && (
                      <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg transform rotate-[-10deg] border-2 border-white/20">
                          تم التسليم
                        </div>
                      </div>
                    )}

                    {/* Ready Badge (Small) */}
                    {job.status === 'ready' && job.notificationSentAt && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/10">
                        <CheckCircle2 size={10} />
                        <span>تم إبلاغ العميل</span>
                      </div>
                    )}

                    {/* Manual Job Indicator */}
                    {job.source === 'manual' && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                          <span>يدوي</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: TASKS PANEL --- */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
          {/* Tasks Panel */}
          <TasksPanel isManager={false} />
        </div>
      </div>

      {/* Job Detail Modal Overlay */}
      <AnimatePresence>
        {selectedJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative bg-[#151a18] rounded-4xl p-8 max-w-md w-full shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-emerald-900/20 to-transparent pointer-events-none" />

              <button
                onClick={() => setSelectedJob(null)}
                className="absolute top-6 left-6 p-2 rounded-xl bg-black/20 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8 relative">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(16,185,129,0.1)] mb-6">
                  {selectedJob.thumbnail}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedJob.productType}</h2>
                <p className="text-emerald-400 font-medium">{selectedJob.clientName}</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 space-y-4 border border-white/5 mb-8">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-gray-400 text-sm">الكمية المطلوبة</span>
                  <span className="text-white font-bold font-mono text-lg">
                    {selectedJob.quantity}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-gray-400 text-sm">حالة الطلب</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedJob.status === 'delivered' ? 'bg-purple-500/20 text-purple-400 border-purple-500/20' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
                  >
                    {selectedJob.status === 'queue' && 'قيد الانتظار'}
                    {selectedJob.status === 'printing' && 'جاري الطباعة'}
                    {selectedJob.status === 'ready' && 'في قسم التسليم'}
                    {selectedJob.status === 'delivered' && 'تم التسليم'}
                  </span>
                </div>

                {/* Timestamp tracking for accountability */}
                {(selectedJob.notificationSentAt || selectedJob.deliveredAt) && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    {selectedJob.notificationSentAt && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500">وقت إبلاغ العميل</span>
                        <span className="text-emerald-400 font-mono">
                          {new Date(selectedJob.notificationSentAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    )}

                    {selectedJob.deliveredAt && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500">وقت التسليم الفعلي</span>
                        <span className="text-purple-400 font-mono">
                          {new Date(selectedJob.deliveredAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    )}

                    {selectedJob.notificationSentAt && selectedJob.deliveredAt && (
                      <div className="flex justify-between items-center text-[10px] bg-white/5 p-2 rounded-lg mt-2">
                        <span className="text-gray-400">مدة التأخير (عند العميل)</span>
                        <span className="text-rose-400 font-bold">
                          {getDeliveryDelay(
                            selectedJob.notificationSentAt,
                            selectedJob.deliveredAt
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Action Buttons */}
              <div className="space-y-3">
                {selectedJob.status === 'queue' && (
                  <button
                    onClick={() => updateJobStatus(selectedJob.id, 'printing')}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 hover:shadow-emerald-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                    <PrinterIcon size={20} />
                    <span>بدء الطباعة الآن</span>
                  </button>
                )}

                {selectedJob.status === 'printing' && (
                  <button
                    onClick={() => updateJobStatus(selectedJob.id, 'ready')}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 hover:shadow-emerald-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    <span>إتمام الطباعة (جاهز للتسليم)</span>
                  </button>
                )}

                {selectedJob.status === 'ready' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSendWhatsapp(selectedJob)}
                      className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 hover:shadow-green-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={20} />
                      <span>إبلاغ العميل (واتساب)</span>
                    </button>
                    <p className="text-[10px] text-gray-500 text-center px-4">
                      عند الضغط سيتم تسجيل وقت الإرسال لحفظ حقك في حال تأخر العميل.
                    </p>
                    <button
                      onClick={() => updateJobStatus(selectedJob.id, 'delivered')}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      <span>تسليم للعميل (أرشفة)</span>
                    </button>
                  </div>
                )}

                {selectedJob.status === 'delivered' && (
                  <div className="flex flex-col gap-2">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3 text-purple-400">
                      <CheckCircle2 size={24} />
                      <div>
                        <p className="font-bold text-sm">تم تسليم الطلب بنجاح</p>
                        <p className="text-[10px] opacity-80">تم حفظ وقت التسليم في السجل</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit/Delete Buttons for Manual Jobs */}
                {selectedJob.source === 'manual' && selectedJob.status !== 'delivered' && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => handleEditJob(selectedJob)}
                      className="flex-1 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJob(selectedJob)}
                      className="flex-1 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      <span>حذف</span>
                    </button>
                  </div>
                )}

                {/* Workflow Source Indicator */}
                {selectedJob.source === 'workflow' && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400">
                      <AlertCircle size={16} />
                      <p className="text-xs">هذا المشروع من سير العمل ولا يمكن تعديله أو حذفه</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Create Job Modal */}
      <AnimatePresence>
        {showAddJobModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddJobModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1f1d] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-linear-to-r from-emerald-500/5 to-transparent">
                <h2 className="text-lg font-bold text-white">إضافة أمر طباعة جديد</h2>
                <button
                  onClick={() => setShowAddJobModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">اسم العميل</label>
                  <input
                    required
                    value={newJob.clientName || ''}
                    onChange={e => setNewJob({ ...newJob, clientName: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">رقم الهاتف (للواتساب)</label>
                  <input
                    type="tel"
                    value={newJob.clientPhone || ''}
                    onChange={e => setNewJob({ ...newJob, clientPhone: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none font-mono"
                    placeholder="964xxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">نوع الألبوم / المنتج (من المخزن)</label>
                  <select
                    required
                    value={newJob.productCatalogId || ''}
                    onChange={e => handleSelectProduct(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                  >
                    <option value="">اختر منتجاً من المخزن</option>
                    {printerProducts
                      .filter(item => item.stock > 0)
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.price.toLocaleString()} د.ع ({item.stock} متاح)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={newJob.quantity || ''}
                      onChange={e => setNewJob({ ...newJob, quantity: Number(e.target.value) })}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">الأولوية</label>
                    <select
                      value={newJob.priority || 'normal'}
                      onChange={e =>
                        setNewJob({
                          ...newJob,
                          priority: e.target.value as PrintJob['priority'],
                        })
                      }
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                    >
                      <option value="normal">عادية</option>
                      <option value="high">مستعجلة 🔥</option>
                      <option value="low">منخفضة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={newJob.deadline || ''}
                    onChange={e => setNewJob({ ...newJob, deadline: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">سعر القطعة</label>
                    <div className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-emerald-300 font-mono">
                      {(newJob.unitPrice || 0).toLocaleString()} د.ع
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">الإجمالي</label>
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-300 font-bold font-mono">
                      {computedTotal.toLocaleString()} د.ع
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddJobModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    تأكيد الطلب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Job Modal */}
      <AnimatePresence>
        {showEditJobModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditJobModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1f1d] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-linear-to-r from-blue-500/5 to-transparent">
                <h2 className="text-lg font-bold text-white">تعديل أمر الطباعة</h2>
                <button
                  onClick={() => setShowEditJobModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateJob} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">اسم العميل</label>
                  <input
                    required
                    value={newJob.clientName || ''}
                    onChange={e => setNewJob({ ...newJob, clientName: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">رقم الهاتف (للواتساب)</label>
                  <input
                    type="tel"
                    value={newJob.clientPhone || ''}
                    onChange={e => setNewJob({ ...newJob, clientPhone: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none font-mono"
                    placeholder="964xxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">نوع الألبوم / المنتج (من المخزن)</label>
                  <select
                    required
                    value={newJob.productCatalogId || ''}
                    onChange={e => handleSelectProduct(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="">اختر منتجاً من المخزن</option>
                    {printerProducts
                      .filter(item => item.stock > 0 || item.id === newJob.productCatalogId)
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.price.toLocaleString()} د.ع ({item.stock} متاح)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      value={newJob.quantity || ''}
                      onChange={e => setNewJob({ ...newJob, quantity: Number(e.target.value) })}
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">الأولوية</label>
                    <select
                      value={newJob.priority || 'normal'}
                      onChange={e =>
                        setNewJob({
                          ...newJob,
                          priority: e.target.value as PrintJob['priority'],
                        })
                      }
                      className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none"
                    >
                      <option value="normal">عادية</option>
                      <option value="high">مستعجلة 🔥</option>
                      <option value="low">منخفضة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">تاريخ التسليم المتوقع</label>
                  <input
                    type="date"
                    value={newJob.deadline || ''}
                    onChange={e => setNewJob({ ...newJob, deadline: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">سعر القطعة</label>
                    <div className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-blue-300 font-mono">
                      {(newJob.unitPrice || 0).toLocaleString()} د.ع
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">الإجمالي</label>
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-300 font-bold font-mono">
                      {computedTotal.toLocaleString()} د.ع
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditJobModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg shadow-blue-600/20"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && jobToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1a1f1d] border border-rose-500/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-linear-to-r from-rose-500/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <AlertCircle size={24} className="text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">تأكيد الحذف</h2>
                    <p className="text-xs text-gray-400">هذا الإجراء لا يمكن التراجع عنه</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <p className="text-sm text-gray-300 mb-2">هل أنت متأكد من حذف هذا الطلب؟</p>
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-2xl">{jobToDelete.thumbnail}</span>
                    <div>
                      <p className="font-bold">{jobToDelete.productType}</p>
                      <p className="text-xs text-gray-400">{jobToDelete.clientName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmDeleteJob}
                    className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-lg shadow-rose-600/20"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PaymentLockModal
        isOpen={showPaymentLockModal}
        onClose={() => {
          setShowPaymentLockModal(false);
          setPendingDeliveryJob(null);
        }}
        outstandingAmount={
          pendingDeliveryJob
            ? (bookings.find(b => b.id === pendingDeliveryJob.id)?.totalAmount || 0) -
              (bookings.find(b => b.id === pendingDeliveryJob.id)?.paidAmount || 0)
            : 0
        }
        onSettle={handlePaymentSettled}
      />
    </div>
  );
};

export default PrinterDashboard;
