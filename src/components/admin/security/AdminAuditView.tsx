import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Search, Trash2, AlertTriangle, 
  FileText, DollarSign, Clock, Filter, ChevronDown
} from 'lucide-react';
import { Booking, User } from '../../../types';

interface AdminAuditViewProps {
    bookings: Booking[];
    users: User[];
}

type AuditSeverity = 'info' | 'medium' | 'high' | 'critical';

interface AuditLogEntry {
    id: string;
    timestamp: string;
    actorId?: string;
    action: string;
    target: string;
    targetId: string;
    severity: AuditSeverity;
    details: string;
}

const AdminAuditView: React.FC<AdminAuditViewProps> = ({ bookings, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 1. Synthesize Logs from Bookings Data
    const realLogs = useMemo(() => {
        const logs: AuditLogEntry[] = [];
        
        bookings.forEach(b => {
             // A. Creation Log
             if (b.createdAt) {
                 logs.push({
                     id: `CRE-${b.id.slice(0,4)}`,
                     timestamp: b.createdAt,
                     actorId: b.created_by,
                     action: 'CREATED_BOOKING',
                     target: b.title || 'Booking',
                     targetId: b.id,
                     severity: 'info',
                     details: `Created booking for ${b.clientName}`
                 });
             }

             // B. Update Log
             if (b.updated_at && b.updated_at !== b.createdAt) {
                 logs.push({
                    id: `UPD-${b.id.slice(0,4)}`,
                    timestamp: b.updated_at,
                    actorId: b.updated_by,
                    action: 'UPDATED_BOOKING',
                    target: b.title || 'Booking',
                    targetId: b.id,
                    severity: 'medium',
                    details: `Updated details for ${b.clientName}`
                });
             }

             // C. Status History Logs
             if (b.statusHistory && b.statusHistory.length > 0) {
                 b.statusHistory.forEach((h, idx) => {
                     logs.push({
                         id: `STS-${b.id.slice(0,4)}-${idx}`,
                         timestamp: h.timestamp,
                         actorId: h.userId, // Assuming statusHistory saves userId
                         action: `STATUS: ${h.status.toUpperCase()}`,
                         target: b.title,
                         targetId: b.id,
                         severity: 'high',
                         details: h.notes || `Changed status to ${h.status}`
                     });
                 });
             }
        });

        // Add Mock System Logs for variety if needed, or stick to real data
        // ...

        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [bookings]);

    const getActorName = (id?: string) => {
        if (!id) return 'System';
        return users.find(u => u.id === id)?.name || id || 'Unknown Staff';
    };

    const getSeverityColor = (severity: AuditSeverity) => {
        switch(severity) {
            case 'critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
        }
    };

    const getIcon = (action: string) => {
        if (action.includes('DELETE')) return <Trash2 size={14} />;
        if (action.includes('PRICE') || action.includes('FINANCE')) return <DollarSign size={14} />;
        if (action.includes('STATUS')) return <ActivityIcon action={action} />;
        if (action.includes('CREATED')) return <FileText size={14} />;
        return <Clock size={14} />;
    };
    
    // Helper icon component
    const ActivityIcon = ({action}: {action:string}) => {
        if(action.includes('CONFIRMED')) return <AlertTriangle size={14} className="text-emerald-500" />
        return <Clock size={14} />
    }

    const filteredLogs = realLogs.filter(log => {
        // Search
        const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              log.target.toLowerCase().includes(searchTerm.toLowerCase());
        // Staff Filter
        const matchesStaff = selectedStaff === 'all' || log.actorId === selectedStaff;
        
        return matchesSearch && matchesStaff;
    });

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 font-mono" dir="rtl">
            
            {/* Header */}
            <div className="bg-[#0B0E14]/60 backdrop-blur-3xl border border-rose-500/20 rounded-4xl p-6 mb-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">سجل نشاط الموظفين</h2>
                            <p className="text-[10px] text-rose-400/50 font-mono tracking-widest uppercase">Staff Activity Logs & Audit Trail</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        
                         {/* Staff Filter Dropdown */}
                         <div className="relative z-20">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-black/40 border border-rose-500/10 rounded-xl text-[10px] text-gray-300 hover:text-white transition-colors min-w-[140px] justify-between"
                            >
                                <span className="flex items-center gap-2">
                                    <Filter size={14} className="text-rose-500" />
                                    {selectedStaff === 'all' ? 'كل الموظفين' : getActorName(selectedStaff)}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                            
                            {isFilterOpen && (
                                <div className="absolute top-full mt-2 w-full bg-[#1A1D24] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    <button onClick={() => { setSelectedStaff('all'); setIsFilterOpen(false); }} className="w-full text-right px-4 py-2 text-[10px] text-gray-300 hover:bg-white/5 border-b border-white/5">كل الموظفين</button>
                                    {users.map(u => (
                                        <button key={u.id} onClick={() => { setSelectedStaff(u.id); setIsFilterOpen(false); }} className="w-full text-right px-4 py-2 text-[10px] text-gray-300 hover:bg-white/5 flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-gray-700 overflow-hidden">
                                                {u.avatar && <img src={u.avatar} className="w-full h-full object-cover"/>}
                                            </div>
                                            {u.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>

                        <div className="relative group flex-1 lg:min-w-[300px]">
                            <Search className="absolute right-4 top-2.5 text-rose-400/50 group-focus-within:text-rose-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="بحث في السجل..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-rose-500/10 rounded-xl pr-10 pl-4 py-2.5 text-[10px] font-mono text-rose-50 placeholder:text-gray-700 focus:border-rose-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 bg-[#0B0E14]/60 border border-white/5 rounded-4xl overflow-hidden flex flex-col relative">
                 <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/5 bg-black/20 text-[9px] font-black text-gray-500 uppercase tracking-widest sticky top-0 z-10 text-right">
                    <div className="col-span-2">الوقت / التاريخ</div>
                    <div className="col-span-2">الموظف</div>
                    <div className="col-span-3">الإجراء</div>
                    <div className="col-span-3">التفاصيل</div>
                    <div className="col-span-2 text-left">الحالة</div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-1">
                    {filteredLogs.length > 0 ? filteredLogs.map((log, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center px-6 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-rose-500/5 hover:border-rose-500/20 transition-all cursor-pointer group">
                             <div className="col-span-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="text-[8px] text-gray-600 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                                </div>
                             </div>
                             
                             <div className="col-span-2">
                                <span className="text-[10px] font-bold text-cyan-400">{getActorName(log.actorId)}</span>
                             </div>

                             <div className="col-span-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${getSeverityColor(log.severity)} bg-opacity-20`}>
                                        {getIcon(log.action)}
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-gray-300">{log.action}</span>
                                </div>
                             </div>

                             <div className="col-span-3">
                                <p className="text-[10px] text-gray-400 truncate" title={log.details}>{log.details}</p>
                                <p className="text-[8px] text-gray-600 font-mono mt-0.5">{log.target}</p>
                             </div>

                             <div className="col-span-2 flex justify-end">
                                <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${getSeverityColor(log.severity)}`}>
                                    {log.severity}
                                </span>
                             </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500 opacity-50">
                            <Clock size={32} className="mb-2" />
                            <p className="text-xs font-mono">NO_RECORDS_FOUND</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default AdminAuditView;
