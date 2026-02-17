import React from 'react';
import { User } from '../../../types';
import { LayoutDashboard, MessageSquare } from 'lucide-react';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface VideoEditorSidebarProps {
  currentUser: User;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
  badges?: Record<string, number>;

}

const VideoEditorSidebar: React.FC<VideoEditorSidebarProps> = ({
  currentUser,
  activeTab,
  onNavigate,
  onLogout,
  onOpenSettings,
  badges,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'chat', label: 'الدردشة', icon: MessageSquare },
  ];

  return (
    <div className="w-16 bg-[#252526] border-r border-[#3E3E42] flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center justify-center border-b border-[#3E3E42]">
        <div className="w-10 h-10 rounded-lg bg-[#0078D4] flex items-center justify-center">
          <span className="text-white font-bold text-lg">V</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.filter(item => !currentUser?.preferences?.hiddenSections?.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // Map notifications to sidebar items
          let badgeCount = 0;
          if (badges) {
            if (item.id === 'dashboard') badgeCount = badges['section-projects'] || 0;
            if (item.id === 'chat') badgeCount = badges['section-team-chat'] || 0;
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full h-14 flex flex-col items-center justify-center gap-1 transition-colors relative group ${
                isActive
                  ? 'text-[#0078D4]'
                  : 'text-[#858585] hover:text-white'
              }`}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0078D4]" />
              )}
              <div className="relative">
                <Icon size={20} />
                {badgeCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-[#252526] z-10">
                    {badgeCount > 9 ? '+9' : badgeCount}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>


      {/* User Profile */}
      <div className="mt-auto">
        {currentUser && (
          <ProfileDropdown
            currentUser={currentUser}
            onLogout={onLogout}
            onOpenSettings={onOpenSettings}
            collapsed={true}
            dropDirection="left"
          />
        )}
      </div>
    </div>
  );
};

export default VideoEditorSidebar;
