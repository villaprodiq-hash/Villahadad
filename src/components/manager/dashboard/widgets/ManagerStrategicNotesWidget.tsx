import React, { useState } from 'react';
import { Loader2, Zap, Search, Sparkles, Trash2, Share2 } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';

const ManagerStrategicNotesWidget = () => {
    const [note, setNote] = useState('');
    
    // Simplistic local storage persistence (could be improved later)
    React.useEffect(() => {
        const savedNote = localStorage.getItem('manager_strategic_note');
        if (savedNote) setNote(savedNote);
    }, []);

    const handleSave = (val: string) => {
        setNote(val);
        localStorage.setItem('manager_strategic_note', val);
    };

    return (
        <ManagerDashboardCard className="bg-[#fbbf24] text-gray-900 border-none relative overflow-hidden h-[283px] shadow-2xl flex flex-col p-0 group" dir="rtl" style={{ minHeight: '283px', maxHeight: '283px' }}>
            <div className="h-6 bg-amber-500/20 absolute top-0 left-0 right-0 z-10" />
            <div className="absolute inset-0 bg-linear-to-br from-white/30 to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="p-4 pt-8 pb-1 relative z-20 flex justify-between items-center">
                <h3 className="text-sm font-bold text-amber-900/80 font-tajawal flex items-center gap-2">
                    <Sparkles size={14} />
                    مفكرة استراتيجية
                </h3>
            </div>

            {/* Note Content */}
            <div className="flex-1 p-4 pt-2 relative z-20 flex flex-col overflow-hidden">
                <textarea 
                    value={note}
                    onChange={(e) => handleSave(e.target.value)}
                    className="w-full flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed font-handwriting text-gray-800 placeholder:text-gray-900/30 custom-scrollbar"
                    placeholder="اكتب ملاحظاتك وأفكارك هنا..."
                    dir="rtl"
                />
            </div>

            {/* Tape Effect */}
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-16 h-8 bg-white/40 -translate-y-1/2 rotate-3 backdrop-blur-sm border border-white/20 z-30" />
            
            {/* Footer */}
            <div className="p-3 pt-0 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-mono font-bold tracking-tighter">NI-STRAT-X</span>
                <div className="flex gap-2">
                    <Trash2 size={12} className="cursor-pointer hover:text-red-700 transition-colors" onClick={() => setNote('')} />
                    <Share2 size={12} className="cursor-pointer" />
                </div>
            </div>
        </ManagerDashboardCard>
    );
};

export default ManagerStrategicNotesWidget;
