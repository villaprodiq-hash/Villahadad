import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Check, XCircle, MessageSquare, Info, Calendar, Camera, Hash, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface ManagerLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    title: string;
    image: string;
    category: string;
    status: 'approved' | 'rejected' | 'pending';
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
  onAddNote: (id: number, note: string) => void;
  availableTags: string[];
  onToggleTag: (id: number, tag: string) => void;
}

const ManagerLightbox: React.FC<ManagerLightboxProps> = ({
  isOpen,
  onClose,
  image,
  onNext,
  onPrev,
  onApprove,
  onReject,
  onAddNote,
  availableTags,
  onToggleTag
}) => {
  const [showTags, setShowTags] = useState(false);
  
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

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

  const handleDoubleClick = (e: React.MouseEvent) => {
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
          y: e.clientY - startPos.y
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
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !image) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col md:flex-row overflow-hidden"
      >
        {/* Main Image Area */}
        <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 bg-black">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
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
            <motion.img
                ref={imageRef}
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                    opacity: 1, 
                    scale: scale,
                    x: position.x,
                    y: position.y
                }}
                transition={{ 
                    duration: isDragging ? 0 : 0.2, // Instant move when dragging, smooth otherwise
                    scale: { duration: 0.2 } 
                }}
                src={image.image}
                alt={image.title}
                className="max-h-full max-w-full object-contain shadow-2xl select-none"
                style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
                draggable={false}
            />
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${image.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                    image.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                    'bg-amber-500/20 text-amber-400'}`}
                >
                  {image.status === 'approved' ? 'تمت الموافقة' : 
                   image.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
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
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">تم العمل بواسطة</h3>
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
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">تفاصيل الجلسة</h3>
               <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-500 mb-1">سعر الجلسة</p>
                     <p className="text-white font-mono text-lg font-bold">$1,200</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                     <p className="text-xs text-gray-500 mb-1">صلاحية النشر</p>
                     <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                        <Check size={14} />
                        مسموح
                     </div>
                  </div>
               </div>
               
               {/* Summary of Editing Requests */}
               <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                   <p className="text-xs text-gray-500 mb-2">التعديلات المطلوبة</p>
                   <div className="flex flex-wrap gap-1.5 pl-1">
                      {(image.editingRequests || []).slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                             {t}
                          </span>
                      ))}
                      {(image.editingRequests?.length || 0) > 3 && (
                          <span className="text-[10px] text-gray-500 px-1">+{ (image.editingRequests?.length || 0) - 3 }</span>
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
                                            ${isSelected 
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' 
                                                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <Check size={10} className={isSelected ? "opacity-100" : "opacity-0"} />
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>

             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onApprove(image.id)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
                    ${image.status === 'approved' 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' 
                      : 'bg-white/5 hover:bg-green-600/20 text-gray-300 hover:text-green-400'}`}
                >
                  <Check size={18} />
                  اعتماد
                </button>
                <button 
                  onClick={() => onReject(image.id)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
                    ${image.status === 'rejected'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                      : 'bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-400'}`}
                >
                  <XCircle size={18} />
                  رفض
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
             
             {/* Extra Tools */}
             <div className="flex justify-center pt-2">
                <button 
                  onClick={() => setShowTags(!showTags)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showTags ? 'bg-white text-black' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                >
                   <Tag size={14} />
                   {showTags ? 'إخفاء التاغات' : 'عرض التاغات'}
                </button>
             </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ManagerLightbox;
