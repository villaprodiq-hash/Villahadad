import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import ManagerHeader from './ManagerHeader';

// --- 2. الليآوت الرئيسي (ManagerLayout) ---
interface ManagerLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onNavigate: (section: string) => void;
  currentUser?: User;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenDeletedBookings?: () => void;
  hideHeader?: boolean;
  badges?: any;

}

const ManagerLayout: React.FC<ManagerLayoutProps> = ({
  children,
  activeSection,
  onNavigate,
  currentUser,
  onLogout,
  onOpenSettings,
  onOpenDeletedBookings,
  hideHeader = false,
  badges
}) => {
  // Theme State: 'light' | 'dark' | 'auto'
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    const saved = localStorage.getItem('manager_theme_mode');
    return (saved as 'light' | 'dark' | 'auto') || 'light';
  });

  // Derived isDark state
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      let shouldBeDark = false;
      if (themeMode === 'auto') {
        const hour = new Date().getHours();
        shouldBeDark = hour < 6 || hour >= 18; // Dark between 6 PM and 6 AM
      } else {
        shouldBeDark = themeMode === 'dark';
      }
      setIsDark(shouldBeDark);
      
      // Sync with HTML root for global/portal support
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();
    // Check every minute for auto update
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  const cycleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light';
      localStorage.setItem('manager_theme_mode', next);
      return next;
    });
  };

  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-full`}>
        <div className="h-screen w-full relative bg-linear-to-b from-[#F2E9CE] via-[#F8F9FA] to-white dark:from-[#0f1115] dark:via-[#1a1c22] dark:to-[#0f1115] text-gray-900 dark:text-gray-100 font-sans overflow-hidden flex flex-col transition-colors duration-500">
        
        {/* Glassy Noise Texture & Ambient Orbs */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Noise Overlay */}
            <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            
            {/* Cleaner, more vibrant orbs - No grays */}
            <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-white/40 dark:bg-amber-500/5 rounded-full blur-[120px] mix-blend-overlay animate-pulse-slow"></div>
            <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-amber-50/20 dark:bg-purple-500/5 rounded-full blur-[100px] mix-blend-overlay"></div>
        </div>

        {/* Top Header - Nixtio Style */}
        {!hideHeader && (
            <div className="px-6 pt-2 relative z-50">
            <ManagerHeader 
                activeSection={activeSection} 
                onNavigate={onNavigate} 
                currentUser={currentUser}
                onLogout={onLogout}
                onOpenSettings={onOpenSettings}
                onOpenDeletedBookings={onOpenDeletedBookings}
                badges={badges}
                isDarkMode={isDark}
                themeMode={themeMode}
                toggleTheme={cycleTheme}
            />
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 px-6 pt-2 pb-8 overflow-hidden flex flex-col relative z-10">
            <div className="w-full h-full overflow-y-auto custom-scrollbar rounded-4xl bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-5 pb-0">
            {children}
            </div>
        </main>
        </div>
    </div>
  );
};

export default ManagerLayout;