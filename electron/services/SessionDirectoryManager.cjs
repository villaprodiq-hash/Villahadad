/**
 * SessionDirectoryManager
 * 
 * Manages the session folder structure on NAS/Synology:
 * - Creates the folder hierarchy when a new session starts
 * - Organizes files into RAW, SELECTED, EDITED, FINAL folders
 * - Provides utilities for folder management
 * 
 * ✅ Updated: Works with NasConfig for /Volumes/VillaHadad/Gallery/VillaApp/
 */

const fs = require('fs-extra');
const path = require('path');
const { ipcMain, app } = require('electron');
const { getInstance: getNasConfig } = require('./NasConfig.cjs');

class SessionDirectoryManager {
  constructor(config = {}) {
    // Use NasConfig for dynamic path resolution
    this.nasConfig = getNasConfig();
    
    // ✅ Use App-specific folder from NasConfig
    // Path: /Volumes/VillaHadad/Gallery/VillaApp/
    this.appFolderPath = this.nasConfig.getAppFolderPath();
    this.nasRootPath = this.appFolderPath; // Use this for all operations
    
    // Local cache in Documents when NAS is unavailable
    this.localCachePath = config.localCachePath || this.nasConfig.config.localCachePath || path.join(app.getPath('documents'), 'VillaHadad_Cache');
    this.useLocalCache = this.nasConfig.isUsingLocalCache();
    
    console.log('[SessionDirectoryManager] Initialized:');
    console.log('  Photo Folder:', this.nasConfig.getPhotoFolderPath());
    console.log('  App Folder:', this.appFolderPath);
    console.log('  NAS Base:', this.nasConfig.getNasBasePath());
    console.log('  SMB URL:', this.nasConfig.config.smbUrl);
    console.log('  Local Cache:', this.localCachePath);
    console.log('  Using Local Cache:', this.useLocalCache);
    
    // Initialize app folder on startup
    this.initializeAppFolder();
  }
  
