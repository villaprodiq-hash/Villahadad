/**
 * 🖥️ Electron API Type Definitions
 * 
 * Provides TypeScript type safety for the Electron IPC API
 * exposed via the preload script.
 */

// Database Operations
export interface DatabaseAPI {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  run(sql: string, params?: unknown[]): Promise<{ lastID?: number; changes: number }>;
  get(sql: string, params?: unknown[]): Promise<unknown | null | undefined>;
  all(sql: string, params?: unknown[]): Promise<unknown[]>;
  // Extended methods for IPC
  getStatus(): Promise<{ postgres: boolean; cache: boolean }>;
  isReady(): boolean;
  getError(): string | null;
}

// File System Operations
export interface FileSystemAPI {
  readFile?(path: string): Promise<string>;
  writeFile?(path: string, content: string): Promise<void>;
  exists?(path: string): Promise<boolean>;
  mkdir?(path: string): Promise<void>;
  readdir?(path: string): Promise<string[]>;
  checkCache?(path: string): Promise<boolean>;
  cacheImage?(path: string): Promise<string>;
  cacheMultipleImages?(paths: string[]): Promise<string[]>;
  clearCache?(): Promise<void>;
  openDirectory?(): Promise<string | null>;
  listDirectory?(path: string): Promise<string[]>;
  getDiskStats?(): Promise<{ free: number; total: number }>;
  checkNasStatus(): Promise<{ connected: boolean; path?: string }>;
}

// Auto Update Operations
export interface AutoUpdateAPI {
  checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string }>;
  installUpdate(): Promise<void>;
  onUpdateStatus(callback: (status: string) => void): () => void;
  onUpdateProgress(callback: (progress: number) => void): () => void;
}

// App Operations
export interface AppAPI {
  getVersion(): Promise<string>;
  getPlatform(): Promise<string>;
  quit(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
}

// Session Lifecycle Operations
export interface SessionLifecycleFolderStructure {
  root: string;
  raw: string;
  selected: string;
  edited: string;
  final: string;
}

export interface SessionLifecycleAPI {
  createSessionDirectory(clientName: string, sessionId: string, date: string, bookingDetails?: Record<string, unknown>): Promise<{
    success: boolean;
    sessionPath?: string;
    folders?: SessionLifecycleFolderStructure;
    error?: string;
  }>;
  checkSessionExists(clientName: string, sessionId: string, date: string): Promise<boolean>;
  getSessionPath(clientName: string, sessionId: string, date: string): Promise<string>;
  processFiles(filePaths: string[], sessionInfo: {
    clientName: string;
    sessionId: string;
    date: Date;
  }): Promise<{
    success: Array<{
      original: string;
      local: string;
      cloud: string;
      fileName: string;
    }>;
    failed: Array<{
      filePath: string;
      error: string;
    }>;
    cloudUrls: string[];
    localPaths: string[];
  }>;
  copyToSelected(sessionPath: string, fileNames: string[]): Promise<{
    success: boolean;
    copied: number;
    failed: number;
    errors: string[];
  }>;
  onIngestionProgress(callback: (data: { progress: number; status: string }) => void): () => void;
  onSessionUpdate(callback: (data: unknown) => void): () => void;
}

// Editor API for photo editing (uses original images from NAS)
export interface EditorAPI {
  getOriginalPath(sessionPath: string, imageFileName: string, sourceFolder?: string): Promise<string>;
  getOriginalImages(sessionPath: string, folder?: string): Promise<Array<{
    name: string;
    path: string;
    size: number;
    modified: Date;
    folder: string;
  }>>;
  saveEdited(sessionPath: string, originalFileName: string, editedImageBuffer: Uint8Array, outputFormat?: string): Promise<string>;
}

// Storage Management API (NAS/Local Cache)
export interface StorageAPI {
  checkNAS(): Promise<boolean>;
  getCacheStatus(): Promise<{
    usingCache: boolean;
    nasAvailable: boolean;
    cachePath: string;
    cacheSize: string;
    cacheSizeBytes: number;
  }>;
  syncCache(clientName: string, sessionId: string): Promise<{
    success: boolean;
    transferred: number;
    skipped: number;
    errors: Array<{ file: string; error: string }>;
    cacheKept?: boolean;
    message?: string;
  }>;
}

// ✅ NAS Configuration API
export interface NasConfigAPI {
  getConfig(): Promise<{
    smbUrl: string;
    macosMountPath: string;
    appSubfolder: string;
    appFolderPath: string;
    nasRootPath: string;
    currentPath: string;
    isLocalCache: boolean;
    platform: string;
    restrictToAppFolder: boolean;
  }>;
  setSmbUrl(url: string): Promise<{ success: boolean; url: string }>;
  setAppSubfolder(subfolder: string): Promise<{ success: boolean; subfolder: string; appFolderPath: string }>;
  initializeAppFolder(): Promise<{ success: boolean; path?: string; error?: string }>;
  openFolder(subPath?: string): Promise<{ success: boolean; method?: string; path?: string }>;
  openAppFolder(): Promise<{ success: boolean; path: string }>;
}

// Main Electron API Interface (all properties optional for Web compatibility)
export interface ElectronAPI {
  db?: DatabaseAPI;
  fileSystem?: FileSystemAPI;
  autoUpdate?: AutoUpdateAPI;
  app?: AppAPI;
  sessionLifecycle?: SessionLifecycleAPI;
  editor?: EditorAPI;
  storage?: StorageAPI;
  nasConfig?: NasConfigAPI;
}

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __supabase?: unknown;
  }
}

// Export types for use in other files
export type { ElectronAPI };

// Utility type for safe IPC calls
export type IPCResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Database Row Types
export interface DatabaseRow {
  [key: string]: unknown;
}

// Query Result Types
export interface QueryResult<T = DatabaseRow> {
  rows: T[];
}

export {};
