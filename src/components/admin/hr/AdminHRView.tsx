import React, { useState } from 'react';
import AdminRosterView from './AdminRosterView';
import AdminPerformanceView from './AdminPerformanceView';
import AdminLeavesView from './AdminLeavesView';
import { Users, UserCheck, Trophy, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminHRView = () => {
    const [activeTab, setActiveTab] = useState<'roster' | 'performance' | 'leaves'>('roster');

    return (
        <div className="h-full flex flex-col font-sans p-6" dir="rtl">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                 <div>
                    <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                        <span className="p-3 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl">
                            <Users className="text-purple-500" size={24} />
                        </span>
                        غرفة قيادة الفريق (Team Command)
                    </h2>
                    <p className="text-zinc-500 font-medium text-xs tracking-wider uppercase">
                         LIVE ROSTER • PERFORMANCE METRICS • TACTICAL DISPATCH
                    </p>
                 </div>

                 {/* Tab Switcher */}
                 <div className="bg-zinc-900/60 p-1.5 border border-white/[0.06] flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 relative group ${
                            activeTab === 'roster'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <UserCheck size={18} className={activeTab === 'roster' ? 'text-green-400' : ''} />
                        <span className="text-sm font-bold">الرادار الحي</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 relative group ${
                            activeTab === 'performance'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Trophy size={18} className={activeTab === 'performance' ? 'text-yellow-400' : ''} />
                        <span className="text-sm font-bold">مؤشرات الأداء</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('leaves')}
                        className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 relative group ${
                            activeTab === 'leaves'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <CalendarDays size={18} className={activeTab === 'leaves' ? 'text-orange-400' : ''} />
                        <span className="text-sm font-bold">الإجازات</span>
                    </button>
                 </div>
            </div>

            {/* Content Area with Animation */}
            <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden relative shadow-2xl backdrop-blur-sm">
                <AnimatePresence mode='wait'>
                    <motion.div 
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                    >
                        {activeTab === 'roster' && <AdminRosterView />}
                        {activeTab === 'performance' && <AdminPerformanceView />}
                        {activeTab === 'leaves' && <AdminLeavesView />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminHRView;