  /**
   * Initialize the app folder (creates if not exists)
   */
  async initializeAppFolder() {
    try {
      const result = await this.nasConfig.initializeAppFolder();
      if (result.success) {
        console.log('[SessionDirectoryManager] App folder ready:', result.path);
        // Update paths after initialization
        this.appFolderPath = this.nasConfig.getAppFolderPath();
        this.nasRootPath = this.appFolderPath;
        this.useLocalCache = this.nasConfig.isUsingLocalCache();
      } else {
        console.warn('[SessionDirectoryManager] App folder init failed:', result.error);
      }
      return result;
    } catch (error) {
      console.error('[SessionDirectoryManager] Failed to initialize app folder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh paths from NasConfig (call after NAS reconnect)
   */
  refreshPaths() {
    this.appFolderPath = this.nasConfig.getAppFolderPath();
    this.nasRootPath = this.appFolderPath;
    this.useLocalCache = this.nasConfig.isUsingLocalCache();
    console.log('[SessionDirectoryManager] Paths refreshed:', this.appFolderPath);
  }

  /**
   * Check if NAS is available
   * @returns {boolean}
   */
  async isNasAvailable() {
    try {
      // Refresh NAS config status
      await this.nasConfig.refreshStatus();
      const basePath = this.nasConfig.getNasBasePath();
      
      if (!basePath) return false;
      
      // Check if path exists and is writable
      await fs.access(basePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the active storage path (NAS or Local Cache)
   * @returns {string}
   */
  getActiveStoragePath() {
    return this.useLocalCache ? this.localCachePath : this.nasRootPath;
  }

  /**
   * Switch to local cache mode when NAS is unavailable
   */
  async switchToLocalCache() {
    this.useLocalCache = true;
    await fs.ensureDir(this.localCachePath);
    console.log('[SessionDirectoryManager] Switched to LOCAL CACHE mode');
    return this.localCachePath;
  }

  /**
   * Switch back to NAS mode
   */
  async switchToNAS() {
    const nasAvailable = await this.isNasAvailable();
    if (nasAvailable) {
      this.useLocalCache = false;
      this.refreshPaths();
      console.log('[SessionDirectoryManager] Switched to NAS mode');
      return true;
    }
    return false;
  }

  /**
   * Sync files from local cache to NAS
   * Called when NAS becomes available again
   * @param {string} clientName - Client name
   * @param {string} sessionId - Session ID
   * @returns {Object} { success, transferred, errors }
   */
  async syncCacheToNAS(clientName, sessionId) {
    const results = {
      success: true,
      transferred: 0,
      errors: [],
      skipped: 0
    };

    try {
      // Check NAS availability
      if (!await this.isNasAvailable()) {
        return { success: false, error: 'NAS not available', transferred: 0, errors: [], skipped: 0 };
      }

      // Build paths
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const sanitizedClientName = this.sanitizeFolderName(clientName);
      const sessionFolderName = `${sanitizedClientName}_${sessionId}`;
      
      const cacheSessionPath = path.join(this.localCachePath, year, month, sessionFolderName);
      
      // Get NAS app folder path
      this.refreshPaths();
      const nasSessionPath = path.join(this.nasRootPath, year, month, sessionFolderName);

      // Check if cache exists
      if (!await fs.pathExists(cacheSessionPath)) {
        return { success: true, transferred: 0, errors: [], skipped: 0, message: 'No cache found' };
      }

      // Ensure NAS directories exist
      await fs.ensureDir(path.join(nasSessionPath, '01_RAW'));
      await fs.ensureDir(path.join(nasSessionPath, '02_SELECTED'));
      await fs.ensureDir(path.join(nasSessionPath, '03_EDITED'));
      await fs.ensureDir(path.join(nasSessionPath, '04_FINAL'));

      // Sync each folder
      const folders = ['01_RAW', '02_SELECTED', '03_EDITED', '04_FINAL'];
      
      for (const folder of folders) {
        const cacheFolder = path.join(cacheSessionPath, folder);
        const nasFolder = path.join(nasSessionPath, folder);

        if (!await fs.pathExists(cacheFolder)) continue;

        const files = await fs.readdir(cacheFolder);
        
        for (const file of files) {
          const cacheFile = path.join(cacheFolder, file);
          const nasFile = path.join(nasFolder, file);

          // Skip if already exists on NAS
          if (await fs.pathExists(nasFile)) {
            results.skipped++;
            continue;
          }

          try {
            await fs.copy(cacheFile, nasFile);
            results.transferred++;
          } catch (error) {
            results.errors.push({ file, error: error.message });
          }
        }
      }

      console.log(`[SessionDirectoryManager] Sync completed: ${results.transferred} files transferred, ${results.skipped} skipped, ${results.errors.length} errors`);
      
      // ⚠️ SAFETY: Never auto-clear cache!
      results.cacheKept = true;
      results.message = 'Sync completed. Cache preserved for safety.';

      return results;
    } catch (error) {
      console.error('[SessionDirectoryManager] Sync failed:', error);
      return { success: false, error: error.message, transferred: results.transferred, errors: results.errors, skipped: results.skipped };
    }
  }

  /**
   * Get cache status
   * @returns {Object} { usingCache, nasAvailable, cacheSize }
   */
  async getCacheStatus() {
    const nasAvailable = await this.isNasAvailable();
    const cacheExists = await fs.pathExists(this.localCachePath);
    
    let cacheSize = 0;
    if (cacheExists) {
      cacheSize = await this.calculateDirSize(this.localCachePath);
    }

    return {
      usingCache: this.useLocalCache,
      nasAvailable,
      cachePath: this.localCachePath,
      cacheSize: this.formatBytes(cacheSize),
      cacheSizeBytes: cacheSize,
      nasPath: this.nasRootPath,
      photoFolderPath: this.nasConfig.getPhotoFolderPath(),
    };
  }

  /**
   * Calculate directory size recursively
   */
  async calculateDirSize(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) return stats.size;

      let totalSize = 0;
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.isDirectory()) {
          totalSize += await this.calculateDirSize(filePath);
        } else {
          totalSize += fileStats.size;
        }
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create the complete session folder structure
   * @param {string} clientName - Client name
   * @param {string} sessionId - Unique session ID
   * @param {string} dateStr - ISO date string
   * @param {Object} bookingDetails - Optional booking details for info file
   * @returns {Object} { success, sessionPath, folders, error }
   */
  async createSessionDirectory(clientName, sessionId, dateStr, bookingDetails = null) {
    try {
      // Refresh paths before creating
      this.refreshPaths();
      
      console.log('[SessionDirectoryManager] Creating session directory...');
      console.log('  Client:', clientName);
      console.log('  Session ID:', sessionId);
      console.log('  Date:', dateStr);
      console.log('  Booking Details:', bookingDetails);
      
      const date = new Date(dateStr);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      console.log('  Year:', year, 'Month:', month, 'Day:', day);
      
      // ✅ NEW: Build folder name based on booking type
      // For weddings: use groomName and brideName
      // For other sessions: use clientName
      let folderDisplayName = clientName;
      
      if (bookingDetails) {
        const groomName = bookingDetails.details?.groomName;
        const brideName = bookingDetails.details?.brideName;
        
        if (groomName && brideName) {
          // Wedding: "أحمد_و_فاطمة"
          folderDisplayName = `${groomName}_و_${brideName}`;
          console.log('  💒 Wedding detected - using groom & bride names');
        } else if (groomName) {
          folderDisplayName = groomName;
        } else if (brideName) {
          folderDisplayName = brideName;
        }
      }
      
      const sanitizedName = this.sanitizeFolderName(folderDisplayName);
      // ✅ NEW: Simple folder name with date only (no UUID/timestamp)
      // Format: "2026-02-03_أحمد_و_فاطمة"
      const sessionFolderName = `${year}-${month}-${day}_${sanitizedName}`;
      
      console.log('  Folder display name:', folderDisplayName);
      console.log('  Sanitized name:', sanitizedName);
      console.log('  Final folder name:', sessionFolderName);
      
      // ✅ NEW: Use /Volumes/Gallery directly (not VillaApp subfolder)
      const nasBasePath = this.nasConfig.getNasBasePath(); // /Volumes/Gallery
      const activePath = this.useLocalCache ? this.localCachePath : nasBasePath;
      console.log('  Active path (directly in Gallery):', activePath);
      
      const baseDir = path.join(
        activePath,
        year,
        month,
        sessionFolderName
      );
      
      console.log('  Base directory:', baseDir);
      
      const folders = {
        root: baseDir,
        raw: path.join(baseDir, '01_RAW'),
        selected: path.join(baseDir, '02_SELECTED'),
        edited: path.join(baseDir, '03_EDITED'),
        final: path.join(baseDir, '04_FINAL'),
      };

      // ✅ Create base directory first (year/month/session)
      await fs.ensureDir(baseDir);
      console.log('[SessionDirectoryManager] Created base directory:', baseDir);
      
      // Create all sub-directories
      await Promise.all([
        fs.ensureDir(folders.raw),
        fs.ensureDir(folders.selected),
        fs.ensureDir(folders.edited),
        fs.ensureDir(folders.final),
      ]);
      console.log('[SessionDirectoryManager] Created sub-directories:', Object.values(folders).slice(1));

      // Create a README file in the session root
      const readmePath = path.join(baseDir, 'README.txt');
      const readmeContent = this.generateReadme(clientName, sessionId, dateStr);
      await fs.writeFile(readmePath, readmeContent);

      // ✅ Create booking details file if bookingDetails provided
      if (bookingDetails) {
        const bookingInfoPath = path.join(baseDir, 'تفاصيل_الحجز.txt');
        const bookingInfoContent = this.generateBookingInfoFile(bookingDetails, clientName, sessionId, dateStr);
        await fs.writeFile(bookingInfoPath, bookingInfoContent);
        console.log('[SessionDirectoryManager] Created booking details file:', bookingInfoPath);
      }

      console.log('[SessionDirectoryManager] Created session directory:', baseDir);
      console.log('  Using:', this.useLocalCache ? 'LOCAL CACHE' : 'NAS');

      return {
        success: true,
        sessionPath: baseDir,
        folders,
        usingCache: this.useLocalCache,
      };
    } catch (error) {
      console.error('[SessionDirectoryManager] Failed to create directory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a session directory already exists
   * @param {string} clientName - Client name
   * @param {string} sessionId - Session ID
   * @param {string} dateStr - ISO date string
   * @returns {boolean}
   */
  async checkSessionExists(clientName, sessionId, dateStr) {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      const sanitizedClientName = this.sanitizeFolderName(clientName);
      const sessionFolderName = `${sanitizedClientName}_${sessionId}`;
      
      // Check both NAS and local cache
      const nasPath = path.join(this.nasRootPath, year, month, sessionFolderName);
      const cachePath = path.join(this.localCachePath, year, month, sessionFolderName);

      return await fs.pathExists(nasPath) || await fs.pathExists(cachePath);
    } catch (error) {
      console.error('[SessionDirectoryManager] Error checking session:', error);
      return false;
    }
  }

  /**
   * Get the session path without creating it
   * @param {string} clientName - Client name
   * @param {string} sessionId - Session ID
   * @param {string} dateStr - ISO date string
   * @returns {string} Session path
   */
  getSessionPath(clientName, sessionId, dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const sanitizedClientName = this.sanitizeFolderName(clientName);
    const sessionFolderName = `${sanitizedClientName}_${sessionId}`;
    
    return path.join(
      this.getActiveStoragePath(),
      year,
      month,
      sessionFolderName
    );
  }

  /**
   * Generate folder structure as plain object
   * @param {string} sessionPath - Base session path
   * @returns {Object} folder structure
   */
  getFolderStructure(sessionPath) {
    return {
      root: sessionPath,
      raw: path.join(sessionPath, '01_RAW'),
      selected: path.join(sessionPath, '02_SELECTED'),
      edited: path.join(sessionPath, '03_EDITED'),
      final: path.join(sessionPath, '04_FINAL'),
    };
  }

  /**
   * Move image from RAW to SELECTED folder
   * @param {string} fromPath - Source path in RAW
   * @param {string} sessionPath - Base session path
   * @returns {string} New path in SELECTED folder
   */
  async moveToSelected(fromPath, sessionPath) {
    const fileName = path.basename(fromPath);
    const destPath = path.join(sessionPath, '02_SELECTED', fileName);
    await fs.copy(fromPath, destPath);
    return destPath;
  }

  /**
   * Move image to EDITED folder
   * @param {string} fromPath - Source path
   * @param {string} sessionPath - Base session path
   * @param {string} newFileName - Optional new file name
   * @returns {string} New path in EDITED folder
   */
  async moveToEdited(fromPath, sessionPath, newFileName = null) {
    const fileName = newFileName || path.basename(fromPath);
    const destPath = path.join(sessionPath, '03_EDITED', fileName);
    await fs.copy(fromPath, destPath);
    return destPath;
  }

  /**
   * Copy final images to FINAL folder for printing
   * @param {string} fromPath - Source path
   * @param {string} sessionPath - Base session path
   * @param {string} newFileName - Optional new file name
   * @returns {string} New path in FINAL folder
   */
  async copyToFinal(fromPath, sessionPath, newFileName = null) {
    const fileName = newFileName || path.basename(fromPath);
    const destPath = path.join(sessionPath, '04_FINAL', fileName);
    await fs.copy(fromPath, destPath);
    return destPath;
  }

  /**
   * Generate README content for the session
   */
  generateReadme(clientName, sessionId, dateStr) {
    return `╔══════════════════════════════════════════════════════════════╗
║                    VillaHadad Photo Session                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Client:    ${clientName.padEnd(44)}║
║  Session:   ${sessionId.padEnd(44)}║
║  Created:   ${dateStr.padEnd(44)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Folder Structure:                                           ║
║  ├── 01_RAW/        Original files from camera               ║
║  ├── 02_SELECTED/   Client selected images                   ║
║  ├── 03_EDITED/     Edited/processed images                  ║
║  └── 04_FINAL/      Final ready for print/delivery           ║
║                                                              ║
║  ⚠️  DO NOT manually modify or delete these folders.         ║
╚══════════════════════════════════════════════════════════════╝
`;
  }

  /**
   * ✅ Generate booking details file content (Arabic)
   */
  generateBookingInfoFile(booking, clientName, sessionId, dateStr) {
    const createdDate = new Date(dateStr).toLocaleString('ar-IQ');
    const shootDate = booking.shootDate ? new Date(booking.shootDate).toLocaleDateString('ar-IQ') : 'غير محدد';
    const totalAmount = booking.totalAmount?.toLocaleString('ar-IQ') || '0';
    const paidAmount = booking.paidAmount?.toLocaleString('ar-IQ') || '0';
    const balance = ((booking.totalAmount || 0) - (booking.paidAmount || 0)).toLocaleString('ar-IQ');
    
    return `═══════════════════════════════════════════════════════════
                    تفاصيل حجز فيلا حداد
═══════════════════════════════════════════════════════════

📋 معلومات الحجز الأساسية:
───────────────────────────────────────────────────────────
رقم الحجز:         ${booking.id || sessionId}
العميل:            ${clientName}
عنوان الجلسة:      ${booking.title || 'غير محدد'}

📅 المواعيد:
───────────────────────────────────────────────────────────
تاريخ إنشاء المجلد: ${createdDate}
تاريخ التصوير:      ${shootDate}
وقت التصوير:        ${booking.details?.startTime || 'غير محدد'}

💰 المعلومات المالية:
───────────────────────────────────────────────────────────
المبلغ الإجمالي:    ${totalAmount} د.ع
المبلغ المدفوع:     ${paidAmount} د.ع
المتبقي:            ${balance} د.ع
حالة الدفع:         ${balance <= 0 ? '✅ مدفوع بالكامل' : '⏳ يوجد متبقي'}

📞 معلومات الاتصال:
───────────────────────────────────────────────────────────
الهاتف:             ${booking.clientPhone || 'غير محدد'}
البريد الإلكتروني:  ${booking.clientEmail || 'غير محدد'}

📦 تفاصيل الباكيج:
───────────────────────────────────────────────────────────
نوع الباكيج:        ${booking.packageName || 'غير محدد'}
عدد الصور:          ${booking.details?.photoCount || 'غير محدد'}
مدة التصوير:        ${booking.details?.duration || 'غير محدد'} دقيقة

📝 ملاحظات إضافية:
───────────────────────────────────────────────────────────
${booking.details?.notes || 'لا توجد ملاحظات'}

⚡ معلومات العمل:
───────────────────────────────────────────────────────────
حالة الحجز:         ${booking.status || 'غير محدد'}
المسؤول:            ${booking.assignedToName || 'غير محدد'}
تم الإنشاء بواسطة:  ${booking.createdByName || 'غير محدد'}

═══════════════════════════════════════════════════════════
📁 المجلدات:
  01_RAW/      ← الصور الأصلية من الكاميرا
  02_SELECTED/ ← الصور المختارة من قبل العميل  
  03_EDITED/   ← الصور المعدلة
  04_FINAL/    ← الصور النهائية جاهزة للطباعة
═══════════════════════════════════════════════════════════

تم إنشاء هذا الملف تلقائياً بتاريخ: ${new Date().toLocaleString('ar-IQ')}
فيلا حداد - لتجربة تصوير لا تُنسى 📸
`;
  }

  /**
   * Sanitize folder name to be filesystem-safe
   */
  sanitizeFolderName(name) {
    return name
      .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '')  // Keep Arabic + alphanumeric
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }

  /**
   * Get the count of files in each folder
   * @param {string} sessionPath - Base session path
   * @returns {Object} { raw, selected, edited, final }
   */
  async getFolderStats(sessionPath) {
    const folders = this.getFolderStructure(sessionPath);
    
    const [raw, selected, edited, final] = await Promise.all([
      this.countFiles(folders.raw),
      this.countFiles(folders.selected),
      this.countFiles(folders.edited),
      this.countFiles(folders.final),
    ]);

    return { raw, selected, edited, final };
  }

  /**
   * Count files in a directory (recursively)
   */
  async countFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);
      let count = 0;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          count += await this.countFiles(fullPath);
        } else if (/\.(jpg|jpeg|png|raw|cr2|arw|heic|webp)$/i.test(entry)) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get original image path for editor (from NAS, not R2)
   * @param {string} sessionPath - Base session path
   * @param {string} imageFileName - Image file name
   * @param {string} sourceFolder - Source folder (raw, selected, edited)
   * @returns {string} Full path to original image
   */
  getOriginalImagePath(sessionPath, imageFileName, sourceFolder = '01_RAW') {
    const validFolders = ['01_RAW', '02_SELECTED', '03_EDITED', '04_FINAL'];
    const folder = validFolders.includes(sourceFolder) ? sourceFolder : '01_RAW';
    
    return path.join(sessionPath, folder, imageFileName);
  }

  /**
   * Get all original images for a session (for editor)
   * @param {string} sessionPath - Base session path
   * @param {string} folder - Folder to read (default: 01_RAW)
   * @returns {Array} List of image file paths
   */
  async getOriginalImages(sessionPath, folder = '01_RAW') {
    try {
      const targetFolder = path.join(sessionPath, folder);
      
      if (!await fs.pathExists(targetFolder)) {
        return [];
      }

      const entries = await fs.readdir(targetFolder);
      const imageFiles = [];

      for (const entry of entries) {
        const filePath = path.join(targetFolder, entry);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile() && /\.(jpg|jpeg|png|raw|cr2|arw|heic|tiff|psd)$/i.test(entry)) {
          imageFiles.push({
            name: entry,
            path: filePath,
            size: stat.size,
            modified: stat.mtime,
            folder: folder
          });
        }
      }

      return imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[SessionDirectoryManager] Error getting original images:', error);
      return [];
    }
  }

  /**
   * Save edited image (editor workflow)
   * @param {string} sessionPath - Base session path
   * @param {string} originalFileName - Original file name
   * @param {Buffer} editedImageBuffer - Edited image data
   * @param {string} outputFormat - Output format (jpg, png, tiff)
   * @returns {string} Path to saved edited image
   */
  async saveEditedImage(sessionPath, originalFileName, editedImageBuffer, outputFormat = 'jpg') {
    try {
      const editedFolder = path.join(sessionPath, '03_EDITED');
      await fs.ensureDir(editedFolder);

      const baseName = path.basename(originalFileName, path.extname(originalFileName));
      const editedFileName = `${baseName}_edited.${outputFormat}`;
      const editedPath = path.join(editedFolder, editedFileName);

      await fs.writeFile(editedPath, editedImageBuffer);

      console.log(`[SessionDirectoryManager] Edited image saved: ${editedPath}`);
      return editedPath;
    } catch (error) {
      console.error('[SessionDirectoryManager] Error saving edited image:', error);
      throw error;
    }
  }

  /**
   * Setup IPC handlers for session management
   */
  setupIpcHandlers() {
    // Create session directory (with optional booking details)
    ipcMain.handle('session:createDirectory', async (_event, { clientName, sessionId, date, bookingDetails }) => {
      return await this.createSessionDirectory(clientName, sessionId, date, bookingDetails);
    });

    // Check if session exists
    ipcMain.handle('session:checkExists', async (_event, { clientName, sessionId, date }) => {
      return await this.checkSessionExists(clientName, sessionId, date);
    });

    // Get session path
    ipcMain.handle('session:getPath', async (_event, { clientName, sessionId, date }) => {
      return this.getSessionPath(clientName, sessionId, date);
    });

    // Get folder stats
    ipcMain.handle('session:getStats', async (_event, { sessionPath }) => {
      return await this.getFolderStats(sessionPath);
    });

    // Copy selected files from 01_RAW to 02_SELECTED
    ipcMain.handle('session:copyToSelected', async (_event, { sessionPath, fileNames }) => {
      const results = { copied: 0, failed: 0, errors: [] };
      const selectedDir = path.join(sessionPath, '02_SELECTED');
      await fs.ensureDir(selectedDir);

      for (const fileName of fileNames) {
        try {
          const src = path.join(sessionPath, '01_RAW', fileName);
          const dest = path.join(selectedDir, fileName);
          if (await fs.pathExists(src)) {
            await fs.copy(src, dest);
            results.copied++;
          } else {
            results.failed++;
            results.errors.push(`Not found: ${fileName}`);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`${fileName}: ${err.message}`);
        }
      }

      return { success: true, ...results };
    });

    // Editor: Get original image path (from NAS, not R2)
    ipcMain.handle('editor:getOriginalPath', async (_event, { sessionPath, imageFileName, sourceFolder }) => {
      return this.getOriginalImagePath(sessionPath, imageFileName, sourceFolder);
    });

    // Editor: Get all original images for session
    ipcMain.handle('editor:getOriginalImages', async (_event, { sessionPath, folder }) => {
      return await this.getOriginalImages(sessionPath, folder);
    });

    // Editor: Save edited image
    ipcMain.handle('editor:saveEdited', async (_event, { sessionPath, originalFileName, editedImageBuffer, outputFormat }) => {
      return await this.saveEditedImage(sessionPath, originalFileName, editedImageBuffer, outputFormat);
    });

    // Cache: Check NAS availability
    ipcMain.handle('storage:checkNAS', async () => {
      const status = await this.nasConfig.checkNasAvailability();
      return status;
    });

    // Cache: Get cache status
    ipcMain.handle('storage:getCacheStatus', async () => {
      return await this.getCacheStatus();
    });

    // Cache: Sync cache to NAS
    ipcMain.handle('storage:syncCache', async (_event, { clientName, sessionId }) => {
      return await this.syncCacheToNAS(clientName, sessionId);
    });

    console.log('[SessionDirectoryManager] IPC handlers registered');
  }
}

module.exports = { SessionDirectoryManager };
