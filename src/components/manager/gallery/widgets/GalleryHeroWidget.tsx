import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortfolioItem } from '../../../selection/widgets/GalleryGridWidget';

interface GalleryHeroWidgetProps {
    items?: PortfolioItem[];
    theme?: 'amber' | 'pink';
}

const GalleryHeroWidget: React.FC<GalleryHeroWidgetProps> = ({ items = [], theme = 'amber' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || items.length === 0) return;
    const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying, items.length]);

  const currentItem = items.length > 0 && isPlaying ? items[currentIndex] : null;

  // Default content if not playing
  const defaultImage = "https://images.unsplash.com/photo-1604017011826-d3b4c23f8914?q=80&w=2070&auto=format&fit=crop";
  const displayImage = currentItem ? currentItem.image : defaultImage;
  const displayTitle = currentItem ? currentItem.title : "أفضل لقطات موسم 2024";
  const displaySubtitle = currentItem ? currentItem.category : "استعراض لأجمل صور الزفاف والمناسبات الخاصة"; 
  // Pink Theme Helper
  const pinkColor = '#F7858A';
  const showPink = theme === 'pink';

  return (
    <div className="relative w-full h-[280px] rounded-3xl overflow-hidden group shadow-2xl shadow-stone-900/10 dark:shadow-black/50 border-2 border-white/60 dark:border-white/10">
      {/* Background Image with Transitions */}
      <AnimatePresence mode='wait'>
          <motion.div 
            key={isPlaying ? currentIndex : 'static'}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img 
              src={displayImage} 
              alt="Hero" 
              className="w-full h-full object-cover"
            />
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          </motion.div>
      </AnimatePresence>
      
      {/* Content Layer */}
      <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row justify-between items-end gap-6 z-10">
        <div className="space-y-3 max-w-2xl">
           <motion.div 
             key={displayTitle}
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="space-y-2"
           >
              <span 
                className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase backdrop-blur-md border border-white/30 shadow-sm ${showPink ? 'bg-[#F7858A] text-white' : 'bg-white/20 text-white'}`}
              >
                {isPlaying ? 'Now Showing' : 'Featured Collection'}
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
                {displayTitle}
              </h1>
              <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-xl font-medium drop-shadow-md">
                {displaySubtitle}
              </p>
           </motion.div>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 text-white`}
             style={{
                 backgroundColor: isPlaying ? (showPink ? pinkColor : '#f59e0b') : 'white',
                 color: isPlaying ? 'white' : 'black'
             }}
           >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              {isPlaying ? 'إيقاف' : 'تشغيل العرض'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryHeroWidget;
