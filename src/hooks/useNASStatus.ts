/**
 * useNASStatus Hook
 * 
 * Monitors NAS connection status and provides real-time updates
 * Handles automatic reconnection detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NASStatus {
  connected: boolean;
  basePath: string | null;
  photoFolderPath: string | null;
  appFolderPath: string | null;
  isLocalCache: boolean;
  localCachePath: string;
  smbUrl: string;
  photoFolder: string;
  appSubfolder: string;
  platform: string;
  timestamp: string;
  loading: boolean;
  error: string | null;
  // Additional info
  photoFolderStatus?: {
    exists: boolean;
    writable: boolean;
  };
  appFolderStatus?: {
    exists: boolean;
    initialized: boolean;
    path: string;
  };
}

const initialStatus: NASStatus = {
  connected: false,
  basePath: null,
  photoFolderPath: null,
  appFolderPath: null,
  isLocalCache: true,
  localCachePath: '',
  smbUrl: '',
  photoFolder: 'Gallery',
  appSubfolder: 'VillaApp',
  platform: 'darwin',
  timestamp: '',
  loading: true,
  error: null,
};

export function useNASStatus(refreshInterval = 30000) {
  const [status, setStatus] = useState<NASStatus>(initialStatus);
  const [pendingSync, setPendingSync] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousConnected = useRef<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      // @ts-ignore - electronAPI is exposed via preload
      if (!window.electronAPI?.storage?.checkNAS) {
        setStatus(prev => ({ ...prev, loading: false, error: 'API not available' }));
        return;
      }

      // @ts-ignore
      const result = await window.electronAPI.storage.checkNAS();
      
      // @ts-ignore
      const cacheStatus = await window.electronAPI.storage.getCacheStatus?.();
      
      const newStatus: NASStatus = {
        connected: result.connected ?? false,
        basePath: result.basePath ?? null,
        photoFolderPath: result.photoFolderPath ?? null,
        appFolderPath: result.appFolderPath ?? null,
        isLocalCache: result.isLocalCache ?? true,
        localCachePath: result.localCachePath ?? '',
        smbUrl: result.smbUrl ?? '',
        photoFolder: result.photoFolder ?? 'Gallery',
        appSubfolder: result.appSubfolder ?? 'VillaApp',
        platform: result.platform ?? 'darwin',
        timestamp: result.timestamp ?? new Date().toISOString(),
        loading: false,
        error: null,
        photoFolderStatus: result.photoFolderStatus,
        appFolderStatus: result.appFolderStatus,
      };

      setStatus(newStatus);

      // Track pending sync items
      if (cacheStatus?.pendingChanges) {
        setPendingSync(cacheStatus.pendingChanges);
      }

      // Detect connection state change
      if (previousConnected.current !== null && previousConnected.current !== newStatus.connected) {
        if (newStatus.connected) {
          console.log('🟢 NAS Reconnected!');
          // Could trigger sync here
        } else {
          console.log('🟠 NAS Disconnected - Using Local Cache');
        }
      }
      previousConnected.current = newStatus.connected;

    } catch (error) {
      console.error('[useNASStatus] Error:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(checkStatus, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkStatus, refreshInterval]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    await checkStatus();
  }, [checkStatus]);

  // Open NAS folder in Finder
  const openFolder = useCallback(async (subPath = '') => {
    try {
      // @ts-ignore
      return await window.electronAPI?.nasConfig?.openFolder?.(subPath);
    } catch (error) {
      console.error('[useNASStatus] openFolder error:', error);
      return { success: false, error };
    }
  }, []);

  // Open App folder specifically
  const openAppFolder = useCallback(async () => {
    try {
      // @ts-ignore
      return await window.electronAPI?.nasConfig?.openAppFolder?.();
    } catch (error) {
      console.error('[useNASStatus] openAppFolder error:', error);
      return { success: false, error };
    }
  }, []);

  // 🔌 NEW: Mount/Connect to NAS
  const mountNas = useCallback(async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI?.nasConfig?.mount?.();
      // Refresh status after mounting attempt
      await checkStatus();
      return result;
    } catch (error) {
      console.error('[useNASStatus] mountNas error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [checkStatus]);

  // 🔍 NEW: Auto-detect NAS
  const detectNas = useCallback(async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI?.nasConfig?.detect?.();
      // Refresh status if NAS was found
      if (result?.found) {
        await checkStatus();
      }
      return result;
    } catch (error) {
      console.error('[useNASStatus] detectNas error:', error);
      return { found: false, error: error instanceof Error ? error.message : 'Unknown error', attempts: [] };
    }
  }, [checkStatus]);

  return {
    ...status,
    pendingSync,
    refresh,
    openFolder,
    openAppFolder,
    mountNas,
    detectNas,
  };
}

export default useNASStatus;
