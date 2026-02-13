/// <reference types="../types/electron.d.ts" />

/**
 * useSessionLifecycle Hook
 * 
 * Manages session image lifecycle for Selection Role
 * - Upload files with dual-path processing
 * - Track upload progress
 * - Manage image selection (like/reject)
 * - Sync with database
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { SessionsTable, SessionImagesTable } from '../services/db/types';

export type SessionInfo = SessionsTable;
export type SessionImage = SessionImagesTable;

export interface UseSessionLifecycleOptions {
  bookingId: string;
  clientName: string;
  autoInitialize?: boolean;
}

// Type-safe access to Electron API
const getElectronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : undefined);

export function useSessionLifecycle({ bookingId, clientName, autoInitialize = true }: UseSessionLifecycleOptions) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [images, setImages] = useState<SessionImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  const sessionIdRef = useRef<string>(`session_${bookingId}_${Date.now()}`);

  // Update counters - define BEFORE it's used
  const updateCounts = useCallback((imgs: SessionImage[]) => {
    const selected = imgs.filter(img => img.isSelected).length;
    setSelectedCount(selected);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (autoInitialize) {
      void initializeSession();
    }
  }, [bookingId, clientName, autoInitialize]);

  // Load images from database using Supabase
  const loadImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_images')
        .select('*')
        .eq('sessionId', session?.id || '')
        .order('createdAt', { ascending: true });

      if (error) throw error;

      const loadedImages = (data || []) as SessionImage[];
      setImages(loadedImages);
      updateCounts(loadedImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, [session?.id, updateCounts]);

  // Setup realtime subscription
  useEffect(() => {
    if (!session?.id) return;

    // Subscribe to session_images changes
    const subscription = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_images',
          filter: `sessionId=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setImages(prev => [...prev, payload.new as SessionImage]);
          } else if (payload.eventType === 'UPDATE') {
            setImages(prev => 
              prev.map(img => 
                img.id === payload.new.id 
                  ? { ...img, ...(payload.new as SessionImage) }
                  : img
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setImages(prev => 
              prev.filter(img => img.id !== payload.old.id)
            );
          }
          // Update counts after any change
          setImages(current => {
            updateCounts(current);
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [session?.id, updateCounts]);

  // Initialize session using Supabase
  const initializeSession = useCallback(async () => {
    try {
      // Check if session exists for this booking
      const { data: existingSession, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('bookingId', bookingId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingSession) {
        setSession(existingSession as SessionInfo);
        sessionIdRef.current = existingSession.id;
        
        // Load images for this session
        const { data: imagesData, error: imagesError } = await supabase
          .from('session_images')
          .select('*')
          .eq('sessionId', existingSession.id)
          .order('createdAt', { ascending: true });
        
        if (imagesError) throw imagesError;
        
        const loadedImages = (imagesData || []) as SessionImage[];
        setImages(loadedImages);
        updateCounts(loadedImages);
      } else {
        // Create new session
        const newSessionId = sessionIdRef.current;
        const now = new Date().toISOString();
        
        // Create NAS folder via Electron
        const electronAPI = getElectronAPI();
        let folderPath = null;
        
        if (electronAPI?.sessionLifecycle?.createSessionDirectory) {
          const result = await electronAPI.sessionLifecycle.createSessionDirectory(
            clientName,
            newSessionId,
            now
          );
          
          if (result?.success && result.sessionPath) {
            folderPath = result.sessionPath;
          }
        }

        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert({
            id: newSessionId,
            bookingId,
            clientName,
            status: 'uploaded',
            folderPath,
            createdAt: now,
          })
          .select()
          .single();

        if (createError) throw createError;

        setSession(newSession as SessionInfo);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }, [bookingId, clientName]);

  // Upload files (Drag & Drop)
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!session) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('جاري رفع الملفات...');

    try {
      const fileArray = Array.from(files);
      const filePaths: string[] = [];

      // Get file paths (in Electron, files have path property)
      for (const file of fileArray) {
        const fileWithPath = file as unknown as { path?: string };
        if (fileWithPath.path) {
          filePaths.push(fileWithPath.path);
        }
      }

      if (filePaths.length === 0) {
        throw new Error('No valid file paths found');
      }

      const electronAPI = getElectronAPI();

      // Setup progress listener
      let cleanupProgress: (() => void) | null = null;
      
      if (electronAPI?.sessionLifecycle?.onIngestionProgress) {
        cleanupProgress = electronAPI.sessionLifecycle.onIngestionProgress(
          ({ progress, status }: { progress: number; status: string }) => {
            setUploadProgress(progress);
            setUploadStatus(status);
          }
        );
      }

      // Process files via Electron Main Process
      if (electronAPI?.sessionLifecycle?.processFiles) {
        const result = await electronAPI.sessionLifecycle.processFiles(
          filePaths,
          {
            clientName,
            sessionId: session.id,
            date: new Date(),
          }
        );

        // Save to database using Supabase
        const now = new Date().toISOString();
        const imagesToInsert = result.success.map(item => ({
          id: uuidv4(),
          sessionId: session.id,
          fileName: item.fileName,
          cloudUrl: item.cloud,
          localPath: item.local,
          isSelected: false,
          createdAt: now,
        }));

        if (imagesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('session_images')
            .insert(imagesToInsert);

          if (insertError) throw insertError;
        }

        // Reload images
        await loadImages();

        setUploadStatus(`تم رفع ${result.success.length} صور بنجاح`);
      }

      // Cleanup progress listener
      if (cleanupProgress) {
        cleanupProgress();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('فشل الرفع');
    } finally {
      setIsUploading(false);
    }
  }, [session, clientName, loadImages]);

  // Toggle selection on image
  const toggleSelection = useCallback(async (imageId: string) => {
    try {
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      const newSelected = !image.isSelected;

      await supabase
        .from('session_images')
        .update({ isSelected: newSelected })
        .eq('id', imageId);

      // Update local state
      setImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, isSelected: newSelected }
            : img
        )
      );

      const newSelectedCount = newSelected ? selectedCount + 1 : selectedCount - 1;
      setSelectedCount(newSelectedCount);
    } catch (error) {
      console.error('Failed to toggle selection:', error);
    }
  }, [images, selectedCount]);

  // Get only selected images (for printing/viewing)
  const getSelectedImages = useCallback(() => {
    return images.filter(img => img.isSelected);
  }, [images]);

  return {
    session,
    images,
    isUploading,
    uploadProgress,
    uploadStatus,
    selectedCount,
    totalCount: images.length,
    
    // Actions
    initializeSession,
    uploadFiles,
    toggleSelection,
    loadImages,
    
    // Queries
    getSelectedImages,
  };
}
