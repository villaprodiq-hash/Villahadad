import React, { useState } from 'react';
import { 
  LayoutGrid, Image, CheckSquare, Clock, BarChart3, 
  Settings, Layers, Sliders, Zap, Tag, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProfileDropdown from '../../shared/ProfileDropdown';

interface PhotoEditorSidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  currentUser: any;
  onLogout: () => void;

  onOpenSettings?: () => void;
  badges?: any;

}

const PhotoEditorSidebar: React.FC<PhotoEditorSidebarProps> = ({
  activeSection,
  onNavigate,
  isCollapsed,
  toggleCollapse,
  currentUser,
  onLogout,
  onOpenSettings,
  badges
}) => {
  const tools = [
    { id: 'section-home', icon: LayoutGrid, label: 'المهام', tooltip: 'Task List' },
    { id: 'section-quality', icon: CheckSquare, label: 'الجودة', tooltip: 'Quality Check' },
    { id: 'section-stats', icon: BarChart3, label: 'الإحصائيات', tooltip: 'Statistics' },
    { id: 'section-team-chat', icon: MessageCircle, label: 'الدردشة', tooltip: 'Team Chat' },
    { id: 'section-presets', icon: Sliders, label: 'Presets', tooltip: 'Presets' },
  ];

  return (
    <div className="fixed top-0 right-0 h-screen w-14 bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col items-center py-3 z-50">
      {/* Logo */}
      <div className="w-10 h-10 mb-6 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
        PE
      </div>

      {/* Tools */}
      <div className="flex-1 flex flex-col gap-1 w-full px-1">
      {tools.filter(tool => !currentUser?.preferences?.hiddenSections?.includes(tool.id)).map((tool) => {
        const badgeCount = badges ? badges[tool.id] : 0;
        return (
          <button
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            className={`group relative w-full h-12 rounded-lg flex items-center justify-center transition-all ${
              activeSection === tool.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'text-gray-400 hover:bg-[#2d2d2d] hover:text-white'
            }`}
            title={tool.label}
          >
            <div className="relative">
              <tool.icon size={20} />
              {badgeCount > 0 && (
                <div className="absolute -top-2 -right-2 min-w-[14px] h-3.5 px-0.5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#1e1e1e] shadow-sm z-20">
                  {badgeCount > 9 ? '+9' : badgeCount}
                </div>
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl border border-gray-700 z-50">
              {tool.label}
            </div>
          </button>
        );
      })}
      </div>

      {/* Bottom: Unified Profile (avatar + settings + logout) */}
      <div className="flex flex-col gap-1 w-full px-1 mt-auto">
        <div className="w-full px-1">
          {currentUser && (
              <ProfileDropdown
                currentUser={currentUser}
                onLogout={onLogout || (() => {})}
                onOpenSettings={onOpenSettings || (() => {})}
                collapsed={true}
                dropDirection="left"
                minimal={true}
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorSidebar;