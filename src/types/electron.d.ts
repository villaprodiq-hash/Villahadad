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
  checkCache?(path: string): Promise<string | null>;
  cacheImage?(path: string): Promise<string | null>;
  cacheMultipleImages?(paths: string[]): Promise<string[]>;
  clearCache?(): Promise<boolean | void>;
  openDirectory?(path?: string): Promise<string | null>;
  openPath?(path: string): Promise<{ success: boolean; error?: string }>;
  showInFolder?(path: string): Promise<{ success: boolean; error?: string }>;
  openInPhotoshop?(path: string): Promise<{ success: boolean; app?: string; error?: string }>;
  listDirectory?(path: string): Promise<Array<
    | string
    | {
        name: string;
        path: string;
        size?: number;
        modified?: string;
        isDirectory?: boolean;
      }
  >>;
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
  copyToEdited?(
    sourcePath: string,
    sessionPath: string,
    newFileName?: string
  ): Promise<{ success: boolean; destPath?: string; error?: string }>;
  moveEditedToFinal?(
    sessionPath: string,
    fileNames?: string[]
  ): Promise<{
    success: boolean;
    moved: number;
    failed: number;
    skipped: number;
    errors: string[];
    movedPaths: string[];
    movedFileNames: string[];
  }>;
  onIngestionProgress(callback: (data: { progress: number; status: string }) => void): () => void;
  onSessionUpdate(callback: (data: unknown) => void): () => void;
  onAppNotification?(callback: (data: unknown) => void): () => void;
  processFileBuffers?(
    files: Array<{ name: string; type?: string; buffer: number[] | ArrayBuffer }>,
    sessionInfo: { clientName: string; sessionId: string; date: Date }
  ): Promise<{
    success: Array<{
      id?: string;
      original: string;
      local: string;
      cloud: string | null;
      thumbnail?: string | null;
      fileName: string;
      r2Error?: string | null;
    }>;
    failed: Array<{ filePath: string; error: string }>;
    cloudUrls: Array<string | null>;
    localPaths: string[];
    thumbnailUrls?: Array<string | null>;
    r2?: { enabled: boolean; bucket: string | null; lastError: string | null };
  }>;
  getR2Status?(): Promise<{ enabled: boolean; bucket?: string | null; lastError?: string | null }>;
  getStats?(sessionPath: string): Promise<{ raw: number; selected: number; edited: number; final: number } | null>;
  getSessionStats?(sessionPath: string): Promise<{ raw: number; selected: number; edited: number; final: number } | null>;
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
  checkNAS(): Promise<
    | boolean
    | {
        connected?: boolean;
        basePath?: string | null;
        photoFolderPath?: string | null;
        appFolderPath?: string | null;
        isLocalCache?: boolean;
        localCachePath?: string;
        smbUrl?: string;
        photoFolder?: string;
        appSubfolder?: string;
        platform?: string;
        timestamp?: string;
        photoFolderStatus?: { exists: boolean; writable: boolean };
        appFolderStatus?: { exists: boolean; initialized: boolean; path: string };
      }
  >;
  getCacheStatus(): Promise<{
    usingCache: boolean;
    nasAvailable: boolean;
    cachePath: string;
    cacheSize: string;
    cacheSizeBytes: number;
    pendingChanges?: number;
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
  openFolder(subPath?: string): Promise<{ success: boolean; method?: string; path?: string; alreadyConnected?: boolean }>;
  openAppFolder(): Promise<{ success: boolean; path: string }>;
  testConnection?(): Promise<{ success: boolean; error?: string }>;
  mount?(): Promise<{ success: boolean; path?: string; error?: string }>;
  detect?(): Promise<{ found: boolean; path?: string; error?: string; attempts?: string[] }>;
}

export interface LanSyncEvent {
  packetId?: string;
  sourceId?: string;
  channel: string;
  payload: unknown;
  timestamp?: string;
  remoteAddress?: string | null;
}

export interface LanSyncAPI {
  publish(channel: string, payload: unknown): Promise<{ success: boolean; error?: string }>;
  onEvent(callback: (event: LanSyncEvent) => void): () => void;
}

export interface ChatAttachmentUploadPayload {
  fileName: string;
  mimeType?: string;
  sourcePath?: string;
  buffer?: number[] | ArrayBuffer | Uint8Array;
}

export interface ChatAttachmentUploadResult {
  success: boolean;
  path?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

export interface ChatBridgeAPI {
  storeAttachment(payload: ChatAttachmentUploadPayload): Promise<ChatAttachmentUploadResult>;
}

export interface AuthAPI {
  checkBiometric(): Promise<boolean>;
  promptTouchID(reason?: string): Promise<boolean>;
}

export interface OpenWhatsAppResult {
  success: boolean;
  mode?: 'app' | 'web';
  url?: string;
  error?: string;
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
  lanSync?: LanSyncAPI;
  chat?: ChatBridgeAPI;
  auth?: AuthAPI;
  onUpdateStatus?: (callback: (status: string) => void) => (() => void) | void;
  checkForUpdates?: () => Promise<{ hasUpdate?: boolean; version?: string; error?: string }>;
  installUpdate?: () => Promise<{ success?: boolean; error?: string } | void>;
  getAppVersion?: () => Promise<{ version: string }>;
  downloadUpdate?: () => Promise<{ success?: boolean; error?: string } | void>;
  saveBackupFile?: (payload: { fileName: string; data: string; mimeType?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  openBackupFile?: () => Promise<{ success: boolean; data?: string; fileName?: string; error?: string }>;
  openWhatsApp?: (url: string) => Promise<OpenWhatsAppResult> | void;
  getSystemInfo?: () => Promise<{ arch: string; platform: string }>;
  setAlwaysOnTop?: (enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
}

// Extend the global Window interface
declare global {
  interface File {
    path?: string;
  }

  interface Window {
    electronAPI?: ElectronAPI;
    __supabase?: unknown;
  }
}

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
