import React, { useState } from 'react';
import TaskListView from './views/TaskListView';
import EditorOverviewView from './views/EditorOverviewView';
import UnifiedTeamChat from '../../shared/UnifiedTeamChat';
export type { Album, AlbumImage, RetouchNote } from './types';

type View = 'dashboard' | 'projects' | 'team-chat';

import { Booking, BookingStatus, User } from '../../../types';

interface PhotoEditorDashboardProps {
  activeSection?: string;
  currentUser?: User;
  users?: User[];
  bookings?: Booking[];
  onStatusUpdate?: (id: string, status: BookingStatus, updates?: Partial<Booking>) => Promise<void>;
}

const PhotoEditorDashboard: React.FC<PhotoEditorDashboardProps> = ({ activeSection = 'section-home', currentUser, users = [], bookings = [], onStatusUpdate }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Update view based on activeSection
  React.useEffect(() => {
    if (activeSection === 'section-home') setCurrentView('dashboard');
    else if (activeSection === 'section-files') setCurrentView('projects');
    else if (activeSection === 'section-team-chat') setCurrentView('team-chat');
  }, [activeSection]);

  const handleStartProject = (bookingId: string) => {
    setSelectedProjectId(bookingId);
    setCurrentView('projects');
  };

  return (
    <div className="h-full w-full bg-[#252525]">
      {currentView === 'dashboard' && (
        <EditorOverviewView
          bookings={bookings}
          onOpenProjects={() => setCurrentView('projects')}
          onStartProject={handleStartProject}
        />
      )}

      {currentView === 'projects' && (
        <TaskListView
          bookings={bookings}
          onStatusUpdate={onStatusUpdate}
          initialAlbumId={selectedProjectId}
          showProjectSidebar={true}
        />
      )}
      {currentView === 'team-chat' && (
        <div className="h-full w-full overflow-hidden">
             <UnifiedTeamChat 
                users={users} 
                currentUser={currentUser} 
             /> 
        </div>
      )}
    </div>
  );
};

export default PhotoEditorDashboard;
