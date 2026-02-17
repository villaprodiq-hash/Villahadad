
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Aperture, Sparkles } from 'lucide-react';

interface WelcomeIntroProps {
  onEnter: () => void;
}

const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onEnter }) => {
  
  const containerVariants = {
    exit: {
      y: '-100%',
      transition: {
        duration: 0.8,
        ease: [0.76, 0, 0.24, 1] as [number, number, number, number]
      }
    }
  };

  const blobVariants = {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 90, 0],
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 10,
        repeat: Infinity,
        ease: "linear" as const
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-9999 bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans"
      variants={containerVariants}
      exit="exit"
    >
      {/* --- Animated Background Layers --- */}
      
      {/* 1. Deep Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pink Blob */}
        <motion.div 
          variants={blobVariants}
          animate="animate"
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-pink-600/20 rounded-full blur-[120px]"
        />
        {/* Purple Blob */}
        <motion.div 
          variants={blobVariants}
          animate="animate"
          transition={{ duration: 15, delay: 2 }}
          className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-purple-700/20 rounded-full blur-[100px]"
        />
        {/* Orange/Accent Blob */}
        <motion.div 
          variants={blobVariants}
          animate="animate"
          transition={{ duration: 12, delay: 5 }}
          className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] bg-[#F7931E]/10 rounded-full blur-[100px]"
        />
      </div>

      {/* 2. Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
        }}
      />

      {/* 3. Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050505]/50 to-[#050505] pointer-events-none" />

      {/* --- Content --- */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        
        {/* Floating Icon/Logo */}
        <motion.div 
          variants={floatingVariants}
          animate="animate"
          className="mb-8 relative"
        >
            <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-20 rounded-full" />
            <div className="relative w-24 h-24 bg-linear-to-br from-[#21242b] to-[#000] rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center">
                <Aperture size={48} className="text-white" strokeWidth={1.5} />
                <div className="absolute top-0 right-0 p-2">
                    <Sparkles size={16} className="text-[#F7931E] animate-pulse" />
                </div>
            </div>
        </motion.div>

        {/* Title & Subtitle */}
        <div className="space-y-4 mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-b from-white via-white to-white/40 tracking-tighter"
            >
              VILLA HADAD
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-gray-400 text-sm md:text-base font-light tracking-[0.2em] uppercase"
            >
              Professional Studio Management
            </motion.p>
        </div>

        {/* Action Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEnter}
          className="group relative px-10 py-4 bg-white text-black rounded-full font-bold text-sm tracking-widest uppercase flex items-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
        >
          <span className="relative z-10">Start Dashboard</span>
          <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
          
          {/* Shine Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/80 to-transparent z-0 opacity-50" />
        </motion.button>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-[-15vh] flex gap-8 text-xs text-gray-600 font-mono"
        >
            <span>v2.5.0</span>
            <span>SECURE SYSTEM</span>
            <span>LOCAL SERVER</span>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default WelcomeIntro;
