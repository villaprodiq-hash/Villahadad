import React from 'react';
import { Booking, User } from '../../../types';

// --- Widgets ---
import ManagerProfileWidget from './widgets/ManagerProfileWidget';
import ManagerRevenueSourcesWidget from './widgets/ManagerRevenueSourcesWidget';
import ManagerTeamStatusWidget from './widgets/ManagerTeamStatusWidget';
import ManagerOpportunitiesWidget from './widgets/ManagerOpportunitiesWidget';
import ManagerStrategicNotesWidget from './widgets/ManagerStrategicNotesWidget';
import ManagerPerformanceHubWidget from './widgets/ManagerPerformanceHubWidget';
import ManagerDeadlineListWidget from './widgets/ManagerDeadlineListWidget';
import ManagerEmployeePerformanceWidget from './widgets/ManagerEmployeePerformanceWidget';
import ManagerAudioSummaryWidget from './widgets/ManagerAudioSummaryWidget';
import ManagerTopStatsBar from './widgets/ManagerTopStatsBar';
import ManagerTimelineSwimlaneWidget from './widgets/ManagerTimelineSwimlaneWidget';
import AddBookingModal from '../../AddBookingModal';
import PendingApprovalsWidget from '../../PendingApprovalsWidget';

interface ManagerDashboardProps {
  bookings: Booking[];
  users: User[];
  tasks: unknown[];
  onToggleTask: (id: string) => Promise<void>;
  onLogout: () => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  bookings,
  users,
  tasks: _tasks,
  onToggleTask: _onToggleTask,
  onLogout: _onLogout,
}) => {
  // Navigation is handled by App.tsx and ManagerLayout.
  // This component now strictly renders the Dashboard Overview content.
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);

  return (
    <div className="w-full h-full space-y-4 animate-in fade-in duration-300">
      {/* Top Stats */}
      <ManagerTopStatsBar bookings={bookings} />

      {/* Pending Approvals Widget */}
      <PendingApprovalsWidget
        onEditBooking={booking => setSelectedBooking(booking)}
        onRefresh={() => {}}
      />

      {/* Main Grid Layout - Nixtio Style */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column (3 cols) - Profile & Settings */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <ManagerProfileWidget />

          {/* Audio Summary Widget */}
          <ManagerAudioSummaryWidget />

          <ManagerEmployeePerformanceWidget users={users} bookings={bookings} />

          <ManagerDeadlineListWidget bookings={bookings} />
        </div>

        {/* Middle Column (6 cols) - Progress, Time, Calendar */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
          {/* Row 1: Performance & Revenue Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ManagerPerformanceHubWidget bookings={bookings} />
            <ManagerRevenueSourcesWidget bookings={bookings} />
          </div>

          {/* Row 2: Advanced Timeline Widget */}
          <ManagerTimelineSwimlaneWidget
            bookings={bookings.filter(b => b.category !== 'Wedding')}
            onBookingDoubleClick={b => setSelectedBooking(b)}
          />

          {/* Row 3: Live Team Status (Luxury Pill) */}
          <ManagerTeamStatusWidget users={users} />
        </div>

        {/* Right Column (3 cols) - Onboarding & Strategy */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <ManagerOpportunitiesWidget />
          <ManagerStrategicNotesWidget />
        </div>
      </div>

      {/* Booking Details Modal (Read Only) */}
      {selectedBooking && (
        <AddBookingModal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onSave={() => {}} // Read-only, no save needed
          editingBooking={selectedBooking}
          readOnly={true}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
