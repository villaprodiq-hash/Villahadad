
import React, { useState } from 'react';
import { 
  ArrowRight, User as UserIcon, 
  Layers, Clock, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TaskPriority = 'critical' | 'high' | 'normal';

interface DispatchTask {
  id: string;
  priority: TaskPriority;
  type: string;
  duration: string;
  title: string;
}

interface StaffMember {
  id: string;
  name: string;
  tasks: DispatchTask[];
  load: number;
}

const TaskDispatcher = () => {
    // ✅ PRODUCTION: Empty initial state - tasks come from task service
    const [tasks, setTasks] = useState<DispatchTask[]>([]);

    // ✅ PRODUCTION: Staff will be populated from users service
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, staffId: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        
        // Move task logic
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setStaffMembers(prev => prev.map(s => {
                if (s.id === staffId) {
                    return { ...s, tasks: [...s.tasks, task], load: s.load + 1 };
                }
                return s;
            }));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="h-full flex gap-6 p-2 font-sans overflow-hidden" dir="rtl">
            
            {/* 1. Unassigned Tasks Queue */}
            <div className="w-1/3 flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4">
                 <h3 className="text-zinc-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Layers size={16} /> مهام معلقة ({tasks.length})
                 </h3>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    <AnimatePresence>
                        {tasks.map(task => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                draggable
                                onDragStartCapture={e => handleDragStart(e as React.DragEvent<HTMLDivElement>, task.id)}
                                className={`p-4 rounded-xl border cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform ${
                                    task.priority === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                    task.priority === 'high' ? 'bg-amber-500/10 border-amber-500/30' :
                                    'bg-zinc-800/50 border-zinc-700/50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                        task.priority === 'critical' ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300'
                                    }`}>{task.type}</span>
                                    <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={10} /> {task.duration}</span>
                                </div>
                                <h4 className="text-white font-bold text-sm">{task.title}</h4>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {tasks.length === 0 && (
                        <div className="text-center py-10 text-zinc-600 italic">
                            لا توجد مهام معلقة
                        </div>
                    )}
                 </div>
            </div>

            {/* 2. Dispatch Area (Arrow Animation) */}
            <div className="flex flex-col items-center justify-center">
                 <div className="w-px h-full bg-linear-to-b from-transparent via-white/10 to-transparent"></div>
                 <div className="absolute">
                    <ArrowRight className="text-zinc-600 animate-pulse" />
                 </div>
            </div>

            {/* 3. Available Staff */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <h3 className="text-zinc-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <UserIcon size={16} /> الفريق المتاح (إسقاط المهام هنا)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {staffMembers.map(staff => (
                        <div 
                            key={staff.id}
                            onDrop={(e) => handleDrop(e, staff.id)}
                            onDragOver={handleDragOver}
                            className="bg-zinc-900 border border-white/5 rounded-2xl p-5 hover:border-blue-500/50 transition-colors group relative dashed-border-on-hover"
                        >
                            {/* Drag Hint Overlay */}
                            <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                                <span className="text-blue-400 font-black text-sm">إسقاط لإسناد المهمة</span>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                    <span className="text-lg font-bold text-zinc-400">{staff.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">{staff.name}</h4>
                                    <div className="flex gap-2 text-xs mt-1">
                                        <span className="text-zinc-500">{staff.tasks.length} مهام نشطة</span>
                                        <span className={`font-bold ${staff.load > 3 ? 'text-red-400' : 'text-green-400'}`}>
                                            {staff.load > 3 ? 'ضغط عالي' : 'متاح'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Tasks Preview */}
                            <div className="space-y-2 mt-2">
                                {staff.tasks.slice(-2).map(task => (
                                    <div key={task.id} className="text-xs bg-black/20 p-2 rounded flex justify-between items-center text-zinc-400">
                                        <span>{task.title}</span>
                                        <CheckCircle2 size={10} className="text-green-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default TaskDispatcher;
