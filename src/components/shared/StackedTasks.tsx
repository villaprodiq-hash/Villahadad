import React from 'react';
import { CheckCircle2, ListTodo, Plus, DollarSign, Camera, Monitor, Truck, Bell } from 'lucide-react';
import { DashboardTask, ReminderType, ReminderTypeLabels } from '../../types';

interface StackedTasksProps {
  tasks: DashboardTask[];
  onToggle: (id: string) => void;
  isManager?: boolean;
}

const StackedTasks: React.FC<StackedTasksProps> = ({ tasks, onToggle, isManager = false }) => {
  const completedCount = tasks.filter(t => t.completed).length;

  // تصنيف المهام: مهام العمل vs مهام عامة
  const workTasks = tasks.filter(t => ['payment', 'shooting', 'editing', 'delivery'].includes(t.type));
  const generalTasks = tasks.filter(t => t.type === 'general');

  const getTaskTheme = (type: ReminderType, completed: boolean) => {
    if (completed) {
      return {
        iconBg: isManager ? 'bg-green-50' : 'bg-green-500/10',
        iconColor: 'text-green-500',
        container: isManager 
          ? 'bg-white opacity-60 border-transparent shadow-none' 
          : 'bg-[#21242b] shadow-[inset_4px_4px_8px_#16181d,inset_-4px_-4px_8px_#2c3039] opacity-60 border border-transparent',
        icon: <CheckCircle2 size={12} strokeWidth={3} />
      };
    }
    const base = isManager 
      ? 'bg-white shadow-sm ring-1 ring-black/5 hover:ring-amber-200 hover:shadow-md' 
      : 'bg-[#21242b] shadow-[5px_5px_10px_#16181d,-5px_-5px_10px_#2c3039] border border-white/5 hover:shadow-[inset_4px_4px_8px_#16181d,inset_-2px_-2px_4px_#2c3039]';
    
    switch (type) {
      case 'payment':
        return {
          iconBg: isManager ? 'bg-green-50' : 'bg-green-500/20',
          iconColor: 'text-green-600',
          container: base,
          icon: <DollarSign size={12} />
        };
      case 'shooting':
        return {
          iconBg: isManager ? 'bg-amber-50' : 'bg-pink-500/20',
          iconColor: 'text-amber-600',
          container: base,
          icon: <Camera size={12} />
        };
      case 'editing':
        return {
          iconBg: isManager ? 'bg-blue-50' : 'bg-purple-500/20',
          iconColor: 'text-purple-600',
          container: base,
          icon: <Monitor size={12} />
        };
      case 'delivery':
        return {
          iconBg: isManager ? 'bg-purple-50' : 'bg-blue-500/20',
          iconColor: 'text-purple-600',
          container: base,
          icon: <Truck size={12} />
        };
      default:
        return {
          iconBg: isManager ? 'bg-gray-50' : 'bg-gray-500/20',
          iconColor: 'text-gray-500',
          container: base,
          icon: <Bell size={12} />
        };
    }
  };

  const renderTask = (task: DashboardTask) => {
    const theme = getTaskTheme(task.type, task.completed);
    return (
      <div 
        key={task.id} 
        onClick={() => onToggle(task.id)}
        className={`group flex items-center gap-2 cursor-pointer p-2 rounded-xl transition-all duration-200 ${theme.container}`}
      >
        {/* Icon/Type - نقطة ملونة صغيرة */}
        <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${theme.iconBg} ${theme.iconColor} shadow-inner`}>
          {theme.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className={`text-[12px] font-bold truncate transition-all ${task.completed ? 'text-gray-400 line-through' : (isManager ? 'text-gray-700' : 'text-white')}`}>
              {task.title}
            </p>
            <span className={`text-[8px] ${isManager ? 'text-gray-400' : 'text-gray-500'} font-mono font-bold ml-2`}>{task.time}</span>
          </div>
        </div>

        {/* Checkbox Visual */}
        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${task.completed ? 'border-green-500 bg-green-500 shadow-[0_0_8px_#22c55e]' : (isManager ? 'border-gray-200 group-hover:border-amber-400' : 'border-gray-600 group-hover:border-pink-500')}`}>
          {task.completed && <CheckCircle2 size={10} className="text-white" />}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full flex flex-col">
       {/* Main Card */}
       <div className={`${isManager ? 'bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white/40 ring-1 ring-white/60' : 'bg-[#21242b] rounded-[40px] shadow-[10px_10px_20px_#16181d,-10px_-10px_20px_#2c3039] border-white/5'} flex-1 p-5 flex flex-col border relative overflow-hidden transition-all duration-300`}>
          
          {/* Header */}
          <div className="flex justify-between items-center mb-3 shrink-0">
             <div className="flex items-center gap-2">
                <div className={`p-1.5 ${isManager ? 'bg-amber-100 text-amber-600' : 'bg-[#21242b] text-pink-500 shadow-[inset_3px_3px_6px_#16181d,inset_-3px_-3px_6px_#2c3039]'} rounded-lg`}>
                   <ListTodo size={16} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>المهام اليومية</h3>
                  <p className={`text-[9px] ${isManager ? 'text-gray-400' : 'text-gray-400'} font-bold`}>Today's To-Do</p>
                </div>
             </div>
             
             {/* Mini Progress */}
             <div className={`flex items-center gap-1.5 ${isManager ? 'bg-gray-100/50' : 'bg-[#21242b] shadow-[inset_2px_2px_4px_#16181d,inset_-2px_-2px_4px_#2c3039] border-white/5'} px-2 py-1 rounded-lg`}>
                <span className={`text-[11px] font-bold ${isManager ? 'text-gray-800' : 'text-white'}`}>{completedCount}</span>
                <span className="text-[9px] text-gray-500">/ {tasks.length}</span>
             </div>
          </div>

          {/* List - Two Columns Layout */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 p-1">
             {tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                   <CheckCircle2 size={28} className="opacity-20" />
                   <p className="text-[10px]">لا توجد مهام اليوم</p>
                </div>
             ) : (
                <div className="grid grid-cols-2 gap-3 h-full">
                  {/* النصف الأول: مهام العمل */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1 shrink-0">
                      <div className={`h-[1px] flex-1 ${isManager ? 'bg-gray-100' : 'bg-gradient-to-r from-transparent via-pink-500/30 to-transparent'}`}></div>
                      <span className={`text-[8px] font-bold ${isManager ? 'text-amber-600' : 'text-pink-500/60'} uppercase tracking-widest`}>مهام العمل</span>
                      <div className={`h-[1px] flex-1 ${isManager ? 'bg-gray-100' : 'bg-gradient-to-r from-transparent via-pink-500/30 to-transparent'}`}></div>
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                      {workTasks.length > 0 ? (
                        workTasks.map(renderTask)
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-[9px] text-gray-400">لا توجد مهام عمل</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* النصف الثاني: تذكيرات */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1 shrink-0">
                      <div className={`h-[1px] flex-1 ${isManager ? 'bg-gray-100' : 'bg-gradient-to-r from-transparent via-gray-500/30 to-transparent'}`}></div>
                      <span className={`text-[8px] font-bold ${isManager ? 'text-gray-500' : 'text-gray-500/60'} uppercase tracking-widest`}>تذكيرات</span>
                      <div className={`h-[1px] flex-1 ${isManager ? 'bg-gray-100' : 'bg-gradient-to-r from-transparent via-gray-500/30 to-transparent'}`}></div>
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                      {generalTasks.length > 0 ? (
                        generalTasks.map(renderTask)
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-[9px] text-gray-600">لا توجد تذكيرات</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
             )}
          </div>

          <button className={`w-full py-2 mt-2 ${isManager ? 'bg-gray-100/50 text-gray-500 hover:text-amber-500 hover:bg-white' : 'bg-[#21242b] text-gray-400 hover:text-pink-500 shadow-[5px_5px_10px_#16181d,-5px_-5px_10px_#2c3039] border-white/5'} rounded-xl transition-all text-[11px] font-bold shrink-0`}>
             <Plus size={14} /> إضافة مهمة جديدة
          </button>
       </div>
    </div>
  );
};

export default StackedTasks;