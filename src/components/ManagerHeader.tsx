import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Sparkles, CheckCheck } from 'lucide-react';
import NetworkStatusWidget from './shared/NetworkStatusWidget';
import { AppNotification, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ManagerHeaderProps {
  currentUser?: User;
  notifications?: AppNotification[];
  onMarkAllRead?: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  
  // Effects Props
  isSnowing?: boolean;
  onToggleSnow?: () => void;
  isHeartTrail?: boolean;
  onToggleHeartTrail?: () => void;
}

const ManagerHeader: React.FC<ManagerHeaderProps> = ({ 
  currentUser: _currentUser,
  notifications = [],
  onMarkAllRead,
  isUploading: _isUploading = false,
  uploadProgress: _uploadProgress = 0,
  activeSection,
  onNavigate,
  isSnowing,
  onToggleSnow,
  isHeartTrail,
  onToggleHeartTrail
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEffectsMenu, setShowEffectsMenu] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notifRef = useRef<HTMLDivElement>(null);
  const effectsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (effectsRef.current && !effectsRef.current.contains(event.target as Node)) {
        setShowEffectsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const managerNavItems = [
    { id: 'section-home', label: 'الرئيسية' },
    { id: 'section-my-bookings', label: 'الحجوزات' },
    { id: 'section-clients', label: 'العملاء' },
    { id: 'section-financial', label: 'المالية' },
    { id: 'section-files', label: 'المعرض' },
    { id: 'section-team', label: 'فريق العمل' },
  ];

  return (
     <div className="px-6 pt-6 pb-2 shrink-0 relative z-1001">
      <div className="h-18 bg-white/60 backdrop-blur-3xl rounded-4xl flex items-center justify-between px-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-white/40 ring-1 ring-white/60 relative transition-all duration-300">
      
        {/* Search Icon */}
        <div className={`flex items-center transition-all duration-300 ${isSearchActive ? 'flex-1 max-w-[200px]' : 'w-auto'}`}>
           <div className={`relative flex items-center w-full h-10 rounded-xl transition-all duration-300 ${isSearchActive ? 'bg-white shadow-inner ring-1 ring-black/5' : 'bg-transparent'}`}>
               <button 
                 onClick={() => setIsSearchActive(!isSearchActive)}
                 className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shrink-0 z-10 text-gray-400 hover:text-amber-600 hover:bg-amber-50`}
               >
                 <Search size={20} />
               </button>
               
               <AnimatePresence>
                  {isSearchActive && (
                      <motion.input
                          ref={searchRef}
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: '100%', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          type="text"
                          placeholder="بحث..."
                          value={searchQuery}
                          onChange={(e) => {
                             setSearchQuery(e.target.value);
                             // Broadcast search event for Gallery
                             if (activeSection === 'section-files') {
                                window.dispatchEvent(new CustomEvent('gallery-search', { detail: e.target.value }));
                             }
                          }}
                          onBlur={() => !searchQuery && setIsSearchActive(false)}
                          className="bg-transparent border-none outline-none text-xs text-gray-700 placeholder-gray-400 px-2 w-full h-full font-bold"
                      />
                  )}
               </AnimatePresence>
           </div>
        </div>

        {/* --- Top Navigation (Floating Tabs) --- */}
        <div className="flex-1 flex justify-center px-4">
             <div className="bg-white/40 p-1.5 rounded-2xl flex items-center gap-1 border border-white/60 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                {managerNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative overflow-hidden group
                      ${activeSection === item.id 
                        ? 'bg-linear-to-br from-white to-gray-50 text-amber-600 shadow-sm ring-1 ring-black/5 -translate-y-px' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/40'
                      }
                    `}
                  >
                    {item.label}
                    {activeSection === item.id && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full mb-1 shadow-[0_0_8px_#fbbf24]"></span>
                    )}
                  </button>
                ))}
             </div>
        </div>

        {/* System Icons Group */}
        <div className="flex items-center gap-4">

          {/* Effects Menu */}
          <div className="relative" ref={effectsRef}>
              <button 
                  onClick={() => setShowEffectsMenu(!showEffectsMenu)}
                  className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border 
                    ${showEffectsMenu 
                      ? 'bg-amber-50 text-amber-500 border-amber-200' 
                      : 'bg-white border-white/60 text-gray-400 hover:text-amber-500 shadow-sm ring-1 ring-black/5 hover:bg-amber-50'
                    }`}
              >
                  <Sparkles size={18} />
              </button>
              
              {showEffectsMenu && (
                <div className="absolute top-full left-0 mt-4 w-56 bg-white/90 backdrop-blur-3xl rounded-2xl shadow-2xl ring-1 ring-black/5 border border-white z-1000 p-2 overflow-hidden">
                   <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 border-b border-gray-100">المؤثرات</div>
                   
                   <button onClick={onToggleSnow} className="w-full text-right px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors mb-1">
                       <span className="text-xs font-bold text-gray-700">تساقط الثلوج</span>
                       <div className={`w-8 h-4 rounded-full relative transition-colors ${isSnowing ? 'bg-amber-400' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isSnowing ? 'left-[calc(100%-14px)]' : 'left-0.5'}`} />
                       </div>
                   </button>
                   
                   <button onClick={onToggleHeartTrail} className="w-full text-right px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors mb-2">
                       <span className="text-xs font-bold text-gray-700">تتبع القلوب</span>
                       <div className={`w-8 h-4 rounded-full relative transition-colors ${isHeartTrail ? 'bg-amber-400' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isHeartTrail ? 'left-[calc(100%-14px)]' : 'left-0.5'}`} />
                       </div>
                   </button>
                </div>
              )}
          </div>

          {/* Network Status Widget (includes NAS status) */}
          <NetworkStatusWidget theme="manager" />

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
           <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all relative
                      ${showNotifications 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                        : 'bg-white shadow-sm ring-1 ring-black/5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 border border-white/60'}
                  `}
              >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] rounded-full border border-white"></span>}
              </button>

              <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-4 w-96 bg-white/90 backdrop-blur-3xl shadow-2xl ring-1 ring-black/5 border border-white rounded-2xl z-100000 overflow-hidden flex flex-col origin-top-left"
                >
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-800">الإشعارات</h4>
                          {unreadCount > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">{unreadCount} جديد</span>}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={onMarkAllRead} className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-amber-600 transition-colors bg-white hover:bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                <CheckCheck size={12} />
                                تحديد الكل كمقروء
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div 
                                  key={notif.id} 
                                  className={`group relative p-3 rounded-xl flex gap-4 transition-all duration-200 border border-transparent hover:bg-amber-50/50 ${notif.read ? 'bg-transparent opacity-60 hover:opacity-100' : 'bg-white shadow-sm ring-1 ring-black/5'}`}
                                >
                                    {!notif.read && <div className="absolute right-2 top-2 h-2 w-2 bg-amber-500 rounded-full" />}
                                    
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border border-gray-100 ${notif.read ? 'bg-gray-50 text-gray-400' : 'bg-amber-100 text-amber-600'}`}>
                                        <Bell size={16} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className={`text-xs font-bold ${notif.read ? 'text-gray-400' : 'text-gray-800'}`}>{notif.title}</p>
                                            <span className="text-[9px] text-gray-400 font-mono whitespace-nowrap mr-2">{notif.time}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 group-hover:text-gray-600 transition-colors">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                               <Bell size={20} className="opacity-20" />
                               <p className="text-xs font-medium">لا توجد إشعارات جديدة</p>
                            </div>
                        )}
                    </div>
                </motion.div>
              )}
              </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManagerHeader;
