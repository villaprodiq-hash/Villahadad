import React, { useState } from 'react';
import TaskListView from './views/TaskListView';
import AlbumFolderView from './views/AlbumFolderView';
import ImageDetailView from './views/ImageDetailView';
import GalleryView from './views/GalleryView';
import QualityCheckView from './views/QualityCheckView';
import StatsView from './views/StatsView';
import PresetsView from './views/PresetsView';
import UnifiedTeamChat from '../../shared/UnifiedTeamChat';

export interface Album {
  id: string;
  bookingId: string;
  clientName: string;
  projectName: string;
  folderPath: string;
  images: AlbumImage[];
  totalImages: number;
  completedImages: number;
  priority: 'high' | 'normal' | 'low';
  deadline: string;
  timeSpent: number;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface AlbumImage {
  id: string;
  filename: string;
  path: string;
  status: 'pending' | 'completed';
  retouchNotes: RetouchNote[];
  thumbnail: string;
}

export interface RetouchNote {
  id: string;
  type: string;
  note?: string;
}

type View = 'task-list' | 'album-folder' | 'image-detail' | 'gallery' | 'quality' | 'stats' | 'presets' | 'team-chat';

import { Booking, BookingStatus } from '../../../types';

interface PhotoEditorDashboardProps {
  activeSection?: string;
  currentUser?: any;
  users?: any[];
  bookings?: Booking[];
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

const PhotoEditorDashboard: React.FC<PhotoEditorDashboardProps> = ({ activeSection = 'section-home', currentUser, users = [], bookings = [], onStatusUpdate }) => {
  const [currentView, setCurrentView] = useState<View>('task-list');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedImage, setSelectedImage] = useState<AlbumImage | null>(null);

  // Update view based on activeSection
  React.useEffect(() => {
    if (activeSection === 'section-home') setCurrentView('task-list');
    else if (activeSection === 'section-files') setCurrentView('gallery');
    else if (activeSection === 'section-quality') setCurrentView('quality');
    else if (activeSection === 'section-stats') setCurrentView('stats');
    else if (activeSection === 'section-presets') setCurrentView('presets');
    else if (activeSection === 'section-team-chat') setCurrentView('team-chat');
  }, [activeSection]);

  const handleOpenAlbum = (album: Album) => {
    // REAL DATA LOGIC (Removing Mock Data)
    // If the album already has images (from Supabase), use them.
    // If not, it's an empty album waiting for upload.
    
    // Optimistic: Use existing images if loaded
    if (album.images && album.images.length > 0) {
         setSelectedAlbum(album);
    } else {
         // Create empty state for now 
         setSelectedAlbum({ ...album, images: [] });
         // Fetch images from Supabase Storage would happen here in a real implementation
    }
    
    setCurrentView('album-folder');
  };

  const handleOpenImage = (image: AlbumImage) => {
    setSelectedImage(image);
    setCurrentView('image-detail');
  };

  const handleBack = () => {
    if (currentView === 'image-detail') {
      setCurrentView('album-folder');
      setSelectedImage(null);
    } else if (currentView === 'album-folder') {
      setCurrentView('task-list');
      setSelectedAlbum(null);
    }
  };

  return (
    <div className="h-full w-full bg-[#252525]">
      {currentView === 'task-list' && (
        <TaskListView bookings={bookings} onOpenAlbum={handleOpenAlbum} onStatusUpdate={onStatusUpdate} />
      )}
      
      {currentView === 'album-folder' && selectedAlbum && (
        <AlbumFolderView 
          album={selectedAlbum} 
          onBack={handleBack}
          onOpenImage={handleOpenImage}
        />
      )}
      
      {currentView === 'image-detail' && selectedImage && selectedAlbum && (
        <ImageDetailView 
          image={selectedImage}
          album={selectedAlbum}
          onBack={handleBack}
          allImages={selectedAlbum.images}
          onNavigate={handleOpenImage}
        />
      )}

      {currentView === 'gallery' && <GalleryView onOpenImage={handleOpenImage} />}
      {currentView === 'quality' && <QualityCheckView />}
      {currentView === 'stats' && <StatsView />}
      {currentView === 'presets' && <PresetsView />}
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