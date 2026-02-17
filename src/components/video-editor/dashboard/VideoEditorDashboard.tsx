import React, { useMemo } from 'react';
import { Booking, BookingStatus, User } from '../../../types';
import { Video, CheckCircle, FolderOpen, Play, Film, Calendar } from 'lucide-react';
import TasksPanel from './TasksPanel';

interface VideoEditorDashboardProps {
  currentUser: User;
  bookings?: Booking[];
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

type VideoEditorBooking = Booking & {
  assignedVideoEditor?: string;
  assignedShooter?: string;
  videoEditStartedAt?: string;
  updatedAt?: string;
};

const VideoEditorDashboard: React.FC<VideoEditorDashboardProps> = ({ currentUser, bookings = [], onStatusUpdate }) => {

  // Filter bookings assigned to this video editor
  const myBookings = useMemo(() => {
    return bookings.filter(b => {
      const booking = b as VideoEditorBooking;
      return (
        booking.assignedVideoEditor === currentUser.id ||
        booking.assignedShooter === currentUser.id
      );
    });
  }, [bookings, currentUser.id]);

  // Categorize projects
  const activeProjects = useMemo(() => {
    return myBookings.filter(b =>
      b.status === BookingStatus.EDITING ||
      b.status === BookingStatus.SHOOTING_COMPLETED
    );
  }, [myBookings]);

  const completedProjects = useMemo(() => {
    return myBookings.filter(b =>
      b.status === BookingStatus.READY_TO_PRINT ||
      b.status === BookingStatus.PRINTING ||
      b.status === BookingStatus.READY_FOR_PICKUP ||
      b.status === BookingStatus.DELIVERED ||
      b.status === BookingStatus.ARCHIVED
    );
  }, [myBookings]);

  const editingProjects = useMemo(() => {
    return myBookings.filter(b => b.status === BookingStatus.EDITING);
  }, [myBookings]);

  // Calculate stats from real data
  const stats = [
    { label: 'مشاريع نشطة', value: String(activeProjects.length), icon: FolderOpen, color: 'text-blue-400' },
    { label: 'قيد التحرير', value: String(editingProjects.length), icon: Video, color: 'text-yellow-400' },
    { label: 'مكتملة', value: String(completedProjects.length), icon: CheckCircle, color: 'text-green-400' },
    { label: 'إجمالي المشاريع', value: String(myBookings.length), icon: Film, color: 'text-purple-400' },
  ];

  // Build project list with progress estimation
  const projectList = useMemo(() => {
    return activeProjects.map(b => {
      let progress = 0;
      let statusLabel = '';

      switch (b.status) {
        case BookingStatus.SHOOTING_COMPLETED:
          progress = 10;
          statusLabel = 'بانتظار البدء';
          break;
        case BookingStatus.EDITING: {
          // Estimate progress based on time
          const booking = b as VideoEditorBooking;
          const editStart = booking.videoEditStartedAt || booking.updatedAt;
          if (editStart) {
            const daysSinceStart = Math.floor((Date.now() - new Date(editStart).getTime()) / (1000 * 60 * 60 * 24));
            progress = Math.min(90, 20 + daysSinceStart * 10);
          } else {
            progress = 30;
          }
          statusLabel = 'قيد التحرير';
          break;
        }
        default:
          progress = 50;
          statusLabel = b.status;
      }

      return {
        id: b.id,
        name: b.clientName || b.title,
        status: statusLabel,
        progress,
        shootDate: b.shootDate,
        category: b.category,
        bookingStatus: b.status,
      };
    }).sort((a, b) => a.progress - b.progress); // Show least progress first
  }, [activeProjects]);

  const handleMarkComplete = async (bookingId: string) => {
    if (onStatusUpdate) {
      await onStatusUpdate(bookingId, BookingStatus.READY_TO_PRINT);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1E1E1E]" dir="rtl">
      {/* Header */}
      <div className="h-16 bg-[#252526] border-b border-[#3E3E42] flex items-center px-8 shrink-0">
        <div>
          <h1 className="text-white text-xl font-semibold">مرحباً، {currentUser.name}</h1>
          <p className="text-[#858585] text-sm">محرر فيديو</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-6 p-8 overflow-hidden">
        {/* Left Column: Stats & Projects */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3E3E42 transparent' }}>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-[#252526] border border-[#3E3E42] rounded-lg p-5 hover:border-[#0078D4] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`${stat.color}`} size={22} />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-[#858585]">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Active Projects */}
          <div className="bg-[#252526] border border-[#3E3E42] rounded-lg p-6">
            <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <Play size={18} className="text-blue-400" />
              المشاريع النشطة ({projectList.length})
            </h2>
            <div className="space-y-3">
              {projectList.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3 opacity-40" />
                  <p className="text-[#858585] text-sm">لا توجد مشاريع نشطة حالياً</p>
                  <p className="text-[#555] text-xs mt-1">المشاريع المعينة لك ستظهر هنا</p>
                </div>
              ) : (
                projectList.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded border border-[#3E3E42] hover:border-[#0078D4] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium mb-1">{project.name}</div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          project.bookingStatus === BookingStatus.EDITING
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {project.status}
                        </span>
                        {project.shootDate && (
                          <span className="text-[11px] text-[#666] flex items-center gap-1">
                            <Calendar size={10} />
                            {project.shootDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28">
                        <div className="h-2 bg-[#3E3E42] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${project.progress >= 80 ? 'bg-emerald-500' : project.progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-[#858585] mt-1 text-left">
                          {project.progress}%
                        </div>
                      </div>
                      {project.bookingStatus === BookingStatus.EDITING && (
                        <button
                          onClick={() => handleMarkComplete(project.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          اكتمل
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Completed */}
          {completedProjects.length > 0 && (
            <div className="bg-[#252526] border border-[#3E3E42] rounded-lg p-6">
              <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-400" />
                مكتملة ({completedProjects.length})
              </h2>
              <div className="space-y-2">
                {completedProjects.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] rounded border border-[#3E3E42]">
                    <div>
                      <span className="text-white text-sm">{b.clientName || b.title}</span>
                      <span className="text-[#555] text-xs mr-2">({b.shootDate})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">مكتمل</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tasks Panel */}
        <div className="w-80 shrink-0">
          <TasksPanel isManager={false} />
        </div>
      </div>
    </div>
  );
};

export default VideoEditorDashboard;
