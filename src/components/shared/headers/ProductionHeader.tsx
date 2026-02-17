
import React from 'react';
import { Layers, ChevronLeft, Image as ImageIcon, Video, Printer } from 'lucide-react';
import { User, UserRole } from '../../../types';
import NotificationCenter from '../NotificationCenter';
import NetworkStatusWidget from '../NetworkStatusWidget';

interface ProductionHeaderProps {
  title?: string;
  currentUser?: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  role: UserRole;
}

const ProductionHeader: React.FC<ProductionHeaderProps> = ({
  title,
  currentUser: _currentUser,
  onLogout: _onLogout,
  onOpenSettings: _onOpenSettings,
  role,
}) => {
  const getIcon = () => {
      switch(role) {
          case UserRole.PHOTO_EDITOR: return <ImageIcon size={16} />;
          case UserRole.VIDEO_EDITOR: return <Video size={16} />;
          case UserRole.PRINTER: return <Printer size={16} />;
          default: return <Layers size={16} />;
      }
  };

  const currentTitle = title || (role === UserRole.PHOTO_EDITOR ? 'تعديل الصور' : role === UserRole.VIDEO_EDITOR ? 'مونتاج الفيديو' : 'الطباعة');

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#1a1c22]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-sm">
             <div className={`p-1.5 rounded-lg text-white ${
                 role === UserRole.PHOTO_EDITOR ? 'bg-purple-500/20 text-purple-400' :
                 role === UserRole.VIDEO_EDITOR ? 'bg-blue-500/20 text-blue-400' :
                 'bg-amber-500/20 text-amber-400'
             }`}>
                 {getIcon()}
             </div>
             <ChevronLeft size={14} className="text-gray-600" />
             <span className="font-bold text-gray-200">{currentTitle}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
            <NetworkStatusWidget theme="reception" />
            <div className="w-px h-4 bg-white/10"></div>
            <NotificationCenter />
        </div>
    </header>
  );
};

export default ProductionHeader;
