import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Pause, Play } from 'lucide-react';
import { PortfolioItem } from './GalleryGridWidget';

interface ParallaxSlideshowProps {
  images: PortfolioItem[];
  onClose: () => void;
}

const ParallaxSlideshow: React.FC<ParallaxSlideshowProps> = ({ images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(timer);
  }, [isPlaying, images.length]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Variants for the slide transitions
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.2, // Start slightly zoomed in
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1, // Zoom out to normal (Ken Burns effect handle in animate prop preferably or separate child)
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.1, // Slight zoom on exit
    })
  };

  // Ken Burns Effect (Slow Pan/Zoom) wrapper
  // We apply the slide transition to the container, and the zoom drift to the image inside.
  
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      
      {/* Background Blur (Optional Atmospheric Effect) */}
      <div className="absolute inset-0 opacity-30 blur-3xl scale-110">
          <motion.img 
            key={`bg-${currentIndex}`}
            src={images[currentIndex]?.image} 
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
      </div>

      {/* Main Slide */}
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.5 },
              scale: { duration: 6, ease: "linear" } // This creates the continuous slow zoom effect during the slide's life
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
             <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl">
                <img 
                    src={images[currentIndex]?.image} 
                    alt={images[currentIndex]?.title} 
                    className="w-full h-full object-contain bg-black/50 backdrop-blur-sm"
                />
                
                {/* Caption Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-12 text-white">
                    <motion.h2 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        transition={{ delay: 0.5 }}
                        className="text-4xl font-bold mb-2"
                    >
                        {images[currentIndex]?.title}
                    </motion.h2>
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        transition={{ delay: 0.7 }}
                        className="text-gray-300 text-lg"
                    >
                        {images[currentIndex]?.category} • {images[currentIndex]?.date}
                    </motion.p>
                </div>
             </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute top-8 right-8 z-50 flex gap-4">
         <button onClick={() => setIsPlaying(!isPlaying)} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all">
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
         </button>
         <button onClick={onClose} className="p-4 rounded-full bg-white/10 hover:bg-rose-500/80 text-white backdrop-blur-md transition-all">
            <X size={24} />
         </button>
      </div>

      <button onClick={handleNext} className="absolute right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all z-50">
         <ChevronRight size={40} />
      </button>

      <button onClick={handlePrev} className="absolute left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all z-50">
         <ChevronLeft size={40} />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full z-50">
          <motion.div 
             key={currentIndex}
             initial={{ width: '0%' }}
             animate={{ width: '100%' }}
             transition={{ duration: 5, ease: 'linear' }}
             className={`h-full ${isPlaying ? 'bg-amber-500' : 'bg-gray-500'}`}
          />
      </div>

    </div>
  );
};

export default ParallaxSlideshow;
