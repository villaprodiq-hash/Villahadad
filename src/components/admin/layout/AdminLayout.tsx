
import React, { useState } from 'react';
import {
  Users, Calendar, Package,
  MessageCircle, UserCheck, LayoutDashboard,
  Menu, BarChart3,
  Siren
} from 'lucide-react';
import { User, NotificationCounts } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (section: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onLock: () => void;
  isSidebarCollapsed: boolean;
  badges?: NotificationCounts;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  activeSection, 
  onNavigate, 
  currentUser, 
  onLogout,
  onLock,
  isSidebarCollapsed,
  badges
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Radical Luxury Menu Items (Arabic) - Consolidated
  const menuItems = [
    { id: 'section-home', label: 'مركز القيادة', icon: LayoutDashboard },
    { id: 'section-bookings', label: 'مدير سير العمل', icon: Calendar },
    { id: 'section-clients', label: 'قاعدة العملاء', icon: UserCheck },
    { id: 'section-hr', label: 'إدارة الفريق', icon: Users },
    { id: 'section-sentinel', label: 'مراقبة أداء الموظفين', icon: LayoutDashboard },
    { id: 'section-financial', label: 'الرقابة المالية', icon: BarChart3 },
    { id: 'section-team-chat', label: 'غرفة التواصل', icon: MessageCircle, badge: badges?.chat },
    { id: 'section-inventory', label: 'خزنة المعدات', icon: Package },
    { id: 'section-war-room', label: 'غرفة العمليات', icon: Siren },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#ff6d00]/30 overflow-hidden flex flex-row-reverse relative">

      {/* --- SIDEBAR - Sharp, No Curves --- */}
      <motion.aside
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-[#111111] border-l border-white/[0.06] shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">

            {/* Header: Brand */}
            <div className="p-6 pb-4 text-right border-b border-white/[0.06]">
                <div className="flex items-center justify-end gap-3">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-white leading-none">فيلا حداد</h2>
                        <span className="text-[10px] tracking-[0.2em] text-[#ff6d00] font-bold uppercase">نظام الإشراف</span>
                    </div>
                    <div className="w-10 h-10 bg-[#ff6d00] flex items-center justify-center">
                         <span className="text-xl font-black text-black">V</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 text-right">القوائم الرئيسية</p>
                {menuItems.map((item) => {
                    const isActive = activeSection === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onNavigate(item.id);
                                setMobileMenuOpen(false);
                            }}
                            className={`w-full group relative flex items-center justify-end gap-3 px-3 py-3 transition-all duration-200 text-right ${
                                isActive
                                ? 'bg-[#ff6d00]/10 text-white border-r-2 border-[#ff6d00]'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className={`font-medium tracking-wide text-sm ${isActive ? 'font-bold' : ''}`}>
                                {item.label}
                            </span>

                            <Icon size={18} className={`transition-colors duration-200 ${isActive ? 'text-[#ff6d00]' : 'group-hover:text-[#ff6d00]/70'}`} />

                            {item.badge && item.badge > 0 && (
                                <span className="absolute left-3 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="border-t border-white/[0.06]">
                {currentUser && (
                    <ProfileDropdown
                        currentUser={currentUser}
                        onLogout={onLogout}
                    />
                )}
            </div>

        </div>
      </motion.aside>


      {/* --- MAIN CONTENT WRAPPER --- */}
      <main className={`flex-1 relative z-0 transition-all duration-300 md:mr-72 flex flex-col h-screen overflow-hidden`}>

          {/* Mobile Header Toggle */}
          <div className="md:hidden absolute top-4 right-4 z-50">
                <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-zinc-900 border border-white/10 text-white shadow-lg">
                    <Menu size={24} />
                </button>
          </div>

           {/* Content Area */}
           <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
           </div>

           {/* Mobile Menu Backdrop */}
           {mobileMenuOpen && (
               <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
           )}

      </main>

    </div>
  );
};

export default AdminLayout;
