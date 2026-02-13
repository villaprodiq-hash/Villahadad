import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LayoutGrid, Image, MessageCircle, Camera, Clock, CheckCircle2,
  CalendarDays, Search, Phone, Eye, Send, ArrowLeft, ArrowRight,
  AlertTriangle, HardDrive, Bell, FolderOpen, Star, Filter,
  ChevronDown, Sparkles, X, ZoomIn, Heart, ThumbsDown, Minus,
  ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Loader2,
  Copy, Plus, Upload, Link2, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Booking, BookingStatus, BookingCategory, User } from '../../types';
import UnifiedTeamChat from '../shared/UnifiedTeamChat';
import { toast } from 'sonner';
import { formatMoney } from '../../utils/formatMoney';
import { electronBackend } from '../../services/mockBackend';
import { buildClientPortalUrl } from '../../utils/clientPortal';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface SelectionDashboardProps {
  bookings: Booking[];
  currentUser?: User;
  users?: User[];
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

type ViewState = 'HOME' | 'GALLERY' | 'CHAT';
type PhotoStatus = 'approved' | 'rejected' | 'pending' | 'maybe';

interface GalleryPhoto {
  id: number;
  src: string;
  name: string;
  status: PhotoStatus;
  rating: number;
  note: string;
  tags: string[];
  cloudUrl?: string | null;
  thumbnailUrl?: string | null;
  localPath?: string | null;
}

const EDITING_TAGS = [
  'تبييض أسنان', 'إزالة عيوب', 'تنعيم بشرة', 'تنحيف',
  'فتح عيون', 'إزالة كائن', 'تعديل ألوان', 'تأطير'
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const SelectionDashboard: React.FC<SelectionDashboardProps> = ({
  bookings, currentUser, users = [], onStatusUpdate
}) => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'waiting' | 'active' | 'done'>('all');

  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showTagsPopover, setShowTagsPopover] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState<{
    percent: number; status: string; current?: number; total?: number; startTime?: number;
  } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{
    id: string; type: 'warning' | 'info' | 'success'; message: string; bookingId: string; time: string;
  }>>([]);

  // ── Computed Data ──────────────────────────────────────
  const selectionBookings = useMemo(() =>
    bookings.filter(b =>
      b.status === BookingStatus.SHOOTING_COMPLETED ||
      b.status === BookingStatus.SELECTION
    ), [bookings]);

  const editingBookings = useMemo(() =>
    bookings.filter(b => b.status === BookingStatus.EDITING), [bookings]);

  const readyForPickup = useMemo(() =>
    bookings.filter(b => b.status === BookingStatus.READY_FOR_PICKUP), [bookings]);

  const filteredBookings = useMemo(() => {
    let result = selectionBookings;

    if (filterTab === 'waiting') {
      result = result.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED);
    } else if (filterTab === 'active') {
      result = result.filter(b => b.status === BookingStatus.SELECTION);
    } else if (filterTab === 'done') {
      result = editingBookings;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.clientName || '').toLowerCase().includes(q) ||
        (b.title || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectionBookings, editingBookings, filterTab, searchQuery]);

  // ── Generate Notifications ────────────────────────────
  useEffect(() => {
    const notifs: typeof notifications = [];

    selectionBookings.forEach(b => {
      if (b.status === BookingStatus.SHOOTING_COMPLETED) {
        if (b.nasStatus === 'pending' || b.nasStatus === 'none' || !b.nasStatus) {
          notifs.push({
            id: `nas-${b.id}`,
            type: 'warning',
            message: `الصور لم تُنقل بعد من NAS - ${b.clientName}`,
            bookingId: b.id,
            time: 'الآن'
          });
        }
        if (b.nasStatus === 'synced') {
          notifs.push({
            id: `ready-${b.id}`,
            type: 'info',
            message: `الصور جاهزة للاختيار - ${b.clientName}`,
            bookingId: b.id,
            time: 'الآن'
          });
        }
      }
    });

    setNotifications(notifs);
  }, [selectionBookings]);

  // ── Handlers ──────────────────────────────────────────
  const handleStartSelection = useCallback(async (booking: Booking) => {
    if (!onStatusUpdate) return;
    try {
      await onStatusUpdate(booking.id, BookingStatus.SELECTION);
      toast.success(`بدأ اختيار الصور - ${booking.clientName}`);
    } catch {
      toast.error('فشل بدء الاختيار');
    }
  }, [onStatusUpdate]);

  const handleFinishSelection = useCallback(async (booking: Booking) => {
    if (!onStatusUpdate) return;
    const approvedPhotos = galleryPhotos.filter(p => p.status === 'approved');
    if (approvedPhotos.length === 0) {
      toast.error('لا توجد صور مختارة — اختر صور أولاً');
      return;
    }
    if (!window.confirm(`إنهاء الاختيار وإرسال "${booking.clientName}" للتصميم؟\n\nسيتم نسخ ${approvedPhotos.length} صورة مختارة إلى مجلد 02_SELECTED`)) return;
    try {
      // Copy approved photos to 02_SELECTED folder
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.sessionLifecycle?.copyToSelected && booking.folderPath) {
        const fileNames = approvedPhotos.map(p => p.name);
        const result = await electronAPI.sessionLifecycle.copyToSelected(booking.folderPath, fileNames);
        if (result?.copied > 0) {
          toast.success(`تم نسخ ${result.copied} صورة إلى مجلد الاختيار`);
        }
        if (result?.failed > 0) {
          toast.error(`فشل نسخ ${result.failed} صورة`);
        }
      }

      await onStatusUpdate(booking.id, BookingStatus.EDITING);
      toast.success(`تم إرسال "${booking.clientName}" للتصميم`);
      setSelectedBooking(null);
      setCurrentView('HOME');
    } catch {
      toast.error('فشل إرسال الحجز للتصميم');
    }
  }, [onStatusUpdate, galleryPhotos]);

  /** Ensure session folder exists; create if missing and update booking with folderPath */
  const ensureSessionFolder = useCallback(async (booking: Booking): Promise<Booking> => {
    if (booking.folderPath) return booking;

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.sessionLifecycle?.createSessionDirectory) return booking;

    try {
      const sessionId = booking.nasSessionId || booking.id;
      const dateStr = booking.shootDate || new Date().toISOString();
      const result = await electronAPI.sessionLifecycle.createSessionDirectory(
        booking.clientName || '',
        sessionId,
        dateStr,
        booking
      );
      if (!result?.success || !result.sessionPath) return booking;

      await electronBackend.updateBooking(booking.id, {
        folderPath: result.sessionPath,
        nasSessionId: sessionId,
      });
      return { ...booking, folderPath: result.sessionPath, nasSessionId: sessionId };
    } catch (err) {
      console.error('[Selection] ensureSessionFolder failed:', err);
      return booking;
    }
  }, []);

  const handleOpenGallery = useCallback(async (booking: Booking) => {
    const bookingWithFolder = await ensureSessionFolder(booking);
    setSelectedBooking(bookingWithFolder);
    setCurrentView('GALLERY');
    loadPhotosFromNAS(bookingWithFolder);
  }, [ensureSessionFolder]);

  const loadPhotosFromNAS = useCallback(async (booking: Booking) => {
    setIsLoadingPhotos(true);
    setGalleryPhotos([]);

    try {
      const electronAPI = (window as any).electronAPI;
      if (booking.folderPath && electronAPI?.fileSystem?.listDirectory) {
        const rawPath = `${booking.folderPath}/01_RAW`;
        const files = await electronAPI.fileSystem.listDirectory(rawPath);

        if (files && Array.isArray(files)) {
          const imageFiles = files
            .filter((f: any) => /\.(jpg|jpeg|png|raw|cr2|arw|heic|webp)$/i.test(f.name))
            .map((f: any, i: number) => ({
              id: i + 1,
              src: `file://${f.path}`,
              name: f.name,
              status: 'pending' as PhotoStatus,
              rating: 0,
              note: '',
              tags: [] as string[],
            }));
          setGalleryPhotos(imageFiles);
          toast.success(`تم تحميل ${imageFiles.length} صورة`);
        } else {
          // NAS folder exists but empty
          setGalleryPhotos([]);
        }
      } else {
        // No NAS - user adds photos manually
        setGalleryPhotos([]);
      }
    } catch (err) {
      console.error('[Gallery] Failed to load:', err);
      toast.error('فشل تحميل الصور');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, []);

  // ── Ingest files via Electron IPC (cache + R2) ─────────
  const ingestFiles = useCallback(async (files: File[]) => {
    if (!selectedBooking) return;

    const electronAPI = (window as any).electronAPI;

    // Ensure session folder exists before ingest (fixes wrong-path bug)
    let booking = selectedBooking;
    if (!booking.folderPath) {
      booking = await ensureSessionFolder(booking);
      setSelectedBooking(booking);
    }

    // 1. Show photos immediately in gallery (blob URLs for instant preview)
    const newPhotos: GalleryPhoto[] = files.map((file, i) => ({
      id: Date.now() + i,
      src: URL.createObjectURL(file),
      name: file.name,
      status: 'pending' as PhotoStatus,
      rating: 0,
      note: '',
      tags: [] as string[],
    }));
    setGalleryPhotos(prev => [...prev, ...newPhotos]);

    // 2. Send to IngestionService via Electron IPC (cache + R2 upload)
    const filePaths = files.map((f: any) => f.path).filter(Boolean);
    const hasFilePaths = filePaths.length > 0;
    console.log('[Ingest] File paths:', filePaths, '| Has paths:', hasFilePaths);
    console.log('[Ingest] electronAPI available:', !!electronAPI);

    if (electronAPI?.sessionLifecycle) {
      try {
        const startTime = Date.now();
        const totalFiles = files.length;
        setIngestionProgress({ percent: 0, status: 'جاري المعالجة...', current: 0, total: totalFiles, startTime });

        // Listen for progress
        const unsub = electronAPI.sessionLifecycle.onIngestionProgress?.((data: any) => {
          const current = Math.round(((data.progress || 0) / 100) * totalFiles);
          setIngestionProgress({
            percent: data.progress || 0,
            status: data.status || '',
            current,
            total: totalFiles,
            startTime,
          });
        });

        const sessionInfo = {
          clientName: booking.clientName || '',
          sessionId: booking.id,
          bookingId: booking.id,
          date: new Date(),
          sessionPath: booking.folderPath || '',
        };

        let result;
        if (hasFilePaths && electronAPI.sessionLifecycle.processFiles) {
          // Direct file path mode (non-sandbox)
          result = await electronAPI.sessionLifecycle.processFiles(filePaths, sessionInfo);
        } else if (electronAPI.sessionLifecycle.processFileBuffers) {
          // Sandbox mode: read files as ArrayBuffer and send via IPC
          console.log('[Ingest] Sandbox mode — reading files as buffers...');
          const fileBuffers = await Promise.all(
            files.map(async (f) => ({
              name: f.name,
              buffer: await f.arrayBuffer(),
            }))
          );
          result = await electronAPI.sessionLifecycle.processFileBuffers(fileBuffers, sessionInfo);
        }

        unsub?.();

        console.log('[Ingest] Result:', JSON.stringify(result, null, 2));

        if (result?.success?.length > 0) {
          // Update gallery photos with cloud URLs from R2
          setGalleryPhotos(prev => prev.map((p) => {
            const match = result.success.find((s: any) => s.fileName === p.name);
            if (match) {
              return {
                ...p,
                src: match.thumbnail || match.cloud || p.src,
                cloudUrl: match.cloud,
                thumbnailUrl: match.thumbnail,
                localPath: match.local
              };
            }
            return p;
          }));
          const uploadedCount = result.success.filter((s: any) => s.cloud).length;
          if (uploadedCount > 0) {
            toast.success(`تم رفع ${uploadedCount} صورة إلى R2 بنجاح`);
          } else {
            toast.warning(`تم حفظ الصور محلياً فقط - R2 غير متاح`);
          }
        }
        if (result?.failed?.length > 0) {
          console.error('[Ingest] Failed files:', result.failed);
          const firstError = result.failed[0]?.error || 'خطأ غير معروف';
          toast.error(`فشل رفع ${result.failed.length} صورة: ${firstError}`);
        }
      } catch (err) {
        console.error('[Selection] Ingestion failed:', err);
        toast.error('فشل معالجة الصور');
      } finally {
        setIngestionProgress(null);
      }
    } else {
      // No Electron IPC - files stay as blob URLs (dev/preview mode)
      toast.success(`تم إضافة ${files.length} صورة (معاينة فقط)`);
    }
  }, [selectedBooking, ensureSessionFolder]);

  // ── Add photos manually (file picker) ──────────────────
  const handleAddPhotosManually = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length > 0) ingestFiles(files);
    };
    input.click();
  }, [ingestFiles]);

  // ── Drag & Drop handlers ──────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const allFiles = Array.from(e.dataTransfer.files);
    console.log('[Drop] Total files dropped:', allFiles.length);
    allFiles.forEach((f: any, i) => {
      console.log(`[Drop] File ${i}: name=${f.name}, path=${f.path}, size=${f.size}, type=${f.type}`);
    });

    const files = allFiles.filter(f =>
      /\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff?|cr2|arw|raw)$/i.test(f.name)
    );

    if (files.length === 0) {
      toast.error('لم يتم العثور على صور صالحة');
      return;
    }

    console.log('[Drop] Valid image files:', files.length);
    ingestFiles(files);
  }, [ingestFiles]);

  const handlePhotoStatus = useCallback((photoId: number, status: PhotoStatus) => {
    setGalleryPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, status } : p
    ));
  }, []);

  const handlePhotoRating = useCallback((photoId: number, rating: number) => {
    setGalleryPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, rating } : p
    ));
  }, []);

  const handlePhotoNote = useCallback((photoId: number, note: string) => {
    setGalleryPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, note } : p
    ));
  }, []);

  const handleToggleTag = useCallback((photoId: number, tag: string) => {
    setGalleryPhotos(prev => prev.map(p => {
      if (p.id !== photoId) return p;
      const tags = p.tags.includes(tag)
        ? p.tags.filter(t => t !== tag)
        : [...p.tags, tag];
      return { ...p, tags };
    }));
  }, []);

  const handleAddCustomTag = useCallback(() => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (!customTags.includes(tag) && !EDITING_TAGS.includes(tag)) {
      setCustomTags(prev => [...prev, tag]);
    }
    // Also toggle it on the current photo
    if (lightboxIndex !== null && galleryPhotos[lightboxIndex]) {
      const photo = galleryPhotos[lightboxIndex];
      if (!photo.tags.includes(tag)) {
        handleToggleTag(photo.id, tag);
      }
    }
    setCustomTagInput('');
  }, [customTagInput, customTags, lightboxIndex, galleryPhotos, handleToggleTag]);

  const allTags = useMemo(() => [...EDITING_TAGS, ...customTags], [customTags]);

  const handleLightboxNav = useCallback((direction: 'next' | 'prev') => {
    if (lightboxIndex === null) return;
    const nextIdx = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (nextIdx >= 0 && nextIdx < galleryPhotos.length) {
      setLightboxIndex(nextIdx);
      setZoomLevel(1);
      setZoomPos({ x: 50, y: 50 });
      setShowTagsPopover(false);
    }
  }, [lightboxIndex, galleryPhotos.length]);

  // ── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => [
    {
      label: 'بانتظار الاختيار',
      value: selectionBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED).length,
      icon: Clock, color: 'amber', gradient: 'from-amber-500 to-orange-600'
    },
    {
      label: 'جاري الاختيار',
      value: selectionBookings.filter(b => b.status === BookingStatus.SELECTION).length,
      icon: Eye, color: 'violet', gradient: 'from-violet-500 to-purple-600'
    },
    {
      label: 'تم إرسالها للتصميم',
      value: editingBookings.length,
      icon: Send, color: 'blue', gradient: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'جاهز للاستلام',
      value: readyForPickup.length,
      icon: CheckCircle2, color: 'emerald', gradient: 'from-emerald-500 to-teal-600'
    },
  ], [selectionBookings, editingBookings, readyForPickup]);

  // ── Gallery Stats ─────────────────────────────────────
  const galleryStats = useMemo(() => ({
    total: galleryPhotos.length,
    approved: galleryPhotos.filter(p => p.status === 'approved').length,
    rejected: galleryPhotos.filter(p => p.status === 'rejected').length,
    maybe: galleryPhotos.filter(p => p.status === 'maybe').length,
    pending: galleryPhotos.filter(p => p.status === 'pending').length,
  }), [galleryPhotos]);

  // ── Sidebar ───────────────────────────────────────────
  const navItems = [
    { id: 'HOME' as ViewState, icon: LayoutGrid, label: 'الرئيسية', count: selectionBookings.length },
    { id: 'GALLERY' as ViewState, icon: Image, label: 'المعرض', count: galleryPhotos.length > 0 ? galleryStats.pending : 0 },
    { id: 'CHAT' as ViewState, icon: MessageCircle, label: 'الدردشة', count: 0 },
  ];

  return (
    <div className="h-full w-full flex overflow-hidden font-sans" dir="rtl">

      {/* ─── SIDEBAR ─── */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-[72px] shrink-0 my-3 mr-3 flex flex-col items-center py-4 rounded-2xl bg-[#0c0c10]/90 backdrop-blur-2xl border border-white/[0.04] z-50"
      >
        {/* Logo */}
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-violet-500/25">
            {currentUser?.name?.charAt(0) || 'S'}
          </div>
        </div>


        {/* Nav */}
        <div className="flex flex-col gap-2 w-full px-3 flex-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`group relative w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={18} strokeWidth={currentView === item.id ? 2.5 : 1.8} />
              <span className="text-[7px] font-bold tracking-wide">{item.label}</span>
              {item.count > 0 && (
                <div className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[#0c0c10]">
                  {item.count}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Notifications Bell */}
        <div className="mt-auto relative">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all">
            <Bell size={18} />
          </button>
          {notifications.filter(n => n.type === 'warning').length > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black border-2 border-[#0c0c10] animate-pulse">
              {notifications.filter(n => n.type === 'warning').length}
            </div>
          )}
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-3 ml-1.5">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════ */}
          {/* HOME VIEW                              */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2">
                    صالة الاختيار
                    <Sparkles size={16} className="text-violet-400" />
                  </h1>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {selectionBookings.length} حجز بانتظار الاختيار
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="w-52 h-9 pr-9 pl-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:border-white/[0.08] transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                        <stat.icon size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-white leading-none">{stat.value}</p>
                        <p className="text-[9px] text-zinc-500 font-bold mt-0.5">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notifications Bar */}
              {notifications.filter(n => n.type === 'warning').length > 0 && (
                <div className="mb-3 shrink-0">
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-300 text-xs font-bold">تنبيهات النقل</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {notifications.filter(n => n.type === 'warning').map(n => (
                          <span key={n.id} className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                            {n.message}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-3 shrink-0">
                {[
                  { id: 'all' as const, label: 'الكل', count: selectionBookings.length },
                  { id: 'waiting' as const, label: 'بانتظار', count: selectionBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED).length },
                  { id: 'active' as const, label: 'جاري', count: selectionBookings.filter(b => b.status === BookingStatus.SELECTION).length },
                  { id: 'done' as const, label: 'مرسلة', count: editingBookings.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      filterTab === tab.id
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                        : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Main Grid */}
              <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden min-h-0">

                {/* Column 1+2: Booking Cards */}
                <div className="col-span-2 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-2 pl-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredBookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <Camera size={40} className="mb-3 opacity-20" />
                        <p className="text-xs font-bold">لا توجد حجوزات</p>
                        <p className="text-[10px] mt-1 text-zinc-700">الحجوزات ستظهر هنا بعد إتمام التصوير</p>
                      </div>
                    ) : (
                      filteredBookings.map((booking, idx) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          index={idx}
                          onStartSelection={handleStartSelection}
                          onFinishSelection={handleFinishSelection}
                          onOpenGallery={handleOpenGallery}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Ready for Pickup + Activity */}
                <div className="flex flex-col gap-3 overflow-hidden">
                  {/* Ready for Pickup */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="p-3 border-b border-white/[0.04] shrink-0">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        جاهز للاستلام
                        <span className="mr-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{readyForPickup.length}</span>
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {readyForPickup.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-700">
                          <CheckCircle2 size={28} className="mb-2 opacity-15" />
                          <p className="text-[10px] font-bold">لا يوجد</p>
                        </div>
                      ) : (
                        readyForPickup.map(b => (
                          <div key={b.id} className="bg-emerald-500/[0.05] border border-emerald-500/10 rounded-lg p-2.5 hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-xs">
                                {b.clientName?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{b.clientName}</p>
                                <p className="text-zinc-600 text-[9px] truncate">{b.title}</p>
                              </div>
                            </div>
                            {b.clientPhone && (
                              <a href={`tel:${b.clientPhone}`} className="mt-2 flex items-center justify-center gap-1 w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 rounded-md text-emerald-400 text-[9px] font-bold transition-colors">
                                <Phone size={9} /> اتصال
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* NAS Transfer Status */}
                  <div className="shrink-0 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <h3 className="text-white font-bold text-xs flex items-center gap-2 mb-2">
                      <HardDrive size={13} className="text-blue-400" />
                      حالة النقل من NAS
                    </h3>
                    <div className="space-y-1.5">
                      {selectionBookings.slice(0, 3).map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            b.nasStatus === 'synced' ? 'bg-emerald-400' :
                            b.nasStatus === 'pending' ? 'bg-amber-400 animate-pulse' :
                            'bg-zinc-600'
                          }`} />
                          <span className="text-[10px] text-zinc-400 truncate flex-1">{b.clientName}</span>
                          <span className={`text-[9px] font-bold ${
                            b.nasStatus === 'synced' ? 'text-emerald-400' :
                            b.nasStatus === 'pending' ? 'text-amber-400' :
                            'text-zinc-600'
                          }`}>
                            {b.nasStatus === 'synced' ? 'تم النقل' :
                             b.nasStatus === 'pending' ? 'جاري...' :
                             'لم ينقل'}
                          </span>
                        </div>
                      ))}
                      {selectionBookings.length === 0 && (
                        <p className="text-[10px] text-zinc-700 text-center py-2">لا توجد عمليات نقل</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* GALLERY VIEW                           */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'GALLERY' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Gallery Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  {selectedBooking && (
                    <button
                      onClick={() => { setCurrentView('HOME'); setSelectedBooking(null); setGalleryPhotos([]); }}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-white flex items-center gap-2">
                      {selectedBooking ? selectedBooking.clientName : 'المعرض'}
                      <Image size={15} className="text-violet-400" />
                    </h1>
                    <p className="text-zinc-500 text-[10px]">
                      {selectedBooking
                        ? `${selectedBooking.title} • ${galleryPhotos.length} صورة`
                        : 'اختر حجز لعرض الصور'
                      }
                    </p>
                  </div>
                </div>

                {/* Gallery Stats Bar */}
                {galleryPhotos.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-400 font-bold">{galleryStats.approved} مقبول</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-rose-400 font-bold">{galleryStats.rejected} مرفوض</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-400 font-bold">{galleryStats.maybe} ربما</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400 font-bold">{galleryStats.pending} معلق</span>
                    </div>
                    {selectedBooking && selectedBooking.status === BookingStatus.SELECTION && (
                      <button
                        onClick={() => handleFinishSelection(selectedBooking)}
                        className="px-4 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
                      >
                        إنهاء وإرسال للتصميم
                      </button>
                    )}
                    {/* Add More Photos Button */}
                    {selectedBooking && (
                      <button
                        onClick={handleAddPhotosManually}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1"
                      >
                        <Plus size={12} />
                        إضافة صور
                      </button>
                    )}
                    {/* Open Folder in Finder */}
                    {selectedBooking?.folderPath && (
                      <button
                        onClick={async () => {
                          try {
                            const electronAPI = (window as any).electronAPI;
                            if (electronAPI?.nasConfig?.openFolder) {
                              await electronAPI.nasConfig.openFolder(selectedBooking.folderPath);
                            } else {
                              // Fallback: try shell.openPath
                              const { shell } = (window as any).require?.('electron') || {};
                              if (shell) await shell.openPath(selectedBooking.folderPath!);
                            }
                          } catch {
                            toast.error('فشل فتح المجلد');
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-300 border-zinc-500/30"
                      >
                        <FolderOpen size={12} />
                        فتح المجلد
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Gallery Content */}
              {!selectedBooking ? (
                /* No booking selected - show booking picker */
                <div className="flex-1 overflow-y-auto">
                  <p className="text-zinc-500 text-sm mb-4">اختر حجز لعرض صوره:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectionBookings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleOpenGallery(b)}
                        className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all text-right"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center text-violet-400 text-xl font-black mb-3 border border-violet-500/10">
                          {b.clientName?.charAt(0)}
                        </div>
                        <p className="text-white font-bold text-sm truncate">{b.clientName}</p>
                        <p className="text-zinc-500 text-[10px] truncate mt-0.5">{b.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === BookingStatus.SELECTION
                              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                          }`}>
                            {b.status === BookingStatus.SELECTION ? 'جاري الاختيار' : 'بانتظار'}
                          </span>
                          <span className={`text-[9px] ${
                            b.nasStatus === 'synced' ? 'text-emerald-400' : 'text-zinc-600'
                          }`}>
                            {b.nasStatus === 'synced' ? 'الصور منقولة' :
                             b.nasStatus === 'pending' ? 'جاري النقل' :
                             'لم تنقل'}
                          </span>
                        </div>
                      </button>
                    ))}
                    {selectionBookings.length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 text-zinc-600">
                        <FolderOpen size={40} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold">لا توجد حجوزات للعرض</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : isLoadingPhotos ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw size={32} className="text-violet-400 animate-spin mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">جاري تحميل الصور...</p>
                  </div>
                </div>
              ) : (
                /* Photo Grid with Drag & Drop */
                <div
                  className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Ingestion Progress Bar */}
                  {ingestionProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-3 bg-zinc-900/80 backdrop-blur-md border border-white/[0.06] rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Loader2 size={14} className="text-violet-400 animate-spin" />
                          <span className="text-xs text-zinc-300 font-bold">
                            {ingestionProgress.current || 0} / {ingestionProgress.total || 0} صورة
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {ingestionProgress.startTime && ingestionProgress.percent > 0 && ingestionProgress.percent < 100 && (
                            <span className="text-[10px] text-zinc-500">
                              ~{Math.max(1, Math.round(
                                ((Date.now() - ingestionProgress.startTime) / ingestionProgress.percent) * (100 - ingestionProgress.percent) / 1000
                              ))} ثانية متبقية
                            </span>
                          )}
                          <span className="text-[10px] text-violet-400 font-bold">
                            {ingestionProgress.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${ingestionProgress.percent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-1.5 truncate">{ingestionProgress.status}</p>
                    </motion.div>
                  )}

                  {/* Drag overlay */}
                  {isDraggingFiles && (
                    <div className="fixed inset-0 z-50 bg-violet-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                      <div className="bg-zinc-900/95 border-2 border-dashed border-violet-500 rounded-2xl p-12 text-center">
                        <FolderOpen size={48} className="text-violet-400 mx-auto mb-3" />
                        <p className="text-violet-300 text-lg font-bold">أفلت الصور هنا</p>
                        <p className="text-zinc-500 text-xs mt-1">JPG, PNG, HEIC, WebP</p>
                      </div>
                    </div>
                  )}

                  {galleryPhotos.length === 0 ? (
                    /* Empty state - Drop zone */
                    <div
                      className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-violet-500/30 transition-colors cursor-pointer"
                      onClick={handleAddPhotosManually}
                    >
                      <FolderOpen size={48} className="text-zinc-600 mb-4" />
                      <p className="text-zinc-400 text-sm font-bold">اسحب الصور هنا</p>
                      <p className="text-zinc-600 text-xs mt-1">أو اضغط لاختيار الصور من الجهاز</p>
                      <p className="text-zinc-700 text-[10px] mt-3">JPG, PNG, HEIC, WebP, RAW</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                    {galleryPhotos.map(photo => (
                      <div
                        key={photo.id}
                        className={`group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          photo.status === 'approved' ? 'border-emerald-500/40' :
                          photo.status === 'rejected' ? 'border-rose-500/40 opacity-50' :
                          photo.status === 'maybe' ? 'border-amber-500/40' :
                          'border-transparent hover:border-white/10'
                        }`}
                        onClick={() => { setLightboxIndex(galleryPhotos.findIndex(p => p.id === photo.id)); setZoomLevel(1); }}
                      >
                        <img
                          src={photo.src}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            // Deterministic fallback chain without infinite retry loops.
                            const localUrl = photo.localPath
                              ? (photo.localPath.startsWith('file://') ? photo.localPath : `file://${photo.localPath}`)
                              : null;
                            const candidates = Array.from(
                              new Set([photo.thumbnailUrl, photo.cloudUrl, localUrl].filter(Boolean))
                            ) as string[];

                            let failed = new Set<string>();
                            try {
                              failed = new Set(JSON.parse(img.dataset.failedSources || '[]'));
                            } catch {
                              failed = new Set<string>();
                            }

                            if (img.currentSrc) failed.add(img.currentSrc);
                            if (img.src) failed.add(img.src);
                            img.dataset.failedSources = JSON.stringify(Array.from(failed));

                            const nextSrc = candidates.find((u) => !failed.has(u));
                            if (nextSrc) {
                              img.src = nextSrc;
                            } else {
                              // Final fallback: hide broken icon, show placeholder
                              img.style.display = 'none';
                            }
                          }}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn size={20} className="text-white" />
                        </div>

                        {/* Status Badge */}
                        {photo.status !== 'pending' && (
                          <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
                            photo.status === 'approved' ? 'bg-emerald-500' :
                            photo.status === 'rejected' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}>
                            {photo.status === 'approved' && <Heart size={10} className="text-white" />}
                            {photo.status === 'rejected' && <ThumbsDown size={10} className="text-white" />}
                            {photo.status === 'maybe' && <Minus size={10} className="text-white" />}
                          </div>
                        )}

                        {/* Rating */}
                        {photo.rating > 0 && (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-md">
                            <Star size={8} className="text-amber-400 fill-amber-400" />
                            <span className="text-[8px] text-white font-bold">{photo.rating}</span>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Copy Image Link */}
                          {photo.cloudUrl && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(photo.cloudUrl!);
                                toast.success('تم نسخ رابط الصورة');
                              }}
                              className="w-6 h-6 rounded-md bg-blue-500/80 hover:bg-blue-500 flex items-center justify-center transition-colors"
                              title="نسخ رابط الصورة"
                            >
                              <Link2 size={10} className="text-white" />
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'approved'); }}
                            className="w-6 h-6 rounded-md bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center transition-colors"
                          >
                            <Heart size={10} className="text-white" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'maybe'); }}
                            className="w-6 h-6 rounded-md bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center transition-colors"
                          >
                            <Minus size={10} className="text-white" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'rejected'); }}
                            className="w-6 h-6 rounded-md bg-rose-500/80 hover:bg-rose-500 flex items-center justify-center transition-colors"
                          >
                            <ThumbsDown size={10} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </motion.div>
          )}


          {/* ═══════════════════════════════════════ */}
          {/* CHAT VIEW                              */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'CHAT' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-hidden rounded-2xl"
            >
              <UnifiedTeamChat users={users} currentUser={currentUser} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* LIGHTBOX - Vertical Stack Layout           */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxIndex !== null && galleryPhotos[lightboxIndex] && (() => {
          const photo = galleryPhotos[lightboxIndex];
          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center"
            onClick={() => { setLightboxIndex(null); setZoomLevel(1); setShowTagsPopover(false); }}
          >
            {/* ── TOP BAR: Close + Counter + Stats ── */}
            <div className="w-full flex items-center justify-between px-4 py-3 shrink-0 z-20" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-zinc-300 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-lg">
                  {lightboxIndex + 1} / {galleryPhotos.length}
                </span>
                <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/15">
                  {galleryStats.approved} مقبول
                </span>
                <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/15">
                  {galleryStats.rejected} مرفوض
                </span>
              </div>
              <button
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={() => { setLightboxIndex(null); setZoomLevel(1); setShowTagsPopover(false); }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── IMAGE AREA (with nav arrows + scroll zoom) ── */}
            <div className="flex-1 relative flex items-center justify-center w-full min-h-0 px-14">
              {/* Navigation Arrows */}
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                onClick={e => { e.stopPropagation(); handleLightboxNav('prev'); }}
              >
                <ChevronRight size={20} />
              </button>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                onClick={e => { e.stopPropagation(); handleLightboxNav('next'); }}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Image Container - Clean, no overlays */}
              <div
                className="relative overflow-hidden rounded-lg"
                style={{ maxWidth: '82vw', maxHeight: '100%' }}
                onClick={e => e.stopPropagation()}
                onMouseMove={e => {
                  if (zoomLevel > 1) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setZoomPos({ x, y });
                  }
                }}
                onWheel={e => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;

                  const delta = e.deltaY > 0 ? -0.3 : 0.3;
                  const newZoom = Math.min(Math.max(zoomLevel + delta, 1), 5);

                  if (newZoom !== zoomLevel) {
                    setZoomPos({ x, y });
                    setZoomLevel(newZoom);
                  }
                }}
              >
                <motion.img
                  key={photo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={photo.src}
                  alt={photo.name}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    cursor: zoomLevel > 1 ? 'grab' : 'default',
                    transition: 'transform 0.15s ease-out',
                  }}
                  draggable={false}
                />
                {/* Zoom percentage indicator (only when zoomed) */}
                {zoomLevel > 1 && (
                  <div className="absolute top-3 left-3 text-[10px] font-bold text-white/60 bg-black/40 px-2 py-1 rounded-md pointer-events-none">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* ── CONTROL BAR (fixed below image) ── */}
            <div
              className="w-full max-w-3xl mx-auto shrink-0 px-4 py-3 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-white/10 px-5 py-2.5">
                {/* Photo Name */}
                <span className="text-zinc-400 text-[10px] font-medium ml-2 truncate max-w-[120px]">{photo.name}</span>

                {/* Rating Stars */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handlePhotoRating(photo.id, star)}
                      className="p-0.5 transition-transform hover:scale-125"
                    >
                      <Star
                        size={14}
                        className={`${
                          star <= (photo.rating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-600'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                {/* Status Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'approved')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    <Heart size={11} className="inline-block ml-1" />
                    مقبول
                  </button>
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'maybe')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'maybe'
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                    }`}
                  >
                    <Minus size={11} className="inline-block ml-1" />
                    ربما
                  </button>
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'rejected')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'rejected'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                    }`}
                  >
                    <ThumbsDown size={11} className="inline-block ml-1" />
                    مرفوض
                  </button>
                </div>

                {/* Tags Button (replaces Zoom button) */}
                <div className="relative">
                  <button
                    onClick={() => setShowTagsPopover(!showTagsPopover)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                      showTagsPopover || photo.tags.length > 0
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/20'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Tag size={12} className="inline-block ml-0.5" />
                    {photo.tags.length > 0 ? `تاقات (${photo.tags.length})` : 'تاقات'}
                  </button>

                  {/* Tags Popover */}
                  <AnimatePresence>
                    {showTagsPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-72 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-30"
                        dir="rtl"
                      >
                        <div className="p-3">
                          <p className="text-[10px] text-zinc-500 font-bold mb-2">التعديلات المطلوبة</p>
                          <div className="flex flex-wrap gap-1">
                            {allTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => handleToggleTag(photo.id, tag)}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                                  photo.tags.includes(tag)
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                          {/* Custom tag input */}
                          <div className="flex items-center gap-1 mt-2">
                            <input
                              type="text"
                              value={customTagInput}
                              onChange={e => setCustomTagInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); }}
                              placeholder="أضف تاق جديد..."
                              className="flex-1 h-7 px-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-[9px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30"
                              dir="rtl"
                            />
                            <button
                              onClick={handleAddCustomTag}
                              disabled={!customTagInput.trim()}
                              className="h-7 px-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-[9px] font-bold rounded-md border border-violet-500/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── NOTES SECTION (below control bar) ── */}
            <div
              className="w-full max-w-3xl mx-auto shrink-0 px-4 pb-4 z-10"
              onClick={e => e.stopPropagation()}
            >
              <textarea
                value={photo.note}
                onChange={e => handlePhotoNote(photo.id, e.target.value)}
                placeholder="أضف ملاحظة للمصمم..."
                className="w-full h-16 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 resize-none"
                dir="rtl"
              />
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// BOOKING CARD
// ═══════════════════════════════════════════════════════════
interface BookingCardProps {
  booking: Booking;
  index: number;
  onStartSelection: (b: Booking) => void;
  onFinishSelection: (b: Booking) => void;
  onOpenGallery: (b: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, index, onStartSelection, onFinishSelection, onOpenGallery }) => {
  const isActive = booking.status === BookingStatus.SELECTION;
  const isWaiting = booking.status === BookingStatus.SHOOTING_COMPLETED;
  const isDone = booking.status === BookingStatus.EDITING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`group relative rounded-xl border p-3.5 transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-bl from-violet-500/[0.08] to-fuchsia-500/[0.04] border-violet-500/20 shadow-lg shadow-violet-500/5'
          : isDone
          ? 'bg-emerald-500/[0.03] border-emerald-500/10'
          : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.08]'
      }`}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 border border-violet-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[8px] font-black text-violet-300">جاري الاختيار</span>
        </div>
      )}
      {isDone && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 rounded-full">
          <CheckCircle2 size={9} className="text-emerald-400" />
          <span className="text-[8px] font-black text-emerald-300">تم الإرسال</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
          isActive
            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20'
            : booking.category === BookingCategory.WEDDING
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
        }`}>
          {booking.clientName?.charAt(0) || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm truncate">{booking.clientName}</h3>
          <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{booking.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-[9px] text-zinc-500">
              <CalendarDays size={9} />
              {booking.shootDate?.split('T')[0]}
            </span>
            {booking.category === BookingCategory.WEDDING && (
              <span className="text-[8px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-bold border border-rose-500/10">
                عرس
              </span>
            )}
            {/* NAS Status */}
            <span className={`text-[8px] font-bold flex items-center gap-0.5 ${
              booking.nasStatus === 'synced' ? 'text-emerald-400' :
              booking.nasStatus === 'pending' ? 'text-amber-400' :
              'text-zinc-600'
            }`}>
              <HardDrive size={8} />
              {booking.nasStatus === 'synced' ? 'منقول' :
               booking.nasStatus === 'pending' ? 'جاري النقل' :
               'لم ينقل'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {isWaiting && (
            <button
              onClick={() => onStartSelection(booking)}
              className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-violet-500/15 transition-all hover:shadow-violet-500/25"
            >
              بدء الاختيار
            </button>
          )}
          {isActive && (
            <>
              <button
                onClick={() => onOpenGallery(booking)}
                className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-white text-[10px] font-bold rounded-lg border border-white/[0.08] transition-all"
              >
                فتح المعرض
              </button>
              <button
                onClick={() => onFinishSelection(booking)}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/15 transition-all"
              >
                إنهاء وإرسال
              </button>
            </>
          )}
        </div>
      </div>

      {/* Phone + Quick Share Actions */}
      {!isDone && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.03] flex items-center gap-2">
          {booking.clientPhone && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Phone size={9} className="text-zinc-600 shrink-0" />
              <span className="text-[9px] text-zinc-500 truncate">{booking.clientPhone}</span>
            </div>
          )}
          {/* Copy Portal Link + WhatsApp */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const token = (booking as any).client_token;
                if (!token) {
                  toast.error('لا يوجد token لهذا الحجز. يرجى تحديث بيانات الحجز أولاً');
                  return;
                }
                const portalUrl = buildClientPortalUrl(token);
                navigator.clipboard.writeText(portalUrl);
                toast.success('تم نسخ رابط الألبوم');
              }}
              className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors border border-blue-500/10"
              title="نسخ رابط الألبوم"
            >
              <Copy size={11} />
            </button>
            {booking.clientPhone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const token = (booking as any).client_token;
                  if (!token) {
                    toast.error('لا يوجد token لهذا الحجز. يرجى تحديث بيانات الحجز أولاً');
                    return;
                  }
                  const portalUrl = buildClientPortalUrl(token);
                  const msg = `مرحباً ${booking.clientName}، رابط صورك:\n\n${portalUrl}`;
                  const phone = booking.clientPhone.replace(/[^0-9+]/g, '');
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 flex items-center justify-center text-[#25D366] transition-colors border border-[#25D366]/10"
                title="إرسال عبر واتساب"
              >
                <Send size={11} />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SelectionDashboard;
