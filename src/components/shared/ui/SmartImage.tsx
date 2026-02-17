import React, { useState, useEffect } from 'react';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailSrc?: string; // Optional low-res or blurhash
  onLoad?: () => void;
  onClick?: () => void;
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt = 'Image', 
  className = '', 
  thumbnailSrc,
  onLoad,
  onClick
}) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'cached' | 'error'>('checking');
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkCache = async () => {
      if (!src) return;
      
      try {
        if (window.electronAPI?.fileSystem) {
           const cachedPath = await window.electronAPI.fileSystem.checkCache?.(src);
           if (mounted) {
             if (cachedPath) {
               setDisplaySrc(cachedPath);
               setStatus('cached');
             } else {
               // Not cached, show thumbnail/placeholder
               setDisplaySrc(thumbnailSrc || null);
               setStatus('idle');
             }
           }
        } else {
          // Fallback for web (or dev without electron)
          setDisplaySrc(src);
          setStatus('cached');
        }
      } catch (err) {
        console.error("SmartImage Check Error:", err);
        if (mounted) setStatus('error');
      }
    };

    checkCache();

    return () => { mounted = false; };
  }, [src, thumbnailSrc]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    setStatus('downloading');
    
    try {
      if (window.electronAPI?.fileSystem) {
        const localPath = await window.electronAPI.fileSystem.cacheImage?.(src);
        if (localPath) {
          setDisplaySrc(localPath);
          setStatus('cached');
          if (onLoad) onLoad();
        } else {
          setStatus('error');
        }
      }
    } catch (err) {
      console.error("SmartImage Download Error:", err);
      setStatus('error');
    }
  };

  return (
    <div 
      className={`relative overflow-hidden bg-gray-900 group ${className}`} 
      onClick={status === 'cached' ? onClick : undefined}
    >
      <AnimatePresence mode='wait'>
        {/* State: Cached (Show Local File) */}
        {status === 'cached' && displaySrc && (
          <motion.img
            key="img-cached"
            src={displaySrc}
            alt={alt}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* State: Idle (Not Cached - Show Thumbnail + Download) */}
        {status === 'idle' && (
          <motion.div
            key="img-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/80 backdrop-blur-sm z-10"
          >
            {/* Background Thumbnail (Blurred) */}
            {thumbnailSrc && (
              <img 
                src={thumbnailSrc} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md" 
                alt="thumbnail" 
              />
            )}
            
            {/* Download Button */}
            <button 
              onClick={handleDownload}
              className="relative z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110 active:scale-95 group-hover:bg-amber-500 group-hover:border-amber-500"
            >
              <Download size={20} />
            </button>
            <span className="relative z-20 mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              تحميل
            </span>
          </motion.div>
        )}

        {/* State: Downloading */}
        {status === 'downloading' && (
           <motion.div
           key="img-loading"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20"
         >
           <Loader2 size={24} className="text-amber-500 animate-spin" />
           <span className="mt-2 text-[10px] font-bold text-amber-500">جاري التحميل...</span>
         </motion.div>
        )}

        {/* State: Checking / Error */}
        {(status === 'checking' || status === 'error') && (
           <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
             {status === 'checking' ? (
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
             ) : (
                <div className="flex flex-col items-center text-red-500">
                   <ImageIcon size={24} />
                   <span className="text-[10px] mt-1">فشل</span>
                </div>
             )}
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartImage;
