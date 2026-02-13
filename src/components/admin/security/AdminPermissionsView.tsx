
import React, { useState } from 'react';
import { 
  Shield, Lock, Unlock, Users, AlertTriangle, 
  CheckCircle2, XCircle, Power, UserCog
} from 'lucide-react';
import { UserRole } from '../../../types';

const AdminPermissionsView = ({ theme = 'admin' }: { theme?: 'admin' | 'manager' }) => {
    // Mock Roles & Permissions Matrix
    const [roles, setRoles] = useState([
        { id: UserRole.MANAGER, name: 'المديرة', users: 1, permissions: { delete: true, export: true, edit_price: true, view_logs: true } },
        { id: UserRole.RECEPTION, name: 'الاستقبال', users: 2, permissions: { delete: false, export: false, edit_price: false, view_logs: false } },
        { id: UserRole.PHOTO_EDITOR, name: 'المحررين', users: 5, permissions: { delete: false, export: false, edit_price: false, view_logs: false } },
        { id: UserRole.PRINTER, name: 'الطباعة', users: 1, permissions: { delete: false, export: false, edit_price: false, view_logs: false } },
    ]);

    // Mock Active Users for "Freeze" action
    const [activeUsers, setActiveUsers] = useState([
        { id: 'u1', name: 'Sarah (Manager)', role: UserRole.MANAGER, status: 'active' },
        { id: 'u2', name: 'Noor (Reception)', role: UserRole.RECEPTION, status: 'active' },
        { id: 'u3', name: 'Ali (Editor)', role: UserRole.PHOTO_EDITOR, status: 'active' },
        { id: 'u4', name: 'Zainab (Reception)', role: UserRole.RECEPTION, status: 'frozen' },
    ]);

    const isManager = theme === 'manager';
    const themeColors = {
        primary: isManager ? 'amber-500' : 'indigo-500',
        primaryText: isManager ? 'text-amber-500' : 'text-indigo-500', 
        primaryBg: isManager ? 'bg-amber-500' : 'bg-indigo-500',
        border: isManager ? 'border-amber-500' : 'border-indigo-500',
        lightText: isManager ? 'text-amber-400' : 'text-indigo-400',
        lightBg: isManager ? 'bg-amber-500/10' : 'bg-indigo-500/10',
        shadow: isManager ? 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'shadow-[0_0_20px_rgba(99,102,241,0.1)]',
        glow: isManager ? 'shadow-[0_0_10px_#f59e0b]' : 'shadow-[0_0_10px_#6366f1]',
    };

    const togglePermission = (roleId: string, perm: string) => {
        setRoles(roles.map(r => {
            if (r.id === roleId) {
                return { 
                    ...r, 
                    permissions: { ...r.permissions, [perm]: !r.permissions[perm as keyof typeof r.permissions] } 
                };
            }
            return r;
        }));
    };

    const toggleFreeze = (userId: string) => {
        setActiveUsers(activeUsers.map(u => {
            if (u.id === userId) {
                return { ...u, status: u.status === 'active' ? 'frozen' : 'active' };
            }
            return u;
        }));
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono" dir="rtl">
            
            {/* Header */}
            <div className={`bg-[#0B0E14]/60 backdrop-blur-3xl border ${themeColors.border}/20 rounded-4xl p-6 mb-6`}>
                <div className="flex items-center gap-4">
                    <div className={`p-4 ${themeColors.lightBg} rounded-2xl ${themeColors.lightText} border ${themeColors.border}/20 ${themeColors.shadow}`}>
                        <Lock size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">التحكم بالصلاحيات (RBAC)</h2>
                        <p className={`text-[10px] ${themeColors.lightText}/50 font-mono tracking-widest uppercase`}>مصفوفة الصلاحيات الديناميكية & تجميد الحسابات</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
                
                {/* Left: Permission Matrix */}
                <div className="col-span-12 lg:col-span-8 bg-[#0B0E14]/60 border border-white/5 rounded-4xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider">
                            <Shield size={16} className={themeColors.lightText} />
                            جدول الصلاحيات
                        </h3>
                        <span className="text-[9px] text-gray-500 font-mono">تحديث فوري للسيرفر</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className={`border-b ${themeColors.border}/10 text-[10px] text-gray-400 uppercase tracking-widest`}>
                                    <th className="py-4 px-4 font-black">الدور الوظيفي</th>
                                    <th className="py-4 px-4 font-black text-center text-rose-400">حذف البيانات</th>
                                    <th className="py-4 px-4 font-black text-center text-amber-400">تعديل الأسعار</th>
                                    <th className="py-4 px-4 font-black text-center text-cyan-400">تصدير الملفات</th>
                                    <th className="py-4 px-4 font-black text-center text-purple-400">كشف السجلات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {roles.map(role => (
                                    <tr key={role.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${themeColors.lightText}`}>
                                                    <Users size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white mb-0.5">{role.name}</p>
                                                    <p className="text-[8px] text-gray-500 font-mono">{role.users} Active Users</p>
                                                </div>
                                            </div>
                                        </td>
                                        {['delete', 'edit_price', 'export', 'view_logs'].map(perm => (
                                            <td key={perm} className="py-4 px-4 text-center">
                                                <button 
                                                    onClick={() => togglePermission(role.id, perm)}
                                                    className={`w-12 h-6 rounded-full border transition-all relative ${role.permissions[perm as keyof typeof role.permissions] ? `${themeColors.lightBg} ${themeColors.border}` : 'bg-black/40 border-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-3.5 h-3.5 rounded-full transition-all ${role.permissions[perm as keyof typeof role.permissions] ? `left-1 ${isManager ? 'bg-amber-400' : 'bg-indigo-400'} ${themeColors.glow}` : 'right-1 bg-gray-600'}`}></div>
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Emergency Actions (Freeze) */}
                <div className="col-span-12 lg:col-span-4 bg-rose-950/10 border border-rose-500/20 rounded-4xl p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.1),transparent_50%)] pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="flex items-center gap-2 text-sm font-black text-rose-400 uppercase tracking-wider">
                            <AlertTriangle size={16} />
                            منطقة الخطر
                        </h3>
                    </div>

                    <div className="flex-1 space-y-4 relative z-10 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                        {activeUsers.map(user => (
                            <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${user.status === 'frozen' ? 'bg-rose-500/10 border-rose-500' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${user.status === 'frozen' ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold ${user.status === 'frozen' ? 'text-rose-400' : 'text-gray-200'}`}>{user.name}</p>
                                        <p className="text-[8px] text-gray-500 font-mono uppercase">{user.role}</p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => toggleFreeze(user.id)}
                                    className={`p-2 rounded-lg transition-all ${user.status === 'frozen' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'}`}
                                    title={user.status === 'frozen' ? 'Unlock Account' : 'Freeze Account'}
                                >
                                    {user.status === 'frozen' ? <Unlock size={14} /> : <Power size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-rose-500/20">
                        <p className="text-[9px] text-rose-400/60 font-mono leading-relaxed">
                            <strong className="text-rose-400">تنبيه:</strong> تجميد الحساب سيقوم بطرد المستخدم فوراً من النظام ومنعه من تسجيل الدخول حتى إعادة التفعيل.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPermissionsView;
