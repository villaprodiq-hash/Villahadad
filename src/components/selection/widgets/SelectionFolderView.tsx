import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MoreVertical,
  Search,
  Filter,
  PieChart,
  Clock,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  Star,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Video,
  Folder,
  Download,
  Loader2,
  Trash2,
  Share2,
  Link2,
  Send,
  Copy,
  Check as CheckIcon,
  MessageCircle,
  FolderOpen,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import GalleryGridWidget, { PortfolioItem } from './GalleryGridWidget';
import { GalleryFolder } from './GalleryFolderCard';
import ShareModal from '../../shared/ShareModal';
import ImageSelectionToolbar from './ImageSelectionToolbar';
import SelectionBatchBar from './SelectionBatchBar';
import { Booking } from '../../../types';
import { toast } from 'sonner';
import { buildClientPortalUrl, getClientPortalLinkError } from '../../../utils/clientPortal';

interface SelectionFolderViewProps {
  folder: GalleryFolder;
  items: PortfolioItem[];
  onBack: () => void;
  onUpload: () => void;
  onItemClick: (item: PortfolioItem) => void;
  onRate: (id: number, rating: number) => void;
  showRatings?: boolean;
  theme?: 'selection' | 'manager';
  booking?: Booking;
  nasPath?: string;
  /** Quick status change from grid card or batch action */
  onStatusChange?: (id: number, status: 'approved' | 'rejected' | 'maybe') => void;
  /** Batch status change for multiple items */
  onBatchStatusChange?: (ids: number[], status: 'approved' | 'rejected' | 'maybe') => void;
}

const THEME_COLORS = {
  selection: {
    primary: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      hoverBg: 'hover:bg-indigo-50',
      hoverText: 'hover:text-indigo-600',
    },
    secondary: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    accent: { bg: 'bg-indigo-500', text: 'text-white' },
  },
  manager: {
    primary: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      hoverBg: 'hover:bg-amber-50',
      hoverText: 'hover:text-amber-600',
    },
    secondary: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    accent: { bg: 'bg-amber-500', text: 'text-white' },
  },
};

