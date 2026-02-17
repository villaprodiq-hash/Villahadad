import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Sparkles,
  CheckCheck,
  Calendar,
  CreditCard,
  Info,
  Search,
  ArrowRightCircle,
  Snowflake,
  Heart,
  Moon,
  Star,
} from 'lucide-react';
import { AppNotification, User, UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import NetworkStatusWidget from './shared/NetworkStatusWidget';
import HealthIndicator from './shared/HealthIndicator';
import { healthMonitor } from '../services/health/HealthMonitor';

interface HeaderProps {
  currentUser?: User;
  allUsers?: User[];
  onSwitchUser?: (userId: string) => void;
  onLogout?: () => void;
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
  isRamadan?: boolean;
  onToggleRamadan?: () => void;
  isSparkles?: boolean;
  onToggleSparkles?: () => void;

  // Layout Control Props
  isDraggable?: boolean;
  onToggleDraggable?: () => void;
  onResetLayout?: () => void;
  onExportLayout?: () => void;
  onImportLayout?: () => void;
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications = [],
  onMarkAllRead,
  isSnowing = false,
  onToggleSnow,
  isHeartTrail = false,
  onToggleHeartTrail,
  isRamadan = false,
  onToggleRamadan,
  isSparkles = false,
  onToggleSparkles,
  isDraggable = false,
  onToggleDraggable,
  onResetLayout,
  activeSection,
  onNavigate,
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
    // Start health monitoring for system widgets
    healthMonitor.startMonitoring(30000);

    return () => {
      healthMonitor.stopMonitoring();
    };
  }, []);

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

  useEffect(() => {
    if (isSearchActive && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isSearchActive]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar size={16} className="text-blue-400" />;
      case 'payment':
        return <CreditCard size={16} className="text-green-400" />;
      case 'workflow_reminder':
        return <ArrowRightCircle size={16} className="text-[#F7931E]" />;
      case 'system':
        return <Info size={16} className="text-gray-400" />;
      default:
        return <Bell size={16} className={accentColor} />;
    }
  };

  // Theme detection
  const isReception = currentUser?.role === UserRole.RECEPTION;
  const isManager = currentUser?.role === UserRole.MANAGER;

  const headerBg = isManager
    ? 'bg-white/70 backdrop-blur-xl'
    : isReception
      ? 'bg-[#1A1A1A]'
      : 'bg-[#21242b]';
  const accentColor = isManager
    ? 'text-amber-500'
    : isReception
      ? 'text-[#C94557]'
      : 'text-pink-500';
  const accentBg = isManager ? 'bg-amber-500' : isReception ? 'bg-[#C94557]' : 'bg-pink-500';
  const hoverBg = isManager
    ? 'hover:bg-amber-500/10'
    : isReception
      ? 'hover:bg-[#C94557]/10'
      : 'hover:bg-white/5';
  const managerNavItems = [
    { id: 'section-home', label: 'الرئيسية' },
    { id: 'section-my-bookings', label: 'الحجوزات' },
    { id: 'section-clients', label: 'العملاء' },
    { id: 'section-financial', label: 'المالية' },
    { id: 'section-files', label: 'المعرض' },
    { id: 'section-team', label: 'فريق العمل' },
  ];

  return (
    // الهيدر بتصميم الويدجت العائم (Floating Widget) وباللون الوردي
    <div className="relative px-6 pt-6 pb-2 shrink-0 z-1000">
      <div
        className={`h-18 ${headerBg} rounded-4xl flex items-center justify-between px-6 
        ${
          isManager
            ? 'shadow-[0_10px_30px_rgba(0,0,0,0.04)] border-white ring-1 ring-black/5'
            : `shadow-[8px_8px_16px_#111216,-8px_-8px_16px_#23262e] border ${isReception ? 'border-teal-400/10' : 'border-white/5'}`
        } relative transition-all duration-300`}
      >
        {/* Search Icon (Right side in RTL) */}
        <div
          className={`flex items-center transition-all duration-300 ${isSearchActive ? 'flex-1 max-w-[200px]' : 'w-auto'}`}
        >
          <div
            className={`relative flex items-center w-full h-10 rounded-xl transition-all duration-300 ${isSearchActive ? (isManager ? 'bg-gray-100 shadow-inner' : 'bg-[#1a1c22] shadow-[inset_2px_2px_4px_#16181d,inset_-2px_-2px_4px_#2c3039]') : 'bg-transparent'}`}
          >
            <button
              onClick={() => setIsSearchActive(!isSearchActive)}
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shrink-0 z-10 
                   ${isSearchActive ? accentColor : isManager ? 'text-gray-400 hover:text-gray-800 hover:bg-gray-100' : `text-gray-400 hover:text-white ${hoverBg}`}
                 `}
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
                  onChange={e => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchActive(false)}
                  className={`bg-transparent border-none outline-none text-xs ${isManager ? 'text-gray-800' : 'text-white'} placeholder-gray-400 px-2 w-full h-full font-bold`}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Top Navigation for Manager --- */}
        {isManager && (
          <div className="flex flex-1 justify-center px-4">
            <div className="flex gap-1 items-center p-1 rounded-2xl border border-white ring-1 shadow-sm bg-gray-100/50 ring-black/5">
              {managerNavItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 
                      ${
                        activeSection === item.id
                          ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5 scale-105'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                      }
                    `}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* System Icons Group */}
        <div className="flex gap-4 items-center">
          {/* Effects Menu */}
          <div className="relative" ref={effectsRef}>
            <button
              onClick={() => setShowEffectsMenu(!showEffectsMenu)}
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border 
                    ${
                      showEffectsMenu
                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg'
                        : isSnowing || isHeartTrail || isRamadan || isSparkles
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-[#21242b] border-white/5 text-gray-400 hover:text-white shadow-neu-icon hover:shadow-[inset_2px_2px_4px_#16181d,inset_-2px_-2px_4px_#2c3039]'
                    }`}
            >
              <Sparkles size={18} />
            </button>

            <AnimatePresence>
              {showEffectsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-4 w-64 bg-[#21242b] rounded-2xl shadow-neu-flat border border-white/5 z-100000 p-3 overflow-hidden"
                >
                  {/* Visual Effects Section */}
                  <div className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 border-b border-white/5 flex items-center gap-2">
                    <Sparkles size={12} className="text-amber-500" />
                    أجواء الاستوديو
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={onToggleSnow}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isSnowing ? 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50' : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Snowflake size={20} className="mb-2" />
                      <span className="text-[10px] font-bold">شتاء</span>
                    </button>

                    <button
                      onClick={onToggleHeartTrail}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isHeartTrail ? 'text-pink-400 bg-pink-500/20 border-pink-500/50' : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Heart size={20} className="mb-2" />
                      <span className="text-[10px] font-bold">حب</span>
                    </button>

                    <button
                      onClick={onToggleRamadan}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isRamadan ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50' : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Moon size={20} className="mb-2" />
                      <span className="text-[10px] font-bold">رمضان</span>
                    </button>

                    <button
                      onClick={onToggleSparkles}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isSparkles ? 'text-amber-400 bg-amber-500/20 border-amber-500/50' : 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Star size={20} className="mb-2" />
                      <span className="text-[10px] font-bold">لامع</span>
                    </button>
                  </div>

                  {/* Layout Controls Section - Hidden for RECEPTION */}
                  {!isReception && (
                    <>
                      <div className="px-2 py-2 text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 border-t border-b border-white/5 mt-2">
                        إعدادات المخطط
                      </div>
                      <button
                        onClick={onToggleDraggable}
                        className={`w-full text-right px-3 py-2.5 flex items-center gap-2 hover:bg-white/5 rounded-xl transition-colors mb-1 ${isDraggable ? 'bg-green-500/10' : ''}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${isDraggable ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}
                        >
                          {isDraggable && <CheckCheck size={10} className="text-black" />}
                        </div>
                        <span
                          className={`text-xs font-bold ${isDraggable ? 'text-green-400' : 'text-gray-300'}`}
                        >
                          وضع التعديل
                        </span>
                      </button>
                      <div className="mt-2">
                        <button
                          onClick={onResetLayout}
                          className="w-full text-center px-3 py-2 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors bg-white/5"
                        >
                          إعادة ضبط
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Health Status Indicator */}
          <div className="hidden sm:block">
            <HealthIndicator
              theme={isManager ? 'manager' : isReception ? 'reception' : 'dark'}
              showDetails={true}
            />
          </div>

          {/* Smart Network & Synology Indicator */}
          <div className="hidden sm:block">
            <NetworkStatusWidget theme={isManager ? 'manager' : 'reception'} />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all relative
                      ${
                        showNotifications
                          ? `${accentBg} text-white shadow-lg`
                          : `${isManager ? 'bg-white shadow-sm ring-1 ring-black/5 text-gray-400 hover:text-gray-800 hover:bg-gray-50' : 'bg-[#21242b] text-gray-400 border border-white/5 hover:text-white shadow-neu-icon hover:shadow-[inset_2px_2px_4px_#16181d,inset_-2px_-2px_4px_#2c3039]'}`
                      }
                  `}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className={`absolute top-2 right-2.5 h-2 w-2 ${isManager ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : isReception ? 'bg-teal-400 shadow-[0_0_4px_rgba(255,87,34,0.3)]' : 'bg-teal-400 shadow-[0_0_4px_rgba(236,72,153,0.3)]'} rounded-full border ${isManager ? 'border-white' : 'border-[#21242b]'}`}
                ></span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-full left-0 mt-4 w-96 ${isManager ? 'bg-white shadow-2xl ring-1 ring-black/5' : 'bg-[#21242b] border border-white/5 shadow-neu-flat'} rounded-2xl z-100000 overflow-hidden flex flex-col origin-top-left`}
                >
                  <div
                    className={`p-4 border-b ${isManager ? 'border-gray-100 bg-gray-50/50' : 'border-white/5 bg-[#21242b]'} flex justify-between items-center`}
                  >
                    <div className="flex gap-2 items-center">
                      <h4
                        className={`text-sm font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}
                      >
                        الإشعارات
                      </h4>
                      {unreadCount > 0 && (
                        <span
                          className={`${isManager ? 'text-white bg-amber-500' : 'text-white bg-teal-400'} text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm`}
                        >
                          {unreadCount} جديد
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllRead}
                        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5"
                      >
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
                          onClick={() => {
                            if (notif.type === 'workflow_reminder') {
                              onNavigate('section-workflow');
                              setShowNotifications(false);
                            }
                          }}
                          className={`group relative p-3 rounded-xl flex gap-4 transition-all duration-200 border border-transparent ${isManager ? 'hover:bg-gray-50' : 'hover:border-white/5'} ${notif.read ? 'bg-transparent opacity-60 hover:opacity-100' : isManager ? 'bg-amber-50/50' : 'bg-white/3 hover:bg-white/6 shadow-inner'} ${notif.type === 'workflow_reminder' ? 'cursor-pointer hover:border-[#F7931E]/30 hover:bg-[#F7931E]/5' : ''}`}
                        >
                          {!notif.read && (
                            <div
                              className={`absolute right-2 top-2 h-2 w-2 ${isManager ? 'bg-amber-500' : isReception ? 'bg-teal-400 shadow-[0_0_4px_rgba(255,87,34,0.3)]' : 'bg-teal-400 shadow-[0_0_4px_rgba(236,72,153,0.3)]'} rounded-full`}
                            />
                          )}

                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border border-white/5 ${notif.read ? 'bg-[#1a1c22]' : 'bg-linear-to-br from-[#1a1c22] to-[#2a2d36] shadow-md'} ${notif.type === 'workflow_reminder' ? 'text-[#F7931E] shadow-[0_0_10px_rgba(247,147,30,0.2)]' : ''}`}
                          >
                            {getNotificationIcon(notif.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <p
                                className={`text-xs font-bold ${notif.read ? 'text-gray-400' : 'text-gray-200'}`}
                              >
                                {notif.title}
                              </p>
                              <span className="text-[9px] text-gray-600 font-mono whitespace-nowrap mr-2">
                                {notif.time}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 group-hover:text-gray-400 transition-colors">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col gap-3 justify-center items-center py-12 text-gray-500">
                        <div className="flex justify-center items-center w-12 h-12 text-gray-600 rounded-full shadow-inner bg-white/5">
                          <Bell size={20} className="opacity-50" />
                        </div>
                        <p className="text-xs font-medium">لا توجد إشعارات جديدة</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-white/5 bg-[#21242b]">
                      <button className="w-full py-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">
                        عرض سجل الإشعارات الكامل
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile is in the sidebar */}
        </div>
      </div>
    </div>
  );
};

export default Header;
