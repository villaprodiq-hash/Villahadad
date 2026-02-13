import React from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, Clock, AlertTriangle, Play, Image as ImageIcon, 
  TrendingUp, CheckCircle2, Sparkles, ExternalLink, Sliders,
  CheckSquare, Download
} from 'lucide-react';
import { Album } from '../PhotoEditorDashboard';
import TasksPanel from '../TasksPanel';

import { Booking, BookingStatus } from '../../../../types';

interface TaskListViewProps {
  bookings?: Booking[];
  onOpenAlbum: (album: Album) => void;
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

const TaskListView: React.FC<TaskListViewProps> = ({ bookings = [], onOpenAlbum, onStatusUpdate }) => {
  // Tasks from manager - stored locally, no hardcoded mock data
  const [tasks, setTasks] = React.useState<Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'normal';
    dueDate: string;
    completed: boolean;
    assignedBy: string;
  }>>([]);

  const [newTaskText, setNewTaskText] = React.useState("");

  const handleToggleTask = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTaskText,
      description: '',
      priority: 'normal' as const,
      dueDate: 'اليوم',
      completed: false,
      assignedBy: 'أنا'
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskText("");
  };

  // Convert bookings to albums
  const albums: Album[] = bookings
    .filter(b => b.status === BookingStatus.EDITING || b.status === BookingStatus.SHOOTING) // Show SHOOTING as pending? or just EDITING
    .filter(b => b.status === BookingStatus.EDITING) // Let's focus on EDITING for now as "Active"
    .map(b => ({
      id: b.id,
      bookingId: b.id,
      clientName: b.clientName,
      projectName: b.title,
      folderPath: b.folderPath || '',
      images: [],
      totalImages: 0, // Need actual data
      completedImages: 0,
      priority: 'normal',
      deadline: b.deliveryDeadline || '',
      timeSpent: 0,
      status: 'in-progress'
  }));

  // Add some mock albums if empty for demo
  if (albums.length === 0) {
      // Keep existing mocks if no real data
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Albums List */}
      <div className="w-80 bg-[#1e1e1e] border-l border-[#2d2d2d] flex flex-col">
        {/* Panel Header */}
        <div className="h-10 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-3">
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Projects</span>
        </div>

        {/* Albums */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {albums.map((album) => (
            <motion.button
              key={album.id}
              onClick={() => onOpenAlbum(album)}
              whileHover={{ x: 2 }}
              className="w-full p-3 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-transparent hover:border-blue-600/50 transition-all text-right group"
            >
              <div className="flex items-start gap-2">
                <Folder size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{album.projectName}</p>
                  <p className="text-gray-500 text-xs truncate">{album.clientName}</p>
                  
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <div className="flex-1 bg-[#1e1e1e] rounded-full h-1 overflow-hidden">
                      <div 
                        className="h-full bg-blue-600"
                        style={{ width: `${(album.completedImages / album.totalImages) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-[10px]">
                      {album.completedImages}/{album.totalImages}
                    </span>
                  </div>
                </div>

                {album.priority === 'high' && (
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content - Project Details */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="h-14 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-6 justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Active Projects</h2>
            <p className="text-gray-500 text-xs">Select a project to start editing</p>
          </div>
          
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-blue-600/20 border border-blue-600/30 rounded text-blue-400 text-xs font-bold">
              {albums.filter(a => a.status === 'in-progress').length} In Progress
            </div>
            <div className="px-3 py-1.5 bg-gray-700/50 border border-gray-600/30 rounded text-gray-400 text-xs font-bold">
              {albums.filter(a => a.status === 'pending').length} Pending
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col p-6 bg-[#252525] overflow-auto">
          {/* Quick Stats - Real Data */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-linear-to-br from-blue-600/20 to-blue-600/5 border border-blue-600/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <ImageIcon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">مشاريع نشطة</p>
                  <p className="text-white text-3xl font-black">{albums.length}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-linear-to-br from-purple-600/20 to-purple-600/5 border border-purple-600/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Clock size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">بانتظار التسليم</p>
                  <p className="text-white text-3xl font-black">{albums.filter(a => a.deadline && a.deadline < new Date().toISOString().split('T')[0]).length}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-linear-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-600/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">إجمالي الحجوزات</p>
                  <p className="text-white text-3xl font-black">{bookings.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Overview */}
          <div className="flex-1 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] overflow-hidden flex flex-col">
            <div className="h-12 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center px-4">
              <h3 className="text-white font-bold text-sm">المشاريع قيد التعديل</h3>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-3">
                {albums.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon size={40} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">لا توجد مشاريع قيد التعديل حالياً</p>
                    <p className="text-gray-600 text-xs mt-1">الحجوزات بحالة "تعديل" ستظهر هنا</p>
                  </div>
                ) : (
                  albums.map(album => (
                    <div key={album.id} onClick={() => onOpenAlbum(album)} className="flex items-start gap-3 p-3 rounded-lg bg-[#2d2d2d] hover:bg-[#3d3d3d] transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <Folder size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-bold group-hover:text-blue-400 transition-colors">{album.projectName}</p>
                        <p className="text-gray-500 text-xs">{album.clientName} {album.deadline ? `• موعد التسليم: ${album.deadline}` : ''}</p>
                      </div>
                      <Play size={14} className="text-gray-600 group-hover:text-blue-400 mt-1 shrink-0 transition-colors" />
                    </div>
                  ))
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-[#3d3d3d]">
                <h4 className="text-gray-400 text-xs font-bold uppercase mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <ExternalLink size={14} />
                    فتح Photoshop
                  </button>
                  <button className="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Sliders size={14} />
                    Apply Preset
                  </button>
                  <button 
                  onClick={() => {
                      const active = albums.find(a => a.status === 'in-progress');
                      if (active && onStatusUpdate) {
                          onStatusUpdate(active.id, BookingStatus.READY_TO_PRINT);
                      } else {
                          // toast.error('No active project to send');
                      }
                  }}
                  className="p-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <CheckSquare size={14} />
                    Send to Print
                  </button>
                  <button className="p-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Download size={14} />
                    Batch Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Tasks */}
      <div className="w-80 shrink-0">
        <TasksPanel isManager={false} />
      </div>
    </div>
  );
};

export default TaskListView;
