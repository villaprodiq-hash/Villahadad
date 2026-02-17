
import React, { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Layers } from 'lucide-react';

interface SmartDropZoneProps {
  bookingId: string;
  currentPath?: string;
  nasStatus?: 'synced' | 'pending' | 'error' | 'none';
  onDropFolder: (paths: string[]) => void;
  progress: number;
}

const SmartDropZone: React.FC<SmartDropZoneProps> = ({ 
  bookingId: _bookingId, 
  currentPath, 
  nasStatus = 'none', 
  onDropFolder,
  progress 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Drag Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle multiple files/folders
      const paths: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (!file) continue;
        // In a real Electron app, file.path gives the full path. 
        // For web mock, we simulate it based on file name.
        const mockPath = `C:/Users/Photographer/Imports/${file.name}`;
        paths.push(mockPath);
      }
      onDropFolder(paths);
    }
  }, [onDropFolder]);

  // Dynamic Styles
  const borderColor = isDragging ? 'border-[#F7931E]' : 'border-white/10';
  const bgColor = isDragging ? 'bg-[#F7931E]/10' : 'bg-black/20';

  return (
    <div className="flex flex-col space-y-3">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">الملفات الخام / مجلدات الجلسة</label>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group border-2 border-dashed ${borderColor} ${bgColor} rounded-2xl p-8 transition-all duration-300 ease-in-out cursor-pointer hover:border-[#F7931E] hover:bg-black/40 hover:scale-[1.01]`}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          
          {/* ICON STATE */}
          {nasStatus === 'synced' ? (
            <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <CheckCircle size={28} />
            </div>
          ) : nasStatus === 'pending' ? (
            <div className="h-14 w-14 rounded-full bg-[#F7931E]/20 flex items-center justify-center text-[#F7931E] animate-pulse shadow-[0_0_15px_rgba(247,147,30,0.3)]">
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : nasStatus === 'error' ? (
            <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertCircle size={28} />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#F7931E] group-hover:bg-[#F7931E]/10 transition-all duration-300">
              {isDragging ? <Layers size={28} className="animate-bounce" /> : <UploadCloud size={28} />}
            </div>
          )}

          {/* TEXT STATE */}
          <div className="space-y-1">
            {nasStatus === 'pending' ? (
              <p className="text-[#F7931E] font-bold">جاري المزامنة مع سيرفر NAS...</p>
            ) : nasStatus === 'synced' ? (
              <p className="text-green-500 font-bold">تم النسخ الاحتياطي بنجاح</p>
            ) : nasStatus === 'error' ? (
              <p className="text-red-500 font-bold">Failed to sync with NAS server. Please try again.</p>
            ) : (
              <p className="text-gray-200 font-bold text-lg">
                {currentPath && currentPath.includes(',') 
                  ? 'تم تحديد مجلدات متعددة' 
                  : (currentPath ? 'استبدال المجلدات' : 'اسحب مجلدات الصور هنا')}
              </p>
            )}
            
            <p className="text-xs text-gray-500">
              {currentPath 
                ? <span className="font-mono bg-black/30 px-2 py-1 rounded text-gray-400" dir="ltr">{currentPath.length > 50 ? currentPath.substring(0, 47) + '...' : currentPath}</span> 
                : "دعم السحب والإفلات المتعدد للمزامنة التلقائية"}
            </p>
          </div>

          {/* PROGRESS BAR */}
          {nasStatus === 'pending' && (
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2 relative">
              <div 
                className="h-full bg-linear-to-l from-[#F7931E] to-[#F9BE70] transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute left-0 top-0 h-full w-2 bg-white/50 blur-[2px]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartDropZone;
