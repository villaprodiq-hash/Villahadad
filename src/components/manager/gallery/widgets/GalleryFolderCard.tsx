import React from 'react';
import { Clock, CheckCircle2, AlertCircle, FolderOpen, Upload, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface GalleryFolder {
  id: number;
  title: string;
  client: string;
  coverImage: string;
  imageCount: number;
  status: 'active' | 'completed' | 'urgent';
  progress: number;
  assignedTo: {
    name: string;
    avatar: string;
  };
  lastUpdate: string;
  // Optional properties for extended data
  bookingId?: string;
  category?: string;
  date?: string;
  location?: string;
  price?: number;
  timestamp?: number;
}

interface GalleryFolderCardProps {
  folder: GalleryFolder;
  onClick: () => void;
  onDropFiles?: (files: FileList) => void;
  onDelete?: () => void;
  theme?: 'amber' | 'pink'; // Added theme prop
}

const GalleryFolderCard: React.FC<GalleryFolderCardProps> = ({ folder, onClick, onDropFiles, onDelete, theme = 'amber' }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  
  // Custom Color Palette
  const pinkColor = '#F7858A';

  // Status config
  const statusConfig = {
    active: { 
        color: theme === 'pink' ? 'pink' : 'amber', 
        icon: Clock, 
        label: 'جاري التعديل',
        hex: theme === 'pink' ? pinkColor : '#FBBF25'
    },
    completed: { 
        color: 'green', 
        icon: CheckCircle2, 
        label: 'مكتمل',
        hex: '#22c55e'
    },
    urgent: { 
        color: theme === 'pink' ? 'pink' : 'rose', 
        icon: AlertCircle, 
        label: 'اختيار الصور',
        hex: theme === 'pink' ? pinkColor : '#f43f5e'
    },
  };

  const config = statusConfig[folder.status];
  const StatusIcon = config.icon;
  const mainColor = config.hex;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
       onDropFiles(e.dataTransfer.files);
    }
  };

  // Status Animations
  const statusAnimations = {
    urgent: {
      boxShadow: [
        "0 0 0px rgba(244, 63, 94, 0)",
        "0 0 20px rgba(244, 63, 94, 0.5)",
        "0 0 0px rgba(244, 63, 94, 0)"
      ],
      transition: { duration: 2, repeat: Infinity }
    },
    active: {
       boxShadow: [
        "0 0 0px rgba(251, 191, 37, 0)",
        "0 0 15px rgba(251, 191, 37, 0.3)",
        "0 0 0px rgba(251, 191, 37, 0)"
       ],
       transition: { duration: 3, repeat: Infinity }
    },
    completed: {
      boxShadow: [
        "0 0 0px rgba(34, 197, 94, 0)",
        "0 0 15px rgba(34, 197, 94, 0.3)",
        "0 0 0px rgba(34, 197, 94, 0)"
      ],
      transition: { duration: 4, repeat: Infinity } // Slower, calmer glow
    },
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={statusAnimations[folder.status as keyof typeof statusAnimations]}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full aspect-4/3 cursor-pointer group perspective-1000 rounded-2xl ${folder.status === 'urgent' ? 'ring-2 ring-rose-500/50' : ''}`}
    >
      
      {/* Dragging Overlay - GREEN BORDER for Upload Feedback */}
      {isDragging && (
         <div className="absolute inset-0 z-50 rounded-xl bg-emerald-500/20 backdrop-blur-sm border-2 border-dashed border-emerald-400 flex items-center justify-center">
            <div className="bg-[#0a0a0a]/90 p-4 rounded-xl shadow-2xl animate-bounce">
               <Upload size={32} className="text-emerald-400 mx-auto mb-2" />
               <p className="text-white font-bold text-sm">أفلت الملفات هنا</p>
            </div>
         </div>
      )}

      {/* 1. Back Plate (The Tab Part) - RTL: Tab on Right */}
      <div 
         className="absolute inset-x-0 bottom-0 top-[15%] rounded-t-xl rounded-b-xl border border-white/10 shadow-2xl backdrop-blur-sm transition-colors duration-300"
         style={{ backgroundColor: `${mainColor}4D` }} // 30% opacity
      >
         {/* The Tab */}
         <div 
            className="absolute -top-[15%] right-0 w-2/5 h-[20%] rounded-t-lg border-t border-r border-l border-white/10 transition-colors duration-300" 
            style={{ backgroundColor: `${mainColor}4D` }} // 30% opacity
         />
      </div>

       {/* Delete Button (Visible on Hover) */}
       {onDelete && (
         <button
            onClick={(e) => {
                e.stopPropagation();
                onDelete();
            }}
            className="absolute top-2 left-2 z-50 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 border border-rose-100 dark:border-rose-500/20"
            title="حذف المجلد"
         >
            <Trash2 size={14} />
         </button>
       )}

      {/* 2. Content / Paper (Sticking out) */}
      <div className={`absolute inset-x-4 top-[20%] bottom-4 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm transform transition-all duration-300 overflow-hidden z-10 border border-white/10 ${isDragging ? '-translate-y-8 rotate-0' : 'group-hover:-translate-y-6 group-hover:-rotate-1'}`}>
          <img 
            src={folder.coverImage} 
            alt={folder.title} 
            className="w-full h-full object-cover opacity-90" 
          />
          {/* Status Badge on Paper */}
          <div className="absolute top-2 left-2 flex gap-1 z-20">
             <div className="flex items-center gap-1 text-white px-2 py-0.5 rounded-full shadow-lg" style={{ backgroundColor: mainColor }}>
                  <StatusIcon size={10} />
                  <span className="text-[8px] font-bold">{config.label}</span>
             </div>
          </div>
      </div>

      {/* 3. Front Plate (The Pocket) */}
      <div 
        className={`absolute inset-x-0 bottom-0 top-[35%] backdrop-blur-md rounded-b-xl rounded-tl-2xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t border-white/20 border-b z-20 flex flex-col justify-end p-5 transition-all duration-300 
         ${isDragging ? 'shadow-[0_-5px_35px_rgba(0,0,0,0.5)]' : 'group-hover:shadow-[0_-5px_25px_rgba(0,0,0,0.2)]'}
        `}
        style={{
            background: `linear-gradient(135deg, ${mainColor}EE, ${mainColor}CC)` // Use dynamic color
        }}
      >
         
         {/* Inner Bevel */}
         <div className="absolute top-0 inset-x-0 h-px bg-white/40" />
         
         {/* Folder Icons/Deco */}
         <div className="mb-auto opacity-40 flex justify-end">
            <FolderOpen size={40} className="text-black/20 drop-shadow-sm" strokeWidth={1.5} />
         </div>

         {/* Content Info */}
         <div className="transform translate-y-0 transition-transform duration-300 text-right">
            <h3 className="text-white font-black text-base leading-tight drop-shadow-sm truncate">
               {folder.client}
            </h3>
            <div className="flex items-center justify-between mt-2 flex-row-reverse">
               <p className="text-white/80 text-[10px] font-medium truncate max-w-[60%]">{folder.title}</p>
               <span className="px-1.5 py-0.5 rounded-md bg-black/10 text-white text-[9px] font-bold border border-white/20 backdrop-blur-md font-mono">
                  {folder.imageCount}
               </span>
            </div>
         </div>

         {/* Special Editing Progress for 'Active' (Editing) Status */}
         {folder.status === 'active' ? (
            <div className="absolute bottom-0 inset-x-0 py-2 px-3 bg-black/20 backdrop-blur-md border-t border-white/10">
               <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-white/90 font-medium">نسبة التعديل</span>
                  <span className="text-[9px] text-white/90 font-mono">{folder.progress}%</span>
               </div>
               <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <div 
                     className="h-full shadow-[0_0_10px_rgba(255,255,255,0.6)]" 
                     style={{ width: `${folder.progress}%`, backgroundColor: 'white' }} 
                  />
               </div>
            </div>
         ) : folder.status === 'urgent' ? (
            /* Client Selection Status */
            <div className="absolute bottom-0 inset-x-0 py-2 px-3 bg-rose-500/10 backdrop-blur-md border-t border-white/10">
               <div className="flex justify-center items-center gap-1">
                  <span className="text-[9px] text-white font-bold animate-pulse">بانتظار اختيار الصور...</span>
               </div>
            </div>
         ) : (
            /* Standard Progress Bar for Completed */
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/10">
                <div 
                   className="h-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.5)] float-right" 
                   style={{ width: `${folder.progress}%` }} 
                />
            </div>
         )}
      </div>

    </motion.div>
  );
};

export default React.memo(GalleryFolderCard);
