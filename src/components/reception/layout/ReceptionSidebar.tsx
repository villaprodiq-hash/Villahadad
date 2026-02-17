import React from 'react';
import { 
  LayoutGrid, CalendarCheck, Users,
  X, ChevronRight, ChevronLeft,
  MessageCircle, SquareKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// ✅ تصحيح المسار
import { User } from '../../../types';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface SidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  currentUser?: User;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  badges?: Record<string, number>;

}

const ReceptionSidebar: React.FC<SidebarProps> = ({ 
  activeSection, onNavigate, isOpen, onClose, isCollapsed, toggleCollapse, currentUser, onLogout, onOpenSettings, badges
}) => {
  const sidebarBg = 'bg-[#1A1A1A]';
  const accentColor = 'text-[#C94557]';

  const menuItems = [
    { id: 'section-home', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'section-my-bookings', label: 'الحجوزات', icon: CalendarCheck },
    { id: 'section-workflow', label: 'سير العمل', icon: SquareKanban },
    { id: 'section-clients', label: 'العملاء', icon: Users },
    { id: 'section-team-chat', label: 'الدردشة', icon: MessageCircle },
  ];

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 90 : 160 }}
        className={`fixed top-0 right-0 h-screen ${sidebarBg} shadow-2xl z-50 flex flex-col border-l border-white/5 lg:translate-x-0 transition-transform duration-300 ease-in-out rounded-l-[2.5rem] ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        <button onClick={toggleCollapse} className={`absolute -left-3 top-24 z-50 w-6 h-6 rounded-full items-center justify-center shadow-lg transition-all duration-300 border-2 border-[#1a1c22] hidden lg:flex ${isCollapsed ? `bg-[#2a2d36] text-gray-500 translate-x-1.5 hover:translate-x-0 hover:${accentColor} hover:text-white` : `${accentColor} text-white hover:scale-110`}`}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-[100px] flex items-center justify-center shrink-0 relative overflow-hidden mt-2">
           <div className={`flex flex-col items-center gap-2 transition-all duration-300`}>
              <div className={`w-10 h-10 bg-linear-to-br from-[#C94557] to-[#B3434F] rounded-full flex items-center justify-center text-white font-bold border-t border-white/20 text-lg shrink-0 shadow-lg`}>SF</div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <h1 className="text-[10px] font-bold text-white tracking-widest uppercase text-center whitespace-nowrap">StudioFlow</h1>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           <button onClick={onClose} className="absolute left-2 top-2 lg:hidden text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar px-2">
          {menuItems.filter(item => !currentUser?.preferences?.hiddenSections?.includes(item.id)).map((item) => {
            const isActive = activeSection === item.id;
            const badgeCount = badges?.[item.id] ?? 0;
            return (
              <div key={item.id} className="relative flex justify-center w-full">
                <button
                  onClick={() => { onNavigate(item.id); if (onClose) onClose(); }}
                  className={`relative z-10 w-full flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-white/5' : 'hover:bg-white/5'} ${isCollapsed ? 'justify-center flex-col gap-1' : 'justify-start'}`}
                >
                  {isActive && !isCollapsed && <motion.div layoutId="activeGlowStandard" className="absolute inset-0 bg-linear-to-r from-pink-500/10 to-transparent rounded-2xl -z-10" />}
                  <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shrink-0 ${isActive ? 'bg-linear-to-br from-[#C94557] to-[#B3434F]' : 'bg-[#2a2d36] group-hover:bg-[#323540]'} border-t border-white/10`}>
                    <item.icon size={18} className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    {badgeCount > 0 && <div className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#21242b] shadow-sm z-20 animate-pulse">{badgeCount > 9 ? '+9' : badgeCount}</div>}
                  </div>
                  <AnimatePresence mode='wait'>
                    {!isCollapsed && (
                      <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={`text-xs whitespace-nowrap ${isActive ? 'font-bold text-white' : 'font-medium text-gray-400 group-hover:text-gray-200'}`}>{item.label}</motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mx-2 mb-4">
          {/* Profile moved to Sidebar Bottom */}
          {currentUser && (
            <ProfileDropdown 
              currentUser={currentUser}
              onLogout={onLogout || (() => {})}
              onOpenSettings={onOpenSettings || (() => {})}
              collapsed={isCollapsed}
              dropDirection="left"
            />
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default ReceptionSidebar;
