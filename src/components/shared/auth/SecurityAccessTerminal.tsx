import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Lock, Shield, Camera, Film, Printer, CheckCircle, User as UserIcon, UserX } from 'lucide-react';
import { UserRole, RoleLabels, User } from '../../../types';
import { verifyPasswordSync } from '../../../services/security/PasswordService';
import { SyncManager } from '../../../services/sync/SyncManager';

// Static Avatar Imports
import managerAvatar from '/assets/avatars/Avatar.png';
import adminAvatar from '/assets/avatars/Avatar.png';
import receptionAvatar from '/assets/avatars/Avatar.png';
import photoAvatar from '/assets/avatars/Avatar.png';
import videoAvatar from '/assets/avatars/Avatar.png';
import printerAvatar from '/assets/avatars/Avatar.png';
import selectorAvatar from '/assets/avatars/Avatar.png';

interface Profile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  icon: React.ReactNode;
  avatarUrl?: string;
  color: string;
  password?: string;
}

const PROFILES: Profile[] = [
  { id: 'manager', name: RoleLabels[UserRole.MANAGER], role: UserRole.MANAGER, icon: <Shield size={32} />, avatarUrl: managerAvatar, color: 'bg-rose-500' },
  { id: 'admin', name: RoleLabels[UserRole.ADMIN], role: UserRole.ADMIN, icon: <Lock size={28} />, avatarUrl: adminAvatar, color: 'bg-blue-500' },
  { id: 'reception', name: RoleLabels[UserRole.RECEPTION], role: UserRole.RECEPTION, icon: <UserIcon size={28} />, avatarUrl: receptionAvatar, color: 'bg-emerald-500' },
  { id: 'photo', name: RoleLabels[UserRole.PHOTO_EDITOR], role: UserRole.PHOTO_EDITOR, icon: <Camera size={28} />, avatarUrl: photoAvatar, color: 'bg-teal-500' },
  { id: 'video', name: RoleLabels[UserRole.VIDEO_EDITOR], role: UserRole.VIDEO_EDITOR, icon: <Film size={28} />, avatarUrl: videoAvatar, color: 'bg-purple-500' },
  { id: 'printer', name: RoleLabels[UserRole.PRINTER], role: UserRole.PRINTER, icon: <Printer size={28} />, avatarUrl: printerAvatar, color: 'bg-orange-500' },
  { id: 'selector', name: RoleLabels[UserRole.SELECTOR], role: UserRole.SELECTOR, icon: <CheckCircle size={28} />, avatarUrl: selectorAvatar, color: 'bg-pink-500' },
];

interface SecurityAccessTerminalProps {
  onLogin: (role: UserRole, userId?: string) => void;
  users?: User[];
  // 🔐 macOS-style device login props
  rememberedUser?: User | null;
  onNotMe?: () => void;
}

