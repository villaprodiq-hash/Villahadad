import React, { ReactNode } from 'react';
import PhotoEditorSidebar from './PhotoEditorSidebar';
import { User, UserRole } from '../../../types';
import ProductionHeader from '../../shared/headers/ProductionHeader';


interface PhotoEditorLayoutProps {
  children: ReactNode;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  badges?: any;

}

const PhotoEditorLayout: React.FC<PhotoEditorLayoutProps> = ({
  children,
  activeSection,
  onNavigate,
  currentUser,
  onLogout,
  onOpenSettings,
  isCollapsed,
  toggleCollapse,
  badges
}) => {
  return (
    <div className="flex h-screen bg-[#1e1e24] overflow-hidden text-gray-200 font-sans selection:bg-rose-500/30" dir="rtl">
       {/* Background Ambience */}
       <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
       </div>

      {/* Photoshop-style Sidebar */}
      <PhotoEditorSidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
        badges={badges}
      />

      {/* Main Workspace */}
      <div 
        className="flex-1 flex flex-col relative z-9"
        style={{ marginRight: isCollapsed ? '60px' : '60px' }} // Fixed spacing for sidebar
      >
        {/* Top Bar - Replaced with Unified ProductionHeader */}
        <ProductionHeader 
            title="تعديل الصور" 
            role={UserRole.PHOTO_EDITOR}
            currentUser={currentUser} 
            onLogout={onLogout}
            onOpenSettings={onOpenSettings}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-[#18181b]/50 relative">
           {/* Inner Shadow / Vignette */}
           <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-10" />
           <div className="h-full w-full relative z-0">
              {children}
           </div>
        </div>

        {/* Bottom Status Bar (like Photoshop) */}
        <div className="h-7 bg-[#25252b] border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-gray-500 font-mono select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Ready</span>
            <span>Server: Connected</span>
          </div>
          <div className="flex items-center gap-4">
             <span>Doc: 1024M/2048M</span>
             <span>Zoom: 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorLayout;
