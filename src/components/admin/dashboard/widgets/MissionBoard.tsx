
import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

const MissionBoard: React.FC<{ tasks: any[], onToggle: (id: string) => void }> = ({ tasks, onToggle }) => {
    return (
        <div className="h-full w-full bg-[#0B0E14]/60 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-5 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black text-sm flex items-center gap-2 uppercase tracking-tighter">
                    <Target size={18} className="text-rose-500 shadow-[0_0_10px_#f43f5e]" />
                    المهام التوجيهية
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 opacity-50">#SENTINEL_PROTO</span>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 no-scrollbar">
                {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-start gap-4 group/item">
                         <button 
                            onClick={() => onToggle(task.id)}
                            className={`mt-1 w-5 h-5 rounded border ${task.completed ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-cyan-500/30 hover:border-cyan-400 text-transparent'} flex items-center justify-center transition-all duration-500 shadow-[0_0_10px_rgba(0,242,255,0.1)]`}
                        >
                            {task.completed && <CheckCircle2 size={14} strokeWidth={3} />}
                        </button>
                        <div className="flex-1 border-b border-cyan-500/5 pb-3">
                             <p className={`text-[12px] font-black tracking-tight transition-all ${task.completed ? 'text-gray-600 line-through' : 'text-cyan-50 group-hover/item:text-cyan-400'}`}>
                                {task.text || task.title}
                             </p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${task.priority === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'}`}>
                                    {task.priority === 'high' ? 'أولوية قصوى' : 'عمليات روتينية'}
                                </span>
                                {/* God-Mode Actions */}
                                <div className="hidden group-hover/item:flex items-center gap-1 opacity-60 hover:opacity-100">
                                    <button className="text-[8px] px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded border border-white/5 transition-colors" title="Force Reassign">
                                        Reassign
                                    </button>
                                    <button className="text-[8px] px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded transition-colors" title="Override Lock">
                                        Unlock
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MissionBoard;