const SelectionFolderView: React.FC<SelectionFolderViewProps> = ({
  folder,
  items,
  onBack,
  onUpload,
  onItemClick,
  onRate,
  showRatings = true,
  theme = 'selection',
  booking,
  nasPath,
  onStatusChange,
  onBatchStatusChange,
}) => {
  const colors = THEME_COLORS[theme];
  // Local State
  const [currentFilter, setCurrentFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED' | 'MAYBE'>(
    'ALL'
  );
  const [currentSort, setCurrentSort] = useState<'DEFAULT' | 'NEWEST' | 'OLDEST' | 'RATING'>(
    'DEFAULT'
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Multi-Select State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Portal Link Modal State
  const [isPortalLinkModalOpen, setIsPortalLinkModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Selection Handlers ──
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(i => i.id)));
  }, [items]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  const handleToggleSelecting = useCallback(() => {
    if (isSelecting) {
      setSelectedIds(new Set());
    }
    setIsSelecting(prev => !prev);
  }, [isSelecting]);

  const handleBatchAction = useCallback((status: 'approved' | 'rejected' | 'maybe') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchStatusChange) {
      onBatchStatusChange(ids, status);
    } else if (onStatusChange) {
      ids.forEach(id => onStatusChange(id, status));
    }

    const labels = { approved: 'اعتماد', rejected: 'رفض', maybe: 'تأجيل' };
    toast.success(`تم ${labels[status]} ${ids.length} صورة`);
    setSelectedIds(new Set());
  }, [selectedIds, onBatchStatusChange, onStatusChange]);

  const handleQuickStatus = useCallback((id: number, status: 'approved' | 'rejected' | 'maybe') => {
    onStatusChange?.(id, status);
    const labels = { approved: 'تم الاعتماد', rejected: 'تم الرفض', maybe: 'حاير' };
    toast.success(labels[status]);
  }, [onStatusChange]);

  // Get Portal Link
  const getPortalLink = () => {
    if (booking?.client_token) {
      return buildClientPortalUrl(booking.client_token);
    }
    // No fake fallback. Token link must point to an existing booking token.
    return '';
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleOpenPortalLink = () => {
    const linkError = getClientPortalLinkError(booking?.client_token);
    if (linkError) {
      toast.error(linkError);
      return;
    }
    setIsPortalLinkModalOpen(true);
    setCopiedLink(false);
  };

  // ✅ فتح مجلد NAS في Finder/Explorer
  const handleOpenNasFolder = async () => {
    if (!nasPath) {
      toast.error('لا يوجد مسار مجلد');
      return;
    }
    
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.fileSystem?.openDirectory) {
        await electronAPI.fileSystem.openDirectory(nasPath);
        toast.success('تم فتح المجلد');
      } else {
        // Fallback: فتح باستخدام الروابط العادية
        window.open(`file://${nasPath}`, '_blank');
      }
    } catch (error) {
      console.error('[NAS] Failed to open folder:', error);
      toast.error('فشل فتح المجلد');
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendWhatsApp = (url: string) => {
    const clientName = folder.client || 'عميلنا الكريم';
    const message = `مرحباً ${clientName} 👋\n\nإليك رابط بوابة اختيار الصور الخاصة بك:\n${url}\n\nيرجى الدخول واختيار الصور المفضلة لديك.\n\nفيلا حداد - لتجربة تصوير لا تُنسى 📸`;
    
    const phone = booking?.clientPhone?.replace(/\D/g, '') || '';
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.substring(1);
    if (formattedPhone.length > 0 && !formattedPhone.startsWith('964')) formattedPhone = '964' + formattedPhone;
    
    const waUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(waUrl, '_blank');
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    setDownloadProgress(0);
    try {
      // @ts-ignore
      if (window.electronAPI?.fileSystem) {
        const paths = items.map(i => i.image);
        // @ts-ignore
        await window.electronAPI.fileSystem.cacheMultipleImages(paths);
        // Mock Progress Animation
        for (let i = 0; i <= 100; i += 10) {
          setDownloadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }
      } else {
        console.warn('FileSystem API not available');
      }
    } catch (e) {
      console.error('Download All Error', e);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Derived Logic: Sort & Filter
  const processedItems = React.useMemo(() => {
    let result = [...items];

    // 1. Filter
    if (currentFilter !== 'ALL') {
      result = result.filter(item => {
        if (currentFilter === 'APPROVED') return item.status === 'approved';
        if (currentFilter === 'REJECTED') return item.status === 'rejected';
        if (currentFilter === 'MAYBE') return item.status === 'maybe';
        return true;
      });
    }

    // 2. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          String(item.title || '')
            .toLowerCase()
            .includes(q) ||
          String(item.id || '')
            .toLowerCase()
            .includes(q) ||
          String(item.category || '')
            .toLowerCase()
            .includes(q) ||
          String(item.date || '')
            .toLowerCase()
            .includes(q) ||
          String(item.assignedTo?.name || '')
            .toLowerCase()
            .includes(q)
      );
    }

    // 2. Sort
    switch (currentSort) {
      case 'NEWEST':
        // Assuming ID or Date proxy
        result.sort((a, b) => b.id - a.id);
        break;
      case 'OLDEST':
        result.sort((a, b) => a.id - b.id);
        break;
      case 'RATING':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default: // DEFAULT (Sequence/ID)
        result.sort((a, b) => a.id - b.id);
    }

    return result;
  }, [items, currentFilter, currentSort, searchQuery]);
  // Calculate Stats
  const totalItems = items.length;
  const selectedItems = items.filter(i => i.status === 'approved').length;
  const rejectedItems = items.filter(i => i.status === 'rejected').length;
  const pendingItems = items.filter(i => i.status === 'pending').length;

  // Calculate Storage (Mock)
  const selectionPercentage = totalItems > 0 ? Math.round((selectedItems / totalItems) * 100) : 0;
  const rejectionPercentage = totalItems > 0 ? Math.round((rejectedItems / totalItems) * 100) : 0;

  return (
    <div className="flex h-full gap-6">
      {/* LEFT COLUMN: Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header / Back Button */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="bg-zinc-800/60 p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-white/10 transition-all group"
            >
              <ArrowRight size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {folder.title}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    folder.status === 'active'
                      ? `${colors.primary.bg} ${colors.primary.text}`
                      : 'bg-zinc-800/40 text-zinc-500'
                  }`}
                >
                  {folder.status === 'active' ? 'نشط' : 'مكتمل'}
                </span>
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                {folder.client} • {folder.lastUpdate}
              </p>
            </div>
          </div>

          {/* Open NAS Folder Button */}
          {nasPath && (
            <button
              onClick={handleOpenNasFolder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 ml-2"
              title="فتح مجلد NAS"
            >
              <FolderOpen size={16} />
              <span>فتح المجلد</span>
            </button>
          )}

          {/* Portal Link Button */}
          <button
            onClick={handleOpenPortalLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 ml-2"
            title="إرسال رابط البوابة للعميل"
          >
            <Link2 size={16} />
            <span>إرسال رابط البوابة</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 border border-white/10 transition-all hover:scale-105 active:scale-95 mr-auto md:mr-0"
          >
            <Share2 size={16} className="text-zinc-500" />
            <span>مشاركة</span>
          </button>

          {/* Download All Button */}
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all
                            ${
                              isDownloadingAll
                                ? 'bg-amber-500/10 text-amber-400 cursor-wait'
                                : 'bg-white text-gray-900 hover:bg-zinc-200 shadow-lg shadow-white/20'
                            }`}
          >
            {isDownloadingAll ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري التحميل {downloadProgress}%</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>تحميل الكل للكاش</span>
              </>
            )}
          </button>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden -ms-overflow-style-none scrollbar-width-none pr-1 pb-10">
          {/* 1. TOP STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Total Files Card */}
            <div className="bg-zinc-900/60 p-5 rounded-[24px] border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-3 rounded-2xl group-hover:scale-110 transition-transform ${colors.primary.bg} ${colors.primary.text}`}
                >
                  <ImageIcon size={22} />
                </div>
                <MoreVertical
                  size={16}
                  className="text-zinc-600 cursor-pointer hover:text-zinc-400"
                />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-bold mb-1">الكل</h3>
                <p className="text-2xl font-black text-gray-800 flex items-baseline gap-2">
                  {totalItems} <span className="text-xs text-gray-400 font-medium">ملف</span>
                </p>
              </div>
            </div>

            {/* Selected Card */}
            <div className="bg-zinc-900/60 p-5 rounded-[24px] border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={22} />
                </div>
                <MoreVertical
                  size={16}
                  className="text-zinc-600 cursor-pointer hover:text-zinc-400"
                />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-bold mb-1">تم الاختيار</h3>
                <p className="text-2xl font-black text-gray-800 flex items-baseline gap-2">
                  {selectedItems}{' '}
                  <span className="text-xs text-green-500 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                    {selectionPercentage}%
                  </span>
                </p>
              </div>
            </div>

            {/* Video/Pending Card (Using Pending for now as per photo ctx) */}
            <div className="bg-zinc-900/60 p-5 rounded-[24px] border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Clock size={22} />
                </div>
                <MoreVertical
                  size={16}
                  className="text-zinc-600 cursor-pointer hover:text-zinc-400"
                />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-bold mb-1">قيد الانتظار</h3>
                <p className="text-2xl font-black text-gray-800 flex items-baseline gap-2">
                  {pendingItems} <span className="text-xs text-gray-400 font-medium">صورة</span>
                </p>
              </div>
            </div>
          </div>

          {/* 2. UPLOAD BANNER */}
          <div
            onClick={onUpload}
            className={`mb-8 relative overflow-hidden rounded-[32px] border-2 border-dashed transition-all cursor-pointer group h-[160px] flex items-center justify-center p-8 ${colors.primary.border} ${colors.primary.bg}/50 hover:${colors.primary.bg}`}
          >
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all ${colors.primary.text}`}
              >
                <Upload size={24} />
              </div>
              <h4 className={`font-bold text-lg mb-1 ${colors.primary.text} opacity-90`}>
                اضغط هنا لرفع الصور أو اسحبها
              </h4>
              <p className={`text-xs font-medium ${colors.primary.text} opacity-60`}>
                الصور بصيغة JPG, PNG مدعومة حتى 50MB
              </p>
            </div>
            {/* Decorative Gradients */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-200/20 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
          </div>

          {/* 3. FILES HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">ملفاتي</h3>
                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-xs font-bold">
                  {totalItems} الكل
                </span>
              </div>
              <ImageSelectionToolbar
                selectedCount={selectedIds.size}
                totalCount={items.length}
                isSelecting={isSelecting}
                onToggleSelecting={handleToggleSelecting}
                onApproveSelected={() => handleBatchAction('approved')}
                onRejectSelected={() => handleBatchAction('rejected')}
                onMaybeSelected={() => handleBatchAction('maybe')}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
              />
            </div>
            <div className="flex items-center gap-2">
              {isSearchOpen ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative"
                >
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-300"
                  />
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                  >
                    <XCircle size={14} />
                  </button>
                </motion.div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className={`p-2 text-gray-400 rounded-lg transition-colors ${colors.primary.hoverText} ${colors.primary.hoverBg}`}
                >
                  <Search size={18} />
                </button>
              )}

              {/* SORT DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsSortOpen(!isSortOpen);
                    setIsFilterOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all font-bold text-xs ${
                    currentSort !== 'DEFAULT'
                      ? `${colors.primary.bg} ${colors.primary.text} ${colors.primary.border}`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ArrowUpDown size={14} />
                  <span>
                    {currentSort === 'DEFAULT' && 'تسلسل'}
                    {currentSort === 'NEWEST' && 'الأحدث'}
                    {currentSort === 'OLDEST' && 'الأقدم'}
                    {currentSort === 'RATING' && 'التقييم'}
                  </span>
                  <ChevronDown size={12} />
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 overflow-hidden"
                    >
                      {[
                        { id: 'DEFAULT', label: 'تسلسل (افتراضي)', icon: MoreVertical },
                        { id: 'NEWEST', label: 'الأحدث أولاً', icon: Clock },
                        { id: 'OLDEST', label: 'الأقدم أولاً', icon: Clock },
                        { id: 'RATING', label: 'حسب النجوم', icon: Star },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setCurrentSort(opt.id as any);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                            currentSort === opt.id
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <opt.icon size={14} />
                            {opt.label}
                          </span>
                          {currentSort === opt.id && <Check size={12} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* FILTER DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsFilterOpen(!isFilterOpen);
                    setIsSortOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm transition-all font-bold text-xs ${
                    currentFilter !== 'ALL'
                      ? 'bg-indigo-600 text-white shadow-indigo-200'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={14} />
                  <span>
                    {currentFilter === 'ALL' && 'الكل'}
                    {currentFilter === 'APPROVED' && 'المختارة'}
                    {currentFilter === 'REJECTED' && 'المرفوضة'}
                    {currentFilter === 'MAYBE' && 'حاير'}
                  </span>
                  <ChevronDown size={12} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 overflow-hidden"
                    >
                      {[
                        { id: 'ALL', label: 'عرض الكل', icon: MoreVertical, color: 'gray' },
                        {
                          id: 'APPROVED',
                          label: 'المختارة (Approved)',
                          icon: CheckCircle2,
                          color: 'green',
                        },
                        {
                          id: 'REJECTED',
                          label: 'المرفوضة (Rejected)',
                          icon: XCircle,
                          color: 'red',
                        },
                        { id: 'MAYBE', label: 'حاير (Confused)', icon: HelpCircle, color: 'amber' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setCurrentFilter(opt.id as any);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold mb-0.5 flex items-center justify-between transition-colors ${
                            currentFilter === opt.id
                              ? `bg-${opt.color}-50 text-${opt.color}-600`
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <opt.icon
                              size={14}
                              className={
                                currentFilter === opt.id
                                  ? `text-${opt.color}-600`
                                  : `text-${opt.color}-400`
                              }
                            />
                            {opt.label}
                          </span>
                          {currentFilter === opt.id && <Check size={12} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 4. FILES GRID */}
          <GalleryGridWidget
            items={processedItems}
            onItemClick={onItemClick}
            onRate={onRate}
            isSelecting={isSelecting}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onQuickStatus={onStatusChange ? handleQuickStatus : undefined}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar Stats */}
      <div className="w-[320px] shrink-0 hidden xl:flex flex-col gap-6 pt-20">
        {/* Storage / Selection Chart */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg">حالة الفرز</h3>
            <MoreVertical size={16} className="text-gray-300 cursor-pointer" />
          </div>

          {/* CSS Conic Gradient Donut */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `conic-gradient(
                                    #4ade80 0% ${selectionPercentage}%, 
                                    #ef4444 ${selectionPercentage}% ${selectionPercentage + rejectionPercentage}%, 
                                    #e2e8f0 ${selectionPercentage + rejectionPercentage}% 100%
                                )`,
                mask: 'radial-gradient(transparent 60%, black 61%)',
                WebkitMask: 'radial-gradient(transparent 60%, black 61%)',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-800">{selectionPercentage}%</span>
              <span className="text-xs text-gray-400 font-bold uppercase">ارشفة مكتملة</span>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-gray-600 font-medium">تم الاختيار</span>
              </div>
              <span className="font-bold text-gray-800">{selectedItems}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-gray-600 font-medium">مرفوض</span>
              </div>
              <span className="font-bold text-gray-800">{rejectedItems}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <span className="text-gray-600 font-medium">قيد الانتظار</span>
              </div>
              <span className="font-bold text-gray-800">{pendingItems}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg">النشاط الأخير</h3>
            <MoreVertical size={16} className="text-gray-300 cursor-pointer" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    i === 0
                      ? 'bg-indigo-50 text-indigo-600'
                      : i === 1
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
                  }`}
                >
                  {i === 0 && <Upload size={18} />}
                  {i === 1 && <XCircle size={18} />}
                  {i === 2 && <CheckCircle2 size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-0.5">
                    {i === 0 ? 'تم رفع 25 صورة' : i === 1 ? 'تم رفض صورتين' : 'تم اختيار 3 صور'}
                  </p>
                  <p className="text-xs text-gray-400">منذ {i * 15 + 2} دقيقة</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      <SelectionBatchBar
        selectedCount={selectedIds.size}
        totalCount={items.length}
        isVisible={isSelecting}
        onApproveAll={() => handleBatchAction('approved')}
        onRejectAll={() => handleBatchAction('rejected')}
        onMaybeAll={() => handleBatchAction('maybe')}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {/* Portal Link Modal */}
      {isPortalLinkModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPortalLinkModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Link2 className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">إرسال رابط البوابة</h3>
                  <p className="text-xs text-white/80">{folder.client}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPortalLinkModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Booking Info */}
              {booking && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">الحجز</p>
                  <p className="text-sm font-bold text-gray-800">{booking.title}</p>
                  <p className="text-xs text-gray-400">{booking.shootDate}</p>
                </div>
              )}

              {/* Link Display */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">رابط البوابة</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={getPortalLink()}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-12 text-sm text-gray-600 font-mono text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    onClick={() => {
                      const url = getPortalLink();
                      if (!url) {
                        toast.error('رابط البوابة غير صالح. تحقق من token و VITE_CLIENT_PORTAL_BASE_URL');
                        return;
                      }
                      handleCopyLink(url);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-all"
                    title="نسخ الرابط"
                  >
                    {copiedLink ? <CheckIcon size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                <div className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getPortalLink() || '')}`}
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-1">رمز QR</p>
                  <p className="text-xs text-gray-500">يمكن للعميل مسح الرمز للوصول مباشرة</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-800">{items.length}</p>
                  <p className="text-[10px] text-gray-500">الصور الكلية</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-lg font-bold text-green-600">
                    {items.filter(i => i.status === 'approved').length}
                  </p>
                  <p className="text-[10px] text-green-600/70">تم الاختيار</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-xl">
                  <p className="text-lg font-bold text-amber-600">
                    {items.filter(i => i.status === 'pending').length}
                  </p>
                  <p className="text-[10px] text-amber-600/70">بانتظار المراجعة</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setIsPortalLinkModalOpen(false)}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    const url = getPortalLink();
                    if (!url) {
                      toast.error('رابط البوابة غير صالح. تحقق من token و VITE_CLIENT_PORTAL_BASE_URL');
                      return;
                    }
                    handleSendWhatsApp(url);
                  }}
                  disabled={!booking?.clientPhone}
                  className="py-3 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-gray-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  إرسال واتساب
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={folder.title}
        url={`http://localhost:5173/gallery/${folder.id}`} // رابط المعاينة
        downloadUrl="" // رابط التحميل (NAS)
        type="folder"
      />
    </div>
  );
};

export default SelectionFolderView;
