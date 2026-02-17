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
