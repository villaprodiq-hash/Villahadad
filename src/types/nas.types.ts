// NAS Task Interface
export interface NasTask {
  id: string;
  bookingId: string;
  sourcePath: string;
  destinationPath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
}
