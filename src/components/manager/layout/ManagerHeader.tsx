import React, { useState, useEffect } from 'react';
import { Settings, Bell, Server, UploadCloud, Moon, Sun, Trash2 } from 'lucide-react';

import { User } from '../../../types'; 
import NetworkStatusWidget from '../../shared/NetworkStatusWidget';
import { offlineManager } from '../../../services/offline/OfflineManager';
import NotificationCenter from '../../shared/NotificationCenter';
import { ConflictNotificationBell } from '../../sync/ConflictNotificationBell';
 

interface ManagerHeaderProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  currentUser?: User;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenDeletedBookings?: () => void;
  badges?: any;
  isDarkMode?: boolean;
  themeMode?: 'light' | 'dark' | 'auto';
  toggleTheme?: () => void;
}

const ManagerHeader: React.FC<ManagerHeaderProps> = ({ activeSection, onNavigate, currentUser, onLogout, onOpenSettings, onOpenDeletedBookings, badges, isDarkMode, themeMode, toggleTheme }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNasDetails, setShowNasDetails] = useState(false);
  


  /* Nav Items Mapping based on App.tsx sections */
  const sections = [
    { id: 'section-home', label: 'الرئيسية' },
    { id: 'section-team', label: 'الفريق' },
    { id: 'section-team-chat', label: 'دردشة الفريق' },
    { id: 'section-clients', label: 'العملاء' },
    { id: 'section-workflow', label: 'سير العمل' },
    { id: 'section-financial', label: 'المالية' },
    { id: 'section-files', label: 'المعرض' },
  ];

  return (
    <header className="flex items-center justify-between mb-2 mt-1">
      <div className="flex items-center gap-6">
        {/* Navigation Pills - Floating Glass Design */}
        <nav className="hidden md:flex items-center gap-1.5 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-4xl p-1.5 pl-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-white/5 ring-1 ring-black/5 dark:ring-white/10 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/90 dark:hover:bg-black/60">
           {/* Decorative Dot */}
           <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-linear-to-tr from-amber-300 to-yellow-500 shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'bg-linear-to-tr from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(251,191,36,0.5)]'} mx-2 animate-pulse`} />
           
          {sections.map((section) => (
            <button 
              key={section.id}
              data-testid={section.id}
              onClick={() => onNavigate(section.id)}
              className={`px-5 py-2.5 rounded-3xl text-sm font-bold font-tajawal transition-all duration-300 relative overflow-hidden group ${
                activeSection === section.id 
                  ? 'text-white dark:text-black shadow-lg shadow-gray-900/20 dark:shadow-amber-500/20' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              {activeSection === section.id && (
                <div className={`absolute inset-0 ${isDarkMode ? 'bg-amber-400' : 'bg-gray-900'} rounded-3xl -z-10`} />
              )}
              {section.label}
              {badges && badges[section.id] ? (
                <span className="absolute top-1.5 left-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm ring-1 ring-white" />
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Side Actions - Premium Look */}
      <div className="flex items-center gap-3">
        
        {/* Theme Toggle - Business Class */}
        {toggleTheme && (
            <button
                onClick={toggleTheme}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border relative group ${
                    isDarkMode 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                    : 'bg-white/70 border-white/40 text-amber-500 hover:bg-white hover:text-amber-600'
                }`}
                title={`الوضع الحالي: ${themeMode === 'auto' ? 'تلقائي (حسب الوقت)' : themeMode === 'dark' ? 'ليلي' : 'نهاري'}`}
            >
                {themeMode === 'auto' && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                )}
                {themeMode === 'light' ? <Sun size={18} /> : themeMode === 'dark' ? <Moon size={18} /> : <Server size={18} className="text-sky-500" />}
                
                {/* Tooltip */}
                <span className="absolute top-full mt-2 right-0 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {themeMode === 'light' && 'نهاري ثابت'}
                    {themeMode === 'dark' && 'ليلي ثابت'}
                    {themeMode === 'auto' && 'تلقائي (مساءً/صباحاً)'}
                </span>
            </button>
        )}

        {/* Connection Status Widget - Replaced with Smart SynologyIndicator */}
        <NetworkStatusWidget theme="manager" />
        
        {/* Conflict Bell */}
        <div className="relative z-50">
            <ConflictNotificationBell managerName={currentUser?.name} />
        </div>

        {/* Deleted Bookings Button */}
        {onOpenDeletedBookings && (
          <button
            onClick={onOpenDeletedBookings}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border relative group ${
              isDarkMode 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                : 'bg-white/70 border-white/40 text-red-500 hover:bg-white hover:text-red-600'
            }`}
            title="سلة المحذوفات"
          >
            <Trash2 size={18} />
            <span className="absolute top-full mt-2 right-0 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              سلة المحذوفات
            </span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative z-50">
           <NotificationCenter />
        </div>
        
        {/* User Avatar & Menu */}
        <div className="flex items-center gap-2 relative">
             {/* <ConnectivityIndicator /> Removed to avoid duplicate Synology status */}
             
             <button 
                data-testid="user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}

                className="w-11 h-11 rounded-full p-0.5 bg-linear-to-tr from-amber-200 to-transparent shadow-sm hover:scale-105 transition-transform"
             >
               <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-800 overflow-hidden relative group">
                  {currentUser?.avatar && currentUser.avatar.startsWith('bg-') ? (
                      <div className={`w-full h-full ${currentUser.avatar} flex items-center justify-center text-white font-bold text-xs`}>
                          {currentUser.name.charAt(0)}
                      </div>
                  ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 font-bold">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </div>
                  )}
               </div>
             </button>

             {showUserMenu && (
                 <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 dark:bg-[#1a1c22]/95 backdrop-blur-3xl shadow-2xl ring-1 ring-black/5 rounded-2xl z-100 p-2 border border-white dark:border-white/5 animate-in slide-in-from-top-2 fade-in">
                     <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 mb-1">
                         <div className={`w-8 h-8 rounded-full ${currentUser?.avatar || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold`}>
                             {currentUser?.name.charAt(0)}
                         </div>
                         <div>
                             <p className="font-bold text-sm text-gray-800 dark:text-white">{currentUser?.name}</p>
                             <p className="text-[10px] text-gray-400 uppercase">{currentUser?.role}</p>
                         </div>
                     </div>
                     <button 
                         onClick={() => { setShowUserMenu(false); if (onOpenSettings) onOpenSettings(); }}
                         className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                     >
                         <Settings size={16} />
                         <span>إعدادات الحساب</span>
                     </button>
                     {/* Add Logout here explicitly if needed, though usually in sidebar */}
                     <button 
                         onClick={() => { setShowUserMenu(false); if (onLogout) onLogout(); }}
                         className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors mt-1"
                     >
                         <Settings size={16} className="rotate-180" /> {/* Using Settings icon as placeholder or any logout icon */}
                         <span>تسجيل خروج</span>
                     </button>
                 </div>
             )}
        </div>
      </div>
    </header>
  );
};

export default ManagerHeader;
