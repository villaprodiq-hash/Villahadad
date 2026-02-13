import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShieldAlert, User, Briefcase, Lock, Key, ChevronDown, BadgeCheck, EyeOff, LayoutGrid, ImagePlus } from 'lucide-react';
import { User as UserType, UserRole, RoleLabels } from '../../../types';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<UserType>) => Promise<void>;
  initialData?: UserType;
  mode: 'add' | 'edit';
}

const ROLE_SECTIONS: Partial<Record<UserRole, { id: string; label: string }[]>> = {
    [UserRole.RECEPTION]: [
        { id: 'section-home', label: 'الرئيسية' },
        { id: 'section-my-bookings', label: 'الحجوزات' },
        { id: 'section-workflow', label: 'سير العمل' },
        { id: 'section-clients', label: 'العملاء' },
        { id: 'section-team-chat', label: 'الدردشة' },
    ],
    [UserRole.PHOTO_EDITOR]: [
        { id: 'section-home', label: 'المهام (Tasks)' },
        { id: 'section-quality', label: 'الجودة (Quality)' },
        { id: 'section-stats', label: 'الإحصائيات (Stats)' },
        { id: 'section-team-chat', label: 'الدردشة (Chat)' },
        { id: 'section-presets', label: 'الإعدادات (Presets)' },
    ],
    [UserRole.VIDEO_EDITOR]: [
         { id: 'dashboard', label: 'الرئيسية (Dashboard)' },
         { id: 'chat', label: 'الدردشة (Chat)' },
    ],
    [UserRole.PRINTER]: [
        { id: 'section-home', label: 'الرئيسية' },
    ],
    [UserRole.SELECTOR]: [
        { id: 'section-home', label: 'الرئيسية' },
    ],
    [UserRole.ADMIN]: [
        { id: 'section-home', label: 'الرئيسية' },
        { id: 'section-my-bookings', label: 'الحجوزات' },
        { id: 'section-clients', label: 'العملاء' },
        { id: 'section-financial', label: 'المالية' },
        { id: 'section-files', label: 'المعرض' },
        { id: 'section-team', label: 'فريق العمل' },
        { id: 'section-team-chat', label: 'الدردشة' },
        { id: 'section-inventory', label: 'المخزون (Inventory)' },
        { id: 'section-war-room', label: 'غرفة العمليات (War Room)' },
    ],
    [UserRole.MANAGER]: [
        { id: 'section-home', label: 'الرئيسية' },
        { id: 'section-clients', label: 'العملاء' },
        { id: 'section-financial', label: 'المالية' },
        { id: 'section-files', label: 'المعرض' },
        { id: 'section-team', label: 'فريق العمل' },
    ]
};

