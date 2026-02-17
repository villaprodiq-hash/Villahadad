import React from 'react';
import ManagerDashboardCard from './ManagerDashboardCard';
import { useAuth } from '../../../../hooks/useAuth';

const ManagerProfileWidget = () => {
  const { currentUser } = useAuth();

  // Use dynamic data or fallbacks
  const name = currentUser?.name || 'سرى حداد';
  const role = currentUser?.jobTitle || currentUser?.role || 'Manager';
  // Use actual user avatar - syncs with profile photo changes
  const avatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

  // Check if avatar is a CSS class (starts with bg- or content-)
  const isCssAvatar = avatar && (avatar.startsWith('bg-') || avatar.startsWith('content-'));

  return (
    <ManagerDashboardCard noPadding className="h-[250px] p-0 overflow-hidden relative group">
      {/* Full Height Profile Image */}
      <div className="absolute inset-0 w-full h-full">
        {isCssAvatar ? (
          <div className={`w-full h-full ${avatar} flex items-center justify-center text-6xl font-bold text-white/20 transition-all duration-700 group-hover:scale-105`}>
            {name.charAt(0)}
          </div>
        ) : (
          <img 
            src={avatar} 
            alt="Profile" 
            className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
            onError={(e) => {
              // Fallback if image load fails
              e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + name + '&background=random';
            }}
          />
        )}
        {/* Glow / Lighting Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-tr from-amber-400/20 via-transparent to-white/10 mix-blend-overlay" />
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)] blur-2xl" />
        </div>

        {/* Gradient Overlay for Text Visibility */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-70" />
      </div>
      
      {/* Floating Text Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-5 z-10 transition-transform duration-500 group-hover:-translate-y-1">
        <h3 className="text-xl font-bold text-white mb-0.5 drop-shadow-lg">{name}</h3>
        <div className="flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
           <p className="text-xs text-gray-300 font-medium tracking-wide uppercase drop-shadow-md">{role}</p>
        </div>
      </div>
    </ManagerDashboardCard>
  );
};

export default ManagerProfileWidget;
