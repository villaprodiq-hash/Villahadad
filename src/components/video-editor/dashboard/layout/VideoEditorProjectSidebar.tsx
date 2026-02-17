import React from 'react';
import { 
  Search, Repeat, Folder, FileAudio, FileVideo, ChevronLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Local Shared Components ---

interface PremierePanelProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
}

const PremierePanel = ({ children, className = '', delay = 0, hoverEffect = false }: PremierePanelProps) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.99 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2, delay, ease: "easeOut" }}
    className={`
      bg-[#252526] border border-[#3E3E42] rounded-sm overflow-hidden shadow-none relative
      ${hoverEffect ? 'hover:border-[#3577EF]/50 transition-colors duration-200' : ''}
      ${className}
    `}
  >
    {children}
  </motion.div>
);

const GlassPanel = PremierePanel;

interface FolderItemProps {
  name: string;
  isOpen: boolean;
  onClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

const FolderItem = ({ name, isOpen, onClick, children }: FolderItemProps) => (
  <div className="select-none">
    <div 
      onClick={onClick}
      className={`
        flex items-center gap-2 p-2 rounded-sm cursor-pointer transition-all duration-100
        ${isOpen ? 'bg-[#3577EF] text-white' : 'text-[#AAAAAA] hover:bg-[#3E3E42] hover:text-white'}
      `}
    >
      <Folder size={14} className={isOpen ? 'fill-white text-white' : 'fill-[#666666] text-[#AAAAAA]'} />
      <span className="text-xs font-normal">{name}</span>
      {isOpen ? <ChevronLeft size={12} className="mr-auto -rotate-90 transition-transform" /> : <ChevronLeft size={12} className="mr-auto transition-transform" />}
    </div>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden pr-4 border-r border-white/5 mr-4"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

interface FileItemProps {
  name: string;
  type: 'audio' | 'video';
  duration: string;
  tags?: string[];
}

const FileItem = ({ name, type, duration, tags }: FileItemProps) => (
  <motion.div 
    whileHover={{ x: -4 }}
    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-red-500/5 group"
  >
    <div className={`
      w-6 h-6 rounded-sm flex items-center justify-center shrink-0 border border-[#3E3E42]
      ${type === 'audio' ? 'text-[#3577EF] bg-[#1E1E1E]' : 'text-[#D4D4D4] bg-[#1E1E1E]'}
    `}>
      {type === 'audio' ? <FileAudio size={12} /> : <FileVideo size={12} />}
    </div>
    <div className="flex-1 min-w-0 text-right">
      <p className="text-xs font-medium text-gray-300 group-hover:text-white truncate">{name}</p>
      <div className="flex items-center justify-end gap-2 mt-0.5">
        {tags && tags.map((tag: string) => (
          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">{tag}</span>
        ))}
        <span className="text-[9px] text-gray-600 font-mono">{duration}</span>
      </div>
    </div>
  </motion.div>
);

interface VideoEditorProjectSidebarProps {
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  isConverting: boolean;
  handleTriggerConvert: () => void;
  currentUser?: unknown;
  users?: unknown[];
}

const VideoEditorProjectSidebar: React.FC<VideoEditorProjectSidebarProps> = ({
  expandedFolders,
  toggleFolder,
  isConverting,
  handleTriggerConvert,
  currentUser: _currentUser,
  users: _users
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. Project Context & Info */}
      <GlassPanel className="p-1 shrink-0" hoverEffect>
        <div className="bg-[#252526] p-4 rounded-sm border border-[#3E3E42]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-sm bg-[#3577EF] flex items-center justify-center text-white">
              <FileVideo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#D4D4D4] tracking-normal">أحمد & سارة</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[10px] text-[#888888] font-normal tracking-wide uppercase">قيد المراجعة • V2</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleTriggerConvert}
            disabled={isConverting}
            className="w-full py-2 rounded-sm bg-[#333333] hover:bg-[#3E3E42] border border-[#3E3E42] flex items-center justify-center gap-2 text-[10px] font-normal text-[#CCCCCC] transition-all group overflow-hidden relative"
          >
            <AnimatePresence mode="wait">
              {isConverting ? (
                 <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="flex items-center gap-2"
                 >
                   <div className="w-3 h-3 border-2 border-[#3577EF] border-t-transparent rounded-full animate-spin" />
                   <span>جاري التحويل (M1)...</span>
                 </motion.div>
              ) : (
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="flex items-center gap-2"
                 >
                   <Repeat size={12} className="text-[#3577EF] group-hover:rotate-180 transition-transform duration-500" />
                   <span>تحويل فيديو إلى صوت</span>
                 </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </GlassPanel>

      {/* 2. File Library */}
      <GlassPanel className="flex-1 min-h-0 flex flex-col p-4" delay={0.1}>
         <div className="flex items-center justify-between mb-4 px-2 pt-2">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">ملفات المشروع</h3>
           <Search size={14} className="text-gray-600" />
         </div>
         
         <div className="overflow-y-auto custom-scrollbar pl-2 flex-1 space-y-1">
            <FolderItem 
              name="زفاف_أحمد_وسارة_2024" 
              isOpen={Boolean(expandedFolders['client1'])} 
              onClick={() => toggleFolder('client1')}
            >
              <FolderItem 
                name="🎵 الموسيقى والصوتيات" 
                isOpen={Boolean(expandedFolders['audio'])} 
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFolder('audio'); }}
              >
                <FileItem name="أغنية_الدخول.mp3" type="audio" duration="04:20" tags={[]} />
                <FileItem name="تسجيل_العهود_ماستر.wav" type="audio" duration="09:15" tags={['ماستر']} />
              </FolderItem>

              <FolderItem 
                name="🎬 مقاطع الفيديو" 
                isOpen={Boolean(expandedFolders['clips'])} 
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFolder('clips'); }}
              >
                <FileItem name="CAM_A_Entrance.mov" type="video" duration="12:04" tags={['4K', 'Log']} />
                <FileItem name="Drone_Establish_Sunset.mp4" type="video" duration="00:45" tags={['يحتاج تثبيت']} />
                <FileItem name="Reception_Dance_SlowMo.mov" type="video" duration="03:20" tags={[]} />
                <FileItem name="Cake_Cutting_Main.mp4" type="video" duration="05:10" tags={[]} />
              </FolderItem>
            </FolderItem>
            <FolderItem name="الأصول_المشتركة (شعار)" isOpen={false} onClick={() => {}} />
         </div>
      </GlassPanel>
    </div>
  );
};

export default VideoEditorProjectSidebar;
