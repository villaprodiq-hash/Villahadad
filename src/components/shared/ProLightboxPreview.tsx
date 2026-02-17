import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  MessageSquare,
  Calendar,
  Camera,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Share2,
  Maximize2,
  Info,
  Clock,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface ProLightboxPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    title: string;
    image: string;
    category: string;
    status: 'approved' | 'rejected' | 'pending' | 'maybe';
    rating?: number;
    assignedTo: {
      name: string;
      avatar: string;
    };
    date: string;
    camera?: string;
    editingRequests?: string[];
    price?: number;
    location?: string;
  };
  onNext: () => void;
  onPrev: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onMaybe?: (id: number) => void;
  onRate?: (id: number, rating: number) => void;
  showRatings?: boolean;
  onToggleRatings?: () => void;
  availableTags?: string[];
  onToggleTag?: (id: number, tag: string) => void;
}

const ProLightboxPreview: React.FC<ProLightboxPreviewProps> = ({
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
  availableTags = [],
  onToggleTag,
}) => {
  const [showInfo, setShowInfo] = useState(true);
  const [showTags, setShowTags] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset on image change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoaded(false);
  }, [image.id]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'i') setShowInfo(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !image) return null;

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 4);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9999 bg-[#050505] flex overflow-hidden font-sans"
        dir="rtl"
      >
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full" />
        </div>

        {/* Main Viewing Area */}
        <div className="flex-1 relative flex items-center justify-center cursor-default group">
          {/* Top Bar Controls */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-linear-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10"
              >
                <X size={20} />
              </button>
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[13px] font-bold text-white/90">
                (Dev Preview) {image.title}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md transition-all border ${showInfo ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/10 hover:bg-white/20'}`}
              >
                <Info size={18} />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/10">
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={onPrev}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white backdrop-blur-sm transition-all border border-white/5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
          >
            <ChevronRight size={32} />
          </button>
          
          <button
            onClick={onNext}
            className="absolute left-8 top-1/2 -translate-y-1/2 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white backdrop-blur-sm transition-all border border-white/5 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
          >
            <ChevronLeft size={32} />
          </button>

          {/* Media Content */}
          <motion.div
            className="w-full h-full flex items-center justify-center p-4 md:p-12"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative max-w-full max-h-full shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden"
                style={{
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                }}
              >
                <motion.img
                  src={image.image}
                  alt={image.title}
                  onLoad={() => setIsLoaded(true)}
                  animate={{
                    scale: scale,
                    x: position.x,
                    y: position.y
                  }}
                  transition={{ duration: isDragging ? 0 : 0.2 }}
                  className="max-h-[85vh] max-w-full object-contain select-none shadow-2xl"
                  draggable={false}
                />
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-md">
                    <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                  </div>
                )}
                
                {/* Status Overlay Badge */}
                <div className="absolute bottom-6 right-6 flex items-center gap-2">
                   <div className={`px-4 py-2 rounded-full backdrop-blur-xl border font-black text-xs uppercase tracking-tighter shadow-2xl
                    ${image.status === 'approved' ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                      image.status === 'rejected' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                      image.status === 'maybe' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                      'bg-white/10 border-white/20 text-white/70'}`}
                   >
                     {image.status === 'approved' ? 'تم الاعتماد' : 
                      image.status === 'rejected' ? 'مرفوضة' : 
                      image.status === 'maybe' ? 'قيد الحيرة' : 'بانتظار المراجعة'}
                   </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Quick Stats Bar (Bottom Center) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
             <div className="flex items-center gap-4 text-white/60 text-xs font-bold">
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                  <Camera size={14} className="text-blue-400" />
                  <span>{image.camera || "Sony A7R V"}</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                  <Calendar size={14} className="text-purple-400" />
                  <span>{image.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400" />
                  <span>{image.rating || 0}/5</span>
                </div>
             </div>
          </div>
        </div>

        {/* glassmorphism Sidebar */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[420px] h-full bg-black/30 border-r border-white/10 backdrop-blur-2xl z-100 flex flex-col shadow-[-40px_0_60px_rgba(0,0,0,0.5)]"
            >
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                  <div className="px-3 py-1 rounded-lg bg-pink-500/10 text-pink-400 text-[10px] font-black uppercase tracking-widest border border-pink-500/20">
                    {image.category}
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-white/40 hover:text-white cursor-pointer transition-colors" />
                    <Download size={16} className="text-white/40 hover:text-white cursor-pointer transition-colors" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-black text-white leading-tight mb-2">
                  {image.title}
                </h1>
                <p className="text-white/40 text-[13px] font-medium">جلسة تصوير احترافية - ستوديو فيلا حداد</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-10">
                <div className="space-y-4">
                  <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">فريق العمل</h3>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                    <div className="relative">
                      <img src={image.assignedTo.avatar} className="w-12 h-12 rounded-full border-2 border-white/10" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-sm group-hover:text-pink-400 transition-colors">{image.assignedTo.name}</h4>
                      <p className="text-white/40 text-[11px] font-bold">مصور رئيسي</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">تفاصيل الجلسة</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <Clock size={14} className="text-blue-400 mb-2" />
                      <p className="text-white/30 text-[9px] font-black uppercase">التوقيت</p>
                      <p className="text-white font-bold text-xs">04:30 م</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <Maximize2 size={14} className="text-purple-400 mb-2" />
                      <p className="text-white/30 text-[9px] font-black uppercase">الحجم</p>
                      <p className="text-white font-bold text-xs">45.2 MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">طلبات التعديل</h3>
                    <button 
                      onClick={() => setShowTags(!showTags)}
                      className="text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
                    >
                      {showTags ? 'إغلاق' : 'تعديل'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isActive = image.editingRequests?.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => onToggleTag?.(image.id, tag)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all border
                            ${isActive 
                              ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">ملاحظات إضافية</h3>
                  <div className="relative group/input">
                    <textarea 
                      placeholder="اكتب ملاحظة هنا..."
                      className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-4 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 transition-all resize-none font-medium"
                    />
                    <div className="absolute bottom-4 left-4 p-2 rounded-full bg-white/5 text-white/20 group-focus-within/input:text-pink-400 group-focus-within/input:bg-pink-500/10 transition-all">
                      <MessageSquare size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4 pb-12 bg-black/40 border-t border-white/10 backdrop-blur-xl">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button 
                         onClick={onToggleRatings}
                         className="text-white/40 hover:text-white transition-colors"
                      >
                        {showRatings ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">المستوى</span>
                    </div>
                    {showRatings && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button 
                            key={s} 
                            onClick={() => onRate?.(image.id, s)}
                            className={`p-1 transition-transform hover:scale-125 ${ (image.rating || 0) >= s ? 'text-amber-400' : 'text-white/10'}`}
                          >
                            <Star size={14} fill={(image.rating || 0) >= s ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => onApprove(image.id)}
                      className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs transition-all
                        ${image.status === 'approved' 
                          ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' 
                          : 'bg-white text-black hover:bg-zinc-200'}`}
                    >
                      <Check size={18} strokeWidth={3} />
                      {image.status === 'approved' ? 'موافق' : 'اعتماد'}
                    </button>
                    
                    <button 
                      onClick={() => onReject(image.id)}
                      className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs transition-all
                        ${image.status === 'rejected' 
                          ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' 
                          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                    >
                      <X size={18} strokeWidth={3} />
                      {image.status === 'rejected' ? 'مرفوض' : 'رفض'}
                    </button>
                  </div>
                  
                  {onMaybe && (
                    <button
                      onClick={() => onMaybe(image.id)}
                      className={`w-full py-4 rounded-2xl font-black text-xs transition-all border
                        ${image.status === 'maybe'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-500/20'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                      وضع في &quot;الحيرة&quot;
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ProLightboxPreview;
