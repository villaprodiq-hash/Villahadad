import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { motion } from 'framer-motion';
import { Booking, DashboardTask } from '../../../types';
import PulseMonitor from './widgets/PulseMonitor';

import TerminalLog from './widgets/TerminalLog';
import MissionBoard from './widgets/MissionBoard';
import PendingApprovalsWidget from '../../PendingApprovalsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface AdminDashboardProps {
  bookings: Booking[];
  tasks: DashboardTask[];
  onToggleTask: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ bookings, tasks, onToggleTask }) => {
  const adminLayouts = {
    lg: [
      { i: 'pulse', x: 0, y: 0, w: 8, h: 5 },

      { i: 'terminal', x: 8, y: 9, w: 4, h: 6 },
      { i: 'mission', x: 0, y: 15, w: 12, h: 8 },
    ],
  };

  return (
    <div className="min-h-full animate-in fade-in duration-500 pb-12" dir="ltr">
      {/* Page Header (Sentinel HUD Style) */}
      <div className="flex items-end justify-between px-4 mb-8" dir="rtl">
        <div>
          <p className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-[0.4em] mb-1">
            المحطة / الحارس / القيادة
          </p>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            غرفة القيادة
            <span className="w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-75"></span>
          </h1>
        </div>
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
            <div className="text-left font-mono">
              <p className="text-[10px] text-cyan-400 font-bold">تصريح العمليات</p>
              <p className="text-[9px] text-gray-500">مستوى الإشراف العام</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6" dir="rtl">
        <PendingApprovalsWidget onRefresh={() => {}} />
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={adminLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={22}
        isDraggable={false}
        isResizable={false}
        margin={[20, 20]}
      >
        <div key="pulse">
          <PulseMonitor bookings={bookings} />
        </div>

        <div key="terminal">
          <TerminalLog bookings={bookings} />
        </div>

        <div key="mission" dir="rtl">
          <MissionBoard tasks={tasks} onToggle={onToggleTask} />
        </div>
      </ResponsiveGridLayout>

      {/* Floating Scanner Effect (Pure Aesthetic) */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-cyan-500/10 z-50 pointer-events-none animate-hud-scan"></div>

      <style>{`
            @keyframes hud-scan {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(100vh); opacity: 0; }
            }
            .animate-hud-scan { animation: hud-scan 8s linear infinite; }
        `}</style>
    </div>
  );
};

export default AdminDashboard;
