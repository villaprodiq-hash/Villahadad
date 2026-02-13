import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, RoleLabels } from '../types';

interface LoginViewProps {
  users: User[];
  onLogin: (userId: string) => void;
}

export default function LoginView({ users, onLogin }: LoginViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const handleLogin = () => {
    if (selectedUserId) {
      onLogin(selectedUserId);
    }
  };

  // Color palette for avatars
  const avatarColors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-red-500 to-pink-500',
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-[#1a1a1a]/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/5 p-12">
          {/* Logo/Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl mb-6 shadow-lg shadow-pink-500/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">فيلا حداد</h1>
            <p className="text-gray-400 text-lg">نظام إدارة الحجوزات</p>
          </div>

          {/* User Selection - Animated Tooltips Style */}
          <div className="space-y-6">
            <label className="block text-center text-sm font-medium text-gray-400 mb-8">
              اختر المستخدم
            </label>
            
            {/* Avatar Group */}
            <div className="flex items-center justify-center gap-0 mb-8" dir="ltr">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="relative"
                  style={{ marginLeft: index > 0 ? '-16px' : '0', zIndex: hoveredUserId === user.id ? 50 : users.length - index }}
                  onMouseEnter={() => setHoveredUserId(user.id)}
                  onMouseLeave={() => setHoveredUserId(null)}
                >
                  <motion.button
                    onClick={() => setSelectedUserId(user.id)}
                    className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-bold text-2xl border-4 transition-all duration-300 shadow-lg ${
                      selectedUserId === user.id
                        ? 'border-white scale-110'
                        : 'border-[#1a1a1a] hover:border-white/30'
                    }`}
                    whileHover={{ scale: 1.15, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {user.name.charAt(0)}
                    {selectedUserId === user.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredUserId === user.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                          delay: 0.05
                        }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none"
                      >
                        <div className="bg-white text-gray-900 px-4 py-3 rounded-xl shadow-2xl border border-gray-200 whitespace-nowrap">
                          <div className="font-bold text-sm">{user.name}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{RoleLabels[user.role]}</div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Login Button */}
            <motion.button
              onClick={handleLogin}
              disabled={!selectedUserId}
              whileHover={selectedUserId ? { scale: 1.02 } : {}}
              whileTap={selectedUserId ? { scale: 0.98 } : {}}
              className={`w-full py-5 rounded-2xl font-bold text-white transition-all duration-300 text-lg ${
                selectedUserId
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50'
                  : 'bg-gray-700/30 cursor-not-allowed'
              }`}
            >
              تسجيل الدخول
            </motion.button>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center text-sm text-gray-600">
            <p>© 2025 فيلا حداد - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
