
import React, { useState } from 'react';
import { 
  X, Droplet, ChevronRight, ChevronLeft, MessageCircle, LayoutGrid, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../../types';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface PrinterSidebarProps {
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

const PrinterSidebar: React.FC<PrinterSidebarProps> = ({ 
  activeSection, 
  onNavigate, 
  isOpen, 
  onClose,
  isCollapsed,
  toggleCollapse,
  currentUser,
  onLogout,
  onOpenSettings,
  badges
}) => {
  const [hoveredItem, setHoveredItem] = useState<{ id: string, label: string, top: number } | null>(null);
  
  // Theme constants for Printer Role (Emerald/Teal)
  const sidebarBg = 'bg-[#0a0f0d]';
  const borderColor = 'border-white/5';
  const accentGradient = 'bg-linear-to-br from-emerald-500 to-teal-600';
  
  const menuItems = [
    { 
      id: 'section-home', 
      label: 'الرئيسية', 
      icon: LayoutGrid 
    },
    // Queue item removed as per user request (integrated into dashboard)
    // Tasks item removed as per user request (integrated into dashboard)
    { 
      id: 'section-inventory', 
      label: 'المخزون', 
      icon: Droplet 
    },
    { 
      id: 'section-archive', 
      label: 'الأرشيف', 
      icon:  Package
    },
    { 
      id: 'section-team-chat', 
      label: 'الدردشة', 
      icon: MessageCircle 
    },
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

      {/* Hover Tooltip (Desktop) */}
      <AnimatePresence>
        {isCollapsed && hoveredItem && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="fixed right-[80px] z-100 px-3 py-1.5 bg-[#1a201d] text-emerald-100 text-[11px] font-bold rounded-lg shadow-xl border border-emerald-500/20 pointer-events-none whitespace-nowrap"
            style={{ top: hoveredItem.top }}
          >
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-[#1a201d] border-r border-t border-emerald-500/20 rotate-45 -translate-y-1/2" />
            {hoveredItem.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 90 : 200 }} // Slightly wider expanded state for better readability
        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
        className={`
          fixed top-0 right-0 h-screen ${sidebarBg} z-50 
          flex flex-col border-l ${borderColor}
          lg:translate-x-0 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={`absolute -left-3 top-24 z-50 w-6 h-6 rounded-full items-center justify-center shadow-lg transition-all duration-300 border-2 border-[#0a0f0d] hidden lg:flex
            ${isCollapsed 
              ? 'bg-[#1a201d] text-gray-500 translate-x-1.5 hover:translate-x-0 hover:text-emerald-400' 
              : 'bg-emerald-500 text-white hover:scale-110'
            }
          `}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo Area */}
        <div className="h-[100px] flex items-center justify-center shrink-0 relative overflow-hidden mt-4">
           <div className={`flex flex-col items-center gap-3 transition-all duration-300`}>
              <div className={`w-12 h-12 ${accentGradient} rounded-2xl flex items-center justify-center text-white font-bold border-t border-white/20 text-xl shrink-0 shadow-[0_0_25px_rgba(16,185,129,0.3)]`}>
                PR
              </div>
              
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden text-center"
                  >
                    <h1 className="text-sm font-bold text-white tracking-wide">Print Station</h1>
                    <p className="text-[9px] text-gray-500 tracking-widest uppercase">StudioFlow</p>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           
           <button onClick={onClose} className="absolute left-2 top-2 lg:hidden text-gray-400">
             <X size={18} />
           </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-8 space-y-2 custom-scrollbar relative px-4 no-scrollbar">
          {menuItems.filter(item => !currentUser?.preferences?.hiddenSections?.includes(item.id)).map((item) => {
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
                  className={`relative z-10 w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group
                    ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  {/* Active Indicator & Glow */}
                  {isActive && (
                      <motion.div 
                        layoutId="activeGlowPrinter"
                        className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)] -z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                   )}
                   
                   {isActive && !isCollapsed && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-l-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   )}

                  {/* Icon */}
                  <div className={`relative transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    
                    {/* Badge */}
                    {badgeCount > 0 && (
                      <div className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#0a0f0d] shadow-sm z-20">
                        {badgeCount > 9 ? '+9' : badgeCount}
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <AnimatePresence mode='wait'>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`text-sm whitespace-nowrap ${isActive ? 'font-bold text-white' : 'font-medium text-gray-400 group-hover:text-gray-200'}`}
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



        {/* User Profile */}
        <div className="p-4 mt-auto">
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

export default PrinterSidebar;