const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'permissions'>('credentials');
  const [formData, setFormData] = useState<Partial<UserType>>({
    name: '',
    jobTitle: '',
    role: UserRole.RECEPTION,
    email: '',
    password: '',
    avatar: '',
    preferences: {
        hiddenSections: [],
        hiddenWidgets: []
    }
  });

  const [confirmSuperAdmin, setConfirmSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('credentials');
      if (mode === 'edit' && initialData) {
        setFormData({
            ...initialData,
            password: '', 
            avatar: initialData.avatar || '',
            preferences: initialData.preferences || { hiddenSections: [], hiddenWidgets: [] }
        });
      } else {
        setFormData({
          name: '',
          jobTitle: '',
          role: UserRole.RECEPTION,
          email: '',
          password: '',
          preferences: { hiddenSections: [], hiddenWidgets: [] }
        });
      }
      setConfirmSuperAdmin(false);
      setError('');
    }
  }, [isOpen, initialData, mode]);

  const handleChange = (field: keyof UserType, value: string | UserRole | UserType['preferences']) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'role' && value !== UserRole.MANAGER) {
        setConfirmSuperAdmin(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRole = e.target.value as UserType['role'];
      handleChange('role', newRole);
  };

  const toggleSectionVisibility = (sectionId: string) => {
      setFormData(prev => {
          const currentHidden = prev.preferences?.hiddenSections || [];
          const isHidden = currentHidden.includes(sectionId);
          
          let newHidden;
          if (isHidden) {
              newHidden = currentHidden.filter(id => id !== sectionId);
          } else {
              newHidden = [...currentHidden, sectionId];
          }

          return {
              ...prev,
              preferences: {
                  ...prev.preferences,
                  hiddenSections: newHidden
              }
          };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.role) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (mode === 'add' && !formData.password) {
        setError('يرجى تحديد رمز الدخول (PIN)');
        return;
    }

    const isSuperAdmin = formData.role === UserRole.MANAGER;
    if (isSuperAdmin && !confirmSuperAdmin && mode === 'add') {
         return;
    }
    
    if (isSuperAdmin && !confirmSuperAdmin && mode === 'edit' && initialData?.role !== formData.role) {
        return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('حدث خطأ أثناء الحفظ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdminSelected = formData.role === UserRole.MANAGER;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center border border-white/10 shadow-inner">
               <UserTypeIcon size={20} role={formData.role || UserRole.RECEPTION} />
            </div>
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {mode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}
                    {formData.role && <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full font-mono text-gray-300">{RoleLabels[formData.role]}</span>}
                </h2>
                <div className="flex gap-4 mt-1">
                    <button 
                        onClick={() => setActiveTab('credentials')}
                        className={`text-xs font-bold transition-colors border-b-2 pb-0.5 ${activeTab === 'credentials' ? 'text-amber-500 border-amber-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        البيانات الأساسية
                    </button>
                    <button 
                         onClick={() => setActiveTab('permissions')}
                         className={`text-xs font-bold transition-colors border-b-2 pb-0.5 ${activeTab === 'permissions' ? 'text-amber-500 border-amber-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                    >
                        الصلاحيات المتقدمة
                    </button>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
            
            <AnimatePresence mode="wait">
                {activeTab === 'credentials' ? (
                    <motion.div 
                        key="credentials"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {/* Avatar Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">لون الأفاتار</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    'bg-gradient-to-br from-purple-500 to-pink-500',
                                    'bg-gradient-to-br from-blue-500 to-cyan-500',
                                    'bg-gradient-to-br from-green-500 to-emerald-500',
                                    'bg-gradient-to-br from-amber-500 to-orange-500',
                                    'bg-gradient-to-br from-red-500 to-rose-500',
                                    'bg-gradient-to-br from-indigo-500 to-violet-500',
                                    'bg-gradient-to-br from-teal-500 to-cyan-500',
                                    'bg-gradient-to-br from-pink-500 to-rose-500',
                                ].map((gradient) => (
                                    <button
                                        key={gradient}
                                        type="button"
                                        onClick={() => handleChange('avatar', gradient)}
                                        className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center transition-all ${
                                            formData.avatar === gradient 
                                                ? 'ring-2 ring-amber-500 ring-offset-2 scale-110' 
                                                : 'hover:scale-105'
                                        }`}
                                    >
                                        {formData.avatar === gradient && <Check size={16} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">الاسم الكامل</label>
                                <div className="relative">
                                    <User size={16} className="absolute right-3 top-2.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        className="w-full h-10 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm"
                                        placeholder="مثال: أحمد محمد"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">المسمى الوظيفي (Label)</label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute right-3 top-2.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        className="w-full h-10 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm"
                                        placeholder="مثال: مشرف صباحي"
                                        value={formData.jobTitle || ''}
                                        onChange={(e) => handleChange('jobTitle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">تحديد الصلاحية (Role)</label>
                            <div className="relative">
                                <BadgeCheck size={16} className={`absolute right-3 top-2.5 ${isSuperAdminSelected ? 'text-amber-500' : 'text-gray-400'}`} />
                                <select 
                                    className={`w-full h-10 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm appearance-none cursor-pointer ${isSuperAdminSelected ? 'font-bold text-amber-700' : ''}`}
                                    value={formData.role}
                                    onChange={handleRoleChange}
                                >
                                    <option value={UserRole.RECEPTION}>Reception (استقبال)</option>
                                    <option value={UserRole.PHOTO_EDITOR}>Photo Editor (مصمم)</option>
                                    <option value={UserRole.VIDEO_EDITOR}>Video Editor (مونتير)</option>
                                    <option value={UserRole.PRINTER}>Printer (طباعة)</option>
                                    <option value={UserRole.SELECTOR}>Selector (اختيار)</option>
                                    <option value={UserRole.ADMIN}>Admin (إدارة)</option>
                                    <option value={UserRole.MANAGER}>Super Admin (المديرة)</option>
                                </select>
                                <ChevronDown size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Super Admin Warning */}
                        {isSuperAdminSelected && (mode === 'add' || (mode === 'edit' && initialData?.role !== formData.role)) && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div className="space-y-2">
                                            <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                                هذه الصلاحية تمنح الموظف <strong>تحكماً كاملاً بالنظام</strong>.
                                                <br/>هل أنت متأكد من منح هذه الصلاحية؟
                                            </p>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={confirmSuperAdmin}
                                                    onChange={(e) => setConfirmSuperAdmin(e.target.checked)}
                                                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="text-xs font-bold text-amber-700 group-hover:text-amber-800 transition-colors">نعم، أوافق</span>
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                        )}

                        <div className="border-t border-gray-100 my-4" />

                        {/* Credentials */}
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Key size={16} className="text-gray-400" />
                            بيانات الدخول
                        </h3>

                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Key size={16} className="text-gray-400" />
                            Security Access
                        </h3>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">
                                {mode === 'edit' ? 'Reset Passcode (PIN)' : 'Create Passcode (PIN)'}
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl mb-2">
                                <p className="text-[10px] text-gray-500 mb-2">
                                    يستخدم هذا الرمز للدخول إلى النظام بدلاً من كلمة المرور المعقدة. يفضل استخدام 4-6 أرقام.
                                </p>
                                <div className="relative">
                                    <Lock size={16} className="absolute right-3 top-2.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        className="w-full h-10 pr-9 pl-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm font-mono dir-ltr text-center tracking-[0.5em] font-bold text-gray-800"
                                        placeholder="••••"
                                        value={formData.password || ''}
                                        onChange={(e) => {
                                            // Only allow numbers
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length <= 6) handleChange('password', val);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="permissions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                         <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                             <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                 <EyeOff size={16} className="text-gray-400"/>
                                 إخفاء الأقسام (Hide Sections)
                             </h4>
                             <p className="text-xs text-gray-500 leading-relaxed">
                                 حدد الأقسام التي تريد <strong>إخفاءها</strong> عن هذا الموظف. الأقسام غير المحددة ستظهر بشكل طبيعي.
                             </p>
                         </div>

                         <div className="grid grid-cols-1 gap-2">
                             {(formData.role && ROLE_SECTIONS[formData.role])?.map(section => {
                                 const isHidden = formData.preferences?.hiddenSections?.includes(section.id);
                                 return (
                                     <div 
                                        key={section.id} 
                                        onClick={() => toggleSectionVisibility(section.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isHidden ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-100 hover:border-amber-200'}`}
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHidden ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                                                 <LayoutGrid size={16} />
                                             </div>
                                             <div>
                                                 <p className={`text-xs font-bold ${isHidden ? 'text-red-700' : 'text-gray-900'}`}>{section.label}</p>
                                                 <p className="text-[10px] text-gray-400 font-mono">{section.id}</p>
                                             </div>
                                         </div>
                                         
                                         <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isHidden ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}`}>
                                             {isHidden && <Check size={12} />}
                                         </div>
                                     </div>
                                 );
                             })}
                             
                             {(!formData.role || !ROLE_SECTIONS[formData.role] || ROLE_SECTIONS[formData.role].length === 0) && (
                                 <div className="text-center py-8 text-gray-400 text-xs">
                                     لا توجد أقسام قابلة للتخصيص لهذا الدور الوظيفي.
                                 </div>
                             )}
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium">
                    {error}
                </div>
            )}
            
        </form>
        
        {/* Footer Actions */}
        <div className="p-6 pt-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                    إلغاء
                </button>
                <button 
                    onClick={handleSubmit}
                    className={`flex-1 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                        ${isSuperAdminSelected 
                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                            : 'bg-gray-900 hover:bg-gray-800 shadow-gray-500/20'
                        }
                    `}
                >
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check size={16} />
                            {mode === 'add' ? 'إنشاء الحساب' : 'حفظ التغييرات'}
                        </>
                    )}
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper Icon Component
const UserTypeIcon = ({ role, size }: { role: string; size: number }) => {
    switch (role) {
        case UserRole.MANAGER: return <ShieldAlert size={size} />;
        case UserRole.ADMIN: return <Briefcase size={size} />;
        case UserRole.PHOTO_EDITOR: return <User size={size} />; 
        default: return <User size={size} />;
    }
};

export default StaffManagementModal;
