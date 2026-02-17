import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DollarSign, Users, Briefcase, RefreshCw, Bookmark, CheckCircle2, Pause, Play } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';

const ManagerAudioSummaryWidget = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSelectReport = (report: string) => {
    setActiveReport(report);
    setIsPlaying(true);
    setIsSaved(false);
  };

  const handleDone = () => {
    setActiveReport(null);
    setIsPlaying(false);
  };

  return (
    <ManagerDashboardCard className="bg-white/60 dark:bg-[#1a1c22]/60 backdrop-blur-md text-gray-900 dark:text-white overflow-hidden relative min-h-[90px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {!activeReport ? (
          <motion.div 
            key="commands"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold font-tajawal text-amber-500">مركز التقارير</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'fin', label: 'مالية', icon: DollarSign },
                { id: 'team', label: 'فريق', icon: Users },
                { id: 'albums', label: 'ألبومات', icon: Briefcase }
              ].map((btn) => (
                <button 
                  key={btn.id}
                  onClick={() => handleSelectReport(btn.label)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-amber-500/30 transition-all group"
                >
                  <btn.icon size={14} className="text-gray-400 group-hover:text-amber-500" />
                  <span className="text-[11px] font-bold font-tajawal">{btn.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="playback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 shrink-0"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
              <div>
                <h3 className="text-xs font-bold font-tajawal">تقرير: {activeReport}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 100); }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button 
                    onClick={() => setIsSaved(!isSaved)}
                    className={`${isSaved ? 'text-amber-500' : 'text-gray-400 hover:text-white'} transition-colors`}
                  >
                    <Bookmark size={12} fill={isSaved ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={handleDone}
                    className="text-green-500 hover:text-green-400 transition-colors flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded-md"
                  >
                    <CheckCircle2 size={12} />
                    <span className="text-[9px] font-bold font-tajawal">تم</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 h-8 pr-2">
              {[30, 60, 40, 80, 50, 70, 40, 50].map((h, i) => (
                <motion.div 
                  key={i}
                  animate={isPlaying ? { height: [h/2, h, h/2] } : { height: h/2 }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                  className="w-1 bg-linear-to-t from-amber-500/80 to-amber-200/50 rounded-full"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
    </ManagerDashboardCard>
  );
};

export default ManagerAudioSummaryWidget;
