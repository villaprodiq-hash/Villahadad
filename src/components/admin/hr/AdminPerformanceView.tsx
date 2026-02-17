import React from 'react';
import { 
  Target, Award, Crown,
  Users, Briefcase, Camera, Video, Printer, Shield, Palette,
  CheckCircle2, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useData } from '../../../hooks/useData';
import { UserRole, RoleLabels, BookingStatus } from '../../../types';

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case UserRole.MANAGER: return <Shield size={18} className="text-amber-500" />;
    case UserRole.ADMIN: return <Shield size={18} className="text-purple-500" />;
    case UserRole.RECEPTION: return <Briefcase size={18} className="text-rose-500" />;
    case UserRole.PHOTO_EDITOR: return <Camera size={18} className="text-blue-500" />;
    case UserRole.VIDEO_EDITOR: return <Video size={18} className="text-emerald-500" />;
    case UserRole.PRINTER: return <Printer size={18} className="text-indigo-500" />;
    default: return <Palette size={18} className="text-gray-500" />;
  }
};

const getRoleGradient = (role: UserRole) => {
  switch (role) {
    case UserRole.MANAGER: return 'from-amber-600/30 via-orange-500/15 to-transparent border-amber-500/20';
    case UserRole.ADMIN: return 'from-purple-600/30 via-indigo-500/15 to-transparent border-purple-500/20';
    case UserRole.RECEPTION: return 'from-rose-600/30 via-pink-500/15 to-transparent border-rose-500/20';
    case UserRole.PHOTO_EDITOR: return 'from-blue-600/30 via-cyan-500/15 to-transparent border-blue-500/20';
    case UserRole.VIDEO_EDITOR: return 'from-emerald-600/30 via-teal-500/15 to-transparent border-emerald-500/20';
    case UserRole.PRINTER: return 'from-indigo-600/30 via-violet-500/15 to-transparent border-indigo-500/20';
    default: return 'from-zinc-600/30 via-zinc-500/15 to-transparent border-zinc-500/20';
  }
};

const getRoleAccent = (role: UserRole) => {
  switch (role) {
    case UserRole.MANAGER: return 'text-amber-400';
    case UserRole.ADMIN: return 'text-purple-400';
    case UserRole.RECEPTION: return 'text-rose-400';
    case UserRole.PHOTO_EDITOR: return 'text-blue-400';
    case UserRole.VIDEO_EDITOR: return 'text-emerald-400';
    case UserRole.PRINTER: return 'text-indigo-400';
    default: return 'text-zinc-400';
  }
};

