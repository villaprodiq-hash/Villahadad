import React, { useState } from 'react';
import { Users, Plus, MoreVertical, Key, Briefcase } from 'lucide-react';
import { User, UserRole, RoleLabels } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

// New Team Widgets
import WorkloadHeatmapWidget from './widgets/WorkloadHeatmapWidget';
import ComplianceMonitorWidget from './widgets/ComplianceMonitorWidget';
import PerformanceLiveWidget from './widgets/PerformanceLiveWidget';
import SmartLeavesWidget from './widgets/SmartLeavesWidget';
import ActivityLogWidget from './widgets/ActivityLogWidget';

// Staff Management
// Staff Management
import StaffManagementModal from './StaffManagementModal';
import { toast } from 'sonner';
import { electronBackend } from '../../../services/mockBackend';

interface TeamViewProps {
  currentUser?: User;
  users: User[];
  isManager: boolean;
  onRefresh?: () => void;
}

const ManagerTeamView: React.FC<TeamViewProps> = ({ users, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'roster'>(() => {
    // Restore last selected view from localStorage
    const saved = localStorage.getItem('manager_team_view_mode');
    return (saved === 'dashboard' || saved === 'roster') ? saved : 'dashboard';
  });

  // Persist view mode changes
  const handleViewModeChange = (mode: 'dashboard' | 'roster') => {
    setViewMode(mode);
    localStorage.setItem('manager_team_view_mode', mode);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      if (editingUser) {
        await electronBackend.updateUser(editingUser.id, userData);
        toast.success('تم تحديث بيانات الموظف بنجاح');
        onRefresh?.();
      } else {
        // Create new user with Atomic Call + Timeout
        if (userData.name && userData.role) {
             console.log('🚀 Creating new user:', userData.name);

             // Add timeout to prevent hanging (10 seconds)
             const timeoutPromise = new Promise<never>((_, reject) => {
               setTimeout(() => reject(new Error('Request timeout - الطلب استغرق وقتاً طويلاً. تحقق من اتصال Supabase')), 10000);
             });

             const newUser = await Promise.race([
               electronBackend.addUser(
                 userData.name,
                 userData.role,
                 userData.password,
                 userData.jobTitle,
                 userData.preferences,
                 userData.avatar
               ),
               timeoutPromise
             ]);

             if (newUser && newUser.id) {
                 console.log('✅ User created successfully:', newUser.id);
                 toast.success(`تم إنشاء حساب ${userData.name} بنجاح`);
                 onRefresh?.();
             } else {
                 throw new Error("Failed to create user ID");
             }
        } else {
             toast.error('الاسم والصلاحية مطلوبان');
             return;
        }
      }
      setIsModalOpen(false);
      setEditingUser(undefined);
    } catch (error) {
      console.error('❌ Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('فشل في حفظ البيانات: ' + errorMessage);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingUser(undefined);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            console.log('🗑️ Deleting user:', userId);
            await electronBackend.deleteUser(userId);
            toast.success('تم حذف الموظف بنجاح');
            // Force immediate refresh
            onRefresh?.();
            // Double refresh after a short delay to ensure sync
            setTimeout(() => {
                onRefresh?.();
            }, 500);
        } catch (error) {
            console.error('❌ Delete error:', error);
            const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
            toast.error('فشل في حذف الموظف: ' + errorMsg);
            // Still try to refresh in case partial deletion succeeded
            onRefresh?.();
        }
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col p-5 gap-4 overflow-hidden relative">
      
      {/* 1. Header (Compact) */}
      <div className="flex justify-between items-center shrink-0 h-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500 rounded-lg border border-amber-200 dark:border-amber-500/20">
              <Users size={16} />
            </span>
            فريق العمل
          </h1>
          
          {/* View Toggles */}
          <div className="bg-gray-100 dark:bg-white/10 p-1 rounded-lg flex items-center gap-1">
             <button
                onClick={() => handleViewModeChange('dashboard')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-[#1a1c22] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                غرفة العمليات
             </button>
             <button
                onClick={() => handleViewModeChange('roster')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'roster' ? 'bg-white dark:bg-[#1a1c22] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                دليل الموظفين
             </button>
          </div>
        </div>

        <button 
            onClick={handleAddNewClick}
            className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-gray-900/10 active:scale-95"
        >
          <Plus size={14} /> 
          <span>إضافة عضو جديد</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative">
          
          <AnimatePresence mode="wait">
            {viewMode === 'dashboard' ? (
                <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full grid grid-cols-4 grid-rows-12 gap-4"
                >
                      {/* Original Dashboard Layout */}
                      <div className="col-span-3 row-span-12 grid grid-rows-12 gap-4 min-h-0">
                          <div className="row-span-5 h-full min-h-0">
                             <WorkloadHeatmapWidget users={users} />
                          </div>
                          <div className="row-span-7 grid grid-cols-3 gap-4 min-h-0">
                              <div className="col-span-1 h-full min-h-0">
                                  <PerformanceLiveWidget />
                              </div>
                              <div className="col-span-1 h-full min-h-0">
                                  <ComplianceMonitorWidget />
                              </div>
                              <div className="col-span-1 h-full min-h-0">
                                  <SmartLeavesWidget users={users} />
                              </div>
                          </div>
                      </div>
                      <div className="col-span-1 row-span-12 h-full min-h-0">
                         <ActivityLogWidget />
                      </div>
                </motion.div>
            ) : (
                <motion.div 
                    key="roster"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full overflow-y-auto custom-scrollbar"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                        {users.map(user => (
                            <div key={user.id} className="bg-white dark:bg-[#1a1c22] rounded-2xl border border-gray-100 dark:border-white/5 p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                 {/* Helper Background for Role */}
                                 <div className={`absolute top-0 left-0 w-full h-1 bg-linear-to-r ${getRoleColor(user.role)} opacity-50`} />

                                 <div className="flex justify-between items-start mb-4 pt-2">
                                     <div className="flex gap-3">
                                         {/* Avatar */}
                                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-gray-200 ${user.avatar || 'bg-gray-400'}`}>
                                             {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                         </div>
                                         <div>
                                             <h3 className="font-bold text-gray-900 dark:text-gray-100">{user.name || 'بدون اسم'}</h3>
                                             <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5`}>
                                                    {RoleLabels[user.role]}
                                                </span>
                                             </div>
                                         </div>
                                     </div>
                                     
                                     {/* Actions Dropdown */}
                                     <div className="relative group/menu">
                                         <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                                             <MoreVertical size={16} />
                                         </button>
                                     {/* Hover Menu */}
                                         <div className="absolute top-8 left-0 w-32 bg-white dark:bg-[#2a2d35] rounded-xl shadow-xl border border-gray-100 dark:border-white/5 p-1 hidden group-hover/menu:block z-20">
                                             <button 
                                                onClick={() => handleEditClick(user)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors text-right"
                                             >
                                                تعديل
                                             </button>
                                             <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 transition-colors text-right"
                                             >
                                                حذف
                                             </button>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Job Title / Label */}
                                 {user.jobTitle && (
                                     <div className="mb-4">
                                         <span className="text-[10px] text-gray-400 block mb-0.5">المسمى الوظيفي</span>
                                         <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                             <Briefcase size={12} className="text-gray-400" />
                                             {user.jobTitle}
                                         </span>
                                     </div>
                                 )}

                                 <div className="flex flex-col gap-2 mt-2">
                                     <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                                         <span className="text-[10px] text-gray-500">رمز الدخول (PIN)</span>
                                         <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono tracking-widest bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-gray-100 dark:border-white/5">
                                            {user.password ? '•'.repeat(user.password.length) : '••••'}
                                         </span>
                                     </div>

                                     <button 
                                        onClick={() => handleEditClick(user)}
                                        className="w-full h-9 mt-2 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                     >
                                         <Key size={14} />
                                         تعديل الحساب
                                     </button>
                                 </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Modal */}
      <StaffManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        initialData={editingUser}
        mode={editingUser ? 'edit' : 'add'}
      />

    </div>
  );
};

const getRoleColor = (role: UserRole) => {
    switch (role) {
        case UserRole.MANAGER: return 'from-amber-500 to-orange-600';
        case UserRole.ADMIN: return 'from-purple-500 to-indigo-600';
        case UserRole.RECEPTION: return 'from-[#C94557] to-[#B3434F]';
        case UserRole.PHOTO_EDITOR: return 'from-blue-500 to-cyan-600';
        case UserRole.VIDEO_EDITOR: return 'from-emerald-500 to-teal-600';
        case UserRole.PRINTER: return 'from-indigo-500 to-violet-600';
        default: return 'from-gray-500 to-gray-600';
    }
}

export default ManagerTeamView;
