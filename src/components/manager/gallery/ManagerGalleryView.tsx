import React, { useState } from 'react';
import { FolderOpen, ChevronRight, Filter, Search, FolderPlus, X, Calendar, User, Hash, Briefcase, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Widgets
// Widgets
import GalleryHeroWidget from './widgets/GalleryHeroWidget';
// import GalleryGridWidget from './widgets/GalleryGridWidget'; // Replaced
import SelectionFolderView from '../../selection/widgets/SelectionFolderView'; // New
import SelectionLightbox from '../../selection/widgets/SelectionLightbox'; // New
import ProLightboxPreview from '../../shared/ProLightboxPreview'; // Dev Preview
import { PortfolioItem } from '../../selection/widgets/GalleryGridWidget';
import GalleryAlbumsGrid from './widgets/GalleryAlbumsGrid';
import { GalleryFolder } from './widgets/GalleryFolderCard';
import { toast } from 'sonner';
import UploadProgressWidget, { UploadFile } from './widgets/UploadProgressWidget';
import ManagerStatsSidebar from './widgets/ManagerStatsSidebar';

const EDITING_TAGS = [
  'إزالة اللغلوغ',
  'فتح العيون',
  'إزالة عنصر',
  'تبييض الأسنان',
  'تنعيم البشرة',
  'إصلاح الشعر',
  'تنحيف الجسم'
];

interface LocalFsItem {
  isDirectory: boolean;
  name: string;
  path: string;
  mtime: string | number | Date;
}

const toDateKey = (value: string | number | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const ManagerGalleryView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'folders' | 'images'>('folders');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioItem | null>(null);
  const showRatings = true;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<GalleryFolder | null>(null);
  const isPreviewMode = false; // Dev Preview State
  
  // State for real folders
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  
  // Real Data: Open Directory
  const handleOpenDirectory = async () => {
    try {
        if (!window.electronAPI?.fileSystem?.openDirectory) {
            toast.error("هذه الميزة غير مدعومة في المتصفح");
            return;
        }

        const path = await window.electronAPI.fileSystem.openDirectory();
        if (path) {
            loadDirectory(path);
        }
    } catch (e) {
        console.error("Open Directory Error", e);
        toast.error("فشل فتح المجلد");
    }
  };

  const loadDirectory = async (path: string) => {
      try {
          const listDirectory = window.electronAPI?.fileSystem?.listDirectory;
          if (!listDirectory) {
            toast.error('ميزة قراءة المجلدات غير متاحة');
            return;
          }
          const items = (await listDirectory(path)) as LocalFsItem[];
          
          const newFolders: GalleryFolder[] = items
            .filter((i) => i.isDirectory)
            .map((i, index: number) => ({
              id: index + 1,
              title: i.name,
              client: 'مجلد محلي',
              bookingId: i.path, // Store full path here
              date: toDateKey(i.mtime),
              category: 'محلي',
              coverImage: 'https://images.unsplash.com/photo-1542038784456-1ea0e93ca64b?q=80&w=2000', // Default
              imageCount: 0, 
              status: 'active',
              progress: 0,
              assignedTo: { name: 'Local', avatar: '' },
              lastUpdate: 'الآن',
              timestamp: new Date(i.mtime).getTime()
          }));

          setFolders(newFolders);
          toast.success(`تم تحميل ${newFolders.length} مجلد`);
      } catch (e) {
          console.error("Load Directory Error", e);
      }
  };

  // Replace mockFolders with folders
  const activeFolders = folders;
  const sortedFolders = [...activeFolders].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
  );

  // بيانات الصور (تبقى كما هي)
  // بيانات الصور (تبقى كما هي)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  // ... (portfolioItems remains same)

  // Smart Sorting: Latest timestamp first
  // const sortedFolders = [...mockFolders].sort((a, b) => b.timestamp - a.timestamp);

  // State for Search
  const [searchQuery, setSearchQuery] = useState('');

  // Helpers & Derived State
  // Combined Filter: Tab + Search
  const getFilteredFolders = () => {
     let result = sortedFolders;

     // 1. Tab Filter
     if (activeTab !== 'All') {
        const statusMap: Record<string, string[]> = {
           'In Progress': ['active'],
           'Review': ['urgent', 'review'],
           'Completed': ['completed'],
        };
        const targetStatuses = statusMap[activeTab] || [];
        result = result.filter(f => targetStatuses.includes(f.status));
     }

     // 2. Search Filter
     if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(f =>
           (f.client || '').toLowerCase().includes(q) ||
           (f.title || '').toLowerCase().includes(q) ||
           (f.bookingId || '').toLowerCase().includes(q) ||
           (f.category || '').toLowerCase().includes(q) ||
           (f.location || '').toLowerCase().includes(q) ||
           (f.date || '').includes(q) ||
           (f.price?.toString() || '').includes(q)
        );
     }
     
     return result;
  };
  
  const filteredFolders = getFilteredFolders();

  const filteredItems = activeTab === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeTab);

  const selectedImage = selectedPhoto;

  // Handlers
  const handleFolderClick = async (folder: GalleryFolder) => {
     setActiveFolder(folder);
     setViewMode('images');
     
     // Load Images from Folder
     if (folder.bookingId && folder.bookingId.startsWith('/')) { // Check if it is a path
          try {
              const listDirectory = window.electronAPI?.fileSystem?.listDirectory;
              if (!listDirectory) {
                toast.error('ميزة قراءة المجلدات غير متاحة');
                return;
              }
              const items = (await listDirectory(folder.bookingId)) as LocalFsItem[];
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
              
              const newPortfolioItems: PortfolioItem[] = items
                  .filter((i) => !i.isDirectory && imageExtensions.some(ext => i.name.toLowerCase().endsWith(ext)))
                  .map((i, index: number) => ({
                     id: index + 1000,
                     title: i.name,
                     category: 'Local',
                   image: `file://${i.path}`, // Use local file protocol
                   likes: 0,
                   status: 'pending',
                   assignedTo: { name: 'Local', avatar: '' },
                   date: toDateKey(i.mtime),
                   camera: 'Unknown',
                   editingRequests: []
                }));
            
            setPortfolioItems(newPortfolioItems);
        } catch (e) {
            console.error("Failed to load folder images", e);
        }
     }
  };

  const handleBackToFolders = () => {
     setViewMode('folders');
     setActiveFolder(null);
  };
  
  // ... (rest of handlers preserved)
  const handleApprove = (id: number) => {
    setPortfolioItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'approved' } : item
    ));
  };

  const handleReject = (id: number) => {
    setPortfolioItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'rejected' } : item
    ));
  };

  const handleNext = () => {
    if (!selectedPhoto) return;
    const currentIndex = filteredItems.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % filteredItems.length;
    const nextItem = filteredItems[nextIndex];
    if (nextItem) setSelectedPhoto(nextItem);
  };

  const handlePrev = () => {
    if (!selectedPhoto) return;
    const currentIndex = filteredItems.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    const prevItem = filteredItems[prevIndex];
    if (prevItem) setSelectedPhoto(prevItem);
  };

  const handleToggleTag = (id: number, tag: string) => {
    setPortfolioItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const currentTags = item.editingRequests || [];
      const newTags = currentTags.includes(tag) 
        ? currentTags.filter(t => t !== tag) 
        : [...currentTags, tag];
      return { ...item, editingRequests: newTags };
    }));
  };

  // State for Uploads
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);

  // Function to Upload Files
  const uploadFilesToSynology = async (files: File[], folder: GalleryFolder) => {
      // 1. Initial UI Update
      const newFiles: UploadFile[] = files.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          progress: 0,
          status: 'uploading'
      }));
      setUploadQueue(prev => [...prev, ...newFiles]);

      // 2. Prepare FormData with STRICT ORDER
      const formData = new FormData();
      
      // ⚠️ METADATA FIRST (Critical for Multer)
      formData.append('bookingDate', folder.date || new Date().toISOString());
      formData.append('clientName', folder.client || 'Unknown Client');
      // If folder.bookingId is relevant for path, maybe add it, but requirement said Date/Client
      
      // ⚠️ FILES LAST
      files.forEach(file => {
          formData.append('files', file);
      });

      try {
          // Determine API URL (assuming local dev for now or use env)
          const API_URL = 'http://localhost:3000/api/media/upload'; 
          
          const response = await fetch(API_URL, {
              method: 'POST',
              body: formData,
          });

          const result = await response.json();

          if (result.success) {
              toast.success('تم رفع الملفات بنجاح! 📂');
              // Update status to completed
              setUploadQueue(prev => prev.map(f => 
                 newFiles.some(nf => nf.id === f.id) ? { ...f, status: 'completed', progress: 100 } : f
              ));
              
              // Refresh View if needed
              if (activeFolder && activeFolder.id === folder.id) {
                 handleFolderClick(folder); // Reload images
              }
          } else {
              throw new Error(result.message || 'Upload failed');
          }
      } catch (error) {
          console.error('Upload Error:', error);
          toast.error('فشل رفع الملفات');
          // Update status to error
          setUploadQueue(prev => prev.map(f => 
             newFiles.some(nf => nf.id === f.id) ? { ...f, status: 'error', progress: 0 } : f
          ));
      }
  };

  // Real File Drop Handler
  const handleFolderDrop = (folder: GalleryFolder, files: FileList) => {
      const fileArray = Array.from(files);
      uploadFilesToSynology(fileArray, folder);
  };
 
  // Removed Simulation Effect


  // --- Add Folder Logic ---
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderData, setNewFolderData] = useState({
    title: '',
    client: '',
    bookingId: '',
    category: 'أعراس',
    date: new Date().toISOString().slice(0, 10)
  });

  const handleCreateFolder = () => {
    if (!newFolderData.title || !newFolderData.client) return;

    const newFolder = {
        id: Date.now(),
        bookingId: newFolderData.bookingId || `#${Math.floor(Math.random() * 1000)}`,
        title: newFolderData.title,
        client: newFolderData.client,
        category: newFolderData.category,
        date: newFolderData.date,
        location: 'ستوديو فيلا حداد', // Default or add field
        price: 0,
        coverImage: 'https://images.unsplash.com/photo-1621600411688-4be93cd68504?q=80&w=2080&auto=format&fit=crop', // Default placeholder
        imageCount: 0,
        status: 'active' as const,
        progress: 0,
        assignedTo: { name: 'غير محدد', avatar: 'https://ui-avatars.com/api/?name=User' },
        lastUpdate: 'الآن',
        timestamp: Date.now()
    };

    // 1. Update UI Optimistically
    setFolders(prev => [newFolder, ...prev]);
    setShowAddFolderModal(false);
    setNewFolderData({
        title: '',
        client: '',
        bookingId: '',
        category: 'أعراس',
        date: new Date().toISOString().slice(0, 10)
    });
    
    // 2. Call API to Create Physical Folder
    createRealFolder(newFolderData);
  };

  const createRealFolder = async (data: typeof newFolderData) => {
    try {
        const response = await fetch('http://localhost:3000/api/media/create-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bookingDate: data.date,
                clientName: data.client,
                category: data.category
            }),
        });
        const result = await response.json();
        if (result.success) {
            toast.success('تم إنشاء المجلد في السيرفر بنجاح ✅');
        } else {
            toast.error('فشل إنشاء المجلد في السيرفر ❌');
            console.error(result.message);
        }
    } catch (e) {
        console.error("Create Folder API Error", e);
        toast.error('خطأ في الاتصال بالسيرفر');
    }
  };

  const handleDeleteFolder = async (folder: GalleryFolder) => {
    // Confirm first
    if (!confirm('هل أنت متأكد من حذف هذا المجلد نهائياً؟')) return;

    try {
        // Optimistic UI Update
        setFolders(prev => prev.filter(f => f.id !== folder.id));

        // API Call
        if (folder.bookingId && folder.bookingId.startsWith('/')) {
             const response = await fetch('http://localhost:3000/api/media/delete-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath: folder.bookingId })
            });
            const result = await response.json();
            if (result.success) {
                toast.success('تم حذف المجلد بنجاح 🗑️');
            } else {
                // Revert
                loadDirectory(folder.bookingId); // Or just reload parent? tricky without parent path known.
                toast.error('فشل حذف المجلد');
                // For now, reload all if possible or just show error.
            }
        } else {
            // Mock folder removal
            toast.success('تم حذف المجلد (محاكاة) 🗑️');
        }
    } catch (e) {
        console.error("Delete Error", e);
        toast.error('حدث خطأ أثناء الحذف');
    }
  };



  return (
    <div className="h-full flex overflow-hidden bg-gray-50/50 dark:bg-[#0f1115]">
      
      {/* 7. Stats Sidebar (Visible on Large Screens - Right Side) */}
      <div className="hidden xl:flex shrink-0 z-20">
          <ManagerStatsSidebar />
      </div>
      
      {/* Main Content Area - Single Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6 max-w-[1600px] mx-auto">
              
              {viewMode === 'folders' ? (
               <>
                  {/* 1. Hero Section */}
                  <GalleryHeroWidget items={portfolioItems} />

                  {/* 2. Header & Controls (Scrolls with content) */}
                   <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 mb-2 relative z-30">
                       {/* Title */}
                       <div className="flex items-center gap-3">
                           <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">المجلدات النشطة</h3>
                           <span className="px-2 py-0.5 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[10px] font-bold border border-amber-200/50 dark:border-amber-500/20">
                               {filteredFolders.length} مجلد
                           </span>
                       </div>

                       {/* Open Directory Button */}
                       <button 
                           onClick={handleOpenDirectory}
                           className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm"
                       >
                           <FolderOpen size={16} className="text-amber-500" />
                           استعراض مجلد محلي
                       </button>

                       {/* Controls */}
                       <div className="flex items-center gap-3 w-full md:w-auto">
                           
                           {/* Filter */}
                           <div className="relative z-20">
                               <button 
                                   onClick={() => setIsFilterOpen(!isFilterOpen)}
                                   className={`h-10 px-4 flex items-center gap-2 rounded-xl transition-all border shadow-sm ${activeTab !== 'All' ? 'bg-amber-500 text-white shadow-amber-500/20 border-transparent' : 'bg-white dark:bg-[#1a1c22] text-gray-600 dark:text-gray-300 border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20'}`}
                               >
                                   <Filter size={16} />
                                   <span className="text-xs font-bold">{activeTab === 'All' ? 'تصفية' : activeTab}</span>
                               </button>
                               
                               {isFilterOpen && (
                                   <div className="absolute top-full left-0 mt-2 w-48 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-xl overflow-hidden p-1 z-50">
                                       {['All', 'Review', 'In Progress', 'Completed'].map(tab => (
                                           <button 
                                               key={tab}
                                               onClick={() => {
                                                   setActiveTab(tab);
                                                   setIsFilterOpen(false);
                                               }}
                                               className={`w-full text-right px-4 py-2.5 rounded-lg text-xs font-bold transition-colors mb-0.5 ${activeTab === tab ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10'}`}
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

                           {/* Search */}
                            <div className={`flex items-center transition-all duration-300 ease-out p-1 rounded-xl border ${searchQuery ? 'bg-white dark:bg-white/5 shadow-lg border-amber-100 dark:border-amber-900/30 pr-1 w-64' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 w-10 hover:w-64'}`}>
                                <AnimatePresence>
                                    <div className="flex-1 flex items-center overflow-hidden">
                                        <input 
                                          type="text"
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          placeholder="بحث عن مجلد..."
                                          className={`bg-transparent border-none outline-none text-xs font-bold text-gray-700 dark:text-gray-200 placeholder-gray-400 px-3 h-8 w-full ${!searchQuery ? 'cursor-pointer' : ''}`}
                                        />
                                    </div>
                                </AnimatePresence>
                               <button 
                                 className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${searchQuery ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500' : 'text-gray-400'}`}
                               >
                                   <Search size={16} />
                               </button>
                           </div>

                           {/* Add Folder */}
                           <button 
                             onClick={() => setShowAddFolderModal(true)}
                             className="h-10 px-4 flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-black text-white shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                           >
                               <Plus size={16} />
                               <span className="text-xs font-bold hidden sm:inline">مجلد جديد</span>
                           </button>
                       </div>
                  </div>

                  {/* 3. Grid Area */}
                  <GalleryAlbumsGrid 
                     folders={filteredFolders} 
                     onFolderClick={handleFolderClick}
                     onFolderDrop={handleFolderDrop}
                     onDelete={handleDeleteFolder}
                  />
               </>
              ) : activeFolder && (
                 <SelectionFolderView 
                    theme="manager"
                    folder={activeFolder}
                    items={filteredItems}
                    onBack={handleBackToFolders}
                    onUpload={() => {
                       const input = document.getElementById('manager-upload-input');
                       if (input) input.click();
                    }}
                    onItemClick={(item) => setSelectedPhoto(item)}
                      onRate={(id, rating) => {
                         setPortfolioItems(prev => prev.map(p => p.id === id ? { ...p, rating } : p));
                      }}
                      showRatings={showRatings}
                   />
                )}
          </div>
      </div>

      {/* 4. Manager Lightbox (Replaced by SelectionLightbox) */}
      {selectedImage && (
        isPreviewMode ? (
          <ProLightboxPreview
            isOpen={true}
            onClose={() => setSelectedPhoto(null)}
            image={selectedImage}
            onNext={handleNext}
            onPrev={handlePrev}
            onApprove={handleApprove}
            onReject={handleReject}
            onMaybe={(id) => console.log('Maybe:', id)}
            onRate={(id, rating) => {
               setPortfolioItems(prev => prev.map(p => p.id === id ? { ...p, rating } : p));
            }}
            availableTags={EDITING_TAGS}
            onToggleTag={handleToggleTag}
          />
        ) : (
          <SelectionLightbox 
            theme="manager"
            isOpen={true}
            onClose={() => setSelectedPhoto(null)}
            image={selectedImage}
            onNext={handleNext}
            onPrev={handlePrev}
            onApprove={handleApprove}
            onReject={handleReject}
            onMaybe={(id) => console.log('Maybe:', id)}
            onRate={(id, rating) => {
               setPortfolioItems(prev => prev.map(p => p.id === id ? { ...p, rating } : p));
            }}
            onAddNote={(id, note) => console.log('Note added to', id, note)}
            availableTags={EDITING_TAGS}
            onToggleTag={handleToggleTag}
          />
        )
      )}

      {/* 5. Upload Progress Widget */}
      {uploadQueue.length > 0 && (
         <UploadProgressWidget 
            files={uploadQueue} 
            onClose={() => setUploadQueue([])} 
         />
      )}

      {/* 6. Add Folder Modal */}
      {showAddFolderModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-white/10">
                {/* Header */}
                <div className="bg-gray-50 dark:bg-white/5 px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">إضافة مجلد جديد</h3>
                    <button onClick={() => setShowAddFolderModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Form Fields */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">عنوان المجلد</label>
                        <div className="relative">
                            <FolderPlus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                value={newFolderData.title}
                                onChange={e => setNewFolderData({...newFolderData, title: e.target.value})}
                                placeholder="مثال: حفل زفاف علي ونور"
                                className="w-full h-11 bg-gray-50 dark:bg-black/40 rounded-xl pr-10 pl-4 text-sm focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black/60 dark:text-white text-gray-900 transition-all border border-transparent dark:border-white/5"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">اسم العميل</label>
                        <div className="relative">
                            <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                value={newFolderData.client}
                                onChange={e => setNewFolderData({...newFolderData, client: e.target.value})}
                                placeholder="مثال: علي محمد"
                                className="w-full h-11 bg-gray-50 dark:bg-black/40 rounded-xl pr-10 pl-4 text-sm focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black/60 dark:text-white text-gray-900 transition-all border border-transparent dark:border-white/5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Booking ID */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">رقم الحجز (اختياري)</label>
                            <div className="relative">
                                <Hash size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={newFolderData.bookingId}
                                    onChange={e => setNewFolderData({...newFolderData, bookingId: e.target.value})}
                                    placeholder="#WED-..."
                                    className="w-full h-11 bg-gray-50 dark:bg-black/40 rounded-xl pr-10 pl-4 text-sm focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black/60 dark:text-white text-gray-900 transition-all border border-transparent dark:border-white/5"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">تاريخ الجلسة</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="date" 
                                    value={newFolderData.date}
                                    onChange={e => setNewFolderData({...newFolderData, date: e.target.value})}
                                    className="w-full h-11 bg-gray-50 dark:bg-black/40 rounded-xl pr-10 pl-4 text-sm focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black/60 dark:text-white text-gray-900 transition-all border border-transparent dark:border-white/5 scheme-light dark:scheme-dark"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">نوع الجلسة</label>
                        <div className="relative">
                            <Briefcase size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select 
                                value={newFolderData.category}
                                onChange={e => setNewFolderData({...newFolderData, category: e.target.value})}
                                className="w-full h-11 bg-gray-50 dark:bg-black/40 rounded-xl pr-10 pl-4 text-sm focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-black/60 dark:text-white text-gray-900 transition-all appearance-none border border-transparent dark:border-white/5"
                            >
                                <option value="أعراس">أعراس</option>
                                <option value="مودل">مودل</option>
                                <option value="تخرج">تخرج</option>
                                <option value="إعلاني">إعلاني</option>
                                <option value="حمل">حمل</option>
                                <option value="أطفال">أطفال</option>
                            </select>
                            <ChevronRight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button 
                        onClick={() => setShowAddFolderModal(false)}
                        className="flex-1 h-11 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleCreateFolder}
                        disabled={!newFolderData.title || !newFolderData.client}
                        className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إنشاء المجلد
                    </button>
                </div>
            </div>
        </div>
      )}



    </div>
  );
};

export default ManagerGalleryView;
