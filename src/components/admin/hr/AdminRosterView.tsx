
import React, { useState, useEffect } from 'react';
import { 
  Clock, Wifi, MapPin, 
  Activity, MoreVertical, AlertTriangle
} from 'lucide-react';
import { attendanceService } from '../../../services/db/services/AttendanceService';
import { leaveService } from '../../../services/db/services/LeaveService';
import { motion } from 'framer-motion';

interface BaseStaffEntry {
  id: string;
  name: string;
  role: string;
  shift: string;
  avatar: string;
  device: string;
}

interface RosterEntry extends BaseStaffEntry {
  status: 'online' | 'offline' | 'holiday';
  checkIn: string;
  isLate: boolean;
  network: string | null;
  battery: number | null;
}

const INITIAL_STAFF: BaseStaffEntry[] = [
  { id: 'u1', name: 'سُرَى', role: 'مديرة', shift: '10:00 - 20:00', avatar: 'bg-purple-500', device: 'iPhone 15 Pro' },
  { id: 'u2', name: 'أحمد', role: 'مصور', shift: '12:00 - 22:00', avatar: 'bg-blue-500', device: 'Sony A7IV' },
  { id: 'u3', name: 'نور', role: 'استقبال', shift: '10:00 - 20:00', avatar: 'bg-pink-500', device: 'iPad Pro' },
  { id: 'u4', name: 'علي', role: 'مونتير', shift: '10:00 - 18:00', avatar: 'bg-orange-500', device: 'Mac Studio' },
  { id: 'u5', name: 'ياسر', role: 'طباعة', shift: '11:00 - 19:00', avatar: 'bg-cyan-500', device: 'Epson P9000' },
  { id: 'u6', name: 'هدى', role: 'مساعد', shift: '10:00 - 20:00', avatar: 'bg-emerald-500', device: 'Samsung S24' },
];

const AdminRosterView = () => {
    const [rosterData, setRosterData] = useState<RosterEntry[]>([]);

    useEffect(() => {
        const fetchAttendance = async () => {
            const todayRecords = await attendanceService.getAttendanceForToday();
            const activeLeaves = await leaveService.getAllLeaves();
            const todayDate = new Date().toISOString().slice(0, 10);

            const today = new Date();
            const isSunday = today.getDay() === 0;
            
            // Merge Static Config with Real Attendance
            const merged: RosterEntry[] = INITIAL_STAFF.map(staff => {
                const record = todayRecords.find(r => r.userName.includes(staff.name) || r.userId === staff.id);
                const recordHour = record?.checkIn ? parseInt(record.checkIn.split(':')[0] ?? '0', 10) : 0;
                const shiftHour = parseInt(staff.shift.split(':')[0] ?? '0', 10);
                const isLate = !isSunday && Boolean(record?.checkIn) && recordHour > shiftHour;
                
                // Check for Approved Leave
                const isOnLeave = activeLeaves.find(l => 
                    l.status === 'Approved' && 
                    l.userName.includes(staff.name) && // Ideally match by ID
                    l.startDate <= todayDate && 
                    l.endDate >= todayDate
                );

                if (record) {
                    return {
                        ...staff,
                        status: 'online', // Checked In
                        checkIn: new Date(record.checkIn || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isLate: Boolean(isLate),
                        network: 'Studio_5G_Pro',
                        battery: Math.floor(Math.random() * (100 - 60) + 60)
                    };
                }

                if (isOnLeave) {
                    return {
                        ...staff,
                        status: 'holiday', // Vacation Mode
                        checkIn: `إجازة (${isOnLeave.type === 'Sick' ? 'مرضية' : 'سنوية'})`,
                        isLate: false,
                        network: null,
                        battery: null
                    };
                }

                return {
                    ...staff,
                    // If Sunday and no record, they are on Holiday, not Offline/Absent
                    status: isSunday ? 'holiday' : 'offline',
                    checkIn: isSunday ? 'عطلة رسمية' : '--:--',
                    isLate: false,
                    network: null,
                    battery: null
                };
            });
            
            setRosterData(merged);
        };

        void fetchAttendance();
        const interval = setInterval(() => {
          void fetchAttendance();
        }, 10000); // Live update every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col font-sans" dir="rtl">
            
            {/* Radar Header */}
            <div className="flex items-center justify-between mb-6 px-2">
                <div>
                     <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Activity className="text-green-500 animate-pulse" /> 
                        الرادار الحي (Live Roster)
                     </h3>
                     <p className="text-zinc-500 text-xs font-mono mt-1">
                        MONITORING ACTIVE STAFF UNITS • STUDIO_NET_V2
                     </p>
                </div>
                <div className="flex gap-2 text-xs font-bold bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="flex items-center gap-1 text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {rosterData.filter(s => s.status === 'online').length} متصل
                    </span>
                    <span className="w-px h-4 bg-white/10"></span>
                    <span className="flex items-center gap-1 text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                        {rosterData.filter(s => s.status === 'offline').length} غير متصل
                    </span>
                </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar p-2">
                {rosterData.map(staff => (
                    <motion.div 
                        key={staff.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative group rounded-3xl p-5 border transition-all duration-300 ${
                            staff.status === 'online' 
                            ? 'bg-zinc-900/80 border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.05)]' 
                            : 'bg-zinc-900/40 border-white/5 opacity-60 grayscale'
                        }`}
                    >
                        {/* Status Indicator */}
                        <div className="flex justify-between items-start mb-4">
                            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${staff.avatar} bg-linear-to-br shadow-lg`}>
                                {staff.name.charAt(0)}
                                {staff.status === 'online' && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse"></span>
                                )}
                            </div>
                            <button className="text-zinc-500 hover:text-white transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="mb-4">
                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{staff.name}</h4>
                            <p className="text-zinc-400 text-xs font-medium">{staff.role}</p>
                        </div>

                        {/* Metrics */}
                        <div className="space-y-2">
                             {/* Shift & Check-in */}
                             <div className="flex items-center justify-between text-xs bg-black/20 p-2 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Clock size={12} />
                                    <span>{staff.shift}</span>
                                </div>
                                <div className={`font-mono font-bold ${staff.isLate ? 'text-red-400' : 'text-green-400'}`}>
                                    {staff.checkIn}
                                </div>
                             </div>

                             {/* Device & Network */}
                             <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={10} />
                                    <span>{staff.status === 'online' ? 'داخل الفيلا' : 'خارج النطاق'}</span>
                                </div>
                                {staff.status === 'online' && (
                                    <div className="flex items-center gap-1.5 text-blue-400/80">
                                        <Wifi size={10} />
                                        <span>{staff.network}</span>
                                    </div>
                                )}
                             </div>
                        </div>

                        {/* Late Badge */}
                        {staff.isLate && staff.status === 'online' && (
                            <div className="absolute top-4 left-4 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-500 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                متأخر
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminRosterView;
