
import React from 'react';
import { Home, ChevronLeft } from 'lucide-react';
import { User } from '../../../types';
import NotificationCenter from '../NotificationCenter';
import NetworkStatusWidget from '../NetworkStatusWidget';

interface ReceptionHeaderProps {
  title?: string;
  currentUser?: User;
  onLogout: () => void;
}

const ReceptionHeader: React.FC<ReceptionHeaderProps> = ({
  title = 'الاستقبال',
  currentUser: _currentUser,
  onLogout: _onLogout,
}) => {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#121212]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
        
        {/* Breadcrumbs / Title */}
        <div className="flex items-center gap-3 text-sm">
             <div className="p-1.5 bg-white/5 rounded-lg text-gray-400">
                 <Home size={16} />
             </div>
             <ChevronLeft size={14} className="text-gray-600" />
             <span className="font-bold text-white">{title}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
            <NetworkStatusWidget theme="reception" />
            <div className="w-px h-4 bg-white/10"></div>
            <div className="relative z-50">
                <NotificationCenter />
            </div>
        </div>
    </header>
  );
};

export default ReceptionHeader;
