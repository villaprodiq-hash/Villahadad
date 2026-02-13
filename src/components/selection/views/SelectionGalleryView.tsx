import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Filter, Search, Plus, FolderOpen, AlertCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Booking, BookingStatus } from '../../../types';
import { GalleryFolder } from '../widgets/GalleryFolderCard';
import { PortfolioItem } from '../widgets/GalleryGridWidget';
import GalleryHeroWidget from '../widgets/GalleryHeroWidget';
import GalleryAlbumsGrid from '../widgets/GalleryAlbumsGrid';
import SelectionFolderView from '../widgets/SelectionFolderView';
import SelectionLightbox from '../widgets/SelectionLightbox';
import ProLightboxPreview from '../../shared/ProLightboxPreview'; // Dev Preview
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type PhotoStatus = 'approved' | 'rejected' | 'pending' | 'maybe';

interface SelectionGalleryViewProps {
  bookings: Booking[];
}

const SelectionGalleryView: React.FC<SelectionGalleryViewProps> = ({ bookings }) => {
  // Gallery Logic
  const [viewMode, setViewMode] = useState<'folders' | 'grid'>('folders');
  const [activeFolder, setActiveFolder] = useState<GalleryFolder & { booking?: any } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioItem | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Dev Preview State
  
  // Advanced Filtering & Search
  const [filterMode, setFilterMode] = useState<'TODAY' | 'ACTIVE' | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Add Folder Logic
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customFolders, setCustomFolders] = useState<GalleryFolder[]>([]);
  const [newFolderData, setNewFolderData] = useState({
      bookingId: '',
      title: '',
      note: ''
  });

  // Photo Ratings Logic
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [showRatings, setShowRatings] = useState(false);

  // Photo Status Overrides (persists approval/rejection decisions)
  const [statusOverrides, setStatusOverrides] = useState<Record<number, PhotoStatus>>({});

  // ✅ NAS Files State
  const [nasFiles, setNasFiles] = useState<PortfolioItem[]>([]);
  const [isLoadingNas, setIsLoadingNas] = useState(false);
  const [nasError, setNasError] = useState<string | null>(null);

  // ✅ Load files from NAS when activeFolder changes
  const loadNasFiles = useCallback(async () => {
    if (!activeFolder?.booking?.folderPath) {
      setNasFiles([]);
      return;
    }

    setIsLoadingNas(true);
    setNasError(null);

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.sessionLifecycle?.getSessionStats) {
        // Get folder stats from NAS
        const rawFolderPath = `${activeFolder.booking.folderPath}/01_RAW`;
        
        // Try to list files using fileSystem API if available
        if (electronAPI?.fileSystem?.listDirectory) {
          const files = await electronAPI.fileSystem.listDirectory(rawFolderPath);
          
          if (files && Array.isArray(files)) {
            const imageFiles = files
              .filter((f: any) => /\.(jpg|jpeg|png|raw|cr2|arw|heic|webp)$/i.test(f.name))
              .map((f: any, index: number) => ({
                id: index + 1,
                image: `file://${f.path}`, // Local file path
                title: f.name,
                category: activeFolder.title || 'تصوير',
                date: new Date().toLocaleDateString('ar-IQ'),
                likes: 0,
                status: 'pending' as const,
                rating: 0,
                assignedTo: { name: 'Sarah', avatar: '' },
                filePath: f.path,
              }));
            
            setNasFiles(imageFiles);
            toast.success(`📁 تم تحميل ${imageFiles.length} صورة من NAS`);
          }
        } else {
          // Fallback: Show folder path info
          console.log('[NAS] Folder path:', rawFolderPath);
          setNasError('لا يمكن الوصول لـ NAS مباشرة - استخدم وضع المعاينة');
        }
      }
    } catch (error) {
      console.error('[NAS] Failed to load files:', error);
      setNasError('فشل تحميل الملفات من NAS');
    } finally {
      setIsLoadingNas(false);
    }
  }, [activeFolder]);

  useEffect(() => {
    if (viewMode === 'grid' && activeFolder?.booking?.folderPath) {
      loadNasFiles();
    }
  }, [viewMode, activeFolder, loadNasFiles]);

  const handleRate = (id: number, rating: number) => {
      setRatings(prev => ({ ...prev, [id]: rating }));
  };

  // ── Status Change Handlers ──
  const handleStatusChange = useCallback((id: number, status: PhotoStatus) => {
    setStatusOverrides(prev => ({ ...prev, [id]: status }));
  }, []);

  const handleBatchStatusChange = useCallback((ids: number[], status: PhotoStatus) => {
    setStatusOverrides(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = status; });
      return next;
    });
  }, []);

  const handleCreateFolder = () => {
      const selectedBooking = bookings.find(b => b.id === newFolderData.bookingId);
      if (!selectedBooking && !newFolderData.title) return;

      const newFolder: GalleryFolder = {
          id: Date.now(),
          client: selectedBooking ? selectedBooking.clientName : 'عميل جديد',
          title: newFolderData.title || selectedBooking?.title || 'مجلد جديد',
          coverImage: 'https://images.unsplash.com/photo-1511285560987-50417ee22365?q=80&w=800',
          imageCount: 0,
          status: 'active',
          progress: 0,
          lastUpdate: 'الأن',
          assignedTo: { name: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=a' }
      };

      setCustomFolders(prev => [newFolder, ...prev]);
      setIsAddModalOpen(false);
      setNewFolderData({ bookingId: '', title: '', note: '' });
  };

  const handleDeleteFolder = async (folder: GalleryFolder) => {
      if (!confirm(`هل أنت متأكد من حذف مجلد "${folder.title}"؟\nسيتم نقله إلى سلة المهملات الآمنة.`)) return;
      
      try {
          // 1. Call API to Soft Delete
          // Assuming backend path management. For custom folders without path, just remove from UI.
          // For real folders:
           // await fetch('http://localhost:3000/api/media/delete-folder', { 
           //    method: 'POST', 
           //    headers: {'Content-Type': 'application/json'},
           //    body: JSON.stringify({ folderPath: folder.path }) 
           // });

          // 2. Remove from Local State
          setCustomFolders(prev => prev.filter(f => f.id !== folder.id));
          // If it aligns with a booking, we might need to update booking status or just hide it. 
          // For now, this handles custom folders. Booking-based folders are derived from props.
          
      } catch (error) {
          console.error("Failed to delete folder", error);
          alert("فشل في حذف المجلد");
      }
  };

  // Data Transformation (Real Data Only)
  const folders: GalleryFolder[] = useMemo(() => [
    ...customFolders,
    // Only show bookings that are ready for selection (SHOOTING = Just arrived, SELECTION = In Progress)
    // We hide EDITING/DELIVERED because they are "Handed Over" to the design team.
    ...bookings.filter(b => b.status === BookingStatus.SELECTION || b.status === BookingStatus.SHOOTING).map((b, i) => ({
      id: parseInt(b.id) || i,
      client: b.clientName,
      title: b.title || 'جلسة تصوير',
      // Dynamic Cover Image logic can be improved later to fetch real thumb
      coverImage: `https://images.unsplash.com/photo-${['1519741497674-611481863552', '1511285560987-50417ee22365'][i % 2]}?q=80&w=800`,
      imageCount: 0, 
      // SELECTION = Urgent (Needs work), SHOOTING = Active (New arrival)
      status: (b.status === BookingStatus.SELECTION ? 'urgent' : 'active') as 'active' | 'completed' | 'urgent',
      progress: b.status === BookingStatus.SELECTION ? 10 : 0, 
      lastUpdate: b.shootDate || 'جديد',
      assignedTo: { name: 'Sarah', avatar: '' },
      bookingId: b.id, // ✅ إضافة معرف الحجز
      booking: b, // ✅ إضافة كائن الحجز كاملاً
  }))], [bookings, customFolders]);

  const filteredFolders = useMemo(() => {
    let result = folders;
    if (filterMode === 'TODAY') {
         const today = new Date().toISOString().split('T')[0];
         result = result.filter(f => {
           const booking = (f as any).booking;
           return booking?.shootDate === today || f.status === 'urgent';
         });
    } else if (filterMode === 'ACTIVE') {
         result = result.filter(f => f.status === 'active' || f.status === 'urgent');
    }

    if (searchQuery) {
        const normalizeArabic = (text: string) => text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
        const query = normalizeArabic(searchQuery);
        result = result.filter(f => normalizeArabic(f.client || '').includes(query) || normalizeArabic(f.title || '').includes(query));
    }

    return result;
  }, [folders, filterMode, searchQuery]);

  const portfolioItems = useMemo(() => {
    // Apply status overrides and ratings to items
    const applyOverrides = (items: PortfolioItem[]) =>
      items.map(item => ({
        ...item,
        status: statusOverrides[item.id] || item.status,
        rating: ratings[item.id] || item.rating || 0,
      }));

    // ✅ استخدام الملفات من NAS إذا كانت متوفرة
    if (nasFiles.length > 0) {
      return applyOverrides(nasFiles);
    }

    // ✅ وضع العرض التوضيحي (Demo mode) - بيانات وهمية للاختبار
    if (activeFolder?.id === 999 || (activeFolder && !activeFolder.booking?.folderPath)) {
        const demoItems: PortfolioItem[] = Array.from({ length: 24 }).map((_, i) => ({
            id: 1000 + i,
            image: `https://images.unsplash.com/photo-${[
                '1519741497674-611481863552', '1511285560987-50417ee22365', '1604017011826-d3b4c23f8914',
                '1583939003029-4b13bd48f748', '1515934751635-c81c6bc9a2d8', '1520854221250-7c9d243e71df',
                '1522673607200-1645062af631', '1507003211169-0a1dd7228f2d', '1525258746881-14e966431271',
                '1465495976277-4387d4b0b4c8', '1469334031218-e382a71b716b', '1532712938310-34cb3958dc74'
            ][i % 12]}?q=80&w=600`,
            title: `صورة زفاف ${i + 1}`,
            category: "زفاف",
            date: "يناير 2024",
            likes: 120 + i * 5,
            status: 'pending' as const,
            rating: 0,
            assignedTo: { name: 'Sarah', avatar: '' }
        }));
        return applyOverrides(demoItems);
    }
    return [];
  }, [activeFolder, ratings, nasFiles, statusOverrides]);

  const handleNext = () => {
    if (!selectedPhoto) return;
    const currentIndex = portfolioItems.findIndex(p => p.id === selectedPhoto.id);
    const next = portfolioItems[currentIndex + 1];
    if (currentIndex < portfolioItems.length - 1 && next) setSelectedPhoto(next);
  };

  const handlePrev = () => {
    if (!selectedPhoto) return;
    const currentIndex = portfolioItems.findIndex(p => p.id === selectedPhoto.id);
    const prev = portfolioItems[currentIndex - 1];
    if (currentIndex > 0 && prev) setSelectedPhoto(prev);
  };

  return (
    <>
      {viewMode === 'folders' && (
        <>
           <GalleryHeroWidget items={portfolioItems.slice(0, 5)} theme="pink" />

           <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 mb-2 relative z-30">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-white tracking-tight">المجلدات النشطة</h3>
                    <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-400 text-[10px] font-bold border border-pink-500/20">
                        {filteredFolders.length} مجلد
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group z-20">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-10 px-4 flex items-center gap-2 rounded-xl transition-all border shadow-sm ${activeTab !== 'All' ? 'bg-transparent text-pink-600 border-pink-500 shadow-none' : 'bg-transparent text-white border-white/10 hover:border-white/20'}`}
                        >
                            <Filter size={16} />
                            <span className="text-xs font-bold">{activeTab === 'All' ? 'تصفية' : activeTab}</span>
                        </button>
                        
                        {isFilterOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-xl shadow-xl overflow-hidden p-1 z-50">
                                {['All', 'Review', 'In Progress', 'Completed'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setIsFilterOpen(false); }}
                                        className={`w-full text-right px-4 py-2.5 rounded-lg text-xs font-bold transition-colors mb-0.5 ${activeTab === tab ? 'bg-white/20 text-pink-400' : 'text-zinc-300 hover:bg-white/10'}`}
                                    >
                                        {tab === 'All' && 'الكل'}
                                        {tab === 'Review' && 'في المراجعة'}
                                        {tab === 'In Progress' && 'قيد التعديل'}
                                        {tab === 'Completed' && 'مكتمل'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                          ${isPreviewMode 
                            ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20 pr-4' 
                            : 'bg-white/5 text-white/40 border-white/5 pr-4 hover:border-white/20'}`}
                    >
                        {isPreviewMode ? 'إيقاف المعاينة' : 'تجربة Lightbox Pro'}
                    </button>

                    <div className={`flex items-center transition-all duration-300 ease-out p-1 rounded-xl border ${searchQuery ? 'bg-transparent shadow-lg border-pink-400 pr-1 w-64' : 'bg-transparent border-white/10 w-10 hover:w-64'}`}>
                         <AnimatePresence>
                             <div className="flex-1 flex items-center overflow-hidden">
                                 <input
                                   type="text"
                                   value={searchQuery}
                                   onChange={(e) => setSearchQuery(e.target.value)}
                                   placeholder="بحث عن مجلد..."
                                   className={`bg-transparent border-none outline-none text-xs font-bold text-white placeholder-zinc-600 px-3 h-8 w-full ${!searchQuery ? 'cursor-pointer' : ''}`}
                                 />
                             </div>
                         </AnimatePresence>
                        <button className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${searchQuery ? 'bg-transparent text-pink-600 border border-pink-500' : 'text-zinc-400'}`}>
                            <Search size={16} />
                        </button>
                    </div>

                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="h-10 px-4 flex items-center gap-2 rounded-xl bg-transparent border-2 border-white/10 text-white hover:bg-white/5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus size={16} />
                        <span className="text-xs font-bold hidden sm:inline">مجلد جديد</span>
                    </button>
                </div>
           </div>

           <GalleryAlbumsGrid 
              folders={filteredFolders} 
              onFolderClick={(folder) => { setActiveFolder(folder); setViewMode('grid'); }}
              onFolderDrop={() => {}}
              onDelete={handleDeleteFolder}
              theme="pink"
           />
        </>
      )}

      {viewMode === 'grid' && activeFolder && (
         <>
            {/* ✅ NAS Status Bar */}
            {activeFolder.booking?.folderPath && (
              <div className="mb-4 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-white">مجلد NAS</p>
                    <p className="text-xs text-zinc-500 truncate max-w-md" dir="ltr">
                      {activeFolder.booking.folderPath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoadingNas ? (
                    <span className="text-xs text-blue-400 animate-pulse">جاري التحميل...</span>
                  ) : nasError ? (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {nasError}
                    </span>
                  ) : (
                    <span className="text-xs text-green-400">
                      {nasFiles.length} صورة محملة
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <SelectionFolderView
              theme="selection"
              folder={activeFolder}
              items={portfolioItems}
              onBack={() => { setActiveFolder(null); setViewMode('folders'); setStatusOverrides({}); }}
              onUpload={() => {}}
              onItemClick={(item) => setSelectedPhoto(item)}
              onRate={handleRate}
              showRatings={true}
              booking={activeFolder.booking}
              nasPath={activeFolder.booking?.folderPath}
              onStatusChange={handleStatusChange}
              onBatchStatusChange={handleBatchStatusChange}
            />
         </>
      )}

      <AnimatePresence>
          {selectedPhoto && (
            isPreviewMode ? (
              <ProLightboxPreview
                  isOpen={!!selectedPhoto}
                  image={{...selectedPhoto, rating: ratings[selectedPhoto.id] || 0, status: statusOverrides[selectedPhoto.id] || selectedPhoto.status}}
                  onClose={() => setSelectedPhoto(null)}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onRate={handleRate}
                  showRatings={showRatings}
                  onToggleRatings={() => setShowRatings(!showRatings)}
                  onApprove={(id) => handleStatusChange(id, 'approved')}
                  onReject={(id) => handleStatusChange(id, 'rejected')}
                  onMaybe={(id) => handleStatusChange(id, 'maybe')}
                  availableTags={['تبييض أسنان', 'إزالة عيوب', 'تنعيم بشرة', 'تنحيف', 'فتح عيون', 'إزالة كائن']}
                  onToggleTag={() => {}}
              />
            ) : (
              <SelectionLightbox
                  isOpen={!!selectedPhoto}
                  image={{...selectedPhoto, rating: ratings[selectedPhoto.id] || 0, status: statusOverrides[selectedPhoto.id] || selectedPhoto.status}}
                  onClose={() => setSelectedPhoto(null)}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onRate={handleRate}
                  showRatings={showRatings}
                  onToggleRatings={() => setShowRatings(!showRatings)}
                  onApprove={(id) => handleStatusChange(id, 'approved')}
                  onReject={(id) => handleStatusChange(id, 'rejected')}
                  onMaybe={(id) => handleStatusChange(id, 'maybe')}
                  onAddNote={() => {}}
                  availableTags={['تبييض أسنان', 'إزالة عيوب', 'تنعيم بشرة', 'تنحيف', 'فتح عيون', 'إزالة كائن']}
                  onToggleTag={() => {}}
                  theme="selection"
              />
            )
          )}
      </AnimatePresence>

      <AnimatePresence>
          {isAddModalOpen && (
              <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                 <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsAddModalOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                 />
                 <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md bg-zinc-900/60 rounded-3xl p-8 shadow-2xl overflow-hidden border border-white/10"
                 >
                     <h2 className="text-2xl font-black text-white mb-6">إنشاء مجلد جديد</h2>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">اسم المجلد</label>
                             <input
                                type="text"
                                value={newFolderData.title}
                                onChange={(e) => setNewFolderData({...newFolderData, title: e.target.value})}
                                placeholder="مثال: زفاف احمد وسارة"
                                className="w-full h-12 rounded-xl bg-zinc-800/40 border border-white/10 px-4 font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">ربط بحجز (اختياري)</label>
                             <select
                                value={newFolderData.bookingId}
                                onChange={(e) => setNewFolderData({...newFolderData, bookingId: e.target.value})}
                                className="w-full h-12 rounded-xl bg-zinc-800/40 border border-white/10 px-4 font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                             >
                                 <option value="">-- اختر حجزاً --</option>
                                 {bookings.map(b => (
                                     <option key={b.id} value={b.id}>{b.clientName} - {b.title}</option>
                                 ))}
                             </select>
                         </div>
                     </div>
                     <div className="flex gap-3 mt-8">
                         <button onClick={handleCreateFolder} className="flex-1 h-12 bg-white text-gray-900 rounded-xl font-bold hover:bg-zinc-200 transition-colors">إنشاء المجلد</button>
                         <button onClick={() => setIsAddModalOpen(false)} className="h-12 px-6 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">إلغاء</button>
                     </div>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>
    </>
  );
};

export default SelectionGalleryView;
