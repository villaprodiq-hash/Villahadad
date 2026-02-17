import React from 'react';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'normal' | 'low';
  dueDate: string;
  completed: boolean;
  assignedBy: string;
}

interface TasksWidgetProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  onAddTask: () => void;
}

import { Plus, ArrowLeft } from 'lucide-react';

const TasksWidget: React.FC<TasksWidgetProps> = ({ tasks, onToggleTask, newTaskText, setNewTaskText, onAddTask }) => {
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3 justify-between">
        <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">My Tasks</span>
        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
          {pendingTasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {/* Pending Tasks */}
        {pendingTasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onToggleTask(task.id)}
            className="w-full p-3 rounded-lg bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-transparent hover:border-blue-600/50 transition-all text-right"
          >
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-500 mt-0.5 shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-xs font-bold truncate">{task.title}</p>
                  {task.priority === 'high' && (
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  )}
                </div>
                
                {task.description && (
                  <p className="text-gray-500 text-[10px] truncate mb-1">{task.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-[9px] text-gray-600">
                  <Clock size={10} />
                  <span>{task.dueDate}</span>
                  <span>•</span>
                  <span>{task.assignedBy}</span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-2">
              <span className="text-gray-600 text-[10px] font-bold uppercase">Completed</span>
            </div>
            {completedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="w-full p-3 rounded-lg bg-[#1e1e1e] opacity-60 hover:opacity-100 transition-all text-right"
              >
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                    <CheckSquare size={12} className="text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs font-bold truncate line-through">{task.title}</p>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">No tasks assigned</p>
          </div>
        )}
      </div>

       {/* Add New Task Input */}
       <div className="p-2 border-t border-[#3d3d3d] bg-[#252525]">
           <div className="bg-[#1e1e1e] border border-[#3d3d3d] rounded-lg p-2 flex items-center gap-2 focus-within:border-blue-600/50 transition-colors">
              <Plus size={14} className="text-gray-500" />
              <input 
                 type="text" 
                 value={newTaskText}
                 onChange={(e) => setNewTaskText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
                 placeholder="إضافة مهمة..." 
                 className="flex-1 bg-transparent border-none p-0 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-0"
              />
              <button 
                 onClick={onAddTask} 
                 disabled={!newTaskText.trim()}
                 className={`p-1 rounded transition-colors ${newTaskText.trim() ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
              >
                 <ArrowLeft size={12} />
              </button>
           </div>
       </div>
    </div>
  );
};

export default TasksWidget;
