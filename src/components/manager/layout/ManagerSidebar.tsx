import React, { useState } from 'react';
import { 
  LayoutGrid, CalendarCheck, Users, DollarSign, Image, 
  SquareKanban, MessageCircle, ChevronRight, ChevronLeft, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../../types';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface ManagerSidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  badges?: Record<string, number>;
}

const ManagerSidebar: React.FC<ManagerSidebarProps> = ({ 
  activeSection, 
  onNavigate, 
  isOpen, 
  onClose,
  isCollapsed,
  toggleCollapse,
  currentUser,
  onLogout,
  onOpenSettings: _onOpenSettings,
  badges
}) => {
  const [hoveredItem, setHoveredItem] = useState<{ id: string, label: string, top: number } | null>(null);

  const menuItems = [
    { id: 'section-home', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'section-my-bookings', label: 'الحجوزات', icon: CalendarCheck },
    { id: 'section-clients', label: 'العملاء', icon: Users },
    { id: 'section-financial', label: 'المالية', icon: DollarSign },
    { id: 'section-accounts', label: 'الحسابات', icon: BookOpen }, // New Accounts Section
    { id: 'section-team', label: 'فريق العمل', icon: MessageCircle },
    { id: 'section-team-chat', label: 'دردشة الفريق', icon: MessageCircle },
    { id: 'section-files', label: 'المعرض', icon: Image },
    { id: 'section-workflow', label: 'سير العمل', icon: SquareKanban },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Hover Tooltip */}
      <AnimatePresence>
        {isCollapsed && hoveredItem && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed right-[80px] z-100 px-3 py-1.5 bg-white text-[#1a1d21] text-[11px] font-bold rounded-lg shadow-xl border border-gray-100 pointer-events-none whitespace-nowrap"
            style={{ top: hoveredItem.top }}
          >
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-white rotate-45 -translate-y-1/2" />
            {hoveredItem.label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 90 : 250 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
        className={`fixed top-0 right-0 h-screen bg-white z-50 
        flex flex-col border-l border-gray-100 shadow-[0_0_50px_rgba(0,0,0,0.05)]
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={`absolute -left-3 top-24 z-50 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border border-gray-200 lg:flex bg-white text-gray-400 hover:text-amber-500`}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo */}
        <div className="h-24 flex items-center justify-center shrink-0 border-b border-gray-50/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-linear-to-br from-amber-400 via-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20">
                 M
               </div>
               <AnimatePresence>
                 {!isCollapsed && (
                   <motion.div
                     initial={{ opacity: 0, width: 0 }}
                     animate={{ opacity: 1, width: 'auto' }}
                     exit={{ opacity: 0, width: 0 }}
                     className="overflow-hidden whitespace-nowrap"
                   >
                     <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-lg tracking-tight">Manager</span>
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase">Dashboard</span>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-2 relative px-4 no-scrollbar">
          {menuItems.filter(item => !(currentUser?.preferences?.hiddenSections || []).includes(item.id)).map((item) => {
            const isActive = activeSection === item.id;
            const badgeCount = badges?.[item.id] ?? 0;

            return (
              <button
                key={item.id}
                data-testid={item.id}
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
                className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? 'bg-amber-50 text-amber-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                  {isActive && !isCollapsed && (
                      <motion.div layoutId="activeTab" className="absolute left-0 w-1 h-8 bg-amber-500 rounded-r-full" />
                  )}

                  <item.icon 
                    size={20} 
                    className={`transition-colors duration-300 ${isActive ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-600'}`} 
                  />
                  
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="font-medium text-sm whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {badgeCount > 0 && !isCollapsed && (
                     <div className="mr-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full">
                        {badgeCount}
                     </div>
                  )}
                  {badgeCount > 0 && isCollapsed && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                  )}
              </button>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto border-t border-gray-100">
          {currentUser && (
            <ProfileDropdown
              currentUser={currentUser}
              onLogout={onLogout}
              collapsed={isCollapsed}
              dropDirection="left"
            />
          )}
        </div>

      </motion.aside>
    </>
  );
};

export default ManagerSidebar;
