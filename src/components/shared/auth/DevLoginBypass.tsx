import React from 'react';
import { UserRole, RoleLabels, User } from '../../../types';
import { Shield, User as UserIcon, Camera, Printer, Film } from 'lucide-react';
import { SyncManager } from '../../../services/sync/SyncManager';

interface DevLoginBypassProps {
  onLogin: (role: UserRole, userId?: string) => void;
  users: User[];
}

export const DevLoginBypass: React.FC<DevLoginBypassProps> = ({ onLogin, users }) => {
  
  // 🔒 SECURITY: Only allow in development mode
  if (import.meta.env.PROD) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-10">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">⚠️ غير متاح في الإنتاج</h1>
          <p className="text-gray-400">هذه الميزة متاحة فقط في وضع التطوير</p>
        </div>
      </div>
    );
  }

  const handleQuickLogin = (role: UserRole, mockName: string) => {
    // Attempt to find real user, fallback to mock
    const user = users.find(u => u.role === role);
    const userId = user ? user.id : `mock_${role}`;
    
    SyncManager.setCurrentUser(userId);
    onLogin(role, userId);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-10 font-sans text-white">
      <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700 max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-2 text-center text-amber-500">⚡ تسجيل دخول سريع (للفحص)</h1>
        <p className="text-gray-400 text-center mb-8">Dev Mode Login Bypass</p>

        <div className="grid grid-cols-2 gap-4">
            
            <button 
                onClick={() => handleQuickLogin(UserRole.MANAGER, 'المديرة')}
                className="p-4 bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-4 transition-all"
            >
                <div className="p-2 bg-white/20 rounded-lg"><Shield size={24} /></div>
                <div className="text-right">
                    <h3 className="font-bold text-lg">المديرة</h3>
                    <p className="text-xs opacity-70">Manager</p>
                </div>
            </button>

            <button 
                onClick={() => handleQuickLogin(UserRole.RECEPTION, 'الرسبشن')}
                className="p-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-4 transition-all"
            >
                <div className="p-2 bg-white/20 rounded-lg"><UserIcon size={24} /></div>
                <div className="text-right">
                    <h3 className="font-bold text-lg">الرسبشن</h3>
                    <p className="text-xs opacity-70">Reception</p>
                </div>
            </button>

            <button 
                onClick={() => handleQuickLogin(UserRole.PHOTO_EDITOR, 'المصور')}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-4 transition-all"
            >
                <div className="p-2 bg-white/20 rounded-lg"><Camera size={24} /></div>
                <div className="text-right">
                    <h3 className="font-bold text-lg">المصور</h3>
                    <p className="text-xs opacity-70">Photo Editor</p>
                </div>
            </button>

            <button 
                onClick={() => handleQuickLogin(UserRole.PRINTER, 'الطباعة')}
                className="p-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-4 transition-all"
            >
                <div className="p-2 bg-white/20 rounded-lg"><Printer size={24} /></div>
                <div className="text-right">
                    <h3 className="font-bold text-lg">الطباعة</h3>
                    <p className="text-xs opacity-70">Printer</p>
                </div>
            </button>
            
             <button 
                onClick={() => handleQuickLogin(UserRole.VIDEO_EDITOR, 'المونتير')}
                className="p-4 bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-4 transition-all"
            >
                <div className="p-2 bg-white/20 rounded-lg"><Film size={24} /></div>
                <div className="text-right">
                    <h3 className="font-bold text-lg">المونتير</h3>
                    <p className="text-xs opacity-70">Video Editor</p>
                </div>
            </button>

        </div>
        
        <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-700 pt-4">
            Test Automation Bypass • Villa Hadad v2
        </div>
      </div>
    </div>
  );
};
