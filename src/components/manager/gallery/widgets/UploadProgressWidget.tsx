import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, FileImage, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';

export interface UploadFile {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface UploadProgressWidgetProps {
  files: UploadFile[];
  onClose: () => void;
  onMinimize?: () => void;
}

const UploadProgressWidget: React.FC<UploadProgressWidgetProps> = ({ files, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const completedCount = files.filter(f => f.status === 'completed').length;
  const totalCount = files.length;
  const initialProgress = files.length > 0 ? (completedCount / totalCount) * 100 : 0;
  
  // Calculate average progress for the summarized view
  const avgProgress = files.reduce((acc, curr) => acc + curr.progress, 0) / (files.length || 1);
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-6 right-6 z-[2000] font-sans rtl:mr-6 ltr:ml-6" dir="rtl">
      <AnimatePresence mode="wait">
        
        {/* Minimized View (Floating Pill) */}
        {isMinimized ? (
           <motion.div
             key="minimized"
             initial={{ scale: 0.8, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.8, opacity: 0, y: 20 }}
             onClick={() => setIsMinimized(false)}
             className="bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-black transition-colors shadow-2xl relative overflow-hidden group"
           >
              {/* Progress Background */}
              <div 
                  className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-300" 
                  style={{ width: `${avgProgress}%` }}
              />

              {isAllCompleted ? (
                 <CheckCircle2 size={18} className="text-green-500" />
              ) : (
                 <Loader2 size={18} className="text-amber-500 animate-spin" />
              )}
              
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">
                     {isAllCompleted ? 'اكتمل الرفع' : `جاري رفع ${totalCount - completedCount} ملفات...`}
                  </span>
              </div>

              {/* Hover to expand hint */}
              <Maximize2 size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
           </motion.div>
        ) : (
           /* Maximized View (Panel) */
           <motion.div
             key="maximized"
             initial={{ opacity: 0, y: 50, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 50, scale: 0.95 }}
             className="w-80 bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
           >
              {/* Header */}
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-white/5">
                 <div className="flex items-center gap-2">
                    <UploadCloud size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-white">قائمة الرفع</span>
                    <span className="bg-white/10 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-md font-mono">{completedCount}/{totalCount}</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <button 
                       onClick={() => setIsMinimized(true)}
                       className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                       <Minimize2 size={14} />
                    </button>
                    <button 
                       onClick={onClose}
                       className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    >
                       <X size={14} />
                    </button>
                 </div>
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 <AnimatePresence>
                 {files.map((file) => (
                    <motion.div 
                       key={file.id}
                       layout
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="group relative bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 transition-colors overflow-hidden"
                    >
                       {/* Progress Fill Background */}
                       <div 
                          className="absolute bottom-0 left-0 h-0.5 bg-amber-500/50 transition-all duration-300" 
                          style={{ width: `${file.progress}%` }}
                       />

                       <div className="flex items-center gap-3 relative z-10">
                          <div className={`p-2 rounded-lg ${file.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                             {file.status === 'completed' ? <CheckCircle2 size={16} /> : <FileImage size={16} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-1">
                                <p className="text-xs font-medium text-gray-200 truncate pr-2">{file.name}</p>
                                <span className="text-[10px] text-gray-500 font-mono">{file.progress}%</span>
                             </div>
                             
                             {/* Mini Progress Bar */}
                             <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden">
                                <div 
                                   className={`h-full rounded-full transition-all duration-300 ${file.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}`}
                                   style={{ width: `${file.progress}%` }}
                                />
                             </div>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 </AnimatePresence>
              </div>

           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadProgressWidget;
