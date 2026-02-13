import React from 'react';
import { Filter, Upload, FolderPlus } from 'lucide-react';

interface GalleryFilterBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateNew?: () => void;
}

const GalleryFilterBar: React.FC<GalleryFilterBarProps> = ({ activeTab, onTabChange, onCreateNew }) => {
  return (
    <div className="sticky top-0 z-20 bg-[#050505]/80 backdrop-blur-xl py-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5">
       <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {['All', 'In Progress', 'Review', 'Completed', 'Archive'].map(tab => (
             <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                   ${activeTab === tab 
                      ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(251,191,37,0.4)]' 
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}
                `}
             >
                {/* Translate Tab Label */}
                {tab === 'All' && 'الكل'}
                {tab === 'In Progress' && 'قيد العمل'}
                {tab === 'Review' && 'المراجعة'}
                {tab === 'Completed' && 'مكتمل'}
                {tab === 'Archive' && 'الأرشيف'}
             </button>
          ))}
       </div>
       
       <div className="flex items-center gap-2">
          {/* New Folder (Icon Only) */}
          <button 
             onClick={onCreateNew}
             className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-amber-400 border border-white/5 transition-colors group"
             title="مجلد جديد"
          >
             <FolderPlus size={20} />
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Filter (Icon Only) */}
          <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-colors" title="تصفية">
             <Filter size={20} />
          </button>
          
          {/* Upload (Icon Only) */}
          <button className="p-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]" title="رفع ملفات">
             <Upload size={20} />
          </button>
       </div>
    </div>
  );
};

export default GalleryFilterBar;
