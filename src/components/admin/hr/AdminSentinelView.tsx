
import React, { useState, useEffect } from 'react';
import {
  Eye, Clock, Activity, TrendingUp, TrendingDown,
  Users, CheckCircle2, XCircle, AlertTriangle, Zap,
  Briefcase, Camera, Video, Printer as PrinterIcon, Shield, Palette
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../providers/AuthProvider';
import { useData } from '../../../providers/DataProvider';
import { UserRole } from '../../../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const getRoleLabel = (role: string) => {
  switch (role) {
    case UserRole.MANAGER: return 'المديرة';
    case UserRole.ADMIN: return 'المشرف';
    case UserRole.RECEPTION: return 'الاستقبال';
    case UserRole.PHOTO_EDITOR: return 'مصمم صور';
    case UserRole.VIDEO_EDITOR: return 'مونتير';
    case UserRole.PRINTER: return 'الطباعة';
    case UserRole.SELECTOR: return 'الانتقاء';
    default: return role;
  }
};

const getRoleColor = (role: string) => {
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

const getRoleBg = (role: string) => {
  switch (role) {
    case UserRole.MANAGER: return 'bg-amber-500/10 border-amber-500/20';
    case UserRole.ADMIN: return 'bg-purple-500/10 border-purple-500/20';
    case UserRole.RECEPTION: return 'bg-rose-500/10 border-rose-500/20';
    case UserRole.PHOTO_EDITOR: return 'bg-blue-500/10 border-blue-500/20';
    case UserRole.VIDEO_EDITOR: return 'bg-emerald-500/10 border-emerald-500/20';
    case UserRole.PRINTER: return 'bg-indigo-500/10 border-indigo-500/20';
    default: return 'bg-zinc-500/10 border-zinc-500/20';
  }
};

const AdminSentinelView = () => {
    const { users } = useAuth();
    const { bookings } = useData();
    const [productivityData, setProductivityData] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [employeeActions, setEmployeeActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const { electronBackend } = await import('../../../services/mockBackend');
            const [stats, todayAttendance, actions] = await Promise.all([
                electronBackend.getProductivityStats(),
                electronBackend.getTodayAttendance(),
                electronBackend.getEmployeeActionsToday(),
            ]);
            setProductivityData(stats);
            setAttendance(todayAttendance);
            setEmployeeActions(actions);
            setLoading(false);
        };
        loadData();
    }, []);

    // Build employee performance data from real data
    const staffList = (users || []).filter(u => u.role !== UserRole.ADMIN);

    const getEmployeeStats = (userId: string) => {
        const actionEntry = employeeActions.find(a => String(a.userId) === userId);
        const actionsToday = actionEntry ? Number(actionEntry.actionCount) : 0;

        const attendanceEntry = attendance.find(a => String(a.userId) === userId);
        const checkIn = attendanceEntry?.checkIn || null;
        const checkOut = attendanceEntry?.checkOut || null;
        const status = attendanceEntry?.status || 'غير مسجل';

        // Calculate lateness (assuming work starts at 09:00)
        let lateMinutes = 0;
        if (checkIn) {
            const [h, m] = checkIn.split(':').map(Number);
            const checkInMinutes = h * 60 + m;
            const startMinutes = 9 * 60; // 09:00
            if (checkInMinutes > startMinutes) {
                lateMinutes = checkInMinutes - startMinutes;
            }
        }

        // Bookings assigned to this user
        const assignedBookings = bookings.filter(b =>
            b.assignedShooter === userId ||
            b.assignedPhotoEditor === userId ||
            b.assignedPrinter === userId ||
            b.assignedReceptionist === userId ||
            b.createdBy === userId
        );

        const completedBookings = assignedBookings.filter(b =>
            b.status === 'delivered' || b.status === 'completed'
        );

        return {
            actionsToday,
            checkIn,
            checkOut,
            status,
            lateMinutes,
            totalBookings: assignedBookings.length,
            completedBookings: completedBookings.length,
        };
    };

    // Summary counts
    const totalPresent = attendance.filter(a => a.status === 'Present' || a.checkIn).length;
    const totalLate = attendance.filter(a => {
        if (!a.checkIn) return false;
        const [h, m] = a.checkIn.split(':').map(Number);
        return (h * 60 + m) > (9 * 60);
    }).length;
    const totalAbsent = staffList.length - totalPresent;
    const totalActions = employeeActions.reduce((sum, a) => sum + Number(a.actionCount || 0), 0);

    if (loading) return <div className="h-full flex items-center justify-center text-zinc-500">جارِ التحميل...</div>;

    return (
        <div className="h-full flex flex-col font-sans p-4 gap-4" dir="rtl">

            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 border border-red-500/20">
                             <Eye className="text-red-500" size={22} />
                        </div>
                        مراقبة أداء الموظفين
                     </h2>
                     <p className="text-zinc-500 text-xs tracking-wider mt-1">
                         بيانات حية من النظام
                     </p>
                </div>
                <div className="flex items-center gap-3">
                     <div className="px-3 py-1.5 bg-zinc-900 border border-white/[0.06] text-xs text-zinc-400 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                        {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </div>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Users size={16} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-500">الفريق</span>
                    </div>
                    <div className="text-2xl font-black text-white">{staffList.length}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">عدد الموظفين</div>
                </div>
                <div className="bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] text-zinc-500">حاضر</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-400">{totalPresent}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">سجلوا حضور</div>
                </div>
                <div className="bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-[10px] text-zinc-500">متأخر</span>
                    </div>
                    <div className="text-2xl font-black text-amber-400">{totalLate}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">تأخروا اليوم</div>
                </div>
                <div className="bg-[#111] border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Zap size={16} className="text-blue-500" />
                        <span className="text-[10px] text-zinc-500">إجراءات</span>
                    </div>
                    <div className="text-2xl font-black text-blue-400">{totalActions}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">عملية اليوم</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

                {/* Productivity Chart */}
                <div className="col-span-12 lg:col-span-8 bg-[#111] border border-white/[0.06] p-5 flex flex-col">
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Activity className="text-yellow-500" size={16} />
                            نبض الإنتاجية - اليوم
                         </h3>
                         <span className="text-[10px] text-zinc-500">عدد الإجراءات بالساعة</span>
                     </div>

                     <div className="flex-1 w-full min-h-0">
                        {productivityData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={productivityData}>
                                  <defs>
                                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="time" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} />
                                  <Tooltip
                                      contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: 0 }}
                                      itemStyle={{ color: '#fbbf24' }}
                                  />
                                  <Area type="monotone" dataKey="actions" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorPulse)" />
                              </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                            لا توجد بيانات إنتاجية اليوم
                          </div>
                        )}
                     </div>
                </div>

                {/* Late Arrivals Today */}
                <div className="col-span-12 lg:col-span-4 bg-[#111] border border-white/[0.06] p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                        <Clock className="text-red-400" size={16} />
                        التأخيرات اليوم
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {staffList.map(user => {
                            const stats = getEmployeeStats(user.id);
                            if (stats.lateMinutes <= 0) return null;
                            return (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-bold">{user.name}</p>
                                            <p className={`text-[10px] ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-red-400 text-xs font-bold font-mono">{stats.lateMinutes} د</p>
                                        <p className="text-[10px] text-zinc-500">دخول: {stats.checkIn}</p>
                                    </div>
                                </div>
                            );
                        }).filter(Boolean)}

                        {staffList.every(u => getEmployeeStats(u.id).lateMinutes <= 0) && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle2 size={24} className="text-emerald-500/30 mb-2" />
                                <p className="text-zinc-500 text-xs">لا توجد تأخيرات اليوم</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Full Employee Table */}
                <div className="col-span-12 bg-[#111] border border-white/[0.06] p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Users className="text-zinc-400" size={16} />
                            جدول الموظفين - نظرة شاملة
                        </h3>
                        <span className="text-[10px] text-zinc-500">{staffList.length} موظف</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-right border-collapse">
                            <thead className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider border-b border-white/[0.06]">
                                <tr>
                                    <th className="py-3 px-3">الموظف</th>
                                    <th className="py-3 px-3">الوظيفة</th>
                                    <th className="py-3 px-3">الحضور</th>
                                    <th className="py-3 px-3">وقت الدخول</th>
                                    <th className="py-3 px-3">التأخير</th>
                                    <th className="py-3 px-3">إجراءات اليوم</th>
                                    <th className="py-3 px-3">حجوزات مسندة</th>
                                    <th className="py-3 px-3">مكتملة</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-zinc-300 divide-y divide-white/[0.03]">
                                {staffList.map(user => {
                                    const stats = getEmployeeStats(user.id);
                                    return (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold border border-white/10">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-white text-xs">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`text-xs ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</span>
                                            </td>
                                            <td className="py-3 px-3">
                                                {stats.checkIn ? (
                                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1">حاضر</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-1">غير مسجل</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-xs font-mono text-zinc-400">
                                                {stats.checkIn || '—'}
                                            </td>
                                            <td className="py-3 px-3">
                                                {stats.lateMinutes > 0 ? (
                                                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1">
                                                        {stats.lateMinutes} د
                                                    </span>
                                                ) : stats.checkIn ? (
                                                    <span className="text-[10px] text-emerald-400">في الوقت</span>
                                                ) : (
                                                    <span className="text-[10px] text-zinc-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-xs font-mono font-bold text-white">{stats.actionsToday}</td>
                                            <td className="py-3 px-3 text-xs font-mono text-zinc-400">{stats.totalBookings}</td>
                                            <td className="py-3 px-3 text-xs font-mono text-emerald-400">{stats.completedBookings}</td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {staffList.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users size={32} className="text-zinc-700 mb-3" />
                                <p className="text-zinc-500 text-sm">لا يوجد موظفين مسجلين</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSentinelView;
