
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'nas_cleanup' | 'r2_cleanup';
  read: boolean;
  targetRoles?: string[];
  bookingId?: string;
}

const STORAGE_KEY = 'app_notifications';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(() => {
    try {
      const stored: Notification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = (currentUser.role || '').toLowerCase();

      const filtered = stored.filter(n =>
        !n.targetRoles || n.targetRoles.length === 0 || n.targetRoles.includes(userRole)
      );
      setNotifications(filtered);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handler = () => loadNotifications();
    window.addEventListener('app:notification', handler);
    return () => window.removeEventListener('app:notification', handler);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const persistAll = (visibleUpdated: Notification[]) => {
    try {
      const allStored: Notification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedMap = new Map(visibleUpdated.map(n => [n.id, n]));
      const removedIds = new Set(
        notifications.filter(n => !visibleUpdated.some(v => v.id === n.id)).map(n => n.id)
      );

      const merged = allStored
        .filter(n => !removedIds.has(n.id))
        .map(n => updatedMap.get(n.id) || n);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persistAll(updated);
      return updated;
    });
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persistAll(updated);
      return updated;
    });
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      persistAll(updated);
      return updated;
    });
  };

  const formatTime = (time: string) => {
    try {
      const diffMs = Date.now() - new Date(time).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'الآن';
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `منذ ${diffHr} ساعة`;
      return `منذ ${Math.floor(diffHr / 24)} يوم`;
    } catch {
      return time;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      case 'nas_cleanup': return 'bg-orange-500';
      case 'r2_cleanup': return 'bg-sky-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group"
      >
        <Bell size={18} className={`text-gray-400 group-hover:text-white transition-colors`} />

        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-[#1e1e24]">
             <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-80 bg-[#1e1e24] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-left">
             <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                 <h3 className="text-sm font-bold text-white">الإشعارات</h3>
                 {unreadCount > 0 && (
                     <button onClick={handleMarkAllRead} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium">
                         تحديد الكل كمقروء
                     </button>
                 )}
             </div>

             <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                 {notifications.length === 0 ? (
                     <div className="p-8 text-center text-gray-500 text-xs">
                         لا توجد إشعارات جديدة
                     </div>
                 ) : (
                     <div className="divide-y divide-white/5">
                         {notifications.map(notif => (
                             <div
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif.id)}
                                className={`p-4 hover:bg-white/5 transition-colors cursor-pointer relative group ${notif.read ? 'opacity-60' : 'bg-white/2'}`}
                             >
                                 <div className="flex items-start gap-3">
                                     <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${getTypeColor(notif.type)}`} />
                                     <div className="flex-1 min-w-0">
                                         <div className="flex justify-between items-start mb-0.5">
                                             <p className={`text-xs font-bold ${notif.read ? 'text-gray-400' : 'text-white'}`}>{notif.title}</p>
                                             <span className="text-[9px] text-gray-600 font-mono">{formatTime(notif.time)}</span>
                                         </div>
                                         <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{notif.message}</p>
                                     </div>
                                     <button
                                        onClick={(e) => handleDismiss(notif.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-all absolute top-2 left-2"
                                     >
                                         <X size={12} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>

             <div className="p-2 border-t border-white/5 bg-white/5 text-center">
                 <button className="text-[10px] text-gray-400 hover:text-white transition-colors">
                     عرض كل الإشعارات
                 </button>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
