const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] 🔌 Preload Script Starting (IPC Mode)...');

// Expose IPC-based database API
const electronAPI = {
  db: {
    // Query method - forwards to Main Process
    query: async (sql, params = []) => {
      try {
        const result = await ipcRenderer.invoke('db:query', sql, params);
        if (!result.success) {
          throw new Error(result.error || 'Query failed');
        }
        return result.rows;
      } catch (error) {
        console.error('IPC Query Error:', error);
        throw error;
      }
    },

    // Run method (for inserts/updates)
    run: async (sql, params = []) => {
      try {
        // ✅ FIX: Use 'db:run' channel (not db:query) and handle 'info' object
        const result = await ipcRenderer.invoke('db:run', sql, params); 
        
        if (!result || !result.success) {
          throw new Error(result?.error || 'Run failed');
        }

        // better-sqlite3 returns 'info' object with 'changes'
        // If result.info exists, use it. Fallback to 0.
        const changes = result.info ? result.info.changes : 0;
        return { changes };
      } catch (error) {
        console.error('IPC Run Error:', error);
        throw error;
      }
    },

    // Get single row
    get: async (sql, params = []) => {
      try {
        const result = await ipcRenderer.invoke('db:query', sql, params);
        if (!result.success) {
          throw new Error(result.error || 'Get failed');
        }
        return result.rows[0] || null;
      } catch (error) {
        console.error('IPC Get Error:', error);
        throw error;
      }
    },

    // Get connection status
    getStatus: async () => {
      try {
        return await ipcRenderer.invoke('db:status');
      } catch (error) {
        return { postgres: false, cache: false };
      }
    },

    // Legacy compatibility
    isReady: () => {
      console.log('[Preload] db.isReady() called');
      return true;
    },
    getError: () => null,
  },

  // File System API for Caching
  fileSystem: {
    checkCache: path => ipcRenderer.invoke('file:check-cache', path),
    cacheImage: path => ipcRenderer.invoke('file:cache-image', path),
    cacheMultipleImages: paths => ipcRenderer.invoke('file:cache-multiple-images', paths),
    clearCache: () => ipcRenderer.invoke('file:clear-cache'),
    openDirectory: () => ipcRenderer.invoke('file:open-directory'),
    openPath: path => ipcRenderer.invoke('file:open-path', path),
    showInFolder: path => ipcRenderer.invoke('file:show-in-folder', path),
    openInPhotoshop: path => ipcRenderer.invoke('file:open-in-photoshop', path),
    listDirectory: path => ipcRenderer.invoke('file:list-directory', path),
    getDiskStats: () => ipcRenderer.invoke('file:get-disk-stats'),
    checkNasStatus: () => ipcRenderer.invoke('nas:check-status'),
  },

  // Session Lifecycle Pipeline API (NEW)
  sessionLifecycle: {
    // Directory Management
    createSessionDirectory: (clientName, sessionId, date, bookingDetails = null) =>
      ipcRenderer.invoke('session:createDirectory', { clientName, sessionId, date, bookingDetails }),
    checkSessionExists: (clientName, sessionId, date) =>
      ipcRenderer.invoke('session:checkExists', { clientName, sessionId, date }),
    getSessionPath: (clientName, sessionId, date) =>
      ipcRenderer.invoke('session:getPath', { clientName, sessionId, date }),
    
    // 🔍 NEW: Get file counts for automated status detection
    getStats: (sessionPath) =>
      ipcRenderer.invoke('session:getStats', { sessionPath }),
    
    // Copy selected files from 01_RAW to 02_SELECTED
    copyToSelected: (sessionPath, fileNames) =>
      ipcRenderer.invoke('session:copyToSelected', { sessionPath, fileNames }),
    copyToEdited: (sourcePath, sessionPath, newFileName) =>
      ipcRenderer.invoke('session:copyToEdited', { sourcePath, sessionPath, newFileName }),
    moveEditedToFinal: (sessionPath, fileNames = []) =>
      ipcRenderer.invoke('session:moveEditedToFinal', { sessionPath, fileNames }),

    // File Ingestion (Dual-Path: NAS + R2 + Thumbnails)
    processFiles: (filePaths, sessionInfo) =>
      ipcRenderer.invoke('ingestion:processFiles', { filePaths, sessionInfo }),
    processFileBuffers: (files, sessionInfo) =>
      ipcRenderer.invoke('ingestion:processFileBuffers', { files, sessionInfo }),
    onIngestionProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('ingestion:progress', handler);
      return () => ipcRenderer.removeListener('ingestion:progress', handler);
    },

    // Edited Photo Detection (03_EDITED watcher)
    watchEditedFolder: (sessionPath, sessionId) =>
      ipcRenderer.invoke('ingestion:watchEdited', { sessionPath, sessionId }),
    unwatchEditedFolder: (sessionId) =>
      ipcRenderer.invoke('ingestion:unwatchEdited', { sessionId }),
    scanEditedFolder: (sessionPath, sessionId) =>
      ipcRenderer.invoke('ingestion:scanEdited', { sessionPath, sessionId }),
    getR2Status: () =>
      ipcRenderer.invoke('ingestion:getR2Status'),
    runR2Cleanup: () =>
      ipcRenderer.invoke('ingestion:runR2Cleanup'),
    cleanupR2Session: (sessionId) =>
      ipcRenderer.invoke('ingestion:cleanupR2Session', { sessionId }),
    
    // Real-time updates
    onSessionUpdate: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('session:update', handler);
      return () => ipcRenderer.removeListener('session:update', handler);
    },

    // R2 cleanup notification from main process → renderer
    onAppNotification: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('app:notification', handler);
      return () => ipcRenderer.removeListener('app:notification', handler);
    },
  },

  // Editor API - Work with original images from NAS
  editor: {
    // Get original image path (from NAS, not compressed R2)
    getOriginalPath: (sessionPath, imageFileName, sourceFolder) =>
      ipcRenderer.invoke('editor:getOriginalPath', { sessionPath, imageFileName, sourceFolder }),
    
    // Get all original images for editing
    getOriginalImages: (sessionPath, folder) =>
      ipcRenderer.invoke('editor:getOriginalImages', { sessionPath, folder }),
    
    // Save edited image
    saveEdited: (sessionPath, originalFileName, editedImageBuffer, outputFormat) =>
      ipcRenderer.invoke('editor:saveEdited', { sessionPath, originalFileName, editedImageBuffer, outputFormat }),
  },

  // Storage Management API (NAS/Cache)
  storage: {
    // Check NAS availability
    checkNAS: () => ipcRenderer.invoke('storage:checkNAS'),
    
    // Get cache status
    getCacheStatus: () => ipcRenderer.invoke('storage:getCacheStatus'),
    
    // Sync local cache to NAS
    syncCache: (clientName, sessionId) =>
      ipcRenderer.invoke('storage:syncCache', { clientName, sessionId }),
  },

  // ✅ NAS Configuration API
  nasConfig: {
    // Get current NAS config
    getConfig: () => ipcRenderer.invoke('nas:get-config'),
    
    // Set SMB URL
    setSmbUrl: (url) => ipcRenderer.invoke('nas:set-smb-url', { url }),
    
    // Set App Subfolder
    setAppSubfolder: (subfolder) => ipcRenderer.invoke('nas:set-app-subfolder', { subfolder }),
    
    // Initialize app folder
    initializeAppFolder: () => ipcRenderer.invoke('nas:initialize-app-folder'),
    
    // Open NAS folder
    openFolder: (subPath) => ipcRenderer.invoke('nas:open-folder', { subPath }),
    
    // Open app-specific folder
    openAppFolder: () => ipcRenderer.invoke('nas:open-app-folder'),
    
    // 🔌 NEW: Mount/Connect to NAS
    mount: () => ipcRenderer.invoke('nas:mount'),
    
    // 🔍 NEW: Auto-detect NAS
    detect: () => ipcRenderer.invoke('nas:detect'),
  },

  // Biometric Auth API
  auth: {
    checkBiometric: () => ipcRenderer.invoke('auth:check-biometric'),
    promptTouchID: reason => ipcRenderer.invoke('auth:prompt-touch-id', reason),
  },

  // ✅ Auto Update API (Enhanced)
  onUpdateStatus: callback => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update_status', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('update_status', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),
  installUpdate: () => ipcRenderer.invoke('app:restart-install'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  downloadUpdate: () => ipcRenderer.invoke('app:download-update'),

  // ✅ Backup API (New)
  saveBackupFile: (filename, content) => ipcRenderer.invoke('backup:save-file', filename, content),
  openBackupFile: () => ipcRenderer.invoke('backup:open-file'),

  // WhatsApp Integration
  openWhatsApp: url => ipcRenderer.invoke('whatsapp:open', url),

  // ⚡️ System Info API (for Performance Mode detection)
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),

  // Window Controls
  setAlwaysOnTop: enabled => ipcRenderer.invoke('window:set-always-on-top', { enabled }),

  // LAN Sync (cross-device on same network without internet)
  lanSync: {
    publish: (channel, payload) => ipcRenderer.invoke('lan:publish', { channel, payload }),
    onEvent: callback => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('lan:sync-event', handler);
      return () => ipcRenderer.removeListener('lan:sync-event', handler);
    },
  },

  // Chat attachment bridge
  chat: {
    storeAttachment: payload => ipcRenderer.invoke('chat:store-attachment', payload),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('[Preload] ✅ Preload Script Complete - IPC API Exposed');
console.log('[Preload] 📦 Available APIs:', Object.keys(electronAPI).join(', '));
