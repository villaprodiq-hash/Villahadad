/**
 * NasConfig
 * 
 * Manages NAS connection settings and paths
 * Supports SMB URLs, mounted volumes, and multiple NAS types
 * 
 * ✅ Updated: VillaHadad NAS - Gallery mounted directly at /Volumes/Gallery
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ✅ CONFIG VERSION - Increment to force reset old configs
const CONFIG_VERSION = 6;

class NasConfig {
  constructor() {
    // config file path
    this.configPath = path.join(app.getPath('userData'), 'nas-config.json');
    
    // ✅ Default configurations - VillaHadad NAS
    this.defaults = {
      // Config version for migration
      _version: CONFIG_VERSION,
      
      // SMB URL from user
      smbUrl: 'smb://VillaHadad._smb._tcp.local',
      
      // ✅ Primary mounted volume path (macOS)
      // VillaHadad NAS Gallery mounts directly as /Volumes/Gallery
      macosMountPath: '/Volumes/Gallery',
      
      // ✅ Empty because Gallery IS the mount point itself
      photoFolder: '',
      
      // Windows UNC path
      windowsUncPath: '\\\\VillaHadad\\Gallery',
      
      // Linux mount path
      linuxMountPath: '/mnt/villahadad/Gallery',
      
      // ✅ Alternative paths to check (in order of priority)
      alternativePaths: [
        '/Volumes/Gallery',                // ✅ Primary - Gallery mounts directly
        '/Volumes/Gallery-1',              // If mounted with suffix -1
        '/Volumes/VillaHadad/Gallery',     // Alternative: inside VillaHadad
        '/Volumes/VillaHadad',             // Alternative: root of VillaHadad
        '/Volumes/VillaHadad-1/Gallery',   // If mounted with suffix -1
        '/Volumes/VillaHadad-1',           // If mounted with suffix -1
        '/Volumes/Studio Archive',         // Alternative storage
        '/Volumes/docker',                 // Legacy
        '/Volumes/Synology',               // Generic Synology
      ],
      
      // ✅ IP Address for direct connection (discovered: 192.168.68.113)
      nasIpAddress: '192.168.68.113',
      smbPort: 445,
      
      // ✅ App-specific subfolder inside Gallery
      // Structure: /Volumes/Gallery/VillaApp/2026/02/ClientName_session/
      appSubfolder: 'VillaApp',
      
      // ✅ NAS User credentials (optional)
      // Can be: 'mohamed', 'guest', or empty for auto-detect
      nasUser: '',
      nasPassword: '',
      // Alternative usernames to try
      alternativeUsers: ['mohamed', 'guest', 'admin', ''],
      
      // ✅ Permissions
      restrictToAppFolder: true,
      
      // Connection type: 'smb', 'mounted', 'local'
      connectionType: 'auto',
      
      // Use local cache if NAS unavailable
      useLocalCache: true,
      
      // Local cache path (Mac)
      localCachePath: path.join(app.getPath('documents'), 'VillaHadad_Cache'),
    };
    
    this.config = this.loadConfig();
    
    // Connection state
    this._isConnected = false;
    this._lastCheck = 0;
    this._checkInterval = 30000; // 30 seconds
  }

  /**
   * Load config from file or create default
   * ✅ Auto-reset if config version is outdated
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const savedConfig = JSON.parse(data);
        
        // ✅ Check version - reset if outdated
        if (!savedConfig._version || savedConfig._version < CONFIG_VERSION) {
          console.log('[NasConfig] ⚠️ Outdated config detected, resetting to defaults...');
          console.log('[NasConfig]   Old version:', savedConfig._version || 'none');
          console.log('[NasConfig]   New version:', CONFIG_VERSION);
          
          // Delete old config
          fs.unlinkSync(this.configPath);
          
          // Save new defaults
          fs.writeFileSync(this.configPath, JSON.stringify(this.defaults, null, 2));
          
          return { ...this.defaults };
        }
        
        return { ...this.defaults, ...savedConfig };
      }
    } catch (error) {
      console.error('[NasConfig] Failed to load config:', error);
    }
    
    // Save defaults on first run
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.defaults, null, 2));
    } catch (e) {
      console.error('[NasConfig] Failed to save default config:', e);
    }
    
    return { ...this.defaults };
  }

  /**
   * Save config to file
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('[NasConfig] Failed to save config:', error);
      return false;
    }
  }

  /**
   * Update config values
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    return this.config;
  }

  /**
   * Get current NAS status (cached for performance)
   */
  async getStatus() {
    const now = Date.now();
    
    // Use cached result if recent
    if (now - this._lastCheck < this._checkInterval) {
      return {
        connected: this._isConnected,
        path: this._lastPath,
        cached: true,
      };
    }
    
    // Fresh check
    const result = await this.checkNasAvailability();
    this._lastCheck = now;
    this._isConnected = result.connected;
    this._lastPath = result.path;
    
    return result;
  }

  /**
   * Force refresh NAS status
   */
  async refreshStatus() {
    this._lastCheck = 0;
    return this.getStatus();
  }

  /**
   * Check if a path is accessible (read + write)
   */
  isPathAccessible(testPath) {
    try {
      if (!testPath) return false;
      
      // For Windows UNC paths
      if (testPath.startsWith('\\\\')) {
        const exists = fs.existsSync(testPath);
        console.log(`[NasConfig] Checking UNC path: ${testPath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        return exists;
      }
      
      // For regular paths
      const exists = fs.existsSync(testPath);
      if (!exists) {
        console.log(`[NasConfig] Path not found: ${testPath}`);
        return false;
      }
      
      try {
        fs.accessSync(testPath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`[NasConfig] Path accessible: ${testPath}`);
        return true;
      } catch (accessErr) {
        console.log(`[NasConfig] Path exists but not accessible: ${testPath} - ${accessErr.message}`);
        return false;
      }
    } catch (err) {
      console.log(`[NasConfig] Error checking path: ${testPath} - ${err.message}`);
      return false;
    }
  }

  /**
   * Get current NAS root path based on platform and availability
   * Returns the base NAS path (not including photoFolder or appSubfolder)
   */
  getNasBasePath() {
    const platform = process.platform;
    
    // Check primary mounted path based on platform
    let mountedPath;
    switch (platform) {
      case 'darwin': // macOS
        mountedPath = this.config.macosMountPath;
        break;
      case 'win32': // Windows
        mountedPath = this.config.windowsUncPath;
        break;
      case 'linux':
        mountedPath = this.config.linuxMountPath;
        break;
      default:
        mountedPath = this.config.macosMountPath;
    }
    
    // Check if mounted path exists
    if (this.isPathAccessible(mountedPath)) {
      console.log('[NasConfig] ✅ Using primary path:', mountedPath);
      return mountedPath;
    }
    
    // Try alternative paths
    for (const altPath of this.config.alternativePaths) {
      if (this.isPathAccessible(altPath)) {
        console.log('[NasConfig] ✅ Using alternative path:', altPath);
        return altPath;
      }
    }
    
    // Return null if no NAS found (caller should use local cache)
    console.log('[NasConfig] ⚠️ NAS not found, will use local cache');
    return null;
  }

  /**
   * Get the photos folder path (NAS + photoFolder)
   * Returns: /Volumes/Gallery (since photoFolder is empty)
   */
  getPhotoFolderPath() {
    const basePath = this.getNasBasePath();
    
    if (!basePath) {
      return this.config.localCachePath;
    }
    
    // If photoFolder is empty, return base path directly
    if (!this.config.photoFolder) {
      return basePath;
    }
    
    // If base path already includes the photo folder, don't add it again
    if (basePath.endsWith(`/${this.config.photoFolder}`) || 
        basePath.endsWith(`\\${this.config.photoFolder}`)) {
      return basePath;
    }
    
    return path.join(basePath, this.config.photoFolder);
  }

  /**
   * Get the App-specific folder path
   * Returns: /Volumes/Gallery/VillaApp/
   */
  getAppFolderPath() {
    const photoPath = this.getPhotoFolderPath();
    
    // If using local cache, return cache path directly
    if (photoPath === this.config.localCachePath) {
      return photoPath;
    }
    
    return path.join(photoPath, this.config.appSubfolder);
  }

  /**
   * Get local cache path
   */
  getLocalCachePath() {
    return this.config.localCachePath;
  }

  /**
   * Check if currently using local cache
   */
  isUsingLocalCache() {
    const nasPath = this.getNasBasePath();
    return !nasPath;
  }

  /**
   * Initialize app folder (creates it if not exists)
   */
  async initializeAppFolder() {
    const appFolder = this.getAppFolderPath();
    
    try {
      // Create app folder if not exists
      await fs.promises.mkdir(appFolder, { recursive: true });
      
      // Create README file
      const readmePath = path.join(appFolder, 'README.txt');
      if (!fs.existsSync(readmePath)) {
        const readmeContent = `╔══════════════════════════════════════════════════════════════╗
║           VillaHadad App - Photo Sessions Folder             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  This folder contains all photo sessions created by the      ║
║  VillaHadad Desktop Application.                             ║
║                                                              ║
║  Structure:                                                  ║
║  └── YYYY/                                                   ║
║      └── MM/                                                 ║
║          └── ClientName_sessionId/                           ║
║              ├── 01_RAW/        Original photos from camera  ║
║              ├── 02_SELECTED/   Client selected photos       ║
║              ├── 03_EDITED/     Edited photos                ║
║              └── 04_FINAL/      Final photos for delivery    ║
║                                                              ║
║  ⚠️  DO NOT manually modify or delete these folders.         ║
║                                                              ║
║  Created: ${new Date().toISOString()}                        ║
╚══════════════════════════════════════════════════════════════╝
`;
        await fs.promises.writeFile(readmePath, readmeContent);
      }
      
      console.log('[NasConfig] ✅ App folder initialized:', appFolder);
      return { success: true, path: appFolder };
    } catch (error) {
      console.error('[NasConfig] ❌ Failed to initialize app folder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check NAS availability and return detailed status
   */
  async checkNasAvailability() {
    const basePath = this.getNasBasePath();
    const isLocalCache = !basePath;
    const photoFolderPath = this.getPhotoFolderPath();
    const appFolderPath = this.getAppFolderPath();
    
    // Check photo folder accessibility
    let photoFolderStatus = { exists: false, writable: false };
    if (!isLocalCache) {
      try {
        photoFolderStatus.exists = fs.existsSync(photoFolderPath);
        if (photoFolderStatus.exists) {
          fs.accessSync(photoFolderPath, fs.constants.W_OK);
          photoFolderStatus.writable = true;
        }
      } catch {
        photoFolderStatus.writable = false;
      }
    }
    
    // Check/create app folder
    let appFolderStatus = { exists: false, initialized: false, path: appFolderPath };
    if (!isLocalCache && photoFolderStatus.writable) {
      try {
        const initResult = await this.initializeAppFolder();
        appFolderStatus = { 
          exists: true, 
          initialized: initResult.success,
          path: appFolderPath
        };
      } catch (error) {
        console.error('[NasConfig] App folder check failed:', error);
      }
    }
    
    return {
      connected: !isLocalCache,
      basePath: basePath,
      photoFolderPath: photoFolderPath,
      appFolderPath: appFolderPath,
      photoFolderStatus,
      appFolderStatus,
      isLocalCache,
      localCachePath: this.config.localCachePath,
      smbUrl: this.config.smbUrl,
      photoFolder: this.config.photoFolder,
      appSubfolder: this.config.appSubfolder,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Open NAS folder in Finder/Explorer
   */
  async openNasFolder(subPath = '') {
    const { shell } = require('electron');
    const basePath = this.getPhotoFolderPath();
    
    // If NAS not available, try to open SMB URL
    if (this.isUsingLocalCache()) {
      try {
        await shell.openExternal(this.config.smbUrl);
        return { success: true, method: 'smb-url' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    
    // Open local path
    const fullPath = path.join(basePath, subPath);
    shell.openPath(fullPath);
    return { success: true, method: 'local-path', path: fullPath };
  }

  /**
   * Open App folder in Finder
   */
  async openAppFolder() {
    const { shell } = require('electron');
    const appPath = this.getAppFolderPath();
    
    if (this.isUsingLocalCache()) {
      // Ensure local cache exists
      await fs.promises.mkdir(appPath, { recursive: true });
    }
    
    shell.openPath(appPath);
    return { success: true, path: appPath };
  }

  /**
   * Get session folder path for a booking
   * @param {string} clientName 
   * @param {string} sessionId 
   * @param {Date|string} date 
   */
  getSessionPath(clientName, sessionId, date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear().toString();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const sanitizedName = this.sanitizeFolderName(clientName);
    const folderName = `${sanitizedName}_${sessionId}`;
    
    return path.join(this.getAppFolderPath(), year, month, folderName);
  }

  /**
   * Try to mount/connect to NAS automatically
   * Uses SMB URL to trigger macOS connection dialog
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async mountNas() {
    const { shell } = require('electron');
    
    try {
      // First check if already mounted
      if (this.getNasBasePath()) {
        return { success: true, message: 'NAS already mounted', alreadyConnected: true };
      }
      
      // Try to open SMB URL to trigger connection
      const smbUrl = this.config.smbUrl;
      console.log('[NasConfig] Attempting to mount NAS:', smbUrl);
      
      await shell.openExternal(smbUrl);
      
      return { 
        success: true, 
        message: 'Connection dialog opened. Please select Gallery folder in Finder.',
        action: 'finder_dialog_opened'
      };
    } catch (error) {
      console.error('[NasConfig] Failed to mount NAS:', error);
      return { 
        success: false, 
        message: error.message,
        error: error.message 
      };
    }
  }

  /**
   * Force check all possible NAS paths and try to auto-detect
   * @returns {Promise<{found: boolean, path: string|null, attempts: string[]}>}
   */
  async detectNas() {
    const attempts = [];
    const possiblePaths = [
      '/Volumes/VillaHadad/Gallery',
      '/Volumes/VillaHadad',
      '/Volumes/VillaHadad-1/Gallery',
      '/Volumes/VillaHadad-1',
      '/Volumes/Gallery',
      '/Volumes/Gallery-1',
    ];
    
    // Try all possible paths
    for (const testPath of possiblePaths) {
      try {
        attempts.push(`Checking: ${testPath}`);
        if (this.isPathAccessible(testPath)) {
          attempts.push(`✅ Found: ${testPath}`);
          return { found: true, path: testPath, attempts };
        }
      } catch (e) {
        attempts.push(`❌ Failed: ${testPath} - ${e.message}`);
      }
    }
    
    // Try to ping the NAS IP
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      attempts.push(`Pinging: ${this.config.nasIpAddress}`);
      await execPromise(`ping -c 1 -W 2000 ${this.config.nasIpAddress}`);
      attempts.push(`✅ NAS is online at ${this.config.nasIpAddress} but not mounted`);
    } catch {
      attempts.push(`❌ NAS not reachable at ${this.config.nasIpAddress}`);
    }
    
    return { found: false, path: null, attempts };
  }

  /**
   * Try to auto-mount NAS on startup using mount_smbfs
   * This is a more aggressive approach that tries to mount directly
   * @returns {Promise<{success: boolean, path?: string, method?: string, error?: string}>}
   */
  async autoMountOnStartup() {
    console.log('[NasConfig] 🔌 Auto-mount check on startup...');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // First check if already mounted by any user
    const basePath = this.getNasBasePath();
    if (basePath) {
      console.log('[NasConfig] ✅ NAS already mounted at:', basePath);
      return { success: true, path: basePath, method: 'already-mounted' };
    }
    
    // Check current mount table for VillaHadad
    try {
      const mountOutput = await execPromise('mount | grep -i "villahadad\|192.168.68.113"');
      console.log('[NasConfig] Found existing mount:', mountOutput.stdout);
      
      // Parse mount point from output
      const mountLines = mountOutput.stdout.trim().split('\n');
      for (const line of mountLines) {
        const match = line.match(/on\s+(\/Volumes\/[^\s]+)/);
        if (match) {
          const mountedPath = match[1];
          console.log('[NasConfig] ✅ NAS already mounted by another user at:', mountedPath);
          
          // Check if Gallery folder exists inside
          const galleryPath = path.join(mountedPath, 'Gallery');
          if (this.isPathAccessible(galleryPath)) {
            console.log('[NasConfig] ✅ Found Gallery folder at:', galleryPath);
            this.config.macosMountPath = galleryPath;
            this.saveConfig();
            this.refreshPaths();
            return { success: true, path: galleryPath, method: 'existing-mount-detected' };
          } else if (this.isPathAccessible(mountedPath)) {
            // The mount point itself might be Gallery
            console.log('[NasConfig] ✅ Using existing mount as Gallery:', mountedPath);
            this.config.macosMountPath = mountedPath;
            this.saveConfig();
            this.refreshPaths();
            return { success: true, path: mountedPath, method: 'existing-mount-root' };
          }
        }
      }
    } catch (e) {
      // No existing mount found
      console.log('[NasConfig] No existing VillaHadad mount found');
    }
    
    // Try different mount points
    const mountPoints = [
      '/Volumes/VillaHadad-Gallery',
      '/Volumes/VillaHadad',
      '/Volumes/Gallery-VillaHadad'
    ];
    
    // Try different usernames (including empty for guest)
    const usersToTry = [
      ...(this.config.nasUser ? [this.config.nasUser] : []),
      ...(this.config.alternativeUsers || []),
      'guest',
      ''  // anonymous
    ];
    
    // Build SMB paths with different usernames
    const smbPaths = [];
    for (const user of usersToTry) {
      if (user) {
        smbPaths.push(`//${user}@${this.config.nasIpAddress}/Gallery`);
      } else {
        smbPaths.push(`//${this.config.nasIpAddress}/Gallery`);  // anonymous
      }
    }
    // Also try direct IP without user
    smbPaths.push(`//192.168.68.113/Gallery`);
    
    for (const mountPoint of mountPoints) {
      for (const smbPath of smbPaths) {
        try {
          console.log(`[NasConfig] Trying to mount: ${smbPath} -> ${mountPoint}`);
          
          // Create mount point if not exists
          await execPromise(`mkdir -p "${mountPoint}"`);
          
          // Check if already mounted at this point
          const checkMount = await execPromise(`mount | grep "${mountPoint}"`).catch(() => null);
          if (checkMount) {
            console.log('[NasConfig] Already mounted at:', mountPoint);
            this.refreshPaths();
            return { success: true, path: mountPoint, method: 'already-mounted' };
          }
          
          // Try to mount
          await execPromise(`mount_smbfs "${smbPath}" "${mountPoint}" 2>&1`);
          
          // Verify it's accessible
          if (this.isPathAccessible(mountPoint)) {
            console.log('[NasConfig] ✅ Auto-mounted successfully at:', mountPoint);
            
            // Update config to use this path
            this.config.macosMountPath = mountPoint;
            this.saveConfig();
            this.refreshPaths();
            
            return { success: true, path: mountPoint, method: 'auto-mounted' };
          }
        } catch (error) {
          console.log(`[NasConfig] Mount attempt failed: ${smbPath} -> ${mountPoint}`, error.message);
          // Continue to next attempt
        }
      }
    }
    
    console.log('[NasConfig] ⚠️ All auto-mount attempts failed');
    return { success: false, error: 'Could not auto-mount NAS' };
  }

  /**
   * Sanitize folder name
   */
  sanitizeFolderName(name) {
    return name
      .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '')  // Keep Arabic + alphanumeric
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  NasConfig,
  getInstance: () => {
    if (!instance) {
      instance = new NasConfig();
    }
    return instance;
  },
};
