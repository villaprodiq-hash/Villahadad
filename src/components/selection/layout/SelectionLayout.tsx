
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { User } from '../../../types';
import NotificationCenter from '../../shared/NotificationCenter';
import NetworkStatusWidget from '../../shared/NetworkStatusWidget';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface SelectionLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  badges?: Record<string, number>;
}

const SelectionLayout: React.FC<SelectionLayoutProps> = ({
  children,
  currentUser,
  onLogout,
  onOpenSettings,
  badges: _badges
}) => {
  return (
    <div className="flex h-screen w-full bg-[#0a0a0f] overflow-hidden font-sans selection:bg-rose-500/30">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10">

        {/* Header - Dark Theme */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-50" dir="rtl">

           {/* Right: Brand */}
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                  <span className="font-bold text-sm">VH</span>
              </div>
              <div className="flex flex-col justify-center">
                  <span className="font-bold text-white text-sm leading-tight">Villa Hadad</span>
                  <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">قسم الاختيار</span>
              </div>
           </div>

           {/* Center: Search Bar */}
           <div className="absolute left-1/2 -translate-x-1/2 w-80 hidden md:block">
               <div className="relative group" dir="rtl">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-pink-500 transition-colors">
                      <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="بحث..."
                    className="w-full h-9 pr-9 pl-10 bg-zinc-800/60 border border-white/5 rounded-xl text-xs font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-pink-500/30 focus:border-pink-500/30 transition-all"
                  />
                  <div className="absolute inset-y-0 left-2 flex items-center">
                      <span className="text-[9px] font-bold text-zinc-600 bg-zinc-800 border border-white/5 px-1.5 py-0.5 rounded">⌘K</span>
                  </div>
               </div>
           </div>

           {/* Left: Tools & Profile */}
           <div className="flex items-center gap-3">

                <div className="flex items-center gap-1.5 bg-zinc-800/60 py-1 px-2 rounded-xl border border-white/5">
                     <NetworkStatusWidget theme="reception" />
                     <div className="w-px h-4 bg-white/5 mx-0.5"></div>
                     <div className="relative z-50">
                        <NotificationCenter />
                    </div>
               </div>

               {/* Unified Profile with avatar, settings & logout */}
               <div className="relative z-[200]">
                 <ProfileDropdown
                    currentUser={currentUser}
                    onLogout={onLogout}
                    onOpenSettings={onOpenSettings}
                    dropDirection="down"
                 />
               </div>
           </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-hidden p-4 relative">
             <AnimatePresence mode="wait">
                <div className="h-full w-full">
                    {children}
                </div>
             </AnimatePresence>
        </main>

      </div>

    </div>
  );
};

export default SelectionLayout;
