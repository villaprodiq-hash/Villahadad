/**
 * useSessionNotifications Hook
 * 
 * Shows toast notifications for session lifecycle events
 * - Image upload complete
 * - Selection changes
 * - Sync status
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSessionLifecycle } from './useSessionLifecycle';

interface UseSessionNotificationsOptions {
  bookingId: string;
  clientName: string;
  enabled?: boolean;
}

export function useSessionNotifications({ 
  bookingId, 
  clientName, 
  enabled = true 
}: UseSessionNotificationsOptions) {
  const {
    session,
    images,
    isUploading,
    uploadProgress,
    uploadStatus,
    selectedCount,
    totalCount,
  } = useSessionLifecycle({ bookingId, clientName, autoInitialize: enabled });

  // Notify when upload starts
  useEffect(() => {
    if (isUploading && uploadProgress === 0) {
      toast.loading('جاري رفع الصور...', {
        id: 'upload-progress',
        duration: Infinity,
      });
    }
  }, [isUploading, uploadProgress]);

  // Update upload progress notification
  useEffect(() => {
    if (isUploading && uploadProgress > 0) {
      toast.loading(`${uploadStatus} (${uploadProgress}%)`, {
        id: 'upload-progress',
        duration: Infinity,
      });
    }
  }, [isUploading, uploadProgress, uploadStatus]);

  // Notify when upload completes
  useEffect(() => {
    if (!isUploading && uploadProgress === 100 && totalCount > 0) {
      toast.success(`تم رفع ${totalCount} صورة بنجاح!`, {
        id: 'upload-progress',
        duration: 3000,
      });
    }
  }, [isUploading, uploadProgress, totalCount]);

  // Notify on selection changes
  useEffect(() => {
    if (session && selectedCount > 0) {
      const progress = Math.round((selectedCount / totalCount) * 100);
      
      // Only show when significant progress is made
      if (progress === 25 || progress === 50 || progress === 75 || progress === 100) {
        toast.info(`${selectedCount} صورة مختارة (${progress}%)`, {
          duration: 2000,
        });
      }
    }
  }, [selectedCount, totalCount, session]);

  return {
    session,
    images,
    selectedCount,
    totalCount,
  };
}
