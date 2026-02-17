import React, { useEffect, useState, useRef } from 'react';
import ShareModal from '../../shared/ShareModal';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  MessageSquare,
  Calendar,
  Camera,
  Tag,
  HelpCircle,
  Heart,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface SelectionLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    title: string;
    image: string;
    category: string;
    status: 'approved' | 'rejected' | 'pending' | 'maybe';
    rating?: number; // Added rating
    assignedTo: {
      name: string;
      avatar: string;
    };
    date: string;
    camera?: string;
    editingRequests?: string[];
  };
  onNext: () => void;
  onPrev: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onMaybe: (id: number) => void;
  onRate?: (id: number, rating: number) => void;
  showRatings?: boolean;
  onToggleRatings?: () => void;
  onAddNote: (id: number, note: string) => void;
  availableTags: string[];
  onToggleTag: (id: number, tag: string) => void;
  theme?: 'selection' | 'manager';
}

const THEME_COLORS = {
  selection: {
    heart: { fill: 'fill-pink-500', text: 'text-pink-500', hover: 'hover:text-pink-400' },
  },
  manager: {
    heart: { fill: 'fill-blue-500', text: 'text-blue-500', hover: 'hover:text-blue-400' },
  },
};

const SelectionLightbox: React.FC<SelectionLightboxProps> = ({
  isOpen,
  onClose,
  image,
  onNext,
  onPrev,
  onApprove,
  onReject,
  onMaybe,
  onRate,
  showRatings = true,
  onToggleRatings,
  onAddNote: _onAddNote,
  availableTags,
  onToggleTag,
  theme = 'selection',
}) => {
  const colors = THEME_COLORS[theme];
  const [showTags, setShowTags] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Caching State
  const [cacheStatus, setCacheStatus] = useState<
    'idle' | 'checking' | 'downloading' | 'cached' | 'error'
  >('checking');
  const [localSrc, setLocalSrc] = useState<string | null>(null);

  // Check Cache on Image Change
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!image) return;
      setCacheStatus('checking');
      setLocalSrc(null);

      try {
        if (window.electronAPI?.fileSystem) {
          const cached = await window.electronAPI.fileSystem.checkCache?.(image.image);
          if (mounted) {
            if (cached) {
              setLocalSrc(cached);
              setCacheStatus('cached');
            } else {
              setCacheStatus('idle');
            }
          }
        } else {
          // Fallback for Web/Dev
          if (mounted) {
            setLocalSrc(image.image);
            setCacheStatus('cached');
          }
        }
      } catch (e) {
        console.error('Lightbox Cache Check Error', e);
        if (mounted) setCacheStatus('error');
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, [image]);

  const handleDownload = async () => {
    setCacheStatus('downloading');
    try {
      if (window.electronAPI?.fileSystem) {
        const path = await window.electronAPI.fileSystem.cacheImage?.(image.image);
        if (path) {
          setLocalSrc(path);
          setCacheStatus('cached');
        } else {
          setCacheStatus('error');
        }
      }
    } catch (e) {
      setCacheStatus('error');
    }
  };

  // Reset Zoom on Image Change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [image.id]);

  // Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 4); // Min 1x, Max 4x
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = (_e: React.MouseEvent) => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      // Zoom to 2.5x
      setScale(2.5);
    }
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev, scale]);

  if (!isOpen || !image) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9999 bg-black/95 flex flex-col md:flex-row overflow-hidden"
      >
        {/* Main Image Area */}
        <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 bg-black">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Navigation */}

          <motion.div
            className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            {cacheStatus === 'cached' && localSrc ? (
              <motion.img
                ref={imageRef}
                key={image.id} // Re-mount on id change
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: scale,
                  x: position.x,
                  y: position.y,
                }}
                transition={{
                  duration: isDragging ? 0 : 0.2,
                  scale: { duration: 0.2 },
                }}
                src={localSrc}
                alt={image.title}
                className="w-full h-full object-contain shadow-2xl select-none"
                style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
                draggable={false}
              />
            ) : (
              // Not Cached / Downloading State
              <div className="flex flex-col items-center justify-center space-y-4">
                {cacheStatus === 'checking' && (
                  <Loader2 size={48} className="text-gray-500 animate-spin" />
                )}

                {cacheStatus === 'downloading' && (
                  <>
                    <Loader2 size={48} className="text-amber-500 animate-spin" />
                    <p className="text-amber-500 font-bold">جاري تحميل الصورة...</p>
                  </>
                )}

                {cacheStatus === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                      <ImageIcon size={32} className="text-gray-400 opacity-50" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">الصورة غير محملة</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                      هذه الصورة موجودة على السيرفر (Synology). يجب تحميلها لتتمكن من عرضها
                      وتكبيرها.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-2 mx-auto transition-all hover:scale-105 shadow-lg shadow-amber-500/20"
                    >
                      <Download size={20} />
                      <span>تحميل للصورة</span>
                    </button>
                  </motion.div>
                )}

                {cacheStatus === 'error' && (
                  <div className="text-center text-red-500">
                    <XCircle size={48} className="mx-auto mb-2" />
                    <p>فشل تحميل الصورة</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Navigation (Moved here for Z-Index) */}
          <button
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all hover:scale-110 hidden md:block"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all hover:scale-110 hidden md:block"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Manager Sidebar */}
        <div className="w-full md:w-[400px] h-[40vh] md:h-full bg-[#0a0a0a] border-t md:border-t-0 md:border-r border-white/10 flex flex-col">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Header Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${
                    image.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : image.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400'
                        : image.status === 'maybe'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {image.status === 'approved'
                    ? 'تمت الموافقة'
                    : image.status === 'rejected'
                      ? 'مرفوض'
                      : image.status === 'maybe'
                        ? 'حاير'
                        : 'قيد المراجعة'}
                </span>
                <span className="text-gray-500 text-sm">{image.category}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{image.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{image.date}</span>
                </div>
                {image.camera && (
                  <div className="flex items-center gap-1">
                    <Camera size={14} />
                    <span>{image.camera}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Team Member Attribution */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                تم العمل بواسطة
              </h3>
              <div className="flex items-center gap-3">
                <img
                  src={image.assignedTo.avatar}
                  alt={image.assignedTo.name}
                  className="w-10 h-10 rounded-full border border-white/10"
                />
                <div>
                  <p className="text-white font-bold">{image.assignedTo.name}</p>
                  <p className="text-xs text-green-400">متاح الآن</p>
                </div>
              </div>
            </div>

            {/* Session Details (Replaced Technical Details) */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                تفاصيل الجلسة
              </h3>
              <div className="md:col-span-2 p-3 bg-white/5 rounded-lg border border-white/5 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">تاريخ الحجز</p>
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <Calendar size={12} className="text-pink-500" />
                      <span>2024/01/15</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">الباقة</p>
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <Tag size={12} className="text-purple-500" />
                      <span>الباقة الملكية (VIP)</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">الموقع</p>
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <Camera size={12} className="text-blue-500" />
                      <span>القاعة الملكية - بغداد</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">العروض</p>
                    <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs">
                      <Check size={12} />
                      <span>خصم 10% + ألبوم مجاني</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary of Editing Requests */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <p className="text-xs text-gray-500 mb-2">التعديلات المطلوبة</p>
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {(image.editingRequests || []).slice(0, 3).map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20"
                    >
                      {t}
                    </span>
                  ))}
                  {(image.editingRequests?.length || 0) > 3 && (
                    <span className="text-[10px] text-gray-500 px-1">
                      +{(image.editingRequests?.length || 0) - 3}
                    </span>
                  )}
                  {(!image.editingRequests || image.editingRequests.length === 0) && (
                    <span className="text-[10px] text-gray-500">لا توجد طلبات تعديل</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-6 bg-[#050505] border-t border-white/10 space-y-4">
            {/* Tags Overlay (Editing Requests) */}
            <AnimatePresence>
              {showTags && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pb-4"
                >
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <h4 className="text-xs text-amber-500 font-bold mb-2">طلبات التعديل:</h4>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => {
                        const isSelected = (image.editingRequests || []).includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => onToggleTag(image.id, tag)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                            ${
                                              isSelected
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                                                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                                            }`}
                          >
                            <Check size={10} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onApprove(image.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-bold transition-all
                    ${
                      image.status === 'approved'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                        : 'bg-white/5 hover:bg-green-600/20 text-gray-300 hover:text-green-400'
                    }`}
              >
                <Check size={18} />
                <span className="text-[10px]">اعتماد</span>
              </button>
              <button
                onClick={() => onMaybe(image.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-bold transition-all
                    ${
                      image.status === 'maybe'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                        : 'bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-400'
                    }`}
              >
                <HelpCircle size={18} />
                <span className="text-[10px]">حاير</span>
              </button>
              <button
                onClick={() => onReject(image.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-bold transition-all
                    ${
                      image.status === 'rejected'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                        : 'bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-400'
                    }`}
              >
                <XCircle size={18} />
                <span className="text-[10px]">رفض</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="اكتب ملاحظة للموظف..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                <MessageSquare size={16} />
              </button>
            </div>

            {/* Rating Section (Privacy Mode) */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 mx-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleRatings}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={showRatings ? 'إخفاء التقييم عن الزبون' : 'عرض التقييم'}
                >
                  {showRatings ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <span className="text-xs font-bold text-gray-400">التقييم:</span>
              </div>

              {showRatings && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => onRate?.(image.id, (image.rating || 0) === star ? 0 : star)}
                      className="hover:scale-125 transition-transform p-1"
                    >
                      <Heart
                        className={`${(image.rating || 0) >= star ? `${colors.heart.fill} ${colors.heart.text}` : `text-gray-600 ${colors.heart.hover}`} transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              )}
              {!showRatings && <span className="text-[10px] text-gray-600 font-mono">مخفي</span>}
            </div>

            {/* Extra Tools */}
            <div className="flex justify-center pt-2 gap-3">
              <button
                onClick={() => setShowTags(!showTags)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showTags ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
              >
                <Tag size={14} />
                {showTags ? 'إخفاء التاغات' : 'عرض التاغات'}
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all text-gray-500 hover:text-white hover:bg-white/10"
              >
                <Share2 size={14} />
                مشاركة
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={image.title}
          url={`http://localhost:5173/view/${image.id}`} // رابط المعاينة (سيتم تغييره للنطاق الحقيقي لاحقاً)
          downloadUrl="" // سيتم ربطه بالـ NAS لاحقاً
          type="image"
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SelectionLightbox;
