import React, { useState, ReactNode } from 'react';
import { ShieldAlert, Lock, LogOut } from 'lucide-react';
import { HoverProfileCard } from './HoverProfileCard';
import { User, UserRole } from '../../../types';

// Mock list of demo users to simulate discovery
const DEMO_USERS: User[] = [
  { id: '2', name: 'سُرَى (الإدارة)', role: UserRole.MANAGER },
  { id: '3', name: 'أحمد (الرسبشن)', role: UserRole.RECEPTION },
  { id: '4', name: 'محمد (المصمم)', role: UserRole.PHOTO_EDITOR },
  { id: '5', name: 'علي (المونتير)', role: UserRole.VIDEO_EDITOR },
  { id: '6', name: 'حسن (الطباعة)', role: UserRole.PRINTER },
  { id: '7', name: 'زيد (المشرف)', role: UserRole.ADMIN },
];

interface UnifiedLoginProps {
  allowedRoles: UserRole[];
  appTitle: string;
  targetLayout: ReactNode;
  onLoginSuccess?: (user: User) => void;
}

export const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ 
  allowedRoles, 
  appTitle, 
  targetLayout,
  onLoginSuccess 
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (user: User) => {
    if (allowedRoles.includes(user.role) || user.role === UserRole.ADMIN) {
      setError(null);
      setCurrentUser(user);
      if (onLoginSuccess) onLoginSuccess(user);
    } else {
      setError(`Access Denied: This terminal is for ${appTitle} only.`);
      setCurrentUser(null);
    }
  };

  if (currentUser) {
    return <>{targetLayout}</>;
  }

  return (
    <div className="h-screen bg-[#09090b] flex items-center justify-center p-6 font-sans" dir="rtl">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">{appTitle}</h1>
            <p className="text-gray-500 text-sm">بوابة الدخول الموحدة - VH Suite</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="text-red-500 shrink-0" size={20} />
              <p className="text-red-200 text-xs leading-relaxed font-bold">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 py-4 px-2 overflow-x-auto custom-scrollbar pb-6" dir="ltr">
            {DEMO_USERS.map((user, idx) => (
              <HoverProfileCard
                key={user.id}
                user={user}
                index={idx}
                onClick={handleLogin}
              />
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 font-mono tracking-[0.2em]">VH MICRO-APPS SECURITY LAYER</p>
          </div>
        </div>

        <button 
          onClick={() => window.close()}
          className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>إغلاق المنظومة</span>
        </button>
      </div>
    </div>
  );
};
