import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Booking, ImageRetouchTag, RetouchOption, RetouchOptionLabels } from '../../../types';
import { Search, Image as ImageIcon, ArrowRight, Heart, X, ChevronLeft, ChevronRight, MessageSquare, HelpCircle, ZoomIn, Tag, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReceptionPageWrapper from '../layout/ReceptionPageWrapper';

interface GalleryViewProps {
  bookings: Booking[];
  isReception?: boolean;
  isManager?: boolean;
}

type GalleryFilter = 'all' | 'selected' | 'maybe' | 'rejected';

interface GalleryImage {
  id: string;
  title?: string;
  url: string;
}

// ✅ PRODUCTION: No mock images - will show empty state until real images are uploaded
const getBookingImages = (booking: Booking & { images?: GalleryImage[] }): GalleryImage[] => {
    // Real images would come from booking.images or a gallery service
    // For now, return empty array to show "no images" state
    return booking?.images || [];
};

const ReceptionGalleryView: React.FC<GalleryViewProps> = ({ bookings, isReception = true, isManager = false }) => {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<GalleryFilter>('all');
  const [colorLabels, setColorLabels] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [retouchTags, setRetouchTags] = useState<ImageRetouchTag[]>([]);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const images = useMemo(() => selectedBooking ? getBookingImages(selectedBooking) : [], [selectedBooking]);

  const filteredImages = useMemo(() => {
    let res = images;
    if (viewFilter === 'selected') res = res.filter(img => colorLabels[img.id] === 'green');
    else if (viewFilter === 'maybe') res = res.filter(img => colorLabels[img.id] === 'yellow');
    else if (viewFilter === 'rejected') res = res.filter(img => colorLabels[img.id] === 'red');
    if (searchTerm) res = res.filter(img => (img.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    return res;
  }, [images, viewFilter, colorLabels, searchTerm]);

  const setColor = (id: string, color: string) => {
      setColorLabels(prev => ({ ...prev, [id]: prev[id] === color ? 'none' : color }));
  };

  const navigate = useCallback((dir: number) => {
      if (lightboxIndex === null) return;
      let next = lightboxIndex + dir;
      
      // Circular navigation
      if (next < 0) next = filteredImages.length - 1;
      if (next >= filteredImages.length) next = 0;
      
      setLightboxIndex(next);
      setZoomLevel(100);
      setPanPosition({ x: 0, y: 0 });
  }, [filteredImages.length, lightboxIndex]);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(50, Math.min(300, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 100) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard shortcuts and mouse wheel zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      
      // Escape behavior: Reset Zoom if zoomed in, otherwise close
      if (e.key === 'Escape') {
        if (zoomLevel > 100) {
            setZoomLevel(100);
            setPanPosition({ x: 0, y: 0 });
        } else {
            setLightboxIndex(null);
        }
      } 
      // Navigation: ArrowLeft / A / ش -> Next Image
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ش') {
        e.preventDefault();
        navigate(1); 
      } 
      // Navigation: ArrowRight / D / ي -> Previous Image
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'ي') {
        e.preventDefault();
        navigate(-1); 
      } 
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoom(25);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoom(-25);
      } else if (e.key === '0' || e.key === '٠') { // Support Arabic zero
        e.preventDefault();
        setZoomLevel(100);
        setPanPosition({ x: 0, y: 0 });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (lightboxIndex === null) return;
      
      // Zoom directly with scroll wheel (no Ctrl needed)
      e.preventDefault();
      const delta = e.deltaY > 0 ? -25 : 25;
      handleZoom(delta);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [lightboxIndex, zoomLevel, navigate]); // Added zoomLevel to dependency to access current state in Escape

  // Hide header when lightbox is open
  useEffect(() => {
    const header = document.querySelector('header') || document.querySelector('[class*="Header"]') || document.querySelector('div[class*="z-"]');
    
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
      if (header) {
        (header as HTMLElement).style.display = 'none';
        (header as HTMLElement).style.visibility = 'hidden';
        (header as HTMLElement).style.opacity = '0';
        (header as HTMLElement).style.zIndex = '-1';
      }
    } else {
      document.body.style.overflow = '';
      if (header) {
        (header as HTMLElement).style.display = '';
        (header as HTMLElement).style.visibility = '';
        (header as HTMLElement).style.opacity = '';
        (header as HTMLElement).style.zIndex = '';
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      if (header) {
        (header as HTMLElement).style.display = '';
        (header as HTMLElement).style.visibility = '';
        (header as HTMLElement).style.opacity = '';
        (header as HTMLElement).style.zIndex = '';
      }
    };
  }, [lightboxIndex]);

  // Double click to reset zoom
  const handleImageDoubleClick = () => {
    setZoomLevel(100);
    setPanPosition({ x: 0, y: 0 });
  };

  const addRetouchTag = (imageId: string, option: RetouchOption) => {
    const newTag: ImageRetouchTag = {
      id: `tag_${Date.now()}`,
      imageId,
      option,
    };
    setRetouchTags(prev => [...prev, newTag]);
    setShowTagMenu(false);
  };

  const removeRetouchTag = (tagId: string) => {
    setRetouchTags(prev => prev.filter(t => t.id !== tagId));
  };

  const getImageTags = (imageId: string) => {
    return retouchTags.filter(t => t.imageId === imageId);
  };

  const currentImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;
  const currentImageTags = currentImage ? getImageTags(currentImage.id) : [];

  return (
    <ReceptionPageWrapper isReception={isReception} isManager={isManager}>
        <div className="flex flex-col h-full overflow-hidden relative" dir="rtl">
      <div className={`flex items-center justify-between mb-4 ${isManager ? 'bg-white/60 backdrop-blur-3xl border-white/40 ring-1 ring-white/60 text-gray-800' : 'bg-[#262626]/80 border-white/5'} p-4 rounded-4xl border`}>
         <div className="flex items-center gap-3">
            {selectedBooking && <button onClick={()=>setSelectedBooking(null)} className={`p-2 ${isManager ? 'bg-white/50 text-gray-500 hover:text-gray-800' : 'bg-white/5 text-gray-400 hover:text-white'} rounded-lg`}><ArrowRight size={16} className="rotate-180" /></button>}
            <h2 className={`text-lg font-bold ${isManager ? 'text-gray-800' : 'text-white'} flex items-center gap-2`}>
                <ImageIcon size={18} className={isManager ? 'text-amber-500' : 'text-pink-500'} />
                {selectedBooking ? selectedBooking.clientName : 'اختيار الصور'}
            </h2>
         </div>
         <div className="flex gap-2">
            {selectedBooking && (
                <div className={`flex ${isManager ? 'bg-gray-100/50' : 'bg-black/20'} p-1 rounded-lg`}>
                    {(['all', 'selected', 'maybe', 'rejected'] as const).map((f) => (
                        <button key={f} onClick={()=>setViewFilter(f)} className={`px-3 py-1 rounded text-[10px] font-bold ${viewFilter === f ? (isManager ? 'bg-amber-500 text-white' : 'bg-pink-500 text-white') : (isManager ? 'text-gray-500 hover:text-gray-800' : 'text-gray-500')}`}>
                            {f === 'all' ? 'الكل' : f === 'selected' ? 'مختارة' : f === 'maybe' ? 'محتار' : 'مرفوضة'}
                        </button>
                    ))}
                </div>
            )}
            <div className="relative">
                <Search className={`absolute right-3 top-1/2 -translate-y-1/2 ${isManager ? 'text-gray-400' : 'text-gray-500'}`} size={14} />
                <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className={`${isManager ? 'bg-white/50 border-gray-200 text-gray-800 focus:border-amber-400' : 'bg-black/30 border-white/10 text-white'} border rounded-xl pr-9 pl-4 py-1.5 text-xs outline-none w-32 focus:w-48 transition-all`} />
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!selectedBooking ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {bookings.length > 0 ? bookings.map(b => (
                      <div key={b.id} onClick={()=>setSelectedBooking(b)} className={`${isManager ? 'bg-white/40 hover:bg-white/60 border-white/40 hover:border-amber-400/30' : 'bg-[#21242b] border-white/5 hover:border-pink-500/30'} p-4 rounded-xl border cursor-pointer transition-all group`}>
                          <div className={`aspect-[4/3] ${isManager ? 'bg-white/50 border-white/20' : 'bg-black/40 border-white/5'} rounded-lg mb-3 flex items-center justify-center border group-hover:border-opacity-100`}>
                             <ImageIcon size={32} className={`${isManager ? 'text-gray-400 group-hover:text-amber-500' : 'text-gray-600 group-hover:text-pink-500'} transition-colors`} />
                          </div>
                          <h3 className={`${isManager ? 'text-gray-800' : 'text-white'} font-bold text-sm truncate`}>{b.clientName}</h3>
                          <p className="text-[10px] text-gray-500 mt-1">{b.shootDate}</p>
                      </div>
                  )) : (
                    // ✅ PRODUCTION: Empty state - no mock data
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500">
                        <ImageIcon size={48} className="mb-4 opacity-30" />
                        <p className="text-sm font-medium">لا توجد حجوزات بعد</p>
                        <p className="text-xs mt-1">ستظهر المعارض هنا بعد إضافة الحجوزات</p>
                    </div>
                  )}
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredImages.map((img, i) => {
                    const imageTags = getImageTags(img.id);
                    return (
                      <div key={img.id} onClick={()=>setLightboxIndex(i)} className="relative aspect-square rounded-xl overflow-hidden group border border-white/5 cursor-pointer">
                          <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">{img.title}</span>
                          </div>
                          {colorLabels[img.id] && colorLabels[img.id] !== 'none' && (
                              <div className={`absolute top-2 right-2 p-1 rounded-full ${colorLabels[img.id] === 'green' ? 'bg-green-500' : colorLabels[img.id] === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                  <Heart size={8} fill="white" className="text-white" />
                              </div>
                          )}
                          {imageTags.length > 0 && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 rounded-full flex items-center gap-1">
                                  <Tag size={10} className="text-white" />
                                  <span className="text-[9px] text-white font-bold">{imageTags.length}</span>
                              </div>
                          )}
                      </div>
                    );
                  })}
              </div>
          )}
      </div>

      <AnimatePresence>
          {lightboxIndex !== null && currentImage && (
            <LightboxPortal>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[99999] bg-black flex flex-col"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                  {/* Background overlay - click to close */}
                  <div 
                    className="absolute inset-0 z-0" 
                    onClick={()=>setLightboxIndex(null)}
                  />
                  
                  {/* Content wrapper - prevent close on click */}
                  <div className="relative z-10 flex flex-col h-full" onClick={e=>e.stopPropagation()}>
                      
                      {/* Fixed Close Button */}
                      <button 
                        onClick={()=>setLightboxIndex(null)} 
                        className="fixed top-6 left-6 z-[1000] p-3 rounded-full bg-black/50 hover:bg-red-600/80 text-white transition-all backdrop-blur-md border border-white/10 shadow-2xl group"
                        title="إغلاق (Esc)"
                      >
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>

                  {/* Viewport */}
                  <div 
                    ref={imageContainerRef}
                    className="flex-1 relative flex items-center justify-center p-4 overflow-hidden"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                      {/* WRAPPER DIV: Keeps controls attached to the image size */}
                      <div className="relative inline-flex items-center justify-center max-w-full max-h-full">
                        

                            
                          {/* Navigation Areas - Full Height Transparent Buttons */}
                          {/* Right Zone (Previous in RTL) */}
                          <div 
                             onClick={(e)=>{e.stopPropagation(); navigate(-1)}} 
                             className="fixed right-0 top-0 bottom-0 w-[15%] z-100 cursor-pointer flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity duration-300 group"
                          >
                              <div className="p-3 bg-black/40 rounded-full text-white backdrop-blur-md group-hover:bg-black/60 group-hover:scale-110 transition-all">
                                <ChevronRight size={40} />
                              </div>
                          </div>

                          {/* Left Zone (Next in RTL) */}
                          <div 
                             onClick={(e)=>{e.stopPropagation(); navigate(1)}} 
                             className="fixed left-0 top-0 bottom-0 w-[15%] z-100 cursor-pointer flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity duration-300 group"
                          >
                              <div className="p-3 bg-black/40 rounded-full text-white backdrop-blur-md group-hover:bg-black/60 group-hover:scale-110 transition-all">
                                <ChevronLeft size={40} />
                              </div>
                          </div>

                          <img 
                            src={currentImage.url}
                            onDoubleClick={handleImageDoubleClick}
                            style={{ 
                              transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                              transition: isDragging ? 'none' : 'transform 0.2s',
                              transformOrigin: 'center center'
                            }}
                            className="max-h-[calc(100vh-200px)] max-w-full object-contain shadow-2xl rounded select-none" 
                            draggable={false}
                          />
                      </div>
                      
                      {/* Zoom hint - Kept absolute to screen as it's UI overlay */}
                      {zoomLevel === 100 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg text-xs text-gray-400 flex items-center gap-2 pointer-events-none">
                          <ZoomIn size={12} />
                          <span>Scroll للزوم | نقرتين للإعادة</span>
                        </div>
                      )}
                      
                      {zoomLevel > 100 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg text-xs text-green-400 flex items-center gap-2 pointer-events-none">
                          <Move size={12} />
                          <span>اسحب للتحرك | ESC للخروج من الزوم</span>
                        </div>
                      )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="p-6 flex flex-col items-center gap-4 bg-linear-to-t from-black to-transparent" onClick={e=>e.stopPropagation()}>
                      
                      {/* Retouch Tags Display */}
                      {currentImageTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {currentImageTags.map(tag => (
                            <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                              <Tag size={12} className="text-purple-400" />
                              <span className="text-xs text-white">{RetouchOptionLabels[tag.option]}</span>
                              <button onClick={()=>removeRetouchTag(tag.id)} className="text-white/50 hover:text-white">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Selection Buttons */}
                      <div className="flex gap-2 bg-[#1a1c22] p-1.5 rounded-xl border border-white/10 shadow-xl">
                          <button onClick={()=>setColor(currentImage.id, 'green')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${colorLabels[currentImage.id] === 'green' ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-400'}`}>
                            <Heart size={14} fill={colorLabels[currentImage.id] === 'green' ? "white" : "none"} /> اختيار
                          </button>
                          <button onClick={()=>setColor(currentImage.id, 'yellow')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${colorLabels[currentImage.id] === 'yellow' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-white/5 text-gray-400'}`}>
                            <HelpCircle size={14} /> محتار
                          </button>
                          <button onClick={()=>setColor(currentImage.id, 'red')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${colorLabels[currentImage.id] === 'red' ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-gray-400'}`}>
                            <X size={14} /> رفض
                          </button>
                          
                          {/* Retouch Tag Button */}
                          <button onClick={()=>setShowTagMenu(!showTagMenu)} className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                            <Tag size={14} /> تعديل
                          </button>
                      </div>
                      
                      {/* Retouch Tag Menu */}
                      {showTagMenu && (
                        <div className="w-full max-w-md bg-[#1a1c22] border border-white/10 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-2">اختر نوع التعديل:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(['Double Chin', 'Eye Opening', 'Object Removal', 'Teeth Whitening', 'Skin Smoothing', 'Hair Fix', 'Body Slimming'] as RetouchOption[]).map(option => (
                              <button
                                key={option}
                                onClick={()=>addRetouchTag(currentImage.id, option)}
                                className="px-3 py-2 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 rounded-lg text-xs text-white transition-all"
                              >
                                {RetouchOptionLabels[option]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="w-full max-w-md relative">
                          <MessageSquare className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                          <input type="text" placeholder="ملاحظة للمصمم..." className="w-full bg-black/40 border border-white/5 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white outline-none focus:border-pink-500/50" />
                      </div>
                  </div>
                  
                  </div> {/* End content wrapper */}
              </motion.div>
            </LightboxPortal>
          )}
      </AnimatePresence>
    </div>
    </ReceptionPageWrapper>
  );
};

// Portal Component for Lightbox
const LightboxPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof window === 'undefined') return null;
  return createPortal(children, document.body);
};

export default ReceptionGalleryView;
