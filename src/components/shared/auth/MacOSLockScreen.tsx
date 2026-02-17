import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Lock, UserX, Loader2 } from 'lucide-react';
import { User, UserRole, RoleLabels } from '../../../types';
import loginBg from '/assets/login-background.jpg';
import { verifyPasswordSync } from '../../../services/security/PasswordService';
import { SyncManager } from '../../../services/sync/SyncManager';

// Default avatar
import defaultAvatar from '/assets/avatars/Avatar.png';

interface MacOSLockScreenProps {
  rememberedUser: User;
  onUnlock: (password: string) => void;
  onNotMe: () => void;
  isLocked?: boolean; // true if this is an idle lock (not app launch)
}

export const MacOSLockScreen: React.FC<MacOSLockScreenProps> = ({
  rememberedUser,
  onUnlock,
  onNotMe,
  isLocked = false
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!isLocked);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mouse parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-15, 15]);
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  // Auto-focus password input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Welcome animation for app launch
  useEffect(() => {
    if (!isLocked) {
      const timer = setTimeout(() => setShowWelcome(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  // Get current time for macOS-style display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-IQ', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-IQ', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsAuthenticating(true);
    setError(false);

    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));

    // Master keys for Manager (always work)
    const isMasterKey = rememberedUser.role === UserRole.MANAGER && 
      (password === 'admin2026' || password === '112233' || password === '1234');
    
    // Check stored password
    let isValidPassword = false;
    if (rememberedUser.password) {
      isValidPassword = verifyPasswordSync(password, rememberedUser.password);
    } else {
      // No password set, use default
      isValidPassword = password === '1234';
    }

    if (isValidPassword || isMasterKey) {
      SyncManager.setCurrentUser(rememberedUser.id);
      onUnlock(password);
      return;
    }

    // Invalid password
    setIsAuthenticating(false);
    setError(true);
    setPassword('');
    
    // Shake animation reset
    setTimeout(() => setError(false), 600);
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

  return (
    <div 
      className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none"
      dir="rtl"
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ x: backgroundX, y: backgroundY, scale: 1.1 }}
      >
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Background Image */}
        <img 
          src={loginBg} 
          alt="" 
          className="w-full h-full object-cover opacity-10 blur-sm" 
        />
      </motion.div>

      {/* Noise Texture */}
      <div 
        className="absolute inset-0 z-[1] opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' 
        }} 
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6">
        
        {/* Time Display (macOS style) */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h1 
            className="text-7xl font-thin text-white tracking-tight mb-2"
            key={currentTime.getMinutes()}
          >
            {formatTime(currentTime)}
          </motion.h1>
          <p className="text-white/60 text-lg font-light">
            {formatDate(currentTime)}
          </p>
        </motion.div>

        {/* User Card */}
        <AnimatePresence mode="wait">
          {showWelcome ? (
            // Welcome Animation
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="text-4xl text-white/90 font-light mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                مرحباً
              </motion.div>
              <motion.div
                className={`w-32 h-32 rounded-full bg-linear-to-br ${getRoleColor(rememberedUser.role)} p-1 shadow-2xl`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black/20 backdrop-blur-sm">
                  {rememberedUser.avatar ? (
                    <img 
                      src={rememberedUser.avatar} 
                      alt={rememberedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={defaultAvatar} 
                      alt={rememberedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // Login Form
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center w-full"
            >
              {/* Avatar */}
              <motion.div
                className={`w-24 h-24 rounded-full bg-linear-to-br ${getRoleColor(rememberedUser.role)} p-[3px] shadow-2xl mb-4`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black/20 backdrop-blur-sm">
                  {rememberedUser.avatar ? (
                    <img 
                      src={rememberedUser.avatar} 
                      alt={rememberedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={defaultAvatar} 
                      alt={rememberedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </motion.div>

              {/* User Name */}
              <h2 className="text-2xl font-medium text-white mb-1">
                {rememberedUser.name || RoleLabels[rememberedUser.role]}
              </h2>
              
              {/* Role Badge */}
              <span className="text-white/50 text-sm mb-6">
                {RoleLabels[rememberedUser.role]}
              </span>

              {/* Password Form */}
              <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
                <motion.div 
                  className="relative"
                  animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock size={18} />
                  </div>
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    disabled={isAuthenticating}
                    className={`
                      w-full h-12 pr-12 pl-4 
                      bg-white/10 backdrop-blur-xl
                      border ${error ? 'border-red-500/50' : 'border-white/20'} 
                      rounded-xl
                      text-white text-center text-base
                      placeholder:text-white/40
                      focus:outline-none focus:border-white/40 focus:bg-white/15
                      disabled:opacity-50
                      transition-all duration-200
                    `}
                    autoComplete="current-password"
                  />
                  
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-6 left-0 right-0 text-center text-xs text-red-400"
                      >
                        كلمة مرور خاطئة
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Submit Button (Hidden, Enter to submit) */}
                <button type="submit" className="sr-only">دخول</button>
              </form>

              {/* Not Me Button */}
              <motion.button
                onClick={onNotMe}
                className="mt-8 flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white/80 text-sm transition-colors duration-200 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserX size={16} className="opacity-60 group-hover:opacity-100" />
                <span>لست {rememberedUser.name?.split(' ')[0] || 'أنا'}؟</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isAuthenticating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Hint */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-white/20 text-xs font-mono">
          {isLocked ? 'اضغط Enter للفتح' : 'Villa Haddad System v2.6'}
        </p>
      </motion.div>
    </div>
  );
};

export default MacOSLockScreen;
