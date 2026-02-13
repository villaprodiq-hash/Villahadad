import React, { useState } from 'react';
import { Server, Wifi, WifiOff, HardDrive, Globe, RefreshCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export type ConnectivityStatus = 'online' | 'syncing' | 'offline' | 'nas_offline';

interface SynologyIndicatorProps {
  status: ConnectivityStatus;
  storageUsed: number; // Percentage (0-100)
  ping: number; // ms
  pendingFiles?: number;
  theme?: 'manager' | 'reception'; // New Theme Prop
}

const SynologyIndicator: React.FC<SynologyIndicatorProps> = ({ 
    status = 'online', 
    storageUsed = 42, 
    ping = 24,
    pendingFiles = 0,
    theme = 'reception' // Default
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Dynamic Theme Colors
  const colors = theme === 'manager' ? {
      online: 'text-emerald-500', 
      onlineBg: 'bg-emerald-500', 
      onlineDot: 'bg-emerald-500',
      offline: 'text-rose-500',
      offlineBg: 'bg-rose-500',
      offlineDot: 'bg-rose-500'
  } : {
      // Reception Theme (Pink/Teal/Dark)
      online: 'text-teal-400', 
      onlineBg: 'bg-teal-400', 
      onlineDot: 'bg-teal-400',
      offline: 'text-pink-500',
      offlineBg: 'bg-pink-500',
      offlineDot: 'bg-pink-500'
  };

  // Status Configurations
  const config = {
      online: {
          icon: Server,
          color: colors.online,
          bgColor: colors.onlineBg,
          label: 'System Online',
          secondaryLabel: 'Synology NAS Connected',
          dotColor: colors.onlineDot,
          ringColor: 'ring-opacity-20'
      },
      syncing: {
          icon: RefreshCcw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          label: 'Syncing Data...',
          secondaryLabel: `${pendingFiles} Files Pending`,
          dotColor: 'bg-blue-500',
          ringColor: 'ring-blue-500/20',
          animatePayload: { rotate: 360 } // Rotation for icon
      },
      offline: {
          icon: WifiOff,
          color: colors.offline,
          bgColor: colors.offlineBg,
          label: 'System Offline',
          secondaryLabel: 'Local Mode Only',
          dotColor: colors.offlineDot,
          ringColor: 'ring-opacity-20'
      },
      nas_offline: {
          icon: HardDrive, // Or ServerOff
          color: 'text-amber-500',
          bgColor: 'bg-amber-500',
          label: 'NAS Unreachable',
          secondaryLabel: 'Internet OK, NAS Down',
          dotColor: 'bg-amber-500',
          ringColor: 'ring-amber-500/20'
      }
  };

   const currentConfig = config[status];
  const Icon = currentConfig.icon;

  return (
    <div className="relative group z-50">
        {/* Trigger Button */}
        <button 
           onClick={() => setIsOpen(!isOpen)}
           onBlur={() => setTimeout(() => setIsOpen(false), 200)}
           className={`
                h-10 px-3 flex items-center gap-3 rounded-full 
                bg-white/80 dark:bg-[#1a1c22] backdrop-blur-md shadow-sm border border-white/50 dark:border-white/10
                hover:shadow-md hover:bg-white dark:hover:bg-[#252830] transition-all duration-300
           `}
        >
            {/* Animated Icon Container */}
            <div className="relative flex items-center justify-center">
                 <motion.div
                    animate={status === 'syncing' ? { rotate: 360 } : {}}
                    transition={status === 'syncing' ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
                    className={`relative z-10 ${currentConfig.color}`}
                 >
                     <Icon size={18} strokeWidth={2.5} />
                 </motion.div>
                 
                 {/* Breathing Glow Effect for Online/Syncing */}
                 {status !== 'offline' && (
                     <div className={`absolute inset-0 rounded-full blur-md opacity-40 animate-pulse ${currentConfig.bgColor}`} />
                 )}
            </div>

            {/* Status Text & Mini Bar (Visible on larger screens) */}
            <div className="hidden sm:flex flex-col items-start min-w-[80px]">
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-gray-500 leading-none mb-1">
                    {status === 'offline' ? 'DISCONNECTED' : 'NAS STATUS'}
                </span>
                
                {/* Mini Connectivity Bar */}
                <div className="flex items-center gap-1.5 w-full">
                     <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor} ${status === 'online' ? 'animate-pulse' : ''}`} />
                     <span className={`text-[10px] font-bold ${currentConfig.color}`}>
                         {status === 'syncing' ? 'Syncing...' : (status === 'online' ? 'Online' : 'Offline')}
                     </span>
                </div>
            </div>
        </button>

        {/* Floating Popover / Tooltip */}
        <AnimatePresence>
            {(isOpen || false) && ( // Using 'false' for hover-only logic if preferred, but click 'isOpen' is safer for touch
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-3 w-72 bg-white/90 dark:bg-[#1a1c22]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-4 ring-1 ring-black/5 origin-top-right overflow-hidden"
                >
                     {/* Header Status */}
                     <div className="flex items-start gap-3 border-b border-gray-100/50 dark:border-white/5 pb-3 mb-3">
                         <div className={`p-2.5 rounded-xl ${currentConfig.bgColor} bg-opacity-10`}>
                             <Icon size={20} className={currentConfig.color} />
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-bold text-gray-900 dark:text-white">{currentConfig.label}</h4>
                             <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{currentConfig.secondaryLabel}</p>
                         </div>
                         <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500`}>
                             {ping}ms
                         </span>
                     </div>

                     {/* Stats Grid */}
                     <div className="space-y-3">
                         {/* Storage Bar */}
                         <div className="space-y-1.5">
                             <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                     <HardDrive size={10} /> Storage
                                 </span>
                                 <span className="text-[10px] font-bold text-gray-700">{storageUsed}% Used</span>
                             </div>
                             <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${storageUsed}%` }}
                                    className={`h-full rounded-full ${storageUsed > 90 ? 'bg-rose-500' : 'bg-slate-700'}`}
                                 />
                             </div>
                         </div>

                         {/* Sync Status */}
                         <div className="space-y-1.5">
                             <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Globe size={10} /> Network
                                 </span>
                                 <span className="text-[10px] font-bold text-emerald-600">Stable</span>
                             </div>
                         </div>
                         
                         {status === 'offline' && (
                             <div className="mt-2 p-2 rounded-lg bg-rose-50 text-[10px] text-rose-600 font-medium leading-relaxed">
                                 Unable to connect to NAS. Working in local cached mode. Changes will sync when online.
                             </div>
                         )}
                     </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default SynologyIndicator;
