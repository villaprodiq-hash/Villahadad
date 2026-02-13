import React, { useState, useMemo } from 'react';
import { Users, ChevronUp, ChevronDown, Crown, CheckCircle } from 'lucide-react';
import ManagerDashboardCard from './ManagerDashboardCard';
// Assuming types.ts is at ../../../../types
import { User, Booking } from '../../../../types';

const ManagerEmployeePerformanceWidget = ({ users = [], bookings = [] }: { users: User[], bookings?: Booking[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate Real Stats - Memoized for performance
  const topPerformers = useMemo(() => {
    return users.map(user => {
    // Count completed tasks for this user
    // Using loose string matching for status as API might return different casing
    const completedCount = bookings.filter(b => 
      (b.status === 'Delivered' || b.status === 'Archived') && 
      (b.assignedShooter === user.id || b.assignedPhotoEditor === user.id || b.assignedVideoEditor === user.id)
    ).length;

    // Calculate pending/active
    const activeCount = bookings.filter(b => 
        (b.status !== 'Delivered' && b.status !== 'Archived') && 
        (b.assignedShooter === user.id || b.assignedPhotoEditor === user.id || b.assignedVideoEditor === user.id)
      ).length;

    // Calculate created entries (Sales/Reception Performance)
    const createdCount = bookings.filter(b => b.created_by === user.id).length;

    return {
      ...user,
      tasksCompleted: completedCount,
      activeTasks: activeCount,
      createdTasks: createdCount,
      trend: '---' 
    };
    })
    .sort((a, b) => (b.tasksCompleted + b.createdTasks) - (a.tasksCompleted + a.createdTasks)) // Sort by total activity
    .slice(0, 5); // Top 5
  }, [users, bookings]); // Only recalculate when users or bookings change

  return (
    <ManagerDashboardCard className="">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 group/header"
      >
        <div className="flex items-center justify-between w-full overflow-hidden">
          <div className="flex items-center gap-2">
             <Users size={16} className="text-gray-900 opacity-40 group-hover/header:opacity-100 transition-opacity" />
             <h3 className="text-[12px] font-bold text-gray-800 font-tajawal">أداء الموظفين</h3>
          </div>
          {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-3 space-y-3">
          {topPerformers.length > 0 ? topPerformers.map((user, i) => (
            <div key={user.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
              {/* Avatar / Rank */}
              <div className="relative">
                 <div className="w-10 h-10 rounded-full bg-white  flex items-center justify-center overflow-hidden">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500">{user.name.charAt(0)}</span>}
                 </div>
                 {i === 0 && (user.tasksCompleted + user.createdTasks) > 0 && <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 border-2 border-white"><Crown size={8} fill="currentColor" /></div>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                   <p className="font-bold text-sm text-gray-900 truncate font-tajawal">{user.name}</p>
                   {user.activeTasks > 0 && <span className="text-[9px] font-bold text-gray-400">{user.activeTasks} نشط</span>}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                   <span className="flex items-center gap-1"><CheckCircle size={10} className="text-blue-500" /> {user.tasksCompleted} منجز</span>
                   {user.createdTasks > 0 && <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> {user.createdTasks} أنشأ</span>}
                </div>
              </div>

              {/* Speed Meter (Removed Fake Data) */}
              <div className="text-right opacity-0"></div>
            </div>
          )) : (
            <div className="text-center py-4 text-gray-400 text-xs text-tajawal">لا يوجد نشاط موظفين حالياً</div>
          )}
          
          <div className="pt-1 text-center">
             <button className="text-[10px] text-gray-400 hover:text-gray-900 font-tajawal transition-colors">عرض التقرير الكامل</button>
          </div>
        </div>
      )}
    </ManagerDashboardCard>
  );
};

export default ManagerEmployeePerformanceWidget;
