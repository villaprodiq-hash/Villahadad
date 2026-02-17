import React, { useState } from 'react';
import { 
  LayoutGrid, CalendarCheck, Users, DollarSign, Image, 
  X, ChevronRight, ChevronLeft,
  MessageCircle, Camera, SquareKanban, Siren 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserRole } from '../../../types';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface SidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  isOpen?: boolean; // للموبايل (Overlay)
  onClose?: () => void; // إغلاق الموبايل
  
  // حالة الطي (Desktop) يتم تمريرها من الأب
  isCollapsed: boolean; 
  toggleCollapse: () => void;
  currentUser?: User; // إضافة المستخدم الحالي
  allUsers?: User[]; // قائمة جميع المستخدمين
  onSwitchUser?: (userId: string) => void; // تبديل المستخدم
  onLogout?: () => void; // تسجيل الخروج
  badges?: Record<string, number>; // شارات التنبيه
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onNavigate, 
  isOpen, 
  onClose,
  isCollapsed,
  toggleCollapse,
  currentUser,
  allUsers: _allUsers,
  onSwitchUser: _onSwitchUser,
  onLogout,
  badges
}) => {
  // حالة لتتبع العنصر الذي يتم تمرير الماوس فوقه (للتلميح)
  const [hoveredItem, setHoveredItem] = useState<{ id: string, label: string, top: number } | null>(null);
  
  // Theme detection
  const isReception = currentUser?.role === UserRole.RECEPTION;
  const isManager = currentUser?.role === UserRole.MANAGER;

  const sidebarBg = isManager ? 'bg-[#1a1c22]' : (isReception ? 'bg-[#1A1A1A]' : 'bg-[#21242b]');
  const accentColor = isManager ? 'text-amber-500' : (isReception ? 'text-[#C94557]' : 'text-pink-500');
  
  // تعريف العناصر مع الصلاحيات (allowedRoles)
  // إذا كانت القائمة فارغة [] تعني متاحة للكل
  const menuItems = [
    { 
      id: 'section-home', 
      label: 'الرئيسية', 
      icon: LayoutGrid, 
      allowedRoles: [] // للجميع
    },
    { 
      id: 'section-my-bookings', 
      label: 'الحجوزات', 
      icon: CalendarCheck, 
      allowedRoles: [] // للجميع
    },
    { 
      id: 'section-workflow', 
      label: 'سير العمل', 
      icon: SquareKanban, 
      allowedRoles: [UserRole.RECEPTION] 
    },
    { 
      id: 'section-clients', 
      label: 'العملاء', 
      icon: Users, 
      allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.RECEPTION] 
    },
    { 
      id: 'section-financial', 
      label: 'المالية', 
      icon: DollarSign, 
      allowedRoles: [UserRole.MANAGER, UserRole.ADMIN]
    },
    { 
      id: 'section-files', 
      label: 'المعرض', 
      icon: Image, 
      allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.PHOTO_EDITOR, UserRole.VIDEO_EDITOR] // Manager has full access
    },
    { 
      id: 'section-team', 
      label: 'فريق العمل', 
      icon: MessageCircle, 
      allowedRoles: [UserRole.MANAGER, UserRole.ADMIN, UserRole.RECEPTION]
    },
    { 
      id: 'section-team-chat', 
      label: 'الدردشة', 
      icon: MessageCircle, 
      allowedRoles: [UserRole.ADMIN, UserRole.MANAGER]
    },
    { 
      id: 'section-inventory', 
      label: 'المخزون', 
      icon: Camera, 
      allowedRoles: [UserRole.ADMIN] // Admin only
    },
    { 
      id: 'section-war-room', 
      label: 'غرفة العمليات', 
      icon: Siren, 
      allowedRoles: [UserRole.ADMIN] // Admin only
    },
  ];

  // دالة للتحقق من الصلاحية
  const hasPermission = (allowedRoles: UserRole[]) => {
    if (!currentUser) return false;
    if (allowedRoles.length === 0) return true; // متاح للكل
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Hover Tooltip (Fixed Position) */}
      <AnimatePresence>
        {isCollapsed && hoveredItem && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed right-[80px] z-100 px-3 py-1.5 bg-white text-[#21242b] text-[11px] font-bold rounded-lg shadow-xl border border-gray-200 pointer-events-none whitespace-nowrap"
            style={{ top: hoveredItem.top }}
          >
            {/* Arrow */}
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-white rotate-45 -translate-y-1/2" />
            {hoveredItem.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isCollapsed ? 90 : 160,
        }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
        className={`fixed top-0 right-0 h-screen ${sidebarBg} ${isManager ? '' : 'shadow-2xl'} z-50 
        flex flex-col border-l ${isManager ? 'border-amber-500/20' : isReception ? 'border-teal-400/10' : 'border-white/5'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        rounded-l-[2.5rem] 
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* زر الطي (Toggle Button) */}
        <button
          onClick={toggleCollapse}
          className={`absolute -left-3 top-24 z-50 w-6 h-6 rounded-full items-center justify-center shadow-lg transition-all duration-300 border-2 border-[#1a1c22] hidden lg:flex
            ${isCollapsed 
              ? `bg-[#2a2d36] text-gray-500 translate-x-1.5 hover:translate-x-0 hover:${isManager ? 'text-amber-500' : accentColor} hover:text-white shadow-md` 
              : `${isManager ? 'bg-amber-500' : accentColor} text-white hover:scale-110`
            }
          `}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* منطقة الشعار */}
        <div className="h-[100px] flex items-center justify-center shrink-0 relative overflow-hidden mt-2">
           <div className={`flex flex-col items-center gap-2 transition-all duration-300`}>
              {/* 3D Logo */}
              <div className={`w-10 h-10 ${isManager ? 'bg-linear-to-br from-amber-400 via-amber-500 to-orange-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : isReception ? 'bg-linear-to-br from-[#C94557] to-[#B3434F] shadow-[0_4px_10px_rgba(238,92,108,0.12)]' : 'bg-linear-to-br from-pink-500 to-purple-600 shadow-[0_4px_10px_rgba(236,72,153,0.4)]'} rounded-xl flex items-center justify-center text-white font-bold border-t border-white/20 text-lg shrink-0`}>
                SF
              </div>
              
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <h1 className="text-[10px] font-bold text-white tracking-widest uppercase text-center whitespace-nowrap">StudioFlow</h1>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           
           <button onClick={onClose} className="absolute left-2 top-2 lg:hidden text-gray-400">
             <X size={18} />
           </button>
        </div>

        {/* عناصر القائمة */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-3 custom-scrollbar relative px-2 no-scrollbar">
          
          {menuItems.filter(item => !currentUser?.preferences?.hiddenSections?.includes(item.id)).map((item) => {
            // التحقق من صلاحية المستخدم لرؤية هذا العنصر
            if (!hasPermission(item.allowedRoles)) return null;

            const isActive = activeSection === item.id;
            const badgeCount = badges?.[item.id] ?? 0;

            return (
              <div key={item.id} className="relative flex justify-center w-full">
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    if (onClose) onClose();
                  }}
                  onMouseEnter={(e) => {
                    if (isCollapsed) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem({ id: item.id, label: item.label, top: rect.top + (rect.height / 2) - 15 });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative z-10 w-full flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 group
                    ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
                    ${isCollapsed ? 'justify-center flex-col gap-1' : 'justify-start'}
                  `}
                >
                  {/* الخلفية المضيئة للعنصر النشط */}
                  {isActive && !isCollapsed && (
                     <motion.div 
                       layoutId="activeGlow"
                       className={`absolute inset-0 ${isManager ? 'bg-linear-to-r from-orange-500/10' : isReception ? 'bg-linear-to-r from-pink-500/10' : 'bg-linear-to-r from-pink-500/10'} to-transparent rounded-2xl -z-10`}
                     />
                  )}

                  {/* حاوية الأيقونة 3D */}
                  <div className={`
                      relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shrink-0
                      ${
                        isManager
                        ? 'bg-linear-to-br from-amber-400 via-amber-500 to-orange-600'
                        : isReception 
                          ? 'bg-linear-to-br from-[#C94557] to-[#B3434F] shadow-[0_4px_10px_rgba(238,92,108,0.15)] -translate-y-px'
                          : 'bg-linear-to-br from-pink-500 to-purple-600 shadow-[0_4px_10px_rgba(236,72,153,0.5)] -translate-y-px'
                      }
                      ${!isManager && !isReception ? 'group-hover:bg-[#323540]' : ''}
                    border-t border-white/10
                  `}>
                    <item.icon 
                      size={18} 
                      className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} 
                    />
                    
                    {/* Badge Notification */}
                    {badgeCount > 0 && (
                      <div className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#21242b] shadow-sm z-20 animate-pulse">
                        {badgeCount > 9 ? '+9' : badgeCount}
                      </div>
                    )}
                  </div>
                  
                  {/* النص */}
                  <AnimatePresence mode='wait'>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`text-xs whitespace-nowrap ${isActive ? 'font-bold text-white' : 'font-medium text-gray-400 group-hover:text-gray-200'}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer actions - Profile */}
        <div className="p-2 mx-2 mb-4 space-y-1 relative">
           {currentUser && (
            <ProfileDropdown 
              currentUser={currentUser}
              onLogout={onLogout || (() => {})}
              onOpenSettings={() => {}} // Admin doesn't have settings specific yet
              collapsed={isCollapsed}
              dropDirection="left"
            />
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
