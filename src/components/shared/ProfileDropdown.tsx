
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { LogOut, Camera, User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { toast } from 'sonner';

interface ProfileDropdownProps {
  currentUser: User;
  onLogout: () => void;
  onOpenSettings?: () => void;
  collapsed?: boolean;
  minimal?: boolean;
  dropDirection?: 'up' | 'left' | 'right' | 'down';
}

export default function ProfileDropdown({ currentUser, onLogout, onOpenSettings, collapsed = false, minimal = false, dropDirection = 'up' }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case UserRole.MANAGER: return 'المديرة';
      case UserRole.ADMIN: return 'المشرف';
      case UserRole.RECEPTION: return 'الاستقبال';
      case UserRole.PHOTO_EDITOR: return 'مصمم صور';
      case UserRole.VIDEO_EDITOR: return 'مونتير';
      case UserRole.PRINTER: return 'الطباعة';
      case UserRole.SELECTOR: return 'الانتقاء';
      default: return currentUser.role;
    }
  };

  const getAvatarContent = () => {
    const avatar = currentUser.avatar;
    if (avatar && (avatar.includes('http') || avatar.includes('data:') || avatar.includes('url('))) {
      const src = avatar.startsWith('url(') ? avatar.slice(4, -1) : avatar;
      return (
        <img src={src} alt={currentUser.name} className="w-full h-full object-cover" />
      );
    }
    return (
      <span className="text-white font-bold text-sm">
        {currentUser.name?.charAt(0) || '?'}
      </span>
    );
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة كبير (أقصى 2MB)');
      return;
    }

    setIsChangingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await updateUser(currentUser.id, { avatar: dataUrl });
        toast.success('تم تغيير الصورة بنجاح');
        setIsChangingAvatar(false);
      };
      reader.onerror = () => {
        toast.error('فشل في قراءة الصورة');
        setIsChangingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar update failed:', error);
      toast.error('فشل في تحديث الصورة');
      setIsChangingAvatar(false);
    }
  };

  const positionClasses = {
    up: 'bottom-full left-0 right-0 mb-2',
    left: 'right-full bottom-0 mr-2',
    right: 'left-full bottom-0 ml-2',
    down: 'top-full left-0 right-0 mt-2'
  };

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleAvatarChange}
    />
  );

  return (
    <div ref={dropdownRef} className="relative" dir="rtl">
      {fileInput}

      {/* Profile Button */}
      <button
        data-testid="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="w-9 h-9 bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
          {getAvatarContent()}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-zinc-500">{getRoleLabel()}</p>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute ${positionClasses[dropDirection]} w-56 bg-[#111] border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden z-[100]`}>
          {/* User Info Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
            <div className="relative group">
              <div className="w-11 h-11 bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
                {getAvatarContent()}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isChangingAvatar}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera size={14} className="text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-500">{getRoleLabel()}</p>
            </div>
          </div>

          {/* Change Avatar */}
          <div className="p-1">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Camera size={16} />
              <span>{isChangingAvatar ? 'جارِ التحديث...' : 'تغيير الصورة'}</span>
            </button>

            {/* Settings */}
            {onOpenSettings && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings size={16} />
                <span>الإعدادات</span>
              </button>
            )}

            <div className="h-px bg-white/6 my-1" />

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
