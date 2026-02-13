import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Trash2, Plus, AlertCircle, Clock, DollarSign, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { electronBackend as mockBackend } from '../../../../services/mockBackend';
import { DashboardTask, ReminderType, BookingCategory } from '../../../../types';

// --- Interfaces ---
// Using DashboardTask directly allows for easier integration
// But we might need to extend it for UI specific props if any
type Task = DashboardTask;

interface TasksProgressWidgetProps {
  isDraggable?: boolean;
  bookings?: any[];
  isManager?: boolean;
}

const TasksProgressWidget: React.FC<TasksProgressWidgetProps> = ({ bookings = [], isManager = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // --- Auto-Generation Logic ---
  // ✅ FIX: Use useMemo to compute today's bookings to reduce re-renders
  const todayBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return bookings.filter(b => {
      // Exclude deleted bookings
      if (b.deletedAt) return false;
      const bookingDate = new Date(b.shootDate);
      return bookingDate >= todayStart && bookingDate < todayEnd;
    });
  }, [bookings]);

  // ✅ FIX: Only run when today's bookings actually change, not on every render
  useEffect(() => {
    const generateAndAddBookingTasks = async () => {
      // Check if bookings exist
      if (!todayBookings || todayBookings.length === 0) return;

      // ✅ Get existing tasks first to avoid duplicates
      const existingTasks = await mockBackend.getDashboardTasks();

      for (const booking of todayBookings) {
        // ✅ Check if reception task already exists for this booking
        const receptionTaskId = `reception-${booking.id}`;
        const hasReceptionTask = existingTasks.some(t => t.id === receptionTaskId);
        
        if (!hasReceptionTask) {
          await mockBackend.addTask(
            `استقبال ${booking.clientName}`,
            'booking',
            'system',
            'high',
            booking.id,
            receptionTaskId,
            booking.details?.startTime || '09:00'
          );
        }

        // ✅ Check if payment task already exists
        const remainingAmount = booking.totalAmount - booking.paidAmount;
        if (remainingAmount > 0) {
          const paymentTaskId = `payment-verify-${booking.id}`;
          const hasPaymentTask = existingTasks.some(t => t.id === paymentTaskId);
          
          if (!hasPaymentTask) {
            const isDeposit = booking.paidAmount < (booking.totalAmount * 0.5);
            await mockBackend.addTask(
              isDeposit 
                ? `استلام متبقي (${remainingAmount.toLocaleString()}) من ${booking.clientName}`
                : `تصفية حساب ${booking.clientName}: ${remainingAmount.toLocaleString()}`,
              'payment',
              'system',
              isDeposit ? 'high' : 'normal',
              booking.id,
              paymentTaskId,
              booking.details?.startTime || '09:00'
            );
          }
        }

        // ✅ Check if equipment task already exists
        if (booking.category === BookingCategory.SHOOT) {
          const equipmentTaskId = `equipment-${booking.id}`;
          const hasEquipmentTask = existingTasks.some(t => t.id === equipmentTaskId);
          
          if (!hasEquipmentTask) {
            await mockBackend.addTask(
              `تجهيز معدات لجلسة ${booking.clientName}`,
              'alert',
              'system',
              'high',
              booking.id,
              equipmentTaskId,
              booking.details?.startTime || '09:00'
            );
          }
        }
      }
      
      // After generating, refresh the list
      loadTasks();
    };

    generateAndAddBookingTasks();
  }, [todayBookings]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: We intentionally depend on todayBookings (memoized) to reduce re-runs



  // --- Data Loading & Subscription ---
  const loadTasks = async () => {
      try {
          // Fetch from backend
          const backendTasks = await mockBackend.getDashboardTasks();
          
          // Filter out tasks for deleted bookings (only for system-generated tasks)
          const activeBookingIds = new Set(bookings.filter(b => !b.deletedAt).map(b => b.id));
          const filteredTasks = backendTasks.filter(task => {
              // Manual tasks are always shown
              if (task.source === 'manual' || !task.relatedBookingId) return true;
              // System tasks only if booking is active
              return activeBookingIds.has(task.relatedBookingId);
          });
          
          setTasks(filteredTasks);
      } catch (e) {
          console.error("Failed to load tasks", e);
      }
  };

  useEffect(() => {
      loadTasks();
      
      const unsubscribe = mockBackend.subscribe((event) => {
          if (event === 'tasks_updated') {
              loadTasks();
          }
      });
      
      return () => {
          unsubscribe();
      };
  }, [bookings]); // Reload when bookings change to filter deleted bookings

  // --- Calculations & Actions ---
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => {
    if (completedCount === totalCount && totalCount > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalCount]);

  const toggleTask = async (id: string) => {
    // Optimistic
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    
    await mockBackend.toggleTask(id);
  };

  const deleteTask = async (id: string) => {
    // Optimistic
    setTasks(prev => prev.filter(task => task.id !== id));
    await mockBackend.deleteTask(id);
  };

  const addManualTask = async () => {
    if (newTaskText.trim()) {
      const tempId = `temp-${Date.now()}`;
      // Optimistic
      const newTask: Task = {
        id: tempId,
        title: newTaskText, // using title now
        completed: false,
        type: 'manual' as ReminderType,
        source: 'manual',
        priority: 'normal',
        time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
      };
      setTasks(prev => [...prev, newTask]);
      
      await mockBackend.addTask(
          newTaskText, 
          'manual', // Type defaults to general/manual
          'manual', // Source
          'normal'
      );
      // Refetch happens on listener

      setNewTaskText('');
      setShowAddTask(false);
    }
  };

  // --- Styles Helper ---
  const getPriorityStyles = (priority: string | undefined) => { // Priority optional in DashboardTask
    switch (priority) {
      case 'high': 
      case 'urgent':
        return 'border-red-500 bg-red-500/10 text-red-500';
      case 'normal': 
      default: 
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
    }
  };

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const getProgressColor = () => {
    if (progress === 100) return '#10b981';
    if (progress >= 50) return '#eab308';
    return '#C94557';
  };

  return (
    <div className={`${isManager ? 'bg-[#1a1c22] rounded-xl' : 'bg-[#1E1E1E] rounded-[2rem]'} p-4 border border-white/10 shadow-2xl h-full flex flex-col relative overflow-hidden group font-sans`} dir="rtl">
      
      {/* Header Compact */}
      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#C94557]" />
          المهام
        </h3>
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="w-7 h-7 flex items-center justify-center bg-[#252525] hover:bg-[#C94557] border border-white/10 rounded-lg transition-all"
        >
          <Plus size={14} className="text-white" />
        </button>
      </div>

      {/* Add Task Input */}
      <AnimatePresence>
        {showAddTask && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addManualTask()}
                placeholder="مهمة جديدة..."
                className="flex-1 px-3 py-1.5 bg-[#252525] border border-white/10 rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#C94557] transition-all"
                autoFocus
              />
              <button onClick={addManualTask} className="px-3 py-1.5 bg-[#C94557] hover:bg-[#B3434F] rounded-lg text-white text-xs font-bold transition-all">
                إضافة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular Progress - Minimal */}
      <div className="flex items-center justify-center mb-4 shrink-0 relative z-10 gap-4">
        <div className="relative w-24 h-24">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#252525" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={radius} fill="none" stroke={getProgressColor()} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-white">{Math.round(progress)}%</div>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>{completedCount} مكتملة</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                <span>{totalCount - completedCount} متبقية</span>
            </div>
        </div>
      </div>

      {/* Tasks List - Slim & Clean Design */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => {
             const priorityStyle = getPriorityStyles(task.priority);
             return (
                <motion.div
                key={task.id}
                data-testid={`task-${task.id}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 
                    ${task.completed 
                        ? 'bg-[#1a1a1a] border-white/5 opacity-50' 
                        : 'bg-[#252525] border-white/5 hover:border-white/10 hover:bg-[#2a2a2a]'
                    }`}
                >
                {/* Priority Indicator Strip (Right Border) */}
                <div className={`w-1 h-8 rounded-full ${task.completed ? 'bg-gray-700' : priorityStyle.split(' ')[2].replace('text-', 'bg-')}`}></div>

                {/* Icon */}
                <div className={`shrink-0 ${task.completed ? 'text-gray-600' : 'text-gray-400'}`}>
                    {task.type === 'booking' && <Clock size={14} />}
                    {task.type === 'payment' && <DollarSign size={14} />}
                    {task.type === 'alert' && <AlertCircle size={14} />}
                    {task.type === 'manual' && <Circle size={14} />}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className={`text-[11px] font-medium leading-tight break-words ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {task.title}
                    </span>
                    {task.time && !task.completed && (
                        <span className="text-[9px] text-[#C94557] font-bold mt-0.5">{task.time}</span>
                    )}
                </div>

                {/* Actions: Checkbox & Delete */}
                <div className="flex items-center gap-1">
                    {task.type === 'manual' && !task.completed && (
                        <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} />
                        </button>
                    )}
                    
                    <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                            task.completed 
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                            : 'border-gray-600 hover:border-emerald-500 text-transparent'
                        }`}
                    >
                        <Check size={12} strokeWidth={3} />
                    </button>
                </div>
                </motion.div>
             );
          })}
        </AnimatePresence>
        
        {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-gray-600">
                <p className="text-[10px]">لا توجد مهام</p>
            </div>
        )}
      </div>

      {/* Celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 rounded-[2rem]"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-white text-sm font-bold">تم الانجاز!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksProgressWidget;