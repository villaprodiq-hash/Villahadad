import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { X, Shield, User as UserIcon, Lock, Save, RefreshCw, Eye, EyeOff, Search, Upload, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '../../services/auth/AuthService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[]; // Needed for Admin Safe Mode
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  isSafeMode: boolean; // True if logged in as specialized Admin/SafeMode
}

// 🔧 Helper: Compress image to max size (default 150KB)
const compressImage = (dataUrl: string, maxSizeKB: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Target dimensions (max 256x256 for avatar)
      const maxDim = 256;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Start with quality 0.8, reduce until under maxSizeKB
      let quality = 0.8;
      let result = canvas.toDataURL('image/jpeg', quality);

      while (result.length > maxSizeKB * 1024 && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      console.log(`📸 Image compressed: ${Math.round(result.length / 1024)}KB (quality: ${quality.toFixed(1)})`);
      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default function SettingsModal({ isOpen, onClose, currentUser, allUsers, onUpdateUser, isSafeMode }: SettingsModalProps) {
  React.useEffect(() => {
    if (isOpen) console.log('⚙️ SettingsModal MOUNTED/OPENED');
  }, [isOpen]);

  // All hooks MUST be called before any early returns
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'safemode' | 'about'>('profile');
  
  // Update State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Listen for update checks
  React.useEffect(() => {
      const updateTime = () => {
          const t = localStorage.getItem('last_update_check');
          if (t) {
              const date = new Date(t);
              setLastCheckTime(date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }));
          }
      };
      updateTime();
      window.addEventListener('storage', updateTime);
      return () => window.removeEventListener('storage', updateTime);
  }, []);

  // Helper to clean legacy avatar urls
  const cleanAvatar = (a?: string): string => {
      if (!a) return 'bg-blue-500';
      // If it's a class (bg-...) keep it
      if (a.startsWith('bg-') || a.startsWith('content-')) return a;
      // If it's wrapped in url(...), strip it
      const match = a.match(/^url\(['"]?(.+?)['"]?\)$/);
      return match?.[1] ?? a;
  };

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(cleanAvatar(currentUser.avatar));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔄 Sync state when currentUser changes (e.g., after save)
  React.useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email || '');
    setAvatar(cleanAvatar(currentUser.avatar));
  }, [currentUser]);

  // Helper to check if avatar is an image source
  const isImage = avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/');

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check Biometrics on Mount
  React.useEffect(() => {
      const checkBio = async () => {
          const api = window.electronAPI;
          if (api && api.auth) {
              const supported = await api.auth.checkBiometric();
              setBiometricAvailable(supported);
              const enabled = localStorage.getItem(`biometric_enabled_${currentUser.id}`) === 'true';
              setBiometricEnabled(enabled);
          }
      };
      if (activeTab === 'security') checkBio();
  }, [activeTab, currentUser.id]);

  const handleToggleBiometric = async () => {
      if (biometricEnabled) {
          // Disable
          setBiometricEnabled(false);
          localStorage.setItem(`biometric_enabled_${currentUser.id}`, 'false');
          window.dispatchEvent(new Event('storage')); // Notify other components
          toast.info('تم تعطيل الدخول بالبصمة');
      } else {
          // Enable (Verify First)
          const api = window.electronAPI;
          if (api && api.auth) {
              const success = await api.auth.promptTouchID('تأكيد البصمة لتفعيل الدخول');
              if (success) {
                  setBiometricEnabled(true);
                  localStorage.setItem(`biometric_enabled_${currentUser.id}`, 'true');
                  window.dispatchEvent(new Event('storage')); // Notify other components
                  toast.success('تم تفعيل الدخول بالبصمة لهذا الجهاز');
              } else {
                  toast.error('فشل التحقق من البصمة');
              }
          }
      }
  };

  // Safe Mode State
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const EMOJI_AVATARS = [
    "👨‍💼", "👩‍💼", "👨‍💻", "👩‍💻", "🧙‍♂️", "🧙‍♀️", "🧛‍♂️", "🧟", 
    "🐱", "🐶", "🦊", "🦁", "🦄", "🐼", "🐸", "🐙",
    "⚡", "🔥", "🌈", "⭐", "💎", "🎨", "🎭", "🎪"
  ];

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // 🖼️ Handle image file selection with compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading
    toast.loading('جاري ضغط الصورة...', { id: 'compress' });

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawBase64 = reader.result as string;
          console.log(`📸 Original image size: ${Math.round(rawBase64.length / 1024)}KB`);

          // Compress the image
          const compressed = await compressImage(rawBase64, 150); // Max 150KB
          setAvatar(compressed);
          
          toast.success('تم تحميل الصورة بنجاح', { id: 'compress' });
        } catch (err) {
          console.error('Image compression failed:', err);
          toast.error('فشل ضغط الصورة', { id: 'compress' });
        }
      };
      reader.onerror = () => {
        toast.error('فشل قراءة الصورة', { id: 'compress' });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('خطأ في تحميل الصورة', { id: 'compress' });
    }
  };

  const handleSaveProfile = async () => {
    console.log('💾 handleSaveProfile STARTED');
    console.log('📸 Avatar to save:', avatar.substring(0, 100) + '...');
    console.log('📸 Avatar size:', Math.round(avatar.length / 1024), 'KB');
    
    setIsLoading(true);
    setSaveStatus('saving');
    let message = 'تم تحديث البيانات';
    
    try {
      // 1. Try Update Cloud Auth Email (Best Effort)
      if (email !== currentUser.email && email.includes('@')) {
          console.log('🚀 Attempting Cloud Email Update...');
          const { error } = await AuthService.updateEmail(email);
          if (!error) {
             console.log('✅ Cloud Email Update Success');
             message = 'تم تحديث البريد الإلكتروني والبيانات بنجاح';
          } else {
             console.warn('❌ Cloud Email Update Failed:', error);
          }
      }

      // 2. Update User Record (Supabase + SQLite)
      console.log('💾 Saving to database...');
      console.log('   - Name:', name);
      console.log('   - Email:', email);
      console.log('   - Avatar length:', avatar.length);
      
      await onUpdateUser(currentUser.id, { name, email, avatar });
      
      console.log('✅ Database update completed!');
      
      // 3. Verify the save worked by checking if avatar is in the updated user
      // The AuthProvider should have updated currentUser by now via subscription
      
      setSaveStatus('success');
      window.dispatchEvent(new Event('storage'));
      toast.success(message);
      
      // Don't close immediately - show success state
      setTimeout(() => {
        onClose();
        setSaveStatus('idle');
      }, 500);
      
    } catch (e: unknown) {
      console.error('💥 handleSaveProfile ERROR:', e);
      setSaveStatus('error');
      toast.error(`خطأ في الحفظ: ${getErrorMessage(e, 'فشل التحديث')}`);
    } finally {
      setIsLoading(false);
      console.log('🏁 handleSaveProfile FINISHED');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('كلمة المرور قصيرة جداً');
      return;
    }

    setIsLoading(true);
    let message = 'تم تغيير كلمة المرور محلياً';

    try {
      // 1. Try Update Cloud Auth Password (Best Effort)
      const { error } = await AuthService.updatePassword(newPassword);
      if (!error) {
          message = 'تم تغيير كلمة المرور في السحابة والتطبيق بنجاح';
      } else {
          console.warn('Cloud Password Update Failed (Offline/No Session):', error);
          toast.warning('فشلت المزامنة السحابية. تم تغيير كلمة المرور للدخول المحلي فقط.');
      }

      // 2. Update Public Record
      await onUpdateUser(currentUser.id, { password: newPassword });
      
      toast.success(message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (e: unknown) {
      console.error(e);
      toast.error(`فشل تغيير كلمة المرور: ${getErrorMessage(e, 'حدث خطأ غير متوقع')}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminResetPassword = async (userId: string) => {
      try {
          await onUpdateUser(userId, { password: '123' });
          toast.success('تم إعادة تعيين رمز الدخول المحلي إلى "123"');
      } catch(e) {
          toast.error('فشل إعادة التعيين');
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1d21] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <UserIcon size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">الإعدادات</h2>
                <p className="text-xs text-gray-400">{isSafeMode ? 'الوضع الآمن (Admin Mode)' : 'إدارة الحساب الشخصي'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-black/20 border-b border-white/5">
           <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <UserIcon size={16} />
              الملف الشخصي
           </button>
           <button 
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'security' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Lock size={16} />
              الأمان وكلمة المرور
           </button>
           {isSafeMode && (
           <button 
              onClick={() => setActiveTab('safemode')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'safemode' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Shield size={16} />
              الوضع الآمن (Admin)
           </button>
           )}
           <button 
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'about' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <RefreshCw size={16} />
              حول التطبيق
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            
            {/* 1. Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                             <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-20 h-20 rounded-full ${isImage ? 'bg-gray-800' : avatar} flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white/5 cursor-pointer overflow-hidden transition-all hover:ring-white/20`}
                             >
                                {isImage ? (
                                  <img 
                                    src={avatar} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.warn('Avatar load failed, using fallback');
                                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`;
                                    }}
                                  />
                                ) : (
                                  !avatar.includes('content-') && name.charAt(0)
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Upload size={24} className="text-white"/>
                                </div>
                             </div>
                             <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageSelect}
                             />
                             
                             {/* Avatar size indicator */}
                             {isImage && (
                               <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-gray-400">
                                 {Math.round(avatar.length / 1024)}KB
                               </div>
                             )}
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs text-gray-500">لون الأفاتار</label>
                             <div className="flex gap-2">
                                {['bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-emerald-500', 'bg-orange-500'].map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => {
                                            if (isImage) {
                                                setAvatar(color);
                                            } else if (avatar.startsWith('bg-')) {
                                                const parts = avatar.split(' ');
                                                const newParts = parts.map(p => p.startsWith('bg-') ? color : p);
                                                setAvatar(newParts.join(' '));
                                            } else {
                                                setAvatar(color);
                                            }
                                        }}
                                        className={`w-6 h-6 rounded-full ${color} transition-all hover:scale-110 border border-white/10`}
                                    />
                                ))}
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">الاسم الظاهر</label>
                        <input 
                           type="text" 
                           value={name}
                           onChange={e => setName(e.target.value)}
                           className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">البريد الإلكتروني</label>
                        <div className="relative">
                            <input 
                               type="email" 
                               value={email}
                               onChange={e => setEmail(e.target.value)}
                               className="w-full bg-black/20 border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-blue-500/50 outline-none transition-colors"
                               placeholder="example@villahadad.com"
                            />
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        </div>
                    </div>

                    {/* Avatar Selection */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="text-sm text-gray-400 block mb-2">اختر ايموجي</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <div className="grid grid-cols-8 gap-2">
                                {EMOJI_AVATARS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            let currentColor = 'bg-blue-500';
                                            if (!isImage) {
                                                const match = avatar.match(/bg-[\w]+-[\d]+/);
                                                if (match) currentColor = match[0];
                                            }
                                            setAvatar(`${currentColor} text-2xl flex items-center justify-center after:content-['${emoji}']`);
                                        }}
                                        className="w-full aspect-square flex items-center justify-center hover:bg-white/10 rounded text-xl transition-all"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Save Status Indicator */}
                    {saveStatus !== 'idle' && (
                      <div className={`p-3 rounded-lg flex items-center gap-2 ${
                        saveStatus === 'saving' ? 'bg-blue-500/10 text-blue-400' :
                        saveStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {saveStatus === 'saving' && <RefreshCw size={16} className="animate-spin" />}
                        {saveStatus === 'success' && <CheckCircle2 size={16} />}
                        {saveStatus === 'error' && <AlertCircle size={16} />}
                        <span className="text-sm">
                          {saveStatus === 'saving' && 'جاري الحفظ...'}
                          {saveStatus === 'success' && 'تم الحفظ بنجاح!'}
                          {saveStatus === 'error' && 'فشل الحفظ'}
                        </span>
                      </div>
                    )}
                </div>
            )}

            {/* 2. Security Tab */}
            {activeTab === 'security' && (
                <div className="space-y-6 max-w-md mx-auto">
                    
                    {/* Biometric Toggle (Only if available) */}
                    {biometricAvailable && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${biometricEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                                    <div className="w-6 h-6 flex items-center justify-center">
                                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c0-3 2.5-5.5 5.5-5.5S23 9 23 12M17.5 12c0-3-2.5-5.5-5.5-5.5S6.5 9 6.5 12"/><path d="M12 17.5c0 3-2.5 5.5-5.5 5.5S1 20.5 1 17.5M17.5 17.5c0 3-2.5 5.5-5.5 5.5"/></svg>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">الدخول ببصمة الإصبع</h4>
                                    <p className="text-xs text-gray-400">تفعيل الدخول السريع لهذا الجهاز</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={biometricEnabled}
                                    onChange={handleToggleBiometric}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    )}

                    {!isSafeMode && (
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">كلمة المرور الحالية</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={e => setOldPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none"
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">كلمة المرور الجديدة</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none"
                            />
                            <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">تأكيد كلمة المرور</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500/50 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* 3. Safe Mode Tab (Admin Only) */}
            {activeTab === 'safemode' && isSafeMode && (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                        <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
                            <Shield size={18} />
                            وضع المشرف الآمن
                        </h3>
                        <p className="text-xs text-gray-400">
                            يمكنك من هنا عرض جميع المستخدمين وإعادة تعيين كلمات مرورهم في حال نسيانها. الرمز الافتراضي لإعادة التعيين هو <b>&quot;123&quot;</b>.
                        </p>
                    </div>

                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="بحث عن موظف..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:border-emerald-500/50 outline-none"
                        />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                            <div key={user.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full ${user.avatar?.startsWith('data:') || user.avatar?.startsWith('http') ? '' : (user.avatar || 'bg-gray-600')} flex items-center justify-center text-xs font-bold overflow-hidden`}>
                                        {user.avatar?.startsWith('data:') || user.avatar?.startsWith('http') ? (
                                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          user.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-200">{user.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 uppercase">{user.role}</span>
                                            <span className="text-[10px] text-emerald-500/70 font-mono bg-emerald-900/20 px-1 rounded">
                                                Pwd: {user.password || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleAdminResetPassword(user.id)}
                                    className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-lg text-gray-400 transition-colors tooltip"
                                    title="إعادة تعيين إلى 123"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. About Tab (Updates) */}
            {activeTab === 'about' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                        <img src="./icon.png" alt="Logo" className="w-16 h-16 opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <span className="text-4xl">🏰</span>
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Villa Hadad</h3>
                        <p className="text-gray-500 text-sm">نظام إدارة الإنتاج والحجوزات</p>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-mono text-gray-300">v1.0.42</span>
                        </div>
                    </div>

                    <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-gray-300 mb-3 text-right">حالة النظام والتحديثات</h4>
                        
                        {/* Status Indicators */}
                        <div className="flex gap-2 mb-4 justify-end">
                            <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                متصل بالسيرفر
                            </div>
                            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                قاعدة بيانات نشطة
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button 
                                onClick={async () => {
                                    setCheckingUpdate(true);
                                    setUpdateStatus('جاري الاتصال...');
                                    try {
                                        const api = window.electronAPI;
                                        if (api?.checkForUpdates) {
                                            const appVer = api.getAppVersion ? await api.getAppVersion() : null;
                                            const res = await api.checkForUpdates();
                                            
                                            if (res.error) throw new Error(res.error);
                                            
                                            if (res.version && appVer?.version && res.version !== appVer.version) {
                                                setUpdateStatus('تحديث متاح!');
                                            } else {
                                                setUpdateStatus('نسختك محدثة');
                                                toast.success(`🎉 أنت على أحدث إصدار${appVer?.version ? ` (v${appVer.version})` : ''}`);
                                            }
                                        } else {
                                            setUpdateStatus('خدمة التحديث غير متوفرة');
                                        }
                                    } catch (e: unknown) {
                                        setUpdateStatus('فشل البحث: ' + getErrorMessage(e, 'حدث خطأ غير متوقع'));
                                    } finally {
                                        setTimeout(() => setCheckingUpdate(false), 2000);
                                    }
                                }}
                                disabled={checkingUpdate}
                                className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${checkingUpdate ? 'opacity-50' : ''}`}
                            >
                                {checkingUpdate ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {checkingUpdate ? 'جاري البحث...' : 'بحث عن تحديث'}
                            </button>
                            <span className="text-xs text-gray-500 font-mono">{updateStatus || (lastCheckTime ? `آخر فحص: ${lastCheckTime}` : 'انتظار...')}</span>
                        </div>
                    </div>

                    <div className="text-[10px] text-gray-600 max-w-xs leading-relaxed">
                        تم التطوير بواسطة فريق <span className="text-gray-500 font-bold">Lumina</span>
                        <br />
                        Build ID: {new Date().toISOString().split('T')[0]}
                    </div>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3 justify-end">
            <button 
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
                إلغاء
            </button>
            {activeTab !== 'safemode' && activeTab !== 'about' && (
                <button 
                    onClick={activeTab === 'profile' ? handleSaveProfile : handleChangePassword}
                    disabled={isLoading}
                    className={`px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
