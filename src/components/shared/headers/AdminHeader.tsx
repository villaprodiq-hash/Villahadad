
import React from 'react';
import { ShieldAlert, Activity, Cpu } from 'lucide-react';
import { User } from '../../../types';
import NotificationCenter from '../NotificationCenter';
import NetworkStatusWidget from '../NetworkStatusWidget';

interface AdminHeaderProps {
  title?: string;
  currentUser?: User;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  title: _title = 'لوحة القيادة',
  currentUser: _currentUser,
  onLogout: _onLogout,
  onOpenSettings: _onOpenSettings,
}) => {
  return (
     <header className="h-16 border-b border-cyan-500/10 bg-[#0B0E14]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <NetworkStatusWidget theme="admin" />
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-2"><Cpu size={12}/> المعالج: 12%</span>
                <span className="flex items-center gap-2"><Activity size={12}/> العمليات: 2,420/s</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="text-left font-mono border-l border-white/10 pl-4">
                <p className="text-white text-sm font-bold tracking-tighter">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-cyan-400/50 text-[8px] uppercase tracking-[.3em] font-black">SYSTEM TIME</p>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 animate-pulse cursor-pointer">
                <ShieldAlert size={18} />
            </div>
        </div>
    </header>
  );
};

export default AdminHeader;
