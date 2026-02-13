import React from 'react';
import { User, UserRole } from '../../../types';
import { Lock } from 'lucide-react';

interface HoverProfileCardProps {
  user: User;
  onClick: (user: User) => void;
  index: number;
}

// Modern, Vivid Gradients for each role (Fallback/Theme)
const ROLE_THEMES: Record<UserRole, string> = {
  [UserRole.MANAGER]: 'from-violet-600 to-indigo-600',
  [UserRole.RECEPTION]: 'from-pink-600 to-rose-600',
  [UserRole.PHOTO_EDITOR]: 'from-blue-600 to-cyan-600',
  [UserRole.VIDEO_EDITOR]: 'from-amber-600 to-orange-600',
  [UserRole.PRINTER]: 'from-emerald-600 to-teal-600',
  [UserRole.ADMIN]: 'from-gray-700 to-gray-900',
  [UserRole.SELECTOR]: 'from-fuchsia-600 to-purple-600',
};

export const HoverProfileCard: React.FC<HoverProfileCardProps> = ({ user, onClick }) => {
  const isManager = user.role === UserRole.MANAGER;
  const gradient = ROLE_THEMES[user.role] || 'from-gray-600 to-gray-800';
  
  // High-res avatar fallback
  const avatarUrl = user.avatar && user.avatar.length > 10 
    ? user.avatar 
    : `https://ui-avatars.com/api/?name=${user.name}&background=random&size=400&font-size=0.33&bold=true`;

  return (
    <div 
      onClick={() => onClick(user)}
      className="group relative w-64 h-80 rounded-3xl transition-all duration-500 cursor-pointer perspective-1000"
    >
      {/* 1. Glass Container */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:bg-white/10 group-hover:border-white/20 overflow-hidden">
        
        {/* 2. Ambient Glow Background */}
        <div className={`absolute -inset-20 bg-gradient-to-br ${gradient} opacity-20 group-hover:opacity-40 blur-3xl transition-opacity duration-700`} />
        
        {/* 3. Image Container */}
        <div className="relative h-full flex flex-col items-center pt-8 pb-6 px-4">
            {/* Avatar Ring */}
            <div className={`relative w-32 h-32 rounded-full p-1 bg-gradient-to-br ${gradient} mb-6 shadow-lg transition-transform duration-500 group-hover:scale-110`}>
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-black/50 bg-black/50">
                    <img 
                        src={avatarUrl} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.name}&background=random`;
                        }}
                    />
                </div>
                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-black rounded-full shadow-lg" />
            </div>

            {/* Text Info */}
            <div className="text-center w-full z-10">
                <h3 className="text-2xl font-bold text-white mb-1 truncate drop-shadow-md group-hover:text-white transition-colors">
                    {user.name}
                </h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 ${isManager ? 'text-amber-400' : 'text-gray-400'} text-xs font-medium uppercase tracking-wider`}>
                    {isManager && <Lock size={10} />}
                    {user.role}
                </div>
            </div>

            {/* Action Hint (Appears on Hover) */}
            <div className="mt-auto opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
                <span className="text-white/70 text-sm font-medium flex items-center gap-2">
                    تسجيل الدخول <span className="text-xl">→</span>
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};