const AdminPerformanceView = () => {
    const { users } = useAuth();
    const { bookings } = useData();

    // Calculate real metrics per user
    const staffPerformance = (users || []).map(user => {
        // Count bookings associated with this user
        const userBookings = bookings.filter(b => 
            b.clientId === user.id || 
            b.details?.assignedTo === user.id ||
            b.details?.photographer === user.name ||
            b.details?.editor === user.name
        );

        const completedBookings = bookings.filter(
            b => b.status === BookingStatus.DELIVERED || b.status === BookingStatus.ARCHIVED
        );

        // Calculate a performance score based on role
        const totalBookings = bookings.length;
        const completionRate = totalBookings > 0 
            ? Math.round((completedBookings.length / totalBookings) * 100) 
            : 0;

        return {
            id: user.id,
            name: user.name || 'بدون اسم',
            role: user.role,
            roleLabel: RoleLabels[user.role] || user.role,
            jobTitle: user.jobTitle || RoleLabels[user.role],
            avatar: user.avatar,
            bookingsHandled: userBookings.length,
            completionRate,
        };
    });

    // Summary stats
    const totalStaff = staffPerformance.length;
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(
        b => b.status === BookingStatus.DELIVERED || b.status === BookingStatus.ARCHIVED
    ).length;
    const activeBookings = bookings.filter(b => 
        b.status !== BookingStatus.DELIVERED &&
        b.status !== BookingStatus.ARCHIVED &&
        !b.deletedAt
    ).length;

    return (
        <div className="h-full flex flex-col font-sans overflow-hidden" dir="rtl">
            
            {/* Header with Summary Stats */}
            <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <div className="p-2 bg-linear-to-br from-amber-500/20 to-orange-600/20 rounded-xl border border-amber-500/20">
                            <BarChart3 className="text-amber-500" size={20} />
                        </div>
                        مؤشرات أداء الفريق
                    </h3>
                </div>

                {/* KPI Summary Bar */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-blue-400">{totalStaff}</div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-0.5">أعضاء الفريق</div>
                    </div>
                    <div className="bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-emerald-400">{totalBookings}</div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-0.5">إجمالي الحجوزات</div>
                    </div>
                    <div className="bg-linear-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-amber-400">{activeBookings}</div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-0.5">حجوزات نشطة</div>
                    </div>
                    <div className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-3 text-center">
                        <div className="text-2xl font-black text-purple-400">{completedBookings}</div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-0.5">مكتملة</div>
                    </div>
                </div>
            </div>

            {/* Staff Cards */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {staffPerformance.map((staff, index) => (
                        <motion.div 
                            key={staff.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.06 }}
                            className={`relative group rounded-2xl p-5 border bg-linear-to-br ${getRoleGradient(staff.role as UserRole)} backdrop-blur-xl shadow-lg overflow-hidden hover:-translate-y-1 transition-transform duration-300`}
                        >
                            {/* Shiny hover effect */}
                            <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            {/* Header: Avatar + Name */}
                            <div className="flex items-start gap-3 mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl border-2 border-white/10 shadow-lg overflow-hidden bg-black/30 flex items-center justify-center shrink-0">
                                    <span className="text-xl font-black text-white/40">
                                        {staff.name.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-sm font-black text-white truncate">{staff.name}</h2>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {getRoleIcon(staff.role as UserRole)}
                                        <span className="text-[10px] font-bold text-zinc-400">{staff.roleLabel}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Job Title */}
                            {staff.jobTitle && (
                                <div className="mb-3 px-2 py-1 bg-white/5 rounded-lg border border-white/5 relative z-10">
                                    <span className="text-[10px] text-zinc-400">{staff.jobTitle}</span>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="space-y-2 relative z-10">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">الحجوزات</span>
                                    <span className={`text-sm font-black ${getRoleAccent(staff.role as UserRole)}`}>
                                        {staff.bookingsHandled}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">الإنجاز</span>
                                    <span className={`text-sm font-black ${
                                        staff.completionRate >= 80 ? 'text-emerald-400' :
                                        staff.completionRate >= 50 ? 'text-amber-400' :
                                        'text-zinc-400'
                                    }`}>
                                        {staff.completionRate}%
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Badge */}
                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-1">
                                    {staff.completionRate >= 80 ? (
                                        <>
                                            <Crown size={10} className="text-amber-500" />
                                            <span className="text-[9px] text-amber-400 font-bold">متميز</span>
                                        </>
                                    ) : staff.completionRate >= 50 ? (
                                        <>
                                            <Award size={10} className="text-blue-500" />
                                            <span className="text-[9px] text-blue-400 font-bold">جيد</span>
                                        </>
                                    ) : (
                                        <>
                                            <Target size={10} className="text-zinc-500" />
                                            <span className="text-[9px] text-zinc-400 font-bold">قيد التطوير</span>
                                        </>
                                    )}
                                </div>
                                <CheckCircle2 size={12} className="text-emerald-500/30" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {staffPerformance.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Users size={48} className="text-zinc-700 mb-4" />
                        <p className="text-zinc-500 font-bold">لا يوجد أعضاء فريق</p>
                        <p className="text-xs text-zinc-600 mt-1">أضف أعضاء الفريق من قسم إدارة الموظفين</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPerformanceView;