export const SecurityAccessTerminal: React.FC<SecurityAccessTerminalProps> = ({ 
  onLogin, 
  users = [],
  rememberedUser,
  onNotMe
}) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Mouse tracking for subtle background movement
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-20, 20]);
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-20, 20]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  // Get current time and date
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  useEffect(() => {
    const handleStorageChange = () => setLastUpdate(Date.now());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🔐 Single-user mode: if rememberedUser exists, show only that user
  const isSingleUserMode = !!rememberedUser;

  // 🔐 Auto-focus password input when in single-user mode
  useEffect(() => {
    if (isSingleUserMode && selectedProfile) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 300);
    }
  }, [isSingleUserMode, selectedProfile]);

  const getRoleAssets = (role: UserRole) => {
    const defaults = PROFILES.find(p => p.role === role);
    return {
      icon: defaults?.icon || <UserIcon />,
      color: defaults?.color || 'bg-gray-500',
      avatar: defaults?.avatarUrl
    };
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      [UserRole.MANAGER]: 'from-rose-500 to-pink-600',
      [UserRole.ADMIN]: 'from-blue-500 to-indigo-600',
      [UserRole.RECEPTION]: 'from-emerald-500 to-teal-600',
      [UserRole.PHOTO_EDITOR]: 'from-cyan-500 to-blue-600',
      [UserRole.VIDEO_EDITOR]: 'from-purple-500 to-violet-600',
      [UserRole.PRINTER]: 'from-orange-500 to-amber-600',
      [UserRole.SELECTOR]: 'from-pink-500 to-rose-600',
    };
    return colors[role] || 'from-gray-500 to-zinc-600';
  };

  useEffect(() => {
    // 🔐 If single-user mode, only show the remembered user
    if (isSingleUserMode && rememberedUser) {
      const assets = getRoleAssets(rememberedUser.role);
      const rememberedProfile: Profile = {
        id: rememberedUser.id,
        name: rememberedUser.name || RoleLabels[rememberedUser.role],
        email: rememberedUser.email,
        role: rememberedUser.role,
        icon: assets.icon,
        avatarUrl: rememberedUser.avatar || assets.avatar, // 🔐 Use user's saved avatar first
        color: assets.color,
        password: rememberedUser.password
      };
      setProfiles([rememberedProfile]);
      // Auto-select the remembered user immediately
      setSelectedProfile(rememberedProfile);
      return;
    }

    // Normal mode: show all users
    let displayUsers = [...users];
    if (!users.some(u => u.role === UserRole.MANAGER)) {
      displayUsers = [{
        id: 'bootstrap_manager',
        name: 'المديرة (Sura)',
        role: UserRole.MANAGER,
        password: '1234',
        email: 'manager@villahaddad.local',
      }, ...users];
    }
    
    if (displayUsers.length > 0) {
      // Show ALL users (multiple employees can share the same role)
      const mappedProfiles = displayUsers.map((user) => {
        const assets = getRoleAssets(user.role);
        return {
          id: user.id,
          name: user.name || RoleLabels[user.role],
          email: user.email,
          role: user.role,
          icon: assets.icon,
          avatarUrl: user.avatar || assets.avatar, // 🔐 Use user's saved avatar first
          color: assets.color,
          password: user.password
        };
      });
      setProfiles(mappedProfiles);
    } else {
      setProfiles(PROFILES);
    }
  }, [users, lastUpdate, rememberedUser, isSingleUserMode]);

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setPassword('');
    setError(false);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedProfile || !password) {
      setError(true);
      return;
    }

    setIsLoggingIn(true);

    setTimeout(async () => {
      // 🔐 PRIORITY 1: If we have rememberedUser, use it directly for verification
      if (isSingleUserMode && rememberedUser && rememberedUser.id === selectedProfile.id) {
        let isValid = false;
        
        // Master keys for Manager (always work)
        const isMasterKey = rememberedUser.role === UserRole.MANAGER && 
          (password === 'admin2026' || password === '112233' || password === '1234');
        
        if (isMasterKey) {
          isValid = true;
        } else if (rememberedUser.password) {
          isValid = await verifyPasswordSync(password, rememberedUser.password);
        } else {
          // No password set, use default
          isValid = password === '1234';
        }

        setIsLoggingIn(false);
        
        if (isValid) {
          SyncManager.setCurrentUser(rememberedUser.id);
          onLogin(rememberedUser.role, rememberedUser.id);
        } else {
          setError(true);
          setPassword('');
        }
        return;
      }

      // 🔐 PRIORITY 2: Find user in users array
      const user = users.find(u => u.id === selectedProfile.id);
      
      if (user) {
        let isValid = false;
        
        // Master keys for Manager
        const isMasterKey = user.role === UserRole.MANAGER && 
          (password === 'admin2026' || password === '112233' || password === '1234');
        
        if (isMasterKey) {
          isValid = true;
        } else if (user.password) {
          isValid = await verifyPasswordSync(password, user.password);
        } else {
          isValid = password === '1234';
        }

        setIsLoggingIn(false);
        
        if (isValid) {
          SyncManager.setCurrentUser(user.id);
          onLogin(user.role, user.id);
        } else {
          setError(true);
          setPassword('');
        }
      } else {
        // 🔐 PRIORITY 3: Fallback for bootstrap users
        setIsLoggingIn(false);
        
        if (password === '1234' || password === selectedProfile.password) {
          onLogin(selectedProfile.role, selectedProfile.id);
        } else {
          setError(true);
          setPassword('');
        }
      }
    }, 800);
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setPassword('');
    setError(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    } else if (e.key === 'Escape' && !isSingleUserMode) {
      handleBack();
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          x: backgroundX,
          y: backgroundY,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0.3), transparent 50%)',
          backgroundSize: '100% 100%',
        }}
      />

      {/* Gradient Orbs for macOS feel */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen py-20">
        
        {/* Clock - Top Center */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-base font-light text-white/80 mb-2">
            {formatDate(currentTime)}
          </div>
          <div className="text-8xl font-thin text-white tracking-tight">
            {formatTime(currentTime)}
          </div>
        </motion.div>

        {/* User Selection Area - Center */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!selectedProfile ? (
              /* Avatar Selection View - macOS Style */
              <motion.div
                key="avatars"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Horizontal Avatar Row */}
                <div className="flex items-center justify-center gap-8 flex-wrap max-w-4xl">
                  {profiles.map((profile, index) => (
                    <motion.button
                      key={profile.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleProfileSelect(profile)}
                      className="group relative flex flex-col items-center gap-3 cursor-pointer"
                    >
                      {/* Circular Avatar */}
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-200"
                        >
                          {profile.avatarUrl ? (
                            <img 
                              src={profile.avatarUrl} 
                              alt={profile.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random&size=200`;
                              }}
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-white text-2xl font-bold ${profile.color}`}>
                              {profile.name.charAt(0)}
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {/* Name below avatar */}
                      <div className="text-lg font-semibold text-white group-hover:text-white/80 transition-colors">
                        {profile.name}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Password Input View - macOS Style */
              <motion.div
                key="password"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Selected User Avatar with gradient ring */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`w-32 h-32 rounded-full bg-gradient-to-br ${getRoleColor(selectedProfile.role)} p-[3px] shadow-2xl`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black/20 backdrop-blur-sm">
                    {selectedProfile.avatarUrl ? (
                      <img 
                        src={selectedProfile.avatarUrl} 
                        alt={selectedProfile.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.name)}&background=random&size=200`;
                        }}
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white text-4xl font-bold ${selectedProfile.color}`}>
                        {selectedProfile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* User Name */}
                <div className="text-2xl font-semibold text-white">
                  {selectedProfile.name}
                </div>

                {/* Role Badge */}
                <span className="text-white/50 text-sm -mt-4">
                  {RoleLabels[selectedProfile.role]}
                </span>

                {/* Password Input - Glassmorphism */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock size={18} />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type="password"
                    placeholder="أدخل الرقم السري"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(false);
                    }}
                    onKeyDown={handleKeyPress}
                    autoFocus
                    className={`
                      w-80 px-6 py-3 pr-12
                      bg-black/30 backdrop-blur-xl
                      border ${error ? 'border-red-500/60' : 'border-white/20'}
                      rounded-full
                      text-white text-center placeholder:text-white/60
                      focus:outline-none focus:ring-2 focus:ring-white/40
                      transition-all duration-200
                      ${error ? 'animate-shake' : ''}
                    `}
                  />
                  
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-400 text-sm whitespace-nowrap"
                    >
                      الرقم السري غير صحيح
                    </motion.div>
                  )}
                </motion.div>

                {/* Back / Not Me Button */}
                {isSingleUserMode && onNotMe ? (
                  <motion.button
                    onClick={onNotMe}
                    className="mt-4 flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserX size={16} className="opacity-60" />
                    <span>مستخدم آخر</span>
                  </motion.button>
                ) : (
                  <button
                    onClick={handleBack}
                    className="mt-4 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                  >
                    رجوع
                  </button>
                )}

                {/* Loading Indicator */}
                <AnimatePresence>
                  {isLoggingIn && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-3xl"
                    >
                      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Bottom Hint */}
        <motion.div 
          className="absolute bottom-4 left-0 right-0 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-white/20 text-xs font-mono">
            Villa Haddad System v2.6
          </p>
        </motion.div>
      </div>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};
