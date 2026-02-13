import React from 'react';
import { User, UserRole } from '../../../types';
import VideoEditorSidebar from './VideoEditorSidebar';
import ProductionHeader from '../../shared/headers/ProductionHeader';

interface VideoEditorLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  activeTab: string;

  onNavigate: (tab: string) => void;
  badges?: any;

}

const VideoEditorLayout: React.FC<VideoEditorLayoutProps> = ({
  children,
  currentUser,
  onLogout,
  onOpenSettings,
  activeTab,
  onNavigate,
  badges,
}) => {
  return (
    <div className="flex h-screen bg-[#1E1E1E] overflow-hidden">
      {/* Sidebar */}
      <VideoEditorSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onNavigate={onNavigate}
        onLogout={onLogout}
        badges={badges}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ProductionHeader 
            title="مونتاج الفيديو" 
            role={UserRole.VIDEO_EDITOR}
            currentUser={currentUser} 
            onLogout={onLogout}
            onOpenSettings={onOpenSettings}
        />
        {children}
      </div>
    </div>
  );
};

export default VideoEditorLayout;
